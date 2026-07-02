# Bio Heroes 代码体检报告

- **日期**：2026-07-02
- **范围**：① 战斗引擎运行时正确性 / Bug ② 代码架构 / 技术债（快速全局体检）
- **方法**：3 个子代理分头审查（引擎正确性 / 架构技术债 / 数据↔技能一致性），每条结论追到 `文件:行号`；头号发现（ctx 修饰符丢失、MRSA 反弹、鲸鲨回血、i<3 五格、孤儿事件）由主审逐条读源码 + grep 独立复验。
- **状态基线**：27/27 断言测试绿、`vite build` 绿、git 工作区干净。

---

## 一、一句话结论

工程底子好（测试绿、build 绿、数据层干净、SESSION 提过的引擎 backlog 大多真修好了），但有一条**贯穿性病根**：

> **最大的 bug 和最大的技术债是同一个根**——整个战斗引擎焊死在 `useBattle.js` 这个 React Hook 里、无法单测，所以一个牵连十几张卡伤害数值的引擎 bug 安然通过了全部 27 个绿测试。27 套里 21 套只是把源码当字符串正则匹配、3 套测纯函数，**没有一套能真正驱动战斗结算**。测试的"绿"给了虚假的安全感。

因此「修引擎正确性」的前提，是先把引擎从 React 里剥出来能测。

---

## 二、客观健康信号（已直接验证）

| 项目 | 状态 | 备注 |
|---|---|---|
| 测试套件 | ✅ 27/27 绿 (`npm test`, 1.3s) | 实跑；但**测不到战斗结算逻辑** |
| Build | ✅ 绿 (~800ms) | 分包到位，各屏懒加载 |
| 数据层完整性 | ✅ 干净 | 124 卡技能全部能在 registry 找到 handler；POWER_CURVE 0 越界、全 500 倍数 |
| Git 工作区 | ✅ 干净 | main 与 origin/main 同步 |

**已修 backlog 复核（逐个确认，均属实已修）**：反击(Thorn Counter) side 路由 · 胸腺(T-Cell Training) 改抽牌 · 蛔虫(Nutrient Hijack) · 狂犬(Neural Hijack) 空壳 · Gene Correction 重复定义 · ENERGY_BOOST 静默丢失 · 死卡 cleanupDeadCards 竞态。

**审查为阴性 / 可放心项**：全部 event `type` 与 status `type` 都有 dispatcher 消费（无覆盖缺口）；`evolutions.js` 两链 5 个 cardId 全有效；dexSets 的 set/rewardAchId 均存在。

---

## 三、引擎正确性 Bug（按严重度）

### 🔴 P0 — 打卡时「无视护盾/守护、闪避、减伤、克制加倍、免疫」全部静默失效（根因级，牵连十余张卡）

**根因**：技能用**改 `ctx.<修饰符>`** 传递战斗加成，但 (a) `triggerSkills`（`src/engine/skillTriggers.js:65`）给每个 handler 传的是 `{...context, card}` **拷贝**，改动传不回调用方；(b) 打卡结算 `calcCardBattle`（`src/utils/damage.js:71`）**根本不接收**这些字段，调用处 `src/hooks/useBattle.js:1795` 也不传。

grep 实测：**生产端 13 处赋值，打卡路径消费端 0 处**。受影响的招牌效果（攻击敌方**卡牌**时）：

| 效果 | 代表卡 | 位置 |
|---|---|---|
| 无视护盾 | 新冠·刺突蛋白 Spike Protein | `skillRegistry.js:743` |
| 无视守护 | Antigen Lock-on / Precision Excision | `skillRegistry.js:782, 827` |
| ATK ×1.5/×2 克制 | 酸蚀 / 广谱歼灭 / 纳米精准 / PCR / 深渊之眼… 十余张（`conditionalAtk`） | `skillTemplates.js:265, 271` 等 |
| 30% 闪避 | 变形虫·伪足变形 Pseudopod Morph | `skillTemplates.js:706` |
| 50% 减伤 | 含羞草·闭叶 Leaf Fold | `skillTemplates.js:677` |
| 免疫科技系 | MRSA·耐药壁垒 | `skillRegistry.js:759` |

**玩家视角**：卡面写"无视护盾"，护盾却照挡——违背 CLAUDE.md 的"机制即知识"原则（卡面教的生物学 ≠ 实际机制）。直攻主人时倍率类走另一条**粗糙的 flat ×2**（`useBattle.js:1754`，不看技能想要的比例，想要 ×1.5 的也被拍成 ×2）。

