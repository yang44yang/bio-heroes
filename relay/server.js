// server.js —— 中继的 IO 外壳（imperative shell）。
//
// ## 分工（PvP 第 3 步）
// 纯函数核心（relay/lib/*）决定「该发什么给谁」——返回效果描述符，从不碰 socket。
// 本文件是唯一碰 socket / 定时器 / 进程信号 / ws 的地方，它：
//   ① 把 URL 握手 → 纯核心的 createRoom/joinRoom/reconnect
//   ② 执行纯核心返回的 effects（{type:'send', to, frame} → sockets.get(to).send）
//   ③ 盲转游戏帧（peersFor → 逐字节转发，**从不 JSON.parse 对端消息体**）
//   ④ 韧性：每连接 error 隔离、每消息 try/catch、心跳僵尸检测、优雅关停、进程级 let-it-crash
//
// ## 韧性是本步头号目标 —— 中继崩一次会掐断**所有**对局
// 一个坏 socket 不能拖垮进程（每连接 on('error')）；一条坏消息只断那个客户端（每消息 try/catch）；
// 真正没预料到的异常 → 记日志 + 通知全体 + exit(1)，交给 systemd 重启（let it crash，绝不吞异常
// 带脏状态继续跑）。样板：主站 counter/server.ts 的每请求兜底 + SIGTERM 优雅退出。
//
// ## 零 src/ import、零 wire.js —— 哑中继
// 本文件只 import 'ws' + node 内置 + relay/lib/*。它不懂卡、回合、side。谁跑引擎（host 迁移）
// 是第 4 步 adapter 的事，relay 眼里只有 {host, guest} 两个对称槽位 + 盲转。

import http from 'node:http'
import { randomInt, randomUUID } from 'node:crypto'
import { WebSocketServer } from 'ws'

import { ROOM_ALPHABET, makeRoomCode } from './lib/roomCode.js'
import {
  makeRegistry, createRoom, joinRoom, dropConn, reconnect, reapEmpty, HOST,
} from './lib/rooms.js'
import { peersFor } from './lib/routing.js'
import { parseHandshake } from './lib/control.js'

// ---------- 配置 ----------
const PORT = Number(process.env.RELAY_PORT || 3002)
const HOST_ADDR = '127.0.0.1'          // 仅监听本机，由 Caddy 同源反代（DEPLOY.md §4.1）
const RELAY_PATH = '/api/relay'         // WS 升级只在这个路径上接受
const MAX_PAYLOAD = 256 * 1024          // 单帧上限，防超大帧内存 DoS（sync 快照远小于此）
const HEARTBEAT_MS = 30_000             // < Caddy 默认 idle 60s × 0.5，留足余量
const REAP_MS = 60_000                  // 空房回收扫描间隔
const ROOM_TTL_MS = 60_000              // 两槽皆空超过它 → 回收
const CREATE_RETRY_MAX = 100            // 房间码碰撞重铸上限
const SHUTDOWN_GRACE_MS = 5_000         // 优雅关停等待上限

// ---------- 状态（全在外壳，纯核心无状态）----------
const reg = makeRegistry()
const sockets = new Map()               // connId → ws（所有连接可遍历：关停/崩溃时通知全体）
let nextConnId = 1
let shuttingDown = false

const now = () => Date.now()
const newToken = () => randomUUID()
const mintCode = () => makeRoomCode(() => randomInt(ROOM_ALPHABET.length))

// 执行纯核心返回的 effects：把 {type:'send', to, frame} 翻译成 socket.send。
// 找不到目标 socket = no-op（对端刚掉线，帧无处可去，正确行为）。
function applyEffects(effects) {
  for (const e of effects) {
    if (e.type === 'send') safeSend(sockets.get(e.to), e.frame)
  }
}

// 发一个**控制帧**（relay.* 命名空间，JSON）。与盲转的游戏帧不同 —— 这些是中继自己 author 的。
function safeSend(ws, frame) {
  if (!ws || ws.readyState !== ws.OPEN) return
  try {
    ws.send(JSON.stringify(frame))
  } catch (err) {
    console.error('[relay] safeSend 失败:', err?.message)
  }
}

// 拒绝一个连接：发一条 relay.error 说明原因，再关。
function reject(ws, reason) {
  safeSend(ws, { t: 'relay.error', reason })
  try { ws.close(1008, reason) } catch { /* 已关 */ }
}

// ---------- HTTP（健康检查 + 升级门控）----------
const server = http.createServer((req, res) => {
  // 顶层兜底：任何未预期异常都不该拖垮常驻服务（照 counter/server.ts）。
  try {
    if (req.method === 'GET' && req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify({ ok: true, rooms: reg.rooms.size, conns: sockets.size }))
      return
    }
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: 'not found' }))
  } catch (err) {
    console.error('[relay] HTTP 处理异常:', err?.message)
    try { res.writeHead(500); res.end() } catch { /* 响应已发出 */ }
  }
})

// noServer 模式：手动门控 upgrade，为 P2 云存档在同进程挂普通 HTTP 留位。
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD })

server.on('upgrade', (req, socket, head) => {
  // 升级只在 RELAY_PATH 上接受；别的路径直接断，别让 wss 误接管。
  let pathname
  try {
    pathname = new URL(req.url, 'http://relay.local').pathname
  } catch {
    socket.destroy(); return
  }
  if (pathname !== RELAY_PATH) { socket.destroy(); return }
  if (shuttingDown) { socket.destroy(); return }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req)
  })
})

