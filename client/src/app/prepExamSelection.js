import { DEFAULT_PREP_EXAM_ID, getPrepExam } from "./prepExamConfig.js";

export const PREP_EXAM_STORAGE_KEY = "nest_prep_exam_id";
export const PREP_EXAM_CHANGED_EVENT = "nest:prep-exam-change";

export function getUserPrepExamId(user) {
  const prepExamId = user?.preferences?.prepExamId;
  return prepExamId ? getPrepExam(prepExamId)?.id || "" : "";
}

export function readSelectedPrepExamId(user = null) {
  const userExamId = getUserPrepExamId(user);
  if (userExamId) return userExamId;
  if (typeof window === "undefined") return DEFAULT_PREP_EXAM_ID;
  try {
    const stored = window.localStorage.getItem(PREP_EXAM_STORAGE_KEY);
    return getPrepExam(stored)?.id || DEFAULT_PREP_EXAM_ID;
  } catch {
    return DEFAULT_PREP_EXAM_ID;
  }
}

export function getSelectedPrepExam() {
  return getPrepExam(readSelectedPrepExamId());
}

export function writeSelectedPrepExamId(examId) {
  const nextExam = getPrepExam(examId);
  const nextExamId = nextExam?.id || DEFAULT_PREP_EXAM_ID;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(PREP_EXAM_STORAGE_KEY, nextExamId);
    } catch {
      // 本地存储不可用时，调用方仍可使用返回值更新当前页面状态。
    }
    window.dispatchEvent(new CustomEvent(PREP_EXAM_CHANGED_EVENT, {
      detail: { examId: nextExamId, exam: nextExam },
    }));
  }
  return nextExamId;
}

export function syncSelectedPrepExamFromUser(user) {
  const userExamId = getUserPrepExamId(user);
  if (!userExamId) return readSelectedPrepExamId();
  return writeSelectedPrepExamId(userExamId);
}

export function buildPrepExamProps(user = null) {
  const prepExam = getPrepExam(readSelectedPrepExamId(user));
  return {
    prepExam,
    prepExamId: prepExam.id,
  };
}
