// relayClient.js —— PvP 中继的**客户端**（PvP 第 4a 步）。
//
// 一个框架无关的 WebSocket 客户端封装。React 外壳（useRelay hook / PvpLobby）包它，
// 但它本身零 React → 能在 node 里用 `ws` 包对着真中继端到端测（scripts/test-relay-client）。
//
// ## 职责边界
// 它只做**连接 + 分流 + 收发**，不懂游戏：
//   · 分流：按 `t` 前缀把入站消息分成「控制帧」（relay.*，lobby 处理）和「游戏帧」
//     （sync/intent/resume，交给上层的 onGame —— 第 4c/4d 的 battle 适配器接）
//   · 收发：send(obj) 把游戏帧 JSON 发出去（guest 发 intent、host 发 sync）
//   · 状态：connecting / connected / reconnecting / closed，回调 onStatus
//   · 重连：意外断开自动重连（**host / guest 对称**：都带 room+token 走中继的 reconnect 分支。
//     凭证从 relay.created / relay.joined 截获 → fullUrl 组装时**不看 role、只看凭证在不在**。
//     ⚠️ 这里覆盖的是「同一页面内的 socket 闪断」；host **刷新页面**会丢掉内存里的凭证，
//     那属于 host 迁移（4g）的范畴，仍是后话。）
//   · 有界重试：收到 relay.error（握手拒绝）时**不清零重连计数** —— 拒绝发生在 WS 握手**之后**，
//     onopen 照样先触发，无条件清零会让 MAX_RECONNECT 永远够不着（每 500ms 一次的永久循环）。
//     不用「一见错就永久停手」，是因为 `full` / `bad-token` 是**时变**的、会自己好转。
//
// ## ☠️ 注入 WebSocket 实现 + scheduler（同 roomCode 注入熵的纪律）
// 浏览器用全局 `WebSocket` + `setTimeout`；node 测试注入 `ws` 的 `WebSocket` + 可控 scheduler。
// 不写死 → 可测（重连退避不必真等 8 秒）。
//
// ## 中继控制帧词汇（出站，中继 author）
//   relay.created{code,token} / relay.joined{token} / relay.peer-joined / relay.peer-left /
//   relay.resumed / relay.error{reason}
// 游戏帧的 t 只会是 sync/intent/resume（wire.js:72）→ 前缀 'relay.' 永不撞。

/** 连接状态。 */
export const STATUS = Object.freeze({
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  CLOSED: 'closed',
})

const DEFAULT_BACKOFF = [500, 1000, 2000, 4000, 8000]   // 重连退避（ms），封顶后维持末值
const MAX_RECONNECT = 8                                   // 连续失败上限，超了停手（避免无限重连）

// 默认 scheduler：收 (ms, cb)，返回一个 cancel 函数。测试可注入可控时钟。
const defaultScheduler = (ms, cb) => { const id = setTimeout(cb, ms); return () => clearTimeout(id) }

/**
 * 建一个中继客户端。
 *
 * @param {object} opts
 * @param {string} opts.url        中继 WS 端点，如 'ws://127.0.0.1:3002/api/relay'（不含 query）
 * @param {'host'|'guest'} opts.role
 * @param {string} [opts.code]     房间码：guest 加入用；**host 续局时也要传**（配合 token 走 reconnect）
 * @param {string} [opts.token]    重连凭证。续局（host 自恢复）时由调用方从 localStorage 取出注入 ——
 *                                 没有它，新页面在**协议层**就回不到原房间：中继把「无 token 的
 *                                 role=host」一律当建房、并**忽略客户端给的 room**（control.js:61，
 *                                 防的是自选房间码占码/碰撞），于是会静默铸一间新房，
 *                                 原房里的孩子从此一帧都收不到。引擎那边恢复得再全也白搭。
 * @param {Function} [opts.WebSocketImpl] 注入的 WebSocket 构造器（默认全局 WebSocket）
 * @param {(ms:number, cb:Function)=>Function} [opts.scheduler] 注入定时器，返回 cancel（默认 setTimeout）
 * @param {(frame:object)=>void} [opts.onControl] 收到 relay.* 控制帧
 * @param {(frame:object)=>void} [opts.onGame]    收到游戏帧（sync/intent/resume）
 * @param {(status:string)=>void} [opts.onStatus] 状态变化
 * @returns {{ send:Function, close:Function, getStatus:Function, getToken:Function, getCode:Function }}
 */
