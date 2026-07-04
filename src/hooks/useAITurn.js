import { useEffect, useRef } from 'react'
import { playSound } from '../audio/soundManager'
import { cardHasGuard, attackerBypassesGuard } from '../utils/guardSkill'
import { MAX_FIELD_SLOTS, LEADER_HP } from '../data/deckRules'
import { canPlayWithMarkers } from '../utils/factionMarkers'

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
      const aiPB = battle.enemyPowerBankRef.current
      if (aiPB.intact && aiPB.stored > 0) {
        const aiHand = enemyHand.hand
        const highCostCards = aiHand.filter(c => c.cost >= 4)
        const aiLeaderHP = battle.enemyLeaderHpRef.current
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
      const aiPBNow = battle.enemyPowerBankRef.current
      if (aiPBNow.intact) {
        const aiFieldNow = battle.enemyFieldRef.current
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
          const aiField = battle.enemyFieldRef.current
          const aliveCount = aiField.filter(c => c && c.currentHp > 0).length
          let chosenEvent = null

          // Prefer SP-summoning events if SP deck has cards
          const spEvents = eventCards.filter(c => c.spSummonRule && battle.enemySpDeckRef.current.length > 0)
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
        const aiField = battle.enemyFieldRef.current
        const emptySlots = aiField.map((c, i) => (!c || c.currentHp <= 0) ? i : -1).filter(i => i >= 0)
        if (emptySlots.length === 0) break

        const playable = aiHand
          .filter(c => c.type !== 'event' && c.cost <= remainEnergy && canPlayWithMarkers(c, battle.enemyDiscardRef.current))
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
      battle.addLog('🔴 --- 敌方攻击 ---')
      await delay(100)

      for (let atkSlot = 0; atkSlot < MAX_FIELD_SLOTS; atkSlot++) {
        // 每次循环都读 ref 拿最新状态
        const eFieldNow = battle.enemyFieldRef.current
        const pFieldNow = battle.playerFieldRef.current
        const atkCard = eFieldNow[atkSlot]
        if (!atkCard || atkCard.currentHp <= 0) continue

        // 找攻击目标（排除隐身 stealth 卡 —— 与玩家攻击选靶对称；全员隐身则 pAlive 空 → 走直攻主人）
        const pAlive = pFieldNow.map((c, i) => (c && c.currentHp > 0 && !c.statuses?.some(s => s.type === 'stealth')) ? { ...c, slot: i } : null).filter(Boolean)
        // 走统一 helper, 识别 Guard / Shell Defense / Physical Barrier 三种 nameEn
        const guardCards = pAlive.filter(cardHasGuard)
        // 无视守护的攻击者（精准切除 / 抗原锁定打标记）不被守护强制（当前敌方卡组无此卡，防御性支持）
        const bypassGuard = attackerBypassesGuard(atkCard, null) || pAlive.some(c => attackerBypassesGuard(atkCard, c))

        let defSlot

        if (guardCards.length > 0 && !bypassGuard) {
          // T1: 必须打守护
          defSlot = guardCards[0].slot
        } else if (pAlive.length === 0) {
          // T2: 场上零卡，直攻主人
          defSlot = -1
        } else {
          // Sprint 28: T3 — 基于 aiPersonality 决定是否直攻主人
          const leaderHp = battle.playerLeaderHpRef?.current ?? battle.playerLeaderHp ?? LEADER_HP
          const leaderHpPercent = leaderHp / LEADER_HP
          let faceChance = 0

          if (aiPersonality === 'aggressive') {
            // 激进：基础 35% 直攻；残血时更激进；一击必杀几乎必推
            faceChance = 0.35
            if (leaderHpPercent < 0.5) faceChance = 0.5
            if (leaderHpPercent < 0.3) faceChance = 0.7
            if (atkCard.atk >= leaderHp) faceChance = 0.95
          } else if (aiPersonality === 'balanced') {
            // 平衡：10% 偶尔推；能一击杀主人时大概率推
            faceChance = 0.1
            if (atkCard.atk >= leaderHp) faceChance = 0.8
          } else {
            // defensive：基本不主动直攻；能一击秒主人时才推
            faceChance = 0
            if (atkCard.atk >= leaderHp) faceChance = 0.6
          }

          if (Math.random() < faceChance) {
            // 直攻主人
            defSlot = -1
          } else if (Math.random() < aiStr) {
            // T4: 最优攻击 — 尝试一击杀 → 打最大威胁
            const killable = pAlive
              .filter(c => atkCard.atk >= c.currentHp)
              .sort((a, b) => b.atk - a.atk)
            if (killable.length > 0) {
              defSlot = killable[0].slot
            } else {
              defSlot = pAlive.reduce((max, c) => c.atk > max.atk ? c : max, pAlive[0]).slot
            }
          } else {
            // T5: 随机攻击（弱 AI 有时打随机目标）
            defSlot = pAlive[Math.floor(Math.random() * pAlive.length)].slot
          }
        }

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

      aiRunning.current = false
    })()
  }, [battle.phase])
}
