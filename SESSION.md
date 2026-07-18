# Bio Heroes Session State
> 更新: 2026-07-18（**P1 PvP：第 1、2 步已 push；第 3 步只写了纯核心（未跟踪）**。第 4 步已规划、锁定 4a-4d。）
>
> ⚠️ **本文件只留「活的交接」**——已完成阶段归档在 `CHANGELOG.md`，逐 commit 细节靠 git。别让它膨胀（精简纪律见 CLAUDE.md）。

## 项目位置
- **路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）· **GitHub**: yang44yang/bio-heroes (main)
- **工作流**: 直接在 main 工作、push · **CI**: `.github/workflows/ci.yml`（lint→test→build）
- **生产**: `bio.socialcontract.capital`（`npm run deploy`）。⚠️ **齐齐玩这个**（PWA 主屏）。Vercel 随 push 作海外镜像

---

## ⚠️ 当前 git / 生产状态（要紧）
- **HEAD = `ebe7c00`**（第 2 步）。第 1、2 步（wire.js + 每侧状态）**已 push**。
- **第 3 步中继：只有纯核心，未跟踪、未提交**。`relay/lib/{roomCode,rooms,routing,control}.js`（295 行）
  + `scripts/test-relay-{roomcode,rooms,control}.mjs`（100 断言，绿）。**IO 外壳（server.js/package.json/
  smoke/systemd）还没写** —— 第 3 步约 40%。全量 57/57。
- **生产 VPS = 旧版本**：wire 第 1/2 步**没部署**，齐齐玩的是老的。何时 `npm run deploy` 待用户定。

---

## PvP 进度（架构：host 权威 + host 迁移，不做前后端分离）
第 1、2 步细节见 `CHANGELOG.md`。**服务器权威（前后端分离）已评估、否决** —— 核心论据：把 2400 行
React 纠缠的 useBattle 抽成无头引擎跑服务器是整个 PvP 最大的单块工作，host 权威就是为省它；防作弊/
真隐藏信息在熟人场景值≈0，掉线韧性用便宜得多的 host 迁移补。触发翻案的条件 = 定位变成公开匹配/排位/
陌生人对战。⚠️ **这份分析尚未落盘**（本会话「写进 DEPLOY §4.6」没真的发生），要备查得重写。

### 第 3 步剩余：补 relay IO 外壳（纯核心已就绪）
- `relay/server.js`：http + WebSocketServer（用 `ws` 库，非手写）+ 心跳 isAlive + SIGTERM 优雅关停 +
  进程级 let-it-crash。消费纯核心的效果描述符（`{type:'send', to:connId, frame}`）。盲转字节、不 JSON.parse。
- `relay/package.json`（唯一依赖 ws）+ `smoke/run.mjs`（非法 JSON 探针验盲转）+ `deploy/bio-relay.service`。
- eslint 加 `relay/**` block（只给 node globals）+ `test-no-undef.mjs` PATTERNS 加 `relay/**` + 根 `lint` 扫 relay。
- 根 package.json 加 `deploy:api`（与 `deploy` 分开，DEPLOY §4.3）。**新守卫配变异测试**（铁律）。

### 第 4 步已规划 —— 锁定 4a-4d，用户已拍三决策
- **核心决策**：guest 用「同形状 battle 适配器」。`BattleScreen:34` 自己调 `useBattle()`、到处读 `battle.*`
  （~35 成员）→ 把 `battle` **提成 prop**（✅ 用户接受），host 传 `useBattle()`、guest 传 `useGuestBattle()`
  （数据来自快照、方法发 intent、不适用的 no-op）。不给 guest 跑「影子引擎」。
- **4a** `src/net/relayClient.js`（ws 封装 + `relay.*`/游戏帧分流 + 重连 + 心跳）+ App.jsx 房间码界面
- **4b** `battle` 提成 prop（重构，零行为变化；单机逐帧一致验收）
- **4c** host 侧：状态提交→`buildSync`→发；收 intent→`decodeIntent(raw, ENEMY)`→`side='enemy'` 重放；**关 AI + 修开局 effect**
- **4d** `useGuestBattle(conn)` 适配器 → 🎯 两 tab 真能对战
- **推到 4d 之后**：4e 事件环/浮字上 wire · 4f PvP 零收益守卫 · 4g host 迁移（✅ 用户选手动确认接管）· 第 5 步 useAITurn

### ☠️ 第 4 步开工前必读
- **`useAITurn` 托不住远端对手**（第 5 步）：无取消令牌、`aiRunning` 只在 `.finally` 复位（挂起不复位→断线永久锁死）、
  `.catch` 强行把回合交还玩家 = PvP 里静默偷走 guest 的回合。**4c 先只「关掉」它**。（细节 file:line 未亲手复验，用到时验）
