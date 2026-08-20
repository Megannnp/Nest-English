import { useEffect, useRef, useState } from "react";

import ReadingMindMap from "./ReadingMindMap.jsx";
import ReadingPassageHighlight from "./ReadingPassageHighlight.jsx";
import ReadingQuestionCards from "./ReadingQuestionCards.jsx";
import ReadingTopBar from "./ReadingTopBar.jsx";
import { readingAPI } from "../api/index.js";
import AppIcon from "../components/shared/AppIcon.jsx";
import ModuleHomeGrid from "../components/shared/ModuleHomeGrid.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./reading.css";

const OCR_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const OCR_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const OCR_MAX_IMAGE_MB = OCR_MAX_IMAGE_BYTES / 1024 / 1024;

function iconButtonStyle(disabled = false) {
  return {
    fontSize: 16,
    background: "transparent",
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    padding: "2px 4px",
    borderRadius: 6,
    color: disabled ? "#9db8b4" : "#1a7a6e",
    lineHeight: 1,
    opacity: disabled ? 0.58 : 1,
  };
}

function appendRecognizedText(current, next) {
  const clean = String(next || "").trim();
  if (!clean) return current;
  return `${current}${current.trim() ? "\n\n" : ""}${clean}`;
}

function splitReadingInput(rawPassage, rawQuestions = "") {
  const passage = String(rawPassage || "").trim();
  const questions = String(rawQuestions || "").trim();
  if (!passage || questions) return { passage, questions };

  const lines = passage.split(/\r?\n/);
  const questionStartIndex = lines.findIndex((line, index) => {
    const trimmed = line.trim();
    if (index < 2 || !trimmed) return false;
    return (
      /^(questions?|题目|阅读理解|choose the best answer)\b/i.test(trimmed) ||
      /^(?:\d{1,2}[).、]|[A-D][).])\s+/.test(trimmed)
    );
  });

  if (questionStartIndex <= 0) return { passage, questions: "" };

  return {
    passage: lines.slice(0, questionStartIndex).join("\n").trim(),
    questions: lines.slice(questionStartIndex).join("\n").trim(),
  };
}

function mergeRecognizedText({ currentPassage, currentQuestions, recognizedText }) {
  const split = splitReadingInput(recognizedText);
  return {
    passage: appendRecognizedText(currentPassage, split.passage || recognizedText),
    questions: split.questions ? appendRecognizedText(currentQuestions, split.questions) : currentQuestions,
  };
}

function readAnalysisSeed() {
  try {
    const seed = JSON.parse(sessionStorage.getItem("nestReadingAnalysisSeed") || "{}");
    sessionStorage.removeItem("nestReadingAnalysisSeed");
    if (!seed?.result?.mindMap) return null;
    return seed;
  } catch {
    return null;
  }
}

function validateOcrImage(file) {
  if (!file || !OCR_IMAGE_TYPES.has(file.type)) {
    throw new Error("仅支持 PNG、JPG/JPEG、WEBP 图片");
  }
  if (file.size > OCR_MAX_IMAGE_BYTES) {
    throw new Error(`图片不能超过${OCR_MAX_IMAGE_MB}MB`);
  }
}

function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      padding: "12px 16px", borderRadius: 12,
      background: "#fff4f4", border: "1px solid rgba(180,40,40,0.2)",
      color: "#a02020", fontSize: 13, marginTop: 12,
    }}>
      {msg}
    </div>
  );
}

