import { useCallback, useEffect, useState } from "react";

import { listeningAPI } from "../api/index.js";
import ModuleGrowthPage, { RecentRecordsList } from "../components/shared/ModuleGrowthPage.jsx";
import "./listening.css";

const ACTIONS = [
  { icon: "zap", title: "继续基础听辨", desc: "补音素、词汇和短句听写", page: "listening-basics" },
  { icon: "book-open", title: "进入篇章精听", desc: "逐句拆解，核对错词漏词", page: "listening-advanced" },
  { icon: "file-text", title: "完成模拟练习", desc: "用题目检查真实理解", page: "listening-practice" },
];

const ACTIVITY_LABELS = {
  "basics-pair": "辨音准确",
  "basics-word": "词汇听写",
  "basics-sentence": "句子听写",
  "advanced-sentence": "篇章精听",
  practice: "模拟练习",
  "practice-dictation": "模拟听写",
};

function formatDuration(durationMs = 0) {
  const minutes = Math.round(Number(durationMs || 0) / 60000);
  return minutes > 0 ? `${minutes} 分钟` : "0 分钟";
}

function formatRecordDate(timestamp) {
  if (!timestamp) return "刚刚";
  return new Date(timestamp).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function buildMetrics(progress) {
  if (!progress?.sessions) return [];
  return [
    { label: "训练场次", value: progress.sessions, helper: "真实完成记录" },
    { label: "平均得分", value: `${progress.averageScore || 0}%`, helper: "按已记录练习" },
    { label: "平均准确率", value: `${progress.averageAccuracy || 0}%`, helper: "持续更新" },
    { label: "训练时长", value: formatDuration(progress.durationMs), helper: "来自已上报时长" },
  ];
}

function buildSkills(progress) {
  return (progress?.byActivity || []).slice(0, 5).map((item) => ({
    label: ACTIVITY_LABELS[item.activityType] || item.activityType,
    value: item.averageAccuracy,
  }));
}

function buildRecommendation(progress) {
  const weakest = (progress?.byActivity || [])
    .filter((item) => item.averageAccuracy != null)
    .sort((a, b) => Number(a.averageAccuracy) - Number(b.averageAccuracy))[0];
  const recent = progress?.recent?.[0];
  const activityType = weakest?.activityType || recent?.activityType;
  if (!activityType) return "先完成一次基础听辨，系统会根据错词和准确率推荐下一步。";
  if (activityType === "basics-pair") return "下一步建议：回到基础听辨，优先区分最容易混淆的音素对。";
  if (activityType === "basics-word") return "下一步建议：继续词汇听写，听前先预判词形，听后核对漏音。";
  if (activityType === "basics-sentence") return "下一步建议：做句子听写，重点检查弱读、连读和漏词。";
  if (activityType === "advanced-sentence") return "下一步建议：进入篇章精听，把低准确句子逐句复听。";
  return "下一步建议：完成一组模拟练习，再用听写模式复盘错题。";
}

function renderRecentRecord(item) {
  return {
    key: item.id,
    tag: ACTIVITY_LABELS[item.activityType] || item.activityType,
    title: item.accuracy != null ? `准确率 ${item.accuracy}%` : (item.score != null ? `得分 ${item.score}` : "已完成练习"),
    meta: `${formatRecordDate(item.createdAt)} · ${formatDuration(item.durationMs)}`,
  };
}

export default function ListeningProgressPage({
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
    listeningAPI.progress()
      .then((data) => {
        setProgress(data);
      })
      .catch((error) => {
        setProgress(null);
        setLoadError(error?.message || "听读成长数据加载失败，请稍后重试。");
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
      pageClass="ls-page"
      title="听得清楚，读得明白。"
      subtitle="沉淀基础听辨、篇章精听和模拟练习记录，让听读能力变化可见。"
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
      emptyMessage="还没有真实听读练习记录。先完成一次基础听辨、篇章精听或模拟练习，成长页会自动生成统计。"
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
