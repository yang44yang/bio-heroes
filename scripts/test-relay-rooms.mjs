// test-relay-rooms.mjs —— 房间注册表状态机守卫（PvP 第 3 步的测试主战场）。
//
// 守的是最容易写错、后果最恶劣的逻辑：跨房串台（齐齐的动作漏进陌生人对局）、
// token 不校验（谁知道房间码就能抢座位）、满房放行（旁观者劫持）、peersFor 含自己（回声）。
//
// ⚠️ 只 import relay/lib/*.js（零 ws）→ 进主 CI。喂假 connId（字符串）驱动纯状态机，断言效果 + 注册表。

import {
  makeRegistry, createRoom, joinRoom, dropConn, reconnect, reapEmpty,
  HOST, GUEST, isRole,
} from '../relay/lib/rooms.js'
import { peersFor } from '../relay/lib/routing.js'

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
// 从 effects 里找一条发给某 conn 的帧的 t（断言「通知发对了人」）
const frameTo = (res, conn) => res.effects.find((e) => e.type === 'send' && e.to === conn)?.frame?.t

// ---- ① create ----
{
  const reg = makeRegistry()
  const r = createRoom(reg, 'K7P2', 'c_host', 'tok_h', 1000)
  assert(r.ok, '① create 成功')
  assert(reg.rooms.get('K7P2').host.connId === 'c_host', '① 房间记住了 host 的 connId')
  assert(reg.rooms.get('K7P2').guest === null, '① 新房 guest 槽位为 null')
  assert(reg.byConn.get('c_host')?.role === HOST, '① byConn 反查到 host 角色')
  assert(frameTo(r, 'c_host') === 'relay.created', '① 给 host 回 relay.created')

  // ☠️ 撞码不覆盖。变异：createRoom 覆盖已存在房 → 本条红（覆盖 = 踢掉正在玩的两个孩子）。
  const dup = createRoom(reg, 'K7P2', 'c_other', 'tok_x', 2000)
  assert(!dup.ok && dup.reason === 'exists', '① 撞码返回 exists')
  assert(reg.rooms.get('K7P2').host.connId === 'c_host', '① ☠️ 撞码后原 host 不被覆盖')
  assert(deepEq(dup.effects, []), '① 撞码无 effects')
}

// ---- ② join ----
{
  const reg = makeRegistry()
  createRoom(reg, 'AB2D', 'c_host', 'tok_h', 1000)
  const j = joinRoom(reg, 'AB2D', 'c_guest', 'tok_g', 2000)
  assert(j.ok, '② join 成功')
  assert(reg.rooms.get('AB2D').guest.connId === 'c_guest', '② 房间记住了 guest')
  assert(frameTo(j, 'c_guest') === 'relay.joined', '② 给 guest 回 relay.joined')
  assert(frameTo(j, 'c_host') === 'relay.peer-joined', '② 通知 host 对手进来了')

  // ☠️ 满房拒绝。变异：joinRoom 不查 guest 已存在 → 放第三方进来 → 本条红（旁观者劫持/窥视）。
  const full = joinRoom(reg, 'AB2D', 'c_third', 'tok_3', 3000)
  assert(!full.ok && full.reason === 'full', '② ☠️ 满房拒第三个连接')
  assert(reg.rooms.get('AB2D').guest.connId === 'c_guest', '② 满房后原 guest 不被顶替')
  assert(!reg.byConn.has('c_third'), '② 被拒的第三方不进 byConn')

  // ☠️ 不自动建房。变异：join 不存在的码时自动建房 → 本条红（guest 打错一位码会进幽灵房干等）。
  const ghost = joinRoom(reg, 'ZZZZ', 'c_lost', 'tok_l', 4000)
  assert(!ghost.ok && ghost.reason === 'no-room', '② ☠️ join 不存在的码 → no-room，不自动建房')
  assert(!reg.rooms.has('ZZZZ'), '② 打错的码没有被建成幽灵房')
}

