# Bio Heroes Session State
> 更新: 2026-07-25（**iPad 横屏 P1 B 已上生产** —— 12.9 寸横屏两侧 598px 黑边没了，
> 战场卡 114.7×160.5 → **167.6×234.7（+46%）**，手牌卡比例从 0.86/0.99 修回 5:7）。
> 同日已在生产：教学守护可见性、教学 4 处卡死修复、P1 A（卡锁 5:7 + cqh）、横屏 P0、
> guest 自选 SP、三技能修复、能量公式。
> **等齐齐反馈**：教学能否顺畅打通（含守护看不看得懂）+ **横屏 P1 A/B 观感**（卡是不是够大了、
> 竖屏有没有被弄坏）+ 虎鲸数值。反馈没来之前，可直接开工的是「下一步」的 §3 / §5。
>
> ⚠️ **本文件只留「活的交接」**——已完成阶段归档在 `CHANGELOG.md`，逐 commit 细节靠 git。别让它膨胀。

## 项目位置
- **路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）· **GitHub**: yang44yang/bio-heroes (main)
- **CI**: push 自动跑 lint→test→build · **生产**: `bio.socialcontract.capital`（`npm run deploy`）⚠️ **齐齐玩这个**

---

## ⚠️ 当前 git / 生产状态
- **HEAD = origin/main = 生产 = `55faae2`**（P1 B），干净树。**测试 67/67 绿**，lint 干净。
- ✅ **生产 = HEAD（2026-07-25 部署 + 字节 + 功能级回验）**：entry `index-Bplnlm9k.js`、
  **`index-CwU36gM8.css`**、`BattleScreen-CK62O26x.js` 三个文件线上 md5 与本地逐字节一致；
  线上 CSS 里 `min-width:900px` / `max-width:min(100%,1600px)` / `clamp(110px,15vh,168px)` / `min-width:0`
  各 1 处、chunk 里 `data-hand-card` 1 处（= 规则和钩子都真在生产里）。均返回真 `text/css`/`text/javascript` 200。
  ☝️ **样式改动必须验 CSS 文件**：Tailwind/自写 CSS 都编译进 `index-*.css`，在 JS 里搜是 0 处（老坑）。
- ☝️ **功能级回验（比对哈希更进一步，务必沿用）**：entry 的 md5 只证明"构建一致"，证明不了**某个功能**进了生产
  ——教学/PvP 代码都在 lazy chunk 里，entry 里根本搜不到。做法：`grep -l 功能关键字 dist/assets/*.js`
  找出承载它的 chunk → 到线上取同名文件 → 既比 md5 又数关键字。
  ⚠️ **Tailwind 类名要去 `index-*.css` 里找,不在 JS 里**（判据：**本地 entry 里同样是 0** 就说明不是部署问题）。
  另建议加**反向哨兵**：确认被替换掉的旧写法计数为 0。
  ⚠️ **别照抄本文件记的旧 hash**——每次自己重新 build + curl 一次（上一版这里记的 `index-D42-gkmy.js` 就已过期）。
- 🔴🔴 **PROTOCOL_VERSION 仍是 4；若哪台 iPad 还停在 v3，两台都得 Cmd+Shift+R 才能对战**。
  中继盲转字节不崩，版本闸门在客户端：v3×v4 混用时新版快照被旧版**按版本拒收** →「连不上/开不了局」
  （不是报错弹窗）。**别一台刷一台没刷就试**，会以为坏了。想看新图标重新「加到主屏」。
  - ☠️ **部署要验字节**：`npm run deploy` 回执**不算数**（曾整晚没落地）。deploy 完拉 bundle 对 md5。
  - 旧 chunk URL 仍返回 200 是 **SPA fallback 吐的 index.html**（`content-type: text/html`），不是残留。
- ⚠️ **Caddyfile 改动只在磁盘**（`Personal website dev/spacev/deploy/Caddyfile`，那目录**无 git**）——
  下次谁改 spacev 别覆盖掉 bio 的 `/api/*` handle。
- relay 更新用 `npm run deploy:api`；前端用 `npm run deploy`（**两者必须分开跑**，DEPLOY.md §4.3）。
- 本地试玩：`cd relay && npm start`（3002）+ `npm run dev`（或 preview 4174）→ 主菜单「🔗 联机对战」。

---

## 🎯 下一步（按价值排）

### 1. 继续收真机反馈 —— 优先级最高，但**卡在齐齐**
真机对战已在跑（R6 能量 bug 就是这么抓到的）。等反馈的三块：**教学五关能否打通**（守护看不看得懂）、
**iPad 横屏 P1 A+B 观感**（卡够不够大 / 竖屏有没有被弄坏）、**虎鲸新数值**。反馈到手再定后续排序。

