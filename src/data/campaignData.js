// Bio Heroes 闯关战役数据
// 4章17关（5教学 + 12闯关）

const CAMPAIGN_STORAGE_KEY = 'bio-heroes-campaign'

// ================================================================
// 章节 & 关卡定义
// ================================================================

export const campaignData = {
  chapters: [
    // ====== 第一章：初级训练（复用教学关卡）======
    {
      id: 'ch1',
      name: '初级训练',
      difficulty: 1,
      icon: '⭐',
      description: '学习 Bio Heroes 的核心玩法',
      unlockCondition: null,
      completionReward: { coins: 500 },
      stages: [
        { id: '1-1', name: '第一次战斗', type: 'tutorial', tutorialLevel: 1 },
        { id: '1-2', name: '免疫反击', type: 'tutorial', tutorialLevel: 2 },
        { id: '1-3', name: '能量爆发', type: 'tutorial', tutorialLevel: 3 },
        { id: '1-4', name: '召唤觉醒', type: 'tutorial', tutorialLevel: 4 },
        { id: '1-5', name: '解锁终极战士', type: 'tutorial', tutorialLevel: 5 },
      ],
    },

    // ====== 第二章：病原侵袭篇 ======
    {
      id: 'ch2',
      name: '病原侵袭篇',
      difficulty: 2,
      icon: '🦠',
      description: '病原体入侵人体！用人体系和科技系保卫健康！',
      unlockCondition: 'ch1_complete',
      completionReward: { coins: 200, diamonds: 10 },
      stages: [
        {
          id: '2-1',
          name: '蛀牙军团',
          type: 'battle',
          enemyConfig: {
            leaderHP: 15000,
            deck: ['cavity_bacteria','cavity_bacteria','cavity_bacteria','ecoli_thug','ecoli_thug','ecoli_thug','flu_virus','flu_virus','event_infection_outbreak','event_infection_outbreak'],
            spDeck: [],
            aiStrength: 0.3,
            aiPersonality: 'aggressive',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body', 'tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦠', text: '我们是蛀牙菌军团！只要有糖吃，我们就能无限繁殖！' },
              { speaker: 'player', emoji: '💬', text: '白细胞和胃酸可以消灭你们！🧬人体系克制🦠病原系！' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '你知道吗？你的口腔里住着超过700种细菌！蛀牙菌会把糖变成酸来腐蚀牙齿，所以每天刷牙2次很重要！' },
            ],
          },
          rewards: { firstClear: { coins: 300 }, threeStars: { coins: 150 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '2-2',
          name: '流感风暴',
          type: 'battle',
          enemyConfig: {
            leaderHP: 18000,
            deck: ['flu_virus','flu_virus','flu_virus','cavity_bacteria','cavity_bacteria','rabies_virus','rabies_virus','event_gene_mutation','event_gene_mutation','event_infection_outbreak','event_infection_outbreak'],
            spDeck: [],
            aiStrength: 0.4,
            aiPersonality: 'balanced',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body', 'tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦠', text: '我是流感病毒！每年我都换一身新衣服，你的免疫系统认不出我！' },
              { speaker: 'player', emoji: '💬', text: '疫苗每年都在更新！抗体可以锁定你！' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '流感病毒的表面蛋白质一直在变化，就像不断换衣服的小偷。这就是为什么每年都需要打新的流感疫苗！' },
            ],
          },
          rewards: { firstClear: { coins: 400 }, threeStars: { coins: 200 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '2-3',
          name: '狂犬危机',
          type: 'battle',
          enemyConfig: {
            leaderHP: 20000,
            deck: ['rabies_virus','rabies_virus','rabies_virus','tapeworm_lurker','tapeworm_lurker','plasmodium_parasite','plasmodium_parasite','event_infection_outbreak','event_infection_outbreak','event_drug_resistance','event_drug_resistance'],
            spDeck: [],
            aiStrength: 0.5,
            aiPersonality: 'aggressive',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦠', text: '我是狂犬病毒！我沿着神经爬到大脑，让被咬的动物变得疯狂！' },
              { speaker: 'player', emoji: '💬', text: '疫苗是你的克星！只要及时接种就能完全预防！' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '狂犬病毒不走血液，沿着神经一路"爬"到大脑。感染后让宿主变得暴躁爱咬人。一旦发病致死率几乎100%，但及时打疫苗就能预防！' },
            ],
          },
          rewards: { firstClear: { coins: 500 }, threeStars: { coins: 250 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '2-4',
          name: '新冠病毒',
          type: 'boss',
          enemyConfig: {
            leaderHP: 25000,
            deck: ['covid_invader','flu_virus','flu_virus','flu_virus','ecoli_thug','ecoli_thug','event_gene_mutation','event_gene_mutation','event_global_pandemic','event_infection_outbreak','event_infection_outbreak'],
            spDeck: ['sp_super_bacteria'],
            aiStrength: 0.6,
            aiPersonality: 'aggressive',
            bossMechanic: 'covid_boss',
            bossPreplaced: 'covid_invader', // Boss从第1回合在场
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body', 'tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦠', text: '我是新型冠状病毒！我的刺突蛋白能打开任何细胞的大门！' },
              { speaker: 'player', emoji: '💬', text: '别怕！我们有疫苗、有抗体！人类的科学武器比你想象的强大！' },
            ],
            bossHalfHP: [
              { speaker: 'enemy', emoji: '🦠', text: '不可能！你们竟然有mRNA疫苗？！我的刺突蛋白被识别了！' },
            ],
            after: [
              { speaker: 'player', emoji: '💬', text: '我们赢了！但要记住，病毒永远在变异。保持警惕、相信科学！' },
              { speaker: 'narrator', emoji: '🎓', text: 'SARS-CoV-2用刺突蛋白打开人体细胞的"门锁"。科学家用创纪录的速度研发出mRNA疫苗——这是人类历史上最快的疫苗研发！' },
            ],
          },
          rewards: { firstClear: { coins: 600, diamonds: 10 }, threeStars: { coins: 300 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
      ],
    },

    // ====== 第三章：生态危机篇 ======
    {
      id: 'ch3',
      name: '生态危机篇',
      difficulty: 3,
      icon: '🌊',
      description: '自然界的顶级掠食者来了！你能应对吗？',
      unlockCondition: 'ch2_complete',
      completionReward: { coins: 200, diamonds: 10 },
      stages: [
        {
          id: '3-1',
          name: '电鳗风暴',
          type: 'battle',
          enemyConfig: {
            leaderHP: 20000,
            deck: ['electric_eel_battery','electric_eel_battery','electric_eel_battery','cheetah_sprinter','cheetah_sprinter','bee_worker','bee_worker','bee_worker','event_food_chain_burst','event_food_chain_burst','event_photosynthesis','event_photosynthesis'],
            spDeck: [],
            aiStrength: 0.5,
            aiPersonality: 'aggressive',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🌱', text: '我是电鳗！860伏特的电击足以击晕任何猎物！' },
              { speaker: 'player', emoji: '💬', text: '你的电再强，也打不穿骨骼的防御！人体系，防守阵型！' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '电鳗的身体80%都是发电器官，能释放高达860伏特的电击。它不是鳗鱼，而是南美洲的裸背电鱼！' },
            ],
          },
          rewards: { firstClear: { coins: 500 }, threeStars: { coins: 250 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '3-2',
          name: '水母迷宫',
          type: 'battle',
          enemyConfig: {
            leaderHP: 20000,
            deck: ['jellyfish_stealth','jellyfish_stealth','jellyfish_stealth','bee_worker','bee_worker','mimosa_timid','mimosa_timid','event_infection_outbreak','event_infection_outbreak','event_ecosystem_recovery','event_ecosystem_recovery'],
            spDeck: [],
            aiStrength: 0.5,
            aiPersonality: 'defensive',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🌱', text: '我是水母...95%都是水，没有大脑...但我的毒针是自然界最快的武器！' },
              { speaker: 'player', emoji: '💬', text: '纳米机器人可以清除毒素！科技系，全面出击！' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '水母没有大脑、心脏、骨头，身体95%是水——却在海洋中生存了6亿多年！箱形水母的毒液是世界上最毒的之一。' },
            ],
          },
          rewards: { firstClear: { coins: 600 }, threeStars: { coins: 300 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '3-3',
          name: '虎鲸猎场',
          type: 'battle',
          enemyConfig: {
            leaderHP: 22000,
            deck: ['orca_alpha','cheetah_sprinter','cheetah_sprinter','electric_eel_battery','electric_eel_battery','event_food_chain_burst','event_food_chain_burst','event_ecosystem_recovery','event_ecosystem_recovery','event_cambrian_explosion'],
            spDeck: ['sp_trex'],
            aiStrength: 0.6,
            aiPersonality: 'balanced',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body', 'tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🌱', text: '我是虎鲸！海洋中没有任何生物是我的对手！我的家族协同猎杀，无人能挡！' },
              { speaker: 'player', emoji: '💬', text: '你再强也只有一个！我们人多力量大——用数量和策略取胜！' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '虎鲸是海豚科中体型最大的成员（不是鲸！），大脑非常发达。不同家族有自己独特的"方言"！' },
            ],
          },
          rewards: { firstClear: { coins: 700 }, threeStars: { coins: 350 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '3-4',
          name: '蓝鲸巨灵',
          type: 'boss',
          enemyConfig: {
            leaderHP: 30000,
            deck: ['blue_whale_titan','orca_alpha','cheetah_sprinter','cheetah_sprinter','sunflower_charger','sunflower_charger','event_food_chain_burst','event_food_chain_burst','event_cambrian_explosion','event_ecosystem_recovery','event_ecosystem_recovery'],
            spDeck: ['sp_trex', 'sp_world_tree'],
            aiStrength: 0.7,
            aiPersonality: 'defensive',
            bossMechanic: 'whale_boss',
            bossPreplaced: 'blue_whale_titan',
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body', 'tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🌱', text: '我是蓝鲸，地球有史以来最大的动物。比最大的恐龙还大。你确定要挑战我？' },
              { speaker: 'player', emoji: '💬', text: '就算你是最大的，也不是无敌的！科学告诉我们，再强大的生物也需要生态系统支撑！' },
            ],
            bossHalfHP: [
              { speaker: 'enemy', emoji: '🌱', text: '嗯...你们的攻击开始有效了...但我的声纳会让你们全部颤抖！' },
            ],
            after: [
              { speaker: 'player', emoji: '💬', text: '我们做到了！蓝鲸虽然强大，但没有丰富的海洋生态系统，它也无法生存。' },
              { speaker: 'narrator', emoji: '🎓', text: '蓝鲸心脏像一辆汽车那么大，舌头上能站50个人！蓝鲸主要吃磷虾——最大的动物吃最小的食物，这就是生态系统的奇妙之处。' },
            ],
          },
          rewards: { firstClear: { coins: 800, diamonds: 15 }, threeStars: { coins: 400 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
      ],
    },

    // ====== 第四章：科技觉醒篇 ======
    {
      id: 'ch4',
      name: '科技觉醒篇',
      difficulty: 4,
      icon: '⚗️',
      description: '终极挑战！超级细菌免疫所有科技，只有生物智慧才能战胜它！',
      unlockCondition: 'ch3_complete',
      completionReward: { coins: 300, diamonds: 20 },
      stages: [
        {
          id: '4-1',
          name: '耐药菌浪潮',
          type: 'battle',
          enemyConfig: {
            leaderHP: 22000,
            deck: ['ecoli_thug','ecoli_thug','ecoli_thug','botulinum_chef','botulinum_chef','cavity_bacteria','cavity_bacteria','event_drug_resistance','event_drug_resistance','event_drug_resistance','event_gene_mutation','event_gene_mutation'],
            spDeck: [],
            aiStrength: 0.6,
            aiPersonality: 'defensive',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body', 'tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦠', text: '哈哈！你的抗生素对我没用了！我已经进化出耐药性！' },
              { speaker: 'player', emoji: '💬', text: '抗生素虽然不行，但免疫系统可以！白细胞不会被耐药性影响！' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '过度使用抗生素让细菌"学会了"抵抗。记住：感冒是病毒引起的，吃抗生素完全没用！不要随便吃抗生素。' },
            ],
          },
          rewards: { firstClear: { coins: 1000 }, threeStars: { coins: 500 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '4-2',
          name: 'HIV潜伏',
          type: 'battle',
          enemyConfig: {
            leaderHP: 22000,
            deck: ['hiv_hunter','flu_virus','flu_virus','plasmodium_parasite','plasmodium_parasite','event_gene_mutation','event_gene_mutation','event_infection_outbreak','event_infection_outbreak','event_drug_resistance'],
            spDeck: [],
            aiStrength: 0.7,
            aiPersonality: 'defensive',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦠', text: '我是HIV...我专门攻击保护你的白细胞。我会慢慢摧毁你的免疫系统...' },
              { speaker: 'player', emoji: '💬', text: '现代医学已经能控制你了！抗病毒药物让感染者像健康人一样生活！' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: 'HIV专门攻击辅助T细胞——免疫系统的"总指挥"。虽然还没有疫苗能完全消灭HIV，但现代药物已经能让感染者正常生活。' },
            ],
          },
          rewards: { firstClear: { coins: 1200 }, threeStars: { coins: 600 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '4-3',
          name: '远古病毒觉醒',
          type: 'battle',
          enemyConfig: {
            leaderHP: 25000,
            deck: ['botulinum_chef','botulinum_chef','plasmodium_parasite','plasmodium_parasite','tapeworm_lurker','tapeworm_lurker','event_global_pandemic','event_gene_mutation','event_gene_mutation','event_drug_resistance','event_drug_resistance'],
            spDeck: ['sp_ancient_virus'],
            aiStrength: 0.7,
            aiPersonality: 'aggressive',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body', 'nature'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦠', text: '西伯利亚的永久冻土正在融化...被冰封了3万年的我即将复苏...' },
              { speaker: 'player', emoji: '💬', text: '我们必须在它觉醒之前结束战斗！快速进攻！' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '2014年科学家从3万年前的永久冻土中复活了一种巨型病毒。随着全球变暖，被冰封数万年的远古病毒可能重见天日——气候变化的威胁远比我们想象的深远。' },
            ],
          },
          rewards: { firstClear: { coins: 1400 }, threeStars: { coins: 700 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '4-4',
          name: '超级细菌',
          type: 'boss',
          enemyConfig: {
            leaderHP: 30000,
            deck: ['hiv_hunter','covid_invader','ecoli_thug','ecoli_thug','ecoli_thug','event_global_pandemic','event_drug_resistance','event_drug_resistance','event_drug_resistance','event_gene_mutation','event_gene_mutation'],
            spDeck: ['sp_super_bacteria', 'sp_ancient_virus'],
            aiStrength: 0.8,
            aiPersonality: 'balanced',
            bossMechanic: 'super_bacteria_boss',
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body', 'nature'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦠', text: '我是超级细菌...你们人类用了太多抗生素，现在没有任何药物能杀死我！' },
              { speaker: 'player', emoji: '💬', text: '科技不是唯一的答案！人体自身的免疫系统 + 自然界的力量，才是真正的终极武器！' },
            ],
            bossHalfHP: [
              { speaker: 'enemy', emoji: '🦠', text: '不...不可能...我可是无敌的超级细菌！怎么会...!' },
              { speaker: 'player', emoji: '💬', text: '集中火力！生物的力量永远比耐药性更强大！' },
            ],
            after: [
              { speaker: 'player', emoji: '💬', text: '我们做到了！超级细菌被打败了！' },
              { speaker: 'player', emoji: '💬', text: '记住：生物世界的每一个问题，都有来自生物世界的答案。科学不只是药物和技术——理解生命本身，才是最强大的力量。' },
              { speaker: 'narrator', emoji: '🎓', text: '超级细菌是21世纪最严峻的公共卫生危机之一。科学家正在研究噬菌体疗法、CRISPR基因编辑来对抗它。保护抗生素的有效性需要每个人的努力！' },
            ],
          },
          rewards: { firstClear: { coins: 1600, diamonds: 20 }, threeStars: { coins: 800 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
      ],
    },
  ],
}

// ================================================================
// 三星评价
// ================================================================
export function calculateStars(result) {
  const { won, leaderHPPercent, turnCount } = result
  if (!won) return 0
  let stars = 1
  if (leaderHPPercent >= 50) stars = 2
  if (leaderHPPercent >= 80 && turnCount <= 10) stars = 3
  return stars
}

// ================================================================
// 进度管理
// ================================================================
export function loadCampaignProgress() {
  try {
    const raw = localStorage.getItem(CAMPAIGN_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) { /* ignore */ }
  return { stageStars: {}, claimedRewards: {} }
  // stageStars: { '1-1': 3, '2-1': 2, ... }
  // claimedRewards: { '2-1_first': true, '2-1_three': true, ... }
}

export function saveCampaignProgress(progress) {
  localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(progress))
}

// 检查关卡是否解锁
export function isStageUnlocked(stageId, progress) {
  const { stageStars } = progress
  // 第一章第一关始终解锁
  if (stageId === '1-1') return true

  // 找到这一关在所有章节中的位置
  for (const chapter of campaignData.chapters) {
    for (let i = 0; i < chapter.stages.length; i++) {
      if (chapter.stages[i].id === stageId) {
        if (i === 0) {
          // 章节第一关：需要前一章最后一关通关
          const chIdx = campaignData.chapters.indexOf(chapter)
          if (chIdx === 0) return true
          const prevChapter = campaignData.chapters[chIdx - 1]
          const lastStage = prevChapter.stages[prevChapter.stages.length - 1]
          return (stageStars[lastStage.id] || 0) >= 1
        }
        // 其他关：需要前一关通关
        const prevStage = chapter.stages[i - 1]
        return (stageStars[prevStage.id] || 0) >= 1
      }
    }
  }
  return false
}

// 检查章节是否完成
export function isChapterComplete(chapterId, progress) {
  const chapter = campaignData.chapters.find(c => c.id === chapterId)
  if (!chapter) return false
  return chapter.stages.every(s => (progress.stageStars[s.id] || 0) >= 1)
}

// 获取总星数
export function getTotalStars(progress) {
  return Object.values(progress.stageStars).reduce((sum, s) => sum + s, 0)
}

// 最大星数
export function getMaxStars() {
  return campaignData.chapters.reduce((sum, ch) => sum + ch.stages.length * 3, 0)
}

// 开发者调试工具
if (typeof window !== 'undefined') {
  window.__debugCampaign = () => {
    const prog = loadCampaignProgress()
    const allStages = campaignData.chapters.flatMap(ch =>
      ch.stages.map(s => ({
        id: s.id,
        name: s.name,
        stars: prog.stageStars[s.id] || 0,
        unlocked: isStageUnlocked(s.id, prog),
      }))
    )
    console.table(allStages)
    console.log('Claimed rewards:', prog.claimedRewards)
    return prog
  }
}
