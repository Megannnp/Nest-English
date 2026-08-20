import useIsMobile from '../../../hooks/useIsMobile.js';
import VocabularyList from '../shared/VocabularyList';

export const ANALYSIS_THEME = {
  page: '#ffffff',
  paper: '#ffffff',
  surface: '#f5f0e8',
  border: '#e8e0d5',
  text: '#2a1f14',
  subtext: '#8a7d6e',
  accent: '#6b5a47',
  accentSoft: '#f5f0e8',
  shadow: 'none',
};

export function AnalysisPage({ children }) {
  const isMobile = useIsMobile();
  return <div style={{ padding: isMobile ? 10 : 16, display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18 }}>{children}</div>;
}

export function AnalysisSection({ title, subtitle, children }) {
  const isMobile = useIsMobile();
  return (
    <section>
      <div style={{ marginBottom: 8 }}>
        <h3 style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 800,
          color: ANALYSIS_THEME.accent,
          borderBottom: `1.5px solid #d4c8b8`,
          paddingBottom: 4,
          lineHeight: 1.3,
        }}>{title}</h3>
        {subtitle ? (
          <p style={{ margin: '3px 0 0', fontSize: isMobile ? 11 : 12, lineHeight: 1.65, color: ANALYSIS_THEME.subtext }}>{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function AnalysisCard({ title, children, compact = false }) {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        background: ANALYSIS_THEME.surface,
        border: `1px solid ${ANALYSIS_THEME.border}`,
        borderRadius: 0,
        padding: compact ? (isMobile ? 7 : 8) : (isMobile ? 8 : 10),
      }}
    >
      {title ? <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: ANALYSIS_THEME.accent, marginBottom: 5 }}>{title}</div> : null}
      {children}
    </div>
  );
}

export function AnalysisLine({ label, value }) {
  const isMobile = useIsMobile();
  if (!value) return null;
  return (
    <div style={{ fontSize: isMobile ? 12 : 13, lineHeight: 1.7, color: ANALYSIS_THEME.text }}>
      <span style={{ color: ANALYSIS_THEME.subtext }}>{label}：</span>
      {value}
    </div>
  );
}

export function AnalysisText({ children, muted = false }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ fontSize: isMobile ? 12 : 13, lineHeight: 1.7, color: muted ? ANALYSIS_THEME.subtext : ANALYSIS_THEME.text }}>
      {children}
    </div>
  );
}

export function AnalysisSubTitle({ children }) {
  const isMobile = useIsMobile();
  return <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: ANALYSIS_THEME.text, marginBottom: 5 }}>{children}</div>;
}

export function AnalysisTextList({ items, ordered = false, emptyText = '暂无分析内容。' }) {
  const isMobile = useIsMobile();
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) {
    return <div style={{ fontSize: isMobile ? 12 : 13, lineHeight: 1.65, color: ANALYSIS_THEME.subtext }}>{emptyText}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {safeItems.map((item, index) => (
        <div key={`${item}-${index}`} style={{ fontSize: isMobile ? 12 : 13, lineHeight: 1.7, color: ANALYSIS_THEME.text }}>
          {ordered ? `${index + 1}. ` : '• '}
          {item}
        </div>
      ))}
    </div>
  );
}

export function AnalysisResourceGrid({ items = [], renderItem, minWidth = 220 }) {
  const isMobile = useIsMobile();
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(auto-fit, minmax(${minWidth}px, 1fr))`, gap: 8 }}>
      {safeItems.map(renderItem)}
    </div>
  );
}

// ─── Shared Writing Resource Bank ────────────────────────────────────────────
// Renders phraseSuggestions categories + sentencePatterns for all non-continuation types.

function SentencePatternCard({ group, isMobile }) {
  const patterns = Array.isArray(group?.patterns) ? group.patterns : [];
  if (!patterns.length) return null;
  return (
    <div>
      <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: ANALYSIS_THEME.accent, marginBottom: 4 }}>
        {group.icon ? `${group.icon} ` : ''}{group.category || '高分句型'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {patterns.slice(0, 6).map((item, index) => (
          <div key={index} style={{ padding: '5px 8px', background: ANALYSIS_THEME.surface, border: `1px solid ${ANALYSIS_THEME.border}`, borderLeft: `2px solid #8A6F5B`, borderRadius: 0 }}>
            <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: ANALYSIS_THEME.text, marginBottom: item.zh || item.usage || item.example ? 2 : 0 }}>
              {item.pattern}
            </div>
            {item.zh && <div style={{ fontSize: 11, color: ANALYSIS_THEME.subtext }}>{item.zh}</div>}
            {item.usage && <div style={{ fontSize: 11, color: ANALYSIS_THEME.subtext, fontStyle: 'italic' }}>{item.usage}</div>}
            {item.example && <div style={{ fontSize: 11, color: '#8a7d6e', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{item.example}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SharedResourceBank({ feedback }) {
  const isMobile = useIsMobile();
  const phraseCategories = Array.isArray(feedback?.phraseSuggestions?.categories) ? feedback.phraseSuggestions.categories : [];
  const sentenceGroups = Array.isArray(feedback?.sentencePatterns) ? feedback.sentencePatterns : [];

  const hasVocab = phraseCategories.length > 0;
  const hasSentences = sentenceGroups.length > 0;
  if (!hasVocab && !hasSentences) return null;

  return (
    <AnalysisSection title="写作资源库" subtitle="高级词汇短语与高分句型，可在写作中直接借用。">
      {hasVocab && (
        <div style={{ marginBottom: hasSentences ? 12 : 0 }}>
          <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: ANALYSIS_THEME.text, marginBottom: 6 }}>高级词汇短语</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {phraseCategories.map((cat, idx) => {
              const words = (cat.items || []).map(item => ({
                word: item.en || item.word || item.text || '',
                pos: item.pos || 'phrase',
                meaning: item.zh || item.cn || item.meaning || '',
                example: item.example || '',
              })).filter(item => item.word);
              if (!words.length) return null;
              return (
                <div key={idx}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: ANALYSIS_THEME.accent, marginBottom: 4 }}>
                    {cat.icon ? `${cat.icon} ` : ''}{cat.category || '词汇'}
                  </div>
                  <VocabularyList words={words} compact />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {hasSentences && (
        <div>
          <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 700, color: ANALYSIS_THEME.text, marginBottom: 6 }}>高分句型</div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {sentenceGroups.map((group, idx) => (
              <SentencePatternCard key={idx} group={group} isMobile={isMobile} />
            ))}
          </div>
        </div>
      )}
    </AnalysisSection>
  );
}

export function AnalysisMetric({ label, value, description }) {
  const isMobile = useIsMobile();
  return (
    <AnalysisCard compact>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: isMobile ? 18 : 22, lineHeight: 1, fontWeight: 900, color: ANALYSIS_THEME.accent }}>{value ?? '-'}</span>
        <span style={{ fontSize: 11, color: ANALYSIS_THEME.subtext }}>分</span>
      </div>
      <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 800, color: ANALYSIS_THEME.text, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: isMobile ? 11 : 12, lineHeight: 1.6, color: ANALYSIS_THEME.subtext }}>{description}</div>
    </AnalysisCard>
  );
}
