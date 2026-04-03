/**
 * Boss 机制系统 — Sprint 16
 *
 * 每个 Boss 导出 { onTurnStart, onTurnEnd, onHPThreshold } 钩子
 * 由 useBattle 在战斗循环关键节点调用
 */

import { MAX_FIELD_SLOTS } from '../data/deckRules'

// ================================================================
//  病毒副本模板（新冠Boss 召唤用）
// ================================================================
const VIRUS_CLONE = {
  id: 'covid_clone',
  name: '病毒副本',
  nameEn: 'Virus Clone',
  type: 'character',
  faction: 'pathogen',
  cost: 0,
  rarity: 'R',
  atk: 1500,
  hp: 1500,
  skills: [],
  scienceNote: '病毒通过劫持宿主细胞不断复制自身',
}

let cloneCounter = 0

function makeClone() {
  cloneCounter++
  return {
    ...VIRUS_CLONE,
    uid: `covid_clone_${Date.now()}_${cloneCounter}`,
    currentHp: VIRUS_CLONE.hp,
    maxHp: VIRUS_CLONE.hp,
    statuses: [],
  }
}

// ================================================================
//  2-4 新冠病毒 Boss
// ================================================================
const covidBoss = {
  /**
   * onTurnEnd: 若 covid_invader 在敌方场上，50% 概率召唤病毒副本到空位
   */
  onTurnEnd({ enemyField, setEnemyField, addLog }) {
    const covidAlive = enemyField.some(
      c => c && c.currentHp > 0 && c.id === 'covid_invader'
    )
    if (!covidAlive) return []

    if (Math.random() < 0.5) {
      const emptyIdx = enemyField.findIndex(c => !c || c.currentHp <= 0)
      if (emptyIdx === -1) return [] // 场上满了

      const clone = makeClone()
      setEnemyField(prev => {
        const next = [...prev]
        next[emptyIdx] = clone
        return next
      })
      addLog('🦠 超级传播！新冠病毒复制了一个病毒副本！')
      return [{ type: 'BOSS_EVENT', text: '🦠 超级传播！', color: 'text-red-400' }]
    }
    return []
  },

  /**
   * onHPThreshold: HP < 50% → covid_invader ATK +2000 + 触发对话
   */
  onHPThreshold({ currentHP, maxHP, enemyField, setEnemyField, addLog, bossState }) {
    if (bossState.phase >= 2) return { events: [], dialogue: null }
    const ratio = currentHP / maxHP
    if (ratio >= 0.5) return { events: [], dialogue: null }

    bossState.phase = 2
    // Buff covid_invader ATK
    setEnemyField(prev =>
      prev.map(c => {
        if (c && c.id === 'covid_invader' && c.currentHp > 0) {
          return { ...c, atk: c.atk + 2000 }
        }
        return c
      })
    )
    addLog('💀 变异株觉醒！新冠病毒 ATK +2000！')
    return {
      events: [{ type: 'BOSS_EVENT', text: '💀 变异株觉醒！ATK+2000', color: 'text-red-500' }],
      dialogue: 'bossHalfHP',
    }
  },
}

