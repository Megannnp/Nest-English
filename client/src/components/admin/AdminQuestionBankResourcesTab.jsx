import styles from './AdminPage.module.css';
import { RESOURCE_TABS } from './questionBankConstants.js';
import { ResourceForm } from './questionBankFields.jsx';
import { statusLabel } from './questionBankUtils.js';

export default function AdminQuestionBankResourcesTab({
  resource,
  resourceRows,
  resourceEditId,
  resourceForm,
  metadata,
  saving,
  onResourceChange,
  onSelectResource,
  onResourceFormChange,
  onSaveResource,
  onCancelResource,
}) {
  const resourceLabel = RESOURCE_TABS.find((t) => t.id === resource)?.label || '配置';

  return (
    <>
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, flexWrap: 'wrap' }}>
        {RESOURCE_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            onClick={() => onResourceChange(item.id)}
            style={{
              padding: '8px 14px',
              fontSize: 13,
              fontWeight: resource === item.id ? 800 : 500,
              color: resource === item.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              background: resource === item.id ? '#fff0dc' : 'transparent',
              border: `1px solid ${resource === item.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
              borderRadius: 8,
              cursor: 'pointer',
              font: 'inherit',
              marginRight: 6,
              marginBottom: 6,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <aside className={styles.card}>
          <h2 style={{ margin: '0 0 10px', fontSize: 16, color: 'var(--color-text)' }}>
            {resourceLabel}（{resourceRows.length}）
          </h2>
          <div style={{ display: 'grid', gap: 8, maxHeight: 'calc(100vh - 520px)', overflowY: 'auto' }}>
            {resourceRows.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectResource(item)}
                className={`${styles.qbListItem} ${resourceEditId === item.id ? styles.qbListItemActive : ''}`}
              >
                <strong style={{ display: 'block', color: 'var(--color-text)', fontSize: 13 }}>{item.name}</strong>
                <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                  {item.code || item.type || ''}
                  {item.status ? ` · ${statusLabel(item.status)}` : ''}
                </span>
              </button>
            ))}
            {resourceRows.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>还没有配置，点击上方「新建配置」添加。</div>
            ) : null}
          </div>
        </aside>

        <section style={{ display: 'grid', gap: 16 }}>
          <div className={styles.card}>
            <h2 style={{ margin: '0 0 14px', fontSize: 18, color: 'var(--color-text)' }}>
              {resourceEditId ? '编辑配置' : '新增配置'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <ResourceForm
                resource={resource}
                form={resourceForm}
                metadata={metadata}
                editId={resourceEditId}
                onChange={onResourceFormChange}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button type="button" className={styles.primaryBtn} aria-label={resourceEditId ? '保存修改' : '新增配置'} onClick={onSaveResource} disabled={saving}>
                {resourceEditId ? '保存修改' : '新增配置'}
              </button>
              <button type="button" className={styles.ghostBtn} onClick={onCancelResource}>
                取消
              </button>
            </div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 8 }}>分类设置是题目和素材的基础框架，修改后即时生效。</div>
          </div>
        </section>
      </div>
    </>
  );
}
