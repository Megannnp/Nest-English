import { SINGLE_FEEDBACK_REGRESSION_SAMPLES } from './singleFeedbackSamples.js';

function dimension(name, score, grade, comment, suggestion) {
  const icons = {
    内容: '📝',
    语言: '💬',
    结构: '🧭',
    书写: '✍️',
  };
  return {
    name,
    icon: icons[name],
    score,
    grade,
    comment,
    suggestions: [suggestion],
  };
}

function baseSnapshot(sample, overrides = {}) {
  if (overrides.totalScore == null) {
    throw new Error(
      `[baseSnapshot] totalScore must be explicitly declared for '${sample?.type}'. ` +
      'There is no default — each snapshot must reflect the actual expected quality of the sample, ' +
      'not a generic percentage. Pass a realistic integer score.',
    );
  }
  return {
    sampleId: sample.id,
    type: sample.type,
    writingType: sample.type,
    maxScore: sample.maxScore,
    totalScore: overrides.totalScore,
    tier: overrides.tier || (sample.maxScore >= 25 ? '高档偏上' : '良好'),
    summary: overrides.summary || '任务完成较完整，表达比较自然，但仍有一两个最值得优先打磨的点。',
    categories: overrides.categories || [
      dimension('内容', '', '良', '能基本完成题目要求，信息点较完整，但还可以进一步压实重点。', '回到题目要求，优先补强最能体现任务完成度的那一层内容。'),
      dimension('语言', '', '良', '表达整体通顺，偶有句式略平或搭配不够地道的地方。', '保留原有顺畅度的前提下，再提升一两处关键表达。'),
      dimension('结构', '', '良', '段落分工比较清楚，但开头进入或结尾收束仍可更利落。', '让每一段只承担一个核心任务，并增强过渡与结尾闭合。'),
      dimension('书写', '', '良', '格式与呈现基本规范，仍可再提高整洁度与版面完成度。', '检查分段、标点和格式细节，让呈现更稳。'),
    ],
    highlights: overrides.highlights || {
      vocabulary: [],
      sentences: [],
      content: ['能围绕题目核心任务组织内容，整体完成度较稳定。'],
    },
    grammarIssues: overrides.grammarIssues || [],
    sampleEssay: overrides.sampleEssay || {
      title: '参考范文',
      text: 'This is a placeholder sample essay snapshot and should be replaced with a type-specific model answer in later iterations.',
      highlights: ['开头贴题', '主体分层清楚'],
    },
    improvements: overrides.improvements || [
      { title: '进一步聚焦重点', detail: '建议把最关键的信息或观点说得更靠前、更明确。', technique: '先写中心句，再补细节。' },
      { title: '增强表达层次', detail: '可保留原意不变，替换一两处平直表达，让语言更有辨识度。', technique: '用更准确的动词和连接词。' },
    ],
    weaknesses: overrides.weaknesses || ['重点还可以更集中', '个别表达层次感不足'],
    ...overrides.extra,
  };
}

function findSample(type) {
  return SINGLE_FEEDBACK_REGRESSION_SAMPLES.find((item) => item.type === type);
}

