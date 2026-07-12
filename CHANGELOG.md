# Bio Heroes CHANGELOG

Bio Heroes 历史 Sprint 完成记录，最新在最上。
当前进度 / 下次优先事项请看 `SESSION.md`。

---

## 引擎重构 + 真机 bug-fix（2026-07）✅
> 🔧 从「决策 / Phase」转入战斗引擎结构重构，随后齐齐开始真机实测、逐个修 bug。倒序，完整过程见 git。

**真机 bug-fix 续²：审计 6 候选对抗核实 → 修 5 真 bug + 2 守卫（2026-07-12）：**
- [x] bio_alert 主人扣 0 不判负 → 加全局 `leaderHp≤0→GAME_OVER` useEffect，系统性覆盖所有 setter 式非战斗扣血源（`39dbfea`）
- [x] 进化补齐收集成就不当场检测（徽章 3/3 灰着、领不到科学包）→ Collection 挂 `collection` 变化跑 `detectNewlyUnlocked` + 弹窗，自愈过去被静默漏检的（`14e84af`）
- [x] OCEAN/MICRO 图鉴「集齐奖励」名不副实（`rewardAchId` 误指全 BASE 卡成就）→ 建 `ocean_abyss`/`micro_battlefield` 真季成就（真 OCEAN/MICRO 卡 + 科学包）repoint + `test-dex-sets` ④b 耦合守卫（`0195fe0`）
- [x] 同批 AOE 复活撞同一空位（同一份死亡快照 → `findEmptySlot` 给整批同一槽，除首张外被 `SUMMON_CARD` 守卫静默丢弃，两张海星同批死只活一张）→ `SUMMON_CARD` 目标槽被占时回退下一个空/死槽（`10f95ef`）
- [x] 主人HP 垫片读 stale ref 绝对写覆盖同 tick delta（bio_alert 抹掉透析机同回合 +1000 回血、日志还照打「💚回血」）→ 加 `LEADER_APPLY` reducer action 让 updater 在 reducer 内对当前提交态跑、与 delta 可交换 + 回归单测（`10f95ef`）
- 降级（非 bug）：里程碑发放顺序 grant-first vs App.jsx save-first 属一致性欠账、正常玩不双领（仅 Safari 隐私模式 `localStorage.setItem` 抛异常的极端边界）
- 方法：8 视角并行审计 fan-out（因 session 额度腰斩只跑完 17/54 agent）+ 对抗式双视角核实（代码真相 + 真机可达性；有 2 条代码事实对但触发源被可达性视角纠正，如 leaderHp 覆盖真正撞的是玩家透析机而非敌方吸血卡）

**真机 bug-fix 续：8 视角审计 → 对抗核实 → 修 4 bug + banner 守卫（2026-07-11）：**
- [x] 抽卡「本期推荐」banner 永久失效：`selectBanner` 用旧 `${ch}-` 前缀匹配，关卡 key 早迁 `stage_X_Y` → 恒回落 default，齐齐从没见过推荐卡区块/+50% 角标 → 改 `stage_${ch}_`（`7509cb1`）
- [x] 关卡规则浮字全不显示：`stageRules` 的 `STAGE_RULE` 事件流进 `bossMechanicEvents`、机制在跑，但 `BattleScreen` 排空循环只认 `BOSS_*` → 补 `STAGE_RULE` 渲染分支（`d58e35e`）
- [x] 重开一局后 SP/Boss 死卡卡场：`processedDeathsRef` 死亡去重集 `startBattle` 漏重置，SP `sp_p_${id}_${i}`/Boss `boss_${id}_0` uid 确定性 → 上局死卡再死被跳过（不亡语/不进弃牌/0HP 赖场）→ `clear()`（`eb53628`）
- [x] `useAITurn` async IIFE 无 try → 中途抛错静默 reject → `aiRunning` 永卡 true 冻死 AI；改 `.catch(记日志+尽力交还玩家).finally(aiRunning 必归位)`，堵整族「async AI 边界吞异常」（`9e654e6`）
- [x] `test-gacha-banner.mjs` 守卫（22 断言，选章逻辑耦合 `campaignData` 真实 stage id，再迁 key 格式会当场炸）；36→37 套（`6d183a6`）

**真机压测跟进（2026-07-07）：**
- [x] `isImmune` 漏认技能名 → MRSA/生物膜「免疫科技系」从没生效（`6033e64`）
- [x] `no-undef` eslint 静态守卫 + `test-no-undef.mjs`，堵住 oppSide 那族「用了未定义变量」bug（`d014e3c`）

