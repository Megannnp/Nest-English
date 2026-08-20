// Reading course tree — 阅读精讲知识体系
export const READING_COURSE_TREE = [
  {
    id: "qt",
    title: "题型精讲",
    children: [
      {
        id: "qt-main-idea",
        title: "主旨大意题",
        content: `主旨大意题要求判断文章或段落的核心观点。命题特征：
• 常见问法：What is the main idea / purpose of the passage? / What does the passage mainly discuss?
• 正确答案必须覆盖全文，而非局部细节
• 错误选项常见陷阱：**过于具体**（只涉及某段）、**过于宽泛**（超出文章范围）

**解题步骤**
1. 阅读首末段，找出论点句（topic sentence）
2. 关注信号词：in short, in conclusion, the point is, the author argues...
3. 将各段 topic sentence 整合，归纳核心论点
4. 对照选项，排除过窄/过宽表述

**高频信号词**
• 转折类：however, yet, but → 转折后常是重心
• 强调类：indeed, in fact, above all → 强调句是中心
• 总结类：therefore, thus, in sum → 总结句概括全文`,
        quiz: [
          {
            id: "qt-mi-1",
            material: "一篇文章前三段分别写：城市绿地能降低压力、增加邻里交流、鼓励人们进行户外活动。结尾段总结：城市绿地不是装饰，而是城市健康系统的一部分。",
            question: "下面哪一项最适合作为这篇文章的主旨？",
            options: [
              "A. 城市绿地可以让人进行户外活动",
              "B. 城市绿地对城市居民健康具有综合价值",
              "C. 邻里交流是城市规划中唯一重要的问题",
              "D. 很多城市缺少足够的公共空间",
            ],
            answer: "B",
            explanation: "主旨项必须覆盖全文。材料中压力、交流、户外活动都服务于“城市健康系统”这一总观点，B 最完整。",
            optionsAnalysis: {
              A: "【过窄】只覆盖户外活动这一细节。",
              B: "【正确】能统摄三个分论点和结尾总结。",
              C: "【绝对化】“唯一重要”超出材料。",
              D: "【无依据】材料没有强调空间不足。",
            },
          },
          {
            id: "qt-mi-2",
            material: "文章开头提出青少年睡眠不足的问题，中间解释蓝光、作业压力和作息混乱的影响，结尾强调：学校与家庭需要共同保护青少年的睡眠时间。",
            question: "这篇文章的中心最可能是什么？",
            options: [
              "A. 蓝光是影响青少年睡眠的唯一原因",
              "B. 作业压力比家庭作息更重要",
              "C. 青少年睡眠需要学校和家庭共同干预",
              "D. 青少年应该完全停止使用电子设备",
            ],
            answer: "C",
            explanation: "结尾句通常承担总结功能。材料最后强调学校与家庭共同保护睡眠，C 覆盖全文。",
            optionsAnalysis: {
              A: "【过窄】只抓住一个原因，还用了“唯一”。",
              B: "【无依据】材料没有比较二者重要性。",
              C: "【正确】对应结尾总结，覆盖主要原因与解决方向。",
              D: "【过度引申】材料没有提出完全停止使用设备。",
            },
          },
        ],
      },
      {
        id: "qt-detail",
        title: "细节理解题",
        content: `细节题考查对文章特定信息的定位与理解，是阅读中占比最高的题型。

**命题特征**
• 常见问法：According to the passage... / The author states that... / Which of the following is true...
• 答案几乎总可以在原文找到对应句
• 干扰项常采用**偷换概念**、**绝对化表达**、**无中生有**三大策略

**解题步骤**
1. 抓住题干关键词（人名、时间、地点、数字、概念）
2. 带关键词返回原文**精确定位**
3. 将原文对应句与选项逐一比对
4. 警惕：almost / rarely / only / never 等限定词改变原意

**常见陷阱**
• 张冠李戴：把 A 的观点说成 B 的
• 程度失真：文中说 "may" 选项说 "will"
• 因果颠倒：文中 A 导致 B，选项说 B 导致 A`,
        quiz: [
          {
            id: "qt-detail-1",
            material: "原文：The Amazon stores roughly 10% of the world's carbon.",
            question: "题目问：亚马孙储存了全球大约多少碳？正确答案应选哪一项？",
            options: [
              "A. 90%",
              "B. 10%",
              "C. 超过一半",
              "D. 文中没有说明",
            ],
            answer: "B",
            explanation: "原文明确数字 10%，细节题答案直接对应原文表述。",
            optionsAnalysis: {
              A: "【错误】90% 是原文数据的互补值，属于计算干扰。",
              B: "【正确】与原文 'roughly 10%' 完全对应。",
              C: "【错误】'超过一半' 与原文数据矛盾。",
              D: "【错误】原文已明确给出数字，并非未知。",
            },
          },
          {
            id: "qt-detail-2",
            material: "原文：The treaty was signed in 1648, ending decades of conflict.",
            question: "下列哪一项与原文不符？",
            options: [
              "A. 条约签署于 1648 年",
              "B. 冲突持续了数十年",
              "C. 条约引发了一场新的冲突",
              "D. 条约签署后冲突结束",
            ],
            answer: "C",
            explanation: "原文说条约结束了冲突（ending conflict），选项 C 无中生有，说条约引发了新冲突。",
            optionsAnalysis: {
              A: "【正确原文】与原文时间一致，为正确陈述。",
              B: "【正确原文】'decades of conflict' 对应 '持续数十年的冲突'。",
              C: "【无中生有】原文未提及新冲突，此项凭空添加信息。",
              D: "【正确原文】与原文 'ending conflict' 对应。",
            },
          },
        ],
      },
      {
        id: "qt-inference",
        title: "推断判断题",
        content: `推断题要求在文本明确信息之外做出合理推论，是难度最高的题型之一。

**命题特征**
• 常见问法：It can be inferred that... / The author implies... / What is suggested about...
• 正确答案**不直接出现在原文**，但必须由原文逻辑推导
• 过度推断和欠推断都是错误选项

**推断的边界**
• 推断 = 原文信息 + 逻辑推理（一步，最多两步）
• 不可依赖常识或个人经验
• 若选项需要原文没有提供的前提，则为错误

**解题方法**
1. 找到题目对应的原文段落
2. 分析作者用词、态度词、转折词
3. 问自己：这个结论必然能从原文得出吗？
4. 排除：过于绝对、超出原文范围、与原文矛盾的选项

**常见词汇暗示推断**
• surprisingly, paradoxically → 暗示常识之外的结论
• nevertheless, despite → 暗示结果与预期相反`,
        quiz: [
          {
            id: "qt-inf-1",
            material: "原文：Despite the cold, hundreds of volunteers showed up.",
            question: "从这句话可以合理推断什么？",
            options: [
              "A. 志愿者都特别喜欢寒冷天气",
              "B. 这件事的吸引力超过了寒冷带来的阻碍",
              "C. 活动一定是在室内举行的",
              "D. 寒冷天气总会增加参与人数",
            ],
            answer: "B",
            explanation: "'Despite' 表示让步，逻辑是：天冷本会阻止人来，但仍有大量人到场，说明驱动力强于阻力。",
            optionsAnalysis: {
              A: "【过度推断】原文未提及志愿者偏好寒冷天气。",
              B: "【正确】'despite the cold' 的逻辑含义：阻力（冷）被动力（事业）克服。",
              C: "【无中生有】原文未涉及室内/室外信息。",
              D: "【绝对化】原文是特定事件，不可推广为普遍规律。",
            },
          },
          {
            id: "qt-inf-2",
            material: "原文：The new drug showed promising results in trials, though researchers cautioned it was years from approval.",
            question: "这句话暗示了什么？",
            options: [
              "A. 这种药已经获批上市",
              "B. 研究者完全不看好这种药",
              "C. 试验结果不错不等于马上获批，审批仍需较长过程",
              "D. 这种药永远不会获批",
            ],
            answer: "C",
            explanation: "'Promising results' 但 'years from approval' 说明批准流程比试验成功还需更多时间，暗示审批流程漫长。",
            optionsAnalysis: {
              A: "【与原文矛盾】原文明说还需数年才能获批。",
              B: "【过度推断】researchers 是谨慎（cautioned），非悲观。",
              C: "【正确】试验成功 ≠ 立即批准，暗示审批有独立的漫长流程。",
              D: "【绝对化】原文说 'years from approval'，未说永不批准。",
            },
          },
        ],
      },
      {
        id: "qt-vocab",
        title: "词义猜测题",
        content: `词义猜测题要求根据上下文推断生词或熟词僻义。

**命题特征**
• 常见问法：The word "X" in line N most nearly means... / As used in the passage, "X" refers to...
• 目标词可能是：① 生僻词 ② 熟词被赋予特殊含义 ③ 多义词
• **不可依赖词典义**，必须结合语境

**解题步骤**
1. 找到目标词所在句子，画出**同义替换**的上下文线索
2. 用自己的话先预判词义
3. 代入选项验证：替换后句意是否自然合理
4. 优先参考目标词前后的**解释性从句**、**同位语**、**对比词**

**上下文线索类型**
• 定义线索：X, which means / X, or / X is...
• 对比线索：unlike / in contrast to / however → 反义词
• 同义线索：similarly / like / just as → 同义词
• 因果线索：because / therefore → 词义可从因果推出`,
        quiz: [
          {
            id: "qt-vocab-1",
            material: "原文：The scientist's findings were serendipitous — she discovered the cure while researching an unrelated disease.",
            question: "根据破折号后的解释，serendipitous 最接近哪种意思？",
            options: [
              "A. 经过周密计划的",
              "B. 意外但幸运的",
              "C. 医学上重要的",
              "D. 经常发生的",
            ],
            answer: "B",
            explanation: "破折号后的解释 'discovered while researching an unrelated disease' 暗示发现是意外的，且结果（cure）是好的，故 serendipitous = 意外的幸运。",
            optionsAnalysis: {
              A: "【与语境矛盾】发现是偶然的，与 'carefully planned' 相反。",
              B: "【正确】结合破折号后解释：意外中发现了有价值的东西。",
              C: "【范围过窄】医学意义只是结果，不是词义本身。",
              D: "【无依据】频繁发生与上下文无关。",
            },
          },
          {
            id: "qt-vocab-2",
            material: "原文：Unlike the verbose speeches of his colleagues, his remarks were laconic.",
            question: "根据 unlike 的对比关系，laconic 最可能是什么意思？",
            options: [
              "A. 冗长而详细",
              "B. 情绪化且热烈",
              "C. 简短而切中要点",
              "D. 混乱且不清楚",
            ],
            answer: "C",
            explanation: "'Unlike the verbose speeches' 是对比线索：verbose（冗长）的反义，加上 laconic 修饰 'remarks'，推断为简洁。",
            optionsAnalysis: {
              A: "【与对比矛盾】verbose 才是 long and detailed，laconic 是其反义。",
              B: "【无依据】情感与原文对比（verbose vs laconic）无关。",
              C: "【正确】unlike verbose → 简洁扼要，即 brief and to the point。",
              D: "【无依据】上下文没有提示含糊不清的含义。",
            },
          },
        ],
      },
      {
        id: "qt-purpose",
        title: "作者目的/态度题",
        content: `目的题和态度题考查作者写作意图与情感倾向。

**目的题**
• 常见问法：The author's purpose in writing this passage is to... / Why does the author mention...
• 答案用动词开头：to argue / to inform / to persuade / to compare / to describe

**态度题**
• 常见问法：The author's attitude toward X can best be described as...
• 态度词光谱：
  - 强烈支持：enthusiastic, celebratory, admiring
  - 温和支持：supportive, optimistic, appreciative
  - 中立：neutral, objective, impartial
  - 温和反对：skeptical, cautious, critical
  - 强烈反对：dismissive, contemptuous, alarmed

**解题技巧**
• 关注情感词：unfortunately, remarkably, troublingly...
• 注意引号：带引号的词常表示作者不认同
• 看转折：作者观点往往在 "but / however" 之后
• 警惕极端态度词（indifferent, outraged）——通常错误`,
        quiz: [
          {
            id: "qt-purpose-1",
            material: "材料：文章详细介绍帝王蝶的迁徙、繁殖和栖息地，没有号召读者采取行动，也没有批评某种政策。",
            question: "作者最可能的写作目的是什么？",
            options: [
              "A. 论证帝王蝶必须受到法律保护",
              "B. 向读者介绍帝王蝶的生物学知识",
              "C. 劝说读者在花园里种植马利筋",
              "D. 将帝王蝶与其他迁徙物种作系统比较",
            ],
            answer: "B",
            explanation: "文章全面描述帝王蝴蝶的生命周期，属于说明文体，目的是传递生物学知识。选项 A/C 是呼吁行动，超出文章范围；D 比较未必是重点。",
            optionsAnalysis: {
              A: "【过度推断】文章没有提出法律保护的论点。",
              B: "【正确】描述生命周期各阶段 = 说明目的，inform 最准确。",
              C: "【无依据】文章未呼吁读者种植植物。",
              D: "【部分可能但不全面】比较不是全文主线。",
            },
          },
          {
            id: "qt-purpose-2",
            material: "原文：Remarkably, few critics noticed the glaring flaws in the committee's reasoning.",
            question: "作者对委员会推理的态度最接近哪一项？",
            options: [
              "A. 赞赏",
              "B. 中立",
              "C. 批评",
              "D. 漠不关心",
            ],
            answer: "C",
            explanation: "'Glaring flaws' 直接批评委员会的推理；'remarkably' 暗示作者对批评者的缺席感到不解，整体是批评态度。",
            optionsAnalysis: {
              A: "【与语气矛盾】'glaring flaws' 是批评，与 admiring 相反。",
              B: "【与情感词矛盾】'remarkably' + 'glaring' 表明作者有明显倾向，非中立。",
              C: "【正确】作者用 'glaring flaws'（明显错误）批评委员会推理。",
              D: "【与语气矛盾】作者明显有立场，indifferent（漠然）不符合。",
            },
          },
        ],
      },
      {
        id: "qt-structure",
        title: "篇章结构题",
        content: `篇章结构题考查段落功能、论证层次与信息组织方式。

**常见题目类型**
• 段落功能题：Why does the author include paragraph X? / What is the function of paragraph 3?
• 逻辑关系题：How does the example in paragraph 2 relate to the main argument?
• 文章组织题：How is the passage organized?

**段落常见功能**
• 引入问题/现象 (introduce problem)
• 提供背景 (provide context / background)
• 举例说明 (illustrate with an example)
• 反驳对立观点 (refute counterargument)
• 得出结论 (draw conclusion)
• 过渡衔接 (provide transition)

**文章组织模式**
• 问题—解决方案 (problem → solution)
• 对比/比较 (compare / contrast)
• 时间顺序 (chronological)
• 因果链 (cause → effect)
• 总分总 (general → specific → general)`,
        quiz: [
          {
            id: "qt-struct-1",
            material: "文章结构：先提出一种科学理论；接着给出三个挑战该理论的例子；最后提出修订后的理论。",
            question: "这篇文章最符合哪种组织方式？",
            options: [
              "A. 时间顺序",
              "B. 两个对象的对比",
              "C. 问题/挑战 → 证据 → 修订方案",
              "D. 总到分且没有结论",
            ],
            answer: "C",
            explanation: "文章结构：理论（被质疑的问题）→ 三个挑战例子（证据）→ 修订理论（解决方案），符合 problem-evidence-solution 模式。",
            optionsAnalysis: {
              A: "【不符合】时间顺序需按时间线排列事件，文章是论证结构。",
              B: "【不符合】对比需两个对等对象，此处是理论修正过程。",
              C: "【正确】旧理论被质疑（problem）→ 证据 → 新理论（solution）。",
              D: "【不完整】文章有结论（revised theory），不符合 'without conclusion'。",
            },
          },
        ],
      },
    ],
  },
  {
    id: "genre",
    title: "文体解析",
    children: [
      {
        id: "genre-narrative",
        title: "记叙文",
        content: `记叙文以叙述事件、描写人物为主，常出现在英语考试的人物故事、回忆录、小说选段中。

**核心要素（六要素）**
• Who（谁）/ When（何时）/ Where（何地）
• What（发生什么）/ Why（为何发生）/ How（如何发生）

**常见主题**
• 人物成长与转变
• 克服逆境与挑战
• 人际关系与亲情
• 文化与身份认同

**阅读策略**
1. 快速定位时间线：先后顺序或倒叙结构
2. 关注人物情感变化：from despair to hope / from fear to courage
3. 寻找**转折点**（turning point）：故事改变方向的关键时刻
4. 注意结尾段：通常点明主旨或人物领悟（epiphany）

**高频词汇**
• reminisce 回忆 / reflect 反思 / transform 转变
• bittersweet 苦乐参半 / nostalgic 怀旧的 / resilient 有韧性的`,
      },
      {
        id: "genre-expository",
        title: "说明文",
        content: `说明文以传递信息、解释概念为目的，是英语阅读中最常见的文体。

**文章特征**
• 客观中立的语气
• 大量使用数据、引用、定义
• 逻辑清晰，段落有明确主题句

**常见组织方式**
• 定义→分类→举例（define → classify → exemplify）
• 现象→原因→影响（phenomenon → causes → effects）
• 过程描述（step-by-step process）

**阅读策略**
1. 重点读各段首句（topic sentence），把握文章骨架
2. 数字/年份是细节题的高频考点，快速标注
3. 注意专业术语后的解释性同位语或括号
4. 结尾段总结全文，常有主旨句

**领域分类**
• 科技类：AI、基因、太空探索
• 社会类：教育、贫困、城市化
• 历史类：事件背景与影响
• 环境类：气候变化、生物多样性`,
      },
      {
        id: "genre-argumentative",
        title: "议论文",
        content: `议论文表达作者观点并通过论据加以支撑，是推断题和态度题的主要来源。

**文章结构**
• 引入：提出争议性问题或现象
• 论点：明确表达作者立场（thesis statement）
• 论据：事实、数据、权威引用、类比
• 反驳：承认对立观点（concession），然后反驳
• 结论：重申论点，给出行动呼吁

**阅读重点**
1. 找论点句：通常在引入段末尾或第二段开头
2. 区分**作者观点**与**对立观点**：注意 "critics argue" vs "I contend"
3. 评估论据强度：具体数据 > 个人经历 > 类比
4. 分析让步结构：although / while / admittedly + 反驳

**常见信号词**
• 论点标志：therefore / thus / consequently / it follows that
• 让步标志：admittedly / granted / to be fair / one might argue
• 反驳标志：however / yet / nevertheless / the fact remains`,
      },
      {
        id: "genre-practical",
        title: "应用文",
        content: `应用文包括广告、通知、说明书、邮件、海报等实用性文本。

**特点**
• 目的性极强：传递特定信息
• 格式固定：有时间、地点、联系方式等结构化信息
• 语言简洁：常用省略句、祈使句

**常考类型**
• 广告（advertisement）：找优惠、条件、适合人群
• 通知（notice/announcement）：时间、地点、规则
• 节目单/日程表（schedule/program）：数量、顺序
• 说明书（instructions）：步骤、注意事项

**解题技巧**
1. **先读问题，再带问题阅读**——效率最高
2. 数字、日期、价格是高频考点
3. 注意限制条件：only / except / unless / at least
4. 广告类注意隐含信息（什么人适合 / 不适合）`,
      },
    ],
  },
  {
    id: "strategy",
    title: "解题策略",
    children: [
      {
        id: "strategy-skim",
        title: "略读与扫读",
        content: `略读（Skimming）和扫读（Scanning）是高效阅读的两项核心技能。

**略读（Skimming）——把握大意**
• 目标：快速了解文章主旨和结构
• 方法：只读各段**首句**和**尾句**，跳过中间细节
• 适用：主旨题、结构题、目的题
• 速度目标：200-300词/分钟

**扫读（Scanning）——定位细节**
• 目标：快速找到特定信息（数字、名字、关键词）
• 方法：眼睛快速移动，只找目标词，不逐字阅读
• 适用：细节题、词义题
• 技巧：把题干关键词变成"雷达词"，扫描原文

**两者结合的阅读流程**
1. 略读全文（30-45秒）→ 了解主旨结构
2. 阅读题目 → 提取关键词
3. 扫读定位 → 精读对应段落
4. 对照选项 → 排除干扰

**注意事项**
• 略读不等于不读，重要转折处需放慢速度
• 扫读时定位到段落后，仍需精读上下文 1-2 句`,
        quiz: [
          {
            id: "strategy-skim-1",
            material: "任务：你刚拿到一篇 600 词阅读，第一题问文章整体结构和作者主要观点。",
            question: "此时优先使用哪种阅读方式？",
            options: [
              "A. 扫读具体日期",
              "B. 略读首尾句，把握整体结构",
              "C. 只找某个人名",
              "D. 直接核对某个精确数字",
            ],
            answer: "B",
            explanation: "略读（skimming）用于把握文章整体结构和主旨；扫读（scanning）用于定位具体信息如日期、姓名、数字。",
            optionsAnalysis: {
              A: "【错误】查找日期是扫读（scanning）的任务。",
              B: "【正确】了解整体结构是略读的核心用途。",
              C: "【错误】查找人名需要扫读，不需要略读全文。",
              D: "【错误】查找精确数据用扫读更高效。",
            },
          },
        ],
      },
      {
        id: "strategy-context",
        title: "上下文推断",
        content: `上下文推断（Contextual Inference）是解决生词、推断题和词义题的核心技能。

**推断原则**
• 不依赖记忆中的词义，只依赖文本给出的线索
• 有时一个词的文本语境义与词典义不同
• 推断是"合理猜测"，不是主观臆断

**线索类型**
1. **同义解释**：X is also known as / X, a term that means...
2. **对比关系**：unlike / in contrast / whereas → 对面即反义
3. **因果关系**：because / as a result / therefore → 从因推果
4. **举例线索**：for example / such as → 从例子归纳类别
5. **语气线索**：surprisingly / unfortunately → 暗示方向

**实战步骤**
1. 盖住目标词，用上下文预测含义
2. 从选项中找最接近预测的那个
3. 代入原文验证：句意是否合理

**陷阱**
• 不要选"感觉像"同一词根的选项（形近义远）
• 警惕熟词僻义：table 可以是"提出议案"，check 可以是"阻止"`,
      },
      {
        id: "strategy-eliminate",
        title: "排除干扰项",
        content: `掌握命题方的"出题套路"，可以大幅提高正确率。

**四大错误选项类型**

**① 无中生有（Not Mentioned）**
• 信息在文章中根本没有出现
• 口诀：找得到原文依据才能选

**② 偷换概念（Distortion）**
• 将原文词语替换为相似但含义不同的词
• 例：original 说 "may be related" → 选项说 "is caused by"

**③ 过于绝对（Extreme Statement）**
• 把原文的"可能、有时、部分"变为"一定、总是、所有"
• 警惕词：always / never / all / only / must / every

**④ 范围失当（Scope Error）**
• 过于宽泛：从文章一段的结论推广到所有情况
• 过于具体：用某个细节代替文章整体主旨

**快速排除流程**
1. 先看选项，找明显违反原文的表达
2. 剩余选项找原文依据
3. 两个都有依据时，选**更接近原文表述**的那个`,
        quiz: [
          {
            id: "strategy-elim-1",
            material: "原文：Some researchers believe stress can occasionally improve short-term memory.",
            question: "哪一项属于偷换或绝对化？",
            options: [
              "A. 压力有时可能改善记忆",
              "B. 所有研究者都同意压力总能改善记忆",
              "C. 一些科学家认为压力可能有益于记忆",
              "D. 少数研究者认为压力在某些情况下有帮助",
            ],
            answer: "B",
            explanation: "原文用了 'some researchers' 和 'can occasionally'，选项 B 改成了 'all researchers' 和 'always'，双重绝对化，属于偷换概念+过于绝对。",
            optionsAnalysis: {
              A: "【正确转述】'may sometimes' 对应 'can occasionally'，准确。",
              B: "【双重错误】'all researchers' 改变了 'some'；'always' 改变了 'occasionally'。",
              C: "【正确转述】'certain scientists' 和 'might benefit' 保留了原文不确定性。",
              D: "【正确转述】'a few' 和 'in some cases' 与原文 'some'/'occasionally' 对应。",
            },
          },
        ],
      },
      {
        id: "strategy-locate",
        title: "原文定位技巧",
        content: `快速、准确地定位原文是提高做题效率的关键。

**定位关键词的选择**
• 优先选择：专有名词（人名、地名）、数字、年份
• 次选：不常见的名词或动词（非 be/have/do 等虚词）
• 避免：太常见的词（study, people, problem）作定位词

**段落定位法**
• 阅读每段首句 → 建立"段落地图"
• 不同题目类型对应不同段落：
  - 主旨题 → 首段、尾段
  - 细节题 → 按关键词定位到具体段
  - 推断题 → 跟着情感词/转折词走

**上下文扩展**
• 定位到关键句后，**前后各读 1-2 句**
• 很多答案线索在目标句的上一句（原因）或下一句（解释）

**时间分配建议**
• 略读全文：~45 秒
• 每道细节题定位+作答：~40-60 秒
• 主旨/推断/态度题：~60-90 秒
• 单篇文章总用时：4-6 分钟（约 400-600 词）`,
      },
    ],
  },
];
