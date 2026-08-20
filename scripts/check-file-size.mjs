import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const warningLineCount = 300;
const explainLineCount = 400;
const failLineCount = 500;
const growthBudgetSlack = 20;

const sourceRoots = [
  'client/src',
  'server/services',
  'server/utils',
  'server/routes',
  'shared',
];

const allowedOversizedFiles = new Map([
  ['client/src/App.jsx', 'Top-level app orchestration across auth, routing, shell, and scroll state pending route-controller extraction.'],
  ['client/src/api/admin.js', 'Admin API facade pending admin-domain client module split.'],
  ['client/src/api/client.js', 'API client compatibility layer pending endpoint-specific client extraction.'],
  ['client/src/api/index.js', 'API endpoint facade pending domain-specific client module split.'],
  ['client/src/app/AppPageContent.test.jsx', 'App page content integration smoke suite pending route fixture helper extraction.'],
  ['client/src/app/GuestAppShell.jsx', 'Guest shell composition pending public navigation and layout extraction.'],
  ['client/src/app/ParentDashboardPanels.jsx', 'Parent dashboard panels extracted from parent page pending task/growth/entitlement subsection split.'],
  ['client/src/app/navigation.js', 'Navigation role/page registry pending route metadata catalog extraction.'],
  ['client/src/app/publicPageSeo.js', 'Public page SEO metadata map pending content catalog extraction.'],
  ['client/src/app/routes.js', 'Route parsing and URL construction table pending route metadata catalog extraction.'],
  ['client/src/app/TeacherPageContent.jsx', 'Teacher role page switcher pending per-workflow route renderer extraction.'],
  ['client/src/app/ParentPageContent.jsx', 'Parent page content combines child binding, overview, progress, and entitlement panels pending section split.'],
  ['client/src/app/useAppSession.jsx', 'App session hook combines auth, profile, and navigation side effects pending split.'],
  ['client/src/components/AccountPage.jsx', 'Account tab shell pending tab-level lazy module split.'],
  ['client/src/components/AuthPage.jsx', 'Auth page combines login, register, and reset variants pending auth scene split.'],
  ['client/src/components/FeedbackView/FeedbackDeepReviewBlocks.jsx', 'Specialized detailed-feedback render blocks pending section extraction.'],
  ['client/src/components/FeedbackView/index.jsx', 'Feedback view entry coordinates multiple feedback renderers pending adapter split.'],
  ['client/src/components/FeedbackView/analysis-types/continuation/QuestionAnalysis.jsx', 'High-priority specialized analysis panel pending split.'],
  ['client/src/components/FeedbackView/feedbackAdapter.js', 'Legacy feedback normalization adapter pending schema-specific module split.'],
  ['client/src/components/FeedbackView/feedbackPrint.js', 'Print rendering pipeline pending layout/template extraction.'],
  ['client/src/components/FeedbackView/FeedbackOverview.jsx', 'Feedback overview renderer pending score, summary, and rubric section extraction.'],
  ['client/src/components/batch-feedback-pdf-export.js', 'Batch feedback PDF export renderer pending template and pagination extraction.'],
  ['client/src/components/NotificationTicker/NotificationTicker.jsx', 'Notification ticker data, display, and animation logic pending hook/component split.'],
  ['client/src/components/SingleFeedbackRegressionLab.jsx', 'Regression lab combines sample selection, execution, and result rendering pending test-harness extraction.'],
  ['client/src/components/PointsPage.jsx', 'Points page combines earning rules, ledger, redemption, and claim flows pending section split.'],
  ['client/src/components/UnifiedProgressPage.jsx', 'Unified growth dashboard combines module cards and progress loading pending card extraction.'],
  ['client/src/components/auth/AuthMainForm.jsx', 'Auth form variants pending mode-specific component split.'],
  ['client/src/components/account/AccountSecurityTab.jsx', 'Account security tab combines password and verification workflows pending form split.'],
  ['client/src/components/account/SubscriptionTab.jsx', 'Subscription, points, orders, and entitlement panels pending subsection extraction.'],
  ['client/src/components/admin/AdminCommunicationPanels.jsx', 'Admin communication workflows pending announcement/message panel extraction.'],
  ['client/src/components/admin/AdminQuestionEditors.jsx', 'Admin question type editors extracted from question bank panel pending per-module editor split.'],
  ['client/src/components/admin/AdminPaymentOrdersPanel.jsx', 'Admin payment order admin panel pending filters, table, and adjustment form split.'],
  ['client/src/components/admin/AdminQuestionBankPanel.jsx', 'Admin question bank editor after question-type extraction pending resource/material/batch import panel split.'],
  ['client/src/components/admin/AdminVocabContentPanel.jsx', 'Admin vocabulary content editor combines category, synonym, and course editing pending panel split.'],
  ['client/src/components/admin/UserManagementPanel.jsx', 'Admin user management panel pending filters, table, and actions extraction.'],
  ['client/src/components/questions/QuestionSourceBrowser.jsx', 'Question source browser pending filter/list/detail extraction.'],
  ['client/src/components/shared/GlobalTopBar.jsx', 'Global top bar combines responsive navigation, account entry, and product switcher pending shell split.'],
  ['client/src/components/shared/DailyTasksFloat.jsx', 'Daily tasks float combines task loading, quick-add, and mobile presentation pending hook/component split.'],
  ['client/src/components/shared/UI.jsx', 'Shared UI compatibility barrel pending migration to smaller primitives.'],
  ['client/src/components/shared/uiPrimitives.jsx', 'Shared UI primitives pending component-family module split.'],
  ['client/src/grammar/GrammarCoursesPage.jsx', 'Grammar courses page pending catalog and progress section extraction.'],
  ['client/src/grammar/GrammarPage.jsx', 'Grammar landing and course orchestration pending lesson navigation extraction.'],
  ['client/src/grammar/GrammarProgressPage.jsx', 'Grammar progress dashboard pending chart and summary extraction.'],
  ['client/src/grammar/GrammarAnalyzerPage.jsx', 'Grammar analyzer page combines sentence input, AI result, and tree rendering pending flow split.'],
  ['client/src/grammar/SentenceTree.jsx', 'Sentence tree visualization and controls pending renderer/state split.'],
  ['client/src/grammar/GrammarPracticePage.jsx', 'Grammar practice generator and quiz runner pending flow extraction.'],
  ['client/src/grammar/GrammarQuizPage.jsx', 'Grammar quiz runtime pending question renderer and state hook split.'],
  ['client/src/grammar/grammarCourseContent.js', 'Static grammar lesson catalog intentionally stored as a single content module.'],
  ['client/src/listening/ListeningExerciseParts.jsx', 'Listening exercise cards extracted from listening page pending practice test section split.'],
  ['client/src/listening/ListeningPage.jsx', 'Listening practice modes pending shared exercise runtime extraction.'],
  ['client/src/phonetics/PhoneticPage.jsx', 'Phonetic page combines catalog, playback, and practice controls pending section extraction.'],
  ['client/src/phonetics/PhoneticFrameworkPage.jsx', 'Phonetic framework page combines lesson copy, quizzes, and annotator entry pending content/data extraction.'],
  ['client/src/phonetics/PhoneticSoundPage.jsx', 'Phonetic sound page pending sound grid, playback controls, and practice section extraction.'],
  ['client/src/phonetics/PhoneticSyllablePage.jsx', 'Phonetic syllable page pending syllable list and playback state extraction.'],
  ['client/src/phonetics/phoneticMindMap.jsx', 'Phonetic mind map data and renderer pending graph data/view separation.'],
  ['client/src/portal/PortalPage.jsx', 'Portal composition pending section extraction.'],
  ['client/src/reading/ReadingAnalyzerPage.jsx', 'Reading analyzer workflow combines OCR, prompt input, analysis state, and result rendering pending module split.'],
  ['client/src/reading/ReadingPage.jsx', 'Reading landing/practice entry pending section extraction.'],
  ['client/src/reading/ReadingPaperPage.jsx', 'Reading paper runtime pending passage, question, and review panel extraction.'],
  ['client/src/reading/ReadingPracticePage.jsx', 'Reading practice runtime pending parser/state/view split.'],
  ['client/src/reading/ReadingQuestionCards.jsx', 'Reading question card renderer pending choice, answer, and explanation split.'],
  ['client/src/reading/ReadingQuizPage.jsx', 'Reading quiz runtime combines setup, generation, answering, and result recording pending flow extraction.'],
  ['client/src/reading/ReadingWorkbenchPage.jsx', 'Reading workbench combines class progress, suggestions, and assignment panels pending shared module workbench split.'],
  ['client/src/reading/readingPassageBank.js', 'Reading passage seed bank intentionally kept as a static content module.'],
  ['client/src/reading/readingCourseContent.js', 'Static reading course catalog intentionally stored as a single content module.'],
  ['client/src/speaking/SpeakingPage.jsx', 'Speaking practice page combines question selection, recording, transcript, and progress save pending runtime split.'],
  ['client/src/teacher/BatchGradingPage.jsx', 'Batch grading page composition pending panel and workflow extraction.'],
  ['client/src/teacher/GrammarWorkbenchPage.jsx', 'Grammar workbench combines class loading, assignment publishing, and progress panels pending component split.'],
  ['client/src/teacher/ClassManagementPage.jsx', 'Class management page pending roster, class list, and actions extraction.'],
  ['client/src/teacher/CampManagementPage.jsx', 'Camp management page combines course editing, lessons, materials, and redemption codes pending panel split.'],
  ['client/src/teacher/TeacherDataPage.jsx', 'Teacher data page combines class overview, module stats, and drilldowns pending panel extraction.'],
  ['client/src/teacher/TeacherReportPanels.jsx', 'Teacher report panel groups procurement summary, weaknesses, student segments, and exports after first extraction.'],
  ['client/src/teacher/batch-grading/BatchGradingPageSections.jsx', 'Batch grading page sections pending panel-level extraction.'],
  ['client/src/teacher/batch-grading/useBatchGradingJobRuntime.js', 'Batch grading job polling and actions pending runtime helper extraction.'],
  ['client/src/teacher/batch-grading/useBatchGradingModel.js', 'Batch grading model combines filters, pagination, and derived state pending hook split.'],
  ['client/src/teacher/batch-grading/useBatchGradingUploadActions.js', 'Batch grading upload flow pending parser, validation, and submission extraction.'],
  ['client/src/teacher/batch-grading/useBatchGradingUploadActions.test.jsx', 'Broad upload flow regression suite pending fixture/helper extraction.'],
  ['client/src/teacher/classes/ClassQueuePanel.jsx', 'Class queue panel pending queue list and roster action extraction.'],
  ['client/src/teacher/classes/ClassStudentsPanel.jsx', 'Class students panel pending roster table and student stats extraction.'],
  ['client/src/teacher/teacher-writing/DetailedFeedbackStatusSection.jsx', 'Teacher writing detailed-feedback status panel pending state block extraction.'],
  ['client/src/teacher/workbench/AssignmentDetailPanelSections.jsx', 'Workbench assignment detail sections pending per-section module split.'],
  ['client/src/teacher/workbench/AssignmentDetailPanel.jsx', 'Teacher assignment detail panel pending subsection extraction.'],
  ['client/src/teacher/workbench/useTeacherWorkbenchActions.js', 'Teacher workbench actions hook pending mutation-specific helper extraction.'],
  ['client/src/teacher/workbench/useTeacherWorkbenchData.js', 'Teacher workbench data hook pending query and derived-state split.'],
  ['client/src/teacher/workbench/useTeacherWorkbenchModel.js', 'Teacher workbench model composition pending smaller hook split.'],
  ['client/src/teacher/workbench/WorkbenchQueueSections.jsx', 'Teacher workbench queue sections pending section component extraction.'],
  ['client/src/vocab/VocabStudyPage.jsx', 'Vocabulary study modes pending mode-specific runtime extraction.'],
  ['client/src/vocab/VocabCoursesPage.jsx', 'Vocabulary courses page pending course tree and progress panel extraction.'],
  ['client/src/vocab/VocabQuizPage.jsx', 'Vocabulary quiz page combines setup, quiz, flashcard, and progress save pending phase extraction.'],
  ['client/src/vocab/VocabResourcesPage.jsx', 'Vocabulary resources page combines bank search, selection, and local import pending editor/list split.'],
  ['client/src/vocab/vocabCourseContent.js', 'Static vocabulary course catalog intentionally grouped until content pipeline extraction.'],
  ['client/src/writing/WritingHomePage.jsx', 'Writing home dashboard combines prompts, records, and entry cards pending section extraction.'],
  ['client/src/writing/WritingProgressPage.jsx', 'Writing progress page pending chart, summary, and records extraction.'],
  ['client/src/writing/WritingRefineSentencePage.jsx', 'Sentence refinement workflow pending step component extraction.'],
  ['client/src/writing/WritingRefineStructurePage.jsx', 'Structure refinement workflow pending step component extraction.'],
  ['client/src/writing/core/AssignmentPanel.jsx', 'Writing assignment source panel pending further extraction.'],
  ['client/src/writing/core/AssignmentPanelSections.jsx', 'Assignment panel sections pending source, class, and task subsection extraction.'],
  ['client/src/writing/core/submissionActions.js', 'Writing submission actions pending upload, validation, and API extraction.'],
  ['client/src/writing/core/submissionActions.test.js', 'Writing submission action regression suite pending fixture/helper extraction.'],
  ['client/src/writing/core/useWritingDraft.js', 'Writing draft persistence and recovery logic pending storage and validation split.'],
  ['client/src/writing/core/WritingEditorPanel.jsx', 'Writing editor panel pending source selector and editor controls extraction.'],
  ['client/src/writing/core/writingPrompts.js', 'Writing prompt catalog and helpers pending content/runtime separation.'],
  ['client/src/writing/records/useWritingRecordsModel.test.jsx', 'Writing records model regression suite pending fixture helper extraction.'],
  ['client/src/writing/records/useWritingRecordsModel.js', 'Writing records model pending filters, pagination, and feedback state split.'],
  ['client/src/writing/records/WritingHistoryFeedbackPanel.jsx', 'Writing history feedback panel pending summary/detail section extraction.'],
  ['client/src/writing/core/writingFeedback.js', 'Client feedback normalization and repair utilities pending module split.'],
  ['server/services/adminControlRepository.js', 'Admin control repository pending operation-specific repository extraction.'],
  ['server/services/adminControlService.js', 'Admin control service pending account, setting, and log action split.'],
  ['server/services/adminQuestionBankService.js', 'Admin question bank service combines metadata, validation, import, and mutation flows pending domain split.'],
  ['server/services/assignmentSubmissionRowsService.js', 'Assignment submission rows query mapper pending filter and row-mapping extraction.'],
  ['server/services/authService.js', 'Auth service combines credential, code-login, and reset flows pending domain split.'],
  ['server/services/batchGradingService.js', 'Batch grading service orchestration pending repository/runtime extraction follow-up.'],
  ['server/services/batchGradingRuntimeService.js', 'Batch grading runtime service pending worker loop and lifecycle extraction.'],
  ['server/services/campService.js', 'Camp service combines course catalog, enrollment, redemption, and teacher content operations pending domain split.'],
  ['server/routes/adminControl.js', 'Admin control route module combines settings, question bank, budget, and integration endpoints pending route split.'],
  ['server/routes/camp.js', 'Camp route module combines public learning, redemption, and teacher management endpoints pending route split.'],
  ['server/routes/grammar.js', 'Grammar route module combines analysis, quiz, records, and assignment endpoints pending route split.'],
  ['server/services/asrRealtimeService.js', 'ASR realtime service combines connection guards, websocket protocol, and upstream relay pending runtime split.'],
  ['server/services/grammar/analyzerService.js', 'Grammar analyzer service pending parser stages and marker rules extraction.'],
  ['server/services/grammar/assignmentService.js', 'Grammar assignment service combines assignment lifecycle and submission progress pending domain split.'],
  ['server/services/listeningProgressService.js', 'Listening progress service combines validation, authoritative scoring, dedupe, and assignment completion pending scorer module split.'],
  ['server/services/phonetics/annotatorService.js', 'Phonetics annotator service combines AI parsing, deterministic speech marks, and response validation pending analyzer/rules split.'],
  ['server/services/parentService.js', 'Parent service combines binding, overview, child progress, and entitlement queries pending feature split.'],
  ['server/services/paymentOrderService.js', 'Payment order service combines order lifecycle, membership, and entitlement effects pending module split.'],
  ['server/services/pointsService.js', 'Points, entitlement, and membership accounting service pending domain module split.'],
  ['server/services/questionAnalysisPromptService.js', 'Question analysis prompt service pending type-specific prompt extraction.'],
  ['server/services/reading/practiceService.js', 'Reading practice service combines catalog, quiz generation, records, and stats pending domain split.'],
  ['server/services/teacherDataService.js', 'Teacher data service combines class overview and module progress aggregation pending query split.'],
  ['server/utils/feedbackSchema.js', 'Feedback schema repair utilities pending per-feedback-type extraction.'],
  ['shared/regression/singleFeedbackSamples.js', 'Single feedback regression samples intentionally grouped as shared fixtures.'],
  ['shared/regression/singleFeedbackSnapshots.js', 'Single feedback regression snapshots intentionally grouped as shared fixtures.'],
  ['shared/reading/readingPassageBank.js', 'Reading passage and question seed bank intentionally grouped as shared static content.'],
  ['client/src/components/workbench/AssignmentDetailPanel.jsx', 'Workbench detail panel still being decomposed into sub-panels.'],
  ['client/src/components/writing/AssignmentPanel.jsx', 'Writing assignment source panel pending further extraction.'],
  ['client/src/components/writing/submissionActions.js', 'Submission flow orchestration still being broken into smaller actions.'],
]);

