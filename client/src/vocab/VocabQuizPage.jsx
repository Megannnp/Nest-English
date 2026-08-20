import { useEffect, useMemo, useState } from "react";

import useVocabContent from "./useVocabContent.js";
import VocabFlashcard from "./VocabFlashcard.jsx";
import VocabTopBar from "./VocabTopBar.jsx";
import { vocabularyAPI } from "../api/index.js";
import { getPrepExamSystemId } from "../app/prepExamConfig.js";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./vocab.css";

const OPTION_LETTERS = ["A", "B", "C", "D"];
const QUESTION_COUNT = 10;
const KNOWN_WORDS_STORAGE_KEY = "nest:vocab:knownWords:v1";
const IMPORTED_WORDS_STORAGE_KEY = "nest:vocab:importedWords:v1";

function readStoredKnownWords() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KNOWN_WORDS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

function storeKnownWords(knownWords) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KNOWN_WORDS_STORAGE_KEY, JSON.stringify([...knownWords]));
  } catch {
    // Storage failures should not interrupt the practice flow.
  }
}

function readImportedWords() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(IMPORTED_WORDS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.word) : [];
  } catch {
    return [];
  }
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function poolForSection(categories, categoryId) {
  const withCategory = (cat) => (cat.words || []).map((word) => ({ ...word, categoryId: cat.id }));
  if (categoryId === "all") return categories.flatMap(withCategory);
  const category = categories.find((cat) => cat.id === categoryId);
  return category ? withCategory(category) : [];
}

function knownKeyForWord(section, word, fallbackCategoryId) {
  const realCategoryId = section === "imported" ? "custom" : (word?.categoryId || fallbackCategoryId);
  return `${section}:${realCategoryId}:${word.word}`;
}

function buildQuestions(pool, count) {
  const sampleSize = Math.min(count, pool.length);
  const targets = shuffle(pool).slice(0, sampleSize);
  return targets.map((word, index) => {
    const seenZh = new Set([word.zh]);
    const distractorPool = pool.filter((w) => {
      if (w.word === word.word || seenZh.has(w.zh)) return false;
      seenZh.add(w.zh);
      return true;
    });
    const distractors = shuffle(distractorPool).slice(0, 3);
    const options = shuffle([word, ...distractors]).map((w, i) => ({
      letter: OPTION_LETTERS[i],
      zh: w.zh,
      isCorrect: w.word === word.word,
    }));
    return {
      id: `${word.word}-${index}`,
      word,
      options,
      correctLetter: options.find((o) => o.isCorrect).letter,
    };
  });
}

