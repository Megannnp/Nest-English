import { useEffect, useRef, useState } from "react";

import { grammarAPI, listeningAPI, phoneticsAPI, readingAPI, speakingAPI, vocabularyAPI } from "../api/index.js";
import { PageHeader, SmallActionButton } from "./shared/UI.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";

const MODULES = [
  {
    id: "writing",
    label: "写作",
    desc: "批改 · 精炼 · 实战",
    accent: "#a0522d",
    bg: "#fdf0e4",
    border: "#f0d8c0",
    homePage: "writing",
    detailPage: "records",
  },
  {
    id: "grammar",
    label: "语法",
    desc: "分析 · 练习 · 精讲",
    accent: "#5548a8",
    bg: "#edeaff",
    border: "#d8d2ff",
    homePage: "grammar-analyzer",
    detailPage: "grammar-progress",
  },
  {
    id: "reading",
    label: "阅读",
    desc: "思维 · 练习 · 精读",
    accent: "#1f7a5c",
    bg: "#e4f5ef",
    border: "#c8e8dc",
    homePage: "reading-analyzer",
    detailPage: "reading-progress",
  },
  {
    id: "vocab",
    label: "词汇",
    desc: "分析 · 检测 · 精讲",
    accent: "#1a5fa8",
    bg: "#e6f0fb",
    border: "#c8dcf4",
    homePage: "vocab-analyzer",
    detailPage: "vocab-progress",
  },
  {
    id: "listening",
    label: "听读",
    desc: "辨音 · 精听 · 模拟",
    accent: "#8a6800",
    bg: "#fef8e0",
    border: "#f0e4a0",
    homePage: "listening-basics",
    detailPage: "listening-progress",
  },
  {
    id: "phonetics",
    label: "语音",
    desc: "音素 · 拼读 · 句子",
    accent: "#a0307a",
    bg: "#fce8f2",
    border: "#f0c8e0",
    homePage: "phonetics-overview",
    detailPage: "phonetics-progress",
  },
  {
    id: "speaking",
    label: "口语",
    desc: "表达 · 转写 · 反馈",
    accent: "#ff7a1a",
    bg: "#fff4e8",
    border: "#ffc38a",
    homePage: "speaking",
    detailPage: "speaking-progress",
  },
];

function pct(correct, total) {
  if (!total) return "—";
  return `${Math.round((correct / total) * 100)}%`;
}

/* ── Shared card shell ─────────────────────────────── */
function ModuleCard({ mod, isMobile, onNavigate, loading, stats, note }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: mod.bg,
          padding: isMobile ? "14px 16px" : "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: mod.accent, marginBottom: 2 }}>
            {mod.label}
          </div>
          <div style={{ fontSize: 12, color: mod.accent, opacity: 0.7 }}>{mod.desc}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <SmallActionButton
            tone="soft"
            onClick={() => onNavigate?.(mod.detailPage)}
            style={{
              borderRadius: 6,
              padding: "5px 12px",
              whiteSpace: "nowrap",
            }}
          >
            看详情
          </SmallActionButton>
          <SmallActionButton
            onClick={() => onNavigate?.(mod.homePage)}
            style={{
              borderRadius: 6,
              padding: "5px 12px",
              whiteSpace: "nowrap",
            }}
          >
            去练习
          </SmallActionButton>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: isMobile ? "14px 16px" : "16px 20px", minHeight: 70 }}>
        {loading ? (
          <div style={{ fontSize: 13, color: "#ccc" }}>加载中…</div>
        ) : stats ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
              gap: 12,
            }}
          >
            {stats.map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a1a", lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#bbb" }}>{note}</div>
        )}
      </div>
    </div>
  );
}

/* ── Per-module card implementations ──────────────── */
function WritingCard({ mod, myWritings, isMobile, onNavigate }) {
  const count = myWritings?.length ?? 0;
  const graded = myWritings?.filter(
    (w) => w.feedbackStatus === "returned" || w.feedbackStatus === "completed"
  ).length ?? 0;

  return (
    <ModuleCard
      mod={mod}
      isMobile={isMobile}
      onNavigate={onNavigate}
      loading={false}
      stats={count > 0 ? [
        { label: "总投稿", value: count },
        { label: "已批改", value: graded },
      ] : null}
      note={count === 0 ? "还没有写作记录，去写一篇吧" : null}
    />
  );
}

function GrammarCard({ mod, isMobile, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    grammarAPI.progress()
      .then((res) => { if (mounted.current) setData(res?.data ?? res); })
      .catch(() => { if (mounted.current) setData(null); })
      .finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; };
  }, []);

  const sessions = data?.sessions ?? 0;
  const total = data?.totalQuestions ?? 0;
  const correct = data?.correctQuestions ?? 0;

  return (
    <ModuleCard
      mod={mod}
      isMobile={isMobile}
      onNavigate={onNavigate}
      loading={loading}
      stats={sessions > 0 ? [
        { label: "练习场次", value: sessions },
        { label: "总题数", value: total },
        { label: "正确率", value: pct(correct, total) },
      ] : null}
      note={!loading && sessions === 0 ? "还没有语法练习记录" : null}
    />
  );
}

