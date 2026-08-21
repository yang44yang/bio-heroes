// Bio Heroes 教学关卡数据
// Sprint 21: 3 基础 + 2 进阶教学关卡
//
// ☠️ 提示气泡的箭头方向**不在这里**：曾有 54 个手写 arrow 字段，组件 0 处引用（纯装饰性死字段），
//    而且已经和布局漂移了（hand_card_0 标 'up'，可那一步气泡在屏幕顶部、手牌在最底部 —— 指反）。
//    现在方向由 TutorialScreen 量「被高亮元素 vs 气泡」的相对位置得出，改布局自动跟着对。
//    别把方向写回数据（守卫 ③-11 会判红）。

// ⚠️ 相对 import 必须带 .js：Vite 两种写法都认，Node ESM 只认显式扩展名 ——
//    漏了就等于把本文件锁在 npm test 之外（scripts/test-tutorial-solvable.mjs 要 import 它）。
import cards from './cards.js'
import { MAX_FIELD_SLOTS } from './deckRules.js'
import eventCards from './eventCards.js'
import spCards from './spCards.js'

const cardById = (id) => {
  const c = cards.find(c => c.id === id)
    || eventCards.find(c => c.id === id)
    || spCards.find(c => c.id === id)
  if (!c) throw new Error(`Tutorial card not found: ${id}`)
  return { ...c, currentHp: c.hp, maxHp: c.hp, statuses: [], uid: `tut_${id}_${Math.random().toString(36).slice(2, 6)}` }
}

// 生成一张基于真实卡牌但覆盖部分属性的教学用卡（保留外观/技能，降低伤害）
const tutorialCard = (id, atkOverride = null, hpOverride = null) => {
  const c = cards.find(c => c.id === id)
    || eventCards.find(c => c.id === id)
    || spCards.find(c => c.id === id)
  if (!c) throw new Error(`Tutorial card not found: ${id}`)
  const atk = atkOverride ?? c.atk
  const hp = hpOverride ?? c.hp
  return { ...c, atk, hp, currentHp: hp, maxHp: hp, statuses: [], uid: `tut_${id}_${Math.random().toString(36).slice(2, 6)}` }
}

// 生成一张自定义弱卡（教程对手用）
const weakCard = (name, atk, hp, faction = 'pathogen', nameEn = name) => ({
  id: `tut_weak_${name}`,
  name,
  nameEn,
  type: 'character',
  faction,
  cost: 1,
  rarity: 'R',
  atk,
  hp,
  currentHp: hp,
  maxHp: hp,
  skills: [],
  statuses: [],
  uid: `tut_weak_${Math.random().toString(36).slice(2, 8)}`,
})

// 生成一张带技能的自定义弱卡（教程守护敌人用）
const weakCardWithSkills = (name, atk, hp, faction, nameEn, skills) => ({
  id: `tut_weak_${name}`,
  name,
  nameEn,
  type: 'character',
  faction,
  cost: 1,
  rarity: 'R',
  atk,
  hp,
  currentHp: hp,
  maxHp: hp,
  skills,
  statuses: [],
  uid: `tut_weak_${Math.random().toString(36).slice(2, 8)}`,
})

