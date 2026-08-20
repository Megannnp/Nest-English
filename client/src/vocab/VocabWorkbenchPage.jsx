import { useEffect, useState } from "react";

import VocabTopBar from "./VocabTopBar.jsx";
import { vocabularyAPI } from "../api/index.js";
import ModuleAssignmentSection from "../components/shared/ModuleAssignmentSection.jsx";
import ModuleWorkbenchPage from "../components/shared/ModuleWorkbenchPage.jsx";
import "./vocab.css";

const ACTIONS = [
  { label: "布置词汇任务", page: "vocab-workbench" },
  { label: "进入词汇检测", page: "vocab-quiz" },
  { label: "查看词汇资源", page: "vocab-resources" },
];

const VOCAB_MODULE_TYPES = [
  { value: 'vocab',          label: '词汇检测' },
  { value: 'vocab-analyzer', label: '单词分析' },
  { value: 'vocab-courses',  label: '词汇精讲' },
];

function buildClassSummary(cls, students) {
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.vocabStats?.sessions > 0);
  const avgAccuracy = activeStudents.length
    ? Math.round(activeStudents.reduce((sum, s) => sum + (s.vocabStats.averageAccuracy || 0), 0) / activeStudents.length)
    : null;
  return {
    name: cls.className,
    progress: `${activeStudents.length}/${totalStudents} 已练习`,
    focus: avgAccuracy != null ? `平均正确率 ${avgAccuracy}%` : "暂无练习记录",
    totalStudents,
    activeStudents: activeStudents.length,
    avgAccuracy,
  };
}

export default function VocabWorkbenchPage({
  onNavigate,
  user,
  onLogin,
  onRegister,
  activePage = "vocab-workbench",
  onAccountClick,
  hideTopBar = false,
}) {
  const [classSummaries, setClassSummaries] = useState(null);

  useEffect(() => {
    if (user?.role !== 'teacher') return;
    let cancelled = false;
    vocabularyAPI.teacherClasses()
      .then(async (classes) => {
        const list = Array.isArray(classes) ? classes : [];
        const summaries = await Promise.all(list.map(async (cls) => {
          const students = await vocabularyAPI.teacherClassProgress(cls.id).catch(() => []);
          return buildClassSummary(cls, Array.isArray(students) ? students : []);
        }));
        if (!cancelled) setClassSummaries(summaries);
      })
      .catch(() => { if (!cancelled) setClassSummaries([]); });
    return () => { cancelled = true; };
  }, [user?.role]);

  const dataConnected = classSummaries !== null;
  const classRows = classSummaries || [];
  const totalStudents = classRows.reduce((sum, c) => sum + c.totalStudents, 0);
  const totalActive = classRows.reduce((sum, c) => sum + c.activeStudents, 0);
  const classesWithAccuracy = classRows.filter((c) => c.avgAccuracy != null);
  const overallAccuracy = classesWithAccuracy.length
    ? Math.round(classesWithAccuracy.reduce((sum, c) => sum + c.avgAccuracy, 0) / classesWithAccuracy.length)
    : null;

  const stats = dataConnected && classRows.length ? [
    { label: "班级数量", value: classRows.length, helper: "已加入词汇学习的班级" },
    { label: "参与学生", value: `${totalActive}/${totalStudents}`, helper: "已完成至少一次词汇练习" },
    { label: "平均正确率", value: overallAccuracy != null ? `${overallAccuracy}%` : "-", helper: "闪卡/词表练习平均准确率" },
  ] : [];

  return (
    <ModuleWorkbenchPage
      pageClass="vc-page"
      topBar={!hideTopBar ? (
        <VocabTopBar
          onLogin={onLogin}
          onRegister={onRegister}
          user={user}
          onNavigate={onNavigate}
          activePage={activePage}
          onAccountClick={onAccountClick}
        />
      ) : null}
      moduleName="筑巢词汇"
      title="看见词汇掌握差异，安排分层复习。"
      subtitle="管理阅读词汇、写作词汇和闪卡复习表现，让词汇学习与课堂任务衔接。"
      onNavigate={onNavigate}
      actions={ACTIONS}
      stats={stats}
      classRows={classRows}
      dataConnected={dataConnected}
      emptyTitle="暂无班级数据"
      emptyMessage="学生产生词汇练习记录后，这里会显示班级完成情况与平均正确率。"
      extraSection={
        user?.role === 'teacher'
          ? <ModuleAssignmentSection user={user} moduleTypes={VOCAB_MODULE_TYPES} accentColor="#1a5fa8" />
          : null
      }
    />
  );
}
