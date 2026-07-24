# Bio Heroes Session State
> 更新: 2026-07-24（**guest 自选 SP 已上生产**，字节+功能验证 —— 齐齐当 guest 时终于能自己挑觉醒大招，
> 不再由 host 的 AI 代选；零协议改动，**不用双刷**，各刷一次即可）。
> 已在生产：三技能修复（friendlyField 根因）+ 能量公式 + 三个旧「已知问题」收尾。
> 真机对战在跑 —— 下一步收 guest 答题 / iPad 适配反馈；**虎鲸新数值待和齐齐试玩校准**。
>
> ⚠️ **本文件只留「活的交接」**——已完成阶段归档在 `CHANGELOG.md`，逐 commit 细节靠 git。别让它膨胀。

## 项目位置
- **路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）· **GitHub**: yang44yang/bio-heroes (main)
- **CI**: push 自动跑 lint→test→build · **生产**: `bio.socialcontract.capital`（`npm run deploy`）⚠️ **齐齐玩这个**

---

## ⚠️ 当前 git / 生产状态
- **HEAD = origin/main = 生产 = `6e5264f`**，干净树。测试 **64/64 绿**，lint 干净。
- ✅ **生产 = HEAD（2026-07-24 部署 + 字节验证）**：entry `index-D42-gkmy.js` prod md5 `ee5ae3fc…`
  == 本地新构建，逐字节一致；各 chunk 均返回真 JS（`text/javascript` 200，不是 SPA fallback 的 html）。
- ☝️ **功能级回验（比对哈希更进一步，值得沿用）**：光对 entry 的 md5 只证明"构建一致"，
  证明不了**某个功能**真进了生产（PvP 代码在 lazy chunk 里，entry 里根本搜不到）。
  做法：`grep -l 功能关键字 dist/assets/*.js` 找出承载它的 chunk → 到线上取同名文件 →
  既比 md5 又数关键字。本次：`PvpLobby-DoSAZdQc.js` 线上 `spChoose` 6 处、md5 一致。
- **技能修复 / guest 自选 SP 都不动 PvP 协议**（没碰 `SHAPES` 公开树）→ 不新增版本闸门、**不用双刷**。
  但齐齐 iPad 仍需**刷一次**才拿到新 bundle。SW 已在 v3，下次访问自动更新缓存。
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

### 1. 继续收真机反馈 —— 先做这个
真机对战已在跑（R6 能量 bug 就是这么抓到并修掉的）。还没被充分玩过的是两块新东西：
**guest 答题**（当 guest 也能答题、答对 ×2、看知识卡）+ **iPad 适配**（按钮变大、按下有反馈、主屏图标）。
让齐齐各玩一局再定后续优先级。

### 2. 🟡 对手 / 自己的 SP **数**（guest 侧看不到）
✅ **guest 自选 SP 已做完**（`825545b`）：候选走 self 私有通道 + `spChoose` intent 回传，**零协议改动**；
回合末没选则 AI 兜底代选。剩下的只是**数字**：guest 看不到 SP 数（`useGuestBattle` 两个 spDeck 恒 EMPTY）。
要显示得把**计数**提进**公开树** → **必须 bump PROTOCOL_VERSION**（同 handCount 先例）→ 两台强制双刷。
为一个数字单独 bump 不划算 —— **攒着**，等下次真要改协议时顺手带上。

### 3. 📱 iPad 横屏改版（这次**刻意没做**）
- `max-w-3xl`(768px) 封顶 → 1024px iPad 两侧各 128px 黑边、12.9 寸各约 300px。
- ☠️ **别只放大 max-width**：实测那样不会让卡变大，只会把卡**横向拉扁**（长宽比 0.79→1.10，比高还宽），
  卡内字号一像素不变 —— 对「7 岁看得清」零收益甚至负收益。
- 真解法要动卡片布局模型（容器查询 + 按高定宽 + 字号跟容器走）。对抗性复核挑出几个坑：
  字号跟容器**高**走但约束在**宽** → 反而制造新截断；卡片居中后 ⓘ 会飘到虚线框外；
  手牌卡那条改动没做方向门控 → 竖屏手牌宽度掉 27%。
