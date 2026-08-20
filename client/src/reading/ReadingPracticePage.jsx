import { useEffect, useMemo, useRef, useState } from "react";

import ReadingTopBar from "./ReadingTopBar.jsx";
import {
  getPassagesByCount,
  getPassagesByGenre,
  getPaperByTypes,
  getQuestionsByType,
  extractParagraphs,
  READING_PASSAGE_BANK,
  READING_QUESTION_TYPES,
} from "../../../shared/reading/readingPassageBank.js";
import { moduleAssignmentsAPI, readingAPI } from "../api/index.js";
import { getPrepExamSystemId } from "../app/prepExamConfig.js";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import { clearModuleTaskContext, readModuleTaskContext } from "../utils/moduleTaskContext.js";
import "./reading.css";

const PRACTICE_MODE_STORAGE_KEY = "nest_reading_practice_mode";

/* ── Type badge ─────────────────────────────────────── */
function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function scrollToTop() {
  window.scrollTo?.({ top: 0, behavior: 'smooth' });
}

function readReadingModuleTask() {
  return readModuleTaskContext('reading-practice');
}

function toWrongItem(item) {
  return {
    passageId: item.passageId,
    source: item.source,
    questionIndex: item.questionIndex,
    questionType: item.questionType,
    stem: item.stem,
    selected: item.selected,
    answer: item.answer,
  };
}

function buildPracticePayload({ mode, genre = null, questionType = null, answers, durationMs = null }) {
  return {
    mode,
    ...(genre ? { genre } : {}),
    ...(questionType ? { questionType } : {}),
    passageIds: [...new Set(answers.map((item) => item?.passageId).filter(Boolean))],
    correctCount: answers.filter((item) => item?.correct).length,
    totalCount: answers.length,
    answers,
    wrongItems: answers.filter((item) => !item?.correct).map(toWrongItem),
    durationMs,
  };
}

function readInitialPracticeMode() {
  try {
    const mode = sessionStorage.getItem(PRACTICE_MODE_STORAGE_KEY);
    sessionStorage.removeItem(PRACTICE_MODE_STORAGE_KEY);
    return mode === 'review' ? 'review' : null;
  } catch {
    return null;
  }
}

function TypeBadge({ type }) {
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700,
      background: 'rgba(26,122,110,0.12)', color: '#1a7a6e', flexShrink: 0,
    }}>
      {type}
    </span>
  );
}

/* ── Evidence keyword highlighting ──────────────────── */

function highlightKeywords(text, keywords) {
  if (!keywords || !keywords.length || !text) return <>{text}</>;
  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx === -1) continue;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rd-evidence-kw">{kw}</mark>
        {highlightKeywords(text.slice(idx + kw.length), keywords.filter(k => k !== kw))}
      </>
    );
  }
  return <>{text}</>;
}

function AnnotatedText({ text, evidenceText, keywords, answered }) {
  if (!answered || !evidenceText || !text.includes(evidenceText)) {
    return <>{text}</>;
  }
  const idx = text.indexOf(evidenceText);
  return (
    <>
      {text.slice(0, idx)}
      <span className="rd-evidence-sent">
        {highlightKeywords(evidenceText, keywords)}
      </span>
      {text.slice(idx + evidenceText.length)}
    </>
  );
}

/* ── Context block ───────────────────────────────────── */

