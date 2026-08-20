import { Suspense, lazy, useEffect } from "react";

import { useGuestShellController } from "./guest/useGuestShellController.jsx";
import { isLoginRequiredPage } from "./navigation.js";
import { buildPrepExamProps } from "./prepExamSelection.js";
import NotificationTicker from "../components/NotificationTicker/NotificationTicker.jsx";
import AppLoadingShell from "../components/shared/AppLoadingShell.jsx";
import GuestNavBar from "../portal/GuestNavBar.jsx";

const GrammarQuizPage = lazy(() => import("../grammar/GrammarQuizPage.jsx"));
const ReadingAnalyzerPage = lazy(() => import("../reading/ReadingAnalyzerPage.jsx"));
const ReadingPracticePage = lazy(() => import("../reading/ReadingPracticePage.jsx"));
const ReadingPaperPage = lazy(() => import("../reading/ReadingPaperPage.jsx"));
const ReadingCoursesPage = lazy(() => import("../reading/ReadingCoursesPage.jsx"));
const ReadingProgressPage = lazy(() => import("../reading/ReadingProgressPage.jsx"));
const GrammarAnalyzerPage = lazy(() => import("../grammar/GrammarAnalyzerPage.jsx"));
const GrammarCoursesPage = lazy(() => import("../grammar/GrammarCoursesPage.jsx"));
const GrammarPracticePage = lazy(() => import("../grammar/GrammarPracticePage.jsx"));
const GrammarProgressPage = lazy(() => import("../grammar/GrammarProgressPage.jsx"));
const PortalPage = lazy(() => import("../portal/PortalPage.jsx"));
const ProductCategoryPage = lazy(() => import("../portal/ProductCategoryPage.jsx"));
const ExplorePage = lazy(() => import("../components/ExplorePage.jsx"));
const FoundationShowcasePage = lazy(() => import("../components/foundation/FoundationShowcasePage.jsx"));
const MeganPage = lazy(() => import("../components/MeganPage.jsx"));
const GuestAuthModal = lazy(() => import("./guest/GuestAuthModal.jsx"));
const GuestHomePage = lazy(() => import("./guest/GuestHomePage.jsx"));
const GuestSpecialScene = lazy(() => import("./guest/GuestSpecialScene.jsx"));
const UnifiedProgressPage = lazy(() => import("../components/UnifiedProgressPage.jsx"));
const WritingPage = lazy(() => import("../writing/WritingPage.jsx"));
const WritingRefineSentencePage = lazy(() => import("../writing/WritingRefineSentencePage.jsx"));
const WritingRefineStructurePage = lazy(() => import("../writing/WritingRefineStructurePage.jsx"));
const WritingProgressPage = lazy(() => import("../writing/WritingProgressPage.jsx"));
const PhoneticCampPage = lazy(() => import("../phonetics/PhoneticCampPage.jsx"));
const PhoneticOverviewPage = lazy(() => import("../phonetics/PhoneticOverviewPage.jsx"));
const PhoneticSoundPage = lazy(() => import("../phonetics/PhoneticSoundPage.jsx"));
const PhoneticSyllablePage = lazy(() => import("../phonetics/PhoneticSyllablePage.jsx"));
const PhoneticSentencePage = lazy(() => import("../phonetics/PhoneticSentencePage.jsx"));
const PhoneticDiscoursePage = lazy(() => import("../phonetics/PhoneticDiscoursePage.jsx"));
const PhoneticProgressPage = lazy(() => import("../phonetics/PhoneticProgressPage.jsx"));
const VocabAnalyzerPage = lazy(() => import("../vocab/VocabAnalyzerPage.jsx"));
const VocabCoursesPage = lazy(() => import("../vocab/VocabCoursesPage.jsx"));
const VocabProgressPage = lazy(() => import("../vocab/VocabProgressPage.jsx"));
const VocabQuizPage = lazy(() => import("../vocab/VocabQuizPage.jsx"));
const VocabResourcesPage = lazy(() => import("../vocab/VocabResourcesPage.jsx"));
const ListeningBasicsPage = lazy(() => import("../listening/ListeningBasicsPage.jsx"));
const ListeningAdvancedPage = lazy(() => import("../listening/ListeningAdvancedPage.jsx"));
const ListeningPracticePage = lazy(() => import("../listening/ListeningPracticePage.jsx"));
const ListeningProgressPage = lazy(() => import("../listening/ListeningProgressPage.jsx"));
const CampHomePage = lazy(() => import("../camp/CampHomePage.jsx"));
const CampCourseDetailPage = lazy(() => import("../camp/CampCourseDetailPage.jsx"));
const SpeakingPage = lazy(() => import("../speaking/SpeakingPage.jsx"));
const SpeakingProgressPage = lazy(() => import("../speaking/SpeakingProgressPage.jsx"));
const PlanDiagnosisPage = lazy(() => import("../plan/PlanDiagnosisPage.jsx"));
// Invisible placeholder that matches the page background — no "Loading…" text
// so lazy-loaded chunks never flash visible copy while the JS chunk is fetching.
function ShellFallback() {
  return <AppLoadingShell />;
}

