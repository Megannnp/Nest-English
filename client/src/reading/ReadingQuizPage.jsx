import { useCallback, useRef, useState } from "react";

import ReadingTopBar from "./ReadingTopBar.jsx";
import { readingAPI } from "../api/index.js";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./reading.css";

const GENRES = ["说明文", "议论文", "记叙文", "新闻"];
const DIFFICULTIES = ["简单", "中等", "困难"];

function extractQuestionType(question) {
  if (question?.questionType) return question.questionType;
  if (question?.type) return question.type;
  const explanation = String(question?.explanation || "");
  const match = explanation.match(/题型[:：]\s*([^|｜\n]+)/);
  return match?.[1]?.trim() || "阅读理解";
}

function buildAnswerItems({ questions, answers }) {
  return questions.map((question, index) => ({
    passageId: question.passageId || "ai-reading-quiz",
    questionIndex: index + 1,
    questionType: extractQuestionType(question),
    selected: answers[question.id] || "",
    answer: question.answer,
    correct: answers[question.id] === question.answer,
  }));
}

function buildWrongItems({ questions, answers, passage }) {
  return questions
    .map((question, index) => ({
      passageId: question.passageId || "ai-reading-quiz",
      source: question.source || passage.slice(0, 180),
      questionIndex: index + 1,
      questionType: extractQuestionType(question),
      stem: question.question,
      selected: answers[question.id] || "",
      answer: question.answer,
      correct: answers[question.id] === question.answer,
    }))
    .filter((item) => !item.correct)
    .map((item) => ({
      passageId: item.passageId,
      source: item.source,
      questionIndex: item.questionIndex,
      questionType: item.questionType,
      stem: item.stem,
      selected: item.selected,
      answer: item.answer,
    }));
}

function StepCard({ step, total, title, children, loading }) {
  return (
    <div className="gm-quiz-step">
      <div className="gm-quiz-step__progress">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`gm-quiz-step__dot ${i < step ? "active" : i === step - 1 ? "current" : ""}`} />
        ))}
      </div>
      <p className="gm-quiz-step__num">第 {step} 步 / 共 {total} 步</p>
      <h2 className="gm-quiz-step__title">{title}</h2>
      {loading ? (
        <div className="gm-quiz-step__loading">
          <div className="gm-quiz-loading__spinner" />
          <p>AI 正在生成短文和题目，请稍候…</p>
        </div>
      ) : children}
    </div>
  );
}

function QuizAnalysisCard({ options, answer, optionsAnalysis, explanation }) {
  const hasPerOption = optionsAnalysis && Object.keys(optionsAnalysis).length > 0;
  return (
    <div className="gm-analysis-card">
      <div className="gm-analysis-card__title">题目解析</div>
      {options && hasPerOption ? (
        <div className="gm-analysis-card__options">
          {options.map((opt) => {
            const letter = opt[0];
            const isAns = letter === answer;
            const analysis = optionsAnalysis[letter];
            return (
              <div key={letter} className={`gm-analysis-opt${isAns ? " gm-analysis-opt--correct" : " gm-analysis-opt--wrong"}`}>
                <span className={isAns ? "" : "gm-analysis-opt__text--strike"}>{isAns ? "✓ " : ""}{opt}</span>
                {analysis && <span className="gm-analysis-opt__reason">{analysis}</span>}
              </div>
            );
          })}
        </div>
      ) : null}
      {explanation && <div className="gm-analysis-card__explanation">{explanation}</div>}
    </div>
  );
}

