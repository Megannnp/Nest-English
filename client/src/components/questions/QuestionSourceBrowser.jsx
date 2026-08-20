import { useEffect, useMemo, useState } from "react";

import AppIcon from "../shared/AppIcon.jsx";

const TYPE_LABELS = {
  continuation: '读后续写', argumentative: '议论文', summary: '概要写作',
  narrative: '记叙文', expository: '说明文', speech: '演讲稿',
  letter: '书信', notice: '通知', diary: '日记',
  chart_writing: '图表作文', report: '报告', proposal: '书信',
  review: '观后感/读后感', picture_writing: '看图写话', post: '网络帖子', general: '综合写作'
};

const META_LABEL_STYLE = {
  fontSize: 11,
  color: "#8a7d6e",
  letterSpacing: "0.02em"
};

const META_VALUE_STYLE = {
  marginTop: 4,
  fontSize: 13,
  fontWeight: 700,
  color: "#2a1f14",
  lineHeight: 1.4
};

const PAPER_GROUPS = ["全国卷", "新高考卷", "北京卷", "上海卷", "浙江卷", "天津卷"];
const PAPER_DETAIL_OPTIONS = {
  全国卷: ["甲卷", "乙卷", "I卷", "II卷", "III卷"],
  新高考卷: ["I卷", "II卷", "I&II卷"],
};
const SOURCE_OPTIONS = ["system", "user"];
const SOURCE_LABELS = {
  system: "系统题",
  user: "我的题目",
};

function getNormalizedType(question) {
  return question?.type === "proposal" ? "letter" : question?.type;
}

function getPaperGroup(question) {
  const region = String(question?.sourceRegion || "").trim();
  if (region === "全国") return "全国卷";
  if (region === "新高考") return "新高考卷";
  if (region === "北京") return "北京卷";
  if (region === "上海") return "上海卷";
  if (region === "浙江") return "浙江卷";
  if (region === "天津") return "天津卷";
  return "";
}

function getPaperDetail(question) {
  const group = getPaperGroup(question);
  const paper = String(question?.sourcePaper || "").trim();
  if (!paper) return "";
  if (group === "全国卷") {
    if (["甲卷", "乙卷", "I卷", "II卷", "III卷"].includes(paper)) return paper;
  }
  if (group === "新高考卷") {
    if (["I卷", "II卷", "I&II卷"].includes(paper)) return paper;
  }
  return "";
}

function getPaperDisplayLabel(question) {
  const group = getPaperGroup(question);
  const detail = getPaperDetail(question);
  if (!group) return String(question?.sourcePaper || "").trim();
  if (detail) return `${group} · ${detail}`;
  return group;
}

function normalizePreviewText(promptText = "") {
  return String(promptText)
    .replace(/[_＿-]{30,}/g, "________________________")
    .replace(/[—]{20,}/g, "——————————————");
}

function getSourceType(question) {
  return String(question?.sourceType || (question?.isSystem ? "system" : "user"));
}

function getTheme(question) {
  return question?.theme || (question?.themes || [])[0] || "";
}

function buildUsedYears(questions) {
  return [...new Set(questions.map((q) => String(q.sourceYear || "")).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));
}

function buildUsedPaperDetails(questions, paperGroupFilter) {
  if (!paperGroupFilter || !["全国卷", "新高考卷"].includes(paperGroupFilter)) return [];
  const seen = new Set(
    questions
      .filter((q) => getPaperGroup(q) === paperGroupFilter)
      .map((q) => getPaperDetail(q))
      .filter(Boolean)
  );
  return (PAPER_DETAIL_OPTIONS[paperGroupFilter] || []).filter((item) => seen.has(item));
}

function buildFilterOptions(questions, paperGroupFilter) {
  return {
    sources: SOURCE_OPTIONS.filter((source) => questions.some((q) => getSourceType(q) === source)),
    years: buildUsedYears(questions),
    paperGroups: PAPER_GROUPS,
    paperDetails: buildUsedPaperDetails(questions, paperGroupFilter),
    types: [...new Set(questions.map((q) => getNormalizedType(q)).filter(Boolean))],
    themes: [...new Set(questions.map(getTheme).filter(Boolean))],
  };
}

function matchesKeyword(question, keyword) {
  if (!keyword) return true;
  return String(question.title || "").toLowerCase().includes(keyword)
    || String(question.promptText || "").toLowerCase().includes(keyword);
}

function matchesFilters(question, filters) {
  return matchesKeyword(question, filters.keyword)
    && (!filters.source || getSourceType(question) === filters.source)
    && (!filters.year || String(question.sourceYear || "") === filters.year)
    && (!filters.paperGroup || getPaperGroup(question) === filters.paperGroup)
    && (!filters.paperDetail || getPaperDetail(question) === filters.paperDetail)
    && (!filters.type || getNormalizedType(question) === filters.type)
    && (!filters.theme || getTheme(question) === filters.theme);
}

