import { array, boolean, nullable, number, object, passthrough, string } from '../schema.js';

const nullableString = (max = 256) => nullable(string({ max }));
const nullableInteger = () => nullable(number({ integer: true }));
const stringOrNull = (max = 256) => ({
  parse(value, path = 'value') {
    if (value == null) return null;
    return string({ max }).parse(value, path);
  },
});

export function apiEnvelopeSchema(dataSchema) {
  return object({
    code: number({ required: true, integer: true, min: 100, max: 599 }),
    msg: string({ required: true, max: 200 }),
    data: dataSchema,
  });
}

export const teacherWorkbenchGradingSchema = object({
  id: string({ required: true, max: 64 }),
  recordType: string({ max: 32 }),
  bindStatus: string({ max: 32 }),
  gradingStatus: string({ max: 32 }),
  workflowStatus: string({ max: 64 }),
  workflowLabel: string({ max: 64 }),
  statusLabel: string({ max: 64 }),
  nextAction: string({ max: 64 }),
  queueSection: string({ max: 64 }),
  isPendingRoster: boolean({ defaultValue: false }),
  userId: stringOrNull(64),
  rosterId: stringOrNull(64),
  userName: string({ required: true, max: 128 }),
  classId: string({ max: 64 }),
  className: string({ max: 128 }),
  assignmentId: string({ max: 64 }),
  assignmentTitle: string({ required: true, max: 200 }),
  writingTitle: string({ required: true, max: 200 }),
  createdAt: nullableInteger(),
  taskStatus: string({ max: 32 }),
  maxScore: nullable(number({})),
  totalScore: nullable(number({})),
  quickSummary: string({ max: 5000 }),
  teacherCommentReady: boolean({ defaultValue: false }),
});

export const teacherWorkbenchPendingCommentSchema = object({
  id: string({ required: true, max: 64 }),
  recordType: string({ max: 32 }),
  bindStatus: string({ max: 32 }),
  gradingStatus: string({ max: 32 }),
  workflowStatus: string({ max: 64 }),
  workflowLabel: string({ max: 64 }),
  statusLabel: string({ max: 64 }),
  nextAction: string({ max: 64 }),
  queueSection: string({ max: 64 }),
  isPendingRoster: boolean({ defaultValue: false }),
  userId: stringOrNull(64),
  rosterId: stringOrNull(64),
  userName: string({ required: true, max: 128 }),
  classId: string({ max: 64 }),
  className: string({ max: 128 }),
  assignmentId: string({ max: 64 }),
  assignmentTitle: string({ required: true, max: 200 }),
  writingTitle: string({ required: true, max: 200 }),
  createdAt: nullableInteger(),
  taskStatus: string({ max: 32 }),
  maxScore: nullable(number({})),
  totalScore: nullable(number({})),
  quickSummary: string({ max: 5000 }),
});

export const teacherWorkbenchGradingListSchema = array(teacherWorkbenchGradingSchema, { maxItems: 200 });
export const teacherWorkbenchPendingCommentListSchema = array(teacherWorkbenchPendingCommentSchema, { maxItems: 200 });

export const batchGradingItemSchema = object({
  id: string({ required: true, max: 64 }),
  jobId: string({ required: true, max: 64 }),
  writingId: string({ required: true, max: 64 }),
  studentName: string({ max: 128 }),
  sortOrder: number({ required: true, integer: true, min: 0 }),
  status: string({ required: true, max: 32 }),
  attempts: number({ required: true, integer: true, min: 0 }),
  errorCode: string({ max: 64 }),
  errorMessage: string({ max: 5000 }),
  result: passthrough({ defaultValue: {} }),
  totalScore: nullable(number({})),
  tier: string({ max: 200 }),
  summary: string({ max: 5000 }),
  categories: array(passthrough({ defaultValue: {} }), { maxItems: 20 }),
  highlights: passthrough({ defaultValue: {} }),
  weaknesses: array(string({ max: 5000 }), { maxItems: 50 }),
  mainProblems: array(string({ max: 5000 }), { maxItems: 50 }),
  improvements: array(passthrough({ defaultValue: '' }), { maxItems: 50 }),
  nextActions: array(passthrough({ defaultValue: '' }), { maxItems: 50 }),
  writingType: string({ max: 64 }),
  createdAt: nullableInteger(),
  updatedAt: nullableInteger(),
  startedAt: nullableInteger(),
  finishedAt: nullableInteger(),
  lastHeartbeatAt: nullableInteger(),
});

export const batchGradingJobSchema = object({
  id: string({ required: true, max: 64 }),
  teacherId: string({ required: true, max: 64 }),
  classId: string({ max: 64 }),
  assignmentId: string({ max: 64 }),
  status: string({ required: true, max: 32 }),
  queueName: string({ max: 64 }),
  payload: passthrough({ defaultValue: {} }),
  errorMessage: string({ max: 5000 }),
  totalCount: number({ required: true, integer: true, min: 0 }),
  processedCount: number({ required: true, integer: true, min: 0 }),
  successCount: number({ required: true, integer: true, min: 0 }),
  failedCount: number({ required: true, integer: true, min: 0 }),
  createdAt: nullableInteger(),
  updatedAt: nullableInteger(),
  startedAt: nullableInteger(),
  finishedAt: nullableInteger(),
  lastHeartbeatAt: nullableInteger(),
  items: array(batchGradingItemSchema, { maxItems: 500 }),
});

export const batchGradingJobListSchema = array(batchGradingJobSchema, { maxItems: 100 });

export const classRosterBindingResultSchema = object({
  rosterId: string({ required: true, max: 64 }),
  studentNo: string({ max: 64 }),
  studentName: string({ required: true, max: 128 }),
  userId: string({ required: true, max: 64 }),
});

export const classRosterUnbindingResultSchema = object({
  rosterId: string({ required: true, max: 64 }),
  studentNo: string({ max: 64 }),
  studentName: string({ required: true, max: 128 }),
  previousUserId: nullableString(64),
});

export const joinClassResultSchema = object({
  classId: string({ required: true, max: 64 }),
  className: string({ required: true, max: 128 }),
  rosterMatched: boolean({ defaultValue: false }),
  matchedRosterId: stringOrNull(64),
  matchedRosterName: string({ max: 128 }),
  user: passthrough({ defaultValue: null }),
});