// ================================================================
// 关卡1（基础 1/3）：第一次战斗 — 只教出牌和攻击
// ================================================================
export const LEVEL_1 = {
  id: 1,
  title: '第一次战斗',
  titleEn: 'First Battle',
  icon: '⚔️',
  category: 'basic',
  intro: [
    '欢迎来到 Bio Heroes！',
    '打出卡牌，攻击敌人，赢得胜利！',
  ],
  introEn: [
    'Welcome to Bio Heroes!',
    'Play cards, attack enemies, and win!',
  ],
  summary: '🎓 你学会了：打出卡牌、攻击敌人、击败对方主人获胜',
  summaryEn: '🎓 You learned: playing cards, attacking enemies, defeating the enemy leader to win',
  playerEnergy: 3,
  playerLeaderHp: 30000,
  enemyLeaderHp: 5000,
  getPlayerHand: () => [
    cardById('ant_soldier'),  // 1费
    cardById('bee_worker'),   // 1费
  ],
  getEnemyField: () => {
    const field = Array(MAX_FIELD_SLOTS).fill(null)
    // ATK 300（原 500 是 bug）：蚂蚁 1000HP 先挨 enemy_attack 一次，再和它互扣一次，
    // 两次都是这个 ATK。500 → 1000-500-500=0 蚂蚁死光、无卡打主人卡死。300 → 剩 400 存活。
    field[2] = weakCard('训练假人', 300, 1000, 'pathogen', 'Training Dummy')
    return field
  },
  playerField: () => Array(MAX_FIELD_SLOTS).fill(null),
  enemySpDeck: [],
  playerSpDeck: [],
  steps: [
    {
      id: 'show_hand',
      highlight: 'hand',
      text: '这是你的手牌！点击一张卡把它放到战场上',
      textEn: 'These are your cards! Tap one to play it onto the field',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_card_1',
      highlight: 'hand_card_0',
      text: '点击这张蚂蚁卡，把它放上战场！',
      textEn: 'Tap this Ant card to play it onto the field!',
      // 「点名哪一张」只由上面的 highlight: 'hand_card_N' 表达 —— 组件按它收紧可点范围。
      // ☠️ 这里原本还有一个死字段（三个步骤共 3 处），组件**0 处引用**：写的人以为钉住了
      //    出牌顺序，实际点哪张都过。别再加这类「看起来管用」的字段 ——
      //    守卫 ③-7 会把任何没人消费的步骤字段直接判红。
      waitFor: 'play_card',
    },
    {
      id: 'explain_turn',
      highlight: 'end_turn_btn',
      text: '干得好！刚上场的卡不能马上攻击。点击"结束回合"',
      textEn: "Nice! Cards just played can't attack yet. Tap 'End Turn'",
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn',
      highlight: 'enemy_field',
      text: '对手攻击了你的卡！现在轮到你了',
      textEn: 'The opponent attacked your card! Now it\'s your turn',
      waitFor: 'acknowledge',
      autoAction: 'enemy_attack',
    },
    {
      id: 'your_attack',
      highlight: 'player_field',
      text: '点击你的卡，再点击敌人来攻击！',
      textEn: 'Tap your card, then tap the enemy to attack!',
      waitFor: 'attack',
    },
    {
      id: 'enemy_defeated',
      highlight: 'enemy_leader',
      text: '敌人被打倒了！点你的卡 → 点对方主人，直接攻击！',
      textEn: 'Enemy defeated! Tap your card → tap the enemy leader to attack directly!',
      waitFor: 'direct_attack',
    },
    {
      id: 'victory',
      highlight: 'none',
      text: '你赢了！🎉',
      textEn: 'You won! 🎉',
      waitFor: 'acknowledge',
    },
  ],
}