**真机 bug-fix：「分子 > 分母 / 两处总数不一致」一族清零（2026-07-05）：**
- [x] 教学毕业奖励 1400 反复领 → 加独立持久标记「先落盘再发放」（`df1b184`）
- [x] 抽卡图鉴进度 138 vs 图鉴屏 157 打架 → `dexSets.js` 建单一权威 `ALL_DEX_CARDS`/`TOTAL_DEX_CARDS`(=157)，两屏同源（`ccb351c`）
- [x] 闯关右上角 ★ 92/87（已得 > 总数）→ ① 教学同步写旧格式 `1-N` 幽灵 key 改 `stage_1_N` ② `getTotalStars` 只数当前关卡、每关封顶 3（`cd79583`）
- [x] 同根扫出另 2 处：星里程碑发奖(App.jsx) + `star_shine` 成就(achievements.js) 也内联重算星数 → 都改调 `getTotalStars`（`97c99a1`）
- [x] 收集数硬化：Collection/Gacha/Title 的 `Object.keys(collection).length` → `ownedDexCount()`（只数当前卡池内拥有、天然 ≤ 总数，防将来删卡后老存档超标）（`dc5e57d`）
- [x] 上一窗口 4 修：**AI 击杀防守方后冻结回合**（`handlePostAttackSkills` 漏定义 `oppSide` → 异步 AI 回合静默 reject，`2234ff0`）/ 闯关重进反复领 1400（`e89c324`）/ boss·关卡 updater 闭包读回 2 处（`fb5980d`）/ 答题反馈阶段（`36d7872`）

**SP 平衡重调（齐齐定「两者都做」，2026-07-05）：**
- [x] 回合门槛 `max(3,spCost−3)` → `max(4,spCost−2)`：第 1-3 回合不召任何 SP；5-6费→T4 / 7→T5 / 8→T6，第 8 回合残局仍全解锁
- [x] 7 张事件卡 `maxCost` 收口 = 本卡 `cost+3`（堵「2 费秒召 28000 生物膜 @T3」越级）；SP 属性未动（`a510c94`）

**E5 战斗引擎架构重构全系列（E1→E5c-6，2026-07-02~04）：**
- [x] 代码体检（3 子代理审引擎正确性/架构/数据）+ `ARCHITECTURE.md` + `npm test` 统一入口 + CI
- [x] 剥引擎：`combat.js` 的 `resolveCardCombat`（玩家=AI 单一真相源）+ `canCardAttack` + `applyCombatOutcome` 纯函数（可单测）
- [x] 引擎正确性 B/C/D/F：战斗修饰符 mods 折叠 / 无视守护纯谓词 / 3 事件流路由 bug / 「描述≠实现」批
- [x] E1-E5c-6：删死桩 + `useLatestRef` + `battleReducer` 6/6 组迁移（powerBank/discard/energy/leaderHp/回合机/field）+ `useAITurn.js` 独立文件
- [x] 🧪 测试场（主菜单家长门 56 进，全卡池摆双方战场 + 满能量 + 一键开打，定点测机制零抽卡运气）
- ⚠️ **教训**：E5 动大量战斗热路径，grep 测试全绿但真机才暴露运行时 bug（如 oppSide ReferenceError）→ 战斗改动务必 preview 真跑「卡打卡致死 + AI 回合跑完整」

---

## Post-Sprint 33：决策 / Phase 制开发（2026-06）✅
> 🧬 项目从「Sprint 编号」转为「决策 / Phase」驱动。以下按时间倒序，完整过程见 git。

**批 0 地基收官（决策 1/2/3/6/7，2026-06-29~30）：**
- [x] 决策1 POWER_CURVE 收成单一权威常量 + `test-power-curve.mjs` 校验（代码表==SKILL.md + 124 张生物卡全不超预算）
- [x] 决策3 gacha 爆率文档对齐引擎（deckRules.pullRate 0.70→0.68，可执行权重在 useGacha：R68/SR25/SSR5/SP2）
- [x] 决策2 进化完整性 build guard（`test-evolution-integrity.mjs`，14 个 planned evolutionTo 白名单）
- [x] 决策6 16 张 R 卡技能文案压到 ≤30 字（只压文案、不改机制 / 数值）
- [x] 决策7 147 道 legacy 纯记忆题改写成机制 · 推理题（0 露馅 + 0 撞车 + 全量人工科学 QA，legacy 概念清零）
- [x] 决策4 dex 图鉴收集追踪器框架（分包进度 + 预存进度 Endowed Progress + 集齐奖励钩子 + 分包筛选）

**题库系统升级 Phase 1（2026-06-28）：**
- [x] 新建 `quizzesGeneral.js` — 182 道不绑卡「通用题」（C2 人体 / C6 食物链 / C10 生物之最 / C12 健康习惯，各 ~45，三档难度）
- [x] `getRandomQuiz` 加 mode（只卡题 card / 任意题 any）+ 当天不重复（date-keyed localStorage）
- [x] 设置屏模式开关 + 家长门（7×8）；通用题↔卡题语义查重守卫（Jaccard<0.5）
- [x] 总池约 745 题（563 卡题 + 182 通用题）

