#!/usr/bin/env node
// Phase B —— SP 自动触发 回归测试
//
// 触发规则（齐齐 2026-06-27 定，最终版）：第8回合 = "开闸"门槛（不是硬触发），第8回合前不判断。
//   · 玩家 = turn≥SP_TURN_TRIGGER(8) AND（连对 SP_QUIZ_STREAK(2) 题 OR 主人 HP≤初始50%）。
//   · 敌方 = turn≥8 AND 主人 HP≤50%（AI 不答题，无"连对2题"那半）。
//   · 撑到第8回合但满血且没连对2题 → 不召。
// 触发流程：从合格 SP 里随机翻 2 张，玩家选 1 张上场；敌方 AI 直接召唤。
// 每侧本局只触发一次（reason 统一 'gated'，spTriggeredRef 按 `${side}:gated` 去重；startBattle 清空）。
//
// 沿用仓库惯例：grep 源码接线（不 import useBattle/组件）+ import 纯数据/纯函数做功能断言。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import spCardsRaw from '../src/data/spCards.js'
import {
  spEarliestSummonTurn, LEADER_HP,
  SP_QUIZ_STREAK, SP_LEADER_HP_RATIO, SP_TURN_TRIGGER,
} from '../src/data/deckRules.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const spCards = spCardsRaw.default || spCardsRaw
const src = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
let pass = 0, fail = 0
const ok = (n, c) => { if (c) pass++; else { fail++; console.error(`❌ ${n}`) } }
const has = (...subs) => subs.every(s => src.includes(s))

// ===== A. 常量（设计值）=====
ok('SP_QUIZ_STREAK === 2', SP_QUIZ_STREAK === 2)
ok('SP_LEADER_HP_RATIO === 0.5', SP_LEADER_HP_RATIO === 0.5)
ok('SP_TURN_TRIGGER === 8', SP_TURN_TRIGGER === 8)
ok('50% 阈值 = 15000（标准主人）', LEADER_HP * SP_LEADER_HP_RATIO === 15000)

// ===== B. 公共触发器 + 'auto' 规则接线 =====
ok("getEligibleSpCards 含 'auto' 规则分支", has("case 'auto':"))
ok('tryTriggerSp 公共入口存在', has('const tryTriggerSp = useCallback('))
ok("tryTriggerSp 调 getEligibleSpCards({ type: 'auto' }", has("getEligibleSpCards({ type: 'auto' }"))
// S6 de-fork（2026-07-17）：tryTriggerSp 里那个
//   `if (side === 'player') setPendingSpSummon(...) else { picks.reduce(spCost最高); summonSpCard(chosen,'enemy') }`
// 是**门控路径上的真 fork**，已抽成具名的 resolveSpChoice(side, candidates, rule)。
// 不变式没变（玩家弹窗选、敌方直接召），但：
//   · 「选哪张」的 AI 人格（挑 spCost 最高 / 20% 忘记）搬去了 engine/aiTarget.js 的 pickAiSpCard
//     —— 引擎不该知道敌方的脾气；
//   · 引擎里只剩**一处**具名的「谁来选」分叉，且它背后是真实且今天消不掉的不对称
//     （玩家的选择异步、AI 的同步）。
ok('SP 的「谁来选」收敛到具名的 resolveSpChoice（不再埋在 tryTriggerSp/playEventCard 中段）',
  has('const resolveSpChoice = useCallback((side, candidates, rule)'))
ok('resolveSpChoice：玩家 → 弹窗；敌方 → pickAiSpCard 后直接召',
  has("if (side === 'player') {") && has('setPendingSpSummon({ side, candidates, rule })') &&
  has('const chosen = pickAiSpCard(candidates)') && has('summonSpCard(chosen, side)'))
