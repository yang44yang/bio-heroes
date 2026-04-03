import React, { useCallback, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import BattleCard from './Card'
import QuizModal from './QuizModal'
import { useBattle } from '../hooks/useBattle'
import { useHand } from '../hooks/useHand'
import { FACTIONS, MAX_FIELD_SLOTS, LEADER_HP } from '../data/deckRules'
import { canPlayWithMarkers, getFactionMarkers } from '../utils/factionMarkers'
import { playSound, toggleMute, isMuted, initAudio } from '../audio/soundManager'
import { playerTestSpDeck, enemyTestSpDeck } from '../data/testDecks'
import DialogueBox from './DialogueBox'
import cards from '../data/cards'

/**
 * BattleScreen — Sprint 2 完全重写
 *
 * 布局：
 *   敌方主人HP → 敌方战场(5位) → VS → 玩家战场(5位) → 玩家主人HP
 *   → 手牌区 → 操作按钮 → 日志
 */
export default function BattleScreen({ playerDeckCards, enemyDeckCards, playerSpDeckCards, enemySpDeckCards, campaignConfig, onExit }) {
  const battle = useBattle()
  const playerHand = useHand(playerDeckCards)
  const enemyHand = useHand(enemyDeckCards)

  // 音效
  const [soundMuted, setSoundMuted] = useState(false)
  const audioInitialized = useRef(false)
  const ensureAudio = useCallback(() => {
    if (!audioInitialized.current) {
      initAudio()
      audioInitialized.current = true
    }
  }, [])

  // 选中状态
  const [selectedHandIdx, setSelectedHandIdx] = useState(null)  // 手牌中选中的卡
  const [selectedAtkSlot, setSelectedAtkSlot] = useState(null)  // 战场中选中的攻击者
  const [awakenOpts, setAwakenOpts] = useState({})
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [lockToast, setLockToast] = useState(null)

  // === 换卡（Mulligan）===
  const [mulliganSelected, setMulliganSelected] = useState(new Set()) // 选中要换的卡 uid

  // === 浮字系统（伤害 + 技能效果）===
  const [floatingDmgs, setFloatingDmgs] = useState([])
  const floatIdRef = useRef(0)

  /**
   * 通用浮字显示
   * @param {'player'|'enemy'} side
   * @param {number} slot - 0-4 卡槽，-1 主人
   * @param {string} text - 显示文本
   * @param {string} color - tailwind 文字颜色
   */
  const showFloat = useCallback((side, slot, text, color = 'text-red-400') => {
    const id = ++floatIdRef.current
    setFloatingDmgs(prev => [...prev, { id, side, slot, text, color }])
    setTimeout(() => {
      setFloatingDmgs(prev => prev.filter(f => f.id !== id))
    }, 1200)
  }, [])

  /** 伤害浮字（红色 -数值）*/
  const showDamageFloat = useCallback((side, slot, dmg) => {
    showFloat(side, slot, `-${dmg}`, 'text-red-400')
  }, [showFloat])

  /**
   * 显示技能事件浮字
   * 根据事件类型找到目标卡槽并显示对应颜色浮字
   */
  const showSkillFloats = useCallback((events, side) => {
    const pField = battle.playerFieldRef.current
    const eField = battle.enemyFieldRef.current
    const findSlot = (field, uid) => field.findIndex(c => c && c.uid === uid)

    for (const evt of events) {
      switch (evt.type) {
        case 'HEAL': {
          const slot = findSlot(side === 'player' ? pField : eField, evt.targetUid)
          if (slot >= 0) showFloat(side, slot, `+${evt.amount}`, 'text-green-400')
          break
        }
        case 'APPLY_SHIELD': {
          const slot = findSlot(side === 'player' ? pField : eField, evt.targetUid)
          if (slot >= 0) showFloat(side, slot, `🛡️+${evt.amount}`, 'text-blue-400')
          break
        }
        case 'BUFF': {
          const slot = findSlot(side === 'player' ? pField : eField, evt.targetUid)
          if (slot >= 0) showFloat(side, slot, `ATK+${evt.amount}`, 'text-yellow-300')
          break
        }
        case 'AOE_DAMAGE': {
          const targetSide = side === 'player' ? 'enemy' : 'player'
          if (evt.targetSlot !== undefined) showFloat(targetSide, evt.targetSlot, `-${evt.damage}`, 'text-orange-400')
          break
        }
        case 'OVERFLOW_DAMAGE':
        case 'PIERCING_DAMAGE': {
          const leaderSide = side === 'player' ? 'enemy' : 'player'
          showFloat(leaderSide, -1, `-${evt.damage}`, 'text-yellow-400')
          break
        }
      }
    }
  }, [battle, showFloat])

  // 觉醒演出
  const [awakenText, setAwakenText] = useState(null)

  // 锁定卡牌提示自动消失
  useEffect(() => {
    if (!lockToast) return
    const t = setTimeout(() => setLockToast(null), 2000)
    return () => clearTimeout(t)
  }, [lockToast])

  // 日志自动滚动
  const logRef = useRef(null)
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [battle.battleLog])

  // 胜负音效
  const prevWinner = useRef(null)
  useEffect(() => {
    if (battle.winner && battle.winner !== prevWinner.current) {
      prevWinner.current = battle.winner
      setTimeout(() => {
        playSound(battle.winner === 'player' ? 'victory' : 'defeat')
      }, 300)
    } else if (!battle.winner) {
      prevWinner.current = null
    }
  }, [battle.winner])

  // Power Bank 充能音效（检测 stored 增加）
  const prevPlayerBank = useRef(0)
  useEffect(() => {
    if (battle.playerPowerBank.stored > prevPlayerBank.current && battle.playerPowerBank.intact) {
      playSound('bankCharge')
    }
    prevPlayerBank.current = battle.playerPowerBank.stored
  }, [battle.playerPowerBank.stored, battle.playerPowerBank.intact])

  // === 工具：延迟 ===
  const delay = (ms) => new Promise(r => setTimeout(r, ms))

  // === 初始化 ===
  const initialized = useRef(false)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    playerHand.initHand()
    enemyHand.initHand()
    const enemySp = enemySpDeckCards || campaignConfig?.spDeck || enemyTestSpDeck
    // 查找 bossPreplaced 卡牌数据
    let bossPreplacedCard = null
    if (campaignConfig?.bossPreplaced) {
      const found = cards.find(c => c.id === campaignConfig.bossPreplaced)
      if (found) {
        bossPreplacedCard = { ...found, uid: `boss_${found.id}_0` }
      }
    }
    battle.startBattle({
      player: playerSpDeckCards || playerTestSpDeck,
      enemy: enemySp,
      enemyLeaderHP: campaignConfig?.leaderHP,
      campaignConfig,
      bossPreplaced: bossPreplacedCard,
    })
  }, [])

  // === 闯关对话 ===
  const [dialoguePhase, setDialoguePhase] = useState(campaignConfig?.dialogue?.before ? 'before' : null)
  const [dialogueIdx, setDialogueIdx] = useState(0)
  const currentDialogues = dialoguePhase === 'before' ? campaignConfig?.dialogue?.before
    : dialoguePhase === 'after' ? campaignConfig?.dialogue?.after
    : dialoguePhase === 'bossHalfHP' ? campaignConfig?.dialogue?.bossHalfHP
    : null

  const handleDialogueNext = useCallback(() => {
    if (!currentDialogues) return
    if (dialogueIdx + 1 < currentDialogues.length) {
      setDialogueIdx(i => i + 1)
    } else {
      setDialoguePhase(null)
      setDialogueIdx(0)
    }
  }, [currentDialogues, dialogueIdx])

  const handleDialogueSkip = useCallback(() => {
    setDialoguePhase(null)
    setDialogueIdx(0)
  }, [])

  // 战后对话触发
  const postDialogueTriggered = useRef(false)
  useEffect(() => {
    if (battle.winner && !postDialogueTriggered.current && campaignConfig?.dialogue?.after) {
      postDialogueTriggered.current = true
      // 延迟一下让胜利画面先渲染
      setTimeout(() => {
        setDialoguePhase('after')
        setDialogueIdx(0)
      }, 1500)
    }
  }, [battle.winner, campaignConfig])

  // === 重新开始 ===
  const handleRestart = useCallback(() => {
    setSelectedHandIdx(null)
    setSelectedAtkSlot(null)
    setAwakenOpts({})
    setMulliganSelected(new Set())
    setFloatingDmgs([])
    setAwakenText(null)
    floatIdRef.current = 0
    enemyPlaced.current = false
    postDialogueTriggered.current = false
    playerHand.initHand()
    enemyHand.initHand()
    const enemySp = enemySpDeckCards || campaignConfig?.spDeck || enemyTestSpDeck
    let bossPreplacedCard = null
    if (campaignConfig?.bossPreplaced) {
      const found = cards.find(c => c.id === campaignConfig.bossPreplaced)
      if (found) bossPreplacedCard = { ...found, uid: `boss_${found.id}_0` }
    }
    battle.startBattle({
      player: playerSpDeckCards || playerTestSpDeck,
      enemy: enemySp,
      enemyLeaderHP: campaignConfig?.leaderHP,
      campaignConfig,
      bossPreplaced: bossPreplacedCard,
    })
    if (campaignConfig?.dialogue?.before) {
      setDialoguePhase('before')
      setDialogueIdx(0)
    }
  }, [playerHand, enemyHand, battle])

  // === Boss 机制事件消费（浮字 + 对话） ===
  useEffect(() => {
    if (battle.bossMechanicEvents.length === 0) return
    const events = [...battle.bossMechanicEvents]
    battle.setBossMechanicEvents([])

    for (const evt of events) {
      if (evt.type === 'BOSS_EVENT') {
        showFloat('enemy', -1, evt.text, evt.color || 'text-red-400')
      }
      if (evt.type === 'BOSS_AOE' && evt.slot !== undefined) {
        showDamageFloat('player', evt.slot, evt.damage)
      }
      if (evt.type === 'BOSS_DIALOGUE' && evt.dialogueKey && campaignConfig?.dialogue?.[evt.dialogueKey]) {
        setTimeout(() => {
          setDialoguePhase(evt.dialogueKey)
          setDialogueIdx(0)
        }, 800)
      }
    }
  }, [battle.bossMechanicEvents])

  // 初始化后敌方放起手卡（遵守能量=1限制）
  // Boss 预置卡跳过正常出牌（已在 useBattle.startBattle 中放置）
  const enemyPlaced = useRef(false)
  useEffect(() => {
    if (enemyHand.hand.length > 0 && !enemyPlaced.current) {
      enemyPlaced.current = true

      // 如果有 bossPreplaced，从手牌中移除该卡（避免重复）
      if (campaignConfig?.bossPreplaced) {
        const bossInHand = enemyHand.hand.find(c => c.id === campaignConfig.bossPreplaced)
        if (bossInHand) {
          enemyHand.playCard(bossInHand.uid) // 从手牌移除
        }
        return // Boss 已预置，不再额外出牌
      }

      const hand = enemyHand.hand
      // 回合1能量=1，只能出费用≤1的卡，最多1张
      const affordable = hand.filter(c => c.cost <= 1)
      const toPlace = affordable.slice(0, 1) // 最多1张（能量只够1）
      if (toPlace.length > 0) {
        toPlace.forEach((c, i) => {
          battle.aiPlayToField(c, i)
          enemyHand.playCard(c.uid)
        })
      }
    }
  }, [enemyHand.hand])

  // ================================================================
  //  敌方 AI 完整回合（出牌 → 攻击 → 结束）
  //  按 ai-strategy-spec: 20%犹豫、最多出2张、攻击目标选择
  // ================================================================
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

        // 找攻击目标
        const pAlive = pFieldNow.map((c, i) => (c && c.currentHp > 0) ? { ...c, slot: i } : null).filter(Boolean)
        const guardCards = pAlive.filter(c => c.skills?.some(s => s.nameEn === 'Guard'))

        let defSlot

        if (guardCards.length > 0) {
          // T1: 必须打守护
          defSlot = guardCards[0].slot
        } else if (pAlive.length === 0) {
          // T3: 直攻主人
          defSlot = -1
        } else if (Math.random() < aiStr) {
          // 最优攻击：尝试一击杀 → 打最大威胁
          const killable = pAlive
            .filter(c => atkCard.atk >= c.currentHp)
            .sort((a, b) => b.atk - a.atk)

          if (killable.length > 0) {
            defSlot = killable[0].slot
          } else {
            defSlot = pAlive.reduce((max, c) => c.atk > max.atk ? c : max, pAlive[0]).slot
          }
        } else {
          // 随机攻击（弱 AI 有时打随机目标）
          defSlot = pAlive[Math.floor(Math.random() * pAlive.length)].slot
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
            if (result.atkFactionBonus) setTimeout(() => showFloat('player', defSlot, '克制！+20%', 'text-green-400'), 200)
            if (result.defFactionBonus) setTimeout(() => showFloat('enemy', atkSlot, '被克制！', 'text-red-400'), 200)
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

  // === 出牌（从手牌到战场位 or 事件卡直接打出）===
  const handlePlayCard = useCallback((slotIdx) => {
    if (battle.phase !== 'main' || selectedHandIdx === null) return
    const card = playerHand.hand[selectedHandIdx]
    if (!card) return

    // Event card: no field slot needed, play directly
    if (card.type === 'event') {
      const result = battle.playEventCard(card, {
        drawCards: (n) => playerHand.draw(n),
        addToHand: (c) => {
          // Add card back to hand (for discard-to-hand effects)
          playerHand.hand.push({ ...c, uid: c.uid || `revived_${c.id}_${Date.now()}` })
        },
      })
      if (result.ok) {
        playSound('cardPlay')
        playerHand.playCard(card.uid)
        setSelectedHandIdx(null)
      }
      return
    }

    // Character card: place on field
    const result = battle.playToField(card, slotIdx)
    if (result.ok) {
      playSound('cardPlay')
      playerHand.playCard(card.uid)
      if (result.replaced) playerHand.discardCard(result.replaced)
      setSelectedHandIdx(null)
      // 技能浮字（Oxygen Delivery, Clotting Shield 等）
      if (result.skillEvents?.length > 0) {
        showSkillFloats(result.skillEvents, 'player')
      }
    }
  }, [battle, playerHand, selectedHandIdx, showSkillFloats])

  // === 选择攻击者 ===
  const handleSelectAttacker = useCallback((slotIdx) => {
    if (battle.phase !== 'battle') return
    if (!battle.canAttack(slotIdx)) return
    setSelectedAtkSlot(slotIdx)
  }, [battle])

  // === 玩家攻击（带伤害浮字 + 技能浮字）===
  const doPlayerAttack = useCallback((atkSlot, defSlot, opts = {}) => {
    // 科学家模式 ATK +20% bonus
    const attackOpts = { ...opts }
    if (battle.scientistMode.active && !attackOpts.damageMultiplier) {
      attackOpts.damageMultiplier = (attackOpts.damageMultiplier || 1) * 1.2
    }
    const result = battle.attack(atkSlot, defSlot, attackOpts)
    if (!result) return
    if (result.leaderHit) {
      playSound('leaderHit')
      showDamageFloat('enemy', -1, result.atkDmg)
    } else {
      playSound('attack')
      showDamageFloat('enemy', defSlot, result.atkDmg)
      if (result.defDmg > 0) showDamageFloat('player', atkSlot, result.defDmg)
      if (result.atkFactionBonus) setTimeout(() => showFloat('enemy', defSlot, '克制！+20%', 'text-green-400'), 200)
      if (result.defFactionBonus) setTimeout(() => showFloat('player', atkSlot, '被克制！', 'text-red-400'), 200)
      if (result.defKilled) setTimeout(() => playSound('cardKill'), 200)
      if (result.atkKilled) setTimeout(() => playSound('cardKill'), 300)
    }
    // 技能浮字（Overpower, Piercing, Phagocytosis, Discharge Strike 等）
    if (result.skillEvents?.length > 0) {
      showSkillFloats(result.skillEvents, 'player')
    }
  }, [battle, showDamageFloat, showSkillFloats])

  // === 选择攻击目标 ===
  const handleSelectTarget = useCallback((defSlot) => {
    if (selectedAtkSlot === null) return

    // 先检查问答觉醒
    const quiz = battle.tryQuiz()
    if (quiz) {
      playSound('quizPopup')
      // 存储攻击意图，等问答结束后再执行
      setAwakenOpts({ pendingAtkSlot: selectedAtkSlot, pendingDefSlot: defSlot })
      setSelectedAtkSlot(null)
      return
    }

    doPlayerAttack(selectedAtkSlot, defSlot)
    setSelectedAtkSlot(null)
  }, [selectedAtkSlot, doPlayerAttack, battle])

  // === 直攻主人 ===
  const handleAttackLeader = useCallback(() => {
    if (selectedAtkSlot === null) return

    const quiz = battle.tryQuiz()
    if (quiz) {
      playSound('quizPopup')
      setAwakenOpts({ pendingAtkSlot: selectedAtkSlot, pendingDefSlot: -1 })
      setSelectedAtkSlot(null)
      return
    }

    doPlayerAttack(selectedAtkSlot, -1)
    setSelectedAtkSlot(null)
  }, [selectedAtkSlot, doPlayerAttack, battle])

  // === 问答回答 ===
  const handleQuizAnswer = useCallback((idx) => {
    const opts = battle.answerQuiz(idx)
    const { pendingAtkSlot, pendingDefSlot } = awakenOpts

    if (opts.awakened) {
      playSound('quizCorrect')
      setTimeout(() => playSound('awaken'), 300)
      if (opts.scientistTriggered) {
        setTimeout(() => playSound('scientistMode'), 600)
      }
      setAwakenText(opts.scientistTriggered ? '🔬 科学家模式！' : '觉醒！ATK ×2.0')
      setTimeout(() => {
        setAwakenText(null)
        if (pendingAtkSlot !== undefined) {
          doPlayerAttack(pendingAtkSlot, pendingDefSlot, opts)
        }
        setAwakenOpts({})
      }, opts.scientistTriggered ? 1200 : 800)
    } else {
      playSound('quizWrong')
      if (pendingAtkSlot !== undefined) {
        doPlayerAttack(pendingAtkSlot, pendingDefSlot)
      }
      setAwakenOpts({})
    }
  }, [doPlayerAttack, awakenOpts, battle])

  // === 换卡操作 ===
  const toggleMulliganCard = useCallback((uid) => {
    setMulliganSelected(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }, [])

  const confirmMulligan = useCallback(() => {
    ensureAudio()
    const uids = Array.from(mulliganSelected)
    if (uids.length > 0) {
      const drawn = playerHand.mulligan(uids)
      battle.addLog(`🔄 换卡：换掉 ${uids.length} 张，重新抽了 ${drawn.length} 张`)
    } else {
      battle.addLog('🔄 不换卡，直接开始')
    }
    setMulliganSelected(new Set())
    battle.endMulligan()
    playSound('mulligan')
    setTimeout(() => playSound('turnStart'), 300)
  }, [mulliganSelected, playerHand, battle, ensureAudio])

  // 抽牌已整合到 AI 回合流程中（敌方回合结束时自动为双方抽牌）

  const isMulliganPhase = battle.phase === 'mulligan'
  const isMainPhase = battle.phase === 'main'
  const isBattlePhase = battle.phase === 'battle'

  // 攻击目标判定
  const hasEnemyGuard = battle.enemyField.some(c => c && c.currentHp > 0 && c.skills?.some(s => s.nameEn === 'Guard'))
  const enemyLeaderTargetable = isBattlePhase && selectedAtkSlot !== null && !hasEnemyGuard
  const enemyAlive = battle.enemyField.filter((c, i) => c && c.currentHp > 0).map((c, i) => {
    const realIdx = battle.enemyField.findIndex((cc, ii) => cc === c && ii >= 0)
    return realIdx
  })
  // 对面存活卡牌的 slot indexes（用于 Bug 4 高亮）
  const validEnemyTargets = isBattlePhase && selectedAtkSlot !== null
    ? (hasEnemyGuard
        ? battle.enemyField.map((c, i) => c && c.currentHp > 0 && c.skills?.some(s => s.nameEn === 'Guard') ? i : -1).filter(i => i >= 0)
        : battle.enemyField.map((c, i) => c && c.currentHp > 0 ? i : -1).filter(i => i >= 0))
    : []

  // Power Bank 能量条组件
  const PowerBankBar = ({ powerBank, side, canBreak }) => {
    const { stored, intact } = powerBank
    const percentage = Math.min(100, (stored / 50) * 100)

    const getBarColor = () => {
      if (!intact) return '#555'
      if (stored >= 30) return '#FFD700'
      if (stored >= 20) return '#FF8C00'
      if (stored >= 10) return '#00BFFF'
      return '#4ADE80'
    }

    const shouldPulse = intact && stored >= 15

    return (
      <div className="flex items-center gap-1 sm:gap-2">
        <span className="text-[8px] sm:text-[10px] text-gray-500 w-10 sm:w-16 shrink-0">
          {side === 'player' ? '⚡PB' : '⚡敌PB'}
        </span>
        <div className="flex-1 h-3 sm:h-4 rounded-full overflow-hidden relative" data-pb-bar
          style={{ background: '#222', border: '1px solid #444' }}>
          <div
            className={shouldPulse ? 'animate-pulse' : ''}
            style={{
              width: `${percentage}%`,
              height: '100%',
              background: getBarColor(),
              borderRadius: '9999px',
              transition: 'width 0.5s ease, background 0.3s ease',
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[8px] sm:text-[10px] font-black text-white"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            {intact ? (stored > 0 ? `⚡${stored}` : '') : '破'}
          </span>
        </div>
        {canBreak && intact && stored > 0 && (
          <motion.button
            className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-black text-black rounded-lg min-h-[28px] sm:min-h-0"
            style={{
              background: stored >= 20 ? '#FFD700' : '#FF8C00',
            }}
            animate={stored >= 20 ? { scale: [1, 1.08, 1] } : {}}
            transition={stored >= 20 ? { repeat: Infinity, duration: 1 } : {}}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const released = battle.breakPowerBank('player')
              if (released > 0) {
                playSound('bankBreak')
                showFloat('player', -1, `💥+${released}⚡`, 'text-yellow-400')
              }
            }}
          >
            💥打破
          </motion.button>
        )}
      </div>
    )
  }

  // 主人面板组件（替代原 HpBar，可点击直攻）
  const LeaderPanel = ({ isEnemy, currentHP, maxHP, isAttackTarget, dimmed, onClick, floats, style: extraStyle }) => {
    const pct = Math.max(0, (currentHP / maxHP) * 100)
    const barColor = isEnemy ? 'bg-red-500' : 'bg-blue-500'
    const avatarBg = isEnemy ? 'bg-red-900/60 border-red-700' : 'bg-blue-900/60 border-blue-700'
    const nameColor = isEnemy ? 'text-red-400' : 'text-blue-400'
    const panelBg = isEnemy ? 'bg-[#151c30]' : 'bg-[#0c1a2a]'
    const panelBorder = isEnemy ? 'border-[#3a2020]' : 'border-[#1a3a5a]'

    return (
      <div
        className={`flex-none relative ${isAttackTarget ? 'cursor-pointer' : ''} ${dimmed ? 'opacity-50' : ''}`}
        style={extraStyle || {}}
        data-hp-bar-area="true"
        data-leader-panel="true"
        {...(isAttackTarget ? { 'data-attack-target': 'true' } : {})}
        onClick={() => isAttackTarget && onClick?.()}
      >
        <div className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border-[1.5px] ${panelBg} ${panelBorder} ${
          isAttackTarget ? 'border-red-500 bg-[#2a1515]' : ''
        }`}>
          {/* 头像 */}
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 ${avatarBg} flex items-center justify-center text-lg sm:text-xl shrink-0`}>
            {isEnemy ? '👹' : '👦'}
          </div>
          {/* 信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className={`text-xs sm:text-sm font-medium ${nameColor}`}>{isEnemy ? '对手' : '你'}</span>
              <span className="text-xs sm:text-sm text-white font-medium font-mono">
                {currentHP.toLocaleString()}
                <span className="text-gray-500 text-[10px] sm:text-xs"> / {maxHP.toLocaleString()}</span>
              </span>
            </div>
            <div className="h-3.5 sm:h-[18px] bg-[#1a1a2e] rounded-lg overflow-hidden">
              <motion.div
                className={`h-full ${barColor} rounded-lg`}
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          {/* TAP 提示 */}
          {isAttackTarget && (
            <motion.span
              className="text-[10px] sm:text-xs text-red-400 border border-red-500 px-1.5 sm:px-2 py-0.5 rounded-md shrink-0 font-bold"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >TAP</motion.span>
          )}
        </div>
        {/* 浮字伤害 */}
        <AnimatePresence>
          {floats?.map(f => (
            <motion.div
              key={f.id}
              className={`absolute right-4 top-0 text-xl font-black pointer-events-none z-50 ${f.color || 'text-yellow-400'}`}
              style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}
              initial={{ opacity: 1, y: 0, scale: 1.3 }}
              animate={{ opacity: 0, y: -30, scale: 0.8 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            >
              {f.text || `-${f.dmg}`}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="h-screen-d max-w-3xl mx-auto px-2 sm:px-4 flex flex-col overflow-hidden" data-battle-container="true">

      {/* 觉醒文字 */}
      {createPortal(
        <AnimatePresence>
          {awakenText && (
            <motion.div
              className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -60 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              <div className="text-4xl font-black text-yellow-400 drop-shadow-lg"
                style={{ textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.4)' }}>
                {awakenText}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* 回合 & 能量 — 顶部信息栏 */}
      <div className="flex-none flex items-center justify-between py-1 sm:py-1.5" data-top-bar="true">
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="text-[10px] sm:text-sm text-gray-400">R{battle.turn}</span>
          <button
            className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded min-h-[28px] sm:min-h-0"
            onClick={handleRestart}
          >
            🔄
          </button>
          <button
            className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded min-h-[28px] sm:min-h-0"
            onClick={() => {
              ensureAudio()
              const m = toggleMute()
              setSoundMuted(m)
            }}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>
          <button
            className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded min-h-[28px] sm:min-h-0"
            onClick={() => setShowExitConfirm(true)}
          >
            🚪
          </button>
        </div>
        <div className="flex gap-1.5 sm:gap-3 text-[10px] sm:text-sm items-center">
          <span className="text-blue-400">⚡{battle.playerEnergy}</span>
          {battle.quizStreak > 0 && (
            <span className="text-yellow-300 font-bold">🧠×{battle.quizStreak}</span>
          )}
          <span className="text-red-400/60 hidden sm:inline">🔴 手牌{enemyHand.hand.length}</span>
          {isMainPhase && <span className="text-green-400 font-bold animate-pulse text-[10px] sm:text-sm">出牌</span>}
          {isBattlePhase && <span className="text-red-400 font-bold animate-pulse text-[10px] sm:text-sm">战斗</span>}
          {battle.phase === 'enemyTurn' && <span className="text-orange-400 font-bold animate-pulse text-[10px] sm:text-sm">敌方...</span>}
        </div>
      </div>

      {/* 科学家模式横幅 */}
      <AnimatePresence>
        {battle.scientistMode.active && (
          <motion.div
            className="flex-none mb-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-xl text-center text-[10px] sm:text-sm font-bold"
            style={{
              background: 'linear-gradient(90deg, rgba(59,130,246,0.3), rgba(168,85,247,0.3), rgba(59,130,246,0.3))',
              backgroundSize: '200% 100%',
              border: '1px solid rgba(168,85,247,0.5)',
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{
              opacity: 1, y: 0,
              backgroundPosition: ['0% 50%', '200% 50%'],
            }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              backgroundPosition: { duration: 2, repeat: Infinity, ease: 'linear' },
            }}
          >
            <span className="text-purple-300">🔬 科学家模式！</span>
            <span className="text-gray-400 text-xs ml-2">全队 ATK +20%（剩余 {battle.scientistMode.turnsLeft} 回合）</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 活跃环境事件指示器 */}
      <AnimatePresence>
        {battle.activeEnvEvent && (
          <motion.div
            className="flex-none mb-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-lg text-center text-[10px] sm:text-xs"
            style={{ background: 'rgba(217, 119, 6, 0.15)', border: '1px solid rgba(217, 119, 6, 0.3)' }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span className="text-amber-400">
              {battle.activeEnvEvent.event.emoji} {battle.activeEnvEvent.event.name}
            </span>
            <span className="text-gray-500 ml-2">剩余 {battle.activeEnvEvent.turnsLeft} 回合</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 敌方主人面板 */}
      <LeaderPanel
        isEnemy={true}
        currentHP={battle.enemyLeaderHp}
        maxHP={campaignConfig?.leaderHP || LEADER_HP}
        isAttackTarget={enemyLeaderTargetable}
        dimmed={isBattlePhase && selectedAtkSlot !== null && hasEnemyGuard}
        onClick={handleAttackLeader}
        floats={floatingDmgs.filter(f => f.side === 'enemy' && f.slot === -1)}
      />

      {/* 敌方 Power Bank */}
      <div className="flex-none"><PowerBankBar powerBank={battle.enemyPowerBank} side="enemy" canBreak={false} /></div>

      {/* 敌方战场 */}
      <div className="flex-1 min-h-0 flex items-end justify-center gap-1 sm:gap-2 px-1 pb-1" data-field-area="true">
        {battle.enemyField.map((card, i) => {
          const isValid = validEnemyTargets.includes(i)
          const isTargeting = isBattlePhase && selectedAtkSlot !== null
          const isDimmedTarget = isTargeting && card && card.currentHp > 0 && !isValid
          return (
          <div
            key={i}
            className={`relative w-[calc((100%-1rem)/5)] h-full rounded-lg sm:rounded-xl border-2 border-dashed flex items-center justify-center transition-opacity
              ${isTargeting && isValid && card && card.currentHp > 0
                ? 'border-red-400 cursor-pointer hover:border-red-300'
                : card && card.currentHp > 0 ? 'border-gray-600' : 'border-gray-700'
              } ${isDimmedTarget ? 'opacity-50' : ''}`}
            {...(isTargeting && isValid && card && card.currentHp > 0 ? { 'data-attack-target': 'true' } : {})}
            onClick={() => isTargeting && isValid && card && card.currentHp > 0 && handleSelectTarget(i)}
          >
            {card && card.currentHp > 0 ? (
              <BattleCard card={card} hp={card.currentHp} maxHp={card.maxHp} isPlayer={false} isActive={false} />
            ) : (
              <span className="text-gray-700 text-[9px] sm:text-xs">空</span>
            )}
            <AnimatePresence>
              {floatingDmgs.filter(f => f.side === 'enemy' && f.slot === i).map(f => (
                <motion.div
                  key={f.id}
                  className={`absolute top-0 left-1/2 -translate-x-1/2 text-lg sm:text-2xl font-black pointer-events-none z-50 ${f.color || 'text-red-400'}`}
                  style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}
                  initial={{ opacity: 1, y: 0, scale: 1.2 }}
                  animate={{ opacity: 0, y: -30, scale: 0.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                >
                  {f.text || `-${f.dmg}`}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          )})}
      </div>

      {/* VS 分隔 */}
      <div className="flex-none text-center text-sm sm:text-2xl font-black text-red-500 py-0.5" data-vs-divider="true">⚔️</div>

      {/* 玩家战场 */}
      <div className="flex-1 min-h-0 flex items-start justify-center gap-1 sm:gap-2 px-1 pt-1" data-field-area="true">
        {battle.playerField.map((card, i) => {
          const isAttacker = selectedAtkSlot === i
          const isTargeting = isBattlePhase && selectedAtkSlot !== null
          const isWaitingForAttacker = isBattlePhase && selectedAtkSlot === null
          const canAtk = card && card.currentHp > 0 && battle.canAttack(i)
          const playerDimmed = isTargeting && !isAttacker && card && card.currentHp > 0
          const hasSummonFatigue = card && card.currentHp > 0 && !battle.canAttack(i) && isBattlePhase
          return (
          <div
            key={i}
            className={`relative w-[calc((100%-1rem)/5)] h-full rounded-lg sm:rounded-xl border-2 border-dashed flex items-center justify-center transition-all
              ${isMainPhase && selectedHandIdx !== null
                ? 'border-green-400 cursor-pointer hover:border-green-300'
                : isAttacker ? 'border-yellow-400'
                : isWaitingForAttacker && canAtk ? 'border-yellow-500/70 cursor-pointer'
                : isBattlePhase && canAtk ? 'border-blue-400 cursor-pointer hover:border-blue-300'
                : 'border-gray-600'
              } ${playerDimmed ? 'opacity-60' : ''} ${hasSummonFatigue ? 'opacity-50' : ''}`}
            style={isAttacker ? {
              transform: 'translateY(-10px)',
              boxShadow: '0 0 0 3px #f1c40f, 0 0 15px rgba(241, 196, 15, 0.5)',
              borderRadius: '12px',
            } : isWaitingForAttacker && canAtk ? {
              boxShadow: '0 0 0 2px #f1c40f, 0 0 10px rgba(241, 196, 15, 0.3)',
              transform: 'scale(1.02)',
            } : {}}
            onClick={() => {
              if (isMainPhase && selectedHandIdx !== null) {
                handlePlayCard(i)
              } else if (isBattlePhase) {
                handleSelectAttacker(i)
              }
            }}
          >
            {/* ATK 标签（选中攻击者时） */}
            {isAttacker && (
              <span className="absolute -top-2 -right-1 z-10 text-[9px] sm:text-[10px] font-bold bg-yellow-500 text-gray-900 px-1.5 py-0.5 rounded-full leading-none">
                ATK
              </span>
            )}
            {card && card.currentHp > 0 ? (
              <BattleCard card={card} hp={card.currentHp} maxHp={card.maxHp} isPlayer={true} isActive={isAttacker} />
            ) : (
              <span className="text-gray-700 text-[9px] sm:text-xs">{i + 1}</span>
            )}
            <AnimatePresence>
              {floatingDmgs.filter(f => f.side === 'player' && f.slot === i).map(f => (
                <motion.div
                  key={f.id}
                  className={`absolute top-0 left-1/2 -translate-x-1/2 text-lg sm:text-2xl font-black pointer-events-none z-50 ${f.color || 'text-red-400'}`}
                  style={{ textShadow: '0 0 8px rgba(0,0,0,0.8)' }}
                  initial={{ opacity: 1, y: 0, scale: 1.2 }}
                  animate={{ opacity: 0, y: -30, scale: 0.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                >
                  {f.text || `-${f.dmg}`}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          )})}
      </div>

      {/* 玩家 Power Bank */}
      <div className="flex-none"><PowerBankBar powerBank={battle.playerPowerBank} side="player" canBreak={isMainPhase} /></div>

      {/* 弃牌堆阵营标记 */}
      {(() => {
        const markers = getFactionMarkers(battle.playerDiscard)
        const total = battle.playerDiscard.length
        if (total === 0) return null
        return (
          <div className="flex-none flex items-center gap-1 sm:gap-2 text-[8px] sm:text-[10px] text-gray-500 px-1" data-info-row="true">
            <span>弃牌({total}):</span>
            {markers.nature > 0 && <span>🌱{markers.nature}</span>}
            {markers.body > 0 && <span>🧬{markers.body}</span>}
            {markers.pathogen > 0 && <span>🦠{markers.pathogen}</span>}
            {markers.tech > 0 && <span>⚗️{markers.tech}</span>}
          </div>
        )
      })()}

      {/* 玩家主人面板 */}
      <LeaderPanel
        isEnemy={false}
        currentHP={battle.playerLeaderHp}
        maxHP={LEADER_HP}
        isAttackTarget={false}
        dimmed={false}
        onClick={null}
        floats={floatingDmgs.filter(f => f.side === 'player' && f.slot === -1)}
        style={isBattlePhase && selectedAtkSlot !== null ? { opacity: 0.8 } : {}}
      />

      {/* SP 卡区域 */}
      {(battle.playerSpDeck.length > 0 || battle.enemySpDeck.length > 0) && (
        <div className="flex-none flex justify-between items-center text-[8px] sm:text-[10px] text-gray-500 px-1" data-info-row="true">
          <span>🌟SP:{battle.playerSpDeck.length}</span>
          <span>🌟敌SP:{battle.enemySpDeck.length}</span>
        </div>
      )}

      {/* 手牌区 */}
      <div className={`shrink-0 flex flex-col ${isBattlePhase && selectedAtkSlot !== null ? 'opacity-60' : ''}`} style={{ height: '130px' }} data-hand-area="true">
        <div className="flex items-center gap-1 sm:gap-2 px-1">
          <span className="text-[10px] sm:text-xs text-gray-400">手牌({playerHand.hand.length})</span>
          <span className="text-[10px] sm:text-xs text-gray-600">卡组{playerHand.drawPileCount}</span>
          {isMainPhase && selectedHandIdx !== null && playerHand.hand[selectedHandIdx]?.type === 'event' && (
            <motion.button
              className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg min-h-[28px] sm:min-h-0"
              whileTap={{ scale: 0.9 }}
              onClick={() => handlePlayCard(-1)}
            >
              📜 使用事件
            </motion.button>
          )}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {isMainPhase && (
              <motion.button
                className="px-2 sm:px-4 py-0.5 sm:py-1 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold text-[10px] sm:text-xs min-h-[28px] sm:min-h-0"
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedHandIdx(null)
                  battle.endMainPhase()
                  playSound('phaseChange')
                }}
              >
                结束出牌 →
              </motion.button>
            )}
            {isBattlePhase && (
              <motion.button
                className="px-2 sm:px-4 py-0.5 sm:py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold text-[10px] sm:text-xs min-h-[28px] sm:min-h-0"
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedAtkSlot(null)
                  battle.endBattlePhase()
                }}
              >
                结束回合
              </motion.button>
            )}
            {isBattlePhase && selectedAtkSlot !== null && (
              <span className="text-[10px] text-yellow-300">选目标</span>
            )}
          </div>
        </div>
        <AnimatePresence>
          {lockToast && (
            <motion.div
              key={lockToast.key}
              className="text-center text-[10px] sm:text-xs text-yellow-300 bg-gray-800/90 rounded-lg px-2 py-0.5"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {lockToast.text}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex-1 flex gap-1 sm:gap-2 overflow-x-auto items-center px-1 snap-x">
          {playerHand.hand.map((card, i) => {
            const canAfford = card.cost <= battle.playerEnergy
            const markerOk = card.type === 'event' || canPlayWithMarkers(card, battle.playerDiscard)
            return (
              <div
                key={card.uid}
                className={`relative flex-none w-[22%] sm:w-[15%] lg:w-[13%] aspect-[5/7] cursor-pointer transition-transform snap-start ${
                  selectedHandIdx === i ? 'scale-105 ring-2 ring-green-400 rounded-lg sm:rounded-xl' : ''
                } ${isMainPhase && canAfford && markerOk ? 'opacity-100' : 'opacity-50'}`}
                onClick={() => {
                  if (!isMainPhase) return
                  // 提示不可出牌原因
                  if (!markerOk && card.factionRequirement) {
                    const f = FACTIONS[card.factionRequirement.faction]
                    const markers = getFactionMarkers(battle.playerDiscard)
                    const have = markers[card.factionRequirement.faction] || 0
                    setLockToast({ text: `${f.icon} 需要弃牌堆有 ${card.factionRequirement.count} 张${f.name}卡（当前 ${have} 张）`, key: Date.now() })
                    return
                  }
                  if (!canAfford) {
                    setLockToast({ text: `能量不足（需要 ${card.cost}，当前 ${battle.playerEnergy}）`, key: Date.now() })
                    return
                  }
                  if (selectedHandIdx === i && card.type === 'event') {
                    // Double-click event card to play it
                    handlePlayCard(-1)
                    return
                  }
                  setSelectedHandIdx(selectedHandIdx === i ? null : i)
                }}
              >
                <BattleCard card={card} hp={card.hp} maxHp={card.hp} isPlayer={true} isActive={false} />
                {card.factionRequirement && !canPlayWithMarkers(card, battle.playerDiscard) && (
                  <div className="absolute top-1 right-1 text-sm">🔒</div>
                )}
              </div>
            )
          })}
          {playerHand.hand.length === 0 && (
            <div className="text-gray-600 text-[10px] sm:text-xs py-2">手牌为空</div>
          )}
        </div>
      </div>

      {/* 底部战斗日志 */}
      <div className="flex-none py-0.5 sm:py-1" data-control-bar="true">
        <div ref={logRef} className="bg-gray-800/60 rounded-lg sm:rounded-xl p-1.5 sm:p-2 max-h-12 sm:max-h-24 overflow-y-auto text-[9px] sm:text-xs space-y-0.5" data-battle-log="true">
          {battle.battleLog.slice(-8).map((log, i) => (
            <div key={i} className="text-gray-300 truncate">{log}</div>
          ))}
        </div>
      </div>

      {/* 问答弹窗 — 用 Portal 避免 z-index 问题 */}
      {battle.currentQuiz && createPortal(
        <QuizModal quiz={battle.currentQuiz} onAnswer={handleQuizAnswer} />,
        document.body
      )}

      {/* SP 召唤选择弹窗 */}
      {battle.pendingSpSummon && createPortal(
        <motion.div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="bg-gray-900 rounded-2xl p-3 sm:p-6 mx-2 sm:mx-4 max-w-lg w-[95%] sm:w-full border border-yellow-500/50"
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <h2 className="text-xl font-bold text-yellow-400 text-center mb-2">🌟 SP 觉醒！</h2>
            <p className="text-gray-400 text-sm text-center mb-4">
              选择一张 SP 卡召唤到战场（免费！）
            </p>
            <div className="flex gap-3 justify-center flex-wrap mb-4">
              {battle.pendingSpSummon.candidates.map((sp) => (
                <motion.div
                  key={sp.uid}
                  className="cursor-pointer"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    battle.confirmSpSummon(sp)
                    playSound('spSummon')
                  }}
                >
                  <BattleCard card={sp} hp={sp.hp} maxHp={sp.hp} isPlayer={true} isActive={false} />
                </motion.div>
              ))}
            </div>
            <div className="text-center">
              <button
                className="text-xs text-gray-500 hover:text-gray-300"
                onClick={() => battle.cancelSpSummon()}
              >
                跳过召唤
              </button>
            </div>
          </motion.div>
        </motion.div>,
        document.body
      )}

      {/* 环境事件弹窗 */}
      {battle.pendingEnvEvent && createPortal(
        <motion.div
          className="fixed inset-0 z-[155] flex items-center justify-center bg-black/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="bg-gray-900 rounded-2xl p-6 mx-4 max-w-sm w-full border border-amber-500/50"
            initial={{ scale: 0.5, y: 60 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 12 }}
          >
            <div className="text-center text-5xl mb-3">{battle.pendingEnvEvent.emoji}</div>
            <h2 className="text-xl font-black text-amber-400 text-center mb-1">
              🌍 {battle.pendingEnvEvent.name}
            </h2>
            <p className="text-sm text-gray-300 text-center mb-3">
              {battle.pendingEnvEvent.description}
            </p>
            <div className="bg-gray-800/80 rounded-xl p-3 mb-4 text-xs text-gray-400 leading-relaxed">
              📖 {battle.pendingEnvEvent.scienceNote}
            </div>
            {battle.pendingEnvEvent.duration > 0 && (
              <p className="text-center text-[10px] text-amber-500/70 mb-3">
                持续 {battle.pendingEnvEvent.duration} 回合
              </p>
            )}
            <div className="text-center">
              <motion.button
                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm"
                whileTap={{ scale: 0.95 }}
                onClick={() => battle.dismissEnvEvent()}
              >
                确认
              </motion.button>
            </div>
          </motion.div>
        </motion.div>,
        document.body
      )}

      {/* 换卡界面 */}
      {isMulliganPhase && createPortal(
        <motion.div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="bg-gray-900 rounded-2xl p-6 mx-4 max-w-lg w-full border border-gray-700"
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <h2 className="text-xl font-bold text-yellow-400 text-center mb-2">🔄 换卡阶段</h2>
            <p className="text-gray-400 text-sm text-center mb-4">
              点击选择要换掉的卡牌（换掉后从卡组重新抽取同等数量）
            </p>

            {/* 手牌展示 */}
            <div className="flex gap-2 justify-center flex-wrap mb-5">
              {playerHand.hand.map((card) => {
                const isSelected = mulliganSelected.has(card.uid)
                return (
                  <motion.div
                    key={card.uid}
                    className={`relative cursor-pointer transition-all rounded-xl ${
                      isSelected
                        ? 'ring-3 ring-red-500 opacity-60 scale-95'
                        : 'ring-2 ring-transparent hover:ring-blue-400'
                    }`}
                    whileHover={{ scale: isSelected ? 0.95 : 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleMulliganCard(card.uid)}
                  >
                    <BattleCard card={card} hp={card.hp} maxHp={card.hp} isPlayer={true} isActive={false} />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-900/40 rounded-xl">
                        <span className="text-2xl">❌</span>
                      </div>
                    )}
                    {card.cost > 2 && !isSelected && (
                      <div className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        贵
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>

            <div className="text-center text-xs text-gray-500 mb-4">
              已选 {mulliganSelected.size} 张换掉
            </div>

            {/* 按钮 */}
            <div className="flex gap-3 justify-center">
              <motion.button
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  ensureAudio()
                  battle.addLog('🔄 不换卡，直接开始')
                  setMulliganSelected(new Set())
                  battle.endMulligan()
                  playSound('mulligan')
                  setTimeout(() => playSound('turnStart'), 300)
                }}
              >
                不换了，直接开始
              </motion.button>
              <motion.button
                className={`px-6 py-2 rounded-xl font-bold text-sm text-white ${
                  mulliganSelected.size > 0
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
                whileHover={mulliganSelected.size > 0 ? { scale: 1.05 } : {}}
                whileTap={mulliganSelected.size > 0 ? { scale: 0.95 } : {}}
                onClick={() => mulliganSelected.size > 0 && confirmMulligan()}
              >
                确认换卡 ({mulliganSelected.size})
              </motion.button>
            </div>
          </motion.div>
        </motion.div>,
        document.body
      )}

      {/* 胜负结果 */}
      {battle.winner && (() => {
        const stats = battle.battleStatsRef.current
        const won = battle.winner === 'player'
        const reward = { coins: won ? 100 + stats.quizCorrect * 10 : 40 + stats.quizCorrect * 5 }
        return createPortal(
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="text-center max-w-sm mx-4"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10 }}
            >
              {/* Title */}
              <motion.div
                className={`text-5xl font-black mb-2 ${won ? 'text-yellow-400' : 'text-red-400'}`}
                animate={won ? { textShadow: ['0 0 20px rgba(255,215,0,0.5)', '0 0 40px rgba(255,215,0,0.8)', '0 0 20px rgba(255,215,0,0.5)'] } : {}}
                transition={won ? { duration: 2, repeat: Infinity } : {}}
              >
                {won ? '🏆 胜利！' : '💀 败北…'}
              </motion.div>
              <div className="text-gray-400 text-sm mb-4">
                {won ? '太厉害了！你的生物英雄赢了！' : '别灰心，下次一定能赢！'}
              </div>

              {/* Stats */}
              <div className="bg-gray-800/80 rounded-xl p-4 mb-4 text-left">
                <div className="text-xs text-gray-500 mb-2 text-center font-bold">📊 战斗统计</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-400">⚔️ 总伤害</span>
                  <span className="text-white text-right font-bold">{stats.totalDamage.toLocaleString()}</span>
                  <span className="text-gray-400">💀 击杀数</span>
                  <span className="text-white text-right font-bold">{stats.kills}</span>
                  <span className="text-gray-400">🃏 出牌数</span>
                  <span className="text-white text-right font-bold">{stats.cardsPlayed}</span>
                  <span className="text-gray-400">🧠 答题</span>
                  <span className="text-white text-right font-bold">{stats.quizCorrect}/{stats.quizTotal}</span>
                  {stats.spSummons > 0 && <>
                    <span className="text-gray-400">🌟 SP召唤</span>
                    <span className="text-yellow-400 text-right font-bold">{stats.spSummons}</span>
                  </>}
                  {stats.powerBankMax > 0 && <>
                    <span className="text-gray-400">⚡ PB最高</span>
                    <span className="text-blue-400 text-right font-bold">{stats.powerBankMax}</span>
                  </>}
                  <span className="text-gray-400">📅 回合数</span>
                  <span className="text-white text-right font-bold">{battle.turn}</span>
                </div>
              </div>

              {/* Reward */}
              <motion.div
                className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl px-4 py-2 mb-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <span className="text-yellow-400 text-sm font-bold">🪙 +{reward.coins} 金币</span>
                {stats.quizCorrect > 0 && (
                  <span className="text-gray-500 text-xs ml-2">(含答题奖励 +{stats.quizCorrect * (won ? 10 : 5)})</span>
                )}
              </motion.div>

              {/* 章节奖励（Boss战首通） */}
              {won && campaignConfig?.stageType === 'boss' && (() => {
                const chapterRewards = {
                  '2-4': '🎁 章节奖励: +500 金币',
                  '3-4': '🎁 章节奖励: +500 金币 +10 钻石',
                  '4-4': '🎁 章节奖励: 科学家🔬称号',
                }
                // 从 campaignConfig 中提取 stageId（通过 stageName 或其他方式）
                const stageId = Object.keys(chapterRewards).find(
                  id => campaignConfig?.stageName === { '2-4': '新冠病毒', '3-4': '蓝鲸巨灵', '4-4': '超级细菌' }[id]
                )
                if (!stageId) return null
                return (
                  <motion.div
                    className="bg-purple-900/30 border border-purple-500/30 rounded-xl px-4 py-2 mb-5"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <div className="text-purple-300 text-xs font-bold">{chapterRewards[stageId]}</div>
                  </motion.div>
                )
              })()}

              {/* Buttons */}
              <div className="flex gap-3 justify-center">
                <motion.button
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl text-white font-bold text-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRestart}
                >
                  🔄 再来一局
                </motion.button>
                <motion.button
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onExit({
                    won,
                    quizCorrect: stats.quizCorrect,
                    turnsPlayed: battle.turn,
                    leaderHPPercent: Math.round((battle.playerLeaderHp / LEADER_HP) * 100),
                  })}
                >
                  {campaignConfig ? '返回闯关' : '返回主菜单'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>,
          document.body
        )
      })()}

      {/* 闯关对话框 */}
      <AnimatePresence>
        {dialoguePhase && currentDialogues && (
          <DialogueBox
            dialogues={currentDialogues}
            currentIdx={dialogueIdx}
            onNext={handleDialogueNext}
            onSkip={handleDialogueSkip}
          />
        )}
      </AnimatePresence>

      {/* 退出确认弹窗 */}
      {showExitConfirm && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70">
          <div className="bg-gray-800 rounded-2xl p-6 mx-4 max-w-sm w-full text-center shadow-2xl border border-gray-600">
            <p className="text-white text-lg font-bold mb-2">退出战斗？</p>
            {campaignConfig && (
              <p className="text-red-400 text-sm mb-4">退出将视为失败，不会获得奖励</p>
            )}
            {!campaignConfig && (
              <p className="text-gray-400 text-sm mb-4">当前战斗进度将丢失</p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                className="px-5 py-2.5 bg-gray-600 hover:bg-gray-500 rounded-xl text-white font-bold text-sm min-h-[44px]"
                onClick={() => setShowExitConfirm(false)}
              >
                继续战斗
              </button>
              <button
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold text-sm min-h-[44px]"
                onClick={() => onExit({
                  won: false,
                  quizCorrect: 0,
                  turnsPlayed: battle.turn,
                  leaderHPPercent: Math.round((battle.playerLeaderHp / LEADER_HP) * 100),
                })}
              >
                确认退出
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 手机竖屏横屏提示 */}
      <div className="fixed inset-0 z-[999] bg-gray-900/95 flex-col items-center justify-center gap-4" data-landscape-prompt="true">
        <div className="text-6xl animate-bounce">📱</div>
        <p className="text-white text-lg font-bold">请横过来玩！</p>
        <p className="text-gray-400 text-sm">横屏体验更佳</p>
      </div>
    </div>
  )
}
