# Bio Heroes 架构说明 (ARCHITECTURE)

> 面向「新接手者 / 未来的自己」的一页式架构地图。详细规则见 `.claude/rules/`，逐 Sprint 历史见 `CHANGELOG.md`，当前会话状态见 `.claude/SESSION.md`。
> 已知结构债与 bug 见 `outputs/code-health-report-*.md`。

---

## 1. 一句话

React 18/19 + Vite 的单机卡牌对战网页游戏。**无后端**（Supabase 为后期预留），全部状态存浏览器 `localStorage`。战斗为**回合制状态机**，卡牌效果由**数据驱动的技能系统**结算。核心属性只有 **ATK + HP**（没有 DEF / SPD）。

---

## 2. 顶层结构与屏幕路由

入口 `src/App.jsx` 用一个 `screen` state 做屏幕切换（非 react-router），重型屏幕全部 `React.lazy` 懒加载分包：

```
App.jsx  (screen state + 全局经济/存档/成就编排)
 ├─ 'title'      TitleScreen        主菜单
 ├─ 'tutorial'   TutorialScreen     教学关（3 基础 + 2 进阶）
 ├─ 'campaign'   CampaignScreen     闯关战役（4 章 23 关）
 ├─ 'battle'     BattleScreen       ★ 战斗主界面（最重）
 ├─ 'gacha'      GachaScreen        抽卡
 ├─ 'deck'       DeckBuilder        卡组构建
 ├─ 'collection' Collection         卡牌图鉴 + dex 收集追踪
 └─ 'daily'      DailyChallenge     每日挑战
```

跨屏的持久数据走 hooks：`useEconomy`（金币/钻石/碎片/收藏/进化）、`useDailyChallenge`。存档读写在 `utils/saveManager.js` + 各 `data/*` 的 load/save 函数（`loadCampaignProgress` 等），key 前缀 `bio-heroes-*`。

---

## 3. 战斗引擎 — `src/hooks/useBattle.js`

**这是全项目最大、最复杂的模块（~2300 行）。** 整个战斗状态机 + AI + 事件派发 + 死亡结算都在这一个 Hook 内。

### 相位机
```
每侧 phase:  init → mulligan → main ⇄ battle → ended ─(下一轮)→ main
顶层:        activeSide: 'player'|'enemy'    winner: null|side
```
- 每侧独立推进 `main`→`battle`→`ended`，`activeSide` 是那根接力棒（`TURN_HANDOFF` **原子**交接：拆开会有一帧「activeSide 已换、新行动方还没进 main」→ useAITurn 放行后 gate 全拒 → 回合永久锁死）。
- `'over'` **不是相位值** —— 它就是 `winner != null`，由 `derivePhase` 派生。
- `'animating'` **已删**（S3）：它是零消费的幽灵，`setAnimating`/`restorePhase` 曾被导出但全项目无人调用。

### 状态模型（E5 已大幅收敛）
- **棋盘状态收进 `src/engine/battleReducer.js`（E5c 6/6 组 + S2/S3）**：`turn/activeSide/winner`（顶层）+ 每方 `powerBank/discard/energy/leaderHp/field/summoned/attacked/phase`（`player`/`enemy` 子树）。**全树 JSON-clean**（有护栏断言 —— 它是「棋盘状态能整棵推给 PvP guest」的前提）。`useBattle` 里 `battleState`/`dispatch` + `battleStateRef = useLatestRef(battleState)`（供异步 AI 回合/`latest` 快照读最新）；这些状态全部 `派生自 reducer`，callbacks 改 `dispatch(ACTION)`。**纯函数单测 `scripts/test-battle-reducer.mjs`**（首个真驱动 reducer 的测试）。
- ⚠️ **useReducer dispatch 不 eager 计算**：凡「updater 闭包内赋值、setter 返回后同步读回」的量（`defKilled/atkKilled/replaced`）在 `useBattle` 侧已改成 dispatch 前用 `battleStateRef` 确定性算好，不靠闭包。field setter（`setPlayerField/setEnemyField`）是**透传垫片**（原样把 updater 交给 reducer 跑，保同 tick 顺序累加）。
- E5a→E5b→E5c 已消掉大部分 `xRef.current=x` 双写（收进 `useLatestRef` helper 再随迁移退役）+ 停止向 `BattleScreen` 泄漏原始 `*Ref`（改导出只读 `latest` getter 快照）。剩余 `useState`/`useRef` 多为 UI 态（battleLog/currentQuiz/skillEvents/pendingSpSummon…）与准记忆 ref（spTriggeredRef/processedDeathsRef/SP 阈值 init ref…），不属棋盘状态。（`summoned`/`attacked` 已于 S2 迁进 reducer —— 它们此前是**一个 Set 装两侧**。）
- 未做（可选后续）：SP 卡组 `playerSpDeck/enemySpDeck` 仍在 useState（边界状态、改动少）。
- ✅ `attack/aiAttack`、`playToField/aiPlayToField`、`playEventCard/aiPlayEventCard` **已于 2026-07-17 全部合并**（见下）。
- ⚠️ 每侧 `summoned`/`attacked` 已收进 reducer（用**数组**不用 Set —— Set 不过 JSON，而棋盘状态要能整棵推给 PvP 的 guest）。