function PageSuspense({ children }) {
  return <Suspense fallback={<ShellFallback />}>{children}</Suspense>;
}

function renderGuestPublicPage(page, context) {
  const {
    isMobile,
    onLogin,
    onNavigate,
    navigateGuestPage,
    startGuestAuth,
  } = context;
  const authClickProps = {
    onLoginClick: () => startGuestAuth("login", page),
    onRegisterClick: () => startGuestAuth("register", page),
  };
  const commonPageProps = {
    activePage: page,
    isMobile,
    onNavigate,
    hideTopBar: true,
    ...buildPrepExamProps(),
    ...authClickProps,
  };
  const prepExamProps = buildPrepExamProps();
  const pages = {
    portal: (
      <PortalPage
        onNavigate={onNavigate}
        onLogin={() => startGuestAuth("login", "portal")}
        onRegister={() => startGuestAuth("register", "portal")}
      />
    ),
    explore: <ExplorePage {...commonPageProps} _onNavigate={onNavigate} isMobile={isMobile} />,
    resume: <ExplorePage {...commonPageProps} _onNavigate={onNavigate} isMobile={isMobile} resumeMode />,
    megan: <MeganPage {...commonPageProps} />,
    "skill-training": <ProductCategoryPage {...commonPageProps} />,
    "language-foundation": <FoundationShowcasePage {...commonPageProps} />,
    "grammar-analyzer": <GrammarAnalyzerPage {...commonPageProps} />,
    "grammar-courses": <GrammarCoursesPage {...commonPageProps} />,
    "grammar-practice": <GrammarPracticePage {...commonPageProps} />,
    "grammar-progress": <GrammarProgressPage {...commonPageProps} />,
    "grammar-quiz": <GrammarQuizPage {...commonPageProps} />,
    "reading-analyzer": <ReadingAnalyzerPage {...commonPageProps} isMobile={isMobile} onLogin={onLogin} onRegister={() => startGuestAuth("register", page)} />,
    "reading-practice": <ReadingPracticePage {...commonPageProps} onLogin={onLogin} onRegister={() => startGuestAuth("register", page)} />,
    "reading-paper": <ReadingPaperPage {...commonPageProps} onLogin={onLogin} onRegister={() => startGuestAuth("register", page)} />,
    "reading-courses": <ReadingCoursesPage {...commonPageProps} />,
    "reading-progress": <ReadingProgressPage {...commonPageProps} />,
    writing: (
      <WritingPage
        isMobile={isMobile}
        hideTopBar
        user={null}
        serviceError={context.serviceError}
        questions={context.questions}
        onQuestionsChange={() => {}}
        onWritingSaved={() => {}}
        initialDraft={context.guestWritingDraft}
        onDraftChange={context.setGuestWritingDraft}
        guestMode
        guestSourceMode="manual"
        activePage="writing"
        onBackHome={() => navigateGuestPage("portal")}
        onNavigate={navigateGuestPage}
        onRequireAuth={({ mode = "login" } = {}) => { startGuestAuth(mode, "writing"); }}
        {...prepExamProps}
      />
    ),
    "writing-manual": (
      <WritingPage
        isMobile={isMobile}
        hideTopBar
        user={null}
        serviceError={context.serviceError}
        questions={context.questions}
        onQuestionsChange={() => {}}
        onWritingSaved={() => {}}
        initialDraft={context.guestWritingDraft}
        onDraftChange={context.setGuestWritingDraft}
        guestMode
        guestSourceMode="manual"
        activePage="writing"
        onBackHome={() => navigateGuestPage("portal")}
        onNavigate={navigateGuestPage}
        onRequireAuth={({ mode = "login" } = {}) => { startGuestAuth(mode, "writing"); }}
        {...prepExamProps}
      />
    ),
    "writing-bank": (
      <WritingPage
        isMobile={isMobile}
        hideTopBar
        user={null}
        serviceError={context.serviceError}
        questions={context.questions}
        onQuestionsChange={() => {}}
        onWritingSaved={() => {}}
        initialDraft={context.guestWritingDraft}
        onDraftChange={context.setGuestWritingDraft}
        guestMode
        guestSourceMode="bank"
        activePage="writing-bank"
        onBackHome={() => navigateGuestPage("portal")}
        onNavigate={navigateGuestPage}
        onRequireAuth={({ mode = "login" } = {}) => { startGuestAuth(mode, "writing-bank"); }}
        {...prepExamProps}
      />
    ),
    growth: (
      <UnifiedProgressPage
        user={null}
        myWritings={[]}
        isMobile={isMobile}
        onNavigate={onNavigate}
      />
    ),
    records: (
      <WritingProgressPage
        user={null}
        myWritings={[]}
        isMobile={isMobile}
        onNavigate={onNavigate}
        {...authClickProps}
      />
    ),
    "writing-refine": <WritingRefineSentencePage {...commonPageProps} navigateGuestPage={navigateGuestPage} />,
    "writing-refine-sentence": <WritingRefineSentencePage {...commonPageProps} navigateGuestPage={navigateGuestPage} />,
    "writing-refine-structure": <WritingRefineStructurePage {...commonPageProps} navigateGuestPage={navigateGuestPage} />,
    "phonetics-camp": <PhoneticCampPage {...commonPageProps} activePage="phonetics-camp" />,
    "phonetics-overview": <PhoneticOverviewPage {...commonPageProps} activePage="phonetics-overview" />,
    "phonetics-sound": <PhoneticSoundPage {...commonPageProps} activePage="phonetics-sound" />,
    "phonetics-syllable": <PhoneticSyllablePage {...commonPageProps} activePage="phonetics-syllable" />,
    "phonetics-sentence": <PhoneticSentencePage {...commonPageProps} activePage="phonetics-sentence" />,
    "phonetics-discourse": <PhoneticDiscoursePage {...commonPageProps} activePage="phonetics-discourse" />,
    "phonetics-progress": <PhoneticProgressPage {...commonPageProps} />,
    "vocab-analyzer": <VocabAnalyzerPage {...commonPageProps} />,
    "vocab-courses": <VocabCoursesPage {...commonPageProps} />,
    "vocab-progress": <VocabProgressPage {...commonPageProps} />,
    "vocab-quiz": <VocabQuizPage {...commonPageProps} />,
    "vocab-resources": <VocabResourcesPage {...commonPageProps} />,
    "listening-basics": <ListeningBasicsPage {...commonPageProps} />,
    "listening-advanced": <ListeningAdvancedPage {...commonPageProps} />,
    "listening-practice": <ListeningPracticePage {...commonPageProps} />,
    "listening-progress": <ListeningProgressPage {...commonPageProps} />,
    camp: <CampHomePage {...commonPageProps} user={null} />,
    "camp-course-detail": <CampCourseDetailPage {...commonPageProps} user={null} />,
    speaking: <SpeakingPage {...commonPageProps} activePage="speaking" />,
    "speaking-progress": <SpeakingProgressPage {...commonPageProps} />,
    plan: <PlanDiagnosisPage {...commonPageProps} />,
  };
  const pageElement = pages[page];

  return pageElement ? <PageSuspense>{pageElement}</PageSuspense> : null;
}

