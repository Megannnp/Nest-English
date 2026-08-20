import { runVersionedMigrations } from './runner.js';
import migration001BootstrapMarker from './versions/001-bootstrap-marker.js';
import migration002NormalizeQuestionCreatedAt from './versions/002-normalize-question-created-at.js';
import migration003EnsureUserColumns from './versions/003-ensure-user-columns.js';
import migration004EnsureQuestionMetadataColumns from './versions/004-ensure-question-metadata-columns.js';
import migration005EnsureWritingTaskRuntimeColumns from './versions/005-ensure-writing-task-runtime-columns.js';
import migration006EnsureWritingAssignmentColumns from './versions/006-ensure-writing-assignment-columns.js';
import migration007BackfillUserAccountCodes from './versions/007-backfill-user-account-codes.js';
import migration008BackfillQuestionMetadata from './versions/008-backfill-question-metadata.js';
import migration009EnsureStudentRoster from './versions/009-ensure-student-roster.js';
import migration010EnsureContinuationStarters from './versions/010-ensure-continuation-starters.js';
import migration011EnsureWritingRoster from './versions/011-ensure-writing-roster.js';
import migration012EnsureAssignmentClassIds from './versions/012-ensure-assignment-class-ids.js';
import migration013EnsureWritingSubmittedByTeacher from './versions/013-ensure-writing-submitted-by-teacher.js';
import migration014EnsureBatchGradingJobs from './versions/014-ensure-batch-grading-jobs.js';
import migration015Announcements from './versions/015_announcements.js';
import migration016AddIsAdmin from './versions/016_add_is_admin.js';
import migration017EnsureUserDisabledColumns from './versions/017-ensure-user-disabled-columns.js';
import migration018AdminControlCenter from './versions/018-admin-control-center.js';
import migration019AiBudgetUsageEvents from './versions/019-ai-budget-usage-events.js';
import migration020BatchGradingStateMachine from './versions/020-batch-grading-state-machine.js';
import migration021EnsureTestDataFlags from './versions/021-ensure-test-data-flags.js';
import migration022AddWritingsCreatedAtIndex from './versions/022-add-writings-created-at-index.js';
import migration023GrammarPracticeRecords from './versions/023-grammar-practice-records.js';
import migration024LearningEvents from './versions/024-learning-events.js';
import migration025PhoneFirstAuth from './versions/025-phone-first-auth.js';
import migration026PointsSystem from './versions/026-points-system.js';
import migration027EntitlementBalances from './versions/027-entitlement-balances.js';
import migration028PaymentOrders from './versions/028-payment-orders.js';
import migration029MembershipAccounts from './versions/029-membership-accounts.js';
import migration030EntitlementBuckets from './versions/030-entitlement-buckets.js';
import migration031GrammarAssignments from './versions/031-grammar-assignments.js';
import migration032ReadingPracticeRecords from './versions/032-reading-practice-records.js';
import migration033ReadingAnalyses from './versions/033-reading-analyses.js';
import migration034GrammarPracticeRecordIndexes from './versions/034-grammar-practice-record-indexes.js';
import migration035GrammarCourseProgress from './versions/035-grammar-course-progress.js';
import migration036NormalizeLegacyEntitlementBucketIds from './versions/036-normalize-legacy-entitlement-bucket-ids.js';
import migration037ModuleAssignments from './versions/037-module-assignments.js';
import migration038ModuleAssignmentSubmissions from './versions/038-module-assignment-submissions.js';
import migration039WritingVersionHistory from './versions/039-writing-version-history.js';
import migration040NestCamp from './versions/040-nest-camp.js';
import migration041ListeningProgressRecords from './versions/041-listening-progress-records.js';
import migration042VocabularyProgressRecords from './versions/042-vocabulary-progress-records.js';
import migration043PhoneticsProgressRecords from './versions/043-phonetics-progress-records.js';
import migration044PendingPointRewards from './versions/044-pending-point-rewards.js';
import migration045SystemQuestionDisabled from './versions/045-system-question-disabled.js';
import migration046UserMessagesParentRole from './versions/046-user-messages-parent-role.js';
import migration047AnnouncementMessageStringUserIds from './versions/047-announcement-message-string-user-ids.js';
import migration048WritingsVersionUnique from './versions/048-writings-version-unique.js';
import migration049ParentStudentLinks from './versions/049-parent-student-links.js';
import migration050QuestionBankFoundation from './versions/050-question-bank-foundation.js';
import migration051QuestionBankConstraints from './versions/051-question-bank-constraints.js';
import migration052ParentBindingCodes from './versions/052-parent-binding-codes.js';
import migration053LearningFavoritesAndReadingCourseProgress from './versions/053-learning-favorites-and-reading-course-progress.js';
import migration054UserMessagesGuestRole from './versions/054-user-messages-guest-role.js';
import migration055WritingAndAssignmentTaskStatusIndexes from './versions/055-writing-and-assignment-task-status-indexes.js';
import migration056VocabularyCourseProgress from './versions/056-vocabulary-course-progress.js';
import migration057SpeakingProgressRecords from './versions/057-speaking-progress-records.js';
import migration058VocabContent from './versions/058-vocab-content.js';
import migration059PlanDiagnosisLeads from './versions/059-plan-diagnosis-leads.js';
import migration060ExamImportJobs from './versions/060-exam-import-jobs.js';
import migration061ExamImportDedupeIndex from './versions/061-exam-import-dedupe-index.js';

