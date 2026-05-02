# Bio Heroes Session State
> 更新时间: 2026-05-02（Sprint 30b 留尾完成 + 实测 bug 5 连修）

## 项目位置
- **实际路径**: `/Users/yangyang_macair15/Projects/bio-heroes/`
- **GitHub**: github.com/yang44yang/bio-heroes (main 分支)
- **工作流**: 直接在 main 工作和 push，不开 feature branch（详见 memory `feedback_git_workflow.md`）

---

## 最近完成

### 2026-05-02 实测 bug 5 连修 + Sprint 30b 留尾完成 ✅
齐齐 iPad 实测报 bug，逐个排查修复：

- **Bug A (锁链断裂)**: 老存档 ch2/ch3 中间关卡被锁，后面关卡却开。
  根因：Sprint 19 在已通关老 ID 间插入新 ID，新关 0 星 → 老关 prev 检查失败。
  修：`isStageUnlocked` 加"本关已有星就放行"防御逻辑。
- **Bug B (章节 tab 锁)**: 老玩家进 ch2 后 ch3 仍锁。
  根因：章节 tab 用 `isChapterComplete`（每关满星）→ 新关 0 星永远不满。
  修：章节 tab 用"第一关可解锁"判定（复用 isStageUnlocked）。
- **Bug C (AI 不出牌)**: 疫苗两难 / 抗生素滥用 + 4-2/stage_4_4/4-4 共 5 关 AI 卡死手牌。
  根因：smallpox_ghost (c7+pathogen 2) / hiv_hunter (c4+body 1, 但敌组无 body) 等
  factionRequirement 永远凑不齐。低费过少 → AI 早期手牌全废。
  修：写审计脚本 `src/data/cards × campaignData` 扫所有 18 关，重平衡 5 关敌方牌组。
- **Bug D (假满星)**: 没玩过的关卡显示 ⭐⭐⭐ 都是黄的。
  根因：emoji ⭐ 颜色由系统字体决定，CSS `text-gray-700` 对 emoji 无效。
  修：未得星用 `filter: grayscale(1) brightness(0.4)` + `opacity: 0.5`。
- **Bug E (Conundrum 留尾)**: enemyExtraTurns / antibiotic_weakened 仅文字未生效。
  实现：
  - `preplaceEnemyCards: ['flu_virus', 'flu_virus']` → startBattle 预置敌方场上单位
    （不加召唤疲劳，可立刻攻击）。修了起手敌方出牌覆盖预置卡的隐藏 bug。
  - `globalEffectsRef` + makeFieldCard 检查 `tags.includes('antibiotic')` → ATK 砍半。
  - leader maxHP 显示加 conundrum bonus 修正。

### Sprint 30b: SP 双系统 + ch2 Conundrum 新关 ✅（7 step + hotfix）
- **Step 1 SP unlockMode**: 14 张 'gacha' / 2 张 'campaign_only'（sp_vaccine_shield 2-4, sp_quantum_healer 4-4）
- **Step 2 SP 抽卡档位**: 2% 基础概率（齐齐反馈"抽不到 SP" → 修），SP 池排除 campaign_only，重置 pity，_gachaSlot 标记
- **Step 3 useEconomy.unlockedSPs + unlockCampaignSP**: 通关解锁列表（幂等）
- **Step 4 SpUnlockModal + Boss 触发**: App.SP_UNLOCK_MAP，handleExitBattle 在 won 时检查并触发庆祝弹窗
- **Step 5 ConundrumModal**: 两段式 UI（选项 → 后果+科学），中英文双语，localStorage 记录选择
- **Step 6 BattleScreen 集成**: conundrumPending 阻塞 init，effect 应用 playerLeaderHpBonus / enemyLeaderHpBonus / playerStartingBonus / playerStartingHandBonus；useHand 加 addToHand；useBattle.startBattle 加 playerLeaderHP 入参
- **Step 7 ch2 +2 关**:
  - stage_2_7_vaccine_dilemma 疫苗两难（22000 HP，3 选项含真实公共卫生伦理）
  - stage_2_8_antibiotic_abuse 抗生素滥用（24000 HP，3 选项含 WHO Antibiotic Stewardship）
  - ch2 stages 6 → 8，BOSS 自动后移
