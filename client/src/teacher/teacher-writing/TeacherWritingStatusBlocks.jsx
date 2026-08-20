import { StatusBanner, SurfaceCard } from "../../components/shared/UI.jsx";

export default function TeacherWritingStatusBlocks({
  isMobile,
  message,
  writingId,
  loading,
  writing,
}) {
  return (
    <>
      {message ? (
        <StatusBanner tone={message.includes("失败") || message.includes("无法") ? "warning" : "success"}>
          {message}
        </StatusBanner>
      ) : null}

      {!writingId ? (
        <SurfaceCard style={{ padding: isMobile ? "16px 14px" : "18px 20px" }}>
          <div style={{ fontSize: 13, color: "#8a7d6e", lineHeight: 1.8 }}>
            当前还没有选中的作文。我们先回到工作台，从待批改、待评价或异常详情里点进具体作文。
          </div>
        </SurfaceCard>
      ) : null}

      {loading ? (
        <SurfaceCard style={{ padding: isMobile ? "16px 14px" : "18px 20px" }}>
          <div style={{ fontSize: 13, color: "#8a7d6e" }}>正在加载作文详情...</div>
        </SurfaceCard>
      ) : null}

      {!loading && writing ? null : null}
    </>
  );
}
