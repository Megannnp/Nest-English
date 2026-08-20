import { useEffect, useMemo } from "react";

import {
  buildClassOptions,
  countRiskItems,
  filterItemsByClass,
} from "./derivedStateHelpers.js";
import { buildVisibleSections, deriveAutoFocus } from "./modelHelpers.js";
import { usersAPI } from "../../api/index.js";

export default function useTeacherWorkbenchDerivedState({
  activeTodoFilter,
  commentClassFilter,
  gradingClassFilter,
  manualTodoFilterUntil,
  pendingComments,
  pendingGradings,
  setActiveTodoFilter,
  setAutoFocusHint,
  setCommentClassFilter,
  setGradingClassFilter,
  todo,
  todoFilterStorageKey,
  userId,
}) {
  useEffect(() => {
    if (manualTodoFilterUntil > Date.now()) return;
    const { nextFilter, hint } = deriveAutoFocus(todo);
    if (nextFilter !== activeTodoFilter) setActiveTodoFilter(nextFilter);
    setAutoFocusHint(hint);
  }, [
    activeTodoFilter,
    manualTodoFilterUntil,
    setActiveTodoFilter,
    setAutoFocusHint,
    todo,
  ]);

  const visibleSections = useMemo(
    () => buildVisibleSections(activeTodoFilter),
    [activeTodoFilter]
  );
  const gradingClassOptions = useMemo(
    () => buildClassOptions(pendingGradings),
    [pendingGradings]
  );
  const filteredPendingGradings = useMemo(
    () => filterItemsByClass(pendingGradings, gradingClassFilter),
    [gradingClassFilter, pendingGradings]
  );
  const commentClassOptions = useMemo(
    () => buildClassOptions(pendingComments),
    [pendingComments]
  );
  const filteredPendingComments = useMemo(
    () => filterItemsByClass(pendingComments, commentClassFilter),
    [commentClassFilter, pendingComments]
  );

  useEffect(() => {
    if (gradingClassFilter !== "all" && !gradingClassOptions.some((option) => option.value === gradingClassFilter)) {
      setGradingClassFilter("all");
    }
  }, [gradingClassFilter, gradingClassOptions, setGradingClassFilter]);

  useEffect(() => {
    if (commentClassFilter !== "all" && !commentClassOptions.some((option) => option.value === commentClassFilter)) {
      setCommentClassFilter("all");
    }
  }, [commentClassFilter, commentClassOptions, setCommentClassFilter]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        todoFilterStorageKey,
        JSON.stringify({ gradingClassFilter, commentClassFilter })
      );
    } catch {
      // ignore storage failures
    }
  }, [commentClassFilter, gradingClassFilter, todoFilterStorageKey]);

  useEffect(() => {
    if (!userId) return undefined;
    const timer = window.setTimeout(() => {
      usersAPI.updateProfile({
        preferences: {
          teacherWorkbenchFilters: { gradingClassFilter, commentClassFilter },
        },
      }).catch(() => {});
    }, 350);
    return () => window.clearTimeout(timer);
  }, [commentClassFilter, gradingClassFilter, userId]);

  const gradingRiskCount = useMemo(
    () => countRiskItems(pendingGradings, (flags) => flags.isHighRisk),
    [pendingGradings]
  );
  const gradingOffTopicCount = useMemo(
    () => countRiskItems(pendingGradings, (flags) => flags.isOffTopic),
    [pendingGradings]
  );
  const commentRiskCount = useMemo(
    () => countRiskItems(pendingComments, (flags) => flags.isHighRisk),
    [pendingComments]
  );
  const commentOffTopicCount = useMemo(
    () => countRiskItems(pendingComments, (flags) => flags.isOffTopic),
    [pendingComments]
  );

  return {
    visibleSections,
    gradingClassOptions,
    filteredPendingGradings,
    commentClassOptions,
    filteredPendingComments,
    gradingRiskCount,
    gradingOffTopicCount,
    commentRiskCount,
    commentOffTopicCount,
  };
}