// ================================================================
// 关卡2（基础 2/3）：能量管理 — 只教能量和费用
// ================================================================
export const LEVEL_2 = {
  id: 2,
  title: '能量管理',
  titleEn: 'Energy Management',
  icon: '⚡',
  category: 'basic',
  intro: [
    '每张卡都需要消耗能量才能出场！',
    '每回合你会获得更多能量。合理安排出牌顺序！',
  ],
  introEn: [
    'Each card costs energy to play!',
    'You get more energy each turn. Choose wisely!',
  ],
  summary: '🎓 你学会了：能量费用、便宜的卡能更早上场、贵的卡更强但需要更多回合',
  summaryEn: '🎓 You learned: energy costs, cheap cards come early, expensive cards are stronger but need more turns',
  playerEnergy: 2,
  playerLeaderHp: 30000,
  enemyLeaderHp: 8000,
  getPlayerHand: () => [
    cardById('ant_soldier'),      // 1费
    cardById('red_blood_cell'),   // 1费
    cardById('white_blood_cell'), // 2费
  ],
  getEnemyField: () => {
    const field = Array(MAX_FIELD_SLOTS).fill(null)
    field[1] = weakCard('病原兵A', 800, 1500, 'pathogen', 'Pathogen A')
    field[3] = weakCard('病原兵B', 800, 1500, 'pathogen', 'Pathogen B')
    return field
  },
  playerField: () => Array(MAX_FIELD_SLOTS).fill(null),
  enemySpDeck: [],
  playerSpDeck: [],
  steps: [
    {
      id: 'show_energy',
      highlight: 'energy_display',
      text: '你有 2 点能量 ⚡。每张卡左上角的数字是费用',
      textEn: 'You have 2 energy ⚡. The number on each card is its cost',
      waitFor: 'acknowledge',
    },
    {
      id: 'try_expensive',
      highlight: 'hand',
      text: '白细胞费用是 2，蚂蚁费用是 1。你只有 2 能量，先出一张试试！',
      textEn: 'White Blood Cell costs 2, Ant costs 1. You only have 2 energy — try playing one!',
      waitFor: 'play_card',
    },
    {
      id: 'energy_used',
      highlight: 'energy_display',
      text: '能量减少了！看看还能不能再出一张',
      textEn: 'Energy decreased! See if you can play another card',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_second',
      highlight: 'hand',
      text: '如果还有能量，再出一张！能量不够就结束回合',
      textEn: 'If you have energy left, play another! Otherwise end your turn',
      waitFor: 'play_card',
    },
    {
      id: 'end_turn_2',
      highlight: 'end_turn_btn',
      text: '结束回合！下回合你会得到更多能量（回合数 = 能量上限）',
      textEn: 'End your turn! Next turn you get more energy (turn number = energy cap)',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_2',
      highlight: 'none',
      text: '对手回合结束',
      textEn: "Opponent's turn is over",
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass',
    },
    {
      id: 'attack_enemies',
      highlight: 'player_field',
      text: '你的能量增加了！先攻击敌人吧！',
      textEn: 'Your energy increased! Attack the enemies!',
      waitFor: 'attack',
    },
    {
      id: 'finish',
      highlight: 'enemy_leader',
      text: '用你的卡消灭敌人，攻击主人获胜！',
      textEn: 'Destroy all enemies and attack the leader to win!',
      waitFor: 'direct_attack',
    },
    {
      id: 'victory_2',
      highlight: 'none',
      text: '你学会了能量管理！便宜的卡能更早上场，贵的卡要等能量够了再出 🎉',
      textEn: 'You learned energy management! Cheap cards come early, expensive ones need more turns 🎉',
      waitFor: 'acknowledge',
    },
  ],
}