export function runBootstrapVersionedMigrations(pool) {
  return runVersionedMigrations(pool, [
    migration001BootstrapMarker,
    migration002NormalizeQuestionCreatedAt,
    migration003EnsureUserColumns,
    migration004EnsureQuestionMetadataColumns,
    migration005EnsureWritingTaskRuntimeColumns,
    migration006EnsureWritingAssignmentColumns,
    migration007BackfillUserAccountCodes,
    migration008BackfillQuestionMetadata,
    migration009EnsureStudentRoster,
    migration010EnsureContinuationStarters,
    migration011EnsureWritingRoster,
    migration012EnsureAssignmentClassIds,
    migration013EnsureWritingSubmittedByTeacher,
    migration014EnsureBatchGradingJobs,
    migration015Announcements,
    migration016AddIsAdmin,
    migration017EnsureUserDisabledColumns,
    migration018AdminControlCenter,
    migration019AiBudgetUsageEvents,
    migration020BatchGradingStateMachine,
    migration021EnsureTestDataFlags,
    migration022AddWritingsCreatedAtIndex,
    migration023GrammarPracticeRecords,
    migration024LearningEvents,
    migration025PhoneFirstAuth,
    migration026PointsSystem,
    migration027EntitlementBalances,
    migration028PaymentOrders,
    migration029MembershipAccounts,
    migration030EntitlementBuckets,
    migration031GrammarAssignments,
    migration032ReadingPracticeRecords,
    migration033ReadingAnalyses,
    migration034GrammarPracticeRecordIndexes,
    migration035GrammarCourseProgress,
    migration036NormalizeLegacyEntitlementBucketIds,
    migration037ModuleAssignments,
    migration038ModuleAssignmentSubmissions,
    migration039WritingVersionHistory,
    migration040NestCamp,
    migration041ListeningProgressRecords,
    migration042VocabularyProgressRecords,
    migration043PhoneticsProgressRecords,
    migration044PendingPointRewards,
    migration045SystemQuestionDisabled,
    migration046UserMessagesParentRole,
    migration047AnnouncementMessageStringUserIds,
    migration048WritingsVersionUnique,
    migration049ParentStudentLinks,
    migration050QuestionBankFoundation,
    migration051QuestionBankConstraints,
    migration052ParentBindingCodes,
    migration053LearningFavoritesAndReadingCourseProgress,
    migration054UserMessagesGuestRole,
    migration055WritingAndAssignmentTaskStatusIndexes,
    migration056VocabularyCourseProgress,
    migration057SpeakingProgressRecords,
    migration058VocabContent,
    migration059PlanDiagnosisLeads,
    migration060ExamImportJobs,
    migration061ExamImportDedupeIndex,
  ]);
}
