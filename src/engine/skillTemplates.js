/**
 * 技能模板系统 — Sprint 23
 * 15 个参数化模板覆盖 ~100 个技能
 *
 * 每个模板是一个纯函数 (ctx, params) => event | event[] | null
 * 返回值类型与 skillRegistry handler.execute 一致
 */

// ============================================================
// Helper: 查找场上的卡
// ============================================================

function aliveAllies(ctx) {
  return (ctx.friendlyField || []).filter(c => c && c.currentHp > 0 && c.uid !== ctx.card?.uid)
}
function aliveEnemies(ctx) {
  return (ctx.enemyField || []).filter(c => c && c.currentHp > 0)
}
function findEmptySlot(field, maxSlots = 7) {
  for (let i = 0; i < Math.min(field.length, maxSlots); i++) {
    if (!field[i] || field[i].currentHp <= 0) return i
  }
  return -1
}

// ============================================================
// 模板 1: onPlayDamage — 出场时对敌方造成伤害
// timing: 'onPlay'  |  Phase 1
// ============================================================

export function onPlayDamage(ctx, params) {
  const enemies = aliveEnemies(ctx)
  const cardName = ctx.card?.name || '???'
  const events = []

  // 选定目标
  let targets = []
  switch (params.target) {
    case 'all_enemy':
      targets = enemies.map((c, i) => {
        const realIdx = (ctx.enemyField || []).findIndex(cc => cc && cc.uid === c.uid)
        return { card: c, slot: realIdx >= 0 ? realIdx : i }
      })
      break
    case 'one_lowest_hp':
      if (enemies.length > 0) {
        const t = enemies.sort((a, b) => a.currentHp - b.currentHp)[0]
        const slot = (ctx.enemyField || []).findIndex(c => c && c.uid === t.uid)
        targets = [{ card: t, slot }]
      }
      break
    case 'one_random':
      if (enemies.length > 0) {
        const t = enemies[Math.floor(Math.random() * enemies.length)]
        const slot = (ctx.enemyField || []).findIndex(c => c && c.uid === t.uid)
        targets = [{ card: t, slot }]
      }
      break
    case 'one_faction':
      if (params.faction_filter) {
        const filtered = enemies.filter(c => c.faction === params.faction_filter)
        if (filtered.length > 0) {
          const t = filtered[Math.floor(Math.random() * filtered.length)]
          const slot = (ctx.enemyField || []).findIndex(c => c && c.uid === t.uid)
          targets = [{ card: t, slot }]
        }
      }
      break
    case 'leader':
      // 直接伤害主人（不走卡伤害）
      break
  }

  // 对卡牌造成伤害
  if (params.amount > 0 && params.target !== 'leader') {
    for (const t of targets) {
      events.push({
        type: 'AOE_DAMAGE',
        source: cardName,
        targetSlot: t.slot,
        targetName: t.card.name,
        targetUid: t.card.uid,
        damage: params.amount,
        message: `💥 ${cardName} 对 ${t.card.name} 造成 ${params.amount} 伤害！`,
      })
    }
  }

  // 主人伤害
  if (params.target === 'leader' && params.amount > 0) {
    events.push({
      type: 'OVERFLOW_DAMAGE',
      source: cardName,
      target: 'enemyLeader',
      damage: params.amount,
      message: `💥 ${cardName} 对敌方主人造成 ${params.amount} 伤害！`,
    })
  }

  // bonus 效果 (debuff ATK)
  if (params.bonus?.type === 'debuff_atk') {
    const debuffTargets = params.bonus.scope === 'all_enemy' ? enemies : targets.map(t => t.card)
    for (const t of debuffTargets) {
      events.push({
        type: 'BUFF',
        targetUid: t.uid,
        stat: 'atk',
        amount: -params.bonus.amount,
        turns: params.bonus.duration || 1,
        source: cardName,
        message: `⬇️ ${t.name} ATK -${params.bonus.amount}！`,
        _side: 'enemy',
      })
    }
  }

  return events.length > 0 ? events : null
}

// ============================================================
// 模板 2: onPlayHeal — 出场时回血/加盾
// timing: 'onPlay'  |  Phase 1
// ============================================================

