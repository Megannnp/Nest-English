import { useState } from 'react';

const TYPE_COLORS = {
  细节题:     { bg: '#e8f4f1', text: '#1a7a6e', border: 'rgba(26,122,110,0.2)' },
  推断题:     { bg: '#eef0fb', text: '#3a4ac4', border: 'rgba(58,74,196,0.2)' },
  主旨题:     { bg: '#fdf3e8', text: '#b86a1a', border: 'rgba(184,106,26,0.2)' },
  词义题:     { bg: '#f3eeff', text: '#7a3ac4', border: 'rgba(122,58,196,0.2)' },
  态度题:     { bg: '#ffeef4', text: '#b83a6e', border: 'rgba(184,58,110,0.2)' },
  结构题:     { bg: '#edf7ff', text: '#226a9a', border: 'rgba(34,106,154,0.2)' },
  句子功能题: { bg: '#e8f0ff', text: '#2a5aab', border: 'rgba(42,90,171,0.2)' },
};

const TRAP_LABELS = {
  无中生有:   { bg: '#fff0f0', text: '#c04040' },
  过度推断:   { bg: '#fff8e8', text: '#a07020' },
  反向干扰:   { bg: '#f0e8ff', text: '#7040c0' },
  张冠李戴:   { bg: '#e8f4ff', text: '#2060a0' },
  偷换概念:   { bg: '#f0ffe8', text: '#407020' },
};

const STRATEGY_LABELS = {
  同义替换: '🔄 同义替换',
  直接对应: '✓ 直接对应',
  逻辑推断: '💡 逻辑推断',
  全文综合: '📖 全文综合',
};

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS['细节题'];
  return (
    <span style={{
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 700,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      letterSpacing: 0.5,
      flexShrink: 0,
    }}>
      {type}
    </span>
  );
}

function TrapBadge({ trap }) {
  if (!trap) return null;
  const c = TRAP_LABELS[trap] || { bg: '#f5f5f5', text: '#666' };
  return (
    <span style={{
      padding: '1px 7px',
      borderRadius: 8,
      fontSize: 10,
      fontWeight: 700,
      background: c.bg,
      color: c.text,
    }}>
      {trap}
    </span>
  );
}

function getOptionTone(showResult, isCorrect) {
  if (!showResult) {
    return {
      bg: '#fafafa',
      border: '1px solid #e8e8e8',
      textColor: '#333',
      resultColor: '#555',
      noteColor: '#9a5050',
    };
  }

  if (!isCorrect) {
    return {
      bg: '#fff8f8',
      border: '1px solid #f0d0d0',
      textColor: '#7a4040',
      resultColor: '#c04040',
      noteColor: '#9a5050',
    };
  }

  return {
    bg: '#edfaf5',
    border: '1.5px solid #1a7a6e',
    textColor: '#0f2e2a',
    resultColor: '#1a7a6e',
    noteColor: '#2d8a72',
  };
}

function getOptionMarker(showResult, isCorrect, letter) {
  if (!showResult) return `${letter}.`;
  return isCorrect ? '✓' : '✗';
}

function OptionRow({ opt, revealed }) {
  const isCorrect = opt.correct;
  const showResult = revealed;
  const tone = getOptionTone(showResult, isCorrect);

  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 10,
      background: tone.bg,
      border: tone.border,
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          fontWeight: 800,
          fontSize: 13,
          color: tone.resultColor,
          flexShrink: 0,
          marginTop: 1,
        }}>
          {getOptionMarker(showResult, isCorrect, opt.letter)}
        </span>
        {showResult && (
          <span style={{ fontWeight: 700, color: tone.resultColor, fontSize: 12, flexShrink: 0 }}>
            {opt.letter}.
          </span>
        )}
        <span style={{ fontSize: 13, color: tone.textColor, lineHeight: 1.6 }}>{opt.text}</span>
        {showResult && !isCorrect && opt.trap && (
          <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
            <TrapBadge trap={opt.trap} />
          </div>
        )}
      </div>
      {showResult && opt.note && (
        <div style={{ fontSize: 11, color: tone.noteColor, paddingLeft: 20, lineHeight: 1.6 }}>
          {opt.note}
        </div>
      )}
    </div>
  );
}

