# Bio Heroes Session State
> 更新: 2026-07-19（**🎯 PvP 能对战 + 浮字/日志 + 4f 零收益 + 等待横幅 + guest 换牌**：全部已 push。齐齐真机试玩：#2(不能操作)非 bug→补等待横幅；#1(不能换牌)→已实现 guest 换牌，双 tab 实测通。下一步 handCount / 4g / 部署。）
>
> ⚠️ **本文件只留「活的交接」**——已完成阶段归档在 `CHANGELOG.md`，逐 commit 细节靠 git。别让它膨胀。

## 项目位置
- **路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）· **GitHub**: yang44yang/bio-heroes (main)
- **CI**: push 自动跑 lint→test→build · **生产**: `bio.socialcontract.capital`（`npm run deploy`）⚠️ **齐齐玩这个**

---

## ⚠️ 当前 git / 生产状态
- **HEAD = origin/main = `b7187bf`**（干净树，全部已 push）。链：…→`eafe770`(4d)→`4008a00`(4e 事件环)→`b7187bf`(4e 交接)。
- **生产 VPS = 旧版本**（wire 第 1 步之前）。`npm run deploy` 一直没跑 —— 何时推给齐齐待用户定。
  部署 PvP 到生产还需：中继上 VPS（relay/README + deploy:api）+ Caddy bio block 加 `/api/*` handle（spacev 仓库）。
- 本地试玩：`cd relay && npm start`（3002）+ `npm run dev`（或 preview 4174）→ 主菜单「🔗 联机对战」。

---

## 🎯 PvP 现状（host 权威 + 哑中继；架构定案见 DEPLOY.md §4 + §4.6 备查）
**已完成（全部真机验证）**：
- **wire 协议**（`src/engine/wire.js`，PROTOCOL_VERSION=2）：三通道 sync + intent + resume；形状棘轮 SHAPES[]
- **哑中继**（`relay/`）：零 wire import、盲转字节、纯核心+IO外壳；房间码 4 位（去 O/0/I/1）
- **4a** `src/net/relayClient.js`（分流 relay.*/游戏帧、重连带 token）+ `PvpLobby`（建房/加入）
- **4b** battle 提成 prop：`HostBattleScreen` wrapper，BattleScreen 表现层化（单机逐帧一致验证过）
- **4c** `usePvpHost`：提交后推 buildSync / decodeIntent(raw,ENEMY)→acceptIntent(**消费即 ack**)→照 useAITurn 约定重放 / 敌方回合 bootstrap；`remoteEnemy` 关 AI + 关开局替敌方摆卡
- **4d** `useGuestBattle`：同形状 battle 适配器（快照渲染 + intent 方法 + canAttack 用真 rules.canAttackFrom 跑快照）+ `GuestBattleScreen`；guest 收首帧 sync 自动进战斗
- **里程碑实测**：两 tab 建房/加入/开战 → guest 亲手出牌（intent→host 重放→快照回流：手牌 6→5、能量 2→1）→ 回合双向交接 → host 回合 2。host 手牌全程零泄漏（脚本断言）。

- **4e 已完成**：浮字 + 日志上 wire（floatEvent/logEvent→环→readEvents→showFloat/带视角前缀日志）。
  两 tab 验证：host 攻击→guest 见 -5000/-1000 浮字；出牌日志双向（🔴对方/🔵我方前缀）。
  剩 fx/reveal/boss 事件暂不渲染、拒绝类反馈不进环（guest 看快照没变自明）。

- ✅ **4f 零收益守卫已 push（`0871a17`）**：`pvpActiveRef.current=screen==='pvp'`（镜像不漂移）+ handleExitBattle 顶部早退兜底。今天仍结构性零收益（onExit 回大厅不走此函数），4f 防未来重构接进 handleExitBattle 污染经济；当前 screen 互斥 → guard 恒不触发，单机结算逐字节不变
- ✅ **等待横幅已 push**：`isWaitingRemote=remoteEnemy && !winner && phase∈{init,enemyTurn}` → PvP 非自己回合显示「⏳ 对方回合，请稍候…」（非阻断，board 仍可见）。补掉齐齐反馈的「guest 回合死板零反馈」（那是 enemyTurn 只有 "敌方..." 迷你标签，不是回合交接坏 —— 无头 sim + 双 tab 已证交接通）。host 等 guest 时同样显示，对称。单机 remoteEnemy=false 永不触发
- ✅ **guest 换牌已实现**（齐齐反馈 #1）：wire mulligan intent 本就在协议里（无需改协议）。startBattle `enemyMulligan:remoteEnemy` → PvP 敌方进 mulligan 相位；endMulligan 加 side 参数；useGuestBattle 发 mulligan intent；usePvpHost replayIntent 加 case（enemyHand.mulligan + endMulligan(ENEMY)，enemyMulliganedRef 幂等防双击）。**双 tab 实测**：guest 得换牌屏 → 选卡确认 → host 应用（日志"对手换了1张牌/换牌完毕"、guest 手牌真变）→ guest 转等待；双方并发换牌互不干扰。单机字节不变（sim + 58 测试）。**边缘 case**：host 若在 guest 换牌前就结束回合1 → guest 丢换牌（休闲对局可忽略，未加 gate）

