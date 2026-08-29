# Bio Heroes CHANGELOG

Bio Heroes 历史 Sprint 完成记录，最新在最上。
当前进度 / 下次优先事项请看 `SESSION.md`。

---

## 开发文档对账 + 守卫（2026-08-25 → 08-28 上线）✅ `93ca430`
> `test-copy-truth` 管给玩家看的文案，这条管**给开发者看的文档** —— CLAUDE.md 和 `.claude/rules/*.md`
> 是每次会话的**输入指令**，写错一个常量，后面所有基于它的设计和平衡计算都会跟着错。

走查抽卡/图鉴时顺手对账，**六处漂移全部为真**：`MAX_FIELD_SLOTS` 文档 5 / 代码 **6**（最危险）·
cards.js 文档 104 / 实际 **124**（三处）· spCards 16 / **17** · 闯关 23 关 / **29 关** ·
抽卡概率 85/12/3 / **R68 SR25 SSR5 SP2**（文档还整个漏了 SP 档）。
⚠️ **游戏内给玩家看的概率公示一直是对的**，错的只有开发文档。顺带标注「高级包没有实现」。

顺手修掉一个真会被看见的：`GachaScreen` 图鉴进度条漏了 `initial`，framer 从元素**自然宽度**
（100%）动画到真实值 → 每次打开先闪一下满格。生产实测内联样式 `width: 12.7389%`（= 20/157，
挂载即真值），改前是 `width: 329.657px`。

**守卫 `test-docs-truth`（39 条，6 个变异先红后绿）**：逐条对账「文档数字 == 代码真值」·
抽卡概率逐档对齐 `RARITY_WEIGHTS`（为此把它 export，守卫读真常量不抄一份）· **双向都抓** ·
所有宽度动画必须写 `initial` · **每条都带「正则匹配不到就报红」的自检**。

☠️ 写这条守卫时自己踩了两个假绿，都被变异测试当场抓到：
① `2%` 匹配到了表格里的 `12%` —— 数字型 grep 必须带边界；
② 检查 `initial` 时没去注释，而我自己的注释里就有「initial={false} 不能省」，把那行删掉都不变红。
**这是本项目第三次被自己写的注释骗** —— 已成铁律：**任何 grep 型断言一律跑在去注释的源码上**。

📋 同时新增 `docs/PLAYTEST.md`：一周内六层界面全部由 Claude 走查驱动改完，而齐齐的反馈积压 3+ 周
一条没收。守卫防得住回归、防不住方向错，所以列了一份**观察清单**（不是考试）：
他能不能自己走完「打开→打一局」· 教学五关 · 三个没底的取舍（事件卡截断 / 一键组卡强度 / 虎鲸数值）。

---

## 事件卡统一到 cqh：文字不再压到卡外（2026-08-23 → 08-25 上线）✅ `e1a4b6d`
> SESSION 待办里挂最久的一条。先验它还成不成立 —— **成立，而且比记的严重**。

**病根：无界内容装进有界卡框。** P1 A 把战场卡卡内全改成 cqh（内容总高 = 常数 × 卡高 →
结构上不可能溢出），P1 B 把手牌卡外框锁成 5:7。但**卡内**一直没跟上：手牌卡字号仍是固定 px，
而事件卡的 effectDescription 从 6 字到 54 字不等、**没有行数封顶**。

实测（iPad 横屏 1024×768，手牌卡框仅 115px）：生物卡「猎豹」离卡底还剩 11px；
事件卡「发烧反应」溢出 **43px**、「干细胞分化」**54px**、「基因突变」(54字) **77px**
—— 文字整片压到卡外、盖住底部状态栏。768×1024 竖屏「基因突变」也溢出 4px。
另：**换卡弹窗**（每局开场第一屏）里的卡此前没有任何尺寸约束，事件卡被撑成 251×105（比例 2.39
的横条），生物卡 81×96。

**做法**（与 P1 A 同源，作用域换成手牌 + 换卡弹窗共用的 `data-cq-card`）：卡成为命名 size 容器
`bh-card` · 每行 `max(px, N cqh)` · 事件卡描述**行数封顶**、外边距也跟卡走 ·
「🌟 可触发SP」行补钩子 · 矮卡降级阈值 118px · 换卡弹窗给同一个 5:7 定尺寸框。

☠️ **两个判断值得记**：
① **px 下限按「不低于改之前那一档」定**。纯按 cqh 算，横屏名称会从 12px 掉到 9.8px ——
   为了统一把字改小是亏的（齐齐 7 岁，可读性优先于一致性）。
② **余量 0 不算通过**。抬高下限后横屏档 3 行描述的内容底边正好贴卡底（余量 0），
   换个设备的中文字体回退就会翻车 —— 靠降级到 2 行拿回 ~12px 才算数。

| 视口 | 卡框高 | 名称字号 改前→改后 | 事件卡余量 改前→改后 |
|---|---|---|---|
| 375×812 | 122 | 9px → **12px** | -21 → -23 |
| 768×1024 | 154 | 12px → **13.1px** | **+4 溢出** → -15 |
| 1024×768 | 115 | 12px → 12px | **+77 溢出** → -14 |
| 1180×712 | 110 | 12px → 12px | 溢出 → -12 |

**守卫 `test-hand-card-cq`（42 条，7 个变异先红后绿）**：钉的是不变量不是像素 ——
cqh + px 下限 · 行数封顶 · min-height 覆盖 · **系数之和 < 100 的算术证明** ·
降级阈值必须盖住横屏两档 · 换卡弹窗有定尺寸框 · 反向锁「不许顺手改战场卡那套 P1 A 规则」。

☝️ 部署纪律再验证一次：**Card.jsx 单独成 `Card-*.js` chunk，不在 entry 里** ——
功能级回验必须先 `grep -l 关键字 dist/assets/*.js` 找承载 chunk，别默认在 entry 搜。

---

## 闯关这条路：指路指到已删的按钮 + 一键组卡不看关卡推荐 + 介绍页数字过期（2026-08-23）✅ `a6cfa2a`
> 走了一遍闯关（齐齐的主线内容）。先说没坏的：前一天改的卡组界面**没有回归** ——
> 闯关 → 一键组卡 → 正确进入对应关卡，今日挑战路径同样正常。

- **文案指向一个已经不存在的按钮**（自己造的）：闯关关卡弹窗写着「去『🃏 卡组』创建你的专属卡组」，
  而那个首页按钮前一天已被合并进「⚔️ 自由对战」。改代码时搜了**引用**，**没搜文案**。
  → 改指下一屏真实存在的「⚡ 一键组卡，马上开打」。
- **一键组卡不看关卡的推荐阵营**（数据早就有，没人读）：每关 `playerConfig.recommendedFactions`
  都写好了（ch3 有 nature/tech、body/nature，几关只推荐 tech），但一键组卡**永远先试 body+tech**。
  第二章碰巧全是 body+tech 所以看不出来，**第三章就配不上**。
  → App 透传该关推荐，一键组卡把它放候选组合最前面；⚠️ 兜底组合不能删（单阵营推荐凑不满 25）。
- **开场介绍页数字过期**：写「60张卡牌」「17个关卡」，实际图鉴 **157** 张、闯关 **29** 关 ——
  齐齐读到的第一屏。→ 文案改 `{n}` 占位符，从 `TOTAL_DEX_CARDS` / `campaignData` 现算。

