import { useState, useEffect, useCallback } from 'react';


import AnalyticsPanel from './records/AnalyticsPanel.jsx';
import useWritingRecordsModel from './records/useWritingRecordsModel.js';
import WritingFeedbackModal from './records/WritingFeedbackModal.jsx';
import WritingRecordsPanel from './records/WritingRecordsPanel.jsx';
import { writingProgressAPI } from '../api/index.js';
import AppIcon from '../components/shared/AppIcon.jsx';
import ModuleGrowthPage from '../components/shared/ModuleGrowthPage.jsx';
import './writing.css';

// ── Demo 数据（未登录展示用，与语法成长页保持同一模式）──────
const DEMO_DATA = {
  totalWritings: 12,
  writingsWithFeedback: 9,
  averageScore: 73.5,
};

const EMPTY_DATA = { totalWritings: 0, writingsWithFeedback: 0, averageScore: 0 };
const DEFAULT_STRUCTURE_PROGRESS = [
  { typeId: "argumentative", label: "议论文", completed: 0, total: 3, percent: 0 },
  { typeId: "narrative", label: "记叙文 / 读后续写", completed: 0, total: 3, percent: 0 },
  { typeId: "applied", label: "应用文", completed: 0, total: 2, percent: 0 },
  { typeId: "summary", label: "概要写作", completed: 0, total: 2, percent: 0 },
  { typeId: "speech", label: "演讲稿", completed: 0, total: 2, percent: 0 },
  { typeId: "expository", label: "说明文", completed: 0, total: 2, percent: 0 },
];

function buildMetrics({ totalWritings, writingsWithFeedback, averageScore }) {
  return [
    { label: "累计投稿", value: totalWritings, helper: "全部提交篇数" },
    { label: "已批改", value: writingsWithFeedback, helper: "获得反馈的篇数" },
    { label: "平均分", value: averageScore > 0 ? averageScore : "—", helper: "已批改作文均分" },
  ];
}

function hasWritingGrowthData({ user, progressStats, displayStats }) {
  if (!user || !progressStats) return true;
  return displayStats.totalWritings > 0 || displayStats.writingsWithFeedback > 0;
}

