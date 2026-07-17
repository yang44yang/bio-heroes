import React, { useCallback, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import BattleCard from './Card'
import CardDetailModal from './CardDetailModal'
import QuizModal from './QuizModal'
import { useBattle } from '../hooks/useBattle'
import { useHand } from '../hooks/useHand'
import { useAITurn } from '../hooks/useAITurn'
import { cardHasGuard, attackerBypassesGuard } from '../utils/guardSkill'
// MAX_FIELD_SLOTS 曾在此 import 但全文未使用（死 import）。删掉不是洁癖：
// 它是**伪装色** —— 任何按「有没有 import 常量」判断安全的审计都会把本文件误判为已覆盖，
// 而它恰恰是战场位写死值的重灾区（槽宽 calc + `|| 5` 兜底）。
import { FACTIONS, LEADER_HP } from '../data/deckRules'
import { canPlayWithMarkers, getFactionMarkers } from '../utils/factionMarkers'
import { playSound, toggleMute, isMuted, initAudio } from '../audio/soundManager'
import { playerTestSpDeck, enemyTestSpDeck } from '../data/testDecks'
import DialogueBox from './DialogueBox'
import BattleLogPanel from './BattleLogPanel'
import ConundrumModal from './ConundrumModal'
import { useBattleHints, BattleHintOverlay } from './BattleHints'
import cards from '../data/cards'
import { useLanguage } from '../i18n/LanguageContext'

/**
 * BattleScreen — Sprint 2 完全重写
 *
 * 布局：
 *   敌方主人HP → 敌方战场(5位) → VS → 玩家战场(5位) → 玩家主人HP
 *   → 手牌区 → 操作按钮 → 日志
 */
export default function BattleScreen({ playerDeckCards, enemyDeckCards, playerSpDeckCards, enemySpDeckCards, campaignConfig, testArenaConfig, onExit }) {
  const { t, lang, cardName, localName } = useLanguage()
  const battle = useBattle()
  const playerHand = useHand(playerDeckCards, 'player')
  const enemyHand = useHand(enemyDeckCards, 'enemy')

  // 即时提示系统 (Sprint 21)
  const { showHint, activeHint, dismissHint } = useBattleHints(lang)

  // Sprint 27: 揭示手牌浮窗状态
  const [revealedCards, setRevealedCards] = useState(null)

  // Sprint 27: 把手牌引用注入 useBattle
  useEffect(() => {
    if (battle.setHandRefs) {
      battle.setHandRefs({
        playerHand: playerHand.hand,
        enemyHand: enemyHand.hand,
        drawCards: playerHand.draw,
        aiDrawCards: enemyHand.draw,
        // 决策D：手牌变更函数，供 onPlay 技能的 _removeFromHand / _reviveToHand 消费
        playerAddToHand: playerHand.addToHand,
        enemyAddToHand: enemyHand.addToHand,
        playerPlayCard: playerHand.playCard,
        enemyPlayCard: enemyHand.playCard,
      })
    }
  }, [playerHand.hand, enemyHand.hand, playerHand.draw, enemyHand.draw, battle.setHandRefs])

  // Sprint 27: 监听 skillEvents，遇到 REVEAL_HAND 时显示浮窗
  // Sprint 28 bugfix: 玩家触发的浮窗不自动消失（等用户点确认）；AI 触发的 3 秒自动消失
  const lastRevealRef = useRef(0)
  useEffect(() => {
    const events = battle.skillEvents || []
    for (let i = lastRevealRef.current; i < events.length; i++) {
      const evt = events[i]
      if (evt.type === 'REVEAL_HAND' && evt.cards && evt.cards.length > 0) {
        const normalized = evt.cards.map(c => typeof c === 'string' ? { name: c } : c)
        const initiator = evt._initiatorSide || 'player'
        setRevealedCards({ cards: normalized, source: evt.source, initiator })
        if (initiator === 'enemy') {
          // 敌方触发：玩家已知自己手牌，3 秒自动消失
          setTimeout(() => setRevealedCards(null), 3000)
        }
        // 玩家触发：等用户点击"我看好了 ✓"按钮
      }
    }
    lastRevealRef.current = events.length
  }, [battle.skillEvents])

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
  const [detailCard, setDetailCard] = useState(null)
  const [showBattleLog, setShowBattleLog] = useState(false)
  // Conundrum：如果关卡有 conundrum 配置且尚未完成，先弹 modal 阻塞战斗初始化
  const [conundrumPending, setConundrumPending] = useState(campaignConfig?.conundrum || null)
  const [conundrumEffect, setConundrumEffect] = useState(null)
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
    const pField = battle.latest.playerField
    const eField = battle.latest.enemyField
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
    // Conundrum 未完成 → 等用户做完选择再初始化（modal onComplete 后再触发本 effect）
    if (conundrumPending) return
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
    // 应用 Conundrum effect（HP bonus + 预置敌方单位）到 startBattle 入参
    const eff = conundrumEffect || {}
    // preplaceEnemyCards: 把 ID 数组转成卡牌对象数组（等待期间病毒已扩散到战场）
    const preplaceEnemyCards = Array.isArray(eff.preplaceEnemyCards)
      ? eff.preplaceEnemyCards.map(id => {
          const found = cards.find(c => c.id === id)
          return found ? { ...found } : null
        }).filter(Boolean)
      : null
    // Conundrum globalEffect: 字符串 → 数组（startBattle 接受数组）
    const globalEffects = eff.globalEffect ? [eff.globalEffect] : []
    battle.startBattle({
      player: playerSpDeckCards || playerTestSpDeck,
      enemy: enemySp,
      enemyLeaderHP: (campaignConfig?.leaderHP || 0) + (eff.enemyLeaderHpBonus || 0) || campaignConfig?.leaderHP,
      playerLeaderHP: eff.playerLeaderHpBonus ? LEADER_HP + eff.playerLeaderHpBonus : undefined,
      campaignConfig,
      bossPreplaced: bossPreplacedCard,
      preplaceEnemyCards,
      globalEffects,
      // 🧪 测试场：直接摆盘到双方战场 + 满能量开局（testArenaConfig 缺省时全 undefined → 普通对战零影响）
      testPlayerField: testArenaConfig?.playerField,
      testEnemyField: testArenaConfig?.enemyField,
      playerStartEnergy: testArenaConfig?.startEnergy,
      enemyStartEnergy: testArenaConfig?.startEnergy,
    })
    // Conundrum 起手手牌奖励：在 initHand 之后追加
    if (eff.playerStartingBonus?.card) {
      const found = cards.find(c => c.id === eff.playerStartingBonus.card)
      if (found) {
        const count = eff.playerStartingBonus.count || 1
        const extras = Array(count).fill(null).map(() => ({ ...found }))
        if (playerHand.addToHand) playerHand.addToHand(extras)
      }
    }
    if (eff.playerStartingHandBonus?.filter) {
      const { filter, count = 1 } = eff.playerStartingHandBonus
      // 从玩家卡库（playerDeckCards）里筛选指定阵营的卡，补到起手
      const candidates = (playerDeckCards || []).filter(c => c.faction === filter)
      if (candidates.length > 0) {
        const extras = Array(count).fill(null).map((_, i) => ({ ...candidates[i % candidates.length] }))
        if (playerHand.addToHand) playerHand.addToHand(extras)
      }
    }
  }, [conundrumPending, conundrumEffect])

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
      // 关卡特殊规则浮字（蚊虫/深海压力/隐身/孢子/警报）—— stageRules 发 STAGE_RULE 事件，此前无消费分支被静默丢弃
      if (evt.type === 'STAGE_RULE') {
        showFloat('enemy', -1, evt.text, evt.color || 'text-cyan-400')
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

      // Sprint 30b: 如果 Conundrum preplaceEnemyCards 已经放了敌方单位，跳过额外起手出牌
      if (Array.isArray(conundrumEffect?.preplaceEnemyCards) && conundrumEffect.preplaceEnemyCards.length > 0) {
        return
      }

      const hand = enemyHand.hand
      // 回合1能量=1，只能出费用≤1的卡，最多1张
      const affordable = hand.filter(c => c.cost <= 1)
      const toPlace = affordable.slice(0, 1) // 最多1张（能量只够1）
      if (toPlace.length > 0) {
        // Sprint 30b: 不要覆盖已存在的 field card（preplaceEnemyCards 占了 0/1 slot）
        toPlace.forEach((c, i) => {
          // 找首个空 slot
          const enemyField = battle.latest.enemyField || []
          let slotIdx = i
          while (slotIdx < enemyField.length && enemyField[slotIdx]) slotIdx++
          if (slotIdx < enemyField.length) {
            // S4：aiPlayToField 已删（de-fork）。这里**不能**走统一的 playToField ——
            // 它跑在玩家的相位里（activeSide='player'、enemy.phase='ended'），
            // 会被 gate 正确地拒掉。它本就是个作弊者：绕过规则凭空摆一张卡。
            // ⚠️ triggerOnPlay:true 是为了**逐字节保持既有行为** —— 旧的 aiPlayToField
            //   会触发 onPlay，而 cost≤1 的生物卡 24 张里有 11 张带 onPlay 技能。
            // ⚠️ fatigued:true 同理（旧路径无条件 MARK_SUMMONED）。
            battle.preplaceCard('enemy', c, slotIdx, { fatigued: true, triggerOnPlay: true })
            // ⚠️ 日志由调用方负责（作弊者的叙述归调用方 —— 同 startBattle 里 Conundrum
            //   入侵者那句「🦠 等待期间…」的约定）。**逐字保持旧 aiPlayToField 的文案**：
            //   漏了它，这张卡就凭空出现在敌方场上、没有任何日志解释 —— 对七岁孩子就是
            //   「这卡哪来的」。实机验证时确实漏过一次，是看日志开头才发现的。
            battle.addLog(`🔴 敌方出牌：${c.name}（费用 ${c.cost}）→ 位置 ${slotIdx + 1}`)
            enemyHand.playCard(c.uid)
          }
        })
      }
    }
  }, [enemyHand.hand])

  // 敌方 AI 完整回合（出牌 → 攻击 → 结束）抽到 useAITurn（决策E4）。触发 battle.phase === "enemyTurn"。
  useAITurn({ battle, enemyHand, playerHand, campaignConfig, showFloat, showDamageFloat, t })

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
      if (result.atkFactionBonus) setTimeout(() => showFloat('enemy', defSlot, t('battle.float.superEffective'), 'text-green-400'), 200)
      if (result.defFactionBonus) setTimeout(() => showFloat('player', atkSlot, t('battle.float.resisted'), 'text-red-400'), 200)
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
      setAwakenText(opts.scientistTriggered ? t('battle.scientistAwaken') : t('battle.awaken'))
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

  // === 即时提示触发（Sprint 21）===
  const hintTurnRef = useRef(0)
  useEffect(() => {
    if (battle.turn <= hintTurnRef.current) return
    hintTurnRef.current = battle.turn
    // 第一次看到 Power Bank (turn 2+, PB intact)
    if (battle.turn === 2 && battle.playerPowerBank?.intact) showHint('power_bank')
    // 第一次手牌有锁定的 SSR
    const hasLockedSSR = playerHand.hand.some(c => c.rarity === 'SSR' && c.factionRequirement)
    if (hasLockedSSR) showHint('ssr_locked')
  }, [battle.turn, battle.playerPowerBank, playerHand.hand, showHint])

  useEffect(() => {
    // 第一次遇到守护卡
    if (isBattlePhase && battle.enemyField.some(c => c && c.currentHp > 0 && cardHasGuard(c))) {
      showHint('guard')
    }
  }, [isBattlePhase, battle.enemyField, showHint])

  // 攻击目标判定
  const hasEnemyGuard = battle.enemyField.some(c => c && c.currentHp > 0 && cardHasGuard(c))
  // 当前选中的攻击卡（用于「无视守护」放行选靶）
  const selectedAttacker = selectedAtkSlot !== null ? battle.playerField[selectedAtkSlot] : null
  const enemyLeaderTargetable = isBattlePhase && selectedAtkSlot !== null
    && (!hasEnemyGuard || attackerBypassesGuard(selectedAttacker, null))
  const enemyAlive = battle.enemyField.filter((c, i) => c && c.currentHp > 0).map((c, i) => {
    const realIdx = battle.enemyField.findIndex((cc, ii) => cc === c && ii >= 0)
    return realIdx
  })
  // 对面存活卡牌的 slot indexes（用于 Bug 4 高亮）
  const validEnemyTargets = isBattlePhase && selectedAtkSlot !== null
    ? (hasEnemyGuard
        // 有守护：守护卡始终可选；无视守护的攻击者还可越过打非守护卡
        ? battle.enemyField.map((c, i) => {
            if (!c || c.currentHp <= 0) return -1
            if (cardHasGuard(c)) return i
            if (attackerBypassesGuard(selectedAttacker, c) && !c.statuses?.some(s => s.type === 'stealth')) return i
            return -1
          }).filter(i => i >= 0)
        : battle.enemyField.map((c, i) => c && c.currentHp > 0 && !c.statuses?.some(s => s.type === 'stealth') ? i : -1).filter(i => i >= 0))
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
        <span className="text-[9px] sm:text-[11px] text-gray-500 w-10 sm:w-16 shrink-0">
          {side === 'player' ? t('battle.pb.player') : t('battle.pb.enemy')}
        </span>
        <div className="flex-1 h-4 sm:h-5 rounded-full overflow-hidden relative" data-pb-bar
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
          <span className="absolute inset-0 flex items-center justify-center text-[9px] sm:text-[11px] font-black text-white"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            {intact ? (stored > 0 ? `⚡${stored}` : '') : t('battle.pb.broken')}
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
            {t('battle.pb.break')}
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
              <span className={`text-xs sm:text-sm font-medium ${nameColor}`}>{isEnemy ? t('battle.enemy') : t('battle.you')}</span>
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

      {/* 即时提示 (Sprint 21) */}
      <BattleHintOverlay hint={activeHint} onDismiss={dismissHint} />

      {/* Sprint 27 / 28: 揭示手牌浮窗 — 玩家触发需点击确认，AI 触发 3 秒自动消失 */}
      <AnimatePresence>
        {revealedCards && (
          <motion.div
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[85] max-w-md w-[90%]"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="bg-gray-900/95 border border-cyan-500/60 rounded-xl px-4 py-3 shadow-lg shadow-cyan-900/40">
              <div className="text-xs text-cyan-300 mb-2 text-center">
                🔍 {revealedCards.source} {
                  revealedCards.initiator === 'enemy'
                    ? (lang === 'en' ? 'revealed YOUR hand' : '揭示了你的手牌')
                    : (lang === 'en' ? 'revealed enemy hand' : '揭示了对方手牌')
                }！
              </div>
              <div className="flex gap-2 flex-wrap justify-center mb-3">
                {revealedCards.cards.map((card, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg px-2.5 py-1.5 border border-gray-600 text-center min-w-[72px]">
                    <div className="text-lg">{FACTIONS[card.faction]?.icon || '❓'}</div>
                    <div className="text-[11px] text-white font-bold truncate max-w-[96px]">
                      {lang === 'en' && card.nameEn ? card.nameEn : (card.name || '?')}
                    </div>
                    <div className="text-[9px] text-gray-400">
                      {card.cost != null ? `⚡${card.cost}` : ''}{card.rarity ? ` · ${card.rarity}` : ''}
                    </div>
                  </div>
                ))}
              </div>
              {/* 玩家触发时显示确认按钮 — Sprint 28 */}
              {revealedCards.initiator !== 'enemy' && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setRevealedCards(null)}
                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-bold transition shadow-md"
                  >
                    {lang === 'en' ? 'Got it ✓' : '我看好了 ✓'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            onClick={() => setShowBattleLog(true)}
            title={t('battle.viewLog')}
          >
            📜
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
          <span className="text-red-400/60 hidden sm:inline">{t('battle.enemyHand')}{enemyHand.hand.length}</span>
          {isMainPhase && <span className="text-green-400 font-bold animate-pulse text-[10px] sm:text-sm">{t('battle.playPhase')}</span>}
          {isBattlePhase && <span className="text-red-400 font-bold animate-pulse text-[10px] sm:text-sm">{t('battle.battlePhase')}</span>}
          {battle.phase === 'enemyTurn' && <span className="text-orange-400 font-bold animate-pulse text-[10px] sm:text-sm">{t('battle.enemyTurn')}</span>}
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
            <span className="text-purple-300">{t('battle.scientistMode')}</span>
            <span className="text-gray-400 text-xs ml-2">{t('battle.scientistModeDesc', { n: battle.scientistMode.turnsLeft })}</span>
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
              {battle.activeEnvEvent.event.emoji} {localName(battle.activeEnvEvent.event)}
            </span>
            <span className="text-gray-500 ml-2">{t('battle.envRemaining', { n: battle.activeEnvEvent.turnsLeft })}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 敌方主人面板 */}
      <LeaderPanel
        isEnemy={true}
        currentHP={battle.enemyLeaderHp}
        maxHP={(campaignConfig?.leaderHP || LEADER_HP) + Math.max(0, conundrumEffect?.enemyLeaderHpBonus || 0)}
        isAttackTarget={enemyLeaderTargetable}
        dimmed={isBattlePhase && selectedAtkSlot !== null && hasEnemyGuard}
        onClick={handleAttackLeader}
        floats={floatingDmgs.filter(f => f.side === 'enemy' && f.slot === -1)}
      />

      {/* 敌方 Power Bank */}
      <div className="flex-none py-1"><PowerBankBar powerBank={battle.enemyPowerBank} side="enemy" canBreak={false} /></div>

      {/* 敌方战场 */}
      <div className="flex-1 min-h-0 max-h-[25vh] flex items-end justify-center gap-1 sm:gap-2 px-1 py-2" data-field-area="true">
        {battle.enemyField.map((card, i) => {
          const isValid = validEnemyTargets.includes(i)
          const isTargeting = isBattlePhase && selectedAtkSlot !== null
          const isDimmedTarget = isTargeting && card && card.currentHp > 0 && !isValid
          return (
          <div
            key={i}
            className={`relative flex-1 min-w-0 h-full rounded-lg sm:rounded-xl border-2 border-dashed flex items-center justify-center transition-opacity
              ${isTargeting && isValid && card && card.currentHp > 0
                ? 'border-red-400 cursor-pointer hover:border-red-300'
                : card && card.currentHp > 0 ? 'border-gray-600' : 'border-gray-700'
              } ${isDimmedTarget ? 'opacity-50' : ''}`}
            {...(isTargeting && isValid && card && card.currentHp > 0 ? { 'data-attack-target': 'true' } : {})}
            onClick={() => isTargeting && isValid && card && card.currentHp > 0 && handleSelectTarget(i)}
          >
            {card && card.currentHp > 0 ? (
              <>
                <BattleCard card={card} hp={card.currentHp} maxHp={card.maxHp} isPlayer={false} isActive={false} />
                <button
                  onClick={(e) => { e.stopPropagation(); setDetailCard(card) }}
                  className="absolute top-0.5 right-0.5 z-30 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-cyan-600/90 hover:bg-cyan-500 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center shadow-lg border border-cyan-300/60"
                  aria-label={t('common.details')}
                >
                  ⓘ
                </button>
              </>
            ) : (
              <span className="text-gray-700 text-[9px] sm:text-xs">{t('battle.empty')}</span>
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
      <div className="flex-none text-center text-sm sm:text-2xl font-black text-red-500 py-1.5" data-vs-divider="true">⚔️</div>

      {/* 玩家战场 */}
      <div className="flex-1 min-h-0 max-h-[25vh] flex items-start justify-center gap-1 sm:gap-2 px-1 py-2" data-field-area="true">
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
            className={`relative flex-1 min-w-0 h-full rounded-lg sm:rounded-xl border-2 border-dashed flex items-center justify-center transition-all
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
              <>
                <BattleCard card={card} hp={card.currentHp} maxHp={card.maxHp} isPlayer={true} isActive={isAttacker} />
                <button
                  onClick={(e) => { e.stopPropagation(); setDetailCard(card) }}
                  className="absolute top-0.5 right-0.5 z-30 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-cyan-600/90 hover:bg-cyan-500 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center shadow-lg border border-cyan-300/60"
                  aria-label={t('common.details')}
                >
                  ⓘ
                </button>
              </>
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
      <div className="flex-none py-1"><PowerBankBar powerBank={battle.playerPowerBank} side="player" canBreak={isMainPhase} /></div>

      {/* 弃牌堆阵营标记 */}
      {(() => {
        const markers = getFactionMarkers(battle.playerDiscard)
        const total = battle.playerDiscard.length
        if (total === 0) return null
        return (
          <div className="flex-none flex items-center gap-1 sm:gap-2 text-[8px] sm:text-[10px] text-gray-500 px-1" data-info-row="true">
            <span>{t('battle.discard')}({total}):</span>
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
        maxHP={LEADER_HP + Math.max(0, conundrumEffect?.playerLeaderHpBonus || 0)}
        isAttackTarget={false}
        dimmed={false}
        onClick={null}
        floats={floatingDmgs.filter(f => f.side === 'player' && f.slot === -1)}
        style={isBattlePhase && selectedAtkSlot !== null ? { opacity: 0.8 } : {}}
      />

      {/* SP 卡区域 */}
      {(battle.playerSpDeck.length > 0 || battle.enemySpDeck.length > 0) && (
        <div className="flex-none flex justify-between items-center text-[8px] sm:text-[10px] text-gray-500 px-1" data-info-row="true">
          <span>{t('battle.sp.player')}:{battle.playerSpDeck.length}</span>
          <span>{t('battle.sp.enemy')}:{battle.enemySpDeck.length}</span>
        </div>
      )}

      {/* 手牌区 */}
      <div className={`shrink-0 flex flex-col ${isBattlePhase && selectedAtkSlot !== null ? 'opacity-60' : ''}`} data-hand-area="true">
        <div className="flex items-center gap-1 sm:gap-2 px-1">
          <span className="text-[10px] sm:text-xs text-gray-400">{t('battle.hand')}({playerHand.hand.length})</span>
          <span className="text-[10px] sm:text-xs text-gray-600">{t('battle.deckPile')}{playerHand.drawPileCount}</span>
          {isMainPhase && selectedHandIdx !== null && playerHand.hand[selectedHandIdx]?.type === 'event' && (
            <motion.button
              className="px-2 py-0.5 text-[10px] sm:text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg min-h-[28px] sm:min-h-0"
              whileTap={{ scale: 0.9 }}
              onClick={() => handlePlayCard(-1)}
            >
              {t('battle.useEvent')}
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
                {t('battle.endPlay')}
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
                {t('battle.endTurn')}
              </motion.button>
            )}
            {isBattlePhase && selectedAtkSlot !== null && (
              <span className="text-[10px] text-yellow-300">{t('battle.selectTarget')}</span>
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
                className={`relative flex-none w-[22%] sm:w-[15%] lg:w-[13%] aspect-[5/7] max-h-[110px] cursor-pointer transition-transform snap-start ${
                  selectedHandIdx === i ? 'scale-105 ring-2 ring-green-400 rounded-lg sm:rounded-xl' : ''
                } ${isMainPhase && canAfford && markerOk ? 'opacity-100' : 'opacity-50'}`}
                onClick={() => {
                  if (!isMainPhase) return
                  // 提示不可出牌原因
                  if (!markerOk && card.factionRequirement) {
                    const f = FACTIONS[card.factionRequirement.faction]
                    const markers = getFactionMarkers(battle.playerDiscard)
                    const have = markers[card.factionRequirement.faction] || 0
                    setLockToast({ text: t('battle.lockNeedFaction', { icon: f.icon, need: card.factionRequirement.count, name: localName(f), have }), key: Date.now() })
                    return
                  }
                  if (!canAfford) {
                    setLockToast({ text: t('battle.lockNeedEnergy', { cost: card.cost, current: battle.playerEnergy }), key: Date.now() })
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
                <button
                  onClick={(e) => { e.stopPropagation(); setDetailCard(card) }}
                  className="absolute -top-1 -right-1 z-30 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-cyan-600/90 hover:bg-cyan-500 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center shadow-lg border border-cyan-300/60"
                  aria-label={t('common.details')}
                >
                  ⓘ
                </button>
                {card.factionRequirement && !canPlayWithMarkers(card, battle.playerDiscard) && (() => {
                  const f = FACTIONS[card.factionRequirement.faction]
                  const have = getFactionMarkers(battle.playerDiscard)[card.factionRequirement.faction] || 0
                  const need = card.factionRequirement.count
                  return (
                    <div
                      className="absolute top-0.5 right-0.5 text-[9px] bg-black/70 text-yellow-300 px-1 py-0.5 rounded font-bold whitespace-nowrap z-10"
                      title={t('battle.factionReqTip', { need, name: f?.name, have })}
                    >
                      🔒{f?.icon}{have}/{need}
                    </div>
                  )
                })()}
              </div>
            )
          })}
          {playerHand.hand.length === 0 && (
            <div className="text-gray-600 text-[10px] sm:text-xs py-2">{t('battle.handEmpty')}</div>
          )}
        </div>
      </div>

      {/* 底部战斗日志 */}
      {/* 战斗日志（紧凑：只在桌面显示，最多2行） */}
      <div className="flex-none hidden sm:block py-0.5" data-control-bar="true">
        <div ref={logRef} className="bg-gray-800/60 rounded-lg p-1 max-h-10 overflow-y-auto text-[9px] space-y-0.5" data-battle-log="true">
          {battle.battleLog.slice(-3).map((log, i) => (
            <div key={i} className="text-gray-300 truncate">{log}</div>
          ))}
        </div>
      </div>

      {/* 问答弹窗 — 用 Portal 避免 z-index 问题 */}
      {battle.currentQuiz && createPortal(
        <QuizModal quiz={battle.currentQuiz} onAnswer={handleQuizAnswer} />,
        document.body
      )}

      {/* SP 召唤选择弹窗 —— **只为玩家自己弹**。
          ⚠️ `pendingSpSummon` 的形状本来就是 `{ side, candidates }`（useBattle 的注释写着），
             但这里此前**没读 side**。今天无害（引擎的两个写入点都硬编码 side:'player'），
             可一旦引擎能为 enemy 设它，齐齐屏幕上就会弹出一个 z-[160] 全屏选择器、
             让他替 AI 选牌，**而且对局会阻塞在这里等他点**。
             这道过滤必须先于任何引擎改动落地（S6 的顺序）。 */}
      {battle.pendingSpSummon?.side === 'player' && createPortal(
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
            <h2 className="text-xl font-bold text-yellow-400 text-center mb-2">{t('sp.title')}</h2>
            <p className="text-gray-400 text-sm text-center mb-4">
              {t('sp.desc')}
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
                {t('sp.skip')}
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
              🌍 {localName(battle.pendingEnvEvent)}
            </h2>
            <p className="text-sm text-gray-300 text-center mb-3">
              {battle.pendingEnvEvent.description}
            </p>
            <div className="bg-gray-800/80 rounded-xl p-3 mb-4 text-xs text-gray-400 leading-relaxed">
              📖 {battle.pendingEnvEvent.scienceNote}
            </div>
            {battle.pendingEnvEvent.duration > 0 && (
              <p className="text-center text-[10px] text-amber-500/70 mb-3">
                {t('env.duration', { n: battle.pendingEnvEvent.duration })}
              </p>
            )}
            <div className="text-center">
              <motion.button
                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-sm"
                whileTap={{ scale: 0.95 }}
                onClick={() => battle.dismissEnvEvent()}
              >
                {t('env.confirm')}
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
            <h2 className="text-xl font-bold text-yellow-400 text-center mb-2">{t('mulligan.title')}</h2>
            <p className="text-gray-400 text-sm text-center mb-4">
              {t('mulligan.desc')}
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
                        {t('mulligan.expensive')}
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>

            <div className="text-center text-xs text-gray-500 mb-4">
              {t('mulligan.selected', { n: mulliganSelected.size })}
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
                {t('mulligan.skip')}
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
                {t('mulligan.confirm', { n: mulliganSelected.size })}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>,
        document.body
      )}

      {/* 胜负结果 */}
      {battle.winner && (() => {
        const stats = battle.latest.battleStats
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
                {won ? t('battle.victory') : t('battle.defeat')}
              </motion.div>
              <div className="text-gray-400 text-sm mb-4">
                {won ? t('battle.victoryMsg') : t('battle.defeatMsg')}
              </div>

              {/* Stats */}
              <div className="bg-gray-800/80 rounded-xl p-4 mb-4 text-left">
                <div className="text-xs text-gray-500 mb-2 text-center font-bold">{t('battle.stats')}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-gray-400">{t('battle.stats.damage')}</span>
                  <span className="text-white text-right font-bold">{stats.totalDamage.toLocaleString()}</span>
                  <span className="text-gray-400">{t('battle.stats.kills')}</span>
                  <span className="text-white text-right font-bold">{stats.kills}</span>
                  <span className="text-gray-400">{t('battle.stats.cardsPlayed')}</span>
                  <span className="text-white text-right font-bold">{stats.cardsPlayed}</span>
                  <span className="text-gray-400">{t('battle.stats.quiz')}</span>
                  <span className="text-white text-right font-bold">{stats.quizCorrect}/{stats.quizTotal}</span>
                  {stats.spSummons > 0 && <>
                    <span className="text-gray-400">{t('battle.stats.spSummons')}</span>
                    <span className="text-yellow-400 text-right font-bold">{stats.spSummons}</span>
                  </>}
                  {stats.powerBankMax > 0 && <>
                    <span className="text-gray-400">{t('battle.stats.pbMax')}</span>
                    <span className="text-blue-400 text-right font-bold">{stats.powerBankMax}</span>
                  </>}
                  <span className="text-gray-400">{t('battle.stats.turns')}</span>
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
                <span className="text-yellow-400 text-sm font-bold">{t('battle.reward.coins', { n: reward.coins })}</span>
                {stats.quizCorrect > 0 && (
                  <span className="text-gray-500 text-xs ml-2">{t('battle.reward.quizBonus', { n: stats.quizCorrect * (won ? 10 : 5) })}</span>
                )}
              </motion.div>

              {/* 章节奖励（Boss战首通） */}
              {won && campaignConfig?.stageType === 'boss' && (() => {
                const chapterRewards = {
                  'stage_2_8': t('battle.chapterReward.2-4'),
                  'stage_3_8': t('battle.chapterReward.3-4'),
                  'stage_4_8': t('battle.chapterReward.4-4'),
                }
                // 从 campaignConfig 中提取 stageId（通过 stageName 匹配 Boss 名）
                const stageId = Object.keys(chapterRewards).find(
                  id => campaignConfig?.stageName === { 'stage_2_8': '新冠病毒', 'stage_3_8': '蓝鲸巨灵', 'stage_4_8': '超级细菌' }[id]
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
                  {t('battle.rematch')}
                </motion.button>
                <motion.button
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-bold text-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onExit({
                    won,
                    quizCorrect: stats.quizCorrect,
                    quizTotal: stats.quizTotal,
                    turnsPlayed: battle.turn,
                    leaderHPPercent: Math.round((battle.playerLeaderHp / LEADER_HP) * 100),
                  })}
                >
                  {campaignConfig ? t('battle.backCampaign') : t('battle.backMenu')}
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

      <BattleLogPanel
        logs={battle.battleLog}
        open={showBattleLog}
        onClose={() => setShowBattleLog(false)}
      />

      {conundrumPending && (
        <ConundrumModal
          conundrum={conundrumPending}
          lang={lang}
          onComplete={(effect) => {
            setConundrumEffect(effect || {})
            setConundrumPending(null)
          }}
        />
      )}

      {/* 退出确认弹窗 */}
      {showExitConfirm && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70">
          <div className="bg-gray-800 rounded-2xl p-6 mx-4 max-w-sm w-full text-center shadow-2xl border border-gray-600">
            <p className="text-white text-lg font-bold mb-2">{t('battle.exit.title')}</p>
            {campaignConfig && (
              <p className="text-red-400 text-sm mb-4">{t('battle.exit.campaign')}</p>
            )}
            {!campaignConfig && (
              <p className="text-gray-400 text-sm mb-4">{t('battle.exit.normal')}</p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                className="px-5 py-2.5 bg-gray-600 hover:bg-gray-500 rounded-xl text-white font-bold text-sm min-h-[44px]"
                onClick={() => setShowExitConfirm(false)}
              >
                {t('battle.exit.continue')}
              </button>
              <button
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold text-sm min-h-[44px]"
                onClick={() => onExit({
                  won: false,
                  quizCorrect: 0,
                  quizTotal: 0,
                  turnsPlayed: battle.turn,
                  leaderHPPercent: Math.round((battle.playerLeaderHp / LEADER_HP) * 100),
                })}
              >
                {t('battle.exit.confirm')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {detailCard && createPortal(
        <CardDetailModal
          card={detailCard}
          context="battle"
          onClose={() => setDetailCard(null)}
        />,
        document.body
      )}

      {/* 手机竖屏横屏提示 */}
      <div className="fixed inset-0 z-[999] bg-gray-900/95 flex-col items-center justify-center gap-4" data-landscape-prompt="true">
        <div className="text-6xl animate-bounce">📱</div>
        <p className="text-white text-lg font-bold">{t('battle.landscape')}</p>
        <p className="text-gray-400 text-sm">{t('battle.landscapeHint')}</p>
      </div>
    </div>
  )
}