function ReadingCard({ mod, isMobile, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    readingAPI.practiceProgress()
      .then((res) => { if (mounted.current) setData(res?.data ?? res); })
      .catch(() => { if (mounted.current) setData(null); })
      .finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; };
  }, []);

  const sessions = data?.sessions ?? 0;
  const analyses = data?.analyses?.total ?? 0;
  const accuracy = data?.accuracy ?? 0;

  return (
    <ModuleCard
      mod={mod}
      isMobile={isMobile}
      onNavigate={onNavigate}
      loading={loading}
      stats={(sessions > 0 || analyses > 0) ? [
        { label: "练习场次", value: sessions },
        { label: "思维分析", value: analyses },
        { label: "正确率", value: sessions > 0 ? `${accuracy}%` : "—" },
      ] : null}
      note={!loading && sessions === 0 && analyses === 0 ? "还没有阅读练习记录" : null}
    />
  );
}

function ActivityProgressCard({ api, mod, isMobile, onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    api.progress()
      .then((res) => { if (mounted.current) setData(res?.data ?? res); })
      .catch(() => { if (mounted.current) setData(null); })
      .finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; };
  }, [api]);

  const sessions = data?.sessions ?? 0;
  const accuracy = data?.averageAccuracy ?? 0;
  const score = data?.averageScore ?? 0;

  return (
    <ModuleCard
      mod={mod}
      isMobile={isMobile}
      onNavigate={onNavigate}
      loading={loading}
      stats={sessions > 0 ? [
        { label: "训练次数", value: sessions },
        { label: "平均得分", value: `${score}%` },
        { label: "准确率", value: `${accuracy}%` },
      ] : null}
      note={!loading && sessions === 0 ? `还没有${mod.label}练习记录` : null}
    />
  );
}

/* ── Main page ─────────────────────────────────────── */
export default function UnifiedProgressPage({ user, myWritings = [], isMobile = false, onNavigate }) {
  const pageRef = useScrollReveal();
  const cols = isMobile ? 1 : 2;

  const cardMap = {
    writing: (mod) => (
      <WritingCard key={mod.id} mod={mod} myWritings={myWritings} isMobile={isMobile} onNavigate={onNavigate} />
    ),
    grammar: (mod) => (
      <GrammarCard key={mod.id} mod={mod} isMobile={isMobile} onNavigate={onNavigate} />
    ),
    reading: (mod) => (
      <ReadingCard key={mod.id} mod={mod} isMobile={isMobile} onNavigate={onNavigate} />
    ),
    vocab: (mod) => (
      <ActivityProgressCard key={mod.id} api={vocabularyAPI} mod={mod} isMobile={isMobile} onNavigate={onNavigate} />
    ),
    listening: (mod) => (
      <ActivityProgressCard key={mod.id} api={listeningAPI} mod={mod} isMobile={isMobile} onNavigate={onNavigate} />
    ),
    phonetics: (mod) => (
      <ActivityProgressCard key={mod.id} api={phoneticsAPI} mod={mod} isMobile={isMobile} onNavigate={onNavigate} />
    ),
    speaking: (mod) => (
      <ActivityProgressCard key={mod.id} api={speakingAPI} mod={mod} isMobile={isMobile} onNavigate={onNavigate} />
    ),
  };

  return (
    <div
      ref={pageRef}
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: isMobile ? "24px 16px 48px" : "40px 24px 64px",
      }}
    >
      <h1
        style={{
          border: 0,
          clip: "rect(0 0 0 0)",
          height: 1,
          margin: -1,
          overflow: "hidden",
          padding: 0,
          position: "absolute",
          whiteSpace: "nowrap",
          width: 1,
        }}
      >
        成长
      </h1>
      <PageHeader
        titleZh="成长"
        subtitle={`${user?.realName ? `${user.realName}，` : ""}记录你在每个模块的练习轨迹。`}
        isMobile={isMobile}
      />

      {/* Grid */}
      <div
        className="studio-reveal studio-reveal--delay-1"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: isMobile ? 14 : 18,
        }}
      >
        {MODULES.map((mod) => {
          if (cardMap[mod.id]) return cardMap[mod.id](mod);
          return (
            <ModuleCard
              key={mod.id}
              mod={mod}
              isMobile={isMobile}
              onNavigate={onNavigate}
              loading={false}
              stats={null}
              note="数据接入后将显示详细进度"
            />
          );
        })}
      </div>
    </div>
  );
}
