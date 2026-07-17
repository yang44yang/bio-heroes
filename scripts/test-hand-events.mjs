#!/usr/bin/env node
// test-hand-events.mjs — 决策D：手牌相关孤儿事件的生产端+消费端闭环
// 背景：reviveFromDiscard(to_hand) 发 _reviveToHand、onPlaySummon 发 _removeFromHand，
//   过去无人消费 → 长老记忆取回手牌是空操作、信息素召集一卡变两卡。
//   本刀在 useBattle 加 applyHandEvents 消费，并在 playToField/aiPlayToField 调用，BattleScreen 接线手牌函数。
// 手牌逻辑绑在 React hook 里无法直接单测，故：生产端 import 纯函数验证事件字段 + 消费端/接线用 source-grep。
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { reviveFromDiscard, onPlaySummon } from '../src/engine/skillTemplates.js'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }

// ① 生产端：reviveFromDiscard(mode:'to_hand') 发 _reviveToHand
const rev = reviveFromDiscard(
  { card: { name: '长老树' }, discardPile: [{ name: '橡树', faction: 'nature', atk: 3000, maxHp: 5000, uid: 'd1' }] },
  { mode: 'to_hand', faction_filter: 'nature' },
)
ok('① reviveFromDiscard(to_hand) 返回带 _reviveToHand 的事件',
  rev && rev._reviveToHand && rev._reviveToHand.uid === 'd1' && rev._reviveToHand.name === '橡树')
ok('① 弃牌堆为空时安全返回 null',
  reviveFromDiscard({ card: { name: '长老树' }, discardPile: [] }, { mode: 'to_hand' }) === null)

// ② 生产端：onPlaySummon(hand_has_same) 发 _removeFromHand
const summ = onPlaySummon(
  { card: { name: '蚁后' }, playerHand: [{ id: 'ant_soldier', uid: 'h1', name: '兵蚁', hp: 1500, maxHp: 1500 }], friendlyField: [null, null, null] },
  { condition: 'hand_has_same', card_filter: 'ant_' },
)
ok('② onPlaySummon 返回带 _removeFromHand=原手牌uid 的 SUMMON_CARD',
  Array.isArray(summ) && summ[0] && summ[0].type === 'SUMMON_CARD' && summ[0]._removeFromHand === 'h1')
ok('② 召上场的是新 uid 的副本（≠ 原手牌 uid，故必须靠 _removeFromHand 删原卡才不重复）',
  Array.isArray(summ) && summ[0].card && summ[0].card.uid !== 'h1')
ok('② 手牌无匹配卡时返回 null',
  onPlaySummon({ card: {}, playerHand: [{ id: 'bee_x', uid: 'h9' }], friendlyField: [null] }, { condition: 'hand_has_same', card_filter: 'ant_' }) === null)

// ③ 消费端：useBattle 的 applyHandEvents
const ub = readFileSync(join(ROOT, 'src/hooks/useBattle.js'), 'utf8')
ok('③ applyHandEvents 已定义', /const\s+applyHandEvents\s*=\s*useCallback/.test(ub))
ok('③ 消费 _removeFromHand → playCard 移除原卡', /playCard\(evt\._removeFromHand\)/.test(ub))
ok('③ 消费 _reviveToHand → addToHand 取回', /addToHand\(\[evt\._reviveToHand\]\)/.test(ub))
// E5c-1：弃牌堆迁进 battleReducer，按引用移除 → 按 uid dispatch DISCARD_REMOVE_UID（语义等价：唯一 uid）
ok('③ 取回后从权威弃牌堆移除（dispatch DISCARD_REMOVE_UID by uid）',
  /dispatch\(\{\s*type:\s*'DISCARD_REMOVE_UID',\s*side,\s*uid:\s*evt\._reviveToHand\.uid\s*\}\)/.test(ub))
// S4 de-fork（2026-07-17）：playToField 与 aiPlayToField 已合并成一条 side 参数化的路径。
// 本断言此前检查两个字面量 `applyHandEvents(playEvents, 'player')` 和 `..., 'enemy')` 都存在
// —— 它守的是 CLAUDE.md 那条「改战斗规则须玩家/AI 两处同步改」的项目规矩。
// **de-fork 就是在删掉那条规矩**：现在只有一处 `applyHandEvents(playEvents, side)`，
// 「两侧都消费手牌事件」从「两个调用点都得记着写」变成了**结构保证**。
// 这比原来强：原来那条规矩本身就是这个 fork 的伤疤。
ok('③ 出牌路径调 applyHandEvents(side)（de-fork 后只有一处，两侧结构上必然一致）',
  /applyHandEvents\(playEvents,\s*side\)/.test(ub))
ok('③ 不得再出现按侧别写死的 applyHandEvents（那是 fork 复活的征兆）',
  !/applyHandEvents\(playEvents,\s*'(player|enemy)'\)/.test(ub))
ok('③ aiPlayToField 已不存在（S4 de-fork）', !/const aiPlayToField\s*=/.test(ub))

// ④ 接线：BattleScreen 把手牌变更函数按 side 注入
const bs = readFileSync(join(ROOT, 'src/components/BattleScreen.jsx'), 'utf8')
ok('④ BattleScreen 注入 player 侧 addToHand/playCard',
  /playerAddToHand:\s*playerHand\.addToHand/.test(bs) && /playerPlayCard:\s*playerHand\.playCard/.test(bs))
ok('④ BattleScreen 注入 enemy 侧 addToHand/playCard',
  /enemyAddToHand:\s*enemyHand\.addToHand/.test(bs) && /enemyPlayCard:\s*enemyHand\.playCard/.test(bs))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-hand-events: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
