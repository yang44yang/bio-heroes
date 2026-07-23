// ESLint flat config —— 只做一件事：no-undef 静态守卫。
//
// 背景：项目原本零静态检查。Vite/esbuild 把未知标识符当全局、**不报错**，grep 锚点测试也查不出
//   → `oppSide` 那一类「用了作用域内未定义的变量」的 bug 能溜过 build + 测试、只能靠齐齐真机撞
//   （见 CLAUDE.md 与 SESSION 的「血泪教训」：grep 全绿 ≠ 运行时没 bug）。
// 这个守卫在 build/测试阶段就能红，是那一族的一劳永逸静态解。
//
// 范围：**整个 src/**（含组件 .jsx）+ relay。曾只覆盖纯 JS 热路径（engine/hooks/net），
//   把组件排除在外，理由写的是「JSX 需额外解析器/插件、噪音大」。2026-07 实测那条理由**不成立**：
//   flat config 只要 `parserOptions.ecmaFeatures.jsx = true` 就能解析 JSX，**零插件**，
//   而 8123 行组件跑下来 `no-undef` **零违规**。补上成本为 0，白捡一层守卫。
// 只开 no-undef —— 不碰风格/未用变量/react-hooks 等规则，避免既有代码涌出一堆无关告警。
// 接进 `npm test`（scripts/test-no-undef.mjs 调用 ESLint Node API）当常驻门禁。
import globals from 'globals';

export default [
  {
    // 全前端（engine/hooks/net/components/data/utils/audio/i18n/App/main …）。JSX 解析内置，无需插件。
    files: ['src/**/*.js', 'src/**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
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
