# Bio Heroes Session State
> 更新时间: 2026-06-23（**SP 链路一条龙**：①「打不出来」解封（`spCost≤turn`量纲错配→门槛）→ ②DeckBuilder 加事件卡支持（"可触发SP"事件卡能入组，自建卡组才触发得了 SP）→ ③事件×SP 全组合穷举(98/204)+平衡诊断+修死规则（发烧反应 maxCost4→5）→ **④召唤门槛改"看费用" `turn≥max(3,spCost−3)`（小SP照常T3、大SP推迟T4-7）+ SP 卡面/详情显示"第N回合起可召"** ——🟠"2费秒巨兽"超模已解。🟡tech 阵营弱 2.8 倍仍待定。Phase B（三条触发：答对2题/HP≤50%/第8回合）齐齐定「先A后B」待排期。前序：三连修 a6bf0cb；Phase 2 第二批 8 张）
> 历史更新时间: 2026-06-22 续⁵（**Phase 2 扩卡第二批 8 张**（OCEAN/MICRO：安康鱼/抹香鲸/小丑鱼/海星/帝企鹅/黏菌/硅藻/水熊虫）+ 16 技能 + 24 题，design→五维对抗验证→综合 workflow 产出；卡 108→116、题 515→539、149/149 卡全有题。另：onTurnStart 死技能 + FIELD_SLOTS 文档两任务已接回 main。⚠️验证揭示 3 个既有引擎 bug 已 spawn。前序同日：能量主线首批 4 张 / 题库封顶 / trivia 升级 / 老题精分类 / onDeath 路由）

## 项目位置
- **实际路径**: `/Users/YangYANG/projects/bio-heroes/`（Mac mini）
- **GitHub**: github.com/yang44yang/bio-heroes (main 分支)
- **工作流**: 直接在 main 工作和 push，每次 commit 后立即 push（Vercel 部署版才是齐齐实测目标）

---

## 最近完成

### 2026-06-23 SP 召唤门槛改"看费用" + 卡面显示可召回合 ✅
接上一条平衡诊断的 🟠"无视费事件 2 费秒巨兽"：把召唤门槛从平铺 `turn≥3` 改成**看费用** `turn ≥ max(3, spCost−3)`，并在 SP 卡面/详情显示"第几回合起可召唤"。
- **单一真相源**：`deckRules.js` 加 `spEarliestSummonTurn(spCost)=max(3,spCost−3)`（+ 常量 SP_SUMMON_MIN_TURN=3 / SP_SUMMON_COST_OFFSET=3）。门槛逻辑(`useBattle.getEligibleSpCards`)与卡面显示(`Card.jsx`/`CardDetailModal.jsx`)**共用此函数**——改一处即同步。
- **门槛**：去掉 `getEligibleSpCards` 顶部 `if(turn<3)return[]`，末尾改 `candidates.filter(sp => turnRef.current >= spEarliestSummonTurn(sp.spCost))`。小 SP(5-6费)照常 T3；大 SP 自然推迟：7→T4 / 8→T5 / 9→T6 / 10→T7。既保住"不过早"(地板 T3 挡第1-2回合)，又拦掉"2费秒30000属性巨兽"。
- **显示**：Card.jsx SP 卡面加"🕐第{n}回合起可召"（`card.spSummonTurn`）；CardDetailModal 加"需第 {n} 回合起才能召唤（SP 费用越高越晚）"块（`card.spSummonTurnDetail`）。i18n zh/en 各 2 键。
- **验证**：build 绿 + 全 14 套零回归（`test-sp-chain.mjs` 升级用真公式 spEarliestSummonTurn + 加看费用断言：5→T3 / 9费T5挡 / 9费T6召 / turn1-2全锁，28 断言；`test-bugfix-20260622.mjs` bug2 断言同步更新）。**vite preview 真机**：图鉴 17 张 SP 全显正确回合(3×7 / 4×4 / 5×4 / 6 / 7)；种入 6 张 SP 进 DeckBuilder SP 页，卡面 T3/T3/T4/T5/T6/T7 截图确认；量子医疗(cost10)详情弹窗"需第 7 回合起才能召唤"；0 console error。
- **🟡 仍待定**：tech 阵营 SP 偏弱（大 SP 是 campaign_only）；Phase B（三条触发）仍排着——本次只动"事件触发后何时能召"，没加新触发条件。

### 2026-06-23 事件×SP 全组合穷举 + 平衡诊断 + 修死规则 ✅
应齐齐要求穷举全部「触发事件 × SP」组合：12 触发事件 × 17 SP = 204 对 → **98 对成立**（分析脚本 `outputs/analyze-sp-combos.mjs`，gitignore）。
- **修死规则**：发烧反应 `cost_limit maxCost 4→5` —— 原 4 < 最小 spCost(5) → **永远召不出任何 SP**。改 5 后可召 3 张 5 费 SP（与生态恢复/临床试验同级，body 阵营终于有可用的 ≤5 触发事件）。`test-sp-chain.mjs` 加**无死规则守卫**（每张触发事件至少能召 1 张 SP，会抓 maxCost<最小spCost 这类配置错误），23 断言全绿。
- **组合结构**：① 同阵营·无视费(faction_only maxCost99) 17 对——2-3 费事件秒召该阵营任意费 SP；② 费用限制(cost_limit) 13 对；③ 任意SP(discard_check 弃牌×N / spend_all_energy 能量≥spCost) 68 对——满足条件后全部 17 张 SP 任挑、不限阵营。
- **平衡诊断留档（齐齐选"先只修死规则"，下列未改、待定）**：
  - 🟠 **"无视费"结构性超模**：maxCost=99 完全绕开 spCost + 临时平铺 `turn≥3` → **2 费事件第 3 回合甩 30000 属性巨兽**（性价比 15000/费 ≈ 普通 2 费卡 5 倍），共 8 个 ≤3费秒≥25000 组合（食物链爆发→远古世界树、基因突变→丧尸瘟疫 顶配）。**对症修法**：召唤门槛改"看费用" `turn≥spCost−3`（小 SP 照常 T3、大 SP 推到中期）——与 **Phase B** 是同一件事。
  - 🟡 **tech 阵营弱 2.8 倍**：tech 两张大 SP（量子医疗30000/疫苗之盾23000）是 campaign_only，紧急手术(同⚗️)只能秒到 CRISPR 16000，其他阵营秒 28000-30000。补法：加一张 tech 抽卡大 SP 或把疫苗之盾改 gacha。
  - ⚪ discard_check/cost_limit 不限 SP 阵营（阵营只是"钥匙"），是泛用 splash 工具。

### 2026-06-23 DeckBuilder 加事件卡支持（自建卡组终于能触发 SP）✅
齐齐实测延伸：抽到「抗药性进化」等**可触发SP的事件卡**，但在卡组编辑器里**无处可加**——SP 区只收 SP 卡、主卡池只收 character 生物卡。后果：**自建卡组永远没有触发事件卡 → 战斗里永远触发不了 SP**（只有 testDecks 把事件卡硬编码进去才行）。这是「SP 打不出来」的**第二道锁**（Phase A 解的回合门槛是第一道）。
- **根因/矛盾**：`deckRules.js` 写 `DECK_SIZE=25 // 生物卡+事件卡混编`，但 `DeckBuilder.jsx` 的 `selectableMainCards = cards.filter(character)` 把事件卡完全排除（注释明写"事件卡不能手动放入卡组"）。底层其实早支持（`allMainCards` 含 eventCards、collection 含 event、战斗路径 testDecks 证明可混编），缺的只是**选择 UI**。
- **修法**：① `selectableMainPool = [...character, ...eventCards]`，`ownedMainCards` 改基于它过滤；② 加「类型」筛选下拉（全部/生物卡/事件卡，仅主卡组 `!showSp` 守卫），可单独筛出"事件"找触发SP的卡；③ i18n zh/en 加 `deck.allType/typeBio/typeEvent`。事件卡 hp=0 在 Card.jsx 已有 `!isEvent` 守卫不置灰。
- **验证**：build 绿 + **14 套测试零回归**（新增 `scripts/test-deckbuilder-events.mjs` 16 断言：接线 + 类型过滤 + i18n + 12张可触发SP事件卡覆盖全四阵营）。**vite preview 真机**：进卡组编辑→类型选「事件卡」→池里出现拥有的事件卡（免疫应答/实验观察，满色）→点击加入主卡组（0→1/25）→「全部类型」生物+事件混显 20 张→ 0 console error。
- **⚠️ 留尾**：① 触发SP的事件卡（抗原呈递/临床试验/紧急手术等）需**抽卡获得**——starter collection 只送 2 张非触发事件卡（免疫应答/实验观察），所以新存档要先抽到触发卡才能在卡组里放。② **暂未给事件卡设上限**（理论上可堆满 25 张事件卡的畸形卡组）——testDecks 是 7/25≈28%，未来可加事件卡数量上限作平衡杠杆。
- **⏳ 齐齐真机实测**：把抽到的「抗药性进化」选进自建卡组主卡区 → 配上 SP 卡组 → 战斗中第 3 回合后打出它 → 应能召唤 SP。

