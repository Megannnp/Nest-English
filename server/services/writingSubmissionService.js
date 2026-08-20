import {
  getAssignmentTaskByAssignmentAndStudent,
  markAssignmentTaskSubmitted,
  markAssignmentTaskGrading,
} from './assignmentService.js';
import { recordLearningEvent } from './learningEventService.js';
import {
  queueQuestionAnalysisForWriting,
  shouldAutoQueueQuestionAnalysis,
} from './questionAnalysisQueueService.js';
import {
  attachLatestQuestionAnalysisTask,
  mapWritingDetail,
} from './writingQueryService.js';
import {
  assertTeacherCanManageStudent,
} from './writingService.js';
import db from '../db/database.js';
import { NotFoundError, ValidationError } from '../utils/appError.js';
import { nanoid } from '../utils/nanoid.js';
import { deleteFromOSS, uploadBase64ToOSS } from '../utils/oss.js';
import {
  assertPositiveInteger,
  normalizeStringArray,
  optionalTrimmedString,
} from '../utils/routeValidation.js';
import {
  createDraftFeedback,
  serializeFeedback,
} from '../utils/writingFeedback.js';

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const MAX_SCORE_LIMIT = 150;

function _buildPersistedUserFields(targetUser, user) {
  return {
    userName: targetUser.real_name || user.name || '',
    className: targetUser.class_name || '',
    submittedByTeacher: user.role === 'teacher'
      ? JSON.stringify({ teacherId: user.id, teacherName: user.realName || user.name || '教师' })
      : null,
  };
}

async function _handleImageUpload(image) {
  if (!image?.base64 || !image?.mediaType) return null;
  if (!ALLOWED_IMAGE_MIME_TYPES.has(image.mediaType)) {
    throw new ValidationError(`不支持的图片类型: ${image.mediaType}`);
  }
  const ossUrl = await uploadBase64ToOSS(image.base64, image.mediaType, 'writings');
  return JSON.stringify({ ossUrl, mediaType: image.mediaType });
}

async function _maybeQueueAnalysis(row, normalizedSelectedType, normalizedFullText, shouldSkip) {
  if (shouldSkip || !row) return row;
  if (!shouldAutoQueueQuestionAnalysis({ selectedType: normalizedSelectedType, fullText: normalizedFullText })) return row;
  await queueQuestionAnalysisForWriting(row, { clearLastError: true, overview: '题目分析生成中，请稍候查看。' });
  return db.prepare('SELECT * FROM writings WHERE id = ?').get(row.id);
}

async function _resolveVersionInfo(newId, versionOfWritingId, targetUserId) {
  if (!versionOfWritingId) return { versionGroupId: newId, previousWritingId: null };
  const originRow = await db.prepare(
    'SELECT id, user_id, version_group_id FROM writings WHERE id = ?'
  ).get(versionOfWritingId);
  if (!originRow || originRow.user_id !== targetUserId) throw new NotFoundError('原版作文不存在');
  const versionGroupId = originRow.version_group_id || originRow.id;
  return { versionGroupId, previousWritingId: versionOfWritingId };
}

