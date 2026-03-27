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

  const handleSelectDeck = useCallback((deck) => {
    if (deck) {
      setSelectedDeck(deck)
    } else {
      setSelectedDeck(null)
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
          }
        }
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

  // === 闯关战役：开始战斗 ===
  const handleCampaignBattle = useCallback((stageConfig) => {
    campaignStageRef.current = stageConfig
    // 构建敌方卡组
    const enemyDeck = buildEnemyDeck(stageConfig.enemyConfig.deck)
    const enemySpDeck = stageConfig.enemyConfig.spDeck
      ? buildEnemyDeck(stageConfig.enemyConfig.spDeck)
      : []

    setSelectedDeck(prev => ({
      ...prev,
      // 保留玩家自己的卡组
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
    setScreen('battle')
  }, [])

  // 教学毕业奖励
  const handleTutorialGraduate = useCallback(() => {
    economy.addCoins(500)
    economy.addCoins(900)
  }, [economy])

  // 新玩家欢迎提示
  const [showWelcome, setShowWelcome] = useState(economy.isNewPlayer)
  const handleDismissWelcome = useCallback(() => {
    setShowWelcome(false)
    economy.dismissNewPlayer()
  }, [economy])

  // 提取闯关配置
  const campaignEnemy = selectedDeck?._campaignEnemy

  return (
    <div className="min-h-screen-d bg-gray-900 text-white">
      {/* 新玩家欢迎提示 */}
      <AnimatePresence>
        {showWelcome && screen === 'tutorial' && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismissWelcome}
          >
            <motion.div
              className="bg-gray-800 border-2 border-yellow-500 rounded-2xl p-6 max-w-sm mx-4 text-center"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', damping: 12 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="text-4xl mb-3">🎁</div>
              <h2 className="text-xl font-black text-yellow-400 mb-2">欢迎新战士！</h2>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                你获得了<span className="text-yellow-400 font-bold">初始卡牌礼包</span>和
                <span className="text-yellow-400 font-bold"> 3000 金币</span>！
                <br />先去教学关卡学习怎么玩吧！
              </p>
              <button
                className="px-6 py-2 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition"
                onClick={handleDismissWelcome}
              >
                知道了！
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            onBack={() => setScreen('title')}
            onSelectDeck={handleSelectDeck}
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