### 2026-06-23 SP「根本打不出来」解封（Phase A）✅
齐齐实测：SP 卡在战斗里**根本召唤不出来**。根因是同日早些「三连修」bug2（a6bf0cb）修「SP 过早召唤」时**修过头**：`getEligibleSpCards` 末尾加了 `candidates.filter(sp => sp.spCost <= turnRef.current)` —— **量纲错配**：SP 的 `spCost` 是能量量纲(5/6/7/8/9/10)，`turn` 是回合序号(每玩家回合 +1，1,2,3…)，`spCost<=turn` 等于「cost5 SP 第 5 回合、cost8 霸王龙第 8 回合才放行」。叠加「必须打出带 spSummonRule 事件卡 + 场上空位 + 事件卡自身 cost 上限」，亲子局根本撑不到 → SP 永远出不来。
- **修法（Phase A 最小解封）**：去掉按 spCost 的回合过滤，改为开头 `if (turnRef.current < 3) return []` —— 只挡齐齐原抱怨的第 1-2 回合（AI 甩 SP），第 3 回合起放行；玩家/AI 对称。`useBattle.js` L1098 后 + 末尾 return。
- **第二嫌疑排除（SP 卡组是否真进战斗）**：追全链确认有兜底、永不空——`App.jsx:340 playerSpDeckCards → BattleScreen startBattle({player: …||playerTestSpDeck}) → useBattle setPlayerSpDeck → playerSpDeckRef`。预设触发路径完整（玩家 CAR-T/大脑/纳米 ← 抗原呈递/临床试验/紧急手术/干细胞分化）。
- **验证**：build 绿 + **13 套测试零回归**（含**新增 `scripts/test-sp-chain.mjs` 11 断言**：真实 spCards/eventCards/预设卡组复刻门槛，证 turn1/2 全锁、turn3 解封且列出召唤路径、所有 spCost≥3 不误伤）+ 更新 `test-bugfix-20260622.mjs` bug2 断言（旧断言查的正是被删的 `spCost<=turn`）。**vite preview 真机**：默认测试卡组进自由对战 → 战斗显示 `🌟SP:3`/`🌟敌SP:3`、0 console error（运行时确认 SP 卡组已加载）。
- **⏳ 齐齐真机实测**：组带触发事件卡 + SP 卡组的牌，确认第 3 回合后能正常打出 SP；AI 不再第 1-2 回合甩 SP（两头都测）。
- **🔴 Phase B 待排期**（齐齐定「先A后B」）：按 `.claude/rules/battle-system.md` 实现 SP 三条触发「连续答对2题 / 主人HP≤50% / 第8回合」+「3张随机翻2选1」——当前代码**完全没这套**，SP 仅靠事件卡触发。详见「下次启动时优先 → 🔴 最优先」。

### 2026-06-23 齐齐实测 bug 20260622 三连修 ✅（a6bf0cb）
> ⚠️ 其中 bug2「SP 过早召唤→加门槛 spCost≤turn」当日即被发现修过头（SP 反而永远出不来），见上方 Phase A 解封条目。
来自 Notion「bug 20260622」页面（用 notion MCP 读取），3 个 bug：
1. **护盾数值重叠**：`Card.jsx` 护盾 🛡️{amount} 原在 `top-0 left-0`，与左上角 cost 徽章 + ☠️ 中毒角标三者重叠 → 移到顶部正中 `left-1/2 -translate-x-1/2`（齐齐："往中间来一点"）。
2. **SP 过早召唤失衡**：超级细菌(cost5)/霸王龙(cost8) 第 1-2 回合就被 AI 召唤。根因 `getEligibleSpCards` 的 cost_limit/faction_only 只按 spCost≤maxCost(99) 放行、无回合/能量门槛 → 加回合门槛 `spCost <= turnRef.current`(cost5→第5回合起、cost8→第8回合起)，玩家/AI 对称。
3. **抽卡不扣金币**：`doPull` 先 `spendCoins` 再同步 `pullCards`；spendCoins 原用函数式 setState(updater 事件后才跑、不更新 stateRef)，而 pullCards 同步读 `stateRef.current` 重建整份 state 覆盖式 setState → 把扣款覆盖。修：spendCoins 改同步更新 stateRef.current(与 pullCards/recordBattleResult 同款)。**vite preview 实测：单抽 3000→2900**。
- `scripts/test-bugfix-20260622.mjs`(7 断言) + build 绿 + 12 套测试零回归。

### 2026-06-22 续⁵ Phase 2 扩卡第二批 8 张 + 接回两任务 ✅（a1855ca；onTurnStart df38569 / FIELD_SLOTS 58f6dcb）
**接回两任务**（齐齐让"统一接回来一起操作"）：onTurnStart 死技能修复（useBattle 补回合开始钩子 processTurnStartEffects，救活向日葵/线粒体/蚁后等 7 卡）+ FIELD_SLOTS 5-vs-7 文档对齐，已 commit+push 到 main。
**第二批 8 张卡**（扩卡蓝图"建议第一批"剩余 8 张，至此第一批 12 张全落地）：
- 🌊 OCEAN：安康鱼·深海钓灯(守护+诱捕沉睡)、抹香鲸·深渊潜猎者(深潜隐身+回声秒杀)、小丑鱼·海葵之家(加盾+反击)、海星·断肢重生者(必定复活+击杀回血)、帝企鹅·极地守护(抱团/轮流取暖群回血)
- 🔬 MICRO：黏菌·没有脑子的解题高手(觅食网络+试错成长)、硅藻·玻璃造氧师(产氧群回+玻璃护盾)、水熊虫·隐生不死(2回合免疫+遇水自愈)
- **流程**：design→五维对抗验证(科学/平衡/题目/引擎/七岁)→综合 workflow（首次跑撞会话额度上限失败，**断点续跑** resumeFromRunId 复用缓存补完）。
- **引擎**：16 技能注册全复用现有机制；2 处最小支持——guardSkill.js 白名单加 'Luring Lantern'(守护)；skillTemplates.js chance_revive 加 strip_skills(海星复活不带技能防无限链)。
- **集成纠正**：slime_mold 觅食网络从 conditionalAtk(已知×2 bug)改走 onPlay BUFF；diatom 技能名去撇号 Oxygen Workhorse；清理 synth 多余字段；tube worm subType 保 invertebrate_other。
- **数据**：卡 108→116、题 515→539、149/149 卡全有题。test-phase2-cards 393 断言 / build / validate 0/0 / 11 套测试全绿。
- **⚠️ 验证揭示 3 个既有引擎 bug（已 spawn task_e96cb667）**：① conditionalAtk 固定加伤全退化成 ×2（虎鲸协同攻击/大王乌贼/眼虫 Engulf Mode 受影响）② 变色龙 Color Camouflage "隐身"实为一次性护盾 ③ 鲸鲨 Filter-Feed Guard 漏接白名单守护失效。另两任务 task_5b9a7c7c(反击 _side 路由)/task_1856a27c(蓝鲸"最响"文案冲突)workflow 已开。

### 2026-06-22 续⁴ Phase 2 扩卡启动：能量主线首批 4 张 ✅（de4a94b）
封顶后启动 Phase 2 横向扩卡。先做教育价值最高的「能量从哪来」主线（自养/异养第一性原理：蓝细菌→叶绿体→线粒体(已有)→眼虫→深海管虫），Yang 选「先做 1 张范例」→ 批准后做完 4 张。
- **流程**：用 `Workflow` 跑 design→对抗验证(科学/平衡/题目/引擎/七岁 五维 lens)→综合（24 agent）。验证抓到真问题：① 一个 **onTurnStart 死 handler**（chloroplast 原技能永不触发→改 onPlay）② euglena 异养表述修正(吞食→吸收为主) ③ 数值/答案位置偏置。我作为集成方**否决**了 2 处：tube worm subType microbe→invertebrate_other(2米环节动物非微生物)、名保留 Yang 批准的「热泉炼金师」。
- **4 张 SSR**：深海管虫(OCEAN/cost5,化能合成滋养)、蓝细菌(MICRO/cost4,大氧化事件出场最多3张nature永久+1000ATK + 阳光造氧)、叶绿体(MICRO/cost6,光合爆发+2能量 + 糖分供养)、眼虫(MICRO/cost3,晒太阳回血自养 + 缺光开饭异养斩杀)。
- **引擎**：7 技能全复用现有机制(passiveHeal/conditionalAtk/ENERGY_BOOST/BUFF)注册到 skillRegistry，零新事件类型。set 仅数据标签无代码分支，新卡自动进 gacha(按稀有度)/图鉴。
- **数据**：卡 104→108、题 503→515(每卡+3三层题)、141/141 卡全有题。`scripts/test-phase2-cards.mjs`(140 断言) + build + validate(0/0) + 10 套测试全绿。
- **⚠️ 副产物 bug（已 spawn 任务 task_115164db）**：7 个 `onTurnStart` 技能(向日葵 Photosynthesis Supply / 线粒体 ATP Burst / 蚁后 Colony Summon / 变形虫 Rapid Mutation / 肝脏 Detoxification / 透析机 Hemodialysis / Super Computation)在 useBattle 中**从不触发**（缺玩家回合开始钩子）→ 这些卡技能对战中是哑的，待单独修。
- **⏳ 待 Yang/齐齐**：①真机抽到/实测 4 张卡技能手感（尤其蓝细菌永久 AOE buff 会不会滚雪球，残留风险记于 workflow 输出）②从 `outputs/phase2_card_expansion_blueprint.md` 菜单挑第一批剩余 8 张（鮟鱇/抹香鲸/小丑鱼+海葵/海星/帝企鹅/黏菌/硅藻/水熊虫新版）继续设计。

