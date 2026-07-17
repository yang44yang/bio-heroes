# Bio Heroes Session State
> 更新时间: 2026-07-17（**P1 PvP：地基已发布；引擎 de-fork ✅ 8/8 全部完成**。地基 6 个 commit 已 push+deploy 并逐项验证；**de-fork 的 S0-S7 已 commit、未发布**。49 套测试绿。**wire 格式已定（三通道）**，下一步开工中继。50 套测试绿。）
>
> ⚠️ **本文件只留「活的交接」**——历史阶段已归档到 `CHANGELOG.md`，逐 commit 细节在 git。别再让它膨胀（精简纪律见 CLAUDE.md）。
> 📏 现 126 行，**有意识地超了 ~100 的目标**：多出来的全是「PvP 开工前必读」+ wire 格式决定 —— 那是下一步的**全部依据**，写在别处等于没写。**PvP 落地后请把这两节浓缩进 CHANGELOG，压回 100 行内。**

## 项目位置
- **实际路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）· **GitHub**: yang44yang/bio-heroes (main)
- **工作流**: 直接在 main 工作和 push
- **生产**: `bio.socialcontract.capital`（`npm run deploy`）。⚠️ **齐齐玩这个**（PWA 主屏）。Vercel 随 push 自动部署，作海外镜像
- **CI**: `.github/workflows/ci.yml` —— push/PR 到 main 跑 lint→test→build

---

## ✅ 已完成并发布（本次会话 21 个 commit，44 → **51 套测试**）

**生产 = HEAD，逐项验证过**（bundle hash 与本地逐字符一致）。细节见 `CHANGELOG.md` 顶部那节。

**引擎 de-fork 8/8**：`ai*` 三兄弟全退役，只剩一条 side 参数化的路
（`playToField(card,slot,side)` / `attack(atk,def,opts,side)` / `playEventCard(card,opts,side)` / `endMainPhase(side)`）。
- **规则**（能不能）住 `engine/rules.js`（side-blind，棘轮守着**零侧别字面量**）；**人格**（怎么选）住 `engine/aiTarget.js`
- **唯一保留的具名分叉**：`resolveSpChoice`（玩家的 SP 选择异步、AI 的同步，这个不对称今天消不掉）
- **两个守卫必须一起在**：`test-side-symmetry`(462) 证明「拿了 side 且真用了」+ `test-no-side-fork`(22) 证明
  「不能命名某一侧」。**缺一个就是剧场**
- `mirror()` 已在 `src/engine/sides.js`（生产可用）；`test-wire-privacy`(50) 守着「reducer 里的东西 = 公开的」

⚠️ **齐齐已拿到 S4/S5 的真实平衡变化**：守护第一次真的约束 AI、AI 不能超支能量；但敌方阵营标记不再少算
→ **从没打出来过的敌方 SSR 可能上场**。**先原样上、等他实打再调**（用户裁定）。

---

## 已知问题
- 🔴 **两张卡的招牌技能 100% 失效**：四个 `triggerSkills('onAttack')` 调用点**没有一个传 `friendlyField`**，而 `conditionalAtk` 的 `per_ally` 分支读它 → **虎鲸·深海霸主「协同猎杀」** 与 **神经元·闪电信使「突触传递」** 从不触发。`test-leader-damage.mjs` ⑥ 放了哨兵。
  - ⚠️ **修它会同时引爆平衡**：虎鲸满场 5 个自然系友方 = (8500+7500)×2 = **32000 ≥ 主人 30000 → 满血秒杀**。5 格时是 29000 —— **是 6 格那次改动把它推过线的**。补 `friendlyField` 前先决定：调低 `amount:1500` / 给 allies 加 cap / 接受它
