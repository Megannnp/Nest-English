import { useMemo, useState } from 'react';

import ClassPanelState from './ClassPanelState.jsx';
import { T } from './styles.js';
import ProductState from '../../components/shared/ProductState.jsx';

function PendingAccountsHeader({ unmatchedCount, open }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
        <span style={{ fontSize:28, fontWeight:900, color:'#c2410c' }}>{unmatchedCount}</span>
        <span style={{ fontSize:14, color:T.textSecondary }}>待处理账号</span>
      </div>
      <span style={{ fontSize:12, color:T.textMuted, fontWeight:700 }}>查看详情 {open ? '▲' : '▼'}</span>
    </div>
  );
}

function PendingAccountsMessage({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div style={{ marginBottom:10 }}>
      <ProductState
        compact
        tone={message?.tone || 'neutral'}
        title={message?.title || '状态更新'}
        description={message?.description || ''}
      />
    </div>
  );
}

function PendingAccountsActions({
  student,
  handlingStudentId,
  onLinkByStudentNo,
  onCreateAndLink,
  isMobile,
}) {
  const disabled = handlingStudentId === student.id;
  const canLink = Boolean(student.studentNo);

  return (
    <div style={{ justifySelf:isMobile ? 'start' : 'end', display:'flex', gap:8, flexWrap:'wrap' }}>
      <button
        type="button"
        disabled={disabled || !canLink}
        onClick={() => onLinkByStudentNo?.(student)}
        style={{ fontSize:11, fontWeight:800, color:canLink ? '#9a3412' : T.textMuted, background:'#fff7ed', border:'1px solid #fdba74', borderRadius:999, padding:'6px 10px', cursor:canLink ? 'pointer' : 'not-allowed', opacity:disabled ? 0.65 : 1 }}
      >
        {disabled ? '处理中...' : '绑定已有名单'}
      </button>
      <button
        type="button"
        disabled={disabled || !canLink}
        onClick={() => onCreateAndLink?.(student)}
        style={{ fontSize:11, fontWeight:800, color:'#fff', background:canLink ? '#c8852a' : '#cfc6bb', border:'none', borderRadius:999, padding:'6px 10px', cursor:canLink ? 'pointer' : 'not-allowed', opacity:disabled ? 0.65 : 1 }}
      >
        新增名单并绑定
      </button>
    </div>
  );
}

function PendingRosterBinding({
  student,
  pendingRosterEntries,
  selectedRosterEntryId,
  handlingStudentId,
  isMobile,
  onSelectRosterEntry,
  onLinkSpecificRoster,
}) {
  if (!pendingRosterEntries.length) {
    return null;
  }

  const disabled = handlingStudentId === student.id;

  return (
    <div style={{ gridColumn:isMobile ? 'auto' : '1 / -1', display:'flex', gap:8, alignItems:'center', flexDirection:isMobile ? 'column' : 'row' }}>
      <select
        value={selectedRosterEntryId || ''}
        onChange={(event) => onSelectRosterEntry?.(student.id, event.target.value)}
        style={{ flex:1, minWidth:0, padding:'8px 10px', borderRadius:10, border:`1px solid ${T.border}`, color:T.text, background:'#fff', fontSize:12 }}
      >
        <option value="">手动选择一条待认领名单绑定...</option>
        {pendingRosterEntries.map((entry) => <option key={entry.id} value={entry.id}>{entry.studentNo} · {entry.studentName}</option>)}
      </select>
      <button
        type="button"
        disabled={disabled || !selectedRosterEntryId}
        onClick={() => onLinkSpecificRoster?.(student, selectedRosterEntryId)}
        style={{ width:isMobile ? '100%' : 'auto', fontSize:11, fontWeight:800, color:'#0f766e', background:'#ecfdf5', border:'1px solid #99f6e4', borderRadius:999, padding:'7px 11px', cursor:selectedRosterEntryId ? 'pointer' : 'not-allowed', opacity:disabled ? 0.65 : 1 }}
      >
        绑定所选名单
      </button>
    </div>
  );
}