**SP 链路 Phase A + B（2026-06-22~27）：**
- [x] Phase A：SP『打不出来』解封（回合门槛量纲修正）+ 事件卡入组 + 穷举平衡 + 门槛改看费用 + 卡面显示可召回合
- [x] Phase B：SP 自动触发定稿 — 第 8 回合「开闸」门槛 + 玩家连对 2 题 / 主人 HP≤阈值 任一软条件 OR

**Phase 2 扩卡包 OCEAN / MICRO（2026-06-22~27）：**
- [x] 三批共 24 张新卡（海洋深渊 OCEAN + 微观战场 MICRO）+ 技能引擎接线 + 配套题目，生物卡 108→124

**引擎正确性一批修复（2026-06-25~27）：**
- [x] onDeath / 死卡入弃牌堆真根因（React18 异步 dead 竞态 → 提交后 useEffect 扫场）
- [x] 干细胞复活链路收口（同批 AOE 死卡并入弃牌堆）+ 分化 SSR 改造（可靠召大 body SP）
- [x] 反击路由修复（荆棘反击 / 海葵刺打对攻击者真实 slot）+ onTurnEnd 技能分派补全（蛔虫 / 胸腺 / 造血）
- [x] 变色龙隐身 + 鲸鲨 / 骨骼巨人 / 生物膜守护失效 + 狂犬 Neural Hijack + 蓝鲸 Sonar 数值修正

---

## Sprint 33：全场景卡片详情（CardDetailModal）✅
> 🔍 一个统一弹窗管所有场景的卡片详情

- [x] CardDetailModal 加 context / ownership / isNew 支持
- [x] 战斗场上卡 + 手牌卡加 ⓘ 详情角标
- [x] GachaScreen 改用 context / ownership / isNew
- [x] Collection / DeckBuilder 迁移到统一 CardDetailModal（DeckBuilder 显示持有数量）

---

## Sprint 32：ch2 题库扩充 + 题型分级 ✅
> 📚 题库上一个台阶，题型分档

- [x] ch2 题库审计报告
- [x] 批量生成记忆 35 / 机制 36 / 推理 40 道（含重写消除「伪推理」+ 长度 / 位置 meta 模式）
- [x] 给老 180 题补 type / tags 字段
- [x] 题库校验脚本 + 完整报告（题库扩到 539 题、卡片 100% 覆盖）

---

## Sprint 31c：抽卡爽感升级 Phase B + C ✅
> 🏆 把抽卡从「事件」升级为「策略 + 学习闭环」

- [x] 抽卡 banner 跟章节进度联动 + 图鉴进度条 + 概率公示
- [x] 抽完联动 DeckBuilder 高亮新卡 + 图鉴里程碑庆祝弹窗
- [x] 抽卡中场科学小测验
- [x] 成就系统：achievements.js + Collection 成就进度栏 + 抽卡后链式弹窗

---

## Sprint 31b：抽卡爽感升级 Phase A ✅
> 🎆 视觉爽点 + isNew 卡片秀

- [x] GachaAnimation 胶囊 + 翻牌容器；R / SR / SSR / SP 各自节奏与光效
- [x] SP / SSR 全屏事件（闪光 + 震屏 + 粒子 + banner）+ isNew 卡片秀
- [x] 网格角标视觉强化 + 5 个新合成音效
- [x] SR 粒子修复 + AnimatePresence 卡死修复

---

## Sprint 31a：抽卡详情 + 教学气泡修复 ✅
> 🃏 抽卡结果可点开看详情

- [x] Bug #1：抽卡结果可点击查看完整详情
- [x] Bug #2：教学气泡 player_field / sp_area 改 bottom-32，避免遮挡 SP · 霸王龙

---

## Sprint 30b：SP 解锁链路 + Conundrum 两难关 ✅
> ✨ SP 卡解锁链路 + 关卡前两难选择

- [x] SP 卡加 unlockMode 字段 + useGacha 新增 SP 档位（排除 campaign_only）
- [x] useEconomy 加 unlockedSPs / unlockCampaignSP；Boss 通关解锁 SP + 庆祝弹窗
- [x] ConundrumModal 组件（关卡前置两难选择）+ BattleScreen 集成 effect 应用
- [x] ch2 新增 2 关（疫苗两难 + 抗生素滥用）；留尾（enemyExtraTurns + antibiotic_weakened + 星数 UI）

---

## Sprint 30a：抽卡经济重构 ✅
> 🗃️ collection 数据结构升级 + 碎片经济

- [x] collection 数据迁移 string[] → { id: count } Map
- [x] pullCards 按持有量上限判断（MAX_COPIES_PER_CARD=3）
- [x] 碎片换金币（sellFragments + sellAllUnusedFragments）+ Collection 持有量角标 + 碎片商店
- [x] 关卡编号 bug（改用数组 idx + stageNumber() 解耦）+ 抽卡黑屏 hotfix（pullCards 同步返回）

