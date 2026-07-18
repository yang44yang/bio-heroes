// test-relay-roomcode.mjs —— 房间码守卫（PvP 第 3 步）。
//
// 分工：本文件守「码本身」（字母表 / 生成 / 归一 / 校验）。房间状态机在 test-relay-rooms，
// 握手在 test-relay-control。
//
// ⚠️ 只 import relay/lib/*.js（**零 ws**）→ run-tests.mjs 自动发现、进主 CI，无需装 ws。
// ⚠️ 铁律：新守卫配变异测试（改什么生产代码才该变红，写在断言旁）；相对 import 带 .js。

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  ROOM_ALPHABET, ROOM_CODE_LEN,
  makeRoomCode, normalizeRoomCode, isValidRoomCode,
} from '../relay/lib/roomCode.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }
const throws = (fn) => { try { fn(); return false } catch { return true } }

// ---- ① 字母表：排除易混字符（孩子要念给朋友听）----
{
  // 变异：字母表加回 '0' / 'O' / '1' / 'I' → 红。
  for (const bad of ['O', '0', 'I', '1']) {
    assert(!ROOM_ALPHABET.includes(bad),
      `① 字母表含易混字符 '${bad}' —— 电话里念「哦」分不清 O/0、念「i」分不清 I/1`)
  }
  // 变异：手滑漏一个字符 → 32 变 31 → 红。（32 = 5bit/位，4 位 = 20bit ≈ 104 万码位）
  assert(ROOM_ALPHABET.length === 32, `① 字母表必须恰好 32 字符（实际 ${ROOM_ALPHABET.length}）`)
  // 无重复字符（重复会让某些码位概率翻倍、且 isValid 不受影响地静默有偏）
  assert(new Set(ROOM_ALPHABET).size === ROOM_ALPHABET.length, '① 字母表无重复字符')
  // 只含大写字母 + 数字
  assert(/^[A-Z0-9]+$/.test(ROOM_ALPHABET), '① 字母表只含大写字母和数字')
}

// ---- ② makeRoomCode：注入固定熵 → 已知码 ----
{
  // 变异：改索引算术（如 ROOM_ALPHABET[idx+1]）→ 本条红。
  let seq = [0, 1, 2, 3], i = 0
  assert(makeRoomCode(() => seq[i++]) === 'ABCD', '② 熵 [0,1,2,3] → ABCD（字母表前四位）')

  let seq2 = [ROOM_ALPHABET.length - 1, 0, ROOM_ALPHABET.length - 1, 0], j = 0
  const code2 = makeRoomCode(() => seq2[j++])
  assert(code2 === `${ROOM_ALPHABET[31]}${ROOM_ALPHABET[0]}${ROOM_ALPHABET[31]}${ROOM_ALPHABET[0]}`,
    '② 边界熵 [31,0,31,0] → 末位/首位交替')

  // 变异：改成 3 位或 5 位 → 红。
  let k = 0
  assert(makeRoomCode(() => (k++ % ROOM_ALPHABET.length)).length === ROOM_CODE_LEN,
    `② 输出恒 ${ROOM_CODE_LEN} 位`)

  // 扫一遍每个合法索引，产出必须都在字母表内（off-by-one 越界会取到 undefined 拼进码）
  let allValid = true
  for (let idx = 0; idx < ROOM_ALPHABET.length; idx++) {
    const c = makeRoomCode(() => idx)
    if (![...c].every((ch) => ROOM_ALPHABET.includes(ch))) allValid = false
  }
  assert(allValid, '② 每个合法索引产出的字符都在字母表内')

  // ☠️ 熵越界必须抛错（在源头响）。变异：删掉越界检查 → 取到 undefined 静默拼进码 → 本条红。
  assert(throws(() => makeRoomCode(() => ROOM_ALPHABET.length)), '② 熵越界（== 长度）抛错')
  assert(throws(() => makeRoomCode(() => -1)), '② 熵负数抛错')
  assert(throws(() => makeRoomCode(() => 1.5)), '② 熵非整数抛错')
}

