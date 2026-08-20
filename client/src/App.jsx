import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";

import AppDocumentHead from "./app/AppDocumentHead.jsx";
import { normalizePage } from "./app/navigation.js";
import { getSiteTheme } from "./app/siteTheme.js";
import useAppRouter from "./app/useAppRouter.jsx";
import useAppSession from "./app/useAppSession.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import AppLoadingShell from "./components/shared/AppLoadingShell.jsx";
import ConfirmDialog from "./components/shared/ConfirmDialog.jsx";
import SingleFeedbackRegressionLab from "./components/SingleFeedbackRegressionLab.jsx";
import useIsMobile from "./hooks/useIsMobile";
import { writeModuleTaskContext } from "./utils/moduleTaskContext.js";

const ProfileCompletionPage = lazy(() => import("./components/ProfileCompletionPage.jsx"));
const AuthenticatedAppShell = lazy(() => import("./app/AuthenticatedAppShell.jsx"));
const GuestAppShell = lazy(() => import("./app/GuestAppShell.jsx"));

const GRAMMAR_TASK_STORAGE_KEY = "nest_grammar_task_context";

const ROUTE_STATE_RULES = {
  selectedTeacherWritingContext: {
    page: "teacher-writing-detail",
    defaultValue: null,
  },
  selectedTeacherAssignmentId: {
    page: "assignment-create",
    defaultValue: "",
  },
  selectedStudentViewingWritingId: {
    page: "records",
    defaultValue: "",
  },
  selectedTeacherTodoScene: {
    page: "teacher-todo",
    defaultValue: "gradings",
  },
  accountTab: {
    page: "account",
    defaultValue: "profile",
  },
  selectedCampCourseId: {
    page: "camp-course-detail",
    defaultValue: "",
  },
  selectedCampMyCourseId: {
    page: "camp-my-course-detail",
    defaultValue: "",
  },
};

function resolveRouteStateField(key, rule, normalizedPage, route, overrides) {
  if (normalizedPage !== rule.page) return rule.defaultValue;
  return overrides[key] ?? route[key] ?? rule.defaultValue;
}

function buildNextRouteState(route, page, overrides = {}, user = null) {
  const normalizedPage = normalizePage(page, user?.role ?? null, { isAdmin: user?.is_admin === 1 });
  const scopedRouteState = Object.fromEntries(
    Object.entries(ROUTE_STATE_RULES).map(([key, rule]) => [
      key,
      resolveRouteStateField(key, rule, normalizedPage, route, overrides),
    ])
  );

  return {
    ...route,
    page: normalizedPage,
    ...scopedRouteState,
    ...overrides,
  };
}

function renderGuestShell(context) {
  return (
    <AppErrorBoundary resetKey={context.normalizedPage}>
      <Suspense fallback={<AppLoadingShell />}>
        <AppDocumentHead page={context.normalizedPage} />
        <GuestAppShell
          page={context.normalizedPage}
          isMobile={context.isMobile}
          serviceError={context.serviceError}
          authMode={context.authMode}
          setAuthMode={context.setAuthMode}
          questions={context.questions}
          guestWritingDraft={context.guestWritingDraft}
          setGuestWritingDraft={context.setGuestWritingDraft}
          guestAuthState={context.guestAuthState}
          setGuestAuthState={context.setGuestAuthState}
          guestDraftFlags={context.guestDraftFlags}
          onLogin={context.handleLogin}
          onNavigate={context.setPage}
        />
      </Suspense>
    </AppErrorBoundary>
  );
}

function renderProfileCompletionShell(context) {
  return (
    <Suspense fallback={<AppLoadingShell />}>
      <AppDocumentHead page={context.normalizedPage} />
      <ProfileCompletionPage
        user={context.user}
        onComplete={context.handleProfileComplete}
        onSkip={context.handleProfileSkip}
      />
    </Suspense>
  );
}

function NavProgressBar({ show }) {
  if (!show) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        background: "linear-gradient(90deg, #c8872d 0%, #e8a840 60%, #c8872d 100%)",
        backgroundSize: "200% 100%",
        animation: "nest-nav-shimmer 1.2s ease infinite",
      }}
    />
  );
}

