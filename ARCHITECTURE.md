# Bio Heroes 架构说明 (ARCHITECTURE)

> 面向「新接手者 / 未来的自己」的一页式架构地图。详细规则见 `.claude/rules/`，逐 Sprint 历史见 `CHANGELOG.md`，当前会话交接见仓库根目录的 `SESSION.md`，验证/部署纪律见 `docs/VERIFY.md`。
> 已知结构债与 bug 见 `outputs/code-health-report-*.md`（最近一次 2026-09-05）。本文数字以代码为准、与 `CLAUDE.md` 同步（后者由 `scripts/test-docs-truth.mjs` 对账；本文不在守卫内，改数字请两边一起改）。

---

## 1. 一句话

React 19 + Vite 7 + Tailwind 4 + Framer Motion 12 的卡牌对战网页游戏（PWA：`public/sw.js`）。**无后端数据库**：全部存档在浏览器 `localStorage`（`utils/saveManager.js`，带版本迁移 + 导入导出）；联机对战走 `relay/` 的**哑中继**（盲转字节、host 权威，见 §8）。战斗为**回合制状态机**，卡牌效果由**数据驱动的技能系统**结算。核心属性只有 **ATK + HP**（没有 DEF / SPD）。

---

## 2. 顶层结构与屏幕路由

入口 `src/App.jsx` 用一个 `screen` state 做屏幕切换（非 react-router）。`TitleScreen` 随入口同步加载，其余屏幕全部 `React.lazy` 懒加载分包：

```
App.jsx  (screen state + 全局经济/存档/成就编排)
 ├─ 'title'       TitleScreen          主菜单（同步加载）
 ├─ 'tutorial'    TutorialScreen       教学关（3 基础 + 2 进阶）
 ├─ 'campaign'    CampaignScreen       闯关战役（4 章 29 关）
 ├─ 'battle'      HostBattleScreen     ★ 单机 / 测试场的战斗入口：调 useBattle + 两个 useHand，
 │                  └─ BattleScreen        把 battle 作 prop 传给表现层 BattleScreen（最重；同一分包块）
 ├─ 'pvp'         PvpLobby             联机大厅 → PvpDeckPicker → PvpHostBattleScreen（host）/ GuestBattleScreen（guest）
 ├─ 'testArena'   TestArena            🧪 直接摆盘的测试场（配好后跳 'battle'，零收益）
 ├─ 'gacha'       GachaScreen          抽卡
 ├─ 'deckBuilder' DeckBuilder          卡组构建
 ├─ 'collection'  Collection           卡牌图鉴 + dex 收集追踪
 └─ 'daily'       DailyChallenge       每日挑战
```

跨屏的持久数据走 hooks：`useEconomy`（金币/钻石/碎片/收藏/进化）、`useDailyChallenge`。存档读写在 `utils/saveManager.js`（`SAVE_KEYS` 单一真相源）+ 各 `data/*` 的 load/save 函数（`loadCampaignProgress` 等），key 前缀 `bio-heroes-*`。

⚠️ **TutorialScreen 不走 `Card.jsx`**：教学的战场迷你卡是组件内联渲染的（只画名字 / ⚔️ / ❤️ / 阵营；文件虽 import 了 `BattleCard`，但一次都没渲染）。主战场卡的视效 —— 守护 🛡️ / 中毒 / 护盾 / 技能名 —— 在教学里**默认看不见**，目前只补了守护（守护卡变青色、被守护挡住的卡变灰）。以后教学要教哪个机制，必须单独在迷你卡上补可见标识；判定一律复用主战场的真相源（`utils/guardSkill.js` 的 `cardHasGuard` / `fieldHasGuard` 等），别在教学里再写一份规则。

---

## 3. 战斗引擎 — `src/hooks/useBattle.js`

**这是全项目最大、最复杂的模块（~2650 行）。** 整个战斗状态机 + 事件派发 + 死亡结算都在这一个 Hook 内（AI 回合的 async 编排已抽到 `useAITurn.js`，手牌在 `useHand.js`，纯结算在 `engine/`）。