- 🟡 **科学家模式 ×1.2 在「打卡」时被静默丢弃**（`calcCardBattle` 不读 `opts.damageMultiplier`）→ 连对 3 题的奖励**只在直攻主人生效**。⚠️ 修它 = 全卡牌攻击 +20% 的真实难度变化，**别混进重构**
- 🟡 **`scientistMode` 是单个全局、无 side 维度**（`useBattle.js:171`）。今天正确（AI 不答题，永远赚不到）—— 但 **PvP 里双方抢答同一题 → guest 答对 3 题会给 host 加 buff**。wire 格式已决定把它提进每侧子树（见下节）
- ⚠️ **PWA 图标是 SVG**：iOS `apple-touch-icon` 只吃 PNG → 齐齐主屏图标是糊的网页截图。修好需他删掉重装一次
- Tailwind v4 会扫 `CHANGELOG.md`/`SESSION.md` —— **文档散文里写到类名会变成生产 CSS 里的死规则**
- `starConditions` 文案写「≤12回合」、代码硬编码 `≤10`（`campaignData.js:1046`），且该字段**根本没人读**
- 死代码：`src/effects/battleAnimations.js` 整 147 行零引用 · `useAITurn.js:39` `MAX_CARDS_PER_TURN` 零引用 · `useBattle.js` 的 `setAnimating`/`restorePhase`（**S3 会删**，`'animating'` 是零消费的幽灵相位）
- 战斗日志硬编码中文：**实测 123 处 `addLog` 调用点、其中带视角标记的 23 处、`prefix` 定义 5 处**（此前这里写「~240 条」是错的 —— 见下方 wire 格式节，那个错数字会把人吓进错误架构）· 里程碑发放顺序 grant-first vs save-first（仅 Safari 隐私模式极端边界）

---

## 下次启动时优先

### 1️⃣ 接着做 PvP —— wire 格式已定（三通道，见下节），**可以直接开工**
已就绪：棋盘 state JSON-clean · 规则 side-blind · `mirror()` 已在 `src/engine/sides.js`（生产可用）·
vite 的 `/api/*` 代理已通 · 「reducer 里的东西 = 公开的」有可执行护栏（`test-wire-privacy`, 50 断言）。

**建议顺序**（每步独立可提交、可玩）：
1. **定 wire 消息形状**（按下节三通道）+ 写 `scripts/test-wire-*.mjs` 钉住它
2. **把那三个「穿全局外衣的每侧状态」提进子树** —— `quizStreak` / `scientistMode` / `pendingSpSummon`
   （顺带修掉 scientistMode 那个 latent fork，见「已知问题」🟡）
3. **零依赖中继**（`node:http`/`node:crypto`/`node:net` 手写 WS upgrade）+ systemd + `deploy:api`
4. **接 UI**：房间码 / 加入 / guest 的瘦客户端
5. 最后才动 `useAITurn`（见下方⚠️，它是块硬骨头，单独开工）

**⚠️ 开工前必读（每条都会咬人）**：
- ☠️ **`useAITurn` 托不住远端对手**：7 个硬编码 delay（300/100/600/500/400/800/500ms）、**无取消令牌**、
  `aiRunning` 只在 `.finally` 复位（**抛错会、挂起不会** → 断线 = 永久锁死）。它的 `.catch` 在任何错误时
  **强行把回合交还玩家** —— PvP 里那是**静默偷走 guest 的回合**。远端 intent 不按这个时刻表到。
- ☠️ **零收益守卫必须抄 `App.jsx:135` 的 ref 写法**（`handleExitBattle` 的 deps 只有 `[economy]`）——
  写成普通 state 会 stale → **静默不触发、金币照发、dev 里看不出来，只有真打完一局 PvP 才发现**。
  且走 deckBuilder 漏斗的 PvP **默认落在** `calculateBattleReward` 那条 fall-through 分支。
- **Caddy 的 `/api/*` 路由在 spacev 仓库**（`Personal website dev/spacev/deploy/Caddyfile`），
  且要把 bio block 从裸 `root/try_files/file_server` **重构成 `handle` 块**才能加（主站 block 有模板）。
  `npm run deploy` **两头都不管**。今天实测：`GET /api/rooms` → **index.html + HTTP 200**（不是 404/502）。
- **`BattleScreen` 的开局 effect** 会替敌方自动出一张 cost≤1 的卡（走 `preplaceCard`）—— PvP 里 host 会
  **替远端 guest 打出它手里的牌**。
- **CI 只在根目录跑 `npm ci`** → 中继若自带 `package.json`，它的依赖**不会被安装**。
  **eslint 只覆盖 `src/engine` + `src/hooks`** → 中继目录零 `no-undef` 覆盖，而**服务端崩一次会掐断所有对局**。

### 2️⃣ 其它
- 等齐齐真机反馈：**S4/S5 的平衡变化已上线**（守护第一次真的约束 AI / AI 不能超支能量；但敌方阵营标记
  不再少算 → 从没打出来过的敌方 SSR 可能上场）。`aiStrength` 旋钮在 `useAITurn.js:33`，**先别提前调**。
  重点看 `stage_2_8` 新冠 Boss 在 6 格下是否如预期变难。
