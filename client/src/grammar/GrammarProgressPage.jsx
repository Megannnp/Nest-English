import { useState, useEffect, useCallback } from "react";

import { GRAMMAR_TREE } from "./grammarTree.js";
import { grammarAPI } from "../api/index.js";
import AppIcon from "../components/shared/AppIcon.jsx";
import ModuleGrowthPage from "../components/shared/ModuleGrowthPage.jsx";
import "./grammar.css";

function _countLeafNodes(nodes) {
  let count = 0;
  for (const node of nodes) {
    if (node.children?.length) {
      count += _countLeafNodes(node.children);
    } else if (node.hasContent) {
      count += 1;
    }
  }
  return count;
}

function _findNodeById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = _findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

const TOTAL_LEAF_NODES = _countLeafNodes(GRAMMAR_TREE);

// ── Demo data shown to guests ─────────────────────────────────────
const DEMO_STATS = {
  sessions: 18,
  totalQuestions: 120,
  correctQuestions: 96,
  byPoint: [
    { grammarPoint: "定语从句", total: 30, correct: 26 },
    { grammarPoint: "虚拟语气", total: 25, correct: 18 },
    { grammarPoint: "非谓语动词", total: 35, correct: 30 },
    { grammarPoint: "时态与语态", total: 30, correct: 22 },
  ],
};

function buildMetrics({ sessions, totalQuestions, correctQuestions }, courseCompletedCount) {
  const rate = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
  const metrics = [
    { label: "练习场次", value: sessions, helper: "累计练习次数" },
    { label: "总题数", value: totalQuestions, helper: "已完成题目总数" },
    { label: "正确率", value: `${rate}%`, helper: `${correctQuestions} 题正确` },
  ];
  if (courseCompletedCount != null) {
    metrics.push({ label: "精讲进度", value: `${courseCompletedCount}/${TOTAL_LEAF_NODES}`, helper: "已完成课程节点" });
  }
  return metrics;
}

function hasGrammarGrowthData({ user, stats, displayStats, courseCompletedCount }) {
  if (!user || !stats) return true;
  return displayStats.sessions > 0 || displayStats.totalQuestions > 0 || Number(courseCompletedCount || 0) > 0;
}

