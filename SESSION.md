# Bio Heroes Session State
> 更新时间: 2026-07-11（**真机实测 bug-fix 模式**续。本窗口做了一次 8 视角并行审计→对抗核实→修 4 个真机 bug（banner 永久失效 / 关卡浮字不显示 / 重开死卡卡场 / AI 回合无异常兜底）+ 加 1 套 banner 守卫测试。全 37/37 套绿 + build 绿、全推 main。）
>
> ⚠️ **本文件只留「活的交接」**——历史阶段（Sprint 1-33 + 06 决策/Phase + 07 引擎重构·真机 bug-fix）已归档到 `CHANGELOG.md`，逐 commit 细节在 git。别再让它膨胀（精简纪律见 CLAUDE.md）。

## 项目位置
- **实际路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）
- **GitHub**: github.com/yang44yang/bio-heroes (main 分支)
- **工作流**: 直接在 main 工作和 push，每次 commit 后立即 push（Vercel 部署版才是齐齐实测目标）

---

## 最近完成

### 2026-07-11 8 视角审计 → 对抗核实 → 修 4 个真机 bug + banner 守卫
一次并行审计（8 视角 fan-out + 对抗式核实）扫出问题，逐条自查后只修**确认的真 bug**。每条独立 commit + 全套测试 + build。
- **抽卡「本期推荐」banner 永久失效** `7509cb1`：`selectBanner` 用 `s.startsWith('${ch}-')` 匹配，但关卡 key 早迁成 `stage_X_Y`（连它自己注释都写 `stage_1_1`）→ 恒回落 default → 齐齐**从没见过**推荐卡区块和 +50% 角标。改 `stage_${ch}_` 前缀。
- **关卡规则浮字全部不显示** `d58e35e`：`stageRules` 发的 `STAGE_RULE` 事件（蚊虫/深海压力/隐身/孢子/警报）经正确 channel 流进 `bossMechanicEvents`、机制在跑，但 `BattleScreen` 排空循环只认 `BOSS_*` → 浮字被静默丢弃。补 `STAGE_RULE` 渲染分支。
- **重开一局后 SP/Boss 死卡卡场** `eb53628`：`processedDeathsRef`（死亡去重）在 `startBattle` 从不重置；SP uid `sp_p_${id}_${i}`、Boss `boss_${id}_0` 确定性 → 上局死过的这局再死被跳过：不触发亡语、不进弃牌堆、0HP 赖场上。startBattle 里 `clear()`。
- **useAITurn 无异常兜底（系统性）** `9e654e6`：AI 完整回合是无 try 的 async IIFE，中途抛错 → 静默 reject → `aiRunning` 永卡 true → 敌方回合冻死。改 `.catch(记日志+尽力交还玩家).finally(aiRunning 必归位)`，堵整族「async AI 边界吞异常」。
- **banner 守卫** `6d183a6`：`test-gacha-banner.mjs`（22 断言），把选章逻辑**耦合到 `campaignData` 真实 stage id** → 将来再迁 key 格式会当场炸而非静默失效。测试 36→**37 套**。

> 07-07 真机压测跟进（`isImmune` 漏认技能名致 MRSA/生物膜「免疫科技系」从没生效 `6033e64` + `no-undef` eslint 静态守卫堵 oppSide 那族 `d014e3c`）、07-05「分子>分母」一族清零 + SP 平衡重调、E5 引擎重构全系列 —— 均见 `CHANGELOG.md`。

---

## 进行中
（无。等齐齐真机实测反馈——尤其**新 SP 平衡手感**，以及这次刚修的 banner / 关卡浮字 / 重开死卡三处上线后是否真的好了。）

---

