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

  // ============================================================
  // Sprint 32 Step 2 — 基础题 (memorization, easy) 35 题
  // 覆盖 33 张完全无题的卡 + 2 张缺基础题的卡 (antibody_missile / microscope_eye)
  // ============================================================

  // — 🦠 病原系 (1 题) —
  { q: "天花是怎么被人类彻底消灭的？", options: ["靠抗生素", "靠疫苗接种", "靠隔离病人", "病毒自己消失了"], answer: 1, fact: "天花是人类唯一完全消灭的传染病——靠的就是疫苗！1980 年世界卫生组织宣布天花被根除。", difficulty: "easy", faction: "pathogen", cardId: "smallpox_ghost", type: "memorization", tags: ["ch2","vaccine"] },

  // — 🧬 人体系 (18 题) —
  { q: "眼泪里有什么神奇的物质能保护眼睛？", options: ["糖水", "溶菌酶", "盐水", "维生素"], answer: 1, fact: "眼泪里含有溶菌酶，能杀死细菌保护眼睛——这就是为什么眼睛暴露在空气中却很少感染！", difficulty: "easy", faction: "body", cardId: "tear_drop_lysozyme", type: "memorization", tags: ["ch2","immune"] },
  { q: "睫毛除了好看还有什么作用？", options: ["保暖", "挡住灰尘保护眼睛", "调节视力", "只是装饰"], answer: 1, fact: "睫毛像小刷子一样挡住灰尘和小颗粒，是眼睛的第一道防线！", difficulty: "easy", faction: "body", cardId: "eyelash_interceptor", type: "memorization", tags: ["ch2","barrier"] },
  { q: "为什么天热的时候人会出汗？", options: ["排出毒素", "给身体降温", "补充水分", "消耗能量"], answer: 1, fact: "汗水蒸发时会带走身体的热量，就像给身体装了空调——这是人体最重要的降温方式！", difficulty: "easy", faction: "body", cardId: "sweat_gland_cooler", type: "memorization", tags: ["ch2","homeostasis"] },
  { q: "把小肠内壁的所有绒毛展开铺平，面积有多大？", options: ["像一张桌子", "像一个房间", "像一个网球场", "像一个游泳池"], answer: 2, fact: "小肠内壁有数百万个微小的绒毛，全部展开铺平的面积相当于一个网球场——专门用来吸收营养！", difficulty: "easy", faction: "body", cardId: "small_intestine_absorber", type: "memorization", tags: ["ch2","digestive"] },
  { q: "生病时脖子上摸到肿起来的小疙瘩是什么？", options: ["肌肉打结了", "淋巴结在战斗", "皮肤过敏", "上火"], answer: 1, fact: "脖子上肿起来的小疙瘩是淋巴结！它是免疫系统的'过滤器'和'军事基地'，正在帮你打败细菌。", difficulty: "easy", faction: "body", cardId: "lymph_node_filter", type: "memorization", tags: ["ch2","immune"] },
  { q: "肾脏主要做什么工作？", options: ["消化食物", "过滤血液中的废物", "造血", "储存能量"], answer: 1, fact: "两个肾脏每天要过滤 180 升血液——相当于把全身的血过滤 40 遍！它是身体的'净化工厂'。", difficulty: "easy", faction: "body", cardId: "kidney_filter", type: "memorization", tags: ["ch2","filtration"] },
  { q: "你身体里的血细胞是哪里制造的？", options: ["心脏", "肝脏", "骨髓", "肺"], answer: 2, fact: "骨头里面不是空的！骨髓每秒钟能制造几百万个新的血细胞，是身体的'造血工厂'。", difficulty: "easy", faction: "body", cardId: "bone_marrow_forge", type: "memorization", tags: ["ch2","hematopoiesis"] },
  { q: "干细胞为什么被叫做'万能细胞'？", options: ["数量最多", "能变成各种不同的细胞", "活得最久", "最大"], answer: 1, fact: "干细胞还没有决定要变成什么，可以变成心脏细胞、神经细胞、血细胞……所以被叫做'万能细胞'！", difficulty: "easy", faction: "body", cardId: "stem_cell_morph", type: "memorization", tags: ["ch2","stem_cell"] },
  { q: "肝脏有一个其他器官都没有的神奇能力，是什么？", options: ["能跳动", "能再生(切掉一半能长回来)", "能发热", "能呼吸"], answer: 1, fact: "肝脏切掉一半后，几个月就能长回来！这是人体器官里独一无二的再生能力。", difficulty: "easy", faction: "body", cardId: "liver_detox", type: "memorization", tags: ["ch2","regeneration"] },
  { q: "树突细胞在免疫系统里扮演什么角色？", options: ["主力战士", "侦察兵和情报员", "医生", "搬运工"], answer: 1, fact: "树突细胞是免疫系统的'侦察兵'！它们在全身巡逻，发现入侵者后把敌人的'身份证'展示给 T 细胞。", difficulty: "easy", faction: "body", cardId: "dendrite_scout", type: "memorization", tags: ["ch2","immune"] },
  { q: "脾脏的主要工作是什么？", options: ["造新血", "回收老化的红血球", "消化食物", "调节体温"], answer: 1, fact: "脾脏负责'回收'老化的红血球——把里面的铁取出来送回骨髓，循环利用！", difficulty: "easy", faction: "body", cardId: "spleen_recycler", type: "memorization", tags: ["ch2","recycle"] },
  { q: "巨噬细胞是怎么对付入侵的细菌的？", options: ["分泌毒素", "整个吞进去消化掉", "用刺扎死", "围住饿死"], answer: 1, fact: "巨噬细胞像身体里的'吃豆人'——它们把细菌整个吞进去消化掉！一个巨噬细胞能吞掉上百个细菌。", difficulty: "easy", faction: "body", cardId: "macrophage_tank", type: "memorization", tags: ["ch2","immune","phagocytosis"] },
  { q: "如果细胞的 DNA 损伤修不好，会发生什么？", options: ["细胞继续活着", "细胞'自杀'保护身体", "细胞变得更大", "细胞分裂得更快"], answer: 1, fact: "如果 DNA 损伤修不好，细胞就会'自杀'（细胞凋亡）来保护身体——避免变成癌细胞。", difficulty: "easy", faction: "body", cardId: "dna_repair_crew", type: "memorization", tags: ["ch2","apoptosis"] },
  { q: "抗体是什么形状的？", options: ["圆形", "Y 形", "棒状", "螺旋形"], answer: 1, fact: "抗体是 Y 形的蛋白质，每种抗体只能识别一种特定的病原——人体能产生超过 10 亿种不同的抗体！", difficulty: "easy", faction: "body", cardId: "antibody_precision_ssr", type: "memorization", tags: ["ch2","immune","antibody"] },
  { q: "胸腺在免疫系统里像什么？", options: ["医院", "T 细胞的学校", "战场", "仓库"], answer: 1, fact: "胸腺是 T 细胞的'学校'！未成熟的 T 细胞在这里学习如何区分自己人和入侵者，淘汰率高达 95%！", difficulty: "easy", faction: "body", cardId: "thymus_academy", type: "memorization", tags: ["ch2","immune","training"] },
  { q: "线粒体在细胞里被称为什么？", options: ["细胞的发电站", "细胞的大脑", "细胞的胃", "细胞的家"], answer: 0, fact: "线粒体被称为'细胞的发电站'！它们把食物中的能量转化为 ATP，是细胞的'电池'。", difficulty: "easy", faction: "body", cardId: "mitochondria_powerhouse", type: "memorization", tags: ["ch2","energy"] },
  { q: "抗体最厉害的本领是什么？", options: ["跑得快", "能精确识别特定的病原体", "数量最多", "最大"], answer: 1, fact: "抗体是 Y 形蛋白质，每种抗体只能识别一种特定的病原体——非常精确，就像精确制导导弹！", difficulty: "easy", faction: "body", cardId: "antibody_missile", type: "memorization", tags: ["ch2","immune","antibody"] },

  // — ⚗️ 科技系 (16 题) —
  { q: "用肥皂洗手多少秒能去除 99% 的细菌？", options: ["5 秒", "20 秒", "60 秒", "5 分钟"], answer: 1, fact: "用肥皂洗手 20 秒能去除 99% 的细菌！洗手是预防传染病最简单有效的方法。", difficulty: "easy", faction: "tech", cardId: "hand_sanitizer", type: "memorization", tags: ["ch2","hygiene"] },
  { q: "N95 口罩能过滤掉多少比例的小颗粒？", options: ["50%", "70%", "95%", "100%"], answer: 2, fact: "N95 口罩能过滤 95% 的微小颗粒！戴口罩最大的作用是阻止你把病毒传给别人——保护别人就是保护自己。", difficulty: "easy", faction: "tech", cardId: "surgical_mask", type: "memorization", tags: ["ch2","prevention"] },
  { q: "纱布作为医疗用品有多古老？", options: ["50 年", "200 年", "1000 年", "4000 多年"], answer: 3, fact: "纱布是最古老的医疗用品之一，埃及人 4000 年前就在用了！", difficulty: "easy", faction: "tech", cardId: "bandage_wrap", type: "memorization", tags: ["ch2","history"] },
  { q: "阿司匹林最早是从哪里发现的？", options: ["蘑菇", "柳树皮", "海藻", "矿石"], answer: 1, fact: "阿司匹林来自柳树皮！100 多年前发明，至今仍是世界上用得最多的药之一。", difficulty: "easy", faction: "tech", cardId: "aspirin_pill", type: "memorization", tags: ["ch2","drug","history"] },
  { q: "一滴血能让医生检测出多少种身体信息？", options: ["1 种", "10 种", "几十种", "几百种"], answer: 3, fact: "一滴血就能检测出几百种信息：有没有感染、血糖高不高、肝肾功能好不好——验血是医生最快的诊断手段之一！", difficulty: "easy", faction: "tech", cardId: "blood_test_kit", type: "memorization", tags: ["ch2","diagnosis"] },
  { q: "你的肠道里大约住着多少个细菌？", options: ["几百个", "几千个", "几万个", "上万亿个"], answer: 3, fact: "你的肠道里住着上万亿个细菌——比全身的人体细胞还多！它们帮你消化食物、制造维生素。", difficulty: "easy", faction: "tech", cardId: "probiotics_ally", type: "memorization", tags: ["ch2","microbiome"] },
  { q: "PCR 检测仪在新冠疫情中起了什么作用？", options: ["治疗病人", "检测有没有感染病毒", "制造疫苗", "消毒"], answer: 1, fact: "PCR 是新冠检测的核心技术！它能把一小段 DNA 复制几百万份，让微量病毒无处藏身。", difficulty: "easy", faction: "tech", cardId: "pcr_machine", type: "memorization", tags: ["ch2","diagnosis","covid"] },
  { q: "机器人做手术的切口有多大？", options: ["几毫米", "几厘米", "十几厘米", "跟普通手术一样"], answer: 0, fact: "达芬奇手术机器人的切口只有几毫米大，比传统手术小得多——病人恢复也更快！", difficulty: "easy", faction: "tech", cardId: "robotic_surgery", type: "memorization", tags: ["ch2","surgery"] },
  { q: "除颤器（AED）是用来做什么的？", options: ["测心跳", "让停止的心脏重新跳动", "止血", "降温"], answer: 1, fact: "除颤器是真正的'救命神器'！心脏骤停后，每延迟 1 分钟使用 AED，存活率就下降 10%。", difficulty: "easy", faction: "tech", cardId: "defibrillator_restart", type: "memorization", tags: ["ch2","emergency"] },
  { q: "CT 扫描仪是怎么看到身体内部的？", options: ["用超声波", "绕着身体转一圈拍几百张 X 光片", "用磁场", "插一根管子进去"], answer: 1, fact: "CT 扫描仪绕着你转一圈，拍几百张 X 光片，然后电脑把这些'切片'拼成 3D 图像！", difficulty: "easy", faction: "tech", cardId: "ct_scanner_reveal", type: "memorization", tags: ["ch2","imaging"] },
  { q: "基因治疗是怎么治病的？", options: ["吃特殊的药", "用正确的基因替换有问题的基因", "做手术", "打疫苗"], answer: 1, fact: "基因治疗是用正确的基因替换有问题的基因——就像修改电脑程序里的 bug！", difficulty: "easy", faction: "tech", cardId: "gene_therapy_fix", type: "memorization", tags: ["ch2","genetics"] },
  { q: "透析机相当于人体的哪个器官？", options: ["心脏", "肝脏", "肾脏", "肺"], answer: 2, fact: "透析机就是'人工肾脏'！它把血液从身体里引出来，过滤掉废物和毒素，再送回去。", difficulty: "easy", faction: "tech", cardId: "dialysis_machine", type: "memorization", tags: ["ch2","artificial_organ"] },
  { q: "mRNA 疫苗跟传统疫苗最大的不同是什么？", options: ["打针更疼", "不用灭活病毒，给细胞发'指令'", "保存温度更高", "需要打更多次"], answer: 1, fact: "mRNA 疫苗不用灭活病毒，而是给身体发一条'指令'，让细胞自己制造病毒的一小部分蛋白质——免疫系统认识后就能对付真病毒了！", difficulty: "easy", faction: "tech", cardId: "mrna_vaccine", type: "memorization", tags: ["ch2","vaccine","mrna"] },
  { q: "纳米机器人比什么还小？", options: ["头发丝", "细胞", "灰尘", "蚂蚁"], answer: 1, fact: "纳米机器人是比细胞还小的微型机器！科学家正在研究让它们在血管里巡逻，精准找到癌细胞投放药物。", difficulty: "easy", faction: "tech", cardId: "nanobot_warrior", type: "memorization", tags: ["ch2","future_tech"] },
  { q: "CRISPR 在生物学里像什么工具？", options: ["放大镜", "DNA 的剪刀和胶水", "打印机", "计算器"], answer: 1, fact: "CRISPR 就像 DNA 的'剪刀'和'胶水'——能精确剪掉有问题的基因片段，换上正确的！2020 年获得诺贝尔化学奖。", difficulty: "easy", faction: "tech", cardId: "crispr_editor", type: "memorization", tags: ["ch2","genetics","nobel"] },
  { q: "AI 医生现在最擅长做什么？", options: ["做手术", "看医学影像、诊断疾病", "陪伴病人", "开药"], answer: 1, fact: "AI 已经在很多影像诊断上超越了人类医生——Google 的 AI 能在眼底照片中发现 50 多种眼病，准确率超过眼科专家！", difficulty: "easy", faction: "tech", cardId: "ai_doctor", type: "memorization", tags: ["ch2","ai"] },
  { q: "显微镜让我们能看到什么用眼睛看不见的东西？", options: ["远方的星星", "细菌、细胞等微小的东西", "颜色的变化", "声波"], answer: 1, fact: "显微镜让我们能看到细菌、细胞等用肉眼看不见的微观世界！没有显微镜就没有现代医学。", difficulty: "easy", faction: "tech", cardId: "microscope_eye", type: "memorization", tags: ["ch2","diagnosis"] },

  // ============================================================
  // Sprint 32 Step 4 — 机制题 (mechanism, medium) 36 题
  // 覆盖 33 张完全无题的卡 + 3 张缺机制题的卡（cavity_bacteria /
  // red_blood_cell / thermometer_alarm）。问"为什么/怎么工作"，
  // 错误选项是常见误解，principle 字段标根本原理。
  // ============================================================

  // — 🦠 病原系 (1 题) —
  { q: "为什么用'牛痘'就能预防'天花'？", options: ["因为牛痘比天花弱，身体轻松就能打赢", "因为两种病毒长得像，认识一个就认识另一个", "因为牛痘能在身体里产生'抗药基因'", "因为牛痘提前把天花病毒杀光，所以不发病"], answer: 1, fact: "牛痘和天花病毒的表面分子很相似！免疫系统认识了牛痘，就能识别并消灭真的天花——这是疫苗的核心原理（疫苗不是杀病毒，而是训练免疫系统）。", difficulty: "medium", faction: "pathogen", cardId: "smallpox_ghost", type: "mechanism", principle: "mechanism", tags: ["ch2","vaccine"] },

  // — 🧬 人体系 (16 题) —
  { q: "为什么眼睛暴露在空气里却很少感染？", options: ["因为眨眼太快，细菌还没来得及附着", "因为眼睛温度比身体其他地方低得多", "因为眼泪里的溶菌酶在持续杀死细菌", "因为眼皮一直在挡，细菌根本进不去"], answer: 2, fact: "眼泪不停冲洗眼球，里面的溶菌酶能破坏细菌的细胞壁——这是身体的'自动消毒系统'！眼皮和眨眼是物理辅助，关键还是溶菌酶在化学层面杀菌。", difficulty: "medium", faction: "body", cardId: "tear_drop_lysozyme", type: "mechanism", principle: "mechanism", tags: ["ch2","immune"] },
  { q: "睫毛为什么能保护眼睛？", options: ["像小刷子物理拦截灰尘和小颗粒", "因为它能感知风向，提前避开灰尘", "因为它分泌的油脂能杀死表面细菌", "因为它能自动弯曲，把灰尘弹开"], answer: 0, fact: "睫毛是物理屏障——异物碰到睫毛会触发条件反射的眨眼，把灰尘挡在眼外！睫毛不分泌杀菌油脂，也不会主动'感知'或'弯曲'，纯靠物理阻挡。", difficulty: "medium", faction: "body", cardId: "eyelash_interceptor", type: "mechanism", principle: "mechanism", tags: ["ch2","barrier"] },
  { q: "为什么出汗能让身体凉下来？", options: ["因为汗水蒸发时会从皮肤带走热量", "因为汗水比身体凉，流过皮肤就降温", "因为汗腺打开了，热气从毛孔散出去", "因为出汗多血液变稀，温度自然降低"], answer: 0, fact: "液体蒸发会吸热——汗水从皮肤蒸发时把热量带到空气里，就像给身体装了'天然空调'！汗水本身温度和体温几乎一样，关键在'蒸发'这一步。", difficulty: "medium", faction: "body", cardId: "sweat_gland_cooler", type: "mechanism", principle: "homeostasis", tags: ["ch2","cooling"] },
  { q: "小肠为什么要长出几百万根绒毛？", options: ["绒毛能像小手一样抓住营养颗粒", "绒毛把有限空间的吸收面积撑到最大", "绒毛能加快食物在肠道里的流动速度", "绒毛是用来挡住食物里的有害细菌"], answer: 1, fact: "肚子里装不下网球场那么大的肠子，但靠'绒毛+小绒毛'的折叠结构，吸收面积可以等于一个网球场！这是典型的'空间换效率'。", difficulty: "medium", faction: "body", cardId: "small_intestine_absorber", type: "mechanism", principle: "tradeoff", tags: ["ch2","digestive"] },
  { q: "为什么生病时淋巴结会肿起来？", options: ["因为感染让局部血管发炎而肿胀", "因为生病时血流变慢，血液淤积", "因为淋巴液被病菌堵塞，所以肿大", "因为大量免疫细胞聚集在那作战"], answer: 3, fact: "淋巴结是免疫'军事基地'——一打仗就会有大量 B 细胞、T 细胞涌入并增殖，体积就肿起来了！淋巴液没被堵，血流也没变慢，是免疫细胞增殖把它撑大。", difficulty: "medium", faction: "body", cardId: "lymph_node_filter", type: "mechanism", principle: "mechanism", tags: ["ch2","immune"] },
  { q: "肾脏为什么要每天过滤这么多血？", options: ["因为肾脏忙起来才能消耗多余的能量", "因为细胞代谢产生的废物要持续清除", "因为肾脏要不断给身体补充新的水分", "因为肾脏负责调节血液的温度稳定"], answer: 1, fact: "你身体里的细胞每秒都在代谢产生废物。如果肾脏停一天，毒素就会积累到危险水平——这就是为什么要持续过滤。肾脏不调温度也不'造水'，主业就是清废。", difficulty: "medium", faction: "body", cardId: "kidney_filter", type: "mechanism", principle: "homeostasis", tags: ["ch2","filtration"] },
  { q: "为什么造血干细胞躲在骨头里？", options: ["因为硬骨头能保护娇嫩的造血干细胞", "因为骨头里特别空，有大量空间长细胞", "因为骨头里温度比身体其他地方高", "因为骨头里的钙能直接做成血细胞"], answer: 0, fact: "骨髓藏在最硬的骨头里——给娇嫩的造血干细胞建了一个'保险柜'，外界压力、辐射都进不去！钙和血细胞无关，骨头里也不空、温度不特殊。", difficulty: "medium", faction: "body", cardId: "bone_marrow_forge", type: "mechanism", principle: "mechanism", tags: ["ch2","protection"] },
  { q: "干细胞为什么能变成各种不同的细胞？", options: ["因为它能直接复制旁边其他细胞的样子", "因为它能根据身体需要长出不同的器官", "因为它带有所有细胞类型的'蓝图样本'", "因为它还没'锁'基因开关，可走任何方向"], answer: 3, fact: "所有细胞 DNA 都一样，但成熟细胞已经'锁'了大部分基因开关，只剩自己那条路径。干细胞所有开关都没锁——所以理论上可以长成任何细胞！不是靠'复制旁边'，也不是带着蓝图。", difficulty: "medium", faction: "body", cardId: "stem_cell_morph", type: "mechanism", principle: "mechanism", tags: ["ch2","stem_cell"] },
  { q: "肝脏为什么是身体最大的内脏？", options: ["因为它要储存大量血液，所以体积很大", "因为它要做 500 多种工作，需要大量细胞", "因为它跟胃和肠子连得太紧，被挤大了", "因为它能再生，所以一直在长越来越大"], answer: 1, fact: "肝脏要解毒、储糖、合成蛋白、产胆汁……几百项工作叠在一起，所以需要 1.5 公斤那么多细胞！再生只是修复能力，不会让肝无限变大；储血是功能之一但不是'最大'的主因。", difficulty: "medium", faction: "body", cardId: "liver_detox", type: "mechanism", principle: "mechanism", tags: ["ch2","multifunction"] },
  { q: "树突细胞为什么要把病原的'身份证'展示给 T 细胞？", options: ["让 T 细胞知道敌人长什么样，才能精准消灭", "因为展示能让 T 细胞产生大量的抗体", "因为这是免疫细胞之间打招呼的常规仪式", "因为展示能教 T 细胞模仿病原换个形态"], answer: 0, fact: "T 细胞不能直接看到病原。树突细胞把病原的特征分子'展示'给 T 细胞——这叫抗原呈递，是免疫精准打击的关键！抗体是 B 细胞产，不是 T 细胞展示出来的。", difficulty: "medium", faction: "body", cardId: "dendrite_scout", type: "mechanism", principle: "mechanism", tags: ["ch2","immune","antigen"] },
  { q: "脾脏为什么要把老红血球的铁回收？", options: ["因为不回收的话铁会在血液里有毒", "因为不回收会让血液颜色慢慢变浅", "因为铁很稀有，回收能造新红血球", "因为脾脏需要铁来维持自己的功能"], answer: 2, fact: "人体的铁很难从食物里获取，而每个红血球都需要铁！脾脏把老红血球里的铁取出送回骨髓造新血——这是身体的'循环利用'。铁不会让血液有毒，颜色也不靠它。", difficulty: "medium", faction: "body", cardId: "spleen_recycler", type: "mechanism", principle: "tradeoff", tags: ["ch2","recycle"] },
  { q: "巨噬细胞为什么能一口气吞掉那么多细菌？", options: ["因为它的'胃'特别能装，胃口超大", "因为它有溶酶体能反复分解吞进的细菌", "因为吞进去的细菌会自己慢慢死掉", "因为它吞了细菌后体积会变得更大"], answer: 1, fact: "巨噬细胞内有溶酶体——细菌一吞进去就被消化酶分解。消化完一个再吞下一个，理论上可以吞上百个！它不是靠'胃大'，而是有能反复使用的'消化车间'。", difficulty: "medium", faction: "body", cardId: "macrophage_tank", type: "mechanism", principle: "mechanism", tags: ["ch2","immune","phagocytosis"] },
  { q: "DNA 修不好的时候，细胞为什么要'自杀'？", options: ["因为坏掉的细胞已经没法正常工作了", "为了防止变成癌细胞，牺牲自己保全身体", "因为修复失败后细胞已经没能量撑住了", "因为身体细胞太多，少一两个没影响"], answer: 1, fact: "DNA 错误如果带着继续分裂，可能变成癌细胞威胁整个身体。坏细胞主动启动'凋亡程序'自我了断——这是'局部牺牲，全局安全'！其实坏细胞还能工作，只是危险。", difficulty: "medium", faction: "body", cardId: "dna_repair_crew", type: "mechanism", principle: "tradeoff", tags: ["ch2","apoptosis"] },
  { q: "为什么每种抗体只能识别一种特定的病原？", options: ["因为抗体的形状有缺口，只跟一种病原匹配", "因为抗体被训练过，只能认识一种病原", "因为抗体每次只遇见一种，所以只学了它", "因为抗体太小，只能记得住一种特征"], answer: 0, fact: "抗体的 Y 形末端有一个特殊的'锁孔'，只能跟某一种病原表面的分子精确咬合——这是免疫系统精准的根本原因！不是靠'训练'或'记忆'，而是物理形状匹配。", difficulty: "medium", faction: "body", cardId: "antibody_precision_ssr", type: "mechanism", principle: "mechanism", tags: ["ch2","immune","specificity"] },
  { q: "T 细胞在胸腺的淘汰率为什么高达 95%？", options: ["因为胸腺空间不够，只能留少数精英", "因为合格的 T 细胞数量太多了要控制", "要淘汰可能误伤自己人的'叛徒' T 细胞", "因为胸腺一次只能训练成熟一种 T 细胞"], answer: 2, fact: "T 细胞的攻击力很强，如果误把自己人当敌人就是'自身免疫病'。胸腺像严格的学校：能区分自己/外人才能毕业，95% 不合格的都淘汰！", difficulty: "medium", faction: "body", cardId: "thymus_academy", type: "mechanism", principle: "tradeoff", tags: ["ch2","immune","autoimmune"] },
  { q: "为什么线粒体有自己的 DNA，跟细胞核 DNA 不一样？", options: ["因为细胞核装不下太多基因，分一部分出去", "因为线粒体需要独立工作，不被细胞核打扰", "因为线粒体 DNA 是细胞核 DNA 的备份副本", "因为它原本是独立细菌，被细胞吞了之后共生"], answer: 3, fact: "20 亿年前，线粒体的祖先是独立细菌，被大细胞吞下来共生——所以它保留了自己的细菌 DNA！这叫'内共生学说'，是细胞核 DNA 装得下也'装不进'的演化痕迹。", difficulty: "medium", faction: "body", cardId: "mitochondria_powerhouse", type: "mechanism", principle: "coevolution", tags: ["ch2","endosymbiosis"] },

  // — ⚗️ 科技系 (16 题) —
  { q: "为什么医生强调洗手要 20 秒，不能冲一下就行？", options: ["因为时间不够肥皂没法把细菌从皮肤褶皱里撬出来", "因为 20 秒是医院规定的标准操作时间", "因为这是水温稳定到合适所需的时间", "因为细菌死亡需要 20 秒接触肥皂"], answer: 0, fact: "细菌喜欢躲在皮肤褶皱、指甲缝里。肥皂的分子需要 20 秒才能把它们包裹、剥离、冲走——这是化学+物理双重过程！肥皂不是'毒死'细菌，而是把它们物理冲走。", difficulty: "medium", faction: "tech", cardId: "hand_sanitizer", type: "mechanism", principle: "mechanism", tags: ["ch2","hygiene"] },
  { q: "为什么戴口罩'保护别人'比'保护自己'更重要？", options: ["因为口罩反着戴才能真正保护自己", "因为只有感染过的人才需要戴口罩", "因为别人比自己更重要，所以先保护别人", "因为口罩主要挡住呼出的飞沫，而非吸入"], answer: 3, fact: "口罩擅长挡住从嘴喷出的大液滴。如果每个人都戴，病毒在人群中就传不出去——这就是为什么疫情中'人人戴口罩'的策略最有效！它对吸入的小颗粒效果差一些。", difficulty: "medium", faction: "tech", cardId: "surgical_mask", type: "mechanism", principle: "mechanism", tags: ["ch2","public_health"] },
  { q: "为什么现代纱布里要加银离子？", options: ["因为银的颜色能反射光，促进伤口愈合", "因为银能让纱布质地变得更柔软", "因为银能吸收伤口分泌的多余液体", "因为银离子能杀菌，防止伤口感染"], answer: 3, fact: "银离子能破坏细菌的细胞膜和蛋白质——古人就发现金属银碗装的水不容易腐败！现代医用纱布把这个原理用在伤口上。银的颜色和柔软度都跟它没关系。", difficulty: "medium", faction: "tech", cardId: "bandage_wrap", type: "mechanism", principle: "mechanism", tags: ["ch2","antibacterial"] },
  { q: "为什么阿司匹林又能止痛又能预防心脏病？", options: ["因为它的剂量越多，两个效果就越强", "因为它能让大脑减少疼痛信号的传输", "因为它阻止血小板凝集，既减炎又防栓", "因为它本身就有两种成分，分别对付两病"], answer: 2, fact: "阿司匹林阻断了一种叫前列腺素的物质——前列腺素既负责疼痛信号，又让血小板'抱团'形成血栓。一招阻断，两个效果！不是因为有两种成分，是同一种成分作用于两个生理过程。", difficulty: "medium", faction: "tech", cardId: "aspirin_pill", type: "mechanism", principle: "mechanism", tags: ["ch2","drug"] },
  { q: "为什么一滴血就能告诉医生这么多事？", options: ["因为血液在全身流过，记录所有器官的状态", "因为血液里有'感应分子'专门记录身体情况", "因为医生能从血色深浅看出很多东西", "因为现代仪器很厉害，能测出一切信息"], answer: 0, fact: "血液经过每个器官，会把'代谢废物'带出来。所以血糖、肝酶、肾功能指标……每一项都是某个器官在'发邮件汇报'！不靠仪器多强，靠的是血液本身就是'全身通讯网'。", difficulty: "medium", faction: "tech", cardId: "blood_test_kit", type: "mechanism", principle: "mechanism", tags: ["ch2","systems"] },
  { q: "为什么益生菌能让肠道更健康？", options: ["因为益生菌能让肠道分泌特殊保护液", "它们和有害细菌抢食物 + 训练免疫系统", "因为益生菌能直接杀死所有有害的坏菌", "因为益生菌能产生抗生素消灭病原"], answer: 1, fact: "肠道空间和食物有限——益生菌占了位置和食物，坏细菌就没地方繁殖（生态竞争）。它们还会刺激免疫系统保持警觉！益生菌不是杀坏菌，而是把它们'挤'走。", difficulty: "medium", faction: "tech", cardId: "probiotics_ally", type: "mechanism", principle: "tradeoff", tags: ["ch2","microbiome"] },
  { q: "PCR 为什么能检测到微量的病毒？", options: ["它把病毒 DNA 复制成几百万份再去检测", "因为它有超级显微镜能看见单个病毒", "因为它能闻到病毒释放的特殊化学物", "因为它能预测病毒最可能藏在哪里"], answer: 0, fact: "PCR 像'分子复印机'——一段几个分子的 DNA 经过 30 次循环复制，能变成 10 亿份！信号放大让原本看不见的病毒被检出。注意：PCR 不是用显微镜看，而是化学放大。", difficulty: "medium", faction: "tech", cardId: "pcr_machine", type: "mechanism", principle: "mechanism", tags: ["ch2","amplification"] },
  { q: "为什么机器人手术能比人手更精准？", options: ["因为机器人比人聪明，能自己思考做手术", "因为机器臂不抖，能做几毫米精细操作", "因为机器人不用休息，精力总是充沛", "因为机器人有 X 光眼，能直接看到内脏"], answer: 1, fact: "人手再稳也会有微小抖动，长时间手术更明显。机器臂没有抖动，加上电脑过滤医生手的颤抖——能精确到 0.1 毫米！机器人不会自己'思考'，是医生在控制台操作。", difficulty: "medium", faction: "tech", cardId: "robotic_surgery", type: "mechanism", principle: "mechanism", tags: ["ch2","precision"] },
  { q: "除颤器是怎么让心脏重新跳动的？", options: ["因为电击能让心脏肌肉放松、重新开始", "因为电流给心脏补充了它需要的能量", "因为强力震动把堵塞的血管打通了", "因为电流让心脏的混乱信号同时重启"], answer: 3, fact: "心脏骤停常是因为肌肉在'乱抖'（颤动）。一次强电流让所有肌肉同时'重启'，恢复有节奏的跳动——就像电脑重启卡死。它不是补能量，也不是打通血管。", difficulty: "medium", faction: "tech", cardId: "defibrillator_restart", type: "mechanism", principle: "mechanism", tags: ["ch2","emergency","reset"] },
  { q: "CT 为什么要绕着身体拍几百张片子？", options: ["因为机器拍一张不够清楚，需要多拍备用", "因为电脑要从多角度切片拼成 3D 图像", "因为病人会动，需要多拍几张防止糊", "因为辐射量分散到多张拍摄上更安全"], answer: 1, fact: "一张 X 光只是'压扁'的影子，看不出深度。CT 从几百个角度拍，电脑算法把每个角度的信息重建成 3D——所以能看到器官的'切片'！跟备用、防糊都没关系，关键是数学重建。", difficulty: "medium", faction: "tech", cardId: "ct_scanner_reveal", type: "mechanism", principle: "mechanism", tags: ["ch2","imaging","3d"] },
  { q: "基因治疗为什么能治好一些先天性疾病？", options: ["用正确基因替换坏基因，从源头修复", "因为它强化免疫系统，让身体打败疾病", "因为它让身体重新长出坏掉的器官", "因为它能让坏基因暂时不工作不影响"], answer: 0, fact: "很多先天病是 DNA 上某个基因坏了。基因治疗把正确的基因送进细胞，从根源上让细胞恢复正常工作——治本不治标！它不是免疫治疗也不是器官再生。", difficulty: "medium", faction: "tech", cardId: "gene_therapy_fix", type: "mechanism", principle: "mechanism", tags: ["ch2","genetics","root_cause"] },
  { q: "透析机为什么需要一层'特殊的膜'？", options: ["膜让小分子毒素出去，大分子蛋白质留下", "因为膜能挡住血液不让它漏到机器外", "因为膜上的杀菌涂层能防止血液感染", "因为膜能维持血液在合适的温度范围"], answer: 0, fact: "膜上有微小的孔——尿素等小毒素能挤过去被冲走，但蛋白质、血细胞这些大分子留下来。这叫'选择性过滤'，跟真肾脏一样！它的关键不是挡血液或杀菌，而是按大小分子。", difficulty: "medium", faction: "tech", cardId: "dialysis_machine", type: "mechanism", principle: "mechanism", tags: ["ch2","selective_filtration"] },
  { q: "mRNA 疫苗为什么不需要灭活病毒？", options: ["因为 mRNA 本身就能直接杀死病毒", "因为灭活病毒太贵，合成 mRNA 更省钱", "它给细胞'指令'让细胞自己造病毒蛋白片段", "因为 mRNA 进入身体后会自动变成抗体"], answer: 2, fact: "传统疫苗要先培养病毒再灭活。mRNA 疫苗跳过这步——直接送一段'图纸'让细胞产出关键蛋白，免疫系统拿来训练，又快又安全！它不是杀病毒，也不是变抗体。", difficulty: "medium", faction: "tech", cardId: "mrna_vaccine", type: "mechanism", principle: "mechanism", tags: ["ch2","vaccine","mrna"] },
  { q: "纳米机器人怎么'精准找到'癌细胞？", options: ["因为它能跟着身体的化学信号自己导航", "因为它带有微型 GPS 能定位癌症位置", "因为它体积小，能去身体的任何地方", "因为它带着抗体，能识别癌细胞表面分子"], answer: 3, fact: "癌细胞表面有跟正常细胞不一样的分子。纳米机器人表面装着这种分子的'抗体'，只有遇到癌细胞才会粘上——就像精确锁定的钥匙！跟 GPS 或'体积小'无关。", difficulty: "medium", faction: "tech", cardId: "nanobot_warrior", type: "mechanism", principle: "mechanism", tags: ["ch2","molecular_recognition"] },
  { q: "CRISPR 为什么能精确地剪 DNA 的某一段？", options: ["因为它能识别 DNA 上特殊的颜色标记", "它带'引导 RNA'当地图，匹配后才剪", "因为它专门只剪坏掉的基因片段", "因为它从所有 DNA 里随机选一段剪"], answer: 1, fact: "CRISPR 由 RNA + 蛋白质组成——RNA 序列决定剪哪里！想换地方剪，只要换 RNA 序列就行，所以才能'精确'到任何想要的位置。CRISPR 不区分好坏基因，只看序列。", difficulty: "medium", faction: "tech", cardId: "crispr_editor", type: "mechanism", principle: "mechanism", tags: ["ch2","genetics","guide_rna"] },
  { q: "AI 为什么能在影像诊断上超过人类医生？", options: ["因为 AI 的计算能力比人脑强，推理更快", "因为 AI 没有情感偏见，看片更客观", "因为 AI 永远不会疲劳，状态总是稳定", "因为 AI 看过几百万张图，记住所有特征"], answer: 3, fact: "顶级医生一辈子看几万张片子，AI 一次训练能看几百万张！数据规模带来的模式识别能力，是 AI 在影像上超过人类的根本原因。客观、不累都是优势，但根因是数据规模。", difficulty: "medium", faction: "tech", cardId: "ai_doctor", type: "mechanism", principle: "mechanism", tags: ["ch2","ai","scale"] },

  // — 部分覆盖卡补机制题 (3 题) —
  { q: "蛀牙菌怎么把牙齿弄坏的？", options: ["它用尖牙在牙齿上钻出一个个小洞", "它把吃的糖发酵成酸，慢慢腐蚀牙釉质", "它直接咬下牙齿表面的硬质小块", "它分泌色素让牙釉质变脆容易碎"], answer: 1, fact: "蛀牙菌吃了糖会产'酸'——酸长期接触牙齿就把牙釉质溶解出小洞！细菌没有牙，靠的是化学腐蚀，不是物理啃咬，也不是染色。", difficulty: "medium", faction: "pathogen", cardId: "cavity_bacteria", type: "mechanism", principle: "mechanism", tags: ["ch2","acid"] },
  { q: "红细胞为什么能携带那么多氧气？", options: ["因为红颜色天然能吸收空气中的氧气", "因为细胞是中空的，氧气直接被装进去", "它装满血红蛋白，能可逆地结合和释放氧", "因为它有小'抓手'，能牢牢抓住氧分子"], answer: 2, fact: "每个红细胞里有 2.8 亿个血红蛋白分子！血红蛋白在肺里抓住氧，到了缺氧组织就松开氧——这种'可逆结合'是运氧的关键。颜色不决定吸氧能力，关键在分子结构。", difficulty: "medium", faction: "body", cardId: "red_blood_cell", type: "mechanism", principle: "mechanism", tags: ["ch2","oxygen","reversible_binding"] },
  { q: "体温计为什么遇热会显示更高的数字？", options: ["因为玻璃管热了会膨胀，刻度被压缩往上", "因为体温计有电池，能自动判断升温加数", "因为里面液体受热膨胀，液柱跟着上升", "因为温度升高时数字会自动跳到更高位"], answer: 2, fact: "液体受热体积变大——传统体温计就是用这个原理，把温度变化转换成液柱高度变化！这是物理学'热胀冷缩'最简单的应用。传统体温计没有电池，全靠物理。", difficulty: "medium", faction: "tech", cardId: "thermometer_alarm", type: "mechanism", principle: "mechanism", tags: ["ch2","physics","thermal_expansion"] },

  // ============================================================
  // Sprint 32 Step 6 — 推理题 (inference, hard) 40 题
  // 覆盖 33 张完全无题的卡 + 7 张缺推理题的卡。
  // 场景 = 7 岁能遇到的日常，应用卡牌的核心原理判断对错。
  // 错误选项 = 常见误解或直觉但错。fact 字段强调原理迁移。
  // ============================================================

  // — 🦠 病原系 (3 题) —
  { q: "为什么有些传染病能像天花一样彻底根除，但流感始终消灭不了？", options: ["因为天花传播比流感慢很多更容易控制", "因为天花只感染人，但流感能藏在动物身上", "因为流感病人比天花病人更不配合治疗", "因为天花是古代的病，流感是现代才出现的"], answer: 1, fact: "天花根除靠'只感染人' + 有效疫苗 + 全球协作。流感有禽、猪等动物宿主，从动物源头就消灭不了。所以根除条件极苛刻——只有少数病能做到。", difficulty: "hard", faction: "pathogen", cardId: "smallpox_ghost", type: "inference", principle: "tradeoff", tags: ["ch2","eradication","host_range"] },
  { q: "为什么去年打过流感疫苗，今年还要重新打？", options: ["因为流感病毒每年都在变异，旧抗体认不出新的", "因为去年的疫苗效力只能维持一年时间", "因为身体会对疫苗本身产生抗药性", "因为打多次疫苗效果才会变强"], answer: 0, fact: "流感病毒变异极快——每年的流感株都跟去年不太一样，旧抗体认不出新的'伪装'。这就是为什么流感疫苗要每年更新成分。新冠也类似（Omicron→XBB）。", difficulty: "hard", faction: "pathogen", cardId: "flu_virus", type: "inference", principle: "coevolution", tags: ["ch2","mutation","vaccine"] },
  { q: "在哪种环境里你最容易得疟疾？", options: ["在寒冷的雪山高原地区", "在干燥少水的沙漠地区", "在温暖潮湿、蚊子多的地区", "在城市的高楼大厦集中区"], answer: 2, fact: "疟原虫靠按蚊传播——蚊子需要温暖+水才能繁殖。所以热带潮湿地区疟疾高发，干旱和高寒区蚊子少，反而风险低。这是'病原依赖载体'的典型例子。", difficulty: "hard", faction: "pathogen", cardId: "plasmodium_parasite", type: "inference", principle: "mechanism", tags: ["ch2","vector","ecology"] },

  // — 🧬 人体系 (19 题) —
  { q: "用脏手揉了眼睛，过几天竟然没发炎。最可能是为什么？", options: ["因为细菌不喜欢被揉过的眼睛", "因为眨眼时把所有细菌都甩出去了", "因为眼泪里的溶菌酶持续杀掉了细菌", "因为身体对眼睛部位有特别保护"], answer: 2, fact: "眼泪不停冲洗眼球+里面的溶菌酶能破坏细菌细胞壁——这是身体的'自动消毒系统'，所以小量细菌很快被处理掉。但脏手仍可能带来更顽强的病原，习惯不好。", difficulty: "hard", faction: "body", cardId: "tear_drop_lysozyme", type: "inference", principle: "mechanism", tags: ["ch2","immune"] },
  { q: "沙尘暴天气，为什么眼睛比鼻子受影响小？", options: ["因为眼睛比鼻子大，沙子更难进去", "因为有睫毛先挡一层，加上眨眼能弹出来", "因为眼睛流的眼泪比鼻涕多很多", "因为大脑会让眼睛自动闭得更紧"], answer: 1, fact: "睫毛是物理屏障——异物碰到睫毛会触发条件反射的眨眼，把灰尘挡在眼外！鼻子也有鼻毛但没有眨眼这种'快速清理'机制。这是多层防御的体现。", difficulty: "hard", faction: "body", cardId: "eyelash_interceptor", type: "inference", principle: "mechanism", tags: ["ch2","barrier"] },
  { q: "运动完出了一身汗马上吹冷气，为什么容易感冒？", options: ["因为冷气把汗水变成毒素", "因为汗水里有细菌", "因为出汗后身体没及时补充水分", "因为蒸发加冷气让体温降太快，免疫力下降"], answer: 3, fact: "出汗时皮肤已经在蒸发降温，冷气加快了这个过程——体温降太快免疫系统反应迟钝，给病毒可乘之机。先擦干汗，让身体平稳过渡比'吹凉一下'更明智。", difficulty: "hard", faction: "body", cardId: "sweat_gland_cooler", type: "inference", principle: "homeostasis", tags: ["ch2","cooling","tradeoff"] },
  { q: "如果一个人的小肠被切掉一大半，会出现什么问题？", options: ["食物会变得没味道", "吃下去的营养吸收不完全，会缺营养", "会很容易得胃痛", "食物会消化得比之前更快"], answer: 1, fact: "小肠靠'网球场大小'的绒毛面积吸收营养。切掉一大半 → 面积减少 → 吸收不完全 → 必须补充营养液或调整饮食。这就是'短肠综合征'。", difficulty: "hard", faction: "body", cardId: "small_intestine_absorber", type: "inference", principle: "tradeoff", tags: ["ch2","digestive"] },
  { q: "喉咙痛几天后，医生摸脖子说'淋巴结肿了'。这是好事还是坏事？", options: ["完全是坏事，免疫系统被打败了", "中性的，只是身体的物理反应", "是好事，说明免疫系统正在战斗", "完全是坏事，要赶紧吃抗生素"], answer: 2, fact: "淋巴结肿是免疫细胞在那里聚集战斗的标志——说明身体在反击！但如果肿很久不消、变硬或不痛，要去看医生（可能不是普通感染）。", difficulty: "hard", faction: "body", cardId: "lymph_node_filter", type: "inference", principle: "mechanism", tags: ["ch2","immune","symptom"] },
  { q: "一天喝了好多水，但很少上厕所。这说明什么？", options: ["身体很健康，把水都用上了", "喝水太多了，水都堵在身体里", "肾脏可能出问题了，过滤效率下降", "水都变成汗排出去了"], answer: 2, fact: "正常情况下喝多少水排多少。如果喝多排少，要么是大量出汗（情境里没提），要么是肾脏过滤功能可能下降——长期这样需要去医院查。", difficulty: "hard", faction: "body", cardId: "kidney_filter", type: "inference", principle: "homeostasis", tags: ["ch2","symptom"] },
  { q: "化疗会杀掉骨髓里分裂快的细胞。化疗病人为什么会贫血？", options: ["因为化疗药本身就染红了血液", "因为骨髓的造血干细胞被伤，造不出新血细胞", "因为食物里的铁也被破坏掉了", "因为心脏跳得变慢循环不畅"], answer: 1, fact: "化疗主要打分裂快的细胞——既杀癌细胞，也杀骨髓里的造血干细胞。新血细胞造不出来，旧的不断老化，就贫血了。所以化疗病人经常需要输血或药物刺激造血。", difficulty: "hard", faction: "body", cardId: "bone_marrow_forge", type: "inference", principle: "tradeoff", tags: ["ch2","chemotherapy"] },
  { q: "科学家想用干细胞修复瘫痪病人的神经。为什么不用神经细胞本身？", options: ["神经细胞太贵了，造不起来", "神经细胞一旦死了不会再长，但干细胞能变成新神经", "干细胞能让神经变得比原来更聪明", "神经细胞不能注射到身体里去"], answer: 1, fact: "神经细胞高度分化，几乎不能再分裂——这就是脑/脊髓受伤难以恢复的原因。干细胞还能变成神经细胞，理论上可以填补损伤。但实际操作还在研究阶段。", difficulty: "hard", faction: "body", cardId: "stem_cell_morph", type: "inference", principle: "mechanism", tags: ["ch2","regenerative_medicine"] },
  { q: "长期喝酒为什么对肝最不好？", options: ["因为肝要不停解酒精的毒，工作过量受损", "因为酒精比其他食物更难消化", "因为酒让肝慢慢变小", "因为酒让肝里的水变干"], answer: 0, fact: "酒精在肝里被代谢，过量+长期会让肝细胞反复受损。肝再生能力强，但'再生'有上限——长期过量就变成脂肪肝→肝硬化→肝癌。所以肝病重在'防'。", difficulty: "hard", faction: "body", cardId: "liver_detox", type: "inference", principle: "tradeoff", tags: ["ch2","alcohol"] },
  { q: "为什么打疫苗后要过几天才能产生抗体，不是立刻？", options: ["因为疫苗成分要慢慢溶解扩散到血液里去", "因为身体需要时间适应针眼造成的局部伤口", "树突细胞要把抗原带去找 T 细胞，免疫才开始训练", "因为身体在等疫苗里的成分慢慢'变熟'生效"], answer: 2, fact: "免疫系统是个学习过程：树突细胞抓住疫苗成分→送到淋巴结→展示给 T、B 细胞→几天后才有大量抗体。这就是为什么打疫苗后要等几周才有保护力。", difficulty: "hard", faction: "body", cardId: "dendrite_scout", type: "inference", principle: "mechanism", tags: ["ch2","vaccine_kinetics"] },
  { q: "为什么不吃肉的人容易缺铁，但身体里的铁并不会真正'丢失'？", options: ["因为铁是不可再生资源，用完就没了", "因为肉里有特殊的吸收酶身体需要", "因为不吃肉血会变稀，铁不够浓度", "因为脾脏回收旧血的铁，但每天有少量随细胞凋亡流失需补"], answer: 3, fact: "脾脏回收老红血球的铁送回骨髓——但每天还是有少量铁随脱落细胞、月经等流失。素食里的非血红铁吸收率较低，所以纯素食者容易铁不足。", difficulty: "hard", faction: "body", cardId: "spleen_recycler", type: "inference", principle: "tradeoff", tags: ["ch2","nutrition","iron"] },
  { q: "手指被刺扎了一下，几天后那根小刺会怎样？", options: ["跟着血流出去", "永远留在那里不动", "被巨噬细胞包围、吞噬、慢慢清除", "被周围皮肤推出来"], answer: 2, fact: "巨噬细胞是身体的'清道夫'——异物太小吞掉，太大就围一圈（肉芽肿）慢慢分解。小刺通常几天到几周被处理掉。大的异物可能要医生取出来。", difficulty: "hard", faction: "body", cardId: "macrophage_tank", type: "inference", principle: "mechanism", tags: ["ch2","foreign_body"] },
  { q: "为什么长期晒太阳的人容易得皮肤癌？", options: ["因为太阳让皮肤反复发红、被晒伤", "紫外线损伤 DNA，损伤累积修不过来就可能癌变", "因为太阳的高温让皮肤细胞被烫坏了", "因为长时间晒太阳让皮肤把氧气都用完"], answer: 1, fact: "紫外线持续打 DNA，修复系统是有上限的。损伤累积到一定程度，修复失败 + 凋亡程序也失灵，细胞就可能走上癌变之路。所以防晒是预防皮肤癌的关键。", difficulty: "hard", faction: "body", cardId: "dna_repair_crew", type: "inference", principle: "tradeoff", tags: ["ch2","cancer","uv"] },
  { q: "为什么感冒一年能得好几次，但水痘一辈子一般只得一次？", options: ["水痘病毒得了就离开，感冒病毒一直在身体里", "水痘病毒比感冒厉害，免疫系统记得更牢", "感冒会让免疫系统把之前的训练忘记掉", "感冒有上百种病毒，抗体只对'你得过的那种'有效"], answer: 3, fact: "抗体的特异性是 Y 形末端跟病原'精确匹配'。水痘只有一种病毒——免疫一次终身。但'感冒'是 200+ 种鼻病毒/冠状病毒/腺病毒的统称，每次得的是不同病毒，旧抗体认不出。", difficulty: "hard", faction: "body", cardId: "antibody_precision_ssr", type: "inference", principle: "mechanism", tags: ["ch2","specificity","virus_diversity"] },
  { q: "自身免疫病为什么会让人的免疫系统'自己打自己'？", options: ["因为食物里的某种毒素让免疫系统'发疯'", "因为人体细胞自己慢慢长出错误的形状", "有些 T 细胞胸腺训练没合格，误把自己当敌人", "因为病人压力或情绪激怒了免疫系统反应"], answer: 2, fact: "胸腺淘汰 95% 的 T 细胞——但仍有少数会漏掉的'误识别'细胞。这些细胞遇到刺激（感染、压力等）就可能激活，攻击正常组织。所以自身免疫病常和遗传+环境双重因素有关。", difficulty: "hard", faction: "body", cardId: "thymus_academy", type: "inference", principle: "tradeoff", tags: ["ch2","autoimmune"] },
  { q: "跑长跑时，为什么腿越来越酸、越来越没力？", options: ["因为腿的肌肉在长时间运动后慢慢变小了", "因为线粒体跟不上能量需求，副产物堆积", "因为腿里的血液都流向其他部位，腿缺血", "因为身体里的氧气被全身肌肉消耗完了"], answer: 1, fact: "线粒体造能量的速度有上限——超过了就要靠'无氧代谢'，会堆积乳酸等副产物让肌肉酸痛。训练能让线粒体增多、效率变高，所以运动员耐力更好。", difficulty: "hard", faction: "body", cardId: "mitochondria_powerhouse", type: "inference", principle: "tradeoff", tags: ["ch2","exercise","energy"] },
  { q: "为什么医生说不要总用消毒洗手液洗手，会反而让皮肤更脆弱？", options: ["因为洗手液会把皮肤表面的油脂洗掉，让屏障变弱", "因为洗手液太贵，会让你心疼", "因为洗手液让皮肤变厚不透气", "因为洗手液会让细菌变得更强大"], answer: 0, fact: "皮肤表面有一层油脂 + 微生物层，是天然防御。频繁强消毒把这层破坏，反而让皮肤裂口让病菌更易进入。所以平时用肥皂温和洗就够了，特殊场合再消毒。", difficulty: "hard", faction: "body", cardId: "skin_barrier", type: "inference", principle: "tradeoff", tags: ["ch2","barrier","overcleaning"] },
  { q: "为什么剧烈运动后呼吸急促，但平时坐着看书时不会？", options: ["因为剧烈运动时空气里突然变少了氧气", "因为运动会让肺暂时变小容量减少", "因为肌肉用力时需要大量氧气，肺要加倍供应", "因为运动时鼻孔会被汗堵住影响呼吸"], answer: 2, fact: "肌肉用力时线粒体疯狂工作需要大量氧气——肺要把空气交换速度提高几倍才跟得上代谢需求。这就是'供能匹配代谢'，是身体维持稳态的自动反应。", difficulty: "hard", faction: "body", cardId: "lung_engine", type: "inference", principle: "homeostasis", tags: ["ch2","exercise","oxygen_demand"] },
  { q: "宇航员在太空待久了，回到地球后骨头会变脆，为什么？", options: ["因为太空辐射伤了骨头里的细胞", "因为没重力骨头不用承压，慢慢变薄了", "因为太空里没钙补充给骨头", "因为太空食物里的营养不全"], answer: 1, fact: "骨头是'用进废退'的——靠日常承压（行走/抗重力）维持密度。失重时骨头'没事做'就被身体回收钙，越来越薄（骨质流失）。所以宇航员要每天运动 2 小时维持骨密度。", difficulty: "hard", faction: "body", cardId: "skeleton_frame", type: "inference", principle: "homeostasis", tags: ["ch2","bone","space"] },

  // — ⚗️ 科技系 (18 题) —
  { q: "在医院里，为什么医生还要用紫外线灯消毒，不只用酒精擦?", options: ["因为紫外线消毒比酒精见效更快更省力", "因为酒精对一些特殊病毒效果差，紫外线能补足", "因为酒精会破坏医院里的精密仪器材料", "因为紫外线消毒更高科技显得医院更先进"], answer: 1, fact: "酒精擅长杀'有外壳的'病原（流感、新冠等），但对一些病毒效果差。紫外线打 DNA 不挑对象，能补足这块。所以医院要多种消毒配合——没有'万能'消毒方法。", difficulty: "hard", faction: "tech", cardId: "hand_sanitizer", type: "inference", principle: "tradeoff", tags: ["ch2","disinfection","complementary"] },
  { q: "为什么戴 N95 口罩时间长了会感觉憋气，但医用外科口罩不会？", options: ["因为 N95 里有特殊吸气孔被堵住了", "因为 N95 专门设计让人吸气困难", "因为 N95 过滤更严格、空气阻力大、呼吸要更费力", "因为外科口罩里有给氧气的装置"], answer: 2, fact: "N95 过滤效率高（95%）的代价是阻力也高——长时间戴会让人呼吸费力。这是典型的'保护强度 vs 舒适度' tradeoff。所以一般场景外科口罩够了，高风险才用 N95。", difficulty: "hard", faction: "tech", cardId: "surgical_mask", type: "inference", principle: "tradeoff", tags: ["ch2","ppe"] },
  { q: "为什么医生说伤口结痂时不要去抠？", options: ["痂是身体保护伤口的天然纱布，抠掉细菌再进", "因为痂里面会积累很多伤口排出来的毒素", "因为抠痂的过程会让手指上的细菌沾到伤口", "因为痂里其实有让牙齿蛀牙的细菌也会传染"], answer: 0, fact: "结痂是血小板 + 蛋白质形成的'临时纱布'——挡细菌、给下面的细胞修复时间。抠掉就重新暴露伤口，细菌再进去 → 感染 → 还会留疤。让它自然脱落是最好的。", difficulty: "hard", faction: "tech", cardId: "bandage_wrap", type: "inference", principle: "mechanism", tags: ["ch2","wound_healing"] },
  { q: "为什么医生说牙痛时不要乱吃阿司匹林，有时反而出血？", options: ["因为阿司匹林只能治头痛和身体内部疼痛", "因为阿司匹林进入口腔会让牙齿表面变软", "阿司匹林阻止血小板凝集，大量服用让伤口难止血", "因为阿司匹林会让神经更敏感，牙痛感反加剧"], answer: 2, fact: "阿司匹林同时抑制疼痛信号 + 血小板凝集——所以低剂量预防血栓，但大量服用就出血风险高。牙龈本来就容易渗血，再加阿司匹林雪上加霜。", difficulty: "hard", faction: "tech", cardId: "aspirin_pill", type: "inference", principle: "tradeoff", tags: ["ch2","drug","side_effect"] },
  { q: "为什么医生抽血前让你'空腹'？", options: ["因为空腹时抽血没那么疼", "因为吃东西后血糖、血脂会变高，影响检测结果", "因为空腹时血液颜色更红更好检测", "因为吃过东西血会变粘抽不动"], answer: 1, fact: "刚吃完东西血糖/血脂会暂时升高，让正常人看起来像糖尿病/高血脂。空腹 8-12 小时让这些指标回到'基线'，才能反映真实健康状况。这是诊断学的基本原则。", difficulty: "hard", faction: "tech", cardId: "blood_test_kit", type: "inference", principle: "mechanism", tags: ["ch2","fasting"] },
  { q: "为什么吃完抗生素后医生让你补点益生菌？", options: ["因为益生菌能让抗生素效果变得更好", "因为益生菌能解抗生素留下的毒", "因为抗生素会让肠胃变饿", "因为抗生素杀好菌坏菌一起杀，要重新补好菌"], answer: 3, fact: "抗生素不能精确只杀坏菌——肠道里的好菌也会被一起伤。所以吃完抗生素肠道菌群失衡（腹泻常见原因），补益生菌能加快恢复生态平衡。", difficulty: "hard", faction: "tech", cardId: "probiotics_ally", type: "inference", principle: "tradeoff", tags: ["ch2","antibiotic_side"] },
  { q: "为什么 PCR 检测有时会出现'假阴性'（明明感染了却测不出）？", options: ["因为机器太聪明能识别假病人", "因为病毒会主动躲过 PCR 检测", "因为 PCR 不能检测所有种类病毒", "因为采样棒没接触到病毒，或病毒量太少没被复制起来"], answer: 3, fact: "PCR 灵敏度极高，但前提是采到病毒——咽部检测可能采不到肺部深处的病毒。或者感染早期病毒量极低也可能测不出。所以多次检测/多部位采样能降低假阴性率。", difficulty: "hard", faction: "tech", cardId: "pcr_machine", type: "inference", principle: "tradeoff", tags: ["ch2","diagnosis"] },
  { q: "机器人手术那么精准，为什么不用来做所有手术？", options: ["因为机器人手术成本高，简单手术不划算", "因为机器人会自己反抗医生的操作", "因为机器人比人手更危险出事故", "因为没有人愿意被机器人开刀"], answer: 0, fact: "机器人系统几千万一台，加上耗材一次手术贵很多——简单的胆囊切除等用传统腔镜就够了。机器人主要用于精度要求高的手术（前列腺、心脏精细操作）。这是成本/收益的现实考量。", difficulty: "hard", faction: "tech", cardId: "robotic_surgery", type: "inference", principle: "tradeoff", tags: ["ch2","cost"] },
  { q: "AED 上写着'分析心律，需要时点击电击'。它为什么要先分析？", options: ["因为不是所有晕倒都是心跳乱，有些电击反而有害", "因为机器要先休息几秒缓存能量", "因为分析能让接下来的电击更精准", "因为机器要确认病人愿意被救"], answer: 0, fact: "AED 只对'室颤'有效（心脏乱抖）——对'心脏完全停跳'电击无效，还可能让能恢复的心律重新混乱。所以 AED 一定要先识别再放电，这也是它能交给非专业人士使用的关键。", difficulty: "hard", faction: "tech", cardId: "defibrillator_restart", type: "inference", principle: "tradeoff", tags: ["ch2","emergency","ai"] },
  { q: "为什么医生不能'随便给你拍 CT'，即使你说想拍？", options: ["因为 CT 检查太贵了医保不报销", "因为 CT 有辐射，频繁拍会增加患癌风险", "因为 CT 只能给特殊病人用", "因为 CT 拍多了会让影像变模糊"], answer: 1, fact: "一次 CT 的辐射相当于几百张 X 光——单次很安全，但年内累积多次会显著增加患癌风险。所以医生会权衡'诊断价值 vs 辐射伤害'，不必要的 CT 是要避免的。", difficulty: "hard", faction: "tech", cardId: "ct_scanner_reveal", type: "inference", principle: "tradeoff", tags: ["ch2","radiation"] },
  { q: "基因治疗能修好 DNA 上的错误，为什么不用它治每一种遗传病？", options: ["因为遗传病种类太少没有研究价值", "因为基因治疗的专业科学家人手不够", "因为很难把正确基因精确送到该去的细胞", "因为基因治疗只对未成年人才有效果"], answer: 2, fact: "基因治疗的核心难点是'精准递送'——病毒载体要把正确基因送到对的细胞类型（肝病送到肝细胞、神经病送到脑细胞）。送错了不管用还可能有害。所以目前只用于能精准递送的少数几种病。", difficulty: "hard", faction: "tech", cardId: "gene_therapy_fix", type: "inference", principle: "mechanism", tags: ["ch2","precision_delivery"] },
  { q: "如果一个人两个肾都完全坏了，几天不透析会怎样？", options: ["几天不上厕所就行，没什么大问题", "因为身体其他器官能临时帮忙过滤毒素", "毒素会在血里累积到中毒甚至致命", "会感觉脚肿脸肿但不会有生命危险"], answer: 2, fact: "细胞每秒都产生废物——尿素、肌酐等如果不被肾过滤，几天就会累积到致命浓度。其他器官（肝、肺）干不了这活。所以肾衰竭病人必须定期透析维持生命。", difficulty: "hard", faction: "tech", cardId: "dialysis_machine", type: "inference", principle: "homeostasis", tags: ["ch2","kidney_failure","waste_accumulation"] },
  { q: "为什么 mRNA 疫苗能在新冠疫情中那么快被开发出来？", options: ["因为针对新冠的 mRNA 疫苗本来就有储备", "传统疫苗要培养病毒慢，mRNA 只需序列就能合成", "因为政府特别批准跳过了所有安全测试", "因为多家药厂赶时间偷工减料省去步骤"], answer: 1, fact: "mRNA 疫苗平台已研究了 30 年——新冠出现后几天内拿到病毒基因序列，几周内合成 mRNA。传统疫苗要培养病毒、灭活/减毒，至少几个月起步。安全测试一样做了，只是平台技术成熟。", difficulty: "hard", faction: "tech", cardId: "mrna_vaccine", type: "inference", principle: "mechanism", tags: ["ch2","speed","platform"] },
  { q: "纳米机器人理论上能精准治癌，为什么实际用得很少？", options: ["因为癌症病人不需要这么先进的技术", "因为纳米机器人成本太高普通病人付不起", "因为癌症已经有更好的治疗方法不需要它", "因为还在实验阶段，安全和效果都没充分验证"], answer: 3, fact: "实验室里有效不等于人体上有效——动物实验→I 期人体试验→II→III 期需要 10-20 年，确保安全和效果。所以'理论能做'和'病人能用'之间有很长的路。", difficulty: "hard", faction: "tech", cardId: "nanobot_warrior", type: "inference", principle: "tradeoff", tags: ["ch2","translation","trials"] },
  { q: "为什么不能用 CRISPR 让所有人都变得高一点？", options: ["因为身高的基因目前还没被科学家找到", "因为身高由上千个基因 + 营养 + 激素共同决定", "因为 CRISPR 只能用来治病不能用来美容", "因为改了身高其他身体功能也会一起变"], answer: 1, fact: "身高涉及上千个基因 + 发育期营养 + 生长激素 + 运动等。改一个基因可能只让人高 0.1 厘米还可能引发其他问题。'单基因改造'在复杂特征上行不通——这是 CRISPR 的真正局限。", difficulty: "hard", faction: "tech", cardId: "crispr_editor", type: "inference", principle: "mechanism", tags: ["ch2","polygenic","complexity"] },
  { q: "AI 看影像很准，为什么医院里还离不开人类医生？", options: ["AI 不会跟病人沟通，也不会综合考虑病史心理", "因为现在的 AI 经常出错，没人能完全信任", "因为人类医生有特殊执照，法律规定不能替代", "因为病人面对冷冰冰的 AI 会感到很尴尬害怕"], answer: 0, fact: "AI 擅长模式识别（看片子），但不擅长综合判断（病史 + 症状 + 心理 + 家庭）+ 沟通解释。最佳模式是'AI 辅助医生'——AI 看影像建议，医生最终判断和沟通。", difficulty: "hard", faction: "tech", cardId: "ai_doctor", type: "inference", principle: "tradeoff", tags: ["ch2","ai","collaboration"] },
  { q: "为什么医生说手破了流大血时，要先按住伤口而不是马上贴创可贴？", options: ["因为大伤口要先用清水冲洗才能贴上", "因为压住能直接止血，创可贴止不住大量血流", "因为创可贴上的胶水接触伤口会引起过敏", "因为创可贴只能盖住伤口不能让血液凝固"], answer: 1, fact: "按压能直接阻止血液流出，给身体凝血时间。创可贴只是物理覆盖——大量出血时它吸不住、固定不牢。优先级是：先止血→再清洁→最后覆盖。这是急救的基本顺序。", difficulty: "hard", faction: "tech", cardId: "bandaid_helper", type: "inference", principle: "tradeoff", tags: ["ch2","first_aid","priority"] },
  { q: "如果不按医生开的剂量吃完抗生素，会有什么后果？", options: ["没事，少吃点正好能省钱也减少副作用", "没杀干净的细菌可能产生耐药，下次失效", "提前停药剩下的抗生素会自然分解消失", "抗生素吃多了反而对肝肾有副作用伤害"], answer: 1, fact: "提前停药留下来的细菌是最强壮的那些——它们繁殖出耐药后代，下次同样药就无效了。这就是'超级细菌'产生的主要原因。所以一定要严格按疗程吃完。", difficulty: "hard", faction: "tech", cardId: "antibiotic_ultimate", type: "inference", principle: "coevolution", tags: ["ch2","resistance","compliance"] },
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
