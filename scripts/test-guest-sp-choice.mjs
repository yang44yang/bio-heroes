#!/usr/bin/env node
// guest 自选 SP 的接线回归测试（2026-07-24）
//
// 改动前：guest 触发 SP 时由 host 的 AI 人格 `pickAiSpCard` **代选**，齐齐自己点不了
//   （host 却能翻 2 张挑 1 张）—— 与「guest 也能答题」那条公平线不一致。
// 改动后：候选经 self **私有**通道下发（wire 早就为它留好了 SELF_SPEC.spChoice + spChoose intent），
//   guest 点选回一条 spChoose intent → host 侧 `confirmSpSummon(card, 'enemy')` 落地。
//
// ☠️ **不需要 bump PROTOCOL_VERSION**：spChoice 走 self 通道（SELF_SPEC 里本就有、一直在传 null），
//    不是 assertPublicShape 校验的公开状态树。对手 SP **数**才要动公开树 —— 那个才需要 bump
//    （先例：handCount 提进公开子树时 bump 到 PROTOCOL_VERSION 3）。
//
// 覆盖：⓪ 真 buildSync 驱动的功能（候选只进拥有者的桶）；① 新接线的源码哨兵。
// wire 层本身已有覆盖，本文件不重复：
//   · test-wire-envelope ②d「spChoice 装错桶必抛」（把 host 候选塞进 ENEMY 桶 = 提前剧透）
//   · test-wire-intent ③c「spChoose 的 uid:null = 跳过」+ 意图白名单只放行 uid

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildSync } from '../src/engine/wire.js'
import { initialBattleState } from '../src/engine/battleReducer.js'
import { PLAYER, ENEMY } from '../src/engine/sides.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const src = (p) => readFileSync(join(ROOT, p), 'utf8')

// 深扫一棵树里有没有某个 key（用来断言公开树里不含 candidates）
const hasKeyDeep = (node, key, seen = new Set()) => {
  if (!node || typeof node !== 'object' || seen.has(node)) return false
  seen.add(node)
  if (!Array.isArray(node) && Object.prototype.hasOwnProperty.call(node, key)) return true
  return Object.values(node).some((v) => hasKeyDeep(v, key, seen))
}

// ================================================================
//  ⓪ 功能：候选只进**拥有者**的桶，且不进公开树
// ================================================================
{
  const S = structuredClone(initialBattleState)
  const CANDS = [{ uid: 'sp_e_0', name: '细胞分裂·无限增殖' }, { uid: 'sp_e_1', name: '远古召唤·霸王龙' }]
  const guestChoice = { side: ENEMY, rule: { type: 'auto', reason: 'gated' }, candidates: CANDS }
  const sources = {
    // host 是本地的，自己的候选从不上 wire → PLAYER 桶恒 null
    [PLAYER]: { hand: [], drawPileCount: 14, spChoice: null },
    [ENEMY]: { hand: [], drawPileCount: 15, spChoice: guestChoice },
  }
  const sync = buildSync({ state: S, sources, ring: [], to: ENEMY, since: 0, ack: 0, g: 'm_sp' })

  ok('⓪ guest 收到的 self.spChoice 带着自己的候选（2 张）',
    sync.self.spChoice && sync.self.spChoice.candidates.length === 2)
  ok('⓪ 候选 uid 原样送达（guest 点选后要按 uid 回传）',
    sync.self.spChoice.candidates.map((c) => c.uid).join(',') === 'sp_e_0,sp_e_1')
  ok('⓪ self.spChoice.side 是**绝对**座位 enemy（guest 侧自己镜像成 player 再喂 UI）',
    sync.self.spChoice.side === ENEMY)
  // ★ 公开树是要 mirror 给对面的，候选**绝不能**在里面（wire.js:174 的 strip 名单）
  ok('⓪ 公开状态树里不含 candidates —— 候选只走 self 私有通道',
    !hasKeyDeep(sync.state, 'candidates'))

  // 没人待选时保持 null（回归：别把 undefined 送上 wire）
  const idle = buildSync({
    state: S,
    sources: { [PLAYER]: { hand: [], drawPileCount: 0, spChoice: null }, [ENEMY]: { hand: [], drawPileCount: 0, spChoice: null } },
    ring: [], to: ENEMY, since: 0, ack: 0, g: 'm_sp',
  })
  ok('⓪ 无人待选时 self.spChoice === null', idle.self.spChoice === null)
}

// ================================================================
//  ① 新接线的源码哨兵
// ================================================================
const ub = src('src/hooks/useBattle.js')
const ph = src('src/hooks/usePvpHost.js')
const gb = src('src/hooks/useGuestBattle.js')
const pvpScreen = src('src/components/PvpHostBattleScreen.jsx')
const soloScreen = src('src/components/HostBattleScreen.jsx')

