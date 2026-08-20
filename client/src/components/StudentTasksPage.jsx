import { useEffect, useMemo, useRef, useState } from 'react';

import { assignmentTasksAPI, grammarAPI, moduleAssignmentsAPI } from '../api/index.js';
import { PageHeader, StatusBanner } from './shared/UI.jsx';
import StudentSectionHeader from './student/StudentSectionHeader.jsx';
import { EmptyTasksState, ModuleEntrySection, MutedInfoState, TaskCard } from './StudentTasksView.jsx';

function collectTaskResults(results) {
  const values = results.map((result) => (
    result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []
  ));
  const rejected = results.filter((result) => result.status === 'rejected');
  const error = rejected.length === 0
    ? ''
    : rejected.length === results.length
      ? rejected[0]?.reason?.message || '任务加载失败'
      : '部分任务加载失败，已显示可获取的任务。';

  return {
    tasks: values.flat(),
    error,
  };
}

export default function StudentTasksPage({ isMobile = false, onOpenTask, onViewFeedback, onNavigate }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completingId, setCompletingId] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadTasks = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const results = await Promise.allSettled([
        assignmentTasksAPI.listMine(),
        grammarAPI.myTasks(),
        moduleAssignmentsAPI.listMine(),
      ]);
      if (!mountedRef.current) return;
      const next = collectTaskResults(results);
      setTasks(next.tasks);
      if (next.error) setError(next.error);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err?.message || '任务加载失败');
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const handleCompleteModule = async (task) => {
    if (completingId) return;
    setCompletingId(task.id);
    try {
      await moduleAssignmentsAPI.submit(task.id);
      if (mountedRef.current) void loadTasks({ silent: true });
    } catch (err) {
      if (mountedRef.current) setError(err?.message || '标记完成失败，请重试');
    } finally {
      if (mountedRef.current) setCompletingId(null);
    }
  };

  const hasActiveBackgroundTasks = useMemo(
    () => tasks.some((task) => task.status === 'submitted' || task.status === 'grading'),
    [tasks]
  );

  useEffect(() => {
    const intervalMs = hasActiveBackgroundTasks ? 5000 : 20000;
    const timer = window.setInterval(() => {
      void loadTasks({ silent: true });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [hasActiveBackgroundTasks]);

  const grouped = useMemo(() => {
    const buckets = {
      pending: [],
      grading: [],
      returned: [],
      overdue: [],
    };
    tasks.forEach((task) => {
      if (task.status === 'overdue') buckets.overdue.push(task);
      else if (task.status === 'returned' || task.status === 'completed') buckets.returned.push(task);
      else if (task.status === 'submitted' || task.status === 'grading') buckets.grading.push(task);
      else buckets.pending.push(task);
    });
    return buckets;
  }, [tasks]);

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "24px 16px 48px" : "40px 24px 64px" }}>
      <PageHeader
        titleZh="备考"
        subtitle="先处理老师布置的任务；没有任务时，可以从下方模块自由练习。"
        isMobile={isMobile}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 14 : 18 }}>
        {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
        {loading ? <MutedInfoState isMobile={isMobile}>正在加载任务列表...</MutedInfoState> : null}

        {!loading && !error && tasks.length === 0 ? (
          <>
            <EmptyTasksState isMobile={isMobile} />
            <ModuleEntrySection isMobile={isMobile} onNavigate={onNavigate} />
          </>
        ) : null}

        {[
          ['pending', '待完成任务', '优先处理老师刚布置或尚未提交的任务。'],
          ['grading', '批改中', '这些任务已经提交，系统正在生成反馈。'],
          ['returned', '已完成任务', '快速反馈已生成，语法任务完成后也会归入这里。'],
          ['overdue', '已逾期', '这些任务已超过截止时间，若允许补交可继续完成。'],
        ].map(([key, title, subtitle]) => (
          grouped[key]?.length ? (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <StudentSectionHeader title={title} subtitle={subtitle} badge={`${grouped[key].length} 项`} />
              {grouped[key].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onOpenTask={onOpenTask}
                  onViewFeedback={onViewFeedback}
                  onCompleteModule={handleCompleteModule}
                  completingId={completingId}
                  isMobile={isMobile}
                />
              ))}
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
}
