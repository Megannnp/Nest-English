import { useEffect, useMemo, useState } from 'react';

import { fetchClassRosterSnapshot, sameId } from './domain.js';
import {
  CLASS_DETAIL_STATUS,
  createPendingFeedbackMessage,
  ROSTER_SYNC_ACTION,
} from './state.js';
import { classesAPI } from '../../api/index.js';
import { getRequestStateFromError } from '../../utils/requestState.js';

function findMatchedRosterEntry({ action, rosterEntries, rosterEntryId, student }) {
  if (action === ROSTER_SYNC_ACTION.linkSpecificRoster) {
    return rosterEntries.find((entry) => sameId(entry.id, rosterEntryId));
  }

  return rosterEntries.find((entry) => {
    const rosterStudentNo = String(entry.studentNo || '').trim();
    const studentNo = String(student.studentNo || '').trim();
    return rosterStudentNo && rosterStudentNo === studentNo;
  });
}

function countMatchedRosterWritings(classWritingRecords, rosterEntry) {
  if (!rosterEntry) return 0;
  return classWritingRecords.filter((record) => sameId(record.rosterId, rosterEntry.id)).length;
}

function shouldConfirmRosterLink(matchedRosterEntry, matchedRosterWritingCount) {
  return Boolean(matchedRosterEntry && matchedRosterWritingCount > 0);
}

function buildRosterLinkConfirmMessage(matchedRosterEntry, matchedRosterWritingCount, student) {
  return `将”${matchedRosterEntry.studentName || matchedRosterEntry.studentNo || '这条名单'}”绑定到账号”${student.realName || student.name || student.email || '该学生'}”。\n\n该名单下已有 ${matchedRosterWritingCount} 篇历史作文/反馈，绑定后会归入这个学生账号。请确认学生身份无误。`;
}

async function performStudentSyncAction({ action, selectedClassId, studentId, rosterEntryId }) {
  if (action === ROSTER_SYNC_ACTION.createAndLink) {
    await classesAPI.createAndLinkRosterUser(selectedClassId, studentId);
    return;
  }
  if (action === ROSTER_SYNC_ACTION.linkByStudentNo) {
    await classesAPI.linkRosterUser(selectedClassId, studentId);
    return;
  }
  if (action === ROSTER_SYNC_ACTION.linkSpecificRoster) {
    await classesAPI.linkSpecificRosterUser(selectedClassId, rosterEntryId, studentId);
  }
}

function getStudentSyncErrorState(error, action) {
  return getRequestStateFromError(error, {
    genericTitle: action === ROSTER_SYNC_ACTION.linkSpecificRoster ? '绑定所选名单失败' : '处理待处理账号失败',
    genericDescription: action === ROSTER_SYNC_ACTION.linkSpecificRoster ? '这次没能完成手动绑定。请稍后再试。' : '这次没能完成账号和名单的关联。请稍后再试。',
  });
}

export default function useClassDetailModel({
  selectedClass,
  highlightedWritingId = null,
  rosterRefreshKey = 0,
  requestConfirm,
}) {
  const [students, setStudents] = useState([]);
  const [rosterEntries, setRosterEntries] = useState([]);
  const [unmatchedStudents, setUnmatchedStudents] = useState([]);
  const [classWritingRecords, setClassWritingRecords] = useState([]);
  const [status, setStatus] = useState(CLASS_DETAIL_STATUS.loading);
  const [detailError, setDetailError] = useState('');
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [activeStudentActionId, setActiveStudentActionId] = useState('');
  const [activeRosterActionId, setActiveRosterActionId] = useState('');
  const [pendingMessage, setPendingMessage] = useState(null);
  const [selectedRosterEntryByStudentId, setSelectedRosterEntryByStudentId] = useState({});

  useEffect(() => {
    let cancelled = false;

    setStatus(CLASS_DETAIL_STATUS.loading);
    setDetailError('');
    fetchClassRosterSnapshot(selectedClass.id)
      .then((snapshot) => {
        if (cancelled) return;
        setStudents(snapshot.students);
        setRosterEntries(snapshot.rosterEntries);
        setUnmatchedStudents(snapshot.unmatchedStudents);
        setClassWritingRecords(snapshot.classWritingRecords);
        setSelectedRosterEntryByStudentId({});
        setStatus(CLASS_DETAIL_STATUS.ready);
      })
      .catch((error) => {
        if (cancelled) return;
        setDetailError(error.message || '班级详情加载失败，请稍后重试。');
        setStatus(CLASS_DETAIL_STATUS.error);
      });

    return () => {
      cancelled = true;
    };
  }, [rosterRefreshKey, selectedClass.id]);

  const refreshClassSnapshot = async () => {
    const snapshot = await fetchClassRosterSnapshot(selectedClass.id);
    setStudents(snapshot.students);
    setRosterEntries(snapshot.rosterEntries);
    setUnmatchedStudents(snapshot.unmatchedStudents);
    setClassWritingRecords(snapshot.classWritingRecords);
    setSelectedRosterEntryByStudentId({});
    setStatus(CLASS_DETAIL_STATUS.ready);
  };

  const runStudentSyncAction = async ({ student, action, rosterEntryId = '' }) => {
    if (!student?.id) return;

    const matchedRosterEntry = findMatchedRosterEntry({ action, rosterEntries, rosterEntryId, student });
    const matchedRosterWritingCount = countMatchedRosterWritings(classWritingRecords, matchedRosterEntry);

    if (shouldConfirmRosterLink(matchedRosterEntry, matchedRosterWritingCount)) {
      const confirmFn = requestConfirm ?? ((msg) => Promise.resolve(window.confirm(msg)));
      const ok = await confirmFn(buildRosterLinkConfirmMessage(matchedRosterEntry, matchedRosterWritingCount, student));
      if (!ok) return;
    }

    setActiveStudentActionId(student.id);
    setPendingMessage(null);

    try {
      await performStudentSyncAction({
        action,
        selectedClassId: selectedClass.id,
        studentId: student.id,
        rosterEntryId,
      });
      setPendingMessage(createPendingFeedbackMessage(action, student));
      await refreshClassSnapshot();
    } catch (error) {
      setPendingMessage(getStudentSyncErrorState(error, action));
    } finally {
      setActiveStudentActionId('');
    }
  };

  const runRosterSyncAction = async ({ rosterEntry, action }) => {
    if (!rosterEntry?.id) return;
    setActiveRosterActionId(rosterEntry.id);
    setPendingMessage(null);

    try {
      if (action === ROSTER_SYNC_ACTION.unlinkRoster) {
        await classesAPI.unlinkRosterUser(selectedClass.id, rosterEntry.id);
      }
      setPendingMessage(createPendingFeedbackMessage(action, rosterEntry));
      await refreshClassSnapshot();
    } catch (error) {
      setPendingMessage(getRequestStateFromError(error, {
        genericTitle: '解绑失败',
        genericDescription: '这次没能解除账号和名单的关联。请稍后再试。',
      }));
    } finally {
      setActiveRosterActionId('');
    }
  };

  const highlightedWriting = useMemo(() => {
    if (!highlightedWritingId) return null;
    return classWritingRecords
      .filter((record) => record.source === 'homework')
      .find((record) => sameId(record.id, highlightedWritingId)) || null;
  }, [classWritingRecords, highlightedWritingId]);

  return {
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
      selectRosterEntryForStudent: (studentId, rosterEntryId) => {
        setSelectedRosterEntryByStudentId((current) => ({ ...current, [studentId]: rosterEntryId }));
      },
      runStudentSyncAction,
      runRosterSyncAction,
    },
  };
}
