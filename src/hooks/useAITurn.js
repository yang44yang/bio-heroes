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
      // ⚠️ beginEnemyTurn 的返回值仍然要（它把 ENERGY_BOOST 折进 gain 并 dispatch），
      //    但**不再拿它维护一个局部 remainEnergy**（S4）：那是 AI 能量的第二真相源，
      //    且已经在漂移 —— aiPlayEventCard 的 spend_all_energy 把引擎 energy 清零却
      //    不动 remainEnergy。gate 真查能量之后，第二真相源 = AI 静默少出牌。
      //    改为每次现读 `battle.latest.enemyEnergy`（getter 直读 battleStateRef）。
      //    时序安全：本 IIFE 每个决策点之前都有 await（delay 100/600/500），
      //    React 已提交 → ref 是新鲜的。
      battle.beginEnemyTurn()

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
        const totalWithBank = battle.latest.enemyEnergy + aiPB.stored

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
        const eventCards = aiHand.filter(c => c.type === 'event' && c.cost <= battle.latest.enemyEnergy)
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
            // ★ S6：走统一的 playEventCard（gate 会真的查 activeSide/phase/能量）。
            //   ⚠️ playCard 必须在 r.ok 之后 —— 同 S4 的手牌蒸发问题。
            const r = battle.playEventCard(chosenEvent, {
              drawCards: (n) => enemyHand.draw(n),
            }, 'enemy')
            if (!r.ok) {
              battle.addLog(`🔴 ${chosenEvent.name} 无法打出：${r.msg}`)
              break
            }
            enemyHand.playCard(chosenEvent.uid)
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
          .filter(c => c.type !== 'event' && c.cost <= battle.latest.enemyEnergy && canPlayWithMarkers(c, battle.latest.enemyDiscard))
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
        // ★ S4：走统一的 playToField（gate 会真的查能量/阵营需求/槽位）。
        //   ⚠️ playCard 必须在 r.ok **之后** —— 旧写法无条件调它，一旦出牌能被拒，
        //     那张卡就从手牌消失、从未上场、也不进弃牌堆：AI 凭空少一张牌，没人看得出来。
        const r = battle.playToField(chosen, slotIdx, 'enemy')
        if (!r.ok) {
          // 出牌被拒 = AI 的决策与引擎规则不一致 → 记日志（不静默）并停止本回合出牌，
          // 避免拿同一张卡在循环里反复撞墙。
          battle.addLog(`🔴 ${chosen.name} 无法打出：${r.msg}`)
          break
        }
        enemyHand.playCard(chosen.uid)
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

        // ★ S5：走统一的 attack（守护/一卡一次/觉醒都由引擎强制，不再靠本循环的形状兜着）。
        //   ⚠️ 被规则拒绝时返回 **null**（两侧一致）；旧 aiAttack 返回 {skipped:true}。
        const result = battle.attack(atkSlot, defSlot, {}, 'enemy')
        if (!result) continue
        // 伤害浮字 + 音效
        if (result) {
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
