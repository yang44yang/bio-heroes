import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import zh from './zh.json'
import en from './en.json'

const translations = { zh, en }

// 单例化 Context：dev 模式下懒加载代码块可能拿到本模块的「第二份实例」
// （HMR 失效 / dep 重优化导致 ?t= 重取，常见于 Claude 预览沙箱），
// 使 Provider 与 useLanguage 引用到不同 Context 对象 → "must be used within LanguageProvider" 崩溃。
// 用 globalThis 缓存，确保无论模块被实例化几次，全局只有一个 Context 对象。生产单实例无影响。
const LanguageContext =
  globalThis.__BIO_HEROES_LANG_CTX__ || (globalThis.__BIO_HEROES_LANG_CTX__ = createContext())

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() =>
    localStorage.getItem('bio-heroes-lang') || 'zh'
  )

  const t = useCallback((key, params) => {
    const dict = translations[lang] || translations.zh
    let text = dict[key] || translations.zh[key] || key
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
      })
    }
    return text
  }, [lang])

  // 根据语言返回卡牌名：英文模式用 nameEn，没有则回退中文
  const cardName = useCallback((card) => {
    if (!card) return ''
    if (lang === 'en' && card.nameEn) return card.nameEn
    return card.name
  }, [lang])

  // 根据语言返回技能名
  const skillName = useCallback((skill) => {
    if (!skill) return ''
    if (lang === 'en' && skill.nameEn) return skill.nameEn
    return skill.name
  }, [lang])

  // 通用本地化名：英文模式优先 nameEn，回退 name（用于阵营/子类型/环境事件等）
  const localName = useCallback((obj) => {
    if (!obj) return ''
    if (lang === 'en' && obj.nameEn) return obj.nameEn
    return obj.name || ''
  }, [lang])

  const toggleLang = useCallback(() => {
    const newLang = lang === 'zh' ? 'en' : 'zh'
    setLang(newLang)
    localStorage.setItem('bio-heroes-lang', newLang)
  }, [lang])

  const value = useMemo(() => ({
    lang, t, toggleLang, cardName, skillName, localName,
  }), [lang, t, toggleLang, cardName, skillName, localName])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
