import AppIcon from "../../components/shared/AppIcon.jsx";
import {
  SmallActionButton,
  SurfaceCard,
  SurfaceHeader,
} from "../../components/shared/UI.jsx";

function ActionButtonRow({ saving, writingContext, nextWriting, onSaveComment, onSaveAndBack, onSaveAndMoveNext }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <SmallActionButton tone="primary" disabled={saving} onClick={onSaveComment}>
        {saving ? "保存中..." : "保存评价"}
      </SmallActionButton>
      {writingContext?.sourceLabel ? (
        <SmallActionButton tone="soft" disabled={saving} onClick={onSaveAndBack}>
          {saving ? "处理中..." : "处理完成，返回原队列"}
        </SmallActionButton>
      ) : null}
      <SmallActionButton tone="soft" disabled={saving} onClick={onSaveAndMoveNext}>
        {saving ? "处理中..." : nextWriting ? "处理完成，下一篇" : "处理完成"}
      </SmallActionButton>
    </div>
  );
}

export default function TeacherCommentSection({
  isMobile,
  feedback,
  voiceSupported,
  isVoiceListening,
  _message,
  comment,
  saving,
  nextWriting,
  writingContext,
  onSetComment,
  onToggleVoiceComment,
  onRestartVoiceComment,
  onSaveComment,
  onSaveAndBack,
  onSaveAndMoveNext,
}) {
  return (
    <SurfaceCard>
      <SurfaceHeader
        title="教师评价"
        badge={feedback?.teacherComment?.status === "ready" ? "已保存" : "待补充"}
        isMobile={isMobile}
      />
      <div style={{ padding: isMobile ? "14px" : "16px 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 12, color: "#8a7d6e", lineHeight: 1.7 }}>
            这里保存的是文字备注。你可以直接输入，也可以点麦克风把语音自动转成文字后再润色。
          </div>
          {voiceSupported ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={onToggleVoiceComment}
                style={{
                  fontSize: 16,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 4px",
                  borderRadius: 6,
                  color: isVoiceListening ? "#2d9e6b" : "#a09080",
                  lineHeight: 1,
                }}
                title={isVoiceListening ? "暂停语音输入" : "开始语音输入"}
              >
                <AppIcon name="mic" size={15} />
              </button>
              {isVoiceListening ? (
                <>
                  <button
                    type="button"
                    onClick={onToggleVoiceComment}
                    style={{ fontSize: 11, background: "transparent", border: "none", cursor: "pointer", padding: 0, color: "#8a7d6e", fontWeight: 600 }}
                  >
                    暂停
                  </button>
                  <button
                    type="button"
                    onClick={onRestartVoiceComment}
                    style={{ fontSize: 11, background: "transparent", border: "none", cursor: "pointer", padding: 0, color: "#8a7d6e", fontWeight: 600 }}
                  >
                    重录
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
        {isVoiceListening ? (
          <div
            style={{
              border: "1px solid #b7e4cd",
              background: "#f0fdf4",
              color: "#166534",
              borderRadius: 12,
              padding: "10px 12px",
              fontSize: 12,
              lineHeight: 1.7,
            }}
          >
            正在录音并实时转文字。录完后会自动写入下面的「文字备注（语音识别）」输入框。
          </div>
        ) : null}
        <textarea
          aria-label="教师文字备注"
          value={comment}
          onChange={(event) => onSetComment(event.target.value)}
          placeholder="写下你希望学生立刻知道的提醒、鼓励或下一步改进方向。"
          rows={isMobile ? 6 : 7}
          style={{
            width: "100%",
            border: "1px solid #e7dbcf",
            borderRadius: 14,
            background: "#faf8f5",
            color: "#2a1f14",
            fontSize: 14,
            padding: "12px 14px",
            outline: "none",
            boxSizing: "border-box",
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#8a7d6e", lineHeight: 1.7 }}>
            学生会在任务反馈页和记录页看到这里的文字备注（语音识别后也会保存在这里），建议尽量更有教学性，而不是重复 AI 总评。
          </div>
          <ActionButtonRow
            saving={saving}
            writingContext={writingContext}
            nextWriting={nextWriting}
            onSaveComment={onSaveComment}
            onSaveAndBack={onSaveAndBack}
            onSaveAndMoveNext={onSaveAndMoveNext}
          />
        </div>
      </div>
    </SurfaceCard>
  );
}
