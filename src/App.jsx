import React, { useState, Suspense, lazy, useCallback, useEffect } from 'react'
import TitleScreen from './components/TitleScreen'
import { playerTestDeck, enemyTestDeck } from './data/testDecks'
import { useEconomy } from './hooks/useEconomy'
import { loadTutorialProgress } from './data/tutorialData'

// 懒加载重型组件 — 代码分割
const BattleScreen = lazy(() => import('./components/BattleScreen'))
const GachaScreen = lazy(() => import('./components/GachaScreen'))
const DeckBuilder = lazy(() => import('./components/DeckBuilder'))
const Collection = lazy(() => import('./components/Collection'))
const TutorialScreen = lazy(() => import('./components/TutorialScreen'))

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

export default function App() {
  // 首次进入：检查是否需要自动开始教学
  const [screen, setScreen] = useState(() => {
    const tut = loadTutorialProgress()
    if (!tut.graduated && tut.completedLevels.length === 0) {
      return 'tutorial' // 首次进入自动开始教学
    }
    return 'title'
  })
  const [selectedDeck, setSelectedDeck] = useState(null)
  const economy = useEconomy()

  const handleSelectDeck = useCallback((deck) => {
    if (deck) {
      setSelectedDeck(deck)
    } else {
      setSelectedDeck(null)
    }
    setScreen('battle')
  }, [])

  const handleExitBattle = useCallback((battleResult) => {
    if (battleResult) {
      const reward = economy.calculateBattleReward(battleResult)
      economy.claimBattleReward(reward)
    }
    setScreen('title')
  }, [economy])

  // 教学毕业奖励：500金币 + 免费十连抽（通过给900金币实现）
  const handleTutorialGraduate = useCallback(() => {
    economy.addCoins(500)
    // 免费十连：给足够金币让玩家去抽卡界面自己抽
    // 或者直接加900金币（十连的价格）
    economy.addCoins(900)
  }, [economy])

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {screen === 'title' && (
        <TitleScreen
          onStartBattle={() => setScreen('battle')}
          onOpenGacha={() => setScreen('gacha')}
          onOpenDeckBuilder={() => setScreen('deckBuilder')}
          onOpenCollection={() => setScreen('collection')}
          onOpenTutorial={() => setScreen('tutorial')}
          economy={economy}
        />
      )}
      <Suspense fallback={<LoadingFallback />}>
        {screen === 'battle' && (
          <BattleScreen
            playerDeckCards={selectedDeck?.mainCards || playerTestDeck}
            enemyDeckCards={enemyTestDeck}
            playerSpDeckCards={selectedDeck?.spCards}
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
      </Suspense>
    </div>
  )
}