// ---- ③ ☠️ 角色分配：host 和 guest 必须不同 ----
{
  const reg = makeRegistry()
  createRoom(reg, 'ROLE', 'c_h', 'tok_h', 1000)
  joinRoom(reg, 'ROLE', 'c_g', 'tok_g', 2000)
  const rh = reg.byConn.get('c_h').role
  const rg = reg.byConn.get('c_g').role
  // ☠️ 不动点陷阱：只断「host 是 host」会漏掉「两个都设成 host」。必须断**两者不同**。
  // 变异：createRoom/joinRoom 都把 role 设成 HOST → 本条红。
  assert(rh === HOST && rg === GUEST && rh !== rg,
    `③ ☠️ host/guest 角色必须不同（实际 host=${rh}, guest=${rg}）—— 只断一个会漏「都设成 host」`)
  assert(isRole(rh) && isRole(rg), '③ 角色都是合法角色')
}

// ---- ④ ☠️ peersFor：不含自己 + 跨房隔离（盲转的心脏）----
{
  const reg = makeRegistry()
  createRoom(reg, 'RMA1', 'A_host', 'tA_h', 1000)
  joinRoom(reg, 'RMA1', 'A_guest', 'tA_g', 2000)
  createRoom(reg, 'RMB2', 'B_host', 'tB_h', 3000)
  joinRoom(reg, 'RMB2', 'B_guest', 'tB_g', 4000)

  // ☠️ 不含自己。变异：peersFor 返回房间全体成员 → host 收到自己的回声 → 本条红。
  assert(deepEq(peersFor(reg, 'A_host'), ['A_guest']), '④ ☠️ peersFor(host)=[guest]，不含自己')
  assert(deepEq(peersFor(reg, 'A_guest'), ['A_host']), '④ ☠️ peersFor(guest)=[host]，不含自己')
  assert(!peersFor(reg, 'A_host').includes('A_host'), '④ ☠️ 对端里绝无自己（防回声）')

  // ☠️ 跨房隔离。变异：peersFor 全局广播 → 齐齐的动作漏进陌生人对局 → 本条红。
  assert(!peersFor(reg, 'A_host').includes('B_guest') && !peersFor(reg, 'A_host').includes('B_host'),
    '④ ☠️ A 房的对端里绝无 B 房的人（跨房隔离）')
  assert(deepEq(peersFor(reg, 'B_host'), ['B_guest']), '④ B 房各自路由正确')

  // 未知 conn / 对端掉线 → 空数组（帧无处可去，被丢弃，等对端重连由 adapter 的 resume 补）
  assert(deepEq(peersFor(reg, 'nobody'), []), '④ 未知 conn → []')
}

// ---- ⑤ dropConn：掉线通知对端 + 记 emptyAt ----
{
  const reg = makeRegistry()
  createRoom(reg, 'DROP', 'c_h', 'tok_h', 1000)
  joinRoom(reg, 'DROP', 'c_g', 'tok_g', 2000)

  // host 掉线 → 通知 guest peer-left，host 槽位 connId 置 null（token 保留待重连）
  const d = dropConn(reg, 'c_h', 5000)
  assert(frameTo(d, 'c_g') === 'relay.peer-left', '⑤ host 掉线通知 guest peer-left')
  assert(reg.rooms.get('DROP').host.connId === null, '⑤ host 槽位 connId 置 null')
  assert(reg.rooms.get('DROP').host.token === 'tok_h', '⑤ ☠️ token 保留（重连要用）')
  assert(!reg.byConn.has('c_h'), '⑤ 掉线的 conn 从 byConn 移除')
  assert(reg.rooms.get('DROP').emptyAt === null, '⑤ guest 还在 → 房间未空，emptyAt 仍 null')

  // guest 也掉线 → 房间空，记 emptyAt
  const d2 = dropConn(reg, 'c_g', 6000)
  assert(reg.rooms.get('DROP').emptyAt === 6000, '⑤ 两槽皆空 → 记 emptyAt')
  assert(deepEq(d2.effects, []), '⑤ 对端已不在 → 无 peer-left 通知')

  // 掉一个不认识的 conn = no-op，不崩
  assert(deepEq(dropConn(reg, 'ghost', 7000).effects, []), '⑤ drop 未知 conn 是 no-op')
}

