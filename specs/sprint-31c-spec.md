# Sprint 31c Spec: 抽卡爽感升级 Phase B + C

> **背景**: Sprint 31b(Phase A)已完成 — 视觉爽点 + isNew 卡片秀。现在做 Phase B + C,把抽卡从"事件"升级为"完整的策略+学习闭环"。
>
> **范围**:
> - **Phase B**: 抽卡前的期待感 + 抽卡后的策略联动
> - **Phase C**: 学习节点 + 主题成就
>
> **预估**: 5-7 小时(可能跨 2 个 session)

---

## 设计理念

把抽卡从单点事件升级为完整流程:

```
[期待] 看明星卡 + 看图鉴进度
   ↓
[抽卡] (Phase A 已做:动画 + 稀有度特效 + 卡片秀)
   ↓
[学习] 抽到一定数量插入科学小测验(C)
   ↓
[联动] 抽到 SR+ 时直接跳卡组(B)
   ↓
[成就] 集齐主题卡解锁徽章和科学包(C)
```

---

# Phase B: 期待感 + 联动

## Part B-1: 抽卡前页面升级

### B-1.1 当前问题

`GachaScreen.jsx` 顶部只显示金币、钻石、收藏数、SSR 保底。但 **看不到**:
- 这次抽卡能抽到什么
- 我离图鉴完成还差多少
- 各稀有度的概率

齐齐打开抽卡页 → "嗯就抽吧" → 缺少期待感。

### B-1.2 新增:本期推荐池(Banner)

抽卡按钮上方加一个"本期推荐"区域,展示 1-3 张明星卡:

```jsx
// GachaScreen.jsx 顶部新增
<div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-4 mb-6 border border-purple-500/40">
  <div className="text-xs text-purple-300 mb-2">⭐ 本期推荐</div>
  <div className="text-lg font-bold text-white mb-3">
    {currentBanner.title}
  </div>
  
  {/* 1-3 张明星卡缩略图 */}
  <div className="flex gap-2 justify-center">
    {currentBanner.featuredCards.map(card => (
      <div key={card.id} className="relative">
        <CardThumbnail card={card} size="md" />
        {/* 概率提升标识 */}
        <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] px-1.5 rounded-full font-bold">
          +50%
        </div>
      </div>
    ))}
  </div>
  
  <div className="text-xs text-purple-200 mt-3 text-center">
    {currentBanner.description}
  </div>
</div>
```

**Banner 数据来源**: 新建 `src/data/gachaBanners.js`:

```javascript
// 简单版:跟当前章节绑定
export const GACHA_BANNERS = {
  default: {
    title: '基础抽卡',
    featuredCards: [],  // 不强调任何卡
    description: '获得各种生物卡牌',
  },
  ch2_active: {
    title: '🦠 病原侵袭篇推荐',
    featuredCards: ['penicillin_pioneer', 'antibody_missile', 'vaccine_trainer'],
    description: '本周推荐!应对病原侵袭的关键卡',
    boostFactor: 1.5,  // 这些卡概率 +50%(暂时只显示,不实际加权)
  },
  ch3_active: {
    title: '🌊 生态危机篇推荐',
    featuredCards: ['orca_alpha', 'coral_reef', 'whale_shark_wall'],
    description: '海洋生态卡牌出现率提升',
  },
  // ...
}
```

**Banner 选择逻辑**: 看玩家最近通关到哪一章,显示对应的 banner。如果都没通关就显示 default。

**注意**: `boostFactor` 这次只是**视觉显示**,不实际改抽卡权重。真正的加权抽卡留到 Phase C 或后续(避免破坏当前抽卡平衡)。

### B-1.3 新增:概率公示

在抽卡按钮上方加一个小展开:

