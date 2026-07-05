import React, { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGacha } from '../hooks/useGacha'
import { FACTIONS } from '../data/deckRules'
import { TOTAL_DEX_CARDS, ownedDexCount } from '../data/dexSets'
import cardsData from '../data/cards'
import BattleCard from './Card'
import CardDetailModal from './CardDetailModal'
import GachaAnimation from './GachaAnimation'
import CardShowcase from './CardShowcase'
import MilestoneModal, { MILESTONES } from './MilestoneModal'
import GachaQuizModal, { selectQuizForPull } from './GachaQuizModal'
import AchievementModal from './AchievementModal'
import { detectNewlyUnlocked } from '../data/achievements'
import { selectBanner } from '../data/gachaBanners'
import { loadCampaignProgress } from '../data/campaignData'
import { useLanguage } from '../i18n/LanguageContext'

const cardById = (id) => cardsData.find(c => c.id === id)
// 图鉴进度条用「全图鉴总数」(TOTAL_DEX_CARDS = 生物+事件+SP)，与 Collection 图鉴同源，两屏总数不再打架。
// 分子 owned 数的是整个 collection（含已拥有的事件/SP 卡），所以分母必须是同一个全集，否则会 owned>分母。

const rarityColors = {
  R: 'text-blue-400',
  SR: 'text-purple-400',
  SSR: 'text-yellow-400',
}

const rarityBg = {
  R: 'border-blue-500/50',
  SR: 'border-purple-500/50 shadow-purple-500/20 shadow-lg',
  SSR: 'border-yellow-400/50 shadow-yellow-400/30 shadow-xl',
}