### 2026-06-22 续³ 题库封顶 + 扩展规划结论 ✅（793ce3e）
**封顶**：老题精分类暴露 10 张「纯记忆」卡（缺机制/推理）+ sp_gaia 0 题。补 13 道——10 张纯记忆卡各补 1 道机制/推理（水母神经网/向日葵光合/电鳗电定位/血小板凝血/神经元电信号/抗体特异性/噬菌体注射复制/听诊器诊断/显微镜发现病原/麻醉无痛手术）+ sp_gaia 建 3 道（灰狼重引入/海獭-海带食物链/关键物种）。**至此 137 张卡全部三层（记忆/机制/推理）齐全，0 题卡归零，涉及卡 137/137**。题库 490→503，新题 gap≥12 仍 0，build/validate/9 测试全绿。
- **扩展规划结论**（Yang 问「题库怎么拓展、要不要先扩卡」）：数据显示**老卡题库已饱和**（124/137 张已有 3-5 题，1-2 题的 0 张）——题绑 cardId，老卡题做满了，**题库量级拓展必须先扩卡**。Yang 拍板「两步都要：先封顶（已完成）再扩卡」。
- **下一步：Phase 2 扩卡**（OCEAN 海洋深渊 / MICRO 微观战场，各 ~80 张）。每张新卡配数值/技能/科学知识 + 三层题。**建议分批 + 齐齐参与选生物**（亲子设计是核心乐趣），用 `bio-heroes-card-designer` skill。下个工作项：产出候选生物「菜单」给齐齐挑。

### 2026-06-22 续² legacy trivia 升级 16 道机制/推理题 ✅（52fbc16）
承接老题精分类发现的「老题库 ~85% 是 trivia」缺口，按 `outputs/legacy_quiz_rewrite_candidates.md` 把暗含原理的 trivia 升级成 mechanism/inference 题，填补原理教学。
- **Yang 定调**：「新增为主，弱题改写」+ 先做 3 道 inference 试水确认风格 → 通过后做完全部。
- **6 道改写**（卡题数≥6 或弱 yes-no，不增题数）：绦虫为何不需消化系统(异养/inference)、红细胞为何凹饼形(表面积)、心脏为何离体还跳(窦房结)、喷嚏为何传病(飞沫)、伤口为何湿润愈合快、切叶蚁-菌何关系(共生)。
- **10 道新增**：HIV 为何专攻 T 细胞(免疫指挥官/inference)、HIV 为何难根治(整合DNA/inference)、白细胞如何吞噬、新冠如何刺突-ACE2 入侵、疟疾为何周期发烧、蜜蜂为何蜇人即死(倒钩刺/tradeoff)、猎豹为何追一会就停(过热/tradeoff)、蓝鲸潜水反射(homeostasis)、大肠杆菌肠道共生(coevolution)、肉毒素剂量决定毒药/良药(tradeoff)。
- **#95「抗生素能杀病毒吗」剔除**：主题已被 antibiotic_ultimate(5题)+flu_virus(8题) 饱和。
- **质量**：每道 hard/medium，3 个错误项均为「常见误解」（非凑数），选项长度差<12，答案位置打散；锚定 CLAUDE.md 第一性原理。
- **数据**：题库 480→490，legacy 180→174（6 改写脱离 legacy 标记）。build 绿 / validate 0 错 0 警 / 新题 gap≥12 仍为 0 / 9 套测试零回归。

### 2026-06-22 续 老题库 legacy 精分类（type/principle/tags）✅（07db703）
180 道 legacy 老题的 `type` 原来是 `difficulty` 的 1:1 机械映射（easy→memorization / medium→mechanism / hard→inference，0 偏差），等于零信息量。按 Yang 校准的**严格认知动作**规则重新分类：
- **规则**：「是什么/多少/哪个/哪里/有没有」= memorization（哪怕冷门）；「为什么/怎么/因为什么」= mechanism；「套第一性原理判断新场景」= inference（Yang 拍板 #29 捕蝇草食虫=inference 校准了边界）。principle「能套就补、套不上留空」。
- **结果**：153 mem / 23 mech / 4 inf。**头号发现：老题库 ~85% 是事实回忆题（趣味冷知识），原理理解基本靠新 300 题在扛。** 双向修正——16 道「为什么/怎么」从 mem/inf **上修**为 mechanism（如"疫苗工作原理"/"为什么胃不被自己消化"/"洗手原理"）；约 120 道冷门事实从 mech/inf **下修**为 memorization。
- **4 道 inference**：捕蝇草为什么食虫（异养/营养）、为什么医学发现多是意外、抗生素别滥用 + 吃完整个疗程（均=自然选择推理）。
- **principle**：30 道补上（tradeoff 如蜜蜂蜇人会死/猎豹过热、homeostasis 如蓝鲸潜水心跳、coevolution 如切叶蚁种菌、mechanism）。type=mem 但暗含取舍/稳态/共生的题也补了 principle（type≠principle，分离两个维度才是这套分类的价值）。
- **tags**：从 `[legacy, faction]` 换成 `[legacy, 内容标签…]`（如 `[legacy, hygiene, soap, handwashing]`）。**保留 `legacy` 标记**——`validate-quizzes.mjs` 靠它把老题排除在「答案位置/选项长度偏置」统计外（那批偏置只在新题修过，本轮没动）。
- **产出 backlog**：`outputs/legacy_quiz_rewrite_candidates.md` 列了 **17 道可改写候选**——现在是 trivia 但 fact 里埋了原理，改写题干成「为什么/怎么」就能升级成 mechanism/inference（如绦虫为何不需消化系统、为什么红细胞是凹饼形）。这是**内容改写**活（动 q/options/fact），Yang 定哪些做。
- **验证**：build 绿 / validate-quizzes 0 错 0 警（480 题 / 老题 180 仍正确识别）/ 9 套测试零回归。转换脚本 `outputs/apply-legacy-reclass.mjs`（gitignore，一次性）。详细方法见 `outputs/legacy_quiz_reclass_nature.md`。

### 2026-06-22 onDeath 技能事件路由错位修复（干细胞分化等失效）✅（a962f8c）
齐齐实测：干细胞·万能变身者被敌方打死、场上有空位却不分化。**这是干细胞分化的"完整修复"**——此前 5d25ffc 只加了"分化失败 NARRATIVE_LOG"反馈，真正的路由错位根因没动。
- **根因**（useBattle.js `handlePostAttackSkills`）两 bug 叠加：① onDeath 的 friendlyField 被 `.filter(Boolean)` 删掉 null 空位 → `revive_as`/`split` 按下标 `findEmptySlot` 找空位假阴性"场上没空位"；② onKill（攻击方技能）和 onDeath（防守方技能）混在同一 `allEvents` 用**攻击方 side** apply → 防守方的 `SUMMON_CARD{side:'friendly'}` 落到**攻击方**场，玩家看不到。
- **改法**：onKill / onDeath 分开 apply，各用各的 side；onDeath 引入 `defenderSide` + 被杀方**原始场**（保留 null 空位）+ 被杀方弃牌堆。`skillTemplates.js` 不动（revive_as 本就对含 null 的原始 field 正确工作）。共享函数 → 玩家攻击(L1680)/敌方攻击(L1926)两条路径一次修好。
- **影响面**（原全部按攻击方 side 错路由 → 本次一并修正）：`split`(大肠杆菌分裂)、`chance_revive`(章鱼/逆转录复活)、`heal_leader`(孢子散播)、`damage_random_enemy`(飞沫传播)、`debuff_allies`(Core of Life)、`revive_as`(干细胞)。孢子散播 heal_leader 从"回攻击方主人"翻成"回死亡卡自己主人"——修正不是回归。
- **验证**：build 绿 / 9 套测试全绿（新增 `scripts/test-onDeath-routing.mjs` 10 接线断言 + `scripts/test-differentiation.mjs` 加空位定位 case [活卡,null,null]→slot1 / [活卡,活卡]→NARRATIVE_LOG，31 断言）/ vite preview 产物冒烟（标题屏全渲染、0 console error）。⏳ 齐齐真机实测：组含干细胞 + 人体系 R 卡的牌，先让 1-2 张 R 卡进弃牌堆，再让干细胞被敌方打死且留空位 → 应见日志"🧬 …分化为 XX"且新卡出现在**自己**场空位；顺带验大肠杆菌 Binary Fission 死亡分裂落到正确一方。

### 2026-06-21 续⁶ ch3 Boss SP 补完：sp_gaia_restoration 盖娅复苏·万物归野 ✅（beb2239）
方向 D 已知洞：ch2/ch4 Boss 都有专属 SP，ch3 蓝鲸 Boss 通关空奖。本次填上，三章 SP 齐。
- 设计走 workflow 4 候选(共生/复原/碳汇/关键种)×3 视角(7岁/教育/平衡)+综合，"复原"赢(40分)+
  嫁接其他候选亮点：黄石狼故事(2)/关键种科学锚点(4,删反噬)/治玩家本人血新设计轴(3)。
