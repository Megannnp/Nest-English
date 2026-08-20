import { useEffect, useState } from "react";

import { MODULE_LABELS, PARENT_COLOR, PARENT_MODULES, ParentButton, ParentNotice, ParentPanelHeader, ParentSurface } from "./ParentPagePrimitives.jsx";
import { parentAPI } from "../api/index.js";

export function ParentDashboard({ activeTab, childrenOverview, isMobile, loading, selectedChild, selectedChildId, setActiveTab, setSelectedChildId, summary }) {
  if (loading) {
    return <ParentNotice>正在加载...</ParentNotice>;
  }

  if (childrenOverview.length === 0) {
    return (
      <ParentSurface style={{ padding: 18, display: "grid", gap: 12 }}>
        <strong style={{ color: PARENT_COLOR.text }}>还没有绑定孩子</strong>
        <span style={{ color: PARENT_COLOR.textSecondary, lineHeight: 1.7 }}>
          让孩子在学生端“我的”页面生成家长绑定码，输入后即可查看作业、成长周报和权益用量。
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <MiniStat label="第 1 步" value="孩子生成绑定码" />
          <MiniStat label="第 2 步" value="家长输入绑定码" />
          <MiniStat label="第 3 步" value="查看成长周报" />
        </div>
      </ParentSurface>
    );
  }

  return (
    <>
      <ParentSurface style={{ padding: 16, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: PARENT_COLOR.textMuted, fontWeight: 800 }}>当前孩子</div>
            <div style={{ marginTop: 4, fontSize: 22, color: PARENT_COLOR.text, fontWeight: 900 }}>{selectedChild?.name || "未选择"}</div>
            <div style={{ marginTop: 4, color: PARENT_COLOR.textSecondary, fontSize: 13 }}>
              {[selectedChild?.className, selectedChild?.studentNo ? `学号 ${selectedChild.studentNo}` : "", summary.childCount > 1 ? `共 ${summary.childCount} 个孩子` : ""].filter(Boolean).join(" · ") || "学生信息待完善"}
            </div>
          </div>
          <select
            aria-label="选择孩子"
            value={selectedChildId || selectedChild?.id || ""}
            onChange={(event) => setSelectedChildId(event.target.value)}
            style={{ minWidth: 180, border: `1px solid ${PARENT_COLOR.borderStrong}`, borderRadius: 8, padding: "9px 12px", background: PARENT_COLOR.surface, font: "inherit", color: PARENT_COLOR.text, fontWeight: 700 }}
          >
            {childrenOverview.map((child) => (
              <option key={child.id} value={child.id}>{child.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
          {[
            ["overview", "概览"],
            ["tasks", "任务"],
            ["growth", "成长"],
            ["entitlements", "权益"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{ minHeight: 38, border: `1px solid ${activeTab === key ? PARENT_COLOR.text : PARENT_COLOR.borderStrong}`, borderRadius: 8, background: activeTab === key ? PARENT_COLOR.text : PARENT_COLOR.surface, color: activeTab === key ? PARENT_COLOR.inverse : PARENT_COLOR.text, font: "inherit", fontSize: 13, fontWeight: 800, padding: "8px 10px", cursor: "pointer" }}
            >
              {label}
            </button>
          ))}
        </div>
      </ParentSurface>

      {activeTab === "overview" ? (
        <ParentOverviewPanel child={selectedChild} setActiveTab={setActiveTab} />
      ) : (
        <ParentChildPanel activeTab={activeTab} child={selectedChild} isMobile={isMobile} />
      )}
    </>
  );
}

function ParentChildPanel({ activeTab, child, isMobile = false }) {
  const [tasksData, setTasksData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [entitlementsData, setEntitlementsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!child?.id || activeTab === "overview") return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (activeTab === "tasks") {
          const data = await parentAPI.childTasks(child.id);
          if (!cancelled) setTasksData(data);
        }
        if (activeTab === "growth") {
          const data = await parentAPI.childProgress(child.id);
          if (!cancelled) setProgressData(data);
        }
        if (activeTab === "entitlements") {
          const data = await parentAPI.childEntitlements(child.id);
          if (!cancelled) setEntitlementsData(data);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "数据加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, child?.id]);

  useEffect(() => {
    setTasksData(null);
    setProgressData(null);
    setEntitlementsData(null);
  }, [child?.id]);

  if (!child) return null;
  const activeData = activeTab === "tasks" ? tasksData : activeTab === "growth" ? progressData : activeTab === "entitlements" ? entitlementsData : null;
  if (error) return <Panel title={child.name} isMobile={isMobile}><span style={{ color: PARENT_COLOR.textSecondary }}>{error}</span></Panel>;
  if (loading || !activeData) return <Panel title={child.name} isMobile={isMobile}>正在加载...</Panel>;
  if (activeTab === "tasks") return <ParentTasksPanel child={child} data={tasksData} isMobile={isMobile} />;
  if (activeTab === "growth") return <ParentProgressPanel child={child} data={progressData} isMobile={isMobile} />;
  if (activeTab === "entitlements") return <ParentEntitlementsPanel child={child} data={entitlementsData} isMobile={isMobile} />;
  return null;
}

function Panel({ title, children, isMobile = false }) {
  return (
    <ParentSurface style={{ overflow: "hidden" }}>
      <ParentPanelHeader title={title} isMobile={isMobile} />
      <div style={{ padding: isMobile ? "14px 16px 18px" : "16px 22px 22px", display: "grid", gap: 14 }}>
        {children}
      </div>
    </ParentSurface>
  );
}

function ParentTasksPanel({ child, data, isMobile = false }) {
  const tasks = data?.tasks || [];
  const groups = [
    ["pending", "待完成"],
    ["submitted", "已提交"],
    ["grading", "批改中"],
    ["returned", "已返回"],
    ["completed", "已完成"],
    ["overdue", "已逾期"],
  ];
  const visibleGroups = groups
    .map(([status, label]) => [status, label, tasks.filter((task) => task.status === status)])
    .filter(([, , items]) => items.length > 0);
  return (
    <Panel title={`${child.name}的任务`} isMobile={isMobile}>
      {visibleGroups.length ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {visibleGroups.map(([status, label, items]) => (
            <ListBlock key={status} title={`${label} ${items.length}`} empty="暂无">
              {items.map((task) => (
                <Row
                  key={`${task.taskType}-${task.id}`}
                  title={task.assignment?.title || task.title || "未命名任务"}
                  meta={`${getTaskTypeLabel(task.taskType)} · ${task.assignment?.className || task.className || "班级"}`}
                  value={task.latestScore ?? task.score ?? ""}
                />
              ))}
            </ListBlock>
          ))}
        </div>
      ) : (
        <ParentNotice>暂无任务</ParentNotice>
      )}
    </Panel>
  );
}

function ParentProgressPanel({ child, data, isMobile = false }) {
  const modules = data?.modules || {};
  const weekly = data?.weekly || {};
  return (
    <Panel title={`${child.name}的成长记录`} isMobile={isMobile}>
      <WeeklyReport weekly={weekly} />
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {PARENT_MODULES.map((module) => (
          <Metric key={module.key} label={module.label} value={formatModuleValue(modules[module.key], module.valueKeys)} />
        ))}
      </section>
      <ListBlock title={`近 7 天周报 · ${weekly.totalEvents || 0} 条记录`} empty="暂无近 7 天学习记录">
        {Object.entries(weekly.byModule || {}).map(([module, count]) => (
          <Row key={module} title={getTaskTypeLabel(module)} meta="学习事件" value={count} />
        ))}
      </ListBlock>
      <ListBlock title="最近动态" empty="暂无动态">
        {(weekly.recent || []).map((event) => (
          <Row key={event.id} title={getLearningEventLabel(event)} meta={`${getTaskTypeLabel(event.module)} · ${formatDate(event.createdAt)}`} value="" />
        ))}
      </ListBlock>
    </Panel>
  );
}

function normalizeWeeklyReport(weekly = {}) {
  const taskSummary = weekly?.taskSummary || {};
  const entitlementSummary = weekly?.entitlementSummary || {};
  const moduleBreakdown = weekly.moduleBreakdown || Object.entries(weekly.byModule || {}).map(([module, count]) => ({ module, count }));
  return {
    totalEvents: weekly.totalEvents || 0,
    activeDays: weekly.activeDays || 0,
    taskSummary,
    entitlementSummary,
    moduleBreakdown,
    suggestions: weekly.suggestions || [],
    topModuleLabel: weekly.topModule?.module ? getTaskTypeLabel(weekly.topModule.module) : "暂无",
  };
}

function WeeklyReport({ weekly }) {
  const report = normalizeWeeklyReport(weekly);
  return (
    <ParentSurface style={{ padding: 16, background: PARENT_COLOR.surfaceMuted }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, color: PARENT_COLOR.textMuted, fontWeight: 800 }}>本周学习报告</div>
          <h3 style={{ margin: "5px 0 0", color: PARENT_COLOR.text, fontSize: 18 }}>近 7 天完成 {report.totalEvents} 条学习记录</h3>
        </div>
        <strong style={{ color: PARENT_COLOR.text, fontSize: 13 }}>活跃 {report.activeDays} 天</strong>
      </div>
      <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        <MiniStat label="重点模块" value={report.topModuleLabel} />
        <MiniStat label="待完成" value={report.taskSummary.pending || 0} />
        <MiniStat label="逾期任务" value={report.taskSummary.overdue || 0} />
        <MiniStat label="已完成任务" value={report.taskSummary.completed || 0} />
        <MiniStat label="积分余额" value={report.entitlementSummary.balance || 0} />
        <MiniStat label="已消耗积分" value={report.entitlementSummary.totalSpent || 0} />
        <MiniStat label="权益数量" value={report.entitlementSummary.entitlementCount || 0} />
        <MiniStat label="本期用量" value={report.entitlementSummary.usedQuotaCount || 0} />
      </section>
      <ReportBlock title="模块表现" empty="暂无模块记录">
        {report.moduleBreakdown.map((item) => (
          <Row key={item.module} title={getTaskTypeLabel(item.module)} meta="本周学习记录" value={item.count} />
        ))}
      </ReportBlock>
      <ReportBlock title="本周建议" empty="暂无建议">
        {report.suggestions.map((item) => <Row key={item} title={item} meta="家长关注点" value="" />)}
      </ReportBlock>
    </ParentSurface>
  );
}

function ParentEntitlementsPanel({ child, data, isMobile = false }) {
  const membership = data?.membership;
  const quotaUsages = data?.quotaUsages || [];
  const entitlements = data?.entitlements || [];
  return (
    <Panel title={`${child.name}的订阅与权益`} isMobile={isMobile}>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Metric label="会员状态" value={getMembershipLabel(membership)} />
        <Metric label="到期时间" value={membership?.expiresAt ? formatDate(membership.expiresAt) : "-"} />
        <Metric label="积分余额" value={data?.balance ?? 0} />
        <Metric label="待入账积分" value={data?.pendingPoints ?? 0} />
        <Metric label="权益数量" value={entitlements.length} />
      </section>
      <ListBlock title="本期用量" empty="暂无用量数据">
        {quotaUsages.map((item) => (
          <Row
            key={item.unit || item.id}
            title={getQuotaLabel(item.unit)}
            meta={`已用 ${item.used ?? 0} / ${item.quota ?? "-"}`}
            value={item.balance ?? ""}
          />
        ))}
      </ListBlock>
      <ListBlock title="已开通权益" empty="暂无权益">
        {entitlements.map((item) => (
          <Row key={item.unit || item.id} title={getQuotaLabel(item.unit)} meta={`已用 ${item.totalUsed ?? 0} / 累计 ${item.totalAdded ?? 0}`} value={item.balance ?? ""} />
        ))}
      </ListBlock>
    </Panel>
  );
}

function Metric({ label, value }) {
  return (
    <ParentSurface style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: PARENT_COLOR.textMuted, fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 26, fontWeight: 900, color: PARENT_COLOR.text }}>{value}</div>
    </ParentSurface>
  );
}

function MiniStat({ label, value }) {
  return (
    <div style={{ border: `1px solid ${PARENT_COLOR.border}`, borderRadius: 8, padding: "10px 12px", background: PARENT_COLOR.surface }}>
      <div style={{ color: PARENT_COLOR.textMuted, fontSize: 12, fontWeight: 700 }}>{label}</div>
      <div style={{ marginTop: 4, color: PARENT_COLOR.text, fontSize: 20, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function ReportBlock({ title, empty, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <section style={{ marginTop: 14 }}>
      <h4 style={{ margin: "0 0 8px", color: PARENT_COLOR.text, fontSize: 14 }}>{title}</h4>
      {items.length ? <div style={{ display: "grid", gap: 8 }}>{items}</div> : <div style={{ color: PARENT_COLOR.textMuted, fontSize: 13 }}>{empty}</div>}
    </section>
  );
}

function ParentOverviewPanel({ child, setActiveTab }) {
  if (!child) return null;
  const tasks = child.tasks || [];
  const pendingTasks = child.summary?.pendingTasks || 0;
  const completedTasks = child.summary?.returnedTasks || 0;

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <ParentFamilySummaryPanel child={child} setActiveTab={setActiveTab} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Metric label="待处理任务" value={pendingTasks} />
        <Metric label="近期任务" value={tasks.length} />
        <Metric label="已完成任务" value={completedTasks} />
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <ListBlock title="近期作业" empty="暂无作业">
          {tasks.map((task) => (
            <Row
              key={`${task.taskType || "task"}-${task.id}`}
              title={task.assignment?.title || task.title || "未命名作业"}
              meta={`${getTaskTypeLabel(task.taskType)} · ${task.assignment?.className || task.className || "班级"} · ${getTaskStatusLabel(task.status)}`}
              value={task.latestScore ?? ""}
            />
          ))}
        </ListBlock>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <ParentButton onClick={() => setActiveTab("tasks")}>查看全部任务</ParentButton>
        <ParentButton onClick={() => setActiveTab("growth")}>查看成长记录</ParentButton>
        <ParentButton onClick={() => setActiveTab("entitlements")}>查看权益</ParentButton>
      </div>
    </section>
  );
}

function getFamilyInsights(child) {
  const summary = child?.summary || {};
  const tasks = child?.tasks || [];
  const pendingTasks = Number(summary.pendingTasks || 0);
  const returnedTasks = Number(summary.returnedTasks || 0);
  const totalWritings = Number(summary.totalWritings || 0);
  const overdueTasks = tasks.filter((task) => task.status === "overdue").length;
  const activeModules = new Set(tasks.map((task) => task.taskType || "module")).size;
  const focus = overdueTasks > 0
    ? `先处理 ${overdueTasks} 个逾期任务`
    : pendingTasks > 0
      ? `本周优先完成 ${pendingTasks} 个待处理任务`
      : "学习节奏稳定，可以安排一次拓展练习";
  const risk = overdueTasks > 0
    ? "有逾期风险"
    : pendingTasks >= 3
      ? "任务堆积风险"
      : totalWritings === 0
        ? "写作记录不足"
        : "暂无明显风险";
  const action = totalWritings === 0
    ? "建议先完成一次写作练习，让老师和家长看到可跟踪的起点。"
    : returnedTasks > 0
      ? "建议家长和孩子一起看一份已返回反馈，确认下次练习目标。"
      : "建议保持短频练习，等待老师返回反馈后再复盘。";
  return { focus, risk, action, activeModules };
}

function ParentFamilySummaryPanel({ child, setActiveTab }) {
  const insights = getFamilyInsights(child);
  return (
    <ParentSurface style={{ padding: 16, background: PARENT_COLOR.surfaceMuted }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: PARENT_COLOR.textMuted, fontSize: 12, fontWeight: 800 }}>家庭关注摘要</div>
          <h2 style={{ margin: "6px 0 0", color: PARENT_COLOR.text, fontSize: 20, lineHeight: 1.25 }}>{insights.focus}</h2>
          <p style={{ margin: "8px 0 0", color: PARENT_COLOR.textSecondary, fontSize: 13, lineHeight: 1.7 }}>{insights.action}</p>
        </div>
        <ParentButton onClick={() => setActiveTab("growth")}>查看周报</ParentButton>
      </div>
      <section style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        <MiniStat label="当前风险" value={insights.risk} />
        <MiniStat label="覆盖模块" value={insights.activeModules} />
        <MiniStat label="写作记录" value={child.summary?.totalWritings || 0} />
      </section>
    </ParentSurface>
  );
}

function ListBlock({ title, empty, children }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <ParentSurface style={{ padding: 14, background: PARENT_COLOR.surface }}>
      <h3 style={{ margin: "0 0 10px", fontSize: 15, color: PARENT_COLOR.text }}>{title}</h3>
      {items.length ? <div style={{ display: "grid", gap: 8 }}>{items}</div> : <div style={{ color: PARENT_COLOR.textMuted, fontSize: 13 }}>{empty}</div>}
    </ParentSurface>
  );
}

function Row({ title, meta, value }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: value !== "" ? "1fr auto" : "1fr", gap: 10, alignItems: "center", borderTop: `1px solid ${PARENT_COLOR.border}`, paddingTop: 8 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 800, color: PARENT_COLOR.text }}>{title}</div>
        <div style={{ marginTop: 3, color: PARENT_COLOR.textSecondary, fontSize: 12 }}>{meta}</div>
      </div>
      {value !== "" ? <strong style={{ color: PARENT_COLOR.text }}>{value}</strong> : null}
    </div>
  );
}

