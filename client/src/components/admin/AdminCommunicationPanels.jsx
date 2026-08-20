import { useRef, useState } from 'react';

import { fmtDateTime as fmtDate } from './adminFormat.js';
import styles from './AdminPage.module.css';
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  replyAdminMessage,
  reviewAdminMessage,
  uploadAdminFile,
} from '../../api/admin.js';
import { useConfirmDialog } from '../../hooks/useConfirmDialog.js';
import { parseMarkdown } from '../../utils/markdown.js';
import ConfirmDialog from '../shared/ConfirmDialog.jsx';

function fmtFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const MARKDOWN_COLORS = [
  { label: '琥珀', hex: '#c8872d' },
  { label: '深棕', hex: '#5c3d1e' },
  { label: '绿色', hex: '#2f7a53' },
  { label: '红色', hex: '#c0392b' },
  { label: '蓝色', hex: '#2563a8' },
  { label: '灰色', hex: '#6f6252' },
];

const MARKDOWN_SIZES = [
  { label: '大', value: 'large' },
  { label: '中', value: 'medium' },
  { label: '小', value: 'small' },
];

function wrapSelection(textarea, before, after, fallback) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end) || fallback;
  const newValue =
    textarea.value.substring(0, start) +
    before + selected + after +
    textarea.value.substring(end);
  return { newValue, cursor: start + before.length + selected.length + after.length };
}

function MarkdownEditor({ value, onChange, disabled, placeholder }) {
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef(null);

  function insert(before, after, fallback) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const { newValue, cursor } = wrapSelection(textarea, before, after, fallback);
    onChange(newValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  function applyFormat(type) {
    const map = {
      bold: ['**', '**', '粗体文字'],
      italic: ['*', '*', '斜体文字'],
      h2: ['## ', '', '标题'],
      h3: ['### ', '', '小标题'],
      ul: ['- ', '', '列表项'],
      hr: ['\n---\n', '', ''],
      code: ['`', '`', '代码'],
    };
    const [before, after, fallback] = map[type];
    insert(before, after, fallback);
  }

  return (
    <div className={styles.mdEditor}>
      <div className={styles.mdToolbar}>
        <div className={styles.mdFmtBtns}>
          <button type="button" className={styles.fmtBtn} onClick={() => applyFormat('bold')} disabled={disabled}><strong>B</strong></button>
          <button type="button" className={styles.fmtBtn} onClick={() => applyFormat('italic')} disabled={disabled}><em>I</em></button>
          <button type="button" className={styles.fmtBtn} onClick={() => applyFormat('h2')} disabled={disabled}>H2</button>
          <button type="button" className={styles.fmtBtn} onClick={() => applyFormat('h3')} disabled={disabled}>H3</button>
          <button type="button" className={styles.fmtBtn} onClick={() => applyFormat('ul')} disabled={disabled}>列表</button>
          <button type="button" className={styles.fmtBtn} onClick={() => applyFormat('hr')} disabled={disabled}>分割线</button>
          <button type="button" className={styles.fmtBtn} onClick={() => applyFormat('code')} disabled={disabled}>代码</button>
        </div>
        <button
          type="button"
          className={`${styles.previewToggle} ${preview ? styles.previewActive : ''}`}
          onClick={() => setPreview((current) => !current)}
        >
          {preview ? '编辑' : '预览'}
        </button>
      </div>

      <div className={styles.mdToolbar2}>
        <div className={styles.mdColorRow}>
          <span className={styles.toolLabel}>颜色</span>
          {MARKDOWN_COLORS.map((color) => (
            <button
              key={color.hex}
              type="button"
              className={styles.colorBtn}
              style={{ background: color.hex }}
              title={color.label}
              onClick={() => insert(`[color=${color.hex}]`, '[/color]', '文字')}
              disabled={disabled}
            />
          ))}
        </div>
        <div className={styles.mdSizeRow}>
          <span className={styles.toolLabel}>字号</span>
          {MARKDOWN_SIZES.map((size) => (
            <button
              key={size.value}
              type="button"
              className={styles.sizeBtn}
              onClick={() => insert(`[size=${size.value}]`, '[/size]', '文字')}
              disabled={disabled}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.mdBody}>
        {!preview ? (
          <textarea
            ref={textareaRef}
            className={styles.mdTextarea}
            aria-label="公告正文"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || '支持 Markdown、颜色和字号，使用上方工具栏快速插入格式'}
            disabled={disabled}
            rows={10}
            maxLength={3000}
          />
        ) : (
          <div
            className={styles.mdPreview}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(value) || '<p>暂无内容</p>' }}
          />
        )}
      </div>
    </div>
  );
}

export function PublishForm({ onPublished }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef();

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) {
      setError('标题和正文不能为空');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await createAdminAnnouncement(title.trim(), body.trim());
      const id = res?.id ?? res?.data?.id;
      if (file && id) {
        await uploadAdminFile(id, file);
      }
      setTitle('');
      setBody('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      onPublished?.();
    } catch (err) {
      setError(err.message || '发布失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardKicker}>NEW ANNOUNCEMENT</span>
        <h2 className={styles.cardTitle}>发布系统公告</h2>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>标题</label>
        <input
          className={styles.input}
          aria-label="公告标题"
          type="text"
          placeholder="公告标题"
          value={title}
          maxLength={100}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>正文</label>
        <MarkdownEditor
          value={body}
          onChange={setBody}
          disabled={submitting}
          placeholder="公告内容，支持 Markdown、颜色和字号"
        />
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>附件（可选，如作文纸 PDF）</label>
        <div className={styles.fileRow}>
          <input
            ref={fileRef}
            className={styles.fileInput}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files[0] || null)}
            disabled={submitting}
          />
          {file ? (
            <span className={styles.fileName}>
              {file.name} · {fmtFileSize(file.size)}
            </span>
          ) : null}
        </div>
      </div>

      {error ? <div className={styles.errorMsg}>{error}</div> : null}

      <button type="button"
        className={styles.primaryBtn}
        aria-label={submitting ? '发布中' : '发布公告'}
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? '发布中…' : '发布公告'}
      </button>
    </div>
  );
}

