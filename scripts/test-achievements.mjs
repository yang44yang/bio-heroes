#!/usr/bin/env node
// 成就检测引擎逻辑断言（收集回归 + 战斗/答题新成就 + 0-100 守卫）
import {
  detectNewlyUnlocked,
  detectNewlyUnlockedFrom,
  BATTLE_ACHIEVEMENTS,
  QUIZ_ACHIEVEMENTS,
  ALL_ACHIEVEMENTS,
  BOSS_STAGE_IDS,
} from '../src/data/achievements.js'

const POOL = [...BATTLE_ACHIEVEMENTS, ...QUIZ_ACHIEVEMENTS]
let pass = 0, fail = 0
const ids = (arr) => arr.map(a => a.id).sort()
function ok(name, cond) {
  if (cond) { pass++; }
  else { fail++; console.error(`❌ ${name}`) }
}

// ---- 收集成就回归（GachaScreen 路径，签名不变）----
const collOwned = { penicillin_pioneer: 1, antibiotic_ultimate: 1, mrna_vaccine: 1 }
ok('collection: 集齐3张 → antibiotic_master',
  ids(detectNewlyUnlocked(collOwned, [])).includes('antibiotic_master'))
ok('collection: 已解锁则不重复',
  detectNewlyUnlocked(collOwned, ['antibiotic_master']).every(a => a.id !== 'antibiotic_master'))
ok('collection: 缺1张不解锁',
  !ids(detectNewlyUnlocked({ penicillin_pioneer: 1 }, [])).includes('antibiotic_master'))

// ---- 战斗：累计胜场 ----
ok('battle_veteran: 10胜命中',
  ids(detectNewlyUnlockedFrom(POOL, { stats: { battlesWon: 10 }, stageStars: {}, battleResult: { won: true } }, [])).includes('battle_veteran'))
ok('battle_veteran: 9胜不中',
  !ids(detectNewlyUnlockedFrom(POOL, { stats: { battlesWon: 9 }, stageStars: {}, battleResult: { won: true } }, [])).includes('battle_veteran'))
ok('first_victory: 赢一场命中',
  ids(detectNewlyUnlockedFrom(POOL, { stats: { battlesWon: 1 }, stageStars: {}, battleResult: { won: true } }, [])).includes('first_victory'))
ok('first_victory: 输了不中',
  !ids(detectNewlyUnlockedFrom(POOL, { stats: { battlesWon: 0 }, stageStars: {}, battleResult: { won: false } }, [])).includes('first_victory'))

// ---- 战斗：满血通关（守 0-100 修正）----
ok('flawless: leaderHPPercent=100 命中',
  ids(detectNewlyUnlockedFrom(POOL, { stats: {}, stageStars: {}, battleResult: { won: true, leaderHPPercent: 100 } }, [])).includes('flawless_victory'))
ok('flawless: 99 不中',
  !ids(detectNewlyUnlockedFrom(POOL, { stats: {}, stageStars: {}, battleResult: { won: true, leaderHPPercent: 99 } }, [])).includes('flawless_victory'))
ok('flawless: 满血但没赢 不中',
  !ids(detectNewlyUnlockedFrom(POOL, { stats: {}, stageStars: {}, battleResult: { won: false, leaderHPPercent: 100 } }, [])).includes('flawless_victory'))

// ---- 战斗：击败全部 Boss（战役派生）----
const allBoss = { stage_2_8: 1, stage_3_8: 2, stage_4_8: 1 }
ok('boss_slayer: 三 boss 全 ≥1 命中',
  ids(detectNewlyUnlockedFrom(POOL, { stats: {}, stageStars: allBoss, battleResult: {} }, [])).includes('boss_slayer'))
ok('boss_slayer: 缺一不中',
  !ids(detectNewlyUnlockedFrom(POOL, { stats: {}, stageStars: { stage_2_8: 1, stage_3_8: 0, stage_4_8: 1 }, battleResult: {} }, [])).includes('boss_slayer'))

// ---- 战斗：累计星（走 getTotalStars：只数当前存在的关卡，幽灵/假 key 不计入）----
// 用真实关卡 id：ch2 全 8 关 + ch3 前 2 关 = 10 关 ×3 = 30 星
const stars30 = { stage_2_1: 3, stage_2_2: 3, stage_2_3: 3, stage_2_4: 3, stage_2_5: 3, stage_2_6: 3, stage_2_7: 3, stage_2_8: 3, stage_3_1: 3, stage_3_2: 3 }
const stars29 = { ...stars30, stage_3_2: 2 } // 29 星
ok('star_shine: 30 星命中',
  ids(detectNewlyUnlockedFrom(POOL, { stats: {}, stageStars: stars30, battleResult: {} }, [])).includes('star_shine'))
