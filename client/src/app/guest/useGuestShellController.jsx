import { useMemo, useEffect, useRef } from "react";

export function useGuestShellController({
  page,
  authMode,
  setAuthMode,
  setGuestWritingDraft,
  guestAuthState,
  setGuestAuthState,
  onNavigate,
  onLogin,
}) {
  const guestHome = page === "portal";
  const guestWriting = page === "writing" || page === "writing-manual" || page === "writing-bank";
  const guestSourceMode = page === "writing-bank" ? "bank" : "manual";

  const publicTargets = useMemo(
    () => new Set([
      "portal",
      "privacy",
      "agreement",
      "writing",
      "writing-manual",
      "writing-bank",
      "writing-refine-sentence",
      "writing-refine-structure",
      "grammar-analyzer",
      "grammar-courses",
      "grammar-practice",
      "grammar-progress",
      "grammar-quiz",
      "reading-analyzer",
      "reading-practice",
      "reading-paper",
      "reading-courses",
      "reading-progress",
      "phonetics-camp",
      "phonetics-overview",
      "phonetics-sound",
      "phonetics-syllable",
      "phonetics-sentence",
      "phonetics-discourse",
      "phonetics-progress",
      "speaking",
      "speaking-progress",
      "vocab-analyzer",
      "vocab-quiz",
      "vocab-courses",
      "vocab-resources",
      "listening-basics",
      "listening-advanced",
      "listening-practice",
      "listening-progress",
      "vocab-progress",
      "explore",
      "resume",
      "megan",
      "growth",
      "camp",
      "camp-course-detail",
    ]),
    []
  );

  const navigateGuestPage = (target) => {
    if (["writing", "writing-manual", "writing-bank"].includes(target)) {
      setGuestWritingDraft(null);
    }
    onNavigate(target);
  };

  // Track whether we've pushed a modal-specific history entry so we can
  // distinguish a programmatic close (X button) from a user-initiated back.
  const modalHistoryPushed = useRef(false);

  const _doCloseModal = () => {
    setGuestAuthState((current) => ({ ...current, open: false }));
    if (page === "auth") {
      onNavigate(guestAuthState?.returnPage || "portal", { replace: true });
    }
    modalHistoryPushed.current = false;
  };

  const startGuestAuth = (mode = "login", target = "writing") => {
    setAuthMode(mode);
    setGuestAuthState({
      open: true,
      mode,
      target,
      returnPage: page === "auth" ? "portal" : page,
    });
    // Push a dummy history entry so the browser's back button closes the modal
    // instead of navigating away from the SPA entirely.
    window.history.pushState({ nestAuthModal: true }, "");
    modalHistoryPushed.current = true;
  };

  // Listen for the back button while the modal is open.
  useEffect(() => {
    if (!guestAuthState?.open) return undefined;

    const handler = () => {
      // popstate fires both for user back-press and for our programmatic
      // history.back() call in closeGuestAuth; either way close the modal.
      modalHistoryPushed.current = false;
      setGuestAuthState((current) => ({ ...current, open: false }));
      if (page === "auth") {
        onNavigate(guestAuthState?.returnPage || "portal", { replace: true });
      }
    };

    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [guestAuthState?.open, guestAuthState?.returnPage, onNavigate, page, setGuestAuthState]);

  const handleHomeNavigate = (target) => {
    if (publicTargets.has(target)) {
      navigateGuestPage(target);
      return;
    }
    startGuestAuth("login", target);
  };

  const closeGuestAuth = () => {
    if (modalHistoryPushed.current) {
      // Pop the history entry we pushed; the popstate handler does the actual close.
      modalHistoryPushed.current = false;
      window.history.back();
    } else {
      _doCloseModal();
    }
  };

  // 这些是游客访问时"模块功能页"级别的目标；注册后应回到对应模块继续。
  // 首页/portal 等站点级页面不在此列——新注册学生应统一引导到首次写作练习。
  const STAY_TARGETS = new Set([
    "writing",
    "writing-manual",
    "writing-bank",
    "writing-refine-sentence",
    "writing-refine-structure",
    "grammar-analyzer",
    "grammar-courses",
    "grammar-practice",
    "grammar-progress",
    "grammar-quiz",
    "reading-analyzer",
    "reading-practice",
    "reading-paper",
    "reading-courses",
    "reading-progress",
    "phonetics-camp",
    "phonetics-overview",
    "phonetics-sound",
    "phonetics-syllable",
    "phonetics-sentence",
    "phonetics-discourse",
    "phonetics-progress",
    "vocab-analyzer",
    "vocab-quiz",
    "vocab-courses",
    "vocab-resources",
    "listening-basics",
    "listening-advanced",
    "listening-practice",
    "listening-progress",
    "vocab-progress",
    "speaking",
    "speaking-progress",
    "growth",
    "camp",
    "camp-course-detail",
  ]);

  const handleGuestLogin = async (userObj, needsProfile = false) => {
    const rawTarget = guestAuthState?.target;
    // 老用户（needsProfile=false）登录：保留任何公开页面目标，回到之前的位置。
    // 新注册学生（needsProfile=true）：只保留模块功能页目标；
    //   首页/portal 等站点级页面不传 nextPage，由 useAppSession 引导到首次写作练习。
    const target = needsProfile
      ? (STAY_TARGETS.has(rawTarget) ? rawTarget : null)
      : rawTarget;
    setGuestAuthState({ open: false, mode: authMode, target: "writing", returnPage: "portal" });
    await onLogin(userObj, needsProfile, target);
  };

  return {
    guestHome,
    guestWriting,
    guestSourceMode,
    navigateGuestPage,
    startGuestAuth,
    handleHomeNavigate,
    closeGuestAuth,
    handleGuestLogin,
  };
}
