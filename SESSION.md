# Bio Heroes Session State
> 更新时间: 2026-07-17（**P1 PvP：地基已发布 + 引擎 de-fork 做到 S4/S7**。前 6 个 commit 已 push + deploy 并逐项验证。de-fork 的 S0-S4 已 commit、**未发布**。47 套测试绿。）
>
> ⚠️ **本文件只留「活的交接」**——历史阶段已归档到 `CHANGELOG.md`，逐 commit 细节在 git。别再让它膨胀（精简纪律见 CLAUDE.md）。

## 项目位置
- **实际路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）· **GitHub**: yang44yang/bio-heroes (main)
- **工作流**: 直接在 main 工作和 push
- **生产**: `bio.socialcontract.capital`（`npm run deploy`）。⚠️ **齐齐玩这个**（PWA 主屏）。Vercel 随 push 自动部署，作海外镜像
- **CI**: `.github/workflows/ci.yml` —— push/PR 到 main 跑 lint→test→build

---

## 🔨 进行中：P1 PvP · 引擎 de-fork（8 步，已完成 5 步）

**已决**（`DEPLOY.md §4` 现在是权威，已改写）：房间码 + VPS 哑中继 + **host 权威** + **WebSocket**（选 WS 不是偏好，是 sw.js 逼的）+ 零依赖 · 公平模式 · 答题中性加成 · 三条不变量。
**已决**（本次会话，用户裁定）：**de-fork 引擎**（否决「硬化 AI 接缝」）· 相位机与之捆绑 · 答题**各端只记自己的 Leitner**、streak 按方计分、奖励中性 · S4/S5 的平衡变化**先原样上、等齐齐实打再调**。

### 完整 8 步计划（9-agent 设计+对抗评审的产物）
| | 步骤 | 状态 |
|---|---|---|
| S0 | 玩家侧回调收口读 `battleStateRef`（**de-fork 的前提**） | ✅ `614dfa4` |
| S1 | gate 抽成 side 参数化纯谓词 `engine/rules.js` + `sides.js` | ✅ `4cba729` |
| S2 | 回合标记进 reducer 每侧数组 + 干掉「先标后滚」舞蹈 | ✅ `3e4e606` |
| S3 | `activeSide` + 每侧 `phase` + `derivePhase` + 驱动敌方阶段（不设 gate） | ✅ `1fdbed6` |
| S4 | de-fork `playToField` —— AI 第一次受能量/阵营/槽位约束 | ✅ `afd933a` |
| **S5** | de-fork `attack`（**守护优先 + 一卡一次 第一次约束 AI**） | ⬜ **下一步** |
| S6 | de-fork `playEventCard` + **修 tryTriggerSp 的真 SP fork** | ⬜ |
| S7 | 镜像测试 + 棘轮（让 de-fork 保持 de-forked） | ⬜ |

### ⚠️ 开工 S5 前必读
1. **返回形：`gameWon`(attack) 与 `gameOver`(aiAttack) 是同一个概念的两个名字** —— 都是「行动方刚赢了」。唯一消费者 `useAITurn:204`；BattleScreen **从不读 gameWon**（已 grep）。**绝不采用「gameOver = 本侧输」** —— 那会让 `attack('enemy')` 打死玩家主人时返回 `gameOver:false` → break 永不触发 → AI 在失败画面上继续挥砍。
2. **`checkBossHPThreshold`（`useBattle.js:~303-322`）硬编码读 `enemy.leaderHp` + `setEnemyField`**，由 attack 的 leader 分支调用。**必须保持 `if (side === 'player')`**，否则 `attack('enemy')` 会拿错误的主人触发 Boss 台词/阶段转换。
3. **删掉 `canCardAttack` 的 `checkAttacked` 参数**（`combat.js`）—— 这个参数存在的唯一理由就是让 aiAttack 弃权。删掉它就是 de-fork 在一个签名里的表达。同步更新 `test-combat-resolve.mjs`。
4. **confused 分支分叉**：`attack` 写 attacked 并返回 `{confusedHit:true}`；`aiAttack` 返回 `{skipped:false, confusedHit:true}` 且**不**写标记。统一后 AI 的混乱卡会被标记 —— 正确，但是行为变化。
5. **敌方技能浮字首次出现**：aiAttack 丢弃 `handlePostAttackSkills` 的返回。统一后敌方的压制/穿透浮字会第一次被喂进 BattleScreen。不是崩溃，是节奏变化。
6. ⚠️ **AI 会变弱**（守护第一次约束它）—— 用户已裁定「先原样上，等齐齐实打再调」。**S5 单独发布、单独试玩**。

