// test-relay-client.mjs —— relayClient 的纯单元测试（PvP 第 4a 步）。
//
// 注入**假 WebSocket** + **可控 scheduler** → 测分流/token 捕获/状态机/重连的纯逻辑，
// 不需要 ws 包、不需要真服务器 → 进主 CI（run-tests 自动发现）。
// 端到端（真 relayClient + 真 ws + 真中继）由 relay/smoke 覆盖，不进主 CI。
//
// ⚠️ 铁律：新守卫配变异测试（改什么才该变红，写在断言旁）。

import { createRelayClient, STATUS } from '../src/net/relayClient.js'

let pass = 0
const fails = []
const assert = (cond, msg) => { if (cond) pass++; else fails.push(msg) }
const throws = (fn) => { try { fn(); return false } catch { return true } }
// relayClient 的 MAX_RECONNECT=8 → 首连 + 最多 8 次重连 = 9 个 socket。留 1 个余量防边界差一。
const MAX_EXPECTED_SOCKETS = 10

// ---- 假 WebSocket（浏览器接口子集：onopen/onmessage/onclose/onerror + readyState + send/close）----
class FakeWS {
  constructor(url) {
    this.url = url
    this.readyState = 0            // CONNECTING
    this.sent = []
    FakeWS.instances.push(this)
  }
  send(data) { this.sent.push(data) }
  close() { this.readyState = 3; if (this.onclose) this.onclose({}) }   // 主动关：触发 onclose
  // —— 测试驱动辅助 ——
  _open() { this.readyState = 1; if (this.onopen) this.onopen({}) }
  _recv(obj) { if (this.onmessage) this.onmessage({ data: JSON.stringify(obj) }) }
  _recvRaw(text) { if (this.onmessage) this.onmessage({ data: text }) }
  _serverClose() { this.readyState = 3; if (this.onclose) this.onclose({}) }   // 意外断开
}
FakeWS.instances = []

// 可控 scheduler：捕获回调，测试手动 fire（重连不必真等退避）
let scheduled = []
const scheduler = (ms, cb) => { const e = { ms, cb, cancelled: false }; scheduled.push(e); return () => { e.cancelled = true } }
const fireScheduled = () => { const p = scheduled.filter((e) => !e.cancelled); scheduled = []; p.forEach((e) => e.cb()) }

const reset = () => { FakeWS.instances = []; scheduled = [] }
const lastWs = () => FakeWS.instances[FakeWS.instances.length - 1]

const mk = (over = {}) => {
  const events = { control: [], game: [], status: [] }
  const client = createRelayClient({
    url: 'ws://x/api/relay', role: 'host',
    WebSocketImpl: FakeWS, scheduler,
    onControl: (f) => events.control.push(f),
    onGame: (f) => events.game.push(f),
    onStatus: (s) => events.status.push(s),
    ...over,
  })
  return { client, events }
}

// ---- ① 入参校验 ----
{
  reset()
  assert(throws(() => createRelayClient({ url: 'ws://x', role: 'spectator', WebSocketImpl: FakeWS })),
    '① 非法 role 抛错')
  // ⚠️ 不测「没有 WebSocket 实现抛错」：Node 21+ 有**全局 WebSocket**（本机 Node 25），传 undefined
  //    会触发解构默认值 → 取到全局 WebSocket → 守卫不触发。那条守卫是给无 WebSocket 的老浏览器兜底的，
  //    在 Node 里通过公开 API 触发不了。诚实标注：它未被单测覆盖（不是剧场，是不可达）。
}

// ---- ② 连接：建时即开 socket，onopen → connected ----
{
  reset()
  const { events } = mk()
  assert(FakeWS.instances.length === 1, '② 建客户端即开一个 socket')
  assert(events.status[0] === STATUS.CONNECTING, '② 初始状态 connecting')
  lastWs()._open()
  assert(events.status.includes(STATUS.CONNECTED), '② onopen → connected')
}