---

## Sprint 30：卡组槽 3 → 10 + 自定义命名 ✅
> 🎴 多套卡组管理

- [x] MAX_SLOTS 3→10 + name 字段 + 内联编辑 UI

---

## Sprint 29：战斗日志面板 ✅
> 📜 透明化战斗过程

- [x] 战斗日志面板 — 逐条记录伤害 / 技能 / 事件，方便排查

---

## Sprint 28：Bugfix — REVEAL_HAND UI + AI 直攻逻辑 ✅
> 🐛 两个关键 bug

- [x] Bug #1：揭示手牌浮窗停留到点击确认
- [x] Bug #2：AI 直攻逻辑 + aiPersonality 真正生效

---

## Sprint 27：打磨闭环 ✅
> ✨ 把「描述了但没生效」的技能接通

- [x] REVEAL_HAND 揭示 UI 真正接通
- [x] ENERGY_BOOST / DRAW_CARD 实际生效 + swift_boost 状态生效
- [x] Boss 机制验证 + Vite dep 预构建修复 + i18n 未翻译补齐

---

## Sprint 26：subType 重构 + 机制升级 ✅
> 🧪 生物学分类 + First-Principle 机制

- [x] subType 重构 — 方案 2 生物学分类落地
- [x] 大王乌贼机制重做（数值暴力 → First-Principle 锚点）
- [x] confused 状态升级为真正的心智操控
- [x] 诊断工具 4 张按现实功能差异化

---

## Sprint 25：扫尾收官 ✅
> 🎯 技能实装收口 + 卡文本修复

- [x] 4 个剩余技能实装完成
- [x] 18 张 scienceCard 文本修复
- [x] 4 张卡机制重做（First-Principle 锚定）
- [x] CLAUDE.md 教育哲学 section 沉淀

---

## Sprint 24：SP 卡技能全覆盖 ✅
> ✨ 17 张 SP 卡技能全部实装

- [x] 11 个 SP 卡技能通过模板复用实现
- [x] 8 个引擎扩展为新 handler 铺路 + 10 个新 SP handler 完成

---

## Sprint 23：技能模板引擎 ✅
> ⚙️ 技能系统从硬编码升级为模板 + 光环

- [x] 技能模板引擎 — 9 个基础模板覆盖 ~49 个技能
- [x] 5 个新模板覆盖 17 个技能 + 3 个引擎扩展铺路
- [x] 光环系统 — 7 个 passiveAura 技能 + 12 个 SPECIAL handler（技能注册 18 → ~130 条）

---

## Sprint 22：CLAUDE.md 重构 ✅
> 📄 精简项目指令

- [x] CLAUDE.md 重构 830 → 148 行

---

## Sprint 21：教学重构 + 闯关难度曲线 + 即时提示 ✅
> 🔧 让 7 岁小朋友能顺畅通关

**Phase A — 教学简化（5→3+2）：**
- [x] 基础教学 3 关（每关只教 1 个概念）：出牌 / 能量管理 / 技能初体验
- [x] 进阶教学 2 关（可选不阻止）：Power Bank / SP + 阵营标记
- [x] 完成 3 关基础即解锁第二章闯关
- [x] TutorialScreen 新增 📗 基础 / 📙 进阶分区 + 独立解锁逻辑
- [x] CampaignScreen 新增 basic/advanced 分区渲染 + 紫色进阶卡片

**Phase B — 难度曲线调整：**
- [x] 2-1 蛀牙军团：HP 15000→12000, AI 0.3→0.2（新手友好）
- [x] stage_2_2 食物中毒：HP 18000→15000, AI 0.35→0.25
- [x] 2-4 新冠 Boss：AI 0.6→0.4（第一个 Boss 不劝退）

**Phase C — 即时提示系统：**
- [x] BattleHints.jsx 浮窗组件 + useBattleHints hook
- [x] 7 种提示（PB / SP / 守护 / SSR / 出牌 / 跳过攻击 / 事件卡）
- [x] 一次性提示存 localStorage，4 秒自动消失
- [x] BattleScreen 集成提示触发（回合开始 / 遇到守护等）

**其他：**
- [x] campaignData.isStageUnlocked / isChapterComplete 逻辑更新
- [x] tutorialData.js 导出 BASIC_LEVELS / ADVANCED_LEVELS

---

## Sprint 20：i18n + 英文版 ✅
> 🌐 全面中英文切换

