# Bio Heroes Session State
> 更新时间: 2026-04-18（Sprint 28 完成）

## 项目位置
- **实际路径**: `/Users/yangyang_macair15/Projects/bio-heroes/`
- **GitHub**: github.com/yang44yang/bio-heroes (main 分支)

---

## 最近完成

### Sprint 28: Bugfix — REVEAL_HAND UI + AI 直攻逻辑 ✅
- **Bug #1 揭示手牌浮窗停留太短**：
  - 4 秒 setTimeout 对 7 岁玩家读 4-8 张卡根本不够
  - 修复：玩家触发→点"我看好了 ✓"按钮确认；AI 触发→3 秒自动消失
  - useBattle 新增 `evt._initiatorSide` 标注；BattleScreen 按 initiator 分支处理
  - 中英文双语支持
- **Bug #2 AI 永远不直攻主人**：
  - 18 个关卡配了 `aiPersonality` 但代码完全没读（场上 1 张卡 = 主人永不扣血）
  - 根因：App.jsx 构建 `_campaignEnemy` 时漏传 aiPersonality 字段
  - 修复：补传字段 + BattleScreen 新增 T3 直攻决策层
    - aggressive: 35%（主人残血时提高到 50/70%，一击秒 95%）
    - balanced: 10%（一击秒 80%）
    - defensive: 0%（一击秒 60%）
    - 教学关默认 defensive 不打扰教学
  - 模拟验证 1000 次采样率全部匹配预期

### Sprint 27: 打磨闭环 ✅
- **Step 1 REVEAL_HAND UI**：useBattle 新增 handsRef + setHandRefs API；BattleScreen 弹出阵营图标/卡名/费用/稀有度浮窗；4 处 onPlay 注入 playerHand/enemyHand/discardPile/turn
- **Step 2 ENERGY_BOOST / DRAW_CARD 真正生效**：ENERGY_BOOST setPlayerEnergy；新增 DRAW_CARD event 调用 handsRef.drawCards
- **Step 3 swift_boost 跳过召唤疲劳**：4 处 hasSwift 检查统一升级（Swift Attack + Silent Dive + swift_boost status）
- **Step 4 Boss 机制验证**：3 个 Boss 全部 unit-test 通过 + 修复 Vite dep 504 错误（`optimizeDeps.include: ['react-dom', ...]`）
- **Step 5 i18n 补齐**：formatReward 支持 lang 参数（SSR Ticket 中英切换）

### Sprint 26: subType 重构 + 机制升级 ✅
- subType 自然系 5→8 / 人体系 5→9（生物学分类）
- 52 卡 + 8 SP 迁移；栖息地信息迁到 tags
- 大王乌贼重做（2 触手选 ATK 最高各 5000 + Abyssal Eye vs 最高 HP ×1.5）
- confused 状态真正生效（心智操控，攻击者改打随机友方 + 🧠 视觉）
- 诊断工具 4 张差异化（体温计清 buff/听诊器补循环呼吸/血检标记病原/显微镜打微生物）

### Sprint 25: 扫尾收官 ✅
- 4 个剩余技能 + 18 张 scienceCard 文本精炼 + 4 张机制 First-Principle 锚定
- CLAUDE.md 教育哲学 section（第一性原理 / 卡牌 5 问 / 三标签系统 / scienceCard 写作）

### Sprint 24: SP 卡技能 ✅
- 11 个 SP 模板复用 + 8 个引擎扩展 + 10 个新 handler = 21 技能全覆盖

### Sprint 23: 技能模板引擎 ✅
- 15 个模板 + 12 个 SPECIAL handler，覆盖 ~90 个核心技能

---

## 累计战果（Sprint 23-28，6 个 Sprint）

| 维度 | 数字 |
|------|------|
| 实现技能 | ~113 个（接近 100%）|
| 新模板函数 | 15+ 个 |
| 引擎扩展 | 14 个 event type / status type |
| scienceCard 修复 | 18 张 |
| 机制重做（First-Principle 锚定）| 8 张卡 |
| subType 重构 | 52 卡 + 8 SP |
| 闭环打磨（Sprint 27）| 5 个简化实现全部生效 |
| Bugfix（Sprint 28）| 2 个实测 bug |