### 📌 S0-S4 的经验（会再咬人）
- **实机验证不可省**：S4 我自己引入过一个回归 —— `preplaceCard` 不打日志 → 开局那张敌方卡**凭空出现、无任何日志解释**。47 套测试全绿，只有看日志开头才发现。
- **计划也会错**：它说 `BattleScreen:404` 直接改指向 `preplaceCard` —— 但旧路径会触发 onPlay，而 cost≤1 生物卡 24 张里 **11 张带 onPlay**。照做会静默丢掉近一半开局卡的技能。正解是抽 `runOnPlaySkills`：一份实现、两个调用方。
- **eslint 的 `no-undef` 真的有用**：S4 当场抓住我漏 import 的 `opp`。

### 🚫 计划裁定的「不要做」（都经源码核实）
- **不要把科学家模式搬进引擎。** 三个设计全要搬、全声称「逐字节保持」、全都说错了机制：`calcCardBattle`（`damage.js:86`）**根本不读 `opts.damageMultiplier`** → 那 ×1.2 只在直攻主人生效、卡对卡时被静默丢弃。搬进引擎 = **顺手给每次卡牌攻击 +20%，把难度改动伪装成重构**。它今天是玩家专属且正确（AI 不答题，永远赚不到）。卡牌路径的丢失另开平衡单。
- **不要合并 `beginEnemyTurn` 与 `startPlayerTurn`。** 「能量公式抄了两遍」是幻觉：一个读**递增前**的 `t`、一个读**递增后**的 `newTurn`，对同一轮两者都得 `min(ceil(turn/2)+1, ENERGY_CAP)` —— 它们在两个时刻读同一变量，**正是为了让公式相同**。
- **不要转发 action / 不要把 action 做成 wire-safe。** `FIELD_UPDATE.value` 与 `LEADER_APPLY.updater` 收**函数**，且注释写明是刻意的。**推 state，不推 action。**
- **不要把 battleStats 拆成两份。** 累加点今天**没有 side 守卫** → side 化后 AI 出牌会记进齐齐的战绩。最小修法是那四处加 `if (side === 'player')`（S4/S5 内完成，是**前置**不是收尾）。
- **不要 side-scope quiz/quizStreak/Leitner。** 今天玩家专属且正确（AI 不答题）。guest 的觉醒需要可中断的两趟协议 —— **那是 PvP 层，不是 de-fork**。
- **不要给 `side` 加必填。** `side = 'player'` 默认值只出现在 hook 边界，字面量活在 React 外壳里，永不进 `rules.js`。真正的守卫是 S7 的棘轮 + 镜像测试。
- **不要无脑合并 preplaceCard 的三个作弊者**：Boss 预置**加**疲劳、`preplaceEnemyCards` **刻意不加**（注释明写）。必须显式 `{fatigued}`。

---

## 最近完成（详见 CHANGELOG）
| | |
|---|---|
| `afd933a` | **S4** de-fork playToField —— AI 第一次受能量/阵营/槽位约束。修掉三个真 bug（能量可扣成负数 / 被替换的卡不进弃牌堆→阵营标记长期少算 / 无阵营需求检查）。**真实平衡变化，两个方向** |
| `1fdbed6` | **S3** activeSide + 每侧 phase + derivePhase。**敌方第一次有了相位机** —— 此前 main/battle 隐含「玩家的」，gate 不是懒得写，是**不可表达** |
| `3e4e606` | **S2** 标记进 reducer 每侧数组（+13 真断言，含 JSON round-trip 护栏）。**「一卡一次」此前完全由 useAITurn 那个 for 循环的形状强制** —— 而那正是 PvP 要删的代码 |
| `4cba729` | **S1** `rules.js` 纯谓词 + **60 条真断言**（规则第一次可测）。变异测试四发全中，其中「移除守护检查」= `aiAttack` 今天的真实状态 |
| `614dfa4` | **S0** 玩家侧回调收口读 ref。**fork 的物理成因是「读值来源不同」，不是「gate 被删了」** |
| `8b2c1cc` | `DEPLOY.md §4` 从「预案」改写成「已决架构」+ 三条不变量 + 两条会毁数据的部署纪律 |
| `396db5a` | sw.js `/api/*` 旁路 + CACHE_NAME v2（+19 断言，变异测试双向验证） |
| `4f3eae6` | 更正两条「文档写了、代码从来没有」的规则 + 觉醒倍率接回真相源 |
| `ac1169e` | 手牌 uid 补 side 前缀 —— 修 **PvE 既有**串台 bug（+21 断言） |
| `6cffff1` | hooks 补 `.js` —— **战斗引擎从「不可测」变可测**（de-fork 的前提） |

