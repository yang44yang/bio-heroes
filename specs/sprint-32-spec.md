# Sprint 32 Spec: ch2 题库扩充 + 题型分级

> **Notion 同步**: https://www.notion.so/355264d1849281f1af1ff6895fe7065f
> **本地版本**: 本文件,作为 Claude Code 主要读取源
> **目标**: 把题库从"知识点收集"升级为"原理理解"
>
> **范围**: ch2 病原侵袭篇涉及的所有卡牌(~51 张)题库扩充 + 全部题目按教育大纲三层分级
>
> **不在本 Sprint**: ch3/ch4 卡牌补全(等 ch2 验证完做)、旧 180 题升级(框架定后下个 sprint)
>
> **预估**: 4-6 小时

---

## 当前题库诊断

| 维度 | 现状 | 目标 |
|---|---|---|
| 总题数 | 180 | ~330 (+150) |
| 卡牌覆盖 | 40/120 (33%) | ch2 全覆盖 51/51 |
| 难度分布 | Easy 38% / Med 34% / Hard 27% | 35% / 40% / 25% |
| 题型 | 70% 趣事题 | 加入 mechanism / inference 标签 |

**问题诊断**: 当前 easy 题大量是"趣事"(数字/记忆),跟新教育大纲(异养vs自养、机制即知识、资源取舍)对不上。Sprint 32 不只是补题,是给题库换"骨架"。

---

## Part 1: 新题型分级体系

### 1.1 三层结构

所有题目必须明确归类到三层之一:

| 层级 | 标签 | 占比 | 教育目标 | 7岁能否答出 |
|---|---|---|---|---|
| 🟢 基础题 | `type: 'memorization'` | 35% | 是什么/属于哪类/做什么用 | 是,直觉答 |
| 🟡 机制题 | `type: 'mechanism'` | 40% | 怎么工作/为什么这样设计 | 想想能答 |
| 🔴 推理题 | `type: 'inference'` | 25% | 应用/迁移/原理判断 | 需要理解原理 |

### 1.2 题目数据结构升级

```javascript
// 旧结构
{ q, options, answer, fact, difficulty, faction, cardId }

// 新结构(向后兼容,旧字段保留)
{ 
  q, options, answer, fact, 
  difficulty,    // easy / medium / hard (跟 type 强相关但不强绑定)
  faction, 
  cardId,        // 主关联卡
  type,          // 'memorization' | 'mechanism' | 'inference' (新增)
  principle,     // 'heterotroph_vs_autotroph' | 'mechanism' | 'tradeoff' | null (新增可选)
  tags,          // ['ch2', 'immune', 'pathogen'] 等用于筛选(新增可选)
}
```

### 1.3 题型设计指南

#### 🟢 基础题 (memorization)
- 答案在 scienceCard 里能直接找到
- 选项之间差异明显
- **每张卡 1 题**

例:
```javascript
Q: 白细胞主要做什么?
A. 运输氧气  B. 吞噬病菌 ✓  C. 凝血
fact: 白细胞是免疫系统的主力,会吞噬入侵的病原体。
type: 'memorization'
```

#### 🟡 机制题 (mechanism)
- 问"为什么"或"怎么工作"
- 答案需要理解机制,不只是记忆
- **每张卡 1-2 题**

例:
```javascript
Q: 为什么白细胞要"穿过"血管壁去伤口?
A. 血管太小装不下  
B. 病菌大多在血管外的组织里 ✓  
C. 白细胞迷路了
fact: 白细胞通过"趋化性"沿化学信号穿过血管壁,因为感染发生在组织里。
type: 'mechanism'
principle: 'mechanism'
```

#### 🔴 推理题 (inference)
- 给情境,需要应用原理判断
- 没有标准记忆答案,要思考
- **每张卡 1 题**

例:
```javascript
Q: 你看到伤口红、肿、热,这说明什么?
A. 伤口在恶化,要去医院  
B. 白细胞正在战斗,身体在自我保护 ✓  
C. 伤口被感染了无法救
fact: 红肿热是炎症反应,是免疫系统正在工作的标志,不是疾病恶化。
type: 'inference'
principle: 'mechanism'
```

### 1.4 教育大纲第一性原理标签 (`principle`)

可选字段,标记题目对应的根本原理:

- `heterotroph_vs_autotroph`: 异养(动物/病原)vs 自养(植物)
- `mechanism`: 机制即知识(为什么这个生物能做这个事)
- `tradeoff`: 资源取舍(在限制下如何选择)
- `coevolution`: 共同进化(攻防博弈)
- `homeostasis`: 平衡稳态(维持内环境稳定)
- `null`: 暂无明确归类

这个字段让 Phase C 小测验**可以按教育目标抽题**,不只是按卡牌:

```javascript
// Phase C 增强版
const quiz = pickQuizFor(card, { preferType: 'mechanism', preferPrinciple: 'tradeoff' })
```

---

## Part 2: ch2 卡牌覆盖目标

### 2.1 ch2 涉及的卡牌(~51 张)