- 最终卡：spCost 8 / ATK 6000 / HP 20000；技能1「万物归野」(onPlay): 弃牌堆所有友方 nature 卡
  复活 50% HP + 主人 +5000；技能2「光合滋养」(onTurnEnd): 每回合主人 +1500。
- scienceCard 用海獭/灰狼讲"重引入(rewilding)" — 对应通关"我守住了生态"的成就感。
  scienceNote 1995 黄石公园 14 只灰狼真实案例。
- 引擎改动：MASS_REVIVE 加可选 faction_filter(向后兼容 sp_quantum_healer 不传) + emptyMessage
  防"空响"(弃牌堆 0 nature 时给独立 narrative)。
- **Yang 拍板**(全跟推荐)：① 复活全部 nature(不加 limit)② 重引入主题为主 ③ 命名"盖娅复苏·万物归野"。
- 验证：build 绿 + `scripts/test-sp-gaia.mjs` 31 断言(数据/SP_UNLOCK_MAP/技能注册/MASS_REVIVE
  兼容性)全绿。⏳ 齐齐真机实测：打 ch3 蓝鲸 Boss 通关→见 SpUnlockModal→拿到卡→打一场看效果生效。

### 2026-06-21 续⁵ 真根因 dev 黑屏修复：SW 在 dev 不接管 ✅（75354bd）
Yang 本机 npm run dev 也黑屏 → 真机 Chrome 抓到 root 完全空 + console 无 React 错（根本没起来）。
查 / 返回的 HTML 正常、main.jsx HTTP 200、vite server 无报错。注意到 index.html 有 `navigator.serviceWorker.register('/sw.js')` →
读 public/sw.js：**所有 JS/CSS cache-first**。任何一次访问过线上/产物预览的设备(齐齐 iPad / Yang 本机)
都已激活这个 SW；dev 端口同 origin 也被它接管 → 首访缓存 /@vite/client、/src/main.jsx 后永久返回 cache，
下次 dev 启动版本对不上 → React 不挂载 → 黑屏，且无错误线索(连第一次渲染都没到)。
- **修法两道防线**：① **index.html**：仅生产 host 注册 SW；dev host(localhost/127/.local/5173/4174) 主动
  unregister + 清 cache（救活历史装过 PWA 的设备）。② **public/sw.js**：自我兜底，IS_DEV_HOST 时只挂
  install/activate(skipWaiting+清缓存+unregister+navigate 现有 client)，**不挂 fetch handler**，自杀干净。
- **真机验证**：本机 Chrome localhost:5173 reload 后直接渲染（首屏教学→菜单→图鉴/今日挑战懒加载页全活，
  不需要手动清缓存）。生产逻辑完全保留（else 分支原样）。
- **结论修正**：此前以为只有沙箱 dev 崩、Yang 本机正常 — **错了**，Yang 本机也崩，是 SW 截住了；
  沙箱本来还多叠了 HMR ws 连不上 + LanguageContext 模块重复（续⁴ globalThis 单例化已局部修）。
- 教训：[[project_bio_heroes_visual_verify]] 关于"本地 Mac dev 不受影响"的说法是错的，需要更新。

### 2026-06-21 续⁴ 清技术债：钻石占位 + LanguageContext 单例化 ✅
- **钻石真生效**（a19a6e5）：useEconomy 加 `addDiamonds`；firstClear 的 diamonds 奖励 + ch3 章节奖励改用
  addDiamonds（原来用 addCoins 占位，💎 显示与实际发放对不上）。`completionReward` 里的 diamonds 是未消费死配置。
- **LanguageContext 单例化**（f5736f3）：用 `globalThis.__BIO_HEROES_LANG_CTX__` 缓存 Context，消除 dev 懒加载块
  模块重复导致的 "must be used within LanguageProvider" 崩溃。生产单实例无影响（产物预览验证 Collection 正常）。
  ⚠️ 但**沙箱 dev 预览懒加载页仍白屏**（更深层是 HMR websocket 连不上的环境问题，非代码；试 `server.hmr:false`
  反而更糟已回退）→ 沙箱可视验证继续用 vite preview 产物，本地 Mac dev/生产不受影响。详见 [[project_bio_heroes_visual_verify]]。

### 2026-06-21 续³ 每日挑战 Daily Challenge ✅（核心闭环上线）
方向 D「两个都要」的第二个（成就之后）。每天一场带约束的轮换战斗 + 连续天数 streak + 周 SSR 券 +
当日主题问答彩蛋。**关键设计：约束 = 单选 Conundrum，完全复用现有 两难关 管线，战斗引擎零改动。**

- **dailyChallenges.js**（纯逻辑，`scripts/test-daily.mjs` 28 断言）：确定性日期种子（dayNumber 位移取模
  themes×enemyPool×constraints + 周日特判自由日）；约束只用 Conundrum effect 契约（HP±/预置敌/起手加牌）；
  computeStreakUpdate（接龙/断签重置为1/时间回拨护栏/幂等）；computeReward（基础 cap7 / 速通+50 / 周 SSR 券 / 每 3 天碎片）。
- **useDailyChallenge.js**：独立存储 `bio-heroes-daily`；completeAndClaim 幂等发奖。useEconomy 加 addFragments 薄方法。
- **接线**（App.jsx）：screen 'daily' + handleExitBattle daily 分支（`daily_` 前缀→completeAndClaim，跳过 campaign
  进度逻辑，成就星-merge 排除 daily）；伪 stageConfig 走 `handleCampaignBattle → deckBuilder → battle` 现成管线。
- **UI**：TitleScreen teal 入口 + 未完成红点 + 🔥streak；DailyChallenge 屏（主题/约束/streak/最近7天日历/奖励
  预览/状态按钮 + 胜利庆祝弹窗）；胜利后当日主题问答彩蛋（复用 GachaQuizModal，答对 +20，6 主题全有匹配题）。
- **Yang 拍板**：平衡档+周日自由日 / 断签重置为1 / 周 7 天 SSR 券 / 首版只做 App 内红点。
- **v1 范围**：硬阵营锁(lockedFaction)需改 DeckBuilder + DECK_SIZE=25 早期不可行 → 留 **v2**；约束全走 Conundrum
  effect，零 DeckBuilder/BattleScreen 改动。**不发钻石**（diamonds 仍 coins 占位 bug）。

**验证**：build 绿 / test-daily 28 断言绿 / **产物预览实测全闭环**：入口红点→进屏(今天恰好周日→自由日正确)→开始
挑战→deckBuilder→战斗约束 conundrum(接受挑战+后果+科学包)→效果生效(主人 33000/敌 12000)→done 态(🔥5/日历✅/
明天再来/再2天得SSR券)。⏳ 真机 win→奖励弹窗→streak+1→问答彩蛋 待齐齐实测（需实打一场赢）。

### 2026-06-21 续² 实测 bug：事件卡所有展示场景发灰 ✅（ed71a33）
齐齐抽卡时发现「第一次见到」的事件卡（全球大流行 SSR）整张灰掉。根因：展示场景
（CardShowcase / 图鉴 / DeckBuilder / GachaScreen / CardDetailModal / GachaAnimation 共 8+ 处）
都用 `hp={card.hp || 0}` 渲染 BattleCard，**事件卡无 hp** → hp=0 → `Card.jsx:40 isDead=(hp<=0)=true`
→ `opacity-30 grayscale`。即**所有事件卡在战斗外的每个展示场景都发灰**，齐齐只是在抽卡先撞见。
- **根因修复**（Card.jsx 一行）：`isDead = !isEvent && hp <= 0` —— 事件卡永不算死亡，一处修好全部场景。
  战斗里生物/SP 判死不变（16 张 SP 全有 hp；战斗实例 `{...card, currentHp}` 仍带 hp，死亡仍灰）。
- **验证**：build 绿 + 产物预览图鉴实测 免疫应答/实验观察 `filter:none opacity:1` 满色绿卡（截图确认）。

### 2026-06-21 续² 成就系统补全：战斗 + 答题两类（3 类齐全）✅
成就系统原本只有「收集」一类（5 个集卡成就，抽卡时触发），补上方向 D 愿景的另两类，
达成**收集 / 战斗 / 答题**三类齐全。Yang 选「两个都要」→ 本轮成就先行，**每日挑战是约定的下一轮**。

- **数据模型**（achievements.js）：声明式 `check(ctx)` 谓词，`ctx={stats,stageStars,battleResult}`，
  三种条件——累计统计 / 战役派生(读 stageStars) / 本场事件。通用引擎 `detectNewlyUnlockedFrom`
  + `detectNewlyUnlocked` 向后兼容包装（GachaScreen 零改动）。`ALL_ACHIEVEMENTS` 三类全集。
- **9 个新成就**：战斗 5（初战告捷 / 百战老兵 10 场 / 完美防守满血 / 巨兽终结者击败 3 Boss / 闪耀星河 30 星）
  + 答题 4（求知初心 / 答题学霸 20 道 / 知识大师 100 道 / 全对达人单场≥3全对）。2 科学包：
  巨兽终结者「三大终极考验」(新冠/蓝鲸/超级细菌) + 知识大师「为什么要懂原理」。
- **economy 累计计数器**（useEconomy）：`battlesWon/battlesTotal/quizCorrectTotal/quizTotalAnswered`，
  `recordBattleResult` stateRef 模式同步返回快照。老存档 spread 默认 0，**无需 migration**。
