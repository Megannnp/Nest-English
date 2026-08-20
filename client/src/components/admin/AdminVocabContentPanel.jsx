import { useCallback, useEffect, useState } from "react";

import { vocabularyAPI } from "../../api/index.js";
import "./AdminVocabContentPanel.css";

const TABS = [
  { id: "reading", label: "阅读词汇" },
  { id: "writing", label: "写作词汇" },
  { id: "synonyms", label: "同义替换" },
  { id: "course", label: "课程内容" },
];

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function emptyWord() {
  return { word: "", pos: "", phonetic: "", zh: "", example: "", tip: "" };
}

function emptyCategory() {
  return { id: newId("cat"), label: "新分类", desc: "", icon: "📘", words: [] };
}

function emptySynonym() {
  return { base: "", zh: "", syns: [] };
}

function emptyBranchNode() {
  return { id: newId("node"), title: "新分支", children: [] };
}

function emptyLeafNode() {
  return { id: newId("node"), title: "新知识点", content: "", quiz: [] };
}

function WordRowEditor({ word, onChange, onDelete }) {
  return (
    <tr>
      <td><input aria-label="单词" value={word.word} onChange={(e) => onChange({ ...word, word: e.target.value })} placeholder="word" /></td>
      <td><input aria-label="词性" value={word.pos} onChange={(e) => onChange({ ...word, pos: e.target.value })} placeholder="v./n." /></td>
      <td><input aria-label="音标" value={word.phonetic} onChange={(e) => onChange({ ...word, phonetic: e.target.value })} placeholder="/.../" /></td>
      <td><input aria-label="中文释义" value={word.zh} onChange={(e) => onChange({ ...word, zh: e.target.value })} placeholder="中文释义" /></td>
      <td><input aria-label="例句" value={word.example} onChange={(e) => onChange({ ...word, example: e.target.value })} placeholder="例句" /></td>
      <td><input aria-label="记忆提示" value={word.tip} onChange={(e) => onChange({ ...word, tip: e.target.value })} placeholder="记忆提示" /></td>
      <td><button type="button" className="avcp-btn avcp-btn--danger" onClick={onDelete}>删除</button></td>
    </tr>
  );
}

function CategoryEditor({ category, onChange, onDelete }) {
  function updateWord(index, nextWord) {
    const words = category.words.slice();
    words[index] = nextWord;
    onChange({ ...category, words });
  }
  function deleteWord(index) {
    onChange({ ...category, words: category.words.filter((_, i) => i !== index) });
  }
  function addWord() {
    onChange({ ...category, words: [...category.words, emptyWord()] });
  }

  return (
    <div className="avcp-category">
      <div className="avcp-category__head">
        <input aria-label="分类图标" className="avcp-category__icon" value={category.icon || ""} onChange={(e) => onChange({ ...category, icon: e.target.value })} />
        <input aria-label="分类名称" className="avcp-category__label" value={category.label} onChange={(e) => onChange({ ...category, label: e.target.value })} />
        <input aria-label="分类描述" className="avcp-category__desc" value={category.desc || ""} onChange={(e) => onChange({ ...category, desc: e.target.value })} placeholder="分类描述" />
        <span className="avcp-category__count">{category.words.length} 词</span>
        <button type="button" className="avcp-btn avcp-btn--danger" onClick={onDelete}>删除分类</button>
      </div>
      <table className="avcp-table">
        <thead>
          <tr>
            <th>单词</th><th>词性</th><th>音标</th><th>释义</th><th>例句</th><th>提示</th><th></th>
          </tr>
        </thead>
        <tbody>
          {category.words.map((word, index) => (
            <WordRowEditor
              key={index}
              word={word}
              onChange={(next) => updateWord(index, next)}
              onDelete={() => deleteWord(index)}
            />
          ))}
        </tbody>
      </table>
      <button type="button" className="avcp-btn" onClick={addWord}>+ 添加单词</button>
    </div>
  );
}

function CategoryListEditor({ categories, onChange }) {
  function updateCategory(index, next) {
    const list = categories.slice();
    list[index] = next;
    onChange(list);
  }
  function deleteCategory(index) {
    const category = categories[index];
    if (!window.confirm(`确定删除分类「${category.label}」吗？其中的 ${category.words.length} 个单词将一并删除，且无法撤销。`)) return;
    onChange(categories.filter((_, i) => i !== index));
  }
  function addCategory() {
    onChange([...categories, emptyCategory()]);
  }

  return (
    <div>
      {categories.map((category, index) => (
        <CategoryEditor
          key={category.id}
          category={category}
          onChange={(next) => updateCategory(index, next)}
          onDelete={() => deleteCategory(index)}
        />
      ))}
      <button type="button" className="avcp-btn avcp-btn--primary" onClick={addCategory}>+ 新建分类</button>
    </div>
  );
}

