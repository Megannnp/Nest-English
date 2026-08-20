/* eslint-disable complexity */
import { useState, useRef, useEffect, useCallback } from "react";

import { assignmentTasksAPI, grammarAPI, usersAPI } from "../../api/index.js";
import "./DailyTasksFloat.css";

// ── Module templates for guided self-task creation ────────────────
const MODULES = [
  {
    value: "writing",
    label: "写作",
    prefix: "完成",
    unit: "篇作文",
    default: 1, min: 1, max: 5, step: 1,
    page: "writing",
  },
  {
    value: "grammar",
    label: "语法",
    prefix: "完成",
    unit: "道练习题",
    default: 5, min: 1, max: 30, step: 1,
    page: "grammar-practice",
  },
  {
    value: "reading",
    label: "阅读",
    prefix: "阅读",
    unit: "篇文章",
    default: 1, min: 1, max: 10, step: 1,
    page: "reading-analyzer",
  },
  {
    value: "listening",
    label: "听力",
    prefix: "练习听力",
    unit: "分钟",
    default: 10, min: 5, max: 60, step: 5,
    page: "listening-basics",
  },
  {
    value: "vocab",
    label: "词汇",
    prefix: "学习",
    unit: "个单词",
    default: 20, min: 5, max: 100, step: 5,
    page: "vocab",
  },
];

function getModuleDef(value) {
  return MODULES.find((m) => m.value === value) ?? null;
}

function buildLabel(mod, qty) {
  return `${mod.prefix} ${qty} ${mod.unit}`;
}

// ── localStorage helpers ──────────────────────────────────────────
const CUSTOM_TASKS_KEY = "dtf-custom-tasks";
const FLOAT_POSITION_KEY = "dtf-float-position";
const FLOAT_MARGIN = 16;

function getTodayKey() {
  return `dtf-done-${new Date().toISOString().slice(0, 10)}`;
}

