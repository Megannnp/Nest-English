import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { getDefaultPage, normalizePage } from "./navigation.js";
import { getPrepExamSystemId } from "./prepExamConfig.js";
import { PREP_EXAM_CHANGED_EVENT, readSelectedPrepExamId, syncSelectedPrepExamFromUser } from "./prepExamSelection.js";
import {
  clearProfileOnboarding,
  persistProfileOnboarding,
  readProfileOnboarding,
} from "./profileOnboarding.js";
import { authAPI, clearToken, hasSessionFlag, questionsAPI, setUnauthorizedHandler, writingsAPI } from "../api/index.js";
import { useConfirmDialog } from "../hooks/useConfirmDialog.js";

function requiresProfileOnboarding(user) {
  return !isAdminUser(user) && (user?.role === "student" || user?.role === "teacher");
}

function isAdminUser(user) {
  return user?.is_admin === 1;
}

function resolveRouteTarget(target, userOrRole) {
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole?.role;
  const options = typeof userOrRole === "object" && userOrRole !== null ? { isAdmin: isAdminUser(userOrRole) } : {};
  if (typeof target === "object" && target !== null) {
    return {
      page: normalizePage(target.page || getDefaultPage(options.isAdmin ? "admin" : role), role, options),
      routeOverrides: target.routeOverrides || {},
    };
  }
  return {
    page: normalizePage(target || getDefaultPage(options.isAdmin ? "admin" : role), role, options),
    routeOverrides: {},
  };
}

function applyPendingOnboarding(user, setNeedProfile, setProfileReturnPage) {
  const pendingOnboarding = readProfileOnboarding();
  if (!pendingOnboarding || !requiresProfileOnboarding(user)) return;

  setNeedProfile(true);
  setProfileReturnPage(pendingOnboarding.returnRoute || pendingOnboarding.returnPage || getDefaultPage(isAdminUser(user) ? "admin" : user.role));
}

function navigateRestoredUser(user, initialPageRef, onNavigateRef) {
  const currentPage = initialPageRef.current;
  const normalizedPage = normalizePage(
    currentPage || getDefaultPage(isAdminUser(user) ? "admin" : user.role),
    user.role,
    { isAdmin: isAdminUser(user) },
  );
  // Skip the redundant replace-navigation when the URL is already correct —
  // navigating (even to the same page) rebuilds the URL from scratch and
  // drops any hash fragment (e.g. the admin panel's #tab=... tab state).
  if (normalizedPage === currentPage) return;
  onNavigateRef.current(normalizedPage, { replace: true, user });
}

function handleSessionRestoreError(error, {
  clearAuthenticatedSessionRef,
  onNavigateRef,
  setAuthMode,
  setServiceError,
}) {
  if (error?.serviceUnavailable) {
    setServiceError(error.message || "服务暂时不可用，请稍后重试。");
    return;
  }

  clearAuthenticatedSessionRef.current("登录状态已失效，请重新登录。");
  setAuthMode("login");
  onNavigateRef.current("auth", { replace: true });
}

