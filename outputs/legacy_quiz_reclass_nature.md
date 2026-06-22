# Legacy 题库精修 — 自然系 (nature) 试点

> 对 180 道 legacy 老题重新分类。本文件是**自然系 46 题**的试点提案（尚未写入 quizzes.js）。
> 规则（Yang 已校准）：**type 严格按认知动作**；**principle 能套就补、套不上留空**；tags 换成语义内容标签（保留 `legacy` 标记不动，因 validate 脚本靠它排除老题的答案位置/选项长度偏置统计）。

## 分类规则

| type | 认知动作 | 触发词 |
|------|---------|--------|
| **memorization** | 回忆一个事实（哪怕很冷门/很难） | 是什么 / 多少 / 哪个 / 哪里 / 有没有 / 能不能 / 会怎样(回忆结果) |
| **mechanism** | 解释某个过程怎么运作、为什么 | 为什么 / 怎么 / 因为什么 |
| **inference** | 把原理套到新场景去判断/预测（多步推理） | 如果…会怎样(需自己推) / 用原理判断 |

principle（仅核心承载时补）：`mechanism` / `tradeoff`(取舍) / `homeostasis`(稳态) / `coevolution`(协同演化)

## 头号发现 ⚠️

**严格按认知动作分类后，自然系 46 题里 42 题是 memorization、4 题 mechanism、0 题 inference。**

原来的 1:1 难度映射（easy→mem / medium→mech / hard→inf）把大量「冷门事实题」错标成了 mechanism/inference。真相是：**自然系老题库 ~90% 是事实回忆题（趣味冷知识），几乎没有真正的机制题和推理题。** 这不是 bug，是老题库的真实质量画像——也说明「原理理解」这条线基本靠新的 300 题在扛。

**含义**：本轮只做「诚实重标」。若你想让老题库也承担原理教学，那是另一个更大的活——把部分 trivia 题**改写**成 mechanism/inference（要重写题干+选项），我可以之后单独做。

## 完整提案（46 题，#=全局 legacy 索引）

`Δ` = type 有变化；🚩 = 机制/推理边界，想听你的判断

