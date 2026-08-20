import {
  createFallbackQuestionAnalysis,
  createPendingQuestionAnalysis,
  generateQuestionAnalysis,
} from './questionAnalysisClient.js';
import {
  clearFeedbackGeneration,
  createLoadingFeedback,
  extractDisplayFeedbackFromWriting,
  withFeedbackGeneration,
} from './writingFeedback.js';
import { feedbackAPI, questionsAPI, writingsAPI } from '../../api/index.js';

function sameId(left, right) {
  return String(left) === String(right);
}

function deriveTaskWritingType(taskContext) {
  const assignment = taskContext?.assignment || {};
  if (assignment?.writingType) return assignment.writingType;
  if (assignment?.selectedType) return assignment.selectedType;
  if (Array.isArray(assignment?.selectedTypeMix) && assignment.selectedTypeMix.length) {
    const sorted = [...assignment.selectedTypeMix].sort((left, right) => Number(right?.percentage || 0) - Number(left?.percentage || 0));
    return sorted[0]?.type || '';
  }
  return '';
}

function attachPendingQuestionAnalysis(feedback, pendingQuestionAnalysis) {
  if (!feedback) return feedback;
  return {
    ...clearFeedbackGeneration(feedback),
    questionAnalysis: pendingQuestionAnalysis,
    analysisMeta: {
      ...(feedback.analysisMeta || {}),
      status: 'pending',
      updatedAt: Date.now(),
    },
  };
}

function mergeQuestionAnalysisState(feedback, nextQuestionAnalysis, nextStatus = null) {
  if (!feedback) return feedback;
  return {
    ...feedback,
    questionAnalysis: nextQuestionAnalysis,
    analysisMeta: {
      ...(feedback.analysisMeta || {}),
      status: nextStatus || nextQuestionAnalysis?.status || feedback?.analysisMeta?.status || null,
      updatedAt: Date.now(),
    },
  };
}


function getSubmissionError({ image, text, customMax, maxOpt }) {
  if (!image && text.trim().length < 20) return '请至少输入20个字符或上传图片';
  if (maxOpt === 'custom' && !customMax) return '请输入自定义满分分值';
  return '';
}

function buildSubmissionContext(state) {
  const taskLockedType = deriveTaskWritingType(state.taskContext);
  const finalType = state.manualType || taskLockedType || state.aiAnalysis?.type || 'general';

  return {
    ...state,
    finalType,
    finalThemes: state.aiAnalysis?.themes || [],
    versionOfWritingId: state.versionOfWritingId || null,
  };
}

function resolveTargetUser({ user, selectedStudent, studentsInClass }) {
  const fallback = {
    targetUserId: user.id,
    targetUserName: user.realName || user.name,
    targetClassName: user.className || '',
  };

  if (user.role !== 'teacher' || !selectedStudent) return fallback;

  const student = studentsInClass.find((item) => sameId(item.id, selectedStudent));
  return student ? {
    targetUserId: student.id,
    targetUserName: student.realName || student.name,
    targetClassName: student.className || '',
  } : fallback;
}

function buildWritingPayload({ context, user, targetUser, max, words }) {
  const isTeacherSubmittingForStudent = user.role === 'teacher' && Boolean(context.selectedStudent);

  return {
    userId: isTeacherSubmittingForStudent ? targetUser.targetUserId : null,
    assignmentId: context.taskContext?.assignmentId || null,
    questionId: context.selectedQId || null,
    writingTitle: context.writingTitle || null,
    promptText: context.promptText || null,
    selectedType: context.finalType,
    selectedThemes: context.finalThemes,
    textSnippet: context.text.slice(0, 300),
    fullText: context.text,
    wordCount: words,
    maxScore: max,
    image: context.image,
    source: context.taskContext ? 'homework' : (context.source || 'self'),
    skipQuestionAnalysisQueue: true,
    versionOfWritingId: context.versionOfWritingId || null,
  };
}

function maybeCreateQuestion({ context, questions, onQuestionsChange }) {
  if (context.selectedQId || !context.promptText.trim()) return;

  void (async () => {
    try {
      const newQuestion = await questionsAPI.create({
        title: context.writingTitle || `${context.promptText.slice(0, 40)}…`,
        type: context.finalType,
        themes: context.finalThemes,
        promptText: context.promptText,
      });
      onQuestionsChange([...questions, newQuestion]);
    } catch {
      // ignore question auto-create failures
    }
  })();
}

