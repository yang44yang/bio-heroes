import React, { useState, Suspense, lazy, useCallback, useRef } from 'react'
import TitleScreen from './components/TitleScreen'
import { playerTestDeck, enemyTestDeck } from './data/testDecks'
import { useEconomy } from './hooks/useEconomy'

// 懒加载重型组件 — 代码分割
const BattleScreen = lazy(() => import('./components/BattleScreen'))
const GachaScreen = lazy(() => import('./components/GachaScreen'))
const DeckBuilder = lazy(() => import('./components/DeckBuilder'))
const Collection = lazy(() => import('./components/Collection'))

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
  const [screen, setScreen] = useState('title')
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {screen === 'title' && (
        <TitleScreen
          onStartBattle={() => setScreen('battle')}
          onOpenGacha={() => setScreen('gacha')}
          onOpenDeckBuilder={() => setScreen('deckBuilder')}
          onOpenCollection={() => setScreen('collection')}
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
      </Suspense>
    </div>
  )
}
