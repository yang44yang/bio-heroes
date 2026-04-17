/**
 * 技能效果注册表
 * Bio Heroes 生物英雄传 — Sprint 3 → Sprint 23 (Skill Template Engine Phase 1)
 *
 * key = 技能的 nameEn（唯一标识）
 * value = { timing, execute(context) }
 *
 * execute 返回事件对象（或数组），由 useBattle 的 applySkillEvents 执行实际状态变更
 * 事件类型：HEAL, BUFF, APPLY_SHIELD, AOE_DAMAGE, OVERFLOW_DAMAGE, PIERCING_DAMAGE,
 *           RUSH_BOOST, APPLY_POISON, APPLY_SLEEP, SUMMON_CARD
 */

import * as T from './skillTemplates'

export const skillRegistry = {

  // ===========================================
  // 被动技能（不走触发框架）
  // ===========================================

  'Guard': { timing: 'passive' },
  'Swift Attack': { timing: 'passive' },
  // Guard 别名
  'Physical Barrier': { timing: 'passive' },  // 睫毛·物理屏障
  'Shell Defense': { timing: 'passive' },      // 海龟·龟壳防御
  'Filter-Feed Guard': { timing: 'passive' },  // 鲸鲨·滤食守护（passive guard + self-heal → Phase 2 passiveAura）

  // ===========================================
  // 通用技能（完整实现保留）
  // ===========================================

  'Overpower': {
    timing: 'onKill',
    execute: (ctx) => {
      if (ctx.overflow > 0) {
        return {
          type: 'OVERFLOW_DAMAGE',
          source: ctx.attacker?.name || ctx.card?.name,
          target: 'enemyLeader',
          damage: ctx.overflow,
          message: `💥 ${ctx.attacker?.name || ctx.card?.name} 压制！${ctx.overflow} 溢出伤害穿透到主人！`,
        }
      }
      return null
    },
  },

  'Piercing Strike': {
    timing: 'onKill',
    execute: (ctx) => {
      const isGuard = ctx.defender?.skills?.some(
        s => s.nameEn === 'Guard' || s.name === '守护'
      )
      if (isGuard && ctx.overflow > 0) {
        return {
          type: 'PIERCING_DAMAGE',
          source: ctx.attacker?.name || ctx.card?.name,
          target: 'enemyLeader',
          damage: ctx.overflow,
          message: `🔱 ${ctx.attacker?.name || ctx.card?.name} 穿透！${ctx.overflow} 伤害刺穿守护到主人！`,
        }
      }
      return null
    },
  },

  'Rush': {
    timing: 'onAttack',
    execute: (ctx) => {
      if (ctx.target === 'leader') {
        ctx.damageMultiplier = (ctx.damageMultiplier || 1) * 2
        return {
          type: 'RUSH_BOOST',
          source: ctx.attacker?.name || ctx.card?.name,
          message: `🏃 ${ctx.attacker?.name || ctx.card?.name} 突进！伤害翻倍！`,
        }
      }
      return null
    },
  },

  'Natural Recovery': {
    timing: 'onTurnEnd',
    execute: (ctx) => {
      const card = ctx.card
      if (!card || card.currentHp <= 0) return null
      const maxHp = card.maxHp || card.hp
      const healAmount = Math.floor(maxHp * 0.10)
      const actualHeal = Math.min(healAmount, maxHp - card.currentHp)
      if (actualHeal > 0) {
        return {
          type: 'HEAL',
          targetUid: card.uid,
          source: card.name,
          target: card.name,
          amount: actualHeal,
          message: `💚 ${card.name} 自愈回复 ${actualHeal} HP`,
        }
      }
      return null
    },
  },

  // ===========================================
  // 已实现的专属技能（保留原始实现）
  // ===========================================

  'Phagocytosis': {
    timing: 'onKill',
    execute: (ctx) => {
      if (ctx.defender?.faction === 'pathogen') {
        return {
          type: 'BUFF',
          targetUid: ctx.attacker?.uid || ctx.card?.uid,
          stat: 'atk',
          amount: 500,
          source: ctx.attacker?.name || ctx.card?.name,
          message: `🦠 ${ctx.attacker?.name || ctx.card?.name} 吞噬成功！ATK 永久 +500！`,
        }
      }
      return null
    },
  },

  'Oxygen Delivery': {
    timing: 'onPlay',
    execute: (ctx) => T.onPlayHeal(ctx, { effect: 'heal', target: 'one_lowest_hp', amount: 1000 }),
  },

  'Clotting Shield': {
    timing: 'onPlay',
    execute: (ctx) => T.onPlayHeal(ctx, { effect: 'shield', target: 'one_highest_atk', amount: 1500 }),
  },

  'Heartbeat Pulse': {
    timing: 'onTurnEnd',
    execute: (ctx) => {
      const allies = (ctx.friendlyField || [])
        .filter(c => c && c.currentHp > 0)
      const results = []
      for (const ally of allies) {
        const heal = Math.min(1000, ally.maxHp - ally.currentHp)
        if (heal > 0) {
          results.push({
            type: 'HEAL',
            targetUid: ally.uid,
            source: ctx.card.name,
            target: ally.name,
            amount: heal,
            message: `💓 ${ctx.card.name} 心跳脉冲，${ally.name} 回复 ${heal} HP`,
          })
        }
      }
      return results.length > 0 ? results : null
    },
  },

  'Discharge Strike': {
    timing: 'onAttack',
    execute: (ctx) => T.splash(ctx, { targets: 1, amount: 1000 }),
  },

  'Tentacle Venom': {
    timing: 'onAttack',
    execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'poison', amount: 500, duration: 2 }),
  },

  'General Anesthesia': {
    timing: 'onPlay',
    execute: (ctx) => {
      const enemies = (ctx.enemyField || [])
        .filter(c => c && c.currentHp > 0)
      if (enemies.length === 0) return null
      const target = [...enemies].sort((a, b) => b.atk - a.atk)[0]
      return {
        type: 'APPLY_SLEEP',
        targetUid: target.uid,
        source: ctx.card.name,
        targetName: target.name,
        turnsLeft: 2,
        message: `😴 ${ctx.card.name} 释放全身麻醉！${target.name} 陷入沉睡！（持续2回合）`,
      }
    },
  },

  'Injection Hijack': {
    timing: 'onKill',
    execute: (ctx) => {
      const friendlyField = ctx.friendlyField || []
      const emptySlots = []
      for (let i = 0; i < 3; i++) {
        if (!friendlyField[i] || friendlyField[i].currentHp <= 0) emptySlots.push(i)
      }
      if (emptySlots.length === 0) return null
      const slot = emptySlots[0]
      const copy = {
        id: 'phage_copy_' + Date.now(),
        uid: 'phage_copy_' + Date.now() + '_' + Math.random(),
        name: '噬菌体副本', nameEn: 'Phage Copy',
        atk: 1000, hp: 1000, currentHp: 1000, maxHp: 1000,
        cost: 0, faction: 'pathogen', rarity: 'R',
        skills: [], statuses: [], summonSick: true,
      }
      return {
        type: 'SUMMON_CARD', side: 'friendly', slot, card: copy,
        source: ctx.card?.name || ctx.attacker?.name,
        message: `🧬 ${ctx.card?.name || ctx.attacker?.name} 注入劫持成功！召唤噬菌体副本！`,
      }
    },
  },

  'Marrow Hematopoiesis': {
    timing: 'onTurnEnd',
    execute: (ctx) => {
      const friendlyField = ctx.friendlyField || []
      const emptySlots = []
      for (let i = 0; i < 3; i++) {
        if (!friendlyField[i] || friendlyField[i].currentHp <= 0) emptySlots.push(i)
      }
      if (emptySlots.length === 0) return null
      const candidates = [
        { id: 'red_blood_cell', name: '红细胞·氧气快递员', atk: 1000, hp: 2500, faction: 'body', cost: 1, rarity: 'R',
          skills: [{ name: '氧气输送', nameEn: 'Oxygen Delivery', type: 'unique' }] },
        { id: 'platelet_guardian', name: '血小板·伤口小卫士', atk: 500, hp: 3000, faction: 'body', cost: 1, rarity: 'R',
          skills: [{ name: '凝血屏障', nameEn: 'Clotting Shield', type: 'unique' }] },
      ]
      const template = candidates[Math.floor(Math.random() * candidates.length)]
      const slot = emptySlots[0]
      const card = {
        ...template,
        uid: template.id + '_summon_' + Date.now() + '_' + Math.random(),
        currentHp: template.hp, maxHp: template.hp, statuses: [], summonSick: true,
      }
      return {
        type: 'SUMMON_CARD', side: 'friendly', slot, card,
        source: ctx.card.name,
        message: `🦴 ${ctx.card.name} 骨髓造血！召唤 ${card.name}！`,
      }
    },
  },

  // ===========================================
  // Phase 1 — 模板 1: onPlayDamage（7 技能）
  // ===========================================

  'Sonar Shockwave':    { timing: 'onPlay', execute: (ctx) => T.onPlayDamage(ctx, { target: 'all_enemy', amount: 2000 }) },
  'Ancient Plague':     { timing: 'onPlay', execute: (ctx) => T.onPlayDamage(ctx, { target: 'all_enemy', amount: 3000 }) },
  'Wave Wash':          { timing: 'onPlay', execute: (ctx) => T.onPlayDamage(ctx, { target: 'one_lowest_hp', amount: 3000 }) },
  'Alcohol Disinfect':  { timing: 'onPlay', execute: (ctx) => T.onPlayDamage(ctx, { target: 'one_faction', faction_filter: 'pathogen', amount: 1000 }) },
  'Foul Stench':        { timing: 'onPlay', execute: (ctx) => T.onPlayDamage(ctx, { target: 'all_enemy', amount: 0, bonus: { type: 'debuff_atk', amount: 500, duration: 1 } }) },
  'Violent Vomit':      { timing: 'onPlay', execute: (ctx) => T.onPlayDamage(ctx, { target: 'one_random', amount: 0, bonus: { type: 'debuff_atk', amount: 1000, duration: 1 } }) },
  'Global Pandemic':    { timing: 'onPlay', execute: (ctx) => T.onPlayDamage(ctx, { target: 'leader', amount: 5000, bonus: { type: 'debuff_atk', amount: 2000, duration: 3, scope: 'all_enemy' } }) },

  // ===========================================
  // Phase 1 — 模板 2: onPlayHeal（3 新技能）
  // ===========================================

  'Emergency Bandage':  { timing: 'onPlay', execute: (ctx) => T.onPlayHeal(ctx, { effect: 'heal', target: 'one_lowest_hp', amount: 1500, bonus: { type: 'guard', duration: 1 } }) },
  'Hemostasis Wrap':    { timing: 'onPlay', execute: (ctx) => T.onPlayHeal(ctx, { effect: 'heal', target: 'one_lowest_hp', amount: 1500 }) },
  'Diagnostic Analysis': { timing: 'onPlay', execute: (ctx) => T.onPlayHeal(ctx, { effect: 'heal', target: 'one_faction', faction_filter: 'body', amount: 1000 }) },

  // ===========================================
  // Phase 1 — 模板 6: conditionalAtk（9 技能）
  // ===========================================

  'Acid Corrosion':               { timing: 'onAttack', execute: (ctx) => T.conditionalAtk(ctx, { condition: 'vs_faction', faction_filter: 'pathogen', amount: 1.5, is_multiplier: true }) },
  'Sterile Procedure':            { timing: 'onAttack', execute: (ctx) => T.conditionalAtk(ctx, { condition: 'vs_faction', faction_filter: 'pathogen', amount: 1.5, is_multiplier: true }) },
  'Broad Spectrum Annihilation':  { timing: 'onAttack', execute: (ctx) => T.conditionalAtk(ctx, { condition: 'vs_faction', faction_filter: 'pathogen', amount: 2, is_multiplier: true }) },
  'Lysozyme Attack':              { timing: 'onAttack', execute: (ctx) => T.conditionalAtk(ctx, { condition: 'vs_faction', faction_filter: 'pathogen', amount: 500 }) },
  'Food Poisoning':               { timing: 'onAttack', execute: (ctx) => T.conditionalAtk(ctx, { condition: 'vs_faction', faction_filter: 'body', amount: 1000 }) },
  'Electroreception Hunt':        { timing: 'onAttack', execute: (ctx) => T.conditionalAtk(ctx, { condition: 'vs_low_hp', hp_threshold: 0.5, amount: 2000 }) },
  'Coordinated Hunt':             { timing: 'onAttack', execute: (ctx) => T.conditionalAtk(ctx, { condition: 'per_ally', ally_faction: 'nature', amount: 1500 }) },
  'Nucleic Acid Amplification':   { timing: 'onAttack', execute: (ctx) => T.conditionalAtk(ctx, { condition: 'vs_faction', faction_filter: 'pathogen', amount: 2000 }) },
  'Nano Precision Strike':        { timing: 'onAttack', execute: (ctx) => T.conditionalAtk(ctx, { condition: 'vs_faction', faction_filter: 'pathogen', amount: 1.5, is_multiplier: true }) },

  // ===========================================
  // Phase 1 — 模板 7: onAttackDebuff（10 新技能）
  // ===========================================

  'Venom Sting':        { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'poison', amount: 500, duration: 1, self_damage: 500 }) },
  'Persistent Itch':    { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'poison', amount: 500, duration: 2 }) },
  'Hemorrhagic Fever':  { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'poison', amount: 1500, duration: 2 }) },
  'Silk Trap':          { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'debuff_atk', amount: 500, duration: 1 }) },
  'Breakbone Fever':    { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'debuff_both', amount: 1000, duration: 2 }) },
  'Neurotoxin':         { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'paralyze', duration: 1 }) },
  'Misfolding':         { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'permanent_debuff', stat: 'atk', amount: 500 }) },
  'Acid Erosion':       { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'permanent_debuff', stat: 'hp', amount: 500 }) },
  'Blood Drain':        { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'lifesteal', amount: 0.3 }) },
  'Dehydration Strike': { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'leader_damage', amount: 1000 }) },

  // ===========================================
  // Phase 1 — 模板 8: splash（2 新技能）
  // ===========================================

  'Cavitation Punch':   { timing: 'onAttack', execute: (ctx) => T.splash(ctx, { targets: 1, amount: 2000 }) },
  'Super Spread':       { timing: 'onKill',   execute: (ctx) => T.splash(ctx, { targets: 2, amount: 1500 }) },

  // ===========================================
  // Phase 1 — 模板 9: onKillEffect（4 新技能）
  // ===========================================

  'Phagocytosis Power': { timing: 'onKill', execute: (ctx) => T.onKillEffect(ctx, { effect: 'buff_self', stat: 'atk', amount: 1000 }) },
  'Cell Recycling':     { timing: 'onKill', execute: (ctx) => T.onKillEffect(ctx, { effect: 'heal_self', amount: 2000 }) },
  'Parasitic Invasion': { timing: 'onKill', execute: (ctx) => T.onKillEffect(ctx, { effect: 'heal_self', amount: 'full', vs_faction: 'body' }) },
  'Mind Control':       { timing: 'onKill', execute: (ctx) => T.onKillEffect(ctx, { effect: 'convert_killed', chance: 0.25, convert_atk: 1000, convert_hp: 1000 }) },

  // ===========================================
  // Phase 1 — 模板 10: onDeathEffect（7 技能）
  // ===========================================

  'Core of Life':       { timing: 'onDeath', execute: (ctx) => T.onDeathEffect(ctx, { effect: 'debuff_allies', faction_filter: 'body', debuff_amount: 0.5 }) },
  'Spore Spread':       { timing: 'onDeath', execute: (ctx) => T.onDeathEffect(ctx, { effect: 'heal_leader', amount: 500 }) },
  'Droplet Spread':     { timing: 'onDeath', execute: (ctx) => T.onDeathEffect(ctx, { effect: 'damage_random_enemy', amount: 500 }) },
  'Binary Fission':     { timing: 'onDeath', execute: (ctx) => T.onDeathEffect(ctx, { effect: 'split', split_count: 2, split_atk: 2000, split_hp: 3000 }) },
  'Differentiation':    { timing: 'onDeath', execute: (ctx) => T.onDeathEffect(ctx, { effect: 'revive_as', revive_source: 'discard', faction_filter: 'body', rarity_filter: 'R', revive_hp_percent: 0.5 }) },
  'Ink Escape':         { timing: 'onDeath', execute: (ctx) => T.onDeathEffect(ctx, { effect: 'chance_revive', chance: 0.5, revive_hp: 2000 }) },
  'Retroviral Latency': { timing: 'onDeath', execute: (ctx) => T.onDeathEffect(ctx, { effect: 'chance_revive', chance: 0.5, revive_atk: 2000, revive_hp: 1500 }) },

  // ===========================================
  // Phase 1 — 模板 11: onHitCounter（4 技能）
  // ===========================================

  'Leaf Fold':          { timing: 'onHit', execute: (ctx) => T.onHitCounter(ctx, { effect: 'reduce_damage', amount: 0.5, is_ratio: true }) },
  'Snap Trap':          { timing: 'onHit', execute: (ctx) => T.onHitCounter(ctx, { effect: 'counter_damage', amount: 0.5, is_ratio: true }) },
  'Thorn Counter':      { timing: 'onHit', execute: (ctx) => T.onHitCounter(ctx, { effect: 'counter_damage', amount: 500 }) },
  'Pseudopod Morph':    { timing: 'onHit', execute: (ctx) => T.onHitCounter(ctx, { effect: 'dodge', chance: 0.3 }) },

  // ===========================================
  // Phase 1 — passiveAura 简单部分（回合结束/开始回血/能量/召唤）
  // ===========================================

  'Deep Breath':            { timing: 'onTurnEnd', execute: (ctx) => T.passiveHeal(ctx, { scope: 'faction', faction_filter: 'body', amount: 500 }) },
  'Nutrient Absorption':    { timing: 'onTurnEnd', execute: (ctx) => T.passiveHeal(ctx, { scope: 'leader', amount: 500 }) },
  'Microbiome Balance':     { timing: 'onTurnEnd', execute: (ctx) => T.passiveHeal(ctx, { scope: 'faction', faction_filter: 'body', amount: 500 }) },
  'Photosynthesis Supply':  { timing: 'onTurnStart', execute: (ctx) => T.passiveEnergy(ctx, { amount: 1 }) },
  'ATP Burst':              { timing: 'onTurnStart', execute: (ctx) => T.passiveEnergy(ctx, { amount: 1 }) },
  'Colony Summon':          { timing: 'onTurnStart', execute: (ctx) => T.passiveSummon(ctx, { id: 'ant_soldier', name: '蚂蚁·微型战士', nameEn: 'Ant Soldier', atk: 1500, hp: 1000, faction: 'nature' }) },
  'Rapid Fission':          { timing: 'onTurnEnd', execute: (ctx) => T.passiveSummon(ctx, { id: 'ecoli_clone', name: '大肠杆菌副本', nameEn: 'E. Coli Clone', atk: 1000, hp: 500, faction: 'pathogen', chance: 0.5 }) },
  'Rapid Mutation':         { timing: 'onTurnStart', execute: (ctx) => T.passiveRandomBuff(ctx, { amount: 500 }) },

  // ===========================================
  // Phase 2+ — 占位（未来实现）
  // ===========================================

  // ===========================================
  // Phase 2 — 模板 3: onPlayReveal（6 技能）
  // ===========================================

  'Temperature Monitor':  { timing: 'onPlay', execute: (ctx) => T.onPlayReveal(ctx, { count: 1, filter: 'highest_cost' }) },
  'Bioluminescence':      { timing: 'onPlay', execute: (ctx) => T.onPlayReveal(ctx, { count: 1, filter: 'random' }) },
  'Penetrating Scan':     { timing: 'onPlay', execute: (ctx) => T.onPlayReveal(ctx, { count: 'all', bonus: { type: 'atk_boost', amount: 0.2, duration: 1 } }) },
  'Micro Insight':        { timing: 'onPlay', execute: (ctx) => T.onPlayReveal(ctx, { count: 'all' }) },
  'Rapid Test':           { timing: 'onPlay', execute: (ctx) => T.onPlayReveal(ctx, { count: 'all' }) },
  '3D Scan':              { timing: 'onPlay', execute: (ctx) => T.onPlayReveal(ctx, { count: 'all', deck_top: 3 }) },

  // ===========================================
  // Phase 2 — 模板 4: onPlayMark（2 技能）
  // ===========================================

  'Target Lock':          { timing: 'onPlay', execute: (ctx) => T.onPlayMark(ctx, { bonus_damage: 0.5, bonus_from: 'all' }) },
  'Antigen Presentation': { timing: 'onPlay', execute: (ctx) => T.onPlayMark(ctx, { bonus_damage: 1000, bonus_from: 'faction', faction_filter: 'body' }) },

  // ===========================================
  // Phase 2 — 模板 12: cleanse（5 技能）
  // ===========================================

  'Heat Regulation':      { timing: 'onPlay',      execute: (ctx) => T.cleanse(ctx, { scope: 'one_ally', status_filter: 'one_random' }) },
  'Toxin Filtration':     { timing: 'onPlay',      execute: (ctx) => T.cleanse(ctx, { scope: 'all_allies', status_filter: 'poison' }) },
  'Anti-inflammatory':    { timing: 'onPlay',      execute: (ctx) => T.cleanse(ctx, { scope: 'one_ally', status_filter: 'all_negative', bonus_heal: 1000 }) },
  'Detoxification':       { timing: 'onTurnStart', execute: (ctx) => T.cleanse(ctx, { scope: 'all_allies', status_filter: 'one_random' }) },
  'Hemodialysis':         { timing: 'onTurnStart', execute: (ctx) => T.cleanse(ctx, { scope: 'all_and_leader', status_filter: 'all_negative', bonus_heal: 1000, bonus_heal_target: 'leader' }) },

  // ===========================================
  // Phase 2 — 模板 13: reviveFromDiscard（3 技能）
  // ===========================================

  'Elder Memory':         { timing: 'onPlay', execute: (ctx) => T.reviveFromDiscard(ctx, { mode: 'to_hand', faction_filter: 'nature' }) },
  'Gene Repair':          { timing: 'onPlay', execute: (ctx) => T.reviveFromDiscard(ctx, { mode: 'to_field', faction_filter: 'body', hp_percent: 0.5 }) },
  'Electric Restart':     { timing: 'onPlay', execute: (ctx) => T.reviveFromDiscard(ctx, { mode: 'to_field', faction_filter: 'body', cost_max: 3, hp_percent: 0.3 }) },

  // ===========================================
  // Phase 2 — 模板 14: onPlaySummon（1 技能）
  // ===========================================

  'Pheromone Rally':      { timing: 'onPlay', execute: (ctx) => T.onPlaySummon(ctx, { condition: 'hand_has_same', card_filter: 'ant_', from: 'hand' }) },

  // Passive aura (complex — Phase 3)
  'Antibacterial Aura':   { timing: 'passive',  execute: null },
  'Droplet Filter':       { timing: 'passive',  execute: null },
  'Immune Collapse':      { timing: 'passive',  execute: null },
  'Nutrient Drain':       { timing: 'onTurnEnd', execute: null },
  'Nutrient Hijack':      { timing: 'passive',  execute: null },
  'Resistance Crisis':    { timing: 'onTurnEnd', execute: null },
  'T-Cell Training':      { timing: 'onTurnEnd', execute: null },
  'Hematopoiesis':        { timing: 'onTurnEnd', execute: null },

  // SPECIAL handlers (Phase 3)
  'Hyperspeed Dash':      { timing: 'onAttack', execute: null },
  'Gene Edit':            { timing: 'onPlay',   execute: null },
  'AI Diagnosis & Treatment': { timing: 'onPlay', execute: null },
  'Neural Hijack':        { timing: 'onKill',   execute: null },
  'Spore Dormancy':       { timing: 'onDeath',  execute: null },
  'Spike Protein':        { timing: 'onAttack', execute: null },
  'Antibiotic Resistance': { timing: 'passive', execute: null },
  'Antigen Lock-on':      { timing: 'onAttack', execute: null },
  'Silent Dive':          { timing: 'passive',  execute: null },
  'Color Camouflage':     { timing: 'onPlay',   execute: null },
  'Precision Excision':   { timing: 'onAttack', execute: null },
  'Gene Correction':      { timing: 'onPlay',   execute: null },
  'Immune Memory':        { timing: 'onPlay',   execute: null },
  'Immune Programming':   { timing: 'onPlay',   execute: null },

  // SP card skills (most are passive or special)
  'Extinction Roar':      { timing: 'onPlay',   execute: null },
  'Universal Revival':    { timing: 'onPlay',   execute: null },
  'Precision Kill':       { timing: 'onAttack', execute: null },
  'Immune Bane':          { timing: 'passive',  execute: null },
  'Omniscient Eye':       { timing: 'onPlay',   execute: null },
  'Super Computation':    { timing: 'onPlay',   execute: null },
  'Resistance Barrier':   { timing: 'passive',  execute: null },
  'Drug Immunity':        { timing: 'passive',  execute: null },
  'Frozen Release':       { timing: 'onPlay',   execute: null },
  'Plague Spread':        { timing: 'onPlay',   execute: null },
  'Full Repair':          { timing: 'onPlay',   execute: null },
  'Continuous Maintenance': { timing: 'onTurnEnd', execute: null },
  'Gene Rewrite':         { timing: 'onPlay',   execute: null },
  'Ecosystem Shelter':    { timing: 'onPlay',   execute: null },
  'Abyssal Tentacles':    { timing: 'onPlay',   execute: null },
  'Cytokine Storm':       { timing: 'onPlay',   execute: null },
  'Calcified Armor':      { timing: 'passive',  execute: null },
  'Infection Spread':     { timing: 'onKill',   execute: null },
  'Biofilm Shield':       { timing: 'passive',  execute: null },
  'Quantum Repair':       { timing: 'onPlay',   execute: null },
  'Herd Immunity':        { timing: 'passive',  execute: null },

  // Remaining card skills not yet categorized
  'Synaptic Relay':       { timing: 'passive',  execute: null },  // 迅击变体
  'Immune Activation':    { timing: 'onPlay',   execute: null },
  'Behavior Override':    { timing: 'onAttack', execute: null },
  'Precision Pierce':     { timing: 'onAttack', execute: null },
}