function LocationBlock({ location }) {
  if (!location) return null;
  const strategy = STRATEGY_LABELS[location.strategy] || location.strategy;
  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 12,
      background: 'rgba(26,122,110,0.05)',
      border: '1px solid rgba(26,122,110,0.15)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1a7a6e', letterSpacing: 1 }}>答案定位</span>
        <span style={{ fontSize: 11, color: '#4a7a74', background: 'rgba(26,122,110,0.1)', padding: '1px 8px', borderRadius: 6 }}>
          {location.paragraph}
        </span>
        <span style={{ fontSize: 11, color: '#1a7a6e', fontWeight: 600 }}>{strategy}</span>
      </div>
      {location.quote && (
        <blockquote style={{
          margin: 0,
          padding: '6px 10px',
          borderLeft: '3px solid #1a7a6e',
          background: '#fff',
          borderRadius: '0 8px 8px 0',
          fontSize: 12,
          color: '#0f2e2a',
          fontStyle: 'italic',
          lineHeight: 1.7,
        }}>
          "{location.quote}"
        </blockquote>
      )}
    </div>
  );
}

function LogicBlock({ logic }) {
  if (!logic) return null;
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 12,
      background: '#fffbf0',
      border: '1px solid rgba(180,140,40,0.2)',
      fontSize: 12,
      color: '#5a4010',
      lineHeight: 1.75,
    }}>
      <span style={{ fontWeight: 700, color: '#8a6020', marginRight: 6 }}>解题逻辑</span>
      {logic}
    </div>
  );
}

function QuestionCard({ q, forceReveal = false }) {
  const [revealed, setRevealed] = useState(false);
  const isRevealed = revealed || forceReveal;

  return (
    <div style={{
      border: '1px solid rgba(26,122,110,0.12)',
      borderRadius: 18,
      background: '#fff',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(26,122,110,0.06)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(26,122,110,0.08)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}>
        <span style={{
          width: 26, height: 26, borderRadius: '50%',
          background: '#1a7a6e', color: '#fff',
          fontSize: 12, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {q.index}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: '#0f2e2a', lineHeight: 1.6, fontWeight: 500 }}>{q.stem}</div>
        </div>
        <TypeBadge type={q.type} />
      </div>

      {/* Options */}
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(q.options || []).map((opt) => (
          <OptionRow key={opt.letter} opt={opt} revealed={isRevealed} />
        ))}
      </div>

      {/* Reveal / Result */}
      <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {!isRevealed ? (
          <button type="button"
            onClick={() => setRevealed(true)}
            style={{
              padding: '8px 0',
              borderRadius: 10,
              border: '1.5px solid rgba(26,122,110,0.25)',
              background: 'rgba(26,122,110,0.05)',
              color: '#1a7a6e',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            查看答案与解析
          </button>
        ) : (
          <>
            <LocationBlock location={q.location} />
            <LogicBlock logic={q.logic} />
          </>
        )}
      </div>
    </div>
  );
}

export default function ReadingQuestionCards({ questions = [] }) {
  const [allRevealed, setAllRevealed] = useState(false);

  if (!questions.length) return null;

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a7a6e', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Questions
          </span>
          <span style={{ fontSize: 11, color: '#4a7a74' }}>· 题目全方位解析</span>
        </div>
        <button type="button"
          onClick={() => setAllRevealed((v) => !v)}
          style={{
            fontSize: 11, fontWeight: 700, color: '#1a7a6e',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          {allRevealed ? '收起所有答案' : '展开所有答案'}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {questions.map((q) => (
          <QuestionCard key={q.index} q={q} forceReveal={allRevealed} />
        ))}
      </div>
    </section>
  );
}
