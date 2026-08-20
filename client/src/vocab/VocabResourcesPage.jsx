import { useMemo, useState } from "react";

import useVocabContent from "./useVocabContent.js";
import VocabTopBar from "./VocabTopBar.jsx";
import { getPrepExamSystemId } from "../app/prepExamConfig.js";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./vocab.css";

const IMPORTED_WORDS_STORAGE_KEY = "nest:vocab:importedWords:v1";
const IMPORTED_WORDS_LIMIT = 1000;

function readImportedWords() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(IMPORTED_WORDS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.word) : [];
  } catch {
    return [];
  }
}

function storeImportedWords(words) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(IMPORTED_WORDS_STORAGE_KEY, JSON.stringify(words.slice(0, IMPORTED_WORDS_LIMIT)));
  } catch {
    // Local import should never block the resource page.
  }
}

function normalizeWord(item) {
  return {
    word: String(item.word || "").trim(),
    pos: String(item.pos || "").trim(),
    phonetic: String(item.phonetic || "").trim(),
    zh: String(item.zh || "").trim(),
    example: String(item.example || "").trim(),
    tip: String(item.tip || "").trim(),
  };
}

function flattenCategories(categories, source, sourceLabel) {
  return categories.flatMap((cat) => (cat.words || []).map((word) => ({
    ...normalizeWord(word),
    key: `${source}:${cat.id}:${word.word}`,
    source,
    sourceLabel,
    categoryId: cat.id,
    categoryLabel: cat.label,
  })));
}

function flattenSynonyms(items, source, sourceLabel) {
  return items.map((item) => ({
    word: item.base,
    pos: "syn.",
    phonetic: "",
    zh: item.zh,
    example: (item.syns || []).join(" / "),
    tip: "同义替换资源",
    synonyms: item.syns || [],
    key: `${source}:${item.base}`,
    source,
    sourceLabel,
    categoryId: source,
    categoryLabel: "同义替换",
  }));
}

function importedEntries(words) {
  return words.map((word, index) => ({
    ...normalizeWord(word),
    key: `imported:${word.word}:${index}`,
    source: "imported",
    sourceLabel: "我的导入",
    categoryId: "custom",
    categoryLabel: "自定义词库",
  }));
}

function formatEntryForEdit(entry) {
  return [entry.word, entry.zh, entry.pos, entry.example].filter(Boolean).join("\t");
}

function parseEditorText(text) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\t|,|，/).map((part) => part.trim()).filter(Boolean);
      return normalizeWord({
        word: parts[0],
        zh: parts[1] || "自定义词汇",
        pos: parts[2] || "custom",
        example: parts.slice(3).join("，"),
      });
    })
    .filter((word) => word.word);
}

function mergeWords(baseWords, nextWords) {
  const map = new Map();
  [...baseWords, ...nextWords].forEach((item) => {
    const word = normalizeWord(item);
    if (!word.word) return;
    map.set(word.word.toLowerCase(), word);
  });
  return [...map.values()].slice(0, IMPORTED_WORDS_LIMIT);
}

const SOURCE_FILTERS = [
  { id: "all", label: "全部" },
  { id: "reading", label: "阅读" },
  { id: "writing", label: "写作" },
  { id: "synonym", label: "同义替换" },
  { id: "imported", label: "我的导入" },
];

