# Bio Heroes Session State
> 更新时间: 2026-07-12（**真机实测 bug-fix 模式**。跑了两轮 8 视角并行审计 → 对抗式核实 → 修 bug：本窗口把审计翻出的 6 个候选核实成「5 真 bug + 1 降级欠账」并全修了（bio_alert 不判负 / 进化不触发成就 / OCEAN·MICRO 奖励轨 / AOE 复活撞槽 / LeaderHP 垫片覆盖）+ 2 套守卫。全 37 套测试绿 + build 绿、全推 main。）
>
> ⚠️ **本文件只留「活的交接」**——历史阶段（Sprint 1-33 + 06 决策/Phase + 07 引擎重构·真机 bug-fix）已归档到 `CHANGELOG.md`，逐 commit 细节在 git。别再让它膨胀（精简纪律见 CLAUDE.md）。

## 项目位置
- **实际路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）
- **GitHub**: github.com/yang44yang/bio-heroes (main 分支)
- **工作流**: 直接在 main 工作和 push，每次 commit 后立即 push（Vercel 部署版才是齐齐实测目标）

---

## 最近完成

### 2026-07-12 审计 6 候选 → 对抗核实 → 修 5 真 bug + 2 守卫
把 8 视角审计翻出的 bug 候选用**对抗式双视角核实**（代码真相 + 真机可达性，默认证伪）过一遍，只修确认为真且可达的。每条独立 commit + 全套测试 + build，可视者真机验证。
- **bio_alert 主人扣 0 不判负** `39dbfea`：GAME_OVER 只在各显式伤害点派发，无全局兜底 → stageRule 把主人打到 0 后 phase 照进 'main' 还能操作。加全局 `useEffect(leaderHp≤0→GAME_OVER)`，系统性覆盖所有 setter 式非战斗扣血源。
- **进化不触发收集成就** `14e84af`：`handleEvolve` 不跑 `detectNewlyUnlocked` → 靠进化集齐成就时徽章 3/3 却灰着、领不到科学包。Collection 挂 `collection` 变化跑检测 + 弹窗队列（挂 collection 变化而非内联，因 evolveCard 是 setState、同 tick 读是旧值；且自愈过去漏检）。✅ 真机弹「深渊探索者」。
- **OCEAN/MICRO 图鉴奖励轨名不副实** `0195fe0`：`rewardAchId` 误指 apex_predator/microbe_explorer（三卡全 BASE）→ 集齐 OCEAN/MICRO 对奖励进度贡献 0。建 `ocean_abyss`/`micro_battlefield` 真季成就（真卡 + 科学包）repoint + `test-dex-sets` ④b 耦合守卫。✅ 真机两包正确显示「集齐解锁…」。
- **同批 AOE 复活撞同一空位** `10f95ef`：死亡扫场对整批死卡传同一份快照 → `findEmptySlot` 给每张复活卡算出同槽 → 除首张外被 `SUMMON_CARD` 守卫静默丢弃（两张海星「必定复活」同批死只活一张）。改 `SUMMON_CARD` 目标槽被占时回退下一个空/死槽。
- **LeaderHP 垫片绝对写覆盖同 tick delta** `10f95ef`：垫片读 stale ref 跑 updater 再绝对 `LEADER_SET` → 抹掉同 tick 的 `LEADER_DAMAGE/HEAL` delta（bio_alert 抹掉透析机同回合回血、日志还照打「💚回血」）。加 `LEADER_APPLY` reducer action 让 updater 在 reducer 内对当前提交态跑、与 delta 可交换 + 回归单测。
- **降级（非 bug）**：里程碑发放顺序 grant-first vs App.jsx save-first 属一致性欠账，正常玩不双领（仅 Safari 隐私模式 `localStorage.setItem` 抛异常的极端边界）。

> 07-11 一轮（banner 永久失效 / 关卡浮字不显示 / 重开死卡卡场 / useAITurn 异常兜底 + banner 守卫）、07-07（isImmune / no-undef 守卫）、07-05「分子>分母」一族、E5 引擎重构全系列 —— 均见 `CHANGELOG.md`。

---

