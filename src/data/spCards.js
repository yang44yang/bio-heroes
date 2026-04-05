// Bio Heroes 生物英雄传 - SP觉醒卡数据
// Generated: 2026-03-16
// Total: 16 SP cards (8 original + 8 Sprint 18) (4 factions × 2 cards)
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

  // ============================================================
  // Sprint 18 新增 SP 卡 (8张，每阵营+2)
  // ============================================================

  {
    id: "sp_world_tree_ancient",
    name: "SP·远古世界树·万灵庇护",
    nameEn: "SP: Ancient World Tree - Universal Shelter",
    type: "sp",
    faction: "nature",
    subType: "plant",
    set: "BASE",
    spCost: 8,
    rarity: "SSR",
    atk: 5000,
    hp: 25000,
    factionRequirement: null,
    skills: [
          {
                "name": "生态庇护",
                "nameEn": "Ecosystem Shelter",
                "type": "unique",
                "timing": "onPlay",
                "description": "出场时全队恢复 5000 HP，且每回合恢复 2000 HP（持续到世界树被击杀）",
                "scienceNote": "一棵大树能为数百种生物提供栖息地和食物，是整个生态系统的核心"
          }
    ],
    scienceCard: "世界上最大的树是加州的谢尔曼将军巨杉，高84米，树干周长31米，已经活了2200年！一棵大树每年能吸收22公斤的二氧化碳。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["ancient","keystone_species"],
  },

  {
    id: "sp_kraken",
    name: "SP·大王乌贼·深渊之王",
    nameEn: "SP: Giant Squid - Abyssal King",
    type: "sp",
    faction: "nature",
    subType: "marine",
    set: "BASE",
    spCost: 7,
    rarity: "SSR",
    atk: 15000,
    hp: 12000,
    factionRequirement: null,
    skills: [
          {
                "name": "深渊触手",
                "nameEn": "Abyssal Tentacles",
                "type": "unique",
                "timing": "onPlay",
                "description": "出场时对所有敌方卡造成 4000 伤害，并使其 ATK -2000 持续 2 回合",
                "scienceNote": "大王乌贼有10条触手，最长可达13米，能同时缠住多个猎物"
          }
    ],
    scienceCard: "大王乌贼是地球上最大的无脊椎动物，眼睛直径达27厘米——比篮球还大！它们生活在深海1000米处，直到2004年才第���次被活体拍摄到。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["cephalopod","deep_sea"],
  },

  {
    id: "sp_immune_overdrive",
    name: "SP·免疫风暴·全系统协同",
    nameEn: "SP: Immune Storm - Full System Sync",
    type: "sp",
    faction: "body",
    subType: "blood",
    set: "BASE",
    spCost: 8,
    rarity: "SSR",
    atk: 8000,
    hp: 20000,
    factionRequirement: null,
    skills: [
          {
                "name": "细胞因子风暴",
                "nameEn": "Cytokine Storm",
                "type": "unique",
                "timing": "onPlay",
                "description": "出场时全队 ATK +3000 且获得 2 回合免疫（不受负面状态影响）",
                "scienceNote": "免疫系统全面激活时释放大量细胞因子，所有免疫细胞同时行动"
          }
    ],
    scienceCard: "免疫风暴（细胞因子风暴）是免疫系统的'全力一击'——所有免疫细胞同时出动。虽然能消灭入侵者，但有时过于猛烈反而伤害自身。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["immune","adaptive_immunity"],
  },

  {
    id: "sp_bone_titan",
    name: "SP·骨骼巨人·钢铁之躯",
    nameEn: "SP: Bone Titan - Iron Body",
    type: "sp",
    faction: "body",
    subType: "structure",
    set: "BASE",
    spCost: 6,
    rarity: "SSR",
    atk: 10000,
    hp: 15000,
    factionRequirement: null,
    skills: [
          {
                "name": "钙化铠甲",
                "nameEn": "Calcified Armor",
                "type": "unique",
                "timing": "onPlay",
                "description": "守护 + 受到伤害减少 30%。被击杀时为主人添加 5000 护盾",
                "scienceNote": "骨��是活的组织，由钙质不断重建，是人体最坚硬的防御结构"
          }
    ],
    scienceCard: "人体有206块骨头！骨骼不是死的——它们一直在更新，每10年你的骨骼就完全换新一次。骨头比钢铁还结实，但重量只有钢铁的1/5。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "sp_zombie_plague",
    name: "SP·��尸瘟疫·末日病原",
    nameEn: "SP: Zombie Plague - Doomsday Pathogen",
    type: "sp",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    spCost: 9,
    rarity: "SSR",
    atk: 12000,
    hp: 18000,
    factionRequirement: null,
    skills: [
          {
                "name": "感染扩散",
                "nameEn": "Infection Spread",
                "type": "unique",
                "timing": "onPlay",
                "description": "出场时'感染'所有敌方卡：每回合损失当前 HP 的 15%，持续 3 回合",
                "scienceNote": "假想的终极病原体结合了高传播力和免疫逃逸能力"
          }
    ],
    scienceCard: "科学家最担心的'X疾病'——是一种还没出现的超级病原体。世卫组织专门列了一个'需要关注的病原体清单'。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["hypothetical","pandemic"],
  },

  {
    id: "sp_biofilm_fortress",
    name: "SP·生物膜·细菌堡垒",
    nameEn: "SP: Biofilm Fortress",
    type: "sp",
    faction: "pathogen",
    subType: "bacteria",
    set: "BASE",
    spCost: 6,
    rarity: "SSR",
    atk: 6000,
    hp: 22000,
    factionRequirement: null,
    skills: [
          {
                "name": "生物膜屏障",
                "nameEn": "Biofilm Shield",
                "type": "unique",
                "timing": "onPlay",
                "description": "守护 + 免疫科技系伤害。每回合为所有病原系友方卡恢复 1500 HP",
                "scienceNote": "生物膜是细菌的集体防御工事，抗生素几乎���法穿透"
          }
    ],
    scienceCard: "细菌不只是单打独斗！它们会聚在一起形成'生物膜'——一层黏糊糊的保护膜，让抗生素的效果降低1000倍��你牙齿上的牙菌斑就是生物膜！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["biofilm","community"],
  },

  {
    id: "sp_quantum_healer",
    name: "SP·量子医疗·未来之光",
    nameEn: "SP: Quantum Healer - Future Light",
    type: "sp",
    faction: "tech",
    subType: "genetech",
    set: "BASE",
    spCost: 10,
    rarity: "SSR",
    atk: 8000,
    hp: 22000,
    factionRequirement: null,
    skills: [
          {
                "name": "量子修复",
                "nameEn": "Quantum Repair",
                "type": "unique",
                "timing": "onPlay",
                "description": "出场时完全恢复己方主人的 HP 到满值，并复活所有己方已倒下的卡（HP 50%）",
                "scienceNote": "量子计算能在瞬间分析所有治疗方案，选择最优解"
          }
    ],
    scienceCard: "量子计算机能在1秒内完成普通电脑1万年才能完成的计算！科学家正在研究用量子计算来设计新药。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["quantum","future_tech"],
  },

  {
    id: "sp_vaccine_shield",
    name: "SP·全民免疫·疫苗之盾",
    nameEn: "SP: Herd Immunity Shield",
    type: "sp",
    faction: "tech",
    subType: "medicine",
    set: "BASE",
    spCost: 7,
    rarity: "SSR",
    atk: 5000,
    hp: 18000,
    factionRequirement: null,
    skills: [
          {
                "name": "群体免疫",
                "nameEn": "Herd Immunity",
                "type": "unique",
                "timing": "onPlay",
                "description": "出场时所有己��卡获得'免疫护盾'���每张卡可以抵消一次致死伤害（保留 1 HP）",
                "scienceNote": "当群体中足够多的人有免疫力时，病原体无法传播"
          }
    ],
    scienceCard: "群体免疫是疫��最伟大的成就！当95%以上的人接种了麻疹疫苗，剩下5%没接种的人也不会感染。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["vaccine","public_health"],
  },

];

export default spCards;
