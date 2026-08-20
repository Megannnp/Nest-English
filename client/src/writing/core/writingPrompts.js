export function buildRubricBlock(max) {
  if (Number(max) === 9) {
    return `IELTS 写作采用 0-9 band 评分，允许 0.5 分。
  Band 9：完全回应任务，观点/数据选择精准，衔接自然，词汇和语法高度灵活且几乎无误。
  Band 8：充分回应任务，观点清楚、展开充分，衔接顺畅，词汇和语法丰富，偶有不影响理解的小错。
  Band 7：回应任务较完整，观点清楚但展开或概括仍可更充分，衔接总体清楚，词汇和复杂句有一定灵活度但有错误。
  Band 6：基本完成任务，观点/概括可理解但展开不足或局部不清，衔接机械，词汇和语法范围有限且错误较明显。
  Band 5：部分完成任务，观点/数据选择不充分，段落和衔接较弱，词汇重复，语法错误频繁但仍可理解。
  Band 4 及以下：任务回应不足、结构混乱、语言资源明显不足或大量错误影响理解。`;
  }

  const tiers = {
    15: ['完全覆盖要点，表达自然，有明显亮点', '要点基本齐全，表达较顺，整体完成度较好', '主线基本完成，虽有错误但不宜过度压分', '要点不完整但仍能看出作答努力，应以鼓励性诊断为主', '内容较少或问题较多，但只要能识别有效表达就不要按最低档机械给分', '空白或无关'],
    20: ['完全覆盖要点，语言流畅自然，逻辑清楚', '要点基本完整，表达较顺，整体表现积极', '基本完成任务，存在不足但仍有可取之处', '完成度一般但能看出核心内容，应避免保守压分', '内容较少或偏题明显，但仍要优先识别可保留部分', '空白或无关'],
    25: ['内容丰富融洽，词汇语法较成熟，衔接自然', '内容较丰富，结构清晰，已有较强表达能力', '内容基本合理，主线清楚，问题以可改进为主', '故事基本完整，即使有语言问题也应保留完成任务所得分', '内容逻辑较弱，但只要承接主线就不要一味低分', '内容严重脱节，词汇极有限', '未作答或完全照抄'],
    100: ['各项指标全面达高水平', '各项指标基本达标，整体积极', '基本完成任务，有继续提升空间', '存在明显不足，但仍应体现完成度和努力', '严重缺陷'],
  };
  const rubrics = {
    15: [{ label: '第五档（13~15分）', range: '13-15' }, { label: '第四档（10~12分）', range: '10-12' }, { label: '第三档（7~9分）', range: '7-9' }, { label: '第二档（4~6分）', range: '4-6' }, { label: '第一档（1~3分）', range: '1-3' }, { label: '0分', range: '0' }],
    20: [{ label: '第五档（17~20分）', range: '17-20' }, { label: '第四档（13~16分）', range: '13-16' }, { label: '第三档（9~12分）', range: '9-12' }, { label: '第二档（5~8分）', range: '5-8' }, { label: '第一档（1~4分）', range: '1-4' }, { label: '0分', range: '0' }],
    25: [{ label: '第七档（22~25分）', range: '22-25' }, { label: '第六档（18~21分）', range: '18-21' }, { label: '第五档（14~17分）', range: '14-17' }, { label: '第四档（10~13分）', range: '10-13' }, { label: '第三档（6~9分）', range: '6-9' }, { label: '第二档（2~5分）', range: '2-5' }, { label: '第一档（0~1分）', range: '0-1' }],
    100: [{ label: '优秀（90~100分）', range: '90-100' }, { label: '良好（80~89分）', range: '80-89' }, { label: '中等（70~79分）', range: '70-79' }, { label: '及格（60~69分）', range: '60-69' }, { label: '不及格（60分以下）', range: '<60' }],
  };

  if (!rubrics[max]) {
    const sourceMax = max > 20 ? 25 : 15;
    const sourceRubrics = rubrics[sourceMax] || rubrics[15];
    const sourceTiers = tiers[sourceMax] || tiers[15];
    const scalePoint = (point) => Math.max(0, Math.min(max, Math.round((point / sourceMax) * max)));
    const scaledLines = sourceRubrics.map((item, index) => {
      if (item.range === '0') {
        return `  ${item.label.replace(/（.*?）/, '（0分）')}（0分）：${sourceTiers[index] || ''}`;
      }

      const [rawLow, rawHigh] = String(item.range).split('-').map((value) => Number(value));
      const low = Number.isFinite(rawLow) ? scalePoint(rawLow) : 0;
      const high = Number.isFinite(rawHigh) ? scalePoint(rawHigh) : low;
      const range = `${Math.min(low, high)}-${Math.max(low, high)}`;
      const label = item.label.replace(/（.*?）/, `（${range}分）`);
      return `  ${label}（${range}分）：${sourceTiers[index] || ''}`;
    });

    return `当前任务满分为${max}分，以下档次已由${sourceMax}分制按比例折算。\n${scaledLines.join('\n')}`;
  }

  return rubrics[max]
    .map((item, index) => `  ${item.label}（${item.range}分）：${(tiers[max] || tiers[15])[index] || ''}`)
    .join('\n');
}

