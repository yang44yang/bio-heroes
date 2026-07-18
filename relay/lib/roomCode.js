// roomCode.js —— 房间码：4 位、孩子能念给朋友听。
//
// ## 为什么是这个字母表（PvP 第 3 步）
// 房间码要在电话/语音里念给远方朋友。**排除易混字符**：字母 O 和数字 0、字母 I 和数字 1
// —— 齐齐念「哦」对面分不清是 O 还是 0，念「i」分不清 I 还是 1。剩 32 个字符（5 bit/位），
// 4 位 = 20 bit ≈ 104 万码位，< 10 并发房时碰撞概率可忽略。
//
// ## ☠️ 纯函数、零依赖、注入熵
// 与 wire.js:265 的 mintMatchId 同一条纪律：**接一个注入的整数熵源，绝不自己调 Math.random()**。
// 理由：不可测的随机数没法写「注入固定熵 → 断言得到已知码」的测试，而那正是唯一能抓住
// 「索引算术写错」的断言。makeRoomCode 体内出现 Math.random = test-relay-roomcode 的 source-grep 变红。
//
// ## 本模块**不 import 任何东西**
// relay/lib/* 是纯函数核心，零 ws、零 src/ import。中继不懂游戏（DEPLOY.md §4.2①）——
// 它连 sides.js 的 PLAYER/ENEMY 都不碰，它的词汇表是 {host, guest}（角色），不是座位。

// A-Z 去掉 O、I（24 个）+ 0-9 去掉 0、1（8 个）= 32。
export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const ROOM_CODE_LEN = 4

/**
 * 生成一个房间码。
 * @param {() => number} randInt 注入的熵源：每次调用返回一个 [0, ROOM_ALPHABET.length) 的整数。
 *   生产用 `() => crypto.randomInt(ROOM_ALPHABET.length)`；测试注入确定性序列。
 * @returns {string} 4 位房间码
 */
export function makeRoomCode(randInt) {
  let out = ''
  for (let i = 0; i < ROOM_CODE_LEN; i++) {
    const idx = randInt()
    // 熵源越界 = 编程错误，在源头响（同 sides.opp 的纪律）——别静默取到 undefined 拼进码里。
    if (!Number.isInteger(idx) || idx < 0 || idx >= ROOM_ALPHABET.length) {
      throw new Error(`makeRoomCode: 熵源返回了越界的索引 ${JSON.stringify(idx)}（须 0..${ROOM_ALPHABET.length - 1}）`)
    }
    out += ROOM_ALPHABET[idx]
  }
  return out
}

/** 归一化：大小写不敏感（孩子念出来的码大小写随意）+ 去空白。 */
export function normalizeRoomCode(s) {
  return typeof s === 'string' ? s.trim().toUpperCase() : ''
}

/** 是不是合法房间码：长度对，且每一位都在字母表里（已归一化后判定）。 */
export function isValidRoomCode(s) {
  const c = normalizeRoomCode(s)
  if (c.length !== ROOM_CODE_LEN) return false
  for (const ch of c) {
    if (!ROOM_ALPHABET.includes(ch)) return false
  }
  return true
}
