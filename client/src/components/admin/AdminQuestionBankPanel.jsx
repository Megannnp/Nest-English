/* eslint-disable complexity */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import styles from './AdminPage.module.css';
import AdminQuestionBankMaterialsTab from './AdminQuestionBankMaterialsTab.jsx';
import AdminQuestionBankQuestionList from './AdminQuestionBankQuestionList.jsx';
import AdminQuestionBankResourcesTab from './AdminQuestionBankResourcesTab.jsx';
import {
  QuestionBankFilterBar,
  QuestionBankHeader,
  QuestionBankMessage,
  QuestionBankStats,
  QuestionBankTabs,
} from './AdminQuestionBankShellSections.jsx';
import AdminQuestionDeleteModal from './AdminQuestionDeleteModal.jsx';
import ModuleQuestionEditor, { GenericEditor } from './AdminQuestionEditors.jsx';
import {
  BATCH_DEFAULTS,
  EMPTY_META,
  MATERIAL_FORM,
  MODULE_QUESTION_TYPES,
  QUESTION_FORM,
} from './questionBankConstants.js';
import { Field, MultiSelectField, SelectField } from './questionBankFields.jsx';
import {
  activeItems,
  asOptions,
  formatImportContext,
  mapMaterialForm,
  mapQuestionForm,
  mapResourceForm,
  normalizeJsonInput,
  parseAikenInput,
  questionTypeLabel,
  readQbTabFromHash,
  validateQuestionForm,
  writeQbTabToHash,
} from './questionBankUtils.js';
import {
  deleteAdminQuestion,
  fetchAdminQuestionBankMaterials,
  fetchAdminQuestionBankMetadata,
  fetchAdminQuestionBankQuestionDetail,
  fetchAdminQuestionBankQuestions,
  aiNormalizeAdminQuestionBankQuestions,
  importAdminQuestionBankQuestions,
  importAdminQuestionBank,
  saveAdminQuestionBankMaterial,
  saveAdminQuestionBankQuestion,
  saveAdminQuestionBankResource,
  updateAdminQuestionBankMaterial,
  updateAdminQuestionBankQuestion,
  updateAdminQuestionBankResource,
  validateAdminQuestionBankQuestions,
} from '../../api/admin.js';

const MODULE_LABELS = {
  writing: '写作', reading: '阅读', listening: '听力', translation: '翻译',
  speaking: '口语', grammar: '语法', vocabulary: '词汇', phonetics: '语音',
};