function buildTypeSpecificPrompt(type) {
  switch (type) {
    case 'ielts_task1':
      return `
【IELTS Academic Writing Task 1 重点】按雅思 Task 1 四项标准评价，不按中高考作文标准。
- Task Achievement：是否准确概括总体趋势/主要特征，是否选择关键数据并进行有效比较，是否避免遗漏 overview。
- Coherence and Cohesion：是否分段合理，overview 与细节段是否清楚，比较和趋势衔接是否自然。
- Lexical Resource：是否能准确表达上升、下降、波动、比较、比例、峰值等图表语言，避免机械重复。
- Grammatical Range and Accuracy：是否能使用比较句、从句、分词结构和准确时态，错误是否影响数据表达。
`;
    case 'ielts_task2':
      return `
【IELTS Writing Task 2 重点】按雅思 Task 2 四项标准评价，不按中高考作文标准。
- Task Response：是否完整回应题目所有部分，立场是否清楚，论点是否充分展开并有具体例证。
- Coherence and Cohesion：是否有清晰段落分工、主题句、逻辑推进和自然衔接，避免模板化连接词堆砌。
- Lexical Resource：是否能准确使用主题词汇、搭配和转述，避免中文式表达、重复和不自然的大词。
- Grammatical Range and Accuracy：是否有句式范围和准确度，复杂句是否服务论证而不是为了复杂而复杂。
`;
    case 'letter':
      return `
【书信重点】评价对象适配、语气得体、格式完整、交际闭环。
- scenarioAnalysis：写信人、收信人、关系、正式度、目的。
- formatAnalysis：称呼、开篇任务、主体信息、结尾预期、落款。
- contentAnalysis：是否真正完成邀请/申请/致歉/感谢/投诉/建议等交际目标。
`;
    case 'notice':
      return `
【通知重点】评价信息完整、顺序清楚、语体简洁客观。
- scenarioAnalysis：发布者、受众、目的、正式度。
- formatAnalysis：标题、发布时间、正文层次、落款。
- contentAnalysis：时间、地点、对象、要求、截止信息是否闭环。
`;
    case 'speech':
      return `
【演讲重点】评价听众适配、开头吸引力、主体展开、结尾号召力。
- structure：greeting、bodyPoints、callToAction。
- toneAnalysis：感染力、互动感、正式度。
- contentAnalysis：观点、论据、价值导向。
`;
    case 'summary':
      return `
【概要述评重点】评价概括准确、要点完整、无误加观点、评论有逻辑。
- materialAnalysis：材料类型、主旨、关键信息密度。
- structureAnalysis：先概后评、结构闭环、字数控制。
- commentaryAnalysis：立场、论证、是否贴着原文展开。
`;
    case 'continuation':
      return `
【续写重点】评价情节衔接、人物动机、情感基调延续、主题回扣。
- contentAnalysis 必须使用 plotLogic / characterConsistency / themeAlignment。
- logicStructure 评价两段推进、段首句承接、结尾闭合。
- correctedSampleEssay / excellentSampleEssay 必须严格写成两段续写，且两段分别以题目给出的两句段首句原样开头。
- correctedSampleEssay / excellentSampleEssay 不要自拟标题；如果返回 title，必须为空字符串。
- 第一段重点承接原文并自然推进到第二段，第二段重点完成冲突收束与主题回扣。
`;
    case 'report':
      return `
【报告重点】评价事实呈现、分层清楚、分析有证据、建议可落地。
- scenarioAnalysis：撰写者、接收对象、目的、正式度。
- formatAnalysis：标题、引言、正文分项、结论、建议。
- contentAnalysis：事实、结论、建议是否闭环。
`;
    case 'diary':
      return `
【日记重点】评价格式规范、第一人称一致、事件推进、情感变化。
- formatAnalysis：日期天气等开篇格式、收尾感悟。
- emotionLine：初始情绪、变化节点、整体基调。
- contentAnalysis：真实性、生活感、结尾感悟贴合度。
`;
    case 'argumentative':
      return `
【议论文重点】评价中心论点、论据支撑、逻辑递进、结论说服力。
- thesisAnalysis / evidenceEvaluation / logicStructure 要有区分度，避免空话。
`;
    case 'narrative':
      return `
【记叙文重点】评价事件主线、细节选择、情感变化、主题落点。
- storyLine / emotionLine 要抓住核心事件与情绪曲线。
- contentAnalysis 聚焦叙事完整度、真实感、主题呼应。
`;
    case 'picture_writing':
      return `
【看图写话重点】评价图文对应、关键画面覆盖、叙述连贯。
- storyLine：准确概括人物、场景、动作、事件走向。
- taskAnalysis：必须覆盖的信息点与常见跑题风险。
`;
    case 'proposal':
      return `
【倡议书重点】评价对象适配、问题意识、可执行性、号召力。
- structure：openingPosition、bodyPoints、callToAction。
- toneAnalysis：真诚、有感染力、同时理性有组织。
`;
    case 'review':
      return `
【读后感重点】评价材料概括、个人立场、理由展开、主题升华。
- materialAnalysis：作品类型、核心内容、触发思考的关键点。
- commentaryAnalysis：观点、依据、是否避免空泛感想。
`;
    case 'chart_writing':
      return `
【图表作文重点】评价数据提炼、趋势概括、比较关系、结论表达。
- materialAnalysis：图表类型、核心趋势、异常点。
- structureAnalysis：概述、细节展开、结论收束。
`;
    default:
      return `
【通用重点】围绕任务完成度、语言准确度、结构清晰度、表达效果。
- 建议尽量结合学生原文具体句段，不要空泛套话。
`;
  }
}