// ── 可展开板块 ────────────────────────────────────────────────
function ExpandableBlock({ icon, title, summary, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`wp-block ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="wp-block__header"
        onClick={() => setOpen(v => !v)}
      >
        <span className="wp-block__icon">{icon}</span>
        <div className="wp-block__info">
          <span className="wp-block__title">{title}</span>
          <span className="wp-block__summary">{summary}</span>
        </div>
        <span className="wp-block__arrow">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="wp-block__body">
          {children}
        </div>
      )}
    </div>
  );
}

// ── 空状态 ────────────────────────────────────────────────────
function EmptyState({ text, actionLabel, onAction }) {
  return (
    <div className="wp-coming-soon">
      <span className="wp-coming-soon__icon"><AppIcon name="clock" size={20} /></span>
      <p>{text}</p>
      {actionLabel && (
        <button type="button" className="gm-btn-secondary" aria-label={actionLabel} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// ── 分区标题 ──────────────────────────────────────────────────
function SectionHeading({ title }) {
  return (
    <h2 className="wp-section-heading">{title}</h2>
  );
}

function WritingRecordsSection({ disabled, isMobile, listError, modelActions, modelState, onRetry }) {
  return (
    <div className="wp-blocks studio-reveal studio-reveal--delay-1" style={disabled ? { opacity: 0.45, pointerEvents: "none", userSelect: "none" } : undefined}>
      <SectionHeading title="写作批改" />

      {listError ? (
        <div className="wp-inline-alert" role="alert">
          <p>{listError}</p>
          <button type="button" className="gm-btn-secondary" onClick={onRetry}>
            重新加载
          </button>
        </div>
      ) : null}

      <WritingRecordsPanel modelState={modelState} modelActions={modelActions} isMobile={isMobile} />
    </div>
  );
}

function FavoriteSentenceList({ favorites, onNavigate }) {
  if (!favorites?.length) {
    return (
      <EmptyState
        text="暂无收藏句子。可以先进行句子润色，把有价值的表达整理到写作素材中。"
        actionLabel="去句子润色"
        onAction={() => onNavigate?.("writing-refine-sentence")}
      />
    );
  }
  return (
    <div className="wp-records-list">
      {favorites.map((item) => (
        <div key={item.id} className="wp-record-item" style={{ cursor: "default" }}>
          <div className="wp-record-item__left">
            <span className="wp-record-item__title">{item.content}</span>
            <span className="wp-record-item__date">
              {item.createdAt ? `${new Date(item.createdAt).toLocaleDateString("zh-CN")} · ` : ""}
              {item.metadata?.difficulty || "练习句"}
              {item.metadata?.original ? ` · 原句：${item.metadata.original}` : ""}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function WritingPracticeSection({ disabled, favorites, onNavigate, structureProgress = DEFAULT_STRUCTURE_PROGRESS }) {
  return (
    <div className="wp-blocks studio-reveal studio-reveal--delay-2" style={disabled ? { opacity: 0.45, pointerEvents: "none", userSelect: "none" } : undefined}>
      <SectionHeading title="写作实战" />

      <ExpandableBlock
        icon={<AppIcon name="layers" size={20} />}
        title="写作建构进度"
        summary="6 个文体的学习进度"
      >
        <div className="wp-structure-list">
          {structureProgress.map((item) => (
            <div key={item.typeId || item.label} className="wp-structure-item">
              <span className="wp-structure-item__title">{item.label}</span>
              <span className="wp-structure-item__status">
                {item.completed > 0 ? `${item.completed}/${item.total} · ${item.percent}%` : "暂无记录"}
              </span>
            </div>
          ))}
        </div>
        <EmptyState
          text="文体建构学习记录会随课程和练习逐步沉淀。"
          actionLabel="进入写作建构"
          onAction={() => onNavigate?.("writing-refine-structure")}
        />
      </ExpandableBlock>

      <ExpandableBlock
        icon={<AppIcon name="bookmark" size={20} />}
        title="收藏的句子"
        summary={favorites?.length ? `${favorites.length} 个收藏句` : "收藏的AI润色句列表"}
      >
        <FavoriteSentenceList favorites={favorites} onNavigate={onNavigate} />
      </ExpandableBlock>

    </div>
  );
}

// ── 主页面 ──────────────────────────────────────────────────
export default function WritingProgressPage({
  user,
  myWritings = [],
  isMobile = false,
  initialViewingWritingId = "",
  onViewedWritingChange,
  onNavigate,
  onLoginClick,
}) {
  const handleWriteNextDraft = useCallback((sourceWriting) => {
    onNavigate?.("writing", {
      nextDraftFrom: {
        versionOfWritingId: sourceWriting.id,
        fullText: sourceWriting.fullText || '',
        writingTitle: sourceWriting.writingTitle || '',
        promptText: sourceWriting.promptText || '',
        selectedType: sourceWriting.selectedType || '',
      },
    });
  }, [onNavigate]);

  const { state, actions } = useWritingRecordsModel({
    myWritings,
    initialViewingWritingId,
    onViewedWritingChange,
    onWriteNextDraft: handleWriteNextDraft,
    enabled: !!user,   // guests must not fire authenticated list() requests
  });
  const { detailWriting, listError } = state;
  const { setDetailWriting } = actions;

  const [progressStats, setProgressStats] = useState(null);
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [favoriteSentences, setFavoriteSentences] = useState([]);

  const loadProgressStats = useCallback(async () => {
    if (!user) return;
    setProgressLoading(true);
    setProgressError("");
    try {
      const res = await writingProgressAPI.progress();
      setProgressStats(res?.data || EMPTY_DATA);
    } catch (error) {
      setProgressStats(null);
      setProgressError(error?.message || "写作数据加载失败，请稍后重试。");
    } finally {
      setProgressLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProgressStats(null);
      setFavoriteSentences([]);
      setProgressError("");
      setProgressLoading(false);
      return;
    }
    void loadProgressStats();
    writingProgressAPI.favorites(50).then((data) => {
      setFavoriteSentences(Array.isArray(data) ? data : []);
    }).catch(() => setFavoriteSentences([]));
  }, [user, loadProgressStats]);

  // Guests see demo data; logged-in users see real data.
  const displayStats = user ? (progressStats || EMPTY_DATA) : DEMO_DATA;
  const hasRealData = hasWritingGrowthData({ user, progressStats, displayStats });
  const structureProgress = progressStats?.structureProgress?.length ? progressStats.structureProgress : DEFAULT_STRUCTURE_PROGRESS;
  const recordsDisabled = !user;
  const practiceDisabled = !user || Boolean(progressError) || Boolean(listError);

  const handleLoginClick = onLoginClick || (() => onNavigate?.("writing"));

  return (
    <>
      <ModuleGrowthPage
        pageClass="writing-studio-shell"
        title="落笔有迹，成长可见。"
        subtitle="记录每一次写作，看见表达进步的轨迹。"
        user={user}
        onNavigate={onNavigate}
        onLoginClick={handleLoginClick}
        metrics={buildMetrics(displayStats)}
        dataLabel={user ? "实时记录" : "示例数据"}
        dataConnected
        loading={progressLoading}
        error={progressError}
        onRetry={() => void loadProgressStats()}
        hasData={hasRealData}
        emptyMessage="还没有真实写作数据。提交一篇作文获得批改后，成长页会自动生成统计。"
      >
        {!recordsDisabled && (
          <AnalyticsPanel writings={state.writings} isMobile={isMobile} />
        )}

        {/* 写作批改 */}
        <WritingRecordsSection
          disabled={recordsDisabled}
          isMobile={isMobile}
          listError={listError}
          modelActions={actions}
          modelState={state}
          onRetry={() => void actions.refreshWritings()}
        />

        {/* 写作实战 */}
        <WritingPracticeSection
          disabled={practiceDisabled}
          favorites={favoriteSentences}
          onNavigate={onNavigate}
          structureProgress={structureProgress}
        />
      </ModuleGrowthPage>

      <WritingFeedbackModal
        detailWriting={detailWriting}
        isMobile={isMobile}
        user={user}
        onClose={() => {
          setDetailWriting(null);
          onViewedWritingChange?.("");
        }}
        onWriteNextDraft={(sourceWriting) => {
          setDetailWriting(null);
          onViewedWritingChange?.("");
          handleWriteNextDraft(sourceWriting);
        }}
      />
    </>
  );
}
