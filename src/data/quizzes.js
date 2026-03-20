// Bio Heroes 生物英雄传 - 完整题库
// Total: 180 questions
// 难度分布: easy ~45% / medium ~35% / hard ~20%
// 四大阵营全覆盖，每题关联 cardId

export const quizzes = [

  // ============================================================
  // 🌱 自然系 (nature) — 46题
  // ============================================================

  { q: "蚂蚁是用什么方式告诉同伴食物在哪里的？", options: ["唱歌", "跳舞", "释放信息素", "打手势"], answer: 2, fact: "蚂蚁通过释放化学信号（信息素）来和同伴交流，形成化学通讯网络！", difficulty: "easy", faction: "nature", cardId: "ant_soldier" },
  { q: "一只蚂蚁大约能举起自己体重多少倍的东西？", options: ["5倍", "10倍", "50倍", "100倍"], answer: 2, fact: "蚂蚁能举起自身体重50倍的东西，相当于你举起一辆卡车！", difficulty: "medium", faction: "nature", cardId: "ant_soldier" },
  { q: "切叶蚁把树叶搬回巢穴后会怎么处理？", options: ["直接吃掉", "用来盖房子", "用来种蘑菇", "给蚁后当床"], answer: 2, fact: "切叶蚁会把树叶嚼碎后当\"肥料\"种蘑菇，然后吃蘑菇！它们是最早的\"农民\"。", difficulty: "hard", faction: "nature", cardId: "ant_soldier" },
  { q: "蚂蚁睡觉吗？", options: ["不睡觉，24小时工作", "每天打几百次1分钟的小盹", "像人一样睡8小时", "冬天才睡"], answer: 1, fact: "工蚁每天会打大约250次小盹，每次只有1分钟左右！所以任何时候蚁群里都有蚂蚁是醒着的。", difficulty: "hard", faction: "nature", cardId: "ant_soldier" },
  { q: "地球上数量最多的昆虫是什么？", options: ["蟑螂", "蚊子", "蚂蚁", "蜜蜂"], answer: 2, fact: "蚂蚁是地球上数量最多的昆虫之一，估计总数超过20万亿只！", difficulty: "easy", faction: "nature", cardId: "ant_soldier" },

  { q: "含羞草被碰到后叶子会怎样？", options: ["变红", "合拢", "变大", "发光"], answer: 1, fact: "含羞草被碰到后叶片会迅速合拢下垂，像是在\"害羞\"！其实是一种防御反应。", difficulty: "easy", faction: "nature", cardId: "mimosa_timid" },
  { q: "如果反复碰含羞草，它会怎样？", options: ["叶子掉光", "不再合拢", "长出刺", "变色"], answer: 1, fact: "反复碰含羞草后它会\"习惯\"不再合拢，科学家认为这是植物的一种简单\"学习\"能力！", difficulty: "hard", faction: "nature", cardId: "mimosa_timid" },
  { q: "含羞草的叶子合拢是因为什么？", options: ["肌肉收缩", "叶枕细胞失水", "叶子枯萎了", "风吹的"], answer: 1, fact: "含羞草叶子合拢是因为叶枕的细胞突然失水，导致叶片快速下垂！", difficulty: "hard", faction: "nature", cardId: "mimosa_timid" },
  { q: "植物能\"听到\"声音吗？", options: ["不能", "能感知振动并做出反应", "只能听到音乐", "只有花能听到"], answer: 1, fact: "研究发现植物能感知声波振动！有的植物\"听到\"毛虫咀嚼声后会增加防御化学物质的分泌。", difficulty: "hard", faction: "nature", cardId: "mimosa_timid" },

  { q: "蜜蜂蜇人后自己会怎样？", options: ["没事", "变强", "会死", "会飞走"], answer: 2, fact: "蜜蜂的蜂刺有倒钩，蜇人后内脏会被拉出来，蜜蜂自己也会死。", difficulty: "easy", faction: "nature", cardId: "bee_worker" },
  { q: "蜜蜂用什么方式告诉同伴花在哪里？", options: ["叫声", "8字舞", "颜色变化", "触角碰触"], answer: 1, fact: "蜜蜂会跳\"8字舞\"（摇摆舞），用舞蹈的方向和速度告诉同伴花朵的方位和距离！", difficulty: "medium", faction: "nature", cardId: "bee_worker" },
  { q: "一只蜜蜂一辈子大约能酿多少蜂蜜？", options: ["一瓶", "一杯", "一茶匙", "一滴"], answer: 2, fact: "一只蜜蜂一辈子只能酿大约一茶匙的蜂蜜！但一个蜂群合作一年能酿30公斤。", difficulty: "medium", faction: "nature", cardId: "bee_worker" },
  { q: "蜜蜂能看到什么人类看不到的光？", options: ["红外线", "紫外线", "X射线", "微波"], answer: 1, fact: "蜜蜂能看到紫外线！很多花朵在紫外线下有特殊图案，引导蜜蜂找到花蜜。", difficulty: "hard", faction: "nature", cardId: "bee_worker" },

  { q: "水母的身体有百分之多少是水？", options: ["50%", "75%", "85%", "95%"], answer: 3, fact: "水母身体95%都是水！没有大脑、没有心脏，却在海洋中生存了6亿多年。", difficulty: "easy", faction: "nature", cardId: "jellyfish_stealth" },
  { q: "哪种水母理论上可以\"永生\"？", options: ["箱形水母", "灯塔水母", "月亮水母", "狮鬃水母"], answer: 1, fact: "灯塔水母能把自己变回幼年状态重新生长，理论上可以无限循环！", difficulty: "hard", faction: "nature", cardId: "jellyfish_stealth" },
  { q: "水母有大脑吗？", options: ["有一个很大的", "有一个很小的", "没有大脑", "有两个"], answer: 2, fact: "水母没有大脑！靠简单的神经网络来感知环境，是地球上最古老的动物之一。", difficulty: "easy", faction: "nature", cardId: "jellyfish_stealth" },
  { q: "水母的刺细胞射出毒针的速度有多快？", options: ["1秒", "0.01秒", "700纳秒", "1分钟"], answer: 2, fact: "水母刺细胞射出毒针只需700纳秒，是自然界最快的细胞反应！", difficulty: "hard", faction: "nature", cardId: "jellyfish_stealth" },
  { q: "世界上最毒的动物是什么？", options: ["眼镜蛇", "箱形水母", "蝎子", "河豚"], answer: 1, fact: "箱形水母是世界上最毒的动物之一，毒液可以在几分钟内导致心脏停跳！", difficulty: "medium", faction: "nature", cardId: "jellyfish_stealth" },

  { q: "向日葵会追着什么转？", options: ["月亮", "风", "太阳", "雨"], answer: 2, fact: "向日葵幼苗会追着太阳转（向光性），但长大后就固定朝东了！", difficulty: "easy", faction: "nature", cardId: "sunflower_charger" },
  { q: "向日葵上的小花排列遵循什么数学规律？", options: ["九九乘法表", "斐波那契数列", "圆周率", "等差数列"], answer: 1, fact: "向日葵的种子排列符合斐波那契数列，大自然也懂数学！", difficulty: "hard", faction: "nature", cardId: "sunflower_charger" },
  { q: "一朵向日葵上其实有多少朵小花？", options: ["1朵", "10朵", "上百朵", "上千朵"], answer: 3, fact: "一朵向日葵看起来是一朵花，其实是由上千朵小花组成的！", difficulty: "medium", faction: "nature", cardId: "sunflower_charger" },

  { q: "电鳗最高能释放多少伏特的电？", options: ["100伏特", "400伏特", "860伏特", "2000伏特"], answer: 2, fact: "电鳗能释放高达860伏特的电击！身体80%都是发电器官。", difficulty: "medium", faction: "nature", cardId: "electric_eel_battery" },
  { q: "电鳗其实是什么鱼？", options: ["真正的鳗鱼", "裸背电鱼", "鲶鱼", "鳐鱼"], answer: 1, fact: "电鳗其实不是鳗鱼，而是一种南美洲的裸背电鱼！", difficulty: "hard", faction: "nature", cardId: "electric_eel_battery" },
  { q: "电鳗除了捕猎，还用电做什么？", options: ["给手机充电", "在浑浊的水中探路", "吸引异性", "照明"], answer: 1, fact: "电鳗还会释放弱电脉冲来像雷达一样在浑浊的亚马逊河中探路！", difficulty: "medium", faction: "nature", cardId: "electric_eel_battery" },

  { q: "猎豹的最快速度大约是多少？", options: ["60公里/时", "80公里/时", "120公里/时", "200公里/时"], answer: 2, fact: "猎豹时速可达120公里，3秒就能加速到100公里/时！", difficulty: "easy", faction: "nature", cardId: "cheetah_sprinter" },
  { q: "猎豹高速奔跑最多能持续多久？", options: ["5秒", "30秒", "2分钟", "10分钟"], answer: 1, fact: "猎豹只能维持约30秒的高速奔跑，之后体温过热必须停下来！", difficulty: "medium", faction: "nature", cardId: "cheetah_sprinter" },
  { q: "猎豹跑步时尾巴有什么作用？", options: ["装饰好看", "像方向盘帮助转弯", "保持温暖", "吓跑敌人"], answer: 1, fact: "猎豹的长尾巴在高速奔跑时像方向盘和平衡器，帮助它急转弯时不会摔倒！", difficulty: "easy", faction: "nature", cardId: "cheetah_sprinter" },

  { q: "捕蝇草需要碰几次感觉毛才会合拢？", options: ["1次", "2次", "3次", "5次"], answer: 1, fact: "捕蝇草会\"数数\"！必须碰到感觉毛2次才会触发夹合，避免被雨滴误触。", difficulty: "medium", faction: "nature", cardId: "venus_flytrap" },
  { q: "捕蝇草是怎么消化虫子的？", options: ["嚼碎吃掉", "分泌消化液慢慢溶解", "交给根部消化", "不消化"], answer: 1, fact: "捕蝇草合拢后会分泌消化液慢慢溶解虫子，整个过程需要5-12天！", difficulty: "medium", faction: "nature", cardId: "venus_flytrap" },
  { q: "捕蝇草为什么要\"吃\"虫子？", options: ["因为好玩", "因为土壤缺少营养", "因为不能光合作用", "因为虫子味道好"], answer: 1, fact: "捕蝇草生长在贫瘠的沼泽地，土壤缺氮和磷，通过捕食昆虫来补充营养！", difficulty: "hard", faction: "nature", cardId: "venus_flytrap" },

  { q: "虎鲸其实属于什么科？", options: ["鲸科", "海豚科", "鲨鱼科", "海豹科"], answer: 1, fact: "虎鲸其实是海豚科中体型最大的成员，不是鲸！", difficulty: "medium", faction: "nature", cardId: "orca_alpha" },
  { q: "虎鲸家族之间用什么交流？", options: ["手语", "独特的叫声方言", "颜色变化", "电信号"], answer: 1, fact: "不同虎鲸家族有自己独特的\"方言\"——一套只有家人能听懂的叫声系统！", difficulty: "hard", faction: "nature", cardId: "orca_alpha" },
  { q: "虎鲸会把浮冰上的海豹怎么弄下水？", options: ["跳上冰面", "制造浪涌冲下来", "用嘴叼下来", "等冰融化"], answer: 1, fact: "虎鲸会协同游泳制造巨浪，把浮冰上的海豹冲入水中！", difficulty: "medium", faction: "nature", cardId: "orca_alpha" },
  { q: "虎鲸的家庭结构是什么样的？", options: ["雄性领导", "母系社会", "独居生活", "随机群居"], answer: 1, fact: "虎鲸是母系社会，妈妈是家族核心领袖，孩子一辈子都跟着妈妈！", difficulty: "medium", faction: "nature", cardId: "orca_alpha" },

  { q: "蓝鲸是地球上最大的什么？", options: ["最大的鱼", "最大的动物", "最大的哺乳动物", "最大的海洋生物"], answer: 1, fact: "蓝鲸是地球有史以来最大的动物——比最大的恐龙还大！", difficulty: "easy", faction: "nature", cardId: "blue_whale_titan" },
  { q: "蓝鲸宝宝刚出生有多长？", options: ["1米", "3米", "7米", "15米"], answer: 2, fact: "蓝鲸宝宝刚出生就有7米长，每天喝400升奶！", difficulty: "medium", faction: "nature", cardId: "blue_whale_titan" },
  { q: "蓝鲸的心跳在深潜时会降到每分钟几次？", options: ["60次", "30次", "2次", "不会变"], answer: 2, fact: "蓝鲸深潜时心跳可以降到每分钟只有2次！节省氧气在水下待更长时间。", difficulty: "hard", faction: "nature", cardId: "blue_whale_titan" },
  { q: "蓝鲸主要吃什么？", options: ["大鱼", "海草", "磷虾（小虾）", "乌贼"], answer: 2, fact: "最大的动物居然吃最小的食物之一——磷虾！蓝鲸一天能吃4吨磷虾。", difficulty: "easy", faction: "nature", cardId: "blue_whale_titan" },

  // 🌱 自然系补充
  { q: "蚂蚁有几条腿？", options: ["4条", "6条", "8条", "10条"], answer: 1, fact: "蚂蚁和所有昆虫一样有6条腿！昆虫的定义就是有6条腿和3段身体。", difficulty: "easy", faction: "nature", cardId: "ant_soldier" },
  { q: "向日葵的种子可以用来做什么？", options: ["做枕头", "榨油", "做药", "做橡皮"], answer: 1, fact: "向日葵种子可以榨出葵花籽油，也是很好的零食！一朵向日葵可以产出上千颗种子。", difficulty: "easy", faction: "nature", cardId: "sunflower_charger" },
  { q: "猎豹和豹子是同一种动物吗？", options: ["是的", "不是，是不同的物种", "猎豹是小豹子", "豹子是老猎豹"], answer: 1, fact: "猎豹和豹子是完全不同的物种！猎豹体型更瘦、跑得更快，脸上有标志性的黑色\"泪痕\"线条。", difficulty: "easy", faction: "nature", cardId: "cheetah_sprinter" },
  { q: "电鳗生活在哪里？", options: ["太平洋", "北极", "南美洲亚马逊河", "非洲尼罗河"], answer: 2, fact: "电鳗生活在南美洲的亚马逊河和奥里诺科河流域，那里的水很浑浊，所以它们要靠电来\"看路\"。", difficulty: "easy", faction: "nature", cardId: "electric_eel_battery" },
  { q: "蓝鲸的叫声能传多远？", options: ["100米", "1公里", "上千公里", "绕地球一圈"], answer: 2, fact: "蓝鲸的叫声可以传播上千公里！是动物界最响亮的声音，可达188分贝。", difficulty: "medium", faction: "nature", cardId: "blue_whale_titan" },
  { q: "含羞草是有毒的吗？", options: ["完全无毒", "有轻微毒性", "剧毒", "只有根部有毒"], answer: 1, fact: "含羞草全株有轻微毒性，家养的话要注意不要让小孩和宠物误食！", difficulty: "medium", faction: "nature", cardId: "mimosa_timid" },
  { q: "蜜蜂采一瓶蜂蜜需要飞多远？", options: ["1公里", "100公里", "绕地球一圈半", "到月球"], answer: 2, fact: "生产一瓶500克的蜂蜜，蜜蜂们总共需要飞行约6万公里——相当于绕地球一圈半！", difficulty: "hard", faction: "nature", cardId: "bee_worker" },
  { q: "虎鲸在自然界有天敌吗？", options: ["鲨鱼", "蓝鲸", "几乎没有天敌", "人类是唯一天敌"], answer: 2, fact: "虎鲸在自然界几乎没有天敌！它们是真正的海洋顶级掠食者，连大白鲨都会躲开它们。", difficulty: "easy", faction: "nature", cardId: "orca_alpha" },

  // ============================================================
  // 🧬 人体系 (body) — 46题
  // ============================================================

  { q: "血小板的主要功能是什么？", options: ["运输营养", "免疫防御", "止血凝血", "产生抗体"], answer: 2, fact: "血小板聚集形成血栓堵住伤口，是受伤后第一道修复防线！", difficulty: "easy", faction: "body", cardId: "platelet_guardian" },
  { q: "血小板是从哪里产生的？", options: ["心脏", "肝脏", "骨髓", "脾脏"], answer: 2, fact: "血小板是骨髓里的巨核细胞碎裂产生的小碎片。", difficulty: "medium", faction: "body", cardId: "platelet_guardian" },
  { q: "血小板是完整的细胞吗？", options: ["是的", "不是，是细胞碎片", "有时候是有时候不是", "只在骨髓里是"], answer: 1, fact: "血小板不是完整的细胞，是巨核细胞碎裂出来的小碎片，没有细胞核。", difficulty: "hard", faction: "body", cardId: "platelet_guardian" },

  { q: "红细胞的主要功能是什么？", options: ["免疫", "运输氧气", "凝血", "消化"], answer: 1, fact: "红细胞含血红蛋白，能与氧气结合进行运输。你身体里有约25万亿个！", difficulty: "easy", faction: "body", cardId: "red_blood_cell" },
  { q: "红细胞为什么没有细胞核？", options: ["发育不完全", "为了装更多氧气", "被白细胞吃了", "太小装不下"], answer: 1, fact: "红细胞丢弃细胞核是为了腾出更多空间装载血红蛋白来携带氧气！", difficulty: "hard", faction: "body", cardId: "red_blood_cell" },
  { q: "红细胞是什么形状的？", options: ["圆球形", "中间凹下去的圆饼形", "方形", "三角形"], answer: 1, fact: "红细胞像中间凹下去的小圆饼，这种形状增大表面积能携带更多氧气！", difficulty: "easy", faction: "body", cardId: "red_blood_cell" },
  { q: "你的骨髓每秒钟大约制造多少个新红细胞？", options: ["20个", "2000个", "200万个", "2亿个"], answer: 2, fact: "骨髓每秒钟制造约200万个新红细胞！因为红细胞寿命只有约120天。", difficulty: "hard", faction: "body", cardId: "red_blood_cell" },
  { q: "人体有多少百分比是水？", options: ["30%", "45%", "60%", "80%"], answer: 2, fact: "成年人身体大约60%是水！婴儿更高约75%。多喝水真的很重要。", difficulty: "easy", faction: "body", cardId: "red_blood_cell" },

  { q: "胃酸的酸性有多强？", options: ["和柠檬汁一样", "和醋一样", "接近盐酸", "比水稍酸"], answer: 2, fact: "胃酸pH值约1.5-3.5，强度接近盐酸，可以溶解金属！", difficulty: "medium", faction: "body", cardId: "stomach_acid" },
  { q: "胃壁细胞大约多久全部更新一次？", options: ["每天", "3-4天", "一个月", "一年"], answer: 1, fact: "胃壁细胞每3-4天就全部更新一次，这样胃就不会被自己消化掉！", difficulty: "hard", faction: "body", cardId: "stomach_acid" },
  { q: "为什么胃不会被自己的胃酸消化掉？", options: ["胃酸其实不强", "有一层黏液保护", "胃壁是金属做的", "因为胃很硬"], answer: 1, fact: "胃壁有一层厚厚的黏液保护层，像\"防酸雨衣\"把胃酸和胃壁隔开！", difficulty: "easy", faction: "body", cardId: "stomach_acid" },

  { q: "白细胞在身体里扮演什么角色？", options: ["快递员", "建筑工", "警察和士兵", "清洁工"], answer: 2, fact: "白细胞是身体里的\"警察\"和\"士兵\"，负责消灭入侵的病菌！", difficulty: "easy", faction: "body", cardId: "white_blood_cell" },
  { q: "一个白细胞大约能吃掉多少个细菌？", options: ["1-2个", "5-20个", "100个", "1000个"], answer: 1, fact: "中性粒细胞能直接吞噬细菌，一个可以吃掉5-20个！", difficulty: "medium", faction: "body", cardId: "white_blood_cell" },
  { q: "伤口红肿发热是怎么回事？", options: ["伤口在恶化", "白细胞正在打仗", "需要马上去医院", "血管破了"], answer: 1, fact: "伤口发红发肿是大量白细胞涌到伤口和病菌战斗！这叫\"炎症反应\"。", difficulty: "easy", faction: "body", cardId: "white_blood_cell" },
  { q: "白细胞是怎么从血管跑到受伤部位的？", options: ["沿血管游过去", "穿过血管壁爬过去", "坐红细胞的车", "通过神经传送"], answer: 1, fact: "白细胞能变形穿过血管壁的缝隙！叫\"趋化性\"，沿化学信号找到入侵者位置。", difficulty: "hard", faction: "body", cardId: "white_blood_cell" },

  { q: "人体最大的器官是什么？", options: ["心脏", "肝脏", "皮肤", "肺"], answer: 2, fact: "皮肤展开面积约2平方米，是人体最大的器官！每27天全部换新。", difficulty: "easy", faction: "body", cardId: "skin_barrier" },
  { q: "你一辈子大约会掉多少公斤的死皮？", options: ["4公斤", "10公斤", "40公斤", "100公斤"], answer: 2, fact: "人一辈子大约掉落40公斤的死皮！家里灰尘很大一部分就是人的死皮细胞。", difficulty: "medium", faction: "body", cardId: "skin_barrier" },
  { q: "皮肤多久全部换新一次？", options: ["每天", "每周", "约27天", "每年"], answer: 2, fact: "皮肤细胞约每27天全部更新一次，所以你的皮肤永远都是\"新\"的！", difficulty: "medium", faction: "body", cardId: "skin_barrier" },

  { q: "人脑大约有多少个神经元？", options: ["86万", "8600万", "86亿", "860亿"], answer: 3, fact: "人脑约有860亿神经元，比银河系的星星还多！", difficulty: "medium", faction: "body", cardId: "neuron_messenger" },
  { q: "神经信号的传导速度最快可达？", options: ["1米/秒", "12米/秒", "120米/秒", "1200米/秒"], answer: 2, fact: "有髓鞘的神经纤维传导速度最快可达120米/秒，比高铁还快！", difficulty: "hard", faction: "body", cardId: "neuron_messenger" },
  { q: "大脑用了你身体多少百分比的能量？", options: ["2%", "10%", "20%", "50%"], answer: 2, fact: "大脑只占体重2%，但消耗身体20%的能量！思考真的很\"费电\"。", difficulty: "medium", faction: "body", cardId: "neuron_messenger" },
  { q: "人在睡觉时大脑在做什么？", options: ["完全关机", "整理和巩固记忆", "只控制呼吸", "什么都不做"], answer: 1, fact: "睡觉时大脑在整理知识、巩固记忆、清除废物。这就是为什么睡好觉很重要。", difficulty: "easy", faction: "body", cardId: "neuron_messenger" },
  { q: "人体里最长的细胞是什么？", options: ["红细胞", "白细胞", "神经细胞", "肌肉细胞"], answer: 2, fact: "最长的神经细胞可以从脊髓延伸到脚趾，长度超过1米！", difficulty: "medium", faction: "body", cardId: "neuron_messenger" },
  { q: "你身体里的DNA全部展开能有多长？", options: ["1米", "100米", "从地球到太阳", "绕操场一圈"], answer: 2, fact: "把体内所有细胞的DNA展开接在一起，长度可以从地球到太阳来回好多次！", difficulty: "hard", faction: "body", cardId: "neuron_messenger" },

  { q: "抗体的形状像什么？", options: ["圆球", "Y字形", "长条", "星形"], answer: 1, fact: "抗体是Y字形的蛋白质，两个\"手臂\"能精确抓住特定病原体！", difficulty: "medium", faction: "body", cardId: "antibody_missile" },
  { q: "人体能产生多少种不同的抗体？", options: ["几百种", "几万种", "几百万种", "超过10亿种"], answer: 3, fact: "你的身体能造出超过10亿种不同的抗体，几乎能对付任何入侵者！", difficulty: "hard", faction: "body", cardId: "antibody_missile" },

  { q: "人的肺泡总面积大约相当于什么？", options: ["一张桌子", "半个网球场", "一个足球场", "一间教室"], answer: 1, fact: "肺里有3亿个肺泡，全部展开面积约70平方米，相当于半个网球场！", difficulty: "easy", faction: "body", cardId: "lung_engine" },
  { q: "为什么左肺比右肺小？", options: ["发育不良", "给心脏留位置", "左边不需要那么大", "基因决定的"], answer: 1, fact: "左肺比右肺小一点，是为了给心脏留出空间！", difficulty: "medium", faction: "body", cardId: "lung_engine" },
  { q: "人每天大约呼吸多少次？", options: ["2000次", "5000次", "2万次", "10万次"], answer: 2, fact: "人每天大约呼吸2万次，大部分时候不用想就自动做了！", difficulty: "easy", faction: "body", cardId: "lung_engine" },

  { q: "成年人有多少块骨头？", options: ["106块", "206块", "306块", "186块"], answer: 1, fact: "婴儿有约300块骨头，长大后很多合并，最终只剩206块！", difficulty: "easy", faction: "body", cardId: "skeleton_frame" },
  { q: "人身上最小的骨头在哪里？", options: ["手指", "脚趾", "耳朵里", "鼻子里"], answer: 2, fact: "人体最小的骨头是耳朵里的镫骨，只有3毫米，比一粒米还小！", difficulty: "medium", faction: "body", cardId: "skeleton_frame" },
  { q: "骨头里面是空心的还是实心的？", options: ["完全实心", "里面有骨髓，是活的", "完全空心", "只有表面是活的"], answer: 1, fact: "骨头外面硬里面活！骨骼内部有骨髓，每天生产约2000亿个血液细胞。", difficulty: "easy", faction: "body", cardId: "skeleton_frame" },
  { q: "人身上最硬的部分是什么？", options: ["骨头", "指甲", "牙齿的珐琅质", "头骨"], answer: 2, fact: "牙齿表面的珐琅质是人体最硬的物质！比骨头还硬，硬度接近水晶。", difficulty: "medium", faction: "body", cardId: "skeleton_frame" },

  { q: "人的心脏一天大约跳动多少次？", options: ["1千次", "1万次", "10万次", "100万次"], answer: 2, fact: "心脏每天跳约10万次，一辈子能跳25亿次！", difficulty: "easy", faction: "body", cardId: "heart_engine" },
  { q: "心脏脱离身体后能继续跳动吗？", options: ["不能", "能，有自己的电信号系统", "只能跳1秒", "要看温度"], answer: 1, fact: "心脏有自己的\"发电站\"（窦房结），脱离身体也能继续跳一小会儿！", difficulty: "hard", faction: "body", cardId: "heart_engine" },
  { q: "心脏在身体的哪一侧？", options: ["正中间", "偏左", "偏右", "每个人不一样"], answer: 1, fact: "心脏略偏向左侧，这就是为什么你把手放在左胸能感受到心跳！", difficulty: "easy", faction: "body", cardId: "heart_engine" },
  { q: "心脏泵出的血液如果接成线能绕地球多少圈？", options: ["半圈", "1圈", "2圈半", "10圈"], answer: 2, fact: "心脏一生泵送约2亿升血液，所有血管接成线能绕地球两圈半！", difficulty: "medium", faction: "body", cardId: "heart_engine" },

  // 🧬 人体系补充
  { q: "人一天产生多少口水（唾液）？", options: ["一小杯", "约1升", "约5升", "几乎不产生"], answer: 1, fact: "人每天大约产生1-1.5升唾液！唾液里有消化酶，还能杀灭部分口腔细菌。", difficulty: "easy", faction: "body", cardId: "stomach_acid" },
  { q: "打哈欠会传染吗？", options: ["不会", "会，看到别人打就想打", "只有家人之间会", "只有生病时才会"], answer: 1, fact: "打哈欠确实会\"传染\"！看到或听到别人打哈欠就会想打，科学家认为这可能和共情能力有关。", difficulty: "easy", faction: "body", cardId: "neuron_messenger" },
  { q: "人的身体里有多少根血管？", options: ["几百根", "几千根", "接起来能绕地球好几圈", "和骨头一样多"], answer: 2, fact: "人体所有血管加起来总长约10万公里，能绕地球两圈半！从大动脉到微毛细血管遍布全身。", difficulty: "medium", faction: "body", cardId: "heart_engine" },
  { q: "人能几天不喝水？", options: ["1天", "大约3天", "一周", "一个月"], answer: 1, fact: "人大约只能3天不喝水就会有生命危险！水对所有身体机能都至关重要。", difficulty: "easy", faction: "body", cardId: "red_blood_cell" },
  { q: "眨眼的速度有多快？", options: ["1秒", "0.3-0.4秒", "0.01秒", "5秒"], answer: 1, fact: "一次眨眼只需要0.3-0.4秒！人每分钟大约眨眼15-20次，一天眨眼约1万5千次。", difficulty: "medium", faction: "body", cardId: "neuron_messenger" },
  { q: "人的味蕾能分辨几种基本味道？", options: ["2种", "4种", "5种", "10种"], answer: 2, fact: "人的味蕾能分辨5种基本味道：甜、咸、酸、苦、鲜（umami）！鲜味是日本科学家发现的。", difficulty: "medium", faction: "body", cardId: "stomach_acid" },
  { q: "人的指纹是独一无二的吗？", options: ["不是，很多人一样", "是的，每个人都不同", "双胞胎一样", "长大后会变"], answer: 1, fact: "每个人的指纹都是独一无二的！即使是同卵双胞胎也有不同的指纹。指纹在胎儿时期就形成了。", difficulty: "easy", faction: "body", cardId: "skin_barrier" },
  { q: "骨折后骨头能自己长好吗？", options: ["不能，必须换新骨头", "能，骨头会自己愈合", "只有小孩能", "只能用石膏粘住"], answer: 1, fact: "骨头有强大的自愈能力！骨折后身体会派出特殊的骨细胞来修复裂缝，通常6-8周就能长好。", difficulty: "easy", faction: "body", cardId: "skeleton_frame" },

  // ============================================================
  // 🦠 病原系 (pathogen) — 44题
  // ============================================================

  { q: "为什么每年需要重新打流感疫苗？", options: ["疫苗会过期", "身体会忘记", "病毒会变异", "医生要赚钱"], answer: 2, fact: "流感病毒变异速度极快，每年都在\"换衣服\"，所以免疫系统认不出它！", difficulty: "easy", faction: "pathogen", cardId: "flu_virus" },
  { q: "流感病毒的大小大约是多少？", options: ["和沙粒一样大", "用放大镜能看到", "比头发丝细1000倍", "和红细胞一样大"], answer: 2, fact: "流感病毒直径只有约100纳米，比头发丝细1000倍！", difficulty: "medium", faction: "pathogen", cardId: "flu_virus" },
  { q: "打喷嚏时飞沫能飞多远？", options: ["30厘米", "1米", "可以飞到8米远", "只在鼻子附近"], answer: 2, fact: "打喷嚏时飞沫速度可达160公里/时，能飞到8米远！", difficulty: "medium", faction: "pathogen", cardId: "flu_virus" },
  { q: "病毒和细菌有什么区别？", options: ["没区别", "病毒更大", "病毒不能自己繁殖，要寄生在细胞里", "细菌是好的病毒是坏的"], answer: 2, fact: "病毒不是细胞，不能自己繁殖——必须入侵活细胞才能复制自己。细菌是独立细胞。", difficulty: "medium", faction: "pathogen", cardId: "flu_virus" },
  { q: "抗生素能杀死病毒吗？", options: ["能", "不能", "有时候能", "只能杀死大病毒"], answer: 1, fact: "抗生素只能杀细菌，对病毒完全无效！所以感冒吃抗生素没用。", difficulty: "easy", faction: "pathogen", cardId: "flu_virus" },

  { q: "蛀牙是怎么形成的？", options: ["虫子咬的", "细菌产生酸侵蚀牙齿", "牙齿自然老化", "喝水太多"], answer: 1, fact: "蛀牙菌吃糖后会\"吐酸水\"，持续侵蚀牙齿的珐琅质形成蛀洞！", difficulty: "easy", faction: "pathogen", cardId: "cavity_bacteria" },
  { q: "人的嘴巴里大约有多少种细菌？", options: ["10种", "70种", "700种", "7000种"], answer: 2, fact: "人的口腔里住着超过700种细菌！大部分是无害的。", difficulty: "hard", faction: "pathogen", cardId: "cavity_bacteria" },
  { q: "为什么吃完甜食要刷牙？", options: ["让牙齿变白", "不让细菌有糖吃", "甜食有毒", "让口气清新"], answer: 1, fact: "蛀牙菌最爱吃糖！刷牙清除食物残渣，不给蛀牙菌产酸的机会。", difficulty: "easy", faction: "pathogen", cardId: "cavity_bacteria" },

  { q: "狂犬病毒感染后不打疫苗，致死率是多少？", options: ["10%", "50%", "80%", "几乎100%"], answer: 3, fact: "狂犬病一旦发病致死率几乎100%！但及时打疫苗就能预防。", difficulty: "medium", faction: "pathogen", cardId: "rabies_virus" },
  { q: "狂犬病毒是怎么到达大脑的？", options: ["通过血液", "沿着神经爬过去", "通过淋巴", "直接穿过头骨"], answer: 1, fact: "狂犬病毒不走血液，沿着外周神经一路\"爬\"到大脑！", difficulty: "hard", faction: "pathogen", cardId: "rabies_virus" },
  { q: "狂犬病毒为什么让动物变得爱咬人？", options: ["纯属巧合", "控制大脑让宿主有攻击性以传播病毒", "让动物肚子饿", "动物本来就爱咬人"], answer: 1, fact: "狂犬病毒感染大脑后让宿主变得暴躁爱咬人，病毒就能通过唾液传给下一个受害者——这是病毒的\"生存策略\"！", difficulty: "hard", faction: "pathogen", cardId: "rabies_virus" },

  { q: "大肠杆菌多久能分裂一次？", options: ["20分钟", "2小时", "1天", "1周"], answer: 0, fact: "大肠杆菌每20分钟分裂一次，8小时后理论上可以变成1700万个！", difficulty: "medium", faction: "pathogen", cardId: "ecoli_thug" },
  { q: "大肠杆菌对人体一定有害吗？", options: ["全部有害", "大部分是有益的", "只在冬天有害", "只对小孩有害"], answer: 1, fact: "大部分大肠杆菌是有益的！帮你消化食物和制造维生素K。", difficulty: "easy", faction: "pathogen", cardId: "ecoli_thug" },
  { q: "你的肠道里大约住着多少个细菌？", options: ["几百个", "几百万个", "几十亿个", "几万亿个"], answer: 3, fact: "肠道里住着大约38万亿个细菌！比你全身的人体细胞还多。", difficulty: "medium", faction: "pathogen", cardId: "ecoli_thug" },

  { q: "绦虫最长能长到多少米？", options: ["1米", "5米", "10米", "20米"], answer: 3, fact: "绦虫最长能到20米——比一辆公交车还长！", difficulty: "medium", faction: "pathogen", cardId: "tapeworm_lurker" },
  { q: "绦虫有自己的消化系统吗？", options: ["有", "没有", "只有胃没有肠", "只有幼虫有"], answer: 1, fact: "绦虫完全没有消化系统！直接通过体表吸收宿主已消化的营养。", difficulty: "hard", faction: "pathogen", cardId: "tapeworm_lurker" },

  { q: "噬菌体是什么？", options: ["一种细菌", "专门吃细菌的病毒", "一种药物", "一种白细胞"], answer: 1, fact: "噬菌体是专门感染并杀死细菌的病毒！像微型登月飞船。", difficulty: "easy", faction: "pathogen", cardId: "bacteriophage_killer" },
  { q: "一个噬菌体能从一个细菌里释放多少个后代？", options: ["2个", "20个", "200个", "2000个"], answer: 2, fact: "一个细菌可以释放约200个新的噬菌体！", difficulty: "hard", faction: "pathogen", cardId: "bacteriophage_killer" },
  { q: "噬菌体长得像什么？", options: ["圆球", "长条", "微型登月飞船", "星星"], answer: 2, fact: "噬菌体有多面体头部、管状尾巴和像脚的纤维，看起来像微型登月飞船！", difficulty: "easy", faction: "pathogen", cardId: "bacteriophage_killer" },
  { q: "科学家正在研究用噬菌体来做什么？", options: ["做食物", "代替抗生素杀菌", "发电", "做衣服"], answer: 1, fact: "科学家正在研究用噬菌体精准杀灭特定细菌，叫\"噬菌体疗法\"！", difficulty: "hard", faction: "pathogen", cardId: "bacteriophage_killer" },
  { q: "地球上数量最多的生物是什么？", options: ["蚂蚁", "细菌", "噬菌体（病毒）", "人类"], answer: 2, fact: "噬菌体是地球上数量最多的生物实体！估计有10的31次方个。", difficulty: "hard", faction: "pathogen", cardId: "bacteriophage_killer" },

  { q: "疟疾是通过什么传播的？", options: ["空气", "水", "蚊子叮咬", "食物"], answer: 2, fact: "疟原虫通过蚊子叮咬传播，钻进红细胞里\"安家\"！", difficulty: "easy", faction: "pathogen", cardId: "plasmodium_parasite" },
  { q: "疟疾在人类历史上造成了什么影响？", options: ["没什么影响", "杀死的人比所有战争都多", "只影响了非洲", "100年前就消灭了"], answer: 1, fact: "疟疾杀死的人估计比所有战争加起来还多！至今每年仍有数十万人死于疟疾。", difficulty: "medium", faction: "pathogen", cardId: "plasmodium_parasite" },

  { q: "肉毒杆菌的毒素还被用来做什么？", options: ["做饭调味", "美容除皱", "治疗感冒", "制作疫苗"], answer: 1, fact: "肉毒毒素（Botox）微量注射可以消除皱纹！用多了是毒药，用少了是药物。", difficulty: "hard", faction: "pathogen", cardId: "botulinum_chef" },
  { q: "肉毒毒素比眼镜蛇毒强多少倍？", options: ["10倍", "1000倍", "一百万倍", "一样强"], answer: 2, fact: "肉毒毒素比眼镜蛇毒强约一百万倍！1克就能杀死100万人。", difficulty: "hard", faction: "pathogen", cardId: "botulinum_chef" },
  { q: "肉毒毒素是怎么让肌肉麻痹的？", options: ["破坏肌肉细胞", "阻断神经信号", "让血管堵塞", "冻住细胞"], answer: 1, fact: "肉毒毒素阻断神经末梢释放乙酰胆碱，让肌肉收不到\"动\"的信号。", difficulty: "hard", faction: "pathogen", cardId: "botulinum_chef" },

  { q: "艾滋病毒主要攻击什么细胞？", options: ["红细胞", "神经细胞", "辅助T细胞", "骨骼细胞"], answer: 2, fact: "HIV专门攻击辅助T细胞，就像小偷专门打警察！", difficulty: "medium", faction: "pathogen", cardId: "hiv_hunter" },
  { q: "现在有办法治疗艾滋病吗？", options: ["完全无法治疗", "有药物可以控制", "只能活一年", "吃中药就好"], answer: 1, fact: "现代抗病毒药物已经能让感染者像健康人一样生活很多年！", difficulty: "medium", faction: "pathogen", cardId: "hiv_hunter" },

  { q: "新冠病毒为什么叫\"冠状\"病毒？", options: ["发现者姓冠", "形状像皇冠", "最先在冠县发现", "会导致冠心病"], answer: 1, fact: "表面凸起像皇冠，在电子显微镜下看起来像戴了一顶皇冠！", difficulty: "easy", faction: "pathogen", cardId: "covid_invader" },
  { q: "新冠病毒用什么\"钥匙\"打开细胞的\"门锁\"？", options: ["核酸", "刺突蛋白", "外壳", "尾巴"], answer: 1, fact: "刺突蛋白与人体细胞ACE2受体结合，就像钥匙开锁一样入侵细胞！", difficulty: "hard", faction: "pathogen", cardId: "covid_invader" },
  { q: "mRNA疫苗是怎么对抗新冠的？", options: ["直接杀死病毒", "教身体认识刺突蛋白的样子", "增强体力", "把病毒冻住"], answer: 1, fact: "mRNA疫苗让细胞临时生产刺突蛋白\"样品\"，免疫系统学会识别后就能快速反击真病毒！", difficulty: "hard", faction: "pathogen", cardId: "covid_invader" },
  { q: "新冠病毒有多小？", options: ["肉眼能看到", "显微镜能看到", "只有电子显微镜能看到", "和细菌一样大"], answer: 2, fact: "新冠病毒直径只有约0.1微米，比头发丝细1000倍！", difficulty: "easy", faction: "pathogen", cardId: "covid_invader" },

  // 🦠 病原系补充
  { q: "病毒有多大？", options: ["和细胞一样大", "比细菌小很多", "肉眼可见", "和红细胞一样大"], answer: 1, fact: "病毒比细菌小得多！一般只有20-300纳米，必须用电子显微镜才能看到。", difficulty: "easy", faction: "pathogen", cardId: "flu_virus" },
  { q: "感冒和流感是一回事吗？", options: ["是的", "不是，流感更严重", "感冒比流感严重", "一样的，叫法不同"], answer: 1, fact: "普通感冒和流感是不同的病毒引起的！流感症状更重、更危险，特别是对老人和小孩。", difficulty: "easy", faction: "pathogen", cardId: "flu_virus" },
  { q: "细菌在什么温度下繁殖最快？", options: ["0°C", "20-40°C", "100°C", "零下10°C"], answer: 1, fact: "大部分细菌在20-40°C之间繁殖最快！这就是为什么食物不能在室温下放太久。", difficulty: "medium", faction: "pathogen", cardId: "ecoli_thug" },
  { q: "绦虫是怎么传播给人的？", options: ["通过空气", "通过没煮熟的肉", "通过握手", "通过蚊子"], answer: 1, fact: "绦虫主要通过吃了没有煮熟的肉类（特别是猪肉和牛肉）传播到人体！所以肉一定要煮熟。", difficulty: "easy", faction: "pathogen", cardId: "tapeworm_lurker" },
  { q: "蛀牙菌最喜欢什么食物？", options: ["蔬菜", "肉", "糖和甜食", "水"], answer: 2, fact: "蛀牙菌最爱糖！它们把糖变成酸来侵蚀你的牙齿，所以少吃糖多刷牙很重要。", difficulty: "easy", faction: "pathogen", cardId: "cavity_bacteria" },
  { q: "疟原虫在红细胞里做什么？", options: ["睡觉", "大量繁殖然后让红细胞爆炸", "帮红细胞运氧", "什么都不做"], answer: 1, fact: "疟原虫在红细胞里疯狂繁殖，把营养吃光后让红细胞\"爆炸\"，然后去入侵新的红细胞！", difficulty: "medium", faction: "pathogen", cardId: "plasmodium_parasite" },
  { q: "人被狗咬了之后应该怎么做？", options: ["涂口水就好", "马上去医院打疫苗", "等着看会不会发病", "吃抗生素"], answer: 1, fact: "被动物咬伤后应该立刻清洗伤口并去医院打狂犬疫苗！越早打越有效。", difficulty: "easy", faction: "pathogen", cardId: "rabies_virus" },
  { q: "大肠杆菌能帮人体制造什么维生素？", options: ["维生素A", "维生素C", "维生素K", "维生素D"], answer: 2, fact: "肠道里的有益大肠杆菌能帮你制造维生素K，这种维生素对血液凝固很重要！", difficulty: "hard", faction: "pathogen", cardId: "ecoli_thug" },
  { q: "噬菌体对人体有害吗？", options: ["非常有害", "对人体无害，只杀细菌", "有时有害", "会导致感冒"], answer: 1, fact: "噬菌体对人体完全无害！它们只感染细菌，是\"细菌的天敌\"，可能是未来对抗超级细菌的希望。", difficulty: "easy", faction: "pathogen", cardId: "bacteriophage_killer" },
  { q: "新冠病毒最初在哪一年被发现？", options: ["2017年", "2019年", "2020年", "2021年"], answer: 1, fact: "新冠病毒（SARS-CoV-2）最初在2019年底被发现，随后在2020年引发了全球大流行。", difficulty: "easy", faction: "pathogen", cardId: "covid_invader" },
  { q: "肉毒杆菌最容易在什么环境生长？", options: ["新鲜水果里", "密封的罐头等无氧环境", "干燥的沙漠", "冰箱里"], answer: 1, fact: "肉毒杆菌是厌氧菌，在密封的罐头、腊肉等缺氧环境中最容易生长！所以鼓胀的罐头绝对不能吃。", difficulty: "hard", faction: "pathogen", cardId: "botulinum_chef" },
  { q: "HIV病毒把自己的基因藏在哪里？", options: ["血液里", "宿主细胞的DNA里", "皮肤表面", "空气中"], answer: 1, fact: "HIV用逆转录酶把自己的RNA变成DNA，偷偷整合进宿主细胞的基因组里，所以极难被彻底清除！", difficulty: "hard", faction: "pathogen", cardId: "hiv_hunter" },

  // ============================================================
  // ⚗️ 科技系 (tech) — 44题
  // ============================================================

  { q: "创可贴是谁发明的？", options: ["爱迪生", "厄尔·迪克森", "弗莱明", "巴斯德"], answer: 1, fact: "创可贴是1920年厄尔·迪克森发明的，因为他太太总在厨房切到手！", difficulty: "medium", faction: "tech", cardId: "bandaid_helper" },
  { q: "创可贴是怎么帮助伤口愈合的？", options: ["涂了药水", "隔绝细菌保持湿润", "让伤口通风", "杀死细菌"], answer: 1, fact: "创可贴隔绝外界细菌并保持伤口湿润来加速愈合！", difficulty: "easy", faction: "tech", cardId: "bandaid_helper" },
  { q: "伤口应该保持干燥还是湿润？", options: ["越干越好", "保持适度湿润愈合更快", "泡在水里最好", "没有区别"], answer: 1, fact: "现代医学发现伤口在适度湿润环境下愈合更快！", difficulty: "medium", faction: "tech", cardId: "bandaid_helper" },
  { q: "洗手能预防疾病的原理是什么？", options: ["水有魔力", "肥皂能破坏病菌的外壳", "冲走灰尘就行", "让手变白"], answer: 1, fact: "肥皂分子能\"撕开\"病毒和细菌的脂质外壳，配合流水冲走残骸——简单却极其有效！", difficulty: "medium", faction: "tech", cardId: "bandaid_helper" },

  { q: "人发烧其实是身体在做什么？", options: ["生病了坏了", "在\"开暖气\"对抗病菌", "体温计坏了", "吃太多了"], answer: 1, fact: "发烧是免疫系统升高体温来对抗病菌，因为大部分细菌在高温下会变弱！", difficulty: "easy", faction: "tech", cardId: "thermometer_alarm" },
  { q: "正常人体温大约是多少度？", options: ["35°C", "36.5-37°C", "38°C", "40°C"], answer: 1, fact: "正常人体温约36.5-37°C。超过37.3°C是低烧，超过38.5°C是高烧。", difficulty: "easy", faction: "tech", cardId: "thermometer_alarm" },
  { q: "最早的体温计是谁发明的？", options: ["牛顿", "伽利略", "爱迪生", "居里夫人"], answer: 1, fact: "最早的体温计原型是伽利略在1592年左右发明的，有一米多长！", difficulty: "hard", faction: "tech", cardId: "thermometer_alarm" },

  { q: "听诊器是因为什么原因被发明的？", options: ["想听心跳好玩", "医生觉得直接贴耳朵不礼貌", "军事需要", "给动物看病"], answer: 1, fact: "医生雷奈克需要听女病人心跳，直接贴耳朵太不礼貌，就卷了一筒纸当传声筒！", difficulty: "medium", faction: "tech", cardId: "stethoscope_listener" },
  { q: "听诊器是哪一年发明的？", options: ["1616年", "1716年", "1816年", "1916年"], answer: 2, fact: "听诊器由法国医生雷奈克在1816年发明，至今已有200多年历史！", difficulty: "hard", faction: "tech", cardId: "stethoscope_listener" },

  { q: "X光是谁发现的？", options: ["爱因斯坦", "牛顿", "伦琴", "居里夫人"], answer: 2, fact: "伦琴在1895年发现X射线，获得第一届诺贝尔物理学奖！", difficulty: "medium", faction: "tech", cardId: "xray_vision" },
  { q: "X光为什么叫\"X\"光？", options: ["发现者姓X", "形状像X", "因为不知道它是什么", "从X星球来的"], answer: 2, fact: "伦琴不知道这种射线是什么，就用代表未知数的\"X\"来命名！", difficulty: "easy", faction: "tech", cardId: "xray_vision" },
  { q: "伦琴太太看到自己手的X光片时说了什么？", options: ["太酷了", "我看到了自己的死亡", "再拍一张", "这是假的"], answer: 1, fact: "伦琴太太看到X光片上的手骨和戒指时说\"我看到了自己的死亡\"！", difficulty: "medium", faction: "tech", cardId: "xray_vision" },
  { q: "CT扫描和X光有什么区别？", options: ["没区别", "CT是多角度拍X光组合成3D图像", "CT用超声波", "X光更先进"], answer: 1, fact: "CT扫描是从身体周围多个角度拍摄X光，用计算机组合成3D图像！", difficulty: "hard", faction: "tech", cardId: "xray_vision" },

  { q: "第一个用显微镜看到细菌的人是谁？", options: ["伽利略", "牛顿", "列文虎克", "巴斯德"], answer: 2, fact: "列文虎克是荷兰布料商人，自己磨镜片做了几百台显微镜！", difficulty: "medium", faction: "tech", cardId: "microscope_eye" },
  { q: "列文虎克的职业是什么？", options: ["科学家", "医生", "布料商人", "教授"], answer: 2, fact: "列文虎克不是科学家而是布料商人！检查布料纤维时意外发现了微生物。", difficulty: "hard", faction: "tech", cardId: "microscope_eye" },
  { q: "列文虎克管他看到的微生物叫什么？", options: ["细菌", "病毒", "小动物", "微生物"], answer: 2, fact: "列文虎克把微生物叫做\"小动物\"（animalcules），因为当时还没有\"细菌\"这个词！", difficulty: "hard", faction: "tech", cardId: "microscope_eye" },

  { q: "在麻醉药发明之前，做手术时病人怎么办？", options: ["吃止痛药", "清醒着忍痛", "用针灸", "睡着了再做"], answer: 1, fact: "在麻醉药发明之前做手术简直像酷刑！病人只能咬住皮带或灌醉。", difficulty: "easy", faction: "tech", cardId: "anesthesia_fog" },
  { q: "科学家完全搞清楚麻醉药的工作原理了吗？", options: ["完全搞清楚了", "还没有完全搞清楚", "不需要搞清楚", "100年前就搞清楚了"], answer: 1, fact: "到今天科学家还没完全搞清楚麻醉药为什么能让人失去意识！", difficulty: "hard", faction: "tech", cardId: "anesthesia_fog" },
  { q: "现代麻醉是哪一年公开演示成功的？", options: ["1746年", "1846年", "1946年", "1646年"], answer: 1, fact: "1846年牙医莫顿公开用乙醚麻醉病人并成功拔牙，从此手术进入无痛时代！", difficulty: "hard", faction: "tech", cardId: "anesthesia_fog" },

  { q: "青霉素是怎么被发现的？", options: ["精心实验设计的", "不小心发现的", "从植物里提取的", "从海洋中找到的"], answer: 1, fact: "弗莱明度假回来发现实验皿上霉菌周围的细菌全死了——这个\"偷懒\"的意外拯救了几亿人！", difficulty: "easy", faction: "tech", cardId: "penicillin_pioneer" },
  { q: "青霉素是怎么杀死细菌的？", options: ["毒死细菌", "破坏细菌的细胞壁", "把细菌冻死", "让细菌饿死"], answer: 1, fact: "青霉素破坏细菌的细胞壁，没有细胞壁的细菌就像没有壳的鸡蛋会裂开！", difficulty: "hard", faction: "tech", cardId: "penicillin_pioneer" },
  { q: "青霉素是从什么东西里发现的？", options: ["树皮", "霉菌", "海水", "泥土"], answer: 1, fact: "青霉素来自青霉菌——一种常见的霉菌！", difficulty: "easy", faction: "tech", cardId: "penicillin_pioneer" },
  { q: "为什么很多医学发现都是\"意外\"？", options: ["科学家都很粗心", "科学需要好奇心去发现意外中的规律", "纯属巧合", "课本编的"], answer: 1, fact: "青霉素、X光、疫苗……只有有准备的头脑才能认出意外中隐藏的重大发现！", difficulty: "medium", faction: "tech", cardId: "penicillin_pioneer" },

  { q: "疫苗的工作原理是什么？", options: ["直接杀死病毒", "给免疫系统做\"模拟训练\"", "增强体力", "修复受损细胞"], answer: 1, fact: "疫苗把弱化的病菌送进身体让白细胞练习打仗！", difficulty: "easy", faction: "tech", cardId: "vaccine_trainer" },
  { q: "人类用疫苗消灭的第一种传染病是什么？", options: ["流感", "天花", "疟疾", "麻疹"], answer: 1, fact: "天花在1980年被彻底消灭，是人类消灭的第一种传染病！", difficulty: "medium", faction: "tech", cardId: "vaccine_trainer" },
  { q: "谁发明了最早的疫苗？", options: ["弗莱明", "巴斯德", "爱德华·詹纳", "列文虎克"], answer: 2, fact: "英国医生爱德华·詹纳在1796年用牛痘接种预防天花，被称为\"免疫学之父\"！", difficulty: "medium", faction: "tech", cardId: "vaccine_trainer" },
  { q: "\"疫苗\"这个词来源于什么动物？", options: ["鸡", "牛", "马", "羊"], answer: 1, fact: "\"vaccine\"来自拉丁语\"vacca\"（牛），因为最早的疫苗是用牛痘病毒来预防天花！", difficulty: "hard", faction: "tech", cardId: "vaccine_trainer" },
  { q: "诺贝尔生理学或医学奖颁给最多哪个领域？", options: ["外科手术", "疫苗和传染病", "心脏研究", "癌症研究"], answer: 1, fact: "传染病和免疫学领域获诺贝尔奖次数最多，因为拯救了最多人的生命！", difficulty: "hard", faction: "tech", cardId: "vaccine_trainer" },

  { q: "是谁让手术变得安全的？", options: ["伽利略", "李斯特", "达芬奇", "弗莱明"], answer: 1, fact: "李斯特医生发明无菌手术，把手术致死率从近50%降到不足1%！", difficulty: "medium", faction: "tech", cardId: "scalpel_blade" },
  { q: "古代最快的外科医生能多快截肢？", options: ["1分钟", "28秒", "5分钟", "10分钟"], answer: 1, fact: "没有麻醉的年代最快记录是28秒完成一次截肢！因为病人太痛苦了。", difficulty: "medium", faction: "tech", cardId: "scalpel_blade" },
  { q: "现在最精密的\"手术刀\"是什么？", options: ["钻石刀", "激光刀", "陶瓷刀", "超声刀"], answer: 1, fact: "激光手术刀能做到比头发丝还细的切口！", difficulty: "medium", faction: "tech", cardId: "scalpel_blade" },
  { q: "世界上第一个使用消毒的医生是谁？", options: ["弗莱明", "塞麦尔维斯", "李斯特", "詹纳"], answer: 1, fact: "匈牙利医生塞麦尔维斯1847年发现让医生洗手能大幅降低产妇死亡率，但当时几乎没人信他！", difficulty: "hard", faction: "tech", cardId: "scalpel_blade" },

  { q: "为什么医生说\"不要随便吃抗生素\"？", options: ["太贵了", "味道不好", "会让细菌产生耐药性", "会让人上瘾"], answer: 2, fact: "过度使用抗生素会让细菌\"学会\"抵抗，变成\"超级细菌\"！", difficulty: "easy", faction: "tech", cardId: "antibiotic_ultimate" },
  { q: "\"超级细菌\"是什么意思？", options: ["特别大的细菌", "对多种抗生素都耐药的细菌", "能让人变超人的细菌", "超级有益的细菌"], answer: 1, fact: "超级细菌是对多种抗生素都产生耐药性的细菌，是21世纪最严峻的公共卫生危机之一！", difficulty: "medium", faction: "tech", cardId: "antibiotic_ultimate" },
  { q: "感冒了应该吃抗生素吗？", options: ["应该", "不应该，感冒是病毒引起的", "看心情", "吃一半就行"], answer: 1, fact: "普通感冒是病毒引起的，抗生素只能杀细菌不能杀病毒！", difficulty: "easy", faction: "tech", cardId: "antibiotic_ultimate" },

  // ⚗️ 科技系补充
  { q: "温度计里的红色液体是什么？", options: ["血液", "酒精（染了色）", "水银", "番茄酱"], answer: 1, fact: "现代温度计里的红色液体通常是染了色的酒精！以前用的水银有毒，现在很少用了。", difficulty: "easy", faction: "tech", cardId: "thermometer_alarm" },
  { q: "听诊器能听到什么声音？", options: ["只能听心跳", "心跳、呼吸和肠道蠕动", "只能听说话", "什么都能听到"], answer: 1, fact: "听诊器能听到心跳、呼吸音和肠道蠕动声！医生通过这些声音来判断你的身体状况。", difficulty: "easy", faction: "tech", cardId: "stethoscope_listener" },
  { q: "显微镜能放大多少倍？", options: ["2倍", "100倍", "光学显微镜可达2000倍", "无限大"], answer: 2, fact: "光学显微镜最高约2000倍，电子显微镜可达200万倍！能看到原子级别的细节。", difficulty: "medium", faction: "tech", cardId: "microscope_eye" },
  { q: "X光对人体有害吗？", options: ["完全无害", "有微量辐射，但偶尔拍没事", "非常危险", "只对小孩有害"], answer: 1, fact: "X光有微量辐射，但偶尔拍一次完全没问题！医生会控制剂量，收益远大于风险。", difficulty: "easy", faction: "tech", cardId: "xray_vision" },
  { q: "手术前为什么医生要洗手那么久？", options: ["手很脏", "消灭手上所有细菌防止感染", "医院规定", "让手变软"], answer: 1, fact: "外科手术前医生要用消毒液洗手至少3-5分钟！这叫\"外科洗手\"，能消灭99.9%的细菌。", difficulty: "easy", faction: "tech", cardId: "scalpel_blade" },
  { q: "世界上第一种抗生素是什么？", options: ["阿莫西林", "青霉素", "头孢", "红霉素"], answer: 1, fact: "青霉素是世界上第一种广泛使用的抗生素！1928年发现，二战中拯救了无数士兵的生命。", difficulty: "easy", faction: "tech", cardId: "penicillin_pioneer" },
  { q: "麻醉有几种类型？", options: ["只有全身麻醉", "全身麻醉和局部麻醉", "只有局部麻醉", "没有分类"], answer: 1, fact: "麻醉分为全身麻醉（完全失去意识）和局部麻醉（只是某个部位没有感觉）。拔牙打的就是局部麻醉！", difficulty: "medium", faction: "tech", cardId: "anesthesia_fog" },
  { q: "创可贴是哪一年发明的？", options: ["1820年", "1920年", "1970年", "2000年"], answer: 1, fact: "创可贴是1920年发明的，至今已有100多年历史！是家庭急救箱里最基本的用品。", difficulty: "medium", faction: "tech", cardId: "bandaid_helper" },
  { q: "疫苗打到身体哪里？", options: ["胃里", "肌肉或皮下", "直接进血管", "涂在皮肤上"], answer: 1, fact: "大部分疫苗是注射到肌肉或皮下！这样免疫细胞能更好地接触到疫苗中的抗原并产生免疫反应。", difficulty: "easy", faction: "tech", cardId: "vaccine_trainer" },
  { q: "为什么有些抗生素要\"吃完整个疗程\"？", options: ["多吃更健康", "不吃完细菌杀不干净会反弹", "医生多赚钱", "药物会过期"], answer: 1, fact: "如果抗生素没吃完就停药，残留的细菌可能是最强壮的那些——它们会繁殖出更耐药的后代！", difficulty: "medium", faction: "tech", cardId: "antibiotic_ultimate" },
]

