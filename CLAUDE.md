# Bio Heroes 《生物英雄传》

## 项目概述
一款龙珠Z风格的生物科学卡牌对战网页游戏。父子亲子项目。
让小朋友在对战的快感中自然吸收生物学知识——玩法本身就是在学，而不是"学完了奖励你玩"。

核心参考：Dragon Ball Card Warriors（龙珠Z卡卡罗特内置卡牌游戏）。

---

## 技术栈

### 前端
- **React 18 + Vite** — 核心框架
- **Tailwind CSS** — 样式
- **Framer Motion** — UI 动画：卡牌翻转、抽卡动画、页面转场、手牌展开/收拢
- **WAAPI (Web Animations API)** — 战斗演出：攻击序列、命中闪光、震屏效果（已替代 GSAP）
- **tsParticles** — 粒子特效：爆炸碎片、技能光效、环境事件氛围

### 后端（后期接入）
- **Supabase** — Auth + PostgreSQL + Realtime（预留多人对战）

### 部署
- **Vercel**

### 动画分工
```
Framer Motion（UI 层）→ 页面转场、卡牌翻转、手牌展开、能量条、按钮反馈
WAAPI（战斗演出层）  → 攻击序列、受伤抖动、觉醒演出、进化爆发演出
tsParticles（粒子层）→ 技能特效、爆炸碎片、环境事件粒子、能量聚集光效
```

### 性能策略
- 低端设备降级：减少粒子、简化动画
- 提供"精简模式"开关

---

## 项目结构
```
bio-heroes/
├── src/
│   ├── App.jsx                # 主入口和路由
│   ├── data/
│   │   ├── cards.js           # 卡牌数据库 — 104 张（v3，含 subType/set/tags）
│   │   ├── eventCards.js      # 事件卡数据 — 16张（四阵营各4张）
│   │   ├── spCards.js         # SP觉醒卡数据 — 16张（四阵营各4张）
│   │   ├── evolutions.js      # 进化链数据（含羞草→捕蝇草, 创可贴→青霉素→抗生素注射器）
│   │   ├── deckRules.js       # 卡组构建规则常量（DECK_SIZE=25, FIELD_SLOTS=7 等）
│   │   ├── testDecks.js       # 玩家/AI 预设卡组 + SP卡组（开发用）
│   │   ├── tutorialData.js    # 教学关卡数据（3基础+2进阶）
│   │   ├── campaignData.js    # 闯关战役数据（4章23关）
│   │   └── quizzes.js         # 问答题库（按难度分级）
│   ├── components/
│   │   ├── BattleScreen.jsx   # 战斗主界面（手牌+战场位+主人+能量+Power Bank）
│   │   ├── BattleHints.jsx    # 战斗即时提示系统（Sprint 21）
│   │   ├── Card.jsx           # 战场卡牌组件（BattleCard）
│   │   ├── CampaignScreen.jsx # 闯关战役界面
│   │   ├── TutorialScreen.jsx # 教学关卡界面
│   │   ├── DeckBuilder.jsx    # 卡组构建器
│   │   ├── Collection.jsx     # 卡牌图鉴
│   │   ├── GachaScreen.jsx    # 抽卡界面
│   │   ├── QuizModal.jsx      # 问答弹窗
│   │   └── TitleScreen.jsx    # 主菜单
│   ├── hooks/
│   │   ├── useBattle.js       # 战斗状态机（含 Power Bank + 弃牌堆 + 阵营标记）
│   │   ├── useHand.js         # 手牌管理（抽牌堆/手牌/弃牌堆/mulligan）
│   │   ├── useEconomy.js      # 金币/钻石/碎片/收藏/进化
│   │   └── useGacha.js        # 抽卡逻辑
│   ├── i18n/
│   │   ├── LanguageContext.jsx # 中英文切换 Context
│   │   ├── zh.json / en.json   # 翻译键
│   ├── audio/
│   │   └── soundManager.js    # 音效系统（Web Audio API 合成音效）
│   ├── engine/
│   │   ├── bossMechanics.js   # Boss 行为钩子（新冠/蓝鲸/超级细菌）
│   │   ├── stageRules.js      # 闯关特殊规则（蚊虫/深海/迷雾/孢子/警报）
│   │   └── statusEffects.js   # 状态效果处理（中毒/护盾/沉睡/隐身/深海压力）
│   └── utils/
│       ├── damage.js          # 伤害计算
│       └── factionMarkers.js  # 阵营标记工具（统计/检查/消耗）
├── public/
├── CLAUDE.md
├── CHANGELOG.md               # Sprint 1-21 完成记录
├── .claude/
│   ├── SESSION.md             # 当前会话状态（不跟踪 git）
│   └── rules/                 # 详细规则（按需加载）
├── package.json
└── vite.config.js
```

---

## 核心设计原则

1. **好玩优先**：先是好玩的游戏，其次才是教育工具
2. **科学准确**：卡牌数值、技能、描述基于真实科学事实
3. **龙珠精神**：收集成就感、组队策略深度、战斗觉醒爽感
4. **玩法即学习**：知识融入核心机制，不是答题奖励
5. **允许失败**：答错也有部分奖励
6. **亲子友好**：7岁能理解，大人也有策略深度
7. **中文为主**：科学名词附带英文

---

## Git 工作流

- **所有改动直接在 main 分支上工作和推送**，不创建 feature branch 或 PR
- 推送命令：`git push origin main`（如在 worktree 中则 `git push origin <branch>:main`）

---

## 重要提醒（速查）

- **属性系统**：只有 ATK + HP，没有 DEF 和 SPD
- **费用 ≠ 稀有度**：两个独立维度，绝不混淆
- **同一张卡 = 完整卡名相同**，同名最多 3 张
- **召唤疲劳**：打出当回合不能攻击（迅击例外）
- **攻击互扣**：打对方卡时双方同时扣 HP
- **守护优先**：有 Guard 卡必须先打
- **技能越强 → ATK/HP 越低**
- 生成新卡必须附科学知识
- React (JSX) + Tailwind CSS
- 战斗动画用 WAAPI（不用 GSAP）
- 中文为主
- 低端设备提供精简模式

---

## Session 交接规则

- **结束会话**（触发词「更新状态」）：更新 `.claude/SESSION.md`，按模板记录 最近完成 / 进行中 / 已知问题 / 下次启动时优先 / 关键文件变更
- **开始会话**（触发词「读取状态」/「继续上次工作」）：先读 `.claude/SESSION.md` 了解上次进度
- 历史 Sprint 记录见 `CHANGELOG.md`（所有完成过的 Sprint 都在那里）

---

## 详细规则索引

详细规则按主题拆分在 `.claude/rules/` 目录，Claude Code 在需要时自行读取对应文件：

- `.claude/rules/card-system.md` — 卡牌类型/属性/阵营/SubType/Set/版本
- `.claude/rules/cost-rarity-skills.md` — 费用、稀有度、技能系统、数值平衡
- `.claude/rules/battle-system.md` — 卡库/卡组/对战流程/能量/SP 觉醒
- `.claude/rules/factions-events.md` — 阵营克制/同系协同/环境事件/问答
- `.claude/rules/gacha-cards.md` — 抽卡经济/已有卡牌清单

修改相关功能前，先读对应规则文件。