- **Hotfix Conundrum 链路**（3 bug 连锁）:
  1. CampaignScreen.handleStartStage 漏传 conundrum 字段
  2. App._campaignEnemy 漏传 conundrum 字段
  3. ConundrumModal AnimatePresence mode="wait" exit 卡死（同 Sprint 30a 抽卡 bug）→ 拆掉

### Sprint 30a: 卡片持有量系统 + 关卡编号修复 ✅
- **Step 1 collection 数据迁移**: `string[]` → `{ cardId: count }` Map
  - saveManager SAVE_VERSION 3→4，新增 v3→v4 迁移（向后兼容，老玩家数据全保留）
  - 4 个组件 13 处调用点适配（Collection / Gacha / DeckBuilder / TitleScreen）
- **Step 2 持有量上限**: MAX_COPIES_PER_CARD = 3（与卡组同名上限对齐）
  - pullCards 按持有量判断：未达上限 → 入库 +1；达上限 → 转碎片
- **Step 3 碎片商店**: sellFragments / sellAllUnusedFragments
  - 1 碎片 = 2 金币；批量卖光无进化路径的碎片，含进化的（含羞草/创可贴）保留
- **Step 4 Collection.jsx UI**: ×N 角标（已齐 = 绿 ×3 ✓）+ 详情弹窗碎片商店 + 顶部 💰 批量卖按钮
- **Step 5 关卡编号**: CampaignScreen 用 `stageNumber()` 解耦显示号 vs 数组 idx
  - 排除 boss/tutorial 单独编号，未来加任何形态章节都不影响
- **Hotfix 抽卡黑屏**（双 bug 连锁）:
  1. pullCards `setState(updater)` 内赋值再 return，React 18 + StrictMode 时机不可靠 → 返回 undefined → 组件崩溃
  2. AnimatePresence `mode="wait"` 在 pulling→results 切换时 exit 卡死
  - 修复：pullCards 用 stateRef 同步算结果；拆掉 AnimatePresence 改普通互斥渲染

### Sprint 30: 卡组槽 3 → 10 + 自定义命名 ✅
- MAX_SLOTS 3→10；loadDecks 兼容旧存档（pad 到 10 槽）
- slot 加 name 字段；点击名字内联编辑（Enter/失焦保存，Esc 取消，maxLength 20）
- 空槽不可改名；重新存卡保留已有 name

### Sprint 29: 战斗日志面板 ✅
- 新建 BattleLogPanel 组件，9 类日志分色（回合/攻击/克制/技能/状态/死亡/出牌/PB/info）
- BattleScreen 顶部 📜 按钮打开；自动滚到最底；点击空白/× 关闭
- 修复齐齐实测 bug：原日志区太小看不清、回合切换后丢失、技能/克制信息流失

### Sprint 28: Bugfix — REVEAL_HAND UI + AI 直攻逻辑 ✅
- **Bug #1 揭示手牌浮窗停留太短**：玩家触发→点"我看好了 ✓"按钮确认；AI 触发→3 秒自动消失
- **Bug #2 AI 永远不直攻主人**：aiPersonality 字段 App.jsx 漏传 + BattleScreen 新增 T3 直攻决策层
  - aggressive 35%（残血 50/70%，一击秒 95%）/ balanced 10%（一击秒 80%）/ defensive 0%（一击秒 60%）

### Sprint 27: 打磨闭环 ✅
- REVEAL_HAND UI / ENERGY_BOOST / DRAW_CARD / swift_boost / Boss 机制验证 / i18n 补齐

### Sprint 26: subType 重构 + 机制升级 ✅
- subType 自然系 5→8 / 人体系 5→9（生物学分类）；52 卡 + 8 SP 迁移
- 大王乌贼 / confused 状态 / 诊断工具 4 张差异化

### Sprint 25: 扫尾收官 ✅
- 4 个剩余技能 + 18 张 scienceCard 文本精炼 + 4 张机制 First-Principle 锚定
- CLAUDE.md 教育哲学 section

### Sprint 24: SP 卡技能 ✅
- 21 SP 技能全覆盖（11 模板复用 + 8 引擎扩展 + 10 新 handler）

