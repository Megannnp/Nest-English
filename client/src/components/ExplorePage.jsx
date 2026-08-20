import { useState } from "react";

import { ContactSection, FeedbackSection, TeamSection } from "./ExploreSections.jsx";
import { PageHeader } from "./shared/UI.jsx";
import { submitMessage } from "../api/announcements.js";
import useScrollReveal from "../hooks/useScrollReveal.js";

const FEEDBACK_TYPE_LABEL = {
  suggestion: "功能建议",
  bug: "问题反馈",
  content: "内容建议",
  other: "其他",
};

function buildExploreStyles(isMobile) {
  return {
    page: {
      maxWidth: 860,
      margin: "0 auto",
      padding: isMobile ? "24px 16px 48px" : "40px 24px 64px",
      display: "flex",
      flexDirection: "column",
      gap: 48,
    },
    sectionTitle: {
      fontSize: isMobile ? 18 : 20,
      fontWeight: 800,
      color: "#1a1a1a",
      marginBottom: 16,
      letterSpacing: "-0.3px",
    },
    card: {
      background: "#fafafa",
      border: "0.5px solid #e8e8e8",
      borderRadius: 12,
      padding: isMobile ? "18px 16px" : "22px 24px",
    },
    memberName: {
      fontSize: 15,
      fontWeight: 700,
      color: "#1a1a1a",
      marginBottom: 2,
    },
    memberNameLink: {
      color: "#1a1a1a",
      textDecoration: "underline",
      textUnderlineOffset: 4,
    },
    memberRole: {
      fontSize: 12,
      color: "#888",
      marginBottom: 8,
      fontWeight: 500,
    },
    memberBio: {
      fontSize: 13,
      color: "#555",
      lineHeight: 1.7,
    },
    resumeIntro: {
      marginBottom: 18,
    },
    resumeKicker: {
      fontSize: 12,
      color: "#888",
      fontWeight: 700,
      letterSpacing: 0,
      marginBottom: 14,
    },
    resumeHeadline: {
      fontSize: isMobile ? 22 : 28,
      lineHeight: 1.25,
      fontWeight: 900,
      color: "#1a1a1a",
      marginBottom: 16,
      letterSpacing: "-0.3px",
    },
    resumeMeta: {
      fontSize: isMobile ? 14 : 15,
      color: "#666",
      fontWeight: 600,
      lineHeight: 1.8,
    },
    resumeGrid: {
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
      gap: 14,
      marginTop: 18,
    },
    resumeBlock: {
      background: "#fff",
      border: "0.5px solid #ededed",
      borderRadius: 10,
      padding: "14px 16px",
    },
    resumeBlockTitle: {
      fontSize: 13,
      fontWeight: 800,
      color: "#1a1a1a",
      marginBottom: 10,
    },
    resumeList: {
      margin: 0,
      paddingLeft: 18,
      color: "#555",
      fontSize: 13,
      lineHeight: 1.8,
    },
    contactRow: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 0",
      borderBottom: "0.5px solid #f0f0f0",
    },
    contactLabel: {
      fontSize: 13,
      color: "#888",
      width: 40,
      flexShrink: 0,
    },
    contactValue: {
      fontSize: 13,
      color: "#1a1a1a",
      fontWeight: 500,
      textDecoration: "none",
    },
    label: {
      fontSize: 13,
      fontWeight: 600,
      color: "#555",
      marginBottom: 6,
      display: "block",
    },
    select: {
      width: "100%",
      padding: "8px 12px",
      border: "1px solid #e0e0e0",
      borderRadius: 8,
      fontSize: 14,
      color: "#1a1a1a",
      background: "#fff",
      marginBottom: 14,
      fontFamily: "inherit",
      outline: "none",
    },
    textarea: {
      width: "100%",
      padding: "10px 12px",
      border: "1px solid #e0e0e0",
      borderRadius: 8,
      fontSize: 14,
      color: "#1a1a1a",
      background: "#fff",
      minHeight: 100,
      resize: "vertical",
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box",
    },
    submitBtn: {
      marginTop: 12,
      padding: "9px 22px",
      background: "#1a1a1a",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: "inherit",
    },
    submitBtnDisabled: {
      opacity: 0.45,
      cursor: "not-allowed",
    },
    successBanner: {
      marginTop: 10,
      padding: "10px 14px",
      background: "#f0faf5",
      border: "0.5px solid #b7e4cf",
      borderRadius: 8,
      fontSize: 13,
      color: "#1a7a4a",
      fontWeight: 600,
    },
    errorBanner: {
      marginTop: 10,
      padding: "10px 14px",
      background: "#f5f5f5",
      border: "0.5px solid #d0d0d0",
      borderRadius: 8,
      fontSize: 13,
      color: "#333",
      fontWeight: 600,
    },
  };
}

export default function ExplorePage({ user, _user, isMobile, _onNavigate, resumeMode = false }) {
  const pageRef = useScrollReveal();
  const [form, setForm] = useState({ type: "suggestion", content: "" });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.content.trim()) return;
    if (!user && !_user) {
      setError("请先登录后提交反馈，或通过上方邮箱联系我们。");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitMessage(`[探索区/${FEEDBACK_TYPE_LABEL[form.type] || "其他"}] ${form.content.trim()}`);
      setSent(true);
      setForm({ type: "suggestion", content: "" });
      setTimeout(() => setSent(false), 4000);
    } catch (err) {
      setError(err.message || "提交失败，请稍后再试。");
    } finally {
      setSubmitting(false);
    }
  }

  const s = buildExploreStyles(isMobile);

  return (
    <div style={s.page} ref={pageRef}>
      {!resumeMode && (
        <PageHeader
          titleZh="探索"
          subtitle="了解筑巢英语团队，提出你的建议。"
          isMobile={isMobile}
        />
      )}

      {/* 学习营地模块暂时隐藏 */}

      <TeamSection resumeMode={resumeMode} styles={s} />
      {!resumeMode && <ContactSection styles={s} />}
      {!resumeMode && (
        <FeedbackSection
          styles={s}
          form={form}
          setForm={setForm}
          submitting={submitting}
          sent={sent}
          error={error}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