// ================================================================
// 关卡3（基础 3/3）：技能初体验 — 只教守护和技能
// ================================================================
export const LEVEL_3 = {
  id: 3,
  title: '技能初体验',
  titleEn: 'Skills Introduction',
  icon: '🛡️',
  category: 'basic',
  intro: [
    '卡牌有特殊技能！',
    '守护（Guard）会迫使敌人只能攻击它，穿透（Pierce）能打穿守护！',
    '每张卡都是独一无二的！',
  ],
  introEn: [
    'Cards have special skills!',
    'Guard forces enemies to attack it, Pierce punches through!',
    'Each card is unique!',
  ],
  summary: '🎓 你学会了：守护卡能挡住攻击、技能自动触发、每张卡都有独特能力',
  summaryEn: '🎓 You learned: Guard blocks attacks, skills trigger automatically, each card is unique',
  // ☠️ 能量 7 不是随手写的：本关 step7 free_attack 要求「再攻击一次」，而每张卡每回合只能攻击一次
  //    （handleAttack 查 attackedThisTurn，中间又没有 end_turn 重置）→ **场上必须有 2 张卡**。
  //    手牌 cost 是 4/3/2，最贵的两张 = 4+3 = 7，所以只有 ≥7 才能保证**不论孩子先点哪张**都出得起两张。
  //    原值 4（最便宜两张 = 5 > 4）→ 场上永远只有 1 张 → step7 选不出攻击者、该步无逃生阀、
  //    结束回合按钮又只在 end_turn 步可点 → **100% 硬卡死**，只能「跳过教学」。
  //    （由 scripts/test-tutorial-solvable.mjs 的对抗式穷举钉死；改小会立刻变红。）
  playerEnergy: 7,
  playerLeaderHp: 30000,
  enemyLeaderHp: 10000,
  getPlayerHand: () => [
    cardById('skeleton_frame'),     // 4费 有守护
    cardById('neuron_messenger'),   // 3费 有迅击
    cardById('white_blood_cell'),   // 2费 有技能
  ],
  getEnemyField: () => {
    const field = Array(MAX_FIELD_SLOTS).fill(null)
    // HP 1500（原 2000）：must_attack_guard 一次攻击就推进步骤，若守护没被一击打死，
    // 会显示「守护被打倒」但它其实还活着。玩家最弱攻击 = 骨架 1500×1.2(克制)=1800 > 1500 → 必一击。
    field[1] = weakCardWithSkills('守卫兵', 1500, 1500, 'pathogen', 'Guard Soldier', [
      { name: '守护', nameEn: 'Guard', description: '对手只能攻击该卡', descriptionEn: 'Opponents must attack this card', type: 'guard' },
    ])
    field[2] = weakCard('普通兵', 1000, 1500, 'pathogen', 'Normal Soldier')
    field[3] = weakCard('普通兵B', 1000, 1500, 'pathogen', 'Normal Soldier B')
    return field
  },
  playerField: () => Array(MAX_FIELD_SLOTS).fill(null),
  enemySpDeck: [],
  playerSpDeck: [],
  steps: [
    {
      id: 'show_guard',
      highlight: 'enemy_slot_1',
      text: '敌方有一张"守护"卡 🛡️——你只能先攻击它！',
      textEn: 'The enemy has a "Guard" card 🛡️ — you must attack it first!',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_cards',
      highlight: 'hand',
      text: '先出卡上场！',
      textEn: 'Play your cards onto the field!',
      waitFor: 'play_card',
    },
    {
      id: 'play_more',
      highlight: 'hand',
      text: '再出一张！',
      textEn: 'Play another one!',
      waitFor: 'play_card',
    },
    {
      id: 'end_turn_3',
      highlight: 'end_turn_btn',
      text: '结束回合',
      textEn: 'End your turn',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_3',
      highlight: 'none',
      text: '对手回合结束',
      textEn: "Opponent's turn is over",
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass',
    },
    {
      id: 'must_attack_guard',
      highlight: 'player_field',
      text: '对方有守护卡 🛡️，你必须先打它！点你的卡 → 点守护卡',
      textEn: 'The enemy has a Guard card 🛡️ — you must attack it first! Tap your card → tap the Guard card',
      waitFor: 'attack',
    },
    {
      id: 'guard_down',
      highlight: 'enemy_field',
      text: '守护卡被打倒了！现在可以攻击其他敌人！',
      textEn: 'The Guard card is down! Now you can attack other enemies!',
      waitFor: 'acknowledge',
    },
    {
      id: 'free_attack',
      highlight: 'player_field',
      text: '自由攻击！消灭所有敌人！',
      textEn: 'Free attack! Destroy all enemies!',
      waitFor: 'attack',
    },
    {
      id: 'direct_attack_3',
      highlight: 'enemy_leader',
      text: '攻击主人！',
      textEn: 'Attack the leader!',
      waitFor: 'direct_attack',
    },
    {
      id: 'victory_3',
      highlight: 'none',
      text: '你掌握了基础！可以开始闯关了！🎉',
      textEn: "You've mastered the basics! Ready for campaign mode! 🎉",
      waitFor: 'acknowledge',
    },
  ],
}

