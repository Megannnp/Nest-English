import { escapeHtml, normalizeType } from './feedbackAdapter';

// ─── helpers ────────────────────────────────────────────────────────────────

function h(text) { return escapeHtml(text); }

function formatFeedbackArray(item, fallback) {
  return item.map((entry) => formatFeedbackItem(entry, '')).filter(Boolean).join('；') || fallback;
}

function formatFeedbackObject(item, fallback) {
  const title = [item.title, item.name, item.category, item.dimension].find(Boolean) || '';
  const detail = [
    item.detail,
    item.comment,
    item.explanation,
    item.issue,
    item.suggestion,
    item.text,
    item.summary,
  ].find(Boolean) || '';
  if (title && detail) return `${title}：${detail}`;
  return title || detail || fallback;
}

function formatFeedbackItem(item, fallback = '暂无说明') {
  if (item == null) return fallback;
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (Array.isArray(item)) return formatFeedbackArray(item, fallback);
  if (typeof item === 'object') return formatFeedbackObject(item, fallback);
  return String(item);
}

function row(label, value) {
  if (!value) return '';
  const display = Array.isArray(value) ? value.map((item) => formatFeedbackItem(item, '')).filter(Boolean).join('；') : formatFeedbackItem(value, '');
  return `<div style="margin-top:4px;"><strong>${label}：</strong>${h(display)}</div>`;
}

function listItems(arr) {
  if (!Array.isArray(arr) || !arr.length) return '';
  return arr.map(item => `<div>• ${h(formatFeedbackItem(item, ''))}</div>`).join('');
}

function listRow(label, arr) {
  const items = Array.isArray(arr) ? arr : (typeof arr === 'string' && arr.trim() ? [arr] : []);
  if (!items.length) return '';
  return `<div style="margin-top:4px;"><strong>${label}：</strong>${items.map((item) => h(formatFeedbackItem(item, ''))).join('；')}</div>`;
}

function sectionBox(title, content) {
  if (!content) return '';
  return `<div class="box" style="margin-bottom:6px;">
    <div style="font-weight:bold;margin-bottom:4px;">${title}</div>
    ${content}
  </div>`;
}

function triColumn(items) {
  return `<div class="grid" style="grid-template-columns:1fr 1fr 1fr;">${items.map(([k, v]) =>
    `<div class="box"><strong>${k}：</strong>${h(v || '暂无')}</div>`).join('')}</div>`;
}

