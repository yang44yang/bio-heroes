# 题库系统升级计划 —— 通用题库 + 模式选择 + 当天不重复

> 写于 2026-06-28。回应三个诉求：① 题库扩充与多样化（加不绑卡的通用题，降重复）② 功能模式选择（只出卡片相关题 / 出任意题）③ 当天内题目不重复。
> 研究基础：NGSS 小学生命科学 + 中国 2022 科学课标三大生命概念 + 儿童趣味题型；间隔重复 vs 不重复对 6-9 岁记忆的影响；客户端去重/持久化模式；儿童 UX 与家长门。来源见文末。

---

## 0. 现状（先看清再动）

- `src/data/quizzes.js`：**564 道题，每一道都绑定 `cardId`**（schema：`{q, options[4], answer, fact, difficulty, faction, cardId, type, principle?, tags}`）。
- `getRandomQuiz({battleCardIds, streak})`：难度随 streak（连对 3 升 medium、5 升 hard）；**强烈优先**抽 `battleCardIds.includes(q.cardId)` 的题 → 场上就那几张卡、每卡仅 ~3 题 → **同一批题反复出**。
- 去重靠 `usedIndices`（**内存 Set、单局有效、不持久化、跟日期无关**）；`resetQuizHistory()` 每局开战清空 → 跨局、跨天完全不防重复。
- **可复用基建**：`localStorage` 全项目在用；`dailyChallenges.js` 已有 `localDateStr(new Date())` 取本地日期串（每日挑战用）→ **当天 key 直接复用它**。
- **缺**：没有"游戏设置"系统（只有存档导入导出重置）→ 模式开关要新加一个轻量设置存储 + UI。

**三个诉求 → 三块改造**：① 数据层加通用题；② `getRandomQuiz` 加模式 + 当天去重；③ 一个模式开关（设置 + 持久化 + UI）。

---

## 1. 数据层：加"通用题"（不绑卡）

### 1a. Schema（向后兼容，零迁移）
现有题全部隐式视为 `scope:"card"`。新增通用题加两个字段、`cardId:null`：
```js
{ q, options, answer, fact, difficulty,
  scope: "general",        // "card"(默认/现有) | "general"(新)
  category: "C5_microbe",  // 仅 general 题：12 类之一（见 1c）
  cardId: null,            // general 题为 null
  faction: null,           // 可选，跨阵营题留 null
  type, tags }
```
现有 564 题**不动**（无 scope 即按 card 处理，代码里 `q.scope ?? 'card'`）。

### 1b. 文件组织
新建 `src/data/quizzesGeneral.js`（`export const generalQuizzes = [...]`，按 category 分段注释），在 `quizzes.js` 里合并成统一池：`export const quizzes = [...cardQuizzes, ...generalQuizzes]`。好处：通用题独立增长、按类别管理、不把 quizzes.js 撑爆。

### 1c. 12 类通用题分类法（研究产出，对齐 NGSS + 中国课标）
C1 生命特征与分类｜C2 人体与身体｜C3 动物本领与适应｜C4 植物怎么活｜C5 微生物与细胞｜C6 食物链与生态｜C7 共生与关系｜C8 生命周期与繁殖｜C9 进化与远古｜C10 极端生物·生物之最｜C11 五感与行为｜C12 身边的科学与健康习惯。
> 每题尽量做成"为什么/怎么会"的 `mechanism`/`inference` 题（避免纯记忆 trivia），4 选项、干扰项"听起来都像真的"、配一句 7 岁能懂的 `fact` 解释。示例题已在研究输出里备好（每类 2-3 道样题，可直接落地起步）。

### 1d. 规模目标 & 难度配比
- **最低可上线**：每类 ~15 题 → **~180 通用题**（已显著降重）。
- **目标**：每类 30-40 → **~360-480 通用题**，与 564 卡题并存 → 总池 ~900-1000。
- 难度按现有 streak 档大致 easy/medium/hard ≈ 45/35/20 分布。
- **增长方式**：跟着季机制走——每开一个主题季顺带补该主题的通用题（海洋季补 C6/C7、人体季补 C2/C5…），与扩容路线图天然合拍。

### 1e. 版权纪律（重要）
**事实不受版权保护、可自由取用**（"蓝鲸最大""骨头206块"）；**但不可成批照抄**别人题库的题干+选项原措辞，整套题集还可能有汇编版权。流程：读事实→关页面→用自己的话和卡通钩子**原创重写**题干/选项/`fact`→第二来源核对事实。优先取材 NGSS/课标/维基(CC)/博物馆 fun-fact。

