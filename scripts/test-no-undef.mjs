#!/usr/bin/env node
// no-undef 静态守卫（接入 npm test）—— 抓 `oppSide` 那一族「用了作用域内未定义的变量」的 bug。
//
// 为什么需要：Vite/esbuild 把未知标识符当全局、**不报错**，grep 锚点测试也查不出
//   → 这类 bug 只能靠齐齐真机撞（如 handlePostAttackSkills 漏定义 oppSide → 击杀防守方
//   ReferenceError → 异步 AI 回合静默 reject 卡死）。本守卫在 build/测试阶段就把它红出来。
// 范围：纯 JS 战斗热路径 src/engine + src/hooks（无 JSX），见 eslint.config.js。
// 只依赖 no-undef 规则；用 ESLint Node API 直接读诊断（不靠 CLI 退出码）。
import { ESLint } from 'eslint';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PATTERNS = ['src/engine/**/*.js', 'src/hooks/**/*.js'];

const eslint = new ESLint({ cwd: ROOT });
const results = await eslint.lintFiles(PATTERNS);

let errors = 0;
for (const r of results) {
  for (const m of r.messages) {
    if (m.severity === 2) {
      errors++;
      console.error(`❌ ${r.filePath.replace(ROOT + '/', '')}:${m.line}:${m.column}  ${m.message}  (${m.ruleId})`);
    }
  }
}

// 兜底：glob/config 坏掉导致 0 文件被扫，会让"0 错误"假绿 —— 直接判失败。
if (results.length === 0) {
  console.error('❌ test-no-undef: 没扫到任何文件（glob/eslint.config.js 坏了？）');
  process.exit(1);
}

console.log(`\n${errors ? '❌' : '✅'} test-no-undef: 扫了 ${results.length} 个热文件，未定义变量 ${errors} 个`);
process.exit(errors ? 1 : 0);
