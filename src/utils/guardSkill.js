// 守护机制单一真相源 — 给 useBattle / BattleScreen / Card 共用。
//
// 历史包袱: 原本三处硬编码 nameEn === 'Guard', 导致海龟「龟甲防御」(Shell Defense)
// 和睫毛「物理屏障」(Physical Barrier) 这两张卡 description 写了"守护"但实际不生效。
// 统一收口到这里, 未来加新守护技能只改 GUARD_SKILL_NAMES 一处。
// ⚠️ 凡 description 以"守护"开头的技能都必须登记在此（否则守护机制不生效，对手不被强制攻击）。
// 历史踩坑：海龟 Shell Defense / 睫毛 Physical Barrier / 鲸鲨 Filter-Feed Guard /
// 骨骼巨人 Calcified Armor / 生物膜 Biofilm Shield 都曾"写了守护但漏登记"。test-guard.mjs 有一致性断言兜底。
export const GUARD_SKILL_NAMES = ['Guard', 'Shell Defense', 'Physical Barrier', 'Luring Lantern', 'Filter-Feed Guard', 'Calcified Armor', 'Biofilm Shield']

export function isGuardSkill(skill) {
  return !!skill && GUARD_SKILL_NAMES.includes(skill.nameEn)
}

export function cardHasGuard(card) {
  return !!(card && card.skills && card.skills.some(isGuardSkill))
}

export function fieldHasGuard(field) {
  return Array.isArray(field) && field.some(c => c && c.currentHp > 0 && cardHasGuard(c))
}

// 无视守护 —— 某些攻击技能可越过守护打后排/主人。
// 守护是「攻击结算之前」的门，无法用 combat mods（结算阶段）表达，故在这里按技能名+条件判定，
// 作为守护系统的单一真相源（useBattle 攻击门、BattleScreen 玩家选靶/AI 选靶共用）。
// defender=null 表示直攻主人。
// ⚠️ Antigen Lock-on 的「被标记才无视」条件必须与 skillRegistry 里该技能 execute 的判定保持一致，改一处须改另一处。
export function attackerBypassesGuard(attacker, defender) {
  if (!attacker || !attacker.skills) return false
  return attacker.skills.some((s) => {
    if (s.nameEn === 'Precision Excision') return true // 精准切除：无条件无视守护（含直攻主人）
    if (s.nameEn === 'Antigen Lock-on') return !!defender?.statuses?.some((st) => st.type === 'marked') // 抗原锁定：仅对被标记目标
    return false
  })
}