⚠️ **`6cffff1`…`8b2c1cc` 已 push + deploy 并逐项验证**（生产 sw.js = v2 + 旁路、bundle hash 与本地一致）。**S0-S4（`614dfa4` / `4cba729` / `3e4e606` / `1fdbed6` / `afd933a`）已 commit 但未 push、未 deploy。**
⚠️ S0-S3 是纯重构零行为变化；**S4 起有真实平衡变化**（见上），发布前想清楚。

---

## 已知问题
- 🔴 **两张卡的招牌技能 100% 失效**：四个 `triggerSkills('onAttack')` 调用点**没有一个传 `friendlyField`**，而 `conditionalAtk` 的 `per_ally` 分支读它 → **虎鲸·深海霸主「协同猎杀」** 与 **神经元·闪电信使「突触传递」** 从不触发。`test-leader-damage.mjs` ⑥ 放了哨兵。
  - ⚠️ **修它会同时引爆平衡**：虎鲸满场 5 个自然系友方 = (8500+7500)×2 = **32000 ≥ 主人 30000 → 满血秒杀**。5 格时是 29000 —— **是 6 格那次改动把它推过线的**。补 `friendlyField` 前先决定：调低 `amount:1500` / 给 allies 加 cap / 接受它
- 🟡 **科学家模式 ×1.2 在「打卡」时被静默丢弃**（`calcCardBattle` 不读 `opts.damageMultiplier`）→ 连对 3 题的奖励**只在直攻主人生效**。⚠️ 修它 = 全卡牌攻击 +20% 的真实难度变化，**别混进 de-fork**（见上方「不要做」）
- ⚠️ **PWA 图标是 SVG**：iOS `apple-touch-icon` 只吃 PNG → 齐齐主屏图标是糊的网页截图。修好需他删掉重装一次
- Tailwind v4 会扫 `CHANGELOG.md`/`SESSION.md` —— **文档散文里写到类名会变成生产 CSS 里的死规则**
- `starConditions` 文案写「≤12回合」、代码硬编码 `≤10`（`campaignData.js:1046`），且该字段**根本没人读**
- 死代码：`src/effects/battleAnimations.js` 整 147 行零引用 · `useAITurn.js:39` `MAX_CARDS_PER_TURN` 零引用 · `useBattle.js` 的 `setAnimating`/`restorePhase`（**S3 会删**，`'animating'` 是零消费的幽灵相位）
- 战斗日志硬编码中文（~240 条）· 里程碑发放顺序 grant-first vs save-first（仅 Safari 隐私模式极端边界）

---

## 下次启动时优先
1. **接着做 S5**（先读上方「开工 S5 前必读」六条）
2. 视情况把 S0-S3 push + deploy（纯重构、零行为变化、已实机验证）；S4 建议与 S5 分开发
3. S4/S5 **分开发**，别同一天丢给齐齐两个平衡变化
4. 等齐齐真机反馈 `stage_2_8` 新冠 Boss 在 6 格下是否如预期变难
5. 🎴 内容线：**骨骼·钢铁支架**改卡面说明（非 bug，是「骨髓造血」的设计意图）· **S1 海洋深渊季**补 OCEAN 卡（现 11 张→~20，用 `bio-heroes-card-designer` skill 拉齐齐脑暴）

### PvP 的另一半（de-fork 之后，**wire 格式冻结前必须先定**）
- **推送载荷未定义**：reducer state 是 wire-clean 的，但 guest 屏幕上约一半东西**不在 reducer 里**（`currentQuiz`/`pendingSpSummon`/`skillEvents`/`battleLog`/`scientistMode`/`spDecks`/`activeEnvEvent`）。把 `mirror(reducerState)` 推给 guest → 棋盘漂亮对称，但**没问答、没 SP 弹窗、没伤害浮字、没日志**。**提升进 reducer，还是加一棵 JSON-clean 的 `uiState` 兄弟子树？** 定在冻结之前，否则要做第二次状态形状迁移。
- `attack` 的返回值**意外地是一个完美的 wire 消息** —— `{atkDmg, defDmg, defKilled, atkKilled, leaderHit, atkFactionBonus, defFactionBonus, skillEvents}` 正是驱动每个浮字和音效所需的全部字段。「把 intent 结果回显给发起方」可能是让 guest 看见浮字的最便宜的路。
- `battleLog` 写入时就烤进了 🔴 前缀与「🔵 你的回合」—— **mirror 换子树，换不掉字符串**。guest 的日志会永远以 host 视角叙事。最终要变成 `{side, key, params}`。
- `applySkillEvents` 是**最大的未测洞**（setter-based，`_side` 路由有把 debuff 发到错误场的历史）。镜像测试证明**决策**对称，证明不了**执行**。诚实的修法是抽出纯的 `reduceSkillEvents` —— **与本计划体量相当的另一个项目**，塞进 de-fork 会让 de-fork 无法上线。
- `turn` 只数玩家回合 → 环境事件/病毒 DoT/SP 第 8 回合开闸**只在 host 半回合触发**。本计划不修也不加剧 —— 但每侧阶段机会让它**看起来像修好了**，比现在这种明显的不对称更危险。
- useAITurn 的 async 编排不可测：7 个硬编码 delay、无取消令牌、`aiRunning` 只在 `.finally` 复位（抛错会、**挂起不会**）。远端 guest 的 intent 到达时机不受 delay 控制。