**守卫 `test-copy-truth`（18 条，6 个变异先红后绿）**：① 文案里「」引的**带 emoji 的界面名**
必须在现存文案里真实存在 —— 这条防的是「改入口忘了改指路」**一整类**问题；② 介绍页数字必须来自
真相源；③ 关卡推荐的透传与优先级 + 兜底仍在。
☠️ **这个守卫自己踩了两个坑，都被它自带的「防摆设」断言当场抓出来**：
· emoji 范围漏了扑克牌区 U+1F0A0–U+1F0FF（🃏 = U+1F0CF）→「🃏 卡组」压根没被扫到；
· 判「存在」时写了反向的 `name.startsWith(v)`，而 i18n 里有个空串（`science.chineseOnly = ""`）
  —— 任何字符串都 `.startsWith("")`，整条断言被撑成永远绿。
**写守卫时加一条「一处都没抓到 = 正则失效」的自检，这次值回票价。**

☝️ 部署纪律补充：**「算出来的数」不能在 bundle 里 grep**。`157` 是运行时从图鉴数据算的，
entry 里数不到 —— 这类只能在页面上验。

---

## 卡组线：一键推荐组出非法卡组 + 新玩家撞墙 + 存量卡组体检（2026-08-22）✅ `b625215` `7baca27`
> 首页重构完之后顺着走了一遍**新玩家的路**，第一扇门后面全是问题。

### 🔴 真 bug：「推荐」产出同名 5 张（上限 3）
全新存档 → ⚔️ 自由对战 → ➕ 新建 → 🧬⚗️ 推荐 → 25 张里 **皮肤·第一道防线 ×5**；
保存后卡组列表照样给「⚔️ 出战」，可以直接带这副非法卡组开打。
**根因**：候选 `candidates` 在内层循环**外面**只算一次，那句「同名 < 3」用的是**空卡组的陈旧快照**。
某费用段只有一张候选时（新玩家 body+tech 的 cost 3 正是），`i % 1` 一直取同一张，目标要几张塞几张。
手动点卡不会中招（`canAdd` 用实时计数）—— **只有推荐这条路会**，所以 grep 抓不住，必须真跑函数。
→ 候选改为**每一张都重算**；函数抽成纯核心 `src/utils/recommendDeck.js`
（原来埋在 .jsx 里，Node 起不来 renderer = 一行测试都没有）。

### 🟡 新玩家第一次点进卡组界面是堵墙
实测：**10 个一模一样的「空卡组 ➕ 新建」**铺满整屏；唯一能立刻开打的入口是最底下 **12px 灰字**
（iPad 竖屏 y=912 贴底边，手机竖屏还要往下滚 116px）；一键「推荐」是 **10px** 按钮且藏在「新建」之后。
→ 无卡组时给主按钮「⚡ 一键组卡，马上开打」：用**他自己拥有的**卡组一副合法卡组、存进第一个空槽、
直接出战，打完还留着一副能编辑的（「我的第一套」）。卡不够凑满 25 就**退回默认卡组**，绝不点了没反应。
→ 槽位只渲染「已有的 + 一个新建位」；编辑器里的「推荐」从 10px 放大。
**新玩家现在两下开打**（首页「自由对战」→「一键组卡」）。

### 🟢 存量坏卡组：标出来 + 一键修好
生成器修好了，但**已存进 localStorage 的卡组不会自己变好**。新纯核心 `src/utils/deckHealth.js`
（`findDeckIssues` / `repairDeck` / `findUnhealthySlots`）：打开界面逐槽体检，超限的挂橙色警告并
**说清是哪张、多了几张**；「⚔️ 出战」换成「🔧 一键修正」，修完立刻落盘、出战自然回来。
☠️ **修正最容易做错的是只削不补**：削完 25 → 23 张，而出战要求正好 25 —— 孩子会发现
"卡组突然不能出战了"，比不修更糟。所以削完必须补回 25，且只能用他自己拥有的卡。

### 🟢 初始礼包的注释在说谎
`useEconomy.js` 写「25张，刚好够组一副主卡组」、分组 7/7/5/5，实际 5/5/4/4 + 2 事件卡 = **20**
（首页的「收集 20 张」才是真的）。清单抽成纯数据 `src/data/starterPack.js`，应用和守卫读同一份。

### 守卫（三套 81 条，13 个变异逐条先红后绿）
`test-deck-recommend` 32 · `test-deck-firstrun` 18 · `test-deck-health` 31。
关键在**用真实初始礼包跑真函数**：守卫写成时在未修代码上抓到的正是浏览器里那个 `skin_barrier×5`，
对抗式用例（只拥有 1/2/3 张该阵营卡）还抓到 ×6。修正侧钉死**幂等**（修两次结果一样，否则每次
打开界面都在改存档）与**合法卡组一个字节都不许改**。
☠️ 「超限不许出战」那条一开始写成 `/issues/.test(db)` —— 太松，把闸门拆掉都不变红，
**变异测试当场抓到**，已改成检查闸门本身（`!issues &&`）。这就是为什么新守卫必须配变异测试。

☝️ 部署踩到一次假警报：`curl` 报 `Could not resolve host`（status=000）而 `dig` 解析正常 ——
本机 resolver 抽风，不是站点挂了。用 `curl --resolve <域名>:443:<IP>` 绕过；
⚠️ 该参数要直接写在命令里，塞进 shell 变量再展开会被当成单个参数而报 unknown option。

---

## 首页重构：10 个按钮 → 6 个 + 一个「⚙️ 更多」浮层（2026-08-21）✅ `142d25a`
> 首页把 10 个按钮堆成一列（7 种颜色、宽度全一样），「我现在该点哪个」这个问题首页答不上来 ——
> 而玩家是 7 岁的齐齐。查下来三宗罪都是实测出来的，不是观感：

- **重复入口**：`App.jsx` 里 `onStartBattle` 与 `onOpenDeckBuilder` 是**同一行代码**
  （都 `setScreen('deckBuilder')`）→ 两个按钮、一个界面；而且点「⚔️ 自由对战」落到的界面标题写着
  「🃏 卡组管理」。→ 合并成一个入口；DeckBuilder 补副标题「选一套出战，或编辑卡组」
  （从首页 / 抽卡 / 闯关三条路进来都成立）。
- **iPad 横屏首页必须滚动**：1024×768 文档高 **924 > 768**，「📚 教学」被切 4px、
  「⚙️ 存档管理」整个在屏幕外（y=784）。→ 重排后 768，三个视口都不滚动
  （手机 375×812 底 568 · iPad 竖屏 768×1024 底 726 · 横屏出界全为 0）。
- **家长工具混在孩子的按钮里**：「🧪 测试场（家长）」夹在图鉴和教学之间占黄金位。

**分层**：第一层「现在玩什么」= 🏆 闯关战役（做成最大，主线的默认答案）· 🎯 今日挑战 ·
🔗 联机对战 · ⚔️ 自由对战；第二层 = 🎰 抽卡 + ⚙️ 更多（两列）；📚 教学**仅未毕业时**留首页。
新组件 `MoreMenu.jsx`（fixed 浮层）收纳：📖 图鉴 · 📚 教学（已毕业时）· 🌐 语言 ──
家长专区 ── 🧪 测试场 · 存档导出/导入/重置 · 题目范围。
图鉴收进浮层后只剩一个入口 → 货币行的「收集 N 张」做成可点入口补上。

☠️ **浮层必须 fixed，不能沿用旧的内联展开**：内联展开会把首页撑高，横屏当场溢出。
☠️ **家长门抽成共用 `parentGate()`**，测试场和题库模式都过同一道门 —— 搬家时最容易丢的就是它。
顺带把「🔗 联机对战」的内联中文补成 i18n 键 `menu.pvp`，删掉不再使用的 `menu.deck`。

