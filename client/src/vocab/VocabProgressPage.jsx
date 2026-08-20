import { useCallback, useEffect, useState } from "react";

import { vocabularyAPI } from "../api/index.js";
import ModuleGrowthPage, { RecentRecordsList } from "../components/shared/ModuleGrowthPage.jsx";
import "./vocab.css";

const PRACTICE_PAGE = "vocab-quiz";
const FAVORITE_PAGE = "vocab-analyzer";

const ACTIONS = [
  { icon: "zap", title: "开始词汇检测", desc: "选择题或闪卡检测掌握程度", page: PRACTICE_PAGE },
  { icon: "book-open", title: "补词汇精讲", desc: "词根词缀、语境推断和记忆策略", page: "vocab-courses" },
  { icon: "file-text", title: "管理词汇资源", desc: "查看和导入阅读、写作、替换词库", page: "vocab-resources" },
];

const ACTIVITY_LABELS = {
  flashcard: "闪卡复习",
  quiz: "词汇检测",
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
    { label: "记录次数", value: progress.sessions, helper: "真实完成记录" },
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

function renderRecentRecord(item) {
  return {
    key: item.id,
    tag: ACTIVITY_LABELS[item.activityType] || item.activityType,
    title: item.accuracy != null ? `准确率 ${item.accuracy}%` : (item.score != null ? `得分 ${item.score}` : "已完成练习"),
    meta: `${formatRecordDate(item.createdAt)} · ${formatDuration(item.durationMs)}`,
  };
}

function renderFavoriteWord(item) {
  return {
    key: item.id,
    tag: item.metadata?.pos || "词汇",
    title: item.content,
    meta: item.title || item.metadata?.zh || "",
  };
}

export default function VocabProgressPage({
  onNavigate,
  user,
  onLoginClick,
  onRegisterClick,
}) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [favorites, setFavorites] = useState([]);
  const hasRealData = Boolean(user?.id && progress?.sessions > 0);

  const loadProgress = useCallback(() => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError("");
    vocabularyAPI.progress()
      .then((data) => {
        setProgress(data);
      })
      .catch((error) => {
        setProgress(null);
        setLoadError(error?.message || "词汇成长数据加载失败，请稍后重试。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.id]);

  const loadFavorites = useCallback(() => {
    if (!user?.id) return;
    vocabularyAPI.favorites()
      .then((data) => setFavorites(Array.isArray(data) ? data : []))
      .catch(() => setFavorites([]));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setProgress(null);
      setLoadError("");
      setLoading(false);
      setFavorites([]);
      return;
    }
    loadProgress();
    loadFavorites();
  }, [user?.id, loadProgress, loadFavorites]);

  return (
    <ModuleGrowthPage
      pageClass="vc-page"
      title="词汇积累有路径，输出提升有证据。"
      subtitle="记录词汇检测和闪卡复习的表现，形成可复盘的词汇成长线。"
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
      emptyMessage="还没有真实词汇练习记录。完成一次词汇检测或闪卡复习，成长页会自动生成统计。"
    >
      <RecentRecordsList
        records={(progress?.recent || []).slice(0, 5)}
        actionLabel="继续练习"
        onAction={() => onNavigate?.(PRACTICE_PAGE)}
        renderItem={renderRecentRecord}
      />
      <RecentRecordsList
        title="收藏词汇"
        records={favorites.slice(0, 5)}
        actionLabel="去收藏更多"
        onAction={() => onNavigate?.(FAVORITE_PAGE)}
        renderItem={renderFavoriteWord}
      />
    </ModuleGrowthPage>
  );
}