// ---- ③ ☠️ 分流：relay.* → onControl，游戏帧 → onGame ----
{
  reset()
  const { events } = mk()
  lastWs()._open()
  lastWs()._recv({ t: 'relay.peer-joined' })
  lastWs()._recv({ t: 'sync', state: {}, seq: 1 })
  lastWs()._recv({ t: 'intent', kind: 'attack' })
  // 变异：把分流条件从 `t.startsWith('relay.')` 改成别的 → 控制帧漏进 onGame → 本组红
  assert(events.control.length === 1 && events.control[0].t === 'relay.peer-joined',
    '③ ☠️ relay.* 只进 onControl')
  assert(events.game.length === 2 && events.game[0].t === 'sync' && events.game[1].t === 'intent',
    '③ ☠️ sync/intent 只进 onGame（不进 onControl）')
  assert(!events.control.some((f) => f.t === 'sync'), '③ 游戏帧绝不误进控制回调')
}

// ---- ④ ☠️ token 捕获（重连要用）----
{
  reset()
  const { client } = mk({ role: 'guest', code: 'AB2D' })
  lastWs()._open()
  assert(client.getToken() === null, '④ 初始无 token')
  lastWs()._recv({ t: 'relay.joined', token: 'tok_xyz' })
  // 变异：删掉 relay.joined 的 token 截获 → getToken 恒 null → 重连丢 token → 本条红
  assert(client.getToken() === 'tok_xyz', '④ ☠️ 从 relay.joined 截获 token')

  // relay.created 同样截获 token —— ⚠️ 必须用**全新客户端**测。
  //   凭证是 latch 的（只认第一次，防对端伪造改写重连目标，见 ⑬），在同一个客户端上再喂一帧
  //   会被正确地忽略；沿用旧的「同实例连发两帧」写法测出来的是 latch，不是截获。
  reset()
  const { client: c2 } = mk({ role: 'host' })
  lastWs()._open()
  lastWs()._recv({ t: 'relay.created', code: 'K7P2', token: 'tok_host' })
  assert(c2.getToken() === 'tok_host', '④ relay.created 也截获 token')
}

// ---- ⑤ 非 JSON / 坏消息不崩 ----
{
  reset()
  const { events } = mk()
  lastWs()._open()
  lastWs()._recvRaw('{!@ 非法 JSON')   // 探针帧那种
  lastWs()._recvRaw('')
  assert(events.control.length === 0 && events.game.length === 0, '⑤ 非 JSON 消息被安静丢弃，不崩、不误派')
  lastWs()._recv({ t: 'sync' })
  assert(events.game.length === 1, '⑤ 坏消息之后仍能正常收帧（客户端没挂）')
}

// ---- ⑥ send：只在 OPEN 时发 ----
{
  reset()
  const { client } = mk()
  assert(client.send({ t: 'intent' }) === false, '⑥ 未 open 时 send 返回 false（不发）')
  lastWs()._open()
  assert(client.send({ t: 'intent', kind: 'endTurn' }) === true, '⑥ open 后 send 返回 true')
  assert(lastWs().sent.length === 1 && JSON.parse(lastWs().sent[0]).kind === 'endTurn', '⑥ 帧被 JSON.stringify 发出')
}

// ---- ⑦ ☠️ 重连：意外断开 → 重连；主动 close → 不重连 ----
{
  reset()
  const { client, events } = mk({ role: 'guest', code: 'AB2D' })
  lastWs()._open()
  lastWs()._recv({ t: 'relay.joined', token: 'tok_g' })

  // 意外断开
  lastWs()._serverClose()
  assert(events.status.includes(STATUS.RECONNECTING), '⑦ 意外断开 → reconnecting')
  assert(scheduled.length === 1, '⑦ 排了一次重连')
  const before = FakeWS.instances.length
  fireScheduled()
  // 变异：把 onclose 里的重连整段删掉 → 断开后不再开新 socket → 本条红
  assert(FakeWS.instances.length === before + 1, '⑦ ☠️ 重连真的开了新 socket')
  // ☠️ guest 重连的 URL 必须带 token（否则中继 reconnect 认不出、抢不回槽位）
  assert(lastWs().url.includes('token=tok_g'), '⑦ ☠️ guest 重连 URL 带上 token')
  assert(lastWs().url.includes('room=AB2D'), '⑦ 重连 URL 带房间码')

  // 主动 close：不重连
  reset()
  const c2 = mk().client
  lastWs()._open()
  const n = FakeWS.instances.length
  c2.close()
  assert(scheduled.length === 0, '⑦ ☠️ 主动 close 不排重连')
  // 变异：close 不设 closedByUs → onclose 会触发重连 → 本条红
  lastWs()._serverClose()   // 主动关后即使再来 close 事件
  assert(FakeWS.instances.length === n, '⑦ ☠️ 主动 close 后不再开新 socket')
}