function buildTypeSpecificOutputFields(type) {
  switch (type) {
    case 'ielts_task1':
      return `,
  "ieltsCriteria": {"taskAchievement":"","coherenceCohesion":"","lexicalResource":"","grammaticalRangeAccuracy":""},
  "taskAnalysis": {"overview":"","keyFeatures":[],"dataSelection":[],"missingComparisons":[]},
  "cohesionAnalysis": {"paragraphing":"","progression":"","linkingIssues":[]}`;
    case 'ielts_task2':
      return `,
  "ieltsCriteria": {"taskResponse":"","coherenceCohesion":"","lexicalResource":"","grammaticalRangeAccuracy":""},
  "thesisAnalysis": {"position":"","clarity":85,"suggestions":[]},
  "evidenceEvaluation": {"sufficiency":80,"relevance":75,"missingEvidence":[]},
  "logicStructure": {"coherence":"结构评价","transitionQuality":"衔接评价","flowIssues":[]}`;
    case 'argumentative':
      return `,
  "thesisAnalysis": {"position":"","clarity":85,"suggestions":[]},
  "evidenceEvaluation": {"sufficiency":80,"relevance":75,"missingEvidence":[]},
  "logicStructure": {"coherence":"结构评价","transitionQuality":"衔接评价","flowIssues":[]}`;
    case 'continuation':
      return `,
  "logicStructure": {"coherence":"结构评价","transitionQuality":"衔接评价","flowIssues":[]},
  "storyLine": {"who":"","when":"","where":"","why":"","what":"","result":""},
  "emotionLine": {"initial":"","changes":[],"tone":""},
  "contentAnalysis": {
    "communicationGoal": "内容完成度评价",
    "plotLogic": {"accuracy":"","coherence":"","closure":"","score":"良"},
    "characterConsistency": {"motivation":"","emotion":"","score":"良"},
    "themeAlignment": {"comment":"","score":"良"}
  }`;
    case 'speech':
      return `,
  "structure": {"greeting":"","bodyPoints":[],"callToAction":"","closing":""},
  "toneAnalysis": {"appropriateness":"语气评价","strengths":[],"suggestions":[]},
  "scenarioAnalysis": {"occasion":"","speakerRole":"","audience":"","formality":"","valueOrientation":""},
  "taskAnalysis": {"hardRequirements":[],"implicitGoals":[],"contentChecklist":[],"commonPitfalls":[]},
  "contentAnalysis": {"communicationGoal":"","coreMessage":"","argumentPath":[],"evidenceStrategy":"","openingStrategy":"","endingStrategy":"","audienceAdaptation":""}`;
    case 'summary':
      return `,
  "materialAnalysis": {"materialType":"","topic":"","coreMessage":"","keyInfo":[]},
  "structureAnalysis": {"summaryTask":"","commentaryTask":"","paragraphPlan":[],"coherenceTips":[]},
  "commentaryAnalysis": {"stance":"","reasoningPath":[],"valueFocus":"","risks":[]},
  "contentAnalysis": {"communicationGoal":"","informationFlow":"","detailStrategy":"","openingStrategy":"","closingStrategy":"","roleAdaptation":""}`;
    case 'letter':
    case 'notice':
    case 'report':
      return `,
  "scenarioAnalysis": {"writerRole":"","recipientRole":"","purpose":"","formality":"","relationship":""},
  "taskAnalysis": {"hardRequirements":[],"implicitGoals":[],"contentChecklist":[],"commonPitfalls":[]},
  "formatAnalysis": {"greeting":"","openingTask":"","bodyTasks":[],"closingExpectation":"","signOff":""},
  "contentAnalysis": {"communicationGoal":"","informationFlow":"","detailStrategy":"","openingStrategy":"","closingStrategy":"","roleAdaptation":""}`;
    case 'proposal':
      return `,
  "scenarioAnalysis": {"writerRole":"","recipientRole":"","purpose":"","formality":"","relationship":""},
  "taskAnalysis": {"hardRequirements":[],"implicitGoals":[],"contentChecklist":[],"commonPitfalls":[]},
  "structure": {"openingPosition":"","bodyPoints":[],"callToAction":"","closing":""},
  "toneAnalysis": {"appropriateness":"语气评价","strengths":[],"suggestions":[]},
  "contentAnalysis": {"communicationGoal":"","informationFlow":"","detailStrategy":"","openingStrategy":"","closingStrategy":"","roleAdaptation":""}`;
    case 'diary':
      return `,
  "formatAnalysis": {"greeting":"","openingTask":"","bodyTasks":[],"closingExpectation":"","signOff":""},
  "emotionLine": {"initial":"","changes":[],"tone":""},
  "taskAnalysis": {"hardRequirements":[],"implicitGoals":[],"contentChecklist":[],"commonPitfalls":[]},
  "contentAnalysis": {"communicationGoal":"","informationFlow":"","detailStrategy":"","openingStrategy":"","closingStrategy":"","roleAdaptation":""}`;
    case 'narrative':
      return `,
  "storyLine": {"who":"","when":"","where":"","why":"","what":"","result":""},
  "emotionLine": {"initial":"","changes":[],"tone":""},
  "contentAnalysis": {"communicationGoal":"","informationFlow":"","detailStrategy":"","openingStrategy":"","closingStrategy":"","themeAlignment":{"comment":"","score":"良"}}`;
    case 'picture_writing':
      return `,
  "storyLine": {"who":"","when":"","where":"","why":"","what":"","result":""},
  "taskAnalysis": {"hardRequirements":[],"implicitGoals":[],"contentChecklist":[],"commonPitfalls":[]},
  "contentAnalysis": {"communicationGoal":"","informationFlow":"","detailStrategy":"","openingStrategy":"","closingStrategy":"","roleAdaptation":""}`;
    case 'review':
      return `,
  "materialAnalysis": {"materialType":"","topic":"","coreMessage":"","keyInfo":[]},
  "commentaryAnalysis": {"stance":"","reasoningPath":[],"valueFocus":"","risks":[]},
  "contentAnalysis": {"communicationGoal":"","informationFlow":"","detailStrategy":"","openingStrategy":"","closingStrategy":"","roleAdaptation":""}`;
    case 'chart_writing':
      return `,
  "materialAnalysis": {"materialType":"","topic":"","coreMessage":"","keyInfo":[]},
  "taskAnalysis": {"hardRequirements":[],"implicitGoals":[],"contentChecklist":[],"commonPitfalls":[]},
  "structureAnalysis": {"introTask":"","summaryTask":"","commentaryTask":"","endingTask":"","paragraphPlan":[],"coherenceTips":[]},
  "contentAnalysis": {"communicationGoal":"","informationFlow":"","detailStrategy":"","openingStrategy":"","closingStrategy":"","roleAdaptation":""}`;
    default:
      return `,
  "logicStructure": {"coherence":"结构评价","transitionQuality":"衔接评价","flowIssues":[]},
  "contentAnalysis": {"communicationGoal":"","informationFlow":"","detailStrategy":"","openingStrategy":"","closingStrategy":"","roleAdaptation":""}`;
  }
}

