import { Suspense, lazy } from "react";

import "../writing/writing.css";

const WritingPage = lazy(() => import("../writing/WritingPage.jsx"));
const AccountPage = lazy(() => import("../components/AccountPage.jsx"));
const MinePage = lazy(() => import("../components/MinePage.jsx"));
const PointsPage = lazy(() => import("../components/PointsPage.jsx"));
const QuotaPage = lazy(() => import("../components/QuotaPage.jsx"));
const UnifiedProgressPage = lazy(() => import("../components/UnifiedProgressPage.jsx"));
const StudentTasksPage = lazy(() => import("../components/StudentTasksPage.jsx"));
const WritingProgressPage = lazy(() => import("../writing/WritingProgressPage.jsx"));

export default function StudentPageContent({
  page,
  user,
  isMobile,
  sideHover,
  studentPage,
  setShowAccountMenu,
  handleLogout,
  hideTopBar = false,
  prepExam,
  prepExamId,
}) {
  // Keep the fallback visually neutral — startTransition suppresses it for
  // cached chunks, but a first-visit cold load may briefly show it.  Showing
  // "正在加载页面..." would flash visible text; an empty div is unobtrusive.
  const withSuspense = (node) => (
    <Suspense fallback={<div style={{ minHeight: "40vh" }} aria-hidden="true" />}>
      {node}
    </Suspense>
  );

  const {
    state: {
      questions,
      myWritings,
      preloadedQ,
      writingFeedback,
      currentTask,
      guestWritingDraft,
      selectedViewingWritingId,
      accountTab,
      accountReturnRoute,
      writingSessionKey,
    },
    actions: {
      handleQuestionsChange,
      handleWritingSaved,
      setPage,
      setUser,
      _setCurrentTask,
      setWritingFeedback,
      setGuestWritingDraft,
      resetWritingSession,
      openTask,
      openRecordById,
    },
  } = studentPage;

  const handleAccountBack = () => {
    if (accountReturnRoute?.page) {
      setPage(accountReturnRoute.page, { routeOverrides: accountReturnRoute });
      return;
    }
    setPage("mine");
  };

  if (page === "tasks") {
    return withSuspense(
      <StudentTasksPage
        user={user}
        isMobile={isMobile}
        onOpenTask={openTask}
        onViewFeedback={(task) => openRecordById(task?.writingId ? String(task.writingId) : "")}
        onNavigate={setPage}
        prepExam={prepExam}
        prepExamId={prepExamId}
      />
    );
  }

  if (page === "writing" || page === "writing-bank") {
    return withSuspense(
      <WritingPage
        key={writingSessionKey}
        sidebarWidth={isMobile ? 0 : (sideHover ? 188 : 58)}
        isMobile={isMobile}
        user={user}
        hideTopBar={hideTopBar}
        questions={questions}
        onQuestionsChange={handleQuestionsChange}
        onWritingSaved={(saved) => {
          handleWritingSaved(saved);
          resetWritingSession({ clearDraft: true });
          openRecordById(saved?.id ? String(saved.id) : "");
        }}
        taskContext={currentTask}
        preloadedQuestion={preloadedQ}
        savedFeedback={writingFeedback}
        onFeedbackChange={setWritingFeedback}
        initialDraft={guestWritingDraft}
        draftHydrationKey={writingSessionKey}
        onDraftChange={setGuestWritingDraft}
        onNavigate={setPage}
        activePage={page}
        writingSourceMode={page === "writing-bank" ? "bank" : "manual"}
        onAccountClick={() => setShowAccountMenu?.((open) => !open)}
        prepExam={prepExam}
        prepExamId={prepExamId}
      />
    );
  }

  if (page === "growth") {
    return withSuspense(
      <UnifiedProgressPage
        user={user}
        myWritings={myWritings}
        isMobile={isMobile}
        onNavigate={setPage}
        prepExam={prepExam}
        prepExamId={prepExamId}
      />
    );
  }

  if (page === "records") {
    return withSuspense(
      <WritingProgressPage
        user={user}
        myWritings={myWritings}
        isMobile={isMobile}
        initialViewingWritingId={selectedViewingWritingId}
        onViewedWritingChange={(writingId) => openRecordById(writingId)}
        onNavigate={(targetPage, options = {}) => {
          if (targetPage === "writing" && options.nextDraftFrom) {
            const { nextDraftFrom } = options;
            setGuestWritingDraft({
              text: nextDraftFrom.fullText || '',
              writingTitle: nextDraftFrom.writingTitle || '',
              promptText: nextDraftFrom.promptText || '',
              manualType: nextDraftFrom.selectedType || '',
              versionOfWritingId: nextDraftFrom.versionOfWritingId || null,
            });
          }
          setPage(targetPage, options);
        }}
        hideTopBar={hideTopBar}
        onAccountClick={() => setShowAccountMenu?.((open) => !open)}
        prepExam={prepExam}
        prepExamId={prepExamId}
      />
    );
  }

  if (page === "account") {
    return withSuspense(
      <AccountPage
        user={user}
        onUpdate={(nextUser) => setUser(nextUser)}
        onBack={handleAccountBack}
        initialTab={accountTab || "profile"}
        isMobile={isMobile}
        onNavigate={setPage}
      />
    );
  }

  if (page === "mine") {
    return withSuspense(
      <MinePage
        user={user}
        onUserUpdate={setUser}
        onNavigate={setPage}
        handleLogout={handleLogout}
      />
    );
  }

  if (page === "points") {
    return withSuspense(
      <PointsPage user={user} onNavigate={setPage} />
    );
  }

  if (page === "quota") {
    return withSuspense(
      <QuotaPage user={user} onNavigate={setPage} />
    );
  }

  return null;
}