// ── 可展开板块 ────────────────────────────────────────────────
function ExpandableBlock({ icon, title, summary, children, onNavigate, navTarget }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`gp-block ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="gp-block__header"
        onClick={() => setOpen(v => !v)}
      >
        <span className="gp-block__icon">{icon}</span>
        <div className="gp-block__info">
          <span className="gp-block__title">{title}</span>
          <span className="gp-block__summary">{summary}</span>
        </div>
        <span className="gp-block__arrow">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div className="gp-block__body">
          {children}
          {navTarget && (
            <button
              type="button"
              className="gp-block__nav-btn"
              onClick={() => onNavigate?.(navTarget)}
            >
              前往查看 →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text, actionLabel, onAction }) {
  return (
    <div className="gp-coming-soon">
      <span className="gp-coming-soon__icon"><AppIcon name="clock" size={20} /></span>
      <p>{text}</p>
      {actionLabel && (
        <button type="button" className="gp-block__nav-btn" aria-label={actionLabel} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function ErrorState({ text, onRetry }) {
  return (
    <div className="gp-coming-soon" role="alert">
      <span className="gp-coming-soon__icon"><AppIcon name="alert" size={20} /></span>
      <p>{text}</p>
      <button type="button" className="gp-block__nav-btn" onClick={onRetry}>重新加载</button>
    </div>
  );
}

function CourseProgressContent({ courseProgress, onNavigate }) {
  const completedNodes = (courseProgress?.nodes || []).filter(n => n.status === 'completed');
  const completedCount = completedNodes.length;

  if (completedCount === 0) {
    return (
      <EmptyState
        text="暂无课程进度记录。可以先从语法课程进入系统学习。"
        actionLabel="进入语法课程 →"
        onAction={() => onNavigate?.("grammar-courses")}
      />
    );
  }

  const pct = Math.round((completedCount / TOTAL_LEAF_NODES) * 100);
  const recentNodes = [...completedNodes]
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 5);

  return (
    <>
      <div className="gp-quiz-stats">
        <div className="gp-quiz-stat">
          <span className="gp-quiz-stat__num">{completedCount}</span>
          <span className="gp-quiz-stat__label">已完成节点</span>
        </div>
        <div className="gp-quiz-stat">
          <span className="gp-quiz-stat__num">{TOTAL_LEAF_NODES}</span>
          <span className="gp-quiz-stat__label">全部节点</span>
        </div>
        <div className="gp-quiz-stat">
          <span className="gp-quiz-stat__num">{pct}%</span>
          <span className="gp-quiz-stat__label">完成率</span>
        </div>
      </div>
      <div className="gc-progress-bar-wrap" style={{ margin: "8px 0 12px" }}>
        <div className="gc-progress-bar">
          <div className="gc-progress-bar__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="gc-progress-bar__label">{completedCount} / {TOTAL_LEAF_NODES} · {pct}%</span>
      </div>
      {recentNodes.length > 0 && (
        <div className="gp-quiz-bypoint">
          <p className="gp-quiz-bypoint__title">最近完成的知识点</p>
          {recentNodes.map(n => {
            const node = _findNodeById(GRAMMAR_TREE, n.nodeId);
            if (!node) return null;
            return (
              <div key={n.nodeId} className="gp-quiz-bypoint__row">
                <span className="gp-quiz-bypoint__name">{node.title}</span>
                {n.quizTotal > 0 && (
                  <span className="gp-quiz-bypoint__detail">
                    {n.quizCorrect} / {n.quizTotal} 题正确
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function QuizStatsBlock({ stats, onNavigate }) {
  const { sessions, totalQuestions, correctQuestions, byPoint } = stats;
  const rate = totalQuestions > 0 ? Math.round((correctQuestions / totalQuestions) * 100) : 0;
  const weakPoints = [...(byPoint || [])].sort((a, b) => {
    const aRate = a.total > 0 ? a.correct / a.total : 1;
    const bRate = b.total > 0 ? b.correct / b.total : 1;
    return aRate - bRate || b.total - a.total;
  });

  function startWeakPointPractice(point) {
    try {
      sessionStorage.setItem("nestGrammarQuizSeed", JSON.stringify({ grammarPointLabel: point.grammarPoint }));
    } catch {
      // Ignore storage failures; navigation still opens the quiz setup.
    }
    onNavigate?.("grammar-quiz");
  }

  return (
    <ExpandableBlock
      icon={<AppIcon name="pencil" size={20} />}
      title="练习题库"
      summary={sessions > 0
        ? `已完成 ${totalQuestions} 题 · 正确率 ${rate}%`
        : "暂无练习记录"}
      onNavigate={onNavigate}
      navTarget="grammar-quiz"
    >
      {sessions > 0 ? (
        <>
          <div className="gp-quiz-stats">
            <div className="gp-quiz-stat">
              <span className="gp-quiz-stat__num">{totalQuestions}</span>
              <span className="gp-quiz-stat__label">已完成</span>
            </div>
            <div className="gp-quiz-stat">
              <span className="gp-quiz-stat__num">{correctQuestions}</span>
              <span className="gp-quiz-stat__label">答对</span>
            </div>
            <div className="gp-quiz-stat">
              <span className="gp-quiz-stat__num">{rate}%</span>
              <span className="gp-quiz-stat__label">正确率</span>
            </div>
          </div>
          {weakPoints.length > 0 && (
            <div className="gp-quiz-bypoint">
              <p className="gp-quiz-bypoint__title">优先复练的薄弱语法点</p>
              {weakPoints.slice(0, 5).map((p) => (
                <div key={p.grammarPoint} className="gp-quiz-bypoint__row">
                  <span className="gp-quiz-bypoint__name">{p.grammarPoint}</span>
                  <span className="gp-quiz-bypoint__detail">
                    {p.total} 题 · {p.total > 0 ? Math.round((p.correct / p.total) * 100) : 0}% 正确
                  </span>
                  <button
                    type="button"
                    className="gp-quiz-bypoint__action"
                    onClick={() => startWeakPointPractice(p)}
                  >
                    复练
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState text="暂无练习记录。完成在线练习后，正确率和薄弱语法点会自动汇总到这里。" />
      )}
      <button
        type="button"
        className="gp-block__nav-btn"
        onClick={() => onNavigate?.("grammar-quiz")}
      >
        去做练习 →
      </button>
    </ExpandableBlock>
  );
}

function FavoriteSentenceList({ favorites, onNavigate }) {
  if (!favorites?.length) {
    return (
      <EmptyState
        text="暂无收藏内容。可以先分析长难句，把重点句子沉淀为复习材料。"
        actionLabel="去分析句子 →"
        onAction={() => onNavigate?.("grammar-analyzer")}
      />
    );
  }
  return (
    <div className="gp-quiz-bypoint">
      <p className="gp-quiz-bypoint__title">最近收藏</p>
      {favorites.slice(0, 5).map((item) => (
        <div key={item.id} className="gp-quiz-bypoint__row">
          <span className="gp-quiz-bypoint__name">{item.content}</span>
          <span className="gp-quiz-bypoint__detail">{item.metadata?.sentenceType || item.title || "长难句"}</span>
        </div>
      ))}
    </div>
  );
}

const EMPTY_STATS = { sessions: 0, totalQuestions: 0, correctQuestions: 0, byPoint: [] };

// ── 主页面 ──────────────────────────────────────────────────
export default function GrammarProgressPage({
  onNavigate, user, onLoginClick,
}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [courseProgress, setCourseProgress] = useState(null);
  const [courseProgressError, setCourseProgressError] = useState("");
  const [favorites, setFavorites] = useState([]);
  const [favoritesError, setFavoritesError] = useState("");

  const loadProgress = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError("");
    try {
      const progress = await grammarAPI.progress();
      setStats(progress || EMPTY_STATS);
    } catch (error) {
      setStats(null);
      setLoadError(error?.message || "练习数据加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadCourseProgress = useCallback(() => {
    if (!user) return;
    setCourseProgressError("");
    grammarAPI.courseProgress().then(data => {
      setCourseProgress(data || null);
    }).catch((error) => {
      setCourseProgress(null);
      setCourseProgressError(error?.message || "语法精讲进度加载失败，请稍后重试。");
    });
  }, [user]);

  const loadFavorites = useCallback(() => {
    if (!user) return;
    setFavoritesError("");
    grammarAPI.favorites().then(data => {
      setFavorites(Array.isArray(data) ? data : []);
    }).catch((error) => {
      setFavorites([]);
      setFavoritesError(error?.message || "长难句收藏加载失败，请稍后重试。");
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      setStats(null);
      setLoadError("");
      setLoading(false);
      setCourseProgress(null);
      setCourseProgressError("");
      setFavorites([]);
      setFavoritesError("");
      return;
    }
    void loadProgress();
    loadCourseProgress();
    loadFavorites();
  }, [user, loadProgress, loadCourseProgress, loadFavorites]);

  // Guests see demo data; logged-in users see real data.
  const displayStats = user ? (stats || EMPTY_STATS) : DEMO_STATS;
  const courseCompletedCount = user
    ? (courseProgressError ? null : (courseProgress?.nodes || []).filter(n => n.status === 'completed').length)
    : null;
  const hasRealData = hasGrammarGrowthData({ user, stats, displayStats, courseCompletedCount });

  // Single login handler — always uses the grammar purple modal, never the auth page.
  const handleLoginClick = onLoginClick || (() => onNavigate?.("grammar-analyzer"));

  return (
    <ModuleGrowthPage
      pageClass="gm-page"
      title="一题一进，轨迹可见。"
      subtitle="每一次练习都留有印记，成长清晰可循。"
      user={user}
      onNavigate={onNavigate}
      onLoginClick={handleLoginClick}
      metrics={buildMetrics(displayStats, courseCompletedCount)}
      dataLabel={user ? "实时记录" : "示例数据"}
      dataConnected
      loading={loading}
      error={loadError}
      onRetry={() => void loadProgress()}
      hasData={hasRealData}
      emptyMessage="还没有真实练习数据。完成一次在线练习后，成长页会自动生成统计。"
    >
      <div className="gp-blocks">

        <ExpandableBlock
          icon={<AppIcon name="book-open" size={20} />}
          title="语法精讲进度"
          summary={(() => {
            if (courseProgressError) return "加载失败，点击展开重试";
            const n = (courseProgress?.nodes || []).filter(n => n.status === 'completed').length;
            return n > 0 ? `已完成 ${n} / ${TOTAL_LEAF_NODES} 节点` : "按课程节点整理学习轨迹";
          })()}
          onNavigate={onNavigate}
          navTarget="grammar-courses"
        >
          {courseProgressError ? (
            <ErrorState text={courseProgressError} onRetry={loadCourseProgress} />
          ) : (
            <CourseProgressContent courseProgress={courseProgress} onNavigate={onNavigate} />
          )}
        </ExpandableBlock>

        <ExpandableBlock
          icon={<AppIcon name="bookmark" size={20} />}
          title="长难句收藏"
          summary={favoritesError ? "加载失败，点击展开重试" : "沉淀重点句子和分析结果"}
          onNavigate={onNavigate}
          navTarget="grammar-analyzer"
        >
          {favoritesError ? (
            <ErrorState text={favoritesError} onRetry={loadFavorites} />
          ) : (
            <FavoriteSentenceList favorites={favorites} onNavigate={onNavigate} />
          )}
        </ExpandableBlock>

        <QuizStatsBlock stats={displayStats} onNavigate={onNavigate} />

      </div>
    </ModuleGrowthPage>
  );
}
