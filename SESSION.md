# Bio Heroes Session State
> 更新时间: 2026-07-05（**真机实测 bug-fix 模式**。本窗口清了一整族「分子 > 分母 / 两处总数不一致」bug（5 连修 + 1 硬化）并按齐齐要求重调了 SP 平衡，全 35/35 套绿 + build 绿、全推送。）
>
> ⚠️ **本文件只留「活的交接」**——历史阶段（Sprint 1-33 + 06 决策/Phase + 07 引擎重构·真机 bug-fix）已归档到 `CHANGELOG.md`，逐 commit 细节在 git。精简于 2026-07-05（原 1000+ 行）。

## 项目位置
- **实际路径**: `/Users/YangYANG/projects/bio-heroes/`（Mac mini）
- **GitHub**: github.com/yang44yang/bio-heroes (main 分支)
- **工作流**: 直接在 main 工作和 push，每次 commit 后立即 push（Vercel 部署版才是齐齐实测目标）

---

## 最近完成

### 2026-07-05 「分子 > 分母」一族 bug 清零 + 收集数硬化 + SP 平衡重调
真机实测挖出并修完一整族「计数遍历全部记录、上限只数当前有效项」的 bug。每修一个：独立 commit + 回归测试（含**负向验证**守卫真会咬）+ `vite preview` 端到端。
- **教学毕业奖励 1400 可反复领** `df1b184`：`App.jsx handleTutorialGraduate` 零幂等（重玩最后一关→毕业→领奖可重入）→ 加独立持久标记 `bio-heroes-tutorial-reward-claimed`「先落盘再发放」。
- **抽卡图鉴 138 vs 图鉴屏 157 打架** `ccb351c`：两屏各算总数（138=生物+可抽SP、157=全部）→ `dexSets.js` 建单一权威 `ALL_DEX_CARDS`/`TOTAL_DEX_CARDS`(=157)，两屏同源。
- **闯关右上角 ★ 92/87（已得 > 总数）** `cd79583`：① `CampaignScreen` 教学同步写旧格式 `1-N` 幽灵 key（迁移后关卡 id 已是 `stage_1_N`）→ 改写 `stage_1_${lvl}` ② `getTotalStars` 只统计当前存在的关卡、每关封顶 3（与 `getMaxStars` 数同一集合）。
- **同根另 2 处（主动扫出）** `97c99a1`：`App.jsx:248` 星里程碑发奖 + `achievements.js` `star_shine` 成就也内联 `Object.values(stageStars).reduce` 重算 → 幽灵 key 让里程碑提前发奖/成就提前解锁 → 都改调 `getTotalStars`。
- **收集数硬化** `dc5e57d`：Collection/Gacha/Title 的 `Object.keys(collection).length` → `ownedDexCount()`（只数当前卡池内拥有、天然 ≤ 总数）。今日 collection 无陈旧 key、显示零变化，纯防御（防将来删/改卡后老存档超标）。
- **SP 太强重调（齐齐定「两者都做」）** `a510c94`：① 回合门槛 `max(3,spCost−3)`→`max(4,spCost−2)`（第 1-3 回合不召任何 SP；5-6费→T4/7→T5/8→T6，第 8 回合残局仍全解锁）② 7 张事件卡 `maxCost` 收口 = 本卡 `cost+3`（堵「2 费秒召 28000 生物膜 @T3」）。SP 属性未动、保留觉醒爽感。旋钮见「下次启动 🟡」。

### 2026-07-05 真机 bug-fix（上一窗口）：AI 冻结 / 闯关金币 / boss 机制 / 答题反馈 4 修
- **AI 击杀防守方后冻结回合** `2234ff0`（最要紧）：`handlePostAttackSkills` 用了 `oppSide` 却漏定义 → 击杀防守方 ReferenceError → **异步 AI 回合被静默 reject 卡死**（齐齐报「AI 老卡住」）。
- 闯关重进反复领 1400 `e89c324`（先标记落盘再发放）· boss/关卡 updater 闭包读回 2 处 `fb5980d` · 答题反馈阶段 `36d7872`（功能非 bug）。

### 2026-07-02→04 E5 战斗引擎架构重构全系列（E1→E5c-6）+ 🧪 测试场
> 详见 `CHANGELOG.md`。把 useBattle/BattleScreen 的战斗状态全迁进 `src/engine/battleReducer.js`（6/6 组：powerBank/discard/energy/leaderHp/回合机/field），抽纯函数 `combat.js`(resolveCardCombat/canCardAttack/applyCombatOutcome) + `useAITurn.js`。引擎正确性 B/C/D/F（战斗修饰符/无视守护/事件流/描述≠实现）。新增「🧪 测试场」。

---