function Spinner({ label, sub }) {
  return (
    <div style={{ padding: "48px 0", textAlign: "center" }}>
      <div style={{
        width: 36, height: 36,
        border: "3px solid rgba(26,122,110,0.15)",
        borderTopColor: "#1a7a6e", borderRadius: "50%",
        animation: "rd-spin 0.9s linear infinite",
        margin: "0 auto 16px",
      }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a7a6e" }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: "#4a7a74", marginTop: 6 }}>{sub}</div>}
      <style>{`@keyframes rd-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Passage panel (collapsible, shown above mind map) ── */
function PassagePanel({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const wordCount = text.trim().split(/\s+/).length;
  return (
    <div style={{
      marginBottom: 20, borderRadius: 14,
      border: '1px solid rgba(26,122,110,0.12)',
      background: '#f8fdfc', overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '10px 16px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, fontWeight: 800, color: '#1a7a6e',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}
      >
        <span>原文</span>
        <span style={{ fontSize: 10, color: '#7aada8', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
          · {wordCount} 词
        </span>
        <span style={{
          marginLeft: 'auto', color: '#4a7a74', fontSize: 12,
          display: 'inline-block',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▾</span>
      </button>
      {open && (
        <div style={{
          padding: '12px 16px 14px', fontSize: 13.5,
          lineHeight: 1.85, color: '#0f2e2a', whiteSpace: 'pre-wrap',
          borderTop: '1px solid rgba(26,122,110,0.08)',
          maxHeight: 300, overflowY: 'auto',
        }}>
          {text}
        </div>
      )}
    </div>
  );
}

/* ── Input phase ────────────────────────────────────── */
function OcrInputHeader({ charCount, isMobile, loading, ocrLoading, onChooseImage }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em",
        color: "#1a7a6e", textTransform: "uppercase" }}>
        阅读文章 + 题目
      </div>
      <button
        type="button"
        onClick={onChooseImage}
        disabled={loading || ocrLoading}
        style={iconButtonStyle(loading || ocrLoading)}
        title={isMobile ? "拍照或从相册选择图片识别" : "上传图片识别"}
      >
        <AppIcon name={isMobile ? "camera" : "folder-open"} size={16} />
      </button>
      {ocrLoading && <span style={{ fontSize: 11, color: "#4a7a74" }}>图片识别中…</span>}
      {!ocrLoading && charCount > 0 && (
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#7aada8", fontFamily: "monospace" }}>
          {charCount}字符
        </span>
      )}
    </div>
  );
}

function InputPhase({
  passageText,
  questionText,
  setPassageText,
  setQuestionText,
  loading,
  error,
  onSubmit,
  onReset,
  hasResult,
  isMobile,
  ocrLoading,
  ocrError,
  dragActive,
  onChooseImage,
  onDrop,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onPaste,
}) {
  const combinedText = `${passageText}\n${questionText}`.trim();
  return (
    <form onSubmit={onSubmit}>
      <div
        className="rd-analyzer-workspace studio-reveal studio-reveal--delay-1"
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        style={dragActive ? {
          outline: "2px dashed rgba(26,122,110,0.45)",
          outlineOffset: 4,
          background: "rgba(26,122,110,0.03)",
        } : undefined}
      >
        <div>
          <OcrInputHeader
            charCount={combinedText.length}
            isMobile={isMobile}
            loading={loading}
            ocrLoading={ocrLoading}
            onChooseImage={onChooseImage}
          />
          <textarea
            className="rd-combined-input"
            aria-label="阅读原文"
            placeholder={"在此粘贴阅读原文（中英文均可）…\n\n如果把文章和题目一起粘贴在这里，提交时会自动尝试拆分。也可以上传、拖拽或粘贴图片识别文字。"}
            value={passageText}
            onChange={e => setPassageText(e.target.value)}
            onPaste={onPaste}
            rows={12}
            disabled={loading || ocrLoading}
          />
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em",
            color: "#1a7a6e", textTransform: "uppercase", marginTop: 14, marginBottom: 10 }}>
            题目与选项
          </div>
          <textarea
            className="rd-combined-input"
            aria-label="阅读题目与选项"
            placeholder={"可选：在此粘贴题目、选项和题号。留空时，AI 会基于文章或混合输入自动判断是否有题目。"}
            value={questionText}
            onChange={e => setQuestionText(e.target.value)}
            onPaste={onPaste}
            rows={6}
            disabled={loading || ocrLoading}
            style={{ minHeight: 160 }}
          />
          <div style={{ fontSize: 11, color: "#4a7a74", marginTop: 6 }}>
            已输入 {combinedText ? combinedText.split(/\s+/).length : 0} 词
            {!isMobile && <span> · 可拖拽图片到此处，或直接粘贴截图识别</span>}
          </div>
        </div>

        <ErrorBanner msg={error} />
        <ErrorBanner msg={ocrError} />

        <div className="rd-analyzer-actions">
          <button type="submit" className="gm-btn-primary" aria-label={loading ? "AI 分析中" : "生成思维导图"} disabled={loading || ocrLoading || !passageText.trim()}>
            {loading ? "AI 分析中…" : "生成思维导图"}
          </button>
          {hasResult && (
            <button type="button" className="gm-btn-secondary" onClick={onReset}>
              重新输入
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

/* ── Mindmap phase ──────────────────────────────────── */
function MindmapPhase({ result, text, onProceed, onReset }) {
  return (
    <div>
      <PassagePanel text={text} />
      <ReadingMindMap data={result} />

      <div style={{ textAlign: "center", marginTop: 32, marginBottom: 8 }}>
        <button
          type="button"
          className="gm-btn-primary"
          style={{ padding: "13px 36px", fontSize: 15 }}
          onClick={onProceed}
        >
          查看题目解析 →
        </button>
        <div style={{ marginTop: 16 }}>
          <button type="button" className="gm-btn-secondary" onClick={onReset}>
            重新输入
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Questions phase ────────────────────────────────── */
function QuestionsPhase({ result, text, onReset }) {
  return (
    <div>
      <PassagePanel text={text} />
      <ReadingMindMap data={result} />
      <ReadingPassageHighlight passage={text} questions={result.questions || []} />
      <div style={{ marginTop: 32 }}>
        <ReadingQuestionCards questions={result.questions || []} />
      </div>
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button type="button" className="gm-btn-secondary" onClick={onReset}>
          重新输入
        </button>
      </div>
    </div>
  );
}

/* ── 阅读模块首页统一入口卡 ───────────────────────────── */
const READING_HOME_ENTRIES = [
  { label: "阅读思维", page: "reading-analyzer", desc: "粘贴文章，AI 生成思维导图并逐题解析" },
  { label: "在线练习", page: "reading-practice", desc: "整篇练习 + 题型专练，即时评分" },
  { label: "组卷打印", page: "reading-paper", desc: "从题库抽题，可打印练习" },
  { label: "阅读精讲", page: "reading-courses", desc: "阅读技巧、题型方法与训练内容" },
];

/* ── Main page ──────────────────────────────────────── */
export default function ReadingAnalyzerPage({
  user, onNavigate, onAccountClick, onLogin, onRegister,
  isMobile = false,
  activePage = "reading-analyzer",
  hideTopBar = false}) {
  const pageRef = useScrollReveal();
  const fileInputRef = useRef(null);
  const dragDepthRef = useRef(0);
  const [passageText, setPassageText] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [submittedInput, setSubmittedInput] = useState({ passage: "", questions: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ocrError, setOcrError] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState(null);
  // phase: 'input' | 'analyzing' | 'mindmap' | 'questions'
  const [phase, setPhase] = useState("input");

  useEffect(() => {
    const seed = readAnalysisSeed();
    if (!seed) return;
    setPassageText(seed.passage || "");
    setQuestionText(seed.questions || "");
    setSubmittedInput({ passage: seed.passage || "", questions: seed.questions || "" });
    setResult(seed.result);
    setPhase("questions");
  }, []);

  async function recognizeImageFile(file) {
    try {
      validateOcrImage(file);
    } catch (err) {
      setOcrError(err.message || "图片文件不符合要求");
      return;
    }

    setError("");
    setOcrError("");
    setOcrLoading(true);
    try {
      const res = await readingAPI.recognizeImage(file);
      const recognizedText = res?.text || "";
      if (!recognizedText.trim()) {
        setOcrError("未识别到文字，请换一张更清晰的图片或手动输入");
        return;
      }
      const next = mergeRecognizedText({
        currentPassage: passageText,
        currentQuestions: questionText,
        recognizedText,
      });
      setPassageText(next.passage);
      setQuestionText(next.questions);
    } catch (err) {
      setOcrError(err?.message || "图片识别失败，请稍后重试");
    } finally {
      setOcrLoading(false);
    }
  }

  function handleChooseImage() {
    fileInputRef.current?.click();
  }

  function handleImageInputChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void recognizeImageFile(file);
  }

  function handlePasteImage(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItem = Array.from(items).find((item) => OCR_IMAGE_TYPES.has(item.type));
    if (!imageItem) return;
    e.preventDefault();
    const blob = imageItem.getAsFile();
    if (!blob) return;
    const file = new File([blob], "pasted-reading-image.png", { type: blob.type });
    void recognizeImageFile(file);
  }

  function handleDragEnter(e) {
    if (loading || ocrLoading) return;
    const items = Array.from(e.dataTransfer?.items || []);
    if (!items.some((item) => item.kind === "file")) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setDragActive(true);
  }

  function handleDragOver(e) {
    if (loading || ocrLoading) return;
    e.preventDefault();
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    dragDepthRef.current = 0;
    setDragActive(false);
    if (loading || ocrLoading) return;
    const file = Array.from(e.dataTransfer?.files || []).find((item) => OCR_IMAGE_TYPES.has(item.type));
    if (!file) {
      setOcrError("请拖入 PNG、JPG/JPEG 或 WEBP 图片");
      return;
    }
    void recognizeImageFile(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = splitReadingInput(passageText, questionText);
    if (!payload.passage.trim()) { setError("请先粘贴阅读文章"); return; }
    setError("");
    setLoading(true);
    setPhase("analyzing");
    setResult(null);
    setSubmittedInput(payload);
    try {
      const res = await readingAPI.analyze(payload);
      if (res?.mindMap) {
        setResult(res);
        setPhase("mindmap");
      } else {
        setError("分析失败，请重试");
        setPhase("input");
      }
    } catch (err) {
      setError(err?.message || "网络错误，请重试");
      setPhase("input");
    } finally {
      setLoading(false);
    }
  }

  function handleProceedToQuestions() {
    setPhase("questions");
  }

  function handleReset() {
    setPassageText("");
    setQuestionText("");
    setSubmittedInput({ passage: "", questions: "" });
    setResult(null);
    setError("");
    setOcrError("");
    setPhase("input");
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="rd-page" ref={pageRef}>
      {!hideTopBar && (

        <ReadingTopBar
        user={user}
        onNavigate={onNavigate}
        onAccountClick={onAccountClick}
        onLogin={onLogin ?? (() => onNavigate?.("auth"))}
        onRegister={onRegister ?? (() => onNavigate?.("auth"))}
        activePage={activePage}
      />

      )}

      {/* Hero at same level as ReadingPage homepage */}
      <section className="rd-hero studio-reveal">
        <div className="rd-hero__kicker">筑巢阅读 · 思维训练</div>
        <h1 className="rd-hero__title">读透文章，题题有据。</h1>
        <p className="rd-hero__sub">
          粘贴阅读原文和题目，AI 先生成思维导图帮你把握文章脉络，再逐题解析、答案定位。
        </p>
      </section>

      {phase === "input" && (
        <ModuleHomeGrid
          module={{ label: "筑巢阅读", dot: "#1a7a6e", border: "rgba(26, 122, 110, 0.2)" }}
          onNavigate={onNavigate}
          title="筑巢阅读"
          intro="从思维导图、在线练习到组卷打印和精讲课程，形成完整阅读训练闭环。"
          entries={READING_HOME_ENTRIES}
          primaryEntry="reading-practice"
          primaryLabel="开始阅读练习"
        />
      )}

      <div className="rd-analyzer-inner" style={{ paddingTop: 0 }}>
        <input
          ref={fileInputRef}
          aria-label="上传阅读图片"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/*"
          capture={isMobile ? "environment" : undefined}
          onChange={handleImageInputChange}
          style={{ display: "none" }}
        />
        {(phase === "input" || phase === "analyzing") && (
          <>
            <InputPhase
              passageText={passageText}
              questionText={questionText}
              setPassageText={setPassageText}
              setQuestionText={setQuestionText}
              loading={loading}
              error={error}
              ocrError={ocrError}
              ocrLoading={ocrLoading}
              onSubmit={handleSubmit}
              onReset={handleReset}
              hasResult={Boolean(result)}
              isMobile={isMobile}
              dragActive={dragActive}
              onChooseImage={handleChooseImage}
              onDrop={handleDrop}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onPaste={handlePasteImage}
            />
            {loading && <Spinner label="AI 正在分析文章结构…" sub="通常需要 15–30 秒" />}
          </>
        )}

        {phase === "mindmap" && (
          <MindmapPhase
            result={result}
            text={submittedInput.passage}
            onProceed={handleProceedToQuestions}
            onReset={handleReset}
          />
        )}

        {phase === "questions" && (
          <QuestionsPhase result={result} text={submittedInput.passage} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}