/* ══════════════════════════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function AdminQuestionBankPanel() {
  const [tab, setTabState] = useState(readQbTabFromHash);
  const [resource, setResource] = useState('modules');
  const [metadata, setMetadata] = useState(EMPTY_META);
  const [materials, setMaterials] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [resourceForm, setResourceForm] = useState(mapResourceForm('modules'));
  const [resourceEditId, setResourceEditId] = useState('');
  const [materialForm, setMaterialForm] = useState(MATERIAL_FORM);
  const [materialEditId, setMaterialEditId] = useState('');
  const [questionForm, setQuestionForm] = useState(QUESTION_FORM);
  const [questionEditId, setQuestionEditId] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState(''); // for left sidebar selection
  const [jsonText, setJsonText] = useState('');
  const [batchFormat, setBatchFormat] = useState('text');
  const [batchDefaults, setBatchDefaults] = useState(BATCH_DEFAULTS);
  const [batchText, setBatchText] = useState('');
  const [batchPreview, setBatchPreview] = useState(null);
  const [batchResult, setBatchResult] = useState(null);
  const [batchShowAll, setBatchShowAll] = useState(false);
  const skipNextBatchPreviewResetRef = useRef(false);
  const [keyword, setKeyword] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [systemFilter, setSystemFilter] = useState('');
  const [questionStatusFilter, setQuestionStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [questionPage, setQuestionPage] = useState(1);
  const [materialPage, setMaterialPage] = useState(1);
  const [showLegacyImport, setShowLegacyImport] = useState(false);
  const QUESTION_PAGE_SIZE = 20;
  const MATERIAL_PAGE_SIZE = 20;
  const didInitialLoadRef = useRef(false);
  const skipFirstLoadRef = useRef(true);

  const setTab = useCallback((next) => {
    setTabState(next);
    writeQbTabToHash(next);
  }, []);

  useEffect(() => {
    function onHashChange() {
      setTabState(readQbTabFromHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  /* ── Derived state ─────────────────────────────────────────────────────── */

  const resourceRows = useMemo(() => {
    if (resource === 'learning-systems') return metadata.systems;
    if (resource === 'knowledge-points') return metadata.knowledge_points;
    return metadata[resource] || [];
  }, [metadata, resource]);

  const filteredQuestionCategories = useMemo(() => activeItems(metadata.categories).filter((item) => {
    if (questionForm.module_id && item.module_id !== questionForm.module_id) return false;
    if (item.system_id && item.system_id !== questionForm.system_id) return false;
    return true;
  }), [metadata.categories, questionForm.module_id, questionForm.system_id]);

  const filteredQuestionDifficulties = useMemo(() => activeItems(metadata.difficulties).filter((item) => {
    if (questionForm.module_id && item.module_id && item.module_id !== questionForm.module_id) return false;
    if (item.system_id && item.system_id !== questionForm.system_id) return false;
    return true;
  }), [metadata.difficulties, questionForm.module_id, questionForm.system_id]);

  const filteredQuestionMaterials = useMemo(() => activeItems(materials).filter((item) => {
    if (questionForm.module_id && item.module_id && item.module_id !== questionForm.module_id) return false;
    return true;
  }), [materials, questionForm.module_id]);

  const filteredQuestionKnowledgePoints = useMemo(() => activeItems(metadata.knowledge_points).filter((item) => {
    if (questionForm.module_id && item.module_id && item.module_id !== questionForm.module_id) return false;
    return true;
  }), [metadata.knowledge_points, questionForm.module_id]);

  const filteredBatchCategories = useMemo(() => activeItems(metadata.categories).filter((item) => {
    if (batchDefaults.module_id && item.module_id !== batchDefaults.module_id) return false;
    if (item.system_id && item.system_id !== batchDefaults.system_id) return false;
    return true;
  }), [metadata.categories, batchDefaults.module_id, batchDefaults.system_id]);

  const filteredBatchDifficulties = useMemo(() => activeItems(metadata.difficulties).filter((item) => {
    if (batchDefaults.module_id && item.module_id && item.module_id !== batchDefaults.module_id) return false;
    if (item.system_id && item.system_id !== batchDefaults.system_id) return false;
    return true;
  }), [metadata.difficulties, batchDefaults.module_id, batchDefaults.system_id]);

  const filteredBatchKnowledgePoints = useMemo(() => activeItems(metadata.knowledge_points).filter((item) => {
    if (batchDefaults.module_id && item.module_id && item.module_id !== batchDefaults.module_id) return false;
    return true;
  }), [metadata.knowledge_points, batchDefaults.module_id]);

  const batchModuleCode = useMemo(() => {
    const mod = (metadata.modules || []).find((item) => item.id === batchDefaults.module_id);
    return mod?.code || '';
  }, [metadata.modules, batchDefaults.module_id]);

  const batchQuestionTypes = MODULE_QUESTION_TYPES[batchModuleCode] || [];

  /* ── Stats ─────────────────────────────────────────────────────────────── */

  const questionModuleCode = useMemo(() => {
    const mod = (metadata.modules || []).find((m) => m.id === questionForm.module_id);
    return mod?.code || '';
  }, [metadata.modules, questionForm.module_id]);

  const questionTypes = MODULE_QUESTION_TYPES[questionModuleCode] || [];

  const stats = useMemo(() => {
    const activeQuestions = questions.filter((q) => q.status === 'active');
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const recentQuestions = questions.filter((q) => {
      const createdAt = q.created_at ? new Date(q.created_at).getTime() : 0;
      return createdAt > weekAgo;
    });
    const activeMaterials = materials.filter((m) => m.status === 'active');
    const moduleCount = activeItems(metadata.modules).length;
    // count by module
    const byModule = {};
    questions.forEach((q) => {
      const name = q.module_name || q.module_id || '未知';
      byModule[name] = (byModule[name] || 0) + 1;
    });
    const topModule = Object.entries(byModule).sort((a, b) => b[1] - a[1])[0];
    return {
      total: questions.length,
      active: activeQuestions.length,
      recent: recentQuestions.length,
      materials: activeMaterials.length,
      modules: moduleCount,
      topModule: topModule ? `${topModule[0]} ${topModule[1]}题` : '—',
      tagCount: activeItems(metadata.tags).length,
    };
  }, [questions, materials, metadata]);

  /* ── State updaters ────────────────────────────────────────────────────── */

  function updateResourceForm(key, value) {
    setResourceForm((current) => ({ ...current, [key]: value }));
  }

  function updateMaterialForm(key, value) {
    setMaterialForm((current) => ({ ...current, [key]: value }));
  }

  function updateQuestionForm(key, value) {
    setQuestionForm((current) => ({ ...current, [key]: value }));
  }

  function updateQuestionMaterialId(value) {
    setQuestionForm((current) => ({
      ...current,
      material_id: value,
      material_ids: current.material_ids.filter((id) => id !== value),
    }));
  }

  function updateQuestionExt(key, value) {
    setQuestionForm((current) => ({ ...current, ext: { ...current.ext, [key]: value } }));
  }

  function updateQuestionScope(key, value) {
    setQuestionForm((current) => ({
      ...current,
      [key]: value,
      question_type: key === 'module_id' ? '' : current.question_type,
      category_id: '',
      difficulty_id: '',
      material_id: key === 'module_id' ? '' : current.material_id,
      material_ids: key === 'module_id' ? [] : current.material_ids,
      knowledge_point_ids: key === 'module_id' ? [] : current.knowledge_point_ids,
      ext: key === 'module_id' ? {} : current.ext,
    }));
  }

  function updateBatchDefault(key, value) {
    setBatchDefaults((current) => {
      const next = { ...current, [key]: value };
      if (key === 'module_id' || key === 'system_id') {
        next.category_id = '';
        next.difficulty_id = '';
      }
      if (key === 'module_id') {
        next.question_type = '';
        next.tag_ids = [];
        next.knowledge_point_ids = [];
      }
      return next;
    });
  }

  function applyBatchDefaults(items) {
    return items.map((item) => {
      const next = { ...item };
      if (!next.module_id && !next.module && !next.module_code) next.module_id = batchDefaults.module_id;
      if (!next.system_id && !next.system && !next.system_code) next.system_id = batchDefaults.system_id;
      if (!next.category_id && !next.category && !next.category_code) next.category_id = batchDefaults.category_id;
      if (!next.difficulty_id && !next.difficulty && !next.level) next.difficulty_id = batchDefaults.difficulty_id;
      if (!next.question_type && !next.questionType && !next.type) next.question_type = batchDefaults.question_type;
      if (!next.tag_ids && !next.tags) next.tag_ids = batchDefaults.tag_ids;
      if (!next.knowledge_point_ids && !next.knowledge_points) next.knowledge_point_ids = batchDefaults.knowledge_point_ids;
      return next;
    });
  }

  function buildBatchImportItems() {
    if (batchFormat === 'text') throw new Error('普通文本请先点击 AI 解析归类，再预览导入结果');
    const items = batchFormat === 'aiken'
      ? parseAikenInput(batchText, batchDefaults.module_id, batchModuleCode, batchDefaults.question_type)
      : normalizeJsonInput(batchText);
    const nextItems = applyBatchDefaults(items);
    if (!nextItems.length) throw new Error('没有可导入的题目');
    return nextItems;
  }

  /* ── API calls ──────────────────────────────────────────────────────────── */

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextMeta, nextMaterials, nextQuestions] = await Promise.all([
        fetchAdminQuestionBankMetadata(),
        fetchAdminQuestionBankMaterials({ keyword: keyword.trim(), moduleId: moduleFilter }),
        fetchAdminQuestionBankQuestions({
          keyword: keyword.trim(),
          moduleId: moduleFilter,
          systemId: systemFilter,
          status: questionStatusFilter,
        }),
      ]);
      setMetadata(nextMeta || EMPTY_META);
      setMaterials(nextMaterials || []);
      setQuestions(nextQuestions || []);
    } catch (err) {
      setError(err.message || '加载题库失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, moduleFilter, questionStatusFilter, systemFilter]);

  async function saveResource() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (resourceEditId) {
        await updateAdminQuestionBankResource(resource, resourceEditId, resourceForm);
      } else {
        await saveAdminQuestionBankResource(resource, resourceForm);
      }
      setResourceEditId('');
      setResourceForm(mapResourceForm(resource));
      setNotice('配置已保存');
      await loadAll();
    } catch (err) {
      setError(err.message || '保存配置失败');
    } finally {
      setSaving(false);
    }
  }

  async function saveMaterial() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (materialEditId) {
        await updateAdminQuestionBankMaterial(materialEditId, materialForm);
      } else {
        await saveAdminQuestionBankMaterial(materialForm);
      }
      setMaterialEditId('');
      setMaterialForm(MATERIAL_FORM);
      setNotice('素材已保存');
      await loadAll();
    } catch (err) {
      setError(err.message || '保存素材失败');
    } finally {
      setSaving(false);
    }
  }

  async function saveQuestion() {
    setError('');
    setNotice('');
    const validationError = validateQuestionForm(questionForm);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...questionForm,
        score: questionForm.score === '' ? null : Number(questionForm.score),
        estimated_time: questionForm.estimated_time === '' ? null : Number(questionForm.estimated_time),
      };
      let result;
      if (questionEditId) {
        result = await updateAdminQuestionBankQuestion(questionEditId, payload);
      } else {
        result = await saveAdminQuestionBankQuestion(payload);
      }
      setQuestionEditId('');
      setSelectedQuestionId('');
      setQuestionForm(QUESTION_FORM);
      setNotice('题目已保存');
      await loadAll();
      // auto-select the newly saved question if we have its id
      if (result?.id) setSelectedQuestionId(result.id);
    } catch (err) {
      setError(err.message || '保存题目失败');
    } finally {
      setSaving(false);
    }
  }

  async function importWritingQuestions() {
    setError('');
    setNotice('');
    let items;
    try {
      items = normalizeJsonInput(jsonText);
    } catch (err) {
      setError(err.message || 'JSON 格式错误');
      return;
    }
    setSaving(true);
    try {
      const imported = await importAdminQuestionBank(items);
      setJsonText('');
      setNotice(`已导入 ${imported.length} 道旧版写作题`);
      await loadAll();
    } catch (err) {
      setError(err.message || '导入失败');
    } finally {
      setSaving(false);
    }
  }

  async function importBatchQuestions() {
    setError('');
    setNotice('');
    setBatchResult(null);
    let items;
    try {
      items = batchPreview?.items || buildBatchImportItems();
    } catch (err) {
      setError(err.message || '批量导入格式错误');
      return;
    }
    setSaving(true);
    try {
      const validation = await validateAdminQuestionBankQuestions(items);
      if (validation.invalid) {
        setBatchPreview({ items, validation });
        setError(`题目配置已变化：还有 ${validation.invalid} 道需修正，请重新预览后导入`);
        return;
      }
      const result = await importAdminQuestionBankQuestions(items);
      setBatchResult(result);
      setNotice(`批量导入完成：成功 ${result.created} 道，失败 ${result.failed} 道`);
      if (!result.failed) {
        setBatchText('');
      } else {
        const failedItems = (result.results || [])
          .filter((item) => !item.ok)
          .map((item) => items[item.index])
          .filter(Boolean);
        setBatchText(JSON.stringify(failedItems, null, 2));
        setBatchPreview(null);
      }
      await loadAll();
    } catch (err) {
      setError(err.message || '批量导入失败');
    } finally {
      setSaving(false);
    }
  }

  async function previewBatchQuestions() {
    setError('');
    setNotice('');
    setBatchResult(null);
    setSaving(true);
    try {
      const items = buildBatchImportItems();
      const validation = await validateAdminQuestionBankQuestions(items);
      setBatchPreview({ items, validation });
      setNotice(`已解析 ${items.length} 道题：可导入 ${validation.valid} 道，需修正 ${validation.invalid} 道`);
    } catch (err) {
      setBatchPreview(null);
      setError(err.message || '批量导入格式错误');
    } finally {
      setSaving(false);
    }
  }

  async function aiNormalizeBatchQuestions() {
    setError('');
    setNotice('');
    setBatchResult(null);
    if (!batchText.trim()) {
      setError('请先粘贴需要 AI 解析的题目内容');
      return;
    }
    setSaving(true);
    try {
      const result = await aiNormalizeAdminQuestionBankQuestions({
        text: batchText,
        format: batchFormat,
        defaults: batchDefaults,
      });
      const items = applyBatchDefaults(Array.isArray(result?.items) ? result.items : []);
      if (!items.length) throw new Error('AI 未解析出题目，请调整输入后重试');
      const validation = await validateAdminQuestionBankQuestions(items);
      skipNextBatchPreviewResetRef.current = true;
      setBatchFormat('json');
      setBatchText(JSON.stringify(items, null, 2));
      setBatchPreview({ items, validation });
      setNotice(`AI 已解析 ${items.length} 道题：可导入 ${validation.valid} 道，需修正 ${validation.invalid} 道`);
    } catch (err) {
      setBatchPreview(null);
      setError(err.message || 'AI 解析归类失败');
    } finally {
      setSaving(false);
    }
  }

  /* ── Effects ────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (skipFirstLoadRef.current) {
      skipFirstLoadRef.current = false;
      return;
    }
    setQuestionPage(1);
    setMaterialPage(1);
    const timer = setTimeout(() => { void loadAll(); }, 300);
    return () => clearTimeout(timer);
  }, [keyword, loadAll, moduleFilter, questionStatusFilter, systemFilter]);

  const skipTabReloadRef = useRef(true);
  useEffect(() => {
    if (skipTabReloadRef.current) {
      skipTabReloadRef.current = false;
      return;
    }
    if (tab === 'questions' || tab === 'materials') {
      void loadAll();
    }
  }, [loadAll, tab]);

  useEffect(() => {
    setResourceEditId('');
    setResourceForm(mapResourceForm(resource));
  }, [resource]);

  useEffect(() => {
    if (skipNextBatchPreviewResetRef.current) {
      skipNextBatchPreviewResetRef.current = false;
      return;
    }
    setBatchPreview(null);
    setBatchShowAll(false);
  }, [batchText, batchFormat, batchDefaults]);

  function downloadBatchErrors() {
    const errors = (batchPreview?.validation?.results || []).filter((item) => !item.ok);
    if (!errors.length) return;
    const lines = errors.map((item) => `#${item.index + 1}\t${item.title || '未命名'}\t${item.message}\t${formatImportContext(item.context)}`);
    const text = `序号\t标题\t错误\t上下文\n${lines.join('\n')}`;
    const blob = new Blob([text], { type: 'text/tab-separated-values;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-import-errors-${Date.now()}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Pagination helpers ─────────────────────────────────────────────────── */

  const totalQuestionPages = Math.max(1, Math.ceil(questions.length / QUESTION_PAGE_SIZE));
  const currentQPage = Math.min(questionPage, totalQuestionPages);
  const pagedQuestions = questions.slice((currentQPage - 1) * QUESTION_PAGE_SIZE, currentQPage * QUESTION_PAGE_SIZE);

  const totalMaterialPages = Math.max(1, Math.ceil(materials.length / MATERIAL_PAGE_SIZE));
  const currentMPage = Math.min(materialPage, totalMaterialPages);
  const pagedMaterials = materials.slice((currentMPage - 1) * MATERIAL_PAGE_SIZE, currentMPage * MATERIAL_PAGE_SIZE);

  /* ── Question editing helpers ───────────────────────────────────────────── */

  async function startEditQuestion(item) {
    setSelectedQuestionId(item.id);
    setQuestionEditId(item.id);
    setQuestionForm(mapQuestionForm(item));
    setError('');
    setDetailLoading(true);
    try {
      const detail = await fetchAdminQuestionBankQuestionDetail(item.id);
      if (detail) setQuestionForm(mapQuestionForm(detail));
    } catch (err) {
      setError(`加载题目详情失败：${err?.message || '请重试'}。`);
      setQuestionEditId('');
      setSelectedQuestionId('');
      setQuestionForm(QUESTION_FORM);
    } finally {
      setDetailLoading(false);
    }
  }

  function startNewQuestion() {
    setQuestionEditId('');
    setSelectedQuestionId('');
    setQuestionForm(QUESTION_FORM);
  }

  function cancelQuestionEdit() {
    setQuestionEditId('');
    setSelectedQuestionId('');
    setQuestionForm(QUESTION_FORM);
  }

  /* ════════════════════════════════════════════════════════════════════════════
     RENDER
     ═════════════════════════════════════════════════════════════════════════ */

  const showFilterBar = tab === 'questions' || tab === 'materials';
  return (
    <div style={{ background: 'var(--color-bg)', minHeight: 'calc(100vh - 54px)' }}>
      <main style={{ width: 'min(1180px, 100%)', margin: '0 auto', padding: '30px 20px 64px' }}>

        {/* ═══ HEADER ═══ */}
        <QuestionBankHeader
          tab={tab}
          resource={resource}
          onNewQuestion={startNewQuestion}
          onNewMaterial={() => {
            setMaterialEditId('');
            setMaterialForm(MATERIAL_FORM);
          }}
          onNewResource={(nextResource) => {
            setResourceEditId('');
            setResourceForm(mapResourceForm(nextResource));
          }}
        />

        {/* ═══ Messages ═══ */}
        <QuestionBankMessage error={error} notice={notice} />

        {/* ═══ STATS DASHBOARD ═══ */}
        <QuestionBankStats stats={stats} />

        {/* ═══ TAB NAVIGATION ═══ */}
        <QuestionBankTabs tab={tab} onTabChange={setTab} />

        {/* ═══ FILTER BAR (only for questions / materials) ═══ */}
        <QuestionBankFilterBar
          tab={tab}
          show={showFilterBar}
          metadata={metadata}
          moduleFilter={moduleFilter}
          systemFilter={systemFilter}
          questionStatusFilter={questionStatusFilter}
          keyword={keyword}
          loading={loading}
          onModuleFilterChange={setModuleFilter}
          onSystemFilterChange={setSystemFilter}
          onQuestionStatusFilterChange={setQuestionStatusFilter}
          onKeywordChange={setKeyword}
          onSearch={() => void loadAll()}
        />

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: RESOURCES (分类设置) — left-right split
           ═══════════════════════════════════════════════════════════════════ */}
        {tab === 'resources' ? (
          <AdminQuestionBankResourcesTab
            resource={resource}
            resourceRows={resourceRows}
            resourceEditId={resourceEditId}
            resourceForm={resourceForm}
            metadata={metadata}
            saving={saving}
            onResourceChange={setResource}
            onSelectResource={(item) => {
              setResourceEditId(item.id);
              setResourceForm(mapResourceForm(resource, item));
            }}
            onResourceFormChange={updateResourceForm}
            onSaveResource={() => void saveResource()}
            onCancelResource={() => {
              setResourceEditId('');
              setResourceForm(mapResourceForm(resource));
            }}
          />
        ) : null}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: MATERIALS (素材库) — left-right split
           ═══════════════════════════════════════════════════════════════════ */}
        {tab === 'materials' ? (
          <AdminQuestionBankMaterialsTab
            materials={materials}
            pagedMaterials={pagedMaterials}
            totalMaterialPages={totalMaterialPages}
            currentMPage={currentMPage}
            materialEditId={materialEditId}
            materialForm={materialForm}
            metadata={metadata}
            saving={saving}
            onSelectMaterial={(item) => {
              setMaterialEditId(item.id);
              setMaterialForm(mapMaterialForm(item));
            }}
            onMaterialPageChange={setMaterialPage}
            onMaterialFormChange={updateMaterialForm}
            onSaveMaterial={() => void saveMaterial()}
            onCancelMaterial={() => {
              setMaterialEditId('');
              setMaterialForm(MATERIAL_FORM);
            }}
          />
        ) : null}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: QUESTIONS (题目列表) — left-right split
           ═══════════════════════════════════════════════════════════════════ */}
        {tab === 'questions' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
            <AdminQuestionBankQuestionList
              questions={questions}
              pagedQuestions={pagedQuestions}
              questionEditId={questionEditId}
              totalQuestionPages={totalQuestionPages}
              currentQPage={currentQPage}
              onSelectQuestion={startEditQuestion}
              onQuestionPageChange={setQuestionPage}
            />

            {/* RIGHT: edit form */}
            <section style={{ display: 'grid', gap: 16 }}>
              {(questionEditId || selectedQuestionId === '' && questionForm.module_id) || questionEditId === '' ? (
                <div className={styles.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--color-primary)' }}>
                        {questionEditId ? '编辑题目' : '新增题目'}
                      </div>
                      <h2 style={{ margin: '4px 0 0', fontSize: 18, color: 'var(--color-text)' }}>
                        {questionEditId ? (questions.find(q => q.id === questionEditId)?.title || '加载中…') : '填写题目信息'}
                      </h2>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {questionEditId ? (
                        <>
                          <button type="button" className={styles.ghostBtn} style={{ color: '#256234', borderColor: '#b7d8bd' }}
                            onClick={async () => {
                              const item = questions.find(q => q.id === questionEditId);
                              if (!item) return;
                              const next = item.status === 'active' ? 'disabled' : 'active';
                              setError('');
                              try {
                                await updateAdminQuestionBankQuestion(item.id, { status: next });
                                await loadAll();
                              } catch (err) {
                                setError(err?.message || '状态更新失败');
                              }
                            }}>
                            {questions.find(q => q.id === questionEditId)?.status === 'active' ? '禁用' : '启用'}
                          </button>
                          <button type="button" className={styles.ghostBtn} style={{ color: '#8a2d2d', borderColor: '#d8b4b4' }}
                            onClick={() => {
                              const item = questions.find(q => q.id === questionEditId);
                              if (item) setDeleteTarget(item);
                            }}>
                            删除
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <fieldset disabled={detailLoading} style={{ border: 'none', margin: 0, padding: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="科目">
                        <SelectField value={questionForm.module_id} onChange={(value) => updateQuestionScope('module_id', value)} options={asOptions(activeItems(metadata.modules))} />
                      </Field>
                      {questionTypes.length > 0 ? (
                        <Field label="题型">
                          <select className={styles.input} value={questionForm.question_type} onChange={(e) => updateQuestionForm('question_type', e.target.value)}>
                            <option value="">请选择题型</option>
                            {questionTypes.map((qt) => (
                              <option key={qt.value} value={qt.value}>{qt.label}</option>
                            ))}
                          </select>
                        </Field>
                      ) : (
                        <Field label="题型">
                          <input className={styles.input} value={questionForm.question_type} onChange={(e) => updateQuestionForm('question_type', e.target.value)} placeholder="选科目后显示可选题型" disabled={!questionForm.module_id} />
                        </Field>
                      )}
                      <Field label="标题">
                        <input className={styles.input} value={questionForm.title} onChange={(e) => updateQuestionForm('title', e.target.value)} />
                      </Field>
                    </div>

                    {/* Module-specific editor */}
                    <div style={{ marginTop: 12 }}>
                      {questionModuleCode ? (
                        <>
                          <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--color-primary)', marginBottom: 10, paddingTop: 8, borderTop: `1px solid ${'var(--color-bg-muted)'}` }}>
                            {MODULE_LABELS[questionModuleCode] || questionModuleCode} 专属字段
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <ModuleQuestionEditor
                              moduleCode={questionModuleCode}
                              form={questionForm}
                              ext={questionForm.ext || {}}
                              updateExt={updateQuestionExt}
                              updateForm={updateQuestionForm}
                            />
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <GenericEditor form={questionForm} updateForm={updateQuestionForm} />
                        </div>
                      )}
                    </div>

                    {/* Classification */}
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--color-primary)', marginBottom: 10, marginTop: 12, paddingTop: 8, borderTop: `1px solid ${'var(--color-bg-muted)'}` }}>
                      分类与属性
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="备考目标">
                        <SelectField value={questionForm.system_id} onChange={(value) => updateQuestionScope('system_id', value)} options={asOptions(activeItems(metadata.systems))} />
                      </Field>
                      <Field label="分类">
                        <SelectField value={questionForm.category_id} onChange={(value) => updateQuestionForm('category_id', value)} options={asOptions(filteredQuestionCategories)} />
                      </Field>
                      <Field label="难度">
                        <SelectField value={questionForm.difficulty_id} onChange={(value) => updateQuestionForm('difficulty_id', value)} options={asOptions(filteredQuestionDifficulties)} />
                      </Field>
                      <Field label="素材">
                        <SelectField value={questionForm.material_id} onChange={updateQuestionMaterialId} options={asOptions(filteredQuestionMaterials)} />
                      </Field>
                    </div>
                    <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                      <Field label="附加素材">
                        <MultiSelectField
                          value={questionForm.material_ids}
                          onChange={(value) => updateQuestionForm('material_ids', value)}
                          options={filteredQuestionMaterials}
                        />
                      </Field>
                      <Field label="标签">
                        <MultiSelectField
                          value={questionForm.tag_ids}
                          onChange={(value) => updateQuestionForm('tag_ids', value)}
                          options={metadata.tags}
                        />
                      </Field>
                      <Field label="知识点">
                        <MultiSelectField
                          value={questionForm.knowledge_point_ids}
                          onChange={(value) => updateQuestionForm('knowledge_point_ids', value)}
                          options={filteredQuestionKnowledgePoints}
                        />
                      </Field>
                    </div>

                    {/* Source & settings */}
                    <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--color-primary)', marginBottom: 10, marginTop: 12, paddingTop: 8, borderTop: `1px solid ${'var(--color-bg-muted)'}` }}>
                      来源与设置
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="来源说明">
                        <input className={styles.input} value={questionForm.source_label} onChange={(e) => updateQuestionForm('source_label', e.target.value)} placeholder="例如 2024 高考全国卷" />
                      </Field>
                      <Field label="分值">
                        <input className={styles.input} type="number" value={questionForm.score} onChange={(e) => updateQuestionForm('score', e.target.value)} />
                      </Field>
                      <Field label="预计用时（秒）">
                        <input className={styles.input} type="number" value={questionForm.estimated_time} onChange={(e) => updateQuestionForm('estimated_time', e.target.value)} />
                      </Field>
                      <Field label="状态">
                        <select className={styles.input} value={questionForm.status} onChange={(e) => updateQuestionForm('status', e.target.value)}>
                          <option value="active">启用</option>
                          <option value="disabled">禁用</option>
                        </select>
                      </Field>
                    </div>
                  </fieldset>

                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button type="button" className={styles.primaryBtn} onClick={() => void saveQuestion()} disabled={saving || detailLoading}>
                      {detailLoading ? '加载中…' : questionEditId ? '保存题目' : '新增题目'}
                    </button>
                    <button type="button" className={styles.ghostBtn} onClick={cancelQuestionEdit} disabled={detailLoading}>
                      取消
                    </button>
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 8 }}>题目保存后即时生效，学生端可被引用到练习和作业中。</div>
                </div>
              ) : (
                <div className={styles.card} style={{ textAlign: 'center', padding: 48 }}>
                  <p style={{ color: 'var(--color-text-muted)', fontSize: 15, margin: 0 }}>选择左侧题目开始编辑，或点击上方「新建题目」创建新题。</p>
                </div>
              )}
            </section>
          </div>
        ) : null}

        {/* ══════════════════════════════════════════════════════════════════════
            DELETE MODAL
           ═══════════════════════════════════════════════════════════════════ */}
        <AdminQuestionDeleteModal
          target={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async (target) => {
            setDeleteTarget(null);
            setError('');
            try {
              await deleteAdminQuestion(target.id);
              setNotice(`已删除「${target.title}」`);
              setQuestionEditId('');
              setSelectedQuestionId('');
              setQuestionForm(QUESTION_FORM);
              await loadAll();
            } catch (err) {
              setError(err?.message || '删除失败');
            }
          }}
        />

        {/* ══════════════════════════════════════════════════════════════════════
            TAB: BATCH IMPORT (批量录题) — full width
           ═══════════════════════════════════════════════════════════════════ */}
        {tab === 'batch-import' ? (
          <div className={styles.card}>
            <h2 style={{ margin: '0 0 14px', fontSize: 18, color: 'var(--color-text)' }}>批量录题</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="导入格式">
                <select className={styles.input} value={batchFormat} onChange={(e) => setBatchFormat(e.target.value)}>
                  <option value="text">普通文本</option>
                  <option value="aiken">Aiken 选择题文本</option>
                  <option value="json">JSON（高级）</option>
                </select>
              </Field>
              <Field label="默认科目">
                <SelectField value={batchDefaults.module_id} onChange={(value) => updateBatchDefault('module_id', value)} options={asOptions(activeItems(metadata.modules), '选择科目')} />
              </Field>
              <Field label="默认备考目标">
                <SelectField value={batchDefaults.system_id} onChange={(value) => updateBatchDefault('system_id', value)} options={asOptions(activeItems(metadata.systems))} />
              </Field>
              <Field label="默认分类">
                <SelectField value={batchDefaults.category_id} onChange={(value) => updateBatchDefault('category_id', value)} options={asOptions(filteredBatchCategories)} />
              </Field>
              <Field label="默认难度">
                <SelectField value={batchDefaults.difficulty_id} onChange={(value) => updateBatchDefault('difficulty_id', value)} options={asOptions(filteredBatchDifficulties)} />
              </Field>
              <Field label="默认题型">
                {batchQuestionTypes.length ? (
                  <select className={styles.input} value={batchDefaults.question_type} onChange={(e) => updateBatchDefault('question_type', e.target.value)}>
                    <option value="">自动识别</option>
                    {batchQuestionTypes.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                ) : (
                  <input className={styles.input} value={batchDefaults.question_type} onChange={(e) => updateBatchDefault('question_type', e.target.value)} placeholder="留空自动识别" />
                )}
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <Field label="默认标签">
                <MultiSelectField value={batchDefaults.tag_ids} onChange={(value) => updateBatchDefault('tag_ids', value)} options={metadata.tags} />
              </Field>
              <Field label="默认知识点">
                <MultiSelectField value={batchDefaults.knowledge_point_ids} onChange={(value) => updateBatchDefault('knowledge_point_ids', value)} options={filteredBatchKnowledgePoints} />
              </Field>
            </div>
            <label className={styles.label} style={{ marginTop: 14 }}>
              {batchFormat === 'aiken'
                ? '粘贴 Aiken 选择题文本'
                : batchFormat === 'json'
                  ? '粘贴 JSON 题目数据'
                  : '粘贴题目原文'}
            </label>
            <textarea
              className={styles.input} style={{ minHeight: 180, resize: 'vertical', marginTop: 6, width: '100%', boxSizing: 'border-box' }}
              aria-label="批量导入题目文本"
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={batchFormat === 'aiken'
                ? 'TYPE: multi_choice\nWhich words are nouns?\nA. education\nB. quickly\nC. technology\nD. beautiful\nANSWER: AC\n\nTYPE: true_false\nThe passage mainly discusses pollution.\nANSWER: true'
                : batchFormat === 'json'
                  ? '[{"title":"阅读单选","module":"reading","question_type":"single_choice","content":"题干...","options":["A","B","C","D"],"answer":"A","analysis":"解析","tags":["高频"],"knowledge_points":["推理判断"]}]'
                  : '直接粘贴试卷、练习题、拍照 OCR 后的文本或老师整理的题目内容。先点「AI 解析归类」，系统生成可人工确认的预览结果。'}
            />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button type="button" className={styles.ghostBtn}
                onClick={() => void aiNormalizeBatchQuestions()}
                disabled={saving || !batchText.trim()}>
                AI 解析归类
              </button>
              <button type="button" className={styles.ghostBtn}
                onClick={() => void previewBatchQuestions()}
                disabled={saving || !batchText.trim() || batchFormat === 'text'}>
                预览题目
              </button>
              <button type="button" className={styles.primaryBtn}
                onClick={() => void importBatchQuestions()}
                disabled={saving || !batchText.trim() || !batchPreview || Boolean(batchPreview?.validation?.invalid)}>
                确认导入
              </button>
            </div>

            {/* Batch preview results */}
            {batchPreview ? (
              <div style={{ marginTop: 14 }}>
                {(() => {
                  const failedItems = (batchPreview.validation?.results || []).filter((item) => !item.ok);
                  const shownErrors = batchShowAll ? failedItems : failedItems.slice(0, 20);
                  const shownItems = batchShowAll ? (batchPreview.items || []) : (batchPreview.items || []).slice(0, 10);
                  return (
                    <>
                      {failedItems.length > 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <strong style={{ color: '#8a2d2d', fontSize: 13 }}>{failedItems.length} 道需修正</strong>
                          <button type="button" className={styles.ghostBtn} onClick={() => downloadBatchErrors()}>下载错误列表</button>
                        </div>
                      ) : null}
                      {shownErrors.map((item) => (
                        <div key={`validation-${item.index}`} style={{ color: '#8a2d2d', fontSize: 12, padding: '4px 0', borderBottom: `1px solid ${'var(--color-bg-muted)'}` }}>
                          #{item.index + 1} {item.title || '未命名'} — {item.message}
                          {formatImportContext(item.context) ? `（${formatImportContext(item.context)}）` : ''}
                        </div>
                      ))}
                      {failedItems.length > 20 && !batchShowAll ? (
                        <button type="button" className={styles.ghostBtn} onClick={() => setBatchShowAll(true)}>
                          显示全部 {failedItems.length} 条
                        </button>
                      ) : null}
                      {shownItems.map((item, index) => (
                        <div key={`${item.title || item.content || index}-${index}`} style={{ color: '#256234', fontSize: 12, padding: '3px 0' }}>
                          #{index + 1} {item.title || item.content || '未命名'} · {questionTypeLabel(item.question_type) || '未设题型'}
                        </div>
                      ))}
                      {batchPreview.items.length > 10 && !batchShowAll ? (
                        <button type="button" className={styles.ghostBtn} onClick={() => setBatchShowAll(true)}>
                          显示全部 {batchPreview.items.length} 道
                        </button>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            ) : null}

            {batchResult ? (
              <div style={{ marginTop: 14 }}>
                {(batchResult.results || []).slice(0, 50).map((item) => (
                  <div key={item.index} style={{ color: item.ok ? '#256234' : '#8a2d2d', fontSize: 12, padding: '3px 0' }}>
                    #{item.index + 1} {item.ok ? `已导入：${item.title || item.id}` : `失败：${item.title || '未命名'} — ${item.message}`}
                  </div>
                ))}
              </div>
            ) : null}

            {/* Legacy import */}
            <button type="button" className={styles.ghostBtn} style={{ marginTop: 16 }}
              onClick={() => setShowLegacyImport(!showLegacyImport)}>
              <span style={{ display: 'inline-block', transition: 'transform 0.2s', transform: showLegacyImport ? 'rotate(90deg)' : '' }}>
                {'\u25B6'}
              </span>
              {' '}旧版写作题导入（兼容格式）
            </button>
            {showLegacyImport ? (
              <div style={{ marginTop: 10, padding: 12, border: `1px solid ${'var(--color-border)'}`, borderRadius: 8, background: 'var(--color-bg-muted)' }}>
                <label className={styles.label} style={{ marginBottom: 6 }}>旧版写作题 JSON 粘贴导入</label>
                <textarea
                  className={styles.input} style={{ minHeight: 120, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                  aria-label="旧版写作题 JSON"
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder='[{"title":"2025 新高考写作","type":"practical","promptText":"题干...","sourceYear":"2025"}]'
                />
                <button type="button" className={styles.primaryBtn} style={{ marginTop: 10 }}
                  onClick={() => void importWritingQuestions()}
                  disabled={saving || !jsonText.trim()}>
                  导入写作题
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   Options / requirements / scoring editors
   ═══════════════════════════════════════════════════════════════════════════ */
