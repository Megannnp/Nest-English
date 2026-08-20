import { QUESTION_ANALYSIS_WORKER_ID } from './questionAnalysisQueueConfig.js';

const queuedIds = new Set();
const runningIds = new Set();

let questionAnalysisQueueActive = false;
let questionAnalysisRecoveryTimer = null;
let questionAnalysisWorker = null;
let questionAnalysisWorkerPollTimer = null;

export function getQueuedQuestionAnalysisIds() {
  return queuedIds;
}

export function getRunningQuestionAnalysisIds() {
  return runningIds;
}

export function addQueuedQuestionAnalysis(writingId) {
  queuedIds.add(writingId);
}

export function removeQueuedQuestionAnalysis(writingId) {
  queuedIds.delete(writingId);
}

export function addRunningQuestionAnalysis(writingId) {
  runningIds.add(writingId);
}

export function removeRunningQuestionAnalysis(writingId) {
  runningIds.delete(writingId);
}

export function getQuestionAnalysisWorkerId() {
  return QUESTION_ANALYSIS_WORKER_ID;
}

export function setQuestionAnalysisWorker(worker) {
  questionAnalysisWorker = worker;
}

export function getQuestionAnalysisWorker() {
  return questionAnalysisWorker;
}

export function markQuestionAnalysisQueueActive(active) {
  questionAnalysisQueueActive = active;
}

export function isQuestionAnalysisQueueActive() {
  return questionAnalysisQueueActive;
}

export function getQuestionAnalysisRecoveryTimer() {
  return questionAnalysisRecoveryTimer;
}

export function setQuestionAnalysisRecoveryTimer(timer) {
  questionAnalysisRecoveryTimer = timer;
}

export function getQuestionAnalysisWorkerPollTimer() {
  return questionAnalysisWorkerPollTimer;
}

export function setQuestionAnalysisWorkerPollTimer(timer) {
  questionAnalysisWorkerPollTimer = timer;
}
