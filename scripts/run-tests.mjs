#!/usr/bin/env node
// 统一测试入口 — 顺序跑 scripts/test-*.mjs 全部，任一失败则 exit 1。
// 用法: npm test   (或 node scripts/run-tests.mjs)
// 说明: 只跑 test-*.mjs 这批断言测试；audit-*.mjs / validate-*.mjs 是信息性脚本，不在门禁内。
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const scriptsDir = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(scriptsDir)
  .filter((f) => /^test-.*\.mjs$/.test(f))
  .sort()

if (files.length === 0) {
  console.error('未找到任何 test-*.mjs')
  process.exit(1)
}

const failed = []
let pass = 0
const t0 = Date.now()

for (const f of files) {
  const res = spawnSync('node', [join(scriptsDir, f)], { encoding: 'utf8' })
  if (res.status === 0) {
    pass++
    process.stdout.write(`  ✓ ${f}\n`)
  } else {
    failed.push(f)
    process.stdout.write(`  ✗ ${f}\n`)
    // 失败时打印该脚本输出，便于定位
    const out = ((res.stdout || '') + (res.stderr || '')).trimEnd()
    if (out) process.stdout.write(out.split('\n').map((l) => `      ${l}`).join('\n') + '\n')
  }
}

const dt = ((Date.now() - t0) / 1000).toFixed(1)
process.stdout.write(`\n${failed.length ? '❌' : '✅'} ${pass}/${files.length} 套通过  (${dt}s)\n`)
if (failed.length) {
  process.stdout.write(`失败: ${failed.join(', ')}\n`)
  process.exit(1)
}
