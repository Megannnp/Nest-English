import { Suspense, lazy, useEffect, useState } from 'react';

import { writingsAPI } from '../../api/index.js';
import AppLoadingShell from '../../components/shared/AppLoadingShell.jsx';

import '../writing.css';

const FeedbackView = lazy(() => import('../../components/FeedbackView/index.jsx'));

export function buildModalFeedbackPayload(detailWriting) {
  if (!detailWriting?.feedback) return null;
  return {
    ...detailWriting.feedback,
    selectedType: detailWriting.feedback.selectedType || detailWriting.selectedType,
    analysisMeta: {
      ...(detailWriting.feedback.analysisMeta || {}),
      ...(detailWriting.analysisMeta || {}),
    },
  };
}

function VersionTab({ v, isCurrent, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '4px 12px',
        borderRadius: 16,
        border: '1px solid',
        borderColor: isCurrent ? '#b45309' : '#e5e0d8',
        background: isCurrent ? '#fffbf0' : '#faf8f5',
        color: isCurrent ? '#b45309' : '#6b6050',
        fontSize: 12,
        fontWeight: isCurrent ? 700 : 400,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      第{v.versionNo}稿
      {isCurrent ? ' ●' : ''}
    </button>
  );
}

function VersionHistorySection({ versions, currentId, onSwitchVersion, onWriteNextDraft }) {
  if (!versions || versions.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 20px 0' }}>
        <button
          type="button"
          onClick={onWriteNextDraft}
          style={{
            padding: '5px 14px',
            borderRadius: 16,
            border: '1px solid #e5e0d8',
            background: '#fffaf5',
            color: '#b45309',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ✍️ 写下一稿
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 20px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 12, color: '#8a7060', fontWeight: 600, flexShrink: 0 }}>版本：</span>
      {versions.map((v) => (
        <VersionTab
          key={v.id}
          v={v}
          isCurrent={v.id === currentId}
          onClick={() => onSwitchVersion?.(v.id)}
        />
      ))}
      <button
        type="button"
        onClick={onWriteNextDraft}
        style={{
          padding: '4px 12px',
          borderRadius: 16,
          border: '1px dashed #b45309',
          background: '#fffaf5',
          color: '#b45309',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          marginLeft: 4,
        }}
      >
        ✍️ 写下一稿
      </button>
    </div>
  );
}

function buildFeedbackViewProps(displayWriting, user, isMobile) {
  const comment = displayWriting.teacherComment;
  return {
    feedback: buildModalFeedbackPayload(displayWriting),
    loading: false,
    question: { title: displayWriting.writingTitle || '未命名写作', promptText: displayWriting.promptText || '' },
    writingImage: displayWriting.image?.ossUrl || null,
    studentName: displayWriting.userName,
    user,
    teacherComment: comment?.content || comment || '',
    annotatedImage: comment?.annotatedImage || null,
    isTeacher: user?.role === 'teacher',
    originalText: displayWriting.fullText,
    promptText: displayWriting.promptText || '',
    isMobile,
  };
}

export default function WritingFeedbackModal({ detailWriting, isMobile = false, user, onClose, onWriteNextDraft }) {
  const [activeWriting, setActiveWriting] = useState(null);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const detailWritingId = detailWriting?.id || '';

  useEffect(() => {
    setActiveWriting(null);
    setLoadingVersion(false);
  }, [detailWritingId]);

  if (!detailWriting) return null;

  const displayWriting = activeWriting || detailWriting;
  const feedbackViewProps = buildFeedbackViewProps(displayWriting, user, isMobile);

  async function handleSwitchVersion(writingId) {
    if (writingId === displayWriting.id || loadingVersion) return;
    setLoadingVersion(true);
    try {
      const writing = await writingsAPI.get(writingId);
      setActiveWriting(writing);
    } catch {
      // ignore
    } finally {
      setLoadingVersion(false);
    }
  }

  return (
    <div className="writing-feedback-modal">
      <button type="button" className="writing-feedback-modal__backdrop" aria-label="关闭反馈回看" onClick={onClose} />
      <div className="writing-feedback-modal__panel">
        <div className="writing-feedback-modal__header">
          <div>
            <div className="writing-feedback-modal__title">完整反馈回看</div>
            <div className="writing-feedback-modal__subtitle">{detailWriting.writingTitle || '未命名写作'}</div>
          </div>
          <button type="button" onClick={onClose} className="writing-feedback-modal__close">×</button>
        </div>
        <VersionHistorySection
          versions={detailWriting.versions || null}
          currentId={displayWriting.id}
          onSwitchVersion={handleSwitchVersion}
          onWriteNextDraft={() => { onClose?.(); onWriteNextDraft?.(displayWriting); }}
        />
        {loadingVersion && (
          <div style={{ padding: '8px 20px', fontSize: 12, color: '#8a7060' }}>正在加载版本...</div>
        )}
        <Suspense fallback={<AppLoadingShell minHeight={320} />}>
          <FeedbackView {...feedbackViewProps} />
        </Suspense>
      </div>
    </div>
  );
}