export function onPlayHeal(ctx, params) {
  const allies = aliveAllies(ctx)
  const cardName = ctx.card?.name || '???'
  if (allies.length === 0) return null

  // 选定目标
  let target
  switch (params.target) {
    case 'one_lowest_hp': {
      const injured = allies.filter(c => c.currentHp < c.maxHp).sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))
      target = injured.length > 0 ? injured[0] : allies[0]
      break
    }
    case 'one_highest_atk':
      target = [...allies].sort((a, b) => b.atk - a.atk)[0]
      break
    case 'one_faction':
      if (params.faction_filter) {
        const filtered = allies.filter(c => c.faction === params.faction_filter)
        target = filtered.length > 0 ? filtered.sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0] : null
      }
      break
    default:
      target = allies[0]
  }
  if (!target) return null

  const events = []

  if (params.effect === 'heal' || params.effect === 'heal_and_guard') {
    const heal = Math.min(params.amount, target.maxHp - target.currentHp)
    if (heal > 0) {
      events.push({
        type: 'HEAL',
        targetUid: target.uid,
        source: cardName,
        target: target.name,
        amount: heal,
        message: `💚 ${cardName} 为 ${target.name} 回复 ${heal} HP`,
      })
    }
  }

  if (params.effect === 'shield') {
    events.push({
      type: 'APPLY_SHIELD',
      targetUid: target.uid,
      source: cardName,
      target: target.name,
      amount: params.amount,
      message: `🛡️ ${cardName} 为 ${target.name} 添加 ${params.amount} 护盾`,
    })
  }

  // bonus: guard 1 turn — 使用 APPLY_SHIELD 作为简化方案
  if (params.bonus?.type === 'guard') {
    events.push({
      type: 'APPLY_SHIELD',
      targetUid: target.uid,
      source: cardName,
      target: target.name,
      amount: 500, // 小额护盾表示"守护效果"
      message: `🛡️ ${cardName} 为 ${target.name} 提供临时守护`,
    })
  }

  return events.length > 0 ? events : null
}

// ============================================================
// 模板 6: conditionalAtk — 攻击时满足条件加攻
// timing: 'onAttack'  |  Phase 1
// ============================================================

export function conditionalAtk(ctx, params) {
  if (ctx.target === 'leader' && params.condition !== 'per_ally') return null
  const attacker = ctx.attacker || ctx.card
  const defender = ctx.defender
  if (!attacker) return null

  let triggered = false
  let bonusDmg = 0
  let msg = ''

  switch (params.condition) {
    case 'vs_faction':
      if (defender?.faction === params.faction_filter) {
        triggered = true
        if (params.is_multiplier) {
          bonusDmg = Math.floor(attacker.atk * (params.amount - 1))
          msg = `⚔️ ${attacker.name} 克制 ${defender.name}！伤害 ×${params.amount}！`
        } else {
          bonusDmg = params.amount
          msg = `⚔️ ${attacker.name} 对 ${defender.name} 额外 +${params.amount} 伤害！`
        }
      }
      break
    case 'vs_low_hp':
      if (defender && (defender.currentHp / defender.maxHp) < (params.hp_threshold || 0.5)) {
        triggered = true
        bonusDmg = params.amount
        msg = `⚔️ ${attacker.name} 猎杀低血量目标！+${params.amount} 伤害！`
      }
      break
    case 'per_ally': {
      const allies = (ctx.friendlyField || []).filter(c =>
        c && c.currentHp > 0 && c.uid !== attacker.uid &&
        (!params.ally_faction || c.faction === params.ally_faction)
      )
      if (allies.length > 0) {
        triggered = true
        bonusDmg = params.amount * allies.length
        msg = `⚔️ ${attacker.name} 协同攻击！${allies.length} 个友方 +${bonusDmg} 伤害！`
      }
      break
    }
    case 'vs_highest_hp': {
      // Sprint 26: 攻击 HP 最高的目标时加伤（大王乌贼 Abyssal Eye）
      const enemies = (ctx.enemyField || []).filter(c => c && c.currentHp > 0)
      if (enemies.length > 0 && defender) {
        const highest = [...enemies].sort((a, b) => b.currentHp - a.currentHp)[0]
        if (highest && defender.uid === highest.uid) {
          triggered = true
          if (params.is_multiplier) {
            msg = `👁️ ${attacker.name} 深海巨眼锁定 ${defender.name}！伤害 ×${params.amount}！`
          } else {
            bonusDmg = params.amount
            msg = `👁️ ${attacker.name} 锁定最大猎物！+${params.amount} 伤害！`
          }
        }
      }
      break
    }
  }

  if (!triggered) return null

  // 通过修改 ctx.damageMultiplier 或返回 BUFF 实现加伤
  // 使用 RUSH_BOOST 风格：直接改 ctx 上的 damageMultiplier
  if (params.is_multiplier) {
    ctx.damageMultiplier = (ctx.damageMultiplier || 1) * params.amount
    return { type: 'RUSH_BOOST', source: attacker.name, message: msg }
  } else {
    // 固定加伤：临时加 ATK（攻击前加，攻击后会用原始值计算……）
    // 用 RUSH_BOOST 风格 + 修改 damageMultiplier 来近似
    const ratio = (attacker.atk + bonusDmg) / attacker.atk
    ctx.damageMultiplier = (ctx.damageMultiplier || 1) * ratio
    return { type: 'RUSH_BOOST', source: attacker.name, message: msg }
  }
}

// ============================================================
// 模板 7: onAttackDebuff — 攻击后对目标施加负面效果
// timing: 'onAttack'  |  Phase 1
// ============================================================

