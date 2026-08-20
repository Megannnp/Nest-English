/* eslint-disable complexity */
import { Suspense, lazy } from "react";

import { normalizePage } from "./navigation.js";
import { buildPrepExamProps } from "./prepExamSelection.js";
import AppLoadingShell from "../components/shared/AppLoadingShell.jsx";

const VocabAnalyzerPage = lazy(() => import("../vocab/VocabAnalyzerPage.jsx"));
const VocabCoursesPage = lazy(() => import("../vocab/VocabCoursesPage.jsx"));
const VocabProgressPage = lazy(() => import("../vocab/VocabProgressPage.jsx"));
const VocabQuizPage = lazy(() => import("../vocab/VocabQuizPage.jsx"));
const VocabResourcesPage = lazy(() => import("../vocab/VocabResourcesPage.jsx"));
const GrammarQuizPage = lazy(() => import("../grammar/GrammarQuizPage.jsx"));
const ReadingAnalyzerPage = lazy(() => import("../reading/ReadingAnalyzerPage.jsx"));
const ReadingPracticePage = lazy(() => import("../reading/ReadingPracticePage.jsx"));
const ReadingPaperPage = lazy(() => import("../reading/ReadingPaperPage.jsx"));
const ReadingCoursesPage = lazy(() => import("../reading/ReadingCoursesPage.jsx"));
const ReadingProgressPage = lazy(() => import("../reading/ReadingProgressPage.jsx"));
const PrivacyPolicy = lazy(() => import("../components/PrivacyPolicy.jsx"));
const UserAgreement = lazy(() => import("../components/UserAgreement.jsx"));
const RefundPolicy = lazy(() => import("../components/RefundPolicy.jsx"));
const PortalPage = lazy(() => import("../portal/PortalPage.jsx"));
const ExplorePage = lazy(() => import("../components/ExplorePage.jsx"));
const FoundationShowcasePage = lazy(() => import("../components/foundation/FoundationShowcasePage.jsx"));
const ProductCategoryPage = lazy(() => import("../portal/ProductCategoryPage.jsx"));
const GrammarAnalyzerPage = lazy(() => import("../grammar/GrammarAnalyzerPage.jsx"));
const GrammarCoursesPage = lazy(() => import("../grammar/GrammarCoursesPage.jsx"));
const GrammarPracticePage = lazy(() => import("../grammar/GrammarPracticePage.jsx"));
const GrammarProgressPage = lazy(() => import("../grammar/GrammarProgressPage.jsx"));
const StudentPageContent = lazy(() => import("./StudentPageContent.jsx"));
const TeacherPageContent = lazy(() => import("./TeacherPageContent.jsx"));
const ParentPageContent = lazy(() => import("./ParentPageContent.jsx"));
const AdminPage = lazy(() => import("../components/admin/AdminPage.jsx"));
const AdminQuestionBankPanel = lazy(() => import("../components/admin/AdminQuestionBankPanel.jsx"));
const AdminVocabContentPanel = lazy(() => import("../components/admin/AdminVocabContentPanel.jsx"));
const AdminStandalonePage = lazy(() => import("../components/admin/AdminStandalonePage.jsx"));
const AdminMessageCenterPage = lazy(() => import("../components/admin/AdminMessageCenterPage.jsx"));
const CampManagementPage = lazy(() => import("../teacher/CampManagementPage.jsx"));
const WritingRefineSentencePage = lazy(() => import("../writing/WritingRefineSentencePage.jsx"));
const WritingRefineStructurePage = lazy(() => import("../writing/WritingRefineStructurePage.jsx"));
const PhoneticCampPage = lazy(() => import("../phonetics/PhoneticCampPage.jsx"));
const PhoneticOverviewPage = lazy(() => import("../phonetics/PhoneticOverviewPage.jsx"));
const PhoneticSoundPage = lazy(() => import("../phonetics/PhoneticSoundPage.jsx"));
const PhoneticSyllablePage = lazy(() => import("../phonetics/PhoneticSyllablePage.jsx"));
const PhoneticSentencePage = lazy(() => import("../phonetics/PhoneticSentencePage.jsx"));
const PhoneticDiscoursePage = lazy(() => import("../phonetics/PhoneticDiscoursePage.jsx"));
const PhoneticProgressPage = lazy(() => import("../phonetics/PhoneticProgressPage.jsx"));
const ListeningBasicsPage = lazy(() => import("../listening/ListeningBasicsPage.jsx"));
const ListeningAdvancedPage = lazy(() => import("../listening/ListeningAdvancedPage.jsx"));
const ListeningPracticePage = lazy(() => import("../listening/ListeningPracticePage.jsx"));
const ListeningProgressPage = lazy(() => import("../listening/ListeningProgressPage.jsx"));
const CampHomePage = lazy(() => import("../camp/CampHomePage.jsx"));
const CampCourseDetailPage = lazy(() => import("../camp/CampCourseDetailPage.jsx"));
const CampLearningPage = lazy(() => import("../camp/CampLearningPage.jsx"));
const CampRedeemPage = lazy(() => import("../camp/CampRedeemPage.jsx"));
const SpeakingPage = lazy(() => import("../speaking/SpeakingPage.jsx"));
const SpeakingProgressPage = lazy(() => import("../speaking/SpeakingProgressPage.jsx"));
const PlanDiagnosisPage = lazy(() => import("../plan/PlanDiagnosisPage.jsx"));


