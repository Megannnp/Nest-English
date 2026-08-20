import {
  normalizeType,
  TYPE_DISPLAY,
} from './feedbackAdapter';
import {
  Card,
  ShimmerBlock,
} from './FeedbackShell';

const C = {
  dark:      '#2a1f14',
  gold:      '#f5d78a',
  text:      '#2a1f14',
  sub:       '#4a3928',
  muted:     '#6b5a47',
  accent:    '#8A6F5B',
  border:    '#d4c8b8',
  borderSub: '#e8e0d5',
  bg:        '#ffffff',
  bgSection: '#f5f0e8',
};

function SectionHead({ label, note }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 20px',
      background: C.bgSection,
      borderTop: `1px solid ${C.border}`,
      borderBottom: `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      {note && <span style={{ fontSize: 11, color: '#8a7d6e', marginLeft: 6 }}>{note}</span>}
    </div>
  );
}

function formatGeneratedAt(generatedAt) {
  if (!generatedAt) return null;
  return new Date(generatedAt)
    .toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .replace(/\//g, '-');
}

function firstPresent(...values) {
  const found = values.find(Boolean);
  return found === undefined ? values[values.length - 1] : found;
}

function getWritingTypeLabel({ safeData, feedback }) {
  const detectedType = getDetectedWritingType({ safeData, feedback });
  const normalizedWritingType = normalizeType(detectedType);
  return firstPresent(TYPE_DISPLAY[normalizedWritingType], safeData?.aiAnalysis?.type, feedback?.aiAnalysis?.type, '识别中');
}

function getDetectedWritingType({ safeData, feedback }) {
  return firstPresent(
    safeData?.questionAnalysis?.type,
    feedback?.questionAnalysis?.type,
    safeData?.aiAnalysis?.type,
    feedback?.aiAnalysis?.type,
    safeData?.overall?.writingType,
    feedback?.writingType,
    null
  );
}

function getSuggestionItems(safeData) {
  const source = Array.isArray(safeData?.improvements) && safeData.improvements.length
    ? safeData.improvements
    : (Array.isArray(safeData?.suggestions) ? safeData.suggestions : []);

  return source
    .map((item) => (typeof item === 'string' ? item : (item.title || item.detail || '')))
    .filter(Boolean)
    .slice(0, 5);
}

function getSmartTags({ safeData, feedback }) {
  if (Array.isArray(safeData?.aiAnalysis?.themes)) return safeData.aiAnalysis.themes;
  if (Array.isArray(feedback?.aiAnalysis?.themes)) return feedback.aiAnalysis.themes;
  return [];
}

function buildScoreModel(safeData) {
  const overall = safeData?.overall || {};
  return {
    overall,
    score: overall?.score ?? null,
    total: overall?.total ?? '--',
    isGenerating: Boolean(safeData?.generation?.active),
  };
}

function buildReportMeta(input) {
  return {
    ...buildTypeAndScoreMeta(input),
    ...buildIdentityMeta(input),
    ...buildTaskMeta(input),
  };
}

function buildTypeAndScoreMeta({ safeData, feedback }) {
  const overall = safeData?.overall || {};
  const grade = overall?.grade || '';

  return {
    writingTypeLabel: getWritingTypeLabel({ safeData, feedback }),
    tierLabel: feedback?.tier || (grade ? `${grade}档` : ''),
    percentile: feedback?.percentile ?? safeData?.percentile ?? null,
  };
}

function buildIdentityMeta({ safeData, feedback }) {
  return {
    studentName: firstPresent(feedback?.studentName, safeData?.studentName, null),
  };
}

function buildTaskMeta({ safeData, feedback, question }) {
  return {
    classInfo: firstPresent(feedback?.className, question?.className, null),
    assignTitle: firstPresent(feedback?.assignmentTitle, question?.title, null),
    batchCode: firstPresent(feedback?.batchCode, question?.batchCode, null),
    timeStr: formatGeneratedAt(feedback?.generatedAt || safeData?.generatedAt || null),
  };
}

function buildContentModel({ safeData, feedback, originalText }) {
  const overall = safeData?.overall || {};
  return {
    dimensionEntries: Object.entries(safeData?.dimensions || {}),
    visibleSummary: firstPresent(overall?.summary, safeData?.summary, feedback?.summary, safeData?.overview, '暂无总体评价'),
    suggestionItems: getSuggestionItems(safeData),
    smartTags: getSmartTags({ safeData, feedback }),
    normalizedOriginalText: String(originalText || '').trim(),
  };
}

function buildOverviewModel({ safeData, question, feedback, originalText }) {
  return {
    ...buildScoreModel(safeData),
    ...buildReportMeta({ safeData, feedback, question }),
    ...buildContentModel({ safeData, feedback, originalText }),
  };
}

function DimensionHeaderCell({ label, index, isMobile }) {
  const width = isMobile
    ? (index === 0 ? 80 : index === 1 ? 70 : undefined)
    : (index === 0 ? 120 : index === 1 ? 80 : index === 2 ? 56 : undefined);

  return (
    <th style={{
      background: '#faf8f4', color: C.muted,
      fontWeight: 700, fontSize: 11, textTransform: 'uppercase',
      letterSpacing: '0.06em', padding: '7px 12px', textAlign: 'left',
      borderBottom: `1px solid ${C.border}`,
      width,
    }}>{label}</th>
  );
}

function DimensionRatioCell({ ratio, borderBottom }) {
  return (
    <td style={{ padding: '10px 12px', borderBottom, verticalAlign: 'top' }}>
      {ratio !== null
        ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <div style={{ height: 6, background: C.borderSub, borderRadius: 3, overflow: 'hidden', width: 80, flexShrink: 0 }}>
              <div style={{ height: '100%', width: `${ratio * 100}%`, background: C.accent, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, whiteSpace: 'nowrap' }}>
              {Math.round(ratio * 100)}%
            </span>
          </div>
        )
        : <span style={{ color: C.muted }}>—</span>}
    </td>
  );
}

function DimensionRow({ entry, index, totalRows, isMobile }) {
  const [key, value] = entry;
  const dimScore = value?.score;
  const dimTotal = value?.total || 10;
  const ratio = dimScore !== undefined ? Math.min(1, Number(dimScore) / Number(dimTotal)) : null;
  const borderBottom = index < totalRows - 1 ? `1px solid ${C.borderSub}` : 'none';

  return (
    <tr>
      <td style={{ padding: '10px 12px', borderBottom, verticalAlign: 'top' }}>
        <span style={{ fontWeight: 700, color: C.dark }}>{key}</span>
      </td>
      <td style={{ padding: '10px 12px', borderBottom, verticalAlign: 'top', whiteSpace: 'nowrap' }}>
        <div style={{ fontWeight: 800, color: C.accent }}>{dimScore ?? '—'} / {dimTotal}</div>
        {value?.grade && (
          <span style={{
            display: 'inline-block', marginTop: 3,
            padding: '1px 6px', borderRadius: 2, fontSize: 11, fontWeight: 700,
            background: '#f5f0e8', border: `1px solid #d4c8b8`, color: C.accent,
          }}>{value.grade}</span>
        )}
      </td>
      {!isMobile && <DimensionRatioCell ratio={ratio} borderBottom={borderBottom} />}
      <td style={{ padding: '10px 12px', borderBottom, verticalAlign: 'top', lineHeight: 1.6, color: C.sub }}>
        {value?.comment || '暂无维度点评'}
      </td>
    </tr>
  );
}

