import { useCallback } from 'react';

import {
  createBatchItemId,
  getRecognizedTextIssue,
  matchStudentOption,
  normalizeRecognizedEssayText,
  readFileAsBase64,
  revokePreview,
  revokePreviewList,
} from './shared.js';
import { aiAPI, writingsAPI } from '../../api/index.js';

const CONFIRM_ALL_CONCURRENCY = 3;

function resolveStudentTargetSelection({ item, studentOptions }) {
  if (item.studentTargetKey) {
    return studentOptions.find((student) => student.key === item.studentTargetKey) || null;
  }

  return matchStudentOption({
    detectedName: item.studentName || item.detectedName || '',
    fileName: item.file?.name || '',
    studentOptions,
  });
}

function resolveRecognitionSelection({ item, result, studentOptions }) {
  const detectedName = result.detectedName || '';
  const recognizedText = normalizeRecognizedEssayText(result.text);
  const matchedOption = matchStudentOption({
    detectedName,
    fileName: item.file.name,
    studentOptions,
  });

  return {
    status: 'confirm',
    detectedName: detectedName || null,
    studentName: matchedOption?.name || detectedName,
    studentTargetKey: matchedOption?.key || '',
    recognizedText,
    errorMsg: null,
  };
}

async function recognizeStudentFromImage({ item, studentCandidates }) {
  const base64 = await readFileAsBase64(item.file);
  return aiAPI.recognizeText({
    image: { base64, mediaType: item.file.type, name: item.file.name },
    type: 'student_writing',
    studentCandidates,
  }, { timeoutMs: 60000 });
}

function resolveMatchedStudentOrThrow({ item, studentOptions, updateItem, idx }) {
  const matchedStudent = resolveStudentTargetSelection({ item, studentOptions });
  if (matchedStudent) return matchedStudent;

  if (item.studentTargetKey) {
    updateItem(idx, {
      status: 'confirm',
      studentTargetKey: '',
      writingOwnerId: '',
      errorMsg: '当前学生目标已失效，请重新选择学生',
    });
    throw new Error('当前学生目标已失效，请重新选择学生');
  }

  throw new Error('请先从班级学生或待认领名单中选择学生');
}

function resolveRecognizedTextOrThrow({ item, updateItem, idx }) {
  const recognizedText = String(item.recognizedText || '').trim();
  const recognizedTextIssue = getRecognizedTextIssue(recognizedText);
  if (!recognizedTextIssue) return recognizedText;

  updateItem(idx, { status: 'error', errorMsg: recognizedTextIssue });
  throw new Error(recognizedTextIssue);
}

function ensureStudentTargetSelection({ item, matchedStudent, resolvedStudentName, updateItem, idx }) {
  if (item.studentTargetKey) return;
  updateItem(idx, {
    studentTargetKey: matchedStudent.key,
    studentName: resolvedStudentName,
  });
}

function buildSavedWritingIdentity({ matchedStudent, resolvedStudentName, selectedAssignment, user }) {
  return {
    userId: matchedStudent.type === 'user' ? matchedStudent.id : null,
    rosterId: matchedStudent.type === 'roster' ? matchedStudent.id : null,
    userName: resolvedStudentName || '未知学生',
    className: matchedStudent.className || selectedAssignment?.className || user.className || '',
  };
}

function buildSavedWritingQuestionFields({ selectedQId, selectedQuestion, selectedAssignment, promptText, questionType, selectedAssignmentId }) {
  return {
    questionId: selectedQId || null,
    writingTitle: selectedQuestion?.title || selectedAssignment?.title || null,
    promptText: promptText || null,
    selectedType: questionType,
    selectedThemes: [],
    assignmentId: selectedAssignmentId,
    source: 'teacher_batch',
    skipQuestionAnalysisQueue: true,
  };
}

function buildSavedWritingTextFields({ recognizedText, getRecognizedWordCount, max }) {
  return {
    textSnippet: recognizedText ? recognizedText.slice(0, 500) : '',
    fullText: recognizedText,
    wordCount: getRecognizedWordCount(recognizedText),
    maxScore: max,
  };
}

function buildSavedWritingImageFields({ item, base64, user }) {
  return {
    image: { base64, mediaType: item.file.type, name: item.file.name },
    submittedByTeacher: { teacherId: user.id, teacherName: user.realName || user.name },
  };
}

