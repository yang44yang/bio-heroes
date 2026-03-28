# Bio Heroes Session State
> 更新时间: 2026-03-28

## 项目位置
- **实际路径**: `/Users/YangYANG/projects/bio-heroes/`
- **符号链接**: `/Users/YangYANG/projects/2026 AI/bio-heroes` → 指向上面（同一份代码）
- **GitHub**: github.com/yang44yang/bio-heroes (main分支)
- macOS文件系统大小写不敏感，`Projects` = `projects`

## 最近完成（2026-03-28）

### 教学 Bug 修复
- 教学关卡2敌方ATK降至500，修复互扣秒死bug（`tutorialCard()`辅助函数）
- 教学关卡2步骤3去掉不存在的🔺标记引用，改为阵营图标说明

### 战斗UI优化
- 战斗界面顶部栏新增🚪退出按钮（确认弹窗，闯关提示"退出将视为失败"）
- 操作按钮（结束出牌/结束回合）从底部控制栏移至手牌标题行右侧，修复iPad横屏按钮被截断
- 点击不可出牌的手牌显示原因toast（能量不足/阵营标记不足，2秒自动消失）

### 闯关选卡组流程
- 闯关点"开始战斗"后先跳转卡组管理选卡，选完再进入战斗
- DeckBuilder返回按钮：从闯关进入时回闯关画面，从主菜单进入时回主菜单
- 使用 `pendingCampaignRef` 暂存闯关配置，选卡后合并

### 阵营标记需求可视化
- Card.jsx 卡牌底部显示阵营标记前置条件（如"🔒🧬2张人体系"）
- 图鉴、卡组编辑、战斗手牌中均可见

## 进行中
- 无

## 已知问题
- Vite dev server HMR在headless preview环境中有时不刷新（WebSocket连接失败），但production build正确
- Boss特殊机制（超级传播/声纳/三阶段）定义在campaignData但useBattle的bossMechanic钩子可能未完全接线
- AI强度参数(aiStrength 0.3-0.8)定义在campaignData，但useBattle的AI逻辑是否读取待验证
- 章节完成奖励（spec有但未实现）

## 下次启动时优先
1. Boss机制完整实现（可选）
2. AI强度参数接线验证
3. 成就系统（后续feature）

## 关键文件变更（2026-03-28）

| 文件 | 说明 |
|------|------|
| `src/App.jsx` | 闯关选卡组流程（pendingCampaignRef + DeckBuilder返回逻辑） |
| `src/components/BattleScreen.jsx` | 🚪退出按钮+确认弹窗、操作按钮移至手牌行、不可出牌toast |
| `src/components/Card.jsx` | 阵营标记需求显示（🔒🧬2张人体系） |
| `src/data/tutorialData.js` | tutorialCard()辅助函数、教学2敌方ATK降至500、步骤3文本修复 |

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
