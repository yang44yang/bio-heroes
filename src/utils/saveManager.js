/**
 * 存档管理器 — 版本迁移 + 导入/导出
 */

const SAVE_VERSION = 3  // 当前存档版本

// 新玩家初始卡牌（与 useEconomy 同步）
const STARTER_CARDS = [
  'ant_soldier','bee_worker','mimosa_timid','sunflower_charger','cheetah_sprinter',
  'platelet_guardian','red_blood_cell','white_blood_cell','stomach_acid','skin_barrier',
  'flu_virus','cavity_bacteria','ecoli_thug','bacteriophage_killer',
  'bandaid_helper','thermometer_alarm','stethoscope_listener','microscope_eye',
  'event_lab_observation','event_immune_response',
]

/**
 * 版本迁移函数
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
}

/**
 * 自动迁移存档到最新版本
 */
export function migrateData(data) {
  if (!data) return null

  let version = data.saveVersion || 1
  let migrated = { ...data }

  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version]
    if (migrate) {
      migrated = migrate(migrated)
      version++
    } else {
      break
    }
  }

  migrated.saveVersion = SAVE_VERSION
  return migrated
}

/**
 * 导出存档为 JSON 文件下载
 */
export function exportSave() {
  const keys = [
    'bio-heroes-economy',
    'bio-heroes-decks',
  ]

  const saveData = {
    _meta: {
      game: 'Bio Heroes 生物英雄传',
      saveVersion: SAVE_VERSION,
      exportedAt: new Date().toISOString(),
    },
  }

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) saveData[key] = JSON.parse(raw)
    } catch (e) { /* skip corrupted */ }
  }

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

        // 恢复各存储键
        const keys = ['bio-heroes-economy', 'bio-heroes-decks']
        for (const key of keys) {
          if (data[key]) {
            // 迁移旧版本数据
            const migrated = migrateData(data[key])
            localStorage.setItem(key, JSON.stringify(migrated || data[key]))
          }
        }

        resolve({
          success: true,
          message: `存档已导入（${data._meta.exportedAt?.slice(0, 10) || '未知日期'}）`,
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
 */
export function resetSave() {
  localStorage.removeItem('bio-heroes-economy')
  localStorage.removeItem('bio-heroes-decks')
}
