// matchSnapshot.js —— 对局快照的**纯核心**（host 自恢复 / 4g 场景）。
//
// ## 要解决什么
// PvP 是 host 权威：引擎只在 host 浏览器跑。而整条 PvP 路径此前 **localStorage 零使用** ——
// host 一刷新页面（4g 切网、iOS 回收标签页、误触后退、手机没电重开），内存里的
// 中继凭证和整棵棋盘一起蒸发，对局直接死掉，孩子那头只看到「对手跑了」。
//
// 中继侧**本来就支持接回**（rooms.js:119 的回收时钟只在两槽全空时才启动；host 掉线只置空
// connId、token 原封保留；guest 还连着 → 房间永不回收）。缺的从来只有一件事：
// **新页面不记得自己是谁、棋盘长什么样**。本模块就是那份「记得」。
//
// ## 为什么不做「热备发给 guest 接管」
// 那个方案要把 host 的手牌、双方抽牌堆顺序、SP 卡组内容、问答答案卡**持续**发过网 ——
// 而 wire.js 从第一行起的全部设计就是让这些「在形状上不可表达」（PRIVATE_KEYS /
// SELF_SPEC 白名单重建 / assertPublicShape 跑在每一次推送上 / quizGate 的脱敏投影）。
// 加密也救不了：能解密的钥匙必须在 guest 手上，否则他接管不了。
// **本方案的快照永不离开 host 设备**，wire 的三通道一个字都不用碰。
//
// ## ☠️ 这个方案唯一的高风险点：漏一项 = 静默改规则
// reducer 树之外还挂着十几个权威 ref，丢了**棋盘快照上完全看不出异常**：
//   · quizKeyRef 丢 → 已发给 guest 的那道题**永远判不了卷**（answerQuiz 拿不到 key 直接返回空）
//   · pendingAttackRef 丢 → guest 答完题回来的 answer intent 找不到挂起的攻击 → **那一击凭空消失**
//   · virusOutbreakRef 丢 → 正在生效的每回合 -500 主人 HP **静默停掉**，棋盘上无迹可寻
//   · processedDeathsRef / __fieldUidSeq 丢 → 重复亡语、uid 撞车（按 uid 查的 attacked/summoned 认错卡）
//   · spTriggeredRef 丢 → 「每侧本局只触发一次 SP」失效，会**再召一次**
// 所以本文件把「必须恢复什么」做成**单一真相源**（下面两张清单），
// 由 scripts/test-match-snapshot.mjs 逐个比对 useBattle / usePvpHost 里的**每一处声明** ——
// 新增一个 useState/useRef 而没在这里登记，测试当场变红。
//
// ## ☠️ 三个 JSON 往返陷阱（本模块负责，调用方不用操心）
//   1. `Set` —— `JSON.stringify(new Set(['a'])) === '{}'`，必须显式转数组
//      （battleReducer.js 的 summoned/attacked 当年改成数组就是为了这个）
//   2. `-Infinity` —— quizGate 的 lastTurn 初值是 -Infinity，`JSON.stringify` 出来是 `null`，
//      而 `turn - null >= 3` 与 `turn - (-Infinity) >= 3` 的算术语义**不同**（前者会误判冷却已过）
//   3. **带方法的对象** —— 环境事件对象带 `apply(playerField, enemyField)`（events.js 每个都有），
//      Boss 机制/关卡规则带 onTurnStart 等钩子。只能存 id，恢复时反查
//
// ## ☠️ 两个游标只能往小里猜
//   lastN（guest intent 的去重水位）恢复出一个**比 guest 当前 n 大**的值 → guest 点什么都被判 dup、
//   界面永久卡死；cursor 大于事件环里最大 seq → 之后的事件永远被切掉。
//   归零则只是「多放行一次重传 / 少一段浮字动画」。**拿不准就归零**，本模块的 clampCursor 兜这条。