// ---- ⑧ guest 首连 URL（不带 token）vs host 首连 URL ----
{
  reset()
  mk({ role: 'guest', code: 'K7P2' })
  assert(lastWs().url.includes('role=guest') && lastWs().url.includes('room=K7P2') && !lastWs().url.includes('token='),
    '⑧ guest 首连 URL：role+room，无 token')
  reset()
  mk({ role: 'host' })
  // host **首连**仍然只有 role —— 建房时客户端不得指定房间码（中继才铸码）。
  // 变异：把 fullUrl 的 `if (roomCode)` 改成无条件 q.set('room', roomCode ?? '') → 本条红。
  assert(lastWs().url.includes('role=host') && !lastWs().url.includes('room=') && !lastWs().url.includes('token='),
    '⑧ host 首连 URL：只有 role，无 room/token')
}

// ---- ⑨ ☠️ 续局（host 自恢复）：注入的凭证必须**首连就带上** ----
//   4g 场景：host 刷新页面 → 内存全丢 → 新页面从 localStorage 取回 code+token 注入。
//   ☠️ 这是整条恢复链的硬阻断点：中继把「无 token 的 role=host」一律当**建房**，
//      而且**忽略客户端给的 room**（control.js:61，防的是自选房间码占码/碰撞）——
//      所以只传 code 不传 token 不是「差一点」，是会**静默铸一间新房**，
//      原房里的孩子从此一帧都收不到，而屏幕上什么错都不报。
//   变异：createRelayClient 的解构里删掉 token（回到今天的形状）→ 本组两条红。
{
  reset()
  mk({ role: 'host', code: '4BZU', token: 'tok_saved' })
  const u = lastWs().url
  assert(u.includes('room=4BZU') && u.includes('token=tok_saved'),
    '⑨ ☠️ 续局首连 URL 必须同时带 room 与注入的 token —— 缺 token 中继会静默铸新房')
  assert(u.includes('role=host'), '⑨ 续局首连仍标明 role=host')
}

// ---- ⑩ ☠️ host 断线重连：必须回原房，不得新建房 ----
//   真机 bug：fullUrl 旧版是 `if (role === 'guest') {...}` → host 重连带不出凭证 →
//   中继当它是新 host → 静默铸新房（实测 4BZU → QWJV），原房里的 guest 永久收不到帧。
{
  reset()
  const { client } = mk({ role: 'host' })          // host 建客户端时**没有** code
  lastWs()._open()
  lastWs()._recv({ t: 'relay.created', code: '4BZU', token: 'tok_host' })
  // 变异：删掉 relay.created 里截获 frame.code 那一行 → 本条 + 重连 URL 带码那条 红
  // ⚠️ 用 typeof 包一层再调：未修版本没有 getCode，直接调会抛 TypeError **崩掉整个进程** ——
  //    那样同组后面几条根本跑不到，看不出它们各自是否变红（变异测试要的是干净的红名单，不是崩溃）。
  assert(typeof client.getCode === 'function' && client.getCode() === '4BZU',
    '⑩ ☠️ host 从 relay.created 截获房间码（客户端自己不知道码）')
  assert(client.getToken() === 'tok_host', '⑩ host 截获 token')

  lastWs()._serverClose()                          // 意外断开
  fireScheduled()
  const u = lastWs().url
  // 变异：fullUrl 退回 `if (role === 'guest')` 包裹（今天的 bug 原样）→ 下面两条红
  assert(u.includes('room=4BZU'), '⑩ ☠️ host 重连 URL 必须带原房间码 —— 缺它中继会铸新房、对局静默卡死')
  assert(u.includes('token=tok_host'), '⑩ ☠️ host 重连 URL 必须带 token —— 它是 reconnect 的唯一凭证')
  assert(u.includes('role=host'), '⑩ host 重连 URL 仍标明 role=host')
}

