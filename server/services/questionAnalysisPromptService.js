export function buildQuestionAnalysisPrompt(type = 'general') {
  const basePrompt = `你是英语写作题目分析专家，只输出“题目分析”结果，供前端题型分析组件直接渲染。

【总要求】
1. 只返回题目分析，不要返回 grammarIssues、总分、范文、精细批改建议。
2. 只返回合法 JSON，不要解释、前缀、代码块。
3. 材料不足时可结合学生作文谨慎推断，但不要臆造复杂背景。
4. 中文要自然、简洁、适合中学生理解。
5. vocabulary 必须使用以下结构：
[
  {
    "category": "分类名",
    "icon": "emoji",
    "color": "#10b981",
    "words": [
      { "word": "表达", "pos": "phrase", "meaning": "中文释义", "example": "英文例句" }
    ]
  }
]

【通用输出字段】
{
  "type": "${type}",
  "overview": "对这道题的整体分析",
  "themes": ["主题1", "主题2"],
  "reason": "题型识别或分析依据",
  "focusPoints": ["写作重点1", "写作重点2"],
  "risks": ["容易跑题点1", "容易失分点2"],
  "suggestions": ["建议1", "建议2"],
  "categories": [],
  "thesisAnalysis": null,
  "evidenceEvaluation": null,
  "logicStructure": null,
  "keyPoints": [],
  "summaryRules": [],
  "missedPoints": [],
  "personalOpinionAlerts": [],
  "structure": null,
  "toneAnalysis": null,
  "scenarioAnalysis": null,
  "taskAnalysis": null,
  "formatAnalysis": null,
  "materialAnalysis": null,
  "structureAnalysis": null,
  "commentaryAnalysis": null,
  "rhetoricalDevices": [],
  "storyLine": null,
  "emotionLine": null,
  "plotAnalysis": null,
  "starters": null,
  "contentAnalysis": null,
  "vocabulary": []
}`;

  const typeSpecificPromptMap = {
    continuation: `
【读后续写】
必填：
- storyLine { who, when, where, why, what, result }
- emotionLine { initial, changes, tone }
- plotAnalysis { originalText, translation, keyLines }
- starters { para1, para2, relationship }
- contentAnalysis { plotLogic, characterConsistency, themeAlignment }
约束：
- keyLines 每项格式 { "sentenceIndex": 0, "type": "plot/emotion/hint", "note": "说明" }
- starters.para1/para2 格式 { "text": "", "translation": "", "constraints": [], "directions": [], "forbidden": [] }
- contentAnalysis.*.score 只能是 优/良/中/差`,

    argumentative: `
【议论文】
必填：
- thesisAnalysis { position, clarity, suggestions }
- evidenceEvaluation { sufficiency, relevance, missingEvidence }
- logicStructure { coherence, transitionQuality, flowIssues }
- vocabulary 提供 2-3 组议论文常用表达`,

    summary: `
【概要述评输出要求】
必填：
- keyPoints：至少 4 条
- summaryRules：至少 4 条
- missedPoints：基于学生作文推测的遗漏要点，没有可留空
- personalOpinionAlerts：疑似夹带主观看法的提醒，没有可留空
- materialAnalysis { materialType, topic, valueAnchor, taskBoundary }
- structureAnalysis { introTask, summaryTask, commentaryTask, endingTask }
- commentaryAnalysis { stance, reasoningPath, evidenceStrategy, languageLogic, readerAwareness, wordCountAdvice }
- vocabulary 提供 2 组概要写作常用表达
重点：
1. 体现“先概后评、评据结合”。
2. keyPoints 只保留核心信息，不把细节、例子、修辞句误判为要点。
3. summaryRules 必须覆盖客观概括、禁止照抄、控制篇幅、不得擅加观点。
4. commentaryAnalysis 必须体现立场、论证路径、论据策略、语言得体性。
5. 若题目更偏“概要”而非“述评”，要在 taskBoundary 说明评论边界。`,

    speech: `
【演讲稿】
必填：
- scenarioAnalysis { occasion, speakerRole, audience, formality, valueOrientation }
- taskAnalysis { structureFocus, contentChecklist, languageFeatures, pitfalls }
- contentAnalysis { coreMessage, argumentPath, evidenceStrategy, openingStrategy, endingStrategy, audienceAdaptation }
- structure { greeting, bodyPoints, callToAction }
- toneAnalysis { appropriateness, suggestions, description }
- rhetoricalDevices 修辞建议数组
- vocabulary 提供 2-3 组演讲场景词汇
重点：
1. 体现听众意识、正式度与共鸣点。
2. structure.bodyPoints 必须是 2-3 条有递进关系的主体展开路径。
3. contentAnalysis 要覆盖主题解构、价值锚点、论点层级、论据策略、开头结尾设计。
4. rhetoricalDevices 优先给设问、排比、呼吁、场景化开头。
5. pitfalls 直接指出遗漏要点、缺少建议、听众错位、结尾无号召。`,

    letter: `
【书信/邮件】
必填：
- scenarioAnalysis { writerRole, recipientRole, relationship, purpose, formality }
- formatAnalysis { greeting, openingTask, bodyTasks, closingExpectation, signOff }
- taskAnalysis { hardRequirements, hiddenRequirements, toneStrategy, commonPitfalls }
- contentAnalysis { communicationGoal, informationFlow, detailStrategy, openingStrategy, closingStrategy, roleAdaptation }
- vocabulary 提供 2-3 组书信/邮件高频表达
重点：
1. 体现交际闭环四要素：写信人、收信人、核心目的、正式度。
2. formatAnalysis 强调核心信息前置、逻辑闭环。
3. hiddenRequirements 优先识别跨文化解释、情感传递、说服逻辑、价值导向。
4. toneStrategy 具体点出委婉请求、真诚致歉、理性投诉、友好邀请等语用策略。
5. commonPitfalls 直接提醒角色错位、正式度不匹配、诉求模糊、缺少可执行方案。`,

    notice: `
【通知】
必填：
- scenarioAnalysis { writerRole, recipientRole, relationship, purpose, formality }
- formatAnalysis { greeting, openingTask, bodyTasks, closingExpectation, signOff }
- taskAnalysis { hardRequirements, hiddenRequirements, toneStrategy, commonPitfalls }
- contentAnalysis { communicationGoal, informationFlow, detailStrategy, openingStrategy, closingStrategy, roleAdaptation }
- vocabulary 提供 2 组通知常用表达
重点：
1. 通知不需要私人问候与情感寒暄，重点是信息高效传达。
2. hardRequirements 优先覆盖时间、地点、事件、对象、注意事项、截止日期、联系方式。
3. openingTask 要开门见山，bodyTasks 要按信息优先级分层。
4. toneStrategy 强调正式、客观、清晰，不要过度委婉或情绪化。
5. commonPitfalls 提示格式缺失、信息遗漏、重点后置、语体不稳。`,

    diary: `
【日记】
必填：
- formatAnalysis { greeting, openingTask, bodyTasks, closingExpectation, signOff }
- taskAnalysis { hardRequirements, hiddenRequirements, toneStrategy, commonPitfalls }
- emotionLine { initial, changes, tone }
- contentAnalysis { communicationGoal, informationFlow, detailStrategy, openingStrategy, closingStrategy, roleAdaptation }
- vocabulary 提供 2 组日记常用表达
重点：
1. 明确日期/星期/天气、人称、时态、记录属性。
2. emotionLine 体现初始情绪、过程变化、最终感受。
3. taskAnalysis 识别场景类型、主题方向、写作侧重点和偏题风险。
4. contentAnalysis 围绕事件展开、细节描写、心理刻画、感悟收尾。
5. commonPitfalls 提示格式错误、视角混乱、情绪失真、结尾生硬拔高。`,

    report: `
【报告】
必填：
- scenarioAnalysis { writerRole, recipientRole, relationship, purpose, formality }
- formatAnalysis { greeting, openingTask, bodyTasks, closingExpectation, signOff }
- taskAnalysis { hardRequirements, hiddenRequirements, toneStrategy, commonPitfalls }
- contentAnalysis { communicationGoal, informationFlow, detailStrategy, openingStrategy, closingStrategy, roleAdaptation }
- vocabulary 提供 2 组报告常用表达
重点：
1. 突出标题-背景/目的-主体发现-结论建议的结构。
2. openingTask 体现报告目的与背景；bodyTasks 体现事实、分析、结论、建议分层。
3. informationFlow 符合结论先行或问题导向 + 事实支撑 + 建议收束。
4. toneStrategy 强调客观、中立、基于事实。
5. commonPitfalls 提示只罗列信息不分析、建议空泛、结构混乱、证据不足。`,

    narrative: `
【记叙文】
必填：
- storyLine { who, when, where, why, what, result }
- emotionLine { initial, changes, tone }
- taskAnalysis { structureFocus, contentChecklist, languageFeatures, pitfalls }
- contentAnalysis { communicationGoal, informationFlow, detailStrategy, openingStrategy, closingStrategy, roleAdaptation }
- vocabulary 提供 2 组记叙文常用表达
重点：
1. 体现六要素与叙事主线，避免空泛建议。
2. emotionLine 体现情绪推进与整体基调，保证内容和情感一致。
3. contentAnalysis 突出事件推进、细节描写、高潮设置、结尾收束。
4. pitfalls 提示时态混乱、视角跳脱、细节失真、结尾生硬拔高。`,

    picture_writing: `
【看图写话】
必填：
- storyLine { who, when, where, why, what, result }
- taskAnalysis { structureFocus, contentChecklist, languageFeatures, pitfalls }
- contentAnalysis { communicationGoal, informationFlow, detailStrategy, openingStrategy, closingStrategy, roleAdaptation }
- vocabulary 提供 2 组看图写话常用表达
重点：
1. 围绕图片信息组织内容，识别人、场景、动作、关系、情节走向。
2. contentChecklist 覆盖“图中看到了什么、可合理补什么、不能乱编什么”。
3. contentAnalysis 体现从画面观察到成篇叙事的组织逻辑。
4. pitfalls 直接提醒遗漏关键画面、想象失控、人物行为不合理。`,

    proposal: `
【倡议书】
必填：
- scenarioAnalysis { writerRole, recipientRole, relationship, purpose, formality }
- taskAnalysis { structureFocus, contentChecklist, languageFeatures, pitfalls }
- contentAnalysis { communicationGoal, informationFlow, detailStrategy, openingStrategy, closingStrategy, roleAdaptation }
- structure { greeting, bodyPoints, callToAction }
- toneAnalysis { appropriateness, suggestions, description }
- rhetoricalDevices 修辞建议数组
- vocabulary 提供 2 组倡议书常用表达
重点：
1. 体现“问题/背景 - 倡议内容 - 具体行动 - 号召收束”的逻辑。
2. structure.bodyPoints 给出 2-3 条倡议主体任务，callToAction 必须明确。
3. toneAnalysis 强调感染力、正式度、集体行动导向。
4. pitfalls 提示空喊口号、缺少可执行措施、号召力不足。`,

    review: `
【读后感/观后感】
必填：
- materialAnalysis { materialType, topic, valueAnchor, taskBoundary }
- taskAnalysis { structureFocus, contentChecklist, languageFeatures, pitfalls }
- commentaryAnalysis { stance, reasoningPath, evidenceStrategy, languageLogic, readerAwareness, wordCountAdvice }
- contentAnalysis { communicationGoal, informationFlow, detailStrategy, openingStrategy, closingStrategy, roleAdaptation }
- vocabulary 提供 2 组读后感/观后感常用表达
重点：
1. 区分作品介绍/引用与个人感悟/评价，不能只复述情节。
2. stance 要明确；reasoningPath 体现“感受 - 理由 - 启示”。
3. contentChecklist 提醒作品信息、触动点、感悟依据、结尾升华。
4. pitfalls 提示介绍过多、感悟空泛、缺少作品支撑、结尾无提升。`,

    chart_writing: `
【图表作文】
必填：
- materialAnalysis { materialType, topic, valueAnchor, taskBoundary }
- taskAnalysis { structureFocus, contentChecklist, languageFeatures, pitfalls }
- contentAnalysis { communicationGoal, informationFlow, detailStrategy, openingStrategy, closingStrategy, roleAdaptation }
- structureAnalysis { introTask, summaryTask, commentaryTask, endingTask }
- vocabulary 提供 2 组图表作文常用表达
重点：
1. 体现图表类型、核心趋势、关键对比、结论落点。
2. contentChecklist 覆盖数据准确描述、趋势变化、对比分析、合理结论。
3. structureAnalysis 突出开头点题 - 主体描述 - 比较总结 - 结尾收束。
4. pitfalls 提示只堆数字、不概括趋势、遗漏对比、结论脱离数据。`,

    expository: `
【说明文】
必填：
- categories：至少 3 项，每项格式 { "name": "", "icon": "emoji", "grade": "优/良/中/差", "comment": "", "suggestions": ["要点1","要点2"] }
这些 categories 表示说明文写作应覆盖的分析维度与关键要点，不是精细批改评分。`,

    general: `
【通用写作】
重点补全：
- focusPoints
- risks
- suggestions
- categories：可选，若无则返回空数组`,
  };

  return `${basePrompt}\n${typeSpecificPromptMap[type] || typeSpecificPromptMap.general}`;
}

