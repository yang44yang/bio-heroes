#!/usr/bin/env node
// 首页信息架构守卫（2026-08-21）
//
// 背景：首页曾把 10 个按钮堆成一列（7 种颜色、宽度全一样），没有任何层级 ——
//   「我现在该点哪个」这个问题首页答不上来，而玩家是 7 岁的齐齐。实测三宗罪：
//   ① `onStartBattle` 与 `onOpenDeckBuilder` 在 App.jsx 里是**同一行代码**（都 setScreen('deckBuilder')）
//      → 两个按钮、一个界面，而且「⚔️ 自由对战」落到的界面标题写着「🃏 卡组管理」；
//   ② iPad 横屏 1024×768 文档高 924 > 768 → **首页必须滚动**，「教学」被切、「存档管理」整个在屏幕外；
//   ③ 家长用的「🧪 测试场」夹在图鉴和教学中间，占着首页黄金位置。
//
// 本守卫钉死重构后的**信息架构**，不是像素：首页只放"要玩的"，工具进二级浮层（MoreMenu），
// 且「藏进二级」不许变成「藏没了」。
//
// ☠️ 所有 grep 一律跑在**去掉注释后的源码**上（`code()`）：注释里提到一个名字不等于代码在用它 ——
//    本项目已被自己写的注释骗出过一次假绿、一次假红（见 test-tutorial-solvable ③-0）。
// ☠️ 分区不靠"源码位置"切（组件的 helper 函数都写在 JSX 之前，按位置切会把 handleReset 算进首页区）
//    —— 靠**文件边界**：首页的东西在 TitleScreen.jsx，二级的东西在 MoreMenu.jsx。

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
let pass = 0, fail = 0
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.error(`❌ ${name}`) } }
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const code = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:"'`\\])\/\/[^\n]*/gm, '$1')

const MORE_PATH = 'src/components/MoreMenu.jsx'
const titleRaw = read('src/components/TitleScreen.jsx')
const title = code(titleRaw)
const app = code(read('src/App.jsx'))

ok('⓪ 注释剥离没把代码一起吃掉（吃掉了下面所有断言都成摆设）',
  title.length > titleRaw.length * 0.5 && title.includes('export default function TitleScreen'))
ok(`⓪ ★ 二级菜单已抽成独立组件 ${MORE_PATH}（首页只管首页）`, existsSync(join(ROOT, MORE_PATH)))
const moreRaw = existsSync(join(ROOT, MORE_PATH)) ? read(MORE_PATH) : ''
const more = code(moreRaw)

// ============ ① 首页可见入口预算 ============
// 首页按钮数量必须有上限，否则「以后随手再加一个」会把这次重构慢慢吃回去。
// 预算 = 4 个大按钮（闯关/今日/联机/自由对战）+ 抽卡 + ⚙️更多 + 教学（未毕业时）= 7。
const HOME_BUDGET = 7
const homeButtons = (title.match(/<motion\.button/g) || []).length
ok(`① ★ 首页可见按钮 ${homeButtons} 个 ≤ ${HOME_BUDGET}（超了就是又开始往首页堆东西了）`,
  homeButtons <= HOME_BUDGET)
ok('① 首页确实还有主菜单按钮（组件被掏空的话上面那条会假绿）', homeButtons >= 4)

// ============ ② 家长/存档工具整体搬出首页 ============
// 判据用 **import**：这些模块只要还被 TitleScreen 引入，就说明工具没真正搬走。
for (const [what, re] of [
  ['导出/导入/重置存档 saveManager', /from\s+'\.\.\/utils\/saveManager'/],
  ['题库模式 settings', /from\s+'\.\.\/utils\/settings'/],
]) {
  ok(`② ★ TitleScreen 不再引入 ${what}（工具应该整体搬进二级浮层）`, !re.test(title))
  ok(`② ${what} 确实搬进了 MoreMenu（只删不搬 = 功能没了）`, re.test(more))
}
ok('② ★ 首页不再直接把测试场挂到按钮上（家长工具不占首页位置）',
  !/onClick=\{[^}]*(handleOpenTestArena|onOpenTestArena)/.test(title))
ok('② 测试场入口确实在 MoreMenu 里', /onClick=\{[^}]*handleOpenTestArena/.test(more))

// ============ ③ 「藏进二级」不许变成「藏没了」 ============
// App 传进来的每个入口 prop，都必须在某一侧真的被挂到 onClick 上（TitleScreen 自己用，
// 或透传给 MoreMenu 再用）。少一个 = 那个功能从此进不去了。
const PROPS = ['onStartBattle', 'onOpenGacha', 'onOpenCollection', 'onOpenTutorial',
  'onOpenCampaign', 'onOpenDailyChallenge', 'onOpenTestArena', 'onOpenPvp']
const wired = (p) => new RegExp(`onClick=\\{[^}]*${p}`).test(title + more)
  || new RegExp(`${p}\\?\\.\\(\\)`).test(title + more)
for (const p of PROPS) {
  ok(`③ ★ 入口 ${p} 仍被真正调用（藏进二级 ≠ 藏没了）`, wired(p))
  ok(`③ App 仍把 ${p} 传给 TitleScreen`, new RegExp(`${p}=\\{`).test(app))
}
// 反向锁：合并掉的重复入口不得复活（它和 onStartBattle 曾是 App 里一模一样的两行）
ok('③ ★ onOpenDeckBuilder 已彻底移除（它和 onStartBattle 是同一个界面，留着就是首页那个重复入口）',
  !/onOpenDeckBuilder/.test(title) && !/onOpenDeckBuilder/.test(app) && !/onOpenDeckBuilder/.test(more))

