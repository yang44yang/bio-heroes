# Sprint 31b Spec: 抽卡爽感升级 Phase A
> **目标**: 把"抽卡"从交易变成**事件**。让齐齐感受到惊喜,而且抽完不用跳图鉴就能看懂卡。
>
> **范围**: 这是抽卡升级 3-Phase 计划的第 1 个 Phase。
> - **Phase A(本 Sprint)**: 视觉爽点 + isNew 卡片秀 + 内嵌详情(替代/合并 Sprint 31a 的 Bug #1)
> - Phase B(下个): 期待感 + 联动 DeckBuilder + 图鉴解锁庆祝
> - Phase C(以后): 学习节点 + 主题成就

---

## 设计原则

**齐齐对"稀有=特殊"敏感**——所以 Phase A 的核心是:
1. **不同稀有度的抽卡过程在视觉上明显不同**(R 默默翻开,SP 全屏闪光)
2. **首次抽到的卡(isNew)自动展示完整信息**——免去去图鉴查的麻烦
3. **重复卡轻量化**——一眼看到"→ 50 碎片",不打断节奏

---

## ⚠️ 跟 Sprint 31a 的关系

如果还没做 Sprint 31a 的 Bug #1(抽卡详情弹窗),**直接跳过它**——本 Sprint 用更好的方式解决了同一个问题:
- 31a:点卡→弹详情弹窗(传统方式)
- 31b:首次抽到自动展示 + 卡组里手动点也能看(更原生)

**Sprint 31a 的 Bug #2(教学气泡)还是要做**,跟抽卡无关。

---

# Part 1: 抽卡动画序列

## 1.1 整体节奏(单抽)

```
[0.0s]  按下"单抽"按钮,扣金币
[0.2s]  屏幕中央出现"DNA 胶囊"(简单的圆形 + 旋转动画)
[0.8s]  胶囊"咔嚓"裂开
[1.0s]  卡牌从胶囊里飞出,背面朝上落到屏幕中央
[1.5s]  卡牌翻面动画(根据稀有度有不同特效)
[2.0s]  完成,可点击交互
```

## 1.2 整体节奏(十连)

```
[0.0s]  按下"十连"按钮,扣金币
[0.3s]  10 个胶囊一起飞出,排成 3+3+3+1 阵列(背面朝上)
[1.0s]  逐张翻面(每张 0.15s 间隔,SR+ 翻到时停顿 + 闪光)
[2.5s]  全部翻完
[2.5s+] 如有 isNew 卡,进入"卡片秀"流程(见 Part 2)
```

## 1.3 实现位置

新建 `src/components/GachaAnimation.jsx`,作为抽卡动画的容器组件。

**关键技术选型**:
- **WAAPI**(已经在用)做翻牌、缩放、旋转
- **tsParticles**(已经在用)做 SP/SSR 的粒子爆发
- **CSS keyframes** 做光晕扫描

不引入新库。

---

# Part 2: 稀有度特效系统

这是 Phase A 最核心的部分,因为齐齐对此最敏感。

## 2.1 R 卡(普通) — 节奏快,无特效

```
翻面动画: 0.4s 翻转 + 短暂蓝光
背景: 蓝色卡背
音效: 短促"咔"声(已有)
```

**目标**: 不打扰节奏。R 卡占 68%,如果每张都演半天会让玩家烦。

## 2.2 SR 卡 — 中度仪式感

```
翻面动画: 0.6s 翻转 + 紫色光晕扫过卡面
背景: 紫色卡背 → 紫色光环停留 0.3s
音效: 较亮的"叮"声
粒子: 小型紫色星屑(20 个粒子,0.5s)
```

**目标**: 玩家"哦,这张不一样"。

## 2.3 SSR 卡 — 强仪式感

```
翻面动画: 0.8s 翻转 + 卡牌停顿 0.5s 在屏幕中央放大显示
背景: 金色卡背 → 全屏暗下来,只有这张卡发光
音效: 大鼓 + 喇叭
粒子: 金色粒子爆发(50 个粒子,1s),从卡牌四周向外扩散
震屏: 屏幕轻微震一下(WAAPI 的 transform: translateX 抖动)
```

**目标**: 让玩家停下来"这是个大事"。

## 2.4 SP 卡 — 全屏事件

```
翻面动画: 卡牌出现前先全屏白闪一下(0.2s)
背景: 全屏暗下来 + 紫红色脉冲背景
卡牌: 从屏幕中心慢慢放大,1.2s 完整翻转
音效: 长鸣声 + 重低音
粒子: 全屏粒子(100 个,2s,渐隐)
震屏: 强震 0.3s
文字: 屏幕上方淡入"⚡ SP 觉醒卡!"持续 1.5s 后淡出
```

**目标**: 让齐齐叫出声。

## 2.5 实现细节

```jsx
// src/components/GachaAnimation.jsx
const RARITY_EFFECTS = {
  R: {
    flipDuration: 400,
    glowColor: 'blue',
    particleCount: 0,
    soundKey: 'card_flip_normal',
    pauseAfter: 0,
  },
  SR: {
    flipDuration: 600,
    glowColor: 'purple',
    particleCount: 20,
    soundKey: 'card_flip_sr',
    pauseAfter: 300,
  },
  SSR: {
    flipDuration: 800,
    glowColor: 'gold',
    particleCount: 50,
    soundKey: 'card_flip_ssr',
    pauseAfter: 500,
    shakeScreen: true,
    zoomCard: true,
  },
  SP: {
    flipDuration: 1200,
    glowColor: 'magenta',
    particleCount: 100,
    soundKey: 'card_flip_sp',
    pauseAfter: 1500,
    shakeScreen: 'strong',
    zoomCard: true,
    fullScreenFlash: true,
    bannerText: '⚡ SP 觉醒卡!',
  },
}
```

---

# Part 3: isNew 卡片秀(替代 Bug #1)

**关键洞察**: 齐齐说"图鉴里去看太复杂"——所以**抽到首次出现的卡时,直接在抽卡页全屏展示完整信息**。这样不用跳出抽卡流程。

## 3.1 触发条件

```javascript
// pulledCards 中任意一张 isNew: true 就触发
const newCards = pulledCards.filter(c => c.isNew)
if (newCards.length > 0) {
  // 进入"卡片秀"流程
}
```

**注意**: pullCards 已经返回 isNew 字段(Sprint 30a 已实现)。

## 3.2 卡片秀 UI

新建 `src/components/CardShowcase.jsx`:

```jsx
// 全屏展示一张卡,信息层级清晰,7 岁能读
<div className="fixed inset-0 bg-black/90 z-[100] flex flex-col">
  {/* 顶部:🆕 NEW + 进度指示 */}
  <div className="text-center pt-4">
    <div className="text-yellow-400 text-2xl font-bold animate-pulse">🆕 第一次见到!</div>
    <div className="text-xs text-gray-400">{currentIndex + 1} / {newCards.length}</div>
  </div>
  
  {/* 中部:卡牌大图 + 基本信息 */}
  <div className="flex-1 flex flex-col items-center justify-center px-6">
    {/* 大尺寸卡牌(放大 1.5x) */}
    <motion.div
      className="..."
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      {/* 复用 Card.jsx 的展示版本 */}
    </motion.div>
    
    {/* 卡名 */}
    <div className="text-3xl font-bold text-white mt-4">{card.name}</div>
    <div className="text-sm text-gray-400">{card.faction} · {card.rarity}</div>
    
    {/* 数值 */}
    <div className="flex gap-6 mt-3">
      <div>⚔️ {card.atk}</div>
      <div>❤️ {card.hp}</div>
      <div>⚡ {card.cost}</div>
    </div>
    
    {/* 技能(逐字打出来) */}
    {card.skills.map(skill => (
      <div className="bg-purple-900/50 rounded p-3 mt-3 max-w-md">
        <div className="text-purple-200 font-bold">🎯 {skill.name}</div>
        <TypewriterText text={skill.description} speed={30} />
      </div>
    ))}
    
    {/* scienceCard(逐字打出) */}
    <div className="bg-cyan-900/50 rounded p-3 mt-3 max-w-md">
      <div className="text-cyan-300 text-xs font-bold mb-1">📚 你知道吗?</div>
      <TypewriterText text={card.scienceCard} speed={30} />
    </div>
  </div>
  
  {/* 底部:下一张 / 跳过 */}
  <div className="pb-8 px-6 flex gap-3">
    <button onClick={skipAll} className="text-gray-400 px-4 py-2">跳过全部</button>
    <button onClick={next} className="flex-1 bg-cyan-600 py-3 rounded-lg font-bold">
      {currentIndex < newCards.length - 1 ? '下一张 →' : '完成 ✓'}
    </button>
  </div>
</div>
```

## 3.3 TypewriterText 组件(可选但很爽)

```jsx
// 逐字打出文字的效果,7 岁小朋友会觉得"哇这是给我读的"
function TypewriterText({ text, speed = 30 }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i++
      setShown(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])
  
  return <div>{shown}</div>
}
```

如果性能或时间紧,可以省略,直接 `{text}`。

## 3.4 重复卡的轻量提示

不弹卡片秀,只在抽卡网格上加一个角标:

```jsx
{/* 重复卡 */}
{card.isDupe && (
  <div className="absolute top-1 right-1 bg-yellow-600/90 text-white text-[10px] rounded px-1.5 py-0.5">
    → {card.fragments} 碎片
  </div>
)}

{/* 已拥有 N 张 */}
{!card.isNew && !card.isDupe && (
  <div className="absolute top-1 right-1 bg-gray-700/80 text-white text-[10px] rounded-full px-2 py-0.5">
    x{card.count}
  </div>
)}
```

---

# Part 4: 抽卡网格交互升级

抽卡完成 + 卡片秀完成后,玩家回到抽卡网格。这时:

## 4.1 点击任意卡查看详情

复用 Sprint 31a 中的 CardDetailModal(如果做了)或新建一个。**这次不仅是首次抽到的可以看**——所有 10 张卡都可以点击复习。

```jsx
{pulledCards.map((card, i) => (
  <button
    key={i}
    onClick={() => setSelectedCard(card)}
    className="..."
  >
    {/* 卡牌缩略图 */}
    <CardBack rarity={card.rarity} />
    {/* 标识 */}
    {card.isNew && <NewBadge />}
    {card.isDupe && <DupeBadge fragments={card.fragments} />}
  </button>
))}

{selectedCard && (
  <CardDetailModal card={selectedCard} onClose={() => setSelectedCard(null)} />
)}
```

## 4.2 视觉提示卡片可点击

每张卡右下角加个小图标,告诉玩家"我可以点":

```jsx
<div className="absolute bottom-1 right-1 text-[10px] text-cyan-300/70">
  ℹ️ 点看详情
</div>
```

---

# Part 5: 音效

如果项目有 `soundManager.js`(从 CLAUDE.md 看应该有),需要新增几个音效 key:

```javascript
// src/audio/soundManager.js
const SOUNDS = {
  // ... 现有 ...
  card_flip_normal: { freq: 600, duration: 0.1 },  // R 卡翻面
  card_flip_sr:     { freq: 800, duration: 0.2 },  // SR 卡叮
  card_flip_ssr:    { freq: 400, duration: 0.5, type: 'drum' },  // SSR 大鼓
  card_flip_sp:     { freq: 200, duration: 1.0, type: 'horn' },  // SP 长鸣
  capsule_crack:    { freq: 1000, duration: 0.15 }, // 胶囊裂开
}
```

如果是 Web Audio API 合成的(看 CLAUDE.md 说是),直接调整频率/波形参数即可,不需要资源文件。

---

# 实施顺序

```
Step 1: 创建 GachaAnimation.jsx 容器,实现胶囊出现 + 简单翻牌
        测试: 单抽能跑流程,一张卡正常翻面
        commit

Step 2: 实现 RARITY_EFFECTS 配置 + R/SR/SSR 三档差异化
        测试: 手动模拟抽到不同稀有度,看视觉差异
        commit

Step 3: 实现 SP 全屏事件(粒子 + 全屏闪 + 文字)
        测试: 用 dev 工具强制下一抽出 SP,确认效果
        commit

Step 4: 创建 CardShowcase.jsx 全屏卡片秀,触发 isNew
        测试: 抽到第一次见的卡,自动进卡片秀
        commit

Step 5: 抽卡网格点击 → CardDetailModal
        加角标:NEW / x{count} / → {fragments} 碎片
        commit

Step 6: 音效升级
        测试: 不同稀有度音效不同,SP 有专属长鸣
        commit

Step 7: 整体调试 + 性能优化
        - 十连一次性弹 5 张 isNew 卡片秀会不会太累?(加"跳过全部"按钮)
        - SP 粒子在低端设备会不会卡?(需要时可以减半)
        commit
```

**总预估: 4-6 小时**

---

# 验证清单

```
基础流程:
□ 单抽: 胶囊出现 → 卡牌飞出 → 翻面 → 显示
□ 十连: 10 张依次翻面,SR+ 有停顿
□ 抽卡按钮按一次扣一次金币(不重复扣)

稀有度差异:
□ R 卡: 普通蓝光,翻面快
□ SR 卡: 紫光晕 + 星屑粒子
□ SSR 卡: 金光 + 50 粒子 + 屏幕震
□ SP 卡: 全屏闪 + 100 粒子 + 文字 banner

isNew 卡片秀:
□ 抽到第一次见的卡,自动进入卡片秀
□ 显示完整 scienceCard(逐字打出或一次显示)
□ 多张 isNew 时可以"下一张"和"跳过全部"
□ 完成后回到抽卡网格

抽卡网格:
□ 每张卡右下有"ℹ️ 点看详情"
□ 点击任意卡弹出详情弹窗
□ NEW / x2 / → 50 碎片 角标显示正确
□ 关闭详情可继续点其他卡

齐齐亲自试:
□ 抽到 SR 时有反应(说"哦")
□ 抽到 SSR 时有反应(说"哇")
□ 抽到 SP 时有反应(叫出声 / 跑去叫爸爸)
□ 看完 NEW 卡能复述这卡是干什么的
□ 不会再说"我不知道这卡有什么用"
```

---

# Phase B / C 预告(给后续 Sprint 准备)

**Phase B(预估 2 小时)**:
- 抽卡页加"本期推荐池"展示
- 概率公示(R 68% / SR 25% ...)
- 图鉴未拥有进度("还差 47 张")
- 抽完 SR+ 后弹"加入卡组吗?"按钮联动 DeckBuilder

**Phase C(预估 3 小时)**:
- 十连中段插入科学小测验
- 主题成就系统(集齐"4 张抗生素"→ 解锁科学包)
- 抽到稀有卡的"分享"按钮(截图给妈妈/老师看)

**先看 Phase A 的齐齐反应**,再决定 B/C 怎么做或调整。

---

# 一个关键提醒

**齐齐说"图鉴里看太复杂"** = 我们做的 Sprint 30a 卡片持有量系统可能让 Collection 变复杂了。Phase A 的卡片秀是**抽卡页内置的轻量替代**,但长期来看,Collection 本身的 UX 也值得回头看一下。**先别动它**,等 Phase A 上线后看齐齐还会不会去图鉴。

---

*Spec 版本: v1.0 · 2026年5月3日*
*Sprint 31b = 抽卡爽感升级 Phase A*
