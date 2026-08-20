import { useState } from 'react';

import ClassPanelState from './ClassPanelState.jsx';
import { T } from './styles.js';

export default function ClassRosterPanel({
  loading = false,
  error = '',
  rosterEntries = [],
  isMobile = false,
  handlingRosterEntryId = '',
  onUnlink = null,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ background:'linear-gradient(180deg, #fffdfa 0%, #faf7f1 100%)', borderRadius:20, border:`1px solid ${T.border}`, padding:'16px 18px', boxShadow:'0 10px 24px rgba(99,74,39,0.05)' }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((current) => !current)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, border:0, padding:0, background:'transparent', cursor:'pointer', textAlign:'left' }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
          <span style={{ fontSize:28, fontWeight:900, color:T.primary }}>{rosterEntries.length}</span>
          <span style={{ fontSize:14, color:T.textSecondary }}>学生名单</span>
        </div>
        <span style={{ fontSize:12, color:T.textMuted, fontWeight:700 }}>查看详情 {open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div style={{ marginTop:12, borderTop:`1px solid ${T.border}`, paddingTop:12 }}>
          <ClassPanelState
            loading={loading}
            error={error}
            empty={!loading && !error && rosterEntries.length === 0}
            loadingTitle="正在加载学生名单"
            emptyTitle="还没有导入学生名单"
            emptyDescription="先导入学号和姓名，学生注册后就可以自动认领。"
          />

          {!loading && !error && rosterEntries.length > 0 ? (
            <div style={{ display:'grid', gap:8 }}>
              {[...rosterEntries].sort((a, b) => {
                  const na = String(a.studentNo || '').padStart(10, '0');
                  const nb = String(b.studentNo || '').padStart(10, '0');
                  return na.localeCompare(nb);
                }).map((entry) => (
                <div key={entry.id} style={{ display:'grid', gridTemplateColumns:isMobile ? '1fr' : '120px 1fr auto', gap:10, alignItems:'center', background:T.card, border:`1px solid ${T.border}`, borderRadius:14, padding:'12px 14px' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.primaryDark }}>{entry.studentNo}</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:T.text }}>{entry.studentName}</div>
                    <div style={{ fontSize:11, color:T.textMuted, lineHeight:1.6 }}>{entry.linkedUserName ? `${entry.linkedUserName}${entry.linkedUserEmail ? ` · ${entry.linkedUserEmail}` : ''}` : '学生尚未认领账号'}</div>
                  </div>
                  <div style={{ justifySelf:isMobile ? 'start' : 'end', display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:11, fontWeight:800, color:entry.status === 'linked' ? '#0f766e' : '#9a6700', background:entry.status === 'linked' ? '#ecfdf5' : '#fff7ed', border:`1px solid ${entry.status === 'linked' ? '#99f6e4' : '#fdba74'}`, borderRadius:999, padding:'5px 10px' }}>
                      {entry.status === 'linked' ? '已绑定' : '待认领'}
                    </span>
                    {entry.status === 'linked' ? (
                      <button type="button" disabled={handlingRosterEntryId === entry.id} onClick={() => onUnlink?.(entry)} style={{ fontSize:11, fontWeight:800, color:'#b02020', background:'#fff7ed', border:'1px solid #f0b0a8', borderRadius:999, padding:'5px 10px', cursor:'pointer', opacity:handlingRosterEntryId === entry.id ? 0.65 : 1 }}>
                        {handlingRosterEntryId === entry.id ? '处理中...' : '解绑'}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
