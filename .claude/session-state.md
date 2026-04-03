# Bio Heroes Session State
> 更新时间: 2026-04-03（晚间）

## 项目位置
- **实际路径**: `/Users/yangyang_macair15/Projects/bio-heroes/`
- **GitHub**: github.com/yang44yang/bio-heroes (main分支)

## 最近完成（2026-04-03）

### Sprint 16: 闯关收尾 ✅
- Boss机制接线: 3个Boss行为逻辑 + useBattle钩子调用
- AI强度参数: aiStrength注入出牌/攻击/犹豫3个决策点
- 章节完成奖励: 通关2-4/3-4/4-4发放金币/称号 + 星数里程碑

### UX大修（14个commit） ✅
1. **LeaderPanel大面板** — 替代细血条（头像+名字+HP+可点击直攻），同步到BattleScreen+TutorialScreen
2. **攻击三状态视觉系统** — 等待选攻击者(金色脉冲) / 已选攻击者(上移+金色+ATK标签) / 目标(红色脉冲)
3. **攻击目标红色高亮** — CSS target-pulse动画 + Guard优先逻辑 + 非目标暗化(≥0.5)
4. **教学遮罩修复** — 只在acknowledge步骤显示bg-black/50，操作步骤不渲染遮罩
5. **教学2/5攻击卡住** — 选中攻击者时过滤已攻击/疲劳卡
6. **教学2/5直攻主人卡住** — direct_attack步骤跳过attackedThisTurn检查
7. **教学4/5霸王龙卡住** — SP清场后合并attack+direct为direct_attack步骤
8. **教学5/5虎鲸出不了场×2** — Object.entries遍历factionRequirement的bug（handlePlayCard+isCardLocked两处）
9. **"继续→"按钮** — 替代"点击任意处继续"
10. **教学提示文字** — "左上角"→"上方"，直攻步骤统一"点你的卡→点对手面板"
11. **教学引导定位** — 去掉▲▼箭头，提示框根据目标位置动态定位
12. **直攻步骤不暗化己方卡** — 避免双重暗化让整个区域看起来不可交互
13. **BattleScreen布局重做** — 卡槽aspect-[5/7]→h-full, 手牌固定130px, flex弹性分配

### 环境
- worktree已清理，直接在main分支工作
- CLAUDE.md新增Git工作流规则

## 进行中
- 无

## 已知问题
- Boss机制尚未实战测试（需手动打到2-4/3-4/4-4验证触发效果）
- 布局在极端视口（<400px高度）可能需要进一步测试
- launch.json用了绝对路径 `/opt/homebrew/bin/node`

## 下次启动时优先
1. 实战测试教学1-5全流程（Vercel上）
2. 实战测试Boss机制（闯关2-4/3-4/4-4）
3. 成就系统
4. 可选主人 / 多人对战 / 每日挑战
5. 新卡牌扩充 / 视觉美化

## 关键文件变更（2026-04-03 全天）

| 文件 | 说明 |
|------|------|
| `src/engine/bossMechanics.js` | **新建** — 3个Boss行为逻辑 |
| `src/hooks/useBattle.js` | Boss钩子 + bossPreplaced + immune检查 |
| `src/utils/damage.js` | immune/immune_tech伤害豁免 |
| `src/engine/statusEffects.js` | immune/immune_tech状态递减 |
| `src/components/BattleScreen.jsx` | LeaderPanel + 攻击视觉系统 + AI强度 + 布局重做 |
| `src/components/TutorialScreen.jsx` | LeaderPanel同步 + 攻击高亮 + 遮罩修复 + factionReq bug |
| `src/components/CampaignScreen.jsx` | 里程碑显示 + 科学家称号 |
| `src/App.jsx` | 章节完成奖励 + 星数里程碑 |
| `src/index.css` | target-pulse/tutorial-pulse CSS + 紧凑模式更新 |
| `src/data/tutorialData.js` | 文字修正 + 步骤合并 + 直攻提示统一 |

## 技术备忘

### 布局架构（BattleScreen flex column）
```
容器: h-screen-d flex flex-col overflow-hidden
├─ 顶部栏: shrink-0
├─ 环境事件: shrink-0
├─ 敌方主人面板: shrink-0 (LeaderPanel)
├─ 敌方PB: shrink-0
├─ 敌方卡槽: flex-1 min-h-0（卡片h-full自适应）
├─ VS分隔: shrink-0
├─ 己方卡槽: flex-1 min-h-0（卡片h-full自适应）
├─ 己方PB: shrink-0
├─ 己方主人面板: shrink-0 (LeaderPanel)
├─ 能量/SP: shrink-0
├─ 手牌区: shrink-0 height:130px
└─ 战斗日志: shrink-0
```

### factionRequirement 检查（两处都已修）
```javascript
// 正确写法
const reqFaction = card.factionRequirement.faction
const reqCount = card.factionRequirement.count
// 错误写法（Object.entries遍历了type/scienceNote）
for (const [faction, count] of Object.entries(card.factionRequirement))
```

### 教学遮罩规则
- `acknowledge`步骤: 渲染bg-black/50遮罩（可点击推进）
- 所有操作步骤: 不渲染遮罩（play_card/attack/direct_attack/end_turn等）

### Boss机制架构
`bossMechanics.js` → `getBossMechanic(id)` → `{ onTurnStart?, onTurnEnd?, onHPThreshold? }`
`bossStateRef` 追踪阶段(1/2/3)，事件通过 `bossMechanicEvents` state传递到BattleScreen。
