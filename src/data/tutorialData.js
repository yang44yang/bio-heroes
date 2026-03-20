// Bio Heroes 教学关卡数据
// 5个渐进式教学关卡，每关包含预设状态和步骤引导

import cards from './cards'
import eventCards from './eventCards'
import spCards from './spCards'

const cardById = (id) => {
  const c = cards.find(c => c.id === id)
    || eventCards.find(c => c.id === id)
    || spCards.find(c => c.id === id)
  if (!c) throw new Error(`Tutorial card not found: ${id}`)
  return { ...c, currentHp: c.hp, maxHp: c.hp, statuses: [], uid: `tut_${id}_${Math.random().toString(36).slice(2, 6)}` }
}

// 生成一张自定义弱卡（教程对手用）
const weakCard = (name, atk, hp, faction = 'pathogen') => ({
  id: `tut_weak_${name}`,
  name,
  nameEn: name,
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

// ================================================================
// 关卡1：出牌与基本战斗
// ================================================================
export const LEVEL_1 = {
  id: 1,
  title: '出牌与基本战斗',
  icon: '⚔️',
  intro: [
    '欢迎来到 Bio Heroes！',
    '在这里，你将学会如何打出卡牌、攻击对手，最终击败敌方主人！',
    '让我们开始吧！',
  ],
  summary: '🎓 你学会了：出牌消耗能量、召唤疲劳、选择攻击目标、击败对方主人获胜',
  playerEnergy: 3,
  playerLeaderHp: 30000,
  enemyLeaderHp: 5000, // 低HP，方便教学击杀
  getPlayerHand: () => [
    cardById('ant_soldier'),    // 1费
    cardById('bee_worker'),     // 1费
    cardById('red_blood_cell'), // 1费
  ],
  getEnemyField: () => {
    const field = [null, null, null, null, null]
    field[2] = weakCard('训练假人', 500, 1000) // 很弱，容易击杀
    return field
  },
  playerField: () => [null, null, null, null, null],
  enemySpDeck: [],
  playerSpDeck: [],
  steps: [
    {
      id: 'show_hand',
      highlight: 'hand',
      text: '这是你的手牌！每张卡左上角的数字是费用。你有 3 点能量 ⚡',
      arrow: 'down',
      waitFor: 'acknowledge', // 点击任意处继续
    },
    {
      id: 'play_card_1',
      highlight: 'hand_card_0',
      text: '点击这张蚂蚁卡把它放到战场上！消耗 1 点能量',
      arrow: 'up',
      waitFor: 'play_card', // 等待出牌动作
      targetCardIdx: 0,
    },
    {
      id: 'explain_fatigue',
      highlight: 'player_field',
      text: '很好！蚂蚁已经上场了。但刚上场的卡不能立刻攻击（召唤疲劳），等下一回合',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_card_2',
      highlight: 'hand',
      text: '再出一张！你还有 2 点能量',
      arrow: 'up',
      waitFor: 'play_card',
    },
    {
      id: 'end_turn_1',
      highlight: 'end_turn_btn',
      text: '点击"结束回合"。对手会行动，然后轮到你',
      arrow: 'right',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn',
      highlight: 'enemy_field',
      text: '对手攻击了你的卡！双方互相造成伤害',
      arrow: 'none',
      waitFor: 'acknowledge',
      autoAction: 'enemy_attack', // 脚本AI自动攻击
    },
    {
      id: 'your_attack',
      highlight: 'player_field',
      text: '现在你的卡可以攻击了！点击你的卡 → 再点击要攻击的敌方目标',
      arrow: 'up',
      waitFor: 'attack',
    },
    {
      id: 'enemy_defeated',
      highlight: 'enemy_leader',
      text: '敌方卡被击败了！现在可以直接攻击对方主人！点击你的卡 → 点击对方主人',
      arrow: 'up',
      waitFor: 'direct_attack',
    },
    {
      id: 'victory',
      highlight: 'none',
      text: '对方主人 HP 归零！你赢了！🎉',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
  ],
}

// ================================================================
// 关卡2：技能与阵营克制
// ================================================================
export const LEVEL_2 = {
  id: 2,
  title: '技能与阵营克制',
  icon: '🧬',
  intro: [
    '不同阵营之间存在克制关系！',
    '人体系 🧬 克制 病原系 🦠，攻击伤害 +20%！',
    '卡牌的技能会在特定时机自动触发，带来额外效果。',
  ],
  summary: '🎓 你学会了：阵营克制加成（🧬克制🦠，⚗️克制🦠）、卡牌技能自动触发',
  playerEnergy: 4,
  playerLeaderHp: 30000,
  enemyLeaderHp: 10000,
  getPlayerHand: () => [
    cardById('white_blood_cell'), // 🧬2费
    cardById('stomach_acid'),     // 🧬2费
  ],
  getEnemyField: () => {
    const field = [null, null, null, null, null]
    field[1] = cardById('cavity_bacteria') // 🦠
    field[3] = cardById('flu_virus')       // 🦠
    return field
  },
  playerField: () => [null, null, null, null, null],
  enemySpDeck: [],
  playerSpDeck: [],
  steps: [
    {
      id: 'show_faction',
      highlight: 'hand_card_0',
      text: '白细胞是人体系 🧬，对面是病原系 🦠。人体系克制病原系，攻击伤害 +20%！',
      arrow: 'up',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_white_blood',
      highlight: 'hand_card_0',
      text: '出白细胞上场！',
      arrow: 'up',
      waitFor: 'play_card',
      targetCardIdx: 0,
    },
    {
      id: 'show_advantage',
      highlight: 'player_field',
      text: '看到 🔺 标记了吗？代表你克制对方！下回合攻击时伤害会增加 20%',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_stomach',
      highlight: 'hand',
      text: '再出胃酸上场！',
      arrow: 'up',
      waitFor: 'play_card',
    },
    {
      id: 'end_turn_2',
      highlight: 'end_turn_btn',
      text: '结束回合，下回合就可以攻击了！',
      arrow: 'right',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_2',
      highlight: 'none',
      text: '对手回合结束。轮到你了！',
      arrow: 'none',
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass', // 对手不做任何事
    },
    {
      id: 'attack_cavity',
      highlight: 'player_field',
      text: '点击你的白细胞 → 攻击蛀牙菌！克制加成让你造成更多伤害！',
      arrow: 'up',
      waitFor: 'attack',
    },
    {
      id: 'skill_trigger',
      highlight: 'player_field',
      text: '白细胞的技能「吞噬攻击」触发了！ATK 永久 +500！继续攻击剩余敌人！',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
    {
      id: 'finish_enemies',
      highlight: 'player_field',
      text: '用胃酸攻击流感病毒！消灭所有敌人！',
      arrow: 'up',
      waitFor: 'attack',
    },
    {
      id: 'direct_attack_leader',
      highlight: 'enemy_leader',
      text: '场上没有敌人了！直接攻击对方主人！',
      arrow: 'up',
      waitFor: 'direct_attack',
    },
    {
      id: 'victory_2',
      highlight: 'none',
      text: '完美！利用克制关系让战斗更轻松！🎉',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
  ],
}

// ================================================================
// 关卡3：Power Bank 能量爆发
// ================================================================
export const LEVEL_3 = {
  id: 3,
  title: 'Power Bank 能量爆发',
  icon: '⚡',
  intro: [
    '有些强力卡牌费用很高，一回合的能量不够用！',
    '但有一个秘密武器——Power Bank！',
    '没花完的能量会自动存入 Power Bank，积攒到一定程度后一次性释放！',
  ],
  summary: '🎓 你学会了：Power Bank 攒能量、选择时机打破、一回合铺满场面。注意：打破后 Power Bank 就坏了，一场只能用一次！',
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
    const field = [null, null, null, null, null]
    field[1] = weakCard('沙袋A', 800, 2500)
    field[2] = weakCard('沙袋B', 800, 2500)
    field[3] = weakCard('沙袋C', 800, 2500)
    return field
  },
  playerField: () => [null, null, null, null, null],
  enemySpDeck: [],
  playerSpDeck: [],
  steps: [
    {
      id: 'intro_pb',
      highlight: 'hand',
      text: '你的高费卡现在出不起。但有一个秘密武器——Power Bank！',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
    {
      id: 'show_pb',
      highlight: 'power_bank',
      text: '每回合没花完的能量会自动存进 Power Bank。看到那个电池图标了吗？',
      arrow: 'left',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_1_low',
      highlight: 'hand_card_0',
      text: '先出一张低费蚂蚁（1费），剩余能量会流入 Power Bank！',
      arrow: 'up',
      waitFor: 'play_card',
      targetCardIdx: 0,
    },
    {
      id: 'end_turn_3a',
      highlight: 'end_turn_btn',
      text: '结束回合！剩余能量存入 Power Bank 了！看到数字在涨吗？',
      arrow: 'right',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_3a',
      highlight: 'none',
      text: '对手回合结束。继续攒能量！',
      arrow: 'none',
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass',
    },
    {
      id: 'end_turn_3b',
      highlight: 'end_turn_btn',
      text: '这回合不出牌，直接结束！让所有能量都流入 Power Bank！',
      arrow: 'right',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_3b',
      highlight: 'none',
      text: 'Power Bank 越来越满了…',
      arrow: 'none',
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass',
    },
    {
      id: 'break_pb',
      highlight: 'power_bank_break',
      text: '能量攒够了！点击 💥 打破 Power Bank！',
      arrow: 'left',
      waitFor: 'break_power_bank',
    },
    {
      id: 'pb_broken',
      highlight: 'energy_display',
      text: 'BOOM！所有存储的能量释放了！你现在能量充足！',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_big_cards',
      highlight: 'hand',
      text: '趁现在能量充足，把剩余卡牌全部铺上场！',
      arrow: 'up',
      waitFor: 'play_all',
    },
    {
      id: 'end_and_attack',
      highlight: 'end_turn_btn',
      text: '结束回合，下回合用强力卡碾压对手！',
      arrow: 'right',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_3c',
      highlight: 'none',
      text: '对手回合结束。全力进攻！',
      arrow: 'none',
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass',
    },
    {
      id: 'crush_enemies',
      highlight: 'player_field',
      text: '用你的强力卡碾压对手！攻击所有敌方卡牌！',
      arrow: 'up',
      waitFor: 'clear_field',
    },
    {
      id: 'direct_finish',
      highlight: 'enemy_leader',
      text: '场上清空了！直接攻击对方主人结束战斗！',
      arrow: 'up',
      waitFor: 'direct_attack',
    },
    {
      id: 'victory_3',
      highlight: 'none',
      text: '完美！Power Bank 让你一回合爆发！🎉',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
  ],
}

// ================================================================
// 关卡4：事件卡与 SP 觉醒
// ================================================================
export const LEVEL_4 = {
  id: 4,
  title: '事件卡与 SP 觉醒',
  icon: '🌟',
  intro: [
    '📜 事件卡是一种特殊卡牌，打出后效果立刻生效，然后进入弃牌堆！',
    '🌟 SP 觉醒卡是超强的王牌，但它们不能直接从手牌出场——只能通过事件卡触发召唤！',
    '准备好见证最强生物的登场了吗？',
  ],
  summary: '🎓 你学会了：事件卡立即生效进弃牌堆、SP 卡只能通过事件卡召唤、SP 卡免费上场且有超强登场效果',
  playerEnergy: 5,
  playerLeaderHp: 30000,
  enemyLeaderHp: 12000,
  getPlayerHand: () => [
    cardById('ant_soldier'),            // 1费 自然系
    cardById('bee_worker'),             // 1费 自然系
    { ...cardById('event_food_chain_burst'), uid: `tut_event_fcb_${Math.random().toString(36).slice(2, 6)}` }, // 2费 事件卡
  ],
  getEnemyField: () => {
    const field = [null, null, null, null, null]
    field[1] = weakCard('测试靶A', 1000, 3000)
    field[3] = weakCard('测试靶B', 1000, 3000)
    return field
  },
  playerField: () => [null, null, null, null, null],
  enemySpDeck: [],
  getPlayerSpDeck: () => [
    { ...cardById('sp_trex'), uid: `tut_sp_trex_${Math.random().toString(36).slice(2, 6)}` },
  ],
  steps: [
    {
      id: 'show_event',
      highlight: 'hand_card_2',
      text: '📜 这张"食物链爆发"是事件卡！和生物卡不同——打出后不上战场，效果立刻生效',
      arrow: 'up',
      waitFor: 'acknowledge',
    },
    {
      id: 'show_sp_area',
      highlight: 'sp_area',
      text: '看到 SP 区域那张面朝下的卡了吗？那是超强的 SP 觉醒卡！但它不能直接出牌',
      arrow: 'down',
      waitFor: 'acknowledge',
    },
    {
      id: 'explain_sp_trigger',
      highlight: 'hand_card_2',
      text: 'SP 卡只能通过特定事件卡触发！这张"食物链爆发"可以召唤自然系 SP！',
      arrow: 'up',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_creature_1',
      highlight: 'hand_card_0',
      text: '先出 2 张生物卡到场上，让事件卡的增益更有效果！',
      arrow: 'up',
      waitFor: 'play_card',
      targetCardIdx: 0,
    },
    {
      id: 'play_creature_2',
      highlight: 'hand',
      text: '再出一张生物卡！',
      arrow: 'up',
      waitFor: 'play_card',
    },
    {
      id: 'play_event',
      highlight: 'hand',
      text: '现在打出事件卡"食物链爆发"！全体自然系 ATK +1500！',
      arrow: 'up',
      waitFor: 'play_event',
    },
    {
      id: 'event_effect',
      highlight: 'player_field',
      text: '效果生效了！你的自然系生物攻击力大幅提升！事件卡还触发了 SP 召唤！',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
    {
      id: 'summon_sp',
      highlight: 'sp_area',
      text: '💥 选择激活 SP·霸王龙·远古霸主！',
      arrow: 'down',
      waitFor: 'summon_sp',
    },
    {
      id: 'sp_entrance',
      highlight: 'player_field',
      text: '💥 SP·霸王龙登场！登场效果：全体敌方 -3000 HP！无敌的力量！',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
    {
      id: 'end_turn_sp',
      highlight: 'end_turn_btn',
      text: '结束回合，下回合用 SP 卡碾压对手！',
      arrow: 'right',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_4',
      highlight: 'none',
      text: '对手回合结束。用霸王龙终结战斗吧！',
      arrow: 'none',
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass',
    },
    {
      id: 'sp_crush',
      highlight: 'player_field',
      text: '用霸王龙攻击！感受 SP 卡的碾压力量！',
      arrow: 'up',
      waitFor: 'attack',
    },
    {
      id: 'direct_sp',
      highlight: 'enemy_leader',
      text: '直接攻击对方主人！',
      arrow: 'up',
      waitFor: 'direct_attack',
    },
    {
      id: 'victory_4',
      highlight: 'none',
      text: 'SP 觉醒卡是扭转战局的王牌！🎉',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
  ],
}

// ================================================================
// 关卡5：阵营标记与 SSR 出场条件
// ================================================================
export const LEVEL_5 = {
  id: 5,
  title: '阵营标记与 SSR 出场条件',
  icon: '🔒',
  intro: [
    '最强的 SSR 卡不是随时能出的——它们需要满足阵营标记条件！',
    '弃牌堆中的卡会提供对应阵营的标记🌱。',
    '当标记积累够了，被锁定的强力卡就能解锁出场！',
  ],
  summary: '🎓 你学会了：弃牌堆的卡提供阵营标记、SSR 和高费 SR 需要标记才能出场、前期先用低费卡积累标记',
  playerEnergy: 3,
  playerLeaderHp: 30000,
  enemyLeaderHp: 12000,
  getPlayerHand: () => [
    cardById('ant_soldier'),      // 1费 🌱
    cardById('bee_worker'),       // 1费 🌱
    cardById('mimosa_timid'),     // 1费 🌱
    cardById('orca_alpha'),       // 7费 SSR 🌱 (需要弃牌堆2个🌱标记)
  ],
  getEnemyField: () => {
    const field = [null, null, null, null, null]
    field[0] = weakCard('猎手A', 2500, 1800)
    field[2] = weakCard('猎手B', 2500, 1800)
    field[4] = weakCard('猎手C', 1000, 1800)
    return field
  },
  playerField: () => [null, null, null, null, null],
  enemySpDeck: [],
  playerSpDeck: [],
  steps: [
    {
      id: 'show_ssr_locked',
      highlight: 'hand_card_3',
      text: '这张 SSR 虎鲸超强，但它 🔒 了！需要弃牌堆中有 2 个 🌱 自然系标记',
      arrow: 'up',
      waitFor: 'acknowledge',
    },
    {
      id: 'explain_markers',
      highlight: 'discard_area',
      text: '弃牌堆中的卡会提供阵营标记。你需要有 2 张 🌱 自然系卡进入弃牌堆',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
    {
      id: 'play_low_1',
      highlight: 'hand_card_0',
      text: '先出低费自然系卡上场战斗！它们被击败后会进入弃牌堆提供标记',
      arrow: 'up',
      waitFor: 'play_card',
      targetCardIdx: 0,
    },
    {
      id: 'play_low_2',
      highlight: 'hand',
      text: '再出一张！',
      arrow: 'up',
      waitFor: 'play_card',
    },
    {
      id: 'play_low_3',
      highlight: 'hand',
      text: '最后一张低费也出了！',
      arrow: 'up',
      waitFor: 'play_card',
    },
    {
      id: 'end_turn_5a',
      highlight: 'end_turn_btn',
      text: '结束回合，等待对手攻击你的小卡',
      arrow: 'right',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_kills',
      highlight: 'none',
      text: '你的卡被击败了——但看！它进入了弃牌堆，🌱 标记 +1！',
      arrow: 'none',
      waitFor: 'acknowledge',
      autoAction: 'enemy_kill_cards', // 脚本：对手攻击杀死玩家的卡
    },
    {
      id: 'marker_check',
      highlight: 'discard_area',
      text: '🌱 标记已经有 2 个了！虎鲸 🔒 解锁了！但你需要 7 点能量...',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
    {
      id: 'end_turn_5b',
      highlight: 'end_turn_btn',
      text: '攒几回合能量（Power Bank），然后释放出虎鲸！先结束回合',
      arrow: 'right',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_5b',
      highlight: 'none',
      text: '继续攒能量…',
      arrow: 'none',
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass',
    },
    {
      id: 'break_and_play',
      highlight: 'power_bank_break',
      text: '打破 Power Bank，释放所有能量！然后出虎鲸！',
      arrow: 'left',
      waitFor: 'break_power_bank',
    },
    {
      id: 'play_orca',
      highlight: 'hand',
      text: '出虎鲸！体验 SSR 的碾压力量！',
      arrow: 'up',
      waitFor: 'play_card',
    },
    {
      id: 'end_turn_5c',
      highlight: 'end_turn_btn',
      text: '结束回合，下回合用虎鲸碾压！',
      arrow: 'right',
      waitFor: 'end_turn',
    },
    {
      id: 'enemy_turn_5c',
      highlight: 'none',
      text: '虎鲸的力量势不可挡！',
      arrow: 'none',
      waitFor: 'acknowledge',
      autoAction: 'enemy_pass',
    },
    {
      id: 'orca_attack',
      highlight: 'player_field',
      text: '用虎鲸攻击敌方！',
      arrow: 'up',
      waitFor: 'attack',
    },
    {
      id: 'direct_orca',
      highlight: 'enemy_leader',
      text: '直攻对方主人！SSR 就是这么强！',
      arrow: 'up',
      waitFor: 'direct_attack',
    },
    {
      id: 'victory_5',
      highlight: 'none',
      text: '恭喜！你已经掌握了所有核心玩法！🎉',
      arrow: 'none',
      waitFor: 'acknowledge',
    },
  ],
}

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
