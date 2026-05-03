# Sprint 31a Spec: 抽卡详情 + 教学气泡遮挡

> **范围**: 修两个齐齐 iPad 实测发现的 UI bug
> 1. **抽卡结果不能点击查看详情** (High)
> 2. **教学 5/5 提示气泡挡住 SP·霸王龙** (Medium)
>
> **预估**: 30-60 分钟

---

# Bug #1: 抽卡结果不能点击查看卡牌详情

## 现象
抽卡完成后,卡牌网格只显示卡名/阵营/ATK/HP/技能名(就一个标题)。点击卡片**无反应**。完整技能描述、scienceCard、子类型、tags 等内容都看不到,必须跳到图鉴里手动找。

## 影响
- 抽卡的核心心理流程是 "**惊喜 → 理解 → 兴奋 → 规划下一步**"
- 现在第二步("理解这张卡能做什么")完全断掉
- 7 岁小朋友不会主动跑去图鉴翻找,直接放弃 → 教育价值流失
- 跟 Bio Heroes "机制即教学" 的核心理念冲突

## 数据流验证
useGacha.js 的 pullCards 应该返回**完整的卡牌对象**(包含 description / scienceCard / tags 等),只是 GachaScreen.jsx 没把这些信息暴露给 UI。**这是纯 UI 改造,不动数据层。**

## 修复方案

### Step 1: 找到 Collection.jsx 已有的卡牌详情弹窗

Collection.jsx 应该已经有"点击卡片 → 显示完整详情"的功能(展示 ATK/HP/技能/scienceCard/tags 等)。**不要重新实现**,把那个弹窗组件抽出来或直接复用。

可能的实现位置:
- Collection.jsx 内部一个 `<CardDetailModal>` 组件
- 或者用 `selectedCard` state + 内联渲染的弹窗 JSX

**如果是内联实现**,先抽取成独立组件 `src/components/CardDetailModal.jsx`,这样 GachaScreen 也能用:

```jsx
// src/components/CardDetailModal.jsx
import { motion, AnimatePresence } from 'framer-motion'

export default function CardDetailModal({ card, onClose }) {
  if (!card) return null
  
  return (
    <AnimatePresence>
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
        >
          {/* 卡名 + 阵营 + 稀有度 */}
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-white">{card.name}</div>
            <div className="text-sm text-gray-400">{card.faction} · {card.rarity}</div>
          </div>
          
          {/* ATK / HP / Cost */}
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
          
          {/* 技能 */}
          {card.skills?.map((skill, i) => (
            <div key={i} className="mb-3 bg-purple-900/30 border-l-4 border-purple-400 rounded p-3">
              <div className="text-sm font-bold text-purple-200 mb-1">
                🎯 {skill.name}
              </div>
              <div className="text-sm text-white leading-relaxed">
                {skill.description}
              </div>
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
                  {tag}
                </span>
              ))}
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
    </AnimatePresence>
  )
}
```

**如果 Collection.jsx 已经有现成组件就直接 import 用**,不要重复造轮子。

### Step 2: GachaScreen.jsx 集成

```jsx
import { useState } from 'react'
import CardDetailModal from './CardDetailModal'

export default function GachaScreen() {
  // ... 现有 state ...
  const [selectedCard, setSelectedCard] = useState(null)
  
  // 在卡牌网格渲染处:
  return (
    <div>
      {/* ... 抽卡按钮等 ... */}
      
      {/* 卡牌网格 */}
      <div className="grid grid-cols-... gap-3">
        {pulledCards.map((card, i) => (
          <button
            key={i}
            onClick={() => setSelectedCard(card)}
            className="..."  // 保持原有样式
          >
            {/* 原有的卡牌缩略显示 */}
          </button>
        ))}
      </div>
      
      {/* 详情弹窗 */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  )
}
```

### Step 3: 视觉提示卡片可点击

在卡牌缩略图右下角加个"i"或放大镜图标,告诉用户可以点:

```jsx
<div className="absolute bottom-1 right-1 text-xs text-cyan-300 opacity-70">
  ℹ️
</div>
```

或者:

```jsx
<div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-cyan-600/80 text-white text-[10px] flex items-center justify-center">
  i
</div>
```

---

# Bug #2: 教学 5/5 提示气泡挡住 SP·霸王龙

## 现象
教学 5/5 第二回合,SP·霸王龙登场,系统弹出指引气泡:

> 霸王龙的登场效果清空了敌方!点你的卡 → 点上方对手面板,直攻主人!

但气泡**居中显示在屏幕中间**,正好把 SP·霸王龙的卡牌内容(属性/技能/阵营图标)整个盖住。

## 影响
- 教学 5/5 是介绍 **SP 觉醒系统**的核心环节
- 主角卡(SP·霸王龙)是这次教学最该被看到的对象
- 学生看不见主角卡 → 把游戏变成"系统让我点哪我点哪",失去主动学习
- 跟 SP 卡的"仪式感"设计冲突

## 修复方案

### 关键改动:气泡位置改到屏幕底部

找到教学指引气泡的渲染组件(可能是 `BattleHints.jsx` 或 `TutorialScreen.jsx` 内部),把定位从居中改为靠下:

```jsx
// 修改前(可能是):
className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ..."

// 修改后:
className="fixed bottom-32 left-1/2 -translate-x-1/2 max-w-md w-[90%] ..."
```

`bottom-32` 是为了避开手牌区域(在屏幕最底部)。

### 检查所有教学气泡

修复时检查教学步骤定义中是否有 `position` 字段(`top` / `center` / `bottom`)。如果有,统一在战场上空的步骤都改成 `bottom`,不要让 UI 跟卡牌打架。

### 兼容性保留

战斗状态相关的提示(比如"你的回合"、"敌方回合")可以保持顶部或中央,因为它们不挡卡牌。**只改"指引玩家操作的气泡"**(指向场上某张卡的提示)。

---

# 实施顺序

```
Step 1: 创建 CardDetailModal.jsx 组件(或从 Collection.jsx 抽出)
Step 2: GachaScreen.jsx import 并集成,加点击事件
Step 3: 测试 — 抽几张卡点击,确认完整详情显示
        commit

Step 4: 找到教学指引气泡组件,改定位 fixed bottom
Step 5: 测试 — 跑一遍教学 5/5,确认 SP·霸王龙登场时气泡不挡卡
        commit
```

**总预估: 30-60 分钟**

---

# 验证清单

```
Bug #1 抽卡详情:
□ 抽卡后卡牌网格右下角有 "i" 图标提示可点
□ 点击卡片弹出详情弹窗
□ 弹窗显示完整内容: 卡名 / ATK / HP / Cost / 技能描述 / scienceCard / tags
□ 点击空白处或"知道了"按钮关闭弹窗
□ 弹窗滚动条正常(scienceCard 较长时可滚)
□ 不同稀有度的卡(R/SR/SSR/SP)都能正常显示

Bug #2 教学气泡:
□ 教学 5/5 第二回合 SP·霸王龙登场
□ 提示气泡出现在屏幕底部,不遮挡 SP·霸王龙
□ 能完整看到 SP·霸王龙的卡名 / ATK / HP / 技能名
□ 气泡文字仍然清晰可读
□ 教学其他步骤的指引气泡也不遮挡战场上的卡

齐齐亲自试:
□ 抽卡后点击卡片能看清楚详情
□ 教学 5/5 时能看见主角卡
```

---

# 未来扩展(不在本 Sprint)

- 抽到 SP 卡时的特殊详情演出(金光 / 卡牌翻转 / 大字展示)
- 抽到新卡(isNew)和重复卡(isDupe)的视觉差异化
- 教学气泡支持点"下一步"按钮手动推进(不是自动定时)

---

*Spec 版本: v1.0 · 2026年5月3日*
*Sprint 31a = 抽卡详情弹窗 + 教学气泡定位修复*