function renderAuthenticatedShell(context) {
  return (
    <AppErrorBoundary resetKey={context.normalizedPage}>
      <>
        <ConfirmDialog state={context.logoutConfirmState} onRespond={context.respondLogoutConfirm} confirmLabel="退出" />
        <NavProgressBar show={context.showNavBar} />
        <Suspense fallback={<AppLoadingShell />}>
          <AppDocumentHead page={context.normalizedPage} />
          <AuthenticatedAppShell
            user={context.user}
            page={context.normalizedPage}
            setPage={context.setPage}
            setUser={context.setUser}
            isMobile={context.isMobile}
            sideHover={context.sideHover}
            setSideHover={context.setSideHover}
            showAccountMenu={context.showAccountMenu}
            setShowAccountMenu={context.setShowAccountMenu}
            handleLogout={context.handleLogout}
            studentPage={context.studentPage}
            teacherPage={context.teacherPage}
            needProfile={context.needProfile}
          />
        </Suspense>
      </>
    </AppErrorBoundary>
  );
}

function renderAppContentShell(context) {
  if (!context.authChecked) return <AppLoadingShell />;
  if (!context.user) return renderGuestShell(context);
  if (context.isRegressionLab && context.user?.is_admin === 1) {
    return <SingleFeedbackRegressionLab user={context.user} />;
  }
  if (context.needProfile) return renderProfileCompletionShell(context);
  return renderAuthenticatedShell(context);
}

