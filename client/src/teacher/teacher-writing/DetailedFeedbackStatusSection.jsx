import { StatusBanner, SurfaceCard, SurfaceHeader } from "../../components/shared/UI.jsx";

function toList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeReviewItem(item) {
  if (typeof item === "string") {
    const text = item.trim();
    return text ? { title: "", detail: text } : null;
  }
  if (!item || typeof item !== "object") return null;
  const title = String(item.title || item.name || "").trim();
  const detail = String(item.detail || item.comment || item.summary || item.advice || "").trim();
  if (!title && !detail) return null;
  return { ...item, title, detail };
}

function getDeepReviewItems(deepReview, field) {
  if (!deepReview) return [];
  if (field === "grammar") {
    return toList(deepReview.grammar || deepReview.language?.grammarIssues)
      .map(normalizeReviewItem)
      .filter(Boolean);
  }
  if (field === "contentLogic") {
    return toList(deepReview.contentLogic || deepReview.content?.contentLogic)
      .map(normalizeReviewItem)
      .filter(Boolean);
  }
  if (field === "structure") {
    const structureItems = Array.isArray(deepReview.structure)
      ? deepReview.structure
      : deepReview.structure?.structure;
    return toList(structureItems)
      .map(normalizeReviewItem)
      .filter(Boolean);
  }
  return [];
}

function _buildDetailedViewData(feedback, writing) {
  const status = feedback?.detailedFeedback?.status || "not_requested";
  const result = feedback?.detailedFeedback?.result || null;
  const writingType = String(writing?.selectedType || writing?.feedback?.selectedType || "").trim().toLowerCase();
  return { status, result, writingType };
}

function InsightCard({ title, summary, strengths, risks, actions, accent = "#8b5e1a" }) {
  if (!summary && !toList(strengths).length && !toList(risks).length && !toList(actions).length) {
    return null;
  }

  return (
    <div
      style={{
        border: "1px solid rgba(95,71,39,0.12)",
        borderRadius: 18,
        background: "#fffaf5",
        padding: "14px 16px",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: accent }}>{title}</div>
      {summary ? <div style={{ fontSize: 14, lineHeight: 1.75, color: "#3D2C1F" }}>{summary}</div> : null}
      {toList(strengths).length ? <div style={{ fontSize: 13, lineHeight: 1.75, color: "#6B5544" }}><strong>亮点：</strong>{toList(strengths).join("；")}</div> : null}
      {toList(risks).length ? <div style={{ fontSize: 13, lineHeight: 1.75, color: "#6B5544" }}><strong>风险：</strong>{toList(risks).join("；")}</div> : null}
      {toList(actions).length ? <div style={{ fontSize: 13, lineHeight: 1.75, color: "#6B5544" }}><strong>建议：</strong>{toList(actions).join("；")}</div> : null}
    </div>
  );
}

function DeepReviewCard({ title, items }) {
  const normalizedItems = toList(items).map(normalizeReviewItem).filter(Boolean);
  if (!normalizedItems.length) return null;

  return (
    <div
      style={{
        border: "1px solid rgba(95,71,39,0.12)",
        borderRadius: 18,
        background: "#fffaf5",
        padding: "14px 16px",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: "#8b5e1a" }}>{title}</div>
      {normalizedItems.slice(0, 5).map((item, index) => (
        <div
          key={`${item.title || title}-${index}`}
          style={{
            paddingBottom: index === Math.min(normalizedItems.length, 5) - 1 ? 0 : 10,
            borderBottom: index === Math.min(normalizedItems.length, 5) - 1 ? "none" : "1px dashed rgba(95,71,39,0.12)",
          }}
        >
          {item.title ? <div style={{ fontSize: 13, fontWeight: 700, color: "#3D2C1F", marginBottom: item.detail ? 4 : 0 }}>{item.title}</div> : null}
          {item.detail ? <div style={{ fontSize: 13, lineHeight: 1.75, color: "#6B5544" }}>{item.detail}</div> : null}
        </div>
      ))}
    </div>
  );
}

function ResourceBankCard({ title, items, renderItem }) {
  const normalizedItems = toList(items);
  if (!normalizedItems.length) return null;

  return (
    <div
      style={{
        border: "1px solid rgba(95,71,39,0.12)",
        borderRadius: 18,
        background: "#fffdf9",
        padding: "14px 16px",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: "#8b5e1a" }}>{title}</div>
      {normalizedItems.map(renderItem)}
    </div>
  );
}

function EssayCard({ essay, defaultTitle, highlightLabel = "亮点" }) {
  if (!essay?.text) return null;
  const highlights = toList(essay.highlights);
  return (
    <div style={{ border: "1px solid rgba(95,71,39,0.12)", borderRadius: 18, background: "#fffdf9", padding: "14px 16px", display: "grid", gap: 8 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#8b5e1a" }}>{essay.title || defaultTitle}</div>
      {highlights.length ? <div style={{ fontSize: 13, lineHeight: 1.75, color: "#8A6F5B" }}><strong>{highlightLabel}：</strong>{highlights.join("；")}</div> : null}
      <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.85, color: "#3D2C1F", maxHeight: 260, overflow: "auto" }}>
        {essay.text}
      </div>
    </div>
  );
}

