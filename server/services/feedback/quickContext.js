import { buildQuickPrompt } from '../../../client/src/writing/core/writingPrompts.js';
import { safeJsonParse } from '../../utils/writingFeedback.js';
import { normalizeWritingType } from '../aiService.js';
import { buildIeltsKnowledgeContext } from '../ieltsKnowledgeService.js';
import { trimMiddle } from './timeout.js';

export const QUICK_PROMPT_TEXT_LIMIT = 1200;
export const QUICK_WRITING_TEXT_LIMIT = 2800;

function buildImageInputs(image) {
  return [
    image?.ossUrl
      ? { type: 'image_url', image_url: { url: image.ossUrl } }
      : null,
    image?.base64 && image?.mediaType
      ? { type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.base64}` } }
      : null,
  ].filter(Boolean);
}

function _resolveWritingMeta(row, aiAnalysis) {
  return {
    writingType: normalizeWritingType(row?.selected_type || aiAnalysis?.type || 'general'),
    maxScore: Number(row?.max_score || 15),
    promptText: trimMiddle(row?.prompt_text || '', QUICK_PROMPT_TEXT_LIMIT),
    writingTitle: String(row?.writing_title || '').trim(),
    fullText: trimMiddle(row?.full_text || row?.text_snippet || '', QUICK_WRITING_TEXT_LIMIT),
  };
}

function _resolveImageMode(row) {
  const image = safeJsonParse(row?.image_data, null);
  const submissionMode = image?.ossUrl || (image?.base64 && image?.mediaType) ? 'image' : 'text';
  return { image, submissionMode };
}

function _buildContextHeader(writingType, writingTitle, promptText) {
  const lines = [];
  if (writingType) lines.push(`写作类型：${writingType}`);
  if (writingTitle) lines.push(`写作标题：${writingTitle}`);
  if (promptText) lines.push(`题目要求：\n${promptText}`);
  return lines.length ? `【作业信息】\n${lines.join('\n')}\n\n【学生作文】\n` : '';
}

function _buildUserContent(image, header, fullText) {
  const imageInputs = buildImageInputs(image);
  if (!imageInputs.length) return header + fullText;
  return [
    ...imageInputs,
    { type: 'text', text: `${header}${fullText || '请结合学生上传的作文图片进行批改，并特别关注卷面、分段、书写整洁度与格式呈现。'}` },
  ];
}

export function buildQuickFeedbackContext(row, feedback, summarizeInputMetrics, options = {}) {
  const aiAnalysis = feedback?.aiAnalysis || null;
  const { writingType, maxScore, promptText, writingTitle, fullText } = _resolveWritingMeta(row, aiAnalysis);
  const { image, submissionMode } = _resolveImageMode(row);
  const knowledgeContext = buildIeltsKnowledgeContext({
    user: options.user || null,
    writingType,
    writingTitle,
    promptText,
    fullText,
    learningGoal: options.learningGoal || '',
  });
  const systemPrompt = buildQuickPrompt(maxScore, writingType, { submissionMode, knowledgeContext });
  const header = _buildContextHeader(writingType, writingTitle, promptText);
  const userContent = _buildUserContent(image, header, fullText);
  return {
    aiAnalysis,
    writingType,
    systemPrompt,
    userContent,
    inputMetrics: summarizeInputMetrics(userContent),
  };
}
