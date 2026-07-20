# Bio Heroes Session State
> 更新: 2026-07-20（**🎯 PvP 全量上线**：选卡组 + 预设队事件卡已部署，生产 = HEAD **字节验证过**。
> PvP 主线功能齐了，下一步是 **guest 答题**（发现真问题，见下）或 **4g host 迁移**。）
>
> ⚠️ **本文件只留「活的交接」**——已完成阶段归档在 `CHANGELOG.md`，逐 commit 细节靠 git。别让它膨胀。

## 项目位置
- **路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）· **GitHub**: yang44yang/bio-heroes (main)
- **CI**: push 自动跑 lint→test→build · **生产**: `bio.socialcontract.capital`（`npm run deploy`）⚠️ **齐齐玩这个**

---

## ⚠️ 当前 git / 生产状态
- **HEAD = origin/main = `1d6343b`**，干净树，全部已 push。测试 **60/60 绿**。
- ✅ **生产 = HEAD（2026-07-20 部署并字节验证）**：拉生产 `index-C1CLiN-b.js` / `PvpLobby-BlvKBBS2.js`
  与本地 dist **md5 逐一相同**。构建可复现（同 commit 重建出同一 hash）。
  - ☠️ **部署要验字节**：`npm run deploy` 的回执不算数 —— 上次「跑完 deploy」实际没落地，
    生产在 `index-DK2dzqjA.js` 停了一整晚（齐齐玩到的预设队还是纯 25 生物、无事件卡），
    是拉生产 bundle 比对才发现的。**以后每次 deploy 完拉 bundle 对 md5**。
  - 旧 chunk URL 仍返回 200 —— 那是 **SPA fallback 吐的 index.html**（`content-type: text/html`），
    不是残留文件。sw.js 对导航是 network-first → 刷新即自愈；仍建议发版后强刷（Cmd+Shift+R）。
- ⚠️ **Caddyfile 改动只在磁盘**（`Personal website dev/spacev/deploy/Caddyfile`，那目录**无 git**）——
  已部署但没版本控制，下次谁改 spacev 别覆盖掉 bio 的 `/api/*` handle。
- relay 更新用 `npm run deploy:api`；前端用 `npm run deploy`（**两者必须分开跑**，DEPLOY.md §4.3）。
- 本地试玩：`cd relay && npm start`（3002）+ `npm run dev`（或 preview 4174）→ 主菜单「🔗 联机对战」。

---

## 🎯 PvP 现状（host 权威 + 哑中继；架构定案见 DEPLOY.md §4 + §4.6）
**主线已全部完成并上线** —— 分步细节（4a-4f / 换牌 / handCount / 选卡组）已归档进 `CHANGELOG.md`。
今天能玩的：建房加入 → 双方各选卡组 → 双方换牌 → 出牌/攻击/事件卡 → 浮字与日志双向 → 回合交接。

**剩下的真问题（按价值排）：**

### 🔴 A. guest 结构性拿不到问答 —— 既是**不公平**也是**教育机制缺失**
- 现状：`useGuestBattle` 里 `tryQuiz: () => null`、`answerQuiz: () => ({})`、`currentQuiz: null`；
  host 重放 guest 攻击时写死 `battle.attack(atkSlot, defSlot, {}, ENEMY)`（`usePvpHost.js:214`，空 awakenOpts）。
- 后果：**host 答对能 ×2 ATK，guest 永远 ×1** → PvP 系统性偏袒 host（主人 30000 HP，×2 是大摆动）；
  且 guest 整局看不到任何知识卡 —— 直接违背 CLAUDE.md「玩法即学习」。
- ✅ **地基早就铺好了**（当初就是照这个设计的，不是新架构）：
  - `answer` intent 已在 `INTENT_KINDS`，形状 `['qid','choice']` + 校验器（`wire.js:110,716`）
  - `wire.js:83` 已裁定：**tryQuiz 不是 intent，是 attack intent 的服务端副作用，host 自己判**
  - `wire.js:99-100` 已裁定：guest **传不进**倍率（参数根本不存在）→ host 按自己权威的 quiz 结果重算
  - `PRIVATE_KEYS` 已挡 `correct`/`answer` → 题目能发、答案不发
- 缺的三块：① `currentQuiz`（脱敏后）进公开树 → **需 `SHAPES[4]` + PROTOCOL_VERSION=4**（棘轮会当场拦你，照做即可）
  ② guest 侧渲染 QuizModal + 发 `answer` intent ③ host 把 guest 的 attack **挂起**等 answer 到达再结算
  （host 自己那侧今天就是这个模式 —— 「首攻必弹问答挂起攻击」）。