**守卫 `test-title-menu.mjs`（48 条，7 个变异逐条先红后绿）**：首页按钮预算 ≤7 ·
家长/存档工具不得留在首页（**按 import 判，不按源码位置切** —— helper 函数都写在 JSX 之前，
按位置切会把 `handleReset` 算进首页区）· 每个入口 prop 仍被真正调用（「藏进二级」不许变成「藏没了」）·
`onOpenDeckBuilder` 不得复活 · 浮层必须 fixed 且自身可滚 · 教学按毕业状态收放且两处不同时出现 ·
收集数是图鉴第二入口 · 两个家长入口都过门 · 中英文键齐 · DeckBuilder 副标题存在且真渲染。
`test-test-arena ④` 跟随搬家（不是放宽：门和入口都还在，另加「TitleScreen 仍透传 onOpenTestArena」）。

☠️ **排查血账**：无头 tab 里点浮层背景「关不掉」，一度以为是 bug。真因是 **rAF 冻结 → framer
的退出动画跑不完就不卸载**。去读 React fiber 求证又踩第二个坑：**React 交替两棵 fiber 树，
只读 `current` 会读到旧值**（`alternate` 上才是新的）。最后用「临时去掉 exit 动画重新构建」隔离，
确认背景点击与 ✕ 都正常；还原后 bundle hash 逐字节回到原样。

---

## 教学「不说谎」四修 + 指向箭头（2026-08-21）✅ `833e309` `1bbddf1`
> 四处都不致卡死，但都是**屏幕说的和游戏认的不是一回事** —— 对 7 岁的玩家来说，这比崩溃更难受。

- **高亮打在空气上**：L3 step0 说「敌方有一张守护卡🛡️——你只能先攻击它」并 `highlight:'enemy_slot_1'`，
  而组件只认 `enemy_field`/`enemy_leader`，屏幕上什么都不亮。→ 按槽位点亮；并把 `enemy_slot` 加进
  气泡「放底部」列表（否则气泡停在 top 8%，正好压住刚点亮的那张卡：实测目标 y=83 vs 气泡 65~194）。
- **死字段 `targetCardIdx`**（数据 3 处 / 组件 0 引用）：写的人以为钉住了出牌顺序，实际点哪张都过。
  → 删字段，改由孩子看得见的 `highlight:'hand_card_N'` 收紧可点范围 —— 那些卡本来就压暗成
  `opacity-30 grayscale`（和 🔒 锁卡一个样）却照样点得动。**收紧带退路**：被点名那张出不起时退回
  「随便出」，否则会绕过 `play_card` 的逃生阀锁死步骤。
- **`clear_field` 可点主人绕过**：点一下敌方主人就推进到「场上清空了！」而敌人还站着，且下一步是
  `direct_attack`、点敌方卡不再攻击 → 剩下的敌人永远清不掉。→ `isClickable` 与 `handleLeaderClick`
  都不再受理；主人的红框 + 闪 TAP 改由 `leaderTargetable` 决定（**堵住点击还不够，邀请也要撤掉**）。
- **`arrow` 是第 4 个死字段**（数据 54 处 / 全项目 0 引用）：实装成指向箭头，但方向**不复用那 54 个
  手写值** —— 它们已和布局漂移（`play_card_1` 标 'up'，可那步气泡在屏幕顶、手牌在最底 = 指反）。
  改为被高亮元素带 `data-tut-lit`、`useLayoutEffect` 量它与气泡的相对位置、取「不重叠间距」更大的轴。
  两轴都要判：energy/SP 行与底部气泡在竖直方向**重叠**，只比 dy 会指到自己身上（实测该步正确给 'left'）。
  箭头还沿气泡边滑到目标中心（夹 12%~88%）。54 个字段连同注释删除。

**守卫 46 → 94 条**（每条先在未修/变异代码上变红）：③-6 每个 highlight 必须有渲染分支 ·
③-7 每个步骤字段必须真被消费（死字段登记表现已清空）· ③-8 绕过不得回归 · ③-9 手牌收紧且带退路 ·
③-10 每个高亮元素必须可被量到 · ③-11 方向必须量出来、不得写回数据。
☠️ **③-0：这些锚点一律跑在「去掉注释后的源码」上** —— 写修复注释时提到 `targetCardIdx` /
`clear_field`，当场把 ③-7 骗绿、③-8 骗红各一次。注释里提到一个名字 ≠ 代码在用它。
☠️ **hook 位置**：`bubbleRef`/`arrow`/`useLayoutEffect` 必须在**所有早期 return 之前**。第一版写在
战斗渲染段（已在 phase 的四处 return 之后），进关卡时 hook 数量突变 → React #310 → 整个教学被
ErrorBoundary 接管。**守卫 grep 不到这种事，是 preview 走查抓出来的。**

---

## 4g host 自恢复：刷新页面接着打（2026-07-31）✅ `ae6dad5` `639e2bc` `e994dfb`
> PvP 是 host 权威，而整条 PvP 路径此前 **localStorage 零使用** —— host 一刷新页面（4g 切网 /
> iOS 回收标签页 / 误触后退 / 手机没电重开），中继凭证和整棵棋盘一起蒸发，对局直接死。

**推翻了原计划（relay/README 末尾的「热备发给 guest 接管」），三条理由：**
① 热备必须把 host 手牌、双方抽牌堆顺序、SP 卡组内容、**问答答案卡**持续发过网，而 `wire.js`
   从第一行起的全部设计就是让这些「在形状上不可表达」（PRIVATE_KEYS / SELF_SPEC 白名单重建 /
   assertPublicShape 跑在每一次推送上 / quizGate 脱敏投影 + 四套测试）。**加密救不了** ——
   能解密的钥匙必须在 guest 手上，否则他接管不了。
② 中继侧**本来就支持 host 接回**：`rooms.js:119` 的回收时钟只在**两槽全空**时才启动，
   host 掉线只置空 connId、**token 原封保留**，guest 还连着 → 房间永不回收。缺的只有
   「新页面记得自己是谁」。中继零改动这条承诺，自恢复同样满足。
③ 热备最难的部分不是传输，是 `usePvpHost` 的**座位反转**（~20 处写死「我=PLAYER」），
   而那正是全项目**唯一没有 side 棘轮保护**的 PvP 文件。自恢复是热备的**真子集** ——
   序列化那 80% 将来一行不浪费。

**分三层落地：**
- **纯核心** `src/engine/matchSnapshot.js`：两张清单（RESTORED/NOT_RESTORED）是「必须恢复什么」的
  单一真相源；三个 JSON 往返陷阱（Set→数组、quizGate 的 -Infinity 哨兵、环境事件只存 id）；
  游标只往小里猜（lastN 猜大 = guest 点什么都被判 dup、界面永久卡死）；readSnapshot 四道拒收闸。
- **恢复面**：`battleReducer.HYDRATE`（**按初始形状收口**，多余键丢弃 —— 直接 `return action.state`
  会让下一帧推送的 assertPublicShape 抛错、被吞进 console.error、**guest 静默冻屏**）·
  `useBattle.snapshotEngine/hydrateEngine`（reducer 树 + 19 项树外权威状态）· `useHand.hydrate`
  （三堆原样放回，不洗牌不重抽）· `usePvpHost` 的 `adapterRef`（7 个游标）。
