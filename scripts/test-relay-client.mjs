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
  lastWs()._recv({ t: 'relay.created', token: 'tok_host' })
  assert(client.getToken() === 'tok_host', '④ relay.created 也截获 token')
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

// ---- ⑧ guest 首连 URL（不带 token）vs host URL ----
{
  reset()
  mk({ role: 'guest', code: 'K7P2' })
  assert(lastWs().url.includes('role=guest') && lastWs().url.includes('room=K7P2') && !lastWs().url.includes('token='),
    '⑧ guest 首连 URL：role+room，无 token')
  reset()
  mk({ role: 'host' })
  assert(lastWs().url.includes('role=host') && !lastWs().url.includes('room='),
    '⑧ host URL：只有 role，无 room')
}

assert(pass > 20, `⑨ 断言真的跑了（实测 ${pass} 条）`)

if (fails.length) {
  console.error(`❌ test-relay-client: ${fails.length} 条失败`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`✅ test-relay-client: ${pass} 条断言通过`)
