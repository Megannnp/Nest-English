import { Suspense, lazy } from "react";

import AppLoadingShell from "../../components/shared/AppLoadingShell.jsx";
import { buildPrepExamProps } from "../prepExamSelection.js";

const GrammarQuizPage = lazy(() => import("../../grammar/GrammarQuizPage.jsx"));
const ReadingAnalyzerPage = lazy(() => import("../../reading/ReadingAnalyzerPage.jsx"));
const ReadingPracticePage = lazy(() => import("../../reading/ReadingPracticePage.jsx"));
const ReadingPaperPage = lazy(() => import("../../reading/ReadingPaperPage.jsx"));
const ReadingCoursesPage = lazy(() => import("../../reading/ReadingCoursesPage.jsx"));
const ReadingProgressPage = lazy(() => import("../../reading/ReadingProgressPage.jsx"));
const GrammarAnalyzerPage = lazy(() => import("../../grammar/GrammarAnalyzerPage.jsx"));
const GrammarCoursesPage = lazy(() => import("../../grammar/GrammarCoursesPage.jsx"));
const GrammarPracticePage = lazy(() => import("../../grammar/GrammarPracticePage.jsx"));
const GrammarProgressPage = lazy(() => import("../../grammar/GrammarProgressPage.jsx"));
const PortalPage = lazy(() => import("../../portal/PortalPage.jsx"));
const ProductCategoryPage = lazy(() => import("../../portal/ProductCategoryPage.jsx"));
const ExplorePage = lazy(() => import("../../components/ExplorePage.jsx"));
const FoundationShowcasePage = lazy(() => import("../../components/foundation/FoundationShowcasePage.jsx"));
const MeganPage = lazy(() => import("../../components/MeganPage.jsx"));
const UnifiedProgressPage = lazy(() => import("../../components/UnifiedProgressPage.jsx"));
const WritingPage = lazy(() => import("../../writing/WritingPage.jsx"));
const WritingRefineSentencePage = lazy(() => import("../../writing/WritingRefineSentencePage.jsx"));
const WritingRefineStructurePage = lazy(() => import("../../writing/WritingRefineStructurePage.jsx"));
const WritingProgressPage = lazy(() => import("../../writing/WritingProgressPage.jsx"));
const PhoneticCampPage = lazy(() => import("../../phonetics/PhoneticCampPage.jsx"));
const PhoneticOverviewPage = lazy(() => import("../../phonetics/PhoneticOverviewPage.jsx"));
const PhoneticSoundPage = lazy(() => import("../../phonetics/PhoneticSoundPage.jsx"));
const PhoneticSyllablePage = lazy(() => import("../../phonetics/PhoneticSyllablePage.jsx"));
const PhoneticSentencePage = lazy(() => import("../../phonetics/PhoneticSentencePage.jsx"));
const PhoneticDiscoursePage = lazy(() => import("../../phonetics/PhoneticDiscoursePage.jsx"));
const PhoneticProgressPage = lazy(() => import("../../phonetics/PhoneticProgressPage.jsx"));
const VocabAnalyzerPage = lazy(() => import("../../vocab/VocabAnalyzerPage.jsx"));
const VocabCoursesPage = lazy(() => import("../../vocab/VocabCoursesPage.jsx"));
const VocabProgressPage = lazy(() => import("../../vocab/VocabProgressPage.jsx"));
const VocabQuizPage = lazy(() => import("../../vocab/VocabQuizPage.jsx"));
const VocabResourcesPage = lazy(() => import("../../vocab/VocabResourcesPage.jsx"));
const ListeningBasicsPage = lazy(() => import("../../listening/ListeningBasicsPage.jsx"));
const ListeningAdvancedPage = lazy(() => import("../../listening/ListeningAdvancedPage.jsx"));
const ListeningPracticePage = lazy(() => import("../../listening/ListeningPracticePage.jsx"));
const ListeningProgressPage = lazy(() => import("../../listening/ListeningProgressPage.jsx"));
const CampHomePage = lazy(() => import("../../camp/CampHomePage.jsx"));
const CampCourseDetailPage = lazy(() => import("../../camp/CampCourseDetailPage.jsx"));
const SpeakingPage = lazy(() => import("../../speaking/SpeakingPage.jsx"));
const SpeakingProgressPage = lazy(() => import("../../speaking/SpeakingProgressPage.jsx"));