function StaticPageFallback() {
  return <AppLoadingShell minHeight="40vh" />;
}

function PageSuspense({ children }) {
  return <Suspense fallback={<StaticPageFallback />}>{children}</Suspense>;
}

function getAccountClick(props) {
  return () => props.setShowAccountMenu?.((open) => !open);
}

function renderPublicPage(normalizedPage, props, user) {
  const onAccountClick = getAccountClick(props);
  const commonProps = {
    onNavigate: props.setPage,
    user,
    activePage: normalizedPage,
    onAccountClick,
    hideTopBar: !!user?.role,
    onUserUpdate: props.setUser,
    ...buildPrepExamProps(user),
  };
  const pages = {
    "writing-refine-sentence": <WritingRefineSentencePage {...commonProps} />,
    "writing-refine-structure": <WritingRefineStructurePage {...commonProps} />,
    privacy: <PrivacyPolicy />,
    agreement: <UserAgreement />,
    refund: <RefundPolicy />,
    portal: <PortalPage {...commonProps} mode={user ? "member" : "guest"} />,
    explore: <ExplorePage {...commonProps} _onNavigate={props.setPage} isMobile={props.isMobile} />,
    resume: <ExplorePage {...commonProps} _onNavigate={props.setPage} isMobile={props.isMobile} resumeMode />,
    "skill-training": <ProductCategoryPage {...commonProps} />,
    "language-foundation": <FoundationShowcasePage {...commonProps} />,
    "grammar-analyzer": <GrammarAnalyzerPage {...commonProps} />,
    "grammar-courses": <GrammarCoursesPage {...commonProps} />,
    "grammar-practice": <GrammarPracticePage {...commonProps} />,
    "grammar-progress": <GrammarProgressPage {...commonProps} />,
    "grammar-quiz": <GrammarQuizPage {...commonProps} />,
    "reading-analyzer": <ReadingAnalyzerPage {...commonProps} isMobile={props.isMobile} />,
    "reading-practice": <ReadingPracticePage {...commonProps} />,
    "reading-paper": <ReadingPaperPage {...commonProps} />,
    "reading-courses": <ReadingCoursesPage {...commonProps} />,
    "reading-progress": <ReadingProgressPage {...commonProps} />,
    "phonetics-camp": <PhoneticCampPage {...commonProps} activePage="phonetics-camp" />,
    "phonetics-overview": <PhoneticOverviewPage {...commonProps} activePage="phonetics-overview" />,
    "phonetics-sound": <PhoneticSoundPage {...commonProps} activePage="phonetics-sound" />,
    "phonetics-syllable": <PhoneticSyllablePage {...commonProps} activePage="phonetics-syllable" />,
    "phonetics-sentence": <PhoneticSentencePage {...commonProps} activePage="phonetics-sentence" />,
    "phonetics-discourse": <PhoneticDiscoursePage {...commonProps} activePage="phonetics-discourse" />,
    "phonetics-progress": <PhoneticProgressPage {...commonProps} />,
    "vocab-analyzer": <VocabAnalyzerPage {...commonProps} />,
    "vocab-courses": <VocabCoursesPage {...commonProps} />,
    "vocab-progress": <VocabProgressPage {...commonProps} />,
    "vocab-quiz": <VocabQuizPage {...commonProps} />,
    "vocab-resources": <VocabResourcesPage {...commonProps} />,
    "listening-basics": <ListeningBasicsPage {...commonProps} />,
    "listening-advanced": <ListeningAdvancedPage {...commonProps} />,
    "listening-practice": <ListeningPracticePage {...commonProps} />,
    "listening-progress": <ListeningProgressPage {...commonProps} />,
    camp: <CampHomePage {...commonProps} />,
    "camp-course-detail": <CampCourseDetailPage {...commonProps} courseId={props.studentPage?.state?.selectedCampCourseId || props.teacherPage?.state?.selectedCampCourseId} />,
    "camp-my-course-detail": <CampLearningPage {...commonProps} courseId={props.studentPage?.state?.selectedCampMyCourseId || props.teacherPage?.state?.selectedCampMyCourseId} />,
    "camp-redeem": <CampRedeemPage {...commonProps} />,
    speaking: <SpeakingPage {...commonProps} activePage="speaking" />,
    "speaking-progress": <SpeakingProgressPage {...commonProps} />,
    plan: <PlanDiagnosisPage {...commonProps} />,
  };
  const pageElement = pages[normalizedPage];

  return pageElement ? <PageSuspense>{pageElement}</PageSuspense> : null;
}

