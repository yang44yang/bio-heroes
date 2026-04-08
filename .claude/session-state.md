# Bio Heroes Session State
> 更新时间: 2026-04-08

## 项目位置
- **实际路径**: `/Users/yangyang_macair15/Projects/bio-heroes/`
- **GitHub**: github.com/yang44yang/bio-heroes (main分支)

## 最近完成

### Sprint 20: i18n 中英文切换 ✅
- `src/i18n/LanguageContext.jsx` — React Context（t/cardName/skillName/toggleLang）
- `src/i18n/zh.json` + `en.json` — 190+ 翻译键
- 主菜单右上角 🌐 语言切换按钮，localStorage 持久化
- 全部 13 个组件 i18n 化
- campaignData.js 所有章节/关卡加 nameEn/descriptionEn
- deckRules.js FACTIONS/SUBTYPES/SKILLS 已有 nameEn

### Sprint 20 打磨: 对话+教学翻译+清理 ✅
- **campaignData.js 对话翻译**: 全部 62 条对话加 textEn 英文字段
- **tutorialData.js 教学翻译**: 5关全部加 titleEn/introEn/summaryEn + 所有 step.textEn（~67条）
- **TutorialScreen.jsx**: 添加 loc() 辅助函数，7处渲染位置读取英文字段
- **console.log 清理**: campaignData.js debug 函数包裹 import.meta.env.DEV
- **weakCard()** 函数支持 nameEn 参数，所有教学弱卡有英文名

### 其他修复 ✅
- Campaign 页面中英文切换 bug 修复（章节名/关卡名/星数条件）
- 阵营标记🔒显示当前/需求数量（如🔒🧬0/2）
- DeckBuilder 四个修复（详情弹窗/事件卡过滤/图标布局/卡组满不变暗）

## 已知问题
- 调试 console.log 可能还在 BattleScreen 中（已用 DEV 守卫包裹 campaignData 的）
- Boss 机制尚未实战测试
- formatReward() 中 "SSR保底券🎫" 未翻译（小问题）

## 下次可做

### 短期打磨
1. **Boss 机制实战测试** — 验证新冠/蓝鲸/超级细菌行为钩子
2. **formatReward 翻译** — CampaignScreen.jsx 中 SSR 保底券文本

### 新功能（后续 Sprint）
3. **成就系统** — 收集成就、战斗成就、答题成就
4. **可选主人** — 不同主人有专属被动技能
5. **每日挑战** — 每天随机关卡 + 限定规则 + 额外奖励
6. **Phase 2 扩展包** — OCEAN/MICRO 海洋深渊+微观战场（~160 张新卡）
7. **多人对战** — Supabase Realtime 接入

## 关键文件变更（本次 session）
- `src/data/campaignData.js` — 62 条对话加 textEn + debug 包裹 DEV
- `src/data/tutorialData.js` — 5关全部英文翻译（titleEn/introEn/summaryEn/step.textEn）
- `src/components/TutorialScreen.jsx` — loc() 辅助 + 7处英文字段读取