### ☁️ P2 云存档（排在 PvP 之后，**不做密码账号**）
方案已落盘在 `DEPLOY.md §4.5`（恢复码 4 个中文词 / 自动推+手动拉 / SQLite / credentials 分表预留）。

---

## 关键文件
- **战斗引擎**：`src/hooks/useBattle.js`（规则住这，~2400 行）+ `src/engine/battleReducer.js`（纯状态容器）· **`src/engine/rules.js`（新，side-blind 纯谓词 —— 规则的守门人）** · **`src/engine/sides.js`（新）** · `src/engine/combat.js` · `src/hooks/useAITurn.js` + `src/engine/aiTarget.js` · `src/engine/{skillRegistry,skillTemplates,statusEffects,bossMechanics,stageRules}.js`
- **独立棋盘（不走 useBattle，改战场位/标记时必须同步）**：`src/components/TutorialScreen.jsx`（**自带一对 Set**，刻意没动）+ `src/data/tutorialData.js` · `src/components/TestArena.jsx`
- **数据**：`src/data/{cards,eventCards,spCards,campaignData,deckRules,dexSets,gachaBanners,achievements,dailyChallenges}.js`
  - ☠️ `deckRules.js` 里 `MAX_FIELD_SLOTS`(6) / `SP_DECK_SIZE`(5) / `STARTING_HAND`(5) 同居 —— **严禁对该文件做数字查找替换**
- **存档**：`src/utils/saveManager.js`（`SAVE_KEYS` 单一清单）· `src/components/ErrorBoundary.jsx`
- **测试**：`scripts/test-*.mjs`（**47 套**，`npm test` 入口）。**真测试**（import 真模块）：`test-rules-gates`(60) / `test-battle-reducer`(51) / `test-hand-uid`(21) / `test-sw-api-bypass`(19) / `test-combat-resolve` / `test-leader-damage`
  - ⚠️ **假绿铁律**：ctx 必须与生产调用点**逐字一致**；fixture 一律从**真的** `initialBattleState` + **真的** `cards.js` 改，**绝不手搓「长得像」的对象**。本项目已被假绿烧过四次（partialAwaken 档 / `test-leader-damage` 初版多传 `friendlyField` 造出假 bug / `test-sw-api-bypass` 初版漏 `location.origin` 导致全部因错误原因通过 / `MARKS_CLEAR` 的 no-op bailout 写错被当场抓住）
  - ⚠️ **eslint 只开 `no-undef`**，**没有** react-hooks 插件、**没有** `exhaustive-deps` —— 别以为「lint 干净」证明了 deps 正确
  - `engine/`+`utils/`+**`hooks/`** 的相对 import **必须带 `.js`**（`6cffff1` 起 hooks 也已补齐 → useBattle/useAITurn/useHand 现在 Node 可 import）
- **⚠️ 浏览器验证铁律**：走 `vite preview`(4174) 非 dev。**先断言 `window.innerWidth > 0`** —— 无头浏览器会以 0×0 视口起来，此时所有卡牌点击静默失效、读起来像引擎回归（我为此白跑了一轮 stash/rebuild/重测；是「用改动前代码跑同一脚本」的 A/B 对照证伪的）。测试场家长门是 `window.prompt`（答 `56`），无头下需 `window.prompt = () => '56'` 打桩。**本局首次攻击必弹问答并挂起攻击**（`tryQuiz` 确定性）—— 不答题就会误判「攻击没发生」。
- 部署交接 `DEPLOY.md`（§4 = PvP 权威）；架构总览 `ARCHITECTURE.md`；历史见 `CHANGELOG.md`
