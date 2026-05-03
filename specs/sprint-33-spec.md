# Sprint 33 Spec: 全场景卡片详情查看(CardDetailModal)

> **Notion 同步**: https://www.notion.so/355264d184928167b698edf1d4f97d45
> **本地版本**: 本文件,作为 Claude Code 主要读取源
> **目标**: 让玩家在游戏的**任何场景**点击卡牌缩略图,都能看到完整详情(技能描述、scienceCard、子类型、tags、持有数量等)
>
> **范围**: 一个通用 `CardDetailModal` 组件 + 5 个场景集成
>
> **预估**: 1.5-2 小时

---

## 背景

齐齐 iPad 实测发现:**对战中无法查看场上卡牌的详情**。但深入分析后,这其实是一个**全局问题**:

| 场景 | 现状 | 用户痛点 |
|---|---|---|
| 战斗中场上卡 | 不能点 | 看不到对方卡的克制关系/技能 |
| 战斗中手牌卡 | 不能点(只能拖) | 不知道这张要不要打出来 |
| 抽卡结果网格 | 不能点 | 抽完不知道是什么(齐齐之前反馈) |
| DeckBuilder 卡组卡 | 可能可以点(待确认) | — |
| Collection 图鉴 | 应该已有详情(待确认) | — |

这跟 Sprint 31a 的 Bug #1 是同一个根因,但范围更大。**用一个统一的 modal 组件解决所有场景**。

---

## Part 1: 通用 CardDetailModal 组件

新建 `src/components/CardDetailModal.jsx`,作为整个游戏的**唯一卡牌详情查看入口**。

### 1.1 组件接口

```jsx
<CardDetailModal
  card={card}                       // 必需:完整卡牌对象
  onClose={() => setSelected(null)} // 必需:关闭回调
  context="battle"                  // 可选:'battle' | 'gacha' | 'deck' | 'collection'
  ownership={{ count: 2, fragments: 15 }}  // 可选:持有数量和碎片
  showActions={true}                // 可选:是否显示"加入卡组"等操作按钮
/>
```

### 1.2 显示内容(分层级)

所有场景共有的核心信息:
- 卡名 + 阵营图标 + 稀有度
- ATK / HP / Cost
- 子类型(subType)
- 所有技能(name + description + scienceNote)
- scienceCard 完整内容
- tags(如果有)

根据 context 的差异化:

| context | 额外显示 |
|---|---|
| `battle` | 当前 ATK/HP(可能有 buff/debuff) + 状态效果(中毒/护盾等) + 阵营要求 |
| `gacha` | 是否新卡(NEW) + 持有数量 + 是否转成碎片 |
| `deck` | 持有数量 / 是否齐(x3) + 进化路径 |
| `collection` | 持有 + 碎片 + 卖出按钮 + 进化按钮(如果可用) |

### 1.3 实现

