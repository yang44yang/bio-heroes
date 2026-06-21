import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '../i18n/LanguageContext'
import { prevDateStr } from '../data/dailyChallenges'
import GachaQuizModal, { selectQuizForPull } from './GachaQuizModal'

// 每日挑战屏幕：今日主题 + 约束 + streak + 7天日历 + 奖励预览 + 状态化主按钮
export default function DailyChallenge({ daily, economy, justWon, onClearResult, onStartChallenge, onBack }) {
  const { t, lang } = useLanguage()
  const { todayChallenge: ch, status, currentStreak, maxStreak, history, today } = daily
  const dual = (zh, en) => (lang === 'en' ? (en || zh) : zh)

  // 最近 7 天：从今天往前 6 天，标记是否完成
  const doneDates = new Set((history || []).map(h => h.date))
  const last7 = []
  let d = today
  for (let i = 0; i < 7; i++) { last7.unshift(d); d = prevDateStr(d) }

  // 距离下一张 SSR 券（每 7 天）还差几天
  const toSSR = currentStreak > 0 ? (7 - (currentStreak % 7)) % 7 : 7
  const nextSSRDays = toSSR === 0 ? 7 : toSSR

  // 胜利后的当日主题问答彩蛋（答对 +20 金币，答错不罚）
  const [showQuiz, setShowQuiz] = useState(false)
  const dailyQuiz = useMemo(() => {
    try { return selectQuizForPull([{ id: ch.theme.cardId, faction: ch.theme.faction }]) } catch (e) { return null }
  }, [ch.theme.cardId, ch.theme.faction])
  const finishReward = () => { if (dailyQuiz) setShowQuiz(true); else onClearResult() }
  const finishQuiz = (correct) => { if (correct && economy?.addCoins) economy.addCoins(20); setShowQuiz(false); onClearResult() }

  const startChallenge = () => {
    onStartChallenge({
      stageId: ch.id,
      stageName: dual('今日挑战', 'Daily Challenge'),
      enemyConfig: ch.enemyConfig,
      conundrum: ch.conundrum,
    })
  }

  return (
    <div className="min-h-screen-d bg-gray-900 text-white px-4 py-4 overflow-y-auto">
      {/* 顶栏 */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-gray-300 hover:text-white text-sm font-bold">
          {dual('← 返回', '← Back')}
        </button>
        <h1 className="text-xl font-black text-teal-300">{t('menu.daily')}</h1>
        <div className="text-orange-400 font-bold text-sm">🔥 {currentStreak}</div>
      </div>

      {/* streak 卡 */}
      <div className="bg-gradient-to-r from-orange-600/30 to-amber-600/20 border border-orange-500/40 rounded-2xl p-4 mb-4 text-center">
        <div className="text-3xl font-black text-orange-300">🔥 {currentStreak}</div>
        <div className="text-xs text-gray-300 mt-1">
          {dual('连续挑战天数', 'Day streak')} · {dual('最高', 'Best')} {maxStreak}
        </div>
        {/* 7 天日历 */}
        <div className="flex justify-center gap-1.5 mt-3">
          {last7.map((date) => {
            const done = doneDates.has(date)
            const isToday = date === today
            return (
              <div key={date}
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${
                  done ? 'bg-green-500 text-white' : isToday ? 'bg-teal-700 border border-teal-400' : 'bg-gray-700/60 text-gray-500'
                }`}
                title={date}
              >
                {done ? '✅' : isToday ? '📍' : '·'}
              </div>
            )
          })}
        </div>
      </div>

      {/* 今日主题 */}
      <div className="bg-cyan-900/30 border-l-4 border-cyan-400 rounded-xl p-4 mb-3">
        <div className="text-xs text-cyan-300 font-bold mb-1">{dual('🔬 今日主题', '🔬 Today’s Theme')}</div>
        <div className="text-lg font-black text-white">{ch.theme.emoji} {dual(ch.theme.name, ch.theme.nameEn)}</div>
        <div className="text-sm text-gray-200 mt-1 leading-relaxed">{dual(ch.theme.point, ch.theme.pointEn)}</div>
      </div>

      {/* 今日规则（约束） */}
      <div className={`rounded-xl p-4 mb-3 border-l-4 ${ch.constraint.kind === 'buff' ? 'bg-emerald-900/30 border-emerald-400' : 'bg-orange-900/30 border-orange-400'}`}>
        <div className="text-xs font-bold mb-1 text-gray-300">
          {ch.constraint.kind === 'buff' ? dual('🎁 今日福利', '🎁 Today’s Bonus') : dual('⚡ 今日规则', '⚡ Today’s Rule')}
        </div>
        <div className="text-lg font-black text-white">{ch.constraint.emoji} {dual(ch.constraint.name, ch.constraint.nameEn)}</div>
        <div className="text-sm text-gray-200 mt-1">{dual(ch.constraint.desc, ch.constraint.descEn)}</div>
      </div>

      {/* 奖励预览 */}
      <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
        <div className="text-xs text-gray-300 font-bold mb-2">{dual('🎯 今日奖励', '🎯 Rewards')}</div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-yellow-400 font-bold">🪙 {100 + 10 * Math.min(currentStreak + (status === 'done' ? 0 : 1), 7)}</span>
          {ch.maxTurns && <span className="text-cyan-300">⏱️ {dual(`${ch.maxTurns} 回合内 +50`, `Win in ${ch.maxTurns} +50`)}</span>}
          <span className="text-pink-300">🎟️ {dual(`再 ${nextSSRDays} 天得 SSR 券`, `SSR ticket in ${nextSSRDays}d`)}</span>
        </div>
      </div>

      {/* 主按钮 */}
      {status === 'incomplete' ? (
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={startChallenge}
          className="w-full py-4 bg-gradient-to-r from-teal-600 to-cyan-500 hover:from-teal-500 hover:to-cyan-400 rounded-2xl text-white text-xl font-black shadow-lg shadow-teal-500/30"
        >
          {dual('开始挑战 →', 'Start Challenge →')}
        </motion.button>
      ) : (
        <div className="w-full py-4 bg-gray-800 rounded-2xl text-gray-400 text-lg font-bold text-center">
          {dual('✅ 今天完成啦，明天再来 ⏰', '✅ Done today — come back tomorrow ⏰')}
        </div>
      )}

      {/* 胜利奖励庆祝 */}
      <AnimatePresence>
        {justWon?.reward && !showQuiz && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.9)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={finishReward}
          >
            <motion.div
              className="bg-gradient-to-br from-teal-600 to-cyan-700 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl"
              initial={{ scale: 0.6, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', damping: 14 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-5xl mb-2">🎉</div>
              <div className="text-2xl font-black text-white mb-1">{dual('挑战成功！', 'Challenge Complete!')}</div>
              <div className="text-sm text-teal-100 mb-4">🔥 {dual(`连续 ${justWon.streak} 天`, `${justWon.streak}-day streak`)}</div>
              <div className="bg-black/30 rounded-xl p-4 mb-4 space-y-1.5 text-left">
                <div className="text-yellow-300 font-bold">🪙 +{justWon.reward.coins} {dual('金币', 'coins')}</div>
                {justWon.reward.ssrTicket && (
                  <div className="text-pink-300 font-bold">🎟️ {dual('SSR 抽卡券 ×1！', 'SSR Ticket ×1!')}</div>
                )}
                {justWon.reward.fragmentCount > 0 && (
                  <div className="text-purple-300 font-bold">🧩 {dual(`卡牌碎片 ×${justWon.reward.fragmentCount}`, `Fragments ×${justWon.reward.fragmentCount}`)}</div>
                )}
              </div>
              <button
                onClick={finishReward}
                className="bg-white text-teal-700 font-black px-8 py-3 rounded-xl text-lg hover:bg-teal-50 shadow-lg"
              >
                {t('common.awesome')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 当日主题问答彩蛋（答对 +20 金币） */}
      {showQuiz && dailyQuiz && (
        <GachaQuizModal quiz={dailyQuiz} onComplete={finishQuiz} />
      )}
    </div>
  )
}
