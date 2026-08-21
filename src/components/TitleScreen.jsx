import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ownedDexCount } from '../data/dexSets'
import { loadTutorialProgress } from '../data/tutorialData'
import { useLanguage } from '../i18n/LanguageContext'
import MoreMenu from './MoreMenu'

// ================================================================
//  TitleScreen —— 首页只回答一个问题：「现在玩什么」
//
//  ☠️ 别再往这里加按钮。首页曾经堆了 10 个（7 种颜色、宽度全一样、没有层级），后果实测：
//     · iPad 横屏 1024×768 文档高 924 > 768 → 首页必须滚动，「存档管理」整个在屏幕外；
//     · 「⚔️ 自由对战」和「🃏 卡组」是**同一个界面**（App 里两行代码一模一样）—— 已合并；
//     · 家长用的「🧪 测试场」夹在孩子的按钮中间。
//  现在的规矩：**要玩的**留首页，**工具**进 MoreMenu 浮层。
//  首页按钮预算 7 个（4 大 + 抽卡 + 更多 + 未毕业时的教学），由 test-title-menu ① 钉死。
// ================================================================

const BIG = 'w-full rounded-2xl text-white font-black shadow-lg py-2.5 sm:py-4 text-lg sm:text-xl'

export default function TitleScreen({ onStartBattle, onOpenGacha, onOpenCollection, onOpenTutorial, onOpenCampaign, onOpenDailyChallenge, onOpenTestArena, onOpenPvp, daily, economy }) {
  const { t } = useLanguage()
  const [showMore, setShowMore] = useState(false)
  // 教学毕业了没 —— 决定「📚 教学」留首页还是收进「更多」。
  // TitleScreen 每次回主菜单都会重新挂载（App 里是 screen === 'title' 条件渲染），所以这个初始值会刷新。
  const [graduated] = useState(() => loadTutorialProgress().graduated)

  return (
    <div className="min-h-screen-d flex flex-col items-center justify-center px-4 py-4 overflow-y-auto">
      {/* 标题 */}
      <motion.div
        className="text-center mb-4 sm:mb-8"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl sm:text-5xl font-black mb-1 sm:mb-2">
          <span className="text-red-500">{t('menu.title.bio')}</span>
          <span className="text-yellow-400">{t('menu.title.heroes')}</span>
        </h1>
        <p className="text-gray-400 text-sm">{t('menu.subtitle')}</p>
      </motion.div>

      {/* 货币行。「收集 N 张」本身就是图鉴入口 —— 图鉴收进「更多」后，这是它的第二个入口，
          否则整个游戏就只剩浮层里那一处能进图鉴了（守卫 ⑥）。 */}
      {economy && (
        <motion.div
          className="flex gap-4 mb-3 sm:mb-5 text-xs sm:text-sm items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-yellow-400 font-bold">🪙 {economy.coins}</span>
          <span className="text-cyan-400 font-bold">💎 {economy.diamonds}</span>
          <button
            className="text-gray-400 hover:text-cyan-300 underline decoration-dotted underline-offset-4"
            onClick={onOpenCollection}
            title={t('menu.collectedTip')}
          >
            {t('menu.collected', { n: ownedDexCount(economy.collection) })}
          </button>
          {daily?.currentStreak > 0 && (
            <span className="text-orange-400 font-bold">🔥 {daily.currentStreak}</span>
          )}
        </motion.div>
      )}

      <div className="w-56 sm:w-64">
        {/* === 第一层：现在玩什么 === */}
        <div className="space-y-2 sm:space-y-3">
          {/* 闯关战役是主线 —— 做成最大的那个，首页的"默认答案" */}
          <motion.button
            className="w-full py-3 sm:py-5 bg-amber-700 hover:bg-amber-600 rounded-2xl text-white text-xl sm:text-2xl font-black shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            onClick={onOpenCampaign}
          >
            {t('menu.campaign')}
          </motion.button>

          <motion.button
            className={`relative ${BIG} bg-teal-600 hover:bg-teal-500`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={onOpenDailyChallenge}
          >
            {t('menu.daily')}
            {daily?.status === 'incomplete' && (
              <span className="absolute top-2 right-3 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </motion.button>

          <motion.button
            className={`${BIG} bg-cyan-600 hover:bg-cyan-500`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            onClick={onOpenPvp}
          >
            {t('menu.pvp')}
          </motion.button>

          {/* ⚠️ 这个按钮落地的是 DeckBuilder（选卡组 → 出战）。以前首页还有一个「🃏 卡组」按钮
              指向**同一个界面**，已合并掉；界面标题也补了副标题说清"选一套出战"。 */}
          <motion.button
            className={`${BIG} bg-red-600 hover:bg-red-500`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={onStartBattle}
          >
            {t('menu.freeBattle')}
          </motion.button>
        </div>

        {/* === 第二层：打之前弄的 === */}
        {/* 没通关教学时留在首页显眼处；毕业后自动收进「更多」（守卫 ⑤）。
            闯关界面里也有教学入口，所以收起来不会丢。 */}
        {!graduated && (
          <motion.button
            className="w-full mt-2 sm:mt-3 py-2 sm:py-2.5 bg-yellow-700 hover:bg-yellow-600 rounded-2xl text-yellow-100 text-base font-bold shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            onClick={onOpenTutorial}
          >
            {t('menu.tutorial')}
          </motion.button>
        )}

        <div className="grid grid-cols-2 gap-2 mt-2 sm:mt-3">
          <motion.button
            className="py-2.5 bg-purple-600 hover:bg-purple-500 rounded-2xl text-white text-base sm:text-lg font-black shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            onClick={onOpenGacha}
          >
            {t('menu.gacha')}
          </motion.button>

          <motion.button
            className="py-2.5 bg-gray-700 hover:bg-gray-600 rounded-2xl text-gray-200 text-base sm:text-lg font-bold shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45 }}
            onClick={() => setShowMore(true)}
          >
            {t('menu.more')}
          </motion.button>
        </div>
      </div>

      {/* 底部信息 */}
      <motion.div
        className="mt-4 sm:mt-8 text-gray-600 text-xs text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <p>{t('menu.footer1')}</p>
        <p className="mt-1">{t('menu.footer2')}</p>
      </motion.div>

      {/* === ⚙️ 更多：二级菜单（浮层，不占首页高度） === */}
      <MoreMenu
        open={showMore}
        onClose={() => setShowMore(false)}
        graduated={graduated}
        onOpenCollection={onOpenCollection}
        onOpenTutorial={onOpenTutorial}
        onOpenTestArena={onOpenTestArena}
      />
    </div>
  )
}
