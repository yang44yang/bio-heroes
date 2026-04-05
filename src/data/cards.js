// Bio Heroes 生物英雄传 - 卡牌数据 v2
// Updated: 2026-03-16
// Total: 40 cards (4 factions × 10 cards)
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

];

export default cards;
