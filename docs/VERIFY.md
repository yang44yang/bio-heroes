# 验证与部署纪律（VERIFY）

> 从 SESSION.md 抽出来的「怎么证明它真的对了」。这些不是会话状态，是每次改完代码都要走的固定流程。
> 会话状态看 `SESSION.md`，架构看 `ARCHITECTURE.md`，部署步骤看 `DEPLOY.md`。

## 1. 自动化守卫

- `npm test`（`scripts/test-*.mjs`）+ `npm run lint`（只开 `no-undef`）。CI 同样三步：lint → test → build。
- 动过 `relay/lib/*` 或 `relay/server.js` 必须另跑 `cd relay && npm run smoke`（不进主 CI）。
- **假绿铁律**：fixture 从真模块改，绝不手搓「长得像」的对象；engine 测试的 ctx 必须与生产调用点逐字段一致；
  相对 import 带 `.js`（Node ESM 不补扩展名，漏了守卫就静默失效）。
- **新守卫必须配变异测试**：先在未修的代码上变红，再提交。
- **grep 型断言一律跑在去掉注释的源码上**。本项目已三次被自己写的注释骗出假绿/假红。
- 数字型 grep 必须带边界（`2%` 会匹配到 `12%`）。
- 教学守卫 `test-tutorial-solvable` 是规则复刻，不跑真组件：改了 `TutorialScreen` 的判定要同步改它的 `successors()`；
  别把兜底逃生阀加进模拟器（那等于把守卫阉割成永远绿）。
- 新增 `useState/useRef` 到 PvP host 引擎要登记进 `matchSnapshot` 的清单，否则 `test-match-snapshot` 红。
- 新增 localStorage key 要登记进 `saveManager.SAVE_KEYS`（或 `NON_SAVE_KEYS`），否则 `test-save-manager` 红。
- 新增教学 highlight 区域必须同时给出渲染分支和 `data-tut-lit` 标记；箭头方向不许写回数据（量出来的才不会和布局漂移）。
- 卡内新增任何一行都要挂 `data-cq` 钩子，否则它就是「无钩子的固定 px」（守卫 `test-hand-card-cq`）。

## 2. 浏览器走查（`vite preview`，端口 4174）

- 用 preview 不用 dev：沙箱里 dev 的 HMR 对懒加载块不可靠。起服务前先查端口，`EADDRINUSE` 会让你对着旧代码测。
- 先 resize 视口再看布局。家长门 prompt 答 56。
- React 状态是异步的：点击和读状态分两次调用。
- 无头 tab 是 `hidden` 的：rAF 不触发、Framer 动画冻在半途，截图会拍到假 bug。先查 `document.visibilityState`；
  注入 `*{opacity:1 !important}` 破掉 framer 冻在 `initial:{opacity:0}` 的元素，再用 JS `.click()` 驱动（React 合成事件收得到）。
- 量布局别信截图，读 `getBoundingClientRect()`：一次 JS 调用就能把容器/卡槽/比例/溢出/滚动条全测完。
- 自动走查教学/战斗：靠 class 猜可点元素会落空（教学迷你卡是内联渲染的）。读 React fiber 的 props：
  `Object.keys(el).find(k => k.startsWith('__reactProps$'))`，筛 `typeof props.onClick === 'function'`。
  教学的 onClick 是按可点性条件挂的，有它就等于游戏此刻接受这次点击。循环 >30s 会超时，挂 `window.__L` 轮询而不是 await。
- 教学的 hook（`bubbleRef`/`arrow`/`useLayoutEffect`）必须在所有早期 return 之前，放错是 React #310，只有 preview 走查能发现。

## 3. 部署回验（`npm run deploy` 的回执不算数，曾整晚没落地）

1. 本地 `npm run build`，记下 `dist/assets/` 里的文件名。
2. `grep -l 关键字 dist/assets/*.js` 找出承载该功能的 chunk。教学/PvP/抽卡/Card 都在 lazy chunk 里，entry 里搜不到。
3. 到线上取同名文件：既比 md5，又数关键字；再加反向哨兵（被替换掉的旧写法计数为 0）。
4. 样式改动去 `index-*.css` 里验（Tailwind 类名不在 JS 里）；本地 entry 里同样是 0 就说明不是部署问题。
5. 运行时算出来的数（如图鉴总数 157）只能在页面上验，不能在 bundle 里 grep。
6. 数据改动的字面量压缩后常不存在（`playerEnergy:7`），按「关卡名前后取段 + 正则」定位。
7. 旧 chunk URL 仍返回 200 是 SPA fallback 吐的 index.html（`content-type: text/html`），不是残留。
8. relay 用 `npm run deploy:api`，前端用 `npm run deploy`，两者分开跑（DEPLOY.md §4.3）。
9. 别照抄文档里记的旧 hash，每次自己重新 build + curl。

## 4. 通道纪律

- 工具输出可疑时用 `git status` / `md5` / `lsof` 独立回验，绝不信「成功」回执。
- worktree 里的子代理可能静默停在旧 commit 上，要它给 diff 证明再信「守卫是瞎的」这类结论。
