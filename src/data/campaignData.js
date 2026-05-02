// Bio Heroes 闯关战役数据
// 4章23关（3基础教学 + 2进阶教学 + 18闯关）— Sprint 21 重构

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
      nameEn: 'Basic Training',
      difficulty: 1,
      icon: '⭐',
      description: '学习 Bio Heroes 的核心玩法',
      descriptionEn: 'Learn the core mechanics of Bio Heroes',
      unlockCondition: null,
      completionReward: { coins: 500 },
      stages: [
        // 📗 基础教学（必须完成才能解锁第二章）
        { id: '1-1', name: '第一次战斗', nameEn: 'First Battle', type: 'tutorial', tutorialLevel: 1, category: 'basic' },
        { id: '1-2', name: '能量管理', nameEn: 'Energy Management', type: 'tutorial', tutorialLevel: 2, category: 'basic' },
        { id: '1-3', name: '技能初体验', nameEn: 'Skills Introduction', type: 'tutorial', tutorialLevel: 3, category: 'basic' },
        // 📙 进阶教学（可选，不阻止闯关）
        { id: '1-4', name: 'Power Bank 能量爆发', nameEn: 'Power Bank Energy Burst', type: 'tutorial', tutorialLevel: 4, category: 'advanced' },
        { id: '1-5', name: 'SP觉醒与阵营标记', nameEn: 'SP Awakening & Faction Markers', type: 'tutorial', tutorialLevel: 5, category: 'advanced' },
      ],
    },

    // ====== 第二章：病原侵袭篇 ======
    {
      id: 'ch2',
      name: '病原侵袭篇',
      nameEn: 'Pathogen Invasion',
      difficulty: 2,
      icon: '🦠',
      description: '病原体入侵人体！用人体系和科技系保卫健康！',
      descriptionEn: 'Pathogens are invading! Use Body and Tech factions to defend!',
      unlockCondition: 'ch1_basic_complete',
      completionReward: { coins: 200, diamonds: 10 },
      stages: [
        {
          id: '2-1',
          name: '蛀牙军团',
          nameEn: 'Cavity Bacteria Legion',
          type: 'battle',
          enemyConfig: {
            leaderHP: 12000,
            deck: ['cavity_bacteria','cavity_bacteria','cavity_bacteria','ecoli_thug','ecoli_thug','ecoli_thug','flu_virus','flu_virus','event_infection_outbreak','event_infection_outbreak'],
            spDeck: [],
            aiStrength: 0.2,
            aiPersonality: 'aggressive',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body', 'tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦠', text: '我们是蛀牙菌军团！只要有糖吃，我们就能无限繁殖！', textEn: "We're the Cavity Bacteria Legion! Give us sugar and we'll multiply forever!" },
              { speaker: 'player', emoji: '💬', text: '白细胞和胃酸可以消灭你们！🧬人体系克制🦠病原系！', textEn: 'White blood cells and stomach acid will destroy you! 🧬Body beats 🦠Pathogen!' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '你知道吗？你的口腔里住着超过700种细菌！蛀牙菌会把糖变成酸来腐蚀牙齿，所以每天刷牙2次很重要！', textEn: 'Did you know? Over 700 species of bacteria live in your mouth! Cavity bacteria turn sugar into acid that erodes your teeth — brush twice a day!' },
            ],
          },
          rewards: { firstClear: { coins: 300 }, threeStars: { coins: 150 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: 'stage_2_2',
          name: '食物中毒危机',
          nameEn: 'Food Poisoning Crisis',
          type: 'battle',
          enemyConfig: {
            leaderHP: 15000,
            deck: ['salmonella_poison','salmonella_poison','cholera_wave','hookworm_sucker','common_cold_virus','ringworm_itch','ecoli_thug','ecoli_thug','event_infection_outbreak','event_infection_outbreak'],
            spDeck: [],
            aiStrength: 0.25,
            aiPersonality: 'aggressive',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body', 'tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦠', text: '嘿嘿，你吃的东西里有我们的大军！肚子开始疼了吧？', textEn: "Hehe, your food is crawling with our army! Feeling sick yet?" },
              { speaker: 'player', emoji: '💬', text: '别小看我的消化系统！胃酸和免疫细胞会把你们全部消灭！', textEn: "Don't underestimate my digestive system! Stomach acid and immune cells will wipe you out!" },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '沙门氏菌最喜欢藏在没煮熟的鸡蛋和肉里。记住：食物要充分加热，生熟要分开，饭前要洗手！全球每年有6亿人因为不洁食物而生病。', textEn: 'Salmonella loves hiding in undercooked eggs and meat. Remember: cook food thoroughly, separate raw and cooked food, and wash hands before eating! 600 million people get sick from contaminated food every year.' },
            ],
          },
          rewards: { firstClear: { coins: 350 }, threeStars: { coins: 175 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '2-2',
          name: '流感风暴',
          nameEn: 'Flu Storm',
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
              { speaker: 'enemy', emoji: '🦠', text: '我是流感病毒！每年我都换一身新衣服，你的免疫系统认不出我！', textEn: "I'm the Flu Virus! I change my disguise every year — your immune system can't recognize me!" },
              { speaker: 'player', emoji: '💬', text: '疫苗每年都在更新！抗体可以锁定你！', textEn: 'Vaccines get updated every year too! Antibodies will lock onto you!' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '流感病毒的表面蛋白质一直在变化，就像不断换衣服的小偷。这就是为什么每年都需要打新的流感疫苗！', textEn: "The flu virus constantly changes its surface proteins — like a thief who keeps changing clothes. That's why we need a new flu vaccine every year!" },
            ],
          },
          rewards: { firstClear: { coins: 400 }, threeStars: { coins: 200 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: 'stage_2_4',
          name: '蚊媒双煞',
          nameEn: 'Mosquito-Borne Terror',
          type: 'battle',
          enemyConfig: {
            leaderHP: 20000,
            deck: ['dengue_mosquito','dengue_mosquito','plasmodium_parasite','hookworm_sucker','common_cold_virus','norovirus_storm','flu_virus','flu_virus','event_infection_outbreak','event_gene_mutation'],
            spDeck: [],
            aiStrength: 0.4,
            aiPersonality: 'balanced',
            bossMechanic: null,
            stageRule: 'mosquito_swarm',
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['tech', 'body'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦟', text: '嗡嗡嗡——我们是蚊子大军的乘客！登革热和疟疾，你选哪个？', textEn: "Bzzz — we ride the mosquito army! Dengue or malaria, pick your poison!" },
              { speaker: 'player', emoji: '💬', text: '科学家已经发明了疫苗和蚊帐！你们的日子不多了！', textEn: "Scientists have vaccines and bed nets! Your days are numbered!" },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '全世界每年有2.5亿人感染疟疾，登革热也在热带地区肆虐。一只蚊子一次能产200颗卵，只需要一个瓶盖大小的积水就够了！消灭蚊子繁殖地是最好的预防方法。', textEn: '250 million people catch malaria every year. A single mosquito can lay 200 eggs in water the size of a bottle cap! Eliminating mosquito breeding grounds is the best prevention.' },
            ],
          },
          rewards: { firstClear: { coins: 450 }, threeStars: { coins: 225 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '2-3',
          name: '狂犬危机',
          nameEn: 'Rabies Crisis',
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
              { speaker: 'enemy', emoji: '🦠', text: '我是狂犬病毒！我沿着神经爬到大脑，让被咬的动物变得疯狂！', textEn: "I'm the Rabies Virus! I crawl along nerves to the brain, driving infected animals mad!" },
              { speaker: 'player', emoji: '💬', text: '疫苗是你的克星！只要及时接种就能完全预防！', textEn: 'The vaccine is your weakness! Get vaccinated in time and you have zero chance!' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '狂犬病毒不走血液，沿着神经一路"爬"到大脑。感染后让宿主变得暴躁爱咬人。一旦发病致死率几乎100%，但及时打疫苗就能预防！', textEn: "Rabies doesn't travel through blood — it crawls along nerves all the way to the brain. Once symptoms appear, it's nearly 100% fatal, but timely vaccination prevents it completely!" },
            ],
          },
          rewards: { firstClear: { coins: 500 }, threeStars: { coins: 250 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: 'stage_2_7_vaccine_dilemma',
          name: '疫苗两难',
          nameEn: 'The Vaccine Dilemma',
          type: 'battle',
          enemyConfig: {
            // 牌组重平衡（修 AI 不出牌 bug）：原本 2 张 smallpox_ghost(cost 7+marker req) AI 永远打不出
            // 改为 0/1/2/3/4 cost 渐进，AI 每回合都能出牌
            leaderHP: 22000,
            deck: [
              'common_cold_virus',                          // 0 cost 开局垫场
              'flu_virus', 'flu_virus',                     // 1 cost ×2
              'cavity_bacteria',                            // 1 cost
              'rabies_virus',                               // 2 cost SR
              'plasmodium_parasite',                        // 3 cost SR
              'anthrax_spore',                              // 4 cost SR（疫苗对抗经典）
              'event_drug_resistance', 'event_infection_outbreak',
            ],
            spDeck: [],
            aiStrength: 0.45,
            aiPersonality: 'balanced',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['tech', 'body'] },
          conundrum: {
            id: 'vaccine_dilemma',
            scene: '村庄爆发了疑似天花病例。你手上的疫苗只够给 60% 的人接种。怎么办？',
            sceneEn: 'A smallpox-like outbreak hits the village. You have vaccine for only 60% of people.',
            question: '你要怎么分配疫苗？',
            questionEn: 'How will you allocate the vaccine?',
            choices: [
              {
                id: 'A',
                label: '优先给儿童和老人',
                labelEn: 'Prioritize children and elderly',
                effect: {
                  playerLeaderHpBonus: -3000,
                  playerStartingHandBonus: { filter: 'tech', count: 2 },
                },
                consequence: '你保护了最脆弱的人，但全村的安全标准下降。你的主人 HP 少了 3000，但开局多 2 张科技卡。',
                consequenceEn: 'You protected the most vulnerable, but village safety declined. Leader HP -3000, but start with 2 extra tech cards.',
                scienceNote: '这就是真实的公共卫生决策。年老者和儿童免疫力弱，感染后果严重，所以医学伦理学通常支持"优先保护脆弱群体"。',
                scienceNoteEn: 'This is a real public health decision. The elderly and children have weaker immunity, so medical ethics often favors protecting vulnerable groups first.',
              },
              {
                id: 'B',
                label: '给疫情最严重的地区集中使用',
                labelEn: 'Concentrate in worst-hit area',
                effect: {
                  playerStartingHandBonus: { filter: 'body', count: 2 },
                },
                consequence: '你阻止了疫情热点爆发，但其他地区开始出现病例。开局多 2 张人体系卡。',
                consequenceEn: 'You stopped the outbreak hotspot, but new cases appeared elsewhere. Start with 2 extra body cards.',
                scienceNote: '这叫"环形免疫"(ring vaccination)，1977 年天花根除的最后冲刺使用过这个策略。',
                scienceNoteEn: 'This is called "ring vaccination", used in the final push to eradicate smallpox in 1977.',
              },
              {
                id: 'C',
                label: '等待更多疫苗生产，全民接种',
                labelEn: 'Wait for more vaccine, then vaccinate everyone',
                effect: {
                  enemyLeaderHpBonus: 3000,
                },
                consequence: '等待期间病毒继续扩散，敌人更强了。敌方 HP +3000。但你在一个输不起的决策里坚持了公平。',
                consequenceEn: 'Virus spread during the wait. Enemy HP +3000. But you upheld fairness in an impossible choice.',
                scienceNote: '公平 vs 效率是真实的两难。科学家至今还在争论哪种策略更好，因为没有标准答案。',
                scienceNoteEn: 'Fairness vs efficiency is a real dilemma. Scientists still debate which strategy is better, because there is no standard answer.',
              },
            ],
          },
          dialogue: {
            before: [
              { speaker: 'narrator', emoji: '🏘️', text: '村里出现了怪病。症状像 200 年前消失的天花...', textEn: 'A strange disease appeared in the village. Symptoms look like smallpox, extinct for 200 years...' },
              { speaker: 'player', emoji: '💬', text: '我们有疫苗，但不够。必须做出选择。', textEn: 'We have vaccine, but not enough. A choice must be made.' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '疫苗分配没有完美答案。科学能告诉我们"有效"，但"对谁最有效"是伦理学的问题。你今天面对的，是真实的医学工作者每天的抉择。', textEn: 'Vaccine allocation has no perfect answer. Science tells us what works, but who it works for most is an ethics question. You faced what real medical workers face daily.' },
            ],
          },
          rewards: { firstClear: { coins: 400 }, threeStars: { coins: 200 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤12回合' },
        },
        {
          id: 'stage_2_8_antibiotic_abuse',
          name: '抗生素滥用',
          nameEn: 'Antibiotic Overuse',
          type: 'battle',
          enemyConfig: {
            // 牌组重平衡：原本 2 张 mrsa_superbug(cost 6+marker req) AI 打不出
            // 改为细菌为主，1 张 mrsa 当 finale，前期低费走量
            leaderHP: 24000,
            deck: [
              'cavity_bacteria', 'cavity_bacteria',         // 1 cost ×2
              'ecoli_thug', 'ecoli_thug', 'ecoli_thug',     // 2 cost ×3
              'salmonella_poison',                          // 2 cost
              'anthrax_spore',                              // 4 cost SR（细菌主题）
              'mrsa_superbug',                              // 6 cost SSR（保留 1 张 finale）
              'event_drug_resistance', 'event_drug_resistance',
            ],
            spDeck: [],
            aiStrength: 0.5,
            aiPersonality: 'aggressive',
            bossMechanic: null,
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['tech'] },
          conundrum: {
            id: 'antibiotic_abuse',
            scene: '孩子好像感冒了。医生说可能是病毒感染，也可能是细菌感染，还要等检查结果。你怎么办？',
            sceneEn: 'Your kid seems to have a cold. The doctor says it could be viral or bacterial — they need tests to confirm. What do you do?',
            question: '要不要立刻吃抗生素？',
            questionEn: 'Should you use antibiotics immediately?',
            choices: [
              {
                id: 'A',
                label: '立刻要抗生素，千万别耽误',
                labelEn: 'Get antibiotics now, no delay',
                effect: {
                  playerStartingBonus: { card: 'penicillin_pioneer', count: 1 },
                  globalEffect: 'antibiotic_weakened',
                },
                consequence: '开局免费获得一张青霉素。但本局所有抗生素类卡伤害减半 — 细菌已经记住你了。',
                consequenceEn: 'Start with a free Penicillin. But all antibiotic cards deal half damage this battle — bacteria have adapted.',
                scienceNote: '90% 的感冒是病毒引起的，抗生素对病毒无效。每次滥用抗生素，都在"训练"细菌变得更耐药。这就是全球耐药危机的来源。',
                scienceNoteEn: '90% of colds are viral. Antibiotics don\'t work on viruses. Every misuse "trains" bacteria to resist. This is the global resistance crisis.',
              },
              {
                id: 'B',
                label: '先验血，确认病因再决定',
                labelEn: 'Get blood test first, then decide',
                effect: {
                  playerStartingBonus: { card: 'blood_test_kit', count: 1 },
                },
                consequence: '开局免费获得一张血液检测盒。验明真凶再下药，是最专业的做法。',
                consequenceEn: 'Start with a free Blood Test Kit. Diagnose then treat — the professional approach.',
                scienceNote: '这叫"抗生素护理学"(Antibiotic Stewardship)，WHO 推荐的防止耐药危机的核心做法。',
                scienceNoteEn: 'This is "Antibiotic Stewardship", WHO-recommended best practice against resistance crisis.',
              },
              {
                id: 'C',
                label: '多喝水、多休息，让身体自愈',
                labelEn: 'Rest, hydrate, let the body heal itself',
                effect: {
                  playerLeaderHpBonus: 3000,
                },
                consequence: '孩子三天后自愈了。你的主人 HP +3000 — 自然免疫力得到了锻炼。',
                consequenceEn: 'Kid recovered in 3 days on their own. Leader HP +3000 — natural immunity got stronger.',
                scienceNote: '你的免疫系统每天消灭无数病菌，不用药物也能康复大部分小病。过度依赖药物反而削弱免疫系统。',
                scienceNoteEn: 'Your immune system kills countless microbes daily. Most minor illnesses heal without drugs. Over-medication weakens immunity.',
              },
            ],
          },
          dialogue: {
            before: [
              { speaker: 'narrator', emoji: '👦', text: '孩子咳嗽、流鼻涕已经两天了...', textEn: 'The kid has been coughing and sneezing for two days...' },
              { speaker: 'player', emoji: '💬', text: '怎么办，要不要吃抗生素？', textEn: 'What should we do — antibiotics or not?' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '抗生素是 20 世纪最伟大的发明之一，但乱用正在摧毁它。每少用一次不必要的抗生素，就是在保护未来 — 未来的你，未来的家人。', textEn: 'Antibiotics are one of the 20th century\'s greatest inventions, but misuse is destroying them. Every unnecessary use avoided protects the future — yours, and your family\'s.' },
            ],
          },
          rewards: { firstClear: { coins: 500 }, threeStars: { coins: 250 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤12回合' },
        },
        {
          id: '2-4',
          name: '新冠病毒',
          nameEn: 'COVID-19',
          type: 'boss',
          enemyConfig: {
            leaderHP: 25000,
            deck: ['covid_invader','flu_virus','flu_virus','flu_virus','ecoli_thug','ecoli_thug','event_gene_mutation','event_gene_mutation','event_global_pandemic','event_infection_outbreak','event_infection_outbreak'],
            spDeck: ['sp_super_bacteria'],
            aiStrength: 0.4,
            aiPersonality: 'aggressive',
            bossMechanic: 'covid_boss',
            bossPreplaced: 'covid_invader', // Boss从第1回合在场
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body', 'tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦠', text: '我是新型冠状病毒！我的刺突蛋白能打开任何细胞的大门！', textEn: "I'm the Coronavirus! My spike proteins can unlock any cell's door!" },
              { speaker: 'player', emoji: '💬', text: '别怕！我们有疫苗、有抗体！人类的科学武器比你想象的强大！', textEn: "Don't be afraid! We have vaccines and antibodies! Human science is stronger than you think!" },
            ],
            bossHalfHP: [
              { speaker: 'enemy', emoji: '🦠', text: '不可能！你们竟然有mRNA疫苗？！我的刺突蛋白被识别了！', textEn: "Impossible! You have mRNA vaccines?! My spike proteins have been identified!" },
            ],
            after: [
              { speaker: 'player', emoji: '💬', text: '我们赢了！但要记住，病毒永远在变异。保持警惕、相信科学！', textEn: 'We won! But remember, viruses keep mutating. Stay vigilant, trust in science!' },
              { speaker: 'narrator', emoji: '🎓', text: 'SARS-CoV-2用刺突蛋白打开人体细胞的"门锁"。科学家用创纪录的速度研发出mRNA疫苗——这是人类历史上最快的疫苗研发！', textEn: 'SARS-CoV-2 uses spike proteins to unlock human cells. Scientists developed mRNA vaccines in record time — the fastest vaccine development in human history!' },
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
      nameEn: 'Ecology Crisis',
      difficulty: 3,
      icon: '🌊',
      description: '自然界的顶级掠食者来了！你能应对吗？',
      descriptionEn: 'Nature\'s apex predators are here! Can you handle them?',
      unlockCondition: 'ch2_complete',
      completionReward: { coins: 200, diamonds: 10 },
      stages: [
        {
          id: '3-1',
          name: '电鳗风暴',
          nameEn: 'Electric Eel Storm',
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
              { speaker: 'enemy', emoji: '🌱', text: '我是电鳗！860伏特的电击足以击晕任何猎物！', textEn: "I'm the Electric Eel! 860 volts is enough to stun any prey!" },
              { speaker: 'player', emoji: '💬', text: '你的电再强，也打不穿骨骼的防御！人体系，防守阵型！', textEn: "No matter how strong your shock, it can't break through bone armor! Body faction, defensive formation!" },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '电鳗的身体80%都是发电器官，能释放高达860伏特的电击。它不是鳗鱼，而是南美洲的裸背电鱼！', textEn: "80% of an electric eel's body is electric organs, generating up to 860 volts. Fun fact: it's not actually an eel — it's a South American knifefish!" },
            ],
          },
          rewards: { firstClear: { coins: 500 }, threeStars: { coins: 250 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: 'stage_3_2',
          name: '深海猎场',
          nameEn: 'Deep Sea Hunting Ground',
          type: 'battle',
          enemyConfig: {
            leaderHP: 22000,
            deck: ['shark_hunter','shark_hunter','octopus_genius','sea_turtle_navigator','jellyfish_stealth','amoeba_shapeshifter','electric_eel_battery','event_food_chain_burst','event_food_chain_burst','event_ecosystem_recovery'],
            spDeck: [],
            aiStrength: 0.5,
            aiPersonality: 'aggressive',
            bossMechanic: null,
            stageRule: 'deep_sea_pressure',
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['nature', 'tech'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🦈', text: '这里是深海，我们的领地！你的陆地生物在这里什么都不是！', textEn: "This is the deep sea, OUR territory! Your land creatures are nothing here!" },
              { speaker: 'player', emoji: '💬', text: '海洋里也有我的朋友——海龟、鲸鱼，还有科技的力量！', textEn: "The ocean has my allies too — sea turtles, whales, and the power of technology!" },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '海洋食物链从浮游植物开始，经过浮游动物、小鱼、大鱼，到鲨鱼和虎鲸等顶级捕食者。海洋产生了地球上50%以上的氧气，主要来自浮游植物的光合作用。', textEn: "The ocean food chain starts with phytoplankton, through zooplankton, small fish, big fish, up to sharks and orcas. The ocean produces over 50% of Earth's oxygen, mostly from phytoplankton photosynthesis." },
            ],
          },
          rewards: { firstClear: { coins: 550 }, threeStars: { coins: 275 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '3-2',
          name: '水母迷宫',
          nameEn: 'Jellyfish Maze',
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
              { speaker: 'enemy', emoji: '🌱', text: '我是水母...95%都是水，没有大脑...但我的毒针是自然界最快的武器！', textEn: "I'm a jellyfish... 95% water, no brain... but my stingers are nature's fastest weapon!" },
              { speaker: 'player', emoji: '💬', text: '纳米机器人可以清除毒素！科技系，全面出击！', textEn: 'Nanobots can neutralize toxins! Tech faction, full attack!' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '水母没有大脑、心脏、骨头，身体95%是水——却在海洋中生存了6亿多年！箱形水母的毒液是世界上最毒的之一。', textEn: "Jellyfish have no brain, heart, or bones, and are 95% water — yet they've survived in the ocean for over 600 million years! Box jellyfish venom is among the deadliest in the world." },
            ],
          },
          rewards: { firstClear: { coins: 600 }, threeStars: { coins: 300 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '3-3',
          name: '虎鲸猎场',
          nameEn: 'Orca Hunting Ground',
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
              { speaker: 'enemy', emoji: '🌱', text: '我是虎鲸！海洋中没有任何生物是我的对手！我的家族协同猎杀，无人能挡！', textEn: "I'm the Orca! No creature in the ocean can stand against me! My pod hunts as one — unstoppable!" },
              { speaker: 'player', emoji: '💬', text: '你再强也只有一个！我们人多力量大——用数量和策略取胜！', textEn: "You're strong but alone! We have numbers and strategy on our side!" },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '虎鲸是海豚科中体型最大的成员（不是鲸！），大脑非常发达。不同家族有自己独特的"方言"！', textEn: "Orcas are the largest members of the dolphin family (not whales!), with highly developed brains. Different pods have their own unique 'dialects'!" },
            ],
          },
          rewards: { firstClear: { coins: 700 }, threeStars: { coins: 350 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: 'stage_3_4',
          name: '丛林法则',
          nameEn: 'Law of the Jungle',
          type: 'battle',
          enemyConfig: {
            leaderHP: 24000,
            deck: ['elephant_elder','spider_trapper','spider_trapper','chameleon_stealth','ant_queen_colony','bee_worker','cheetah_sprinter','event_food_chain_burst','event_photosynthesis','event_ecosystem_recovery'],
            spDeck: [],
            aiStrength: 0.55,
            aiPersonality: 'balanced',
            bossMechanic: null,
            stageRule: 'jungle_mist',
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['body', 'nature'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🐘', text: '在丛林中，适者生存！弱小的生物只是食物链的一环！', textEn: "In the jungle, only the fittest survive! The weak are just links in the food chain!" },
              { speaker: 'player', emoji: '💬', text: '但每个生物都有自己的生存策略——蜘蛛有网，变色龙有伪装，蚂蚁有团队！', textEn: "But every creature has its own survival strategy — spiders have webs, chameleons have camouflage, ants have teamwork!" },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '丛林里每种动物都有独特的生存策略：变色龙用伪装、蜘蛛用陷阱、蚂蚁用数量。热带雨林只占地球面积的6%，却拥有全球50%以上的物种！', textEn: "Every jungle animal has a unique survival strategy: chameleons use camouflage, spiders use traps, ants use numbers. Rainforests cover only 6% of Earth's surface but hold over 50% of all species!" },
            ],
          },
          rewards: { firstClear: { coins: 750 }, threeStars: { coins: 375 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '3-4',
          name: '蓝鲸巨灵',
          nameEn: 'Blue Whale Titan',
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
              { speaker: 'enemy', emoji: '🌱', text: '我是蓝鲸，地球有史以来最大的动物。比最大的恐龙还大。你确定要挑战我？', textEn: "I'm the Blue Whale — the largest animal that has EVER lived on Earth. Bigger than any dinosaur. Are you sure you want to challenge me?" },
              { speaker: 'player', emoji: '💬', text: '就算你是最大的，也不是无敌的！科学告诉我们，再强大的生物也需要生态系统支撑！', textEn: "Even the biggest isn't invincible! Science tells us every creature depends on its ecosystem!" },
            ],
            bossHalfHP: [
              { speaker: 'enemy', emoji: '🌱', text: '嗯...你们的攻击开始有效了...但我的声纳会让你们全部颤抖！', textEn: "Hmm... your attacks are working... but my sonar will make you all tremble!" },
            ],
            after: [
              { speaker: 'player', emoji: '💬', text: '我们做到了！蓝鲸虽然强大，但没有丰富的海洋生态系统，它也无法生存。', textEn: "We did it! The blue whale is mighty, but without a rich ocean ecosystem, even it can't survive." },
              { speaker: 'narrator', emoji: '🎓', text: '蓝鲸心脏像一辆汽车那么大，舌头上能站50个人！蓝鲸主要吃磷虾——最大的动物吃最小的食物，这就是生态系统的奇妙之处。', textEn: "A blue whale's heart is the size of a car, and 50 people could stand on its tongue! Blue whales mainly eat krill — the biggest animal eating the smallest food. That's the wonder of ecosystems." },
            ],
          },
          rewards: { firstClear: { coins: 800, diamonds: 10 }, threeStars: { coins: 400 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
      ],
    },

    // ====== 第四章：科技觉醒篇 ======
    {
      id: 'ch4',
      name: '科技觉醒篇',
      nameEn: 'Tech Awakening',
      difficulty: 4,
      icon: '⚗️',
      description: '终极挑战！超级细菌免疫所有科技，只有生物智慧才能战胜它！',
      descriptionEn: 'Ultimate challenge! Superbugs resist all tech — only biological wisdom can defeat them!',
      unlockCondition: 'ch3_complete',
      completionReward: { coins: 300, diamonds: 20 },
      stages: [
        {
          id: '4-1',
          name: '耐药菌浪潮',
          nameEn: 'Antibiotic Resistance Wave',
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
              { speaker: 'enemy', emoji: '🦠', text: '哈哈！你的抗生素对我没用了！我已经进化出耐药性！', textEn: "Haha! Your antibiotics are useless against me now! I've evolved resistance!" },
              { speaker: 'player', emoji: '💬', text: '抗生素虽然不行，但免疫系统可以！白细胞不会被耐药性影响！', textEn: "Antibiotics may fail, but the immune system won't! White blood cells don't care about your resistance!" },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '过度使用抗生素让细菌"学会了"抵抗。记住：感冒是病毒引起的，吃抗生素完全没用！不要随便吃抗生素。', textEn: "Overusing antibiotics teaches bacteria to resist. Remember: colds are caused by viruses — antibiotics are completely useless against them! Don't take antibiotics casually." },
            ],
          },
          rewards: { firstClear: { coins: 1000 }, threeStars: { coins: 500 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: 'stage_4_2',
          name: '真菌入侵',
          nameEn: 'Fungal Invasion',
          type: 'battle',
          enemyConfig: {
            leaderHP: 25000,
            deck: ['cordyceps_zombie','cordyceps_zombie','ringworm_itch','ringworm_itch','prion_folder','anthrax_spore','ecoli_thug','event_gene_mutation','event_drug_resistance','event_infection_outbreak'],
            spDeck: [],
            aiStrength: 0.65,
            aiPersonality: 'defensive',
            bossMechanic: null,
            stageRule: 'spore_plague',
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['tech', 'body'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '🍄', text: '我不是普通的病菌——我能控制你的大脑！看看我对蚂蚁做的事...', textEn: "I'm no ordinary germ — I can control your brain! Look what I did to the ants..." },
              { speaker: 'player', emoji: '💬', text: '僵尸真菌？听起来很可怕，但抗真菌药和免疫系统能保护我们！', textEn: "Zombie fungus? Sounds scary, but antifungal drugs and our immune system protect us!" },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '真菌不是细菌也不是病毒，它们是独立的一界生物！冬虫夏草能控制昆虫行为，朊病毒则是错误折叠的蛋白质——连DNA都没有。地球上有超过500万种真菌，但只有约300种能感染人类。', textEn: "Fungi are neither bacteria nor viruses — they're their own kingdom of life! Cordyceps can control insect behavior, and prions are misfolded proteins without any DNA. Over 5 million fungal species exist, but only about 300 can infect humans." },
            ],
          },
          rewards: { firstClear: { coins: 1100 }, threeStars: { coins: 550 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '4-2',
          name: 'HIV潜伏',
          nameEn: 'HIV Stealth',
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
              { speaker: 'enemy', emoji: '🦠', text: '我是HIV...我专门攻击保护你的白细胞。我会慢慢摧毁你的免疫系统...', textEn: "I'm HIV... I specifically attack the white blood cells that protect you. I'll slowly destroy your immune system..." },
              { speaker: 'player', emoji: '💬', text: '现代医学已经能控制你了！抗病毒药物让感染者像健康人一样生活！', textEn: 'Modern medicine can control you now! Antiviral drugs let infected people live normal lives!' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: 'HIV专门攻击辅助T细胞——免疫系统的"总指挥"。虽然还没有疫苗能完全消灭HIV，但现代药物已经能让感染者正常生活。', textEn: "HIV specifically attacks helper T cells — the 'commander' of the immune system. While there's no vaccine yet to eliminate HIV, modern drugs allow infected people to live normal lives." },
            ],
          },
          rewards: { firstClear: { coins: 1200 }, threeStars: { coins: 600 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '4-3',
          name: '远古病毒觉醒',
          nameEn: 'Ancient Virus Awakens',
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
              { speaker: 'enemy', emoji: '🦠', text: '西伯利亚的永久冻土正在融化...被冰封了3万年的我即将复苏...', textEn: "Siberia's permafrost is melting... After 30,000 years frozen, I'm about to awaken..." },
              { speaker: 'player', emoji: '💬', text: '我们必须在它觉醒之前结束战斗！快速进攻！', textEn: 'We must finish the battle before it fully awakens! All-out attack!' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '2014年科学家从3万年前的永久冻土中复活了一种巨型病毒。随着全球变暖，被冰封数万年的远古病毒可能重见天日——气候变化的威胁远比我们想象的深远。', textEn: 'In 2014, scientists revived a giant virus from 30,000-year-old permafrost. As global warming melts more ice, ancient viruses may resurface — climate change threats go deeper than we imagine.' },
            ],
          },
          rewards: { firstClear: { coins: 1400 }, threeStars: { coins: 700 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: 'stage_4_4',
          name: '出血热噩梦',
          nameEn: 'Hemorrhagic Fever Nightmare',
          type: 'battle',
          enemyConfig: {
            leaderHP: 28000,
            deck: ['ebola_terror','ebola_terror','smallpox_ghost','anthrax_spore','dengue_mosquito','norovirus_storm','hiv_hunter','event_global_pandemic','event_drug_resistance','event_gene_mutation'],
            spDeck: ['sp_zombie_plague'],
            aiStrength: 0.7,
            aiPersonality: 'aggressive',
            bossMechanic: null,
            stageRule: 'bio_alert',
          },
          playerConfig: { useOwnDeck: true, recommendedFactions: ['tech', 'body'] },
          dialogue: {
            before: [
              { speaker: 'enemy', emoji: '💀', text: '天花曾经杀死了全人类10%的人口...而我，更加致命！', textEn: "Smallpox once killed 10% of all humans... and I'm even deadlier!" },
              { speaker: 'player', emoji: '💬', text: '天花已经被人类消灭了！科学的力量能战胜任何瘟疫！', textEn: 'Smallpox was eradicated by humanity! The power of science can defeat any plague!' },
            ],
            after: [
              { speaker: 'narrator', emoji: '🎓', text: '埃博拉和天花是人类历史上最可怕的病原体。天花在1980年被彻底消灭，是人类唯一完全战胜的传染病！天花疫苗（牛痘接种法）是人类发明的第一种疫苗，由爱德华·詹纳在1796年发明。', textEn: "Ebola and smallpox are among history's deadliest pathogens. Smallpox was eradicated in 1980 — the only disease humanity has completely defeated! The smallpox vaccine was the first vaccine ever, invented by Edward Jenner in 1796." },
            ],
          },
          rewards: { firstClear: { coins: 1500 }, threeStars: { coins: 750 } },
          starConditions: { one: '通关', two: '主人HP ≥ 50%', three: '主人HP ≥ 80% 且 ≤10回合' },
        },
        {
          id: '4-4',
          name: '超级细菌',
          nameEn: 'Superbug',
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
              { speaker: 'enemy', emoji: '🦠', text: '我是超级细菌...你们人类用了太多抗生素，现在没有任何药物能杀死我！', textEn: "I'm the Superbug... You humans used too many antibiotics. Now NO drug can kill me!" },
              { speaker: 'player', emoji: '💬', text: '科技不是唯一的答案！人体自身的免疫系统 + 自然界的力量，才是真正的终极武器！', textEn: "Tech isn't the only answer! The immune system + nature's power — THAT's the ultimate weapon!" },
            ],
            bossHalfHP: [
              { speaker: 'enemy', emoji: '🦠', text: '不...不可能...我可是无敌的超级细菌！怎么会...!', textEn: "No... impossible... I'm the invincible Superbug! How can this be...!" },
              { speaker: 'player', emoji: '💬', text: '集中火力！生物的力量永远比耐药性更强大！', textEn: "Focus fire! The power of biology will always be stronger than drug resistance!" },
            ],
            after: [
              { speaker: 'player', emoji: '💬', text: '我们做到了！超级细菌被打败了！', textEn: 'We did it! The Superbug is defeated!' },
              { speaker: 'player', emoji: '💬', text: '记住：生物世界的每一个问题，都有来自生物世界的答案。科学不只是药物和技术——理解生命本身，才是最强大的力量。', textEn: "Remember: every problem in the biological world has a biological answer. Science isn't just drugs and tech — understanding life itself is the greatest power." },
              { speaker: 'narrator', emoji: '🎓', text: '超级细菌是21世纪最严峻的公共卫生危机之一。科学家正在研究噬菌体疗法、CRISPR基因编辑来对抗它。保护抗生素的有效性需要每个人的努力！', textEn: "Superbugs are one of the 21st century's gravest public health crises. Scientists are developing phage therapy and CRISPR gene editing to fight them. Preserving antibiotic effectiveness requires everyone's effort!" },
            ],
          },
          rewards: { firstClear: { coins: 1600, diamonds: 20 }, threeStars: { coins: 800, ssrTicket: true } },
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
  if (stageId === '1-1') return true

  // 老存档保护：如果这一关已经有星（之前通关过），直接放行。
  // 防止 Sprint 19/30b 在已通关关卡之间插入新 ID 后，老关卡因新 prev 无星被锁。
  if ((stageStars[stageId] || 0) >= 1) return true

  for (const chapter of campaignData.chapters) {
    for (let i = 0; i < chapter.stages.length; i++) {
      if (chapter.stages[i].id === stageId) {
        const stage = chapter.stages[i]

        // Advanced tutorial: unlocks after last basic tutorial (1-3) is done
        if (stage.category === 'advanced') {
          const basicStages = chapter.stages.filter(s => s.category === 'basic')
          const lastBasic = basicStages[basicStages.length - 1]
          if (!lastBasic) return false
          // Also need previous advanced tutorial done (sequential within advanced)
          const advStages = chapter.stages.filter(s => s.category === 'advanced')
          const advIdx = advStages.indexOf(stage)
          if (advIdx === 0) return (stageStars[lastBasic.id] || 0) >= 1
          return (stageStars[advStages[advIdx - 1].id] || 0) >= 1
        }

        if (i === 0) {
          // First stage of chapter: check previous chapter
          const chIdx = campaignData.chapters.indexOf(chapter)
          if (chIdx === 0) return true
          const prevChapter = campaignData.chapters[chIdx - 1]
          // For ch2+, only need basic tutorials of ch1 done (or last battle of previous chapter)
          if (prevChapter.id === 'ch1') {
            const basicStages = prevChapter.stages.filter(s => s.category === 'basic')
            return basicStages.every(s => (stageStars[s.id] || 0) >= 1)
          }
          const lastStage = prevChapter.stages[prevChapter.stages.length - 1]
          return (stageStars[lastStage.id] || 0) >= 1
        }
        // Regular sequential unlock
        const prevStage = chapter.stages[i - 1]
        // Skip advanced tutorials when checking sequential unlock for non-advanced stages
        if (prevStage.category === 'advanced' && !stage.category) {
          // Find the last non-advanced stage before this
          const nonAdvStages = chapter.stages.filter(s => s.category !== 'advanced')
          const myIdx = nonAdvStages.indexOf(stage)
          if (myIdx <= 0) return true
          return (stageStars[nonAdvStages[myIdx - 1].id] || 0) >= 1
        }
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
  // For ch1, only basic tutorials count for "complete"
  if (chapterId === 'ch1') {
    const basicStages = chapter.stages.filter(s => s.category === 'basic')
    return basicStages.every(s => (progress.stageStars[s.id] || 0) >= 1)
  }
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

// 开发者调试工具（仅开发环境）
if (typeof window !== 'undefined' && import.meta.env.DEV) {
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