### 玩家 vs AI —— ✅ 已 de-fork（2026-07-17，S0-S7）

**这里曾经写着**：「`attack`/`aiAttack`、`playToField`/`aiPlayToField` 是两份近重复实现…改战斗规则须两处同步改，否则出现『玩家能 / AI 不能』的不对称 bug。」

那条规矩现在**已经删掉了** —— 它本身就是那个 fork 的伤疤。`ai*` 三兄弟（`aiPlayToField` / `aiAttack` / `aiPlayEventCard`）全部退役，引擎里只剩一条 side 参数化的路：

```
playToField(card, slotIdx, side = 'player')
attack(atkSlot, defSlot, awakenOpts = {}, side = 'player')
playEventCard(card, opts = {}, side = 'player')
endMainPhase(side = 'player')
```

- **规则**（能不能）住 `engine/rules.js` —— side-blind 纯谓词，**不得出现 'player'/'enemy' 字面量**。一个不能命名某一侧的模块，结构上无法偏袒某一侧。
- **人格**（怎么选）住 `engine/aiTarget.js`（`pickAiTarget` / `pickAiSpCard`）—— 引擎不该知道「敌方会挑费用最高的 SP」这种事。
- **侧别字面量**只允许活在 React 外壳（`useBattle` 的默认参数）里。

那个 fork 逃掉的东西（都是真 bug，不是取舍）：`aiAttack` **一行守护检查都没有**（「守护优先」是 CLAUDE.md 速查里的核心规则，它至今没暴雷只因 `pickAiTarget` 的 T1 恰好优先挑守护卡 = 规则一直靠「AI 恰好礼貌」维持）；`aiPlayToField` 无条件扣能量（可扣成负数）、覆盖占位者却不送弃牌堆（弃牌堆是阵营标记的真相源 → 敌方标记长期少算）；`aiPlayEventCard` 召不出 SP 时完全静默。

**守卫**（两个一起上，缺一个就是剧场）：
- `scripts/test-side-symmetry.mjs`（462 断言）—— 镜像局面后两侧判定必须逐字相同；reducer 的镜像不变式。证明「拿了 side 且真的用了它」。
- `scripts/test-no-side-fork.mjs`（22 断言）—— 棘轮：rules.js 零侧别字面量、ai* 不得复活、每个导出都收 side。证明「不能命名某一侧」。

⚠️ 引擎里**仍保留一处具名的 side 分叉**：`resolveSpChoice` —— 因为背后是真实且今天消不掉的不对称（**玩家的 SP 选择是异步的（弹窗等点击），AI 的是同步的**）。它被具名、被解释，而不是埋在函数中段的 if。

### 相位机（S3 起）
真相源是 `state.activeSide`（轮到谁） + `state[side].phase`（那一侧的进度：`init|mulligan|main|battle|ended`）。对外仍由纯函数 `derivePhase(state)` 派生出旧的顶层标量 → BattleScreen 20+ 处 `battle.phase` 读取零改动。