### 相位机
```
每侧 phase:  init → mulligan → main ⇄ battle → ended ─(下一轮)→ main
顶层:        activeSide: 'player'|'enemy'    winner: null|side
```
- 真相源是 `state.activeSide`（轮到谁）+ `state[side].phase`（那一侧的进度）。对外仍由纯函数 `derivePhase(state)` 派生出旧的顶层标量 → BattleScreen 20+ 处 `battle.phase` 读取零改动。
- `activeSide` 是那根接力棒（`TURN_HANDOFF` **原子**交接：拆开会有一帧「activeSide 已换、新行动方还没进 main」→ useAITurn 放行后 gate 全拒 → 回合永久锁死）。
- `'over'` **不是相位值** —— 它就是 `winner != null`，由 `derivePhase` 派生。`'animating'` 已删（零消费的幽灵）。
- **为什么阶段机必须与 de-fork 捆在一起**：旧枚举把「发生什么」（main/battle）和「谁在做」（enemyTurn）编码进**同一个标量** —— 于是 `aiPlayToField` **即使有人想查 phase 也查不了**（不存在一个「敌方的 main」可查）。**缺失的 gate 不是懒，是不可表达。**

### 状态模型
- **棋盘状态收进 `src/engine/battleReducer.js`**：`turn/activeSide/winner`（顶层）+ 每方 `powerBank/discard/energy/leaderHp/field/summoned/attacked/phase`（`player`/`enemy` 子树）。**全树 JSON-clean**（`summoned`/`attacked` 用**数组**不用 Set —— Set 不过 JSON）—— 它是「棋盘状态能整棵推给 PvP guest」的前提（§8）。`useBattle` 里 `battleState`/`dispatch` + `battleStateRef = useLatestRef(battleState)`（供异步 AI 回合 / `latest` 快照读最新）；callbacks 改 `dispatch(ACTION)`。纯函数单测 `scripts/test-battle-reducer.mjs`。
- ⚠️ **useReducer dispatch 不 eager 计算**：凡「updater 闭包内赋值、setter 返回后同步读回」的量（`defKilled/atkKilled/replaced`）已改成 dispatch 前用 `battleStateRef` 确定性算好，不靠闭包。field setter（`setPlayerField/setEnemyField`）是**透传垫片**（原样把 updater 交给 reducer 跑，保同 tick 顺序累加）。
- 不向 `BattleScreen` 泄漏原始 `*Ref`（只导出只读 `latest` getter 快照）。剩余 `useState`/`useRef` 多为 UI 态（battleLog/currentQuiz/skillEvents/pendingSpSummon…）与准记忆 ref（spTriggeredRef/processedDeathsRef/quizKeyRef…），不属棋盘状态。SP 卡组 `playerSpDeck/enemySpDeck` 仍在 useState（边界状态、改动少）。
- `HYDRATE`（PvP host 自恢复用）按初始形状收口 —— 多一个键会让 guest 静默冻屏。

### 玩家 vs AI —— ✅ 已 de-fork（2026-07-17，S0-S7）

**这里曾经写着**：「`attack`/`aiAttack`、`playToField`/`aiPlayToField` 是两份近重复实现…改战斗规则须两处同步改，否则出现『玩家能 / AI 不能』的不对称 bug。」

那条规矩现在**已经删掉了** —— 它本身就是那个 fork 的伤疤。`ai*` 三兄弟（`aiPlayToField` / `aiAttack` / `aiPlayEventCard`）全部退役，引擎里只剩一条 side 参数化的路：

```
playToField(card, slotIdx, side = 'player')
attack(atkSlot, defSlot, awakenOpts = {}, side = 'player')
playEventCard(card, opts = {}, side = 'player')
endMainPhase(side = 'player')
```

- **规则**（能不能）住 `engine/rules.js` —— side-blind 纯谓词，**不得出现 'player'/'enemy' 字面量**。一个不能命名某一侧的模块，结构上无法偏袒某一侧。侧别工具在 `engine/sides.js`。
- **人格**（怎么选）住 `engine/aiTarget.js`（`pickAiTarget` / `pickAiSpCard`）—— 引擎不该知道「敌方会挑费用最高的 SP」这种事。
- **侧别字面量**只允许活在 React 外壳（`useBattle` 的默认参数）里。
- PvP 复用同一条路：guest 的 intent 在 host 端按 `useAITurn` 的调用约定重放成 `side='enemy'` 的调用（§8）。

