import { AnalysisSection, ANALYSIS_THEME } from '../shared-ui.jsx';

export default function KeyPoints({ keyPoints }) {
  const points = Array.isArray(keyPoints) ? keyPoints : [];

  return (
    <AnalysisSection title="原文要点提炼" subtitle="这里列出原文最该保留的关键信息，帮助学生判断摘要是否抓住主干。">
      {points.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {points.map((point, idx) => (
            <div
              key={idx}
              style={{
                background: ANALYSIS_THEME.surface,
                border: `1px solid ${ANALYSIS_THEME.border}`,
                borderRadius: 0,
                padding: '9px 12px',
                fontSize: 13,
                lineHeight: 1.7,
                color: ANALYSIS_THEME.text,
              }}
            >
              {idx + 1}. {point}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: ANALYSIS_THEME.subtext }}>暂无要点数据。</div>
      )}
    </AnalysisSection>
  );
}