#### 敌方 pathogen (10 张)
```
ch2-1 蛀牙军团:    cavity_bacteria
ch2-2 食物中毒:    salmonella, ecoli_thug  
ch2-3 流感风暴:    flu_virus (已有 7 题,只补机制/推理题)
ch2-4 蚊媒双煞:    dengue_fever, plasmodium_parasite
ch2-5 狂犬危机:    rabies_virus
ch2-6 疫苗两难:    smallpox_ghost
ch2-7 抗生素滥用:  mrsa_invincible
ch2-8 BOSS:        covid_overlord
```

#### 玩家 body 阵营 (~19 张)
免疫系统、消化系统、呼吸系统、循环系统的主力卡(具体列表参考 cards.js)

#### 玩家 tech 阵营 (~22 张)
抗生素、疫苗、诊断工具、防护用品、止痛药等(具体列表参考 cards.js)

### 2.2 每张卡的题目数量

| 卡的状态 | 处理 | 估算 |
|---|---|---|
| 已有 ≥3 题的卡 | 补 1-2 道机制/推理题(如缺) | ~10 张 → +15 题 |
| 已有 1-2 题的卡 | 补足到 3 题(确保三层齐全) | ~30 张 → +60 题 |
| 完全没题的卡 | 新建 3 题(基础/机制/推理各一) | ~25 张 → +75 题 |

**估计总新增: 150 题**,题库 180 → 330

---

## Part 3: 实施流程(混合 AI + 手动)

### 3.1 工作分工

| 题型 | 主要责任 | 流程 |
|---|---|---|
| 🟢 基础题 | Claude Code 批量生成 | 读 cards.js 的 scienceCard → 自动出题 → 人工 spot check |
| 🟡 机制题 | Claude Code 初稿 + Yang review | AI 生成草稿 → Yang 看是否合理 → 必要时改写 |
| 🔴 推理题 | Yang 设计为主 | Yang 给情境框架 → AI 填选项 → Yang 校正 |

### 3.2 标准流程

```
Step 1: Claude Code 读取 cards.js,导出 ch2 涉及卡牌列表 + 每张卡当前题数
        输出: ch2_quiz_audit.md(放到 outputs/)
        Yang review:确认卡牌列表对不对

Step 2: Claude Code 批量生成基础题(memorization)
        - 对每张缺基础题的卡,基于 scienceCard 生成 1 道
        - 选项 A/B/C,正确答案明确,fact 用 scienceCard 的核心句
        - 输出到 quizzes_draft_ch2_easy.js

Step 3: Yang spot check 抽 10 道基础题看质量
        - 选项是否清晰、答案是否唯一、fact 是否准确
        - 不通过 → Claude Code 调整生成 prompt 重做
        - 通过 → 合并到 quizzes.js
        commit

Step 4: Claude Code 生成机制题草稿
        - prompt 包含教育大纲指引("问'为什么这样工作',不要问'是什么'")
        - 输出到 quizzes_draft_ch2_mechanism.js
        - 建议每题加一行注释说明这题对应的机制

Step 5: Yang review 机制题(全数)
        - 这是 Sprint 32 的核心质量关
        - 标记 ✓ / 改写 / 删除
        - 改写后的版本合并
        commit

Step 6: Yang 设计推理题框架(可以跟 Claude 一起头脑风暴)
        - 每张卡给一个情境
        - 例: 抗生素卡 → "小孩感冒发烧三天,你建议吃抗生素吗?"
        - 例: 疫苗卡 → "有人说疫苗会让人生病,这对吗?"
        - Yang 写题干 + 期望答案,Claude 填错误选项 + fact

Step 7: Yang review + 合并推理题
        commit

Step 8: 题库整体校验脚本
        - 检查每张 ch2 卡是否都有 3 层题
        - 检查 type 字段是否齐全
        - 检查无重复题目
        - 输出 audit report
        commit
```

**总预估: 4-6 小时**(Yang 的 review 时间是关键变量)

---

## Part 4: AI 出题 prompt 模板

给 Claude Code 用的标准 prompt(放到 spec 里方便调整):

### 基础题 prompt

```
基于卡牌 {cardId} 的 scienceCard 内容,出 1 道**基础题**(memorization 类):

要求:
- 答案必须能在 scienceCard 里直接找到
- 7 岁小朋友能答出
- 4 个选项,1 个正确
- 错误选项要合理但明显错(不要选项太接近)
- fact 字段用 scienceCard 的关键句

禁止:
- 不要出"这个生物多少年前出现"这种纯历史题
- 不要出需要查资料才能答的细节题
- 不要让两个选项都"看起来对"

输出 JSON 格式:
{
  q, options: [...4个], answer: 正确选项 index,
  fact, difficulty: "easy", faction, cardId,
  type: "memorization"
}
```

### 机制题 prompt