那个 fork 逃掉的东西（都是真 bug，不是取舍）：`aiAttack` **一行守护检查都没有**（「守护优先」至今没暴雷只因 `pickAiTarget` 恰好优先挑守护卡 = 规则一直靠「AI 恰好礼貌」维持）；`aiPlayToField` 无条件扣能量（可扣成负数）、覆盖占位者却不送弃牌堆（弃牌堆是阵营标记的真相源 → 敌方标记长期少算）；`aiPlayEventCard` 召不出 SP 时完全静默。

**守卫**（两个一起上，缺一个就是剧场）：
- `scripts/test-side-symmetry.mjs`（462 断言）—— 镜像局面后两侧判定必须逐字相同；reducer 的镜像不变式。证明「拿了 side 且真的用了它」。
- `scripts/test-no-side-fork.mjs`（32 断言）—— 棘轮：rules.js 零侧别字面量、ai* 不得复活、每个导出都收 side。证明「不能命名某一侧」（按性质是源码扫描，见 §6）。

⚠️ 引擎里**仍保留一处具名的 side 分叉**：`resolveSpChoice` —— 因为背后是真实且今天消不掉的不对称（**玩家的 SP 选择是异步的（弹窗等点击），AI 的是同步的**）。它被具名、被解释，而不是埋在函数中段的 if。

---

## 4. 技能系统（数据驱动）— 最重要的一张流程图

卡牌**不写死行为**，而是声明 `skills`，运行时按 `timing` 派发。理解这条链，就理解了 90% 的战斗逻辑：

```
data/cards.js  (每张卡: skills: [{ nameEn, name, description }])
      │  nameEn 作为主键
      ▼
engine/skillRegistry.js   176 条: { [nameEn]: { timing, execute(ctx) } }
      │   ├─ 114 条委托给模板:  execute: (ctx) => T.onPlayDamage(ctx, {...})
      │   └─  62 条内联手写:    execute: (ctx) => { ...手写... }   ← 两范式并存
      ▼
engine/skillTemplates.js  22 个参数化模板 (onPlayDamage / passiveHeal / conditionalAtk / onHitCounter …)
      │   模板 return「事件对象」数组
      ▼
engine/skillTriggers.js   triggerSkills(timing, context)
      │   按 timing 挑出场上匹配的卡, 逐个 handler.execute({...context, card}), 收集其 return 的事件
      ▼
hooks/useBattle.js  applySkillEvents(events, friendlySetter, enemySetter, side)
          把事件 (SUMMON_CARD / HEAL / BUFF / AOE_DAMAGE / DRAW_CARD / APPLY_STATUS …) 落到场面 state
          战斗修饰符走另一条：事件上的 mods 字段 → combat.aggregateCombatMods() 折叠 → resolveCardCombat() 消费
```

### timing 一览
`onPlay`（出牌时）· `onAttack` / `onHit`（攻击/命中）· `onKill`（击杀）· `onDeath`（死亡）· `onTurnStart` / `onTurnEnd`（回合首尾）· `passive`（常驻，如守护走 `utils/guardSkill.js` 白名单）。

### ⚠️ 已知陷阱
- **技能一律用「return 事件」表达效果，不要 mutate ctx**。`triggerSkills` 传给 handler 的是 `{...context}` 拷贝，改动传不回。战斗修饰符（克制加倍 / 无视护盾 / 闪避 / 减伤）曾经靠 mutate `ctx.damageMultiplier` 等传递、打卡时静默失效（2026-07-02 修）—— 现在的正确写法是把修饰符放进返回事件的 `mods` 字段（`{ type, mods: { damageMultiplier: 2 } }`），由 `engine/combat.js` 的 `aggregateCombatMods` 折叠（倍率相乘、减伤相加、布尔取或）后进 `resolveCardCombat`；`ignoreGuard` 不在 mods 里 —— 守护是攻击结算前的门，走 `guardSkill.attackerBypassesGuard`。
- `nameEn` 是字符串派发，拼错 → 静默 no-op，无编译期保护。加技能后核对 registry 有对应 key —— **目前没有守卫自动对账 `cards.js` ↔ registry**，靠人工核对（一行 node 即可：卡上所有 `skills[].nameEn` 是否都在 `skillRegistry` 里）。
- 一个「什么都不做」的技能，多半是派发点没传某个 ctx 字段（如 `friendlyField`），不是 handler 坏了 —— 先对照生产调用点的 ctx。