- [x] `src/i18n/LanguageContext.jsx` — React Context（t / cardName / skillName / toggleLang）
- [x] `src/i18n/zh.json` + `en.json` — 190+ 翻译键
- [x] 主菜单右上角 🌐 语言切换按钮，localStorage 持久化
- [x] 13 个组件全部 i18n 化
- [x] campaignData.js 所有章节/关卡加 `nameEn`/`descriptionEn`
- [x] deckRules.js FACTIONS/SUBTYPES/SKILLS 已有 `nameEn`
- [x] 对话翻译：62 条战前/战后对话加 `textEn`
- [x] 教学翻译：5 关全部加 `titleEn`/`introEn`/`summaryEn` + ~67 条 `step.textEn`
- [x] TutorialScreen 添加 `loc()` 辅助函数，7 处渲染位置读取英文字段
- [x] campaignData.js debug 函数包裹 `import.meta.env.DEV`
- [x] weakCard() 支持 nameEn 参数

---

## Sprint 19：闯关扩展 — 每章 +2 关 ✅
> 🏆 用新卡设计新关卡，总关卡 17 → 23

- [x] 第二章 +2 关：食物中毒危机(stage_2_2) + 蚊媒双煞(stage_2_4)
- [x] 第三章 +2 关：深海猎场(stage_3_2) + 丛林法则(stage_3_4)
- [x] 第四章 +2 关：真菌入侵(stage_4_2) + 出血热噩梦(stage_4_4)
- [x] 新关卡使用 Sprint 18 新卡作为敌方卡组
- [x] 原有关卡 ID 不变（保护玩家已有进度）
- [x] 新关卡 ID 使用 stage_X_Y 格式避免冲突
- [x] 每关含战前/战后科学对话
- [x] 特殊规则实现（stageRules.js — 蚊虫侵扰/深海压力/丛林迷雾/孢子蔓延/生物安全警报）

---

## Sprint 18：卡池扩充 — 64 张新卡 + 8 张新 SP ✅
> 🃏 基础包从 40 → 104 张生物卡，SP 从 8 → 16 张

- [x] 🌱 自然系 +16 张（plant×3, land×4, marine×4, aerial×2, micro×3）
- [x] 🧬 人体系 +16 张（blood×3, organ×4, nerve×2, structure×3, cellmech×4）
- [x] 🦠 病原系 +16 张（virus×4, bacteria×3, fungus×3, parasite×3, other×3）
- [x] ⚗️ 科技系 +16 张（medicine×3, diagnostic×3, equipment×3, genetech×4, prevention×3）
- [x] 8 张新 SP 卡（每阵营 +2，含深渊乌贼、免疫风暴、僵尸瘟疫、量子医疗等）
- [x] 稀有度分布：R×54 | SR×32 | SSR×18（104 张生物卡）
- [x] 总卡牌数：136 张（104 生物 + 16 事件 + 16 SP）

---

## Sprint 17：数据架构升级 ✅
> 🔧 给 640 张扩展铺路

- [x] 所有 40 张现有卡加 `subType`、`set: "BASE"`、`tags: []` 字段
- [x] 16 张事件卡加 `set` 和 `tags` 字段
- [x] 8 张 SP 卡加 `subType`、`set` 和 `tags` 字段
- [x] 噬菌体 subType 改为 "virus"（噬菌体是病毒）
- [x] 胃酸卡名改为 "胃·消化熔炉"（胃酸是消化液不是器官）
- [x] deckRules.js 新增 SUBTYPES 常量
- [x] DeckBuilder 新增子类型筛选下拉框
- [x] Collection 图鉴按子类型分组显示

---

## Sprint 16：闯关打磨 + Boss机制 ✅
> 🔧 Boss战完善 + AI难度 + 奖励体系

- [x] bossMechanics.js — 3 个 Boss 行为（新冠/蓝鲸/超级细菌）
- [x] AI 强度参数 aiStrength（0.3-0.8）
- [x] 攻击视觉反馈三态系统
- [x] 教学系统全面 debug（5 个卡住 bug 修复）
- [x] IntroModal 首次进入欢迎弹窗
- [x] 章节奖励（金币/钻石/SSR 券）

---

## Sprint 15：Bug修复 + 响应式适配 + 新手体验 ✅
> 🔧 全面打磨，可以给小朋友玩了

- [x] 新手体验：初始金币 500→3000 + 20 张初始卡牌礼包 + 欢迎弹窗
- [x] 存档迁移 v2→v3 自动补发（旧空收藏玩家补发金币+卡牌）
- [x] 闯关 bug 修复：2-2 bossMechanic 误标、leaderHPPercent 用 LEADER_HP 常量
- [x] `_campaignEnemy` 残留清除（闯关结束后不影响自由对战）
- [x] "自由对战"改为先跳 DeckBuilder 选卡组
- [x] DeckBuilder 按玩家 collection 过滤可用卡牌
- [x] 响应式全面完成：dvh 布局、max-w-3xl 容器、sm: 断点、触摸 44px
- [x] Tailwind v4 兼容修复：非工具类名被剥离→改用 data-* 属性选择器（12 个）
- [x] 手机横屏紧凑模式(@media max-height:500px) + 竖屏横屏提示
- [x] 敌方卡槽 aspect-ratio 与玩家侧统一(5/7)
- [x] 教学引导 UX 增强：非目标压暗 + 目标发光脉冲 + 按钮 z-index 修复
- [x] 提示框箭头改为 Framer Motion 弹跳动画
- [x] 3-4 Boss 钻石奖励调整
- [x] 4-4 终极 Boss 三星奖励：SSR 保底券（pityCounter=49，下次必出 SSR）
- [x] useEconomy 新增 useSSRTicket() + CampaignScreen 显示"SSR 保底券🎫"