- ⚠️ 注意 `tryQuiz` 的节流 ref（`firstAttackDone`/`lastQuizTurn`）是**单实例共享**的 —— 两侧共用一套触发节奏，
  要先决定是「双方共享冷却」还是「每侧独立」，这是设计决策不是实现细节。

### 🟡 B. 4g host 迁移（掉线韧性）
用户已裁定「快照热备 + **手动确认接管**」。relay 零改动，思路在 `relay/README` 末尾。
断线重连的游戏级补播（resume/lastSeen）wire 已留位。这是 PvP 基建剩下最大的一块。

### 🟡 C. 其余里程碑简化
- guest 的 SP 由 AI 人格代选（`resolveSpChoice` enemy 分支）· guest 侧对手 SP 数显示 0（cosmetic）
- 预设卡组平衡待和齐齐手挑微调（自然系 raw ATK 偏强、科技系诊断卡偏多）
- 边缘 case：host 若在 guest 换牌前就结束回合 1 → guest 丢换牌（休闲对局可忽略，未加 gate）

---

## 已知问题（历史债，与 PvP 无关的照旧）
- 🔴 **虎鲸/神经元招牌技能 100% 失效**（`friendlyField` 未传参；修复引爆满血秒杀平衡，**先决定数值再修**，等用户拍板）
- 🟡 科学家模式 ×1.2 打卡时被静默丢弃（只在直攻主人生效）
- 🟡 `derivePhase` 硬编码读 `state.player.phase` 判 init/mulligan → guest 回合 1 派生为 `init`。
  已用等待横幅兜住表现；相位派生本身没「真修」，但现在无碍
- DEPLOY.md §4.1「零依赖」表述该更正为 ws 选型（§4.6 已写，§4.1 原文未动）
- PWA 图标 SVG（iOS 糊）· Tailwind v4 扫 md 文档

---

## 关键文件
- **引擎**：`src/hooks/useBattle.js`（暴露 battleState，`tryQuiz` 在 2338 行）· `src/engine/{battleReducer,rules,sides,wire,aiTarget}.js` · `src/hooks/useAITurn.js`
- **PvP**：`src/net/{relayClient,lobbyProtocol}.js` · `src/hooks/{usePvpHost,useGuestBattle}.js` ·
  `src/components/{PvpLobby,PvpDeckPicker,PvpHostBattleScreen,GuestBattleScreen,HostBattleScreen}.jsx` ·
  `src/data/{presetDecks,deckResolve}.js` · `relay/`（server.js + lib/ 纯核心 + smoke + deploy/bio-relay.service）
- **UI**：`src/components/BattleScreen.jsx`（battle/hands 从 prop 收 + `remoteEnemy` 门控）· `src/App.jsx`
- **测试**：`scripts/test-*.mjs`（**60 套**）。PvP 侧：test-wire-{envelope,intent,events} / test-wire-privacy /
  test-no-side-fork / test-side-symmetry / test-relay-{roomcode,rooms,control,client} / test-preset-decks
  - ☠️ **假绿铁律**：fixture 从真模块改绝不手搓 · **新守卫必须配变异测试**（已烧六次，四次靠变异抓）·
    相对 import 带 `.js` · eslint 只开 no-undef（覆盖 engine+hooks+**net+relay**）
- **⚠️ 浏览器验证铁律**：`vite preview`(4174)。**先 resize 视口**（无头 0×0 点击静默失效）。家长门 prompt 答 56。首攻必弹问答挂起攻击
- **⚠️ 通道纪律**（血账）：工具输出重复回显/空结果/凭空内容 = 通道不可信 → 停下用 `git status`/`rev-parse`/`md5` 独立回验，绝不信「成功」回执
- 部署 `DEPLOY.md`（§4 PvP 权威 + §4.6 服务器权威备查）· 历史 `CHANGELOG.md`

---

## 下次启动时优先
1. **收齐齐生产试玩反馈**（生产已是最新：选卡组 + 预设队带事件卡）→ 定后续优先级
2. **A. guest 答题**（上面 🔴）—— 这是我认为最该做的：修掉 host/guest 的公平性偏差，
   同时把「玩法即学习」还给 guest 侧。地基齐、边界清楚，需要一次 PROTOCOL_VERSION=4
3. **B. 4g host 迁移**（掉线韧性）—— 用户已定「部署后单独做」，soak 测试后再发
4. 历史债：🔴 虎鲸/神经元平衡数值（等用户拍板）· DEPLOY.md §4.1 表述更正
