// useGuestBattle.js —— guest 侧的「同形状 battle 适配器」（PvP 第 4d 步）。
//
// guest 是瘦客户端：不跑引擎。本 hook 返回与 useBattle **同形状**的 { battle, playerHand,
// enemyHand }，喂给同一个 BattleScreen：
//   · 数据字段 ← decodeSync 快照（host 发的已是 mirror 后的视角 → guest 的 player 就是自己，
//     BattleScreen 那几十处 battle.player* **零改动自动正确**）
//   · 变更方法 ← encodeIntent 发给 host（play/attack/endMain/endTurn/breakBank/playEvent）
//   · guest 不该做的（startBattle/beginEnemyTurn/preplaceCard/setField…）← no-op
//
// ## UI 灰显用**真谓词**：canAttack = rules.canAttackFrom 跑在快照上
//   与 host 同一套 side-blind 纯函数 —— 「UI 说能点、引擎说不行」这类不一致在结构上不存在。
//   host 仍是权威：guest 绕过灰显硬发 intent，host 的引擎照样拒。
//
// ## intent 计数器 n
//   首帧 sync 后 n = seedN(sync.ack)（协议规定，wire.js）。每发一条 n++。
//
// ## 里程碑简化（4d「能对战」，诚实记录）
//   · 浮字/战斗日志 = 4e（guest 本地 log 只有自己 addLog 的几条；伤害数字靠快照 HP 变化可见）
//   · currentQuiz=null（guest 不答题）· SP 卡组显示 0（内容不在 wire 上 —— 隐私；数量后续补）
//   · 对手手牌数显示 0（handCount 不在 SHAPES v2；上 wire 要 bump 版本 = 后续一并）
//   · 乐观返回：playToField/playEventCard 回 {ok:true} —— 真结果在下一帧快照里
//     （host 拒了 = 状态不变 = 手牌里那张卡还在，天然一致）

import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { PLAYER, ENEMY } from '../engine/sides.js'
import { derivePhase } from '../engine/battleReducer.js'
import { canAttackFrom } from '../engine/rules.js'
import { decodeSync, encodeIntent, seedN, MSG, readEvents } from '../engine/wire.js'

const noop = () => {}
const EMPTY = []
const EMPTY_STATS = { totalDamage: 0, kills: 0, quizCorrect: 0, quizTotal: 0 }

// tone（wire 的语义 token）→ UI 色 class。表现层映射住这儿，**不进协议**（wire 的裁定：
// Tailwind v4 扫全项目，class 字面量写进协议/测试会变成生产 CSS 死规则——所以映射只在 UI 层）。
const TONE_CLASS = {
  damage: 'text-red-400', heal: 'text-green-400', buff: 'text-yellow-300',
  shield: 'text-blue-400', info: 'text-cyan-400', boss: 'text-purple-400',
}