function buildSavedWritingPayload({
  item,
  matchedStudent,
  resolvedStudentName,
  recognizedText,
  selectedAssignment,
  selectedAssignmentId,
  selectedQId,
  selectedQuestion,
  promptText,
  questionType,
  max,
  user,
  getRecognizedWordCount,
  base64,
}) {
  return {
    ...buildSavedWritingIdentity({ matchedStudent, resolvedStudentName, selectedAssignment, user }),
    ...buildSavedWritingQuestionFields({ selectedQId, selectedQuestion, selectedAssignment, promptText, questionType, selectedAssignmentId }),
    ...buildSavedWritingTextFields({ recognizedText, getRecognizedWordCount, max }),
    ...buildSavedWritingImageFields({ item, base64, user }),
  };
}

async function createSavedWriting({
  item,
  matchedStudent,
  resolvedStudentName,
  recognizedText,
  selectedAssignment,
  selectedAssignmentId,
  selectedQId,
  selectedQuestion,
  promptText,
  questionType,
  max,
  user,
  getRecognizedWordCount,
}) {
  const base64 = await readFileAsBase64(item.file);
  return writingsAPI.create(buildSavedWritingPayload({
    item,
    matchedStudent,
    resolvedStudentName,
    recognizedText,
    selectedAssignment,
    selectedAssignmentId,
    selectedQId,
    selectedQuestion,
    promptText,
    questionType,
    max,
    user,
    getRecognizedWordCount,
    base64,
  }));
}

/**
 * @param {{
 *   itemsRef: { current: Array<Record<string, any>> },
 *   setItems: Function,
 *   sessionController: {
 *     resetJob: () => void,
 *     markOcrRunning: () => void,
 *     markOcrFinished: () => void,
 *   },
 *   selectedAssignmentId: string,
 *   selectedAssignment: Record<string, any> | undefined,
 *   selectedQuestion: Record<string, any> | undefined,
 *   selectedQId: string,
 *   promptText: string,
 *   questionType: string,
 *   max: number,
 *   studentOptions: Array<Record<string, any>>,
 *   studentCandidates: Array<Record<string, any>>,
 *   user: Record<string, any>,
 * }} params
 */
