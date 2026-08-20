/* eslint-disable complexity */
import { useCallback, useEffect, useRef, useState } from "react";

import GrammarAnalysisCard from "./GrammarAnalysisCard.jsx";
import GrammarTopBar from "./GrammarTopBar.jsx";
import { grammarAPI } from "../api/index.js";
import { getPrepExam, getPrepExamSystemId } from "../app/prepExamConfig.js";
import AppIcon from "../components/shared/AppIcon.jsx";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./grammar.css";

const STAGES = ["小学", "初中", "高中"];
const DIFFICULTIES = ["简单", "中等", "困难"];
const QUESTION_TYPES = [
  { id: "single", label: "单选题", desc: "四选一，选出正确答案" },
  { id: "fill", label: "填空题", desc: "在空格中填入正确答案" },
  { id: "error", label: "判断改错", desc: "判断句子是否有误并改正" },
];
const GRAMMAR_TASK_STORAGE_KEY = "nest_grammar_task_context";

function readSeedLabel() {
  try {
    const seed = JSON.parse(sessionStorage.getItem("nestGrammarQuizSeed") || "{}");
    if (seed.grammarPointLabel) {
      sessionStorage.removeItem("nestGrammarQuizSeed");
      return seed.grammarPointLabel;
    }
  } catch {
    // Ignore malformed seed data.
  }
  return null;
}

function readGrammarTaskContext() {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const task = JSON.parse(sessionStorage.getItem(GRAMMAR_TASK_STORAGE_KEY) || "null");
    if (!task?.grammarConfig?.assignmentId) return null;
    return task;
  } catch {
    return null;
  }
}

function StepCard({ step, total, title, children, loading }) {
  return (
    <div className="gm-quiz-step">
      <div className="gm-quiz-step__progress">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`gm-quiz-step__dot ${i < step - 1 ? "active" : i === step - 1 ? "current" : ""}`} />
        ))}
      </div>
      <p className="gm-quiz-step__num">第 {step} 步 / 共 {total} 步</p>
      <h2 className="gm-quiz-step__title">{title}</h2>
      {loading ? (
        <div className="gm-quiz-step__loading">
          <div className="gm-quiz-loading__spinner" />
          <p>AI 正在出题中，请稍候…</p>
        </div>
      ) : children}
    </div>
  );
}