```jsx
import { motion, AnimatePresence } from 'framer-motion'
import { FACTIONS } from '../data/factions'

export default function CardDetailModal({ 
  card, 
  onClose, 
  context = 'collection',
  ownership = null,
  showActions = false,
}) {
  if (!card) return null
  
  const factionInfo = FACTIONS[card.faction]
  
  return (
    <motion.div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-900 border border-cyan-500/40 rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
      >
        {/* 头部 */}
        <div className="text-center mb-4">
          <div className="text-3xl mb-1">{factionInfo?.icon}</div>
          <div className="text-2xl font-bold text-white">{card.name}</div>
          <div className="text-sm text-gray-400">
            {factionInfo?.name} · {card.subType} · {card.rarity}
          </div>
        </div>
        
        {/* 数值 */}
        <div className="flex justify-around mb-4 bg-gray-800/50 rounded-lg p-3">
          <div className="text-center">
            <div className="text-xs text-gray-400">ATK</div>
            <div className="text-xl text-red-400 font-bold">{card.atk}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">HP</div>
            <div className="text-xl text-green-400 font-bold">{card.hp}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400">⚡ Cost</div>
            <div className="text-xl text-yellow-400 font-bold">{card.cost}</div>
          </div>
        </div>
        
        {/* 阵营要求(如果有) */}
        {card.factionRequirement && (
          <div className="mb-3 bg-orange-900/30 border-l-4 border-orange-400 rounded p-3">
            <div className="text-xs font-bold text-orange-300 mb-1">🔒 登场条件</div>
            <div className="text-sm text-white">
              需要 {card.factionRequirement.count} 张 {FACTIONS[card.factionRequirement.faction]?.name}
              {card.factionRequirement.type === 'consume' && '(消耗)'}
              {card.factionRequirement.type === 'check' && '(持有即可)'}
            </div>
            {card.factionRequirement.scienceNote && (
              <div className="text-xs text-orange-200 mt-1 italic">
                {card.factionRequirement.scienceNote}
              </div>
            )}
          </div>
        )}
        
        {/* 技能 */}
        {card.skills?.map((skill, i) => (
          <div key={i} className="mb-3 bg-purple-900/30 border-l-4 border-purple-400 rounded p-3">
            <div className="text-sm font-bold text-purple-200 mb-1">
              🎯 {skill.name}
            </div>
            <div className="text-sm text-white leading-relaxed">
              {skill.description}
            </div>
            {skill.scienceNote && (
              <div className="text-xs text-purple-300 mt-2 italic">
                💡 {skill.scienceNote}
              </div>
            )}
          </div>
        ))}
        
        {/* scienceCard */}
        {card.scienceCard && (
          <div className="mb-3 bg-cyan-900/30 border-l-4 border-cyan-400 rounded p-3">
            <div className="text-xs font-bold text-cyan-300 mb-1">📚 你知道吗?</div>
            <div className="text-sm text-white leading-relaxed">
              {card.scienceCard}
            </div>
          </div>
        )}
        
        {/* tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {card.tags.map(tag => (
              <span key={tag} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}
        
        {/* 持有信息(根据 context) */}
        {ownership && (context === 'gacha' || context === 'deck' || context === 'collection') && (
          <div className="mb-3 bg-gray-800/40 rounded-lg p-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-300">持有数量</span>
              <span className="text-white font-bold">
                {ownership.count} / 3
                {ownership.count >= 3 && <span className="ml-2 text-green-400 text-xs">✓ 已齐</span>}
              </span>
            </div>
            {ownership.fragments > 0 && (
              <div className="flex justify-between items-center text-sm mt-1">
                <span className="text-gray-300">碎片</span>
                <span className="text-yellow-300 font-bold">{ownership.fragments}</span>
              </div>
            )}
          </div>
        )}
        
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg mt-2"
        >
          知道了
        </button>
      </motion.div>
    </motion.div>
  )
}
```

---

## Part 2: 5 个场景集成

### 2.1 战斗中场上卡(BattleScreen)— 齐齐当前痛点

```jsx
// BattleScreen.jsx
const [detailCard, setDetailCard] = useState(null)

// 渲染场上卡时,加 ⓘ 角标:
<div className="card-container relative">
  <Card {...props} onClick={existingClickHandler} />
  <button 
    className="absolute top-1 right-1 w-5 h-5 bg-cyan-600/80 rounded-full text-white text-xs flex items-center justify-center"
    onClick={(e) => { 
      e.stopPropagation()
      setDetailCard(card) 
    }}
  >
    i
  </button>
</div>

// 底部:
{detailCard && (
  <CardDetailModal
    card={detailCard}
    context="battle"
    onClose={() => setDetailCard(null)}
  />
)}
```

**关键**: 弹出详情时**战斗暂停**(不让 AI 回合在玩家看详情时推进)。

### 2.2 战斗中手牌卡

手牌区已有拖拽逻辑(拖到场上)。同样加 ⓘ 角标:

```jsx
// 手牌卡也加 ⓘ 角标,跟场上卡的处理方式一致
```

### 2.3 抽卡结果网格(GachaScreen)

