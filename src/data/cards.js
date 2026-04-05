// Bio Heroes 生物英雄传 - 卡牌数据 v2
// Updated: 2026-03-16
// Total: 104 cards (40 original + 64 Sprint 18) (4 factions × 10 cards)
// 最小数值变动幅度: 500
// v2 变更: 新增 factionRequirement 字段（阵营标记需求）
// v3 变更: 新增 subType/set/tags 字段 + 胃酸改名为胃 + 噬菌体归virus

const cards = [

  // ============================================================
  // 🌱 自然系 (nature) - 10 张
  // ============================================================

  {
    id: "ant_soldier",
    name: "蚂蚁·微型战士",
    nameEn: "Ant: Micro Warrior",
    type: "character",
    faction: "nature",
    subType: "land",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 1500,
    hp: 1000,
    factionRequirement: null,
    skills: [
      {
        name: "信息素召集",
        nameEn: "Pheromone Rally",
        type: "unique",
        description: "出场时，如果手牌中有其他蚂蚁卡，可以免费召唤一张",
        scienceNote: "蚂蚁通过释放信息素建立化学通讯网络，能在几秒内召集大量同伴"
      }
    ],
    scienceCard: "一只蚂蚁能举起自身体重50倍的东西，相当于你举起一辆卡车！全世界蚂蚁的总重量和全人类差不多重。它们还会\"种地\"——切叶蚁会把树叶搬回家种蘑菇吃！",
    evolutionFrom: null,
    evolutionTo: "蚁群·百万军团",
    tags: ["insect", "social"],
  },

  {
    id: "mimosa_timid",
    name: "含羞草·胆小勇士",
    nameEn: "Mimosa: Timid Warrior",
    type: "character",
    faction: "nature",
    subType: "plant",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 1000,
    hp: 2500,
    factionRequirement: null,
    skills: [
      {
        name: "叶片闭合",
        nameEn: "Leaf Fold",
        type: "unique",
        description: "被攻击时，本次受到的伤害 -50%（每场限触发2次）",
        scienceNote: "含羞草叶片受到触碰时会迅速闭合下垂，这是由叶枕细胞失水引起的防御反应"
      }
    ],
    scienceCard: "含羞草一碰就会\"害羞\"地把叶子合起来！其实它不是害羞，而是在装死——让想吃它的虫子以为它枯萎了。更神奇的是，如果你反复碰它，它会\"学会\"不再合拢，好像知道你不是真正的危险！",
    evolutionFrom: null,
    evolutionTo: "捕蝇草·猎杀陷阱",
    tags: [],
  },

  {
    id: "bee_worker",
    name: "蜜蜂·勤劳酿造师",
    nameEn: "Bee: Diligent Brewer",
    type: "character",
    faction: "nature",
    subType: "land",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 2000,
    hp: 1500,
    factionRequirement: null,
    skills: [
      {
        name: "蜂毒尾刺",
        nameEn: "Venom Sting",
        type: "unique",
        description: "攻击时，对目标附加\"中毒\"：每回合损失 500 HP，持续1回合。自身受到 500 点伤害",
        scienceNote: "蜜蜂的蜂刺有倒钩，蜇人后刺和毒囊会留在对方体内持续释放毒素，但蜜蜂自己也会因内脏拉出而死亡"
      }
    ],
    scienceCard: "蜜蜂蜇人后自己也会死，所以它们只有在保护蜂巢时才会蜇人——这是用生命在战斗！一只蜜蜂一辈子只能酿一茶匙蜂蜜，但一个蜂群一年能酿30公斤。它们还会跳\"8字舞\"告诉同伴花在哪里！",
    evolutionFrom: null,
    evolutionTo: "蜂群·万刺风暴",
    tags: ["insect", "pollinator"],
  },

  {
    id: "jellyfish_stealth",
    name: "水母·透明刺客",
    nameEn: "Jellyfish: Transparent Assassin",
    type: "character",
    faction: "nature",
    subType: "marine",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 2000,
    hp: 3000,
    factionRequirement: null,
    skills: [
      {
        name: "触手毒刺",
        nameEn: "Tentacle Venom",
        type: "unique",
        description: "攻击时附加\"中毒\"效果：目标每回合损失 500 HP，持续2回合",
        scienceNote: "箱形水母的触手含有数十亿个刺细胞，接触猎物后会以700纳秒的速度射出毒针，是自然界最快的细胞反应之一"
      }
    ],
    scienceCard: "水母没有大脑、没有心脏、没有骨头，身体95%都是水！但有些水母的毒液超级厉害，箱形水母是世界上最毒的动物之一。还有一种叫\"灯塔水母\"的小家伙，能把自己变回婴儿重新长大，理论上可以永生！",
    evolutionFrom: null,
    evolutionTo: "箱形水母·致命蓝焰",
    tags: ["cnidarian", "venomous"],
  },

  {
    id: "sunflower_charger",
    name: "向日葵·阳光充能站",
    nameEn: "Sunflower: Solar Charger",
    type: "character",
    faction: "nature",
    subType: "plant",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 1000,
    hp: 4000,
    factionRequirement: null,
    skills: [
      {
        name: "光合补给",
        nameEn: "Photosynthesis Supply",
        type: "unique",
        description: "每回合开始时，为己方回复 1 点能量",
        scienceNote: "向日葵通过光合作用将阳光转化为化学能，是自然界最高效的能量转换者之一"
      }
    ],
    scienceCard: "向日葵幼苗会追着太阳转，早上朝东、傍晚朝西，但长大后就固定朝东了！一朵向日葵上其实有上千朵小花，排列方式符合斐波那契数列——大自然也懂数学！",
    evolutionFrom: null,
    evolutionTo: "世界树·生命之源",
    tags: [],
  },

  {
    id: "electric_eel_battery",
    name: "电鳗·活体电池",
    nameEn: "Electric Eel: Living Battery",
    type: "character",
    faction: "nature",
    subType: "marine",
    set: "BASE",
    cost: 2,
    rarity: "SR",
    atk: 3000,
    hp: 2000,
    factionRequirement: null,
    skills: [
      {
        name: "放电打击",
        nameEn: "Discharge Strike",
        type: "unique",
        description: "攻击后，对相邻一张敌方卡造成 1000 点伤害",
        scienceNote: "电鳗能释放高达860伏特的电击，足以击晕水中附近的多个猎物"
      }
    ],
    scienceCard: "电鳗其实不是鳗鱼，而是一种南美洲的裸背电鱼！它的身体80%都是发电器官，就像一节超级大电池。它在浑浊的亚马逊河里靠放电来探路和捕猎。",
    evolutionFrom: null,
    evolutionTo: "电鳗·雷霆之王",
    tags: ["fish", "electric"],
  },

  {
    id: "cheetah_sprinter",
    name: "猎豹·闪电猎手",
    nameEn: "Cheetah: Lightning Hunter",
    type: "character",
    faction: "nature",
    subType: "land",
    set: "BASE",
    cost: 3,
    rarity: "SR",
    atk: 5000,
    hp: 2000,
    factionRequirement: null,
    skills: [
      {
        name: "迅击",
        nameEn: "Swift Attack",
        type: "generic",
        description: "出场当回合可攻击（无召唤疲劳）",
        scienceNote: "猎豹是陆地最快动物，从静止到时速100公里只需3秒"
      },
      {
        name: "极速冲刺",
        nameEn: "Hyperspeed Dash",
        type: "unique",
        description: "首次攻击伤害 ×1.5，之后每回合 ATK -500（最低降至 2000）",
        scienceNote: "猎豹只能维持约30秒的高速奔跑，之后体温过高必须停下休息"
      }
    ],
    scienceCard: "猎豹是地球上跑得最快的动物，3秒就能加速到时速100公里，比大部分跑车还快！但它有个弱点：跑太快身体会过热，所以它必须在30秒内抓到猎物，否则就只能放弃。猎豹跑步时尾巴像方向盘一样帮它转弯！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["mammal", "predator"],
  },

  {
    id: "venus_flytrap",
    name: "捕蝇草·猎杀陷阱",
    nameEn: "Venus Flytrap: Kill Trap",
    type: "character",
    faction: "nature",
    subType: "plant",
    set: "BASE",
    cost: 3,
    rarity: "SR",
    atk: 3500,
    hp: 3000,
    factionRequirement: null,
    skills: [
      {
        name: "夹击陷阱",
        nameEn: "Snap Trap",
        type: "unique",
        description: "被攻击时反击：对攻击者造成等同自身ATK 50%的伤害",
        scienceNote: "捕蝇草的叶片在0.1秒内合拢，是植物界最快的运动之一，触发需要连续碰到两根感觉毛"
      }
    ],
    scienceCard: "捕蝇草是会\"吃肉\"的植物！它的叶子像一个长满牙齿的大嘴巴，虫子碰到里面的小毛毛两次，嘴巴就\"啪\"地合上，然后用消化液慢慢把虫子化掉。它会数数——碰一次不关，必须碰两次才触发！",
    evolutionFrom: "含羞草·胆小勇士",
    evolutionTo: null,
    tags: ["carnivorous"],
  },

  {
    id: "orca_alpha",
    name: "虎鲸·深海霸主",
    nameEn: "Orca: Apex of the Abyss",
    type: "character",
    faction: "nature",
    subType: "marine",
    set: "BASE",
    cost: 7,
    rarity: "SSR",
    atk: 8500,
    hp: 9500,
    factionRequirement: {
      faction: "nature",
      count: 2,
      type: "check",
      scienceNote: "顶级掠食者需要完整食物链支撑"
    },
    skills: [
      {
        name: "协同猎杀",
        nameEn: "Coordinated Hunt",
        type: "unique",
        description: "攻击时，场上每有一个其他自然系卡牌，本次攻击额外 +1500 ATK",
        scienceNote: "虎鲸家族成员协同围猎，使用旋转鱼饵球等复杂战术合作捕食"
      },
      {
        name: "破浪冲击",
        nameEn: "Wave Wash",
        type: "unique",
        description: "出场时，对对方 HP 最低的一张卡造成 3000 点伤害",
        scienceNote: "虎鲸会制造浪涌把浮冰上的海豹冲入水中，是罕见的工具性捕猎智慧"
      }
    ],
    scienceCard: "虎鲸其实是海豚科中体型最大的成员，不是鲸！它们的大脑非常发达，不同家族有自己独特的\"方言\"。虎鲸是母系社会，妈妈会带着孩子一辈子。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["mammal", "predator"],
  },

  {
    id: "blue_whale_titan",
    name: "蓝鲸·深海巨灵",
    nameEn: "Blue Whale: Abyssal Titan",
    type: "character",
    faction: "nature",
    subType: "marine",
    set: "BASE",
    cost: 8,
    rarity: "SSR",
    atk: 6000,
    hp: 12000,
    factionRequirement: {
      faction: "nature",
      count: 3,
      type: "check",
      scienceNote: "地球最大生物需要丰富的海洋生态系统支撑"
    },
    skills: [
      {
        name: "声纳震荡",
        nameEn: "Sonar Shockwave",
        type: "unique",
        description: "出场时对所有敌方卡牌造成 2000 点伤害",
        scienceNote: "蓝鲸的叫声可达188分贝，能传播上千公里"
      },
      {
        name: "守护",
        nameEn: "Guard",
        type: "generic",
        description: "在场时对手只能攻击该卡",
        scienceNote: "蓝鲸是地球上最大的动物，几乎没有天敌"
      }
    ],
    scienceCard: "蓝鲸是地球有史以来最大的动物——比最大的恐龙还大！它的心脏像一辆汽车那么大，舌头上能站50个人。蓝鲸宝宝刚出生就有7米长，每天喝400升奶，半年就能长到15米！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["mammal"],
  },

  // ============================================================
  // 🧬 人体系 (body) - 10 张
  // ============================================================

  {
    id: "platelet_guardian",
    name: "血小板·伤口小卫士",
    nameEn: "Platelet: Wound Guardian",
    type: "character",
    faction: "body",
    subType: "blood",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 500,
    hp: 3000,
    factionRequirement: null,
    skills: [
      {
        name: "凝血屏障",
        nameEn: "Clotting Shield",
        type: "unique",
        description: "出场时，给一张友方卡添加 1500 点护盾（优先消耗护盾再扣 HP）",
        scienceNote: "血小板在伤口处聚集形成血栓，配合纤维蛋白构建\"止血网\"，是人体受伤后第一道修复防线"
      }
    ],
    scienceCard: "血小板其实不是完整的细胞，而是骨髓里的巨核细胞碎裂出来的小碎片！虽然个头最小，但没有它们你流血就停不下来。它们会成群结队地冲到伤口，手拉手堵住破洞，就像一群小工人在修水管！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "red_blood_cell",
    name: "红细胞·氧气快递员",
    nameEn: "Red Blood Cell: Oxygen Courier",
    type: "character",
    faction: "body",
    subType: "blood",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 1000,
    hp: 2500,
    factionRequirement: null,
    skills: [
      {
        name: "氧气输送",
        nameEn: "Oxygen Delivery",
        type: "unique",
        description: "出场时，为一张友方卡回复 1000 HP",
        scienceNote: "红细胞通过血红蛋白携带氧气，每天在全身血管中循环约1500次"
      }
    ],
    scienceCard: "你的身体里有大约25万亿个红细胞！它们长得像中间凹下去的小圆饼，没有细胞核，这样就能装更多氧气。每秒钟你的骨髓会制造大约200万个新的红细胞。",
    evolutionFrom: null,
    evolutionTo: "血红蛋白·超级载体",
    tags: [],
  },

  {
    id: "stomach_acid",
    name: "胃·消化熔炉",
    nameEn: "Stomach: Digestive Furnace",
    type: "character",
    faction: "body",
    subType: "organ",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 3000,
    hp: 2000,
    factionRequirement: null,
    skills: [
      {
        name: "强酸腐蚀",
        nameEn: "Acid Corrosion",
        type: "unique",
        description: "对病原系卡牌伤害 +50%",
        scienceNote: "胃酸pH值约1.5-3.5，强度接近盐酸，能溶解大部分进入体内的细菌和病原体"
      }
    ],
    scienceCard: "你的胃里装着超级强酸，酸到可以溶解金属！那为什么胃不会把自己消化掉呢？因为胃壁有一层厚厚的黏液保护层，而且胃壁细胞每3-4天就全部更新一次，比你换衣服还勤快！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "white_blood_cell",
    name: "白细胞·免疫尖兵",
    nameEn: "White Blood Cell: Immune Vanguard",
    type: "character",
    faction: "body",
    subType: "blood",
    set: "BASE",
    cost: 2,
    rarity: "SR",
    atk: 3000,
    hp: 2000,
    factionRequirement: null,
    skills: [
      {
        name: "吞噬攻击",
        nameEn: "Phagocytosis",
        type: "unique",
        description: "击杀病原系卡牌时，ATK 永久 +500",
        scienceNote: "中性粒细胞能直接吞噬入侵的细菌，一个白细胞可以吃掉5-20个细菌"
      }
    ],
    scienceCard: "白细胞是你身体里的\"警察\"和\"士兵\"！当你受伤发炎、伤口变红变肿的时候，其实就是大量白细胞赶到现场在打仗。它们能穿过血管壁，跑到需要的地方去消灭坏蛋。",
    evolutionFrom: null,
    evolutionTo: "巨噬细胞·终极吞噬者",
    tags: ["immune"],
  },

  {
    id: "skin_barrier",
    name: "皮肤·第一道防线",
    nameEn: "Skin: First Line of Defense",
    type: "character",
    faction: "body",
    subType: "structure",
    set: "BASE",
    cost: 3,
    rarity: "R",
    atk: 1500,
    hp: 5000,
    factionRequirement: null,
    skills: [
      {
        name: "守护",
        nameEn: "Guard",
        type: "generic",
        description: "在场时对手只能攻击该卡",
        scienceNote: "皮肤是人体最大的器官，构成抵御外界病原体的第一道物理屏障"
      }
    ],
    scienceCard: "皮肤是你身体上最大的器官，展开面积有2平方米！它每天都在掉落死皮——你一辈子大约会掉40公斤的死皮。皮肤每27天就全部换新一次，所以你的皮肤永远都是\"新\"的！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "neuron_messenger",
    name: "神经元·闪电信使",
    nameEn: "Neuron: Lightning Messenger",
    type: "character",
    faction: "body",
    subType: "nerve",
    set: "BASE",
    cost: 3,
    rarity: "SR",
    atk: 4000,
    hp: 3500,
    factionRequirement: null,
    skills: [
      {
        name: "突触传递",
        nameEn: "Synaptic Relay",
        type: "unique",
        description: "攻击后，随机一张友方卡获得\"迅击\"效果（下回合可立即行动）",
        scienceNote: "神经元通过突触释放神经递质传递信号，信号传导速度可达每秒120米"
      }
    ],
    scienceCard: "你的大脑里有大约860亿个神经元，比银河系的星星还多！每个神经元可以和一万个其他神经元连接，它们之间传递消息的速度比眨眼还快。你现在能看懂这段话，就是因为亿万个神经元正在疯狂\"打电话\"！",
    evolutionFrom: null,
    evolutionTo: "大脑皮层·意识之海",
    tags: [],
  },

  {
    id: "antibody_missile",
    name: "抗体·精确制导弹",
    nameEn: "Antibody: Guided Missile",
    type: "character",
    faction: "body",
    subType: "blood",
    set: "BASE",
    cost: 3,
    rarity: "SR",
    atk: 4500,
    hp: 2000,
    factionRequirement: null,
    skills: [
      {
        name: "锁定标记",
        nameEn: "Target Lock",
        type: "unique",
        description: "出场时选定一张敌方卡牌，所有友方卡攻击该卡时伤害 +50%",
        scienceNote: "抗体与抗原精确结合，像给病原体贴上\"消灭我\"的标签，引导免疫细胞集中攻击"
      }
    ],
    scienceCard: "抗体就像你免疫系统的\"导弹\"！每种抗体只能对付一种敌人，形状刚好像钥匙配锁一样。你的身体能造出超过10亿种不同的抗体，几乎能对付任何入侵者。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["immune"],
  },

  {
    id: "lung_engine",
    name: "肺·呼吸引擎",
    nameEn: "Lung: Breathing Engine",
    type: "character",
    faction: "body",
    subType: "organ",
    set: "BASE",
    cost: 3,
    rarity: "SR",
    atk: 2000,
    hp: 5500,
    factionRequirement: null,
    skills: [
      {
        name: "深呼吸",
        nameEn: "Deep Breath",
        type: "unique",
        description: "每回合为所有友方人体系卡牌回复 500 HP",
        scienceNote: "肺部有约3亿个肺泡，展开总面积相当于一个网球场，每天交换约1万升空气"
      }
    ],
    scienceCard: "你的两个肺不一样大——左肺比右肺小一点，因为要给心脏留位置！肺里面有3亿个小气球叫\"肺泡\"，如果全部展开铺平，面积比一个网球场还大。你每天呼吸大约2万次！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "skeleton_frame",
    name: "骨骼·钢铁支架",
    nameEn: "Skeleton: Steel Frame",
    type: "character",
    faction: "body",
    subType: "structure",
    set: "BASE",
    cost: 4,
    rarity: "SR",
    atk: 1500,
    hp: 7000,
    factionRequirement: null,
    skills: [
      {
        name: "守护",
        nameEn: "Guard",
        type: "generic",
        description: "在场时对手只能攻击该卡",
        scienceNote: "骨骼系统保护内脏器官免受外部冲击"
      },
      {
        name: "骨髓造血",
        nameEn: "Marrow Hematopoiesis",
        type: "unique",
        description: "每回合结束时，召唤一张随机的1费人体系卡牌（红细胞或血小板）",
        scienceNote: "骨骼内部的红骨髓是造血干细胞的家，每天生产约2000亿个血液细胞"
      }
    ],
    scienceCard: "你出生时有300多块骨头，但长大后只剩206块，因为很多小骨头长着长着就合并了！骨头看起来硬邦邦的，但里面其实是活的——骨髓每天都在造血。人的大腿骨比同样粗细的钢筋还结实！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "heart_engine",
    name: "心脏·永动引擎",
    nameEn: "Heart: Perpetual Engine",
    type: "character",
    faction: "body",
    subType: "organ",
    set: "BASE",
    cost: 5,
    rarity: "SSR",
    atk: 3000,
    hp: 8000,
    factionRequirement: {
      faction: "body",
      count: 2,
      type: "check",
      scienceNote: "心脏需要其他器官和细胞协同才能发挥作用"
    },
    skills: [
      {
        name: "心跳脉冲",
        nameEn: "Heartbeat Pulse",
        type: "unique",
        description: "每回合为所有友方卡回复 1000 HP",
        scienceNote: "心脏平均每天跳动10万次，一生泵送约2亿升血液"
      },
      {
        name: "生命核心",
        nameEn: "Core of Life",
        type: "unique",
        description: "该卡被击杀时，所有友方人体系卡牌 ATK 和 HP -50%（失去心脏）",
        scienceNote: "心脏是人体唯一终生不休息的器官，一旦停止跳动则全身器官迅速衰竭"
      }
    ],
    scienceCard: "你的心脏从妈妈肚子里就开始跳了，到现在一秒都没停过！它每天跳10万次，一辈子能跳25亿次。心脏泵出的血液如果接成一条线，能绕地球两圈半！而且心脏有自己的\"发电站\"，就算脱离身体也能继续跳一小会儿。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  // ============================================================
  // 🦠 病原系 (pathogen) - 10 张
  // ============================================================

  {
    id: "flu_virus",
    name: "流感病毒·变异入侵者",
    nameEn: "Influenza: Mutation Invader",
    type: "character",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 2000,
    hp: 1500,
    factionRequirement: null,
    skills: [
      {
        name: "快速变异",
        nameEn: "Rapid Mutation",
        type: "unique",
        description: "每回合开始时，随机获得 +500 ATK 或 +500 HP",
        scienceNote: "流感病毒变异速度极快，表面蛋白不断改变，所以每年的流感疫苗都不一样"
      }
    ],
    scienceCard: "流感病毒特别\"狡猾\"，它的外壳蛋白质一直在变化，就像不断换衣服的小偷，让你的免疫系统认不出它。这就是为什么你打了流感疫苗，第二年可能还会感冒！",
    evolutionFrom: null,
    evolutionTo: "H5N1·超级毒株",
    tags: ["RNA_virus"],
  },

  {
    id: "cavity_bacteria",
    name: "蛀牙菌·甜蜜破坏王",
    nameEn: "Cavity Bacteria: Sweet Destroyer",
    type: "character",
    faction: "pathogen",
    subType: "bacteria",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 2000,
    hp: 1500,
    factionRequirement: null,
    skills: [
      {
        name: "酸蚀瓦解",
        nameEn: "Acid Erosion",
        type: "unique",
        description: "攻击人体系卡牌时，对方永久 -500 HP",
        scienceNote: "变异链球菌将食物中的糖转化为酸，持续侵蚀牙齿的珐琅质"
      }
    ],
    scienceCard: "蛀牙菌最爱吃糖！它们住在你的牙齿上，吃完糖后会\"吐酸水\"，把坚硬的牙齿慢慢溶化出洞来。所以吃完甜食一定要刷牙，不然就是在请蛀牙菌吃大餐！",
    evolutionFrom: null,
    evolutionTo: "牙周病菌·骨骼侵蚀者",
    tags: [],
  },

  {
    id: "rabies_virus",
    name: "狂犬病毒·神经入侵者",
    nameEn: "Rabies: Neural Invader",
    type: "character",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    cost: 2,
    rarity: "SR",
    atk: 3500,
    hp: 1500,
    factionRequirement: null,
    skills: [
      {
        name: "神经劫持",
        nameEn: "Neural Hijack",
        type: "unique",
        description: "击杀对方卡牌后，有50%概率控制对方下一张出场的卡为己方效力1回合",
        scienceNote: "狂犬病毒沿着外周神经逆向传播到大脑，感染后导致宿主攻击性增强，促进病毒通过咬伤传播"
      }
    ],
    scienceCard: "狂犬病毒会沿着神经\"爬\"到大脑，让被感染的动物变得暴躁爱咬人，这样病毒就能通过唾液传给下一个受害者。感染后如果不及时打疫苗，致死率几乎100%！好在现在有疫苗可以预防。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["RNA_virus", "zoonotic"],
  },

  {
    id: "ecoli_thug",
    name: "大肠杆菌·肠道暴徒",
    nameEn: "E. Coli: Gut Thug",
    type: "character",
    faction: "pathogen",
    subType: "bacteria",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 2500,
    hp: 2000,
    factionRequirement: null,
    skills: [
      {
        name: "疯狂分裂",
        nameEn: "Rapid Fission",
        type: "unique",
        description: "每回合结束时有50%概率召唤一张 1000/500 的\"大肠杆菌·分裂体\"",
        scienceNote: "大肠杆菌在适宜条件下每20分钟分裂一次，8小时后可繁殖到1700万个"
      }
    ],
    scienceCard: "大肠杆菌其实大部分是好的！你的肠子里住着几万亿个，帮你消化食物和制造维生素K。但有少数坏的品种跑到不该去的地方就会让你拉肚子。一个细菌20分钟就能变成两个，一天就能变出几十亿个！",
    evolutionFrom: null,
    evolutionTo: "超级细菌·耐药终结者",
    tags: [],
  },

  {
    id: "tapeworm_lurker",
    name: "绦虫·寄生潜伏者",
    nameEn: "Tapeworm: Parasitic Lurker",
    type: "character",
    faction: "pathogen",
    subType: "parasite",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 2000,
    hp: 3000,
    factionRequirement: null,
    skills: [
      {
        name: "吸取养分",
        nameEn: "Nutrient Drain",
        type: "unique",
        description: "每回合从对方主人处偷取 500 生命值加到自身HP上",
        scienceNote: "绦虫寄生在宿主肠道内，完全通过体表吸收宿主已消化的营养"
      }
    ],
    scienceCard: "绦虫是世界上最长的寄生虫，最长能到20米——比一辆公交车还长！它没有嘴巴也没有胃，全靠身体表面\"偷吃\"你已经消化好的食物。它的头上有钩子和吸盘，牢牢勾住你的肠壁，很难弄掉。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["flatworm"],
  },

  {
    id: "bacteriophage_killer",
    name: "噬菌体·细菌杀手",
    nameEn: "Bacteriophage: Bacteria Killer",
    type: "character",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    cost: 3,
    rarity: "SR",
    atk: 4500,
    hp: 2500,
    factionRequirement: null,
    skills: [
      {
        name: "注入劫持",
        nameEn: "Injection Hijack",
        type: "unique",
        description: "击杀对方卡牌时，召唤一张 1000/1000 的\"噬菌体副本\"",
        scienceNote: "噬菌体侵入细菌后劫持其复制机器大量复制自己，一个细菌可以释放出200个新噬菌体"
      }
    ],
    scienceCard: "噬菌体是专门吃细菌的病毒！它长得像一个登月飞船，有头部、尾巴和脚。它会把脚插进细菌身体里，把自己的基因注射进去，然后细菌就变成了噬菌体工厂，最后\"砰\"一声炸开，放出几百个新的噬菌体宝宝！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["bacteriophage"],
  },

  {
    id: "plasmodium_parasite",
    name: "疟原虫·热血寄生王",
    nameEn: "Plasmodium: Blood Parasite King",
    type: "character",
    faction: "pathogen",
    subType: "parasite",
    set: "BASE",
    cost: 3,
    rarity: "SR",
    atk: 4000,
    hp: 3500,
    factionRequirement: null,
    skills: [
      {
        name: "寄生入侵",
        nameEn: "Parasitic Invasion",
        type: "unique",
        description: "击杀人体系卡牌时，回复自身全部 HP",
        scienceNote: "疟原虫入侵红细胞后大量繁殖，吃光营养后破壁而出再入侵新的红细胞"
      }
    ],
    scienceCard: "疟原虫是通过蚊子叮咬传播的小寄生虫，它会钻进你的红细胞里\"安家\"，吃掉红细胞的营养，然后像小炸弹一样让红细胞爆炸，跑出来再入侵新的红细胞。疟疾在人类历史上杀死的人比任何战争都多！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["protist"],
  },

  {
    id: "botulinum_chef",
    name: "肉毒杆菌·致命厨师",
    nameEn: "Botulinum: Deadly Chef",
    type: "character",
    faction: "pathogen",
    subType: "bacteria",
    set: "BASE",
    cost: 3,
    rarity: "SR",
    atk: 5500,
    hp: 2000,
    factionRequirement: null,
    skills: [
      {
        name: "神经毒素",
        nameEn: "Neurotoxin",
        type: "unique",
        description: "攻击后，目标下回合无法攻击（麻痹1回合）",
        scienceNote: "肉毒毒素是已知最强的生物毒素，通过阻断神经信号导致肌肉麻痹"
      }
    ],
    scienceCard: "肉毒杆菌产生的毒素是世界上最毒的东西——比眼镜蛇毒强一百万倍！但科学家把它变成了美容神器——肉毒素（Botox）注射可以消除皱纹。同一种东西，用多了是毒药，用少了是药物！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["toxin"],
  },

  {
    id: "hiv_hunter",
    name: "艾滋病毒·免疫猎手",
    nameEn: "HIV: Immune Hunter",
    type: "character",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    cost: 4,
    rarity: "SSR",
    atk: 5000,
    hp: 4000,
    factionRequirement: {
      faction: "body",
      count: 1,
      type: "consume",
      scienceNote: "HIV需要劫持辅助T细胞才能复制，消灭一个人体细胞"
    },
    skills: [
      {
        name: "免疫瓦解",
        nameEn: "Immune Collapse",
        type: "unique",
        description: "在场时，对方人体系卡牌 ATK 和 HP 各 -20%",
        scienceNote: "HIV攻击辅助T细胞，逐步摧毁免疫系统"
      },
      {
        name: "逆转录潜伏",
        nameEn: "Retroviral Latency",
        type: "unique",
        description: "被击杀时，50%概率以 2000/1500 的状态复活一次",
        scienceNote: "HIV的逆转录酶将RNA转为DNA整合进宿主基因组，极难被彻底清除"
      }
    ],
    scienceCard: "艾滋病毒专门攻击保护你的白细胞——就像小偷专门打警察！它会把自己的基因偷偷塞进白细胞的DNA里，藏起来很久都发现不了。现在虽然还没有疫苗能完全消灭它，但药物已经能让感染者像健康人一样生活。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["retrovirus"],
  },

  {
    id: "covid_invader",
    name: "新冠病毒·全球入侵者",
    nameEn: "COVID-19: Global Invader",
    type: "character",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    cost: 5,
    rarity: "SSR",
    atk: 4000,
    hp: 5000,
    factionRequirement: {
      faction: "body",
      count: 2,
      type: "consume",
      scienceNote: "SARS-CoV-2需要劫持大量宿主细胞来复制和传播"
    },
    skills: [
      {
        name: "刺突蛋白",
        nameEn: "Spike Protein",
        type: "unique",
        description: "攻击人体系卡牌时，无视护盾直接扣HP",
        scienceNote: "SARS-CoV-2通过刺突蛋白与人体ACE2受体结合入侵细胞"
      },
      {
        name: "超级传播",
        nameEn: "Super Spread",
        type: "unique",
        description: "击杀对方卡牌时，对相邻两张卡各造成 1500 伤害",
        scienceNote: "新冠病毒传播力极强，单个感染者平均传染3-5人"
      }
    ],
    scienceCard: "新冠病毒表面有很多像皇冠一样的凸起，所以叫\"冠状病毒\"。它用这些凸起当\"钥匙\"，打开人体细胞的\"门锁\"钻进去。科学家用创纪录的速度研制出了mRNA疫苗来对付它。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["RNA_virus", "coronavirus"],
  },

  // ============================================================
  // ⚗️ 科技系 (tech) - 10 张
  // ============================================================

  {
    id: "bandaid_helper",
    name: "创可贴·急救小帮手",
    nameEn: "Band-Aid: First Aid Helper",
    type: "character",
    faction: "tech",
    subType: "equipment",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 500,
    hp: 3000,
    factionRequirement: null,
    skills: [
      {
        name: "紧急包扎",
        nameEn: "Emergency Bandage",
        type: "unique",
        description: "出场时，为一张友方卡回复 1500 HP 并获得\"守护\"效果1回合",
        scienceNote: "创可贴通过隔绝外界细菌、保持伤口湿润来加速愈合"
      }
    ],
    scienceCard: "创可贴是1920年厄尔·迪克森发明的，因为他太太总是在厨房切菜切到手！他把纱布粘在胶带上，这样她一个人也能贴。后来强生公司把它变成了全世界最常见的急救用品。",
    evolutionFrom: null,
    evolutionTo: "青霉素·抗菌先驱",
    tags: [],
  },

  {
    id: "thermometer_alarm",
    name: "体温计·发烧警报器",
    nameEn: "Thermometer: Fever Alarm",
    type: "character",
    faction: "tech",
    subType: "diagnostic",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 500,
    hp: 3000,
    factionRequirement: null,
    skills: [
      {
        name: "体温监测",
        nameEn: "Temperature Monitor",
        type: "unique",
        description: "出场时，揭示对方手牌中费用最高的一张卡",
        scienceNote: "体温计检测体温变化来发现感染迹象，发烧是免疫系统激活的信号"
      }
    ],
    scienceCard: "最早的体温计是伽利略发明的，有一米多长！你发烧时体温升高，其实是身体在\"开暖气\"对抗病菌——因为大部分细菌在高温下会变弱。所以适度发烧是你的免疫系统在努力工作！",
    evolutionFrom: null,
    evolutionTo: "MRI·全身透视仪",
    tags: [],
  },

  {
    id: "stethoscope_listener",
    name: "听诊器·心声聆听者",
    nameEn: "Stethoscope: Heart Listener",
    type: "character",
    faction: "tech",
    subType: "diagnostic",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 500,
    hp: 3000,
    factionRequirement: null,
    skills: [
      {
        name: "诊断分析",
        nameEn: "Diagnostic Analysis",
        type: "unique",
        description: "出场时，揭示对方一张手牌，并为一张友方人体系卡牌回复 1000 HP",
        scienceNote: "听诊器由法国医生雷奈克在1816年发明，通过放大体内声音来诊断心肺疾病"
      }
    ],
    scienceCard: "听诊器是因为一个尴尬的故事发明的！医生雷奈克需要听一位女病人的心跳，但直接把耳朵贴上去太不礼貌了，于是他卷了一筒纸当\"传声筒\"，发现效果特别好！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "xray_vision",
    name: "X光·骨骼透视眼",
    nameEn: "X-Ray: Bone Vision",
    type: "character",
    faction: "tech",
    subType: "diagnostic",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 1500,
    hp: 3500,
    factionRequirement: null,
    skills: [
      {
        name: "透视扫描",
        nameEn: "Penetrating Scan",
        type: "unique",
        description: "出场时，揭示对方所有手牌，且本回合友方卡攻击时伤害 +20%",
        scienceNote: "X射线能穿透软组织但被骨骼阻挡，让医生\"看穿\"身体内部"
      }
    ],
    scienceCard: "X光也是意外发现的！1895年伦琴发现了一种神秘射线，他用X光拍了太太的手，能清楚看到骨头和戒指。伦琴因此获得了第一届诺贝尔物理学奖。",
    evolutionFrom: "体温计·发烧警报器",
    evolutionTo: null,
    tags: [],
  },

  {
    id: "microscope_eye",
    name: "显微镜·微观之眼",
    nameEn: "Microscope: Micro Eye",
    type: "character",
    faction: "tech",
    subType: "diagnostic",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 1000,
    hp: 4500,
    factionRequirement: null,
    skills: [
      {
        name: "微观洞察",
        nameEn: "Micro Insight",
        type: "unique",
        description: "出场时，揭示对方全部手牌，并让己方下一张出场的卡牌费用 -1",
        scienceNote: "显微镜让人类第一次看到了微生物的世界，列文虎克用自制显微镜发现了细菌"
      }
    ],
    scienceCard: "第一个用显微镜看到细菌的人叫列文虎克，他是一个荷兰的布料商人！他自己磨镜片做了几百台显微镜，发现水滴里竟然住着无数\"小动物\"。没有显微镜，我们根本不知道世界上还有细菌和病毒！",
    evolutionFrom: null,
    evolutionTo: "电子显微镜·纳米之眼",
    tags: [],
  },

  {
    id: "anesthesia_fog",
    name: "麻醉剂·沉睡之雾",
    nameEn: "Anesthesia: Sleep Fog",
    type: "character",
    faction: "tech",
    subType: "medicine",
    set: "BASE",
    cost: 2,
    rarity: "SR",
    atk: 2000,
    hp: 3500,
    factionRequirement: null,
    skills: [
      {
        name: "全身麻醉",
        nameEn: "General Anesthesia",
        type: "unique",
        description: "出场时，使对方一张卡牌\"沉睡\"2回合（无法攻击和使用技能）",
        scienceNote: "全身麻醉药通过抑制中枢神经系统让患者失去意识和痛觉"
      }
    ],
    scienceCard: "在麻醉药发明之前，做手术就像酷刑！1846年一个牙医用乙醚让病人睡着后拔了牙，全场震惊——从此手术再也不用\"硬扛\"了。到今天科学家还没完全搞清楚麻醉药为什么能让人失去意识！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "penicillin_pioneer",
    name: "青霉素·抗菌先驱",
    nameEn: "Penicillin: Antibacterial Pioneer",
    type: "character",
    faction: "tech",
    subType: "medicine",
    set: "BASE",
    cost: 3,
    rarity: "SR",
    atk: 4000,
    hp: 3500,
    factionRequirement: null,
    skills: [
      {
        name: "抗菌光环",
        nameEn: "Antibacterial Aura",
        type: "unique",
        description: "在场时，所有友方卡受到病原系卡牌的伤害 -30%",
        scienceNote: "青霉素通过破坏细菌的细胞壁来杀灭细菌，是人类第一种广泛使用的抗生素"
      }
    ],
    scienceCard: "青霉素是弗莱明在1928年\"不小心\"发现的！他度假回来发现实验皿上长了一块霉菌，霉菌周围的细菌全死了。这个\"偷懒\"的发现后来拯救了几亿人的生命！",
    evolutionFrom: "创可贴·急救小帮手",
    evolutionTo: "抗生素注射器·终极武器",
    tags: ["antibiotic"],
  },

  {
    id: "vaccine_trainer",
    name: "疫苗·免疫训练营",
    nameEn: "Vaccine: Immune Training Camp",
    type: "character",
    faction: "tech",
    subType: "medicine",
    set: "BASE",
    cost: 4,
    rarity: "SR",
    atk: 2500,
    hp: 6500,
    factionRequirement: null,
    skills: [
      {
        name: "免疫记忆",
        nameEn: "Immune Memory",
        type: "unique",
        description: "在场时，所有友方人体系卡牌获得\"被击杀后以50% HP复活一次\"效果",
        scienceNote: "疫苗训练免疫系统产生记忆细胞，下次遇到病原体时能快速响应"
      }
    ],
    scienceCard: "疫苗就像给你的免疫系统请了一个\"陪练\"！它把弱化的病菌送进你身体，让白细胞练习打仗。天花曾经杀死了几亿人，但因为疫苗，它成了人类消灭的第一种传染病！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["preventive"],
  },

  {
    id: "scalpel_blade",
    name: "手术刀·精准之刃",
    nameEn: "Scalpel: Precision Blade",
    type: "character",
    faction: "tech",
    subType: "equipment",
    set: "BASE",
    cost: 4,
    rarity: "SR",
    atk: 5500,
    hp: 3000,
    factionRequirement: null,
    skills: [
      {
        name: "精准切除",
        nameEn: "Precision Excision",
        type: "unique",
        description: "可以选择攻击对方任意一张卡（无视守护）",
        scienceNote: "现代手术刀配合无菌技术，能精准切除病变组织"
      },
      {
        name: "无菌操作",
        nameEn: "Sterile Procedure",
        type: "unique",
        description: "攻击病原系卡牌时伤害 +50%",
        scienceNote: "李斯特发明无菌手术后，手术致死率从近50%降到不足1%"
      }
    ],
    scienceCard: "古代的\"手术\"超级可怕，没有麻药也没有消毒！最快的医生能在28秒内截掉一条腿。直到李斯特医生发明了无菌手术，手术才变得安全。现在最厉害的手术刀是激光刀，切口比头发丝还细！",
    evolutionFrom: null,
    evolutionTo: "达芬奇机器人·全自动手术台",
    tags: [],
  },

  {
    id: "antibiotic_ultimate",
    name: "抗生素注射器·终极武器",
    nameEn: "Antibiotic Syringe: Ultimate Weapon",
    type: "character",
    faction: "tech",
    subType: "medicine",
    set: "BASE",
    cost: 5,
    rarity: "SSR",
    atk: 6000,
    hp: 5000,
    factionRequirement: {
      faction: "pathogen",
      count: 2,
      type: "consume",
      scienceNote: "抗生素的使命就是消灭病原体，需要有目标才能发挥作用"
    },
    skills: [
      {
        name: "广谱歼灭",
        nameEn: "Broad Spectrum Annihilation",
        type: "unique",
        description: "对病原系卡牌伤害 ×2",
        scienceNote: "广谱抗生素能杀灭多种细菌"
      },
      {
        name: "耐药危机",
        nameEn: "Resistance Crisis",
        type: "unique",
        description: "每使用一回合，自身 ATK -1000（最低 2000）（代表耐药性上升）",
        scienceNote: "过度使用抗生素导致耐药菌出现，是21世纪最严峻的公共卫生危机之一"
      }
    ],
    scienceCard: "抗生素曾经是人类最强大的武器——一针下去细菌全军覆没！但因为太多人乱用抗生素，有些细菌\"学会了\"抵抗，变成了\"超级细菌\"。所以医生总是说\"不要随便吃抗生素\"，就是为了不让细菌变得更强！",
    evolutionFrom: "青霉素·抗菌先驱",
    evolutionTo: null,
    tags: ["antibiotic"],
  },

  // ============================================================
  // 🌱 自然系新卡 (Sprint 18) - 16 张
  // ============================================================

  {
    id: "moss_pioneer",
    name: "苔藓·绿色先锋",
    nameEn: "Moss: Green Pioneer",
    type: "character",
    faction: "nature",
    subType: "plant",
    set: "BASE",
    cost: 0,
    rarity: "R",
    atk: 500,
    hp: 1000,
    factionRequirement: null,
    skills: [
          {
                "name": "孢子散播",
                "nameEn": "Spore Spread",
                "type": "unique",
                "description": "死亡时为己方主人恢复 500 HP",
                "scienceNote": "苔藓通过孢子繁殖，死后释放孢子继续传播生命"
          }
    ],
    scienceCard: "苔藓是最早登上陆地的植物之一，已经存在了4亿多年！它们没有根，通过全身吸收水分，是生态系统的拓荒者。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["bryophyte"],
  },

  {
    id: "amoeba_shapeshifter",
    name: "变形虫·千面伪装者",
    nameEn: "Amoeba: Shapeshifter",
    type: "character",
    faction: "nature",
    subType: "micro",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 1500,
    hp: 1500,
    factionRequirement: null,
    skills: [
          {
                "name": "伪足变形",
                "nameEn": "Pseudopod Morph",
                "type": "unique",
                "description": "受到攻击时，30% 概率闪避",
                "scienceNote": "变形虫通过伸出伪足不断改变形状，让捕食者难以捕捉"
          }
    ],
    scienceCard: "变形虫没有固定形状，靠伸出'伪足'来移动和捕食。它把食物整个包裹住再消化，就像一个会变形的小气球！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["protist","unicellular"],
  },

  {
    id: "spider_trapper",
    name: "蜘蛛·织网猎手",
    nameEn: "Spider: Web Trapper",
    type: "character",
    faction: "nature",
    subType: "land",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 2000,
    hp: 1500,
    factionRequirement: null,
    skills: [
          {
                "name": "蛛丝陷阱",
                "nameEn": "Silk Trap",
                "type": "unique",
                "description": "攻击后使目标下回合 ATK -500",
                "scienceNote": "蜘蛛丝的强度是同等粗细钢丝的5倍，猎物一旦粘上就很难挣脱"
          }
    ],
    scienceCard: "蜘蛛不是昆虫！它们有8条腿，属于蛛形纲。蜘蛛丝比同粗细的钢丝还结实，科学家正在研究用蜘蛛丝做防弹衣呢！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["arachnid"],
  },

  {
    id: "firefly_signal",
    name: "萤火虫·暗夜信号",
    nameEn: "Firefly: Night Signal",
    type: "character",
    faction: "nature",
    subType: "aerial",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 1000,
    hp: 2000,
    factionRequirement: null,
    skills: [
          {
                "name": "生物发光",
                "nameEn": "Bioluminescence",
                "type": "unique",
                "description": "出场时揭示对手一张手牌信息",
                "scienceNote": "萤火虫通过腹部的发光器官产生冷光，用于求偶和警告天敌"
          }
    ],
    scienceCard: "萤火虫的光是'冷光'，几乎不产生热量，效率高达95%！而电灯泡只有10%的能量变成光，其余都变成了热。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["insect","bioluminescent"],
  },

  {
    id: "sea_turtle_navigator",
    name: "海龟·古老航海家",
    nameEn: "Sea Turtle: Ancient Navigator",
    type: "character",
    faction: "nature",
    subType: "marine",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 1500,
    hp: 3500,
    factionRequirement: null,
    skills: [
          {
                "name": "龟甲防御",
                "nameEn": "Shell Defense",
                "type": "generic",
                "description": "守护：在场时对手只能攻击该卡",
                "scienceNote": "海龟的壳由60多块骨头组成，是天然的防御盔甲"
          }
    ],
    scienceCard: "海龟能活100多年，每年游数千公里回到出生的海滩产卵。它们靠地球磁场导航，从不迷路！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["reptile","endangered"],
  },

  {
    id: "cactus_guard",
    name: "仙人掌·沙漠守卫",
    nameEn: "Cactus: Desert Guard",
    type: "character",
    faction: "nature",
    subType: "plant",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 1000,
    hp: 4000,
    factionRequirement: null,
    skills: [
          {
                "name": "针刺反击",
                "nameEn": "Thorn Counter",
                "type": "unique",
                "description": "被攻击时对攻击者造成 500 伤害",
                "scienceNote": "仙人掌的刺其实是叶子变的，既能防止动物啃食，又能减少水分蒸发"
          }
    ],
    scienceCard: "仙人掌能在沙漠里活几百年！它的茎能储存大量水分，有的大仙人掌里存了上吨的水。它的刺其实是变形的叶子。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["succulent"],
  },

  {
    id: "rafflesia_stink",
    name: "大花草·恶臭之花",
    nameEn: "Rafflesia: Stink Bloom",
    type: "character",
    faction: "nature",
    subType: "plant",
    set: "BASE",
    cost: 3,
    rarity: "R",
    atk: 2500,
    hp: 4000,
    factionRequirement: null,
    skills: [
          {
                "name": "恶臭弥漫",
                "nameEn": "Foul Stench",
                "type": "unique",
                "description": "出场时使所有敌方卡 ATK -500，持续 1 回合",
                "scienceNote": "大花草散发腐肉般的恶臭吸引苍蝇来传粉，方圆几百米都能闻到"
          }
    ],
    scienceCard: "大王花是世界上最大的花，直径可达1米，重达10公斤！但它闻起来像腐烂的肉，因为它靠臭味吸引苍蝇来帮它传粉。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["parasitic_plant"],
  },

  {
    id: "chameleon_stealth",
    name: "变色龙·隐匿大师",
    nameEn: "Chameleon: Stealth Master",
    type: "character",
    faction: "nature",
    subType: "land",
    set: "BASE",
    cost: 3,
    rarity: "R",
    atk: 3500,
    hp: 3500,
    factionRequirement: null,
    skills: [
          {
                "name": "色彩伪装",
                "nameEn": "Color Camouflage",
                "type": "unique",
                "description": "出场后第 1 回合不可被选为攻击目标",
                "scienceNote": "变色龙通过控制皮肤中的纳米晶体改变颜色，用于伪装和交流"
          }
    ],
    scienceCard: "变色龙变色不只是为了隐藏！它们还用颜色表达心情——生气变深色，开心变浅色。它的眼睛能各自独立转动360度！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["reptile"],
  },

  {
    id: "shark_hunter",
    name: "鲨鱼·深海追踪者",
    nameEn: "Shark: Deep Sea Tracker",
    type: "character",
    faction: "nature",
    subType: "marine",
    set: "BASE",
    cost: 4,
    rarity: "R",
    atk: 5500,
    hp: 4000,
    factionRequirement: null,
    skills: [
          {
                "name": "电感猎杀",
                "nameEn": "Electroreception Hunt",
                "type": "unique",
                "description": "攻击 HP 低于 50% 的目标时，ATK +2000",
                "scienceNote": "鲨鱼能感应其他生物肌肉运动产生的微弱电场，受伤猎物无处可逃"
          }
    ],
    scienceCard: "鲨鱼鼻子上有特殊的电感受器，能探测到百万分之一伏特的电场！受伤的鱼会产生更强的电信号，所以鲨鱼总能找到最弱的猎物。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["cartilaginous_fish","predator"],
  },

  {
    id: "octopus_genius",
    name: "章鱼·九脑智者",
    nameEn: "Octopus: Nine-Brain Genius",
    type: "character",
    faction: "nature",
    subType: "marine",
    set: "BASE",
    cost: 3,
    rarity: "SR",
    atk: 3000,
    hp: 4000,
    factionRequirement: null,
    skills: [
          {
                "name": "墨汁逃生",
                "nameEn": "Ink Escape",
                "type": "unique",
                "description": "首次被击杀时，50% 概率复活并恢复 2000 HP（触发一次）",
                "scienceNote": "章鱼有三颗心脏、九个大脑（1个中央+8个手臂各1个），喷墨后能瞬间逃脱"
          }
    ],
    scienceCard: "章鱼有3颗心脏和9个大脑！每只触手都有自己的'小脑'可以独立思考。它们还会用椰子壳当盔甲，是无脊椎动物里最聪明的！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["cephalopod","invertebrate"],
  },

  {
    id: "owl_night_hunter",
    name: "猫头鹰·暗夜猎手",
    nameEn: "Owl: Night Hunter",
    type: "character",
    faction: "nature",
    subType: "aerial",
    set: "BASE",
    cost: 4,
    rarity: "SR",
    atk: 5000,
    hp: 4500,
    factionRequirement: null,
    skills: [
          {
                "name": "无声俯冲",
                "nameEn": "Silent Dive",
                "type": "unique",
                "description": "迅击：出场当回合可攻击。首次攻击为暴击（伤害 ×1.5）",
                "scienceNote": "猫头鹰翅膀边缘有特殊锯齿结构，飞行时几乎无声，猎物完全听不到"
          }
    ],
    scienceCard: "猫头鹰的听力超级强——它们的两只耳朵一高一低，能精确定位声音来源。在完全黑暗中也能抓住老鼠！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["bird","raptor","nocturnal"],
  },

  {
    id: "mantis_shrimp_punch",
    name: "螳螂虾·超音速拳",
    nameEn: "Mantis Shrimp: Sonic Punch",
    type: "character",
    faction: "nature",
    subType: "marine",
    set: "BASE",
    cost: 5,
    rarity: "SR",
    atk: 8000,
    hp: 4000,
    factionRequirement: null,
    skills: [
          {
                "name": "音爆冲拳",
                "nameEn": "Cavitation Punch",
                "type": "unique",
                "description": "攻击时额外对目标相邻的一张卡造成 2000 伤害",
                "scienceNote": "螳螂虾的拳速度达到子弹的速度，击打时产生的冲击波能击晕周围的鱼"
          }
    ],
    scienceCard: "螳螂虾拥有动物界最强的一拳！出拳速度达到80公里/小时，产生的冲击波能让水瞬间沸腾。它的眼睛还能看到16种颜色（人类只能看3种）！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["crustacean"],
  },

  {
    id: "elephant_elder",
    name: "大象·记忆长者",
    nameEn: "Elephant: Memory Elder",
    type: "character",
    faction: "nature",
    subType: "land",
    set: "BASE",
    cost: 6,
    rarity: "SR",
    atk: 5500,
    hp: 10000,
    factionRequirement: {"faction":"nature","count":1,"type":"check","scienceNote":"大象是群居动物，需要族群支持才能发挥领导力"},
    skills: [
          {
                "name": "长者记忆",
                "nameEn": "Elder Memory",
                "type": "unique",
                "description": "出场时从弃牌堆随机取回一张自然系卡到手牌",
                "scienceNote": "大象的记忆力极强，年长母象能记住几十年前的水源位置，带领族群度过旱季"
          }
    ],
    scienceCard: "大象是地球上最大的陆地动物，一头成年非洲象重达6吨！象群由最年长的母象领导，她能记住几百公里内所有水源的位置。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["mammal","endangered"],
  },

  {
    id: "ant_queen_colony",
    name: "蚁后·殖民女王",
    nameEn: "Ant Queen: Colony Ruler",
    type: "character",
    faction: "nature",
    subType: "land",
    set: "BASE",
    cost: 7,
    rarity: "SSR",
    atk: 6000,
    hp: 12000,
    factionRequirement: {"faction":"nature","count":2,"type":"check","scienceNote":"蚁后需要足够的工蚁支持才能建立殖民地"},
    skills: [
          {
                "name": "蚁群召唤",
                "nameEn": "Colony Summon",
                "type": "unique",
                "description": "每回合开始时，召唤一只蚂蚁·微型战士到随机空位（如果场上有空位）",
                "scienceNote": "一只蚁后一天可以产下上千颗卵，通过信息素指挥整个蚁群"
          }
    ],
    scienceCard: "蚁后是蚁群的核心，有的蚁后能活30年！一个成熟蚁巢可能有上百万只蚂蚁，它们通过化学信号协同工作，就像一个超级有机体。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["insect","social","eusocial"],
  },

  {
    id: "paramecium_swarm",
    name: "草履虫·微观军团",
    nameEn: "Paramecium: Micro Swarm",
    type: "character",
    faction: "nature",
    subType: "micro",
    set: "BASE",
    cost: 5,
    rarity: "SSR",
    atk: 4000,
    hp: 6500,
    factionRequirement: {"faction":"nature","count":2,"type":"consume","scienceNote":"草履虫通过分裂繁殖，需要消耗大量有机物质作为营养"},
    skills: [
          {
                "name": "二分裂",
                "nameEn": "Binary Fission",
                "type": "unique",
                "description": "被击杀时，分裂为两只 ATK 2000 / HP 3000 的草履虫分身",
                "scienceNote": "草履虫通过二分裂无性繁殖，一个变两个，条件好时几小时就能翻倍"
          }
    ],
    scienceCard: "草履虫是最常见的单细胞生物，形状像一只鞋子（'草履'就是草鞋的意思）。它靠身上的纤毛游泳，每秒能游动自己身长的10倍！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["protist","ciliate","unicellular"],
  },

  {
    id: "whale_shark_wall",
    name: "鲸鲨·深海巨墙",
    nameEn: "Whale Shark: Ocean Wall",
    type: "character",
    faction: "nature",
    subType: "marine",
    set: "BASE",
    cost: 8,
    rarity: "SSR",
    atk: 5000,
    hp: 20000,
    factionRequirement: {"faction":"nature","count":3,"type":"check","scienceNote":"鲸鲨需要丰富的海洋生态系统支撑（浮游生物食物链）"},
    skills: [
          {
                "name": "滤食守护",
                "nameEn": "Filter-Feed Guard",
                "type": "unique",
                "description": "守护 + 每回合自动恢复 1500 HP",
                "scienceNote": "鲸鲨是世界最大的鱼类，通过滤食浮游生物获取源源不断的能量"
          }
    ],
    scienceCard: "鲸鲨是世界上最大的鱼，体长可达12米！虽然体型巨大，但它们性格温和，只吃浮游生物。每只鲸鲨身上的斑点图案都是独一无二的，就像人类的指纹。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["cartilaginous_fish","endangered","filter_feeder"],
  },

  // ============================================================
  // 🧬 人体系新卡 (Sprint 18) - 16 张
  // ============================================================

  {
    id: "tear_drop_lysozyme",
    name: "泪滴·溶菌先锋",
    nameEn: "Tear Drop: Lysozyme Scout",
    type: "character",
    faction: "body",
    subType: "blood",
    set: "BASE",
    cost: 0,
    rarity: "R",
    atk: 1000,
    hp: 500,
    factionRequirement: null,
    skills: [
          {
                "name": "溶菌攻击",
                "nameEn": "Lysozyme Attack",
                "type": "unique",
                "description": "攻击病原系卡牌时 ATK +500",
                "scienceNote": "眼泪含有溶菌酶，能分解细菌的细胞壁，是身体的第一道化学防线"
          }
    ],
    scienceCard: "你知道吗？眼泪不只是用来哭的！眼泪里含有溶菌酶，能杀死细菌保护眼睛。这就是为什么眼睛虽然暴露在空气中却很少感染。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["innate_immunity"],
  },

  {
    id: "eyelash_interceptor",
    name: "睫毛·灰尘拦截者",
    nameEn: "Eyelash: Dust Interceptor",
    type: "character",
    faction: "body",
    subType: "structure",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 500,
    hp: 3000,
    factionRequirement: null,
    skills: [
          {
                "name": "物理屏障",
                "nameEn": "Physical Barrier",
                "type": "unique",
                "description": "守护：在场时对手只能攻击该卡",
                "scienceNote": "睫毛是眼睛的物理屏障，挡住灰尘和汗水"
          }
    ],
    scienceCard: "睫毛不只是为了好看！每根睫毛的寿命大约3-5个月，掉了会再长。上眼皮大约有150根睫毛，它们像小刷子一样挡住灰尘。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "sweat_gland_cooler",
    name: "汗腺·温度管家",
    nameEn: "Sweat Gland: Temperature Manager",
    type: "character",
    faction: "body",
    subType: "structure",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 1500,
    hp: 2000,
    factionRequirement: null,
    skills: [
          {
                "name": "散热调节",
                "nameEn": "Heat Regulation",
                "type": "unique",
                "description": "为一个友方卡清除一个负面状态（中毒/灼烧/削弱）",
                "scienceNote": "汗液蒸发带走热量，帮助身体维持37°C的恒定体温"
          }
    ],
    scienceCard: "人体有200-400万个汗腺！出汗是身体最重要的降温方式。汗水蒸发时会带走热量，就像给身体装了空调。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "small_intestine_absorber",
    name: "小肠·营养吸收站",
    nameEn: "Small Intestine: Nutrient Station",
    type: "character",
    faction: "body",
    subType: "organ",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 1000,
    hp: 4000,
    factionRequirement: null,
    skills: [
          {
                "name": "营养吸收",
                "nameEn": "Nutrient Absorption",
                "type": "unique",
                "description": "每回合为己方主人恢复 500 HP",
                "scienceNote": "小肠内壁有数百万个绒毛，展开面积相当于一个网球场，最大化吸收营养"
          }
    ],
    scienceCard: "小肠是消化系统的明星！它有6-7米长，内壁布满了数百万个微小的绒毛。如果把所有绒毛展开铺平，面积相当于一个网球场！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "lymph_node_filter",
    name: "淋巴结·过滤站",
    nameEn: "Lymph Node: Filter Station",
    type: "character",
    faction: "body",
    subType: "blood",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 2000,
    hp: 3000,
    factionRequirement: null,
    skills: [
          {
                "name": "免疫激活",
                "nameEn": "Immune Activation",
                "type": "unique",
                "description": "场上每有一个其他人体系·血液免疫卡，该卡 HP +500",
                "scienceNote": "淋巴结是免疫细胞的集合地，病原体到达时会激活大量免疫细胞"
          }
    ],
    scienceCard: "你生病时脖子上会摸到肿起来的小疙瘩，那就是淋巴结在战斗！人体有大约600个淋巴结，它们是免疫系统的'过滤器'和'军事基地'。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["immune"],
  },

  {
    id: "kidney_filter",
    name: "肾脏·毒素过滤器",
    nameEn: "Kidney: Toxin Filter",
    type: "character",
    faction: "body",
    subType: "organ",
    set: "BASE",
    cost: 3,
    rarity: "R",
    atk: 2000,
    hp: 5500,
    factionRequirement: null,
    skills: [
          {
                "name": "毒素过滤",
                "nameEn": "Toxin Filtration",
                "type": "unique",
                "description": "出场时清除己方所有卡的中毒状态",
                "scienceNote": "肾脏每天过滤约180升血液，把废物变成尿液排出体外"
          }
    ],
    scienceCard: "你的两个肾脏每天要过滤180升血液——相当于把全身的血过滤40遍！肾脏还能调节血压和酸碱平衡，是身体的'净化工厂'。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "bone_marrow_forge",
    name: "骨髓·造血工坊",
    nameEn: "Bone Marrow: Blood Forge",
    type: "character",
    faction: "body",
    subType: "structure",
    set: "BASE",
    cost: 3,
    rarity: "R",
    atk: 2500,
    hp: 5000,
    factionRequirement: null,
    skills: [
          {
                "name": "造血增援",
                "nameEn": "Hematopoiesis",
                "type": "unique",
                "description": "每 2 回合从卡组顶部抽 1 张卡",
                "scienceNote": "骨髓每秒产生数百万个新的血细胞，是身体的造血中心"
          }
    ],
    scienceCard: "骨头里面不是空的！骨髓每秒钟能制造几百万个新的血细胞。红骨髓负责造血，黄骨髓储存脂肪。所有血细胞都是从骨髓里的干细胞变来的。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "stem_cell_morph",
    name: "干细胞·万能变身者",
    nameEn: "Stem Cell: Universal Morpher",
    type: "character",
    faction: "body",
    subType: "cellmech",
    set: "BASE",
    cost: 4,
    rarity: "R",
    atk: 3000,
    hp: 5000,
    factionRequirement: null,
    skills: [
          {
                "name": "分化变身",
                "nameEn": "Differentiation",
                "type": "unique",
                "description": "死亡时变为弃牌堆中随机一张人体系R卡复活到场上（HP 50%）",
                "scienceNote": "干细胞能分化成身体需要的任何类型的细胞"
          }
    ],
    scienceCard: "干细胞是身体里的'万能细胞'！它们还没有决定自己要变成什么，可以变成心脏细胞、神经细胞、血细胞……科学家正在研究用干细胞修复受损的器官。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["pluripotent"],
  },

  {
    id: "liver_detox",
    name: "肝脏·解毒工厂",
    nameEn: "Liver: Detox Factory",
    type: "character",
    faction: "body",
    subType: "organ",
    set: "BASE",
    cost: 4,
    rarity: "R",
    atk: 3500,
    hp: 6500,
    factionRequirement: null,
    skills: [
          {
                "name": "解毒代谢",
                "nameEn": "Detoxification",
                "type": "unique",
                "description": "己方回合开始时，移除己方所有卡的一个随机负面效果",
                "scienceNote": "肝脏有500多种功能，最重要的是分解毒素，保护身体免受有害物质伤害"
          }
    ],
    scienceCard: "肝脏是人体最大的内脏器官，重约1.5公斤，有500多种功能！最厉害的是它能'再生'——切掉一半后几个月就能长回来。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "dendrite_scout",
    name: "树突细胞·免疫情报员",
    nameEn: "Dendritic Cell: Immune Scout",
    type: "character",
    faction: "body",
    subType: "nerve",
    set: "BASE",
    cost: 2,
    rarity: "SR",
    atk: 1500,
    hp: 3000,
    factionRequirement: null,
    skills: [
          {
                "name": "抗原呈递",
                "nameEn": "Antigen Presentation",
                "type": "unique",
                "description": "出场时标记一个敌方卡，该卡受到所有人体系卡的伤害 +1000",
                "scienceNote": "树突细胞捕获病原体后，将抗原呈递给T细胞，激活精准免疫应答"
          }
    ],
    scienceCard: "树突细胞是免疫系统的'侦察兵'！它们在全身巡逻，一旦发现入侵者就把敌人的'身份证'（抗原）展示给T细胞，帮助免疫系统精准攻击。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["immune","antigen_presenting"],
  },

  {
    id: "spleen_recycler",
    name: "脾脏·血液回收站",
    nameEn: "Spleen: Blood Recycler",
    type: "character",
    faction: "body",
    subType: "organ",
    set: "BASE",
    cost: 3,
    rarity: "SR",
    atk: 3000,
    hp: 4500,
    factionRequirement: null,
    skills: [
          {
                "name": "细胞回收",
                "nameEn": "Cell Recycling",
                "type": "unique",
                "description": "击杀敌方卡时，恢复自身 2000 HP",
                "scienceNote": "脾脏负责清除老化的红血球，回收其中的铁元素重新造血"
          }
    ],
    scienceCard: "脾脏是人体最大的淋巴器官，藏在左边肋骨下面。它的工作是'回收'老化的红血球——把里面的铁取出来，送回骨髓重新造血。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "macrophage_tank",
    name: "巨噬细胞·吞噬战车",
    nameEn: "Macrophage: Engulf Tank",
    type: "character",
    faction: "body",
    subType: "blood",
    set: "BASE",
    cost: 4,
    rarity: "SR",
    atk: 4500,
    hp: 5500,
    factionRequirement: null,
    skills: [
          {
                "name": "吞噬强化",
                "nameEn": "Phagocytosis Power",
                "type": "unique",
                "description": "每击杀一个敌方卡，永久 ATK +1000",
                "scienceNote": "巨噬细胞吞噬病原体后会'记住'它们的特征，变得越来越高效"
          }
    ],
    scienceCard: "巨噬细胞就像身体里的'吃豆人'——它们把细菌整个吞进去消化掉！一个巨噬细胞能吞掉上百个细菌，是免疫系统的主力清道夫。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["immune","innate_immunity"],
  },

  {
    id: "dna_repair_crew",
    name: "DNA修复·基因维修队",
    nameEn: "DNA Repair: Gene Fix Crew",
    type: "character",
    faction: "body",
    subType: "cellmech",
    set: "BASE",
    cost: 6,
    rarity: "SR",
    atk: 4000,
    hp: 11000,
    factionRequirement: {"faction":"body","count":1,"type":"check","scienceNote":"DNA修复需要细胞内其他分子的配合才能执行"},
    skills: [
          {
                "name": "基因修复",
                "nameEn": "Gene Repair",
                "type": "unique",
                "description": "从弃牌堆复活一张人体系卡到场上，恢复 50% HP",
                "scienceNote": "DNA修复酶每天要修复人体细胞中数万次的DNA损伤"
          }
    ],
    scienceCard: "你的DNA每天会被损伤数万次（紫外线、自由基等），但DNA修复系统能找到并修好大部分错误。如果修不好，细胞就会'自杀'（细胞凋亡）来保护身体。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "antibody_precision_ssr",
    name: "抗体·精确制导弹·觉醒",
    nameEn: "Antibody: Precision Missile Awakened",
    type: "character",
    faction: "body",
    subType: "blood",
    set: "BASE",
    cost: 5,
    rarity: "SSR",
    atk: 7000,
    hp: 4500,
    factionRequirement: {"faction":"body","count":2,"type":"check","scienceNote":"抗体由B细胞产生，需要免疫系统的协调配合"},
    skills: [
          {
                "name": "抗原锁定",
                "nameEn": "Antigen Lock-on",
                "type": "unique",
                "description": "攻击被树突细胞标记的目标时，无视守护直接攻击且 ATK ×2",
                "scienceNote": "抗体与特定抗原的结合就像钥匙和锁，精确度极高"
          }
    ],
    scienceCard: "抗体是Y形的蛋白质，每种抗体只能识别一种特定的病原体。人体能产生超过10亿种不同的抗体，几乎能识别地球上所有的病原体！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["immune","adaptive_immunity"],
  },

  {
    id: "thymus_academy",
    name: "胸腺·免疫学院",
    nameEn: "Thymus: Immune Academy",
    type: "character",
    faction: "body",
    subType: "cellmech",
    set: "BASE",
    cost: 8,
    rarity: "SSR",
    atk: 5000,
    hp: 18000,
    factionRequirement: {"faction":"body","count":3,"type":"check","scienceNote":"胸腺是T细胞的培训基地，需要完整的免疫系统支持"},
    skills: [
          {
                "name": "T细胞培训",
                "nameEn": "T-Cell Training",
                "type": "unique",
                "description": "每 2 回合从卡组中搜索一张人体系·血液免疫卡加入手牌",
                "scienceNote": "胸腺'教育'T细胞识别自己和敌人，只有通过考试的T细胞才能毕业"
          }
    ],
    scienceCard: "胸腺是T细胞的'学校'！未成熟的T细胞在这里'学习'如何区分自己人和入侵者。考试不及格的T细胞会被淘汰——淘汰率高达95%！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["immune"],
  },

  {
    id: "mitochondria_powerhouse",
    name: "线粒体·能量发电站",
    nameEn: "Mitochondria: Powerhouse",
    type: "character",
    faction: "body",
    subType: "cellmech",
    set: "BASE",
    cost: 6,
    rarity: "SSR",
    atk: 3500,
    hp: 10000,
    factionRequirement: {"faction":"body","count":2,"type":"check","scienceNote":"线粒体存在于几乎所有人体细胞中，需要细胞系统配合"},
    skills: [
          {
                "name": "ATP爆发",
                "nameEn": "ATP Burst",
                "type": "unique",
                "description": "己方回合开始时获得 +1 能量（Power Bank 不受影响）",
                "scienceNote": "线粒体通过氧化磷酸化产生ATP，是细胞的能量货币工厂"
          }
    ],
    scienceCard: "线粒体被称为'细胞的发电站'！它们把食物中的能量转化为ATP（细胞的'电池'）。有趣的是，线粒体有自己的DNA，科学家认为它们远古时是独立的细菌。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["organelle","endosymbiosis"],
  },

  // ============================================================
  // 🦠 病原系新卡 (Sprint 18) - 16 张
  // ============================================================

  {
    id: "common_cold_virus",
    name: "普通感冒·低调入侵者",
    nameEn: "Common Cold: Subtle Invader",
    type: "character",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    cost: 0,
    rarity: "R",
    atk: 1000,
    hp: 500,
    factionRequirement: null,
    skills: [
          {
                "name": "飞沫传播",
                "nameEn": "Droplet Spread",
                "type": "unique",
                "description": "死亡时对敌方随机一张卡造成 500 伤害",
                "scienceNote": "感冒病毒通过飞沫传播，一个喷嚏能喷出4万个飞沫颗粒"
          }
    ],
    scienceCard: "感冒是最常见的病！有超过200种病毒能引起感冒，所以你才会反复感冒。一个喷嚏的速度可达160公里/小时，能把病毒喷到8米远！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["RNA_virus","rhinovirus"],
  },

  {
    id: "hookworm_sucker",
    name: "钩虫·血液吸取者",
    nameEn: "Hookworm: Blood Sucker",
    type: "character",
    faction: "pathogen",
    subType: "parasite",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 1500,
    hp: 2000,
    factionRequirement: null,
    skills: [
          {
                "name": "吸血",
                "nameEn": "Blood Drain",
                "type": "unique",
                "description": "攻击时恢复自身等于造成伤害 30% 的 HP",
                "scienceNote": "钩虫用钩状口器附着在肠壁上吸血，每天能吸0.5ml血"
          }
    ],
    scienceCard: "钩虫幼虫能从脚底的皮肤钻进人体！它们用嘴巴上的'小钩子'挂在肠壁上吸血。全世界有5亿人感染钩虫，大多在热带地区。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["roundworm","nematode"],
  },

  {
    id: "norovirus_storm",
    name: "诺如病毒·胃肠风暴",
    nameEn: "Norovirus: Gut Storm",
    type: "character",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 2000,
    hp: 1000,
    factionRequirement: null,
    skills: [
          {
                "name": "剧烈呕吐",
                "nameEn": "Violent Vomit",
                "type": "unique",
                "description": "出场时使敌方一张随机卡 ATK -1000，持续 1 回合",
                "scienceNote": "诺如病毒感染后会剧烈呕吐和腹泻，极少量病毒就能致病"
          }
    ],
    scienceCard: "诺如病毒超级会传播——只需要18个病毒颗粒就能让人生病（大多数病毒需要上千个）！冬天的学校食堂和游轮上最容易爆发。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["RNA_virus"],
  },

  {
    id: "ringworm_itch",
    name: "癣菌·皮肤骚扰者",
    nameEn: "Ringworm: Skin Irritant",
    type: "character",
    faction: "pathogen",
    subType: "fungus",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 1000,
    hp: 2500,
    factionRequirement: null,
    skills: [
          {
                "name": "持续瘙痒",
                "nameEn": "Persistent Itch",
                "type": "unique",
                "description": "攻击后使目标每回合损失 500 HP，持续 2 回合",
                "scienceNote": "癣菌感染皮肤后引起环状红斑和持续瘙痒"
          }
    ],
    scienceCard: "虽然叫'癣'但其实不是虫子——是真菌感染！癣菌喜欢温暖潮湿的环境，所以脚趾缝（脚气）和腹股沟最容易感染。保持干燥就能预防。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["dermatophyte"],
  },

  {
    id: "salmonella_poison",
    name: "沙门氏菌·食物破坏者",
    nameEn: "Salmonella: Food Poisoner",
    type: "character",
    faction: "pathogen",
    subType: "bacteria",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 2500,
    hp: 2500,
    factionRequirement: null,
    skills: [
          {
                "name": "食物中毒",
                "nameEn": "Food Poisoning",
                "type": "unique",
                "description": "攻击人体系卡时 ATK +1000",
                "scienceNote": "沙门氏菌主要通过不洁食物传播，攻击消化系统"
          }
    ],
    scienceCard: "沙门氏菌最喜欢藏在没煮熟的鸡蛋和鸡肉里！吃了被污染的食物会肚子疼、拉肚子、发烧。所以鸡蛋和肉一定要完全煮熟哦！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["gram_negative"],
  },

  {
    id: "roundworm_thief",
    name: "蛔虫·肠道偷食者",
    nameEn: "Roundworm: Gut Thief",
    type: "character",
    faction: "pathogen",
    subType: "parasite",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 2000,
    hp: 3500,
    factionRequirement: null,
    skills: [
          {
                "name": "营养劫持",
                "nameEn": "Nutrient Hijack",
                "type": "unique",
                "description": "在场时，敌方主人每回合回复效果减少 500",
                "scienceNote": "蛔虫寄生在小肠内抢夺宿主的营养，导致营养不良"
          }
    ],
    scienceCard: "蛔虫是最常见的肠道寄生虫，全球有10亿人感染！成虫有15-35厘米长，住在小肠里偷吃你的食物。一只母蛔虫每天能产20万颗卵。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["nematode"],
  },

  {
    id: "cordyceps_zombie",
    name: "冬虫夏草·僵尸操控者",
    nameEn: "Cordyceps: Zombie Master",
    type: "character",
    faction: "pathogen",
    subType: "fungus",
    set: "BASE",
    cost: 3,
    rarity: "R",
    atk: 3500,
    hp: 3500,
    factionRequirement: null,
    skills: [
          {
                "name": "心智操控",
                "nameEn": "Mind Control",
                "type": "unique",
                "description": "击杀敌方卡时，25% 概率将其以 ATK 1000 / HP 1000 复活为己方卡",
                "scienceNote": "冬虫夏草感染蚂蚁后操控其行为，让蚂蚁爬到高处后死亡释放孢子"
          }
    ],
    scienceCard: "冬虫夏草是一种'僵尸真菌'！它感染蚂蚁后能控制蚂蚁的大脑，命令蚂蚁爬到树叶高处，然后从蚂蚁头部长出来释放孢子。《最后生还者》游戏的灵感就来自它！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["ascomycete","entomopathogenic"],
  },

  {
    id: "prion_folder",
    name: "朊病毒·疯狂折叠者",
    nameEn: "Prion: Mad Folder",
    type: "character",
    faction: "pathogen",
    subType: "other",
    set: "BASE",
    cost: 3,
    rarity: "R",
    atk: 4000,
    hp: 2500,
    factionRequirement: null,
    skills: [
          {
                "name": "错误折叠",
                "nameEn": "Misfolding",
                "type": "unique",
                "description": "攻击时使目标永久 ATK -500（不可恢复）",
                "scienceNote": "朊病毒是错误折叠的蛋白质，它能让正常蛋白质也跟着折叠错误，形成连锁反应"
          }
    ],
    scienceCard: "朊病毒不是真正的病毒——它是一种折叠错误的蛋白质！它能像'坏老师'一样让周围正常的蛋白质也跟着折叠错误。疯牛病就是朊病毒引起的，目前没有药物能治。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["protein","not_a_virus"],
  },

  {
    id: "cholera_wave",
    name: "霍乱弧菌·水源污染者",
    nameEn: "Cholera: Water Polluter",
    type: "character",
    faction: "pathogen",
    subType: "bacteria",
    set: "BASE",
    cost: 4,
    rarity: "R",
    atk: 4500,
    hp: 5000,
    factionRequirement: null,
    skills: [
          {
                "name": "脱水攻击",
                "nameEn": "Dehydration Strike",
                "type": "unique",
                "description": "攻击时对敌方主人额外造成 1000 伤害",
                "scienceNote": "霍乱毒素导致剧烈腹泻和脱水，是致死的主要原因"
          }
    ],
    scienceCard: "霍乱弧菌长得像个小逗号！它通过被污染的水传播，感染后几小时就会剧烈腹泻，一天可以失去20升水。干净的饮用水是预防霍乱最好的方法。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["gram_negative","waterborne"],
  },

  {
    id: "dengue_mosquito",
    name: "登革热·蚊媒杀手",
    nameEn: "Dengue: Mosquito Killer",
    type: "character",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    cost: 3,
    rarity: "SR",
    atk: 3000,
    hp: 4500,
    factionRequirement: null,
    skills: [
          {
                "name": "骨痛热浪",
                "nameEn": "Breakbone Fever",
                "type": "unique",
                "description": "攻击后使目标 ATK 和 HP 各 -1000，持续 2 回合",
                "scienceNote": "登革热又叫'断骨热'因为浑身关节极度疼痛，通过蚊子叮咬传播"
          }
    ],
    scienceCard: "登革热被称为'断骨热'因为感染后浑身骨头和关节剧痛！它由蚊子传播，全球每年有3.9亿人感染。最好的预防方法就是消灭蚊子的繁殖地。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["RNA_virus","arbovirus","mosquito_borne"],
  },

  {
    id: "anthrax_spore",
    name: "炭疽孢子·沉睡死神",
    nameEn: "Anthrax: Dormant Reaper",
    type: "character",
    faction: "pathogen",
    subType: "bacteria",
    set: "BASE",
    cost: 4,
    rarity: "SR",
    atk: 4000,
    hp: 6000,
    factionRequirement: null,
    skills: [
          {
                "name": "孢子休眠",
                "nameEn": "Spore Dormancy",
                "type": "unique",
                "description": "被击杀时不进入弃牌堆，2 回合后以满 HP 复活到场上",
                "scienceNote": "炭疽杆菌能形成极其耐久的孢子，在土壤中存活数十年后仍有致命性"
          }
    ],
    scienceCard: "炭疽杆菌的孢子是自然界最顽强的生存者——能在土壤中沉睡100年以上！即使经过高温、干燥和化学消毒，它们也不死。一旦条件合适就'复活'致病。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["gram_positive","spore_forming"],
  },

  {
    id: "ebola_terror",
    name: "埃博拉·出血恐怖",
    nameEn: "Ebola: Hemorrhagic Terror",
    type: "character",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    cost: 5,
    rarity: "SR",
    atk: 7500,
    hp: 4500,
    factionRequirement: null,
    skills: [
          {
                "name": "出血热",
                "nameEn": "Hemorrhagic Fever",
                "type": "unique",
                "description": "攻击后使目标每回合损失 1500 HP，持续 2 回合（不可叠加）",
                "scienceNote": "埃博拉病毒破坏血管内壁，导致全身出血"
          }
    ],
    scienceCard: "埃博拉是最致命的病毒之一，死亡率可达90%！但它传播效率不高（需要直接接触体液），所以不会像流感那样大规模爆发。2014年西非爆发是最严重的一次。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["RNA_virus","filovirus"],
  },

  {
    id: "toxoplasma_controller",
    name: "弓形虫·心智操控者",
    nameEn: "Toxoplasma: Mind Controller",
    type: "character",
    faction: "pathogen",
    subType: "parasite",
    set: "BASE",
    cost: 5,
    rarity: "SR",
    atk: 5000,
    hp: 7500,
    factionRequirement: null,
    skills: [
          {
                "name": "行为改写",
                "nameEn": "Behavior Override",
                "type": "unique",
                "description": "攻击敌方卡时，25% 概率使目标下回合攻击自己的友方卡",
                "scienceNote": "弓形虫能改变老鼠大脑，让老鼠不怕猫，方便弓形虫完成生命周期"
          }
    ],
    scienceCard: "弓形虫是最聪明的寄生虫！它感染老鼠后，会改变老鼠大脑里的化学物质，让老鼠不再怕猫——反而被猫的气味吸引。这样猫就容易抓住老鼠，弓形虫也完成了传播。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["protist","apicomplexan"],
  },

  {
    id: "mrsa_superbug",
    name: "MRSA·金色无敌菌",
    nameEn: "MRSA: Golden Invincible",
    type: "character",
    faction: "pathogen",
    subType: "bacteria",
    set: "BASE",
    cost: 6,
    rarity: "SSR",
    atk: 6000,
    hp: 9500,
    factionRequirement: {"faction":"pathogen","count":2,"type":"check","scienceNote":"超级细菌的耐药性来自与其他细菌的基因交换"},
    skills: [
          {
                "name": "耐药壁垒",
                "nameEn": "Antibiotic Resistance",
                "type": "unique",
                "description": "免疫科技系卡牌的伤害。被科技系攻击时反弹 50% 伤害",
                "scienceNote": "MRSA对几乎所有常规抗生素免疫，是医院感染的噩梦"
          }
    ],
    scienceCard: "MRSA（耐甲氧西林金黄色葡萄球菌）是最可怕的超级细菌之一！大多数抗生素都对它无效。它在医院里最危险，因为那里有很多抵抗力弱的病人。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["gram_positive","antibiotic_resistant"],
  },

  {
    id: "smallpox_ghost",
    name: "天花幽灵·远古瘟神",
    nameEn: "Smallpox: Ancient Plague Ghost",
    type: "character",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    cost: 7,
    rarity: "SSR",
    atk: 8000,
    hp: 12000,
    factionRequirement: {"faction":"pathogen","count":2,"type":"check","scienceNote":"天花需要其他病原体制造的混乱环境才能重新出现"},
    skills: [
          {
                "name": "远古瘟疫",
                "nameEn": "Ancient Plague",
                "type": "unique",
                "description": "出场时对所有敌方卡造成 3000 伤害",
                "scienceNote": "天花是人类历史上最致命的传染病，曾在一个世纪内杀死5亿人"
          }
    ],
    scienceCard: "天花是人类唯一完全消灭的传染病！1980年WHO宣布天花被根除。它曾经杀死了全人类约10%的人口。现在只有两个实验室保存着天花病毒样本。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["DNA_virus","eradicated"],
  },

  {
    id: "pandemic_ultimate",
    name: "大流行病毒·终极瘟疫",
    nameEn: "Pandemic Virus: Ultimate Plague",
    type: "character",
    faction: "pathogen",
    subType: "virus",
    set: "BASE",
    cost: 10,
    rarity: "SSR",
    atk: 15000,
    hp: 15000,
    factionRequirement: {"faction":"pathogen","count":4,"type":"consume","scienceNote":"终极大流行需要多种病原体基因重组，消耗大量病原资源"},
    skills: [
          {
                "name": "全球大流行",
                "nameEn": "Global Pandemic",
                "type": "unique",
                "description": "出场时对敌方主人直接造成 5000 伤害，且所有敌方卡 ATK -2000 持续 3 回合",
                "scienceNote": "假想的终极病毒结合了高传播力和高致死率，是人类最大的生物威胁"
          }
    ],
    scienceCard: "科学家最担心的'X疾病'——一种尚未出现的、结合了高传播力和高致死率的终极大流行病原体。这就是为什么全球疾病监测网络如此重要！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["hypothetical","pandemic"],
  },

  // ============================================================
  // ⚗️ 科技系新卡 (Sprint 18) - 16 张
  // ============================================================

  {
    id: "hand_sanitizer",
    name: "洗手液·速效清洁者",
    nameEn: "Hand Sanitizer: Quick Cleanser",
    type: "character",
    faction: "tech",
    subType: "prevention",
    set: "BASE",
    cost: 0,
    rarity: "R",
    atk: 1000,
    hp: 500,
    factionRequirement: null,
    skills: [
          {
                "name": "酒精消毒",
                "nameEn": "Alcohol Disinfect",
                "type": "unique",
                "description": "出场时对一个敌方病原系卡造成 1000 伤害",
                "scienceNote": "含65%以上酒精的洗手液能在20秒内杀死大多数细菌和病毒"
          }
    ],
    scienceCard: "洗手是预防传染病最简单有效的方法！用肥皂洗手20秒能去除99%的细菌。酒精洗手液也很有效，但对诺如病毒等少数病毒效果差。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["preventive"],
  },

  {
    id: "surgical_mask",
    name: "口罩·空气过滤盾",
    nameEn: "Surgical Mask: Air Filter Shield",
    type: "character",
    faction: "tech",
    subType: "prevention",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 500,
    hp: 3000,
    factionRequirement: null,
    skills: [
          {
                "name": "飞沫过滤",
                "nameEn": "Droplet Filter",
                "type": "unique",
                "description": "在场时，敌方病原系卡 ATK -500",
                "scienceNote": "医用口罩能过滤95%以上的飞沫，减少呼吸道病原体传播"
          }
    ],
    scienceCard: "口罩不是万能的，但非常有用！N95口罩能过滤95%的微小颗粒。口罩最大的作用是阻止你把病毒传给别人——保护别人就是保护自己。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["preventive"],
  },

  {
    id: "bandage_wrap",
    name: "纱布·止血缠绕者",
    nameEn: "Bandage: Wound Wrapper",
    type: "character",
    faction: "tech",
    subType: "equipment",
    set: "BASE",
    cost: 1,
    rarity: "R",
    atk: 1000,
    hp: 2500,
    factionRequirement: null,
    skills: [
          {
                "name": "止血包扎",
                "nameEn": "Hemostasis Wrap",
                "type": "unique",
                "description": "为一个友方卡恢复 1500 HP",
                "scienceNote": "纱布通过压迫和吸收血液来促进凝血，是最基础的急救工具"
          }
    ],
    scienceCard: "纱布是最古老的医疗用品之一，埃及人4000年前就在用了！现代纱布有的含银离子（抗菌）、有的含药物（止痛），比古代先进多了。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "aspirin_pill",
    name: "阿司匹林·万能小药片",
    nameEn: "Aspirin: Wonder Pill",
    type: "character",
    faction: "tech",
    subType: "medicine",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 2000,
    hp: 3000,
    factionRequirement: null,
    skills: [
          {
                "name": "消炎镇痛",
                "nameEn": "Anti-inflammatory",
                "type": "unique",
                "description": "清除一个友方卡的所有负面状态，并恢复 1000 HP",
                "scienceNote": "阿司匹林抑制前列腺素合成，同时具有退烧、消炎、镇痛作用"
          }
    ],
    scienceCard: "阿司匹林是100多年前发明的，至今仍是世界上用得最多的药之一！它来自柳树皮。除了止痛退烧，还能预防心脏病——小小一片药，大大的作用。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["NSAID"],
  },

  {
    id: "blood_test_kit",
    name: "血液检测盒·快速诊断",
    nameEn: "Blood Test Kit: Quick Diagnosis",
    type: "character",
    faction: "tech",
    subType: "diagnostic",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 1500,
    hp: 3500,
    factionRequirement: null,
    skills: [
          {
                "name": "快速检测",
                "nameEn": "Rapid Test",
                "type": "unique",
                "description": "出场时揭示对手所有手牌 1 回合",
                "scienceNote": "血液检测能在几分钟内检测出感染、血糖、血型等关键信息"
          }
    ],
    scienceCard: "验血是医生了解你身体状况最快的方法之一！一滴血就能检测出几百种信息：有没有感染、血糖高不高、肝肾功能好不好。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "probiotics_ally",
    name: "益生菌·肠道好帮手",
    nameEn: "Probiotics: Gut Ally",
    type: "character",
    faction: "tech",
    subType: "prevention",
    set: "BASE",
    cost: 2,
    rarity: "R",
    atk: 1500,
    hp: 4000,
    factionRequirement: null,
    skills: [
          {
                "name": "微生态调节",
                "nameEn": "Microbiome Balance",
                "type": "unique",
                "description": "在场时，己方人体系卡每回合恢复 500 HP",
                "scienceNote": "益生菌帮助维持肠道菌群平衡，增强免疫力和消化功能"
          }
    ],
    scienceCard: "你的肠道里住着上万亿个细菌——比全身的人体细胞还多！大部分是'好细菌'（益生菌），帮你消化食物、制造维生素、训练免疫系统。酸奶里就有很多益生菌。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["probiotic"],
  },

  {
    id: "pcr_machine",
    name: "PCR检测仪·基因放大器",
    nameEn: "PCR Machine: Gene Amplifier",
    type: "character",
    faction: "tech",
    subType: "diagnostic",
    set: "BASE",
    cost: 3,
    rarity: "R",
    atk: 2500,
    hp: 5000,
    factionRequirement: null,
    skills: [
          {
                "name": "核酸扩增",
                "nameEn": "Nucleic Acid Amplification",
                "type": "unique",
                "description": "攻击病原系卡时 ATK +2000，且标记该卡下回合受到伤害 +1000",
                "scienceNote": "PCR技术能将微量DNA放大数百万倍，让任何病原体都无所遁形"
          }
    ],
    scienceCard: "PCR（聚合酶链式反应）是新冠检测的核心技术！它能把一小段DNA复制几百万份，像放大镜一样让微量病毒无处藏身。发明者穆利斯因此获得了诺贝尔奖。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["molecular_biology"],
  },

  {
    id: "robotic_surgery",
    name: "机器人手术刀·精准切割",
    nameEn: "Robotic Scalpel: Precision Cut",
    type: "character",
    faction: "tech",
    subType: "equipment",
    set: "BASE",
    cost: 3,
    rarity: "R",
    atk: 4500,
    hp: 3000,
    factionRequirement: null,
    skills: [
          {
                "name": "精准穿透",
                "nameEn": "Precision Pierce",
                "type": "generic",
                "description": "穿透：攻击守护卡时溢出伤害穿透到主人",
                "scienceNote": "手术机器人的精度可达0.1毫米，远超人手极限"
          }
    ],
    scienceCard: "达芬奇手术机器人能做比人手更精确的手术！医生坐在控制台前操作，机器人的'手'在病人体内工作，切口只有几毫米大，病人恢复得更快。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["robotics"],
  },

  {
    id: "defibrillator_restart",
    name: "除颤器·心跳重启者",
    nameEn: "Defibrillator: Heart Restarter",
    type: "character",
    faction: "tech",
    subType: "equipment",
    set: "BASE",
    cost: 4,
    rarity: "R",
    atk: 3000,
    hp: 7000,
    factionRequirement: null,
    skills: [
          {
                "name": "电击重启",
                "nameEn": "Electric Restart",
                "type": "unique",
                "description": "从弃牌堆复活一张费用 ≤3 的人体系卡到场上（HP 30%）",
                "scienceNote": "除颤器通过电击让心脏恢复正常节律，是心脏骤停时的救命神器"
          }
    ],
    scienceCard: "除颤器（AED）是真正的'救命神器'！心脏骤停后，每延迟1分钟使用AED，存活率就下降10%。现在很多商场和学校都配备了AED，你见过吗？",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "ct_scanner_reveal",
    name: "CT扫描仪·透视全身",
    nameEn: "CT Scanner: Full Body Reveal",
    type: "character",
    faction: "tech",
    subType: "diagnostic",
    set: "BASE",
    cost: 4,
    rarity: "SR",
    atk: 3500,
    hp: 6000,
    factionRequirement: null,
    skills: [
          {
                "name": "三维透视",
                "nameEn": "3D Scan",
                "type": "unique",
                "description": "出场时揭示对手全部手牌和卡组顶部 3 张卡",
                "scienceNote": "CT用X射线从多角度拍摄，计算机重建出身体内部的三维图像"
          }
    ],
    scienceCard: "CT扫描仪像给身体拍'切片照'——它绕着你转一圈，拍几百张X光片，然后电脑把这些切片拼成3D图像。医生就能看到你身体里面的每个角落！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "gene_therapy_fix",
    name: "基因治疗·修复密码",
    nameEn: "Gene Therapy: Code Fix",
    type: "character",
    faction: "tech",
    subType: "genetech",
    set: "BASE",
    cost: 5,
    rarity: "SR",
    atk: 4000,
    hp: 8000,
    factionRequirement: null,
    skills: [
          {
                "name": "基因修正",
                "nameEn": "Gene Correction",
                "type": "unique",
                "description": "永久提升一个友方卡 ATK +1500 或 HP +3000（选择一项）",
                "scienceNote": "基因治疗通过修正缺陷基因或引入功能基因来治疗遗传病"
          }
    ],
    scienceCard: "基因治疗是用正确的基因替换有问题的基因——就像修改电脑程序里的bug！2017年首个基因治疗药物获批，治好了一种会导致失明的遗传病。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "dialysis_machine",
    name: "透析机·血液净化器",
    nameEn: "Dialysis Machine: Blood Purifier",
    type: "character",
    faction: "tech",
    subType: "equipment",
    set: "BASE",
    cost: 5,
    rarity: "SR",
    atk: 3500,
    hp: 9000,
    factionRequirement: null,
    skills: [
          {
                "name": "血液透析",
                "nameEn": "Hemodialysis",
                "type": "unique",
                "description": "己方回合开始时，清除所有友方卡和主人的负面状态，并恢复主人 1000 HP",
                "scienceNote": "透析机代替肾脏过滤血液中的废物和多余水分"
          }
    ],
    scienceCard: "透析机就是'人工肾脏'！它把血液从身体里引出来，通过一层特殊的膜过滤掉废物和毒素，再把干净的血送回去。全球有300多万人靠透析维持生命。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: [],
  },

  {
    id: "mrna_vaccine",
    name: "mRNA疫苗·适应性免疫",
    nameEn: "mRNA Vaccine: Adaptive Shield",
    type: "character",
    faction: "tech",
    subType: "medicine",
    set: "BASE",
    cost: 6,
    rarity: "SR",
    atk: 5000,
    hp: 10500,
    factionRequirement: {"faction":"pathogen","count":1,"type":"check","scienceNote":"mRNA疫苗需要分析病原体的基因序列才能设计"},
    skills: [
          {
                "name": "免疫编程",
                "nameEn": "Immune Programming",
                "type": "unique",
                "description": "出场时使所有己方卡获得'免疫标记'：下次受到病原系伤害减半",
                "scienceNote": "mRNA疫苗教会免疫系统识别特定病原体的蛋白质，无需使用活病毒"
          }
    ],
    scienceCard: "mRNA疫苗是医学革命！它不用灭活病毒，而是给身体发一条'指令'（mRNA），让细胞自己制造病毒的一小部分蛋白质，免疫系统认识后就能对付真病毒了。新冠疫苗就是这样做的！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["vaccine","mRNA"],
  },

  {
    id: "nanobot_warrior",
    name: "纳米机器人·微型战士",
    nameEn: "Nanobot: Micro Warrior",
    type: "character",
    faction: "tech",
    subType: "genetech",
    set: "BASE",
    cost: 5,
    rarity: "SSR",
    atk: 5500,
    hp: 5500,
    factionRequirement: {"faction":"tech","count":2,"type":"consume","scienceNote":"纳米机器人的制造需要消耗先进科技资源"},
    skills: [
          {
                "name": "微型精准打击",
                "nameEn": "Nano Precision Strike",
                "type": "unique",
                "description": "攻击时无视守护直接攻击指定目标。攻击病原系卡时 ATK ×1.5",
                "scienceNote": "纳米机器人能在血管中精准定位病原体或癌细胞，执行靶向攻击"
          }
    ],
    scienceCard: "纳米机器人是比细胞还小的微型机器！科学家正在研究让它们在血管里巡逻，精准找到癌细胞并投放药物。虽然还在实验阶段，但未来可能彻底改变医学！",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["nanotechnology","experimental"],
  },

  {
    id: "crispr_editor",
    name: "CRISPR·基因剪刀手",
    nameEn: "CRISPR: Gene Scissors",
    type: "character",
    faction: "tech",
    subType: "genetech",
    set: "BASE",
    cost: 8,
    rarity: "SSR",
    atk: 8000,
    hp: 14000,
    factionRequirement: {"faction":"tech","count":3,"type":"check","scienceNote":"CRISPR基因编辑需要成熟的科技体系支撑"},
    skills: [
          {
                "name": "基因编辑",
                "nameEn": "Gene Edit",
                "type": "unique",
                "description": "选择一个敌方卡，将其 ATK 和 HP 互换",
                "scienceNote": "CRISPR能精确剪切和编辑任何生物的DNA，像Word编辑文档一样修改基因"
          }
    ],
    scienceCard: "CRISPR是2020年诺贝尔化学奖的发明！它就像DNA的'剪刀'和'胶水'——能精确剪掉有问题的基因片段，换上正确的。科学家已经用它治好了镰刀细胞贫血症。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["gene_editing","nobel_prize"],
  },

  {
    id: "ai_doctor",
    name: "AI医生·智慧诊疗",
    nameEn: "AI Doctor: Intelligent Healer",
    type: "character",
    faction: "tech",
    subType: "genetech",
    set: "BASE",
    cost: 9,
    rarity: "SSR",
    atk: 10000,
    hp: 15000,
    factionRequirement: {"faction":"tech","count":3,"type":"check","scienceNote":"AI医疗系统需要大量科技基础设施和数据支撑"},
    skills: [
          {
                "name": "智能诊疗",
                "nameEn": "AI Diagnosis & Treatment",
                "type": "unique",
                "description": "出场时为所有己方卡选择最优行动：ATK 最高的获得迅击，HP 最低的恢复 5000 HP",
                "scienceNote": "AI能在几秒内分析数百万份病例数据，给出最优治疗方案"
          }
    ],
    scienceCard: "AI已经在很多方面超越了人类医生！Google DeepMind的AI能在眼底照片中发现50多种眼病，准确率超过眼科专家。未来AI和人类医生合作，能拯救更多生命。",
    evolutionFrom: null,
    evolutionTo: null,
    tags: ["artificial_intelligence","future_tech"],
  },

];

export default cards;
