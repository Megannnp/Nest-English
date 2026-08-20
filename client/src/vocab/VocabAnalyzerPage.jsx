/* eslint-disable complexity */
import { useState } from "react";

import VocabTopBar from "./VocabTopBar.jsx";
import { vocabularyAPI } from "../api/index.js";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./vocab.css";

const SAMPLE_WORD = "perseverance";

function ResultBlock({ title, children }) {
  return (
    <section className="gm-analyzer-result-block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function TagList({ items }) {
  if (!items?.length) return <p className="gm-analyzer-muted">暂无</p>;
  return (
    <div className="vc-analyzer-tags">
      {items.map((item) => <span key={item} className="vc-analyzer-tag">{item}</span>)}
    </div>
  );
}

export default function VocabAnalyzerPage({
  onNavigate, user, onLoginClick, onRegisterClick,
  activePage = "vocab-analyzer", onAccountClick, hideTopBar = false,
}) {
  const pageRef = useScrollReveal();
  const [word, setWord] = useState(SAMPLE_WORD);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [favoriteState, setFavoriteState] = useState("");

  function handleLogin() {
    if (onLoginClick) { onLoginClick(); return; }
    onNavigate?.("auth");
  }

  async function handleAnalyze(event) {
    event.preventDefault();
    if (!word.trim()) return;
    setError("");
    setLoading(true);
    setFavoriteState("");
    try {
      const result = await vocabularyAPI.analyzeWord(word.trim());
      setAnalysis(result);
    } catch (err) {
      setAnalysis(null);
      setError(err?.message || "单词分析失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveFavorite() {
    if (!user?.id) { handleLogin(); return; }
    if (!analysis?.word) return;
    setFavoriteState("saving");
    try {
      await vocabularyAPI.saveFavorite({
        title: analysis.definition,
        content: analysis.word,
        metadata: {
          section: "analyzer",
          pos: analysis.pos,
          phonetic: analysis.phonetic,
          example: analysis.examples?.[0] || "",
          tip: analysis.memoryTip,
        },
      });
      setFavoriteState("saved");
    } catch {
      setFavoriteState("error");
    }
  }

  return (
    <div className="vc-page" ref={pageRef}>
      {!hideTopBar && (
        <VocabTopBar
          onLogin={handleLogin}
          onRegister={onRegisterClick || (() => onNavigate?.("auth"))}
          user={user}
          onNavigate={onNavigate}
          activePage={activePage}
          onAccountClick={onAccountClick}
        />
      )}

      <main className="gm-analyzer-page">
        <PageHero
          eyebrow="筑巢词汇 · 分析"
          title="吃透一个词，从词根到语境。"
          description="输入任意英文单词或短语，AI 拆解词根词缀、搭配、例句和记忆技巧。"
        />

        <form className="gm-analyzer-workspace studio-reveal studio-reveal--delay-1" aria-label="单词分析表单" onSubmit={handleAnalyze}>
          <label className="gm-analyzer-label" htmlFor="vocab-word-input">
            英文单词或短语
          </label>
          <input
            id="vocab-word-input"
            type="text"
            className="gm-analyzer-input"
            value={word}
            onChange={(event) => setWord(event.target.value)}
            placeholder="e.g. perseverance"
            maxLength={80}
          />
          {error ? <div className="gm-analyzer-error" role="alert">{error}</div> : null}
          <div className="gm-analyzer-actions">
            <button type="submit" className="gm-btn-primary" aria-label={loading ? "分析中" : "分析单词"} disabled={loading}>
              {loading ? "分析中..." : "分析单词"}
            </button>
          </div>
        </form>

        {analysis ? (
          <div className="gm-analyzer-results studio-revealed" aria-live="polite">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <button type="button" className="gm-btn-secondary" aria-label={favoriteState === "saving" ? "收藏中" : favoriteState === "saved" ? "已收藏" : "收藏这个词"} onClick={handleSaveFavorite} disabled={favoriteState === "saving"}>
                {favoriteState === "saving" ? "收藏中…" : favoriteState === "saved" ? "已收藏" : "收藏这个词"}
              </button>
            </div>

            <ResultBlock title={`${analysis.word}${analysis.pos ? ` · ${analysis.pos}` : ""}${analysis.phonetic ? ` · ${analysis.phonetic}` : ""}`}>
              <p>{analysis.definition || "暂无释义"}</p>
            </ResultBlock>

            {analysis.etymology ? (
              <ResultBlock title="词根词缀 / 词源">
                <p className="gm-analyzer-explanation">{analysis.etymology}</p>
              </ResultBlock>
            ) : null}

            <ResultBlock title="常见搭配">
              <TagList items={analysis.collocations} />
            </ResultBlock>

            <ResultBlock title="例句">
              {analysis.examples?.length ? (
                <ul className="vc-analyzer-list">
                  {analysis.examples.map((example) => <li key={example}>{example}</li>)}
                </ul>
              ) : <p className="gm-analyzer-muted">暂无例句</p>}
            </ResultBlock>

            <ResultBlock title="近义词 / 反义词">
              <div className="vc-analyzer-syn-ant">
                <div>
                  <p className="vc-analyzer-syn-ant__label">近义词</p>
                  <TagList items={analysis.synonyms} />
                </div>
                <div>
                  <p className="vc-analyzer-syn-ant__label">反义词</p>
                  <TagList items={analysis.antonyms} />
                </div>
              </div>
            </ResultBlock>

            {analysis.memoryTip ? (
              <ResultBlock title="记忆技巧">
                <p className="gm-analyzer-explanation">💡 {analysis.memoryTip}</p>
              </ResultBlock>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