function formatDate(value) {
  const timestamp = Number(value);
  if (!timestamp) return "时间未知";
  return new Date(timestamp).toLocaleDateString();
}

function formatModuleValue(data, keys) {
  for (const key of keys) {
    const value = data?.[key];
    if (value != null && value !== "") return Number.isFinite(Number(value)) ? Number(value) : value;
  }
  return 0;
}

function getTaskStatusLabel(status) {
  const labels = {
    pending: "待完成",
    submitted: "已提交",
    grading: "批改中",
    returned: "已返回",
    completed: "已完成",
    overdue: "已逾期",
  };
  return labels[status] || status || "待完成";
}

function getMembershipLabel(membership) {
  if (!membership) return "未开通";
  const tierLabels = {
    standard: "普通会员",
    premium: "大会员",
  };
  return tierLabels[membership.tier] || membership.planCode || membership.status || "已开通";
}

function getTaskTypeLabel(type) {
  return MODULE_LABELS[type] || type || "学习";
}

function getLearningEventLabel(event) {
  const labels = {
    quiz_complete: "完成练习",
    practice_complete: "完成练习",
    analysis_complete: "完成分析",
    submission: "提交作文",
    writing_submission: "提交作文",
    course_enrolled: "开通营地课程",
    course_progress: "更新营地进度",
  };
  return labels[event?.eventType] || getTaskTypeLabel(event?.module);
}

function getQuotaLabel(type) {
  const labels = {
    writing_review: "作文批改",
    sentence_analysis: "句子分析",
    reading_analysis: "阅读分析",
    paper_generation: "题卷生成",
    sentence_reading: "句子朗读",
    ai_speaking_minutes: "AI口语分钟",
    ai_listening_minutes: "AI听力分钟",
  };
  return labels[type] || type || "权益";
}
