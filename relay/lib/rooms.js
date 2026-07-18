// rooms.js —— 房间注册表状态机。**纯函数核心**：只操作 connId（字符串）+ 返回效果描述符，
// 从不碰 socket。IO 外壳（server.js）持 Map<connId, ws> 执行这些描述符。
//
// ## 为什么纯（PvP 第 3 步）
// 「functional core, imperative shell」——房间配对/座位分配/断线重连是**最容易写错、后果最恶劣**
// 的逻辑（跨房串台 = 齐齐的动作漏进陌生人对局；token 不校验 = 谁知道房间码就能中途抢座位）。
// 把它做成纯函数 → 能在 node 里喂假 connId 单测每一条不变量 → scripts/test-relay-rooms.mjs 逐条钉。
//
// ## 中继的词汇表是 {host, guest}（角色），不是 {player, enemy}（座位）
// 本模块零 ws、零 src/ import。座位映射（host→player、guest→enemy）是第 4 步 host adapter 的事。
// 中继只知道「谁创建了房间（host）、谁加入了（guest）」，不知道什么是卡、回合、side。
//
// ## 效果描述符（纯数据，外壳翻译成 socket 操作）
//   { type: 'send', to: connId, frame: {...} }   —— 外壳 sockets.get(to)?.send(JSON.stringify(frame))
// 拒绝路径**不返回 close 描述符**：由 { ok:false, reason } 表达，外壳统一发 relay.error + close。
// 这样状态机的每个失败分支都不必手搓 close，更纯、更好测。

/** 房间槽位的角色。中继的完整词汇表，就这两个。 */
export const HOST = 'host'
export const GUEST = 'guest'
export const ROLES = [HOST, GUEST]

export function isRole(v) {
  return v === HOST || v === GUEST
}

/**
 * 新建一个空注册表。
 * - rooms:  Map<code, Room>
 * - byConn: Map<connId, {code, role}>  —— 反查：一个连接属于哪个房间的哪个角色
 *
 * Room = {
 *   code,
 *   host:  { connId: string|null, token: string },          // token 建房即固定；connId 掉线置 null
 *   guest: { connId: string|null, token: string } | null,   // null = 还没 guest 加入过
 *   createdAt,
 *   emptyAt: number|null,   // 两槽都无活 connId 的时刻；有活连接时为 null。reapEmpty 据此回收
 * }
 */
export function makeRegistry() {
  return { rooms: new Map(), byConn: new Map() }
}

// 一个槽位当前是否有活连接。
const slotAlive = (slot) => slot != null && slot.connId != null

// 房间是否整个没有活连接（两槽皆空/皆掉线）。
const roomEmpty = (room) => !slotAlive(room.host) && !slotAlive(room.guest)

/**
 * host 创建房间。**撞码不覆盖** —— 覆盖已存在的房 = 静默踢掉正在玩的两个孩子。
 * 外壳负责在 reason:'exists' 时重铸新码重试。
 * @returns {{ok:true, effects}} | {{ok:false, reason:'exists', effects:[]}}
 */
export function createRoom(reg, code, hostConnId, token, now) {
  if (reg.rooms.has(code)) return { ok: false, reason: 'exists', effects: [] }
  const room = {
    code,
    host: { connId: hostConnId, token },
    guest: null,
    createdAt: now,
    emptyAt: null,
  }
  reg.rooms.set(code, room)
  reg.byConn.set(hostConnId, { code, role: HOST })
  return { ok: true, effects: [{ type: 'send', to: hostConnId, frame: { t: 'relay.created', code, token } }] }
}

/**
 * guest 加入房间。
 * ☠️ **不自动建房** —— guest 打错一位码，若自动建房他会进一个 host 永远不会来的幽灵房、干等。
 * ☠️ **满房拒绝** —— 已有活 guest 时拒第三个连接，否则旁观者能劫持/窥视对局。
 * @returns {{ok:true, effects}} | {{ok:false, reason:'no-room'|'full', effects:[]}}
 */
