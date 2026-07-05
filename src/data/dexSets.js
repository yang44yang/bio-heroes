import cards from './cards.js'
import eventCards from './eventCards.js'
import spCards from './spCards.js'

// 图鉴包（dex set）元数据 — 驱动 Collection 的分包收集进度展示（决策4：dex 收集追踪器）。
//
// endowed = 预存进度基线（Endowed Progress Effect，视觉用）：在进度条最左画一段浅色"已开启"
//   起点，营造"图鉴已经为你点亮了一点"的感觉，让进度条不从 0 画起 —— 但 **不白送卡**
//   （拥有数 have/total 照实显示，浅色段只是装饰起点，不是已拥有的卡）。
// rewardAchId = 该包关联的主题成就（复用 src/data/achievements.js 的科学故事包当"集齐钩子"）。
// season = 资料片季号（路线图 S1 海洋 / S2 微观…），null = 初始基础包。
export const DEX_SETS = [
  { id: 'BASE',  name: '基础包',   nameEn: 'Base Set',          icon: '📦', color: '#FACC15', endowed: 0, season: null, rewardAchId: null },
  { id: 'OCEAN', name: '海洋深渊', nameEn: 'Ocean Abyss',       icon: '🌊', color: '#38BDF8', endowed: 2, season: 'S1', rewardAchId: 'apex_predator' },
  { id: 'MICRO', name: '微观战场', nameEn: 'Micro Battlefield', icon: '🔬', color: '#34D399', endowed: 2, season: 'S2', rewardAchId: 'microbe_explorer' },
]

// 卡的归包（无 set 字段的旧卡/事件卡/SP 卡归入基础包）
export const setOf = (card) => card.set || 'BASE'

// 图鉴收录的全部卡（生物 + 事件 + SP）—— 收集进度的**单一权威卡池**。
// Collection 图鉴总进度 与 Gacha 图鉴进度条 都必须用它，否则两屏各算各的会漂移：
// 历史 bug —— Gacha 用「生物+可抽SP=138」当分母、Collection 用「全部=157」，同叫"图鉴进度"却打架。
export const ALL_DEX_CARDS = [...cards, ...eventCards, ...spCards]
export const TOTAL_DEX_CARDS = ALL_DEX_CARDS.length
