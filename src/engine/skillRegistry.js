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
import { cardHasGuard } from '../utils/guardSkill'

// Sprint 27: 揭示卡对象辅助函数 — 只传必要信息到 UI
const revealObj = (c) => ({
  name: c?.name,
  nameEn: c?.nameEn,
  cost: c?.cost,
  faction: c?.faction,
  rarity: c?.rarity,
})

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
      const isGuard = cardHasGuard(ctx.defender)
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

  'Sonar Shockwave':    { timing: 'onPlay', execute: (ctx) => T.onPlayDamage(ctx, { target: 'all_enemy', amount: 3000 }) }, // 2000→3000：原为最弱 all_enemy AOE，与同类终极 AOE(Ancient Plague/Extinction Roar 均 3000)齐平 + 匹配蓝鲸"动物界最响(188分贝)"科学事实
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
  // Sprint 26: Diagnostic Analysis 差异化 — 增强循环/呼吸系统卡
  'Diagnostic Analysis': {
    timing: 'onPlay',
    execute: (ctx) => {
      const events = []
      const targets = (ctx.friendlyField || []).filter(c =>
        c && c.currentHp > 0 && c.uid !== ctx.card.uid
        && (c.subType === 'circulatory' || c.subType === 'respiratory')
      )
      if (targets.length > 0) {
        for (const t of targets) {
          const heal = Math.min(1000, t.maxHp - t.currentHp)
          if (heal > 0) {
            events.push({
              type: 'HEAL', targetUid: t.uid, source: ctx.card.name, target: t.name,
              amount: heal,
              message: `🩺 ${ctx.card.name} 听诊分析！${t.name} HP +${heal}`,
            })
          }
          events.push({
            type: 'BUFF', targetUid: t.uid, stat: 'atk', amount: 500, source: ctx.card.name,
            message: `🩺 ${t.name} 功能增强！ATK +500`,
          })
        }
      } else {
        // 无循环/呼吸卡时回退：任意 HP 最低友方 +1000 HP
        const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0 && c.uid !== ctx.card.uid)
        if (allies.length > 0) {
          const lowest = [...allies].sort((a, b) => a.currentHp - b.currentHp)[0]
          const heal = Math.min(1000, lowest.maxHp - lowest.currentHp)
          if (heal > 0) {
            events.push({
              type: 'HEAL', targetUid: lowest.uid, source: ctx.card.name, target: lowest.name,
              amount: heal, message: `🩺 ${ctx.card.name} 基础检查！${lowest.name} HP +${heal}`,
            })
          }
        }
      }
      return events.length > 0 ? events : null
    },
  },

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

  // Sprint 26: Temperature Monitor 差异化 — 揭示 1 张 + 清除敌方 1 个 buff
  'Temperature Monitor': {
    timing: 'onPlay',
    execute: (ctx) => {
      const events = []
      const enemyHand = ctx.enemyHand || []
      // 揭示 1 张最高费用
      if (enemyHand.length > 0) {
        const top = [...enemyHand].sort((a, b) => (b.cost || 0) - (a.cost || 0))[0]
        events.push({
          type: 'REVEAL_HAND', source: ctx.card.name, cards: [revealObj(top)],
          message: `🌡️ ${ctx.card.name} 体温检测！发现对手一张手牌：${top.name}`,
        })
      }
      // 检测敌方 buff 并清除一个
      const enemies = (ctx.enemyField || []).filter(c => c && c.currentHp > 0)
      for (const enemy of enemies) {
        const buff = enemy.statuses?.find(s =>
          s.type === 'immune' || s.type === 'immune_tech' || s.type === 'swift_boost' || s.type === 'shield'
        )
        if (buff) {
          if (buff.type === 'shield') {
            events.push({
              type: 'REMOVE_SHIELD', targetUid: enemy.uid, source: ctx.card.name,
              message: `🌡️ ${ctx.card.name} 检测到异常！清除了 ${enemy.name} 的护盾！`,
            })
          } else {
            events.push({
              type: 'REMOVE_STATUS', targetUid: enemy.uid, _side: 'enemy',
              statusType: buff.type, source: ctx.card.name,
              message: `🌡️ ${ctx.card.name} 检测到异常！清除了 ${enemy.name} 的 ${buff.type} 状态！`,
            })
          }
          break
        }
      }
      return events.length > 0 ? events : null
    },
  },
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
          cards: shuffled.map(revealObj),
          message: `📡 ${ctx.card.name} X光透视！看穿了对手 ${revealCount} 张手牌！`,
        })
      }
      // 对守护卡造成伤害
      const guards = (ctx.enemyField || []).filter(c => c && c.currentHp > 0 && cardHasGuard(c))
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
  // Sprint 26: Micro Insight 差异化 — 揭示全部 + 对微生物/病原卡造成 1500 伤害
  'Micro Insight': {
    timing: 'onPlay',
    execute: (ctx) => {
      const events = []
      const enemyHand = ctx.enemyHand || []
      if (enemyHand.length > 0) {
        events.push({
          type: 'REVEAL_HAND', source: ctx.card.name,
          cards: enemyHand.map(revealObj),
          message: `🔬 ${ctx.card.name} 微观洞察！看穿了对手全部手牌！`,
        })
      }
      const microTargets = (ctx.enemyField || []).filter(c =>
        c && c.currentHp > 0
        && (c.subType === 'virus' || c.subType === 'bacteria' || c.subType === 'fungus' || c.subType === 'microbe')
      )
      for (const target of microTargets) {
        const slot = (ctx.enemyField || []).findIndex(c => c && c.uid === target.uid)
        events.push({
          type: 'AOE_DAMAGE', source: ctx.card.name,
          targetSlot: slot, targetName: target.name, targetUid: target.uid,
          damage: 1500,
          message: `🔬 ${ctx.card.name} 发现微生物！${target.name} 暴露了！-1500 HP`,
        })
      }
      return events.length > 0 ? events : null
    },
  },
  // Sprint 26: Rapid Test 差异化 — 揭示 + 标记病原 ATK 最高（+1000 攻击该目标）
  'Rapid Test': {
    timing: 'onPlay',
    execute: (ctx) => {
      const events = []
      const enemyHand = ctx.enemyHand || []
      if (enemyHand.length > 0) {
        events.push({
          type: 'REVEAL_HAND', source: ctx.card.name,
          cards: enemyHand.map(revealObj),
          message: `🔬 ${ctx.card.name} 快速检测！看穿了对手全部手牌！`,
        })
      }
      const pathogens = (ctx.enemyField || []).filter(c =>
        c && c.currentHp > 0 && c.faction === 'pathogen'
      )
      if (pathogens.length > 0) {
        const target = [...pathogens].sort((a, b) => b.atk - a.atk)[0]
        events.push({
          type: 'APPLY_MARK', targetUid: target.uid, source: ctx.card.name,
          targetName: target.name,
          bonus_damage: 1000, bonus_from: 'all',
          message: `🩸 ${ctx.card.name} 检测到 ${target.name}！所有攻击该目标 +1000 伤害！`,
        })
      }
      return events.length > 0 ? events : null
    },
  },
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
  'Nutrient Hijack':      { timing: 'onTurnEnd',   execute: (ctx) => T.passiveDrain(ctx, { amount: 500 }) }, // 蛔虫掠夺宿主营养：扣敌方主人+回己方主人(描述已对齐)
  'Resistance Crisis':    { timing: 'onTurnEnd',   execute: (ctx) => T.passiveSelfDebuff(ctx, { amount: 1000, min: 2000 }) },
  'T-Cell Training':      { timing: 'onTurnEnd',   execute: (ctx) => T.passiveDraw(ctx, { amount: 1, interval: 2 }) }, // 胸腺产出新免疫细胞：每2回合抽1张(原 passiveHeal 与描述不符，齐齐选抽牌型)
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
        return { type: 'RUSH_BOOST', source: attacker.name, message: `⚡ ${attacker.name} 极速冲刺！首次攻击 ×1.5！`, mods: { damageMultiplier: 1.5 } }
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

  // 2b. Gene Correction (基因治疗·修复密码) — 永久给 ATK 最高的友方 +1500 ATK + +3000 HP
  // 原设计是"二选一+手选目标"，但游戏没有 onPlay 玩家手选 UI；改成双效果 auto-target(one_highest_atk)
  // 慷慨化(5费 SR 双 buff 价值合理)；BUFF 不带 turns 即永久（与 useBattle BUFF case 'atk'/'hp' 一致）
  'Gene Correction': {
    timing: 'onPlay',
    execute: (ctx) => {
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
      if (allies.length === 0) return null
      const target = [...allies].sort((a, b) => b.atk - a.atk)[0]
      return [
        {
          type: 'BUFF',
          targetUid: target.uid,
          stat: 'atk',
          amount: 1500,
          source: ctx.card.name,
          message: `🧬 ${ctx.card.name} 修正 ${target.name} 的基因！永久 +1500 ATK`,
        },
        {
          type: 'BUFF',
          targetUid: target.uid,
          stat: 'hp',
          amount: 3000,
          source: ctx.card.name,
          message: `💪 ${target.name} 获得永久 +3000 HP！`,
        },
      ]
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
        // 授予迅击：加 swift_boost status，hasSwift 判定会绕过召唤疲劳，回合末 tick 清除
        // （与 Omniscient Eye 同款写法；旧的 BUFF+_grantSwift 从未被 handler 读取，是空操作）
        events.push({
          type: 'APPLY_STATUS', targetUid: topAtk.uid,
          status: { type: 'swift_boost', turnsLeft: 1 },
          source: ctx.card.name,
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

  // 4. Neural Hijack — 攻击时劫持目标神经，削弱其 ATK。
  //    原"击杀后50%控制对方卡"是无引擎支持的空壳（返回畸形 RUSH_BOOST + 没人读的死标记 + 误导性假消息、
  //    实际无任何效果）。简化为真效果：onAttack debuff_atk -1000/2回合，贴"狂犬病毒入侵神经系统、削弱宿主"
  //    科学；mirror 蜘蛛 Silk Trap 的 onAttackDebuff 模板。
  'Neural Hijack': { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'debuff_atk', amount: 1000, duration: 2 }) },

  // 5. Spore Dormancy — 被击杀时必定以满 HP 复活一次（复用 onDeathEffect chance_revive，同海星）
  //    chance:1.0=必定；revive_hp=maxHp(6000)=满血；模板对复活体一律 skills:[] → 不再触发 → 每场限一次。
  //    （原 bespoke 代码为"立即 50% 概率复活"，与卡面"必定复活"不符，齐齐定改必定，删随机代码。）
  'Spore Dormancy': {
    timing: 'onDeath',
    execute: (ctx) => T.onDeathEffect(ctx, { effect: 'chance_revive', chance: 1.0, revive_hp: 6000, strip_skills: true }),
  },

  // 6. Spike Protein — 攻击人体系时无视护盾
  'Spike Protein': {
    timing: 'onAttack',
    execute: (ctx) => {
      if (ctx.defender?.faction !== 'body') return null
      return {
        type: 'RUSH_BOOST',
        source: ctx.attacker?.name || ctx.card?.name,
        message: `🦠 ${ctx.attacker?.name} 刺突蛋白！无视 ${ctx.defender.name} 的护盾！`,
        mods: { ignoreShield: true },
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
      const immunity = ctx.attacker.atk || 0  // 完全免疫：减伤 = 攻击方全部 ATK（resolveCardCombat 消费 mods.damageReduction）
      const reflect = Math.floor((ctx.attacker.atk || 0) * 0.5)
      // 反弹打「攻击者」：用 ctx.attackerField 定位攻击者 slot + _side:'attacker'（镜像 onHitCounter 的路由修复，决策D）
      const atkSlot = (ctx.attackerField || []).findIndex(c => c && c.uid === ctx.attacker.uid)
      return [{
        type: 'RUSH_BOOST', source: defender.name,
        message: `💊 ${defender.name} 免疫了 ${ctx.attacker.name} 的科技系攻击！`,
        mods: { damageReduction: immunity },
      }, {
        type: 'AOE_DAMAGE', source: defender.name,
        targetSlot: atkSlot >= 0 ? atkSlot : 0,
        targetName: ctx.attacker.name, targetUid: ctx.attacker.uid, damage: reflect,
        _side: 'attacker',
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
      // ATK ×2 打卡由 resolveCardCombat 消费；无视守护由 guardSkill.attackerBypassesGuard 处理（守护是攻击前的门）
      return {
        type: 'RUSH_BOOST',
        source: ctx.attacker?.name || ctx.card?.name,
        message: `🎯 ${ctx.attacker?.name} 抗原锁定！无视守护 + ATK ×2！`,
        mods: { damageMultiplier: 2 },
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
      return {
        type: 'RUSH_BOOST', source: attacker.name,
        message: `🔇 ${attacker.name} 静默俯冲！首次攻击 ×1.5！`,
        mods: { damageMultiplier: 1.5 },
      }
    },
  },

  // 10. Color Camouflage — 出场后 1 回合不可被选为攻击目标（真隐身 stealth status，mirror 抹香鲸 Abyssal Dive）
  // 旧实现用 9999 护盾"近似隐身"，导致变色龙几乎打不死（齐齐实测撞到 5499 残余护盾）；_stealth 标记是死代码无人读。
  'Color Camouflage': {
    timing: 'onPlay',
    execute: (ctx) => {
      const card = ctx.card
      if (!card || card.currentHp <= 0) return null
      return {
        type: 'APPLY_STATUS',
        targetUid: card.uid,
        status: { type: 'stealth', turnsLeft: 1 },
        source: card.name,
        message: `🦎 ${card.name} 变色伪装！1 回合内不被选为攻击目标！`,
      }
    },
  },

  // 11. Precision Excision — 无视守护选择攻击任意目标
  'Precision Excision': {
    timing: 'onAttack',
    execute: (ctx) => {
      // 无视守护由 guardSkill.attackerBypassesGuard 在守护判定处理（守护是攻击前的门，不走 combat mods）
      return {
        type: 'RUSH_BOOST',
        source: ctx.attacker?.name || ctx.card?.name,
        message: `🔪 ${ctx.attacker?.name} 精准切除！无视守护！`,
      }
    },
  },

  // 12. Gene Correction — 旧的"仅 +1500 ATK"重复定义已删除。
  // JS 对象字面量重复键后者覆盖前者：这个旧版会 shadow 上方 L665 的完整双 buff 版（ATK+1500 + HP+3000），
  // 导致 +3000 HP 永久丢失（test 用 indexOf 只查到第一处、没发现 shadow）。完整实现见上方 'Gene Correction'。

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
  // Sprint 26: Abyssal Tentacles 重做 — 选 ATK 最高 2 张各造成 5000，不足 2 张剩余打主人
  'Abyssal Tentacles': {
    timing: 'onPlay',
    execute: (ctx) => {
      const enemies = (ctx.enemyField || [])
        .filter(c => c && c.currentHp > 0)
        .sort((a, b) => b.atk - a.atk)
      const events = []
      const targets = enemies.slice(0, 2)
      for (const t of targets) {
        const slot = (ctx.enemyField || []).findIndex(c => c && c.uid === t.uid)
        events.push({
          type: 'AOE_DAMAGE',
          source: ctx.card.name,
          targetSlot: slot,
          targetName: t.name,
          targetUid: t.uid,
          damage: 5000,
          message: `🦑 ${ctx.card.name} 深渊触手缠绕 ${t.name}！造成 5000 伤害！`,
        })
      }
      // 不足 2 个目标时，剩余的触手打主人
      const remaining = 2 - targets.length
      if (remaining > 0) {
        events.push({
          type: 'OVERFLOW_DAMAGE',
          source: ctx.card.name,
          target: 'enemyLeader',
          damage: remaining * 5000,
          message: `🦑 ${ctx.card.name} 触手席卷！对主人造成 ${remaining * 5000} 伤害！`,
        })
      }
      return events.length > 0 ? events : null
    },
  },

  // Sprint 26 新增：Abyssal Eye（大王乌贼第二技能）
  'Abyssal Eye': {
    timing: 'onAttack',
    execute: (ctx) => T.conditionalAtk(ctx, {
      condition: 'vs_highest_hp',
      amount: 1.5,
      is_multiplier: true,
    }),
  },

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
        cards: enemyHand.map(revealObj),
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

  // 9b. Rewilding (SP·盖娅复苏) — 主人 +5000 HP + 复活弃牌堆所有自然系卡(50% HP)
  'Rewilding': {
    timing: 'onPlay',
    execute: (ctx) => {
      return [
        {
          type: 'HEAL_LEADER', amount: 5000, source: ctx.card.name,
          message: `🌍 ${ctx.card.name} 盖娅守望！主人恢复 5000 HP`,
        },
        {
          type: 'MASS_REVIVE', hp_percent: 0.5, faction_filter: 'nature', source: ctx.card.name,
          message: `🌱 万物归野！沉睡的自然之力重新苏醒`,
          emptyMessage: `🌍 ${ctx.card.name} 盖娅守望大地（弃牌堆尚无自然系卡可唤回）`,
        },
      ]
    },
  },

  // 9c. Photosynthetic Nourishment (SP·盖娅复苏) — 每回合结束主人 +1500 HP
  'Photosynthetic Nourishment': {
    timing: 'onTurnEnd',
    execute: (ctx) => T.passiveHeal(ctx, { scope: 'leader', amount: 1500 }),
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

  // 1.3 Behavior Override (弓形虫·心智操控者) — Sprint 26: 真正的心智操控
  // 25% 概率使目标下回合攻击随机友方
  'Behavior Override': {
    timing: 'onAttack',
    execute: (ctx) => {
      if (ctx.target === 'leader') return null
      if (Math.random() > 0.25) return null
      const defender = ctx.defender
      if (!defender || defender.currentHp <= 0) return null
      return {
        type: 'APPLY_STATUS',
        targetUid: defender.uid,
        status: { type: 'confused', turnsLeft: 1 },
        source: ctx.card.name,
        _side: 'enemy',
        message: `🧠 ${ctx.card.name} 行为改写！${defender.name} 被操控，下回合将攻击自己人！`,
      }
    },
  },

  // 1.4 Precision Pierce (机器人手术刀) — 复用 Piercing Strike
  'Precision Pierce': {
    timing: 'onKill',
    execute: (ctx) => skillRegistry['Piercing Strike'].execute(ctx),
  },

  // ===========================================
  // Phase 2 扩卡：能量主线（OCEAN/MICRO）
  // ===========================================

  // 深海管虫·热泉炼金师 — 化能合成滋养（自身 + 自然系友方）
  'Chemosynthetic Bounty': {
    timing: 'onTurnEnd',
    execute: (ctx) => {
      const self = ctx.card
      if (!self || self.currentHp <= 0) return null
      const results = []
      const selfHeal = Math.min(2000, self.maxHp - self.currentHp)
      if (selfHeal > 0) results.push({ type: 'HEAL', targetUid: self.uid, source: self.name, target: self.name, amount: selfHeal, message: `🔥 ${self.name} 细菌厨房，回复 ${selfHeal} HP` })
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0 && c.uid !== self.uid && c.faction === 'nature')
      for (const ally of allies) {
        const heal = Math.min(1000, ally.maxHp - ally.currentHp)
        if (heal > 0) results.push({ type: 'HEAL', targetUid: ally.uid, source: self.name, target: ally.name, amount: heal, message: `🔥 ${self.name} 滋养 ${ally.name}，回复 ${heal} HP` })
      }
      return results.length > 0 ? results : null
    },
  },

  // 蓝细菌 — 大氧化事件（出场给最多 3 张自然系永久 ATK +1000）
  'Great Oxidation Event': {
    timing: 'onPlay',
    execute: (ctx) => {
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0 && c.faction === 'nature').slice(0, 3)
      if (allies.length === 0) return null
      return allies.map(a => ({ type: 'BUFF', targetUid: a.uid, stat: 'atk', amount: 1000, source: ctx.card.name, message: `🫧 ${ctx.card.name} 大氧化事件！${a.name} ATK 永久 +1000！` }))
    },
  },

  // 蓝细菌 — 阳光造氧（回合末全自然系回 500）
  'Oxygenic Photosynthesis': {
    timing: 'onTurnEnd',
    execute: (ctx) => T.passiveHeal(ctx, { scope: 'faction', faction_filter: 'nature', amount: 500 }),
  },

  // 叶绿体 — 光合爆发（出场 +2 能量，不进 Power Bank）
  'Photosynthesis Burst': {
    timing: 'onPlay',
    execute: (ctx) => {
      const card = ctx.card
      if (!card || card.currentHp <= 0) return null
      return { type: 'ENERGY_BOOST', source: card.name, amount: 2, message: `☀️ ${card.name} 光合爆发！本回合 +2 能量！` }
    },
  },

  // 叶绿体 — 糖分供养（回合末全自然系回 500）
  'Sugar Provision': {
    timing: 'onTurnEnd',
    execute: (ctx) => T.passiveHeal(ctx, { scope: 'faction', faction_filter: 'nature', amount: 500 }),
  },

  // 眼虫 — 晒太阳回血（自养：回合末自身回 1000）
  'Photosynthesis Recovery': {
    timing: 'onTurnEnd',
    execute: (ctx) => T.passiveHeal(ctx, { scope: 'self', amount: 1000 }),
  },

  // 眼虫 — 缺光开饭（异养：攻击残血敌方额外 1500）
  'Engulf Mode': {
    timing: 'onAttack',
    execute: (ctx) => T.conditionalAtk(ctx, { condition: 'vs_low_hp', hp_threshold: 0.5, amount: 1500 }),
  },

  // ===========================================
  // Phase 2 第二批（OCEAN 海洋深渊 / MICRO 微观战场）
  // ===========================================

  // 安康鱼·深海钓灯 — 守护(走 GUARD_SKILL_NAMES 白名单，此 passive 仅为登记一致性) + 攻击使敌沉睡
  'Luring Lantern': { timing: 'passive' },
  'Gulp Trap': { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'paralyze', duration: 1 }) },

  // 抹香鲸·深渊潜猎者 — 出场隐身 1 回合 + 回声定位秒最低血
  'Abyssal Dive': {
    timing: 'onPlay',
    execute: (ctx) => {
      const card = ctx.card
      if (!card || card.currentHp <= 0) return null
      return { type: 'APPLY_STATUS', targetUid: card.uid, status: { type: 'stealth', turnsLeft: 1 }, source: card.name, message: `🌊 ${card.name} 极限深潜！1 回合内不被选为攻击目标！` }
    },
  },
  'Echo Hunt Strike': { timing: 'onPlay', execute: (ctx) => T.onPlayDamage(ctx, { target: 'one_lowest_hp', amount: 2500 }) },

  // 小丑鱼·海葵之家 — 出场给最虚弱友方加盾 + 被攻击反击
  'Tentacle Shelter': { timing: 'onPlay', execute: (ctx) => T.onPlayHeal(ctx, { effect: 'shield', target: 'one_lowest_hp', amount: 2000 }) },
  'Anemone Sting': { timing: 'onHit', execute: (ctx) => T.onHitCounter(ctx, { effect: 'counter_damage', amount: 1000 }) },

  // 海星·断肢重生者 — 必定复活(半血,复活体无技能防无限链) + 击杀回血
  'Regenerate': { timing: 'onDeath', execute: (ctx) => T.onDeathEffect(ctx, { effect: 'chance_revive', chance: 1.0, revive_hp: 2000, strip_skills: true }) },
  'Stomach Eversion': { timing: 'onKill', execute: (ctx) => T.onKillEffect(ctx, { effect: 'heal_self', amount: 1000 }) },

  // 帝企鹅·极地守护 — 抱团取暖(全自然系回血) + 轮流取暖(最虚弱友方回血)
  'Huddle Warmth': { timing: 'onTurnEnd', execute: (ctx) => T.passiveHeal(ctx, { scope: 'faction', faction_filter: 'nature', amount: 1000 }) },
  'Rotation Relief': { timing: 'onTurnEnd', execute: (ctx) => T.passiveHeal(ctx, { scope: 'one_lowest_hp', amount: 1500 }) },

  // 黏菌·没有脑子的解题高手 — 觅食网络(出场每张自然系友方永久+500ATK，复用 BUFF 已验证路径) + 越练越强(随机成长)
  'Foraging Network': {
    timing: 'onPlay',
    execute: (ctx) => {
      const card = ctx.card
      if (!card || card.currentHp <= 0) return null
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0 && c.uid !== card.uid && c.faction === 'nature')
      if (allies.length === 0) return null
      return { type: 'BUFF', targetUid: card.uid, stat: 'atk', amount: 500 * allies.length, source: card.name, message: `🕸️ ${card.name} 觅食网络！连上 ${allies.length} 个节点，ATK 永久 +${500 * allies.length}！` }
    },
  },
  'Trial and Error': { timing: 'onTurnStart', execute: (ctx) => T.passiveRandomBuff(ctx, { amount: 500 }) },

  // 硅藻·玻璃造氧师 — 每回合全自然系回血 + 出场自身护盾
  'Oxygen Workhorse': { timing: 'onTurnEnd', execute: (ctx) => T.passiveHeal(ctx, { scope: 'faction', faction_filter: 'nature', amount: 500 }) },
  'Glass Armor': {
    timing: 'onPlay',
    execute: (ctx) => {
      const card = ctx.card
      if (!card || card.currentHp <= 0) return null
      return { type: 'APPLY_SHIELD', targetUid: card.uid, source: card.name, target: card.name, amount: 2000, message: `🛡️ ${card.name} 玻璃铠甲！硅壳挡下 2000 伤害！` }
    },
  },

  // 水熊虫·隐生不死 — 出场免疫 2 回合 + 每回合自愈
  'Tun Cryptobiosis': {
    timing: 'onPlay',
    execute: (ctx) => {
      const card = ctx.card
      if (!card || card.currentHp <= 0) return null
      return { type: 'APPLY_STATUS', targetUid: card.uid, status: { type: 'immune', turnsLeft: 2 }, source: card.name, message: `🛡️ ${card.name} 缩成小桶，隐生！2 回合内免疫一切伤害` }
    },
  },
  'Rehydration Recovery': { timing: 'onTurnEnd', execute: (ctx) => T.passiveHeal(ctx, { scope: 'self', amount: 1000 }) },

  // ===========================================
  // Phase 2 第三批（OCEAN 深海奇兵·共生 / MICRO 单细胞·细胞零件）
  // ===========================================

  // 寄居蟹·借壳安家 — 出场给自己加护盾（借来的硬壳，复用 Glass Armor 内联模式）
  'Shell Swap': {
    timing: 'onPlay',
    execute: (ctx) => {
      const card = ctx.card
      if (!card || card.currentHp <= 0) return null
      return { type: 'APPLY_SHIELD', targetUid: card.uid, source: card.name, target: card.name, amount: 2000, message: `🐚 ${card.name} 借壳换甲！硬壳挡下 2000 伤害！` }
    },
  },

  // 清洁虾·海底诊所 — 清洁站(回合末最虚弱友方回血) + 信任休战(解除全队负面状态)
  'Cleaning Station': { timing: 'onTurnEnd', execute: (ctx) => T.passiveHeal(ctx, { scope: 'one_lowest_hp', amount: 1000 }) },
  'Trusted Truce': { timing: 'onPlay', execute: (ctx) => T.cleanse(ctx, { status_filter: 'all_negative' }) },

  // 大王乌贼·深渊巨怪 — 十腕缠击(攻击使敌麻痹) + 巨眼夜视(打残血敌额外伤害)
  'Ten-Arm Grapple': { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'paralyze', duration: 1 }) },
  'Abyssal Eyesight': { timing: 'onAttack', execute: (ctx) => T.conditionalAtk(ctx, { condition: 'vs_low_hp', hp_threshold: 0.5, amount: 2000 }) },

  // 座头鲸·泡泡网猎手 — 泡泡网(出场全体敌方 AOE) + 鲸歌共鸣(回合末全自然系回血)
  'Bubble-Net Feeding': { timing: 'onPlay', execute: (ctx) => T.onPlayDamage(ctx, { target: 'all_enemy', amount: 2000 }) },
  'Whale Song': { timing: 'onTurnEnd', execute: (ctx) => T.passiveHeal(ctx, { scope: 'faction', faction_filter: 'nature', amount: 500 }) },

  // 蓝环章鱼·剧毒警戒 — 致命一咬(攻击使敌中毒) + 蓝环警戒(被攻击反击)
  'Venom Bite': { timing: 'onAttack', execute: (ctx) => T.onAttackDebuff(ctx, { effect: 'poison', amount: 1000, duration: 2 }) },
  'Warning Rings': { timing: 'onHit', execute: (ctx) => T.onHitCounter(ctx, { effect: 'counter_damage', amount: 1000 }) },

  // 古菌·极端分子 — 极端生存(回合末自愈) + 产甲烷(出场 +1 能量)
  'Extremophile': { timing: 'onTurnEnd', execute: (ctx) => T.passiveHeal(ctx, { scope: 'self', amount: 500 }) },
  'Methanogenesis': { timing: 'onPlay', execute: (ctx) => T.passiveEnergy(ctx, { amount: 1 }) },

  // 核糖体·蛋白质打印机 — 蛋白质打印(回合末最虚弱友方回血) + 翻译加速(出场给最高ATK友方永久+1000)
  'Protein Synthesis': { timing: 'onTurnEnd', execute: (ctx) => T.passiveHeal(ctx, { scope: 'one_lowest_hp', amount: 1000 }) },
  'Translation Boost': {
    timing: 'onPlay',
    execute: (ctx) => {
      const card = ctx.card
      if (!card || card.currentHp <= 0) return null
      const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
      if (allies.length === 0) return null
      const target = allies.reduce((best, c) => (c.atk > best.atk ? c : best), allies[0])
      return { type: 'BUFF', targetUid: target.uid, stat: 'atk', amount: 1000, source: card.name, message: `🧬 ${card.name} 翻译加速！${target.name} ATK 永久 +1000！` }
    },
  },

  // 酵母·发酵小帮手 — 发酵产能(回合开始 +1 能量；ENERGY_BOOST 只在 onTurnStart/onPlay 被分派)
  'Fermentation': { timing: 'onTurnStart', execute: (ctx) => T.passiveEnergy(ctx, { amount: 1 }) },
}

// Sprint 24: Gene Rewrite 复用 Gene Edit（延迟绑定避免引用顺序问题）
if (skillRegistry['Gene Edit']?.execute) {
  skillRegistry['Gene Rewrite'].execute = skillRegistry['Gene Edit'].execute
}
