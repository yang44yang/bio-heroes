# Bio Heroes Session State
> 更新时间: 2026-07-13（**特性 + 内容扩建模式**。9 个真机 bug 清完后转入：补齐测试盲区 → 上 GitHub Actions CI 门禁 → 做 feature/内容。本弧线完成：pickAiTarget 抽纯函数 + 每日挑战 v2 扩池 + Leitner 间隔复习 + 题库审核并扩容 745→805。全 41 套测试绿 + CI 绿、全推 main。）
>
> ⚠️ **本文件只留「活的交接」**——历史阶段（Sprint 1-33 + 决策/Phase + 引擎重构 + 真机 bug-fix + 本轮特性/内容扩建）已归档到 `CHANGELOG.md`，逐 commit 细节在 git。别再让它膨胀（精简纪律见 CLAUDE.md）。

## 项目位置
- **实际路径**: `/Users/YangYANG/Projects/Bio-heroes/`（Mac mini）
- **GitHub**: github.com/yang44yang/bio-heroes (main 分支)
- **工作流**: 直接在 main 工作和 push，每次 commit 后立即 push（Vercel 部署版才是齐齐实测目标）
- **CI**: `.github/workflows/ci.yml` —— push/PR 到 main 跑 lint→test→build 门禁（改 workflow 文件需令牌带 `workflow` scope）

---

## 最近完成

### 2026-07-13 题库审核 + 扩容 745→805
先建「防太相近」守卫，再用「过量生成→对抗核实→确定性过滤→人工审阅」流程扩题。
- **审核工具 + CI 门禁** `200044b`：`audit-quiz-similarity.mjs`（手动细审，阈值可调）+ `test-quiz-similarity.mjs`（门禁，任两题中文 bigram-Jaccard ≥0.70 即红）。现状 0 精确重复。
- **通用题扩池 +60** `8430089`+`be7b5dc`：补齐此前空缺的 **pathogen/tech 两阵营通用题 0→各 30**（body/nature 各 90/92）。通用题 182→242、总题库 745→**805**。
- **差异化 3 对跨卡重叠** `0e223d3`：同知识点各问一次 → 改成互补两知识点。0.55 阈值下近似对 3→0，题库现零重叠。

### 2026-07-12 三系统升级 + 测试盲区补齐 + CI 上线
- **Leitner 间隔复习** `847de6a`：问答按掌握度个性化复习（5 盒 1/2/3/5/8 天）；`quizLeitner.js` + 选题优先到期 + Collection 复习进度可见。
- **每日挑战 v2 扩池** `89178da`：纯数据零引擎改动（THEMES/敌阵/约束扩容 + 轮换新鲜度）。组合空间 192→1120。
- **pickAiTarget** `5913210`：AI 选靶抽纯函数（rng 可注入）+ 33 断言五级选靶测试。
- **statusEffects.js 单测** `9f63e57`（55 断言）+ **CI 上线** `83efcf1`。测试套 36→**41**。

> 07-11/07-12 的 9 个真机 bug 修复批（banner/浮字/死卡/AI冻结/判负/成就/奖励轨/AOE复活/HP覆盖）+ E5 引擎重构 —— 均见 `CHANGELOG.md`。

---

## 进行中
（无。特性/内容弧线收官。等齐齐真机实测反馈——尤其新 SP 平衡、每日挑战 v2 手感、Leitner 复习节奏。）

---

## 已知问题
- 战斗日志硬编码中文（~240 条，spec 方案 A 不译；英文模式战斗日志仍中文）
- Vite dev 偶尔 504（optimizeDeps.include 已修主要路径）；preview 沙箱 HMR 连不上 → 验证走 `vite preview`(4174) 非 dev
- **未覆盖**：Card-designer skill 需 Claude.ai 侧手动更新（新 subType + SP unlockMode）；`bio-heroes-knowledge-map.md` 未创建
- 里程碑发放顺序 grant-first vs App.jsx save-first（一致性欠账，正常玩不双领；仅 Safari 隐私模式 localStorage 写失败极端边界）

---

## 下次启动时优先

### 🚀 S1 海洋深渊季（feature 线最后一条，引擎全就绪只差补卡）
每日挑战池 + dex 奖励轨（`ocean_abyss` 成就）+ OCEAN 卡引擎都已就绪，只差补 OCEAN 卡内容（现 11 张→~20）。用 `bio-heroes-card-designer` skill，最好拉齐齐一起脑暴生物。第一刀 = 按费用曲线空档补 R 廉价卡。

### 🧠 继续扩题库（如需）
沿用本轮流程：并行 workflow 按子主题过量生成 → 独立 agent 核准确性/7岁可读 → `node scripts/audit-quiz-similarity.mjs` 查重 → 审阅页确认 → 入库。CI 的 `test-quiz-similarity` 会兜住撞车。当前 pathogen/tech 各 30、body/nature 各 90+，可继续往 pathogen/tech 补或开新 category。

### 🔴 或继续真机实测 bug-fix
拿齐齐日志修，优先怀疑 E5 reducer 迁移动过的路径。**验证铁律**：`npm test`（41 套）+ `npm run build` + `vite preview`(4174 非 dev) 端到端 0 console error。测试场：主菜单→🧪 测试场（家长门 56）。

---

## 关键文件
- **战斗引擎**：`src/hooks/useBattle.js` + `src/engine/battleReducer.js`（含 `LEADER_APPLY`）· `src/engine/combat.js` · `src/hooks/useAITurn.js` + `src/engine/aiTarget.js`（选靶纯函数）· `src/engine/{skillRegistry,skillTemplates,statusEffects,bossMechanics,stageRules}.js`
- **数据**：`src/data/{cards,eventCards,spCards,campaignData,deckRules,dexSets,gachaBanners,achievements,dailyChallenges}.js`
- **问答**：`src/data/{quizzes(563卡题),quizzesGeneral(242通用题),quizLeitner}.js` —— 总 **805 题**，Leitner 间隔复习
- **测试**：`scripts/test-*.mjs`（**41 套**，`npm test` 入口）+ `scripts/audit-quiz-similarity.mjs`（信息性细审）
- **CI**：`.github/workflows/ci.yml`
- 架构总览 `ARCHITECTURE.md`；历史 Sprint/决策/重构/bug-fix/特性 见 `CHANGELOG.md`
