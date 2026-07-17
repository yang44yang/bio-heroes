# Bio Heroes Session State
> 更新时间: 2026-07-16（**真机 bug-fix 弧线收官 → 下一步 PvP**。齐齐反馈驱动的四连全部上线：存档止血 / 测试场锁死 / SP 重定价 / 战场位 6 格。43 套测试绿 + CI 绿、全推 main、已发布生产。PvP 方案已定但未开工。）
>
> ⚠️ **本文件只留「活的交接」**——历史阶段（Sprint 1-33 + 决策/Phase + 引擎重构 + 真机 bug-fix + 特性/内容扩建 + 07-16 四连）已归档到 `CHANGELOG.md`，逐 commit 细节在 git。别再让它膨胀（精简纪律见 CLAUDE.md）。

## 项目位置
- **实际路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）
- **GitHub**: github.com/yang44yang/bio-heroes (main 分支)
- **工作流**: 直接在 main 工作和 push
- **生产**: `bio.socialcontract.capital`（`npm run deploy`）。⚠️ **齐齐现在玩这个**（已从 vercel.app 搬家 + 装主屏 PWA）。Vercel 仍随 git push 自动部署，作海外镜像
- **CI**: `.github/workflows/ci.yml` —— push/PR 到 main 跑 lint→test→build

---

## 最近完成（2026-07-16 四连，详见 CHANGELOG）
| | |
|---|---|
| `c62658b` | **存档止血** —— 导入清空全部卡组 / 导出漏 11 个 key / 版本降级 / resetSave 残留，+ ErrorBoundary（此前全项目零错误边界）+ 38 断言漂移守卫 |
| `7588f61` | **测试场一张卡攻击就锁死全场** —— 根因 `makeFieldCard` 不发 uid → `has(undefined)` 全场命中。一处兜底修掉 4 个同源 bug |
| `e679640` | **SP 事件卡按「实际召唤力」重定价**（效率 4000~9333 → 4500~7000）+ 修 SP 静默蒸发 |
| `344fce5` | **战场位 5→6** —— 12 个文件 / 35 处，收口成单一真相源 + 14 条漂移守卫 |

**齐齐的存档已安全**：973 抽的档（16225 金币 / 141 种卡 / 6 副卡组）已导出备份在 `~/Downloads/bio-heroes-save-2026-07-16.json`（**唯一离线备份，勿删**），并已搬到 PWA 主屏（ITP 计时器不再威胁他）。

---

## 已知问题
- 🔴 **`useBattle.js:1787` 今天就能一回合秒杀主人**（与 6 格无关，现存）：直攻主人对任何 `RUSH_BOOST` 硬编码 `×2`、无视 `evt.mods.damageMultiplier` → 虎鲸 8500×2=17000，**答对问答觉醒后 34000 > 主人 30000**
- ⚠️ **PWA 图标是 SVG**：iOS 的 `apple-touch-icon` 只吃 PNG → 齐齐主屏图标现在是糊的网页截图（功能无影响）。修好需他删掉重装一次
- `starConditions` 文案写「≤12回合」、代码硬编码 `≤10`（`campaignData.js:1046`），且该字段**根本没人读**
- 死代码：`src/effects/battleAnimations.js` 整 147 行 7 个 export 零引用 · `useAITurn.js:39` `MAX_CARDS_PER_TURN` 零引用（真实上限是 `attempt < 4`）· `useBattle.js` 的 `setAnimating`/`restorePhase`
- 战斗日志硬编码中文（~240 条，spec 方案 A 不译）
- Vite dev 偶尔 504；**验证铁律走 `vite preview`(4174) 非 dev**（沙箱 HMR 连不上）
- 里程碑发放顺序 grant-first vs App.jsx save-first（正常玩不双领，仅 Safari 隐私模式极端边界）

---

## 下次启动时优先