- **接线**：`relayClient` 的 token 注入（**硬阻断点**：中继把无 token 的 role=host 一律当建房且
  忽略客户端给的 room → 只传 code 会静默铸新房）· `matchStore`（节流 + 登记 NON_SAVE_KEYS）·
  `BattleScreen.skipInit`（那个初始化 effect 会 initHand+startBattle 把刚恢复的一切清成新局）·
  `PvpLobby` 的「🔄 继续上一局」+ **C1 快照与房间码解耦**（中继重启导致 no-room → 开新房、棋盘不丢）。

**☠️ 这个方案唯一的高风险点是「漏一项 = 静默改规则」**：reducer 树之外挂着十几个权威 ref，
丢了棋盘上完全看不出异常（答案卡丢 → 那道题永远判不了卷；pendingAttack 丢 → guest 那一击凭空消失；
virusOutbreak 丢 → 每回合 -500 静默停掉；processedDeaths/__fieldUidSeq 丢 → 重复亡语、uid 撞车）。
故 `test-match-snapshot`（111 条）逐条比对 useBattle/usePvpHost 里的**每一处声明**，
新增一个没登记就变红；另有反向锁防「清单项改名后变成谎言」。9+1 个变异全部先变红后才提交。

**真机端到端**（本地中继 + preview 双标签页）：建房 → guest 加入 → 开战 → host 出牌 →
**刷新 host** → 续局 → 战场卡 uid / 手牌 uid / 抽牌堆前三张顺序 / 回合 / 能量 / 房间码 / matchId
**逐字一致**，guest 全程没掉；续局后 guest 出牌 → intent 到达 host（日志与敌方战场更新、lastN 推进）。
再 kill 中继重启 → 续局回原房失败 → 自动开新房 + 横幅 + 快照仍在。

**救不了**：host 设备永久不可用 · 双方同时离线超 60~120s 被回收（有 C1 兜底）· 清站点数据/隐身模式。

---

## 教学两处硬卡死 + 转屏提示方向修反（2026-07-25）✅ `a4df51f`
> 本轮的起点只是"给教学的卡死复发模式补个 source-grep 守卫"，结果守卫写成的当天就在**线上正在跑的**
> 数据里抓出两处 100% 复现的硬卡死 —— 齐齐上次卡在 L3 守护提示，修完接着往下走就会撞上 step7。

**两处死锁（对抗式穷举查出，先红后绿）：**
- **L3 step7 `free_attack`**：energy 4 而手牌 cost 4/3/2 → 最便宜两张 =5>4 → 场上**永远只有 1 张卡**；
  它在 step5 打守护时 uid 已进 `attackedThisTurn`（中间无 end_turn 不重置）→ step7 选不出攻击者。
  → `playerEnergy` 4→**7**（最贵两张 4+3=7，保证不论先点哪张都出得起两张）。
- **L5 step5 `play_event`**：energy 5 而手牌 1+1+4=6（事件卡真实 cost 4，注释误写「2费」），
  步骤 3/4/5 三连出牌之间没有 end_turn 回能 → 任何顺序都剩一张出不起。→ `playerEnergy` 5→**6** + 修注释。
- 两处都**没有逃生阀**（只有 play_card 有），结束回合按钮又只在 end_turn 步可点 → 唯一出口是「跳过教学」。

**新守卫 `scripts/test-tutorial-solvable.mjs`（46 条）：** 这类 bug **grep 抓不住**（语法完全合法，
是"预算算术 vs 步骤要求"不匹配），故把 TutorialScreen 的玩家可达状态机复刻成纯函数 + DFS 穷举
**每一步所有合法点击**，判据是「最坏顺序也能通关」（7 岁小孩会乱点）。L4 曾状态爆炸 40 万节点跑不完，
加**槽位无关化指纹**后 0.08s 跑完；该合并只在无 `enemy_attack` 自动动作时成立，由 `canonical()` 逐关判定。

**兜底逃生阀（TutorialScreen）：** 除 play_card 外 6 种「要求具体动作」的步骤原本都没有兜底，
新增一个 useEffect 覆盖 play_event/attack/clear_field/direct_attack/summon_sp/break_power_bank。
⚠️ 它是安全网**不是**「数据可以不可解」的许可 —— 守卫仍只建模 play_card 那个原生阀。

**转屏提示方向修反：** 原 `(max-width:639px) and (orientation:portrait)` + 「请横过来玩！」，
即在**手机竖屏**弹全屏黑幕把人赶去横屏。实测方向恰好写反：390×844 竖屏比例 0.714、零溢出、44pt 热区齐全，
是手机上唯一能玩的档却被黑幕挡住；844×390 横屏槽仅 22.3×31.3、溢出 45px，才是坏的那档却永远看不到提示。
改为 `(orientation:landscape) and (max-height:500px) and (hover:none)`（max-height 保证 iPad 横屏永不命中、
hover 保证桌面窄窗口不被全屏拦截）+ 文案「请竖过来玩！」，key 改名 `battle.rotatePortrait{,Hint}`。
这条方向从 2026-03-26 `eba0f3c` 起没人动过，而同一天的 `dfe0f3c` 还专门给手机横屏写了整档紧凑 CSS。

**验证：** 真机走查（vite preview 跑真组件）L3 十步全通、L5 全通到毕业奖励；
变异测试 **19/19 全部变红**（10 条并行 worktree + 9 条本地重跑 + 3 条针对新改的大括号配对提取逻辑）；
生产按内容定位验到 L3=7 / L5=6（`playerEnergy:7` 这种字面量压缩后不存在，字面 grep 会误判）。

**顺手记下但没修：** `targetCardIdx` 数据里 3 处、组件 0 处引用（脚本以为控制了出牌顺序，其实没有）·
`highlight:'enemy_slot_1'` 没有对应 `isHighlighted` 分支（那一步高亮到空气）·
`clear_field` 步允许点敌方主人绕过清场（L4 恰好后接直攻步所以不卡死，换个后继步就复发）。

---

## PvP guest 答题（2026-07-23）✅ `7fa8c0d`
> 修掉 **host 答对 ×2 / guest 恒 ×1** 的系统性不公平 —— guest 那一侧「玩法即学习」此前是关着的。
> 真机双 tab 走通全链：guest 攻击→弹问答（host 屏幕不弹）→答对 ×2、看知识卡、连对数记自己头上。

**架构（host 权威 + 每侧独立）：** 新 `src/engine/quizGate.js` 纯核心承载三件事——
- **每侧独立节流**：`firstAttackDone`/`lastQuizTurn` 从单实例共享 ref 改成每侧一份。旧实现单机看不出
  （只有玩家攻击），一进 PvP host 首攻把额度+冷却占了 → guest 全程 0 题 = 不公平的另一半根因。
- **脱敏投影**：`publicQuiz` 白名单**重建**题面（不 delete）。`correct` 永不上 wire；`fact` 只在揭晓帧下发
  （实测题库 86.7% 的 fact 与正确选项重合度最高 = 剧透）。
- **host 权威判卷**：`gradeAnswer` 校验座位 + qid（挡重传/乱序/同题重抽的错算）。

**踩过并钉住的坑（都实测）：**
- **定形题槽**：`state[side].quiz` 7 键恒在（值填 null），不能 `quiz: null` —— assertPublicShape 逐路径比对，
  nullable 在「有题/无题」下产出不同路径集 → 第一次出题当场抛、快照停推、guest 静默冻屏。
- **字段命名**：wire.js 自己曾推荐的 `quizAnswered` 会被 PRIVATE_KEYS 子串匹配挡下（含 'answer'）。用
  `chosenIdx`/`rightIdx`。`correctIdx`/`quizCorrect` 同样被封。
