# Bio Heroes Session State
> 更新: 2026-07-23 晚（**能量公式修复已上生产**，字节验证 —— R6 该 6 能量实得 4 的老 bug 修掉了）。
> 同一批还清掉三个旧「已知问题」：eslint 覆盖组件 / 问答挂起兜底 / SW 缓存剪枝（`6631d65`）。
> 真机对战在跑（能量 bug 就是这么抓到的）—— 下一步继续收 guest 答题 + iPad 适配的反馈。
>
> ⚠️ **本文件只留「活的交接」**——已完成阶段归档在 `CHANGELOG.md`，逐 commit 细节靠 git。别让它膨胀。

## 项目位置
- **路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）· **GitHub**: yang44yang/bio-heroes (main)
- **CI**: push 自动跑 lint→test→build · **生产**: `bio.socialcontract.capital`（`npm run deploy`）⚠️ **齐齐玩这个**

---

## ⚠️ 当前 git / 生产状态
- **HEAD = origin/main = 生产 = `1dd340e`**，干净树。测试 **62/62 绿**，lint 干净。
- ✅ **生产 = HEAD（2026-07-23 晚部署 + 字节验证）**：entry `index-CBeiY_Tq.js` prod md5 `df77168e…`
  == 本地新构建，逐字节一致；能量修复所在的 BattleScreen chunk 线上返回真 JS
  （`text/javascript` 200，不是 SPA fallback 的 text/html）。构建可复现。
- **能量修复不动 PvP 协议**（没碰 `src/net/`）→ 不新增版本闸门。但齐齐 iPad 仍需**刷一次**才拿到新 bundle
  （新公式 + SW v3）。SW 已 v2→v3，下次访问自动更新缓存。
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

### 2. 🟡 让 guest 自己选 SP（触发已对称，缺的只是「谁来选」）
⚠️ 澄清：**guest 连对 2 题已经能召 SP**，和 host 对称——`answer` intent → `answerQuiz(ENEMY)` →
`tryTriggerSp(ENEMY)` 全线通，guest 的 SP 组也已作为 `enemySpDeck` 载入。缺的**只是让齐齐自己选**哪张：
`resolveSpChoice` 的 enemy 分支走 `pickAiSpCard` **由 AI 人格代选**（`useBattle.js:1439`）。要 guest 自选，
需给 enemy 侧接一个「翻 2 张 → 回传 choice」的往返（`spChoose` intent 现被 host 安静忽略，`usePvpHost.js:29`）。
是否值得做由用户定（齐齐反正拿得到 SP，只是没得挑）。
（「host 挂起攻击兜底」已在 `6631d65` 修掉：endTurn 就地 ×1 结算 + 清题槽。）

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
- 🔴 **3 个技能因同一根因失效**：`onAttack` context 从不传 `friendlyField`（`useBattle.js:2076`）
  - 虎鲸「协同猎杀」/ 神经元「突触传递」→ 恒 `null`
  - 蜜蜂「自伤 500」→ `targetSlot` 恒 -1 → 伤害没生效**但日志照打**，卡牌实际强于卡面
  - ☠️ **修复陷阱**：事件写 `_side:'friendly'` 而消费端判 `=== 'attacker'`（`useBattle.js:428`）——
    只补 `friendlyField` 会让蜜蜂那 500 打到**敌方**。两处必须同改。
  - 等用户拍板数值（虎鲸修好会引爆满血秒杀平衡）
- 🔴 **横屏卡牌溢出**（既有，与上面第 3 条同一块地方）：Safari 横屏带地址栏时（~660px 高）
  战场区仅 106px、卡面 86px 装 104px 内容 → ATK/技能行**画到卡外**；手牌事件卡同样溢出。
- 🟡 guest 的 SP 由 AI 人格代选 · guest 侧对手 SP 数显示 0（cosmetic）
- 🟡 **SP 触发门槛 doc≠code**：`battle-system.md` 写「连对2题 / HP≤50% / 第8回合」三条独立任一即触发；
  实际代码是「**第8回合"开闸" AND（连对2题 OR HP≤50%）**」（`useBattle.js:2426`）。第8回合前连对2题只给
  觉醒×2 / 科学家模式，**不召 SP**；纯撑到第8回合但满血又没连对也不召。代码是有意的（注释多处「开闸」），是文档滞后。待定改哪边。
- 🟡 预设卡组平衡待和齐齐手挑微调（自然系 raw ATK 偏强、科技系诊断卡偏多）
- 🟡 `derivePhase` 硬编码读 `state.player.phase` → guest 回合 1 派生为 `init`。已用等待横幅兜住表现
- 🟡 打包/依赖遗留（非阻塞）：`react-vendor` chunk 仅 3.6KB（React 实际在 framer 块）·
  tsParticles 装 3 包零引用 ·「精简模式」未实现 · DEPLOY.md §4.1「零依赖」该更正为 ws 选型（§4.6 已写）

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