// ============ ④ 二级菜单必须是浮层，不能是内联展开 ============
// ☠️ 内联展开（旧的存档管理面板就是）会把首页撑高 —— 横屏实测 924>768 本来就要滚动了，
//    再撑一个面板必然溢出。浮层 fixed 脱离文档流，永远不会把首页顶出滚动条。
ok('④ ★ 二级菜单是 fixed 浮层（内联展开会把首页撑出滚动条，横屏当场溢出）',
  /fixed inset-0/.test(more))
ok('④ ★ 二级菜单不再用「撑高文档」的展开动画（height: auto）', !/height:\s*'auto'/.test(more))
ok('④ 浮层内容自己可滚（内容比屏幕高时不能把浮层撑破）',
  /overflow-y-auto/.test(more) && /max-h-\[/.test(more))
ok('④ 浮层能关掉（点背景或关闭按钮）', /onClose/.test(more))

// ============ ⑤ 教学按毕业状态收放 ============
// 没通关教学时留在首页（需要它的时候看得见），毕业后收进二级（不再占地方）。
ok('⑤ ★ 首页读教学毕业状态（loadTutorialProgress）', /loadTutorialProgress/.test(title))
ok('⑤ ★ 首页的教学按钮只在**未毕业**时出现', /!graduated\s*&&/.test(title))
ok('⑤ ★ 浮层里的教学按钮只在**已毕业**时出现（否则两处同时冒出来）',
  /graduated\s*&&/.test(more) && !/!graduated\s*&&/.test(more))

// ============ ⑥ 图鉴不能只剩浮层一个入口 ============
// 图鉴原本只有首页一个入口（别的界面都没链过去），收进浮层后必须补一个显眼的：
// 货币行的「收集 N 张」本身就该是图鉴入口。
ok('⑥ ★ 货币行的「收集 N 张」是可点的图鉴入口（图鉴收进浮层后，这是它的第二个入口）',
  /onClick=\{[^}]*onOpenCollection[^}]*\}[\s\S]{0,400}ownedDexCount\(economy\.collection\)/.test(title)
  || /ownedDexCount\(economy\.collection\)[\s\S]{0,400}onClick=\{[^}]*onOpenCollection/.test(title))

// ============ ⑦ 家长门不得在搬家过程中掉了 ============
ok('⑦ ★ 测试场仍走家长门（算术门 56），且门在浮层里',
  /handleOpenTestArena/.test(more) && /!==\s*'56'/.test(more))
// ⚠️ 这条不数「'56' 出现几次」——门被抽成共用的 parentGate() 是**更好的**写法（不该逼人复制两遍）。
//    按意图判：门在，且两个家长入口都调用它。
ok('⑦ ★ 家长门是共用的 parentGate（内含算术门）', /const parentGate = \(\)/.test(more) && /!==\s*'56'/.test(more))
for (const h of ['handleQuizMode', 'handleOpenTestArena']) {
  const body = more.slice(more.indexOf(`const ${h} =`), more.indexOf(`const ${h} =`) + 320)
  ok(`⑦ ★ ${h} 真的过了家长门（漏一个 = 孩子能绕过去改设置 / 进 dev 工具）`,
    more.includes(`const ${h} =`) && /parentGate\(\)/.test(body))
}
ok('⑦ ★ 重置存档仍有二次确认', /window\.confirm/.test(more))

// ============ ⑧ 落地界面的标题不许再说谎 ============
// 旧状态：点「⚔️ 自由对战」落到的界面标题是「🃏 卡组管理」。合并入口后这个界面同时是
// 「选卡组出战 / 编辑卡组」，从首页、抽卡、闯关三条路都会到，所以标题要三条路都成立。
const zh = JSON.parse(read('src/i18n/zh.json'))
const en = JSON.parse(read('src/i18n/en.json'))
ok('⑧ ★ DeckBuilder 有副标题键 deck.subtitle（说清"选一套出战"，不然标签和落地对不上）',
  typeof zh['deck.subtitle'] === 'string' && typeof en['deck.subtitle'] === 'string')
ok('⑧ DeckBuilder 真的渲染了副标题', /deck\.subtitle/.test(code(read('src/components/DeckBuilder.jsx'))))
ok('⑧ 首页不再有独立的「卡组」按钮（menu.deck 键已不被使用）',
  !/menu\.deck['"]/.test(title) && !/menu\.deck['"]/.test(more))

// ============ ⑨ 中英文键必须齐 ============
for (const k of ['menu.more', 'menu.parentZone', 'menu.close', 'deck.subtitle', 'menu.collectedTip']) {
  ok(`⑨ i18n 键 ${k} 中英文都有（漏一边就是英文界面露出中文）`,
    typeof zh[k] === 'string' && typeof en[k] === 'string')
}

console.log(`\n${fail === 0 ? '✅' : '⚠️'} test-title-menu: 通过 ${pass} / ${pass + fail}`)
process.exit(fail === 0 ? 0 : 1)
