import { useTeacherCommentActions } from "./useTeacherCommentActions.jsx";
import { useTeacherVoiceComment } from "./useTeacherVoiceComment.jsx";
import { useTeacherWritingDetailData } from "./useTeacherWritingDetailData.jsx";
import { useTeacherWritingSequence } from "./useTeacherWritingSequence.jsx";

export function useTeacherWritingDetailModel({
  user,
  writingContext,
  onBackToWorkbench,
  onOpenWriting,
  onOpenClassContext,
}) {
  const writingId = writingContext?.writingId || null;
  const {
    writingSequence,
    currentSequenceIndex,
    previousWriting,
    nextWriting,
    progressTotal,
    progressCurrent,
    progressPercent,
  } = useTeacherWritingSequence(writingContext, writingId);
  const {
    state: {
      writing,
      feedback,
      comment,
      loading,
      message,
      jumpHighlight,
      feedbackStatusSummary,
      retryingQuickFeedback,
    },
    actions: {
      setComment,
      setMessage,
      loadDetail,
      handleRetryQuickFeedback,
    },
  } = useTeacherWritingDetailData(writingId, writingContext?.flashMessage);

  const {
    voiceSupported,
    isVoiceListening,
    handleToggleVoiceComment,
    handleRestartVoiceComment,
  } = useTeacherVoiceComment(writingId, setComment, setMessage);
  const {
    state: {
      saving,
    },
    actions: {
      handleSaveComment,
      handleSaveAndMoveNext,
      handleSaveAndBack,
    },
  } = useTeacherCommentActions({
    writingId,
    comment,
    loadDetail,
    nextWriting,
    writingContext,
    onOpenWriting,
    onBackToWorkbench,
    setMessage,
  });

  return {
    state: {
      user,
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
      onBackToWorkbench,
      onOpenWriting,
      onOpenClassContext,
    },
  };
}
