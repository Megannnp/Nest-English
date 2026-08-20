import './testSetup.js';
import assert from 'node:assert/strict';
import test from 'node:test';

import { ensureValidContinuationDetailedFeedback } from '../services/feedback/detailedFeedback.js';
import { buildDetailedPrompt } from '../services/feedback/detailedPrompt.js';

const row = {
  selected_type: 'continuation',
  prompt_text: `阅读下面材料，根据其内容和所给段落开头语续写两段，使之构成一篇完整的短文。

In a class discussion I was invited to explain the meaning of my name.
Many of my classmates got interested and came up to me after class.`,
  full_text: 'I felt nervous at first, but I still tried to answer their questions.',
};

test('continuation detailed prompt requires exact starters and no title', () => {
  const prompt = buildDetailedPrompt({
    row,
    feedback: { totalScore: 18, tier: '良', summary: '主线基本完整。' },
  });

  assert.match(prompt, /"title": ""/);
  assert.match(prompt, /两段必须分别以题目给出的两句段首句原样开头/);
  assert.match(prompt, /sampleEssay 不要标题/);
});

test('continuation detailed prompt includes assignment context and structured starters', () => {
  const prompt = buildDetailedPrompt({
    row: {
      ...row,
      continuation_starters: JSON.stringify({
        para1: 'Paragraph one starter from structured data.',
        para2: 'Paragraph two starter from structured data.',
      }),
    },
    feedback: { totalScore: 18, tier: '良', summary: '主线基本完整。' },
  });

  assert.match(prompt, /题目上下文/);
  assert.match(prompt, /题目要求/);
  assert.match(prompt, /Paragraph one starter from structured data\./);
  assert.match(prompt, /Paragraph two starter from structured data\./);
  assert.match(prompt, /所有情节、人物、主题判断必须优先依据题目要求/);
});

test('detailed prompt carries quick feedback evidence into second-stage review', () => {
  const prompt = buildDetailedPrompt({
    row: {
      selected_type: 'letter',
      full_text: 'Dear Tom, I am happy to invite you to our school activity.',
    },
    feedback: {
      totalScore: 12,
      maxScore: 15,
      tier: '第四档',
      summary: '交际目的清楚，但活动细节不够完整。',
      categories: [
        { name: '内容', score: '8/10', grade: '良', comment: '邀请目的明确，但缺少时间地点。', suggestions: ['补充活动时间和地点'] },
      ],
      mainProblems: ['缺少活动时间和地点'],
      nextActions: ['在正文第一段补清楚 when 和 where'],
      highlights: {
        sentences: [{ original: 'I am happy to invite you', comment: '邀请语气自然' }],
      },
      grammarIssues: [
        { type: '介词', original: 'invite you our school', corrected: 'invite you to our school', explanation: 'invite sb. to...' },
      ],
    },
  });

  assert.match(prompt, /必须继承快速反馈的总分档次/);
  assert.match(prompt, /不要在详细反馈中推翻前面的核心判断/);
  assert.match(prompt, /缺少活动时间和地点/);
  assert.match(prompt, /邀请目的明确/);
  assert.match(prompt, /invite you to our school/);
});

test('continuation detailed feedback repairs invalid sample essay before returning', async () => {
  const result = await ensureValidContinuationDetailedFeedback({
    overview: '续写主线基本成立。',
    sampleEssay: {
      title: '参考续写',
      text: 'Wrong second starter first.\n\nWrong first starter second.',
      highlights: ['情节推进'],
    },
  }, row, async () => ({
    title: '',
    text: 'In a class discussion I was invited to explain the meaning of my name. I took a deep breath and shared the story behind it.\n\nMany of my classmates got interested and came up to me after class. Their warm smiles made me realize my name carried pride rather than embarrassment.',
    highlights: ['段首句保留', '主题回扣'],
  }));

  assert.equal(result.sampleEssay.title, '');
  assert.match(result.sampleEssay.text, /^In a class discussion I was invited to explain the meaning of my name\./);
  assert.match(result.sampleEssay.text, /\n\nMany of my classmates got interested and came up to me after class\./);
});

test('continuation detailed feedback throws when repaired sample essay is still invalid', async () => {
  await assert.rejects(
    ensureValidContinuationDetailedFeedback({
      sampleEssay: {
        title: '',
        text: 'Wrong paragraph one.\n\nWrong paragraph two.',
        highlights: [],
      },
    }, row, async () => ({
      title: '',
      text: 'Still wrong.\n\nStill wrong again.',
      highlights: [],
    })),
    /续写详细反馈范文校验失败/
  );
});