function SingleChoiceSection({ question, submitted, userAnswer, isCorrect, onAnswer }) {
  return (
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
            onClick={() => !submitted && onAnswer(question.id, letter, true)}
            disabled={submitted}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function FillInSection({ question, submitted, userAnswer, onAnswer }) {
  const [fillValue, setFillValue] = useState("");
  function handleFillSubmit() {
    if (fillValue.trim()) onAnswer(question.id, fillValue.trim(), true);
  }
  return (
    <div className="gm-quiz-fill">
      <input
        aria-label="填空题答案"
        type="text"
        placeholder="输入答案..."
        value={userAnswer || fillValue}
        onChange={(e) => setFillValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !submitted && handleFillSubmit()}
        disabled={submitted || !!userAnswer}
        className="gm-quiz-fill__input"
      />
      {!submitted && !userAnswer && (
        <button type="button" className="gm-btn-primary gm-quiz-fill__btn" onClick={handleFillSubmit}>确认</button>
      )}
      {submitted && (
        <p className="gm-quiz-fill__answer">正确答案：<strong>{question.answer}</strong></p>
      )}
    </div>
  );
}

function ErrorJudgeSection({ question, submitted, userAnswer, onAnswer }) {
  const [errorJudge, setErrorJudge] = useState(null);
  function handleErrorJudge(val) {
    setErrorJudge(val);
    onAnswer(question.id, val, true);
  }
  return (
    <div className="gm-quiz-error-btns">
      <button
        className={`gm-quiz-error-btn ${errorJudge === "correct" || userAnswer === "correct" ? "selected" : ""} ${submitted && question.isCorrect ? "answer" : ""}`}
        onClick={() => !submitted && handleErrorJudge("correct")}
        disabled={submitted}
      >句子正确</button>
      <button
        className={`gm-quiz-error-btn ${errorJudge === "wrong" || userAnswer === "wrong" ? "selected" : ""} ${submitted && !question.isCorrect ? "answer" : ""}`}
        onClick={() => !submitted && handleErrorJudge("wrong")}
        disabled={submitted}
      >句子有误</button>
      {submitted && !question.isCorrect && (
        <p className="gm-quiz-fill__answer">正确形式：<strong>{question.correction}</strong></p>
      )}
    </div>
  );
}

function QuizSubmittedFooter({ submitted, question, isLast, onNext }) {
  if (!submitted) return null;
  return (
    <>
      <GrammarAnalysisCard
        options={question.type === 'single' ? question.options : null}
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
  );
}

function QuestionTypeBody({ question, submitted, userAnswer, isCorrect, onAnswer }) {
  if (question.type === "single") {
    return <SingleChoiceSection question={question} submitted={submitted} userAnswer={userAnswer} isCorrect={isCorrect} onAnswer={onAnswer} />;
  }
  if (question.type === "fill") {
    return <FillInSection question={question} submitted={submitted} userAnswer={userAnswer} onAnswer={onAnswer} />;
  }
  return <ErrorJudgeSection question={question} submitted={submitted} userAnswer={userAnswer} onAnswer={onAnswer} />;
}

function QuizQuestion({ question, index, total, submitted, onAnswer, userAnswer, onNext, isLast }) {
  const isCorrect = submitted && (
    question.type === "single" ? userAnswer === question.answer :
    question.type === "fill" ? userAnswer?.toLowerCase().trim() === question.answer?.toLowerCase().trim() :
    userAnswer === (question.isCorrect ? "correct" : "wrong")
  );

  return (
    <div className="gm-quiz-step">
      <div className="gm-quiz-step__progress">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className={`gm-quiz-step__dot ${i < index ? "active" : i === index ? "current" : ""}`} />
        ))}
      </div>
      <p className="gm-quiz-step__num">第 {index + 1} 题 / 共 {total} 题</p>
      <p className="gm-quiz-question__text" style={{ fontSize: 18, fontWeight: 700, color: "var(--gm-text)", lineHeight: 1.7, margin: "0 0 20px" }}>
        {question.question}
      </p>
      <QuestionTypeBody question={question} submitted={submitted} userAnswer={userAnswer} isCorrect={isCorrect} onAnswer={onAnswer} />
      <QuizSubmittedFooter submitted={submitted} question={question} isLast={isLast} onNext={onNext} />
    </div>
  );
}

