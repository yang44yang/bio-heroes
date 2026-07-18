// ESLint flat config —— 只做一件事：no-undef 静态守卫。
//
// 背景：项目原本零静态检查。Vite/esbuild 把未知标识符当全局、**不报错**，grep 锚点测试也查不出
//   → `oppSide` 那一类「用了作用域内未定义的变量」的 bug 能溜过 build + 测试、只能靠齐齐真机撞
//   （见 CLAUDE.md 与 SESSION 的「血泪教训」：grep 全绿 ≠ 运行时没 bug）。
// 这个守卫在 build/测试阶段就能红，是那一族的一劳永逸静态解。
//
// 范围只限**纯 JS 战斗热路径**（src/engine + src/hooks，均无 JSX）—— 最高危、解析零障碍。
//   组件(.jsx)含 JSX，需要额外解析器/插件，噪音大，暂不纳入（本守卫的目标是抓热路径 undef，够用）。
// 只开 no-undef —— 不碰风格/未用变量等规则，避免既有代码涌出一堆无关告警。
// 接进 `npm test`（scripts/test-no-undef.mjs 调用 ESLint Node API）当常驻门禁。
import globals from 'globals';

export default [
  {
    files: ['src/engine/**/*.js', 'src/hooks/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser, // window / document / localStorage / console / setTimeout / structuredClone …
        ...globals.node,    // process / Buffer …（build 期偶用）
      },
    },
    rules: {
      'no-undef': 'error',
    },
  },
  {
    // 中继（PvP 第 3 步）：服务端崩一次掐断所有对局 → 比前端更需要 no-undef。
    // ⚠️ **只给 node globals，不给 browser** —— 比上面的 block 更严：中继误用 window /
    //    document / localStorage 会当场红。中继是纯 Node，没有浏览器环境。
    // no-undef 不解析 import → `import { WebSocketServer } from 'ws'` 是绑定不是未定义全局
    //    → 即使 CI 没装 ws 也能过，server.js 的 no-undef 白拿。
    files: ['relay/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'error',
    },
  },
];
