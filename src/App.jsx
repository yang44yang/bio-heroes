import React, { useState, Suspense, lazy, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LanguageProvider } from './i18n/LanguageContext'
import TitleScreen from './components/TitleScreen'
import { playerTestDeck, enemyTestDeck } from './data/testDecks'
import { useEconomy } from './hooks/useEconomy'
import { useDailyChallenge } from './hooks/useDailyChallenge'
import { loadTutorialProgress } from './data/tutorialData'
import {
  loadCampaignProgress, saveCampaignProgress, calculateStars, getTotalStars,
} from './data/campaignData'
import cards from './data/cards'
import eventCards from './data/eventCards'
import spCards from './data/spCards'
import IntroModal from './components/IntroModal'
import SpUnlockModal from './components/SpUnlockModal'
import AchievementModal from './components/AchievementModal'
import { detectNewlyUnlockedFrom, BATTLE_ACHIEVEMENTS, QUIZ_ACHIEVEMENTS } from './data/achievements'

// Boss 关 ID → 通关解锁的 SP 卡 ID（关卡 ID 统一为 stage_X_Y 后，Boss 为各章末关）
const SP_UNLOCK_MAP = {
  'stage_2_8': 'sp_vaccine_shield',    // ch2 Boss (新冠) → 疫苗之盾
  'stage_3_8': 'sp_gaia_restoration',  // ch3 Boss (蓝鲸) → 盖娅复苏·万物归野
  'stage_4_8': 'sp_quantum_healer',    // ch4 Boss (超级细菌) → 量子医疗
}

// 战斗 + 答题成就池（在战斗结算点检测）
const BATTLE_QUIZ_POOL = [...BATTLE_ACHIEVEMENTS, ...QUIZ_ACHIEVEMENTS]

// 懒加载重型组件 — 代码分割
// ★ 4b：改懒加载 HostBattleScreen（它调 useBattle/useHand 后把 battle 作 prop 传给 BattleScreen）。
//   BattleScreen 被 HostBattleScreen 普通 import，仍在同一代码分割块里。
const HostBattleScreen = lazy(() => import('./components/HostBattleScreen'))
const PvpLobby = lazy(() => import('./components/PvpLobby'))
const GachaScreen = lazy(() => import('./components/GachaScreen'))
const DeckBuilder = lazy(() => import('./components/DeckBuilder'))
const Collection = lazy(() => import('./components/Collection'))
const TutorialScreen = lazy(() => import('./components/TutorialScreen'))
const CampaignScreen = lazy(() => import('./components/CampaignScreen'))
const DailyChallenge = lazy(() => import('./components/DailyChallenge'))
const TestArena = lazy(() => import('./components/TestArena'))

// 加载占位
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">🧬</div>
        <div className="text-gray-400 text-sm">加载中…</div>
      </div>
    </div>
  )
}

// 根据 cardId 从数据中找到卡牌
const allCards = [...cards, ...eventCards, ...spCards]
function findCard(id) {
  return allCards.find(c => c.id === id)
}

// 从 enemyConfig.deck 中实例化敌方卡组
function buildEnemyDeck(deckIds) {
  return deckIds.map(id => {
    const card = findCard(id)
    if (!card) return null
    return { ...card }
  }).filter(Boolean)
}

