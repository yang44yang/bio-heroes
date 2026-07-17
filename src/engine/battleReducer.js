// ----------------------------------------------------------------
//  battleReducer — 棋盘状态机（E5c）
//
//  把原本散落在 useBattle 里的十几个 useState「棋盘状态」逐组收进 reducer：
//  reducer 每次拿到最新 state（消掉 useLatestRef 手动镜像的根本需求），
//  且一个 dispatch 可原子地改多组状态。
//
//  迁移是**分组切片**推进（见 outputs/e5c-reducer-migration-plan.md），已全部完成：
//  E5c-0 powerBank / E5c-1 discard / E5c-2 energy / E5c-3 leaderHp /
//  E5c-4 turn·phase·winner / E5c-5 field。纯函数单测见 scripts/test-battle-reducer.mjs。
//
//  ⚠️ 不变式：reducer 必须让「没改的子树引用不变」（只 spread 被改的一侧），
//  否则触发无谓重渲染/动画抖动。纯函数、无副作用、无返回额外值。
//  ⚠️ useReducer dispatch **不 eager 计算** → 凡「updater 闭包内赋值、setter 返回后
//  同步读回」的量（defKilled/atkKilled/replaced）在 useBattle 侧已改成 dispatch 前
//  用 battleStateRef 确定性算好，不靠闭包。
// ----------------------------------------------------------------

// deckRules 是零 import 的纯常量模块 → reducer import 它不破坏本文件的 React-free 性质。
// 旧版这里内联了一份战场位数量的副本，理由写的是「reducer React-free 故内联」——
// 那个理由不成立，而代价是战场位有了第二个真相源：改 deckRules 时它不跟着变，且静默。
// （注释里刻意不复述旧的常量名+数字：scripts/test-field-slots.mjs 是 source-grep 守卫，
//   会把注释里的示例当成真的内联字面量 —— 守卫自己也警告过这类「注释污染扫描」的坑。）
// ⚠️ 必须带 .js 扩展名：本模块被 scripts/test-battle-reducer.mjs 直接 import，
//    node 的 ESM 不做扩展名补全（Vite 会，所以漏了扩展名 build 照过、只有 npm test 会红）。
//    同侧参照 engine/aiTarget.js:11。
import { MAX_FIELD_SLOTS } from '../data/deckRules.js'

// 主人初始 HP（与 deckRules.LEADER_HP 一致，reducer 保持 React-free 故内联常量）
// TODO: 同一个反模式，可比照 MAX_FIELD_SLOTS 收口，但不搭本次的车（另开单）。
const LEADER_HP_INIT = 30000
const emptyField = () => Array(MAX_FIELD_SLOTS).fill(null)

export const initialBattleState = {
  // 顶层「回合机」状态（E5c-4）
  // ⚠️ turn 仍只数**玩家回合**（startPlayerTurn 里 +1）—— 它是环境事件 / 病毒 DoT /
  //    SP 第 8 回合开闸的节拍器。S3 刻意**不动**它：把它改成「轮」会平移 env 事件节奏，
  //    直接改闯关手感。PvP 里这意味着节拍只在 host 的半回合跑 —— 是交接事项，不是本次的活。
  //    ⚠️ 每侧阶段机会让这个不对称**看起来像修好了**，那比现在这种显眼的不对称更危险。
  turn: 1,
  // ★ activeSide（S3）：轮到谁行动。**取代了旧 phase 枚举里的 'enemyTurn' 这一枚值。**
  //   旧枚举把「发生什么」（main/battle）和「谁在做」（enemyTurn）编码进**同一个标量** ——
  //   这正是 fork 的成因：main/battle 隐含「玩家的」，于是 aiPlayToField **即使有人想查
  //   phase 也查不了**（根本不存在一个「敌方的 main」可查）。缺失的 gate 不是懒，是**不可表达**。
  //   activeSide + 每侧 phase 是同一份信息的正交分解 —— 这就是把阶段机与 de-fork 捆在一起的全部理由。
  activeSide: 'player',
  winner: null,    // null|'player'|'enemy'  ⚠️ 带侧别语义的顶层标量 → 将来的 mirror() 必须翻它
  // ★ summoned / attacked（S2）：本回合「已召唤」「已攻击」的 uid，**每侧一份**。
  //   三条独立理由，任一足够：
  //   ① 正确性 —— 此前是 useBattle.js 的两个 useRef(new Set())，**一个 Set 装两侧**。
  //      它至今没炸只因为 ac1169e 给 uid 加了 player_/enemy_ 前缀 —— 那是在 **uid 层**
  //      打的补丁，容器层的缺陷还在（makeFieldCard 自己的注释就警告过：凡新增 uid 产地
  //      都必须能区分双方，否则串台）。每侧一份，容器层就不再依赖 uid 的自律。
  //   ② 可上线 —— Set 不过 JSON（`JSON.stringify(new Set(['a'])) === '{}'`）。棋盘权威
  //      的其余部分都已在这棵 JSON-clean 的树里，这两个纯属历史意外。
  //   ③ 可证明（最重要）—— 「一卡一回合只能攻击一次」今天**完全由引擎外强制**：
  //      靠 useAITurn.js 那个 `for (atkSlot = 0..MAX_FIELD_SLOTS)` 循环的形状
  //      （这正是 aiAttack 传 checkAttacked:false 且从不写 Set 的原因）。
  //      「靠 React hook 里一个 for 循环维持的规则」在 node 里测不了；
  //      `state.enemy.attacked.includes(uid)` 测得了。**这是让镜像测试成立的那一步。**
  //   用数组不用 Set：JSON 友好；≤6 格，includes() 的开销可忽略。
  //
  // ★ phase（S3）：**每侧一份**，只描述「那一侧在自己回合里的进度」。
  //   'init' | 'mulligan' | 'main' | 'battle' | 'ended'
  //   · 'over' **不在**枚举里 —— 它一直就是 `winner != null`，GAME_OVER 早已原子设两者。派生即可。
  //   · 'animating' **已删** —— 幽灵：setAnimating/restorePhase 曾被导出但零消费，
  //     且无人读 phase==='animating'。在状态形状迁移里驮着幽灵，是幽灵变成承重墙的标准剧本。
  //   · 'ended' = 本回合已结束、等对手行动。
  player: { powerBank: { stored: 0, intact: true }, discard: [], energy: 1, leaderHp: LEADER_HP_INIT, field: emptyField(), summoned: [], attacked: [], phase: 'init' },
  enemy: { powerBank: { stored: 0, intact: true }, discard: [], energy: 1, leaderHp: LEADER_HP_INIT, field: emptyField(), summoned: [], attacked: [], phase: 'init' },
}