/** 快照格式版本。形状变了就 +1 —— 旧 blob 会被 readSnapshot 拒绝而不是半吊子地灌进去。 */
export const SNAPSHOT_VERSION = 1

/** 快照的有效期（毫秒）。过期不再提示「继续上一局」—— 三天后开游戏还问是骚扰。 */
export const SNAPSHOT_TTL_MS = 6 * 60 * 60 * 1000

// ============================================================================
// 清单 —— 单一真相源。守卫测试逐条比对源码里的声明，漏登记就红。
// ============================================================================

/**
 * 必须恢复的项：声明名 → 为什么（丢了会怎样）。
 * key 必须与 useBattle.js / usePvpHost.js 里的**声明名**逐字一致。
 */
export const RESTORED = {
  // ---- useBattle：reducer 树与它周边 ----
  battleState: '整棵棋盘权威树（回合/能量/主人HP/战场/弃牌堆/标记/阶段/问答定形槽）',
  battleLog: '战斗日志 —— 纯展示，但孩子靠它读「刚才发生了什么」',
  playerSpDeck: '我方剩余 SP 卡组（内容是隐藏信息，只在 host 设备上）',
  enemySpDeck: '对方剩余 SP 卡组',
  pendingSpSummon: 'host 自己待选的 SP 候选',
  pendingEnemySpSummon: 'guest 待选的 SP 候选 —— 丢了他那个弹窗永远关不掉（spChoose intent 找不到候选被静默丢弃）',
  spTriggeredRef: '「每侧本局只触发一次 SP」的去重集；丢了会再召一次（Set → 数组）',
  playerInitLeaderHpRef: 'SP 半血阈值的基准；PvP 下恰好等于默认值，但不能靠巧合',
  enemyInitLeaderHpRef: '同上（对方侧）',
  activeEnvEvent: '生效中的环境事件（存 id + turnsLeft —— 事件对象带 apply() 方法）',
  pendingEnvEvent: '等玩家确认的环境事件（同样只存 id）',
  recentEventsRef: '最近 2 个环境事件 id，防连出同一个',
  virusOutbreakRef: '病毒爆发 DoT —— 丢了每回合 -500 会静默停掉，棋盘上无迹可寻',
  battleStatsRef: '成绩单（伤害/击杀/答对数/PB 峰值）—— 丢了结算页数字全错',
  quizGateRef: '每侧问答闸门（首攻额度 + 冷却回合）；lastTurn 有 -Infinity 陷阱',
  quizKeyRef: '☠️ 答案卡（每侧一份）—— 丢了已发出去的那道题永远判不了卷。**只存在 host 设备上，永不上 wire**',
  quizSeqRef: '题目实例 id 的自增计数；归零会与本局早先的题重号，让 qid 防重传那道防线失效',
  processedDeathsRef: '死亡去重集；丢了会对已在场的 0HP 卡重复跑 onDeath（Set → 数组）',
  fieldUidSeq: '上场卡 uid 的模块级序号（useBattle 的 __fieldUidSeq）；归零会与恢复回来的 fc_* 卡撞 uid',

  // ---- usePvpHost：适配器游标 ----
  gRef: 'matchId —— 丢了会铸新 id，host 的 decodeIntent 会把 guest 切换窗口期发出的 intent 全丢掉',
  lastNRef: 'guest intent 的去重水位（只能往小里猜，见文件头）',
  ringRef: '事件环（浮字/日志动画）—— 与 cursorRef 必须成对恢复',
  cursorRef: '已发水位（只能往小里猜）',
  pendingAttackRef: '☠️ guest 那次被问答挂起的攻击 —— 丢了他那一击凭空消失（题判了、伤害没打）',
  enemyMulliganedRef: 'guest 换牌的幂等标记；丢了一条重传的 mulligan 会让他手牌被再换一次',
  bootstrappedRef: '敌方回合起点只 bootstrap 一次；丢了若恰好停在 enemyTurn 会让对方白抽一张牌',
}