export function onAttackDebuff(ctx, params) {
  if (ctx.target === 'leader') return null
  const defender = ctx.defender
  const attacker = ctx.attacker || ctx.card
  if (!defender || defender.currentHp <= 0) return null
  if (!attacker) return null

  const events = []

  switch (params.effect) {
    case 'poison':
      events.push({
        type: 'APPLY_POISON',
        targetUid: defender.uid,
        source: attacker.name,
        targetName: defender.name,
        damage: params.amount,
        turnsLeft: params.duration || 2,
        message: `🟢 ${attacker.name} 使 ${defender.name} 中毒！（${params.amount}/回合，${params.duration || 2}回合）`,
      })
      // 自伤
      if (params.self_damage) {
        events.push({
          type: 'AOE_DAMAGE',
          source: attacker.name,
          targetSlot: (ctx.friendlyField || []).findIndex(c => c && c.uid === attacker.uid),
          targetName: attacker.name,
          targetUid: attacker.uid,
          damage: params.self_damage,
          _side: 'friendly',
          message: `💔 ${attacker.name} 自身受到 ${params.self_damage} 反噬！`,
        })
      }
      break
    case 'debuff_atk':
      events.push({
        type: 'BUFF',
        targetUid: defender.uid,
        stat: 'atk',
        amount: -(params.amount || 500),
        turns: params.duration || 1,
        source: attacker.name,
        _side: 'enemy',
        message: `⬇️ ${attacker.name} 使 ${defender.name} ATK -${params.amount || 500}！`,
      })
      break
    case 'debuff_both':
      events.push({
        type: 'BUFF',
        targetUid: defender.uid,
        stat: 'atk',
        amount: -(params.amount || 1000),
        turns: params.duration || 1,
        source: attacker.name,
        _side: 'enemy',
        message: `⬇️ ${attacker.name} 使 ${defender.name} ATK/HP -${params.amount || 1000}！`,
      })
      // HP debuff via AOE_DAMAGE
      events.push({
        type: 'AOE_DAMAGE',
        source: attacker.name,
        targetSlot: (ctx.enemyField || []).findIndex(c => c && c.uid === defender.uid),
        targetName: defender.name,
        targetUid: defender.uid,
        damage: params.amount || 1000,
        message: '',
      })
      break
    case 'paralyze':
      events.push({
        type: 'APPLY_SLEEP',
        targetUid: defender.uid,
        source: attacker.name,
        targetName: defender.name,
        turnsLeft: params.duration || 1,
        message: `😵 ${attacker.name} 麻痹了 ${defender.name}！（${params.duration || 1}回合不能行动）`,
      })
      break
    case 'permanent_debuff':
      events.push({
        type: 'BUFF',
        targetUid: defender.uid,
        stat: params.stat || 'atk',
        amount: -(params.amount || 500),
        source: attacker.name,
        _side: 'enemy',
        message: `⬇️ ${attacker.name} 永久降低 ${defender.name} ${(params.stat || 'ATK').toUpperCase()} -${params.amount || 500}！`,
      })
      break
    case 'lifesteal': {
      const stolen = Math.floor((ctx.attacker?.atk || 0) * (params.amount || 0.3))
      if (stolen > 0) {
        const heal = Math.min(stolen, attacker.maxHp - attacker.currentHp)
        if (heal > 0) {
          events.push({
            type: 'HEAL',
            targetUid: attacker.uid,
            source: attacker.name,
            target: attacker.name,
            amount: heal,
            message: `🧛 ${attacker.name} 吸取 ${heal} 生命！`,
          })
        }
      }
      break
    }
    case 'leader_damage':
      events.push({
        type: 'OVERFLOW_DAMAGE',
        source: attacker.name,
        target: 'enemyLeader',
        damage: params.amount || 1000,
        message: `💥 ${attacker.name} 额外对敌方主人造成 ${params.amount || 1000} 伤害！`,
      })
      break
  }

  return events.length > 0 ? events : null
}

// ============================================================
// 模板 8: splash — 攻击时/击杀后溅射相邻目标
// timing: 'onAttack' or 'onKill'  |  Phase 1
// ============================================================

export function splash(ctx, params) {
  if (ctx.target === 'leader') return null
  const defSlot = ctx.defSlot
  if (defSlot === undefined) return null

  const attacker = ctx.attacker || ctx.card
  const enemyField = ctx.enemyField || []
  const adjacentSlots = [defSlot - 1, defSlot + 1]
    .filter(i => i >= 0 && i < enemyField.length)

  const targets = adjacentSlots
    .map(i => ({ slot: i, card: enemyField[i] }))
    .filter(t => t.card && t.card.currentHp > 0)
    .slice(0, params.targets || 1)

  if (targets.length === 0) return null

  return targets.map(t => ({
    type: 'AOE_DAMAGE',
    source: attacker?.name || '???',
    targetSlot: t.slot,
    targetName: t.card.name,
    targetUid: t.card.uid,
    damage: params.amount,
    message: `⚡ ${attacker?.name} 溅射对 ${t.card.name} 造成 ${params.amount} 伤害！`,
  }))
}

// ============================================================
// 模板 9: onKillEffect — 击杀后触发效果
// timing: 'onKill'  |  Phase 1
// ============================================================

