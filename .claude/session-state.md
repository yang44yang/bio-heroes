# Bio Heroes Session State
> 更新时间: 2026-04-03（深夜）

## 项目位置
- **实际路径**: `/Users/yangyang_macair15/Projects/bio-heroes/`
- **GitHub**: github.com/yang44yang/bio-heroes (main分支)

## 最近完成（2026-04-03）

### Sprint 16: 闯关收尾 ✅
- Boss机制接线 + AI强度参数 + 章节完成奖励

### UX/教学大修 ✅ (14 commits)
- LeaderPanel大面板（BattleScreen + TutorialScreen）
- 攻击三状态视觉系统（金色选中/红色目标/暗化非目标，≥0.5）
- 教学遮罩：只在acknowledge步骤显示
- 教学卡住bug×4：2/5攻击、2/5直攻主人、4/5霸王龙、5/5虎鲸×2
- "继续→"按钮替代"点击任意处继续"
- 教学文字修正 + 直攻提示统一

### 布局重做 ✅ (4 iterations: v1→v4)
- **最终方案(v4)**：卡槽 `flex-1 min-h-0 max-h-[25vh] h-full` + 手牌 `shrink-0`
- PB条 `h-4 sm:h-5` 加高 + 始终显示
- 间距呼吸感：PB `py-1`、卡槽 `py-2`、VS `py-1.5`
- 战斗日志手机端隐藏 `hidden sm:block`
- 手牌卡片 `max-h-[110px]`

## 进行中
- 无

## 已知问题
- Boss机制尚未实战测试
- 布局在极端视口可能需要微调
- launch.json绝对路径 `/opt/homebrew/bin/node`

## 下次启动时优先
1. Vercel上实测教学1-5全流程
2. 实测Boss关卡（闯关2-4/3-4/4-4）
3. 成就系统 / 可选主人 / 多人对战 / 每日挑战

## 技术备忘

### BattleScreen 布局架构 (v4最终版)
```
容器: h-screen-d flex flex-col overflow-hidden
├─ 顶部栏: flex-none
├─ 敌方主人面板: flex-none (LeaderPanel shrink-0)
├─ 敌方PB: flex-none py-1 (h-4 sm:h-5, 始终显示)
├─ 敌方卡槽: flex-1 min-h-0 max-h-[25vh] py-2 (卡片h-full)
├─ VS分隔: flex-none py-1.5
├─ 己方卡槽: flex-1 min-h-0 max-h-[25vh] py-2 (卡片h-full)
├─ 己方PB: flex-none py-1
├─ 己方主人面板: flex-none (LeaderPanel shrink-0)
├─ 手牌区: shrink-0 (卡片max-h-[110px])
└─ 日志: hidden sm:block max-h-10
```

### factionRequirement 检查
只用 `.faction` 和 `.count`，不要 `Object.entries`

### 教学遮罩规则
`acknowledge` → bg-black/50 遮罩 | 操作步骤 → 不渲染遮罩