```jsx
<details className="text-xs text-gray-400 mb-3">
  <summary className="cursor-pointer hover:text-white">
    📊 概率公示
  </summary>
  <div className="bg-gray-800/50 rounded p-3 mt-2 grid grid-cols-2 gap-1">
    <div>R 普通: 68%</div>
    <div>SR 稀有: 25%</div>
    <div>SSR 史诗: 5%</div>
    <div className="text-yellow-300">SP 觉醒: 2%</div>
    <div className="col-span-2 text-[10px] text-gray-500 mt-1">
      十连保底:至少 1 张 SR+
    </div>
  </div>
</details>
```

### B-1.4 新增:图鉴进度提示

在金币/钻石栏下方加进度条:

```jsx
<div className="bg-gray-800/40 rounded-lg p-3 mb-4">
  <div className="flex justify-between text-sm mb-2">
    <span className="text-gray-300">图鉴进度</span>
    <span className="text-cyan-300 font-bold">
      {ownedCount} / {totalCount}
    </span>
  </div>
  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
    <div 
      className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
      style={{ width: `${(ownedCount / totalCount) * 100}%` }}
    />
  </div>
  <div className="text-xs text-gray-400 mt-2">
    还差 <span className="text-yellow-300 font-bold">{totalCount - ownedCount}</span> 张完成图鉴
  </div>
</div>
```

`ownedCount` = `Object.keys(economy.state.collection).length`
`totalCount` = `cards.length + spCards.length`(只算可获得的,排除 campaign_only 的 SP 如果未解锁)

## Part B-2: 抽完联动 DeckBuilder

### B-2.1 当前问题

抽完只有"返回主菜单"按钮。抽到爽卡的高情绪状态白白浪费——不能马上去试用。

### B-2.2 新增:抽完弹"组队"按钮

如果抽到了 SR/SSR/SP 中的任意一张:

```jsx
// 在抽卡完成 + 卡片秀完成后
{hasNewSrPlus && (
  <motion.div
    className="mt-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="text-white text-sm mb-3">
      🎉 你抽到了强力卡!现在就加入卡组试试?
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => navigateToDeckBuilder({ highlightCards: srPlusCards })}
        className="flex-1 bg-white text-purple-700 font-bold py-2 rounded-lg"
      >
        立刻去组队 →
      </button>
      <button
        onClick={() => setShowQuickAddPrompt(false)}
        className="bg-white/20 text-white px-4 py-2 rounded-lg"
      >
        继续抽
      </button>
    </div>
  </motion.div>
)}
```

### B-2.3 DeckBuilder 高亮新卡

当从抽卡页跳过来时,新抽到的 SR+ 卡牌在 DeckBuilder 列表中**高亮显示**(发光边框 + "NEW" 标签),让玩家立刻找到。

```jsx
// DeckBuilder.jsx 里
const [highlightCards, setHighlightCards] = useState([])

// 接收从 GachaScreen 传过来的参数
useEffect(() => {
  if (location.state?.highlightCards) {
    setHighlightCards(location.state.highlightCards)
    // 30 秒后自动取消高亮
    setTimeout(() => setHighlightCards([]), 30000)
  }
}, [])

// 渲染时:
const isHighlighted = highlightCards.includes(card.id)
className={`... ${isHighlighted ? 'ring-2 ring-yellow-400 animate-pulse' : ''}`}
```

## Part B-3: 抽完图鉴解锁庆祝

### B-3.1 触发条件

抽到 isNew 卡(全新解锁)且达到里程碑时,弹一个庆祝动画:

```javascript
const newCount = pulledCards.filter(c => c.isNew).length
const beforeCount = previousCollectionSize
const afterCount = beforeCount + newCount

// 检查里程碑
const milestones = [10, 25, 50, 75, 100, 120]
const crossed = milestones.find(m => beforeCount < m && afterCount >= m)
if (crossed) {
  showMilestoneCelebration(crossed)
}
```

### B-3.2 庆祝动画