function ReportHeader({ model, isMobile }) {
  return (
    <div style={{
      background: C.dark,
      padding: isMobile ? '10px 14px' : '14px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
        AI 写作诊断报告
      </div>
      <div style={{ textAlign: 'right', fontSize: isMobile ? 10 : 11, color: '#b8a88a', lineHeight: 1.6 }}>
        {model.timeStr && <div>生成时间：{model.timeStr}</div>}
        <div>
          {model.writingTypeLabel}
          {model.batchCode ? ` · 任务批次 #${model.batchCode}` : ''}
        </div>
      </div>
    </div>
  );
}

function SmartTags({ tags }) {
  if (!tags.length) return null;
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 2 }}>
      {tags.map((tag, i) => (
        <span key={`${tag}-${i}`} style={{
          padding: '1px 7px', fontSize: 11, fontWeight: 700,
          background: '#f5f0e8', border: `1px solid #d4c8b8`, color: C.accent,
          borderRadius: 2,
        }}>{tag}</span>
      ))}
    </div>
  );
}

function ScoreBlock({ model, isMobile, onExportPDF }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {model.isGenerating
        ? <ShimmerBlock width={100} height={60} radius={2} />
        : model.score !== null && (
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 10,
            padding: isMobile ? '8px 14px' : '10px 18px',
            background: C.dark, borderRadius: 18,
          }}>
            <span style={{ fontSize: isMobile ? 30 : 38, fontWeight: 900, lineHeight: 1, color: C.gold }}>{model.score}</span>
            <span style={{ fontSize: 13, color: '#b8a88a' }}>/ {model.total}</span>
          </div>
        )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
        {model.tierLabel && (
          <span style={{
            fontSize: 13, fontWeight: 700,
            padding: '3px 10px',
            background: C.dark,
            border: '1px solid rgba(245,215,138,0.3)',
            borderRadius: 999, color: C.gold, whiteSpace: 'nowrap',
          }}>{model.tierLabel}</span>
        )}
        {model.percentile !== null && (
          <span style={{ fontSize: 11, color: C.muted }}>超过班级 {model.percentile}% 同学</span>
        )}
        <button onClick={onExportPDF} style={{
          padding: '3px 10px', background: 'transparent',
          color: C.muted, border: `1px solid ${C.border}`,
          borderRadius: 999, cursor: 'pointer', fontSize: 11, fontWeight: 700,
        }}>导出 PDF</button>
      </div>
    </div>
  );
}

