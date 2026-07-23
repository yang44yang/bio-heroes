# Bio Heroes Session State
> 更新: 2026-07-23（**guest 答题已上生产**，字节验证过 —— host×2/guest×1 的不公平修掉了。
> ☠️ **这次是 PROTOCOL_VERSION 3→4：你和齐齐两台 iPad 必须都强刷才能对战**（见下）。
> 齐齐还没试玩过最近三批改动 —— 下一步先收反馈。）
>
> ⚠️ **本文件只留「活的交接」**——已完成阶段归档在 `CHANGELOG.md`，逐 commit 细节靠 git。别让它膨胀。

## 项目位置
- **路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）· **GitHub**: yang44yang/bio-heroes (main)
- **CI**: push 自动跑 lint→test→build · **生产**: `bio.socialcontract.capital`（`npm run deploy`）⚠️ **齐齐玩这个**

---

## ⚠️ 当前 git / 生产状态
- **HEAD = origin/main = `7fa8c0d`**，干净树。测试 **62/62 绿**，lint 干净。
- ✅ **生产 = HEAD（2026-07-23 部署并字节验证）**：entry + BattleScreen chunk md5 逐字节一致，
  生产 BattleScreen chunk 里能看到 `QUIZ_ASK`/`QUIZ_REVEAL`（v4 + guest 答题已上线）。构建可复现。
- 🔴🔴 **PROTOCOL_VERSION 3→4 —— 两台 iPad 必须都强刷才能对战！**
  中继不关心版本（盲转字节，不会崩），但版本闸门在客户端：一台 v3 一台 v4 时，新版发的快照
  被旧版**按版本拒收** → 表现是「连不上/开不了局」，不是报错弹窗。**别一台刷一台没刷就试**，
  会以为坏了。两台都 Cmd+Shift+R（过 Service Worker）后再进「🔗 联机对战」。想看新图标重新「加到主屏」。
  - ☠️ **部署要验字节**：`npm run deploy` 的回执**不算数**（曾整晚没落地）。deploy 完拉 bundle 对 md5。
  - 旧 chunk URL 仍返回 200 是 **SPA fallback 吐的 index.html**（`content-type: text/html`），不是残留。
- ⚠️ **Caddyfile 改动只在磁盘**（`Personal website dev/spacev/deploy/Caddyfile`，那目录**无 git**）——
  下次谁改 spacev 别覆盖掉 bio 的 `/api/*` handle。
- relay 更新用 `npm run deploy:api`；前端用 `npm run deploy`（**两者必须分开跑**，DEPLOY.md §4.3）。
- 本地试玩：`cd relay && npm start`（3002）+ `npm run dev`（或 preview 4174）→ 主菜单「🔗 联机对战」。

---

## 🎯 下一步（按价值排）

### 1. 收齐齐试玩反馈 —— 先做这个
生产上有三批他没见过的改动：**断线重连**（闪断自动回原房）+ **iPad 适配**（按钮变大、按下有反馈、
主屏图标正常）+ **guest 答题**（他当 guest 也能答题、答对 ×2、看知识卡）。让他玩一局再定优先级。

### 2. 🟡 guest 答题的两个后续（本次刻意没做，都不影响核心公平性）
- **连对 2 题触发 SP** 还没接线（guest 侧）：`answerQuiz` 已 side 化、`tryTriggerSp(side,'gated')` 已备。
- **host 挂起攻击的超时兜底**：guest 收到题后掉线/一直不答 → `pendingAttackRef` 永久挂起、那一侧回合
  推不动。值得补一条「endTurn 到达 或 超时 → 以 ×1 结算」，做成 `quizGate.js` 纯函数（可测）；
  落点是 `usePvpHost.js` 的 `case 'answer'`。

### 3. 📱 iPad 横屏改版（这次**刻意没做**）
- `max-w-3xl`(768px) 封顶 → 1024px iPad 两侧各 128px 黑边、12.9 寸各约 300px。
- ☠️ **别只放大 max-width**：实测那样不会让卡变大，只会把卡**横向拉扁**（长宽比 0.79→1.10，
  比高还宽），卡内字号一个像素不变 —— 对「7 岁看得清」零收益甚至负收益。
- 真解法要动卡片布局模型（容器查询 + 按高定宽 + 字号跟容器走）。对抗性复核在该方案里挑出几个坑：
  字号跟容器**高**走但约束在**宽** → 反而制造新截断；卡片居中后 ⓘ 会飘到虚线框外；
  手牌卡那条改动没做方向门控 → 竖屏手牌宽度掉 27%。
- 这是**一次视觉改版**，建议齐齐坐旁边、改一版看一版。**竖屏（768×1024）目前是唯一合格档位，别弄坏它。**

### 4. 🟡 4g host 迁移（掉线韧性剩下的那一半）
用户已裁定「快照热备 + **手动确认接管**」。relay 零改动，思路在 `relay/README` 末尾。
⚠️ 与已修的断线重连**不是一回事**：这次只覆盖「同页面内 socket 闪断」，
host **刷新页面**会丢内存里的凭证，那才是 4g 的范畴。

---