function filterQuestions(questions, filters) {
  return questions.filter((question) => matchesFilters(question, filters));
}

function hasActiveFilters(filters) {
  return Boolean(filters.search || filters.source || filters.year || filters.paperGroup || filters.paperDetail || filters.type || filters.theme);
}

function metaCard(label, value) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: 14, background: "#fff", border: "1px solid #eee3d8" }}>
      <div style={META_LABEL_STYLE}>{label}</div>
      <div style={META_VALUE_STYLE}>{value}</div>
    </div>
  );
}

function hasText(value) {
  return Boolean(String(value || "").trim());
}

function browserFrameStyle(embedded) {
  return {
    border: embedded ? "none" : "1px solid #ece6de",
    borderRadius: embedded ? 0 : 18,
    background: embedded ? "transparent" : "#fff",
    overflow: "hidden",
    boxShadow: embedded ? "none" : "0 8px 26px rgba(60,40,10,0.06)",
  };
}

function buildQuestionCardModel(question, selectedQuestionId) {
  const promptText = String(question.promptText || "");
  const sourceType = getSourceType(question);
  const type = getNormalizedType(question);

  return {
    active: String(question.id) === String(selectedQuestionId),
    sourceType,
    promptPreview: promptText.length > 120 ? `${promptText.slice(0, 120)}...` : promptText,
    title: question.title || "未命名题目",
    sourceLabel: SOURCE_LABELS[sourceType] || sourceType,
    yearLabel: question.sourceYear || "未标注",
    paperLabel: getPaperDisplayLabel(question) || "未标注",
    typeLabel: TYPE_LABELS[type] || type || "未分类",
    themeLabel: getTheme(question) || "未标注",
    scoreLabel: question.defaultScore ? `${question.defaultScore} 分` : "未设置",
  };
}

function FilterButtonGroup({ label, options = [], value = "", onChange, isMobile = false, formatLabel = (item) => item }) {
  if (!options.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, color: "#8a7d6e", fontWeight: 700 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          onClick={() => onChange("")}
          style={{
            padding: isMobile ? "7px 12px" : "8px 14px",
            borderRadius: 999,
            border: value === "" ? "1px solid #d6a44f" : "1px solid #e7dbcf",
            background: value === "" ? "#fff7ed" : "#fff",
            color: value === "" ? "#8b5e1a" : "#6f5640",
            fontSize: 12,
            fontWeight: value === "" ? 700 : 500,
            cursor: "pointer",
          }}
        >
          全部
        </button>
        {options.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            style={{
              padding: isMobile ? "7px 12px" : "8px 14px",
              borderRadius: 999,
              border: value === item ? "1px solid #d6a44f" : "1px solid #e7dbcf",
              background: value === item ? "#fff7ed" : "#fff",
              color: value === item ? "#8b5e1a" : "#6f5640",
              fontSize: 12,
              fontWeight: value === item ? 700 : 500,
              cursor: "pointer",
            }}
          >
            {formatLabel(item)}
          </button>
        ))}
      </div>
    </div>
  );
}