export function AnnouncementList({ list, onDelete }) {
  const [deletingId, setDeletingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [error, setError] = useState('');
  const { confirmState, requestConfirm, respondConfirm } = useConfirmDialog();

  async function handleDelete(id) {
    const ok = await requestConfirm('确认删除这条公告？');
    if (!ok) return;
    setDeletingId(id);
    setError('');
    try {
      await deleteAdminAnnouncement(id);
      onDelete?.();
    } catch (err) {
      setError(err.message || '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  if (!list.length) {
    return <div className={styles.empty}>暂无公告</div>;
  }

  return (
    <>
      <ConfirmDialog state={confirmState} onRespond={respondConfirm} />
      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      <div className={styles.itemList}>
      {list.map((item) => (
        <div key={item.id} className={styles.itemRow}>
          <div className={styles.itemMain}>
            <div className={styles.itemTitle}>{item.title}</div>
            <div className={styles.itemMeta}>
              {fmtDate(item.created_at)}
              {item.file_name ? (
                <span className={styles.filePill}>📎 {item.file_name}</span>
              ) : null}
            </div>
            {expandedId === item.id ? (
              <div
                className={styles.mdRendered}
                dangerouslySetInnerHTML={{ __html: parseMarkdown(item.body) }}
              />
            ) : (
              <div className={styles.itemBody}>{item.body}</div>
            )}
            <button
              type="button"
              className={styles.expandBtn}
              onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
            >
              {expandedId === item.id ? '收起预览' : '展开预览'}
            </button>
          </div>
          <button type="button"
            className={styles.deleteBtn}
            onClick={() => void handleDelete(item.id)}
            disabled={deletingId === item.id}
          >
            {deletingId === item.id ? '…' : '删除'}
          </button>
        </div>
      ))}
    </div>
    </>
  );
}

export function MessageList({ list, onUpdate }) {
  const [replyingId, setReplyingId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { confirmState, requestConfirm, respondConfirm } = useConfirmDialog();

  async function handleReply(id) {
    if (!replyText.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await replyAdminMessage(id, replyText.trim());
      setReplyingId(null);
      setReplyText('');
      onUpdate?.();
    } catch (err) {
      setError(err.message || '回复失败');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject(id) {
    const ok = await requestConfirm('确认拒绝这条留言？');
    if (!ok) return;
    setError('');
    try {
      await reviewAdminMessage(id, 'rejected');
      onUpdate?.();
    } catch (err) {
      setError(err.message || '操作失败');
    }
  }

  if (!list.length) {
    return <div className={styles.empty}>暂无留言</div>;
  }

  return (
    <>
      <ConfirmDialog state={confirmState} onRespond={respondConfirm} />
      {error ? <div className={styles.errorBanner}>{error}</div> : null}
      <div className={styles.itemList}>
      {list.map((item) => (
        <div key={item.id} className={`${styles.itemRow} ${styles.msgRow}`}>
          <div className={styles.itemMain}>
            <div className={styles.msgMeta}>
              <span className={`${styles.statusBadge} ${styles[item.status]}`}>
                {item.status === 'pending' ? '待处理' : item.status === 'approved' ? '已回复' : '已拒绝'}
              </span>
              <span className={styles.msgRole}>
                {item.role === 'teacher' ? '教师' : item.role === 'parent' ? '家长' : '学生'}
              </span>
              <span className={styles.itemMetaDate}>{fmtDate(item.created_at)}</span>
            </div>
            <div className={styles.itemBody}>{item.content}</div>

            {item.reply ? (
              <div className={styles.replyBox}>
                <span className={styles.replyLabel}>已回复：</span>
                {item.reply}
              </div>
            ) : null}

            {item.status === 'pending' && replyingId !== item.id ? (
              <div className={styles.actionRow}>
                <button type="button"
                  className={styles.replyBtn}
                  onClick={() => { setReplyingId(item.id); setReplyText(''); }}
                >
                  回复
                </button>
                <button type="button"
                  className={styles.rejectBtn}
                  onClick={() => void handleReject(item.id)}
                >
                  拒绝
                </button>
              </div>
            ) : null}

            {replyingId === item.id ? (
              <div className={styles.replyForm}>
                <textarea
                  className={styles.replyInput}
                  aria-label="回复内容"
                  placeholder="输入回复内容…"
                  value={replyText}
                  rows={3}
                  onChange={(e) => setReplyText(e.target.value)}
                  disabled={submitting}
                />
                <div className={styles.replyActions}>
                  <button type="button"
                    className={styles.primaryBtn}
                    onClick={() => void handleReply(item.id)}
                    disabled={submitting || !replyText.trim()}
                  >
                    {submitting ? '提交中…' : '提交回复'}
                  </button>
                  <button type="button"
                    className={styles.ghostBtn}
                    onClick={() => setReplyingId(null)}
                    disabled={submitting}
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ))}
      </div>
    </>
  );
}