---

## Sprint 14：闯关战役模式 ✅
> 🏆 4章17关（5教学 + 12闯关），剧情对话 + 科学知识 + Boss机制

- [x] campaignData.js — 4 章节 12 个战斗关卡完整配置（敌方卡组/AI 强度/对话/奖励）
- [x] CampaignScreen.jsx — 闯关地图（章节 Tab + 关卡列表 + 星数 + 锁定状态）
- [x] 关卡详情弹窗（敌方 HP/推荐阵营/星数条件/奖励/开始战斗）
- [x] DialogueBox.jsx — 战前/战后剧情对话框（角色 emoji + 气泡 + 科学知识）
- [x] 三星评价系统（通关 1 星/HP≥50% 得 2 星/HP≥80% 且 ≤10 回合得 3 星）
- [x] 闯关进度 localStorage 持久化 + 奖励发放（首通/三星）
- [x] 教学进度自动同步到战役进度
- [x] BattleScreen 支持闯关配置（自定义敌方 HP/固定卡组/对话）
- [x] useBattle.js 支持自定义敌方主人 HP
- [x] 主菜单"🏆 闯关战役"按钮 + CampaignScreen 懒加载
- [x] 第二章病原篇：蛀牙军团→流感风暴→狂犬危机→💀 新冠 Boss
- [x] 第三章生态篇：电鳗风暴→水母迷宫→虎鲸猎场→💀 蓝鲸 Boss
- [x] 第四章科技篇：耐药菌浪潮→HIV 潜伏→远古病毒觉醒→💀 超级细菌 Boss

---

## Sprint 13：教学模块 ✅
> 📚 5个渐进式教学关卡，引导新手学会所有核心玩法

- [x] TutorialScreen.jsx — 教学界面（关卡选择 + 战斗引导 + 总结）
- [x] tutorialData.js — 5 关教学数据（预设手牌/场面/步骤引导）
- [x] 关卡 1：出牌与基本战斗（能量/召唤疲劳/攻击/击败主人）
- [x] 关卡 2：技能与阵营克制（🧬 克制 🦠 +20%/技能自动触发）
- [x] 关卡 3：Power Bank 能量爆发（攒能量/打破/一波铺场）
- [x] 关卡 4：事件卡与 SP 觉醒（事件卡即时生效/SP 卡召唤）
- [x] 关卡 5：阵营标记与 SSR 出场条件（弃牌堆标记/解锁条件）
- [x] 步骤引导系统 — 半透明遮罩 + 高亮区域 + 箭头 + 文字说明
- [x] 脚本 AI — 固定行为（攻击/不动/击杀），教学流程可控
- [x] localStorage 进度记录 + 首次进入自动开始教学
- [x] 主菜单"📚 教学"按钮 + "跳过教学"功能
- [x] 毕业奖励：500 金币 + 免费十连抽
- [x] React.lazy 懒加载 TutorialScreen

---

## Sprint 12：基建 + 部署 ✅
> 👀 存档不丢、手机也能玩

- [x] GitHub 仓库创建 + 代码推送（github.com/yang44yang/bio-heroes）
- [x] vite.config.js 构建优化 — manualChunks 分离 react-vendor / framer-motion
- [x] PWA 支持 — manifest.json + service worker（cache-first 静态资源 + network-first HTML）
- [x] 应用图标 — SVG 图标（192/512），apple-mobile-web-app meta 标签
- [x] localStorage 存档版本管理 — saveVersion 字段 + migrateData 自动迁移
- [x] 存档导入/导出 — JSON 文件下载/上传，主菜单⚙️存档管理面板
- [x] 存档重置功能（带确认弹窗）
- [x] React.lazy 代码分割 — BattleScreen / GachaScreen / DeckBuilder / Collection 懒加载
- [x] Suspense 加载占位组件（🧬 动画）

---

## Sprint 11：进化系统 ✅
> 👀 卡牌进化！更强版本！