export function onKillEffect(ctx, params) {
  const attacker = ctx.attacker || ctx.card
  if (!attacker) return null

  // 阵营过滤
  if (params.vs_faction && ctx.defender?.faction !== params.vs_faction) return null

  switch (params.effect) {
    case 'buff_self':
      return {
        type: 'BUFF',
        targetUid: attacker.uid,
        stat: params.stat || 'atk',
        amount: params.amount,
        source: attacker.name,
        message: `💪 ${attacker.name} 击杀后 ${(params.stat || 'ATK').toUpperCase()} +${params.amount}！`,
      }
    case 'heal_self': {
      const healAmt = params.amount === 'full'
        ? (attacker.maxHp - attacker.currentHp)
        : Math.min(params.amount, attacker.maxHp - attacker.currentHp)
      if (healAmt <= 0) return null
      return {
        type: 'HEAL',
        targetUid: attacker.uid,
        source: attacker.name,
        target: attacker.name,
        amount: healAmt,
        message: `💚 ${attacker.name} 击杀后回复 ${healAmt} HP！`,
      }
    }
    case 'convert_killed': {
      if (params.chance && Math.random() > params.chance) return null
      const field = ctx.friendlyField || []
      const slot = findEmptySlot(field)
      if (slot < 0) return null
      const killed = ctx.defender
      if (!killed) return null
      const copy = {
        ...killed,
        uid: 'converted_' + Date.now() + '_' + Math.random(),
        atk: params.convert_atk || killed.atk,
        hp: params.convert_hp || killed.hp,
        currentHp: params.convert_hp || killed.hp,
        maxHp: params.convert_hp || killed.hp,
        statuses: [],
        summonSick: true,
      }
      return {
        type: 'SUMMON_CARD',
        side: 'friendly',
        slot,
        card: copy,
        source: attacker.name,
        message: `🧟 ${attacker.name} 控制了 ${killed.name}！`,
      }
    }
  }
  return null
}

// ============================================================
// 模板 10: onDeathEffect — 被击杀时触发
// timing: 'onDeath'  |  Phase 1
// ============================================================

export function onDeathEffect(ctx, params) {
  const card = ctx.card
  if (!card) return null
  const cardName = card.name

  switch (params.effect) {
    case 'heal_leader':
      return {
        type: 'HEAL',
        targetUid: '__leader__',
        source: cardName,
        target: 'leader',
        amount: params.amount || 500,
        _leaderHeal: true,
        message: `💚 ${cardName} 死亡时为主人回复 ${params.amount || 500} HP！`,
      }
    case 'damage_random_enemy': {
      const enemies = aliveEnemies(ctx)
      if (enemies.length === 0) return null
      const t = enemies[Math.floor(Math.random() * enemies.length)]
      const slot = (ctx.enemyField || []).findIndex(c => c && c.uid === t.uid)
      return {
        type: 'AOE_DAMAGE',
        source: cardName,
        targetSlot: slot,
        targetName: t.name,
        targetUid: t.uid,
        damage: params.amount || 500,
        message: `💀 ${cardName} 死亡时对 ${t.name} 造成 ${params.amount || 500} 伤害！`,
      }
    }
    case 'split': {
      const field = ctx.friendlyField || []
      const events = []
      for (let i = 0; i < (params.split_count || 2); i++) {
        const slot = findEmptySlot(field)
        if (slot < 0) break
        const clone = {
          id: card.id + '_split_' + i,
          uid: card.id + '_split_' + Date.now() + '_' + i + '_' + Math.random(),
          name: card.name + (i === 0 ? ' α' : ' β'),
          nameEn: (card.nameEn || card.name) + (i === 0 ? ' α' : ' β'),
          atk: params.split_atk || Math.floor(card.atk * 0.5),
          hp: params.split_hp || Math.floor(card.maxHp * 0.5),
          currentHp: params.split_hp || Math.floor(card.maxHp * 0.5),
          maxHp: params.split_hp || Math.floor(card.maxHp * 0.5),
          cost: card.cost,
          faction: card.faction,
          rarity: 'R',
          skills: [],
          statuses: [],
          summonSick: true,
        }
        // Mark slot as occupied for next iteration
        field[slot] = clone
        events.push({
          type: 'SUMMON_CARD',
          side: 'friendly',
          slot,
          card: clone,
          source: cardName,
          message: `🧬 ${cardName} 分裂出 ${clone.name}！`,
        })
      }
      return events.length > 0 ? events : null
    }
    case 'chance_revive': {
      if (params.chance && Math.random() > params.chance) return null
      const field = ctx.friendlyField || []
      const slot = findEmptySlot(field)
      if (slot < 0) return null
      const revived = {
        ...card,
        uid: card.uid + '_revived_' + Date.now(),
        atk: params.revive_atk || card.atk,
        hp: params.revive_hp || Math.floor(card.maxHp * 0.5),
        currentHp: params.revive_hp || Math.floor(card.maxHp * 0.5),
        maxHp: params.revive_hp || card.maxHp,
        statuses: [],
        summonSick: true,
      }
      return {
        type: 'SUMMON_CARD',
        side: 'friendly',
        slot,
        card: revived,
        source: cardName,
        message: `🔄 ${cardName} 死而复生！`,
      }
    }
    case 'debuff_allies': {
      const allies = (ctx.friendlyField || []).filter(c =>
        c && c.currentHp > 0 && c.uid !== card.uid &&
        (!params.faction_filter || c.faction === params.faction_filter)
      )
      if (allies.length === 0) return null
      return allies.map(a => ({
        type: 'BUFF',
        targetUid: a.uid,
        stat: 'atk',
        amount: -Math.floor(a.atk * (params.debuff_amount || 0.5)),
        source: cardName,
        message: `💔 ${cardName} 离场！${a.name} 受到削弱！`,
      }))
    }
    case 'revive_as': {
      // 从弃牌堆复活一张指定卡
      // 需要 discard pile 数据 — 简化为召唤一个模板卡
      const field = ctx.friendlyField || []
      const slot = findEmptySlot(field)
      if (slot < 0) return null
      const template = {
        id: 'revived_from_' + card.id,
        uid: 'revived_' + Date.now() + '_' + Math.random(),
        name: '复活战士',
        nameEn: 'Revived Fighter',
        atk: 1000,
        hp: 2000,
        currentHp: 2000,
        maxHp: 2000,
        cost: 1,
        faction: params.faction_filter || card.faction,
        rarity: params.rarity_filter || 'R',
        skills: [],
        statuses: [],
        summonSick: true,
      }
      return {
        type: 'SUMMON_CARD',
        side: 'friendly',
        slot,
        card: template,
        source: cardName,
        message: `🧬 ${cardName} 分化为 ${template.name}！`,
      }
    }
  }
  return null
}