/**
 * derivePhase —— 把新状态映射回**旧的顶层 phase 标量**。纯函数。
 *
 * 存在的理由：BattleScreen 有 20+ 处读 `battle.phase`，useAITurn 的 effect deps 是
 * `[battle.phase]`。让内部对称、外部保持旧形状 → 那些调用点**零改动**。
 *
 * | 旧值 | 新表达 |
 * |---|---|
 * | 'init' / 'mulligan' | player.phase 同名（开局是全局节拍，AI 从不换牌） |
 * | 'main' / 'battle'   | activeSide==='player' && player.phase 同名 |
 * | 'enemyTurn'         | activeSide==='enemy'（**敌方内部是 main 还是 battle，旧模型丢失了 —— 而那正是 gate 得以存在的信息**） |
 * | 'over'              | winner != null |
 * | 'animating'         | 已删（幽灵） |
 *
 * ⚠️ `activeSide==='enemy'` 必须映射回 'enemyTurn'：那是 BattleScreen 里**唯一**告诉
 *    七岁孩子「现在不是你动」的橙色标签，也是 useAITurn 整个回合的触发条件。漏了 →
 *    不报错、不变红、build 通过，只是 AI 再也不动、标签安静消失。
 *
 * 穷举测试见 scripts/test-legacy-phase.mjs。
 */
export function derivePhase(state) {
  if (state.winner) return 'over'
  // 开局两相是全局的（mulligan 是本局唯一真正并发的时刻，不看 activeSide）
  if (state.player.phase === 'init') return 'init'
  if (state.player.phase === 'mulligan') return 'mulligan'
  if (state.activeSide === 'enemy') return 'enemyTurn'
  // activeSide==='player' 且 player.phase==='ended' 是非法态（原子交接下不可能出现）；
  // 映射成 'battle' 是最无害的兜底 —— 不会让 UI 误以为可以出牌。
  return state.player.phase === 'ended' ? 'battle' : state.player.phase
}