const snapshots = [
  baseSnapshot(findSample('letter'), {
    totalScore: 13,
    summary: '邮件目的明确，邀请信息较完整，语气也比较友好；如果能把推荐理由再压得更具体一些，书信的说服力会更强。',
    categories: [
      dimension('内容', '4/5', '优', '活动时间、地点和邀请目的都已覆盖，两个社团推荐也比较贴题。', '把“为什么适合 Chris”说得更具体一点，邀请会更有针对性。'),
      dimension('语言', '3/4', '良', '表达自然顺畅，邮件语气友好，但个别句子还可以更精练。', '减少重复的友好表达，把空间留给更具体的信息。'),
      dimension('结构', '3/3', '优', '开篇点明写信目的，主体分层清楚，结尾也有明确邀请。', '保持这种“目的前置”的结构优势。'),
      dimension('书写', '3/3', '优', '称呼、正文、结尾和署名完整，邮件格式基本规范。', '继续注意书信格式的完整度和段落清晰度。'),
    ],
    sampleEssay: {
      title: '邀请邮件参考范文',
      text: `Dear Chris,\n\nI am writing to invite you to our club culture festival, which will be held next Friday in the school hall and on the playground.\n\nAmong all the activities, I think the English Drama Club and the Calligraphy Club will interest you most. The drama performance will help you get to know more classmates in a lively way, while the calligraphy activity will give you a close look at Chinese culture.\n\nI would be very happy to go with you, because this is not only a good chance to enjoy school life, but also a great way to make new friends. I hope you can join us.\n\nYours,\nLi Hua`,
      highlights: ['开篇直接点明写信目的', '推荐理由紧扣收信人特点'],
    },
    extra: {
      scenarioAnalysis: { writerRole: '学生', recipientRole: '交换生', purpose: '邀请参加社团文化节', formality: '半正式', relationship: '同龄新同学' },
      taskAnalysis: { hardRequirements: ['时间地点', '两个社团活动', '邀请理由'], implicitGoals: ['友好欢迎', '帮助对方融入校园'], contentChecklist: ['活动信息', '推荐理由', '邀请收束'], commonPitfalls: ['只列活动不解释原因'] },
      formatAnalysis: { greeting: 'Dear Chris', openingTask: '尽快点明写信与邀请目的', bodyTasks: ['介绍活动基本信息', '推荐两个社团并说明原因'], closingExpectation: '表达一起参加的期待', signOff: 'Yours, Li Hua' },
      contentAnalysis: { communicationGoal: '基本达成邀请与介绍双重目标', informationFlow: '目的前置后再补活动与推荐理由', detailStrategy: '理由应更贴近 Chris 的身份与兴趣', openingStrategy: '开篇直接邀请是有效的', closingStrategy: '结尾应再次形成行动闭环', roleAdaptation: '整体语气与同龄交流场景匹配' },
    },
  }),
  baseSnapshot(findSample('speech'), {
    totalScore: 13,
    summary: '演讲稿主题明确，整体语气自然，结尾也有号召力；如果主体层次再拉开一点，现场感染力会更足。',
    categories: [
      dimension('内容', '4/5', '优', '阅读的重要性、个人阅读方式和建议都有回应。', '把“为什么重要”拆成更鲜明的两个层次，观点会更立得住。'),
      dimension('语言', '3/4', '良', '语言自然，适合班会发言，但亮点表达还可以更多。', '加入一两处更有感染力的句式，增强现场感。'),
      dimension('结构', '3/3', '优', '称呼、主体和结尾号召完整，整体闭环清楚。', '让第二段和第三段的分工再更鲜明一些。'),
      dimension('书写', '3/3', '优', '演讲稿格式规范，结尾致谢完整。', '继续保持段落清晰与演讲格式完整。'),
    ],
    sampleEssay: {
      title: '演讲稿参考范文',
      text: `Hello, everyone.\n\nToday I would like to share why reading matters. Reading opens our minds, broadens our horizons and gives us the strength to think more deeply about life.\n\nAs for me, I enjoy reading before going to bed. It is the best time for me to calm down and enter a different world. Sometimes I read novels for enjoyment, and sometimes I read science books to explore new ideas.\n\nI hope each of us can make reading part of daily life. Even ten minutes a day can bring long-term change. Let us keep reading and grow into better versions of ourselves.\n\nThank you!`,
      highlights: ['听众对象明确', '结尾号召自然收束'],
    },
    extra: {
      scenarioAnalysis: { occasion: '英语主题班会', speakerRole: '学生发言者', audience: '同学', formality: '半正式', valueOrientation: '成长与阅读习惯' },
      structure: { greeting: 'Hello, everyone.', bodyPoints: ['阅读的重要性', '个人阅读方式', '给同学的建议'], callToAction: 'Let us keep reading and grow into better versions of ourselves.', closing: 'Thank you!' },
      toneAnalysis: { appropriateness: '整体语气亲切自然，符合班会发言场景。', strengths: ['无明显书面化堆砌', '有基本号召力'], suggestions: ['增加一处更强的钩子句'] },
      contentAnalysis: { communicationGoal: '能完成分享观点并鼓励同学阅读的任务', coreMessage: '阅读帮助人成长', argumentPath: ['阅读的重要性', '个人经验', '面向同学的建议'], evidenceStrategy: '以个人经验作轻度支撑', openingStrategy: '可再增加设问或画面感开头', endingStrategy: '结尾号召清楚但仍可更有力度', audienceAdaptation: '内容与校园听众的日常经验较贴合' },
    },
  }),
  baseSnapshot(findSample('summary'), {
    totalScore: 21,
    summary: '概要部分抓住了原文主旨，述评也有清楚立场；下一步最值得提升的是评论层次，让理由展开更有递进感。',
    categories: [
      dimension('内容', '8/10', '良', '概括与评论两项任务都完成了，内容整体贴题。', '评论段可以再补一个更扎实的现实支撑点。'),
      dimension('语言', '5/6', '良', '整体表达准确，书面语感较稳定。', '少量句子还可以再压缩，提高概括力度。'),
      dimension('结构', '5/5', '优', '先概后评结构明确，段落关系清楚。', '继续保持“概括和评论分区清晰”的优势。'),
      dimension('书写', '3/4', '良', '篇幅与呈现基本合规。', '继续控制概括和评论的篇幅比例。'),
    ],
    sampleEssay: {
      title: '概要述评参考范文',
      text: `The passage points out that AI learning tools can improve efficiency by offering quick information, personalized practice and immediate feedback. Meanwhile, overdependence on them may weaken students' independent thinking and deep reading. Therefore, AI should serve as a helpful assistant rather than a replacement for learners.\n\nI agree with this view. AI is most valuable when it supports, rather than controls, the learning process. Students may save time by using AI, but real growth still depends on careful reading, independent judgment and active thinking. In my opinion, the wise use of AI means making good use of its convenience while keeping our own minds fully engaged.`,
      highlights: ['概括紧扣主旨', '评论立场清楚'],
    },
    extra: {
      materialAnalysis: { materialType: '议论性材料', topic: 'AI 学习工具', coreMessage: 'AI 应作为辅助者而不是替代者', keyInfo: ['便利性', '风险', '合理使用'] },
      structureAnalysis: { summaryTask: '先客观概括原文主旨与利弊', commentaryTask: '再独立表达观点并说明理由', paragraphPlan: ['第一段概括', '第二段评论'], coherenceTips: ['不要把个人评价提前混进概要部分'] },
      commentaryAnalysis: { stance: '赞同 AI 作为辅助工具的观点', reasoningPath: ['承认 AI 便利性', '指出过度依赖的风险', '提出合理使用原则'], valueFocus: '独立思考与主动学习', risks: ['评论理由略单薄'] },
      contentAnalysis: { communicationGoal: '较好完成了概括与述评的双重任务', informationFlow: '先概后评顺序清楚', detailStrategy: '评论部分可增加现实学习情境支撑', openingStrategy: '概括开篇直接入题是正确的', closingStrategy: '结尾回扣价值判断较自然', roleAdaptation: '整体语体符合考场书面表达' },
    },
  }),
  baseSnapshot(findSample('continuation'), {
    totalScore: 22,
    summary: '续写承接自然，人物情感和主题回扣都比较稳；如果中间过程再多一个小波折，故事张力会更强。',
    categories: [
      dimension('内容', '9/10', '优', '情节发展完整，能够回应原文设定并形成温暖收束。', '在等待女儿到来前可增加一点过程细节，增强现场感。'),
      dimension('语言', '5/6', '良', '表达顺畅，情感色彩自然。', '可以增加一两处更具体的动作描写，让画面更鲜活。'),
      dimension('结构', '5/5', '优', '两段分工清楚，结尾也完成了主题回扣。', '继续保持段首句承接与段尾收束的稳定性。'),
      dimension('书写', '3/4', '良', '续写篇幅与分段较合理。', '继续注意段内句式变化与版面整洁。'),
    ],
    sampleEssay: {
      title: '续写参考范文',
      text: `I walked up to him and asked if I could help. The old man said in a trembling voice that he could not find his bus card and had no idea how to get home in the heavy rain. I held the umbrella over him, used my phone to call his daughter and stayed by his side to calm him down. When she finally arrived, her worried face quickly softened into relief. She thanked me again and again, and the old man squeezed my hand with gratitude.\n\nWhen I finally got home, the rain had stopped. Although I was wet and tired, I felt a deep warmth in my heart. After hearing what had happened, my mother smiled and said that a small act of kindness could mean the world to someone in need. Lying in bed that night, I understood more clearly that kindness may seem ordinary, but it can brighten the darkest moment of another person's day.`,
      highlights: ['情节承接稳', '结尾主题回扣自然'],
    },
    extra: {
      logicStructure: { coherence: '两段任务分工明确，第一段解决问题，第二段完成情感收束。', transitionQuality: '段首句承接较自然，结尾回扣主题比较完整。', flowIssues: ['中段张力还可略增强'] },
      storyLine: { who: '作者、老人、老人的女儿', when: '雨夜放学路上', where: '路边到回家途中', why: '老人丢失公交卡且无助', what: '作者主动帮助并联系家人', result: '老人顺利回家，作者获得温暖感悟' },
      emotionLine: { initial: '担心与犹豫', changes: ['主动靠近', '陪伴安慰', '收获感动'], tone: '温暖治愈' },
      contentAnalysis: { communicationGoal: '较好完成了续写任务，情节和主题都能闭合', plotLogic: { accuracy: '续写方向与原文困境高度一致', coherence: '事件推进自然，没有明显跳步', closure: '结尾兼顾结果与感悟', score: '优' }, characterConsistency: { motivation: '主动帮助的行为与人物善意动机一致', emotion: '情感推进真实自然', score: '优' }, themeAlignment: { comment: '善意帮助他人的主题得到自然升华', score: '优' } },
    },
  }),
  baseSnapshot(findSample('argumentative'), {
    totalScore: 21,
    summary: '观点鲜明，论证方向也比较集中；如果例证再具体一点，整篇议论文的说服力会更强。',
    categories: [
      dimension('内容', '8/10', '良', '论点清楚，主体论证方向正确，但例子略显概括，支撑力度还可以更强。', '选一个更具体的现实例子替换掉概括性描述，让论证落地。'),
      dimension('语言', '6/6', '优', '书面语感稳定，连接词使用得当，论证推进流畅。', '保持这种"先承认后转折"的句式优势。'),
      dimension('结构', '4/5', '良', '总分总框架清晰，段落之间逻辑递进，结尾回扣有力。', '主体第二段可以更鲜明地和第一段形成对比或递进关系。'),
      dimension('书写', '3/4', '良', '篇幅和段落安排基本合理，无明显格式问题。', '注意论证段落不要过于均匀，可以适当侧重核心论点那段。'),
    ],
    sampleEssay: {
      title: '议论文参考范文',
      text: `I believe self-discipline is more important than talent. Talent may offer a quick start, but self-discipline decides whether a person can keep improving.\n\nTo begin with, success requires steady effort. A talented student may shine at first, yet without practice and persistence, that advantage soon fades. In contrast, a disciplined student keeps working even when progress is slow. Besides, self-discipline helps people manage time, resist distraction and stay focused on long-term goals.\n\nOf course, talent is valuable, but it cannot replace daily effort. In my view, self-discipline is the force that turns potential into real achievement.`,
      highlights: ['论点鲜明', '结论回扣明确'],
    },
    extra: {
      thesisAnalysis: { position: '开篇首段直接亮出观点', clarity: 88, suggestions: ['可补一处更有辨识度的中心句表达'] },
      evidenceEvaluation: { sufficiency: 78, relevance: 86, missingEvidence: ['缺少更具体的现实或个人例子'] },
      logicStructure: { coherence: '总分总结构清楚，论证方向集中。', transitionQuality: '使用了基本递进衔接，但层次感仍可更强。', flowIssues: ['例证略概括'] },
    },
  }),
  baseSnapshot(findSample('notice'), {
    totalScore: 13,
    summary: '通知格式完整，关键信息清楚，整体表达也比较简洁；如果参与要求再压成更醒目的动作提示，会更像高质量通知。',
    categories: [
      dimension('内容', '5/5', '优', '时间、地点、主讲人和参与要求四项硬信息全部覆盖，无遗漏。', '继续保持"信息无一遗漏"的完整度优势。'),
      dimension('语言', '4/4', '优', '语言简洁规范，用词正式，适合通知场景。', '保持这种简洁直接的表达风格。'),
      dimension('结构', '2/3', '良', '开篇点明事项，结尾给出参与要求，整体顺序清楚，但过渡略可更流畅。', '在"讲座信息"和"参与要求"之间加一句简短过渡，结构会更紧凑。'),
      dimension('书写', '2/3', '良', '标题和落款规范，但日期位置和格式还可以更规范一些。', '将日期单独另起一行，与发布方落款对齐。'),
    ],
    sampleEssay: {
      title: '通知参考范文',
      text: `Notice\n\nTo raise students' awareness of environmental protection, an English lecture on garbage sorting will be held this Friday afternoon.\n\nThe lecture will start at 4:00 p.m. in the school lecture hall. Mr. Green, an expert in environmental education, will introduce the importance of garbage sorting and share practical advice for daily life.\n\nAll students are welcome. Please arrive ten minutes early and keep quiet during the lecture. A short question-and-answer session will follow.\n\nThe Students' Union\nApril 10, 2026`,
      highlights: ['格式完整', '信息闭环清楚'],
    },
    extra: {
      scenarioAnalysis: { writerRole: '学生会', recipientRole: '全体学生', purpose: '发布讲座通知', formality: '正式', relationship: '组织对学生' },
      taskAnalysis: { hardRequirements: ['时间', '地点', '主讲人', '参与要求'], implicitGoals: ['让受众快速理解并按要求参加'], contentChecklist: ['事项', '细节', '要求'], commonPitfalls: ['遗漏落款或时间信息'] },
      formatAnalysis: { greeting: '无需称呼', openingTask: '开头直接点明通知事项', bodyTasks: ['说明讲座基本信息', '给出参与要求'], closingExpectation: '以行动提示而非客套语收束', signOff: '学生会 + 日期' },
      contentAnalysis: { communicationGoal: '较好完成告知与行动引导任务', informationFlow: '先事项后细节再要求，顺序清楚', detailStrategy: '参与要求还可再更醒目', openingStrategy: '开头直陈事项是有效的', closingStrategy: '结尾应保留清晰的行动提示', roleAdaptation: '正式语体与通知场景匹配' },
    },
  }),
  baseSnapshot(findSample('narrative'), {
    totalScore: 21,
    summary: '记叙主线稳定，情绪变化也比较自然；如果练习过程的细节再多一点，成长感会更立体。',
    categories: [
      dimension('内容', '8/10', '良', '主线完整，事件经过、情绪转变和结尾感悟都有覆盖，但练习过程的画面感不足。', '在描写练习阶段时加入一两个具体动作细节，让读者看到而不只是听到。'),
      dimension('语言', '5/6', '良', '语言流畅，时态统一，偶有句式略平的地方。', '在感情最强的地方换一个更有张力的句式，制造情感高点。'),
      dimension('结构', '5/5', '优', '起因、经过、结果和感悟顺序清晰，段落衔接自然。', '继续保持这种"事件驱动"的叙事节奏。'),
      dimension('书写', '3/4', '良', '篇幅合理，分段清楚，无明显格式问题。', '确保每段都以一个核心动作或情绪为中心，不要一段内跳跃太多。'),
    ],
    sampleEssay: {
      title: '记叙文参考范文',
      text: `Last semester, I was chosen to speak at the school flag-raising ceremony. At first, I felt proud, but the closer the day came, the more nervous I became.\n\nSeeing my fear, my English teacher encouraged me to practise step by step. I first spoke in front of the mirror, then in front of a few classmates. Little by little, I became more confident.\n\nWhen the day finally arrived, I took a deep breath and walked onto the stage. I completed the speech successfully and heard warm applause from the playground. At that moment, I understood that courage does not mean the absence of fear. It means moving forward even when fear is still there.`,
      highlights: ['主线清楚', '结尾成长落点明确'],
    },
    extra: {
      storyLine: { who: '作者、英语老师、同学', when: '上学期', where: '学校升旗仪式前后', why: '作者需要公开发言但很紧张', what: '在老师帮助下逐步练习并完成发言', result: '作者收获勇气与成长' },
      emotionLine: { initial: '兴奋转为紧张', changes: ['害怕', '练习中逐渐稳定', '成功后的释然与自信'], tone: '积极成长' },
      contentAnalysis: { communicationGoal: '主线完整，能围绕成长经历展开', informationFlow: '从困难到帮助再到突破，顺序自然', detailStrategy: '练习过程还可更具画面感', openingStrategy: '开篇交代任务与紧张感较有效', closingStrategy: '结尾感悟与事件联系紧密', themeAlignment: { comment: '成长主题表达自然，没有生硬拔高。', score: '优' } },
    },
  }),
  baseSnapshot(findSample('expository'), {
    totalScore: 13,
    summary: '说明对象明确，条理也比较清楚；如果建议部分再更具体一点，说明文的实用性会更强。',
    categories: [
      dimension('内容', '5/5', '优', '说明了运动的重要性，并给出了具体建议，任务完成较完整。', '建议部分可以补充场景（如课间、放学后），让建议更容易落地执行。'),
      dimension('语言', '4/4', '优', '语言客观准确，说明性语体感强，无明显语法错误。', '保持这种"陈述 + 说明原因"的句式模式。'),
      dimension('结构', '2/3', '良', '先说重要性再给建议，整体条理清楚，但建议部分展开略少，显得收尾仓促。', '建议段可以拆分为两个小点，让每条建议都有一句理由支撑。'),
      dimension('书写', '2/3', '良', '篇幅基本合理，但建议部分与说明部分篇幅比例可以更均衡。', '让建议部分的字数和前半段相当，体现同等重视。'),
    ],
    sampleEssay: {
      title: '说明文参考范文',
      text: `Taking regular exercise is one of the most important habits a student can develop. It not only keeps the body healthy, but also helps the mind stay alert and focused throughout the day.\n\nThere are many simple ways to get enough exercise in daily life. Walking or cycling to school instead of taking the bus is a good start. Joining a sports club after school is another effective option. Even short breaks between study sessions — such as ten minutes of stretching or a brisk walk — can make a real difference. The key is to stay consistent rather than trying to do too much at once.\n\nIn short, exercise does not have to be intense or time-consuming. Small, regular habits built into the school day are enough to improve both physical health and academic performance.`,
      highlights: ['建议具体可操作', '结尾总结有力'],
    },
    extra: {
      logicStructure: { coherence: '先说明好处再提出建议，整体条理较清楚。', transitionQuality: '基本衔接自然，但层次变化仍可更鲜明。', flowIssues: ['建议部分展开偏少'] },
      contentAnalysis: { communicationGoal: '能完成说明锻炼重要性并提出建议的任务', informationFlow: '先讲意义后给做法，顺序合理', detailStrategy: '建议可更具体到频率或场景', openingStrategy: '开头直接定义主题是有效的', closingStrategy: '结尾收束自然但可更有总结力', roleAdaptation: '符合一般说明文语体' },
    },
  }),
  baseSnapshot(findSample('diary'), {
    totalScore: 13,
    summary: '日记格式基本规范，事件和情感都有交代；如果中间的心理变化再细一点，记录感会更真实。',
    categories: [
      dimension('内容', '5/5', '优', '活动内容、情绪变化和结尾感悟都有涉及，任务完成度较高。', '可以在疲惫和满足之间增加一个转折细节，让情绪变化更有层次。'),
      dimension('语言', '4/4', '优', '表达自然，第一人称视角保持一致，语气贴合日记场景。', '保持这种真实口语化和书面感的平衡。'),
      dimension('结构', '2/3', '良', '日期格式正确，事件推进基本自然，但中段略显平铺。', '把"疲惫"和"开心"的心理转折写得更明显，让读者感受到情绪的真实跳动。'),
      dimension('书写', '2/3', '良', '格式规范，但篇幅偏短，感悟部分收束略仓促。', '结尾感悟再展开一句，体现当天最深的收获或期许。'),
    ],
    sampleEssay: {
      title: '日记参考范文',
      text: `Friday, April 11   Sunny\n\nToday our class took part in a tree-planting activity on the hillside near school. When I first arrived, I felt excited, but after an hour of digging and carrying soil under the warm sun, my arms were aching and I was covered in dirt.\n\nJust as I was starting to feel tired, I looked around and saw everyone working together quietly and seriously. Something shifted in me. I picked up my shovel again and kept going.\n\nBy the end of the day, the hillside was dotted with small, freshly planted trees. They looked fragile, but I knew they would grow. Standing there, I felt a quiet pride — not just because of the trees, but because I had pushed through when I wanted to stop. I hope to come back one day and see how tall they have grown.`,
      highlights: ['情绪变化真实', '结尾感悟与事件紧密相连'],
    },
    extra: {
      formatAnalysis: { greeting: 'Friday Sunny', openingTask: '保留日期天气并快速进入当天事件', bodyTasks: ['记录活动经过', '写出情绪变化'], closingExpectation: '以感悟或期许收束', signOff: '无需额外落款' },
      emotionLine: { initial: '平常参与活动', changes: ['疲惫', '看到成果后的开心与自豪'], tone: '真实积极' },
      taskAnalysis: { hardRequirements: ['活动内容', '感受', '收获'], implicitGoals: ['体现记录感与真实情绪'], contentChecklist: ['时间天气', '事件经过', '感悟'], commonPitfalls: ['只写事情不写感受'] },
      contentAnalysis: { communicationGoal: '较好完成了日记的记录与感悟任务', informationFlow: '事件推进比较自然', detailStrategy: '心理细节可更细腻', openingStrategy: '开篇格式较规范', closingStrategy: '结尾感悟贴合前文', roleAdaptation: '第一人称视角保持稳定' },
    },
  }),
  baseSnapshot(findSample('chart_writing'), {
    totalScore: 21,
    summary: '图表描述准确，趋势也抓得比较准；如果原因分析再更聚焦图表信息，整篇会更有说服力。',
    categories: [
      dimension('内容', '9/10', '优', '整体趋势、关键数据对比和原因分析三部分都有覆盖，任务完成较完整。', '原因分析可以更直接地呼应图表中变化最显著的那一项，而不是泛泛而谈。'),
      dimension('语言', '5/6', '良', '客观描述语气稳定，数据表达清楚，用词基本准确。', '在描述趋势时，尝试用"nearly double""significantly outpace"等更精准的表达。'),
      dimension('结构', '4/5', '良', '先描述后分析的顺序正确，段落功能清晰，但数据段和分析段之间的过渡略显生硬。', '在数据描述段末尾加一句小结，自然引出后面的原因分析。'),
      dimension('书写', '3/4', '良', '篇幅合理，分段清楚，整体呈现规范。', '注意每段的开头句要直接点明该段的核心功能（描述趋势/分析原因/总结）。'),
    ],
    sampleEssay: {
      title: '图表作文参考范文',
      text: `The bar chart shows changes in the amount of time students spent reading outside school between 2015 and 2023. Overall, the proportion of students who read for more than 60 minutes per day increased significantly, while the share of those reading for less than 30 minutes declined.\n\nIn 2015, about 15% of students read for over an hour each day. By 2023, that figure had risen to nearly 35%, more than doubling over eight years. Meanwhile, the percentage of students reading for under 30 minutes fell from approximately 50% to just 28%. The middle group, those reading between 30 and 60 minutes, remained relatively stable.\n\nSeveral factors may explain this shift. The growing availability of digital reading platforms has made it easier for students to access books and articles. In addition, schools have placed greater emphasis on developing reading habits through guided reading programmes. These combined efforts appear to have encouraged longer and more sustained reading among students.`,
      highlights: ['趋势概括精准', '原因分析紧扣图表变化'],
    },
    extra: {
      materialAnalysis: { materialType: '比例变化图表', topic: '学生课外阅读时间变化', coreMessage: '长时阅读比例明显上升', keyInfo: ['30分钟以下下降', '30到60分钟略升', '60分钟以上翻倍'] },
      taskAnalysis: { hardRequirements: ['描述图表', '概括趋势', '简要分析原因'], implicitGoals: ['先忠实读图再合理分析'], contentChecklist: ['总趋势', '关键对比', '原因分析'], commonPitfalls: ['只堆数字不总结趋势'] },
      structureAnalysis: { introTask: '首段概述整体变化趋势', summaryTask: '主体说明各项数据变化', commentaryTask: '补出原因分析', endingTask: '简要总结图表意义', paragraphPlan: ['概述趋势', '细节数据', '原因分析与总结'], coherenceTips: ['每段只承担一种功能'] },
      contentAnalysis: { communicationGoal: '完成了描述与分析双重任务', informationFlow: '先描述再分析，基本清楚', detailStrategy: '原因分析仍可更贴着图表变化展开', openingStrategy: '开头概述有效', closingStrategy: '结尾总结自然', roleAdaptation: '整体符合图表作文客观语体' },
    },
  }),
  baseSnapshot(findSample('report'), {
    totalScore: 13,
    summary: '报告结构比较像样，调查对象、发现和建议都有覆盖；下一步可以让”发现”和”建议”的对应关系更紧一些。',
    categories: [
      dimension('内容', '5/5', '优', '调查对象、主要发现和改进建议三项硬要求全部覆盖，内容完整。', '建议可以和发现一一对应，让每条问题都有明确的解决方向。'),
      dimension('语言', '4/4', '优', '语言客观正式，符合报告语体，措辞准确。', '保持这种客观陈述语气，避免加入个人情感色彩。'),
      dimension('结构', '2/3', '良', '调查说明、发现和建议顺序正确，但建议部分和发现部分之间的逻辑对应不够清晰。', '在建议段开头用”Based on the findings above”或类似表达，建立与发现段的明确联系。'),
      dimension('书写', '2/3', '良', '篇幅适中，格式基本规范，但报告标题和结尾可以更正式一些。', '确保报告有明确标题，结尾用一句总结性建议收束，而不是直接停止。'),
    ],
    sampleEssay: {
      title: '调查报告参考范文',
      text: `A Survey Report on Student Satisfaction with the School Canteen\n\nThis survey was conducted among 200 students from all year groups using questionnaires. The aim was to gather feedback on the quality, variety and pricing of canteen food.\n\nThe findings revealed that while most students were satisfied with the pricing, many expressed concerns about food variety and freshness. Around 60% of respondents felt that the menu lacked healthy options, and over 40% reported that food was sometimes not freshly prepared. In addition, the seating capacity was considered insufficient during peak hours.\n\nBased on these findings, the following improvements are recommended. First, the canteen should introduce at least three new healthy dishes each week and rotate the menu monthly. Second, stricter food preparation standards should be enforced to ensure freshness. Finally, adding more seating in the dining area would significantly reduce crowding at lunchtime.`,
      highlights: ['发现与建议一一对应', '报告结构规范完整'],
    },
    extra: {
      scenarioAnalysis: { writerRole: '调查报告撰写人', recipientRole: '学校相关管理方', purpose: '汇报食堂满意度调查结果', formality: '正式', relationship: '学生向学校反馈' },
      formatAnalysis: { greeting: '无需称呼', openingTask: '首段交代调查对象与方式', bodyTasks: ['概括主要发现', '给出改进建议'], closingExpectation: '以结论与建议收束', signOff: '保留报告标题即可' },
      taskAnalysis: { hardRequirements: ['调查对象与方式', '主要发现', '建议'], implicitGoals: ['让建议建立在调查结果之上'], contentChecklist: ['调查说明', '发现', '建议'], commonPitfalls: ['只有描述没有结论'] },
      contentAnalysis: { communicationGoal: '能完成调查汇报的基础任务', informationFlow: '事实、问题、建议顺序清楚', detailStrategy: '建议还可和发现一一对应', openingStrategy: '开头交代调查背景较清楚', closingStrategy: '结尾建议较实用', roleAdaptation: '客观语气基本符合报告体' },
    },
  }),
  baseSnapshot(findSample('proposal'), {
    totalScore: 21,
    summary: '倡议对象明确，问题、意义和行动也形成了闭环；如果行动建议再多一点层次，号召力会更足。',
    categories: [
      dimension('内容', '8/10', '良', '浪费现象、节水必要性和具体行动三个要素都有涉及，但行动建议只有一个层次，说服力还可以更强。', '再补一个具体场景的行动建议，比如"关闭水龙头"之外再加"节约用水报告浪费行为"。'),
      dimension('语言', '6/6', '优', '语气真诚有力，号召性强，适合倡议书场景，无语法错误。', '保持这种"我们一起"的集体感语气，避免过于说教。'),
      dimension('结构', '4/5', '良', '问题→意义→行动的三段式结构清晰，各段功能分明。', '结尾号召句可以更短更有力，成为全文的情感最高点。'),
      dimension('书写', '3/4', '良', '篇幅合理，无格式错误，段落之间衔接流畅。', '倡议书开头可以用一句更有冲击力的问题或数据来吸引读者注意。'),
    ],
    sampleEssay: {
      title: '倡议书参考范文',
      text: `Dear fellow students,\n\nHave you ever noticed a tap left running in the school bathroom, or seen a half-full cup of water thrown away without a second thought? Water waste is happening around us every day, and it is time we did something about it.\n\nWater is not an unlimited resource. In many parts of the world, people struggle to access clean drinking water. Wasting it here means taking it away from those who need it most. By saving water at school, we are not only reducing costs for our community, but also taking responsibility for a global problem.\n\nStarting today, let us all take small but meaningful steps. Turn off taps properly after use. Report any leaking pipes to school maintenance. Encourage classmates to refill bottles rather than using disposable cups. Together, these small actions can make a real difference. Let us be the generation that takes water seriously.`,
      highlights: ['号召语气有力', '行动建议具体分层'],
    },
    extra: {
      scenarioAnalysis: { writerRole: '校园倡议发起者', recipientRole: '全体同学', purpose: '号召节约用水', formality: '半正式', relationship: '同学间倡议' },
      taskAnalysis: { hardRequirements: ['浪费现象', '必要性', '倡议行动'], implicitGoals: ['体现责任意识与行动导向'], contentChecklist: ['问题', '意义', '行动'], commonPitfalls: ['只有口号没有做法'] },
      structure: { openingPosition: '指出浪费现象并点题', bodyPoints: ['说明节水必要性', '提出具体行动'], callToAction: '号召大家立刻行动', closing: '形成价值收束' },
      toneAnalysis: { appropriateness: '整体语气真诚积极，符合倡议书场景。', strengths: ['有行动感', '有价值导向'], suggestions: ['可增加更具体的行动层次'] },
      contentAnalysis: { communicationGoal: '较好完成倡议任务', informationFlow: '问题 - 意义 - 行动的顺序较稳定', detailStrategy: '行动建议可再细化到更多场景', openingStrategy: '开头切入问题较直接', closingStrategy: '结尾号召明确', roleAdaptation: '对校园同学的表达较自然' },
    },
  }),
  baseSnapshot(findSample('review'), {
    totalScore: 21,
    summary: '作品概括和个人感受都比较清楚，启示也有落点；如果理由展开再具体一点，观后感会更有层次。',
    categories: [
      dimension('内容', '8/10', '良', '作品内容概括到位，个人感受和启示也有交代，但支撑感受的具体情节引用略少。', '在表达"最打动我"的部分时，具体引用一个电影场景来支撑，会更有说服力。'),
      dimension('语言', '6/6', '优', '语言流畅，感情真实，表达个人观点的句式多样。', '保持这种"评价 + 个人感受"的复合句式。'),
      dimension('结构', '4/5', '良', '先概括再感受再启示，段落功能清晰，逻辑递进自然。', '启示段可以从"对我个人"扩展到"对所有年轻人"，让结尾更有力度。'),
      dimension('书写', '3/4', '良', '篇幅合理，段落之间过渡流畅，无格式问题。', '开头可以用一句更强的引语或悬念来吸引读者。'),
    ],
    sampleEssay: {
      title: '观后感参考范文',
      text: `The film The Pursuit of Happyness tells the story of Chris Gardner, a man who refuses to give up on his dream of becoming a stockbroker while struggling to raise his young son with almost no money. What struck me most was not just his determination, but the quiet dignity with which he faced every setback.\n\nIn one scene, Chris and his son spend the night in a public bathroom because they have nowhere else to sleep. Chris tells his son that this is just a part of their adventure, shielding him from despair with nothing but love and words. That moment moved me deeply because it showed that true strength is not about having everything — it is about protecting the people who depend on you, even when you have nothing left.\n\nWatching this film reminded me that difficult circumstances do not define a person. What defines us is how we choose to respond. I walked away determined to face my own challenges with more patience and persistence, because if Chris Gardner could hold on through all of that, so can I.`,
      highlights: ['作品情节具体引用', '启示与自身实际结合'],
    },
    extra: {
      materialAnalysis: { materialType: '电影', topic: 'The Pursuit of Happyness', coreMessage: '在困境中坚持与担当', keyInfo: ['主人公困境', '不放弃', '亲情与责任'] },
      commentaryAnalysis: { stance: '影片最打动人的是主人公的坚持与责任感', reasoningPath: ['简述作品内容', '指出打动自己的原因', '提炼个人启示'], valueFocus: '坚持、责任与自我信念', risks: ['理由还可更具体'] },
      contentAnalysis: { communicationGoal: '较好完成了作品概括与个人感想表达', informationFlow: '先概括再感受再启示，顺序清楚', detailStrategy: '可增加一处具体情节支撑感受', openingStrategy: '开头交代作品较自然', closingStrategy: '结尾启示收束较稳', roleAdaptation: '整体符合观后感表达习惯' },
    },
  }),
  baseSnapshot(findSample('picture_writing'), {
    totalScore: 21,
    summary: '画面信息抓得比较准，叙述也连贯；如果中间人物反应再具体一点，看图写话会更有现场感。',
    categories: [
      dimension('内容', '9/10', '优', '画面人物、主要动作、帮助结果和情感收束都有覆盖，图文对应较准确。', '老人被扶过马路后的具体反应（表情/语言）可以再写一句，让画面更完整。'),
      dimension('语言', '5/6', '良', '叙述语言连贯，动词选用比较准确，整体表达流畅。', '帮助过程中加入一两个更具画面感的动词（如"gently guided"），提升现场感。'),
      dimension('结构', '4/5', '良', '按照画面发展顺序叙事，起因、经过、结果层次清楚。', '结尾感悟可以和画面主题更紧密，避免感悟过于泛化。'),
      dimension('书写', '3/4', '良', '篇幅合理，分段清楚，没有格式错误。', '开头可以用一句环境描写快速带入画面场景，让读者更快进入状态。'),
    ],
    sampleEssay: {
      title: '看图写话参考范文',
      text: `One afternoon after school, as the sun cast long shadows across the road, two students noticed an elderly man standing at the edge of the pavement, looking uncertain. The traffic was heavy, and he seemed unsure of how to cross safely.\n\nWithout hesitating, one of the students stepped forward and asked gently, "Excuse me, sir. Would you like some help crossing the road?" The old man's face softened with relief. The student offered his arm, and together they waited for the traffic to stop. The other student stood nearby, watching for cars on the other side.\n\nWhen they reached the other pavement, the old man turned and thanked them with a warm smile. "Young people like you give me hope," he said quietly. Walking home afterwards, both students felt a quiet happiness that was hard to explain. They had not done anything extraordinary — but somehow, it had felt like exactly the right thing to do.`,
      highlights: ['图文对应准确', '人物反应细腻自然', '结尾感悟不生硬'],
    },
    extra: {
      storyLine: { who: '两名学生和一位老人', when: '放学路上', where: '路边与街道', why: '老人不知如何安全过马路', what: '学生上前询问并扶老人过马路', result: '老人顺利过街，学生获得助人感受' },
      taskAnalysis: { hardRequirements: ['画面人物', '主要动作', '结果与感受'], implicitGoals: ['图文对应、叙述连贯'], contentChecklist: ['发现老人', '提供帮助', '完成过街', '表达感受'], commonPitfalls: ['过度脱离图片扩写'] },
      contentAnalysis: { communicationGoal: '较好完成看图写话任务', informationFlow: '按照画面发展顺序组织内容，整体清楚', detailStrategy: '人物反应细节可更丰富', openingStrategy: '开头迅速交代画面场景是有效的', closingStrategy: '结尾升华自然但不夸张', roleAdaptation: '整体叙述符合助人主题场景' },
    },
  }),
];

export const SINGLE_FEEDBACK_REGRESSION_SNAPSHOTS = snapshots;

export function getSingleFeedbackSnapshotBySampleId(sampleId) {
  return SINGLE_FEEDBACK_REGRESSION_SNAPSHOTS.find((item) => item.sampleId === sampleId) || null;
}

