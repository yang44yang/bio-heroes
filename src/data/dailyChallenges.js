// 每日挑战 Daily Challenge — 确定性日期轮换 + 约束(=Conundrum effect) + streak/奖励纯逻辑
// 本文件全是纯函数(无 React / 无副作用) → 可被 scripts/test-daily.mjs 单测。
// 约束只用 BattleScreen 已消费的 Conundrum effect 契约字段，零战斗引擎改动：
//   playerLeaderHpBonus / enemyLeaderHpBonus / preplaceEnemyCards / playerStartingHandBonus{filter,count} / globalEffect
// 硬阵营锁(lockedFaction)需改 DeckBuilder，DECK_SIZE=25 早期不可行 → 留作 v2，本版不做。

// ===== 日期工具(可测：传入 Date / 'YYYY-MM-DD') =====
export function localDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
// 距 1970-01-01 的本地天数(同一天任何时刻/任何设备一致)
export function dayNumber(dateStr) {
  return Math.floor(Date.parse(dateStr + 'T00:00:00') / 86400000)
}
export function dayOfWeek(dateStr) {
  return new Date(dateStr + 'T00:00:00').getDay() // 0=周日
}
export function prevDateStr(dateStr) {
  return localDateStr(new Date(Date.parse(dateStr + 'T00:00:00') - 86400000))
}
// 安全取模(负数也回正)
function pick(arr, n) {
  const i = ((n % arr.length) + arr.length) % arr.length
  return arr[i]
}

// ===== 科学主题(驱动彩蛋选题 + 碎片奖励卡 + 教育点) =====
export const THEMES = [
  { id: 'immune', emoji: '🛡️', name: '免疫防线', nameEn: 'Immune Defense', cardId: 'white_blood_cell', faction: 'body',
    point: '你的身体有三道防线在保护你：皮肤、白细胞、抗体！', pointEn: 'Your body has 3 lines of defense: skin, white blood cells, antibodies!' },
  { id: 'pathogen', emoji: '🦠', name: '病原入侵', nameEn: 'Pathogen Invasion', cardId: 'flu_virus', faction: 'pathogen',
    point: '病毒和细菌不一样——抗生素只对细菌有用，治不了感冒。', pointEn: "Viruses and bacteria differ — antibiotics only work on bacteria, not colds." },
  { id: 'nature', emoji: '🌱', name: '自然法则', nameEn: 'Law of Nature', cardId: 'cheetah_sprinter', faction: 'nature',
    point: '食物链顶端的猎手控制猎物数量，维持整个生态平衡。', pointEn: 'Apex predators control prey numbers and keep ecosystems balanced.' },
  { id: 'tech', emoji: '⚗️', name: '科学武器', nameEn: 'Science Weapons', cardId: 'mrna_vaccine', faction: 'tech',
    point: '疫苗让身体提前认识病原，是人类最强的科学武器之一。', pointEn: 'Vaccines let the body learn a pathogen in advance — one of our greatest tools.' },
  { id: 'micro', emoji: '🔬', name: '微观世界', nameEn: 'Microscopic World', cardId: 'amoeba_shapeshifter', faction: 'pathogen',
    point: '显微镜让我们看见肉眼看不到的微生物世界。', pointEn: 'Microscopes reveal a microbial world invisible to the naked eye.' },
  { id: 'coevolve', emoji: '🔄', name: '协同演化', nameEn: 'Coevolution', cardId: 'bacteriophage_killer', faction: 'pathogen',
    point: '猎手与猎物、病原与免疫，在亿万年里互相追赶着进化。', pointEn: 'Predator vs prey, pathogen vs immunity — chasing each other for eons.' },
  // —— v2 扩池：补 body/nature/tech，平衡四阵营（卡 ID 均已验真，test-daily 会咬）——
  { id: 'blood', emoji: '🩸', name: '血液循环', nameEn: 'Blood Circulation', cardId: 'red_blood_cell', faction: 'body',
    point: '红细胞像不知疲倦的快递员，一刻不停把氧气送到全身每个角落。', pointEn: 'Red blood cells are tireless couriers, delivering oxygen to every corner of your body.' },
  { id: 'ocean', emoji: '🐋', name: '海洋巨兽', nameEn: 'Ocean Giants', cardId: 'humpback_whale', faction: 'nature',
    point: '座头鲸用一圈圈气泡织成"泡泡网"，把小鱼赶成一团再一口吞下。', pointEn: 'Humpback whales blow spiral bubble-nets to herd fish into a ball, then swallow them whole.' },
  { id: 'genetech', emoji: '🧬', name: '基因科技', nameEn: 'Gene Tech', cardId: 'crispr_editor', faction: 'tech',
    point: 'CRISPR 像一把精准的基因剪刀，能剪掉致病的坏基因——现代医学的超能力。', pointEn: 'CRISPR is a precise gene-scissor that snips out disease-causing genes — a modern medical superpower.' },
  { id: 'survival', emoji: '🐻', name: '极限生存', nameEn: 'Extreme Survival', cardId: 'tardigrade', faction: 'nature',
    point: '水熊虫能在滚烫、冰冻、真空甚至太空辐射里活下来，是地球最顽强的生命。', pointEn: 'Tardigrades survive boiling, freezing, vacuum, even space radiation — the toughest life on Earth.' },
]

