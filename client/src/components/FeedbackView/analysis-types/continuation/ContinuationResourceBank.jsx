import { PALETTE } from './ContinuationShared.jsx';

const POS_COLORS = {
  'n.':     '#5a7490',
  'v.':     '#9a3a2a',
  'adj.':   '#3a6a45',
  'adv.':   '#8A6F5B',
  'phrase': '#6b5a47',
  'prep.':  '#7a5a70',
  'conj.':  '#4a6a78',
  'default':'#8a7d6e',
};

/* ─── 词汇 / 短语：单行中英对照 ─── */
function WordRow({ item }) {
  const posColor = POS_COLORS[item.pos] || POS_COLORS.default;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '5px 0',
      borderBottom: `1px solid ${PALETTE.line}`,
      fontSize: 13,
    }}>
      <span style={{
        width: 36, flexShrink: 0,
        fontSize: 9, fontWeight: 700,
        padding: '1px 4px',
        background: `${posColor}18`,
        color: posColor,
        fontFamily: 'monospace',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}>
        {item.pos || 'ph.'}
      </span>
      <span style={{ fontWeight: 700, color: PALETTE.ink, flexShrink: 0 }}>
        {item.word || '—'}
      </span>
      <span style={{ color: PALETTE.subtle, fontSize: 12, whiteSpace: 'nowrap', marginLeft: 8 }}>
        {item.meaning}
      </span>
    </div>
  );
}

/* ─── 句型：英文 + 中文注释（无序号无缩进） ─── */
function PatternRow({ item, isLast = false }) {
  return (
    <div style={{
      padding: '8px 0',
      borderBottom: isLast ? 'none' : `1px solid ${PALETTE.line}`,
    }}>
      <div style={{ fontSize: 13, lineHeight: 1.65, color: PALETTE.ink, fontWeight: 700 }}>
        {item.pattern}
      </div>
      {item.zh && (
        <div style={{ fontSize: 12, lineHeight: 1.55, color: PALETTE.subtle, marginTop: 3 }}>
          {item.zh}
        </div>
      )}
    </div>
  );
}

/* ─── 分类标题 ─── */
function BankSection({ title, children }) {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#6b5a47',
        paddingBottom: 5,
        borderBottom: '1px solid #d4c8b8',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/* ─── 词汇/短语组 ─── */
function WordGroupSection({ group, accentColor: _accentColor }) {
  const words = (group.words || []).slice(0, 10);
  if (!words.length) return null;
  return (
    <div style={{ display: 'grid', gap: 0 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: PALETTE.soft,
        marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        {group.category}
      </div>
      {words.map((item, i) => (
        <WordRow key={`${item.word}-${i}`} item={item} />
      ))}
    </div>
  );
}

export default function ContinuationResourceBank({ resourceBank }) {
  const { vocabularyGroups, phraseGroups, sentenceGroups } = resourceBank;

  const hasVocab   = vocabularyGroups.length > 0;
  const hasPhrase  = phraseGroups.length > 0;
  const hasSentence= sentenceGroups.length > 0;
  const emptyTextStyle = { fontSize: 13, color: PALETTE.soft, lineHeight: 1.7 };

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* ── 写作词汇库 ── */}
      <BankSection title="写作词汇库">
        {hasVocab ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {vocabularyGroups.slice(0, 3).map((group, i) => (
              <WordGroupSection key={`vocab-${i}`} group={group} accentColor={PALETTE.gold} />
            ))}
          </div>
        ) : <div style={emptyTextStyle}>暂无专属词汇素材。</div>}
      </BankSection>

      <div style={{ height: 1, background: PALETTE.line }} />

      {/* ── 写作短语库 ── */}
      <BankSection title="写作短语库">
        {hasPhrase ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {phraseGroups.slice(0, 3).map((group, i) => (
              <WordGroupSection key={`phrase-${i}`} group={group} accentColor={PALETTE.amber} />
            ))}
          </div>
        ) : <div style={emptyTextStyle}>暂无专属短语素材。</div>}
      </BankSection>

      <div style={{ height: 1, background: PALETTE.line }} />

      {/* ── 写作句型库 ── */}
      <BankSection title="写作句型库">
        {hasSentence ? (
          <div style={{ display: 'grid', gap: 14 }}>
            {sentenceGroups.slice(0, 4).map((group, i) => (
              <div key={`sent-${i}`} style={{ display: 'grid', gap: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, color: PALETTE.soft,
                  marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {group.category}
                </div>
                {(group.patterns || []).slice(0, 5).map((item, j, arr) => (
                  <PatternRow key={`${group.category}-${j}`} item={item} isLast={j === arr.length - 1} />
                ))}
              </div>
            ))}
          </div>
        ) : <div style={emptyTextStyle}>暂无专属句型素材。</div>}
      </BankSection>

    </div>
  );
}
