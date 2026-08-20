import { useEffect, useMemo, useState } from "react";

import {
  ClassWeaknessPanel,
  ExportMaterialsPanel,
  SchoolReportPanel,
  StudentSegmentsPanel,
  buildTeachingRecommendations,
} from "./TeacherReportPanels.jsx";
import { teacherDataAPI } from "../api/index.js";

const TONES = {
  writing: { color: "#9a4f2f", bg: "#fff7ed", border: "#f0d4b8" },
  grammar: { color: "#5142b0", bg: "#f5f3ff", border: "#ded8fb" },
  reading: { color: "#1d8061", bg: "#eefbf5", border: "#cdebdc" },
  modules: { color: "#6f4c18", bg: "#fff9e8", border: "#ead9a8" },
};

const MODULE_LABELS = {
  reading: "阅读练习",
  "reading-paper": "阅读模拟卷",
  "reading-courses": "阅读课程",
  vocabulary: "词汇",
  vocab: "词汇闪卡",
  "vocab-reading": "阅读词汇",
  "vocab-writing": "写作词汇",
  listening: "模拟练习",
  "listening-basics": "基础辨音",
  "listening-advanced": "篇章精听",
  phonetics: "音素训练",
  "phonetics-syllable": "音节训练",
  "phonetics-sentence": "句子语音",
  "phonetics-discourse": "语篇语音",
  "writing-refine-sentence": "句子润色",
  "writing-refine-structure": "结构调整",
};

function formatDate(value) {
  if (!value) return "暂无记录";
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "暂无记录";
  return date.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPercent(value) {
  const number = Number(value || 0);
  return `${Math.max(0, Math.min(100, number))}%`;
}

function DataStat({ label, value, helper }) {
  return (
    <div style={{ border: "1px solid #ebe3d8", borderRadius: 12, padding: "14px 16px", background: "#fffdfa" }}>
      <div style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: "#241a12", lineHeight: 1 }}>{value}</div>
      {helper ? <div style={{ fontSize: 12, color: "#a09080", marginTop: 7, lineHeight: 1.5 }}>{helper}</div> : null}
    </div>
  );
}

function ProgressLine({ value, tone = TONES.modules }) {
  return (
    <div style={{ height: 8, borderRadius: 999, background: "#f1ebe3", overflow: "hidden" }} aria-label={`完成率 ${getPercent(value)}`}>
      <div style={{ width: getPercent(value), height: "100%", borderRadius: 999, background: tone.color }} />
    </div>
  );
}

function StatusBanner({ children, tone = "neutral", onRetry }) {
  const styleMap = {
    neutral: { background: "#faf8f5", border: "#e8dfd4", color: "#6b5a47" },
    error: { background: "#fff1f1", border: "#f0b0a8", color: "#b02020" },
  };
  const style = styleMap[tone] || styleMap.neutral;
  return (
    <div style={{ border: `1px solid ${style.border}`, background: style.background, color: style.color, borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
      <span>{children}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} style={{ border: "1px solid #d8c4a8", background: "#fff", borderRadius: 999, padding: "7px 12px", color: "#6f431c", fontWeight: 800, cursor: "pointer" }}>
          重试
        </button>
      ) : null}
    </div>
  );
}

function ClassTabs({ classes, selectedClassId, onSelect }) {
  if (!classes.length) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {classes.map((item) => {
        const active = item.classId === selectedClassId || item.id === selectedClassId;
        return (
          <button
            key={item.classId || item.id}
            type="button"
            onClick={() => onSelect(item.classId || item.id)}
            style={{
              border: active ? "1px solid #c68a31" : "1px solid #e8dfd4",
              background: active ? "#fff7ed" : "#fff",
              color: active ? "#8b5e1a" : "#6b5a47",
              borderRadius: 999,
              padding: "9px 15px",
              fontSize: 13,
              fontWeight: active ? 800 : 600,
              cursor: "pointer",
            }}
          >
            {item.className} · {item.studentCount || 0} 人
          </button>
        );
      })}
    </div>
  );
}

