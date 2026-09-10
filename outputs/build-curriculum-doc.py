# -*- coding: utf-8 -*-
# 《生物英雄传》课纲依据与教育设计说明 —— 给小学老师的 PDF（生成脚本）
# 重新生成（仓库根目录）：
#   python3 -m venv .venv && .venv/bin/pip install reportlab pypdf
#   .venv/bin/python outputs/build-curriculum-doc.py   → outputs/curriculum-basis-for-teachers.pdf
# 依赖 macOS 自带的 CJK 字体 Arial Unicode.ttf（reportlab 内置字体无汉字，会渲成黑方块）；
# 其它机器把 FONT_CANDIDATES 换成任意含汉字的 .ttf 即可。
# 数字（157 卡 / 805 题…）是 2026-09-10 从 src/data 统计的；数据变了要手动更新第六节。
# 全部事实来源：仓库文档（CLAUDE.md / outputs/quiz-system-plan.md / card-pool-report.md）、
# 题库与卡池的实际统计（node 直接从 src/data 算）、以及多源核实的课标/NGSS 原文。
# 纪律：不写仓库里没有的"逐题课标编号"；未做的事在 §8 如实说明。
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                PageBreak, KeepTogether)

import os
from pathlib import Path
FONT_CANDIDATES = ["/Library/Fonts/Arial Unicode.ttf", "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"]
_font = next((f for f in FONT_CANDIDATES if os.path.exists(f)), None)
if not _font:
    raise SystemExit("找不到含汉字的 .ttf 字体：请把 FONT_CANDIDATES 指向任意 CJK .ttf")
pdfmetrics.registerFont(TTFont("CJK", _font))
F = "CJK"
OUT = str(Path(__file__).resolve().parent / "curriculum-basis-for-teachers.pdf")

# ---------- 样式（全部用 CJK 字体，否则汉字变黑方块；无粗体面，用字号/颜色区分层级）----------
S = {
    "title":   ParagraphStyle("title", fontName=F, fontSize=20, leading=28, alignment=TA_CENTER, textColor=colors.HexColor("#1f3b5c"), spaceAfter=4),
    "sub":     ParagraphStyle("sub", fontName=F, fontSize=11, leading=16, alignment=TA_CENTER, textColor=colors.HexColor("#555555"), spaceAfter=14),
    "h1":      ParagraphStyle("h1", fontName=F, fontSize=14.5, leading=20, textColor=colors.HexColor("#1f3b5c"), spaceBefore=14, spaceAfter=6),
    "h2":      ParagraphStyle("h2", fontName=F, fontSize=12, leading=17, textColor=colors.HexColor("#2b5f8f"), spaceBefore=8, spaceAfter=4),
    "body":    ParagraphStyle("body", fontName=F, fontSize=10.2, leading=16, alignment=TA_LEFT, spaceAfter=5),
    "note":    ParagraphStyle("note", fontName=F, fontSize=9.4, leading=14.5, textColor=colors.HexColor("#444444"), backColor=colors.HexColor("#fff8e1"),
                              borderColor=colors.HexColor("#e6c65c"), borderWidth=0.8, borderPadding=6, spaceBefore=6, spaceAfter=10),
    "cell":    ParagraphStyle("cell", fontName=F, fontSize=9.2, leading=13),
    "cellh":   ParagraphStyle("cellh", fontName=F, fontSize=9.4, leading=13, textColor=colors.white),
    "small":   ParagraphStyle("small", fontName=F, fontSize=8.6, leading=12.5, textColor=colors.HexColor("#555555")),
    "bullet":  ParagraphStyle("bullet", fontName=F, fontSize=10.2, leading=16, leftIndent=14, firstLineIndent=-10, spaceAfter=3),
}

def P(t, s="body"): return Paragraph(t, S[s])
def B(t): return Paragraph("• " + t, S["bullet"])

def T(rows, widths, header=True):
    data = [[Paragraph(c, S["cellh"] if (header and i == 0) else S["cell"]) for c in r] for i, r in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    st = [("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#b8c4d0")),
          ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
          ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]
    if header:
        st += [("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2b5f8f"))]
        for i in range(1, len(rows)):
            if i % 2 == 0: st.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f3f6f9")))
    t.setStyle(TableStyle(st))
    return t

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(F, 8.5); canvas.setFillColor(colors.HexColor("#777777"))
    canvas.drawCentredString(A4[0] / 2, 12 * mm, "《生物英雄传》课纲依据与教育设计说明 · 第 %d 页" % doc.page)
    canvas.restoreState()

