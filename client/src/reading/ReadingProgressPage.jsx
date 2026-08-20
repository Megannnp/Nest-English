import { useCallback, useEffect, useState } from "react";

import { readingAPI } from "../api/index.js";
import ModuleGrowthPage, { RecentRecordsList } from "../components/shared/ModuleGrowthPage.jsx";
import "./reading.css";

const DEMO_PROGRESS = {
  sessions: 12,
  passages: 28,
  analysesTotal: 4,
  courseCompleted: 6,
  accuracy: 82,
  wrongQuestions: 36,
  recentAverage: 84,
  skills: [
    { label: "主旨大意", value: 86 },
    { label: "细节理解", value: 90 },
    { label: "推理判断", value: 78 },
    { label: "词义猜测", value: 74 },
  ],
  genreStats: [
    { genre: "说明文", accuracy: 88, total: 12, sessions: 3 },
    { genre: "记叙文", accuracy: 76, total: 8, sessions: 2 },
  ],
  recentAnalyses: [
    { id: "demo-1", genre: "说明文", mainIdea: "科技改变学习方式", questionCount: 4, createdAt: Date.now() - 86400000 },
    { id: "demo-2", genre: "记叙文", mainIdea: "一次难忘的志愿服务", questionCount: 5, createdAt: Date.now() - 172800000 },
  ],
};

const EMPTY_PROGRESS = {
  sessions: 0,
  passages: 0,
  analysesTotal: 0,
  courseCompleted: 0,
  accuracy: 0,
  wrongQuestions: 0,
  recentAverage: 0,
  skills: [],
  genreStats: [],
  recentAnalyses: [],
  recentWrongs: [],
};

function formatDate(timestamp) {
  if (!timestamp) return "刚刚";
  return new Date(timestamp).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function buildProgressDisplayData(user, progress) {
  if (!user) return DEMO_PROGRESS;
  if (!progress) return EMPTY_PROGRESS;
  const recentScores = (progress.recent || [])
    .map((record) => Number(record.score))
    .filter((score) => Number.isFinite(score));
  const recentAverage = recentScores.length
    ? Math.round(recentScores.slice(0, 10).reduce((sum, score) => sum + score, 0) / Math.min(recentScores.length, 10))
    : 0;
  const skills = (progress.byType || [])
    .filter((item) => Number(item.total || 0) > 0)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 4)
    .map((item) => ({
      label: item.questionType,
      value: item.accuracy,
    }));
  return {
    sessions: progress.sessions,
    passages: progress.passages,
    analysesTotal: progress.analyses?.total || 0,
    courseCompleted: (progress.courseProgress?.nodes || []).filter((node) => node.status === "completed").length,
    accuracy: progress.accuracy,
    wrongQuestions: progress.wrongQuestions,
    recentAverage,
    skills,
    genreStats: progress.byGenre || [],
    recentAnalyses: progress.analyses?.recent || [],
    recentWrongs: (progress.recent || [])
      .flatMap((record) => (record.wrongItems || []).map((item) => ({
        ...item,
        recordId: record.id,
        createdAt: record.createdAt,
      })))
      .slice(0, 6),
  };
}

function buildMetrics(user, data) {
  return [
    { label: "练习场次", value: data.sessions, helper: user ? "真实记录" : "近 30 天" },
    { label: "完成篇章", value: data.passages, helper: "含真题与专项" },
    { label: "思维分析", value: data.analysesTotal, helper: "AI导图与解析" },
    { label: "精讲节点", value: data.courseCompleted, helper: "阅读课程进度" },
    { label: "综合正确率", value: `${data.accuracy}%`, helper: "持续更新" },
    { label: "近10次均分", value: `${data.recentAverage}%`, helper: "近期表现" },
  ];
}

