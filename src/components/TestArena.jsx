import React, { useState, useMemo } from 'react'
import cards from '../data/cards'

// 🧪 测试场 —— 直接把卡摆到双方战场任意格 + 给卡挂状态（护盾/标记/中毒…），一键开打定点验证机制（家长门后进入）。
// 引擎支持见 useBattle.startBattle 的 testPlayerField / testEnemyField / playerStartEnergy（statuses 会补回、守护走 skills）。

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

// 可挂状态：护盾(测无视护盾) / 标记(测抗原锁定) / 中毒 / 沉睡 / 隐身。守护单独走 skills。
const STATUS_DEFS = [
  { key: 'shield', badge: '🛡️', label: '护盾', make: () => ({ type: 'shield', amount: 3000 }) },
  { key: 'marked', badge: '🎯', label: '标记', make: () => ({ type: 'marked', bonus_from: 'all', bonus_damage: 0.5 }) },
  { key: 'poison', badge: '☠️', label: '中毒', make: () => ({ type: 'poison', damage: 500, turnsLeft: 3 }) },
  { key: 'sleep', badge: '😴', label: '沉睡', make: () => ({ type: 'sleep', turnsLeft: 2 }) },
  { key: 'stealth', badge: '👻', label: '隐身', make: () => ({ type: 'stealth', turnsLeft: 2 }) },
]
const GUARD_SKILL = { nameEn: 'Guard', name: '守护', description: '守护' }
const hasStatus = (c, key) => (c?.statuses || []).some((s) => s.type === key)
const hasGuard = (c) => (c?.skills || []).some((s) => s.nameEn === 'Guard')

