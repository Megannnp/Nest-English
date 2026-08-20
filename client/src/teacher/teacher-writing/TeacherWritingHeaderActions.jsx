import { BackHomeButton, SmallActionButton } from "../../components/shared/UI.jsx";

export default function TeacherWritingHeaderActions({
  isMobile,
  onBackToWorkbench,
  previousWriting,
  nextWriting,
  writingContext,
  onOpenWriting,
  onOpenClassContext,
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: isMobile ? "stretch" : "flex-end" }}>
      <BackHomeButton onClick={onBackToWorkbench} isMobile={isMobile} label="返回工作台" style={isMobile ? { width: "100%" } : undefined} />
      {previousWriting ? (
        <SmallActionButton
          onClick={() => onOpenWriting?.({
            ...writingContext,
            writingId: previousWriting.writingId,
            classId: previousWriting.classId || writingContext?.classId,
            tab: previousWriting.tab || writingContext?.tab || "teacher_pending",
          })}
          style={isMobile ? { width: "100%" } : undefined}
        >
          上一篇待处理
        </SmallActionButton>
      ) : null}
      {nextWriting ? (
        <SmallActionButton
          onClick={() => onOpenWriting?.({
            ...writingContext,
            writingId: nextWriting.writingId,
            classId: nextWriting.classId || writingContext?.classId,
            tab: nextWriting.tab || writingContext?.tab || "teacher_pending",
          })}
          style={isMobile ? { width: "100%" } : undefined}
        >
          下一篇待处理
        </SmallActionButton>
      ) : null}
      {writingContext?.classId ? (
        <SmallActionButton
          tone="soft"
          onClick={() => onOpenClassContext?.({
            classId: writingContext.classId,
            writingId: writingContext?.writingId,
            tab: writingContext?.tab || "teacher_pending",
          })}
          style={isMobile ? { width: "100%" } : undefined}
        >
          查看班级上下文
        </SmallActionButton>
      ) : null}
    </div>
  );
}
