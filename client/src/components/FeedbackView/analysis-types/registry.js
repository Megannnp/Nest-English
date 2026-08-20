// src/components/FeedbackView/analysis-types/registry.js
import argumentative from './argumentative/meta.js';
import chart_writing from './chart_writing/meta.js';
import continuation from './continuation/meta.js';
import diary from './diary/meta.js';
import expository from './expository/meta.js';
import general from './general/meta.js';
import letter from './letter/meta.js';
import narrative from './narrative/meta.js';
import notice from './notice/meta.js';
import picture_writing from './picture_writing/meta.js';
import proposal from './proposal/meta.js';
import report from './report/meta.js';
import review from './review/meta.js';
import speech from './speech/meta.js';
import summary from './summary/meta.js';

export const TYPE_REGISTRY = {
  [argumentative.type]: argumentative,
  [continuation.type]: continuation,
  [narrative.type]: narrative,
  [picture_writing.type]: picture_writing,
  [letter.type]: letter,
  [notice.type]: notice,
  [expository.type]: expository,
  [speech.type]: speech,
  [summary.type]: summary,
  [diary.type]: diary,
  [chart_writing.type]: chart_writing,
  [report.type]: report,
  [proposal.type]: proposal,
  [review.type]: review,
  [general.type]: general,
};

export const getTypeMeta = (type) => TYPE_REGISTRY[type] || TYPE_REGISTRY['general'];
export const getTypePrompt = (type) => getTypeMeta(type)?.prompt || '';
export const getTypeLabel = (type) => getTypeMeta(type)?.label || '未知类型';
export const getTypeColor = (type) => getTypeMeta(type)?.color || '#6b7280';

export const expandTypeColor = (type) => {
  const hex = getTypeColor(type);
  return {
    text: hex,
    bg: hex + '15',
    border: hex + '40',
    light: hex + '08',
    medium: hex + '25'
  };
};

export const TYPE_PROMPTS = Object.fromEntries(
  Object.entries(TYPE_REGISTRY).map(([key, meta]) => [key, meta.prompt])
);
export const TYPE_LABELS = Object.fromEntries(
  Object.entries(TYPE_REGISTRY).map(([key, meta]) => [key, meta.label])
);
export const TYPE_COLORS = Object.fromEntries(
  Object.entries(TYPE_REGISTRY).map(([key, meta]) => [key, meta.color])
);