// ============================================================
// 模板 11: onHitCounter — 被攻击时反击/减伤/闪避
// timing: 'onHit'  |  Phase 1
// ============================================================

export function onHitCounter(ctx, params) {
  const defender = ctx.defender || ctx.card
  if (!defender || defender.currentHp <= 0) return null
  const attacker = ctx.attacker

  switch (params.effect) {
    case 'reduce_damage': {
      // 减伤：修改 ctx 上的 damageReduction
      const reduction = params.is_ratio
        ? Math.floor((attacker?.atk || 0) * params.amount)
        : params.amount
      ctx.damageReduction = (ctx.damageReduction || 0) + reduction
      return {
        type: 'RUSH_BOOST',
        source: defender.name,
        message: `🛡️ ${defender.name} 减少了 ${reduction} 伤害！`,
      }
    }
    case 'counter_damage': {
      if (!attacker) return null
      const counterDmg = params.is_ratio
        ? Math.floor(attacker.atk * params.amount)
        : params.amount
      const atkSlot = (ctx.friendlyField || []).findIndex(c => c && c.uid === attacker.uid)
      // 反击伤害：注意 attacker 在 "enemy" 侧
      return {
        type: 'AOE_DAMAGE',
        source: defender.name,
        targetSlot: atkSlot >= 0 ? atkSlot : 0,
        targetName: attacker.name,
        targetUid: attacker.uid,
        damage: counterDmg,
        _side: 'attacker_side',
        message: `🔄 ${defender.name} 反击！对 ${attacker.name} 造成 ${counterDmg} 伤害！`,
      }
    }
    case 'dodge': {
      if (Math.random() < (params.chance || 0.3)) {
        ctx.dodged = true
        return {
          type: 'RUSH_BOOST',
          source: defender.name,
          message: `💨 ${defender.name} 闪避了攻击！`,
        }
      }
      return null
    }
  }
  return null
}

// ============================================================
// Phase 1 passiveAura 简单部分
// ============================================================

// ============================================================
// 模板 3: onPlayReveal — 出场时揭示对方手牌
// timing: 'onPlay'  |  Phase 2
// ============================================================

export function onPlayReveal(ctx, params) {
  const cardName = ctx.card?.name || '???'
  const enemyHand = ctx.enemyHand || []
  if (enemyHand.length === 0) return null

  // 选定要揭示的卡 — Sprint 27: 传完整卡信息（name/nameEn/cost/faction/rarity）而非只字符串
  const asRevealObj = c => ({
    name: c.name,
    nameEn: c.nameEn,
    cost: c.cost,
    faction: c.faction,
    rarity: c.rarity,
  })
  let revealed = []
  if (params.count === 'all') {
    revealed = enemyHand.map(asRevealObj)
  } else {
    const n = params.count || 1
    if (params.filter === 'highest_cost') {
      revealed = [...enemyHand].sort((a, b) => (b.cost || 0) - (a.cost || 0)).slice(0, n).map(asRevealObj)
    } else {
      const shuffled = [...enemyHand].sort(() => Math.random() - 0.5)
      revealed = shuffled.slice(0, n).map(asRevealObj)
    }
  }

  const events = [{
    type: 'REVEAL_HAND',
    source: cardName,
    cards: revealed,
    message: `🔍 ${cardName} 揭示了敌方手牌：${revealed.map(c => c.name).join('、')}`,
  }]

  // bonus 效果
  if (params.bonus) {
    const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
    if (params.bonus.type === 'atk_boost' && allies.length > 0) {
      for (const a of allies) {
        const boost = Math.floor(a.atk * (params.bonus.amount || 0.2))
        events.push({
          type: 'BUFF', targetUid: a.uid, stat: 'atk', amount: boost, source: cardName,
          message: `⬆️ ${a.name} ATK +${boost}！`,
        })
      }
    }
  }

  return events
}