---

## 5. 数据层 — `src/data/`

纯数据 + 少量 load/save 函数，与引擎逻辑边界清晰（加一张卡通常只动 3–5 个文件）。

| 文件 | 内容 |
|---|---|
| `cards.js` | 124 张生物卡 = `set` BASE 104 + OCEAN 11 + MICRO 9（卡名/技能文本**中文硬编码**，未走 i18n；`subType` / `tags` 见 rules） |
| `eventCards.js` / `spCards.js` | 16 事件卡（四阵营各 4）/ 17 SP 觉醒卡 |
| `evolutions.js` | 进化链 `EVOLUTION_CHAINS`：真实现只 2 链 5 卡（含羞草 R→SR、创可贴 R→SR→SSR）。卡上的 `evolutionTo` 字段是**装饰性死数据**：17 张卡带它、全仓零读取方，其中 14 张指向根本不存在的中文卡名 |
| `deckRules.js` | 常量权威：`DECK_SIZE`(25) · `SP_DECK_SIZE`(5) · `MAX_FIELD_SLOTS`(6) · `LEADER_HP`(30000) · `POWER_CURVE`（ATK+HP 按 cost 的预算）· `RARITIES` · `FACTION_ADVANTAGE` + `FACTION_ADVANTAGE_BONUS`(0.20) · SP 开闸 `SP_TURN_TRIGGER`(8) 等。⚠️ `QUIZ_CHANCE` / `AWAKEN_PARTIAL` 是**死常量**（引擎从不读/从不产生，rules 已注明） |
| `campaignData.js` / `tutorialData.js` | 闯关 4 章 29 关（5+8+8+8）/ 教学 5 关（`BASIC_LEVELS` 3 + `ADVANCED_LEVELS` 2） |
| `quizzes.js` + `quizzesGeneral.js` | 805 道卡题（含 Leitner 复习）+ 242 道通用题（答题觉醒/教育核心） |
| `achievements.js` · `dailyChallenges.js` · `dexSets.js` · `gachaBanners.js` · `presetDecks.js` · `testDecks.js` | 成就 / 每日 / 图鉴分包 / 抽卡 banner / 预设卡组 / 测试卡组 |

**属性/阵营**：只有 ATK+HP；4 阵营 nature（自然）/ body（人体）/ pathogen（病原）/ tech（科技）成克制环，克制 +20%（`utils/damage.js` 读 `deckRules`）。

---

## 6. 测试