export function buildContinuationCorePrompt() {
  return `你是英语读后续写题目分析专家。现在只做第一阶段：提取故事骨架。

【输出要求】
1. 只返回合法 JSON，不要解释、前缀、代码块。
2. 只返回以下字段：
{
  "type": "continuation",
  "overview": "整体题目分析",
  "themes": ["主题1", "主题2"],
  "reason": "分析依据",
  "focusPoints": ["重点1", "重点2"],
  "risks": ["风险1", "风险2"],
  "suggestions": ["建议1", "建议2"],
  "storyLine": {
    "who": "",
    "when": "",
    "where": "",
    "why": "",
    "what": "",
    "result": ""
  },
  "emotionLine": {
    "initial": "",
    "changes": [],
    "tone": "温暖"
  },
  "starters": {
    "para1": { "text": "", "translation": "", "constraints": [], "directions": [], "forbidden": [] },
    "para2": { "text": "", "translation": "", "constraints": [], "directions": [], "forbidden": [] },
    "relationship": "顺承"
  }
}

【要求】
1. storyLine 六要素必须齐全。
2. emotionLine 必须给出初始情感、变化链条、全文基调。
3. starters 必须补出两段段首句英文和中文。`;
}

export function buildContinuationDetailPrompt(coreResult) {
  return `你是英语读后续写题目分析专家。现在只做第二阶段：补充原文精读和写作分析。

【已得到的故事骨架】
${JSON.stringify(coreResult, null, 2)}

【输出要求】
1. 只返回合法 JSON，不要解释、前缀、代码块。
2. 只返回以下字段：
{
  "plotAnalysis": {
    "originalText": "",
    "translation": "",
    "keyLines": [
      { "sentenceIndex": 0, "type": "plot", "note": "说明" }
    ]
  },
  "contentAnalysis": {
    "plotLogic": {
      "accuracy": "",
      "coherence": "",
      "closure": "",
      "score": "良"
    },
    "characterConsistency": {
      "motivation": "",
      "emotion": "",
      "score": "良"
    },
    "themeAlignment": {
      "comment": "",
      "score": "良"
    }
  },
  "sceneVocabulary": [
    {
      "category": "情绪变化",
      "icon": "💭",
      "color": "#818cf8",
      "words": [
        { "word": "", "pos": "phrase", "meaning": "", "example": "", "exampleCn": "" }
      ]
    }
  ],
  "phraseSuggestions": {
    "categories": [
      {
        "category": "人物动作表达",
        "icon": "🎬",
        "items": [
          { "word": "", "pos": "phrase", "meaning": "", "example": "", "exampleCn": "" }
        ]
      }
    ]
  },
  "sentencePatterns": [
    {
      "category": "承接与转折句型",
      "icon": "🧩",
      "patterns": [
        { "pattern": "", "zh": "", "example": "" }
      ]
    }
  ]
}

【要求】
1. 必须补出原文完整英文和中文翻译。
2. keyLines 至少 3 条。
3. contentAnalysis 三部分都要填写。
4. sceneVocabulary 至少 2 组、每组至少 3 个词/短语，紧扣情绪线、人物关系、比赛情境。
5. phraseSuggestions 至少 2 组，优先给人物动作、心理变化、老师鼓励、结尾升华。
6. sentencePatterns 至少 2 组，优先给段首承接、心理描写、主题收束句型。`;
}

export function buildQuestionAnalysisRepairPrompt(type, missingFields) {
  return `你上一次返回的题目分析 JSON 字段不完整。请补齐缺失字段后重新返回完整 JSON，禁止解释。

题型：${type}
缺失字段：
${missingFields.map((field) => `- ${field}`).join('\n')}

要求：
1. 这次必须把以上缺失字段全部补齐。
2. continuation 类型必须把 storyLine、emotionLine、plotAnalysis、starters、contentAnalysis 填完整。
3. 只能返回一个完整 JSON 对象。`;
}