- [x] evolutions.js — 进化链数据（含羞草→捕蝇草、创可贴→青霉素→抗生素注射器）
- [x] 进化费用：R→SR 30 碎片，SR→SSR 80 碎片
- [x] useEconomy 新增 checkEvolution / evolveCard — 消耗碎片获得新卡，不失去原卡
- [x] Collection.jsx 进化链可视化区域（展开/收起详情，显示各步骤卡牌+碎片消耗）
- [x] 卡牌详情弹窗内进化链展示 + 碎片进度条
- [x] 进化按钮（碎片充足时金色高亮，不足时灰色+提示）
- [x] 进化动画特效（金色闪光爆发 + 光芒扩散 + 粒子 + 卡牌缩放旋转）
- [x] 卡牌列表可进化标记（🧬 动态图标）

---

## Sprint 10：胜负结算 + 视觉打磨 ✅
> 👀 有仪式感！

- [x] 战斗统计系统 — 跟踪总伤害/击杀/出牌/答题/SP 召唤/PB 最高/回合数
- [x] 胜负结算画面 — 金光脉动标题 + 统计数据表 + 金币奖励（含答题 bonus）
- [x] WAAPI 动画完善 — attackSequence / hurtShake / defeatSequence / powerBankBreak / spSummonFlash / eventCardFlyIn / cardPlaceAnimation
- [x] 卡牌稀有度发光 — R 蓝色, SR 紫色阴影, SSR 金色脉动边框
- [x] SP 卡金色光晕动画
- [x] 状态特效可视化 — 中毒 ☠️ 绿光, 沉睡 💤 浮动, 护盾 🛡️ 蓝罩+数值

---

## Sprint 9：抽卡经济系统 ✅
> 👀 开卡包！SSR！

- [x] useEconomy.js — 金币/钻石/收藏/碎片/保底计数，localStorage 持久化
- [x] 战斗奖励：胜利 100 金币 + 答题 bonus，失败 40 金币
- [x] GachaScreen 重写 — 单抽 100 金币 / 十连 900 金币
- [x] 十连保底至少 1 张 SR+，50 抽未出 SSR 硬保底（40 抽开始 soft pity）
- [x] 重复卡 → 碎片（R:10 / SR:20 / SSR:50）
- [x] 抽卡结果显示 NEW! 标签 / 碎片数
- [x] Collection.jsx — 卡牌图鉴（64 张全卡目录）
- [x] 收集进度条 + 阵营分布统计（4 阵营各 X/16）
- [x] 未拥有卡灰色剪影 ❓，已拥有可点击查看详情（技能+科学知识卡）
- [x] 主菜单显示货币 + 收集数，新增 📖 图鉴按钮

---

## Sprint 8：环境事件 ✅
> 👀 下暴风雨了！

- [x] events.js — 8 个环境事件（全球变暖/病毒爆发/暴风雨/森林大火/春天来了/栖息地破坏/共生效应/基因突变）
- [x] 每 3 回合玩家回合开始时自动触发，不重复最近 2 个事件
- [x] EventAlert 弹窗（大 emoji + 名称 + 效果 + 科学知识卡 + 持续时间）
- [x] 效果应用到双方场上卡牌（ATK/HP 增减、中毒、治愈等）
- [x] 持续事件指示器（顶部横幅显示剩余回合数）+ 到期自动清除
- [x] 病毒爆发特殊处理（无人体系卡→主人持续扣血）
- [x] 设计原则：调味料而非决定因素，不让任何一方直接获胜或必败

---

## Sprint 7：阵营克制视觉化 + 卡组构建器 ✅
> 👀 克制关系可见 + 自己选卡组！

- [x] 阵营克制浮字（绿色"克制！+20%" / 红色"被克制！"）玩家+AI 攻击均显示
- [x] DeckBuilder.jsx — 从卡库选 25 张主卡 + 最多 5 张 SP 卡
- [x] 筛选/排序 — 按阵营、类型(生物/事件)、费用、稀有度
- [x] 费用曲线柱状图 + 阵营分布色块
- [x] 3 个卡组槽位，localStorage 持久化保存
- [x] 推荐卡组一键生成（🧬⚗️ 人体+科技 / 🌱🦠 自然+病原）
- [x] App.jsx 路由：主菜单→卡组管理→编辑/出战→战斗
- [x] 自定义卡组直接进入战斗（主卡+SP 卡均传入）

---

## Sprint 6：事件卡 + SP觉醒卡系统 ✅
> 👀 事件卡加SP召唤！逆转战局！

