import { Suspense, lazy } from "react";

import { getDefaultPage } from "./navigation.js";

const ClassManagementPage = lazy(() => import("../teacher/ClassManagementPage.jsx"));
const GrammarWorkbenchPage = lazy(() => import("../teacher/GrammarWorkbenchPage.jsx"));
const ReadingWorkbenchPage = lazy(() => import("../reading/ReadingWorkbenchPage.jsx"));
const ListeningWorkbenchPage = lazy(() => import("../listening/ListeningWorkbenchPage.jsx"));
const VocabWorkbenchPage = lazy(() => import("../vocab/VocabWorkbenchPage.jsx"));
const PhoneticWorkbenchPage = lazy(() => import("../phonetics/PhoneticWorkbenchPage.jsx"));
const SpeakingWorkbenchPage = lazy(() => import("../speaking/SpeakingWorkbenchPage.jsx"));
const AccountPage = lazy(() => import("../components/AccountPage.jsx"));
const MinePage = lazy(() => import("../components/MinePage.jsx"));
const PointsPage = lazy(() => import("../components/PointsPage.jsx"));
const TeacherWorkbenchPage = lazy(() => import("../teacher/TeacherWorkbenchPage.jsx"));
const TeacherPrepPage = lazy(() => import("../teacher/TeacherPrepPage.jsx"));
const TeacherDataPage = lazy(() => import("../teacher/TeacherDataPage.jsx"));
const TeacherAssignmentCreatePage = lazy(() => import("../teacher/TeacherAssignmentCreatePage.jsx"));
const TeacherWritingDetailPage = lazy(() => import("../teacher/TeacherWritingDetailPage.jsx"));
const WritingPage = lazy(() => import("../writing/WritingPage.jsx"));
const BatchGradingPage = lazy(() => import("../teacher/BatchGradingPage.jsx"));
const TeacherTodoScenePage = lazy(() => import("../teacher/workbench/TeacherTodoScenePage.jsx"));