// ================================================================
// 关卡4（进阶 1）：Power Bank 能量爆发
// ================================================================
export const LEVEL_4 = {
  id: 4,
  title: 'Power Bank 能量爆发',
  titleEn: 'Power Bank Energy Burst',
  icon: '🔋',
  category: 'advanced',
  intro: [
    '有些强力卡牌费用很高，一回合的能量不够用！',
    '但有一个秘密武器——Power Bank！',
    '没花完的能量会自动存入 Power Bank，积攒到一定程度后一次性释放！',
  ],
  introEn: [
    'Some powerful cards cost a lot — one turn\'s energy isn\'t enough!',
    'But there\'s a secret weapon — the Power Bank!',
    'Unused energy is saved automatically. When you\'ve stored enough, release it all at once!',
  ],
  summary: '🎓 你学会了：Power Bank 攒能量、选择时机打破、一回合铺满场面。注意：打破后 Power Bank 就坏了，一场只能用一次！',
  summaryEn: '🎓 You learned: saving energy in the Power Bank, choosing the right moment to break it, flooding the field in one turn. Note: once broken, the Power Bank is gone for the rest of the battle!',
  playerEnergy: 2,
  playerLeaderHp: 30000,
  enemyLeaderHp: 15000,
  getPlayerHand: () => [
    cardById('ant_soldier'),      // 1费
    cardById('bee_worker'),       // 1费
    cardById('mimosa_timid'),     // 1费
    cardById('cheetah_sprinter'), // 3费 SR
    cardById('electric_eel_battery'), // 2费 SR
  ],
  getEnemyField: () => {
    const field = Array(MAX_FIELD_SLOTS).fill(null)
    // HP 2000（原 2500）：clear_field 步骤不能结束回合，每张卡一回合只攻击一次。
    // 2500 时只有猎豹(5000)/电鳗(3000) 能一击，3 个沙袋乱分攻击会剩一个清不掉→卡死。
    // 2000 时蜜蜂(2000)也能一击 → 3 张一击卡(豹/鳗/蜂)刚好对 3 个沙袋，怎么打都清得掉。
    field[1] = weakCard('沙袋A', 800, 2000, 'pathogen', 'Sandbag A')
    field[2] = weakCard('沙袋B', 800, 2000, 'pathogen', 'Sandbag B')
    field[3] = weakCard('沙袋C', 800, 2000, 'pathogen', 'Sandbag C')
    return field
  },
  playerField: () => Array(MAX_FIELD_SLOTS).fill(null),
  enemySpDeck: [],
  playerSpDeck: [],
  steps: [
    {
      id: 'intro_pb',
      highlight: 'hand',
      text: '你的高费卡现在出不起。但有一个秘密武器——Power Bank！',
      textEn: "Your expensive cards can't be played yet. But there's a secret weapon — the Power Bank!",
      waitFor: 'acknowledge',
    },
    {
      id: 'show_pb',
      highlight: 'power_bank',
      text: '每回合没花完的能量会自动存进 Power Bank。看到那个电池图标了吗？',
      textEn: 'Unused energy each turn is saved into the Power Bank automatically. See that battery icon?',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_1_low',
      highlight: 'hand_card_0',
      text: '先出一张低费蚂蚁（1费），剩余能量会流入 Power Bank！',
      textEn: 'Play a cheap Ant card (1 cost) — the leftover energy will flow into the Power Bank!',
      waitFor: 'play_card',
    },
    {
      id: 'end_turn_3a',
      highlight: 'end_turn_btn',
      text: '结束回合！剩余能量存入 Power Bank 了！看到数字在涨吗？',
      textEn: 'End your turn! Leftover energy was saved. See the number going up?',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_3a',
      highlight: 'none',
      text: '对手回合结束。继续攒能量！',
      textEn: "Opponent's turn is over. Keep saving energy!",
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass',
    },
    {
      id: 'end_turn_3b',
      highlight: 'end_turn_btn',
      text: '这回合不出牌，直接结束！让所有能量都流入 Power Bank！',
      textEn: "Don't play anything this turn — end it! Let all the energy flow into the Power Bank!",
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_3b',
      highlight: 'none',
      text: 'Power Bank 越来越满了…',
      textEn: 'The Power Bank is filling up…',
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass',
    },
    {
      id: 'break_pb',
      highlight: 'power_bank_break',
      text: '能量攒够了！点击 💥 打破 Power Bank！',
      textEn: 'Enough energy saved! Tap 💥 to break the Power Bank!',
      waitFor: 'break_power_bank',
    },
    {
      id: 'pb_broken',
      highlight: 'energy_display',
      text: 'BOOM！所有存储的能量释放了！你现在能量充足！',
      textEn: 'BOOM! All stored energy released! You have plenty of energy now!',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_big_cards',
      highlight: 'hand',
      text: '趁现在能量充足，把剩余卡牌全部铺上场！',
      textEn: 'While you have lots of energy, play all your remaining cards!',
      waitFor: 'play_all',
    },
    {
      id: 'end_and_attack',
      highlight: 'end_turn_btn',
      text: '结束回合，下回合用强力卡碾压对手！',
      textEn: 'End your turn — next turn, crush the opponent with your powerful cards!',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_3c',
      highlight: 'none',
      text: '对手回合结束。全力进攻！',
      textEn: "Opponent's turn is over. Go all out!",
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass',
    },
    {
      id: 'crush_enemies',
      highlight: 'player_field',
      text: '用你的强力卡碾压对手！攻击所有敌方卡牌！',
      textEn: 'Use your powerful cards to crush the enemies! Attack all enemy cards!',
      waitFor: 'clear_field',
    },
    {
      id: 'direct_finish',
      highlight: 'enemy_leader',
      text: '场上清空了！点你的卡 → 点上方对手面板，直攻主人！',
      textEn: 'Field is clear! Tap your card → tap the enemy leader panel to attack directly!',
      waitFor: 'direct_attack',
    },
    {
      id: 'victory_3',
      highlight: 'none',
      text: '完美！Power Bank 让你一回合爆发！🎉',
      textEn: 'Perfect! The Power Bank lets you burst in a single turn! 🎉',
      waitFor: 'acknowledge',
    },
  ],
}

