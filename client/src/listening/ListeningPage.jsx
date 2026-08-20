import { useEffect, useRef, useState } from "react";

import {
  DiffDisplay,
  PairCard,
  PassageView,
  PlayBtn,
  SentenceCard,
  SpeechSupportNotice,
  WordCard,
  elapsedSince,
  normalize,
  recordListeningProgress,
  sample,
} from "./ListeningExerciseParts.jsx";
import ListeningTopBar from "./ListeningTopBar.jsx";
import ListeningTrainingHero from "./ListeningTrainingHero.jsx";
import {
  LISTENING_MINIMAL_PAIRS as ALL_MINIMAL_PAIRS,
  LISTENING_WORD_ITEMS as ALL_WORD_ITEMS,
  LISTENING_SENTENCE_ITEMS as ALL_SENTENCE_ITEMS,
  LISTENING_PASSAGES as ALL_PASSAGES,
  LISTENING_SCENARIOS_BY_STAGE as SCENARIOS_BY_STAGE,
  buildListeningStaticCatalog,
} from "../../../shared/listening/listeningContentCatalog.js";
import { listeningAPI } from "../api/index.js";
import { getPrepExamSystemId } from "../app/prepExamConfig.js";
import ModuleHomeGrid from "../components/shared/ModuleHomeGrid.jsx";
import useDictionaryAudio from "../hooks/useDictionaryAudio.js";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./listening.css";

function defaultListeningContent() {
  return buildListeningStaticCatalog();
}

function normalizeListeningContent(content) {
  const fallback = defaultListeningContent();
  if (!content || typeof content !== "object") return fallback;
  return {
    minimalPairs: Array.isArray(content.minimalPairs) && content.minimalPairs.length ? content.minimalPairs : fallback.minimalPairs,
    wordItems: Array.isArray(content.wordItems) && content.wordItems.length ? content.wordItems : fallback.wordItems,
    sentenceItems: Array.isArray(content.sentenceItems) && content.sentenceItems.length ? content.sentenceItems : fallback.sentenceItems,
    passages: Array.isArray(content.passages) && content.passages.length ? content.passages : fallback.passages,
    scenariosByStage: content.scenariosByStage && typeof content.scenariosByStage === "object" ? content.scenariosByStage : fallback.scenariosByStage,
  };
}