- **协议 v3→v4** + SHAPES[4]（形状棘轮实测不 bump 就红）。**两台客户端必须都刷新**才能对战。
- **currentQuiz 只暴露本方（player 侧）**：host 替 guest 出的题在 enemy.quiz，绝不弹到 host 脸上 ——
  那是这一族最贵的 side 串台（爸爸屏幕弹出齐齐的题、一点就替他答了、还刷自己连对数）。
- **Leitner 复习盒只记玩家自己的**：host 替 guest 判卷不写 `recordQuizResult`，否则齐齐的答题记录
  进爸爸设备的复习计划、两人复习都被污染。
- QuizModal 改成**两阶段**（rightIdx 到达才揭晓）：脱敏后 guest 拿不到 correct，旧的本地即时揭晓
  会让他恒显示答错、看不到知识卡。guest 点继续本地记 `dismissedQid` 收弹窗（题槽是 host 权威状态）。

**验证：** 62/62 套；新 `test-quiz-gate`(26) + 端到端 `test-pvp-quiz`(35)。变异「不脱敏」被**生产代码的
assertPublicShape 当场抛**（答案不上 wire 是结构性的）。真机从 React fiber 确认 guest 收到的题面无 correct 键。
**未接线（诚实）：** 连对 2 题触发 SP、host 挂起攻击期间 guest 掉线的超时兜底。

---

## 全仓审计 + 断线重连 + iPad 适配（2026-07-22）✅ `83421c5`…`dea1572`
> 一次只读全仓审计（~28k 行）挖出的东西比预期多。**审计本身也错了三条，都是靠实测抓回来的** ——
> 记在这里是因为「读代码得出的结论」和「跑一遍得出的结论」差距有多大，这次给得很具体。

**🔴 host 断线重连（`83421c5`）—— 修的是「对局静默永久卡死」**
- 症状：host 网络一闪，重连被中继当成**新 host**、铸新房码。原房里的 guest 从此一帧收不到，
  而 host 的 `getStatus()` 仍报 connected —— 双方 UI 都正常，没有任何报错。端到端实测 4BZU → QWJV。
- 根因：重连凭证路径**按 role 分叉**，两端对称地把 host 排除在外（`fullUrl` 只给 guest 带 room/token；
  `parseHandshake` 对 host 无条件返回 `{code:null, token:null}`）。
- 修法：`fullUrl` 改**role-blind**（只看凭证在不在）→ 整类 bug 结构性消失；中继侧用 **token 当闸门**
  （无 token = 建房且**忽略**客户端给的 room，保住「不能占码」那条安全边界）。纯核心 `reconnect()`
  本就 role-generic，一个字没改。
- 顺带修掉三个**今天线上就在发生**的 bug：① 应用层拒绝后的**永久重连循环**（拒绝发生在 WS 握手之后，
  `onopen` 已把计数器清零 → `MAX_RECONNECT` 形同虚设；打错一位房间码就每 500ms 敲一次生产中继，
  实测 12 秒 24 次）② 被拒连接**泄漏 sockets 表项**（close 处理器挂在 reject 之后；实测 conns 涨到 24
  且主动断开后仍是 24）③ 僵尸 socket 的**迟到 close 误发 peer-left**（服务器 30s 心跳 vs 客户端 500ms
  重连的时序错位 → UI 永久显示「对手跑了」）。
- 凭证 **latch**（只认第一次）：中继盲转对端任意 JSON，客户端只按 `t` 前缀就当可信控制帧 ——
  可覆盖的话，对端一帧伪造的 `relay.created` 就能把我闪断后的重连重定向进他的房间。

**📱 iPad 适配（`dea1572`）**
- **触控热区**：根因是写反的断点 `min-h-[28px] sm:min-h-0` —— `sm:` 把大屏的保底**取消掉**，
  屏幕越大按钮越小（手机 23×28 → iPad 28×20），8 处同款。改按**视口高度**分档，
  手机横屏保持紧凑、iPad 拿 44。实测不达标按钮 **11 → 0**。
- 卡角 ⓘ 用伪元素外扩热区（视觉零变化，实测外扩 18px 命中、30px 不命中）。
- **按下反馈 0 → 全覆盖**：全 app 此前一条 `:active` 都没有，而 hover 在触屏上不存在。
  ☠️ 必须配 `transition-duration: 0s` —— Tailwind v4 的 `.transition` 把 **filter 也纳入过渡**（150ms），
  而小孩一次点按只有 80-120ms，不归零等于没做。
- **主屏图标**：iOS 的 `apple-touch-icon` **不支持 SVG**（原来只有 SVG = 加到主屏显示页面截图）。
  qlmanage 渲染真 PNG；apple 版方形不透明（iOS 自己加圆角），maskable 版内容缩到中心 72%。
- **状态栏**：`black-translucent` → `black`。**iPad 没有刘海 → `env(safe-area-inset-top)` 恒为 0**，
  靠 env() 让位是空转；改状态栏样式才是确定性的让位，且对所有界面生效。
- 两个误触陷阱：🔄 重开整局**零确认**（🚪 反而本来就有）→ 加确认 + PvP 下隐藏；
  `BattleHints` 横幅缺 `pointer-events-none`，实测压住敌方主人面板 → **提示在时打不出直攻**。

**☠️ 审计自己错的三条（都靠实测抓回来）**
- 「136 处 `hover:` 会在 iPad 上粘滞」→ **伪问题**：Tailwind v4 已把 hover 全部编译进
  `@media(hover:hover)`，编译产物块外 `:hover` = 0 处。一个字没动。
- 「`active:` 有 6 处」→ 实际 **0 处**：那 6 处全是 JS 对象的 key（`scientistMode:{active:false}`）。
  问题比说的更大，不是更小。
- 「🚪 误触丢整局」→ 高估：它本来就有二次确认。真正裸奔的是紧挨着的 🔄。

**方法论（会再咬人）**
- **「no-red」是 fake-green 的镜像面**：host 重连修完，60 套一条都没红 —— 那不是安全，是**零覆盖**。
  验收条件应当是「新断言必须先在未修代码上变红」，本次三层变异逐一验过（control 6 / client 7 / rooms 2）。
- **两道防线要各自可变异**：⑪ 那组测试原本靠 byConn 清理就绿了，`wasLive` 守卫**零覆盖**，
  而我写的「变异 wasLive → 本条红」是**假的**。补了 ⑬ 直接构造第一道防线失效的状态才钉住。
- **无头浏览器的 tab 是 hidden 的**：rAF 不触发、Framer 动画冻在半途，截图会拍到「弹窗只有 41% 不透明度」
  这种假 bug。下判断前先查 `document.visibilityState`。
- **端口要独立核验**：最终 e2e 复验一度显示「回归」，查日志才发现是 `EADDRINUSE` —— 旧进程占着端口，
  我的中继根本没起来，探针打的是**旧代码**。差一点误判成自己改坏了。

---

## PvP 能对战 → 上生产 + 选卡组（2026-07-18~20）✅ `f3fdb5e`…`1d6343b`
> 🎯 **两个浏览器真能对战，并已在 `bio.socialcontract.capital` 上线**。架构：**host 权威 + 哑中继**（relay 零 wire import、盲转字节 → 中继永远不需要跟着游戏规则升级）。