function SetupPhase({
  section,
  onSectionChange,
  categoryId,
  onCategoryChange,
  categories,
  importedCount,
  onStart,
  poolSize,
  mode,
  onModeChange,
}) {
  const minWords = mode === "quiz" ? 4 : 1;
  return (
    <div className="gm-analyzer-workspace studio-revealed">
      <label className="gm-analyzer-label">选择检测方式</label>
      <div className="vc-analyzer-tags" style={{ marginBottom: 16 }}>
        <button type="button" className={`vc-mode-btn${mode === "quiz" ? " vc-mode-btn--active" : ""}`} onClick={() => onModeChange("quiz")}>选择题</button>
        <button type="button" className={`vc-mode-btn${mode === "flashcard" ? " vc-mode-btn--active" : ""}`} onClick={() => onModeChange("flashcard")}>闪卡</button>
      </div>
      <label className="gm-analyzer-label">选择资源分组</label>
      <div className="vc-analyzer-tags" style={{ marginBottom: 16 }}>
        <button type="button" className={`vc-mode-btn${section === "reading" ? " vc-mode-btn--active" : ""}`} onClick={() => onSectionChange("reading")}>阅读词汇</button>
        <button type="button" className={`vc-mode-btn${section === "writing" ? " vc-mode-btn--active" : ""}`} onClick={() => onSectionChange("writing")}>写作词汇</button>
        <button type="button" className={`vc-mode-btn${section === "imported" ? " vc-mode-btn--active" : ""}`} onClick={() => onSectionChange("imported")}>我的导入（{importedCount}）</button>
      </div>
      <label className="gm-analyzer-label">选择分类</label>
      <div className="vc-analyzer-tags" style={{ marginBottom: 16 }}>
        <button type="button" className={`vc-mode-btn${categoryId === "all" ? " vc-mode-btn--active" : ""}`} onClick={() => onCategoryChange("all")}>全部</button>
        {categories.map((cat) => (
          <button key={cat.id} type="button" className={`vc-mode-btn${categoryId === cat.id ? " vc-mode-btn--active" : ""}`} onClick={() => onCategoryChange(cat.id)}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>
      <div className="gm-analyzer-actions">
        <button type="button" className="gm-btn-primary" onClick={onStart} disabled={poolSize < minWords}>
          {mode === "quiz" ? `开始选择题（${Math.min(QUESTION_COUNT, poolSize)} 题）` : `开始闪卡（${Math.min(QUESTION_COUNT, poolSize)} 词）`}
        </button>
      </div>
      {poolSize < minWords ? <p className="gm-analyzer-muted">该分类词量不足，无法开始检测，请换一个分类。</p> : null}
    </div>
  );
}

function RecordStateMessage({ recordStatus, recordError, user, onLoginClick }) {
  if (recordStatus === "saving") return <p className="gm-analyzer-muted">正在保存练习记录…</p>;
  if (recordStatus === "saved") return <p className="gm-analyzer-muted">练习记录已保存，成长页会自动更新。</p>;
  if (recordStatus === "error") {
    return (
      <div className="gm-quiz-error-msg" role="alert">
        <p>{recordError || "练习记录保存失败，词汇成长页可能暂未更新。"}</p>
      </div>
    );
  }
  if (!user?.id) {
    return (
      <p className="gm-analyzer-muted">
        当前以游客身份练习，本次成绩不会保存。
        <button type="button" className="gm-quiz-result__login-link" onClick={onLoginClick}>登录后可自动保存记录并在成长页查看进度</button>
      </p>
    );
  }
  return null;
}

function FlashcardPhase({ words, index, knownCount, recordStatus, recordError, user, onLoginClick, onKnow, onReview, onRestart }) {
  const current = words[index];
  if (!current) {
    const reviewCount = Math.max(0, words.length - knownCount);
    return (
      <div className="vc-course-quiz studio-revealed">
        <div className="vc-flash-done">
          <div className="vc-flash-done__title">本组闪卡已完成</div>
          <div className="vc-flash-done__sub">本次标记认识 {knownCount} / {words.length} 词</div>
          <RecordStateMessage recordStatus={recordStatus} recordError={recordError} user={user} onLoginClick={onLoginClick} />
          <div className="gm-analysis-card">
            <div className="gm-analysis-card__title">下一步建议</div>
            <div className="gm-analysis-card__explanation">
              {reviewCount > 0 ? `先复习 ${reviewCount} 个待巩固词，再换一组检测。` : "本组都已认识，建议换一个分类继续扩词。"}
            </div>
          </div>
          <button type="button" className="vc-course-quiz__btn vc-course-quiz__btn--primary" onClick={onRestart}>再选一组</button>
        </div>
      </div>
    );
  }

  return (
    <div className="vc-course-quiz studio-revealed">
      <div className="vc-course-quiz__header">
        <span className="vc-course-quiz__label">闪卡检测</span>
        <span className="vc-course-quiz__count">{index + 1} / {words.length}</span>
      </div>
      <div className="vc-course-quiz__progress">
        {words.map((word, i) => (
          <div key={`${word.word}-${i}`} className={`vc-course-quiz__dot ${i < index ? "done" : ""} ${i === index ? "current" : ""}`} />
        ))}
      </div>
      <VocabFlashcard key={`${current.word}-${index}`} word={current} onKnow={onKnow} onReview={onReview} />
    </div>
  );
}

function QuizPhase({ questions, index, onAnswer, answers, onNext }) {
  const current = questions[index];
  const answered = answers[current.id];
  const isLast = index === questions.length - 1;

  return (
    <div className="vc-course-quiz studio-revealed">
      <div className="vc-course-quiz__header">
        <span className="vc-course-quiz__label">词汇检测 · 选择题</span>
        <span className="vc-course-quiz__count">{index + 1} / {questions.length}</span>
      </div>
      <div className="vc-course-quiz__progress">
        {questions.map((q, i) => (
          <div key={q.id} className={`vc-course-quiz__dot ${answers[q.id] === q.correctLetter ? "correct" : ""} ${answers[q.id] && answers[q.id] !== q.correctLetter ? "wrong" : ""} ${i === index ? "current" : ""} ${i < index ? "done" : ""}`} />
        ))}
      </div>
      <p className="vc-course-quiz__question">{current.word.word} <span className="gm-analyzer-muted">{current.word.pos}</span></p>
      <div className="vc-course-quiz__options">
        {current.options.map((opt) => {
          const selected = answered === opt.letter;
          const isAnswer = answered && opt.isCorrect;
          const isWrong = answered && selected && !opt.isCorrect;
          return (
            <button
              key={opt.letter}
              type="button"
              className={`vc-course-quiz__option ${selected ? "selected" : ""} ${isAnswer ? "answer" : ""} ${isWrong ? "wrong" : ""}`}
              onClick={() => !answered && onAnswer(current.id, opt.letter)}
              disabled={!!answered}
            >
              {opt.letter}. {opt.zh}
            </button>
          );
        })}
      </div>
      {answered && (
        <div className="gm-analysis-card">
          <div className="gm-analysis-card__title">例句</div>
          <div className="gm-analysis-card__explanation">{current.word.example}</div>
          {current.word.tip ? <div className="gm-analysis-card__explanation">💡 {current.word.tip}</div> : null}
        </div>
      )}
      {answered && (
        <div className="vc-course-quiz__actions">
          <button type="button" className="vc-course-quiz__btn vc-course-quiz__btn--primary" aria-label={isLast ? "查看结果" : "下一题"} onClick={onNext}>
            {isLast ? "查看结果" : "下一题 →"}
          </button>
        </div>
      )}
    </div>
  );
}

function ResultPhase({ correctCount, total, wrongWords, recordStatus, recordError, user, onLoginClick, onRestart, onReviewWrongWords }) {
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const wrongCount = Math.max(0, total - correctCount);
  const actionsDisabled = recordStatus === "saving";
  return (
    <div className="vc-course-quiz studio-revealed">
      <div className="vc-course-quiz__result">
        <span className="vc-course-quiz__result-score">答对 {correctCount} / {total} 题 · 正确率 {accuracy}%</span>
        <RecordStateMessage recordStatus={recordStatus} recordError={recordError} user={user} onLoginClick={onLoginClick} />
        <div className="gm-analysis-card">
          <div className="gm-analysis-card__title">主要问题</div>
          <div className="gm-analysis-card__explanation">
            {wrongCount > 0 ? `本组有 ${wrongCount} 个词义辨析需要回看例句和提示。` : "本组词义选择稳定，可以换分类继续检测。"}
          </div>
          <div className="gm-analysis-card__explanation">
            下一步：先把错词加入闪卡复习，再回到同分类测一组。
          </div>
        </div>
        {wrongWords.length > 0 ? (
          <button type="button" className="vc-course-quiz__btn vc-course-quiz__btn--primary" onClick={onReviewWrongWords} disabled={actionsDisabled}>复习错词闪卡</button>
        ) : null}
        <button type="button" className="vc-course-quiz__btn vc-course-quiz__btn--primary" onClick={onRestart} disabled={actionsDisabled}>再测一组</button>
      </div>
    </div>
  );
}

export default function VocabQuizPage({
  onNavigate, user, onLoginClick, onRegisterClick,
  activePage = "vocab-quiz", onAccountClick,
  prepExamId = "",
  hideTopBar = false,
}) {
  const pageRef = useScrollReveal();
  const systemId = getPrepExamSystemId(prepExamId);
  const { readingCategories, writingCategories } = useVocabContent({ systemId });
  const [importedWords, setImportedWords] = useState(() => readImportedWords());
  const [section, setSection] = useState("reading");
  const [categoryId, setCategoryId] = useState("all");
  const [mode, setMode] = useState("quiz");
  const [phase, setPhase] = useState("setup");
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flashWords, setFlashWords] = useState([]);
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashKnownCount, setFlashKnownCount] = useState(0);
  const [knownWords, setKnownWords] = useState(() => readStoredKnownWords());
  const [recordStatus, setRecordStatus] = useState("idle");
  const [recordError, setRecordError] = useState("");

  useEffect(() => {
    storeKnownWords(knownWords);
  }, [knownWords]);

  useEffect(() => {
    const refreshImportedWords = () => setImportedWords(readImportedWords());
    window.addEventListener?.("storage", refreshImportedWords);
    return () => window.removeEventListener?.("storage", refreshImportedWords);
  }, []);

  const importedCategories = useMemo(() => [{
    id: "custom",
    label: "我的导入",
    desc: "来自词汇资源页的自定义词库",
    icon: "＋",
    words: importedWords,
  }], [importedWords]);
  const categories = section === "writing" ? writingCategories : section === "imported" ? importedCategories : readingCategories;
  const pool = useMemo(() => poolForSection(categories, categoryId), [categories, categoryId]);

  function handleSectionChange(next) {
    setSection(next);
    setCategoryId("all");
  }

  function handleStart() {
    setRecordStatus("idle");
    setRecordError("");
    if (mode === "flashcard") {
      setFlashWords(shuffle(pool).slice(0, Math.min(QUESTION_COUNT, pool.length)));
      setFlashIndex(0);
      setFlashKnownCount(0);
      setPhase("flashcard");
      return;
    }
    setQuestions(buildQuestions(pool, QUESTION_COUNT));
    setAnswers({});
    setIndex(0);
    setPhase("quiz");
  }

  function handleAnswer(qId, letter) {
    setAnswers((prev) => ({ ...prev, [qId]: letter }));
  }

  function handleNext() {
    if (index >= questions.length - 1) {
      const correctCount = questions.filter((q) => answers[q.id] === q.correctLetter).length;
      const total = questions.length;
      const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
      if (user?.id) {
        setRecordStatus("saving");
        setRecordError("");
        vocabularyAPI.recordProgress({
          activityType: "quiz",
          score: accuracy,
          accuracy,
          metadata: { section, categoryId, correctCount, totalCount: total, prepExamId, systemId },
        })
          .then(() => setRecordStatus("saved"))
          .catch((error) => {
            setRecordStatus("error");
            setRecordError(error?.message || "练习记录保存失败，词汇成长页可能暂未更新。");
          });
      } else {
        setRecordStatus("idle");
        setRecordError("");
      }
      setPhase("result");
    } else {
      setIndex((i) => i + 1);
    }
  }

  function handleRestart() {
    setPhase("setup");
    setRecordStatus("idle");
    setRecordError("");
  }

  function handleReviewWrongWords() {
    const wrongWords = questions
      .filter((q) => answers[q.id] !== q.correctLetter)
      .map((q) => q.word);
    if (!wrongWords.length) return;
    setFlashWords(wrongWords);
    setFlashIndex(0);
    setFlashKnownCount(0);
    setRecordStatus("idle");
    setRecordError("");
    setPhase("flashcard");
  }

  function finishFlashcard(nextKnownCount) {
    if (user?.id) {
      setRecordStatus("saving");
      setRecordError("");
      vocabularyAPI.recordProgress({
        activityType: "flashcard",
        score: flashWords.length ? Math.round((nextKnownCount / flashWords.length) * 100) : 0,
        accuracy: flashWords.length ? Math.round((nextKnownCount / flashWords.length) * 100) : 0,
        metadata: { section, categoryId, completedCount: nextKnownCount, totalCount: flashWords.length, prepExamId, systemId },
      })
        .then(() => setRecordStatus("saved"))
        .catch((error) => {
          setRecordStatus("error");
          setRecordError(error?.message || "练习记录保存失败，词汇成长页可能暂未更新。");
        });
    } else {
      setRecordStatus("idle");
      setRecordError("");
    }
    setFlashIndex(flashWords.length);
  }

  function advanceFlashcard(markKnown) {
    const current = flashWords[flashIndex];
    const nextKnownCount = flashKnownCount + (markKnown ? 1 : 0);
    if (markKnown && current) {
      setKnownWords((prev) => {
        const next = new Set(prev);
        next.add(knownKeyForWord(section, current, categoryId));
        return next;
      });
      setFlashKnownCount(nextKnownCount);
    }
    if (flashIndex >= flashWords.length - 1) finishFlashcard(nextKnownCount);
    else setFlashIndex((value) => value + 1);
  }

  const correctCount = questions.filter((q) => answers[q.id] === q.correctLetter).length;
  const wrongWords = questions.filter((q) => answers[q.id] !== q.correctLetter).map((q) => q.word);

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

      <main className="gm-analyzer-page">
        <PageHero
          eyebrow="筑巢词汇 · 测验"
          title="选择检测方式，检验掌握程度。"
          description="从词库中随机抽取单词，用选择题或闪卡方式检测记忆与理解。"
        />

        {phase === "setup" && (
          <SetupPhase
            section={section}
            onSectionChange={handleSectionChange}
            categoryId={categoryId}
            onCategoryChange={setCategoryId}
            categories={categories}
            importedCount={importedWords.length}
            onStart={handleStart}
            poolSize={pool.length}
            mode={mode}
            onModeChange={setMode}
          />
        )}

        {phase === "quiz" && questions.length > 0 && (
          <QuizPhase questions={questions} index={index} answers={answers} onAnswer={handleAnswer} onNext={handleNext} />
        )}

        {phase === "flashcard" && (
          <FlashcardPhase
            words={flashWords}
            index={flashIndex}
            knownCount={flashKnownCount}
            recordStatus={recordStatus}
            recordError={recordError}
            user={user}
            onLoginClick={onLoginClick || (() => onNavigate?.("auth"))}
            onKnow={() => advanceFlashcard(true)}
            onReview={() => advanceFlashcard(false)}
            onRestart={handleRestart}
          />
        )}

        {phase === "result" && (
          <ResultPhase
            correctCount={correctCount}
            total={questions.length}
            wrongWords={wrongWords}
            recordStatus={recordStatus}
            recordError={recordError}
            user={user}
            onLoginClick={onLoginClick || (() => onNavigate?.("auth"))}
            onRestart={handleRestart}
            onReviewWrongWords={handleReviewWrongWords}
          />
        )}
      </main>
    </div>
  );
}