**建议**：让 `triggerSkills` 返回被 handler 改过的 ctx（或改成事件式表达修饰符），并给 `calcCardBattle` 增加 `damageMultiplier/ignoreShield/ignoreGuard/dodged/damageReduction` 参数，在护盾吸收/守护判定/扣血前读取。**建议等引擎能单测后再动**（见第四节 P0）。

### 🔴 P1 — MRSA·耐药壁垒：反弹 50% 打错场 + 免疫失效（两个代理独立发现 + 主审复验）

`skillRegistry.js:766-771` 发的反弹事件用 `_side:'attacker_side'`，但 `useBattle.js:362` 只认 `'attacker'` → 落到 `enemySetter`，**打到防守方自己那一侧**；且 `ctx.enemyField` 未传导致 `targetSlot` 退化成 0，打错格。免疫那半依赖 P0 的 `damageReduction`（丢失）。**招牌三重错**。是 `onHitCounter` 模板早修好、这个内联 handler 漏改的残党。
**建议**：`_side` 改 `'attacker'`；`targetSlot` 查 `ctx.attackerField`；免疫并入 `damage.js:isImmune`（对 tech）。

### 🔴 P1 — 鲸鲨·滤食守护：每回合 1500 回血从没实现

`skillRegistry.js:36` 只有 `{ timing:'passive' }` 无 `execute`，只进了守护白名单（`utils/guardSkill.js:9`）；注释自承 `→ Phase 2 passiveAura`（没接上的 TODO）。8 费 SSR 肉盾的回血完全不发生。
**建议**：仿 `Biofilm Shield` 拆两条，补一条 `onTurnEnd` 的 `passiveHeal(self, 1500)`。

### 🟠 P1 — 注射劫持 / 骨髓造血：战场 5 格却只扫前 3 格

`skillRegistry.js:199`（Injection Hijack）和 `:225`（Marrow Hematopoiesis）硬编码 `for (i<3)`，而 `deckRules.MAX_FIELD_SLOTS=5`。若 0–2 格已满、3–4 格空 → 静默不召唤。通用模板 `findEmptySlot` 用的是 `field.length`，这俩内联 handler 是漏网。
**建议**：`i<3` 改 `i<friendlyField.length`（或复用 `findEmptySlot`）。

### 🟠 P2 — 一批「描述≠实现」的半截效果（均 CONFIRMED）

| 卡 / 技能 | 问题 | 位置 |
|---|---|---|
| 长老记忆 Elder Memory | 从弃牌堆"取回手牌"是空操作——`_reviveToHand` **零消费者**（grep 实证） | `skillTemplates.js:894` |
| 信息素召集 Pheromone Rally | 召唤后没从手牌删除——`_removeFromHand` **零消费者** → **一卡变两卡** | `skillTemplates.js:928` |
| PCR·核酸扩增 | 卡面"标记目标下回合 +1000"完全没实现（用了只加伤的 conditionalAtk） | `skillRegistry.js:321` |
| 物种大爆发（事件卡） | 卡面"翻 3 张、自然系入手、其余回底"被简化成 `drawCards(2)`（注释自承 simplified） | `useBattle.js:1028` |

### 🟡 P3 — 次要 / 可接受项

- **玩家混乱卡攻击**：`canAttack` 不拦 `confused`，玩家点敌方卡后被静默改打随机友方，中途无提示（`useBattle.js:1705`）——是设计但交互该给提示。
- **CRISPR·基因编辑 ATK↔HP 互换只做一半**：HP 只降不升（注释标了"简化"，两代理都点到，`skillRegistry.js:639`）——SUSPECTED，取决于是否接受简化。
- **中毒穿护盾** + **atk_boost 到期回退可能超调**（`statusEffects.js:24, 155`）——低频。
- **14 张卡 `evolutionTo` 指向不存在的卡**：纯装饰死数据（从未被读取），不崩不显，只误导维护者。建议清成 `null` 或补进 `EVOLUTION_CHAINS`。

---

## 四、架构 / 技术债（按杠杆排序）

### 🔴 P0 — `useBattle.js`（2339 行）把整个引擎焊死在 Hook 里，核心逻辑不可单测

