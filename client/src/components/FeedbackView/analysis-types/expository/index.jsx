import React from 'react';

import {
  AnalysisPage,
  AnalysisSection as Section,
  AnalysisCard,
  AnalysisText,
  ANALYSIS_THEME,
} from '../shared-ui.jsx';

export default function ExpositoryAnalysis({ feedback, originalText }) {
  const categories = React.useMemo(() => {
    if (feedback?.categories && Array.isArray(feedback.categories)) {
      return feedback.categories;
    }
    if (feedback?.dimensions && typeof feedback.dimensions === 'object') {
      return Object.entries(feedback.dimensions).map(([name, val]) => ({
        name,
        icon: val.icon || '',
        grade: val.score,
        comment: val.comment,
        suggestions: val.suggestions || [],
      }));
    }
    return [];
  }, [feedback]);

  const allKeyPoints = categories.flatMap((cat) =>
    (cat.suggestions || []).map((suggestion) => ({
      dim: cat.name,
      icon: cat.icon,
      text: suggestion,
    })),
  );

  return (
    <AnalysisPage>
      <Section title="题目要求" subtitle="先把任务材料读准，后面的要点提炼和写作任务才不会偏。">
        <AnalysisCard>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: 13,
              lineHeight: 1.8,
              color: originalText ? ANALYSIS_THEME.text : ANALYSIS_THEME.subtext,
            }}
          >
            {originalText || '未提供题目材料。'}
          </div>
        </AnalysisCard>
      </Section>

      {allKeyPoints.length > 0 ? (
        <Section title="写作要点清单" subtitle="把评分时最容易被关注的任务点集中列清，方便学生逐一覆盖。">
          <div style={{ display: 'grid', gap: 10 }}>
            {allKeyPoints.map((point, idx) => (
              <AnalysisCard key={idx} compact>
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 10, alignItems: 'start' }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: ANALYSIS_THEME.accentSoft,
                      color: ANALYSIS_THEME.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: ANALYSIS_THEME.subtext, marginBottom: 4 }}>
                      {point.icon} {point.dim}
                    </div>
                    <AnalysisText>{point.text}</AnalysisText>
                  </div>
                </div>
              </AnalysisCard>
            ))}
          </div>
        </Section>
      ) : null}
    </AnalysisPage>
  );
}