- [x] eventCards.js — 16 张事件卡（四阵营各 4 张，含 4 种 SP 召唤规则）
- [x] spCards.js — 8 张 SP 觉醒卡（四阵营各 2 张，SSR 级别）
- [x] cards.js 全 40 张卡添加 `type: "character"` 字段
- [x] deckRules.js 更新：DECK_SIZE=25, MAX_FIELD_SLOTS=5, SP_DECK_SIZE=5
- [x] testDecks.js 扩展至 25 张主卡组 + SP 卡组
- [x] 事件卡出牌逻辑 — 扣能量 → 执行效果 → 进弃牌堆 → 贡献阵营标记
- [x] 6 种效果类型：buff / damage / heal / draw / energy / special
- [x] SP 召唤系统 — 4 种规则：cost_limit / spend_all_energy / faction_only / discard_check
- [x] SP 卡召唤到战场（免费，不消耗能量）+ 8 张 SP 登场效果
- [x] Card.jsx 事件卡/SP 卡视觉区分（绿底事件卡、金色 SP 卡）
- [x] 战场位维持 5 个（注：早期文档曾误记为扩展到 7，实际代码常量 `MAX_FIELD_SLOTS` 始终为 5）
- [x] SP 区域 UI + SP 召唤选择弹窗
- [x] AI 事件卡使用策略 + SP 召唤决策（20% 遗忘率）
- [x] spSummon 音效（史诗登场音）

---

## Sprint 5：音效 + 问答融入战斗 ✅
> 👀 游戏有声音了！答题有策略了！

- [x] soundManager.js — Web Audio API 合成音效（无外部文件）
- [x] 战斗音效：出牌、攻击、击杀、受伤、治愈、主人受伤
- [x] Power Bank 音效：充能蓄力音、打破爆发音
- [x] 回合/阶段音效：回合开始、阶段切换、换卡确认
- [x] 胜负音效：胜利号角、失败低鼓
- [x] 问答音效：弹出挑战音、答对上升音、答错低沉音、觉醒爆发音
- [x] 科学家模式音效：华丽上升音
- [x] 静音按钮 🔊/🔇（顶栏）
- [x] 问答触发优化：首次攻击必触发 → 之后每 3 回合触发一次
- [x] 问答连续答对 streak 显示在 UI 上（🧠×N）
- [x] 科学家模式：连续答对 3 题 → 全队 ATK +20%，持续 2 回合
- [x] 科学家模式横幅 UI（渐变动画 + 倒计时）

---

## Sprint 4：阵营标记系统（Faction Requirement）✅
> 👀 SSR 不能随便上场，得先有同阵营的战友倒下才行！

- [x] cards-v2 — 所有 40 张卡加 `factionRequirement` 字段
- [x] 6 张 SSR 有具体阵营标记需求（check / consume 两种类型）
- [x] factionMarkers.js 工具库 — 标记统计 / 条件检查 / 消耗标记
- [x] 弃牌堆追踪 — 战斗中死亡的卡 + 被替换的卡进入弃牌堆
- [x] UI：弃牌堆阵营标记显示（🌱×N 🧬×N 🦠×N ⚗️×N）
- [x] UI：手牌中不满足条件的 SSR 显示 🔒 + 半透明
- [x] AI 适配 — 出牌过滤器含阵营标记检查

---

## Sprint 3：Power Bank（能量储备）✅
> 👀 存钱罐满了，一口气出一堆高费卡！

- [x] 被动存储 — 回合结束时未用完的能量自动流入 bank
- [x] 一次性释放 — 整局可释放 1 次，bank 全加到当回合可用能量
- [x] 释放后 bank 永久破坏（不再存储）
- [x] Power Bank UI — 能量条 + 颜色渐变 + 脉冲动画 + Break 按钮
- [x] AI 策略 — 低 HP / 高存储 / 高费卡手牌时自动 break
- [x] AI 节能策略 — 场上 2+ 卡时 40% 概率跳过出牌攒 bank
- [x] 能量修正 — 每回合能量 = 回合增长（不再累加上回合剩余）

---

## Sprint 2：对战系统重写 ✅
> 👀 像真正的卡牌游戏了！

- [x] cards.js — 40 张卡牌（四大阵营各 10 张，R/SR/SSR 三档）
- [x] 重写 useBattle.js — 完整战斗状态机
- [x] 重写 BattleScreen.jsx — 战场 UI（手牌区 + 5 战场位 + 主人 HP）
- [x] 手牌系统 useHand.js — 抽牌堆 / 手牌 / 弃牌堆 / mulligan
- [x] 能量系统 — 每回合 = 回合数（上限 10），打牌扣费
- [x] 主人系统 — 30000 HP，守护优先，直攻判定
- [x] 召唤疲劳 — 出牌当回合不可攻击（迅击例外）
- [x] AI 对手 — 自动出牌 + 自动攻击 + 策略（节能/爆发/替换）
- [x] testDecks.js — 玩家 / AI 预设卡组

---

## Sprint 1：战斗动画基础 ✅
> 👀 打架有动画了！

- [x] WAAPI 攻击动画基础
- [x] HP 条动画（Framer Motion）

---

## 后续（规划中）

成就系统、可选主人、每日挑战、Phase 2 扩展包（OCEAN / MICRO）、多人对战。
