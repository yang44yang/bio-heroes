---
name: bio-heroes-card-designer
description: >
  Design and balance Bio Heroes card game cards interactively. Use this skill whenever the user wants to create a new card, design a card version, balance card stats, review card data, or batch-generate cards for Bio Heroes (生物英雄传). Trigger on any mention of: designing cards, creating new bio/creature/organism cards, card stats, card balancing, ATK/HP values, card cost/rarity, adding cards to cards.js, "设计卡牌", "新卡", "卡牌平衡", or any reference to the Bio Heroes card game data. Also trigger when the user and their child are brainstorming biology creatures for the game, even casually — e.g. "what about making a jellyfish card" or "水母能不能做成卡".
---

# Bio Heroes 卡牌设计工具

一个帮助父子一起设计 Bio Heroes 生物卡牌的交互式工具。

## 为什么需要这个工具

Bio Heroes 的卡牌设计有很多规则要遵守（费用与稀有度独立、Power Curve 平衡、技能扣减属性、阵营标记需求、科学准确性等）。这个工具让设计过程变成轻松的对话——你说想做什么生物，工具帮你校验平衡、生成数据、确保科学准确。

## 核心设计规则（必须遵守）

### 1. 只有两个基础属性
- **ATK**（攻击力）和 **HP**（生命值）
- 没有 DEF 和 SPD。防御/速度通过技能实现
- ⚠️ **所有数值必须是 500 的整数倍**（ATK、HP、技能伤害/回复值等）

### 2. 费用（Cost）与稀有度（Rarity）完全独立
- **费用 0-10**：决定什么时候能上场（基于 ATK+HP 总和 + 技能强度）
- **稀有度 R/SR/SSR**：决定抽到难度和技能独特性
- 可以有 0 费 SSR（低费神卡），也可以有 5 费 R（高费白板）
- ⚠️ 绝对不能把费用和稀有度绑定（如"R就是1费"是错误的）

### 3. Power Curve（属性预算）
ATK + HP 总和必须在费用对应的范围内：
```
cost 0：  ATK+HP ≤ 2000
cost 1：  ATK+HP ≤ 4000
cost 2：  ATK+HP ≤ 6000
cost 3：  ATK+HP ≤ 9000
cost 4：  ATK+HP ≤ 12000
cost 5：  ATK+HP ≤ 16000
cost 6：  ATK+HP ≤ 20000
cost 7：  ATK+HP ≤ 25000
cost 8：  ATK+HP ≤ 30000
cost 9：  ATK+HP ≤ 35000
cost 10： ATK+HP ≤ 40000
```

### 4. 技能扣减属性
有技能的卡，ATK+HP 总和要低于同费用无技能卡：
```
简单技能（单一效果）：     扣减 10-15%
中等技能（条件/双重效果）：扣减 15-25%
强力技能（改变战局）：     扣减 25-40%
```

### 5. 通用技能列表
| 技能 | 效果 |
|------|------|
| 守护 (Guard) | 在场时对手只能攻击该卡 |
| 迅击 (Swift Attack) | 出场当回合可攻击（无召唤疲劳） |
| 穿透 (Piercing Strike) | 打守护卡时溢出伤害穿透到主人 |
| 压制 (Overpower) | 击杀对方卡后溢出伤害转给主人 |
| 突进 (Rush) | 直攻主人时伤害翻倍 |
| 自愈 (Natural Recovery) | 每回合自动回复 HP |

专属技能可以自由设计，但必须有科学依据。

### 6. 四大阵营
| 阵营 | 代号 | 包含 |
|------|------|------|
| 🌱 自然系 | nature | 植物 + 动物 |
| 🧬 人体系 | body | 细胞 + 器官 |
| 🦠 病原系 | pathogen | 病毒 + 细菌 + 寄生虫 |
| ⚗️ 科技系 | tech | 药物 + 技术 + 工具 |

### 7. 阵营标记需求系统（Faction Requirement）

高级卡需要弃牌堆中积累足够的阵营标记才能打出。
**弃牌堆中每张卡贡献 1 个该阵营的标记。**

#### 哪些卡需要阵营标记

| 条件 | 是否需要 |
|------|---------|
| SSR（任意 cost） | ✅ 必须有阵营标记需求 |
| SR 且 cost ≥ 6 | ✅ 必须有阵营标记需求 |
| SR 且 cost < 6 | ❌ 不需要 |
| R（任意 cost） | ❌ 不需要 |

