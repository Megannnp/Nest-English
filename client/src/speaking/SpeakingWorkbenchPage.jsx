import { useEffect, useMemo, useState } from "react";

import SpeakingTopBar from "./SpeakingTopBar.jsx";
import { classesAPI, speakingAPI } from "../api/index.js";
import ModuleAssignmentSection from "../components/shared/ModuleAssignmentSection.jsx";
import ModuleWorkbenchPage from "../components/shared/ModuleWorkbenchPage.jsx";
import { formatModuleDuration, formatRecentRecordDate } from "../utils/format.js";
import "./speaking.css";

const ACTIONS = [
  { label: "布置口语任务", page: "speaking-workbench" },
  { label: "查看口语成长", page: "speaking-progress" },
  { label: "进入口语练习", page: "speaking" },
];

const SPEAKING_MODULE_TYPES = [
  { value: 'speaking', label: '口语练习' },
];

function formatDate(value) {
  return formatRecentRecordDate(value, { emptyLabel: "暂无记录" });
}

export default function SpeakingWorkbenchPage({
  onNavigate,
  user,
  onLogin,
  onRegister,
  activePage = "speaking-workbench",
  onAccountClick,
  hideTopBar = false,
}) {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (user?.role !== "teacher") {
      setClasses([]);
      setSelectedClassId("");
      setStudents([]);
      setLoadError("");
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setLoadError("");
    classesAPI.list()
      .then((response) => {
        if (!alive) return;
        const items = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
        setClasses(items);
        setSelectedClassId((current) => (
          current && items.some((item) => item.id === current) ? current : items[0]?.id || ""
        ));
      })
      .catch((err) => {
        if (!alive) return;
        setClasses([]);
        setSelectedClassId("");
        setStudents([]);
        setLoadError(err?.message || "口语教师数据加载失败");
      })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (user?.role !== "teacher" || !selectedClassId) {
      setStudents([]);
      return;
    }

    let alive = true;
    setLoading(true);
    setLoadError("");
    speakingAPI.teacherClassProgress(selectedClassId)
      .then((response) => {
        if (!alive) return;
        setStudents(Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []));
      })
      .catch((err) => {
        if (!alive) return;
        setStudents([]);
        setLoadError(err?.message || "口语教师数据加载失败");
      })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [selectedClassId, user?.role]);

  const selectedClass = classes.find((item) => item.id === selectedClassId);

  // Single pass over `students` instead of six separate filter/reduce/map
  // traversals for activeCount/totalSessions/totalDuration/averageScore/lastPracticedAt.
  const summary = useMemo(() => {
    let activeCount = 0;
    let totalSessions = 0;
    let totalDuration = 0;
    let scoredCount = 0;
    let scoredSum = 0;
    let lastPracticedAt = 0;

    for (const student of students) {
      const stats = student.speakingStats || {};
      const sessions = Number(stats.sessions || 0);
      const score = Number(stats.averageScore || 0);
      if (sessions > 0) activeCount += 1;
      totalSessions += sessions;
      totalDuration += Number(stats.durationMs || 0);
      if (sessions > 0 && score > 0) {
        scoredCount += 1;
        scoredSum += score;
      }
      const lastPracticed = Number(stats.lastPracticedAt || 0);
      if (lastPracticed > lastPracticedAt) lastPracticedAt = lastPracticed;
    }

    return {
      activeCount,
      totalSessions,
      totalDuration,
      averageScore: scoredCount ? Math.round(scoredSum / scoredCount) : 0,
      lastPracticedAt,
    };
  }, [students]);

  const stats = useMemo(() => {
    if (loading) return [{ label: "数据状态", value: "加载中", helper: "正在读取班级口语记录" }];
    if (loadError) return [{ label: "数据状态", value: "异常", helper: loadError }];
    if (!classes.length) return [];
    return [
      { label: "班级学生", value: students.length, helper: selectedClass?.className || "当前班级" },
      { label: "有口语记录", value: summary.activeCount, helper: `${summary.totalSessions} 次真实练习` },
      { label: "平均得分", value: summary.averageScore ? `${summary.averageScore}分` : "—", helper: `最近 ${formatDate(summary.lastPracticedAt)}` },
      { label: "训练时长", value: formatModuleDuration(summary.totalDuration), helper: "来自口语记录上报" },
    ];
  }, [classes.length, loadError, loading, selectedClass?.className, students.length, summary]);

  const classRows = useMemo(() => students.map((student) => ({
    name: `${student.realName || "未命名"}${student.studentNo ? ` · ${student.studentNo}` : ""}`,
    progress: `${student.speakingStats?.sessions || 0} 次练习`,
    focus: student.speakingStats?.averageScore ? `${student.speakingStats.averageScore} 分` : "暂无得分",
  })), [students]);

  const suggestions = useMemo(() => {
    if (loading) return ["正在加载真实班级口语数据。"];
    if (loadError) return ["数据加载失败，请稍后重试。"];
    if (!classes.length) return ["还没有可统计的班级，请先创建班级并让学生加入。"];
    if (!students.length) return ["当前班级还没有学生，导入或邀请学生后会显示口语数据。"];
    if (!summary.totalSessions) return ["当前班级暂无口语记录，可先布置一次情景对话或观点表达。"];
    const inactiveCount = students.length - summary.activeCount;
    if (inactiveCount > 0) return [`还有 ${inactiveCount} 名学生没有口语记录，建议先安排一次低门槛开口练习。`];
    if (summary.averageScore && summary.averageScore < 75) return ["班级口语平均分低于 75，建议先强化回答长度和题目关键词回应。"];
    return ["班级已有口语记录，可继续安排观点表达并跟踪表达长度。"];
  }, [classes.length, loadError, loading, students, summary]);

  return (
    <ModuleWorkbenchPage
      pageClass="sp-page"
      topBar={!hideTopBar ? (
        <SpeakingTopBar
          onLogin={onLogin}
          onRegister={onRegister}
          user={user}
          onNavigate={onNavigate}
          activePage={activePage}
          onAccountClick={onAccountClick}
        />
      ) : null}
      moduleName="筑巢口语"
      title="看见口语表达差异，安排针对性练习。"
      subtitle="管理口语练习入口，并按班级查看真实练习次数、得分和时长。"
      onNavigate={onNavigate}
      actions={ACTIONS}
      controls={classes.length > 1 ? (
        <div className="module-workbench-tabs">
          {classes.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === selectedClassId ? "is-active" : ""}
              onClick={() => setSelectedClassId(item.id)}
            >
              {item.className || item.class_name || "未命名班级"}
            </button>
          ))}
        </div>
      ) : null}
      stats={stats}
      classRows={classRows}
      suggestions={suggestions}
      dataConnected
      emptyTitle={loading ? "正在加载口语教师数据" : "暂无口语教师数据"}
      emptyMessage={loadError || `${selectedClass?.className || "当前班级"}还没有口语练习记录。学生完成口语训练后，这里会显示次数、得分和时长。`}
      extraSection={
        user?.role === 'teacher'
          ? <ModuleAssignmentSection user={user} moduleTypes={SPEAKING_MODULE_TYPES} accentColor="#2f6f8f" />
          : null
      }
    />
  );
}