export function joinRoom(reg, code, guestConnId, token, now) {
  const room = reg.rooms.get(code)
  if (!room) return { ok: false, reason: 'no-room', effects: [] }
  if (slotAlive(room.guest)) return { ok: false, reason: 'full', effects: [] }

  room.guest = { connId: guestConnId, token }
  room.emptyAt = null
  reg.byConn.set(guestConnId, { code, role: GUEST })

  const effects = [{ type: 'send', to: guestConnId, frame: { t: 'relay.joined', token } }]
  // 通知 host「对手进来了」——仅当 host 还在线。
  if (slotAlive(room.host)) effects.push({ type: 'send', to: room.host.connId, frame: { t: 'relay.peer-joined' } })
  return { ok: true, effects }
}

/**
 * 一个连接断开（close 事件 / 心跳判死）。把它的槽位 connId 置 null、通知对端、必要时记 emptyAt。
 * **不 close 对端** —— 对端保持连接，等这一侧重连或等房间被回收。
 * @returns {{effects}}  （dropConn 从不失败：断开一个不认识的 conn 是 no-op）
 */
export function dropConn(reg, connId, now) {
  const entry = reg.byConn.get(connId)
  if (!entry) return { effects: [] }
  reg.byConn.delete(connId)

  const room = reg.rooms.get(entry.code)
  if (!room) return { effects: [] }   // 房已被回收，槽位反查落空 —— 安静收场

  const slot = room[entry.role]
  // 只在「掉的正是当前活连接」时置 null —— 防重连后旧 socket 的迟到 close 事件把新连接误伤下线。
  if (slot && slot.connId === connId) slot.connId = null

  const effects = []
  const peerRole = entry.role === HOST ? GUEST : HOST
  if (slotAlive(room[peerRole])) effects.push({ type: 'send', to: room[peerRole].connId, frame: { t: 'relay.peer-left' } })

  if (roomEmpty(room)) room.emptyAt = now
  return { effects }
}

/**
 * 重连：用 token 重绑同一房间的同一槽位。
 * ☠️ **token 校验是唯一防线** —— 没有它，任何知道房间码的人都能发 reconnect 抢走 guest 座位。
 *    这是本状态机安全性所在（房间码会被念出来传播，不是秘密；token 才是）。
 * 中继只重绑 socket，**不补播任何游戏状态**（resume/lastSeen catch-up 是第 4 步 host adapter 的事）。
 * @returns {{ok:true, effects}} | {{ok:false, reason:'no-room'|'no-slot'|'bad-token', effects:[]}}
 */
export function reconnect(reg, code, role, connId, token, now) {
  const room = reg.rooms.get(code)
  if (!room) return { ok: false, reason: 'no-room', effects: [] }
  const slot = room[role]
  if (!slot) return { ok: false, reason: 'no-slot', effects: [] }
  if (slot.token !== token) return { ok: false, reason: 'bad-token', effects: [] }

  slot.connId = connId
  reg.byConn.set(connId, { code, role })
  room.emptyAt = null

  const effects = [{ type: 'send', to: connId, frame: { t: 'relay.resumed' } }]
  const peerRole = role === HOST ? GUEST : HOST
  if (slotAlive(room[peerRole])) effects.push({ type: 'send', to: room[peerRole].connId, frame: { t: 'relay.peer-joined' } })
  return { ok: true, effects }
}

/**
 * 回收空房：两槽皆无活连接、且空置超过 ttlMs 的房间删掉。防注册表无界增长。
 * （对应 counter/server.ts 的 pruneSeen 纪律：常驻服务的每一张表都要有回收路径。）
 * @returns {{reaped: string[]}}  被删掉的房间码
 */
export function reapEmpty(reg, now, ttlMs) {
  const reaped = []
  for (const [code, room] of reg.rooms) {
    if (room.emptyAt != null && now - room.emptyAt > ttlMs) {
      reg.rooms.delete(code)
      reaped.push(code)
    }
  }
  return { reaped }
}
