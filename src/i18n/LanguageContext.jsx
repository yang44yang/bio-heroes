import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import zh from './zh.json'
import en from './en.json'

const translations = { zh, en }

const LanguageContext = createContext()

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

  const toggleLang = useCallback(() => {
    const newLang = lang === 'zh' ? 'en' : 'zh'
    setLang(newLang)
    localStorage.setItem('bio-heroes-lang', newLang)
  }, [lang])

  const value = useMemo(() => ({
    lang, t, toggleLang, cardName, skillName,
  }), [lang, t, toggleLang, cardName, skillName])

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