// ================================================================
// 关卡5（进阶 2）：SP觉醒与阵营标记
// ================================================================
export const LEVEL_5 = {
  id: 5,
  title: 'SP觉醒与阵营标记',
  titleEn: 'SP Awakening & Faction Markers',
  icon: '🌟',
  category: 'advanced',
  intro: [
    '📜 事件卡打出后效果立刻生效，还能触发 SP 觉醒卡召唤！',
    '🌟 SP 觉醒卡是超强的王牌，只能通过事件卡触发！',
    '准备好见证最强生物的登场了吗？',
  ],
  introEn: [
    '📜 Event cards activate instantly and can trigger SP Awakening summons!',
    '🌟 SP Awakening cards are your ultimate trump cards — only summoned through event cards!',
    'Ready to witness the mightiest creature enter the field?',
  ],
  summary: '🎓 你学会了：事件卡立即生效进弃牌堆、SP 卡只能通过事件卡召唤、SP 卡免费上场且有超强登场效果',
  summaryEn: '🎓 You learned: event cards take effect instantly and go to discard, SP cards can only be summoned via event cards, SP cards enter for free with powerful entrance effects',
  // ☠️ 能量 6 = 手牌总费 1+1+4，一分不多一分不少：step3/step4/step5 三步**各强制打出一张**，
  //    而三步之间没有 end_turn 回能 → 三张必须用同一池能量全部打出，不论孩子按什么顺序点。
  //    原值 5 → 任何顺序都会剩一张出不起，而 play_event **没有**「出不起就放行」的逃生阀
  //    （只有 play_card 有）→ **100% 硬卡死**在 step5。根因是下面那条注释曾写「2费 事件卡」，
  //    而 event_food_chain_burst 的真实 cost 是 4 —— 过期注释把预算算错了。
  //    （scripts/test-tutorial-solvable.mjs 同时钉死能量预算和「注释费用 == 真实费用」。）
  playerEnergy: 6,
  playerLeaderHp: 30000,
  enemyLeaderHp: 12000,
  getPlayerHand: () => [
    cardById('ant_soldier'),            // 1费 自然系
    cardById('bee_worker'),             // 1费 自然系
    { ...cardById('event_food_chain_burst'), uid: `tut_event_fcb_${Math.random().toString(36).slice(2, 6)}` }, // 4费 事件卡
  ],
  getEnemyField: () => {
    const field = Array(MAX_FIELD_SLOTS).fill(null)
    field[1] = weakCard('测试靶A', 1000, 3000, 'pathogen', 'Target A')
    field[3] = weakCard('测试靶B', 1000, 3000, 'pathogen', 'Target B')
    return field
  },
  playerField: () => Array(MAX_FIELD_SLOTS).fill(null),
  enemySpDeck: [],
  getPlayerSpDeck: () => [
    { ...cardById('sp_trex'), uid: `tut_sp_trex_${Math.random().toString(36).slice(2, 6)}` },
  ],
  steps: [
    {
      id: 'show_event',
      highlight: 'hand_card_2',
      text: '📜 这张"食物链爆发"是事件卡！和生物卡不同——打出后不上战场，效果立刻生效',
      textEn: '📜 This "Food Chain Burst" is an event card! Unlike creature cards — it doesn\'t go on the field, its effect activates instantly',
      waitFor: 'acknowledge',
    },
    {
      id: 'show_sp_area',
      highlight: 'sp_area',
      text: '看到 SP 区域那张面朝下的卡了吗？那是超强的 SP 觉醒卡！但它不能直接出牌',
      textEn: "See that face-down card in the SP area? That's a super powerful SP Awakening card! But it can't be played directly",
      waitFor: 'acknowledge',
    },
    {
      id: 'explain_sp_trigger',
      highlight: 'hand_card_2',
      text: 'SP 卡只能通过特定事件卡触发！这张"食物链爆发"可以召唤自然系 SP！',
      textEn: 'SP cards can only be triggered by specific event cards! This "Food Chain Burst" can summon a Nature SP!',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_creature_1',
      highlight: 'hand_card_0',
      text: '先出 2 张生物卡到场上，让事件卡的增益更有效果！',
      textEn: 'First play 2 creature cards — the event card buff will be more effective!',
      waitFor: 'play_card',
    },
    {
      id: 'play_creature_2',
      highlight: 'hand',
      text: '再出一张生物卡！',
      textEn: 'Play one more creature card!',
      waitFor: 'play_card',
    },
    {
      id: 'play_event',
      highlight: 'hand',
      text: '现在打出事件卡"食物链爆发"！全体自然系 ATK +1500！',
      textEn: 'Now play the event card "Food Chain Burst"! All Nature cards ATK +1500!',
      waitFor: 'play_event',
    },
    {
      id: 'event_effect',
      highlight: 'player_field',
      text: '效果生效了！你的自然系生物攻击力大幅提升！事件卡还触发了 SP 召唤！',
      textEn: 'Effect activated! Your Nature creatures got a huge ATK boost! The event card also triggered an SP summon!',
      waitFor: 'acknowledge',
    },
    {
      id: 'summon_sp',
      highlight: 'sp_area',
      text: '💥 选择激活 SP·霸王龙·远古霸主！',
      textEn: '💥 Choose to activate SP T-Rex: Ancient Overlord!',
      waitFor: 'summon_sp',
    },
    {
      id: 'sp_entrance',
      highlight: 'player_field',
      text: '💥 SP·霸王龙登场！登场效果：全体敌方 -3000 HP！无敌的力量！',
      textEn: '💥 SP T-Rex enters the field! Entrance effect: all enemies -3000 HP! Unstoppable power!',
      waitFor: 'acknowledge',
    },
    {
      id: 'end_turn_sp',
      highlight: 'end_turn_btn',
      text: '结束回合，下回合用 SP 卡碾压对手！',
      textEn: 'End your turn — next turn, crush the opponent with your SP card!',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_4',
      highlight: 'none',
      text: '对手回合结束。用霸王龙终结战斗吧！',
      textEn: "Opponent's turn is over. Finish the battle with T-Rex!",
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass',
    },
    {
      id: 'direct_sp',
      highlight: 'enemy_leader',
      text: '霸王龙的登场效果清空了敌方！点你的卡 → 点上方对手面板，直攻主人！',
      textEn: "T-Rex's entrance effect wiped out all enemies! Tap your card → tap the enemy leader to attack directly!",
      waitFor: 'direct_attack',
    },
    {
      id: 'victory_4',
      highlight: 'none',
      text: 'SP 觉醒卡是扭转战局的王牌！🎉',
      textEn: 'SP Awakening cards are the ultimate game-changers! 🎉',
      waitFor: 'acknowledge',
    },
  ],
}

// ================================================================
// 导出
// ================================================================
export const BASIC_LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3]
export const ADVANCED_LEVELS = [LEVEL_4, LEVEL_5]
export const TUTORIAL_LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5]

export const TUTORIAL_STORAGE_KEY = 'bio-heroes-tutorial'

export function loadTutorialProgress() {
  try {
    const raw = localStorage.getItem(TUTORIAL_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return { completedLevels: [], graduated: false }
}

export function saveTutorialProgress(progress) {
  localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(progress))
}
