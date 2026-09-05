# Bio Heroes 《生物英雄传》

## 项目概述
一款龙珠Z风格的生物科学卡牌对战网页游戏。父子亲子项目（玩家是 7 岁的齐齐）。
让小朋友在对战的快感中自然吸收生物学知识：玩法本身就是在学，而不是"学完了奖励你玩"。
核心参考：Dragon Ball Card Warriors（龙珠Z卡卡罗特内置卡牌游戏）。

---

## 技术栈（以 package.json 为准）
- **React 19 + Vite 7 + Tailwind 4 + Framer Motion 12**。framer 承担全部 UI 与战斗演出动画；仓库里没有 GSAP / WAAPI / tsParticles。
- **无后端数据库**：全部存档在浏览器 localStorage（`src/utils/saveManager.js` 带版本迁移 + 导入导出）。
- **PvP**：`relay/` 是 Node + ws 的哑中继（盲转字节、host 权威、零游戏逻辑），生产由 Caddy 反代 `/api/relay`。
- **PWA**：`public/sw.js` 对静态资源 cache-first、HTML network-first。改 fetch 规则必须在同一 commit bump `CACHE_NAME`。
- 「精简模式」（低端设备降级）是目标，**尚未实现**。

---

## 项目结构
```
src/
├── App.jsx                    # screen state 路由（非 react-router），重型屏幕 React.lazy 分包
├── data/
│   ├── cards.js               # 卡牌数据库 — 124 张（BASE 104 + OCEAN 11 + MICRO 9，含 subType/set/tags）
│   ├── eventCards.js          # 事件卡数据 — 16张（四阵营各4张）
│   ├── spCards.js             # SP觉醒卡数据 — 17张
│   ├── deckRules.js           # 常量权威（DECK_SIZE=25, MAX_FIELD_SLOTS=6, LEADER_HP=30000, POWER_CURVE …）
│   ├── campaignData.js        # 闯关战役数据（4章29关）
│   ├── tutorialData.js        # 教学关卡数据（3基础+2进阶）
│   ├── quizzes.js             # 问答题库（805 题，含 Leitner 复习）+ quizzesGeneral.js
│   └── evolutions / achievements / dailyChallenges / dexSets / gachaBanners / presetDecks / testDecks …
├── engine/                    # 纯逻辑，可在 Node 里直测
│   ├── battleReducer.js       # 棋盘状态（JSON-clean，整棵可推给 PvP guest）
│   ├── rules.js / sides.js    # side-blind 规则谓词 / 侧别工具（rules.js 不得出现 'player'/'enemy' 字面量）
│   ├── skillRegistry.js       # 176 条技能 handler（nameEn 主键）→ skillTemplates.js 模板 → skillTriggers.js 派发
│   ├── combat.js / statusEffects.js / bossMechanics.js / stageRules.js / aiTarget.js
│   ├── wire.js                # PvP 协议（PROTOCOL_VERSION，公开树定形 + 隐藏信息 strip）
│   ├── quizGate.js            # 问答纯核心（节流 / 脱敏 / host 判卷）
│   └── matchSnapshot.js       # host 自恢复快照（「必须恢复什么」的单一真相源）
├── hooks/
│   ├── useBattle.js           # 战斗状态机外壳（~2650 行，最大最复杂）· useAITurn.js · useHand.js
│   ├── useEconomy.js / useGacha.js / useDailyChallenge.js
│   └── usePvpHost.js / useGuestBattle.js
├── net/                       # relayClient.js / lobbyProtocol.js
├── components/                # BattleScreen（最重）· TutorialScreen · DeckBuilder · Collection · GachaScreen · CampaignScreen · PvpLobby · Card · QuizModal …
├── utils/                     # damage.js · saveManager.js · matchStore.js · guardSkill.js · deckHealth.js · recommendDeck.js …
├── i18n/                      # zh.json / en.json（仅 UI 文案；卡牌/技能文本在 cards.js 里中文硬编码）
└── audio/soundManager.js      # Web Audio 合成音效
relay/                         # PvP 哑中继（server.js + lib/ 纯核心 + smoke/）
scripts/                       # test-*.mjs 断言测试（npm test）· audit-* / validate-* 信息脚本
docs/                          # VERIFY.md（验证/部署纪律）· PLAYTEST.md（试玩观察清单）· sp-combos.md
ARCHITECTURE.md · DEPLOY.md · CHANGELOG.md · SESSION.md
```

---

