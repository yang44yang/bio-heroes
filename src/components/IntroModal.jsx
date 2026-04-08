import React from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '../i18n/LanguageContext'

export default function IntroModal({ onStartTutorial, onSkip }) {
  const { t } = useLanguage()

  const FEATURES = [
    { icon: '⚔️', title: t('intro.feature.battle'), color: '#f1c40f', bg: '#1a3020', desc: t('intro.feature.battleDesc') },
    { icon: '🧠', title: t('intro.feature.quiz'), color: '#3498db', bg: '#1a2040', desc: t('intro.feature.quizDesc') },
    { icon: '🃏', title: t('intro.feature.collect'), color: '#9b59b6', bg: '#2a1a30', desc: t('intro.feature.collectDesc') },
    { icon: '🏆', title: t('intro.feature.campaign'), color: '#e67e22', bg: '#2a2010', desc: t('intro.feature.campaignDesc') },
  ]

  const FACTIONS = [
    { emoji: '🌱', name: t('intro.faction.nature'), color: '#27ae60', bg: '#1a3020', border: '#27ae60' },
    { emoji: '🧬', name: t('intro.faction.body'), color: '#9b59b6', bg: '#1a1a30', border: '#9b59b6' },
    { emoji: '🦠', name: t('intro.faction.pathogen'), color: '#e74c3c', bg: '#2a1515', border: '#e74c3c' },
    { emoji: '⚗️', name: t('intro.faction.tech'), color: '#3498db', bg: '#0a1a2a', border: '#3498db' },
  ]

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{
          width: 'min(90vw, 380px)', maxHeight: '85vh', overflowY: 'auto',
          background: '#0f1729', borderRadius: 16, padding: 24,
          border: '2px solid #9b59b6',
        }}
      >
        {/* 标题区 */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🧬⚔️🦠</div>
          <div style={{ color: '#f1c40f', fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Bio Heroes</div>
          <div style={{ color: '#8899bb', fontSize: 15 }}>{t('intro.tagline')}</div>
        </div>

        {/* 故事引入 */}
        <div style={{ color: '#bbb', fontSize: 14, lineHeight: 1.9, marginBottom: 20, textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px' }}>{t('intro.story1')}<br />{t('intro.story1b')}</p>
          <p style={{ margin: 0 }}>{t('intro.story2')}<br />{t('intro.story2b')}</p>
        </div>

        {/* 四大玩法 */}
        <div style={{ marginBottom: 20 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: f.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>{f.icon}</div>
              <div>
                <p style={{ color: f.color, fontSize: 14, fontWeight: 500, margin: '0 0 3px' }}>{f.title}</p>
                <p style={{ color: '#999', fontSize: 13, margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 四阵营 */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
          {FACTIONS.map(f => (
            <div key={f.name} style={{
              background: f.bg, border: `1px solid ${f.border}`,
              borderRadius: 8, padding: '6px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 16 }}>{f.emoji}</div>
              <div style={{ color: f.color, fontSize: 11 }}>{f.name}</div>
            </div>
          ))}
        </div>

        {/* 按钮区 */}
        <button
          onClick={onStartTutorial}
          style={{
            width: '100%', padding: '14px 0', background: '#f1c40f', color: '#1a1e2e',
            border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 500,
            cursor: 'pointer', marginBottom: 8,
          }}
        >
          {t('intro.startTutorial')}
        </button>
        <button
          onClick={onSkip}
          style={{
            width: '100%', padding: '10px 0', background: 'transparent', color: '#666',
            border: '1px solid #333', borderRadius: 10, fontSize: 13, cursor: 'pointer',
          }}
        >
          {t('intro.skipTutorial')}
        </button>
      </motion.div>
    </div>
  )
}
