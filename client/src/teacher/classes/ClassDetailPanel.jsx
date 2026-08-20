import ClassHeaderCard from './ClassHeaderCard.jsx';
import ClassRosterPanel from './ClassRosterPanel.jsx';
import ClassStudentsPanel from './ClassStudentsPanel.jsx';
import PendingAccountsPanel from './PendingAccountsPanel.jsx';
import { CLASS_DETAIL_STATUS, ROSTER_SYNC_ACTION } from './state.js';
import { T } from './styles.js';
import useClassDetailModel from './useClassDetailModel.js';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import { useConfirmDialog } from '../../hooks/useConfirmDialog.js';

export default function ClassDetailPanel({
  selectedClass,
  isMobile = false,
  highlightedWritingId = null,
  initialTab = null,
  onOpenWriting = null,
  onEditPassword = null,
  onImportRoster = null,
  rosterRefreshKey = 0,
}) {
  const { confirmState, requestConfirm, respondConfirm } = useConfirmDialog();

  const {
    state: {
      students,
      rosterEntries,
      unmatchedStudents,
      classWritingRecords,
      status,
      detailError,
      studentsOpen,
      activeStudentActionId,
      activeRosterActionId,
      pendingMessage,
      selectedRosterEntryByStudentId,
      highlightedWriting,
    },
    actions: {
      setStudentsOpen,
      selectRosterEntryForStudent,
      runStudentSyncAction,
      runRosterSyncAction,
    },
  } = useClassDetailModel({
    selectedClass,
    highlightedWritingId,
    rosterRefreshKey,
    requestConfirm,
  });

  return (
    <>
    <ConfirmDialog state={confirmState} onRespond={respondConfirm} />
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {highlightedWriting ? (
        <div style={{ background:'#fff7ed', border:`1px solid #f0cc80`, borderRadius:12, padding:isMobile ? '12px 14px' : '14px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, color:T.text, fontWeight:700, lineHeight:1.5 }}>{highlightedWriting.userName} · {highlightedWriting.writingTitle || '未命名写作'}</div>
            </div>
            <button onClick={() => onOpenWriting?.({ writingId: highlightedWriting.id, classId: selectedClass.id, tab: initialTab || 'all' })} style={{ padding:'6px 12px', borderRadius:999, border:'none', background:`linear-gradient(135deg, ${T.primary}, #e8a840)`, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
              去作文详情
            </button>
          </div>
        </div>
      ) : null}

      <ClassHeaderCard
        selectedClass={selectedClass}
        isMobile={isMobile}
        onEditPassword={onEditPassword}
        onImportRoster={onImportRoster}
      />

      <ClassStudentsPanel
        loading={status === CLASS_DETAIL_STATUS.loading}
        students={students}
        writings={classWritingRecords}
        classCode={selectedClass.classCode}
        open={studentsOpen}
        onToggle={setStudentsOpen}
        isMobile={isMobile}
        onOpenWriting={onOpenWriting}
      />

      <ClassRosterPanel
        loading={status === CLASS_DETAIL_STATUS.loading}
        error={detailError}
        rosterEntries={rosterEntries}
        isMobile={isMobile}
        handlingRosterEntryId={activeRosterActionId}
        onUnlink={(rosterEntry) => runRosterSyncAction({ rosterEntry, action: ROSTER_SYNC_ACTION.unlinkRoster })}
      />

      {unmatchedStudents.length > 0 ? (
        <PendingAccountsPanel
          loading={status === CLASS_DETAIL_STATUS.loading}
          error={detailError}
          unmatchedStudents={unmatchedStudents}
          isMobile={isMobile}
          handlingStudentId={activeStudentActionId}
          message={pendingMessage}
          onLinkByStudentNo={(student) => runStudentSyncAction({ student, action: ROSTER_SYNC_ACTION.linkByStudentNo })}
          onCreateAndLink={(student) => runStudentSyncAction({ student, action: ROSTER_SYNC_ACTION.createAndLink })}
          rosterEntries={rosterEntries}
          selectedRosterEntryByStudentId={selectedRosterEntryByStudentId}
          onSelectRosterEntry={selectRosterEntryForStudent}
          onLinkSpecificRoster={(student, rosterEntryId) => runStudentSyncAction({ student, rosterEntryId, action: ROSTER_SYNC_ACTION.linkSpecificRoster })}
        />
      ) : null}
    </div>
    </>
  );
}
