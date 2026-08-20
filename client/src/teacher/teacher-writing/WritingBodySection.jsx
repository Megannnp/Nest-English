import { SurfaceCard, SurfaceHeader } from "../../components/shared/UI.jsx";

export default function WritingBodySection({ isMobile, writing }) {
  return (
    <SurfaceCard>
      <SurfaceHeader title="作文原文" isMobile={isMobile} />
      <div style={{ padding: isMobile ? "14px" : "16px 18px 18px" }}>
        <div
          style={{
            border: "1px solid #ece6de",
            borderRadius: 14,
            background: "#faf8f5",
            padding: "14px 16px",
            fontSize: 14,
            color: "#2a1f14",
            lineHeight: 1.9,
            whiteSpace: "pre-wrap",
          }}
        >
          {writing.fullText || writing.textSnippet || "暂未读取到作文内容"}
        </div>
      </div>
    </SurfaceCard>
  );
}