---

## 2. 抽题逻辑改造（`getRandomQuiz`）

新签名：`getRandomQuiz({ battleCardIds, streak, mode })`，`mode ∈ {"card","any"}`（默认读设置）。

### 2a. 模式（对应诉求②）
- **`mode:"card"`（只出卡片相关）**：仅从 `scope:"card"` 且 `battleCardIds.includes(cardId)` 的题里抽（≈ 现有行为，但叠加当天去重）。场上无匹配题时回退到任意 card 题。
- **`mode:"any"`（出任意题，**推荐默认**）**：软混合而非硬切——
  - 若场上有可匹配的卡题，**保证本局至少 1 道"关于你这张卡"的题**（玩法即学习的"这是关于你的蓝鲸"时刻）；
  - 其余按 **~70% 卡相关 / 30% 通用** 加权抽；可匹配题不足时平滑滑向通用，**绝不为凑比例硬塞不相关卡题**。
- 难度筛选（streak）逻辑保留，叠加在模式之上。

### 2b. 当天不重复（对应诉求③）
- 维护**当天已出题 id 集合**，date-keyed 存 `localStorage`：key = `bh.quiz.seen.<localDateStr()>`（复用 dailyChallenges 的 `localDateStr`）→ **新的一天自动换 key、旧记录失效，无需定时器/午夜 cron**（Wordle 同款技巧）。抽题时排除当天已出；`markSeen(id)` 抽后写入。
- 需要每题有稳定 **id**（现有题无 id）：用稳定下标或给每题派生 `qid`（如 `card:<cardId>:<n>` / `gen:<category>:<n>`，或直接用合并池 index——但 index 会随增删漂移，**建议给每题加显式 `id` 字段**或用 `tags.join`+hash 生成稳定 id）。← 实现时定。
- **池子抽干的优雅降级**（别让 7 岁撞墙）：当天可选题为空时，按优先级放宽 → ① 先放宽"当天已出"里**最久没出**的；② 始终返回一道题，绝不卡住战斗。把重复当"复习"，正好是间隔重复的好处。

### 2c. （可选 v2）跨天间隔重复 —— Leitner-lite
研究结论：对 6-9 岁，**纯不重复不是最优，间隔重复更利记忆**。v2 给每题一个 4 档盒子（box 0-3，答对后下次可见间隔 +1/+3/+7/+14 天，答错回 box 0 明天再来），存 `bh.quiz.srs`。选题池 = `nextDate<=今天` 且不在当天已出。**v1 不做，先上"当天不重复 + 模式"**；v2 作为后续记忆强化升级。

---

## 3. 模式开关（UI + 持久化）

- **持久化**：新增轻量设置存储 `bh.settings.quizMode`（localStorage，默认 `"any"`）。可顺手开一个 `useSettings` 小 hook 或并进 saveManager。
- **默认**：`"any"`（软混合）——大多数孩子不用碰开关，系统自动"该相关时相关、该多样时多样"。
- **开关 UX**（儿童友好）：
  - 给孩子的：**战前界面**一对大图标按钮 `🃏 这场的卡` / `🌍 所有生物`（≥48dp、选中态明显），一眼可选，不藏菜单。
  - 给家长的持久设置（默认模式/难度/重置进度）：放"设置/存档管理"，可选加**家长门**（如 `7×8=?` 简单算术）防孩子乱改。**只门住持久配置，不门住战前那个爽快的图标切换。**
- 接线：`useBattle.tryQuiz` 调 `getRandomQuiz` 时把当前 `mode` 传进去。

---

## 4. 测试 + 验证

- `getRandomQuiz` 是纯函数（依赖 localStorage → 测试里 mock 或注入 seen-set）；新增 `scripts/test-quiz-system.mjs`：
  - 通用题 schema 校验（scope/category/cardId:null/4 选项/answer 合法/有 fact）。
  - `mode:"card"` 只出卡相关；`mode:"any"` 软混合且场上有匹配卡时保证 ≥1 卡题。
  - 当天去重：同一天连抽 N 次不出重复（到池子抽干才降级）；跨天（换 date key）可重新出。
  - 降级：当天抽干 → 仍返回题、不抛错。
- `npm run build` 绿 + 全套零回归 + `vite preview` 真机：连打几局看是否还反复同题、切模式生效、跨天重置。

---

## 5. 分阶段落地