export async function createWritingSubmission({ user, payload }) {
  const {
    userId,
    questionId,
    writingTitle,
    promptText,
    selectedType,
    selectedThemes,
    textSnippet,
    fullText,
    wordCount,
    maxScore,
    image,
    source,
    assignmentId,
    skipQuestionAnalysisQueue,
    versionOfWritingId,
  } = payload;

  const rawMaxScore = assertPositiveInteger(maxScore, 'maxScore 必须是正整数');
  if (rawMaxScore > MAX_SCORE_LIMIT) {
    throw new ValidationError(`maxScore 不能超过 ${MAX_SCORE_LIMIT}`);
  }
  const normalizedMaxScore = rawMaxScore;
  const normalizedSelectedType = optionalTrimmedString(selectedType, 32);
  const normalizedThemes = normalizeStringArray(selectedThemes, { maxItems: 10, itemMaxLength: 30 });
  const normalizedWritingTitle = optionalTrimmedString(writingTitle, 200);
  const normalizedPromptText = optionalTrimmedString(promptText, 10000);
  const normalizedTextSnippet = optionalTrimmedString(textSnippet, 500);
  const normalizedFullText = optionalTrimmedString(fullText, 20000);
  const normalizedSource = optionalTrimmedString(source, 32) || 'self';
  const shouldSkipQuestionAnalysisQueue = Boolean(skipQuestionAnalysisQueue);

  let targetUserId = user.id;
  if (user.role === 'teacher' && userId) {
    await assertTeacherCanManageStudent(user.id, userId, '无权限为该学生提交作文');
    targetUserId = userId;
  }

  const normalizedAssignmentId = optionalTrimmedString(assignmentId, 64);
  if (normalizedAssignmentId) {
    const assignmentTask = await getAssignmentTaskByAssignmentAndStudent(normalizedAssignmentId, targetUserId);
    if (!assignmentTask) {
      throw new NotFoundError('任务不存在或未分配给当前学生');
    }
  }

  const targetUser = await db.prepare(
    'SELECT id, real_name, class_name FROM users WHERE id = ?'
  ).get(targetUserId);
  if (!targetUser) {
    throw new NotFoundError('写作归属用户不存在');
  }

  const { userName: persistedUserName, className: persistedClassName, submittedByTeacher: persistedSubmittedByTeacher } =
    _buildPersistedUserFields(targetUser, user);

  const id = nanoid();
  const now = Date.now();
  const imageData = await _handleImageUpload(image);

  const normalizedVersionOfWritingId = optionalTrimmedString(versionOfWritingId, 64);
  const { versionGroupId, previousWritingId } = await _resolveVersionInfo(id, normalizedVersionOfWritingId, targetUserId);

  // version_no is computed atomically inside the INSERT via subquery to avoid
  // the SELECT MAX + INSERT race condition (protected by UNIQUE on version_group_id+version_no).
  try {
    await db.prepare(`
      INSERT INTO writings
        (id, user_id, user_name, class_name, question_id, assignment_id, writing_title,
         prompt_text, selected_type, selected_themes, text_snippet, full_text, word_count,
         max_score, feedback, teacher_comment, image_data, submitted_by_teacher, source,
         version_group_id, version_no, previous_writing_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?,
        (SELECT COALESCE(MAX(w.version_no), 0) + 1 FROM (SELECT version_no FROM writings WHERE version_group_id = ?) AS w),
        ?, ?)
    `).run(
      id,
      targetUserId,
      persistedUserName,
      persistedClassName,
      questionId || null,
      normalizedAssignmentId,
      normalizedWritingTitle,
      normalizedPromptText,
      normalizedSelectedType,
      JSON.stringify(normalizedThemes),
      normalizedTextSnippet,
      normalizedFullText,
      wordCount || 0,
      normalizedMaxScore,
      serializeFeedback(createDraftFeedback(normalizedSelectedType)),
      null,
      imageData,
      persistedSubmittedByTeacher,
      normalizedSource,
      versionGroupId,
      versionGroupId,
      previousWritingId,
      now
    );
  } catch (err) {
    if (imageData) {
      const uploadedImage = JSON.parse(imageData);
      await deleteFromOSS(uploadedImage.ossUrl);
    }
    throw err;
  }

  if (normalizedAssignmentId) {
    await markAssignmentTaskSubmitted({ assignmentId: normalizedAssignmentId, studentId: targetUserId, writingId: id });
    await markAssignmentTaskGrading({ assignmentId: normalizedAssignmentId, studentId: targetUserId, writingId: id });
  }

  let row = await db.prepare('SELECT * FROM writings WHERE id = ?').get(id);
  row = await _maybeQueueAnalysis(row, normalizedSelectedType, normalizedFullText, shouldSkipQuestionAnalysisQueue);

  // Fire-and-forget cross-module event — never awaited, failures are swallowed.
  void recordLearningEvent({
    userId: targetUserId,
    module: 'writing',
    eventType: 'submission',
    metadata: {
      writingId: id,
      selectedType: normalizedSelectedType,
      wordCount: wordCount || 0,
      source: normalizedSource,
    },
  });

  const rowWithTask = await attachLatestQuestionAnalysisTask(row);
  return mapWritingDetail(rowWithTask);
}
