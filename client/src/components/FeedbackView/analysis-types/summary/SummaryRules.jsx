import { AnalysisSection, ANALYSIS_THEME } from '../shared-ui.jsx';

export default function SummaryRules({ rules }) {
  const ruleList = Array.isArray(rules) && rules.length ? rules : [
    '概括原文核心内容，不添加个人观点',
    '保留关键信息，删除细节描述',
    '控制字数，通常为原文的1/4到1/3',
    '使用第三人称，保持客观性',
  ];

  return (
    <AnalysisSection title="概要写作核心规范" subtitle="先把概要写作的基本规则抓稳，再看学生摘要有没有偏离任务要求。">
      {ruleList.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ruleList.map((rule, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr',
                gap: 8,
                alignItems: 'start',
                background: ANALYSIS_THEME.surface,
                border: `1px solid ${ANALYSIS_THEME.border}`,
                borderRadius: 0,
                padding: '9px 12px',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: ANALYSIS_THEME.accentSoft,
                  border: `1px solid ${ANALYSIS_THEME.border}`,
                  color: ANALYSIS_THEME.accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: ANALYSIS_THEME.text }}>{rule}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: ANALYSIS_THEME.subtext }}>暂无概要写作规范。</div>
      )}
    </AnalysisSection>
  );
}
