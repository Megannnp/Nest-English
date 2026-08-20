import TeacherWritingDetailContent from "./teacher-writing/TeacherWritingDetailContent.jsx";
import TeacherWritingPageHeader from "./teacher-writing/TeacherWritingPageHeader.jsx";
import { useTeacherWritingDetailModel } from "./teacher-writing/useTeacherWritingDetailModel.jsx";

export default function TeacherWritingDetailPage({
  user,
  isMobile = false,
  writingContext,
  onBackToWorkbench,
  onOpenWriting,
  onOpenClassContext,
}) {
  const {
    state: {
      writingId,
      writing,
      feedback,
      comment,
      loading,
      saving,
      message,
      jumpHighlight,
      voiceSupported,
      isVoiceListening,
      feedbackStatusSummary,
      retryingQuickFeedback,
      retryingSupplementalFeedback,
      writingSequence,
      currentSequenceIndex,
      previousWriting,
      nextWriting,
      progressTotal,
      progressCurrent,
      progressPercent,
    },
    actions: {
      setComment,
      handleSaveComment,
      handleSaveAndMoveNext,
      handleSaveAndBack,
      handleToggleVoiceComment,
      handleRestartVoiceComment,
      handleRetryQuickFeedback,
      handleRetrySupplementalFeedback,
    },
  } = useTeacherWritingDetailModel({
    user,
    writingContext,
    onBackToWorkbench,
    onOpenWriting,
    onOpenClassContext,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <TeacherWritingPageHeader
        isMobile={isMobile}
        onBackToWorkbench={onBackToWorkbench}
        previousWriting={previousWriting}
        nextWriting={nextWriting}
        writingContext={writingContext}
        onOpenWriting={onOpenWriting}
        onOpenClassContext={onOpenClassContext}
      />

      <TeacherWritingDetailContent
        isMobile={isMobile}
        writingId={writingId}
        writing={writing}
        feedback={feedback}
        comment={comment}
        loading={loading}
        saving={saving}
        message={message}
        jumpHighlight={jumpHighlight}
        voiceSupported={voiceSupported}
        isVoiceListening={isVoiceListening}
        feedbackStatusSummary={feedbackStatusSummary}
        retryingQuickFeedback={retryingQuickFeedback}
        retryingSupplementalFeedback={retryingSupplementalFeedback}
        writingContext={writingContext}
        currentSequenceIndex={currentSequenceIndex}
        writingSequence={writingSequence}
        progressTotal={progressTotal}
        progressCurrent={progressCurrent}
        progressPercent={progressPercent}
        nextWriting={nextWriting}
        onSetComment={setComment}
        onToggleVoiceComment={handleToggleVoiceComment}
        onRestartVoiceComment={handleRestartVoiceComment}
        onRetryQuickFeedback={handleRetryQuickFeedback}
        onRetrySupplementalFeedback={handleRetrySupplementalFeedback}
        onSaveComment={handleSaveComment}
        onSaveAndBack={handleSaveAndBack}
        onSaveAndMoveNext={handleSaveAndMoveNext}
      />
    </div>
  );
}