### Sprint 23: 技能模板引擎 ✅
- 15 模板 + 12 SPECIAL handler，覆盖 ~90 个核心技能

---

## 累计战果（Sprint 23-30b + 实测修复，9 个 Sprint + 5 bug）

| 维度 | 数字 |
|------|------|
| 实现技能 | ~113 个（接近 100%）|
| 新模板函数 | 15+ 个 |
| 引擎扩展 | 14 个 event type / status type + globalEffects |
| scienceCard 修复 | 18 张 |
| 机制重做（First-Principle 锚定）| 8 张卡 |
| subType 重构 | 52 卡 + 8 SP |
| 战斗日志面板 | 9 类分色（Sprint 29）|
| 卡组槽系统 | 3→10 + 自定义命名（Sprint 30）|
| 卡片持有量系统 | MAX=3 + 碎片商店（Sprint 30a）|
| SP 双系统 | gacha 2% + Boss 解锁（Sprint 30b）|
| Conundrum 关卡 | 2 个 + 真实 effect 应用（HP/起手卡/预置敌方/抗生素减伤）|
| 敌方牌组审计 | 18 关全扫，修 5 关 AI 卡死 |
| Bugfix 实测 | 11 个 |

---

## 进行中
（无 — Sprint 30b 已完成，等下次规划）

---

## 已知问题

### 小问题
- 战斗日志 message 文本硬编码中文（100+ 条，spec 方案 A：不翻译）
- Vite dev 偶尔 504（已用 optimizeDeps.include 修复主要路径）
- ~~Conundrum effect enemyExtraTurns / antibiotic_weakened 未生效~~ ✅ 已修
- ~~星数 UI 显示满星~~ ✅ 已修

### 未覆盖功能
- 深度战役测试：Sprint 23-30b 的改动需要实战暴露 bug
- Card-designer skill 需在 Claude.ai 侧手动更新（反映 Sprint 26 新 subType + 30b SP unlockMode）
- bio-heroes-knowledge-map.md（KP_ID + NGSS + 中国课标对应表）尚未创建
- ch3 Boss SP（sp_gaia_restoration 地球生态复原）未设计 — 当前 ch3 Boss 通关无 SP 解锁

### 遗留数据层问题
- 关卡 ID 数据层仍混用 `stage_2_2` vs `2-2` vs `stage_2_7_vaccine_dilemma`（UI 已用 stageNumber 解耦）

---

## 下次启动时优先

### 推荐方向 A：齐齐持续实测反馈（永远最高优先级）
- 现在游戏内容已全面就绪 + 实测发现的 5 个 bug 都修了
- 让齐齐刷新 → 重玩各章节 → 验证：
  - 疫苗两难 / 抗生素滥用：Conundrum 三选一是否有思考价值？
  - 选 C 后真的看到 2 个病毒在敌方场上吗？
  - 选 A 后青霉素真的只造一半伤害吗？
  - SP 抽卡 2% 连抽 50 次能不能至少抽到 1 张 SP？
  - Boss 通关 SP 解锁庆祝有没有仪式感？

### 推荐方向 B：扩展 Conundrum 内容（最有教育价值）
ch2 模板验证 OK 之后，复制扩展：
- **ch3 加 2 个 Conundrum 关**：生态危机主题（如"该不该砍这片森林？"、"濒危物种 vs 经济发展"）
- **ch4 加 2 个 Conundrum 关**：科技伦理（如"基因编辑要不要做？"、"AI 诊断 vs 医生诊断"）
- 每章 Conundrum 是高 ROI 教育内容，开发成本低

### 推荐方向 C：完整化 SP 系统
- **ch3 Boss SP 设计**：sp_gaia_restoration 地球生态复原 + ch3 Boss 通关解锁
- 当前 ch3 Boss 通关无 SP 解锁是个空洞 — 蓝鲸 Boss 应该有专属 SP

### 推荐方向 D：新功能
- 成就系统（收集/战斗/答题三类勋章）— 给齐齐目标感
- 可选主人（生物学家/医生/猎人三种被动）— 增加玩法多样性
- 每日挑战 — 让齐齐每天有理由打开游戏