export function useGuestBattle({ client, gameFrameRef, initialSyncRef, floatBridgeRef }) {
  const [dec, setDec] = useState(() => {
    // 大厅缓存的首帧 sync（消掉「处理器装好前那帧丢了」的竞态）
    const raw = initialSyncRef?.current
    if (!raw) return null
    const d = decodeSync(raw)
    return d.ok ? d : null
  })
  const decRef = useRef(dec)
  decRef.current = dec

  const nRef = useRef(null)
  if (dec && nRef.current === null) nRef.current = seedN(dec.ack)

  const [guestLog, setGuestLog] = useState([])
  // ---- 4e：事件环消费游标（readEvents 的 lastSeen/lastG，缺口/换局语义在 wire 里）----
  const lastSeenRef = useRef(0)
  const lastGRef = useRef(null)
  // 换牌：BattleScreen 先调 playerHand.mulligan(uids) 暂存选中卡，再调 battle.endMulligan() 铸 intent。
  //   「不换」路径只调 endMulligan（不调 mulligan）→ uids 保持 [] → 发空换牌，语义正确。
  const mulliganUidsRef = useRef([])

  // 装游戏帧处理器（同 usePvpHost 的 gameFrameRef 机制）
  useEffect(() => {
    if (!gameFrameRef) return
    gameFrameRef.current = (raw) => {
      try {
        if (raw?.t !== MSG.SYNC) return
        const d = decodeSync(raw)
        if (!d.ok) return                        // 版本闸门：吃不下的快照直接拒（decodeSync 管）
        if (nRef.current === null) nRef.current = seedN(d.ack)
        setDec(d)

        // ---- 4e：事件环 → 浮字 + 日志 ----
        // 事件的 side 已被 host 侧 toViewEvent 翻成**我的视角**（我=player）。
        // resync（缺口/换局）→ render 为空 = 跳过动画直接吃快照（「环是装饰，快照是真相」）。
        const rd = readEvents(lastSeenRef.current, lastGRef.current,
          { events: d.events, ringBase: d.ringBase, g: d.g })
        lastSeenRef.current = rd.lastSeen
        lastGRef.current = rd.g
        if (rd.render.length > 0) {
          const logs = []
          for (const evt of rd.render) {
            if (evt.kind === 'float') {
              floatBridgeRef?.current?.showFloat(evt.side, evt.slot, evt.text, TONE_CLASS[evt.tone] || 'text-red-400')
            } else if (evt.kind === 'log') {
              // 观看者视角前缀：side 已翻 → player=我 🔵、enemy=对方 🔴、null=中立
              const prefix = evt.side === ENEMY ? '🔴 ' : evt.side === PLAYER ? '🔵 ' : ''
              logs.push(prefix + evt.text)
            }
            // fx / reveal / boss：里程碑暂不渲染
          }
          if (logs.length > 0) setGuestLog((p) => [...p, ...logs])
        }
      } catch (err) {
        console.error('[guestBattle] sync 处理异常:', err)
      }
    }
    return () => { gameFrameRef.current = null }
  }, [gameFrameRef, floatBridgeRef])

  const send = useCallback((kind, payload) => {
    const d = decRef.current
    if (!d || nRef.current === null) return false
    return client.send(encodeIntent(kind, payload, nRef.current++, d.g))
  }, [client])

  const addLog = useCallback((msg) => setGuestLog((p) => [...p, msg]), [])

  const battle = useMemo(() => {
    if (!dec) return null
    const s = dec.state
    return {
      battleState: s,
      turn: s.turn,
      phase: derivePhase(s),
      winner: s.winner,
      playerEnergy: s.player.energy,
      enemyEnergy: s.enemy.energy,
      playerLeaderHp: s.player.leaderHp,
      enemyLeaderHp: s.enemy.leaderHp,
      playerField: s.player.field,
      enemyField: s.enemy.field,
      battleLog: guestLog,
      currentQuiz: null,
      skillEvents: EMPTY,
      playerPowerBank: s.player.powerBank,
      enemyPowerBank: s.enemy.powerBank,
      playerDiscard: s.player.discard,
      enemyDiscard: s.enemy.discard,
      quizStreak: s.player.quizStreak,
      scientistMode: s.player.scientistMode,
      playerSpDeck: EMPTY,
      enemySpDeck: EMPTY,
      pendingSpSummon: null,
      activeEnvEvent: null,
      pendingEnvEvent: null,
      bossMechanicEvents: EMPTY,
      setBossMechanicEvents: noop,

      startBattle: noop,        // 真的对局在 host 上
      endMulligan: () => { send('mulligan', { uids: mulliganUidsRef.current }) },  // host 收后 enemyHand.mulligan + endMulligan(ENEMY)
      startPlayerTurn: noop,
      beginEnemyTurn: noop,
      preplaceCard: noop,
      setPlayerField: noop,
      setEnemyField: noop,
      setHandRefs: noop,
      confirmSpSummon: noop,
      cancelSpSummon: noop,
      summonSpCard: noop,
      dismissEnvEvent: noop,
      pushSkillEvents: noop,
      clearSkillEvents: noop,
      getEligibleSpCards: () => EMPTY,
      tryQuiz: () => null,      // guest 攻击不触发问答（里程碑；抢答 = 后续）
      answerQuiz: () => ({}),

      playToField: (card, slotIdx) => { send('play', { uid: card.uid, slot: slotIdx }); return { ok: true } },
      playEventCard: (card) => { send('playEvent', { uid: card.uid }); return { ok: true } },
      endMainPhase: () => { send('endMain', {}) },
      endBattlePhase: () => { send('endTurn', {}) },
      breakPowerBank: () => { send('breakBank', {}); return 0 },
      attack: (atkSlot, defSlot) => { send('attack', { atkSlot, defSlot }); return null },
      // ★ 真谓词跑在快照上 —— 与 host 的 useBattle.canAttack 同一个 canAttackFrom
      canAttack: (slotIdx) => canAttackFrom(s, PLAYER, slotIdx, {
        summonedThisTurn: s.player.summoned,
        attackedThisTurn: s.player.attacked,
      }).ok,

      addLog,
      latest: {
        get battleStats() { return EMPTY_STATS },
        get playerField() { return decRef.current?.state.player.field ?? EMPTY },
        get enemyField() { return decRef.current?.state.enemy.field ?? EMPTY },
        get playerLeaderHp() { return decRef.current?.state.player.leaderHp ?? 0 },
        get enemyLeaderHp() { return decRef.current?.state.enemy.leaderHp ?? 0 },
        get enemyEnergy() { return decRef.current?.state.enemy.energy ?? 0 },
        get enemyPowerBank() { return decRef.current?.state.enemy.powerBank ?? { stored: 0, intact: true } },
        get enemyDiscard() { return decRef.current?.state.enemy.discard ?? EMPTY },
        get enemySpDeck() { return EMPTY },
      },
    }
  }, [dec, guestLog, send, addLog])

  // 自己的手牌 ← 通道②（self.hand）。方法全 no-op：手牌的真相在 host，变化随快照来。
  const playerHand = useMemo(() => ({
    hand: dec?.self.hand ?? EMPTY,
    drawPile: EMPTY,
    discard: EMPTY,
    drawPileCount: dec?.self.drawPileCount ?? 0,
    initHand: noop, draw: () => EMPTY, playCard: noop, discardCard: noop,
    // 暂存选中 uid 给 endMulligan 铸 intent；返回 uids 让 BattleScreen 的「换掉 N 张」日志数目正确
    //   （真实换牌在 host 上跑，新手牌随下一帧快照回来）。
    mulligan: (uids) => { mulliganUidsRef.current = uids; return uids },
    trimHand: noop, addToHand: noop,
  }), [dec])

  // 对手手牌：内容是隐私（永不上 wire）；数量暂不可得（handCount = 后续 bump 版本一并）
  const enemyHand = useMemo(() => ({
    hand: EMPTY, drawPile: EMPTY, discard: EMPTY, drawPileCount: 0,
    initHand: noop, draw: () => EMPTY, playCard: noop, discardCard: noop,
    mulligan: noop, trimHand: noop, addToHand: noop,
  }), [])

  return { battle, playerHand, enemyHand }
}