function loadDone() {
  try {
    const todayKey = getTodayKey();
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("dtf-done-") && key !== todayKey) {
        localStorage.removeItem(key);
      }
    }
    const raw = localStorage.getItem(todayKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDone(ids) {
  try { localStorage.setItem(getTodayKey(), JSON.stringify(ids)); } catch { /* ignore */ }
}

function loadCustomTasks() {
  try {
    const raw = localStorage.getItem(CUSTOM_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomTasks(tasks) {
  try { localStorage.setItem(CUSTOM_TASKS_KEY, JSON.stringify(tasks)); } catch { /* ignore */ }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function loadFloatPosition() {
  try {
    const raw = localStorage.getItem(FLOAT_POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    return { x: parsed.x, y: parsed.y, edge: parsed.edge === "left" ? "left" : "right" };
  } catch {
    return null;
  }
}

function saveFloatPosition(position) {
  try { localStorage.setItem(FLOAT_POSITION_KEY, JSON.stringify(position)); } catch { /* ignore */ }
}

// ── Date formatting ───────────────────────────────────────────────
function formatDue(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dueDate = d.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  if (dueDate < today) return { label: `${mm}/${dd} 已逾期`, overdue: true };
  if (dueDate === today) return { label: "今日截止", urgent: true };
  if (dueDate === tomorrow) return { label: "明日截止", urgent: true };
  return { label: `截止 ${mm}/${dd}` };
}

function dueTime(task) {
  const dueAt = task.assignment?.dueAt;
  if (!dueAt) return Infinity;
  const time = new Date(dueAt).getTime();
  return Number.isFinite(time) ? time : Infinity;
}

// ── Teacher task helpers ──────────────────────────────────────────
function isTeacherTaskDone(t) {
  const s = t.status;
  return s === "submitted" || s === "grading" || s === "returned" || s === "completed";
}

function teacherTaskModule(t) {
  return t.taskType === "grammar" ? "grammar" : "writing";
}

function teacherTaskPage(t) {
  return t.taskType === "grammar" ? "grammar-practice" : "writing";
}

// ── Component ─────────────────────────────────────────────────────
function TeacherTasksList({ tasks, onGo }) {
  if (!tasks.length) return null;
  return (
    <>
      <div className="dtf-section-label">老师布置</div>
      {tasks.map((task) => {
        const isDone = isTeacherTaskDone(task);
        const due = formatDue(task.assignment?.dueAt);
        const mod = getModuleDef(teacherTaskModule(task));
        const title = task.assignment?.title ?? "作业";
        return (
          <div key={task.id} className="dtf-task-row-wrap">
            <button type="button" className="dtf-task-row" onClick={() => onGo(teacherTaskPage(task))}>
              <span className="dtf-task-check" aria-hidden="true">{isDone ? "☑" : "☐"}</span>
              <span className="dtf-task-body">
                <span className="dtf-task-label" style={isDone ? { textDecoration: "line-through", opacity: 0.45 } : undefined}>{title}</span>
                <span className="dtf-task-badges">
                  {mod && <span className="dtf-task-tag">{mod.label}</span>}
                  {due && <span className={`dtf-due-tag${due.overdue ? " is-overdue" : due.urgent ? " is-urgent" : ""}`}>{due.label}</span>}
                </span>
              </span>
            </button>
          </div>
        );
      })}
    </>
  );
}

function CustomTaskRow({ task, isDone, mod, editing, onGo, onToggle, onDelete }) {
  return (
    <div className="dtf-task-row-wrap">
      <button type="button" className="dtf-task-row" onClick={() => onGo(task.page)} style={{ cursor: editing || !task.page ? "default" : undefined }}>
        <span className="dtf-task-check" aria-hidden="true" onClick={(e) => !editing && onToggle(e, task.id)} style={{ cursor: editing ? "default" : "pointer" }}>
          {isDone ? "☑" : "☐"}
        </span>
        <span className="dtf-task-body">
          <span className="dtf-task-label" style={isDone && !editing ? { textDecoration: "line-through", opacity: 0.45 } : undefined}>{task.label}</span>
          {mod && <span className="dtf-task-tag">{mod.label}</span>}
        </span>
      </button>
      {editing && <button type="button" className="dtf-task-delete" onClick={(e) => onDelete(e, task.id)} title="删除">×</button>}
    </div>
  );
}

function AddTaskForm({ customLabel, selectedModule, qty, inputRef, onSelectModule, onAdjustQty, onChangeLabel, onKeyDown, onAdd }) {
  const modDef = selectedModule ? getModuleDef(selectedModule) : null;
  const templateLabel = modDef ? buildLabel(modDef, qty) : "";
  const effectiveLabel = customLabel || templateLabel;
  const page = modDef?.page || null;
  return (
    <div className="dtf-add-area">
      <div className="dtf-module-chips">
        {MODULES.map((m) => (
          <button key={m.value} type="button" className={`dtf-chip${selectedModule === m.value ? " is-active" : ""}`} onClick={() => onSelectModule(m.value)}>{m.label}</button>
        ))}
      </div>
      {modDef && (
        <div className="dtf-qty-row">
          <span className="dtf-qty-prefix">{modDef.prefix}</span>
          <button type="button" className="dtf-qty-btn" onClick={() => onAdjustQty(-1)} disabled={qty <= modDef.min}>−</button>
          <span className="dtf-qty-num">{qty}</span>
          <button type="button" className="dtf-qty-btn" onClick={() => onAdjustQty(1)} disabled={qty >= modDef.max}>+</button>
          <span className="dtf-qty-unit">{modDef.unit}</span>
        </div>
      )}
      <div className="dtf-add-row">
        <input ref={inputRef} className="dtf-add-input" aria-label="任务名称" type="text" placeholder={modDef ? templateLabel : "输入任务名称…"} value={customLabel} onChange={(e) => onChangeLabel(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onAdd(effectiveLabel.trim(), page); else onKeyDown(e); }} maxLength={60} />
        <button type="button" className="dtf-add-btn" onClick={() => onAdd(effectiveLabel.trim(), page)} disabled={!effectiveLabel.trim()}>添加</button>
      </div>
      {modDef && !customLabel && <div className="dtf-add-hint">将添加："{templateLabel}"，可在上方修改</div>}
    </div>
  );
}

function PendingRewardsPanel({ rewards, pendingPoints, claiming, onClaim }) {
  if (!rewards.length) return null;
  return (
    <div className="dtf-rewards">
      <div className="dtf-rewards__head">
        <span>待领取积分</span>
        <strong>{pendingPoints} ⭐</strong>
      </div>
      <div className="dtf-rewards__list">
        {rewards.slice(0, 3).map((reward) => (
          <div key={reward.id} className="dtf-reward-row">
            <span>✓ {reward.label || "学习奖励"}</span>
            <b>+{reward.points}</b>
          </div>
        ))}
        {rewards.length > 3 && <div className="dtf-reward-more">还有 {rewards.length - 3} 项奖励</div>}
      </div>
      <button type="button" className="dtf-claim-btn" aria-label={claiming ? "领取中" : "一键领取"} onClick={onClaim} disabled={claiming}>
        {claiming ? "领取中..." : "一键领取"}
      </button>
    </div>
  );
}

export default function DailyTasksFloat({ user, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(loadDone);
  const [customTasks, setCustomTasks] = useState(loadCustomTasks);
  const [position, setPosition] = useState(loadFloatPosition);
  const [dragging, setDragging] = useState(false);
  const [teacherTasks, setTeacherTasks] = useState([]);
  const [editing, setEditing] = useState(false);
  const [pendingRewards, setPendingRewards] = useState([]);
  const [claiming, setClaiming] = useState(false);
  const [toast, setToast] = useState("");
  const [flyPoints, setFlyPoints] = useState(0);

  // Add-task form state
  const [selectedModule, setSelectedModule] = useState(null); // module value string
  const [qty, setQty] = useState(1);
  const [customLabel, setCustomLabel] = useState("");         // manual override
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);

  // ── Fetch teacher tasks ─────────────────────────────────────────
  const fetchTeacherTasks = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [writing, grammar] = await Promise.all([
        assignmentTasksAPI.listMine().catch(() => []),
        grammarAPI.myTasks().catch(() => []),
      ]);
      const grammarMapped = (grammar ?? []).map((t) => ({ ...t, taskType: "grammar" }));
      const all = [...(writing ?? []), ...grammarMapped];
      // Show only pending/overdue/submitted tasks (hide closed/archived)
      const visible = all.filter((t) => t.status !== "closed" && t.assignment?.status !== "archived");
      // Sort: pending/overdue first by dueAt, then completed
      visible.sort((a, b) => {
        const aDone = isTeacherTaskDone(a);
        const bDone = isTeacherTaskDone(b);
        if (aDone !== bDone) return aDone ? 1 : -1;
        return dueTime(a) - dueTime(b);
      });
      setTeacherTasks(visible);
    } catch { /* ignore */ }
  }, [user?.id]);

  const fetchPendingRewards = useCallback(async () => {
    if (!user?.id) return;
    try {
      const summary = await usersAPI.getPointsSummary();
      setPendingRewards(Array.isArray(summary?.pendingRewards) ? summary.pendingRewards : []);
    } catch { /* ignore */ }
  }, [user?.id]);

  useEffect(() => {
    fetchTeacherTasks();
    fetchPendingRewards();
  }, [fetchTeacherTasks, fetchPendingRewards]);

  const hasPosition = Boolean(position);
  useEffect(() => {
    if (!hasPosition) return undefined;
    function keepInViewport() {
      const rect = rootRef.current?.getBoundingClientRect();
      const width = rect?.width || 140;
      const height = rect?.height || 52;
      setPosition((current) => {
        if (!current) return current;
        const next = {
          ...current,
          x: current.edge === "left"
            ? FLOAT_MARGIN
            : window.innerWidth - width - FLOAT_MARGIN,
          y: clamp(current.y, FLOAT_MARGIN, window.innerHeight - height - FLOAT_MARGIN),
        };
        saveFloatPosition(next);
        return next;
      });
    }
    keepInViewport();
    window.addEventListener("resize", keepInViewport);
    return () => window.removeEventListener("resize", keepInViewport);
  }, [hasPosition, position?.edge]);

  useEffect(() => {
    function handleOpenDailyTasks() {
      void fetchTeacherTasks();
      void fetchPendingRewards();
      setOpen(true);
    }
    window.addEventListener("nest:open-daily-tasks", handleOpenDailyTasks);
    return () => window.removeEventListener("nest:open-daily-tasks", handleOpenDailyTasks);
  }, [fetchTeacherTasks, fetchPendingRewards]);

  // ── Auto-check custom tasks on module-complete event ────────────
  useEffect(() => {
    function handle(e) {
      const completedModule = e.detail?.module;
      if (!completedModule) return;
      void fetchPendingRewards();
      setCustomTasks((current) => {
        const linkedIds = current.filter((t) => t.module === completedModule).map((t) => t.id);
        if (linkedIds.length === 0) return current;
        setDone((prev) => {
          const merged = Array.from(new Set([...prev, ...linkedIds]));
          saveDone(merged);
          return merged;
        });
        return current;
      });
    }
    window.addEventListener("nest:module-complete", handle);
    return () => window.removeEventListener("nest:module-complete", handle);
  }, [fetchPendingRewards]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!flyPoints) return undefined;
    const timer = window.setTimeout(() => setFlyPoints(0), 900);
    return () => window.clearTimeout(timer);
  }, [flyPoints]);

  // ── Focus input when edit mode opens ────────────────────────────
  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  function handleSelectModule(value) {
    if (selectedModule === value) {
      setSelectedModule(null);
      setCustomLabel("");
      return;
    }
    const def = getModuleDef(value);
    setSelectedModule(value);
    setQty(def.default);
    setCustomLabel(""); // clear any manual override
  }

  function adjustQty(delta) {
    const def = getModuleDef(selectedModule);
    if (!def) return;
    setQty((q) => Math.min(def.max, Math.max(def.min, q + delta * def.step)));
  }

  // ── Toggle custom task done ──────────────────────────────────────
  function toggle(e, id) {
    e.stopPropagation();
    setDone((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveDone(next);
      return next;
    });
  }

  function deleteCustomTask(e, id) {
    e.stopPropagation();
    setCustomTasks((prev) => { const n = prev.filter((t) => t.id !== id); saveCustomTasks(n); return n; });
    setDone((prev) => { const n = prev.filter((x) => x !== id); saveDone(n); return n; });
  }

  function addTask(label, page) {
    if (!label) return;
    const id = `task-${Date.now()}`;
    const task = { id, label, module: selectedModule || null, page: page || null };
    setCustomTasks((prev) => { const n = [...prev, task]; saveCustomTasks(n); return n; });
    setSelectedModule(null);
    setQty(1);
    setCustomLabel("");
    inputRef.current?.focus();
  }

  function handleEscape(e) {
    if (e.key === "Escape") closePanel();
  }

  function go(page) {
    if (editing || !page) return;
    onNavigate?.(page);
    setOpen(false);
  }

  function closePanel() {
    setOpen(false);
    setEditing(false);
    setSelectedModule(null);
    setCustomLabel("");
  }

  async function claimRewards() {
    if (claiming || pendingRewards.length === 0) return;
    setClaiming(true);
    try {
      const result = await usersAPI.claimPendingPoints();
      const points = result?.claimedPoints || 0;
      setPendingRewards(Array.isArray(result?.summary?.pendingRewards) ? result.summary.pendingRewards : []);
      if (points > 0) setFlyPoints(points);
      setToast(points > 0 ? `领取成功！获得 ${points} 积分` : "暂无可领取奖励");
    } catch {
      setToast("领取失败，请稍后重试");
    } finally {
      setClaiming(false);
    }
  }

  function handleTriggerPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const currentPosition = position ?? {
      x: rect.left,
      y: rect.top,
      edge: rect.left + rect.width / 2 < window.innerWidth / 2 ? "left" : "right",
    };
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
    setPosition(currentPosition);
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function handleTriggerPointerMove(e) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 5;
    if (!moved && !drag.moved) return;
    drag.moved = true;
    suppressClickRef.current = true;
    setPosition({
      x: clamp(e.clientX - drag.offsetX, FLOAT_MARGIN, window.innerWidth - drag.width - FLOAT_MARGIN),
      y: clamp(e.clientY - drag.offsetY, FLOAT_MARGIN, window.innerHeight - drag.height - FLOAT_MARGIN),
      edge: e.clientX < window.innerWidth / 2 ? "left" : "right",
    });
  }

  function handleTriggerPointerUp(e) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!drag.moved) return;

    const width = drag.width;
    const height = drag.height;
    const x = clamp(e.clientX - drag.offsetX, FLOAT_MARGIN, window.innerWidth - width - FLOAT_MARGIN);
    const y = clamp(e.clientY - drag.offsetY, FLOAT_MARGIN, window.innerHeight - height - FLOAT_MARGIN);
    const edge = x + width / 2 < window.innerWidth / 2 ? "left" : "right";
    const snapped = {
      x: edge === "left" ? FLOAT_MARGIN : window.innerWidth - width - FLOAT_MARGIN,
      y,
      edge,
    };
    setPosition(snapped);
    saveFloatPosition(snapped);
  }

  function toggleOpen(e) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      e.preventDefault();
      return;
    }
    setOpen((o) => {
      if (!o) {
        fetchTeacherTasks();
        fetchPendingRewards();
      }
      return !o;
    });
  }

  // ── Counts ───────────────────────────────────────────────────────
  const teacherDoneCount = teacherTasks.filter(isTeacherTaskDone).length;
  const customDoneCount = done.filter((id) => customTasks.some((t) => t.id === id)).length;
  const totalDone = teacherDoneCount + customDoneCount;
  const totalCount = teacherTasks.length + customTasks.length;
  const pendingPoints = pendingRewards.reduce((sum, reward) => sum + Number(reward.points || 0), 0);

  return (
    <div
      ref={rootRef}
      className={`dtf-root${position ? " is-positioned" : ""}${dragging ? " is-dragging" : ""}`}
      data-edge={position?.edge || "right"}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      {open && (
        <>
          <button type="button" className="dtf-backdrop" aria-label="关闭今日任务" onClick={closePanel} />
          <div className="dtf-panel" role="dialog" aria-label="今日任务">

            {/* Header */}
            <div className="dtf-panel__head">
              <span className="dtf-panel__title">今日任务</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  type="button"
                  className="dtf-panel__icon-btn"
                  onClick={() => { setEditing((v) => !v); setSelectedModule(null); setCustomLabel(""); }}
                  title={editing ? "完成编辑" : "编辑自定义任务"}
                >
                  {editing ? "✓" : "✎"}
                </button>
                <button type="button" className="dtf-panel__close" onClick={closePanel} aria-label="关闭">✕</button>
              </div>
            </div>

            <div className="dtf-panel__list">
              <PendingRewardsPanel
                rewards={pendingRewards}
                pendingPoints={pendingPoints}
                claiming={claiming}
                onClaim={claimRewards}
              />

              {/* ── Teacher tasks ── */}
              <TeacherTasksList tasks={teacherTasks} onGo={go} />

              {/* ── Custom tasks ── */}
              {(customTasks.length > 0 || editing) && (
                <div className={`dtf-section-label${teacherTasks.length > 0 ? " dtf-section-label--border" : ""}`}>
                  自定义 · 今日
                </div>
              )}

              {customTasks.length === 0 && !editing && teacherTasks.length === 0 && (
                <div className="dtf-empty">
                  <span>还没有任务</span>
                  <span className="dtf-empty__hint">点击右上角 ✎ 添加今日计划</span>
                </div>
              )}

              {customTasks.map((task) => (
                <CustomTaskRow
                  key={task.id}
                  task={task}
                  isDone={done.includes(task.id)}
                  mod={task.module ? getModuleDef(task.module) : null}
                  editing={editing}
                  onGo={go}
                  onToggle={toggle}
                  onDelete={deleteCustomTask}
                />
              ))}

              {/* ── Add task form (editing mode) ── */}
              {editing && (
                <AddTaskForm
                  customLabel={customLabel}
                  selectedModule={selectedModule}
                  qty={qty}
                  inputRef={inputRef}
                  onSelectModule={handleSelectModule}
                  onAdjustQty={adjustQty}
                  onChangeLabel={setCustomLabel}
                  onKeyDown={handleEscape}
                  onAdd={addTask}
                />
              )}
            </div>

            {/* Footer */}
            <div className="dtf-panel__footer">
              <span className="dtf-footer-progress">完成：{totalDone} / {totalCount}</span>
              {editing && customTasks.length > 0 && (
                <button
                  type="button"
                  className="dtf-reset-btn"
                  onClick={() => {
                    if (!window.confirm("清空所有自定义任务？")) return;
                    saveCustomTasks([]); setCustomTasks([]);
                    saveDone([]); setDone([]);
                  }}
                >
                  清空自定义
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {toast && <div className="dtf-toast" role="status">🎉 {toast}</div>}
      {flyPoints > 0 && <div className="dtf-point-fly">+{flyPoints} ⭐</div>}

      <button
        type="button"
        className={`dtf-trigger${open ? " is-open" : ""}`}
        onPointerDown={handleTriggerPointerDown}
        onPointerMove={handleTriggerPointerMove}
        onPointerUp={handleTriggerPointerUp}
        onPointerCancel={() => { dragRef.current = null; setDragging(false); }}
        onClick={toggleOpen}
        aria-label="今日任务"
        title="今日任务"
      >
        <span className="dtf-trigger__icon" aria-hidden="true">🎯</span>
        <span className="dtf-trigger__label">今日任务</span>
        {pendingRewards.length > 0 && <span className="dtf-trigger__badge">🎁 {pendingRewards.length}</span>}
      </button>
    </div>
  );
}
