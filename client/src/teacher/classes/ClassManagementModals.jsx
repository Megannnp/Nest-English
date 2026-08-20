import { useState } from 'react';


import {
  downloadClassRosterTemplate,
  parseClassRosterText,
  readClassRosterFile,
} from './domain.js';
import { T } from './styles.js';
import { classesAPI } from '../../api/index.js';
import AppIcon from '../../components/shared/AppIcon.jsx';

function ModalShell({ children, isMobile = false, maxWidth = 400 }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(42,31,20,0.4)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:isMobile ? 'calc(12px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px))' : '0 16px', overflowY:'auto' }}>
      <div style={{ background:T.card, borderRadius:16, padding:isMobile ? 18 : 24, width:'100%', maxWidth, boxShadow:'0 8px 32px rgba(0,0,0,0.15)' }}>
        {children}
      </div>
    </div>
  );
}

export function CreateClassModal({ onClose, onCreate, isMobile = false }) {
  const [className, setClassName] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!className.trim()) { setErr('请输入班级名称'); return; }
    if (!password.trim()) { setErr('请设置加入密码'); return; }
    setSaving(true);
    setErr('');

    try {
      const createdClass = await classesAPI.create(className, password);
      onCreate(createdClass);
      onClose();
    } catch (error) {
      setErr(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell isMobile={isMobile} maxWidth={400}>
      <h3 style={{ fontSize:17, fontWeight:700, color:T.text, margin:'0 0 20px' }}>创建新班级</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <label htmlFor="create-class-name" style={{ fontSize:12, color:T.textSecondary, display:'block', marginBottom:5 }}>班级名称 *</label>
          <input id="create-class-name" value={className} onChange={(event) => setClassName(event.target.value)} placeholder="e.g. 高二(3)班" style={{ width:'100%', padding:'9px 13px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:14, color:T.text, boxSizing:'border-box' }} />
        </div>
        <div>
          <label htmlFor="create-class-password" style={{ fontSize:12, color:T.textSecondary, display:'block', marginBottom:5 }}>加入密码 *</label>
          <input id="create-class-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="学生加入班级时需要输入此密码" style={{ width:'100%', padding:'9px 13px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:14, color:T.text, boxSizing:'border-box' }} />
        </div>
        {err ? <div style={{ fontSize:12, color:T.error }}>{err}</div> : null}
        <div style={{ display:'flex', gap:10, marginTop:4, flexDirection:isMobile ? 'column' : 'row' }}>
          <button type="button" aria-label={saving ? '创建中' : '创建班级'} onClick={submit} disabled={saving} style={{ flex:1, padding:'10px 0', background:`linear-gradient(135deg, ${T.primary}, #e8a840)`, border:'none', borderRadius:24, color:'#fff', fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', opacity:saving?0.7:1 }}>
            {saving ? '创建中...' : '创建班级'}
          </button>
          <button type="button" onClick={onClose} style={{ padding:'10px 20px', background:'transparent', border:`1px solid ${T.border}`, borderRadius:24, color:T.textSecondary, fontSize:14, cursor:'pointer' }}>取消</button>
        </div>
      </div>
    </ModalShell>
  );
}

export function ImportRosterModal({ selectedClass, onClose, onImported, isMobile = false }) {
  const [rawText, setRawText] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [dragging, setDragging] = useState(false);

  const loadFile = async (file) => {
    const text = await readClassRosterFile(file);
    setRawText(text);
    setErr('');
  };

  const submit = async () => {
    setSaving(true);
    setErr('');

    try {
      const items = parseClassRosterText(rawText);
      if (!items.length) {
        setErr('请先输入或上传学生名单');
        setSaving(false);
        return;
      }
      const response = await classesAPI.importRoster(selectedClass.id, items);
      onImported(response.items || []);
      onClose();
    } catch (error) {
      setErr(error.message || '导入失败，请检查名单格式');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell isMobile={isMobile} maxWidth={620}>
      <h3 style={{ fontSize:17, fontWeight:700, color:T.text, margin:'0 0 8px' }}>导入学生名单</h3>
      <div style={{ fontSize:12, color:T.textSecondary, lineHeight:1.7, marginBottom:14 }}>
        当前班级：{selectedClass.className}。每行一位学生，按 <strong>学号,姓名</strong> 填写。
      </div>
      <label
        onDrop={async (event) => {
          event.preventDefault();
          setDragging(false);
          await loadFile(event.dataTransfer.files?.[0]);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, border:`2px dashed ${dragging ? T.primary : T.border}`, borderRadius:14, padding:'20px 16px', marginBottom:12, background:dragging ? '#fff8ee' : T.cardAlt, cursor:'pointer', transition:'border-color 0.15s, background 0.15s' }}
      >
        <input type="file" accept=".csv,.txt,.xlsx,.xls,text/csv" style={{ display:'none' }} onChange={async (event) => loadFile(event.target.files?.[0])} />
        <AppIcon name="upload" size={28} />
        <div style={{ fontSize:13, fontWeight:700, color:T.text }}>拖入 CSV / 表格文件，或点击选择</div>
        <div style={{ fontSize:11, color:T.textMuted }}>支持 .csv、.xlsx、.txt，逗号或制表符分隔均可</div>
      </label>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:12, alignItems:'center' }}>
        <span style={{ fontSize:12, color:T.textMuted }}>或直接粘贴文本：</span>
        <button type="button" onClick={downloadClassRosterTemplate} style={{ padding:'6px 12px', borderRadius:999, border:`1px solid ${T.border}`, background:'transparent', color:T.textSecondary, fontSize:12, cursor:'pointer' }}>下载模板</button>
      </div>
      <label htmlFor="import-roster-text" style={{ display:'block', fontSize:12, color:T.textMuted, marginBottom:6 }}>粘贴学生名单</label>
      <textarea id="import-roster-text" value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder={'01,张小明\n02,李华'} style={{ width:'100%', minHeight:160, resize:'vertical', border:`1px solid ${T.border}`, borderRadius:12, padding:'12px 14px', fontSize:13, lineHeight:1.8, color:T.text, boxSizing:'border-box' }} />
      {err ? <div style={{ fontSize:12, color:T.error, marginTop:10 }}>{err}</div> : null}
      <div style={{ display:'flex', gap:10, marginTop:14, flexDirection:isMobile ? 'column' : 'row' }}>
        <button type="button" aria-label={saving ? '导入中' : '确认导入'} onClick={submit} disabled={saving} style={{ flex:1, padding:'10px 0', background:`linear-gradient(135deg, ${T.primary}, #e8a840)`, border:'none', borderRadius:24, color:'#fff', fontSize:14, fontWeight:700, cursor:saving ? 'not-allowed' : 'pointer', opacity:saving ? 0.75 : 1 }}>
          {saving ? '导入中...' : '确认导入'}
        </button>
        <button type="button" onClick={onClose} style={{ padding:'10px 20px', background:'transparent', border:`1px solid ${T.border}`, borderRadius:24, color:T.textSecondary, fontSize:14, cursor:'pointer' }}>取消</button>
      </div>
    </ModalShell>
  );
}

export function EditPasswordModal({ selectedClass, onClose, onSaved, isMobile = false }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!password.trim()) { setErr('密码不能为空'); return; }
    setSaving(true);
    setErr('');

    try {
      await classesAPI.updatePassword(selectedClass.id, password);
      onSaved(password);
      onClose();
    } catch (error) {
      setErr(error.message || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell isMobile={isMobile} maxWidth={360}>
      <h3 style={{ fontSize:16, fontWeight:700, color:T.text, margin:'0 0 16px' }}>修改加入密码</h3>
      <div style={{ fontSize:12, color:T.textMuted, lineHeight:1.6, marginBottom:10 }}>输入新密码后会立即覆盖旧密码。</div>
      <label htmlFor="edit-class-password" style={{ display:'block', fontSize:12, color:T.textSecondary, marginBottom:5 }}>新加入密码</label>
      <input id="edit-class-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入新密码" style={{ width:'100%', padding:'9px 13px', border:`1px solid ${T.border}`, borderRadius:8, fontSize:14, color:T.text, boxSizing:'border-box', marginBottom:10 }} />
      {err ? <div style={{ fontSize:12, color:T.error, marginBottom:8 }}>{err}</div> : null}
      <div style={{ display:'flex', gap:10, flexDirection:isMobile ? 'column' : 'row' }}>
        <button type="button" aria-label={saving ? '保存中' : '保存'} onClick={submit} disabled={saving} style={{ flex:1, padding:'9px 0', background:`linear-gradient(135deg, ${T.primary}, #e8a840)`, border:'none', borderRadius:24, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
          {saving ? '保存中...' : '保存'}
        </button>
        <button type="button" onClick={onClose} style={{ padding:'9px 18px', background:'transparent', border:`1px solid ${T.border}`, borderRadius:24, color:T.textSecondary, fontSize:14, cursor:'pointer' }}>取消</button>
      </div>
    </ModalShell>
  );
}
