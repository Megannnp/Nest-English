const pagePreloaders = {
  portal: () => import("../portal/PortalPage.jsx"),
  explore: () => import("../components/ExplorePage.jsx"),
  plan: () => import("../plan/PlanDiagnosisPage.jsx"),
  "skill-training": () => import("../portal/ProductCategoryPage.jsx"),
  "language-foundation": () => import("../components/foundation/FoundationShowcasePage.jsx"),
  writing: () => import("../writing/WritingPage.jsx"),
  "writing-bank": () => import("../writing/WritingPage.jsx"),
  growth: () => import("../components/UnifiedProgressPage.jsx"),
  records: () => import("../writing/WritingProgressPage.jsx"),
  "writing-refine-sentence": () => import("../writing/WritingRefineSentencePage.jsx"),
  "writing-refine-structure": () => import("../writing/WritingRefineStructurePage.jsx"),
  "grammar-analyzer": () => import("../grammar/GrammarAnalyzerPage.jsx"),
  "grammar-courses": () => import("../grammar/GrammarCoursesPage.jsx"),
  "grammar-practice": () => import("../grammar/GrammarPracticePage.jsx"),
  "grammar-progress": () => import("../grammar/GrammarProgressPage.jsx"),
  "grammar-quiz": () => import("../grammar/GrammarQuizPage.jsx"),
  "reading-analyzer": () => import("../reading/ReadingAnalyzerPage.jsx"),
  "reading-practice": () => import("../reading/ReadingPracticePage.jsx"),
  "reading-paper": () => import("../reading/ReadingPaperPage.jsx"),
  "reading-courses": () => import("../reading/ReadingCoursesPage.jsx"),
  "reading-progress": () => import("../reading/ReadingProgressPage.jsx"),
  "phonetics-camp": () => import("../phonetics/PhoneticCampPage.jsx"),
  "phonetics-overview": () => import("../phonetics/PhoneticOverviewPage.jsx"),
  "phonetics-sound": () => import("../phonetics/PhoneticSoundPage.jsx"),
  "phonetics-syllable": () => import("../phonetics/PhoneticSyllablePage.jsx"),
  "phonetics-sentence": () => import("../phonetics/PhoneticSentencePage.jsx"),
  "phonetics-discourse": () => import("../phonetics/PhoneticDiscoursePage.jsx"),
  "phonetics-progress": () => import("../phonetics/PhoneticProgressPage.jsx"),
  "vocab-resources": () => import("../vocab/VocabResourcesPage.jsx"),
  "vocab-progress": () => import("../vocab/VocabProgressPage.jsx"),
  "vocab-analyzer": () => import("../vocab/VocabAnalyzerPage.jsx"),
  "vocab-courses": () => import("../vocab/VocabCoursesPage.jsx"),
  "vocab-quiz": () => import("../vocab/VocabQuizPage.jsx"),
  "listening-basics": () => import("../listening/ListeningBasicsPage.jsx"),
  "listening-advanced": () => import("../listening/ListeningAdvancedPage.jsx"),
  "listening-practice": () => import("../listening/ListeningPracticePage.jsx"),
  "listening-progress": () => import("../listening/ListeningProgressPage.jsx"),
  camp: () => import("../camp/CampHomePage.jsx"),
  "camp-course-detail": () => import("../camp/CampCourseDetailPage.jsx"),
  "camp-my-course-detail": () => import("../camp/CampLearningPage.jsx"),
  "camp-redeem": () => import("../camp/CampRedeemPage.jsx"),
  speaking: () => import("../speaking/SpeakingPage.jsx"),
  "speaking-progress": () => import("../speaking/SpeakingProgressPage.jsx"),
  refund: () => import("../components/RefundPolicy.jsx"),
  workbench: () => import("../teacher/TeacherWorkbenchPage.jsx"),
  "parent-home": () => import("./ParentPageContent.jsx"),
  "teacher-prep": () => import("../teacher/TeacherPrepPage.jsx"),
  "teacher-data": () => import("../teacher/TeacherDataPage.jsx"),
  "grammar-workbench": () => import("../teacher/GrammarWorkbenchPage.jsx"),
  "reading-workbench": () => import("../reading/ReadingWorkbenchPage.jsx"),
  "listening-workbench": () => import("../listening/ListeningWorkbenchPage.jsx"),
  "vocab-workbench": () => import("../vocab/VocabWorkbenchPage.jsx"),
  "phonetics-workbench": () => import("../phonetics/PhoneticWorkbenchPage.jsx"),
  "speaking-workbench": () => import("../speaking/SpeakingWorkbenchPage.jsx"),
  "camp-management": () => import("../teacher/CampManagementPage.jsx"),
  classes: () => import("../teacher/ClassManagementPage.jsx"),
  "assignment-create": () => import("../teacher/TeacherAssignmentCreatePage.jsx"),
  "teacher-todo": () => import("../teacher/workbench/TeacherTodoScenePage.jsx"),
  "batch-grading": () => import("../teacher/BatchGradingPage.jsx"),
  account: () => import("../components/AccountPage.jsx"),
  mine: () => import("../components/MinePage.jsx"),
  points: () => import("../components/PointsPage.jsx"),
  quota: () => import("../components/QuotaPage.jsx"),
};

const preloadedPages = new Map();

export function hasPagePreloader(page) {
  return Boolean(pagePreloaders[page]);
}

export function preloadPage(page) {
  const preloader = pagePreloaders[page];
  if (!preloader) return Promise.resolve(false);
  if (!preloadedPages.has(page)) {
    preloadedPages.set(
      page,
      Promise.resolve(preloader())
        .then(() => true)
        .catch(() => {
          preloadedPages.delete(page);
          return false;
        })
    );
  }
  return preloadedPages.get(page);
}
