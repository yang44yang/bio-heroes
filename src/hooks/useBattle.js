import { useState, useCallback, useRef } from 'react'
import {
  ENERGY_CAP, LEADER_HP, QUIZ_CHANCE, MAX_FIELD_SLOTS, FACTIONS,
} from '../data/deckRules'
import { canPlayWithMarkers, consumeFactionMarkers, getFactionMarkers } from '../utils/factionMarkers'
import { calcCardBattle, calcLeaderDamage } from '../utils/damage'
import { getRandomQuiz, resetQuizHistory } from '../data/quizzes'
import { triggerSkills } from '../engine/skillTriggers'
import { processStatuses, applyShieldAbsorb } from '../engine/statusEffects'
import { pickRandomEvent } from '../data/events'
import { getBossMechanic } from '../engine/bossMechanics'
import { cardHasGuard, fieldHasGuard } from '../utils/guardSkill'
import { getStageRule } from '../engine/stageRules'

/**
 * useBattle — Sprint 3 技能触发框架版
 *
 * 阶段流转（玩家视角）：
 *   mulligan → main（出牌）→ battle（攻击）→ enemyTurn（AI）→ main …
 */
export function useBattle() {
  // === 回合 & 阶段 ===
  const [turn, setTurn] = useState(1)
  const [phase, setPhase] = useState('init')
  // init | mulligan | main | battle | animating | enemyTurn | over
  const [playerEnergy, setPlayerEnergy] = useState(1)
  const [enemyEnergy, setEnemyEnergy] = useState(1)

  // === 主人 HP ===
  const [playerLeaderHp, setPlayerLeaderHp] = useState(LEADER_HP)
  const [enemyLeaderHp, setEnemyLeaderHp] = useState(LEADER_HP)

  // === 战场（每方 MAX_FIELD_SLOTS 位，null = 空）===
  const emptyField = () => Array(MAX_FIELD_SLOTS).fill(null)
  const [playerField, setPlayerField] = useState(emptyField)
  const [enemyField, setEnemyField] = useState(emptyField)

  // === 召唤疲劳 & 已攻击（uid Set）===
  const summonedThisTurn = useRef(new Set())
  const attackedThisTurn = useRef(new Set())
  // Sprint 30b: Conundrum globalEffects（如 'antibiotic_weakened' = 抗生素卡 ATK 减半）
  const globalEffectsRef = useRef([])

  // === 日志 & 问答 & 胜负 ===
  const [battleLog, setBattleLog] = useState([])
  const [currentQuiz, setCurrentQuiz] = useState(null)
  const [winner, setWinner] = useState(null)

  // === 技能事件队列（供 BattleScreen 消费：伤害浮字、动画）===
  const [skillEvents, setSkillEvents] = useState([])

  // === Power Bank 能量储蓄罐 ===
  const [playerPowerBank, setPlayerPowerBank] = useState({ stored: 0, intact: true })
  const [enemyPowerBank, setEnemyPowerBank] = useState({ stored: 0, intact: true })
  const playerPowerBankRef = useRef(playerPowerBank)
  playerPowerBankRef.current = playerPowerBank
  const enemyPowerBankRef = useRef(enemyPowerBank)
  enemyPowerBankRef.current = enemyPowerBank

  // === 弃牌堆（用于阵营标记计算）===
  const [playerDiscard, setPlayerDiscard] = useState([])
  const [enemyDiscard, setEnemyDiscard] = useState([])
  const playerDiscardRef = useRef(playerDiscard)
  playerDiscardRef.current = playerDiscard
  const enemyDiscardRef = useRef(enemyDiscard)
  enemyDiscardRef.current = enemyDiscard

  // Sprint 27: 手牌引用（由 BattleScreen 通过 setHandRefs 注入）
  // 用于 REVEAL_HAND 以及需要读取手牌的技能
  const handsRef = useRef({ playerHand: [], enemyHand: [], drawCards: null, aiDrawCards: null })
  const setHandRefs = useCallback((refs) => {
    handsRef.current = { ...handsRef.current, ...refs }
  }, [])

  // === SP 卡组 ===
  const [playerSpDeck, setPlayerSpDeck] = useState([])
  const [enemySpDeck, setEnemySpDeck] = useState([])
  const playerSpDeckRef = useRef(playerSpDeck)
  playerSpDeckRef.current = playerSpDeck
  const enemySpDeckRef = useRef(enemySpDeck)
  enemySpDeckRef.current = enemySpDeck

  // === 事件卡效果日志（供 UI 展示动画用）===
  const [pendingSpSummon, setPendingSpSummon] = useState(null) // { side, candidates }

  // === 问答连续答对次数（用于难度升级 + 科学家模式）===
  const quizStreakRef = useRef(0)
  const [quizStreak, setQuizStreak] = useState(0)
  // === 科学家模式（连续答对3题触发，持续2回合）===
  const [scientistMode, setScientistMode] = useState({ active: false, turnsLeft: 0 })
  // === 环境事件 ===
  const [activeEnvEvent, setActiveEnvEvent] = useState(null) // { event, turnsLeft }
  const [pendingEnvEvent, setPendingEnvEvent] = useState(null) // event to show in UI
  const recentEventsRef = useRef([]) // last 2 event ids
  // 病毒爆发持续伤害标记
  const virusOutbreakRef = useRef({ playerAffected: false, enemyAffected: false, turnsLeft: 0 })

  // === 战斗统计 ===
  const battleStatsRef = useRef({
    totalDamage: 0,
    kills: 0,
    quizCorrect: 0,
    quizTotal: 0,
    spSummons: 0,
    powerBankMax: 0,
    cardsPlayed: 0,
    eventsTriggered: 0,
  })

  // === Boss 机制 ===
  const campaignConfigRef = useRef(null)
  const bossStateRef = useRef({ phase: 1 }) // 追踪 Boss 阶段，避免重复触发
  const bossMechanicRef = useRef(null)
  // Boss 事件队列（供 BattleScreen 消费：浮字 + 对话触发）
  const [bossMechanicEvents, setBossMechanicEvents] = useState([])

  // === 关卡特殊规则 ===
  const stageRuleRef = useRef(null)

  // === 问答触发控制：首次攻击必触发，之后每3回合触发一次 ===
  const firstAttackDone = useRef(false)      // 本局是否已做过首次攻击
  const lastQuizTurn = useRef(0)             // 上次触发问答的回合数

  const addLog = useCallback((msg) => {
    setBattleLog(prev => [...prev, msg])
  }, [])

  const pushSkillEvents = useCallback((events) => {
    if (events.length > 0) {
      setSkillEvents(prev => [...prev, ...events])
    }
  }, [])

  const clearSkillEvents = useCallback(() => {
    setSkillEvents([])
  }, [])

  // === Refs（解决闭包问题）===
  const playerFieldRef = useRef(playerField)
  playerFieldRef.current = playerField
  const enemyFieldRef = useRef(enemyField)
  enemyFieldRef.current = enemyField
  const playerLeaderHpRef = useRef(playerLeaderHp)
  playerLeaderHpRef.current = playerLeaderHp
  const enemyLeaderHpRef = useRef(enemyLeaderHp)
  enemyLeaderHpRef.current = enemyLeaderHp
  const turnRef = useRef(turn)
  turnRef.current = turn
  const playerEnergyRef = useRef(playerEnergy)
  playerEnergyRef.current = playerEnergy
  const enemyEnergyRef = useRef(enemyEnergy)
  enemyEnergyRef.current = enemyEnergy

  // ----------------------------------------------------------------
  //  辅助
  // ----------------------------------------------------------------
  function makeFieldCard(card) {
    let atk = card.atk
    // Sprint 30b: antibiotic_weakened global effect → 抗生素卡 ATK 减半
    if (globalEffectsRef.current.includes('antibiotic_weakened') && card.tags?.includes('antibiotic')) {
      atk = Math.floor(atk / 2)
    }
    // baseAtk/baseHp 保留卡牌设计原值，供 UI 显示数值增量(buff/突变后差异化)
    // 注意 atk 已经可能被 antibiotic_weakened 减半，baseAtk 仍取 card.atk(更"原始"的数据层值)
    return { ...card, atk, baseAtk: card.atk, baseHp: card.hp, currentHp: card.hp, maxHp: card.hp, statuses: [] }
  }

  // hasGuard / isGuardCard 委托给 utils/guardSkill 统一识别多个 nameEn
  // (Guard / Shell Defense / Physical Barrier 都算守护)，修复海龟·龟甲防御和
  // 睫毛·物理屏障 description 写了"守护"但 hasGuard 识别不到的隐藏 bug。
  const hasGuard = fieldHasGuard
  const isGuardCard = cardHasGuard

  // ----------------------------------------------------------------
  //  被击败卡牌清理（将 HP<=0 的卡位清空）
  //  返回被清理的卡牌数组（供弃牌堆使用）
  // ----------------------------------------------------------------
  const cleanupDeadCards = useCallback((side) => {
    const dead = []
    const setter = side === 'player' ? setPlayerField : setEnemyField
    const setDiscardPile = side === 'player' ? setPlayerDiscard : setEnemyDiscard
    setter(prev => {
      const next = [...prev]
      for (let i = 0; i < next.length; i++) {
        if (next[i] && next[i].currentHp <= 0) {
          dead.push(next[i])
          next[i] = null
        }
      }
      return next
    })
    // Dead cards go to discard pile (for faction markers)
    if (dead.length > 0) {
      setDiscardPile(prev => [...prev, ...dead])
    }
    // 关卡特殊规则：敌方卡死亡时触发（孢子蔓延等）
    if (side === 'enemy' && dead.length > 0 && stageRuleRef.current?.onEnemyCardDeath) {
      for (const deadCard of dead) {
        const ruleEvents = stageRuleRef.current.onEnemyCardDeath({
          deadCard,
          enemyField: enemyFieldRef.current,
          setEnemyField,
          addLog,
        })
        if (ruleEvents?.length > 0) {
          setBossMechanicEvents(prev => [...prev, ...ruleEvents])
        }
      }
    }
    return dead
  }, [])

  // ----------------------------------------------------------------
  //  Boss HP 阈值检查（攻击后调用）
  // ----------------------------------------------------------------
  function checkBossHPThreshold() {
    const boss = bossMechanicRef.current
    if (!boss?.onHPThreshold) return
    const config = campaignConfigRef.current
    const maxHP = config?.leaderHP || LEADER_HP
    const currentHP = enemyLeaderHpRef.current
    const result = boss.onHPThreshold({
      currentHP,
      maxHP,
      enemyField: enemyFieldRef.current,
      setEnemyField,
      addLog,
      bossState: bossStateRef.current,
    })
    if (result?.events?.length > 0) {
      setBossMechanicEvents(prev => [...prev, ...result.events])
    }
    if (result?.dialogue) {
      setBossMechanicEvents(prev => [...prev, { type: 'BOSS_DIALOGUE', dialogueKey: result.dialogue }])
    }
  }

  // ----------------------------------------------------------------
  //  统一技能事件执行器
  //  friendlySetter: 技能拥有者所在场的 setter
  //  enemySetter: 对面场的 setter
  //  side: 'player' | 'enemy'（技能拥有者，用于 leader / powerBank 事件）
  // ----------------------------------------------------------------
  function applySkillEvents(events, friendlySetter, enemySetter, side = 'player') {
    // 技能拥有者视角的 leader / powerBank setter
    const selfLeaderSetter = side === 'player' ? setPlayerLeaderHp : setEnemyLeaderHp
    const enemyLeaderSetter = side === 'player' ? setEnemyLeaderHp : setPlayerLeaderHp
    const selfPowerBankSetter = side === 'player' ? setPlayerPowerBank : setEnemyPowerBank
    const selfDiscardRef = side === 'player' ? playerDiscardRef : enemyDiscardRef
    for (const evt of events) {
      switch (evt.type) {
        case 'NARRATIVE_LOG': {
          // 只写战斗日志、不改任何 state。给"技能触发了但条件不满足"的场景用
          // (如干细胞分化时弃牌堆没匹配卡)，避免静默 null 让玩家困惑"为什么没反应"。
          if (evt.message) addLog(evt.message)
          break
        }
        case 'HEAL': {
          friendlySetter(prev => {
            const next = prev.map(c => c ? { ...c } : null)
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              target.currentHp = Math.min(target.maxHp, target.currentHp + evt.amount)
            }
            return next
          })
          break
        }
        case 'APPLY_SHIELD': {
          friendlySetter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              target.statuses.push({ type: 'shield', amount: evt.amount, source: evt.source })
            }
            return next
          })
          break
        }
        case 'BUFF': {
          // _side='enemy' → 作用敌方场（ATK 减益）；否则友方（增益）。
          // 与 APPLY_STATUS / REMOVE_STATUS 一致按 _side 路由，否则减益会在己方场找不到目标而空转。
          const buffSetter = evt._side === 'enemy' ? enemySetter : friendlySetter
          buffSetter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target && evt.stat === 'atk') {
              // 实际增减量（ATK 不低于 0，避免负值与回退超调）
              const before = target.atk
              target.atk = Math.max(0, target.atk + evt.amount)
              const delta = target.atk - before
              // 时限（evt.turns）：加 atk_boost status，回合结束 processStatuses 按实际 delta 回退，
              // 防永久叠加（与事件卡 buff 同款）。无 turns 保持永久（吞噬成长 / Gene Edit / permanent_debuff）。
              if (evt.turns && delta !== 0) {
                target.statuses.push({
                  type: 'atk_boost',
                  amount: delta,
                  turnsLeft: evt.turns,
                  source: evt.source,
                })
              }
            } else if (target && evt.stat === 'hp') {
              // HP 永久 buff(基因治疗·基因修正)：同时提升 maxHp 上限和 currentHp 当前值。
              // 不支持 turns(没引入 hp_boost status)；若未来需要回合限定 HP buff 再扩展。
              const baseMax = target.maxHp || target.hp || 0
              target.maxHp = Math.max(0, baseMax + evt.amount)
              target.currentHp = Math.max(0, (target.currentHp || 0) + evt.amount)
            }
            return next
          })
          break
        }
        case 'AOE_DAMAGE': {
          enemySetter(prev => {
            const next = prev.map(c => c ? { ...c } : null)
            if (evt.targetSlot !== undefined && next[evt.targetSlot]) {
              next[evt.targetSlot].currentHp = Math.max(0, next[evt.targetSlot].currentHp - evt.damage)
            }
            return next
          })
          break
        }
        case 'APPLY_POISON': {
          // 毒素施加到敌方卡
          enemySetter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              target.statuses.push({ type: 'poison', damage: evt.damage, turnsLeft: evt.turnsLeft })
            }
            return next
          })
          break
        }
        case 'APPLY_SLEEP': {
          // 睡眠施加到敌方卡
          enemySetter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              target.statuses.push({ type: 'sleep', turnsLeft: evt.turnsLeft })
            }
            return next
          })
          break
        }
        case 'SUMMON_CARD': {
          // 召唤卡牌到己方场上
          friendlySetter(prev => {
            const next = [...prev]
            if (evt.slot >= 0 && evt.slot < next.length && (!next[evt.slot] || next[evt.slot].currentHp <= 0)) {
              next[evt.slot] = evt.card
            }
            return next
          })
          // 标记召唤疲劳
          if (evt.card && evt.card.uid) {
            summonedThisTurn.current.add(evt.card.uid)
          }
          break
        }
        case 'REVEAL_HAND': {
          // Sprint 27: 揭示敌方手牌 — 不仅打日志，还推送 skillEvents 供 BattleScreen 显示浮窗
          // Sprint 28: 标注 initiator side 以便 UI 判断是玩家还是 AI 触发
          evt._initiatorSide = side
          addLog(evt.message)
          break
        }
        case 'APPLY_MARK': {
          // 给敌方卡添加标记状态
          enemySetter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              target.statuses.push({
                type: 'marked',
                bonus_damage: evt.bonus_damage,
                bonus_from: evt.bonus_from,
                faction_filter: evt.faction_filter,
                source: evt.source,
              })
            }
            return next
          })
          break
        }
        case 'ENERGY_BOOST': {
          // Sprint 27: 实际增加能量（不再只打日志）
          const setEnergy = side === 'player' ? setPlayerEnergy : setEnemyEnergy
          setEnergy(prev => Math.min(ENERGY_CAP, prev + (evt.amount || 1)))
          if (evt.message) addLog(evt.message)
          break
        }
        case 'DRAW_CARD': {
          // Sprint 27: 技能抽牌（Hematopoiesis / Super Computation）
          const drawFn = side === 'player' ? handsRef.current.drawCards : handsRef.current.aiDrawCards
          if (typeof drawFn === 'function') {
            const drawn = drawFn(evt.amount || 1)
            if (drawn && drawn.length > 0 && evt.message) {
              addLog(evt.message)
            }
          } else if (evt.message) {
            addLog(evt.message)
          }
          break
        }
        // === Sprint 24 新增 ===
        case 'REPAIR_POWER_BANK': {
          selfPowerBankSetter(pb => ({ ...pb, intact: true }))
          if (evt.message) addLog(evt.message)
          break
        }
        case 'APPLY_STATUS': {
          // 通用添加状态（onFriendly/self，默认给友方）
          const setter = evt._side === 'enemy' ? enemySetter : friendlySetter
          setter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target && evt.status) {
              target.statuses.push({ ...evt.status })
            }
            return next
          })
          if (evt.message) addLog(evt.message)
          break
        }
        case 'REMOVE_STATUS': {
          // Sprint 26: 移除指定类型的 status（通用版，REMOVE_SHIELD 的泛化）
          const setter = evt._side === 'enemy' ? enemySetter : friendlySetter
          setter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target && evt.statusType) {
              target.statuses = target.statuses.filter(s => s.type !== evt.statusType)
            }
            return next
          })
          if (evt.message) addLog(evt.message)
          break
        }
        case 'REMOVE_SHIELD': {
          enemySetter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              target.statuses = target.statuses.filter(s => s.type !== 'shield')
            }
            return next
          })
          if (evt.message) addLog(evt.message)
          break
        }
        case 'HEAL_LEADER': {
          selfLeaderSetter(hp => Math.min(LEADER_HP, hp + (evt.amount || 0)))
          if (evt.message) addLog(evt.message)
          break
        }
        case 'MASS_REVIVE': {
          // 从弃牌堆复活所有角色卡到空位（最多到 5 位）
          // evt.faction_filter (可选)：仅复活该阵营卡。不传则复活全部（向后兼容 sp_quantum_healer）
          const hpPercent = evt.hp_percent || 0.5
          const discard = selfDiscardRef.current || []
          let chars = discard.filter(c => c && (c.type === 'character' || !c.type))
          if (evt.faction_filter) chars = chars.filter(c => c.faction === evt.faction_filter)
          if (chars.length === 0) {
            // 弃牌堆没有可复活的卡。给独立 narrative log，避免和 message(可能写"全员归来")矛盾。
            if (evt.emptyMessage) addLog(evt.emptyMessage)
            else if (evt.message) addLog(evt.message)
            break
          }
          friendlySetter(prev => {
            const next = [...prev]
            for (const killed of chars) {
              // 找空位
              const emptyIdx = next.findIndex(c => !c || c.currentHp <= 0)
              if (emptyIdx < 0) break
              const maxHp = killed.maxHp || killed.hp || 1000
              const revived = {
                ...killed,
                uid: (killed.id || 'rev') + '_mass_revive_' + Date.now() + '_' + Math.random(),
                currentHp: Math.floor(maxHp * hpPercent),
                maxHp,
                statuses: [],
                summonSick: true,
              }
              next[emptyIdx] = revived
              summonedThisTurn.current.add(revived.uid)
            }
            return next
          })
          if (evt.message) addLog(evt.message)
          break
        }
        case 'CLEANSE': {
          // 移除负面状态（poison/sleep/deep_pressure）
          const setter = evt._side === 'enemy' ? enemySetter : friendlySetter
          setter(prev => {
            const next = prev.map(c =>
              c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null
            )
            const target = next.find(c => c && c.uid === evt.targetUid)
            if (target) {
              const neg = ['poison', 'sleep', 'deep_pressure']
              target.statuses = target.statuses.filter(s => !neg.includes(s.type))
            }
            return next
          })
          if (evt.message) addLog(evt.message)
          break
        }
        // OVERFLOW_DAMAGE / PIERCING_DAMAGE 由 handlePostAttackSkills 单独处理
      }
    }
  }

  // ----------------------------------------------------------------
  //  技能触发 + 溢出伤害处理（Overpower / Piercing）
  //  在攻击后调用，处理 onKill / onDeath 时机
  // ----------------------------------------------------------------
  function handlePostAttackSkills(atkCard, defCard, atkDmg, defKilled, side) {
    const allEvents = []                                    // 仅 onKill（攻击方技能）
    const defenderSide = side === 'player' ? 'enemy' : 'player' // 被杀方（onDeath 技能拥有者）
    let deathEvents = []

    if (defKilled) {
      const overflow = Math.max(0, atkDmg - defCard.currentHp)

      // onKill — 检查攻击方技能
      const killFriendlyField = side === 'player'
        ? playerFieldRef.current
        : enemyFieldRef.current
      const killEvents = triggerSkills('onKill', {
        attacker: atkCard,
        defender: defCard,
        overflow,
        friendlyField: killFriendlyField,
      })

      // onDeath — 被杀方技能。friendlyField 用被杀方的原始场（保留 null 空位，
      // 否则 revive_as/split 等按下标找空位的 effect 会假阴性"场上没空位"）。
      const deathFriendlyField = defenderSide === 'player'
        ? playerFieldRef.current
        : enemyFieldRef.current
      const deathDiscard = defenderSide === 'player'
        ? playerDiscardRef.current
        : enemyDiscardRef.current
      deathEvents = triggerSkills('onDeath', {
        card: defCard,
        friendlyField: deathFriendlyField,
        discardPile: deathDiscard, // revive_as 等 onDeath effect 用，无此字段时 effect 应优雅 noop
      })

      allEvents.push(...killEvents) // deathEvents 不混进来 — 它走防守方 side 单独 apply

      // 处理溢出伤害到主人（Overpower / Piercing，均来自 onKill）
      for (const evt of allEvents) {
        if ((evt.type === 'OVERFLOW_DAMAGE' || evt.type === 'PIERCING_DAMAGE') && evt.damage > 0) {
          if (side === 'player') {
            // 玩家攻击 → 扣敌方主人
            let won = false
            setEnemyLeaderHp(prev => {
              const next = Math.max(0, prev - evt.damage)
              if (next <= 0) { setWinner('player'); setPhase('over'); won = true }
              return next
            })
            if (!won) checkBossHPThreshold()
          } else {
            // 敌方攻击 → 扣玩家主人
            setPlayerLeaderHp(prev => {
              const next = Math.max(0, prev - evt.damage)
              if (next <= 0) { setWinner('enemy'); setPhase('over') }
              return next
            })
          }
          addLog(evt.message)
        }
      }
    }

    // onKill 事件用攻击方 side（BUFF / HEAL 等，如吞噬攻击 ATK +500）
    const friendlySetter = side === 'player' ? setPlayerField : setEnemyField
    const enemySetter = side === 'player' ? setEnemyField : setPlayerField
    applySkillEvents(allEvents, friendlySetter, enemySetter, side)

    // onDeath 事件用被杀方 side（召唤/复活/分裂/治疗落到死亡卡自己那方）
    const defFriendlySetter = defenderSide === 'player' ? setPlayerField : setEnemyField
    const defEnemySetter = defenderSide === 'player' ? setEnemyField : setPlayerField
    applySkillEvents(deathEvents, defFriendlySetter, defEnemySetter, defenderSide)

    // 记录技能事件（onKill + onDeath 都记）
    for (const evt of [...allEvents, ...deathEvents]) {
      if (evt.message && evt.type !== 'OVERFLOW_DAMAGE' && evt.type !== 'PIERCING_DAMAGE') {
        addLog(evt.message)
      }
    }

    return [...allEvents, ...deathEvents]
  }

  // ----------------------------------------------------------------
  //  回合结束技能处理（Natural Recovery / 状态效果 tick）
  // ----------------------------------------------------------------
  function processEndOfTurnEffects(side) {
    const fieldRef = side === 'player' ? playerFieldRef : enemyFieldRef
    const field = fieldRef.current
    const setter = side === 'player' ? setPlayerField : setEnemyField
    const allEvents = []

    // onTurnEnd 技能（自愈等）
    const turnEndEvents = triggerSkills('onTurnEnd', {
      friendlyField: field.filter(c => c && c.currentHp > 0),
    })

    // 处理回合结束技能事件
    for (const evt of turnEndEvents) {
      if (evt.type === 'HEAL' && evt.amount > 0) {
        setter(prev => {
          const next = prev.map(c => c ? { ...c } : null)
          const target = next.find(c => c && c.uid === evt.targetUid) || next.find(c => c && c.name === evt.target)
          if (target) {
            target.currentHp = Math.min(target.maxHp, target.currentHp + evt.amount)
          }
          return next
        })
        addLog(evt.message)
      } else if (evt.type === 'SUMMON_CARD') {
        // 骨髓造血等召唤技能
        setter(prev => {
          const next = [...prev]
          if (evt.slot >= 0 && evt.slot < next.length && (!next[evt.slot] || next[evt.slot].currentHp <= 0)) {
            next[evt.slot] = evt.card
          }
          return next
        })
        if (evt.card?.uid) summonedThisTurn.current.add(evt.card.uid)
        addLog(evt.message)
      }
      allEvents.push(evt)
    }

    // 处理状态效果（中毒 / 沉睡 tick）
    setter(prev => {
      const next = prev.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null)
      for (const card of next) {
        if (!card || card.currentHp <= 0) continue
        const statusEvents = processStatuses(card)
        for (const evt of statusEvents) {
          addLog(evt.message)
          allEvents.push(evt)
        }
      }
      return next
    })

    return allEvents
  }

  // applySkillEvents 内部已自行 addLog 的事件类型 —— 下方回合开始日志循环跳过它们，避免重复记录
  const TURN_START_SELF_LOGGED = new Set([
    'ENERGY_BOOST', 'DRAW_CARD', 'HEAL_LEADER', 'NARRATIVE_LOG', 'CLEANSE',
    'APPLY_STATUS', 'REMOVE_STATUS', 'REMOVE_SHIELD', 'REPAIR_POWER_BANK',
    'MASS_REVIVE', 'REVEAL_HAND',
  ])

  // ----------------------------------------------------------------
  //  回合开始时的 onTurnStart 技能（核心战斗循环接线）
  //  覆盖：向日葵/线粒体充能(ENERGY_BOOST)、蚁后召唤(SUMMON_CARD)、
  //        变形虫变异(BUFF/HEAL)、肝/肾清毒(cleanse)、超算抽牌(DRAW_CARD)
  //  对称服务玩家 & 敌方：side 决定 friendly/enemy setter 与能量/抽牌走向
  //  （结构参考 processEndOfTurnEffects 的 onTurnEnd 调用，但走 applySkillEvents 全量分派）
  // ----------------------------------------------------------------
  function processTurnStartEffects(side) {
    const fieldRef = side === 'player' ? playerFieldRef : enemyFieldRef
    const oppFieldRef = side === 'player' ? enemyFieldRef : playerFieldRef
    const friendlySetter = side === 'player' ? setPlayerField : setEnemyField
    const enemySetter = side === 'player' ? setEnemyField : setPlayerField

    // 遍历己方场上存活卡触发 onTurnStart（triggerSkills 内部逐卡注入 ctx.card）
    const events = triggerSkills('onTurnStart', {
      friendlyField: fieldRef.current.filter(c => c && c.currentHp > 0),
      enemyField: oppFieldRef.current.filter(c => c && c.currentHp > 0),
      playerHand: side === 'player' ? handsRef.current.playerHand : handsRef.current.enemyHand,
      enemyHand: side === 'player' ? handsRef.current.enemyHand : handsRef.current.playerHand,
      discardPile: side === 'player' ? playerDiscardRef.current : enemyDiscardRef.current,
      turn: turnRef.current,
    })
    if (events.length === 0) return events

    // 透析/肾脏的「主人回血」：cleanse 模板发 HEAL+__leader__，转成 applySkillEvents 能处理的 HEAL_LEADER
    const applied = events.map(evt =>
      (evt.type === 'HEAL' && evt._leaderHeal)
        ? { ...evt, type: 'HEAL_LEADER' }
        : evt
    )
    applySkillEvents(applied, friendlySetter, enemySetter, side)

    // cleanse 模板原地修改 statuses 且只回 RUSH_BOOST（无 setter），强制提交一次 re-render 反映清除
    friendlySetter(prev => prev.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null))

    // 日志：跳过 applySkillEvents 已内部记录的事件类型，避免重复
    const prefix = side === 'player' ? '🔵' : '🔴'
    for (const evt of applied) {
      if (evt.message && !TURN_START_SELF_LOGGED.has(evt.type)) addLog(`${prefix} ${evt.message}`)
    }
    pushSkillEvents(applied)
    return applied
  }

  // ----------------------------------------------------------------
  //  Power Bank：回合结束时剩余能量流入
  // ----------------------------------------------------------------
  function processEndPhase(side) {
    const energyRef = side === 'player' ? playerEnergyRef : enemyEnergyRef
    const pbRef = side === 'player' ? playerPowerBankRef : enemyPowerBankRef
    const setPB = side === 'player' ? setPlayerPowerBank : setEnemyPowerBank
    const setEnergy = side === 'player' ? setPlayerEnergy : setEnemyEnergy

    const energy = energyRef.current
    const pb = pbRef.current

    if (pb.intact && energy > 0) {
      const newStored = pb.stored + energy
      setPB(prev => ({ ...prev, stored: prev.stored + energy }))
      if (side === 'player' && newStored > battleStatsRef.current.powerBankMax) {
        battleStatsRef.current.powerBankMax = newStored
      }
      addLog(`⚡ ${energy} 点剩余能量流入 Power Bank！(总计: ${newStored})`)
      setEnergy(0)
    }
  }

  // ----------------------------------------------------------------
  //  Power Bank：打破释放能量
  // ----------------------------------------------------------------
  const breakPowerBank = useCallback((side) => {
    const pbRef = side === 'player' ? playerPowerBankRef : enemyPowerBankRef
    const pb = pbRef.current
    if (!pb.intact || pb.stored <= 0) return 0

    const released = pb.stored
    const setEnergy = side === 'player' ? setPlayerEnergy : setEnemyEnergy
    const setPB = side === 'player' ? setPlayerPowerBank : setEnemyPowerBank

    setEnergy(prev => prev + released)
    setPB({ stored: 0, intact: false })
    addLog(`💥 Power Bank 打破！释放 ${released} 点能量！`)

    return released
  }, [addLog])

  // ----------------------------------------------------------------
  //  环境事件触发（每3回合玩家回合开始时检查）
  // ----------------------------------------------------------------
  function tryEnvironmentEvent(currentTurn) {
    if (currentTurn < 3 || currentTurn % 3 !== 0) return null
    const event = pickRandomEvent(recentEventsRef.current)
    recentEventsRef.current = [...recentEventsRef.current.slice(-1), event.id]
    return event
  }

  function applyEnvironmentEvent(event) {
    const pField = [...playerFieldRef.current.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null)]
    const eField = [...enemyFieldRef.current.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses] : [] } : null)]

    const result = event.apply(pField, eField)

    if (result.playerField) setPlayerField(result.playerField)
    if (result.enemyField) setEnemyField(result.enemyField)

    // Handle virus outbreak specially
    if (event.id === 'virus_outbreak') {
      virusOutbreakRef.current = {
        playerAffected: !result.playerHasBody,
        enemyAffected: !result.enemyHasBody,
        turnsLeft: event.duration,
      }
    }

    // Track active duration events
    if (event.duration > 0) {
      setActiveEnvEvent({ event, turnsLeft: event.duration })
    }

    battleStatsRef.current.eventsTriggered++
    addLog(`🌍 环境事件：${event.emoji} ${event.name} — ${event.description}`)
    if (result.affected?.length > 0) {
      addLog(`   影响：${result.affected.join(', ')}`)
    }
  }

  // Tick virus outbreak damage each turn
  function tickVirusOutbreak() {
    const vo = virusOutbreakRef.current
    if (vo.turnsLeft <= 0) return
    if (vo.playerAffected) {
      setPlayerLeaderHp(prev => {
        const next = Math.max(0, prev - 500)
        if (next <= 0) { setWinner('enemy'); setPhase('over') }
        return next
      })
      addLog('🦠 病毒爆发：我方主人 -500 HP（无人体系保护）')
    }
    if (vo.enemyAffected) {
      setEnemyLeaderHp(prev => {
        const next = Math.max(0, prev - 500)
        if (next <= 0) { setWinner('player'); setPhase('over') }
        return next
      })
      addLog('🦠 病毒爆发：敌方主人 -500 HP（无人体系保护）')
    }
    virusOutbreakRef.current = { ...vo, turnsLeft: vo.turnsLeft - 1 }
  }

  // Tick active environment event duration
  function tickEnvEvent() {
    setActiveEnvEvent(prev => {
      if (!prev) return null
      const left = prev.turnsLeft - 1
      if (left <= 0) {
        addLog(`🌍 ${prev.event.emoji} ${prev.event.name} 效果结束`)
        return null
      }
      return { ...prev, turnsLeft: left }
    })
  }

  // ----------------------------------------------------------------
  //  事件卡效果执行器
  //  返回 { success, message, extraEvents }
  // ----------------------------------------------------------------
  function executeEventEffect(card, side, opts = {}) {
    const { drawCards, addToHand } = opts
    const friendlySetter = side === 'player' ? setPlayerField : setEnemyField
    const enemySetter = side === 'player' ? setEnemyField : setPlayerField
    const setEnergy = side === 'player' ? setPlayerEnergy : setEnemyEnergy
    const setLeaderHp = side === 'player' ? setPlayerLeaderHp : setEnemyLeaderHp
    const friendlyFieldRef = side === 'player' ? playerFieldRef : enemyFieldRef
    const enemyFieldRef_ = side === 'player' ? enemyFieldRef : playerFieldRef
    const setPB = side === 'player' ? setPlayerPowerBank : setEnemyPowerBank
    const discardRef = side === 'player' ? playerDiscardRef : enemyDiscardRef
    const setDiscardPile = side === 'player' ? setPlayerDiscard : setEnemyDiscard

    switch (card.effectType) {
      case 'energy': {
        // 回复能量
        setEnergy(prev => Math.min(prev + card.effectValue, ENERGY_CAP))
        addLog(`✨ ${card.name}：回复 ${card.effectValue} 点能量！`)
        return { success: true }
      }
      case 'buff': {
        // ATK buff — 加 atk_boost status 标记 buff 来源 + turnsLeft
        // 同时立即把 amount 加到 c.atk（让攻击/显示逻辑无需改）
        // 回合结束 processStatuses 会回退 atk 并移除 status
        const target = card.effectTarget
        if (target.startsWith('all_friendly')) {
          const factionFilter = target.includes('nature') ? 'nature'
            : target.includes('body') ? 'body'
            : target.includes('pathogen') ? 'pathogen'
            : target.includes('tech') ? 'tech' : null
          const turns = card.effectTurns || 1
          friendlySetter(prev => {
            return prev.map(c => {
              if (!c || c.currentHp <= 0) return c
              if (c.type === 'sp' || c.type === 'character') {
                if (factionFilter && c.faction !== factionFilter) return c
                const statuses = c.statuses ? [...c.statuses] : []
                statuses.push({
                  type: 'atk_boost',
                  amount: card.effectValue,
                  turnsLeft: turns,
                  source: card.id,
                })
                return { ...c, atk: c.atk + card.effectValue, statuses }
              }
              return c
            })
          })
          const fName = factionFilter ? FACTIONS[factionFilter]?.name : ''
          addLog(`✨ ${card.name}：所有己方${fName}生物卡 ATK +${card.effectValue}（持续${turns}回合）！`)
          if (target.includes('with_cost')) {
            friendlySetter(prev => prev.map(c => {
              if (!c || c.currentHp <= 0) return c
              return { ...c, currentHp: Math.max(1, c.currentHp - 500) }
            }))
            addLog(`🔥 发烧副作用：所有己方卡 HP -500`)
          }
        }
        return { success: true }
      }
      case 'damage': {
        const target = card.effectTarget
        if (target === 'all_enemy_damage') {
          // AOE damage to all enemy cards
          enemySetter(prev => prev.map(c => {
            if (!c || c.currentHp <= 0) return c
            return { ...c, currentHp: Math.max(0, c.currentHp - card.effectValue) }
          }))
          addLog(`💥 ${card.name}：对所有敌方卡造成 ${card.effectValue} 伤害！`)
        } else if (target === 'destroy_enemy_low_hp') {
          // Destroy one enemy card with HP <= threshold
          const eField = enemyFieldRef_.current
          const targetCard = eField.find(c => c && c.currentHp > 0 && c.currentHp <= card.effectValue)
          if (targetCard) {
            enemySetter(prev => prev.map(c => {
              if (c && c.uid === targetCard.uid) return { ...c, currentHp: 0 }
              return c
            }))
            addLog(`💀 ${card.name}：消灭了 ${targetCard.name}！`)
          } else {
            addLog(`✨ ${card.name}：没有符合条件的目标`)
          }
        } else if (target === 'one_enemy_poison') {
          // Poison one random enemy card
          const eField = enemyFieldRef_.current
          const alive = eField.filter(c => c && c.currentHp > 0)
          if (alive.length > 0) {
            const victim = alive[Math.floor(Math.random() * alive.length)]
            enemySetter(prev => prev.map(c => {
              if (!c || c.uid !== victim.uid) return c
              const statuses = c.statuses ? [...c.statuses] : []
              statuses.push({ type: 'poison', damage: card.effectValue, turnsLeft: 2 })
              return { ...c, statuses }
            }))
            addLog(`🧪 ${card.name}：${victim.name} 中毒！每回合 -${card.effectValue} HP，持续2回合`)
          }
        }
        return { success: true }
      }
      case 'heal': {
        const target = card.effectTarget
        if (target === 'one_ally_heal') {
          // Heal one friendly card with lowest HP
          const field = friendlyFieldRef.current
          const alive = field.filter(c => c && c.currentHp > 0 && c.currentHp < c.maxHp)
          if (alive.length > 0) {
            const lowest = alive.reduce((min, c) => c.currentHp < min.currentHp ? c : min, alive[0])
            friendlySetter(prev => prev.map(c => {
              if (!c || c.uid !== lowest.uid) return c
              return { ...c, currentHp: Math.min(c.maxHp, c.currentHp + card.effectValue) }
            }))
            addLog(`💚 ${card.name}：${lowest.name} 回复 ${card.effectValue} HP！`)
          }
        } else if (target === 'one_ally_body_shield') {
          // Shield one body faction ally
          const field = friendlyFieldRef.current
          const bodyAlive = field.filter(c => c && c.currentHp > 0 && c.faction === 'body')
          if (bodyAlive.length > 0) {
            const target = bodyAlive[Math.floor(Math.random() * bodyAlive.length)]
            friendlySetter(prev => prev.map(c => {
              if (!c || c.uid !== target.uid) return c
              const statuses = c.statuses ? [...c.statuses] : []
              statuses.push({ type: 'shield', amount: card.effectValue, source: card.name })
              return { ...c, statuses }
            }))
            addLog(`🛡️ ${card.name}：${target.name} 获得 ${card.effectValue} 护盾！`)
          }
        }
        return { success: true }
      }
      case 'draw': {
        if (card.effectTarget === 'draw_cards' && drawCards) {
          // Draw N cards
          const drawn = drawCards(card.effectValue)
          addLog(`📖 ${card.name}：抽了 ${drawn.length} 张牌！`)
        } else if (card.effectTarget === 'draw_filter_nature' && drawCards) {
          // Draw 3, keep nature, put rest back (simplified: just draw 2)
          const drawn = drawCards(2)
          addLog(`📖 ${card.name}：抽了 ${drawn.length} 张牌！`)
        }
        return { success: true }
      }
      case 'special': {
        const target = card.effectTarget
        if (target.startsWith('discard_to_hand')) {
          // Retrieve card from discard pile
          const faction = target.includes('nature') ? 'nature' : target.includes('body') ? 'body' : null
          const pile = discardRef.current
          const candidates = pile.filter(c => c.type === 'character' && (!faction || c.faction === faction))
          if (candidates.length > 0 && addToHand) {
            const chosen = candidates[candidates.length - 1] // most recent
            setDiscardPile(prev => {
              const idx = prev.findIndex(c => c.uid === chosen.uid)
              if (idx === -1) return prev
              return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
            })
            addToHand(chosen)
            addLog(`♻️ ${card.name}：${chosen.name} 从弃牌堆回到手牌！`)
          } else {
            addLog(`✨ ${card.name}：弃牌堆中没有符合条件的卡`)
          }
        } else if (target === 'revive_body_from_discard') {
          // Revive a body card from discard to field at 50% HP
          const pile = discardRef.current
          const candidates = pile.filter(c => c.type === 'character' && c.faction === 'body')
          const field = friendlyFieldRef.current
          const emptySlot = field.findIndex(c => !c || c.currentHp <= 0)
          if (candidates.length > 0 && emptySlot >= 0) {
            const chosen = candidates[candidates.length - 1]
            const revived = makeFieldCard(chosen)
            revived.currentHp = Math.round(revived.maxHp * 0.5)
            friendlySetter(prev => {
              const next = [...prev]
              next[emptySlot] = revived
              return next
            })
            summonedThisTurn.current.add(revived.uid)
            setDiscardPile(prev => {
              const idx = prev.findIndex(c => c.uid === chosen.uid)
              if (idx === -1) return prev
              return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
            })
            addLog(`💫 ${card.name}：${chosen.name} 从弃牌堆复活到战场！(50% HP)`)
          } else {
            addLog(`✨ ${card.name}：无法复活（没有候选或战场已满）`)
          }
        } else if (target === 'one_ally_pathogen_mutate') {
          // Mutate: ATK ×1.5, HP ×0.5 (permanent)
          const field = friendlyFieldRef.current
          const pathAlive = field.filter(c => c && c.currentHp > 0 && c.faction === 'pathogen')
          if (pathAlive.length > 0) {
            const chosen = pathAlive[Math.floor(Math.random() * pathAlive.length)]
            friendlySetter(prev => prev.map(c => {
              if (!c || c.uid !== chosen.uid) return c
              const newAtk = Math.ceil(c.atk * 1.5 / 500) * 500
              const newHp = Math.floor(c.currentHp * 0.5 / 500) * 500
              return { ...c, atk: newAtk, currentHp: Math.max(500, newHp), maxHp: Math.max(500, Math.floor(c.maxHp * 0.5 / 500) * 500) }
            }))
            addLog(`🧬 ${card.name}：${chosen.name} ATK ×1.5, HP ×0.5！突变！`)
          }
        } else if (target === 'one_ally_pathogen_immune_tech') {
          // Immune to tech for 1 turn
          const field = friendlyFieldRef.current
          const pathAlive = field.filter(c => c && c.currentHp > 0 && c.faction === 'pathogen')
          if (pathAlive.length > 0) {
            const chosen = pathAlive[Math.floor(Math.random() * pathAlive.length)]
            friendlySetter(prev => prev.map(c => {
              if (!c || c.uid !== chosen.uid) return c
              const statuses = c.statuses ? [...c.statuses] : []
              statuses.push({ type: 'immune_tech', turnsLeft: 1 })
              return { ...c, statuses }
            }))
            addLog(`🛡️ ${card.name}：${chosen.name} 获得1回合科技系免疫！`)
          }
        } else if (target === 'all_friendly_buff_and_powerbank') {
          // ATK +2000 to all + Power Bank +5（持续 N 回合，加 atk_boost status）
          const turns = card.effectTurns || 2
          friendlySetter(prev => prev.map(c => {
            if (!c || c.currentHp <= 0) return c
            const statuses = c.statuses ? [...c.statuses] : []
            statuses.push({
              type: 'atk_boost',
              amount: card.effectValue,
              turnsLeft: turns,
              source: card.id,
            })
            return { ...c, atk: c.atk + card.effectValue, statuses }
          }))
          setPB(prev => ({ ...prev, stored: prev.stored + 5 }))
          addLog(`✨ ${card.name}：全队 ATK +${card.effectValue}（持续${turns}回合），Power Bank +5！`)
        }
        return { success: true }
      }
      default:
        addLog(`✨ ${card.name} 效果生效！`)
        return { success: true }
    }
  }

  // ----------------------------------------------------------------
  //  SP 召唤规则匹配
  //  返回可用的 SP 卡列表
  // ----------------------------------------------------------------
  function getEligibleSpCards(summonRule, side, remainingEnergy = 0) {
    const spDeck = side === 'player' ? playerSpDeckRef.current : enemySpDeckRef.current
    const discardPile = side === 'player' ? playerDiscardRef.current : enemyDiscardRef.current
    const field = side === 'player' ? playerFieldRef.current : enemyFieldRef.current

    // 场上必须有空位
    const hasEmpty = field.some(c => !c || c.currentHp <= 0)
    if (!hasEmpty) return []

    if (!summonRule || spDeck.length === 0) return []

    let candidates = []
    switch (summonRule.type) {
      case 'cost_limit':
        candidates = spDeck.filter(sp => sp.spCost <= summonRule.maxCost)
        break
      case 'spend_all_energy':
        // After spending all remaining energy, match spCost <= that amount
        candidates = spDeck.filter(sp => sp.spCost <= remainingEnergy)
        break
      case 'faction_only': {
        const faction = summonRule.factionLimit
        candidates = spDeck.filter(sp => sp.faction === faction && sp.spCost <= (summonRule.maxCost || 99))
        break
      }
      case 'discard_check': {
        const markers = getFactionMarkers(discardPile)
        const needed = summonRule.discardCount || 0
        const faction = summonRule.discardFaction
        if (markers[faction] >= needed) {
          candidates = spDeck.filter(sp => sp.spCost <= (summonRule.maxCost || 99))
        }
        break
      }
      default:
        break
    }
    // 回合门槛（齐齐实测 bug：SP 第 1-2 回合就被召唤，严重失衡）：
    // SP 的 spCost 必须 ≤ 当前回合数 —— 高费 SP 自然推迟（cost5 超级细菌→第 5 回合起、
    // cost8 霸王龙→第 8 回合起），杜绝"一上来/第二回合就出 SP"。玩家与 AI 对称生效。
    return candidates.filter(sp => sp.spCost <= turnRef.current)
  }

  // ----------------------------------------------------------------
  //  SP 卡召唤到战场
  // ----------------------------------------------------------------
  const summonSpCard = useCallback((spCard, side) => {
    const fieldRef = side === 'player' ? playerFieldRef : enemyFieldRef
    const setter = side === 'player' ? setPlayerField : setEnemyField
    const setSpDeck = side === 'player' ? setPlayerSpDeck : setEnemySpDeck

    const field = fieldRef.current
    const emptySlot = field.findIndex(c => !c || c.currentHp <= 0)
    if (emptySlot < 0) return null

    const fieldCard = makeFieldCard(spCard)

    // Remove from SP deck
    setSpDeck(prev => {
      const idx = prev.findIndex(c => c.uid === spCard.uid)
      if (idx === -1) return prev
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)]
    })

    // Place on field
    setter(prev => {
      const next = [...prev]
      next[emptySlot] = fieldCard
      return next
    })

    // SP cards with Swift Attack can attack immediately, otherwise summoning sickness
    // Sprint 27: Swift Attack / Silent Dive / swift_boost status 都跳过召唤疲劳
    const hasSwift = spCard.skills?.some(s => s.nameEn === 'Swift Attack' || s.nameEn === 'Silent Dive')
      || fieldCard.statuses?.some(s => s.type === 'swift_boost')
    if (!hasSwift) {
      summonedThisTurn.current.add(fieldCard.uid)
    }

    addLog(`🌟 SP 觉醒！${spCard.name} 降临战场！`)
    if (side === 'player') battleStatsRef.current.spSummons++

    // Execute onPlay skills
    const friendlySetter = side === 'player' ? setPlayerField : setEnemyField
    const enemySetter = side === 'player' ? setEnemyField : setPlayerField
    const friendlyFieldCards = fieldRef.current.filter(Boolean)
    const enemyFieldCards = (side === 'player' ? enemyFieldRef : playerFieldRef).current.filter(Boolean)

    const playEvents = triggerSkills('onPlay', {
      card: fieldCard,
      friendlyField: friendlyFieldCards,
      enemyField: enemyFieldCards,
      playerHand: side === 'player' ? handsRef.current.playerHand : handsRef.current.enemyHand,
      enemyHand: side === 'player' ? handsRef.current.enemyHand : handsRef.current.playerHand,
      discardPile: side === 'player' ? playerDiscardRef.current : enemyDiscardRef.current,
      turn,
    })
    applySkillEvents(playEvents, friendlySetter, enemySetter, side)
    for (const evt of playEvents) {
      if (evt.message) addLog(`🌟 ${evt.message}`)
    }
    pushSkillEvents(playEvents)

    // Special SP skills that need manual handling
    // SP2 World Tree: Power Bank repair
    if (spCard.id === 'sp_world_tree') {
      const pbRef = side === 'player' ? playerPowerBankRef : enemyPowerBankRef
      const setPB = side === 'player' ? setPlayerPowerBank : setEnemyPowerBank
      // Heal all friendly 3000 HP
      friendlySetter(prev => prev.map(c => {
        if (!c || c.currentHp <= 0) return c
        return { ...c, currentHp: Math.min(c.maxHp, c.currentHp + 3000) }
      }))
      // Repair Power Bank
      if (!pbRef.current.intact) {
        setPB({ stored: 0, intact: true })
        addLog(`🌳 世界树修复了 Power Bank！`)
      }
      addLog(`🌳 世界树：所有友方卡回复 3000 HP！`)
    }

    // SP1 T-Rex: AOE 3000 damage
    if (spCard.id === 'sp_trex') {
      enemySetter(prev => prev.map(c => {
        if (!c || c.currentHp <= 0) return c
        return { ...c, currentHp: Math.max(0, c.currentHp - 3000) }
      }))
      addLog(`🦖 霸王龙：灭世咆哮！对所有敌方卡造成 3000 伤害！`)
    }

    // SP3 CAR-T: Destroy one pathogen
    if (spCard.id === 'sp_car_t_cell') {
      const eField = (side === 'player' ? enemyFieldRef : playerFieldRef).current
      const pathogen = eField.find(c => c && c.currentHp > 0 && c.faction === 'pathogen')
      if (pathogen) {
        enemySetter(prev => prev.map(c => {
          if (!c || c.uid !== pathogen.uid) return c
          return { ...c, currentHp: 0 }
        }))
        addLog(`🎯 CAR-T细胞：精准猎杀 ${pathogen.name}！`)
      }
    }

    // SP4 Brain: Reveal hand + swift for all (simplified: just ATK buff)
    if (spCard.id === 'sp_brain_awakening') {
      addLog(`🧠 大脑觉醒：揭示对方手牌，全队获得迅击！`)
      // Give swift to all friendly for 1 turn (simplified: clear summon sickness)
      const fField = fieldRef.current
      fField.forEach(c => {
        if (c && c.currentHp > 0) {
          summonedThisTurn.current.delete(c.uid)
        }
      })
    }

    // SP5 Super Bacteria: Remove shields, debuff tech
    if (spCard.id === 'sp_super_bacteria') {
      enemySetter(prev => prev.map(c => {
        if (!c || c.currentHp <= 0) return c
        const statuses = (c.statuses || []).filter(s => s.type !== 'shield')
        const newAtk = c.faction === 'tech' ? Math.floor(c.atk * 0.5) : c.atk
        return { ...c, statuses, atk: newAtk }
      }))
      addLog(`🦠 超级细菌：摧毁所有敌方护盾，科技系 ATK -50%！`)
      // 自身获得 immune_tech（抗药免疫：免疫科技系伤害）
      friendlySetter(prev => prev.map(c => {
        if (!c || c.id !== 'sp_super_bacteria') return c
        const statuses = c.statuses ? [...c.statuses] : []
        statuses.push({ type: 'immune_tech', turnsLeft: 99 })
        return { ...c, statuses }
      }))
      addLog(`🦠 超级细菌：抗药免疫激活！免疫科技系伤害！`)
    }

    // SP6 Ancient Virus: 5000 damage to leader
    if (spCard.id === 'sp_ancient_virus') {
      const setLeaderHp = side === 'player' ? setEnemyLeaderHp : setPlayerLeaderHp
      setLeaderHp(prev => {
        const next = Math.max(0, prev - 5000)
        if (next <= 0) { setWinner(side); setPhase('over') }
        return next
      })
      addLog(`🧊 远古病毒：冰封释放！对敌方主人造成 5000 伤害！`)
    }

    // SP7 Nanobot: Clear debuffs + 2000 shield to all
    if (spCard.id === 'sp_nanobot') {
      friendlySetter(prev => prev.map(c => {
        if (!c || c.currentHp <= 0) return c
        const statuses = (c.statuses || []).filter(s => s.type === 'shield') // keep shields, remove everything else
        statuses.push({ type: 'shield', amount: 2000, source: 'SP纳米机器人' })
        return { ...c, statuses }
      }))
      addLog(`🤖 纳米机器人：清除负面状态，全队获得 2000 护盾！`)
    }

    // SP8 CRISPR: Swap ATK/HP of one enemy (pick highest ATK)
    if (spCard.id === 'sp_crispr') {
      const eField = (side === 'player' ? enemyFieldRef : playerFieldRef).current
      const alive = eField.filter(c => c && c.currentHp > 0)
      if (alive.length > 0) {
        const target = alive.reduce((max, c) => c.atk > max.atk ? c : max, alive[0])
        enemySetter(prev => prev.map(c => {
          if (!c || c.uid !== target.uid) return c
          return { ...c, atk: c.currentHp, currentHp: c.atk, maxHp: c.atk }
        }))
        addLog(`✂️ CRISPR：${target.name} 的 ATK 和 HP 互换！`)
      }
    }

    // Cleanup dead cards from onPlay effects
    cleanupDeadCards(side === 'player' ? 'enemy' : 'player')

    return { slot: emptySlot, card: fieldCard }
  }, [addLog, pushSkillEvents, cleanupDeadCards])

  // ----------------------------------------------------------------
  //  玩家出事件卡
  // ----------------------------------------------------------------
  const playEventCard = useCallback((card, opts = {}) => {
    if (phase !== 'main') return { ok: false, msg: '现在不能出牌' }
    if (card.cost > playerEnergy) return { ok: false, msg: `能量不足（需要 ${card.cost}）` }

    // 1. Deduct energy
    setPlayerEnergy(prev => prev - card.cost)

    // 2. Execute effect
    executeEventEffect(card, 'player', opts)

    // 3. Card goes to discard pile
    setPlayerDiscard(prev => [...prev, card])
    addLog(`📜 事件卡 ${card.name} 进入弃牌堆`)

    // 4. Check SP summon
    let spCandidates = []
    if (card.spSummonRule) {
      let remainEnergy = playerEnergyRef.current
      if (card.spSummonRule.type === 'spend_all_energy') {
        // Consume all remaining energy
        remainEnergy = playerEnergyRef.current
        setPlayerEnergy(0)
        addLog(`⚡ 消耗所有剩余能量 ${remainEnergy} 点！`)
      }
      spCandidates = getEligibleSpCards(card.spSummonRule, 'player', remainEnergy)
      if (spCandidates.length > 0) {
        // Set pending SP summon for UI to handle selection
        setPendingSpSummon({ side: 'player', candidates: spCandidates, rule: card.spSummonRule })
        addLog(`🌟 可以召唤 SP 卡！选择一张...`)
      }
    }

    return { ok: true, spCandidates }
  }, [phase, playerEnergy, addLog])

  // ----------------------------------------------------------------
  //  AI 出事件卡
  // ----------------------------------------------------------------
  const aiPlayEventCard = useCallback((card, opts = {}) => {
    // 1. Deduct energy
    setEnemyEnergy(prev => prev - card.cost)

    // 2. Execute effect
    executeEventEffect(card, 'enemy', opts)

    // 3. Card goes to discard pile
    setEnemyDiscard(prev => [...prev, card])
    addLog(`🔴 📜 事件卡 ${card.name} 进入弃牌堆`)

    // 4. Check SP summon
    if (card.spSummonRule) {
      let remainEnergy = enemyEnergyRef.current
      if (card.spSummonRule.type === 'spend_all_energy') {
        remainEnergy = enemyEnergyRef.current
        setEnemyEnergy(0)
        addLog(`🔴 ⚡ 消耗所有剩余能量 ${remainEnergy} 点！`)
      }
      const candidates = getEligibleSpCards(card.spSummonRule, 'enemy', remainEnergy)
      if (candidates.length > 0) {
        // AI: 20% chance to "forget" SP summon
        if (Math.random() > 0.20) {
          // Pick highest spCost SP
          const chosen = candidates.reduce((best, sp) => sp.spCost > best.spCost ? sp : best, candidates[0])
          summonSpCard(chosen, 'enemy')
        } else {
          addLog(`🔴 敌方没有触发 SP 召唤`)
        }
      }
    }

    return { ok: true }
  }, [addLog, summonSpCard])

  // ----------------------------------------------------------------
  //  确认 SP 召唤选择（玩家 UI 回调）
  // ----------------------------------------------------------------
  const confirmSpSummon = useCallback((spCard) => {
    if (!pendingSpSummon) return
    summonSpCard(spCard, pendingSpSummon.side)
    setPendingSpSummon(null)
  }, [pendingSpSummon, summonSpCard])

  const cancelSpSummon = useCallback(() => {
    setPendingSpSummon(null)
    addLog('跳过 SP 召唤')
  }, [addLog])

  // ----------------------------------------------------------------
  //  环境事件 UI 回调
  // ----------------------------------------------------------------
  const dismissEnvEvent = useCallback(() => {
    const event = pendingEnvEvent
    if (!event) return
    applyEnvironmentEvent(event)
    setPendingEnvEvent(null)
  }, [pendingEnvEvent])

  // ----------------------------------------------------------------
  //  开始战斗
  // ----------------------------------------------------------------
  const startBattle = useCallback((spDecks = {}) => {
    setTurn(1)
    setPlayerEnergy(1)
    setEnemyEnergy(1)
    setPlayerLeaderHp(spDecks.playerLeaderHP || LEADER_HP)
    setEnemyLeaderHp(spDecks.enemyLeaderHP || LEADER_HP)
    setPlayerField(emptyField())
    setEnemyField(emptyField())
    setBattleLog(['⚔️ 战斗开始！'])
    setWinner(null)
    setSkillEvents([])
    setPlayerPowerBank({ stored: 0, intact: true })
    setEnemyPowerBank({ stored: 0, intact: true })
    setPlayerDiscard([])
    setEnemyDiscard([])
    // SP decks (give each card a uid)
    const pSp = (spDecks.player || []).map((c, i) => ({ ...c, uid: `sp_p_${c.id}_${i}` }))
    const eSp = (spDecks.enemy || []).map((c, i) => ({ ...c, uid: `sp_e_${c.id}_${i}` }))
    setPlayerSpDeck(pSp)
    setEnemySpDeck(eSp)
    setPendingSpSummon(null)
    setActiveEnvEvent(null)
    setPendingEnvEvent(null)
    recentEventsRef.current = []
    virusOutbreakRef.current = { playerAffected: false, enemyAffected: false, turnsLeft: 0 }
    battleStatsRef.current = { totalDamage: 0, kills: 0, quizCorrect: 0, quizTotal: 0, spSummons: 0, powerBankMax: 0, cardsPlayed: 0, eventsTriggered: 0 }
    summonedThisTurn.current.clear()
    attackedThisTurn.current.clear()
    quizStreakRef.current = 0
    setQuizStreak(0)
    setScientistMode({ active: false, turnsLeft: 0 })
    firstAttackDone.current = false
    lastQuizTurn.current = 0
    resetQuizHistory()
    // Boss 机制初始化
    campaignConfigRef.current = spDecks.campaignConfig || null
    bossStateRef.current = { phase: 1 }
    const mechId = spDecks.campaignConfig?.bossMechanic
    bossMechanicRef.current = mechId ? getBossMechanic(mechId) : null
    setBossMechanicEvents([])
    // Sprint 30b: Conundrum globalEffects 初始化（必须在 makeFieldCard 调用前设置）
    globalEffectsRef.current = Array.isArray(spDecks.globalEffects) ? spDecks.globalEffects : []
    if (globalEffectsRef.current.includes('antibiotic_weakened')) {
      addLog('🦠 细菌已耐药：本局所有抗生素卡 ATK 减半')
    }
    // 关卡特殊规则初始化
    const ruleId = spDecks.campaignConfig?.stageRule
    stageRuleRef.current = ruleId ? getStageRule(ruleId) : null
    // bossPreplaced: 预置 Boss 卡到敌方场上
    if (spDecks.bossPreplaced) {
      const bossCard = makeFieldCard(spDecks.bossPreplaced)
      setEnemyField(prev => {
        const next = [...prev]
        next[0] = bossCard
        return next
      })
      summonedThisTurn.current.add(bossCard.uid)
    }
    // Sprint 30b: preplaceEnemyCards (Conundrum enemyExtraTurns 等价实现)
    // 等待期间病毒扩散 → 战场上已经有 N 个敌方单位，且无召唤疲劳（可以立刻攻击）
    if (Array.isArray(spDecks.preplaceEnemyCards) && spDecks.preplaceEnemyCards.length > 0) {
      const cards = spDecks.preplaceEnemyCards.map(c => makeFieldCard(c)).filter(Boolean)
      setEnemyField(prev => {
        const next = [...prev]
        let slot = spDecks.bossPreplaced ? 1 : 0
        for (const c of cards) {
          while (slot < next.length && next[slot]) slot++
          if (slot >= next.length) break
          next[slot] = c
          slot++
        }
        return next
      })
      addLog(`🦠 等待期间，${cards.length} 个敌方单位已经入侵了战场！`)
      // 不加入 summonedThisTurn → 它们可以立刻攻击
    }
    setPhase('mulligan')
  }, [])

  // ----------------------------------------------------------------
  //  结束换卡 → 进入出牌阶段
  // ----------------------------------------------------------------
  const endMulligan = useCallback(() => {
    if (phase !== 'mulligan') return
    addLog('🔵 你的回合 1（能量 1）')
    setPhase('main')
  }, [phase, addLog])

  // ----------------------------------------------------------------
  //  出牌（Main Phase）
  // ----------------------------------------------------------------
  const playToField = useCallback((card, slotIdx) => {
    if (phase !== 'main') return { ok: false, msg: '现在不能出牌' }
    if (card.cost > playerEnergy) return { ok: false, msg: `能量不足（需要 ${card.cost}）` }
    if (slotIdx < 0 || slotIdx >= MAX_FIELD_SLOTS) return { ok: false, msg: '无效位置' }

    // Check faction requirement (SSR/high-cost cards need markers)
    if (card.factionRequirement) {
      if (!canPlayWithMarkers(card, playerDiscardRef.current)) {
        return { ok: false, msg: `需要弃牌堆中有 ${card.factionRequirement.count} 个${FACTIONS[card.factionRequirement.faction]?.name}标记` }
      }
    }

    let replaced = null
    setPlayerField(prev => {
      const next = [...prev]
      if (next[slotIdx] && next[slotIdx].currentHp > 0) {
        replaced = next[slotIdx]
      }
      next[slotIdx] = makeFieldCard(card)
      return next
    })

    setPlayerEnergy(prev => prev - card.cost)

    // Consume faction markers if needed
    if (card.factionRequirement?.type === 'consume') {
      const { updatedPile } = consumeFactionMarkers(
        playerDiscardRef.current,
        card.factionRequirement.faction,
        card.factionRequirement.count
      )
      setPlayerDiscard(updatedPile)
    }

    summonedThisTurn.current.add(card.uid)
    battleStatsRef.current.cardsPlayed++

    if (replaced) addLog(`${replaced.name} 被替换下场`)
    if (replaced) {
      setPlayerDiscard(prev => [...prev, replaced])
    }
    addLog(`出牌：${card.name}（费用 ${card.cost}）→ 位置 ${slotIdx + 1}`)

    // onPlay 技能触发（Oxygen Delivery, Clotting Shield 等）
    const playEvents = triggerSkills('onPlay', {
      card: makeFieldCard(card),
      friendlyField: playerFieldRef.current.filter(Boolean),
      enemyField: enemyFieldRef.current.filter(Boolean),
      playerHand: handsRef.current.playerHand,
      enemyHand: handsRef.current.enemyHand,
      discardPile: playerDiscardRef.current,
      turn,
    })
    applySkillEvents(playEvents, setPlayerField, setEnemyField, 'player')
    for (const evt of playEvents) {
      if (evt.message) addLog(evt.message)
    }
    pushSkillEvents(playEvents)

    return { ok: true, replaced, skillEvents: playEvents }
  }, [phase, playerEnergy, addLog, pushSkillEvents])

  // ----------------------------------------------------------------
  //  结束出牌 → 战斗阶段
  // ----------------------------------------------------------------
  const endMainPhase = useCallback(() => {
    if (phase !== 'main') return
    attackedThisTurn.current.clear()
    setPhase('battle')
    addLog('--- ⚔️ 战斗阶段 ---')
  }, [phase, addLog])

  // ----------------------------------------------------------------
  //  某张卡能否攻击
  // ----------------------------------------------------------------
  const canAttack = useCallback((slotIdx) => {
    if (phase !== 'battle') return false
    const card = playerField[slotIdx]
    if (!card || card.currentHp <= 0) return false
    if (attackedThisTurn.current.has(card.uid)) return false
    // Sprint 27: swift_boost status 也算迅击
    const hasSwift = card.skills?.some(s => s.nameEn === 'Swift Attack' || s.nameEn === 'Silent Dive')
      || card.statuses?.some(s => s.type === 'swift_boost')
    if (summonedThisTurn.current.has(card.uid) && !hasSwift) return false
    // 沉睡状态无法攻击
    if (card.statuses?.some(s => s.type === 'sleep')) return false
    return true
  }, [phase, playerField])

  // ----------------------------------------------------------------
  //  玩家攻击
  //  defSlot: 0-4 打卡，-1 直攻主人
  // ----------------------------------------------------------------
  const attack = useCallback((atkSlot, defSlot, awakenOpts = {}) => {
    if (phase !== 'battle') return null
    const atkCard = playerField[atkSlot]
    if (!atkCard || atkCard.currentHp <= 0) return null

    // 沉睡状态无法攻击
    if (atkCard.statuses?.some(s => s.type === 'sleep')) {
      addLog(`${atkCard.name} 正在沉睡中，无法攻击`)
      return null
    }
    // Sprint 26: 混乱状态 — 玩家的卡被操控，自动攻击随机友方
    if (atkCard.statuses?.some(s => s.type === 'confused')) {
      const friendlyTargets = playerField
        .map((c, i) => ({ c, i }))
        .filter(({ c, i }) => c && c.currentHp > 0 && c.uid !== atkCard.uid)
      if (friendlyTargets.length > 0) {
        const pick = friendlyTargets[Math.floor(Math.random() * friendlyTargets.length)]
        addLog(`🧠 ${atkCard.name} 被操控了！攻击了自己人 ${pick.c.name}！`)
        const dmg = atkCard.atk
        setPlayerField(prev => {
          const next = prev.map(c => c ? { ...c } : null)
          if (next[pick.i]) next[pick.i].currentHp = Math.max(0, next[pick.i].currentHp - dmg)
          return next
        })
        attackedThisTurn.current.add(atkCard.uid)
        return { confusedHit: true }
      }
    }
    // 召唤疲劳（Sprint 27: swift_boost / Silent Dive 也跳过疲劳）
    const hasSwift = atkCard.skills?.some(s => s.nameEn === 'Swift Attack' || s.nameEn === 'Silent Dive')
      || atkCard.statuses?.some(s => s.type === 'swift_boost')
    if (summonedThisTurn.current.has(atkCard.uid) && !hasSwift) {
      addLog(`${atkCard.name} 刚上场，不能攻击（召唤疲劳）`)
      return null
    }
    if (attackedThisTurn.current.has(atkCard.uid)) {
      addLog(`${atkCard.name} 本回合已攻击过`)
      return null
    }

    attackedThisTurn.current.add(atkCard.uid)

    // === 直攻主人 ===
    if (defSlot === -1) {
      if (hasGuard(enemyField)) {
        addLog('对方有守护卡，必须先攻击守护卡！')
        attackedThisTurn.current.delete(atkCard.uid)
        return null
      }

      // onAttack 技能（Rush 等）
      const atkEvents = triggerSkills('onAttack', {
        attacker: atkCard,
        target: 'leader',
        damageMultiplier: 1,
      })
      let dmgOpts = { ...awakenOpts }
      for (const evt of atkEvents) {
        if (evt.message) addLog(evt.message)
        if (evt.type === 'RUSH_BOOST') dmgOpts.damageMultiplier = (dmgOpts.damageMultiplier || 1) * 2
      }
      pushSkillEvents(atkEvents)

      const dmg = calcLeaderDamage(atkCard, dmgOpts)
      let gameWon = false
      setEnemyLeaderHp(prev => {
        const next = Math.max(0, prev - dmg)
        if (next <= 0) { setWinner('player'); setPhase('over'); gameWon = true }
        return next
      })
      addLog(`${atkCard.name} 直攻主人！造成 ${dmg} 伤害`)
      battleStatsRef.current.totalDamage += dmg
      if (!gameWon) checkBossHPThreshold()
      return { atkDmg: dmg, defDmg: 0, defKilled: false, atkKilled: false, leaderHit: true, gameWon }
    }

    // === 打对方场上卡 ===
    const defCard = enemyField[defSlot]
    if (!defCard || defCard.currentHp <= 0) return null

    if (hasGuard(enemyField) && !isGuardCard(defCard)) {
      addLog('必须先攻击守护卡！')
      attackedThisTurn.current.delete(atkCard.uid)
      return null
    }

    // onAttack / onHit 技能（Discharge Strike 等）
    const preAtkEvents = triggerSkills('onAttack', {
      attacker: atkCard, defender: defCard, target: 'card',
      defSlot, enemyField: enemyFieldRef.current,
    })
    const preHitEvents = triggerSkills('onHit', { attacker: atkCard, defender: defCard })
    const allPreEvents = [...preAtkEvents, ...preHitEvents]
    applySkillEvents(allPreEvents, setPlayerField, setEnemyField, 'player')
    for (const evt of allPreEvents) {
      if (evt.message) addLog(evt.message)
    }
    pushSkillEvents(allPreEvents)

    const { atkDmg, defDmg, atkFactionBonus, defFactionBonus, defImmune, auraApplied } = calcCardBattle(atkCard, defCard, {
      ...awakenOpts,
      attackerField: playerFieldRef.current,
      defenderField: enemyFieldRef.current,
    })
    let defKilled = false, atkKilled = false

    if (defImmune) addLog(`🛡️ ${defCard.name} 免疫了攻击！`)
    if (atkFactionBonus) addLog(`⚡ ${atkCard.name} 克制 ${defCard.name}！伤害 +20%`)
    if (defFactionBonus) addLog(`⚡ ${defCard.name} 克制 ${atkCard.name}！反击 +20%`)
    if (auraApplied) addLog(`🌀 光环效果生效！`)

    // 伤害计算（含护盾吸收）
    let defActualDmg = atkDmg
    let defShieldAbsorbed = 0
    const defShield = defCard.statuses?.find(s => s.type === 'shield')
    if (defShield) {
      defShieldAbsorbed = Math.min(defShield.amount, atkDmg)
      defActualDmg = Math.max(0, atkDmg - defShield.amount)
    }

    let atkActualDmg = defDmg
    let atkShieldAbsorbed = 0
    const atkShield = atkCard.statuses?.find(s => s.type === 'shield')
    if (atkShield) {
      atkShieldAbsorbed = Math.min(atkShield.amount, defDmg)
      atkActualDmg = Math.max(0, defDmg - atkShield.amount)
    }

    setEnemyField(prev => {
      const next = prev.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses.map(s => ({...s}))] : [] } : null)
      if (defShield) applyShieldAbsorb(next[defSlot], atkDmg)
      next[defSlot].currentHp = Math.max(0, next[defSlot].currentHp - defActualDmg)
      if (next[defSlot].currentHp <= 0) defKilled = true
      return next
    })
    setPlayerField(prev => {
      const next = prev.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses.map(s => ({...s}))] : [] } : null)
      if (atkShield) applyShieldAbsorb(next[atkSlot], defDmg)
      next[atkSlot].currentHp = Math.max(0, next[atkSlot].currentHp - atkActualDmg)
      if (next[atkSlot].currentHp <= 0) atkKilled = true
      return next
    })

    if (defShieldAbsorbed > 0) addLog(`🛡️ ${defCard.name} 护盾吸收 ${defShieldAbsorbed} 伤害！`)
    if (atkShieldAbsorbed > 0) addLog(`🛡️ ${atkCard.name} 护盾吸收 ${atkShieldAbsorbed} 伤害！`)

    addLog(
      `${atkCard.name} ⚔️ ${defCard.name}：造成 ${atkDmg}，受反击 ${defDmg}` +
      (defKilled ? ` → ${defCard.name} 被击败！` : '') +
      (atkKilled ? ` → ${atkCard.name} 也倒下了！` : '')
    )

    // 技能后处理（Overpower / Piercing / onDeath）
    const postEvents = handlePostAttackSkills(atkCard, defCard, atkDmg, defKilled, 'player')
    pushSkillEvents(postEvents)

    // Stats tracking
    battleStatsRef.current.totalDamage += atkDmg
    if (defKilled) battleStatsRef.current.kills++

    // 清理死亡卡牌
    if (defKilled) cleanupDeadCards('enemy')
    if (atkKilled) cleanupDeadCards('player')

    return {
      atkDmg, defDmg, defKilled, atkKilled, leaderHit: false, gameWon: false,
      atkFactionBonus, defFactionBonus, skillEvents: postEvents,
    }
  }, [phase, playerField, enemyField, addLog, pushSkillEvents, cleanupDeadCards])

  // ----------------------------------------------------------------
  //  结束战斗阶段 → 敌方回合
  // ----------------------------------------------------------------
  const endBattlePhase = useCallback(() => {
    if (phase !== 'battle') return
    // 玩家回合结束时的 onTurnEnd 技能
    const endEvents = processEndOfTurnEffects('player')
    pushSkillEvents(endEvents)
    // 玩家剩余能量流入 Power Bank
    processEndPhase('player')
    addLog('--- 玩家回合结束 ---')

    // Boss onTurnEnd 钩子（玩家回合结束 = 敌方视角的回合结束）
    const boss = bossMechanicRef.current
    if (boss?.onTurnEnd) {
      const bossEvents = boss.onTurnEnd({
        enemyField: enemyFieldRef.current,
        setEnemyField,
        addLog,
      })
      if (bossEvents?.length > 0) {
        setBossMechanicEvents(prev => [...prev, ...bossEvents])
      }
    }

    setPhase('enemyTurn')
  }, [phase, addLog, pushSkillEvents])

  // ----------------------------------------------------------------
  //  敌方回合开始：刷新能量
  // ----------------------------------------------------------------
  const beginEnemyTurn = useCallback(() => {
    const t = turnRef.current
    let gain = Math.min(Math.ceil(t / 2) + 1, ENERGY_CAP)
    // 能量不再累积：剩余能量已流入 Power Bank，新回合只获得 gain
    setEnemyEnergy(gain)
    addLog(`\n🔴 敌方回合（能量 ${gain}）`)
    // onTurnStart 技能（向日葵/线粒体充能、蚁后召唤、变形虫、肝/肾、超算）
    const tsEvents = processTurnStartEffects('enemy')
    // 充能须反映到 AI 本回合可用能量：applySkillEvents 已更新 enemyEnergy state，
    // 但 AI 出牌按本函数返回值核算，故把 ENERGY_BOOST 同步进 gain（与 state 一致，封顶 ENERGY_CAP）
    const energyBoost = tsEvents.reduce((s, e) => s + (e.type === 'ENERGY_BOOST' ? (e.amount || 0) : 0), 0)
    if (energyBoost > 0) gain = Math.min(ENERGY_CAP, gain + energyBoost)
    return gain
  }, [addLog])

  // ----------------------------------------------------------------
  //  AI 出牌到场上
  // ----------------------------------------------------------------
  const aiPlayToField = useCallback((card, slotIdx) => {
    setEnemyField(prev => {
      const next = [...prev]
      next[slotIdx] = makeFieldCard(card)
      return next
    })
    setEnemyEnergy(prev => prev - card.cost)

    // Consume faction markers if needed
    if (card.factionRequirement?.type === 'consume') {
      const { updatedPile } = consumeFactionMarkers(
        enemyDiscardRef.current,
        card.factionRequirement.faction,
        card.factionRequirement.count
      )
      setEnemyDiscard(updatedPile)
    }

    summonedThisTurn.current.add(card.uid)
    addLog(`🔴 敌方出牌：${card.name}（费用 ${card.cost}）→ 位置 ${slotIdx + 1}`)

    // onPlay 技能触发（Oxygen Delivery, Clotting Shield 等）
    const playEvents = triggerSkills('onPlay', {
      card: makeFieldCard(card),
      friendlyField: enemyFieldRef.current.filter(Boolean),
      enemyField: playerFieldRef.current.filter(Boolean),
      playerHand: handsRef.current.enemyHand,
      enemyHand: handsRef.current.playerHand,
      discardPile: enemyDiscardRef.current,
      turn,
    })
    applySkillEvents(playEvents, setEnemyField, setPlayerField, 'enemy')
    for (const evt of playEvents) {
      if (evt.message) addLog(`🔴 ${evt.message}`)
    }

    // 关卡特殊规则：敌方出牌后触发（丛林迷雾隐身等）
    if (stageRuleRef.current?.onEnemyCardPlayed) {
      const fieldCard = enemyFieldRef.current[slotIdx]
      if (fieldCard) {
        const ruleEvents = stageRuleRef.current.onEnemyCardPlayed({
          card: fieldCard,
          setEnemyField,
          addLog,
        })
        if (ruleEvents?.length > 0) {
          setBossMechanicEvents(prev => [...prev, ...ruleEvents])
        }
      }
    }

    return playEvents
  }, [addLog])

  // ----------------------------------------------------------------
  //  AI 攻击（单次，返回结果）
  // ----------------------------------------------------------------
  const aiAttack = useCallback((atkSlot, defSlot) => {
    let eField = enemyFieldRef.current
    let pField = playerFieldRef.current
    const atkCard = eField[atkSlot]
    if (!atkCard || atkCard.currentHp <= 0) return null

    // 沉睡状态检查
    if (atkCard.statuses?.some(s => s.type === 'sleep')) {
      addLog(`🔴 ${atkCard.name} 正在沉睡中，无法攻击`)
      return { skipped: true }
    }
    // Sprint 26: 混乱状态 — 攻击目标改为随机友方（攻击自己人）
    if (atkCard.statuses?.some(s => s.type === 'confused')) {
      const friendlyTargets = eField
        .map((c, i) => ({ c, i }))
        .filter(({ c, i }) => c && c.currentHp > 0 && c.uid !== atkCard.uid)
      if (friendlyTargets.length > 0) {
        const pick = friendlyTargets[Math.floor(Math.random() * friendlyTargets.length)]
        addLog(`🧠 ${atkCard.name} 被操控了！攻击了自己人 ${pick.c.name}！`)
        // 简化实现：直接扣友方 HP + 攻击者反击受伤（符合普通卡牌对打规则）
        const dmg = atkCard.atk
        setEnemyField(prev => {
          const next = prev.map(c => c ? { ...c } : null)
          if (next[pick.i]) next[pick.i].currentHp = Math.max(0, next[pick.i].currentHp - dmg)
          return next
        })
        return { skipped: false, confusedHit: true }
      }
    }
    // 召唤疲劳检查（Sprint 27: swift_boost / Silent Dive 也跳过疲劳）
    const hasSwift = atkCard.skills?.some(s => s.nameEn === 'Swift Attack' || s.nameEn === 'Silent Dive')
      || atkCard.statuses?.some(s => s.type === 'swift_boost')
    if (summonedThisTurn.current.has(atkCard.uid) && !hasSwift) {
      addLog(`🔴 ${atkCard.name} 召唤疲劳，无法攻击`)
      return { skipped: true }
    }

    // 直攻主人
    if (defSlot === -1) {
      // onAttack 技能（Rush）
      const atkEvents = triggerSkills('onAttack', {
        attacker: atkCard,
        target: 'leader',
        damageMultiplier: 1,
      })
      let dmgOpts = {}
      for (const evt of atkEvents) {
        if (evt.message) addLog(`🔴 ${evt.message}`)
        if (evt.type === 'RUSH_BOOST') dmgOpts.damageMultiplier = (dmgOpts.damageMultiplier || 1) * 2
      }

      const dmg = calcLeaderDamage(atkCard, dmgOpts)
      let gameOver = false
      setPlayerLeaderHp(prev => {
        const next = Math.max(0, prev - dmg)
        if (next <= 0) { setWinner('enemy'); setPhase('over'); gameOver = true }
        return next
      })
      addLog(`🔴 ${atkCard.name} 直攻主人！造成 ${dmg} 伤害`)
      return { atkDmg: dmg, defDmg: 0, defKilled: false, atkKilled: false, leaderHit: true, gameOver }
    }

    // 打玩家场上卡
    const defCard = pField[defSlot]
    if (!defCard || defCard.currentHp <= 0) return null

    // onAttack / onHit（Discharge Strike 等）
    const preAtkEvents = triggerSkills('onAttack', {
      attacker: atkCard, defender: defCard, target: 'card',
      defSlot, enemyField: playerFieldRef.current,
    })
    const preHitEvents = triggerSkills('onHit', { attacker: atkCard, defender: defCard })
    const allPreEvents = [...preAtkEvents, ...preHitEvents]
    applySkillEvents(allPreEvents, setEnemyField, setPlayerField, 'enemy')
    for (const evt of allPreEvents) {
      if (evt.message) addLog(`🔴 ${evt.message}`)
    }

    const { atkDmg, defDmg, atkFactionBonus, defFactionBonus } = calcCardBattle(atkCard, defCard, {
      attackerField: enemyFieldRef.current,
      defenderField: playerFieldRef.current,
    })
    let defKilled = false, atkKilled = false

    if (atkFactionBonus) addLog(`🔴 ⚡ ${atkCard.name} 克制 ${defCard.name}！伤害 +20%`)
    if (defFactionBonus) addLog(`⚡ ${defCard.name} 克制 ${atkCard.name}！反击 +20%`)

    // 伤害计算（含护盾吸收）
    let defActualDmg = atkDmg
    let defShieldAbsorbed = 0
    const defShield = defCard.statuses?.find(s => s.type === 'shield')
    if (defShield) {
      defShieldAbsorbed = Math.min(defShield.amount, atkDmg)
      defActualDmg = Math.max(0, atkDmg - defShield.amount)
    }

    let atkActualDmg = defDmg
    let atkShieldAbsorbed = 0
    const atkShield = atkCard.statuses?.find(s => s.type === 'shield')
    if (atkShield) {
      atkShieldAbsorbed = Math.min(atkShield.amount, defDmg)
      atkActualDmg = Math.max(0, defDmg - atkShield.amount)
    }

    setPlayerField(prev => {
      const next = prev.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses.map(s => ({...s}))] : [] } : null)
      if (defShield) applyShieldAbsorb(next[defSlot], atkDmg)
      next[defSlot].currentHp = Math.max(0, next[defSlot].currentHp - defActualDmg)
      if (next[defSlot].currentHp <= 0) defKilled = true
      return next
    })
    setEnemyField(prev => {
      const next = prev.map(c => c ? { ...c, statuses: c.statuses ? [...c.statuses.map(s => ({...s}))] : [] } : null)
      if (atkShield) applyShieldAbsorb(next[atkSlot], defDmg)
      next[atkSlot].currentHp = Math.max(0, next[atkSlot].currentHp - atkActualDmg)
      if (next[atkSlot].currentHp <= 0) atkKilled = true
      return next
    })

    if (defShieldAbsorbed > 0) addLog(`🛡️ ${defCard.name} 护盾吸收 ${defShieldAbsorbed} 伤害！`)
    if (atkShieldAbsorbed > 0) addLog(`🛡️ ${atkCard.name} 护盾吸收 ${atkShieldAbsorbed} 伤害！`)

    addLog(
      `🔴 ${atkCard.name} ⚔️ ${defCard.name}：造成 ${atkDmg}，受反击 ${defDmg}` +
      (defKilled ? ` → ${defCard.name} 被击败！` : '') +
      (atkKilled ? ` → ${atkCard.name} 也倒下了！` : '')
    )

    // 技能后处理
    handlePostAttackSkills(atkCard, defCard, atkDmg, defKilled, 'enemy')

    // 清理死亡卡牌
    if (defKilled) cleanupDeadCards('player')
    if (atkKilled) cleanupDeadCards('enemy')

    return {
      atkDmg, defDmg, defKilled, atkKilled, leaderHit: false, gameOver: false,
      atkFactionBonus, defFactionBonus,
    }
  }, [addLog, cleanupDeadCards])

  // ----------------------------------------------------------------
  //  开始玩家新回合
  // ----------------------------------------------------------------
  function startPlayerTurn() {
    // 敌方回合结束时的 onTurnEnd 技能
    processEndOfTurnEffects('enemy')
    // 敌方剩余能量流入 Power Bank
    processEndPhase('enemy')

    const newTurn = turnRef.current + 1
    const gain = Math.min(Math.ceil(newTurn / 2) + 1, ENERGY_CAP)
    // 能量不再累积：剩余能量已流入 Power Bank，新回合只获得 gain
    setTurn(newTurn)
    setPlayerEnergy(gain)
    addLog(`\n🔵 你的回合 ${newTurn}（能量 ${gain}）`)
    summonedThisTurn.current.clear()
    attackedThisTurn.current.clear()

    // onTurnStart 技能（向日葵/线粒体充能、蚁后召唤、变形虫、肝/肾、超算）
    // 必须在 summonedThisTurn.clear() 之后：蚁后新召唤的蚂蚁需保留召唤疲劳（本回合不能攻击）
    processTurnStartEffects('player')

    // Boss onTurnStart 钩子（玩家新回合开始时触发）
    const boss = bossMechanicRef.current
    if (boss?.onTurnStart) {
      const config = campaignConfigRef.current
      const bossEvents = boss.onTurnStart({
        turn: newTurn,
        playerField: playerFieldRef.current,
        setPlayerField,
        enemyField: enemyFieldRef.current,
        setEnemyField,
        enemyLeaderHp: enemyLeaderHpRef.current,
        maxLeaderHP: config?.leaderHP || LEADER_HP,
        setEnemyLeaderHp,
        addLog,
        bossState: bossStateRef.current,
      })
      if (bossEvents?.length > 0) {
        setBossMechanicEvents(prev => [...prev, ...bossEvents])
      }
    }

    // 关卡特殊规则 onTurnStart
    const stageRule = stageRuleRef.current
    if (stageRule?.onTurnStart) {
      const ruleEvents = stageRule.onTurnStart({
        turn: newTurn,
        playerField: playerFieldRef.current,
        setPlayerField,
        enemyField: enemyFieldRef.current,
        setEnemyField,
        playerLeaderHp: playerLeaderHpRef.current,
        setPlayerLeaderHp: setPlayerLeaderHp,
        addLog,
      })
      if (ruleEvents?.length > 0) {
        setBossMechanicEvents(prev => [...prev, ...ruleEvents])
      }
    }

    // 环境事件 tick
    tickEnvEvent()
    tickVirusOutbreak()

    // 每3回合触发新环境事件
    const envEvent = tryEnvironmentEvent(newTurn)
    if (envEvent) {
      setPendingEnvEvent(envEvent)
      // 效果在 UI 弹窗关闭后由 BattleScreen 调用 applyPendingEnvEvent
    }

    // 科学家模式倒计时
    setScientistMode(prev => {
      if (!prev.active) return prev
      const left = prev.turnsLeft - 1
      if (left <= 0) {
        addLog('🔬 科学家模式结束')
        return { active: false, turnsLeft: 0 }
      }
      return { ...prev, turnsLeft: left }
    })

    setPhase('main')
  }

  // ----------------------------------------------------------------
  //  问答觉醒
  // ----------------------------------------------------------------
  const tryQuiz = useCallback(() => {
    const currentTurn = turnRef.current

    // 首次攻击必触发
    if (!firstAttackDone.current) {
      firstAttackDone.current = true
      // fall through to trigger
    } else {
      // 之后每3回合触发一次（距上次触发 >= 3 回合）
      if (currentTurn - lastQuizTurn.current < 3) return null
    }

    lastQuizTurn.current = currentTurn

    // 收集当前战场上所有卡牌的 id
    const battleCardIds = [
      ...playerFieldRef.current.filter(Boolean).map(c => c.id),
      ...enemyFieldRef.current.filter(Boolean).map(c => c.id),
    ]
    const quiz = getRandomQuiz({ battleCardIds, streak: quizStreakRef.current })
    setCurrentQuiz(quiz)
    return quiz
  }, [])

  const answerQuiz = useCallback((chosenIdx) => {
    if (!currentQuiz) return {}
    const correct = chosenIdx === currentQuiz.correct
    setCurrentQuiz(null)
    battleStatsRef.current.quizTotal++

    if (correct) {
      battleStatsRef.current.quizCorrect++
      quizStreakRef.current += 1
      const newStreak = quizStreakRef.current
      setQuizStreak(newStreak)
      addLog(`🌟 觉醒！ATK ×2.0！(连续答对 ${newStreak} 题)${currentQuiz.fact ? `\n📖 ${currentQuiz.fact}` : ''}`)

      // 连续答对3题 → 触发科学家模式（全队 ATK +20% 持续2回合）
      let scientistTriggered = false
      if (newStreak >= 3 && !scientistMode.active) {
        setScientistMode({ active: true, turnsLeft: 2 })
        addLog('🔬 科学家模式激活！全队 ATK +20%，持续 2 回合！')
        scientistTriggered = true
      }

      return { awakened: true, fact: currentQuiz.fact, streak: newStreak, scientistTriggered }
    }
    quizStreakRef.current = 0
    setQuizStreak(0)
    addLog(`❌ 答错了，正常攻击${currentQuiz.fact ? `\n📖 ${currentQuiz.fact}` : ''}`)
    return { fact: currentQuiz.fact, streak: 0 }
  }, [currentQuiz, addLog, scientistMode.active])

  // ----------------------------------------------------------------
  //  动画控制
  // ----------------------------------------------------------------
  const setAnimating = useCallback(() => setPhase('animating'), [])
  const restorePhase = useCallback((p) => setPhase(p), [])

  return {
    turn, phase, winner,
    playerEnergy, enemyEnergy,
    playerLeaderHp, enemyLeaderHp,
    playerField, enemyField,
    battleLog, currentQuiz,
    skillEvents,
    playerPowerBank, enemyPowerBank,
    playerDiscard, enemyDiscard, playerDiscardRef, enemyDiscardRef,
    quizStreak, scientistMode,
    // SP system
    playerSpDeck, enemySpDeck, pendingSpSummon,
    // Environment events
    activeEnvEvent, pendingEnvEvent,
    // Boss mechanics
    bossMechanicEvents, setBossMechanicEvents,
    campaignConfigRef, bossStateRef,

    startBattle, endMulligan, startPlayerTurn,
    playToField, endMainPhase,
    canAttack, attack, endBattlePhase,
    beginEnemyTurn, aiPlayToField, aiAttack,
    breakPowerBank,
    // Event + SP
    playEventCard, aiPlayEventCard, confirmSpSummon, cancelSpSummon, summonSpCard, dismissEnvEvent,
    getEligibleSpCards,
    tryQuiz, answerQuiz,
    setAnimating, restorePhase,
    setPlayerField, setEnemyField, addLog,
    pushSkillEvents, clearSkillEvents, cleanupDeadCards,
    setHandRefs,  // Sprint 27: BattleScreen 注入手牌引用
    // Refs
    playerFieldRef, enemyFieldRef, playerLeaderHpRef, enemyLeaderHpRef,
    playerPowerBankRef, enemyPowerBankRef, playerSpDeckRef, enemySpDeckRef,
    playerEnergyRef, enemyEnergyRef,
    battleStatsRef,
  }
}
