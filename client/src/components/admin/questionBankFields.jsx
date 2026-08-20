import { useEffect, useRef, useState } from 'react';

import styles from './AdminPage.module.css';
import { asOptions } from './questionBankUtils.js';

export function Field({ label, children }) {
  return (
    <label className={styles.label}>
      {label}
      {children}
    </label>
  );
}

export function SelectField({ value, onChange, options }) {
  return (
    <select className={styles.input} value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {options.map((item) => (
        <option key={item.id} value={item.id}>{item.name}</option>
      ))}
    </select>
  );
}

export function MultiSelectField({ value = [], onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = Array.isArray(value) ? value : [];
  const selectedItems = options.filter((item) => selected.includes(item.id));

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function toggle(id) {
    if (selected.includes(id)) {
      onChange(selected.filter((v) => v !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className={styles.multiSelect} ref={ref}>
      <button type="button" className={styles.multiSelectTrigger} onClick={() => setOpen(!open)}
        style={{ border: `1px solid ${'var(--color-border)'}`, borderRadius: 8, background: '#fff', padding: '10px 11px', font: 'inherit', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <span>{selectedItems.length ? `已选 ${selectedItems.length} 项` : '点击选择'}</span>
        <span>{open ? '\u25B2' : '\u25BC'}</span>
      </button>
      {open ? (
        <div className={styles.multiSelectDropdown}>
          {options.length === 0 ? (
            <div className={styles.multiSelectEmpty}>暂无选项</div>
          ) : options.map((item) => (
            <label key={item.id} className={styles.multiSelectOption}>
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={() => toggle(item.id)}
              />
              <span>{item.name}</span>
            </label>
          ))}
        </div>
      ) : null}
      {selectedItems.length ? (
        <div className={styles.selectedPills}>
          {selectedItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.selectedPill}
              onClick={() => toggle(item.id)}
            >
              {item.name} ×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ResourceForm({ resource, form, metadata, editId, onChange }) {
  const FormComponent = RESOURCE_FORM_COMPONENTS[resource] || DefaultResourceForm;
  return <FormComponent form={form} metadata={metadata} editId={editId} onChange={onChange} />;
}

function LearningSystemResourceForm({ form, metadata, editId, onChange }) {
  const parentOptions = metadata.systems.filter((item) => item.id !== editId);
  return (
    <>
      <Field label="父级">
        <SelectField value={form.parent_id} onChange={(value) => onChange('parent_id', value)} options={asOptions(parentOptions)} />
      </Field>
      <CommonCodeNameFields form={form} onChange={onChange} />
      <CommonTailFields form={form} onChange={onChange} />
    </>
  );
}

function CategoryResourceForm({ form, metadata, editId, onChange }) {
  const parentOptions = metadata.categories.filter((item) => {
    if (item.id === editId) return false;
    if (form.module_id && item.module_id !== form.module_id) return false;
    if ((form.system_id || '') !== (item.system_id || '')) return false;
    return true;
  });

  return (
    <>
      <Field label="科目">
        <SelectField value={form.module_id} onChange={(value) => {
          onChange('module_id', value);
          onChange('parent_id', '');
        }} options={asOptions(metadata.modules)} />
      </Field>
      <Field label="备考目标">
        <SelectField value={form.system_id} onChange={(value) => {
          onChange('system_id', value);
          onChange('parent_id', '');
        }} options={asOptions(metadata.systems)} />
      </Field>
      <Field label="父级分类">
        <SelectField value={form.parent_id} onChange={(value) => onChange('parent_id', value)} options={asOptions(parentOptions)} />
      </Field>
      <CommonCodeNameFields form={form} onChange={onChange} />
      <CommonTailFields form={form} onChange={onChange} />
    </>
  );
}

function DifficultyResourceForm({ form, metadata, onChange }) {
  return (
    <>
      <Field label="科目">
        <SelectField value={form.module_id} onChange={(value) => onChange('module_id', value)} options={asOptions(metadata.modules)} />
      </Field>
      <Field label="备考目标">
        <SelectField value={form.system_id} onChange={(value) => onChange('system_id', value)} options={asOptions(metadata.systems)} />
      </Field>
      <Field label="名称">
        <input className={styles.input} value={form.name || ''} onChange={(e) => onChange('name', e.target.value)} />
      </Field>
      <Field label="等级">
        <input className={styles.input} type="number" value={form.level || 0} onChange={(e) => onChange('level', e.target.value)} />
      </Field>
      <Field label="颜色">
        <input className={styles.input} value={form.color || ''} onChange={(e) => onChange('color', e.target.value)} />
      </Field>
      <CommonTailFields form={form} onChange={onChange} />
    </>
  );
}

function TagResourceForm({ form, onChange }) {
  return (
    <>
      <Field label="名称">
        <input className={styles.input} value={form.name || ''} onChange={(e) => onChange('name', e.target.value)} />
      </Field>
      <Field label="类型">
        <input className={styles.input} value={form.type || 'general'} onChange={(e) => onChange('type', e.target.value)} />
      </Field>
      <Field label="颜色">
        <input className={styles.input} value={form.color || ''} onChange={(e) => onChange('color', e.target.value)} />
      </Field>
      <Field label="描述">
        <textarea className={styles.input} style={{ resize: 'vertical', minHeight: 60 }} value={form.description || ''} onChange={(e) => onChange('description', e.target.value)} />
      </Field>
    </>
  );
}

function KnowledgePointResourceForm({ form, metadata, editId, onChange }) {
  const parentOptions = metadata.knowledge_points.filter((item) => {
    if (item.id === editId) return false;
    if ((form.module_id || '') !== (item.module_id || '')) return false;
    return true;
  });

  return (
    <>
      <Field label="科目">
        <SelectField value={form.module_id} onChange={(value) => {
          onChange('module_id', value);
          onChange('parent_id', '');
        }} options={asOptions(metadata.modules)} />
      </Field>
      <Field label="父级知识点">
        <SelectField value={form.parent_id} onChange={(value) => onChange('parent_id', value)} options={asOptions(parentOptions)} />
      </Field>
      <Field label="名称">
        <input className={styles.input} value={form.name || ''} onChange={(e) => onChange('name', e.target.value)} />
      </Field>
      <CommonTailFields form={form} onChange={onChange} />
    </>
  );
}

function DefaultResourceForm({ form, onChange }) {
  return (
    <>
      <CommonCodeNameFields form={form} onChange={onChange} />
      <Field label="图标">
        <input className={styles.input} value={form.icon || ''} onChange={(e) => onChange('icon', e.target.value)} />
      </Field>
      <Field label="颜色">
        <input className={styles.input} value={form.color || ''} onChange={(e) => onChange('color', e.target.value)} />
      </Field>
      <CommonTailFields form={form} onChange={onChange} />
    </>
  );
}

const RESOURCE_FORM_COMPONENTS = {
  'learning-systems': LearningSystemResourceForm,
  categories: CategoryResourceForm,
  difficulties: DifficultyResourceForm,
  tags: TagResourceForm,
  'knowledge-points': KnowledgePointResourceForm,
};

function CommonCodeNameFields({ form, onChange }) {
  return (
    <>
      <Field label="代码标识">
        <input className={styles.input} value={form.code || ''} onChange={(e) => onChange('code', e.target.value)} />
      </Field>
      <Field label="名称">
        <input className={styles.input} value={form.name || ''} onChange={(e) => onChange('name', e.target.value)} />
      </Field>
    </>
  );
}

function CommonTailFields({ form, onChange }) {
  return (
    <>
      <Field label="描述">
        <textarea className={styles.input} style={{ resize: 'vertical', minHeight: 60 }} value={form.description || ''} onChange={(e) => onChange('description', e.target.value)} />
      </Field>
      <Field label="排序">
        <input className={styles.input} type="number" value={form.sort_order || 0} onChange={(e) => onChange('sort_order', e.target.value)} />
      </Field>
      <Field label="状态">
        <select className={styles.input} value={form.status || 'active'} onChange={(e) => onChange('status', e.target.value)}>
          <option value="active">启用</option>
          <option value="disabled">禁用</option>
        </select>
      </Field>
    </>
  );
}
