const TASK_SUBMISSION_STATUSES = new Set(['submitted', 'grading', 'returned']);

export const STYLE_TAG = `@keyframes spin { to { transform: rotate(360deg); } }`;

export function WritingPanelFallback({ minHeight = 220 }) {
  return (
    <div
      style={{
        minHeight,
        borderRadius: 24,
        border: '1px solid rgba(99, 74, 39, 0.1)',
        background: 'linear-gradient(180deg, #fffdfa 0%, #fff 100%)',
        boxShadow: '0 18px 42px rgba(60,40,10,0.08)',
      }}
    />
  );
}

export function createImageInput({ accept = "image/*", capture, multiple = false, onChange }) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = multiple;
  if (capture) input.capture = capture;
  input.onchange = onChange;
  input.click();
}

export function buildHeroModel({ enableSubstituteUpload, guestSourceMode, writingSourceMode, isTaskMode }) {
  const sourceMode = writingSourceMode || guestSourceMode;
  const isBankMode = sourceMode === 'bank';
  const title = enableSubstituteUpload ? '代学生上传' : (isBankMode ? '题库练兵，考场不慌。' : '写作批改，看见进步。');
  const kicker = enableSubstituteUpload ? '筑巢写作 · 代传' : (isBankMode ? '筑巢写作 · 实战' : '筑巢写作 · 批改');
  const description = enableSubstituteUpload
    ? '选择班级和学生，代学生提交作文并保留批改记录。'
    : (isBankMode ? '从题库选题，限时完成，模拟真实考场节奏。' : '填写题目与作文，获取结构、语言和提分建议。');

  return {
    kicker,
    title,
    subtitle: isTaskMode ? '' : description,
  };
}

export function hasTaskSubmission({ currentTaskContext, feedback }) {
  if (!currentTaskContext) return false;
  const status = String(currentTaskContext.status || '').toLowerCase();
  return Boolean(
    currentTaskContext.writingId ||
    TASK_SUBMISSION_STATUSES.has(status) ||
    feedback?.summary ||
    feedback?.totalScore !== undefined
  );
}