// ---------- 连接建立 ----------
wss.on('connection', (ws, req) => {
  const connId = `c${nextConnId++}`
  ws.connId = connId
  ws.isAlive = true
  sockets.set(connId, ws)

  // ☠️ 每连接单独挂 error —— 缺它，一个 socket 错误会冒泡成未捕获异常、整进程挂。
  ws.on('error', (err) => {
    console.error(`[relay] socket ${connId} 错误:`, err?.message)
  })
  ws.on('pong', () => { ws.isAlive = true })

  // 握手：URL query 决定 role/code/token。中继一次都不 parse 消息体。
  const hs = parseHandshake(req.url)
  if (!hs.ok) { reject(ws, hs.reason); return }

  try {
    if (hs.token) {
      // 带 token = 重连（今天只有 guest 会带；host 迁移的 host 重连是第 4 步扩 parseHandshake 的事，
      // 纯核心的 reconnect 已按 role 通用，server.js 这条路径无需改）。
      const r = reconnect(reg, hs.code, hs.role, connId, hs.token, now())
      if (!r.ok) { reject(ws, r.reason); return }
      applyEffects(r.effects)
    } else if (hs.role === HOST) {
      // host 建房：铸码 + 铸 token，撞码重铸。
      const token = newToken()
      let created = null
      for (let i = 0; i < CREATE_RETRY_MAX; i++) {
        const c = createRoom(reg, mintCode(), connId, token, now())
        if (c.ok) { created = c; break }
      }
      if (!created) { reject(ws, 'no-code'); return }   // 码空间被占满（几乎不可能：104 万码位）
      applyEffects(created.effects)
    } else {
      // guest 首次加入：铸 guest token（重连时带回）。
      const token = newToken()
      const j = joinRoom(reg, hs.code, connId, token, now())
      if (!j.ok) { reject(ws, j.reason); return }
      applyEffects(j.effects)
    }
  } catch (err) {
    console.error(`[relay] 握手处理异常 ${connId}:`, err?.message)
    reject(ws, 'handshake-error')
    return
  }

  // ---------- 盲转：游戏帧原样逐字节转发给对端 ----------
  ws.on('message', (data, isBinary) => {
    // ☠️ 每消息 try/catch：一条坏消息只断这个客户端，不崩服务。
    try {
      // **不 JSON.parse**。中继连「齐齐出的是攻击还是出牌」都不该知道（DEPLOY.md §4.2①）。
      // {binary: isBinary} 保持帧类型 → 真正的逐字节盲转。
      for (const peerId of peersFor(reg, connId)) {
        const peer = sockets.get(peerId)
        if (peer && peer.readyState === peer.OPEN) peer.send(data, { binary: isBinary })
      }
    } catch (err) {
      console.error(`[relay] 转发异常 ${connId}:`, err?.message)
      try { ws.close(1011, 'forward-error') } catch { /* 已关 */ }
    }
  })

  ws.on('close', () => {
    sockets.delete(connId)
    try {
      applyEffects(dropConn(reg, connId, now()).effects)   // 通知对端 peer-left + 记 emptyAt
    } catch (err) {
      console.error(`[relay] close 清理异常 ${connId}:`, err?.message)
    }
  })
})

// ---------- 心跳：僵尸连接检测（ws 官方 isAlive 范式）----------
// 回合制里 guest 变僵尸 = host 永远等一个不来的 intent → 这条是刚需，不是优化。
const heartbeat = setInterval(() => {
  for (const ws of sockets.values()) {
    if (ws.isAlive === false) { ws.terminate(); continue }   // 上一轮没回 pong → 判死（close 事件会跑 dropConn）
    ws.isAlive = false
    try { ws.ping() } catch { /* 发不出去，下一轮 terminate */ }
  }
}, HEARTBEAT_MS)
heartbeat.unref()

// ---------- 空房回收 ----------
const reaper = setInterval(() => {
  try {
    const { reaped } = reapEmpty(reg, now(), ROOM_TTL_MS)
    if (reaped.length) console.log(`[relay] 回收空房: ${reaped.join(', ')}`)
  } catch (err) {
    console.error('[relay] 回收异常:', err?.message)
  }
}, REAP_MS)
reaper.unref()

// ---------- 优雅关停 ----------
function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[relay] 收到 ${signal}，优雅关停…`)
  clearInterval(heartbeat)
  clearInterval(reaper)
  server.close()   // 停止 accept 新连接
  for (const ws of sockets.values()) {
    try { ws.close(1001, 'server-shutdown') } catch { /* 已关 */ }
  }
  const forceTimer = setTimeout(() => {
    for (const ws of sockets.values()) { try { ws.terminate() } catch { /* 已关 */ } }
    process.exit(0)
  }, SHUTDOWN_GRACE_MS)
  forceTimer.unref()
  // 若所有连接都干净关闭，wss.close 的回调会提前收尾
  wss.close(() => { clearTimeout(forceTimer); process.exit(0) })
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// ---------- 进程级最后防线：let it crash ----------
// 带脏状态继续跑比重启更危险。记日志 + 尽力通知全体 + exit(1)，交给 systemd 重启（Restart=on-failure）。
function crash(kind, err) {
  console.error(`[relay] ${kind}:`, err)
  for (const ws of sockets.values()) {
    try { ws.close(1011, 'server-error') } catch { /* 已关 */ }
  }
  process.exit(1)
}
process.on('uncaughtException', (err) => crash('uncaughtException', err))
process.on('unhandledRejection', (err) => crash('unhandledRejection', err))

// ---------- 启动 ----------
server.listen(PORT, HOST_ADDR, () => {
  console.log(`[relay] Bio Heroes 中继监听 ws://${HOST_ADDR}:${PORT}${RELAY_PATH} · health: /api/health`)
})
