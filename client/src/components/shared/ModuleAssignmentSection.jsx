import { useEffect, useRef, useState } from 'react';

import { SmallActionButton, StatusBanner, SurfaceCard, SurfaceHeader } from './UI.jsx';
import { classesAPI, moduleAssignmentsAPI } from '../../api/index.js';

const INPUT_STYLE = {
  padding: '9px 12px',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,0.12)',
  fontSize: 13,
  background: '#fff',
  width: '100%',
  boxSizing: 'border-box',
  outline: 'none',
  fontFamily: 'inherit',
};

function formatDue(ms) {
  if (!ms) return '无截止';
  return new Date(ms).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
}

function AssignmentRow({ item }) {
  return (
    <div style={{
      padding: '10px 0',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#2a1f14', marginBottom: 2 }}>{item.title}</div>
        <div style={{ fontSize: 11, color: '#8a7d6e' }}>
          {item.moduleLabel} · {item.className} · 截止 {formatDue(item.dueAt)}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a7a6e' }}>{item.completedCount}/{item.assignedCount}</div>
        <div style={{ fontSize: 11, color: '#8a7d6e' }}>已完成</div>
      </div>
    </div>
  );
}

function CreateForm({ moduleTypes, classes, onCreated, onCancel }) {
  const [form, setForm] = useState({
    moduleType: moduleTypes[0]?.value || '',
    classId: '',
    title: '',
    dueAt: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.classId) { setError('请选择班级'); return; }
    if (!form.title.trim()) { setError('请填写任务标题'); return; }
    setError('');
    setSubmitting(true);
    try {
      await moduleAssignmentsAPI.create({
        module: form.moduleType,
        classId: form.classId,
        title: form.title.trim(),
        dueAt: form.dueAt ? new Date(form.dueAt).getTime() : null,
      });
      onCreated();
    } catch (err) {
      setError(err?.message || '布置失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16,
      padding: '14px 16px', background: 'rgba(0,0,0,0.02)',
      borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)',
    }}>
      {moduleTypes.length > 1 && (
        <select value={form.moduleType} onChange={(e) => set('moduleType', e.target.value)} style={INPUT_STYLE}>
          {moduleTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      )}
      <select value={form.classId} onChange={(e) => set('classId', e.target.value)} style={INPUT_STYLE}>
        <option value="">选择班级</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.className || c.class_name}</option>)}
      </select>
      <input
        aria-label="任务标题"
        type="text"
        placeholder="任务标题（如：第三单元词汇练习）"
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        style={INPUT_STYLE}
        maxLength={80}
      />
      <input
        aria-label="截止日期"
        type="date"
        value={form.dueAt}
        onChange={(e) => set('dueAt', e.target.value)}
        style={INPUT_STYLE}
        placeholder="截止日期（可选）"
      />
      {error && <StatusBanner tone="error">{error}</StatusBanner>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <SmallActionButton tone="subtle" type="button" onClick={onCancel}>取消</SmallActionButton>
        <SmallActionButton tone="primary" type="submit" disabled={submitting}>
          {submitting ? '布置中…' : '确认布置'}
        </SmallActionButton>
      </div>
    </form>
  );
}

export default function ModuleAssignmentSection({ user, moduleTypes = [] }) {
  const [classes, setClasses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [success, setSuccess] = useState('');
  const mountedRef = useRef(true);
  const moduleSet = new Set(moduleTypes.map((t) => t.value));

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  async function loadData() {
    try {
      const [cls, asgns] = await Promise.all([
        classesAPI.list(),
        moduleAssignmentsAPI.list(),
      ]);
      if (!mountedRef.current) return;
      setClasses(Array.isArray(cls) ? cls : []);
      setAssignments((Array.isArray(asgns) ? asgns : []).filter((a) => moduleSet.has(a.moduleType)));
    } catch {
      // Non-critical: teacher panel failing to load shouldn't block the page
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCreated() {
    setShowForm(false);
    setSuccess('任务已布置');
    void loadData();
    setTimeout(() => { if (mountedRef.current) setSuccess(''); }, 3000);
  }

  if (!user || user.role !== 'teacher') return null;

  return (
    <SurfaceCard style={{ padding: '18px 20px 20px' }}>
      <SurfaceHeader
        title="布置专项任务"
        action={
          <SmallActionButton
            tone={showForm ? 'subtle' : 'primary'}
            onClick={() => { setShowForm((v) => !v); setSuccess(''); }}
          >
            {showForm ? '收起' : '+ 新建任务'}
          </SmallActionButton>
        }
      />
      <div style={{ marginTop: 14 }}>
        {success && <StatusBanner tone="success" style={{ marginBottom: 12 }}>{success}</StatusBanner>}

        {showForm && (
          <CreateForm
            moduleTypes={moduleTypes}
            classes={classes}
            onCreated={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        )}

        {loading ? (
          <div style={{ fontSize: 12, color: '#8a7d6e', padding: '8px 0' }}>加载中…</div>
        ) : assignments.length === 0 ? (
          <div style={{ fontSize: 12, color: '#8a7d6e', padding: '8px 0' }}>
            暂无专项任务，点击「新建任务」开始布置。
          </div>
        ) : (
          <div>{assignments.map((item) => <AssignmentRow key={item.id} item={item} />)}</div>
        )}
      </div>
    </SurfaceCard>
  );
}
