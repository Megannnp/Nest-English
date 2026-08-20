function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeSentence(text = "") {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/[。！？；，、,.!?;:]+$/g, "")
    .trim();
}

function normalizeFeedbackText(item = "") {
  if (typeof item === "string") return normalizeSentence(item);
  if (!item || typeof item !== "object") return "";
  return normalizeSentence(item.detail || item.technique || item.title || item.comment || item.explanation || item.problem || item.issue || item.original || "");
}

function normalizeType(feedback = {}) {
  return String(feedback?.writingType || feedback?.type || "general").trim().toLowerCase();
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function pickCategoryComment(feedback = {}, names = []) {
  const categories = asList(feedback?.categories);
  const target = categories.find((item) => names.includes(String(item?.name || "").trim()));
  return normalizeSentence(target?.comment || "");
}

function pickMainWeakness(feedback = {}) {
  if (asList(feedback?.improvements).length > 0) {
    return normalizeFeedbackText(feedback.improvements[0]);
  }

  if (asList(feedback?.weaknesses).length > 0) {
    return normalizeFeedbackText(feedback.weaknesses[0]);
  }

  if (asList(feedback?.grammarIssues).length > 0) {
    const first = feedback.grammarIssues[0];
    return normalizeSentence(first?.explanation || `${first?.type || "语言问题"}需要继续修正`);
  }

  return pickCategoryComment(feedback, ["语言", "结构", "内容"]);
}

function pickContentHighlight(feedback) {
  return asList(feedback?.highlights?.content).length ? normalizeFeedbackText(feedback.highlights.content[0]) : "";
}

function pickSentenceHighlight(feedback) {
  const first = asList(feedback?.highlights?.sentences)[0];
  return first ? normalizeSentence(first?.comment || first?.original || "") : "";
}

function pickVocabularyHighlight(feedback) {
  const first = asList(feedback?.highlights?.vocabulary)[0];
  return first ? normalizeSentence(first?.comment || first?.word || "") : "";
}

function pickStrongCategoryHighlight(feedback) {
  const strong = asList(feedback?.categories).find((item) => ["优", "良"].includes(item?.grade));
  return normalizeSentence(strong?.comment || "");
}

function pickMainHighlight(feedback = {}) {
  return pickContentHighlight(feedback)
    || pickSentenceHighlight(feedback)
    || pickVocabularyHighlight(feedback)
    || pickStrongCategoryHighlight(feedback)
    || pickCategoryComment(feedback, ["内容", "语言", "结构"]);
}

function pickAction(feedback = {}) {
  if (asList(feedback?.improvements).length > 0) {
    const second = feedback.improvements[1] || feedback.improvements[0];
    return normalizeFeedbackText(second);
  }

  const suggestions = asList(feedback?.suggestions);
  if (suggestions.length > 0) {
    return normalizeFeedbackText(suggestions[0]);
  }

  return "";
}

function finalizeComment(text = "", summary = "") {
  let result = normalizeSentence(text).replace(/。+/g, "。").trim();
  result = result.replace(/^。|。$/g, "");

  const cleanSummary = normalizeSentence(summary);
  const canMergeSummary = cleanSummary && !result.includes(cleanSummary);
  if (result.length < 70 && canMergeSummary) {
    const merged = `${result}。整体来看，${cleanSummary}`.replace(/。+/g, "。").replace(/^。|。$/g, "");
    result = merged.length > 118 ? result : merged;
  }

  if (!result) {
    result = "这次写作已基本完成任务。后续请继续压实要点覆盖，减少重复表达，并把结尾收得更完整。";
  }

  if (result.length > 118) {
    result = `${result.slice(0, 116).replace(/[，、；：]?[^\u4e00-\u9fa5a-zA-Z0-9]*$/u, "").trim()}。`;
  } else if (!result.endsWith("。")) {
    result = `${result}。`;
  }

  return result;
}

function buildAppliedWritingComment(feedback, summary, highlight, weakness, action) {
  const purpose = normalizeSentence(feedback?.contentAnalysis?.communicationGoal || "");
  const tone = normalizeSentence(feedback?.toneAnalysis?.appropriateness || "");
  const hardReq = firstItem(feedback?.taskAnalysis?.hardRequirements);
  const parts = [];

  if (purpose) {
    parts.push(`这篇应用文的交际目的基本明确，${purpose}`);
  } else if (highlight) {
    parts.push(`这次写作在任务表达上有亮点，${highlight}`);
  }

  if (hardReq) {
    parts.push(`后续要继续把“${normalizeSentence(hardReq)}”这类关键信息写实写全`);
  } else if (weakness) {
    parts.push(`当前最需要加强的是${weakness}`);
  }

  if (tone) {
    parts.push(`还要注意语气与身份场景匹配，${tone}`);
  } else if (action) {
    parts.push(`下次写作时，重点把${action}落实出来`);
  }

  return finalizeComment(parts.join("。"), summary);
}

function firstItem(value) {
  return asList(value)[0] || "";
}

function buildSummaryComment(feedback, summary, highlight, weakness, action) {
  const missed = asList(feedback?.missedPoints)[0] || "";
  const stance = normalizeSentence(feedback?.commentaryAnalysis?.stance || "");
  const parts = [];

  if (highlight) {
    parts.push(`这次述评在材料理解上有基础，${highlight}`);
  } else {
    parts.push("这次述评的基本框架已经搭起来了");
  }

  if (missed) {
    parts.push(`接下来先补足“${normalizeSentence(missed)}”这一核心信息，避免概括失真`);
  } else if (weakness) {
    parts.push(`当前最需要加强的是${weakness}`);
  }

  if (stance) {
    parts.push(`评论部分要尽快亮出自己的判断，${stance}`);
  } else if (action) {
    parts.push(`下次写作时，重点把${action}落实出来`);
  }

  return finalizeComment(parts.join("。"), summary);
}

function buildContinuationComment(feedback, summary, highlight, weakness, action) {
  const plotLogic = feedback?.contentAnalysis?.plotLogic || {};
  const plot = normalizeSentence(plotLogic.coherence || plotLogic.accuracy || "");
  const emotion = normalizeSentence(feedback?.contentAnalysis?.characterConsistency?.emotion || "");
  const parts = [];

  if (plot) {
    parts.push(`这次续写的情节衔接有基础，${plot}`);
  } else if (highlight) {
    parts.push(`这次续写有一个明显优点：${highlight}`);
  }

  if (emotion) {
    parts.push(`后续还要把人物情绪变化写得更顺，${emotion}`);
  } else if (weakness) {
    parts.push(`当前最需要加强的是${weakness}`);
  }

  if (action) {
    parts.push(`下次写作时，重点把${action}落实出来`);
  }

  return finalizeComment(parts.join("。"), summary);
}

function buildNarrativeComment(feedback, summary, highlight, weakness, action) {
  const storyline = normalizeSentence(feedback?.storyLine?.what || "");
  const emotionTone = normalizeSentence(feedback?.emotionLine?.tone || "");
  const parts = [];

  if (storyline) {
    parts.push(`这篇记叙类作文的主线比较清楚，${storyline}`);
  } else if (highlight) {
    parts.push(`这次写作有一个明显优点：${highlight}`);
  }

  if (emotionTone) {
    parts.push(`后续可以继续把情感变化写得更细，让全文基调更自然，${emotionTone}`);
  } else if (weakness) {
    parts.push(`当前最需要加强的是${weakness}`);
  }

  if (action) {
    parts.push(`下次写作时，重点把${action}落实出来`);
  }

  return finalizeComment(parts.join("。"), summary);
}

function buildArgumentativeComment(feedback, summary, highlight, weakness, action) {
  const thesis = normalizeSentence(feedback?.thesisAnalysis?.position || "");
  const logic = normalizeSentence(feedback?.logicStructure?.coherence || "");
  const parts = [];

  if (thesis) {
    parts.push(`这篇议论文的观点表达比较清楚，${thesis}`);
  } else if (highlight) {
    parts.push(`这次写作在观点表达上有亮点，${highlight}`);
  }

  if (logic) {
    parts.push(`接下来要继续把论证层次拉开，${logic}`);
  } else if (weakness) {
    parts.push(`当前最需要加强的是${weakness}`);
  }

  if (action) {
    parts.push(`下次写作时，重点把${action}落实出来`);
  }

  return finalizeComment(parts.join("。"), summary);
}

function buildChartComment(feedback, summary, highlight, weakness, action) {
  const material = normalizeSentence(feedback?.materialAnalysis?.coreMessage || feedback?.materialAnalysis?.topic || "");
  const structureTask = normalizeSentence(feedback?.structureAnalysis?.summaryTask || "");
  const parts = [];

  if (material) {
    parts.push(`这篇图表作文已经抓到主要信息，${material}`);
  } else if (highlight) {
    parts.push(`这次写作在数据概括上有亮点，${highlight}`);
  }

  if (structureTask) {
    parts.push(`后续还要把趋势概括和细节比较分开写清，${structureTask}`);
  } else if (weakness) {
    parts.push(`当前最需要加强的是${weakness}`);
  }

  if (action) {
    parts.push(`下次写作时，重点把${action}落实出来`);
  }

  return finalizeComment(parts.join("。"), summary);
}

function buildCompactComment(item = {}) {
  const feedback = item?.feedback || {};
  const type = normalizeType(feedback);
  const summary = normalizeSentence(feedback?.summary || feedback?.overall?.summary || "");
  const highlight = pickMainHighlight(feedback);
  const weakness = pickMainWeakness(feedback);
  const action = pickAction(feedback);

  const builder = findCommentBuilder(type);
  if (builder) return builder(feedback, summary, highlight, weakness, action);

  return finalizeComment(
    [
      highlight ? `这次作文有一个明显优点：${highlight}` : summary,
      weakness ? `接下来最值得优先调整的是${weakness}` : "",
      action ? `下次写作时，重点把${action}落实出来` : "",
    ].filter(Boolean).join("。"),
    summary
  );
}

const COMMENT_BUILDERS = [
  { types: ["letter", "notice", "speech", "report", "proposal"], build: buildAppliedWritingComment },
  { types: ["summary", "review"], build: buildSummaryComment },
  { types: ["continuation"], build: buildContinuationComment },
  { types: ["narrative", "diary", "picture_writing"], build: buildNarrativeComment },
  { types: ["argumentative", "expository"], build: buildArgumentativeComment },
  { types: ["chart_writing"], build: buildChartComment },
];

function findCommentBuilder(type) {
  return COMMENT_BUILDERS.find((item) => item.types.includes(type))?.build || null;
}

export function buildBatchFeedbackPdfHtml({ items = [], title = "" }) {
  const slips = items
    .filter((item) => item?.status === "done" && item?.feedback)
    .map((item, index) => ({
      id: `${index}-${item?.studentName || item?.detectedName || "student"}`,
      name: item?.studentName || item?.detectedName || "未署名学生",
      comment: buildCompactComment(item),
    }));

  return `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title || "批量反馈导出")}</title>
    <style>
      @page { size: A4; margin: 8mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
        color: #2a1f14;
        background: #fff;
      }
      .sheet {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0;
      }
      .slip {
        min-height: 52mm;
        padding: 4mm 4.5mm 3.6mm;
        border-right: 1px dashed #c7b7a6;
        border-bottom: 1px dashed #c7b7a6;
        page-break-inside: avoid;
      }
      .slip:nth-child(2n) {
        border-right: none;
      }
      .name {
        font-size: 8.8pt;
        font-weight: 700;
        line-height: 1.15;
        margin: 0 0 1.8mm;
        letter-spacing: 0.2px;
      }
      .comment {
        font-size: 7.7pt;
        line-height: 1.42;
        word-break: break-word;
        text-align: justify;
        margin: 0;
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      ${slips.map((item) => `
        <section class="slip">
          <div class="name">${escapeHtml(item.name)}</div>
          <p class="comment">${escapeHtml(item.comment)}</p>
        </section>
      `).join("")}
    </div>
    <script>setTimeout(() => window.print(), 300);</script>
  </body>
  </html>`;
}

export function exportBatchFeedbackPdf({ items, title }) {
  const html = buildBatchFeedbackPdfHtml({ items, title });
  const iframe = document.createElement("iframe");

  iframe.setAttribute("title", "批量反馈导出");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow || window;
  const printDocument = iframe.contentDocument || printWindow.document;

  printDocument.open();
  printDocument.write(html);
  printDocument.close();

  const hasWindowPrintStub = Object.prototype.hasOwnProperty.call(window, "print");
  const print = hasWindowPrintStub ? window.print : printWindow.print;
  const runPrint = () => {
    print?.call(print === window.print ? window : printWindow);
  };

  if (hasWindowPrintStub) {
    runPrint();
  } else {
    setTimeout(runPrint, 0);
  }

  return { mode: "iframe", iframe };
}