// ============================================================
// 模板 4: onPlayMark — 出场时标记敌方卡
// timing: 'onPlay'  |  Phase 2
// ============================================================

export function onPlayMark(ctx, params) {
  const enemies = aliveEnemies(ctx)
  const cardName = ctx.card?.name || '???'
  if (enemies.length === 0) return null

  // 选 ATK 最高的敌方卡
  const target = [...enemies].sort((a, b) => b.atk - a.atk)[0]

  return {
    type: 'APPLY_MARK',
    targetUid: target.uid,
    source: cardName,
    targetName: target.name,
    bonus_damage: params.bonus_damage,
    bonus_from: params.bonus_from,
    faction_filter: params.faction_filter,
    message: `🎯 ${cardName} 标记了 ${target.name}！后续攻击加伤！`,
  }
}

// ============================================================
// 模板 12: cleanse — 清除负面状态
// timing: 'onPlay' or 'onTurnStart'  |  Phase 2
// ============================================================

export function cleanse(ctx, params) {
  const cardName = ctx.card?.name || '???'
  const allies = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
  if (allies.length === 0) return null

  const events = []
  const { removeNegativeStatuses } = ctx._statusUtils || {}

  // 选定目标
  let targets = []
  if (params.scope === 'one_ally') {
    // 选负面状态最多的友方
    const withNeg = allies.filter(c => c.statuses?.some(s => ['poison', 'sleep', 'deep_pressure'].includes(s.type)))
    targets = withNeg.length > 0 ? [withNeg[0]] : [allies[0]]
  } else {
    targets = allies
  }

  for (const t of targets) {
    if (!t.statuses || t.statuses.length === 0) continue
    // 使用 engine 提供的清除函数，或 fallback 手动清除
    const negTypes = ['poison', 'sleep', 'deep_pressure']
    let removed = []
    if (params.status_filter === 'poison') {
      const before = t.statuses.length
      t.statuses = t.statuses.filter(s => { if (s.type === 'poison') { removed.push('poison'); return false } return true })
    } else if (params.status_filter === 'all_negative') {
      t.statuses = t.statuses.filter(s => { if (negTypes.includes(s.type)) { removed.push(s.type); return false } return true })
    } else if (params.status_filter === 'one_random') {
      const negs = t.statuses.filter(s => negTypes.includes(s.type))
      if (negs.length > 0) {
        const pick = negs[Math.floor(Math.random() * negs.length)]
        const idx = t.statuses.indexOf(pick)
        if (idx >= 0) { t.statuses.splice(idx, 1); removed.push(pick.type) }
      }
    }
    if (removed.length > 0) {
      events.push({
        type: 'RUSH_BOOST', source: cardName,
        message: `✨ ${cardName} 清除了 ${t.name} 的 ${removed.join('+')} 状态！`,
      })
    }
  }

  // bonus heal
  if (params.bonus_heal) {
    if (params.bonus_heal_target === 'leader') {
      events.push({
        type: 'HEAL', targetUid: '__leader__', source: cardName, target: 'leader',
        amount: params.bonus_heal, _leaderHeal: true,
        message: `💚 ${cardName} 为主人回复 ${params.bonus_heal} HP`,
      })
    } else if (targets.length > 0) {
      const t = targets[0]
      const heal = Math.min(params.bonus_heal, t.maxHp - t.currentHp)
      if (heal > 0) {
        events.push({
          type: 'HEAL', targetUid: t.uid, source: cardName, target: t.name,
          amount: heal, message: `💚 ${cardName} 为 ${t.name} 回复 ${heal} HP`,
        })
      }
    }
  }

  return events.length > 0 ? events : null
}

// ============================================================
// 模板 13: reviveFromDiscard — 从弃牌堆取回卡
// timing: 'onPlay'  |  Phase 2
// ============================================================