export function battleReducer(state, action) {
  switch (action.type) {
    // --- Power Bank（E5c-0）---
    case 'POWERBANK_SET': {
      const { side, powerBank } = action
      return { ...state, [side]: { ...state[side], powerBank } }
    }
    case 'POWERBANK_ADD': {
      const { side, amount } = action
      const pb = state[side].powerBank
      return { ...state, [side]: { ...state[side], powerBank: { ...pb, stored: pb.stored + amount } } }
    }
    case 'POWERBANK_RESTORE': {
      const { side } = action
      const pb = state[side].powerBank
      return { ...state, [side]: { ...state[side], powerBank: { ...pb, intact: true } } }
    }

    // --- 弃牌堆 discard（E5c-1）---
    case 'DISCARD_ADD': {
      // 追加卡（等价旧 setDiscard(prev => [...prev, ...cards])）
      const { side, cards } = action
      return { ...state, [side]: { ...state[side], discard: [...state[side].discard, ...cards] } }
    }
    case 'DISCARD_SET': {
      // 整堆替换（阵营标记消耗后的 updatedPile / 重置为 []）
      const { side, pile } = action
      return { ...state, [side]: { ...state[side], discard: pile } }
    }
    case 'DISCARD_REMOVE_UID': {
      // 按 uid 移除首个匹配（discard_to_hand / revive_from_discard / 长老记忆取回）
      const { side, uid } = action
      const pile = state[side].discard
      const idx = pile.findIndex(c => c.uid === uid)
      if (idx === -1) return state
      return { ...state, [side]: { ...state[side], discard: [...pile.slice(0, idx), ...pile.slice(idx + 1)] } }
    }

    // --- 能量 energy（E5c-2）---
    case 'ENERGY_SET': {
      // 直接设值（回合刷新 gain / 消耗全部归 0 / 开局起始能量）
      const { side, value } = action
      return { ...state, [side]: { ...state[side], energy: value } }
    }
    case 'ENERGY_ADD': {
      // 增益：cap 传入则封顶（技能/事件充能，ENERGY_CAP），不传则不封顶（打破 Power Bank 可破 10）
      const { side, amount, cap } = action
      const next = state[side].energy + amount
      return { ...state, [side]: { ...state[side], energy: cap == null ? next : Math.min(cap, next) } }
    }
    case 'ENERGY_SPEND': {
      // 出牌扣费（等价旧 setEnergy(prev => prev - cost)）
      const { side, cost } = action
      return { ...state, [side]: { ...state[side], energy: state[side].energy - cost } }
    }

    // --- 主人 HP leaderHp（E5c-3）---
    // 全部 delta 型（DAMAGE/HEAL）→ 同 tick 多次 dispatch 靠 reducer 顺序累加，
    // 保「事件循环里多次扣/回主人血」与旧 setX(prev=>...) 链式一致。胜负判定留在
    // 调用端（读 battleStateRef 本地算 gameWon/gameOver + winner/phase 副作用），
    // reducer 保持纯：只改血，胜负与阶段不在此处。
    case 'LEADER_DAMAGE': {
      const { side, amount } = action
      return { ...state, [side]: { ...state[side], leaderHp: Math.max(0, state[side].leaderHp - amount) } }
    }
    case 'LEADER_HEAL': {
      // cap 传入则封顶（回主人血不超上限 LEADER_HP）
      const { side, amount, cap } = action
      const next = state[side].leaderHp + amount
      return { ...state, [side]: { ...state[side], leaderHp: cap == null ? next : Math.min(cap, next) } }
    }
    case 'LEADER_SET': {
      // 直接设值（开局起始 HP）
      const { side, value } = action
      return { ...state, [side]: { ...state[side], leaderHp: value } }
    }
    case 'LEADER_APPLY': {
      // updater 在 reducer 内对「当前提交态」跑 → 同 tick 多次 dispatch 顺序累加，
      // 与 DAMAGE/HEAL delta 可交换。修 bug：boss/关卡机制的 setter 垫片过去在外面读
      // battleStateRef（stale）再绝对 LEADER_SET，会覆盖同 tick 已派发的 LEADER_DAMAGE/HEAL
      // delta（如 bio_alert 抹掉透析机同回合的 +1000 回血）。Math.max(0) 兜底不出现负血。
      const { side, updater } = action
      return { ...state, [side]: { ...state[side], leaderHp: Math.max(0, updater(state[side].leaderHp)) } }
    }

    // --- 回合机 turn / activeSide / 每侧 phase / winner（E5c-4 → S3）---
    case 'TURN_SET':
      return { ...state, turn: action.value }

    case 'SIDE_PHASE_SET': {
      // 取代旧的顶层 PHASE_SET。改一侧在自己回合里的进度。
      const { side, phase } = action
      if (state[side].phase === phase) return state          // no-op bailout（不变式③）
      return { ...state, [side]: { ...state[side], phase } }
    }

    case 'TURN_HANDOFF': {
      // ★ 回合交接**必须原子** —— 这是 S3 最容易写错、且症状最恶劣的地方。
      //   若把 activeSide 与两侧 phase 分成多次 dispatch，中间会存在一帧：
      //   activeSide 已是 'enemy'、而 enemy.phase 还没到 'main'。那一帧里
      //   useAITurn 的 effect 会放行（它只看 derivePhase → 'enemyTurn'）并把
      //   aiRunning 置 true，随后所有 gate 拒绝它 → **回合永久锁死**。
      //   而 aiRunning 只在 .finally 复位 —— 抛错会复位，**挂起不会**。
      //   一次 dispatch 同时写 activeSide + 两侧 phase。
      //   from 侧 → 'ended'（回合结束、等对手）；to 侧 → 'main'（新回合从出牌开始）。
      const { from, to } = action
      return {
        ...state,
        activeSide: to,
        [from]: { ...state[from], phase: 'ended' },
        [to]: { ...state[to], phase: 'main' },
      }
    }

    case 'WINNER_SET':
      return { ...state, winner: action.winner }

    case 'GAME_OVER':
      // 胜负原子设。旧版写 phase:'over'；phase 每侧化后 'over' 不再是相位值，
      // 它就是 `winner != null`（derivePhase 据此派生）。这里同时把两侧钉死在 'ended'：
      // 对局结束后任何一侧都不该再被判定为「在自己的回合里」。
      // ⚠️ 这也是 useAITurn 的 .catch 兜底若在对局结束后误触发攻击时，能被安静拒绝的原因。
      return {
        ...state,
        winner: action.winner,
        player: { ...state.player, phase: 'ended' },
        enemy: { ...state.enemy, phase: 'ended' },
      }

    // --- 回合标记 summoned / attacked（S2）---
    // 全部幂等：重复 MARK 同一个 uid 不变 state（引用相等 bailout），与 Set.add 语义一致。
    // ⚠️ 与旧 Set 的唯一差异：dispatch **不 eager** —— `marks.add(uid)` 对下一行立即可见，
    //    这里要等提交。所以攻击路径已改成「先算 gate、通过才 MARK」（回滚 delete 消失），
    //    调用方不再需要「标记后同步读回」。详见 useBattle 的 attack。
    case 'MARK_SUMMONED': {
      const { side, uid } = action
      if (uid == null) return state              // uid 兜底：绝不把 undefined 塞进标记
      const cur = state[side].summoned
      if (cur.includes(uid)) return state
      return { ...state, [side]: { ...state[side], summoned: [...cur, uid] } }
    }
    case 'MARK_ATTACKED': {
      const { side, uid } = action
      if (uid == null) return state
      const cur = state[side].attacked
      if (cur.includes(uid)) return state
      return { ...state, [side]: { ...state[side], attacked: [...cur, uid] } }
    }
    case 'UNMARK_SUMMONED': {
      // 蚁后/进化等会把卡从场上换掉 → 该 uid 的召唤疲劳一并撤销（对齐旧 Set.delete）
      const { side, uid } = action
      const cur = state[side].summoned
      if (!cur.includes(uid)) return state
      return { ...state, [side]: { ...state[side], summoned: cur.filter(u => u !== uid) } }
    }
    case 'MARKS_CLEAR': {
      // which: 'summoned' | 'attacked' | 'both'
      // ⚠️ 清理拓扑必须与旧 Set 逐处对齐（改错会静默改变「一卡一次」的作用域）：
      //   startBattle → both，两侧；endMainPhase → 仅 attacked，仅该侧；
      //   startPlayerTurn → both，**两侧**（这是敌方标记每轮被清掉的地方 ——
      //   beginEnemyTurn 一个都不清，多位 judge 曾误判「敌方标记无人清理」，实为假）。
      const { side, which = 'both' } = action
      const cur = state[side]
      // ⚠️ 只在「真的有东西要清」时才造新数组 —— 无条件 `next.summoned = []` 会让引用
      //    恒变，bailout 永不触发（本文件顶部的不变式③要求 no-op 不得换引用，否则
      //    死亡扫场 effect 的 deps 会无谓抖动）。这个 bug 本来就写出来过，被
      //    test-battle-reducer 的 no-op 断言当场抓住。
      const clearSummoned = (which === 'summoned' || which === 'both') && cur.summoned.length > 0
      const clearAttacked = (which === 'attacked' || which === 'both') && cur.attacked.length > 0
      if (!clearSummoned && !clearAttacked) return state
      const next = { ...cur }
      if (clearSummoned) next.summoned = []
      if (clearAttacked) next.attacked = []
      return { ...state, [side]: next }
    }

    // --- 战场 field（E5c-5）---
    // value 是「updater 函数」或「新数组」。updater 在 reducer 内跑 → 同 tick 多次 dispatch
    // 靠队列顺序累加（每个 updater 见到前一个结果），等价旧 setField(prev=>...) 链。
    // ⚠️ 与旧 useState 唯一差异：useReducer dispatch **不 eager 计算** → 任何「在 updater
    //   闭包里赋值、setter 返回后同步读回」的变量（defKilled/atkKilled/replaced）不能再靠
    //   闭包，必须在 dispatch 前用 battleStateRef 确定性算好（见 useBattle 各调用点）。
    case 'FIELD_UPDATE': {
      const { side, value } = action
      const cur = state[side].field
      const next = typeof value === 'function' ? value(cur) : value
      if (next === cur) return state   // 引用相等 bailout（对齐 useState no-op，死亡扫场 effect deps 不抖）
      return { ...state, [side]: { ...state[side], field: next } }
    }

    default:
      return state
  }
}
