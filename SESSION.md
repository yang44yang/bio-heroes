# Bio Heroes Session State
> 更新: 2026-07-22（**断线重连 + iPad 适配已上生产**，字节验证过。
> 齐齐还没试玩过这两批改动 —— 下一步先收反馈，再动横屏改版或 guest 答题。）
>
> ⚠️ **本文件只留「活的交接」**——已完成阶段归档在 `CHANGELOG.md`，逐 commit 细节靠 git。别让它膨胀。

## 项目位置
- **路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）· **GitHub**: yang44yang/bio-heroes (main)
- **CI**: push 自动跑 lint→test→build · **生产**: `bio.socialcontract.capital`（`npm run deploy`）⚠️ **齐齐玩这个**

---

## ⚠️ 当前 git / 生产状态
- **HEAD = origin/main = `dea1572`**，干净树。测试 **60/60 绿**，lint 干净。
- ✅ **生产 = HEAD（2026-07-22 部署并字节验证）**：JS/CSS + 4 个新图标 md5 逐个比对一致，
  meta（`status-bar-style: black`、PNG apple-touch-icon）与 manifest（已移除 orientation）线上确认。
  构建可复现（同 commit 重建出同 hash）。
  - ☠️ **部署要验字节**：`npm run deploy` 的回执**不算数**。曾有一次「跑完 deploy」实际没落地、
    生产停在旧 bundle 一整晚。以后每次 deploy 完拉 bundle 对 md5。
  - 旧 chunk URL 仍返回 200 是 **SPA fallback 吐的 index.html**（`content-type: text/html`），不是残留。
  - ⚠️ 齐齐需**强刷一次**（Cmd+Shift+R）过 Service Worker；想看新图标要重新「加到主屏」。
- ⚠️ **Caddyfile 改动只在磁盘**（`Personal website dev/spacev/deploy/Caddyfile`，那目录**无 git**）——
  下次谁改 spacev 别覆盖掉 bio 的 `/api/*` handle。
- relay 更新用 `npm run deploy:api`；前端用 `npm run deploy`（**两者必须分开跑**，DEPLOY.md §4.3）。
- 本地试玩：`cd relay && npm start`（3002）+ `npm run dev`（或 preview 4174）→ 主菜单「🔗 联机对战」。

---

## 🎯 下一步（按价值排）

### 1. 收齐齐试玩反馈 —— 先做这个
生产上有两批他没见过的改动：**断线重连**（现在闪断能自动回原房）+ **iPad 适配**
（按钮大了一圈、按下有反馈、主屏图标正常了）。让他玩一局再定后面的优先级。

### 2. 🔴 guest 结构性拿不到问答（既是不公平也是教育缺失）
- `useGuestBattle` 里 `tryQuiz: () => null`；host 重放 guest 攻击时写死空 awakenOpts（`usePvpHost.js:214`）。
- 后果：**host 答对能 ×2 ATK，guest 永远 ×1**（主人 30000 HP，这是大摆动）；且 guest 整局看不到知识卡
  —— 对 guest 那一方，「玩法即学习」是关掉的。谁当 guest 谁吃亏还学不到。
- ✅ 地基当初就是照这个铺的：`answer` intent 已在协议里带校验器（`wire.js:110,716`）；
  `wire.js:83` 已裁定「tryQuiz 是 attack 的服务端副作用，host 自己判」；`wire.js:99-100` 已裁定
  guest **传不进**倍率；`PRIVATE_KEYS` 已挡 `correct`/`answer`（题目能发、答案不发）。
- 缺三块：① 脱敏 `currentQuiz` 进公开树（需 `SHAPES[4]` + PROTOCOL_VERSION=4，棘轮会当场拦你）
  ② guest 侧渲染 QuizModal + 发 `answer` intent ③ host 挂起 guest 攻击等 answer 到达再结算。
- ⚠️ **要先拍板一个设计点**：`tryQuiz` 的节流 ref（`firstAttackDone`/`lastQuizTurn`）是**单实例共享**的，
  两侧共用一套触发节奏。做成「双方共享冷却」还是「每侧独立」是设计决策，不是实现细节。

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
- 🟡 **eslint 盲区**：`npm run lint` 不含 `src/components`（8123 行，含 1665 行 BattleScreen）。
  配置里写的理由是「JSX 需插件、噪音大」—— **实测不成立**：ESLint 10 只要
  `parserOptions.ecmaFeatures.jsx` 就能解析，零插件，且 `no-undef` 跑下来**零违规**。补上成本为 0。
- 🟡 SW 缓存无界增长（`CACHE_NAME` 是常量 → 每次发版的新哈希文件进同一 cache 且旧的从不清）·
  chunk 名不副实（`react-vendor` 仅 3.6KB，React 实际在 framer 块里）· tsParticles 装了 3 个包但零引用 ·
  「精简模式」未实现 · DEPLOY.md §4.1「零依赖」该更正为 ws 选型（§4.6 已写）

---

## 关键文件
- **引擎**：`src/hooks/useBattle.js`（`tryQuiz` 在 2338 行）· `src/engine/{battleReducer,rules,sides,wire,aiTarget}.js`
- **PvP**：`src/net/{relayClient,lobbyProtocol}.js` · `src/hooks/{usePvpHost,useGuestBattle}.js` ·
  `src/components/{PvpLobby,PvpDeckPicker,PvpHostBattleScreen,GuestBattleScreen,HostBattleScreen}.jsx` ·
  `relay/`（server.js + lib/ 纯核心 + smoke + deploy/bio-relay.service）
- **UI/样式**：`src/components/BattleScreen.jsx` · `src/index.css`（紧凑模式 + 触控热区分档 + 按下反馈）
- **测试**：`scripts/test-*.mjs`（**60 套**）。中继侧 control 29 / client 39 / rooms 71 条断言
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