**为什么阶段机必须与 de-fork 捆在一起**：旧枚举把「发生什么」（main/battle）和「谁在做」（enemyTurn）编码进**同一个标量** —— 于是 `aiPlayToField` **即使有人想查 phase 也查不了**（不存在一个「敌方的 main」可查）。**缺失的 gate 不是懒，是不可表达。**

---

## 4. 技能系统（数据驱动）— 最重要的一张流程图

卡牌**不写死行为**，而是声明 `skills`，运行时按 `timing` 派发。理解这条链，就理解了 90% 的战斗逻辑：

```
data/cards.js  (每张卡: skills: [{ nameEn, name, description }])
      │  nameEn 作为主键
      ▼
engine/skillRegistry.js   175 条: { [nameEn]: { timing, execute(ctx) } }
      │   ├─ 113 条委托给模板:  execute: (ctx) => T.onPlayDamage(ctx, {...})
      │   └─  52 条内联老写法:  execute: (ctx) => { ...手写... }   ← 迁移半截，两范式并存
      ▼
engine/skillTemplates.js  22 个参数化模板 (onPlayDamage / passiveHeal / conditionalAtk / onHitCounter …)
      │   模板 return「事件对象」数组
      ▼
engine/skillTriggers.js   triggerSkills(timing, context)
      │   按 timing 挑出场上匹配的卡, 逐个 handler.execute({...context, card}), 收集其 return 的事件
      ▼
hooks/useBattle.js  applySkillEvents(events, friendlySetter, enemySetter, side)
          把事件 (SUMMON_CARD / HEAL / BUFF / AOE_DAMAGE / DRAW_CARD / APPLY_STATUS …) 落到场面 state
```

### timing 一览
`onPlay`（出牌时）· `onAttack` / `onHit`（攻击/命中）· `onKill`（击杀）· `onDeath`（死亡）· `onTurnStart` / `onTurnEnd`（回合首尾）· `passive`（常驻，如守护走 `utils/guardSkill.js` 白名单）。

### ⚠️ 已知陷阱（详见 health report）
- **技能应通过「return 事件」表达效果**。有一批老 handler 改用「mutate `ctx.damageMultiplier / ignoreShield / ignoreGuard / dodged / damageReduction`」传递战斗修饰符——但 `triggerSkills` 传给 handler 的是 `{...context}` 拷贝，改动传不回；且打卡结算 `calcCardBattle` 不读这些字段 → **这类修饰符在打卡时静默失效**。加新技能时**一律用事件式**，不要 mutate ctx。
- `nameEn` 是字符串派发，拼错 → 静默 no-op，无编译期保护。加技能后建议核对 registry 有对应 key。

---

## 5. 数据层 — `src/data/`

纯数据 + 少量 load/save 函数，与引擎逻辑边界清晰（加一张卡通常只动 3–5 个文件）。

| 文件 | 内容 |
|---|---|
| `cards.js` | 124 张生物卡（含卡名/技能文本，**中文硬编码**，未走 i18n） |
| `eventCards.js` / `spCards.js` | 16 事件卡 / 16 SP 觉醒卡 |
| `evolutions.js` | 进化链（`EVOLUTION_CHAINS`，真实现只 2 链 5 卡；卡上 `evolutionTo` 字段是**装饰性死数据**，未被读取） |
| `deckRules.js` | 常量权威：`DECK_SIZE` · `MAX_FIELD_SLOTS`（现为 6）· `POWER_CURVE`（ATK+HP 按 cost 的预算）· `RARITIES` · `FACTION_ADVANTAGE`（4 阵营克制环：nature/body/pathogen/tech） |
| `campaignData.js` / `tutorialData.js` | 关卡与教学数据 |
| `quizzes.js` + `quizzesGeneral.js` | 卡题 + 通用题（答题觉醒/教育核心） |
| `achievements.js` · `dailyChallenges.js` · `dexSets.js` · `gachaBanners.js` | 成就 / 每日 / 图鉴分包 / 抽卡 banner |