## 核心设计原则
1. **好玩优先**：先是好玩的游戏，其次才是教育工具
2. **科学准确**：卡牌数值、技能、描述基于真实科学事实
3. **龙珠精神**：收集成就感、组队策略深度、战斗觉醒爽感
4. **玩法即学习**：知识融入核心机制，不是答题奖励
5. **允许失败**：答错也有部分奖励
6. **亲子友好**：7 岁能理解，大人也有策略深度
7. **中文为主**：科学名词附带英文

## 教育设计原则（First Principles）
**第一性原理：异养 vs 自养。** 能量获取方式决定了生命的一切特征：
- 异养生物（动物/病原）：必须消耗其他生物 → 必须移动 → 必须有系统级协调 → 复杂身体结构
- 自养生物（植物）：自制食物 → 可以不动 → 器官独立运作 → 简单层级结构
这个原理是自然系/人体系/病原系设计的根基。

**卡牌设计 5 问**（每张新卡或改造卡必须回答）：
1. First Principle 锚点：这张卡承载的生物学原理是什么？（一句话）
2. 机制即知识：遮住卡名，只看技能效果，能猜出这是什么生物吗？
3. 资源取舍：出这张卡时玩家要放弃什么？不能有"无脑出"的卡
4. 风险取舍（SP/强力卡）：有没有"赌"的成分？成功收益高，失败有代价？
5. 七岁能懂：齐齐能不能理解卡牌描述和技能名？

**scienceCard 写作**：不只讲结论，要讲"为什么"；技能效果要在 scienceCard 中得到解释；7 岁能读懂但不牺牲准确性。
知识点三标签（KP_ID / NGSS / 中国课标）仍是规划，`bio-heroes-knowledge-map.md` 尚未创建。

---

## 部署与 Git
- 生产：`https://bio.socialcontract.capital`（自有 VPS，国内直连；详见 `DEPLOY.md`）。齐齐玩的是这个。
- 前端 `npm run deploy`（build + rsync），中继 `npm run deploy:api`，两者分开跑。**回执不算数**，按 `docs/VERIFY.md` §3 回验字节。
- 所有改动直接在 main 上工作和推送（`git push origin main`），不开 feature branch / PR。CI 在 push 时跑 lint → test → build。

---

## 重要提醒（速查）
- 属性只有 **ATK + HP**，没有 DEF / SPD；**费用 ≠ 稀有度**，两个独立维度
- 同一张卡 = 完整卡名相同，同名最多 3 张；召唤疲劳（迅击例外）；攻击互扣；守护优先
- 技能越强 → ATK/HP 越低；生成新卡必须附科学知识（scienceCard）
- **常量以 `src/data/deckRules.js` 为准**。本文件和 rules 里的数字由 `scripts/test-docs-truth.mjs` 对账，写错会红
- 引擎已 de-fork：改战斗规则只改一条 side 参数化的路，别再分玩家/AI 两份（守卫 `test-no-side-fork` + `test-side-symmetry`）
- 技能效果一律用「return 事件」表达，不要 mutate ctx；`nameEn` 拼错是静默 no-op
- PvP：隐藏信息（手牌 / 答案卡 / SP 内容）永不上 wire；改公开树形状必须 bump `PROTOCOL_VERSION`（两台都要强刷）
- 改完代码：`npm test` + `npm run lint` + `npm run build`；上生产后回验字节（`docs/VERIFY.md`）
- 中文为主，科学名词附英文

---

## Session 交接规则
- **结束会话**（触发词「更新状态」）：改写 `SESSION.md`，只留活的交接：当前瓶颈 + git/生产状态 + 下一步 + 未修问题 + 文件地图，
  **≤100 行、替换不堆积**。完成的阶段浓缩几条归档进 `CHANGELOG.md`，逐 commit 细节靠 git；划掉的 ✅ 项直接删。
- **开始会话**（触发词「读取状态」/「继续上次工作」）：先读 `SESSION.md`。
- 验证/部署的固定流程在 `docs/VERIFY.md`，不要再往 SESSION.md 里堆。

---

## 详细规则索引（修改相关功能前先读）
- `.claude/rules/card-system.md`：卡牌类型 / 属性 / 阵营 / SubType / Set / 版本
- `.claude/rules/cost-rarity-skills.md`：费用、稀有度、技能系统、数值平衡
- `.claude/rules/battle-system.md`：卡库 / 卡组 / 对战流程 / 能量 / SP 觉醒
- `.claude/rules/factions-events.md`：阵营克制 / 同系协同 / 环境事件 / 问答
- `.claude/rules/gacha-cards.md`：抽卡经济 / 已有卡牌清单
- `ARCHITECTURE.md`：一页式架构地图 · `DEPLOY.md`：部署与 PvP 架构 · `docs/VERIFY.md`：验证纪律 · `docs/PLAYTEST.md`：试玩观察清单
