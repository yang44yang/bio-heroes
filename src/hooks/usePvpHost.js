// usePvpHost.js —— host 侧的 PvP 适配器（PvP 第 4c 步；4e 加事件环）。
//
// host 权威：引擎（useBattle）只在 host 浏览器跑。本 hook 做四件事：
//   ① **推送**：每次 reducer 提交后 buildSync → 经 relayClient 发给 guest（「提交后的 effect 推」——
//      死亡在 attack() 返回之后才结算，同步取快照会推出带 0HP 僵尸卡的半结算棋盘）
//   ② **收 intent**：decodeIntent(raw, ENEMY) → acceptIntent 去重 → 照 useAITurn 的调用约定重放
//   ③ **敌方回合起点 bootstrap**：AI 回合的步骤 1-2（draw + beginEnemyTurn），去掉 delay
//   ④ **事件环（4e）**：把 battle 包一层 —— play/attack 出结果时铸 floatEvent/logEvent 进环，
//      host 自己的动作和 guest 重放**走同一个包装** → 一条发射路径。返回包装后的 pvpBattle
//      给 BattleScreen 渲染。guest 经 readEvents 消费（边不是值：浮字用的是死前的数字）。
//
// ## ☠️ 重放约定 = 逐字照抄 useAITurn（那是今天合法执行敌方动作的唯一样板）
//   · 出牌：playToField/playEventCard 的 r.ok **之后**才 enemyHand.playCard —— 否则出牌被拒时
//     那张卡从手牌蒸发、从未上场、不进弃牌堆（S4 的血账原文）
//   · 攻击：attack(atkSlot, defSlot, {}, 'enemy')，被规则拒绝返回 null（不重试 —— 结果反馈
//     在快照里，guest 看到棋盘没变）
//   · 回合结束：playerHand.draw(1) + startPlayerTurn()（AI 步骤 5 原样）
//
// ## ☠️ ack = 消费即确认，不是「引擎已应用」（wire.js buildSync JSDoc 的 C-2 裁定）
//   attack() 有多条日常规则拒绝路径（召唤疲劳等）。若 ack 只在规则接受时推进：guest 永远重传
//   同一个 n → host 恒答 dup → 界面永久卡死。
//
// ## ☠️ since = host 自己的已发水位（cursorRef），不是 guest 报来的 lastSeen（C-2 裁定）
//   send 成功才推进游标 → 掉线期间的事件下次连上补发。事件只随状态变更产生（拒绝路径不进环）
//   → 推送 effect 的 [battleState] deps 总能把新事件捎上，无环单独变化的推送缺口。
//
// ## 里程碑简化（诚实记录，后续步骤补）
//   · guest 不换牌（同今天 AI）· guest SP 由 AI 人格代选 · guest 攻击不触发问答
//   · answer / mulligan / spChoose intent 安静忽略（ack 仍推进，guest 不卡重传）
//   · 拒绝类反馈不进环（guest 看快照没变自然明白）· fx 事件暂不发（浮字+日志先行）

import { useEffect, useRef, useMemo, useCallback } from 'react'
import { PLAYER, ENEMY, opp } from '../engine/sides.js'
import {
  buildSync, decodeIntent, acceptIntent, mintMatchId, MSG,
  appendEvents, floatEvent, logEvent,
} from '../engine/wire.js'
import { playSound } from '../audio/soundManager.js'

