import { AnalysisSection, ANALYSIS_THEME } from '../shared-ui.jsx';

export default function MissingPointsAlert({ missedPoints, opinionAlerts }) {
  if ((!Array.isArray(missedPoints) || missedPoints.length === 0) && (!Array.isArray(opinionAlerts) || opinionAlerts.length === 0)) {
    return null;
  }

  return (
    <AnalysisSection title="写作检测提醒" subtitle="重点提示摘要里容易丢失的关键信息，以及不该加入的个人观点。">

      {Array.isArray(missedPoints) && missedPoints.length > 0 ? (
        <div
          style={{
            background: ANALYSIS_THEME.surface,
            border: `1px solid ${ANALYSIS_THEME.border}`,
            borderRadius: 0,
            padding: '10px 12px',
            marginBottom: opinionAlerts?.length ? 10 : 0,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: ANALYSIS_THEME.accent, marginBottom: 6 }}>遗漏要点</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {missedPoints.map((item, idx) => (
              <div key={idx} style={{ fontSize: 13, lineHeight: 1.7, color: ANALYSIS_THEME.text }}>
                {idx + 1}. {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {Array.isArray(opinionAlerts) && opinionAlerts.length > 0 ? (
        <div
          style={{
            background: ANALYSIS_THEME.surface,
            border: `1px solid ${ANALYSIS_THEME.border}`,
            borderRadius: 0,
            padding: '10px 12px',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: ANALYSIS_THEME.accent, marginBottom: 6 }}>个人观点提醒</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {opinionAlerts.map((item, idx) => (
              <div key={idx} style={{ fontSize: 13, lineHeight: 1.7, color: ANALYSIS_THEME.text }}>
                {idx + 1}. {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </AnalysisSection>
  );
}
