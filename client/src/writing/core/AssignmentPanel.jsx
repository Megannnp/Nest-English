import { typeColors, typeLabels } from './writingPrompts.js';
import AppIcon from '../../components/shared/AppIcon.jsx';
import { SecLbl } from '../../components/shared/UI.jsx';
import { inp } from '../../constants/index.jsx';

const sectionLabelStyle = { color: "#c69a48", letterSpacing: 1.5 };
const strongTextColor = '#3a2a18';
const bodyTextColor = '#8a7d6e';
const helperTextColor = '#a09080';
const placeholderTone = '#b8aea4';
const controlHeight = 48;
const cardControlStyle = {
  borderRadius: 16,
  padding: '10px 16px',
  minHeight: controlHeight,
  height: controlHeight,
  color: strongTextColor,
  background: '#faf8f5',
  border: '1px solid #d8cfc4',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
};

function PanelToggle({ isMobile, isTaskMode, onToggle, panelOpen }) {
  return (
    <button type="button"
      onClick={() => onToggle((current) => !current)}
      style={{
        width: '100%',
        padding: isMobile ? '14px 16px' : '15px 20px',
        background: 'transparent',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        borderBottom: panelOpen ? '1px solid rgba(138,90,31,0.08)' : 'none',
      }}
    >
      <span style={{ fontSize: isMobile ? 12 : 14, color: strongTextColor, fontWeight: 600 }}>
        {isTaskMode ? '任务信息' : '添加题目'}
      </span>
      <span style={{ color: '#a09080', fontSize: 11, transform: panelOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
    </button>
  );
}

function TaskOverview({ assignment, dueAt, isMobile }) {
  return (
    <div
      style={{
        border: '1px solid #ece3d8',
        borderRadius: 16,
        background: '#faf8f5',
        padding: isMobile ? '12px 14px' : '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <SecLbl style={{ ...sectionLabelStyle, margin: 0 }}>Task Overview · 任务信息</SecLbl>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <TaskOverviewField label="任务名称" value={assignment.title || '未命名任务'} />
        <TaskOverviewField label="满分" value={`${assignment.maxScore || 15} 分`} />
        <TaskOverviewField label="截止时间" value={dueAt ? new Date(dueAt).toLocaleString('zh-CN') : '未设置'} />
      </div>
      <div style={{ fontSize: 12, color: bodyTextColor, lineHeight: 1.7 }}>
        当前为任务模式：题目和满分已锁定，本次提交会计入老师布置的任务记录。
      </div>
    </div>
  );
}

function TaskOverviewField({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: helperTextColor, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: strongTextColor, lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

function ScoreMismatchHint({ hint }) {
  if (!hint) return null;

  return (
    <div
      style={{
        marginBottom: 10,
        padding: '10px 12px',
        borderRadius: 12,
        border: '1px solid #f0cc80',
        background: '#fff7ed',
        color: '#9a5a15',
        fontSize: 12,
        lineHeight: 1.7,
        fontWeight: 600,
      }}
    >
      题干里识别到当前题目更像是 <span style={{ fontWeight: 800 }}>{hint.inferredScore} 分</span>，
      你现在选择的是 <span style={{ fontWeight: 800 }}>{hint.currentScore} 分</span>。
      请确认后再提交。
    </div>
  );
}

function ScoreOptionButton({ active, label, option, onSetMaxOpt }) {
  return (
    <button
      type="button"
      onClick={() => onSetMaxOpt(option)}
      style={{
        minWidth: option === "custom" ? 78 : 66,
        minHeight: 44,
        padding: '0 12px',
        borderRadius: 18,
        border: active ? '2px solid #d6922a' : '1.5px solid #dccfbe',
        background: active ? '#fff8ee' : '#fff',
        color: active ? '#8b5e1a' : '#7c7064',
        fontSize: 13,
        fontWeight: active ? 700 : 500,
        cursor: 'pointer',
        boxShadow: 'none',
      }}
    >
      {label}
    </button>
  );
}

function ScoreSettings({ customMax, maxOpt, onSetCustomMax, onSetMaxOpt, scoreMismatchHint }) {
  return (
    <div>
      <label className="gm-analyzer-label">分值设置</label>
      <ScoreMismatchHint hint={scoreMismatchHint} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {["9", "15", "20", "25", "100", "custom"].map((option) => (
          <ScoreOptionButton
            key={option}
            active={maxOpt === option}
            label={option === "custom" ? "自定义" : `${option}`}
            option={option}
            onSetMaxOpt={onSetMaxOpt}
          />
        ))}

        {maxOpt === 'custom' ? (
          <input
            aria-label="自定义分值"
            value={customMax}
            onChange={(e) => onSetCustomMax(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
            placeholder="分值"
            style={{
              ...inp({ height: 36, borderRadius: 18 }),
              width: 84,
              padding: '0 12px',
              color: strongTextColor,
              background: '#fff',
              border: '1.5px solid #dccfbe',
              boxShadow: 'none',
              fontSize: 13,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function IconButton({ children, onClick, title, color = '#c69a48' }) {
  return (
    <button type="button"
      onClick={onClick}
      style={{
        fontSize: 15,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        minWidth: 44,
        minHeight: 44,
        padding: 0,
        borderRadius: 6,
        color,
        lineHeight: 1,
      }}
      title={title}
    >
      {children}
    </button>
  );
}

function TextActionButton({ children, onClick }) {
  return (
    <button type="button"
      aria-label={typeof children === 'string' ? children : undefined}
      onClick={onClick}
      style={{
        fontSize: 11,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        color: '#8a7d6e',
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}

function voiceToggleTitle(voiceSessionState) {
  if (voiceSessionState === "recording") return '暂停语音输入';
  if (voiceSessionState === "paused") return '继续语音输入';
  return '开始语音输入';
}

function PromptVoiceControls({
  isVoiceListening,
  onFinishPromptVoice,
  onRestartPromptVoice,
  onTogglePromptVoice,
  voiceSessionState,
}) {
  return (
    <>
      <IconButton
        onClick={onTogglePromptVoice}
        color={isVoiceListening ? '#2d9e6b' : '#c69a48'}
        title={voiceToggleTitle(voiceSessionState)}
      >
        <AppIcon name="mic" size={16} />
      </IconButton>
      {voiceSessionState !== "idle" ? (
        <>
          <TextActionButton onClick={onTogglePromptVoice}>{voiceSessionState === "paused" ? "继续" : "暂停"}</TextActionButton>
          <TextActionButton onClick={onRestartPromptVoice}>重录</TextActionButton>
          <TextActionButton onClick={onFinishPromptVoice}>完成</TextActionButton>
        </>
      ) : null}
    </>
  );
}

function PromptStatus({ isRecognizingPrompt, promptReadOnly, promptText, voiceStatus }) {
  if (promptReadOnly) return <span style={{ fontSize: 11, color: '#8a7d6e', fontWeight: 600 }}>已按任务锁定</span>;
  if (isRecognizingPrompt) return <span style={{ fontSize: 11, color: bodyTextColor, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 3 }}><AppIcon name="clock" size={11} />识别中...</span>;
  if (voiceStatus?.text) {
    return (
      <span
        style={{
          fontSize: 11,
          color: voiceStatus.tone === "active" ? "#2d9e6b" : voiceStatus.tone === "error" ? "#b02020" : "#8a7d6e",
          fontWeight: voiceStatus.tone === "active" ? 600 : 500,
        }}
      >
        {voiceStatus.text}
      </span>
    );
  }
  if (promptText) return <span style={{ fontSize: 11, color: '#2d9e6b', fontWeight: 600 }}>✓ 识别完成</span>;
  return null;
}

function PromptHeader({
  isMobile,
  isRecognizingPrompt,
  isVoiceListening,
  onFinishPromptVoice,
  onRestartPromptVoice,
  onTogglePromptVoice,
  onUploadPromptImages,
  promptReadOnly,
  promptText,
  voiceSessionState,
  voiceStatus,
  voiceSupported,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <label className="gm-analyzer-label">写作内容与要求</label>
      {!promptReadOnly ? <IconButton onClick={onUploadPromptImages} title={isMobile ? "拍照或从相册选取" : "上传图片识别题目"}><AppIcon name={isMobile ? "camera" : "folder-open"} size={16} /></IconButton> : null}
      {!promptReadOnly && voiceSupported ? (
        <PromptVoiceControls
          isVoiceListening={isVoiceListening}
          onFinishPromptVoice={onFinishPromptVoice}
          onRestartPromptVoice={onRestartPromptVoice}
          onTogglePromptVoice={onTogglePromptVoice}
          voiceSessionState={voiceSessionState}
        />
      ) : null}
      <PromptStatus
        isRecognizingPrompt={isRecognizingPrompt}
        promptReadOnly={promptReadOnly}
        promptText={promptText}
        voiceStatus={voiceStatus}
      />
    </div>
  );
}

function PromptTextArea({
  isMobile,
  onPromptKeyDown,
  onPromptPaste,
  onSetPromptText,
  promptReadOnly,
  promptText,
}) {
  return (
    <div
      style={{
        background: '#faf8f5',
        border: '1px solid #d8cfc4',
        borderRadius: 10,
        padding: isMobile ? '10px 12px' : '12px 14px',
      }}
    >
      <textarea
        aria-label="写作题目要求"
        value={promptText}
        onChange={(e) => onSetPromptText(e.target.value)}
        onPaste={promptReadOnly ? undefined : onPromptPaste}
        onKeyDown={promptReadOnly ? undefined : onPromptKeyDown}
        placeholder={promptReadOnly ? "当前任务题目已锁定，不能编辑。" : "在此输入或粘贴题目要求，或点击上方图标上传图片识别..."}
        readOnly={promptReadOnly}
        style={{
          width: '100%',
          minHeight: 80,
          padding: 0,
          background: 'transparent',
          border: 'none',
          resize: 'vertical',
          fontSize: 14,
          color: promptReadOnly ? '#6f6253' : strongTextColor,
          lineHeight: 1.6,
          outline: 'none',
          fontFamily: 'sans-serif',
          cursor: promptReadOnly ? 'default' : 'text',
        }}
      />
    </div>
  );
}

function PromptRequirementSection(props) {
  return (
    <div>
      <PromptHeader {...props} />
      <PromptTextArea {...props} />
    </div>
  );
}

function SmartTagsPlaceholder() {
  return (
    <p style={{ margin: 0, fontSize: 12, color: placeholderTone, lineHeight: 1.65 }}>
      <span style={{ fontWeight: 700, color: bodyTextColor }}>智能标签：</span>
      {' '}上传照片或粘贴图片，或输入上述作文内容和要求（30字以上）后按回车，AI 将自动识别类型和主题
    </p>
  );
}

function SmartTypeBadge({ aiAnalysis }) {
  return (
    <span
      style={{
        padding: '4px 12px', borderRadius: 16,
        background: typeColors[aiAnalysis.type]?.bg || typeColors.general.bg,
        color: typeColors[aiAnalysis.type]?.text || typeColors.general.text,
        border: `1px solid ${typeColors[aiAnalysis.type]?.border || typeColors.general.border}`,
        fontSize: 13, fontWeight: 600,
      }}
    >
      {typeLabels[aiAnalysis.type] || '未知类型'}
      {aiAnalysis.confidence && (
        <span style={{ fontSize: 10, opacity: 0.8, marginLeft: 4 }}>
          {Math.round(aiAnalysis.confidence * 100)}%
        </span>
      )}
    </span>
  );
}

function SmartTagsResult({
  aiAnalysis,
  manualType,
  onSetManualType,
  onToggleManualCorrect,
  showManualCorrect,
}) {
  const themes = aiAnalysis.theme ? [aiAnalysis.theme] : (aiAnalysis.themes || []).slice(0, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label className="gm-analyzer-label" style={{ marginBottom: 0 }}>
        智能标签 <span style={{ fontSize: 11, color: '#2d9e6b', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>✓ 识别完成</span>
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <SmartTypeBadge aiAnalysis={aiAnalysis} />
        {themes.map((theme, i) => (
          <span key={i} style={{ padding: '3px 10px', borderRadius: 12, background: '#fdf0d8', color: '#8b5e1a', fontSize: 12, border: '1px solid #f0cc80' }}>
            {theme}
          </span>
        ))}
        {manualType && manualType !== aiAnalysis.type && (
          <span style={{ fontSize: 11, color: '#1a7a4a', background: '#d1fae5', padding: '2px 8px', borderRadius: 8 }}>
            ✓ 已纠正为{typeLabels[manualType]}
          </span>
        )}
        <button type="button"
          onClick={() => onToggleManualCorrect(!showManualCorrect)}
          style={{ fontSize: 11, color: helperTextColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {showManualCorrect ? '▲' : '▶'} 修正
        </button>
      </div>
      {showManualCorrect && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={manualType}
            onChange={(e) => onSetManualType(e.target.value)}
            style={{ ...inp({ maxWidth: 168, fontSize: 13, ...cardControlStyle }) }}
          >
            <option value="">选择正确类型...</option>
            {Object.entries(typeLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <button type="button"
            onClick={() => onSetManualType('')}
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #d8cfc4', background: '#fff', color: bodyTextColor, cursor: 'pointer' }}
          >
            重置
          </button>
        </div>
      )}
    </div>
  );
}

function SmartTagsSection({
  aiAnalysis,
  isRecognizingTags,
  manualType,
  onSetManualType,
  onToggleManualCorrect,
  showManualCorrect,
  showSmartTags,
}) {
  if (!showSmartTags) return null;

  return (
    <div>
      {isRecognizingTags ? (
        <p style={{ margin: 0, fontSize: 12, color: bodyTextColor }}>⏳ 识别中...</p>
      ) : !aiAnalysis ? (
        <SmartTagsPlaceholder />
      ) : (
        <SmartTagsResult
          aiAnalysis={aiAnalysis}
          manualType={manualType}
          onSetManualType={onSetManualType}
          onToggleManualCorrect={onToggleManualCorrect}
          showManualCorrect={showManualCorrect}
        />
      )}
    </div>
  );
}

function AssignmentPanelContent({
  aiAnalysis,
  assignment,
  customMax,
  isMobile,
  isRecognizingPrompt,
  isRecognizingTags,
  isTaskMode,
  isVoiceListening,
  manualType,
  maxOpt,
  onFinishPromptVoice,
  onPromptKeyDown,
  onPromptPaste,
  onRestartPromptVoice,
  onSetCustomMax,
  onSetManualType,
  onSetMaxOpt,
  onSetPromptText,
  onToggleManualCorrect,
  onTogglePromptVoice,
  onUploadPromptImages,
  promptReadOnly,
  promptText,
  scoreMismatchHint,
  showManualCorrect,
  showSmartTags,
  taskContext,
  voiceSessionState,
  voiceStatus,
  voiceSupported,
}) {
  return (
    <div
      style={{
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 16 : 22,
        borderTop: 'none',
      }}
    >
      {isTaskMode ? <TaskOverview assignment={assignment} dueAt={taskContext?.dueAt} isMobile={isMobile} /> : null}
      {!isTaskMode ? (
        <ScoreSettings
          customMax={customMax}
          maxOpt={maxOpt}
          onSetCustomMax={onSetCustomMax}
          onSetMaxOpt={onSetMaxOpt}
          scoreMismatchHint={scoreMismatchHint}
        />
      ) : null}

      <PromptRequirementSection
        isMobile={isMobile}
        isRecognizingPrompt={isRecognizingPrompt}
        isVoiceListening={isVoiceListening}
        onFinishPromptVoice={onFinishPromptVoice}
        onPromptKeyDown={onPromptKeyDown}
        onPromptPaste={onPromptPaste}
        onRestartPromptVoice={onRestartPromptVoice}
        onSetPromptText={onSetPromptText}
        onTogglePromptVoice={onTogglePromptVoice}
        onUploadPromptImages={onUploadPromptImages}
        promptReadOnly={promptReadOnly}
        promptText={promptText}
        voiceSessionState={voiceSessionState}
        voiceStatus={voiceStatus}
        voiceSupported={voiceSupported}
      />

      <SmartTagsSection
        aiAnalysis={aiAnalysis}
        isRecognizingTags={isRecognizingTags}
        manualType={manualType}
        onSetManualType={onSetManualType}
        onToggleManualCorrect={onToggleManualCorrect}
        showManualCorrect={showManualCorrect}
        showSmartTags={showSmartTags}
      />
    </div>
  );
}

export default function AssignmentPanel({
  isMobile = false,
  open,
  onToggle,
  forceExpanded = false,
  taskContext = null,
  _selectedQId,
  maxOpt,
  customMax,
  onSetMaxOpt,
  onSetCustomMax,
  questions: _questions = [],
  _onSelectQuestion,
  _writingTitle,
  _onSetWritingTitle,
  promptText,
  onSetPromptText,
  isRecognizingPrompt,
  onUploadPromptImages,
  onPromptPaste,
  onPromptKeyDown,
  voiceSupported,
  isVoiceListening,
  voiceSessionState = "idle",
  voiceStatus = { text: "", tone: "" },
  onTogglePromptVoice,
  onRestartPromptVoice,
  onFinishPromptVoice,
  aiAnalysis,
  isRecognizingTags,
  scoreMismatchHint = null,
  showSmartTags = true,
  manualType,
  showManualCorrect,
  onToggleManualCorrect,
  onSetManualType,
}) {
  const isTaskMode = Boolean(taskContext);
  const assignment = taskContext?.assignment || {};
  const panelOpen = forceExpanded ? true : open;
  const promptReadOnly = isTaskMode;

  return (
    <div
      style={{
        border: 'none',
        borderRadius: 0,
        background: 'transparent',
        overflow: 'visible',
        boxShadow: 'none',
      }}
    >
      {!forceExpanded ? (
        <PanelToggle
          isMobile={isMobile}
          isTaskMode={isTaskMode}
          onToggle={onToggle}
          panelOpen={panelOpen}
        />
      ) : null}

      {panelOpen ? (
        <AssignmentPanelContent
          aiAnalysis={aiAnalysis}
          assignment={assignment}
          customMax={customMax}
          isMobile={isMobile}
          isRecognizingPrompt={isRecognizingPrompt}
          isRecognizingTags={isRecognizingTags}
          isTaskMode={isTaskMode}
          isVoiceListening={isVoiceListening}
          manualType={manualType}
          maxOpt={maxOpt}
          onFinishPromptVoice={onFinishPromptVoice}
          onPromptKeyDown={onPromptKeyDown}
          onPromptPaste={onPromptPaste}
          onRestartPromptVoice={onRestartPromptVoice}
          onSetCustomMax={onSetCustomMax}
          onSetManualType={onSetManualType}
          onSetMaxOpt={onSetMaxOpt}
          onSetPromptText={onSetPromptText}
          onToggleManualCorrect={onToggleManualCorrect}
          onTogglePromptVoice={onTogglePromptVoice}
          onUploadPromptImages={onUploadPromptImages}
          promptReadOnly={promptReadOnly}
          promptText={promptText}
          scoreMismatchHint={scoreMismatchHint}
          showManualCorrect={showManualCorrect}
          showSmartTags={showSmartTags}
          taskContext={taskContext}
          voiceSessionState={voiceSessionState}
          voiceStatus={voiceStatus}
          voiceSupported={voiceSupported}
        />
      ) : null}
    </div>
  );
}
