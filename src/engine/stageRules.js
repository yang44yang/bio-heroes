/**
 * 闯关特殊规则系统 — Sprint 19 补充
 *
 * 每个规则导出 { onTurnStart?, onEnemyCardDeath?, modifyField? } 钩子
 * 由 useBattle 在战斗循环关键节点调用
 */

// ================================================================
//  孢子模板（真菌入侵 — 击杀敌方卡时生成）
// ================================================================
const SPORE_CARD = {
  id: 'spore_token',
  name: '真菌孢子',
  nameEn: 'Fungal Spore',
  type: 'character',
  faction: 'pathogen',
  subType: 'fungus',
  cost: 0,
  rarity: 'R',
  atk: 500,
  hp: 500,
  skills: [],
  scienceCard: '真菌通过释放大量孢子来繁殖，一个蘑菇能释放数十亿孢子。',
}

let sporeCounter = 0

function makeSpore() {
  sporeCounter++
  return {
    ...SPORE_CARD,
    uid: `spore_${Date.now()}_${sporeCounter}`,
    currentHp: SPORE_CARD.hp,
    maxHp: SPORE_CARD.hp,
    statuses: [],
  }
}

// ================================================================
//  stage_2_4 蚊虫侵扰：每3回合随机己方卡受1000伤害
// ================================================================
const mosquitoRule = {
  id: 'mosquito_swarm',
  onTurnStart({ turn, playerField, setPlayerField, addLog }) {
    if (turn < 3 || turn % 3 !== 0) return []

    const alive = playerField
      .map((c, i) => (c && c.currentHp > 0 ? i : -1))
      .filter(i => i >= 0)
    if (alive.length === 0) return []

    const targetIdx = alive[Math.floor(Math.random() * alive.length)]
    const targetName = playerField[targetIdx].name

    setPlayerField(prev => {
      const next = [...prev]
      if (next[targetIdx] && next[targetIdx].currentHp > 0) {
        next[targetIdx] = { ...next[targetIdx], currentHp: Math.max(0, next[targetIdx].currentHp - 1000) }
      }
      return next
    })

    addLog(`🦟 蚊虫侵扰！${targetName} 被叮咬，受到 1000 伤害！`)
    return [{ type: 'STAGE_RULE', text: `🦟 蚊虫侵扰！${targetName} -1000HP`, color: 'text-yellow-400' }]
  },
}

// ================================================================
//  stage_3_2 深海压力：非marine子类型的卡ATK -500（战斗开始时+每回合检查）
// ================================================================
const deepSeaRule = {
  id: 'deep_sea_pressure',
  // 标记已被深海压力影响的卡（通过 status）
  onTurnStart({ playerField, setPlayerField, addLog }) {
    let affected = 0
    setPlayerField(prev =>
      prev.map(c => {
        if (!c || c.currentHp <= 0) return c
        if (c.subType === 'marine') return c
        // 已经有深海压力 debuff 则跳过
        if (c.statuses?.some(s => s.type === 'deep_pressure')) return c
        affected++
        return {
          ...c,
          atk: Math.max(0, c.atk - 500),
          statuses: [...(c.statuses || []), { type: 'deep_pressure', turnsLeft: 99 }],
        }
      })
    )
    if (affected > 0) {
      addLog(`🌊 深海压力！${affected} 张非海洋卡 ATK -500`)
      return [{ type: 'STAGE_RULE', text: `🌊 深海压力！${affected}张卡 ATK-500`, color: 'text-cyan-400' }]
    }
    return []
  },
}

// ================================================================
//  stage_3_4 丛林迷雾：敌方卡出场后1回合隐身（不可被攻击）
// ================================================================
const jungleMistRule = {
  id: 'jungle_mist',
  // 在敌方出牌后自动给新卡加隐身（由 useBattle 在 aiPlayToField 后调用）
  onEnemyCardPlayed({ card, setEnemyField, addLog }) {
    setEnemyField(prev =>
      prev.map(c => {
        if (!c || c.uid !== card.uid) return c
        const statuses = [...(c.statuses || []), { type: 'stealth', turnsLeft: 1 }]
        return { ...c, statuses }
      })
    )
    addLog(`🌫️ 丛林迷雾！${card.name} 获得 1 回合隐身！`)
    return [{ type: 'STAGE_RULE', text: `🌫️ ${card.name} 隐身！`, color: 'text-green-400' }]
  },
}

// ================================================================
//  stage_4_2 孢子蔓延：敌方卡被击杀时30%概率生成孢子
// ================================================================
const sporePlagueRule = {
  id: 'spore_plague',
  onEnemyCardDeath({ enemyField, setEnemyField, addLog }) {
    if (Math.random() > 0.3) return []

    const emptyIdx = enemyField.findIndex(c => !c || c.currentHp <= 0)
    if (emptyIdx === -1) return []

    const spore = makeSpore()
    setEnemyField(prev => {
      const next = [...prev]
      next[emptyIdx] = spore
      return next
    })

    addLog('🍄 孢子蔓延！击杀的真菌释放出一个孢子！')
    return [{ type: 'STAGE_RULE', text: '🍄 孢子蔓延！', color: 'text-amber-400' }]
  },
}

// ================================================================
//  stage_4_4 生物安全警报：敌方每有SR/SSR卡在场，己方主人每回合-500HP
// ================================================================
const bioAlertRule = {
  id: 'bio_alert',
  onTurnStart({ enemyField, playerLeaderHp, setPlayerLeaderHp, addLog }) {
    const srSsrCount = enemyField.filter(
      c => c && c.currentHp > 0 && (c.rarity === 'SR' || c.rarity === 'SSR')
    ).length
    if (srSsrCount === 0) return []

    const damage = srSsrCount * 500
    setPlayerLeaderHp(prev => Math.max(0, prev - damage))

    addLog(`☣️ 生物安全警报！敌方 ${srSsrCount} 张高级卡在场，主人 -${damage} HP！`)
    return [{ type: 'STAGE_RULE', text: `☣️ 警报！主人 -${damage}HP`, color: 'text-red-400' }]
  },
}

// ================================================================
//  统一接口
// ================================================================
const STAGE_RULES = {
  mosquito_swarm: mosquitoRule,
  deep_sea_pressure: deepSeaRule,
  jungle_mist: jungleMistRule,
  spore_plague: sporePlagueRule,
  bio_alert: bioAlertRule,
}

/**
 * 根据 ruleId 获取特殊规则对象
 */
export function getStageRule(ruleId) {
  return STAGE_RULES[ruleId] || null
}