function hasList(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasAnyValue(...values) {
  return values.some(Boolean);
}

function hasAnyList(...values) {
  return values.some(hasList);
}

// ─── type-specific question-analysis sections ────────────────────────────────

function buildContinuationPlotSection(plotAnalysis) {
  const hasPlotDetails = hasAnyList(
    plotAnalysis.characters,
    plotAnalysis.plotPoints,
    plotAnalysis.emotions,
    plotAnalysis.keyLines
  );
  if (!hasPlotDetails) return '';

  let inner = '';
  inner += listRow('人物', plotAnalysis.characters);
  inner += listRow('情节节点', plotAnalysis.plotPoints);
  inner += listRow('情感变化', plotAnalysis.emotions);
  inner += listRow('关键句', plotAnalysis.keyLines);
  return sectionBox('原文情节分析', inner);
}

function buildStarterRequirementSection(starters) {
  if (!hasAnyValue(starters?.para1?.text, starters?.para2?.text)) return '';

  let inner = '';
  if (starters.relationship) inner += `<div><strong>两段关系：</strong>${h(starters.relationship)}</div>`;
  if (starters.para1?.text) inner += `<div style="margin-top:8px;"><strong>第一段首句：</strong><span style="font-style:italic;">${h(starters.para1.text)}</span></div>`;
  if (starters.para2?.text) inner += `<div style="margin-top:8px;"><strong>第二段首句：</strong><span style="font-style:italic;">${h(starters.para2.text)}</span></div>`;
  return sectionBox('段首句要求', inner);
}

function buildContinuationEmotionSection(emotionLine) {
  const contEmotionChanges = Array.isArray(emotionLine?.changes) ? emotionLine.changes : [];
  if (!hasAnyValue(emotionLine?.tone, emotionLine?.initial, contEmotionChanges.length)) return '';

  let inner = '';
  if (emotionLine.tone) inner += `<div><strong>情感基调：</strong>${h(emotionLine.tone)}</div>`;
  if (emotionLine.initial) inner += row('初始情感', emotionLine.initial);
  if (contEmotionChanges.length) inner += `<div style="margin-top:8px;"><strong>变化路径：</strong>${contEmotionChanges.map(h).join(' → ')}</div>`;
  return sectionBox('情感线索', inner);
}

function buildPlotLogicSection(plotLogic) {
  if (!hasAnyValue(plotLogic.summary, hasAnyList(plotLogic.strengths, plotLogic.risks))) return '';

  let inner = row('情节承接总结', plotLogic.summary);
  inner += listRow('亮点', plotLogic.strengths);
  inner += listRow('风险', plotLogic.risks);
  inner += listRow('衔接建议', plotLogic.bridgingSuggestions);
  return sectionBox('情节承接与合理性（plotLogic）', inner);
}

function buildCharacterConsistencySection(charConsistency) {
  if (!hasAnyValue(charConsistency.summary, hasAnyList(charConsistency.strengths, charConsistency.risks))) return '';

  let inner = row('人物一致性总结', charConsistency.summary);
  inner += listRow('亮点', charConsistency.strengths);
  inner += listRow('风险', charConsistency.risks);
  inner += listRow('修改重点', charConsistency.revisionFocus);
  return sectionBox('人物行为与情感一致性（characterConsistency）', inner);
}

function buildThemeAlignmentSection(themeAlignment) {
  if (!hasAnyValue(themeAlignment.summary, hasAnyList(themeAlignment.strengths, themeAlignment.risks))) return '';

  let inner = row('主题呼应总结', themeAlignment.summary);
  inner += listRow('亮点', themeAlignment.strengths);
  inner += listRow('风险', themeAlignment.risks);
  inner += listRow('修改重点', themeAlignment.revisionFocus);
  return sectionBox('主题呼应度（themeAlignment）', inner);
}

function buildContinuationDeepContentSection(contentAnalysis) {
  const plotLogic = contentAnalysis.plotLogic || {};
  const charConsistency = contentAnalysis.characterConsistency || {};
  const themeAlignment = contentAnalysis.themeAlignment || {};
  const hasCa = hasAnyValue(plotLogic.summary, charConsistency.summary, themeAlignment.summary);
  if (!hasCa) return '';

  return [
    '<h3>读后续写 · 三维内容精析</h3>',
    buildPlotLogicSection(plotLogic),
    buildCharacterConsistencySection(charConsistency),
    buildThemeAlignmentSection(themeAlignment),
  ].join('');
}

function buildContinuationAnalysis(safeData) {
  const contentAnalysis = safeData?.contentAnalysis || {};
  const plotAnalysis = safeData?.plotAnalysis || {};
  const starters = safeData?.starters || {};
  const emotionLine = safeData?.emotionLine || {};

  return [
    buildContinuationPlotSection(plotAnalysis),
    buildStarterRequirementSection(starters),
    buildContinuationEmotionSection(emotionLine),
    buildContinuationDeepContentSection(contentAnalysis),
  ].join('');
}

function buildArgumentativeAnalysis(safeData) {
  const parts = [];
  const thesis = safeData?.thesisAnalysis || {};
  const evidence = safeData?.evidenceEvaluation || {};
  const logic = safeData?.logicStructure || {};

  if (hasAnyValue(thesis.position, thesis.strength, thesis.clarity)) {
    let inner = row('论点立场', thesis.position);
    inner += row('论点力度', thesis.strength);
    inner += row('表达清晰度', thesis.clarity);
    inner += listRow('改进建议', thesis.suggestions);
    parts.push(sectionBox('论点分析（thesisAnalysis）', inner));
  }

  if (hasAnyValue(evidence.sufficiency, hasAnyList(evidence.types, evidence.risks))) {
    let inner = row('论据充分性', evidence.sufficiency);
    inner += listRow('论据类型', evidence.types);
    inner += listRow('论据不足风险', evidence.risks);
    inner += listRow('建议补充', evidence.suggestions);
    parts.push(sectionBox('论据评估（evidenceEvaluation）', inner));
  }

  if (hasAnyValue(logic.coherence, logic.transitionQuality, hasList(logic.flowIssues))) {
    let inner = row('整体连贯性', logic.coherence);
    inner += row('段落衔接质量', logic.transitionQuality);
    inner += listRow('结构问题', logic.flowIssues);
    parts.push(sectionBox('逻辑结构（logicStructure）', inner));
  }

  return parts.join('');
}

function buildSummaryAnalysis(safeData) {
  const parts = [];
  const commentary = safeData?.commentaryAnalysis || {};

  if (hasList(safeData?.keyPoints)) {
    parts.push(sectionBox('关键要点（keyPoints）', listItems(safeData.keyPoints)));
  }
  if (hasList(safeData?.summaryRules)) {
    parts.push(sectionBox('概要规则（summaryRules）', listItems(safeData.summaryRules)));
  }
  if (hasList(safeData?.missedPoints)) {
    parts.push(sectionBox('遗漏要点（missedPoints）', listItems(safeData.missedPoints)));
  }
  if (hasList(safeData?.personalOpinionAlerts)) {
    parts.push(sectionBox('个人观点风险提醒（personalOpinionAlerts）', listItems(safeData.personalOpinionAlerts)));
  }
  if (hasAnyValue(commentary.stance, commentary.reasoningPath, commentary.valueFocus)) {
    let inner = row('核心立场', commentary.stance);
    inner += row('推理路径', commentary.reasoningPath);
    inner += row('价值聚焦', commentary.valueFocus);
    parts.push(sectionBox('评论分析（commentaryAnalysis）', inner));
  }

  return parts.join('');
}

function buildSpeechAnalysis(safeData) {
  const parts = [];
  const scenario = safeData?.scenarioAnalysis || {};
  const task = safeData?.taskAnalysis || {};
  const tone = safeData?.toneAnalysis || {};

  if (hasAnyValue(scenario.occasion, scenario.speakerRole, scenario.audience)) {
    let inner = row('演讲场合', scenario.occasion);
    inner += row('演讲身份', scenario.speakerRole);
    inner += row('听众对象', scenario.audience);
    inner += row('演讲目的', scenario.purpose);
    parts.push(sectionBox('演讲情境分析（scenarioAnalysis）', inner));
  }

  if (hasAnyValue(task.structureFocus, hasAnyList(task.hardRequirements, task.contentChecklist))) {
    let inner = row('结构重点', task.structureFocus);
    inner += listRow('硬性要求', task.hardRequirements);
    inner += listRow('内容清单', task.contentChecklist);
    inner += listRow('隐性目标', task.implicitGoals);
    inner += listRow('常见误区', task.commonPitfalls);
    parts.push(sectionBox('任务分析（taskAnalysis）', inner));
  }

  if (hasAnyValue(tone.appropriateness, tone.style, tone.suggestions)) {
    let inner = row('语气适切性', tone.appropriateness);
    inner += row('表达风格', tone.style);
    inner += row('改进建议', tone.suggestions);
    parts.push(sectionBox('语气与风格分析（toneAnalysis）', inner));
  }

  return parts.join('');
}

function buildLetterNoticeAnalysis(safeData) {
  const parts = [];
  const scenario = safeData?.scenarioAnalysis || {};
  const task = safeData?.taskAnalysis || {};
  const format = safeData?.formatAnalysis || {};

  if (hasAnyValue(scenario.writerRole, scenario.recipientRole, scenario.purpose, scenario.occasion)) {
    let inner = row('写作身份', scenario.writerRole);
    inner += row('收信人', scenario.recipientRole);
    inner += row('写作目的', scenario.purpose);
    inner += row('应用场合', scenario.occasion);
    parts.push(sectionBox('写作情境分析（scenarioAnalysis）', inner));
  }

  if (hasAnyValue(task.structureFocus, hasAnyList(task.hardRequirements, task.contentChecklist))) {
    let inner = row('结构重点', task.structureFocus);
    inner += listRow('硬性要求', task.hardRequirements);
    inner += listRow('内容清单', task.contentChecklist);
    inner += listRow('隐性目标', task.implicitGoals);
    inner += listRow('常见误区', task.commonPitfalls);
    parts.push(sectionBox('任务分析（taskAnalysis）', inner));
  }

  if (hasAnyValue(format.greeting, format.signOff, hasList(format.bodyTasks))) {
    let inner = row('称呼格式', format.greeting);
    inner += listRow('主体任务', format.bodyTasks);
    inner += row('开头套语', format.openingTask);
    inner += row('结尾任务', format.closingExpectation || format.closingTask);
    inner += row('结尾署名', format.signOff);
    parts.push(sectionBox('格式规范（formatAnalysis）', inner));
  }

  return parts.join('');
}

function buildNarrativeDiaryAnalysis(safeData) {
  const parts = [];
  const story = safeData?.storyLine || {};
  const emotionLine = safeData?.emotionLine || {};
  const tone = safeData?.toneAnalysis || {};

  if (Object.keys(story).length) {
    const cells = [
      ['人物', story.who],
      ['时间', story.when],
      ['地点', story.where],
      ['起因', story.why],
      ['经过', story.what],
      ['结果/方向', story.result],
    ].filter(([, v]) => v);
    if (cells.length) parts.push(`<div style="margin-bottom:10px;"><strong>故事线索拆解</strong></div>${triColumn(cells)}`);
  }

  const emotionChanges = Array.isArray(emotionLine.changes) ? emotionLine.changes : [];
  if (hasAnyValue(emotionLine.tone, emotionLine.initial, emotionChanges.length)) {
    let inner = row('情感基调', emotionLine.tone);
    inner += row('初始情感', emotionLine.initial);
    if (emotionChanges.length)
      inner += `<div style="margin-top:8px;"><strong>情感变化路径：</strong>${emotionChanges.map(h).join(' → ')}</div>`;
    parts.push(sectionBox('情感线索分析', inner));
  }

  if (hasAnyValue(tone.appropriateness, tone.style)) {
    let inner = row('语气特点', tone.style);
    inner += row('适切性', tone.appropriateness);
    inner += row('建议', tone.suggestions);
    parts.push(sectionBox('语气与表达风格', inner));
  }

  return parts.join('');
}

function buildReviewAnalysis(safeData) {
  const parts = [];
  const material = safeData?.materialAnalysis || {};
  const commentary = safeData?.commentaryAnalysis || {};

  if (hasAnyValue(material.materialType, material.topic, material.taskBoundary)) {
    let inner = row('材料类型', material.materialType);
    inner += row('核心话题', material.topic);
    inner += row('任务边界', material.taskBoundary);
    parts.push(sectionBox('材料分析（materialAnalysis）', inner));
  }

  if (hasAnyValue(commentary.stance, commentary.reasoningPath, commentary.valueFocus)) {
    let inner = row('核心立场', commentary.stance);
    inner += row('推理路径', commentary.reasoningPath);
    inner += row('价值聚焦', commentary.valueFocus);
    parts.push(sectionBox('评论分析（commentaryAnalysis）', inner));
  }

  if (hasList(safeData?.missedPoints)) {
    parts.push(sectionBox('遗漏要点', listItems(safeData.missedPoints)));
  }

  return parts.join('');
}

function buildChartWritingAnalysis(safeData) {
  const parts = [];
  const material = safeData?.materialAnalysis || {};
  const structure = safeData?.structureAnalysis || {};
  const task = safeData?.taskAnalysis || {};

  if (hasAnyValue(material.materialType, material.topic, material.taskBoundary)) {
    let inner = row('材料类型', material.materialType);
    inner += row('核心话题', material.topic);
    inner += row('任务边界', material.taskBoundary);
    parts.push(sectionBox('图表材料分析（materialAnalysis）', inner));
  }

  if (hasAnyValue(structure.summaryTask, structure.commentaryTask, structure.outline)) {
    let inner = row('概要任务', structure.summaryTask);
    inner += row('评论任务', structure.commentaryTask);
    inner += row('结构纲要', structure.outline);
    parts.push(sectionBox('结构分析（structureAnalysis）', inner));
  }

  if (hasAnyValue(task.structureFocus, hasAnyList(task.hardRequirements, task.contentChecklist))) {
    let inner = row('结构重点', task.structureFocus);
    inner += listRow('硬性要求', task.hardRequirements);
    inner += listRow('内容清单', task.contentChecklist);
    inner += listRow('隐性目标', task.implicitGoals);
    inner += listRow('常见误区', task.commonPitfalls);
    parts.push(sectionBox('任务分析（taskAnalysis）', inner));
  }

  return parts.join('');
}

function buildExpoReportProposalAnalysis(safeData) {
  const parts = [];
  const structure = safeData?.structureAnalysis || {};
  const task = safeData?.taskAnalysis || {};
  const format = safeData?.formatAnalysis || {};
  const scenario = safeData?.scenarioAnalysis || {};

  if (hasAnyValue(scenario.writerRole, scenario.recipientRole, scenario.purpose)) {
    let inner = row('写作身份', scenario.writerRole);
    inner += row('目标读者', scenario.recipientRole);
    inner += row('写作目的', scenario.purpose);
    inner += row('应用场合', scenario.occasion);
    parts.push(sectionBox('写作情境（scenarioAnalysis）', inner));
  }

  if (hasAnyValue(structure.summaryTask, structure.commentaryTask, structure.outline)) {
    let inner = row('概要任务', structure.summaryTask);
    inner += row('评论任务', structure.commentaryTask);
    inner += row('结构纲要', structure.outline);
    parts.push(sectionBox('结构分析（structureAnalysis）', inner));
  }

  if (hasAnyValue(task.structureFocus, hasAnyList(task.hardRequirements, task.contentChecklist))) {
    let inner = row('结构重点', task.structureFocus);
    inner += listRow('硬性要求', task.hardRequirements);
    inner += listRow('内容清单', task.contentChecklist);
    inner += listRow('隐性目标', task.implicitGoals);
    inner += listRow('常见误区', task.commonPitfalls);
    parts.push(sectionBox('任务分析（taskAnalysis）', inner));
  }

  if (hasAnyValue(format.greeting, format.signOff, hasList(format.bodyTasks))) {
    let inner = row('称呼格式', format.greeting);
    inner += listRow('主体任务', format.bodyTasks);
    inner += row('开头套语', format.openingTask);
    inner += row('结尾任务', format.closingExpectation || format.closingTask);
    inner += row('结尾署名', format.signOff);
    parts.push(sectionBox('格式规范（formatAnalysis）', inner));
  }

  return parts.join('');
}

function buildTypeSpecificAnalysis(safeData, writingType) {
  switch (writingType) {
    case 'continuation':
      return buildContinuationAnalysis(safeData);
    case 'argumentative':
      return buildArgumentativeAnalysis(safeData);
    case 'summary':
      return buildSummaryAnalysis(safeData);
    case 'speech':
      return buildSpeechAnalysis(safeData);
    case 'letter':
    case 'notice':
      return buildLetterNoticeAnalysis(safeData);
    case 'narrative':
    case 'picture_writing':
    case 'diary':
      return buildNarrativeDiaryAnalysis(safeData);
    case 'review':
      return buildReviewAnalysis(safeData);
    case 'chart_writing':
      return buildChartWritingAnalysis(safeData);
    case 'expository':
    case 'report':
    case 'proposal':
      return buildExpoReportProposalAnalysis(safeData);
    default:
      return '';
  }
}

// ─── vocabulary & sentence pattern rendering ─────────────────────────────────

function buildVocabHtml(vocabGroups) {
  if (!Array.isArray(vocabGroups) || !vocabGroups.length) return '<div>暂无写作词汇内容</div>';
  return vocabGroups.map(group => {
    const words = (Array.isArray(group.words) ? group.words : Array.isArray(group.items) ? group.items : []).slice(0, 10);
    const wordHtml = words.map(item => {
      const word = h(item.word || item.en || item.text || '');
      const pos = item.pos ? `<em style="color:#8a7d6e;">(${h(item.pos)})</em>` : '';
      const zh = item.zh || item.meaning || item.cn ? `${h(item.zh || item.meaning || item.cn)}` : '';
      const example = item.example ? `<span style="color:#5a6e8a;font-style:italic;">${h(item.example)}</span>` : '';
      if (!word) return '';
      const parts = [zh, example].filter(Boolean).join('：');
      return `<div style="margin:2px 0; padding:3px 7px; background:#f5f1eb; border-radius:4px;">
        <strong>${word}</strong> ${pos}${parts ? ` — ${parts}` : ''}
      </div>`;
    }).filter(Boolean).join('');
    return `<div style="margin:5px 0 8px;">
      <div style="font-weight:bold;margin-bottom:3px;">${h(group.category || '写作词汇')} ${h(group.icon || '')}</div>
      ${wordHtml || '<div>暂无内容</div>'}
    </div>`;
  }).join('');
}

function buildSentencePatternHtml(sentenceGroups) {
  if (!Array.isArray(sentenceGroups) || !sentenceGroups.length) return '<div>暂无高分句型内容</div>';
  return sentenceGroups.map(group => {
    const patterns = (Array.isArray(group.patterns) ? group.patterns : []).slice(0, 6);
    const patternHtml = patterns.map(item => {
      const pattern = h(item.pattern || '');
      const zhText = item.zh || item.meaning || item.cn || '';
      const zh = zhText ? `<span style="color:#8a7d6e;">${h(zhText)}</span>` : '';
      const usage = item.usage ? `<div style="color:#5a5a5a;font-size:8.5pt;margin-top:1px;">${h(item.usage)}</div>` : '';
      const example = item.example
        ? `<div style="color:#5a6e8a;font-style:italic;font-size:8.5pt;margin-top:1px;">${h(item.example)}</div>`
        : '';
      if (!pattern) return '';
      return `<div style="margin:4px 0; padding:4px 8px; background:#f5f1eb; border-radius:4px; border-left:2px solid #c8852a;">
        <div><strong>${pattern}</strong>${zh ? ` — ${zh}` : ''}</div>
        ${usage}${example}
      </div>`;
    }).filter(Boolean).join('');
    return `<div style="margin:5px 0 9px;">
      <div style="font-weight:bold;margin-bottom:3px;">${h(group.category || '高分句型')} ${h(group.icon || '')}</div>
      ${patternHtml || '<div>暂无内容</div>'}
    </div>`;
  }).join('');
}

function normalizeTextList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item;
      return item?.detail || item?.title || item?.technique || item?.comment || '';
    })
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function buildQuickDiagnosticsHtml(mainProblems, nextActions) {
  const problems = normalizeTextList(mainProblems).slice(0, 5);
  const actions = normalizeTextList(nextActions).slice(0, 5);
  if (!problems.length && !actions.length) return '';

  return `
  <h3>0. 快速诊断导航</h3>
  <div class="grid">
    <div class="box warn">
      <div style="font-weight:bold; margin-bottom:5px;">最影响得分的问题</div>
      ${(problems.length ? problems : ['暂无核心问题']).map((item, index) => `<div>${index + 1}. ${h(item)}</div>`).join('')}
    </div>
    <div class="box good">
      <div style="font-weight:bold; margin-bottom:5px;">下一步先改什么</div>
      ${(actions.length ? actions : ['暂无下一步行动']).map((item, index) => `<div>${index + 1}. ${h(item)}</div>`).join('')}
    </div>
  </div>`;
}

