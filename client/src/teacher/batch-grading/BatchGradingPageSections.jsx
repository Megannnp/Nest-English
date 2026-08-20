import { XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';


import {
  getCategoryScoreLabel,
  getPrimaryHighlight,
  getPrimaryImprovement,
  getQuickActionList,
  getQuickProblemList,
  THEME,
} from './shared.js';
import { writingsAPI } from '../../api/index.js';
import AppIcon from '../../components/shared/AppIcon.jsx';
import { SURFACE_SPACING } from '../../constants/index.jsx';

function StudentSearchSelect({ studentOptions, value, fallbackText = '', onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  const selectedOption = studentOptions.find((student) => student.key === value);
  const displayText = selectedOption ? selectedOption.name : fallbackText;

  const filtered = query.trim().length > 0
    ? studentOptions.filter((student) => (
      student.name.includes(query.trim()) || student.label.includes(query.trim())
    ))
    : studentOptions;

  useEffect(() => {
    const handler = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (rect) {
      setDropPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200) });
    }
    setQuery('');
    setOpen(true);
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <input
        ref={inputRef}
        aria-label="筛选学生"
        value={open ? query : displayText}
        onChange={(event) => {
          setQuery(event.target.value);
          if (!open) handleOpen();
        }}
        onFocus={handleOpen}
        placeholder={displayText || '输入姓名筛选...'}
        style={{
          fontSize: 12,
          padding: '4px 10px',
          borderRadius: 8,
          border: `1px solid ${value ? THEME.primary : THEME.border}`,
          background: value ? '#fffaf2' : THEME.card,
          color: THEME.text,
          width: 120,
          outline: 'none',
        }}
      />
      {value && (
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect('');
            setQuery('');
            setOpen(false);
          }}
          style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, border: `1px solid ${THEME.border}`, background: 'transparent', color: THEME.textMuted, cursor: 'pointer' }}
        >
          ✕
        </button>
      )}
      {open && filtered.length > 0 && createPortal(
        <div
          onMouseDown={(event) => event.preventDefault()}
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            zIndex: 99999,
            background: '#fffdf9',
            border: `1px solid ${THEME.border}`,
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(42,31,20,0.14)',
            maxHeight: 220,
            overflowY: 'auto',
            padding: 4,
          }}
        >
          {filtered.map((student) => (
            <button
              key={student.key}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(student.key);
                setQuery('');
                setOpen(false);
              }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 8, border: 'none', background: student.key === value ? '#f4f0e9' : 'transparent', color: THEME.text, fontSize: 13, cursor: 'pointer' }}
              onMouseEnter={(event) => { event.currentTarget.style.background = '#f4f0e9'; }}
              onMouseLeave={(event) => { event.currentTarget.style.background = student.key === value ? '#f4f0e9' : 'transparent'; }}
            >
              <span style={{ fontWeight: 600 }}>{student.name}</span>
              <span style={{ fontSize: 11, color: THEME.textMuted, marginLeft: 6 }}>
                {student.label.split('·').pop()?.trim()}
              </span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

function DiagnosticModalHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: THEME.text }}>识别文本 / 诊断信息</div>
        <div style={{ marginTop: 4, fontSize: 12, color: THEME.textMuted, lineHeight: 1.7 }}>{title}</div>
      </div>
      <button
        type="button"
        onClick={onClose}
        style={{ border: `1px solid ${THEME.border}`, background: THEME.cardAlt, color: THEME.textMuted, width: 36, height: 36, borderRadius: 999, cursor: 'pointer', fontSize: 18, flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}

function DiagnosticMetaCard({ label, value, tone = THEME.text }) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 12, background: THEME.cardAlt, border: `1px solid ${THEME.border}` }}>
      <div style={{ fontSize: 11, color: THEME.textMuted, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: tone }}>{value}</div>
    </div>
  );
}