export function reviveFromDiscard(ctx, params) {
  const cardName = ctx.card?.name || '???'
  const discard = ctx.discardPile || []
  if (discard.length === 0) return null

  // 按条件过滤弃牌堆
  let candidates = discard
  if (params.faction_filter) candidates = candidates.filter(c => c.faction === params.faction_filter)
  if (params.cost_max) candidates = candidates.filter(c => (c.cost || 0) <= params.cost_max)
  if (candidates.length === 0) return null

  // 选最强的（ATK 最高）
  const picked = [...candidates].sort((a, b) => b.atk - a.atk)[0]

  if (params.mode === 'to_hand') {
    return {
      type: 'RUSH_BOOST', source: cardName,
      _reviveToHand: picked,
      message: `🔄 ${cardName} 从弃牌堆取回 ${picked.name} 到手牌！`,
    }
  }

  // to_field
  const field = ctx.friendlyField || []
  const slot = findEmptySlot(field)
  if (slot < 0) return null

  const hpPercent = params.hp_percent || 0.5
  const revived = {
    ...picked,
    uid: picked.id + '_revived_' + Date.now() + '_' + Math.random(),
    currentHp: Math.floor(picked.maxHp * hpPercent),
    maxHp: picked.maxHp,
    statuses: [],
    summonSick: true,
  }

  return {
    type: 'SUMMON_CARD', side: 'friendly', slot, card: revived, source: cardName,
    message: `🔄 ${cardName} 从弃牌堆复活 ${picked.name}！（${Math.floor(hpPercent * 100)}% HP）`,
  }
}

// ============================================================
// 模板 14: onPlaySummon — 出场时从手牌召唤
// timing: 'onPlay'  |  Phase 2
// ============================================================

export function onPlaySummon(ctx, params) {
  const cardName = ctx.card?.name || '???'
  const hand = ctx.playerHand || []
  if (hand.length === 0) return null

  if (params.condition === 'hand_has_same') {
    const match = hand.find(c => c.id?.startsWith(params.card_filter || ''))
    if (!match) return null

    const field = ctx.friendlyField || []
    const slot = findEmptySlot(field)
    if (slot < 0) return null

    const summoned = {
      ...match,
      uid: match.id + '_summoned_' + Date.now() + '_' + Math.random(),
      currentHp: match.hp || match.maxHp,
      maxHp: match.hp || match.maxHp,
      statuses: [],
      summonSick: true,
    }

    return [{
      type: 'SUMMON_CARD', side: 'friendly', slot, card: summoned, source: cardName,
      _removeFromHand: match.uid,
      message: `📣 ${cardName} 信息素召集！${match.name} 从手牌直接上场！`,
    }]
  }
  return null
}

// ============================================================
// Phase 1+2 passiveAura 部分
// ============================================================

/**
 * passiveHeal — 每回合为友方卡/主人回血
 * timing: 'onTurnEnd'
 * scope: leader | faction | self | one_lowest_hp | all_friendly（默认）
 */
export function passiveHeal(ctx, params) {
  const card = ctx.card
  if (!card || card.currentHp <= 0) return null
  const cardName = card.name

  if (params.scope === 'leader') {
    return {
      type: 'HEAL',
      targetUid: '__leader__',
      source: cardName,
      target: 'leader',
      amount: params.amount,
      _leaderHeal: true,
      message: `💚 ${cardName} 为主人回复 ${params.amount} HP`,
    }
  }

  let targets
  if (params.scope === 'faction') {
    targets = (ctx.friendlyField || []).filter(c =>
      c && c.currentHp > 0 && c.faction === params.faction_filter
    )
  } else if (params.scope === 'self') {
    targets = [card]
  } else if (params.scope === 'one_lowest_hp') {
    const pool = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
    if (pool.length === 0) return null
    const t = [...pool].sort((a, b) => (a.currentHp / a.maxHp) - (b.currentHp / b.maxHp))[0]
    targets = [t]
  } else {
    // all_friendly（默认）
    targets = (ctx.friendlyField || []).filter(c => c && c.currentHp > 0)
  }

  const events = []
  for (const t of targets) {
    const heal = Math.min(params.amount, t.maxHp - t.currentHp)
    if (heal > 0) {
      events.push({
        type: 'HEAL',
        targetUid: t.uid,
        source: cardName,
        target: t.name,
        amount: heal,
        message: `💚 ${cardName} 为 ${t.name} 回复 ${heal} HP`,
      })
    }
  }
  return events.length > 0 ? events : null
}

/**
 * passiveAOEDamage — 每回合对全场敌方造成伤害
 * timing: 'onTurnEnd'
 */
export function passiveAOEDamage(ctx, params) {
  const card = ctx.card
  if (!card || card.currentHp <= 0) return null
  const enemies = aliveEnemies(ctx)
  if (enemies.length === 0) return null

  return enemies.map(e => {
    const slot = (ctx.enemyField || []).findIndex(c => c && c.uid === e.uid)
    return {
      type: 'AOE_DAMAGE',
      source: card.name,
      targetSlot: slot,
      targetName: e.name,
      targetUid: e.uid,
      damage: params.amount || 1000,
      message: `☣️ ${card.name} 瘟疫蔓延！${e.name} 损失 ${params.amount || 1000} HP`,
    }
  })
}

/**
 * passiveAura — 通用 aura dispatcher（Sprint 24）
 * 按 params.effect 分派到具体实现
 */
