export const VOCAB_COURSE_TREE = [
  {
    id: "roots-affixes",
    title: "词根词缀",
    children: [
      {
        id: "common-prefixes",
        title: "常见前缀",
        content: `前缀通常改变单词的意义，掌握高频前缀能帮你快速猜出生词大意。

**否定/相反类**
• un- 不、非：unhappy（不开心）、unable（不能）
• dis- 不、相反：disagree（不同意）、disappear（消失）
• mis- 错误地：misunderstand（误解）、mislead（误导）
• in-/im-/il-/ir- 不：invisible（看不见的）、impossible（不可能）

**方向/程度类**
• re- 再次、向后：rewrite（重写）、return（返回）
• pre- 提前、在……之前：preview（预习）、predict（预测）
• over- 过度：overuse（过度使用）、overwhelmed（不知所措的）
• sub- 在……之下：subway（地铁）、subtitle（字幕）
• inter- 在……之间：interact（互动）、international（国际的）

记忆技巧：先记住前缀的核心含义，再套用到具体单词上，遇到生词时先拆前缀，缩小猜测范围。`,
        quiz: [
          {
            id: "q1",
            question: "单词 \"disagree\" 中的前缀 \"dis-\" 表示什么含义？",
            options: ["A. 再次", "B. 不、相反", "C. 提前", "D. 过度"],
            answer: "B",
            explanation: "dis- 是否定前缀，表示“不、相反”，disagree = dis(不) + agree(同意) = 不同意。",
            optionsAnalysis: {
              A: "【错误】“再次”对应的前缀是 re-，不是 dis-。",
              B: "【正确】dis- 表示否定或相反，与 un-、in- 类似。",
              C: "【错误】“提前”对应的前缀是 pre-。",
              D: "【错误】“过度”对应的前缀是 over-。",
            },
          },
          {
            id: "q2",
            question: "根据前缀含义，\"international\" 最可能表示什么？",
            options: ["A. 国内的", "B. 国际的，涉及多个国家", "C. 非法的", "D. 过时的"],
            answer: "B",
            explanation: "inter- 表示“在……之间”，international = inter(之间) + national(国家的) = 国际的。",
            optionsAnalysis: {
              A: "【错误】“国内的”应为 national 或 domestic，没有 inter- 前缀。",
              B: "【正确】inter- + national 组合表示涉及多个国家之间。",
              C: "【错误】“非法的”对应前缀是 il-（illegal）。",
              D: "【错误】词根词缀无法推出“过时”的含义。",
            },
          },
        ],
      },
      {
        id: "common-suffixes",
        title: "常见后缀",
        content: `后缀通常决定单词的词性（名词/形容词/动词），学会识别后缀能帮你快速判断一个生词在句中的语法作用。

**名词后缀**
• -tion/-sion 表示动作或状态：education（教育）、decision（决定）
• -ment 表示结果或过程：development（发展）、agreement（协议）
• -ness 表示性质、状态：happiness（幸福）、awareness（意识）

**形容词后缀**
• -able/-ible 表示“可……的”：available（可获得的）、visible（可见的）
• -ful 表示“充满……的”：careful（细心的）、meaningful（有意义的）
• -less 表示“没有……的”：careless（粗心的）、endless（无尽的）
• -ive 表示“有……倾向的”：creative（有创造力的）、effective（有效的）

技巧：看到 -tion/-ment/-ness 结尾大概率是名词；看到 -able/-ful/-less/-ive 结尾大概率是形容词，可以帮助你在阅读中快速判断句子结构。`,
        quiz: [
          {
            id: "q1",
            question: "单词 \"development\" 最可能的词性是？",
            options: ["A. 动词", "B. 形容词", "C. 名词", "D. 副词"],
            answer: "C",
            explanation: "-ment 是典型的名词后缀，development 表示“发展”这一过程或结果，是名词。",
            optionsAnalysis: {
              A: "【错误】动词形式应为 develop，没有 -ment。",
              B: "【错误】形容词常见后缀是 -ful/-able/-ive 等，不是 -ment。",
              C: "【正确】-ment 后缀通常构成名词，表示过程或结果。",
              D: "【错误】副词通常以 -ly 结尾。",
            },
          },
          {
            id: "q2",
            question: "\"careless\" 中的 \"-less\" 表示什么含义？",
            options: ["A. 充满……的", "B. 可以……的", "C. 没有……的", "D. 使……变得"],
            answer: "C",
            explanation: "-less 表示“没有”，careless = care(小心) + less(没有) = 粗心的。",
            optionsAnalysis: {
              A: "【错误】“充满……的”对应后缀是 -ful。",
              B: "【错误】“可以……的”对应后缀是 -able/-ible。",
              C: "【正确】-less 是否定性后缀，表示缺乏某种性质。",
              D: "【错误】“使……变得”更接近使役动词后缀 -en，不是 -less。",
            },
          },
        ],
      },
      {
        id: "common-roots",
        title: "高频词根",
        content: `词根承载单词的核心含义，掌握常见词根能让你举一反三，快速理解一整个词族。

• spect 看：inspect（检查）、respect（尊重）、perspective（视角）
• dict 说：predict（预测）、dictionary（字典）、contradict（反驳）
• port 携带：transport（运输）、import（进口）、support（支持）
• struct 建造：construct（建造）、structure（结构）、instruct（指导）
• vis/vid 看：visible（可见的）、vision（视野）、evidence（证据）
• tract 拉：attract（吸引）、extract（提取）、contract（合同）

记忆方法：先记住词根本义，再联系前缀/后缀理解整词。例如 per(贯穿) + spect(看) = perspective（从头看到尾的角度 → 视角）。`,
        quiz: [
          {
            id: "q1",
            question: "词根 \"dict\" 的核心含义是？",
            options: ["A. 看", "B. 说", "C. 建造", "D. 携带"],
            answer: "B",
            explanation: "dict 表示“说”，predict（预先说 → 预测）、dictionary（说出词义的书 → 字典）都含有这个词根。",
            optionsAnalysis: {
              A: "【错误】“看”对应的词根是 spect 或 vis/vid。",
              B: "【正确】dict 词根意为“说”，来自拉丁语 dicere。",
              C: "【错误】“建造”对应的词根是 struct。",
              D: "【错误】“携带”对应的词根是 port。",
            },
          },
          {
            id: "q2",
            question: "根据词根含义，\"transport\" 最可能表示什么？",
            options: ["A. 转变", "B. 运输、运送", "C. 转移话题", "D. 传递情感"],
            answer: "B",
            explanation: "trans(穿越) + port(携带) = 把东西携带着穿越某地，即“运输”。",
            optionsAnalysis: {
              A: "【错误】“转变”更接近 transform（trans + form）。",
              B: "【正确】trans- + port 组合直译为“携带穿越”，即运输。",
              C: "【错误】与话题无关，port 词根不涉及语言表达。",
              D: "【错误】与情感表达无关。",
            },
          },
        ],
      },
    ],
  },
  {
    id: "context-clues",
    title: "语境记忆法",
    children: [
      {
        id: "synonym-antonym-clue",
        title: "同义/反义线索",
        content: `阅读中遇到生词时，句子里常常藏着同义词或反义词提示，帮你不查词典也能猜出大意。

**同义线索**：句子用一个熟词解释或重复生词的含义，常见于 or、that is、in other words 之后。
例：Her explanation was ambiguous, or unclear, leaving us confused.
→ ambiguous 前后出现 unclear，可以推断 ambiguous ≈ 不清楚的。

**反义线索**：句子通过 but、however、unlike、in contrast 等词，把生词和一个已知反义词对比。
例：Unlike his optimistic colleagues, he remained skeptical about the plan.
→ skeptical 与 optimistic（乐观的）相对，可推断 skeptical ≈ 怀疑的。

做阅读题时，先圈出生词前后的连接词（or / but / however / unlike），它们往往就是解题的关键线索。`,
        quiz: [
          {
            id: "q1",
            question: "\"Her explanation was ambiguous, or unclear, leaving us confused.\" 一句中，可以通过什么线索推断 ambiguous 的含义？",
            options: ["A. 反义对比", "B. 同义复述（or 后的 unclear）", "C. 举例说明", "D. 因果关系"],
            answer: "B",
            explanation: "or unclear 是对 ambiguous 的同义复述，属于同义线索。",
            optionsAnalysis: {
              A: "【错误】句中没有转折词表示对比关系。",
              B: "【正确】or 连接的 unclear 与 ambiguous 意思相近，是同义线索。",
              C: "【错误】句子没有给出具体例子。",
              D: "【错误】句子不涉及因果逻辑。",
            },
          },
          {
            id: "q2",
            question: "\"Unlike his optimistic colleagues, he remained skeptical about the plan.\" 中，skeptical 最可能的含义是？",
            options: ["A. 乐观的", "B. 怀疑的", "C. 兴奋的", "D. 冷静的"],
            answer: "B",
            explanation: "Unlike 引出反义对比，skeptical 与 optimistic（乐观的）相反，故 skeptical ≈ 怀疑的。",
            optionsAnalysis: {
              A: "【错误】与句中 optimistic 是对比关系，不会是同义。",
              B: "【正确】反义线索 Unlike 提示 skeptical 与乐观相反，即怀疑的。",
              C: "【错误】“兴奋的”与反义对比逻辑不符。",
              D: "【错误】“冷静的”不构成与乐观的直接反义。",
            },
          },
        ],
      },
      {
        id: "definition-example-clue",
        title: "定义/举例线索",
        content: `作者有时会直接在句中给出生词的定义，或用具体例子帮助读者理解。

**定义线索**：常见标志词 is, means, refers to, defined as, that is。
例：Biodiversity, which refers to the variety of life in an area, is under threat.
→ refers to 后面就是 biodiversity 的定义：生物多样性。

**举例线索**：常见标志词 such as, for example, like, including。
例：Many invasive species, such as certain insects and plants, can harm local ecosystems.
→ such as 之后的具体例子，帮助理解 invasive species（入侵物种）大致是什么。

技巧：遇到生词时先看后面有没有逗号+定语从句，或者 such as / for example，这些结构常常直接给出答案。`,
        quiz: [
          {
            id: "q1",
            question: "\"Biodiversity, which refers to the variety of life in an area, is under threat.\" 中，理解 biodiversity 含义的关键线索是？",
            options: ["A. which refers to 引出的定义", "B. 举例说明", "C. 反义对比", "D. 因果关系"],
            answer: "A",
            explanation: "which refers to... 是定语从句形式的定义线索，直接解释了 biodiversity 的含义。",
            optionsAnalysis: {
              A: "【正确】refers to 是典型的定义提示词。",
              B: "【错误】句子没有具体例子，属于定义而非举例。",
              C: "【错误】没有转折或对比结构。",
              D: "【错误】句子不涉及因果逻辑。",
            },
          },
          {
            id: "q2",
            question: "\"Many invasive species, such as certain insects and plants, can harm local ecosystems.\" 中，\"such as\" 起到什么作用？",
            options: ["A. 给出反义词", "B. 给出同义词", "C. 引出具体例子帮助理解 invasive species", "D. 表示转折"],
            answer: "C",
            explanation: "such as 引出具体例子（某些昆虫和植物），帮助读者理解 invasive species 大致指什么类型的生物。",
            optionsAnalysis: {
              A: "【错误】such as 不表示反义。",
              B: "【错误】such as 引出的是例子而非同义替换词。",
              C: "【正确】such as 是举例线索的典型标志词。",
              D: "【错误】such as 不表示转折关系。",
            },
          },
        ],
      },
      {
        id: "cause-contrast-clue",
        title: "因果/对比线索",
        content: `因果和对比关系词也能帮你推断生词含义，尤其在议论文和说明文中很常见。

**因果线索**：because, since, as a result, therefore, so 等词连接原因和结果，如果你认识其中一半，就能推断另一半。
例：The bridge was poorly maintained, so it eventually collapsed.
→ 已知“年久失修”是因，可推断 collapsed ≈ 倒塌了。

**对比线索**：while, whereas, on the other hand, in contrast 连接两个相对的情况。
例：While some students thrive under pressure, others feel overwhelmed by it.
→ thrive（茁壮成长）与 overwhelmed 形成对比，可推断 overwhelmed ≈ 不堪重负的。

做题技巧：遇到 so / because / while / whereas 等词时，先分析已知的那一半句子，再倒推生词大意。`,
        quiz: [
          {
            id: "q1",
            question: "\"The bridge was poorly maintained, so it eventually collapsed.\" 中，通过因果线索可以推断 collapsed 的含义最接近？",
            options: ["A. 被翻新了", "B. 倒塌了", "C. 变得更坚固了", "D. 被拆除了"],
            answer: "B",
            explanation: "so 引出结果，“年久失修”导致的合理结果是“倒塌”，故 collapsed ≈ 倒塌了。",
            optionsAnalysis: {
              A: "【错误】“年久失修”不会导致“被翻新”这一正面结果。",
              B: "【正确】因果逻辑：失修 → 倒塌，符合常理。",
              C: "【错误】与“年久失修”的因果逻辑相矛盾。",
              D: "【错误】“拆除”通常是主动行为，与“eventually”表示的自然结果不符。",
            },
          },
          {
            id: "q2",
            question: "\"While some students thrive under pressure, others feel overwhelmed by it.\" 中，overwhelmed 与 thrive 是什么关系？",
            options: ["A. 同义关系", "B. 对比关系（反义）", "C. 因果关系", "D. 举例关系"],
            answer: "B",
            explanation: "While 引出对比，thrive（茁壮成长）与 overwhelmed（不堪重负）形成反义对比。",
            optionsAnalysis: {
              A: "【错误】两者含义相反，不是同义。",
              B: "【正确】While 是对比连接词，两个分句呈相反的状态。",
              C: "【错误】不构成因果链条。",
              D: "【错误】句子不是在举例。",
            },
          },
        ],
      },
    ],
  },
  {
    id: "memory-strategies",
    title: "高效记忆策略",
    children: [
      {
        id: "spaced-repetition",
        title: "间隔重复",
        content: `间隔重复（Spaced Repetition）是被认知科学广泛验证的记忆方法：把复习安排在“快要遗忘之前”，能大幅提升长期记忆效果。

**核心原理**：艾宾浩斯遗忘曲线显示，新学的内容在 1 天后会遗忘大半，但每复习一次，遗忘速度就会变慢。

**实践建议**：
• 第一次学习后，第二天复习一次
• 三天后再复习一次
• 一周后再复习一次
• 之后逐渐拉长间隔（半月、一月）

在本模块中，「闪卡练习」正是间隔重复的实践工具：把还没掌握的词反复推送给你，掌握的词则暂时不再出现，从而把复习时间集中在真正薄弱的单词上。`,
        quiz: [
          {
            id: "q1",
            question: "间隔重复记忆法的核心原理是什么？",
            options: ["A. 一次性大量重复背诵", "B. 在快要遗忘前安排复习，逐渐拉长间隔", "C. 只背诵长难词", "D. 睡前集中背诵一次即可"],
            answer: "B",
            explanation: "间隔重复利用遗忘曲线规律，在即将遗忘时复习，并逐步拉长复习间隔，从而提升长期记忆效果。",
            optionsAnalysis: {
              A: "【错误】一次性大量重复效率较低，容易产生疲劳而非长期记忆。",
              B: "【正确】这正是间隔重复的核心机制。",
              C: "【错误】方法与词汇难度无关，适用于所有单词。",
              D: "【错误】单次背诵不符合“间隔”的核心要义。",
            },
          },
          {
            id: "q2",
            question: "本词汇模块中，哪个功能最直接体现了间隔重复原理？",
            options: ["A. 同义替换练习", "B. 闪卡练习（未掌握词反复出现）", "C. 词根词缀课程", "D. 单词列表浏览"],
            answer: "B",
            explanation: "闪卡练习会把未标记为“已掌握”的词反复呈现，符合间隔重复“在遗忘前复习”的逻辑。",
            optionsAnalysis: {
              A: "【错误】同义替换更侧重表达丰富度，不是复习节奏管理。",
              B: "【正确】闪卡机制正是间隔重复的直接实践。",
              C: "【错误】词根词缀是构词理解方法，不涉及复习间隔。",
              D: "【错误】单纯浏览列表不涉及“遗忘前复习”的调度逻辑。",
            },
          },
        ],
      },
      {
        id: "association-memory",
        title: "联想记忆",
        content: `联想记忆通过把抽象的单词和具体的画面、故事或已知词汇联系起来，让记忆更牢固、更有趣。

**谐音联想**：把英文发音和中文谐音、画面联系起来。例如 abandon（放弃）→ “一band（乐队）弹（散）了”→ 想象乐队解散的画面。

**画面联想**：把单词含义转化成一幅具体的图像。例如 gigantic（巨大的）→ 想象一个巨人（giant）站在城市中央。

**故事串联**：把一组相关单词编成一个小故事，按逻辑顺序串起来，比孤立背诵效果更好。例如把 anxious（焦虑的）、overwhelmed（不堪重负的）、relief（如释重负）串成“考试前很焦虑，任务多到不堪重负，考完后终于如释重负”的小故事。

联想记忆特别适合抽象名词和情绪类形容词，因为这些词很难通过词根词缀直接推导。`,
        quiz: [
          {
            id: "q1",
            question: "下列哪种方法属于“联想记忆”的典型做法？",
            options: ["A. 按字母表顺序机械抄写单词10遍", "B. 把单词发音编成谐音故事或具体画面", "C. 只做语法填空题", "D. 只背诵词性和音标"],
            answer: "B",
            explanation: "联想记忆的核心是把抽象单词与具体画面、故事或谐音联系起来，帮助大脑建立更丰富的记忆线索。",
            optionsAnalysis: {
              A: "【错误】机械抄写属于死记硬背，不是联想记忆。",
              B: "【正确】谐音、画面、故事联想都是典型的联想记忆手段。",
              C: "【错误】语法填空是语法练习，不是词汇记忆方法。",
              D: "【错误】只背词性音标属于孤立记忆，缺乏联想。",
            },
          },
          {
            id: "q2",
            question: "联想记忆法最适合用来记忆哪一类单词？",
            options: ["A. 具体可见的实物名词（如 apple）", "B. 抽象名词和情绪类形容词（如 anxious）", "C. 数字和日期", "D. 标点符号用法"],
            answer: "B",
            explanation: "抽象名词和情绪类形容词往往难以通过词根词缀直接推导，联想记忆能为它们提供具体的记忆抓手。",
            optionsAnalysis: {
              A: "【错误】具体实物名词通常直接看图记忆即可，不需要额外联想。",
              B: "【正确】抽象词汇正是联想记忆法最能发挥作用的场景。",
              C: "【错误】数字日期属于机械记忆范畴。",
              D: "【错误】标点符号与词汇记忆无关。",
            },
          },
        ],
      },
      {
        id: "word-family-clustering",
        title: "词族记忆",
        content: `词族记忆是把同一词根/主题下的相关单词归类学习，一次记住一整个家族，而不是孤立背诵单个单词。

**同根词族**：围绕一个核心词根，记住它的名词、动词、形容词、副词形式。
例：analyze(v. 分析) → analysis(n. 分析) → analytical(adj. 分析的) → analytically(adv. 分析地)

**同主题词族**：围绕一个话题归类词汇，比如“环境保护”主题下：sustainable（可持续的）、pollution（污染）、conservation（保护）、renewable（可再生的）。

**同场景词族**：围绕一个使用场景归类，比如议论文常用因果衔接词：consequently、therefore、as a result、thus。

好处：词族记忆能建立单词之间的语义网络，遇到一个词就能联想到一整组相关表达，也更符合真实写作和阅读中“成组出现”的规律。`,
        quiz: [
          {
            id: "q1",
            question: "\"analyze → analysis → analytical → analytically\" 这组单词的记忆方法属于？",
            options: ["A. 同根词族记忆", "B. 谐音联想记忆", "C. 间隔重复", "D. 定义线索法"],
            answer: "A",
            explanation: "这组单词共享同一词根 analy-，分别对应动词、名词、形容词、副词形式，属于同根词族记忆。",
            optionsAnalysis: {
              A: "【正确】围绕同一词根记忆不同词性变化，正是同根词族记忆。",
              B: "【错误】谐音联想涉及发音与画面联系，与此无关。",
              C: "【错误】间隔重复是复习时间安排方法，不是分类记忆方法。",
              D: "【错误】定义线索法用于阅读中猜词义，不是主动记忆策略。",
            },
          },
          {
            id: "q2",
            question: "围绕“环境保护”主题归类 sustainable、pollution、conservation、renewable 等词，这属于哪种词族记忆？",
            options: ["A. 同根词族", "B. 同主题词族", "C. 同音词族", "D. 同词性词族"],
            answer: "B",
            explanation: "这些词并不share同一词根，而是围绕“环境保护”这一话题归类，属于同主题词族记忆。",
            optionsAnalysis: {
              A: "【错误】这些单词词根各不相同，不属于同根词族。",
              B: "【正确】按话题归类是同主题词族记忆的典型例子。",
              C: "【错误】这些单词发音并不相近，不构成同音词族。",
              D: "【错误】这些词词性也不完全相同（有形容词也有名词）。",
            },
          },
        ],
      },
    ],
  },
];