## 已知问题（未修）
- 🔴 **3 个技能因同一根因失效**：`onAttack` context 从不传 `friendlyField`（`useBattle.js:2076`）
  - 虎鲸「协同猎杀」/ 神经元「突触传递」→ 恒 `null`
  - 蜜蜂「自伤 500」→ `targetSlot` 恒 -1 → 伤害没生效**但日志照打**，卡牌实际强于卡面
  - ☠️ **修复陷阱**：事件写 `_side:'friendly'` 而消费端判 `=== 'attacker'`（`useBattle.js:428`）——
    只补 `friendlyField` 会让蜜蜂那 500 打到**敌方**。两处必须同改。
  - 等用户拍板数值（虎鲸修好会引爆满血秒杀平衡）
- 🔴 **横屏卡牌溢出**（既有，与上面第 3 条同一块地方）：Safari 横屏带地址栏时（~660px 高）
  战场区仅 106px、卡面 86px 装 104px 内容 → ATK/技能行**画到卡外**；手牌事件卡同样溢出（实测超 48px）。
- 🟡 guest 的 SP 由 AI 人格代选 · guest 侧对手 SP 数显示 0（cosmetic）
- 🟡 预设卡组平衡待和齐齐手挑微调（自然系 raw ATK 偏强、科技系诊断卡偏多）
- 🟡 `derivePhase` 硬编码读 `state.player.phase` → guest 回合 1 派生为 `init`。已用等待横幅兜住表现
- 🟡 **eslint 盲区**：`npm run lint` 不含 `src/components`（8123 行）。配置说「JSX 需插件、噪音大」——
  **实测不成立**：ESLint 10 加 `parserOptions.ecmaFeatures.jsx` 即可、零插件、`no-undef` 零违规。成本 0。
- 🟡 SW 缓存无界增长（`CACHE_NAME` 是常量 → 每次发版的新哈希文件进同一 cache 且旧的从不清）·
  chunk 名不副实（`react-vendor` 仅 3.6KB，React 实际在 framer 块里）· tsParticles 装了 3 个包但零引用 ·
  「精简模式」未实现 · DEPLOY.md §4.1「零依赖」该更正为 ws 选型（§4.6 已写）

---

## 关键文件
- **引擎**：`src/hooks/useBattle.js`（`tryQuiz`/`answerQuiz`）· `src/engine/{battleReducer,rules,sides,wire,quizGate,aiTarget}.js`
  - `quizGate.js`（新）= 问答纯核心：每侧节流 + 脱敏投影 + host 判卷。答案卡只活在 useBattle 的
    `quizKeyRef`（每侧一份），永不上 wire。题面走 `state[side].quiz`（**定形槽**，v4 SHAPES）。
- **PvP**：`src/net/{relayClient,lobbyProtocol}.js` · `src/hooks/{usePvpHost,useGuestBattle}.js` ·
  `src/components/{PvpLobby,PvpDeckPicker,PvpHostBattleScreen,GuestBattleScreen,HostBattleScreen}.jsx` ·
  `relay/`（server.js + lib/ 纯核心 + smoke + deploy/bio-relay.service）
- **UI/样式**：`src/components/{BattleScreen,QuizModal}.jsx` · `src/index.css`（紧凑模式 + 触控热区分档 + 按下反馈）
  - QuizModal 是**由题目对象驱动的两阶段**（`rightIdx` 到达才揭晓）—— 脱敏后 guest 拿不到 correct，
    旧的「本地即时揭晓」会让他恒显示答错、看不到知识卡。别改回去。
- **测试**：`scripts/test-*.mjs`（**62 套**）。中继侧 control 29 / client 39 / rooms 71；
  问答侧 `test-quiz-gate` 26（纯核心）+ `test-pvp-quiz` 35（端到端 sim：guest 答对 ×2 / 答案不上 wire）
  - ☠️ **假绿铁律**：fixture 从真模块改绝不手搓 · **新守卫必须配变异测试** · 相对 import 带 `.js`
  - ☠️ **「no-red」是 fake-green 的镜像**：改完一条都没红 ≠ 安全，可能是**零覆盖**。
    验收条件是「新断言先在未修代码上变红」。多道防线要**各自**可变异（曾写过一条假的变异注释）
  - `cd relay && npm run smoke`（10 条，不进主 CI）——**动过 control.js/rooms.js/server.js 必须跑**
- **⚠️ 浏览器验证铁律**：`vite preview`(4174)。**先 resize 视口**。家长门 prompt 答 56。
  React 状态是异步的 → 点击和读状态**必须分两次调用**。
  ☠️ 无头 tab 是 `hidden` 的：rAF 不触发、Framer 动画冻在半途，截图会拍到假 bug（先查 `visibilityState`）
- **⚠️ 通道纪律**（血账）：工具输出可疑 → 用 `git status`/`md5`/`lsof` 独立回验，绝不信「成功」回执。
  起服务前先查端口（`EADDRINUSE` 会让你对着**旧代码**测，误判成回归）
- 部署 `DEPLOY.md`（§4 PvP 权威 + §4.6 服务器权威备查）· 历史 `CHANGELOG.md`
