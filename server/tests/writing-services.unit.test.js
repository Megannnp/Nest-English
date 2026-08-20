import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import db from '../db/database.js';
import {
  buildHeuristicTagAnalysis,
  normalizeWritingType,
  sanitizeTagAnalysis,
} from '../services/aiTagAnalysisService.js';
import { deriveSubmissionModeLabel } from '../services/assignmentExportService.js';
import {
  buildTeacherCommentPayload,
  createForbiddenError,
  createNotFoundError,
} from '../services/writingService.js';
import { safeJsonParse } from '../utils/writingFeedback.js';

test.after(async () => {
  try {
    await db.pool.end();
  } catch { /* intentional */ }
});

test('buildTeacherCommentPayload trims content and keeps teacher signature stable', () => {
  const result = buildTeacherCommentPayload({
    content: '  这篇文章结构很完整。  ',
    annotatedImage: null,
    teacher: { realName: '王老师', name: '王老师' },
  });

  assert.equal(result.content, '这篇文章结构很完整。');
  assert.equal(result.teacherName, '王老师');
  assert.equal(result.annotatedImage, null);
  assert.equal(typeof result.timestamp, 'string');
});

test('buildTeacherCommentPayload preserves schema-sized teacher comments', () => {
  const content = '评'.repeat(4000);
  const result = buildTeacherCommentPayload({
    content,
    annotatedImage: null,
    teacher: { realName: '王老师' },
  });

  assert.equal(result.content.length, 4000);
});

test('buildTeacherCommentPayload rejects oversized annotated image payloads', () => {
  assert.throws(() => {
    buildTeacherCommentPayload({
      content: '',
      annotatedImage: { dataUrl: 'x'.repeat(101 * 1024) },
      teacher: { realName: '王老师' },
    });
  }, /批注图片数据过大/);
});

test('buildTeacherCommentPayload rejects empty comment and empty annotated image', () => {
  assert.throws(() => {
    buildTeacherCommentPayload({
      content: '   ',
      annotatedImage: null,
      teacher: { realName: '王老师' },
    });
  }, /请填写评语或上传批注图片/);
});

test('tag analysis heuristic and sanitize flow stays deterministic', () => {
  const heuristic = buildHeuristicTagAnalysis({
    title: 'A Speech for Earth Day',
    content: 'We should protect the environment and act together.',
    requirements: '请写一篇演讲稿，呼吁大家参与环保活动。',
  });

  assert.equal(heuristic.type, 'speech');
  assert.ok(heuristic.themes.includes('环保'));

  const sanitized = sanitizeTagAnalysis({
    type: 'speech',
    confidence: 1.8,
    themes: ['环保', '  ', '校园'],
    reason: 'AI 识别结果',
  }, heuristic);

  assert.equal(sanitized.type, 'speech');
  assert.equal(sanitized.confidence, 1);
  assert.deepEqual(sanitized.themes, ['环保', '校园']);
});

test('shared status errors keep consistent http semantics', () => {
  const notFound = createNotFoundError();
  const forbidden = createForbiddenError();

  assert.equal(notFound.status, 404);
  assert.equal(forbidden.status, 403);
  assert.equal(normalizeWritingType('UNKNOWN_TYPE'), 'general');
});

test('deriveSubmissionModeLabel falls back to existing assignment task fields', () => {
  assert.equal(deriveSubmissionModeLabel({}), '');
  assert.equal(deriveSubmissionModeLabel({ writing_id: 'w1', submitted_at: Date.now() }), '学生提交');
  assert.equal(deriveSubmissionModeLabel({
    writing_id: 'w2',
    submitted_at: Date.now(),
    submitted_by_teacher: 'teacher-1',
  }), '教师代交');
});

test('safeJsonParse tolerates malformed historical JSON payloads', () => {
  assert.deepEqual(safeJsonParse('{"ok":1}', {}), { ok: 1 });
  assert.deepEqual(safeJsonParse('{"broken"', []), []);
  assert.equal(safeJsonParse('', null), null);
});
