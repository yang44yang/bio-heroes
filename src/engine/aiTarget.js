// AI 选靶纯函数 —— 从 useAITurn 的攻击循环抽出（E4 抽 hook 之后又一刀），可单测、与 React/音效解耦。
// 五档优先级：
//   T1 守护强制（有守护卡且攻击者不无视守护 → 必打守护卡）
//   T2 场上零卡（全员隐身/空场）→ 直攻主人（-1）
//   T3 aiPersonality 概率直攻主人（残血/一击必杀时概率更高）
//   T4 最优攻击（aiStrength 命中）：能一击杀的目标里挑 ATK 最大；否则打场上 ATK 最大
//   T5 随机攻击（弱 AI）
// rng 注入（默认 Math.random）→ 测试喂确定性序列即可断言 T3/T4/T5 分支；调用点保持原样（默认 rng）行为不变。
// 显式 .js 后缀：让本模块可被 scripts/test-*.mjs 用 plain node 直接 import（Vite 亦兼容）。
import { cardHasGuard, attackerBypassesGuard } from '../utils/guardSkill.js'
import { LEADER_HP } from '../data/deckRules.js'

/**
 * 选一个攻击目标 slot。
 * @returns {number} -1 = 直攻主人；否则为玩家战场的 slot 下标。
 */
export function pickAiTarget({
  atkCard,
  playerField,
  aiPersonality = 'balanced',
  aiStrength = 0.5,
  leaderHp,
  leaderMaxHp = LEADER_HP,
  rng = Math.random,
} = {}) {
  // 排除隐身 stealth 卡（与玩家选靶对称）；全员隐身/空场 → pAlive 空 → 直攻主人
  const pAlive = (playerField || [])
    .map((c, i) => (c && c.currentHp > 0 && !c.statuses?.some(s => s.type === 'stealth')) ? { ...c, slot: i } : null)
    .filter(Boolean)
  const guardCards = pAlive.filter(cardHasGuard)
  // 无视守护的攻击者（精准切除 / 抗原锁定打标记）不被守护强制
  const bypassGuard = attackerBypassesGuard(atkCard, null) || pAlive.some(c => attackerBypassesGuard(atkCard, c))

  // T1: 守护强制
  if (guardCards.length > 0 && !bypassGuard) return guardCards[0].slot
  // T2: 场上零卡 → 直攻主人
  if (pAlive.length === 0) return -1

  // T3: 基于 aiPersonality 的直攻主人概率
  const leaderHpPercent = leaderHp / leaderMaxHp
  let faceChance = 0
  if (aiPersonality === 'aggressive') {
    faceChance = 0.35
    if (leaderHpPercent < 0.5) faceChance = 0.5
    if (leaderHpPercent < 0.3) faceChance = 0.7
    if (atkCard.atk >= leaderHp) faceChance = 0.95
  } else if (aiPersonality === 'balanced') {
    faceChance = 0.1
    if (atkCard.atk >= leaderHp) faceChance = 0.8
  } else {
    faceChance = 0
    if (atkCard.atk >= leaderHp) faceChance = 0.6
  }
  if (rng() < faceChance) return -1

  // T4: 最优攻击 — 能一击杀的里挑最大威胁；否则打最大 ATK
  if (rng() < aiStrength) {
    const killable = pAlive.filter(c => atkCard.atk >= c.currentHp).sort((a, b) => b.atk - a.atk)
    if (killable.length > 0) return killable[0].slot
    return pAlive.reduce((max, c) => c.atk > max.atk ? c : max, pAlive[0]).slot
  }
  // T5: 随机攻击
  return pAlive[Math.floor(rng() * pAlive.length)].slot
}
