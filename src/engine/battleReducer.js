// ----------------------------------------------------------------
//  battleReducer — 棋盘状态机（E5c）
//
//  把原本散落在 useBattle 里的十几个 useState「棋盘状态」逐组收进 reducer：
//  reducer 每次拿到最新 state（消掉 useLatestRef 手动镜像的根本需求），
//  且一个 dispatch 可原子地改多组状态。
//
//  迁移是**分组切片**推进（见 outputs/e5c-reducer-migration-plan.md）：
//  E5c-0 只迁 powerBank（本文件当前形态）；后续切片往 player/enemy 子树
//  和顶层逐步加 field/leaderHp/energy/turn/phase…
//
//  ⚠️ 不变式：reducer 必须让「没改的子树引用不变」（只 spread 被改的一侧），
//  否则触发无谓重渲染/动画抖动。纯函数、无副作用、无返回额外值。
// ----------------------------------------------------------------

// 主人初始 HP（与 deckRules.LEADER_HP 一致，reducer 保持 React-free 故内联常量）
const LEADER_HP_INIT = 30000
const FIELD_SLOTS = 5   // 与 deckRules.MAX_FIELD_SLOTS 一致（reducer React-free 内联）
const emptyField = () => Array(FIELD_SLOTS).fill(null)

export const initialBattleState = {
  // 顶层「回合机」状态（E5c-4）
  turn: 1,
  phase: 'init',   // init|mulligan|main|battle|animating|enemyTurn|over
  winner: null,    // null|'player'|'enemy'
  player: { powerBank: { stored: 0, intact: true }, discard: [], energy: 1, leaderHp: LEADER_HP_INIT, field: emptyField() },
  enemy: { powerBank: { stored: 0, intact: true }, discard: [], energy: 1, leaderHp: LEADER_HP_INIT, field: emptyField() },
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
      // 直接设值（开局起始 HP / boss·关卡机制经 setter 垫片走此路）
      const { side, value } = action
      return { ...state, [side]: { ...state[side], leaderHp: value } }
    }

    // --- 回合机 turn / phase / winner（E5c-4）---
    case 'TURN_SET':
      return { ...state, turn: action.value }
    case 'PHASE_SET':
      return { ...state, phase: action.phase }
    case 'WINNER_SET':
      return { ...state, winner: action.winner }
    case 'GAME_OVER':
      // 胜负 = winner + phase:'over' 原子设（取代散落的两步式胜负写）
      return { ...state, winner: action.winner, phase: 'over' }

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
