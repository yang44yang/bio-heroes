/**
 * 存档管理器 — 版本迁移 + 导入/导出
 */

const SAVE_VERSION = 4  // economy 数据结构版本
const BLOB_FORMAT = 2   // 导出文件格式：2 = 值为 localStorage 原始字符串；1 = 旧版（值被 JSON.parse 过）

const ECONOMY_KEY = 'bio-heroes-economy'

/**
 * 存档涵盖的全部 localStorage key —— 单一真相源，exportSave / importSave 共用。
 * `scripts/test-save-manager.mjs` 会扫描 src/ 断言这份清单不漂移。
 *
 * ⚠️ 新增任何 localStorage key 时必须登记到这里（或 NON_SAVE_KEYS），
 *    否则玩家换设备时该项会静默丢失 —— 这正是本清单从 13 漂移到 2 的历史成因。
 */
export const SAVE_KEYS = [
  ECONOMY_KEY,                          // 金币/钻石/收藏/碎片/保底   useEconomy.js
  'bio-heroes-decks',                   // 卡组                       DeckBuilder.jsx
  'bio-heroes-campaign',                // 战役进度/星数/已领奖       campaignData.js
  'bio-heroes-daily',                   // 每日挑战/连签              useDailyChallenge.js
  'bio-heroes-tutorial',                // 教学关进度                 tutorialData.js
  'bio-heroes-tutorial-reward-claimed', // 教学奖门闩 ★ 必须与 economy 同行，否则重复发奖/永久吞奖  App.jsx
  'bio-heroes-quiz-leitner',            // Leitner 复习进度（存档最大项，本项目唯一的教育资产）  quizLeitner.js
  'bio-heroes-quiz-seen',               // 已见题目（每日重置）       quizzes.js
  'bio-heroes-settings',                // 题库模式等设置             settings.js
  'bio-heroes-hints-seen',              // 战斗提示已见               BattleHints.jsx
  'bio-heroes-lang',                    // 语言（裸字符串 'zh'/'en'）  LanguageContext.jsx
  'bio-heroes-intro-seen',              // 介绍已看（裸字符串 'true'） App.jsx
]

/**
 * 明确「不进存档」的 key —— 漂移守卫据此放行，不算漏登记。
 *
 * bio-heroes-cloud（未来云存档的身份/恢复码）绝不能随存档旅行：
 * 否则 A 的存档导入 B 之后 B 就变成了 A，两台设备抢同一个账号互相覆盖。
 */
export const NON_SAVE_KEYS = [
  'bio-heroes-cloud',
]

/**
 * resetSave 清扫的 key 前缀。
 * 用前缀扫而不是列举，是因为 ConundrumModal 的 `conundrum_${id}_choice` 是模板字符串拼的动态 key，
 * key 名无上界、静态清单列不全。
 */
const SWEEP_PREFIXES = ['bio-heroes-', 'conundrum_']

// 新玩家初始卡牌（与 useEconomy 同步）
const STARTER_CARDS = [
  'ant_soldier','bee_worker','mimosa_timid','sunflower_charger','cheetah_sprinter',
  'platelet_guardian','red_blood_cell','white_blood_cell','stomach_acid','skin_barrier',
  'flu_virus','cavity_bacteria','ecoli_thug','bacteriophage_killer',
  'bandaid_helper','thermometer_alarm','stethoscope_listener','microscope_eye',
  'event_lab_observation','event_immune_response',
]

/**
 * 版本迁移函数 —— 只适用于 economy 的数据结构
 * 每次数据结构变更时添加新的迁移步骤
 */
const MIGRATIONS = {
  // v1 → v2: 添加 saveVersion 字段
  1: (data) => {
    return { ...data, saveVersion: 2 }
  },
  // v2 → v3: 初始金币3000 + 初始卡牌礼包（补发给旧空收藏玩家）
  2: (data) => {
    const d = { ...data, saveVersion: 3 }
    // 如果收藏为空（从未抽过卡的旧玩家），补发初始卡牌
    if (!d.collection || d.collection.length === 0) {
      d.collection = [...STARTER_CARDS]
      d.coins = (d.coins || 0) + 2500 // 补差额（旧默认500 + 2500 = 3000）
      d.isNewPlayer = true
    }
    return d
  },
  // v3 → v4: collection 从 string[] 改为 { cardId: count } Map
  // 老玩家每张已收藏的卡按 1 份迁移
  3: (data) => {
    const d = { ...data, saveVersion: 4 }
    if (Array.isArray(d.collection)) {
      const map = {}
      for (const id of d.collection) {
        map[id] = (map[id] || 0) + 1
      }
      d.collection = map
    } else if (!d.collection || typeof d.collection !== 'object') {
      d.collection = {}
    }
    return d
  },
}

/**
 * 自动迁移 economy 存档到最新版本
 *
 * ⚠️ 只能喂 economy 形状的对象。喂数组（如 decks）会被 `{ ...data }` spread 成对象而毁掉数据。
 */