// ---- 引擎：远端真人走"待选"，AI 仍走同步代选 ----
ok('① useBattle 接受 remoteEnemy 选项', /export function useBattle\(\{\s*remoteEnemy\s*=\s*false/.test(ub))
ok('① resolveSpChoice：remoteEnemy → setPendingEnemySpSummon（交给真人选）',
  /if \(remoteEnemy\)\s*\{[\s\S]{0,120}setPendingEnemySpSummon\(\{ side, candidates, rule \}\)/.test(ub))
// ☠️ 反向回归：单机的 AI 必须仍然**同步代选**，否则 AI 回合会停在这里等一个永不到来的选择
ok('① resolveSpChoice 仍保留 AI 同步代选分支（单机不能坏）',
  /const chosen = pickAiSpCard\(candidates\)/.test(ub))
ok('① 敌方待选是**独立** state（不复用 pendingSpSummon 单例 → 两侧不会互相顶掉）',
  /const \[pendingEnemySpSummon, setPendingEnemySpSummon\] = useState\(null\)/.test(ub))
ok('① confirmSpSummon / cancelSpSummon 已 side 参数化',
  /confirmSpSummon = useCallback\(\(spCard, side = 'player'\)/.test(ub) &&
  /cancelSpSummon = useCallback\(\(side = 'player'\)/.test(ub))
ok('① pendingEnemySpSummon 已导出（usePvpHost 要读它装桶）', /pendingSpSummon, pendingEnemySpSummon,/.test(ub))

// ---- 屏幕层：PvP host 开 remoteEnemy；单机**绝不能**开 ----
ok('① PvpHostBattleScreen 传 remoteEnemy: true', /useBattle\(\{\s*remoteEnemy:\s*true\s*\}\)/.test(pvpScreen))
ok('① HostBattleScreen（单机）不传 remoteEnemy —— 传了 AI 回合会卡死等真人选择',
  /useBattle\(\)/.test(soloScreen) && !/remoteEnemy/.test(soloScreen))

// ---- host：装桶（privacy 关键）+ 收 intent + 兜底 ----
ok('① ENEMY 桶装 guest 自己的待选', /\[ENEMY\]:[^\n]*spChoice: battle\.pendingEnemySpSummon \?\? null/.test(ph))
// ☠️ privacy：host 自己的候选**永远**不进 wire。写成 battle.pendingSpSummon 就是在齐齐点选前剧透给他
//    （buildSync 会抛，但哨兵要在这里先拦住这个写法）
ok('① PLAYER 桶恒 null —— host 自己的 SP 候选绝不上 wire（剧透防线）',
  /\[PLAYER\]:[^\n]*spChoice: null/.test(ph) && !/\[PLAYER\]:[^\n]*pendingSpSummon/.test(ph))
ok('① 推快照的 effect 依赖 pendingEnemySpSummon —— 漏了候选就永远发不出去',
  /\}, \[enabled, client, battle\.battleState, battle\.pendingEnemySpSummon,/.test(ph))
ok('① 有 case spChoose', /case 'spChoose':/.test(ph))
ok('① spChoose 按 uid 在**权威候选**里找回卡对象（不信 guest 传来的卡内容）',
  /pend\.candidates\.find\(\(c\) => c && c\.uid === intent\.uid\)/.test(ph))
ok('① spChoose 落地走 confirmSpSummon(chosen, ENEMY)', /battle\.confirmSpSummon\(chosen, ENEMY\)/.test(ph))
ok('① uid:null = guest 显式跳过 → cancelSpSummon(ENEMY)',
  /intent\.uid === null.*cancelSpSummon\(ENEMY\)/.test(ph))
ok('① endTurn 兜底：还挂着没选的候选 → AI 代选（不因超时白亏一次触发资格）',
  /if \(battle\.pendingEnemySpSummon\)\s*\{[\s\S]{0,200}pickAiSpCard\(battle\.pendingEnemySpSummon\.candidates\)/.test(ph))

// ---- guest：读私有通道 + 回传 intent ----
ok('① guest 的 pendingSpSummon 来自 self.spChoice，并镜像成 PLAYER（BattleScreen 弹窗只认 player）',
  /pendingSpSummon: dec\?\.self\?\.spChoice \? \{ \.\.\.dec\.self\.spChoice, side: PLAYER \} : null/.test(gb))
ok('① guest 点选 → 只发 uid 的 spChoose intent',
  /confirmSpSummon: \(spCard\) => \{ send\('spChoose', \{ uid: spCard\.uid \}\) \}/.test(gb))
ok('① guest 跳过 → spChoose uid:null', /cancelSpSummon: \(\) => \{ send\('spChoose', \{ uid: null \}\) \}/.test(gb))

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-guest-sp-choice: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