/* ── PracticeTest sub-components ───────────────────────────────── */
function PracticeChoiceSection({ scenario, choices, submitted, score, choose, submit }) {
  return (
    <section className="ls-mc-section">
      <div className="ls-section-title">选择题</div>
      {scenario.questions.map((q, qi) => (
        <div key={qi} className="ls-mc-question">
          <div className="ls-mc-stem">{qi + 1}. {q.stem}</div>
          <div className="ls-mc-options">
            {q.opts.map((opt, oi) => {
              const selected = choices[qi] === oi;
              const isCorrect = oi === q.answer;
              let cls = "ls-mc-opt";
              if (selected && !submitted) cls += " is-selected";
              if (submitted && isCorrect) cls += " is-correct";
              if (submitted && selected && !isCorrect) cls += " is-wrong";
              return (
                <button key={oi} type="button" className={cls} onClick={() => choose(qi, oi)}>
                  <span className="ls-mc-letter">{["A","B","C","D"][oi]}</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!submitted && (
        <button
          type="button"
          className="ls-submit-btn"
          onClick={submit}
          disabled={choices.some(c => c === null)}
        >
          提交答案
        </button>
      )}
      {submitted && (
        <div className="ls-score-banner">
          得分 {score} / {scenario.questions.length} &nbsp;·&nbsp;
          {score === scenario.questions.length ? "全部正确！" : "部分有误，请重听。"}
        </div>
      )}
    </section>
  );
}

function PracticeDictationSection({
  scenario, dictValue, dictRevealed, onDictChange, onToggleReveal,
  playingKey, play,
}) {
  return (
    <section className="ls-dict-section">
      <div className="ls-section-title">听写</div>
      <p className="ls-dict-prompt">再听一次音频，写下以下句子。</p>
      <div className="ls-sent-controls">
        <PlayBtn id={`${scenario.id}-dict`}      text={scenario.dictation} audioUrl={scenario.dictationAudioUrl} rate={0.8}  label="播放" playingKey={playingKey} play={play} />
        <PlayBtn id={`${scenario.id}-dict-slow`} text={scenario.dictation} audioUrl={scenario.dictationAudioUrl} rate={0.65} label="慢速"   playingKey={playingKey} play={play} className="ls-play-btn--slow" />
      </div>
      <textarea
        className="ls-sent-textarea"
        aria-label="模拟听力句子听写输入"
        rows={2}
        value={dictValue}
        onChange={onDictChange}
        placeholder="输入你听到的句子…"
        spellCheck={false}
      />
      <div className="ls-sent-footer">
        <button
          type="button"
          className="ls-link-btn"
          aria-label={dictRevealed ? "隐藏答案" : "核对答案"}
          onClick={onToggleReveal}
        >
          {dictRevealed ? "隐藏答案" : "核对答案"}
        </button>
      </div>
      {dictRevealed && <DiffDisplay input={dictValue} correct={scenario.dictation} />}
    </section>
  );
}

/* ── PracticeTest ──────────────────────────────────────────────── */
function PracticeTest({ user, content, metadataContext = null }) {
  const { playingKey, play, unsupported } = useDictionaryAudio();
  const scenarioCatalog = content.scenariosByStage || SCENARIOS_BY_STAGE;
  const stages = Object.keys(scenarioCatalog).length ? Object.keys(scenarioCatalog) : ["初中", "高中", "四六级"];
  const [stageIdx, setStageIdx] = useState(0);
  const [scenario, setScenario] = useState(null);
  const [usedIds, setUsedIds] = useState({ "初中": [], "高中": [], "四六级": [] });
  const [choices, setChoices] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [dictValue, setDictValue] = useState("");
  const [dictRevealed, setDictRevealed] = useState(false);
  const startedAtRef = useRef(Date.now());
  const dictRecordedRef = useRef(false);

  function generate() {
    const stage = stages[stageIdx];
    const pool = scenarioCatalog[stage] || [];
    if (!pool.length) return;
    const used = usedIds[stage] || [];
    const available = pool.filter(s => !used.includes(s.id));
    const src = available.length > 0 ? available : pool;
    const pick = src[Math.floor(Math.random() * src.length)];

    setScenario(pick);
    setChoices(Array(pick.questions.length).fill(null));
    setSubmitted(false);
    setDictValue("");
    setDictRevealed(false);
    dictRecordedRef.current = false;
    startedAtRef.current = Date.now();
    setUsedIds(prev => ({
      ...prev,
      [stage]: available.length > 0 ? [...used, pick.id] : [pick.id],
    }));
  }

  function choose(qi, oi) {
    if (submitted) return;
    setChoices(prev => prev.map((x, i) => i === qi ? oi : x));
  }

  function submit() {
    if (submitted || choices.some(c => c === null)) return;
    const correctCount = choices.filter((c, i) => c === scenario.questions[i].answer).length;
    const totalCount = scenario.questions.length;
    const nextScore = Math.round((correctCount / totalCount) * 100);
    setSubmitted(true);
    recordListeningProgress(user, {
      activityType: "practice",
      score: nextScore,
      accuracy: nextScore,
      durationMs: elapsedSince(startedAtRef),
      metadata: {
        scenarioId: scenario?.id,
        stage: scenario?.stage,
        topic: scenario?.topic,
        correctCount,
        totalCount,
        answers: choices,
        answerKey: scenario.questions.map(q => q.answer),
      },
    }, metadataContext);
  }

  function toggleDictationReveal() {
    const nextRevealed = !dictRevealed;
    setDictRevealed(nextRevealed);
    if (!nextRevealed || !scenario || !dictValue.trim() || dictRecordedRef.current) return;

    const ok = normalize(dictValue) === normalize(scenario.dictation);
    dictRecordedRef.current = true;
    recordListeningProgress(user, {
      activityType: "practice-dictation",
      score: ok ? 100 : 0,
      accuracy: ok ? 100 : 0,
      durationMs: elapsedSince(startedAtRef),
      metadata: {
        scenarioId: scenario.id,
        stage: scenario.stage,
        topic: scenario.topic,
        input: dictValue.trim().slice(0, 160),
        dictation: scenario.dictation.slice(0, 160),
      },
    }, metadataContext);
  }

  const score = submitted
    ? choices.filter((c, i) => c === scenario.questions[i].answer).length
    : 0;

  return (
    <div className="ls-practice-page">
      <section className="ls-practice-settings">
        <div className="ls-practice-settings-title">选择难度</div>
        <div className="ls-stage-tabs">
          {stages.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`ls-stage-tab${stageIdx === i ? " is-active" : ""}`}
              aria-label={`选择${s}难度`}
              onClick={() => setStageIdx(i)}
            >{s}</button>
          ))}
        </div>
        <button
          type="button"
          className="ls-generate-btn"
          aria-label={scenario ? "换一题" : "生成练习"}
          onClick={generate}
        >
          {scenario ? "换一题" : "生成练习"}
        </button>
      </section>
      {unsupported && <SpeechSupportNotice />}

      {!scenario && (
        <div className="ls-practice-placeholder">
          <div className="ls-practice-placeholder-icon">🎧</div>
          <p>选择难度后点击「生成练习」，即可获得听力音频与题目。</p>
        </div>
      )}

      {scenario && (
        <>
          <section className="ls-scenario-card">
            <div className="ls-scenario-hd">
              <span className="ls-scenario-label">{scenario.stage} · {scenario.topic}</span>
              <div className="ls-scenario-btns">
                <PlayBtn id={`${scenario.id}-audio`}      text={scenario.audio} audioUrl={scenario.audioUrl} rate={0.8}  label="播放音频" playingKey={playingKey} play={play} />
                <PlayBtn id={`${scenario.id}-audio-slow`} text={scenario.audio} audioUrl={scenario.audioUrl} rate={0.72} label="慢速"       playingKey={playingKey} play={play} className="ls-play-btn--slow" />
              </div>
            </div>
            <p className="ls-scenario-desc">先听音频，再完成以下选择题。可多次播放。</p>
          </section>

          <PracticeChoiceSection
            scenario={scenario}
            choices={choices}
            submitted={submitted}
            score={score}
            choose={choose}
            submit={submit}
          />

          <PracticeDictationSection
            scenario={scenario}
            dictValue={dictValue}
            dictRevealed={dictRevealed}
            onDictChange={e => {
              if (dictRecordedRef.current) startedAtRef.current = Date.now();
              setDictValue(e.target.value);
              setDictRevealed(false);
              dictRecordedRef.current = false;
            }}
            onToggleReveal={toggleDictationReveal}
            playingKey={playingKey}
            play={play}
          />
        </>
      )}
    </div>
  );
}

/* ── Page: basics ──────────────────────────────────────────────── */
function ListeningBasics({ user, content, metadataContext = null }) {
  const { playingKey, play, unsupported } = useDictionaryAudio();
  const [pairsKey, setPairsKey] = useState(0);
  const [wordsKey, setWordsKey] = useState(0);
  const [sentsKey, setSentsKey] = useState(0);
  const pairItems = content.minimalPairs || ALL_MINIMAL_PAIRS;
  const wordItems = content.wordItems || ALL_WORD_ITEMS;
  const sentenceItems = content.sentenceItems || ALL_SENTENCE_ITEMS;
  const [pairs, setPairs] = useState(() => sample(pairItems, 6));
  const [words, setWords] = useState(() => sample(wordItems, 5));
  const [sents, setSents] = useState(() => sample(sentenceItems, 4));

  useEffect(() => { setPairs(sample(pairItems, 6)); setPairsKey(k => k + 1); }, [pairItems]);
  useEffect(() => { setWords(sample(wordItems, 5)); setWordsKey(k => k + 1); }, [wordItems]);
  useEffect(() => { setSents(sample(sentenceItems, 4)); setSentsKey(k => k + 1); }, [sentenceItems]);

  function shufflePairs() { setPairs(sample(pairItems, 6));    setPairsKey(k => k + 1); }
  function shuffleWords() { setWords(sample(wordItems, 5));       setWordsKey(k => k + 1); }
  function shuffleSents() { setSents(sample(sentenceItems, 4));   setSentsKey(k => k + 1); }

  return (
    <div className="ls-basics-page">
      {unsupported && <SpeechSupportNotice />}
      <section className="ls-section">
        <div className="ls-section-hd">
          <div className="ls-section-hd-row">
            <h2 className="ls-section-title">音素辨音</h2>
            <button type="button" className="ls-shuffle-btn" onClick={shufflePairs}>换一批</button>
          </div>
          <p className="ls-section-desc">每对单词仅有一个音素不同 · 点击播放后选出你听到的那个词</p>
        </div>
        <div className="ls-pairs-grid">
          {pairs.map(item => (
            <PairCard key={`${pairsKey}-${item.pair[0]}-${item.pair[1]}`} item={item} play={play} user={user} metadataContext={metadataContext} />
          ))}
        </div>
      </section>

      <section className="ls-section">
        <div className="ls-section-hd">
          <div className="ls-section-hd-row">
            <h2 className="ls-section-title">词汇听写</h2>
            <button type="button" className="ls-shuffle-btn" onClick={shuffleWords}>换一批</button>
          </div>
          <p className="ls-section-desc">听后拼写单词，按回车或「核对」确认</p>
        </div>
        <div className="ls-words-grid">
          {words.map(item => (
            <WordCard key={`${wordsKey}-${item.word}`} item={item} playingKey={playingKey} play={play} user={user} metadataContext={metadataContext} />
          ))}
        </div>
      </section>

      <section className="ls-section">
        <div className="ls-section-hd">
          <div className="ls-section-hd-row">
            <h2 className="ls-section-title">句子听写</h2>
            <button type="button" className="ls-shuffle-btn" onClick={shuffleSents}>换一批</button>
          </div>
          <p className="ls-section-desc">完整听写句子，可使用慢速模式辅助</p>
        </div>
        <div className="ls-sents-list">
          {sents.map(item => (
            <SentenceCard key={`${sentsKey}-${item.text.slice(0, 10)}`} item={item} playingKey={playingKey} play={play} user={user} metadataContext={metadataContext} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Page: advanced ────────────────────────────────────────────── */
function ListeningAdvanced({ user, content, metadataContext = null }) {
  const { playingKey, play, unsupported } = useDictionaryAudio();
  const [passageIdx, setPassageIdx] = useState(0);
  const passages = content.passages || ALL_PASSAGES;
  const passage = passages[passageIdx] || passages[0] || ALL_PASSAGES[0];

  useEffect(() => {
    if (passageIdx >= passages.length) setPassageIdx(0);
  }, [passageIdx, passages.length]);

  return (
    <div className="ls-advanced-page">
      {unsupported && <SpeechSupportNotice />}
      <div className="ls-passage-tabs">
        {passages.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={`ls-passage-tab${passageIdx === i ? " is-active" : ""}`}
            aria-label={`选择精听篇章：${p.title}`}
            onClick={() => setPassageIdx(i)}
          >
            <span className="ls-passage-tab-title">{p.title}</span>
            <span className="ls-passage-tab-level">{p.level}</span>
          </button>
        ))}
      </div>
      <div className="ls-advanced-desc">
        按句精听：先播放全文建立整体印象，再逐句播放并听写；完成后点击「核对」对照原文。
      </div>
      <PassageView key={passage.id} passage={passage} playingKey={playingKey} play={play} user={user} metadataContext={metadataContext} />
    </div>
  );
}

/* ── 模块首页入口卡（仅用于 listening-basics 首页） ─────────────── */
const LISTENING_HOME_ENTRIES = [
  { label: "基础听辨", page: "listening-basics", desc: "辨音、词汇听写与句子听写" },
  { label: "精听听写", page: "listening-advanced", desc: "逐句精听，把理解落到文字" },
  { label: "真题练习", page: "listening-practice", desc: "按学段生成模拟题与听写" },
  { label: "练习记录", page: "listening-progress", desc: "查看听读成长与统计" },
];

/* ── Main export ───────────────────────────────────────────────── */
export default function ListeningPage({
  onNavigate, user, onLoginClick, onRegisterClick, activePage = "listening-basics", onAccountClick,
  prepExamId = "",
  hideTopBar = false}) {
  const pageRef = useScrollReveal();
  const [remoteContent, setRemoteContent] = useState(null);
  const [recordError, setRecordError] = useState("");
  const content = normalizeListeningContent(remoteContent);
  const systemId = getPrepExamSystemId(prepExamId);
  const metadataContext = { prepExamId, systemId };

  useEffect(() => {
    let alive = true;
    listeningAPI.content({ systemId })
      .then((data) => { if (alive) setRemoteContent(data); })
      .catch(() => { if (alive) setRemoteContent(null); });
    return () => { alive = false; };
  }, [systemId]);

  useEffect(() => {
    function handleRecordFailed(event) {
      setRecordError(event?.detail || "练习记录保存失败，听读成长页可能暂未更新。");
    }
    window.addEventListener?.("nest:listening-record-failed", handleRecordFailed);
    return () => window.removeEventListener?.("nest:listening-record-failed", handleRecordFailed);
  }, []);

  const page = activePage === "listening-advanced" ? <ListeningAdvanced user={user} content={content} metadataContext={metadataContext} />
    : activePage === "listening-practice" ? <PracticeTest user={user} content={content} metadataContext={metadataContext} />
    : <ListeningBasics user={user} content={content} metadataContext={metadataContext} />;

  return (
    <div className="ls-page" ref={pageRef}>
      {!hideTopBar && (

        <ListeningTopBar
        onLogin={onLoginClick || (() => onNavigate?.("auth"))}
        onRegister={onRegisterClick || (() => onNavigate?.("auth"))}
        user={user}
        onNavigate={onNavigate}
        activePage={activePage}
        onAccountClick={onAccountClick}
      />

      )}
      <main className="ls-main">
        <ListeningTrainingHero activePage={activePage} />
        {activePage === "listening-basics" && (
          <ModuleHomeGrid
            module={{ label: "筑巢听读", dot: "#3a3220", border: "rgba(200, 175, 80, 0.22)" }}
            onNavigate={onNavigate}
            title="筑巢听读"
            intro="从辨音、听写到精听、模拟，建立可逐渐进阶的听力训练路径。"
            entries={LISTENING_HOME_ENTRIES}
            primaryEntry="listening-basics"
            primaryLabel="开始听写练习"
          />
        )}
        {recordError ? (
          <div className="gm-quiz-error-msg" role="alert">
            <p>{recordError}</p>
          </div>
        ) : null}
        <div className="ls-training-anchor">{page}</div>
      </main>
    </div>
  );
}