- 🎴 内容线：**骨骼·钢铁支架**改卡面说明（非 bug，是「骨髓造血」的设计意图）· **S1 海洋深渊季**补 OCEAN 卡
  （现 11 张→~20，用 `bio-heroes-card-designer` skill 拉齐齐脑暴）

### 🔌 PvP 的另一半 —— wire 格式**已定**（2026-07-17，3 设计 × 9 对抗评审 + 用户裁定）

**已决：三通道**（不是「全部提升进 reducer」，也不是 `uiState` 兄弟子树）
| 通道 | 内容 | 时序 | 为什么是它自己一条 |
|---|---|---|---|
| ① **公开快照** | `mirror(reducerState)` | **提交后的 effect** 推（`useEffect(..., [battleState])`） | 死亡在 `attack()` 返回**之后**才结算 → 在处理器里同步取快照会推出**带 0HP 僵尸卡的半结算棋盘**。从提交后推 = 天然去抖、永不推半态 |
| ② **私有分发** | 只发给本人：自己的手牌 + 自己的 SP 卡组 | 随快照 | 见下方「决定性约束」 |
| ③ **有序事件环** | 浮字 / 日志 / 技能事件 / `attack()` 的返回值 | attack 当场记录，随快照推 | 它们是**边不是值**：浮字要显示在一张 16ms 后就不存在的卡上，用的是**死前的数字**。带 `seq` 戳 + 封顶 64（guest 记 lastSeen seq → 重连不重放整局浮字） |

**☠️ 决定性约束（谁都没写下来过，是这次挖出来的）**：reducer 是「**整棵 mirror 后原样推出去**」的东西 → **往里提升什么，就等于声明什么是公开的**。
已核实：`BattleScreen:1105` 只渲染 `enemySpDeck.length`（**数量**），SP 卡组**内容是隐藏信息**。所以「全部提升进 reducer」会让每次推送**把 SP 卡组内容寄给对面小孩**。手牌同理（今天不在 reducer 里，**永远不该进去**）。
→ 保住这条可断言的不变式：**reducer 里的东西 = 公开的**。私有的走通道②。

**要提进每侧子树的（它们是「穿着全局外衣的每侧状态」）**：
- `quizStreak` → `state[side].quizStreak`（已决 streak 按方计分）
- `scientistMode` → `state[side].scientistMode` —— ⚠️ **这是个活的 latent fork**：它今天是单个全局 `{active,turnsLeft}`（`useBattle.js:171`），今天正确只因 AI 不答题；PvP 里双方抢答同一题 → **guest 答对 3 题会给 host 加 buff**
- `pendingSpSummon` → `state[side].pendingSp` —— 它**已经带 side 字段**了，只是穿着全局外衣
- `currentQuiz` → `state.quiz` + 新增 `answeredBy: null|'player'|'enemy'`（**那个字段就是抢答本身**，mirror 翻它）
- `activeEnvEvent` → `state.envEvent`（真·全局，mirror 正确地不动它）

**📌 实测更正：「~240 条硬编码日志」是错的。** 真实数字：`addLog` 调用点 **123** 处，其中带视角标记（🔴/🔵/我方/敌方）**23** 处，`prefix` 变量只在 **5** 处定义。
→ 账单是：改那 5 处 `prefix` 定义 + 把 `side` 传给 `addLog` + **渲染时按观看者的座位加前缀**，约 10 行、零文案编辑。剩下 ~20 条句子本身烤了视角的**不阻塞 PvP**，挂棘轮慢慢修。
⚠️ 这个数字要紧：**「240 条」正是那种会把人吓进错误架构的数字** —— 为了躲一笔并不存在的账单去买永久的架构代价。（两个独立设计各自数出同一结果，我已复核。）

**这两条必读里没有、但也会咬人**：
- `applySkillEvents` 是**最大的未测洞**（setter-based，`_side` 路由有把 debuff 发到错误场的历史）。镜像测试证明**决策**对称，证明不了**执行**。诚实的修法是抽纯的 `reduceSkillEvents` —— **与 de-fork 体量相当的另一个项目**，别塞进 PvP。
- `turn` 只数玩家回合 → 环境事件 / 病毒 DoT / SP 第 8 回合开闸**只在 host 半回合 tick**。**不修也不加剧** —— 但每侧阶段机会让它**看起来像修好了**，比原来那种显眼的不对称更危险，必须在 `turn` 字段上留注释。

### ☁️ P2 云存档（排在 PvP 之后，**不做密码账号**）
方案已落盘在 `DEPLOY.md §4.5`（恢复码 4 个中文词 / 自动推+手动拉 / SQLite / credentials 分表预留）。