function PageSuspense({ children }) {
  return <Suspense fallback={<AppLoadingShell />}>{children}</Suspense>;
}

function WritingGuestPage({ context, sourceMode = "manual", activePage = "writing" }) {
  return (
    <WritingPage
      isMobile={context.isMobile}
      hideTopBar
      user={null}
      serviceError={context.serviceError}
      questions={context.questions}
      onQuestionsChange={() => {}}
      onWritingSaved={() => {}}
      initialDraft={context.guestWritingDraft}
      onDraftChange={context.setGuestWritingDraft}
      guestMode
      guestSourceMode={sourceMode}
      activePage={activePage}
      onBackHome={() => context.navigateGuestPage("portal")}
      onNavigate={context.navigateGuestPage}
      onRequireAuth={({ mode = "login" } = {}) => {
        context.startGuestAuth(mode, activePage);
      }}
      {...buildPrepExamProps()}
    />
  );
}

export function renderGuestPublicPage(page, context) {
  const authClickProps = {
    onLoginClick: () => context.startGuestAuth("login", page),
    onRegisterClick: () => context.startGuestAuth("register", page),
  };
  const commonPageProps = {
    activePage: page,
    isMobile: context.isMobile,
    onNavigate: context.onNavigate,
    hideTopBar: true,
    ...buildPrepExamProps(),
    ...authClickProps,
  };
  const pages = {
    portal: <PortalPage onNavigate={context.onNavigate} onLogin={() => context.startGuestAuth("login", "portal")} onRegister={() => context.startGuestAuth("register", "portal")} />,
    explore: <ExplorePage {...commonPageProps} _onNavigate={context.onNavigate} isMobile={context.isMobile} />,
    resume: <ExplorePage {...commonPageProps} _onNavigate={context.onNavigate} isMobile={context.isMobile} resumeMode />,
    megan: <MeganPage {...commonPageProps} />,
    "skill-training": <ProductCategoryPage {...commonPageProps} />,
    "language-foundation": <FoundationShowcasePage {...commonPageProps} />,
    "grammar-analyzer": <GrammarAnalyzerPage {...commonPageProps} />,
    "grammar-courses": <GrammarCoursesPage {...commonPageProps} />,
    "grammar-practice": <GrammarPracticePage {...commonPageProps} />,
    "grammar-progress": <GrammarProgressPage {...commonPageProps} />,
    "grammar-quiz": <GrammarQuizPage {...commonPageProps} />,
    "reading-analyzer": <ReadingAnalyzerPage {...commonPageProps} isMobile={context.isMobile} onLogin={context.onLogin} onRegister={() => context.startGuestAuth("register", page)} />,
    "reading-practice": <ReadingPracticePage {...commonPageProps} onLogin={context.onLogin} onRegister={() => context.startGuestAuth("register", page)} />,
    "reading-paper": <ReadingPaperPage {...commonPageProps} onLogin={context.onLogin} onRegister={() => context.startGuestAuth("register", page)} />,
    "reading-courses": <ReadingCoursesPage {...commonPageProps} />,
    "reading-progress": <ReadingProgressPage {...commonPageProps} />,
    writing: <WritingGuestPage context={context} />,
    "writing-manual": <WritingGuestPage context={context} />,
    "writing-bank": <WritingGuestPage context={context} sourceMode="bank" activePage="writing-bank" />,
    growth: <UnifiedProgressPage user={null} myWritings={[]} isMobile={context.isMobile} onNavigate={context.onNavigate} />,
    records: <WritingProgressPage user={null} myWritings={[]} isMobile={context.isMobile} onNavigate={context.onNavigate} {...authClickProps} />,
    "writing-refine": <WritingRefineSentencePage {...commonPageProps} navigateGuestPage={context.navigateGuestPage} />,
    "writing-refine-sentence": <WritingRefineSentencePage {...commonPageProps} navigateGuestPage={context.navigateGuestPage} />,
    "writing-refine-structure": <WritingRefineStructurePage {...commonPageProps} navigateGuestPage={context.navigateGuestPage} />,
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
  };

  return pages[page] ? <PageSuspense>{pages[page]}</PageSuspense> : null;
}
