import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { exportSave, importSave, resetSave } from '../utils/saveManager'
import { getQuizMode, setQuizMode } from '../utils/settings'
import { useLanguage } from '../i18n/LanguageContext'

// ================================================================
//  MoreMenu —— 首页的「⚙️ 更多」二级菜单
//
//  为什么单独成文件：首页原本 10 个按钮堆一列，其中一半是**工具**（图鉴/教学/语言/测试场/
//  存档管理/题库模式），把它们和「现在玩什么」混在一起，7 岁的齐齐没法一眼找到入口；
//  iPad 横屏还因此撑出滚动条（实测文档高 924 > 768，「存档管理」整个在屏幕外）。
//
//  ☠️ 必须是 **fixed 浮层**，不能是旧那种内联展开：内联展开会把首页撑高，横屏当场溢出。
//     浮层脱离文档流，开多大都不会给首页添一像素。（守卫 test-title-menu ④ 钉死）
// ================================================================
export default function MoreMenu({ open, onClose, graduated, onOpenCollection, onOpenTutorial, onOpenTestArena }) {
  const { t, lang, toggleLang } = useLanguage()
  const [importMsg, setImportMsg] = useState(null)
  const [quizMode, setQuizModeState] = useState(() => getQuizMode())
  const fileRef = useRef(null)

  // 家长门（简单算术）：测试场和题库模式共用同一道门，防孩子误入 dev 工具 / 误改设置。
  // ☠️ 搬家时最容易丢的就是这道门 —— 守卫 test-title-menu ⑦ 要求两个入口都调用它。
  const parentGate = () => {
    const ans = window.prompt(t('settings.parentGate'))
    if (ans === null) return false
    if (ans.trim() !== '56') {
      setImportMsg({ success: false, message: t('settings.parentGateFail') })
      return false
    }
    return true
  }

  const handleQuizMode = (mode) => {
    if (mode === quizMode) return
    if (!parentGate()) return
    setQuizMode(mode)
    setQuizModeState(mode)
    setImportMsg(null)
  }

  const handleOpenTestArena = () => {
    if (!parentGate()) return
    onOpenTestArena?.()
  }

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

  const rowCls = 'w-full py-2.5 rounded-xl text-sm font-bold text-left px-3 transition-colors'

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* 点背景关掉 */}
          <div className="absolute inset-0 bg-black/70" onClick={onClose} />

          <motion.div
            className="relative w-full max-w-xs bg-gray-800 rounded-2xl border border-gray-700 p-4 max-h-[80vh] overflow-y-auto"
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-black text-gray-200">{t('menu.more')}</span>
              <button
                className="text-gray-500 hover:text-gray-300 text-sm px-2 py-1"
                onClick={onClose}
                aria-label={t('menu.close')}
              >
                ✕
              </button>
            </div>

            {/* ——— 孩子也会用的 ——— */}
            <div className="space-y-2">
              <button
                className={`${rowCls} bg-gray-700 hover:bg-gray-600 text-white`}
                onClick={onOpenCollection}
              >
                {t('menu.collection')}
              </button>

              {/* 教学毕业后才收到这里；没毕业时它还留在首页显眼处（守卫 ⑤） */}
              {graduated && (
                <button
                  className={`${rowCls} bg-yellow-800 hover:bg-yellow-700 text-yellow-100`}
                  onClick={onOpenTutorial}
                >
                  {t('menu.tutorial')}
                </button>
              )}

              <button
                className={`${rowCls} bg-gray-700 hover:bg-gray-600 text-gray-200`}
                onClick={toggleLang}
              >
                🌐 {lang === 'zh' ? 'English' : '中文'}
              </button>
            </div>

            {/* ——— 家长专区 ——— */}
            <div className="pt-3 mt-3 border-t border-gray-700">
              <div className="text-xs text-gray-500 mb-2">{t('menu.parentZone')}</div>

              <div className="space-y-2">
                <button
                  className={`${rowCls} bg-emerald-800 hover:bg-emerald-700 text-emerald-100`}
                  onClick={handleOpenTestArena}
                >
                  🧪 {t('menu.testArena')}
                </button>

                <div className="text-xs text-gray-500 pt-1">{t('menu.settings')}</div>
                <button
                  className={`${rowCls} bg-emerald-700 hover:bg-emerald-600 text-white`}
                  onClick={exportSave}
                >
                  {t('settings.export')}
                </button>
                <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
                <button
                  className={`${rowCls} bg-blue-700 hover:bg-blue-600 text-white`}
                  onClick={() => fileRef.current?.click()}
                >
                  {t('settings.import')}
                </button>
                <button
                  className={`${rowCls} bg-red-900 hover:bg-red-800 text-red-300`}
                  onClick={handleReset}
                >
                  {t('settings.reset')}
                </button>
              </div>

              {/* 题库模式（家长门） */}
              <div className="pt-3 mt-3 border-t border-gray-700">
                <div className="text-xs text-gray-400 mb-1.5">{t('settings.quizMode')}</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`py-2 rounded-lg text-xs font-bold transition-colors ${quizMode === 'any' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    onClick={() => handleQuizMode('any')}
                  >
                    {t('settings.quizModeAny')}
                  </button>
                  <button
                    className={`py-2 rounded-lg text-xs font-bold transition-colors ${quizMode === 'card' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    onClick={() => handleQuizMode('card')}
                  >
                    {t('settings.quizModeCard')}
                  </button>
                </div>
                <div className="text-[10px] text-gray-500 mt-1 text-center">
                  {quizMode === 'any' ? t('settings.quizModeAnyHint') : t('settings.quizModeCardHint')}
                </div>
              </div>

              {importMsg && (
                <motion.div
                  className={`text-xs text-center py-1 mt-2 rounded ${importMsg.success ? 'text-green-400' : 'text-red-400'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {importMsg.message}
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
