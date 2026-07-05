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
mulligan → main → battle → animating → over
```
- `mulligan` 起手换牌 → `main` 我方主回合（出牌/攻击）→ `battle`/`animating` 结算与演出 → 敌方回合 → … → 某方主人 HP≤0 → `over`。

### 状态模型（E5 已大幅收敛）
- **棋盘状态收进 `src/engine/battleReducer.js`（E5c，6/6 组完成）**：`turn/phase/winner`（顶层）+ 每方 `powerBank/discard/energy/leaderHp/field`（`player`/`enemy` 子树）。`useBattle` 里 `battleState`/`dispatch` + `battleStateRef = useLatestRef(battleState)`（供异步 AI 回合/`latest` 快照读最新）；这些状态全部 `派生自 reducer`，callbacks 改 `dispatch(ACTION)`。**纯函数单测 `scripts/test-battle-reducer.mjs`**（首个真驱动 reducer 的测试）。
- ⚠️ **useReducer dispatch 不 eager 计算**：凡「updater 闭包内赋值、setter 返回后同步读回」的量（`defKilled/atkKilled/replaced`）在 `useBattle` 侧已改成 dispatch 前用 `battleStateRef` 确定性算好，不靠闭包。field setter（`setPlayerField/setEnemyField`）是**透传垫片**（原样把 updater 交给 reducer 跑，保同 tick 顺序累加）。
- E5a→E5b→E5c 已消掉大部分 `xRef.current=x` 双写（收进 `useLatestRef` helper 再随迁移退役）+ 停止向 `BattleScreen` 泄漏原始 `*Ref`（改导出只读 `latest` getter 快照）。剩余 `useState`/`useRef` 多为 UI 态（battleLog/currentQuiz/skillEvents/pendingSpSummon…）与准记忆 ref（attackedThisTurn/summonedThisTurn/SP 阈值 init ref…），不属棋盘状态。
- 未做（可选后续）：SP 卡组 `playerSpDeck/enemySpDeck` 仍在 useState（边界状态、改动少）；`attack/aiAttack` 两份近重复仍未合并（见下）。

### 玩家 vs AI
`attack`/`aiAttack`、`playToField`/`aiPlayToField` 是**两份近重复实现**，只差 `player↔enemy` 变量与返回形状。改战斗规则须两处同步改，否则出现「玩家能 / AI 不能」的不对称 bug。

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
| `deckRules.js` | 常量权威：`DECK_SIZE` · `MAX_FIELD_SLOTS=5` · `POWER_CURVE`（ATK+HP 按 cost 的预算）· `RARITIES` · `FACTION_ADVANTAGE`（4 阵营克制环：nature/body/pathogen/tech） |
| `campaignData.js` / `tutorialData.js` | 关卡与教学数据 |
| `quizzes.js` + `quizzesGeneral.js` | 卡题 + 通用题（答题觉醒/教育核心） |
| `achievements.js` · `dailyChallenges.js` · `dexSets.js` · `gachaBanners.js` | 成就 / 每日 / 图鉴分包 / 抽卡 banner |

**属性/阵营**：只有 ATK+HP；4 阵营 nature（自然）/ body（人体）/ pathogen（病原）/ tech（科技）成克制环，克制 +20%（`utils/damage.js`）。

---

## 6. 测试

- `scripts/test-*.mjs`：32 套断言测试，`npm test` 统一入口（`scripts/run-tests.mjs`），CI 在 `.github/workflows/ci.yml` 上跑 test + build。
- **局限（E5c 起改善）**：仍有一批是 `readFileSync` **把源码当字符串正则匹配**（守「文案/数值没被改坏」+ grep 迁移锚点）；能 import 纯函数直测的在增多：`damage.js`/`statusEffects.js`/`skillTemplates.js`/`combat.js`（`resolveCardCombat`）+ **`battleReducer.js`（`test-battle-reducer.mjs`，35 断言，真驱动 state+action→next）**。
- **棋盘状态机已解耦成可单测的 `battleReducer`（E5c）** → 状态转移能脱离 React 直测。仍焊在 Hook 里的：跨状态编排（谁先 dispatch、事件派发顺序、死亡收口的提交后 useEffect）——这些走 preview 冒烟兜底。
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