// ---- ③ normalize / isValid ----
{
  // 变异：删 toUpperCase → 本条红（孩子念出来的码大小写随意，必须归一）。
  assert(normalizeRoomCode('abcd') === 'ABCD', '③ normalize 大写化')
  assert(normalizeRoomCode('  ab2d  ') === 'AB2D', '③ normalize 去空白')
  assert(normalizeRoomCode(null) === '' && normalizeRoomCode(42) === '', '③ normalize 非字符串 → 空串（不崩）')

  // 变异：isValid 的正则/循环放行 O → 本条红。
  assert(isValidRoomCode('ABOD') === false, '③ isValid 拒含 O 的码（O 不在字母表）')
  assert(isValidRoomCode('AB0D') === false, '③ isValid 拒含 0 的码')
  assert(isValidRoomCode('abcd') === true, '③ isValid 大小写不敏感（内部归一）')
  assert(isValidRoomCode('ABC') === false && isValidRoomCode('ABCDE') === false, '③ isValid 拒错误长度')
  assert(isValidRoomCode('AB2D') === true, '③ isValid 放行合法码')
  assert(isValidRoomCode('') === false && isValidRoomCode(null) === false, '③ isValid 拒空/null')
}

// ---- ④ ☠️ source-grep：makeRoomCode 体内不得自调 Math.random（熵必须注入）----
{
  // 复用仓库现成的 stripComments（带字符串状态机 + 自检），别让注释里的 'Math.random' 误伤。
  const src = readFileSync(join(root, 'relay/lib/roomCode.js'), 'utf8')
  const stripped = stripComments(src)
  const body = stripped.match(/export function makeRoomCode[\s\S]*?\n}/)?.[0] ?? ''
  assert(body.length > 0, '④ 能定位到 makeRoomCode 函数体')
  // 变异：makeRoomCode 内部改成自己调 Math.random() → 红。
  assert(!/Math\s*\.\s*random/.test(body),
    '④ ☠️ makeRoomCode 体内出现 Math.random —— 熵必须**注入**（同 wire.js:265 mintMatchId）。\n' +
    '      不可测的随机数没法写「注入固定熵 → 断言已知码」的测试，而那是唯一能抓「索引算术写错」的断言。')
}

// ---- 自检：stripComments 剥注释器（照抄 test-wire-intent，带字符串状态机）----
function stripComments(srcTxt) {
  let out = ''
  let i = 0
  let mode = 'code'
  while (i < srcTxt.length) {
    const c = srcTxt[i], n = srcTxt[i + 1]
    if (mode === 'code') {
      if (c === '/' && n === '/') { mode = 'line'; i += 2; continue }
      if (c === '/' && n === '*') { mode = 'block'; i += 2; continue }
      if (c === "'") mode = 'sq'
      else if (c === '"') mode = 'dq'
      else if (c === '`') mode = 'tpl'
      out += c; i++; continue
    }
    if (mode === 'line') { if (c === '\n') { mode = 'code'; out += c }; i++; continue }
    if (mode === 'block') { if (c === '*' && n === '/') { mode = 'code'; i += 2 } else i++; continue }
    out += c
    if (c === '\\') { out += srcTxt[i + 1] ?? ''; i += 2; continue }
    if ((mode === 'sq' && c === "'") || (mode === 'dq' && c === '"') || (mode === 'tpl' && c === '`')) {
      if (out.length > 1) mode = 'code'
    }
    i++
  }
  return out
}
// ⓪ 剥注释器自检（不做这个，④ 的 source-grep 是空转）
assert(!stripComments('const a = 1 // Math.random\n').includes('Math.random'), '⓪ 行注释里的字面量被剥掉')
assert(stripComments('const a = "Math.random"\n').includes('Math.random'), '⓪ 代码里的字符串字面量被保留')

assert(pass > 20, `⑤ 断言真的跑了（实测 ${pass} 条）`)

if (fails.length) {
  console.error(`❌ test-relay-roomcode: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-relay-roomcode: ${pass} 条断言通过`)