// ---- ⑥ ☠️ reconnect：token 校验是唯一防线 ----
{
  const reg = makeRegistry()
  createRoom(reg, 'RCON', 'c_h', 'tok_h', 1000)
  joinRoom(reg, 'RCON', 'c_g', 'tok_g', 2000)
  dropConn(reg, 'c_g', 3000)   // guest 掉线

  // ☠️ 错 token 拒。变异：reconnect 跳过 token 校验 → 谁知道房间码就能抢 guest 座位 → 本条红。
  const bad = reconnect(reg, 'RCON', GUEST, 'c_attacker', 'WRONG', 4000)
  assert(!bad.ok && bad.reason === 'bad-token', '⑥ ☠️ 错 token 拒绝重连（房间码会被念出去传播，token 才是秘密）')
  assert(reg.rooms.get('RCON').guest.connId === null, '⑥ 错 token 不重绑（座位仍空）')
  assert(!reg.byConn.has('c_attacker'), '⑥ 攻击者不进 byConn')

  // 对 token 重连成功
  const ok = reconnect(reg, 'RCON', GUEST, 'c_g2', 'tok_g', 5000)
  assert(ok.ok, '⑥ 对 token 重连成功')
  assert(reg.rooms.get('RCON').guest.connId === 'c_g2', '⑥ 重绑到新 connId')
  assert(reg.rooms.get('RCON').emptyAt === null, '⑥ 重连后房间不再算空')
  assert(frameTo(ok, 'c_g2') === 'relay.resumed', '⑥ 给重连者回 relay.resumed')
  assert(frameTo(ok, 'c_h') === 'relay.peer-joined', '⑥ 通知 host 对手回来了')
  assert(deepEq(peersFor(reg, 'c_h'), ['c_g2']), '⑥ 重连后路由指向新 connId')

  // 不存在的房 / 不存在的槽
  assert(reconnect(reg, 'NONE', GUEST, 'x', 't', 6000).reason === 'no-room', '⑥ 重连不存在的房 → no-room')
}

// ---- ⑦ ☠️ reapEmpty：正反双向（超 TTL 删 + 未超不删）----
{
  const reg = makeRegistry()
  createRoom(reg, 'OLD1', 'h1', 't1', 1000)
  createRoom(reg, 'NEW2', 'h2', 't2', 1000)
  dropConn(reg, 'h1', 10000)   // OLD1 空于 t=10000
  dropConn(reg, 'h2', 19000)   // NEW2 空于 t=19000
  const TTL = 5000

  // now=20000：OLD1 空了 10000ms > TTL 该删；NEW2 空了 1000ms < TTL 不该删。
  // ☠️ 变异：reapEmpty 无视 TTL 一律删 → 「未超不删」那条红（对应 test-sw-api-bypass 的反向回归）。
  const rr = reapEmpty(reg, 20000, TTL)
  assert(rr.reaped.includes('OLD1'), '⑦ 超 TTL 的空房被回收')
  assert(!rr.reaped.includes('NEW2'), '⑦ ☠️ 未超 TTL 的空房**不**被回收（反向断言）')
  assert(!reg.rooms.has('OLD1') && reg.rooms.has('NEW2'), '⑦ 注册表状态与回收结果一致')

  // 非空房永不被回收（emptyAt 为 null）
  const reg2 = makeRegistry()
  createRoom(reg2, 'LIVE', 'hL', 'tL', 1000)
  joinRoom(reg2, 'LIVE', 'gL', 'tG', 2000)
  assert(deepEq(reapEmpty(reg2, 999999, 1).reaped, []), '⑦ ☠️ 有活连接的房永不回收（emptyAt=null）')
}

// ---- ⑧ effects 是纯数据（可被外壳无歧义翻译成 socket 操作）----
{
  const reg = makeRegistry()
  const r = createRoom(reg, 'PURE', 'c', 'tk', 1)
  // effects 必须是纯数据 → round-trip 后逐字段相等（外壳靠它无歧义翻译成 socket.send）。
  // 树里混了函数/Set 会让 round-trip 丢字段 → deepEq 失败。
  assert(deepEq(JSON.parse(JSON.stringify(r.effects)), r.effects), '⑧ effects round-trip 无损（纯数据）')
  assert(r.effects.every((e) => e.type === 'send' && typeof e.to === 'string' && e.frame && typeof e.frame.t === 'string'),
    '⑧ 每个 effect 都是 {type:send, to:connId, frame:{t}} 形状')
}

assert(pass > 40, `⑨ 断言真的跑了（实测 ${pass} 条）`)

if (fails.length) {
  console.error(`❌ test-relay-rooms: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-relay-rooms: ${pass} 条断言通过`)