W = A4[0] - 2 * 20 * mm   # 正文可用宽度
story = []

# ---------- 封面头 ----------
story += [
    P("《生物英雄传》课纲依据与教育设计说明", "title"),
    P("Bio Heroes —— 一款让小学生在卡牌对战中学习生物科学的网页游戏 · 给老师的说明 · 2026 年 9 月", "sub"),
    P("这是一个父子共同制作的项目：爸爸负责实现，7 岁的孩子（齐齐）负责试玩和提意见。它不是商业产品，也不是教辅软件，"
      "而是一个把生物学知识做进游戏机制里的尝试。老师问到「到底用的是什么课纲」，本文如实回答：依据是什么、做到了哪一步、"
      "还没做到什么，以及我们希望从老师这里得到哪些反馈。"),
]

# ---------- §1 一句话回答 ----------
story += [P("一、一句话回答：用的是什么课纲", "h1"),
    P("主要对标 <font color='#1f3b5c'>《义务教育科学课程标准（2022 年版）》</font>（中华人民共和国教育部，2022 年 4 月发布；"
      "小学 1～6 年级的「科学」课）中<font color='#1f3b5c'>生命科学领域的四个核心概念</font>与四个跨学科概念；"
      "同时以美国《新一代科学教育标准》（NGSS）K–5 生命科学部分作为第二参照，用来校对「小学低年级该学到什么程度」和题型设计。"),
    P("需要说清楚的边界：游戏的<font color='#1f3b5c'>内容选择、题目分类和难度分层</font>是按上述核心概念设计的，"
      "但我们<font color='#b00020'>尚未做到</font>「每一张卡、每一道题逐条标注对应课标条目编号」——这套知识点标注（我们内部叫 KP_ID / NGSS / 课标三标签）"
      "在项目文档里一直是规划项，至今没有落地。所以严格地说，它是「依据课标核心概念设计的游戏」，不是「逐条对齐课标的教材」。"
      "下文第八节列出了已做与未做。", "note"),
]

# ---------- §2 课标依据 ----------
story += [P("二、《义务教育科学课程标准（2022 年版）》的相关依据", "h1"),
    P("2022 年版科学课标以 13 个学科核心概念组织全部课程内容，其中生命科学领域四个；另有四个跨学科概念贯穿所有领域；"
      "小学阶段分为三个学段。游戏对标的正是下面这些（名称为课标原文）："),
    T([["类别", "课标原文", "游戏中的落点（详见第四节）"],
       ["生命科学核心概念 ①", "生命系统的构成层次", "人体系卡牌（细胞→组织→器官→系统）、微生物卡、通用题 C2「人体与身体」"],
       ["生命科学核心概念 ②", "生物体的稳态与调节", "免疫、发烧、凝血、体温等机制题；技能效果直接模拟调节过程"],
       ["生命科学核心概念 ③", "生物与环境的相互关系", "自然系卡牌（食物链、共生、适应）、环境事件卡、通用题 C6「食物链与生态」"],
       ["生命科学核心概念 ④", "生命的延续与进化", "进化链系统、耐药菌演化题、远古生物卡、通用题中的进化与生命周期题"],
       ["跨学科概念", "物质与能量 · 结构与功能 · 系统与模型 · 稳定与变化", "「异养 vs 自养」是全部阵营设计的第一性原理；每张卡「机制即知识」= 结构决定功能；战场即生态/免疫系统的模型"],
       ["学段", "1～2 年级 · 3～4 年级 · 5～6 年级", "题目分三档难度（见第五节），面向 5～9 岁递进"]],
      [W * 0.20, W * 0.30, W * 0.50]),
    P("说明：2022 年同时发布的还有《义务教育生物学课程标准（2022 年版）》，那是初中 7～9 年级「生物学」课的标准（七个学习主题）。"
      "本游戏面向小学，对标的是「科学」课标，不是「生物学」课标；两者名称相近，这里特别区分。", "small"),
]