export function migrateData(data) {
  if (!data) return null

  const version = data.saveVersion || 1

  // 版本地板：存档比本程序新 → 原样返回，绝不盖戳降级。
  // 盖戳降级会让新版客户端在「已迁移过」的数据上重跑迁移，而 MIGRATIONS[2] 是补发型的
  // （collection 为空 → 发 20 张卡 + 2500 金币），其幂等性建立在「版本号单调递增」这个前提上。
  if (version > SAVE_VERSION) return data

  let v = version
  let migrated = { ...data }

  while (v < SAVE_VERSION) {
    const migrate = MIGRATIONS[v]
    if (!migrate) break
    migrated = migrate(migrated)
    v++
  }

  // 盖实际迁移到的版本，而不是无条件盖 SAVE_VERSION —— 迁移链缺环时不能假称已迁移
  migrated.saveVersion = v
  return migrated
}

/**
 * 采集当前 localStorage 里的整份存档（exportSave 的数据部分）
 *
 * 与「下载文件」拆开，是为了让 test-save-manager.mjs 能在 node 里测真正的
 * collectSaveData → applySaveData round-trip，不必拉起 Blob/document。
 *
 * 值一律存 localStorage 的**原始字符串**，不做 JSON.parse：localStorage 本质是 string→string，
 * 而 lang='zh' / intro-seen='true' 这类裸值 JSON.parse 会抛错或改变类型。
 * （旧版对每个值都 parse，遇到 'zh' 直接抛错并被 catch 吞掉 → 该 key 静默丢失。）
 */
export function collectSaveData() {
  const saveData = {
    _meta: {
      game: 'Bio Heroes 生物英雄传',
      saveVersion: SAVE_VERSION,
      format: BLOB_FORMAT,
      exportedAt: new Date().toISOString(),
    },
  }

  for (const key of SAVE_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw !== null) saveData[key] = raw
  }

  return saveData
}

/** 导出存档为 JSON 文件下载 */
export function exportSave() {
  const saveData = collectSaveData()

  const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bio-heroes-save-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 把一个存档文件的键值对写回 localStorage（exportSave 的逆运算）
 * 抽出来是为了让 test-save-manager.mjs 能在 node 里直接测 round-trip，不必拉起 FileReader。
 * @returns 恢复的项数
 */
export function applySaveData(data) {
  const isLegacy = (data._meta?.format || 1) < 2
  let restored = 0

  for (const key of SAVE_KEYS) {
    const v = data[key]
    if (v === undefined || v === null) continue

    let raw
    if (isLegacy) {
      // 旧格式：值是被 JSON.parse 过的对象/数组，写回前要 stringify
      raw = JSON.stringify(key === ECONOMY_KEY ? (migrateData(v) || v) : v)
    } else {
      // 新格式：值就是原始字符串，原样写回
      raw = v
      if (key === ECONOMY_KEY) {
        try {
          const parsed = JSON.parse(v)
          raw = JSON.stringify(migrateData(parsed) || parsed)
        } catch (_) { /* economy 解析失败：原样写回，宁可不迁移也不丢 */ }
      }
    }

    // ★ 迁移只对 economy 生效。旧版对 decks 也跑 migrateData，把长度 10 的数组
    //   spread 成对象 → DeckBuilder.loadDecks 的 [...parsed] 抛 TypeError 被自己的
    //   catch 吞掉 → 返回 Array(10).fill(null) → 10 副卡组静默清空，UI 还显示导入成功。
    localStorage.setItem(key, raw)
    restored++
  }

  return restored
}

/**
 * 从 JSON 文件导入存档
 * @returns Promise<{ success, message }>
 */
export function importSave(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)

        // 验证是否为有效存档
        if (!data._meta || data._meta.game !== 'Bio Heroes 生物英雄传') {
          resolve({ success: false, message: '无效的存档文件' })
          return
        }

        // 版本地板：拒绝导入比本程序新的存档，而不是把它降级
        const fileVersion = data._meta.saveVersion || 1
        if (fileVersion > SAVE_VERSION) {
          resolve({
            success: false,
            message: `存档来自更新版本的游戏（v${fileVersion}），当前版本只支持到 v${SAVE_VERSION}。请先更新游戏再导入。`,
          })
          return
        }

        const restored = applySaveData(data)

        resolve({
          success: true,
          message: `存档已导入（${data._meta.exportedAt?.slice(0, 10) || '未知日期'}，共 ${restored} 项）`,
        })
      } catch (err) {
        resolve({ success: false, message: '存档文件解析失败' })
      }
    }
    reader.onerror = () => resolve({ success: false, message: '文件读取失败' })
    reader.readAsText(file)
  })
}

/**
 * 重置所有存档
 *
 * 按前缀清扫，而不是列举 key。旧版只删 economy + decks，留下 campaign/tutorial 等 11 项，
 * 导致重置后的玩家比新玩家更惨：金币回到 3000、收藏清空，但 campaign.claimedRewards
 * 全为 true → 首通奖永久再也领不到；tutorial-reward-claimed 仍在 → 教学奖也领不到。
 */
export function resetSave() {
  const toRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && SWEEP_PREFIXES.some((p) => k.startsWith(p))) toRemove.push(k)
  }
  for (const k of toRemove) localStorage.removeItem(k)
}
