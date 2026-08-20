/* eslint-disable complexity */
import { useEffect, useMemo, useState } from "react";

import ListeningTopBar from "./ListeningTopBar.jsx";
import { listeningAPI, teacherDataAPI } from "../api/index.js";
import ModuleAssignmentSection from "../components/shared/ModuleAssignmentSection.jsx";
import ModuleWorkbenchPage from "../components/shared/ModuleWorkbenchPage.jsx";
import "./listening.css";

const ACTIONS = [
  { label: "布置听读任务", page: "listening-workbench" },
  { label: "查看听读成长", page: "listening-progress" },
  { label: "进入篇章精听", page: "listening-advanced" },
];

const LISTENING_MODULE_TYPES = [
  { value: 'listening',          label: '模拟练习' },
  { value: 'listening-basics',   label: '基础辨音' },
  { value: 'listening-advanced', label: '篇章精听' },
];

function formatDuration(durationMs = 0) {
  const minutes = Math.round(Number(durationMs || 0) / 60000);
  return minutes > 0 ? `${minutes} 分钟` : "0 分钟";
}

function formatDate(value) {
  if (!value) return "暂无记录";
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "暂无记录";
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

function getListeningRecord(detail) {
  return (detail?.modules?.realRecords || []).find((item) => item.moduleType === "listening") || null;
}

export default function ListeningWorkbenchPage({
  onNavigate,
  user,
  onLogin,
  onRegister,
  activePage = "listening-workbench",
  onAccountClick,
  hideTopBar = false,
}) {
  const [overview, setOverview] = useState(null);
  const [detail, setDetail] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (user?.role !== "teacher") {
      setOverview(null);
      setDetail(null);
      setStudents([]);
      setSelectedClassId("");
      setLoadError("");
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    setLoadError("");
    teacherDataAPI.overview()
      .then((data) => {
        if (!alive) return;
        setOverview(data);
        const classes = Array.isArray(data?.classes) ? data.classes : [];
        setSelectedClassId((current) => (
          current && classes.some((item) => (item.classId || item.id) === current)
            ? current
            : classes[0]?.classId || classes[0]?.id || ""
        ));
      })
      .catch((err) => {
        if (!alive) return;
        setOverview(null);
        setDetail(null);
        setStudents([]);
        setLoadError(err?.message || "听读教师数据加载失败");
      })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [user?.id, user?.role]);

  const classes = Array.isArray(overview?.classes) ? overview.classes : [];

  useEffect(() => {
    if (user?.role !== "teacher" || !selectedClassId) {
      setDetail(null);
      setStudents([]);
      return;
    }

    let alive = true;
    setLoading(true);
    setLoadError("");
    Promise.all([
      teacherDataAPI.classDetail(selectedClassId),
      listeningAPI.teacherClassProgress(selectedClassId),
    ])
      .then(([classDetail, studentProgress]) => {
        if (!alive) return;
        setDetail(classDetail);
        setStudents(Array.isArray(studentProgress) ? studentProgress : []);
      })
      .catch((err) => {
        if (!alive) return;
        setDetail(null);
        setStudents([]);
        setLoadError(err?.message || "听读教师数据加载失败");
      })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [selectedClassId, user?.role]);

  const listeningRecord = getListeningRecord(detail);
  const selectedClass = classes.find((item) => (item.classId || item.id) === selectedClassId);
  const selectedClassName = selectedClass?.className || selectedClass?.class_name || detail?.classSummary?.className || "当前班级";
  const stats = useMemo(() => {
    if (loading) return [{ label: "数据状态", value: "加载中", helper: "正在读取班级听读记录" }];
    if (loadError) return [{ label: "数据状态", value: "异常", helper: loadError }];
    if (!classes.length) return [];
    return [
      { label: "班级数", value: classes.length, helper: `${overview?.summary?.studentCount || 0} 名学生` },
      { label: "听读练习", value: listeningRecord?.sessions || 0, helper: "学生真实练习次数" },
      { label: "平均准确率", value: `${listeningRecord?.averageAccuracy || 0}%`, helper: `最近 ${formatDate(listeningRecord?.lastPracticedAt)}` },
      { label: "训练时长", value: formatDuration(listeningRecord?.durationMs), helper: "来自听读记录上报" },
    ];
  }, [classes.length, listeningRecord, loadError, loading, overview?.summary?.studentCount]);

  const classRows = useMemo(() => {
    if (!classes.length) return [];
    if (students.length) {
      return students.map((student) => ({
        name: `${student.realName || "未命名"}${student.studentNo ? ` · ${student.studentNo}` : ""}`,
        progress: `${student.listeningStats?.sessions || 0} 次练习`,
        focus: `${student.listeningStats?.averageAccuracy || 0}% 平均准确率`,
      }));
    }
    return [{
      name: selectedClassName,
      progress: `${listeningRecord?.sessions || 0} 次练习`,
      focus: `${listeningRecord?.averageAccuracy || 0}% 平均准确率`,
    }];
  }, [classes.length, listeningRecord, selectedClassName, students]);

  const suggestions = useMemo(() => {
    if (loading) return ["正在加载真实班级听读数据。"];
    if (loadError) return ["数据加载失败，请稍后重试或到教师数据页查看。"];
    if (!classes.length) return ["还没有可统计的班级，请先创建班级并让学生加入。"];
    if (!listeningRecord?.sessions) return ["当前班级暂无听读记录，可先布置一次基础辨音或模拟练习。"];
    const inactiveCount = students.filter((student) => !student.listeningStats?.sessions).length;
    if (inactiveCount > 0) return [`还有 ${inactiveCount} 名学生没有听读记录，建议先安排一次基础辨音任务。`];
    if ((listeningRecord.averageAccuracy || 0) < 80) return ["班级听读准确率低于 80%，建议先安排基础辨音和短句听写。"];
    return ["班级已有听读记录，可继续安排篇章精听并关注错词漏词。"];
  }, [classes.length, listeningRecord, loadError, loading, students]);

  return (
    <ModuleWorkbenchPage
      pageClass="ls-page"
      topBar={!hideTopBar ? (
        <ListeningTopBar
          onLogin={onLogin}
          onRegister={onRegister}
          user={user}
          onNavigate={onNavigate}
          activePage={activePage}
          onAccountClick={onAccountClick}
        />
      ) : null}
      moduleName="筑巢听读"
      title="看见听读断点，安排下一次训练。"
      subtitle="管理听辨、精听和模拟练习表现，帮助老师按班级薄弱点布置任务。"
      onNavigate={onNavigate}
      actions={ACTIONS}
      controls={classes.length > 1 ? (
        <div className="module-workbench-tabs">
          {classes.map((item) => {
            const classId = item.classId || item.id;
            return (
              <button
                key={classId}
                type="button"
                className={classId === selectedClassId ? "is-active" : ""}
                onClick={() => setSelectedClassId(classId)}
              >
                {item.className || item.class_name || "未命名班级"}
              </button>
            );
          })}
        </div>
      ) : null}
      stats={stats}
      classRows={classRows}
      suggestions={suggestions}
      dataConnected
      emptyTitle={loading ? "正在加载听读教师数据" : "暂无听读教师数据"}
      emptyMessage={loadError || `${selectedClassName}还没有听读练习记录。学生完成听读训练后，这里会显示次数、准确率和时长。`}
      extraSection={
        user?.role === 'teacher'
          ? <ModuleAssignmentSection user={user} moduleTypes={LISTENING_MODULE_TYPES} accentColor="#8a6800" />
          : null
      }
    />
  );
}
