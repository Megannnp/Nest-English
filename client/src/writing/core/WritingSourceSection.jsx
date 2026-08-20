import { Suspense, lazy, useEffect, useState } from 'react';

const AssignmentPanel = lazy(() => import('./AssignmentPanel.jsx'));
const QuestionSourceBrowser = lazy(() => import('../../components/questions/QuestionSourceBrowser.jsx'));

function SourceSectionFallback({ minHeight = 160 }) {
  return (
    <div
      style={{
        minHeight,
        borderRadius: 20,
        border: '1px solid #ece6de',
        background: 'linear-gradient(180deg, #fffdfa 0%, #fff 100%)',
      }}
    />
  );
}

export default function WritingSourceSection({
  isMobile = false,
  isTaskMode = false,
  assignmentPanelProps,
  questionSourceProps,
  initialSourceMode = '',
  hideModeSelector = false,
}) {
  const [sourceMode, setSourceMode] = useState('');

  useEffect(() => {
    if (isTaskMode) {
      setSourceMode('task');
      return;
    }
    setSourceMode(initialSourceMode || '');
  }, [initialSourceMode, isTaskMode]);

  useEffect(() => {
    if (isTaskMode) return;
    if (initialSourceMode === 'manual') {
      assignmentPanelProps?.onToggle?.(true);
    }
  }, [assignmentPanelProps, initialSourceMode, isTaskMode]);

  if (isTaskMode) {
    return (
      <Suspense fallback={<SourceSectionFallback minHeight={220} />}>
        <AssignmentPanel {...assignmentPanelProps} />
      </Suspense>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
      {!hideModeSelector ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { id: 'manual', label: '自由添加题目', helper: '手动填写标题和题干，提交后也会自动进入你的题库。' },
            { id: 'bank', label: '题库题目选择', helper: '按年限、卷型、题型、主题筛选后，直接选用已有题目。' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSourceMode(item.id);
                if (item.id === 'manual') {
                  assignmentPanelProps?.onToggle?.(true);
                }
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: sourceMode === item.id ? '1px solid #d6a44f' : '1px solid #e7dbcf',
                background: sourceMode === item.id ? '#fff7ed' : '#fff',
                color: sourceMode === item.id ? '#8b5e1a' : '#6f5640',
                fontSize: 12,
                fontWeight: sourceMode === item.id ? 700 : 500,
                cursor: 'pointer',
              }}
              title={item.helper}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {sourceMode === 'manual' ? (
        <Suspense fallback={<SourceSectionFallback minHeight={220} />}>
          <AssignmentPanel {...assignmentPanelProps} forceExpanded />
        </Suspense>
      ) : null}
      {sourceMode === 'bank' ? (
        <Suspense fallback={<SourceSectionFallback minHeight={260} />}>
          <QuestionSourceBrowser {...questionSourceProps} embedded />
        </Suspense>
      ) : null}
    </div>
  );
}