### 🎮 P1 · PvP 对战（方案已定，未开工）
**已锁定**（详见 `DEPLOY.md` §4 + 本轮讨论）：
- 场景：齐齐 vs 远方朋友（跨网络）· **实时** · **公平模式**（双方全卡池自由组卡，**不校验所有权** → PvP 不需要服务端收藏）
- 架构：**房间码 + VPS 哑中继 + host 权威**。host 继续跑现有 `useBattle`（2300 行 React hook，48 处 `Math.random`）—— 因为只有 host 掷骰子，**不需要拆引擎、不需要 RNG 确定性**。guest 是瘦客户端，复用现有 `aiPlayToField`/`aiAttack` 接缝
- 答题：**(b) 中性加成**（同题抢答，谁先答对拿中性奖：+1能量/抽卡/回血/科学家印记）
- ⚠️ 最大风险：**player/enemy 视角镜像**（全代码库假设「我是 player」，PvP 里两端都认为自己是 player）
- **三条不变量**（要写进 DEPLOY.md §4）：① 中继永远不懂游戏规则 ② **PvP 不产生任何持久化收益**（host 是别人家小孩的浏览器，它说「我赢了」就发金币 = 凭空印钱）③ 不校验卡牌所有权
- **两条部署纪律**：`deploy:api` 必须与 `deploy` 分开（重启 Node = 打断对局）；**存档绝不能放 `/var/www/bio/`**（`npm run deploy` 带 `--delete`）

### ☁️ P2 · 云存档（排在 PvP 之后，**不做密码账号**）
拆三层：持久化正确性（✅ 已做）/ 云存档+身份（P2）/ 密码认证（**建议永不做** —— <20 人熟人场景零收益、7 岁记不住、且新增丢档路径）。
- **恢复码 = 4 个中文词**（40bit），**不能用 6 位数字**（20bit 可枚举，而**写路径被枚举 = 存档被覆盖销毁**）
- **自动推（本地→云）+ 手动拉（云→本地）**，绝不自动双向合并。本地是唯一真相源，云只是镜像 → VPS 全挂时游戏照常
- 服务端挂进 PvP 同一个 Node 进程；`credentials` 分表预留（日后加密码 = 插一行，saves 表零迁移）

### 🎴 内容线
- **骨骼·钢铁支架**：齐齐确认**非 bug**（「骨髓造血」凭空造血是设计意图）→ 待办是**改卡面说明**讲清楚，别再被当 bug 报上来
- **S1 海洋深渊季**：引擎全就绪，只差补 OCEAN 卡（现 11 张→~20）。用 `bio-heroes-card-designer` skill，拉齐齐一起脑暴

### 🔴 等齐齐真机反馈
**重点看 `stage_2_8` 新冠 Boss** —— 6 格后唯一变难的关（它每回合 50% 无限刷副本，**唯一刹车是「场上满了」**）。其余 23 关会变简单（AI 受出牌次数/犹豫/卡组张数三重限制，连 5 格都常填不满），18 关的 3 星达成率会上升 —— 已决定不收紧，让齐齐爽。

---

## 关键文件
- **战斗引擎**：`src/hooks/useBattle.js`（规则住这，2300 行）+ `src/engine/battleReducer.js`（纯状态容器）· `src/engine/combat.js` · `src/hooks/useAITurn.js` + `src/engine/aiTarget.js` · `src/engine/{skillRegistry,skillTemplates,statusEffects,bossMechanics,stageRules}.js`
- **独立棋盘（不走 useBattle，改战场位时必须同步）**：`src/components/TutorialScreen.jsx` + `src/data/tutorialData.js` · `src/components/TestArena.jsx`
- **数据**：`src/data/{cards,eventCards,spCards,campaignData,deckRules,dexSets,gachaBanners,achievements,dailyChallenges}.js`
  - ☠️ `deckRules.js` 里 `MAX_FIELD_SLOTS`(6) / `SP_DECK_SIZE`(5) / `STARTING_HAND`(5) 同居 —— **严禁对该文件做数字查找替换**
- **存档**：`src/utils/saveManager.js`（`SAVE_KEYS` 单一清单）· `src/components/ErrorBoundary.jsx`
- **问答**：`src/data/{quizzes(563卡题),quizzesGeneral(242通用题),quizLeitner}.js` —— 总 **805 题**
- **测试**：`scripts/test-*.mjs`（**43 套**，`npm test` 入口）。漂移守卫：`test-save-manager` / `test-field-slots` / `test-quiz-similarity`
- 部署交接 `DEPLOY.md`；架构总览 `ARCHITECTURE.md`；历史见 `CHANGELOG.md`
