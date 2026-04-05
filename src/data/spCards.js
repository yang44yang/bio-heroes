// Bio Heroes 生物英雄传 - SP觉醒卡数据
// Generated: 2026-03-16
// Total: 8 SP cards (4 factions × 2 cards)
// SP卡只能通过事件卡的SP召唤规则触发上场
// SP卡上场不消耗能量，占战场位，被击杀进弃牌堆

const spCards = [

  // ============================================================
  // 🌱 自然系 SP (2张)
  // ============================================================

  {
    id: "sp_trex",
    name: "SP·霸王龙·远古霸主",
    nameEn: "SP: T-Rex: Ancient Apex",
    type: "sp",
    faction: "nature",
    subType: "land",
    set: "BASE",
    spCost: 6,
    rarity: "SSR",
    atk: 10000,
    hp: 8000,
    factionRequirement: null,
    skills: [
      {
        name: "灭世咆哮",
        nameEn: "Extinction Roar",
        type: "unique",
        timing: "onPlay",
        description: "登场时对所有敌方卡造成 3000 伤害",
        scienceNote: "霸王龙咬合力达6吨，是陆地史上最强的掠食者"
      },
      {
        name: "迅击",
        nameEn: "Swift Attack",
        type: "generic",
        description: "出场当回合可攻击（无召唤疲劳）",
        scienceNote: "霸王龙虽然体型巨大但奔跑速度可达30公里/时"
      },
      {
        name: "压制",
        nameEn: "Overpower",
        type: "generic",
        description: "击杀对方卡后溢出伤害转给主人",
        scienceNote: "霸王龙的咬合力足以粉碎骨头"
      }
    ],
    scienceCard: "霸王龙生活在约6800万年前的白垩纪晚期，是有史以来最大的陆地掠食者之一。它的牙齿像香蕉一样大，咬合力高达6吨——相当于一辆卡车的重量压在一个点上！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["dinosaur", "predator"],
  },

  {
    id: "sp_world_tree",
    name: "SP·世界树·生命之源",
    nameEn: "SP: World Tree: Source of Life",
    type: "sp",
    faction: "nature",
    subType: "plant",
    set: "BASE",
    spCost: 4,
    rarity: "SSR",
    atk: 3000,
    hp: 15000,
    factionRequirement: null,
    skills: [
      {
        name: "万物复苏",
        nameEn: "Universal Revival",
        type: "unique",
        timing: "onPlay",
        description: "登场时所有友方卡回复 3000 HP，并修复己方 Power Bank（如已打破则恢复为可用状态）",
        scienceNote: "森林是地球的肺，一棵大树每天能产生足够一个人呼吸的氧气"
      },
      {
        name: "守护",
        nameEn: "Guard",
        type: "generic",
        description: "在场时对手只能攻击该卡",
        scienceNote: "大树为无数生物提供庇护和栖息地"
      },
      {
        name: "自愈",
        nameEn: "Natural Recovery",
        type: "generic",
        description: "每回合自动回复 1500 HP",
        scienceNote: "树木有强大的自我修复能力，被砍伐后仍能从树桩重新生长"
      }
    ],
    scienceCard: "世界各地的神话中都有世界树的传说——北欧的尤克特拉希尔、中国的建木、日本的神木。它们象征着生命的根基和宇宙的连接。现实中，地球上最大的树是加州的巨杉\"谢尔曼将军\"，高83米！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["mythical"],
  },

  // ============================================================
  // 🧬 人体系 SP (2张)
  // ============================================================

  {
    id: "sp_car_t_cell",
    name: "SP·CAR-T细胞·基因战士",
    nameEn: "SP: CAR-T Cell: Gene Warrior",
    type: "sp",
    faction: "body",
    subType: "blood",
    set: "BASE",
    spCost: 5,
    rarity: "SSR",
    atk: 8000,
    hp: 6000,
    factionRequirement: null,
    skills: [
      {
        name: "精准猎杀",
        nameEn: "Precision Kill",
        type: "unique",
        timing: "onPlay",
        description: "登场时消灭对方场上一张病原系卡（无视HP）",
        scienceNote: "CAR-T细胞疗法通过基因工程改造T细胞，让它们精准识别并消灭特定目标"
      },
      {
        name: "免疫克星",
        nameEn: "Immune Bane",
        type: "unique",
        description: "攻击病原系卡牌时伤害 ×2",
        scienceNote: "改造后的CAR-T细胞对目标细胞的杀伤效率远超普通T细胞"
      }
    ],
    scienceCard: "CAR-T细胞疗法是21世纪最革命性的医学突破之一！医生从患者血液中取出T细胞，用基因工程给它装上\"导航系统\"（嵌合抗原受体），让它能精准找到并消灭癌细胞。2017年获得FDA批准，已经治愈了很多白血病患者！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["immune", "immunotherapy"],
  },

  {
    id: "sp_brain_awakening",
    name: "SP·大脑·意识觉醒",
    nameEn: "SP: Brain: Consciousness Awakening",
    type: "sp",
    faction: "body",
    subType: "organ",
    set: "BASE",
    spCost: 7,
    rarity: "SSR",
    atk: 5000,
    hp: 10000,
    factionRequirement: null,
    skills: [
      {
        name: "全知之眼",
        nameEn: "Omniscient Eye",
        type: "unique",
        timing: "onPlay",
        description: "登场时揭示对方所有手牌，所有己方卡获得\"迅击\"效果1回合",
        scienceNote: "大脑整合所有感官信息，让我们能全面感知和快速反应"
      },
      {
        name: "超级计算",
        nameEn: "Super Computation",
        type: "unique",
        description: "每回合开始时抽1张额外的牌",
        scienceNote: "人脑每秒进行约10的16次方次运算，超过任何现有超级计算机"
      }
    ],
    scienceCard: "人脑是已知宇宙中最复杂的结构——860亿个神经元通过100万亿个突触相连，产生了意识、思维、情感和创造力。大脑只占体重的2%，却消耗20%的能量。至今科学家仍然不完全理解意识是如何产生的。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  // ============================================================
  // 🦠 病原系 SP (2张)
  // ============================================================

  {
    id: "sp_super_bacteria",
    name: "SP·超级细菌·耐药终结者",
    nameEn: "SP: Super Bacteria: Resistance Ender",
    type: "sp",
    faction: "pathogen",
    subType: "bacteria",
    set: "BASE",
    spCost: 5,
    rarity: "SSR",
    atk: 7000,
    hp: 7000,
    factionRequirement: null,
    skills: [
      {
        name: "耐药屏障",
        nameEn: "Resistance Barrier",
        type: "unique",
        timing: "onPlay",
        description: "登场时消灭对方场上所有护盾效果，所有敌方科技系卡 ATK -50%",
        scienceNote: "超级细菌能分解抗生素分子，让药物完全失效"
      },
      {
        name: "抗药免疫",
        nameEn: "Drug Immunity",
        type: "unique",
        description: "免疫科技系卡牌的伤害",
        scienceNote: "多重耐药菌对几乎所有常规抗生素产生了抗性"
      }
    ],
    scienceCard: "超级细菌是对多种抗生素都产生耐药性的细菌，比如MRSA（耐甲氧西林金黄色葡萄球菌）。世界卫生组织警告说，如果不采取行动，到2050年每年可能有1000万人死于耐药感染——比癌症还多！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["MRSA"],
  },

  {
    id: "sp_ancient_virus",
    name: "SP·远古病毒·冰封复苏",
    nameEn: "SP: Ancient Virus: Frozen Resurrection",
    type: "sp",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    spCost: 8,
    rarity: "SSR",
    atk: 12000,
    hp: 6000,
    factionRequirement: null,
    skills: [
      {
        name: "冰封释放",
        nameEn: "Frozen Release",
        type: "unique",
        timing: "onPlay",
        description: "登场时对敌方主人造成 5000 伤害",
        scienceNote: "永久冻土融化释放的远古病毒可能对现代生物毫无免疫力"
      },
      {
        name: "迅击",
        nameEn: "Swift Attack",
        type: "generic",
        description: "出场当回合可攻击（无召唤疲劳）",
        scienceNote: "远古病毒一旦复苏会以极快的速度传播"
      },
      {
        name: "瘟疫扩散",
        nameEn: "Plague Spread",
        type: "unique",
        description: "每回合对所有敌方卡造成 1000 伤害",
        scienceNote: "未知病毒在缺乏免疫力的种群中会造成毁灭性的传播"
      }
    ],
    scienceCard: "2014年科学家从西伯利亚3万年前的永久冻土中复活了一种巨型病毒（Pithovirus）。随着全球变暖加速冻土融化，被冰封了数万年的远古病毒可能重见天日——这些病毒人类从未接触过，没有任何免疫力！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["ancient"],
  },

  // ============================================================
  // ⚗️ 科技系 SP (2张)
  // ============================================================

  {
    id: "sp_nanobot",
    name: "SP·纳米机器人·微观军团",
    nameEn: "SP: Nanobot: Micro Legion",
    type: "sp",
    faction: "tech",
    subType: "genetech",
    set: "BASE",
    spCost: 5,
    rarity: "SSR",
    atk: 6000,
    hp: 6000,
    factionRequirement: null,
    skills: [
      {
        name: "全面修复",
        nameEn: "Full Repair",
        type: "unique",
        timing: "onPlay",
        description: "登场时移除所有友方卡的负面状态，全队获得 2000 护盾",
        scienceNote: "纳米机器人能在细胞级别修复受损组织，是精准医疗的终极形态"
      },
      {
        name: "持续维护",
        nameEn: "Continuous Maintenance",
        type: "unique",
        description: "每回合结束时为HP最低的友方卡回复 2000 HP",
        scienceNote: "纳米机器人可以在血管中持续巡逻，实时监测和修复异常"
      }
    ],
    scienceCard: "纳米机器人是科学家梦想中的微型医生——比血细胞还小的机器人在你的血管里巡逻，发现病变就立刻修复。虽然真正的医用纳米机器人还在研发中，但已经有纳米药物载体能把药物精准送到肿瘤内部！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "sp_crispr",
    name: "SP·基因编辑器·CRISPR之力",
    nameEn: "SP: Gene Editor: Power of CRISPR",
    type: "sp",
    faction: "tech",
    subType: "genetech",
    set: "BASE",
    spCost: 7,
    rarity: "SSR",
    atk: 8000,
    hp: 8000,
    factionRequirement: null,
    skills: [
      {
        name: "基因重写",
        nameEn: "Gene Rewrite",
        type: "unique",
        timing: "onPlay",
        description: "登场时选择对方一张卡，将其ATK和HP互换",
        scienceNote: "CRISPR能精准切割DNA并替换基因片段，从根本上改变生物特性"
      },
      {
        name: "穿透",
        nameEn: "Piercing Strike",
        type: "generic",
        description: "打守护卡时溢出伤害穿透到主人",
        scienceNote: "基因编辑能穿透细胞防御机制直接修改核心遗传密码"
      }
    ],
    scienceCard: "CRISPR-Cas9是2020年诺贝尔化学奖的获奖技术！它就像一把分子剪刀，能在DNA的精确位置剪一刀，然后插入、删除或替换基因。发明者詹妮弗·杜德纳和埃马纽埃尔·夏彭蒂耶让\"编辑生命\"成为了现实。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["gene_editing"],
  },

];

export default spCards;