export function createRelayClient(opts) {
  const {
    url, role, code, token: initialToken,
    WebSocketImpl = (typeof WebSocket !== 'undefined' ? WebSocket : undefined),
    scheduler = defaultScheduler,
    onControl = () => {}, onGame = () => {}, onStatus = () => {},
  } = opts

  if (!WebSocketImpl) throw new Error('createRelayClient: 没有 WebSocket 实现（浏览器应有全局 WebSocket；node 测试请注入 WebSocketImpl）')
  if (role !== 'host' && role !== 'guest') throw new Error(`createRelayClient: role 必须是 host/guest，收到 ${JSON.stringify(role)}`)

  let ws = null
  let status = STATUS.CLOSED
  // token：正常路径从 relay.created/relay.joined 收到；**续局路径由 opts 注入**（见上方 JSDoc）。
  // 注入的 token 走的是与闪断重连**完全同一条**代码路径（fullUrl 只看凭证在不在，不看 role），
  // 所以续局不是新增一条分支，而是复用已经被真机验证过的那条。
  let token = initialToken ?? null
  let roomCode = code ?? null // host 建房时为 null，从 relay.created 学到；guest 是用户输入的
  let closedByUs = false      // 主动 close 不触发重连
  let sawReject = false       // 上一轮连接被中继拒了（见 onopen 的计数器纪律）
  let reconnectAttempts = 0
  let cancelReconnect = null  // scheduler 返回的 cancel

  function setStatus(s) {
    if (status === s) return
    status = s
    onStatus(s)
  }

  // 组装带 query 的完整 URL。带上 token → 中继走 reconnect 分支。
  //
  // ☠️ **不看 role，只看凭证在不在** —— 这是本函数最重要的一行纪律。
  //   旧版是 `if (role === 'guest') { ... }`：host 重连时带不出 room/token → 中继把它当新 host
  //   → 静默铸新房，原房里的 guest 从此收不到任何帧（真机实测 4BZU → 闪断 → QWJV）。
  //   把凭证组装写成 role-blind，整类 bug 在结构上就不存在了 —— 不需要谁记得「host 也要带」。
  //   host 首连时 roomCode/token 都还是 null → URL 仍是 `?role=host`（建房语义不变）。
  function fullUrl() {
    const q = new URLSearchParams({ role })
    if (roomCode) q.set('room', roomCode)
    if (token) q.set('token', token)
    return `${url}?${q.toString()}`
  }

  function open() {
    setStatus(reconnectAttempts > 0 ? STATUS.RECONNECTING : STATUS.CONNECTING)
    ws = new WebSocketImpl(fullUrl())

    ws.onopen = () => {
      // ☠️ **被拒的那一轮不许清零计数器** —— 中继的拒绝是应用层的，发生在 WS 握手**之后**：
      //   onopen 照样先触发。无条件清零 → reconnectAttempts 永远回到 0 → MAX_RECONNECT
      //   够不着 → 每 500ms 敲一次中继的永久循环（真机实测 12 秒 24 次，还每次在中继侧漏个表项）。
      //   只跳过这一次清零，退避与上限就自然生效：最多 8 次、约 40 秒后落 closed。
      //   这样既杀掉无限循环，又**保留了对时变拒绝的自愈能力** —— `full`（旧 socket 还占着槽位，
      //   中继要等 30s 心跳才判死）和 `bad-token`（槽位被抢后旧凭证作废）都会随时间自己好转，
      //   一见 relay.error 就永久停手会把这些场景一枪打死。
      if (!sawReject) reconnectAttempts = 0
      setStatus(STATUS.CONNECTED)
    }

    ws.onmessage = (evt) => {
      // 每条消息独立 try/catch —— 一条坏消息不该拖垮客户端（对称于 server 的每消息 try/catch）。
      let frame
      try {
        const text = typeof evt.data === 'string' ? evt.data : String(evt.data)
        frame = JSON.parse(text)
      } catch {
        return   // 非 JSON = 不认识，丢弃（中继盲转的是 JSON 游戏帧；探针帧只在冒烟里出现）
      }
      const t = frame?.t
      if (typeof t === 'string' && t.startsWith('relay.')) {
        // 控制帧：截获重连凭证（token + 房间码），再交给 lobby
        if (t === 'relay.created' || t === 'relay.joined') {
          // ☠️ 凭证**只认第一次**（latch）。中继是设计上的哑中继：它把对端发的任何 JSON 原样盲转
          //   过来，而这里只按 `t` 前缀就认成「中继 author 的可信控制帧」。若允许覆盖，房间里的
          //   对端发一帧伪造的 relay.created 就能改写我的重连目标 —— 我闪断后会重连进**他指定的
          //   房间**，并把棋盘快照推给那边。latch 之后，对端最多只能在真凭证到达前抢跑（毫秒级）。
          //   合法路径本来也只发一次：code 只在 relay.created 里回来、token 只在 created/joined 里回来，
          //   重连成功回的是 relay.resumed（不带凭证）。所以 latch 不会挡掉任何正常流程。
          if (token === null && typeof frame.token === 'string') token = frame.token
          if (roomCode === null && typeof frame.code === 'string') roomCode = frame.code
        }
        // 握手被接受 → 这一轮是健康的：清掉拒绝标记和重连预算
        if (t === 'relay.created' || t === 'relay.joined' || t === 'relay.resumed') {
          sawReject = false
          reconnectAttempts = 0
        }
        // 握手被拒（no-room / bad-token / full / bad-room…），紧跟着就 close。
        // 记下它，让下一次 onopen **不要**清零重连计数（理由见 onopen 处的长注释）。
        if (t === 'relay.error') sawReject = true
        onControl(frame)
      } else {
        onGame(frame)   // 游戏帧交给上层（第 4c/4d 的 battle 适配器）
      }
    }

    ws.onclose = () => {
      if (closedByUs) { setStatus(STATUS.CLOSED); return }
      // 意外断开 / 被拒 → 重连（带退避）。超过上限就停手，报 closed。
      // 被拒的那一轮没清零计数（见 onopen）→ 连续被拒最多 MAX_RECONNECT 次就落 closed。
      if (reconnectAttempts >= MAX_RECONNECT) { setStatus(STATUS.CLOSED); return }
      const delay = DEFAULT_BACKOFF[Math.min(reconnectAttempts, DEFAULT_BACKOFF.length - 1)]
      reconnectAttempts += 1
      setStatus(STATUS.RECONNECTING)
      cancelReconnect = scheduler(delay, () => { cancelReconnect = null; if (!closedByUs) open() })
    }

    ws.onerror = () => {
      // onerror 后浏览器会紧跟 onclose → 重连逻辑统一在 onclose 里，这里不重复。
    }
  }

  open()

  return {
    /** 发一个游戏帧（对象，会 JSON.stringify）。未连接时静默丢弃（上层靠快照/重连兜底），返回是否发出。 */
    send(frame) {
      if (ws && ws.readyState === 1 /* OPEN */) {
        ws.send(JSON.stringify(frame))
        return true
      }
      return false
    },
    /** 主动关闭（不触发重连）。 */
    close() {
      closedByUs = true
      if (cancelReconnect) { cancelReconnect(); cancelReconnect = null }
      if (ws) { try { ws.close(1000, 'client-close') } catch { /* 已关 */ } }
      setStatus(STATUS.CLOSED)
    },
    getStatus() { return status },
    getToken() { return token },
    /** 当前房间码（host 建房后从 relay.created 学到；guest 是加入时输入的）。重连凭证之一。 */
    getCode() { return roomCode },
  }
}
