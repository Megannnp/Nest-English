import { CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';


import { isMeaningfulText, normalizeType } from './feedbackAdapter';

function normalizeFeedbackType(feedback) {
  return normalizeType(feedback?.type || feedback?.writingType || feedback?.selectedType || 'general');
}

function asList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function joinList(value) {
  return asList(value).join('；');
}

const PRACTICAL_TYPES = new Set(['letter', 'notice', 'speech', 'report', 'proposal']);
const STORY_TYPES = new Set(['narrative', 'picture_writing', 'diary', 'review']);

function isTypeIn(type, typeSet) {
  return typeSet.has(type);
}

function listText(value, prefix = '', fallback = '') {
  const list = asList(value);
  return list.length ? `${prefix}${joinList(list)}` : fallback;
}

function meaningfulText(value, fallback = '') {
  return isMeaningfulText(value) ? value : fallback;
}

function prefixedMeaningfulText(value, prefix, fallback = '') {
  return isMeaningfulText(value) ? `${prefix}${value}` : fallback;
}

function listChoice(primaryValue, primaryPrefix, fallbackValue, fallbackPrefix = '', fallback = '') {
  return listText(primaryValue, primaryPrefix) || listText(fallbackValue, fallbackPrefix) || fallback;
}

function arrayText(value, prefix = '', fallback = '') {
  return Array.isArray(value) && value.length ? `${prefix}${value.join('；')}` : fallback;
}

function arrayOrStringText(value, prefix = '', fallback = '') {
  if (Array.isArray(value) && value.length) return `${prefix}${value.join('；')}`;
  if (typeof value === 'string' && value.trim()) return `${prefix}${value.trim()}`;
  return fallback;
}

function scenarioPositionText(scenarioAnalysis) {
  if (!isMeaningfulText(scenarioAnalysis?.purpose)) {
    return '应用文内容不仅要有信息，还要让身份、关系、语气彼此匹配。';
  }

  const parts = [
    scenarioAnalysis?.writerRole,
    scenarioAnalysis?.recipientRole,
    scenarioAnalysis?.purpose,
  ].filter(Boolean);
  return `当前场景定位：${parts.join(' / ')}`;
}

function reviewItemText(item) {
  if (typeof item === 'string') return item.trim();
  if (typeof item === 'number') return String(item);
  if (!item || typeof item !== 'object') return '';
  const title = String(item.title || item.name || '').trim();
  const detail = String(item.detail || item.comment || item.summary || item.advice || '').trim();
  if (title && detail) return `${title}：${detail}`;
  return title || detail;
}

function reviewItemList(value) {
  return asList(value).map(reviewItemText).filter(Boolean);
}

function GrammarPracticeLink({ onNavigate, sampleSentence }) {
  // Prefer the prop so parent can drive navigation (e.g. inside a modal that
  // must close first).  Fall back to react-router navigate so we stay in the
  // SPA and avoid a full page reload.
  const navigate = useNavigate();
  const handleNavigate = (target) => {
    if (typeof onNavigate === 'function') {
      onNavigate(target);
      return;
    }
    navigate(target === 'grammar-courses' ? '/grammar/courses' : '/grammar/analyzer');
  };

  return (
    <div style={{
      marginTop: 10,
      padding: '10px 12px',
      background: '#f5f0ff',
      border: '1px solid #ded4f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#5c3d9e', marginBottom: 3 }}>Grammar 延伸练习</div>
        <div style={{ fontSize: 12, color: '#6f6284', lineHeight: 1.6 }}>
          {sampleSentence
            ? '把这类错误放到 Grammar Analyzer 里拆句，先看清主干和从句。'
            : '进入 Grammar Studio，按语法模块继续练习。'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => handleNavigate('grammar-analyzer')}
          style={{
            border: 'none',
            background: '#5c3d9e',
            color: '#fff',
            fontSize: 12,
            fontWeight: 800,
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          去拆句分析
        </button>
        <button
          type="button"
          onClick={() => handleNavigate('grammar-courses')}
          style={{
            border: '1px solid #c9b9ea',
            background: '#fff',
            color: '#5c3d9e',
            fontSize: 12,
            fontWeight: 800,
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          看相关课程
        </button>
      </div>
    </div>
  );
}

function buildPlotContentCard(feedback, contentAnalysis) {
  const plotLogic = feedback?.plotLogic || contentAnalysis?.plotLogic || {};

  return {
    title: '情节合理性与完整性',
    body: meaningfulText(
      plotLogic?.summary,
      '需要围绕题目要求继续补足关键事件的发展、转折和收束，避免只概括结果、不展开过程。'
    ),
    extra: listChoice(plotLogic?.strengths, '当前亮点：', plotLogic?.risks, '当前风险：'),
    footer: listChoice(
      plotLogic?.bridgingSuggestions,
      '衔接建议：',
      plotLogic?.risks,
      '针对性建议：',
      '结尾需要既交代结果，也回应主题收束。'
    ),
  };
}

function buildCharacterContentCard(feedback, contentAnalysis) {
  const characterConsistency = feedback?.characterConsistency || contentAnalysis?.characterConsistency || {};

  return {
    title: '人物行为与情感一致性',
    body: meaningfulText(characterConsistency?.summary, '人物行为需要更清楚地来自其心理变化，这样人物才可信。'),
    extra: listChoice(characterConsistency?.strengths, '当前亮点：', characterConsistency?.risks, '需要注意：'),
    footer: listText(
      characterConsistency?.revisionFocus,
      '修改聚焦：',
      '修改时优先把“人物为什么这么做”写清楚，再补动作和神态，情感线会更自然。'
    ),
  };
}

function buildThemeContentCard(feedback, contentAnalysis) {
  const themeAlignment = feedback?.themeAlignment || contentAnalysis?.themeAlignment || {};

  return {
    title: '主题呼应度',
    body: meaningfulText(themeAlignment?.summary, '当前主题表达还不够集中，建议围绕原文主线组织内容，不要只写表层结果。'),
    extra: listChoice(
      themeAlignment?.strengths,
      '已有亮点：',
      themeAlignment?.risks,
      '仍需补强：',
      listText(feedback?.missedPoints, '遗漏要点：')
    ),
    footer: listChoice(themeAlignment?.revisionFocus, '回扣建议：', feedback?.keyPoints, '关注重点：'),
  };
}

function buildContinuationContentCards(feedback, contentAnalysis) {
  return [
    buildPlotContentCard(feedback, contentAnalysis),
    buildCharacterContentCard(feedback, contentAnalysis),
    buildThemeContentCard(feedback, contentAnalysis),
  ];
}

function buildSummaryContentCards(feedback, contentAnalysis) {
  return [
    {
      title: '材料概括准确度',
      body: prefixedMeaningfulText(
        feedback?.materialAnalysis?.coreMessage,
        '材料主旨把握：',
        listText(feedback?.keyPoints, '当前概括已经抓到的核心信息包括：', '概括部分首先要确保主旨与关键信息都被准确覆盖。')
      ),
      extra: listText(feedback?.missedPoints, '仍需补足：', '建议回到原文，先区分主旨、核心论点和次要细节，再决定保留什么。'),
      footer: listText(feedback?.personalOpinionAlerts, '需规避：', '概要部分要坚持客观转述，避免把个人评论提前混入概括段。'),
    },
    {
      title: '评论部分的立场与论证',
      body: prefixedMeaningfulText(feedback?.commentaryAnalysis?.stance, '立场表达：', '评论段需要尽快亮出自己的观点，不能只停留在复述材料。'),
      extra: arrayOrStringText(feedback?.commentaryAnalysis?.reasoningPath, '论证路径：', '建议采用”观点一句话点明 + 1到2个理由展开”的写法，让评论更有重心。'),
      footer: prefixedMeaningfulText(feedback?.commentaryAnalysis?.valueFocus, '价值落点：', '结尾可以回扣现实意义或价值启示，但不要空泛拔高。'),
    },
    {
      title: '内容完成度',
      body: meaningfulText(contentAnalysis?.communicationGoal, '概要述评要同时完成“概括材料”和“表达评价”两层任务，缺一都会影响任务完成度。'),
      extra: listText(feedback?.summaryRules, '可参考的概括原则：'),
      footer: '修改时优先检查“概括是否准确、评论是否独立、两部分衔接是否自然”。',
    },
  ];
}

function buildPracticalGoalCard(feedback, contentAnalysis) {
  return {
    title: '交际目标完成度',
    body: meaningfulText(contentAnalysis?.communicationGoal, '这类应用文最关键的是让读者迅速明白你要表达什么、希望对方做什么。'),
    extra: arrayText(feedback?.taskAnalysis?.hardRequirements, '题目硬性任务：'),
    footer: arrayText(feedback?.taskAnalysis?.implicitGoals, '隐性交际要求：', '建议检查是否既覆盖了题目要求，也体现了对应场景下的交际目的。'),
  };
}

function buildPracticalToneCard(feedback) {
  return {
    title: '角色与语气适配',
    body: scenarioPositionText(feedback?.scenarioAnalysis),
    extra: prefixedMeaningfulText(feedback?.toneAnalysis?.appropriateness, '语气评价：', '建议检查措辞是否符合正式度，避免角色错位或语气过硬过软。'),
    footer: arrayOrStringText(feedback?.toneAnalysis?.suggestions, '优化方向：', '如果是请求、邀请、投诉、倡议等任务，结尾还要明确行动预期。'),
  };
}

function buildPracticalOrganizationCard(feedback) {
  return {
    title: '信息组织与闭环',
    body: arrayText(feedback?.formatAnalysis?.bodyTasks, '主体内容分工：', '建议把核心信息前置，再补关键细节、要求与结尾动作，形成完整闭环。'),
    extra: arrayText(feedback?.structureAnalysis?.paragraphPlan, '段落规划：'),
    footer: arrayText(feedback?.taskAnalysis?.commonPitfalls, '常见风险：', '避免把关键信息放得过晚，或只表达态度却缺少可执行细节。'),
  };
}

function buildPracticalContentCards(feedback, contentAnalysis) {
  return [
    buildPracticalGoalCard(feedback, contentAnalysis),
    buildPracticalToneCard(feedback),
    buildPracticalOrganizationCard(feedback),
  ];
}

function buildStoryLineCard(feedback, contentAnalysis) {
  return {
    title: '内容主线与选材',
    body: meaningfulText(contentAnalysis?.communicationGoal, '先确保全文围绕一个清晰主线展开，避免细节散、重点飘。'),
    extra: feedback?.storyLine?.what ? `当前主线：${feedback.storyLine.what}` : '',
    footer: feedback?.storyLine?.result ? `内容落点：${feedback.storyLine.result}` : '建议让每个细节都服务于核心事件或核心感受。',
  };
}

function buildEmotionCard(feedback) {
  return {
    title: '情感与表达一致性',
    body: feedback?.emotionLine?.initial ? `初始情绪：${feedback.emotionLine.initial}` : '情绪变化需要和事件推进同步，不能突然转折。',
    extra: arrayText(feedback?.emotionLine?.changes, '情绪变化：'),
    footer: feedback?.emotionLine?.tone ? `整体基调：${feedback.emotionLine.tone}` : '修改时优先补足“因为什么而有这种感受”。',
  };
}

function buildStoryThemeCard(feedback, contentAnalysis) {
  return {
    title: '主题回扣与收束',
    body: meaningfulText(contentAnalysis?.themeAlignment?.comment, '结尾需要回应前文主线，让全文形成意义上的收束。'),
    extra: prefixedMeaningfulText(feedback?.commentaryAnalysis?.valueFocus, '可升华方向：'),
    footer: '不要只停在事件结束，最好补出一层感悟、变化或判断。',
  };
}

function buildStoryContentCards(feedback, contentAnalysis) {
  return [
    buildStoryLineCard(feedback, contentAnalysis),
    buildEmotionCard(feedback),
    buildStoryThemeCard(feedback, contentAnalysis),
  ];
}

function buildGeneralContentCards(feedback, contentAnalysis) {
  return [
    {
      title: '任务完成度',
      body: meaningfulText(contentAnalysis?.communicationGoal, '当前反馈更需要先确认是否完整回应了题目要求，再进一步打磨细节。'),
      extra: listText(feedback?.keyPoints, '已经体现的重点：'),
      footer: listText(feedback?.missedPoints, '仍需补足：', '建议先把核心任务做完整，再追求语言亮点。'),
    },
    {
      title: '内容展开',
      body: reviewItemList(feedback?.contentLogic)[0] || '可以继续补强例子、细节或解释，让内容不是只停留在结论层面。',
      extra: reviewItemList(feedback?.contentLogic).slice(1, 3).join('；'),
      footer: '高质量内容通常表现为“有重点、有展开、有收束”。',
    },
  ];
}

function buildTypeSpecificContentCards(feedback) {
  const type = normalizeFeedbackType(feedback);
  const contentAnalysis = feedback?.contentAnalysis || {};

  if (type === 'continuation') return buildContinuationContentCards(feedback, contentAnalysis);
  if (type === 'summary') return buildSummaryContentCards(feedback, contentAnalysis);
  if (isTypeIn(type, PRACTICAL_TYPES)) return buildPracticalContentCards(feedback, contentAnalysis);
  if (isTypeIn(type, STORY_TYPES)) return buildStoryContentCards(feedback, contentAnalysis);
  return buildGeneralContentCards(feedback, contentAnalysis);
}

function structureEntryTextsFor(feedback) {
  const structureEntries = Array.isArray(feedback?.structure) ? feedback.structure : [];
  return structureEntries.map((item) =>
    typeof item === 'string' ? item : `${item.name || item.title || '结构观察'}：${item.comment || item.detail || item.summary || '暂无说明'}`
  );
}

function continuationOpeningBody(feedback, plotLogic, structureEntryTexts) {
  if (isMeaningfulText(plotLogic?.summary)) return plotLogic.summary;
  if (feedback?.storyLine?.result) {
    return `结合题目要求，这篇续写当前的整体走向是「${feedback.storyLine.result}」。需要重点检查两段结构是否真正回扣题干。`;
  }
  return structureEntryTexts[0] || '建议先确认两段分别承担什么叙事任务，再安排事件推进与主题回扣。';
}

function transitionBody(feedback, plotSuggestions, structureEntryTexts) {
  if (plotSuggestions.length) return `当前最值得补强的承接动作：${joinList(plotSuggestions)}`;
  if (feedback?.logicStructure?.transitionQuality) return `从段落推进看，${feedback.logicStructure.transitionQuality}。`;
  return structureEntryTexts[1] || '中间推进需要更清楚地体现“事件变化 - 人物反应 - 下一步动作”。';
}

function closureBody(feedback, plotRisks, structureEntryTexts) {
  if (plotRisks.length) return `当前闭环风险：${joinList(plotRisks)}`;
  if (feedback?.logicStructure?.coherence) return `从首句承接和结尾回扣来看，${feedback.logicStructure.coherence}。`;
  return structureEntryTexts[2] || '结尾需要回应首句任务，也要交代人物变化或主题升华。';
}

function buildContinuationStructureAspects(feedback, structureEntryTexts) {
  const plotLogic = feedback?.plotLogic || {};
  const plotSuggestions = asList(plotLogic?.bridgingSuggestions);
  const plotRisks = asList(plotLogic?.risks);

  return [
    {
      title: '任务承接与结构匹配',
      body: continuationOpeningBody(feedback, plotLogic, structureEntryTexts),
      advice: plotSuggestions[0] || '建议先明确两段各自承担的任务，再决定事件推进和结尾回扣。',
    },
    {
      title: '段落推进与衔接',
      body: transitionBody(feedback, plotSuggestions, structureEntryTexts),
      advice: '可以增加一句承上启下的过渡句，让第二段自然承接第一段结果。',
    },
    {
      title: '开头承接与结尾回扣',
      body: closureBody(feedback, plotRisks, structureEntryTexts),
      advice: '结尾不要只交代结果，最好补一层人物变化或主题升华。',
    },
    {
      title: '结构优化建议',
      body: listText(feedback?.logicStructure?.flowIssues, '当前最明显的结构风险包括：', structureEntryTexts[3] || '当前仍可进一步优化段落层次、过渡关系与结尾闭合度。'),
      advice: '优先处理情节跳跃、段落职责不清和收尾过快这三类问题。',
    },
  ];
}

function buildPracticalStructureAspects(feedback, structureEntryTexts) {
  return [
    {
      title: '开篇是否快速入题',
      body: feedback?.formatAnalysis?.openingTask
        ? `开篇任务：${feedback.formatAnalysis.openingTask}`
        : (structureEntryTexts[0] || '这类题型的开头要尽快点明身份、目的或核心事由。'),
      advice: '把最重要的信息放在首段，而不是先铺垫情绪或背景。',
    },
    {
      title: '主体段落分工',
      body: arrayText(feedback?.structureAnalysis?.paragraphPlan, '段落规划：', structureEntryTexts[1] || '主体部分最好做到一段一重点，让读者能快速抓住信息。'),
      advice: '每一段都要承担明确功能，比如说明目的、展开细节、提出要求或给出建议。',
    },
    {
      title: '结尾是否形成交际闭环',
      body: prefixedMeaningfulText(
        feedback?.formatAnalysis?.closingExpectation || feedback?.formatAnalysis?.closingTask,
        '结尾任务：',
        structureEntryTexts[2] || '结尾不能只是礼貌结束，还要交代行动预期或回应全文目的。'
      ),
      advice: '根据题型补出邀请确认、申请期待、建议信号召、报告建议等收束动作。',
    },
  ];
}

function buildSummaryStructureAspects(feedback, structureEntryTexts) {
  return [
    {
      title: '概括与评论的结构分离',
      body: prefixedMeaningfulText(feedback?.structureAnalysis?.summaryTask, '概括任务：', structureEntryTexts[0] || '概要述评最怕“概括和评论缠在一起”，导致两部分都不清。'),
      advice: '建议先用一段完成客观概括，再单独展开评论和启示。',
    },
    {
      title: '逻辑顺序与衔接',
      body: prefixedMeaningfulText(feedback?.logicStructure?.transitionQuality, '衔接评价：', structureEntryTexts[1] || '概括部分最好跟随原文逻辑，评论部分按“观点-理由-小结”展开。'),
      advice: '适当补上表示概括、转折、因果、递进的连接词，整体会更像成熟考场文。',
    },
    {
      title: '收尾质量',
      body: prefixedMeaningfulText(feedback?.structureAnalysis?.commentaryTask, '评论收束：', structureEntryTexts[2] || '结尾要么回扣主题，要么给出价值判断，不宜仓促收尾。'),
      advice: '让最后一句承担“总结立场”而不是简单重复前文。',
    },
  ];
}

function buildStoryStructureAspects(feedback, structureEntryTexts) {
  return [
    {
      title: '开头建立场景',
      body: structureEntryTexts[0] || '开头需要尽快交代场景、人物或事件起点，让读者知道故事从哪里开始。',
      advice: '不要在开头堆太多泛泛感想，先把事件入口搭起来。',
    },
    {
      title: '中段推进与层次',
      body: prefixedMeaningfulText(feedback?.logicStructure?.transitionQuality, '推进情况：', structureEntryTexts[1] || '中段最好按时间、动作或心理变化推进，避免细节平铺。'),
      advice: '每一段都应当推动事件、情绪或思考发生变化。',
    },
    {
      title: '结尾收束与回扣',
      body: prefixedMeaningfulText(feedback?.logicStructure?.coherence, '结构收束：', structureEntryTexts[2] || '结尾要回应前文主线，让全文形成完整的意义闭环。'),
      advice: '收尾时可以补一层感悟、态度或变化，但不要生硬拔高。',
    },
  ];
}

function buildGeneralStructureAspects(feedback, structureEntryTexts) {
  return [
    {
      title: '整体结构匹配度',
      body: feedback?.logicStructure?.coherence
        ? `${feedback.logicStructure.coherence}`
        : (structureEntryTexts[0] || '当前结构还可以继续强化段落分工和整体闭环。'),
      advice: '先确定每一段在整篇里的职责，再逐段修改会更稳。',
    },
    {
      title: '衔接与推进',
      body: feedback?.logicStructure?.transitionQuality
        ? `${feedback.logicStructure.transitionQuality}`
        : (structureEntryTexts[1] || '句间和段间衔接如果更清楚，整体阅读感会明显提升。'),
      advice: '可补上承接、转折、递进类表达，让内容不显得跳。',
    },
  ];
}

function buildTypeSpecificStructureAspects(feedback) {
  const type = normalizeFeedbackType(feedback);
  const structureEntryTexts = structureEntryTextsFor(feedback);

  if (type === 'continuation') return buildContinuationStructureAspects(feedback, structureEntryTexts);
  if (isTypeIn(type, PRACTICAL_TYPES)) return buildPracticalStructureAspects(feedback, structureEntryTexts);
  if (type === 'summary') return buildSummaryStructureAspects(feedback, structureEntryTexts);
  if (isTypeIn(type, STORY_TYPES)) return buildStoryStructureAspects(feedback, structureEntryTexts);
  return buildGeneralStructureAspects(feedback, structureEntryTexts);
}

// ─── Severity badge helpers ──────────────────────────────────────────────────

const SEVERITY_STYLES = {
  '严重': { bg: '#fdf0eb', border: '#d4a090', text: '#9a3a2a' },
  '中等': { bg: '#fdf6ee', border: '#c8b080', text: '#8A6F5B' },
  '轻微': { bg: '#f5f3f0', border: '#b8a898', text: '#6b5a47' },
};

function SeverityBadge({ severity }) {
  const s = SEVERITY_STYLES[severity] || SEVERITY_STYLES['轻微'];
  return (
    <span style={{
      display: 'inline-block',
      padding: '1px 7px',
      borderRadius: 0,
      fontSize: 11,
      fontWeight: 700,
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.text,
      flexShrink: 0,
    }}>
      {severity}
    </span>
  );
}

function StatusIcon({ status }) {
  if (status === '✅') return <CheckCircle size={16} strokeWidth={2} color="#3a6a45" style={{ flexShrink: 0 }} />;
  if (status === '❌') return <XCircle size={16} strokeWidth={2} color="#9a3a2a" style={{ flexShrink: 0 }} />;
  return <MinusCircle size={16} strokeWidth={2} color="#8A6F5B" style={{ flexShrink: 0 }} />;
}

// ─── TaskPointsBlock ──────────────────────────────────────────────────────────

export function TaskPointsBlock({ feedback, showHeading = true }) {
  const taskPoints = asList(feedback?.taskPoints);
  if (!taskPoints.length) return null;

  return (
    <div>
      {showHeading && <div style={{ fontSize: 13, fontWeight: 800, color: '#6b5a47', marginBottom: 8 }}>题目要点核查</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {taskPoints.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 0,
              background: '#ffffff',
              border: '1px solid #e8e0d5',
            }}
          >
            <StatusIcon status={item.status} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3D2C1F', lineHeight: 1.6 }}>{item.point}</div>
              {item.comment && (
                <div style={{ fontSize: 12, color: '#8A6F5B', lineHeight: 1.6, marginTop: 2 }}>{item.comment}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ErrorCatalogBlock ────────────────────────────────────────────────────────

export function ErrorCatalogBlock({ feedback, showHeading = true, onNavigate }) {
  const errors = asList(feedback?.errorCatalog);
  if (!errors.length) return null;
  const firstOriginal = errors.find((item) => item?.original)?.original || '';

  return (
    <div>
      {showHeading && <div style={{ fontSize: 13, fontWeight: 800, color: '#6b5a47', marginBottom: 8 }}>语言错误全览</div>}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {errors.map((item, index) => (
          <div
            key={index}
            style={{
              padding: '7px 0',
              borderBottom: index < errors.length - 1 ? '1px solid #e8e0d5' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#8a7d6e', minWidth: 20 }}>#{item.no ?? index + 1}</span>
              {item.severity && <SeverityBadge severity={item.severity} />}
              {item.para && (
                <span style={{ fontSize: 10, color: '#8A6F5B', fontWeight: 700 }}>{item.para}</span>
              )}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 2 }}>
              <span style={{ color: '#9a3a2a', fontWeight: 700 }}>✗ </span>
              <span style={{ color: '#9a3a2a', textDecoration: 'line-through' }}>{item.original}</span>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, marginBottom: item.explanation ? 2 : 0 }}>
              <span style={{ color: '#3a6a45', fontWeight: 700 }}>✓ </span>
              <span style={{ color: '#3a6a45', fontWeight: 700 }}>{item.corrected}</span>
            </div>
            {item.explanation && (
              <div style={{ fontSize: 11, color: '#8A6F5B', lineHeight: 1.6, marginTop: 1 }}>
                {item.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
      <GrammarPracticeLink onNavigate={onNavigate} sampleSentence={firstOriginal} />
    </div>
  );
}

// ─── RubricComparisonBlock ────────────────────────────────────────────────────

// Gradient: index 0 = 第五档 (richest) → index n-1 = 第一档 (most muted)
const TIER_BORDER_COLORS = ['#6b5a47', '#8A6F5B', '#a09080', '#b8a898', '#ccc0b4'];

export function RubricComparisonBlock({ feedback, showHeading = true }) {
  const rubric = feedback?.rubricComparison;
  if (!rubric) return null;

  const tiers = asList(rubric.tiers);
  if (!tiers.length) return null;

  return (
    <div>
      {showHeading && <div style={{ fontSize: 13, fontWeight: 800, color: '#6b5a47', marginBottom: 8 }}>档次对照表</div>}
      <div style={{ display: 'grid', gap: 8 }}>
        {tiers.map((tier, index) => {
          const isCurrent = tier.tier === rubric.currentTier;
          const borderColor = TIER_BORDER_COLORS[Math.min(index, TIER_BORDER_COLORS.length - 1)];
          return (
            <div
              key={index}
              style={{
                paddingLeft: 10,
                borderLeft: `${isCurrent ? 3 : 2}px solid ${borderColor}`,
                background: isCurrent ? 'rgba(160,100,30,0.06)' : 'transparent',
                paddingTop: isCurrent ? 4 : 0,
                paddingBottom: isCurrent ? 4 : 0,
                paddingRight: isCurrent ? 6 : 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: isCurrent ? 900 : 700, color: isCurrent ? borderColor : '#3D2C1F', whiteSpace: 'nowrap' }}>
                  {tier.tier}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: borderColor,
                  whiteSpace: 'nowrap',
                }}>
                  {tier.scoreRange}{String(tier.scoreRange || '').includes('分') ? '' : '分'}
                </span>
                {isCurrent && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: borderColor, fontWeight: 700, whiteSpace: 'nowrap' }}>← 当前</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: isCurrent ? '#2a1f14' : '#6b5a47', lineHeight: 1.65 }}>
                {tier.criteria}
              </div>
            </div>
          );
        })}
      </div>
      {rubric.gapAnalysis && (
        <div style={{ marginTop: 10, background: '#f5f0e8', padding: '8px 12px', fontSize: 12, color: '#4a3928', lineHeight: 1.7 }}>
          <span style={{ fontWeight: 700, color: '#6b5a47' }}>晋档建议：</span>{rubric.gapAnalysis}
        </div>
      )}
    </div>
  );
}

// ─── ImprovementPlanBlock ─────────────────────────────────────────────────────

export function ImprovementPlanBlock({ feedback, showHeading = true }) {
  const plan = feedback?.improvementPlan;
  if (!plan) return null;

  const toList = (v) => Array.isArray(v) ? v.filter(Boolean) : (typeof v === 'string' && v.trim() ? [v.trim()] : []);
  const coreProblems = toList(plan.coreProblems);
  const shortTermActions = toList(plan.shortTermActions);
  if (!coreProblems.length && !shortTermActions.length) return null;

  return (
    <div>
      {showHeading && <div style={{ fontSize: 13, fontWeight: 800, color: '#6b5a47', marginBottom: 8 }}>提分计划</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {coreProblems.length > 0 && (
          <div style={{ paddingLeft: 10, borderLeft: '2px solid #d4b0a8' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9a3a2a', marginBottom: 5 }}>核心问题</div>
            {coreProblems.map((p, i) => (
              <div key={i} style={{ fontSize: 13, color: '#3D2C1F', lineHeight: 1.75, display: 'flex', gap: 6 }}>
                <span style={{ color: '#9a3a2a', fontWeight: 700, flexShrink: 0 }}>·</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        )}
        {shortTermActions.length > 0 && (
          <div style={{ background: '#f5f0e8', padding: '8px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8A6F5B', marginBottom: 5 }}>
              立即行动
              {plan.targetTier && <span style={{ fontWeight: 700, marginLeft: 6, color: '#8a7d6e' }}>目标：{plan.targetTier}</span>}
            </div>
            {shortTermActions.map((a, i) => (
              <div key={i} style={{ fontSize: 13, color: '#3D2C1F', lineHeight: 1.75, display: 'flex', gap: 6 }}>
                <span style={{ color: '#6b5a47', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span>{a}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CohesionAnalysisBlock ────────────────────────────────────────────────────

export function CohesionAnalysisBlock({ feedback, showHeading = true }) {
  const cohesion = feedback?.cohesionAnalysis;
  if (!cohesion) return null;

  const dimensions = [
    { label: '段内衔接', value: cohesion.intraPara },
    { label: '段间衔接', value: cohesion.interPara },
    { label: '主题回扣', value: cohesion.thematicEcho },
  ].filter((d) => d.value);

  const rawSuggestions = cohesion.suggestions;
  const suggestions = Array.isArray(rawSuggestions) ? rawSuggestions.filter(Boolean)
    : (typeof rawSuggestions === 'string' && rawSuggestions.trim() ? [rawSuggestions.trim()] : []);
  if (!dimensions.length && !suggestions.length) return null;

  return (
    <div>
      {showHeading && <div style={{ fontSize: 13, fontWeight: 800, color: '#6b5a47', marginBottom: 8 }}>篇章衔接评析</div>}
      <div style={{ display: 'grid', gap: 10 }}>
        {dimensions.map((dim, index) => (
          <div
            key={index}
            style={{
              paddingLeft: 10,
              borderLeft: '2px solid #d4c8b8',
              paddingBottom: index !== dimensions.length - 1 ? 6 : 0,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8A6F5B', marginBottom: 4, letterSpacing: '0.01em' }}>{dim.label}</div>
            <div style={{ fontSize: 13, color: '#3D2C1F', lineHeight: 1.75 }}>{dim.value}</div>
          </div>
        ))}
        {suggestions.length > 0 && (
          <div style={{ background: '#f5f0e8', padding: '8px 12px', marginTop: 2 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8A6F5B', marginBottom: 6 }}>衔接改进建议</div>
            {suggestions.map((s, i) => (
              <div key={i} style={{ fontSize: 13, color: '#3D2C1F', lineHeight: 1.75, display: 'flex', gap: 6 }}>
                <span style={{ color: '#6b5a47', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── FeedbackLanguageReview ───────────────────────────────────────────────────

function getLanguageReviewErrors(feedback) {
  const hasErrorCatalog = Array.isArray(feedback?.errorCatalog) && feedback.errorCatalog.length > 0;
  if (hasErrorCatalog) return [];
  if (Array.isArray(feedback?.grammarIssues) && feedback.grammarIssues.length) return feedback.grammarIssues;
  return Array.isArray(feedback?.grammar) ? feedback.grammar : [];
}

function languageIssueKey(item, index) {
  return `${item.original || item.title || index}-${index}`;
}

function getLanguageTipModel(item) {
  const tips = item?.tips || {};
  return {
    hasContent: Boolean(tips.content),
    hasExample: Boolean(tips.example),
    title: tips.title || 'Tips',
    content: tips.content,
    example: tips.example,
  };
}

function LanguageIssueExplanation({ item, tipModel }) {
  if (!item.explanation) return null;

  return (
    <div style={{ fontSize: 11, color: '#8A6F5B', lineHeight: 1.6, marginBottom: tipModel.hasContent ? 2 : 0 }}>
      {item.explanation}
    </div>
  );
}

function LanguageIssueTips({ tipModel }) {
  if (!tipModel.hasContent) return null;

  return (
    <div style={{ fontSize: 11, color: '#8A6F5B', lineHeight: 1.6, marginBottom: tipModel.hasExample ? 2 : 0 }}>
      <strong style={{ color: '#6b5a47' }}>{tipModel.title}：</strong>
      {tipModel.content}
    </div>
  );
}

function LanguageIssueExample({ tipModel }) {
  if (!tipModel.hasExample) return null;

  return (
    <div style={{ fontSize: 11, color: '#8A6F5B', lineHeight: 1.6 }}>
      <strong>示例：</strong>
      {tipModel.example}
    </div>
  );
}

function LanguageErrorItem({ item, index, total }) {
  const tipModel = getLanguageTipModel(item);

  return (
    <div key={languageIssueKey(item, index)} style={{ padding: '7px 0', borderBottom: index < total - 1 ? '1px solid #e8e0d5' : 'none' }}>
      <div style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 2 }}>
        <span style={{ color: '#9a3a2a', fontWeight: 700 }}>✗ </span>
        <span style={{ color: '#9a3a2a', textDecoration: 'line-through' }}>{item.original || item.title || '语言问题'}</span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.65, marginBottom: item.explanation || tipModel.hasContent ? 2 : 0 }}>
        <span style={{ color: '#3a6a45', fontWeight: 700 }}>✓ </span>
        <span style={{ color: '#3a6a45', fontWeight: 700 }}>{item.corrected || item.example || '—'}</span>
      </div>
      <LanguageIssueExplanation item={item} tipModel={tipModel} />
      <LanguageIssueTips tipModel={tipModel} />
      <LanguageIssueExample tipModel={tipModel} />
    </div>
  );
}

function LanguageErrorsList({ errors }) {
  const visibleErrors = errors.slice(0, 6);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {visibleErrors.map((item, index) => (
        <LanguageErrorItem
          key={languageIssueKey(item, index)}
          item={item}
          index={index}
          total={visibleErrors.length}
        />
      ))}
    </div>
  );
}

export function FeedbackLanguageReview({ feedback, showHeading = true, onNavigate }) {
  // If errorCatalog already shows detailed per-error list, skip grammarIssues to avoid duplication
  const errors = getLanguageReviewErrors(feedback);
  const firstOriginal = errors.find((item) => item?.original)?.original || '';

  return (
    <div>
      {showHeading && <div style={{ fontSize: 13, fontWeight: 800, color: '#6b5a47', marginBottom: 8 }}>语言深入分析</div>}
      {errors.length > 0 ? (
        <LanguageErrorsList errors={errors} />
      ) : (
        <div style={{ fontSize: 13, color: '#6b5a47', lineHeight: 1.7 }}>
          这次没有发现需要单独拎出来纠正的明显语法问题，基础表达已经比较稳了。继续保持这种准确度，再往句式丰富和表达自然度上推进，会更出彩。
        </div>
      )}
      {errors.length > 0 ? <GrammarPracticeLink onNavigate={onNavigate} sampleSentence={firstOriginal} /> : null}
    </div>
  );
}

export function FeedbackContentReview({ feedback, showHeading = true, compact: _compact = false }) {
  const contentCards = buildTypeSpecificContentCards(feedback)
    .filter((item) => item.body || item.extra || item.footer);

  return (
    <div>
      {showHeading && <div style={{ fontSize: 13, fontWeight: 800, color: '#6b5a47', marginBottom: 8 }}>内容深入分析</div>}
      {contentCards.length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {contentCards.map((item, index) => (
            <div
              key={`${item.title || index}-${index}`}
              style={{
                paddingLeft: 10,
                borderLeft: '2px solid #d4c8b8',
                paddingBottom: index !== contentCards.length - 1 ? 8 : 0,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8A6F5B', marginBottom: 4, letterSpacing: '0.01em' }}>{item.title}</div>
              {item.body && <div style={{ fontSize: 13, color: '#3D2C1F', lineHeight: 1.75, marginBottom: item.extra || item.footer ? 4 : 0 }}>{item.body}</div>}
              {item.extra && <div style={{ fontSize: 12, color: '#8A6F5B', lineHeight: 1.7, marginBottom: item.footer ? 3 : 0 }}>{item.extra}</div>}
              {item.footer && <div style={{ fontSize: 12, color: '#8A6F5B', lineHeight: 1.7 }}>{item.footer}</div>}
            </div>
          ))}
          {Array.isArray(feedback?.contentLogic) && feedback.contentLogic.length > 0 && (
            <div style={{ borderTop: '1px dashed #d4c8b8', paddingTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8A6F5B', marginBottom: 5 }}>补充建议</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {reviewItemList(feedback.contentLogic).slice(0, 6).map((item, index) => (
                  <div key={`${item}-${index}`} style={{ fontSize: 13, lineHeight: 1.75, color: '#3D2C1F' }}>• {item}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : <div style={{ fontSize: 13, color: '#8A6F5B' }}>暂无内容深入分析</div>}
    </div>
  );
}

export function FeedbackStructureReview({ feedback, showHeading = true, compact: _compact = false }) {
  const structureAspects = buildTypeSpecificStructureAspects(feedback)
    .filter((item) => item.body || item.advice);

  return (
    <div>
      {showHeading && <div style={{ fontSize: 13, fontWeight: 800, color: '#6b5a47', marginBottom: 8 }}>结构深入分析</div>}
      {structureAspects.length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {structureAspects.map((item, index) => (
            <div
              key={`${item.title || index}-${index}`}
              style={{
                paddingLeft: 10,
                borderLeft: '2px solid #d4c8b8',
                paddingBottom: index !== structureAspects.length - 1 ? 8 : 0,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#8A6F5B', marginBottom: 4, letterSpacing: '0.01em' }}>{item.title}</div>
              {item.body && <div style={{ fontSize: 13, color: '#3D2C1F', lineHeight: 1.75, marginBottom: item.advice ? 5 : 0 }}>{item.body}</div>}
              {item.advice && <div style={{ fontSize: 12, color: '#8A6F5B', lineHeight: 1.7 }}><strong style={{ color: '#6b5a47' }}>建议：</strong>{item.advice}</div>}
            </div>
          ))}
        </div>
      ) : <div style={{ fontSize: 13, color: '#8A6F5B' }}>暂无结构深入分析</div>}
    </div>
  );
}