- `scripts/test-*.mjs`：**77 套**断言测试，`npm test` 统一入口（`scripts/run-tests.mjs`），CI（`.github/workflows/ci.yml`，Node 20）在 push 时跑 lint → test → build。
- **手法分两类**（按「是否加载项目代码」数）：**64 套跑真代码** —— 62 套 import 真模块（其中几套同时也 grep 源码）、`test-sw-api-bypass` 用 `new Function` 真执行 `public/sw.js`、`test-no-undef` 跑 ESLint；**13 套纯 source-grep**（`readFileSync` + 正则守文案/数值/迁移锚点）—— 那类**只能证明文本顺序，证明不了运行时行为**，别当行为测试用。
- ⚠️ **eslint 只开了 `no-undef`**（`eslint.config.js` 的注释说明了为什么）—— **没有** react-hooks 插件、**没有** `exhaustive-deps`。别以为「lint 干净」证明了 deps 正确（也证明不了「import 了但没用」，见 §2 的 `BattleCard`）。
- **真测试**（import 真模块驱动）：`test-rules-gates`(60) · `test-battle-reducer`(67) · **`test-side-symmetry`(462，镜像对称)** · `test-combat-resolve`(68) · `test-leader-damage`(33) · `test-hand-uid`(21) · `test-sw-api-bypass`(24) · `test-wire-{envelope,intent,events,privacy}` + `test-pvp-quiz`（PvP 协议/隐私墙）· `test-docs-truth`(51，CLAUDE.md / rules 数字对账) · `damage.js`/`statusEffects.js`/`skillTemplates.js`。`test-no-side-fork`(32) 是结构棘轮，按性质就是源码扫描。
- ☠️ **假绿铁律**：engine 测试的 ctx 必须与生产调用点**逐字段一致**；fixture 一律从**真的** `initialBattleState` + **真的** `cards.js` 改，**绝不手搓「长得像」的对象**。本项目已被假绿烧过四次（`partialAwaken` 档 / `test-leader-damage` 初版多传 `friendlyField` 凭空造出假 bug / `test-sw-api-bypass` 初版漏 `location.origin` 导致全部因错误原因通过 / `MARKS_CLEAR` 的 no-op bailout）。新守卫**务必配变异测试**证明它咬得住。
- **棋盘状态机已解耦成可单测的 `battleReducer` + 规则已抽成可单测的 `rules.js`** → 状态转移与规则判定都能脱离 React 直测。仍焊在 Hook 里的：跨状态编排（谁先 dispatch、事件派发顺序、死亡收口的提交后 useEffect）+ `useAITurn` 的 async 时序 —— 这些**只能走 preview 冒烟兜底**（`docs/VERIFY.md` §2）。
- ⚠️ `src/hooks/*.js` 的相对 import **必须带 `.js`**（commit `6cffff1` 起已补齐）—— Node ESM 不做扩展名补全，漏了就 import 不进来，历史上「带扩展名的文件全都有测试、不带的全都没有」不是巧合，是因果。
- `audit-*.mjs` / `validate-*.mjs` 是信息性脚本，不在 `npm test` 门禁内，按需手动跑。中继另有 `cd relay && npm run smoke`。

---

## 7. 动画（性能相关）

**全部动画由 Framer Motion 承担**：页面转场、卡牌翻转、手牌展开、按钮反馈、攻击/受伤/觉醒演出。仓库里**没有** GSAP（已删）、**没有** tsParticles（不在 `package.json`）、**没有** WAAPI（全仓零 `.animate(` 调用 —— 曾经唯一的调用者 `src/effects/battleAnimations.js` 是零 importer 的死文件，2026-09-06 已删）。别再把「WAAPI 战斗演出层 / 粒子层」写回文档。

低端设备（iPad/齐齐实测目标）的「精简模式」降级是目标，**尚未实现**。

---

## 8. PvP（哑中继 + host 权威）

设计取舍与三条不变量在 `DEPLOY.md` §4、中继自身在 `relay/README.md`；这里只画地图。

```
guest 浏览器 ──intent──▶ relay/（Node + ws，盲转字节）──▶ host 浏览器（唯一跑 useBattle 的地方）
             ◀──sync────                              ◀── 每次 reducer 提交后 buildSync
```