/**
 * 刻意**不**恢复的项：声明名 → 为什么不用恢复（必须写清，否则等于默认漏掉）。
 */
export const NOT_RESTORED = {
  // 死代码 —— 恢复它等于给自己造第二个真相源
  summonedThisTurn: '☠️ 死代码：全文件除声明外零读写，真相源是 battleState[side].summoned',
  attackedThisTurn: '☠️ 死代码：同上，真相源是 battleState[side].attacked',
  // 函数 / 每次挂载自动重接
  handsRef: '装的全是函数（drawCards 等），由 BattleScreen 的 setHandRefs 每次挂载重灌',
  fireOnDeathRef: '函数引用，挂载时重新接线',
  // PvP 下恒为空
  globalEffectsRef: 'PvP 不走 Conundrum，恒 []',
  campaignConfigRef: 'PvP 无闯关配置，恒 null',
  bossStateRef: '同上，恒 {phase:1}',
  bossMechanicRef: '同上，恒 null（且带 onTurnStart 等钩子函数，本就不可序列化）',
  stageRuleRef: '同上，恒 null（同样带钩子函数）',
  bossMechanicEvents: '同上，恒 []',
  // 与消费游标一起归零才自洽
  skillEvents: '技能事件队列按下标消费，消费游标（BattleScreen 的 lastRevealRef）刷新即归零 → 一起归零才自洽；恢复了反而会重播一遍技能演出',
  // 渲染期镜像
  latestRef: 'usePvpHost 的渲染期镜像对象，每次渲染重写',
}

// ============================================================================
// 类型陷阱的打包 / 解包
// ============================================================================

/** Set ↔ 数组。null/undefined 一律当空集（比抛错更适合恢复路径）。 */
export const packSet = (s) => (s ? Array.from(s) : [])
export const unpackSet = (a) => new Set(Array.isArray(a) ? a : [])

/**
 * quizGate 的 -Infinity 陷阱。
 * lastTurn 初值是 -Infinity（「从没出过题」），JSON 往返会变成 null，
 * 而 `turn - null >= 3` 恒真 → 恢复后**下一次攻击必出题**，冷却被静默清零。
 * 存的时候把 -Infinity 写成 `null` 是不够的（读回来分不清「没出过」和「JSON 吃掉了」），
 * 所以显式用哨兵字符串。
 */
const NEG_INF = '-inf'
export const packGate = (gate) => {
  const one = (g) => ({
    fired: !!g?.fired,
    lastTurn: g?.lastTurn === -Infinity || g?.lastTurn == null ? NEG_INF : g.lastTurn,
  })
  return { player: one(gate?.player), enemy: one(gate?.enemy) }
}
export const unpackGate = (o) => {
  const one = (g) => ({
    fired: !!g?.fired,
    lastTurn: g?.lastTurn === NEG_INF || g?.lastTurn == null ? -Infinity : g.lastTurn,
  })
  return { player: one(o?.player), enemy: one(o?.enemy) }
}

/**
 * 环境事件：对象带 `apply(playerField, enemyField)` 方法，不可 JSON 化 → 只存 id。
 * 恢复时由调用方传入 lookup（避免本模块依赖 data 层，保持纯净可测）。
 */
export const packEnv = (active) => (active?.event?.id ? { id: active.event.id, turnsLeft: active.turnsLeft ?? 0 } : null)
export const unpackEnv = (o, lookup) => {
  if (!o?.id) return null
  const event = lookup(o.id)
  return event ? { event, turnsLeft: o.turnsLeft ?? 0 } : null
}
export const packEnvPending = (ev) => (ev?.id ? { id: ev.id } : null)
export const unpackEnvPending = (o, lookup) => (o?.id ? lookup(o.id) ?? null : null)

/**
 * 游标只能往小里猜（见文件头）。
 * @param {number} n     快照里的值
 * @param {number} max   当前已知的安全上界（不确定就传 0）
 */
export const clampCursor = (n, max = Infinity) => {
  const v = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
  return Number.isFinite(max) ? Math.min(v, max) : v
}

