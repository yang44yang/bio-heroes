// PvpDeckPicker.jsx —— PvP 选卡（预设主题队 + 我的存档卡组 + 编辑入口）。
//
// 亲子友好：大按钮、点一下就选。不复用 DeckBuilder 概览（那是编辑器主页，重命名框/空槽/筛选条
// 对小孩是干扰，且它返回对象、我们要 ID）。选中回 { id, main, sp }（ID 数组，解析推迟到开战边界）。
// 内联中文（同 PvpLobby 的不 i18n 约定）。
import { PRESET_DECKS } from '../data/presetDecks'
import { loadDecks } from '../utils/decks'
import { DECK_SIZE } from '../data/deckRules'

export default function PvpDeckPicker({ onPick, onEditDecks, selectedId }) {
  // 存档卡组：只列满 DECK_SIZE 的槽（同 DeckBuilder 的对战门）。每次渲染直读 → 从编辑器回来即刷新。
  const saved = loadDecks()
    .map((slot, i) => ({ slot, i }))
    .filter(({ slot }) => slot && Array.isArray(slot.main) && slot.main.length === DECK_SIZE)

  return (
    <div className="flex flex-col gap-3 w-full max-w-sm">
      <p className="text-gray-300 text-sm text-center">选一套卡组出战</p>

      {/* 预设主题队 —— 四阵营色大按钮 */}
      <div className="grid grid-cols-2 gap-2">
        {PRESET_DECKS.map((d) => {
          const active = selectedId === d.id
          return (
            <button
              key={d.id}
              onClick={() => onPick({ id: d.id, main: d.main, sp: d.sp })}
              className={`py-3 px-2 rounded-xl font-bold text-white text-sm border-2 transition hover:brightness-125 ${active ? 'ring-2 ring-white' : ''}`}
              style={{ background: `${d.color}33`, borderColor: d.color }}
            >
              <div className="text-2xl leading-tight">{d.icon}</div>
              {d.name}队
            </button>
          )
        })}
      </div>

      {/* 我的卡组（存过满 25 张的才列） */}
      {saved.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-gray-400 text-xs">我的卡组</p>
          {saved.map(({ slot, i }) => {
            const id = `slot_${i}`
            const active = selectedId === id
            return (
              <button
                key={id}
                onClick={() => onPick({ id, main: slot.main, sp: slot.sp })}
                className={`py-2.5 px-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-left text-sm ${active ? 'ring-2 ring-white' : ''}`}
              >
                🃏 {slot.name || `卡组 ${i + 1}`}
              </button>
            )
          })}
        </div>
      )}

      <button onClick={onEditDecks} className="py-2 text-gray-400 hover:text-white text-sm">
        ✏️ 编辑 / 新建卡组（全卡池）
      </button>
    </div>
  )
}
