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
//   · 重连：意外断开自动重连（guest 带 token 走 reconnect；host 迁移的 host 重连是后话）
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
 * @param {string} [opts.code]     guest 加入用的房间码
 * @param {Function} [opts.WebSocketImpl] 注入的 WebSocket 构造器（默认全局 WebSocket）
 * @param {(ms:number, cb:Function)=>Function} [opts.scheduler] 注入定时器，返回 cancel（默认 setTimeout）
 * @param {(frame:object)=>void} [opts.onControl] 收到 relay.* 控制帧
 * @param {(frame:object)=>void} [opts.onGame]    收到游戏帧（sync/intent/resume）
 * @param {(status:string)=>void} [opts.onStatus] 状态变化
 * @returns {{ send:Function, close:Function, getStatus:Function, getToken:Function }}
 */
export function createRelayClient(opts) {
  const {
    url, role, code,
    WebSocketImpl = (typeof WebSocket !== 'undefined' ? WebSocket : undefined),
    scheduler = defaultScheduler,
    onControl = () => {}, onGame = () => {}, onStatus = () => {},
  } = opts

  if (!WebSocketImpl) throw new Error('createRelayClient: 没有 WebSocket 实现（浏览器应有全局 WebSocket；node 测试请注入 WebSocketImpl）')
  if (role !== 'host' && role !== 'guest') throw new Error(`createRelayClient: role 必须是 host/guest，收到 ${JSON.stringify(role)}`)

  let ws = null
  let status = STATUS.CLOSED
  let token = null            // 从 relay.created/relay.joined 收到，重连用
  let closedByUs = false      // 主动 close 不触发重连
  let reconnectAttempts = 0
  let cancelReconnect = null  // scheduler 返回的 cancel

  function setStatus(s) {
    if (status === s) return
    status = s
    onStatus(s)
  }

  // 组装带 query 的完整 URL。guest 重连带上 token → 中继走 reconnect 分支。
  function fullUrl() {
    const q = new URLSearchParams({ role })
    if (role === 'guest') {
      q.set('room', code)
      if (token) q.set('token', token)
    }
    return `${url}?${q.toString()}`
  }

  function open() {
    setStatus(reconnectAttempts > 0 ? STATUS.RECONNECTING : STATUS.CONNECTING)
    ws = new WebSocketImpl(fullUrl())

    ws.onopen = () => {
      reconnectAttempts = 0
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
        // 控制帧：截获 token（重连要用），再交给 lobby
        if (t === 'relay.created' || t === 'relay.joined') {
          if (typeof frame.token === 'string') token = frame.token
        }
        onControl(frame)
      } else {
        onGame(frame)   // 游戏帧交给上层（第 4c/4d 的 battle 适配器）
      }
    }

    ws.onclose = () => {
      if (closedByUs) { setStatus(STATUS.CLOSED); return }
      // 意外断开 → 重连（带退避）。超过上限就停手，报 closed。
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
  }
}