function DiagnosticMetaSection({ detailWriting, writingImage, feedback }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: writingImage ? 'minmax(0, 180px) minmax(0, 1fr)' : '1fr', gap: 12 }}>
      {writingImage ? (
        <div style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${THEME.border}`, background: THEME.cardAlt }}>
          <img src={writingImage} alt="" style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
        </div>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <DiagnosticMetaCard label="学生" value={detailWriting?.userName || '未知学生'} />
        <DiagnosticMetaCard label="班级" value={detailWriting?.className || '未关联班级'} />
        <DiagnosticMetaCard label="识别字数" value={detailWriting?.wordCount || 0} />
        <DiagnosticMetaCard
          label="当前得分"
          value={(
            <>
              {feedback?.totalScore ?? '--'}
              <span style={{ fontSize: 11, color: THEME.textMuted }}> / {detailWriting?.maxScore ?? '--'}</span>
            </>
          )}
          tone={THEME.primary}
        />
      </div>
    </div>
  );
}

function DiagnosticTextBlock({ title, content, fallback }) {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 12, background: '#fffdf9', border: `1px solid ${THEME.border}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.primaryDark, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: THEME.text, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {content || fallback}
      </div>
    </div>
  );
}

function DiagnosticModalBody({ detailWriting, writingImage, feedback, promptText, recognizedText, errorMessage }) {
  return (
    <>
      <DiagnosticMetaSection detailWriting={detailWriting} writingImage={writingImage} feedback={feedback} />

      {errorMessage ? (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: THEME.errorLight, color: THEME.error, fontSize: 12, lineHeight: 1.7 }}>
          <strong>失败原因：</strong>{errorMessage}
        </div>
      ) : null}

      {feedback?.summary ? (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: '#fffaf2', border: `1px solid ${THEME.border}`, color: THEME.text, fontSize: 12, lineHeight: 1.8 }}>
          <strong style={{ color: THEME.primaryDark }}>基础诊断摘要：</strong>{feedback.summary}
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 10 }}>
        <DiagnosticTextBlock title="题目 / 写作要求" content={promptText} fallback="当前没有记录到题目要求。" />
        <DiagnosticTextBlock
          title="识别文本"
          content={recognizedText}
          fallback="当前还没有识别出可用正文。这个区域为空时，通常说明图片识别结果不足，AI 分数也会明显偏低。"
        />
      </div>
    </>
  );
}

function DiagnosticStatusBlock({ loading, loadError }) {
  if (loading) {
    return <div style={{ fontSize: 13, color: THEME.textMuted, padding: '18px 4px' }}>正在读取诊断信息...</div>;
  }

  if (loadError) {
    return (
      <div style={{ padding: '10px 12px', borderRadius: 10, background: THEME.errorLight, color: THEME.error, fontSize: 12, lineHeight: 1.7 }}>
        {loadError}
      </div>
    );
  }

  return null;
}

function buildDiagnosticModalBodyProps(detailWriting, errorMessage) {
  return {
    detailWriting,
    writingImage: detailWriting?.image?.ossUrl || null,
    feedback: detailWriting?.feedback || null,
    promptText: String(detailWriting?.promptText || '').trim(),
    recognizedText: String(detailWriting?.fullText || detailWriting?.textSnippet || '').trim(),
    errorMessage,
  };
}

function DiagnosticModal({ detailWriting, errorMessage = '', fileName = '', loading = false, loadError = '', onClose }) {
  if (!detailWriting && !loading && !loadError) return null;
  const title = detailWriting?.writingTitle || fileName || '当前作文';
  const shouldShowBody = !loading && !loadError;
  const modalBodyProps = shouldShowBody ? buildDiagnosticModalBodyProps(detailWriting, errorMessage) : null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
      }}
    >
      <button type="button" aria-label="关闭诊断弹窗" onClick={onClose} style={{ position: 'fixed', inset: 0, border: 0, padding: 0, background: 'rgba(22, 18, 12, 0.52)' }} />
      <div
        style={{
          position: 'relative',
          width: 'min(760px, 100%)',
          maxHeight: '88vh',
          overflowY: 'auto',
          background: '#fffdf9',
          borderRadius: 18,
          border: `1px solid ${THEME.border}`,
          boxShadow: '0 24px 64px rgba(42,31,20,0.18)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <DiagnosticModalHeader title={title} onClose={onClose} />
        <DiagnosticStatusBlock loading={loading} loadError={loadError} />
        {shouldShowBody ? <DiagnosticModalBody {...modalBodyProps} /> : null}
      </div>
    </div>,
    document.body
  );
}

