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
  'Snap Trap': {
    // Sprint 25: 重做为 onPlay 主动捕食
    timing: 'onPlay',
    execute: (ctx) => {
      const insectTags = ['insect', 'arachnid', 'arthropod', 'crustacean']
      const validTargets = (ctx.enemyField || []).filter(c =>
        c && c.currentHp > 0 && c.cost <= 1
        && c.tags?.some(t => insectTags.includes(t))
      )
      if (validTargets.length > 0) {
        const target = validTargets[0]
        const slot = (ctx.enemyField || []).findIndex(c => c && c.uid === target.uid)
        return {
          type: 'AOE_DAMAGE',
          source: ctx.card.name,
          targetSlot: slot,
          targetName: target.name,
          targetUid: target.uid,
          damage: target.currentHp + 99999,  // 确保击杀
          message: `🌿 ${ctx.card.name} 夹击陷阱！一口吞掉了 ${target.name}！`,
        }
      }
      // fallback: cost 最低的敌方卡 -1500
      const allEnemies = (ctx.enemyField || []).filter(c => c && c.currentHp > 0)
      if (allEnemies.length === 0) return null
      const lowest = [...allEnemies].sort((a, b) => a.cost - b.cost)[0]
      const slot = (ctx.enemyField || []).findIndex(c => c && c.uid === lowest.uid)
      return {
        type: 'AOE_DAMAGE',
        source: ctx.card.name,
        targetSlot: slot,
        targetName: lowest.name,
        targetUid: lowest.uid,
        damage: 1500,
        message: `🌿 ${ctx.card.name} 夹击陷阱！对 ${lowest.name} 造成 1500 伤害（消化液）`,
      }
    },
  },
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
  'Penetrating Scan': {
    // Sprint 25: 改为揭示 2 张 + 对守护卡 -2000 HP
    timing: 'onPlay',
    execute: (ctx) => {
      const events = []
      const enemyHand = ctx.enemyHand || []
      const revealCount = Math.min(2, enemyHand.length)
      if (revealCount > 0) {
        const shuffled = [...enemyHand].sort(() => Math.random() - 0.5).slice(0, revealCount)
        events.push({
          type: 'REVEAL_HAND',
          source: ctx.card.name,
          cards: shuffled.map(c => c.name || '???'),
          message: `📡 ${ctx.card.name} X光透视！看穿了对手 ${revealCount} 张手牌！`,
        })
      }
      // 对守护卡造成伤害
      const guards = (ctx.enemyField || []).filter(c =>
        c && c.currentHp > 0 && c.skills?.some(s =>
          s.nameEn === 'Guard' || s.nameEn === 'Physical Barrier' || s.nameEn === 'Shell Defense'
        )
      )
      for (const guard of guards) {
        const slot = (ctx.enemyField || []).findIndex(c => c && c.uid === guard.uid)
        events.push({
          type: 'AOE_DAMAGE',
          source: ctx.card.name,
          targetSlot: slot,
          targetName: guard.name,
          targetUid: guard.uid,
          damage: 2000,
          message: `📡 ${ctx.card.name} 发现弱点！${guard.name} HP -2000`,
        })
      }
      return events.length > 0 ? events : null
    },
  },
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

  // ===========================================
  // Phase 3 — passiveAura 光环部分（3 技能 by damage.js 检查）
  // ===========================================
  // 这些技能 timing='passive'，伤害计算时自动检查（见 damage.js calcAuraEffects）
  'Antibacterial Aura':   { timing: 'passive', execute: null },  // 友方受病原系伤害 -30%
  'Droplet Filter':       { timing: 'passive', execute: null },  // 敌方病原系 ATK -500
  'Immune Collapse':      { timing: 'passive', execute: null },  // 敌方人体系 ATK -20%

  // Phase 3 — passiveAura 回合触发部分（4 技能）
  'Nutrient Drain':       { timing: 'onTurnEnd',   execute: (ctx) => T.passiveDrain(ctx, { amount: 500 }) },
  'Nutrient Hijack':      { timing: 'onTurnEnd',   execute: (ctx) => T.passiveDrain(ctx, { amount: 500 }) }, // 近似：也是吸血
  'Resistance Crisis':    { timing: 'onTurnEnd',   execute: (ctx) => T.passiveSelfDebuff(ctx, { amount: 1000, min: 2000 }) },
  'T-Cell Training':      { timing: 'onTurnEnd',   execute: (ctx) => T.passiveHeal(ctx, { scope: 'faction', faction_filter: 'body', amount: 500 }) }, // 简化
  'Hematopoiesis':        { timing: 'onTurnEnd',   execute: (ctx) => T.passiveDraw(ctx, { amount: 1, interval: 2 }) },

  // ===========================================
  // Phase 3b — 12 SPECIAL handlers
  // ===========================================

  // 1. Hyperspeed Dash — 首次攻击 ×1.5，之后每回合 ATK-500（最低 2000）
  'Hyperspeed Dash': {
    timing: 'onAttack',
    execute: (ctx) => {
      const attacker = ctx.attacker || ctx.card
      if (!attacker) return null
      // 追踪首次攻击：检查 attacker.hasDashed
      if (!attacker._dashed) {
        attacker._dashed = true
        ctx.damageMultiplier = (ctx.damageMultiplier || 1) * 1.5
        return { type: 'RUSH_BOOST', source: attacker.name, message: `⚡ ${attacker.name} 极速冲刺！首次攻击 ×1.5！` }
      }
      return null
    },
  },

  // 2. Gene Edit — 选一个敌方卡，ATK 和 HP 互换
  'Gene Edit': {
    timing: 'onPlay',
    execute: (ctx) => {
      const enemies = (ctx.enemyField || []).filter(c => c && c.currentHp > 0)
      if (enemies.length === 0) return null
      const target = [...enemies].sort((a, b) => b.atk - a.atk)[0]
      const newAtk = target.currentHp
      const newHp = target.atk
      return [{
        type: 'BUFF',
        targetUid: target.uid,
        stat: 'atk',
        amount: newAtk - target.atk,
        source: ctx.card.name,
        _side: 'enemy',
        message: `🧬 ${ctx.card.name} 基因编辑 ${target.name}！ATK↔HP 互换！`,
      }, {
        // HP 设置通过 AOE_DAMAGE + HEAL 近似达到（简化）
        type: 'AOE_DAMAGE',
        source: ctx.card.name,
        targetSlot: (ctx.enemyField || []).findIndex(c => c && c.uid === target.uid),
        targetName: target.name,
        targetUid: target.uid,
        damage: Math.max(0, target.currentHp - newHp),
        message: '',
      }]
    },
  },

  // 3. AI Diagnosis & Treatment — ATK 最高的友方获得迅击 + HP 最低友方 +5000 HP
  'AI Diagnosis & Treatment': {
    timing: 'onPlay',
    execute: (ctx) => {
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0 && c.uid !== ctx.card.uid)
      if (allies.length === 0) return null
      const events = []
      const topAtk = [...allies].sort((a, b) => b.atk - a.atk)[0]
      const lowHp = [...allies].sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0]
      if (topAtk) {
        // 迅击通过去除 summonSick 近似（或添加临时标记）
        events.push({
          type: 'BUFF', targetUid: topAtk.uid, stat: 'atk', amount: 0,
          source: ctx.card.name, _grantSwift: true,
          message: `🤖 ${ctx.card.name} AI 诊断：${topAtk.name} 获得迅击！`,
        })
      }
      if (lowHp) {
        const heal = Math.min(5000, lowHp.maxHp - lowHp.currentHp)
        if (heal > 0) {
          events.push({
            type: 'HEAL', targetUid: lowHp.uid, source: ctx.card.name, target: lowHp.name, amount: heal,
            message: `💚 ${lowHp.name} 回复 ${heal} HP！`,
          })
        }
      }
      return events.length > 0 ? events : null
    },
  },

  // 4. Neural Hijack — 击杀后 50% 控制对方下一张出场的卡
  'Neural Hijack': {
    timing: 'onKill',
    execute: (ctx) => {
      const attacker = ctx.attacker || ctx.card
      if (!attacker || Math.random() > 0.5) return null
      // 简化：转换为击杀后的控制标记
      return {
        type: 'RUSH_BOOST',
        source: attacker.name,
        _neuralHijackActive: true,
        message: `🧠 ${attacker.name} 神经劫持！下个出场的敌方卡将被控制！（简化为逻辑标记）`,
      }
    },
  },

  // 5. Spore Dormancy — 被击杀时不进弃牌堆，2 回合后满 HP 复活
  'Spore Dormancy': {
    timing: 'onDeath',
    execute: (ctx) => {
      const card = ctx.card
      if (!card) return null
      // 简化为立即 50% 概率复活（无延迟触发引擎）
      if (Math.random() > 0.5) return null
      const field = ctx.friendlyField || []
      let slot = -1
      for (let i = 0; i < field.length; i++) {
        if (!field[i] || field[i].currentHp <= 0) { slot = i; break }
      }
      if (slot < 0) return null
      const revived = {
        ...card,
        uid: card.uid + '_revived_' + Date.now(),
        currentHp: card.maxHp,
        statuses: [],
        summonSick: true,
      }
      return {
        type: 'SUMMON_CARD', side: 'friendly', slot, card: revived, source: card.name,
        message: `🧫 ${card.name} 孢子休眠！满 HP 复活！`,
      }
    },
  },

  // 6. Spike Protein — 攻击人体系时无视护盾
  'Spike Protein': {
    timing: 'onAttack',
    execute: (ctx) => {
      if (ctx.defender?.faction !== 'body') return null
      ctx.ignoreShield = true
      return {
        type: 'RUSH_BOOST',
        source: ctx.attacker?.name || ctx.card?.name,
        message: `🦠 ${ctx.attacker?.name} 刺突蛋白！无视 ${ctx.defender.name} 的护盾！`,
      }
    },
  },

  // 7. Antibiotic Resistance — 免疫科技系 + 被科技系攻击时反弹 50%
  'Antibiotic Resistance': {
    timing: 'onHit',
    execute: (ctx) => {
      if (ctx.attacker?.faction !== 'tech') return null
      const defender = ctx.defender || ctx.card
      if (!defender) return null
      ctx.damageReduction = (ctx.damageReduction || 0) + (ctx.attacker.atk || 0)  // 完全免疫
      const reflect = Math.floor((ctx.attacker.atk || 0) * 0.5)
      const atkSlot = (ctx.enemyField || []).findIndex(c => c && c.uid === ctx.attacker.uid)
      return [{
        type: 'RUSH_BOOST', source: defender.name,
        message: `💊 ${defender.name} 免疫了 ${ctx.attacker.name} 的科技系攻击！`,
      }, {
        type: 'AOE_DAMAGE', source: defender.name,
        targetSlot: atkSlot >= 0 ? atkSlot : 0,
        targetName: ctx.attacker.name, targetUid: ctx.attacker.uid, damage: reflect,
        _side: 'attacker_side',
        message: `🔄 反弹 ${reflect} 伤害！`,
      }]
    },
  },

  // 8. Antigen Lock-on — 攻击被标记目标时：无视守护 + ATK ×2
  'Antigen Lock-on': {
    timing: 'onAttack',
    execute: (ctx) => {
      const target = ctx.defender
      if (!target?.statuses?.some(s => s.type === 'marked')) return null
      ctx.damageMultiplier = (ctx.damageMultiplier || 1) * 2
      ctx.ignoreGuard = true
      return {
        type: 'RUSH_BOOST',
        source: ctx.attacker?.name || ctx.card?.name,
        message: `🎯 ${ctx.attacker?.name} 抗原锁定！无视守护 + ATK ×2！`,
      }
    },
  },

  // 9. Silent Dive — 迅击 + 首次攻击 ×1.5（组合效果）
  'Silent Dive': {
    timing: 'onAttack',
    execute: (ctx) => {
      const attacker = ctx.attacker || ctx.card
      if (!attacker || attacker._silentDived) return null
      attacker._silentDived = true
      ctx.damageMultiplier = (ctx.damageMultiplier || 1) * 1.5
      return {
        type: 'RUSH_BOOST', source: attacker.name,
        message: `🔇 ${attacker.name} 静默俯冲！首次攻击 ×1.5！`,
      }
    },
  },

  // 10. Color Camouflage — 出场后 1 回合不可被选为攻击目标
  'Color Camouflage': {
    timing: 'onPlay',
    execute: (ctx) => ({
      type: 'APPLY_SHIELD',
      targetUid: ctx.card.uid,
      source: ctx.card.name,
      target: ctx.card.name,
      amount: 9999,  // 用高护盾近似隐身（未来可改为正式 stealth status）
      _stealth: true,
      message: `🦎 ${ctx.card.name} 变色伪装！1 回合内不被选为目标！`,
    }),
  },

  // 11. Precision Excision — 无视守护选择攻击任意目标
  'Precision Excision': {
    timing: 'onAttack',
    execute: (ctx) => {
      ctx.ignoreGuard = true
      return {
        type: 'RUSH_BOOST',
        source: ctx.attacker?.name || ctx.card?.name,
        message: `🔪 ${ctx.attacker?.name} 精准切除！无视守护！`,
      }
    },
  },

  // 12. Gene Correction — 选择 +1500 ATK 或 +3000 HP（AI 选 ATK，玩家简化为 ATK）
  'Gene Correction': {
    timing: 'onPlay',
    execute: (ctx) => {
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0 && c.uid !== ctx.card.uid)
      if (allies.length === 0) return null
      // 选 ATK 最高的加 ATK（简化）
      const target = [...allies].sort((a, b) => b.atk - a.atk)[0]
      return {
        type: 'BUFF', targetUid: target.uid, stat: 'atk', amount: 1500, source: ctx.card.name,
        message: `🧬 ${ctx.card.name} 基因校正！${target.name} ATK +1500！`,
      }
    },
  },

  // Immune Memory / Immune Programming — 疫苗类：出场时给己方全体添加免疫状态
  // Sprint 25: 新增抗"可疫苗预防"病原（天花/流感等）的 5000 伤害
  'Immune Memory': {
    timing: 'onPlay',
    execute: (ctx) => {
      const events = []
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
      for (const a of allies) {
        events.push({
          type: 'APPLY_SHIELD', targetUid: a.uid, source: ctx.card.name, target: a.name,
          amount: 2000, message: `💉 ${ctx.card.name} 免疫记忆！${a.name} 获得 2000 护盾！`,
        })
      }
      // Sprint 25: 对可疫苗预防的病原卡造成 5000 伤害
      const vaccineTargets = (ctx.enemyField || []).filter(c =>
        c && c.currentHp > 0 &&
        (c.id === 'smallpox_ghost' || c.id === 'flu_virus' ||
          c.tags?.includes('vaccine_preventable'))
      )
      for (const t of vaccineTargets) {
        const slot = (ctx.enemyField || []).findIndex(c => c && c.uid === t.uid)
        events.push({
          type: 'AOE_DAMAGE', source: ctx.card.name,
          targetSlot: slot, targetName: t.name, targetUid: t.uid,
          damage: 5000,
          message: `💉 ${ctx.card.name} 疫苗预防！对 ${t.name} 造成 5000 伤害！`,
        })
      }
      return events.length > 0 ? events : null
    },
  },
  'Immune Programming': {
    timing: 'onPlay',
    execute: (ctx) => {
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
      if (allies.length === 0) return null
      return allies.map(a => ({
        type: 'APPLY_SHIELD', targetUid: a.uid, source: ctx.card.name, target: a.name,
        amount: 3000, message: `💉 ${ctx.card.name} 免疫编程！${a.name} 获得 3000 护盾！`,
      }))
    },
  },

  // ===========================================
  // Sprint 24 — SP 卡技能（模板复用，11 条）
  // ===========================================

  'Extinction Roar':      { timing: 'onPlay',   execute: (ctx) => T.onPlayDamage(ctx, { target: 'all_enemy', amount: 3000 }) },
  'Frozen Release':       { timing: 'onPlay',   execute: (ctx) => T.onPlayDamage(ctx, { target: 'leader', amount: 5000 }) },
  'Plague Spread':        { timing: 'onTurnEnd', execute: (ctx) => T.passiveAura(ctx, { effect: 'aoe_damage', scope: 'all_enemy', amount: 1000 }) },
  'Continuous Maintenance': { timing: 'onTurnEnd', execute: (ctx) => T.passiveAura(ctx, { effect: 'heal', scope: 'one_lowest_hp', amount: 2000 }) },
  'Super Computation':    { timing: 'onTurnStart', execute: (ctx) => T.passiveAura(ctx, { effect: 'draw', amount: 1 }) },
  'Immune Bane':          { timing: 'onAttack', execute: (ctx) => T.conditionalAtk(ctx, { condition: 'vs_faction', faction_filter: 'pathogen', amount: 2, is_multiplier: true }) },
  'Drug Immunity':        { timing: 'passive',  execute: null },  // 由 damage.js 检查（类似 Antibiotic Resistance）
  // Sprint 25: Ecosystem Shelter 改为多 timing — onPlay 开启 3 回合时限 + onTurnEnd 只在时限内生效
  'Ecosystem Shelter': {
    timing: ['onPlay', 'onTurnEnd'],
    execute: (ctx) => {
      if (ctx._timing === 'onPlay') {
        // 出场时给自身添加时限 status
        return {
          type: 'APPLY_STATUS',
          targetUid: ctx.card.uid,
          status: { type: 'ecosystem_shelter', turnsLeft: 3 },
          source: ctx.card.name,
          message: `🌳 ${ctx.card.name} 万灵庇护开启！持续 3 回合`,
        }
      }
      if (ctx._timing === 'onTurnEnd') {
        // 只在时限内触发回血
        const shelter = ctx.card.statuses?.find(s => s.type === 'ecosystem_shelter')
        if (!shelter || shelter.turnsLeft <= 0) return null
        return T.passiveAura(ctx, { effect: 'heal', scope: 'all_friendly', amount: 2000 })
      }
      return null
    },
  },
  'Biofilm Shield':       { timing: 'onTurnEnd', execute: (ctx) => T.passiveAura(ctx, { effect: 'heal', scope: 'faction', faction_filter: 'pathogen', amount: 1500 }) },  // Guard/immune_tech 由 passive 处理
  'Abyssal Tentacles':    { timing: 'onPlay',   execute: (ctx) => T.onPlayDamage(ctx, { target: 'all_enemy', amount: 4000, bonus: { type: 'debuff_atk', amount: 2000, duration: 2, scope: 'all_enemy' } }) },

  // Gene Rewrite 复用 Gene Edit（需在定义后引用，见下方延迟绑定）
  'Gene Rewrite':         { timing: 'onPlay',   execute: null /* 由下方 init 绑定到 Gene Edit */ },

  // ===========================================
  // Sprint 24 Step 3 — 10 个新 handler
  // ===========================================

  // 1. Universal Revival (SP·世界树) — 全队 +3000 HP + 修复 Power Bank
  'Universal Revival': {
    timing: 'onPlay',
    execute: (ctx) => {
      const events = []
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
      for (const ally of allies) {
        const heal = Math.min(3000, ally.maxHp - ally.currentHp)
        if (heal > 0) {
          events.push({
            type: 'HEAL', targetUid: ally.uid, source: ctx.card.name, target: ally.name, amount: heal,
            message: `🌳 ${ctx.card.name} 万物复苏！${ally.name} 回复 ${heal} HP`,
          })
        }
      }
      events.push({
        type: 'REPAIR_POWER_BANK', source: ctx.card.name,
        message: `🔋 ${ctx.card.name} 修复了 Power Bank！`,
      })
      return events
    },
  },

  // 2. Precision Kill (SP·CAR-T) — 消灭对方一张病原系（无视 HP）
  'Precision Kill': {
    timing: 'onPlay',
    execute: (ctx) => {
      const enemies = (ctx.enemyField || []).filter(c => c && c.currentHp > 0 && c.faction === 'pathogen')
      if (enemies.length === 0) return null
      const target = [...enemies].sort((a, b) => b.atk - a.atk)[0]
      const slot = (ctx.enemyField || []).findIndex(c => c && c.uid === target.uid)
      return {
        type: 'AOE_DAMAGE',
        source: ctx.card.name,
        targetSlot: slot,
        targetName: target.name,
        targetUid: target.uid,
        damage: target.currentHp + 99999,  // 确保击杀
        message: `🎯 ${ctx.card.name} 精准猎杀！${target.name} 被消灭！`,
      }
    },
  },

  // 3. Omniscient Eye (SP·大脑) — 揭示全部手牌 + 全队迅击 1 回合
  'Omniscient Eye': {
    timing: 'onPlay',
    execute: (ctx) => {
      const events = []
      const enemyHand = ctx.enemyHand || []
      events.push({
        type: 'REVEAL_HAND', source: ctx.card.name,
        cards: enemyHand.map(c => c.name || '???'),
        message: `🧠 ${ctx.card.name} 全知之眼！看穿了对手所有手牌！`,
      })
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
      for (const ally of allies) {
        events.push({
          type: 'APPLY_STATUS', targetUid: ally.uid,
          status: { type: 'swift_boost', turnsLeft: 1 },
          message: `⚡ ${ally.name} 获得迅击效果！`,
        })
      }
      return events
    },
  },

  // 4. Cytokine Storm (SP·免疫风暴) — 全队 ATK +3000 + 2 回合免疫
  'Cytokine Storm': {
    timing: 'onPlay',
    execute: (ctx) => {
      const events = []
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
      for (const ally of allies) {
        events.push({
          type: 'BUFF', targetUid: ally.uid, stat: 'atk', amount: 3000, source: ctx.card.name,
          message: `🔥 ${ally.name} ATK +3000！`,
        })
        events.push({
          type: 'APPLY_STATUS', targetUid: ally.uid,
          status: { type: 'immune', turnsLeft: 2 },
          message: `🛡️ ${ally.name} 获得 2 回合免疫！`,
        })
      }
      return events
    },
  },

  // 5. Calcified Armor (SP·骨骼巨人) — 多 timing: onHit 减伤 30% + onDeath 主人 5000 盾
  'Calcified Armor': {
    timing: ['onHit', 'onDeath'],
    execute: (ctx) => {
      if (ctx._timing === 'onHit') {
        // 减伤 30%（通过 ctx.damageReduction 传递给伤害计算）
        if (ctx.attacker) {
          const reduction = Math.floor((ctx.attacker.atk || 0) * 0.3)
          ctx.damageReduction = (ctx.damageReduction || 0) + reduction
          return {
            type: 'RUSH_BOOST', source: ctx.card?.name,
            message: `🦴 ${ctx.card?.name} 钙化铠甲减免 ${reduction} 伤害！`,
          }
        }
        return null
      }
      if (ctx._timing === 'onDeath') {
        // 给主人留 5000 盾 — 通过 APPLY_STATUS 给"主人"不可行，改为直接给主人回血（近似）
        return {
          type: 'HEAL_LEADER',
          amount: 5000,
          source: ctx.card?.name,
          message: `🦴 ${ctx.card?.name} 倒下！为主人留下 5000 护盾（回血）！`,
        }
      }
      return null
    },
  },

  // 6. Infection Spread (SP·僵尸瘟疫) — 所有敌方百分比 DOT 3 回合
  'Infection Spread': {
    timing: 'onPlay',
    execute: (ctx) => {
      const enemies = (ctx.enemyField || []).filter(c => c && c.currentHp > 0)
      if (enemies.length === 0) return null
      return enemies.map(enemy => ({
        type: 'APPLY_POISON',
        targetUid: enemy.uid,
        damage: Math.max(500, Math.floor(enemy.currentHp * 0.15 / 500) * 500),
        turnsLeft: 3,
        source: ctx.card.name,
        targetName: enemy.name,
        message: `☠️ ${enemy.name} 被感染！每回合损失 15% HP！`,
      }))
    },
  },

  // 7. Resistance Barrier (SP·超级细菌) — 清除敌方护盾 + 科技系 ATK -50%
  'Resistance Barrier': {
    timing: 'onPlay',
    execute: (ctx) => {
      const enemies = (ctx.enemyField || []).filter(c => c && c.currentHp > 0)
      const events = []
      for (const enemy of enemies) {
        if (enemy.statuses?.some(s => s.type === 'shield')) {
          events.push({
            type: 'REMOVE_SHIELD', targetUid: enemy.uid, source: ctx.card.name,
            message: `💥 ${enemy.name} 的护盾被耐药屏障摧毁！`,
          })
        }
        if (enemy.faction === 'tech') {
          const reduction = Math.floor(enemy.atk * 0.5 / 500) * 500
          events.push({
            type: 'BUFF', targetUid: enemy.uid, stat: 'atk', amount: -reduction,
            source: ctx.card.name, _side: 'enemy',
            message: `⚠️ ${enemy.name} ATK -${reduction}！科技系武器对超级细菌无效！`,
          })
        }
      }
      return events.length > 0 ? events : null
    },
  },

  // 8. Quantum Repair (SP·量子医疗) — 主人满血 + 批量复活
  'Quantum Repair': {
    timing: 'onPlay',
    execute: (ctx) => {
      return [
        {
          type: 'HEAL_LEADER', amount: 30000, source: ctx.card.name,
          message: `✨ ${ctx.card.name} 量子修复！主人 HP 完全恢复！`,
        },
        {
          type: 'MASS_REVIVE', hp_percent: 0.5, source: ctx.card.name,
          message: `✨ 所有倒下的战友重新站起来！`,
        },
      ]
    },
  },

  // 9. Herd Immunity (SP·疫苗之盾) — 全队免死一次
  'Herd Immunity': {
    timing: 'onPlay',
    execute: (ctx) => {
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
      if (allies.length === 0) return null
      return allies.map(ally => ({
        type: 'APPLY_STATUS', targetUid: ally.uid,
        status: { type: 'herd_immunity', uses: 1 },
        source: ctx.card.name,
        message: `🛡️ ${ally.name} 获得群体免疫护盾！可抵消一次致死伤害`,
      }))
    },
  },

  // 10. Full Repair (SP·纳米机器人) — 全队清负面 + 2000 盾
  'Full Repair': {
    timing: 'onPlay',
    execute: (ctx) => {
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
      const events = []
      for (const ally of allies) {
        events.push({
          type: 'CLEANSE', targetUid: ally.uid, source: ctx.card.name,
          message: `🔧 ${ally.name} 负面状态已清除！`,
        })
        events.push({
          type: 'APPLY_SHIELD', targetUid: ally.uid, amount: 2000,
          source: ctx.card.name, target: ally.name,
          message: `🛡️ ${ally.name} 获得 2000 护盾`,
        })
      }
      return events.length > 0 ? events : null
    },
  },

  // ===========================================
  // Sprint 25 — 4 个剩余技能
  // ===========================================

  // 1.1 Synaptic Relay (神经元·闪电信使) — 攻击后随机一张友方获得迅击
  'Synaptic Relay': {
    timing: 'onAttack',
    execute: (ctx) => {
      if (ctx.target === 'leader') return null
      const allies = (ctx.friendlyField || [])
        .filter(c => c && c.currentHp > 0 && c.uid !== ctx.card.uid)
      if (allies.length === 0) return null
      const target = allies[Math.floor(Math.random() * allies.length)]
      return {
        type: 'APPLY_STATUS',
        targetUid: target.uid,
        status: { type: 'swift_boost', turnsLeft: 1 },
        source: ctx.card.name,
        message: `⚡ ${ctx.card.name} 突触传递！${target.name} 获得迅击！`,
      }
    },
  },

  // 1.2 Immune Activation (淋巴结·过滤站) — onPlay: 每个其他血液免疫友方 +500 HP
  'Immune Activation': {
    timing: 'onPlay',
    execute: (ctx) => {
      const allies = (ctx.friendlyField || [])
        .filter(c => c && c.currentHp > 0 && c.uid !== ctx.card.uid
          && c.faction === 'body' && (c.subType === 'immune' || c.subType === 'circulatory'))
      const count = allies.length
      if (count === 0) return null
      const hpBoost = count * 500
      const actualHeal = Math.min(hpBoost, (ctx.card.maxHp || ctx.card.hp) - (ctx.card.currentHp || ctx.card.hp))
      if (actualHeal <= 0) return null
      return {
        type: 'HEAL',
        targetUid: ctx.card.uid,
        source: ctx.card.name,
        target: ctx.card.name,
        amount: actualHeal,
        message: `🛡️ ${ctx.card.name} 免疫激活！检测到 ${count} 个血液免疫卡，HP +${actualHeal}`,
      }
    },
  },

  // 1.3 Behavior Override (弓形虫·心智操控者) — 25% 概率使目标下回合不能行动（sleep 简化）
  'Behavior Override': {
    timing: 'onAttack',
    execute: (ctx) => {
      if (ctx.target === 'leader') return null
      if (Math.random() > 0.25) return null
      const defender = ctx.defender
      if (!defender || defender.currentHp <= 0) return null
      return {
        type: 'APPLY_SLEEP',
        targetUid: defender.uid,
        source: ctx.card.name,
        targetName: defender.name,
        turnsLeft: 1,
        message: `🧠 ${ctx.card.name} 行为改写！${defender.name} 被操控，下回合无法行动！`,
      }
    },
  },

  // 1.4 Precision Pierce (机器人手术刀) — 复用 Piercing Strike
  'Precision Pierce': {
    timing: 'onKill',
    execute: (ctx) => skillRegistry['Piercing Strike'].execute(ctx),
  },
}

// Sprint 24: Gene Rewrite 复用 Gene Edit（延迟绑定避免引用顺序问题）
if (skillRegistry['Gene Edit']?.execute) {
  skillRegistry['Gene Rewrite'].execute = skillRegistry['Gene Edit'].execute
}