function buildOutputFormat(max, type, includeDetectedName, batchMode, submissionMode) {
  const detectedNameLine = includeDetectedName ? '  "detectedName": "识别到的学生姓名或null",\n' : '';
  const isIelts = type === 'ielts_task1' || type === 'ielts_task2';
  const taskCriterion = type === 'ielts_task1' ? 'Task Achievement' : 'Task Response';
  const categoryBlock = isIelts
    ? `    {"name":"${taskCriterion}","score":"0-9 band，可含0.5","grade":"优/良/中/差","comment":"指出任务回应/完成度的一个亮点和最关键扣分点","suggestions":["建议1"]},
    {"name":"Coherence and Cohesion","score":"0-9 band，可含0.5","grade":"优/良/中/差","comment":"指出段落推进、衔接或逻辑组织的一个亮点和最关键问题","suggestions":["建议1"]},
    {"name":"Lexical Resource","score":"0-9 band，可含0.5","grade":"优/良/中/差","comment":"指出词汇选择、搭配、改写能力的一个亮点和最关键问题","suggestions":["建议1"]},
    {"name":"Grammatical Range and Accuracy","score":"0-9 band，可含0.5","grade":"优/良/中/差","comment":"指出句式范围和准确度的一个亮点和最关键问题","suggestions":["建议1"]}`
    : `    {"name":"内容","score":"分数","grade":"优/良/中/差","comment":"先肯定一个内容亮点，再点出任务完成度、选材或要点覆盖的最主要问题","suggestions":["建议1"]},
    {"name":"语言","score":"分数","grade":"优/良/中/差","comment":"先肯定一个表达亮点，再点出表达准确度、句式或词汇使用的最主要问题","suggestions":["建议1"]},
    {"name":"结构","score":"分数","grade":"优/良/中/差","comment":"先肯定一个结构亮点，再点出段落组织、衔接或收束的最主要问题","suggestions":["建议1"]},
    {"name":"书写","score":"分数","grade":"优/良/中/差","comment":"先肯定一个卷面或呈现亮点，再点出书写/格式上最主要的问题","suggestions":["建议1"]}`;
  const categoryRequirement = isIelts
    ? `categories 必须严格包含且仅包含“${taskCriterion}、Coherence and Cohesion、Lexical Resource、Grammatical Range and Accuracy”四个 IELTS 维度；四个维度分数允许 0.5，totalScore 必须是四项平均分按 IELTS 规则取整到 0.5。`
    : 'categories 必须严格包含且仅包含“内容、语言、结构、书写”四个维度，每个维度都要给出分数、等级和说到点上的针对性点评，且点评必须先肯定一个可取之处，再指出最需要改进的问题。';
  return `
【输出格式】
只返回一个合法 JSON；不要前缀、解释、代码块。
{
${detectedNameLine}  "totalScore": 分数,
  "maxScore": ${max},
  "type": "${includeDetectedName ? '根据题目判断的题型' : '当前题型'}",
  "writingType": "${includeDetectedName ? '根据题目判断的题型' : '当前题型'}",
  "tier": "档次描述",
  "summary": "${batchMode ? '总评（2句左右，先肯定亮点，再点出一个最优先修改点，中文）' : '总评（2-3句，先肯定亮点，再指出最优先修改点，中文）'}",
  "categories": [
${categoryBlock}
  ],
  "highlights": {
    "vocabulary": [{"word":"具体词或短语","comment":"好在哪里"}],
    "sentences": [{"original":"原句","comment":"亮点分析"}],
    "content": ["内容亮点1","内容亮点2"]
  },
  "grammarIssues": [{"type":"错误类型","original":"原文","corrected":"改正","explanation":"解析","tips":{"title":"标题","content":"讲解","example":"示例"}}],
  "correctedSampleEssay": {"title":"${type === 'continuation' ? '' : '批改后范文'}","text":"基于学生原文问题修订后的可学习版本","highlights":["修改亮点1","修改亮点2"]},
  "excellentSampleEssay": {"title":"${type === 'continuation' ? '' : '优秀范文'}","text":"更成熟自然、完全贴题的优秀版本","highlights":["亮点1","亮点2"]},
  "sampleEssay": {"title":"${type === 'continuation' ? '' : '优秀范文'}","text":"与 excellentSampleEssay 一致的兼容字段","highlights":["亮点1","亮点2"]},
  "improvements": [{"title":"方向","detail":"详细说明","technique":"技巧"}],
  "weaknesses": ["弱点1","弱点2"]${buildTypeSpecificOutputFields(type)}
}

【质量要求】
1. grammarIssues 只写明确且值得讲解的问题；准确时可为空，不要硬凑。
2. correctedSampleEssay 必须呈现“在学生原文基础上改到可学习、可模仿”的版本，允许保留学生原本的选材方向，但要修正文法、搭配、衔接和遗漏信息。
3. excellentSampleEssay 必须返回一篇完整优秀范文，而且必须严格基于本次作文的标题、题目要求、题型、主题和写作任务生成，不能脱离题意另写一篇无关文章。
4. 如果题目里限定了人物、情境、话题、场景、段落职责或结尾方向，correctedSampleEssay 和 excellentSampleEssay 都必须逐项对齐，不得私自更换主题、人物关系、任务目标或写作场景。
5. correctedSampleEssay.title / excellentSampleEssay.title 必须与当前作文标题或任务相匹配；如果原题没有单独标题，可以拟一个贴题标题，但不能空泛写成“参考范文”来敷衍。
6. correctedSampleEssay 正文应与学生原文长度接近，重点体现“改后会更自然”；excellentSampleEssay 可以略优，但不要灌水。
7. sampleEssay 必须返回一篇完整范文，并与 excellentSampleEssay 保持一致，作为兼容旧版本页面的镜像字段。
8. summary 必须结合这篇作文的内容、语言或结构问题来写，禁止输出空字符串、泛泛鼓励或重复 categories.comment 的拼接句。
9. 总评、亮点、建议、两篇范文都要紧贴这篇作文，不要模板话术。
10. 不要编造不存在的错误、亮点或题意要求。
11. ${categoryRequirement}
12. 只补当前题型真正需要的专属字段，不要混入别的题型字段。
13. 书写维度${submissionMode === 'image' ? '必须优先根据学生上传图片里的卷面情况评价字迹清晰度、书写整洁度、分段、抄写规范和格式呈现；标点只能作为次要补充，不能把书写点评写成纯标点纠错。' : '评价格式规范、分段清楚度、标点与表达呈现；不要假装看到了卷面字迹。'}
${type === 'continuation' ? '14. 读后续写的 correctedSampleEssay / excellentSampleEssay / sampleEssay 都必须严格保留题目给出的两个段首句作为两段开头，且不要添加标题。' : ''}
${batchMode ? `${type === 'continuation' ? '15' : '14'}. 批量场景下，summary、highlights、improvements 要更凝练、更具体，方便老师快速判断。` : ''}
`;
}