function buildErrorCatalogHtml(errorCatalog) {
  if (!Array.isArray(errorCatalog) || !errorCatalog.length) return '';

  return `
  <h3>2.1 语言错误全览</h3>
  <div class="box">
    ${errorCatalog.slice(0, 12).map((item, index) => `
      <div style="margin-bottom:6px; padding-bottom:6px; border-bottom:${index < Math.min(errorCatalog.length, 12) - 1 ? '1px solid #e8e0d5' : 'none'};">
        <div style="font-weight:bold; color:#8A6F5B;">#${h(item.no ?? index + 1)} ${item.severity ? ` · ${h(item.severity)}` : ''}${item.para ? ` · ${h(item.para)}` : ''}</div>
        <div><strong>原文：</strong><span style="color:#9a3a2a; text-decoration:line-through;">${h(item.original || '')}</span></div>
        <div><strong>修改：</strong><span style="color:#3a6a45; font-weight:bold;">${h(item.corrected || '')}</span></div>
        ${item.explanation ? `<div style="font-size:8.5pt; color:#5a5a5a;"><strong>说明：</strong>${h(item.explanation)}</div>` : ''}
      </div>
    `).join('')}
  </div>`;
}

function buildRubricComparisonHtml(rubric) {
  const tiers = Array.isArray(rubric?.tiers) ? rubric.tiers : [];
  if (!tiers.length) return '';

  return `
  <h3>4.1 评分档位对照</h3>
  <div class="box">
    ${tiers.map((tier) => {
      const isCurrent = tier.tier === rubric.currentTier;
      return `
        <div style="padding:5px 0; border-bottom:1px solid #e8e0d5; ${isCurrent ? 'background:#fff7ed;' : ''}">
          <strong>${h(tier.tier || '')}</strong>
          ${tier.scoreRange ? `<span style="color:#8A6F5B;"> · ${h(tier.scoreRange)}${String(tier.scoreRange).includes('分') ? '' : '分'}</span>` : ''}
          ${isCurrent ? '<span style="color:#c8852a; font-weight:bold;"> · 当前档</span>' : ''}
          <div style="font-size:8.8pt; color:#4a3928;">${h(tier.criteria || '')}</div>
        </div>`;
    }).join('')}
    ${rubric.gapAnalysis ? `<div style="margin-top:8px;"><strong>晋档建议：</strong>${h(rubric.gapAnalysis)}</div>` : ''}
  </div>`;
}

