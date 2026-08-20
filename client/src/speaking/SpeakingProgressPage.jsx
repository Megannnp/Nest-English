import { useCallback, useEffect, useState } from "react";

import { speakingAPI } from "../api/index.js";
import ModuleGrowthPage, { RecentRecordsList } from "../components/shared/ModuleGrowthPage.jsx";
import { formatModuleDuration, formatRecentRecordDate } from "../utils/format.js";
import "./speaking.css";

const ACTIONS = [
  { icon: "zap", title: "继续口语练习", desc: "选一道题目立即开口练习", page: "speaking" },
];

const ACTIVITY_LABELS = {
  conversation: "情景对话",
  opinion: "观点表达",
  story: "故事讲述",
  description: "描述表达",
  discussion: "讨论表达",
  reading_aloud: "朗读练习",
};

function buildMetrics(progress) {
  if (!progress?.sessions) return [];
  return [
    { label: "练习场次", value: progress.sessions, helper: "真实完成记录" },
    { label: "平均得分", value: `${progress.averageScore || 0}分`, helper: "按已记录练习" },
    { label: "训练时长", value: formatModuleDuration(progress.durationMs), helper: "来自已上报时长" },
  ];
}

function buildSkills(progress) {
  return (progress?.byActivity || []).slice(0, 5).map((item) => ({
    label: ACTIVITY_LABELS[item.activityType] || item.activityType,
    value: item.averageScore,
  }));
}

function resolveRecommendationTarget(progress) {
  const weakest = (progress?.byActivity || [])
    .filter((item) => item.averageScore != null)
    .sort((a, b) => Number(a.averageScore) - Number(b.averageScore))[0];
  return {
    activityType: weakest?.activityType || progress?.recent?.[0]?.activityType,
    score: Number(weakest?.averageScore ?? progress?.averageScore ?? 0),
  };
}

function buildRecommendation(progress) {
  const { activityType, score } = resolveRecommendationTarget(progress);
  const adviceByActivity = {
    reading_aloud: "下一步建议：换一道朗读题，重点控制停顿和重音。",
    conversation: "下一步建议：继续情景对话，用完整句回答并补充追问。",
  };
  return [
    !activityType && "先完成一次口语练习，系统会根据题型和得分推荐下一题。",
    score > 0 && score < 70 && "下一步建议：重练同题型，先扩展回答长度，再补一个具体例子。",
    adviceByActivity[activityType],
    "下一步建议：换一道观点表达题，按观点、理由、例子三步组织回答。",
  ].find(Boolean);
}

function renderRecentRecord(item) {
  return {
    key: item.id,
    tag: ACTIVITY_LABELS[item.activityType] || item.activityType,
    title: item.score != null ? `得分 ${item.score}` : "已完成练习",
    meta: `${formatRecentRecordDate(item.createdAt)} · ${formatModuleDuration(item.durationMs)}`,
  };
}

export default function SpeakingProgressPage({
  onNavigate,
  user,
  onLoginClick,
  onRegisterClick,
}) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const hasRealData = Boolean(user?.id && progress?.sessions > 0);

  const loadProgress = useCallback(() => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError("");
    speakingAPI.progress()
      .then((data) => {
        setProgress(data);
      })
      .catch((error) => {
        setProgress(null);
        setLoadError(error?.message || "口语成长数据加载失败，请稍后重试。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setProgress(null);
      setLoadError("");
      setLoading(false);
      return;
    }
    loadProgress();
  }, [user?.id, loadProgress]);

  return (
    <ModuleGrowthPage
      pageClass="sp-page"
      title="开口有记录，表达看得见进步。"
      subtitle="记录口语练习的得分、活跃题型和时长，形成可复盘的口语成长线。"
      user={user}
      onNavigate={onNavigate}
      onLoginClick={onLoginClick}
      onRegisterClick={onRegisterClick}
      metrics={buildMetrics(progress)}
      skills={buildSkills(progress)}
      actions={ACTIONS}
      dataLabel={hasRealData ? "实时记录" : "暂无记录"}
      dataConnected
      loading={loading}
      error={loadError}
      onRetry={loadProgress}
      emptyMessage="还没有真实口语练习记录。先完成一次口语练习，成长页会自动生成统计。"
    >
      <div className="module-growth-empty">
        {buildRecommendation(progress)}
      </div>
      <RecentRecordsList
        records={(progress?.recent || []).slice(0, 5)}
        actionLabel="继续练习"
        onAction={() => onNavigate?.(ACTIONS[0].page)}
        renderItem={renderRecentRecord}
      />
    </ModuleGrowthPage>
  );
}
