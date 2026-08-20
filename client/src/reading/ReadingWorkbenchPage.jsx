import { useEffect, useMemo, useState } from "react";

import ReadingTopBar from "./ReadingTopBar.jsx";
import { classesAPI, readingAPI } from "../api/index.js";
import AppIcon from "../components/shared/AppIcon.jsx";
import ModuleAssignmentSection from "../components/shared/ModuleAssignmentSection.jsx";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "../components/shared/moduleLearningPages.css";
import "./reading.css";

const READING_MODULE_TYPES = [
  { value: 'reading',          label: '阅读练习' },
  { value: 'reading-paper',    label: '阅读模拟卷' },
  { value: 'reading-courses',  label: '阅读课程' },
];

function WorkbenchStat({ label, value, helper }) {
  return (
    <div className="module-workbench-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </div>
  );
}

function WorkbenchPanel({ title, children }) {
  return (
    <section className="module-workbench-panel studio-reveal studio-reveal--delay-1">
      <div className="module-workbench-panel__head">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function pct(correct, total) {
  const safeTotal = Number(total || 0);
  if (safeTotal <= 0) return null;
  return Math.round((Number(correct || 0) / safeTotal) * 100);
}

function formatDate(value) {
  if (!value) return "暂无记录";
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "暂无记录";
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function getResponseData(response) {
  return response?.data ?? response ?? [];
}

function ReadingClassPanel({ classes, selectedClassId, students, error, loadingClasses, loadingStudents, onSelectClass }) {
  return (
    <WorkbenchPanel title="班级阅读概览">
      {classes.length > 0 && (
        <div className="module-workbench-tabs">
          {classes.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === selectedClassId ? "is-active" : ""}
              onClick={() => onSelectClass(item.id)}
            >
              {item.className}
            </button>
          ))}
        </div>
      )}
      {error && <p className="module-workbench-empty module-workbench-empty--panel">{error}</p>}
      {!error && (loadingClasses || loadingStudents) && (
        <p className="module-workbench-empty module-workbench-empty--panel">正在加载真实班级阅读数据...</p>
      )}
      {!error && !loadingClasses && !classes.length && (
        <p className="module-workbench-empty module-workbench-empty--panel">还没有可统计的班级。创建班级并让学生加入后，这里会显示阅读练习和解析记录。</p>
      )}
      {!error && !loadingStudents && classes.length > 0 && !students.length && (
        <p className="module-workbench-empty module-workbench-empty--panel">当前班级还没有学生阅读数据。学生完成阅读练习或思维解析后会显示进度。</p>
      )}
      <div className="module-class-list">
        {!error && !loadingStudents && students.map((item) => {
          const data = item.readingStats || {};
          const accuracy = pct(data.correctQuestions, data.totalQuestions);
          const lastActive = Math.max(Number(data.lastPracticedAt || 0), Number(data.analyses?.lastAnalyzedAt || 0));
          return (
            <div key={item.id} className="module-class-row">
              <span><AppIcon name="classes" size={18} /></span>
              <div>
                <strong>{item.realName || "未命名"}{item.studentNo ? ` · ${item.studentNo}` : ""}</strong>
                <p>
                  {Number(data.sessions || 0)} 次练习 · {Number(data.totalQuestions || 0)} 题
                  · 正确率 {accuracy == null ? "—" : `${accuracy}%`}
                  · 解析 {Number(data.analyses?.total || 0)} 次
                </p>
                <p>最近记录：{formatDate(lastActive)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </WorkbenchPanel>
  );
}

export default function ReadingWorkbenchPage({
  onNavigate,
  user,
  onLogin,
  onRegister,
  activePage = "reading-workbench",
  onAccountClick,
  hideTopBar = false,
}) {
  const pageRef = useScrollReveal();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) {
      setClasses([]);
      setSelectedClassId("");
      setStudents([]);
      return;
    }

    let alive = true;
    setLoadingClasses(true);
    setError("");
    classesAPI.list()
      .then((response) => {
        if (!alive) return;
        const items = Array.isArray(getResponseData(response)) ? getResponseData(response) : [];
        setClasses(items);
        setSelectedClassId((current) => (
          items.some((item) => item.id === current) ? current : items[0]?.id || ""
        ));
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || "加载班级失败");
        setClasses([]);
        setSelectedClassId("");
      })
      .finally(() => {
        if (alive) setLoadingClasses(false);
      });

    return () => { alive = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      return;
    }

    let alive = true;
    setLoadingStudents(true);
    setError("");
    readingAPI.teacherClassProgress(selectedClassId)
      .then((response) => {
        if (!alive) return;
        const items = Array.isArray(getResponseData(response)) ? getResponseData(response) : [];
        setStudents(items);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.message || "加载阅读数据失败");
        setStudents([]);
      })
      .finally(() => {
        if (alive) setLoadingStudents(false);
      });

    return () => { alive = false; };
  }, [selectedClassId]);

  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const stats = useMemo(() => {
    const active = students.filter((student) => {
      const data = student.readingStats || {};
      return Number(data.sessions || 0) > 0 || Number(data.analyses?.total || 0) > 0;
    });
    const accuracyRows = students
      .map((student) => student.readingStats || {})
      .filter((item) => Number(item.totalQuestions || 0) > 0);
    const averageAccuracy = accuracyRows.length
      ? Math.round(accuracyRows.reduce((sum, item) => sum + (pct(item.correctQuestions, item.totalQuestions) || 0), 0) / accuracyRows.length)
      : null;
    const totalAnalyses = students.reduce((sum, student) => sum + Number(student.readingStats?.analyses?.total || 0), 0);

    return [
      { label: "班级学生", value: students.length, helper: selectedClass ? selectedClass.className : "选择班级后显示" },
      { label: "有阅读记录", value: active.length, helper: "练习或解析至少一次" },
      { label: "平均正确率", value: averageAccuracy == null ? "—" : `${averageAccuracy}%`, helper: "仅统计已答题学生" },
      { label: "思维解析", value: totalAnalyses, helper: "学生真实解析次数" },
    ];
  }, [selectedClass, students]);

  const suggestions = useMemo(() => {
    if (loadingClasses || loadingStudents) return ["正在加载真实班级数据。"];
    if (error) return ["数据加载失败后不展示推断建议，请先重试。"];
    if (!classes.length) return ["还没有可统计的班级，请先创建班级并让学生加入。"];
    if (!students.length) return ["当前班级还没有学生，导入或邀请学生后会显示阅读数据。"];

    const activeCount = students.filter((student) => {
      const data = student.readingStats || {};
      return Number(data.sessions || 0) > 0 || Number(data.analyses?.total || 0) > 0;
    }).length;
    if (activeCount === 0) return ["当前班级暂无阅读记录，可先通过题库组卷布置一次练习。"];

    const weakRows = students
      .map((student) => ({
        name: student.realName || "未命名",
        accuracy: pct(student.readingStats?.correctQuestions, student.readingStats?.totalQuestions),
      }))
      .filter((item) => item.accuracy != null && item.accuracy < 70);
    if (weakRows.length) {
      return [
        `${weakRows.length} 名学生阅读正确率低于 70%，建议安排错题复盘。`,
        "可结合阅读精讲页讲解定位句、题型和错因。",
        "没有答题记录的学生不参与正确率判断。",
      ];
    }

    return [
      "当前有记录学生的正确率整体稳定，可继续布置不同文体练习。",
      "建议让学生把思维解析结果与错题复盘关联起来。",
    ];
  }, [classes.length, error, loadingClasses, loadingStudents, students]);

  const weakStudents = useMemo(() => students
    .map((student) => ({
      id: student.id,
      name: student.realName || "未命名",
      accuracy: pct(student.readingStats?.correctQuestions, student.readingStats?.totalQuestions),
      totalQuestions: Number(student.readingStats?.totalQuestions || 0),
      wrongCount: Number(student.readingStats?.wrongQuestions || 0),
    }))
    .filter((student) => student.totalQuestions > 0 && student.accuracy != null && student.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5), [students]);

  return (
    <div className="rd-page module-learning-page" ref={pageRef}>
      {!hideTopBar && (

        <ReadingTopBar
        onLogin={onLogin}
        onRegister={onRegister}
        user={user}
        onNavigate={onNavigate}
        activePage={activePage}
        onAccountClick={onAccountClick}
      />

      )}

      <main className="module-workbench-page">
        <PageHero eyebrow="筑巢阅读 · 教师工作台" title="看见阅读问题，安排下一次训练。" description="管理阅读练习、题库组卷和班级阅读表现，保持与阅读模块一致的教学闭环。" />

        <div className="module-workbench-actions studio-reveal studio-reveal--delay-1">
          <button type="button" className="gm-btn-primary" onClick={() => onNavigate?.("reading-paper")}>
            阅读题库组卷
          </button>
          <button type="button" className="gm-btn-secondary" onClick={() => onNavigate?.("reading-progress")}>
            查看阅读成长
          </button>
          <button type="button" className="gm-btn-secondary" onClick={() => onNavigate?.("reading-courses")}>
            阅读精讲备课
          </button>
        </div>

        <section className="module-workbench-stats studio-reveal studio-reveal--delay-1">
          {stats.map((item) => <WorkbenchStat key={item.label} {...item} />)}
        </section>

        <div className="module-workbench-grid">
          <ReadingClassPanel
            classes={classes}
            selectedClassId={selectedClassId}
            students={students}
            error={error}
            loadingClasses={loadingClasses}
            loadingStudents={loadingStudents}
            onSelectClass={setSelectedClassId}
          />

          <WorkbenchPanel title="下一步建议">
            <div className="module-workbench-todo">
              {suggestions.map((item, index) => (
                <p key={item}>{index + 1}. {item}</p>
              ))}
            </div>
            <div className="module-workbench-actions" style={{ marginTop: 16 }}>
              <button type="button" className="gm-btn-primary" onClick={() => onNavigate?.("reading-paper")}>
                布置阅读组卷
              </button>
              <button type="button" className="gm-btn-secondary" onClick={() => onNavigate?.("reading-courses")}>
                打开精讲备课
              </button>
              <button type="button" className="gm-btn-secondary" onClick={() => onNavigate?.("reading-practice")}>
                进入错题复练
              </button>
            </div>
            {weakStudents.length > 0 && (
              <div className="module-class-list" style={{ marginTop: 16 }}>
                {weakStudents.map((student) => (
                  <div key={student.id} className="module-class-row">
                    <span><AppIcon name="chart" size={18} /></span>
                    <div>
                      <strong>{student.name}</strong>
                      <p>优先关注 · 正确率 {student.accuracy}% · 累计错题 {student.wrongCount}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WorkbenchPanel>
        </div>

        {user?.role === 'teacher' && (
          <div className="module-workbench-section studio-reveal studio-reveal--delay-1">
            <ModuleAssignmentSection user={user} moduleTypes={READING_MODULE_TYPES} accentColor="#1f7a5c" />
          </div>
        )}
      </main>
    </div>
  );
}