async function persistQuestionAnalysis(writingId, questionAnalysis, extraMeta = {}) {
  const updatedWriting = await writingsAPI.updateFeedback(writingId, {
    questionAnalysis,
    analysisMeta: {
      status: questionAnalysis?.status,
      queueState: 'idle',
      ...extraMeta,
    },
  });
  return extractDisplayFeedbackFromWriting(updatedWriting);
}

function beginQuestionAnalysis({ writingRecord, context, pendingQuestionAnalysis, setFeedback }) {
  setFeedback((current) => attachPendingQuestionAnalysis(
    current || extractDisplayFeedbackFromWriting(writingRecord),
    pendingQuestionAnalysis
  ));

  void (async () => {
    try {
      const questionAnalysis = await generateQuestionAnalysis({
        type: context.finalType,
        questionId: context.selectedQId || null,
        title: context.writingTitle,
        promptText: context.promptText,
        studentText: context.text,
        aiAnalysis: context.aiAnalysis,
        onPartial: (partialQuestionAnalysis) => {
          setFeedback((current) => mergeQuestionAnalysisState(
            current,
            {
              ...pendingQuestionAnalysis,
              ...partialQuestionAnalysis,
            },
            'pending'
          ));
        },
      });

      setFeedback((current) => mergeQuestionAnalysisState(current, questionAnalysis));
      if (!writingRecord?.id) return;
      const serverFeedback = await persistQuestionAnalysis(writingRecord.id, questionAnalysis);
      if (serverFeedback) setFeedback(serverFeedback);
    } catch (analysisErr) {
      console.error('题目分析生成失败:', analysisErr.message);
      const failedQuestionAnalysis = createFallbackQuestionAnalysis(context.finalType, context.aiAnalysis);
      setFeedback((current) => mergeQuestionAnalysisState(
        current,
        failedQuestionAnalysis,
        failedQuestionAnalysis?.status
      ));
      if (!writingRecord?.id) return;
      const serverFeedback = await persistQuestionAnalysis(
        writingRecord.id,
        failedQuestionAnalysis,
        { errorCode: 'QUESTION_ANALYSIS_CLIENT_FALLBACK' }
      );
      if (serverFeedback) setFeedback(serverFeedback);
    }
  })();
}

// Poll GET /writings/:id/feedback/status until quick feedback is ready, failed, or timeout.
// Returns { writing } on success, { error } on failure, or { aborted: true } if the signal fires.
async function pollForQuickFeedback({ writingId, loadingFeedback, setFeedback, signal }) {
  const MAX_POLLS = 48; // ~2 minutes at 2.5 s intervals
  const POLL_INTERVAL_MS = 2500;

  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    if (signal?.aborted) return { aborted: true };

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    if (signal?.aborted) return { aborted: true };

    try {
      const statusData = await feedbackAPI.getStatus(writingId);

      setFeedback((current) => withFeedbackGeneration(
        current || loadingFeedback,
        Math.min(85, 12 + attempt * 2),
        '正在生成基础批改',
      ));

      if (statusData?.ready?.quick) {
        const writing = await writingsAPI.get(writingId);
        if (writing?.feedback) return { writing };
      }

      if (String(statusData?.quickFeedbackStatus || '').toLowerCase() === 'failed') {
        return { error: '基础批改生成失败，请稍后在学习记录中重试。' };
      }
    } catch {
      // ignore individual poll errors and keep retrying
    }
  }

  return { error: '批改等待超时，请稍后在学习记录中查看结果。' };
}

function handleReadyWriting({ readyWriting, pendingQuestionAnalysis, setFeedback, context }) {
  const serverFeedback = extractDisplayFeedbackFromWriting(readyWriting);
  if (serverFeedback) {
    setFeedback(attachPendingQuestionAnalysis(serverFeedback, pendingQuestionAnalysis));
  }
  beginQuestionAnalysis({
    writingRecord: readyWriting,
    context,
    pendingQuestionAnalysis,
    setFeedback,
  });
}

function streamQuickFeedback({ writingId, loadingFeedback, setFeedback, signal }) {
  return new Promise((resolve) => {
    let chunkCount = 0;
    let settled = false;

    function settle(result) {
      if (settled) return;
      settled = true;
      resolve(result);
    }

    signal?.addEventListener('abort', () => settle({ success: false, error: null }), { once: true });

    feedbackAPI.streamQuick(
      writingId,
      (data) => {
        if (data.done) return;
        chunkCount += 1;
        setFeedback((current) => withFeedbackGeneration(
          current || loadingFeedback,
          Math.min(88, 20 + chunkCount * 2),
          '正在生成快速反馈'
        ));
      },
      async () => {
        try {
          let updatedWriting = await writingsAPI.get(writingId);
          // DB write may lag slightly behind SSE completion; retry once if feedback is absent.
          if (!updatedWriting?.feedback) {
            await new Promise((r) => setTimeout(r, 1500));
            updatedWriting = await writingsAPI.get(writingId);
          }
          settle({ success: true, writing: updatedWriting });
        } catch (err) {
          settle({ success: false, error: err.message });
        }
      },
      (err) => {
        settle({ success: false, error: typeof err === 'string' ? err : '快速反馈生成失败' });
      },
      { signal },
    );
  });
}

