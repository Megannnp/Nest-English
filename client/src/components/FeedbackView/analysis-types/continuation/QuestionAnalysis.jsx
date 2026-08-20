import React, { useMemo, useState } from 'react';

import { BulletList, PALETTE, Section, SubTitle } from './ContinuationShared.jsx';
import useIsMobile from '../../../../hooks/useIsMobile.js';

const ContinuationPlanningPanel = React.lazy(() => import('./ContinuationPlanningPanel.jsx'));
const ContinuationResourceBank = React.lazy(() => import('./ContinuationResourceBank.jsx'));
const ContinuationStoryEmotionPanel = React.lazy(() => import('./ContinuationStoryEmotionPanel.jsx'));

const READING_TABS = [
  { key: 'content', label: '翻译', hint: '读懂句子 → 读懂段落 → 读懂篇章', color: PALETTE.rose },
  { key: 'structure', label: '结构', hint: '先抓段落任务，再看这句话在这一段里承担什么功能。', color: PALETTE.blue },
  { key: 'genre', label: '记叙文', hint: '顺着故事线和情感线走，别只盯单句表面意思。', color: PALETTE.green },
  { key: 'complex', label: '长难句', hint: '先抓主干，再拆连接词和补充信息。', color: PALETTE.amber },
];

function LazyBlockFallback({ label }) {
  return (
    <div
      style={{
        padding: '16px 18px',
        borderRadius: 0,
        background: '#f5f0e8',
        border: `1px solid ${PALETTE.line}`,
        color: PALETTE.subtle,
        fontSize: 13,
        lineHeight: 1.7,
      }}
    >
      {label}
    </div>
  );
}

function GuidedHeader({ title, hint, color, summary }) {
  return (
    <div
      style={{
        paddingBottom: 8,
        borderBottom: `1px solid ${PALETTE.line}`,
        display: 'grid',
        gap: 5,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 52,
            height: 22,
            padding: '0 8px',
            borderRadius: 0,
            background: `${color}18`,
            color,
            fontSize: 11,
            fontWeight: 800,
          }}
        >
          {title}
        </span>
        <span style={{ fontSize: 12, lineHeight: 1.6, color: PALETTE.subtle }}>{hint}</span>
      </div>
      {summary ? <div style={{ fontSize: 13, lineHeight: 1.7, color: PALETTE.ink }}>{summary}</div> : null}
    </div>
  );
}

