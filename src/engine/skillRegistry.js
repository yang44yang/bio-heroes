/**
 * 技能效果注册表
 * Bio Heroes 生物英雄传 — Sprint 3
 *
 * key = 技能的 nameEn（唯一标识）
 * value = { timing, execute(context) }
 *
 * execute 返回事件对象（或数组），由 useBattle 的 applySkillEvents 执行实际状态变更
 * 事件类型：HEAL, BUFF, APPLY_SHIELD, AOE_DAMAGE, OVERFLOW_DAMAGE, PIERCING_DAMAGE, RUSH_BOOST
 */

export const skillRegistry = {

  // ===========================================
  // 被动技能（不走触发框架）
  // ===========================================

  'Guard': { timing: 'passive' },
  'Swift Attack': { timing: 'passive' },

  // ===========================================
  // 通用技能
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
  // 专属技能 — 第一批实装
  // ===========================================

  'Phagocytosis': {
    // 白细胞·吞噬攻击：击杀病原系卡牌时 ATK 永久 +500
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
    // 红细胞·氧气输送：出场时为己方HP最低的友方卡回复 1000 HP
    timing: 'onPlay',
    execute: (ctx) => {
      const allies = (ctx.friendlyField || [])
        .filter(c => c && c.currentHp > 0 && c.uid !== ctx.card.uid)
      if (allies.length === 0) return null

      // 优先给受伤的，按 HP 比例排序
      const injured = allies
        .filter(c => c.currentHp < c.maxHp)
        .sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))
      const target = injured.length > 0 ? injured[0] : allies[0]

      const heal = Math.min(1000, target.maxHp - target.currentHp)
      if (heal <= 0) return null

      return {
        type: 'HEAL',
        targetUid: target.uid,
        source: ctx.card.name,
        target: target.name,
        amount: heal,
        message: `💉 ${ctx.card.name} 为 ${target.name} 输送氧气，回复 ${heal} HP`,
      }
    },
  },

  'Clotting Shield': {
    // 血小板·凝血屏障：出场时给己方ATK最高的卡添加 1500 护盾
    timing: 'onPlay',
    execute: (ctx) => {
      const allies = (ctx.friendlyField || [])
        .filter(c => c && c.currentHp > 0 && c.uid !== ctx.card.uid)
      if (allies.length === 0) return null

      const target = allies.sort((a, b) => b.atk - a.atk)[0]
      return {
        type: 'APPLY_SHIELD',
        targetUid: target.uid,
        source: ctx.card.name,
        target: target.name,
        amount: 1500,
        message: `🛡️ ${ctx.card.name} 为 ${target.name} 添加 1500 护盾`,
      }
    },
  },

  'Heartbeat Pulse': {
    // 心脏·心跳脉冲：每回合为所有友方卡回复 1000 HP
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
    // 电鳗·放电打击：攻击后对被攻击卡相邻的一张敌方卡造成 1000 伤害
    timing: 'onAttack',
    execute: (ctx) => {
      if (ctx.target === 'leader') return null // 直攻主人不触发

      const defSlot = ctx.defSlot
      if (defSlot === undefined) return null

      const enemyField = ctx.enemyField || []
      const adjacentSlots = [defSlot - 1, defSlot + 1]
        .filter(i => i >= 0 && i < enemyField.length)

      const targets = adjacentSlots
        .map(i => ({ slot: i, card: enemyField[i] }))
        .filter(t => t.card && t.card.currentHp > 0)

      if (targets.length === 0) return null

      const t = targets[0] // 打一张相邻卡
      return {
        type: 'AOE_DAMAGE',
        source: ctx.card.name,
        targetSlot: t.slot,
        targetName: t.card.name,
        targetUid: t.card.uid,
        damage: 1000,
        message: `⚡ ${ctx.card.name} 放电！对 ${t.card.name} 造成 1000 伤害！`,
      }
    },
  },

  // ===========================================
  // 专属技能 — 第二批实装
  // ===========================================

  'Tentacle Venom': {
    // 水母·触手毒刺：攻击时给目标添加 poison 状态，每回合 500 伤害，持续2回合
    timing: 'onAttack',
    execute: (ctx) => {
      if (ctx.target === 'leader') return null // 直攻主人不触发
      const defender = ctx.defender
      if (!defender || defender.currentHp <= 0) return null
      return {
        type: 'APPLY_POISON',
        targetUid: defender.uid,
        source: ctx.card.name,
        targetName: defender.name,
        damage: 500,
        turnsLeft: 2,
        message: `🟢 ${ctx.card.name} 释放触手毒刺！${defender.name} 中毒了！（500伤害/回合，持续2回合）`,
      }
    },
  },

  'General Anesthesia': {
    // 麻醉剂·全身麻醉：出场时给对方ATK最高的卡添加 sleep 状态，持续2回合
    timing: 'onPlay',
    execute: (ctx) => {
      const enemies = (ctx.enemyField || [])
        .filter(c => c && c.currentHp > 0)
      if (enemies.length === 0) return null

      // 优先选ATK最高的
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
    // 噬菌体·注入劫持：击杀对方卡牌后召唤一张噬菌体副本到己方场上
    timing: 'onKill',
    execute: (ctx) => {
      const friendlyField = ctx.friendlyField || []
      const emptySlots = []
      for (let i = 0; i < 3; i++) {
        if (!friendlyField[i] || friendlyField[i].currentHp <= 0) {
          emptySlots.push(i)
        }
      }
      if (emptySlots.length === 0) return null // 场满

      const slot = emptySlots[0]
      const copy = {
        id: 'phage_copy_' + Date.now(),
        uid: 'phage_copy_' + Date.now() + '_' + Math.random(),
        name: '噬菌体副本',
        nameEn: 'Phage Copy',
        atk: 1000,
        hp: 1000,
        currentHp: 1000,
        maxHp: 1000,
        cost: 0,
        faction: 'pathogen',
        rarity: 'R',
        skills: [],
        statuses: [],
        summonSick: true,
      }

      return {
        type: 'SUMMON_CARD',
        side: 'friendly',
        slot,
        card: copy,
        source: ctx.card?.name || ctx.attacker?.name,
        message: `🧬 ${ctx.card?.name || ctx.attacker?.name} 注入劫持成功！召唤噬菌体副本！`,
      }
    },
  },

  'Marrow Hematopoiesis': {
    // 骨骼·骨髓造血：回合结束时随机召唤一张1费人体系卡
    timing: 'onTurnEnd',
    execute: (ctx) => {
      const friendlyField = ctx.friendlyField || []
      const emptySlots = []
      for (let i = 0; i < 3; i++) {
        if (!friendlyField[i] || friendlyField[i].currentHp <= 0) {
          emptySlots.push(i)
        }
      }
      if (emptySlots.length === 0) return null // 场满

      // 从 cards.js 中筛选 cost===1 && faction==='body' 的卡
      // 在运行时动态 import 会有问题，直接硬编码候选列表
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
        currentHp: template.hp,
        maxHp: template.hp,
        statuses: [],
        summonSick: true,
      }

      return {
        type: 'SUMMON_CARD',
        side: 'friendly',
        slot,
        card,
        source: ctx.card.name,
        message: `🦴 ${ctx.card.name} 骨髓造血！召唤 ${card.name}！`,
      }
    },
  },

  // ===========================================
  // 专属技能 — 占位（后续批量接入）
  // ===========================================

  'Pheromone Rally':    { timing: 'onPlay',   execute: null },  // 蚂蚁·信息素召集
  'Leaf Fold':          { timing: 'onHit',    execute: null },  // 含羞草·叶片闭合
  'Core of Life':       { timing: 'onDeath',  execute: null },  // 心脏·生命核心
}