function renderGuestSpecialPage(page, context) {
  if (!(page === "auth" || page === "privacy" || page === "agreement" || page === "refund")) {
    return null;
  }

  return (
    <PageSuspense>
      <GuestSpecialScene
        page={page}
        isMobile={context.isMobile}
        serviceError={context.serviceError}
        authMode={context.authMode}
        guestAuthState={context.guestAuthState}
        onNavigate={context.onNavigate}
        onLogin={context.handleGuestLogin}
        onCloseAuth={context.closeGuestAuth}
      />
    </PageSuspense>
  );
}

function renderGuestHome(context) {
  return (
    <PageSuspense>
      <GuestHomePage
        isMobile={context.isMobile}
        serviceError={context.serviceError}
        guestWriting={context.guestWriting}
        guestSourceMode={context.guestSourceMode}
        questions={context.questions}
        guestWritingDraft={context.guestWritingDraft}
        setGuestWritingDraft={context.setGuestWritingDraft}
        setAuthMode={context.setAuthMode}
        startGuestAuth={context.startGuestAuth}
        navigateGuestPage={context.navigateGuestPage}
        onLogin={context.onLogin}
        page={context.page}
      />
    </PageSuspense>
  );
}

function renderGuestAuthOverlay(context) {
  if (context.page === "auth" || !context.guestAuthState?.open) return null;

  return (
    <Suspense fallback={null}>
      <GuestAuthModal
        open
        isMobile={context.isMobile}
        authMode={context.authMode}
        guestAuthState={context.guestAuthState}
        serviceError={context.serviceError}
        onClose={context.closeGuestAuth}
        onLogin={context.handleGuestLogin}
      />
    </Suspense>
  );
}

