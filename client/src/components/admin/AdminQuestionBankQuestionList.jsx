import styles from './AdminPage.module.css';
import { questionTypeLabel } from './questionBankUtils.js';

export default function AdminQuestionBankQuestionList({
  questions,
  pagedQuestions,
  questionEditId,
  totalQuestionPages,
  currentQPage,
  onSelectQuestion,
  onQuestionPageChange,
}) {
  return (
    <aside className={styles.card}>
      <h2 style={{ margin: '0 0 10px', fontSize: 16, color: 'var(--color-text)' }}>题目列表（{questions.length}）</h2>
      <div style={{ display: 'grid', gap: 8, maxHeight: 'calc(100vh - 480px)', overflowY: 'auto' }}>
        {pagedQuestions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectQuestion(item)}
            className={`${styles.qbListItem} ${questionEditId === item.id ? styles.qbListItemActive : ''}`}
          >
            <strong style={{ display: 'block', color: 'var(--color-text)', fontSize: 13, lineHeight: 1.3 }}>
              {item.title}
            </strong>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
              {item.module_name ? `${item.module_name}` : ''}
              {item.question_type ? ` · ${questionTypeLabel(item.question_type)}` : ''}
            </span>
          </button>
        ))}
        {questions.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>还没有题目，点击上方「新建题目」添加。</div>
        ) : null}
      </div>
      {totalQuestionPages > 1 ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 }}>
          <button type="button" className={styles.ghostBtn} style={{ padding: '5px 10px', fontSize: 12 }}
            onClick={() => onQuestionPageChange(Math.max(1, currentQPage - 1))}
            disabled={currentQPage <= 1}>上一页</button>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{currentQPage} / {totalQuestionPages}</span>
          <button type="button" className={styles.ghostBtn} style={{ padding: '5px 10px', fontSize: 12 }}
            onClick={() => onQuestionPageChange(Math.min(totalQuestionPages, currentQPage + 1))}
            disabled={currentQPage >= totalQuestionPages}>下一页</button>
        </div>
      ) : questions.length > 10 ? (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center' }}>共 {questions.length} 题</div>
      ) : null}
    </aside>
  );
}