export function buildPrompt(max, type = 'general', options = {}) {
  const {
    includeDetectedName = false,
    batchMode = false,
    submissionMode = 'text',
    writingTitle = '',
    promptText = '',
    knowledgeContext = '',
  } = options;
  const rubricBlock = buildRubricBlock(max);
  const normalizedTitle = String(writingTitle || '').trim();
  const normalizedPromptText = String(promptText || '').trim();
  const sampleEssayGuard = [
    normalizedTitle ? `- 当前作文标题：${normalizedTitle}` : '',
    normalizedPromptText ? `- 当前题目要求：${normalizedPromptText}` : '',
    '- 生成 correctedSampleEssay 和 excellentSampleEssay 之前，先核对以上题目信息，再组织范文。',
    '- 如果学生作文偏题，两篇范文也必须回到原题任务，不要顺着学生偏题内容继续生成错误范文。',
    '- 如果已知信息不足，请保守贴题，不要为了写范文而擅自改题。',
  ].filter(Boolean).join('\n');

  const isIelts = type === 'ielts_task1' || type === 'ielts_task2';
  const basePrompt = `你是${isIelts ? '资深 IELTS 写作考官和写作教练' : '资深英语写作教学专家（母语者水平）'}，请按${isIelts ? 'IELTS Writing band descriptors' : '中国中高考评分标准'}进行“鼓励性、教学型”批改。满分${max}分。

【档次标准】
${rubricBlock}

【总要求】
1. 只输出“写作评价主报告”，不要输出题目分析页、资源库、故事线拆解等额外模块。
2. 中文要专业、具体、自然，同时整体语气以鼓励学生继续修改为主。
3. 先判任务完成度，再判语言与结构；评分要有区分度，但不要保守压分，更不要因为若干语法错误就忽视已完成的内容。
4. 语法少错时不要硬找错；范文目标是“更适合学习”，不是“更长”。
5. summary 是必填字段，必须给出 2-3 句完整总评，不能留空，不能写“暂无总体评价”等占位话；总评先肯定亮点，再指出最优先修改点。
6. 题目信息不足时，基于学生作文和已知题型做最稳妥判断，不要臆造复杂背景。
7. JSON 字符串中引用英文原句时，确保可安全解析。
${includeDetectedName ? '8. 如果图片里能识别学生姓名，请填入 detectedName；无法确认时返回 null。\n' : ''}${batchMode ? '9. 批量场景优先保证 summary、亮点、建议的辨识度和压缩质量。\n' : ''}

【范文生成约束】
${sampleEssayGuard}
${knowledgeContext ? `\n${knowledgeContext}\n` : ''}
`;

  return basePrompt + buildTypeSpecificPrompt(type) + buildOutputFormat(max, type, includeDetectedName, batchMode, submissionMode);
}

