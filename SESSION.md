# Bio Heroes Session State
> 更新时间: 2026-07-17（**技能倍率收口 → 下一步 PvP**。07-16 四连（存档止血/测试场锁死/SP 重定价/6 格）+ 07-17 直攻主人倍率修复，全部已发布生产（逐字节验证过）。44 套测试绿。PvP 方案已定但未开工。）
>
> ⚠️ **本文件只留「活的交接」**——历史阶段（Sprint 1-33 + 决策/Phase + 引擎重构 + 真机 bug-fix + 特性/内容扩建 + 07-16 四连 + 07-17 倍率收口）已归档到 `CHANGELOG.md`，逐 commit 细节在 git。别再让它膨胀（精简纪律见 CLAUDE.md）。

## 项目位置
- **实际路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）
- **GitHub**: github.com/yang44yang/bio-heroes (main 分支)
- **工作流**: 直接在 main 工作和 push
- **生产**: `bio.socialcontract.capital`（`npm run deploy`）。⚠️ **齐齐现在玩这个**（已从 vercel.app 搬家 + 装主屏 PWA）。Vercel 仍随 git push 自动部署，作海外镜像
- **CI**: `.github/workflows/ci.yml` —— push/PR 到 main 跑 lint→test→build

---

## 最近完成（详见 CHANGELOG）
| | |
|---|---|
| `57644b7` | **直攻主人的技能倍率读 `mods`**（07-17）—— 旧写法只认 `evt.type==='RUSH_BOOST'` 就硬乘 2、从不读事件声明的 `mods.damageMultiplier`。而 RUSH_BOOST 是**被复用的 type**（无视守护/护盾/加伤都用它）。三张卡受害：手术刀（只该无视守护、没声明倍率→白拿 ×2，11000→5500）· 猎豹/猫头鹰（卡面 ×1.5→实际 ×2，10000→7500）。改成复用打卡路径的 `aggregateCombatMods`，两条路径语义对齐。+ 修 `Rush`（靠 mutate ctx 传倍率，改后会变哑弹）+ 新增 `test-leader-damage.mjs`（33 断言） |
| `c62658b` | **存档止血** —— 导入清空全部卡组 / 导出漏 11 个 key / 版本降级 / resetSave 残留，+ ErrorBoundary（此前全项目零错误边界）+ 38 断言漂移守卫 |
| `7588f61` | **测试场一张卡攻击就锁死全场** —— 根因 `makeFieldCard` 不发 uid → `has(undefined)` 全场命中。一处兜底修掉 4 个同源 bug |
| `e679640` | **SP 事件卡按「实际召唤力」重定价**（效率 4000~9333 → 4500~7000）+ 修 SP 静默蒸发 |
| `344fce5` | **战场位 5→6** —— 12 个文件 / 35 处，收口成单一真相源 + 14 条漂移守卫 |

**齐齐的存档已安全**：973 抽的档（16225 金币 / 141 种卡 / 6 副卡组）已导出备份在 `~/Downloads/bio-heroes-save-2026-07-16.json`（**唯一离线备份，勿删**），并已搬到 PWA 主屏（ITP 计时器不再威胁他）。

---

## 已知问题
- 🔴 **两张卡的招牌技能 100% 失效**：四个 `triggerSkills('onAttack')` 调用点（`useBattle.js` 1820/1862/2058/2082）**没有一个传 `friendlyField`**，而 `conditionalAtk` 的 `per_ally` 分支读它（`skillTemplates.js:230`）→ **虎鲸·深海霸主「协同猎杀」(8500 SSR)** 与 **神经元·闪电信使「突触传递」(4000 SR)** 从不触发。`test-leader-damage.mjs` ⑥ 放了哨兵，补上时会红
  - ⚠️ **修它会同时引爆平衡问题**：虎鲸满场 5 个自然系友方 = (8500+7500)×2(觉醒) = **32000 ≥ 主人 30000 → 满血秒杀**。5 格时是 29000（差 1000，设计上是「打残、下回合致死」）—— **是 6 格那次改动把它推过线的**，当时没人回头看 `amount:1500` 这个常量。补 `friendlyField` 前先决定：调低 1500 / 给 allies 数量加 cap / 接受它
  - 📌 **历史更正**：本条原写作「虎鲸叠觉醒 34000 秒杀主人」——**那是假的**。写它的探针传了生产从不传的 `friendlyField`。真实 ctx 下虎鲸事件数为 0、直攻恒 17000，秒杀路径从未存在。教训记在 `test-leader-damage.mjs` 文件头
- 🟡 **科学家模式 ×1.2 在「打卡」时被静默丢弃**：`calcCardBattle`（`damage.js:76-131`）不读 `opts.damageMultiplier`，`resolveCardCombat` 只单独消费 `mods` → 连对 3 题的奖励**只在直攻主人生效，对着卡打是 0 收益**
- ⚠️ **PWA 图标是 SVG**：iOS 的 `apple-touch-icon` 只吃 PNG → 齐齐主屏图标现在是糊的网页截图（功能无影响）。修好需他删掉重装一次
- Tailwind v4（裸 `@import "tailwindcss"`）会扫 `CHANGELOG.md`/`SESSION.md` —— **文档散文里写到类名会变成生产 CSS 里的死规则**（现 `.grid-cols-5` 59 字节，无害但会累积）
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

### 🔧 技能引擎欠账（`57644b7` 顺带查出，都没动）
按「改一次就一起改」的顺序做，别拆开：
1. **补 `friendlyField`** → 活化虎鲸/神经元两张卡（见「已知问题」🔴），**同时**决定 32000 秒杀怎么办
2. **`calcCardBattle` 消费 `damageMultiplier`** → 修科学家模式打卡 0 收益（见「已知问题」🟡）
3. `skillTemplates.js:268` 的 `ratio = (atk+bonus)/atk` 把**固定加伤近似成倍率** —— 只在「乘 ATK」时恰好对，遇到「乘伤害」的修饰符就错（科学家模式叠上去实测 38400）；且 `atk===0` → `Infinity`（cost 0 炮灰卡是 CLAUDE.md 明确允许的）。正解是加 `mods.damageBonus`，在所有乘法**之后**加一次

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
- **测试**：`scripts/test-*.mjs`（**44 套**，`npm test` 入口）。漂移守卫：`test-save-manager` / `test-field-slots` / `test-quiz-similarity` / `test-leader-damage`
  - ⚠️ **写引擎测试的铁律**：ctx 必须与生产调用点**逐字一致**。`test-leader-damage` 初版多传了一个 `friendlyField`，就凭空造出一个假 bug 且断言永远绿 —— 假绿比没测试更危险
  - `engine/`+`utils/` 的相对 import **必须带 `.js`**（Vite 两种都吃，Node ESM 只吃带的）。历史上带扩展名的文件全都有测试、不带的全都没有 —— 无扩展名 = 自动被挡在测试套件外
- 部署交接 `DEPLOY.md`；架构总览 `ARCHITECTURE.md`；历史见 `CHANGELOG.md`