function AppContent() {
  const { route, commitRoute, isPending } = useAppRouter();

  // Only show the nav-progress bar after 150 ms so that instant cached-chunk
  // transitions never cause a flash of the bar itself.
  const [showNavBar, setShowNavBar] = useState(false);
  useEffect(() => {
    if (!isPending) { setShowNavBar(false); return undefined; }
    const id = setTimeout(() => setShowNavBar(true), 150);
    return () => clearTimeout(id);
  }, [isPending]);
  const isMobile = useIsMobile();
  const [accountReturnRoute, setAccountReturnRoute] = useState(null);


  const navigateToPage = useCallback((page, options = {}) => {
    const { routeOverrides = {}, replace = false, user = null } = options;
    commitRoute((currentRoute) => buildNextRouteState(currentRoute, page, routeOverrides, user), { replace });
  }, [commitRoute]);

  // Keep a ref to navigateToPage so the normalization effect doesn't re-run
  // every time commitRoute/route identity changes (which is every navigation).
  const navigateToPageRef = useRef(navigateToPage);
  useEffect(() => { navigateToPageRef.current = navigateToPage; });

  const {
    state: {
      logoutConfirmState,
      respondLogoutConfirm,
      writingFeedback,
      user,
      authChecked,
      needProfile,
      authMode,
      serviceError,
      preloadedQ,
      currentTask,
      questions,
      myWritings,
      studentWritingSessionKey,
      teacherWritingSessionKey,
      sideHover,
      showAccountMenu,
      guestWritingDraft,
      guestAuthState,
      guestDraftFlags,
    },
    actions: {
      setWritingFeedback,
      setUser,
      setAuthMode,
      setCurrentTask,
      setSideHover,
      setShowAccountMenu,
      setGuestWritingDraft,
      setGuestAuthState,
      resetStudentWritingSession,
      resetTeacherWritingSession,
      handleLogin,
      handleProfileComplete,
      handleProfileSkip,
      handleLogout,
      handleQuestionsChange,
      handleWritingSaved,
    },
  } = useAppSession({
    initialPage: route.page,
    getCurrentPage: () => route.page,
    onNavigate: (page, options = {}) => navigateToPage(page, { ...options, user: options.user ?? user }),
  });

  const normalizedPage = normalizePage(route.page, user?.role ?? null, { isAdmin: user?.is_admin === 1 });
  const isRegressionLab = route.lab === "single-feedback";
  const siteTheme = getSiteTheme(normalizedPage);

  useEffect(() => {
    if (!window.history || !("scrollRestoration" in window.history)) return undefined;

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  // Normalize invalid/legacy page names in the URL. Depends only on route.page
  // and user.role — intentionally NOT on navigateToPage to avoid re-firing on
  // every navigation (navigateToPage gets a new identity whenever route changes).
  // Gated on authChecked: before the auth check resolves, role/isAdmin are
  // unknown, so normalizing then would misfire (e.g. bounce an admin off
  // /app/admin before we know they're an admin), replacing the URL and
  // discarding any hash fragment in the process.
  const userRole = user?.role ?? null;
  const isAdminUser = user?.is_admin === 1;
  useEffect(() => {
    if (!authChecked) return;
    const nextNormalizedPage = normalizePage(route.page, userRole, { isAdmin: isAdminUser });
    if (nextNormalizedPage !== route.page) {
      navigateToPageRef.current(nextNormalizedPage, { replace: true, user });
    }
  }, [authChecked, isAdminUser, route.page, user, userRole]);

  useEffect(() => {
    document.body.dataset.siteTheme = siteTheme;
    document.documentElement.dataset.siteTheme = siteTheme;

    return () => {
      delete document.body.dataset.siteTheme;
      delete document.documentElement.dataset.siteTheme;
    };
  }, [siteTheme]);

  useEffect(() => {
    if (isPending) {
      document.body.dataset.navigationPending = "true";
      document.documentElement.dataset.navigationPending = "true";
    } else {
      delete document.body.dataset.navigationPending;
      delete document.documentElement.dataset.navigationPending;
    }

    return () => {
      delete document.body.dataset.navigationPending;
      delete document.documentElement.dataset.navigationPending;
    };
  }, [isPending]);

  // Remembers each page's last scroll position for the lifetime of the
  // session, so navigating back to a page (whether via an in-app "返回"
  // button — a PUSH, not a POP — or the browser's back/forward buttons)
  // restores where the user left off. Any other navigation — including
  // between two different pages of the same module — resets to the top,
  // since it's a genuinely new page the user hasn't scrolled on yet.
  const scrollPositionsRef = useRef({});
  const currentPageRef = useRef(null);

  useEffect(() => {
    const handleScroll = (event) => {
      const key = currentPageRef.current;
      if (!key) return;

      if (event.target === document || event.target === window) {
        scrollPositionsRef.current[key] = window.scrollY || document.scrollingElement?.scrollTop || 0;
      } else if (event.target?.classList?.contains("app-shell-main")) {
        scrollPositionsRef.current[key] = event.target.scrollTop;
      }
    };

    // "scroll" doesn't bubble, but capturing on window still sees it fire on
    // any scrollable descendant (like .app-shell-main) during the capture phase.
    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, []);

  const prevPageRef = useRef(null);
  useEffect(() => {
    // "auth" is a modal overlay — the underlying page doesn't change, so
    // scrolling to the top would be jarring when the modal opens or closes.
    if (normalizedPage === "auth") return;

    const prevPage = prevPageRef.current;
    prevPageRef.current = normalizedPage;
    currentPageRef.current = normalizedPage;

    // Skip when this effect re-runs for the same page (no real navigation).
    if (normalizedPage === prevPage) return;

    const savedY = scrollPositionsRef.current[normalizedPage] ?? 0;
    window.requestAnimationFrame(() => {
      window.scrollTo?.({ top: savedY, left: 0, behavior: "auto" });
      document.scrollingElement?.scrollTo({ top: savedY, left: 0, behavior: "auto" });
      document.querySelector(".app-shell-main")?.scrollTo({ top: savedY, left: 0, behavior: "auto" });
    });
  }, [normalizedPage]);

  useEffect(() => {
    if (!showAccountMenu) return undefined;

    const handler = (event) => {
      if (
        event.target.closest?.("[data-account-menu]") ||
        event.target.closest?.("[data-account-trigger]")
      ) {
        return;
      }
      setShowAccountMenu(false);
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [setShowAccountMenu, showAccountMenu]);

  const setPage = useCallback((nextPage, options = {}) => {
    const resolvedPage = typeof nextPage === "function" ? nextPage(normalizedPage) : nextPage;
    const nextNormalizedPage = normalizePage(resolvedPage, user?.role ?? null, { isAdmin: user?.is_admin === 1 });

    if (nextNormalizedPage === "account" && normalizedPage !== "account") {
      setAccountReturnRoute({ ...route, page: normalizedPage });
    } else if (normalizedPage === "account" && nextNormalizedPage !== "account") {
      setAccountReturnRoute(null);
    }

    if (user?.role === "teacher" && ["writing", "substitute-upload"].includes(nextNormalizedPage)) {
      resetTeacherWritingSession();
    }

    navigateToPage(nextNormalizedPage, { ...options, user });
  }, [navigateToPage, normalizedPage, resetTeacherWritingSession, route, user]);

  const updateTeacherWritingContext = useCallback((payload, options = {}) => {
    navigateToPage("teacher-writing-detail", {
      replace: options.replace,
      user,
      routeOverrides: {
        selectedTeacherWritingContext: payload
          ? {
              writingId: String(payload.writingId || ""),
              classId: payload.classId || null,
              tab: payload.tab || null,
            }
          : null,
      },
    });
  }, [navigateToPage, user]);

  const openTeacherAssignment = useCallback((assignmentId = "") => {
    navigateToPage("assignment-create", {
      user,
      routeOverrides: {
        selectedTeacherAssignmentId: assignmentId ? String(assignmentId) : "",
      },
    });
  }, [navigateToPage, user]);

  const openTeacherTodoScene = useCallback((scene = "gradings") => {
    navigateToPage("teacher-todo", {
      user,
      routeOverrides: {
        selectedTeacherTodoScene: scene || "gradings",
      },
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

  const studentPage = useMemo(() => ({
    state: {
      questions,
      myWritings,
      preloadedQ,
      writingFeedback,
      currentTask,
      guestWritingDraft,
      selectedViewingWritingId: route.selectedStudentViewingWritingId,
      accountTab: route.accountTab,
      selectedCampCourseId: route.selectedCampCourseId,
      selectedCampMyCourseId: route.selectedCampMyCourseId,
      accountReturnRoute,
      writingSessionKey: studentWritingSessionKey,
    },
    actions: {
      handleQuestionsChange,
      handleWritingSaved,
      setCurrentTask,
      setWritingFeedback,
      setGuestWritingDraft,
      resetWritingSession: resetStudentWritingSession,
      setPage,
      setUser,
      openTask: (task) => {
        if (task?.taskType === "grammar") {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem(GRAMMAR_TASK_STORAGE_KEY, JSON.stringify(task));
          }
          setPage("grammar-quiz");
          return;
        }
        if (task?.taskType === "module") {
          writeModuleTaskContext(task);
          const entryPage = task.assignment?.entryPage;
          if (entryPage) setPage(entryPage);
          return;
        }
        resetStudentWritingSession();
        setCurrentTask(task);
        setPage("writing");
      },
      openRecordById: openStudentRecord,
    },
  }), [
    currentTask,
    guestWritingDraft,
    handleQuestionsChange,
    handleWritingSaved,
    myWritings,
    openStudentRecord,
    preloadedQ,
    questions,
    resetStudentWritingSession,
    route.selectedStudentViewingWritingId,
    route.accountTab,
    route.selectedCampCourseId,
    route.selectedCampMyCourseId,
    accountReturnRoute,
    setCurrentTask,
    setGuestWritingDraft,
    setPage,
    setUser,
    setWritingFeedback,
    studentWritingSessionKey,
    writingFeedback,
  ]);

  const teacherPage = useMemo(() => ({
    state: {
      selectedWritingContext: route.selectedTeacherWritingContext,
      selectedTodoScene: route.selectedTeacherTodoScene,
      selectedAssignmentId: route.selectedTeacherAssignmentId,
      accountTab: route.accountTab,
      selectedCampCourseId: route.selectedCampCourseId,
      selectedCampMyCourseId: route.selectedCampMyCourseId,
      accountReturnRoute,
      questions,
      writingFeedback,
      writingSessionKey: teacherWritingSessionKey,
    },
    actions: {
      handleQuestionsChange,
      handleWritingSaved,
      setWritingFeedback,
      resetWritingSession: resetTeacherWritingSession,
      setPage,
      setUser,
      openWriting: updateTeacherWritingContext,
      openTodoScene: openTeacherTodoScene,
      openAssignment: openTeacherAssignment,
      openClassContext: (payload) => {
        navigateToPage("classes", {
          user,
          routeOverrides: {
            selectedTeacherWritingContext: payload
              ? {
                  writingId: String(payload.writingId || ""),
                  classId: payload.classId || null,
                  tab: payload.tab || null,
                }
              : null,
          },
        });
      },
    },
  }), [
    handleQuestionsChange,
    handleWritingSaved,
    navigateToPage,
    openTeacherAssignment,
    openTeacherTodoScene,
    questions,
    resetTeacherWritingSession,
    route.selectedTeacherAssignmentId,
    route.accountTab,
    route.selectedCampCourseId,
    route.selectedCampMyCourseId,
    accountReturnRoute,
    route.selectedTeacherTodoScene,
    route.selectedTeacherWritingContext,
    setPage,
    setUser,
    setWritingFeedback,
    teacherWritingSessionKey,
    updateTeacherWritingContext,
    user,
    writingFeedback,
  ]);

  return renderAppContentShell({
    authChecked,
    authMode,
    guestAuthState,
    guestDraftFlags,
    guestWritingDraft,
    handleLogin,
    handleLogout,
    handleProfileComplete,
    handleProfileSkip,
    isMobile,
    isRegressionLab,
    logoutConfirmState,
    needProfile,
    normalizedPage,
    questions,
    respondLogoutConfirm,
    serviceError,
    setAuthMode,
    setGuestAuthState,
    setGuestWritingDraft,
    setPage,
    setShowAccountMenu,
    setSideHover,
    showAccountMenu,
    showNavBar,
    sideHover,
    studentPage,
    teacherPage,
    user,
  });
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