#### 标记类型：持有 vs 消耗

- **持有（check）**：只检查弃牌堆中是否有足够标记，不扣除
  - 适用于：需要"生态链/体系存在"的卡（如虎鲸需要食物链、心脏需要其他器官）
  
- **消耗（consume）**：出牌时从弃牌堆中移除对应数量的标记卡
  - 适用于：需要"利用/消灭"其他生物的卡（如抗生素消灭病原体、病毒劫持宿主细胞）

#### 标记数量参考

```
SSR cost 4-5：  1-2 个标记
SSR cost 6-7：  2-3 个标记
SSR cost 8-10： 3-4 个标记
SR  cost 6-7：  1-2 个标记
SR  cost 8+：   2-3 个标记
```

#### 跨阵营标记

标记不一定要求本阵营！根据科学逻辑设计：
- 病毒类 SSR 可以要求🧬人体系标记（需要宿主）
- 科技类 SSR 可以要求🦠病原系标记（需要对付的敌人）
- 自然系 SSR 通常要求🌱自然系标记（需要生态链）
- 人体系 SSR 通常要求🧬人体系标记（需要体系协同）

### 8. Power Bank 相关设计考虑

Bio Heroes 有 Power Bank 能量储蓄机制：每回合未用完的能量会流入 Power Bank，可以一次性打破释放大量能量出牌。

设计卡牌时需要考虑：
- **高费卡（cost 7+）** 正常情况下难以在一回合内出场，主要通过 Power Bank 爆发来打出
- **向日葵等能量加速卡** 的技能应围绕 Power Bank 充能设计
- **Power Bank 修复技能** 是稀有且强力的——打破后的 Power Bank 不再积攒能量，修复它意味着可以再来一次爆发。适合设计为 SSR 科技系卡的专属技能

### 9. 卡牌字段

每张卡包含以下字段：
```javascript
{
  id: "orca_alpha",                    // 唯一 ID（英文蛇形命名）
  name: "虎鲸·深海霸主",                // 完整中文卡名
  nameEn: "Orca: Apex of the Abyss",  // 英文名
  faction: "nature",                   // 阵营: nature / body / pathogen / tech
  cost: 7,                             // 能量费用: 0-10
  rarity: "SSR",                       // 稀有度: R / SR / SSR
  atk: 8500,                           // 攻击力（必须是500的倍数）
  hp: 9500,                            // 生命值（必须是500的倍数）
  factionRequirement: {                // 阵营标记需求（R卡和低费SR设为null）
    faction: "nature",                 // 需要哪个阵营的标记
    count: 2,                          // 需要多少个
    type: "check",                     // "check"=持有 / "consume"=消耗
    scienceNote: "顶级掠食者需要完整食物链支撑"
  },
  skills: [
    {
      name: "协同猎杀",
      nameEn: "Coordinated Hunt",
      type: "unique",                  // generic(通用) / unique(专属)
      description: "攻击时，场上每有一个其他自然系卡牌，本次攻击额外 +1500 ATK",
      scienceNote: "虎鲸家族成员协同围猎，使用旋转鱼饵球等复杂战术合作捕食"
    }
  ],
  scienceCard: "虎鲸其实是海豚科中体型最大的成员...",
  evolutionFrom: null,
  evolutionTo: null,
}
```

**R 卡和不需要标记的 SR 卡**，`factionRequirement` 设为 `null`。

## 设计流程

### 快速模式（一句话设计）
用户说"帮我做一张蚂蚁卡"或"设计一张2费SR水母"，直接：
1. 确认生物和基本方向
2. 基于科学属性建议 ATK/HP 分配和技能
3. 如果是 SSR 或高费 SR，设计阵营标记需求（faction + count + check/consume + 科学解释）
4. 校验 Power Curve
5. 输出完整卡牌数据

### 互动模式（和孩子一起）
用户说"和孩子一起设计卡"或问孩子参与的问题：
1. 先问孩子想做什么生物（不要直接给答案）
2. 一起聊这个生物有什么特点（引导科学讨论）
3. 让孩子决定关键选择：
   - 这个生物应该是攻击型还是防御型？（影响 ATK/HP 分配）
   - 它的特殊技能是什么？（基于真实科学特点）
   - 给技能起个酷名字！
   - 如果是 SSR：它需要什么"条件"才能登场？（引导理解阵营标记）
