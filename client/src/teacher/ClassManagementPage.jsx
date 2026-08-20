import { useState, useEffect } from 'react';

import { classesAPI } from '../api/index.js';
import ClassDetailPanel from './classes/ClassDetailPanel.jsx';
import ClassListPanel from './classes/ClassListPanel.jsx';
import { CreateClassModal, EditPasswordModal, ImportRosterModal } from './classes/ClassManagementModals.jsx';
import { T } from './classes/styles.js';
import { EmptyStateCard, LargePageHeader } from '../components/shared/UI.jsx';

function sameId(left, right) {
  return String(left) === String(right);
}

function ClassPageHeader({ isMobile, onCreateClass }) {
  return (
    <div style={{ marginBottom: isMobile ? 16 : 18 }}>
      <LargePageHeader
        eyebrow="CLASSES"
        title="班级管理"
        isMobile={isMobile}
        action={(
          <div style={{ display:'grid', gap:10, width: isMobile ? '100%' : 'auto' }}>
            <button onClick={onCreateClass} style={{ padding: isMobile ? '12px 16px' : '13px 18px', background:`linear-gradient(135deg, ${T.primary}, #e8a840)`, border:'none', borderRadius:999, color:'#fff', fontSize: isMobile ? 13 : 14, fontWeight:800, cursor:'pointer', whiteSpace:'nowrap', boxShadow:'0 14px 28px rgba(200,133,42,0.18)' }}>
              + {isMobile ? '创建班级' : '创建新班级'}
            </button>
          </div>
        )}
      />
    </div>
  );
}

function ClassesView({ classes, isMobile, selectedClass, onSelectClass, onSetSelectedClass, initialWritingId, initialTab, onOpenWriting, onEditPassword, onImportRoster, rosterRefreshKey }) {
  if (isMobile) {
    return (
      <ClassListPanel
        classes={classes}
        isMobile
        onSelectClass={onSelectClass}
      />
    );
  }
  return (
    <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:16, alignItems:'start' }}>
      <ClassListPanel
        classes={classes}
        selectedClassId={selectedClass?.id || null}
        onSelectClass={onSetSelectedClass}
      />
      {selectedClass && (
        <div style={{ background:'linear-gradient(180deg, #fffdfa 0%, #fff 100%)', borderRadius:24, border:`1px solid rgba(99, 74, 39, 0.1)`, boxShadow:'0 18px 42px rgba(99, 74, 39, 0.08)', padding:'22px 24px' }}>
          <ClassDetailPanel
            selectedClass={selectedClass}
            isMobile={false}
            highlightedWritingId={initialWritingId}
            initialTab={initialTab}
            onOpenWriting={onOpenWriting}
            onEditPassword={onEditPassword}
            onImportRoster={onImportRoster}
            rosterRefreshKey={rosterRefreshKey}
          />
        </div>
      )}
    </div>
  );
}

// Existing page orchestration is intentionally kept together until the class panels split.
// eslint-disable-next-line complexity
export default function ClassManagementPage({
  user,
  isMobile,
  initialSelectedClassId,
  initialWritingId,
  initialTab,
  onBackToWorkbench: _onBackToWorkbench,
  onOpenWriting,
}) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showImportRoster, setShowImportRoster] = useState(false);
  const [rosterRefreshKey, setRosterRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  // 移动端：是否在查看详情（而不是班级列表）
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError('');
    classesAPI.list()
      .then(list => {
        setClasses(list);
        if (initialSelectedClassId) {
          const matched = list.find(cls => sameId(cls.id, initialSelectedClassId));
          if (matched) {
            setSelectedClass(matched);
            if (isMobile) setMobileShowDetail(true);
            return;
          }
        }
        if (list.length > 0) setSelectedClass(list[0]);
      })
      .catch((error) => {
        setLoadError(error.message || '班级列表加载失败，请稍后再试。');
      })
      .finally(() => setLoading(false));
  }, [initialSelectedClassId, isMobile]);

  const handleCreate = (cls) => {
    setClasses(prev => [...prev, cls]);
    setSelectedClass(cls);
  };

  const handlePasswordSaved = (newPwd) => {
    setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, password: newPwd } : c));
    setSelectedClass(prev => ({ ...prev, password: newPwd }));
  };

  const handleRosterImported = () => {
    setRosterRefreshKey((value) => value + 1);
  };

  const handleSelectClass = (cls) => {
    setSelectedClass(cls);
    if (isMobile) setMobileShowDetail(true);
  };

  return (
    <div style={{ padding: isMobile ? '0' : '0', maxWidth:'100%', margin:'0 auto' }}>
      {showCreate && <CreateClassModal onClose={() => setShowCreate(false)} onCreate={handleCreate} isMobile={isMobile} />}
      {showEditPassword && selectedClass && (
        <EditPasswordModal selectedClass={selectedClass} onClose={() => setShowEditPassword(false)} onSaved={handlePasswordSaved} isMobile={isMobile} />
      )}
      {showImportRoster && selectedClass && (
        <ImportRosterModal selectedClass={selectedClass} onClose={() => setShowImportRoster(false)} onImported={handleRosterImported} isMobile={isMobile} />
      )}

      {/* 移动端：详情页返回按钮 */}
      {isMobile && mobileShowDetail && selectedClass ? (
        <div>
          <button onClick={() => setMobileShowDetail(false)} style={{ display:'flex', alignItems:'center', gap:6, background:'transparent', border:'none', color:T.primary, fontSize:14, fontWeight:600, cursor:'pointer', padding:'8px 0', marginBottom:12 }}>
            ← 返回班级列表
          </button>
          <div style={{ background:T.card, borderRadius:14, border:`1px solid ${T.border}`, padding:'16px' }}>
            <ClassDetailPanel
              selectedClass={selectedClass}
              user={user}
              isMobile={isMobile}
              highlightedWritingId={initialWritingId}
              initialTab={initialTab}
              onOpenWriting={onOpenWriting}
              onEditPassword={() => setShowEditPassword(true)}
              onImportRoster={() => setShowImportRoster(true)}
              rosterRefreshKey={rosterRefreshKey}
            />
          </div>
        </div>
      ) : (
        <>
          <ClassPageHeader isMobile={isMobile} onCreateClass={() => setShowCreate(true)} />

          {loading && (
            <EmptyStateCard title="正在加载班级列表" description="" />
          )}

          {!loading && loadError && (
            <EmptyStateCard title="班级列表加载失败" description={loadError} />
          )}

          {!loading && !loadError && classes.length === 0 && (
            <EmptyStateCard title="还没有班级" description="" />
          )}

          {!loading && !loadError && classes.length > 0 && (
            <ClassesView
              classes={classes}
              isMobile={isMobile}
              selectedClass={selectedClass}
              onSelectClass={handleSelectClass}
              onSetSelectedClass={setSelectedClass}
              initialWritingId={initialWritingId}
              initialTab={initialTab}
              onOpenWriting={onOpenWriting}
              onEditPassword={() => setShowEditPassword(true)}
              onImportRoster={() => setShowImportRoster(true)}
              rosterRefreshKey={rosterRefreshKey}
            />
          )}
        </>
      )}
    </div>
  );
}
