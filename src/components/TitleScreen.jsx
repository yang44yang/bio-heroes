import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { exportSave, importSave, resetSave } from '../utils/saveManager'

export default function TitleScreen({ onStartBattle, onOpenGacha, onOpenDeckBuilder, onOpenCollection, onOpenTutorial, onOpenCampaign, economy }) {
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
    // Reset file input
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleReset = () => {
    if (window.confirm('确定要重置所有存档吗？此操作不可恢复！')) {
      resetSave()
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* 标题 */}
      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-5xl font-black mb-2">
          <span className="text-red-500">生物</span>
          <span className="text-yellow-400">英雄传</span>
        </h1>
        <p className="text-gray-400 text-sm">Bio Heroes — 龙珠风格生物科学卡牌对战</p>
      </motion.div>

      {/* 货币显示 */}
      {economy && (
        <motion.div
          className="flex gap-4 mb-6 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="text-yellow-400 font-bold">🪙 {economy.coins}</span>
          <span className="text-cyan-400 font-bold">💎 {economy.diamonds}</span>
          <span className="text-gray-500">收集 {economy.collection.length} 张</span>
        </motion.div>
      )}

      {/* 菜单按钮 */}
      <div className="space-y-3 w-64">
        <motion.button
          className="w-full py-4 bg-amber-700 hover:bg-amber-600 rounded-2xl text-white text-xl font-black shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          onClick={onOpenCampaign}
        >
          🏆 闯关战役
        </motion.button>

        <motion.button
          className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-2xl text-white text-xl font-black shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          onClick={onStartBattle}
        >
          ⚔️ 自由对战
        </motion.button>

        <motion.button
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white text-xl font-black shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onOpenDeckBuilder}
        >
          🃏 卡组
        </motion.button>

        <motion.button
          className="w-full py-4 bg-purple-600 hover:bg-purple-500 rounded-2xl text-white text-xl font-black shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          onClick={onOpenGacha}
        >
          🎰 抽卡
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
          📖 图鉴
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
          📚 教学
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
          ⚙️ 存档管理
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
                💾 导出存档
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
                  📂 导入存档
                </button>
              </div>

              <button
                className="w-full py-2 bg-red-900 hover:bg-red-800 rounded-lg text-sm text-red-300"
                onClick={handleReset}
              >
                🗑️ 重置存档
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
        className="mt-12 text-gray-600 text-xs text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <p>🧬 在对战中学习生物科学</p>
        <p className="mt-1">父子亲子项目 v0.1</p>
      </motion.div>
    </div>
  )
}