**量化**：单 Hook 25 useState + 34 useRef = **59 个状态槽**、29 useCallback、0 useMemo；回合流转/AI/事件派发/死亡结算/Boss 规则/问答/SP 全是 Hook 内闭包。**30 个测试脚本无一能驱动它**。这是所有引擎 bug 的藏身之处。
**改造方向**：把纯逻辑抽成不依赖 React 的 `battleReducer(state, action)` / `BattleEngine`，Hook 只做 `useReducer` + 副作用桥接；测试直接 import reducer 断言。**这一步同时解锁引擎 P0/P1 的可验证性。** 〔大改 🔴 · 最高杠杆〕

### 🔴 P1 — state↔ref 双写镜像 + 泄漏 15 个原始 ref

`useBattle.js:57-161` 有 14 处 `xRef.current = x` 每次 render 手动同步 12 个 state；返回对象向 `BattleScreen` 泄漏 15 个原始 `*Ref`，封装被击穿、双向强耦合。漏同步一处即"时灵时不灵"竞态。〔中 🟠，随 P0 一起做最省〕

### 🔴 P1 — 死亡结算：40 行踩坑注释 + 18 处 no-op 桩

`cleanupDeadCards` 现为空函数（`useBattle.js:253`），但仍有 **18 处历史调用**在调它；真逻辑挪到挂着 40 行 React 批处理踩坑史的 useEffect。全文件最脆弱、历史 bug 重灾区，接手极易踩回老坑。〔中 🟠〕

### 🔴 P1 — `BattleScreen.jsx`（1840 行）god component

59 个 Hook、**单个 return 862 行 JSX**、**200 行 AI 决策塞在一个 useEffect 里**、玩家/敌方战场渲染重复约 125 行。改 UI 怕碰坏 AI。
**改造**：AI 抽 `useAITurn()`、`LeaderPanel`/`FieldRow` 拆分并参数化 side。〔大改 🔴〕

### 🟠 P2 — 其余结构债

- **玩家/AI 双份近重复**：`attack`(175 行) vs `aiAttack`(146 行)、`playToField` vs `aiPlayToField` 复制粘贴；`side==='player'` 分支 64 处 → 改规则要改两遍，易生"玩家能 AI 不能"的不对称 bug。合并成 `resolveAttack(side, ...)`。
- **技能系统迁移半截**：registry 里 113 处走模板、**52 处仍是内联老写法**并存；字符串 `nameEn` 派发拼错静默 no-op、无编译期保护。收敛 + 加"注册即校验"启动断言。
- **i18n 形同虚设**：`zh.json/en.json` 351 行全是 UI chrome、**0 条卡牌/技能字符串**；124 卡名 + 82 技能名全硬编码在 cards.js。"双语"实为中文单语，真做英文得人肉抽 400+ 处。

### 🟡 P3 — 工具链 / 文档（本次已顺手处理前两项）

- ✅ **gsap 死依赖**：已从 package.json 移除（src 零引用）。
- ✅ **无统一测试入口 / 无 CI**：已加 `npm test`（`scripts/run-tests.mjs`）+ `.github/workflows/ci.yml`（test + build 门禁）。
- **Bundle 对低端设备偏大**：主 chunk 162KB gzip + quizzes 143KB gzip；`vite.config.js` 的 `manualChunks` 只切 react/framer，3307 行 cards.js 全压主包。可加一轮数据分包。
- **SESSION.md 已 125KB / 913 行**：每次开会话都读，顶部叠十几层"历史更新时间"。已补 `ARCHITECTURE.md` 作为精简架构地图；旧层建议归档进 CHANGELOG。

---

## 五、建议动手顺序

1. ✅ **立地基**（本次已做）：删 gsap · 加 `npm test` + CI · 写 `ARCHITECTURE.md`。
2. **P0 剥引擎**：把战斗逻辑抽成可单测的 `battleReducer`——解锁后每修一个引擎 bug 都能加回归测试锁住。顺带消化 ref 双写(P1)、死亡结算桩(P1)、玩家/AI 去重(P2)。
3. **带着测试修引擎 P0/P1**：ctx 修饰符打卡失效（十余张卡）→ MRSA 反弹 → 鲸鲨回血 → i<3 五格 → 孤儿事件那批。
4. **拆 `BattleScreen`**：AI 抽 hook、战场行组件化。

---

*本报告由 3 个并行审查代理产出、主审逐条复验。所有 `文件:行号` 基于 2026-07-02 的 main 分支。*
