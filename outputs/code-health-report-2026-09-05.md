# Bio Heroes 代码体检报告（2026-09-05）

- **范围**：全仓（`src/` 30.7k 行 · `relay/` · `scripts/` 77 套守卫 · 文档 · 仓库卫生 · 依赖）
- **方法**：单人逐项复验，每条结论都跑过命令。上一份报告 `code-health-report-2026-07-02.md` 的每一条「未修」项逐条重查。
- **基线**：HEAD `39154b9` = origin/main，工作树干净；`npm test` 77/77 绿（5s）；`npm run lint` 干净；`vite build` 绿（1.0s）。
- **生产**：本地 build 的 `index-BpkjeDN5.js` / `GachaScreen-WA2D2H_a.js` 与线上 md5 逐字节一致 → 生产 = HEAD（代码层面）。

---

## 一、一句话结论

代码本体健康：引擎已解耦可测、技能表零缺口、存档层有迁移与守卫、中继韧性到位、7 月报告的 P0/P1 引擎 bug 全部确认已修。
**这次真正的问题在代码之外**：开发文档（CLAUDE.md / ARCHITECTURE.md / rules）对技术栈和数字的描述有多处失真，
其中一条还被守卫「背书」；仓库里躺着 12 个陈旧 worktree、1 个死文件、几处无关的杂物。以上文档部分本次已改，其余列在建议里。

---

## 二、客观信号

| 项目 | 状态 | 备注 |
|---|---|---|
| 断言测试 | ✅ 77/77 | 60 套 import 真模块驱动，17 套 source-grep（7 月是 27 套里 21 套 grep，趋势正确） |
| lint | ✅ 0 违规 | 只开 `no-undef`；没有 react-hooks / exhaustive-deps |
| build | ✅ | entry 496KB（gz 169KB）· quizzes 448KB（gz 156KB）· framer 134KB · BattleScreen 181KB |
| 生产一致性 | ✅ | entry + GachaScreen chunk md5 与线上一致 |
| 技能表 | ✅ | 176 条 handler，卡牌用到 175 条，**0 缺 handler**，1 孤儿（`Rush` 是通用技能，合理） |
| 数据完整性 | ✅ | 124 卡 id 无重复、全部有 scienceCard；i18n zh/en 键 346/346 完全对齐 |
| `npm audit` | ⚠️ 6 条（4 高） | 全在 vite / postcss / nanoid（构建期），不进浏览器；`npm audit fix` 可修。relay 0 条 |
| 代码异味 | ✅ | 全 src 仅 1 个 TODO、0 `debugger` / `eval` / `innerHTML` / eslint-disable；`console.log` 仅 1 处且是 DEV-only 调试函数 |

---

## 三、7 月报告复核

**已修（逐条确认）**：ctx 修饰符打卡失效（`combat.js` 现读 14 处）· MRSA `_side:'attacker_side'` 已无 · 鲸鲨回血 ·
`i<3` 硬编码 · `_reviveToHand` / `_removeFromHand` 已有消费者 · 物种大爆发按 `effectValue` 抽牌（决策F）·
useBattle 剥出 `battleReducer` / `rules.js` · 玩家/AI de-fork · `useAITurn` 抽出 · gsap 删除 · CI 建立。

**仍开**：
- `evolutionTo` 悬空：**17 张**（7 月 14 张，还在涨）。指向的是中文卡名而非 id，全仓无任何读取方，纯装饰死数据。
- `QUIZ_CHANCE` / `AWAKEN_PARTIAL` 死常量（rules 已如实标注）。
- i18n 只覆盖 UI chrome，卡牌/技能文本仍中文硬编码（结构性，非 bug）。
- Bundle：`cards.js`（3307 行）仍压在 entry 里；`react-vendor` chunk 仅 3.6KB（React 实际被 framer 块吃掉）。

---

## 四、本次发现（按严重度）

### 🟠 P1 — 开发文档失真（每次会话的输入指令）
- **CLAUDE.md**（已改）：写「React 18」实为 19；「WAAPI 战斗演出 / tsParticles 粒子 / Supabase 后端 / Vercel 部署」四项**在仓库里都不存在**
  （WAAPI 只出现在一个无人 import 的死文件里；生产是 VPS）；项目结构树缺 engine 的 wire/quizGate/matchSnapshot、整个 net/ 与 PvP hooks。
- **rules 被守卫背书的错**（已改 + 守卫改）：`card-system.md` 写「基础包 BASE 124 张」，`cards.js` 的 `set` 实为 BASE **104** + OCEAN 11 + MICRO 9；
  旧 `test-docs-truth` 拿这格和 `cards.length` 对账，等于把「全部 = 基础包」钉成真理。现改为按 set 逐档对账，7 个变异全红后提交。
- **rules 行号腐烂**（已改）：`battle-system.md` 引用 `useBattle.js:2426 / :2285`，实际已漂到 2460 / 2319。改为函数名。
- **ARCHITECTURE.md**（未改，另开单）：SESSION 路径写成 `.claude/SESSION.md`（在根目录）· 闯关「23 关」实 29 · SP「16 张」实 17 ·
  测试「49 套」实 77 · useBattle「~2300 行」实 2652 · §8「改战斗规则记得玩家/AI 两份都改」与 §3「已 de-fork」自相矛盾 ·
  「Vercel 部署版才是实测目标」已过时 · PvP / relay / wire / quizGate / matchSnapshot 整段缺失。
- **SESSION.md**（已改）：166 行，超出自定的 100 行上限；一半内容是「怎么验证」而非会话状态 → 抽到 `docs/VERIFY.md`（50 行），
  SESSION.md 压到 60 行，只留活的交接。

