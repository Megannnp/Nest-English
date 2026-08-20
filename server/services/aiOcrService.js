import { callVolcengineAI } from './aiProviderService.js';
import { ValidationError } from '../utils/appError.js';
import { validateFileMagicBytes } from '../utils/validateFileMagicBytes.js';

function extractDetectedName(text = '') {
  const lines = String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 3)) {
    const match = line.match(/(?:姓名|名字|Name)[:：]?\s*([A-Za-z\u4e00-\u9fa5·]{2,30})/i);
    if (match?.[1]) return match[1].trim();
  }

  for (const line of lines.slice(0, 2)) {
    const normalized = line.replace(/\s+/g, '');
    if (/^[\u4e00-\u9fa5·]{2,4}$/.test(normalized)) {
      return normalized;
    }
  }

  return null;
}

function estimateBase64Bytes(base64 = '') {
  const clean = String(base64).replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(clean.length * 3 / 4) - padding);
}

export function validateOCRRequest({ image, type }) {
  if (!image?.base64 || !image?.mediaType) {
    throw new ValidationError('缺少图片数据');
  }

  if (estimateBase64Bytes(image.base64) > 10 * 1024 * 1024) {
    throw new ValidationError('图片过大，请压缩后上传');
  }

  const headerBuffer = Buffer.from(image.base64.slice(0, 64), 'base64');
  if (!validateFileMagicBytes(headerBuffer, image.mediaType)) {
    throw new ValidationError('图片内容与声明类型不符，请上传真实图片');
  }

  const typeHint = (() => {
    if (type === 'question_requirements') return [
        '这是一道英语写作题目图片，请识别题目要求、材料、注意事项和段落开头语等正式题干内容。',
        '如果图片上还有老师批改痕迹、手写备注、分数、勾叉、红色标记或与题干无关的说明，请不要输出这些内容。',
      ].join('');

    if (type === 'reading_passage') return [
      '这是一张英语阅读理解材料图片，请识别图片中的英文阅读文章、题干、选项和必要的题号。',
      '请保留原有段落顺序、题号、选项字母和换行，方便学生继续生成阅读思维导图和题目解析。',
      '如果图片中有页眉页脚、水印、手写批注、答案勾画、分数或与阅读正文/题目无关的标记，请不要输出。',
    ].join('');

    return [
        '这是一篇学生英语作文的图片，请优先识别学生自己写的英文正文。',
        '如果图片里同时存在老师批改痕迹、红色批注、分数、对勾、叉号、圈画、边批、改写建议、中文点评或与学生正文无关的标记，请全部忽略，不要输出。',
        '如果同一处既有学生原文又有老师改写，请优先保留学生原文，不要把老师修改后的替代写法混进去。',
      ].join('');
  })();

  return { typeHint };
}

export async function recognizeTextFromImage({ image, type }) {
  const { typeHint } = validateOCRRequest({ image, type });
  const messages = [{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.base64}` } },
      {
        type: 'text',
        text: `${typeHint}

请严格遵守以下输出规则：
1. 只输出需要保留的正文内容，不要解释。
2. 保持原有段落顺序和换行。
3. 不要输出分数、等级、批改评语、边注、红字、勾叉、订正稿或老师改写内容。
4. 如果无法确定某些零散标记是否属于正文，优先舍弃这些标记。
5. 不要补写不存在的内容。`,
      },
    ],
  }];

  const text = await callVolcengineAI(undefined, messages, 2000, 0.1);
  const normalizedText = text.trim();
  return {
    text: normalizedText,
    detectedName: type === 'student_writing' ? extractDetectedName(normalizedText) : null,
  };
}
