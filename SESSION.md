# Bio Heroes Session State
> 更新: 2026-09-05（**全仓审计 + 文档精简**）。审计报告 `outputs/code-health-report-2026-09-05.md`；
> 验证/部署纪律已从本文件抽到 `docs/VERIFY.md`。本文件只留活的交接（≤100 行，替换不堆积）。
>
> 🔴 **当前唯一瓶颈：齐齐的反馈（积压 3+ 周，一条没收）。** 观察清单 `docs/PLAYTEST.md`。
> 六层界面 + 经济线全部由 Claude 走查驱动改完，守卫防得住回归、防不住方向错。

## 项目位置
- 路径 `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）· GitHub yang44yang/bio-heroes (main)
- CI：push 自动 lint → test → build · 生产 `bio.socialcontract.capital`（`npm run deploy`）⚠️ 齐齐玩这个
- 本地试玩：`cd relay && npm start`（3002）+ `npm run dev`（或 preview 4174）→ 主菜单「🔗 联机对战」

## 当前 git / 生产状态
- HEAD = origin/main = 生产（代码层面）。最近一次功能提交 `e9ab3b1` 钻石抽卡（2026-08-30），之后只有文档提交。
- 2026-09-05 回验：本地 build 的 `index-BpkjeDN5.js` / `GachaScreen-WA2D2H_a.js` 与线上 md5 逐字节一致。
- 测试 77/77 绿，lint 干净。`npm audit` 6 条（4 高）全在构建工具链（vite / postcss / nanoid），不进浏览器。
- ⚠️ `PROTOCOL_VERSION = 4`：两台 iPad 只刷一台就「连不上 / 开不了局」且不弹错（旧版按版本拒收新快照，中继盲转不报错）。
  要两台都 Cmd+Shift+R；想看新图标重新「加到主屏」。
- ⚠️ Caddyfile 只在磁盘（`Personal website dev/spacev/deploy/Caddyfile`，无 git）。改 spacev 别覆盖 bio 的 `/api/*` handle。

## 下一步（按价值排）
1. **收齐齐的真机反馈**（最高优先，卡在人不在代码）：教学五关能否顺畅打通（机制看不看得懂、箭头指得清不清楚）、
   iPad 横屏观感（卡够不够大、竖屏没被弄坏）、虎鲸新数值、钻石按钮灰着时那句提示会不会让他去打闯关。
2. **审计收尾**（都独立、随时可做，细节见审计报告）：
   清 12 个陈旧 worktree（45MB，全停在 `152b680`，脏改动是 7-25 教学守卫的变异残骸，已被 main 取代）·
   ARCHITECTURE.md 对账（23 关→29、SP 16→17、49 套→77、useBattle ~2300→2650、「玩家/AI 两份都改」已过时、PvP/relay 整段缺失、SESSION 路径写错）。
3. 🟡 guest 侧看不到 SP **数**：`useGuestBattle` 两个 spDeck 恒 EMPTY（wire 故意 strip `spDeck`，隐藏信息）。
   要显示得把计数提进公开树 → 必须 bump `PROTOCOL_VERSION` → 两台强制双刷。为一个数字不值，等下次真要改协议时顺手带上。
4. 🧹 横屏还想让卡更大：先动纯装饰（VS 分隔 44px + 底部日志 44px ≈ +11% 卡面），别做侧栏重排（实测不值）。

## 已知问题（未修）
- ☠️ **教学迷你卡不走 `Card.jsx`**（`TutorialScreen` 内联渲染，只画名字/⚔️/❤️/阵营）：主战场卡的视效（守护🛡️/中毒/护盾/技能名…）
  在教学里默认看不见，目前只补了守护。以后教学要教哪个机制，必须单独在迷你卡上补可见标识；判定一律用 `utils/guardSkill` 等主战场真相源。
- 🟡 虎鲸「协同猎杀」新数值待试玩校准（满自然场觉醒 32000 ≥ 主人 30000 可秒）。要调就动 `skillRegistry` 的 `Coordinated Hunt` amount。
- 🟡 手机横屏 45px 溢出是劝退到竖屏，不再修。
- 🟡 续局只保 host 一侧（guest 刷新要重输 4 位码）；快照 6 小时过期、已分胜负的局不提示、写入节流 1.2s。
- 🟡 预设卡组平衡待和齐齐手挑微调（自然系 raw ATK 偏强、科技系诊断卡偏多）。
- 🟡 `derivePhase` 硬编码读 `state.player.phase` → guest 回合 1 派生为 `init`，已用等待横幅兜住表现。
- 🟡 「精简模式」从未实现（CLAUDE.md 只作目标保留）；`react-vendor` chunk 仅 3.6KB（React 实际在 framer 块）。
- 🟡 17 张卡的 `evolutionTo` 指向不存在的卡名，纯装饰死数据（无任何读取方）；`QUIZ_CHANCE` / `AWAKEN_PARTIAL` 是死常量（见 rules）。

## 关键文件（结构见 ARCHITECTURE.md；验证纪律见 docs/VERIFY.md）
- **引擎**：`src/hooks/useBattle.js`（`tryQuiz` / `answerQuiz`；能量公式在 `startPlayerTurn` / `beginEnemyTurn` = `Math.min(newTurn, ENERGY_CAP)`）·
  `src/engine/{battleReducer,rules,sides,wire,quizGate,aiTarget,matchSnapshot}.js`
  - `quizGate.js` 问答纯核心：每侧节流 + 脱敏投影 + host 判卷。答案卡只活在 useBattle 的 `quizKeyRef`，永不上 wire。
  - `matchSnapshot.js` 两张清单是「必须恢复什么」的单一真相源；`battleReducer` 的 `HYDRATE` 按初始形状收口（多一个键会让 guest 静默冻屏）；
    `BattleScreen` 的 `skipInit` 是恢复路径的头号敌人（那个初始化 effect 会把刚恢复的一切清成新局）。
- **PvP**：`src/net/{relayClient,lobbyProtocol}.js` · `src/hooks/{usePvpHost,useGuestBattle}.js` ·
  `src/components/{PvpLobby,PvpDeckPicker,PvpHostBattleScreen,GuestBattleScreen,HostBattleScreen}.jsx` · `relay/`
  - `usePvpHost` 的 `case 'endTurn'`：挂着未答的问答攻击 → 就地 ×1 结算 + `clearQuiz`（兜底）。
- **UI**：`src/components/{BattleScreen,QuizModal,TutorialScreen}.jsx` · `src/index.css`。
  QuizModal 是由题目对象驱动的两阶段（`rightIdx` 到达才揭晓），guest 拿不到 correct，别改回本地即时揭晓。
- **经济**：`useEconomy` 里扣款函数必须用同步 `stateRef` 模式。`pullCards` 是覆盖式 setState，函数式 updater 会被整份覆盖 →「抽卡不花钱」，已踩两次。
- **存档**：`utils/saveManager.js`（`SAVE_KEYS` 单一真相源）· `utils/matchStore.js`（PvP 快照在 `NON_SAVE_KEYS`，绝不进存档）。
- **测试**：`scripts/test-*.mjs` 77 套（60 套 import 真模块驱动，17 套 source-grep）· relay smoke `cd relay && npm run smoke`。
- **文档**：`DEPLOY.md`（§4 PvP 权威 + §5 排障）· `CHANGELOG.md`（历史）· `docs/PLAYTEST.md`（试玩观察清单）· `docs/sp-combos.md`。