function PassageCard({ passage }) {
  return (
    <div className="gm-analyzer-result-block" style={{ marginBottom: 20 }}>
      <h2>阅读短文</h2>
      <p style={{ lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{passage}</p>
    </div>
  );
}

function QuizQuestion({ question, index, total, submitted, userAnswer, onAnswer, onNext, isLast }) {
  const isCorrect = submitted && userAnswer === question.answer;
  return (
    <div className="gm-quiz-step">
      <div className="gm-quiz-step__progress">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`gm-quiz-step__dot ${i < index ? "active" : i === index ? "current" : ""}`} />
        ))}
      </div>
      <p className="gm-quiz-step__num">第 {index + 1} 题 / 共 {total} 题</p>
      <p className="gm-quiz-question__text" style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.7, margin: "0 0 20px" }}>
        {question.question}
      </p>
      <div className="gm-quiz-options">
        {question.options.map((opt) => {
          const letter = opt[0];
          const selected = userAnswer === letter;
          const isAnswerKey = submitted && letter === question.answer;
          const isWrongSelected = submitted && selected && !isCorrect;
          return (
            <button
              key={opt}
              className={`gm-quiz-option ${selected ? "selected" : ""} ${isAnswerKey ? "answer" : ""} ${isWrongSelected ? "wrong-selected" : ""}`}
              onClick={() => !submitted && onAnswer(question.id, letter)}
              disabled={submitted}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {submitted && (
        <>
          <QuizAnalysisCard
            options={question.options}
            answer={question.answer}
            optionsAnalysis={question.optionsAnalysis}
            explanation={question.explanation}
          />
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <button type="button" className="gm-btn-primary gm-quiz-step__next" aria-label={isLast ? "查看结果" : "下一题"} onClick={onNext}>
              {isLast ? "查看结果" : "下一题 →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ResultScreen({ questions, answers, config, onRestart, onTargetPractice, onEnd, recordStatus, recordError, user, onLoginClick }) {
  const correct = questions.filter((q) => answers[q.id] === q.answer).length;
  const score = Math.round((correct / questions.length) * 100);
  const wrongQuestions = questions.filter((q) => answers[q.id] !== q.answer);
  const wrongTypes = [...new Set(wrongQuestions.map(extractQuestionType))];
  const mainProblem = wrongQuestions.length
    ? `${config.genre} ${config.difficulty}题中，优先修复 ${wrongTypes.slice(0, 2).join("、")}。`
    : `${config.genre} ${config.difficulty}题本组掌握稳定，可以继续换一篇保持手感。`;
  const actionsDisabled = recordStatus === "saving";

  return (
    <div className="gm-quiz-result">
      <div className="gm-quiz-result__score-ring">
        <span className="gm-quiz-result__score-num">{score}</span>
        <span className="gm-quiz-result__score-label">分</span>
      </div>
      <p className="gm-quiz-result__summary">共 {questions.length} 题，答对 {correct} 题</p>
      <p className="gm-quiz-result__config">{config.genre} · {config.difficulty}</p>

      {recordStatus === "saving" && <p className="gm-quiz-result__meta">正在保存练习记录…</p>}
      {recordStatus === "saved" && <p className="gm-quiz-result__meta">练习记录已保存</p>}
      {recordStatus === "error" && (
        <div className="gm-quiz-error-msg" role="alert">
          <p>{recordError || "练习记录保存失败，阅读成长页可能暂未更新。"}</p>
        </div>
      )}
      {!user && (
        <p className="gm-quiz-result__meta">
          当前以游客身份练习，本次成绩不会保存。
          <button type="button" className="gm-quiz-result__login-link" onClick={onLoginClick}>登录后可自动保存记录并在成长页查看进度</button>
        </p>
      )}

      {wrongQuestions.length > 0 && (
        <div className="gm-quiz-result__wrongs">
          <h3>错题讲解</h3>
          {wrongQuestions.map((q) => (
            <div key={q.id} className="gm-quiz-result__wrong-item">
              <p className="gm-quiz-result__wrong-q"><strong>Q：</strong>{q.question}</p>
              <p className="gm-quiz-result__wrong-ans">
                你的答案：<span className="wrong">{answers[q.id] || "未作答"}</span>
                &nbsp;正确答案：<span className="correct">{q.answer}</span>
              </p>
              <p className="gm-quiz-result__wrong-exp">{q.explanation}</p>
            </div>
          ))}
        </div>
      )}

      <div className="gm-analysis-card">
        <div className="gm-analysis-card__title">主要问题</div>
        <div className="gm-analysis-card__explanation">{mainProblem}</div>
        <div className="gm-analysis-card__explanation">
          下一步：{user ? "进入错题复练，把本次薄弱题型重新做一遍。" : "先做同文体同难度的薄弱点重练，再回到阅读分析页拆文章结构。"}
        </div>
      </div>

      <div className="gm-quiz-result__actions">
        <button type="button" className="gm-btn-primary" aria-label={wrongQuestions.length ? "练同类薄弱点" : "再测一篇"} onClick={wrongQuestions.length ? onTargetPractice : onRestart} disabled={actionsDisabled}>
          {wrongQuestions.length ? "练同类薄弱点" : "再测一篇"}
        </button>
        <button type="button" className="gm-btn-secondary" onClick={onRestart} disabled={actionsDisabled}>换一篇速测</button>
        <button type="button" className="gm-btn-secondary" onClick={onEnd} disabled={actionsDisabled}>结束练习</button>
      </div>
    </div>
  );
}

export default function ReadingQuizPage({
  onNavigate, user, onLoginClick, onRegisterClick, activePage = "reading-quiz", onAccountClick, hideTopBar = false,
}) {
  const pageRef = useScrollReveal();
  const [phase, setPhase] = useState("setup");
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({ genre: "", difficulty: "" });
  const [passage, setPassage] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recordStatus, setRecordStatus] = useState("idle");
  const [recordError, setRecordError] = useState("");
  const startedAtRef = useRef(Date.now());

  const fetchQuiz = useCallback(async (cfg) => {
    setLoading(true);
    setError("");
    setAnswers({});
    setCurrentIndex(0);
    setSubmitted(false);
    setRecordStatus("idle");
    setRecordError("");
    try {
      const quiz = await readingAPI.generateQuiz({ genre: cfg.genre, difficulty: cfg.difficulty });
      const data = quiz?.passage ? quiz : quiz?.data;
      if (!data?.passage || !Array.isArray(data.questions) || !data.questions.length) {
        throw new Error("数据格式错误");
      }
      setPassage(data.passage);
      setQuestions(data.questions);
      startedAtRef.current = Date.now();
      setPhase("quiz");
    } catch (e) {
      setError("出题失败，请重试。" + (e?.message || ""));
      setPhase("setup");
    } finally {
      setLoading(false);
    }
  }, []);

  function handleLogin() {
    if (onLoginClick) { onLoginClick(); return; }
    onNavigate?.("auth");
  }
  function handleRegister() {
    if (onRegisterClick) { onRegisterClick(); return; }
    onNavigate?.("auth");
  }

  function handleAnswer(qId, letter) {
    setAnswers((prev) => ({ ...prev, [qId]: letter }));
    setSubmitted(true);
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSubmitted(false);
      return;
    }

    const correctCount = questions.filter((q) => answers[q.id] === q.answer).length;
    const answerItems = buildAnswerItems({ questions, answers });
    const wrongItems = buildWrongItems({ questions, answers, passage });
    const wrongTypes = [...new Set(wrongItems.map((item) => item.questionType))];
    setPhase("result");
    if (user) {
      setRecordStatus("saving");
      setRecordError("");
      readingAPI.recordPractice({
        mode: "quiz",
        genre: config.genre,
        questionType: wrongTypes[0] || "AI速测",
        passageIds: ["ai-reading-quiz"],
        correctCount,
        totalCount: questions.length,
        answers: answerItems,
        wrongItems,
        durationMs: Date.now() - startedAtRef.current,
      })
        .then(() => setRecordStatus("saved"))
        .catch((e) => {
          setRecordStatus("error");
          setRecordError(e?.message || "练习记录保存失败，阅读成长页可能暂未更新。");
        });
    } else {
      setRecordStatus("idle");
      setRecordError("");
    }
  }

  function handleRestart() {
    setPhase("setup");
    setStep(1);
    setConfig({ genre: "", difficulty: "" });
    setPassage("");
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setError("");
    setRecordStatus("idle");
  }

  function handleEnd() {
    onNavigate?.("reading-analyzer");
  }

  function handleTargetPractice() {
    if (user?.id) {
      try {
        sessionStorage.setItem("nest_reading_practice_mode", "review");
      } catch {
        // Navigation should still work when session storage is unavailable.
      }
      onNavigate?.("reading-practice");
      return;
    }
    fetchQuiz(config);
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="rd-page" ref={pageRef}>
      {!hideTopBar && (
        <ReadingTopBar
          onLogin={handleLogin}
          onRegister={handleRegister}
          user={user}
          onNavigate={onNavigate}
          activePage={activePage}
          onAccountClick={onAccountClick}
        />
      )}
      <main className="gm-quiz-page">
        {phase === "setup" && (
          <div className="gm-quiz-setup">
            <PageHero eyebrow="筑巢阅读 · AI 速测" title="即测即评，AI 出全新短文。" description="选文体和难度，AI 生成短文和 4 道单选题" />

            {step === 1 && (
              <StepCard step={1} total={2} title="选择文体">
                <div className="gm-quiz-step__chips">
                  {GENRES.map((g) => (
                    <button key={g} className={`gm-quiz-chip ${config.genre === g ? "active" : ""}`}
                      onClick={() => { setConfig((c) => ({ ...c, genre: g })); setStep(2); }}>
                      {g}
                    </button>
                  ))}
                </div>
              </StepCard>
            )}

            {step === 2 && (
              <StepCard step={2} total={2} title="选择难度" loading={loading}>
                {!loading && (
                  <>
                    <div className="gm-quiz-step__chips">
                      {DIFFICULTIES.map((d) => (
                        <button key={d} className={`gm-quiz-chip ${config.difficulty === d ? "active" : ""}`}
                          onClick={() => {
                            const newCfg = { ...config, difficulty: d };
                            setConfig(newCfg);
                            fetchQuiz(newCfg);
                          }}>
                          {d}
                        </button>
                      ))}
                    </div>
                    <button className="gm-quiz-step__back" onClick={() => setStep(1)}>← 上一步</button>
                  </>
                )}
              </StepCard>
            )}

            {error && (
              <div className="gm-quiz-error-msg" style={{ marginTop: 16 }}>
                <p>{error}</p>
                <button className="gm-btn-primary" onClick={() => fetchQuiz(config)}>重新出题</button>
              </div>
            )}
          </div>
        )}

        {phase === "quiz" && currentQuestion && (
          <div className="gm-quiz-setup">
            <PageHero eyebrow="筑巢阅读 · AI 速测" title={`${config.genre} · ${config.difficulty}`} description="先读短文，再逐题作答" />
            <PassageCard passage={passage} />
            <QuizQuestion
              key={currentQuestion.id}
              question={currentQuestion}
              index={currentIndex}
              total={questions.length}
              submitted={submitted}
              userAnswer={answers[currentQuestion.id]}
              onAnswer={handleAnswer}
              onNext={handleNext}
              isLast={currentIndex === questions.length - 1}
            />
          </div>
        )}

        {phase === "result" && (
          <ResultScreen
            questions={questions}
            answers={answers}
            config={config}
            onRestart={handleRestart}
            onTargetPractice={handleTargetPractice}
            onEnd={handleEnd}
            recordStatus={recordStatus}
            recordError={recordError}
            user={user}
            onLoginClick={handleLogin}
          />
        )}
      </main>
    </div>
  );
}