export default function VocabResourcesPage({
  onNavigate,
  user,
  onLoginClick,
  onRegisterClick,
  activePage = "vocab-resources",
  onAccountClick,
  prepExamId = "",
  hideTopBar = false,
}) {
  const pageRef = useScrollReveal();
  const systemId = getPrepExamSystemId(prepExamId);
  const {
    readingCategories,
    writingCategories,
    readingSynonyms,
    writingSynonyms,
  } = useVocabContent({ systemId });
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [importedWords, setImportedWords] = useState(() => readImportedWords());
  const [editorText, setEditorText] = useState("");
  const [status, setStatus] = useState("");

  const entries = useMemo(() => [
    ...flattenCategories(readingCategories, "reading", "阅读词库"),
    ...flattenCategories(writingCategories, "writing", "写作词库"),
    ...flattenSynonyms(readingSynonyms, "synonym-reading", "阅读同义替换"),
    ...flattenSynonyms(writingSynonyms, "synonym-writing", "写作同义替换"),
    ...importedEntries(importedWords),
  ], [readingCategories, writingCategories, readingSynonyms, writingSynonyms, importedWords]);

  const filteredEntries = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const sourceMatch = sourceFilter === "all"
        || entry.source === sourceFilter
        || (sourceFilter === "synonym" && entry.source.startsWith("synonym"));
      if (!sourceMatch) return false;
      if (!keyword) return true;
      return [
        entry.word,
        entry.zh,
        entry.pos,
        entry.example,
        entry.sourceLabel,
        entry.categoryLabel,
        ...(entry.synonyms || []),
      ].some((value) => String(value || "").toLowerCase().includes(keyword));
    });
  }, [entries, query, sourceFilter]);

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedKeys.has(entry.key)),
    [entries, selectedKeys],
  );

  const counts = useMemo(() => SOURCE_FILTERS.reduce((acc, item) => {
    acc[item.id] = item.id === "all"
      ? entries.length
      : entries.filter((entry) => item.id === "synonym" ? entry.source.startsWith("synonym") : entry.source === item.id).length;
    return acc;
  }, {}), [entries]);

  function toggleEntry(key) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectVisible() {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      filteredEntries.forEach((entry) => next.add(entry.key));
      return next;
    });
  }

  function addSelectedToEditor() {
    if (!selectedEntries.length) {
      setStatus("先在左侧选择要导入的词。");
      return;
    }
    setEditorText(selectedEntries.map(formatEntryForEdit).join("\n"));
    setStatus(`已把 ${selectedEntries.length} 个词放入编辑区。`);
  }

  function importEditorWords() {
    const parsed = parseEditorText(editorText);
    if (!parsed.length) {
      setStatus("编辑区没有可导入的词。");
      return;
    }
    const next = mergeWords(importedWords, parsed);
    setImportedWords(next);
    storeImportedWords(next);
    setSelectedKeys(new Set());
    const capped = next.length >= IMPORTED_WORDS_LIMIT && importedWords.length + parsed.length > IMPORTED_WORDS_LIMIT;
    setStatus(`已导入 ${parsed.length} 个词；当前自定义词库 ${next.length} 个词${capped ? "（已达到 1000 上限）" : ""}，可在词汇检测中选择“我的导入”。`);
  }

  return (
    <div className="vc-page" ref={pageRef}>
      {!hideTopBar && (
        <VocabTopBar
          onLogin={onLoginClick || (() => onNavigate?.("auth"))}
          onRegister={onRegisterClick || (() => onNavigate?.("auth"))}
          user={user}
          onNavigate={onNavigate}
          activePage={activePage}
          onAccountClick={onAccountClick}
        />
      )}

      <main className="vc-resource-page">
        <PageHero
          eyebrow="筑巢词汇 · 资源"
          title="编辑你的大词库。"
          description="集中管理阅读、写作、同义替换和自定义导入词；先筛选勾选，再编辑导入。"
        />

        <section className="vc-bank-panel studio-revealed">
          <div className="vc-bank-toolbar">
            <label className="vc-bank-search">
              <span>搜索词库</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入英文、中文、分类或替换词"
              />
            </label>
            <div className="vc-bank-stats">
              <strong>{filteredEntries.length}</strong> 条结果
              <span>{selectedEntries.length} 已选</span>
              <span>{importedWords.length} 已导入</span>
            </div>
          </div>

          <div className="vc-bank-filters" aria-label="词库来源筛选">
            {SOURCE_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`vc-bank-filter${sourceFilter === item.id ? " vc-bank-filter--active" : ""}`}
                onClick={() => setSourceFilter(item.id)}
              >
                {item.label}<span>{counts[item.id] || 0}</span>
              </button>
            ))}
          </div>

          <div className="vc-bank-layout">
            <div className="vc-bank-list" aria-label="词库列表">
              <div className="vc-bank-list__head">
                <button type="button" onClick={selectVisible}>选择当前结果</button>
                <button type="button" onClick={() => setSelectedKeys(new Set())}>清空选择</button>
              </div>
              <div className="vc-bank-rows">
                {filteredEntries.map((entry) => (
                  <label key={entry.key} className="vc-bank-row">
                    <input
                      type="checkbox"
                      checked={selectedKeys.has(entry.key)}
                      onChange={() => toggleEntry(entry.key)}
                    />
                    <span className="vc-bank-row__main">
                      <strong>{entry.word}</strong>
                      <em>{entry.pos}</em>
                      <span>{entry.zh}</span>
                      {entry.example ? <small>{entry.example}</small> : null}
                    </span>
                    <span className="vc-bank-row__meta">
                      <b>{entry.sourceLabel}</b>
                      <i>{entry.categoryLabel}</i>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <aside className="vc-bank-editor" aria-label="词库编辑导入">
              <div className="vc-bank-editor__head">
                <h2>编辑导入</h2>
                <p>每行一个词，推荐格式：英文、中文、词性、例句。</p>
              </div>
              <textarea
                aria-label="词汇导入内容"
                value={editorText}
                onChange={(event) => setEditorText(event.target.value)}
                placeholder={"perseverance\t坚持不懈\tn.\tHer perseverance paid off.\ncoherent\t连贯的\tadj.\tThe essay is coherent."}
              />
              <div className="vc-bank-actions">
                <button type="button" className="vc-bank-secondary" onClick={addSelectedToEditor}>已选加入编辑区</button>
                <button type="button" className="gm-btn-primary" onClick={importEditorWords}>导入编辑区</button>
              </div>
              {status ? <p className="vc-bank-status">{status}</p> : null}
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}