- 这是**一次视觉改版**，建议齐齐坐旁边、改一版看一版。**竖屏（768×1024）是唯一合格档位，别弄坏它。**

### 4. 🟡 4g host 迁移（掉线韧性剩下的那一半）
用户已裁定「快照热备 + **手动确认接管**」。relay 零改动，思路在 `relay/README` 末尾。
⚠️ 与已修的断线重连**不是一回事**：那次只覆盖「同页面内 socket 闪断」，
host **刷新页面**会丢内存里的凭证，那才是 4g 的范畴。

---

## 已知问题（未修）
- 🟡 **虎鲸新数值待试玩校准**：三技能失效已修（`fe706f9` = onAttack 补 friendlyField + 蜜蜂 `_side`；
  见 `test-onattack-friendly-field`）。虎鲸「协同猎杀」现活了 —— 满自然场(自己+5友方)觉醒 = 32000 ≥ 主人 30000 可秒。
  用户裁定「+1500 现值先上、和齐齐试玩再调」。要调就动 `skillRegistry` 的 `Coordinated Hunt` amount（或封顶友方数）。
- 🔴 **横屏卡牌溢出**（既有，与「下一步」第 3 条同一块地方）：Safari 横屏带地址栏时（~660px 高）
  战场区仅 106px、卡面 86px 装 104px 内容 → ATK/技能行**画到卡外**；手牌事件卡同样溢出。
- 🟡 **guest 看不到 SP 数**（自己+对手都空）：wire 故意 strip `spDeck`（内容是隐藏信息，`wire.js:173`）。
  显示"数量"要把计数提进公开树 → **bump 协议**（强制双刷），非零风险 —— 攒着等下次改协议一起带。
  （「由 AI 代选」那半已在 `825545b` 修掉：guest 现在自己选。）
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
- **UI/样式**：`src/components/{BattleScreen,QuizModal}.jsx` · `src/index.css`（紧凑模式 + 触控热区分档 + 按下反馈）
  - QuizModal 是**由题目对象驱动的两阶段**（`rightIdx` 到达才揭晓）—— 脱敏后 guest 拿不到 correct，
    旧的「本地即时揭晓」会让他恒显示答错、看不到知识卡。别改回去。
- **测试**：`scripts/test-*.mjs`（**62 套**，`npm test`）。中继侧 control 29 / client 39 / rooms 71；
  问答侧 `test-quiz-gate` 26（纯核心）+ `test-pvp-quiz`（端到端 sim：guest 答对 ×2 / 答案不上 wire / 挂起题 endTurn 清槽）
  - 能量公式：`test-onturnstart-skills` 加 **source-grep 守卫**（公式活在 hook 回调、Node 无 renderer 测不了运行时）
  - SW 剪枝：`test-sw-api-bypass`（Map 支撑的真 caches mock 跑剪枝，双向变异）
  - ✅ **eslint 现已覆盖 `src/components`**（`6631d65`：config 加 `ecmaFeatures.jsx`、零插件、`no-undef` 零违规）
  - ☠️ **假绿铁律**：fixture 从真模块改绝不手搓 · **新守卫必须配变异测试**（先在未修代码上变红）· 相对 import 带 `.js`
  - `cd relay && npm run smoke`（10 条，不进主 CI）——**动过 control.js/rooms.js/server.js 必须跑**
- **⚠️ 浏览器验证铁律**：`vite preview`(4174)。**先 resize 视口**。家长门 prompt 答 56。
  React 状态是异步的 → 点击和读状态**必须分两次调用**。
  ☠️ 无头 tab 是 `hidden` 的：rAF 不触发、Framer 动画冻在半途，截图会拍到假 bug（先查 `visibilityState`）
- **⚠️ 通道纪律**（血账）：工具输出可疑 → 用 `git status`/`md5`/`lsof` 独立回验，绝不信「成功」回执。
  起服务前先查端口（`EADDRINUSE` 会让你对着**旧代码**测，误判成回归）
- 部署 `DEPLOY.md`（§4 PvP 权威 + §4.6 服务器权威备查）· 历史 `CHANGELOG.md`
