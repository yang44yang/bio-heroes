// control.js —— 握手解析。**纯函数**：从升级请求的 URL 提取 {role, code?, token?}。
//
// ## 握手信息全在 URL query（PvP 第 3 步；host 重连补于 2026-07-22）
//   host 建房：  /api/relay?role=host
//   host 重连：  /api/relay?role=host&room=ABCD&token=XYZ
//   guest 加入： /api/relay?role=guest&room=ABCD
//   guest 重连： /api/relay?role=guest&room=ABCD&token=XYZ
//
// 路由信息来自**连接建立那一刻的 URL**，不来自任何后续消息内容 → 中继一次都不 parse 游戏消息体。
//
// ## ☠️ token 是「建房 vs 重连」的唯一闸门
// 曾经 host 分支无条件 `return { code:null, token:null }` —— 于是 host 掉线自动重连时
// 带不出任何凭证，必然落进 server.js 的建房分支**静默铸一个新房**：原房里的 guest 从此
// 一帧收不到，双方 UI 都显示 connected，对局永久卡死，还漏一个孤儿房。（真机实测：
// 4BZU → 闪断 → QWJV。）
//
// 修法不是「host 也读 room」——那样客户端就能自选房间码建房（占码/碰撞攻击）。
// 闸门必须是 token：
//   · 无 token  → 建房，**忽略**客户端给的 room（?role=host&room=4BZU 照样 code:null）
//   · 有 token  → 重连，必须带合法 room；凭证真伪由 rooms.reconnect 逐字校验（那才是防线）
// token 是中继自己 randomUUID 铸的、只发给对应那一方，客户端捏造不出来。
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
 *   role 恒为 'host'|'guest'；**host 首连**（无 token）的 code/token 为 null（建房时中继才铸码，
 *   客户端给了 room 也不认）；其余三条路（host 重连 / guest 首连 / guest 重连）的 code 已归一化
 *   （大写去空白），token 为 null（首次）或字符串（重连）。
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

  // ☠️ token 先读 —— 它是「建房 vs 重连」的闸门，必须在分叉之前拿到（见文件头）。
  const rawToken = url.searchParams.get('token')
  const token = rawToken && rawToken.length > 0 ? rawToken : null

  // host 首连 = 建房：**不读 room** —— 码由中继铸（防客户端占码/碰撞攻击）。
  // 早返回不是可省的优化，它就是那条安全边界本身。
  if (role === 'host' && !token) return { ok: true, role: 'host', code: null, token: null }

  // 其余三条路都必须带合法房间码（host 重连与 guest 两条在此**完全对称**）。
  const code = normalizeRoomCode(url.searchParams.get('room') || '')
  if (!isValidRoomCode(code)) return { ok: false, reason: 'bad-room' }
  return { ok: true, role, code, token }
}