function ResultScreen({
  questions,
  answers,
  totalDone,
  onContinue,
  onEnd,
  config,
  recordStatus = "idle",
  recordError = "",
  taskSubmitStatus = "idle",
  taskSubmitError = "",
  user,
  onLoginClick,
}) {
  const correct = questions.filter((q) => {
    const ua = answers[q.id];
    if (q.type === "single") return ua === q.answer;
    if (q.type === "fill") return ua?.toLowerCase().trim() === q.answer?.toLowerCase().trim();
    return ua === (q.isCorrect ? "correct" : "wrong");
  }).length;

  const score = Math.round((correct / questions.length) * 100);
  const wrongQuestions = questions.filter((q) => {
    const ua = answers[q.id];
    if (q.type === "single") return ua !== q.answer;
    if (q.type === "fill") return ua?.toLowerCase().trim() !== q.answer?.toLowerCase().trim();
    return ua !== (q.isCorrect ? "correct" : "wrong");
  });
  const typeLabel = QUESTION_TYPES.find(t => t.id === config.type)?.label || "当前题型";
  const mainProblem = wrongQuestions.length
    ? `${config.grammar || "当前语法点"} 的 ${typeLabel} 还需要巩固，优先复盘本组错题中的判断依据。`
    : `${config.grammar || "当前语法点"} 本组掌握稳定，可以继续提高难度或扩大题量。`;
  const nextActionLabel = wrongQuestions.length ? "练同类薄弱点" : "继续挑战同类题";
  const actionsDisabled = recordStatus === "saving" || taskSubmitStatus === "saving";

  return (
    <div className="gm-quiz-result">
      <div className="gm-quiz-result__score-ring">
        <span className="gm-quiz-result__score-num">{score}</span>
        <span className="gm-quiz-result__score-label">分</span>
      </div>
      <p className="gm-quiz-result__summary">本组 {questions.length} 题，答对 {correct} 题，共完成 {totalDone} 题</p>
      <p className="gm-quiz-result__config">
        {config.grammar} · {config.stage} · {config.difficulty} · {QUESTION_TYPES.find(t => t.id === config.type)?.label}
      </p>

      {recordStatus === "saving" ? (
        <p className="gm-quiz-result__meta">正在保存练习记录…</p>
      ) : null}
      {recordStatus === "saved" ? (
        <p className="gm-quiz-result__meta">练习记录已保存</p>
      ) : null}
      {recordStatus === "error" ? (
        <div className="gm-quiz-error-msg" role="alert">
          <p>{recordError || "练习记录保存失败，语法成长页可能暂未更新。"}</p>
        </div>
      ) : null}
      {taskSubmitStatus === "saving" ? (
        <p className="gm-quiz-result__meta">正在提交语法任务…</p>
      ) : null}
      {taskSubmitStatus === "saved" ? (
        <p className="gm-quiz-result__meta">语法任务已提交</p>
      ) : null}
      {taskSubmitStatus === "error" ? (
        <div className="gm-quiz-error-msg" role="alert">
          <p>{taskSubmitError || "语法任务提交失败，请稍后重试。"}</p>
        </div>
      ) : null}
      {!user ? (
        <p className="gm-quiz-result__meta">
          当前以游客身份练习，本次成绩不会保存。
          <button type="button" className="gm-quiz-result__login-link" onClick={onLoginClick}>登录后可自动保存记录并在成长页查看进度</button>
        </p>
      ) : null}

      {wrongQuestions.length > 0 && (
        <div className="gm-quiz-result__wrongs">
          <h3>错题讲解</h3>
          {wrongQuestions.map((q) => (
            <div key={q.id} className="gm-quiz-result__wrong-item">
              <p className="gm-quiz-result__wrong-q"><strong>Q：</strong>{q.question}</p>
              {q.type !== "error" && (
                <p className="gm-quiz-result__wrong-ans">
                  你的答案：<span className="wrong">{answers[q.id] || "未作答"}</span>
                  &nbsp;正确答案：<span className="correct">{q.answer}</span>
                </p>
              )}
              {q.type === "error" && (
                <p className="gm-quiz-result__wrong-ans">
                  正确形式：<span className="correct">{q.isCorrect ? "句子正确" : q.correction}</span>
                </p>
              )}
              <p className="gm-quiz-result__wrong-exp">{q.explanation}</p>
            </div>
          ))}
        </div>
      )}

      <div className="gm-analysis-card">
        <div className="gm-analysis-card__title">主要问题</div>
        <div className="gm-analysis-card__explanation">{mainProblem}</div>
        <div className="gm-analysis-card__explanation">
          下一步：用同一语法点、同一题型再练一组，把刚才错题里的规则判断重新跑一遍。
        </div>
      </div>

      <div className="gm-quiz-result__actions">
        <button type="button" className="gm-btn-primary" aria-label={nextActionLabel} onClick={onContinue} disabled={actionsDisabled}>{nextActionLabel}</button>
        <button type="button" className="gm-btn-secondary" onClick={onEnd} disabled={actionsDisabled}>结束练习</button>
      </div>
    </div>
  );
}