function PendingAccountRow({
  student,
  isMobile,
  handlingStudentId,
  pendingRosterEntries,
  selectedRosterEntryId,
  onLinkByStudentNo,
  onCreateAndLink,
  onSelectRosterEntry,
  onLinkSpecificRoster,
}) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '120px 1fr auto', gap:10, alignItems:'center', background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:'12px 14px' }}>
      <div style={{ fontSize:13, fontWeight:700, color:'#9a3412' }}>{student.studentNo || '未填学号'}</div>
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{student.realName || '未命名学生'}</div>
        <div style={{ fontSize:11, color:T.textMuted, lineHeight:1.6 }}>{student.email || '暂无邮箱'} · 已加入班级但尚未匹配到名单</div>
      </div>
      <PendingAccountsActions
        student={student}
        handlingStudentId={handlingStudentId}
        onLinkByStudentNo={onLinkByStudentNo}
        onCreateAndLink={onCreateAndLink}
        isMobile={isMobile}
      />
      <PendingRosterBinding
        student={student}
        pendingRosterEntries={pendingRosterEntries}
        selectedRosterEntryId={selectedRosterEntryId}
        handlingStudentId={handlingStudentId}
        isMobile={isMobile}
        onSelectRosterEntry={onSelectRosterEntry}
        onLinkSpecificRoster={onLinkSpecificRoster}
      />
    </div>
  );
}

function PendingAccountsContent({
  loading,
  error,
  unmatchedStudents,
  message,
  pendingRosterEntries,
  selectedRosterEntryByStudentId,
  handlingStudentId,
  isMobile,
  onLinkByStudentNo,
  onCreateAndLink,
  onSelectRosterEntry,
  onLinkSpecificRoster,
}) {
  return (
        <div style={{ marginTop:12, borderTop:`1px solid ${T.border}`, paddingTop:12 }}>
      <PendingAccountsMessage message={message} />

      <ClassPanelState
        loading={loading}
        error={error}
        empty={!loading && !error && unmatchedStudents.length === 0}
        loadingTitle="正在加载待处理账号"
        emptyTitle="当前没有待处理账号"
        emptyDescription='当前没有“已加入班级但未匹配名单”的学生账号。'
      />

      {!loading && !error && unmatchedStudents.length > 0 ? (
        <div style={{ display:'grid', gap:8 }}>
          {unmatchedStudents.map((student) => (
            <PendingAccountRow
              key={student.id}
              student={student}
              isMobile={isMobile}
              handlingStudentId={handlingStudentId}
              pendingRosterEntries={pendingRosterEntries}
              selectedRosterEntryId={selectedRosterEntryByStudentId[student.id]}
              onLinkByStudentNo={onLinkByStudentNo}
              onCreateAndLink={onCreateAndLink}
              onSelectRosterEntry={onSelectRosterEntry}
              onLinkSpecificRoster={onLinkSpecificRoster}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function PendingAccountsPanel({
  loading = false,
  error = '',
  unmatchedStudents = [],
  isMobile = false,
  handlingStudentId = '',
  message = null,
  onLinkByStudentNo = null,
  onCreateAndLink = null,
  rosterEntries = [],
  selectedRosterEntryByStudentId = {},
  onSelectRosterEntry = null,
  onLinkSpecificRoster = null,
}) {
  const [open, setOpen] = useState(false);
  const pendingRosterEntries = useMemo(
    () => rosterEntries.filter((entry) => entry.status !== 'linked' && !entry.userId),
    [rosterEntries]
  );

  return (
    <div style={{ background:'linear-gradient(180deg, #fffdfa 0%, #faf7f1 100%)', borderRadius:20, border:`1px solid ${T.border}`, padding:'16px 18px', boxShadow:'0 10px 24px rgba(99,74,39,0.05)' }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)} style={{ width:'100%', border:0, padding:0, background:'transparent', cursor:'pointer', textAlign:'left' }}>
        <PendingAccountsHeader unmatchedCount={unmatchedStudents.length} open={open} />
      </button>

      {open ? (
        <PendingAccountsContent
          loading={loading}
          error={error}
          unmatchedStudents={unmatchedStudents}
          message={message}
          pendingRosterEntries={pendingRosterEntries}
          selectedRosterEntryByStudentId={selectedRosterEntryByStudentId}
          handlingStudentId={handlingStudentId}
          isMobile={isMobile}
          onLinkByStudentNo={onLinkByStudentNo}
          onCreateAndLink={onCreateAndLink}
          onSelectRosterEntry={onSelectRosterEntry}
          onLinkSpecificRoster={onLinkSpecificRoster}
        />
      ) : null}
    </div>
  );
}