**协议与传输：**
- [x] `wire.js` PROTOCOL_VERSION 1→3，**形状棘轮 `SHAPES[]`**：版本编进形状本身，加字段不 bump 就绿不了（v2 quizStreak/scientistMode、v3 handCount 都是被它当场拦下来才加对的）
- [x] 隐私词表 `PRIVATE_KEYS` 子串匹配 + `PUBLIC_ALLOW` 白名单 —— **误伤是好对话，不是麻烦**：`handCount` 撞词表 → 逼人显式声明「张数是公开的」才放行
- [x] `SIDE_VALUED_PATHS` 让「顶层侧别标量」自动红。那个例子不是假想：`state.quiz.answeredBy` 曾是被裁定的设计，直到发现 mirror 根本不翻它 → 双方 UI 会**同时**显示「是我抢到的」

**分步接线（每步都真机验证）：**
- [x] `f3fdb5e`/`254b939` **4a** `relayClient` + `PvpLobby`（房间码 4 位，去掉 O/0/I/1）
- [x] `a57519c` **4b** battle 提成 prop（`HostBattleScreen` wrapper，BattleScreen 表现层化，零行为变化）
- [x] `e0eeb6c` **4c** `usePvpHost`：buildSync 推 / decodeIntent→acceptIntent / 照 useAITurn 约定重放
- [x] `eafe770` **4d** `useGuestBattle` 同形状适配器（快照渲染 + intent 方法 + canAttack 跑**真** `rules.canAttackFrom`）
- [x] `4008a00` **4e** 事件环：浮字 + 日志上 wire（host 自己的动作与 guest 重放走**同一条发射路径**）
- [x] `0871a17` **4f** 零收益守卫（`pvpActiveRef` 镜像不漂移 + handleExitBattle 早退兜底）
- [x] `02391e3` 等待横幅 · `fbed30a` **guest 换牌**（协议本就留位 → 无需 bump）· `785b383` handCount 上 wire
- [x] `dc3e9a7`/`1d6343b` **对战前选卡组**：4 套阵营预设（各 18 生物 + 7 事件）+ 存档卡组 + 全卡池解锁。guest 选卡走**大厅帧**（`lobbyProtocol.js`，**刻意不进 wire.js** → wire 测试不动、版本不 bump）
- [x] 生产部署：relay 上 VPS（systemd `bio-relay`，3002）+ Caddy bio block 加 `/api/*` handle + 前端 rsync

**血账（会再咬人）：**
- **ack = 消费即确认，不是「引擎已应用」**：attack 有多条日常规则拒绝路径（召唤疲劳等）。若 ack 只在规则接受时推进 → guest 永远重传同一个 n、host 恒答 dup → **界面永久卡死**
- **since = host 自己的已发水位（cursorRef），不是 guest 报来的 lastSeen**
- **出牌必须 `r.ok` 之后才 `enemyHand.playCard`** —— 否则被拒的那张卡从手牌蒸发、从未上场、也不进弃牌堆（S4 血账复发）
- **通道纪律**：工具输出重复回显/空结果/凭空内容 = 通道不可信 → 用 `git status`/`rev-parse`/`md5` 独立回验，**绝不信「成功」回执**。本阶段曾整段产出未落盘、伪造 commit SHA，全靠独立核验抓回
- **部署要验字节**：`npm run deploy` 跑完不等于生产变了 —— 拉生产 bundle 跟本地 `md5` 对，才算数

---

## PvP 前置地基 + 引擎 de-fork 8/8（2026-07-17）✅ `6cffff1`…`94e3fe3`
> 🔌 P1 PvP 开工。**de-fork 的起点是 `ARCHITECTURE.md:51` 自己点名的那笔债**：「attack/aiAttack、playToField/aiPlayToField 是两份近重复实现…改战斗规则须两处同步改」。那条规矩本身就是 fork 的伤疤 —— de-fork 是**删掉它**，不是更用力地遵守它。9-agent 设计 + 对抗评审，推翻了三个设计**共同**的假设。

**地基（都是「即使 PvP 明天取消也该做」的）：**
- [x] `6cffff1` `src/hooks/*.js` 补 `.js` 扩展名 —— **战斗引擎从「不可测」变可测**。Node ESM 不做扩展名补全 → `import('useBattle.js')` 直接 ERR_MODULE_NOT_FOUND。历史上「带扩展名的文件全都有测试、不带的全都没有」不是巧合，是因果
- [x] `ac1169e` 手牌 uid 补 side 前缀 —— **PvE 既有 bug**：双方共用一个 `attackedThisTurn` Set，同卡同下标就串台。至今没暴雷只因预设卡组恰好不同；公平模式会让它从边缘变默认
- [x] `4f3eae6` 更正两条「文档写了、代码从来没有」的规则：`QUIZ_CHANCE=0.25` 被 import 后**再没被引用过**（触发是确定性的）；`AWAKEN_PARTIAL` ×1.3 档**引擎从未产生过**
- [x] `396db5a` sw.js `/api/*` 旁路 + CACHE_NAME v2（必须同 commit —— activate 只删 `k !== CACHE_NAME`，不 bump 则旧缓存永不失效）
- [x] `8b2c1cc` `DEPLOY.md §4` 从「预案」改写成「已决架构」+ 三条不变量 + 两条会毁数据的部署纪律
- [x] `0584be3` vite 加 `/api/*` 代理（正则 key `^/api/`，字符串 `/api` 会误伤 `/apidocs`）

**de-fork 8 步：**
- [x] `614dfa4` **S0** 玩家侧回调收口读 `battleStateRef` —— ★ **fork 的物理成因是「读值来源不同」，不是「gate 被删了」**。三个设计都想直接给 attack 加 side 参数，那样会撞上闭包里恒为 `'enemyTurn'` 的 phase → **AI 静默变哑而 46 个测试全绿**
- [x] `4cba729` **S1** gate 抽成 side-blind 纯谓词 `engine/rules.js` + `sides.js`（60 真断言）
- [x] `3e4e606` **S2** 回合标记进 reducer 每侧数组 + 干掉「先标后滚」舞蹈
- [x] `1fdbed6` **S3** `activeSide` + 每侧 `phase` + `derivePhase` —— ★ 旧枚举把「发生什么」和「谁在做」编码进同一标量，于是 aiPlayToField **即使有人想查 phase 也查不了**（不存在「敌方的 main」）。**缺失的 gate 不是懒，是不可表达**
- [x] `afd933a` **S4** de-fork `playToField` —— AI 第一次受能量/阵营/槽位约束
- [x] `afdd136` **S5** de-fork `attack` —— **守护优先第一次由引擎约束 AI**
- [x] `0a8fb19` **S6** de-fork `playEventCard` + 修 `tryTriggerSp` 的真 SP fork；**ai\* 三兄弟全退役**
- [x] `f2c4f68` **S7** 镜像测试（462 断言）+ 棘轮（22 断言）
- [x] `9785d99` `ARCHITECTURE.md` 更正五处过期说法（含它自己点名的那笔债）

**修掉的真 bug（都不是 PvP 引入的，是 PvP 逼出来的）：**
- `aiAttack` **一行守护检查都没有** —— 「守护优先」是 CLAUDE.md 速查里的核心规则，它至今没暴雷只因 `pickAiTarget` 的 T1 恰好优先挑守护卡 = **规则一直靠「AI 恰好礼貌」维持**
- `aiPlayToField` 无条件扣能量（**敌方能量可扣成负数**）、覆盖占位者却不送弃牌堆（**弃牌堆是阵营标记的真相源** → 敌方标记长期少算）
- `aiPlayEventCard` 召不出 SP 时**完全静默**（`getEligibleSpCards` 丢掉了 reason）
- 「一卡一回合一次」此前**完全由引擎外强制** —— 靠 `useAITurn` 那个 for 循环的形状，而那正是 PvP 要删的代码

