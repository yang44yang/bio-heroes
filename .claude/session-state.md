# Bio Heroes Session State
> 更新时间: 2026-03-27

## 项目位置
- **实际路径**: `/Users/YangYANG/projects/bio-heroes/`
- **符号链接**: `/Users/YangYANG/projects/2026 AI/bio-heroes` → 指向上面（同一份代码）
- **GitHub**: github.com/yang44yang/bio-heroes (main分支)
- macOS文件系统大小写不敏感，`Projects` = `projects`

## 最近完成（本session）

### Sprint 12：基建部署
- GitHub仓库创建推送 + Vercel部署就绪

### Sprint 13：教学模块
- 5关渐进式教学 + 步骤引导系统 + 毕业奖励

### Sprint 14：闯关战役
- 4章17关 + 战前/战后对话 + Boss机制 + 三星评价 + 首通奖励

### Sprint 15：Bug修复 + 响应式 + 新手体验
- 初始金币3000 + 20张初始卡牌 + 欢迎弹窗 + 存档迁移v2→v3
- 闯关bug修复（bossMechanic/leaderHPPercent/_campaignEnemy残留）
- "自由对战"先跳DeckBuilder + DeckBuilder按collection过滤
- 响应式全面完成（dvh/max-w-3xl/sm:断点/触摸44px）
- **Tailwind v4兼容修复**：非工具类名被剥离→改用data-*属性选择器（12个）
- 手机横屏紧凑模式 + 竖屏横屏提示
- 教学引导UX增强（非目标压暗/目标发光/按钮z-index）
- 4-4 SSR保底券奖励（useSSRTicket + CampaignScreen显示🎫）

## 进行中
- 无

## 已知问题
- Vite dev server HMR在headless preview环境中有时不刷新（WebSocket连接失败），但production build正确
- 闯关选卡组流程：闯关直接用上次选的卡组或默认测试卡组，没有强制先选卡组
- Boss特殊机制（超级传播/声纳/三阶段）定义在campaignData但useBattle的bossMechanic钩子可能未完全接线
- AI强度参数(aiStrength 0.3-0.8)定义在campaignData，但useBattle的AI逻辑是否读取待验证
- 章节完成奖励（spec有但未实现）

## 下次启动时优先
1. 验证Vercel部署是否正常工作
2. 闯关选卡组流程优化（可选）
3. Boss机制完整实现（可选）
4. 成就系统（后续feature）

## 关键文件变更（本session）

### 新增文件
| 文件 | 说明 |
|------|------|
| `src/data/tutorialData.js` | 5关教学数据（手牌/场面/步骤引导） |
| `src/components/TutorialScreen.jsx` | 教学界面（关卡选择+战斗引导+总结） |
| `src/data/campaignData.js` | 4章12关闯关配置（敌方卡组/AI/对话/奖励） |
| `src/components/CampaignScreen.jsx` | 闯关地图+关卡详情+星数 |
| `src/components/DialogueBox.jsx` | 战前/战后剧情对话框 |

### 修改文件
| 文件 | 说明 |
|------|------|
| `src/App.jsx` | 教学/闯关/欢迎弹窗集成、闯关奖励发放、_campaignEnemy清除、SSR券 |
| `src/components/TitleScreen.jsx` | 新增闯关/教学按钮、sm:断点、onOpenCampaign |
| `src/components/BattleScreen.jsx` | 闯关配置支持、对话集成、data-*属性替代CSS类名（12个）、敌方aspect-ratio修复 |
| `src/hooks/useBattle.js` | 自定义敌方HP、闯关战斗结果含leaderHPPercent |
| `src/hooks/useEconomy.js` | 初始金币3000+初始卡牌、useSSRTicket、dismissNewPlayer |
| `src/utils/saveManager.js` | 存档v3迁移（补发金币+卡牌） |
| `src/index.css` | data-*属性选择器替代CSS类名选择器 |
| `CLAUDE.md` | Sprint 13-15完成记录 |

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
