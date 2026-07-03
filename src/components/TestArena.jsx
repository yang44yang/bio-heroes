import React, { useState, useMemo } from 'react'
import cards from '../data/cards'

// 🧪 测试场 —— 直接把卡摆到双方战场任意格，一键开打，定点验证卡牌机制（家长门后进入）。
// 引擎支持见 useBattle.startBattle 的 testPlayerField / testEnemyField / playerStartEnergy。

const FACTIONS = [
  { id: 'all', icon: '🎴', name: '全部' },
  { id: 'nature', icon: '🌱', name: '自然' },
  { id: 'body', icon: '🧬', name: '人体' },
  { id: 'pathogen', icon: '🦠', name: '病原' },
  { id: 'tech', icon: '⚗️', name: '科技' },
]
const FACTION_ICON = { nature: '🌱', body: '🧬', pathogen: '🦠', tech: '⚗️' }
const characterCards = cards.filter((c) => c.type === 'character')
const EMPTY = [null, null, null, null, null]

export default function TestArena({ onBack, onStart }) {
  const [brush, setBrush] = useState(null) // 当前"画笔"卡
  const [playerField, setPlayerField] = useState(EMPTY)
  const [enemyField, setEnemyField] = useState(EMPTY)
  const [fullEnergy, setFullEnergy] = useState(true)
  const [faction, setFaction] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      characterCards.filter(
        (c) =>
          (faction === 'all' || c.faction === faction) &&
          (!search ||
            c.name.includes(search) ||
            (c.nameEn || '').toLowerCase().includes(search.toLowerCase())),
      ),
    [faction, search],
  )

  const placeAt = (side, i) => {
    const setter = side === 'player' ? setPlayerField : setEnemyField
    setter((prev) => {
      const next = [...prev]
      next[i] = next[i] ? null : brush ? { ...brush } : null // 有卡→清空；空+有画笔→放置
      return next
    })
  }

  const hasAny = playerField.some(Boolean) || enemyField.some(Boolean)

  const handleStart = () => {
    if (!hasAny) return
    onStart({
      playerField: playerField.map((c) => (c ? { ...c } : null)),
      enemyField: enemyField.map((c) => (c ? { ...c } : null)),
      startEnergy: fullEnergy ? 10 : 1,
    })
  }

  const Slot = ({ card, side, i }) => (
    <button
      onClick={() => placeAt(side, i)}
      className={`relative flex flex-col items-center justify-center rounded-lg border-2 w-16 h-20 sm:w-20 sm:h-24 shrink-0 text-center transition
        ${card ? 'border-yellow-400 bg-slate-700' : brush ? 'border-dashed border-emerald-400/60 bg-slate-800 hover:bg-slate-700' : 'border-slate-600 bg-slate-800'}`}
      title={card ? `${card.name}（点击移除）` : brush ? '点击放置' : '先在下面选一张卡'}
    >
      {card ? (
        <>
          <span className="text-lg leading-none">{FACTION_ICON[card.faction] || '🎴'}</span>
          <span className="text-[9px] sm:text-[10px] leading-tight px-0.5 line-clamp-2">{card.name}</span>
          <span className="text-[9px] text-orange-300">⚔{card.atk}</span>
          <span className="text-[9px] text-green-300">❤{card.hp}</span>
        </>
      ) : (
        <span className="text-slate-500 text-xs">空</span>
      )}
    </button>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-3 sm:p-4">
      {/* 顶栏 */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm">← 返回</button>
        <h2 className="text-base sm:text-lg font-bold">🧪 测试场</h2>
        <button
          onClick={handleStart}
          disabled={!hasAny}
          className={`px-4 py-1.5 rounded text-sm font-bold ${hasAny ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
        >
          ⚔️ 开打
        </button>
      </div>

      <p className="text-[11px] text-slate-400 mb-2">
        选下面一张卡当"画笔" → 点战场格子摆放（再点已放的格子=移除）。摆好双方阵容就开打，摆下的卡无召唤疲劳、可立刻攻击。
      </p>

      {/* 敌方战场 */}
      <div className="mb-2">
        <div className="text-xs text-red-400 mb-1">👹 敌方战场</div>
        <div className="flex gap-1.5 sm:gap-2 justify-center">
          {enemyField.map((c, i) => <Slot key={i} card={c} side="enemy" i={i} />)}
        </div>
      </div>
      {/* 我方战场 */}
      <div className="mb-3">
        <div className="text-xs text-blue-400 mb-1">🦸 我方战场</div>
        <div className="flex gap-1.5 sm:gap-2 justify-center">
          {playerField.map((c, i) => <Slot key={i} card={c} side="player" i={i} />)}
        </div>
      </div>

      {/* 选项 + 画笔 */}
      <div className="flex items-center flex-wrap gap-2 mb-3 text-xs">
        <label className="flex items-center gap-1 cursor-pointer bg-slate-800 px-2 py-1 rounded">
          <input type="checkbox" checked={fullEnergy} onChange={(e) => setFullEnergy(e.target.checked)} />
          满能量开局（10）
        </label>
        <button onClick={() => { setPlayerField(EMPTY); setEnemyField(EMPTY) }} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">🗑️ 清空战场</button>
        <span className="ml-auto text-slate-400">
          画笔：{brush ? <span className="text-emerald-300 font-bold">{FACTION_ICON[brush.faction]} {brush.name}</span> : <span className="text-slate-500">未选</span>}
        </span>
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {FACTIONS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFaction(f.id)}
            className={`px-2 py-1 rounded text-xs ${faction === f.id ? 'bg-yellow-500 text-slate-900 font-bold' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            {f.icon} {f.name}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 搜卡名…"
          className="ml-auto px-2 py-1 rounded bg-slate-800 text-xs w-28 sm:w-40 border border-slate-700 focus:outline-none focus:border-yellow-500"
        />
      </div>

      {/* 卡池网格 */}
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-1.5 max-h-[42vh] overflow-y-auto pb-4">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => setBrush(c)}
            className={`flex flex-col items-start rounded border p-1.5 text-left transition
              ${brush?.id === c.id ? 'border-emerald-400 bg-slate-700' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'}`}
          >
            <div className="flex items-center gap-1 w-full">
              <span>{FACTION_ICON[c.faction] || '🎴'}</span>
              <span className="text-[11px] font-bold truncate flex-1">{c.name}</span>
              <span className="text-[9px] text-sky-300 shrink-0">{c.cost}💧</span>
            </div>
            <div className="text-[10px] text-slate-400">
              <span className="text-orange-300">⚔{c.atk}</span> <span className="text-green-300">❤{c.hp}</span> · {c.rarity}
            </div>
            {c.skills?.[0]?.description && (
              <div className="text-[9px] text-slate-500 line-clamp-2 mt-0.5">{c.skills[0].description}</div>
            )}
          </button>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-slate-500 text-sm py-6">没有匹配的卡</div>}
      </div>
    </div>
  )
}