---

## 关键文件
- **战斗引擎**：`src/hooks/useBattle.js`（**只剩 React 外壳 + 编排**，~2400 行）+ `src/engine/battleReducer.js`（纯状态容器）· **`src/engine/rules.js`（规则的守门人 —— side-blind 纯谓词，棘轮守着它零侧别字面量）** · **`src/engine/sides.js`（PLAYER/ENEMY/opp）** · `src/engine/aiTarget.js`（**AI 人格**：pickAiTarget / pickAiSpCard —— 引擎不该知道 AI 的脾气） · `src/engine/combat.js` · `src/hooks/useAITurn.js` + `src/engine/aiTarget.js` · `src/engine/{skillRegistry,skillTemplates,statusEffects,bossMechanics,stageRules}.js`
- **独立棋盘（不走 useBattle，改战场位/标记时必须同步）**：`src/components/TutorialScreen.jsx`（**自带一对 Set**，刻意没动）+ `src/data/tutorialData.js` · `src/components/TestArena.jsx`
- **数据**：`src/data/{cards,eventCards,spCards,campaignData,deckRules,dexSets,gachaBanners,achievements,dailyChallenges}.js`
  - ☠️ `deckRules.js` 里 `MAX_FIELD_SLOTS`(6) / `SP_DECK_SIZE`(5) / `STARTING_HAND`(5) 同居 —— **严禁对该文件做数字查找替换**
- **存档**：`src/utils/saveManager.js`（`SAVE_KEYS` 单一清单）· `src/components/ErrorBoundary.jsx`
- **测试**：`scripts/test-*.mjs`（**51 套**，`npm test` 入口）。**真测试**（import 真模块）：**`test-side-symmetry`(462) / `test-no-side-fork`(22，棘轮) / `test-wire-privacy`(50)** / `test-combat-resolve`(68) / `test-rules-gates`(60) / `test-battle-reducer`(60) / `test-leader-damage`(33) / `test-hand-uid`(21) / `test-sw-api-bypass`(19) / `test-api-proxy`(7)
  - ☠️ **de-fork 的两个守卫必须一起在**：棘轮只能证明 `rules.js` **不能命名**某一侧；证明不了它「拿了 side 又忽略它」（如 `state[总是player的变量]`）—— 那个由镜像测试覆盖。**缺一个就是剧场。**
  - ⚠️ **假绿铁律**：ctx 必须与生产调用点**逐字一致**；fixture 一律从**真的** `initialBattleState` + **真的** `cards.js` 改，**绝不手搓「长得像」的对象**。本项目已被假绿烧过**六次**：partialAwaken 档 / `test-leader-damage` 初版多传 `friendlyField` 凭空造出假 bug / `test-sw-api-bypass` 初版漏 `location.origin` 导致全部因错误原因通过 / `MARKS_CLEAR` 的 no-op bailout / `test-api-proxy` 的正则匹配到**注释里**的 `ws: true` / **`JSON.stringify(round) === JSON.stringify(s)` 恒真**（round 就是 round-trip 的产物，两边都塌成 `{}` → 对「树里混了 Set/函数」结构性瞎，同款在两个测试里躺了一天）
    - ☠️ **新守卫必须配变异测试**，否则等于没有。六次里有四次是变异测试抓的，不是人眼
  - ⚠️ **eslint 只开 `no-undef`**，**没有** react-hooks 插件、**没有** `exhaustive-deps` —— 别以为「lint 干净」证明了 deps 正确
  - `engine/`+`utils/`+**`hooks/`** 的相对 import **必须带 `.js`**（`6cffff1` 起 hooks 也已补齐 → useBattle/useAITurn/useHand 现在 Node 可 import）
- **⚠️ 浏览器验证铁律**：走 `vite preview`(4174) 非 dev。**先断言 `window.innerWidth > 0`** —— 无头浏览器会以 0×0 视口起来，此时所有卡牌点击静默失效、读起来像引擎回归（我为此白跑了一轮 stash/rebuild/重测；是「用改动前代码跑同一脚本」的 A/B 对照证伪的）。测试场家长门是 `window.prompt`（答 `56`），无头下需 `window.prompt = () => '56'` 打桩。**本局首次攻击必弹问答并挂起攻击**（`tryQuiz` 确定性）—— 不答题就会误判「攻击没发生」。
- 部署交接 `DEPLOY.md`（§4 = PvP 权威）；架构总览 `ARCHITECTURE.md`；历史见 `CHANGELOG.md`