// ---- ⑪ ☠️ 连续被中继拒绝 → 重连必须**有界**（不得无限循环）----
//   中继的拒绝是应用层的，发生在 WS 握手**之后** → onopen 照样先触发。若无条件
//   `reconnectAttempts = 0`，计数器永远回到 0、MAX_RECONNECT 够不着：真机实测一个打错的
//   房间码让客户端每 500ms 敲一次中继、12 秒 24 次永不停手，且每次都在中继侧漏一个 sockets 表项。
{
  reset()
  const { client } = mk({ role: 'guest', code: 'ZZZZ' })
  // 模拟中继持续拒绝：每一轮都 open（握手成功）→ relay.error → close
  let rounds = 0
  for (; rounds < 40; rounds++) {
    lastWs()._open()
    lastWs()._recv({ t: 'relay.error', reason: 'no-room' })
    lastWs()._serverClose()
    if (scheduled.length === 0) break     // 已停手
    fireScheduled()
  }
  // 变异：把 onopen 的 `if (!sawReject)` 去掉、恢复成无条件 reconnectAttempts = 0 → 本条红
  //       （循环会一直排下去，跑满 40 轮也停不下来）
  assert(rounds < 40, `⑪ ☠️ 连续被拒必须停手 —— 实测 ${rounds} 轮后停（无界的话会跑满 40 轮）`)
  assert(FakeWS.instances.length <= MAX_EXPECTED_SOCKETS,
    `⑪ ☠️ 被拒时开的 socket 数受 MAX_RECONNECT 约束（实测 ${FakeWS.instances.length} 个）`)
  assert(client.getStatus() === STATUS.CLOSED, '⑪ 连续被拒到上限后状态落到 closed')
}

// ---- ⑫ 时变的拒绝（full / bad-token）必须仍有自愈机会 —— ⑪ 不得矫枉过正 ----
//   `full` 是**会自己好转**的：旧 socket 还占着槽位时中继答 full，等它被心跳判死（30s）
//   槽位就空了。一见 relay.error 就永久停手会把这类场景一枪打死（那是本修复初版的毛病）。
{
  reset()
  const { client } = mk({ role: 'guest', code: 'AB2D' })
  lastWs()._open()
  lastWs()._recv({ t: 'relay.error', reason: 'full' })   // 第一轮：槽位还被旧 socket 占着
  lastWs()._serverClose()
  // 变异：改回布尔 givenUp「见错即永久停手」→ 本条红（一次就死，等不到槽位空出来）
  assert(scheduled.length === 1, '⑫ ☠️ 吃到 full 之后仍然排重连（槽位会自己空出来）')

  fireScheduled()
  lastWs()._open()
  lastWs()._recv({ t: 'relay.joined', token: 'tok_g' })  // 第二轮：槽位空了，进去了
  assert(client.getToken() === 'tok_g', '⑫ 重试成功后拿到 token（自愈成立）')

  // 自愈之后预算要回满：再来一次普通闪断，仍应照常重连
  lastWs()._serverClose()
  assert(scheduled.length === 1, '⑫ 握手被接受后重连预算复位（后续闪断不受之前被拒的影响）')
}

// ---- ⑬ ☠️ 重连凭证只认第一次（latch）—— 对端伪造的控制帧不得改写我的重连目标 ----
//   中继是哑的：对端发的任何 JSON 都会被原样盲转过来，而客户端只按 `t` 前缀就当成可信控制帧。
//   若凭证可被覆盖，房里的对端发一帧伪造 relay.created 就能把我闪断后的重连**重定向进他的房间**，
//   并让我把棋盘快照推过去。
{
  reset()
  const { client } = mk({ role: 'host' })
  lastWs()._open()
  lastWs()._recv({ t: 'relay.created', code: '4BZU', token: 'tok_real' })
  lastWs()._recv({ t: 'relay.created', code: 'EVIL', token: 'tok_evil' })   // 对端伪造的
  // 变异：把 latch 条件（token === null / roomCode === null）去掉 → 下面两条红
  assert(client.getCode() === '4BZU', '⑬ ☠️ 房间码只认第一次 —— 对端伪造的 relay.created 改不掉')
  assert(client.getToken() === 'tok_real', '⑬ ☠️ token 只认第一次')

  lastWs()._serverClose()
  fireScheduled()
  assert(lastWs().url.includes('room=4BZU') && !lastWs().url.includes('EVIL'),
    '⑬ ☠️ 重连仍然回**原**房间（没被重定向到对端指定的房）')
}

assert(pass > 33, `⑨ 断言真的跑了（实测 ${pass} 条）`)

if (fails.length) {
  console.error(`❌ test-relay-client: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-relay-client: ${pass} 条断言通过`)
