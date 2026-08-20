import styles from './AdminPage.module.css';
import { Field } from './questionBankFields.jsx';

function OptionsEditor({ value, onChange }) {
  const opts = Array.isArray(value) && value.length ? value : ['', '', '', ''];
  const labels = ['A', 'B', 'C', 'D'];
  return (
    <div className={styles.optionsEditor}>
      {opts.map((opt, i) => (
        <label key={i} className={styles.optionRow}>
          <span className={styles.optionLabel}>{labels[i]}.</span>
          <input
            className={styles.input}
            value={opt}
            placeholder={`选项 ${labels[i]}`}
            onChange={(e) => {
              const next = [...opts];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
        </label>
      ))}
    </div>
  );
}

function RequirementsEditor({ value, onChange }) {
  const items = Array.isArray(value) && value.length ? value : [''];
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {items.map((req, i) => (
        <div key={i} style={{ display: 'flex', gap: 6 }}>
          <input
            aria-label={`要求 ${i + 1}`}
            className={styles.input}
            value={req}
            placeholder={`要求 ${i + 1}`}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <button
            type="button"
            aria-label={`删除要求 ${i + 1}`}
            className={styles.ghostBtn}
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className={styles.ghostBtn} onClick={() => onChange([...items, ''])}>
        + 添加要求
      </button>
    </div>
  );
}

function parseScoringRubric(value) {
  if (!value) return [];
  if (typeof value === 'string') {
    try { return parseScoringRubric(JSON.parse(value)); } catch { return []; }
  }
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === 'object').map((item) => ({
      name: String(item.name || item.label || item.dimension || ''),
      score: item.score != null ? Number(item.score) : (item.max != null ? Number(item.max) : ''),
    }));
  }
  if (typeof value === 'object') {
    return Object.entries(value).filter(([, v]) => v != null && v !== '').map(([name, score]) => ({
      name,
      score: Number(score),
    }));
  }
  return [];
}

function ScoringRubricEditor({ value, onChange }) {
  const items = parseScoringRubric(value);

  function updateItem(index, patch) {
    const next = items.map((item, i) => i === index ? { ...item, ...patch } : item);
    onChange(next.filter((item) => item.name || item.score !== ''));
  }

  function addItem() {
    onChange([...items, { name: '', score: '' }]);
  }

  function removeItem(index) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            aria-label={`评分维度 ${i + 1}`}
            className={styles.input}
            value={item.name}
            placeholder={`维度 ${i + 1}（如：内容）`}
            onChange={(e) => updateItem(i, { name: e.target.value })}
          />
          <input
            aria-label={`评分维度 ${i + 1} 分值`}
            className={styles.input} style={{ maxWidth: 100 }}
            type="number"
            value={item.score}
            placeholder="分值"
            onChange={(e) => updateItem(i, { score: e.target.value === '' ? '' : Number(e.target.value) })}
          />
          <button type="button" aria-label={`删除评分维度 ${i + 1}`} className={styles.ghostBtn} onClick={() => removeItem(i)}>×</button>
        </div>
      ))}
      <button type="button" className={styles.ghostBtn} onClick={addItem}>
        + 添加评分维度
      </button>
    </div>
  );
}

function WritingEditor({ form, ext, updateExt, updateForm }) {
  return (
    <>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="写作题干">
          <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} value={form.content} onChange={(e) => updateForm('content', e.target.value)} placeholder="写作提示/题目要求" />
        </Field>
      </div>
      <Field label="字数要求">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input aria-label="最少字数" className={styles.input} type="number" placeholder="最少字数" value={ext.min_words || ''} onChange={(e) => updateExt('min_words', e.target.value)} />
          <span>—</span>
          <input aria-label="最多字数" className={styles.input} type="number" placeholder="最多字数" value={ext.max_words || ''} onChange={(e) => updateExt('max_words', e.target.value)} />
        </div>
      </Field>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="写作要求">
          <RequirementsEditor value={ext.requirements} onChange={(v) => updateExt('requirements', v)} />
        </Field>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="范文">
          <textarea className={styles.input} style={{ minHeight: 100, resize: 'vertical' }} value={ext.sample_answer || ''} onChange={(e) => updateExt('sample_answer', e.target.value)} placeholder="参考范文（可选）" />
        </Field>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="评分细则">
          <ScoringRubricEditor value={ext.scoring_rubric} onChange={(v) => updateExt('scoring_rubric', v)} />
        </Field>
      </div>
    </>
  );
}

