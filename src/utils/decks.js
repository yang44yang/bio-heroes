// 卡组存取 —— 从 DeckBuilder.jsx 抽出的共享层。
//
// 抽出来的原因：CampaignScreen 需要读卡组判断"有没有可用卡组"，此前它裸读
// 'bio-heroes-decks' 字面量（全项目唯一一处跨模块硬编码 key，绕过了下面的
// padding/容错，也是存档 key 清单漂移的入口之一）。改成 import DeckBuilder
// 又会让 CampaignScreen 的 chunk 白拖进整个 DeckBuilder（+4.5 kB gzip）。
// 一个纯函数模块同时解掉这两个问题。

export const DECKS_STORAGE_KEY = 'bio-heroes-decks'
export const MAX_SLOTS = 10

/** 读取全部卡组槽（永远返回长度 MAX_SLOTS 的数组，空槽为 null） */
export function loadDecks() {
  try {
    const raw = localStorage.getItem(DECKS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // 显式挡住非数组，而不是靠下面 [...parsed] 抛错再被 catch 吞掉 ——
      // 历史上 importSave 误把 decks 喂给 economy 的 migrateData，数组被 spread 成对象，
      // 这里静默返回全 null（10 副卡组消失），而 UI 还显示「存档已导入 ✓」。
      if (!Array.isArray(parsed)) return Array(MAX_SLOTS).fill(null)
      const padded = [...parsed]
      while (padded.length < MAX_SLOTS) padded.push(null)
      return padded.slice(0, MAX_SLOTS)
    }
  } catch (e) { /* 存档损坏/localStorage 不可用：退化为空卡组，不阻塞进游戏 */ }
  return Array(MAX_SLOTS).fill(null)
}

/** 写回全部卡组槽 */
export function saveDecks(decks) {
  try {
    localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks))
  } catch (e) { /* 隐私模式/配额满：写不进就算了，别炸 UI */ }
}
