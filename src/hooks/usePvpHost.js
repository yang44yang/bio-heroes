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
//   · **guest 自选 SP 已接线**（2026-07-24）：候选经 self **私有**通道下发（sources[ENEMY].spChoice），
//     guest 回一条 spChoose intent → confirmSpSummon(card, ENEMY)；回合末还没选则 AI 人格兜底代选。
//     换牌 / 问答（answer）也早已接线。
//   · 对手 SP **数**仍显示 0 —— 那要进**公开树**才看得到，得 bump PROTOCOL_VERSION（同 handCount 的先例）
//   · 拒绝类反馈不进环（guest 看快照没变自然明白）· fx 事件暂不发（浮字+日志先行）

import { useEffect, useRef, useMemo, useCallback } from 'react'
import { PLAYER, ENEMY, opp } from '../engine/sides.js'
import {
  buildSync, decodeIntent, acceptIntent, mintMatchId, MSG,
  appendEvents, floatEvent, logEvent,
} from '../engine/wire.js'
import { clampCursor } from '../engine/matchSnapshot.js'
import { playSound } from '../audio/soundManager.js'
import { pickAiSpCard } from '../engine/aiTarget.js'   // guest 没选 SP 时的回合末兜底代选

export function usePvpHost({ enabled, client, gameFrameRef, battle, playerHand, enemyHand, floatBridgeRef, resumeTick = 0, adapterRef = null }) {
  const gRef = useRef(null)
  if (enabled && gRef.current === null) {
    gRef.current = mintMatchId(crypto.getRandomValues(new Uint32Array(1))[0])
  }
  const lastNRef = useRef(0)
  const bootstrappedRef = useRef(false)
  // guest 换牌只应用一次：同步 ref 守卫，免得 dispatch 异步下两条 mulligan intent（guest 双击）都读到
  //   enemy.phase 还是 'mulligan' → enemyHand 被换两次。
  const enemyMulliganedRef = useRef(false)
  // guest 那次被问答挂起的攻击（每侧一份的语义：这个 ref 天然只装 ENEMY 的，host 自己的
  // 挂起在 BattleScreen 的 awakenOpts 里）。answer intent 到达时取出来带倍率结算。
  const pendingAttackRef = useRef(null)
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
  latestRef.current = { battle: pvpBattle, playerHand, enemyHand, enemyMulliganedRef, pendingAttackRef }

  // ---- ① 推送快照（提交后的 effect；4e 起带事件环）----
  useEffect(() => {
    if (!enabled || !client) return
    try {
      const ring = ringRef.current
      const sync = buildSync({
        state: battle.battleState,
        sources: {
          // ☠️ spChoice 只装**收件人自己那一侧**的 SP 候选。host 的 pendingSpSummon 绝不能进 ENEMY 桶
          //    —— buildSync:669 会当场抛错，因为那等于在齐齐点选前把爸爸的 SP 候选剧透给他。
          //    host 是本地的、自己的候选从不上 wire，故 PLAYER 桶恒 null。
          [PLAYER]: { hand: playerHand.hand, drawPileCount: playerHand.drawPileCount, spChoice: null },
          [ENEMY]: { hand: enemyHand.hand, drawPileCount: enemyHand.drawPileCount, spChoice: battle.pendingEnemySpSummon ?? null },
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
    // ☠️ resumeTick 是**必需**的依赖，不是保险丝。
    //   断线重连前后，上面四个依赖的引用**一个都不会变**（client 是同一个闭包对象，
    //   battleState 是 useReducer 状态，两个 hand 是 useState 数组）——所以只修好握手层，
    //   effect 也不会重跑：guest 屏幕会一直冻着，直到 host 下一次真的动棋盘。
    //   大厅在 relay.resumed（自己回来）/ relay.peer-joined（对手回来）时 +1 → 强制重推一帧全量快照。
    //   sync 是全量快照而非增量，重复推是幂等的（多推一帧只是多一次同样的渲染）。
    // pendingEnemySpSummon 是**必需**依赖：SP 候选亮起/消失只改它，不动 battleState —— 漏了
    // guest 就永远等不到那个弹窗（棋盘没变 → effect 不重跑 → 候选压根不发）。
  }, [enabled, client, battle.battleState, battle.pendingEnemySpSummon, playerHand.hand, enemyHand.hand, resumeTick])

  // ---- handCount：把双方手牌张数同步进公开棋盘树 → 随快照 mirror 给 guest ----
  //   guest 的 enemyHand.hand 是空的（隐私），对手手牌数只能读这个公开字段（此前恒 0）。
  //   reducer 有 no-op bailout → 张数没变不会多推快照。
  useEffect(() => {
    if (!enabled) return
    battle.setHandCount(PLAYER, playerHand.hand.length)
    battle.setHandCount(ENEMY, enemyHand.hand.length)
  }, [enabled, battle, playerHand.hand.length, enemyHand.hand.length])

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

  // ---- 续局：适配器游标的快照 / 装载（host 自恢复；清单见 engine/matchSnapshot.js）----
  //  ☠️ 这 7 个 ref 全都「丢了棋盘上看不出异常」：
  //     · pendingAttackRef 丢 → guest 答完题回来的 answer intent 找不到挂起的攻击，**那一击凭空消失**
  //     · gRef 丢（重铸新 id）→ decodeIntent 的 `dec.g !== gRef.current` 会把 guest 在切换窗口期
  //       发出的 intent **全部丢弃**，表现是「孩子点了没反应」
  //     · enemyMulliganedRef 丢 → 一条重传的 mulligan 会让他手牌被再换一次
  //  ☠️ 两个游标只能往**小**里猜（wire.js:656 那笔血账）：lastN 恢复出比 guest 当前 n 大的值
  //     → 他点什么都被判 dup、界面永久卡死。快照是「每次推送后」存的，所以存下来的 lastN
  //     天然 ≤ 真值（偏小=安全方向），原样恢复即可；cursor 则用环里最大 seq 兜一道上界。
  if (adapterRef) {
    adapterRef.current = {
      snapshot: () => ({
        g: gRef.current,
        lastN: lastNRef.current,
        ring: ringRef.current,
        cursor: cursorRef.current,
        pendingAttack: pendingAttackRef.current,
        enemyMulliganed: enemyMulliganedRef.current,
        bootstrapped: bootstrappedRef.current,
      }),
      hydrate: (a) => {
        if (!a) return
        if (a.g) gRef.current = a.g
        lastNRef.current = clampCursor(a.lastN)
        ringRef.current = Array.isArray(a.ring) ? a.ring : []
        const maxSeq = ringRef.current.length ? ringRef.current[ringRef.current.length - 1].seq : 0
        cursorRef.current = clampCursor(a.cursor, maxSeq)
        pendingAttackRef.current = a.pendingAttack ?? null
        enemyMulliganedRef.current = !!a.enemyMulliganed
        bootstrappedRef.current = !!a.bootstrapped
      },
    }
  }

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
function replayIntent(intent, { battle, playerHand, enemyHand, enemyMulliganedRef, pendingAttackRef }) {
  switch (intent.kind) {
    case 'mulligan': {
      if (enemyMulliganedRef.current) break            // 幂等：已换过 → 忽略重复 intent（防 guest 双击双换）
      enemyMulliganedRef.current = true
      enemyHand.mulligan(intent.uids)                  // 换掉选中 uid、重洗重抽（uids=[] → useHand 里直接返回，无操作）
      battle.addLog(intent.uids.length > 0 ? `🔴 对手换了 ${intent.uids.length} 张牌` : '🔴 对手不换牌')
      battle.endMulligan(ENEMY)                         // enemy.phase: 'mulligan' → 'main'
      break
    }
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
      // ☠️ 先问「这一击要不要触发问答」——问答是 attack intent 的**服务端副作用**，
      //    由 host 权威判定（wire.js 的既有裁定）。触发了就**挂起这次攻击**，等 answer intent 到达
      //    再带着倍率结算；不触发则照旧立刻打。
      //    缺这一段，guest 永远拿不到问答 → host 答对能 ×2 而 guest 恒 ×1，是系统性不公平。
      if (battle.tryQuiz(ENEMY)) {
        pendingAttackRef.current = { atkSlot: intent.atkSlot, defSlot: intent.defSlot }
        battle.addLog('🔴 对手正在答题…')
        break
      }
      const result = battle.attack(intent.atkSlot, intent.defSlot, {}, ENEMY)
      if (result?.leaderHit) playSound('leaderHit')
      else if (result) playSound('attack')
      break
    }
    case 'answer': {
      // host 用**自己**那份答案卡判卷（guest 送来的任何倍率都被 decodeIntent 投影掉了，
      // 根本传不进来）。qid 一并交给 answerQuiz 校验，挡住重传/乱序/同题重抽造成的错算。
      const opts = battle.answerQuiz(intent.choice, ENEMY, intent.qid)
      if (opts?.stale) break                      // 过期答案：安静丢弃，不动挂起的攻击
      const pend = pendingAttackRef.current
      pendingAttackRef.current = null
      if (!pend) break                            // 没挂着攻击（不该发生）→ 判卷已记，收工
      // ★ 把判卷结果作为 awakenOpts 喂进去 —— 答对 ×2 就是在这里生效的
      const result = battle.attack(pend.atkSlot, pend.defSlot, opts?.awakened ? opts : {}, ENEMY)
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
    // guest 自选 SP：候选是 host 先发下去的那一份，这里只按 uid 在**权威候选**里找回卡对象
    // （decodeIntent 只放行 uid —— 卡内容根本传不进来，伪造不出一张场外 SP）。
    case 'spChoose': {
      const pend = battle.pendingEnemySpSummon
      if (!pend) break                                                   // 没在等选择（重传/过期）→ 忽略，ack 照常推进
      if (intent.uid === null) { battle.cancelSpSummon(ENEMY); break }   // guest 显式跳过
      const chosen = pend.candidates.find((c) => c && c.uid === intent.uid)
      if (!chosen) break                                                 // uid 不在候选里 → 忽略，弹窗留着让他重选
      battle.confirmSpSummon(chosen, ENEMY)
      playSound('spSummon')
      break
    }
    case 'endTurn':
      // ☠️ 兜底：guest 回合结束时若还挂着一次被问答暂停的攻击（正常打不出 —— 全屏问答弹窗挡着 UI，
      //    只有 buggy 客户端 / 重连竞态才会走到这），**就地以 ×1 结算并清题槽**。
      //    不做的话，那个 pendingAttackRef 会带着**过期的槽位下标**跨到下一回合、之后被一条迟到的
      //    answer 用错误的目标结算一次攻击。settle 用真 attack() —— 棋盘变了（防守方已死等）引擎自会拒。
      if (pendingAttackRef.current) {
        const pend = pendingAttackRef.current
        pendingAttackRef.current = null
        battle.attack(pend.atkSlot, pend.defSlot, {}, ENEMY)   // ×1：没答题就没有觉醒加成
        battle.clearQuiz?.(ENEMY)   // 清题槽（不是揭晓）→ guest 弹窗随下一帧快照关闭
        battle.addLog('🔴 对手没答题，攻击照常结算')
      }
      // ☠️ 同款兜底：回合末还挂着没选的 SP 候选 → 由 AI 人格代选。不做的话候选会跨回合停在那儿
      //    （且随每帧快照重发）。**代选而不是取消**：保持「触发了就一定召得出来」——
      //    与本次改动之前（敌方恒 AI 代选）行为一致，不因超时白亏掉一次触发资格。
      if (battle.pendingEnemySpSummon) {
        const pick = pickAiSpCard(battle.pendingEnemySpSummon.candidates)
        if (pick) {
          battle.confirmSpSummon(pick, ENEMY)
          battle.addLog('🔴 对手没选 SP —— 自动替他选了一张')
        } else {
          battle.cancelSpSummon(ENEMY)
        }
      }
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
