# Bio Heroes Session State
> 更新: 2026-09-26：战斗引擎压测三条路（反击 / AOE 群杀 / 状态 tick）全部收尾，顺手修两处「日志说假话」
> （全球大流行 `spend_all_energy` 读到扣费前能量、毒发致死无日志），`ec5f975` 已上生产并按 VERIFY §3 回验。
> 验证/部署纪律在 `docs/VERIFY.md`，结构与约束在 `ARCHITECTURE.md`。本文件只留活的交接（≤100 行，替换不堆积）。
>
> 🔴 **当前瓶颈仍是齐齐的反馈**：积压一个多月只来过一条（09-10 竖屏教学箭头，已修上线），其余（教学能否打通、横屏观感、虎鲸、
> 钻石提示、SP 新门槛手感）一条没收。观察清单 `docs/PLAYTEST.md`。守卫防得住回归、防不住方向错。

## 项目位置
- 路径 `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）· GitHub yang44yang/bio-heroes (main)
- CI：push 自动 lint → test → build · 生产 `bio.socialcontract.capital`（`npm run deploy`）⚠️ 齐齐玩这个
- 本地试玩：`cd relay && npm start`（3002）+ `npm run dev`（或 preview 4174）→ 主菜单「🔗 联机对战」
- 压测用 🧪 测试场：主菜单「⚙️ 更多」→「测试场」，家长门 **56**；两侧摆卡，点已放的卡可挂 护盾/标记/中毒/沉睡/隐身/守护

## 当前 git / 生产状态
- HEAD = origin/main。最后一个改动构建产物的提交是 `ec5f975`（09-26 引擎修复）；之后的「更新状态」提交只动文档。
- **生产 = `ec5f975` 的构建产物**。09-26 按 VERIFY §3 回验：`index.html` 资源引用与线上逐条相同，
  `index-D8vIYsvg.js` + `index-L_ekeLmc.css` + `BattleScreen-BYNXOUSX.js`（承载修复的 lazy chunk）+ `sw.js` md5 一致；
  线上 chunk 里 `毒发倒下`×1、`都投了进去`×1、反向哨兵 `消耗所有剩余能量`×0。
- `relay/` 代码自 `83421c5`（07-22 host 断线重连）起未变，本次没跑 `deploy:api`。
- 测试 77/77 绿 · lint 干净（`no-undef` 覆盖 src + relay）· `npm audit --omit=dev` 0 条（09-26 复核）。
- ⚠️ `PROTOCOL_VERSION = 4`（本次未动）：两台 iPad 只刷一台就「连不上 / 开不了局」且不弹错（旧版按版本拒收新快照，中继盲转不报错）。
  要两台都 Cmd+Shift+R；想看新图标重新「加到主屏」。
- ⚠️ Caddyfile 只在磁盘（`Personal website dev/spacev/deploy/Caddyfile`，无 git）。改 spacev 别覆盖 bio 的 `/api/*` handle。

## 下一步（按价值排）
1. **收齐齐的真机反馈**（最高优先，卡在人不在代码）：竖屏再走 L1（气泡贴手牌上方、▼ 落在蚂蚁上）+ **中途转一下屏**
   （旋转重量只能真机验，Browser 面板的 CDP 模拟不派发 resize，见 VERIFY §2）；教学五关能否打通；iPad 横屏观感；虎鲸新数值；
   钻石按钮灰着时那句提示；**SP 新门槛**（`spEarliestSummonTurn = max(4, spCost−2)` + 事件卡 `maxCost = 本卡费+3`）打几局的手感。
2. **清陈旧 worktree**（独立、随时可做，commit 都已并入 main）：12 个 `wf_3a752b10-*` 停在 `152b680`，各带 1–8 个未提交改动
   （7-25 教学守卫的变异残骸）→ 逐个先 `git worktree remove --force <路径>` 再 `git branch -d <分支>`；
   `charming-napier`（`c456e8f`）和 `charming-kilby`（`65ce8e4`，09-15 那次会话的；09-26 会话在主 checkout）都可直接删。
3. 🟡 guest 侧看不到 SP **数**：`useGuestBattle` 两个 spDeck 恒 EMPTY（wire 故意 strip `spDeck`，隐藏信息）。
   要显示得把计数提进公开树 → 必须 bump `PROTOCOL_VERSION` → 两台强制双刷。为一个数字不值，等下次真要改协议时顺手带上。
4. 🧹 横屏还想让卡更大：先动纯装饰（VS 分隔 44px + 底部日志 44px ≈ +11% 卡面），别做侧栏重排（实测不值）。
5. 📄 给老师的课纲说明 `outputs/curriculum-basis-for-teachers.pdf`（09-10）等回音。里面的统计（157 卡 / 805 题…）是写死的，
   改卡或题库后要跑 `outputs/build-curriculum-doc.py` 重生成；逐卡逐题标课标编号（KP_ID / NGSS / 课标三标签）仍未做。

## 已知问题（未修）
- 🟡 全球大流行 `spend_all_energy` 口径**按原行为定死**：能召 SP 的费用上限 = 出牌时能量（含本卡 5 费），本回合能量清零。
  要削就把 `playEventCard` 的 `remainEnergy = energyBefore` 改成 `energyBefore - card.cost`（5 费卡要 ≥10 能量才召得出最小 SP，接近死规则），
  `test-sp-chain` 的口径断言 + `docs/sp-combos.md` 要同步改。
- ℹ️ 中毒绕过护盾直接扣 HP（护盾只挡攻击，`processStatuses` 不看 shield）—— 与主流卡牌游戏一致，不是 bug；7 岁会不会困惑「有盾怎么还掉血」待齐齐。
- 🟡 虎鲸「协同猎杀」新数值待试玩校准（满自然场觉醒 32000 ≥ 主人 30000 可秒）。要调就动 `skillRegistry` 的 `Coordinated Hunt` amount。
- 🟡 手机横屏 45px 溢出是劝退到竖屏，不再修。
- 🟡 续局只保 host 一侧（guest 刷新要重输 4 位码）；快照 6 小时过期、已分胜负的局不提示、写入节流 1.2s。
- 🟡 预设卡组平衡待和齐齐手挑微调（自然系 raw ATK 偏强、科技系诊断卡偏多）。
- 🟡 `derivePhase` 硬编码读 `state.player.phase` → guest 回合 1 派生为 `init`，已用等待横幅兜住表现。
- 🟡 「精简模式」从未实现（CLAUDE.md 只作目标保留）；`react-vendor` chunk 仅 3.6KB（React 实际在 framer 块）。
- 🟡 `QUIZ_CHANCE` / `AWAKEN_PARTIAL` 是死常量（见 rules）。
- ℹ️ **不是 bug，别动**：17 张卡的 `evolutionTo` = 3 个已实现（接进 `EVOLUTION_CHAINS`）+ 14 个决策2「逐季补全」的计划目标，
  `test-evolution-integrity` 的 `PLANNED_EVOLUTIONS` 白名单自 06-29 起守着。09-05 审计报告的「悬空还在涨、建议置 null」是数错了，
  照做会把守卫的「无僵尸条目」检查打红。

## 关键文件（结构与约束见 ARCHITECTURE.md；验证纪律见 docs/VERIFY.md）
- **引擎**：`src/hooks/useBattle.js`（`tryQuiz` / `answerQuiz`；能量公式在 `startPlayerTurn` / `beginEnemyTurn` = `Math.min(newTurn, ENERGY_CAP)`）·
  `src/engine/{battleReducer,rules,sides,wire,quizGate,aiTarget,matchSnapshot,statusEffects}.js`
  - ⚠️ `useReducer` 的 dispatch 不 eager：同一次同步调用里 dispatch 之后读 `battleStateRef` 仍是旧值。要用「扣完之后」的数就在
    dispatch **前**快照（`playEventCard` 的 `energyBefore`；`processEndOfTurnEffects` 的本地 `nextField` 同理）。
  - 死卡统一由「提交后 useEffect」扫 `currentHp <= 0` 清场 + 进弃牌堆 + 触发 onDeath（`processedDeathsRef` 按 uid 去重）；
    各死亡路径自己**不**清场，日志也得自己说（毒发致死的「→ 毒发倒下！」在 `processStatuses` 里）。
  - `quizGate.js` 问答纯核心：每侧节流 + 脱敏投影 + host 判卷。答案卡只活在 useBattle 的 `quizKeyRef`，永不上 wire。
  - `matchSnapshot.js` 两张清单是「必须恢复什么」的单一真相源；`battleReducer` 的 `HYDRATE` 按初始形状收口（多一个键会让 guest 静默冻屏）；
    `BattleScreen` 的 `skipInit` 是恢复路径的头号敌人（那个初始化 effect 会把刚恢复的一切清成新局）。
- **PvP**：`src/net/{relayClient,lobbyProtocol}.js` · `src/hooks/{usePvpHost,useGuestBattle}.js` ·
  `src/components/{PvpLobby,PvpDeckPicker,PvpHostBattleScreen,GuestBattleScreen,HostBattleScreen}.jsx` · `relay/`
  - `usePvpHost` 的 `case 'endTurn'`：挂着未答的问答攻击 → 就地 ×1 结算 + `clearQuiz`（兜底）。
- **UI**：`src/components/{BattleScreen,QuizModal,TutorialScreen}.jsx` · `src/index.css`。
  QuizModal 是由题目对象驱动的两阶段（`rightIdx` 到达才揭晓），guest 拿不到 correct，别改回本地即时揭晓。
  `TutorialScreen` 提示气泡：**方向和纵向位置都是量出来的**（`useLayoutEffect` 取 `data-tut-lit` 高亮并集 → `arrow` / `bubblePos`），
  别写回关卡数据、别改回固定 top/bottom（守卫 ③-11 / ③-12）；每处 `ring-yellow-400` 高亮必须同时摊开 `litAttr`。
  教学迷你卡内联渲染、不走 `Card.jsx`（主战场视效在教学里默认看不见）—— 约束与做法见 ARCHITECTURE §2。
- **经济**：`useEconomy` 里扣款函数必须用同步 `stateRef` 模式。`pullCards` 是覆盖式 setState，函数式 updater 会被整份覆盖 →「抽卡不花钱」，已踩两次。
- **存档**：`utils/saveManager.js`（`SAVE_KEYS` 单一真相源）· `utils/matchStore.js`（PvP 快照在 `NON_SAVE_KEYS`，绝不进存档）。
- **测试**：`scripts/test-*.mjs` 77 套（64 套跑真代码 / 13 套纯 source-grep，口径见 ARCHITECTURE §6）· relay smoke `cd relay && npm run smoke`。
- **文档**：`DEPLOY.md`（§4 PvP 权威 + §5 排障）· `CHANGELOG.md`（历史）· `docs/PLAYTEST.md`（试玩观察清单）· `docs/sp-combos.md`。