const lineCountBudgets = new Map([
  ['client/src/grammar/grammarCourseContent.js', 2679],
  ['client/src/components/admin/AdminQuestionBankPanel.jsx', 1506],
  ['server/services/adminQuestionBankService.js', 1437],
  ['server/services/pointsService.js', 1232],
  ['client/src/components/FeedbackView/analysis-types/continuation/QuestionAnalysis.jsx', 1056],
  ['client/src/components/account/SubscriptionTab.jsx', 991],
  ['client/src/reading/ReadingPracticePage.jsx', 978],
  ['client/src/components/FeedbackView/feedbackPrint.js', 970],
  ['client/src/components/FeedbackView/FeedbackDeepReviewBlocks.jsx', 941],
  ['server/services/campService.js', 929],
  ['client/src/listening/ListeningPage.jsx', 415],
]);

function toRepoPath(targetPath) {
  return path.relative(rootDir, targetPath).split(path.sep).join('/');
}

function shouldCheckFile(filePath) {
  return ['.js', '.jsx', '.mjs', '.cjs'].includes(path.extname(filePath));
}

async function collectFiles(dirPath, results = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(fullPath, results);
      continue;
    }
    if (entry.isFile() && shouldCheckFile(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

async function countLines(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  if (!content) return 0;
  return content.split('\n').length;
}

function printGroup(title, rows) {
  if (!rows.length) return;
  console.log(`\n${title}`);
  rows.forEach(({ repoPath, lineCount, note }) => {
    const suffix = note ? ` - ${note}` : '';
    console.log(`  ${String(lineCount).padStart(4, ' ')}  ${repoPath}${suffix}`);
  });
}

const files = [];
for (const root of sourceRoots) {
  const fullRoot = path.join(rootDir, root);
  try {
    const stat = await fs.stat(fullRoot);
    if (stat.isDirectory()) {
      files.push(...await collectFiles(fullRoot));
    }
  } catch {
    // Skip missing roots so the script stays robust across partial checkouts.
  }
}

const records = [];
for (const filePath of files) {
  const repoPath = toRepoPath(filePath);
  const lineCount = await countLines(filePath);
  if (lineCount <= warningLineCount) continue;
  records.push({
    repoPath,
    lineCount,
    note: allowedOversizedFiles.get(repoPath) || '',
  });
}

records.sort((left, right) => right.lineCount - left.lineCount || left.repoPath.localeCompare(right.repoPath));

const warnings = records.filter((record) => record.lineCount > warningLineCount && record.lineCount <= explainLineCount && !allowedOversizedFiles.has(record.repoPath));
const trackedWarnings = records.filter((record) => record.lineCount > warningLineCount && record.lineCount <= explainLineCount && allowedOversizedFiles.has(record.repoPath));
const explanations = records.filter((record) => record.lineCount > explainLineCount && record.lineCount <= failLineCount && allowedOversizedFiles.has(record.repoPath));
const unexplained = records.filter((record) => record.lineCount > explainLineCount && record.lineCount <= failLineCount && !allowedOversizedFiles.has(record.repoPath));
const oversizedAllowed = records.filter((record) => record.lineCount > failLineCount && allowedOversizedFiles.has(record.repoPath));
const oversizedBlocked = records.filter((record) => record.lineCount > failLineCount && !allowedOversizedFiles.has(record.repoPath));
const budgetBreaches = records
  .filter((record) => lineCountBudgets.has(record.repoPath))
  .map((record) => ({ ...record, budget: lineCountBudgets.get(record.repoPath) + growthBudgetSlack }))
  .filter((record) => record.lineCount > record.budget);

console.log('File size guard');
console.log(`  warning  > ${warningLineCount} lines`);
console.log(`  explain  > ${explainLineCount} lines`);
console.log(`  fail     > ${failLineCount} lines unless allowlisted`);
console.log(`  growth   top oversized files may grow by ${growthBudgetSlack} lines max`);

printGroup('Tracked warning files', trackedWarnings);
printGroup('Explained files', explanations);
printGroup('Allowed oversized files', oversizedAllowed);

if (budgetBreaches.length) {
  printGroup('Growth budget breaches', budgetBreaches.map((record) => ({
    ...record,
    note: `${record.note} Current budget ${record.budget} lines.`,
  })));
  process.exitCode = 1;
} else if (warnings.length) {
  printGroup('Missing warning explanations', warnings);
  process.exitCode = 1;
} else if (unexplained.length) {
  printGroup('Missing explanations', unexplained);
  process.exitCode = 1;
} else if (oversizedBlocked.length) {
  printGroup('Blocked oversized files', oversizedBlocked);
  process.exitCode = 1;
} else if (records.length) {
  console.log('\nNo blocked oversized files found.');
} else {
  console.log('\nNo files crossed the warning threshold.');
}
