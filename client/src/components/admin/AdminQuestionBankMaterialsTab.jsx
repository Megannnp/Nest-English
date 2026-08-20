import styles from './AdminPage.module.css';
import { Field, SelectField } from './questionBankFields.jsx';
import { asOptions, materialTypeLabel } from './questionBankUtils.js';

export default function AdminQuestionBankMaterialsTab({
  materials,
  pagedMaterials,
  totalMaterialPages,
  currentMPage,
  materialEditId,
  materialForm,
  metadata,
  saving,
  onSelectMaterial,
  onMaterialPageChange,
  onMaterialFormChange,
  onSaveMaterial,
  onCancelMaterial,
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
      <aside className={styles.card}>
        <h2 style={{ margin: '0 0 10px', fontSize: 16, color: 'var(--color-text)' }}>素材列表（{materials.length}）</h2>
        <div style={{ display: 'grid', gap: 8, maxHeight: 'calc(100vh - 480px)', overflowY: 'auto' }}>
          {pagedMaterials.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectMaterial(item)}
              className={`${styles.qbListItem} ${materialEditId === item.id ? styles.qbListItemActive : ''}`}
            >
              <strong style={{ display: 'block', color: 'var(--color-text)', fontSize: 13 }}>{item.title}</strong>
              <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
                {materialTypeLabel(item.material_type)}
                {item.module_name ? ` · ${item.module_name}` : ''}
              </span>
            </button>
          ))}
          {materials.length === 0 ? (
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>还没有素材，点击上方「新建素材」添加。</div>
          ) : null}
        </div>
        {totalMaterialPages > 1 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 }}>
            <button type="button" className={styles.ghostBtn} style={{ padding: '5px 10px', fontSize: 12 }}
              onClick={() => onMaterialPageChange(Math.max(1, currentMPage - 1))}
              disabled={currentMPage <= 1}>上一页</button>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{currentMPage} / {totalMaterialPages}</span>
            <button type="button" className={styles.ghostBtn} style={{ padding: '5px 10px', fontSize: 12 }}
              onClick={() => onMaterialPageChange(Math.min(totalMaterialPages, currentMPage + 1))}
              disabled={currentMPage >= totalMaterialPages}>下一页</button>
          </div>
        ) : materials.length > 10 ? (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center' }}>共 {materials.length} 条</div>
        ) : null}
      </aside>

      <section style={{ display: 'grid', gap: 16 }}>
        <div className={styles.card}>
          <h2 style={{ margin: '0 0 14px', fontSize: 18, color: 'var(--color-text)' }}>
            {materialEditId ? '编辑素材' : '新增素材'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="标题">
              <input className={styles.input} value={materialForm.title} onChange={(e) => onMaterialFormChange('title', e.target.value)} />
            </Field>
            <Field label="科目">
              <SelectField value={materialForm.module_id} onChange={(value) => onMaterialFormChange('module_id', value)} options={asOptions(metadata.modules)} />
            </Field>
            <Field label="类型">
              <select className={styles.input} value={materialForm.material_type} onChange={(e) => onMaterialFormChange('material_type', e.target.value)}>
                <option value="article">文章</option>
                <option value="audio">音频</option>
                <option value="video">视频</option>
                <option value="image">图片</option>
                <option value="passage">阅读语篇</option>
                <option value="document">文档</option>
              </select>
            </Field>
            <Field label="来源说明">
              <input className={styles.input} placeholder="例如 Cambridge IELTS 18" value={materialForm.source || ''} onChange={(e) => onMaterialFormChange('source', e.target.value)} />
            </Field>
          </div>
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            <Field label="内容">
              <textarea className={styles.input} style={{ minHeight: 100, resize: 'vertical' }} value={materialForm.content} onChange={(e) => onMaterialFormChange('content', e.target.value)} />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="音频 URL">
                <input className={styles.input} placeholder="https://..." value={materialForm.audio_url || ''} onChange={(e) => onMaterialFormChange('audio_url', e.target.value)} />
              </Field>
              <Field label="视频 URL">
                <input className={styles.input} placeholder="https://..." value={materialForm.video_url || ''} onChange={(e) => onMaterialFormChange('video_url', e.target.value)} />
              </Field>
              <Field label="图片 URL">
                <input className={styles.input} placeholder="https://..." value={materialForm.image_url || ''} onChange={(e) => onMaterialFormChange('image_url', e.target.value)} />
              </Field>
              <Field label="附件/来源 URL">
                <input className={styles.input} placeholder="文件 URL" value={materialForm.attachment_url || ''} onChange={(e) => onMaterialFormChange('attachment_url', e.target.value)} />
              </Field>
            </div>
            <Field label="状态">
              <select className={styles.input} value={materialForm.status || 'active'} onChange={(e) => onMaterialFormChange('status', e.target.value)}>
                <option value="active">启用</option>
                <option value="disabled">禁用</option>
              </select>
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button type="button" className={styles.primaryBtn} aria-label={materialEditId ? '保存素材' : '新增素材'} onClick={onSaveMaterial} disabled={saving}>
              {materialEditId ? '保存素材' : '新增素材'}
            </button>
            <button type="button" className={styles.ghostBtn} onClick={onCancelMaterial}>
              取消
            </button>
          </div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 8 }}>素材是题目的配套内容（阅读语篇、听力音频等），配合在题目中引用。</div>
        </div>
      </section>
    </div>
  );
}
