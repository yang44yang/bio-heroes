import { useEffect, useRef } from 'react'
import { playSound } from '../audio/soundManager.js'
import { pickAiTarget } from '../engine/aiTarget.js'
import { MAX_FIELD_SLOTS, LEADER_HP } from '../data/deckRules.js'
import { canPlayWithMarkers } from '../utils/factionMarkers.js'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

// ================================================================
//  敌方 AI 完整回合（出牌 → 攻击 → 结束）
//  按 ai-strategy-spec: 20%犹豫、最多出2张、攻击目标选择
//  决策E4：从 BattleScreen（1861 行 god component）抽出到独立 hook。
//  触发：battle.phase === 'enemyTurn'。deps 仍 [battle.phase]，与原内联 effect 逐字节一致。
// ================================================================
export function useAITurn({ battle, enemyHand, playerHand, campaignConfig, showFloat, showDamageFloat, t }) {
  const aiRunning = useRef(false)

  useEffect(() => {
    if (battle.phase !== 'enemyTurn' || aiRunning.current) return
    aiRunning.current = true

    ;(async () => {
      // --- 1. 敌方抽牌 ---
      await delay(300)
      const drawn = enemyHand.draw(1)
      if (drawn.length > 0) battle.addLog(`🔴 敌方抽了 1 张牌（手牌 ${enemyHand.hand.length + 1}）`)

      // --- 2. 刷新能量 ---
      const eEnergy = battle.beginEnemyTurn()
      let remainEnergy = eEnergy

      // AI 强度参数（0.0-1.0，越高越聪明）
      const aiStr = campaignConfig?.aiStrength ?? 0.5
      // Sprint 28: AI 行为倾向（aggressive/balanced/defensive）
      // 教学关（无 campaignConfig）默认 defensive，避免冲脸打扰教学
      const aiPersonality = campaignConfig?.aiPersonality || (campaignConfig ? 'balanced' : 'defensive')

      // --- 3. AI 出牌阶段 ---
      const MAX_CARDS_PER_TURN = 2
      let cardsPlayed = 0

      // 需要读取最新手牌（draw 后 state 可能还没更新，用 setTimeout 等一帧）
      await delay(100)

      // --- AI Power Bank 打破决策 ---
      const aiPB = battle.latest.enemyPowerBank
      if (aiPB.intact && aiPB.stored > 0) {
        const aiHand = enemyHand.hand
        const highCostCards = aiHand.filter(c => c.cost >= 4)
        const aiLeaderHP = battle.latest.enemyLeaderHp
        const totalWithBank = remainEnergy + aiPB.stored

        let shouldBreak = false
        // 条件1：血量低于 30% 且有高费卡能出
        if (aiLeaderHP < 9000 && highCostCards.length >= 1 && totalWithBank >= highCostCards[0].cost) {
          shouldBreak = true
        }
        // 条件2：Power Bank >= 15 且手牌有2+张高费卡
        if (aiPB.stored >= 15 && highCostCards.length >= 2) {
          shouldBreak = true
        }
        // 条件3：Power Bank >= 25 直接打破
        if (aiPB.stored >= 25) shouldBreak = true

        if (shouldBreak) {
          const released = battle.breakPowerBank('enemy')
          remainEnergy += released
          battle.addLog(`🔴 💥 敌方打破 Power Bank！释放 ${released} 能量！`)
          playSound('bankBreak')
          await delay(600)
        }
      }

      // --- AI 攒能量策略 ---
      let aiShouldSave = false
      const aiPBNow = battle.latest.enemyPowerBank
      if (aiPBNow.intact) {
        const aiFieldNow = battle.latest.enemyField
        const aliveOnField = aiFieldNow.filter(c => c && c.currentHp > 0).length
        if (aliveOnField >= 2 && aiPBNow.stored < 20 && Math.random() < 0.40) {
          aiShouldSave = true
        }
      }

      // --- AI: 先出事件卡，再出生物卡 ---
      for (let attempt = 0; attempt < 4; attempt++) {
        const aiHand = enemyHand.hand
        if (aiHand.length === 0) break

        // Try event cards first (buff/heal when field has cards, damage when enemy has cards)
        const eventCards = aiHand.filter(c => c.type === 'event' && c.cost <= remainEnergy)
        if (eventCards.length > 0 && attempt < 2) {
          // Pick best event card based on situation
          const aiField = battle.latest.enemyField
          const aliveCount = aiField.filter(c => c && c.currentHp > 0).length
          let chosenEvent = null

          // Prefer SP-summoning events if SP deck has cards
          const spEvents = eventCards.filter(c => c.spSummonRule && battle.latest.enemySpDeck.length > 0)
          if (spEvents.length > 0 && aliveCount >= 1) {
            chosenEvent = spEvents[0]
          } else if (aliveCount >= 1) {
            // Use buff/heal events when we have field presence
            const utilityEvents = eventCards.filter(c => ['buff', 'heal', 'energy'].includes(c.effectType))
            if (utilityEvents.length > 0) chosenEvent = utilityEvents[0]
          }
          if (!chosenEvent && eventCards.length > 0 && Math.random() > 0.5) {
            chosenEvent = eventCards[0]
          }

          if (chosenEvent) {
            battle.aiPlayEventCard(chosenEvent, {
              drawCards: (n) => enemyHand.draw(n),
            })
            enemyHand.playCard(chosenEvent.uid)
            remainEnergy -= chosenEvent.cost
            cardsPlayed++
            playSound('cardPlay')
            await delay(600)
            continue
          }
        }

        // Character cards
        const aiField = battle.latest.enemyField
        const emptySlots = aiField.map((c, i) => (!c || c.currentHp <= 0) ? i : -1).filter(i => i >= 0)
        if (emptySlots.length === 0) break

        const playable = aiHand
          .filter(c => c.type !== 'event' && c.cost <= remainEnergy && canPlayWithMarkers(c, battle.latest.enemyDiscard))
          .sort((a, b) => (b.atk + b.hp) - (a.atk + a.hp))

        if (playable.length === 0) break

        // 犹豫概率受 aiStrength 影响：强 AI 犹豫更少
        const hesitateChance = Math.max(0.05, 0.30 - aiStr * 0.25)
        if (Math.random() < hesitateChance || (aiShouldSave && cardsPlayed >= 1)) {
          battle.addLog('🔴 敌方犹豫了一下...')
          break
        }

        // 选卡逻辑（aiStrength 影响：高强度选最优，低强度有概率选随机）
        let chosen
        const aliveCount = aiField.filter(c => c && c.currentHp > 0).length

        if (aliveCount === 0) {
          chosen = playable.reduce((min, c) => c.cost < min.cost ? c : min, playable[0])
        } else if (Math.random() < aiStr) {
          // 最优选择：ATK+HP 最高的卡（playable 已按此排序）
          chosen = playable[0]
        } else {
          // 随机选择
          chosen = playable[Math.floor(Math.random() * playable.length)]
        }

        const slotIdx = emptySlots[0]
        battle.aiPlayToField(chosen, slotIdx)
        enemyHand.playCard(chosen.uid)
        remainEnergy -= chosen.cost
        cardsPlayed++
        playSound('cardPlay')

        await delay(500)
      }

      // --- 4. AI 攻击阶段 ---
      await delay(400)
      // ★ S3：把敌方的相位真正推进到 battle（enemy.phase: 'main' → 'battle'）。
      //   此前敌方**根本没有 main→battle 转移** —— 唯一的 PHASE_SET 'battle' 在
      //   endMainPhase 里且是玩家专用的。这正是 aiPlayToField/aiAttack 一道 gate 都没有的
      //   根因：不存在一个「敌方的 main」可查，gate **不可表达**。
      //   顺序铁律：S3 只驱动状态、**不设 gate**；S4/S5 才让 gate 读它。反了 → AI 静默变哑。
      //   （日志「🔴 --- 敌方攻击 ---」已并入 endMainPhase，故此处不再单独 addLog。）
      battle.endMainPhase('enemy')
      await delay(100)

      for (let atkSlot = 0; atkSlot < MAX_FIELD_SLOTS; atkSlot++) {
        // 每次循环都读 ref 拿最新状态
        const eFieldNow = battle.latest.enemyField
        const pFieldNow = battle.latest.playerField
        const atkCard = eFieldNow[atkSlot]
        if (!atkCard || atkCard.currentHp <= 0) continue

        // 选靶（纯函数 pickAiTarget，可单测；T1 守护/T2 空场直攻/T3 概率直攻/T4 最优/T5 随机，默认 rng=Math.random 行为不变）
        const defSlot = pickAiTarget({
          atkCard,
          playerField: pFieldNow,
          aiPersonality,
          aiStrength: aiStr,
          leaderHp: battle.latest.playerLeaderHp ?? battle.playerLeaderHp ?? LEADER_HP,
        })

        const result = battle.aiAttack(atkSlot, defSlot)
        if (result?.skipped) continue
        // 伤害浮字 + 音效
        if (result && !result.skipped) {
          if (result.leaderHit) {
            playSound('leaderHit')
            showDamageFloat('player', -1, result.atkDmg)
          } else {
            playSound('attack')
            showDamageFloat('player', defSlot, result.atkDmg)
            if (result.defDmg > 0) showDamageFloat('enemy', atkSlot, result.defDmg)
            if (result.atkFactionBonus) setTimeout(() => showFloat('player', defSlot, t('battle.float.superEffective'), 'text-green-400'), 200)
            if (result.defFactionBonus) setTimeout(() => showFloat('enemy', atkSlot, t('battle.float.resisted'), 'text-red-400'), 200)
            if (result.defKilled) setTimeout(() => playSound('cardKill'), 200)
            if (result.atkKilled) setTimeout(() => playSound('cardKill'), 300)
          }
        }
        if (result?.gameOver) break

        await delay(800) // 攻击间隔
      }

      // --- 5. 结束敌方回合 → 玩家新回合 ---
      if (battle.phase !== 'over') {
        await delay(500)
        // 玩家抽牌 + 新回合
        playerHand.draw(1)
        battle.startPlayerTurn()
        playSound('turnStart')
      }
    })()
      .catch((err) => {
        // 血泪教训：async AI 回合抛错会静默 reject → 冻死回合（oppSide 那一族 bug）。
        // 兜底：记日志（不再静默）+ 尽力把回合交还玩家（不再卡死）。
        console.error('[useAITurn] 敌方回合异常，已兜底交还玩家：', err)
        try {
          battle.addLog('⚠️ 敌方回合出错，已跳过并交还给你')
          if (battle.phase !== 'over') {
            playerHand.draw(1)
            battle.startPlayerTurn()
            playSound('turnStart')
          }
        } catch (recoverErr) {
          console.error('[useAITurn] 兜底交还回合也失败：', recoverErr)
        }
      })
      .finally(() => {
        // 无论成功/抛错，aiRunning 必须归位，否则下个敌方回合被永久锁死
        aiRunning.current = false
      })
  }, [battle.phase])
}
