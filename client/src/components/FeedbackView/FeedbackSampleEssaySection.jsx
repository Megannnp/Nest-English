import { ShimmerBlock } from './FeedbackShell';

function formatEssay(text, writingType) {
  if (!text) return '';
  // For continuation writing, preserve the text as-is to avoid splitting
  // the two required paragraphs at a wrong sentence boundary.
  if (writingType === 'continuation') return text;
  if (text.includes('\n\n')) return text;
  const parts = text.split(/(?<=[.!?。！？])/).map((item) => item.trim()).filter(Boolean);
  if (parts.length < 4) return text;
  const midpoint = Math.ceil(parts.length / 2);
  return `${parts.slice(0, midpoint).join(' ')}\n\n${parts.slice(midpoint).join(' ')}`;
}

function normalizeEssayCard(sampleEssay = {}, fallbackTitle = '参考范文') {
  if (!sampleEssay?.text) return null;
  return {
    title: sampleEssay.title || fallbackTitle,
    text: sampleEssay.text,
    highlights: sampleEssay.highlights?.length ? sampleEssay.highlights : [],
  };
}

export function FeedbackSampleEssaySection({
  sampleEssay,
  correctedSampleEssay,
  excellentSampleEssay,
  writingType = 'general',
  isMobile = false,
}) {
  const correctedEssay = normalizeEssayCard(correctedSampleEssay, '批改后范文');
  const excellentEssay = normalizeEssayCard(
    excellentSampleEssay || sampleEssay,
    '优秀范文'
  );
  const essayCards = [correctedEssay, excellentEssay].filter(Boolean);

  return (
    <div style={{ display: 'grid', gap: 6, paddingBottom: 4 }}>
      {/* Header — same pattern as ReviewPanel */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#f5f0e8',
        borderTop: '1px solid #d4c8b8',
        borderBottom: '1px solid #d4c8b8',
        padding: isMobile ? '8px 20px' : '9px 26px',
        margin: isMobile ? '0 -10px 4px' : '0 -14px 4px',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6b5a47', letterSpacing: '0.04em' }}>范文参考</span>
        <span style={{ fontSize: 11, color: '#8a7d6e' }}>一篇看得见修改路径，一篇看得见高分表达</span>
      </div>

      {essayCards.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0 }}>
          {essayCards.map((essayData, index) => {
            const formattedEssay = formatEssay(essayData.text || '', writingType);
            return (
              <div key={`${essayData.title || 'essay'}-${index}`} style={{ borderTop: index > 0 ? '1px solid #d4c8b8' : 'none', paddingTop: index > 0 ? 12 : 0, marginTop: index > 0 ? 12 : 0 }}>
                {essayData.title && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#8A6F5B', marginBottom: 6, letterSpacing: '0.01em' }}>
                    {essayData.title}
                  </div>
                )}
                <div style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Georgia, serif',
                  lineHeight: 1.9,
                  fontSize: 13,
                  color: '#3D2C1F',
                  paddingLeft: 0,
                }}>
                  {formattedEssay}
                </div>
                {essayData.highlights?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                    {essayData.highlights.map((item, i) => (
                      <span key={i} style={{ padding: '2px 8px', fontSize: 11, color: '#8A6F5B', border: '1px solid #d9c4b0' }}>
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.7, color: '#8A6F5B' }}>
          范文会严格根据当前作文的标题、题目要求和题型生成；当前暂未返回可展示内容。
        </div>
      )}
    </div>
  );
}

export function FeedbackSampleEssaySkeleton({ isMobile = false }) {
  return (
    <div style={{ display: 'grid', gap: 8, paddingBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'grid', gap: 5 }}>
          <ShimmerBlock width={isMobile ? 80 : 100} height={15} radius={2} />
          <ShimmerBlock width={isMobile ? 160 : 220} height={11} radius={2} />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ShimmerBlock width="100%" height={13} radius={2} />
        <ShimmerBlock width="96%" height={13} radius={2} />
        <ShimmerBlock width="88%" height={13} radius={2} />
        <ShimmerBlock width="92%" height={13} radius={2} />
        <ShimmerBlock width="75%" height={13} radius={2} />
      </div>
    </div>
  );
}
