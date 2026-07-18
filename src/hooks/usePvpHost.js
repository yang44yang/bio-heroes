// usePvpHost.js —— host 侧的 PvP 适配器（PvP 第 4c 步）。
//
// host 权威：引擎（useBattle）只在 host 浏览器跑。本 hook 做三件事：
//   ① **推送**：每次 reducer 提交后 buildSync → 经 relayClient 发给 guest（「提交后的 effect 推」——
//      死亡在 attack() 返回之后才结算，同步取快照会推出带 0HP 僵尸卡的半结算棋盘）
//   ② **收 intent**：decodeIntent(raw, ENEMY) → acceptIntent 去重 → 照 useAITurn 的调用约定重放
//   ③ **敌方回合起点 bootstrap**：AI 回合的步骤 1-2（draw + beginEnemyTurn），去掉 delay ——
//      AI 的其余部分（决策）由远端真人取代
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
//   同一个 n → host 恒答 dup → 界面永久卡死。被拒的 intent 不需要重传，它需要的是结果反馈
//   （通道① 快照里棋盘没变）。
//
// ## 里程碑简化（4d「能对战」，诚实记录，后续步骤补）
//   · ring: []（浮字/日志事件环 = 4e）· guest 不换牌（同今天的 AI）· guest 的 SP 由 AI 人格
//     代选（resolveSpChoice enemy 分支现状）· guest 攻击不触发问答（同今天的 AI；抢答 = 后续）
//   · answer / mulligan / spChoose intent 到达时安静忽略（引擎侧还没有对应的 side 化入口）

import { useEffect, useRef } from 'react'
import { PLAYER, ENEMY } from '../engine/sides.js'
import { buildSync, decodeIntent, acceptIntent, mintMatchId, MSG } from '../engine/wire.js'
import { playSound } from '../audio/soundManager.js'

export function usePvpHost({ enabled, client, gameFrameRef, battle, playerHand, enemyHand }) {
  // matchId：每次挂载铸一个（PvP 对局跟着组件生命周期走；重开一局 = 重挂 = 新 g）。
  // 熵走 crypto（浏览器必有）；mintMatchId 刻意不自己调 Date.now（wire.js 的可测性纪律）。
  const gRef = useRef(null)
  if (enabled && gRef.current === null) {
    gRef.current = mintMatchId(crypto.getRandomValues(new Uint32Array(1))[0])
  }
  // guest 的 intent 去重游标（lastN）。ack = 它的当前值（消费即推进）。
  const lastNRef = useRef(0)
  // 敌方回合 bootstrap 去重（每个 enemyTurn 相位只 draw+begin 一次）
  const bootstrappedRef = useRef(false)

  // ★ 渲染期镜像最新的 battle/hands —— intent 处理器安装一次，闭包读这个 ref 拿最新值。
  //   （项目既有纪律：App.jsx:90 的 testArenaConfigRef 同款写法。）
  const latestRef = useRef(null)
  latestRef.current = { battle, playerHand, enemyHand }

  // ---- ① 推送快照（提交后的 effect）----
  // deps 含双手牌：draw/playCard 改手牌但不动 reducer 树，漏了 guest 就看不到自己的新手牌。
  useEffect(() => {
    if (!enabled || !client) return
    try {
      const sync = buildSync({
        state: battle.battleState,
        sources: {
          [PLAYER]: { hand: playerHand.hand, drawPileCount: playerHand.drawPileCount, spChoice: null },
          [ENEMY]: { hand: enemyHand.hand, drawPileCount: enemyHand.drawPileCount, spChoice: null },
        },
        ring: [],                 // 事件环 = 4e
        to: ENEMY,
        since: 0,
        ack: lastNRef.current,
        g: gRef.current,
      })
      client.send(sync)
    } catch (err) {
      // buildSync 抛错 = 公开性守门（assertPublicShape）逮住了脏状态 —— 记日志，别让它
      // 炸掉 host 的对局（守门的意义是"第 2 步的人第一次真机就炸"，不是炸玩家）。
      console.error('[pvpHost] buildSync 失败（公开性守门？）:', err)
    }
  }, [enabled, client, battle.battleState, playerHand.hand, enemyHand.hand])

  // ---- ② 收 intent → 重放 ----
  useEffect(() => {
    if (!enabled || !gameFrameRef) return
    gameFrameRef.current = (raw) => {
      // 每帧独立 try/catch：一条坏 intent 不拖垮对局（对称于中继的每消息 try/catch）
      try {
        if (raw?.t !== MSG.INTENT) return          // resume 等 = 后续步骤
        const dec = decodeIntent(raw, ENEMY)       // ☠️ seat 由座位给死：guest 永远是 enemy
        if (!dec.ok) return
        if (dec.g !== gRef.current) return         // 旧局的迟到 intent（换局判据）
        const acc = acceptIntent(lastNRef.current, dec.n)
        if (!acc.ok) return                        // dup/reset：忽略（ack 已随快照带回）
        lastNRef.current = dec.n                   // ☠️ 消费即 ack（见文件头 C-2）
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
}

// 重放一条已去重的 intent。约定逐字照抄 useAITurn（见文件头）。
function replayIntent(intent, { battle, playerHand, enemyHand }) {
  switch (intent.kind) {
    case 'play': {
      // uid 在 guest 自己的手牌（enemyHand）里找 —— 别人的 uid 天然找不到 → no-op（wire.js 裁定 B）
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
      // 被规则拒绝返回 null —— 不重试、不报错：结果反馈在快照里（guest 看到棋盘没变）
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
      // AI 步骤 5 原样：guest 回合结束 → host 玩家抽牌 + 新回合
      if (battle.phase !== 'over') {
        playerHand.draw(1)
        battle.startPlayerTurn()
        playSound('turnStart')
      }
      break
    // answer / mulligan / spChoose：里程碑后补（见文件头「里程碑简化」）。安静忽略 ——
    // ack 已推进（消费即确认），guest 不会卡在重传。
    default:
      break
  }
}
