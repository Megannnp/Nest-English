import { useCallback, useEffect, useRef, useState } from 'react';

import { aiAPI, classesAPI } from '../../api/index.js';

function _buildDraftSource(initialDraft, user, taskContext) {
  return initialDraft.source || (user?.role === 'teacher' ? 'teacher' : (taskContext ? 'homework' : 'self'));
}

function _buildDraftFieldValues(initialDraft, user, taskContext) {
  return {
    maxOpt: initialDraft.maxOpt || '15',
    customMax: initialDraft.customMax || '',
    selectedQId: initialDraft.selectedQId || '',
    aiAnalysis: initialDraft.aiAnalysis || null,
    manualType: initialDraft.manualType || '',
    promptText: initialDraft.promptText || '',
    writingTitle: initialDraft.writingTitle || '',
    text: initialDraft.text || '',
    image: initialDraft.image || null,
    images: Array.isArray(initialDraft.images) ? initialDraft.images : [],
    source: _buildDraftSource(initialDraft, user, taskContext),
    scoreTouched: Boolean(initialDraft.maxOpt || initialDraft.customMax),
    versionOfWritingId: initialDraft.versionOfWritingId || null,
  };
}

function _buildAiAnalysisFromQuestion(question) {
  return {
    type: question.type || 'general',
    theme: question.theme || (question.themes || [])[0] || '',
    themes: question.theme ? [question.theme] : (question.themes || []).slice(0, 1),
    confidence: 1,
    reason: '已关联题库中的现成题目',
  };
}

function sameId(left, right) {
  return String(left) === String(right);
}

function deriveTaskWritingType(assignment = {}) {
  if (assignment?.writingType) return assignment.writingType;
  if (assignment?.selectedType) return assignment.selectedType;
  if (Array.isArray(assignment?.selectedTypeMix) && assignment.selectedTypeMix.length) {
    const sorted = [...assignment.selectedTypeMix].sort((left, right) => Number(right?.percentage || 0) - Number(left?.percentage || 0));
    return sorted[0]?.type || '';
  }
  return '';
}

function isIeltsWritingType(type) {
  return ['ielts_task1', 'ielts_task2'].includes(String(type || '').trim().toLowerCase());
}

function inferScoreFromText(...parts) {
  const source = parts
    .map((item) => String(item || ''))
    .filter(Boolean)
    .join('\n');

  if (!source) return null;

  const patterns = [
    /满分\s*([1-9]\d{0,2})\s*分/iu,
    /总分\s*([1-9]\d{0,2})\s*分/iu,
    /total\s+score\s*[:：]?\s*([1-9]\d{0,2})/iu,
    /score\s*[:：]?\s*([1-9]\d{0,2})/iu,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    const value = Number(match?.[1] || 0);
    if (Number.isFinite(value) && value > 0) return String(value);
  }

  return null;
}

function _resolveAutoScore({ explicitScore, promptText, title }) {
  if (explicitScore != null && explicitScore !== '' && Number(explicitScore) > 0) {
    return String(Number(explicitScore));
  }
  return inferScoreFromText(promptText, title);
}

function getDraftIdentity(draft, hydrationKey) {
  if (hydrationKey != null && hydrationKey !== '') return `key:${String(hydrationKey)}`;
  if (!draft || typeof draft !== 'object') return null;

  const candidates = [draft.draftId, draft.id, draft.key, draft.sessionKey];
  const identity = candidates.find((value) => value != null && value !== '');

  return identity == null ? null : `draft:${String(identity)}`;
}