- **触发**（App.jsx handleExitBattle）：分支前检测（campaign 分支会提前 return，故前置）；本场星
  merge 进本地副本让「击败全部 Boss / 累计星」当场解锁（不写盘）。App 级成就弹窗 FIFO 队列，先 SP 后成就不叠。
- **展示**（Collection）：成就栏改**三段分组**，按 `progress(ctx)` 显示 7/10、15/20、9/30 等进度；
  事件型(无 progress)显示 🔒/✓。**quizTotal 转发**（BattleScreen，认输给 0 防刷"全对"）。
  **AchievementModal** 加 requiredCards 守卫（战斗/答题成就无此字段不再崩）。i18n zh/en 加 3 个分类标签 key。

**验证**：build 绿 / `scripts/test-achievements.mjs` 28 断言绿 / **产物预览**（`vite preview` 4174）实测
三段展示、进度数、巨兽终结者科学包弹窗均正常。
> ⚠️ **dev 预览(5173)崩溃复现**：HMR websocket 失败 → 懒加载 Collection 块拿到**第二份 LanguageContext 实例**
> → BattleCard `useLanguage` 报 "must be used within LanguageProvider"（栈里 `LanguageContext.jsx?t=时间戳` 即证）。
> 与 SESSION 旧记的 HMR 失效同源。**可视验证改用 `vite preview` 产物**（单实例 LanguageContext），launch.json 已加 preview 配置。

**遗留**：阈值（10 场/20 题/30 星/100 题）按齐齐游戏量初设，可实测后调；quiz_master 100/star_shine 30
未经 Yang 单独确认。

### 2026-06-21 续 ch3/ch4 题库扩充 ✅（3 批全部完成，达成 100% 卡覆盖）
延续 Sprint 32 的三层框架（memo/mech/infer），扩展到 Sprint 32 没覆盖的
63 张完全无题卡。题库 291 → 480 题（+189 道新题），卡覆盖 73 → 136 (100%)。

- **Step 1 审计**: `scripts/audit-ch34-cards.mjs` + `outputs/ch34_audit.md` —
  63 张完全无题卡按章节+阵营分 9 组（ch3 nature 13 / 跨章节 pathogen 14 /
  gacha-only 未参战 36 张）
- **批次 A (39 道)**: ch3 nature 13 张 × 3 层 — 海洋/陆地/微生物 + 4 事件 + sp_trex
- **批次 B (42 道)**: pathogen 14 张 × 3 层 — 病毒/细菌/真菌/寄生虫 + 4 事件 + 1 SP
- **批次 A+B Review**: 修 5 道 gap >= 10 长度问题 + shark "暴风雨天活跃"
  这个争议性事实换成"金属首饰下海"科学定论版本
- **批次 C (108 道)**: gacha-only 未参战 36 张 × 3 层 — body 8 + nature 11 +
  pathogen 9 + tech 8（覆盖最复杂主题：CAR-T/CRISPR/纳米机器人/量子治疗/
  群体免疫等前沿医学）
- **批次 C 后处理**: 修 12 道 gap >= 12 + 写 node 脚本批量重排 answer 位置
  消除 meta bias（最终 batch C: 34/24/27/23，整体 A+B+C 300 道: 80/100/68/52）

**最终质量指标**：
- 总题 480 / 新题 300 / 老题 180
- 卡覆盖 **136/136 = 100%**（含 character / event / sp 全部卡牌类型）
- 0 错误 / 0 警告 / 选项长度差 ≥ 12 字: 0 道
- 教育闭环完整：Phase C 小测验任何卡都能匹配到三层题

### 2026-06-21 Sprint 32 ch2 题库扩充 ✅（8 step 全部完成）
把题库从"知识点收集"升级为"原理理解"，180 → 291 题（+111 道新题）。

- **Step 1**: ch2 题库审计报告（outputs/ch2_quiz_audit.md）
- **Step 2**: 35 道基础题 (memorization, easy) — 覆盖 33 张完全无题 + 2 缺基础
- **Step 3**: Yang spot check 10 道（通过）
- **Step 4**: 36 道机制题 (mechanism, medium) + refine 消除"长度+位置 meta 模式"
  - Yang 发现正确答案明显比错误选项长 3-5 倍，answer 几乎都在 B 位置
  - 全 36 道重写：选项长度齐平 + 错误改为常见误解 + answer 打散
- **Step 5**: Yang spot check 10 道（通过）
- **Step 6**: 40 道推理题 (inference, hard) + refine 重写 9 道"伪推理"
  - 自审发现 9 道质量问题（纯记忆/纯常识装成推理 / 概念太抽象 7 岁难懂）
  - 重写后真应用原理判断：天花根除/感冒每年得多次/医院多种消毒等场景
- **Step 7**: 给老 180 题批量补 type+tags 字段
  - type 从 difficulty 近似映射，tags 用 'legacy' 标记便于将来 review
- **Step 8**: scripts/validate-quizzes.mjs 校验脚本 + outputs/ch2_quiz_validation.md 全量报告
  - 0 错误 0 警告 / 73 张卡覆盖 / 选项长度差 ≥ 12 字: 0 道

**最终质量指标**：
- 题型: memorization 104 / mechanism 98 / inference 89
- 新题答案位置分布: 19/52/23/17（无明显 meta tell）
- 新题 principle 标签: tradeoff 25 / mechanism 41 / homeostasis 7 / coevolution 3

**遗留**: 63 张完全无题的卡（基本是 ch3/ch4 范围）等下个 Sprint。
老 180 题的 type 是近似映射，'legacy' tag 是未来 review 入口。

### 2026-06-10（续）Conundrum 两难关扩展 ✅（245c4a4）
ch3/ch4 各加 2 个两难关（先给 Yang 过设计再写入）。每章 boss 前插 2 关，
6→8 关，boss 后移 stage_3_6→stage_3_8、stage_4_6→stage_4_8。

- **新关卡**（全按 ch2 模板：场景/3 选项/后果/科学包/前后对话，每选项真两难无白拿最优解）：
  - stage_3_6 森林抉择（砍森林：碳汇/可持续林业/水土流失）
  - stage_3_7 江豚的家（濒危物种 vs 发展：灭绝不可逆/旗舰物种/关键种连锁崩溃）
  - stage_4_6 基因抉择（CRISPR：体细胞 vs 生殖系/贺建奎事件/基因不平等）
  - stage_4_7 AI还是医生（AI诊断：对抗样本/human-in-the-loop/医生疲劳偏见）
  - effect 全复用现有引擎（HP/起手卡/预置敌人），无新引擎代码。
- **引用更新**：App.jsx SP_UNLOCK_MAP+chapterMap、BattleScreen 两 map、spCards.unlockStage → boss 改 _8。
- ⭐ **存档迁移升级为版本化（可叠加）**：e90c372 已上线 → 齐齐存档可能已是 v1（boss=stage_3_6）。
  插入两难关后 stage_3_6 变成"森林抉择"，若不处理 boss 星数会被错当成两难关进度。
  解法 v0→v1→v2 链式：v1→v2 把 boss 星数从 _6 搬到 _8。`_idMigrated` 布尔 → `_idMigrationVersion` 版本号。
- **验证**：esbuild 全过；新关卡卡 id 全有效；ConundrumModal 字段名匹配；
  23 条逻辑断言（三版本迁移 v0/v1/v2 共 18 + 解锁链 5）全绿；零残留旧 boss 引用。

### 2026-06-10 i18n 大扫除 + 迅击修复 + 关卡 ID 统一 ✅
齐齐问"是不是还有很多没翻译"引出的一轮系统排查 + 两个挑选的技术债。

**i18n 盘点结论**：UI 框架翻译完整（zh/en 各 296 key 同步），但**内容层（scienceCard/
技能描述/题库）0 英文，属"中文为主"有意设计**。卡名/技能名有 nameEn。

1. **72 硬编码 UI 串接入 t()**（d6dc4f7）：战斗浮字（克制!/被克制!）、各 tooltip/aria、
   Achievement/SpUnlock/Milestone 弹窗（含模块级 const 改造）、Gacha 三件套（概率公示/
   图鉴进度）、Collection/DeckBuilder/CardDetailModal。**未动**（有意保留）：lang==='en'
   内联双语、BattleHints zh/en 对象、addLog 战斗日志、classifyLog 中文匹配逻辑、内容数据。

2. **card.name → cardName()/localName() 审计**（398feda）：新增通用 `localName(obj)` helper
   （en 优先 nameEn 回退 name）。修 11 处"英文名存在却直显中文"：进化链步骤卡名、
   阵营名（DeckBuilder/BattleScreen/Card/CardDetailModal）、子类型名、环境事件名。
   进化卡/子类型/环境事件 nameEn 全覆盖。进化链标题 chain.name、成就名 ach.name 无 nameEn
   属内容数据保留。

3. **AI医生·智慧诊疗 迅击真生效**（1dd6a98）：`_grantSwift` 是半成品（BUFF amount:0 纯
   空操作，handler 从没读它）。改用既有标准写法 APPLY_STATUS + swift_boost status，
   hasSwift 判定（useBattle 1494/1535/1806）绕过召唤疲劳，回合末 tick 清除。