# ---------- §3 NGSS 参照 ----------
story += [P("三、第二参照：美国 NGSS K–5 生命科学", "h1"),
    P("NGSS 把生命科学分为四个学科核心思想（LS1–LS4），并给每个年级排定主题。我们在设计题库分类和「7 岁能懂到什么程度」时参照了它的 K–5 主题排列"
      "（下表主题名为 NGSS 官方《K–5 Topic Arrangement》原文）："),
    T([["核心思想", "NGSS 原文", "对应本游戏"],
       ["LS1", "From Molecules to Organisms: Structures and Processes", "人体系、细胞与器官的结构—功能题"],
       ["LS2", "Ecosystems: Interactions, Energy, and Dynamics", "自然系食物链、共生、环境事件卡"],
       ["LS3", "Heredity: Inheritance and Variation of Traits", "进化链、遗传相关卡（CRISPR、基因突变事件）"],
       ["LS4", "Biological Evolution: Unity and Diversity", "耐药菌演化、远古生物、适应类题"]],
      [W * 0.14, W * 0.46, W * 0.40]),
    Spacer(1, 6),
    T([["年级", "NGSS K–5 生命科学主题（原文）"],
       ["K", "Interdependent Relationships in Ecosystems: Animals, Plants, and Their Environment"],
       ["1", "Structure, Function, and Information Processing"],
       ["2", "Interdependent Relationships in Ecosystems"],
       ["3", "Interdependent Relationships in Ecosystems；Inheritance and Variation of Traits: Life Cycles and Traits"],
       ["4", "Structure, Function, and Information Processing"],
       ["5", "Matter and Energy in Organisms and Ecosystems"]],
      [W * 0.12, W * 0.88]),
]

# ---------- §4 内容对照 ----------
story += [PageBreak(), P("四、游戏内容与课标核心概念的对照", "h1"),
    P("游戏把生物世界分成四个「阵营」，每张卡都是一种真实生物、细胞、病原或医疗科技；技能效果模拟它的真实本领。"
      "下表按核心概念说明各部分内容落在哪里："),
    T([["核心概念", "承载的游戏内容", "举例"],
       ["生命系统的构成层次", "人体系：血液免疫 / 器官 / 神经 / 结构 / 细胞机制五个子类；微生物子类", "白细胞、红细胞、心脏、大脑、骨骼、干细胞、草履虫、水熊虫"],
       ["生物体的稳态与调节", "免疫应答、发烧、凝血、伤口结痂、透析等「为什么」题；对应技能（如发烧：己方免疫细胞攻击提升、自身消耗）", "「为什么发烧不全是坏事」「肾坏了几天不透析会怎样」"],
       ["生物与环境的相互关系", "自然系：植物 / 陆地 / 海洋 / 飞行 / 微生物；食物链、共生、适应；每 3 回合一次的环境事件", "蚂蚁信息素、蜜蜂倒钩、切叶蚁与真菌互利共生、森林大火事件"],
       ["生命的延续与进化", "卡牌进化链；耐药菌、超级细菌的自然选择题；远古生物", "「打不死的超级细菌是怎么冒出来的」"],
       ["人类活动与环境 / 技术与社会", "科技系：药物 / 诊断工具 / 医疗设备 / 基因技术 / 预防措施；病原系作为「反派」", "抗生素只打细菌不打病毒、疫苗是「通缉令」、X 光为什么能看见骨头、CRISPR 基因剪刀"],
       ["跨学科：结构与功能", "「卡牌设计五问」第二问：遮住卡名只看技能，能不能猜出这是什么生物", "水熊虫 = 免伤 + 自愈；神经元 = 出场即可攻击（信号最快）"],
       ["跨学科：物质与能量", "四阵营的第一性原理：自养（植物）可以不动、器官独立；异养（动物/病原）必须移动、必须协调", "植物类多为支援与回复，动物类多为攻击与协作"]],
      [W * 0.22, W * 0.44, W * 0.34]),
]