**方法论（会再咬人）：**
- **计划与评审也会错**：Design 1 白纸黑字写「`tryTriggerSp` 已带 side → 不动」（假：带 side 参数 ≠ 没有 fork）；计划说 `BattleScreen:404` 直接换 `preplaceCard`（会静默丢掉 **11/24 张** cost≤1 卡的 onPlay）。**每条都要自己核。**
- **三个设计一致要把科学家模式搬进引擎并声称「逐字节保持」** —— 全都说错了机制：`calcCardBattle` **根本不读** `opts.damageMultiplier`，搬进去 = 顺手给每次卡牌攻击 +20%，**把难度改动伪装成重构**
- **de-fork 让五个 grep 测试变红，且都红得有道理** —— 它们在编码「改战斗规则须两处同步改」那条规矩。断言数字变小 ≠ 覆盖变弱：不变式全保留，从「两处都得记着写」变成**结构保证**
- **新守卫必须配变异测试**（S7 八发全中）：`mirror` 漏翻 `winner` 时**对合测试是结构性瞎的**（winner 是 swap 的不动点，漏翻照样绿，线上后果是**输的那个孩子看到胜利画面**）；把剥注释器改成恒等函数 → 棘轮**静默空转**
- **实机验证不可省**：S4 我自己引入的「`preplaceCard` 不打日志 → 开局那张敌方卡凭空出现、无任何解释」，47 套全绿，只有看日志开头才发现
- **浏览器验证前先断言 `window.innerWidth > 0`** —— 无头浏览器会以 0×0 视口起来，卡牌点击**静默失效**、读起来像引擎回归。是「用改动前代码跑同一脚本」的 A/B 对照证伪的

---

## 直攻主人技能倍率收口（2026-07-17）✅ `57644b7`
> ⚔️ 起因是 SESSION.md 挂着一条 🔴「虎鲸叠觉醒 34000 秒杀主人」。查下来**那条是假的**，但底下压着三个真缺陷。对抗性验证（3 视角 workflow）两次推翻主 agent 的结论。

**修掉的（真实 ctx 下全卡池就这三张能在直攻主人时拿到倍率）：**
- [x] ★ 根因：两条直攻主人分支写 `if (evt.type === 'RUSH_BOOST') dmgOpts.damageMultiplier *= 2`，**只认事件 type、从不读 `evt.mods.damageMultiplier`**。而 `RUSH_BOOST` 是个**被复用的 type**——无视守护 / 无视护盾 / 加伤全用它，拿 type 当「要翻倍」的信号从一开始就错
- [x] **手术刀·精准之刃**「精准切除」只是「无视守护」、事件根本没 `mods` → 白拿 ×2（11000 → **5500**）
- [x] **猎豹·闪电猎手** / **猫头鹰·暗夜猎手** 卡面写「首次攻击 ×1.5」→ 实际执行 ×2，**日志说 ×1.5 手却打 ×2**（10000 → **7500**）。猫头鹰是穷举全卡池才补上的漏网
- [x] 改法：复用「打卡」路径既有的 `aggregateCombatMods`（倍率相乘、无 mods 的事件忽略）→ 两条路径语义对齐。AI 侧（`:2058`）同样受害，一并修
- [x] 连带修 `Rush`：靠 mutate `ctx.damageMultiplier` 传倍率，而 `triggerSkills` 传给 handler 的是 `{...context}` 拷贝、改动被丢弃；返回事件又不带 mods → 调用方改读 mods 后会**静默变哑弹**。补 `mods:{damageMultiplier:2}`（当前零卡使用，但 CLAUDE.md 把「突进」列为通用技能）
- [x] `engine/`+`utils/` 4 处相对 import 补 `.js` —— **带扩展名的文件全都有测试、不带的全都没有**，正是它把 `skillTriggers`/`skillRegistry` 挡在 Node 测试套件外

**新增 `test-leader-damage.mjs`（33 断言）**：驱动真 registry + 真卡牌 + 与 `useBattle:1820` 逐字一致的 ctx。三种漂移逐一验证会红（回退代码 / 抽掉 Rush 的 mods / 补上 friendlyField）。

**🩹 主 agent 自己造的假 bug（记在此以免重演）：**
- SESSION.md 那条 🔴 说「虎鲸 8500 ×2(硬编码) ×2(觉醒) = 34000 > 30000 满血秒杀」。主 agent 先是确认了它、还算出「一张卡秒杀」的表格，**并把这段虚构因果写进了代码注释和测试文件头**
- 真相：`conditionalAtk` 的 `per_ally` 分支读 `ctx.friendlyField`，而**四个 `triggerSkills('onAttack')` 调用点一个都不传**。真实 ctx 下虎鲸事件数 = 0，改前改后都是 17000。**探针自己传了生产从不传的字段**，凭空造出一条不存在的路径
- 由 workflow 的 regression / balance 两个 agent 独立揪出。教训：**引擎测试的 ctx 必须与生产调用点逐字一致，多传一个字段就是假绿**

**查出但未修（欠账，见 SESSION.md）：**
- 🔴 `friendlyField` 缺失 → **虎鲸·深海霸主「协同猎杀」(8500 SSR) 与神经元·闪电信使「突触传递」(4000 SR) 100% 失效**。补它会同时引爆：虎鲸满场 5 友方 = (8500+7500)×2 = **32000 ≥ 30000 秒杀**，而 5 格时是 29000 —— **是 6 格那次改动把它推过线的**
- 🟡 `calcCardBattle` 不读 `opts.damageMultiplier` → **科学家模式 ×1.2 只在直攻主人生效，对着卡打是 0 收益**
- `skillTemplates.js:268` 用 `ratio=(atk+bonus)/atk` 把固定加伤近似成倍率 —— 只在「乘 ATK」时恰好对；`atk===0` → `Infinity`
- Tailwind v4 裸 `@import` 会扫 `CHANGELOG.md` —— **文档散文里写到类名会变成生产 CSS 死规则**（本文件已贡献一条 `.grid-cols-5`）

---

## 存档止血 + 真机 bug-fix + SP/战场位重构（2026-07-16）✅
> 🩹 齐齐真机反馈驱动的四连。多智能体审计两次纠正主 agent 的错误判断，全部改动真机验证后上线。

**存档止血（`c62658b`）—— 4 个实测复现的 bug：**
- [x] ★ **导入存档静默清空全部 10 副卡组**，UI 还显示「已导入 ✓」：`importSave` 对 decks 也跑 economy 的 `migrateData` → `{...数组}` spread 成对象 → `DeckBuilder.loadDecks` 的 `[...parsed]` 抛错被自己的 catch 吞掉 → `Array(10).fill(null)`。**用来恢复数据的动作本身会毁掉数据**
- [x] `exportSave` 只导 2 个 key、实际在用 13 个（漏 campaign / quiz-leitner(27.8KB，最大项) / daily / tutorial-reward-claimed 发奖门闩等）；对每个值都 `JSON.parse` → 裸字符串 `lang='zh'` 抛错被吞、该 key 静默丢失
- [x] `migrateData` 无条件盖戳导致版本降级（本地无害，云存档下会触发重复发奖）
- [x] `resetSave` 只删 2 个留 11 个 → 重置后比新玩家更惨（首通奖/教学奖永久领不到）
- [x] 新增 `ErrorBoundary`（全项目此前**零错误边界**，歪存档 → 白屏且够不到重置按钮）：白屏变可恢复界面，按钮顺序 **先备份（无损）→ 重试 → 最后才重置**
- [x] `navigator.storage.persist()`（实测 Chrome 返回 false —— **不是解药**，真正的 ITP 豁免只有加主屏 PWA）
- [x] `test-save-manager.mjs` 38 断言漂移守卫（扫 src/ 抓未登记 key）；变异测试逐条验证

