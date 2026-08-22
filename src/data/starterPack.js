// 新玩家初始卡牌礼包（从 useEconomy.js 抽出来，2026-08-22）
//
// 抽出来的原因：守卫要用**真实的这份清单**去跑「一键推荐能不能给新玩家组出合法卡组」，
// 而 useEconomy.js 引 React、Node 起不来。数据留在这里 = 应用和守卫读同一份，不会漂移。
//
// ☠️ 数量注释必须和条目对得上：原注释写「25张」、分组写 7/7/5/5，实际是 5/5/4/4 + 2 张事件卡 = 20，
//    首页显示的「收集 20 张」才是真的。这类过期注释会让下一个动数值的人算错预算
//    （教学关卡就栽过一次：注释写「2费」实际 4 费，直接导致一关无法通关）。
//    scripts/test-deck-recommend.mjs 会把注释里的数字和真实条目数逐条对账。

// 生物卡 18 张
export const STARTER_COLLECTION = [
  // 🌱自然系 5张
  'ant_soldier',        // 蚂蚁 R
  'bee_worker',         // 蜜蜂 R
  'mimosa_timid',       // 含羞草 R
  'sunflower_charger',  // 向日葵 R
  'cheetah_sprinter',   // 猎豹 SR
  // 🧬人体系 5张
  'platelet_guardian',  // 血小板 R
  'red_blood_cell',     // 红细胞 R
  'white_blood_cell',   // 白细胞 SR
  'stomach_acid',       // 胃酸 R
  'skin_barrier',       // 皮肤 R
  // 🦠病原系 4张
  'flu_virus',          // 流感病毒 R
  'cavity_bacteria',    // 蛀牙菌 R
  'ecoli_thug',         // 大肠杆菌 R
  'bacteriophage_killer', // 噬菌体 SR
  // ⚗️科技系 4张
  'bandaid_helper',     // 创可贴 R
  'thermometer_alarm',  // 体温计 R
  'stethoscope_listener', // 听诊器 R
  'microscope_eye',     // 显微镜 R
]

// 事件卡 2张（也进初始收藏，用于组卡组）
export const STARTER_EVENT_CARDS = [
  'event_lab_observation',  // 实验观察 ⚗️
  'event_immune_response',  // 免疫应答 🧬
]