4. 校验平衡后输出

### 版本设计模式
用户说"给蚂蚁做几个版本"：
1. 规划版本矩阵（不同费用×稀有度组合）
2. 每个版本讲述生物的不同方面
3. 确保同名限制不冲突（每个版本卡名不同）
4. 科学知识卡覆盖该生物的不同知识点

## 校验清单

输出每张卡时，必须进行以下校验并显示结果：

```
✅ / ❌ ATK 和 HP 都是 500 的整数倍
✅ / ❌ ATK+HP 总和在 cost 范围内
✅ / ❌ 有技能时属性已扣减
✅ / ❌ 费用与稀有度独立（不是简单对应）
✅ / ❌ 技能有科学依据
✅ / ❌ 科学知识卡准确
✅ / ❌ 阵营归属正确（nature/body/pathogen/tech）
✅ / ❌ 阵营标记需求合理（SSR必须有，SR cost≥6必须有，其余为null）
✅ / ❌ 标记类型（check/consume）有科学依据
✅ / ❌ 卡名唯一（不与现有卡重复）
```

## 输出格式

设计完成后，输出两种格式：

### 1. 展示卡（给孩子看的）
```
🐋 虎鲸·深海霸主
━━━━━━━━━━━━━━━
⚔️ ATK: 8500  |  ❤️ HP: 9500
💎 SSR  |  ⚡ Cost: 7
🌱 自然系

🔒 登场条件：弃牌堆中需持有 🌱×2
   「顶级掠食者需要完整食物链支撑」

🎯 技能「协同猎杀」
攻击时，场上每有一个其他自然系卡牌，+1500 ATK

📚 你知道吗？
虎鲸其实是海豚科中体型最大的成员，不是鲸！
不同家族有自己独特的"方言"。
━━━━━━━━━━━━━━━
✅ 平衡校验通过 (ATK+HP=18000, cost 7 上限 25000)
✅ 阵营标记：🌱×2 持有 ✔️
```

### 2. 代码数据（给开发用的）
```javascript
{
  id: "orca_alpha",
  name: "虎鲸·深海霸主",
  nameEn: "Orca: Apex of the Abyss",
  faction: "nature",
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
  skills: [{
    name: "协同猎杀",
    nameEn: "Coordinated Hunt",
    type: "unique",
    description: "攻击时，场上每有一个其他自然系卡牌，本次攻击额外 +1500 ATK",
    scienceNote: "虎鲸家族成员协同围猎"
  }],
  scienceCard: "虎鲸其实是海豚科中体型最大的成员，不是鲸！...",
  evolutionFrom: null,
  evolutionTo: null,
}
```

## 批量设计

用户说"帮我设计一整套植物系"或"设计5张新卡"时：
1. 先规划：列出生物候选名单，标注建议的费用/稀有度分布
2. 确保费用曲线合理（不能全是高费，也不能全是低费）
3. 确保稀有度分布合理（R 多、SR 少、SSR 最少）
4. 对 SSR/高费SR 规划阵营标记需求（注意跨阵营需求的科学合理性）
5. 逐一设计，每张都跑校验
6. 最后汇总一览表（包含标记需求列）

## 科学准确性

这是教育游戏，科学准确极其重要：
- 技能必须基于生物的真实特性（不能给蚂蚁飞行技能）
- 科学知识卡的事实必须准确（如果不确定，搜索确认）
- ATK/HP 的高低要反映生物的真实特点（蓝鲸 HP 最高，病毒 ATK 高但 HP 低）
- 阵营归属必须正确（植物和动物=自然系，细胞和器官=人体系，病毒细菌=病原系，药物技术=科技系）
- **阵营标记的"持有/消耗"和"要求哪个阵营"必须有科学依据**

如果用户或孩子提出的设计在科学上不准确，温和地纠正并解释为什么——这本身就是学习机会。

## 语言

- 和用户的对话以中文为主
- 卡牌名称中文为主，附英文
- 科学知识卡用中文，适合7岁孩子理解的语言
- 技能名称用中文，可以起得酷一点（龙珠风格）
- 阵营标记需求用简洁的描述，如"弃牌堆中需持有 🌱×2"
