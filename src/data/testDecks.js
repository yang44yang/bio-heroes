/**
 * 硬编码测试卡组 — Sprint 6 用
 * 主卡组 25 张（生物卡 + 事件卡混编，可重复，同名最多 3 张）
 * SP 卡组最多 5 张
 * 后续由 DeckBuilder 替代
 */
import cards from './cards'
import eventCards from './eventCards'
import spCards from './spCards'

function byId(id) {
  return cards.find(c => c.id === id) || eventCards.find(c => c.id === id)
}

function spById(id) {
  return spCards.find(c => c.id === id)
}

// === 玩家测试卡组：人体系 + 科技系混合（25张）===
export const playerTestDeck = [
  // 人体系生物卡 (12)
  byId('platelet_guardian'),
  byId('platelet_guardian'),
  byId('red_blood_cell'),
  byId('red_blood_cell'),
  byId('stomach_acid'),
  byId('white_blood_cell'),
  byId('white_blood_cell'),
  byId('skin_barrier'),
  byId('neuron_messenger'),
  byId('antibody_missile'),
  byId('lung_engine'),
  byId('heart_engine'),
  // 科技系生物卡 (6)
  byId('bandaid_helper'),
  byId('bandaid_helper'),
  byId('thermometer_alarm'),
  byId('penicillin_pioneer'),
  byId('vaccine_trainer'),
  byId('scalpel_blade'),
  // 事件卡 (7)
  byId('event_immune_response'),
  byId('event_antigen_presentation'),
  byId('event_fever_response'),
  byId('event_stem_cell_diff'),
  byId('event_lab_observation'),
  byId('event_clinical_trial'),
  byId('event_emergency_surgery'),
]

// === 玩家 SP 卡组 (3张) ===
export const playerTestSpDeck = [
  spById('sp_car_t_cell'),
  spById('sp_brain_awakening'),
  spById('sp_nanobot'),
]

// === 敌方测试卡组：自然系 + 病原系混合（25张）===
export const enemyTestDeck = [
  // 自然系生物卡 (10)
  byId('ant_soldier'),
  byId('ant_soldier'),
  byId('mimosa_timid'),
  byId('mimosa_timid'),
  byId('bee_worker'),
  byId('bee_worker'),
  byId('jellyfish_stealth'),
  byId('sunflower_charger'),
  byId('electric_eel_battery'),
  byId('cheetah_sprinter'),
  // 病原系生物卡 (8)
  byId('flu_virus'),
  byId('flu_virus'),
  byId('cavity_bacteria'),
  byId('ecoli_thug'),
  byId('ecoli_thug'),
  byId('tapeworm_lurker'),
  byId('bacteriophage_killer'),
  byId('plasmodium_parasite'),
  // 事件卡 (7)
  byId('event_photosynthesis'),
  byId('event_food_chain_burst'),
  byId('event_ecosystem_recovery'),
  byId('event_infection_outbreak'),
  byId('event_gene_mutation'),
  byId('event_drug_resistance'),
  byId('event_global_pandemic'),
]

// === 敌方 SP 卡组 (3张) ===
export const enemyTestSpDeck = [
  spById('sp_trex'),
  spById('sp_world_tree'),
  spById('sp_super_bacteria'),
]
