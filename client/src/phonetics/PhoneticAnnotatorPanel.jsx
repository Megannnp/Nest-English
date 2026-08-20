import { useEffect, useState } from "react";

import PhoneticAnnotatedSentence from "./PhoneticAnnotatedSentence.jsx";
import { recordPhoneticsProgress } from "./phoneticsProgressClient.js";
import { phoneticsAPI } from "../api/index.js";
import useTTS from "../hooks/useTTS.js";

const MODE_COPY = {
  sentence: {
    label: "英文句子",
    placeholder: "输入一句英文，例如：The scientists were awarded the prize.",
    button: "生成语音标注",
    maxLength: 300,
  },
  discourse: {
    label: "英文语篇",
    placeholder: "粘贴一段英文短文，AI 会逐句生成语音标注。",
    button: "生成语篇标注",
    maxLength: 2000,
  },
};
function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const EXPORT_STRESS_MARK = {
  strong: "●",
  weak: "○",
};

const EXPORT_INTONATION_MARK = {
  rise: "↗",
  fall: "↘",
};

const EXPORT_TOKENS_PER_ROW = 6;
const EXPORT_LOGO_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="420" height="88" viewBox="0 0 420 88" role="img" aria-label="nest English">
  <rect width="420" height="88" fill="white"/>
  <text x="0" y="58" fill="#111111" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800">nest</text>
  <text x="126" y="58" fill="#b34f72" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="800">English</text>
</svg>
`)}`;

function buildTokenMarks(token) {
  return [
    token.linkNext ? "‿" : "",
    token.assimilationNext ? "→" : "",
    token.pauseAfter ? "/" : "",
    token.intonationAfter ? EXPORT_INTONATION_MARK[token.intonationAfter] : "",
  ].filter(Boolean).join(" ");
}

function chunkTokens(tokens = []) {
  const chunks = [];
  for (let index = 0; index < tokens.length; index += EXPORT_TOKENS_PER_ROW) {
    chunks.push(tokens.slice(index, index + EXPORT_TOKENS_PER_ROW));
  }
  return chunks;
}

function buildExportTokenTableHtml(tokens = []) {
  return chunkTokens(tokens).map((chunk) => {
    const ipaCells = [];
    const wordCells = [];
    const stressCells = [];

    chunk.forEach((token) => {
      const word = `${token.word}${token.trailingPunct || ""}`;
      const plosion = token.dropPlosionEnd ? '<span class="plosion-mark">̚</span>' : '';
      const marks = buildTokenMarks(token);
      const stress = EXPORT_STRESS_MARK[token.stress] || "";

      ipaCells.push(`<td class="ipa-cell">${token.ipa ? `/${escapeHtml(token.ipa)}/` : "&nbsp;"}</td>`);
      wordCells.push(`<td class="word-cell">${escapeHtml(word)}${plosion}</td>`);
      stressCells.push(`<td class="stress-cell ${token.stress === "strong" ? "stress-strong" : ""}">${stress || "&nbsp;"}</td>`);
      ipaCells.push('<td class="mark-cell">&nbsp;</td>');
      wordCells.push(`<td class="mark-cell">${marks ? escapeHtml(marks) : "&nbsp;"}</td>`);
      stressCells.push('<td class="mark-cell">&nbsp;</td>');
    });

    return `
      <table class="annotation-table" cellspacing="0" cellpadding="0">
        <tr>${ipaCells.join("")}</tr>
        <tr>${wordCells.join("")}</tr>
        <tr>${stressCells.join("")}</tr>
      </table>
    `;
  }).join("");
}

