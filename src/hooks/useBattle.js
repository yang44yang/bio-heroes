import { useState, useCallback, useRef, useEffect, useReducer } from 'react'
import { useLatestRef } from './useLatestRef.js'
import { battleReducer, initialBattleState, derivePhase } from '../engine/battleReducer.js'
// QUIZ_CHANCE 曾在此 import、但从未被引用 —— 问答触发是确定性的（见 tryQuiz：
// 首次攻击必触发，之后每 ≥3 回合一次），不是 25% 概率。留着这个 import 会让
// 「文档写的 25% 概率」看起来像是接了线的，故摘除。常量本身保留在 deckRules
// （连同解释），因为「概率 vs 确定」是设计决策，不该由清理死代码顺手定。
import {
  ENERGY_CAP, LEADER_HP, MAX_FIELD_SLOTS, FACTIONS, spEarliestSummonTurn,
  SP_QUIZ_STREAK, SP_LEADER_HP_RATIO, SP_TURN_TRIGGER,
} from '../data/deckRules.js'
import { canPlayWithMarkers, consumeFactionMarkers, getFactionMarkers } from '../utils/factionMarkers.js'
import { calcLeaderDamage } from '../utils/damage.js'
import { getRandomQuiz, resetQuizHistory } from '../data/quizzes.js'
import { recordQuizResult } from '../data/quizLeitner.js'
import { getQuizMode } from '../utils/settings.js'
import { triggerSkills } from '../engine/skillTriggers.js'
import { processStatuses, applyShieldAbsorb } from '../engine/statusEffects.js'
import { resolveCardCombat, aggregateCombatMods, canCardAttack } from '../engine/combat.js'
// S1: 规则守门人抽成 side 参数化的纯谓词（Node 可直测 → scripts/test-rules-gates.mjs）。
// 本 commit 只把**玩家路径**接过去；ai* 仍是另一份实现，fork 还在（S4/S5 才拆）。
import { canPlayCard, canAttackFrom, canTargetSlot } from '../engine/rules.js'
import { SIDES, opp } from '../engine/sides.js'
// AI 的**人格**（挑哪张 SP / 20% 忘记）住 engine/aiTarget.js —— 与 pickAiTarget 同处，
// 那里是「AI 怎么选」的家；引擎只管「能不能」（engine/rules.js）。S6 de-fork 的界线。
import { pickAiSpCard } from '../engine/aiTarget.js'
import { pickRandomEvent } from '../data/events.js'
import { getBossMechanic } from '../engine/bossMechanics.js'
import { cardHasGuard, fieldHasGuard, attackerBypassesGuard } from '../utils/guardSkill.js'
import { getStageRule } from '../engine/stageRules.js'

// 上场卡的 uid 兜底序号 —— 见 makeFieldCard。
// 模块级而非 useRef：uid 只需全局唯一，跨 hook 实例/跨对局单调递增即可。
let __fieldUidSeq = 0

// 出牌被拒时给玩家看的文案。rules.canPlayCard 只返回 reason code（它是 side-blind 的
// 纯谓词，不该知道「标记」这个词怎么写），文案在这里拼 —— 与 reason 一一对应。
// ⚠️ 文案逐字保持抽取前的原样，别顺手改措辞：scripts/test-* 里有文案锚点。
const PLAY_REJECT_MSG = {
  phase: () => '现在不能出牌',
  energy: (card) => `能量不足（需要 ${card.cost}）`,
  slot: () => '无效位置',
  markers: (card) =>
    `需要弃牌堆中有 ${card.factionRequirement.count} 个${FACTIONS[card.factionRequirement.faction]?.name}标记`,
}

/**
 * useBattle — Sprint 3 技能触发框架版
 *
 * 阶段流转（玩家视角）：
 *   mulligan → main（出牌）→ battle（攻击）→ enemyTurn（AI）→ main …
 */