async function handleStudentQuickFeedback({ savedWriting, context, loadingFeedback, setFeedback, setLoading, setError, signal }) {
  await feedbackAPI.requestQuick(savedWriting.id);
  setLoading(false);
  setFeedback(withFeedbackGeneration(loadingFeedback, 12, '作文已提交，正在生成批改'));

  const pendingQuestionAnalysis = createPendingQuestionAnalysis(context.finalType, context.aiAnalysis);
  const pollResult = await pollForQuickFeedback({
    writingId: savedWriting.id,
    loadingFeedback,
    setFeedback,
    signal,
  });

  if (pollResult.aborted) {
    setFeedback((current) => clearFeedbackGeneration(current));
    return;
  }
  if (pollResult.writing) {
    handleReadyWriting({ readyWriting: pollResult.writing, pendingQuestionAnalysis, setFeedback, context });
    return;
  }

  setError(pollResult.error || '批改生成失败，请稍后在学习记录中重试。');
  setFeedback((current) => clearFeedbackGeneration(current));
}

async function handleTeacherQuickFeedback({ savedWriting, context, loadingFeedback, setFeedback, setLoading, setError, signal }) {
  const pendingQuestionAnalysis = createPendingQuestionAnalysis(context.finalType, context.aiAnalysis);

  setLoading(false);
  setFeedback((current) => withFeedbackGeneration(
    current || loadingFeedback,
    18,
    '作文已提交，正在生成快速反馈'
  ));

  const { writing: readyWriting, error: streamError } = await streamQuickFeedback({
    writingId: savedWriting.id,
    loadingFeedback,
    setFeedback,
    signal,
  });

  if (readyWriting?.feedback) {
    handleReadyWriting({ readyWriting, pendingQuestionAnalysis, setFeedback, context });
    return;
  }

  setError(streamError || '快速反馈生成失败，你可以稍后在学习记录中重试查看。');
  setFeedback((current) => clearFeedbackGeneration(current));
}


export function createSubmissionActions({
  user,
  questions,
  studentsInClass,
  onQuestionsChange,
  onWritingSaved,
  onRequireAuth,
  guestMode,
  getState,
  setError,
  setLoading,
  setFeedback,
  setStreamText,
  getAbortController,
  setAbortController,
}) {
  const submit = async ({ max, words }) => {
    const state = getState();
    const submissionError = getSubmissionError(state);
    if (submissionError) {
      setError(submissionError);
      return;
    }

    if (guestMode || !user) {
      onRequireAuth?.({ mode: 'login' });
      return;
    }

    const context = buildSubmissionContext(state);

    // Cancel any in-flight supplemental polling from a previous submission
    getAbortController?.()?.abort();
    const controller = new AbortController();
    setAbortController?.(controller);
    const { signal } = controller;

    setError('');
    setLoading(true);
    setFeedback(null);
    setStreamText('');

    try {
      const loadingFeedback = createLoadingFeedback({
        type: context.finalType,
        aiAnalysis: context.aiAnalysis,
        maxScore: max,
        progress: 6,
        stage: '正在提交作文',
      });
      setFeedback(loadingFeedback);

      const targetUser = resolveTargetUser({ user, selectedStudent: context.selectedStudent, studentsInClass });
      const savedWriting = await writingsAPI.create(buildWritingPayload({ context, user, targetUser, max, words }));
      onWritingSaved?.(savedWriting);
      maybeCreateQuestion({ context, questions, onQuestionsChange });

      if (user.role === 'student') {
        await handleStudentQuickFeedback({ savedWriting, context, loadingFeedback, setFeedback, setLoading, setError, signal });
        return;
      }

      // Teachers: stream feedback directly. Skip requestQuick to avoid a
      // second parallel AI call that would race against the SSE stream and
      // overwrite the DB result unpredictably.
      await handleTeacherQuickFeedback({ savedWriting, context, loadingFeedback, setFeedback, setLoading, setError, signal });
    } catch (error) {
      setError(`批改失败：${error.message}`);
      setFeedback(null);
    } finally {
      setLoading(false);
      setStreamText('');
    }
  };

  return { submit };
}