// ================================================================
//  3-4 蓝鲸 Boss
// ================================================================
const whaleBoss = {
  /**
   * onTurnStart: 每 3 回合对所有玩家卡造成 2500 伤害
   */
  onTurnStart({ turn, playerField, setPlayerField, addLog }) {
    if (turn < 3 || turn % 3 !== 0) return []

    const events = []
    setPlayerField(prev =>
      prev.map((c, i) => {
        if (!c || c.currentHp <= 0) return c
        const newHp = Math.max(0, c.currentHp - 2500)
        events.push({ type: 'BOSS_AOE', slot: i, damage: 2500 })
        return { ...c, currentHp: newHp }
      })
    )
    addLog('🐋 声纳震荡！对所有玩家卡造成 2500 伤害！')
    return [{ type: 'BOSS_EVENT', text: '🐋 声纳震荡！', color: 'text-blue-400' }, ...events]
  },

  /**
   * onHPThreshold: HP < 30% → 蓝鲸获得 1 回合完全免疫
   */
  onHPThreshold({ currentHP, maxHP, enemyField, setEnemyField, addLog, bossState }) {
    if (bossState.phase >= 2) return { events: [], dialogue: null }
    const ratio = currentHP / maxHP
    if (ratio >= 0.3) return { events: [], dialogue: null }

    bossState.phase = 2
    // 给蓝鲸加 immune status
    setEnemyField(prev =>
      prev.map(c => {
        if (c && c.id === 'blue_whale_titan' && c.currentHp > 0) {
          const statuses = c.statuses ? [...c.statuses] : []
          statuses.push({ type: 'immune', turnsLeft: 1 })
          return { ...c, statuses }
        }
        return c
      })
    )
    addLog('🐋 深海潜伏！蓝鲸获得 1 回合完全免疫！')
    return {
      events: [{ type: 'BOSS_EVENT', text: '🐋 深海潜伏！1回合免疫', color: 'text-cyan-400' }],
      dialogue: 'bossHalfHP',
    }
  },
}

// ================================================================
//  4-4 超级细菌 Boss（三阶段）
// ================================================================
const superBacteriaBoss = {
  /**
   * onTurnStart: 阶段3时，敌方主人每回合自愈 2000 HP
   */
  onTurnStart({ bossState, enemyLeaderHp, maxLeaderHP, setEnemyLeaderHp, addLog }) {
    if (bossState.phase < 3) return []

    setEnemyLeaderHp(prev => Math.min(maxLeaderHP, prev + 2000))
    addLog('💀 超级细菌自愈！敌方主人 +2000 HP！')
    return [{ type: 'BOSS_EVENT', text: '💀 自愈 +2000HP', color: 'text-green-400' }]
  },

  /**
   * onHPThreshold: 三阶段切换
   *   HP < 60% → 阶段2: 所有敌方卡免疫科技系伤害
   *   HP < 30% → 阶段3: 每回合自愈 2000 HP
   */
  onHPThreshold({ currentHP, maxHP, enemyField, setEnemyField, addLog, bossState }) {
    const ratio = currentHP / maxHP
    const events = []
    let dialogue = null

    // 阶段2: HP < 60%
    if (bossState.phase < 2 && ratio < 0.6) {
      bossState.phase = 2
      // 给所有敌方卡加 immune_tech status
      setEnemyField(prev =>
        prev.map(c => {
          if (!c || c.currentHp <= 0) return c
          const statuses = c.statuses ? [...c.statuses] : []
          statuses.push({ type: 'immune_tech', turnsLeft: 99 })
          return { ...c, statuses }
        })
      )
      addLog('💀 耐药觉醒！所有敌方卡免疫科技系伤害！')
      events.push({ type: 'BOSS_EVENT', text: '💀 耐药觉醒！免疫科技系', color: 'text-purple-400' })
      dialogue = 'bossHalfHP'
    }

    // 阶段3: HP < 30%
    if (bossState.phase < 3 && ratio < 0.3) {
      bossState.phase = 3
      addLog('💀 超级进化！超级细菌开始每回合自愈 2000 HP！')
      events.push({ type: 'BOSS_EVENT', text: '💀 超级进化！每回合自愈', color: 'text-red-500' })
    }

    return { events, dialogue }
  },
}

// ================================================================
//  统一接口
// ================================================================
const BOSS_MECHANICS = {
  covid_boss: covidBoss,
  whale_boss: whaleBoss,
  super_bacteria_boss: superBacteriaBoss,
}

/**
 * 根据 mechanicId 获取 Boss 机制对象
 * @param {string} mechanicId - 'covid_boss' | 'whale_boss' | 'super_bacteria_boss'
 * @returns {{ onTurnStart?, onTurnEnd?, onHPThreshold? } | null}
 */
export function getBossMechanic(mechanicId) {
  return BOSS_MECHANICS[mechanicId] || null
}