export function useWritingDraftModel({
  user,
  questions,
  preloadedQuestion,
  taskContext,
  initialDraft,
  draftHydrationKey,
  onDraftChange,
  _guestMode,
}) {
  const [source, setSource] = useState(
    user?.role === 'teacher'
      ? 'teacher'
      : (taskContext ? 'homework' : 'self')
  );
  const [maxOpt, setMaxOpt] = useState('15');
  const [customMax, setCustomMax] = useState('');
  const [selectedQId, setSelectedQId] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isRecognizingPrompt, setIsRecognizingPrompt] = useState(false);
  const [isRecognizingWriting, setIsRecognizingWriting] = useState(false);
  const [isRecognizingTags, setIsRecognizingTags] = useState(false);
  const [manualType, setManualType] = useState('');
  const [showManualCorrect, setShowManualCorrect] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [writingTitle, setWritingTitle] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [subUploadOpen, setSubUploadOpen] = useState(false);
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [versionOfWritingId, setVersionOfWritingId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentsInClass, setStudentsInClass] = useState([]);
  const [images, setImages] = useState([]);
  const [lightboxImg, setLightboxImg] = useState(null);
  const scoreTouchedRef = useRef(false);
  const previousDraftRef = useRef(undefined);
  const hydratedDraftRef = useRef(false);
  const hydratedDraftIdentityRef = useRef(null);
  const previousPreloadedQuestionRef = useRef(undefined);
  const previousTaskContextRef = useRef(undefined);

  const resetDraftFields = useCallback(({
    resetScore = true,
    resetPrompt = true,
    resetQuestion = true,
    resetWriting,
    resetAnalysis = true,
    resetSource,
  } = {}) => {
    if (resetScore) {
      setMaxOpt('15');
      setCustomMax('');
      scoreTouchedRef.current = false;
    }
    if (resetQuestion) {
      setSelectedQId('');
    }
    if (resetPrompt) {
      setPromptText('');
      setWritingTitle('');
      setAssignOpen(false);
    }
    if (resetWriting) {
      setText('');
      setImage(null);
      setImages([]);
      setLightboxImg(null);
      setVersionOfWritingId(null);
    }
    if (resetAnalysis) {
      setAiAnalysis(null);
      setManualType('');
    }
    if (resetSource) {
      setSource(user?.role === 'teacher' ? 'teacher' : 'self');
    }
  }, [user?.role]);

  const analyzeTags = async(force = false, overrides = {}) => {
    const titleToUse = overrides.title ?? writingTitle;
    const contentToUse = overrides.content ?? text;
    const requirementsToUse = overrides.requirements ?? promptText;
    if (!force && contentToUse.trim().length < 30 && requirementsToUse.trim().length < 50) return;
    if (isRecognizingTags) return;

    setIsRecognizingTags(true);
    try {
      const result = await aiAPI.analyzeTags({
        title: titleToUse,
        content: contentToUse,
        requirements: requirementsToUse,
      });
      setAiAnalysis(result);
      if (!manualType) setManualType(result.type);
    } catch (err) {
      console.error('标签识别失败:', err);
    } finally {
      setIsRecognizingTags(false);
    }
  };

  useEffect(() => {
    const nextDraftIdentity = getDraftIdentity(initialDraft, draftHydrationKey);
    const draftIdentityChanged = nextDraftIdentity != null && nextDraftIdentity !== hydratedDraftIdentityRef.current;
    const shouldHydrateDraft = !hydratedDraftRef.current || draftIdentityChanged;

    if (previousDraftRef.current === initialDraft && !draftIdentityChanged) return;
    previousDraftRef.current = initialDraft;

    if (!initialDraft) {
      hydratedDraftRef.current = false;
      hydratedDraftIdentityRef.current = null;
      resetDraftFields({
        resetScore: true,
        resetPrompt: true,
        resetQuestion: true,
        resetWriting: true,
        resetAnalysis: true,
        resetSource: !taskContext,
      });
      return;
    }

    if (!shouldHydrateDraft) return;

    hydratedDraftRef.current = true;
    hydratedDraftIdentityRef.current = nextDraftIdentity;
    const fields = _buildDraftFieldValues(initialDraft, user, taskContext);
    setMaxOpt(fields.maxOpt);
    setCustomMax(fields.customMax);
    setSelectedQId(fields.selectedQId);
    setAiAnalysis(fields.aiAnalysis);
    setManualType(fields.manualType);
    setPromptText(fields.promptText);
    setWritingTitle(fields.writingTitle);
    setText(fields.text);
    setImage(fields.image);
    setImages(fields.images);
    setSource(fields.source);
    setVersionOfWritingId(fields.versionOfWritingId);
    scoreTouchedRef.current = fields.scoreTouched;
  }, [initialDraft, draftHydrationKey, taskContext, user, resetDraftFields]);

  useEffect(() => {
    onDraftChange?.({
      maxOpt,
      customMax,
      selectedQId,
      aiAnalysis,
      manualType,
      promptText,
      writingTitle,
      text,
      image,
      images,
      source,
      versionOfWritingId,
    });
  }, [maxOpt, customMax, selectedQId, aiAnalysis, manualType, promptText, writingTitle, text, image, images, source, versionOfWritingId, onDraftChange]);

  useEffect(() => {
    const previousPreloadedQuestion = previousPreloadedQuestionRef.current;
    previousPreloadedQuestionRef.current = preloadedQuestion;

    if (preloadedQuestion) {
      const explicitScore = preloadedQuestion.defaultScore != null && Number(preloadedQuestion.defaultScore) > 0
        ? String(Number(preloadedQuestion.defaultScore))
        : null;
      setSelectedQId(preloadedQuestion.id);
      setPromptText(preloadedQuestion.promptText || '');
      setWritingTitle(preloadedQuestion.title || '');
      setAssignOpen(true);
      if (preloadedQuestion.type) setManualType(preloadedQuestion.type);
      if (explicitScore && !scoreTouchedRef.current) {
        setMaxOpt(explicitScore);
        setCustomMax('');
      }
    } else if (previousPreloadedQuestion) {
      setSelectedQId('');
      setPromptText('');
      setWritingTitle('');
      setManualType('');
      setAiAnalysis(null);
      setAssignOpen(false);
    }

    if (user?.role === 'teacher') {
      classesAPI.list().then(setClasses).catch(() => {});
    }
  }, [preloadedQuestion, user]);

  useEffect(() => {
    const previousTaskContext = previousTaskContextRef.current;
    previousTaskContextRef.current = taskContext;

    if (!taskContext) {
      if (previousTaskContext) {
        resetDraftFields({
          resetScore: true,
          resetPrompt: true,
          resetQuestion: true,
          resetWriting: false,
          resetAnalysis: true,
          resetSource: user?.role !== 'teacher',
        });
      }
      return;
    }

    const assignment = taskContext.assignment || {};
    const nextMax = assignment.maxScore ? String(Number(assignment.maxScore)) : '15';
    const nextType = deriveTaskWritingType(assignment);

    setSource('homework');
    setSelectedQId(assignment.questionId ? String(assignment.questionId) : '');
    setPromptText(assignment.promptText || '');
    setWritingTitle(assignment.title || '');
    setMaxOpt(nextMax);
    setCustomMax('');
    setAssignOpen(true);
    if (nextType) {
      setManualType(nextType);
      setAiAnalysis((current) => ({
        ...(current || {}),
        type: nextType,
        themes: current?.themes || assignment.selectedThemes || [],
        theme: current?.theme || assignment.selectedThemes?.[0] || '',
        confidence: current?.confidence ?? 1,
        reason: current?.reason || '已按老师布置的任务题型锁定',
      }));
    }
  }, [taskContext, resetDraftFields, user?.role]);

  useEffect(() => {
    if (!selectedClass) {
      setStudentsInClass([]);
      setSelectedStudent('');
      return;
    }

    classesAPI.getStudents(selectedClass).then(setStudentsInClass).catch(() => {});
  }, [selectedClass]);

  useEffect(() => {
    if (taskContext) {
      setSource('homework');
      return;
    }
    if (user?.role !== 'teacher') setSource('self');
  }, [user, taskContext]);

  useEffect(() => {
    if (!isIeltsWritingType(manualType || aiAnalysis?.type)) return;
    if (scoreTouchedRef.current || taskContext) return;
    setMaxOpt('9');
    setCustomMax('');
  }, [manualType, aiAnalysis?.type, taskContext]);

  const resetForQuestionSelection = () => {
    setText('');
    setImage(null);
    setAiAnalysis(null);
    setManualType('');
  };

  const handleSelectQ = (id, onFeedbackReset) => {
    setSelectedQId(id);
    onFeedbackReset?.();
    resetForQuestionSelection();

    if (!id) {
      setPromptText('');
      setWritingTitle('');
      return;
    }

    const question = questions.find((item) => sameId(item.id, id));
    if (!question) return;

    setPromptText(question.promptText || '');
    setWritingTitle(question.title || '');
    const explicitScore = question.defaultScore != null && Number(question.defaultScore) > 0
      ? String(Number(question.defaultScore))
      : null;
    if (explicitScore && !scoreTouchedRef.current) {
      setMaxOpt(explicitScore);
      setCustomMax('');
    }
    if (question.type || (Array.isArray(question.themes) && question.themes.length)) {
      if (question.type) setManualType(question.type);
      setAiAnalysis(_buildAiAnalysisFromQuestion(question));
    }
  };

  const inferredPromptScore = inferScoreFromText(promptText, writingTitle);
  const effectiveScore = maxOpt === 'custom'
    ? (customMax ? String(Number(customMax)) : '')
    : String(maxOpt || '');
  const scoreMismatchHint = !taskContext
    && inferredPromptScore
    && effectiveScore
    && inferredPromptScore !== effectiveScore
      ? {
          inferredScore: inferredPromptScore,
          currentScore: effectiveScore,
        }
      : null;

  return {
    state: {
      taskContext,
      source,
      maxOpt,
      customMax,
      selectedQId,
      aiAnalysis,
      isRecognizingPrompt,
      isRecognizingWriting,
      isRecognizingTags,
      manualType,
      showManualCorrect,
      promptText,
      writingTitle,
      assignOpen,
      subUploadOpen,
      text,
      image,
      versionOfWritingId,
      classes,
      selectedClass,
      selectedStudent,
      studentsInClass,
      images,
      lightboxImg,
      inferredPromptScore,
      scoreMismatchHint,
    },
    refs: {},
    actions: {
      setSource,
      setMaxOpt: (value) => {
        scoreTouchedRef.current = true;
        setMaxOpt(value);
      },
      setCustomMax: (value) => {
        scoreTouchedRef.current = true;
        setCustomMax(value);
      },
      setSelectedQId,
      setAiAnalysis,
      setIsRecognizingPrompt,
      setIsRecognizingWriting,
      setIsRecognizingTags,
      setManualType,
      setShowManualCorrect,
      setPromptText,
      setWritingTitle,
      setAssignOpen,
      setSubUploadOpen,
      setText,
      setImage,
      setVersionOfWritingId,
      setClasses,
      setSelectedClass,
      setSelectedStudent,
      setStudentsInClass,
      setImages,
      setLightboxImg,
      analyzeTags,
      handleSelectQ,
    },
  };
}