export default function ReadingProgressPage({
  onNavigate,
  user,
  onLoginClick,
  onRegisterClick,
}) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [openError, setOpenError] = useState("");
  const data = buildProgressDisplayData(user, progress);
  const hasRealData = !user || !progress || data.sessions > 0 || data.passages > 0 || data.analysesTotal > 0 || data.courseCompleted > 0;

  const loadProgress = useCallback(() => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError("");
    readingAPI.practiceProgress()
      .then((res) => {
        setProgress(res);
      })
      .catch((error) => {
        setProgress(null);
        setLoadError(error?.message || "阅读成长数据加载失败，请稍后重试。");
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

  async function openAnalysis(record) {
    if (!record?.id) return;
    try {
      setOpenError("");
      const detail = await readingAPI.analysisDetail(record.id);
      sessionStorage.setItem("nestReadingAnalysisSeed", JSON.stringify(detail));
      onNavigate?.("reading-analyzer");
    } catch (error) {
      setOpenError(error?.message || "分析记录加载失败，请稍后重试。");
    }
  }

  function openWrongReview() {
    sessionStorage.setItem("nest_reading_practice_mode", "review");
    onNavigate?.("reading-practice");
  }

  return (
    <ModuleGrowthPage
      pageClass="rd-page"
      title="读有所获，进步有据。"
      subtitle="记录阅读练习、题型掌握和错因复盘，形成清晰的成长路径。"
      user={user}
      onNavigate={onNavigate}
      onLoginClick={onLoginClick}
      onRegisterClick={onRegisterClick}
      metrics={buildMetrics(user, data)}
      skills={data.skills.length ? data.skills : (!user ? DEMO_PROGRESS.skills : [])}
      actions={[
        { icon: "zap", title: "继续阅读练习", desc: "按题型即时训练", page: "reading-practice" },
        { icon: "book-open", title: "补阅读精讲", desc: "回到薄弱题型课程", page: "reading-courses" },
        { icon: "chart", title: "复盘阅读方法", desc: "回看分析记录和题卷表现", page: "reading-analyzer" },
      ]}
      dataLabel={user ? "实时记录" : "示例数据"}
      dataConnected
      loading={loading}
      error={loadError}
      onRetry={loadProgress}
      hasData={hasRealData}
      emptyMessage="还没有真实阅读练习记录。先完成一次阅读练习或分析，成长页会自动生成统计。"
    >
      {openError && (
        <div role="alert" style={{ margin: "0 0 12px", color: "#8a2a1a", fontSize: 13, fontWeight: 700 }}>
          {openError}
        </div>
      )}
      <RecentRecordsList
        title="文体掌握"
        records={data.genreStats}
        renderItem={(record) => ({
          key: record.genre,
          tag: record.genre || "文体",
          title: `正确率 ${record.accuracy ?? 0}%`,
          meta: `${record.sessions || 0} 次 · ${record.total || 0} 题`,
        })}
      />

      <RecentRecordsList
        title="最近阅读错题"
        records={data.recentWrongs}
        actionLabel="错题复练"
        onAction={openWrongReview}
        renderItem={(record, index) => ({
          key: `${record.recordId || "wrong"}-${record.passageId || index}-${record.questionIndex || index}`,
          tag: record.questionType || "错题",
          title: record.stem || "阅读错题",
          meta: `${formatDate(record.createdAt)} · 答案 ${record.answer || "—"}`,
          onClick: user ? openWrongReview : undefined,
        })}
      />

      <RecentRecordsList
        title="最近阅读思维记录"
        records={data.recentAnalyses}
        actionLabel="继续分析"
        onAction={() => onNavigate?.("reading-analyzer")}
        renderItem={(record) => ({
          key: record.id,
          tag: record.genre || "阅读分析",
          title: record.mainIdea || "已完成阅读思维分析",
          meta: `${formatDate(record.createdAt)} · ${record.questionCount || 0} 题`,
          onClick: user ? () => openAnalysis(record) : undefined,
        })}
      />
    </ModuleGrowthPage>
  );
}
