import { ShimmerBlock } from './FeedbackShell';

const FALLBACK_HIGHLIGHT_ITEMS = [
    '已经把题目核心情境写出来了，说明你的任务意识是在线的。',
    '文章基本成篇，人物、事件或观点已经有了可继续打磨的骨架。',
    '当前版本已经具备继续修改的基础，接下来重点是把表达和细节再推稳一点。',
  ];
const FALLBACK_SUGGESTION_ITEMS = [
    '先优先修改最明显的语法和搭配问题，让句子先做到准确、顺畅。',
    '再回头补足情节推进、细节描写或理由展开，让内容不只停留在表面。',
    '结尾尽量回扣主题或题目任务，这样整篇文章会更完整，也更有收束感。',
  ];

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function cleanItems(items) {
  return items.map((item) => String(item || '').trim()).filter(Boolean);
}

function selectSuggestionSource(feedback) {
  return [feedback?.improvements, feedback?.suggestions, feedback?.nextActions].find((items) => asList(items).length) || [];
}

function normalizeSuggestion(item) {
  if (typeof item === 'string') return item;
  const title = String(item?.title || '').trim();
  const detail = String(item?.detail || '').trim();
  const technique = String(item?.technique || '').trim();

  if (detail && technique) return `${detail} 可尝试：${technique}`;
  if (detail) return detail;
  if (title && technique) return `${title}。可尝试：${technique}`;
  return title || technique;
}

function formatVocabularyHighlight(item) {
  return item.comment ? `${item.word}：${item.comment}` : item.word;
}

function formatSentenceHighlight(item) {
  return item.comment ? `${item.original}：${item.comment}` : item.original;
}

function buildHighlightItems(feedback) {
  const highlights = feedback?.highlights || {};
  return cleanItems([
    ...asList(highlights.content),
    ...asList(highlights.vocabulary).map(formatVocabularyHighlight),
    ...asList(highlights.sentences).map(formatSentenceHighlight),
  ]);
}

function buildSuggestionItems(feedback) {
  return cleanItems(selectSuggestionSource(feedback).map(normalizeSuggestion));
}

function buildNavigationModel(feedback) {
  const highlightItems = buildHighlightItems(feedback);
  const suggestionItems = buildSuggestionItems(feedback);

  return {
    highlights: highlightItems.length ? highlightItems : FALLBACK_HIGHLIGHT_ITEMS,
    suggestions: suggestionItems.length ? suggestionItems : FALLBACK_SUGGESTION_ITEMS,
  };
}

function NavigationHeader({ isMobile }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: '#f5f0e8',
      borderBottom: '1px solid #d4c8b8',
      padding: isMobile ? '8px 20px' : '9px 26px',
      margin: isMobile ? '0 -10px 4px' : '0 -14px 4px',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#6b5a47', letterSpacing: '0.04em' }}>提升导航</span>
      <span style={{ fontSize: 11, color: '#8a7d6e' }}>先看亮点，再看最值得优先调整的地方</span>
    </div>
  );
}

function NavigationList({ items, title }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#8A6F5B', marginBottom: 5, letterSpacing: '0.02em' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.slice(0, 8).map((item, index) => (
          <div key={index} style={{ fontSize: 13, color: '#3D2C1F', lineHeight: 1.7 }}>{index + 1}. {item}</div>
        ))}
      </div>
    </div>
  );
}

export function FeedbackNavigationSection({ feedback, isMobile = false }) {
  const model = buildNavigationModel(feedback);

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <NavigationHeader isMobile={isMobile} />
      <div style={{ display: 'grid', gap: 10 }}>
        <NavigationList title="写作亮点" items={model.highlights} />
        <div style={{ paddingTop: 8 }}>
          <NavigationList title="写作建议" items={model.suggestions} />
        </div>
      </div>
    </div>
  );
}

export function FeedbackNavigationSkeleton({ isMobile = false }) {
  return (
    <div style={{ display: 'grid', gap: 8, paddingBottom: 12, borderBottom: '1px dashed #d4c8b8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShimmerBlock width={20} height={20} radius={2} />
        <div style={{ display: 'grid', gap: 5 }}>
          <ShimmerBlock width={isMobile ? 80 : 100} height={15} radius={2} />
          <ShimmerBlock width={isMobile ? 140 : 200} height={11} radius={2} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ShimmerBlock width="40%" height={12} radius={2} />
        <ShimmerBlock />
        <ShimmerBlock width="88%" />
        <ShimmerBlock width="72%" />
      </div>
    </div>
  );
}
