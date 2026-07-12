#!/usr/bin/env node
// pickAiTarget 纯函数执行式单测（2026-07-12）—— AI 选靶逻辑从 useAITurn 攻击循环抽出到
//   src/engine/aiTarget.js（React/音效解耦，可单测）。此前该逻辑零执行覆盖、只被 test-stealth/
//   test-guard 对 useAITurn 源码文本正则弱校验。这里注入确定性 rng，逐档断言五级选靶：
//   T1 守护强制 / T2 空场直攻 / T3 aiPersonality 概率直攻 / T4 最优(一击杀→最大威胁) / T5 随机。
import { pickAiTarget } from '../src/engine/aiTarget.js'

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
// 卡 fixture（slot 由 pickAiTarget 按 field 下标派生，不放进 fixture）
const C = (o = {}) => ({ atk: 2000, currentHp: 3000, maxHp: 3000, skills: [], statuses: [], ...o })
const GUARD = (o = {}) => C({ skills: [{ nameEn: 'Guard' }], ...o })
const STEALTH = (o = {}) => C({ statuses: [{ type: 'stealth' }], ...o })
// 确定性 rng：按序返回，耗尽后重复末值
const mkRng = (...vals) => { let i = 0; return () => (i < vals.length ? vals[i++] : vals[vals.length - 1]) }

// ============ T1：守护强制 ============
ok('T1 有守护卡 → 必打守护 slot（无视 rng）',
  pickAiTarget({ atkCard: C(), playerField: [C({ atk: 1000 }), GUARD()], aiStrength: 1, leaderHp: 30000, rng: mkRng(0, 0, 0) }) === 1)
ok('T1 多张守护 → 打第一张',
  pickAiTarget({ atkCard: C(), playerField: [C(), GUARD(), GUARD()], leaderHp: 30000, rng: mkRng(0) }) === 1)
ok('T1 守护卡在 slot0 也认',
  pickAiTarget({ atkCard: C(), playerField: [GUARD(), C()], leaderHp: 30000, rng: mkRng(0) }) === 0)
// 无视守护攻击者（精准切除）→ 不被守护强制 → 走 T4 打真实威胁
ok('T1 无视守护(精准切除) → 不被守护锁、T4 打最大威胁',
  pickAiTarget({
    atkCard: C({ atk: 2000, skills: [{ nameEn: 'Precision Excision' }] }),
    playerField: [GUARD({ atk: 500, currentHp: 9000 }), C({ atk: 9000, currentHp: 9000 })],
    aiStrength: 1, leaderHp: 30000, rng: mkRng(0.99, 0.0),
  }) === 1)

// ============ T2：场上零卡 → 直攻主人 ============
ok('T2 空场 → -1', pickAiTarget({ atkCard: C(), playerField: [], leaderHp: 30000 }) === -1)
ok('T2 全 null → -1', pickAiTarget({ atkCard: C(), playerField: [null, null], leaderHp: 30000 }) === -1)
ok('T2 全隐身 → -1（隐身被排除，pAlive 空）', pickAiTarget({ atkCard: C(), playerField: [STEALTH(), STEALTH()], leaderHp: 30000 }) === -1)
ok('T2 死卡(currentHp≤0)不算活 → -1', pickAiTarget({ atkCard: C(), playerField: [C({ currentHp: 0 })], leaderHp: 30000 }) === -1)

// ============ 隐身排除但有其他目标 → 打非隐身 ============
ok('隐身卡被排除、打非隐身 slot1',
  pickAiTarget({ atkCard: C(), playerField: [STEALTH(), C({ atk: 500, currentHp: 500 })], aiStrength: 1, leaderHp: 30000, rng: mkRng(0.99, 0.0) }) === 1)

