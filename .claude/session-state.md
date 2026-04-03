# Bio Heroes Session State
> 更新时间: 2026-04-04

## 项目位置
- **实际路径**: `/Users/yangyang_macair15/Projects/bio-heroes/`
- **GitHub**: github.com/yang44yang/bio-heroes (main分支)

## 最近完成

### Sprint 16: 闯关收尾 ✅
- Boss机制接线 + AI强度参数 + 章节完成奖励

### UX/教学大修 ✅ (14 commits)
- LeaderPanel + 攻击三状态视觉 + 教学遮罩/卡住bug×4 + 按钮/文字修正

### 布局重做 ✅ (v1→v4)
- 卡槽 flex-1 min-h-0 max-h-[25vh] h-full + 手牌 shrink-0
- PB条加高 h-4 sm:h-5 + 间距呼吸感

### 新手欢迎弹窗 ✅
- IntroModal.jsx: 游戏介绍+4大玩法+4阵营+开始教学/跳过
- App.jsx: 首次进入弹IntroModal（localStorage bio-heroes-intro-seen）
- 老玩家自动标记已看过（useEconomy loadEconomy中检测）

## 进行中
- 响应式测试（桌面Chrome已验证IntroModal+教学列表正常，战斗界面待完整测试）

## 已知问题
- Boss机制尚未实战测试
- 响应式在手机/iPad实机上待验证
- launch.json 已简化为只保留 dev 配置

## 下次启动时优先
1. 响应式实测（Vercel 上用手机/iPad 测试）
2. Boss关卡实测（2-4/3-4/4-4）
3. 成就系统 / 可选主人 / 每日挑战

## 技术备忘

### IntroModal 触发条件
```
!localStorage.getItem('bio-heroes-intro-seen') → 弹窗
点击"开始教学"或"跳过" → localStorage.setItem('bio-heroes-intro-seen', 'true')
老玩家（有存档） → useEconomy 自动设 intro-seen
```

### BattleScreen 布局架构 (v4)
```
容器: h-screen-d flex flex-col overflow-hidden
├─ 顶部栏: flex-none
├─ 敌方主人面板: flex-none (LeaderPanel)
├─ 敌方PB: flex-none py-1 (h-4 sm:h-5)
├─ 敌方卡槽: flex-1 min-h-0 max-h-[25vh] py-2 (卡片h-full)
├─ VS分隔: flex-none py-1.5
├─ 己方卡槽: flex-1 min-h-0 max-h-[25vh] py-2 (卡片h-full)
├─ 己方PB: flex-none py-1
├─ 己方主人面板: flex-none (LeaderPanel)
├─ 手牌区: shrink-0 (卡片max-h-[110px])
└─ 日志: hidden sm:block max-h-10
```

### 教学遮罩规则
acknowledge → bg-black/50 | 操作步骤 → 不渲染遮罩

### factionRequirement 检查
只用 `.faction` + `.count`，不要 `Object.entries`
