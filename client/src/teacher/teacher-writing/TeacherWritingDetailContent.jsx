import DetailedFeedbackStatusSection from "./DetailedFeedbackStatusSection.jsx";
import QuickFeedbackSection from "./QuickFeedbackSection.jsx";
import TeacherCommentSection from "./TeacherCommentSection.jsx";
import TeacherWritingStatusBlocks from "./TeacherWritingStatusBlocks.jsx";
import WritingBodySection from "./WritingBodySection.jsx";
import WritingMetaSection from "./WritingMetaSection.jsx";
import { SurfaceCard } from "../../components/shared/UI.jsx";

export function formatSupplementalFailureReason(reason = "") {
  const text = String(reason || "").toLowerCase();
  if (text.includes("超时") || text.includes("timeout")) {
    return "失败原因：生成超时，本次完整精批没有在后台时限内完成。";
  }
  if (text.includes("json") || text.includes("parse")) {
    return "失败原因：AI 返回内容格式不完整，系统没有直接写入这版结果。";
  }
  if (text.includes("schema") || text.includes("validation") || text.includes("校验")) {
    return "失败原因：反馈内容没有通过完整性校验，系统已阻止写入。";
  }
  return reason ? `失败原因：${reason}` : "失败原因：完整精批补齐失败。";
}

function hasSupplementalFeedbackState(feedback) {
  return ["ready", "failed", "running", "pending"].includes(feedback?.supplementalFeedback?.status);
}

function RetryFeedbackButton({ retrying, onClick, label }) {
  return (
    <button
      type="button"
      aria-label={retrying ? "重试中" : label}
      onClick={onClick}
      disabled={retrying}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: "1px solid rgba(95,71,39,0.14)",
        background: retrying ? "#efe7dc" : "#fffaf5",
        color: retrying ? "#a09080" : "#8b5e1a",
        fontSize: 12,
        fontWeight: 700,
        cursor: retrying ? "not-allowed" : "pointer",
      }}
    >
      {retrying ? "重试中..." : label}
    </button>
  );
}

export default function TeacherWritingDetailContent({
  isMobile,
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
  writingContext,
  currentSequenceIndex,
  writingSequence,
  progressTotal,
  progressCurrent,
  progressPercent,
  nextWriting,
  onSetComment,
  onToggleVoiceComment,
  onRestartVoiceComment,
  onRetryQuickFeedback,
  onRetrySupplementalFeedback,
  onSaveComment,
  onSaveAndBack,
  onSaveAndMoveNext,
}) {
  return (
    <>
      <TeacherWritingStatusBlocks
        isMobile={isMobile}
        message={message}
        writingId={writingId}
        loading={loading}
        writing={writing}
      />

      {!loading && writing ? (
        <>
          <WritingMetaSection
            isMobile={isMobile}
            writing={writing}
            feedbackStatusSummary={feedbackStatusSummary}
            jumpHighlight={jumpHighlight}
            writingContext={writingContext}
            currentSequenceIndex={currentSequenceIndex}
            writingSequence={writingSequence}
            progressTotal={progressTotal}
            progressCurrent={progressCurrent}
            progressPercent={progressPercent}
          />

          <WritingBodySection isMobile={isMobile} writing={writing} />

          <SurfaceCard>
            <div style={{ padding: isMobile ? "14px" : "16px 18px 18px" }}>
              <QuickFeedbackSection quickFeedback={feedback?.quickFeedback} />
              {feedback?.quickFeedback?.status === "failed" ? (
                <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                  <RetryFeedbackButton retrying={retryingQuickFeedback} onClick={onRetryQuickFeedback} label="重试快速反馈" />
                </div>
              ) : null}
            </div>
          </SurfaceCard>

          <TeacherCommentSection
            isMobile={isMobile}
            feedback={feedback}
            voiceSupported={voiceSupported}
            isVoiceListening={isVoiceListening}
            message={message}
            comment={comment}
            saving={saving}
            nextWriting={nextWriting}
            writingContext={writingContext}
            onSetComment={onSetComment}
            onToggleVoiceComment={onToggleVoiceComment}
            onRestartVoiceComment={onRestartVoiceComment}
            onSaveComment={onSaveComment}
            onSaveAndBack={onSaveAndBack}
            onSaveAndMoveNext={onSaveAndMoveNext}
          />

          {feedback?.supplementalFeedback?.status === "failed" ? (
            <SurfaceCard>
              <div style={{ padding: isMobile ? "14px" : "16px 18px", display: "grid", gap: 12 }}>
                <div style={{ fontSize: 14, lineHeight: 1.75, color: "#8b5e1a", fontWeight: 700 }}>
                  {formatSupplementalFailureReason(feedback.supplementalFeedback.errorMessage || feedback.supplementalFeedback.error)}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <RetryFeedbackButton retrying={retryingSupplementalFeedback} onClick={onRetrySupplementalFeedback} label="重试完整精批补齐" />
                </div>
              </div>
            </SurfaceCard>
          ) : null}

          {!hasSupplementalFeedbackState(feedback) ? (
            <DetailedFeedbackStatusSection isMobile={isMobile} feedback={feedback} writing={writing} />
          ) : null}
        </>
      ) : null}
    </>
  );
}
