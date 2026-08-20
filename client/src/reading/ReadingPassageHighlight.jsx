import { useState, useMemo } from 'react';

function buildHighlightMap(questions) {
  // quote → [{ index, answer, type }]
  const map = new Map();
  for (const q of questions) {
    const quote = q.location?.quote?.trim();
    if (!quote) continue;
    if (!map.has(quote)) map.set(quote, []);
    map.get(quote).push({ index: q.index, answer: q.answer, type: q.type });
  }
  return map;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSegments(text, highlights) {
  if (!highlights.size) return [{ text, qs: [] }];

  // Build one regex that matches any quote, longest first to avoid partial matches
  const patterns = [...highlights.keys()]
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);

  if (!patterns.length) return [{ text, qs: [] }];

  const regex = new RegExp(`(${patterns.join('|')})`, 'g');
  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), qs: [] });
    }
    segments.push({ text: match[0], qs: highlights.get(match[0]) || [] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), qs: [] });
  }

  return segments;
}

function HighlightTag({ qs }) {
  if (!qs.length) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 3, verticalAlign: 'middle', marginLeft: 3 }}>
      {qs.map((q) => (
        <span key={q.index} style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 17,
          height: 17,
          borderRadius: '50%',
          background: '#1a7a6e',
          color: '#fff',
          fontSize: 9,
          fontWeight: 800,
          flexShrink: 0,
          verticalAlign: 'middle',
        }}>
          {q.index}
        </span>
      ))}
    </span>
  );
}

function PassageText({ text, highlights }) {
  const segments = useMemo(() => buildSegments(text, highlights), [text, highlights]);

  return (
    <p style={{
      fontSize: 14,
      lineHeight: 2,
      color: '#0f2e2a',
      margin: 0,
      wordBreak: 'break-word',
    }}>
      {segments.map((seg, i) =>
        seg.qs.length > 0 ? (
          <mark key={i} style={{
            background: 'rgba(26,122,110,0.15)',
            borderRadius: 4,
            padding: '0 2px',
            color: '#0a2a24',
            fontWeight: 500,
            textDecoration: 'underline',
            textDecorationColor: 'rgba(26,122,110,0.4)',
            textUnderlineOffset: 3,
          }}>
            {seg.text}
            <HighlightTag qs={seg.qs} />
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  );
}

function LegendRow({ q }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12 }}>
      <span style={{
        width: 18, height: 18, borderRadius: '50%',
        background: '#1a7a6e', color: '#fff',
        fontSize: 9, fontWeight: 800,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, marginTop: 2,
      }}>
        {q.index}
      </span>
      <div style={{ color: '#4a7a74', lineHeight: 1.6 }}>
        <span style={{ color: '#1a7a6e', fontWeight: 700 }}>第{q.index}题</span>
        {q.location?.paragraph && (
          <span style={{ marginLeft: 6, fontSize: 11, background: 'rgba(26,122,110,0.1)', color: '#1a7a6e', padding: '1px 7px', borderRadius: 6, fontWeight: 600 }}>
            {q.location.paragraph}
          </span>
        )}
        {q.location?.strategy && (
          <span style={{ marginLeft: 6, fontSize: 11, color: '#7a9a96' }}>{q.location.strategy}</span>
        )}
      </div>
    </div>
  );
}

export default function ReadingPassageHighlight({ passage, questions = [] }) {
  const [show, setShow] = useState(true);
  const highlights = useMemo(() => buildHighlightMap(questions), [questions]);
  const hasLocations = questions.some((q) => q.location?.quote);

  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a7a6e', letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Passage
          </span>
          <span style={{ fontSize: 11, color: '#4a7a74' }}>· 答案定位高亮</span>
          {hasLocations && (
            <span style={{
              fontSize: 10, background: 'rgba(26,122,110,0.1)', color: '#1a7a6e',
              padding: '2px 8px', borderRadius: 8, fontWeight: 600,
            }}>
              {questions.filter(q => q.location?.quote).length} 处已定位
            </span>
          )}
        </div>
        <button
          onClick={() => setShow(v => !v)}
          style={{ fontSize: 11, fontWeight: 700, color: '#4a7a74', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {show ? '收起原文' : '展开原文'}
        </button>
      </div>

      {show && (
        <div style={{
          border: '1px solid rgba(26,122,110,0.12)',
          borderRadius: 18,
          background: '#fff',
          overflow: 'hidden',
        }}>
          {/* Legend */}
          {hasLocations && (
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid rgba(26,122,110,0.08)',
              background: 'rgba(26,122,110,0.03)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
            }}>
              {questions.filter(q => q.location?.quote).map(q => (
                <LegendRow key={q.index} q={q} />
              ))}
            </div>
          )}

          {/* Passage text */}
          <div style={{ padding: '20px 24px' }}>
            <PassageText text={passage} highlights={highlights} />
          </div>
        </div>
      )}
    </section>
  );
}