ok('AI 的 SP 人格已搬出引擎（useBattle 不得再内联 spCost 比较）',
  !/picks\.reduce\(\(best, sp\)/.test(src) && !/candidates\.reduce\(\(best, sp\) => sp\.spCost/.test(src))
ok('两个触发点都走 resolveSpChoice（事件卡 + 门控条件）',
  (src.match(/resolveSpChoice\(side,/g) || []).length === 2)

// ===== C. 触发接线（第8回合=门槛 AND 软条件 OR；reason 统一 'gated'）=====
// ★ PvP 第 2 步（2026-07-17）：答题点的 `tryTriggerSp('player', 'gated')` 已改成
//   `tryTriggerSp(side, 'gated')` —— 那个 'player' 是**硬编码字面量**，而 answerQuiz 现在
//   带 side 参数（guest 的 answer intent 会以 side='enemy' 重放）。
//
// ☠️ **这条断言此前是「为错误的理由通过」的**：它查 `has("tryTriggerSp('player', 'gated')")`，
//    而 `has` 是**全文件子串查找、不知道位置** —— 我把答题点改成 side 参数化之后，
//    这条断言**照样绿**，因为那个字面量在 HP useEffect 和玩家回合点还各有一处。
//    断言的名字说的是「答题点」，查的却是「整个文件里任何地方」。
//    → 改成锚定**答题点自己的那一行**（newStreak 只在 answerQuiz 里出现）。
ok('答题点：turn≥SP_TURN_TRIGGER 且 连对≥SP_QUIZ_STREAK → side/gated（side 参数化，不再硬编码 player）',
  has('battleStateRef.current.turn >= SP_TURN_TRIGGER && newStreak >= SP_QUIZ_STREAK') &&
  /newStreak >= SP_QUIZ_STREAK\) \{\s*\n\s*tryTriggerSp\(side, 'gated'\)/.test(src))
ok('HP useEffect：第8回合前提前返回（battleStateRef.current.turn < SP_TURN_TRIGGER）',
  has('battleStateRef.current.turn < SP_TURN_TRIGGER'))
ok('HP useEffect：玩家/敌方 HP≤阈值 → gated',
  has('playerLeaderHp <= playerInitLeaderHpRef.current * SP_LEADER_HP_RATIO') &&
  has('enemyLeaderHp <= enemyInitLeaderHpRef.current * SP_LEADER_HP_RATIO') &&
  has("tryTriggerSp('player', 'gated')") && has("tryTriggerSp('enemy', 'gated')"))
// E5c-3：leaderHp 迁进 battleReducer → 读 battleStateRef.current.<side>.leaderHp（init 阈值 ref 不动）
// PvP 第 2 步：quizStreak 从 quizStreakRef（一个全局 ref）提进 reducer 的每侧子树
// → 读取路径变成 battleStateRef.current.player.quizStreak。软条件的**语义没变**，只是真相源
// 从「一个 ref + 一个只喂 UI 的 useState」（两份，必然分叉）收成了一份。
ok('玩家回合点：newTurn≥SP_TURN_TRIGGER 且（连对2题 OR HP≤阈值）→ player/gated',
  has('newTurn >= SP_TURN_TRIGGER') &&
  has('battleStateRef.current.player.quizStreak >= SP_QUIZ_STREAK ||') &&
  has('battleStateRef.current.player.leaderHp <= playerInitLeaderHpRef.current * SP_LEADER_HP_RATIO'))
ok('敌方回合点：t≥SP_TURN_TRIGGER 且 HP≤阈值 → enemy/gated',
  has('t >= SP_TURN_TRIGGER') &&
  has('battleStateRef.current.enemy.leaderHp <= enemyInitLeaderHpRef.current * SP_LEADER_HP_RATIO') &&
  has("tryTriggerSp('enemy', 'gated')"))
ok('旧 reason 已全部替换：tryTriggerSp 调用只用 gated（无 combo/turn/quiz/hp）', (() => {
  const calls = [...src.matchAll(/tryTriggerSp\([^)]*\)/g)].map(m => m[0])
  return calls.length > 0 && calls.every(c => c.includes("'gated'")) &&
    !calls.some(c => /'(combo|turn|quiz|hp)'/.test(c))
})())

// ===== D. 去重（本局每条件一次）+ 新对局清空 =====
ok('spTriggeredRef 定义为 useRef(new Set())', has('const spTriggeredRef = useRef(new Set())'))
ok('去重：has(key) 跳过 + add(key) 记账',
  has('spTriggeredRef.current.has(key)') && has('spTriggeredRef.current.add(key)'))
ok("去重键含 side+reason（`${side}:${reason}`）", has('const key = `${side}:${reason}`'))
ok('startBattle 清空 spTriggeredRef', has('spTriggeredRef.current = new Set()'))
ok('startBattle 记录双方初始主人HP',
  has('playerInitLeaderHpRef.current = spDecks.playerLeaderHP || LEADER_HP') &&
  has('enemyInitLeaderHpRef.current = spDecks.enemyLeaderHP || LEADER_HP'))

// ===== E. 防双触发 / 防多弹窗 =====
ok('玩家侧已有 pendingSpSummon 时不重复弹', has("side === 'player' && pendingSpSummonRef.current"))
ok('pendingSpSummonRef 同步到最新（决策E5a：useLatestRef 保证每渲染同步）', has('const pendingSpSummonRef = useLatestRef(pendingSpSummon)'))

// ===== F. 'auto' 规则资格判定（复刻，与 useBattle 同公式）=====
// auto：阵营/费用不限（maxCost 默认 99），仍受回合门槛 turn ≥ spEarliestSummonTurn(spCost)。
function autoGate(spDeck, turn) {
  return spDeck.filter(sp => sp.spCost <= 99).filter(sp => turn >= spEarliestSummonTurn(sp.spCost))
}
ok('auto@turn1-3：任何 SP 都召不出（地板 turn≥4，2026-07 平衡抬高）',
  [1, 2, 3].every(t => autoGate(spCards, t).length === 0))
ok('auto@turn4：恰好放行 spCost≤6 的 SP（地板 T4 解封小 SP）',
  autoGate(spCards, 4).every(sp => sp.spCost <= 6) &&
  autoGate(spCards, 4).length === spCards.filter(sp => sp.spCost <= 6).length)
ok('auto@turn8（条件③回合）：全部 SP 都够回合门槛',
  autoGate(spCards, 8).length === spCards.length)
ok('auto 候选随 turn 单调不减（大 SP 逐步解封）',
  [3, 4, 5, 6, 7, 8].every((t, i, a) => i === 0 || autoGate(spCards, a[i]).length >= autoGate(spCards, a[i - 1]).length))

// ===== G. 「翻2选1」抽样逻辑（复刻 tryTriggerSp 内随机翻牌）=====
function pickTwo(candidates) {
  const pool = [...candidates]; const picks = []
  while (picks.length < 2 && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length)
    picks.push(pool.splice(i, 1)[0])
  }
  return picks
}
ok('翻牌：候选≥2 → 恰好翻 2 张且互不相同', (() => {
  const c = autoGate(spCards, 8)
  if (c.length < 2) return false
  for (let i = 0; i < 50; i++) {
    const p = pickTwo(c)
    if (p.length !== 2 || p[0] === p[1]) return false // splice 保证两张是不同对象
    if (!p.every(x => c.includes(x))) return false
  }
  return true
})())
ok('翻牌：候选不足2 → 全给（≤2）', pickTwo([spCards[0]]).length === 1 && pickTwo([]).length === 0)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
