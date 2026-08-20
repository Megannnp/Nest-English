/* eslint-disable complexity */
import { useEffect, useRef, useState, useCallback } from "react";

import GrammarTopBar from "./GrammarTopBar.jsx";
import { GRAMMAR_TREE } from "./grammarTree.js";
import SentenceTree from "./SentenceTree.jsx"
import { grammarAPI } from "../api/index.js";
import AppIcon from "../components/shared/AppIcon.jsx";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./grammar.css";

const SAMPLE_SENTENCE = "The scientists who discovered the new element were awarded the Nobel Prize.";

function normalizeGrammarPoint(point) {
  if (typeof point === "string") {
    return { id: point, label: point, groupLabel: "语法点", evidence: "" };
  }
  return {
    id: point?.id || point?.label,
    label: point?.label || point?.id,
    groupLabel: point?.groupLabel || "语法点",
    evidence: point?.evidence || "",
  };
}

function ResultBlock({ title, children }) {
  return (
    <section className="gm-analyzer-result-block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** Search grammar tree for a node whose title best matches the given label. */
function findCourseNodeId(label) {
  if (!label) return null;
  const q = label.toLowerCase();

  function walk(nodes) {
    for (const node of nodes) {
      const t = (node.title || "").toLowerCase();
      if (t === q) return node.id;
      if (t.includes(q) || q.includes(t)) return node.id;
      if (node.children?.length) {
        const found = walk(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  return walk(GRAMMAR_TREE);
}

/** Small popover that floats below a grammar-point tag with 3 jump options. */
function GrammarPointPopover({ point, onPractice, onQuiz, onCourse, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleDown(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    function handleKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", handleDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="gm-point-popover" role="menu" aria-label={`${point.label} 的学习选项`}>
      <div className="gm-point-popover__arrow" />
      <p className="gm-point-popover__label">{point.label}</p>
      <div className="gm-point-popover__actions">
        <button type="button" className="gm-point-popover__btn" onClick={onCourse}>
          <AppIcon name="book-open" size={16} className="gm-point-popover__icon" />
          <span>语法精讲</span>
        </button>
        <button type="button" className="gm-point-popover__btn" onClick={onQuiz}>
          <AppIcon name="target" size={16} className="gm-point-popover__icon" />
          <span>在线测验</span>
        </button>
        <button type="button" className="gm-point-popover__btn" onClick={onPractice}>
          <AppIcon name="file-text" size={16} className="gm-point-popover__icon" />
          <span>生成题卷</span>
        </button>
      </div>
    </div>
  );
}

function GrammarLinkedLearning({ analysis, onNavigate }) {
  const grammarPoints = (analysis.detectedGrammarPoints || analysis.grammarPoints || []).map(normalizeGrammarPoint);
  const [openId, setOpenId] = useState(null);
  const closePopover = useCallback(() => setOpenId(null), []);

  function handleWorksheet(point) {
    try {
      sessionStorage.setItem("nestGrammarPracticeSeed", JSON.stringify({
        grammarPointId: point.id,
        grammarPointLabel: point.label,
        sentence: analysis.sentence,
      }));
    } catch { /* ignore */ }
    setOpenId(null);
    onNavigate?.("grammar-practice");
  }

  function handleQuiz(point) {
    try {
      sessionStorage.setItem("nestGrammarQuizSeed", JSON.stringify({
        grammarPointLabel: point.label,
      }));
    } catch { /* ignore */ }
    setOpenId(null);
    onNavigate?.("grammar-quiz");
  }

  function handleCourse(point) {
    const nodeId = findCourseNodeId(point.label);
    try {
      if (nodeId) {
        sessionStorage.setItem("nestGrammarCoursesSeed", JSON.stringify({ nodeId, label: point.label }));
      } else {
        sessionStorage.removeItem("nestGrammarCoursesSeed");
      }
    } catch { /* ignore */ }
    setOpenId(null);
    onNavigate?.("grammar-courses");
  }

  return (
    <ResultBlock title="联动学习">
      <div className="gm-linked-learning">
        <div>
          <p className="gm-linked-learning__eyebrow">按语法点深入学习</p>
          <h2>点击语法点，选择学习方式。</h2>
          <p>
            可跳转到语法精讲查看知识点讲解，或进入在线测验即学即练，也可以生成可打印题卷。
          </p>
        </div>
        <div className="gm-analysis-card__tags" aria-label="语法点" style={{ position: "relative" }}>
          {grammarPoints.map((point) => (
            <span key={point.id} style={{ position: "relative", display: "inline-block" }}>
              <button
                type="button"
                className={`gm-analysis-tag${openId === point.id ? " gm-analysis-tag--active" : ""}`}
                onClick={() => setOpenId(openId === point.id ? null : point.id)}
                title={point.groupLabel}
                aria-expanded={openId === point.id}
                aria-haspopup="menu"
              >
                {point.label}
                <span style={{ fontSize: "0.7em", marginLeft: 4, opacity: 0.6 }}>▾</span>
              </button>
              {openId === point.id && (
                <GrammarPointPopover
                  point={point}
                  onPractice={() => handleWorksheet(point)}
                  onQuiz={() => handleQuiz(point)}
                  onCourse={() => handleCourse(point)}
                  onClose={closePopover}
                />
              )}
            </span>
          ))}
        </div>
      </div>
    </ResultBlock>
  );
}

const SESSION_KEY = "nestGrammarAnalyzerState";

function loadSavedState() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

export default function GrammarAnalyzerPage({ onNavigate, user, onLoginClick, onRegisterClick, activePage = "grammar-analyzer", onAccountClick , hideTopBar = false}) {
  const pageRef = useScrollReveal();
  const resultRef = useRef(null);
  const saved = useRef(loadSavedState());
  const [sentence, setSentence] = useState(saved.current?.sentence ?? SAMPLE_SENTENCE);
  const [analysis, setAnalysis] = useState(saved.current?.analysis ?? null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [treeData, setTreeData] = useState(saved.current?.treeData ?? null);
  const [favoriteState, setFavoriteState] = useState("");

  useEffect(() => {
    if (!analysis || !resultRef.current) return;
    if (typeof resultRef.current.scrollIntoView !== "function") return;
    resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [analysis]);

  async function handleAnalyze(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    setTreeData(null);
    setFavoriteState("");

    try {
      const result = await grammarAPI.analyzeSentence({ sentence, includeTree: true });
      const { treeData: tree = null, ...analysisResult } = result || {};
      setAnalysis(analysisResult);
      setTreeData(tree);
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ sentence, analysis: analysisResult, treeData: tree }));
      } catch { /* ignore */ }
    } catch (err) {
      setAnalysis(null);
      setError(err?.message || "句子分析失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveFavorite() {
    if (!user?.id) {
      handleLogin();
      return;
    }
    if (!analysis?.sentence) return;
    setFavoriteState("saving");
    try {
      await grammarAPI.saveFavorite({
        title: "长难句分析",
        content: analysis.sentence,
        metadata: {
          sentenceType: analysis.sentenceType?.label || analysis.sentenceType || "",
          grammarPoints: (analysis.detectedGrammarPoints || analysis.grammarPoints || []).map((item) => item?.label || item?.id || item),
        },
      });
      setFavoriteState("saved");
    } catch {
      setFavoriteState("error");
    }
  }


  function handleLogin() {
    if (onLoginClick) {
      onLoginClick();
      return;
    }
    onNavigate?.("auth");
  }

  function handleRegister() {
    if (onRegisterClick) {
      onRegisterClick();
      return;
    }
    onNavigate?.("auth");
  }
  return (
    <div className="gm-page" ref={pageRef}>
      {!hideTopBar && <GrammarTopBar onLogin={handleLogin} onRegister={handleRegister} user={user} onNavigate={onNavigate} activePage={activePage} onAccountClick={onAccountClick} />}<main className="gm-analyzer-page">
        <PageHero
          eyebrow="筑巢语法 · 分析"
          title="剥开长句，读透结构。"
          description="输入英文句子，AI 逐层拆解主干与从句，树状图可视化每一层级关系。"
        />

        <form className="gm-analyzer-workspace studio-reveal studio-reveal--delay-1" aria-label="句子分析表单" onSubmit={handleAnalyze}>
          <label className="gm-analyzer-label" htmlFor="grammar-sentence">
            英文句子
          </label>
          <textarea
            id="grammar-sentence"
            className="gm-analyzer-input"
            value={sentence}
            onChange={(event) => setSentence(event.target.value)}
            placeholder="Paste an English sentence here..."
            rows={5}
          />
          {error ? <div className="gm-analyzer-error" role="alert">{error}</div> : null}
          <div className="gm-analyzer-actions">
            <button type="submit" className="gm-btn-primary" aria-label={loading ? "分析中" : "分析句子"} disabled={loading}>
              {loading ? "分析中..." : "分析句子"}
            </button>
          </div>
        </form>

        {analysis ? (
          <div className="gm-analyzer-results studio-revealed" ref={resultRef} aria-live="polite">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button type="button" className="gm-btn-secondary" aria-label={favoriteState === "saving" ? "收藏中" : favoriteState === "saved" ? "已收藏" : "收藏当前句子"} onClick={handleSaveFavorite} disabled={favoriteState === "saving"}>
                {favoriteState === "saving" ? "收藏中…" : favoriteState === "saved" ? "已收藏" : "收藏当前句子"}
              </button>
            </div>
              {treeData && (
                <section className="gm-analyzer-result-block gm-analyzer-result-block--tree">
                  <h2>句子成分树状图</h2>
                  <SentenceTree treeData={treeData} />
                </section>
              )}

            {analysis.translation && (
              <ResultBlock title="参考翻译">
                <p>{analysis.translation}</p>
              </ResultBlock>
            )}

            <GrammarLinkedLearning analysis={analysis} onNavigate={onNavigate} />

            <ResultBlock title="下一步练习">
              <ol className="gm-next-steps">
                {analysis.nextSteps?.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </ResultBlock>
          </div>
        ) : null}
      </main>
    </div>
  );
}