# ---------- §5 教育设计原则 ----------
story += [P("五、当时写下的教育设计原则", "h1"),
    P("以下是项目文档（CLAUDE.md 与 2026-06 的题库设计文档）里明文写下的原则，游戏内容按这些原则生产："),
    P("1. 第一性原理：异养与自养", "h2"),
    P("能量获取方式决定生命的一切特征——异养生物（动物、病原）必须消耗其他生物，所以必须移动、必须有系统级协调、身体结构复杂；"
      "自养生物（植物）自制食物，可以不动，器官独立运作，结构简单。这是自然系 / 人体系 / 病原系设计的根基，对应课标跨学科概念「物质与能量」。"),
    P("2. 玩法即学习，不是「学完了奖励你玩」", "h2"),
    P("知识融入核心机制：卡牌技能就是生物本领；答题触发「觉醒」加成，而且对错都有解释卡；答错也有部分奖励（允许失败）。"),
    P("3. 卡牌设计五问（每张新卡必须回答）", "h2"),
    B("第一性原理锚点：这张卡承载的生物学原理是什么？（一句话）"),
    B("机制即知识：遮住卡名，只看技能效果，能猜出这是什么生物吗？"),
    B("资源取舍：出这张卡时玩家要放弃什么？不能有「无脑出」的卡"),
    B("风险取舍（强力卡）：有没有「赌」的成分？"),
    B("七岁能懂：孩子能不能理解卡牌描述和技能名？"),
    P("4. 科学知识卡的写法", "h2"),
    P("不只讲结论，要讲「为什么」；技能效果必须能在知识卡里得到解释；7 岁能读懂但不牺牲准确性；科学名词附英文。"),
    P("5. 题型与难度", "h2"),
    P("题目分三类：机制题（为什么 / 怎么会）、推理题（如果……会怎样）、记忆题（是什么）。2026-06 起把 147 道纯记忆题重写成机制 / 推理题，"
      "记忆题占比从近半降到约五分之一。难度三档：⭐ 5～6 岁、⭐⭐ 7～8 岁、⭐⭐⭐ 9 岁以上，随连续答对自动升档。"
      "每题四个选项，干扰项「听起来都像真的」，并用程序守卫防止「正确答案总是最长的那个」这类露馅；题目之间做语义查重，避免同一知识点换个说法反复出现。"),
    P("6. 参考的学习科学结论", "h2"),
    P("对 6～9 岁儿童，纯粹「不重复出题」并非最优，间隔重复更利于记忆（见参考来源）。当前版本做到「当天不重复」，跨天间隔复习列为下一步。"),
]

# ---------- §6 规模 ----------
story += [P("六、内容规模（2026-09-10 从数据直接统计）", "h1"),
    T([["项目", "数量", "说明"],
       ["卡牌总数", "157 张", "生物卡 124（自然 45 / 人体 27 / 病原 26 / 科技 26）+ 事件卡 16 + SP 觉醒卡 17"],
       ["科学知识卡", "157 / 157", "每张卡都配一段「讲为什么」的科学知识；另有 180 条技能附科学注释"],
       ["题目总数", "805 道", "全部四选一，全部带一句 7 岁能懂的讲解"],
       ["按题型", "机制 358 · 推理 275 · 记忆 172", "机制 + 推理占 79%"],
       ["按难度", "易 257 · 中 297 · 难 251", "对应 5～6 岁 / 7～8 岁 / 9 岁以上"],
       ["卡牌题 / 通用题", "563 / 242", "卡牌题绑定具体卡；通用题不绑卡，分六类"],
       ["通用题六类", "C2 人体与身体 46 · C6 食物链与生态 46 · C10 生物之最与极端生物 46 · C12 身边科学与健康习惯 44 · C7 病原与传染病 30 · C13 医疗科技 30", "分类法参照 NGSS K–5 主题与课标核心概念设计（原规划 12 类，目前落地 6 类）"],
       ["按阵营", "自然 276 · 人体 219 · 病原 156 · 科技 154", "四阵营题量"]],
      [W * 0.20, W * 0.30, W * 0.50]),
]

