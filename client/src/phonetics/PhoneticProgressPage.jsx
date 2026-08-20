import { useCallback, useEffect, useState } from "react";

import { phoneticsAPI } from "../api/index.js";
import ModuleGrowthPage, { RecentRecordsList } from "../components/shared/ModuleGrowthPage.jsx";
import "./phonetics.css";

const ACTIONS = [
  { icon: "zap", title: "复习音素", desc: "校准元音、辅音和清浊对比", page: "phonetics-sound" },
  { icon: "book-open", title: "学习音节", desc: "理解音节总览和分类", page: "phonetics-syllable" },
  { icon: "pencil", title: "学习句子语音", desc: "练韵律和语流现象", page: "phonetics-sentence" },
];

const ACTIVITY_LABELS = {
  "sound-practice": "音素识别",
  "syllable-practice": "音节训练",
  "sentence-practice": "句子语流",
  "discourse-practice": "语篇语流",
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
    { label: "训练次数", value: progress.sessions, helper: "真实完成记录" },
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
  const activityType = weakest?.activityType || progress?.recent?.[0]?.activityType;
  if (!activityType) return "先完成一次音素练习，系统会根据最近记录推荐后续音节或句子训练。";
  if (activityType === "sound-practice") return "下一步建议：继续音素页，优先复听元音、辅音和清浊对比。";
  if (activityType === "syllable-practice") return "下一步建议：进入音节训练，把单词拆成重读和非重读音节。";
  if (activityType === "sentence-practice") return "下一步建议：练句子语音，重点处理重音、弱读和连读。";
  return "下一步建议：回到语篇语流，把长句按意群切分后再朗读。";
}

function renderRecentRecord(item) {
  return {
    key: item.id,
    tag: ACTIVITY_LABELS[item.activityType] || item.activityType,
    title: item.accuracy != null ? `准确率 ${item.accuracy}%` : (item.score != null ? `得分 ${item.score}` : "已完成练习"),
    meta: `${formatRecordDate(item.createdAt)} · ${formatDuration(item.durationMs)}`,
  };
}

export default function PhoneticProgressPage({
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
    phoneticsAPI.progress()
      .then((data) => {
        setProgress(data);
      })
      .catch((error) => {
        setProgress(null);
        setLoadError(error?.message || "语音成长数据加载失败，请稍后重试。");
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
      pageClass="ph-page"
      title="发音从音素到语流，成长一路可见。"
      subtitle="记录音素、音节、句子和语篇训练，形成可复盘的语音成长线。"
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
      emptyMessage="还没有真实语音练习记录。先完成一次音素、音节、句子或语篇训练，成长页会自动生成统计。"
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
