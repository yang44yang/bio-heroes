import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BattleCard from './Card'
import { FACTIONS, MAX_FIELD_SLOTS, FACTION_ADVANTAGE, FACTION_ADVANTAGE_BONUS } from '../data/deckRules'
import {
  TUTORIAL_LEVELS, BASIC_LEVELS, ADVANCED_LEVELS,
  loadTutorialProgress, saveTutorialProgress,
} from '../data/tutorialData'
import { useLanguage } from '../i18n/LanguageContext'

// ================================================================
//  TutorialScreen — 教学模块
//  5个渐进式教学关卡，预设手牌/场面/脚本AI
// ================================================================

export default function TutorialScreen({ onExit, onExitToCampaign, onGraduate, economy, initialLevel }) {
  const { t, lang } = useLanguage()
  // 英文时优先取 xxxEn 字段
  const loc = (obj, field) => (lang === 'en' && obj[field + 'En']) ? obj[field + 'En'] : obj[field]
  // 是否从闯关进入（有 initialLevel）
  const fromCampaign = initialLevel != null
  // === 教学进度 ===
  const [progress, setProgress] = useState(() => loadTutorialProgress())
  const [currentLevelIdx, setCurrentLevelIdx] = useState(null) // null = 关卡选择界面
  const [phase, setPhase] = useState('intro') // intro | battle | summary | graduation

  // === 当前关卡的战斗状态 ===
  const [stepIdx, setStepIdx] = useState(0)
  const [playerHand, setPlayerHand] = useState([])
  const [playerField, setPlayerField] = useState([null, null, null, null, null])
  const [enemyField, setEnemyField] = useState([null, null, null, null, null])
  const [playerEnergy, setPlayerEnergy] = useState(0)
  const [maxEnergy, setMaxEnergy] = useState(0)
  const [playerLeaderHp, setPlayerLeaderHp] = useState(30000)
  const [enemyLeaderHp, setEnemyLeaderHp] = useState(30000)
  const [powerBank, setPowerBank] = useState({ stored: 0, intact: true })
  const [playerDiscard, setPlayerDiscard] = useState([])
  const [playerSpDeck, setPlayerSpDeck] = useState([])
  const [summonedThisTurn, setSummonedThisTurn] = useState(new Set())
  const [attackedThisTurn, setAttackedThisTurn] = useState(new Set())
  const [selectedHandIdx, setSelectedHandIdx] = useState(null)
  const [selectedAtkSlot, setSelectedAtkSlot] = useState(null)
  const [turn, setTurn] = useState(1)

  // Floating damage text
  const [floatingDmgs, setFloatingDmgs] = useState([])
  const floatIdRef = useRef(0)
  const showFloat = useCallback((side, slot, text, color = 'text-red-400') => {
    const id = ++floatIdRef.current
    setFloatingDmgs(prev => [...prev, { id, side, slot, text, color }])
    setTimeout(() => setFloatingDmgs(prev => prev.filter(f => f.id !== id)), 1200)
  }, [])

  const level = currentLevelIdx !== null ? TUTORIAL_LEVELS[currentLevelIdx] : null
  const currentStep = level ? level.steps[stepIdx] : null

  // === 初始化关卡 ===
  const startLevel = useCallback((idx) => {
    const lv = TUTORIAL_LEVELS[idx]
    setCurrentLevelIdx(idx)
    setStepIdx(0)
    setPlayerHand(lv.getPlayerHand())
    setPlayerField(lv.playerField())
    setEnemyField(lv.getEnemyField())
    setPlayerEnergy(lv.playerEnergy)
    setMaxEnergy(lv.playerEnergy)
    setPlayerLeaderHp(lv.playerLeaderHp)
    setEnemyLeaderHp(lv.enemyLeaderHp)
    setPowerBank({ stored: 0, intact: true })
    setPlayerDiscard([])
    setPlayerSpDeck(lv.getPlayerSpDeck ? lv.getPlayerSpDeck() : [])
    setSummonedThisTurn(new Set())
    setAttackedThisTurn(new Set())
    setSelectedHandIdx(null)
    setSelectedAtkSlot(null)
    setTurn(1)
    setFloatingDmgs([])
    setPhase('intro')
  }, [])

  // === 从闯关跳转时自动开始指定关卡 ===
  const initialLevelHandled = useRef(false)
  useEffect(() => {
    if (initialLevel != null && !initialLevelHandled.current) {
      initialLevelHandled.current = true
      // initialLevel 是 1-5，转为数组索引 0-4
      const idx = TUTORIAL_LEVELS.findIndex(lv => lv.id === initialLevel)
      if (idx >= 0) startLevel(idx)
    }
  }, [initialLevel, startLevel])

  // === 步骤推进 ===
  const advanceStep = useCallback(() => {
    if (!level) return
    const nextIdx = stepIdx + 1
    if (nextIdx >= level.steps.length) {
      // 关卡完成
      setPhase('summary')
      const newProgress = { ...progress }
      if (!newProgress.completedLevels.includes(level.id)) {
        newProgress.completedLevels = [...newProgress.completedLevels, level.id]
      }
      // 全部完成？
      if (newProgress.completedLevels.length >= TUTORIAL_LEVELS.length) {
        newProgress.graduated = true
      }
      setProgress(newProgress)
      saveTutorialProgress(newProgress)
    } else {
      setStepIdx(nextIdx)
      // 检查下一步是否有自动动作
      const nextStep = level.steps[nextIdx]
      if (nextStep.autoAction) {
        setTimeout(() => executeAutoAction(nextStep.autoAction), 600)
      }
    }
  }, [level, stepIdx, progress])

  // === 脚本AI自动动作 ===
  const executeAutoAction = useCallback((action) => {
    switch (action) {
      case 'enemy_attack': {
        // 对手用场上第一张卡攻击玩家第一张卡
        setEnemyField(prev => {
          const atkCard = prev.find(c => c)
          if (!atkCard) return prev
          setPlayerField(pf => {
            const defIdx = pf.findIndex(c => c)
            if (defIdx < 0) return pf
            const next = [...pf]
            const defCard = { ...next[defIdx] }
            defCard.currentHp = Math.max(0, defCard.currentHp - atkCard.atk)
            if (defCard.currentHp <= 0) {
              // 被击败的卡进入弃牌堆
              setPlayerDiscard(d => [...d, defCard])
              next[defIdx] = null
            } else {
              next[defIdx] = defCard
            }
            showFloat('player', defIdx, `-${atkCard.atk}`, 'text-red-400')
            return next
          })
          // 对手卡也受到反伤（如果有守方攻击力）
          return prev
        })
        break
      }
      case 'enemy_kill_cards': {
        // 对手攻击并击杀玩家的前2张卡
        setTimeout(() => {
          setPlayerField(prev => {
            const next = [...prev]
            const killed = []
            for (let i = 0; i < next.length && killed.length < 2; i++) {
              if (next[i]) {
                killed.push(next[i])
                showFloat('player', i, `-${next[i].currentHp}`, 'text-red-400')
                next[i] = null
              }
            }
            setPlayerDiscard(d => [...d, ...killed])
            return next
          })
        }, 300)
        break
      }
      case 'enemy_pass':
      default:
        // 什么都不做
        break
    }
  }, [showFloat])

  // === 玩家操作：出牌 ===
  const handlePlayCard = useCallback((handIdx) => {
    if (!currentStep) return
    const card = playerHand[handIdx]
    if (!card) return

    // 检查能量
    if (card.cost > playerEnergy) return

    // 事件卡处理
    if (card.type === 'event') {
      setPlayerEnergy(e => e - card.cost)
      setPlayerHand(h => h.filter((_, i) => i !== handIdx))
      setPlayerDiscard(d => [...d, card])
      // 事件效果：给自然系 ATK +1500
      if (card.id === 'event_food_chain_burst') {
        setPlayerField(prev => prev.map(c => {
          if (c && c.faction === 'nature') {
            showFloat('player', prev.indexOf(c), 'ATK+1500', 'text-yellow-300')
            return { ...c, atk: c.atk + 1500 }
          }
          return c
        }))
      }
      setSelectedHandIdx(null)
      advanceStep()
      return
    }

    // 找到空位
    const emptySlot = playerField.findIndex(s => s === null)
    if (emptySlot < 0) return

    // 检查阵营标记（关卡5虎鲸）
    if (card.factionRequirement) {
      const markers = {}
      playerDiscard.forEach(c => {
        if (c.faction) markers[c.faction] = (markers[c.faction] || 0) + 1
      })
      const reqFaction = card.factionRequirement.faction
      const reqCount = card.factionRequirement.count
      if ((markers[reqFaction] || 0) < reqCount) return // 标记不够
    }

    setPlayerEnergy(e => e - card.cost)
    setPlayerHand(h => h.filter((_, i) => i !== handIdx))
    setPlayerField(prev => {
      const next = [...prev]
      next[emptySlot] = card
      return next
    })
    setSummonedThisTurn(prev => new Set([...prev, card.uid]))
    setSelectedHandIdx(null)
    advanceStep()
  }, [currentStep, playerHand, playerEnergy, playerField, playerDiscard, advanceStep, showFloat])

  // === 玩家操作：攻击 ===
  const handleAttack = useCallback((atkSlot, defSlot) => {
    const atkCard = playerField[atkSlot]
    const defCard = enemyField[defSlot]
    if (!atkCard || !defCard) return
    if (summonedThisTurn.has(atkCard.uid)) return // 召唤疲劳
    if (attackedThisTurn.has(atkCard.uid)) return // 已攻击

    // 克制加成
    let atkDmg = atkCard.atk
    const advantage = FACTION_ADVANTAGE[atkCard.faction]
    if (advantage?.strong === defCard.faction) {
      atkDmg = Math.floor(atkDmg * (1 + FACTION_ADVANTAGE_BONUS))
      showFloat('player', atkSlot, '克制！+20%', 'text-yellow-300')
    }

    // 互相伤害
    const newDefHp = Math.max(0, defCard.currentHp - atkDmg)
    const newAtkHp = Math.max(0, atkCard.currentHp - defCard.atk)

    showFloat('enemy', defSlot, `-${atkDmg}`, 'text-red-400')
    if (defCard.atk > 0) showFloat('player', atkSlot, `-${defCard.atk}`, 'text-red-400')

    setEnemyField(prev => {
      const next = [...prev]
      if (newDefHp <= 0) {
        next[defSlot] = null
      } else {
        next[defSlot] = { ...defCard, currentHp: newDefHp }
      }
      return next
    })
    setPlayerField(prev => {
      const next = [...prev]
      if (newAtkHp <= 0) {
        setPlayerDiscard(d => [...d, atkCard])
        next[atkSlot] = null
      } else {
        next[atkSlot] = { ...atkCard, currentHp: newAtkHp }
      }
      return next
    })
    setAttackedThisTurn(prev => new Set([...prev, atkCard.uid]))
    setSelectedAtkSlot(null)
    advanceStep()
  }, [playerField, enemyField, summonedThisTurn, attackedThisTurn, showFloat, advanceStep])

  // === 玩家操作：直攻主人 ===
  const handleDirectAttack = useCallback((atkSlot) => {
    const atkCard = playerField[atkSlot]
    if (!atkCard) return
    if (summonedThisTurn.has(atkCard.uid)) return
    // 直攻主人不检查 attackedThisTurn（教学中清场后卡都攻击过了）

    const dmg = atkCard.atk
    setEnemyLeaderHp(prev => Math.max(0, prev - dmg))
    showFloat('enemy', -1, `-${dmg}`, 'text-red-400')
    setAttackedThisTurn(prev => new Set([...prev, atkCard.uid]))
    setSelectedAtkSlot(null)
    advanceStep()
  }, [playerField, summonedThisTurn, attackedThisTurn, showFloat, advanceStep])

  // === 结束回合 ===
  const handleEndTurn = useCallback(() => {
    // 存入Power Bank
    if (powerBank.intact && playerEnergy > 0) {
      setPowerBank(prev => ({ ...prev, stored: prev.stored + playerEnergy }))
    }

    setTurn(t => t + 1)
    const newEnergy = Math.min(maxEnergy + 1, 10)
    setMaxEnergy(newEnergy)
    setPlayerEnergy(newEnergy)
    setSummonedThisTurn(new Set())
    setAttackedThisTurn(new Set())
    setSelectedHandIdx(null)
    setSelectedAtkSlot(null)
    advanceStep()
  }, [playerEnergy, powerBank, maxEnergy, advanceStep])

  // === 打破Power Bank ===
  const handleBreakPowerBank = useCallback(() => {
    if (!powerBank.intact || powerBank.stored <= 0) return
    setPlayerEnergy(e => e + powerBank.stored)
    setPowerBank({ stored: 0, intact: false })
    advanceStep()
  }, [powerBank, advanceStep])

  // === SP召唤 ===
  const handleSummonSp = useCallback(() => {
    if (playerSpDeck.length === 0) return
    const spCard = playerSpDeck[0]
    const emptySlot = playerField.findIndex(s => s === null)
    if (emptySlot < 0) return

    setPlayerField(prev => {
      const next = [...prev]
      next[emptySlot] = { ...spCard, currentHp: spCard.hp, maxHp: spCard.hp, statuses: [] }
      return next
    })
    setPlayerSpDeck([])

    // SP登场效果：全体敌方 -3000
    if (spCard.id === 'sp_trex') {
      setTimeout(() => {
        setEnemyField(prev => prev.map((c, i) => {
          if (!c) return null
          const newHp = Math.max(0, c.currentHp - 3000)
          showFloat('enemy', i, '-3000', 'text-orange-400')
          if (newHp <= 0) return null
          return { ...c, currentHp: newHp }
        }))
        setEnemyLeaderHp(prev => Math.max(0, prev - 3000))
        showFloat('enemy', -1, '-3000', 'text-orange-400')
      }, 200)
    }

    setSummonedThisTurn(prev => new Set([...prev, spCard.uid]))
    advanceStep()
  }, [playerSpDeck, playerField, showFloat, advanceStep])

  // === 点击处理路由 ===
  const handleHandCardClick = useCallback((idx) => {
    if (!currentStep) return
    const w = currentStep.waitFor

    if (w === 'play_card' || w === 'play_all' || w === 'play_event') {
      handlePlayCard(idx)
    } else {
      setSelectedHandIdx(idx)
    }
  }, [currentStep, handlePlayCard])

  const handleFieldCardClick = useCallback((side, slot) => {
    if (!currentStep) return
    const w = currentStep.waitFor

    if (side === 'player') {
      if (w === 'attack' || w === 'direct_attack' || w === 'clear_field') {
        // 选中攻击者
        const card = playerField[slot]
        if (!card) return
        // direct_attack 步骤跳过已攻击检查（教学中清场后所有卡都攻击过了，但仍需直攻主人）
        if (w === 'direct_attack') {
          if (!summonedThisTurn.has(card.uid)) {
            setSelectedAtkSlot(slot)
          }
        } else {
          if (!attackedThisTurn.has(card.uid) && !summonedThisTurn.has(card.uid)) {
            setSelectedAtkSlot(slot)
          }
        }
      }
    } else {
      // 点击敌方卡 — 如果已选中攻击者，执行攻击
      if (selectedAtkSlot !== null && (w === 'attack' || w === 'clear_field')) {
        handleAttack(selectedAtkSlot, slot)
      }
    }
  }, [currentStep, playerField, selectedAtkSlot, handleAttack])

  const handleLeaderClick = useCallback((side) => {
    if (!currentStep) return
    if (side === 'enemy' && selectedAtkSlot !== null &&
        (currentStep.waitFor === 'direct_attack' || currentStep.waitFor === 'clear_field')) {
      handleDirectAttack(selectedAtkSlot)
    }
  }, [currentStep, selectedAtkSlot, handleDirectAttack])

  const handleAcknowledge = useCallback(() => {
    if (!currentStep) return
    if (currentStep.waitFor === 'acknowledge') {
      advanceStep()
    }
  }, [currentStep, advanceStep])

  // === play_all: 自动检测是否所有可出的牌都出了 ===
  useEffect(() => {
    if (currentStep?.waitFor === 'play_all' && playerHand.length === 0) {
      advanceStep()
    }
  }, [currentStep, playerHand.length, advanceStep])

  // === clear_field: 自动检测敌方场上是否清空 ===
  useEffect(() => {
    if (currentStep?.waitFor === 'clear_field' && enemyField.every(c => c === null)) {
      advanceStep()
    }
  }, [currentStep, enemyField, advanceStep])

  // === 检测胜利 ===
  useEffect(() => {
    if (enemyLeaderHp <= 0 && phase === 'battle' && currentStep?.waitFor !== 'acknowledge') {
      // 跳到最后一步（胜利）
      const lastStep = level.steps.length - 1
      if (stepIdx < lastStep) setStepIdx(lastStep)
    }
  }, [enemyLeaderHp, phase, level, stepIdx, currentStep])

  // 退出到正确的界面（闯关来的回闯关，否则回主菜单）
  const exitBack = useCallback(() => {
    if (fromCampaign && onExitToCampaign) onExitToCampaign()
    else onExit()
  }, [fromCampaign, onExitToCampaign, onExit])

  // === 毕业 ===
  const handleGraduate = useCallback(() => {
    if (onGraduate) onGraduate()
    exitBack()
  }, [onGraduate, exitBack])

  // === 跳过教学 ===
  const handleSkip = useCallback(() => {
    const p = { completedLevels: TUTORIAL_LEVELS.map(l => l.id), graduated: true }
    setProgress(p)
    saveTutorialProgress(p)
    exitBack()
  }, [exitBack])

  // ================================================================
  // 渲染：关卡选择
  // ================================================================
  if (currentLevelIdx === null) {
    const basicDone = BASIC_LEVELS.every(lv => progress.completedLevels.includes(lv.id))
    const allDone = progress.completedLevels.length >= TUTORIAL_LEVELS.length

    const renderLevelBtn = (lv, idx, unlocked) => {
      const done = progress.completedLevels.includes(lv.id)
      const isAdv = lv.category === 'advanced'
      return (
        <motion.button
          key={lv.id}
          className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 border transition-all ${
            done
              ? 'bg-green-900/30 border-green-700 text-green-300'
              : unlocked
              ? isAdv ? 'bg-purple-900/30 border-purple-700 hover:border-purple-400 text-white' : 'bg-gray-800 border-gray-600 hover:border-yellow-500 text-white'
              : 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed'
          }`}
          whileHover={unlocked ? { scale: 1.02 } : {}}
          whileTap={unlocked ? { scale: 0.98 } : {}}
          onClick={() => unlocked && startLevel(TUTORIAL_LEVELS.indexOf(lv))}
          disabled={!unlocked}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <span className="text-2xl">{done ? '✅' : unlocked ? lv.icon : '🔒'}</span>
          <div>
            <div className="font-bold text-sm">{loc(lv, 'title')}</div>
            {done && <div className="text-xs text-green-500">{t('tutorial.completed')}</div>}
          </div>
        </motion.button>
      )
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <motion.h1
          className="text-3xl font-black mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {t('tutorial.title')}
        </motion.h1>
        <p className="text-gray-400 text-sm mb-6">{t('tutorial.subtitle')}</p>

        <div className="space-y-2 w-72">
          {/* 📗 基础教学 */}
          <div className="text-xs font-bold text-green-400 px-1">📗 {lang === 'en' ? 'Basic Training' : '基础教学'}</div>
          {BASIC_LEVELS.map((lv, idx) => {
            const unlocked = idx === 0 || progress.completedLevels.includes(BASIC_LEVELS[idx - 1].id)
            return renderLevelBtn(lv, idx, unlocked)
          })}

          {/* 📙 进阶教学 */}
          <div className="text-xs font-bold text-purple-400 px-1 pt-3">📙 {lang === 'en' ? 'Advanced (Optional)' : '进阶教学（可选）'}</div>
          {ADVANCED_LEVELS.map((lv, idx) => {
            const unlocked = basicDone && (idx === 0 || progress.completedLevels.includes(ADVANCED_LEVELS[idx - 1].id))
            return renderLevelBtn(lv, BASIC_LEVELS.length + idx, unlocked)
          })}
        </div>

        {basicDone && !progress.graduated && (
          <motion.button
            className="mt-6 px-6 py-3 bg-yellow-500 text-black font-black rounded-xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const p = { ...progress, graduated: true }
              setProgress(p)
              saveTutorialProgress(p)
              setPhase('graduation')
              setCurrentLevelIdx(-1) // 特殊值表示毕业画面
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {t('tutorial.graduate')}
          </motion.button>
        )}

        <div className="flex gap-3 mt-6">
          <button
            className="text-gray-500 text-sm hover:text-gray-300"
            onClick={exitBack}
          >
            {t('tutorial.back')}
          </button>
          {!progress.graduated && (
            <button
              className="text-gray-600 text-xs hover:text-gray-400"
              onClick={handleSkip}
            >
              {t('tutorial.skip')}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ================================================================
  // 渲染：毕业画面
  // ================================================================
  if (phase === 'graduation') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          className="text-center"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 10 }}
        >
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-black text-yellow-400 mb-2">{t('tutorial.congrats')}</h1>
          <p className="text-gray-300 mb-6">{t('tutorial.congratsMsg')}</p>

          <motion.div
            className="bg-gray-800 rounded-xl p-4 mb-6 border border-yellow-600/30 inline-block"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-sm text-gray-400 mb-2">{t('tutorial.reward')}</div>
            <div className="flex gap-6 justify-center">
              <div className="text-center">
                <div className="text-2xl">🪙</div>
                <div className="text-yellow-400 font-bold">{t('tutorial.rewardCoins')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl">🎰</div>
                <div className="text-purple-400 font-bold">{t('tutorial.rewardPull')}</div>
              </div>
            </div>
          </motion.div>

          <motion.button
            className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white text-xl font-black rounded-2xl"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={handleGraduate}
          >
            {t('tutorial.startFreeBattle')}
          </motion.button>
        </motion.div>
      </div>
    )
  }

  // ================================================================
  // 渲染：关卡介绍
  // ================================================================
  if (phase === 'intro') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          className="text-center max-w-sm"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-5xl mb-4">{level.icon}</div>
          <h2 className="text-2xl font-black mb-4">
            {t('tutorial.levelTitle', { id: level.id, title: loc(level, 'title') })}
          </h2>
          <div className="space-y-2 text-gray-300 text-sm mb-8">
            {(lang === 'en' && level.introEn ? level.introEn : level.intro).map((line, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.2 }}
              >
                {line}
              </motion.p>
            ))}
          </div>
          <motion.button
            className="px-8 py-3 bg-yellow-500 text-black font-black rounded-xl text-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            onClick={() => setPhase('battle')}
          >
            {t('tutorial.start')}
          </motion.button>
        </motion.div>

        <button
          className="mt-8 text-gray-600 text-xs hover:text-gray-400"
          onClick={handleSkip}
        >
          {t('tutorial.skip')}
        </button>
      </div>
    )
  }

  // ================================================================
  // 渲染：关卡总结
  // ================================================================
  if (phase === 'summary') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.div
          className="text-center max-w-sm"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring' }}
        >
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-2xl font-black text-green-400 mb-2">
            {t('tutorial.summaryTitle', { title: loc(level, 'title') })}
          </h2>
          <div className="bg-gray-800/80 rounded-xl p-4 text-sm text-gray-300 mb-6 border border-green-700/30">
            {loc(level, 'summary')}
          </div>
          <div className="flex gap-3 justify-center">
            <motion.button
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                // 下一关或返回选择
                const nextIdx = currentLevelIdx + 1
                if (nextIdx < TUTORIAL_LEVELS.length) {
                  startLevel(nextIdx)
                } else {
                  // 全部完成
                  const p = { ...progress, graduated: true }
                  setProgress(p)
                  saveTutorialProgress(p)
                  setPhase('graduation')
                }
              }}
            >
              {currentLevelIdx + 1 < TUTORIAL_LEVELS.length ? t('tutorial.nextLevel') : t('tutorial.graduate')}
            </motion.button>
            <button
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl text-sm"
              onClick={() => fromCampaign ? exitBack() : setCurrentLevelIdx(null)}
            >
              {fromCampaign ? t('tutorial.back') : t('tutorial.backToSelect')}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ================================================================
  // 渲染：战斗界面 + 引导覆盖层
  // ================================================================

  // 判断某个区域是否被高亮
  const isHighlighted = (area) => {
    if (!currentStep) return false
    return currentStep.highlight === area
  }

  // 是否允许点击某个区域
  const isClickable = (area) => {
    if (!currentStep) return false
    const w = currentStep.waitFor
    switch (area) {
      case 'hand': return ['play_card', 'play_all', 'play_event'].includes(w)
      case 'player_field': return ['attack', 'direct_attack', 'clear_field'].includes(w)
      case 'enemy_field': return ['attack', 'clear_field'].includes(w)
      case 'enemy_leader': return ['direct_attack', 'clear_field'].includes(w)
      case 'end_turn_btn': return w === 'end_turn'
      case 'power_bank_break': return w === 'break_power_bank'
      case 'sp_area': return w === 'summon_sp'
      default: return false
    }
  }

  // 阵营标记计算（关卡5用）
  const factionMarkers = {}
  playerDiscard.forEach(c => {
    if (c.faction) factionMarkers[c.faction] = (factionMarkers[c.faction] || 0) + 1
  })

  // 检查卡牌是否因阵营标记不足而锁定
  const isCardLocked = (card) => {
    if (!card.factionRequirement) return false
    const reqFaction = card.factionRequirement.faction
    const reqCount = card.factionRequirement.count
    return (factionMarkers[reqFaction] || 0) < reqCount
  }

  return (
    <div className="h-screen-d max-w-3xl mx-auto bg-gray-900 flex flex-col relative overflow-hidden">
      {/* 跳过教学按钮 */}
      <button
        className="absolute top-2 right-2 z-50 text-gray-600 text-xs hover:text-gray-400 bg-gray-800/80 px-2 py-1 rounded"
        onClick={handleSkip}
      >
        {t('tutorial.skip')}
      </button>

      {/* 关卡标题 */}
      <div className="text-center py-1 text-xs text-gray-500">
        {t('tutorial.battleHeader', { id: level.id, title: loc(level, 'title'), turn })}
      </div>

      {/* === 敌方主人面板 === */}
      <div
        className={`px-2 ${isHighlighted('enemy_leader') ? 'relative z-30' : ''}`}
        {...(isHighlighted('enemy_leader') ? { 'data-attack-target': 'true' } : {})}
        onClick={() => handleLeaderClick('enemy')}
      >
        <div className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border-[1.5px] bg-[#151c30] border-[#3a2020] ${
          selectedAtkSlot !== null ? 'border-red-500 bg-[#2a1515] cursor-pointer' : ''
        } ${isHighlighted('enemy_leader') ? 'ring-2 ring-yellow-400' : ''}`}
          style={isHighlighted('enemy_leader') ? { boxShadow: '0 0 16px rgba(250,204,21,0.5)' } : {}}
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 bg-red-900/60 border-red-700 flex items-center justify-center text-lg sm:text-xl shrink-0">👹</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs sm:text-sm font-medium text-red-400">{t('battle.enemy')}</span>
              <span className="text-xs sm:text-sm text-white font-medium font-mono">
                {enemyLeaderHp.toLocaleString()}
                <span className="text-gray-500 text-[10px] sm:text-xs"> / {(level?.enemyLeaderHp || 30000).toLocaleString()}</span>
              </span>
            </div>
            <div className="h-3.5 sm:h-[18px] bg-[#1a1a2e] rounded-lg overflow-hidden">
              <motion.div
                className="h-full bg-red-500 rounded-lg"
                animate={{ width: `${Math.max(0, (enemyLeaderHp / (level?.enemyLeaderHp || 30000)) * 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
          {selectedAtkSlot !== null && (
            <motion.span
              className="text-[10px] sm:text-xs text-red-400 border border-red-500 px-1.5 sm:px-2 py-0.5 rounded-md shrink-0 font-bold"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >TAP</motion.span>
          )}
        </div>
      </div>

      {/* === 敌方战场 === */}
      <div className={`flex-1 px-2 py-1 min-h-0 ${isHighlighted('enemy_field') ? 'ring-2 ring-yellow-400 rounded-lg relative z-30' : ''}`}>
        <div className="grid grid-cols-5 gap-1 h-full">
          {enemyField.map((card, slot) => (
            <div
              key={`ef-${slot}`}
              className={`rounded-lg border relative transition-all ${
                card ? 'border-red-700/50 bg-red-950/30' : 'border-gray-800 bg-gray-900/50'
              } ${selectedAtkSlot !== null && card ? 'cursor-pointer border-red-500' : ''}`}
              {...(selectedAtkSlot !== null && card ? { 'data-attack-target': 'true' } : {})}
              onClick={() => card && handleFieldCardClick('enemy', slot)}
            >
              {card && (
                <div className="w-full h-full flex flex-col items-center justify-center p-0.5">
                  <div className="text-xs font-bold text-center truncate w-full">{card.name?.slice(0, 4)}</div>
                  <div className="text-[10px] text-red-300">⚔️{card.atk}</div>
                  <div className="text-[10px] text-green-300">❤️{card.currentHp}/{card.maxHp || card.hp}</div>
                  {card.faction && <div className="text-xs">{FACTIONS[card.faction]?.icon}</div>}
                </div>
              )}
              {/* 浮字 */}
              <AnimatePresence>
                {floatingDmgs.filter(f => f.side === 'enemy' && f.slot === slot).map(f => (
                  <motion.div
                    key={f.id}
                    className={`absolute inset-0 flex items-center justify-center text-lg font-black ${f.color} z-40 pointer-events-none`}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -30 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2 }}
                  >
                    {f.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* 敌方主人浮字 */}
      <AnimatePresence>
        {floatingDmgs.filter(f => f.side === 'enemy' && f.slot === -1).map(f => (
          <motion.div
            key={f.id}
            className={`absolute top-8 left-1/2 -translate-x-1/2 text-2xl font-black ${f.color} z-40 pointer-events-none`}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            {f.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* === VS 分隔线 === */}
      <div className="text-center text-gray-600 text-xs py-0.5">── VS ──</div>

      {/* === 玩家战场 === */}
      {/* 教学引导框：战斗阶段时不包围整个己方区域（让攻击高亮自己引导） */}
      <div className={`flex-1 px-2 py-1 min-h-0 ${
        isHighlighted('player_field') && !['attack', 'direct_attack', 'clear_field'].includes(currentStep?.waitFor)
          ? 'ring-2 ring-yellow-400 rounded-lg relative z-30' : ''
      }`}>
        <div className="grid grid-cols-5 gap-1 h-full">
          {playerField.map((card, slot) => {
            const isAttacker = selectedAtkSlot === slot
            const canAct = card && !summonedThisTurn.has(card.uid) && !attackedThisTurn.has(card.uid)
            const isDirectAttackStep = currentStep?.waitFor === 'direct_attack'
            const isWaitingForAttacker = selectedAtkSlot === null && ['attack', 'direct_attack', 'clear_field'].includes(currentStep?.waitFor)
            const isDimmed = !isDirectAttackStep && selectedAtkSlot !== null && !isAttacker && card
            const hasFatigue = card && !canAct && (summonedThisTurn.has(card?.uid) || attackedThisTurn.has(card?.uid))
            return (
            <div
              key={`pf-${slot}`}
              className={`rounded-lg border relative transition-all ${
                card ? 'border-blue-700/50 bg-blue-950/30' : 'border-gray-800 bg-gray-900/50'
              } ${canAct ? 'cursor-pointer' : ''} ${isDimmed ? 'opacity-60' : ''} ${
                hasFatigue && !isDirectAttackStep ? 'opacity-50' : ''
              }`}
              style={isAttacker ? {
                transform: 'translateY(-10px)',
                boxShadow: '0 0 0 3px #f1c40f, 0 0 15px rgba(241, 196, 15, 0.5)',
                borderColor: '#f1c40f',
              } : isWaitingForAttacker && canAct ? {
                boxShadow: '0 0 0 2px #f1c40f, 0 0 10px rgba(241, 196, 15, 0.3)',
                borderColor: 'rgba(241, 196, 15, 0.7)',
                transform: 'scale(1.02)',
              } : {}}
              onClick={() => card && handleFieldCardClick('player', slot)}
            >
              {isAttacker && (
                <span className="absolute -top-2 -right-1 z-10 text-[8px] font-bold bg-yellow-500 text-gray-900 px-1 py-0.5 rounded-full leading-none">ATK</span>
              )}
              {card && (
                <div className="w-full h-full flex flex-col items-center justify-center p-0.5">
                  <div className="text-xs font-bold text-center truncate w-full">{card.name?.slice(0, 4)}</div>
                  <div className="text-[10px] text-red-300">⚔️{card.atk}</div>
                  <div className="text-[10px] text-green-300">❤️{card.currentHp}/{card.maxHp || card.hp}</div>
                  {card.faction && <div className="text-xs">{FACTIONS[card.faction]?.icon}</div>}
                  {summonedThisTurn.has(card.uid) && (
                    <div className="text-[8px] text-yellow-500">{t('tutorial.fatigue')}</div>
                  )}
                </div>
              )}
              {/* 浮字 */}
              <AnimatePresence>
                {floatingDmgs.filter(f => f.side === 'player' && f.slot === slot).map(f => (
                  <motion.div
                    key={f.id}
                    className={`absolute inset-0 flex items-center justify-center text-lg font-black ${f.color} z-40 pointer-events-none`}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: -30 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.2 }}
                  >
                    {f.text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )})}
        </div>
      </div>

      {/* === 玩家主人面板 === */}
      <div className="px-2">
        <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border-[1.5px] bg-[#0c1a2a] border-[#1a3a5a]">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 bg-blue-900/60 border-blue-700 flex items-center justify-center text-lg sm:text-xl shrink-0">👦</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs sm:text-sm font-medium text-blue-400">{t('battle.you')}</span>
              <span className="text-xs sm:text-sm text-white font-medium font-mono">
                {playerLeaderHp.toLocaleString()}
                <span className="text-gray-500 text-[10px] sm:text-xs"> / {(level?.playerLeaderHp || 30000).toLocaleString()}</span>
              </span>
            </div>
            <div className="h-3.5 sm:h-[18px] bg-[#1a1a2e] rounded-lg overflow-hidden">
              <motion.div
                className="h-full bg-blue-500 rounded-lg"
                animate={{ width: `${Math.max(0, (playerLeaderHp / (level?.playerLeaderHp || 30000)) * 100)}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* === 能量 & Power Bank === */}
      <div className={`px-4 py-1 flex items-center gap-3 ${
        isHighlighted('energy_display') || isHighlighted('power_bank') || isHighlighted('power_bank_break')
          ? 'ring-2 ring-yellow-400 rounded-lg relative z-30' : ''
      }`}>
        <span className="text-sm text-yellow-400 font-bold">⚡ {playerEnergy}</span>

        {/* SP区域 */}
        {playerSpDeck.length > 0 && (
          <div
            className={`flex items-center gap-1 cursor-pointer ${isHighlighted('sp_area') ? 'ring-2 ring-yellow-400 rounded px-1 animate-bounce relative z-30' : ''}`}
            style={isHighlighted('sp_area') ? { boxShadow: '0 0 16px rgba(250,204,21,0.5)' } : {}}
            onClick={() => isClickable('sp_area') && handleSummonSp()}
          >
            <span className="text-xs text-purple-400">🌟SP</span>
            <span className="text-xs text-purple-300">×{playerSpDeck.length}</span>
          </div>
        )}

        {/* Power Bank */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-cyan-400">🔋{powerBank.stored}</span>
          {powerBank.intact && powerBank.stored > 0 && (
            <button
              className={`text-xs px-2 py-0.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white ${
                isHighlighted('power_bank_break') ? 'ring-2 ring-yellow-400 animate-bounce relative z-30' : ''
              }`}
              style={isHighlighted('power_bank_break') ? { boxShadow: '0 0 16px rgba(250,204,21,0.5)' } : {}}
              onClick={() => isClickable('power_bank_break') && handleBreakPowerBank()}
            >
              {t('battle.pb.break')}
            </button>
          )}
          {!powerBank.intact && <span className="text-[10px] text-gray-600">{t('tutorial.pbBroken')}</span>}
        </div>

        {/* 弃牌堆标记 */}
        {playerDiscard.length > 0 && (
          <div className={`text-xs text-gray-400 ${isHighlighted('discard_area') ? 'ring-2 ring-yellow-400 rounded px-1' : ''}`}>
            {t('tutorial.discardPile')}{playerDiscard.length}
            {Object.entries(factionMarkers).map(([f, n]) => (
              <span key={f} className="ml-1">{FACTIONS[f]?.icon}×{n}</span>
            ))}
          </div>
        )}
      </div>

      {/* === 手牌区 === */}
      {(() => {
        const anyHandHighlighted = isHighlighted('hand') || isHighlighted('hand_card_0') || isHighlighted('hand_card_1') || isHighlighted('hand_card_2') || isHighlighted('hand_card_3')
        return (
      <div className={`px-2 py-1 flex-none ${anyHandHighlighted ? 'relative z-30' : ''}`}>
        <div className="flex gap-1 justify-center flex-wrap">
          {playerHand.map((card, idx) => {
            const locked = isCardLocked(card)
            const highlighted = isHighlighted('hand') || isHighlighted(`hand_card_${idx}`)
            const canClick = isClickable('hand') && !locked && card.cost <= playerEnergy
            // 有高亮目标时，非高亮卡片压暗
            const dimmed = anyHandHighlighted && !highlighted
            return (
              <motion.div
                key={card.uid}
                className={`w-16 rounded-lg border p-1 text-center cursor-pointer transition-all ${
                  highlighted ? 'ring-2 ring-yellow-400 bg-gray-800' : 'bg-gray-850 border-gray-700'
                } ${locked || dimmed ? 'opacity-30 grayscale' : ''} ${
                  card.type === 'event' ? 'border-amber-600/50' : 'border-gray-600'
                } ${selectedHandIdx === idx ? 'ring-2 ring-blue-400' : ''}`}
                style={highlighted ? { boxShadow: '0 0 16px rgba(250,204,21,0.5)' } : {}}
                whileHover={canClick ? { scale: 1.08, y: -4 } : {}}
                whileTap={canClick ? { scale: 0.95 } : {}}
                animate={highlighted ? { scale: [1, 1.06, 1] } : {}}
                transition={highlighted ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : {}}
                onClick={() => canClick && handleHandCardClick(idx)}
                layout
              >
                <div className="text-[10px] text-yellow-400 font-bold">{card.cost}⚡</div>
                <div className="text-xs font-bold truncate">{card.name?.slice(0, 3)}</div>
                {card.type === 'event' ? (
                  <div className="text-[10px] text-amber-400">{t('tutorial.eventLabel')}</div>
                ) : (
                  <>
                    <div className="text-[10px] text-red-300">⚔️{card.atk}</div>
                    <div className="text-[10px] text-green-300">❤️{card.hp}</div>
                  </>
                )}
                <div className="text-xs">{FACTIONS[card.faction]?.icon}</div>
                {locked && <div className="text-[8px] text-red-400">🔒</div>}
              </motion.div>
            )
          })}
        </div>
      </div>
        )
      })()}

      {/* === 操作按钮 === */}
      <div className={`px-4 py-2 flex justify-center gap-3 ${isHighlighted('end_turn_btn') ? 'relative z-30' : ''}`}>
        <button
          className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${
            isClickable('end_turn_btn')
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          } ${isHighlighted('end_turn_btn') ? 'ring-2 ring-yellow-400 animate-bounce' : ''}`}
          style={isHighlighted('end_turn_btn') ? { boxShadow: '0 0 20px rgba(250,204,21,0.6)' } : {}}
          onClick={() => isClickable('end_turn_btn') && handleEndTurn()}
          disabled={!isClickable('end_turn_btn')}
        >
          {t('tutorial.endTurn')}
        </button>
      </div>

      {/* ================================================================ */}
      {/* 引导覆盖层：半透明遮罩 + 提示框 */}
      {/* ================================================================ */}
      {currentStep && (
        <>
          {/* 半透明遮罩 — 只在 acknowledge 步骤显示（需要操作的步骤不遮挡） */}
          {currentStep.waitFor === 'acknowledge' && (
            <div
              className="absolute inset-0 bg-black/50 z-20 cursor-pointer"
              onClick={handleAcknowledge}
            />
          )}

          {/* 提示框（根据目标位置动态定位：目标在下半→提示在上，目标在上半→提示在下） */}
          {(() => {
            // 目标在屏幕下半部分的区域
            const lowerAreas = ['hand', 'hand_card_0', 'hand_card_1', 'hand_card_2', 'hand_card_3', 'hand_card_4', 'end_turn_btn', 'power_bank', 'power_bank_break', 'discard_area']
            const isTargetLower = lowerAreas.some(a => currentStep.highlight?.startsWith(a))
            return (
              <motion.div
                className="absolute left-1/2 -translate-x-1/2 z-50 max-w-xs"
                style={isTargetLower
                  ? { top: '8%', bottom: 'auto' }
                  : { bottom: '30%', top: 'auto' }
                }
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={currentStep.id}
              >
                <div className="bg-yellow-900/95 border-2 border-yellow-500 rounded-xl p-3 shadow-lg shadow-yellow-500/20">
                  <p className="text-sm text-yellow-100 leading-relaxed">{loc(currentStep, 'text')}</p>

                  {currentStep.waitFor === 'acknowledge' && (
                    <button
                      className="w-full mt-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors hover:bg-yellow-500/30"
                      style={{
                        background: 'rgba(241, 196, 15, 0.2)',
                        border: '1.5px solid #f1c40f',
                        color: '#f1c40f',
                      }}
                      onClick={(e) => { e.stopPropagation(); handleAcknowledge() }}
                    >
                      {t('tutorial.continue')}
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })()}
        </>
      )}
    </div>
  )
}
