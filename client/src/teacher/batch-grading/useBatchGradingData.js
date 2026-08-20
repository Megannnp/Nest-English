import { useEffect, useRef } from "react";

import { assignmentsAPI, classesAPI } from "../../api/index.js";

export function useBatchGradingData({
  user,
  selectedClassId,
  selectedAssignmentId,
  setClasses,
  setSelectedClassId,
  setClassStudents,
  setRosterItems,
  setAssignments,
  setSelectedAssignmentId,
  setClassesError,
  studentsInClass,
}) {
  const classRequestIdRef = useRef(0);
  const studentsInClassRef = useRef(studentsInClass);

  useEffect(() => {
    studentsInClassRef.current = studentsInClass;
  }, [studentsInClass]);

  useEffect(() => () => {}, []);

  useEffect(() => {
    if (user.role !== "teacher") return;
    setClassesError?.("");
    classesAPI
      .list()
      .then((list) => {
        setClasses(list);
        if (list.length === 1) setSelectedClassId((prev) => prev || list[0].id);
      })
      .catch((error) => {
        setClassesError?.(error.message || "班级列表加载失败，请稍后再试。");
      });
  }, [setClasses, setClassesError, setSelectedClassId, user.role]);

  useEffect(() => {
    classRequestIdRef.current += 1;
    const requestId = classRequestIdRef.current;

    if (user.role !== "teacher" || !selectedClassId) {
      setClassStudents(studentsInClassRef.current);
      setRosterItems([]);
      setAssignments([]);
      setSelectedAssignmentId("");
      return;
    }

    Promise.all([
      classesAPI.getStudents(selectedClassId).catch(() => []),
      classesAPI.getRoster(selectedClassId).catch(() => []),
      assignmentsAPI.list(selectedClassId).catch(() => []),
    ]).then(([students, roster, assignmentList]) => {
      if (classRequestIdRef.current !== requestId) return;
      const availableAssignments = (assignmentList || []).filter((assignment) => assignment.status === "published" || assignment.status === "closed");
      setClassStudents(students);
      setRosterItems(roster);
      setAssignments(availableAssignments);
      if (
        selectedAssignmentId
        && !availableAssignments.some((assignment) => String(assignment.id) === String(selectedAssignmentId))
      ) {
        setSelectedAssignmentId("");
      }
    });
  }, [
    selectedAssignmentId,
    selectedClassId,
    setAssignments,
    setClassStudents,
    setRosterItems,
    setSelectedAssignmentId,
    user.role,
  ]);
}