export default function AppPageContent(props) {
  const { page, user } = props;
  const isAdmin = user?.is_admin === 1;
  const normalizedPage = normalizePage(page, user?.role, { isAdmin });

  const publicPage = renderPublicPage(normalizedPage, props, user);
  if (publicPage) return publicPage;

  if (normalizedPage === "admin") {
    return (
      <PageSuspense>
        <AdminPage user={user} onLogout={props.handleLogout} isMobile={props.isMobile} />
      </PageSuspense>
    );
  }

  if (normalizedPage === "camp-management") {
    return (
      <PageSuspense>
        <CampManagementPage user={user} isMobile={props.isMobile} />
      </PageSuspense>
    );
  }

  if (normalizedPage === "question-bank") {
    return (
      <PageSuspense>
        <AdminStandalonePage title="题库管理">
          <AdminQuestionBankPanel />
        </AdminStandalonePage>
      </PageSuspense>
    );
  }

  if (normalizedPage === "vocab-content") {
    return (
      <PageSuspense>
        <AdminStandalonePage title="词汇内容管理">
          <AdminVocabContentPanel />
        </AdminStandalonePage>
      </PageSuspense>
    );
  }

  if (normalizedPage === "messages") {
    return (
      <PageSuspense>
        <AdminMessageCenterPage />
      </PageSuspense>
    );
  }

  const RolePageContent = user?.role === "teacher"
    ? TeacherPageContent
    : user?.role === "parent"
      ? ParentPageContent
      : StudentPageContent;

  return (
    <PageSuspense>
      <RolePageContent
        {...props}
        page={normalizedPage}
        {...buildPrepExamProps(user)}
        hideTopBar={!!user?.role}
        handleLogout={props.handleLogout}
        setUser={props.setUser || props.studentPage?.actions?.setUser || props.teacherPage?.actions?.setUser}
        accountTab={props.studentPage?.state?.accountTab || props.teacherPage?.state?.accountTab}
      />
    </PageSuspense>
  );
}
