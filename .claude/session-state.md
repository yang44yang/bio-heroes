# Bio Heroes Session State
> 更新时间: 2026-04-03

## 项目位置
- **实际路径**: `/Users/YangYANG/projects/bio-heroes/`
- **符号链接**: `/Users/YangYANG/projects/2026 AI/bio-heroes` → 指向上面（同一份代码）
- **GitHub**: github.com/yang44yang/bio-heroes (main分支)
- macOS文件系统大小写不敏感，`Projects` = `projects`

## 最近完成（2026-04-03）— Sprint 16

### Boss 机制接线（P0）
- 新建 `src/engine/bossMechanics.js`：3 个 Boss 行为逻辑
  - covid_boss (2-4): onTurnEnd 50%召唤病毒副本，HP<50% ATK+2000 + 变异对话
  - whale_boss (3-4): 每3回合声纳AOE 2500伤害，HP<30% 1回合完全免疫
  - super_bacteria_boss (4-4): HP<60%免疫科技系，HP<30%每回合自愈2000HP
- `useBattle.js`: campaignConfigRef + bossStateRef + 钩子调用点(onTurnStart/onTurnEnd/onHPThreshold)
- `useBattle.js`: bossPreplaced 处理（Boss卡回合1预置到敌方场上）
- `damage.js`: immune/immune_tech 伤害豁免检查
- `statusEffects.js`: immune/immune_tech 状态回合递减
- `BattleScreen.jsx`: Boss事件消费（浮字 + bossHalfHP对话触发）

### AI 强度参数（P1）
- aiStrength (0.3-0.8) 注入 3 个决策点：
  1. 出牌选择：高强度选最优卡，低强度随机选
  2. 攻击目标：高强度精准击杀/威胁，低强度随机攻击
  3. 犹豫概率：`0.30 - aiStr * 0.25`（强AI犹豫更少）

### 章节完成奖励（P2）
- `App.jsx`: 通关2-4/3-4/4-4发放章节奖励（金币/称号）
- 星数里程碑：30星500金币，45星1000金币
- `CampaignScreen.jsx`: 里程碑目标显示 + 科学家🔬称号
- `BattleScreen.jsx`: Boss战结算画面显示章节奖励

### Git 工作流更新
- CLAUDE.md 新增规则：所有改动直接在 main 分支工作和推送，不创建 branch/PR

## 进行中
- 无

## 已知问题
- Vite dev server HMR在headless preview环境中有时不刷新（WebSocket连接失败），但production build正确
- Boss机制尚未实战测试（需要手动打到2-4/3-4/4-4验证触发效果）
- launch.json 在 worktree 中改为绝对路径 `/opt/homebrew/bin/node`（主仓库可能需要同步）

## 下次启动时优先
1. 实战测试 Boss 机制（打2-4/3-4/4-4验证触发）
2. 成就系统（后续 feature）
3. 可选主人系统 / 多人对战 / 每日挑战

## 关键文件变更（2026-04-03）

| 文件 | 说明 |
|------|------|
| `src/engine/bossMechanics.js` | **新建** — 3个Boss行为逻辑(covid/whale/super_bacteria) |
| `src/hooks/useBattle.js` | Boss钩子调用 + bossPreplaced + campaignConfig传入 |
| `src/utils/damage.js` | immune/immune_tech 伤害豁免 |
| `src/engine/statusEffects.js` | immune/immune_tech 状态回合递减 |
| `src/components/BattleScreen.jsx` | AI强度注入 + Boss UI反馈 + 章节奖励结算 |
| `src/App.jsx` | 章节完成奖励 + 星数里程碑 |
| `src/components/CampaignScreen.jsx` | 里程碑显示 + 科学家称号 |
| `CLAUDE.md` | Git工作流规则（直接main分支） |

## 技术备忘

### Tailwind v4 重要发现
Tailwind v4 会**剥离非工具类名**从DOM中。例如 `className="field-area flex-1"` 渲染后只剩 `class="flex-1"`，`field-area` 被移除。
**解决方案**：用 `data-*` 属性替代自定义CSS类名（如 `data-field-area="true"`），CSS选择器用 `[data-field-area]`。

### 存档版本
- v1: 初始版本
- v2: 添加saveVersion字段
- v3: 初始金币3000 + 初始卡牌礼包（v2→v3迁移自动补发）

### SSR保底券机制
`useSSRTicket()` 设 `pityCounter = SSR_PITY - 1 = 49`，下次抽卡必触发50抽硬保底出SSR。

### iPad布局注意
BattleScreen 使用 `h-screen-d`(100dvh) + `overflow-hidden` + `flex-col`。操作按钮不能放在手牌区下方的独立控制栏，否则在iPad横屏(768px高)会被截断。已改为放在手牌标题行右侧。

### Boss 机制架构
- `bossMechanics.js` 导出 `getBossMechanic(id)` → 返回 `{ onTurnStart?, onTurnEnd?, onHPThreshold? }`
- `bossStateRef` 追踪阶段（phase: 1/2/3），避免重复触发 HP 阈值
- Boss 事件通过 `bossMechanicEvents` state 传递到 BattleScreen 消费（浮字+对话）
