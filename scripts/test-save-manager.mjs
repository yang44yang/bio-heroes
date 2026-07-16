#!/usr/bin/env node
// 存档层守卫（门禁）
//
// 背景：exportSave 的 key 清单曾硬编码只有 2 个，而实际在用 13 个 —— 战役进度、
// Leitner 复习进度(存档最大项)、每日挑战、成就等全部静默丢失；importSave 更会
// 把 10 副卡组清空还显示「导入成功」。根因是**存档层零测试覆盖**，只改一次清单
// 是治标，下个 sprint 加新 key 照样漏。这套测试就是那个"下次也咬住"的守卫。
//
// 覆盖：① 清单漂移 ② key 前缀统一 ③ round-trip 保真（含卡组数组/裸字符串）
//      ④ 迁移链 + 版本地板 ⑤ resetSave 清扫干净 ⑥ 旧格式兼容

import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

// ---- localStorage / FileReader 垫片（node 无浏览器环境）----
class MemStorage {
  #m = new Map()
  get length() { return this.#m.size }
  key(i) { return [...this.#m.keys()][i] ?? null }
  getItem(k) { return this.#m.has(k) ? this.#m.get(k) : null }
  setItem(k, v) { this.#m.set(String(k), String(v)) }
  removeItem(k) { this.#m.delete(k) }
  clear() { this.#m.clear() }
}
globalThis.localStorage = new MemStorage()
globalThis.FileReader = class {
  readAsText(file) { queueMicrotask(() => this.onload({ target: { result: file._text } })) }
}

const {
  SAVE_KEYS, NON_SAVE_KEYS, migrateData, collectSaveData, applySaveData, importSave, resetSave,
} = await import('../src/utils/saveManager.js')

let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
// 断言必须能干净地"红"，而不是抛异常把后续诊断全炸掉（存档缺失时 JSON.parse(null) 会抛）
const readJson = (k) => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')
const srcFiles = readdirSync(srcDir, { recursive: true })
  .filter((f) => /\.(js|jsx)$/.test(f))
  // ★ 排除 saveManager 自身：它声明 SAVE_KEYS，扫它等于自己证明自己 ——
  //   会让下面的"僵尸 key"断言永远不可能失败（假断言）。只扫**消费方**才有意义。
  .filter((f) => !f.includes('saveManager'))
  .map((f) => ({ path: join(srcDir, f), rel: relative(srcDir, join(srcDir, f)) }))
  .map((f) => ({ ...f, text: readFileSync(f.path, 'utf8') }))

// ───────────────────────────────────────────────────────────
// ① 清单漂移守卫 —— src/ 里每个 'bio-heroes-*' 字面量都必须登记
// ───────────────────────────────────────────────────────────
const declared = new Set([...SAVE_KEYS, ...NON_SAVE_KEYS])
const found = new Map() // key -> 出现的文件
for (const f of srcFiles) {
  for (const m of f.text.matchAll(/['"](bio-heroes-[a-z0-9-]+)['"]/g)) {
    if (!found.has(m[1])) found.set(m[1], f.rel)
  }
}
const undeclared = [...found].filter(([k]) => !declared.has(k))
ok(
  `无未登记的 bio-heroes-* key（扫到 ${found.size} 个）` +
  (undeclared.length ? ` → 漏登记: ${undeclared.map(([k, f]) => `${k}(${f})`).join(', ')}` : ''),
  undeclared.length === 0,
)

// 反向：SAVE_KEYS 里不该有 src/ 中已不存在的僵尸 key
const zombies = SAVE_KEYS.filter((k) => !found.has(k))
ok(`SAVE_KEYS 无僵尸项${zombies.length ? ' → ' + zombies.join(', ') : ''}`, zombies.length === 0)

// ───────────────────────────────────────────────────────────
// ② 分类互斥 + 云身份负向断言
// ───────────────────────────────────────────────────────────
const overlap = SAVE_KEYS.filter((k) => NON_SAVE_KEYS.includes(k))
ok(`SAVE_KEYS 与 NON_SAVE_KEYS 无交集${overlap.length ? ' → ' + overlap.join(', ') : ''}`, overlap.length === 0)

// bio-heroes-cloud 绝不能随存档旅行：否则 A 的档导入 B 后 B 变成 A，两台设备抢同一账号互相覆盖
ok('bio-heroes-cloud 不在 SAVE_KEYS 内（云身份不得随存档旅行）', !SAVE_KEYS.includes('bio-heroes-cloud'))

// ③ 无前缀 key 守卫 —— conundrum_${id}_choice 曾是全项目唯一逃出前缀的 key，
//    任何 startsWith('bio-heroes-') 式的批量方案都会静默漏掉它
const badPrefix = []
for (const f of srcFiles) {
  for (const m of f.text.matchAll(/localStorage\.(?:get|set|remove)Item\(\s*[`'"]([^`'"$]*)/g)) {
    const lit = m[1]
    if (lit && !lit.startsWith('bio-heroes-')) badPrefix.push(`${lit}… (${f.rel})`)
  }
}
ok(`localStorage key 全部带 bio-heroes- 前缀${badPrefix.length ? ' → ' + badPrefix.join(', ') : ''}`, badPrefix.length === 0)

// ───────────────────────────────────────────────────────────
// ④ round-trip 保真 —— 真实存档进出一轮后必须逐字节相同
// ───────────────────────────────────────────────────────────
const REAL_DECKS = [
  { name: '齐齐的主力', main: ['ant_soldier', 'flu_virus'], sp: ['sp_cell_division'] },
  { name: '海洋队', main: ['blue_whale'], sp: [] },
  null, null, null, null, null, null, null, null,
]
function seedFullSave() {
  localStorage.clear()
  localStorage.setItem('bio-heroes-economy', JSON.stringify({ saveVersion: 4, coins: 12500, collection: { ant_soldier: 3 }, gems: 40 }))
  localStorage.setItem('bio-heroes-decks', JSON.stringify(REAL_DECKS))
  localStorage.setItem('bio-heroes-campaign', JSON.stringify({ stageStars: { c1s1: 3 }, claimedRewards: { c1s1: true } }))
  localStorage.setItem('bio-heroes-daily', JSON.stringify({ streak: 12, history: ['2026-07-15'] }))
  localStorage.setItem('bio-heroes-tutorial', JSON.stringify({ done: ['t1', 't2'] }))
  localStorage.setItem('bio-heroes-tutorial-reward-claimed', '1')          // 裸字符串
  localStorage.setItem('bio-heroes-quiz-leitner', JSON.stringify({ q_abc: { box: 3, due: '2026-07-20' } }))
  localStorage.setItem('bio-heroes-quiz-seen', JSON.stringify({ date: '2026-07-16', ids: ['q1'] }))
  localStorage.setItem('bio-heroes-settings', JSON.stringify({ quizMode: 'card' }))
  localStorage.setItem('bio-heroes-hints-seen', JSON.stringify({ guard: true }))
  localStorage.setItem('bio-heroes-lang', 'zh')                            // 裸字符串（旧版会在此静默丢失）
  localStorage.setItem('bio-heroes-intro-seen', 'true')                    // 裸字符串
}

seedFullSave()
const before = Object.fromEntries(SAVE_KEYS.map((k) => [k, localStorage.getItem(k)]))
const blob = collectSaveData()

// 全部 12 个 key 都进了 blob（旧版只进 2 个）
const missingInBlob = SAVE_KEYS.filter((k) => blob[k] === undefined)
ok(`collectSaveData 覆盖全部 ${SAVE_KEYS.length} 个 key${missingInBlob.length ? ' → 漏: ' + missingInBlob.join(', ') : ''}`, missingInBlob.length === 0)
ok('blob 标记了格式版本 format=2', blob._meta.format === 2)

// 清空后装回
localStorage.clear()
applySaveData(JSON.parse(JSON.stringify(blob)))

for (const k of SAVE_KEYS) {
  if (k === 'bio-heroes-economy') continue // economy 会过迁移，单独断言
  ok(`round-trip 保真: ${k}`, localStorage.getItem(k) === before[k])
}

// ★ 核心回归：卡组必须仍是数组。
//   旧版 bug：importSave 对 decks 也跑 migrateData → {...array} spread 成对象 →
//   DeckBuilder.loadDecks 的 [...parsed] 抛 TypeError → 被自己的 catch 吞掉 →
//   返回 Array(10).fill(null) → 10 副卡组静默清空，UI 还显示「存档已导入 ✓」。
const decksBack = readJson('bio-heroes-decks')
ok('★ 卡组 round-trip 后仍是数组（旧版此处静默清空全部卡组）', Array.isArray(decksBack))
ok('★ 卡组内容完整（10 槽 + 卡组名保留）', decksBack?.length === 10 && decksBack?.[0]?.name === '齐齐的主力')
ok('★ 卡组未被 economy 迁移污染（没被塞进新手卡/金币）', decksBack?.collection === undefined && decksBack?.coins === undefined)

// 裸字符串值：旧版 JSON.parse('zh') 抛错 → 被吞 → 该 key 静默丢失
ok('★ 裸字符串 lang=zh round-trip 存活（旧版在此静默丢失）', localStorage.getItem('bio-heroes-lang') === 'zh')

// economy 过迁移但数据不变（本来就是 v4）
const econBack = readJson('bio-heroes-economy')
ok('economy round-trip: 金币/收藏不变', econBack?.coins === 12500 && econBack?.collection?.ant_soldier === 3)

// 门闩与它守护的金币必须同行 —— 分开传就是重复发奖或永久吞奖
ok('★ 教学奖门闩随存档同行', localStorage.getItem('bio-heroes-tutorial-reward-claimed') === '1')
ok('★ Leitner 复习进度随存档同行（存档最大项/唯一教育资产）', readJson('bio-heroes-quiz-leitner')?.q_abc?.box === 3)

// ───────────────────────────────────────────────────────────
// ⑤ migrateData：迁移链 + 版本地板
// ───────────────────────────────────────────────────────────
const v1 = migrateData({ coins: 500, collection: ['ant_soldier'] })
ok('迁移链 v1→v4：版本戳到 4', v1.saveVersion === 4)
ok('迁移链 v1→v4：collection 转成 map', !Array.isArray(v1.collection) && v1.collection.ant_soldier === 1)

// ★ 版本地板：存档比程序新 → 原样返回，绝不盖戳降级。
//   降级会让新客户端在已迁移数据上重跑迁移，而 MIGRATIONS[2] 是补发型的
//   （空 collection → 发 20 张卡 + 2500 金币），其幂等性全靠「版本号单调」这个前提。
const future = migrateData({ saveVersion: 5, coins: 9999, futureField: 'x' })
ok('★ 版本地板：v5 存档不被降级成 v4', future.saveVersion === 5)
ok('★ 版本地板：v5 存档数据原样保留', future.coins === 9999 && future.futureField === 'x')

ok('migrateData(null) 返回 null', migrateData(null) === null)

// ───────────────────────────────────────────────────────────
// ⑥ importSave：无效文件 / 未来版本 拒绝
// ───────────────────────────────────────────────────────────
const asFile = (obj) => ({ _text: JSON.stringify(obj) })
const META = { game: 'Bio Heroes 生物英雄传', saveVersion: 4, format: 2, exportedAt: '2026-07-16T00:00:00.000Z' }

const rInvalid = await importSave(asFile({ _meta: { game: '别的游戏' } }))
ok('importSave 拒绝无效存档文件', rInvalid.success === false)

const rFuture = await importSave(asFile({ _meta: { ...META, saveVersion: 99 } }))
ok('★ importSave 拒绝未来版本存档（而不是降级它）', rFuture.success === false && /更新版本/.test(rFuture.message))

const rGood = await importSave(asFile({ ...blob, _meta: META }))
ok('importSave 接受合法存档', rGood.success === true)

// 旧格式（format 1，值被 JSON.parse 过）—— 这正是历史上会清空卡组的那条路径
localStorage.clear()
const legacy = {
  _meta: { game: 'Bio Heroes 生物英雄传', saveVersion: 4, exportedAt: '2026-01-01T00:00:00.000Z' }, // 无 format 字段
  'bio-heroes-economy': { saveVersion: 4, coins: 777, collection: { bee_worker: 1 } },
  'bio-heroes-decks': REAL_DECKS,
}
const rLegacy = await importSave(asFile(legacy))
ok('旧格式存档仍可导入', rLegacy.success === true)
const legacyDecks = readJson('bio-heroes-decks')
ok('★ 旧格式存档的卡组不再被清空（历史 bug 的原始触发路径）', Array.isArray(legacyDecks) && legacyDecks[0]?.name === '齐齐的主力')
ok('旧格式存档的 economy 正常', readJson('bio-heroes-economy')?.coins === 777)

// ───────────────────────────────────────────────────────────
// ⑦ resetSave：按前缀清扫干净（含动态 key）
// ───────────────────────────────────────────────────────────
seedFullSave()
localStorage.setItem('bio-heroes-conundrum-c1-choice', 'a')  // 动态 key（静态清单列不全）
localStorage.setItem('conundrum_legacy_choice', 'b')         // 改名前的历史遗留
localStorage.setItem('unrelated-app-key', 'keep-me')         // 别人的 key，不该被误删
resetSave()

const leftovers = []
for (let i = 0; i < localStorage.length; i++) {
  const k = localStorage.key(i)
  if (k.startsWith('bio-heroes-') || k.startsWith('conundrum_')) leftovers.push(k)
}
ok(`★ resetSave 清扫干净${leftovers.length ? ' → 残留: ' + leftovers.join(', ') : ''}`, leftovers.length === 0)
ok('resetSave 不误删无关 key', localStorage.getItem('unrelated-app-key') === 'keep-me')

// ───────────────────────────────────────────────────────────
console.log(`\n${fail ? '❌' : '✅'} test-save-manager: ${pass} 通过, ${fail} 失败`)
process.exit(fail ? 1 : 0)
