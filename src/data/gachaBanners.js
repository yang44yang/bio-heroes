// 抽卡 banner — 跟当前章节/进度关联
// boostFactor 暂时只显示，不实际加权（避免破坏抽卡平衡，留到 Phase D 决定）

export const GACHA_BANNERS = {
  default: {
    id: 'default',
    title: '🌱 基础抽卡',
    featuredCardIds: [],
    description: '从所有生物英雄中随机抽取',
  },
  ch1: {
    id: 'ch1',
    title: '🦴 人体奇迹篇推荐',
    featuredCardIds: ['white_blood_cell', 'macrophage_tank', 'bone_marrow_forge'],
    description: '探索人体免疫系统的关键卡牌',
    boostFactor: 1.5,
  },
  ch2: {
    id: 'ch2',
    title: '🦠 病原侵袭篇推荐',
    featuredCardIds: ['penicillin_pioneer', 'antibody_missile', 'vaccine_trainer'],
    description: '应对病原侵袭的关键卡',
    boostFactor: 1.5,
  },
  ch3: {
    id: 'ch3',
    title: '🌊 生态危机篇推荐',
    featuredCardIds: ['orca_alpha', 'blue_whale_titan', 'whale_shark_wall'],
    description: '海洋顶级生物登场',
    boostFactor: 1.5,
  },
  ch4: {
    id: 'ch4',
    title: '⚡ 终极挑战篇推荐',
    featuredCardIds: ['antibiotic_ultimate', 'crispr_editor', 'mrna_vaccine'],
    description: '现代科技的终极武器',
    boostFactor: 1.5,
  },
}

// 根据玩家最近通关进度选择 banner
// stageStars 形如 { '1-1': 3, '2-2': 2, ... }（来自 campaignData.loadCampaignProgress）
export function selectBanner(stageStars = {}) {
  const stages = Object.keys(stageStars)
  // 从高到低章节扫描，找到玩家进展最深的章节
  for (const ch of [4, 3, 2, 1]) {
    const hasInChapter = stages.some(s => s.startsWith(`${ch}-`) && stageStars[s] > 0)
    if (hasInChapter) return GACHA_BANNERS[`ch${ch}`]
  }
  return GACHA_BANNERS.default
}