## 进行中
（无。核心闭环都已上线、一族计数 bug 已清零。等齐齐真机实测反馈——尤其**新调的 SP 平衡手感**、深海压力/蓝鲸 AOE 战役浮字。）

---

## 已知问题
- 战斗日志 message 文本硬编码中文（100+ 条，spec 方案 A：不翻译）
- Vite dev 偶尔 504（已用 optimizeDeps.include 修复主要路径）
- preview 沙箱 HMR WebSocket 连不上 → 验证须走 `vite preview`(4174)，非 dev（浏览器跑旧模块）
- **闯关反复领 1400** 本地复刻不出确切触发点，已改「标记不可能不落盘」兜死 → 待齐齐真机验证重进那关不再发
- **深海压力 / 蓝鲸 AOE 浮字**（ch3 战役关，测试场不覆盖）→ 待齐齐战役实测眼验 banner/浮字
- **未覆盖**：Card-designer skill 需在 Claude.ai 侧手动更新（反映新 subType + SP unlockMode）；`bio-heroes-knowledge-map.md`（KP_ID+NGSS+中国课标）尚未创建

---

## 下次启动时优先

### 🔴🔴 最优先：真机实测 bug-fix 模式 —— 拿齐齐日志修 bug
**E5 架构重构已全部收官（见 CHANGELOG）。现阶段 = 齐齐真机玩、bug 逐个冒、本窗口修它们。**

**工作节奏（每个 bug）**：
1. 拿齐齐的战斗日志/复现步骤 → 定位相关模块。
2. **优先怀疑 E5 reducer 迁移动过的路径**：战斗结算（`applyCombatOutcome`/`resolveCardCombat`）、死亡收口（提交后 useEffect 扫 currentHp≤0）、`handlePostAttackSkills`（onKill/溢出/Overpower/Piercing）、`useAITurn`（**async IIFE——里面抛异常会静默 reject 卡死 AI**）、`applySkillEvents`、`battleReducer` 各 action。
3. ⭐ **复现工具**：主菜单 →「🧪 测试场（家长）」→ 门 **56** → 全卡池摆双方战场 + 满能量 + 一键开打（预置卡无召唤疲劳可立刻攻击），定点造局压路径。桌面视口更稳（`preview_resize` 1280×850）；先选己方卡（黄框=可攻击）再点敌方卡/主人。
4. **验证铁律**：`npm test`（35 套，grep+纯函数混合）+ `npm run build` + `vite preview`（4174，**不是 dev**，HMR 沙箱连不上）走测试场端到端，0 console error 才算完。
5. 每修一个独立 commit + push（main 直推，Vercel 才是齐齐实测目标）。

**⚠️ 血泪教训**：`grep 锚点测试全绿 ≠ 运行时没 bug`。E5 把变量在函数间搬来搬去，漏个 `const oppSide=` → 击杀防守方就 ReferenceError → async AI 回合被 reject 卡死。**战斗改动务必 preview 真跑「卡打卡致死 + AI 回合跑完整」**。

### 🟡 待观察 / 滚动实测
- **SP 平衡刚调完**（`a510c94`）→ 齐齐真机打几局看手感。旋钮：地板 4→5 或 offset 2→1（每费更晚一回合）、或反向松、或单独削 6 费巨兽属性（生物膜 28000 / 骨骼巨人 25000 对 6 费偏肥）。
- **一族「分子 > 分母」bug 已全库扫过、清零**，但 B/C/D/F + E 改的几十张卡数值/热路径仍在滚动实测，少见的技能/onKill/onDeath/SP 组合可能还会冒 bug。
- 每日挑战 v2（硬阵营锁约束 / 未领推送 / 更多约束·敌池·主题填充）、抽卡 Phase D/E（稀有卡分享截图 / 限时活动 banner）—— 面向产品、低优先。

---

## 关键文件（战斗引擎地图）
- **状态机** `src/hooks/useBattle.js` + `src/engine/battleReducer.js`（6 组 reducer 子树 + `battleStateRef`=useLatestRef 供异步 AI 回合读最新值）
- **纯函数** `src/engine/combat.js`（resolveCardCombat / canCardAttack / applyCombatOutcome）· `src/hooks/useAITurn.js`（AI 完整回合，async IIFE）
- **技能/状态** `src/engine/{skillRegistry,skillTemplates,statusEffects}.js` · **boss/关卡** `src/engine/{bossMechanics,stageRules}.js`
- **数据** `src/data/{cards,eventCards,spCards,campaignData,deckRules,dexSets}.js`
- **测试** `scripts/test-*.mjs`（35 套，`npm test` 统一入口）
- 架构总览见 `ARCHITECTURE.md`；历史 Sprint/决策/重构见 `CHANGELOG.md`
