import React, { useState, Suspense, lazy, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TitleScreen from './components/TitleScreen'
import { playerTestDeck, enemyTestDeck } from './data/testDecks'
import { useEconomy } from './hooks/useEconomy'
import { loadTutorialProgress } from './data/tutorialData'
import {
  loadCampaignProgress, saveCampaignProgress, calculateStars,
} from './data/campaignData'
import cards from './data/cards'
import eventCards from './data/eventCards'
import spCards from './data/spCards'
import IntroModal from './components/IntroModal'

// 懒加载重型组件 — 代码分割
const BattleScreen = lazy(() => import('./components/BattleScreen'))
const GachaScreen = lazy(() => import('./components/GachaScreen'))
const DeckBuilder = lazy(() => import('./components/DeckBuilder'))
const Collection = lazy(() => import('./components/Collection'))
const TutorialScreen = lazy(() => import('./components/TutorialScreen'))
const CampaignScreen = lazy(() => import('./components/CampaignScreen'))

// 加载占位
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">🧬</div>
        <div className="text-gray-400 text-sm">加载中…</div>
      </div>
    </div>
  )
}

// 根据 cardId 从数据中找到卡牌
const allCards = [...cards, ...eventCards, ...spCards]
function findCard(id) {
  return allCards.find(c => c.id === id)
}

// 从 enemyConfig.deck 中实例化敌方卡组
function buildEnemyDeck(deckIds) {
  return deckIds.map(id => {
    const card = findCard(id)
    if (!card) return null
    return { ...card }
  }).filter(Boolean)
}