function StudentScoreBanner({ model, isMobile, onExportPDF }) {
  const metaLine = [
    model.writingTypeLabel,
    model.classInfo,
    model.assignTitle ? `题目：${model.assignTitle}` : null,
    model.total !== '--' ? `满分 ${model.total} 分` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{
      background: C.bg,
      borderBottom: `2px solid ${C.dark}`,
      padding: isMobile ? '12px 14px' : '16px 20px',
      display: isMobile ? 'flex' : 'grid',
      flexDirection: isMobile ? 'column' : undefined,
      gridTemplateColumns: isMobile ? undefined : '1fr auto',
      gap: isMobile ? 10 : 16,
      alignItems: isMobile ? 'flex-start' : 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {model.studentName
          ? <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 900, color: C.dark }}>{model.studentName}</div>
          : null}
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{metaLine}</div>
        <SmartTags tags={model.smartTags} />
      </div>
      <ScoreBlock model={model} isMobile={isMobile} onExportPDF={onExportPDF} />
    </div>
  );
}

function DimensionsSection({ model, isMobile }) {
  if (!model.dimensionEntries.length && !model.isGenerating) return null;
  return (
    <div>
      <SectionHead label="各维度评分" />
      {model.isGenerating ? (
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1, 2].map(i => <ShimmerBlock key={i} width="100%" height={40} radius={3} />)}
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {(isMobile ? ['维度', '得分', '评语'] : ['维度', '得分', '占比', '评语']).map((h, i) => (
                <DimensionHeaderCell key={h} label={h} index={i} isMobile={isMobile} />
              ))}
            </tr>
          </thead>
          <tbody>
            {model.dimensionEntries.map((entry, idx) => (
              <DimensionRow
                key={entry[0]}
                entry={entry}
                index={idx}
                totalRows={model.dimensionEntries.length}
                isMobile={isMobile}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function FeedbackOverview({ safeData, _typeInfo, question, feedback, onExportPDF, originalText, isMobile = false }) {
  const model = buildOverviewModel({ safeData, question, feedback, originalText });

  return (
    <Card style={{ marginBottom: 16, overflow: 'hidden' }}>
      <ReportHeader model={model} isMobile={isMobile} />
      <StudentScoreBanner model={model} isMobile={isMobile} onExportPDF={onExportPDF} />
      <DimensionsSection model={model} isMobile={isMobile} />

      {/* ── 总体评价 ── */}
      <div>
        <SectionHead label="总体评价" />
        <div style={{ padding: isMobile ? '10px 14px' : '12px 20px' }}>
          {model.isGenerating ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <ShimmerBlock width="100%" height={12} radius={3} />
              <ShimmerBlock width="92%" height={12} radius={3} />
              <ShimmerBlock width="80%" height={12} radius={3} />
            </div>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.8, color: C.text }}>
              {model.visibleSummary}
            </div>
          )}
        </div>
      </div>

      {/* ── 改进建议 ── */}
      {model.suggestionItems.length > 0 && (
        <div>
          <SectionHead label="改进建议" />
          <div style={{ padding: isMobile ? '8px 14px' : '10px 20px' }}>
            {model.suggestionItems.map((item, index) => (
              <div key={index} style={{
                display: 'grid', gridTemplateColumns: '14px 1fr', gap: 8,
                fontSize: 13, padding: '6px 0',
                borderBottom: 'none',
                lineHeight: 1.65, color: C.text,
                alignItems: 'baseline',
              }}>
                <div style={{ color: C.accent, fontWeight: 900, marginTop: 1 }}>→</div>
                <div>{item}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 学生原文 ── */}
      {model.normalizedOriginalText && (
        <div>
          <SectionHead label="学生原文" />
          <div style={{ padding: isMobile ? '10px 14px' : '12px 20px' }}>
            <div style={{
              fontSize: 13, lineHeight: 1.8, color: C.dark,
              whiteSpace: 'pre-wrap',
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}>{model.normalizedOriginalText}</div>
          </div>
        </div>
      )}

    </Card>
  );
}