// ===== 敌方阵容池(引用现有卡 ID；buildEnemyDeck 会安全跳过无效 ID) =====
export const ENEMY_POOL = [
  { stageName: '病原小队', leaderHP: 15000, aiStrength: 0.4, aiPersonality: 'aggressive',
    deck: ['flu_virus', 'flu_virus', 'ecoli_thug', 'ecoli_thug', 'cavity_bacteria'] },
  { stageName: '自然挑战', leaderHP: 16000, aiStrength: 0.45, aiPersonality: 'balanced',
    deck: ['cheetah_sprinter', 'sunflower_charger', 'sunflower_charger', 'ant_soldier', 'bee_worker'] },
  { stageName: '病毒突击', leaderHP: 18000, aiStrength: 0.5, aiPersonality: 'aggressive',
    deck: ['covid_invader', 'flu_virus', 'flu_virus', 'ecoli_thug', 'bacteriophage_killer'] },
  { stageName: '混合军团', leaderHP: 17000, aiStrength: 0.5, aiPersonality: 'defensive',
    deck: ['orca_alpha', 'ecoli_thug', 'sunflower_charger', 'flu_virus', 'cavity_bacteria'] },
  // —— v2 扩池：难度档位拉开（14000 新手 → 20000 硬核），含 OCEAN 阵容 ——
  { stageName: '虫群突袭', leaderHP: 14000, aiStrength: 0.4, aiPersonality: 'balanced',
    deck: ['ant_soldier', 'bee_worker', 'ant_soldier', 'bee_worker', 'cheetah_sprinter'] },
  { stageName: '深海猎队', leaderHP: 17000, aiStrength: 0.5, aiPersonality: 'balanced',
    deck: ['sperm_whale', 'giant_squid', 'anglerfish', 'blue_ringed_octopus', 'clownfish_anemone'] },
  { stageName: '超级细菌营', leaderHP: 19000, aiStrength: 0.55, aiPersonality: 'aggressive',
    deck: ['mrsa_superbug', 'ecoli_thug', 'cavity_bacteria', 'flu_virus', 'ecoli_thug'] },
  { stageName: '巨兽领主', leaderHP: 20000, aiStrength: 0.5, aiPersonality: 'defensive',
    deck: ['orca_alpha', 'humpback_whale', 'sperm_whale', 'giant_squid', 'blue_ringed_octopus'] },
]