export function useBatchGradingUploadActions({
  itemsRef,
  setItems,
  sessionController,
  selectedAssignmentId,
  selectedAssignment,
  selectedQuestion,
  selectedQId,
  promptText,
  questionType,
  max,
  studentOptions,
  studentCandidates,
  user,
}) {
  const getRecognizedWordCount = useCallback((text = '') => (
    String(text)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .length
  ), []);

  const updateItem = useCallback((idx, patch) => {
    const next = itemsRef.current.map((item, index) => (index === idx ? { ...item, ...patch } : item));
    itemsRef.current = next;
    setItems(next);
  }, [itemsRef, setItems]);

  const addFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    const newItems = imageFiles.map((file) => ({
      localId: createBatchItemId(),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      studentName: '',
      studentTargetKey: '',
      detectedName: null,
      recognizedText: '',
      feedback: null,
      errorMsg: null,
      writingId: '',
      writingOwnerId: '',
    }));

    const next = [...itemsRef.current, ...newItems];
    itemsRef.current = next;
    setItems(next);
  }, [itemsRef, setItems]);

  const createBoundWritingForItem = useCallback(async (idx) => {
    const item = itemsRef.current[idx];
    if (!item || item.writingId) {
      if (item?.writingId && item.status !== 'confirmed') {
        updateItem(idx, { status: 'confirmed', errorMsg: null });
      }
      return item?.writingId || '';
    }

    if (!selectedAssignmentId) throw new Error('请先选择任务');

    const matchedStudent = resolveMatchedStudentOrThrow({ item, studentOptions, updateItem, idx });
    const resolvedStudentName = item.studentName || item.detectedName || matchedStudent.name || '';
    const recognizedText = resolveRecognizedTextOrThrow({ item, updateItem, idx });
    ensureStudentTargetSelection({ item, matchedStudent, resolvedStudentName, updateItem, idx });

    updateItem(idx, { status: 'uploading', errorMsg: null });
    const savedWriting = await createSavedWriting({
      item,
      matchedStudent,
      resolvedStudentName,
      recognizedText,
      selectedAssignment,
      selectedAssignmentId,
      selectedQId,
      selectedQuestion,
      promptText,
      questionType,
      max,
      user,
      getRecognizedWordCount,
    });
    const writingId = savedWriting?.id || '';
    if (!writingId) throw new Error('作文记录保存失败');

    updateItem(idx, {
      status: 'confirmed',
      writingId,
      writingOwnerId: matchedStudent.key,
      studentName: resolvedStudentName,
      errorMsg: null,
    });
    return writingId;
  }, [
    itemsRef,
    max,
    promptText,
    questionType,
    selectedAssignment,
    selectedAssignmentId,
    selectedQId,
    selectedQuestion,
    studentOptions,
    updateItem,
    user,
    getRecognizedWordCount,
  ]);

  const handleStudentSelect = useCallback((idx, targetKey) => {
    const option = studentOptions.find((item) => item.key === targetKey);
    updateItem(idx, {
      studentTargetKey: targetKey,
      studentName: option?.name || '',
      writingId: '',
      writingOwnerId: '',
    });
  }, [studentOptions, updateItem]);

  const removeItem = useCallback((idx) => {
    revokePreview(itemsRef.current[idx]);
    const next = itemsRef.current.filter((_, index) => index !== idx);
    itemsRef.current = next;
    setItems(next);
  }, [itemsRef, setItems]);

  const clearAllItems = useCallback(() => {
    revokePreviewList(itemsRef.current);
    setItems([]);
    itemsRef.current = [];
    sessionController.resetJob();
  }, [itemsRef, sessionController, setItems]);

  const handleConfirmItem = useCallback(async (idx) => {
    try {
      await createBoundWritingForItem(idx);
    } catch (err) {
      updateItem(idx, { status: 'error', errorMsg: err.message || '上传失败' });
    }
  }, [createBoundWritingForItem, updateItem]);

  const confirmAll = useCallback(async () => {
    const targetIndexes = itemsRef.current
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item?.status === 'confirm' || item?.status === 'error')
      .map(({ index }) => index);

    for (let start = 0; start < targetIndexes.length; start += CONFIRM_ALL_CONCURRENCY) {
      const batch = targetIndexes.slice(start, start + CONFIRM_ALL_CONCURRENCY);
      await Promise.all(batch.map((index) => handleConfirmItem(index)));
    }
  }, [handleConfirmItem, itemsRef]);

  const fillUnmatchedByRosterOrder = useCallback(() => {
    const orderedStudents = studentOptions;
    const usedKeys = new Set(itemsRef.current.map((item) => item.studentTargetKey).filter(Boolean));
    let nextStudentIndex = 0;
    const next = itemsRef.current.map((item) => {
      if (!['confirm', 'error'].includes(item.status) || item.studentTargetKey) return item;
      while (nextStudentIndex < orderedStudents.length && usedKeys.has(orderedStudents[nextStudentIndex].key)) {
        nextStudentIndex += 1;
      }
      const student = orderedStudents[nextStudentIndex];
      if (!student) return item;
      usedKeys.add(student.key);
      nextStudentIndex += 1;
      return {
        ...item,
        studentTargetKey: student.key,
        studentName: student.name,
        writingId: '',
        writingOwnerId: '',
        errorMsg: null,
      };
    });
    itemsRef.current = next;
    setItems(next);
  }, [itemsRef, setItems, studentOptions]);

  const retryOCR = useCallback(async (idx) => {
    const item = itemsRef.current[idx];
    if (!item) return;
    updateItem(idx, { status: 'ocr', errorMsg: null });
    try {
      const result = await recognizeStudentFromImage({ item, studentCandidates });
      updateItem(idx, resolveRecognitionSelection({ item, result, studentOptions }));
    } catch (error) {
      updateItem(idx, {
        status: 'error',
        detectedName: null,
        recognizedText: '',
        errorMsg: error?.timeout ? '识别未完成/超时，请重试' : '识别失败，请重试',
      });
    }
  }, [itemsRef, studentCandidates, studentOptions, updateItem]);

  const runOCR = useCallback(async () => {
    sessionController.markOcrRunning();
    const snapshot = itemsRef.current;
    snapshot.forEach((_, index) => {
      updateItem(index, { status: 'ocr', errorMsg: null });
    });

    await Promise.all(snapshot.map(async (item, index) => {
      try {
        const result = await recognizeStudentFromImage({ item, studentCandidates });
        updateItem(index, resolveRecognitionSelection({ item, result, studentOptions }));
      } catch (error) {
        updateItem(index, {
          status: 'error',
          detectedName: null,
          recognizedText: '',
          errorMsg: error?.timeout ? '识别未完成/超时，请重试' : '识别失败，请重试',
        });
      }
    }));
    sessionController.markOcrFinished();
  }, [itemsRef, sessionController, studentCandidates, studentOptions, updateItem]);

  return {
    addFiles,
    updateItem,
    createBoundWritingForItem,
    handleStudentSelect,
    removeItem,
    clearAllItems,
    handleConfirmItem,
    confirmAll,
    fillUnmatchedByRosterOrder,
    retryOCR,
    runOCR,
  };
}