```jsx
<button onClick={() => setSelected(card)}>
  {/* 卡牌缩略图 */}
</button>

{selected && (
  <CardDetailModal
    card={selected}
    context="gacha"
    ownership={{ 
      count: economy.collection[selected.id] || 0,
      fragments: economy.fragments[selected.id] || 0 
    }}
    onClose={() => setSelected(null)}
  />
)}
```

### 2.4 DeckBuilder 卡组里的卡

先确认 DeckBuilder 现有的点击逻辑(可能是"点击加入卡组")。如果是,这里也用 ⓘ 角标。

### 2.5 Collection 图鉴

如果 Collection 已经有详情逻辑,**用新的 CardDetailModal 替代**(统一组件)。如果没有,直接集成。

---

## Part 3: 防止冲突的设计

### 3.1 战斗中的交互优先级

战斗中卡片点击有多个含义:
- 点击场上敌方卡 = 选择攻击目标
- 点击场上己方卡 = 选择攻击者
- 点击手牌卡 = 选中准备出牌

**详情查看不应该破坏这些**。

**采用方案**: 卡片右上角加 ⓘ 图标,**只有点图标弹详情**,点卡牌本身保持原逻辑。

理由:更明确,7 岁小朋友更容易理解"点 i 看详情"。

### 3.2 z-index 协调

Modal 用 `z-[95]` 或更高,确保盖在战斗 UI 之上。

---

## 实施顺序

```
Step 1: 创建 src/components/CardDetailModal.jsx 通用组件
        测试: 在某个页面手动渲染一个卡牌,验证显示完整
        commit

Step 2: BattleScreen 集成 — 场上卡加 ⓘ 角标
        测试: 战斗中点角标弹详情,点卡牌本身仍然攻击/选中
        commit

Step 3: BattleScreen 集成 — 手牌卡加 ⓘ 角标
        测试: 手牌点角标弹详情,拖拽出牌不受影响
        commit

Step 4: GachaScreen 集成
        测试: 抽卡完成后点卡显示详情
        commit

Step 5: DeckBuilder 集成(如果需要)
        测试: 不破坏现有添加/移除卡组的逻辑
        commit

Step 6: Collection 重构(如果有重复实现就替换为通用组件)
        commit

Step 7: 整体冒烟测试 + 视觉一致性检查
        commit
```

**总预估: 1.5-2 小时**

---

## 验证清单

```
基础功能:
□ CardDetailModal 在所有场景视觉一致
□ 显示完整技能描述 / scienceCard / tags / 持有数量
□ 关闭方式: × / 点空白 / "知道了"按钮 都可以
□ 长 scienceCard 可以滚动

战斗场景:
□ 场上卡右上角有 ⓘ 角标,点击弹详情
□ 点击卡片本身仍然是攻击/选中(不被干扰)
□ 手牌卡同上
□ 详情弹出时战斗暂停(不会被 AI 回合打断)

抽卡场景:
□ 抽卡结果网格点击任意卡显示详情
□ 显示是否新卡 / 持有数量 / 是否转碎片

DeckBuilder:
□ 不破坏添加/移除卡的逻辑
□ 详情显示当前持有数量(2/3 等)

Collection:
□ 跟其他场景视觉一致(不再是各做各的)

齐齐亲自试:
□ 对战时能看到敌方卡的具体信息
□ 抽卡后能看到完整卡牌细节
□ 不会再说"我不知道这卡是干嘛的"
```

---

## 修改 Bug Tracker

Sprint 33 完成后,把以下 bug 状态更新为 "Done":
- [抽卡结果不能点击查看卡牌详情](https://www.notion.so/354264d1849281a1b29ce128cb4a216b) — 通过本 Sprint 解决

---

## 未来扩展(不在本 Sprint)

- 卡牌详情里加"在哪些关卡可以遇到"信息(教育引导)
- 详情里加"克制关系"图(场景化提示)
- 战斗中详情显示当前 buff/debuff 实时数值
- Collection 里详情加"如何获得"路径(抽卡/通关解锁)

---

*Spec 版本: v1.0 · 2026年5月3日*  
*Sprint 33 = 全场景卡片详情查看(CardDetailModal 通用组件)*
