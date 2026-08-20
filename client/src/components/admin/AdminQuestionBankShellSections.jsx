import styles from './AdminPage.module.css';
import { asOptions } from './questionBankUtils.js';

export function QuestionBankHeader({
  tab,
  resource,
  onNewQuestion,
  onNewMaterial,
  onNewResource,
}) {
  return (
    <section style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 18 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-primary)' }}>管理后台 / 题库管理</div>
        <h1 style={{ margin: '6px 0 0', fontSize: 30, lineHeight: 1.15, color: 'var(--color-text)' }}>题库的创建、分类和维护</h1>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {tab === 'questions' ? (
          <button type="button" className={styles.primaryBtn} onClick={onNewQuestion}>新建题目</button>
        ) : null}
        {tab === 'materials' ? (
          <button type="button" className={styles.primaryBtn} onClick={onNewMaterial}>新建素材</button>
        ) : null}
        {tab === 'resources' ? (
          <button type="button" className={styles.primaryBtn} onClick={() => onNewResource(resource)}>新建配置</button>
        ) : null}
      </div>
    </section>
  );
}

export function QuestionBankMessage({ error, notice }) {
  if (!error && !notice) return null;

  return (
    <div style={{ border: `1px solid ${error ? '#d8b4b4' : '#b7d8bd'}`, background: error ? '#fff8f8' : '#f0fff3', borderRadius: 8, padding: 12, color: error ? '#8a2d2d' : '#256234', marginBottom: 14, fontSize: 13 }}>
      {error || notice}
    </div>
  );
}

export function QuestionBankStats({ stats }) {
  return (
    <div className={styles.card} style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--color-primary)', marginBottom: 4 }}>题库概览</div>
      <h2 style={{ margin: '0 0 14px', fontSize: 18, color: 'var(--color-text)' }}>数据总览</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          ['题目总数', `${stats.total} 题`],
          ['启用中', `${stats.active} 题`],
          ['近 7 日新增', `${stats.recent} 题`],
          ['素材数量', `${stats.materials} 个`],
        ].map(([label, value]) => (
          <div key={label} style={{ border: `1px solid ${'var(--color-bg-muted)'}`, borderRadius: 8, padding: 12, background: 'var(--color-bg-muted)' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 800 }}>{label}</div>
            <strong style={{ display: 'block', marginTop: 6, fontSize: 20, color: 'var(--color-text)' }}>{value}</strong>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        {[
          `科目 ${stats.modules} 个`,
          `标签 ${stats.tagCount} 个`,
          stats.topModule !== '—' ? `最多：${stats.topModule}` : '',
        ].filter(Boolean).map((label) => (
          <span key={label} style={{
            border: `1px solid ${'var(--color-bg-muted)'}`,
            borderRadius: 999,
            padding: '6px 10px',
            background: 'var(--color-bg-muted)',
            color: 'var(--color-text-muted)',
            fontSize: 12,
            fontWeight: 800,
          }}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export function QuestionBankTabs({ tab, onTabChange }) {
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: `1px solid ${'var(--color-border)'}` }}>
      {[
        ['resources', '分类设置'],
        ['materials', '素材库'],
        ['questions', '题目列表'],
        ['batch-import', '批量录题'],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          onClick={() => onTabChange(value)}
          style={{
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: tab === value ? 800 : 500,
            color: tab === value ? 'var(--color-primary)' : 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            borderBottom: tab === value ? `2px solid ${'var(--color-primary)'}` : '2px solid transparent',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function QuestionBankFilterBar({
  tab,
  show,
  metadata,
  moduleFilter,
  systemFilter,
  questionStatusFilter,
  keyword,
  loading,
  onModuleFilterChange,
  onSystemFilterChange,
  onQuestionStatusFilterChange,
  onKeywordChange,
  onSearch,
}) {
  if (!show) return null;

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
      <select className={styles.input} style={{ maxWidth: 140 }} value={moduleFilter} onChange={(e) => onModuleFilterChange(e.target.value)}>
        {asOptions(metadata.modules, '全部科目').map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </select>
      {tab === 'questions' ? (
        <select className={styles.input} style={{ maxWidth: 160 }} value={systemFilter} onChange={(e) => onSystemFilterChange(e.target.value)}>
          {asOptions(metadata.systems, '全部备考目标').map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      ) : null}
      {tab === 'questions' ? (
        <select className={styles.input} style={{ maxWidth: 120 }} value={questionStatusFilter} onChange={(e) => onQuestionStatusFilterChange(e.target.value)}>
          <option value="">全部状态</option>
          <option value="active">启用</option>
          <option value="disabled">禁用</option>
        </select>
      ) : null}
      <input
        className={styles.input}
        style={{ flex: 1, minWidth: 180 }}
        aria-label="搜索题目"
        value={keyword}
        placeholder="输入即搜"
        onChange={(e) => onKeywordChange(e.target.value)}
      />
      <button type="button" className={styles.ghostBtn} aria-label={loading ? '搜索中' : '搜索'} onClick={onSearch}>
        {loading ? '搜索中…' : '搜索'}
      </button>
    </div>
  );
}
