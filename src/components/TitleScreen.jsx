import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { exportSave, importSave, resetSave } from '../utils/saveManager'
import { useLanguage } from '../i18n/LanguageContext'

export default function TitleScreen({ onStartBattle, onOpenGacha, onOpenDeckBuilder, onOpenCollection, onOpenTutorial, onOpenCampaign, economy }) {
  const { t, lang, toggleLang } = useLanguage()
  const [showSettings, setShowSettings] = useState(false)
  const [importMsg, setImportMsg] = useState(null)
  const fileRef = useRef(null)

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await importSave(file)
    setImportMsg(result)
    if (result.success) {
      setTimeout(() => window.location.reload(), 1200)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleReset = () => {
    if (window.confirm(t('menu.confirmReset'))) {
      resetSave()
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen-d flex flex-col items-center justify-center px-4 py-4 overflow-y-auto">
      {/* 语言切换 */}
      <div className="absolute top-3 right-3 z-10">
        <button
          className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs font-bold"
          onClick={toggleLang}
        >
          🌐 {lang === 'zh' ? 'EN' : '中文'}
        </button>
      </div>

      {/* 标题 */}
      <motion.div
        className="text-center mb-4 sm:mb-10"
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

      {/* 货币显示 */}
      {economy && (
        <motion.div
          className="flex gap-4 mb-3 sm:mb-6 text-xs sm:text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-yellow-400 font-bold">🪙 {economy.coins}</span>
          <span className="text-cyan-400 font-bold">💎 {economy.diamonds}</span>
          <span className="text-gray-500">{t('menu.collected', { n: economy.collection.length })}</span>
        </motion.div>
      )}

      {/* 菜单按钮 */}
      <div className="space-y-2 sm:space-y-3 w-56 sm:w-64">
        <motion.button
          className="w-full py-2.5 sm:py-4 bg-amber-700 hover:bg-amber-600 rounded-2xl text-white text-lg sm:text-xl font-black shadow-lg"
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
          className="w-full py-2.5 sm:py-4 bg-red-600 hover:bg-red-500 rounded-2xl text-white text-lg sm:text-xl font-black shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          onClick={onStartBattle}
        >
          {t('menu.freeBattle')}
        </motion.button>

        <motion.button
          className="w-full py-2.5 sm:py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white text-lg sm:text-xl font-black shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onOpenDeckBuilder}
        >
          {t('menu.deck')}
        </motion.button>

        <motion.button
          className="w-full py-2.5 sm:py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl text-white text-lg sm:text-xl font-black shadow-lg"
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
          className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-2xl text-white text-lg font-bold shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onOpenCollection}
        >
          {t('menu.collection')}
        </motion.button>

        <motion.button
          className="w-full py-3 bg-yellow-700 hover:bg-yellow-600 rounded-2xl text-yellow-100 text-lg font-bold shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.55 }}
          onClick={onOpenTutorial}
        >
          {t('menu.tutorial')}
        </motion.button>

        <motion.button
          className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 rounded-2xl text-gray-400 text-sm font-bold"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.65 }}
          onClick={() => setShowSettings(!showSettings)}
        >
          {t('menu.settings')}
        </motion.button>
      </div>

      {/* 存档管理面板 */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="w-64 mt-3 bg-gray-800 rounded-xl p-4 border border-gray-700"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="space-y-2.5">
              <button
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm text-white"
                onClick={exportSave}
              >
                {t('settings.export')}
              </button>

              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
                <button
                  className="w-full py-2 bg-blue-700 hover:bg-blue-600 rounded-lg text-sm text-white"
                  onClick={() => fileRef.current?.click()}
                >
                  {t('settings.import')}
                </button>
              </div>

              <button
                className="w-full py-2 bg-red-900 hover:bg-red-800 rounded-lg text-sm text-red-300"
                onClick={handleReset}
              >
                {t('settings.reset')}
              </button>

              {importMsg && (
                <motion.div
                  className={`text-xs text-center py-1 rounded ${importMsg.success ? 'text-green-400' : 'text-red-400'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {importMsg.message}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部信息 */}
      <motion.div
        className="mt-4 sm:mt-12 text-gray-600 text-xs text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <p>{t('menu.footer1')}</p>
        <p className="mt-1">{t('menu.footer2')}</p>
      </motion.div>
    </div>
  )
}