### 2. ✅ iPad 横屏 P1 B 已完成（`55faae2`）—— 只剩「还想更大」这一档
黑边没了（容器随视口放宽，`@media(min-width:900px)`，768 竖屏基线被下界挡在外面）。
放宽后卡片改由**高度**封顶：1366×1024 下 6 张实占 **1046/1334 = 78%** 行宽。
- 剩下那 22% 要靠「把家具挪到两侧」才吃得掉 —— 但要让卡再长 67px 得腾出 **158px 竖向**，
  等于把手牌区(197px)整个搬走。**收益 22%、代价是重排主布局** → 当时判断不值，没做。
- 真要再大一点，**先动纯装饰**：VS 分隔(44px) + 底部日志(44px)，比侧栏便宜太多，约 +11% 卡面。
- 调研全文在 scratchpad 的 research-result-1/2.md（会随会话清），要留存可存 `docs/`。

### 3. 🧹 横屏收尾（小、独立、随时可做）
- **手机横屏 844×390** 槽仅 31px、内容溢 45px（物理太小，放宽宽度救不了）→ 真解是「请转竖屏」提示
  （已有 `[data-landscape-prompt]` 机制，现仅手机竖屏用，扩到手机横屏即可）。齐齐用 iPad 不受影响。
- 事件卡还没统一到 cqh（手牌**生物卡**的比例已由 P1 B 修好；照片里事件卡也溢出过）。

### 4. 🟡 4g host 迁移（掉线韧性剩下的那一半）
用户已裁定「快照热备 + **手动确认接管**」。relay 零改动，思路在 `relay/README` 末尾。
⚠️ 与已修的断线重连**不是一回事**：那次只覆盖「同页面内 socket 闪断」，
host **刷新页面**会丢内存里的凭证，那才是 4g 的范畴。

### 5. 🛡️ 给教学的「卡死复发模式」补 source-grep 守卫（便宜、防复发）
教学没法跑 Node 测试，但**可以按现有守卫套路 grep 源码**：断言 `handlePlayCard`/`handleAttack` 里
不再出现无条件 `advanceStep()`，且多次型 waitFor 仍由 useEffect 推进。参考 `test-onturnstart-skills`
的 source-grep 写法。**新守卫必须先在未修代码上变红**再提交。

### 6. 🟡 对手 / 自己的 SP **数**（guest 侧看不到）—— 攒着
✅ guest 自选 SP 已完成（`825545b`，零协议改动）。剩下的只是**数字**：`useGuestBattle` 两个 spDeck 恒 EMPTY。
要显示得把**计数**提进**公开树** → **必须 bump PROTOCOL_VERSION**（同 handCount 先例）→ 两台强制双刷。
为一个数字单独 bump 不划算 —— 等下次真要改协议时顺手带上。

---

## 已知问题（未修）
- ☠️ **教学引擎的复发模式**（4 处已修 `7ba8cb7`，同款还会再犯）：`TutorialScreen` 的
  `handlePlayCard`/`handleAttack` 早期**无条件 `advanceStep()`** —— 凡是「要做多次才算达成」的步骤
  （`play_all` 铺满全场 / `clear_field` 清光敌方）都会**做第一次就跳步** → 卡死。已改为由既有的
  「手牌空」/「敌方场空」useEffect 推进。**加新的多次型 waitFor 时必须同样处理**。
  另：`play_card` 步没有结束回合按钮 → 无牌可出必须自动跳（否则卡死，L2/L3 都中过）。
  ⚠️ 教学**没有自动化测试**（脚本+React 状态，Node 测不了）—— 改教学只能 preview 手动走查五关（见「下一步 §5」）。
- ☠️ **教学迷你卡不走 `Card.jsx`**（`TutorialScreen` 内联渲染，只画 名字/⚔️/❤️/阵营）：
  主战场卡的一切视效（守护🛡️/中毒/护盾/技能名…）在教学里**默认都看不见**。`03f453f` 只补了守护；
  以后教学要教哪个机制，**必须单独在迷你卡上补该机制的可见标识** —— 否则会重演「逻辑对了但看不见，
  等于没教」（齐齐第三关：守卫兵和普通兵长得一模一样，提示却说"有一张守护卡"）。
  判定一律用 `utils/guardSkill` 等**主战场真相源**，别在教学里另写一套。
- 🟡 **虎鲸新数值待试玩校准**：三技能失效已修（`fe706f9` = onAttack 补 friendlyField + 蜜蜂 `_side`；
  见 `test-onattack-friendly-field`）。虎鲸「协同猎杀」现活了 —— 满自然场(自己+5友方)觉醒 = 32000 ≥ 主人 30000 可秒。
  用户裁定「+1500 现值先上、和齐齐试玩再调」。要调就动 `skillRegistry` 的 `Coordinated Hunt` amount（或封顶友方数）。