4. **关卡 ID 统一 stage_X_Y + 老存档无损迁移**（e90c372）：三种格式（X-Y/stage_X_Y/
   stage_X_Y_name）统一为顺序 stage_<章>_<位>。因 '2-2' 与 'stage_2_2' 是不同关卡，
   必须整体重编号（25 关 21 变化，两遍替换避免改名碰撞）。
   - 引用面全更新：isStageUnlocked '1-1'、App.jsx SP_UNLOCK_MAP+chapterMap、
     BattleScreen 两 map、spCards.unlockStage。
   - ⭐ 顺手修隐藏依赖：App.jsx 靠 `stageId.endsWith('-4')` 判 boss → 新 boss 是
     stage_2_8/3_6/4_6 不再 -4 结尾 → 改 chapterMap 成员判定。
   - 🔒 **齐齐存档零损失**：loadCampaignProgress 加 migrateStageIds（老→新重映射
     stageStars+claimedRewards，_idMigrated 幂等 + 首次持久化）。
   - 验证：24 条逻辑断言全绿（迁移 16 总星守恒/幂等 + 解锁链 8）。

> ⚠️ 验证说明：本轮 preview 沙箱 HMR WebSocket 失败（热更新不生效），多处以
> esbuild + 纯逻辑测试 + Vite 实际服务模块为准；语言切换入口已实测可即时双向切换。

### 2026-06-09 平衡 + bug 3 连修 ✅
接 SESSION「已知问题」清单逐个清理：

1. **sp_world_tree 平衡**（b44c935）：spCost 4→6。确认 spCost 是 SP **召唤门槛**
   （`getEligibleSpCards` 里 `spCost <= maxCost/remainingEnergy` 才能召唤），改 6 有实际
   约束力。保留 3000/15000 数值——它原始总和 18000 已是 6 费档最低（强技能包的技能折扣），
   单轴调整最干净。从「最便宜的 SP」落到 trex/bone_titan 同级。后续若仍太黏可砍自愈 1500→1000。

2. **BUFF 永久叠加地雷**（b44c935）：skill engine `case 'BUFF'`（useBattle.js）同上次
   event card 同款 bug。修法：带 `evt.turns` 时加 `atk_boost` status，回合结束
   `processStatuses` 回退；无 turns 保持永久（吞噬成长等不受影响）。前瞻性防护。

3. **所有对敌 ATK 减益静默失效** ⭐（c978d5c，顺手发现的更大 bug）：
   - 根因：BUFF handler 只用 `friendlySetter`、无视 `evt._side`，`_side:'enemy'` 的减益
     在己方场找不到目标 uid → 静默空转（连日志都不打）。外加 `debuff_atk`/`debuff_both`
     模板把技能写的 `duration` 整个丢了。
   - 修法：handler 按 `_side` 路由（与 APPLY_STATUS 一致）+ ATK 钳到 0 + 按实际 delta 回退；
     模板 debuff_atk/debuff_both/onPlay bonus 传 `turns=duration`，permanent_debuff 保持永久。
   - **复活的卡**：限时减 ATK = 大花草·恶臭之花 / 诺如病毒·胃肠风暴 /
     大流行病毒·终极瘟疫（全体 -2000×3 回合，最猛）/ 蜘蛛·织网猎手 / 登革热·蚊媒杀手；
     永久 = SP·CRISPR·基因剪刀手（ATK↔HP 互换）/ SP·超级细菌·耐药屏障（科技系 ATK 砍半）。
   - 验证：16/16 单测（真实 processStatuses 回退：限时施加+回退 / duration=2 递减 /
     钳 0 不超调 / 永久不回退 / 友方 buff 回归）。⏳ **需齐齐实测**这批减益的战斗手感。

### 2026-05-06 Sprint 33: 全场景卡片详情统一 ✅（7 step）
让玩家在游戏任何场景都能点卡牌看完整详情（技能/scienceCard/tags/持有量）。

- **Step 1**: 新建通用 `CardDetailModal` 组件
- **Step 2-3**: BattleScreen 集成 — 场上卡 + 手牌卡加 ⓘ 角标
- **Step 4**: GachaScreen 改用 context/ownership/isNew props
- **Step 5**: DeckBuilder 旧弹窗加 ownedCount（spec "如果需要"路径）
- **Step 6+7**: **真统一**完成（之前 Battle+Gacha 用通用件，DeckBuilder/Collection 各有本地实现，视觉不一致）。CardDetailModal 加 5 个 slot：`actions`/`children`/`overlay`/`cardAnimate`/`closeOnBackdrop`。DeckBuilder 删本地 146 行 → 用通用件 + actions slot 放"加入卡组"按钮。Collection 删本地 278 行 → 进化链/碎片商店/进化按钮通过 children 注入，进化动画通过 overlay+cardAnimate 注入。净删 163 行。

### 2026-05-06 实测 bug + balance 4 连修 ✅
齐齐 iPad 实测 Phase A+B+C 抽卡完整闭环后发现的问题：

