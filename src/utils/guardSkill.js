// 守护机制单一真相源 — 给 useBattle / BattleScreen / Card 共用。
//
// 历史包袱: 原本三处硬编码 nameEn === 'Guard', 导致海龟「龟甲防御」(Shell Defense)
// 和睫毛「物理屏障」(Physical Barrier) 这两张卡 description 写了"守护"但实际不生效。
// 统一收口到这里, 未来加新守护技能只改 GUARD_SKILL_NAMES 一处。
export const GUARD_SKILL_NAMES = ['Guard', 'Shell Defense', 'Physical Barrier']

export function isGuardSkill(skill) {
  return !!skill && GUARD_SKILL_NAMES.includes(skill.nameEn)
}

export function cardHasGuard(card) {
  return !!(card && card.skills && card.skills.some(isGuardSkill))
}

export function fieldHasGuard(field) {
  return Array.isArray(field) && field.some(c => c && c.currentHp > 0 && cardHasGuard(c))
}