ok('star_shine: 29 星不中',
  !ids(detectNewlyUnlockedFrom(POOL, { stats: {}, stageStars: stars29, battleResult: {} }, [])).includes('star_shine'))
// 回归守卫（2026-07-05）：幽灵 key（旧格式 1-N / 已删关卡 / 假 id）凑够 30 也不能解锁 star_shine
ok('star_shine: 幽灵 key 的星不计入（30「幽灵星」不解锁）',
  !ids(detectNewlyUnlockedFrom(POOL, { stats: {}, stageStars: { '1-1': 15, removed_stage: 15 }, battleResult: {} }, [])).includes('star_shine'))

// ---- 答题：累计答对 ----
ok('quiz_first: 答对1道命中',
  ids(detectNewlyUnlockedFrom(POOL, { stats: { quizCorrectTotal: 1 }, stageStars: {}, battleResult: {} }, [])).includes('quiz_first'))
ok('quiz_scholar: 20道命中',
  ids(detectNewlyUnlockedFrom(POOL, { stats: { quizCorrectTotal: 20 }, stageStars: {}, battleResult: {} }, [])).includes('quiz_scholar'))
ok('quiz_scholar: 19道不中',
  !ids(detectNewlyUnlockedFrom(POOL, { stats: { quizCorrectTotal: 19 }, stageStars: {}, battleResult: {} }, [])).includes('quiz_scholar'))
ok('quiz_master: 100道命中',
  ids(detectNewlyUnlockedFrom(POOL, { stats: { quizCorrectTotal: 100 }, stageStars: {}, battleResult: {} }, [])).includes('quiz_master'))

// ---- 答题：单场全对 ----
ok('quiz_perfect_run: 3/3 命中',
  ids(detectNewlyUnlockedFrom(POOL, { stats: {}, stageStars: {}, battleResult: { quizCorrect: 3, quizTotal: 3 } }, [])).includes('quiz_perfect_run'))
ok('quiz_perfect_run: 3/4 不中',
  !ids(detectNewlyUnlockedFrom(POOL, { stats: {}, stageStars: {}, battleResult: { quizCorrect: 3, quizTotal: 4 } }, [])).includes('quiz_perfect_run'))
ok('quiz_perfect_run: 0/0 不中（没答题不算全对）',
  !ids(detectNewlyUnlockedFrom(POOL, { stats: {}, stageStars: {}, battleResult: { quizCorrect: 0, quizTotal: 0 } }, [])).includes('quiz_perfect_run'))
ok('quiz_perfect_run: 2/2 不中（<3 题）',
  !ids(detectNewlyUnlockedFrom(POOL, { stats: {}, stageStars: {}, battleResult: { quizCorrect: 2, quizTotal: 2 } }, [])).includes('quiz_perfect_run'))

// ---- 通用：已解锁过滤 ----
ok('已解锁的不再返回',
  detectNewlyUnlockedFrom(POOL, { stats: { battlesWon: 10, quizCorrectTotal: 100 }, stageStars: allBoss, battleResult: { won: true } }, ['battle_veteran', 'quiz_master', 'boss_slayer'])
    .every(a => !['battle_veteran', 'quiz_master', 'boss_slayer'].includes(a.id)))

// ---- 结构完整性 ----
ok('ALL_ACHIEVEMENTS = 5+5+4 = 14', ALL_ACHIEVEMENTS.length === 14)
ok('每个成就都有 category', ALL_ACHIEVEMENTS.every(a => ['collection', 'battle', 'quiz'].includes(a.category)))
ok('每个成就都有 check 函数', ALL_ACHIEVEMENTS.every(a => typeof a.check === 'function'))
ok('id 无重复', new Set(ALL_ACHIEVEMENTS.map(a => a.id)).size === ALL_ACHIEVEMENTS.length)
ok('BOSS_STAGE_IDS 三关', BOSS_STAGE_IDS.length === 3)

console.log(`\n${fail === 0 ? '✅' : '⚠️'} 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
