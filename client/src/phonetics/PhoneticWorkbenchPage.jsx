import { useEffect, useMemo, useState } from "react";

import PhoneticTopBar from "./PhoneticTopBar.jsx";
import { classesAPI, phoneticsAPI } from "../api/index.js";
import ModuleAssignmentSection from "../components/shared/ModuleAssignmentSection.jsx";
import ModuleWorkbenchPage from "../components/shared/ModuleWorkbenchPage.jsx";
import { formatModuleDuration, formatRecentRecordDate } from "../utils/format.js";
import "./phonetics.css";

const ACTIONS = [
  { label: "布置语音任务", page: "phonetics-workbench" },
  { label: "查看语音成长", page: "phonetics-progress" },
  { label: "进入语音总览", page: "phonetics-overview" },
];

const PHONETICS_MODULE_TYPES = [
  { value: 'phonetics',           label: '音素训练' },
  { value: 'phonetics-syllable',  label: '音节训练' },
  { value: 'phonetics-sentence',  label: '句子语音' },
  { value: 'phonetics-discourse', label: '语篇语音' },
];

function formatDate(value) {
  return formatRecentRecordDate(value, { emptyLabel: "暂无记录" });
}

export default function PhoneticWorkbenchPage({
  onNavigate,
  user,
  onLogin,
  onRegister,
  activePage = "phonetics-workbench",
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
        setLoadError(err?.message || "语音教师数据加载失败");
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
    phoneticsAPI.teacherClassProgress(selectedClassId)
      .then((response) => {
        if (!alive) return;
        setStudents(Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []));
      })
      .catch((err) => {
        if (!alive) return;
        setStudents([]);
        setLoadError(err?.message || "语音教师数据加载失败");
      })
      .finally(() => { if (alive) setLoading(false); });

    return () => { alive = false; };
  }, [selectedClassId, user?.role]);

  const selectedClass = classes.find((item) => item.id === selectedClassId);

  // Single pass over `students` instead of separate filter/reduce/map
  // traversals for activeCount/totalSessions/totalDuration/averageAccuracy/lastPracticedAt.
  const summary = useMemo(() => {
    let activeCount = 0;
    let totalSessions = 0;
    let totalDuration = 0;
    let scoredCount = 0;
    let scoredSum = 0;
    let lastPracticedAt = 0;

    for (const student of students) {
      const stats = student.phoneticsStats || {};
      const sessions = Number(stats.sessions || 0);
      const accuracy = Number(stats.averageAccuracy || 0);
      if (sessions > 0) activeCount += 1;
      totalSessions += sessions;
      totalDuration += Number(stats.durationMs || 0);
      if (sessions > 0 && accuracy > 0) {
        scoredCount += 1;
        scoredSum += accuracy;
      }
      const lastPracticed = Number(stats.lastPracticedAt || 0);
      if (lastPracticed > lastPracticedAt) lastPracticedAt = lastPracticed;
    }

    return {
      activeCount,
      totalSessions,
      totalDuration,
      averageAccuracy: scoredCount ? Math.round(scoredSum / scoredCount) : 0,
      lastPracticedAt,
    };
  }, [students]);

  const stats = useMemo(() => {
    if (loading) return [{ label: "数据状态", value: "加载中", helper: "正在读取班级语音记录" }];
    if (loadError) return [{ label: "数据状态", value: "异常", helper: loadError }];
    if (!classes.length) return [];
    return [
      { label: "班级学生", value: students.length, helper: selectedClass?.className || "当前班级" },
      { label: "有语音记录", value: summary.activeCount, helper: `${summary.totalSessions} 次真实练习` },
      { label: "平均准确率", value: summary.averageAccuracy ? `${summary.averageAccuracy}%` : "—", helper: `最近 ${formatDate(summary.lastPracticedAt)}` },
      { label: "训练时长", value: formatModuleDuration(summary.totalDuration), helper: "来自语音记录上报" },
    ];
  }, [classes.length, loadError, loading, selectedClass?.className, students.length, summary]);

  const classRows = useMemo(() => students.map((student) => ({
    name: `${student.realName || "未命名"}${student.studentNo ? ` · ${student.studentNo}` : ""}`,
    progress: `${student.phoneticsStats?.sessions || 0} 次练习`,
    focus: student.phoneticsStats?.averageAccuracy ? `${student.phoneticsStats.averageAccuracy}% 准确率` : "暂无记录",
  })), [students]);

  const suggestions = useMemo(() => {
    if (loading) return ["正在加载真实班级语音数据。"];
    if (loadError) return ["数据加载失败，请稍后重试。"];
    if (!classes.length) return ["还没有可统计的班级，请先创建班级并让学生加入。"];
    if (!students.length) return ["当前班级还没有学生，导入或邀请学生后会显示语音数据。"];
    if (!summary.totalSessions) return ["当前班级暂无语音记录，可先布置一次音素或音节训练。"];
    const inactiveCount = students.length - summary.activeCount;
    if (inactiveCount > 0) return [`还有 ${inactiveCount} 名学生没有语音记录，建议先安排一次基础音素训练。`];
    if (summary.averageAccuracy && summary.averageAccuracy < 75) return ["班级语音平均准确率低于 75%，建议先强化易混淆音素和辅音对比。"];
    return ["班级已有语音记录，可继续安排句子语流训练并跟踪准确率。"];
  }, [classes.length, loadError, loading, students, summary]);

  return (
    <ModuleWorkbenchPage
      pageClass="ph-page"
      topBar={!hideTopBar ? (
        <PhoneticTopBar
          onLogin={onLogin}
          onRegister={onRegister}
          user={user}
          onNavigate={onNavigate}
          activePage={activePage}
          onAccountClick={onAccountClick}
        />
      ) : null}
      moduleName="筑巢语音"
      title="看见发音问题，安排基础训练。"
      subtitle="管理音素、拼读和句子朗读入口，并按班级查看真实训练次数、准确率和时长。"
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
      emptyTitle={loading ? "正在加载语音教师数据" : "暂无语音教师数据"}
      emptyMessage={loadError || `${selectedClass?.className || "当前班级"}还没有语音训练记录。学生完成语音训练后，这里会显示次数、准确率和时长。`}
      extraSection={
        user?.role === 'teacher'
          ? <ModuleAssignmentSection user={user} moduleTypes={PHONETICS_MODULE_TYPES} accentColor="#a0307a" />
          : null
      }
    />
  );
}