function buildDiagnosticDetailWriting({ detailWriting, item, fileName }) {
  if (detailWriting) {
    return {
      ...detailWriting,
      fullText: detailWriting.fullText || item.recognizedText || '',
      textSnippet: detailWriting.textSnippet || (item.recognizedText ? item.recognizedText.slice(0, 500) : ''),
    };
  }
  if (!item.recognizedText) return null;
  return {
    fullText: item.recognizedText,
    textSnippet: item.recognizedText.slice(0, 500),
    maxScore: item.feedback?.maxScore || null,
    feedback: item.feedback || null,
    userName: item.studentName || item.detectedName || '',
    className: '',
    writingTitle: fileName,
    promptText: '',
    wordCount: String(item.recognizedText).trim().split(/\s+/).filter(Boolean).length,
    image: null,
  };
}

function EssayPreview({ item, onOpen }) {
  if (item.preview) {
    return (
      <img
        src={item.preview}
        alt=""
        onClick={onOpen}
        style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, border: `1px solid ${THEME.border}`, flexShrink: 0, cursor: 'zoom-in' }}
      />
    );
  }

  return (
    <div style={{ width: 44, height: 44, borderRadius: 8, border: `1px solid ${THEME.border}`, flexShrink: 0, display: 'grid', placeItems: 'center', background: THEME.card, color: THEME.primaryDark, fontSize: 18, fontWeight: 800 }}>
      文
    </div>
  );
}

function EssayStudentField({
  item,
  idx,
  canEdit,
  studentOptions,
  onStudentSelect,
  onNameChange,
  onRetryOCR,
}) {
  if (item.status === 'pending') {
    return <span style={{ fontSize: 11, color: THEME.textMuted }}>OCR识别后填写姓名</span>;
  }

  if (!canEdit) {
    return <span style={{ fontSize: 12, fontWeight: 600, color: THEME.primaryDark, display: 'inline-flex', alignItems: 'center', gap: 4 }}><AppIcon name="account" size={14} /> {item.studentName || item.detectedName || '未知'}</span>;
  }

  if (studentOptions.length > 0) {
    return (
      <>
        <StudentSearchSelect
          studentOptions={studentOptions}
          value={item.studentTargetKey || ''}
          fallbackText={item.studentName || item.detectedName || ''}
          onSelect={(key) => onStudentSelect(idx, key)}
        />
        {(item.status === 'error' || !item.studentTargetKey) ? (
          <button type="button"
            onClick={() => onRetryOCR(idx)}
            title="重新识别作文"
            style={{ fontSize: 13, padding: '2px 6px', borderRadius: 6, border: `1px solid ${THEME.border}`, background: 'transparent', color: THEME.textMuted, cursor: 'pointer', lineHeight: 1 }}
          >
            ↺
          </button>
        ) : null}
      </>
    );
  }

  return (
    <input
      aria-label="学生姓名"
      value={item.studentName || ''}
      onChange={(event) => onNameChange(idx, event.target.value)}
      placeholder={item.detectedName ? `AI: ${item.detectedName}` : '输入姓名'}
      style={{ fontSize: 12, padding: '2px 10px', borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, width: 110 }}
    />
  );
}

