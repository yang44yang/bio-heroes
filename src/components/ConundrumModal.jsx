import { useState } from 'react'
import { motion } from 'framer-motion'

/**
 * ConundrumModal — 关卡前置两难选择
 *
 * Props:
 *   conundrum: { id, scene, sceneEn, question, questionEn, choices: [{ id, label, labelEn, effect, consequence, consequenceEn, scienceNote, scienceNoteEn }] }
 *   lang: 'zh' | 'en'
 *   onComplete(effect): 用户点"开始战斗"后回调，传入选中的 effect 对象
 */
export default function ConundrumModal({ conundrum, lang = 'zh', onComplete }) {
  const [selected, setSelected] = useState(null)

  const t = (zh, en) => (lang === 'en' ? (en || zh) : zh)
  const showConsequence = !!selected

  const handleSelect = (choice) => {
    setSelected(choice)
    // 记录选择到 localStorage（未来数据分析用）
    try {
      // 前缀统一为 bio-heroes-：否则它逃出 resetSave 的前缀清扫，且任何 startsWith('bio-heroes-')
      // 式的批量存档方案都会静默漏掉它（这是全项目唯一一个没前缀的 key）。
      // 不进 SAVE_KEYS：当前是 write-only 的死数据（全项目无人读回），且 key 名无上界。
      const key = `bio-heroes-conundrum-${conundrum.id || 'unknown'}-choice`
      localStorage.setItem(key, choice.id)
    } catch (_) { /* ignore */ }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-gray-900 border border-cyan-500/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        {!showConsequence ? (
            <motion.div
              key="choices"
              className="p-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🤔</div>
                <h2 className="text-xl font-bold text-white mb-3">
                  {t(conundrum.question, conundrum.questionEn)}
                </h2>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {t(conundrum.scene, conundrum.sceneEn)}
                </p>
              </div>

              <div className="space-y-3">
                {conundrum.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleSelect(choice)}
                    className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-cyan-500 rounded-xl p-4 transition"
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold">
                        {choice.id}
                      </div>
                      <div className="text-white">{t(choice.label, choice.labelEn)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="consequence"
              className="p-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="mb-4">
                <div className="text-xs text-gray-400 mb-1">{lang === 'en' ? 'Your choice' : '你的选择'}</div>
                <div className="text-lg text-white font-bold">
                  {selected.id}. {t(selected.label, selected.labelEn)}
                </div>
              </div>

              <div className="bg-orange-900/30 border-l-4 border-orange-500 rounded-lg p-4 mb-4">
                <div className="text-xs text-orange-300 font-bold mb-1">📍 {lang === 'en' ? 'Consequence' : '后果'}</div>
                <div className="text-white text-sm leading-relaxed">
                  {t(selected.consequence, selected.consequenceEn)}
                </div>
              </div>

              <div className="bg-purple-900/30 border-l-4 border-purple-400 rounded-lg p-4 mb-6">
                <div className="text-xs text-purple-300 font-bold mb-1">📚 {lang === 'en' ? 'Did you know?' : '你知道吗？'}</div>
                <div className="text-white text-sm leading-relaxed">
                  {t(selected.scienceNote, selected.scienceNoteEn)}
                </div>
              </div>

              <button
                onClick={() => onComplete(selected.effect || {})}
                className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 rounded-xl transition shadow-lg"
              >
                {lang === 'en' ? 'Start Battle →' : '开始战斗 →'}
              </button>
            </motion.div>
          )}
      </motion.div>
    </motion.div>
  )
}