export function buildExportHtml(result) {
  const sentenceHtml = result.sentences.map((sentence, sentenceIndex) => {
    const explanations = sentence.explanations?.length
      ? sentence.explanations.map((item) => `<p class="note">${escapeHtml(item.category)}：${escapeHtml(item.detail)}</p>`).join("")
      : "";
    const tokenHtml = buildExportTokenTableHtml(sentence.tokens || []);

    return `
      <section>
        <h2>第 ${sentenceIndex + 1} 句</h2>
        <p class="sentence">${escapeHtml(sentence.text)}</p>
        ${tokenHtml}
        ${explanations}
      </section>
    `;
  }).join("");

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>语篇语音标注</title>
        <style>
          body { font-family: Arial, "Helvetica Neue", sans-serif; color: #111; line-height: 1.7; padding: 32px; }
          .brand { display: flex; align-items: center; gap: 24px; margin-bottom: 8px; }
          .brand-logo { width: 180px; height: auto; display: block; }
          .brand-cn { font-size: 24px; font-weight: 800; color: #111; white-space: nowrap; }
          .site { margin: 0 0 28px; color: #111; font-size: 13px; }
          h1 { font-size: 24px; margin: 0 0 22px; color: #111; }
          h2 { font-size: 15px; margin: 24px 0 6px; color: #111; }
          .sentence { margin: 0 0 4px; color: #111; font-size: 16px; }
          .annotation-table { border-collapse: collapse; margin: 0 0 8px; table-layout: auto; }
          .annotation-table td { border: 0; padding: 0 4px; text-align: center; vertical-align: middle; white-space: nowrap; }
          .ipa-cell { color: #b34f72; font-size: 13px; line-height: 20px; }
          .word-cell { color: #111; font-size: 16px; line-height: 24px; font-weight: 700; }
          .plosion-mark { color: #b34f72; font-size: 13px; line-height: 1; }
          .stress-cell { color: #b34f72; font-size: 11px; line-height: 16px; }
          .stress-strong { color: #b34f72; }
          .mark-cell { color: #b34f72; font-size: 15px; line-height: 24px; font-weight: 800; min-width: 16px; }
          .note { margin: 0 0 4px; color: #111; font-size: 13px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="brand">
          <img class="brand-logo" src="${escapeHtml(EXPORT_LOGO_DATA_URI)}" alt="nest English" />
          <span class="brand-cn">筑巢英语</span>
        </div>
        <p class="site">nestenglish.com</p>
        <h1>语篇语音标注</h1>
        ${sentenceHtml}
      </body>
    </html>`;
}

function downloadWord(result) {
  const blob = new Blob([buildExportHtml(result)], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `语篇语音标注-${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function printPdf(result) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "语篇语音标注 PDF 导出");
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
  printDocument.write(buildExportHtml(result));
  printDocument.close();

  setTimeout(() => {
    printWindow.focus?.();
    printWindow.print?.();
    setTimeout(() => iframe.remove(), 1000);
  }, 0);
}

function buildProgressMetadata(mode, text, result) {
  const sentences = result?.sentences || [];
  return {
    mode,
    sentenceCount: sentences.length,
    tokenCount: sentences.reduce((sum, sentence) => sum + (sentence.tokens?.length || 0), 0),
    textPreview: text.slice(0, 120),
  };
}

function getAnnotatorSubmitState(loading, buttonLabel) {
  return loading ? { label: "标注生成中", text: "标注生成中…" } : { label: buttonLabel, text: buttonLabel };
}

export default function PhoneticAnnotatorPanel({ mode = "sentence", user = null }) {
  const copy = MODE_COPY[mode] || MODE_COPY.sentence;
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [recordError, setRecordError] = useState("");
  const [loading, setLoading] = useState(false);
  const { play, playingKey, loadingKey, unsupported, errorMessage: ttsErrorMessage } = useTTS();
  const submitState = getAnnotatorSubmitState(loading, copy.button);

  useEffect(() => {
    function handleRecordFailed(event) {
      setRecordError(event?.detail || "练习记录保存失败，语音成长页可能暂未更新。");
    }
    window.addEventListener?.("nest:phonetics-record-failed", handleRecordFailed);
    return () => window.removeEventListener?.("nest:phonetics-record-failed", handleRecordFailed);
  }, []);

  async function handleAnalyze(event) {
    event.preventDefault();
    if (!text.trim()) return;
    setError("");
    setLoading(true);
    try {
      const data = await phoneticsAPI.analyzeText({ text: text.trim() });
      setResult(data);
      recordPhoneticsProgress(user, {
        activityType: mode === "discourse" ? "discourse-practice" : "sentence-practice",
        metadata: buildProgressMetadata(mode, text.trim(), data),
      });
    } catch (err) {
      setResult(null);
      setError(err?.message || "语音标注生成失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ph-annot-panel studio-reveal studio-reveal--delay-2" aria-label="AI 语音精读标注">
      <h2 className="ph-annot-panel__title">AI 智能语音精读</h2>
      <p className="ph-annot-panel__desc">
        输入{copy.label}，AI 自动标注音标、重弱读、意群停顿、连读、失去爆破与语调走向，逐句排列展示，可点击播放朗读。
      </p>
      <form className="ph-annot-form" onSubmit={handleAnalyze}>
        <label className="ph-annot-form__label" htmlFor={`ph-annot-input-${mode}`}>
          {copy.label}
        </label>
        <textarea
          id={`ph-annot-input-${mode}`}
          className="ph-annot-form__input"
          aria-label={copy.label}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={copy.placeholder}
          maxLength={copy.maxLength}
          rows={mode === "discourse" ? 6 : 3}
        />
        {error ? <div className="ph-annot-form__error" role="alert">{error}</div> : null}
        {recordError ? <div className="ph-annot-form__error" role="alert">{recordError}</div> : null}
        <div className="ph-annot-form__actions">
          <button type="submit" className="ph-annot-form__submit" aria-label={submitState.label} disabled={loading || !text.trim()}>
            {submitState.text}
          </button>
        </div>
      </form>

      {result?.sentences?.length ? (
        <div className="ph-annot-results" aria-live="polite">
          {mode === "discourse" ? (
            <div className="ph-annot-export" aria-label="导出语篇标注">
              <button type="button" className="ph-annot-export__btn" onClick={() => downloadWord(result)}>
                导出 Word
              </button>
              <button type="button" className="ph-annot-export__btn" onClick={() => printPdf(result)}>
                导出 PDF
              </button>
            </div>
          ) : null}
          {unsupported ? (
            <div className="ph-annot-tts-warning" role="status">
              {ttsErrorMessage || "语音服务暂时不可用，请稍后重试或检查网络连接。"}
            </div>
          ) : null}
          {result.sentences.map((sentence, index) => (
            <PhoneticAnnotatedSentence
              key={`${sentence.text}-${index}`}
              sentence={sentence}
              playingKey={playingKey}
              loadingKey={loadingKey}
              onPlay={play}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
