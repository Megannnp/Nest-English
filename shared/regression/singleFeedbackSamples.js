export const SINGLE_FEEDBACK_REGRESSION_TYPES = [
  'continuation',
  'argumentative',
  'summary',
  'speech',
  'letter',
  'notice',
  'narrative',
  'expository',
  'diary',
  'chart_writing',
  'report',
  'proposal',
  'review',
  'picture_writing',
];

function createExpectations(requiredFeedbackFields, extra = {}) {
  return {
    requiredDimensions: ['内容', '语言', '结构', '书写'],
    requiredFeedbackFields,
    ...extra,
  };
}

export const SINGLE_FEEDBACK_REGRESSION_SAMPLES = [
  {
    id: 'single-letter-invitation',
    type: 'letter',
    title: '邀请外国交换生参加社团文化节',
    maxScore: 15,
    submissionMode: 'text',
    promptText: `假定你是李华，你校下周将举办社团文化节。请你给新来的英国交换生 Chris 写一封邮件，内容包括：
1. 活动时间与地点；
2. 你推荐他参加的两个社团活动；
3. 邀请他一起参加并说明原因。
注意：词数 80 左右。`,
    studentText: `Dear Chris,
I am very glad that you come to our school. Our club culture festival will be held next Friday in the school hall and on the playground. I am writing to invite you to join it with me.

There will be many interesting activities. I strongly recommend the English Drama Club because students will perform a short play about friendship, which may help you know more classmates. The Calligraphy Club is also worth visiting. You can see how Chinese characters are written and even try writing some by yourself.

I hope you can come with me, because it is a good chance for you to experience our school life and Chinese culture. I am sure we will have a wonderful afternoon together.

Yours,
Li Hua`,
    expectations: createExpectations([
      'scenarioAnalysis',
      'formatAnalysis',
      'taskAnalysis',
      'contentAnalysis',
    ], {
      focus: '交际对象适配、邀请目的闭环、邮件格式完整',
    }),
  },
  {
    id: 'single-speech-reading',
    type: 'speech',
    title: '班会演讲：Why Reading Matters',
    maxScore: 15,
    submissionMode: 'text',
    promptText: `你将在英语主题班会上做题为“Why Reading Matters”的发言，请写一篇演讲稿，内容包括：
1. 阅读的重要性；
2. 你喜欢的阅读方式；
3. 对同学们的建议。
注意：词数 80 左右。`,
    studentText: `Hello, everyone.

It is my great honor to share my ideas on reading. In my opinion, reading is important because it not only opens our minds but also helps us understand the world in a deeper way. When we read, we can learn from great people and gain courage from their stories.

As for me, I enjoy reading before going to bed. It is a quiet moment when I can slow down and think carefully. Sometimes I read novels to relax, and sometimes I read science books to learn something new.

I suggest that all of us make a small reading plan and keep it day after day. Even ten minutes a day can make a big difference. Let us enjoy reading and grow together.

Thank you!`,
    expectations: createExpectations([
      'scenarioAnalysis',
      'structure',
      'toneAnalysis',
      'contentAnalysis',
    ], {
      focus: '听众适配、开头吸引力、分论点展开与号召收束',
    }),
  },
  {
    id: 'single-summary-commentary-ai',
    type: 'summary',
    title: 'AI 学习工具的利与弊',
    maxScore: 25,
    submissionMode: 'text',
    promptText: `阅读下面短文，然后写一篇概要与述评。
短文大意：文章介绍了 AI 学习工具给学生带来的便利，如快速查找资料、个性化练习与即时反馈；同时指出过度依赖 AI 会削弱独立思考、影响深度阅读。文章认为学生应把 AI 视为辅助者，而非替代者。
写作要求：
1. 用约 40 词概括原文要点；
2. 再用约 80 词谈谈你的看法。`,
    studentText: `The passage explains that AI learning tools are helpful because they can provide quick information, personal practice and timely feedback. However, too much dependence on them may weaken students' independent thinking and deep reading. Therefore, AI should be used as a tool instead of a substitute for students' own efforts.

From my point of view, AI is useful only when students stay active in learning. If we let it do all the thinking, we may finish tasks quickly but learn little. In daily study, we can use AI to check mistakes, collect ideas and improve efficiency. At the same time, we should still read carefully, think by ourselves and judge information wisely. In this way, AI can truly support our growth rather than control it.`,
    expectations: createExpectations([
      'materialAnalysis',
      'structureAnalysis',
      'commentaryAnalysis',
      'contentAnalysis',
    ], {
      focus: '概括准确、评论独立、先概后评结构完整',
    }),
  },
  {
    id: 'single-continuation-kindness',
    type: 'continuation',
    title: '续写：雨夜的陌生人',
    maxScore: 25,
    submissionMode: 'text',
    promptText: `阅读下面材料，根据其内容和所给段落开头语续写两段，使之构成一篇完整的短文。
Last Friday, I was walking home in the rain when I saw an old man standing alone by the roadside. He looked worried and kept searching his pockets.
Paragraph 1: I walked up to him and asked if I could help.
Paragraph 2: When I finally got home, the rain had stopped.`,
    studentText: `I walked up to him and asked if I could help. He told me that he had lost his bus card and did not know how to get home. His hands were shaking because of the cold rain. I lent him my umbrella and used my phone to call his daughter. While waiting, I stayed with him and tried to comfort him. A few minutes later, his daughter arrived in a hurry. She thanked me again and again, and the old man held my hand tightly with tears in his eyes.

When I finally got home, the rain had stopped. Although my clothes were wet, my heart felt warm. My mother listened to my story and smiled proudly. That night I realized that kindness may seem small, but it can light up someone's hardest moment. I also learned that helping others often brings unexpected happiness to ourselves.`,
    expectations: createExpectations([
      'logicStructure',
      'storyLine',
      'emotionLine',
      'contentAnalysis',
    ], {
      focus: '情节衔接、情感推进、结尾主题回扣',
    }),
  },
  {
    id: 'single-argumentative-self-discipline',
    type: 'argumentative',
    title: '自律是否比天赋更重要',
    maxScore: 25,
    submissionMode: 'text',
    promptText: `请以“Is self-discipline more important than talent?”为题写一篇英语短文，内容包括：
1. 你的观点；
2. 理由；
3. 结论。
注意：词数 100 左右。`,
    studentText: `I believe self-discipline is more important than talent in most cases. Talent may give people a good start, but only self-discipline can help them keep moving forward.

First, success usually needs long-term effort rather than a short moment of brilliance. A talented student may learn quickly at the beginning, but without steady practice, the advantage will disappear. Second, self-discipline helps people manage time and stay focused, especially when tasks become difficult or boring. This quality is valuable not only in study but also in future work and life.

Of course, talent is helpful, but it cannot replace persistence. In my opinion, a disciplined person can gradually improve and finally go further than someone who only depends on natural gifts.`,
    expectations: createExpectations([
      'thesisAnalysis',
      'evidenceEvaluation',
      'logicStructure',
    ], {
      focus: '中心论点、论据支撑与逻辑递进',
    }),
  },
  {
    id: 'single-notice-lecture',
    type: 'notice',
    title: '环保讲座通知',
    maxScore: 15,
    submissionMode: 'text',
    promptText: `你校英语社将举办一次关于垃圾分类的英文讲座。请你以学生会的名义写一则通知，内容包括：
1. 讲座时间与地点；
2. 主讲人；
3. 参与要求。
注意：词数 80 左右。`,
    studentText: `Notice

In order to raise students' awareness of environmental protection, an English lecture on garbage sorting will be held this Friday afternoon.

The lecture will begin at 4:00 p.m. in the school lecture hall. Mr. Green, an expert on environmental education, will give us a talk about the importance of garbage sorting and practical ways to do it in daily life.

All students are welcome to take part in the lecture. Please arrive at least ten minutes earlier and keep quiet during the lecture. After it, there will be a short question-and-answer part.

The Students' Union
April 10, 2026`,
    expectations: createExpectations([
      'scenarioAnalysis',
      'formatAnalysis',
      'taskAnalysis',
      'contentAnalysis',
    ], {
      focus: '通知格式、信息闭环、语言简洁客观',
    }),
  },
  {
    id: 'single-narrative-growth',
    type: 'narrative',
    title: '第一次公开发言',
    maxScore: 25,
    submissionMode: 'text',
    promptText: `请根据提示写一篇记叙文，讲述一次让你成长的经历。内容应包括事件经过、你的感受以及从中得到的启发。词数 100 左右。`,
    studentText: `Last semester, I was chosen to give a short speech at the school flag-raising ceremony. At first, I was excited, but soon I became nervous. Every time I imagined standing in front of all the students, my hands turned cold and my mind went blank.

Seeing my worry, my English teacher encouraged me to practice step by step. She asked me to speak first in front of a mirror, then in front of my classmates. Although I still made mistakes, I gradually became calmer.

On the day of the speech, I took a deep breath and finished it successfully. The applause from the playground made me realize that courage does not mean having no fear. It means facing fear and moving on. Since then, I have become more willing to challenge myself.`,
    expectations: createExpectations([
      'storyLine',
      'emotionLine',
      'contentAnalysis',
    ], {
      focus: '主线清晰、情绪变化自然、结尾成长感明确',
    }),
  },
  {
    id: 'single-expository-exercise',
    type: 'expository',
    title: '适度运动的重要性',
    maxScore: 15,
    submissionMode: 'text',
    promptText: `请以“Why Daily Exercise Matters”为题写一篇说明文，介绍日常锻炼的好处并给出两条建议。词数 80 左右。`,
    studentText: `Daily exercise matters for both our bodies and minds. It can make us stronger, improve our sleep and help us reduce stress after a busy day at school. When students take exercise regularly, they are often more energetic and focused in class.

To keep healthy, we do not need to do very difficult sports every day. We can start with simple activities such as running, walking or playing basketball with friends. It is also important to make exercise part of our routine. If we keep doing it patiently, we will benefit a lot in the long run.`,
    expectations: createExpectations([
      'contentAnalysis',
      'logicStructure',
    ], {
      focus: '说明对象清楚、条理分明、建议具体',
    }),
  },
  {
    id: 'single-diary-volunteer-day',
    type: 'diary',
    title: '社区志愿活动日记',
    maxScore: 15,
    submissionMode: 'text',
    promptText: `请根据提示写一则英语日记，记录你参加社区志愿服务的一天。内容包括活动内容、你的感受和收获。词数 80 左右。`,
    studentText: `Friday Sunny

Today I joined a volunteer activity in my community. In the morning, my classmates and I cleaned the small park near our neighborhood. We picked up litter, wiped the benches and sorted the rubbish into different bins.

At first, I felt tired because the work was harder than I had imagined. However, when I saw the park becoming cleaner and the old people smiling at us, I felt proud and happy. This experience taught me that helping others is not only meaningful but also rewarding. I hope I can take part in more activities like this in the future.`,
    expectations: createExpectations([
      'formatAnalysis',
      'emotionLine',
      'taskAnalysis',
      'contentAnalysis',
    ], {
      focus: '日记格式、第一人称稳定、情感与感悟自然',
    }),
  },
  {
    id: 'single-chart-writing-reading-time',
    type: 'chart_writing',
    title: '学生课外阅读时间图表作文',
    maxScore: 25,
    submissionMode: 'text',
    promptText: `某英语报举办征文活动，请根据下面图表写一篇短文。图表显示某校学生每天课外阅读时间的变化：30分钟以下的比例从45%降到20%，30到60分钟从35%升到40%，60分钟以上从20%升到40%。请描述图表内容并简要分析原因。词数 100 左右。`,
    studentText: `The chart shows a clear change in students' after-class reading time. The percentage of students who read for less than 30 minutes a day dropped from 45% to 20%. By contrast, the proportion of those who read for 30 to 60 minutes increased slightly from 35% to 40%. What is more encouraging is that the number of students who read for over 60 minutes doubled from 20% to 40%.

Several reasons may explain this change. Many schools have paid more attention to reading habits in recent years, and parents have also begun to create a better reading environment at home. In addition, digital reading platforms make books easier to reach. All in all, the chart suggests that students are spending more time on meaningful reading.`,
    expectations: createExpectations([
      'materialAnalysis',
      'taskAnalysis',
      'structureAnalysis',
      'contentAnalysis',
    ], {
      focus: '数据提炼、趋势概括、描述与分析分层',
    }),
  },
  {
    id: 'single-report-canteen',
    type: 'report',
    title: '食堂满意度调查报告',
    maxScore: 15,
    submissionMode: 'text',
    promptText: `你们班就学校食堂服务情况做了一次调查。请你写一份英文调查报告，内容包括：
1. 调查对象与方式；
2. 主要发现；
3. 改进建议。
词数 80 左右。`,
    studentText: `Report on the School Canteen Service

Last week, our class carried out a survey on the school canteen service. We collected opinions from 120 students through questionnaires and short interviews.

According to the survey, most students are satisfied with the cleanliness of the canteen and the friendly attitude of the workers. However, many students think the dishes are not varied enough, and the queues at noon are too long.

Based on these findings, we suggest that the canteen provide more healthy choices and open an extra serving window during lunchtime. In this way, students can enjoy both better meals and a more convenient dining experience.`,
    expectations: createExpectations([
      'scenarioAnalysis',
      'formatAnalysis',
      'taskAnalysis',
      'contentAnalysis',
    ], {
      focus: '调查事实、结论提炼与建议可落地',
    }),
  },
  {
    id: 'single-proposal-saving-water',
    type: 'proposal',
    title: '节约用水倡议书',
    maxScore: 25,
    submissionMode: 'text',
    promptText: `学校英语报正在征集倡议书。请你以“Save Water on Campus”为题写一篇倡议书，内容包括：
1. 当前浪费水的现象；
2. 节约用水的必要性；
3. 倡议大家采取的行动。
词数 100 左右。`,
    studentText: `Save Water on Campus

Water waste can still be seen on our campus. Sometimes taps are left running after class, and some students use more water than necessary when washing their hands or cleaning sports equipment.

In fact, saving water is very important. Water is a valuable resource, and without it our daily study and life cannot go on smoothly. More importantly, protecting water means protecting our future.

So I sincerely call on everyone to take action from today. We should turn off taps in time, report broken pipes quickly and develop the habit of using water carefully. If each of us makes a small effort, our campus will become a greener and more responsible place.`,
    expectations: createExpectations([
      'scenarioAnalysis',
      'taskAnalysis',
      'structure',
      'toneAnalysis',
      'contentAnalysis',
    ], {
      focus: '问题意识、倡议对象适配、行动号召力',
    }),
  },
  {
    id: 'single-review-film',
    type: 'review',
    title: '电影观后感：The Pursuit of Happyness',
    maxScore: 25,
    submissionMode: 'text',
    promptText: `请写一篇英文观后感，介绍你最近看过的一部电影，并谈谈它给你的启发。词数 100 左右。`,
    studentText: `Recently, I watched the film The Pursuit of Happyness, and it left a deep impression on me. The movie tells the story of a man who goes through great difficulties but never gives up on his dream of a better life.

What moved me most was not only his suffering, but also his persistence and love for his son. Even when life seemed hopeless, he still chose to work hard and stay hopeful. This made me realize that success is not achieved in one step. It comes from courage, patience and responsibility.

The film reminded me that no matter how difficult life is, we should keep faith in ourselves and continue moving forward.`,
    expectations: createExpectations([
      'materialAnalysis',
      'commentaryAnalysis',
      'contentAnalysis',
    ], {
      focus: '作品概括、个人立场、感受与启示展开',
    }),
  },
  {
    id: 'single-picture-writing-lost-and-found',
    type: 'picture_writing',
    title: '看图写话：扶老人过马路',
    maxScore: 25,
    submissionMode: 'text',
    promptText: `请根据图片内容写一篇短文。图片展示了放学路上两名学生发现一位老人站在路边不知所措，随后上前询问并扶他过马路。要求内容连贯，适当表达感受。词数 100 左右。`,
    studentText: `On the way home from school, two students saw an old man standing by the roadside. He looked anxious and seemed not to know how to cross the busy street. After noticing this, they immediately walked over and asked whether he needed help.

When they learned that the old man was afraid of the passing cars, they held his arm carefully and helped him cross the road. The old man thanked them warmly with a smile on his face. Seeing this, the students also felt happy.

This picture tells us that helping others is not a difficult thing. As long as we are kind and willing to act, we can make our society warmer and safer.`,
    expectations: createExpectations([
      'storyLine',
      'taskAnalysis',
      'contentAnalysis',
    ], {
      focus: '图文对应、关键动作完整、叙述连贯',
    }),
  },
];

export function getSingleFeedbackRegressionSampleByType(type) {
  return SINGLE_FEEDBACK_REGRESSION_SAMPLES.find((item) => item.type === type) || null;
}

