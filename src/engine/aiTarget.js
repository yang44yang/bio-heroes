// AI 决策纯函数 —— 与 React/音效解耦，可单测。
//
// 本文件放的是 AI 的**人格**（怎么选），不是**规则**（能不能）。
// 规则住 engine/rules.js（side-blind，两侧共用）；人格只属于 AI。
// de-fork 之后这条界线尤其要守住：引擎不该知道「敌方会挑费用最高的 SP」这种事。
//
// 选靶纯函数 —— 从 useAITurn 的攻击循环抽出（E4 抽 hook 之后又一刀）。
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

/**
 * AI 从翻出的 SP 候选里选一张（**人格，不是规则**）。
 *
 * 从 useBattle 搬出来（S6 de-fork）。此前这段逻辑内联在引擎的两个地方：
 *   · `aiPlayEventCard`：`if (Math.random() > 0.20) { candidates.reduce(spCost 最高) } else { 敌方没有触发 SP 召唤 }`
 *   · `tryTriggerSp`：`if (side === 'player') setPendingSpSummon(...) else { picks.reduce(spCost 最高); summonSpCard(...) }`
 * 引擎因此「知道」敌方会挑费用最高的 SP、还有 20% 概率忘记 —— 那是 AI 的脾气，不是游戏规则。
 *
 * ⚠️ **为什么玩家侧不走这里**：玩家的选择是**异步**的（弹窗等点击），AI 的是**同步**的。
 *   这个不对称无法在引擎里消除 —— 把敌方也改成异步会撞上 useAITurn 的 IIFE 闭包看不见
 *   useState 更新的问题（pendingSpSummonRef 也不在 latest 上）。所以引擎里保留一处
 *   「谁来选」的分叉，但它现在是**具名的、被解释过的**，而不是埋在函数中段的一个 if。
 *   PvP 里 guest 的真实选择权需要一个可中断的两趟协议 —— 那是 PvP 层的活，不是 de-fork 的。
 *
 * @param {Array} candidates - 已经过规则筛选的合格 SP（引擎给的，本函数不判合法性）
 * @param {Object} [opts]
 * @param {number} [opts.forgetChance=0.20] - 「忘记召唤」的概率（AI 故意留的手滑空间，让孩子有喘息）
 * @param {Function} [opts.rng=Math.random] - 注入以便测试喂确定性序列
 * @returns {Object|null} 选中的 SP；null = 这次不召（忘了）
 */
export function pickAiSpCard(candidates, { forgetChance = 0.20, rng = Math.random } = {}) {
  if (!candidates || candidates.length === 0) return null
  // ⚠️ 逐字保持旧行为：`Math.random() > 0.20` 才召 —— 即**忘记**的概率是 0.20。
  //   写成 `rng() < forgetChance → 忘记` 与之等价（连续分布上 P(x>0.2) === P(x>=0.2)），
  //   但方向更直白：小于阈值 = 忘了。
  if (rng() < forgetChance) return null
  return candidates.reduce((best, sp) => (sp.spCost > best.spCost ? sp : best), candidates[0])
}