**里程碑简化（诚实债，按齐齐反馈排优先级）**：
- guest 不答题（tryQuiz→null）/ SP 由 AI 人格代选（resolveSpChoice enemy 分支现状）
- 对手手牌数显示 0（handCount 上 wire 要 bump SHAPES 版本）· PvpLobby guest「对战接入在下一步」文案过时
- PvP 卡组固定测试卡组（host=playerTestDeck，guest=enemyTestDeck；卡组选择漏斗后续）
- **4g** host 迁移（快照热备+手动确认接管，用户已裁定手动）· 断线重连的游戏级补播（resume/lastSeen，wire 已留位）
- guest 的 enemyTurn 期间 intent 是「host 敌方相位」下唯一入口；guest 若在非自己回合发 intent，引擎 gate 拒（已验证安全）

---

## 已知问题（历史债，与 PvP 无关的照旧）
- 🔴 **虎鲸/神经元招牌技能 100% 失效**（`friendlyField` 未传参；修复引爆满血秒杀平衡，先决定数值再修）
- 🟡 科学家模式 ×1.2 打卡时被静默丢弃（只在直攻主人生效）
- 🟡 `derivePhase` 硬编码读 `state.player.phase` 判 init/mulligan —— guest 回合1 派生为 `init`（host 侧 enemy.phase 还没被驱动过）。已用等待横幅兜住表现（不再是零反馈死板）；相位派生本身没「真修」，但现在无碍
- PWA 图标 SVG（iOS 糊）· Tailwind v4 扫 md 文档

---

## 关键文件
- **引擎**：`src/hooks/useBattle.js`（暴露 battleState）· `src/engine/{battleReducer,rules,sides,wire,aiTarget}.js` · `src/hooks/useAITurn.js`（加 disabled）
- **PvP**：`src/net/relayClient.js` · `src/hooks/{usePvpHost,useGuestBattle}.js` · `src/components/{PvpLobby,PvpHostBattleScreen,GuestBattleScreen,HostBattleScreen}.jsx` · `relay/`（server.js + lib/ 纯核心 + smoke + deploy/bio-relay.service）
- **UI**：`src/components/BattleScreen.jsx`（battle/hands 从 prop 收 + remoteEnemy 门控）· `src/App.jsx`（HostBattleScreen + screen==='pvp'）
- **测试**：`scripts/test-*.mjs`（**58 套**）。PvP 侧：test-wire-{envelope,intent,events} / test-wire-privacy / test-no-side-fork / test-side-symmetry / test-relay-{roomcode,rooms,control,client}
  - ☠️ **假绿铁律**：fixture 从真模块改绝不手搓 · **新守卫必须配变异测试**（已烧六次，四次靠变异抓）· 相对 import 带 `.js` · eslint 只开 no-undef（覆盖 engine+hooks+**net+relay**）
- **⚠️ 浏览器验证铁律**：`vite preview`(4174)。**先 resize 视口**（无头 0×0 点击静默失效）。家长门 prompt 答 56。首攻必弹问答挂起攻击
- **⚠️ 通道纪律**（血账）：工具输出重复回显/空结果/凭空内容 = 通道不可信 → 停下用 `git status`/`rev-parse`/`wc -l` 独立回验，绝不信「成功」回执。本会话曾整段产出未落盘、伪造 commit SHA，靠独立核验抓回
- 部署 `DEPLOY.md`（§4 PvP 权威 + §4.6 服务器权威备查/翻案条件）· 历史 `CHANGELOG.md`

---

## 下次启动时优先
1. **给齐齐试玩 PvP**（本地两窗口即可）→ 手感反馈决定 4f-4g 优先级（浮字/日志现已上 wire）
2. 或先部署：中继上 VPS + Caddy handle 块 + `npm run deploy`（前端含 wire 1-4d 全部）——三件分开做，`deploy:api` 已在 package.json
3. ~~4f 零收益守卫~~ ✅ 已改（待提交）→ 提交后上生产前硬门槛已扫清；4g host 迁移（手动确认接管）
4. 历史债：虎鲸/神经元平衡决定 · DEPLOY.md §4.1「零依赖」表述更正为 ws 选型（§4.6 已写，§4.1 原文未动）