### 推荐方向 E：卡池扩展（中长期）
- Phase 2 扩展包 ~160 张（OCEAN 海洋深渊 + MICRO 微观战场）
- 进化链扩展（2 → 10+）

### 推荐方向 F：工程支撑
- card-designer skill 更新（Claude.ai 侧）
- bio-heroes-knowledge-map.md（KP_ID + NGSS + 中国课标）

---

## 关键文件变更（Sprint 29-30b）

### Sprint 29
- `src/components/BattleLogPanel.jsx` — 新建
- `src/components/BattleScreen.jsx` — 集成 📜 按钮 + 面板渲染

### Sprint 30
- `src/components/DeckBuilder.jsx` — MAX_SLOTS 3→10 + name 字段 + 内联编辑 UI

### Sprint 30a
- `src/hooks/useEconomy.js` — pullCards 持有量判断 + sellFragments + sellAllUnusedFragments + stateRef 同步返回
- `src/utils/saveManager.js` — SAVE_VERSION 3→4 + migrateV3ToV4（collection 数组→Map）
- `src/components/Collection.jsx` — ×N 角标 + 详情弹窗碎片商店 + 批量卖按钮
- `src/components/GachaScreen.jsx` — 适配新 collection 形状 + 拆掉 AnimatePresence mode=wait
- `src/components/DeckBuilder.jsx` — collection 读取从数组改对象
- `src/components/TitleScreen.jsx` — collection 计数用 Object.keys
- `src/components/CampaignScreen.jsx` — stageNumber() 解耦显示号

### Sprint 30b
- `src/data/spCards.js` — 16 张 SP 全部加 unlockMode（14 gacha + 2 campaign_only）
- `src/hooks/useGacha.js` — SP 档位 2% + gachaSpCards 池 + _gachaSlot 标记
- `src/hooks/useEconomy.js` — unlockedSPs + unlockCampaignSP
- `src/hooks/useHand.js` — addToHand（Conundrum bonus 用）
- `src/hooks/useBattle.js` — startBattle 加 playerLeaderHP 入参
- `src/components/SpUnlockModal.jsx` — 新建（Boss 解锁庆祝）
- `src/components/ConundrumModal.jsx` — 新建（两段式选项+后果 UI）
- `src/components/BattleScreen.jsx` — Conundrum 集成 + effect 应用
- `src/components/CampaignScreen.jsx` — handleStartStage 传 conundrum
- `src/data/campaignData.js` — ch2 +2 关含完整 Conundrum 数据
- `src/App.jsx` — SP_UNLOCK_MAP + handleExitBattle 触发解锁 + SpUnlockModal 渲染 + _campaignEnemy 加 conundrum

---

## 关键文件变更（Sprint 23-28，历史）

### 核心引擎
- `src/engine/skillRegistry.js` — 18 → ~130 条注册（~1100 行）
- `src/engine/skillTemplates.js` — 新建，15+ 模板 + 4 passiveAura helpers（~1200 行）
- `src/engine/skillTriggers.js` — 支持多 timing 数组
- `src/engine/statusEffects.js` — swift_boost / herd_immunity / marked / confused / ecosystem_shelter
- `src/engine/stageRules.js` — 深海压力适配 subType 重构

### 核心数据
- `src/data/cards.js` — 52 张 subType 迁移 + 18 张 scienceCard 修复 + 4 张机制重做
- `src/data/spCards.js` — 8 张 SP subType 迁移 + 大王乌贼机制重做
- `src/data/deckRules.js` — SUBTYPES 重构（自然系 5→8，人体系 5→9）

### UI / Hooks
- `src/hooks/useBattle.js` — 14 新 event type + side 参数 + handsRef API + confused 攻击转向
- `src/utils/damage.js` — 光环 + Drug Immunity + checkHerdImmunity + markBonus
- `src/components/Card.jsx` — 🧠 confused 视觉
- `src/components/BattleScreen.jsx` — swift_boost + REVEAL_HAND 浮窗 + AI 直攻决策层
- `src/App.jsx` — aiPersonality 传递

### 配置 / 文档
- `vite.config.js` — optimizeDeps.include 修复 504 dep
- `CLAUDE.md` — 教育哲学 section（第一性原理 / 卡牌 5 问 / 三标签）