### 🟠 P1 — 12 个陈旧 worktree + 12 条分支
`.claude/worktrees/wf_3a752b10-2b8-*`：45MB，全部停在 `152b680`（落后 main 23 commits），分支均已 merged 进 main，
但每个都带 1~8 个未提交改动 —— 内容是 7-25 教学守卫（`test-tutorial-solvable`）的变异测试残骸，main 上已有完成版。
这与记忆里「worktree 子代理会静默停在旧 commit」是同一件事。清理命令见 §六。

### 🟡 P2 — 死代码
- `src/effects/battleAnimations.js`：147 行、7 个 export、**0 个 importer**（import 图从 `main.jsx` 可达 91/92 文件，它是唯一不可达的）。
  它是全仓唯一的 `.animate(`（WAAPI）调用，也是 CLAUDE.md「WAAPI 已替代 GSAP」这条虚假描述的来源。

### 🟡 P2 — 依赖与工具链
- `vite` / `@vitejs/plugin-react` / `tailwindcss` / `@tailwindcss/vite` 放在 `dependencies` 而非 `devDependencies`（静态站无害，但 `npm audit --omit=dev` 因此照样报 6 条）。
- `package.json` 无 `engines`；CI 跑 Node 20，本机 Node 25。
- 可升级：eslint 10.6 → 10.10、tailwind 4.2 → 4.3、react 19.2.5 → 19.2.8（patch）；vite 8 / framer 13 / plugin-react 6 是 major，别顺手升。

### 🟡 P2 — 仓库卫生
- `.claude/worktrees/reverent-bhabha/.claude/launch.json` **被 git 跟踪**（gitignore 规则晚于它入库），内容是另一台机器的绝对路径。
- `.claude/skills/idea-unblocker` / `yt-audio` 与本项目无关（Notion 想法箱、YouTube 下载），且全局 `anthropic-skills:*` 已有同名 skill。
- 根目录 `sync-setup-plan.md`（未跟踪，Tailscale/Syncthing 方案）不属于本项目。
- `outputs/` 混放审计报告与一次性脚本（`*.mjs` 已 gitignore，本地留有 3 个）。

### 🟡 P2 — 结构（不是回归，是在长）
| 文件 | 行数 | 量化 |
|---|---|---|
| `hooks/useBattle.js` | 2652 | 33 useCallback · 19 useRef · 9 useState · 返回对象 146 行 |
| `components/BattleScreen.jsx` | 1730 | 17 useState · 11 useRef · 13 useEffect · 主 return 从 804 行起（~930 行 JSX） |
| `components/TutorialScreen.jsx` | 1327 | 21 useState · 17 useCallback；迷你卡内联渲染绕过 `Card.jsx`（SESSION 已记） |

### 🟢 P3 — 中继（relay）安全面
只监听 127.0.0.1、Caddy 反代；token 是 `randomUUID`、按角色发放；客户端不能自选房间码/座位；单帧 256KB 上限；心跳僵尸检测；let-it-crash。
可留意的：无每 IP 限速、无房间数上限（`rooms` Map 无界，靠 60s TTL 兜）、无 `Origin` 校验、token 比较非常量时间（UUID 122 位，实际不可利用）。
家庭规模足够；若将来公开需在 Caddy 层加限速。

### 🟢 P3 — 存档 / PWA
`saveManager` 有版本地板（拒绝降级）、迁移链、`SAVE_KEYS` 单一真相源 + 漂移守卫、`NON_SAVE_KEYS` 隔离 PvP 凭证；
`sw.js` 有 `/api/*` 旁路、同名旧哈希剪枝、dev host 自杀。`main.jsx` 申请 `storage.persist()` 对抗 WebKit 7 天清空。都是对的。

---

## 五、本次已改（全部文档 + 一处守卫，未动运行时代码）
- `CLAUDE.md` 190 → 118 行：技术栈改为真值；结构树补全 engine / net / PvP，保留 `test-docs-truth` 断言的全部锚点；速查加入 de-fork / 事件式技能 / PROTOCOL_VERSION 三条。
- `SESSION.md` 166 → 60 行：只留活的交接；验证纪律抽到新建的 `docs/VERIFY.md`。
- `.claude/rules/{card-system,gacha-cards,battle-system}.md`：set 分档真值、行号→函数名。
- `scripts/test-docs-truth.mjs`：按 set 逐档对账（51 条），7 个变异先红后绿。
- `DEPLOY.md` §5：补「PvP 两台只刷一台」与「deploy 回执不算数」两行排障。

---

## 六、建议动手顺序（都独立，每条 ≤ 10 分钟）
1. 清 worktree（先确认 §四 P1 的描述与你的记忆一致）：
   `git worktree list | grep wf_ | awk '{print $1}' | xargs -n1 git worktree remove --force && git branch -D $(git branch | grep worktree-wf_)`
2. `git rm -r --cached .claude/worktrees/reverent-bhabha`；`git rm -r .claude/skills/idea-unblocker .claude/skills/yt-audio`（全局已有）。
3. `git rm src/effects/battleAnimations.js`，`npm test && npm run build` 应不受影响（0 importer）。
4. `package.json`：四个构建包移到 `devDependencies`，加 `"engines": {"node": ">=20"}`，`npm audit fix`，重跑 CI 三步。
5. ARCHITECTURE.md 对账（§四 P1 清单），顺手把 SESSION 里「教学迷你卡不走 Card.jsx」那条搬进去。
6. 清 `evolutionTo` 死字段（置 `null` 或补进 `EVOLUTION_CHAINS`），加一条守卫防再涨。

*本报告为 2026-09-05 单人审计，所有 `文件:行号` 基于 HEAD `39154b9`。*