function SetupPhase({ step, config, grammarInput, loading, error, setGrammarInput, setConfig, setStep, fetchQuestions }) {
  return (
    <div className="gm-quiz-setup">
      <PageHero eyebrow="筑巢语法 · 练习" title="即学即练，举一反三。" description="4 步配置，AI 即时出题" />

      {step === 1 && (
        <StepCard step={1} total={4} title="练习哪个语法点？">
          <p className="gm-quiz-step__hint">例如：定语从句、现在完成时、被动语态</p>
          <input
            className="gm-quiz-step__input"
            aria-label="语法点"
            type="text"
            placeholder="输入语法点..."
            value={grammarInput}
            onChange={(e) => setGrammarInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && grammarInput.trim() && (setConfig((c) => ({ ...c, grammar: grammarInput.trim() })), setStep(2))}
            autoFocus
          />
          <button
            className="gm-btn-primary gm-quiz-step__next"
            disabled={!grammarInput.trim()}
            onClick={() => { setConfig((c) => ({ ...c, grammar: grammarInput.trim() })); setStep(2); }}
          >下一步</button>
        </StepCard>
      )}

      {step === 2 && (
        <StepCard step={2} total={4} title="你的学习阶段？">
          <div className="gm-quiz-step__chips">
            {STAGES.map((s) => (
              <button key={s} className={`gm-quiz-chip ${config.stage === s ? "active" : ""}`}
                onClick={() => { setConfig((c) => ({ ...c, stage: s })); setStep(3); }}>
                {s}
              </button>
            ))}
          </div>
          <button className="gm-quiz-step__back" onClick={() => setStep(1)}>← 上一步</button>
        </StepCard>
      )}

      {step === 3 && (
        <StepCard step={3} total={4} title="选择难度">
          <div className="gm-quiz-step__chips">
            {DIFFICULTIES.map((d) => (
              <button key={d} className={`gm-quiz-chip ${config.difficulty === d ? "active" : ""}`}
                onClick={() => { setConfig((c) => ({ ...c, difficulty: d })); setStep(4); }}>
                {d}
              </button>
            ))}
          </div>
          <button className="gm-quiz-step__back" onClick={() => setStep(2)}>← 上一步</button>
        </StepCard>
      )}

      {step === 4 && (
        <StepCard step={4} total={4} title="选择题型" loading={loading}>
          {!loading && (
            <>
              <div className="gm-quiz-step__type-list">
                {QUESTION_TYPES.map((t) => (
                  <button key={t.id}
                    className={`gm-quiz-type-card ${config.type === t.id ? "active" : ""}`}
                    onClick={() => {
                      const newCfg = { ...config, type: t.id };
                      setConfig(newCfg);
                      fetchQuestions(newCfg);
                    }}>
                    <span className="gm-quiz-type-card__label">{t.label}</span>
                    <span className="gm-quiz-type-card__desc">{t.desc}</span>
                  </button>
                ))}
              </div>
              <button className="gm-quiz-step__back" onClick={() => setStep(3)}>← 上一步</button>
            </>
          )}
        </StepCard>
      )}

      {error && (
        <div className="gm-quiz-error-msg" style={{ marginTop: 16 }}>
          <p>{error}</p>
          <button className="gm-btn-primary" onClick={() => fetchQuestions(config)}>重新出题</button>
        </div>
      )}
    </div>
  );
}

function QuizTopBar({ hideTopBar, onLogin, onRegister, user, onNavigate, activePage, onAccountClick }) {
  if (hideTopBar) return null;
  return (
    <GrammarTopBar
      onLogin={onLogin}
      onRegister={onRegister}
      user={user}
      onNavigate={onNavigate}
      activePage={activePage}
      onAccountClick={onAccountClick}
    />
  );
}

function QuizPhase({ phase, currentQuestion, config, currentIndex, questions, submitted, answers, onAnswer, onNext }) {
  if (phase !== "quiz" || !currentQuestion) return null;
  return (
    <div className="gm-quiz-setup">
      <PageHero
        eyebrow="筑巢语法 · 练习"
        title={config.grammar}
        titleStyle={{ fontSize: "clamp(24px,4vw,36px)" }}
        description={`${config.stage} · ${config.difficulty} · ${QUESTION_TYPES.find(t => t.id === config.type)?.label}`}
      />
      <QuizQuestion
        key={currentQuestion.id}
        question={currentQuestion}
        index={currentIndex}
        total={questions.length}
        submitted={submitted}
        onAnswer={onAnswer}
        userAnswer={answers[currentQuestion.id]}
        onNext={onNext}
        isLast={currentIndex === questions.length - 1}
      />
    </div>
  );
}