## 进行中
（无。审计翻出的确认 bug 已全修。等齐齐真机实测反馈——尤其新调的 SP 平衡、以及这批修的 banner/浮字/判负/成就/复活是否真的好了。）

---

## 已知问题
- 战斗日志硬编码中文（~240 条，spec 方案 A 不译；英文模式战斗日志仍中文）
- Vite dev 偶尔 504（optimizeDeps.include 已修主要路径）；preview 沙箱 HMR 连不上 → 验证走 `vite preview`(4174) 非 dev
- **测试空洞（对抗核实已确认、本轮最高杠杆盲区）**：`statusEffects.js`（processStatuses 等 13 状态分支，每回合结算热路径 `useBattle:712`）零执行测试；`useAITurn.js` 选靶零执行测试（现有只正则匹配源码）
- **未覆盖**：Card-designer skill 需 Claude.ai 侧手动更新（新 subType + SP unlockMode）；`bio-heroes-knowledge-map.md` 未创建

---

## 下次启动时优先

### 🟢 建议先补 `statusEffects.js` 执行式单测（最高性价比盲区）
本轮审计对抗核实确认：它是每回合结算热路径、13 个 status 分支纯 mutate 场上卡（中毒/护盾/atk_boost 到期消退…），出错无任何测试拦得住。造 card fixture 逐分支断言 mutation + turnsLeft 边界（M）。同理可把 AI 选靶抽 `pickAiTarget` 纯函数补单测。

### 🔴 或继续真机实测 bug-fix
拿齐齐日志修，**优先怀疑 E5 reducer 迁移动过的路径**（`applyCombatOutcome`/`resolveCardCombat`、死亡收口 useEffect、`handlePostAttackSkills`、`useAITurn`(已有 catch 兜底)、`battleReducer` 各 action）。复现工具：主菜单→🧪 测试场（家长门 56）→摆双方场+满能量+一键开打。**验证铁律**：`npm test`（37 套）+ `npm run build` + `vite preview`(4174 非 dev) 端到端 0 console error 才算完。⚠️ 血泪教训：`grep/单测全绿 ≠ 运行时没 bug`，战斗改动务必 preview 真跑「卡打卡致死 + AI 回合跑完整」。

### 🟡 或摊开 feature 线（非 bug）
S1 海洋深渊季（引擎就绪缺卡，第一刀=补 OCEAN 到曲线空档）/ 题库 Leitner 间隔复习（`_qid` 主键已就绪，加 `useQuizMastery` hook 不动 745 题）/ 每日挑战 v2 扩池 / SP 平衡滚动观察。

---

## 关键文件（战斗引擎地图）
- **状态机** `src/hooks/useBattle.js` + `src/engine/battleReducer.js`（6 组 reducer 子树 + `LEADER_APPLY`(updater 对当前态跑) + `battleStateRef`=useLatestRef 供异步 AI 回合读最新值）
- **纯函数** `src/engine/combat.js`（resolveCardCombat / canCardAttack / applyCombatOutcome）· `src/hooks/useAITurn.js`（AI 完整回合，async IIFE，已加 catch/finally 兜底）
- **技能/状态** `src/engine/{skillRegistry,skillTemplates,statusEffects}.js`（statusEffects 零执行测试）· **boss/关卡** `src/engine/{bossMechanics,stageRules}.js`（发 `STAGE_RULE` 事件，BattleScreen 排空循环消费）
- **数据** `src/data/{cards,eventCards,spCards,campaignData,deckRules,dexSets,gachaBanners,achievements}.js`
- **测试** `scripts/test-*.mjs`（**38 套**，`npm test` 统一入口；test-status-effects 55 断言全 13 状态分支、test-battle-reducer 含 LEADER_APPLY 回归、test-dex-sets ④b 奖励轨耦合守卫、test-gacha-banner 选章守卫）
- **CI** `.github/workflows/ci.yml`（push/PR 到 main 跑 lint→test→build 门禁；2026-07-12 启用、首跑绿。改 workflow 文件需令牌带 `workflow` scope）
- 架构总览见 `ARCHITECTURE.md`；历史 Sprint/决策/重构见 `CHANGELOG.md`