- 🟡 **手机横屏 844×390 仍溢 45px** + 事件卡未统一 cqh —— 见「下一步 §3」。
  战场卡比例漂移已根治（P1 A `9a2f1c9`）、横屏黑边已取回（P1 B `55faae2`）。
  守卫：`test-p1a-card-container`（cqh/inline-size 两坑）+ `test-p1b-wide-viewport`（17 条，钉死
  「下界 <900 会卷进竖屏基线」「放宽了却忘抬 25vh」「flex 的 `min-width:auto` 悄悄顶掉 aspect-ratio」
  「手牌定高下限 <110px 会让 660 档溢 5px」四个静默复发坑；7 个变异全变红后才提交）。
- 🟡 **guest 看不到 SP 数**（自己+对手都空）：wire 故意 strip `spDeck`（隐藏信息，`wire.js:173`）→ 见「下一步 §6」。
- 🟡 预设卡组平衡待和齐齐手挑微调（自然系 raw ATK 偏强、科技系诊断卡偏多）
- 🟡 `derivePhase` 硬编码读 `state.player.phase` → guest 回合 1 派生为 `init`。已用等待横幅兜住表现
- 🟡 打包遗留（非阻塞）：`react-vendor` chunk 仅 3.6KB（React 实际在 framer 块）·「精简模式」未实现

---

## 关键文件
- **引擎**：`src/hooks/useBattle.js`（`tryQuiz`/`answerQuiz`；能量公式 `startPlayerTurn:2265` =
  `Math.min(newTurn, ENERGY_CAP)`，`beginEnemyTurn:2182` 同步）· `src/engine/{battleReducer,rules,sides,wire,quizGate,aiTarget}.js`
  - `quizGate.js` = 问答纯核心：每侧节流 + 脱敏投影 + host 判卷。答案卡只活在 useBattle 的
    `quizKeyRef`（每侧一份），永不上 wire。题面走 `state[side].quiz`（**定形槽**，v4 SHAPES）。
- **PvP**：`src/net/{relayClient,lobbyProtocol}.js` · `src/hooks/{usePvpHost,useGuestBattle}.js` ·
  `src/components/{PvpLobby,PvpDeckPicker,PvpHostBattleScreen,GuestBattleScreen,HostBattleScreen}.jsx` ·
  `relay/`（server.js + lib/ 纯核心 + smoke + deploy/bio-relay.service）
  - `usePvpHost.js` 的 `case 'endTurn'`：挂着未答的问答攻击 → 就地 ×1 结算 + `clearQuiz`（兜底，见注释）。
- **UI/样式**：`src/components/{BattleScreen,QuizModal,TutorialScreen}.jsx` · `src/index.css`（紧凑模式 + 触控热区分档 + 按下反馈）
  - QuizModal 是**由题目对象驱动的两阶段**（`rightIdx` 到达才揭晓）—— 脱敏后 guest 拿不到 correct，
    旧的「本地即时揭晓」会让他恒显示答错、看不到知识卡。别改回去。
- **测试**：`scripts/test-*.mjs`（**67 套**，`npm test`）。中继侧 control 29 / client 39 / rooms 71；
  问答侧 `test-quiz-gate` 26（纯核心）+ `test-pvp-quiz`（端到端 sim）
  - 能量公式：`test-onturnstart-skills` 加 **source-grep 守卫**（公式活在 hook 回调、Node 无 renderer 测不了运行时）
  - SW 剪枝：`test-sw-api-bypass`（Map 支撑的真 caches mock 跑剪枝，双向变异）
  - eslint 已覆盖 `src/components`（`6631d65`）
  - ☠️ **假绿铁律**：fixture 从真模块改绝不手搓 · **新守卫必须配变异测试**（先在未修代码上变红）· 相对 import 带 `.js`
  - `cd relay && npm run smoke`（10 条，不进主 CI）——**动过 control.js/rooms.js/server.js 必须跑**
- **⚠️ 浏览器验证铁律**：`vite preview`(4174)。**先 resize 视口**。家长门 prompt 答 56。
  React 状态是异步的 → 点击和读状态**必须分两次调用**。
  ☠️ 无头 tab 是 `hidden` 的：rAF 不触发、Framer 动画冻在半途，截图会拍到假 bug（先查 `visibilityState`）
  - ✅ **解法**（P1 B 实测好用）：注入 `*{opacity:1 !important}` 破掉 framer 冻在 `initial:{opacity:0}` 的
    元素（否则 `read_page` 只看得见 1 个按钮、以为界面没渲染），再用 JS `.click()` 驱动（React 合成事件收得到）。
    量布局别信截图，读 `getBoundingClientRect()`：一次 JS 调用就能把 容器/卡槽/比例/溢出/滚动条 全测完。
- **⚠️ 通道纪律**（血账）：工具输出可疑 → 用 `git status`/`md5`/`lsof` 独立回验，绝不信「成功」回执。
  起服务前先查端口（`EADDRINUSE` 会让你对着**旧代码**测，误判成回归）
- 部署 `DEPLOY.md`（§4 PvP 权威 + §4.6 服务器权威备查）· 历史 `CHANGELOG.md`