---

## 进行中
（无 — Sprint 28 已完成，等下次规划）

---

## 已知问题

### 小问题
- 战斗日志 message 文本全是硬编码中文（100+ 条，spec 方案 A：不翻译，ROI 低）
- Vite dev 服务器需要 clean cache 时偶尔 504（已用 optimizeDeps.include 修复主要路径）

### 未覆盖功能
- 深度战役测试：Sprint 23-28 的改动在真实对战中可能有边缘 bug 没有实战暴露
- Card-designer skill 在 Claude.ai 侧需要手动更新以反映 Sprint 26 的新 subType 规则
- bio-heroes-knowledge-map.md（KP_ID + NGSS + 中国课标对应表）尚未创建

---

## 下次启动时优先

### 推荐方向 A：齐齐实测反馈循环（最高优先级）
1. **齐齐玩各关卡，我记 bug**：Sprint 23-28 改动大，需要实战暴露的 bug（类似 Sprint 28 那样）
2. **Boss 战实战测试**：3 个 Boss（新冠/蓝鲸/超级细菌）unit-test 通过但没走完整战斗
3. **aiPersonality 体感**：aggressive 关是不是真的"紧张"？defensive 关是不是真的"保守"？数值还要再调吗？

### 推荐方向 B：新功能
4. **成就系统** — 收集/战斗/答题三类勋章
5. **可选主人** — 生物学家/医生/猎人三种被动
6. **每日挑战** — 每天随机关卡 + 限定规则

### 推荐方向 C：卡池扩展（中长期）
7. **Phase 2 扩展包**（~160 张新卡，5-6 sprint）：
   - OCEAN（海洋深渊）~80 张
   - MICRO（微观战场）~80 张
8. **进化链扩展** — 当前 2 条 → 10+ 条

### 推荐方向 D：社交
9. **多人对战** — Supabase Realtime
10. **卡组分享** — 导入/导出 deck code

### 推荐方向 E：工程支撑
11. **card-designer skill 更新**（在 Claude.ai 侧）— 反映新 subType + 新模板
12. **bio-heroes-knowledge-map.md** — KP_ID + NGSS + 中国课标对应表

---

## 关键文件变更（Sprint 23-28 汇总）

### 核心引擎
- `src/engine/skillRegistry.js` — 从 18 条 → ~130 条注册（~1100 行）
- `src/engine/skillTemplates.js` — 新建，15+ 模板 + 4 passiveAura helpers（~1200 行）
- `src/engine/skillTriggers.js` — 支持多 timing 数组
- `src/engine/statusEffects.js` — 新增 swift_boost / herd_immunity / marked / confused / ecosystem_shelter
- `src/engine/stageRules.js` — 深海压力适配 subType 重构

### 核心数据
- `src/data/cards.js` — 52 张卡 subType 迁移 + 18 张 scienceCard 修复 + 4 张机制重做
- `src/data/spCards.js` — 8 张 SP subType 迁移 + 大王乌贼机制重做 + 世界树时限
- `src/data/eventCards.js` / `events.js` — 4 张 scienceCard 修复
- `src/data/deckRules.js` — SUBTYPES 重构（自然系 5→8，人体系 5→9）

### UI / Hooks
- `src/hooks/useBattle.js` — applySkillEvents 14 新 event type + side 参数 + handsRef/setHandRefs API + confused 攻击转向 + 光环检查 + ENERGY_BOOST/DRAW_CARD 实际生效 + REVEAL_HAND 标注 initiator
- `src/utils/damage.js` — 光环检查 + Drug Immunity + checkHerdImmunity + markBonus
- `src/components/Card.jsx` — 🧠 confused 视觉
- `src/components/BattleScreen.jsx` — swift_boost 跳过召唤疲劳 + REVEAL_HAND 浮窗 + AI 直攻决策层（aiPersonality）
- `src/App.jsx` — _campaignEnemy 传递 aiPersonality

### 配置 / 文档
- `vite.config.js` — optimizeDeps.include 修复 504 dep
- `CLAUDE.md` — +32 行教育哲学 section