function ChoiceQuestionEditor({ form, ext, updateExt, updateForm, answerPlaceholder = 'A' }) {
  return (
    <>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="题干">
          <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} value={form.content} onChange={(e) => updateForm('content', e.target.value)} />
        </Field>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="选项 A-D">
          <OptionsEditor value={ext.options} onChange={(v) => updateExt('options', v)} />
        </Field>
      </div>
      <Field label="正确答案">
        <input className={styles.input} value={form.answer} onChange={(e) => updateForm('answer', e.target.value)} placeholder={answerPlaceholder} />
      </Field>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="解析">
          <textarea className={styles.input} style={{ minHeight: 60, resize: 'vertical' }} value={form.analysis} onChange={(e) => updateForm('analysis', e.target.value)} />
        </Field>
      </div>
    </>
  );
}

function ReadingEditor({ form, ext, updateExt, updateForm }) {
  return <ChoiceQuestionEditor form={form} ext={ext} updateExt={updateExt} updateForm={updateForm} answerPlaceholder="A / B / C / D" />;
}

function ListeningEditor({ form, ext, updateExt, updateForm }) {
  return (
    <>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="听力题干">
          <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} value={form.content} onChange={(e) => updateForm('content', e.target.value)} placeholder="配合素材库的听力文件，或在此描述题目" />
        </Field>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="选项 A-D（选择题填写）">
          <OptionsEditor value={ext.options} onChange={(v) => updateExt('options', v)} />
        </Field>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="听力原文（transcript）">
          <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} value={ext.transcript || ''} onChange={(e) => updateExt('transcript', e.target.value)} placeholder="听力原文，用于教师核查和学生复盘" />
        </Field>
      </div>
      <Field label="正确答案">
        <input className={styles.input} value={form.answer} onChange={(e) => updateForm('answer', e.target.value)} placeholder="A / 填写内容 / 判断结果" />
      </Field>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="解析">
          <textarea className={styles.input} style={{ minHeight: 60, resize: 'vertical' }} value={form.analysis} onChange={(e) => updateForm('analysis', e.target.value)} />
        </Field>
      </div>
    </>
  );
}

function TranslationEditor({ form, ext, updateExt, updateForm }) {
  return (
    <>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="原文">
          <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} value={form.content} onChange={(e) => updateForm('content', e.target.value)} placeholder="待翻译的原文" />
        </Field>
      </div>
      <Field label="语言方向">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select aria-label="源语言" className={styles.input} value={ext.source_language || 'en'} onChange={(e) => updateExt('source_language', e.target.value)}>
            <option value="en">英语</option>
            <option value="zh">中文</option>
          </select>
          <span>→</span>
          <select aria-label="目标语言" className={styles.input} value={ext.target_language || 'zh'} onChange={(e) => updateExt('target_language', e.target.value)}>
            <option value="zh">中文</option>
            <option value="en">英语</option>
          </select>
        </div>
      </Field>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="参考译文">
          <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} value={form.answer} onChange={(e) => updateForm('answer', e.target.value)} placeholder="标准参考译文" />
        </Field>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="评分细则">
          <ScoringRubricEditor value={ext.scoring_rubric} onChange={(v) => updateExt('scoring_rubric', v)} />
        </Field>
      </div>
    </>
  );
}

function SpeakingEditor({ form, ext, updateExt, updateForm }) {
  return (
    <>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="口语题干/提示">
          <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} value={form.content} onChange={(e) => updateForm('content', e.target.value)} placeholder="口语练习提示语" />
        </Field>
      </div>
      <Field label="准备时间（秒）">
        <input className={styles.input} type="number" value={ext.prep_time || ''} onChange={(e) => updateExt('prep_time', e.target.value)} placeholder="例如 30" />
      </Field>
      <Field label="作答时间（秒）">
        <input className={styles.input} type="number" value={ext.response_time || ''} onChange={(e) => updateExt('response_time', e.target.value)} placeholder="例如 60" />
      </Field>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="参考回答">
          <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} value={form.answer} onChange={(e) => updateForm('answer', e.target.value)} placeholder="参考示例回答" />
        </Field>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="评分细则">
          <ScoringRubricEditor value={ext.scoring_rubric} onChange={(v) => updateExt('scoring_rubric', v)} />
        </Field>
      </div>
    </>
  );
}

