// PvpLobby.jsx —— PvP 房间码大厅（PvP 第 4a 步）。
//
// 建房 / 加入 / 连接状态。它只负责**建立连接**（经 relayClient 到中继），拿到「对手已就位」。
// ⚠️ **真正的对战接入（把连接交给 battle 适配器）是第 4c/4d 步** —— 本步到「已连接」为止。
//
// i18n：本步先用内联中文（项目中文为主）；i18n 键留到打磨阶段（避免在此改 zh/en.json）。

import { useState, useRef, useEffect, useCallback } from 'react'
import { createRelayClient, STATUS } from '../net/relayClient'
import PvpHostBattleScreen from './PvpHostBattleScreen'

// 中继 WS 端点：同源 /api/relay（dev/preview 经 vite 的 ^/api/ 代理 ws:true 到 127.0.0.1:3002；
// 生产经 Caddy 反代）。
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
}

export default function PvpLobby({ onExit }) {
  const [mode, setMode] = useState('choose')   // choose | host | guest
  const [status, setStatus] = useState(STATUS.CLOSED)
  const [roomCode, setRoomCode] = useState('')
  const [peerPresent, setPeerPresent] = useState(false)
  const [error, setError] = useState(null)
  const [joinCode, setJoinCode] = useState('')
  const [battleOn, setBattleOn] = useState(false)   // 4c：host 点「开始对战」后进战斗
  const clientRef = useRef(null)
  // ★ 4c：游戏帧转发 ref —— client 建在大厅、处理器装在战斗侧（usePvpHost），
  //   用一个稳定的 ref 中转（onGame 在 createRelayClient 时就得给定）。
  const gameFrameRef = useRef(null)

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
        else if (f.t === 'relay.peer-joined') setPeerPresent(true)
        else if (f.t === 'relay.peer-left') setPeerPresent(false)
        else if (f.t === 'relay.error') setError(f.reason)
      },
      onGame: (f) => gameFrameRef.current?.(f),   // 4c：转给 usePvpHost 装的处理器
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
        else if (f.t === 'relay.peer-left') setPeerPresent(false)
        else if (f.t === 'relay.error') setError(f.reason)
      },
      onGame: () => {},
    })
  }, [joinCode])

  const backToChoose = useCallback(() => { teardown(); setMode('choose'); setJoinCode('') }, [teardown])

  const connected = status === STATUS.CONNECTED
  const ready = connected && peerPresent

  // ★ 4c：host 开战 → 渲染 PvP 战斗（大厅保持挂载 = 连接不断；onExit 回大厅）。
  //   在所有 hook 之后 early return，不违反 hook 规则。
  if (battleOn && clientRef.current) {
    return (
      <PvpHostBattleScreen
        client={clientRef.current}
        gameFrameRef={gameFrameRef}
        onExit={() => setBattleOn(false)}
      />
    )
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

      {/* —— host：显示房间码，等待对手 —— */}
      {mode === 'host' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <p className="text-gray-400">把房间码念给朋友：</p>
          <div className="text-5xl font-bold tracking-[0.3em] bg-gray-800 px-8 py-6 rounded-2xl">
            {roomCode || '····'}
          </div>
          <p className="text-sm">{STATUS_TEXT[status]}</p>
          {error && <p className="text-red-400">{ERROR_TEXT[error] || error}</p>}
          {ready ? (
            <>
              <p className="text-green-400 font-bold text-lg">✅ 对手已就位！</p>
              <button
                onClick={() => setBattleOn(true)}
                className="py-4 px-10 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-xl"
              >
                ⚔️ 开始对战
              </button>
            </>
          ) : connected && <p className="text-yellow-300">等待对手加入…</p>}
          <button onClick={backToChoose} className="mt-2 text-gray-400 hover:text-white">← 返回</button>
        </div>
      )}

      {/* —— guest：连接中 / 已加入 —— */}
      {mode === 'guest' && (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm">
          <p className="text-gray-400">房间码：<span className="font-bold tracking-widest">{joinCode}</span></p>
          <p className="text-sm">{STATUS_TEXT[status]}</p>
          {error && <p className="text-red-400">{ERROR_TEXT[error] || error}</p>}
          {ready && <p className="text-green-400 font-bold text-lg">✅ 已加入！（对战接入在下一步）</p>}
          <button onClick={backToChoose} className="mt-2 text-gray-400 hover:text-white">← 返回</button>
        </div>
      )}
    </div>
  )
}