function buildImprovementPlanHtml(plan) {
  if (!plan || typeof plan !== 'object') return '';
  const coreProblems = normalizeTextList(plan.coreProblems).slice(0, 5);
  const shortTermActions = normalizeTextList(plan.shortTermActions).slice(0, 6);
  if (!coreProblems.length && !shortTermActions.length) return '';

  return `
  <h3>4.2 提分计划</h3>
  <div class="grid">
    <div class="box danger">
      <div style="font-weight:bold; margin-bottom:5px;">核心问题</div>
      ${(coreProblems.length ? coreProblems : ['暂无核心问题']).map((item) => `<div>• ${h(item)}</div>`).join('')}
    </div>
    <div class="box good">
      <div style="font-weight:bold; margin-bottom:5px;">立即行动${plan.targetTier ? `（目标：${h(plan.targetTier)}）` : ''}</div>
      ${(shortTermActions.length ? shortTermActions : ['暂无行动计划']).map((item, index) => `<div>${index + 1}. ${h(item)}</div>`).join('')}
    </div>
  </div>`;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function chooseArray(primary, fallback) {
  const primaryList = normalizeArray(primary);
  return primaryList.length ? primaryList : normalizeArray(fallback);
}

function pushIfValue(items, value, formatter) {
  if (value) items.push(formatter(value));
}

function buildSuggestions(safeData) {
  const improvements = normalizeArray(safeData?.improvements);
  return improvements.length ? improvements : normalizeArray(safeData?.suggestions);
}

function formatHighlightVocabulary(item) {
  return item.comment ? `${item.word}：${item.comment}` : item.word;
}

function formatHighlightSentence(item) {
  return item.comment ? `${item.original}：${item.comment}` : item.original;
}

function buildHighlightItems(safeData) {
  return [
    ...normalizeArray(safeData?.highlights?.content),
    ...normalizeArray(safeData?.highlights?.vocabulary).map(formatHighlightVocabulary),
    ...normalizeArray(safeData?.highlights?.sentences).map(formatHighlightSentence),
  ].map((item) => String(item || '').trim()).filter(Boolean);
}

function buildVocabGroupsModel(safeData) {
  const sceneVocabulary = normalizeArray(safeData?.sceneVocabulary);
  if (sceneVocabulary.length) return sceneVocabulary;

  return normalizeArray(safeData?.phraseSuggestions?.categories).map((cat) => ({
    category: cat.category,
    icon: cat.icon || '',
    words: Array.isArray(cat.items) ? cat.items : [],
  }));
}

function buildLanguageErrors(safeData, errorCatalog) {
  if (errorCatalog.length) return [];
  const grammarIssues = normalizeArray(safeData?.grammarIssues);
  return grammarIssues.length ? grammarIssues : normalizeArray(safeData?.grammar);
}

function buildContentBlocks(safeData) {
  const items = normalizeArray(safeData?.contentLogic).map((item) => formatFeedbackItem(item));
  const plotLogic = safeData?.contentAnalysis?.plotLogic || {};
  const characterConsistency = safeData?.contentAnalysis?.characterConsistency || {};
  const themeAlignment = safeData?.contentAnalysis?.themeAlignment || {};

  pushIfValue(items, plotLogic.accuracy, (value) => `情节合理性：${value}`);
  pushIfValue(items, plotLogic.coherence, (value) => `情节衔接：${value}`);
  pushIfValue(items, plotLogic.closure, (value) => `结尾收束：${value}`);
  pushIfValue(items, characterConsistency.motivation, (value) => `人物行为一致性：${value}`);
  pushIfValue(items, characterConsistency.emotion, (value) => `人物情绪表达：${value}`);
  pushIfValue(items, themeAlignment.comment, (value) => `主题呼应度：${value}`);

  return [
    ...items,
    ...normalizeArray(safeData?.missedPoints).map((item) => `遗漏要点：${item}`),
    ...normalizeArray(safeData?.keyPoints).map((item) => `关键要点：${item}`),
  ];
}

function buildStructureBlocks(safeData) {
  return [
    ...(safeData?.logicStructure?.coherence ? [`整体连贯性：${safeData.logicStructure.coherence}`] : []),
    ...(safeData?.logicStructure?.transitionQuality ? [`段落衔接质量：${safeData.logicStructure.transitionQuality}`] : []),
    ...(normalizeArray(safeData?.logicStructure?.flowIssues).length ? [`结构风险：${safeData.logicStructure.flowIssues.join('；')}`] : []),
    ...normalizeArray(safeData?.structure).map((item) => formatFeedbackItem(item, '结构项：暂无说明')),
    ...(safeData?.storyLine?.result ? [`续写/结果方向：${safeData.storyLine.result}`] : []),
  ];
}

function buildQuestionLineHtml(label, values, separator = '；') {
  return values.length ? `<div style="margin-top:8px;"><strong>${label}：</strong>${values.map(h).join(separator)}</div>` : '';
}

function buildQuestionAnalysisHtml({ questionAnalysis, safeData, typeSpecificHtml }) {
  const focusPoints = chooseArray(questionAnalysis?.focusPoints, safeData?.focusPoints);
  const risks = chooseArray(questionAnalysis?.risks, safeData?.risks);
  const themes = chooseArray(questionAnalysis?.themes, safeData?.themes);

  return `
  <h2>二、题目分析</h2>
  <div class="box" style="margin-bottom:10px;">
    <div><strong>概览：</strong>${h(questionAnalysis?.overview || questionAnalysis?.reason || safeData?.overview || safeData?.reason || '暂无题目分析内容')}</div>
    ${buildQuestionLineHtml('关注重点', focusPoints)}
    ${buildQuestionLineHtml('风险提醒', risks)}
    ${buildQuestionLineHtml('主题标签', themes, '、')}
  </div>
  ${typeSpecificHtml}`;
}

function buildHighlightsAdviceHtml(highlightItems, suggestions) {
  const highlights = highlightItems.length
    ? highlightItems
    : ['先把任务完成度和基础表达稳住已经很不错了，继续修改下去，亮点会慢慢长出来。'];
  const adviceItems = suggestions.length ? suggestions : ['暂无写作建议'];

  return `
  <h3>1. 写作亮点与建议</h3>
  <div class="grid">
    <div class="box good">
      <div style="font-weight:bold; margin-bottom:5px;">写作亮点</div>
      ${highlights.map(item => `<div>• ${h(item)}</div>`).join('')}
    </div>
    <div class="box warn">
      <div style="font-weight:bold; margin-bottom:5px;">写作建议</div>
      ${adviceItems.map(item => `<div>• ${h(typeof item === 'string' ? item : (item.title || item.detail || '继续完善表达'))}</div>`).join('')}
    </div>
  </div>`;
}

function buildLanguageIssueHtml(item) {
  return `
      <div style="margin-bottom:6px; border:1px solid #e8e0d5; border-radius:5px; overflow:hidden;">
        <div style="display:grid; grid-template-columns:1fr 1fr;">
          <div class="box danger" style="border:none; border-radius:0;"><strong>原文：</strong>${h(item.original || '暂无内容')}</div>
          <div class="box good" style="border:none; border-radius:0;"><strong>修改：</strong>${h(item.corrected || '—')}</div>
        </div>
        ${item.explanation ? `<div style="padding:4px 10px; font-size:8.5pt; color:#5a5a5a;"><strong>说明：</strong>${h(item.explanation)}</div>` : ''}
      </div>`;
}

function buildLanguageCritiqueHtml(errorCatalog, errors, errorCatalogHtml) {
  const fallbackErrors = [{ original: '暂无语法纠错内容', corrected: '', explanation: '' }];
  const issueItems = errors.length ? errors : fallbackErrors;
  const issueHtml = errorCatalog.length > 0
    ? '<div>详细语言问题已在“语言错误全览”中列出，可按编号逐条修改。</div>'
    : issueItems.slice(0, 8).map(buildLanguageIssueHtml).join('');

  return `
  <h3>2. 语言精批</h3>
  ${errorCatalogHtml}
  <div class="box">
    ${issueHtml}
  </div>`;
}

function buildBulletBoxHtml(title, items, fallback) {
  const values = items.length ? items : [fallback];

  return `
  <h3>${title}</h3>
  <div class="box">
    ${values.map(item => `<div>• ${h(formatFeedbackItem(item, ''))}</div>`).join('')}
  </div>`;
}

function buildSampleEssayBox(sampleEssay, fallbackTitle) {
  if (!sampleEssay?.text) return '';
  const highlights = normalizeArray(sampleEssay.highlights);

  return `
  <div class="box" style="margin-bottom:8px;">
    <div style="font-weight:bold; margin-bottom:5px;">${h(sampleEssay.title || fallbackTitle)}</div>
    <div class="essay">${h(sampleEssay.text)}</div>
    ${highlights.length ? `<div style="margin-top:5px;">${highlights.map(item => `<span class="tag">⭐ ${h(item)}</span>`).join('')}</div>` : ''}
  </div>`;
}

function buildSampleEssaysHtml(correctedSampleEssay, excellentSampleEssay) {
  const correctedHtml = buildSampleEssayBox(correctedSampleEssay, '批改后范文');
  const excellentHtml = buildSampleEssayBox(excellentSampleEssay, '优秀范文');
  return correctedHtml || excellentHtml ? `${correctedHtml}${excellentHtml}` : '<div class="box">暂无范文参考内容</div>';
}

function buildTeacherFeedbackHtml({ annotatedImage, teacherComment, teacherSurname }) {
  const commentHtml = teacherComment
    ? `<div class="box"><div style="font-weight:bold; margin-bottom:5px;">${h(teacherSurname)}老师评语</div>${h(teacherComment).replace(/\n/g, '<br>')}</div>`
    : '<div class="box">暂无教师评语</div>';
  const imageHtml = annotatedImage
    ? `<div style="margin-top:8px;"><img src="${annotatedImage}" alt="教师批注图片" style="max-width:100%; border-radius:6px; border:1px solid #e8e0d5;" /></div>`
    : '';

  return `${commentHtml}${imageHtml}`;
}

function getCurrentStudent({ studentName, user }) {
  const currentStudent = studentName || user?.realName || user?.name || '学生';
  return currentStudent;
}

function getPromptSummary({ promptText, question, safeData }) {
  return question?.promptText || promptText || safeData?.plotAnalysis?.originalText || '';
}

function getWritingType({ feedback, safeData }) {
  return normalizeType(safeData?.type || feedback?.writingType || feedback?.selectedType || 'general');
}

function buildPdfResourceModel(safeData) {
  const suggestions = buildSuggestions(safeData);
  const highlightItems = buildHighlightItems(safeData);
  const vocabGroups = buildVocabGroupsModel(safeData);
  const sentenceGroups = normalizeArray(safeData?.sentencePatterns);
  const errorCatalog = normalizeArray(safeData?.errorCatalog);
  const errors = buildLanguageErrors(safeData, errorCatalog);

  return {
    errorCatalog,
    errors,
    highlightItems,
    sentenceGroups,
    suggestions,
    vocabGroups,
  };
}

function buildPdfFeedbackSections(safeData, writingType) {
  const errorCatalog = normalizeArray(safeData?.errorCatalog);

  return {
    contentBlocks: buildContentBlocks(safeData),
    errorCatalogHtml: buildErrorCatalogHtml(errorCatalog),
    improvementPlanHtml: buildImprovementPlanHtml(safeData?.improvementPlan),
    quickDiagnosticsHtml: buildQuickDiagnosticsHtml(safeData?.mainProblems || safeData?.weaknesses, safeData?.nextActions),
    rubricComparisonHtml: buildRubricComparisonHtml(safeData?.rubricComparison),
    structureBlocks: buildStructureBlocks(safeData),
    typeSpecificHtml: buildTypeSpecificAnalysis(safeData, writingType),
  };
}

function buildPdfSampleModel(safeData) {
  const correctedSampleEssay = safeData?.correctedSampleEssay || null;
  const excellentSampleEssay = safeData?.excellentSampleEssay || safeData?.sampleEssay || null;

  return {
    correctedSampleEssay,
    excellentSampleEssay,
  };
}

function buildPdfModel({
  annotatedImage,
  feedback,
  originalText,
  promptText,
  question,
  safeData,
  studentName,
  teacherComment,
  teacherSurname,
  typeInfo,
  user,
}) {
  const writingType = getWritingType({ feedback, safeData });

  return {
    annotatedImage,
    currentStudent: getCurrentStudent({ studentName, user }),
    feedback,
    originalText,
    overall: safeData?.overall || {},
    promptSummary: getPromptSummary({ promptText, question, safeData }),
    question,
    questionAnalysis: feedback?.questionAnalysis || safeData?.questionAnalysis || {},
    resolvedTypeInfo: typeInfo || {},
    safeData,
    teacherComment,
    teacherSurname,
    ...buildPdfResourceModel(safeData),
    ...buildPdfSampleModel(safeData),
    ...buildPdfFeedbackSections(safeData, writingType),
  };
}

function renderFeedbackPdfHtml(model) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${h(model.resolvedTypeInfo.title)} - ${h(model.currentStudent)}</title>
<style>
  @page { size: A4; margin: 10mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #2a1f14; line-height: 1.6; font-size: 9.5pt; }
  h1 { font-size: 16pt; margin: 0 0 4px; }
  h2 { font-size: 11.5pt; color: #8b5e1a; border-bottom: 1.5px solid #c8852a; padding-bottom: 4px; margin: 14px 0 8px; }
  h3 { font-size: 10pt; margin: 10px 0 5px; color: #8b5e1a; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #fdf0d8; color: #8b5e1a; border: 1px solid #f0cc80; font-size: 8.5pt; font-weight: 700; }
  .box { border: 1px solid #e8e0d5; border-radius: 6px; padding: 8px 10px; background: #faf8f5; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 7px; }
  .tag { display:inline-block; padding:1px 7px; border-radius:999px; background:#edfaf3; color:#2d9e6b; border:1px solid #a7f3d0; margin:2px 4px 2px 0; font-size:8pt; }
  .warn { background:#fff7ed; border-color:#fdba74; }
  .danger { background:#fdf0ef; border-color:#fca5a5; }
  .good { background:#edfaf3; border-color:#a7f3d0; }
  .essay { white-space: pre-wrap; font-family: Georgia, serif; line-height: 1.85; font-size: 9pt; }
  .page-break { page-break-before: always; }
  .mt4 { margin-top: 4px; }
  .mt6 { margin-top: 6px; }
  strong { color: inherit; }
</style>
</head>
<body>
  <div style="text-align:center; margin-bottom:10px;">
    <div class="badge">${h(model.resolvedTypeInfo.subtitle)}</div>
    <h1>${h(model.resolvedTypeInfo.title)}</h1>
    <div style="color:#8a7d6e; font-size:8.5pt;">${h((model.question && model.question.title) || model.feedback?.writingTitle || '未命名题目')}</div>
  </div>

  <h2>一、总览</h2>
  <div class="box">
    <div><strong>学生：</strong>${h(model.currentStudent)}</div>
    <div><strong>总分：</strong>${h(model.overall.score ?? '--')} / ${h(model.overall.total ?? '--')}（${h(model.overall.grade || '--')}）</div>
    <div style="margin-top:8px;"><strong>总体评价：</strong>${h(model.overall.summary || '本次写作表现良好，继续保持！')}</div>
    ${model.promptSummary ? `<div style="margin-top:8px;"><strong>写作题目：</strong>${h(model.promptSummary)}</div>` : ''}
  </div>

  ${buildQuestionAnalysisHtml({ questionAnalysis: model.questionAnalysis, safeData: model.safeData, typeSpecificHtml: model.typeSpecificHtml })}

  <h2>三、写作资源库</h2>
  <div class="box">
    <div style="font-weight:bold; margin-bottom:5px;">高级词汇短语</div>
    ${buildVocabHtml(model.vocabGroups)}
    <div style="font-weight:bold; margin:8px 0 5px;">高分句型</div>
    ${buildSentencePatternHtml(model.sentenceGroups)}
  </div>

  <div class="page-break"></div>
  <h2>四、写作评价</h2>
  ${model.quickDiagnosticsHtml}

  ${buildHighlightsAdviceHtml(model.highlightItems, model.suggestions)}
  ${buildLanguageCritiqueHtml(model.errorCatalog, model.errors, model.errorCatalogHtml)}
  ${buildBulletBoxHtml('3. 内容深入分析', model.contentBlocks, '暂无内容深入分析')}
  ${buildBulletBoxHtml('4. 结构深入分析', model.structureBlocks, '暂无结构深入分析')}
  ${model.rubricComparisonHtml}
  ${model.improvementPlanHtml}

  <h3>5. 学生原文</h3>
  <div class="box essay">${h(model.originalText || '').trim() || '暂无学生原文内容'}</div>

  <h2>五、范文参考</h2>
  ${buildSampleEssaysHtml(model.correctedSampleEssay, model.excellentSampleEssay)}

  <div class="page-break"></div>
  <h2>六、教师批改</h2>
  ${buildTeacherFeedbackHtml({
    annotatedImage: model.annotatedImage,
    teacherComment: model.teacherComment,
    teacherSurname: model.teacherSurname,
  })}

  <script>setTimeout(() => window.print(), 500);</script>
</body>
</html>`;
}

// ─── main export ─────────────────────────────────────────────────────────────

export function buildFeedbackPdfHtml(options) {
  return renderFeedbackPdfHtml(buildPdfModel(options));
}