function PendingStudents({ students = [] }) {
  return (
    <section style={{ border: "1px solid #e8dfd4", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
      <div style={{ padding: "15px 18px", borderBottom: "1px solid #e8dfd4", display: "flex", justifyContent: "space-between", gap: 12 }}>
        <strong style={{ color: "#241a12" }}>待完成学生</strong>
        <span style={{ color: "#8a7d6e", fontSize: 12 }}>{students.length} 人</span>
      </div>
      <div style={{ padding: "16px 18px" }}>
        {!students.length ? (
          <div style={{ color: "#8a7d6e", fontSize: 13 }}>当前班级暂无待完成学生。</div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {students.map((student) => (
              <span key={student.id} style={{ border: "1px solid #efd7b2", background: "#fff7ed", color: "#8b5e1a", borderRadius: 999, padding: "7px 11px", fontSize: 12, fontWeight: 800 }}>
                {student.name}{student.studentNo ? ` · ${student.studentNo}` : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function DataPanel({ title, tone, children, badge }) {
  return (
    <section style={{ border: `1px solid ${tone.border}`, borderRadius: 14, background: "#fff", overflow: "hidden" }}>
      <div style={{ padding: "15px 18px", background: tone.bg, color: tone.color, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <strong>{title}</strong>
        {badge ? <span style={{ fontSize: 12, fontWeight: 800 }}>{badge}</span> : null}
      </div>
      <div style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
        {children}
      </div>
    </section>
  );
}

function WritingPanel({ data }) {
  return (
    <DataPanel title="写作" tone={TONES.writing} badge={`${data.assignmentCount || 0} 个任务`}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        <DataStat label="已提交" value={data.submittedCount || 0} helper={`分配 ${data.assignedCount || 0}`} />
        <DataStat label="已返回" value={data.returnedCount || 0} helper={`完成率 ${data.completionRate || 0}%`} />
        <DataStat label="教师点评覆盖" value={`${data.teacherCommentCoverageRate || 0}%`} helper={`${data.commentReadyCount || 0} 篇已点评`} />
      </div>
      <ProgressLine value={data.completionRate} tone={TONES.writing} />
    </DataPanel>
  );
}

function GrammarPanel({ data }) {
  return (
    <DataPanel title="语法" tone={TONES.grammar} badge={`${data.assignmentCount || 0} 个任务`}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
        <DataStat label="任务提交" value={data.submittedCount || 0} helper={`分配 ${data.assignedCount || 0}`} />
        <DataStat label="完成率" value={`${data.completionRate || 0}%`} />
        <DataStat label="练习次数" value={data.practiceSessions || 0} helper={`${data.totalQuestions || 0} 题`} />
        <DataStat label="正确率" value={`${data.accuracy || 0}%`} helper={`最近 ${formatDate(data.lastPracticedAt)}`} />
      </div>
      <ProgressLine value={data.completionRate} tone={TONES.grammar} />
    </DataPanel>
  );
}

function ReadingPanel({ data }) {
  return (
    <DataPanel title="阅读" tone={TONES.reading} badge={`最近 ${formatDate(data.lastRecordAt)}`}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
        <DataStat label="练习次数" value={data.practiceSessions || 0} />
        <DataStat label="题目数" value={data.totalQuestions || 0} />
        <DataStat label="正确率" value={`${data.accuracy || 0}%`} />
        <DataStat label="解析次数" value={data.analysesCount || 0} />
      </div>
    </DataPanel>
  );
}

function TeachingRecommendationsPanel({ overall, current, onCreateAssignment }) {
  const recommendations = buildTeachingRecommendations({ overall, current });
  return (
    <DataPanel title="教学下一步" tone={TONES.modules} badge="基于学习闭环信号">
      <div style={{ display: "grid", gap: 8 }}>
        {recommendations.map((item) => {
          const key = item.text || item;
          return (
            <div key={key} style={{ border: "1px solid #f0e2c0", borderRadius: 10, padding: "10px 12px", background: "#fffdf6" }}>
              <div style={{ color: "#3a2f24", fontSize: 13, fontWeight: 800, lineHeight: 1.6 }}>
                {item.text || item}
              </div>
              <button
                type="button"
                aria-label={`为「${item.text || item}」创建作业`}
                onClick={() => onCreateAssignment?.(item.taskType)}
                style={{
                  marginTop: 8,
                  border: "1px solid #d8c4a8",
                  background: "#fff",
                  borderRadius: 8,
                  padding: "7px 12px",
                  color: "#6f431c",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                一键创建对应作业
              </button>
            </div>
          );
        })}
      </div>
    </DataPanel>
  );
}

function ModulesPanel({ data }) {
  const rows = Array.isArray(data.byModule) ? data.byModule : [];
  const realRows = Array.isArray(data.realRecords) ? data.realRecords.filter((item) => item.sessions > 0) : [];
  return (
    <DataPanel title="专项任务" tone={TONES.modules} badge="含真实练习记录">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        <DataStat label="分配次数" value={data.assignedCount || 0} />
        <DataStat label="已完成" value={data.completedCount || 0} />
        <DataStat label="真实练习" value={data.realPracticeSessions || 0} helper="词汇/听读/语音" />
      </div>
      <ProgressLine value={data.completionRate} tone={TONES.modules} />
      {!rows.length && !realRows.length ? (
        <div style={{ color: "#8a7d6e", fontSize: 13 }}>暂无专项任务完成记录或真实练习记录。</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((item) => (
            <div key={item.moduleType} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, border: "1px solid #f0e2c0", borderRadius: 10, padding: "10px 12px", background: "#fffdf6" }}>
              <span style={{ color: "#3a2f24", fontWeight: 800, fontSize: 13 }}>{MODULE_LABELS[item.moduleType] || item.moduleType}</span>
              <span style={{ color: "#8a7d6e", fontSize: 12 }}>{item.completedCount}/{item.assignedCount} 完成</span>
            </div>
          ))}
          {realRows.map((item) => (
            <div key={`real-${item.moduleType}`} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 12, border: "1px solid #f0e2c0", borderRadius: 10, padding: "10px 12px", background: "#fffdf6" }}>
              <span style={{ color: "#3a2f24", fontWeight: 800, fontSize: 13 }}>{MODULE_LABELS[item.moduleType] || item.moduleType} · 真实练习</span>
              <span style={{ color: "#8a7d6e", fontSize: 12 }}>{item.sessions} 次 · {item.averageAccuracy}% 正确</span>
            </div>
          ))}
        </div>
      )}
    </DataPanel>
  );
}

function EmptyState() {
  return (
    <StatusBanner>
      还没有可统计的班级。先创建班级并让学生加入后，这里会展示完成率和学情数据。
    </StatusBanner>
  );
}

function TeacherDataStatus({ loading, error, hasClasses, onRetry }) {
  if (loading) return <StatusBanner>正在加载教师数据...</StatusBanner>;
  if (error) return <StatusBanner tone="error" onRetry={onRetry}>{error}</StatusBanner>;
  if (!hasClasses) return <EmptyState />;
  return null;
}

function ClassOverviewSection({ classes, summary, overall, current, isMobile, selectedClassId, onSelect }) {
  return (
    <>
      <ClassTabs classes={classes} selectedClassId={selectedClassId} onSelect={onSelect} />
      <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 12 }}>
        <DataStat label="班级数" value={summary.classCount || 0} helper={`${summary.studentCount || 0} 名学生`} />
        <DataStat label="总体完成率" value={`${overall.completionRate ?? summary.completionRate ?? 0}%`} helper={`${overall.completedCount ?? summary.completedCount ?? 0}/${overall.assignedCount ?? summary.assignedCount ?? 0}`} />
        <DataStat label="待完成学生" value={overall.pendingStudentCount ?? summary.pendingStudentCount ?? 0} />
        <DataStat label="最近学习" value={formatDate(current.classSummary?.lastLearningAt || summary.lastLearningAt)} />
      </section>
    </>
  );
}

function ClassDetailSection({ overall, current, onCreateAssignment }) {
  return (
    <>
      <PendingStudents students={overall.pendingStudents || []} />
      <div style={{ display: "grid", gap: 14 }}>
        <SchoolReportPanel overall={overall} current={current} />
        <ClassWeaknessPanel overall={overall} current={current} />
        <StudentSegmentsPanel overall={overall} />
        <TeachingRecommendationsPanel overall={overall} current={current} onCreateAssignment={onCreateAssignment} />
        <ExportMaterialsPanel overall={overall} current={current} />
        <WritingPanel data={current.writing || {}} />
        <GrammarPanel data={current.grammar || {}} />
        <ReadingPanel data={current.reading || {}} />
        <ModulesPanel data={current.modules || {}} />
      </div>
    </>
  );
}

export default function TeacherDataPage({ isMobile = false, onNavigate }) {
  // 从推荐一键创建作业：根据推荐任务类型生成对应作业页的导航目标。
  // 当前作业创建页是写作任务；模块类型（语法/阅读/词汇/听读等）
  // 会映射到各自的工作台或备课页，由教师再细化配置。
  const handleCreateAssignment = (taskType = "writing") => {
    if (!onNavigate) return;
    const target =
      taskType === "grammar" ? "grammar-workbench"
      : taskType === "reading" ? "reading-workbench"
      : taskType === "listening" ? "listening-workbench"
      : taskType === "vocab" ? "vocab-workbench"
      : taskType === "phonetics" || taskType === "phonetics-syllable" || taskType === "phonetics-sentence" || taskType === "phonetics-discourse" ? "phonetics-workbench"
      : taskType === "module" ? "teacher-prep"
      : "assignment-create";
    onNavigate(target);
  };
  const [overview, setOverview] = useState(null);
  const [detail, setDetail] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  const loadOverview = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await teacherDataAPI.overview();
      setOverview(data);
      const classes = Array.isArray(data?.classes) ? data.classes : [];
      setSelectedClassId((current) => (
        current && classes.some((item) => (item.classId || item.id) === current)
          ? current
          : classes[0]?.classId || classes[0]?.id || ""
      ));
    } catch (err) {
      setOverview(null);
      setDetail(null);
      setError(err?.message || "教师数据加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setDetail(null);
      return;
    }

    let alive = true;
    setDetailLoading(true);
    setError("");
    teacherDataAPI.classDetail(selectedClassId)
      .then((data) => {
        if (!alive) return;
        setDetail(data);
      })
      .catch((err) => {
        if (!alive) return;
        setDetail(null);
        setError(err?.message || "班级数据加载失败");
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });

    return () => { alive = false; };
  }, [selectedClassId]);

  const classes = useMemo(() => (Array.isArray(overview?.classes) ? overview.classes : []), [overview]);
  const summary = overview?.summary || {};
  const current = detail || {};
  const overall = current.overall || {};

  return (
    <main
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        padding: isMobile ? "24px 14px 92px" : "34px 20px 64px",
        background: "#fff",
        display: "grid",
        gap: 18,
      }}
    >
      <section>
        <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, color: "#1a1a1a", letterSpacing: 0, marginBottom: 6 }}>
          数据
        </div>
        <div style={{ fontSize: 14, color: "#888" }}>
          基于真实班级、任务完成和学习记录展示；未接入真实记录的模块只展示专项任务完成数。
        </div>
      </section>

      <TeacherDataStatus loading={loading} error={error} hasClasses={classes.length > 0} onRetry={() => void loadOverview()} />

      {!loading && classes.length ? (
        <>
          <ClassOverviewSection
            classes={classes}
            summary={summary}
            overall={overall}
            current={current}
            isMobile={isMobile}
            selectedClassId={selectedClassId}
            onSelect={setSelectedClassId}
          />
          {detailLoading ? <StatusBanner>正在加载班级学情...</StatusBanner> : null}
          {!detailLoading && detail ? <ClassDetailSection overall={overall} current={current} onCreateAssignment={handleCreateAssignment} /> : null}
        </>
      ) : null}
    </main>
  );
}