export default function TeacherPageContent({
  page,
  user,
  isMobile,
  teacherPage,
  handleLogout,
  hideTopBar = false,
  prepExam,
  prepExamId,
}) {
  const {
    state: {
      selectedWritingContext,
      selectedTodoScene,
      selectedAssignmentId,
      accountTab,
      accountReturnRoute,
      questions,
      writingFeedback,
      writingSessionKey,
    },
    actions: {
      handleQuestionsChange,
      handleWritingSaved,
      setWritingFeedback,
      setPage,
      setUser,
      openWriting,
      openTodoScene,
      openAssignment,
      openClassContext,
    },
  } = teacherPage;

  const handleAccountBack = () => {
    if (accountReturnRoute?.page) {
      setPage(accountReturnRoute.page, { routeOverrides: accountReturnRoute });
      return;
    }
    setPage(getDefaultPage(user.role));
  };

  // Keep the fallback visually neutral — startTransition suppresses it for
  // cached chunks, but a first-visit cold load may briefly show it.  Showing
  // "正在加载页面..." would flash visible text; an empty div is unobtrusive.
  const withSuspense = (node) => (
    <Suspense fallback={<div style={{ minHeight: "40vh" }} aria-hidden="true" />}>
      {node}
    </Suspense>
  );

  const renderers = {
    "grammar-workbench": () => (
      <GrammarWorkbenchPage
        user={user}
        isMobile={isMobile}
        hideTopBar={hideTopBar}
        onNavigate={setPage}
        activePage="grammar-workbench"
        onAccountClick={() => setPage("account")}
        onLogin={() => setPage("auth")}
        onRegister={() => setPage("auth")}
      />
    ),
    "reading-workbench": () => (
      <ReadingWorkbenchPage
        user={user}
        isMobile={isMobile}
        hideTopBar={hideTopBar}
        onNavigate={setPage}
        activePage="reading-workbench"
        onAccountClick={() => setPage("account")}
        onLogin={() => setPage("auth")}
        onRegister={() => setPage("auth")}
      />
    ),
    "listening-workbench": () => (
      <ListeningWorkbenchPage
        user={user}
        isMobile={isMobile}
        hideTopBar={hideTopBar}
        onNavigate={setPage}
        activePage="listening-workbench"
        onAccountClick={() => setPage("account")}
        onLogin={() => setPage("auth")}
        onRegister={() => setPage("auth")}
      />
    ),
    "vocab-workbench": () => (
      <VocabWorkbenchPage
        user={user}
        isMobile={isMobile}
        hideTopBar={hideTopBar}
        onNavigate={setPage}
        activePage="vocab-workbench"
        onAccountClick={() => setPage("account")}
        onLogin={() => setPage("auth")}
        onRegister={() => setPage("auth")}
      />
    ),
    "phonetics-workbench": () => (
      <PhoneticWorkbenchPage
        user={user}
        isMobile={isMobile}
        hideTopBar={hideTopBar}
        onNavigate={setPage}
        activePage="phonetics-workbench"
        onAccountClick={() => setPage("account")}
        onLogin={() => setPage("auth")}
        onRegister={() => setPage("auth")}
      />
    ),
    "speaking-workbench": () => (
      <SpeakingWorkbenchPage
        user={user}
        isMobile={isMobile}
        hideTopBar={hideTopBar}
        onNavigate={setPage}
        activePage="speaking-workbench"
        onAccountClick={() => setPage("account")}
        onLogin={() => setPage("auth")}
        onRegister={() => setPage("auth")}
      />
    ),
    workbench: () => (
      <TeacherWorkbenchPage
        user={user}
        isMobile={isMobile}
        hideTopBar={hideTopBar}
        onNavigate={setPage}
        onCreateTask={() => {
          openAssignment("");
        }}
        onOpenTodoScene={(scene) => {
          openTodoScene(scene);
        }}
        onOpenAssignment={(assignmentId) => {
          openAssignment(assignmentId);
        }}
        onOpenWriting={(payload) => {
          openWriting(payload);
        }}
      />
    ),
    "teacher-prep": () => (
      <TeacherPrepPage
        user={user}
        isMobile={isMobile}
        onNavigate={setPage}
      />
    ),
    "teacher-data": () => (
      <TeacherDataPage
        user={user}
        isMobile={isMobile}
        onNavigate={setPage}
      />
    ),
    "assignment-create": () => (
      <TeacherAssignmentCreatePage
        user={user}
        isMobile={isMobile}
        initialSelectedAssignmentId={selectedAssignmentId}
        onBackToWorkbench={() => setPage("workbench")}
        onOpenWriting={(payload) => {
          openWriting(payload);
        }}
      />
    ),
    "teacher-writing-detail": () => (
      <TeacherWritingDetailPage
        user={user}
        isMobile={isMobile}
        writingContext={selectedWritingContext}
        onBackToWorkbench={() => setPage("workbench")}
        onOpenWriting={(payload) => {
          openWriting(payload);
        }}
        onOpenClassContext={(payload) => {
          openClassContext(payload);
        }}
      />
    ),
    "teacher-todo": () => (
      <TeacherTodoScenePage
        user={user}
        isMobile={isMobile}
        scene={selectedTodoScene}
        onBackToWorkbench={() => setPage("workbench")}
        onNavigate={setPage}
        onOpenWriting={(payload) => {
          openWriting(payload);
        }}
      />
    ),
    writing: () => (
      <WritingPage
        key={`teacher-writing-${writingSessionKey}`}
        sidebarWidth={0}
        isMobile={isMobile}
        user={user}
        hideTopBar={hideTopBar}
        questions={questions}
        onQuestionsChange={handleQuestionsChange}
        onWritingSaved={handleWritingSaved}
        savedFeedback={writingFeedback}
        onFeedbackChange={setWritingFeedback}
        onBackHome={() => setPage("workbench")}
        onNavigate={setPage}
        activePage="writing"
        writingSourceMode="manual"
        onAccountClick={() => setPage("account")}
        prepExam={prepExam}
        prepExamId={prepExamId}
      />
    ),
    "writing-bank": () => (
      <WritingPage
        key={`teacher-writing-bank-${writingSessionKey}`}
        sidebarWidth={0}
        isMobile={isMobile}
        user={user}
        hideTopBar={hideTopBar}
        questions={questions}
        onQuestionsChange={handleQuestionsChange}
        onWritingSaved={handleWritingSaved}
        savedFeedback={writingFeedback}
        onFeedbackChange={setWritingFeedback}
        onBackHome={() => setPage("workbench")}
        onNavigate={setPage}
        writingSourceMode="bank"
        activePage="writing-bank"
        onAccountClick={() => setPage("account")}
        prepExam={prepExam}
        prepExamId={prepExamId}
      />
    ),
    "substitute-upload": () => (
      <WritingPage
        key={`teacher-substitute-${writingSessionKey}`}
        sidebarWidth={0}
        isMobile={isMobile}
        user={user}
        hideTopBar={hideTopBar}
        questions={questions}
        onQuestionsChange={handleQuestionsChange}
        onWritingSaved={handleWritingSaved}
        savedFeedback={writingFeedback}
        onFeedbackChange={setWritingFeedback}
        onBackHome={() => setPage("workbench")}
        onNavigate={setPage}
        activePage="substitute-upload"
        enableSubstituteUpload
        onAccountClick={() => setPage("account")}
        prepExam={prepExam}
        prepExamId={prepExamId}
      />
    ),
    "batch-grading": () => (
      <BatchGradingPage
        user={user}
        questions={questions}
        isMobile={isMobile}
        onBack={() => setPage("workbench")}
      />
    ),
    classes: () => (
      <ClassManagementPage
        user={user}
        isMobile={isMobile}
        initialSelectedClassId={selectedWritingContext?.classId || null}
        initialWritingId={selectedWritingContext?.writingId || null}
        initialTab={selectedWritingContext?.tab || null}
        onBackToWorkbench={() => setPage("workbench")}
        onOpenWriting={(payload) => {
          openWriting(payload);
        }}
      />
    ),
    account: () => (
      <AccountPage
        user={user}
        onUpdate={(nextUser) => setUser(nextUser)}
        onBack={handleAccountBack}
        initialTab={accountTab || "profile"}
        isMobile={isMobile}
        onNavigate={setPage}
      />
    ),
    mine: () => (
      <MinePage
        user={user}
        onNavigate={setPage}
        handleLogout={handleLogout}
      />
    ),
    points: () => (
      <PointsPage user={user} onNavigate={setPage} />
    ),
  };

  return renderers[page] ? withSuspense(renderers[page]()) : null;
}