export default function TestArena({ onBack, onStart }) {
  const [brush, setBrush] = useState(null)
  const [playerField, setPlayerField] = useState(EMPTY)
  const [enemyField, setEnemyField] = useState(EMPTY)
  const [fullEnergy, setFullEnergy] = useState(true)
  const [faction, setFaction] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null) // { side, i } 当前编辑状态的格子

  const filtered = useMemo(
    () =>
      characterCards.filter(
        (c) =>
          (faction === 'all' || c.faction === faction) &&
          (!search || c.name.includes(search) || (c.nameEn || '').toLowerCase().includes(search.toLowerCase())),
      ),
    [faction, search],
  )

  const fieldOf = (side) => (side === 'player' ? playerField : enemyField)
  const setFieldOf = (side) => (side === 'player' ? setPlayerField : setEnemyField)
  const updateCard = (side, i, fn) =>
    setFieldOf(side)((prev) => prev.map((c, idx) => (idx === i && c ? fn({ ...c }) : c)))

  const clickSlot = (side, i) => {
    const card = fieldOf(side)[i]
    if (card) {
      setEditing({ side, i }) // 已放的卡 → 打开状态编辑
    } else if (brush) {
      setFieldOf(side)((prev) => prev.map((c, idx) => (idx === i ? { ...brush, statuses: [], skills: brush.skills ? [...brush.skills] : [] } : c)))
    }
  }

  const toggleStatus = (side, i, def) =>
    updateCard(side, i, (c) => {
      const on = hasStatus(c, def.key)
      c.statuses = on ? (c.statuses || []).filter((s) => s.type !== def.key) : [...(c.statuses || []), def.make()]
      return c
    })
  const toggleGuard = (side, i) =>
    updateCard(side, i, (c) => {
      c.skills = hasGuard(c) ? (c.skills || []).filter((s) => s.nameEn !== 'Guard') : [...(c.skills || []), GUARD_SKILL]
      return c
    })
  const clearSlot = (side, i) => {
    setFieldOf(side)((prev) => prev.map((c, idx) => (idx === i ? null : c)))
    setEditing(null)
  }

  const hasAny = playerField.some(Boolean) || enemyField.some(Boolean)
  const handleStart = () => {
    if (!hasAny) return
    const dump = (f) => f.map((c) => (c ? { ...c, statuses: (c.statuses || []).map((s) => ({ ...s })), skills: (c.skills || []).map((s) => ({ ...s })) } : null))
    onStart({ playerField: dump(playerField), enemyField: dump(enemyField), startEnergy: fullEnergy ? 10 : 1 })
  }

  const editCard = editing ? fieldOf(editing.side)[editing.i] : null

  const Slot = ({ card, side, i }) => (
    <button
      onClick={() => clickSlot(side, i)}
      className={`relative flex flex-col items-center justify-center rounded-lg border-2 w-16 h-20 sm:w-20 sm:h-24 shrink-0 text-center transition
        ${editing?.side === side && editing?.i === i ? 'border-cyan-400 ring-2 ring-cyan-400/40' : card ? 'border-yellow-400' : brush ? 'border-dashed border-emerald-400/60 hover:bg-slate-700' : 'border-slate-600'}
        ${card ? 'bg-slate-700' : 'bg-slate-800'}`}
      title={card ? `${card.name}（点击挂状态/移除）` : brush ? '点击放置' : '先在下面选一张卡'}
    >
      {card ? (
        <>
          {/* 状态徽章 */}
          <div className="absolute -top-1.5 left-0 right-0 flex justify-center gap-0.5 text-[10px]">
            {hasGuard(card) && <span title="守护">🛡</span>}
            {STATUS_DEFS.filter((d) => hasStatus(card, d.key)).map((d) => <span key={d.key} title={d.label}>{d.badge}</span>)}
          </div>
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
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-sm">← 返回</button>
        <h2 className="text-base sm:text-lg font-bold">🧪 测试场</h2>
        <button onClick={handleStart} disabled={!hasAny}
          className={`px-4 py-1.5 rounded text-sm font-bold ${hasAny ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>⚔️ 开打</button>
      </div>

      <p className="text-[11px] text-slate-400 mb-2">
        选下面一张卡当"画笔" → 点战场格子摆放；点<b className="text-yellow-300">已放的卡</b>可给它挂状态（护盾/标记/中毒/守护…）或移除。摆下的卡无召唤疲劳、可立刻攻击。
      </p>

      <div className="mb-2">
        <div className="text-xs text-red-400 mb-1.5">👹 敌方战场</div>
        <div className="flex gap-1.5 sm:gap-2 justify-center">{enemyField.map((c, i) => <Slot key={i} card={c} side="enemy" i={i} />)}</div>
      </div>
      <div className="mb-2">
        <div className="text-xs text-blue-400 mb-1.5">🦸 我方战场</div>
        <div className="flex gap-1.5 sm:gap-2 justify-center">{playerField.map((c, i) => <Slot key={i} card={c} side="player" i={i} />)}</div>
      </div>

      {/* 状态编辑面板 */}
      {editCard && (
        <div className="mb-3 p-2 rounded-lg bg-slate-800 border border-cyan-700">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-cyan-300">编辑 {FACTION_ICON[editCard.faction]} {editCard.name}</span>
            <button onClick={() => setEditing(null)} className="text-slate-400 text-xs px-2">关闭 ✕</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_DEFS.map((d) => (
              <button key={d.key} onClick={() => toggleStatus(editing.side, editing.i, d)}
                className={`px-2 py-1 rounded text-xs ${hasStatus(editCard, d.key) ? 'bg-cyan-600 font-bold' : 'bg-slate-700 hover:bg-slate-600'}`}>{d.badge} {d.label}</button>
            ))}
            <button onClick={() => toggleGuard(editing.side, editing.i)}
              className={`px-2 py-1 rounded text-xs ${hasGuard(editCard) ? 'bg-cyan-600 font-bold' : 'bg-slate-700 hover:bg-slate-600'}`}>🛡 守护</button>
            <button onClick={() => clearSlot(editing.side, editing.i)} className="ml-auto px-2 py-1 rounded text-xs bg-red-800 hover:bg-red-700">🗑️ 移除卡</button>
          </div>
        </div>
      )}

      <div className="flex items-center flex-wrap gap-2 mb-3 text-xs">
        <label className="flex items-center gap-1 cursor-pointer bg-slate-800 px-2 py-1 rounded">
          <input type="checkbox" checked={fullEnergy} onChange={(e) => setFullEnergy(e.target.checked)} />满能量开局（10）
        </label>
        <button onClick={() => { setPlayerField(EMPTY); setEnemyField(EMPTY); setEditing(null) }} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700">🗑️ 清空战场</button>
        <span className="ml-auto text-slate-400">画笔：{brush ? <span className="text-emerald-300 font-bold">{FACTION_ICON[brush.faction]} {brush.name}</span> : <span className="text-slate-500">未选</span>}</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {FACTIONS.map((f) => (
          <button key={f.id} onClick={() => setFaction(f.id)}
            className={`px-2 py-1 rounded text-xs ${faction === f.id ? 'bg-yellow-500 text-slate-900 font-bold' : 'bg-slate-800 hover:bg-slate-700'}`}>{f.icon} {f.name}</button>
        ))}
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 搜卡名…"
          className="ml-auto px-2 py-1 rounded bg-slate-800 text-xs w-28 sm:w-40 border border-slate-700 focus:outline-none focus:border-yellow-500" />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-1.5 max-h-[38vh] overflow-y-auto pb-4">
        {filtered.map((c) => (
          <button key={c.id} onClick={() => setBrush(c)}
            className={`flex flex-col items-start rounded border p-1.5 text-left transition ${brush?.id === c.id ? 'border-emerald-400 bg-slate-700' : 'border-slate-700 bg-slate-800 hover:bg-slate-700'}`}>
            <div className="flex items-center gap-1 w-full">
              <span>{FACTION_ICON[c.faction] || '🎴'}</span>
              <span className="text-[11px] font-bold truncate flex-1">{c.name}</span>
              <span className="text-[9px] text-sky-300 shrink-0">{c.cost}💧</span>
            </div>
            <div className="text-[10px] text-slate-400"><span className="text-orange-300">⚔{c.atk}</span> <span className="text-green-300">❤{c.hp}</span> · {c.rarity}</div>
            {c.skills?.[0]?.description && <div className="text-[9px] text-slate-500 line-clamp-2 mt-0.5">{c.skills[0].description}</div>}
          </button>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-slate-500 text-sm py-6">没有匹配的卡</div>}
      </div>
    </div>
  )
}