// ============================================================================
// 打包 / 解包整份快照
// ============================================================================

/**
 * 把 host 侧的一切打成一个 JSON-clean 的对象。
 * 调用方负责把 useBattle / usePvpHost / useHand 的当前值凑齐 —— 本模块不认识 React。
 */
export function packMatch({ engine, adapter, hands, meta }) {
  return {
    v: SNAPSHOT_VERSION,
    at: meta?.at ?? 0,                       // 由调用方注入时间戳（本模块保持纯函数、不读时钟）
    room: meta?.room ?? null,                // 中继房间码
    token: meta?.token ?? null,              // 中继重连凭证（只存本机）
    decks: meta?.decks ?? null,              // { player: [id…], enemy: [id…] } —— useHand 冻结卡组用
    engine: {
      battleState: engine.battleState,
      battleLog: engine.battleLog ?? [],
      playerSpDeck: engine.playerSpDeck ?? [],
      enemySpDeck: engine.enemySpDeck ?? [],
      pendingSpSummon: engine.pendingSpSummon ?? null,
      pendingEnemySpSummon: engine.pendingEnemySpSummon ?? null,
      spTriggered: packSet(engine.spTriggeredRef),
      playerInitLeaderHp: engine.playerInitLeaderHpRef ?? null,
      enemyInitLeaderHp: engine.enemyInitLeaderHpRef ?? null,
      activeEnvEvent: packEnv(engine.activeEnvEvent),
      pendingEnvEvent: packEnvPending(engine.pendingEnvEvent),
      recentEvents: engine.recentEventsRef ?? [],
      virusOutbreak: engine.virusOutbreakRef ?? null,
      battleStats: engine.battleStatsRef ?? null,
      quizGate: packGate(engine.quizGateRef),
      quizKey: engine.quizKeyRef ?? null,     // ☠️ 答案卡：只写本机 localStorage，永不上 wire
      quizSeq: engine.quizSeqRef ?? 0,
      processedDeaths: packSet(engine.processedDeathsRef),
      fieldUidSeq: engine.fieldUidSeq ?? 0,
    },
    adapter: {
      g: adapter?.g ?? null,
      lastN: adapter?.lastN ?? 0,
      ring: adapter?.ring ?? [],
      cursor: adapter?.cursor ?? 0,
      pendingAttack: adapter?.pendingAttack ?? null,
      enemyMulliganed: !!adapter?.enemyMulliganed,
      bootstrapped: !!adapter?.bootstrapped,
    },
    hands: {
      player: packHand(hands?.player),
      enemy: packHand(hands?.enemy),
    },
  }
}

const packHand = (h) => ({
  hand: h?.hand ?? [],
  drawPile: h?.drawPile ?? [],
  discard: h?.discard ?? [],
})

/**
 * 读回一份快照。**版本不符 / 过期 / 形状不对一律返回 null** ——
 * 半吊子地灌进去比不恢复危险得多（会得到一个「看起来在打、其实规则错了」的局）。
 * @param {object|string} raw  localStorage 里的原文或已解析对象
 * @param {number} now         当前时间戳（本模块不读时钟）
 */
export function readSnapshot(raw, now = 0) {
  let o = raw
  if (typeof raw === 'string') {
    try { o = JSON.parse(raw) } catch { return null }
  }
  if (!o || typeof o !== 'object') return null
  if (o.v !== SNAPSHOT_VERSION) return null
  if (!o.engine?.battleState?.player || !o.engine?.battleState?.enemy) return null
  if (!o.room || !o.token) return null                       // 没凭证 = 回不去原房间，这份快照没用
  if (now && o.at && now - o.at > SNAPSHOT_TTL_MS) return null
  return o
}

/** 快照是否还值得提示「继续上一局」——已分出胜负的局不提示。 */
export function isResumable(snap) {
  if (!snap) return false
  return snap.engine.battleState.winner == null
}
