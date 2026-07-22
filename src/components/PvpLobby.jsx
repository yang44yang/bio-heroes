// PvpLobby.jsx —— PvP 房间码大厅 + 选卡组（PvP 第 4a 步；选卡组步）。
//
// 建房 / 加入 / 连接 / **各自选卡组** / 开战。连接经 relayClient 到中继。
// 选卡组：双方各选一套（预设主题队 或 自己存的卡组），guest 的选择**在大厅阶段经中继发给 host**
//   （host 权威握双方牌）。开战按钮门控 `我已选 && 对手已就位 && 对手卡组已到`，防 host 挂载时
//   guest 卡组为 null 崩 useHand。
//
// i18n：内联中文（同既有约定）。
import { useState, useRef, useEffect, useCallback } from 'react'
import { createRelayClient, STATUS } from '../net/relayClient'
import { encodeDeckFrame, decodeDeckFrame } from '../net/lobbyProtocol'
import { resolveDeck } from '../data/deckResolve'
import { DECK_SIZE } from '../data/deckRules'
import PvpHostBattleScreen from './PvpHostBattleScreen'
import GuestBattleScreen from './GuestBattleScreen'
import PvpDeckPicker from './PvpDeckPicker'
import DeckBuilder from './DeckBuilder'

// 中继 WS 端点：同源 /api/relay（dev/preview 经 vite ^/api/ 代理 ws:true 到 3002；生产经 Caddy 反代）。
function relayUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/api/relay`
}

const STATUS_TEXT = {
  [STATUS.CONNECTING]: '连接中…',
  [STATUS.CONNECTED]: '已连接',
  [STATUS.RECONNECTING]: '断线重连中…',
  [STATUS.CLOSED]: '未连接',
}

const ERROR_TEXT = {
  'no-room': '房间不存在（检查房间码）',
  full: '房间已满',
  'bad-room': '房间码无效',
  'bad-role': '连接参数错误',
  'bad-token': '重连凭证失效，请重新加入',
  'no-code': '服务器繁忙，请重试',
  'handshake-error': '握手失败，请重试',
  'deck-invalid': '卡组已失效，请重新选择',
}

export default function PvpLobby({ onExit }) {
  const [mode, setMode] = useState('choose')   // choose | host | guest
  const [status, setStatus] = useState(STATUS.CLOSED)
  const [roomCode, setRoomCode] = useState('')
  const [peerPresent, setPeerPresent] = useState(false)
  const [error, setError] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [battleOn, setBattleOn] = useState(false)   // host 点「开始对战」/ guest 收首帧 sync 后进战斗
  const [editingDecks, setEditingDecks] = useState(false) // 进 DeckBuilder 建/改卡组（全卡池）
  const [myPick, setMyPick] = useState(null)        // 本方选中的卡组 { id, main:[ids], sp:[ids] }
  const [guestDeckReady, setGuestDeckReady] = useState(false) // host 侧：已收到 guest 卡组
  // ★ 「通路刚恢复」的计数器 —— 每次 relay.resumed（自己重连回来）或 relay.peer-joined
  //   （对手重连回来）就 +1，向下传给 usePvpHost 触发**强制重推一帧全量 sync**。
  //   没有它，修好握手也只恢复了「传输」：usePvpHost 的推送 effect 依赖
  //   [enabled, client, battleState, 双方手牌]，重连前后这四个引用**一个都不变**
  //   （client 是同一个闭包对象、battleState 是 useReducer 状态）→ effect 不重跑
  //   → guest 屏幕一直冻着，直到 host 下一次真的动棋盘。
  const [resumeTick, setResumeTick] = useState(0)
  const clientRef = useRef(null)
  // ★ 游戏帧转发 ref —— client 建在大厅、处理器装在战斗侧（usePvpHost / useGuestBattle）。
  const gameFrameRef = useRef(null)
  // ★ guest 缓存最近一帧 sync —— 消掉「战斗组件挂载前那帧丢了」的竞态。
  const lastSyncRef = useRef(null)
  // ★ host 侧：guest 经中继发来的卡组（{main,sp} ID 数组）；开战时 resolveDeck 成对象喂 useHand。
  const guestDeckRef = useRef(null)
  // ★ guest 侧：本方卡组，重连时重发（掉线中继会保槽位等重连）。
  const myDeckRef = useRef(null)

  const teardown = useCallback(() => {
    if (clientRef.current) { clientRef.current.close(); clientRef.current = null }
    setStatus(STATUS.CLOSED); setPeerPresent(false); setRoomCode(''); setError(null)
  }, [])

  // 卸载时关闭连接（防泄漏 socket）
  useEffect(() => () => teardown(), [teardown])

  const startHost = useCallback(() => {
    setError(null); setMode('host')
    clientRef.current = createRelayClient({
      url: relayUrl(), role: 'host',
      onStatus: setStatus,
      onControl: (f) => {
        if (f.t === 'relay.created') setRoomCode(f.code)
        // 对手（重）加入 / 自己重连回来 —— 两者都意味着通路刚恢复，要给对面补一帧全量快照
        else if (f.t === 'relay.peer-joined') { setPeerPresent(true); setResumeTick((n) => n + 1) }
        // ☠️ peerPresent 读中继给的真相，不猜：掉线期间的 peer-joined/peer-left 是**净丢失**的
        //   （对端不在线时 applyEffects 直接 no-op），回来时本地那份认知已经过期。
        else if (f.t === 'relay.resumed') {
          setError(null)
          setPeerPresent(!!f.peerPresent)
          if (!f.peerPresent) { setGuestDeckReady(false); guestDeckRef.current = null }
          setResumeTick((n) => n + 1)
        }
        else if (f.t === 'relay.peer-left') { setPeerPresent(false); setGuestDeckReady(false); guestDeckRef.current = null }
        else if (f.t === 'relay.error') setError(f.reason)
      },
      // ★ 先拦「卡组帧」（大厅阶段，gameFrameRef 还没装）：存进 ref，标记 guest 卡组已到。
      //   其余（sync/intent）转给 usePvpHost 装的处理器（战斗挂载后）。
      onGame: (f) => {
        const d = decodeDeckFrame(f)
        if (d.ok) { guestDeckRef.current = { main: d.main, sp: d.sp }; setGuestDeckReady(true); return }
        gameFrameRef.current?.(f)
      },
    })
  }, [])

  const startGuest = useCallback(() => {
    const code = joinCode.trim().toUpperCase()
    if (code.length !== 4) { setError('请输入 4 位房间码'); return }
    setError(null); setMode('guest')
    clientRef.current = createRelayClient({
      url: relayUrl(), role: 'guest', code,
      onStatus: setStatus,
      onControl: (f) => {
        if (f.t === 'relay.joined') { setRoomCode(code); setPeerPresent(true) }
        else if (f.t === 'relay.peer-joined') setPeerPresent(true)
        // 自己重连成功 → 清掉重连过程中可能挂上的红字错误（否则对局好好的、屏幕上还挂着报错）。
        // peerPresent 同样读中继给的真相，不猜（理由见 host 分支）。
        else if (f.t === 'relay.resumed') { setError(null); setPeerPresent(!!f.peerPresent) }
        else if (f.t === 'relay.peer-left') setPeerPresent(false)
        else if (f.t === 'relay.error') setError(f.reason)
      },
      // ★ guest 收到第一帧 sync = host 开战了 → 自动进战斗（缓存该帧防竞态）。
      onGame: (f) => {
        if (f?.t === 'sync') { lastSyncRef.current = f; setBattleOn(true) }
        gameFrameRef.current?.(f)
      },
    })
  }, [joinCode])

  // 选卡组：本方记住；guest 还要经中继发给 host。
  const handlePick = useCallback((deck) => {
    setMyPick(deck)
    if (mode === 'guest') {
      myDeckRef.current = { main: deck.main, sp: deck.sp }
      clientRef.current?.send(encodeDeckFrame({ main: deck.main, sp: deck.sp }))
    }
  }, [mode])

  // 从 DeckBuilder「对战」按钮回来（选中一副）：对象→ID，当作一次 pick；null（如"用默认测试卡组"）忽略。
  const handleEditSelect = useCallback((deck) => {
    setEditingDecks(false)
    if (!deck) return
    handlePick({
      id: 'custom',
      main: (deck.mainCards || []).map((c) => c.id),
      sp: (deck.spCards || []).map((c) => c.id),
    })
  }, [handlePick])

  // guest 重连时重发卡组（status 回到 CONNECTED 且已选过）。
  useEffect(() => {
    if (mode === 'guest' && status === STATUS.CONNECTED && myDeckRef.current) {
      clientRef.current?.send(encodeDeckFrame(myDeckRef.current))
    }
  }, [status, mode])

  // host 开战：先校验双方卡组都能解析出满 DECK_SIZE（防不可解析 ID 发短牌），再进战斗。
  const handleStart = useCallback(() => {
    const pd = resolveDeck(myPick)
    const ed = resolveDeck(guestDeckRef.current)
    if (pd.mainCards.length !== DECK_SIZE || ed.mainCards.length !== DECK_SIZE) { setError('deck-invalid'); return }
    setError(null); setBattleOn(true)
  }, [myPick])

  const backToChoose = useCallback(() => {
    teardown(); setMode('choose'); setJoinCode('')
    setMyPick(null); setGuestDeckReady(false); setEditingDecks(false)
    myDeckRef.current = null; guestDeckRef.current = null
  }, [teardown])

  const connected = status === STATUS.CONNECTED
  const ready = connected && peerPresent

  // ★ 开战 → 渲染 PvP 战斗（大厅保持挂载 = 连接不断；onExit 回大厅）。在所有 hook 之后 early return。
  if (battleOn && clientRef.current) {
    return mode === 'host' ? (
      <PvpHostBattleScreen
        client={clientRef.current}
        gameFrameRef={gameFrameRef}
        playerDeck={resolveDeck(myPick)}
        enemyDeck={resolveDeck(guestDeckRef.current)}
        resumeTick={resumeTick}
        onExit={() => setBattleOn(false)}
      />
    ) : (
      <GuestBattleScreen
        client={clientRef.current}
        gameFrameRef={gameFrameRef}
        initialSyncRef={lastSyncRef}
        onExit={() => setBattleOn(false)}
      />
    )
  }

  // ★ 建/改卡组（全卡池）：不传 collection → DeckBuilder 走「无 collection ⇒ 全卡池」。连接不断（本组件仍挂载）。
  if (editingDecks) {
    return <DeckBuilder onBack={() => setEditingDecks(false)} onSelectDeck={handleEditSelect} />
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-white">
      <h1 className="text-3xl font-bold">🔗 联机对战</h1>

      {/* —— 选择：建房 / 加入 —— */}
      {mode === 'choose' && (
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button
            onClick={startHost}
            className="py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-lg"
          >
            🏠 创建房间
          </button>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="房间码"
              maxLength={4}
              className="flex-1 px-4 py-4 rounded-xl bg-gray-800 text-center text-xl tracking-widest uppercase outline-none"
            />
            <button
              onClick={startGuest}
              className="px-6 rounded-xl bg-green-600 hover:bg-green-500 font-bold"
            >
              加入
            </button>
          </div>
          {error && <p className="text-red-400 text-center">{ERROR_TEXT[error] || error}</p>}
          <button onClick={onExit} className="mt-2 text-gray-400 hover:text-white">← 返回</button>
        </div>
      )}

      {/* —— host：房间码 + 选卡组 + 开战门控 —— */}
      {mode === 'host' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <p className="text-gray-400">把房间码念给朋友：</p>
          <div className="text-5xl font-bold tracking-[0.3em] bg-gray-800 px-8 py-6 rounded-2xl">
            {roomCode || '····'}
          </div>
          <p className="text-sm">{STATUS_TEXT[status]}{peerPresent ? ' · 对手已就位' : ''}</p>
          {error && <p className="text-red-400">{ERROR_TEXT[error] || error}</p>}

          {connected && (
            <PvpDeckPicker onPick={handlePick} onEditDecks={() => setEditingDecks(true)} selectedId={myPick?.id} />
          )}

          {/* 开战门控 */}
          {connected && !myPick && <p className="text-yellow-300 text-sm">先选一套你的卡组 ↑</p>}
          {myPick && !peerPresent && <p className="text-yellow-300 text-sm">等待对手加入…</p>}
          {myPick && peerPresent && !guestDeckReady && <p className="text-yellow-300 text-sm">等对方选卡组…</p>}
          {myPick && peerPresent && guestDeckReady && (
            <button
              onClick={handleStart}
              className="py-4 px-10 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-xl"
            >
              ⚔️ 开始对战
            </button>
          )}
          <button onClick={backToChoose} className="mt-2 text-gray-400 hover:text-white">← 返回</button>
        </div>
      )}

      {/* —— guest：选卡组，选中即发给房主 —— */}
      {mode === 'guest' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <p className="text-gray-400">房间码：<span className="font-bold tracking-widest">{joinCode}</span></p>
          <p className="text-sm">{STATUS_TEXT[status]}</p>
          {error && <p className="text-red-400">{ERROR_TEXT[error] || error}</p>}

          {ready && (
            <PvpDeckPicker onPick={handlePick} onEditDecks={() => setEditingDecks(true)} selectedId={myPick?.id} />
          )}
          {ready && myPick && <p className="text-green-400 font-bold">✅ 已就位（可重选），等房主开始…</p>}
          {ready && !myPick && <p className="text-yellow-300 text-sm">选一套卡组 ↑</p>}
          <button onClick={backToChoose} className="mt-2 text-gray-400 hover:text-white">← 返回</button>
        </div>
      )}
    </div>
  )
}