// ===== 约束(平衡档：正向 buff / 负向约束 各半) =====
// effect 直接是 BattleScreen 消费的字段。maxTurns 为软目标(达成给速通加成，不强制失败)。
export const CONSTRAINTS = [
  // —— 正向 buff ——
  { id: 'tech_aid', emoji: '⚗️', kind: 'buff', name: '科技驰援', nameEn: 'Tech Support',
    desc: '开局多发 2 张科技卡！', descEn: 'Start with 2 extra Tech cards!',
    effect: { playerStartingHandBonus: { filter: 'tech', count: 2 } } },
  { id: 'strong_heart', emoji: '❤️', kind: 'buff', name: '强心针', nameEn: 'Adrenaline',
    desc: '主人血量 +5000！', descEn: 'Your leader gains +5000 HP!',
    effect: { playerLeaderHpBonus: 5000 } },
  { id: 'enemy_weak', emoji: '💉', kind: 'buff', name: '敌军虚弱', nameEn: 'Weakened Foe',
    desc: '敌方主将血量 -6000！', descEn: 'Enemy leader loses 6000 HP!',
    effect: { enemyLeaderHpBonus: -6000 } },
  { id: 'nature_aid', emoji: '🌱', kind: 'buff', name: '自然驰援', nameEn: 'Nature Support',
    desc: '开局多发 2 张自然系卡！', descEn: 'Start with 2 extra Nature cards!',
    effect: { playerStartingHandBonus: { filter: 'nature', count: 2 } } },
  // —— 负向约束 ——
  { id: 'last_stand', emoji: '⚔️', kind: 'constraint', name: '背水一战', nameEn: 'Last Stand',
    desc: '主人血量 -8000，赢了更厉害！', descEn: 'Leader -8000 HP — win it the hard way!',
    effect: { playerLeaderHpBonus: -8000 } },
  { id: 'virus_first', emoji: '☣️', kind: 'constraint', name: '病毒先发', nameEn: 'Outbreak',
    desc: '敌方开局已有 2 个病毒在场！', descEn: 'Enemy starts with 2 viruses on the field!',
    effect: { preplaceEnemyCards: ['flu_virus', 'flu_virus'] } },
  { id: 'strong_foe', emoji: '🛡️', kind: 'constraint', name: '强敌压境', nameEn: 'Mighty Foe',
    desc: '敌方主将血量 +8000！', descEn: 'Enemy leader gains +8000 HP!',
    effect: { enemyLeaderHpBonus: 8000 } },
  { id: 'blitz', emoji: '⏱️', kind: 'constraint', name: '速战速决', nameEn: 'Blitz',
    desc: '8 回合内取胜，额外奖励！', descEn: 'Win within 8 turns for a bonus!',
    effect: {}, maxTurns: 8 },
  // —— v2 扩池：+3 buff / +3 约束（保持 buff==约束，test-daily 会咬平衡）——
  // 追加正向 buff
  { id: 'immune_aid', emoji: '🛡️', kind: 'buff', name: '免疫驰援', nameEn: 'Immune Support',
    desc: '开局多发 2 张人体系卡！', descEn: 'Start with 2 extra Body cards!',
    effect: { playerStartingHandBonus: { filter: 'body', count: 2 } } },
  { id: 'precise_strike', emoji: '💉', kind: 'buff', name: '精准打击', nameEn: 'Precise Strike',
    desc: '敌方主将血量 -8000！', descEn: 'Enemy leader loses 8000 HP!',
    effect: { enemyLeaderHpBonus: -8000 } },
  { id: 'full_support', emoji: '🌈', kind: 'buff', name: '全面驰援', nameEn: 'Full Support',
    desc: '主人 +3000、敌方 -3000！', descEn: 'Your leader +3000, enemy -3000!',
    effect: { playerLeaderHpBonus: 3000, enemyLeaderHpBonus: -3000 } },
  // 追加负向约束
  { id: 'resistance', emoji: '🧫', kind: 'constraint', name: '耐药危机', nameEn: 'Resistance Crisis',
    desc: '细菌耐药了！你的抗生素卡攻击力减半。', descEn: 'Bacteria grew resistant — your antibiotic cards deal half ATK.',
    effect: { globalEffect: 'antibiotic_weakened' } },
  { id: 'swarm', emoji: '🌊', kind: 'constraint', name: '群敌压境', nameEn: 'Swarm',
    desc: '敌方开局已有 3 个病原在场！', descEn: 'Enemy starts with 3 pathogens on the field!',
    effect: { preplaceEnemyCards: ['ecoli_thug', 'flu_virus', 'cavity_bacteria'] } },
  { id: 'lightning', emoji: '⚡', kind: 'constraint', name: '闪电战', nameEn: 'Lightning War',
    desc: '6 回合内取胜，额外奖励！', descEn: 'Win within 6 turns for a bonus!',
    effect: {}, maxTurns: 6 },
]

// 周日自由日：纯 buff，喘息
export const SUNDAY_CONSTRAINT = {
  id: 'free_day', emoji: '🌞', kind: 'buff', name: '阳光假日', nameEn: 'Sunny Holiday',
  desc: '周日轻松打：主人 +3000、敌方 -3000！', descEn: 'Easy Sunday: leader +3000, enemy -3000!',
  effect: { playerLeaderHpBonus: 3000, enemyLeaderHpBonus: -3000 },
}

