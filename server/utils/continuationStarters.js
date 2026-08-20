function splitPromptLines(promptText = '') {
  return String(promptText || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isParagraphLabelLine(line = '') {
  return /^para(?:graph)?\s*[12]\s*[:：]?$/i.test(line);
}

function stripParagraphLabelPrefix(line = '') {
  return String(line || '').replace(/^para(?:graph)?\s*[12]\s*[:：]?\s*/i, '').trim();
}

function isFormatHintLine(line = '') {
  return /请按如下格式|相应位置作答|答题卡|答题纸|所给段落开头语/i.test(String(line || ''));
}

function isIgnorableStarterLine(line = '') {
  const normalized = String(line || '').trim();
  if (!normalized) return true;
  if (/^(注意|note|要求|tips?)[:：]/i.test(normalized)) return true;
  if (isParagraphLabelLine(normalized)) return true;
  if (/^[_—-]{3,}$/.test(normalized)) return true;
  if (/^\d+\.\s*$/.test(normalized)) return true;
  return false;
}

function toStarterCandidate(line = '') {
  const normalized = stripParagraphLabelPrefix(String(line || '').trim());
  if (isIgnorableStarterLine(normalized)) return '';
  if (!/[A-Za-z]/.test(normalized)) return '';
  if (!(/[.!?。！？]["')\]]?$/.test(normalized) || /\b[A-Za-z]{3,}\b/.test(normalized))) return '';
  return normalized;
}

export function extractContinuationStarters(promptText = '') {
  const lines = splitPromptLines(promptText);
  const lastParagraphLabelIndex = lines.reduce((lastIndex, line, index) => (
    /^(para(?:graph)?\s*[12]\s*[:：]?)/i.test(line) ? index : lastIndex
  ), -1);
  const lastFormatHintIndex = lines.reduce((lastIndex, line, index) => (
    isFormatHintLine(line) ? index : lastIndex
  ), -1);
  const regionStartIndex = Math.max(
    0,
    lastParagraphLabelIndex >= 0 ? lastParagraphLabelIndex - 1 : lastFormatHintIndex + 1
  );

  const tailCandidates = lines
    .slice(regionStartIndex)
    .map(toStarterCandidate)
    .filter(Boolean);

  if (tailCandidates.length >= 2) {
    return tailCandidates.slice(-2);
  }

  const allCandidates = lines
    .map(toStarterCandidate)
    .filter(Boolean);

  if (allCandidates.length < 2) return [];
  return allCandidates.slice(-2);
}

export function normalizeContinuationStarters(value) {
  if (!value) return null;
  let source = value;
  if (typeof source === 'string') {
    try {
      source = JSON.parse(source);
    } catch {
      console.warn('continuationStarters: failed to parse JSON value:', String(value).slice(0, 80));
      return null;
    }
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;

  const para1 = String(source.para1?.text || source.para1 || '').trim();
  const para2 = String(source.para2?.text || source.para2 || '').trim();
  if (!para1 || !para2) return null;
  return { para1, para2 };
}

export function continuationStarterArray(value) {
  if (Array.isArray(value)) {
    const starters = value.map((item) => String(item || '').trim()).filter(Boolean);
    return starters.length === 2 ? starters : [];
  }
  const normalized = normalizeContinuationStarters(value);
  return normalized ? [normalized.para1, normalized.para2] : [];
}

export function buildContinuationStartersPayload(type, promptText = '') {
  if (String(type || '').trim().toLowerCase() !== 'continuation') return '';
  const starters = extractContinuationStarters(promptText);
  if (starters.length !== 2) return '';
  return JSON.stringify({ para1: starters[0], para2: starters[1] });
}