export function buildQuickPrompt(max, type = 'general', options = {}) {
  const { submissionMode = 'text', knowledgeContext = '' } = options;
  const rubricBlock = buildRubricBlock(max);
  const handwritingInstruction = submissionMode === 'image'
    ? '书写：必须根据学生上传图片里的卷面情况评价字迹清晰度、书写整洁度、分段和格式呈现；标点只作次要补充，不要只写标点纠错。'
    : '书写：评价格式规范、分段清楚度、标点与表达呈现；不要假装看到了卷面字迹。';
  const continuationRequirement = type === 'continuation'
    ? '4. 对读后续写，优先判断：是否接住原文情境、两段推进是否自然、人物和主题是否跑偏。'
    : '4. 必须优先依据用户消息中的【作业信息】、作文标题、题目要求和学生原文评分；不要按作文自拟主题评分。';
  const continuationOutputRule = type === 'continuation'
    ? '4. mainProblems、nextActions 和结构/内容点评优先围绕情节承接、人物一致性、主题回扣、语言硬伤。'
    : '4. mainProblems、nextActions 和结构/内容点评必须围绕当前题型和题目要求，不要混入读后续写专属判断。';
  const isIelts = type === 'ielts_task1' || type === 'ielts_task2';
  const taskCriterion = type === 'ielts_task1' ? 'Task Achievement' : 'Task Response';
  const quickCategoryBlock = isIelts
    ? `    {"name":"${taskCriterion}","score":"0-9 band，可含0.5","grade":"优/良/中/差","comment":"先肯定一个亮点，再指出一个最主要问题","suggestions":["建议1"]},
    {"name":"Coherence and Cohesion","score":"0-9 band，可含0.5","grade":"优/良/中/差","comment":"先肯定一个亮点，再指出一个最主要问题","suggestions":["建议1"]},
    {"name":"Lexical Resource","score":"0-9 band，可含0.5","grade":"优/良/中/差","comment":"先肯定一个亮点，再指出一个最主要问题","suggestions":["建议1"]},
    {"name":"Grammatical Range and Accuracy","score":"0-9 band，可含0.5","grade":"优/良/中/差","comment":"先肯定一个亮点，再指出一个最主要问题","suggestions":["建议1"]}`
    : `    {"name":"内容","score":"分数","grade":"优/良/中/差","comment":"先肯定一个亮点，再指出一个最主要问题","suggestions":["建议1"]},
    {"name":"语言","score":"分数","grade":"优/良/中/差","comment":"先肯定一个亮点，再指出一个最主要问题","suggestions":["建议1"]},
    {"name":"结构","score":"分数","grade":"优/良/中/差","comment":"先肯定一个亮点，再指出一个最主要问题","suggestions":["建议1"]},
    {"name":"书写","score":"分数","grade":"优/良/中/差","comment":"先肯定一个亮点，再指出一个最主要问题","suggestions":["建议1"]}`;
  const quickCategoryRequirement = isIelts
    ? `categories 必须严格包含且仅包含“${taskCriterion}、Coherence and Cohesion、Lexical Resource、Grammatical Range and Accuracy”四个 IELTS 维度；每项给 0-9 band，可含 0.5。`
    : 'categories 必须严格包含且仅包含”内容、语言、结构、书写”四项，每项都要有分数、等级、简短但说到点上的点评，且顺序必须是先肯定，再指出问题。';

  return `你是资深英语写作阅卷老师。请基于题目要求和学生作文，生成”快速诊断反馈”。

要求：
1. 这是快速反馈，不是完整精批。
2. 只输出最关键的诊断信息，帮助学生马上知道分数区间、最大问题、下一步先改什么。
3. 不要输出范文，不要输出语法逐条讲解，不要输出题目分析，不要输出资源库。
${continuationRequirement}
5. 中文表达要短、准、直接，但整体语气保持鼓励性，不要把学生写得一无是处。
6. 只能返回合法 JSON，不要 markdown，不要解释。
7. 评分时优先认可任务完成度、有效表达和可取之处；不要因为存在若干语言问题就保守压分。
8. 必须按当前题型“${type}”的专属标准评分；如果题目文本里出现其他满分提示，以当前任务满分${max}分为准。
9. 每个关键判断都要能从学生原文或题目要求中找到依据；不要编造不存在的错误、亮点、情节或题意要求。
10. categories 的分项评价必须与 totalScore 档次一致，不能总分偏高但四项都写成严重问题，也不能总分偏低却只写轻微问题。

评分参考：
${rubricBlock}

题型专属评分重点：
${buildTypeSpecificPrompt(type)}
${knowledgeContext ? `\n${knowledgeContext}\n` : ''}

JSON 结构必须严格为：
{
  "totalScore": 分数,
  "maxScore": ${max},
  "type": "${type}",
  "writingType": "${type}",
  "tier": "档次描述",
  "summary": "1-2句总评，必填，先肯定一个亮点，再指出最大问题",
  "categories": [
${quickCategoryBlock}
  ],
  "mainProblems": ["问题1", "问题2", "问题3"],
  "nextActions": ["建议1", "建议2", "建议3"]
}

输出约束：
1. mainProblems 最多 3 条，只写最影响得分的问题，不要把可修小错堆成灾难感。
2. nextActions 最多 3 条，必须能直接指导下一次修改，并尽量体现”先做什么最容易见效”。
3. ${quickCategoryRequirement}
${continuationOutputRule}
5. summary 是必填字段，不能留空，不能写”暂无总体评价”等占位话，且要明确点出一个亮点和一个最大问题。
6. summary 不超过 80 个中文字符。
7. nextActions 必须与 mainProblems 一一对应或直接回应其中一个核心问题，不能给泛泛的“多练习、多积累”。
8. 不要附加任何其他字段。
9. ${handwritingInstruction}`;
}