// 约束 → 单选 Conundrum 配置(BattleScreen 弹一次"接受挑战"后 onComplete(effect))
export function constraintToConundrum(constraint, theme) {
  return {
    id: `daily_${constraint.id}`,
    question: '⭐ 今日挑战',
    questionEn: "⭐ Today's Challenge",
    scene: `${constraint.emoji} ${constraint.desc}`,
    sceneEn: `${constraint.emoji} ${constraint.descEn || constraint.desc}`,
    choices: [{
      id: '1',
      label: '接受挑战！',
      labelEn: 'Accept the challenge!',
      effect: constraint.effect || {},
      consequence: `${constraint.emoji} ${constraint.desc}`,
      consequenceEn: `${constraint.emoji} ${constraint.descEn || constraint.desc}`,
      scienceNote: `${theme.emoji} ${theme.point}`,
      scienceNoteEn: `${theme.emoji} ${theme.pointEn || theme.point}`,
    }],
  }
}

// ===== 确定性当日挑战 =====
export function getDailyChallenge(dateStr) {
  const dn = dayNumber(dateStr)
  // v2 轮换新鲜度：三池不同节奏且低相关（互质乘子打散），让扩的池子真被感觉到。
  //   theme  每天换；enemy ~每 2 天换（×7 与池长互质）；constraint ~每 3 天换（×5 与池长互质）。
  //   仍是 dn 的纯函数 → 确定性不变；周日仍强制自由日。（旧：enemy dn>>2=每4天、constraint dn>>4=每16天）
  const theme = pick(THEMES, dn)
  const enemyConfig = pick(ENEMY_POOL, Math.floor(dn / 2) * 7)
  const isSunday = dayOfWeek(dateStr) === 0
  const constraint = isSunday ? SUNDAY_CONSTRAINT : pick(CONSTRAINTS, Math.floor(dn / 3) * 5)
  return {
    id: `daily_${dateStr}`,
    date: dateStr,
    isSunday,
    theme,
    enemyConfig,
    constraint,
    maxTurns: constraint.maxTurns || null,
    conundrum: constraintToConundrum(constraint, theme),
    stageName: '今日挑战',
  }
}

// ===== streak 纯逻辑 =====
// prev: { lastCompleteDate, currentStreak, maxStreak, totalCompleted }
// 返回 { status:'already'|'rollback'|'completed', next }
export function computeStreakUpdate(prev, todayStr) {
  const last = prev.lastCompleteDate || null
  if (last === todayStr) return { status: 'already', next: prev }       // 今天已完成 → 幂等
  if (last && last > todayStr) return { status: 'rollback', next: prev } // 时间往回拨 → 不发奖护栏
  let streak
  if (last && last === prevDateStr(todayStr)) streak = (prev.currentStreak || 0) + 1 // 昨天→接龙
  else streak = 1 // 断签(gap≥2)或首次 → 重置为 1
  const next = {
    ...prev,
    lastCompleteDate: todayStr,
    currentStreak: streak,
    maxStreak: Math.max(prev.maxStreak || 0, streak),
    totalCompleted: (prev.totalCompleted || 0) + 1,
  }
  return { status: 'completed', next }
}

// ===== 奖励纯逻辑 =====
// 返回 { coins, ssrTicket, fragmentCardId, fragmentCount, speedBonus, parts:[{label,...}] }
export function computeReward(challenge, battleResult, newStreak) {
  const parts = []
  const base = 100 + 10 * Math.min(newStreak, 7) // cap +70 防通胀
  parts.push({ label: '基础金币', coins: base })
  let coins = base

  const fullHp = (battleResult.leaderHPPercent || 0) >= 80
  const fast = !!challenge.maxTurns && (battleResult.turnsPlayed || 99) <= challenge.maxTurns
  const speedBonus = fullHp || fast
  if (speedBonus) { coins += 50; parts.push({ label: fast ? '速通加成' : '满血加成', coins: 50 }) }

  const ssrTicket = newStreak % 7 === 0
  if (ssrTicket) parts.push({ label: '🎟️ 周奖励 SSR 券' })

  let fragmentCardId = null, fragmentCount = 0
  if (newStreak % 3 === 0) {
    fragmentCardId = challenge.theme.cardId
    fragmentCount = 1 + (dayNumber(challenge.date) % 3) // 1-3
    parts.push({ label: '🧩 卡牌碎片', cardId: fragmentCardId, n: fragmentCount })
  }

  return { coins, ssrTicket, fragmentCardId, fragmentCount, speedBonus, parts }
}
