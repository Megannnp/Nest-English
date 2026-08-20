import { T } from './constants.js';
import {
  buildWritingRecordSections,
  WRITING_RECORD_FILTER_OPTIONS,
} from './recordSectionConfig.js';
import WritingHistoryList from './WritingHistoryList.jsx';
import ProductState from '../../components/shared/ProductState.jsx';
import StudentSectionHeader from '../../components/student/StudentSectionHeader.jsx';

function WritingRecordsActionState({ actionState }) {
  if (!actionState) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <ProductState
        compact
        tone={actionState.tone || 'neutral'}
        title={actionState.title || '状态更新'}
        description={actionState.description || ''}
        actionLabel={actionState.actionLabel || ''}
        onAction={actionState.onAction || null}
      />
    </div>
  );
}

function WritingRecordSection({
  section,
  isMobile,
  listProps,
}) {
  return (
    <div style={section.divider ? { paddingTop: 16, borderTop: `1px solid ${T.border}` } : undefined}>
      <StudentSectionHeader
        title={section.title}
        subtitle={section.subtitle}
        badge={section.badge}
      />
      <WritingHistoryList
        writings={section.writings}
        filtered={section.filtered}
        filter={section.filter}
        setFilter={section.setFilter}
        isMobile={isMobile}
        filterOptions={WRITING_RECORD_FILTER_OPTIONS}
        emptyMessage={section.emptyMessage}
        {...listProps}
      />
    </div>
  );
}

export default function WritingRecordsPanel({
  modelState,
  modelActions,
  isMobile = false,
}) {
  const sections = buildWritingRecordSections({
    taskFiltered: modelState.taskFiltered,
    practiceFiltered: modelState.practiceFiltered,
    taskWritings: modelState.taskWritings,
    practiceWritings: modelState.practiceWritings,
    taskFilter: modelState.taskFilter,
    practiceFilter: modelState.practiceFilter,
    setTaskFilter: modelActions.setTaskFilter,
    setPracticeFilter: modelActions.setPracticeFilter,
  });

  const listProps = {
    retryingId: modelState.retryingId,
    replayingId: modelState.replayingId,
    detailingId: modelState.detailingId,
    quickRetryingId: modelState.quickRetryingId,
    supplementalRetryingId: modelState.supplementalRetryingId,
    viewingId: modelState.viewingId,
    deletingId: modelState.deletingId,
    taskRefreshKey: modelState.taskRefreshKey,
    onRetryAnalysis: modelActions.handleRetryAnalysis,
    onReplayDeadLetter: modelActions.handleReplayDeadLetter,
    onViewFullFeedback: modelActions.handleViewFullFeedback,
    onRequestDetailedFeedback: modelActions.handleRequestDetailedFeedback,
    onRetryQuickFeedback: modelActions.handleRetryQuickFeedback,
    onRetrySupplementalFeedback: modelActions.handleRetrySupplementalFeedback,
    onDeleteWriting: modelActions.handleDeleteWriting,
    onWriteNextDraft: modelActions.handleWriteNextDraft,
  };

  return (
    <>
      <StudentSectionHeader
        title="记录总览"
        subtitle="这里按任务记录和自由练习记录分开回看。先看老师布置的任务，再回顾自己的自由练习与成长变化。"
        badge={`${modelState.writings.length} 篇`}
      />
      <WritingRecordsActionState actionState={modelState.actionState} />
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {sections.map((section) => (
          <WritingRecordSection
            key={section.key}
            section={section}
            isMobile={isMobile}
            listProps={listProps}
          />
        ))}
      </div>
    </>
  );
}