function ContextBlock({ text, source, type, isFullPassage, defaultOpen = true, evidenceText, keywords, answered }) {
  const [open, setOpen] = useState(defaultOpen || answered);
  return (
    <div className="rd-quiz-context">
      <button type="button" className="rd-quiz-context__header" aria-expanded={open} onClick={() => setOpen(v => !v)}>
        {isFullPassage ? 'FULL PASSAGE' : 'PARAGRAPH'}
        <span>{source}</span>
        {type && <TypeBadge type={type} />}
        <span className={`rd-quiz-context__chevron${open ? ' open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="rd-quiz-context__body">
          <AnnotatedText
            text={text}
            evidenceText={evidenceText}
            keywords={keywords}
            answered={answered}
          />
        </div>
      )}
    </div>
  );
}

/* ── Two-panel explanation ───────────────────────────── */

const ERROR_TAGS = [
  '无中生有', '过度推断', '过度引申', '过度乐观',
  '事实矛盾', '断章取义', '信息混淆', '定义混淆',
  '反义混淆', '方向相反', '曲解立场', '主观臆测',
  '因果倒置', '过于绝对',
];

function inferErrorTag(text) {
  const directTag = ERROR_TAGS.find((tag) => text.includes(tag));
  if (directTag) return directTag;
  if (text.includes('矛盾') || text.includes('相反')) return '事实矛盾';
  if (text.includes('臆测')) return '主观臆测';
  if (text.includes('绝对')) return '过于绝对';
  if (text.includes('曲解')) return '曲解立场';
  return '';
}

function extractOptionReasons(explanation, options, answer) {
  const reasons = {};
  if (!explanation) return reasons;
  const distractorPart = explanation.split('干扰项：')[1] || '';
  for (const opt of options) {
    const letter = opt[0];
    if (letter === answer) continue;
    const regex = new RegExp(letter + '\\s*[—–-]\\s*([^；;A-D]{0,200})');
    const match = distractorPart.match(regex);
    if (match) {
      const tag = inferErrorTag(match[1]);
      if (tag) reasons[letter] = tag;
    }
  }
  return reasons;
}


function AnalysisCard({ question }) {
  const optionReasons = extractOptionReasons(question.explanation, question.options, question.answer);

  return (
    <div className="rd-expl-panel rd-expl-panel--full">
      <div className="rd-expl-panel__title">题目解析</div>
      <div className="rd-expl-options">
        {question.options.map(opt => {
          const letter = opt[0];
          const isAns = letter === question.answer;
          const tag = optionReasons[letter];
          return (
            <div key={letter} className={`rd-expl-option${isAns ? ' rd-expl-option--correct' : ' rd-expl-option--wrong'}`}>
              {isAns ? (
                <span>✓ {opt}</span>
              ) : (
                <>
                  <span className="rd-expl-option__strike">{opt}</span>
                  {tag && <span className="rd-expl-option__tag">{tag}</span>}
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="rd-expl-panel__footer">
        <span className="rd-expl-panel__footer-main">{question.type} · 选项逐条析</span>
        <span className="rd-expl-panel__footer-sub">干扰项类型 · 标注原因</span>
      </div>
    </div>
  );
}

/* ── Single question card ───────────────────────────── */
// 该组件同时承载选择题与语法填空两种作答形态，复杂度是固有需求。
// eslint-disable-next-line complexity
function QuizCard({ item, index, total, onNext, isLast, label, onEmptyBack }) {
  const [selected, setSelected] = useState(null);
  const [typed, setTyped] = useState("");
  if (!item?.question) {
    return (
      <div className="gm-quiz-step">
        <p className="gm-quiz-step__num">练习题目</p>
        <h2 className="gm-quiz-step__title">当前没有可用题目</h2>
        <p style={{ color: 'var(--gm-muted)', lineHeight: 1.7 }}>
          题库暂时没有匹配内容，请返回重新选择练习类型。
        </p>
        <button type="button" className="gm-btn-secondary" onClick={onEmptyBack}>
          返回
        </button>
      </div>
    );
  }

  const { question, passage, source } = item;
  const isFillBlank = !question.options || question.options.length === 0; // 语法填空
  const answered = isFillBlank ? typed.trim() !== "" : selected !== null;
  // 语法填空判分：忽略大小写与首尾空格
  const isCorrect = isFillBlank
    ? typed.trim().toLowerCase() === String(question.answer || "").trim().toLowerCase()
    : answered && selected === question.answer;
  const context = extractParagraphs(passage, question.paragraphs);
  const isFullPassage = question.paragraphs === null;

  // 语法填空：回车提交
  function handleFillSubmit() {
    if (!typed.trim()) return;
    const correct = typed.trim().toLowerCase() === String(question.answer || "").trim().toLowerCase();
    onNext({
      correct,
      selected: typed.trim(),
      answer: question.answer,
      passageId: item.passageId,
      questionIndex: question.index,
      questionType: question.type,
      source,
      stem: question.stem,
    });
  }

  return (
    <div className="gm-quiz-step">
      {/* Progress */}
      <div className="gm-quiz-step__progress">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`gm-quiz-step__dot${i < index ? ' active' : i === index ? ' current' : ''}`} />
        ))}
      </div>
      <p className="gm-quiz-step__num">{label ?? `第 ${index + 1} 题 / 共 ${total} 题`}</p>

      {/* Context */}
      <ContextBlock
        text={context}
        source={source}
        type={question.type}
        isFullPassage={isFullPassage}
        defaultOpen={!isFullPassage}
        evidenceText={question.evidenceText}
        keywords={question.keywords}
        answered={answered}
      />

      {/* Stem */}
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--gm-text)', lineHeight: 1.7, margin: '0 0 16px' }}>
        <span style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 700,
          background: 'rgba(26,122,110,0.12)',
          color: '#1a7a6e',
          marginRight: 8,
          verticalAlign: '2px',
        }}>
          {question.type}
        </span>
        {question.stem}
      </p>
      {/* Analysis card — shown above options after answering */}
      {answered && <AnalysisCard question={question} />}

      {/* Options */}
      <div className="gm-quiz-options" style={{ marginTop: answered ? 12 : 0 }}>
        {isFillBlank ? (
          <div style={{ margin: '8px 0' }}>
            <input
              type="text"
              value={typed}
              disabled={answered}
              placeholder="输入答案（如 was allowed）"
              aria-label="语法填空答案"
              style={{
                width: '100%', maxWidth: 360, padding: '10px 14px', fontSize: 15,
                borderRadius: 10, border: `1px solid ${answered ? (isCorrect ? '#1a7a6e' : '#c04040') : '#d8d8d8'}`,
                outline: 'none', background: answered ? '#fafafa' : '#fff',
              }}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !answered && typed.trim()) handleFillSubmit(); }}
            />
          </div>
        ) : (
          question.options.map(opt => {
            const letter = opt[0];
            const isSel = selected === letter;
            const isAnswerKey = answered && letter === question.answer;
            const isWrongSelected = answered && isSel && !isCorrect;
            return (
              <button type="button"
                key={opt}
                className={`gm-quiz-option${isSel ? ' selected' : ''}${isAnswerKey ? ' answer' : ''}${isWrongSelected ? ' wrong-selected' : ''}`}
                onClick={() => !answered && setSelected(letter)}
                disabled={answered}
              >
                {opt}
              </button>
            );
          })
        )}
      </div>

      {/* Explanation detail + next */}
      {answered && (
        <>
          <div className="rd-result-label" style={{ color: isCorrect ? '#1a7a6e' : '#8a2a1a', marginTop: 16 }}>
            {isCorrect ? '✓ 回答正确' : `✗ 正确答案是 ${question.answer}`}
          </div>

          {question.explanation && (
            <div className="rd-expl-detail">
              <p>{question.explanation}</p>
            </div>
          )}

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button
              type="button"
              className="gm-btn-primary gm-quiz-step__next"
              onClick={() => onNext({
                correct: isCorrect,
                selected: isFillBlank ? typed.trim() : selected,
                answer: question.answer,
                passageId: item.passageId,
                questionIndex: question.index,
                questionType: question.type,
                source,
                stem: question.stem,
              })}
            >
              {isLast ? '查看结果' : '下一题 →'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Genre icon cells ────────────────────────────────── */

function ChartIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="17" width="5" height="8" rx="1.5" fill="currentColor" opacity="0.38"/>
      <rect x="11.5" y="11" width="5" height="14" rx="1.5" fill="currentColor" opacity="0.65"/>
      <rect x="20" y="5" width="5" height="20" rx="1.5" fill="currentColor"/>
    </svg>
  );
}
function BubbleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="4" width="22" height="15" rx="4" fill="currentColor" opacity="0.18"/>
      <path d="M7 19l4 5v-5H7z" fill="currentColor" opacity="0.18"/>
      <line x1="8" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function BookIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M4 6a2 2 0 012-2h6v20l-5-3-3 3V6z" fill="currentColor" opacity="0.38"/>
      <path d="M14 4h8a2 2 0 012 2v18l-3-3-5 3V4z" fill="currentColor" opacity="0.7"/>
    </svg>
  );
}
function DocIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="5" y="2" width="18" height="24" rx="3" fill="currentColor" opacity="0.14"/>
      <circle cx="10" cy="10" r="2" fill="currentColor"/>
      <line x1="14" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="10" cy="16" r="2" fill="currentColor" opacity="0.55"/>
      <line x1="14" y1="16" x2="21" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.55"/>
      <circle cx="10" cy="22" r="2" fill="currentColor" opacity="0.28"/>
      <line x1="14" y1="22" x2="21" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.28"/>
    </svg>
  );
}

const GENRE_CELLS = [
  { genre: '说明文', sub: '科技/社会/自然',   Icon: ChartIcon  },
  { genre: '议论文', sub: '观点/态度/论证',   Icon: BubbleIcon },
  { genre: '记叙文', sub: '人物/情节/情感',   Icon: BookIcon   },
  { genre: '新闻',   sub: '事件/背景/影响',   Icon: DocIcon    },
  { genre: '应用文', sub: '广告/通知/说明类', Icon: DocIcon    },
  { genre: '完形填空', sub: '词汇/语境/逻辑', Icon: DocIcon    },
  { genre: '语法填空', sub: '词形/时态/从句', Icon: DocIcon    },
  { genre: '七选五',   sub: '选句填空/逻辑', Icon: DocIcon    },
];

/* ── 整篇练习 flow ───────────────────────────────────── */

function PassageConfigCard({ genre, setGenre, focusType, setFocusType, onStart, onBack, loading }) {
  const typeStats = useMemo(() => {
    const counts = {};
    for (const p of getPassagesByGenre(genre)) {
      for (const q of p.questions) {
        counts[q.type] = (counts[q.type] || 0) + 1;
      }
    }
    return counts;
  }, [genre]);
  return (
    <div className="gm-quiz-step">
      <p className="gm-quiz-step__num">整篇练习 · 配置</p>
      <h2 className="gm-quiz-step__title">选择文体类型</h2>

      <div className="rd-genre-grid">
        {GENRE_CELLS.map(({ genre: g, sub, Icon }) => (
          <button key={g} type="button"
            className={`rd-genre-cell${genre === g ? ' active' : ''}`}
            onClick={() => setGenre(g)}>
            <div className="rd-genre-cell__icon"><Icon /></div>
            <div className="rd-genre-cell__name">{g}</div>
            <div className="rd-genre-cell__desc">{sub}</div>
          </button>
        ))}
      </div>

      <button type="button"
        className={`rd-genre-random${genre === '随机' ? ' active' : ''}`}
        onClick={() => setGenre('随机')}>
        随机文体
      </button>

      <p className="gm-quiz-step__num" style={{ marginTop: 28 }}>题型筛选</p>
      <div className="rd-drill-grid">
        {['不限', ...READING_QUESTION_TYPES.filter((t) => t !== '随机')].map((t) => (
          <button key={t} type="button"
            className={`rd-drill-cell${focusType === t ? ' active' : ''}`}
            onClick={() => setFocusType(t)}>
            {t}
            {t !== '不限' && <small style={{ display: 'block', fontSize: 10, opacity: 0.6 }}>{typeStats[t] || 0}题</small>}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'var(--gm-muted)', margin: '10px 0 0' }}>
        {focusType === '不限' ? '不限题型：整篇练习全部题目' : `仅练「${focusType}」：从全库抽取该题型题目（共 ${typeStats[focusType] || 0} 题）`}
      </p>

      <button type="button" className="gm-btn-primary gm-quiz-step__next" aria-label={loading ? "正在取题" : "开始练习"} onClick={onStart} style={{ marginTop: 24 }} disabled={loading}>
        {loading ? '正在取题…' : '开始练习 →'}
      </button>
      <button type="button" className="gm-quiz-step__back" style={{ marginTop: 16, display: 'block' }} onClick={onBack}>
        ← 返回
      </button>
    </div>
  );
}

function PassageResultCard({ passageData, correct, total, answers, items, passageNum, hasMore, onContinue, onRestart }) {
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const wrongItems = items.filter((_, i) => !answers[i]?.correct);

  return (
    <div className="gm-quiz-result">
      <p style={{ fontSize: 12, color: 'var(--gm-muted)', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
        第 {passageNum} 篇 · {passageData?.source || '阅读练习'}
      </p>
      <div className="gm-quiz-result__score-ring">
        <span className="gm-quiz-result__score-num">{score}</span>
        <span className="gm-quiz-result__score-label">分</span>
      </div>
      <p className="gm-quiz-result__summary">共 {total} 题 · 答对 {correct} 题</p>

      {wrongItems.length > 0 && (
        <div className="gm-quiz-result__wrongs">
          <h3>错题回顾</h3>
          {wrongItems.map(({ question, passage }) => {
            const context = extractParagraphs(passage, question.paragraphs);
            return (
              <div key={question.index} className="gm-quiz-result__wrong-item">
                <p className="gm-quiz-result__wrong-q"><strong>Q：</strong>{question.stem}</p>
                <p className="gm-quiz-result__wrong-ans">
                  正确答案：<span className="correct">{question.answer}</span>
                  &nbsp;·&nbsp;<span style={{ fontSize: 11, color: '#7aada8' }}>{passageData.source}</span>
                </p>
                <p style={{ fontSize: 13, color: 'var(--gm-muted)', lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', marginTop: 8,
                  borderLeft: '3px solid rgba(26,122,110,0.2)', paddingLeft: 10 }}>
                  {context.length > 240 ? context.slice(0, 240) + '…' : context}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="gm-quiz-result__actions">
        {hasMore && <button type="button" className="gm-btn-primary" onClick={onContinue}>继续 →</button>}
        <button type="button" className="gm-btn-secondary" onClick={onRestart}>完成</button>
      </div>
    </div>
  );
}

function PassageFlow({ onRestart, onComplete, systemId = "" }) {
  const [phase, setPhase] = useState('config');
  const [genre, setGenre] = useState('随机');
  const [focusType, setFocusType] = useState('不限');
  const [allPassages, setAllPassages] = useState([]);
  const [passageIndex, setPassageIndex] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const startedAtRef = useRef(Date.now());

  async function handleStart() {
    setLoading(true);
    try {
      let passages;
      if (focusType !== '不限') {
        // 按题型抽题：跨 passage 抽该题型题目，按 passage 分组
        passages = getPaperByTypes({ types: [focusType], questionsPerType: -1, genre });
        if (!passages.length) passages = getPassagesByCount(genre, 200);
      } else {
        passages = await readingAPI.practicePassages({ genre, count: 200, systemId });
        if (!passages?.length) passages = getPassagesByCount(genre, 200);
      }
      setAllPassages(passages);
      setPassageIndex(0);
      setQIndex(0);
      setAnswers([]);
      setPhase('quiz');
      scrollToTop();
    } catch {
      const passages = focusType !== '不限'
        ? getPaperByTypes({ types: [focusType], questionsPerType: -1, genre })
        : getPassagesByCount(genre, 200);
      setAllPassages(passages);
      setPassageIndex(0);
      setQIndex(0);
      setAnswers([]);
      setPhase('quiz');
      scrollToTop();
    } finally {
      startedAtRef.current = Date.now();
      setLoading(false);
    }
  }

  function reportPassage() {
    if (!answers.length) return;
    onComplete?.(buildPracticePayload({
      mode: 'passage',
      genre,
      answers,
      durationMs: Date.now() - startedAtRef.current,
    }));
  }

  const currentPassage = allPassages[passageIndex];
  const items = currentPassage
    ? currentPassage.questions.map(q => ({
        passage: currentPassage.passage,
        passageId: currentPassage.id,
        source: currentPassage.source,
        question: q,
      }))
    : [];

  function handleNext(result) {
    const nextAnswers = [...answers, result];
    if (qIndex + 1 >= items.length) {
      setAnswers(nextAnswers);
      setPhase('passage-result');
      scrollToTop();
    } else {
      setAnswers(nextAnswers);
      setQIndex(i => i + 1);
      scrollToTop();
    }
  }

  function handleContinue() {
    reportPassage();
    if (passageIndex + 1 >= allPassages.length) {
      onRestart();
      return;
    }
    setPassageIndex(i => i + 1);
    setQIndex(0);
    setAnswers([]);
    startedAtRef.current = Date.now();
    setPhase('quiz');
    scrollToTop();
  }

  if (phase === 'config') {
    return <PassageConfigCard genre={genre} setGenre={setGenre} focusType={focusType} setFocusType={setFocusType} onStart={handleStart} onBack={onRestart} loading={loading} />;
  }
  if (phase === 'quiz') {
    return (
      <QuizCard
        key={`${passageIndex}-${qIndex}`}
        item={items[qIndex]}
        index={qIndex}
        total={items.length}
        onNext={handleNext}
        isLast={qIndex === items.length - 1}
        label={`第 ${passageIndex + 1} 篇 · 第 ${qIndex + 1} 题 / 共 ${items.length} 题`}
        onEmptyBack={onRestart}
      />
    );
  }
  return (
    <PassageResultCard
      passageData={currentPassage}
      correct={answers.filter((item) => item?.correct).length}
      total={items.length}
      answers={answers}
      items={items}
      passageNum={passageIndex + 1}
      hasMore={passageIndex + 1 < allPassages.length}
      onContinue={handleContinue}
      onRestart={() => {
        reportPassage();
        onRestart();
      }}
    />
  );
}

/* ── 题型专练 flow ───────────────────────────────────── */

function DrillConfigCard({ qType, setQType, onStart, onBack, loading }) {
  const pool = getQuestionsByType(qType);
  return (
    <div className="gm-quiz-step">
      <p className="gm-quiz-step__num">题型专练 · 配置</p>
      <h2 className="gm-quiz-step__title">选择练习题型</h2>

      <div className="rd-drill-grid">
        {READING_QUESTION_TYPES.map(t => (
          <button key={t} type="button"
            className={`rd-drill-cell${qType === t ? ' active' : ''}`}
            onClick={() => setQType(t)}>
            {t}
          </button>
        ))}
      </div>

      <p style={{ fontSize: 12, color: 'var(--gm-muted)', margin: '16px 0 24px' }}>
        当前题库：{pool.length} 道{qType === '随机' ? '题' : qType}
      </p>

      <button type="button" className="gm-btn-primary gm-quiz-step__next" aria-label={loading ? "正在取题" : "开始专练"} onClick={onStart} disabled={pool.length === 0 || loading}>
        {loading ? '正在取题…' : '开始专练 →'}
      </button>
      <button type="button" className="gm-quiz-step__back" style={{ marginTop: 16, display: 'block' }} onClick={onBack}>
        ← 返回
      </button>
    </div>
  );
}

const DRILL_BATCH = 3;

function makeWrongReviewItems(progress) {
  const seen = new Set();
  return (progress?.recent || [])
    .flatMap((record) => record.wrongItems || [])
    .map((wrong) => {
      const passage = READING_PASSAGE_BANK.find((item) => item.id === wrong.passageId);
      const question = passage?.questions.find((item) => item.index === wrong.questionIndex);
      if (!passage || !question) return null;
      const key = `${passage.id}:${question.index}`;
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        passage: passage.passage,
        passageId: passage.id,
        source: passage.source,
        question,
      };
    })
    .filter(Boolean);
}

function DrillBatchResult({ batchItems, answers, batchNum, onContinue, onRestart, continueLabel }) {
  const correct = answers.filter((item) => item?.correct).length;
  const total = batchItems.length;
  const score = Math.round((correct / total) * 100);
  const wrongItems = batchItems.filter((_, i) => !answers[i]?.correct);

  return (
    <div className="gm-quiz-result">
      <p style={{ fontSize: 12, color: 'var(--gm-muted)', fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>
        第 {batchNum} 组 · {total} 题
      </p>
      <div className="gm-quiz-result__score-ring">
        <span className="gm-quiz-result__score-num">{score}</span>
        <span className="gm-quiz-result__score-label">分</span>
      </div>
      <p className="gm-quiz-result__summary">共 {total} 题 · 答对 {correct} 题</p>

      {wrongItems.length > 0 && (
        <div className="gm-quiz-result__wrongs">
          <h3>错题回顾</h3>
          {wrongItems.map(({ question, passage, source }) => {
            const context = extractParagraphs(passage, question.paragraphs);
            return (
              <div key={question.index + source} className="gm-quiz-result__wrong-item">
                <p className="gm-quiz-result__wrong-q"><strong>Q：</strong>{question.stem}</p>
                <p className="gm-quiz-result__wrong-ans">
                  正确答案：<span className="correct">{question.answer}</span>
                  &nbsp;·&nbsp;<span style={{ fontSize: 11, color: '#7aada8' }}>{source}</span>
                </p>
                <p style={{ fontSize: 13, color: 'var(--gm-muted)', lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', marginTop: 8,
                  borderLeft: '3px solid rgba(26,122,110,0.2)', paddingLeft: 10 }}>
                  {context.length > 200 ? context.slice(0, 200) + '…' : context}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="gm-quiz-result__actions">
        <button type="button" className="gm-btn-primary" onClick={onContinue}>{continueLabel || `继续 ${DRILL_BATCH} 道题 →`}</button>
        <button type="button" className="gm-btn-secondary" onClick={onRestart}>完成</button>
      </div>
    </div>
  );
}

function DrillFlow({ onRestart, onComplete, systemId = "" }) {
  const [phase, setPhase] = useState('config');
  const [qType, setQType] = useState('随机');
  const [pool, setPool] = useState([]);
  const [poolOffset, setPoolOffset] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [batchNum, setBatchNum] = useState(1);
  const [loading, setLoading] = useState(false);
  const startedAtRef = useRef(Date.now());

  function buildPool(type) {
    return shuffle(getQuestionsByType(type));
  }

  async function handleStart() {
    setLoading(true);
    try {
      const p = await readingAPI.practiceQuestions({ type: qType, count: 800, systemId });
      setPool(p?.length ? p : buildPool(qType));
      setPoolOffset(0);
      setQIndex(0);
      setAnswers([]);
      setBatchNum(1);
      setPhase('quiz');
      scrollToTop();
    } catch {
      const p = buildPool(qType);
      setPool(p);
      setPoolOffset(0);
      setQIndex(0);
      setAnswers([]);
      setBatchNum(1);
      setPhase('quiz');
      scrollToTop();
    } finally {
      startedAtRef.current = Date.now();
      setLoading(false);
    }
  }

  function reportBatch() {
    if (!answers.length) return;
    onComplete?.(buildPracticePayload({
      mode: 'drill',
      questionType: qType,
      answers,
      durationMs: Date.now() - startedAtRef.current,
    }));
  }

  const batchItems = pool.slice(poolOffset, poolOffset + DRILL_BATCH);

  function handleNext(result) {
    const nextAnswers = [...answers, result];
    if (qIndex + 1 >= batchItems.length) {
      setAnswers(nextAnswers);
      setPhase('batch-result');
      scrollToTop();
    } else {
      setAnswers(nextAnswers);
      setQIndex(i => i + 1);
      scrollToTop();
    }
  }

  function handleContinue() {
    reportBatch();
    let nextOffset = poolOffset + DRILL_BATCH;
    if (nextOffset >= pool.length) {
      setPool(buildPool(qType));
      nextOffset = 0;
    }
    setPoolOffset(nextOffset);
    setQIndex(0);
    setAnswers([]);
    setBatchNum(n => n + 1);
    startedAtRef.current = Date.now();
    setPhase('quiz');
    scrollToTop();
  }

  if (phase === 'config') {
    return <DrillConfigCard qType={qType} setQType={setQType} onStart={handleStart} onBack={onRestart} loading={loading} />;
  }
  if (phase === 'quiz') {
    return (
      <QuizCard
        key={`${batchNum}-${qIndex}`}
        item={batchItems[qIndex]}
        index={qIndex}
        total={batchItems.length}
        onNext={handleNext}
        isLast={qIndex === batchItems.length - 1}
        label={`第 ${batchNum} 组 · 第 ${qIndex + 1} 题 / 共 ${batchItems.length} 题`}
        onEmptyBack={onRestart}
      />
    );
  }
  return (
    <DrillBatchResult
      batchItems={batchItems}
      answers={answers}
      batchNum={batchNum}
      onContinue={handleContinue}
      onRestart={() => {
        reportBatch();
        onRestart();
      }}
    />
  );
}

function ReviewFlow({ onRestart, onComplete }) {
  const [phase, setPhase] = useState('loading');
  const [items, setItems] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    let alive = true;
    readingAPI.practiceProgress()
      .then((progress) => {
        if (!alive) return;
        const reviewItems = makeWrongReviewItems(progress);
        setItems(reviewItems);
        startedAtRef.current = Date.now();
        setPhase(reviewItems.length ? 'quiz' : 'empty');
      })
      .catch(() => {
        if (alive) setPhase('empty');
      });
    return () => { alive = false; };
  }, []);

  function reportRound() {
    if (!answers.length) return;
    onComplete?.(buildPracticePayload({
      mode: 'review',
      questionType: '错题复练',
      answers,
      durationMs: Date.now() - startedAtRef.current,
    }));
  }

  function handleNext(result) {
    const nextAnswers = [...answers, result];
    if (qIndex + 1 >= items.length) {
      setAnswers(nextAnswers);
      setPhase('result');
      scrollToTop();
    } else {
      setAnswers(nextAnswers);
      setQIndex(i => i + 1);
      scrollToTop();
    }
  }

  if (phase === 'loading') {
    return (
      <div className="gm-quiz-step">
        <p className="gm-quiz-step__num">错题复练</p>
        <h2 className="gm-quiz-step__title">正在整理错题…</h2>
      </div>
    );
  }

  if (phase === 'empty') {
    return (
      <div className="gm-quiz-step">
        <p className="gm-quiz-step__num">错题复练</p>
        <h2 className="gm-quiz-step__title">当前没有可复练错题</h2>
        <p style={{ color: 'var(--gm-muted)', lineHeight: 1.7 }}>
          完成一次阅读练习并产生错题后，这里会自动整理复练题。
        </p>
        <button type="button" className="gm-btn-secondary" onClick={onRestart}>返回</button>
      </div>
    );
  }

  if (phase === 'quiz') {
    return (
      <QuizCard
        key={`review-${qIndex}`}
        item={items[qIndex]}
        index={qIndex}
        total={items.length}
        onNext={handleNext}
        isLast={qIndex === items.length - 1}
        label={`错题复练 · 第 ${qIndex + 1} 题 / 共 ${items.length} 题`}
        onEmptyBack={onRestart}
      />
    );
  }

  return (
    <DrillBatchResult
      batchItems={items}
      answers={answers}
      batchNum={1}
      onContinue={() => {
        reportRound();
        setQIndex(0);
        setAnswers([]);
        startedAtRef.current = Date.now();
        setPhase('quiz');
        scrollToTop();
      }}
      continueLabel="重做错题 →"
      onRestart={() => {
        reportRound();
        onRestart();
      }}
    />
  );
}

/* ── Mode selection card ────────────────────────────── */

function ModeCard({ onSelect, user }) {
  return (
    <div className="gm-quiz-step">
      <p className="gm-quiz-step__num">在线练习</p>
      <h2 className="gm-quiz-step__title">选择练习模式</h2>
      <div className="gm-quiz-step__type-list">
        <button type="button" className="gm-quiz-type-card" onClick={() => onSelect('passage')}>
          <span className="gm-quiz-type-card__label">整篇练习</span>
          <span className="gm-quiz-type-card__desc">选取完整文章，逐题作答，模拟真实考场节奏</span>
        </button>
        <button type="button" className="gm-quiz-type-card" onClick={() => onSelect('drill')}>
          <span className="gm-quiz-type-card__label">题型专练</span>
          <span className="gm-quiz-type-card__desc">按题型（主旨题、细节题、推断题…）专项突破，每题显示对应段落</span>
        </button>
        {user?.id && (
          <button type="button" className="gm-quiz-type-card" onClick={() => onSelect('review')}>
            <span className="gm-quiz-type-card__label">错题复练</span>
            <span className="gm-quiz-type-card__desc">从最近练习错题中自动整理，回到原文定位重新作答</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────── */

export default function ReadingPracticePage({
  user, onNavigate, onAccountClick, onLogin, onRegister,
  activePage = 'reading-practice',
  prepExamId = "",
  hideTopBar = false}) {
  const pageRef = useScrollReveal();
  const [subMode, setSubMode] = useState(readInitialPracticeMode);
  const [moduleTask, setModuleTask] = useState(readReadingModuleTask);
  const [taskSubmitError, setTaskSubmitError] = useState("");
  const systemId = getPrepExamSystemId(prepExamId);
  const handleComplete = (payload) => {
    if (!user?.id || !payload?.totalCount) return;
    setTaskSubmitError("");
    readingAPI.recordPractice({ ...payload, prepExamId, systemId }).then(() => {
      if (!moduleTask?.id) return null;
      return moduleAssignmentsAPI.submit(moduleTask.id).then(() => {
        clearModuleTaskContext();
        setModuleTask(null);
      });
    }).catch((error) => {
      setTaskSubmitError(error?.message || "记录保存失败，请稍后重试。");
    });
  };

  return (
    <div className="rd-page" ref={pageRef}>
      {!hideTopBar && (

        <ReadingTopBar
        user={user} onNavigate={onNavigate} onAccountClick={onAccountClick}
        onLogin={onLogin ?? (() => onNavigate?.('auth'))}
        onRegister={onRegister ?? (() => onNavigate?.('auth'))}
        activePage={activePage}
      />

      )}

      <PageHero eyebrow="筑巢阅读 · 在线练习" title="模拟选练，按题型提升。" description="整篇练习模拟真实考场节奏，题型专练针对薄弱题型反复突破。" />

      <main className="rd-analyzer-inner studio-reveal studio-reveal--delay-1" style={{ paddingTop: 0 }}>
        {taskSubmitError && (
          <div style={{ marginBottom: 12, color: "#8a2a1a", fontSize: 13, fontWeight: 700 }}>
            {taskSubmitError}
          </div>
        )}
        {subMode === null && <ModeCard onSelect={setSubMode} user={user} />}
        {subMode === 'passage' && <PassageFlow onRestart={() => setSubMode(null)} onComplete={handleComplete} systemId={systemId} />}
        {subMode === 'drill' && <DrillFlow onRestart={() => setSubMode(null)} onComplete={handleComplete} systemId={systemId} />}
        {subMode === 'review' && <ReviewFlow onRestart={() => setSubMode(null)} onComplete={handleComplete} />}
      </main>
    </div>
  );
}
