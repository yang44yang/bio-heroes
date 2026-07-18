// smoke/run.mjs —— 中继 IO 外壳的本地冒烟测（PvP 第 3 步）。
//
// 纯函数核心由 scripts/test-relay-*.mjs 逐条钉（进主 CI）。本文件测**接线**：真的起 ws server、
// 真的连两个客户端、真的握手 + 盲转。用 ws → 不进主 CI（主 CI 不装 ws），是本地/独立 job 门禁。
//
// ☠️ 核心断言：guest 发一个**故意非法 JSON 的探针帧**，host 必须收到**逐字节一致**的字节。
//    这正是「哑中继盲转、不理解内容」的可执行证据 —— 若中继偷偷 JSON.parse 了，非法帧就转不过去。

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { WebSocket } from 'ws'

const HERE = dirname(fileURLToPath(import.meta.url))
const RELAY_DIR = join(HERE, '..')
const PORT = Number(process.env.SMOKE_PORT || 3999)
const BASE = `ws://127.0.0.1:${PORT}/api/relay`

let pass = 0
const fails = []
const ok = (cond, msg) => { if (cond) { pass++; console.log(`  ✓ ${msg}`) } else { fails.push(msg); console.log(`  ✗ ${msg}`) } }

// ---- 小工具 ----
const nextMsg = (ws) => new Promise((res, rej) => {
  const timer = setTimeout(() => rej(new Error('等消息超时')), 3000)
  ws.once('message', (data, isBinary) => { clearTimeout(timer); res({ data, isBinary }) })
})
const opened = (ws) => new Promise((res, rej) => {
  ws.once('open', res)
  ws.once('error', rej)
})
const ctrl = ({ data }) => JSON.parse(data.toString())   // 控制帧是 JSON
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// ---- 起 server 子进程 ----
function startServer() {
  const srv = spawn('node', ['server.js'], {
    cwd: RELAY_DIR,
    env: { ...process.env, RELAY_PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  srv.stderr.on('data', (d) => process.stderr.write(`[srv] ${d}`))
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('server 启动超时')), 5000)
    srv.stdout.on('data', (d) => {
      process.stdout.write(`[srv] ${d}`)
      if (String(d).includes('监听')) { clearTimeout(timer); res(srv) }
    })
    srv.once('exit', (code) => rej(new Error(`server 提前退出 code=${code}`)))
  })
}

let srv
try {
  srv = await startServer()

  // ---- ① host 建房 ----
  const host = new WebSocket(`${BASE}?role=host`)
  await opened(host)
  const created = ctrl(await nextMsg(host))
  ok(created.t === 'relay.created' && /^[A-Z0-9]{4}$/.test(created.code), `host 建房，拿到房间码 ${created.code}`)
  ok(typeof created.token === 'string' && created.token.length > 0, 'host 拿到 token')
  const code = created.code

  // ---- ② guest 加入 ----
  const guest = new WebSocket(`${BASE}?role=guest&room=${code.toLowerCase()}`)  // 小写测归一化
  await opened(guest)
  const joined = ctrl(await nextMsg(guest))
  const peerJoined = ctrl(await nextMsg(host))
  ok(joined.t === 'relay.joined', 'guest 收到 relay.joined')
  ok(peerJoined.t === 'relay.peer-joined', 'host 收到 relay.peer-joined')

  // ---- ③ ☠️ 盲转：非法 JSON 探针帧逐字节一致 ----
  const probeG2H = Buffer.from([0x7b, 0x21, 0x40, 0x00, 0xff, 0xfe, 0x2d, 0x49, 0x4e, 0x54])  // '{!@\0\xff\xfe-INT' —— 非法 JSON + 二进制
  const gotAtHost = nextMsg(host)
  guest.send(probeG2H, { binary: true })
  const h = await gotAtHost
  ok(Buffer.isBuffer(h.data) && Buffer.compare(h.data, probeG2H) === 0,
    '☠️ guest→host 探针逐字节一致（中继盲转、不解析内容）')

  const probeH2G = Buffer.from('SYNC-PROBE-█-not-json-{{{')
  const gotAtGuest = nextMsg(guest)
  host.send(probeH2G, { binary: true })
  const g = await gotAtGuest
  ok(Buffer.compare(g.data, probeH2G) === 0, '☠️ host→guest 探针逐字节一致')

  // ---- ④ 满房拒绝 ----
  const third = new WebSocket(`${BASE}?role=guest&room=${code}`)
  await opened(third)
  const rejFull = ctrl(await nextMsg(third))
  ok(rejFull.t === 'relay.error' && rejFull.reason === 'full', '满房拒第三个连接（relay.error full）')

  // ---- ⑤ 错房间码拒绝 ----
  const lost = new WebSocket(`${BASE}?role=guest&room=ZZZZ`)
  await opened(lost)
  const rejNoRoom = ctrl(await nextMsg(lost))
  ok(rejNoRoom.t === 'relay.error' && rejNoRoom.reason === 'no-room', '错房间码拒（relay.error no-room）')

  // ---- ⑥ 非法握手拒绝 ----
  const bad = new WebSocket(`${BASE}?role=spectator`)
  await opened(bad)
  const rejRole = ctrl(await nextMsg(bad))
  ok(rejRole.t === 'relay.error' && rejRole.reason === 'bad-role', '非法 role 拒（relay.error bad-role）')

  // ---- ⑦ health 端点 ----
  const health = await fetch(`http://127.0.0.1:${PORT}/api/health`).then((r) => r.json())
  ok(health.ok === true, `health 端点 ok（rooms=${health.rooms}）`)

  host.close(); guest.close(); third.close(); lost.close(); bad.close()
  await wait(100)
} catch (err) {
  fails.push(`冒烟异常: ${err?.message}`)
  console.error('❌ 冒烟异常:', err)
} finally {
  if (srv) srv.kill('SIGTERM')
}

await wait(200)
if (fails.length) {
  console.error(`\n❌ 冒烟失败 ${fails.length} 条：`)
  for (const f of fails) console.error('   · ' + f)
  process.exit(1)
}
console.log(`\n✅ 中继冒烟通过：${pass} 条`)
process.exit(0)