function DonePhase({ phase, totalDone, config, onRestart, onNavigate }) {
  if (phase !== "done") return null;
  return (
    <div className="gm-quiz-done">
      <div className="gm-quiz-done__icon"><AppIcon name="sparkles" size={40} /></div>
      <h2>练习完成</h2>
      <p>共完成 <strong>{totalDone}</strong> 道题</p>
      <p className="gm-quiz-done__meta">{config.grammar} · {config.stage} · {config.difficulty}</p>
      <div className="gm-quiz-done__actions">
        <button className="gm-btn-primary" onClick={onRestart}>再练一组</button>
        <button className="gm-btn-secondary" onClick={() => onNavigate?.("grammar-analyzer")}>返回首页</button>
      </div>
    </div>
  );
}

export default function GrammarQuizPage({
  onNavigate, user, onLoginClick, onRegisterClick, activePage = "grammar-quiz", onAccountClick, initialConfig,
  prepExamId = "",
  hideTopBar = false,
}) {
  const pageRef = useScrollReveal();
  const [seedLabel] = useState(readSeedLabel);
  const [grammarTaskContext, setGrammarTaskContext] = useState(readGrammarTaskContext);
  const resolvedInitialConfig = initialConfig || grammarTaskContext?.grammarConfig || null;
  const initialConfigRef = useRef(resolvedInitialConfig);

  const [phase, setPhase] = useState(resolvedInitialConfig ? "loading" : "setup");
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState(resolvedInitialConfig || { grammar: seedLabel || "", stage: "", difficulty: "", type: "" });
  const [grammarInput, setGrammarInput] = useState(resolvedInitialConfig?.grammar || seedLabel || "");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalDone, setTotalDone] = useState(0);
  const [recordStatus, setRecordStatus] = useState("idle");
  const [recordError, setRecordError] = useState("");
  const [taskSubmitStatus, setTaskSubmitStatus] = useState("idle");
  const [taskSubmitError, setTaskSubmitError] = useState("");
  const prepExam = getPrepExam(prepExamId);
  const systemId = getPrepExamSystemId(prepExamId);

  const fetchQuestions = useCallback(async (cfg) => {
    setLoading(true);
    setError("");
    setAnswers({});
    setCurrentIndex(0);
    setSubmitted(false);
    setRecordStatus("idle");
    setRecordError("");
    setTaskSubmitStatus("idle");
    setTaskSubmitError("");
    try {
      const qs = await grammarAPI.generateQuiz({
        grammar: cfg.grammar,
        stage: cfg.stage,
        difficulty: cfg.difficulty,
        type: cfg.type,
        prepExamId,
        prepExamLabel: prepExam.label,
        systemId,
      });
      const result = Array.isArray(qs) ? qs : qs?.data;
      if (!Array.isArray(result)) throw new Error("数据格式错误");
      setQuestions(result);
      setPhase("quiz");
    } catch (e) {
      setError("出题失败，请重试。" + (e?.message || ""));
      setPhase("setup");
    } finally {
      setLoading(false);
    }
  }, [prepExam.label, prepExamId, systemId]);

  useEffect(() => {
    if (initialConfigRef.current) void fetchQuestions(initialConfigRef.current);
  }, [fetchQuestions]);

  // autoSubmit=true 时立即显示解析
  function handleAnswer(qId, value, autoSubmit = false) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
    if (autoSubmit) setSubmitted(true);
  }

  function _countCorrect(qs, ans) {
    return qs.filter((q) => {
      const ua = ans[q.id];
      if (q.type === "single") return ua === q.answer;
      if (q.type === "fill") return ua?.toLowerCase().trim() === q.answer?.toLowerCase().trim();
      return ua === (q.isCorrect ? "correct" : "wrong");
    }).length;
  }

  function handleNext() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSubmitted(false);
    } else {
      const correctCount = _countCorrect(questions, answers);
      setTotalDone((prev) => prev + questions.length);
      setPhase("result");
      if (user) {
        const taskAssignmentId = grammarTaskContext?.grammarConfig?.assignmentId;
        if (taskAssignmentId) {
          setRecordStatus("idle");
          setRecordError("");
          setTaskSubmitStatus("saving");
          setTaskSubmitError("");
          grammarAPI.submitTask(taskAssignmentId, {
            correctCount,
            totalCount: questions.length,
          })
            .then(() => {
              setTaskSubmitStatus("saved");
              sessionStorage.removeItem(GRAMMAR_TASK_STORAGE_KEY);
              setGrammarTaskContext(null);
            })
            .catch((e) => {
              setTaskSubmitStatus("error");
              setTaskSubmitError(e?.message || "语法任务提交失败，请稍后重试。");
            });
        } else {
          setTaskSubmitStatus("idle");
          setTaskSubmitError("");
          setRecordStatus("saving");
          setRecordError("");
          const recordPayload = {
            grammarPoint: config.grammar,
            quizType: config.type,
            stage: config.stage,
            difficulty: config.difficulty,
            correctCount,
            totalCount: questions.length,
            prepExamId,
            systemId,
          };
          grammarAPI.record(recordPayload)
            .then(() => setRecordStatus("saved"))
            .catch((e) => {
              setRecordStatus("error");
              setRecordError(e?.message || "练习记录保存失败，语法成长页可能暂未更新。");
            });
        }
      } else {
        setRecordStatus("idle");
        setRecordError("");
        setTaskSubmitStatus("idle");
        setTaskSubmitError("");
      }
    }
  }

  function handleContinue() { fetchQuestions(config); }
  function handleEnd() { setPhase("done"); }

  function handleRestart() {
    sessionStorage.removeItem(GRAMMAR_TASK_STORAGE_KEY);
    setGrammarTaskContext(null);
    setPhase("setup");
    setStep(1);
    setConfig({ grammar: "", stage: "", difficulty: "", type: "" });
    setGrammarInput("");
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setTotalDone(0);
    setError("");
    setRecordStatus("idle");
    setRecordError("");
    setTaskSubmitStatus("idle");
    setTaskSubmitError("");
  }

  function handleLogin() {
    if (onLoginClick) { onLoginClick(); return; }
    onNavigate?.("auth");
  }
  function handleRegister() {
    if (onRegisterClick) { onRegisterClick(); return; }
    onNavigate?.("auth");
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="gm-page" ref={pageRef}>
      <QuizTopBar
        hideTopBar={hideTopBar}
        onLogin={handleLogin}
        onRegister={handleRegister}
        user={user}
        onNavigate={onNavigate}
        activePage={activePage}
        onAccountClick={onAccountClick}
      />
      <main className="gm-quiz-page">

        {/* 设置阶段 */}
        {phase === "setup" && (
          <SetupPhase
            step={step} config={config} grammarInput={grammarInput} loading={loading} error={error}
            setGrammarInput={setGrammarInput} setConfig={setConfig} setStep={setStep} fetchQuestions={fetchQuestions}
          />
        )}

        {/* 做题阶段 */}
        <QuizPhase
          phase={phase}
          currentQuestion={currentQuestion}
          config={config}
          currentIndex={currentIndex}
          questions={questions}
          submitted={submitted}
          answers={answers}
          onAnswer={handleAnswer}
          onNext={handleNext}
        />

        {/* 结果页 */}
        {phase === "result" && (
          <ResultScreen
            questions={questions}
            answers={answers}
            totalDone={totalDone}
            onContinue={handleContinue}
            onEnd={handleEnd}
            config={config}
            recordStatus={recordStatus}
            recordError={recordError}
            taskSubmitStatus={taskSubmitStatus}
            taskSubmitError={taskSubmitError}
            user={user}
            onLoginClick={handleLogin}
          />
        )}

        {/* 结束页 */}
        <DonePhase phase={phase} totalDone={totalDone} config={config} onRestart={handleRestart} onNavigate={onNavigate} />
      </main>
    </div>
  );
}