export default function useAppSession({ initialPage, onNavigate, getCurrentPage }) {
  const { confirmState: logoutConfirmState, requestConfirm: requestLogoutConfirm, respondConfirm: respondLogoutConfirm } = useConfirmDialog();
  const [writingFeedback, setWritingFeedback] = useState(null);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [needProfile, setNeedProfile] = useState(false);
  const [profileReturnPage, setProfileReturnPage] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [serviceError, setServiceError] = useState("");
  const [preloadedQ, setPreloadedQ] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [myWritings, setMyWritings] = useState([]);
  const [studentWritingSessionKey, setStudentWritingSessionKey] = useState(0);
  const [teacherWritingSessionKey, setTeacherWritingSessionKey] = useState(0);
  const [sideHover, setSideHover] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [guestWritingDraft, setGuestWritingDraft] = useState(null);
  const [guestAuthState, setGuestAuthState] = useState({
    open: false,
    mode: "login",
    target: "writing",
  });
  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);

  const resetStudentWritingSession = useCallback((options = {}) => {
    const { clearDraft = false } = options;
    setWritingFeedback(null);
    setCurrentTask(null);
    setStudentWritingSessionKey((value) => value + 1);
    if (clearDraft) {
      setGuestWritingDraft(null);
    }
  }, []);

  const resetTeacherWritingSession = useCallback(() => {
    setWritingFeedback(null);
    setTeacherWritingSessionKey((value) => value + 1);
  }, []);

  const clearAuthenticatedSession = useCallback((message = "") => {
    clearToken();
    clearProfileOnboarding();
    setUser(null);
    setQuestions([]);
    setMyWritings([]);
    setNeedProfile(false);
    setProfileReturnPage(null);
    setShowAccountMenu(false);
    if (message) {
      setServiceError(message);
    }
  }, []);

  const loadQuestionBank = useCallback(async (examIdOverride = "") => {
    const systemId = getPrepExamSystemId(examIdOverride || readSelectedPrepExamId(userRef.current));
    const items = await questionsAPI.list({ systemId });
    setQuestions(items);
    return items;
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const [qsResult, wsResult] = await Promise.allSettled([loadQuestionBank(), writingsAPI.list()]);

      if (qsResult.status === "fulfilled") {
        setQuestions(qsResult.value);
      }

      if (wsResult.status === "fulfilled") {
        setMyWritings(wsResult.value);
      }

      const firstError = [qsResult, wsResult].find((item) => item.status === "rejected");
      if (firstError?.reason?.serviceUnavailable) {
        setServiceError(firstError.reason.message || "服务暂时不可用，请稍后重试。");
      } else {
        setServiceError("");
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  }, [loadQuestionBank]);

  // Keep mutable refs so the one-time mount effect always calls the latest callbacks without
  // re-running every time onNavigate / loadUserData / initialPage change.  Those props change on
  // every render (onNavigate captures `user` and is not memoised in App.jsx), and putting them in
  // the dependency array would cause the auth-check to loop: setUser → re-render → new onNavigate
  // → effect re-runs → authAPI.me() → setUser → … → /auth/me rate-limit (429) → clearToken →
  // redirect to login = 闪退.
  const onNavigateRef = useRef(onNavigate);
  const loadUserDataRef = useRef(loadUserData);
  const clearAuthenticatedSessionRef = useRef(clearAuthenticatedSession);
  const initialPageRef = useRef(initialPage);
  useEffect(() => { onNavigateRef.current = onNavigate; });
  useEffect(() => { loadUserDataRef.current = loadUserData; });
  useEffect(() => { clearAuthenticatedSessionRef.current = clearAuthenticatedSession; });

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAuthenticatedSession("登录状态已失效，请重新登录。");
      setAuthMode("login");
      resetStudentWritingSession({ clearDraft: true });
      setWritingFeedback(null);
      onNavigateRef.current("auth", { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [clearAuthenticatedSession, resetStudentWritingSession]);

  // One-time session restore — runs only on mount.
  useEffect(() => {
    let active = true;

    (async () => {
      if (hasSessionFlag()) {
        try {
          const currentUser = await authAPI.me();
          if (!active) return;
          setServiceError("");
          syncSelectedPrepExamFromUser(currentUser);
          setUser(currentUser);
          userRef.current = currentUser;
          applyPendingOnboarding(currentUser, setNeedProfile, setProfileReturnPage);
          await loadUserDataRef.current();
          if (!active) return;
          navigateRestoredUser(currentUser, initialPageRef, onNavigateRef);
        } catch (error) {
          if (!active) return;
          handleSessionRestoreError(error, {
            clearAuthenticatedSessionRef,
            onNavigateRef,
            setAuthMode,
            setServiceError,
          });
        }
      }
      if (active) {
        setAuthChecked(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);  

  useEffect(() => {
    const guestNeedsQuestions = !user && ["writing", "writing-manual", "writing-bank"].includes(initialPage);
    if (!guestNeedsQuestions) return;

    loadQuestionBank()
      .then((items) => {
        setQuestions(items);
        setServiceError("");
      })
      .catch((error) => {
        console.warn("Guest question bank unavailable:", error);
        setQuestions([]);
        setServiceError(error?.message || "题库加载失败，请确认后端服务已经启动。");
      });
  }, [initialPage, loadQuestionBank, user]);

  useEffect(() => {
    const handlePrepExamChange = (event) => {
      loadQuestionBank(event?.detail?.examId || "").catch((error) => {
        console.warn("Question bank refresh after prep exam change failed:", error);
      });
    };
    window.addEventListener(PREP_EXAM_CHANGED_EVENT, handlePrepExamChange);
    return () => window.removeEventListener(PREP_EXAM_CHANGED_EVENT, handlePrepExamChange);
  }, [loadQuestionBank]);

  const handleLogin = useCallback(async (userObj, needsProfile = false, nextPage = null) => {
    setServiceError("");
    resetStudentWritingSession({ clearDraft: true });
    syncSelectedPrepExamFromUser(userObj);
    setUser(userObj);
    userRef.current = userObj;
    await loadUserData();
    const shouldCompleteProfile = Boolean(needsProfile && requiresProfileOnboarding(userObj));
    // 新注册学生默认引导到首次写作练习，而不是通用的备考台/dashboard。
    // 仅当没有显式传入 nextPage 且是新注册（needsProfile=true）的学生时生效；
    // 老师保持默认 workbench，老用户保持默认目标不被改变。
    const isNewStudentWithoutTarget = Boolean(needsProfile && userObj?.role === "student" && !nextPage);
    const effectiveNextPage = isNewStudentWithoutTarget ? "writing" : nextPage;
    const nextRoute = resolveRouteTarget(effectiveNextPage, userObj);
    setNeedProfile(shouldCompleteProfile);
    setProfileReturnPage(shouldCompleteProfile ? nextRoute : null);
    if (shouldCompleteProfile) {
      persistProfileOnboarding(nextRoute);
    } else {
      clearProfileOnboarding();
    }
    onNavigate(shouldCompleteProfile ? "account" : nextRoute.page, {
      replace: true,
      user: userObj,
      routeOverrides: shouldCompleteProfile ? {} : nextRoute.routeOverrides,
    });
  }, [loadUserData, onNavigate, resetStudentWritingSession]);

  const handleProfileComplete = useCallback((updatedUser) => {
    const nextUser = updatedUser || user;
    syncSelectedPrepExamFromUser(nextUser);
    setUser(nextUser);
    userRef.current = nextUser;
    setNeedProfile(false);
    clearProfileOnboarding();
    const nextRoute = resolveRouteTarget(profileReturnPage, nextUser);
    setProfileReturnPage(null);
    onNavigate(nextRoute.page, { replace: true, user: nextUser, routeOverrides: nextRoute.routeOverrides });
  }, [onNavigate, profileReturnPage, user]);

  const handleProfileSkip = useCallback(() => {
    setNeedProfile(false);
    clearProfileOnboarding();
    const nextRoute = resolveRouteTarget(profileReturnPage, user);
    setProfileReturnPage(null);
    onNavigate(nextRoute.page, { replace: true, user, routeOverrides: nextRoute.routeOverrides });
  }, [onNavigate, profileReturnPage, user]);

  const handleLogout = useCallback(async () => {
    const ok = await requestLogoutConfirm("确认退出登录？");
    if (!ok) return;
    try {
      await authAPI.logout();
    } catch {
      // ignore logout request failures and clear local session anyway
    }
    clearToken();
    setUser(null);
    setQuestions([]);
    setMyWritings([]);
    setNeedProfile(false);
    clearProfileOnboarding();
    setShowAccountMenu(false);
    resetStudentWritingSession({ clearDraft: true });
    setWritingFeedback(null);
    // Navigate back to whichever module the user was in, not the combined portal
    const curPage = getCurrentPage?.() ?? "";
    const postLogoutPage = curPage.startsWith("grammar") ? "grammar-analyzer"
      : curPage.startsWith("reading") ? "reading-analyzer"
      : curPage.startsWith("vocab") ? "vocab-analyzer"
      : curPage.startsWith("phonetics") ? "phonetics-overview"
      : curPage.startsWith("listening") ? "listening-basics"
      : curPage === "portal" || curPage === "skill-training" || curPage === "language-foundation" ? "portal"
      : "portal";
    onNavigate(postLogoutPage, { replace: true });
  }, [onNavigate, getCurrentPage, requestLogoutConfirm, resetStudentWritingSession]);

  const guestDraftFlags = useMemo(() => (
    guestWritingDraft
      ? [
          guestWritingDraft.promptText?.trim() ? "题目已保留" : null,
          guestWritingDraft.text?.trim() ? "作文已保留" : null,
          guestWritingDraft.selectedQId ? "已关联题目" : null,
          guestWritingDraft.maxOpt || guestWritingDraft.customMax ? "分值设置已保留" : null,
        ].filter(Boolean)
      : []
  ), [guestWritingDraft]);

  return {
    state: {
      logoutConfirmState,
      respondLogoutConfirm,
      writingFeedback,
      user,
      authChecked,
      needProfile,
      profileReturnPage,
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
      setServiceError,
      setPreloadedQ,
      setCurrentTask,
      setQuestions,
      setMyWritings,
      setSideHover,
      setShowAccountMenu,
      setGuestWritingDraft,
      setGuestAuthState,
      setNeedProfile,
      resetStudentWritingSession,
      resetTeacherWritingSession,
      handleLogin,
      handleProfileComplete,
      handleProfileSkip,
      handleLogout,
      handleQuestionsChange: setQuestions,
      handleWritingSaved: (writing) => setMyWritings((prev) => [writing, ...prev].slice(0, 100)),
    },
  };
}