- **零收益守卫抄 `App.jsx:135` 的 ref 写法**：`testArenaConfigRef.current`（`:89-90` deps 外镜像，因 `handleExitBattle`
  deps 只 `[economy]`）。普通 state 会 stale→静默发金币、dev 看不出。deckBuilder 漏斗 PvP 默认落 `:284-285` fall-through
- **开局 effect（`BattleScreen:387-410`）替敌方 preplaceCard** → PvP 里 host 替远端 guest 出牌（4c 修）
- **Caddy `/api/*` 在 spacev 仓库**，bio block 要重构成 `handle` 块。`npm run deploy` 两头都不管
- ✅ 已实测确认：`sw.js:78` 旁路 `/api/*`、WS 握手不触发 SW fetch（中继走 WS 的前提成立）

---

## 已知问题（与 PvP 无关的历史债）
- 🔴 **虎鲸/神经元招牌技能 100% 失效**：4 个 `triggerSkills('onAttack')` 都没传 `friendlyField`（`test-leader-damage` ⑥ 哨兵）。
  ⚠️ **修它引爆平衡**：虎鲸满场 5 友方 =(8500+7500)×2=32000 ≥ 主人 30000 → 满血秒杀（6 格改动推过线）。补前先决定
- 🟡 **科学家模式 ×1.2 在「打卡」时被静默丢弃**（`calcCardBattle` 不读 `opts.damageMultiplier`）→ 奖励只在直攻主人生效
- 🟡 **`derivePhase` 第 6 个 latent fork**（第 1 步挖出，未修）：`battleReducer` 硬编码读 `state.player.phase` 判 init/mulligan，
  `startBattle` 是 player→'mulligan'/enemy→'ended' → **guest 侧 `derivePhase(mirror(s))` 读到 'ended' → 进不了换牌画面**。4c/4d 处理
- PWA 图标是 SVG（iOS 只吃 PNG，齐齐主屏图标糊）· Tailwind v4 扫 md 文档（散文写 class 名会变生产 CSS 死规则）

---

## 关键文件
- **引擎**：`src/hooks/useBattle.js`（React 外壳+编排，~2400 行）· `src/engine/battleReducer.js`（纯容器，`SHAPES[]` 形状棘轮）·
  `src/engine/rules.js`（side-blind 纯谓词）· `src/engine/sides.js`（PLAYER/ENEMY/opp/**mirror**）· `src/engine/wire.js`（PvP 协议，纯函数+冻结白名单）·
  `src/engine/aiTarget.js`（AI 人格）· `src/hooks/useAITurn.js`（第 5 步硬骨头）
- **中继**：`relay/lib/*`（纯核心，✅ 真实）· server.js 等 IO 外壳待写
- **UI**：`src/components/BattleScreen.jsx`（`:34` 调 useBattle、`:387-410` 开局 effect、`:314` handleRestart）·
  `src/App.jsx`（`:133` handleExitBattle、`:135` 零收益守卫样板、`:361` 渲染 BattleScreen）
- **数据**：☠️ `deckRules.js` 里 MAX_FIELD_SLOTS(6)/SP_DECK_SIZE(5)/STARTING_HAND(5) 同居，**严禁数字查找替换**
- **测试**：`scripts/test-*.mjs`（**57 套**，`npm test`）。PvP：`test-wire-{envelope,intent,events}` / `test-wire-privacy` /
  `test-no-side-fork`（棘轮）/ `test-side-symmetry`（镜像）/ `test-relay-{roomcode,rooms,control}`
  - ☠️ **假绿铁律**：ctx 与生产调用点逐字一致；fixture 从**真** `initialBattleState`+`cards.js` 改，**绝不手搓**。已烧过**六次**。
    **新守卫必须配变异测试**（六次里四次是变异抓的）· 相对 import 必须带 `.js` · eslint 只开 no-undef（覆盖 engine+hooks）
- **⚠️ 浏览器验证铁律**：走 `vite preview`(4174) 非 dev。**先断言 `window.innerWidth > 0`**（无头是 0×0，点击静默失效）。
  家长门 `window.prompt`（答 56）需打桩。**本局首次攻击必弹问答并挂起攻击**（`tryQuiz` 确定性）
- ⚠️ **通道纪律**（本会话血账）：工具输出出现重复回显/空结果/凭空 "channel-check" 时 = 通道不可信，**必须停下重新核**，
  别把伪造回执当真往上盖楼。本会话曾据伪造结果"完成"了中继 IO 外壳+提交+文档，实际全没落盘，靠 `git status` 才发现
- 部署交接 `DEPLOY.md`（§4=PvP 权威）· 架构总览 `ARCHITECTURE.md` · 历史 `CHANGELOG.md`