export default function App() {
  // 首次进入：检查是否需要自动开始教学
  const [screen, setScreen] = useState(() => {
    // 首次进入：显示主菜单+IntroModal（而不是直接跳教学）
    if (!localStorage.getItem('bio-heroes-intro-seen')) return 'title'
    const tut = loadTutorialProgress()
    if (!tut.graduated && tut.completedLevels.length === 0) {
      return 'tutorial'
    }
    return 'title'
  })
  const [selectedDeck, setSelectedDeck] = useState(null)
  const [testArenaConfig, setTestArenaConfig] = useState(null) // 🧪 测试场：直接摆盘配置
  const [highlightCardIds, setHighlightCardIds] = useState([])
  const [tutorialStartLevel, setTutorialStartLevel] = useState(null) // 从闯关跳转时指定教学关卡
  const [pendingSpUnlock, setPendingSpUnlock] = useState(null) // Boss 通关后弹解锁庆祝
  const [pendingAchievements, setPendingAchievements] = useState([]) // 战斗/答题成就弹窗 FIFO 队列
  const economy = useEconomy()
  const daily = useDailyChallenge()
  const dailyRef = useRef(daily)
  dailyRef.current = daily // 始终指向最新，供 handleExitBattle 读取而不进 deps
  const [dailyResult, setDailyResult] = useState(null) // 每日挑战刚完成的奖励结果（供 DailyChallenge 弹窗）
  const testArenaConfigRef = useRef(null)
  testArenaConfigRef.current = testArenaConfig // 供 handleExitBattle 判断是否测试场对战（不进 deps）
  const pvpActiveRef = useRef(false)
  pvpActiveRef.current = screen === 'pvp' // 🔗 PvP 期间为 true，供 handleExitBattle 拒发收益（镜像 screen，不会漂移，不进 deps）

  // === 闯关战役状态 ===
  const campaignStageRef = useRef(null) // 当前战斗的关卡配置
  const pendingCampaignRef = useRef(null) // 等待选卡组后开始的闯关配置

  const handleSelectDeck = useCallback((deck) => {
    if (deck) {
      setSelectedDeck(deck)
    } else {
      setSelectedDeck(null)
    }
    // 如果有待处理的闯关战斗，选完卡组后直接开始闯关
    const pendingCampaign = pendingCampaignRef.current
    if (pendingCampaign) {
      pendingCampaignRef.current = null
      const stageConfig = pendingCampaign
      campaignStageRef.current = stageConfig
      const enemyDeck = buildEnemyDeck(stageConfig.enemyConfig.deck)
      const enemySpDeck = stageConfig.enemyConfig.spDeck
        ? buildEnemyDeck(stageConfig.enemyConfig.spDeck)
        : []
      setSelectedDeck(prev => ({
        ...prev,
        _campaignEnemy: {
          deck: enemyDeck,
          spDeck: enemySpDeck,
          leaderHP: stageConfig.enemyConfig.leaderHP,
          aiStrength: stageConfig.enemyConfig.aiStrength,
          aiPersonality: stageConfig.enemyConfig.aiPersonality,  // Sprint 28: 传递 personality
          bossMechanic: stageConfig.enemyConfig.bossMechanic,
          bossPreplaced: stageConfig.enemyConfig.bossPreplaced,
          stageRule: stageConfig.enemyConfig.stageRule,
          dialogue: stageConfig.dialogue,
          stageType: stageConfig.stageType,
          stageName: stageConfig.stageName,
          conundrum: stageConfig.conundrum,  // Sprint 30b: 关卡前置两难选择
        },
      }))
    }
    setScreen('battle')
  }, [])

  const handleExitBattle = useCallback((battleResult) => {
    // 🔗 PvP 对战：绝不计战绩/成就/金币 —— 防止未来把 PvP 结算接进本函数污染单机经济。
    //    今天 PvP 结构上就零收益（onExit 回大厅、不经此函数），这是完整版兜底守卫，照 testArena 写法。
    if (pvpActiveRef.current) {
      setScreen('title')
      return
    }
    // 🧪 测试场对战：不计战绩/成就，直接清配置回主菜单
    if (testArenaConfigRef.current) {
      setTestArenaConfig(null)
      campaignStageRef.current = null
      setSelectedDeck(null)
      setScreen('title')
      return
    }
    // —— 共享：累计战斗/答题统计 + 检测战斗/答题成就（campaign 分支会提前 return，故必须前置）——
    if (battleResult) {
      const stats = economy.recordBattleResult(battleResult) // stateRef 同步新快照
      const stageStars = { ...(loadCampaignProgress().stageStars || {}) }
      // 把本场刚得的星 merge 进本地副本，让"击败全部 Boss"/"累计星"当场解锁（不写盘，campaign 分支才持久化）
      // 每日挑战(daily_)是伪 stage，不计入星数成就
      if (campaignStageRef.current && battleResult.won && !String(campaignStageRef.current.stageId).startsWith('daily_')) {
        const sid = campaignStageRef.current.stageId
        const earned = calculateStars({
          won: true,
          leaderHPPercent: battleResult.leaderHPPercent || 0,
          turnCount: battleResult.turnsPlayed || 99,
        })
        stageStars[sid] = Math.max(stageStars[sid] || 0, earned)
      }
      const newly = detectNewlyUnlockedFrom(
        BATTLE_QUIZ_POOL,
        { stats, stageStars, battleResult },
        economy.unlockedAchievements || []
      )
      if (newly.length > 0) {
        economy.markAchievementsUnlocked(newly.map(a => a.id))
        setPendingAchievements(q => [...q, ...newly])
      }
    }

    // 检查是否是闯关战斗
    const stageConfig = campaignStageRef.current

    // 每日挑战分支：daily_ 前缀的伪 stage，不走 campaign 进度逻辑（星数/SP解锁/章节奖励）
    if (stageConfig && battleResult && String(stageConfig.stageId).startsWith('daily_')) {
      if (battleResult.won) {
        const result = dailyRef.current.completeAndClaim(battleResult, economy)
        if (result?.reward) setDailyResult(result)
      }
      campaignStageRef.current = null
      setSelectedDeck(prev => {
        if (!prev) return null
        const { _campaignEnemy, ...rest } = prev
        return Object.keys(rest).length > 0 ? rest : null
      })
      setScreen('daily')
      return
    }

    if (stageConfig && battleResult) {
      // 计算星数
      const stars = calculateStars({
        won: battleResult.won,
        leaderHPPercent: battleResult.leaderHPPercent || 0,
        turnCount: battleResult.turnsPlayed || 99,
      })

      // 更新闯关进度
      const prog = loadCampaignProgress()
      const prevStars = prog.stageStars[stageConfig.stageId] || 0
      if (stars > prevStars) {
        prog.stageStars[stageConfig.stageId] = stars
      }

      // 发放奖励 —— ⚠️ 修复「重进关卡反复领同一奖励」bug 的关键顺序：
      //   先把「已领取」标记全部写进 prog 并**立即存盘**，再发放金币/钻石。
      //   旧写法是「标记 + 当场发放」交织、最后才 saveCampaignProgress；一旦发放或其后代码
      //   （SP解锁/成就/里程碑…）中途抛异常或页面被打断，标记就没落盘 → 重进该关又当首通再领。
      //   现在「领过 ⟺ 标记已落盘」原子成立：发放副作用推迟到存盘之后执行。
      prog.claimedRewards = prog.claimedRewards || {}
      const pendingGrants = [] // 延后到存盘后执行的发放副作用
      if (battleResult.won) {
        // 首通 + 三星
        if (stageConfig.rewards) {
          const rewardKey = `${stageConfig.stageId}_first`
          if (!prog.claimedRewards[rewardKey]) {
            prog.claimedRewards[rewardKey] = true
            const r = stageConfig.rewards.firstClear
            if (r?.coins) pendingGrants.push(() => economy.addCoins(r.coins))
            if (r?.diamonds) pendingGrants.push(() => economy.addDiamonds(r.diamonds))
          }
          if (stars >= 3) {
            const threeKey = `${stageConfig.stageId}_three`
            if (!prog.claimedRewards[threeKey]) {
              prog.claimedRewards[threeKey] = true
              const r = stageConfig.rewards.threeStars
              if (r?.coins) pendingGrants.push(() => economy.addCoins(r.coins))
              if (r?.ssrTicket) pendingGrants.push(() => economy.useSSRTicket())
            }
          }
        }

        // 章节完成奖励（Boss 关首通）
        const chapterMap = { 'stage_2_8': 'ch2', 'stage_3_8': 'ch3', 'stage_4_8': 'ch4' }
        const chapterId = chapterMap[stageConfig.stageId]
        if (chapterId) {
          const chapterKey = `${chapterId}_complete`
          if (!prog.claimedRewards[chapterKey]) {
            prog.claimedRewards[chapterKey] = true
            if (chapterId === 'ch2') {
              pendingGrants.push(() => economy.addCoins(500))
            } else if (chapterId === 'ch3') {
              pendingGrants.push(() => economy.addCoins(500))
              pendingGrants.push(() => economy.addDiamonds(10))
            }
            // ch4：仅标记"科学家🔬"称号，无金币（UI 从 claimedRewards 读取显示）
          }
        }

        // 星数里程碑奖励（走 getTotalStars：只数当前关卡星，防幽灵 key 让里程碑提前发奖）
        const totalStars = getTotalStars(prog)
        if (totalStars >= 30 && !prog.claimedRewards['star_milestone_30']) {
          prog.claimedRewards['star_milestone_30'] = true
          pendingGrants.push(() => economy.addCoins(500))
        }
        if (totalStars >= 45 && !prog.claimedRewards['star_milestone_45']) {
          prog.claimedRewards['star_milestone_45'] = true
          pendingGrants.push(() => economy.addCoins(1000))
        }
      }

      // ★ 先存盘（持久化 stars + 全部已领标记），再发放 —— 保证「领过 ⟺ 已落盘」
      saveCampaignProgress(prog)
      for (const grant of pendingGrants) grant()

      // SP 解锁（Boss 通关）— 幂等、不依赖首通、不涉及 claimedRewards，放存盘之后
      if (battleResult.won) {
        const unlockableId = SP_UNLOCK_MAP[stageConfig.stageId]
        if (unlockableId && !(economy.unlockedSPs || []).includes(unlockableId)) {
          economy.unlockCampaignSP(unlockableId)
          setPendingSpUnlock(unlockableId)
        }
      }
      campaignStageRef.current = null
      // 清除闯关残留的 _campaignEnemy，保留玩家自选卡组
      setSelectedDeck(prev => {
        if (!prev) return null
        const { _campaignEnemy, ...rest } = prev
        return Object.keys(rest).length > 0 ? rest : null
      })
      setScreen('campaign')
      return
    }

    // 普通战斗
    if (battleResult) {
      const reward = economy.calculateBattleReward(battleResult)
      economy.claimBattleReward(reward)
    }
    campaignStageRef.current = null
    // 同样清除残留状态
    setSelectedDeck(prev => {
      if (!prev) return null
      const { _campaignEnemy, ...rest } = prev
      return Object.keys(rest).length > 0 ? rest : null
    })
    setScreen('title')
  }, [economy])

  // === 闯关战役：开始战斗（先选卡组）===
  const handleCampaignBattle = useCallback((stageConfig) => {
    pendingCampaignRef.current = stageConfig
    setScreen('deckBuilder')
  }, [])

  // 教学毕业奖励（一次性：先标记落盘、再发放，防重复领取）
  // 用独立标记而非 tutorial.graduated —— 后者在进毕业画面前就已置 true，挡不住发奖。
  // 重玩最后一关→「毕业」→「开始自由对战」可重回此处，无幂等防护则每次都发 1400。
  const handleTutorialGraduate = useCallback(() => {
    if (localStorage.getItem('bio-heroes-tutorial-reward-claimed')) return
    localStorage.setItem('bio-heroes-tutorial-reward-claimed', '1') // ★ 先标记落盘，再发放
    economy.addCoins(500) // 毕业金币
    economy.addCoins(900) // 免费十连抽（十连价 MULTI_COST=900）
  }, [economy])

  // 新手欢迎弹窗（首次进入）
  const [showIntro, setShowIntro] = useState(() => !localStorage.getItem('bio-heroes-intro-seen'))
  // 老玩家欢迎提示（有旧存档的 isNewPlayer）
  const [showWelcome, setShowWelcome] = useState(economy.isNewPlayer && !!localStorage.getItem('bio-heroes-intro-seen'))
  const handleDismissWelcome = useCallback(() => {
    setShowWelcome(false)
    economy.dismissNewPlayer()
  }, [economy])

  // 提取闯关配置
  const campaignEnemy = selectedDeck?._campaignEnemy

  return (
    <LanguageProvider>
    <div className="min-h-screen-d bg-gray-900 text-white">
      {/* 新手欢迎弹窗（首次进入游戏） */}
      {showIntro && screen === 'title' && (
        <IntroModal
          onStartTutorial={() => {
            localStorage.setItem('bio-heroes-intro-seen', 'true')
            setShowIntro(false)
            economy.dismissNewPlayer?.()
            setScreen('tutorial')
          }}
          onSkip={() => {
            localStorage.setItem('bio-heroes-intro-seen', 'true')
            setShowIntro(false)
            economy.dismissNewPlayer?.()
          }}
        />
      )}

      {screen === 'title' && (
        <TitleScreen
          onStartBattle={() => setScreen('deckBuilder')}
          onOpenGacha={() => setScreen('gacha')}
          onOpenCollection={() => setScreen('collection')}
          onOpenTutorial={() => setScreen('tutorial')}
          onOpenCampaign={() => setScreen('campaign')}
          onOpenDailyChallenge={() => setScreen('daily')}
          onOpenTestArena={() => setScreen('testArena')}
          onOpenPvp={() => setScreen('pvp')}
          daily={daily}
          economy={economy}
        />
      )}
      <Suspense fallback={<LoadingFallback />}>
        {screen === 'battle' && (
          <HostBattleScreen
            playerDeckCards={selectedDeck?.mainCards || playerTestDeck}
            enemyDeckCards={campaignEnemy?.deck || enemyTestDeck}
            playerSpDeckCards={selectedDeck?.spCards}
            enemySpDeckCards={campaignEnemy?.spDeck}
            campaignConfig={campaignEnemy}
            testArenaConfig={testArenaConfig}
            onExit={handleExitBattle}
          />
        )}
        {screen === 'pvp' && (
          <PvpLobby onExit={() => setScreen('title')} />
        )}

        {screen === 'testArena' && (
          <TestArena
            onBack={() => setScreen('title')}
            onStart={(config) => {
              setTestArenaConfig(config)
              setSelectedDeck({ mainCards: config.playerField.filter(Boolean) })
              setScreen('battle')
            }}
          />
        )}
        {screen === 'gacha' && (
          <GachaScreen
            onBack={() => setScreen('title')}
            economy={economy}
            onGotoDeckBuilder={(cardIds) => {
              setHighlightCardIds(cardIds || [])
              setScreen('deckBuilder')
            }}
          />
        )}
        {screen === 'deckBuilder' && (
          <DeckBuilder
            onBack={() => {
              setHighlightCardIds([])
              if (pendingCampaignRef.current) {
                pendingCampaignRef.current = null
                setScreen('campaign')
              } else {
                setScreen('title')
              }
            }}
            onSelectDeck={handleSelectDeck}
            collection={economy.collection}
            highlightCardIds={highlightCardIds}
            onHighlightExpire={() => setHighlightCardIds([])}
          />
        )}
        {screen === 'collection' && (
          <Collection onBack={() => setScreen('title')} economy={economy} />
        )}
        {screen === 'tutorial' && (
          <TutorialScreen
            onExit={() => { setTutorialStartLevel(null); setScreen('title') }}
            onExitToCampaign={() => { setTutorialStartLevel(null); setScreen('campaign') }}
            initialLevel={tutorialStartLevel}
            onGraduate={handleTutorialGraduate}
            economy={economy}
          />
        )}
        {screen === 'campaign' && (
          <CampaignScreen
            onBack={() => setScreen('title')}
            onStartBattle={handleCampaignBattle}
            onStartTutorial={(lvl) => {
              setTutorialStartLevel(lvl ?? null)
              setScreen('tutorial')
            }}
            economy={economy}
          />
        )}
        {screen === 'daily' && (
          <DailyChallenge
            daily={daily}
            economy={economy}
            justWon={dailyResult}
            onClearResult={() => setDailyResult(null)}
            onStartChallenge={handleCampaignBattle}
            onBack={() => { setDailyResult(null); setScreen('title') }}
          />
        )}
      </Suspense>

      <AnimatePresence>
        {pendingSpUnlock && (
          <SpUnlockModal
            spId={pendingSpUnlock}
            onClose={() => setPendingSpUnlock(null)}
          />
        )}
      </AnimatePresence>

      {/* 战斗/答题成就弹窗：SP 解锁弹窗消失后再逐个弹，避免两个全屏弹窗叠加 */}
      <AnimatePresence>
        {!pendingSpUnlock && pendingAchievements.length > 0 && (
          <AchievementModal
            key={pendingAchievements[0].id}
            achievement={pendingAchievements[0]}
            onClose={() => setPendingAchievements(q => q.slice(1))}
          />
        )}
      </AnimatePresence>
    </div>
    </LanguageProvider>
  )
}
