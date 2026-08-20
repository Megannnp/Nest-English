import { useCallback, useEffect, useMemo, useRef } from "react";

import { normalizePage } from "./navigation.js";
import useAppRouter from "./useAppRouter.jsx";

function buildTeacherWritingContext(payload) {
  if (!payload) return null;
  return {
    writingId: String(payload.writingId || ""),
    classId: payload.classId || null,
    tab: payload.tab || null,
  };
}

function pickPageScopedValue(normalizedPage, expectedPage, overrideValue, currentValue, fallbackValue) {
  return normalizedPage === expectedPage
    ? (overrideValue ?? currentValue ?? fallbackValue)
    : fallbackValue;
}

function pageOptionsForUser(user) {
  return { isAdmin: user?.is_admin === 1 };
}

function buildNextRouteState(route, page, overrides = {}, user = null) {
  const normalizedPage = normalizePage(page, user?.role ?? null, pageOptionsForUser(user));
  return {
    ...route,
    page: normalizedPage,
    selectedTeacherWritingContext: pickPageScopedValue(
      normalizedPage,
      "teacher-writing-detail",
      overrides.selectedTeacherWritingContext,
      route.selectedTeacherWritingContext,
      null
    ),
    selectedTeacherAssignmentId: pickPageScopedValue(
      normalizedPage,
      "assignment-create",
      overrides.selectedTeacherAssignmentId,
      route.selectedTeacherAssignmentId,
      ""
    ),
    selectedStudentViewingWritingId: pickPageScopedValue(
      normalizedPage,
      "records",
      overrides.selectedStudentViewingWritingId,
      route.selectedStudentViewingWritingId,
      ""
    ),
    selectedTeacherTodoScene: pickPageScopedValue(
      normalizedPage,
      "teacher-todo",
      overrides.selectedTeacherTodoScene,
      route.selectedTeacherTodoScene,
      "gradings"
    ),
    ...overrides,
  };
}

export default function useAppNavigation({ user, resetTeacherWritingSession }) {
  const { route, commitRoute } = useAppRouter();
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const navigateToPage = useCallback((page, options = {}) => {
    const { routeOverrides = {}, replace = false, user: targetUser = null } = options;
    commitRoute(
      (currentRoute) => buildNextRouteState(currentRoute, page, routeOverrides, targetUser),
      { replace }
    );
  }, [commitRoute]);

  const handleNavigate = useCallback((page, options = {}) => {
    navigateToPage(page, { ...options, user: options.user ?? userRef.current });
  }, [navigateToPage]);

  const normalizedPage = useMemo(
    () => normalizePage(route.page, user?.role ?? null, pageOptionsForUser(user)),
    [route.page, user]
  );

  useEffect(() => {
    const next = normalizePage(route.page, user?.role ?? null, pageOptionsForUser(user));
    if (next !== route.page) navigateToPage(next, { replace: true, user });
  }, [navigateToPage, route.page, user]);

  const setPage = useCallback((nextPage, options = {}) => {
    const resolvedPage = typeof nextPage === "function" ? nextPage(normalizedPage) : nextPage;
    const next = normalizePage(resolvedPage, user?.role ?? null, pageOptionsForUser(user));
    if (user?.role === "teacher" && ["writing", "substitute-upload"].includes(next)) {
      resetTeacherWritingSession();
    }
    navigateToPage(next, { ...options, user });
  }, [navigateToPage, normalizedPage, resetTeacherWritingSession, user]);

  const updateTeacherWritingContext = useCallback((payload, options = {}) => {
    navigateToPage("teacher-writing-detail", {
      replace: options.replace,
      user,
      routeOverrides: {
        selectedTeacherWritingContext: buildTeacherWritingContext(payload),
      },
    });
  }, [navigateToPage, user]);

  const openTeacherAssignment = useCallback((assignmentId = "") => {
    navigateToPage("assignment-create", {
      user,
      routeOverrides: { selectedTeacherAssignmentId: assignmentId ? String(assignmentId) : "" },
    });
  }, [navigateToPage, user]);

  const openTeacherTodoScene = useCallback((scene = "gradings") => {
    navigateToPage("teacher-todo", {
      user,
      routeOverrides: { selectedTeacherTodoScene: scene || "gradings" },
    });
  }, [navigateToPage, user]);

  const openStudentRecord = useCallback((writingId = "") => {
    navigateToPage("records", {
      user,
      routeOverrides: {
        selectedStudentViewingWritingId: writingId ? String(writingId) : "",
      },
    });
  }, [navigateToPage, user]);

  const openClassContext = useCallback((payload) => {
    navigateToPage("classes", {
      user,
      routeOverrides: {
        selectedTeacherWritingContext: buildTeacherWritingContext(payload),
      },
    });
  }, [navigateToPage, user]);

  return {
    route,
    normalizedPage,
    handleNavigate,
    setPage,
    openStudentRecord,
    openTeacherAssignment,
    openTeacherTodoScene,
    openTeacherWriting: updateTeacherWritingContext,
    openClassContext,
  };
}