function EssayCardActions({ item, expanded, onToggleExpanded, onOpenDiagnostic, onRemove, idx }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {item.writingId ? (
        <button type="button"
          onClick={onOpenDiagnostic}
          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, border: `1px solid ${THEME.border}`, background: '#fffaf2', color: THEME.primaryDark, cursor: 'pointer' }}
        >
          诊断
        </button>
      ) : null}
      {item.feedback ? (
        <button type="button" aria-label={expanded ? '收起批改结果' : '查看批改结果'} onClick={onToggleExpanded} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, border: `1px solid ${THEME.border}`, background: 'transparent', color: THEME.textMuted, cursor: 'pointer' }}>
          {expanded ? '收起' : '查看'}
        </button>
      ) : null}
      {['pending', 'confirm', 'error'].includes(item.status) ? (
        <button type="button" aria-label="移除作文" onClick={() => onRemove(idx)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, border: '1px solid #fca5a5', background: '#fdf0ef', color: '#b02020', cursor: 'pointer' }}>✕</button>
      ) : null}
    </div>
  );
}

function EssayPreviewOverlay({ preview, onClose }) {
  if (!preview) return null;
  return (
    <button type="button" aria-label="关闭作文图片预览" onClick={onClose} style={{ position: 'fixed', inset: 0, border: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 'calc(12px + env(safe-area-inset-top, 0px)) 12px calc(12px + env(safe-area-inset-bottom, 0px))' }}>
      <img src={preview} alt="" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 12, objectFit: 'contain' }}/>
    </button>
  );
}

function EssayStatusSummary({ item, status }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: status.bg, color: status.color }}>{status.label}</span>
      {item.feedback?.totalScore !== undefined ? (
        <span style={{ fontSize: 15, fontWeight: 800, color: THEME.primary }}>
          {item.feedback.totalScore}
          <span style={{ fontSize: 10, color: THEME.textMuted }}>/{item.feedback.maxScore}</span>
        </span>
      ) : null}
    </div>
  );
}

function EssayCardHeader({
  item,
  idx,
  fileName,
  isMobile,
  canEdit,
  studentOptions,
  onStudentSelect,
  onNameChange,
  onRetryOCR,
  status,
  expanded,
  onToggleExpanded,
  onOpenDiagnostic,
  onRemove,
  onOpenPreview,
}) {
  return (
    <div style={{ padding: isMobile ? '10px 12px' : '12px 16px', display: 'flex', alignItems: 'center', gap: 10, background: THEME.cardAlt }}>
      <EssayPreview item={item} onOpen={onOpenPreview} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: THEME.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap', lineHeight: isMobile ? 1.45 : 1.2, wordBreak: 'break-word' }}>{fileName}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <EssayStudentField
            item={item}
            idx={idx}
            canEdit={canEdit}
            studentOptions={studentOptions}
            onStudentSelect={onStudentSelect}
            onNameChange={onNameChange}
            onRetryOCR={onRetryOCR}
          />
        </div>
      </div>
      <EssayStatusSummary item={item} status={status} />
      <EssayCardActions
        item={item}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        onOpenDiagnostic={onOpenDiagnostic}
        onRemove={onRemove}
        idx={idx}
      />
    </div>
  );
}

function FeedbackListBlock({ title, color, background, border, values = [] }) {
  if (values.length === 0) return null;
  return (
    <div style={{ background, borderRadius: 8, border, padding: '10px 12px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 6 }}>{title}</div>
      {values.slice(0, 3).map((value, index) => (
        <div key={index} style={{ fontSize: 12, color: THEME.text, lineHeight: 1.7 }}>{index + 1}. {value}</div>
      ))}
    </div>
  );
}

function FeedbackCategoryBadges({ categories = [] }) {
  if (categories.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {categories.map((category, index) => (
        <span key={index} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: THEME.primaryLight, color: THEME.primaryDark }}>
          {category.icon} {category.name} · {getCategoryScoreLabel(category)}{category.grade ? ` · ${category.grade}` : ''}
        </span>
      ))}
    </div>
  );
}