```jsx
{milestone && (
  <motion.div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    <motion.div
      className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-3xl p-8 max-w-md text-center"
      initial={{ scale: 0.5, rotate: -5 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', duration: 0.6 }}
    >
      <div className="text-6xl mb-3">🏆</div>
      <div className="text-3xl font-bold text-white">
        图鉴达到 {milestone} 张!
      </div>
      <div className="text-yellow-100 mt-2">
        你已经收集了 1/3 的生物英雄!
      </div>
      <button onClick={onClose} className="bg-white text-orange-600 px-6 py-2 rounded-lg mt-4 font-bold">
        继续收集!
      </button>
    </motion.div>
  </motion.div>
)}
```

---

# Phase C: 学习节点 + 主题成就

## Part C-1: 十连科学小测验

### C-1.1 设计思路

十连抽卡过程中,**第 5 张卡翻完后,插入一道科学小测**。这是齐齐"高注意力 + 高期待"的窗口期,最适合学习。

### C-1.2 时机

```
第 1 张翻面 → 第 2 张 → ... → 第 5 张翻面
   ↓
弹出小测验弹窗(基于第 5 张卡的内容出题)
   ↓
答对 → 后续 5 张翻面正常
答错 → 后续 5 张翻面正常 + 给正确答案 + 科普
   ↓
第 6 张翻面 → ... → 第 10 张
```

**关键**: 答对答错都不影响抽卡结果,**学习不应该惩罚**。

### C-1.3 题库

复用现有 `src/data/quizzes.js` 题库,但要**跟刚抽到的卡关联**。比如:

```javascript
// 抽到了"流感病毒"
{
  question: '流感是病毒还是细菌?',
  options: ['病毒', '细菌'],
  correct: 0,
  explanation: '流感是病毒引起的,所以抗生素对它无效。这就是为什么医生看感冒不一定开抗生素!',
  relatedCardId: 'flu_virus',
}

// 抽到了"白细胞"
{
  question: '白细胞主要做什么?',
  options: ['运送氧气', '吞噬细菌', '凝血'],
  correct: 1,
  explanation: '白细胞是免疫系统的"巡逻兵",会吞噬入侵的细菌和病原体。',
  relatedCardId: 'white_blood_cell',
}
```

### C-1.4 题目选择逻辑

```javascript
function selectQuizForPull(pulledCards) {
  // 优先用刚抽到的卡的相关题
  for (const card of pulledCards) {
    const matchingQuiz = quizzes.find(q => 
      q.relatedCardId === card.id || 
      q.relatedFaction === card.faction
    )
    if (matchingQuiz) return matchingQuiz
  }
  // 没有相关的就随机一道
  return quizzes[Math.floor(Math.random() * quizzes.length)]
}
```

### C-1.5 小测验弹窗