# ---------- §7 实例 ----------
story += [P("七、实例（原样摘自游戏数据）", "h1"),
    P("科学知识卡", "h2"),
    P("【白细胞·免疫尖兵】白细胞是你身体里的「警察」和「士兵」！当你受伤发炎、伤口变红变肿的时候，其实就是大量白细胞赶到现场在打仗。它们能穿过血管壁，跑到需要的地方去消灭坏蛋。", "small"),
    P("【水熊虫·隐生不死】水熊虫（缓步动物）是地球上有名的「最强生存者」，身长不到 1 毫米，要用显微镜才看得清。它最厉害的本领叫「隐生」：当周围没水、太冷、太热或太危险时，它会把身体里的水排掉、缩成一个圆滚滚的「小桶」，几乎停止身体里的一切活动，像在装死。", "small"),
    P("机制题（⭐ 档）", "h2"),
    P("问：一只蚂蚁找到食物后，怎样让一大群同伴也找到同一处食物？　选项：回家挨个拍醒每只同伴带路 / 用触角大声喊叫呼唤同伴 / 沿路留下气味 / 把食物搬一点回去给大家闻　答：沿路留下气味　"
      "讲解：蚂蚁会在回程路上留下「信息素」（一种气味），同伴顺着气味就能找到食物。来的蚂蚁越多、气味越浓，路就越清楚——所以这张卡有同伴在手时能召唤更多蚂蚁。", "small"),
    P("问：蜜蜂蜇了你以后自己也会死，最可能是因为蜂刺长成了什么样子？　答：蜂刺像鱼钩有倒钩　讲解：蜜蜂的蜂刺上有一排小倒钩，像鱼钩一样。扎进皮肤后拔不出来，飞走时会把蜂刺和身体里的一部分一起扯掉，蜜蜂因此受伤死掉。", "small"),
    P("推理题（⭐⭐⭐ 档，科技系）", "h2"),
    P("问：为什么同一种抗生素能杀死细菌，却伤不到病毒？　答：细菌有能被药破坏的活零件，病毒太简单没有　讲解：抗生素专门破坏细菌才有的「零件」，比如细菌的外壁。病毒结构非常简单，没有这些零件，所以抗生素对它没办法。", "small"),
]

# ---------- §8 诚实说明 ----------
story += [P("八、已经做到的、还没做到的，以及想请老师帮忙看的", "h1"),
    P("已经做到", "h2"),
    B("内容选择和题库分类按 2022 年版科学课标生命科学四个核心概念与 NGSS K–5 主题设计；每张卡、每道题都有科学讲解，且以「为什么」为主。"),
    B("难度按年龄分三档；题目有程序化的质量守卫（防露馅、防重复、防题库与卡牌脱节）。"),
    P("还没做到", "h2"),
    B("没有逐张卡、逐道题标注课标条目编号或 NGSS 表现期望代码（K-LS1-1 这类）。这套「知识点标注」在项目文档里一直是规划，没有落地。"),
    B("没有按年级做过分层验证：三档难度是按年龄段设计的，但没有在真实班级里测过哪一档对应哪个年级。"),
    B("所有内容目前只经过一个 7 岁孩子的试玩反馈，没有经过教师审阅。"),
    P("想请老师帮忙看的", "h2"),
    B("这些内容与您所教年级的科学教材单元贴不贴合？哪些概念对这个年级来说超纲，哪些又太浅？"),
    B("题目的讲解有没有科学上不够准确、或者小学生容易误解的表述？"),
    B("如果要做逐题课标标注，您建议按课标的哪一层来标（核心概念 / 学习内容 / 学业要求）？"),
]

# ---------- §9 来源 ----------
story += [P("九、参考来源", "h1"),
    B("中华人民共和国教育部.《义务教育科学课程标准（2022 年版）》. 北京师范大学出版社, 2022."),
    B("中国教育新闻网.「视频解读义务教育科学课程标准（2022 年版）」. www.jyb.cn/rmtzcg/xwy/spxw/202208/t20220803_703211.html"),
    B("高等教育出版社.《义务教育科学课程标准（2022 年版）解读》. xuanshu.hep.com.cn（书目编号 62bc92ad938b7cc2960eecc7）"),
    B("NGSS Lead States. Next Generation Science Standards, K–5 Topic Arrangement. www.nextgenscience.org/sites/default/files/K-5Topic.pdf"),
    B("儿童检索练习与记忆研究（PMC11087082）. pmc.ncbi.nlm.nih.gov/articles/PMC11087082/"),
    B("Third Space Learning. Spaced Repetition 教学指南. thirdspacelearning.com/us/blog/spaced-repetition/"),
    Spacer(1, 10),
    P("游戏地址：bio.socialcontract.capital　　项目文档与全部题库、卡牌数据公开在 GitHub：github.com/yang44yang/bio-heroes", "small"),
    P("本文所有数字均于 2026-09-10 从游戏数据直接统计得出；引用的课标概念名称为课标原文，NGSS 主题名为官方文件原文。", "small"),
]

doc = SimpleDocTemplate(OUT, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=20 * mm,
                        title="《生物英雄传》课纲依据与教育设计说明", author="Bio Heroes 项目")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("built", OUT)