function BrowserHeader({ hasHeader, isMobile, subtitle, title }) {
  if (!hasHeader) return null;

  return (
    <div style={{ padding: isMobile ? "14px 16px" : "15px 20px", borderBottom: "1px solid #ece6de" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <AppIcon name="index-card" size={15} />
        <span style={{ fontSize: isMobile ? 12 : 14, color: "#2a1f14", fontWeight: 600 }}>{title}</span>
      </div>
      {subtitle ? (
        <div style={{ marginTop: 6, fontSize: 12, color: "#8a7d6e", lineHeight: 1.7 }}>{subtitle}</div>
      ) : null}
    </div>
  );
}

function FilterControls({
  filters,
  isMobile,
  onPaperGroupChange,
  options,
  setters,
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
      <input
        aria-label="搜索题目"
        value={filters.search}
        onChange={(e) => setters.setSearch(e.target.value)}
        placeholder="搜索题目或题干关键字..."
        style={{ width: "100%", border: "1px solid #e7dbcf", borderRadius: 14, background: "#faf8f5", color: "#2a1f14", fontSize: 14, padding: "12px 14px", outline: "none", boxSizing: "border-box" }}
      />
      <FilterButtonGroup label="来源" options={options.sources} value={filters.source} onChange={setters.setSourceFilter} isMobile={isMobile} formatLabel={(source) => SOURCE_LABELS[source] || source} />
      <FilterButtonGroup label="年限" options={options.years} value={filters.year} onChange={setters.setYearFilter} isMobile={isMobile} />
      <FilterButtonGroup label="卷型" options={options.paperGroups} value={filters.paperGroup} onChange={onPaperGroupChange} isMobile={isMobile} />
      {["全国卷", "新高考卷"].includes(filters.paperGroup) ? (
        <FilterButtonGroup label={`${filters.paperGroup}选项`} options={options.paperDetails} value={filters.paperDetail} onChange={setters.setPaperDetailFilter} isMobile={isMobile} />
      ) : null}
      <FilterButtonGroup label="题型" options={options.types} value={filters.type} onChange={setters.setTypeFilter} isMobile={isMobile} formatLabel={(type) => TYPE_LABELS[type] || type} />
      <FilterButtonGroup label="主题" options={options.themes} value={filters.theme} onChange={setters.setThemeFilter} isMobile={isMobile} />
    </div>
  );
}

function FilterSummary({ active, filteredCount, onClear, totalCount }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div style={{ fontSize: 12, color: "#a09080" }}>
        当前可选 {filteredCount} / {totalCount} 题
      </div>
      {active ? (
        <button
          type="button"
          onClick={onClear}
          style={{ border: "none", background: "transparent", color: "#c8852a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          清除筛选
        </button>
      ) : null}
    </div>
  );
}

function SourceBadge({ sourceType }) {
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        background: sourceType === "system" ? "#fdf0d8" : "#eef6ff",
        color: sourceType === "system" ? "#8b5e1a" : "#2c5f8a",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {SOURCE_LABELS[sourceType] || sourceType}
    </span>
  );
}

function QuestionCard({ isMobile, onSelect, question, selectedQuestionId }) {
  const model = buildQuestionCardModel(question, selectedQuestionId);

  return (
    <button
      type="button"
      key={question.id}
      onClick={() => onSelect(question)}
      style={{
        width: "100%",
        border: model.active ? "1.5px solid #d6a44f" : "1px solid #ece6de",
        borderRadius: 16,
        background: model.active ? "#fffaf1" : "#faf8f5",
        padding: isMobile ? "12px 14px" : "13px 15px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <SourceBadge sourceType={model.sourceType} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#2a1f14", lineHeight: 1.55 }}>
            {model.title}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#8a7d6e", lineHeight: 1.7 }}>
            {model.promptPreview}
          </div>
        </div>
        {model.active ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <span style={{ padding: "4px 10px", borderRadius: 999, background: "#fdf0d8", color: "#8b5e1a", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
              已选中
            </span>
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(5, minmax(0, 1fr))",
          gap: 10,
          marginTop: 2
        }}
      >
        {metaCard("来源", model.sourceLabel)}
        {metaCard("年限", model.yearLabel)}
        {metaCard("卷型", model.paperLabel)}
        {metaCard("题型", model.typeLabel)}
        {metaCard("主题", model.themeLabel)}
        {metaCard("分值", model.scoreLabel)}
      </div>
    </button>
  );
}

function QuestionList({ emptyText, filtered, isMobile, onSelect, selectedQuestionId }) {
  if (!filtered.length) {
    return (
      <div style={{ padding: "14px 16px", borderRadius: 14, background: "#faf8f5", border: "1px dashed #d8cfc4", color: "#8a7d6e", fontSize: 13, lineHeight: 1.8 }}>
        {emptyText}
      </div>
    );
  }

  return filtered.map((question) => (
    <QuestionCard
      key={question.id}
      question={question}
      selectedQuestionId={selectedQuestionId}
      onSelect={onSelect}
      isMobile={isMobile}
    />
  ));
}

function PreviewTag({ children, tone = "neutral" }) {
  const styles = {
    neutral: { background: "#faf6ef", color: "#7c6a58", border: "1px solid #ece3d8" },
    type: { background: "#fff7e8", color: "#8b5e1a", border: "1px solid #f0cc80" },
    theme: { background: "#eef4ff", color: "#4060c0", border: "1px solid #c8d4f8" },
    score: { background: "#f5f2ff", color: "#6c4bc1", border: "1px solid #d8cdf7" },
  };
  return <span style={{ padding: "3px 9px", borderRadius: 20, fontSize: 11, ...styles[tone] }}>{children}</span>;
}

function PreviewPanel({ isMobile, onClose, previewQuestion }) {
  if (!previewQuestion) return null;

  const type = getNormalizedType(previewQuestion);
  const theme = getTheme(previewQuestion);

  return (
    <div style={{ borderTop: "1px solid #efe6db", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#2a1f14" }}>题干全文预览</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#8a7d6e" }}>{previewQuestion.title}</div>
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
            <PreviewTag>{previewQuestion.sourceYear ? `${previewQuestion.sourceYear}` : "未标注年限"}</PreviewTag>
            <PreviewTag>{getPaperDisplayLabel(previewQuestion) || "未标注卷型"}</PreviewTag>
            <PreviewTag tone="type">{TYPE_LABELS[type] || type || "未分类"}</PreviewTag>
            {theme ? <PreviewTag tone="theme">{theme}</PreviewTag> : null}
            {previewQuestion.defaultScore ? <PreviewTag tone="score">分值 {previewQuestion.defaultScore} 分</PreviewTag> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ border: "none", background: "transparent", color: "#c8852a", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          取消
        </button>
      </div>
      <div
        style={{
          whiteSpace: "pre-wrap",
          fontSize: 13,
          lineHeight: 1.85,
          color: "#3d2e20",
          background: "#fcfbf8",
          border: "1px solid #ece3d8",
          borderRadius: 16,
          padding: isMobile ? "14px 14px" : "16px 18px",
          overflowWrap: "anywhere",
          wordBreak: "break-word"
        }}
      >
        {normalizePreviewText(previewQuestion.promptText) || "暂无题干内容。"}
      </div>
    </div>
  );
}

export default function QuestionSourceBrowser({
  questions = [],
  selectedQuestionId = "",
  onSelectQuestion,
  title = "Select Topic · 题目选择",
  subtitle = "",
  emptyText = "当前没有可用题目。",
  isMobile = false,
  embedded = false,
}) {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [paperGroupFilter, setPaperGroupFilter] = useState("");
  const [paperDetailFilter, setPaperDetailFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [themeFilter, setThemeFilter] = useState("");
  const [previewQuestionId, setPreviewQuestionId] = useState("");

  useEffect(() => {
    if (selectedQuestionId) {
      setPreviewQuestionId(String(selectedQuestionId));
    }
  }, [selectedQuestionId]);

  const filterOptions = useMemo(
    () => buildFilterOptions(questions, paperGroupFilter),
    [questions, paperGroupFilter]
  );

  const filtered = useMemo(() => {
    return filterQuestions(questions, {
      keyword: search.trim().toLowerCase(),
      source: sourceFilter,
      year: yearFilter,
      paperGroup: paperGroupFilter,
      paperDetail: paperDetailFilter,
      type: typeFilter,
      theme: themeFilter,
    });
  }, [questions, search, sourceFilter, yearFilter, paperGroupFilter, paperDetailFilter, typeFilter, themeFilter]);

  const previewQuestion = useMemo(
    () => questions.find((item) => String(item.id) === String(previewQuestionId)) || null,
    [questions, previewQuestionId]
  );
  const hasHeader = hasText(title) || hasText(subtitle);
  const filters = {
    search,
    source: sourceFilter,
    year: yearFilter,
    paperGroup: paperGroupFilter,
    paperDetail: paperDetailFilter,
    type: typeFilter,
    theme: themeFilter,
  };
  const setters = {
    setSearch,
    setSourceFilter,
    setYearFilter,
    setPaperDetailFilter,
    setTypeFilter,
    setThemeFilter,
  };
  const clearFilters = () => {
    setSearch("");
    setSourceFilter("");
    setYearFilter("");
    setPaperGroupFilter("");
    setPaperDetailFilter("");
    setTypeFilter("");
    setThemeFilter("");
  };
  const handlePaperGroupChange = (value) => {
    setPaperGroupFilter(value);
    setPaperDetailFilter("");
  };
  const handleSelectQuestion = (question) => {
    onSelectQuestion?.(String(question.id));
    setPreviewQuestionId(String(question.id));
  };

  return (
    <div style={browserFrameStyle(embedded)}>
      <BrowserHeader hasHeader={hasHeader} isMobile={isMobile} subtitle={subtitle} title={title} />

      <div style={{ padding: isMobile ? 14 : 18, display: "flex", flexDirection: "column", gap: 12 }}>
        <FilterControls
          filters={filters}
          isMobile={isMobile}
          onPaperGroupChange={handlePaperGroupChange}
          options={filterOptions}
          setters={setters}
        />

        <FilterSummary
          active={hasActiveFilters(filters)}
          filteredCount={filtered.length}
          onClear={clearFilters}
          totalCount={questions.length}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: isMobile ? 300 : 340, overflow: "auto" }}>
          <QuestionList
            emptyText={emptyText}
            filtered={filtered}
            isMobile={isMobile}
            onSelect={handleSelectQuestion}
            selectedQuestionId={selectedQuestionId}
          />
        </div>

        <PreviewPanel isMobile={isMobile} onClose={() => setPreviewQuestionId("")} previewQuestion={previewQuestion} />
      </div>
    </div>
  );
}