function SynonymEditor({ entry, onChange, onDelete }) {
  return (
    <tr>
      <td><input aria-label="基础词" value={entry.base} onChange={(e) => onChange({ ...entry, base: e.target.value })} placeholder="基础词" /></td>
      <td><input aria-label="中文释义" value={entry.zh} onChange={(e) => onChange({ ...entry, zh: e.target.value })} placeholder="中文" /></td>
      <td>
        <input
          aria-label="替换词"
          value={entry.syns.join(", ")}
          onChange={(e) => onChange({ ...entry, syns: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          placeholder="替换词，逗号分隔"
        />
      </td>
      <td><button type="button" className="avcp-btn avcp-btn--danger" onClick={onDelete}>删除</button></td>
    </tr>
  );
}

function SynonymListEditor({ title, entries, onChange }) {
  function updateEntry(index, next) {
    const list = entries.slice();
    list[index] = next;
    onChange(list);
  }
  function deleteEntry(index) {
    const entry = entries[index];
    if (!window.confirm(`确定删除「${entry.base || "(空)"}」这一组同义替换吗？`)) return;
    onChange(entries.filter((_, i) => i !== index));
  }
  function addEntry() {
    onChange([...entries, emptySynonym()]);
  }

  return (
    <div className="avcp-synonym-block">
      <h3>{title}</h3>
      <table className="avcp-table">
        <thead><tr><th>基础词</th><th>中文</th><th>替换词</th><th></th></tr></thead>
        <tbody>
          {entries.map((entry, index) => (
            <SynonymEditor key={index} entry={entry} onChange={(next) => updateEntry(index, next)} onDelete={() => deleteEntry(index)} />
          ))}
        </tbody>
      </table>
      <button type="button" className="avcp-btn" onClick={addEntry}>+ 添加</button>
    </div>
  );
}

// A leaf node's quiz array is small and self-contained, so it stays a scoped
// JSON editor rather than a full question-builder form. Validity is reported
// up per-node-id so the top-level Save button can be disabled while any quiz
// JSON on the page is malformed; the effect cleanup clears that flag if the
// node itself gets deleted, so a stale error can't permanently block saving.
function QuizJsonEditor({ nodeId, quiz, onChange, onValidityChange }) {
  const [text, setText] = useState(() => JSON.stringify(quiz || [], null, 2));
  const [error, setError] = useState("");

  useEffect(() => {
    return () => onValidityChange?.(nodeId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  function handleChange(value) {
    setText(value);
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) throw new Error("must be array");
      setError("");
      onValidityChange?.(nodeId, true);
      onChange(parsed);
    } catch {
      setError("JSON 格式错误，此处的测验题暂未同步到待保存内容，请修正后再保存。");
      onValidityChange?.(nodeId, false);
    }
  }

  return (
    <div className="avcp-quiz-json">
      <p className="avcp-hint avcp-hint--small">随堂测验（JSON 数组，每题含 question/options/answer/explanation）</p>
      {error && <p className="avcp-error avcp-error--small">{error}</p>}
      <textarea
        aria-label="随堂测验 JSON"
        className="avcp-json-editor avcp-json-editor--small"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={8}
        spellCheck={false}
      />
    </div>
  );
}

function CourseNodeEditor({ node, onChange, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown, onQuizValidityChange }) {
  const isBranch = Array.isArray(node.children);

  function handleDelete() {
    const label = isBranch ? `分支「${node.title}」（含 ${node.children.length} 个子节点）` : `知识点「${node.title}」`;
    if (!window.confirm(`确定删除${label}吗？此操作无法撤销。`)) return;
    onDelete();
  }

  return (
    <div className={`avcp-node${isBranch ? " avcp-node--branch" : " avcp-node--leaf"}`}>
      <div className="avcp-node__head">
        <input aria-label="课程节点标题" className="avcp-node__title" value={node.title} onChange={(e) => onChange({ ...node, title: e.target.value })} />
        <button type="button" className="avcp-btn avcp-btn--icon" onClick={onMoveUp} disabled={!canMoveUp} title="上移">↑</button>
        <button type="button" className="avcp-btn avcp-btn--icon" onClick={onMoveDown} disabled={!canMoveDown} title="下移">↓</button>
        <button type="button" className="avcp-btn avcp-btn--danger" onClick={handleDelete}>删除</button>
      </div>
      {isBranch ? (
        <div className="avcp-node__children">
          <CourseNodeListEditor
            nodes={node.children}
            onChange={(children) => onChange({ ...node, children })}
            onQuizValidityChange={onQuizValidityChange}
          />
        </div>
      ) : (
        <div className="avcp-node__body">
          <label className="avcp-hint avcp-hint--small">知识点讲解内容（支持 **加粗** 和 • 项目符号，每行一段）</label>
          <textarea
            aria-label="知识点讲解内容"
            className="avcp-content-editor"
            value={node.content || ""}
            onChange={(e) => onChange({ ...node, content: e.target.value })}
            rows={6}
          />
          <QuizJsonEditor
            nodeId={node.id}
            quiz={node.quiz}
            onChange={(quiz) => onChange({ ...node, quiz })}
            onValidityChange={onQuizValidityChange}
          />
        </div>
      )}
    </div>
  );
}

function CourseNodeListEditor({ nodes, onChange, onQuizValidityChange }) {
  function updateNode(index, next) {
    const list = nodes.slice();
    list[index] = next;
    onChange(list);
  }
  function deleteNode(index) {
    onChange(nodes.filter((_, i) => i !== index));
  }
  function moveNode(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= nodes.length) return;
    const list = nodes.slice();
    [list[index], list[newIndex]] = [list[newIndex], list[index]];
    onChange(list);
  }

  return (
    <div className="avcp-node-list">
      {nodes.map((node, index) => (
        <CourseNodeEditor
          key={node.id}
          node={node}
          onChange={(next) => updateNode(index, next)}
          onDelete={() => deleteNode(index)}
          onMoveUp={() => moveNode(index, -1)}
          onMoveDown={() => moveNode(index, 1)}
          canMoveUp={index > 0}
          canMoveDown={index < nodes.length - 1}
          onQuizValidityChange={onQuizValidityChange}
        />
      ))}
      <div className="avcp-node-list__actions">
        <button type="button" className="avcp-btn" onClick={() => onChange([...nodes, emptyBranchNode()])}>+ 添加分支节点</button>
        <button type="button" className="avcp-btn" onClick={() => onChange([...nodes, emptyLeafNode()])}>+ 添加知识点</button>
      </div>
    </div>
  );
}

function CourseTreeEditor({ courseTree, onChange, onQuizValidityChange }) {
  return (
    <div>
      <p className="avcp-hint">分支节点用于分组（可以继续嵌套子分支或知识点）；知识点是叶子节点，包含讲解内容和随堂测验。</p>
      <CourseNodeListEditor nodes={courseTree} onChange={onChange} onQuizValidityChange={onQuizValidityChange} />
    </div>
  );
}

export default function AdminVocabContentPanel() {
  const [content, setContent] = useState(null);
  const [activeTab, setActiveTab] = useState("reading");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);
  const [invalidQuizNodes, setInvalidQuizNodes] = useState(() => new Set());

  useEffect(() => {
    vocabularyAPI.content()
      .then((data) => setContent(data))
      .catch((error) => setLoadError(error?.message || "加载词汇内容失败"))
      .finally(() => setLoading(false));
  }, []);

  // Stable identity so QuizJsonEditor's unmount-cleanup effect only fires on
  // actual mount/unmount, not on every unrelated re-render of this page.
  const handleQuizValidityChange = useCallback((nodeId, isValid) => {
    setInvalidQuizNodes((prev) => {
      const next = new Set(prev);
      if (isValid) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  }, []);

  function updateField(key, value) {
    setContent((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    if (invalidQuizNodes.size > 0) {
      setSaveError("存在未修正的测验 JSON 格式错误，请先修正后再保存。");
      return;
    }
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const data = await vocabularyAPI.saveContent(content);
      setContent(data);
      setSaved(true);
    } catch (error) {
      setSaveError(error?.message || "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="avcp-page">加载中…</div>;
  if (loadError) return <div className="avcp-page avcp-error">{loadError}</div>;
  if (!content) return null;

  const hasInvalidQuiz = invalidQuizNodes.size > 0;

  return (
    <div className="avcp-page">
      <div className="avcp-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`avcp-tab${activeTab === tab.id ? " avcp-tab--active" : ""}`}
            aria-label={`切换到${tab.label}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="avcp-body">
        {activeTab === "reading" && (
          <CategoryListEditor categories={content.readingCategories} onChange={(next) => updateField("readingCategories", next)} />
        )}
        {activeTab === "writing" && (
          <CategoryListEditor categories={content.writingCategories} onChange={(next) => updateField("writingCategories", next)} />
        )}
        {activeTab === "synonyms" && (
          <>
            <SynonymListEditor title="阅读词汇同义替换" entries={content.readingSynonyms} onChange={(next) => updateField("readingSynonyms", next)} />
            <SynonymListEditor title="写作词汇同义替换" entries={content.writingSynonyms} onChange={(next) => updateField("writingSynonyms", next)} />
          </>
        )}
        {activeTab === "course" && (
          <CourseTreeEditor
            courseTree={content.courseTree}
            onChange={(next) => updateField("courseTree", next)}
            onQuizValidityChange={handleQuizValidityChange}
          />
        )}
      </div>

      <div className="avcp-footer">
        {hasInvalidQuiz && <span className="avcp-error">存在未修正的测验 JSON 格式错误</span>}
        {saveError && <span className="avcp-error">{saveError}</span>}
        {saved && <span className="avcp-saved">已保存</span>}
        <button
          type="button"
          className="avcp-btn avcp-btn--primary avcp-btn--save"
          aria-label={saving ? "保存中…" : "保存全部修改"}
          onClick={handleSave}
          disabled={saving || hasInvalidQuiz}
        >
          {saving ? "保存中…" : "保存全部修改"}
        </button>
      </div>
    </div>
  );
}