```
基于卡牌 {cardId} 的技能描述 + scienceCard,出 1 道**机制题**(mechanism 类):

要求:
- 问"为什么"或"怎么工作",不是"是什么"
- 答案需要小朋友理解机制,不只是记住事实
- 涉及到该生物的核心生物学原理
- 4 个选项,错误选项是常见误解

例: 不要问"白细胞做什么"(这是基础题)
     要问"为什么伤口会红肿热"或"白细胞为什么要穿过血管"

输出 JSON 格式:
{
  q, options, answer, fact, difficulty: "medium", 
  faction, cardId, type: "mechanism",
  principle: 选填("mechanism" | "tradeoff" | "coevolution")
}
```

### 推理题 prompt

```
基于 Yang 提供的情境框架 + 卡牌 {cardId} 的原理,补全选项和 fact:

情境框架: {Yang 提供}
期望答案逻辑: {Yang 提供}

要求:
- 错误选项要是常见误解或直觉错误答案
- 答案需要理解原理后才能选对
- fact 要点出原理,不只是说"对"

输出 JSON 格式:
{
  q, options, answer, fact, difficulty: "hard",
  faction, cardId, type: "inference",
  principle: ...
}
```

---

## Part 5: 实施顺序

```
Step 1: 题库审计脚本
        - Claude Code 读 cards.js,统计 ch2 涉及卡的题目分布
        - 输出 ch2_quiz_audit.md 给 Yang review
        commit

Step 2: 批量生成基础题 (easy / memorization)
        - 对所有缺基础题的 ch2 卡生成
        - 输出 draft 文件
        commit

Step 3: Yang spot check 基础题(抽 10 道)
        - 通过则合并到 quizzes.js
        - 不通过则调整 prompt 重做
        commit

Step 4: 批量生成机制题 (medium / mechanism)
        - 用机制题 prompt
        - 输出 draft
        commit

Step 5: Yang review 机制题(全数)
        - 改写 / 删除 / 通过
        - 合并到 quizzes.js
        commit

Step 6: 设计推理题(Yang + Claude 协作)
        - Yang 给情境,Claude 填选项
        - 一张卡一道
        commit

Step 7: 给所有 ch2 题加 type / principle / tags 字段
        - 旧的 ch2 题也要加(向后兼容旧逻辑)
        commit

Step 8: 校验脚本 + 题库报告
        - 每张 ch2 卡 3 层题齐全 ✓
        - type 字段齐全 ✓
        - 无重复题 ✓
        commit
```

---

## Part 6: Phase C 联动

Sprint 32 完成后,Phase C(Sprint 31c Step 5-6)的小测验**质量大幅提升**:

```javascript
// Sprint 31c Step 5 升级版
function pickQuizForCard(card, options = {}) {
  const candidates = quizzes.filter(q => 
    q.cardId === card.id || 
    (q.relatedFaction && q.relatedFaction === card.faction)
  )
  
  // 偏好机制题或推理题(更有教育价值)
  const preferred = candidates.filter(q => 
    q.type === 'mechanism' || q.type === 'inference'
  )
  
  return preferred.length > 0
    ? preferred[Math.floor(Math.random() * preferred.length)]
    : candidates[Math.floor(Math.random() * candidates.length)]
}
```

齐齐抽到"白细胞",看到的题不再是"白细胞做什么"(她已经会了),而是"为什么伤口会发炎"或"看到红肿热说明什么"——**真实学习场景**。

---

## Part 7: 验证清单

```
□ ch2 涉及的所有 ~51 张卡都有 ≥3 题
□ 每张卡都有 1 道 memorization + 1 道 mechanism + 1 道 inference
□ 题目总数从 180 增加到 ~330
□ 所有 ch2 题都有 type 字段
□ 机制题确实问"为什么/怎么工作",不是问"是什么"
□ 推理题需要应用原理才能答对(不是死记硬背)
□ Yang 抽样 10 道题,质量 ≥ 当前题库
□ 校验脚本通过(无重复、字段齐全)

齐齐亲自试:
□ 抽到 ch2 卡触发小测验时,题目跟卡相关
□ 题目难度梯度感觉合理(不是全 easy 也不是全 hard)
□ 答错时给的解释能让她"哦原来是这样"
```

---

## Part 8: 工作量预警

Sprint 32 是"内容工程"sprint,Yang 的 review 是关键:

- **Step 3 spot check**: 30 分钟
- **Step 5 机制题 review**: 90-120 分钟(全部 ~75 道)
- **Step 6 推理题设计**: 60-90 分钟(全部 ~50 道)
- Claude Code 执行: 1-2 小时

**预估 4-6 小时**,但 Yang 实际投入时间 2-3 小时。可以分两天做。

---

## Part 9: 未来扩展(不在 Sprint 32)

- **Sprint 33**: ch4 科技觉醒篇题库扩充(同样 51 卡 × 3 题 = +150 题)
- **Sprint 34**: ch3 生态危机篇题库扩充(自然系卡)
- **Sprint 35**: 旧 180 题升级(加 type 字段、把趣事题升级为机制题)
- **Phase D 联动**: 题目有 type 后,可以做"难度自适应"——齐齐答对机制题就给推理题,反之回退

---

*Spec 版本: v1.0 · 2026年5月3日*  
*Sprint 32 = ch2 题库扩充 + 题型分级 + 教育大纲对齐*