export default function GachaScreen({ onBack, economy, onGotoDeckBuilder }) {
  const { t } = useLanguage()
  const { pull } = useGacha()
  const [pulled, setPulled] = useState([])
  const [pulling, setPulling] = useState(false)
  const [results, setResults] = useState([])
  const [detailCard, setDetailCard] = useState(null)
  const [animatingCards, setAnimatingCards] = useState(null)
  const [showcaseCards, setShowcaseCards] = useState(null)
  const [pendingMilestone, setPendingMilestone] = useState(null)
  const [activeMilestone, setActiveMilestone] = useState(null)
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [pendingAchievements, setPendingAchievements] = useState([])
  const [activeAchievement, setActiveAchievement] = useState(null)

  const banner = useMemo(() => {
    const prog = loadCampaignProgress()
    return selectBanner(prog.stageStars || {})
  }, [])
  const featuredCards = useMemo(
    () => (banner.featuredCardIds || []).map(cardById).filter(Boolean),
    [banner]
  )

  const doPull = (count) => {
    const cost = count === 1 ? economy.SINGLE_COST : economy.MULTI_COST
    if (!economy.canAfford(cost)) return

    const beforeCount = ownedDexCount(economy.collection)
    economy.spendCoins(cost)
    setPulling(true)
    setPulled([])
    setResults([])

    const { pulled: newCards } = pull(count, economy.pityCounter, economy.SSR_PITY)
    const enriched = economy.pullCards(newCards)
    const newOwned = enriched.filter(c => c.isNew).length
    const afterCount = beforeCount + newOwned
    const crossed = MILESTONES.find(m => beforeCount < m && afterCount >= m)
    setPendingMilestone(crossed || null)
    setPulled(newCards)
    setAnimatingCards(enriched)
  }

  const handleAnimationDone = () => {
    const finished = animatingCards || []
    setResults(finished)
    setAnimatingCards(null)
    setPulling(false)
    const newlyUnlocked = detectNewlyUnlocked(economy.collection, economy.unlockedAchievements)
    if (newlyUnlocked.length > 0) {
      setPendingAchievements(newlyUnlocked)
      economy.markAchievementsUnlocked(newlyUnlocked.map(a => a.id))
    }
    const newCards = finished.filter(c => c.isNew)
    if (newCards.length > 0) setShowcaseCards(newCards)
    // 否则等下面的 useEffect 链推进
  }

  // 弹窗排队：showcase(isNew) → milestone → achievements (依次)
  // 用 useEffect 替代直接函数调用，避免 setState 闭包陷阱（pendingAchievements 等读到旧值）
  useEffect(() => {
    if (showcaseCards || activeMilestone || activeAchievement) return // 当前有弹窗，不推进
    if (animatingCards) return // 动画进行中
    if (pendingMilestone) {
      setActiveMilestone(pendingMilestone)
      setPendingMilestone(null)
      return
    }
    if (pendingAchievements.length > 0) {
      setActiveAchievement(pendingAchievements[0])
      setPendingAchievements(prev => prev.slice(1))
    }
  }, [showcaseCards, activeMilestone, activeAchievement, animatingCards, pendingMilestone, pendingAchievements])

  const handleShowcaseDone = () => setShowcaseCards(null)
  const handleMilestoneClose = () => setActiveMilestone(null)
  const handleAchievementClose = () => setActiveAchievement(null)

  const pityDisplay = economy.SSR_PITY - economy.pityCounter

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4">
      <h1 className="text-3xl font-black text-yellow-400 mb-1">{t('gacha.title')}</h1>
      <p className="text-gray-400 text-sm mb-4">{t('gacha.subtitle')}</p>

      {/* 本期推荐 banner */}
      {banner.id !== 'default' && featuredCards.length > 0 && (
        <motion.div
          className="bg-gradient-to-br from-purple-900/70 to-indigo-900/70 rounded-2xl p-3 mb-4 border border-purple-500/40 max-w-md w-full"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-[10px] text-purple-300 mb-1">{t('gacha.featured')}</div>
          <div className="text-base font-bold text-white mb-2">{banner.title}</div>
          <div className="flex gap-2 justify-center mb-2">
            {featuredCards.map(card => (
              <div key={card.id} className="relative w-[68px] h-[92px]">
                <BattleCard card={card} hp={card.hp || 0} maxHp={card.hp || 1} isPlayer={true} isActive={false} />
                {banner.boostFactor && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] px-1 rounded-full font-black shadow">
                    +{Math.round((banner.boostFactor - 1) * 100)}%
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-[10px] text-purple-200 text-center">{banner.description}</div>
        </motion.div>
      )}

      {/* Currency display */}
      <div className="flex gap-4 mb-3 text-sm">
        <span className="text-yellow-400 font-bold">🪙 {economy.coins}</span>
        <span className="text-cyan-400 font-bold">💎 {economy.diamonds}</span>
        <span className="text-gray-600">{t('gacha.pity', { n: pityDisplay })}</span>
      </div>

      {/* 图鉴进度条 */}
      {(() => {
        const owned = ownedDexCount(economy.collection)
        const pct = Math.min(100, (owned / TOTAL_DEX_CARDS) * 100)
        const remaining = Math.max(0, TOTAL_DEX_CARDS - owned)
        return (
          <div className="bg-gray-800/40 rounded-lg p-3 mb-3 max-w-md w-full">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-gray-300">{t('gacha.dexProgress')}</span>
              <span className="text-cyan-300 font-bold">{owned} / {TOTAL_DEX_CARDS}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="text-[10px] text-gray-400 mt-1.5 text-center">
              {remaining > 0 ? t('gacha.dexRemaining', { n: remaining }) : t('gacha.dexComplete')}
            </div>
          </div>
        )
      })()}

      {/* 概率公示 */}
      <details className="text-xs text-gray-400 mb-3 max-w-md w-full">
        <summary className="cursor-pointer hover:text-white text-center py-1">{t('gacha.oddsTitle')}</summary>
        <div className="bg-gray-800/50 rounded p-3 mt-2 grid grid-cols-2 gap-1">
          <div>{t('gacha.oddsR')}</div>
          <div>{t('gacha.oddsSR')}</div>
          <div>{t('gacha.oddsSSR')}</div>
          <div className="text-yellow-300">{t('gacha.oddsSP')}</div>
          <div className="col-span-2 text-[10px] text-gray-500 mt-1">{t('gacha.oddsPity', { n: economy.SSR_PITY })}</div>
        </div>
      </details>

      {/* Pull buttons */}
      <div className="flex gap-4 mb-6">
        <motion.button
          className={`px-5 py-3 rounded-xl font-bold flex flex-col items-center ${
            economy.canAfford(economy.SINGLE_COST)
              ? 'bg-blue-600 hover:bg-blue-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
          whileHover={economy.canAfford(economy.SINGLE_COST) ? { scale: 1.05 } : {}}
          whileTap={economy.canAfford(economy.SINGLE_COST) ? { scale: 0.95 } : {}}
          onClick={() => doPull(1)}
          disabled={pulling || !economy.canAfford(economy.SINGLE_COST)}
        >
          <span className="text-lg">{t('gacha.single')}</span>
          <span className="text-xs opacity-70">🪙 {economy.SINGLE_COST}</span>
        </motion.button>
        <motion.button
          className={`px-5 py-3 rounded-xl font-bold flex flex-col items-center ${
            economy.canAfford(economy.MULTI_COST)
              ? 'bg-purple-600 hover:bg-purple-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
          whileHover={economy.canAfford(economy.MULTI_COST) ? { scale: 1.05 } : {}}
          whileTap={economy.canAfford(economy.MULTI_COST) ? { scale: 0.95 } : {}}
          onClick={() => doPull(10)}
          disabled={pulling || !economy.canAfford(economy.MULTI_COST)}
        >
          <span className="text-lg">{t('gacha.multi')}</span>
          <span className="text-xs opacity-70">🪙 {economy.MULTI_COST} {t('gacha.multiGuarantee')}</span>
        </motion.button>
      </div>

      {/* Pull results */}
      {!pulling && results.length > 0 && (
        <motion.div
          key="results"
          className="flex gap-3 flex-wrap justify-center max-w-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {results.map((card, i) => (
            <motion.div
              key={card.instanceId || `${card.id}_${i}`}
              className={`relative rounded-xl border-2 ${rarityBg[card.rarity] || ''} overflow-hidden cursor-pointer`}
              initial={{ opacity: 0, y: 40, rotateY: 180 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={{ delay: i * 0.15, type: 'spring', damping: 12 }}
              onClick={() => setDetailCard(card)}
            >
              <BattleCard card={card} hp={card.hp || 0} maxHp={card.hp || 1} isPlayer={true} isActive={false} />
              {card.isNew ? (
                <motion.div
                  className="absolute top-0 left-0 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-br-lg shadow-md"
                  animate={{ scale: [1, 1.12, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >🆕 NEW!</motion.div>
              ) : card.isDupe ? (
                <div className="absolute top-0 left-0 bg-amber-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg">{t('gacha.dupeFragments', { n: card.fragments })}</div>
              ) : (
                <div className="absolute top-0 left-0 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-br-lg">×{card.count}</div>
              )}
              <div className="absolute bottom-0 right-0 left-0 bg-gradient-to-t from-cyan-700/90 to-cyan-700/0 text-cyan-100 text-[10px] font-bold text-center py-1 pointer-events-none">
                {t('gacha.tapDetail')}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* 抽到 SR+ 后联动 DeckBuilder 提示 */}
      {(() => {
        const srPlus = results.filter(c => c.rarity === 'SR' || c.rarity === 'SSR' || c.type === 'sp')
        if (srPlus.length === 0 || !onGotoDeckBuilder) return null
        return (
          <motion.div
            className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 max-w-md w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-white text-sm mb-3">
              {t('gacha.gotRare', { n: srPlus.length })}
            </div>
            <button
              onClick={() => onGotoDeckBuilder(srPlus.map(c => c.id))}
              className="w-full bg-white text-purple-700 font-bold py-2 rounded-lg hover:bg-yellow-50"
            >
              {t('gacha.goToDeck')}
            </button>
          </motion.div>
        )
      })()}

      {/* Back button */}
      <motion.button
        className="mt-8 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300"
        whileTap={{ scale: 0.95 }}
        onClick={onBack}
      >
        {t('gacha.back')}
      </motion.button>

      {animatingCards && (
        <GachaAnimation
          cards={animatingCards}
          onDone={handleAnimationDone}
          paused={!!activeQuiz}
          midpointAt={5}
          onMidpointReached={() => {
            // 仅十连触发：基于已翻出的前 5 张选关联题
            if (animatingCards.length >= 10) {
              const quiz = selectQuizForPull(animatingCards.slice(0, 5))
              if (quiz) setActiveQuiz(quiz)
            }
          }}
        />
      )}
      {activeQuiz && (
        <GachaQuizModal quiz={activeQuiz} onComplete={() => setActiveQuiz(null)} />
      )}
      {showcaseCards && (
        <CardShowcase cards={showcaseCards} onDone={handleShowcaseDone} />
      )}
      {activeMilestone && (
        <MilestoneModal milestone={activeMilestone} onClose={handleMilestoneClose} />
      )}
      {activeAchievement && (
        <AchievementModal achievement={activeAchievement} onClose={handleAchievementClose} />
      )}

      {detailCard && (
        <CardDetailModal
          card={detailCard}
          context="gacha"
          isNew={!!detailCard.isNew}
          ownership={{
            count: detailCard.count ?? 0,
            fragments: detailCard.fragments ?? 0,
          }}
          onClose={() => setDetailCard(null)}
          badge={
            detailCard.isDupe ? (
              <span className="text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full">{t('gacha.fragments', { n: detailCard.fragments })}</span>
            ) : null
          }
        />
      )}
    </div>
  )
}
