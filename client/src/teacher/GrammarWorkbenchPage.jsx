import { useEffect, useRef, useState } from "react";

import { grammarAPI } from "../api/index.js";
import PageHero from "../components/shared/PageHero.jsx";
import GrammarTopBar from "../grammar/GrammarTopBar.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "../components/shared/moduleLearningPages.css";
import "../grammar/grammar.css";
import "../styles/studio.css";

// ─── helpers ────────────────────────────────────────────────────────────────

const QUIZ_TYPE_OPTIONS = [
  { value: "single", label: "单选题" },
  { value: "fill", label: "填空题" },
  { value: "error", label: "改错题" },
];

function formatDateTimeInput(timestamp) {
  if (!timestamp) return "";
  const date = new Date(Number(timestamp));
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function parseDateTimeInput(value) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function formatDueTime(value) {
  if (!value) return "未设置";
  return new Date(Number(value)).toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pct(correct, total) {
  if (!total) return null;
  return Math.round((correct / total) * 100);
}

function ScorePill({ value }) {
  if (value === null) return <span style={{ color: "#bbb", fontSize: 12 }}>—</span>;
  const color = value >= 80 ? "#1a7a4a" : value >= 60 ? "#a07000" : "#c04030";
  const bg    = value >= 80 ? "#edfaf3" : value >= 60 ? "#fff8e1" : "#fdf0ef";
  return (
    <span style={{ background: bg, color, fontWeight: 700, fontSize: 12, borderRadius: 8, padding: "2px 8px" }}>
      {value}%
    </span>
  );
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadAssignmentSubmissionsCsv(assignment, rows) {
  const header = ["姓名", "学号", "状态", "答对", "总题数", "正确率", "提交时间"];
  const lines = rows.map((row) => {
    const rate = row.totalCount ? `${Math.round((row.correctCount / row.totalCount) * 100)}%` : "";
    const submittedAt = row.submittedAt ? new Date(Number(row.submittedAt)).toLocaleString("zh-CN") : "";
    return [
      row.realName,
      row.studentNo,
      row.status === "submitted" ? "已提交" : "未提交",
      row.correctCount ?? "",
      row.totalCount ?? "",
      rate,
      submittedAt,
    ].map(csvCell).join(",");
  });
  const content = ["\ufeff" + header.map(csvCell).join(","), ...lines].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${String(assignment?.title || "语法任务提交明细").replace(/[\\/:*?"<>|]/g, "_")}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// ─── Class selector tabs ────────────────────────────────────────────────────

function ClassTabs({ classes, selectedId, onSelect }) {
  if (!classes.length) return (
    <div className="module-workbench-empty module-workbench-empty--panel">暂无班级，请先在「班级管理」创建班级</div>
  );
  return (
    <div className="module-workbench-tabs">
      {classes.map((cls) => {
        const active = cls.id === selectedId;
        return (
          <button
            key={cls.id}
            type="button"
            onClick={() => onSelect(cls.id)}
            className={active ? "is-active" : ""}
          >
            {cls.className}
            <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.75 }}>({cls.studentCount ?? cls.students?.length ?? "—"}人)</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Student progress table ─────────────────────────────────────────────────

function StudentProgressTable({ students, _isMobile }) {
  if (!students.length) return (
    <div className="module-workbench-empty module-workbench-empty--panel">
      班级暂无学生，或学生还未开始语法练习
    </div>
  );

  return (
    <div className="module-workbench-table-wrap">
      <table className="module-workbench-table">
        <thead>
          <tr>
            {["姓名", "学号", "练习次数", "题目总数", "正确率", "涉及语法点"].map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((s, i) => {
            const g = s.grammarStats || {};
            const accuracy = pct(g.correctQuestions, g.totalQuestions);
            return (
              <tr
                key={s.id}
                style={{ background: i % 2 === 0 ? "#fff" : "rgba(255, 255, 255, 0.44)" }}
              >
                <td style={{ fontWeight: 800 }}>{s.realName}</td>
                <td>{s.studentNo || "—"}</td>
                <td>{g.sessions}</td>
                <td>{g.totalQuestions}</td>
                <td><ScorePill value={accuracy} /></td>
                <td>{g.distinctPoints ?? 0} 个</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GrammarAssignmentPanel({ assignments, selectedAssignmentId, submissionRows, loadingSubmissions, onSelectAssignment }) {
  const [submissionFilter, setSubmissionFilter] = useState("all");

  if (!assignments.length) {
    return (
      <div style={{ textAlign: "center", padding: "30px 0", color: "#aaa", fontSize: 14 }}>
        当前班级还没有发布语法任务
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {assignments.map((item) => {
        const completion = item.assignedCount ? Math.round((item.completedCount / item.assignedCount) * 100) : 0;
        const quizLabel = QUIZ_TYPE_OPTIONS.find((option) => option.value === item.quizType)?.label || "语法练习";
        const filteredRows = submissionFilter === "all"
          ? submissionRows
          : submissionRows.filter((row) => row.status === submissionFilter);
        return (
          <button
            type="button"
            key={item.id}
            className="module-class-row"
            style={{ gridTemplateColumns: "minmax(0, 1fr) auto", cursor: "pointer", width: "100%", textAlign: "left" }}
            onClick={() => onSelectAssignment?.(item.id)}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#2e2840", marginBottom: 5 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: "#7c6fa0", lineHeight: 1.7 }}>
                {item.grammarPoint} · {quizLabel} · 截止：{formatDueTime(item.dueAt)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#6c48b8" }}>{completion}%</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>{item.completedCount}/{item.assignedCount} 完成</div>
            </div>
            {selectedAssignmentId === item.id && (
              <div style={{ gridColumn: "1 / -1", marginTop: 10, borderTop: "1px solid #eee8fb", paddingTop: 10 }}>
                {loadingSubmissions ? (
                  <div style={{ fontSize: 13, color: "#7c6fa0" }}>提交明细加载中...</div>
                ) : submissionRows.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} aria-label="提交状态筛选">
                        {[
                          ["all", "全部"],
                          ["submitted", "已提交"],
                          ["pending", "未提交"],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            className={submissionFilter === value ? "gm-btn-primary" : "gm-btn-secondary"}
                            style={{ padding: "5px 10px", fontSize: 12, borderRadius: 8 }}
                            onClick={() => setSubmissionFilter(value)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="gm-btn-secondary"
                        style={{ padding: "5px 10px", fontSize: 12, borderRadius: 8 }}
                        onClick={() => downloadAssignmentSubmissionsCsv(item, submissionRows)}
                      >
                        导出 CSV
                      </button>
                    </div>
                    {filteredRows.length ? filteredRows.map((row) => {
                      const rate = row.totalCount ? Math.round((row.correctCount / row.totalCount) * 100) : null;
                      return (
                        <div key={row.studentId} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, fontSize: 12, color: "#5f5474" }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.realName}{row.studentNo ? ` · ${row.studentNo}` : ""}
                          </span>
                          <span style={{ fontWeight: 800, color: row.status === "submitted" ? "#1a7a4a" : "#b37a00" }}>
                            {row.status === "submitted" ? `${row.correctCount}/${row.totalCount} · ${rate}%` : "未提交"}
                          </span>
                        </div>
                      );
                    }) : (
                      <div style={{ fontSize: 13, color: "#aaa" }}>当前筛选下暂无学生</div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "#aaa" }}>暂无学生明细</div>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PublishGrammarTaskModal({ open, selectedClass, isMobile, onClose, onSubmit, saving, error }) {
  const [form, setForm] = useState({
    title: "",
    grammarPoint: "",
    quizType: "error",
    stage: "高中",
    difficulty: "中等",
    dueAt: "",
    allowLate: true,
  });

  useEffect(() => {
    if (!open) return;
    const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
    setForm({
      title: selectedClass ? `${selectedClass.className} 语法练习` : "语法练习任务",
      grammarPoint: "",
      quizType: "error",
      stage: "高中",
      difficulty: "中等",
      dueAt: formatDateTimeInput(tomorrow),
      allowLate: true,
    });
  }, [open, selectedClass]);

  if (!open) return null;

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const fieldStyle = {
    width: "100%",
    border: "1px solid #e0daf5",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    color: "#2e2840",
    background: "#fff",
    boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(30,22,46,0.28)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 18, border: "1px solid #ede8f8", boxShadow: "0 18px 60px rgba(62,39,111,0.22)", padding: isMobile ? 18 : 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#2e2840" }}>发布语法任务</div>
            <div style={{ fontSize: 12, color: "#7c6fa0", marginTop: 6 }}>{selectedClass?.className || "未选择班级"}</div>
          </div>
          <button type="button" onClick={onClose} style={{ border: 0, background: "transparent", color: "#7c6fa0", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit({
              ...form,
              dueAt: parseDateTimeInput(form.dueAt),
            });
          }}
          style={{ display: "grid", gap: 12 }}
        >
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#5c3d9e" }}>
            任务标题
            <input value={form.title} onChange={(event) => update("title", event.target.value)} style={fieldStyle} required />
          </label>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#5c3d9e" }}>
            语法点
            <input value={form.grammarPoint} onChange={(event) => update("grammarPoint", event.target.value)} placeholder="例如：定语从句 / 非谓语动词" style={fieldStyle} required />
            {!form.grammarPoint.trim() && <span style={{ fontWeight: 400, color: "#a08fc4" }}>请填写本次任务的语法点，用于生成题目</span>}
          </label>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 10 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#5c3d9e" }}>
              题型
              <select value={form.quizType} onChange={(event) => update("quizType", event.target.value)} style={fieldStyle}>
                {QUIZ_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#5c3d9e" }}>
              学段
              <input value={form.stage} onChange={(event) => update("stage", event.target.value)} style={fieldStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#5c3d9e" }}>
              难度
              <input value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)} style={fieldStyle} />
            </label>
          </div>
          <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 700, color: "#5c3d9e" }}>
            截止时间
            <input type="datetime-local" value={form.dueAt} onChange={(event) => update("dueAt", event.target.value)} style={fieldStyle} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#5c3d9e" }}>
            <input type="checkbox" checked={form.allowLate} onChange={(event) => update("allowLate", event.target.checked)} />
            允许学生截止后补交
          </label>
          {error ? <div style={{ background: "#fdf0ef", border: "1px solid #f0b0a8", borderRadius: 10, padding: "9px 12px", color: "#b02020", fontSize: 13 }}>{error}</div> : null}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
            <button type="button" className="gm-btn-secondary" onClick={onClose} disabled={saving}>取消</button>
            <button type="submit" className="gm-btn-primary" aria-label={saving ? "发布中" : "发布任务"} disabled={saving || !selectedClass || !form.title.trim() || !form.grammarPoint.trim()}>
              {saving ? "发布中..." : "发布任务"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function GrammarWorkbenchTopBar({ hideTopBar, user, onLogin, onRegister, onNavigate, activePage, onAccountClick }) {
  if (hideTopBar) return null;
  return (
    <GrammarTopBar
      user={user}
      onLogin={onLogin}
      onRegister={onRegister}
      onNavigate={onNavigate}
      activePage={activePage}
      onAccountClick={onAccountClick}
    />
  );
}

function buildClassSummaryItems({ totalStudents, activeStudents, avgAccuracy }) {
  return [
    { label: "班级人数", value: totalStudents },
    { label: "已练习人数", value: activeStudents },
    { label: "未开始人数", value: totalStudents - activeStudents },
    { label: "平均正确率", value: avgAccuracy !== null ? `${avgAccuracy}%` : "—" },
  ];
}

function ClassSummaryCards({ selectedClassId, loadingStudents, isMobile: _isMobile, totalStudents, activeStudents, avgAccuracy }) {
  if (!selectedClassId || loadingStudents) return null;
  return (
    <div className="module-workbench-stats">
      {buildClassSummaryItems({ totalStudents, activeStudents, avgAccuracy }).map(({ label, value }) => (
        <div key={label} className="module-workbench-stat">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function AssignmentSection({
  assignments,
  loadingAssignments,
  selectedAssignmentId,
  submissionRows,
  loadingSubmissions,
  onSelectAssignment,
}) {
  return (
    <section className="module-workbench-panel module-workbench-section">
      <div className="module-workbench-panel__head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2>已发布语法任务</h2>
        <span style={{ fontSize: 12, color: "#aaa" }}>{assignments.length} 项</span>
      </div>
      <div>
        {loadingAssignments ? (
          <div className="module-workbench-empty module-workbench-empty--panel">加载中...</div>
        ) : (
          <GrammarAssignmentPanel
            assignments={assignments}
            selectedAssignmentId={selectedAssignmentId}
            submissionRows={submissionRows}
            loadingSubmissions={loadingSubmissions}
            onSelectAssignment={onSelectAssignment}
          />
        )}
      </div>
    </section>
  );
}

function StudentProgressSection({ selectedClass, selectedClassId, loadingStudents, students, totalStudents, isMobile }) {
  return (
    <section className="module-workbench-panel module-workbench-section">
      <div className="module-workbench-panel__head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h2>
          {selectedClass ? `${selectedClass.className} · 学生进度` : "学生进度"}
        </h2>
        {selectedClass && (
          <span style={{ fontSize: 12, color: "#aaa" }}>{totalStudents} 名学生</span>
        )}
      </div>
      <div>
        {!selectedClassId ? (
          <div className="module-workbench-empty module-workbench-empty--panel">请先选择班级</div>
        ) : loadingStudents ? (
          <div className="module-workbench-empty module-workbench-empty--panel">加载中...</div>
        ) : (
          <StudentProgressTable students={students} isMobile={isMobile} />
        )}
      </div>
    </section>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function GrammarWorkbenchPage({
  user,
  isMobile,
  onNavigate,
  onAccountClick,
  onLogin,
  onRegister,
  activePage,
  hideTopBar = false}) {
  const [classes, setClasses]         = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [students, setStudents]       = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError]             = useState("");
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [submissionRows, setSubmissionRows] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const submissionsRequestRef = useRef(0);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  // Load teacher's classes on mount
  useEffect(() => {
    setLoadingClasses(true);
    grammarAPI.teacherClasses()
      .then((data) => {
        setClasses(data || []);
        if (data?.length) setSelectedClassId(data[0].id);
      })
      .catch((e) => setError(e.message || "加载班级失败"))
      .finally(() => setLoadingClasses(false));
  }, []);

  // Load student progress when class changes
  useEffect(() => {
    if (!selectedClassId) { setStudents([]); return; }
    setLoadingStudents(true);
    setError("");
    grammarAPI.teacherClassProgress(selectedClassId)
      .then((data) => setStudents(data || []))
      .catch((e) => setError(e.message || "加载学生数据失败"))
      .finally(() => setLoadingStudents(false));
  }, [selectedClassId]);

  useEffect(() => {
    if (!selectedClassId) {
      setAssignments([]);
      setSelectedAssignmentId(null);
      setSubmissionRows([]);
      return;
    }
    setLoadingAssignments(true);
    setSelectedAssignmentId(null);
    setSubmissionRows([]);
    grammarAPI.teacherAssignments(selectedClassId)
      .then((data) => setAssignments(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message || "加载语法任务失败"))
      .finally(() => setLoadingAssignments(false));
  }, [selectedClassId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const pageRef = useScrollReveal();

  // Summary stats
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => (s.grammarStats || {}).sessions > 0).length;
  const avgAccuracy = (() => {
    const active = students.filter((s) => (s.grammarStats || {}).totalQuestions > 0);
    if (!active.length) return null;
    const sum = active.reduce((acc, s) => acc + pct((s.grammarStats || {}).correctQuestions, (s.grammarStats || {}).totalQuestions), 0);
    return Math.round(sum / active.length);
  })();

  async function handlePublishTask(form) {
    if (!selectedClassId) return;
    setPublishing(true);
    setPublishError("");
    try {
      await grammarAPI.createTeacherAssignment({
        classId: selectedClassId,
        title: form.title,
        grammarPoint: form.grammarPoint,
        quizType: form.quizType,
        stage: form.stage,
        difficulty: form.difficulty,
        dueAt: form.dueAt,
        allowLate: form.allowLate,
      });
      const [nextStudents, nextAssignments] = await Promise.all([
        grammarAPI.teacherClassProgress(selectedClassId),
        grammarAPI.teacherAssignments(selectedClassId),
      ]);
      setStudents(Array.isArray(nextStudents) ? nextStudents : []);
      setAssignments(Array.isArray(nextAssignments) ? nextAssignments : []);
      setSelectedAssignmentId(null);
      setSubmissionRows([]);
      setPublishOpen(false);
    } catch (e) {
      setPublishError(e.message || "发布失败");
    } finally {
      setPublishing(false);
    }
  }

  async function handleSelectAssignment(assignmentId) {
    const requestId = submissionsRequestRef.current + 1;
    submissionsRequestRef.current = requestId;
    if (selectedAssignmentId === assignmentId) {
      setSelectedAssignmentId(null);
      setSubmissionRows([]);
      setLoadingSubmissions(false);
      return;
    }
    setSelectedAssignmentId(assignmentId);
    setLoadingSubmissions(true);
    try {
      const data = await grammarAPI.teacherAssignmentSubmissions(assignmentId);
      if (submissionsRequestRef.current !== requestId) return;
      setSubmissionRows(Array.isArray(data) ? data : []);
    } catch (e) {
      if (submissionsRequestRef.current !== requestId) return;
      setSubmissionRows([]);
      setError(e.message || "加载提交明细失败");
    } finally {
      if (submissionsRequestRef.current === requestId) {
        setLoadingSubmissions(false);
      }
    }
  }

  return (
    <div className="gm-page module-learning-page" ref={pageRef}>
      <GrammarWorkbenchTopBar
        hideTopBar={hideTopBar}
        user={user}
        onLogin={onLogin}
        onRegister={onRegister}
        onNavigate={onNavigate}
        activePage={activePage}
        onAccountClick={onAccountClick}
      />

      <main className="module-workbench-page">
        <PageHero eyebrow="筑巢语法 · 工作台" title="运筹帷幄，掌握学情。" description="查看班级学生的语法练习进度，精准发布语法任务" />

        <div className="module-workbench-actions studio-reveal studio-reveal--delay-1">
          <button
            type="button"
            className="gm-btn-primary"
            onClick={() => { setPublishError(""); setPublishOpen(true); }}
          >
            发布语法任务
          </button>
          <button
            type="button"
            className="gm-btn-secondary"
            onClick={() => onNavigate?.("grammar-quiz")}
          >
            进入在线练习
          </button>
        </div>

        {error ? (
          <div className="module-workbench-empty module-workbench-empty--panel" style={{ borderColor: "#f0b0a8", color: "#b02020", marginBottom: 20 }}>
            {error}
          </div>
        ) : null}

        <section className="module-workbench-panel studio-reveal studio-reveal--delay-1">
          <div className="module-workbench-panel__head">
            <h2>选择班级</h2>
          </div>
          {loadingClasses
            ? <div className="module-workbench-empty module-workbench-empty--panel">加载中...</div>
            : <ClassTabs classes={classes} selectedId={selectedClassId} onSelect={setSelectedClassId} />
          }
        </section>

        <ClassSummaryCards
          selectedClassId={selectedClassId}
          loadingStudents={loadingStudents}
          isMobile={isMobile}
          totalStudents={totalStudents}
          activeStudents={activeStudents}
          avgAccuracy={avgAccuracy}
        />

        {/* Student table */}
        <AssignmentSection
          assignments={assignments}
          loadingAssignments={loadingAssignments}
          selectedAssignmentId={selectedAssignmentId}
          submissionRows={submissionRows}
          loadingSubmissions={loadingSubmissions}
          onSelectAssignment={handleSelectAssignment}
        />

        <StudentProgressSection
          selectedClass={selectedClass}
          selectedClassId={selectedClassId}
          loadingStudents={loadingStudents}
          students={students}
          totalStudents={totalStudents}
          isMobile={isMobile}
        />

      </main>
      <PublishGrammarTaskModal
        open={publishOpen}
        selectedClass={selectedClass}
        isMobile={isMobile}
        onClose={() => setPublishOpen(false)}
        onSubmit={handlePublishTask}
        saving={publishing}
        error={publishError}
      />
    </div>
  );
}