| # | 卡 | 问题 | 现 type | → 新 type | principle | tags(除legacy) |
|---|----|------|---------|-----------|-----------|------|
| 0 | ant | 怎么告诉同伴食物位置(信息素) | mem | mem | – | ant, communication |
| 1 | ant | 能举起体重多少倍(50) | mech | **mem** Δ | – | ant, strength |
| 2 | ant | 切叶蚁树叶怎么处理(种蘑菇) | inf | **mem** Δ | coevolution | ant, fungus_farming |
| 3 | ant | 蚂蚁睡觉吗(250次小盹) | inf | **mem** Δ | – | ant, sleep |
| 4 | ant | 数量最多的昆虫(蚂蚁) | mem | mem | – | ant, abundance |
| 5 | mimosa | 被碰会怎样(合拢) | mem | mem | – | mimosa, touch_response |
| 6 | mimosa | 反复碰会怎样(习惯不合拢) | inf | **mem** Δ | – | mimosa, habituation |
| 7 | mimosa | 合拢是因为什么(叶枕失水) | inf | **mech** Δ | mechanism | mimosa, turgor |
| 8 | mimosa | 植物能听到声音吗(感知振动) | inf | **mem** Δ | – | plant, sound_sensing |
| 9 | bee | 蜇人后会怎样(会死) | mem | mem | tradeoff | bee, stinger |
| 10 | bee | 怎么告诉同伴花位置(8字舞) | mech | **mem** Δ | – | bee, waggle_dance |
| 11 | bee | 一辈子酿多少蜜(一茶匙) | mech | **mem** Δ | – | bee, honey_scale |
| 12 | bee | 能看到什么光(紫外线) | inf | **mem** Δ | – | bee, uv_vision |
| 13 | jellyfish | 身体多少是水(95%) | mem | mem | – | jellyfish, water_content |
| 14 | jellyfish | 哪种能永生(灯塔水母) | inf | **mem** Δ | – | jellyfish, immortality |
| 15 | jellyfish | 有大脑吗(没有) | mem | mem | – | jellyfish, no_brain |
| 16 | jellyfish | 射毒针多快(700纳秒) | inf | **mem** Δ | – | jellyfish, nematocyst |
| 17 | jellyfish | 最毒的动物(箱形水母) | mech | **mem** Δ | – | jellyfish, venom |
| 18 | sunflower | 追着什么转(太阳) | mem | mem | – | sunflower, heliotropism |
| 19 | sunflower | 小花排列什么规律(斐波那契) | inf | **mem** Δ | – | sunflower, fibonacci |
| 20 | sunflower | 有多少朵小花(上千) | mech | **mem** Δ | – | sunflower, composite_flower |
| 21 | electric_eel | 放多少伏特(860) | mech | **mem** Δ | – | electric_eel, voltage |
| 22 | electric_eel | 其实是什么鱼(裸背电鱼) | inf | **mem** Δ | – | electric_eel, taxonomy |
| 23 | electric_eel | 还用电做什么(探路) | mech | **mem** Δ | – | electric_eel, electrolocation |
| 24 | cheetah | 最快速度(120) | mem | mem | – | cheetah, speed |
| 25 | cheetah | 高速能持续多久(30秒) | mech | **mem** Δ | tradeoff | cheetah, overheating |
| 26 | cheetah | 尾巴有什么作用(方向盘) | mem | mem | – | cheetah, tail_balance |
| 27 | venus_flytrap | 碰几次才合拢(2次) | mech | **mem** Δ | – | venus_flytrap, trigger_count |
| 28 | venus_flytrap | 怎么消化虫子(消化液) | mech | mech | mechanism | venus_flytrap, digestion |
| 29 | venus_flytrap | 为什么要吃虫子(土壤缺营养) | inf | **inf**(保留) | – | venus_flytrap, carnivory, nutrients |
| 30 | orca | 属于什么科(海豚科) | mech | **mem** Δ | – | orca, taxonomy |
| 31 | orca | 用什么交流(方言) | inf | **mem** Δ | – | orca, dialect |
| 32 | orca | 怎么把海豹弄下水(造浪) | mech | mech | mechanism | orca, wave_hunting |
| 33 | orca | 家庭结构(母系社会) | mech | **mem** Δ | – | orca, matriarchy |
| 34 | blue_whale | 最大的什么(动物) | mem | mem | – | blue_whale, largest |
| 35 | blue_whale | 宝宝出生多长(7米) | mech | **mem** Δ | – | blue_whale, calf_size |
| 36 | blue_whale | 深潜心跳几次(2次) | inf | **mem** Δ | homeostasis | blue_whale, dive_response |
| 37 | blue_whale | 主要吃什么(磷虾) | mem | mem | – | blue_whale, krill_diet |
| 38 | ant | 几条腿(6) | mem | mem | – | ant, insect_anatomy |
| 39 | sunflower | 种子能做什么(榨油) | mem | mem | – | sunflower, seed_use |
| 40 | cheetah | 和豹子同种吗(不是) | mem | mem | – | cheetah, species |
| 41 | electric_eel | 生活在哪里(亚马逊) | mem | mem | – | electric_eel, habitat |
| 42 | blue_whale | 叫声传多远(上千公里) | mech | **mem** Δ | – | blue_whale, song_range |
| 43 | mimosa | 有毒吗(轻微) | mech | **mem** Δ | – | mimosa, toxicity |
| 44 | bee | 采一瓶蜜飞多远(绕地球1.5圈) | inf | **mem** Δ | – | bee, foraging_scale |
| 45 | orca | 有天敌吗(几乎没有) | mem | mem | – | orca, apex_predator |

## 统计（#29 经 Yang 校准为 inference）

- type 变化：**28/46**（mech→mem 14、inf→mem 12、inf→mech 1 #7、inf 保留 1 #29）
- 新分布：memorization **42** / mechanism **3**(#7,28,32) / inference **1**(#29)
- 补 principle：7 题（coevolution×1 #2、tradeoff×2 #9,25、homeostasis×1 #36、mechanism×3 #7,28,32）

## 可改写候选 ✏️（Yang：「顺便标记可改写的」）

这些题现在是 trivia(memorization)，但**暗含一个值得教的原理**——若改写题干为「为什么/怎么」就能升级成 mechanism/inference，填补老题库的原理教学缺口。建议作为之后单独的内容升级任务：

| # | 现题(trivia) | 暗含原理 | 改写方向 |
|---|------|---------|---------|
| 2 | 切叶蚁怎么处理树叶(种蘑菇) | coevolution(蚁-菌互利共生) | →「切叶蚁和蘑菇谁也离不开谁，这叫什么关系？」(inference) |
| 9 | 蜜蜂蜇人后会怎样(会死) | tradeoff(防御以命为代价) | →「为什么蜜蜂蜇一次就活不成了？」(mechanism: 倒钩刺) |
| 12 | 蜜蜂能看到什么光(紫外线) | coevolution(花-蜂紫外信号) | →「为什么很多花在紫外线下才显出图案？」(inference) |
| 25 | 猎豹高速能持续多久(30秒) | tradeoff(速度 vs 过热) | →「为什么猎豹追猎物追一会儿就得停下？」(mechanism) |
| 36 | 蓝鲸深潜心跳几次(2次) | homeostasis(潜水反射省氧) | →「为什么蓝鲸深潜时心跳要慢下来？」(inference: 省氧) |

> 注：这是**新增题**还是**改写原题**由 Yang 定。改写会动 q/options/answer/fact，属内容活，不在本轮「重分类」范围。