// ============ T3：aiPersonality × leaderHp × 是否一击杀 → faceChance 阈值 ============
// [personality, leaderHp, leaderMaxHp, atkCardAtk, 期望 faceChance]
const faceCases = [
  ['balanced', 30000, 30000, 2000, 0.1],
  ['balanced', 30000, 30000, 30000, 0.8],   // 一击杀主人
  ['aggressive', 30000, 30000, 2000, 0.35],
  ['aggressive', 12000, 30000, 2000, 0.5],   // percent 0.4 < 0.5
  ['aggressive', 6000, 30000, 2000, 0.7],    // percent 0.2 < 0.3
  ['aggressive', 30000, 30000, 30000, 0.95], // 一击杀
  ['defensive', 30000, 30000, 2000, 0],      // 防御：非致命绝不主动直攻
  ['defensive', 30000, 30000, 30000, 0.6],   // 一击杀才推
]
for (const [p, lhp, lmax, atk, fc] of faceCases) {
  const field = [C({ atk: 500, currentHp: 500 })] // 一张必被一击杀的弱卡（非 face 时 T4 必打 slot0）
  const base = { atkCard: C({ atk }), playerField: field, aiPersonality: p, leaderHp: lhp, leaderMaxHp: lmax, aiStrength: 1 }
  if (fc > 0) {
    // rng 略低于阈值 → 直攻主人
    ok(`T3 ${p} lhp${lhp} atk${atk}: faceChance≈${fc}, rng<fc → -1`,
      pickAiTarget({ ...base, rng: mkRng(Math.max(0, fc - 0.05)) }) === -1)
  }
  // rng 略高于阈值（或任意，当 fc=0）→ 不直攻 → aiStrength=1 走 T4 打 slot0
  ok(`T3 ${p} lhp${lhp} atk${atk}: faceChance≈${fc}, rng≥fc → 打场卡 slot0`,
    pickAiTarget({ ...base, rng: mkRng(Math.min(0.999, fc + 0.05), 0.0) }) === 0)
}

// ============ T4：最优攻击（先一击杀、再最大威胁）============
// defensive + 非致命 → faceChance 0（首个 rng 恒不 face）；aiStrength=1 → 次个 rng 必走 T4
{
  const base = { aiPersonality: 'defensive', leaderHp: 30000, aiStrength: 1, rng: mkRng(0.5, 0.0) }
  // 一击杀优先：b(hp1500) 可被 atk2000 一击杀，a(hp5000) 不能 → 打 b(slot1)
  ok('T4 一击杀优先（打能秒的 slot1）',
    pickAiTarget({ ...base, atkCard: C({ atk: 2000 }), playerField: [C({ atk: 1000, currentHp: 5000 }), C({ atk: 3000, currentHp: 1500 })] }) === 1)
  // 多张可一击杀 → 挑 ATK 最大：a/b 都能秒，b atk 更大 → slot1
  ok('T4 多张可秒 → 挑 ATK 最大(slot1)',
    pickAiTarget({ ...base, atkCard: C({ atk: 2000 }), playerField: [C({ atk: 1000, currentHp: 1000 }), C({ atk: 5000, currentHp: 1500 })] }) === 1)
  // 无一击杀 → 打场上 ATK 最大：a/b 都秒不掉，b atk 更大 → slot1
  ok('T4 无可秒 → 打 ATK 最大(slot1)',
    pickAiTarget({ ...base, atkCard: C({ atk: 2000 }), playerField: [C({ atk: 1000, currentHp: 9000 }), C({ atk: 8000, currentHp: 9000 })] }) === 1)
  // 最大威胁在 slot0 → 返回 slot0（不是恒 1）
  ok('T4 最大威胁在 slot0 → 返回 0',
    pickAiTarget({ ...base, atkCard: C({ atk: 2000 }), playerField: [C({ atk: 8000, currentHp: 9000 }), C({ atk: 1000, currentHp: 9000 })] }) === 0)
}

// ============ T5：随机攻击（弱 AI）============
// defensive 非致命 faceChance 0（首 rng 不 face）；aiStrength=0 → 次 rng 恒 ≥0 → T5；第三 rng 定 index
{
  const base = { aiPersonality: 'defensive', leaderHp: 30000, aiStrength: 0 }
  ok('T5 index 映射回真实 slot（pickRng 0.6, pAlive 长2[slot1,slot2] → 打 slot2）',
    pickAiTarget({ ...base, atkCard: C(), playerField: [null, C({ atk: 100 }), C({ atk: 100 })], rng: mkRng(0.5, 0.5, 0.6) }) === 2)
  ok('T5 pickRng 0.0 → 打 pAlive 第一张(slot0)',
    pickAiTarget({ ...base, atkCard: C(), playerField: [C(), C(), C()], rng: mkRng(0.5, 0.5, 0.0) }) === 0)
  const r = pickAiTarget({ ...base, atkCard: C(), playerField: [C(), C(), C()], rng: mkRng(0.5, 0.5, 0.99) })
  ok('T5 pickRng 0.99 → 落在合法 slot（0..2）', [0, 1, 2].includes(r))
}

// ============ 边界：无参 / 空对象不抛 ============
ok('无参调用不抛、→ -1', pickAiTarget() === -1)
ok('空对象不抛、→ -1', pickAiTarget({}) === -1)

console.log(`\n${fail === 0 ? '✅' : '❌'} ai-target 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
