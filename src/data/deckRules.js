// 卡组构建 & 对战规则常量

// === 卡组 ===
export const DECK_SIZE = 25          // 主卡组（生物卡+事件卡混编）
export const SP_DECK_SIZE = 5        // SP 觉醒卡数量
export const MAX_SAME_CARD = 3       // 同名卡上限（主卡组内）
export const MAX_SAME_SP = 3         // 同名 SP 卡上限

// === 手牌 ===
export const STARTING_HAND = 5       // 起手抽牌数
export const MAX_HAND = 7            // 手牌上限
export const DRAW_PER_TURN = 1       // 每回合抽牌数

// === 能量 ===
export const ENERGY_CAP = 10         // 能量上限

// === 战场 ===
export const MAX_FIELD_SLOTS = 5     // 每方战场位数量

// === 主人 ===
export const LEADER_HP = 30000       // 主人初始 HP

// === 问答觉醒 ===
export const QUIZ_CHANCE = 0.25      // 触发概率 25%
export const AWAKEN_FULL = 2.0       // 答对：ATK 倍率
export const AWAKEN_PARTIAL = 1.3    // 答错但接近：ATK 倍率

// === SP 觉醒触发条件 ===
export const SP_QUIZ_STREAK = 2      // 连续答对 N 题触发
export const SP_LEADER_HP_RATIO = 0.5 // 主人 HP 降至此比例触发
export const SP_TURN_TRIGGER = 8     // 第 N 回合触发

// === 环境事件 ===
export const EVENT_INTERVAL = 3      // 每 N 回合触发环境事件

// === 费用-属性对应表（Power Curve，用于平衡校验）===
export const POWER_CURVE = {
  0: 2000,
  1: 4000,
  2: 6000,
  3: 8000,
  4: 12000,
  5: 12000,
  6: 14000,
  7: 16000,
  8: 18000,
  9: 20000,
  10: 22000,
}

// === 阵营 ===
export const FACTIONS = {
  nature:   { name: '自然系', nameEn: 'Nature',   icon: '🌱', color: '#4ADE80' },
  body:     { name: '人体系', nameEn: 'Body',     icon: '🧬', color: '#60A5FA' },
  pathogen: { name: '病原系', nameEn: 'Pathogen', icon: '🦠', color: '#F87171' },
  tech:     { name: '科技系', nameEn: 'Tech',     icon: '⚗️', color: '#A78BFA' },
}

// === 阵营克制关系 ===
// A 攻击 B 时：若 FACTION_ADVANTAGE[A].strong === B 的阵营 → 伤害 ×(1 + BONUS)
export const FACTION_ADVANTAGE = {
  body:     { strong: 'pathogen', weak: 'pathogen' },  // 人体系 ↔ 病原系 互克
  pathogen: { strong: 'body',     weak: 'body'     },  // 病原系 ↔ 人体系 互克
  tech:     { strong: 'pathogen', weak: null        },  // 科技系 克制 病原系
  nature:   { strong: null,       weak: null        },  // 自然系 中立
}
export const FACTION_ADVANTAGE_BONUS = 0.20  // 克制伤害加成 20%

// === 稀有度 ===
export const RARITIES = {
  R:   { name: 'R',   color: '#8B9DAF', pullRate: 0.70 },
  SR:  { name: 'SR',  color: '#C084FC', pullRate: 0.25 },
  SSR: { name: 'SSR', color: '#FACC15', pullRate: 0.05 },
}

// === 牌库耗尽 — 疲劳伤害 ===
// 牌库抽完后每次抽牌失败，对主人造成累计伤害（1000, 2000, 3000...）
export const FATIGUE_BASE_DAMAGE = 1000

// === 抽卡/扭蛋系统（Gacha）===
export const GACHA = {
  SSR_PITY: 50,             // 连续 N 抽未出 SSR 后保底
  SR_PITY: 10,              // 连续 N 抽未出 SR 后保底
  SINGLE_COST: 100,         // 单抽消耗
  MULTI_COST: 900,          // 十连消耗
  MULTI_GUARANTEE_SR: true, // 十连保底至少 1 张 SR
}

// === 通用技能 ID 映射 ===
export const GENERIC_SKILLS = {
  guard:            { name: '守护', nameEn: 'Guard',            description: '在场时对手只能攻击该卡' },
  swift_attack:     { name: '迅击', nameEn: 'Swift Attack',     description: '出场当回合可攻击（无召唤疲劳）' },
  piercing_strike:  { name: '穿透', nameEn: 'Piercing Strike',  description: '打守护卡时溢出伤害穿透到主人' },
  overpower:        { name: '压制', nameEn: 'Overpower',        description: '击杀对方卡后溢出伤害转给主人' },
  rush:             { name: '突进', nameEn: 'Rush',             description: '直攻主人时伤害翻倍' },
  natural_recovery: { name: '自愈', nameEn: 'Natural Recovery', description: '每回合自动回复 HP' },
}

// 自愈每回合回复量（占最大 HP 百分比）
export const NATURAL_RECOVERY_RATE = 0.10