export default function App() {
  // 首次进入：检查是否需要自动开始教学
  const [screen, setScreen] = useState(() => {
    // 首次进入：显示主菜单+IntroModal（而不是直接跳教学）
    if (!localStorage.getItem('bio-heroes-intro-seen')) return 'title'
    const tut = loadTutorialProgress()
    if (!tut.graduated && tut.completedLevels.length === 0) {
      return 'tutorial'
    }
    return 'title'
  })
  const [selectedDeck, setSelectedDeck] = useState(null)
  const economy = useEconomy()

  // === 闯关战役状态 ===
  const campaignStageRef = useRef(null) // 当前战斗的关卡配置
  const pendingCampaignRef = useRef(null) // 等待选卡组后开始的闯关配置

  const handleSelectDeck = useCallback((deck) => {
    if (deck) {
      setSelectedDeck(deck)
    } else {
      setSelectedDeck(null)
    }
    // 如果有待处理的闯关战斗，选完卡组后直接开始闯关
    const pendingCampaign = pendingCampaignRef.current
    if (pendingCampaign) {
      pendingCampaignRef.current = null
      const stageConfig = pendingCampaign
      campaignStageRef.current = stageConfig
      const enemyDeck = buildEnemyDeck(stageConfig.enemyConfig.deck)
      const enemySpDeck = stageConfig.enemyConfig.spDeck
        ? buildEnemyDeck(stageConfig.enemyConfig.spDeck)
        : []
      setSelectedDeck(prev => ({
        ...prev,
        _campaignEnemy: {
          deck: enemyDeck,
          spDeck: enemySpDeck,
          leaderHP: stageConfig.enemyConfig.leaderHP,
          aiStrength: stageConfig.enemyConfig.aiStrength,
          bossMechanic: stageConfig.enemyConfig.bossMechanic,
          bossPreplaced: stageConfig.enemyConfig.bossPreplaced,
          dialogue: stageConfig.dialogue,
          stageType: stageConfig.stageType,
          stageName: stageConfig.stageName,
        },
      }))
    }
    setScreen('battle')
  }, [])

  const handleExitBattle = useCallback((battleResult) => {
    // 检查是否是闯关战斗
    const stageConfig = campaignStageRef.current
    if (stageConfig && battleResult) {
      // 计算星数
      const stars = calculateStars({
        won: battleResult.won,
        leaderHPPercent: battleResult.leaderHPPercent || 0,
        turnCount: battleResult.turnsPlayed || 99,
      })

      // 更新闯关进度
      const prog = loadCampaignProgress()
      const prevStars = prog.stageStars[stageConfig.stageId] || 0
      if (stars > prevStars) {
        prog.stageStars[stageConfig.stageId] = stars
      }

      // 发放奖励
      if (battleResult.won && stageConfig.rewards) {
        const rewardKey = `${stageConfig.stageId}_first`
        if (!prog.claimedRewards[rewardKey]) {
          prog.claimedRewards[rewardKey] = true
          const r = stageConfig.rewards.firstClear
          if (r?.coins) economy.addCoins(r.coins)
          if (r?.diamonds) economy.addCoins(r.diamonds) // 暂用coins代替
        }
        if (stars >= 3) {
          const threeKey = `${stageConfig.stageId}_three`
          if (!prog.claimedRewards[threeKey]) {
            prog.claimedRewards[threeKey] = true
            const r = stageConfig.rewards.threeStars
            if (r?.coins) economy.addCoins(r.coins)
            if (r?.ssrTicket) economy.useSSRTicket()
          }
        }
      }

      // 章节完成奖励（Boss 关首通时检查）
      if (battleResult.won && stageConfig.stageId.endsWith('-4')) {
        const chapterMap = { '2-4': 'ch2', '3-4': 'ch3', '4-4': 'ch4' }
        const chapterId = chapterMap[stageConfig.stageId]
        if (chapterId) {
          const chapterKey = `${chapterId}_complete`
          if (!prog.claimedRewards[chapterKey]) {
            prog.claimedRewards[chapterKey] = true
            if (chapterId === 'ch2') {
              economy.addCoins(500)
            } else if (chapterId === 'ch3') {
              economy.addCoins(500)
              // diamonds: 暂用 coins 代替
              economy.addCoins(10)
            } else if (chapterId === 'ch4') {
              // "科学家🔬"称号 — 标记存在 claimedRewards 中
              // UI 在 TitleScreen / CampaignScreen 读取显示
            }
          }
        }
      }

      // 星数里程碑奖励
      const totalStars = Object.values(prog.stageStars).reduce((sum, s) => sum + s, 0)
      if (totalStars >= 30 && !prog.claimedRewards['star_milestone_30']) {
        prog.claimedRewards['star_milestone_30'] = true
        economy.addCoins(500)
      }
      if (totalStars >= 45 && !prog.claimedRewards['star_milestone_45']) {
        prog.claimedRewards['star_milestone_45'] = true
        economy.addCoins(1000)
      }

      saveCampaignProgress(prog)
      campaignStageRef.current = null
      // 清除闯关残留的 _campaignEnemy，保留玩家自选卡组
      setSelectedDeck(prev => {
        if (!prev) return null
        const { _campaignEnemy, ...rest } = prev
        return Object.keys(rest).length > 0 ? rest : null
      })
      setScreen('campaign')
      return
    }

    // 普通战斗
    if (battleResult) {
      const reward = economy.calculateBattleReward(battleResult)
      economy.claimBattleReward(reward)
    }
    campaignStageRef.current = null
    // 同样清除残留状态
    setSelectedDeck(prev => {
      if (!prev) return null
      const { _campaignEnemy, ...rest } = prev
      return Object.keys(rest).length > 0 ? rest : null
    })
    setScreen('title')
  }, [economy])

  // === 闯关战役：开始战斗（先选卡组）===
  const handleCampaignBattle = useCallback((stageConfig) => {
    pendingCampaignRef.current = stageConfig
    setScreen('deckBuilder')
  }, [])

  // 教学毕业奖励
  const handleTutorialGraduate = useCallback(() => {
    economy.addCoins(500)
    economy.addCoins(900)
  }, [economy])

  // 新手欢迎弹窗（首次进入）
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('bio-heroes-intro-seen'))
  // 老玩家欢迎提示（有旧存档的 isNewPlayer）
  const [showWelcome, setShowWelcome] = useState(economy.isNewPlayer && !!localStorage.getItem('bio-heroes-intro-seen'))
  const handleDismissWelcome = useCallback(() => {
    setShowWelcome(false)
    economy.dismissNewPlayer()
  }, [economy])

  // 提取闯关配置
  const campaignEnemy = selectedDeck?._campaignEnemy

  return (
    <div className="min-h-screen-d bg-gray-900 text-white">
      {/* 新手欢迎弹窗（首次进入游戏） */}
      {showIntro && screen === 'title' && (
        <IntroModal
          onStartTutorial={() => {
            localStorage.setItem('bio-heroes-intro-seen', 'true')
            setShowIntro(false)
            economy.dismissNewPlayer?.()
            setScreen('tutorial')
          }}
          onSkip={() => {
            localStorage.setItem('bio-heroes-intro-seen', 'true')
            setShowIntro(false)
            economy.dismissNewPlayer?.()
          }}
        />
      )}

      {screen === 'title' && (
        <TitleScreen
          onStartBattle={() => setScreen('deckBuilder')}
          onOpenGacha={() => setScreen('gacha')}
          onOpenDeckBuilder={() => setScreen('deckBuilder')}
          onOpenCollection={() => setScreen('collection')}
          onOpenTutorial={() => setScreen('tutorial')}
          onOpenCampaign={() => setScreen('campaign')}
          economy={economy}
        />
      )}
      <Suspense fallback={<LoadingFallback />}>
        {screen === 'battle' && (
          <BattleScreen
            playerDeckCards={selectedDeck?.mainCards || playerTestDeck}
            enemyDeckCards={campaignEnemy?.deck || enemyTestDeck}
            playerSpDeckCards={selectedDeck?.spCards}
            enemySpDeckCards={campaignEnemy?.spDeck}
            campaignConfig={campaignEnemy}
            onExit={handleExitBattle}
          />
        )}
        {screen === 'gacha' && (
          <GachaScreen onBack={() => setScreen('title')} economy={economy} />
        )}
        {screen === 'deckBuilder' && (
          <DeckBuilder
            onBack={() => {
              if (pendingCampaignRef.current) {
                pendingCampaignRef.current = null
                setScreen('campaign')
              } else {
                setScreen('title')
              }
            }}
            onSelectDeck={handleSelectDeck}
            collection={economy.collection}
          />
        )}
        {screen === 'collection' && (
          <Collection onBack={() => setScreen('title')} economy={economy} />
        )}
        {screen === 'tutorial' && (
          <TutorialScreen
            onExit={() => setScreen('title')}
            onGraduate={handleTutorialGraduate}
            economy={economy}
          />
        )}
        {screen === 'campaign' && (
          <CampaignScreen
            onBack={() => setScreen('title')}
            onStartBattle={handleCampaignBattle}
            onStartTutorial={(lvl) => {
              // 跳转到教学模式
              setScreen('tutorial')
            }}
            economy={economy}
          />
        )}
      </Suspense>
    </div>
  )
}