export default function GuestAppShell({
  page,
  isMobile,
  serviceError,
  authMode,
  setAuthMode,
  questions,
  guestWritingDraft,
  setGuestWritingDraft,
  guestAuthState,
  setGuestAuthState,
  _guestDraftFlags,
  onLogin,
  onNavigate,
}) {
  const {
    _guestHome,
    guestWriting,
    guestSourceMode,
    navigateGuestPage,
    startGuestAuth,
    _handleHomeNavigate,
    closeGuestAuth,
    handleGuestLogin,
  } = useGuestShellController({
    page,
    authMode,
    setAuthMode,
    setGuestWritingDraft,
    guestAuthState,
    setGuestAuthState,
    onNavigate,
    onLogin,
  });

  useEffect(() => {
    if (!isLoginRequiredPage(page)) return;
    setAuthMode("login");
    setGuestAuthState({
      open: false,
      mode: "login",
      target: page,
      returnPage: "portal",
    });
    onNavigate("auth", { replace: true });
  }, [onNavigate, page, setAuthMode, setGuestAuthState]);

  if (isLoginRequiredPage(page)) {
    return <ShellFallback />;
  }

  const context = {
    page,
    isMobile,
    serviceError,
    authMode,
    questions,
    guestWriting,
    guestSourceMode,
    guestWritingDraft,
    setGuestWritingDraft,
    guestAuthState,
    setAuthMode,
    onLogin,
    onNavigate,
    navigateGuestPage,
    startGuestAuth,
    closeGuestAuth,
    handleGuestLogin,
  };

  const pageElement = renderGuestPublicPage(page, context)
    || renderGuestSpecialPage(page, context)
    || renderGuestHome(context);

  const isSpecialPage = page === "auth" || page === "privacy" || page === "agreement";

  return (
    <>
      {!isSpecialPage && (
        <GuestNavBar
          activePage={page}
          onNavigate={navigateGuestPage}
          onLogin={() => startGuestAuth("login", page)}
          onRegister={() => startGuestAuth("register", page)}
        />
      )}
      <div key={page} className="guest-page-view">{pageElement}</div>
      {page === "portal" && <NotificationTicker isGuest isMobile={isMobile} currentPage={page} />}
      {renderGuestAuthOverlay(context)}
    </>
  );
}
