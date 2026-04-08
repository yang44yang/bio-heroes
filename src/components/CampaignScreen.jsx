import React, { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  campaignData, loadCampaignProgress, saveCampaignProgress,
  isStageUnlocked, isChapterComplete, getTotalStars, getMaxStars,
  calculateStars,
} from '../data/campaignData'
import { loadTutorialProgress } from '../data/tutorialData'
import { FACTIONS } from '../data/deckRules'
import DialogueBox from './DialogueBox'
import { useLanguage } from '../i18n/LanguageContext'

/**
 * CampaignScreen — 闯关战役
 *
 * Props:
 *   onBack: () => void
 *   onStartBattle: (stageConfig) => void  — 启动战斗，传递关卡配置
 *   onStartTutorial: (tutorialLevel) => void — 启动教学关卡
 *   economy: useEconomy()
 */
export default function CampaignScreen({ onBack, onStartBattle, onStartTutorial, economy }) {
  const { t, lang, cardName } = useLanguage()
  const [progress, setProgress] = useState(() => loadCampaignProgress())
  const [selectedStage, setSelectedStage] = useState(null) // 详情弹窗
  const [activeChapter, setActiveChapter] = useState(0)

  // 同步教学关卡进度到战役进度
  useEffect(() => {
    const tutProgress = loadTutorialProgress()
    if (tutProgress.completedLevels.length > 0) {
      setProgress(prev => {
        const next = { ...prev, stageStars: { ...prev.stageStars } }
        tutProgress.completedLevels.forEach(lvl => {
          const stageId = `1-${lvl}`
          if (!next.stageStars[stageId]) {
            next.stageStars[stageId] = 3 // 教学完成默认3星
          }
        })
        saveCampaignProgress(next)
        return next
      })
    }
  }, [])

  const totalStars = getTotalStars(progress)
  const maxStars = getMaxStars()

  // 星数里程碑
  const nextMilestone = totalStars < 30 ? { target: 30, reward: t('campaign.reward500') }
    : totalStars < 45 ? { target: 45, reward: t('campaign.reward1000') }
    : null
  const hasScientistTitle = progress.claimedRewards?.ch4_complete

  // 进入页面时检查里程碑奖励（补发机制）
  useEffect(() => {
    const prog = loadCampaignProgress()
    let changed = false
    const stars = getTotalStars(prog)
    if (stars >= 30 && !prog.claimedRewards?.star_milestone_30) {
      prog.claimedRewards = prog.claimedRewards || {}
      prog.claimedRewards.star_milestone_30 = true
      economy?.addCoins?.(500)
      changed = true
    }
    if (stars >= 45 && !prog.claimedRewards?.star_milestone_45) {
      prog.claimedRewards = prog.claimedRewards || {}
      prog.claimedRewards.star_milestone_45 = true
      economy?.addCoins?.(1000)
      changed = true
    }
    if (changed) {
      saveCampaignProgress(prog)
      setProgress(prog)
    }
  }, [])

  const handleStageClick = useCallback((stage, chapter) => {
    if (!isStageUnlocked(stage.id, progress)) return
    setSelectedStage({ ...stage, chapter })
  }, [progress])

  const handleStartStage = useCallback((stage) => {
    if (stage.type === 'tutorial') {
      onStartTutorial(stage.tutorialLevel)
    } else {
      onStartBattle({
        stageId: stage.id,
        stageName: stage.name,
        stageType: stage.type,
        enemyConfig: stage.enemyConfig,
        playerConfig: stage.playerConfig,
        dialogue: stage.dialogue,
        rewards: stage.rewards,
        starConditions: stage.starConditions,
      })
    }
    setSelectedStage(null)
  }, [onStartBattle, onStartTutorial])

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* 顶部标题栏 */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-800">
        <button
          className="text-gray-400 text-sm hover:text-white"
          onClick={onBack}
        >
          {t('campaign.back')}
        </button>
        <h1 className="text-lg font-black">
          {t('campaign.title')}{hasScientistTitle ? ' 🔬' : ''}
        </h1>
        <div className="text-right">
          <div className="text-sm text-yellow-400 font-bold">⭐ {totalStars}/{maxStars}</div>
          {nextMilestone && (
            <div className="text-[10px] text-gray-500">
              {t('campaign.nextReward', { target: nextMilestone.target, reward: nextMilestone.reward })}
            </div>
          )}
        </div>
      </div>

      {/* 章节 Tab */}
      <div className="flex border-b border-gray-800 overflow-x-auto">
        {campaignData.chapters.map((ch, idx) => {
          const chComplete = isChapterComplete(ch.id, progress)
          const chUnlocked = ch.unlockCondition === null ||
            (ch.unlockCondition === 'ch1_complete' && isChapterComplete('ch1', progress)) ||
            (ch.unlockCondition === 'ch2_complete' && isChapterComplete('ch2', progress)) ||
            (ch.unlockCondition === 'ch3_complete' && isChapterComplete('ch3', progress))

          return (
            <button
              key={ch.id}
              className={`flex-1 min-w-0 py-2 px-1 text-center text-xs font-bold transition-all border-b-2 ${
                activeChapter === idx
                  ? 'border-yellow-500 text-yellow-400'
                  : chUnlocked
                  ? 'border-transparent text-gray-400 hover:text-gray-200'
                  : 'border-transparent text-gray-700 cursor-not-allowed'
              }`}
              onClick={() => chUnlocked && setActiveChapter(idx)}
              disabled={!chUnlocked}
            >
              <div className="text-base">{chUnlocked ? ch.icon : '🔒'}</div>
              <div className="truncate">{ch.name}</div>
              {chComplete && <div className="text-green-500 text-[10px]">✅</div>}
            </button>
          )
        })}
      </div>

      {/* 章节描述 */}
      <div className="px-4 py-2 text-center">
        <p className="text-gray-500 text-xs">{campaignData.chapters[activeChapter].description}</p>
      </div>

      {/* 关卡列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="space-y-2">
          {campaignData.chapters[activeChapter].stages.map((stage, idx) => {
            const unlocked = isStageUnlocked(stage.id, progress)
            const stars = progress.stageStars[stage.id] || 0
            const isBoss = stage.type === 'boss'
            const isTutorial = stage.type === 'tutorial'

            return (
              <motion.button
                key={stage.id}
                className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 border transition-all ${
                  !unlocked
                    ? 'bg-gray-900 border-gray-800 text-gray-700 cursor-not-allowed'
                    : isBoss
                    ? 'bg-red-950/40 border-red-800/60 hover:border-red-500 text-white'
                    : 'bg-gray-800/80 border-gray-700 hover:border-yellow-600 text-white'
                }`}
                whileHover={unlocked ? { scale: 1.01 } : {}}
                whileTap={unlocked ? { scale: 0.99 } : {}}
                onClick={() => handleStageClick(stage, campaignData.chapters[activeChapter])}
                disabled={!unlocked}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                {/* 关卡图标 */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-black ${
                  !unlocked ? 'bg-gray-800 text-gray-600' :
                  isBoss ? 'bg-red-800 text-red-200' :
                  isTutorial ? 'bg-yellow-800 text-yellow-200' :
                  'bg-gray-700 text-gray-200'
                }`}>
                  {!unlocked ? '🔒' : isBoss ? '💀' : isTutorial ? '📚' : stage.id.split('-')[1]}
                </div>

                {/* 关卡信息 */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">
                    {isBoss && <span className="text-red-400 mr-1">BOSS</span>}
                    {stage.name}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    {isTutorial ? t('campaign.tutorialStage') :
                     stage.enemyConfig ? `HP ${stage.enemyConfig.leaderHP.toLocaleString()}` : ''}
                    {stage.playerConfig?.recommendedFactions &&
                      <span className="ml-1">
                        {t('campaign.recommend')} {stage.playerConfig.recommendedFactions.map(f => FACTIONS[f]?.icon).join('')}
                      </span>
                    }
                  </div>
                </div>

                {/* 星数 */}
                <div className="text-base whitespace-nowrap">
                  {unlocked && (
                    <>
                      {[1, 2, 3].map(s => (
                        <span key={s} className={s <= stars ? 'text-yellow-400' : 'text-gray-700'}>⭐</span>
                      ))}
                    </>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* 关卡详情弹窗 */}
      {/* ================================================================ */}
      <AnimatePresence>
        {selectedStage && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedStage(null)}
          >
            <motion.div
              className={`w-full max-w-sm rounded-2xl p-5 border-2 ${
                selectedStage.type === 'boss'
                  ? 'bg-gray-900 border-red-600'
                  : 'bg-gray-900 border-gray-600'
              }`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {/* 标题 */}
              <div className="text-center mb-3">
                <div className="text-xs text-gray-500 mb-1">
                  {'⭐'.repeat(selectedStage.chapter.difficulty)} {selectedStage.chapter.name}
                </div>
                <h2 className="text-xl font-black">
                  {selectedStage.type === 'boss' && <span className="text-red-400">💀 </span>}
                  {selectedStage.name}
                </h2>
              </div>

              {/* 关卡信息 */}
              {selectedStage.type !== 'tutorial' && selectedStage.enemyConfig && (
                <div className="bg-gray-800/60 rounded-xl p-3 mb-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('campaign.enemyHP')}</span>
                    <span className="text-red-400 font-bold">{selectedStage.enemyConfig.leaderHP.toLocaleString()}</span>
                  </div>
                  {selectedStage.enemyConfig.bossMechanic && (
                    <div className="text-[10px] text-red-300">
                      {t('campaign.bossMechanic')}
                    </div>
                  )}
                  {selectedStage.playerConfig?.recommendedFactions && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">{t('campaign.recommendFaction')}</span>
                      <span>
                        {selectedStage.playerConfig.recommendedFactions.map(f =>
                          <span key={f} className="ml-1">{FACTIONS[f]?.icon} {FACTIONS[f]?.name}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* 星数 */}
              <div className="text-center mb-3">
                <span className="text-gray-500 text-xs">{t('campaign.bestStars')}</span>
                {[1, 2, 3].map(s => (
                  <span key={s} className={`text-lg ${s <= (progress.stageStars[selectedStage.id] || 0) ? 'text-yellow-400' : 'text-gray-700'}`}>⭐</span>
                ))}
              </div>

              {/* 星数条件 */}
              {selectedStage.starConditions && (
                <div className="text-[10px] text-gray-500 mb-3 space-y-0.5">
                  <div>⭐ {selectedStage.starConditions.one}</div>
                  <div>⭐⭐ {selectedStage.starConditions.two}</div>
                  <div>⭐⭐⭐ {selectedStage.starConditions.three}</div>
                </div>
              )}

              {/* 奖励 */}
              {selectedStage.rewards && (
                <div className="bg-gray-800/40 rounded-lg p-2 mb-3 text-xs text-gray-400">
                  <div>{t('campaign.firstClear')}: {formatReward(selectedStage.rewards.firstClear)}</div>
                  <div>{t('campaign.threeStars')}: {formatReward(selectedStage.rewards.threeStars)}</div>
                </div>
              )}

              {/* 卡组状态提示 */}
              {selectedStage.type !== 'tutorial' && (() => {
                try {
                  const saved = JSON.parse(localStorage.getItem('bio-heroes-decks') || '[]')
                  const hasDeck = saved.some(d => d && d.main?.length > 0)
                  if (!hasDeck) {
                    return (
                      <div className="text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-700/30 rounded-lg px-2 py-1.5 mb-3">
                        {t('campaign.noDeck')}
                      </div>
                    )
                  }
                } catch (e) {}
                return null
              })()}

              {/* 按钮 */}
              <div className="flex gap-2">
                <button
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm font-bold text-gray-300"
                  onClick={() => setSelectedStage(null)}
                >
                  {t('campaign.back2')}
                </button>
                <button
                  className={`flex-1 py-3 rounded-xl text-sm font-black ${
                    selectedStage.type === 'boss'
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-yellow-500 hover:bg-yellow-400 text-black'
                  }`}
                  onClick={() => handleStartStage(selectedStage)}
                >
                  {selectedStage.type === 'tutorial' ? t('campaign.startTutorial') : t('campaign.startBattle')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function formatReward(r) {
  if (!r) return ''
  const parts = []
  if (r.coins) parts.push(`${r.coins}🪙`)
  if (r.diamonds) parts.push(`${r.diamonds}💎`)
  if (r.ssrTicket) parts.push('SSR保底券🎫')
  return parts.join(' + ') || '-'
}
