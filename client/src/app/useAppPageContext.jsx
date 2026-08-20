import { useMemo } from "react";

import { writeModuleTaskContext } from "../utils/moduleTaskContext.js";

const GRAMMAR_TASK_STORAGE_KEY = "nest_grammar_task_context";

export default function useAppPageContext({
  route,
  state,
  actions,
  navigation,
}) {
  const studentPage = useMemo(() => ({
    state: {
      questions: state.questions,
      myWritings: state.myWritings,
      preloadedQ: state.preloadedQ,
      writingFeedback: state.writingFeedback,
      currentTask: state.currentTask,
      guestWritingDraft: state.guestWritingDraft,
      selectedViewingWritingId: route.selectedStudentViewingWritingId,
      writingSessionKey: state.studentWritingSessionKey,
    },
    actions: {
      handleQuestionsChange: actions.handleQuestionsChange,
      handleWritingSaved: actions.handleWritingSaved,
      setCurrentTask: actions.setCurrentTask,
      setWritingFeedback: actions.setWritingFeedback,
      setGuestWritingDraft: actions.setGuestWritingDraft,
      resetWritingSession: actions.resetStudentWritingSession,
      setPage: navigation.setPage,
      setUser: actions.setUser,
      openTask: (task) => {
        if (task?.taskType === "grammar") {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(GRAMMAR_TASK_STORAGE_KEY, JSON.stringify(task));
          }
          navigation.setPage("grammar-quiz");
          return;
        }
        if (task?.taskType === "module") {
          const entryPage = task.assignment?.entryPage;
          writeModuleTaskContext(task);
          if (entryPage) navigation.setPage(entryPage);
          return;
        }
        actions.resetStudentWritingSession();
        actions.setCurrentTask(task);
        navigation.setPage("writing");
      },
      openRecordById: navigation.openStudentRecord,
    },
  }), [
    actions,
    navigation,
    route.selectedStudentViewingWritingId,
    state.currentTask,
    state.guestWritingDraft,
    state.myWritings,
    state.preloadedQ,
    state.questions,
    state.studentWritingSessionKey,
    state.writingFeedback,
  ]);

  const teacherPage = useMemo(() => ({
    state: {
      selectedWritingContext: route.selectedTeacherWritingContext,
      selectedTodoScene: route.selectedTeacherTodoScene,
      selectedAssignmentId: route.selectedTeacherAssignmentId,
      questions: state.questions,
      writingFeedback: state.writingFeedback,
      writingSessionKey: state.teacherWritingSessionKey,
    },
    actions: {
      handleQuestionsChange: actions.handleQuestionsChange,
      handleWritingSaved: actions.handleWritingSaved,
      setWritingFeedback: actions.setWritingFeedback,
      resetWritingSession: actions.resetTeacherWritingSession,
      setPage: navigation.setPage,
      setUser: actions.setUser,
      openWriting: navigation.openTeacherWriting,
      openTodoScene: navigation.openTeacherTodoScene,
      openAssignment: navigation.openTeacherAssignment,
      openClassContext: navigation.openClassContext,
    },
  }), [
    actions,
    navigation,
    route.selectedTeacherAssignmentId,
    route.selectedTeacherTodoScene,
    route.selectedTeacherWritingContext,
    state.questions,
    state.teacherWritingSessionKey,
    state.writingFeedback,
  ]);

  return { studentPage, teacherPage };
}