function GeneralDetailedView({ result }) {
  if (!result) return null;

  const aiEvaluation = result.aiEvaluation || {};
  const deepReview = aiEvaluation.deepReview || {};
  const grammarItems = getDeepReviewItems(deepReview, "grammar");
  const contentLogicItems = getDeepReviewItems(deepReview, "contentLogic");
  const structureItems = getDeepReviewItems(deepReview, "structure");
  const correctedSampleEssay = aiEvaluation.correctedSampleEssay || null;
  const excellentSampleEssay = aiEvaluation.excellentSampleEssay || aiEvaluation.sampleEssay || null;
  const phraseCategories = toList(result.phraseSuggestions?.categories);
  const sentencePatterns = toList(result.sentencePatterns);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {result.overview ? (
        <div style={{ borderRadius: 16, padding: "14px 16px", background: "#fffdf9", border: "1px solid rgba(95,71,39,0.12)", fontSize: 14, lineHeight: 1.8, color: "#3D2C1F" }}>
          {result.overview}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <DeepReviewCard title="语法表达" items={grammarItems} />
        <DeepReviewCard title="内容逻辑" items={contentLogicItems} />
        <DeepReviewCard title="结构组织" items={structureItems} />
      </div>

      {result.annotatedText ? (
        <div style={{ border: "1px solid rgba(95,71,39,0.12)", borderRadius: 18, background: "#fffaf5", padding: "14px 16px", fontSize: 13, lineHeight: 1.85, color: "#3D2C1F", whiteSpace: "pre-wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#8b5e1a", marginBottom: 8 }}>重点句段点评</div>
          {result.annotatedText}
        </div>
      ) : null}

      <EssayCard essay={correctedSampleEssay} defaultTitle="批改后范文" highlightLabel="修改亮点" />
      <EssayCard essay={excellentSampleEssay} defaultTitle="优秀范文" />

      <ResourceBankCard
        title="表达替换建议"
        items={phraseCategories}
        renderItem={(category, index) => (
          <div key={`${category.category || "phrases"}-${index}`} style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3D2C1F" }}>{category.icon || "💡"} {category.category || "表达建议"}</div>
            {toList(category.items).slice(0, 5).map((item, itemIndex) => (
              <div key={`${item.en || item.zh || "phrase"}-${itemIndex}`} style={{ fontSize: 13, lineHeight: 1.75, color: "#6B5544", background: "#fffaf5", border: "1px dashed rgba(95,71,39,0.12)", borderRadius: 12, padding: "8px 10px" }}>
                <strong>{item.en || "表达"}</strong>
                {item.pos ? ` (${item.pos})` : ""}
                {item.zh ? `：${item.zh}` : ""}
                {item.example ? <div style={{ marginTop: 4, color: "#8A6F5B" }}>例句：{item.example}</div> : null}
              </div>
            ))}
          </div>
        )}
      />

      <ResourceBankCard
        title="句型升级建议"
        items={sentencePatterns}
        renderItem={(group, index) => (
          <div key={`${group.category || "patterns"}-${index}`} style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#3D2C1F" }}>{group.icon || "🧱"} {group.category || "句型建议"}</div>
            {toList(group.patterns).slice(0, 5).map((pattern, patternIndex) => (
              <div key={`${pattern.pattern || "pattern"}-${patternIndex}`} style={{ fontSize: 13, lineHeight: 1.75, color: "#6B5544", background: "#fffaf5", border: "1px dashed rgba(95,71,39,0.12)", borderRadius: 12, padding: "8px 10px" }}>
                <strong>{pattern.pattern || "句型"}</strong>
                {pattern.zh ? <div style={{ marginTop: 4 }}>释义：{pattern.zh}</div> : null}
                {pattern.usage ? <div style={{ marginTop: 4, color: "#8A6F5B" }}>用法：{pattern.usage}</div> : null}
                {pattern.example ? <div style={{ marginTop: 4, color: "#8A6F5B" }}>例句：{pattern.example}</div> : null}
              </div>
            ))}
          </div>
        )}
      />
    </div>
  );
}

function ContinuationDetailedView({ result, writingType }) {
  if (!result) return null;

  const plotLogic = result.plotLogic || {};
  const characterConsistency = result.characterConsistency || {};
  const themeAlignment = result.themeAlignment || {};
  const sampleEssay = result.sampleEssay || {};
  const languageIssues = toList(result.languageIssues);
  const advancedSuggestions = toList(result.advancedSuggestions);
  const sampleHighlights = toList(sampleEssay.highlights);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {result.overview ? (
        <div style={{ borderRadius: 16, padding: "14px 16px", background: "#fffdf9", border: "1px solid rgba(95,71,39,0.12)", fontSize: 14, lineHeight: 1.8, color: "#3D2C1F" }}>
          {result.overview}
        </div>
      ) : null}

      <InsightCard
        title="情节承接"
        summary={plotLogic.summary}
        strengths={plotLogic.strengths}
        risks={plotLogic.risks}
        actions={plotLogic.bridgingSuggestions}
      />
      <InsightCard
        title="人物一致性"
        summary={characterConsistency.summary}
        strengths={characterConsistency.strengths}
        risks={characterConsistency.risks}
        actions={characterConsistency.revisionFocus}
        accent="#7d5c26"
      />
      <InsightCard
        title="主题回扣"
        summary={themeAlignment.summary}
        strengths={themeAlignment.strengths}
        risks={themeAlignment.risks}
        actions={themeAlignment.revisionFocus}
        accent="#8f4d2a"
      />

      {languageIssues.length ? (
        <div style={{ border: "1px solid rgba(95,71,39,0.12)", borderRadius: 18, background: "#fffdf9", padding: "14px 16px", display: "grid", gap: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#8b5e1a" }}>语言关键问题</div>
          {languageIssues.slice(0, 5).map((item, index) => (
            <div key={`${item.title || "issue"}-${index}`} style={{ paddingBottom: index === Math.min(languageIssues.length, 5) - 1 ? 0 : 10, borderBottom: index === Math.min(languageIssues.length, 5) - 1 ? "none" : "1px dashed rgba(95,71,39,0.12)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#3D2C1F", marginBottom: 4 }}>{item.title || `问题 ${index + 1}`}</div>
              {item.detail ? <div style={{ fontSize: 13, lineHeight: 1.75, color: "#6B5544", marginBottom: item.example ? 4 : 0 }}>{item.detail}</div> : null}
              {item.example ? <div style={{ fontSize: 13, lineHeight: 1.75, color: "#8A6F5B" }}><strong>示例：</strong>{item.example}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      {advancedSuggestions.length ? (
        <div style={{ border: "1px solid rgba(95,71,39,0.12)", borderRadius: 18, background: "#fffaf5", padding: "14px 16px", display: "grid", gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#8b5e1a" }}>高阶改写建议</div>
          {advancedSuggestions.slice(0, 5).map((item, index) => (
            <div key={`${item}-${index}`} style={{ fontSize: 13, lineHeight: 1.75, color: "#3D2C1F" }}>
              {index + 1}. {item}
            </div>
          ))}
        </div>
      ) : null}

      {sampleEssay.text ? (
        <div style={{ border: "1px solid rgba(95,71,39,0.12)", borderRadius: 18, background: "#fffdf9", padding: "14px 16px", display: "grid", gap: 8 }}>
          {sampleEssay.title || writingType !== "continuation" ? (
            <div style={{ fontSize: 14, fontWeight: 800, color: "#8b5e1a" }}>{sampleEssay.title || "参考范文"}</div>
          ) : null}
          {sampleHighlights.length ? <div style={{ fontSize: 13, lineHeight: 1.75, color: "#8A6F5B" }}><strong>亮点：</strong>{sampleHighlights.join("；")}</div> : null}
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.85, color: "#3D2C1F", maxHeight: 260, overflow: "auto" }}>
            {sampleEssay.text}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function DetailedFeedbackStatusSection({ isMobile, feedback, writing }) {
  const { status, result, writingType } = _buildDetailedViewData(feedback, writing);
  const statusLabelMap = {
    not_requested: "未触发",
    pending: "排队中",
    running: "生成中",
    ready: "已生成",
    failed: "生成失败",
    dead_letter: "需重试",
  };

  return (
    <SurfaceCard>
      <SurfaceHeader title="学生侧详细反馈状态" badge={statusLabelMap[status] || "状态未知"} isMobile={isMobile} />
      <div style={{ padding: isMobile ? "14px" : "16px 18px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        <StatusBanner tone={status === "ready" ? "success" : "neutral"}>
          {status === "ready"
            ? "这篇作文的 AI精批已经生成，学生进入自己的账号后可以直接查看。"
            : status === "running"
              ? "学生侧 AI精批正在生成中。"
              : status === "failed"
                ? "学生侧 AI精批这次生成失败了。教师端当前只展示状态，后续需要由学生在自己的账号里重新触发。"
                : "学生还没有触发 AI精批。"}
        </StatusBanner>

        {status === "ready" && writingType === "continuation" ? (
          <ContinuationDetailedView result={result} writingType={writingType} />
        ) : null}

        {status === "ready" && writingType !== "continuation" ? (
          <GeneralDetailedView result={result} />
        ) : null}
      </div>
    </SurfaceCard>
  );
}