export function usePvpHost({ enabled, client, gameFrameRef, battle, playerHand, enemyHand, floatBridgeRef }) {
  const gRef = useRef(null)
  if (enabled && gRef.current === null) {
    gRef.current = mintMatchId(crypto.getRandomValues(new Uint32Array(1))[0])
  }
  const lastNRef = useRef(0)
  const bootstrappedRef = useRef(false)
  // ---- 4e：事件环 + 已发水位 ----
  const ringRef = useRef([])
  const cursorRef = useRef(0)

  const emitRing = useCallback((events) => {
    if (events.length === 0) return
    ringRef.current = appendEvents(ringRef.current, events)
  }, [])

  /**
   * 攻击结果 → 环事件（绝对座位；guest 侧由 buildSync 的 toViewEvent 翻）。
   * side = 攻击方。guest 发起（side===ENEMY）时顺带给 **host 自己的 UI** 放浮字 ——
   * host 是 player 座位，绝对座位即 host 视角，直接喂 showFloat。
   * （host 自己攻击的本地浮字 BattleScreen 既有代码在放，这里只进环、不重复放。）
   */
  const emitAttackEvents = useCallback((side, atkSlot, defSlot, result) => {
    if (!result) return
    const foe = opp(side)
    const evts = []
    if (result.leaderHit) {
      evts.push(floatEvent(foe, -1, `-${result.atkDmg}`, 'damage'))
    } else {
      evts.push(floatEvent(foe, defSlot, `-${result.atkDmg}`, 'damage'))
      if (result.defDmg > 0) evts.push(floatEvent(side, atkSlot, `-${result.defDmg}`, 'damage'))
    }
    emitRing(evts)
    if (side === ENEMY && floatBridgeRef?.current) {
      const f = floatBridgeRef.current
      if (result.leaderHit) f.showFloat(PLAYER, -1, `-${result.atkDmg}`, 'text-red-400')
      else {
        f.showFloat(PLAYER, defSlot, `-${result.atkDmg}`, 'text-red-400')
        if (result.defDmg > 0) f.showFloat(ENEMY, atkSlot, `-${result.defDmg}`, 'text-red-400')
      }
    }
  }, [emitRing, floatBridgeRef])

  // ---- 4e：包装 battle —— host 动作与 guest 重放同一条发射路径 ----
  const pvpBattle = useMemo(() => {
    if (!enabled) return battle
    return {
      ...battle,
      playToField: (card, slotIdx, side = PLAYER) => {
        const r = battle.playToField(card, slotIdx, side)
        if (r.ok) emitRing([logEvent(side, `出牌：${card.name}（费用 ${card.cost}）→ 位置 ${slotIdx + 1}`)])
        return r
      },
      playEventCard: (card, opts = {}, side = PLAYER) => {
        const r = battle.playEventCard(card, opts, side)
        if (r.ok) emitRing([logEvent(side, `打出事件卡：${card.name}`)])
        return r
      },
      attack: (atkSlot, defSlot, awakenOpts = {}, side = PLAYER) => {
        const result = battle.attack(atkSlot, defSlot, awakenOpts, side)
        emitAttackEvents(side, atkSlot, defSlot, result)
        return result
      },
    }
  }, [enabled, battle, emitRing, emitAttackEvents])

  // ★ 渲染期镜像最新对象 —— intent 处理器安装一次，闭包读 ref 拿最新（App.jsx:90 同款纪律）。
  //   存**包装后的** pvpBattle：guest 重放也走发射路径。
  const latestRef = useRef(null)
  latestRef.current = { battle: pvpBattle, playerHand, enemyHand }

  // ---- ① 推送快照（提交后的 effect；4e 起带事件环）----
  useEffect(() => {
    if (!enabled || !client) return
    try {
      const ring = ringRef.current
      const sync = buildSync({
        state: battle.battleState,
        sources: {
          [PLAYER]: { hand: playerHand.hand, drawPileCount: playerHand.drawPileCount, spChoice: null },
          [ENEMY]: { hand: enemyHand.hand, drawPileCount: enemyHand.drawPileCount, spChoice: null },
        },
        ring,
        to: ENEMY,
        since: cursorRef.current,       // ☠️ host 自己的已发水位（C-2），不是 guest 的 lastSeen
        ack: lastNRef.current,
        g: gRef.current,
      })
      const sent = client.send(sync)
      // send 成功才推进游标：掉线期间的事件留在窗口里，下次连上随快照补发
      if (sent && ring.length > 0) cursorRef.current = ring[ring.length - 1].seq
    } catch (err) {
      console.error('[pvpHost] buildSync 失败（公开性守门？）:', err)
    }
  }, [enabled, client, battle.battleState, playerHand.hand, enemyHand.hand])

  // ---- ② 收 intent → 重放 ----
  useEffect(() => {
    if (!enabled || !gameFrameRef) return
    gameFrameRef.current = (raw) => {
      try {
        if (raw?.t !== MSG.INTENT) return
        const dec = decodeIntent(raw, ENEMY)
        if (!dec.ok) return
        if (dec.g !== gRef.current) return
        const acc = acceptIntent(lastNRef.current, dec.n)
        if (!acc.ok) return
        lastNRef.current = dec.n                   // ☠️ 消费即 ack
        replayIntent(dec.intent, latestRef.current)
      } catch (err) {
        console.error('[pvpHost] intent 处理异常:', err)
      }
    }
    return () => { gameFrameRef.current = null }
  }, [enabled, gameFrameRef])

  // ---- ③ 敌方回合起点 bootstrap（AI 步骤 1-2，无 delay）----
  useEffect(() => {
    if (!enabled) return
    if (battle.phase !== 'enemyTurn') { bootstrappedRef.current = false; return }
    if (bootstrappedRef.current) return
    bootstrappedRef.current = true
    const { battle: b, enemyHand: eh } = latestRef.current
    const drawn = eh.draw(1)
    if (drawn.length > 0) b.addLog(`🔴 对手抽了 1 张牌`)
    b.beginEnemyTurn()
  }, [enabled, battle.phase])

  return pvpBattle
}

// 重放一条已去重的 intent。约定逐字照抄 useAITurn（见文件头）。
// battle 是**包装后的** pvpBattle → play/attack 自动进事件环 + host UI 浮字。
function replayIntent(intent, { battle, playerHand, enemyHand }) {
  switch (intent.kind) {
    case 'play': {
      const card = enemyHand.hand.find((c) => c.uid === intent.uid && c.type !== 'event')
      if (!card) return
      const r = battle.playToField(card, intent.slot, ENEMY)
      if (!r.ok) { battle.addLog(`🔴 ${card.name} 无法打出：${r.msg}`); return }
      enemyHand.playCard(card.uid)               // ☠️ 必须在 r.ok 之后（S4 手牌蒸发血账）
      playSound('cardPlay')
      break
    }
    case 'playEvent': {
      const card = enemyHand.hand.find((c) => c.uid === intent.uid && c.type === 'event')
      if (!card) return
      const r = battle.playEventCard(card, { drawCards: (n) => enemyHand.draw(n) }, ENEMY)
      if (!r.ok) { battle.addLog(`🔴 ${card.name} 无法打出：${r.msg}`); return }
      enemyHand.playCard(card.uid)
      playSound('cardPlay')
      break
    }
    case 'attack': {
      const result = battle.attack(intent.atkSlot, intent.defSlot, {}, ENEMY)
      if (result?.leaderHit) playSound('leaderHit')
      else if (result) playSound('attack')
      break
    }
    case 'endMain':
      battle.endMainPhase(ENEMY)
      break
    case 'breakBank': {
      const released = battle.breakPowerBank(ENEMY)
      battle.addLog(`🔴 💥 对手打破 Power Bank！释放 ${released} 能量！`)
      playSound('bankBreak')
      break
    }
    case 'endTurn':
      if (battle.phase !== 'over') {
        playerHand.draw(1)
        battle.startPlayerTurn()
        playSound('turnStart')
      }
      break
    default:
      break
  }
}
