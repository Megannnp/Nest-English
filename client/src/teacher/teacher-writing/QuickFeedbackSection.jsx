import QuickFeedbackCategories from "./QuickFeedbackCategories.jsx";
import QuickFeedbackGrammarIssues from "./QuickFeedbackGrammarIssues.jsx";
import QuickFeedbackHighlights from "./QuickFeedbackHighlights.jsx";
import QuickFeedbackMetrics from "./QuickFeedbackMetrics.jsx";
import QuickFeedbackRiskFlags from "./QuickFeedbackRiskFlags.jsx";
import { StatusBanner } from "../../components/shared/UI.jsx";

export default function QuickFeedbackSection({ quickFeedback }) {
  const result = quickFeedback?.result;
  if (!result) {
    return (
      <StatusBanner tone="warning">
        当前还没有可用的 AI 快速反馈，建议先回到工作台确认这篇作文是否仍在处理队列中。
      </StatusBanner>
    );
  }

  const totalScore = Number(result.totalScore ?? 0);
  const maxScore = Number(result.maxScore ?? 0);
  const scoreRatio = maxScore > 0 ? totalScore / maxScore : 0;
  const mainProblems = Array.isArray(result.mainProblems) ? result.mainProblems : (Array.isArray(result.weaknesses) ? result.weaknesses : []);
  const nextActions = Array.isArray(result.nextActions)
    ? result.nextActions
    : (Array.isArray(result.improvements)
      ? result.improvements.map((item) => (typeof item === "string" ? item : (item?.detail || item?.title || ""))).filter(Boolean)
      : []);
  const quickText = [
    result.summary,
    ...mainProblems,
  ]
    .filter(Boolean)
    .join(" ");
  const isOffTopic = /偏题|跑题|离题/.test(quickText);
  const isHighRisk = isOffTopic || (maxScore > 0 && scoreRatio < 0.6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <QuickFeedbackRiskFlags isHighRisk={isHighRisk} isOffTopic={isOffTopic} />
      <QuickFeedbackMetrics result={result} />

      {result.summary ? (
        <StatusBanner tone="neutral">{result.summary}</StatusBanner>
      ) : null}

      <QuickFeedbackGrammarIssues issues={mainProblems} title="主要问题" />
      <QuickFeedbackGrammarIssues issues={nextActions} title="下一步先改什么" />
      <QuickFeedbackCategories categories={result.categories} />
      <QuickFeedbackHighlights highlights={result.highlights} />
    </div>
  );
}