// 已出过的题目索引（避免重复）
const usedIndices = new Set()

/**
 * 智能出题
 * - 优先选与当前战斗卡牌 cardId 匹配的题
 * - 按难度筛选（连续答对3题升 medium，5题升 hard）
 * - 避免重复出题（题库用完自动重置）
 *
 * @param {Object} opts
 * @param {string[]} opts.battleCardIds - 当前战场上双方所有卡牌的 id
 * @param {number}   opts.streak        - 连续答对次数
 */
export function getRandomQuiz({ battleCardIds = [], streak = 0 } = {}) {
  // 难度升级
  let targetDifficulty = 'easy'
  if (streak >= 5) targetDifficulty = 'hard'
  else if (streak >= 3) targetDifficulty = 'medium'

  // 题库用完时重置
  if (usedIndices.size >= quizzes.length) usedIndices.clear()

  // 可用题目
  const available = quizzes
    .map((q, i) => ({ ...q, _idx: i }))
    .filter(q => !usedIndices.has(q._idx))

  // 按匹配度和难度分层
  const matchAndDiff = available.filter(q => battleCardIds.includes(q.cardId) && q.difficulty === targetDifficulty)
  const matchOnly    = available.filter(q => battleCardIds.includes(q.cardId))
  const diffOnly     = available.filter(q => q.difficulty === targetDifficulty)

  // 优先级：关联卡+匹配难度 > 关联卡 > 匹配难度 > 全随机
  const pool = matchAndDiff.length > 0 ? matchAndDiff
             : matchOnly.length > 0   ? matchOnly
             : diffOnly.length > 0    ? diffOnly
             : available

  const picked = pool[Math.floor(Math.random() * pool.length)]
  usedIndices.add(picked._idx)

  // 返回统一格式（兼容 QuizModal 和 answerQuiz）
  return {
    question: picked.q,
    options:  picked.options,
    correct:  picked.answer,
    fact:     picked.fact,
    difficulty: picked.difficulty,
    faction:   picked.faction,
    cardId:    picked.cardId,
  }
}

/**
 * 重置已出题记录（新一局时调用）
 */
export function resetQuizHistory() {
  usedIndices.clear()
}
