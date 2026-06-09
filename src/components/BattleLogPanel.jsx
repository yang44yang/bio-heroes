import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

function classifyLog(msg) {
  if (msg.includes('--- 第') || msg.includes('回合 ---') || msg.match(/第\s*\d+\s*回合/)) return 'turn'
  if (msg.includes('直攻主人') || (msg.includes('造成') && msg.includes('伤害'))) return 'attack'
  if (msg.includes('克制')) return 'clash'
  if (msg.includes('💉') || msg.includes('🛡️') || msg.includes('⚡') || msg.includes('🧬') || msg.includes('✨')) return 'skill'
  if (msg.includes('中毒') || msg.includes('沉睡') || msg.includes('护盾') || msg.includes('混乱')) return 'status'
  if (msg.includes('被击败') || msg.includes('倒下')) return 'death'
  if (msg.includes('出牌') || msg.includes('召唤')) return 'play'
  if (msg.includes('Power Bank') || msg.includes('PB')) return 'powerbank'
  return 'info'
}

const CATEGORY_STYLES = {
  turn:      { bg: 'bg-gray-800/70 border-l-4 border-amber-500', icon: '🔄', text: 'text-amber-300 font-bold text-base' },
  attack:    { bg: 'bg-red-900/30',                               icon: '⚔️', text: 'text-white text-sm' },
  clash:     { bg: 'bg-yellow-900/30 border-l-2 border-yellow-500', icon: '✨', text: 'text-yellow-300 text-sm font-bold' },
  skill:     { bg: 'bg-purple-900/30 border-l-2 border-purple-400', icon: '🎯', text: 'text-purple-200 text-sm' },
  status:    { bg: 'bg-green-900/20',                             icon: '🧪', text: 'text-green-200 text-sm' },
  death:     { bg: 'bg-red-950/50 border-l-2 border-red-500',    icon: '💀', text: 'text-red-300 text-sm' },
  play:      { bg: 'bg-blue-900/20',                              icon: '🎴', text: 'text-blue-200 text-sm' },
  powerbank: { bg: 'bg-cyan-900/20 border-l-2 border-cyan-500',   icon: '⚡', text: 'text-cyan-200 text-sm' },
  info:      { bg: 'bg-gray-800/20',                              icon: '·',  text: 'text-gray-300 text-sm' },
}

export default function BattleLogPanel({ logs, open, onClose }) {
  const { t } = useLanguage()
  const scrollRef = useRef(null)

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [open, logs.length])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-gray-900 border border-cyan-500/40 rounded-2xl w-[90%] max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
              <div className="text-lg font-bold text-white">{t('battleLog.title')}</div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-800"
              >×</button>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5"
            >
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">{t('battleLog.empty')}</div>
              ) : (
                logs.map((msg, i) => {
                  const cat = classifyLog(msg)
                  const style = CATEGORY_STYLES[cat]
                  return (
                    <div
                      key={i}
                      className={`${style.bg} rounded px-3 py-2 flex gap-2 items-start`}
                    >
                      <span className="text-base shrink-0 leading-relaxed">{style.icon}</span>
                      <span className={`${style.text} leading-relaxed`}>{msg}</span>
                    </div>
                  )
                })
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-700 text-xs text-gray-400 text-center">
              {t('battleLog.footer')}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