export function useBattle() {
  // === 回合 & 阶段 === turn/activeSide/每侧 phase/winner 住在 battleReducer（E5c-4 → S3）
  // 真相源：state.activeSide（轮到谁） + state[side].phase（那一侧的进度：init|mulligan|main|battle|ended）
  // 对外仍暴露旧的顶层 phase 标量（derivePhase 派生）→ BattleScreen 20+ 处读取与 useAITurn 的
  // deps [battle.phase] 零改动。'animating' 已删（零消费的幽灵）；'over' 派生自 winner != null。
  // ⚡ 能量 playerEnergy/enemyEnergy 于 E5c-2 迁进 battleReducer，派生自 reducer（见下方 battleState 后）

  // === 主人 HP === playerLeaderHp/enemyLeaderHp 于 E5c-3 迁进 battleReducer，派生自 reducer（见下方 battleState 后）

  // === 战场（每方 MAX_FIELD_SLOTS 位，null = 空）— E5c-5 迁进 battleReducer，派生自 reducer（见下方 battleState 后）===
  const emptyField = () => Array(MAX_FIELD_SLOTS).fill(null)

  // === 召唤疲劳 & 已攻击（uid Set）===
  const summonedThisTurn = useRef(new Set())
  const attackedThisTurn = useRef(new Set())
  // Sprint 30b: Conundrum globalEffects（如 'antibiotic_weakened' = 抗生素卡 ATK 减半）
  const globalEffectsRef = useRef([])

  // === 日志 & 问答 & 胜负 ===
  const [battleLog, setBattleLog] = useState([])
  const [currentQuiz, setCurrentQuiz] = useState(null)
  // winner 于 E5c-4 迁进 battleReducer（派生自 reducer，见下方 battleState 后）

  // === 技能事件队列（供 BattleScreen 消费：伤害浮字、动画）===
  const [skillEvents, setSkillEvents] = useState([])

  // === 棋盘状态机（E5c）：逐组把 useState 收进 reducer ===
  // E5c-0：先迁 Power Bank。battleStateRef 供异步 AI 回合 / latest 快照读最新值
  // （渲染时 battleState 闭包是快照，await 之后是旧的 → 必须走 ref）。
  const [battleState, dispatch] = useReducer(battleReducer, initialBattleState)
  const battleStateRef = useLatestRef(battleState)

  // === 回合机 turn/phase/winner（E5c-4 迁进 battleReducer，派生自 reducer）===
  const turn = battleState.turn
  // 旧形状由纯函数派生（穷举测试 scripts/test-legacy-phase.mjs）——
  // 内部对称、外部不变，是「BattleScreen 零改动」这个赌注的唯一保险。
  const phase = derivePhase(battleState)
  const winner = battleState.winner

  // === Power Bank 能量储蓄罐（派生自 reducer，供 return 导出 / UI 读取）===
  const playerPowerBank = battleState.player.powerBank
  const enemyPowerBank = battleState.enemy.powerBank

  // === 能量（E5c-2 迁进 battleReducer，派生自 reducer）===
  const playerEnergy = battleState.player.energy
  const enemyEnergy = battleState.enemy.energy

  // === 弃牌堆（用于阵营标记计算）— E5c-1 迁进 battleReducer，派生自 reducer ===
  const playerDiscard = battleState.player.discard
  const enemyDiscard = battleState.enemy.discard

  // === 主人 HP（E5c-3 迁进 battleReducer，派生自 reducer）===
  const playerLeaderHp = battleState.player.leaderHp
  const enemyLeaderHp = battleState.enemy.leaderHp
  // 兼容垫片：boss/关卡机制（engine/bossMechanics·stageRules）拿的是 setter 且用
  // 纯 updater（min(max,+2000) / max(0,-dmg)）。走 LEADER_APPLY 让 updater 在 reducer 内对
  // 「当前提交态」跑，而非在垫片里读 battleStateRef（stale）再绝对 LEADER_SET —— 否则会覆盖
  // 同 tick 已派发的 LEADER_DAMAGE/HEAL delta（bio_alert 抹掉透析机回血、super_bacteria 同理）。
  const setPlayerLeaderHp = useCallback(
    (u) => dispatch({ type: 'LEADER_APPLY', side: 'player', updater: typeof u === 'function' ? u : () => u }), [])
  const setEnemyLeaderHp = useCallback(
    (u) => dispatch({ type: 'LEADER_APPLY', side: 'enemy', updater: typeof u === 'function' ? u : () => u }), [])

  // === 战场（E5c-5 迁进 battleReducer，派生自 reducer）===
  const playerField = battleState.player.field
  const enemyField = battleState.enemy.field
  // field 垫片：与 leaderHp 垫片不同，**原样透传 updater**（不在垫片里 resolve function）→ 让
  // reducer 对着「运行中已提交 state」跑 updater，保同 tick 多次 dispatch 顺序累加（等价旧
  // setField(prev=>...) 链）。所有传 setter 当参数的点（applySkillEvents/executeEventEffect/
  // boss·stage 机制）都收到这个垫片、调用兼容。⚠️ 凡「updater 闭包内赋值后同步读回」(defKilled/
  // atkKilled/replaced) 或「updater 内有副作用」(addLog/summonedThisTurn/非幂等 uid) 的点，已
  // 各自改成 dispatch 前用 battleStateRef 确定性算好（见 applyCombatOutcome/playToField/
  // processEndOfTurnEffects/MASS_REVIVE）。
  const setPlayerField = useCallback((u) => dispatch({ type: 'FIELD_UPDATE', side: 'player', value: u }), [])
  const setEnemyField = useCallback((u) => dispatch({ type: 'FIELD_UPDATE', side: 'enemy', value: u }), [])

  // Sprint 27: 手牌引用（由 BattleScreen 通过 setHandRefs 注入）
  // 用于 REVEAL_HAND 以及需要读取手牌的技能
  const handsRef = useRef({ playerHand: [], enemyHand: [], drawCards: null, aiDrawCards: null })
  const setHandRefs = useCallback((refs) => {
    handsRef.current = { ...handsRef.current, ...refs }
  }, [])

  // 消费「手牌相关」的技能事件（决策D）—— applySkillEvents 只拿场地 setter、碰不到手牌，故单列。
  //   _removeFromHand: 信息素召集把手牌卡召上场后，从手牌移除原卡（防一卡变两卡）
  //   _reviveToHand:   长老记忆从弃牌堆取回卡到手牌，并从权威弃牌堆（useBattle 的 discard）按引用移除
  const applyHandEvents = useCallback((events, side) => {
    if (!Array.isArray(events)) return
    const addToHand = side === 'player' ? handsRef.current.playerAddToHand : handsRef.current.enemyAddToHand
    const playCard = side === 'player' ? handsRef.current.playerPlayCard : handsRef.current.enemyPlayCard
    for (const evt of events) {
      if (evt._removeFromHand && playCard) playCard(evt._removeFromHand)
      if (evt._reviveToHand && addToHand) {
        addToHand([evt._reviveToHand])
        dispatch({ type: 'DISCARD_REMOVE_UID', side, uid: evt._reviveToHand.uid })
      }
    }
  }, [])

  // === SP 卡组 ===
  const [playerSpDeck, setPlayerSpDeck] = useState([])
  const [enemySpDeck, setEnemySpDeck] = useState([])
  const playerSpDeckRef = useLatestRef(playerSpDeck)
  const enemySpDeckRef = useLatestRef(enemySpDeck)

  // === 事件卡效果日志（供 UI 展示动画用）===
  const [pendingSpSummon, setPendingSpSummon] = useState(null) // { side, candidates }
  const pendingSpSummonRef = useLatestRef(pendingSpSummon)
  // Phase B: SP 三条件自动触发 —— 每条件本局只触发一次（按 `${side}:${reason}` 去重）
  const spTriggeredRef = useRef(new Set())
  // 主人初始 HP（用于 50% 触发阈值；campaign Boss 主人 HP 可能 ≠ 30000）
  const playerInitLeaderHpRef = useRef(LEADER_HP)
  const enemyInitLeaderHpRef = useRef(LEADER_HP)

  // === 问答连续答对次数（用于难度升级 + 科学家模式）===
  const quizStreakRef = useRef(0)
  const [quizStreak, setQuizStreak] = useState(0)
  // === 科学家模式（连续答对3题触发，持续2回合）===
  const [scientistMode, setScientistMode] = useState({ active: false, turnsLeft: 0 })
  // === 环境事件 ===
  const [activeEnvEvent, setActiveEnvEvent] = useState(null) // { event, turnsLeft }
  const [pendingEnvEvent, setPendingEnvEvent] = useState(null) // event to show in UI
  const recentEventsRef = useRef([]) // last 2 event ids
  // 病毒爆发持续伤害标记
  const virusOutbreakRef = useRef({ playerAffected: false, enemyAffected: false, turnsLeft: 0 })

  // === 战斗统计 ===
  const battleStatsRef = useRef({
    totalDamage: 0,
    kills: 0,
    quizCorrect: 0,
    quizTotal: 0,
    spSummons: 0,
    powerBankMax: 0,
    cardsPlayed: 0,
    eventsTriggered: 0,
  })

  // === Boss 机制 ===
  const campaignConfigRef = useRef(null)
  const bossStateRef = useRef({ phase: 1 }) // 追踪 Boss 阶段，避免重复触发
  const bossMechanicRef = useRef(null)
  // Boss 事件队列（供 BattleScreen 消费：浮字 + 对话触发）
  const [bossMechanicEvents, setBossMechanicEvents] = useState([])

  // === 关卡特殊规则 ===
  const stageRuleRef = useRef(null)

  // === 问答触发控制：首次攻击必触发，之后每3回合触发一次 ===
  const firstAttackDone = useRef(false)      // 本局是否已做过首次攻击
  const lastQuizTurn = useRef(0)             // 上次触发问答的回合数

  const addLog = useCallback((msg) => {
    setBattleLog(prev => [...prev, msg])
  }, [])

  const pushSkillEvents = useCallback((events) => {
    if (events.length > 0) {
      setSkillEvents(prev => [...prev, ...events])
    }
  }, [])

  const clearSkillEvents = useCallback(() => {
    setSkillEvents([])
  }, [])

  // === Refs（解决闭包问题）===（field 于 E5c-5 退役，读走 battleStateRef.current.<side>.field）

  // ----------------------------------------------------------------
  //  辅助
  // ----------------------------------------------------------------
  function makeFieldCard(card) {
    let atk = card.atk
    // Sprint 30b: antibiotic_weakened global effect → 抗生素卡 ATK 减半
    if (globalEffectsRef.current.includes('antibiotic_weakened') && card.tags?.includes('antibiotic')) {
      atk = Math.floor(atk / 2)
    }
    // baseAtk/baseHp 保留卡牌设计原值，供 UI 显示数值增量(buff/突变后差异化)
    // 注意 atk 已经可能被 antibiotic_weakened 减半，baseAtk 仍取 card.atk(更"原始"的数据层值)
    //
    // ★ uid 兜底：这里是「上场的卡必有唯一 uid」这个不变式的唯一收口点。
    //   cards.js 的原始卡不带 uid。带 uid 的卡来自若干个产地：useHand.js（卡组→手牌，
    //   uid 带 player_/enemy_ 前缀）、本文件 1556-1557（SP 卡组，sp_p_/sp_e_）、
    //   skillTemplates/skillRegistry/bossMechanics/stageRules（召唤/复活/分裂，各自现铸）。
    //   ⚠️ 凡新增产地：uid 必须能区分双方，否则双方同名卡在共用的 summonedThisTurn /
    //   attackedThisTurn Set 里串台（那正是 useHand 漏 side 前缀导致的既有 bug）。
    //   测试场把原始卡直接摆上场、绕过 useHand → uid 全是 undefined，而引擎里大量
    //   逻辑按 uid 做 Set 去重 / find 定位，undefined 会让它们全部塌缩成"同一张卡"：
    //     · combat.js:124/125  attackedThisTurn/summonedThisTurn.has(undefined) → 一张卡攻击=全场锁死
    //     · 本文件 261-263     deadUids=Set{undefined} → 死一张卡=整排（含满血的）被清空
    //     · 本文件 249-254     processedDeathsRef → 首张死卡后，其余卡亡语全部不触发
    //     · 技能事件 targetUid  find(c=>c.uid===targetUid) → 恒定命中战场第一张卡
    //   用 ?? 保留已有 uid：makeFieldCard 也被手牌/SP/复活等已带真 uid 的路径调用，
    //   无条件覆盖会破坏那些路径。已有 uid 时行为与修复前完全一致 → 正常对战零影响。
    return { ...card, uid: card.uid ?? `fc_${card.id}_${++__fieldUidSeq}`, atk, baseAtk: card.atk, baseHp: card.hp, currentHp: card.hp, maxHp: card.hp, statuses: [] }
  }

  // hasGuard / isGuardCard 委托给 utils/guardSkill 统一识别多个 nameEn
  // (Guard / Shell Defense / Physical Barrier 都算守护)，修复海龟·龟甲防御和
  // 睫毛·物理屏障 description 写了"守护"但 hasGuard 识别不到的隐藏 bug。
  const hasGuard = fieldHasGuard
  const isGuardCard = cardHasGuard

  // ----------------------------------------------------------------
  //  被击败卡牌清理（将 HP<=0 的卡位清空）
  //  返回被清理的卡牌数组（供弃牌堆使用）
  // ----------------------------------------------------------------
  // 统一 onDeath 触发：所有死亡都由下面的「提交后死亡 effect」扫场捕获 → 对每张死卡触发其 onDeath 技能。
  // （之前 onDeath 只在 handlePostAttackSkills 的"防守方被直接攻击打死"分支触发，反击/AOE/中毒/环境
  //  死亡全不触发 → 干细胞分化/海星复活/大肠杆菌分裂等失效。齐齐实测"干细胞死了不复活"即此。）
  // 用 ref 持最新闭包（fireOnDeathRef），避免 effect 里读到 stale-closure；
  // triggerSkills 是稳定 import，applySkillEvents/setters 经 ref 每渲染刷新。
  const fireOnDeathRef = useRef(null)
  fireOnDeathRef.current = (deadCards, deadSide) => {
    if (!deadCards || deadCards.length === 0) return
    const fSet = deadSide === 'player' ? setPlayerField : setEnemyField
    const eSet = deadSide === 'player' ? setEnemyField : setPlayerField
    for (const dc of deadCards) {
      // friendlyField 用 fRef.current（死卡 currentHp≤0 仍在 → findEmptySlot 视为空位，复活落到本方）。
      // discardPile：battleStateRef 的已提交弃牌堆 + 同一批一起死的其他卡。
      //   ★ 修齐齐实测：霸王龙 AOE 同时打死 干细胞 + 红细胞(body R) 时，红细胞还没进弃牌堆
      //   （DISCARD_ADD dispatch 在本 effect 的 fireOnDeath 之后才调），干细胞 revive 读弃牌堆看不到它 →
      //   误判"弃牌堆里没有合适的细胞模板"。把同批死卡并入模板池即修正（revive_as 仍按 id 过滤自身）。
      const batchDiscard = [...(battleStateRef.current[deadSide].discard || []), ...deadCards.filter(c => c.uid !== dc.uid)]
      const events = triggerSkills('onDeath', { card: dc, friendlyField: battleStateRef.current[deadSide].field, discardPile: batchDiscard })
      if (events && events.length) {
        applySkillEvents(events, fSet, eSet, deadSide)
        for (const e of events) if (e.message && e.type !== 'OVERFLOW_DAMAGE' && e.type !== 'PIERCING_DAMAGE') addLog(e.message)
      }
    }
  }

  // ── 死亡清理：统一在「每次提交后」扫场（useEffect），不再各死亡路径里同步清理（决策E1：已删除旧的 no-op 清理桩及 18 处调用）。
  // 为什么必须改成 effect（2026-06-25 preview 实测确认的真根因）：
  //   React18 自动批处理下，旧的「各路径同步清理」里 setter(updater) 的 updater 被延迟到 render 才执行，
  //   而紧接着同步读 dead.length → 恒为 0（eager-bailout 竞态：该 field 已有 pending 伤害更新时延迟、
  //   无 pending 时又 eager → 时灵时不灵）。结果：死卡不进弃牌堆 + onDeath 不触发
  //   ——齐齐反复实测"干细胞死了不复活"的真根因（实测日志 [CLEANUP] dead.length(sync) 恒 0，但卡确实死了）。
  //   flushSync 能强制同步、对玩家攻击路径有效，但在 effect/commit 上下文会报 "called from inside a lifecycle method"
  //   且不刷新 → 不能用。改用提交后 effect：读最新 field（死卡 currentHp≤0 仍在场）→ onDeath → 进弃牌堆 → 移除。
  // processedDeathsRef 按 uid 去重：每张死卡只处理一次（防 onDeath 重复触发 → 重复复活/分裂）。
  const processedDeathsRef = useRef(new Set())
  useEffect(() => {
    for (const side of ['player', 'enemy']) {
      const field = side === 'player' ? playerField : enemyField
      const fresh = field.filter(c => c && c.currentHp <= 0 && !processedDeathsRef.current.has(c.uid))
      if (fresh.length === 0) continue
      fresh.forEach(c => processedDeathsRef.current.add(c.uid))
      // 1) 先触发 onDeath（此刻死卡仍在 fRef.current，findEmptySlot 视其位为空 → 复活/分裂能落位）
      fireOnDeathRef.current?.(fresh, side)
      // 2) 进弃牌堆（阵营标记 / SP discard_check / 进化复用）
      dispatch({ type: 'DISCARD_ADD', side, cards: fresh })
      // 3) 从战场移除（仅移除这批确切 uid，避免误删 onDeath 复活进来的新卡）
      const deadUids = new Set(fresh.map(c => c.uid))
      const setter = side === 'player' ? setPlayerField : setEnemyField
      setter(prev => prev.map(c => (c && deadUids.has(c.uid)) ? null : c))
      // 4) 关卡特殊规则：敌方卡死亡触发（孢子蔓延等）
      if (side === 'enemy' && stageRuleRef.current?.onEnemyCardDeath) {
        for (const deadCard of fresh) {
          const ruleEvents = stageRuleRef.current.onEnemyCardDeath({
            deadCard, enemyField: battleStateRef.current.enemy.field, setEnemyField, addLog,
          })
          if (ruleEvents?.length > 0) setBossMechanicEvents(prev => [...prev, ...ruleEvents])
        }
      }
    }
  }, [playerField, enemyField])


  // ----------------------------------------------------------------
  //  Boss HP 阈值检查（攻击后调用）
  // ----------------------------------------------------------------
  function checkBossHPThreshold() {
    const boss = bossMechanicRef.current
    if (!boss?.onHPThreshold) return
    const config = campaignConfigRef.current
    const maxHP = config?.leaderHP || LEADER_HP
    const currentHP = battleStateRef.current.enemy.leaderHp
    const result = boss.onHPThreshold({
      currentHP,
      maxHP,
      enemyField: battleStateRef.current.enemy.field,
      setEnemyField,
      addLog,
      bossState: bossStateRef.current,
    })
    if (result?.events?.length > 0) {
      setBossMechanicEvents(prev => [...prev, ...result.events])
    }
    if (result?.dialogue) {
      setBossMechanicEvents(prev => [...prev, { type: 'BOSS_DIALOGUE', dialogueKey: result.dialogue }])
    }
  }

  // ----------------------------------------------------------------
  //  统一技能事件执行器
  //  friendlySetter: 技能拥有者所在场的 setter
  //  enemySetter: 对面场的 setter
  //  side: 'player' | 'enemy'（技能拥有者，用于 leader / powerBank 事件）
  // ----------------------------------------------------------------
  function applySkillEvents(events, friendlySetter, enemySetter, side = 'player') {
    // 技能拥有者视角的 leader side（E5c-3：leader 写走 dispatch delta，不再 setter 变量）
    const oppSide = side === 'player' ? 'enemy' : 'player'
    for (const evt of events) {
      switch (evt.type) {
        case 'NARRATIVE_LOG': {
          // 只写战斗日志、不改任何 state。给"技能触发了但条件不满足"的场景用
          // (如干细胞分化时弃牌堆没匹配卡)，避免静默 null 让玩家困惑"为什么没反应"。
          if (evt.message) addLog(evt.message)
          break
        }
        case 'HEAL': {
          friendlySetter(prev => {
            const next = prev.map(c => c ? { ...c } : null)
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              target.currentHp = Math.min(target.maxHp, target.currentHp + evt.amount)
            }
            return next
          })
          break
        }
        case 'APPLY_SHIELD': {
          friendlySetter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              target.statuses.push({ type: 'shield', amount: evt.amount, source: evt.source })
            }
            return next
          })
          break
        }
        case 'BUFF': {
          // _side='enemy' → 作用敌方场（ATK 减益）；否则友方（增益）。
          // 与 APPLY_STATUS / REMOVE_STATUS 一致按 _side 路由，否则减益会在己方场找不到目标而空转。
          const buffSetter = evt._side === 'enemy' ? enemySetter : friendlySetter
          buffSetter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target && evt.stat === 'atk') {
              // 实际增减量（ATK 不低于 0，避免负值与回退超调）
              const before = target.atk
              target.atk = Math.max(0, target.atk + evt.amount)
              const delta = target.atk - before
              // 时限（evt.turns）：加 atk_boost status，回合结束 processStatuses 按实际 delta 回退，
              // 防永久叠加（与事件卡 buff 同款）。无 turns 保持永久（吞噬成长 / Gene Edit / permanent_debuff）。
              if (evt.turns && delta !== 0) {
                target.statuses.push({
                  type: 'atk_boost',
                  amount: delta,
                  turnsLeft: evt.turns,
                  source: evt.source,
                })
              }
            } else if (target && evt.stat === 'hp') {
              // HP 永久 buff(基因治疗·基因修正)：同时提升 maxHp 上限和 currentHp 当前值。
              // 不支持 turns(没引入 hp_boost status)；若未来需要回合限定 HP buff 再扩展。
              const baseMax = target.maxHp || target.hp || 0
              target.maxHp = Math.max(0, baseMax + evt.amount)
              target.currentHp = Math.max(0, (target.currentHp || 0) + evt.amount)
            }
            return next
          })
          break
        }
        case 'AOE_DAMAGE': {
          // 默认打敌方(enemySetter)。反击(_side==='attacker', 荆棘反击/海葵刺)打"攻击者"那方 → friendlySetter
          // （攻击者所在场 = 本次 applySkillEvents 的 friendly 那一方，见 onHit 触发点）。其它 AOE_DAMAGE 无此标记，行为不变。
          const dmgSetter = evt._side === 'attacker' ? friendlySetter : enemySetter
          dmgSetter(prev => {
            const next = prev.map(c => c ? { ...c } : null)
            if (evt.targetSlot !== undefined && next[evt.targetSlot]) {
              next[evt.targetSlot].currentHp = Math.max(0, next[evt.targetSlot].currentHp - evt.damage)
            }
            return next
          })
          break
        }
        case 'APPLY_POISON': {
          // 毒素施加到敌方卡
          enemySetter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              target.statuses.push({ type: 'poison', damage: evt.damage, turnsLeft: evt.turnsLeft })
            }
            return next
          })
          break
        }
        case 'APPLY_SLEEP': {
          // 睡眠施加到敌方卡
          enemySetter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              target.statuses.push({ type: 'sleep', turnsLeft: evt.turnsLeft })
            }
            return next
          })
          break
        }
        case 'SUMMON_CARD': {
          // 召唤卡牌到己方场上
          friendlySetter(prev => {
            const next = [...prev]
            const isFree = (i) => i >= 0 && i < next.length && (!next[i] || next[i].currentHp <= 0)
            // 优先用事件指定的 slot；若已被占则回退到当前累积场上的下一个空/死槽。
            // 修 bug：同一批被 AOE 一起打死的多张亡语复活卡，onDeath 读的是同一份死亡快照 →
            // findEmptySlot 给它们算出同一个 slot，除第一张外过去在此被静默丢弃（如两张海星只活一张）。
            // friendlySetter 是累积型 updater，回退用 next（已含前一张落位）→ 同批复活自然铺开到不同槽。
            let slot = isFree(evt.slot) ? evt.slot : next.findIndex((c, i) => isFree(i))
            if (slot >= 0 && slot < next.length) {
              next[slot] = evt.card
            }
            return next
          })
          // 标记召唤疲劳
          if (evt.card && evt.card.uid) {
            dispatch({ type: 'MARK_SUMMONED', side, uid: evt.card.uid })
          }
          break
        }
        case 'REVEAL_HAND': {
          // Sprint 27: 揭示敌方手牌 — 不仅打日志，还推送 skillEvents 供 BattleScreen 显示浮窗
          // Sprint 28: 标注 initiator side 以便 UI 判断是玩家还是 AI 触发
          evt._initiatorSide = side
          addLog(evt.message)
          break
        }
        case 'APPLY_MARK': {
          // 给敌方卡添加标记状态
          enemySetter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              target.statuses.push({
                type: 'marked',
                bonus_damage: evt.bonus_damage,
                bonus_from: evt.bonus_from,
                faction_filter: evt.faction_filter,
                source: evt.source,
              })
            }
            return next
          })
          break
        }
        case 'ENERGY_BOOST': {
          // Sprint 27: 实际增加能量（不再只打日志）
          dispatch({ type: 'ENERGY_ADD', side, amount: evt.amount || 1, cap: ENERGY_CAP })
          if (evt.message) addLog(evt.message)
          break
        }
        case 'DRAW_CARD': {
          // Sprint 27: 技能抽牌（Hematopoiesis / Super Computation）
          const drawFn = side === 'player' ? handsRef.current.drawCards : handsRef.current.aiDrawCards
          if (typeof drawFn === 'function') {
            const drawn = drawFn(evt.amount || 1)
            if (drawn && drawn.length > 0 && evt.message) {
              addLog(evt.message)
            }
          } else if (evt.message) {
            addLog(evt.message)
          }
          break
        }
        // === Sprint 24 新增 ===
        case 'REPAIR_POWER_BANK': {
          dispatch({ type: 'POWERBANK_RESTORE', side })
          if (evt.message) addLog(evt.message)
          break
        }
        case 'APPLY_STATUS': {
          // 通用添加状态（onFriendly/self，默认给友方）
          const setter = evt._side === 'enemy' ? enemySetter : friendlySetter
          setter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target && evt.status) {
              target.statuses.push({ ...evt.status })
            }
            return next
          })
          if (evt.message) addLog(evt.message)
          break
        }
        case 'REMOVE_STATUS': {
          // Sprint 26: 移除指定类型的 status（通用版，REMOVE_SHIELD 的泛化）
          const setter = evt._side === 'enemy' ? enemySetter : friendlySetter
          setter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target && evt.statusType) {
              target.statuses = target.statuses.filter(s => s.type !== evt.statusType)
            }
            return next
          })
          if (evt.message) addLog(evt.message)
          break
        }
        case 'REMOVE_SHIELD': {
          enemySetter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              target.statuses = target.statuses.filter(s => s.type !== 'shield')
            }
            return next
          })
          if (evt.message) addLog(evt.message)
          break
        }
        case 'HEAL_LEADER': {
          dispatch({ type: 'LEADER_HEAL', side, amount: evt.amount || 0, cap: LEADER_HP })
          if (evt.message) addLog(evt.message)
          break
        }
        case 'MASS_REVIVE': {
          // 从弃牌堆复活所有角色卡到空位（最多到 5 位）
          // evt.faction_filter (可选)：仅复活该阵营卡。不传则复活全部（向后兼容 sp_quantum_healer）
          const hpPercent = evt.hp_percent || 0.5
          const discard = battleStateRef.current[side].discard || []
          let chars = discard.filter(c => c && (c.type === 'character' || !c.type))
          if (evt.faction_filter) chars = chars.filter(c => c.faction === evt.faction_filter)
          if (chars.length === 0) {
            // 弃牌堆没有可复活的卡。给独立 narrative log，避免和 message(可能写"全员归来")矛盾。
            if (evt.emptyMessage) addLog(evt.emptyMessage)
            else if (evt.message) addLog(evt.message)
            break
          }
          // E5c-5：复活卡（含 Date.now()/Math.random() 非幂等 uid）在 updater **外**预造，
          //   summonedThisTurn.add 也在外；updater 只把预造卡放进运行中场的空位（保同 tick 累加）。
          const revivedCards = chars.map(killed => {
            const maxHp = killed.maxHp || killed.hp || 1000
            return {
              ...killed,
              uid: (killed.id || 'rev') + '_mass_revive_' + Date.now() + '_' + Math.random(),
              currentHp: Math.floor(maxHp * hpPercent),
              maxHp,
              statuses: [],
              summonSick: true,
            }
          })
          friendlySetter(prev => {
            const next = [...prev]
            for (const revived of revivedCards) {
              const emptyIdx = next.findIndex(c => !c || c.currentHp <= 0)
              if (emptyIdx < 0) break
              next[emptyIdx] = revived
            }
            return next
          })
          for (const revived of revivedCards) dispatch({ type: 'MARK_SUMMONED', side, uid: revived.uid })
          if (evt.message) addLog(evt.message)
          break
        }
        case 'CLEANSE': {
          // 移除负面状态（poison/sleep/deep_pressure）
          const setter = evt._side === 'enemy' ? enemySetter : friendlySetter
          setter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              const neg = ['poison', 'sleep', 'deep_pressure']
              target.statuses = target.statuses.filter(s => !neg.includes(s.type))
            }
            return next
          })
          if (evt.message) addLog(evt.message)
          break
        }
        // OVERFLOW_DAMAGE / PIERCING_DAMAGE 由 handlePostAttackSkills 单独处理
      }
    }
  }

  // ----------------------------------------------------------------
  //  技能触发 + 溢出伤害处理（Overpower / Piercing）
  //  在攻击后调用，处理 onKill / onDeath 时机
  // ----------------------------------------------------------------
  function handlePostAttackSkills(atkCard, defCard, atkDmg, defKilled, side) {
    const oppSide = side === 'player' ? 'enemy' : 'player'  // 溢出伤害打对方主人（E5c-3 漏定义→击杀防守方时 ReferenceError 冻结 AI 回合）
    const allEvents = []                                    // 仅 onKill（攻击方技能）

    if (defKilled) {
      const overflow = Math.max(0, atkDmg - defCard.currentHp)

      // onKill — 检查攻击方技能
      const killFriendlyField = side === 'player'
        ? battleStateRef.current.player.field
        : battleStateRef.current.enemy.field
      const killEvents = triggerSkills('onKill', {
        attacker: atkCard,
        defender: defCard,
        overflow,
        friendlyField: killFriendlyField,
        friendlyFieldRaw: killFriendlyField, // 决策F：真 5 格数组（含 null 空位），供召唤类找空位
      })

      // onDeath 已统一收口到「提交后死亡 effect」（覆盖反击/AOE/中毒/环境等所有死亡）→ 此处不再触发，避免双触发。
      allEvents.push(...killEvents)

      // 处理溢出伤害到主人（Overpower / Piercing，均来自 onKill）
      // E5c-3：leader 走 dispatch LEADER_DAMAGE（reducer 累加）；胜负判定读本地累减值 leaderRunning，
      //   保「同 tick 多个溢出事件」与旧 setX(prev=>...) 链式一致（攻击方一侧永远打对方主人 = oppSide）。
      let leaderRunning = battleStateRef.current[oppSide].leaderHp
      for (const evt of allEvents) {
        if ((evt.type === 'OVERFLOW_DAMAGE' || evt.type === 'PIERCING_DAMAGE') && evt.damage > 0) {
          dispatch({ type: 'LEADER_DAMAGE', side: oppSide, amount: evt.damage })
          leaderRunning = Math.max(0, leaderRunning - evt.damage)
          if (leaderRunning <= 0) {
            dispatch({ type: 'GAME_OVER', winner: side })
          } else if (side === 'player') {
            checkBossHPThreshold()
          }
          addLog(evt.message)
        }
      }
    }

    // onKill 事件用攻击方 side（BUFF / HEAL 等，如吞噬攻击 ATK +500）
    const friendlySetter = side === 'player' ? setPlayerField : setEnemyField
    const enemySetter = side === 'player' ? setEnemyField : setPlayerField
    applySkillEvents(allEvents, friendlySetter, enemySetter, side)


    // 记录技能事件（onKill；onDeath 已收口到「提交后死亡 effect」内自行记录）
    for (const evt of allEvents) {
      if (evt.message && evt.type !== 'OVERFLOW_DAMAGE' && evt.type !== 'PIERCING_DAMAGE') {
        addLog(evt.message)
      }
    }

    return allEvents
  }

  // ----------------------------------------------------------------
  //  回合结束技能处理（Natural Recovery / 状态效果 tick）
  // ----------------------------------------------------------------
  function processEndOfTurnEffects(side) {
    const oppSide = side === 'player' ? 'enemy' : 'player'
    const startField = battleStateRef.current[side].field
    const allEvents = []

    // E5c-5：onTurnEnd 的己方场地改动（HEAL/SUMMON/状态 tick）全部折进一个本地 nextField，
    //   同步算完、addLog/事件同步收集，最后一次 dispatch 快照。原因：useReducer dispatch 不 eager，
    //   ① 状态 tick 的 allEvents 要同步返回给 pushSkillEvents（浮字）；② HEAL 后接状态 tick 若各自
    //   dispatch 快照会互相覆盖丢累加；③ processStatuses 就地改血 + addLog 不能进 reducer（渲染中 setState）。
    let nextField = startField.map(c => c ? { ...c } : null)

    // onTurnEnd 技能（自愈等）。传 turn → 让 interval 类技能(如胸腺 T-Cell Training 每2回合抽牌)能判回合。
    const turnEndEvents = triggerSkills('onTurnEnd', {
      friendlyField: startField.filter(c => c && c.currentHp > 0),
      friendlyFieldRaw: startField, // 决策F：真 5 格数组（含 null 空位），供骨髓造血等召唤类找空位
      turn: battleStateRef.current.turn,
    })

    // 处理回合结束技能事件（HEAL/SUMMON 就地改 nextField；leader/抽牌走各自 dispatch/手牌）
    for (const evt of turnEndEvents) {
      if (evt.type === 'HEAL' && evt.amount > 0 && evt._leaderHeal) {
        // 主人回血（蛔虫吸血回己方主人等）
        dispatch({ type: 'LEADER_HEAL', side, amount: evt.amount, cap: LEADER_HP })
        addLog(evt.message)
      } else if (evt.type === 'HEAL' && evt.amount > 0) {
        const target = nextField.find(c => c && c.uid === evt.targetUid) || nextField.find(c => c && c.name === evt.target)
        if (target) target.currentHp = Math.min(target.maxHp, target.currentHp + evt.amount)
        addLog(evt.message)
      } else if (evt.type === 'OVERFLOW_DAMAGE' && evt.damage > 0) {
        // 扣敌方主人血（蛔虫 Nutrient Hijack 吸血等）
        dispatch({ type: 'LEADER_DAMAGE', side: oppSide, amount: evt.damage })
        addLog(evt.message)
      } else if (evt.type === 'DRAW_CARD') {
        // 抽牌（胸腺 T-Cell Training 每2回合抽1张等）
        const drawFn = side === 'player' ? handsRef.current.drawCards : handsRef.current.aiDrawCards
        if (typeof drawFn === 'function') drawFn(evt.amount || 1)
        if (evt.message) addLog(evt.message)
      } else if (evt.type === 'SUMMON_CARD') {
        // 骨髓造血等召唤技能
        if (evt.slot >= 0 && evt.slot < nextField.length && (!nextField[evt.slot] || nextField[evt.slot].currentHp <= 0)) {
          nextField[evt.slot] = evt.card
        }
        if (evt.card?.uid) dispatch({ type: 'MARK_SUMMONED', side, uid: evt.card.uid })
        addLog(evt.message)
      }
      allEvents.push(evt)
    }

    // 处理状态效果（中毒 / 沉睡 tick）—— 就地改 nextField（含 statuses 克隆），事件/日志同步收集
    nextField = nextField.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null)
    {
      for (const card of nextField) {
        if (!card || card.currentHp <= 0) continue
        const statusEvents = processStatuses(card)
        for (const evt of statusEvents) {
          addLog(evt.message)
          allEvents.push(evt)
        }
      }
    }
    // 一次性提交 onTurnEnd 的全部己方场地改动（HEAL+SUMMON+状态 tick）
    dispatch({ type: 'FIELD_UPDATE', side, value: nextField })
    // 中毒/状态 tick 可能致死 → 清理死卡并触发其 onDeath（干细胞分化/复活/分裂/孢子散播等）由提交后 useEffect 处理。

    return allEvents
  }

  // applySkillEvents 内部已自行 addLog 的事件类型 —— 下方回合开始日志循环跳过它们，避免重复记录
  const TURN_START_SELF_LOGGED = new Set([
    'ENERGY_BOOST', 'DRAW_CARD', 'HEAL_LEADER', 'NARRATIVE_LOG', 'CLEANSE',
    'APPLY_STATUS', 'REMOVE_STATUS', 'REMOVE_SHIELD', 'REPAIR_POWER_BANK',
    'MASS_REVIVE', 'REVEAL_HAND',
  ])

  // ----------------------------------------------------------------
  //  回合开始时的 onTurnStart 技能（核心战斗循环接线）
  //  覆盖：向日葵/线粒体充能(ENERGY_BOOST)、蚁后召唤(SUMMON_CARD)、
  //        变形虫变异(BUFF/HEAL)、肝/肾清毒(cleanse)、超算抽牌(DRAW_CARD)
  //  对称服务玩家 & 敌方：side 决定 friendly/enemy setter 与能量/抽牌走向
  //  （结构参考 processEndOfTurnEffects 的 onTurnEnd 调用，但走 applySkillEvents 全量分派）
  // ----------------------------------------------------------------
  function processTurnStartEffects(side) {
    const oppSide = side === 'player' ? 'enemy' : 'player'
    const friendlySetter = side === 'player' ? setPlayerField : setEnemyField
    const enemySetter = side === 'player' ? setEnemyField : setPlayerField

    // 遍历己方场上存活卡触发 onTurnStart（triggerSkills 内部逐卡注入 ctx.card）
    const events = triggerSkills('onTurnStart', {
      friendlyField: battleStateRef.current[side].field.filter(c => c && c.currentHp > 0),
      enemyField: battleStateRef.current[oppSide].field.filter(c => c && c.currentHp > 0),
      playerHand: side === 'player' ? handsRef.current.playerHand : handsRef.current.enemyHand,
      enemyHand: side === 'player' ? handsRef.current.enemyHand : handsRef.current.playerHand,
      discardPile: battleStateRef.current[side].discard,
      turn: battleStateRef.current.turn,
    })
    if (events.length === 0) return events

    // 透析/肾脏的「主人回血」：cleanse 模板发 HEAL+__leader__，转成 applySkillEvents 能处理的 HEAL_LEADER
    const applied = events.map(evt =>
      (evt.type === 'HEAL' && evt._leaderHeal)
        ? { ...evt, type: 'HEAL_LEADER' }
        : evt
    )
    applySkillEvents(applied, friendlySetter, enemySetter, side)

    // cleanse 模板原地修改 statuses 且只回 RUSH_BOOST（无 setter），强制提交一次 re-render 反映清除
    friendlySetter(prev => prev.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null))

    // 日志：跳过 applySkillEvents 已内部记录的事件类型，避免重复
    const prefix = side === 'player' ? '🔵' : '🔴'
    for (const evt of applied) {
      if (evt.message && !TURN_START_SELF_LOGGED.has(evt.type)) addLog(`${prefix} ${evt.message}`)
    }
    pushSkillEvents(applied)
    return applied
  }

  // ----------------------------------------------------------------
  //  Power Bank：回合结束时剩余能量流入
  // ----------------------------------------------------------------
  function processEndPhase(side) {
    const energy = battleStateRef.current[side].energy
    const pb = battleStateRef.current[side].powerBank

    if (pb.intact && energy > 0) {
      const newStored = pb.stored + energy
      dispatch({ type: 'POWERBANK_ADD', side, amount: energy })
      if (side === 'player' && newStored > battleStatsRef.current.powerBankMax) {
        battleStatsRef.current.powerBankMax = newStored
      }
      addLog(`⚡ ${energy} 点剩余能量流入 Power Bank！(总计: ${newStored})`)
      dispatch({ type: 'ENERGY_SET', side, value: 0 })
    }
  }

  // ----------------------------------------------------------------
  //  Power Bank：打破释放能量
  // ----------------------------------------------------------------
  const breakPowerBank = useCallback((side) => {
    const pb = battleStateRef.current[side].powerBank
    if (!pb.intact || pb.stored <= 0) return 0

    const released = pb.stored

    // 打破可突破上限 10 → ENERGY_ADD 不传 cap
    dispatch({ type: 'ENERGY_ADD', side, amount: released })
    dispatch({ type: 'POWERBANK_SET', side, powerBank: { stored: 0, intact: false } })
    addLog(`💥 Power Bank 打破！释放 ${released} 点能量！`)

    return released
  }, [addLog])

  // ----------------------------------------------------------------
  //  环境事件触发（每3回合玩家回合开始时检查）
  // ----------------------------------------------------------------
  function tryEnvironmentEvent(currentTurn) {
    if (currentTurn < 3 || currentTurn % 3 !== 0) return null
    const event = pickRandomEvent(recentEventsRef.current)
    recentEventsRef.current = [...recentEventsRef.current.slice(-1), event.id]
    return event
  }

  function applyEnvironmentEvent(event) {
    const pField = [...battleStateRef.current.player.field.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null)]
    const eField = [...battleStateRef.current.enemy.field.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null)]

    const result = event.apply(pField, eField)

    if (result.playerField) setPlayerField(result.playerField)
    if (result.enemyField) setEnemyField(result.enemyField)

    // Handle virus outbreak specially
    if (event.id === 'virus_outbreak') {
      virusOutbreakRef.current = {
        playerAffected: !result.playerHasBody,
        enemyAffected: !result.enemyHasBody,
        turnsLeft: event.duration,
      }
    }

    // Track active duration events
    if (event.duration > 0) {
      setActiveEnvEvent({ event, turnsLeft: event.duration })
    }

    battleStatsRef.current.eventsTriggered++
    addLog(`🌍 环境事件：${event.emoji} ${event.name} — ${event.description}`)
    if (result.affected?.length > 0) {
      addLog(`   影响：${result.affected.join(', ')}`)
    }
    // 环境事件可能扣血致死（森林大火/基因突变等）→ 清理死卡并触发其 onDeath。
  }

  // Tick virus outbreak damage each turn
  function tickVirusOutbreak() {
    const vo = virusOutbreakRef.current
    if (vo.turnsLeft <= 0) return
    if (vo.playerAffected) {
      dispatch({ type: 'LEADER_DAMAGE', side: 'player', amount: 500 })
      if (Math.max(0, battleStateRef.current.player.leaderHp - 500) <= 0) { dispatch({ type: 'GAME_OVER', winner: 'enemy' }) }
      addLog('🦠 病毒爆发：我方主人 -500 HP（无人体系保护）')
    }
    if (vo.enemyAffected) {
      dispatch({ type: 'LEADER_DAMAGE', side: 'enemy', amount: 500 })
      if (Math.max(0, battleStateRef.current.enemy.leaderHp - 500) <= 0) { dispatch({ type: 'GAME_OVER', winner: 'player' }) }
      addLog('🦠 病毒爆发：敌方主人 -500 HP（无人体系保护）')
    }
    virusOutbreakRef.current = { ...vo, turnsLeft: vo.turnsLeft - 1 }
  }

  // Tick active environment event duration
  function tickEnvEvent() {
    setActiveEnvEvent(prev => {
      if (!prev) return null
      const left = prev.turnsLeft - 1
      if (left <= 0) {
        addLog(`🌍 ${prev.event.emoji} ${prev.event.name} 效果结束`)
        return null
      }
      return { ...prev, turnsLeft: left }
    })
  }

  // ----------------------------------------------------------------
  //  事件卡效果执行器
  //  返回 { success, message, extraEvents }
  // ----------------------------------------------------------------
  function executeEventEffect(card, side, opts = {}) {
    const { drawCards, addToHand } = opts
    const friendlySetter = side === 'player' ? setPlayerField : setEnemyField
    const enemySetter = side === 'player' ? setEnemyField : setPlayerField
    const oppSide = side === 'player' ? 'enemy' : 'player'   // E5c-5：field 读走 battleStateRef

    switch (card.effectType) {
      case 'energy': {
        // 回复能量
        dispatch({ type: 'ENERGY_ADD', side, amount: card.effectValue, cap: ENERGY_CAP })
        addLog(`✨ ${card.name}：回复 ${card.effectValue} 点能量！`)
        return { success: true }
      }
      case 'buff': {
        // ATK buff — 加 atk_boost status 标记 buff 来源 + turnsLeft
        // 同时立即把 amount 加到 c.atk（让攻击/显示逻辑无需改）
        // 回合结束 processStatuses 会回退 atk 并移除 status
        const target = card.effectTarget
        if (target.startsWith('all_friendly')) {
          const factionFilter = target.includes('nature') ? 'nature'
            : target.includes('body') ? 'body'
            : target.includes('pathogen') ? 'pathogen'
            : target.includes('tech') ? 'tech' : null
          const turns = card.effectTurns || 1
          friendlySetter(prev => {
            return prev.map(c => {
              if (!c || c.currentHp <= 0) return c
              if (c.type === 'sp' || c.type === 'character') {
                if (factionFilter && c.faction !== factionFilter) return c
                const statuses = c.statuses ? [...c.statuses] : []
                statuses.push({
                  type: 'atk_boost',
                  amount: card.effectValue,
                  turnsLeft: turns,
                  source: card.id,
                })
                return { ...c, atk: c.atk + card.effectValue, statuses }
              }
              return c
            })
          })
          const fName = factionFilter ? FACTIONS[factionFilter]?.name : ''
          addLog(`✨ ${card.name}：所有己方${fName}生物卡 ATK +${card.effectValue}（持续${turns}回合）！`)
          if (target.includes('with_cost')) {
            friendlySetter(prev => prev.map(c => {
              if (!c || c.currentHp <= 0) return c
              return { ...c, currentHp: Math.max(1, c.currentHp - 500) }
            }))
            addLog(`🔥 发烧副作用：所有己方卡 HP -500`)
          }
        }
        return { success: true }
      }
      case 'damage': {
        const target = card.effectTarget
        if (target === 'all_enemy_damage') {
          // AOE damage to all enemy cards
          enemySetter(prev => prev.map(c => {
            if (!c || c.currentHp <= 0) return c
            return { ...c, currentHp: Math.max(0, c.currentHp - card.effectValue) }
          }))
          addLog(`💥 ${card.name}：对所有敌方卡造成 ${card.effectValue} 伤害！`)
        } else if (target === 'destroy_enemy_low_hp') {
          // Destroy one enemy card with HP <= threshold
          const eField = battleStateRef.current[oppSide].field
          const targetCard = eField.find(c => c && c.currentHp > 0 && c.currentHp <= card.effectValue)
          if (targetCard) {
            enemySetter(prev => prev.map(c => {
              if (c && c.uid === targetCard.uid) return { ...c, currentHp: 0 }
              return c
            }))
            addLog(`💀 ${card.name}：消灭了 ${targetCard.name}！`)
          } else {
            addLog(`✨ ${card.name}：没有符合条件的目标`)
          }
        } else if (target === 'one_enemy_poison') {
          // Poison one random enemy card
          const eField = battleStateRef.current[oppSide].field
          const alive = eField.filter(c => c && c.currentHp > 0)
          if (alive.length > 0) {
            const victim = alive[Math.floor(Math.random() * alive.length)]
            enemySetter(prev => prev.map(c => {
              if (!c || c.uid !== victim.uid) return c
              const statuses = c.statuses ? [...c.statuses] : []
              statuses.push({ type: 'poison', damage: card.effectValue, turnsLeft: 2 })
              return { ...c, statuses }
            }))
            addLog(`🧪 ${card.name}：${victim.name} 中毒！每回合 -${card.effectValue} HP，持续2回合`)
          }
        }
        return { success: true }
      }
      case 'heal': {
        const target = card.effectTarget
        if (target === 'one_ally_heal') {
          // Heal one friendly card with lowest HP
          const field = battleStateRef.current[side].field
          const alive = field.filter(c => c && c.currentHp > 0 && c.currentHp < c.maxHp)
          if (alive.length > 0) {
            const lowest = alive.reduce((min, c) => c.currentHp < min.currentHp ? c : min, alive[0])
            friendlySetter(prev => prev.map(c => {
              if (!c || c.uid !== lowest.uid) return c
              return { ...c, currentHp: Math.min(c.maxHp, c.currentHp + card.effectValue) }
            }))
            addLog(`💚 ${card.name}：${lowest.name} 回复 ${card.effectValue} HP！`)
          }
        } else if (target === 'one_ally_body_shield') {
          // Shield one body faction ally
          const field = battleStateRef.current[side].field
          const bodyAlive = field.filter(c => c && c.currentHp > 0 && c.faction === 'body')
          if (bodyAlive.length > 0) {
            const target = bodyAlive[Math.floor(Math.random() * bodyAlive.length)]
            friendlySetter(prev => prev.map(c => {
              if (!c || c.uid !== target.uid) return c
              const statuses = c.statuses ? [...c.statuses] : []
              statuses.push({ type: 'shield', amount: card.effectValue, source: card.name })
              return { ...c, statuses }
            }))
            addLog(`🛡️ ${card.name}：${target.name} 获得 ${card.effectValue} 护盾！`)
          }
        }
        return { success: true }
      }
      case 'draw': {
        if (card.effectTarget === 'draw_cards' && drawCards) {
          // Draw N cards
          const drawn = drawCards(card.effectValue)
          addLog(`📖 ${card.name}：抽了 ${drawn.length} 张牌！`)
        } else if (card.effectTarget === 'draw_filter_nature' && drawCards) {
          // 决策F：抽 card.effectValue(=3) 张（旧写死 draw 2 且注释自承 simplified）。
          // 真·"翻3自然入手其余回底"需给 useHand 加 peek/filter API，留作后续增强；先做够费的抽3 + 文案对齐。
          const drawn = drawCards(card.effectValue || 3)
          addLog(`📖 ${card.name}：抽了 ${drawn.length} 张牌！`)
        }
        return { success: true }
      }
      case 'special': {
        const target = card.effectTarget
        if (target.startsWith('discard_to_hand')) {
          // Retrieve card from discard pile
          const faction = target.includes('nature') ? 'nature' : target.includes('body') ? 'body' : null
          const pile = battleStateRef.current[side].discard
          const candidates = pile.filter(c => c.type === 'character' && (!faction || c.faction === faction))
          if (candidates.length > 0 && addToHand) {
            const chosen = candidates[candidates.length - 1] // most recent
            dispatch({ type: 'DISCARD_REMOVE_UID', side, uid: chosen.uid })
            addToHand(chosen)
            addLog(`♻️ ${card.name}：${chosen.name} 从弃牌堆回到手牌！`)
          } else {
            addLog(`✨ ${card.name}：弃牌堆中没有符合条件的卡`)
          }
        } else if (target === 'revive_body_from_discard') {
          // Revive a body card from discard to field at 50% HP
          const pile = battleStateRef.current[side].discard
          const candidates = pile.filter(c => c.type === 'character' && c.faction === 'body')
          const field = battleStateRef.current[side].field
          const emptySlot = field.findIndex(c => !c || c.currentHp <= 0)
          if (candidates.length > 0 && emptySlot >= 0) {
            const chosen = candidates[candidates.length - 1]
            const revived = makeFieldCard(chosen)
            revived.currentHp = Math.round(revived.maxHp * 0.5)
            friendlySetter(prev => {
              const next = [...prev]
              next[emptySlot] = revived
              return next
            })
            dispatch({ type: 'MARK_SUMMONED', side, uid: revived.uid })
            dispatch({ type: 'DISCARD_REMOVE_UID', side, uid: chosen.uid })
            addLog(`💫 ${card.name}：${chosen.name} 从弃牌堆复活到战场！(50% HP)`)
          } else {
            addLog(`✨ ${card.name}：无法复活（没有候选或战场已满）`)
          }
        } else if (target === 'one_ally_pathogen_mutate') {
          // Mutate: ATK ×1.5, HP ×0.5 (permanent)
          const field = battleStateRef.current[side].field
          const pathAlive = field.filter(c => c && c.currentHp > 0 && c.faction === 'pathogen')
          if (pathAlive.length > 0) {
            const chosen = pathAlive[Math.floor(Math.random() * pathAlive.length)]
            friendlySetter(prev => prev.map(c => {
              if (!c || c.uid !== chosen.uid) return c
              const newAtk = Math.ceil(c.atk * 1.5 / 500) * 500
              const newHp = Math.floor(c.currentHp * 0.5 / 500) * 500
              return { ...c, atk: newAtk, currentHp: Math.max(500, newHp), maxHp: Math.max(500, Math.floor(c.maxHp * 0.5 / 500) * 500) }
            }))
            addLog(`🧬 ${card.name}：${chosen.name} ATK ×1.5, HP ×0.5！突变！`)
          }
        } else if (target === 'one_ally_pathogen_immune_tech') {
          // Immune to tech for 1 turn
          const field = battleStateRef.current[side].field
          const pathAlive = field.filter(c => c && c.currentHp > 0 && c.faction === 'pathogen')
          if (pathAlive.length > 0) {
            const chosen = pathAlive[Math.floor(Math.random() * pathAlive.length)]
            friendlySetter(prev => prev.map(c => {
              if (!c || c.uid !== chosen.uid) return c
              const statuses = c.statuses ? [...c.statuses] : []
              statuses.push({ type: 'immune_tech', turnsLeft: 1 })
              return { ...c, statuses }
            }))
            addLog(`🛡️ ${card.name}：${chosen.name} 获得1回合科技系免疫！`)
          }
        } else if (target === 'all_friendly_buff_and_powerbank') {
          // ATK +2000 to all + Power Bank +5（持续 N 回合，加 atk_boost status）
          const turns = card.effectTurns || 2
          friendlySetter(prev => prev.map(c => {
            if (!c || c.currentHp <= 0) return c
            const statuses = c.statuses ? [...c.statuses] : []
            statuses.push({
              type: 'atk_boost',
              amount: card.effectValue,
              turnsLeft: turns,
              source: card.id,
            })
            return { ...c, atk: c.atk + card.effectValue, statuses }
          }))
          dispatch({ type: 'POWERBANK_ADD', side, amount: 5 })
          addLog(`✨ ${card.name}：全队 ATK +${card.effectValue}（持续${turns}回合），Power Bank +5！`)
        }
        return { success: true }
      }
      default:
        addLog(`✨ ${card.name} 效果生效！`)
        return { success: true }
    }
  }

  // ----------------------------------------------------------------
  //  SP 召唤规则匹配
  //  getEligibleSpCards → 可召唤的 SP 列表（薄封装，保持原签名）
  //  getSpSummonOutcome → 同一判定 + **为什么召不出**（给玩家反馈用，见 playEventCard）
  // ----------------------------------------------------------------
  function getEligibleSpCards(summonRule, side, remainingEnergy = 0) {
    return getSpSummonOutcome(summonRule, side, remainingEnergy).eligible
  }

  /**
   * @returns {{ eligible: object[], reason: null|'no_field_slot'|'no_deck'|'no_match'|'turn_gate', soonestTurn?: number }}
   *   reason 仅在 eligible 为空时有意义。turn_gate 时附 soonestTurn（最早能召出来的回合）。
   */
  function getSpSummonOutcome(summonRule, side, remainingEnergy = 0) {
    const spDeck = side === 'player' ? playerSpDeckRef.current : enemySpDeckRef.current
    const discardPile = battleStateRef.current[side].discard
    const field = side === 'player' ? battleStateRef.current.player.field : battleStateRef.current.enemy.field

    // 场上必须有空位
    const hasEmpty = field.some(c => !c || c.currentHp <= 0)
    if (!hasEmpty) return { eligible: [], reason: 'no_field_slot' }

    if (!summonRule || spDeck.length === 0) return { eligible: [], reason: 'no_deck' }

    let candidates = []
    switch (summonRule.type) {
      case 'auto':
        // Phase B 三条件自动触发：阵营不限、费用不限，仍受下方回合门槛过滤
        candidates = spDeck.filter(sp => sp.spCost <= (summonRule.maxCost || 99))
        break
      case 'cost_limit':
        candidates = spDeck.filter(sp => sp.spCost <= summonRule.maxCost)
        break
      case 'spend_all_energy':
        // After spending all remaining energy, match spCost <= that amount
        candidates = spDeck.filter(sp => sp.spCost <= remainingEnergy)
        break
      case 'faction_only': {
        const faction = summonRule.factionLimit
        candidates = spDeck.filter(sp => sp.faction === faction && sp.spCost <= (summonRule.maxCost || 99))
        break
      }
      case 'discard_check': {
        const markers = getFactionMarkers(discardPile)
        const needed = summonRule.discardCount || 0
        const faction = summonRule.discardFaction
        if (markers[faction] >= needed) {
          candidates = spDeck.filter(sp => sp.spCost <= (summonRule.maxCost || 99))
        }
        break
      }
      default:
        break
    }
    if (candidates.length === 0) return { eligible: [], reason: 'no_match' }

    // 召唤回合门槛（看费用）：turn ≥ max(SP_SUMMON_MIN_TURN, spCost − SP_SUMMON_COST_OFFSET)，
    // 见 deckRules.spEarliestSummonTurn（当前 = max(4, spCost−2)：5/6费→T4 · 7→T5 · 8→T6 · 9→T7 · 10→T8）。
    // 既挡早期抢召，又拦"低费事件卡秒召高费巨兽"。与 SP 卡面显示同一公式。
    const turn = battleStateRef.current.turn
    const eligible = candidates.filter(sp => turn >= spEarliestSummonTurn(sp.spCost))
    if (eligible.length > 0) return { eligible, reason: null }

    // 有匹配的 SP、但回合没到 —— 必须让调用方能告诉玩家还要等几回合。
    // 旧版这里直接返回空数组，playEventCard 没有 else 分支 → 能量扣了、卡进弃牌堆了、
    // 一句提示都没有（对 7 岁玩家 = 游戏骗了他）。
    const soonestTurn = Math.min(...candidates.map(sp => spEarliestSummonTurn(sp.spCost)))
    return { eligible: [], reason: 'turn_gate', soonestTurn }
  }

  // ----------------------------------------------------------------
  //  SP 卡召唤到战场
  // ----------------------------------------------------------------
  const summonSpCard = useCallback((spCard, side) => {
    const oppSide = side === 'player' ? 'enemy' : 'player'   // E5c-5：field 读走 battleStateRef
    const setter = side === 'player' ? setPlayerField : setEnemyField
    const setSpDeck = side === 'player' ? setPlayerSpDeck : setEnemySpDeck

    const field = battleStateRef.current[side].field
    const emptySlot = field.findIndex(c => !c || c.currentHp <= 0)
    if (emptySlot < 0) return null

    const fieldCard = makeFieldCard(spCard)

    // Remove from SP deck
    setSpDeck(prev => {
      const idx = prev.findIndex(c => c.uid === spCard.uid)
      if (idx === -1) return prev
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })

    // Place on field
    setter(prev => {
      const next = [...prev]
      next[emptySlot] = fieldCard
      return next
    })

    // SP cards with Swift Attack can attack immediately, otherwise summoning sickness
    // Sprint 27: Swift Attack / Silent Dive / swift_boost status 都跳过召唤疲劳
    const hasSwift = spCard.skills?.some(s => s.nameEn === 'Swift Attack' || s.nameEn === 'Silent Dive')
      || fieldCard.statuses?.some(s => s.type === 'swift_boost')
    if (!hasSwift) {
      dispatch({ type: 'MARK_SUMMONED', side, uid: fieldCard.uid })
    }

    addLog(`🌟 SP 觉醒！${spCard.name} 降临战场！`)
    if (side === 'player') battleStatsRef.current.spSummons++

    // Execute onPlay skills
    const friendlySetter = side === 'player' ? setPlayerField : setEnemyField
    const enemySetter = side === 'player' ? setEnemyField : setPlayerField
    const friendlyFieldCards = battleStateRef.current[side].field.filter(Boolean)
    const enemyFieldCards = battleStateRef.current[oppSide].field.filter(Boolean)

    const playEvents = triggerSkills('onPlay', {
      card: fieldCard,
      friendlyField: friendlyFieldCards,
      enemyField: enemyFieldCards,
      playerHand: side === 'player' ? handsRef.current.playerHand : handsRef.current.enemyHand,
      enemyHand: side === 'player' ? handsRef.current.enemyHand : handsRef.current.playerHand,
      discardPile: battleStateRef.current[side].discard,
      turn,
    })
    applySkillEvents(playEvents, friendlySetter, enemySetter, side)
    for (const evt of playEvents) {
      if (evt.message) addLog(`🌟 ${evt.message}`)
    }
    pushSkillEvents(playEvents)

    // Special SP skills that need manual handling
    // SP2 World Tree: Power Bank repair
    if (spCard.id === 'sp_world_tree') {
      // Heal all friendly 3000 HP
      friendlySetter(prev => prev.map(c => {
        if (!c || c.currentHp <= 0) return c
        return { ...c, currentHp: Math.min(c.maxHp, c.currentHp + 3000) }
      }))
      // Repair Power Bank
      if (!battleStateRef.current[side].powerBank.intact) {
        dispatch({ type: 'POWERBANK_SET', side, powerBank: { stored: 0, intact: true } })
        addLog(`🌳 世界树修复了 Power Bank！`)
      }
      addLog(`🌳 世界树：所有友方卡回复 3000 HP！`)
    }

    // SP1 T-Rex: AOE 3000 damage
    if (spCard.id === 'sp_trex') {
      enemySetter(prev => prev.map(c => {
        if (!c || c.currentHp <= 0) return c
        return { ...c, currentHp: Math.max(0, c.currentHp - 3000) }
      }))
      addLog(`🦖 霸王龙：灭世咆哮！对所有敌方卡造成 3000 伤害！`)
    }

    // SP3 CAR-T: Destroy one pathogen
    if (spCard.id === 'sp_car_t_cell') {
      const eField = battleStateRef.current[oppSide].field
      const pathogen = eField.find(c => c && c.currentHp > 0 && c.faction === 'pathogen')
      if (pathogen) {
        enemySetter(prev => prev.map(c => {
          if (!c || c.uid !== pathogen.uid) return c
          return { ...c, currentHp: 0 }
        }))
        addLog(`🎯 CAR-T细胞：精准猎杀 ${pathogen.name}！`)
      }
    }

    // SP4 Brain: Reveal hand + swift for all (simplified: just ATK buff)
    if (spCard.id === 'sp_brain_awakening') {
      addLog(`🧠 大脑觉醒：揭示对方手牌，全队获得迅击！`)
      // Give swift to all friendly for 1 turn (simplified: clear summon sickness)
      const fField = battleStateRef.current[side].field
      fField.forEach(c => {
        if (c && c.currentHp > 0) {
          dispatch({ type: 'UNMARK_SUMMONED', side, uid: c.uid })
        }
      })
    }

    // SP5 Super Bacteria: Remove shields, debuff tech
    if (spCard.id === 'sp_super_bacteria') {
      enemySetter(prev => prev.map(c => {
        if (!c || c.currentHp <= 0) return c
        const statuses = (c.statuses || []).filter(s => s.type !== 'shield')
        const newAtk = c.faction === 'tech' ? Math.floor(c.atk * 0.5) : c.atk
        return { ...c, statuses, atk: newAtk }
      }))
      addLog(`🦠 超级细菌：摧毁所有敌方护盾，科技系 ATK -50%！`)
      // 自身获得 immune_tech（抗药免疫：免疫科技系伤害）
      friendlySetter(prev => prev.map(c => {
        if (!c || c.id !== 'sp_super_bacteria') return c
        const statuses = c.statuses ? [...c.statuses] : []
        statuses.push({ type: 'immune_tech', turnsLeft: 99 })
        return { ...c, statuses }
      }))
      addLog(`🦠 超级细菌：抗药免疫激活！免疫科技系伤害！`)
    }

    // SP6 Ancient Virus: 5000 damage to leader
    if (spCard.id === 'sp_ancient_virus') {
      const oppSide = side === 'player' ? 'enemy' : 'player'
      dispatch({ type: 'LEADER_DAMAGE', side: oppSide, amount: 5000 })
      if (Math.max(0, battleStateRef.current[oppSide].leaderHp - 5000) <= 0) { dispatch({ type: 'GAME_OVER', winner: side }) }
      addLog(`🧊 远古病毒：冰封释放！对敌方主人造成 5000 伤害！`)
    }

    // SP7 Nanobot: Clear debuffs + 2000 shield to all
    if (spCard.id === 'sp_nanobot') {
      friendlySetter(prev => prev.map(c => {
        if (!c || c.currentHp <= 0) return c
        const statuses = (c.statuses || []).filter(s => s.type === 'shield') // keep shields, remove everything else
        statuses.push({ type: 'shield', amount: 2000, source: 'SP纳米机器人' })
        return { ...c, statuses }
      }))
      addLog(`🤖 纳米机器人：清除负面状态，全队获得 2000 护盾！`)
    }

    // SP8 CRISPR: Swap ATK/HP of one enemy (pick highest ATK)
    if (spCard.id === 'sp_crispr') {
      const eField = battleStateRef.current[oppSide].field
      const alive = eField.filter(c => c && c.currentHp > 0)
      if (alive.length > 0) {
        const target = alive.reduce((max, c) => c.atk > max.atk ? c : max, alive[0])
        enemySetter(prev => prev.map(c => {
          if (!c || c.uid !== target.uid) return c
          return { ...c, atk: c.currentHp, currentHp: c.atk, maxHp: c.atk }
        }))
        addLog(`✂️ CRISPR：${target.name} 的 ATK 和 HP 互换！`)
      }
    }

    // Cleanup dead cards from onPlay effects

    return { slot: emptySlot, card: fieldCard }
  }, [addLog, pushSkillEvents])

  // ----------------------------------------------------------------
  //  玩家出事件卡
  // ----------------------------------------------------------------
  // ★ 读值走 battleStateRef，不读渲染闭包（S0 收口）
  /**
   * 「翻出 N 张合格 SP → 选 1 张召唤」——**决策**部分。规则部分（谁合格、够不够回合、
   * 有没有空位）在 getSpSummonOutcome 里，两侧共用、已经对称。
   *
   * ⚠️ **这是引擎里唯一一处「谁来选」的合法分叉**，因为它背后是一个真实的、今天消不掉的
   *   不对称：**玩家的选择是异步的（弹窗等点击），AI 的是同步的**。把敌方也改成异步会撞上
   *   useAITurn 的 IIFE 闭包看不见 useState 更新的问题（pendingSpSummonRef 也不在 latest 上）。
   *   所以这个分叉留着 —— 但它现在是**具名的、被解释过的**，而不是埋在 playEventCard /
   *   tryTriggerSp 函数中段的两个 if。AI 的**人格**（挑 spCost 最高 / 20% 忘记）已经搬去
   *   engine/aiTarget.js 的 pickAiSpCard，引擎不再知道那些事。
   *   PvP 里 guest 的真实选择权需要一个可中断的两趟协议 —— 那是 PvP 层的活。
   */
  // ⚠️ 日志归调用方，本函数只负责路由 —— 两个触发点（事件卡 / 门控条件）的文案本来就不同
  //   （「可以召唤 SP 卡！选择一张...」vs「SP 觉醒条件达成！翻开 N 张...」），
  //   把日志塞进来会让 tryTriggerSp 打出两条。
  const resolveSpChoice = useCallback((side, candidates, rule) => {
    if (side === 'player') {
      // 玩家：交给 UI（BattleScreen 的弹窗只认 side==='player'，见其注释）
      setPendingSpSummon({ side, candidates, rule })
      return
    }
    // AI：同步决策（人格住 engine/aiTarget.js）
    const chosen = pickAiSpCard(candidates)
    if (chosen) summonSpCard(chosen, side)
    else addLog(`🔴 敌方没有触发 SP 召唤`)
  }, [addLog, summonSpCard])

  /**
   * 出事件卡。**唯一的一条路（S6 de-fork）** —— 玩家与 AI/guest 共用。
   *
   * 此前 aiPlayEventCard 是另一份实现，差异有三：
   *   ① **零 gate**（不查 phase、不查能量）
   *   ② 用 `getEligibleSpCards`（丢掉 reason）而非 `getSpSummonOutcome` → **敌方召不出 SP 时
   *      静默**。玩家侧那几条「SP 无法召唤：战场已满 / 还差 N 回合」的解释性日志，注释里
   *      写明了没有它「七岁孩子只会觉得游戏吞了他的卡」—— 敌方一侧从来没有这些日志。
   *      统一后敌方也有了（带 🔴 前缀）：对齐齐来说，这是第一次能看懂 AI 为什么没放大招。
   *   ③ 「选哪张 SP」的 AI 人格（20% 忘记 + 挑 spCost 最高）**内联在引擎里** —— 已搬去
   *      engine/aiTarget.js 的 pickAiSpCard（人格归 AI 模块，规则留引擎）。
   *
   * @param {Object} card
   * @param {Object} [opts] - 透传给 executeEventEffect（如 drawCards）
   * @param {'player'|'enemy'} [side='player']
   */
  const playEventCard = useCallback((card, opts = {}, side = 'player') => {
    const prefix = side === 'player' ? '' : '🔴 '
    // gate：事件卡不占战场位 → 只查「轮到我 + 出牌阶段 + 能量够」（不走 canPlayCard，
    // 那个还要查 slot/阵营需求）。语义与 rules.canPlayCard 的前两道一致。
    if (battleStateRef.current.activeSide !== side || battleStateRef.current[side].phase !== 'main') {
      return { ok: false, reason: 'phase', msg: '现在不能出牌' }
    }
    if (card.cost > battleStateRef.current[side].energy) {
      return { ok: false, reason: 'energy', msg: `能量不足（需要 ${card.cost}）` }
    }

    // 1. Deduct energy
    dispatch({ type: 'ENERGY_SPEND', side, cost: card.cost })

    // 2. Execute effect
    executeEventEffect(card, side, opts)
    // 事件卡 AOE（全球大流行/感染爆发等）可能击杀卡 → 清理 + 触发其 onDeath。

    // 3. Card goes to discard pile
    dispatch({ type: 'DISCARD_ADD', side, cards: [card] })
    addLog(`${prefix}📜 事件卡 ${card.name} 进入弃牌堆`)

    // 4. Check SP summon
    let spCandidates = []
    if (card.spSummonRule) {
      let remainEnergy = battleStateRef.current[side].energy
      if (card.spSummonRule.type === 'spend_all_energy') {
        remainEnergy = battleStateRef.current[side].energy
        dispatch({ type: 'ENERGY_SET', side, value: 0 })
        addLog(`${prefix}⚡ 消耗所有剩余能量 ${remainEnergy} 点！`)
      }
      // ★ 两侧都走 getSpSummonOutcome —— 敌方此前用 getEligibleSpCards，丢掉了 reason。
      const outcome = getSpSummonOutcome(card.spSummonRule, side, remainEnergy)
      spCandidates = outcome.eligible
      if (spCandidates.length > 0) {
        if (side === 'player') addLog(`🌟 可以召唤 SP 卡！选择一张...`)
        resolveSpChoice(side, spCandidates, card.spSummonRule)
      } else {
        // ★ 召不出来时必须说清为什么。旧版玩家侧才有这段；敌方侧什么都不做 ——
        //   能量扣了、卡进弃牌堆了、SP 没出来、也没有任何提示。
        //   （玩家侧的原注释：没有它「玩家尤其 7 岁的只会觉得游戏吞了他的卡」。
        //     对敌方同样成立，只是被吞的是"AI 为什么没放大招"这个解释。）
        switch (outcome.reason) {
          case 'turn_gate': {
            const wait = outcome.soonestTurn - battleStateRef.current.turn
            addLog(`${prefix}⏳ SP 还不能召唤 —— 最早要到第 ${outcome.soonestTurn} 回合（还差 ${wait} 回合）`)
            break
          }
          case 'no_field_slot':
            addLog(`${prefix}🌟 SP 无法召唤：战场已满，先腾出一个位置`)
            break
          case 'no_match':
            addLog(`${prefix}🌟 SP 无法召唤：SP 卡组里没有符合这张事件卡条件的卡`)
            break
          case 'no_deck':
            addLog(`${prefix}🌟 SP 无法召唤：SP 卡组已空`)
            break
          default:
            break
        }
      }
    }

    return { ok: true, spCandidates }
  }, [addLog, resolveSpChoice])


  // ----------------------------------------------------------------
  //  确认 SP 召唤选择（玩家 UI 回调）
  // ----------------------------------------------------------------
  const confirmSpSummon = useCallback((spCard) => {
    if (!pendingSpSummon) return
    summonSpCard(spCard, pendingSpSummon.side)
    setPendingSpSummon(null)
  }, [pendingSpSummon, summonSpCard])

  const cancelSpSummon = useCallback(() => {
    setPendingSpSummon(null)
    addLog('跳过 SP 召唤')
  }, [addLog])

  // ----------------------------------------------------------------
  //  Phase B: SP 自动触发公共入口（reason 统一 'gated'，去重键 `${side}:gated` → 每侧本局一次）
  //  触发谓词：第8回合"开闸"门槛 AND 软条件——
  //    · 玩家 = turn≥8 AND（连对2题 OR 主人HP≤50%）
  //    · 敌方 = turn≥8 AND 主人HP≤50%（AI 不答题，无 quiz 那半）
  //  谓词可能在 quiz/HP/回合 三个事件点之一变真，故三处都调本入口，去重保证只召一次。
  //  复用事件卡管线：玩家 → setPendingSpSummon 弹「翻牌选1」；敌方 → 直接召唤。
  //  「翻2选1」：从合格候选里随机翻 2 张。每条件本局只触发一次（spTriggeredRef 去重）。
  // ----------------------------------------------------------------
  const tryTriggerSp = useCallback((side, reason) => {
    const key = `${side}:${reason}`
    if (spTriggeredRef.current.has(key)) return
    // 玩家侧：已有待选弹窗（事件卡/其它条件）时不重复弹，避免双触发
    if (side === 'player' && pendingSpSummonRef.current) return

    const candidates = getEligibleSpCards({ type: 'auto' }, side)
    if (candidates.length === 0) return // 无空位 / 无够回合的 SP → 不消耗触发资格

    spTriggeredRef.current.add(key)

    // 随机翻 2 张（候选不足 2 则全给）
    const pool = [...candidates]
    const picks = []
    while (picks.length < 2 && pool.length > 0) {
      const i = Math.floor(Math.random() * pool.length)
      picks.push(pool.splice(i, 1)[0])
    }

    // ★ S6 de-fork：这里此前是 `if (side === 'player') setPendingSpSummon(...) else
    //   { picks.reduce(spCost 最高); summonSpCard(chosen, 'enemy') }` —— **门控路径上的真 fork**
    //   （turn≥8 + HP≤50%）。设计评审里有人断言「tryTriggerSp 已带 side 参数 → 不用动」，
    //   那是事实错误：带了 side 参数不等于没有 fork，函数体里照样按 side 岔成两套逻辑。
    //   现在两侧同走 resolveSpChoice：规则一致，只有「谁来选」在那一处具名分叉。
    if (side === 'player') addLog(`🌟 SP 觉醒条件达成！翻开 ${picks.length} 张 SP，选 1 张召唤！`)
    resolveSpChoice(side, picks, { type: 'auto', reason })
  }, [addLog, resolveSpChoice])

  // ----------------------------------------------------------------
  //  环境事件 UI 回调
  // ----------------------------------------------------------------
  const dismissEnvEvent = useCallback(() => {
    const event = pendingEnvEvent
    if (!event) return
    applyEnvironmentEvent(event)
    setPendingEnvEvent(null)
  }, [pendingEnvEvent])

  // ----------------------------------------------------------------
  //  开始战斗
  // ----------------------------------------------------------------
  const startBattle = useCallback((spDecks = {}) => {
    dispatch({ type: 'TURN_SET', value: 1 })
    dispatch({ type: 'ENERGY_SET', side: 'player', value: spDecks.playerStartEnergy || 1 })   // 测试场可满能量开局
    dispatch({ type: 'ENERGY_SET', side: 'enemy', value: spDecks.enemyStartEnergy || 1 })
    dispatch({ type: 'LEADER_SET', side: 'player', value: spDecks.playerLeaderHP || LEADER_HP })
    dispatch({ type: 'LEADER_SET', side: 'enemy', value: spDecks.enemyLeaderHP || LEADER_HP })
    // Phase B：记录初始主人 HP（50% 触发阈值用）+ 清空三条件触发记录
    playerInitLeaderHpRef.current = spDecks.playerLeaderHP || LEADER_HP
    enemyInitLeaderHpRef.current = spDecks.enemyLeaderHP || LEADER_HP
    spTriggeredRef.current = new Set()
    setPlayerField(emptyField())
    setEnemyField(emptyField())
    setBattleLog(['⚔️ 战斗开始！'])
    dispatch({ type: 'WINNER_SET', winner: null })
    setSkillEvents([])
    dispatch({ type: 'POWERBANK_SET', side: 'player', powerBank: { stored: 0, intact: true } })
    dispatch({ type: 'POWERBANK_SET', side: 'enemy', powerBank: { stored: 0, intact: true } })
    dispatch({ type: 'DISCARD_SET', side: 'player', pile: [] })
    dispatch({ type: 'DISCARD_SET', side: 'enemy', pile: [] })
    // SP decks (give each card a uid)
    const pSp = (spDecks.player || []).map((c, i) => ({ ...c, uid: `sp_p_${c.id}_${i}` }))
    const eSp = (spDecks.enemy || []).map((c, i) => ({ ...c, uid: `sp_e_${c.id}_${i}` }))
    setPlayerSpDeck(pSp)
    setEnemySpDeck(eSp)
    setPendingSpSummon(null)
    setActiveEnvEvent(null)
    setPendingEnvEvent(null)
    recentEventsRef.current = []
    virusOutbreakRef.current = { playerAffected: false, enemyAffected: false, turnsLeft: 0 }
    battleStatsRef.current = { totalDamage: 0, kills: 0, quizCorrect: 0, quizTotal: 0, spSummons: 0, powerBankMax: 0, cardsPlayed: 0, eventsTriggered: 0 }
    // 开局：两侧的两种标记全清（对齐旧的两个共用 Set 各 .clear() 一次）
    for (const s of SIDES) dispatch({ type: 'MARKS_CLEAR', side: s, which: 'both' })
    quizStreakRef.current = 0
    setQuizStreak(0)
    setScientistMode({ active: false, turnsLeft: 0 })
    firstAttackDone.current = false
    lastQuizTurn.current = 0
    resetQuizHistory()
    // Boss 机制初始化
    campaignConfigRef.current = spDecks.campaignConfig || null
    bossStateRef.current = { phase: 1 }
    const mechId = spDecks.campaignConfig?.bossMechanic
    bossMechanicRef.current = mechId ? getBossMechanic(mechId) : null
    setBossMechanicEvents([])
    processedDeathsRef.current.clear() // 每局重置死亡去重集，否则重开后确定性 uid（boss_x_0 / sp_p_x_i）死卡被跳过 → 不触发亡语、不进弃牌堆、0HP 赖在场上
    // Sprint 30b: Conundrum globalEffects 初始化（必须在 makeFieldCard 调用前设置）
    globalEffectsRef.current = Array.isArray(spDecks.globalEffects) ? spDecks.globalEffects : []
    if (globalEffectsRef.current.includes('antibiotic_weakened')) {
      addLog('🦠 细菌已耐药：本局所有抗生素卡 ATK 减半')
    }
    // 关卡特殊规则初始化
    const ruleId = spDecks.campaignConfig?.stageRule
    stageRuleRef.current = ruleId ? getStageRule(ruleId) : null
    // bossPreplaced: 预置 Boss 卡到敌方场上
    if (spDecks.bossPreplaced) {
      const bossCard = makeFieldCard(spDecks.bossPreplaced)
      setEnemyField(prev => {
        const next = [...prev]
        next[0] = bossCard
        return next
      })
      // ⚠️ Boss 预置卡**加**召唤疲劳；下面的 preplaceEnemyCards **刻意不加**（见其注释）。
      //    两者语义不同，别合并 —— 无脑统一会让开局那张敌方卡回合 1 就能打脸，
      //    或抽掉 Conundrum 入侵者「立刻可攻击」的设计意图。
      dispatch({ type: 'MARK_SUMMONED', side: 'enemy', uid: bossCard.uid })
    }
    // Sprint 30b: preplaceEnemyCards (Conundrum enemyExtraTurns 等价实现)
    // 等待期间病毒扩散 → 战场上已经有 N 个敌方单位，且无召唤疲劳（可以立刻攻击）
    if (Array.isArray(spDecks.preplaceEnemyCards) && spDecks.preplaceEnemyCards.length > 0) {
      const cards = spDecks.preplaceEnemyCards.map(c => makeFieldCard(c)).filter(Boolean)
      setEnemyField(prev => {
        const next = [...prev]
        let slot = spDecks.bossPreplaced ? 1 : 0
        for (const c of cards) {
          while (slot < next.length && next[slot]) slot++
          if (slot >= next.length) break
          next[slot] = c
          slot++
        }
        return next
      })
      addLog(`🦠 等待期间，${cards.length} 个敌方单位已经入侵了战场！`)
      // 不加入 summonedThisTurn → 它们可以立刻攻击
    }
    // 测试场：直接把卡摆到双方指定格（sparse 5-array 按 index 放；不加召唤疲劳 → 可立刻攻击）。
    // 与 Conundrum 的 preplaceEnemyCards 分开，避免影响其打包/boss 偏移逻辑。
    for (const [key, setter] of [['testPlayerField', setPlayerField], ['testEnemyField', setEnemyField]]) {
      const arr = spDecks[key]
      if (Array.isArray(arr) && arr.some(Boolean)) {
        setter(prev => {
          const next = [...prev]
          for (let i = 0; i < Math.min(arr.length, next.length); i++) {
            if (arr[i]) {
              const fc = makeFieldCard(arr[i]) // 注意 makeFieldCard 会清空 statuses、但保留 skills(守护走 skills)
              if (Array.isArray(arr[i].statuses) && arr[i].statuses.length) {
                fc.statuses = arr[i].statuses.map(s => ({ ...s })) // 测试场挂的状态(护盾/标记/中毒…)补回
              }
              next[i] = fc
            }
          }
          return next
        })
      }
    }
    // 开局：玩家换牌；敌方直接 'ended'（AI 从不换牌 —— 行为与旧代码逐字节一致，
    // 旧模型下 mulligan 也是全局单相，敌方压根没有换牌的表示）。
    dispatch({ type: 'SIDE_PHASE_SET', side: 'player', phase: 'mulligan' })
    dispatch({ type: 'SIDE_PHASE_SET', side: 'enemy', phase: 'ended' })
  }, [])

  // ----------------------------------------------------------------
  //  结束换卡 → 进入出牌阶段
  // ----------------------------------------------------------------
  // ★ 读值走 battleStateRef，不读渲染闭包（S0 收口）
  const endMulligan = useCallback(() => {
    if (derivePhase(battleStateRef.current) !== 'mulligan') return
    addLog('🔵 你的回合 1（能量 1）')
    // 玩家换牌结束 → 玩家的第一个回合开始。activeSide 开局就是 'player'，这里只推进它自己的相位。
    dispatch({ type: 'SIDE_PHASE_SET', side: 'player', phase: 'main' })
  }, [addLog])

  // ----------------------------------------------------------------
  //  出牌（Main Phase）
  // ----------------------------------------------------------------
  // ★ 读值一律走 battleStateRef，不读渲染闭包（S0 收口）。此前 phase/playerEnergy 读闭包，
  //   而下面 :1667/:1673/:1686 的 discard/field 读 ref —— 同一函数两个真相源，隔了五行。
  /**
   * 触发一张卡的 onPlay 技能并把事件落地。**一份实现，两个调用方**（S4）：
   *   · playToField —— 正常出牌
   *   · preplaceCard({ triggerOnPlay: true }) —— 开局自动出牌那个作弊者
   * 抽出来是为了让第二个调用方**不必为了绕过 phase gate 而丢掉 onPlay**：
   * cost≤1 的生物卡有 24 张，其中 **11 张带 onPlay 技能**（蚂蚁「信息素召集」、
   * 血小板「凝血屏障」、红细胞「氧气输送」…），静默丢掉近一半开局卡的技能是真回归。
   *
   * @param {'player'|'enemy'} side - 出牌方
   * @param {Object} card - 原始卡（内部自己 makeFieldCard）
   * @returns {Array} playEvents
   */
  const runOnPlaySkills = useCallback((side, card) => {
    const foe = opp(side)
    const friendlySetter = side === 'player' ? setPlayerField : setEnemyField
    const enemySetter = side === 'player' ? setEnemyField : setPlayerField
    const prefix = side === 'player' ? '' : '🔴 '
    // ⚠️ ctx 里的 playerHand/enemyHand 语义是「行动方的手牌 / 对面的手牌」，不是字面的
    //   玩家/敌方 —— 沿用 aiPlayToField 既有的对调写法，别按名字直觉「修正」。
    const playEvents = triggerSkills('onPlay', {
      card: makeFieldCard(card),
      friendlyField: battleStateRef.current[side].field.filter(Boolean),
      enemyField: battleStateRef.current[foe].field.filter(Boolean),
      playerHand: side === 'player' ? handsRef.current.playerHand : handsRef.current.enemyHand,
      enemyHand: side === 'player' ? handsRef.current.enemyHand : handsRef.current.playerHand,
      discardPile: battleStateRef.current[side].discard,
      turn,
    })
    applySkillEvents(playEvents, friendlySetter, enemySetter, side)
    applyHandEvents(playEvents, side)
    for (const evt of playEvents) {
      if (evt.message) addLog(`${prefix}${evt.message}`)
    }
    // ★ 敌方此前不 push —— 于是 BattleScreen:71 的 `initiator === 'enemy'` 分支
    //   （REVEAL_HAND 弹窗 3 秒自动消失）一直是**死代码**。de-fork 激活它。
    //   安全：_initiatorSide 由 applySkillEvents 用 side 打标，敌方事件一直带着正确的
    //   标记，只是从没被推出去过。（battle.skillEvents 只被 REVEAL_HAND 监听器消费；
    //   伤害浮字走的是 playToField/attack 的**返回值**，不是这个。）
    pushSkillEvents(playEvents)
    return playEvents
  }, [addLog, pushSkillEvents])

  /**
   * 出牌到战场。**唯一的一条路（S4 de-fork）** —— 玩家与 AI/guest 共用。
   *
   * 此前是两份近重复实现，而 aiPlayToField 那份**一道检查都没有**（ARCHITECTURE.md:51
   * 点名的债）。合并一次修掉三个已验证的真 bug：
   *   ① 无条件 ENERGY_SPEND → **敌方能量可以扣成负数**（没人查 cost > energy）
   *   ② 覆盖占位者却**不送弃牌堆** → 弃牌堆是**阵营标记的真相源** → 敌方标记长期少算
   *      → 敌方的 factionRequirement 卡（SSR）打不出来
   *   ③ 无 factionRequirement 检查 → 敌方能无视需求直接摆 SSR
   *
   * @param {Object} card
   * @param {number} slotIdx
   * @param {'player'|'enemy'} [side='player'] —— 默认值让玩家调用点零改动，且侧别字面量
   *        只活在 React 外壳里、永不进 rules.js（side-blind 约定见 engine/rules.js）
   * @returns {{ok:boolean, reason?:string, msg?:string, replaced?:Object, skillEvents?:Array}}
   */
  const playToField = useCallback((card, slotIdx, side = 'player') => {
    // gate 走 engine/rules.js 的纯谓词（S1）。文案留在这里 —— 它是表现层
    // （要拼 FACTIONS 名字、将来要走 i18n），rules.js 只返回 reason code。
    const gate = canPlayCard(battleStateRef.current, side, card, slotIdx)
    if (!gate.ok) {
      return { ok: false, reason: gate.reason, msg: PLAY_REJECT_MSG[gate.reason](card) }
    }

    const foe = opp(side)
    const friendlySetter = side === 'player' ? setPlayerField : setEnemyField
    const enemySetter = side === 'player' ? setEnemyField : setPlayerField
    // 日志前缀沿用既有约定：玩家无前缀、敌方 🔴（BattleScreen 靠它区分双方叙事）
    const prefix = side === 'player' ? '' : '🔴 '

    // E5c-5：被替换下场的卡在 dispatch 前用 battleStateRef 确定性取（updater 闭包读回失效）
    const prevOccupant = battleStateRef.current[side].field[slotIdx]
    const replaced = (prevOccupant && prevOccupant.currentHp > 0) ? prevOccupant : null
    friendlySetter(prev => {
      const next = [...prev]
      next[slotIdx] = makeFieldCard(card)
      return next
    })

    dispatch({ type: 'ENERGY_SPEND', side, cost: card.cost })

    // Consume faction markers if needed
    if (card.factionRequirement?.type === 'consume') {
      const { updatedPile } = consumeFactionMarkers(
        battleStateRef.current[side].discard,
        card.factionRequirement.faction,
        card.factionRequirement.count
      )
      dispatch({ type: 'DISCARD_SET', side, pile: updatedPile })
    }

    dispatch({ type: 'MARK_SUMMONED', side, uid: card.uid })
    // ⚠️ battleStats 是**玩家的战报**（结算界面 + 成就），不是棋盘状态 → 只记玩家侧。
    //   这四处 side 守卫是 side 化的**前置**不是收尾：漏了 → AI 每出一张牌就给齐齐的
    //   cardsPlayed +1。PvP 铁律是零持久化收益，第二份 stats 没有消费者。
    if (side === 'player') battleStatsRef.current.cardsPlayed++

    // ★ 被替换的卡进弃牌堆 —— 敌方此前**没有**这一步。弃牌堆是阵营标记的真相源，
    //   所以这既是修 bug，也是**真实的平衡变化**：敌方标记不再少算 → 从没打出来过的
    //   敌方 SSR factionRequirement 卡可能开始上场（详见本函数顶部注释）。
    if (replaced) {
      addLog(`${prefix}${replaced.name} 被替换下场`)
      dispatch({ type: 'DISCARD_ADD', side, cards: [replaced] })
    }
    addLog(`${side === 'player' ? '出牌' : '🔴 敌方出牌'}：${card.name}（费用 ${card.cost}）→ 位置 ${slotIdx + 1}`)

    const playEvents = runOnPlaySkills(side, card)
    // onPlay AOE（声纳震荡/古老瘟疫等）可能击杀对方卡 → 清理 + 触发其 onDeath。

    // 关卡特殊规则：敌方出牌后触发（丛林迷雾隐身等）—— 玩家侧无对应钩子
    if (side === 'enemy' && stageRuleRef.current?.onEnemyCardPlayed) {
      const fieldCard = battleStateRef.current.enemy.field[slotIdx]
      if (fieldCard) {
        const ruleEvents = stageRuleRef.current.onEnemyCardPlayed({
          card: fieldCard,
          setEnemyField,
          addLog,
        })
        if (ruleEvents?.length > 0) {
          setBossMechanicEvents(prev => [...prev, ...ruleEvents])
        }
      }
    }

    return { ok: true, replaced, skillEvents: playEvents }
  }, [addLog, pushSkillEvents])

  // ----------------------------------------------------------------
  //  结束出牌 → 战斗阶段
  // ----------------------------------------------------------------
  /**
   * 结束出牌 → 战斗阶段。**side 参数化（S3）**。
   *
   * ⚠️ 这是 S3 的核心，也是三个设计全都踩空的地方：**敌方此前根本没有 main→battle 转移**
   *   —— 全项目唯一的 `PHASE_SET 'battle'` 就在本函数，而它是玩家专用的。
   *   所以 aiPlayToField **即使有人想查 phase 也查不了**：不存在一个「敌方的 main」可查。
   *   缺失的 gate 不是懒，是**不可表达**。
   *
   * ⚠️ 顺序铁律：**先让状态为真，再对它设卡**。S3（本 commit）只负责把敌方的相位真正
   *   驱动起来、**不设 gate**；S4/S5 才让 gate 去读它（那时条件已被满足）。反过来做 →
   *   AI 静默变哑，而 47 套测试全绿。
   *   → 因此「useAITurn 的 diff 必须是 0 行」这个诱人的验收标准是**错的**：它与 gate
   *     数学上互斥。useAITurn 必须新增这个调用。
   *
   * @param {'player'|'enemy'} [side='player'] —— 默认值让 7 个玩家调用点零改动，
   *        且字面量只活在 React 外壳里、永不进 rules.js（见 sides.js / rules.js 的 side-blind 约定）。
   */
  const endMainPhase = useCallback((side = 'player') => {
    if (battleStateRef.current.activeSide !== side) return
    if (battleStateRef.current[side].phase !== 'main') return
    // 只清行动方自己的 attacked（旧代码清的是共用 Set → 连对面的一起清了；无害但语义不清）
    dispatch({ type: 'MARKS_CLEAR', side, which: 'attacked' })
    dispatch({ type: 'SIDE_PHASE_SET', side, phase: 'battle' })
    // 日志前缀沿用既有约定：玩家无前缀、敌方 🔴（BattleScreen 靠它区分双方叙事）
    addLog(side === 'player' ? '--- ⚔️ 战斗阶段 ---' : '🔴 --- 敌方攻击 ---')
  }, [addLog])

  // ----------------------------------------------------------------
  //  某张卡能否攻击
  // ----------------------------------------------------------------
  // ⚠️ canAttack 与本文件其它回调不同：它是**渲染期读取**（BattleScreen.jsx:990/:992 在
  //    .map() 里直接调用，决定卡牌能否点/是否显示召唤疲劳），不是事件回调。改读 ref 仍安全：
  //    useLatestRef 在 render 期间赋值（不是 effect），且发生在 useBattle 体内、早于
  //    BattleScreen 渲染卡牌 → 渲染时 ref.current 已是本次渲染的 battleState。
  //    deps 空数组不会让 UI 卡住：场面变化时 BattleScreen 因读 battle.playerField 而重渲，
  //    那两处调用随之重新执行。已核实它没有被塞进任何 useMemo 的 deps（若将来有人这么做，
  //    稳定身份会让 memo 永不重算 → 卡牌永远灰着）。
  const canAttack = useCallback((slotIdx) => {
    // 与 attack 同一个谓词（S1）—— 此前两处各写一遍 phase/空位/canCardAttack，
    // 是「UI 说能点、引擎说不行」这类不一致的温床。
    return canAttackFrom(battleStateRef.current, 'player', slotIdx, {
      summonedThisTurn: battleStateRef.current.player.summoned,
      attackedThisTurn: battleStateRef.current.player.attacked,
    }).ok
  }, [])

  // ----------------------------------------------------------------
  //  玩家攻击
  //  defSlot: 0-4 打卡，-1 直攻主人
  // ----------------------------------------------------------------
  // 决策E3：把「卡打卡结算结果落到双方场（扣血+护盾状态扣减）+ 护盾/战斗日志」抽成共享。
  // attack/aiAttack 这段原本逐字节重复，只差 def/atk 用哪个 setter、日志前缀（AI 加 🔴）。
  // 击杀判定仍在 setState 闭包内读 prev（时序语义不变），通过返回值传回。整段行为与原内联等价。
  function applyCombatOutcome({ defSetter, atkSetter, defSlot, atkSlot, defCard, atkCard, mods, outcome, prefix }) {
    const { atkDmg, defDmg, defActualDmg, atkActualDmg, defShieldAbsorbed, atkShieldAbsorbed } = outcome
    const defShield = mods.ignoreShield ? null : defCard.statuses?.find(s => s.type === 'shield')
    const atkShield = atkCard.statuses?.find(s => s.type === 'shield')
    // E5c-5：击杀判定确定性算（field 走 dispatch、reducer 不 eager → 不能再靠 updater 闭包读回）。
    //   defActualDmg/atkActualDmg 已净护盾吸收（combat.js），故用「战前 HP − 实际伤害 ≤0」。
    //   （旧 eager 闭包在 applySkillEvents 已改场时本就 deferred=false、best-effort；死卡最终仍由
    //    提交后 useEffect 扫 currentHp≤0 权威清理，defKilled 仅供 onKill/stats/日志）。
    const defKilled = Math.max(0, defCard.currentHp - defActualDmg) <= 0
    const atkKilled = Math.max(0, atkCard.currentHp - atkActualDmg) <= 0
    defSetter(prev => {
      const next = prev.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses.map(s => ({ ...s }))] : [] } : null)
      if (next[defSlot]) {
        if (defShield) applyShieldAbsorb(next[defSlot], atkDmg)
        next[defSlot].currentHp = Math.max(0, next[defSlot].currentHp - defActualDmg)
      }
      return next
    })
    atkSetter(prev => {
      const next = prev.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses.map(s => ({ ...s }))] : [] } : null)
      if (next[atkSlot]) {
        if (atkShield) applyShieldAbsorb(next[atkSlot], defDmg)
        next[atkSlot].currentHp = Math.max(0, next[atkSlot].currentHp - atkActualDmg)
      }
      return next
    })
    if (defShieldAbsorbed > 0) addLog(`🛡️ ${defCard.name} 护盾吸收 ${defShieldAbsorbed} 伤害！`)
    if (atkShieldAbsorbed > 0) addLog(`🛡️ ${atkCard.name} 护盾吸收 ${atkShieldAbsorbed} 伤害！`)
    addLog(
      `${prefix}${atkCard.name} ⚔️ ${defCard.name}：造成 ${atkDmg}，受反击 ${defDmg}` +
      (defKilled ? ` → ${defCard.name} 被击败！` : '') +
      (atkKilled ? ` → ${atkCard.name} 也倒下了！` : '')
    )
    return { defKilled, atkKilled }
  }

  // ★ 读值一律走 battleStateRef，不读渲染闭包（S0 收口，见文件顶部「读值真相源」注释）。
  //   本函数此前是混合读法：phase/playerField/enemyField 读闭包，而 :1872/:1875/:1890
  //   的 triggerSkills/resolveCardCombat 读 ref —— 同一个函数里两个真相源。
  /**
   * 攻击。**唯一的一条路（S5 de-fork）** —— 玩家与 AI/guest 共用。
   *
   * 此前 aiAttack 是另一份实现，而它**一道守护检查都没有** —— 「守护优先」是写在
   * CLAUDE.md 速查里的核心规则，AI 从第一天起就在无视它（attack 查两次：直攻主人一次、
   * 打卡一次；aiAttack 对应位置一行都没有）。「一卡一回合只能攻击一次」也只靠
   * useAITurn 那个 for 循环的形状兜着（aiAttack 传 checkAttacked:false 且从不写标记）
   * —— 而那个循环正是 PvP 要删掉的代码。这是 ARCHITECTURE.md:51 那笔债的另一半。
   *
   * @param {number} atkSlot
   * @param {number} defSlot - -1 = 直攻主人
   * @param {Object} [awakenOpts={}] - { awakened, damageMultiplier … }。**AI 此前连这个参数都没有**
   *        → guest 永远无法觉醒。统一后两侧都能带。
   * @param {'player'|'enemy'} [side='player']
   * @returns {null | {atkDmg, defDmg, defKilled, atkKilled, leaderHit, gameOver, winner?, ...}}
   *          被规则拒绝 → **null**（两侧一致；此前 AI 侧返回 {skipped:true}）
   */
  const attack = useCallback((atkSlot, defSlot, awakenOpts = {}, side = 'player') => {
    const foe = opp(side)
    const isPlayer = side === 'player'
    const prefix = isPlayer ? '' : '🔴 '
    const friendlySetter = isPlayer ? setPlayerField : setEnemyField
    const enemySetter = isPlayer ? setEnemyField : setPlayerField

    const atkCard = battleStateRef.current[side].field[atkSlot]
    // 能否攻击判定走 engine/rules.js（S1）。它内部依次查 phase → 空位 → canCardAttack。
    // ⚠️ 顺序即规则：sleep 先判、confused 的**重定向**夹在中间、fatigue/attacked 后判。
    //   confused 带副作用（随机挑友方 + 扣血）→ 不属于纯谓词 → 留在外壳，靠 reason 交错。
    const gate = canAttackFrom(battleStateRef.current, side, atkSlot, {
      summonedThisTurn: battleStateRef.current[side].summoned,
      attackedThisTurn: battleStateRef.current[side].attacked,
    })
    if (gate.reason === 'phase' || gate.reason === 'empty') return null
    if (gate.reason === 'sleep') { addLog(`${prefix}${atkCard.name} 正在沉睡中，无法攻击`); return null }
    // Sprint 26: 混乱状态 — 卡被操控，自动攻击随机友方
    if (atkCard.statuses?.some(s => s.type === 'confused')) {
      const friendlyTargets = battleStateRef.current[side].field
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => c && c.currentHp > 0 && c.uid !== atkCard.uid)
      if (friendlyTargets.length > 0) {
        const pick = friendlyTargets[Math.floor(Math.random() * friendlyTargets.length)]
        addLog(`🧠 ${prefix}${atkCard.name} 被操控了！攻击了自己人 ${pick.c.name}！`)
        const dmg = atkCard.atk
        friendlySetter(prev => {
          const next = prev.map(c => c ? { ...c } : null)
          if (next[pick.i]) next[pick.i].currentHp = Math.max(0, next[pick.i].currentHp - dmg)
          return next
        })
        // ⚠️ 行为变化：AI 的混乱卡此前**不写标记**（可以在同回合继续攻击）。统一后被标记
        //   —— 与玩家一致，也是正确的（混乱耗掉了这张卡的攻击机会）。
        dispatch({ type: 'MARK_ATTACKED', side, uid: atkCard.uid })
        return { confusedHit: true }
      }
    }
    if (gate.reason === 'fatigue') { addLog(`${prefix}${atkCard.name} 刚上场，不能攻击（召唤疲劳）`); return null }
    if (gate.reason === 'attacked') { addLog(`${prefix}${atkCard.name} 本回合已攻击过`); return null }

    // ★ 先查后标（S2）—— 目标合法性在标记**之前**判完，回滚舞蹈因此不存在。
    const targetGate = canTargetSlot(battleStateRef.current, side, atkCard, defSlot)
    if (targetGate.reason === 'empty') return null
    if (targetGate.reason === 'guard') {
      addLog(`${prefix}${defSlot === -1 ? '对方有守护卡，必须先攻击守护卡！' : '必须先攻击守护卡！'}`)
      return null
    }
    dispatch({ type: 'MARK_ATTACKED', side, uid: atkCard.uid })

    // === 直攻主人 ===
    if (defSlot === -1) {
      // onAttack 技能（Rush 等）
      const atkEvents = triggerSkills('onAttack', {
        attacker: atkCard,
        target: 'leader',
        damageMultiplier: 1,
      })
      for (const evt of atkEvents) {
        if (evt.message) addLog(`${prefix}${evt.message}`)
      }
      // 倍率读技能自己声明的 mods.damageMultiplier —— 与「打卡」路径共用 aggregateCombatMods 语义。
      // ⚠️ 旧写法 `if (evt.type === 'RUSH_BOOST') ×= 2` 只认事件 type、从不读 mods → 三张卡全错：
      //   · 手术刀·精准之刃「精准切除」只是「无视守护」、根本没声明倍率 → 白拿 ×2（11000→5500）
      //   · 猎豹·闪电猎手 / 猫头鹰·暗夜猎手 卡面写「首次攻击 ×1.5」→ 实际 ×2（10000→7500）
      // RUSH_BOOST 是个被复用的事件 type（无视守护/无视护盾/加伤都用它），拿 type 当"要翻倍"的
      // 信号从一开始就是错的：能不能加伤、加多少，只有事件自己的 mods 说了算。
      const leaderMods = aggregateCombatMods(atkEvents)
      const dmgOpts = {
        ...awakenOpts,
        damageMultiplier: (awakenOpts.damageMultiplier || 1) * leaderMods.damageMultiplier,
      }
      pushSkillEvents(atkEvents)

      const dmg = calcLeaderDamage(atkCard, dmgOpts)
      dispatch({ type: 'LEADER_DAMAGE', side: foe, amount: dmg })
      // ★ gameOver = **行动方刚赢了**（不是「本侧输了」）。gameWon/gameOver 此前是同一个
      //   概念的两个名字；唯一消费者是 useAITurn（它只调 attack(...,'enemy')，故
      //   gameOver=true 时 break 语义不变）。BattleScreen 从不读它（已 grep）。
      //   ⚠️ 若把它定义成「本侧输」，attack('enemy') 打死玩家主人时会返回 false →
      //     break 永不触发 → AI 在失败画面上继续挥砍、继续发伤害和音效。
      const gameOver = Math.max(0, battleStateRef.current[foe].leaderHp - dmg) <= 0
      if (gameOver) { dispatch({ type: 'GAME_OVER', winner: side }) }
      addLog(`${prefix}${atkCard.name} 直攻主人！造成 ${dmg} 伤害`)
      if (isPlayer) battleStatsRef.current.totalDamage += dmg
      // ⚠️ checkBossHPThreshold 硬编码读 enemy.leaderHp + setEnemyField —— 它讲的是 **Boss**
      //   （永远是敌方）。必须只在玩家打了敌方主人时触发；否则 attack('enemy') 会拿
      //   错误的主人触发 Boss 台词/阶段转换。
      if (isPlayer && !gameOver) checkBossHPThreshold()
      return { atkDmg: dmg, defDmg: 0, defKilled: false, atkKilled: false, leaderHit: true, gameOver, winner: gameOver ? side : null }
    }

    // === 打对方场上卡 ===
    // 目标合法性（空位 / 守护）已在上方标记前统一判完（S2 的「先查后标」）。
    const defCard = battleStateRef.current[foe].field[defSlot]

    // onAttack / onHit 技能（Discharge Strike 等）
    const preAtkEvents = triggerSkills('onAttack', {
      attacker: atkCard, defender: defCard, target: 'card',
      defSlot, enemyField: battleStateRef.current[foe].field,
    })
    // attackerField = 攻击者的场 → onHitCounter 据此定位攻击者 slot，反击才能落到正确目标
    const preHitEvents = triggerSkills('onHit', { attacker: atkCard, defender: defCard, attackerField: battleStateRef.current[side].field })
    const allPreEvents = [...preAtkEvents, ...preHitEvents]
    applySkillEvents(allPreEvents, friendlySetter, enemySetter, side)
    for (const evt of allPreEvents) {
      if (evt.message) addLog(`${prefix}${evt.message}`)
    }
    pushSkillEvents(allPreEvents)

    // 技能战斗修饰符（克制加倍/无视护盾/闪避/减伤）从 onAttack/onHit 事件聚合，交结算消费
    const mods = aggregateCombatMods(allPreEvents)
    const {
      atkDmg, defDmg, defActualDmg, atkActualDmg, defShieldAbsorbed, atkShieldAbsorbed,
      defImmune, atkFactionBonus, defFactionBonus, auraApplied,
    } = resolveCardCombat({
      attacker: atkCard, defender: defCard, awakenOpts, mods,
      attackerField: battleStateRef.current[side].field, defenderField: battleStateRef.current[foe].field,
    })
    // ⚠️ defImmune / auraApplied 此前**只有玩家侧记日志** —— 统一后敌方的免疫/光环也会
    //   现身。不是 bug，是敌方一直在静默地享用这些效果。
    if (defImmune) addLog(`${prefix}🛡️ ${defCard.name} 免疫了攻击！`)
    if (atkFactionBonus) addLog(`${prefix}⚡ ${atkCard.name} 克制 ${defCard.name}！伤害 +20%`)
    if (defFactionBonus) addLog(`⚡ ${defCard.name} 克制 ${atkCard.name}！反击 +20%`)
    if (auraApplied) addLog(`${prefix}🌀 光环效果生效！`)

    // 结算落地（双方场扣血 + 护盾 + 战斗日志）走共享 applyCombatOutcome（决策E3）。
    const { defKilled, atkKilled } = applyCombatOutcome({
      defSetter: enemySetter, atkSetter: friendlySetter, defSlot, atkSlot, defCard, atkCard, mods,
      outcome: { atkDmg, defDmg, defActualDmg, atkActualDmg, defShieldAbsorbed, atkShieldAbsorbed }, prefix,
    })

    // 技能后处理（Overpower / Piercing / onDeath）
    // ⚠️ AI 侧此前**丢弃**这个返回（不 pushSkillEvents）→ 敌方的压制/穿透浮字从不出现。
    //   统一后会第一次被喂进 BattleScreen 的 skillEvents effect（该 effect 只消费
    //   REVEAL_HAND，且已有 _initiatorSide==='enemy' 的 3 秒自动消失分支）。
    const postEvents = handlePostAttackSkills(atkCard, defCard, atkDmg, defKilled, side)
    pushSkillEvents(postEvents)

    // Stats tracking —— 只记玩家（battleStats 是玩家的战报，不是棋盘状态）
    if (isPlayer) {
      battleStatsRef.current.totalDamage += atkDmg
      if (defKilled) battleStatsRef.current.kills++
    }

    // 清理死亡卡牌

    return {
      atkDmg, defDmg, defKilled, atkKilled, leaderHit: false, gameOver: false, winner: null,
      atkFactionBonus, defFactionBonus, skillEvents: postEvents,
    }
    // deps 摘掉 phase/playerField/enemyField：函数体已不读它们（全走 battleStateRef）。
  }, [addLog, pushSkillEvents])

  // ----------------------------------------------------------------
  //  结束战斗阶段 → 敌方回合
  // ----------------------------------------------------------------
  // ★ 读值走 battleStateRef，不读渲染闭包（S0 收口）
  const endBattlePhase = useCallback(() => {
    if (derivePhase(battleStateRef.current) !== 'battle') return
    // 玩家回合结束时的 onTurnEnd 技能
    const endEvents = processEndOfTurnEffects('player')
    pushSkillEvents(endEvents)
    // 玩家剩余能量流入 Power Bank
    processEndPhase('player')
    addLog('--- 玩家回合结束 ---')

    // Boss onTurnEnd 钩子（玩家回合结束 = 敌方视角的回合结束）
    const boss = bossMechanicRef.current
    if (boss?.onTurnEnd) {
      const bossEvents = boss.onTurnEnd({
        enemyField: battleStateRef.current.enemy.field,
        setEnemyField,
        addLog,
      })
      if (bossEvents?.length > 0) {
        setBossMechanicEvents(prev => [...prev, ...bossEvents])
      }
    }

    // ★ 原子交接（S3）：一次 dispatch 同时写 activeSide + 两侧 phase。
    //   拆成多次 → 有一帧 activeSide 已是 enemy 而 enemy.phase 还没到 main：
    //   useAITurn 放行并置 aiRunning=true，随后 gate 全拒 → 回合永久锁死
    //   （aiRunning 只在 .finally 复位：抛错会，挂起不会）。
    dispatch({ type: 'TURN_HANDOFF', from: 'player', to: 'enemy' })
  }, [addLog, pushSkillEvents])

  // ----------------------------------------------------------------
  //  敌方回合开始：刷新能量
  // ----------------------------------------------------------------
  const beginEnemyTurn = useCallback(() => {
    const t = battleStateRef.current.turn
    let gain = Math.min(Math.ceil(t / 2) + 1, ENERGY_CAP)
    // 能量不再累积：剩余能量已流入 Power Bank，新回合只获得 gain
    dispatch({ type: 'ENERGY_SET', side: 'enemy', value: gain })
    addLog(`\n🔴 敌方回合（能量 ${gain}）`)
    // onTurnStart 技能（向日葵/线粒体充能、蚁后召唤、变形虫、肝/肾、超算）
    const tsEvents = processTurnStartEffects('enemy')
    // 充能须反映到 AI 本回合可用能量：applySkillEvents 已更新 enemyEnergy state，
    // 但 AI 出牌按本函数返回值核算，故把 ENERGY_BOOST 同步进 gain（与 state 一致，封顶 ENERGY_CAP）
    const energyBoost = tsEvents.reduce((s, e) => s + (e.type === 'ENERGY_BOOST' ? (e.amount || 0) : 0), 0)
    if (energyBoost > 0) gain = Math.min(ENERGY_CAP, gain + energyBoost)

    // Phase B：敌方第8回合"开闸"——主人HP≤50% 才召（AI 不答题，无"连对2题"那半）
    if (t >= SP_TURN_TRIGGER &&
        battleStateRef.current.enemy.leaderHp <= enemyInitLeaderHpRef.current * SP_LEADER_HP_RATIO) {
      tryTriggerSp('enemy', 'gated')
    }
    return gain
  }, [addLog, tryTriggerSp])

  // ----------------------------------------------------------------
  //  预置卡（作弊入口）—— 不是出牌，是「凭空摆一张卡上场」
  // ----------------------------------------------------------------
  /**
   * 把一张卡直接摆到场上，**绕过全部规则**（不扣能量、不查阵营需求、不触发 onPlay）。
   * 只给三个「作弊者」用：Boss 预置 / Conundrum 入侵者 / 测试场。
   *
   * ⚠️ **fatigued 必须显式传，没有默认值** —— 这三个作弊者的疲劳语义**刻意不同**：
   *   · Boss 预置        → fatigued: true （回合 1 不能直接打脸齐齐）
   *   · preplaceEnemyCards → fatigued: false（注释明写「不加入 summonedThisTurn →
   *     它们可以立刻攻击」，那是 Conundrum 入侵者的设计意图）
   *   · 测试场           → fatigued: false（「摆下的卡无召唤疲劳、可立刻攻击」）
   *   无脑合并会静默翻转其一：要么开局那张敌方卡回合 1 就能打脸，要么抽掉入侵者的设计意图。
   *
   * ⚠️ **triggerOnPlay 也必须显式传** —— 四个作弊者在这一点上也不同：
   *   · 开局自动出牌（BattleScreen 的起手 effect）→ true。它语义上**就是「敌方出了一张牌」**，
   *     只是发生在玩家的相位里、过不了 gate。cost≤1 的生物卡 24 张里 **11 张带 onPlay**，
   *     悄悄丢掉它们的技能是真回归 —— 这一点计划没标出来。
   *   · Boss 预置 / Conundrum 入侵者 / 测试场 → false（它们本来就不触发 onPlay，
   *     改成触发 = 平衡变化，不在 de-fork 的范围里）。
   *
   * @param {'player'|'enemy'} side
   * @param {Object} card - 原始卡（makeFieldCard 内部处理，uid 有兜底）
   * @param {number} slotIdx
   * @param {{fatigued: boolean, triggerOnPlay: boolean}} opts - **两个都必填**，理由见上
   */
  const preplaceCard = useCallback((side, card, slotIdx, opts) => {
    if (!opts || typeof opts.fatigued !== 'boolean' || typeof opts.triggerOnPlay !== 'boolean') {
      throw new Error('preplaceCard: opts.fatigued 与 opts.triggerOnPlay 必须显式传 —— 各作弊者语义刻意不同，不能有默认值')
    }
    const setter = side === 'player' ? setPlayerField : setEnemyField
    const fieldCard = makeFieldCard(card)
    setter(prev => {
      const next = [...prev]
      next[slotIdx] = fieldCard
      return next
    })
    if (opts.fatigued) dispatch({ type: 'MARK_SUMMONED', side, uid: fieldCard.uid })
    if (opts.triggerOnPlay) runOnPlaySkills(side, card)
    return fieldCard
  }, [runOnPlaySkills])

  // ----------------------------------------------------------------
  //  AI 攻击（单次，返回结果）

  // ----------------------------------------------------------------
  //  开始玩家新回合
  // ----------------------------------------------------------------
  function startPlayerTurn() {
    // 敌方回合结束时的 onTurnEnd 技能
    processEndOfTurnEffects('enemy')
    // 敌方剩余能量流入 Power Bank
    processEndPhase('enemy')

    const newTurn = battleStateRef.current.turn + 1
    const gain = Math.min(Math.ceil(newTurn / 2) + 1, ENERGY_CAP)
    // 能量不再累积：剩余能量已流入 Power Bank，新回合只获得 gain
    dispatch({ type: 'TURN_SET', value: newTurn })
    dispatch({ type: 'ENERGY_SET', side: 'player', value: gain })
    addLog(`\n🔵 你的回合 ${newTurn}（能量 ${gain}）`)
    // ⚠️ 两侧都清 —— beginEnemyTurn 一个都不清，敌方标记正是在这里每轮被清掉的。
    //    （多位评审曾断言「敌方 attacked 无人清理→每张敌方卡一局只能攻击一次」，实为假。）
    for (const s of SIDES) dispatch({ type: 'MARKS_CLEAR', side: s, which: 'both' })

    // onTurnStart 技能（向日葵/线粒体充能、蚁后召唤、变形虫、肝/肾、超算）
    // ⚠️ 必须在上面那句 MARKS_CLEAR **之后**：蚁后在 onTurnStart 新召唤的蚂蚁需要保留
    //    召唤疲劳（本回合不能攻击）。顺序反了 → 清理会把刚打上的疲劳标记抹掉。
    //    标记收进 reducer 后（S2）这条仍成立，但**理由变了**：不再是「clear() 同步生效」，
    //    而是 dispatch 按**入队顺序**结算 —— MARKS_CLEAR 先入队，本行触发的 MARK_SUMMONED
    //    后入队，reducer 依次跑 → 先清后标，结果与旧 Set 一致。
    //    （守卫：scripts/test-onturnstart-skills.mjs ①）
    processTurnStartEffects('player')

    // Phase B：第8回合"开闸"——此刻若已连对2题 或 主人HP≤50%（软条件 OR），立即召玩家 SP
    // （满血且没连对2题则不召；这是"撑到第8回合也不一定召"的关键判断点）
    if (newTurn >= SP_TURN_TRIGGER &&
        (quizStreakRef.current >= SP_QUIZ_STREAK ||
         battleStateRef.current.player.leaderHp <= playerInitLeaderHpRef.current * SP_LEADER_HP_RATIO)) {
      tryTriggerSp('player', 'gated')
    }

    // Boss onTurnStart 钩子（玩家新回合开始时触发）
    const boss = bossMechanicRef.current
    if (boss?.onTurnStart) {
      const config = campaignConfigRef.current
      const bossEvents = boss.onTurnStart({
        turn: newTurn,
        playerField: battleStateRef.current.player.field,
        setPlayerField,
        enemyField: battleStateRef.current.enemy.field,
        setEnemyField,
        enemyLeaderHp: battleStateRef.current.enemy.leaderHp,
        maxLeaderHP: config?.leaderHP || LEADER_HP,
        setEnemyLeaderHp,
        addLog,
        bossState: bossStateRef.current,
      })
      if (bossEvents?.length > 0) {
        setBossMechanicEvents(prev => [...prev, ...bossEvents])
      }
    }

    // 关卡特殊规则 onTurnStart
    const stageRule = stageRuleRef.current
    if (stageRule?.onTurnStart) {
      const ruleEvents = stageRule.onTurnStart({
        turn: newTurn,
        playerField: battleStateRef.current.player.field,
        setPlayerField,
        enemyField: battleStateRef.current.enemy.field,
        setEnemyField,
        playerLeaderHp: battleStateRef.current.player.leaderHp,
        setPlayerLeaderHp: setPlayerLeaderHp,
        addLog,
      })
      if (ruleEvents?.length > 0) {
        setBossMechanicEvents(prev => [...prev, ...ruleEvents])
      }
    }

    // 环境事件 tick
    tickEnvEvent()
    tickVirusOutbreak()

    // 每3回合触发新环境事件
    const envEvent = tryEnvironmentEvent(newTurn)
    if (envEvent) {
      setPendingEnvEvent(envEvent)
      // 效果在 UI 弹窗关闭后由 BattleScreen 调用 applyPendingEnvEvent
    }

    // 科学家模式倒计时
    setScientistMode(prev => {
      if (!prev.active) return prev
      const left = prev.turnsLeft - 1
      if (left <= 0) {
        addLog('🔬 科学家模式结束')
        return { active: false, turnsLeft: 0 }
      }
      return { ...prev, turnsLeft: left }
    })

    // ★ 原子交接（S3）：敌方回合结束 → 玩家新回合。理由同 endBattlePhase。
    dispatch({ type: 'TURN_HANDOFF', from: 'enemy', to: 'player' })
  }

  // ----------------------------------------------------------------
  //  问答觉醒
  // ----------------------------------------------------------------
  const tryQuiz = useCallback(() => {
    const currentTurn = battleStateRef.current.turn

    // 首次攻击必触发
    if (!firstAttackDone.current) {
      firstAttackDone.current = true
      // fall through to trigger
    } else {
      // 之后每3回合触发一次（距上次触发 >= 3 回合）
      if (currentTurn - lastQuizTurn.current < 3) return null
    }

    lastQuizTurn.current = currentTurn

    // 收集当前战场上所有卡牌的 id
    const battleCardIds = [
      ...battleStateRef.current.player.field.filter(Boolean).map(c => c.id),
      ...battleStateRef.current.enemy.field.filter(Boolean).map(c => c.id),
    ]
    const quiz = getRandomQuiz({ battleCardIds, streak: quizStreakRef.current, mode: getQuizMode() })
    setCurrentQuiz(quiz)
    return quiz
  }, [])

  const answerQuiz = useCallback((chosenIdx) => {
    if (!currentQuiz) return {}
    const correct = chosenIdx === currentQuiz.correct
    recordQuizResult(currentQuiz._qid, correct) // Leitner：答对升盒(下次隔更久)、答错回 Box1(明天再考)
    setCurrentQuiz(null)
    battleStatsRef.current.quizTotal++

    if (correct) {
      battleStatsRef.current.quizCorrect++
      quizStreakRef.current += 1
      const newStreak = quizStreakRef.current
      setQuizStreak(newStreak)
      addLog(`🌟 觉醒！ATK ×2.0！(连续答对 ${newStreak} 题)${currentQuiz.fact ? `\n📖 ${currentQuiz.fact}` : ''}`)

      // Phase B：第8回合起"开闸"，连对 ≥ SP_QUIZ_STREAK 题（软条件之一）即召玩家 SP
      // （软条件 OR：连对2题 或 主人HP≤50% 任一即可；HP 那半在 HP useEffect / 回合点）
      if (battleStateRef.current.turn >= SP_TURN_TRIGGER && newStreak >= SP_QUIZ_STREAK) {
        tryTriggerSp('player', 'gated')
      }

      // 连续答对3题 → 触发科学家模式（全队 ATK +20% 持续2回合）
      let scientistTriggered = false
      if (newStreak >= 3 && !scientistMode.active) {
        setScientistMode({ active: true, turnsLeft: 2 })
        addLog('🔬 科学家模式激活！全队 ATK +20%，持续 2 回合！')
        scientistTriggered = true
      }

      return { awakened: true, fact: currentQuiz.fact, streak: newStreak, scientistTriggered }
    }
    quizStreakRef.current = 0
    setQuizStreak(0)
    addLog(`❌ 答错了，正常攻击${currentQuiz.fact ? `\n📖 ${currentQuiz.fact}` : ''}`)
    return { fact: currentQuiz.fact, streak: 0 }
  }, [currentQuiz, addLog, scientistMode.active, tryTriggerSp])

  // ----------------------------------------------------------------
  //  Phase B 软条件：主人 HP 降至初始值的 50% 以下（监听双方 HP；阈值用各自初始 HP，
  //  campaign Boss 可能 ≠ 30000）。**第8回合前不判断**（第8回合是"开闸"门槛）。
  //  软条件 OR：HP≤50% 单独即可触发（玩家的另一软条件"连对2题"在 answerQuiz 侧）。
  // ----------------------------------------------------------------
  useEffect(() => {
    if (phase === 'init' || phase === 'mulligan' || phase === 'over') return
    if (battleStateRef.current.turn < SP_TURN_TRIGGER) return // 第8回合起才判断
    if (playerLeaderHp > 0 && playerLeaderHp <= playerInitLeaderHpRef.current * SP_LEADER_HP_RATIO) {
      tryTriggerSp('player', 'gated')
    }
    if (enemyLeaderHp > 0 && enemyLeaderHp <= enemyInitLeaderHpRef.current * SP_LEADER_HP_RATIO) {
      tryTriggerSp('enemy', 'gated')
    }
  }, [playerLeaderHp, enemyLeaderHp, phase, tryTriggerSp])

  // ----------------------------------------------------------------
  //  全局判负兜底：任一方主人 HP ≤ 0 即结算失败。覆盖 stageRule / 环境等「setter 式」
  //  扣血源——它们不走显式 GAME_OVER 分派（如 bio_alert 把玩家主人打到 0 却不判负、
  //  phase 照进 'main' 还能操作，要等下次敌方直攻才真判负）。GAME_OVER 原子设 phase:'over'，
  //  下一次渲染守卫自身早返回，幂等不重复派发；与显式伤害点的 GAME_OVER 也不冲突（先到先设）。
  // ----------------------------------------------------------------
  useEffect(() => {
    if (phase === 'init' || phase === 'mulligan' || phase === 'over') return
    if (playerLeaderHp <= 0) dispatch({ type: 'GAME_OVER', winner: 'enemy' })
    else if (enemyLeaderHp <= 0) dispatch({ type: 'GAME_OVER', winner: 'player' })
  }, [playerLeaderHp, enemyLeaderHp, phase])

  // ----------------------------------------------------------------
  //  动画控制
  // ----------------------------------------------------------------
  // setAnimating / restorePhase 已删（S3）—— 幽灵：它们曾被导出，但 grep 确认全项目
  // 零消费，且无人读 phase==='animating'。'animating' 也已从枚举移除。
  // 在状态形状迁移里驮着一个没人用的相位，是「幽灵变成承重墙」的标准剧本。

  // ----------------------------------------------------------------
  //  只读最新值快照（E5b）
  //  取代直接把原始 *Ref 泄漏给 BattleScreen / useAITurn。
  //  getter 在读取瞬间取 .current → 保留「读最新值」语义，
  //  但外部拿不到 ref 本体、无法写 .current（只读）。
  // ----------------------------------------------------------------
  const latest = {
    get playerField() { return battleStateRef.current.player.field },
    get enemyField() { return battleStateRef.current.enemy.field },
    get playerLeaderHp() { return battleStateRef.current.player.leaderHp },
    get enemyLeaderHp() { return battleStateRef.current.enemy.leaderHp },
    get enemyPowerBank() { return battleStateRef.current.enemy.powerBank },
    // S4：AI 的能量真相源。此前 useAITurn 自己维护一个局部 `remainEnergy`（第二真相源），
    // 而它**已经在漂移**：beginEnemyTurn 手工把 ENERGY_BOOST 折进返回值，
    // aiPlayEventCard 的 spend_all_energy 把引擎 energy 清零却不动 remainEnergy。
    // 一旦 gate 真的查能量（S4），AI 会在「自以为有钱」时被拒 → 出牌变少甚至归零，
    // 而且不报错。删 remainEnergy 是 S4 的**前提**，不是顺手。
    get enemyEnergy() { return battleStateRef.current.enemy.energy },
    get enemySpDeck() { return enemySpDeckRef.current },
    get enemyDiscard() { return battleStateRef.current.enemy.discard },
    get battleStats() { return battleStatsRef.current },
  }

  return {
    turn, phase, winner,
    playerEnergy, enemyEnergy,
    playerLeaderHp, enemyLeaderHp,
    playerField, enemyField,
    battleLog, currentQuiz,
    skillEvents,
    playerPowerBank, enemyPowerBank,
    playerDiscard, enemyDiscard,
    quizStreak, scientistMode,
    // SP system
    playerSpDeck, enemySpDeck, pendingSpSummon,
    // Environment events
    activeEnvEvent, pendingEnvEvent,
    // Boss mechanics
    bossMechanicEvents, setBossMechanicEvents,

    startBattle, endMulligan, startPlayerTurn,
    playToField, endMainPhase,
    canAttack, attack, endBattlePhase,
    beginEnemyTurn,             // aiPlayToField(S4) / aiAttack(S5) 已删 —— de-fork 后只剩
                                // playToField(card, slot, side) 与 attack(atk, def, opts, side)
    preplaceCard,               // 作弊入口：绕过规则凭空摆卡（Boss/入侵者/测试场/开局自动出牌）
    breakPowerBank,
    // Event + SP
    playEventCard,              // aiPlayEventCard 已删（S6 de-fork → playEventCard(card, opts, side)）
    confirmSpSummon, cancelSpSummon, summonSpCard, dismissEnvEvent,
    getEligibleSpCards,
    tryQuiz, answerQuiz,
    setPlayerField, setEnemyField, addLog,
    pushSkillEvents, clearSkillEvents,
    setHandRefs,  // Sprint 27: BattleScreen 注入手牌引用
    // 只读最新值快照（E5b）—— 取代泄漏原始 *Ref
    latest,
  }
}