export const typeLabels = {
  ielts_task1: 'IELTS Task 1',
  ielts_task2: 'IELTS Task 2',
  continuation: '读后续写',
  argumentative: '议论文',
  summary: '概要写作',
  speech: '演讲稿',
  letter: '书信',
  notice: '通知',
  narrative: '记叙文',
  expository: '说明文',
  diary: '日记',
  chart_writing: '图表作文',
  report: '报告',
  proposal: '倡议书',
  review: '观后感/读后感',
  picture_writing: '看图写话',
  general: '综合写作',
};

export const typeColors = {
  ielts_task1: { bg: '#dcfce7', text: '#166534', border: '#22c55e' },
  ielts_task2: { bg: '#e0f2fe', text: '#075985', border: '#38bdf8' },
  continuation: { bg: '#dbeafe', text: '#1e40af', border: '#60a5fa' },
  argumentative: { bg: '#fce7f3', text: '#9d174d', border: '#f472b6' },
  summary: { bg: '#d1fae5', text: '#065f46', border: '#34d399' },
  speech: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  letter: { bg: '#e0e7ff', text: '#3730a3', border: '#818cf8' },
  notice: { bg: '#ecfccb', text: '#3f6212', border: '#a3e635' },
  narrative: { bg: '#ede9fe', text: '#5b21b6', border: '#a78bfa' },
  expository: { bg: '#ffedd5', text: '#9a3412', border: '#fb923c' },
  diary: { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
  chart_writing: { bg: '#e0e7ff', text: '#3730a3', border: '#6366f1' },
  report: { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' },
  proposal: { bg: '#fee2e2', text: '#991b1b', border: '#dc2626' },
  review: { bg: '#ede9fe', text: '#5b21b6', border: '#7c3aed' },
  picture_writing: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  general: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
};

const NATIONAL_BRANCH_CONFIGS = [
  { region: '全国', defaultPaper: '全国卷', prefix: '全国' },
  { region: '新高考', defaultPaper: '新高考卷', prefix: '新高考' },
];

function formatPrefixedPaper(paper, prefix) {
  if (!paper || paper === `${prefix}卷`) return '';
  return paper.startsWith(prefix) ? paper : `${prefix}${paper}`;
}

function formatGeneralPaper(region, paper) {
  if (!paper || paper === '高考卷') return region ? `${region}卷` : paper;
  return region ? `${region}${paper}` : paper;
}

export function getSourceBranchLabel(question) {
  const region = String(question?.sourceRegion || '').trim();
  const paper = String(question?.sourcePaper || '').trim();
  if (!region && !paper) return '';

  const config = NATIONAL_BRANCH_CONFIGS.find((item) => item.region === region);
  if (config) return formatPrefixedPaper(paper, config.prefix);
  return formatGeneralPaper(region, paper);
}