- **`relay/`**：`server.js` + `lib/{rooms,routing,control,roomCode}.js` + `smoke/run.mjs`。零游戏逻辑、零 `src/` import、一次都不 `JSON.parse` 对端消息体（smoke 用非法 JSON 探针帧证明）。只听 127.0.0.1，生产由 Caddy 反代 `/api/relay`；**单独部署** `npm run deploy:api`（与前端 `npm run deploy` 分开）。不变量：中继永远不懂规则 · PvP 零持久化收益（host 是别人家小孩的浏览器）· 不校验卡牌所有权。
- **`src/engine/wire.js`**：协议。`PROTOCOL_VERSION`（现 4）· `MSG` sync/intent/resume · `SHAPES` 公开树定形 · `PRIVATE_KEYS` 剥掉隐藏信息（手牌 / SP 卡组内容 / 答案卡，只留 `handCount` 等计数）· `viewFor`/`toViewSide` 按座位镜像（guest 收到的 `player` 就是自己 → BattleScreen 几十处 `battle.player*` 零改动）· 事件环 `EVENT_RING_CAP`（浮字/特效/日志随快照带过去）。**改公开树形状必须 bump `PROTOCOL_VERSION`**，且两台都要强刷（旧版按版本拒收新快照、中继盲转不报错 → 表现为「连不上」不弹错）。
- **`src/engine/quizGate.js`**：问答纯核心 —— 每侧节流（`QUIZ_COOLDOWN_TURNS`）· `publicQuiz` 脱敏投影 · `gradeAnswer` host 判卷。答案只活在 `useBattle` 的 `quizKeyRef`，**永不上 wire**；`QuizModal` 因此是两阶段（`rightIdx` 到达才揭晓），别改回本地即时揭晓。
- **`src/engine/matchSnapshot.js` + `src/utils/matchStore.js`**：host 自恢复（刷新 / 切网 / iOS 回收标签页后接回同一间房）。前者是纯核心：`packMatch/readSnapshot/isResumable`，`RESTORED`/`NOT_RESTORED` 两张清单是「必须恢复什么」的单一真相源，`SNAPSHOT_TTL_MS` 6 小时；后者只管 localStorage IO + 写入节流。☠️ 这份数据登记在 `saveManager` 的 `NON_SAVE_KEYS`，**绝不进存档**（装着中继 token 与双方手牌）。中继侧本来就允许同 (room, token) 的 host 接回，零改动。
- **`src/net/`**：`relayClient.js`（`createRelayClient` / `STATUS`）· `lobbyProtocol.js`（大厅阶段的卡组帧）。
- **hooks**：`usePvpHost`（推 sync · 收 intent 去重后**逐字照 `useAITurn` 的约定重放**为 `side='enemy'` 调用 · 敌方回合 bootstrap · 事件环发射）· `useGuestBattle`（瘦客户端：返回与 `useBattle` **同形状**的 battle，数据 ← `decodeSync`，方法 → `encodeIntent`，UI 灰显跑 `rules.js` 真谓词；host 仍是权威，绕过灰显硬发的 intent 会被引擎拒）。
- **components**：`PvpLobby`（房间码 / 大厅）→ `PvpDeckPicker` → `PvpHostBattleScreen`（useBattle + usePvpHost）或 `GuestBattleScreen`（useGuestBattle）→ 同一个 `BattleScreen`。`HostBattleScreen` 是单机 / 测试场用的同源 wrapper。
- 已知边界：guest 看不到 SP **数**（`spDeck` 整体被 strip，要显示得改协议）；续局只保 host 一侧（guest 刷新要重输房间码）。

---

## 9. 快速上手指引

- **改战斗规则** → 只有一条 side 参数化的路：`engine/rules.js`（能不能）/ `engine/combat.js`（算数字）/ `engine/battleReducer.js`（状态转移）+ `hooks/useBattle.js`（编排）。**不存在「玩家/AI 两份」**（§3）；改完跑 `test-side-symmetry` + `test-no-side-fork`。
- **加/改卡牌效果** → `data/cards.js`（数据）+ `engine/skillRegistry.js`（接线，优先复用 `skillTemplates.js` 模板，**用事件式不要 mutate ctx**，战斗修饰符放 `mods`）。
- **加关卡/教学/题目** → 对应 `data/*.js`，然后补 `scripts/test-*.mjs` 断言；教学要教的机制得在迷你卡上可见（§2）。
- **改 PvP 公开树 / 协议** → `engine/wire.js` 的 `SHAPES` + bump `PROTOCOL_VERSION`，跑 `test-wire-*`；隐藏信息永不上 wire（§8）。
- **改 `sw.js` 的 fetch 规则** → 同一 commit bump `CACHE_NAME`。
- **验证** → `npm test` + `npm run lint` + `npm run build`；UI 观感走 `vite preview`（4174，dev HMR 对懒加载块不可靠）。固定流程见 `docs/VERIFY.md`。
- **工作流 / 部署** → 直接在 `main` 上改，commit 后 `git push origin main`（CI 跑 lint → test → build）。生产是自有 VPS：前端 `npm run deploy`（build + rsync）、中继 `npm run deploy:api`，**回执不算数，按 `docs/VERIFY.md` §3 回验字节**。齐齐玩的是 `https://bio.socialcontract.capital`；Vercel 只是海外镜像/预览，不是实测目标（`DEPLOY.md` §1）。