function GrammarEditor({ form, ext, updateExt, updateForm }) {
  return (
    <>
      <ChoiceQuestionEditor form={form} ext={ext} updateExt={updateExt} updateForm={updateForm} answerPlaceholder="A / 填写答案" />
      <Field label="语法考点">
        <input className={styles.input} value={ext.grammar_focus || ''} onChange={(e) => updateExt('grammar_focus', e.target.value)} placeholder="例如：主谓一致、时态" />
      </Field>
    </>
  );
}

function VocabularyEditor({ form, ext, updateExt, updateForm }) {
  return (
    <>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="题干">
          <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} value={form.content} onChange={(e) => updateForm('content', e.target.value)} />
        </Field>
      </div>
      <Field label="目标词汇">
        <input className={styles.input} value={ext.target_word || ''} onChange={(e) => updateExt('target_word', e.target.value)} placeholder="例如：eloquent" />
      </Field>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="选项 A-D">
          <OptionsEditor value={ext.options} onChange={(v) => updateExt('options', v)} />
        </Field>
      </div>
      <Field label="正确答案">
        <input className={styles.input} value={form.answer} onChange={(e) => updateForm('answer', e.target.value)} placeholder="A / 填写答案" />
      </Field>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="解析">
          <textarea className={styles.input} style={{ minHeight: 60, resize: 'vertical' }} value={form.analysis} onChange={(e) => updateForm('analysis', e.target.value)} />
        </Field>
      </div>
    </>
  );
}

function PhoneticsEditor({ form, ext, updateExt, updateForm }) {
  return (
    <>
      <Field label="音素">
        <input className={styles.input} value={ext.phoneme || ''} onChange={(e) => updateExt('phoneme', e.target.value)} placeholder="例如：/æ/" />
      </Field>
      <Field label="示例文本">
        <input className={styles.input} value={form.content} onChange={(e) => updateForm('content', e.target.value)} placeholder="包含目标音素的示例句子或单词" />
      </Field>
      <Field label="音频 URL">
        <input className={styles.input} value={ext.audio_url || ''} onChange={(e) => updateExt('audio_url', e.target.value)} placeholder="https://..." />
      </Field>
    </>
  );
}

export function GenericEditor({ form, updateForm }) {
  return (
    <>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="题干">
          <textarea className={styles.input} style={{ minHeight: 80, resize: 'vertical' }} value={form.content} onChange={(e) => updateForm('content', e.target.value)} />
        </Field>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="答案">
          <textarea className={styles.input} style={{ minHeight: 60, resize: 'vertical' }} value={form.answer} onChange={(e) => updateForm('answer', e.target.value)} />
        </Field>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Field label="解析">
          <textarea className={styles.input} style={{ minHeight: 60, resize: 'vertical' }} value={form.analysis} onChange={(e) => updateForm('analysis', e.target.value)} />
        </Field>
      </div>
    </>
  );
}

export default function ModuleQuestionEditor({ moduleCode, form, ext, updateExt, updateForm }) {
  if (moduleCode === 'writing') return <WritingEditor form={form} ext={ext} updateExt={updateExt} updateForm={updateForm} />;
  if (moduleCode === 'reading') return <ReadingEditor form={form} ext={ext} updateExt={updateExt} updateForm={updateForm} />;
  if (moduleCode === 'listening') return <ListeningEditor form={form} ext={ext} updateExt={updateExt} updateForm={updateForm} />;
  if (moduleCode === 'translation') return <TranslationEditor form={form} ext={ext} updateExt={updateExt} updateForm={updateForm} />;
  if (moduleCode === 'speaking') return <SpeakingEditor form={form} ext={ext} updateExt={updateExt} updateForm={updateForm} />;
  if (moduleCode === 'grammar') return <GrammarEditor form={form} ext={ext} updateExt={updateExt} updateForm={updateForm} />;
  if (moduleCode === 'vocabulary') return <VocabularyEditor form={form} ext={ext} updateExt={updateExt} updateForm={updateForm} />;
  if (moduleCode === 'phonetics') return <PhoneticsEditor form={form} ext={ext} updateExt={updateExt} updateForm={updateForm} />;
  return <GenericEditor form={form} updateForm={updateForm} />;
}