```jsx
function GachaQuizModal({ quiz, onComplete }) {
  const [answered, setAnswered] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  
  const handleAnswer = (idx) => {
    if (answered) return
    setSelectedAnswer(idx)
    setAnswered(true)
  }
  
  const isCorrect = selectedAnswer === quiz.correct
  
  return (
    <motion.div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/85">
      <motion.div className="bg-gray-900 border-2 border-cyan-500 rounded-2xl p-6 max-w-md w-[90%]">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🤔</div>
          <div className="text-xs text-cyan-300 mb-1">小测验时间!答对答错都能继续抽哦</div>
          <div className="text-lg font-bold text-white">{quiz.question}</div>
        </div>
        
        {/* 选项 */}
        <div className="space-y-2 mb-4">
          {quiz.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={answered}
              className={`w-full text-left p-3 rounded-lg border transition ${
                answered
                  ? idx === quiz.correct
                    ? 'bg-green-900/40 border-green-500 text-green-200'
                    : idx === selectedAnswer
                      ? 'bg-red-900/40 border-red-500 text-red-200'
                      : 'bg-gray-800 border-gray-700 text-gray-400'
                  : 'bg-gray-800 border-gray-600 text-white hover:border-cyan-500'
              }`}
            >
              {String.fromCharCode(65 + idx)}. {option}
              {answered && idx === quiz.correct && ' ✓'}
              {answered && idx === selectedAnswer && idx !== quiz.correct && ' ✗'}
            </button>
          ))}
        </div>
        
        {/* 答案解释 */}
        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg p-3 mb-4 ${
              isCorrect ? 'bg-green-900/30 border-l-4 border-green-500' : 'bg-orange-900/30 border-l-4 border-orange-500'
            }`}
          >
            <div className={`font-bold mb-1 ${isCorrect ? 'text-green-300' : 'text-orange-300'}`}>
              {isCorrect ? '✓ 答对了!' : '不对哦,正确答案是 ' + String.fromCharCode(65 + quiz.correct)}
            </div>
            <div className="text-sm text-white">{quiz.explanation}</div>
          </motion.div>
        )}
        
        {/* 继续按钮 */}
        {answered && (
          <button
            onClick={onComplete}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg"
          >
            继续抽卡 →
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}
```

### C-1.6 触发位置

GachaAnimation.jsx 的十连动画中,**第 5 张翻完后插入弹窗**,弹窗关闭后继续翻第 6 张。

**注意**: 单抽不触发小测验(节奏太短)。

## Part C-2: 主题成就系统

### C-2.1 设计思路

集齐某个主题的一组卡 → 解锁徽章 + 科学知识包。让收集有方向、有意义。

### C-2.2 主题定义

新建 `src/data/achievements.js`:

```javascript
export const COLLECTION_ACHIEVEMENTS = [
  {
    id: 'antibiotic_master',
    name: '抗生素小专家',
    icon: '💊',
    requiredCards: ['penicillin_pioneer', 'antibiotic_injection', 'broad_spectrum'],
    reward: {
      type: 'science_pack',
      packId: 'antibiotic_history',
      title: '📚 抗生素的故事',
      content: `
        **1928 年,弗莱明的意外发现**
        
        英国细菌学家弗莱明休假回来,发现实验室里一个被遗忘的培养皿长了霉菌。
        他注意到一件奇怪的事:霉菌周围的细菌都死了!
        
        这种霉菌就是青霉菌,它分泌的物质后来被命名为"青霉素"——
        人类第一种抗生素。
        
        二战期间,青霉素挽救了数百万士兵的生命。
        ...
      `,
    },
  },
  {
    id: 'immune_warrior',
    name: '免疫战士',
    icon: '🛡️',
    requiredCards: ['white_blood_cell', 'antibody_missile', 'macrophage_tank', 'lymph_node_filter'],
    reward: {
      type: 'science_pack',
      packId: 'immune_system_overview',
      title: '📚 免疫系统全图',
      // ...
    },
  },
  {
    id: 'microbe_explorer',
    name: '微观探险家',
    icon: '🔬',
    requiredCards: ['amoeba_shapeshifter', 'paramecium_swarm', 'ecoli_thug'],
    reward: {
      type: 'badge_only',
      badge: '🔬 微观探险家',
    },
  },
  {
    id: 'apex_predator',
    name: '顶级猎手',
    icon: '🦈',
    requiredCards: ['shark_hunter', 'orca_alpha', 'sp_trex'],
    reward: {
      type: 'science_pack',
      packId: 'food_chain',
      // ...
    },
  },
  // ... 更多
]
```

### C-2.3 检测逻辑

```javascript
// useEconomy.js 加新函数
const checkAchievements = useCallback(() => {
  const owned = Object.keys(state.collection)
  const newlyUnlocked = []
  
  for (const ach of COLLECTION_ACHIEVEMENTS) {
    if (state.unlockedAchievements?.includes(ach.id)) continue
    
    const hasAll = ach.requiredCards.every(cardId => owned.includes(cardId))
    if (hasAll) {
      newlyUnlocked.push(ach)
    }
  }
  
  if (newlyUnlocked.length > 0) {
    setState(prev => ({
      ...prev,
      unlockedAchievements: [
        ...(prev.unlockedAchievements || []),
        ...newlyUnlocked.map(a => a.id),
      ],
    }))
    return newlyUnlocked
  }
  return []
}, [state.collection, state.unlockedAchievements])
```

### C-2.4 触发时机

抽卡完成 + 卡片秀完成 + 联动按钮显示之前,检查是否解锁了新成就:

```javascript
// GachaScreen 在 pull 完成后
const newlyUnlocked = checkAchievements()
if (newlyUnlocked.length > 0) {
  for (const ach of newlyUnlocked) {
    await showAchievementModal(ach)  // 一个一个弹
  }
}
```

### C-2.5 成就解锁弹窗

```jsx
function AchievementModal({ achievement, onClose }) {
  return (
    <motion.div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90">
      <motion.div
        className="bg-gradient-to-br from-yellow-600 to-amber-700 rounded-3xl p-8 max-w-lg w-[90%] text-center"
        initial={{ scale: 0.5, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring' }}
      >
        <div className="text-7xl mb-4">{achievement.icon}</div>
        
        <div className="text-xs text-yellow-200 mb-1">🏆 成就解锁</div>
        <div className="text-3xl font-bold text-white mb-3">
          {achievement.name}
        </div>
        
        <div className="text-yellow-100 text-sm mb-4">
          你集齐了 {achievement.requiredCards.length} 张相关卡牌!
        </div>
        
        {achievement.reward.type === 'science_pack' && (
          <div className="bg-black/30 rounded-xl p-4 mb-4 text-left max-h-64 overflow-y-auto">
            <div className="text-yellow-300 font-bold mb-2">
              {achievement.reward.title}
            </div>
            <div className="text-white text-sm whitespace-pre-line">
              {achievement.reward.content}
            </div>
          </div>
        )}
        
        <button
          onClick={onClose}
          className="bg-white text-amber-700 font-bold px-8 py-3 rounded-xl"
        >
          太棒了!
        </button>
      </motion.div>
    </motion.div>
  )
}
```

### C-2.6 在 Collection 页面展示成就

Collection.jsx 顶部加成就栏:

```jsx
<div className="bg-gray-800/40 rounded-xl p-4 mb-4">
  <div className="text-sm text-gray-300 mb-3">🏆 成就进度</div>
  <div className="grid grid-cols-3 gap-2">
    {COLLECTION_ACHIEVEMENTS.map(ach => {
      const unlocked = unlockedAchievements?.includes(ach.id)
      const owned = ach.requiredCards.filter(id => collection[id]).length
      const total = ach.requiredCards.length
      
      return (
        <div
          key={ach.id}
          className={`rounded-lg p-2 text-center cursor-pointer ${
            unlocked ? 'bg-yellow-600/30 border border-yellow-500' : 'bg-gray-700/40'
          }`}
          onClick={() => unlocked && showAchievementDetail(ach)}
        >
          <div className={`text-2xl ${unlocked ? '' : 'grayscale opacity-40'}`}>
            {ach.icon}
          </div>
          <div className="text-[10px] text-white truncate">{ach.name}</div>
          <div className="text-[10px] text-gray-400">{owned}/{total}</div>
        </div>
      )
    })}
  </div>
</div>
```

---

# 实施顺序

```
Phase B (期待感 + 联动):

Step 1: 创建 gachaBanners.js + GachaScreen 顶部 Banner UI
        测试: 不同章节进度看到不同 banner
        commit

Step 2: 概率公示展开 + 图鉴进度条
        测试: 数字正确,进度条比例对
        commit

Step 3: 抽完联动 DeckBuilder 跳转 + 高亮新卡
        测试: 抽到 SR+ 后弹"立刻去组队",跳过去能看到高亮
        commit

Step 4: 图鉴里程碑庆祝弹窗(10/25/50/75/100/120)
        测试: 用 dev 工具触发不同里程碑
        commit


Phase C (学习节点 + 主题成就):

Step 5: 给 quizzes.js 现有题目加 relatedCardId / relatedFaction 标签
        没有就保持随机
        commit

Step 6: GachaQuizModal 组件 + 十连第 5 张后插入
        测试: 十连过程中第 5 张翻完弹小测,答完继续翻
        commit

Step 7: 创建 achievements.js + checkAchievements 逻辑
        useEconomy 加 unlockedAchievements 字段(向后兼容默认空数组)
        commit

Step 8: AchievementModal 弹窗 + 抽卡后触发
        commit

Step 9: Collection 页面成就进度栏
        测试: 解锁前后视觉对比
        commit

Step 10: 整体调试 + 性能/节奏优化
         - 一次抽卡触发多个庆祝弹窗(里程碑 + 成就 + 加入卡组)的顺序
         - 让齐齐试试节奏会不会太长
         commit
```

**总预估: 5-7 小时**(可以拆成 Phase B 和 C 两个 session 跑)

---

# 验证清单

```
Phase B - 期待感:
□ 抽卡页顶部显示当前章节 banner 和明星卡
□ 概率公示能展开看到 R/SR/SSR/SP 占比
□ 图鉴进度条显示 X/Y 张
□ 不同章节通关进度,banner 内容不同

Phase B - 联动:
□ 抽到 SR+ 后弹"立刻去组队"按钮
□ 点击跳到 DeckBuilder,新卡有发光边框 + NEW 标签
□ 30 秒后高亮自动消失
□ 抽到 NEW 卡跨过 10/25/50 等里程碑时弹庆祝

Phase C - 小测验:
□ 十连第 5 张翻完后弹小测(单抽不触发)
□ 答对显示绿色 + 解释
□ 答错显示红色 + 正确答案 + 解释
□ 答完点"继续抽卡"恢复翻牌
□ 答错不影响抽卡结果

Phase C - 成就:
□ 集齐"3 张抗生素"后解锁"抗生素小专家"成就
□ 弹出成就解锁动画 + 阅读科学知识包
□ Collection 页面成就栏显示进度(已解锁/未解锁视觉差异)
□ 多个成就同时解锁时按顺序弹

齐齐亲自试:
□ 看到 banner 会不会问"那是什么卡"?
□ 看到图鉴进度条会不会想多抽?
□ 答小测验时是认真读还是随便点?
□ 解锁成就时的反应?
□ 解锁后会不会想去看科学包内容?
```

---

# 几个判断

**1. 关于"小测验难度":**
quizzes.js 现有题目可能难度不一,7 岁会不会太难?**建议**: 给小测验题加一个 `kidsFriendly: true` 标签,优先抽这些。如果题库太少就先用所有题。

**2. 关于"成就奖励":**
现在设计的奖励是"科学知识包"——纯文本。如果齐齐不爱读纯文本,后续可以改成:
- 解锁特殊卡牌(挂钩 SP campaign_only)
- 解锁特殊抽卡 banner
- 解锁特殊主人头像

**这些都是 Phase D 以后的事,先看 C 的反应。**

**3. 关于"Banner 加权":**
Spec 里写了 `boostFactor: 1.5` 但只是显示。**真要做加权抽卡**需要改 `useGacha.js` 的概率逻辑——这会影响平衡,需要重新测。**建议不在本 Sprint 做**,等齐齐玩过 Phase B 反应正向再加。

---

# 未来扩展(不在本 Sprint)

- **Phase D**: 抽到稀有卡的"分享"功能(截图给妈妈/老师)
- **Phase E**: 限时活动 banner(根据真实日期切换主题,比如"世界免疫日"专题)
- **Phase F**: 联机交换重复卡(齐齐的卡 → 同学的卡)
- **个性化推荐**: 基于齐齐的对战表现推荐适合他的卡

---

*Spec 版本: v1.0 · 2026年5月3日*
*Sprint 31c = 抽卡爽感升级 Phase B + C*