**测试场攻击锁死（`7588f61`）—— 与「金鲨」和「直攻主人」都无关：**
- [x] 根因：`cards.js` 原始卡不带 uid（唯一产地是 `useHand.js:25` 的卡组→手牌），测试场绕过它直接摆盘 → `makeFieldCard` 也不发 uid → 场上每张卡 `uid === undefined` → `combat.js:125` `attackedThisTurn.has(undefined)` 对全场命中 → **一张卡攻击=全场锁死**
- [x] 一处兜底（`makeFieldCard` 用 `??` 发 uid）同时修掉 4 个同源 bug：攻击门禁塌缩 · `deadUids=Set{undefined}` 死一张卡清空整排（比原 bug 更凶）· `processedDeathsRef` 首张死卡后亡语全不触发 · 技能 `targetUid` 恒定命中第一张卡
- [x] 端到端 before/after 铁证：未修复版卡1「从没动过」被锁灰、修复后可正常攻击，唯一变量就是那行兜底

**SP 事件卡重定价 + 静默蒸发（`e679640`）：**
- [x] 按「每点能量买到多少 SP 属性」诊断（普通卡 ≈3000-3300/费）：抗药性进化 9333/费、食物链爆发 9000/费（普通卡 3 倍）· 紧急手术 4000/费（tech 无 6 费 SP，maxCost 6 是空头承诺）
- [x] 重定价：抗药性进化 3→5 · 食物链爆发 2→4 · 物种大爆发 4→5 · 紧急手术 3→2（+maxCost 6→5）· 生态恢复 3→2，其余 7 张不动。效率区间 4000~9333 → **4500~7000**
- [x] ★ **SP 召不出时静默蒸发**：`playEventCard` 的 `spCandidates.length > 0` 没有 else → 第 1-3 回合打出事件卡：能量扣了、卡进弃牌堆了、SP 没出、**一句提示都没有**。拆出 `getSpSummonOutcome` 回传 reason + soonestTurn → 现在明确告知「⏳ 最早要到第 N 回合（还差 M 回合）」

**战场位 5→6（`344fce5`）—— 不是「改一行常量」，是 12 个文件 / 35 处：**
- [x] 收口成单一真相源：删 `battleReducer` 内联副本（改 import，带 `.js` 扩展名——本模块被 node 测试直接 import）
- [x] Tailwind 字面量（JIT 不认模板变量）：BattleScreen 槽宽 `calc(.../5)` → `flex-1 min-w-0`（唯一能同时活在 5/6/N 下的写法，且真机实测 568px 横屏 89px/格零溢出，而朴素解 `/6+1.25rem` 会溢出）· TutorialScreen `grid-cols-5` → 行内 `gridTemplateColumns`
- [x] 13 处手写 5 元素数组（TestArena ×1 / TutorialScreen ×2 / tutorialData ×10）—— 这一类躲过了 `Array(5)` / `< 5` / `slice(0,5)` / `[0,1,2,3,4]` 全部四种 grep
- [x] 删 3 处**死 import**（BattleScreen / TutorialScreen / bossMechanics，`grep -c` 均为 1）—— 它们是**伪装色**：任何按「有没有 import 常量」判断安全的审计都会把重灾区误判为已覆盖
- [x] `test-field-slots.mjs` 14 条漂移守卫（全部派生自常量）；三种回归变异全部咬住
- [x] ☠️ 地雷已在 deckRules 注释写死警告：同文件 `SP_DECK_SIZE` / `STARTING_HAND` 也是 5，**严禁 5→6 查找替换**（会静默改掉起手抽牌数且无测试会红）

**上线：** `bio.socialcontract.capital` + Vercel（git push 自动），逐字节比对确认四个弧线的修复均在生产 bundle 内、生产环境实测 6 格。

---

## 生产部署上线（2026-07-15）✅
- [x] 自托管 VPS 发布（`2bf2978`）：`bio.socialcontract.capital`（搬瓦工 CN2 GIA · Caddy 2 自动 HTTPS · Cloudflare 灰云国内直连）
- [x] `npm run deploy` = `vite build && rsync dist/ → VPS /var/www/bio/`；Vercel 保留为海外镜像（git push 仍自动部署）
- [x] SSH 免密（ed25519）；交接文档 `DEPLOY.md`（架构 / 日常部署 / Caddy 归属在 spacev repo / 账号对战预案 / 排障）

---

## 特性硬化 + 内容扩建（2026-07-12~13）✅
> 🧬 9 个真机 bug 清完后转入：补测试盲区 → 上 CI 门禁 → 做 feature/内容。倒序，逐 commit 见 git。

**题库审核 + 扩容 745→805（2026-07-12~13）：**
- [x] 「防太相近」审核工具 + CI 守卫：`audit-quiz-similarity.mjs`（信息性、阈值可调）+ `test-quiz-similarity.mjs`（门禁，任两题中文 bigram-Jaccard ≥0.70 即红）。审现状：745 题 0 精确重复、仅 3 对轻微跨卡重叠（`200044b`）
- [x] 通用题扩池批1 +24：补齐此前空缺的 pathogen/tech 两阵营（182→206）（`8430089`）
- [x] 差异化 3 对跨卡重叠题：同知识点各问一次 → 改成互补两知识点（骨骼巨人SP→骨髓造血 / 干细胞事件卡→医学修补 / 感冒病毒卡→免疫清除），0.55 阈值下近似对 3→0（`0e223d3`）
- [x] 通用题扩池批2 +36：pathogen/tech 各补到 30（206→242，总 745→805）（`be7b5dc`）
- 生成流程：并行 workflow 按子主题过量生成 → 独立 agent 核科学准确性/7岁可读/广度 → 确定性 bigram 查重 + 最长选项过滤 → 人工审阅页确认 → 入库

**Leitner 间隔复习（`847de6a`）：** 问答从随机 trivia 升级成个性化记忆训练。新模块 `quizLeitner.js`（5 盒制、间隔 1/2/3/5/8 天，针对 7 岁调短）；`getRandomQuiz` 选题优先出到期题（无到期退回随机）、`answerQuiz` 答后更盒子；Collection 显示「已掌握 X/总数 · 今日待复习 Y」。

**每日挑战 v2 扩池（`89178da`）：** 纯数据零引擎改动（约束只用 BattleScreen 已消费的 effect 契约字段）。THEMES 6→10 / ENEMY_POOL 4→8 / CONSTRAINTS 8→14（buff==约束 保 7/7）；轮换从 `dn>>2`(4天)/`dn>>4`(16天) 改互质乘子 ~2天/~3天一换。组合空间 192→1120，30 天不重样 8-10→30/30。

**测试盲区补齐 + CI 上线：**
- [x] `pickAiTarget` —— AI 选靶从 useAITurn 抽成纯函数（rng 可注入）+ `test-ai-target`（33 断言五级选靶）（`5913210`）
- [x] `statusEffects.js` 执行式单测 55 断言（每回合结算热路径、13 状态分支，含高危 atk_boost 到期消退）（`9f63e57`）
- [x] GitHub Actions CI（node 20 · `npm ci`→lint→test→build），push/PR 到 main 门禁；首跑绿 23s（`83efcf1`）。改 workflow 文件需令牌带 `workflow` scope
- 测试套 36→**41**（+test-gacha-banner / status-effects / ai-target / quiz-similarity）

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