## 已知问题
- 战斗日志 message 文本硬编码中文（~240 条，spec 方案 A：不翻译；英文模式战斗日志仍中文）
- Vite dev 偶尔 504（已用 optimizeDeps.include 修主要路径）；preview 沙箱 HMR 连不上 → 验证走 `vite preview`(4174) 非 dev
- **未对抗核实的 bug 候选**（8 视角审计因 session 额度腰斩只跑完 17/54 agent，这几条没核实、别当真 bug）：同批多张 AOE 复活撞空位 / `bio_alert` 主人扣 0 不判负（无全局 `leaderHp<=0→GAME_OVER` 兜底）/ 进化成卡不触发收集成就（只在抽卡屏检测）/ dex 奖励轨 OCEAN 承接
- **测试空洞（对抗核实已确认）**：`statusEffects.js`（processStatuses 等 13 状态分支，每回合结算热路径 `useBattle:712`）零执行测试；`useAITurn.js` 选靶零执行测试（现有只正则匹配源码）
- **未覆盖**：Card-designer skill 需 Claude.ai 侧手动更新（新 subType + SP unlockMode）；`bio-heroes-knowledge-map.md` 未创建；`.github/`(CI 写好没提交) 和 `sync-setup-plan.md`(个人笔记误落仓库) 两个未跟踪项待决

---

## 下次启动时优先

### 🔴 继续真机实测 bug-fix（拿齐齐日志修）
**工作节奏**：拿复现步骤→定位模块（**优先怀疑 E5 reducer 迁移动过的路径**：`applyCombatOutcome`/`resolveCardCombat`、死亡收口 useEffect、`handlePostAttackSkills`、`useAITurn`（async IIFE 现已有 catch 兜底）、`battleReducer` 各 action）→独立 commit + push。
- ⭐ **复现工具**：主菜单→「🧪 测试场（家长）」门 **56**→全卡池摆双方场 + 满能量 + 一键开打。桌面视口 1280×850 更稳；先选己方卡（黄框=可攻击）再点敌方卡/主人。
- **验证铁律**：`npm test`（**37 套**，grep+纯函数混合）+ `npm run build` + `vite preview`(4174，**非 dev**，HMR 沙箱连不上) 端到端，0 console error 才算完。
- ⚠️ **血泪教训**：`grep 全绿 ≠ 运行时没 bug`。战斗改动务必 preview 真跑「卡打卡致死 + AI 回合跑完整」。

### 🟡 可选下一步（非 bug）
- **补 `statusEffects.js` 单测**（最高性价比测试空洞）；把 AI 选靶抽 `pickAiTarget` 纯函数再补单测
- **续跑审计剩余 37 视角** + 对抗核实上面 4 个 bug 候选
- **SP 平衡**滚动观察（旋钮：地板 4→5 / offset 2→1 每费更晚一回合 / 单独削 6 费巨兽属性）
- **新功能线**：S1 海洋深渊季（引擎就绪缺卡，第一刀=补 OCEAN 到曲线空档）/ 题库 Leitner 间隔复习（`_qid` 主键已就绪，加 `useQuizMastery` hook 不动 745 题）/ 每日挑战 v2 扩池

---

## 关键文件（战斗引擎地图）
- **状态机** `src/hooks/useBattle.js` + `src/engine/battleReducer.js`（6 组 reducer 子树 + `battleStateRef`=useLatestRef 供异步 AI 回合读最新值）
- **纯函数** `src/engine/combat.js`（resolveCardCombat / canCardAttack / applyCombatOutcome）· `src/hooks/useAITurn.js`（AI 完整回合，async IIFE，已加 catch/finally 兜底）
- **技能/状态** `src/engine/{skillRegistry,skillTemplates,statusEffects}.js` · **boss/关卡** `src/engine/{bossMechanics,stageRules}.js`（stageRules 发 `STAGE_RULE` 事件，BattleScreen 排空循环消费）
- **数据** `src/data/{cards,eventCards,spCards,campaignData,deckRules,dexSets,gachaBanners}.js`
- **测试** `scripts/test-*.mjs`（**37 套**，`npm test` 统一入口）
- 架构总览见 `ARCHITECTURE.md`；历史 Sprint/决策/重构见 `CHANGELOG.md`