export function passiveAura(ctx, params) {
  switch (params.effect) {
    case 'heal':       return passiveHeal(ctx, params)
    case 'aoe_damage': return passiveAOEDamage(ctx, params)
    case 'draw':       return passiveDraw(ctx, params)
    case 'energy':     return passiveEnergy(ctx, params)
    case 'summon':     return passiveSummon(ctx, params)
    default: return null
  }
}

/**
 * passiveEnergy — 每回合开始时加能量
 * timing: 'onTurnStart'
 * NOTE: 需要 useBattle 支持 ENERGY_BOOST event type
 * 暂时用日志提示代替（实际能量增加需要 Phase 2 引擎扩展）
 */
export function passiveEnergy(ctx, params) {
  const card = ctx.card
  if (!card || card.currentHp <= 0) return null
  return {
    type: 'ENERGY_BOOST',
    source: card.name,
    amount: params.amount || 1,
    message: `⚡ ${card.name} 提供 +${params.amount || 1} 能量！`,
  }
}

/**
 * passiveSummon — 每回合召唤一张卡
 * timing: 'onTurnStart' or 'onTurnEnd'
 */
export function passiveSummon(ctx, params) {
  const card = ctx.card
  if (!card || card.currentHp <= 0) return null
  if (params.chance && Math.random() > params.chance) return null

  const field = ctx.friendlyField || []
  const slot = findEmptySlot(field)
  if (slot < 0) return null

  const summon = {
    id: params.id + '_summon_' + Date.now(),
    uid: params.id + '_summon_' + Date.now() + '_' + Math.random(),
    name: params.name || '召唤物',
    nameEn: params.nameEn || params.name || 'Summon',
    atk: params.atk || 1000,
    hp: params.hp || 1000,
    currentHp: params.hp || 1000,
    maxHp: params.hp || 1000,
    cost: 0,
    faction: params.faction || card.faction,
    rarity: 'R',
    skills: [],
    statuses: [],
    summonSick: true,
  }

  return {
    type: 'SUMMON_CARD',
    side: 'friendly',
    slot,
    card: summon,
    source: card.name,
    message: `🧬 ${card.name} 召唤了 ${summon.name}！`,
  }
}

/**
 * passiveDrain — 每回合吸取敌方主人 HP 给己方主人
 * timing: 'onTurnEnd'
 */
export function passiveDrain(ctx, params) {
  const card = ctx.card
  if (!card || card.currentHp <= 0) return null
  return [{
    type: 'OVERFLOW_DAMAGE',
    source: card.name,
    target: 'enemyLeader',
    damage: params.amount || 500,
    message: `🩸 ${card.name} 吸取敌方主人 ${params.amount || 500} HP`,
  }, {
    type: 'HEAL',
    targetUid: '__leader__',
    source: card.name,
    target: 'leader',
    amount: params.amount || 500,
    _leaderHeal: true,
    message: `💚 己方主人回复 ${params.amount || 500} HP`,
  }]
}

/**
 * passiveSelfDebuff — 每回合自身 ATK 降低（有下限）
 * timing: 'onTurnEnd'
 * 用于 Resistance Crisis：每回合 ATK -1000，最低 2000
 */
export function passiveSelfDebuff(ctx, params) {
  const card = ctx.card
  if (!card || card.currentHp <= 0) return null
  const min = params.min || 0
  if (card.atk <= min) return null
  const reduction = Math.min(params.amount || 1000, card.atk - min)
  if (reduction <= 0) return null
  return {
    type: 'BUFF',
    targetUid: card.uid,
    stat: 'atk',
    amount: -reduction,
    source: card.name,
    message: `⬇️ ${card.name} 耐药危机！ATK -${reduction}`,
  }
}

/**
 * passiveDraw — 每 N 回合抽一张牌（Sprint 27: 发射正式 DRAW_CARD event）
 * timing: 'onTurnEnd'
 */
export function passiveDraw(ctx, params) {
  const card = ctx.card
  if (!card || card.currentHp <= 0) return null
  const turn = ctx.turn || 1
  if (params.interval && turn % params.interval !== 0) return null
  return {
    type: 'DRAW_CARD',
    source: card.name,
    amount: params.amount || 1,
    message: `📥 ${card.name} 造血：抽 ${params.amount || 1} 张牌！`,
  }
}

/**
 * passiveRandomBuff — 每回合随机 buff ATK 或 HP
 * timing: 'onTurnStart'
 */
export function passiveRandomBuff(ctx, params) {
  const card = ctx.card
  if (!card || card.currentHp <= 0) return null

  const stat = Math.random() < 0.5 ? 'atk' : 'hp'
  if (stat === 'atk') {
    return {
      type: 'BUFF',
      targetUid: card.uid,
      stat: 'atk',
      amount: params.amount || 500,
      source: card.name,
      message: `🧬 ${card.name} 变异！ATK +${params.amount || 500}！`,
    }
  } else {
    // HP buff = heal
    const heal = params.amount || 500
    return {
      type: 'HEAL',
      targetUid: card.uid,
      source: card.name,
      target: card.name,
      amount: heal,
      message: `🧬 ${card.name} 变异！HP +${heal}！`,
    }
  }
}