**Phase 1（机制先行，能玩起来）**
1. Schema 加 `scope/category`（兼容现有）+ 新建 `quizzesGeneral.js`。
2. 先写**一批通用题起步**（建议 ~60-90 道，挑 3-4 个高价值类别：C2 人体 / C6 食物链 / C10 生物之最 / C12 健康习惯——最贴近 7 岁 + 最像"有趣冷知识"），证明管线。
3. 改 `getRandomQuiz`：模式参数 + 当天去重（date-keyed seen-set）+ 降级。
4. 模式开关：设置存储 + 战前图标对 + `useBattle` 接线。
5. 测试 + build + 真机。

**Phase 2（内容生长 + 记忆强化，跟着季走）**
6. 把通用池从 ~180 补到 ~360-480（每季补该主题类别）。
7. （可选）Leitner-lite 跨天间隔重复 v2。
8. 与决策⑦"legacy 题一次性改写"合流：改写出来的好题，部分可脱卡变成通用题。

---

## 6. 与既有计划/决策的关系

- **决策 ⑦（legacy 题一次性全改）**：本计划是它的"出口"——改写后脱卡的好题进通用池；二者一起做最省。
- **季机制（expansion-roadmap）**：通用题按类别跟季补充（海洋季→C6/C7，人体季→C2/C5），不是一次性堆。
- **批 0 / dex 框架**：模式开关的"设置存储"可与 dex/设置 UI 一起搭骨架。
- **教育护城河（card-pool-report §6）**：通用题让"题型偏记忆"有机会结构性改善（新题主打 mechanism/inference）。

---

## 7. 决策记录（齐齐/Yang 2026-06-28 定）→ 锁定 Phase 1 范围

| 决策 | 选择 |
|---|---|
| 默认模式 | **`any` 软混合**（场上有卡保证 ≥1 卡题 + ~70/30 卡/通用） |
| 通用题首批 | **~60-90 道起步**，挑高价值类别 **C2 人体 / C6 食物链 / C10 生物之最 / C12 健康习惯**（~20 道/类 × 3-4 类），先证明管线、后续跟季补 |
| 间隔重复 | **先不做**——v1 只做"当天不重复"；Leitner v2 押后 |
| 模式开关位置 | **放设置/存档屏 + 家长门**（如 `7×8=?`），一次设定持久生效；**不做战前图标切换** |

**锁定的 Phase 1 工作清单**：
1. Schema 加 `scope`/`category`（兼容现有 564 题）+ 新建 `src/data/quizzesGeneral.js`。
2. 写 **~60-90 道通用题**（C2/C6/C10/C12，全原创，三档难度，mechanism/inference 为主）。
3. 给每题加稳定 `id`（当天去重要用）；`quizzes.js` 合并 `[...cardQuizzes, ...generalQuizzes]`。
4. 改 `getRandomQuiz({battleCardIds, streak, mode})`：`any` 软混合 + `card` 纯卡；**当天去重**（date-keyed `localStorage` seen-set，复用 `localDateStr`）+ 抽干优雅降级。
5. 设置存储 `bh.settings.quizMode`（默认 `any`）+ 设置屏开关 + 家长门；`useBattle.tryQuiz` 传 `mode`。
6. `scripts/test-quiz-system.mjs`（schema / 模式 / 当天去重 / 降级）+ build + 真机。

> Phase 2（押后）：通用池补到 ~360-480（跟季）、Leitner 间隔重复、与决策⑦ legacy 改写合流。

## 来源
题库与题型：[NGSS K-5 Topics](https://www.nextgenscience.org/sites/default/files/K-5Topic.pdf) · [中国2022科学课标解读](http://www.jyb.cn/rmtzcg/xwy/spxw/202208/t20220803_703211.html) · [WeAreTeachers 儿童科学题](https://www.weareteachers.com/science-trivia-facts/) · [题目版权（事实不受保护）](https://newmediarights.org/business_models/artist/are_facts_copyrighted)
调度与 UX：[间隔重复教学指南](https://thirdspacelearning.com/us/blog/spaced-repetition/) · [儿童检索练习记忆研究 PMC11087082](https://pmc.ncbi.nlm.nih.gov/articles/PMC11087082/) · [localStorage 日期 key（Wordle 模式）](https://blog.logrocket.com/localstorage-javascript-complete-guide/) · [儿童 UX 与家长门](https://www.uxmatters.com/mt/archives/2020/01/ux-design-for-kids-key-design-considerations.php)