1. **蓝鲸关 sp_trex**：陆地恐龙不该在海洋 boss 关，删除（d28d68a）
2. **蓝鲸关 bossPreplaced**：6000/12000 cost 8 蓝鲸 T1 免费送场太碾压，对比另一 preplaced boss 新冠 4000/5000 cost 5 严重失衡。改为正常 deck 抽出（factionRequirement: nature 3 → AI 必须先打 3 张自然系小弟 → T3-4 才能召唤）（cab4ed4）
3. **蓝鲸关 sp_world_tree**：spCost 4 给 15000 HP+守护+全队回 3000+自愈 1500+修 PB，普遍 OP（独立卡牌平衡问题）。boss 关 spDeck 清空（f5eb20b）
4. **ATK buff 永久叠加** ⭐核心 bug：齐齐"世界之树站场上时不停加攻击力"。根因 [useBattle.js:783](src/hooks/useBattle.js#L783) 直接 `c.atk + effectValue` 永久修改 base ATK，但描述写"持续 N 回合"。`processEndOfTurnEffects` 无回退逻辑。修法：`statusEffects.js` 加 `atk_boost` case，buff 时同时加 status + bump atk，回合结束 tick 到期回退。eventCards.js 3 张 buff 卡加 `effectTurns` 字段。影响范围：所有自然系/人体系/全队 buff 卡（食物链爆发/免疫应答/科技革命）都有同样 bug，全部修复（eb66251）

### 2026-05-03 Sprint 32 Step 1: ch2 题库审计 ✅
- Step 1: `outputs/ch2_quiz_audit.md` 审计报告 — 当时 180 题 / 40/120 卡覆盖（33%）
- Step 2-8 在 2026-06-21 全部完成（见上文）

### 2026-05-03 Sprint 31c: 抽卡爽感升级 Phase B + C ✅（10 step）
把抽卡升级为完整的"期待→事件→学习→联动→成就"闭环。

**Phase B（期待感 + 联动）**:
- **Step 1 章节 banner**: gachaBanners.js + GachaScreen 顶部明星卡 +"+50%"角标（仅显示不实际加权）
- **Step 2 进度+概率公示**: 图鉴进度条（cyan→purple 渐变）+ 📊 概率公示折叠（R 68/SR 25/SSR 5/SP 2）
- **Step 3 联动 DeckBuilder**: 抽到 SR+ 弹"立刻去组队"按钮，DeckBuilder 高亮新卡（黄环+脉冲+NEW 角标），30s 自动取消
- **Step 4 里程碑庆祝**: MilestoneModal 6 档（10/25/50/75/100/120），各档专属 emoji + 鼓励文案

**Phase C（学习节点 + 主题成就）**:
- **Step 5+6 中场小测验**: GachaQuizModal + 十连第 5 张后插入（单抽不打断节奏），关联刚抽到的卡，答对答错都不影响抽卡。selectQuizForPull 优先级：cardId+easy → cardId 任意 → faction+easy → 随机 easy
- **Step 7 成就数据**: achievements.js 5 个主题（抗生素小专家/免疫战士/微观探险家/顶级猎手/海洋巨兽），useEconomy 加 unlockedAchievements 字段（向后兼容空数组）+ markAchievementsUnlocked API
- **Step 8 成就弹窗**: AchievementModal 金橙渐变 + 科学知识包卷动文本。**重要修复**：原直接函数推进读 stale closure，改用 useEffect 监听各 modal/pending state 自动推进，弹窗顺序 showcase→milestone→achievements
- **Step 9 Collection 成就栏**: 顶部 5 列网格，已解锁高亮可点开重读，未解锁灰色显示进度
- **Step 10 整体调试**: HMR 警告确认是历史残留（reload 后不累积新错误），多 modal 链路验证通过

### 2026-05-03 Sprint 31b: 抽卡爽感升级 Phase A ✅（8 step）
把抽卡从"交易"变成"事件"。齐齐 iPad 实测目标：抽到 SR 时"哦"，
抽到 SSR 时"哇"，抽到 SP 时叫出声。

- **Step 1 GachaAnimation 容器**: 胶囊出现 0.7s + 旋转 + 咔嚓裂开 → 卡牌依次翻面 → onDone
- **Step 2 翻面差异化**: RARITY_EFFECTS 表，R 400ms 蓝光快翻 / SR 600ms 紫晕停顿 220ms /
  SSR 800ms 金晕停顿 420ms / SP 1100ms 粉晕停顿 1.5s
- **Step 3 全屏事件层**: SSR 6px 震屏 + 50 金粒子，SP 0.45s 全屏白闪 + 紫红脉冲背景 +
  100 粉粒子 + 14px 强震 + "⚡ SP 觉醒卡!" banner，新建 ParticleBurst 子组件
- **Step 4 CardShowcase**: isNew 卡自动全屏秀，TypewriterText 逐字打 scienceCard，
  支持"下一张/跳过全部"+ 多张轮播
- **Step 5 网格强化**: NEW 脉冲渐变角标，dupe 显示"→ N 碎片"，每张卡底"ℹ️ 点看详情"
- **Step 6 音效升级**: capsuleCrack / cardFlip{Normal,Sr,Ssr,Sp} 五个 Web Audio 合成音
- **Step 7 整体打磨**: showcase/animation 背景从 bg-black/85-92 改 radial gradient 100%
  不透明，避免 gacha 内容透出；CardShowcase/CardDetailModal SP 卡 type 判定显示 "⚡ SP"
- **Step 8 修两个 bug**:
  1. SR 粒子从未渲染（blast 触发条件排除了 SR）→ 改用 particleCount>0 触发
  2. 跳过/完成按钮无效（AnimatePresence 包多条件 → Sprint 30a 同款 exit 卡死）→ 拆掉

### 2026-05-03 Sprint 31a: 抽卡详情 + 教学气泡 ✅
- **Bug #1 抽卡结果可点击查看详情**: 新建 CardDetailModal.jsx 复用组件；
  GachaScreen 卡片 onClick 触发，右下"ℹ️"角标提示。Sprint 31b CardShowcase
  作为 isNew 的 primary 流程，detail modal 留作非 isNew 复习用
- **Bug #2 教学气泡定位修复**: TutorialScreen 反转 lowerAreas 逻辑，只有
  enemy_leader/enemy_field 高亮才把气泡放底部 22%，其它一律放顶部 8%。
  教学 5/5 SP·霸王龙登场时主角卡 ATK/HP/技能不再被遮

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

## 累计战果（Sprint 23-33 + 实测修复，13 个 Sprint + 12 bug）

| 维度 | 数字 |
|------|------|
| 实现技能 | ~113 个（接近 100%）|
| 新模板函数 | 15+ 个 |
| 引擎扩展 | 15 个 event type / status type + globalEffects（含 atk_boost）|
| scienceCard 修复 | 18 张 |
| 机制重做（First-Principle 锚定）| 8 张卡 |
| subType 重构 | 52 卡 + 8 SP |
| 战斗日志面板 | 9 类分色（Sprint 29）|
| 卡组槽系统 | 3→10 + 自定义命名（Sprint 30）|
| 卡片持有量系统 | MAX=3 + 碎片商店（Sprint 30a）|
| SP 双系统 | gacha 2% + Boss 解锁（Sprint 30b）|
| Conundrum 关卡 | 2 个 + 真实 effect 应用（HP/起手卡/预置敌方/抗生素减伤）|
| 敌方牌组审计 | 18 关全扫，修 5 关 AI 卡死 |
| Bugfix 实测 | 17 个（含蓝鲸关 3 连平衡 + ATK buff 永久叠加全游戏修）|
| 抽卡爽感 Phase A | 胶囊+翻牌差异化+SP 全屏事件+isNew 卡片秀+音效（Sprint 31b）|
| 抽卡爽感 Phase B/C | 章节 banner+进度条+概率公示+联动 DeckBuilder+里程碑+小测验+成就（Sprint 31c）|
| 全场景卡牌详情统一 | 5 场景共用 CardDetailModal + 5 slot 注入场景专属内容（Sprint 33）|

---

## 进行中
（无 — 成就三类 + 每日挑战核心闭环都已上线。等齐齐 iPad 实测反馈。每日挑战 **v2** 可补：硬阵营锁约束(改 DeckBuilder) / 未领推送 / 更多约束·敌池·主题内容填充）

---

## 已知问题

### 小问题
- 战斗日志 message 文本硬编码中文（100+ 条，spec 方案 A：不翻译）
- Vite dev 偶尔 504（已用 optimizeDeps.include 修复主要路径）
- preview 沙箱 HMR WebSocket 连不上（`[vite] failed to connect to websocket`）→ 热更新失效、浏览器跑旧模块，验证需靠 esbuild/纯逻辑/curl 取 Vite 实际服务模块。vite.config 加 `server.hmr` 配置或可修（工程支撑项）
- ~~`AI Diagnosis & Treatment` 的 `_grantSwift` 从没被读取 → 迅击没生效~~ ✅ 已修（改用 APPLY_STATUS+swift_boost，1dd6a98）
- ~~`sp_world_tree` 普遍 OP~~ ✅ 已修（spCost 4→6，b44c935）
- ~~skill engine `case 'BUFF'` 直接 +atk 永久叠加~~ ✅ 已修（atk_boost status + turns，b44c935）
- ~~所有对敌 ATK 减益静默失效（BUFF 无视 _side）~~ ✅ 已修（c978d5c，⏳ 待齐齐实测手感）
- ~~ATK buff 永久叠加 bug~~ ✅ 已修（atk_boost status + tick）
- ~~Conundrum effect enemyExtraTurns / antibiotic_weakened 未生效~~ ✅ 已修
- ~~星数 UI 显示满星~~ ✅ 已修
- ~~onDeath 技能事件按攻击方 side 错路由 + 被杀方场 .filter(Boolean) 删空位（干细胞分化/大肠杆菌分裂等所有 onDeath 召唤·复活·治疗失效）~~ ✅ 已修（a962f8c，⏳ 待齐齐实测分化落到自己场）

### 未覆盖功能
- 深度战役测试：Sprint 23-30b 的改动需要实战暴露 bug
- Card-designer skill 需在 Claude.ai 侧手动更新（反映 Sprint 26 新 subType + 30b SP unlockMode）
- bio-heroes-knowledge-map.md（KP_ID + NGSS + 中国课标对应表）尚未创建
- ~~ch3 Boss SP（sp_gaia_restoration 地球生态复原）未设计~~ ✅ 已完成（2026-06-21 续⁶，beb2239）

### 遗留数据层问题
- ~~关卡 ID 数据层混用 `stage_2_2` vs `2-2` vs `stage_2_7_vaccine_dilemma`~~ ✅ 已统一为 stage_X_Y + 老存档无损迁移（e90c372）

---

## 下次启动时优先

### 🔴 最优先：SP Phase B — 实现设计文档的三条触发（齐齐定「先A后B」，A 已于 2026-06-23 解封）
**背景**：`.claude/rules/battle-system.md` 写 SP 触发 =「连续答对2题 / 主人HP≤50% / 第8回合」三选一，触发后「从3张SP随机翻2选1」。**但代码完全没这套**——现状 SP 只能靠打出带 `spSummonRule` 的事件卡触发（Phase A 已把这条路从「永远出不来」解封）。
- **⚠️ 动手前先问齐齐的子决策**：三条触发是 **替换** 事件卡触发，还是 **并存**（事件卡 + 三条件都能触发）？这决定改法与工作量。
- **要做**：① quiz 连续答对计数（连2触发）② 主人 HP≤50% 检测 ③ 第8回合检测 ④ 触发后「翻2选1」UI（`pendingSpSummon` 状态 + 现有 SP 召唤弹窗可复用）⑤ 决定与现有事件卡触发如何共存（现有门槛已是"看费用" `spEarliestSummonTurn(spCost)=max(3,spCost−3)`，三条触发是否也走同一门槛/或各自独立，需定）。
- **关键文件**：`src/hooks/useBattle.js`（`getEligibleSpCards` L1089 / `playEventCard` L1308 / 答题觉醒逻辑 / turn 递增 L2018）、`src/components/BattleScreen.jsx`（SP 召唤弹窗 ~L1459 / 答题 modal）、`.claude/rules/battle-system.md`（设计源）。
- **验证**：扩 `scripts/test-sp-chain.mjs` 覆盖新触发条件；vite preview 实测三条触发各自能召出 SP，且 Phase A 的「不过早」不被破坏。

### 推荐方向 A：齐齐持续实测反馈（永远最高优先级）
- 抽卡完整闭环（Phase A+B+C）+ 全场景卡片详情（Sprint 33）+ 平衡 4 连修都已上线
- 让齐齐刷新 iPad → 验证：
  - **蓝鲸 boss 关**：不再一上来就被蓝鲸 + 霸王龙 + 世界树压死，T3-4 蓝鲸登场是真正"boss 时刻"？
  - **ATK buff 不再叠加**：自然系/人体系打完 buff 卡，下回合 ATK 回到 base，战斗日志「💪 攻击加成消失了」是否出现？
  - **全场景卡详情**：战斗/抽卡/卡组/图鉴 任意场景点卡都能弹一致的详情？
  - **Phase A/B/C**: SR/SSR/SP 反应？banner 期待感？小测验？成就科学包？
  - **⭐ 对敌 ATK 减益首次生效**（2026-06-09 修）：大花草·恶臭之花 / 诺如病毒 / 大流行病毒（全体 -2000×3 回合）/ 蜘蛛·织网猎手 / 登革热 / CRISPR / 超级细菌·耐药屏障 这批卡的减益现在真起作用了 → 战斗手感是否平衡？大流行病毒会不会太强？战斗日志「⬇️ XXX ATK -N」是否出现？
  - **关卡 ID 统一 + Conundrum 扩展后存档迁移**（2026-06-10）：⭐⭐ 最高优先肉眼确认——齐齐老存档的**关卡星数/解锁进度完整保留**（迁移已 v0/v1/v2 三版本 18 断言验证，但真机老存档务必确认一遍，尤其 ch3/ch4 boss 星数没被错算到新两难关）；闯关解锁链、Boss 关章节奖励、SP 通关解锁正常？
  - **ch3/ch4 新 Conundrum 两难关**（2026-06-10）：森林抉择/江豚的家/基因抉择/AI还是医生——选项的后果 effect 真生效（HP±/起手免费卡/预置敌人）？三选项手感是否都"有得有失"无白拿最优解？科学包齐齐能看懂？
  - **AI医生·智慧诊疗 迅击**（2026-06-10 修）：打出 AI 医生 + 场上有本回合刚出的高 ATK 友方 → 那张友方本回合能立即攻击？战斗日志「🤖 AI 诊断：XXX 获得迅击！」出现？
  - **英文模式一致性**（2026-06-10）：🌐 切英文后 进化链卡名/阵营/子类型/环境事件名 都是英文（不再露中文）？战斗浮字「Super! +20%」/抽卡概率公示/成就栏 等英文正常？

### ~~推荐方向 A++：推进 Sprint 32 题库扩充~~ ✅ 已完成（2026-06-21）
- Sprint 32 8 step 全部完成（详见上文 2026-06-21 段）
- 老 180 题 type 是近似映射（'legacy' tag），未来可以按真实题型逐道 review

### ~~推荐方向 A+++：ch3/ch4 题库扩充~~ ✅ 已完成（2026-06-21 续）
- 3 批 +189 道新题，卡覆盖 100% (136/136)
- 详见上文 2026-06-21 续段

### ~~推荐方向 A++++：老 180 题 'legacy' tag review~~ ✅ 已完成（2026-06-22 续，07db703）
- 180 道按严格认知动作重分类（153 mem / 23 mech / 4 inf），补 30 道 principle + 语义 tags，整个 480 题库已精分类。
- **留尾（内容升级）**：~~`outputs/legacy_quiz_rewrite_candidates.md` 的 17 道可改写候选~~ ✅ 已完成（2026-06-22 续²，52fbc16，16 道落地 / #95 剔除）。老题库的 mechanism/inference 题量已显著拉升。

### 推荐方向 A+：抽卡 Phase D / E（实测反馈良好后）
spec 已为后续预留：
- **Phase D**: 抽到稀有卡的"分享"功能（截图给妈妈/老师）
- **Phase E**: 限时活动 banner（按真实日期切换主题，比如世界免疫日）
- **boostFactor 真实加权**: 当前 Phase B 只显示不实际加权，等抽卡平衡测试通过后再开

### ~~推荐方向 B：扩展 Conundrum 内容~~ ✅ 已完成（2026-06-10，245c4a4）
- ch3（森林抉择/江豚的家）+ ch4（基因抉择/AI还是医生）各 2 关已上线，⏳ 待齐齐实测手感
- 后续若还想扩：ch1/ch2 也可补两难关；或给现有两难关加更多 effect 类型（需新引擎代码）

### ~~推荐方向 C：完整化 SP 系统~~ → 见上方「🔴 最优先：SP Phase B」
- ~~ch3 Boss SP 设计（sp_gaia_restoration + 蓝鲸 Boss 通关解锁空洞）~~ ✅ 已完成（2026-06-21 续⁶，beb2239）
- SP 系统剩余大缺口已收敛为 **Phase B（三条触发，见置顶）**。

### 推荐方向 D：新功能
- ~~成就系统（收集/战斗/答题三类勋章）~~ ✅ 已完成（2026-06-21 续²，9 新成就 + 三段展示 + 累计计数器）
- ~~每日挑战~~ ✅ 已完成（2026-06-21 续³，约束=Conundrum 复用 / streak / 周 SSR 券 / 当日主题问答彩蛋）
- 可选主人（生物学家/医生/猎人三种被动）— 增加玩法多样性

### 推荐方向 E：卡池扩展（中长期）
- Phase 2 扩展包 ~160 张（OCEAN 海洋深渊 + MICRO 微观战场）
- 进化链扩展（2 → 10+）

### 推荐方向 F：工程支撑
- card-designer skill 更新（Claude.ai 侧）
- bio-heroes-knowledge-map.md（KP_ID + NGSS + 中国课标）

---

## 关键文件变更（Sprint 32-33 + bugfix）

### Sprint 33 全场景卡片详情统一
- `src/components/CardDetailModal.jsx` — 加 actions/children/overlay/cardAnimate/closeOnBackdrop 5 个 slot + 通用渲染 scienceNote + factionRequirement
- `src/components/BattleScreen.jsx` — 场上/手牌卡加 ⓘ 角标
- `src/components/GachaScreen.jsx` — 改用 context/ownership/isNew props
- `src/components/DeckBuilder.jsx` — 删本地 CardDetailModal 函数（146 行），改用通用件 + actions slot
- `src/components/Collection.jsx` — 删本地 inline modal（278 行），children 注入进化链/碎片商店/进化按钮，overlay+cardAnimate 注入进化动画

### Sprint 32 ch2 题库扩充（8 step 全完成 2026-06-21）
- `src/data/quizzes.js` — 180 → 291 题（+111 道新题，按 ch2 51 张卡分三层：memo/mech/infer）；老 180 题批量补 type+'legacy' tag
- `scripts/validate-quizzes.mjs` — 题库校验脚本（字段完整性 / cardId 存在性 / faction 一致性 / 选项长度 gap / 答案位置分布）
- `outputs/ch2_quiz_audit.md` — Step 1 审计报告
- `outputs/ch2_quiz_validation.md` — Step 8 最终质量报告（0 错误 0 警告 / 73 张卡覆盖）

### ch3/ch4 题库扩充（3 批全完成 2026-06-21 续）
- `src/data/quizzes.js` — 291 → 480 题（+189 道新题，覆盖剩余 63 张卡，达成 136/136 = 100% 覆盖）
- `scripts/audit-ch34-cards.mjs` — ch3/ch4 审计脚本（同 Sprint 32 框架）
- `outputs/ch34_audit.md` — 完全无题卡按章节+阵营分组报告
- `outputs/ch2_quiz_validation.md` — 已扩充涵盖全部 480 题（脚本名仍叫 ch2 但实际是全量）
- 包含批次 C 后处理 node 脚本：批量重排 answer 位置消除 meta bias（inline 在 bash 命令中执行）

### 平衡修复
- `src/data/campaignData.js` — 蓝鲸 boss 关：去 sp_trex / 去 bossPreplaced / 清空 spDeck
- `src/data/eventCards.js` — 食物链爆发/免疫应答/科技革命 3 张 buff 卡加 effectTurns 字段
- `src/hooks/useBattle.js` — buff handler 加 atk_boost status，不再直接永久 +atk
- `src/engine/statusEffects.js` — 加 atk_boost case，按 turnsLeft tick 到期回退 atk
- `.gitignore` — 加 outputs/*.mjs 防一次性审计脚本污染仓库

---

## 关键文件变更（Sprint 31a-31c）

### Sprint 31a
- `src/components/CardDetailModal.jsx` — 新建（复用卡详情弹窗）
- `src/components/GachaScreen.jsx` — 卡片 onClick + ℹ️ 角标
- `src/components/TutorialScreen.jsx` — 气泡定位反转：upperAreas 才下沉

### Sprint 31b
- `src/components/GachaAnimation.jsx` — 新建（胶囊+翻牌+RARITY_EFFECTS+ParticleBurst）
- `src/components/CardShowcase.jsx` — 新建（isNew 全屏秀+TypewriterText）
- `src/components/GachaScreen.jsx` — animatingCards/showcaseCards state，handleAnimationDone
- `src/audio/soundManager.js` — capsuleCrack + cardFlip{Normal,Sr,Ssr,Sp} 五个新音

### Sprint 31c
- `src/data/gachaBanners.js` — 新建（4 章 banner + selectBanner 选择逻辑）
- `src/data/achievements.js` — 新建（5 个主题成就 + detectNewlyUnlocked）
- `src/components/MilestoneModal.jsx` — 新建（6 档里程碑庆祝）
- `src/components/AchievementModal.jsx` — 新建（成就解锁+科学包卷动）
- `src/components/GachaQuizModal.jsx` — 新建（中场小测 + selectQuizForPull）
- `src/components/GachaAnimation.jsx` — 加 paused/onMidpointReached/midpointAt props
- `src/components/GachaScreen.jsx` — banner UI + 进度条 + 概率公示 + onGotoDeckBuilder + 弹窗 useEffect 链
- `src/components/DeckBuilder.jsx` — 接收 highlightCardIds + onHighlightExpire（30s 自动取消）
- `src/components/Collection.jsx` — 顶部成就栏 + 详情可点开
- `src/hooks/useEconomy.js` — unlockedAchievements 字段 + markAchievementsUnlocked API
- `src/App.jsx` — highlightCardIds state + GachaScreen → DeckBuilder 跳转传 ID 数组

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