**属性/阵营**：只有 ATK+HP；4 阵营 nature（自然）/ body（人体）/ pathogen（病原）/ tech（科技）成克制环，克制 +20%（`utils/damage.js`）。

---

## 6. 测试

- `scripts/test-*.mjs`：**49 套**断言测试，`npm test` 统一入口（`scripts/run-tests.mjs`），CI 在 `.github/workflows/ci.yml` 上跑 lint + test + build。
- ⚠️ **eslint 只开了 `no-undef`**（`eslint.config.js` 的注释说明了为什么）—— **没有** react-hooks 插件、**没有** `exhaustive-deps`。别以为「lint 干净」证明了 deps 正确。
- **局限（E5c → S0-S7 大幅改善）**：仍有一批是 `readFileSync` **把源码当字符串正则匹配**（守文案/数值 + grep 迁移锚点）—— 那类**只能证明文本顺序，证明不了运行时行为**，别当行为测试用。
- **真测试**（import 真模块驱动）：`test-rules-gates`(60) · `test-battle-reducer`(60) · **`test-side-symmetry`(462，镜像对称)** · **`test-no-side-fork`(22，棘轮)** · `test-combat-resolve`(68) · `test-leader-damage`(33) · `test-hand-uid`(21) · `test-sw-api-bypass`(19) · `damage.js`/`statusEffects.js`/`skillTemplates.js`。
- ☠️ **假绿铁律**：engine 测试的 ctx 必须与生产调用点**逐字段一致**；fixture 一律从**真的** `initialBattleState` + **真的** `cards.js` 改，**绝不手搓「长得像」的对象**。本项目已被假绿烧过四次（`partialAwaken` 档 / `test-leader-damage` 初版多传 `friendlyField` 凭空造出假 bug / `test-sw-api-bypass` 初版漏 `location.origin` 导致全部因错误原因通过 / `MARKS_CLEAR` 的 no-op bailout）。新守卫**务必配变异测试**证明它咬得住。
- **棋盘状态机已解耦成可单测的 `battleReducer`（E5c）+ 规则已抽成可单测的 `rules.js`（S1）** → 状态转移与规则判定都能脱离 React 直测。仍焊在 Hook 里的：跨状态编排（谁先 dispatch、事件派发顺序、死亡收口的提交后 useEffect）+ `useAITurn` 的 async 时序 —— 这些**只能走 preview 冒烟兜底**。
- ⚠️ `src/hooks/*.js` 的相对 import **必须带 `.js`**（commit `6cffff1` 起已补齐）—— Node ESM 不做扩展名补全，漏了就 import 不进来，历史上「带扩展名的文件全都有测试、不带的全都没有」不是巧合，是因果。
- `audit-*.mjs` / `validate-*.mjs` 是信息性脚本，不在 `npm test` 门禁内，按需手动跑。

---

## 7. 动画分工（性能相关）

| 层 | 技术 | 用途 |
|---|---|---|
| UI 层 | Framer Motion | 页面转场、卡牌翻转、手牌展开、按钮反馈 |
| 战斗演出层 | WAAPI (Web Animations API) | 攻击序列、受伤抖动、觉醒/进化演出（**已替代 GSAP**） |
| 粒子层 | tsParticles | 技能特效、爆炸碎片、环境粒子 |

低端设备（iPad/齐齐实测目标）提供精简模式降级（减粒子/简化动画）。

---

## 8. 快速上手指引

- **改战斗规则** → `hooks/useBattle.js`（记得玩家/AI 两份都改）+ 相关 `engine/`。
- **加/改卡牌效果** → `data/cards.js`（数据）+ `engine/skillRegistry.js`（接线，优先复用 `skillTemplates.js` 模板，**用事件式不要 mutate ctx**）。
- **加关卡/教学/题目** → 对应 `data/*.js`，然后补 `scripts/test-*.mjs` 断言。
- **验证** → `npm test` + `npm run build`；UI 观感走 `vite preview`（dev HMR 在沙箱里对懒加载块不可靠，见 SESSION）。
- **工作流** → 直接在 `main` 上改，commit 后立即 `git push origin main`（Vercel 部署版才是实测目标）。
