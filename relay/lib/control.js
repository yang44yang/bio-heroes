// control.js —— 握手解析。**纯函数**：从升级请求的 URL 提取 {role, code?, token?}。
//
// ## 握手信息全在 URL query（PvP 第 3 步）
//   host 建房：  /api/relay?role=host
//   guest 加入： /api/relay?role=guest&room=ABCD
//   guest 重连： /api/relay?role=guest&room=ABCD&token=XYZ
//
// 路由信息来自**连接建立那一刻的 URL**，不来自任何后续消息内容 → 中继一次都不 parse 游戏消息体。
//
// ## ☠️ 绝不读 seat query
// 客户端不能自选座位 —— 这是 wire.js:706（decodeIntent 无条件写 side=seat，raw.side 根本不被读）
// 在中继侧的同源纪律。座位是 host adapter 从**角色**推导的（host→player、guest→enemy），
// 不是客户端 URL 里能塞的东西。parseHandshake 读 seat = 把座位选择权交给客户端 = 安全漏洞。
// test-relay-control 用 source-grep + 行为双守卫钉这一条。
//
// 本模块零 import。normalizeRoomCode 从 roomCode.js 来（同一个归一化真相源）。

import { normalizeRoomCode, isValidRoomCode } from './roomCode.js'

const VALID_ROLES = new Set(['host', 'guest'])

/**
 * 解析升级请求的 URL。
 * @param {string} reqUrl  req.url，如 '/api/relay?role=guest&room=abcd'
 * @returns {{ok:true, role, code, token}} | {{ok:false, reason}}
 *   role 恒为 'host'|'guest'；host 的 code/token 为 null（建房时中继才铸码）；
 *   guest 的 code 已归一化（大写去空白），token 可能为 null（首次加入）或字符串（重连）。
 */
export function parseHandshake(reqUrl) {
  let url
  try {
    // base 只为让相对路径能被 URL 解析；host 部分无意义（中继只看 pathname/search）。
    url = new URL(reqUrl, 'http://relay.local')
  } catch {
    return { ok: false, reason: 'bad-url' }
  }

  const role = url.searchParams.get('role')
  if (!VALID_ROLES.has(role)) return { ok: false, reason: 'bad-role' }

  if (role === 'host') {
    // 建房：不接受客户端指定房间码/token —— 码由中继铸（防客户端占用/碰撞攻击）。
    return { ok: true, role: 'host', code: null, token: null }
  }

  // guest：必须带合法房间码
  const code = normalizeRoomCode(url.searchParams.get('room') || '')
  if (!isValidRoomCode(code)) return { ok: false, reason: 'bad-room' }

  const rawToken = url.searchParams.get('token')
  const token = rawToken && rawToken.length > 0 ? rawToken : null
  return { ok: true, role: 'guest', code, token }
}