function splitParagraphs(text = '') {
  return String(text || '')
    .replace(/\r/g, '')
    .split(/\n\s*\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitTextIntoSentences(text = '') {
  const normalized = String(text || '').replace(/\r/g, '').replace(/\n+/g, ' ').trim();
  if (!normalized) return [];
  const rawParts = normalized.match(/[^.!?。！？]+(?:[.!?。！？]+["'”’）)]*)?|[^.!?。！？]+$/g) || [];
  const parts = [];

  rawParts.forEach((item) => {
    const current = String(item || '').trim();
    if (!current) return;
    if (/^["'”’）)]/.test(current) && parts.length) {
      parts[parts.length - 1] = `${parts[parts.length - 1]}${current}`;
      return;
    }
    parts.push(current);
  });

  return parts.filter(Boolean);
}

function buildSentencePairs(originalText, translation) {
  const originalParagraphs = splitParagraphs(originalText);
  const translationParagraphs = splitParagraphs(translation);
  const maxParagraphs = Math.max(originalParagraphs.length, translationParagraphs.length, 1);
  const pairs = [];

  for (let paragraphIndex = 0; paragraphIndex < maxParagraphs; paragraphIndex += 1) {
    const englishSentences = splitTextIntoSentences(originalParagraphs[paragraphIndex] || '');
    const chineseSentences = splitTextIntoSentences(translationParagraphs[paragraphIndex] || '');
    const maxSentences = Math.max(englishSentences.length, chineseSentences.length);

    for (let sentenceIndex = 0; sentenceIndex < maxSentences; sentenceIndex += 1) {
      const original = englishSentences[sentenceIndex] || '';
      const translated = chineseSentences[sentenceIndex] || '';
      if (!original && !translated) continue;
      pairs.push({
        index: pairs.length,
        paragraphIndex,
        sentenceIndex,
        original,
        translation: translated,
      });
    }
  }

  return pairs;
}

function normalizeWordEntry(item = {}) {
  return {
    word: item.word || item.en || item.text || '',
    meaning: item.meaning || item.cn || item.zh || '',
    pos: item.pos || 'phrase',
    category: item.category || '',
    example: item.example || '',
  };
}

function collectResourceBank(feedback) {
  // writingExpressions: writing-specific vocab (NOT reading scene vocabulary)
  const writingExpressions = Array.isArray(feedback?.writingExpressions) ? feedback.writingExpressions : [];
  const phraseRawCategories = Array.isArray(feedback?.phraseSuggestions?.categories) ? feedback.phraseSuggestions.categories : [];
  const phraseCategories = phraseRawCategories.map((cat) => ({
    category: cat.category || '高频表达',
    words: (Array.isArray(cat.items) ? cat.items : []).map(normalizeWordEntry),
  }));
  const sentenceGroups = (Array.isArray(feedback?.sentencePatterns) ? feedback.sentencePatterns : []).map((group) => ({
    category: group.category || '高分句型',
    patterns: (Array.isArray(group.patterns) ? group.patterns : []).map((item) => ({
      pattern: item.pattern || item.text || '',
      zh: item.zh || item.meaning || '',
    })).filter((item) => item.pattern),
  }));

  return {
    vocabularyGroups: writingExpressions.map((group) => ({
      category: group.category || '写作词汇',
      words: (Array.isArray(group.words) ? group.words : Array.isArray(group.items) ? group.items : []).map((item) => normalizeWordEntry({ ...item, category: group.category || '写作词汇' })),
    })),
    phraseGroups: phraseCategories,
    sentenceGroups,
  };
}

function collectSceneGlossary(feedback) {
  const sceneVocabulary = Array.isArray(feedback?.sceneVocabulary) ? feedback.sceneVocabulary : [];
  const fallback = Array.isArray(feedback?.vocabulary) ? feedback.vocabulary : [];
  const source = sceneVocabulary.length ? sceneVocabulary : fallback;
  return source
    .flatMap((group) => {
      const items = Array.isArray(group.words) ? group.words : Array.isArray(group.items) ? group.items : [];
      return items.map((item) => normalizeWordEntry({ ...item, category: group.category || '' }));
    })
    .filter((item) => item.word && item.meaning);
}

function renderHighlightedText(text, glossary, activeTerm, onSelectTerm, options = {}) {
  const { showInactiveHighlight = true } = options;
  if (!text) return <span style={{ color: PALETTE.soft }}>暂无原文内容</span>;
  if (!glossary.length) return text;

  const matches = [];
  glossary.forEach((entry) => {
    const term = String(entry.word || '').trim();
    if (!term) return;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    let found;
    while ((found = regex.exec(text)) !== null) {
      matches.push({ start: found.index, end: found.index + found[0].length, entry });
      if (regex.lastIndex === found.index) regex.lastIndex += 1;
    }
  });

  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const filtered = [];
  let cursor = -1;
  matches.forEach((match) => {
    if (match.start >= cursor) {
      filtered.push(match);
      cursor = match.end;
    }
  });

  if (!filtered.length) return text;

  const nodes = [];
  let lastIndex = 0;
  filtered.forEach((match, index) => {
    if (match.start > lastIndex) nodes.push(text.slice(lastIndex, match.start));
    const isActive = activeTerm && activeTerm.word === match.entry.word;
    const isEmotionWord = /情绪|emotion/i.test(String(match.entry.category || ''));
    nodes.push(
      <span key={`${match.entry.word}-${match.start}-${index}`} style={{ position: 'relative', display: 'inline' }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectTerm?.(match.entry, e);
          }}
          style={{
            display: 'inline',
            padding: 0,
            border: 'none',
            background: isActive
              ? (isEmotionWord ? 'rgba(154, 90, 106, 0.18)' : 'rgba(180, 150, 60, 0.20)')
              : (showInactiveHighlight
                ? (isEmotionWord ? 'rgba(154, 90, 106, 0.12)' : 'rgba(180, 150, 60, 0.18)')
                : 'transparent'),
            color: isEmotionWord ? PALETTE.rose : PALETTE.ink,
            cursor: 'pointer',
            font: 'inherit',
            fontWeight: isActive ? 800 : 700,
            borderRadius: 2,
            textAlign: 'left',
          }}
        >
          {text.slice(match.start, match.end)}
        </button>
        {isActive && match.entry.meaning && (
          <span style={{
            position: 'absolute',
            top: 'calc(100% + 3px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 200,
            background: '#3D2C1F',
            color: '#fff',
            padding: '3px 9px',
            fontSize: 11,
            lineHeight: 1.6,
            whiteSpace: 'nowrap',
            borderRadius: 2,
            pointerEvents: 'none',
            boxShadow: 'none',
          }}>
            {match.entry.meaning}
          </span>
        )}
      </span>
    );
    lastIndex = match.end;
  });
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function InfoPanel({ title, color, children }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <SubTitle color={color}>{title}</SubTitle>
      {children}
    </div>
  );
}

function buildSentenceSyntaxExplanation(sentence = '') {
  const text = String(sentence || '').trim();
  if (!text) return '暂无句法说明。';

  if (/\bwhen\b/i.test(text)) {
    return '这句话包含 when 引导的时间状语成分，先交代发生的情境，再落到人物动作或心理反应。';
  }
  if (/\bbut\b/i.test(text)) {
    return '这句话用 but 做转折，前后两部分形成对比，适合看清“原本状态”和“后续变化”。';
  }
  if (/\bso\b/i.test(text)) {
    return '这句话有 so 引出的结果关系，前面多半是原因或处境，后面接自然产生的动作或结果。';
  }
  if (/\band\b/i.test(text)) {
    return '这句话通过 and 并列信息，把多个动作、状态或感受串起来，读的时候可以拆开看每一层内容。';
  }
  if (/,/.test(text)) {
    return '这句话内部有逗号分隔的信息块，可以按“主干内容 + 补充说明”来理解句子结构。';
  }
  return '这句话以基础主谓结构为主，先抓住“谁做了什么”，再补充情绪、原因或结果。';
}

function isComplexSentence(sentence = '') {
  const text = String(sentence || '').trim();
  if (!text) return false;
  return text.length >= 70 || /,|;|:|\bthat\b|\bif\b|\bwhether\b|\bwhen\b|\bby doing so\b|\byet\b/i.test(text);
}

function pickComplexSentence(sentencePairs = [], activeSentence = null) {
  if (activeSentence?.original && isComplexSentence(activeSentence.original)) return activeSentence;

  const scored = sentencePairs
    .filter((pair) => pair.original)
    .map((pair) => {
      const text = pair.original;
      let score = text.length;
      if (/,|;|:/.test(text)) score += 20;
      if (/\bthat\b|\bif\b|\bwhether\b|\bwhen\b|\bby doing so\b|\byet\b/i.test(text)) score += 24;
      return { pair, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.pair || activeSentence || null;
}

function buildComplexSentenceBreakdown(sentence = '') {
  const text = String(sentence || '').trim();
  if (!text) return [];

  const parts = [];

  if (/\bhowever\b/i.test(text)) {
    parts.push('句首的 however 先提醒读者，这里要看前后态度或认识的转折。');
  }
  if (/\bthat\b/i.test(text)) {
    parts.push('that 后面多半是在补充“发现了什么 / 认为了什么”这一层完整内容，可以把它看成宾语从句。');
  }
  if (/\bby doing so\b/i.test(text)) {
    parts.push('by doing so 是方式状语，先说明“通过这样做”，再看后面产生了什么影响。');
  }
  if (/:/.test(text)) {
    parts.push('冒号后面通常是在进一步解释前面的抽象说法，阅读时可以理解成“具体来说就是……”。');
  }
  if (/,/.test(text)) {
    parts.push('逗号把句子切成几个信息块，建议按“主干 + 补充 + 结果/解释”的顺序拆开读。');
  }
  if (/\bwhen\b/i.test(text)) {
    parts.push('when 引导的部分先交代时间或情境，真正的核心动作通常在主句里。');
  }
  if (/\bif\b|\bwhether\b/i.test(text)) {
    parts.push('句中有 if / whether 这类从属结构，理解时先分清“条件/选择”部分，再回到主句判断作者态度。');
  }

  parts.push('理解顺序可以先抓主干，再看连接词，最后补上插入说明或结果部分。');
  return parts;
}

function buildSentenceRoleExplanation(sentence = '') {
  const text = String(sentence || '').trim();
  const lower = text.toLowerCase();
  if (!text) return '请选择一句原文后查看它在段落中的具体作用。';

  const roles = [];

  if (/^when\b|^in\b|^at\b|^after\b|^before\b/i.test(text)) {
    roles.push('这句话先交代时间或场景，把读者带进具体情境。');
  }
  if (/\bwas invited\b|\basked\b|\bcame up to\b|\blook at\b|\blisten\b|\btry\b|\btell\b|\bexplain\b/i.test(lower)) {
    roles.push('这句话推动人物之间的互动，让故事继续往前发展。');
  }
  if (/\bfeel\b|\bfelt\b|\bnervous\b|\bembarrassed\b|\bstrange\b|\binteresting\b|\bnot very good\b/i.test(lower)) {
    roles.push('这句话在补人物感受，帮助读者看见作者当下的心理状态。');
  }
  if (/\bbut\b|\bhowever\b|\bstill\b|\byet\b/i.test(lower)) {
    roles.push('这句话带有转折意味，用来表现态度、处境或情绪的变化。');
  }
  if (/\bso\b|\bbecause\b/i.test(lower)) {
    roles.push('这句话交代了原因和结果之间的关系，让表达更完整。');
  }
  if (/\bname\b|\bmeaning\b|\bculture\b|\bidentity\b/i.test(lower)) {
    roles.push('这句话紧扣核心主题词，没有偏离材料的立意方向。');
  }

  return roles[0] || '这句话主要在补充一个具体信息点，让人物、动作或感受表达得更完整。';
}

function buildFallbackTranslation({ storyLine, emotionLine, starters, activePair }) {
  const hints = [
    activePair === 0 && storyLine?.why ? `这一句主要交代情境起点：${storyLine.why}。` : '',
    activePair > 0 && storyLine?.what ? `这一部分要继续抓住原文已发生的事件：${storyLine.what}。` : '',
    emotionLine?.initial ? `人物情绪可先理解为：${emotionLine.initial}。` : '',
    starters?.relationship ? `后续两段需要按“${starters.relationship}”的关系去承接。` : '',
  ].filter(Boolean);
  return hints.join('');
}

function getParagraphStructure(paragraphIndex, storyLine) {
  const what = storyLine?.what || '具体冲突或转折事件';
  const result = storyLine?.result || '情感或认识的变化';
  const structures = [
    { title: '背景铺垫', detail: `交代人物身份、场景和核心矛盾——为后面的故事推进做铺垫。` },
    { title: '深层背景', detail: `进一步解释核心矛盾的根源，把表面问题升华到更深层的原因。` },
    { title: '冲突高潮', detail: `具体事件登场，矛盾被推到最大：${what}，人物心理链是阅读重点。` },
    { title: '转折反思', detail: `人物从冲突走向反思——${result}，这是续写的核心起点。` },
  ];
  return structures[paragraphIndex] || structures[structures.length - 1];
}

function buildStructureMindMap(storyLine = {}, starters = {}) {
  const who = storyLine?.who ? `人物who：${storyLine.who}` : '人物：原文主人公';
  const where = storyLine?.where ? `地点where：${storyLine.where}` : null;
  const why = storyLine?.why || '核心矛盾尚未识别';
  const what = storyLine?.what || '具体事件尚未识别';
  const result = storyLine?.result || '情感或认识上的变化';
  const relationship = starters?.relationship || '顺承推进';

  return [
    {
      key: 'start',
      title: '第1段\n背景铺垫',
      summary: '没有直接讲故事，先交代人物身份和核心矛盾——记叙文常见的”背景导入”，不是事件叙事。',
      points: [
        who,
        where,
        `核心矛盾：${why}`,
      ].filter(Boolean),
    },
    {
      key: 'background',
      title: '第2段\n深层背景',
      summary: '进一步解释核心矛盾的根源，把表面问题升华到更深层的原因或价值层面。',
      points: [
        `延续核心矛盾，加深理解`,
        `把表面问题升华到更深的根源`,
        `为后续冲突做逻辑铺垫`,
      ],
    },
    {
      key: 'conflict',
      title: '第3段\n冲突发生',
      summary: '具体事件正式登场，矛盾被推到最大——人物心理链是阅读重点。',
      points: [
        `核心事件：${what}`,
        `情感链：延续前文心理 → 面对冲突 → 内心挣扎 → 人物选择`,
        `深层：不只是表面事件，要看清人物的心理动机`,
      ],
    },
    {
      key: 'reflection',
      title: '第4段\n转折反思',
      summary: '人物从冲突走向内心反思——这是续写的核心起点。',
      points: [
        `续写方向：${result}`,
        `两段关系：${relationship}`,
        `第一段首句是续写的出发点，要仔细理解它给出的条件和限制`,
      ],
    },
  ];
}

function getActiveStoryKeys(paragraphIndex) {
  if (paragraphIndex <= 0) return ['why'];
  if (paragraphIndex === 1) return ['what'];
  if (paragraphIndex === 2) return ['what'];
  return ['result'];
}

function buildTranslationTerms(activeTerm = null) {
  if (!activeTerm) return [];

  const baseTerms = String(activeTerm?.meaning || '')
    .split(/[，,、/；;（()）\s]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

  return baseTerms
    .map((item) => item.trim())
    .filter((item) => item.length >= 2)
    .sort((a, b) => b.length - a.length)
    .filter((item, index, arr) => arr.indexOf(item) === index);
}

function renderTranslationParagraphs(text = '', activeTerm = null) {
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) return <span style={{ color: PALETTE.soft }}>暂无全文翻译。</span>;

  const meanings = buildTranslationTerms(activeTerm);

  const renderHighlightedParagraph = (paragraph) => {
    if (!meanings.length) return paragraph;
    const escapedMeanings = meanings.map((item) => item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`(${escapedMeanings.join('|')})`, 'g');
    if (!regex.test(paragraph)) return paragraph;

    const parts = paragraph.split(regex);
    return parts.map((part, index) => {
      if (!meanings.includes(part)) return <React.Fragment key={`translation-text-${index}`}>{part}</React.Fragment>;
      return (
        <span
          key={`translation-highlight-${part}-${index}`}
          style={{
            background: 'rgba(154, 90, 106, 0.16)',
            color: PALETTE.rose,
            fontWeight: 800,
            borderRadius: 2,
            padding: '0 2px',
            boxDecorationBreak: 'clone',
            WebkitBoxDecorationBreak: 'clone',
          }}
        >
          {part}
        </span>
      );
    });
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {paragraphs.map((paragraph, index) => (
        <p key={`translation-${index}`} style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: PALETTE.ink }}>
          {renderHighlightedParagraph(paragraph)}
        </p>
      ))}
    </div>
  );
}

function BookmarkTabs({ activeTab, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #d4c8b8', marginBottom: 10 }}>
      {READING_TABS.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            style={{
              padding: '7px 14px',
              border: 'none',
              borderBottom: active ? '2px solid #8A6F5B' : '2px solid transparent',
              background: 'transparent',
              color: active ? '#3D2C1F' : '#8A6F5B',
              fontSize: 12,
              fontWeight: active ? 800 : 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function findPairIndexByParagraph(sentencePairs, paragraphIndex) {
  const pair = sentencePairs.find((item) => item.paragraphIndex === paragraphIndex && item.original);
  return pair ? pair.index : 0;
}

function findPairIndexByStoryNode(sentencePairs, key) {
  const mapping = {
    why: 0,
    what: 1,
    result: 3,
    who: 2,
    when: 2,
    where: 2,
  };
  return findPairIndexByParagraph(sentencePairs, mapping[key] ?? 0);
}

function findParagraphsByStoryNode(key) {
  const mapping = {
    why: [0, 1],
    what: [1, 2],
    result: [2, 3],
    who: [2],
    when: [2],
    where: [2],
  };
  return mapping[key] || [0];
}

function findPairIndexByEmotionNode(sentencePairs, key, index) {
  if (key === 'initial') return findPairIndexByParagraph(sentencePairs, 0);
  if (key === 'tone') return findPairIndexByParagraph(sentencePairs, 3);
  const paragraphMap = [0, 1, 2, 3];
  return findPairIndexByParagraph(sentencePairs, paragraphMap[Math.min(index, paragraphMap.length - 1)] ?? 0);
}

function findParagraphsByEmotionNode(key, index) {
  if (key === 'initial') return [0];
  if (key === 'tone') return [3];
  const mapping = {
    1: [0, 1],
    2: [1, 2],
    3: [2, 3],
    4: [3],
  };
  return mapping[index] || [0];
}

function buildGlossary(sceneGlossary, resourceBank) {
  return sceneGlossary || resourceBank.vocabularyGroups.flatMap((group) => (group.words || [])).filter((item) => item.word && item.meaning);
}

function groupSentencePairs(sentencePairs) {
  const groups = [];
  sentencePairs.forEach((pair) => {
    if (!groups[pair.paragraphIndex]) groups[pair.paragraphIndex] = [];
    groups[pair.paragraphIndex].push(pair);
  });
  return groups.filter(Boolean);
}

function activeParagraphIndex(activeSentence) {
  return activeSentence?.paragraphIndex || 0;
}

function buildActiveEmotionKeys(activeSentence, emotionLine) {
  const paragraphIndex = activeParagraphIndex(activeSentence);
  const changes = Array.isArray(emotionLine?.changes) ? emotionLine.changes : [];
  if (paragraphIndex <= 0) return ['initial', changes[0] ? 1 : null].filter(Boolean);
  if (paragraphIndex === 1) return [changes[0] ? 1 : null, changes[1] ? 2 : null].filter(Boolean);
  if (paragraphIndex === 2) return [changes[1] ? 2 : null, changes[2] ? 3 : null].filter(Boolean);
  return [changes[2] ? 3 : null, changes[3] ? 4 : null, 'tone'].filter(Boolean);
}

function storyFocusForParagraph(paragraphIndex, storyLine) {
  if (paragraphIndex <= 0) return storyLine?.why || storyLine?.what || '顺着原文主线推进';
  if (paragraphIndex <= 2) return storyLine?.what || storyLine?.why || '顺着原文主线推进';
  return storyLine?.result || storyLine?.what || '顺着原文主线推进';
}

function emotionFocusForParagraph(paragraphIndex, emotionLine) {
  const changes = Array.isArray(emotionLine?.changes) ? emotionLine.changes : [];
  if (paragraphIndex <= 0) return emotionLine?.initial || changes[0] || '看清人物情绪怎么变';
  return changes[Math.min(paragraphIndex - 1, changes.length - 1)] || emotionLine?.tone || '看清人物情绪怎么变';
}

function buildGuidedSummary({ activeSentence, activeTab, activeTerm, complexSentence, emotionLine, storyLine }) {
  if (activeTab === 'content') {
    const role = buildSentenceRoleExplanation(activeSentence?.original);
    return activeTerm?.word
      ? `当前点击词：「${activeTerm.word}」。左侧点击高亮词可查看中文释义。当前这句在段落里的作用：${role}`
      : `点击左侧高亮词查看中文释义。当前这句在段落里的作用：${role}`;
  }
  if (activeTab === 'structure') {
    const paragraphStructure = getParagraphStructure(activeParagraphIndex(activeSentence), storyLine);
    return `先看这一段的任务，再看当前句子在帮哪一步服务。当前更该守住的是“${paragraphStructure.title}”，也就是：${paragraphStructure.detail}`;
  }
  if (activeTab === 'genre') {
    const paragraphIndex = activeParagraphIndex(activeSentence);
    const storyFocus = storyFocusForParagraph(paragraphIndex, storyLine);
    const emotionFocus = emotionFocusForParagraph(paragraphIndex, emotionLine);
    return `这一栏不是拆句子，而是带着“故事往哪里走、情绪怎么变”去读。当前故事主线可先抓：${storyFocus}；情感阅读重点是：${emotionFocus}`;
  }
  const syntax = buildSentenceSyntaxExplanation(complexSentence?.original);
  return `长难句先别急着逐词硬译，先抓主干，再看连接词把哪几层信息挂在一起。当前这一句最值得先抓住的是：${syntax}`;
}

function SentenceText({ activeTerm, focusedParagraphs, glossary, onTermSelect, pair }) {
  const isParagraphFocused = focusedParagraphs.includes(pair.paragraphIndex);
  return (
    <React.Fragment>
      <span
        style={{
          display: 'inline',
          padding: '1px 2px',
          margin: 0,
          borderRadius: 0,
          background: isParagraphFocused ? 'rgba(57, 109, 221, 0.05)' : 'transparent',
          color: PALETTE.ink,
          lineHeight: 'inherit',
          boxDecorationBreak: 'clone',
          WebkitBoxDecorationBreak: 'clone',
          verticalAlign: 'baseline',
        }}
      >
        {renderHighlightedText(pair.original, glossary, activeTerm, (entry) => onTermSelect(entry, pair), { showInactiveHighlight: false })}
      </span>{' '}
    </React.Fragment>
  );
}

function OriginalParagraph({ activeTerm, focusedParagraphs, glossary, onTermSelect, paragraph, paragraphIndex }) {
  const visibleParagraph = paragraph.filter((pair) => pair.original);
  if (!visibleParagraph.length) return null;

  return (
    <p key={`paragraph-${paragraphIndex}`} style={{ margin: 0 }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 24,
          height: 24,
          marginRight: 10,
          borderRadius: 0,
          background: '#f5f0e8',
          color: PALETTE.blue,
          fontSize: 12,
          fontWeight: 800,
          verticalAlign: 'text-top',
        }}
      >
        {paragraphIndex + 1}
      </span>
      {visibleParagraph.map((pair) => (
        <SentenceText
          key={`sentence-${pair.index}`}
          pair={pair}
          glossary={glossary}
          activeTerm={activeTerm}
          focusedParagraphs={focusedParagraphs}
          onTermSelect={onTermSelect}
        />
      ))}
    </p>
  );
}

function OriginalMaterial({ activeTerm, focusedParagraphs, glossary, groupedParagraphs, onTermSelect }) {
  if (!groupedParagraphs.length) return <span style={{ color: PALETTE.soft }}>暂无原文内容</span>;

  return groupedParagraphs.map((paragraph, paragraphIndex) => (
    <OriginalParagraph
      key={`paragraph-${paragraphIndex}`}
      paragraph={paragraph}
      paragraphIndex={paragraphIndex}
      glossary={glossary}
      activeTerm={activeTerm}
      focusedParagraphs={focusedParagraphs}
      onTermSelect={onTermSelect}
    />
  ));
}

function readingGridColumns(isMobile) {
  return isMobile ? '1fr' : 'minmax(0, 1.4fr) minmax(320px, 0.92fr)';
}

function CompactBilingualReading({ originalText, translation, resourceBank, _plotAnalysis, storyLine, starters, emotionLine, sceneGlossary }) {
  const isMobile = useIsMobile();
  const sentencePairs = useMemo(() => buildSentencePairs(originalText, translation), [originalText, translation]);
  // Use sceneGlossary (reading vocab) for text highlighting, not writing resource bank vocab
  const glossary = useMemo(
    () => buildGlossary(sceneGlossary, resourceBank),
    [sceneGlossary, resourceBank]
  );
  const [activePair, setActivePair] = useState(0);
  const [activeTerm, setActiveTerm] = useState(null);
  const [focusedParagraphs, setFocusedParagraphs] = useState([0]);
  const activeSentence = sentencePairs[activePair] || null;
  const groupedParagraphs = useMemo(() => groupSentencePairs(sentencePairs), [sentencePairs]);
  const [activeTab, setActiveTab] = useState('content');
  const activeTabMeta = useMemo(
    () => READING_TABS.find((tab) => tab.key === activeTab) || READING_TABS[0],
    [activeTab]
  );
  const structureMindMap = useMemo(
    () => buildStructureMindMap(storyLine, starters),
    [storyLine, starters]
  );
  const complexSentence = useMemo(
    () => pickComplexSentence(sentencePairs, activeSentence),
    [sentencePairs, activeSentence]
  );
  const complexSentenceBreakdown = useMemo(
    () => buildComplexSentenceBreakdown(complexSentence?.original),
    [complexSentence]
  );
  const activeStoryKeys = useMemo(
    () => getActiveStoryKeys(activeSentence?.paragraphIndex || 0),
    [activeSentence]
  );
  const activeEmotionKeys = useMemo(() => buildActiveEmotionKeys(activeSentence, emotionLine), [activeSentence, emotionLine]);
  const guidedSummary = useMemo(
    () => buildGuidedSummary({ activeSentence, activeTab, activeTerm, complexSentence, emotionLine, storyLine }),
    [activeSentence, activeTab, activeTerm, complexSentence, emotionLine, storyLine]
  );
  const handleSelectStoryNode = (item) => {
    setActivePair(findPairIndexByStoryNode(sentencePairs, item.key));
    setActiveTab('genre');
    setActiveTerm(null);
    setFocusedParagraphs(findParagraphsByStoryNode(item.key));
  };
  const handleSelectEmotionNode = (item, index) => {
    setActivePair(findPairIndexByEmotionNode(sentencePairs, item.key, index));
    setActiveTab('genre');
    setActiveTerm(null);
    setFocusedParagraphs(findParagraphsByEmotionNode(item.key, index));
  };
  const handleTermSelect = (entry, pair) => {
    setActivePair(pair.index);
    setActiveTerm(entry);
    setActiveTab('content');
    setFocusedParagraphs([pair.paragraphIndex]);
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: readingGridColumns(isMobile), gap: 12, alignItems: 'stretch' }}>
        <InfoPanel title="原文材料" color={PALETTE.blue}>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.8,
              color: PALETTE.ink,
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}
          >
            <OriginalMaterial
              groupedParagraphs={groupedParagraphs}
              glossary={glossary}
              activeTerm={activeTerm}
              focusedParagraphs={focusedParagraphs}
              onTermSelect={handleTermSelect}
            />
          </div>
        </InfoPanel>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
            height: '100%',
            justifyContent: 'flex-start',
            alignSelf: 'stretch',
            position: 'relative',
          }}
        >
          <BookmarkTabs activeTab={activeTab} onChange={setActiveTab} />

          <div
            style={{
              padding: isMobile ? '10px 12px' : '14px 16px',
              display: 'grid',
              alignContent: 'start',
              gap: 10,
              flex: 1,
              minHeight: 0,
              boxSizing: 'border-box',
              position: 'relative',
              zIndex: 3,
              overflow: 'visible',
            }}
          >
              <GuidedHeader
                title={activeTabMeta.label}
                hint={activeTabMeta.hint}
                color={activeTabMeta.color}
                summary={activeTab !== 'content' ? guidedSummary : null}
              />

              {activeTab === 'content' ? (
                <div style={{ display: 'grid', gap: 16 }}>
                  {renderTranslationParagraphs(translation || buildFallbackTranslation({ storyLine, emotionLine, starters, activePair }), activeTerm)}
                </div>
              ) : null}

              {activeTab === 'structure' ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: PALETTE.blue, marginBottom: 4 }}>拆结构先看什么</div>
                      <div style={{ fontSize: 12, lineHeight: 1.65, color: PALETTE.ink }}>
                        先判断这一段在全文里是”铺背景、推冲突、做转折还是收主题”，再看当前句子是在开门、补细节，还是把下一步续写送出去。
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: PALETTE.blue, marginBottom: 4 }}>当前段最重要的任务</div>
                      <div style={{ fontSize: 12, lineHeight: 1.65, color: PALETTE.ink }}>
                        {getParagraphStructure(activeSentence?.paragraphIndex || 0, storyLine).detail}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {structureMindMap.map((node, index) => (
                      <div key={node.key} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '80px minmax(0, 1fr)', gap: 8, alignItems: 'start' }}>
                        <div
                          style={{
                            borderRadius: 0,
                            background: index % 2 === 0 ? '#f5f0e8' : '#ffffff',
                            color: PALETTE.blue,
                            padding: '8px 8px',
                            fontSize: 11,
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            lineHeight: 1.4,
                            whiteSpace: 'pre-line',
                          }}
                        >
                          {node.title}
                        </div>
                        <div style={{ display: 'grid', gap: 5, paddingTop: 1 }}>
                          <div style={{ fontSize: 12, lineHeight: 1.65, color: PALETTE.ink }}>{node.summary}</div>
                          <div style={{ display: 'grid', gap: 3 }}>
                            {node.points.map((point, pointIndex) => (
                              <div key={`${node.key}-${pointIndex}`} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                                <span style={{ color: PALETTE.blue, fontSize: 11, fontWeight: 800, minWidth: 12 }}>•</span>
                                <div style={{ fontSize: 11, lineHeight: 1.6, color: PALETTE.subtle }}>{point}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeTab === 'complex' ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.amber, marginBottom: 6 }}>读长难句顺序</div>
                      <div style={{ fontSize: 13, lineHeight: 1.8, color: PALETTE.ink }}>
                        先抓”谁做了什么”的主干，再看连接词提示的时间、转折、原因或结果，最后补上逗号后的解释性信息。
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.amber, marginBottom: 6 }}>这一句为什么值得看</div>
                      <div style={{ fontSize: 13, lineHeight: 1.8, color: PALETTE.ink }}>
                        {buildSentenceRoleExplanation(complexSentence?.original)}
                      </div>
                    </div>
                  </div>
                  <div style={{ paddingBottom: 14, borderBottom: `1px solid ${PALETTE.line}` }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.amber, marginBottom: 8 }}>长难句原句</div>
                    <div style={{ fontSize: 13, lineHeight: 1.8, color: PALETTE.ink, fontFamily: 'Georgia, serif' }}>
                      {complexSentence?.original || '暂无可解析的长难句。'}
                    </div>
                  </div>
                  <div style={{ paddingBottom: 14, borderBottom: `1px solid ${PALETTE.line}` }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.amber, marginBottom: 8 }}>语法解析</div>
                    <div style={{ fontSize: 13, lineHeight: 1.8, color: PALETTE.ink }}>
                      {buildSentenceSyntaxExplanation(complexSentence?.original)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.amber, marginBottom: 8 }}>拆解理解</div>
                    <BulletList items={complexSentenceBreakdown} color={PALETTE.amber} />
                  </div>
                </div>
              ) : null}

              {activeTab === 'genre' ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.green, marginBottom: 6 }}>看主线时别漏掉</div>
                      <div style={{ fontSize: 13, lineHeight: 1.8, color: PALETTE.ink }}>
                        记叙文前几段常是背景铺垫而非直接叙事，先找到标志词（如 Once / Suddenly / That day）定位故事起点。读完情节还要往深处挖：表面事件→内在矛盾→人物情感变化，才不会只停在表面。
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: PALETTE.green, marginBottom: 6 }}>当前阅读提醒</div>
                      <div style={{ fontSize: 13, lineHeight: 1.8, color: PALETTE.ink }}>
                        {guidedSummary}
                      </div>
                    </div>
                  </div>
                  <React.Suspense fallback={<LazyBlockFallback label="正在加载故事线与情感线..." />}>
                    <ContinuationStoryEmotionPanel
                      storyLine={storyLine}
                      emotionLine={emotionLine}
                      activeStoryKeys={activeStoryKeys}
                      activeEmotionKeys={activeEmotionKeys}
                      onSelectStoryNode={handleSelectStoryNode}
                      onSelectEmotionNode={handleSelectEmotionNode}
                    />
                  </React.Suspense>
                </div>
              ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuestionAnalysis({ feedback, originalText }) {
  const isMobile = useIsMobile();
  const {
    storyLine,
    emotionLine,
    plotAnalysis,
    starters,
    contentAnalysis,
    sceneVocabulary,
    sentencePatterns,
    phraseSuggestions,
    vocabulary,
    writingExpressions,
  } = feedback || {};

  const mergedFeedback = useMemo(() => ({
    ...(feedback || {}),
    sceneVocabulary: sceneVocabulary || vocabulary || [],
    writingExpressions: writingExpressions || [],
    sentencePatterns: sentencePatterns || [],
    phraseSuggestions: phraseSuggestions || { categories: [] },
  }), [feedback, phraseSuggestions, sceneVocabulary, sentencePatterns, vocabulary, writingExpressions]);

  const resourceBank = useMemo(() => collectResourceBank(mergedFeedback), [mergedFeedback]);

  // Scene glossary used for text highlighting in the original text (reading vocab)
  const sceneGlossary = useMemo(() => collectSceneGlossary(mergedFeedback), [mergedFeedback]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 10 : 14, maxWidth: 1320, margin: '0 auto' }}>
      <Section
        title="原文分析"
        subtitle="先重新理解材料，再去判断学生续写有没有真正承接人物、情节与情感。"
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <CompactBilingualReading
            originalText={plotAnalysis?.originalText || originalText}
            translation={plotAnalysis?.translation}
            resourceBank={resourceBank}
            sceneGlossary={sceneGlossary}
            plotAnalysis={plotAnalysis}
            storyLine={storyLine}
            starters={starters}
            emotionLine={emotionLine}
          />
        </div>
      </Section>

      <Section
        title="续写分析"
        subtitle="把段首句和续写任务拆清楚，后面写作时就不会容易乱。"
      >
        <React.Suspense fallback={<LazyBlockFallback label="正在加载续写规划模块..." />}>
          <ContinuationPlanningPanel
            starters={starters}
            storyLine={storyLine}
            contentAnalysis={contentAnalysis}
          />
        </React.Suspense>
      </Section>

      <Section
        title="写作资源库"
        subtitle="把和当前材料最相关的词汇、短语和句型集中放在这里。"
      >
        <React.Suspense fallback={<LazyBlockFallback label="正在加载写作资源库..." />}>
          <ContinuationResourceBank resourceBank={resourceBank} />
        </React.Suspense>
      </Section>
    </div>
  );
}