function FeedbackCategoryCards({ categories = [], isMobile }) {
  if (categories.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
      {categories.map((category, index) => (
        <div key={index} style={{ padding: '8px 10px', borderRadius: 8, background: '#fffdf9', border: `1px solid ${THEME.border}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.primaryDark, marginBottom: 4 }}>{category.icon} {category.name} · {getCategoryScoreLabel(category)}{category.grade ? ` · ${category.grade}` : ''}</div>
          <div style={{ fontSize: 12, color: THEME.text, lineHeight: 1.65 }}>{category.comment || '暂无点评'}</div>
        </div>
      ))}
    </div>
  );
}

function EssayExpandedFeedback({ feedback, isMobile }) {
  const primaryHighlight = getPrimaryHighlight(feedback);
  const primaryImprovement = getPrimaryImprovement(feedback);
  const problemList = getQuickProblemList(feedback);
  const actionList = getQuickActionList(feedback);
  const categories = itemCategories(feedback);

  return (
    <div style={{ padding: '12px 14px', borderTop: `1px solid ${THEME.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 13, color: THEME.text, lineHeight: 1.7, background: THEME.cardAlt, padding: '8px 12px', borderRadius: 8 }}>{feedback.summary}</div>
      {primaryHighlight ? <div style={{ fontSize: 12, color: THEME.success, lineHeight: 1.7, background: '#f3fbf6', padding: '8px 12px', borderRadius: 8, border: '1px solid #d7f3df' }}><strong>最值得肯定：</strong>{primaryHighlight}</div> : null}
      {primaryImprovement ? <div style={{ fontSize: 12, color: '#8b5e1a', lineHeight: 1.7, background: '#fffaf2', padding: '8px 12px', borderRadius: 8, border: '1px solid #f1dfb9' }}><strong>优先修改：</strong>{primaryImprovement}</div> : null}
      <FeedbackListBlock title="主要问题" color="#b45309" background="#fff8f4" border={`1px solid ${THEME.border}`} values={problemList} />
      <FeedbackListBlock title="下一步动作" color={THEME.success} background="#f6fbf7" border="1px solid #d7f3df" values={actionList} />
      {categories.length > 0 ? (
        <>
          <FeedbackCategoryBadges categories={categories} />
          <FeedbackCategoryCards categories={categories} isMobile={isMobile} />
        </>
      ) : null}
    </div>
  );
}

function itemCategories(feedback) {
  return Array.isArray(feedback?.categories) ? feedback.categories : [];
}

export function EssayCard({
  item,
  idx,
  studentOptions,
  onStudentSelect,
  onNameChange,
  onRemove,
  onRetryOCR,
  isMobile,
  statusMap,
}) {
  const status = statusMap[item.status] || statusMap.pending;
  const [expanded, setExpanded] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState('');
  const [detailWriting, setDetailWriting] = useState(null);
  const canEdit = ['confirm', 'error'].includes(item.status);
  const fileName = item.file?.name || item.studentName || item.writingId || '已接回作文记录';
  const diagnosticDetailWriting = buildDiagnosticDetailWriting({ detailWriting, item, fileName });
  const borderColor = item.status === 'done' ? '#a7f3d0' : item.status === 'error' ? '#fca5a5' : THEME.border;

  const handleOpenDiagnostic = async () => {
    if (!item.writingId) return;
    setDiagnosticOpen(true);
    if (detailWriting || diagnosticLoading) return;
    setDiagnosticLoading(true);
    setDiagnosticError('');
    try {
      const detail = await writingsAPI.get(item.writingId);
      setDetailWriting(detail);
    } catch (error) {
      setDiagnosticError(error?.message || '暂时无法读取识别文本和诊断信息');
    } finally {
      setDiagnosticLoading(false);
    }
  };

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${borderColor}`, background: THEME.card, overflow: 'hidden' }}>
      {diagnosticOpen ? (
        <DiagnosticModal
          detailWriting={diagnosticDetailWriting}
          errorMessage={item.errorMsg || ''}
          fileName={fileName}
          loading={diagnosticLoading}
          loadError={diagnosticError}
          onClose={() => setDiagnosticOpen(false)}
        />
      ) : null}
      {previewOpen ? <EssayPreviewOverlay preview={item.preview} onClose={() => setPreviewOpen(false)} /> : null}
      <EssayCardHeader
        item={item}
        idx={idx}
        fileName={fileName}
        isMobile={isMobile}
        canEdit={canEdit}
        studentOptions={studentOptions}
        onStudentSelect={onStudentSelect}
        onNameChange={onNameChange}
        onRetryOCR={onRetryOCR}
        status={status}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((open) => !open)}
        onOpenDiagnostic={handleOpenDiagnostic}
        onRemove={onRemove}
        onOpenPreview={() => setPreviewOpen(true)}
      />
      {expanded && item.feedback ? <EssayExpandedFeedback feedback={item.feedback} isMobile={isMobile} /> : null}
      {item.status === 'error' && item.errorMsg && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid #fca5a5', background: THEME.errorLight, fontSize: 12, color: THEME.error }}><XCircle size={13} strokeWidth={2} style={{ flexShrink: 0, marginRight: 4, verticalAlign: 'middle' }} />{item.errorMsg}</div>
      )}
    </div>
  );
}

export function ClassSummaryReport({ items, questionTitle, isMobile }) {
  const done = items.filter((item) => item.status === 'done' && item.feedback);
  if (done.length === 0) return null;
  const scores = done.map((item) => item.feedback.totalScore).filter((score) => score != null);
  const avg = scores.length ? (scores.reduce((left, right) => left + right, 0) / scores.length).toFixed(1) : '--';
  const max = scores.length ? Math.max(...scores) : '--';
  const min = scores.length ? Math.min(...scores) : '--';

  return (
    <div style={{ background: THEME.card, borderRadius: 14, border: `1px solid ${THEME.border}`, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '14px 18px', background: THEME.primaryLight, borderBottom: '1px solid #f0cc80', display: 'flex', alignItems: 'center', gap: 10 }}>
        <AppIcon name="chart" size={20} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: THEME.primaryDark }}>班级汇总报告</div>
          <div style={{ fontSize: 12, color: THEME.textMuted }}>{questionTitle || '本次作文'} · {done.length} 人完成</div>
        </div>
      </div>
      <div style={{ padding: isMobile ? 14 : 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
          {[{ label: '平均分', value: avg, color: THEME.primary }, { label: '最高分', value: max, color: THEME.success }, { label: '最低分', value: min, color: THEME.error }, { label: '完成人数', value: done.length, color: '#3b82f6' }].map((stat, index) => (
            <div key={index} style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 12, background: THEME.cardAlt, border: `1px solid ${THEME.border}` }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2 }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.primaryDark, marginBottom: 8 }}>成绩明细</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...done].sort((left, right) => (right.feedback.totalScore || 0) - (left.feedback.totalScore || 0)).map((item, index) => {
            const ratio = item.feedback.maxScore ? item.feedback.totalScore / item.feedback.maxScore : 0;
            const gradeColor = ratio >= 0.9 ? THEME.success : ratio >= 0.75 ? THEME.primary : ratio >= 0.6 ? '#d97706' : THEME.error;
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: THEME.cardAlt, border: `1px solid ${THEME.border}` }}>
                <span style={{ fontSize: 12, color: THEME.textMuted, minWidth: 20 }}>#{index + 1}</span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: THEME.text }}>{item.studentName || item.detectedName || '未知'}</span>
                {!isMobile && <div style={{ width: 80, height: 4, borderRadius: 2, background: THEME.border, overflow: 'hidden' }}><div style={{ height: '100%', width: `${ratio * 100}%`, background: gradeColor, borderRadius: 2 }}/></div>}
                <span style={{ fontSize: 15, fontWeight: 800, color: gradeColor }}>{item.feedback.totalScore}<span style={{ fontSize: 10, color: THEME.textMuted }}>/{item.feedback.maxScore}</span></span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatBatchJobTime(timestamp) {
  if (!timestamp) return '时间未知';
  try {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '时间未知';
  }
}

const JOB_STATUS_LABELS = {
  pending: '等待处理',
  running: '批改中',
  pausing: '暂停中',
  paused: '已暂停',
  canceling: '停止中',
  canceled: '已停止',
  cancelled: '已停止',
  completed: '已完成',
  partial_failed: '部分完成',
  failed: '批改失败',
};

export function RecentBatchJobsPanel({
  jobs,
  loading,
  currentJobId,
  filter,
  classFiltered,
  assignmentFiltered,
  onFilterChange,
  onRefresh,
  onAttach,
}) {
  if (loading && jobs.length === 0) {
    return (
      <div style={{ background: THEME.card, borderRadius: 14, border: `1px solid ${THEME.border}`, padding: 14, marginBottom: SURFACE_SPACING.stackTight, fontSize: 12, color: THEME.textMuted }}>
        正在读取最近批量任务...
      </div>
    );
  }
  if (!jobs.length) return null;

  return (
    <div style={{ background: THEME.card, borderRadius: 14, border: `1px solid ${THEME.border}`, padding: 14, marginBottom: SURFACE_SPACING.stackTight }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.primaryDark }}>最近批量任务</div>
          <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>
            刷新页面或中断后，可以从这里接回进度。
            {classFiltered || assignmentFiltered ? ` 当前已按${classFiltered ? '班级' : ''}${classFiltered && assignmentFiltered ? '和' : ''}${assignmentFiltered ? '任务' : ''}收窄。` : ''}
          </div>
        </div>
        <button type="button" aria-label={loading ? '刷新中' : '刷新最近批量任务'} onClick={onRefresh} disabled={loading} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, border: `1px solid ${THEME.border}`, background: THEME.cardAlt, color: THEME.textSecondary, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '刷新中' : '刷新'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {[
          { id: 'active', label: '进行中' },
          { id: 'paused', label: '已暂停' },
          { id: 'completed', label: '最近完成' },
        ].map((item) => (
          <button type="button"
            key={item.id}
            onClick={() => onFilterChange(item.id)}
            style={{
              fontSize: 12,
              padding: '4px 10px',
              borderRadius: 999,
              border: `1px solid ${filter === item.id ? THEME.primary : THEME.border}`,
              background: filter === item.id ? THEME.primaryLight : THEME.cardAlt,
              color: filter === item.id ? THEME.primaryDark : THEME.textSecondary,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {jobs.length === 0 ? (
        <div style={{ fontSize: 12, color: THEME.textMuted, padding: '6px 2px' }}>当前筛选下还没有批量任务。</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {jobs.slice(0, 5).map((job) => {
            const processed = Number(job.processedCount || 0);
            const total = Number(job.totalCount || 0);
            const label = JOB_STATUS_LABELS[job.status] || job.status || '状态未知';
            return (
              <div key={job.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 10px', borderRadius: 12, background: job.id === currentJobId ? THEME.primaryLight : THEME.cardAlt, border: `1px solid ${job.id === currentJobId ? '#f0cc80' : THEME.border}` }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label} · {processed}/{total} 份
                  </div>
                  <div style={{ fontSize: 11, color: THEME.textMuted, marginTop: 2 }}>
                    {formatBatchJobTime(job.updatedAt || job.createdAt)} · 成功 {job.successCount || 0} · 失败 {job.failedCount || 0}
                  </div>
                </div>
                <button type="button" onClick={() => onAttach(job.id)} disabled={job.id === currentJobId} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 999, border: `1px solid ${THEME.primary}`, background: job.id === currentJobId ? '#f5f5f4' : THEME.primaryLight, color: job.id === currentJobId ? THEME.textMuted : THEME.primaryDark, cursor: job.id === currentJobId ? 'default' : 'pointer', fontWeight: 700 }}>
                  {job.id === currentJobId ? '当前任务' : '接回'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
