import { useMemo, useRef, useState } from "react";

import ReadingTopBar from "./ReadingTopBar.jsx";
import { getPassagesByCount, getPaperByTypes, READING_GENRES, READING_QUESTION_TYPES } from "../../../shared/reading/readingPassageBank.js";
import { moduleAssignmentsAPI, readingAPI } from "../api/index.js";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import { clearModuleTaskContext, readModuleTaskContext } from "../utils/moduleTaskContext.js";
import "../grammar/grammar.css";
import "./reading.css";

const SECTION_LABELS = ["一", "二", "三", "四", "五"];
const PASSAGE_LABELS = ["A", "B", "C", "D", "E"];
const PAPER_STAGE = "高中";
const PAPER_DIFFICULTY = "中";
const COUNT_OPTIONS = [1, 2, 3];
const POINT_OPTIONS = [2, 2.5, 3, 4];
const GENRE_FILTERS = [
  { value: "随机", label: "随机", desc: "混合抽题" },
  { value: "说明文", label: "说明文", desc: "科技/社会/自然" },
  { value: "议论文", label: "议论文", desc: "观点/态度/论证" },
  { value: "记叙文", label: "记叙文", desc: "人物/情节/情感" },
  { value: "新闻", label: "新闻", desc: "事件/背景/影响" },
  { value: "应用文", label: "应用文", desc: "广告/通知/说明类" },
  { value: "完形填空", label: "完形填空", desc: "词汇/语境/逻辑" },
  { value: "语法填空", label: "语法填空", desc: "词形/时态/从句" },
  { value: "七选五", label: "七选五", desc: "选句填空/逻辑" },
].filter((item) => READING_GENRES.includes(item.value));

function readReadingPaperTask() {
  return readModuleTaskContext("reading-paper");
}

function clonePassages(passages) {
  return passages.map((passage) => ({
    ...passage,
    questions: passage.questions.map((question) => ({
      ...question,
      options: [...question.options],
    })),
  }));
}

function flattenPaperQuestions(passages) {
  return passages.flatMap((passage, passageIndex) => (
    passage.questions.map((question, questionIndex) => ({
      passage,
      passageIndex,
      question,
      questionIndex,
      key: `${passage.id || passageIndex}:${question.index || questionIndex}`,
    }))
  ));
}

function downloadWorksheet({ title, passages, dateText, stage, difficulty, scorePerQuestion, includeAnswers }) {
  const totalQuestions = passages.reduce((sum, passage) => sum + passage.questions.length, 0);
  const totalScore = totalQuestions * scorePerQuestion;
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const body = passages.map((passage, passageIndex) => `
    <h2>${PASSAGE_LABELS[passageIndex] || passageIndex + 1}篇 ${escapeHtml(passage.source || "")}</h2>
    <p><strong>${escapeHtml(passage.genre || "")}</strong></p>
    ${escapeHtml(passage.passage).split("\n").map((line) => `<p>${line || "&nbsp;"}</p>`).join("")}
    ${passage.questions.map((question, questionIndex) => `
      <p><strong>${passages.slice(0, passageIndex).reduce((sum, item) => sum + item.questions.length, 0) + questionIndex + 1}. ${escapeHtml(question.stem)}</strong></p>
      ${question.options.map((option) => `<p style="margin-left:24px">${escapeHtml(option)}</p>`).join("")}
      ${includeAnswers ? `
        <p><strong>答案：${escapeHtml(question.answer)}</strong></p>
        <p>解析：${escapeHtml(question.explanation || "")}</p>
      ` : ""}
    `).join("")}
  `).join("");
  // Word HTML 格式：需要 Office 命名空间和 ProgId，Word/WPS 才会按文档而非网页打开
  const html = `<!doctype html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <meta name="ProgId" content="Word.Document">
        <meta name="Originator" content="Microsoft Word 15">
        <title>${escapeHtml(title)}</title>
        <!--[if gte mso 9]><xml>
          <w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument>
        </xml><![endif]-->
        <style>
          @page { size: A4; margin: 2cm; }
          body { font-family: "DengXian", "Microsoft YaHei", SimSun, sans-serif; font-size: 12pt; line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1 style="text-align:center">${escapeHtml(title)}</h1>
        <p style="text-align:right">班级：__________ 姓名：__________ ${escapeHtml(dateText)}</p>
        <p>学习阶段：${escapeHtml(stage)} · 难度：${escapeHtml(difficulty)} · 共 ${passages.length} 篇 · ${totalQuestions} 题 · 每题 ${scorePerQuestion} 分 · 满分 ${totalScore} 分</p>
        ${body}
      </body>
    </html>`;
  // BOM 让 Word 在简体中文环境下正确识别 UTF-8，避免中文乱码
  const blob = new Blob(["﻿", html], { type: "application/msword;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${(title || "阅读理解练习卷").replace(/[\\/:*?"<>|]/g, "_")}${includeAnswers ? "-答案解析" : "-题目"}.doc`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function FilterGroup({ label, children }) {
  return (
    <div className="rd-paper-filter-group">
      <div className="rd-paper-filter-group__label">{label}</div>
      {children}
    </div>
  );
}

function PaperSettings({
  genre,
  setGenre,
  count,
  setCount,
  pickMode,
  setPickMode,
  selectedTypes,
  toggleType,
  questionsPerType,
  setQuestionsPerType,
  scorePerQuestion,
  setScorePerQuestion,
  totalQuestions,
  totalScore,
  onGenerate,
  onNavigate,
}) {
  return (
    <section className="gm-practice-builder rd-paper-settings studio-reveal studio-reveal--delay-1">
      <div className="gm-practice-builder__header">
        <div>
          <p className="gm-hero__kicker">Worksheet Setup</p>
          <h2>生成设置</h2>
          <p className="gm-practice-summary">预计 {totalQuestions} 题 · {totalScore} 分</p>
        </div>
      </div>

      <div className="rd-paper-filter-panel">
        <FilterGroup label="文体类型">
          <div className="rd-paper-genre-grid">
            {GENRE_FILTERS.map((item) => (
              <button
                type="button"
                key={item.value}
                className={`rd-paper-genre-chip${genre === item.value ? " is-active" : ""}`}
                onClick={() => setGenre(item.value)}
              >
                <span>{item.label}</span>
                <small>{item.desc}</small>
              </button>
            ))}
          </div>
        </FilterGroup>

        <FilterGroup label="抽题方式">
          <div className="rd-paper-option-row">
            <button
              type="button"
              className={`rd-paper-option${pickMode === "passage" ? " is-active" : ""}`}
              onClick={() => setPickMode("passage")}
            >
              按文体抽整篇
            </button>
            <button
              type="button"
              className={`rd-paper-option${pickMode === "type" ? " is-active" : ""}`}
              onClick={() => setPickMode("type")}
            >
              按题型抽题
            </button>
          </div>
        </FilterGroup>

        {pickMode === "type" && (
          <FilterGroup label="目标题型（可多选）">
            <div className="rd-paper-genre-grid">
              {READING_QUESTION_TYPES.filter((t) => t !== "随机").map((type) => (
                <button
                  type="button"
                  key={type}
                  className={`rd-paper-genre-chip${selectedTypes.includes(type) ? " is-active" : ""}`}
                  onClick={() => toggleType(type)}
                >
                  <span>{type}</span>
                </button>
              ))}
            </div>
          </FilterGroup>
        )}

        {pickMode === "type" && (
          <FilterGroup label="每种题型题数">
            <div className="rd-paper-option-row">
              {[2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`rd-paper-option${questionsPerType === n ? " is-active" : ""}`}
                  onClick={() => setQuestionsPerType(n)}
                >
                  {n}题
                </button>
              ))}
            </div>
          </FilterGroup>
        )}

        <div className="rd-paper-filter-row">
          <FilterGroup label="题库范围">
            <div className="rd-paper-static-meta">
              <strong>高中阅读题库</strong>
              <span>当前固定题库来源</span>
            </div>
          </FilterGroup>

          <FilterGroup label="组卷方式">
            <div className="rd-paper-static-meta">
              <strong>题库抽题</strong>
              <span>按文体和篇数自动抽取</span>
            </div>
          </FilterGroup>
        </div>

        <div className="rd-paper-filter-row">
          <FilterGroup label="生成篇数">
            <div className="rd-paper-option-row">
              {COUNT_OPTIONS.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`rd-paper-option${count === item ? " is-active" : ""}`}
                  onClick={() => setCount(item)}
                >
                  {item}篇
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="每题分值">
            <div className="rd-paper-option-row">
              {POINT_OPTIONS.map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`rd-paper-option${scorePerQuestion === item ? " is-active" : ""}`}
                  onClick={() => setScorePerQuestion(item)}
                >
                  {item}分
                </button>
              ))}
            </div>
          </FilterGroup>
        </div>
      </div>

      <div className="gm-practice-actions rd-paper-actions">
        <button type="button" className="gm-btn-primary" onClick={onGenerate}>
          生成组卷内容
        </button>
        <button type="button" className="gm-btn-secondary" onClick={() => onNavigate?.("reading-practice")}>
          在线练习
        </button>
      </div>
    </section>
  );
}

function PaperOutput({
  passages,
  setPassages,
  title,
  setTitle,
  fontSize,
  setFontSize,
  scorePerQuestion,
  stage,
  difficulty,
  dateText,
  showAnswers,
  setShowAnswers,
  paperAnswers,
  setPaperAnswers,
  paperResult,
  onDownload,
  onSubmitPaper,
}) {
  const totalQuestions = passages.reduce((sum, passage) => sum + passage.questions.length, 0);
  const totalScore = totalQuestions * scorePerQuestion;
  const flatQuestions = flattenPaperQuestions(passages);

  function updatePassage(passageIndex, field, value) {
    setPassages((current) => current.map((passage, index) => (
      index === passageIndex ? { ...passage, [field]: value } : passage
    )));
  }

  function updateQuestion(passageIndex, questionIndex, field, value) {
    setPassages((current) => current.map((passage, index) => {
      if (index !== passageIndex) return passage;
      return {
        ...passage,
        questions: passage.questions.map((question, qIndex) => (
          qIndex === questionIndex ? { ...question, [field]: value } : question
        )),
      };
    }));
  }

  function updateOption(passageIndex, questionIndex, optionIndex, value) {
    setPassages((current) => current.map((passage, index) => {
      if (index !== passageIndex) return passage;
      return {
        ...passage,
        questions: passage.questions.map((question, qIndex) => {
          if (qIndex !== questionIndex) return question;
          return {
            ...question,
            options: question.options.map((option, oIndex) => (oIndex === optionIndex ? value : option)),
          };
        }),
      };
    }));
  }

  return (
    <section className="gm-practice-builder gm-practice-output studio-reveal studio-reveal--delay-2">
      <div className="gm-practice-builder__header">
        <div>
          <p className="gm-hero__kicker">Worksheet</p>
          <h2>练习单编辑</h2>
        </div>
        <div className="gm-practice-output__tools">
          <label>
            标题
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            字号
            <input type="range" min="13" max="20" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
          </label>
          <div className="gm-practice-downloads" aria-label="题卷操作">
            <span>操作</span>
            <button type="button" className="gm-btn-secondary" onClick={() => setShowAnswers((value) => !value)}>
              {showAnswers ? "隐藏答案" : "显示答案"}
            </button>
            <button type="button" className="gm-btn-secondary" onClick={() => onDownload(false)} disabled={!passages.length}>
              下载题目
            </button>
            <button type="button" className="gm-btn-secondary" onClick={() => onDownload(true)} disabled={!passages.length}>
              下载答案
            </button>
            <button type="button" className="gm-btn-secondary" onClick={() => window.print()} disabled={!passages.length}>
              打印
            </button>
          </div>
        </div>
      </div>

      <div className="gm-practice-paper rd-practice-paper" style={{ "--practice-font-size": `${fontSize}px` }}>
        <div className="gm-practice-paper__top">
          <h1>{title || "阅读理解练习卷"}</h1>
          <div>
            <span>班级：__________</span>
            <span>姓名：__________</span>
            <span>{dateText}</span>
          </div>
        </div>
        <p className="gm-practice-paper__meta">
          阅读理解 · 学习阶段：{stage} · 难度：{difficulty} · 共 {passages.length} 篇 · {totalQuestions} 题 · 每题 {scorePerQuestion} 分 · 满分 {totalScore} 分
        </p>

        {passages.length ? (
          <div className="gm-practice-section-list">
            {passages.map((passage, passageIndex) => (
              <section className="gm-practice-question-section rd-paper-section" key={passage.id || passageIndex}>
                <h3>
                  {SECTION_LABELS[passageIndex] || passageIndex + 1}、阅读理解 {PASSAGE_LABELS[passageIndex] || passageIndex + 1}篇
                  <span>（{passage.genre} · {passage.source}）</span>
                </h3>
                <div className="gm-practice-exercise">
                  <div className="gm-practice-exercise__meta">
                    <span>文章原文</span>
                    <button type="button" onClick={() => updatePassage(passageIndex, "passage", "")}>清空</button>
                  </div>
                  <textarea
                    className="rd-paper-passage-input"
                    rows={10}
                    value={passage.passage}
                    onChange={(event) => updatePassage(passageIndex, "passage", event.target.value)}
                    aria-label={`${PASSAGE_LABELS[passageIndex] || passageIndex + 1}篇原文`}
                  />
                </div>

                <div className="gm-practice-exercise-list">
                  {passage.questions.map((question, questionIndex) => (
                    <article className="gm-practice-exercise rd-paper-question" key={question.index || questionIndex}>
                      <div className="gm-practice-exercise__meta">
                        <span>{questionIndex + 1}. {question.type}</span>
                        {showAnswers || paperResult ? <span>答案：{question.answer}</span> : null}
                      </div>
                      <textarea
                        rows={2}
                        value={question.stem}
                        onChange={(event) => updateQuestion(passageIndex, questionIndex, "stem", event.target.value)}
                        aria-label={`${question.type}题干`}
                      />
                      <div className="rd-paper-option-list">
                        {question.options.map((option, optionIndex) => (
                          <input
                            key={`${question.index}-${optionIndex}`}
                            value={option}
                            onChange={(event) => updateOption(passageIndex, questionIndex, optionIndex, event.target.value)}
                            aria-label={`选项${optionIndex + 1}`}
                          />
                        ))}
                      </div>
                      {showAnswers ? (
                        <>
                          <input
                            value={question.answer}
                            onChange={(event) => updateQuestion(passageIndex, questionIndex, "answer", event.target.value.toUpperCase().slice(0, 1))}
                            aria-label={`${question.type}答案`}
                          />
                          <textarea
                            rows={3}
                            value={question.explanation || ""}
                            onChange={(event) => updateQuestion(passageIndex, questionIndex, "explanation", event.target.value)}
                            aria-label={`${question.type}解析`}
                          />
                        </>
                      ) : null}
                      <div className="rd-paper-answer-row" aria-label={`第${questionIndex + 1}题在线作答`}>
                        {["A", "B", "C", "D"].map((letter) => {
                          const key = `${passage.id || passageIndex}:${question.index || questionIndex}`;
                          const selected = paperAnswers[key] === letter;
                          const correct = paperResult && letter === question.answer;
                          const wrongSelected = paperResult && selected && letter !== question.answer;
                          return (
                            <label
                              key={letter}
                              className={[
                                "rd-paper-answer-chip",
                                selected ? "selected" : "",
                                correct ? "answer" : "",
                                wrongSelected ? "wrong" : "",
                              ].join(" ")}
                            >
                              <input
                                type="radio"
                                name={`paper-answer-${key}`}
                                value={letter}
                                checked={selected}
                                disabled={!!paperResult}
                                onChange={() => setPaperAnswers((current) => ({ ...current, [key]: letter }))}
                              />
                              {letter}
                            </label>
                          );
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="gm-practice-empty">选择文体、篇数和分值后，点击"生成组卷内容"。</p>
        )}
      </div>
      {passages.length ? (
        <div className="gm-practice-actions rd-paper-actions">
          {paperResult ? (
            <strong>本次得分：{paperResult.correct} / {paperResult.total}，{paperResult.score} 分</strong>
          ) : (
            <span>已作答 {Object.keys(paperAnswers).length} / {flatQuestions.length} 题</span>
          )}
          <button type="button" className="gm-btn-primary" onClick={onSubmitPaper} disabled={!!paperResult}>
            提交在线答题
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default function ReadingPaperPage({
  user, onNavigate, onAccountClick, onLogin, onRegister,
  activePage = "reading-paper",
  hideTopBar = false}) {
  const pageRef = useScrollReveal();
  const [genre, setGenre] = useState("随机");
  const stage = PAPER_STAGE;
  const difficulty = PAPER_DIFFICULTY;
  const [count, setCount] = useState(1);
  const [pickMode, setPickMode] = useState("passage"); // 'passage' 按文体抽整篇 | 'type' 按题型抽题
  const [selectedTypes, setSelectedTypes] = useState(["细节题", "推断题", "主旨题"]);
  const [questionsPerType, setQuestionsPerType] = useState(3);
  const [scorePerQuestion, setScorePerQuestion] = useState(2.5);
  const [fontSize, setFontSize] = useState(15);
  const [title, setTitle] = useState("阅读理解练习卷");
  const [showAnswers, setShowAnswers] = useState(false);
  const [passages, setPassages] = useState([]);
  const [paperAnswers, setPaperAnswers] = useState({});
  const [paperResult, setPaperResult] = useState(null);
  const [moduleTask, setModuleTask] = useState(readReadingPaperTask);
  const [taskSubmitError, setTaskSubmitError] = useState("");
  const startedAtRef = useRef(Date.now());

  const dateText = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  const estimateQuestions = useMemo(() => {
    if (pickMode === "type") {
      const t = selectedTypes.filter((x) => x !== "随机");
      const total = t.length ? t.length * questionsPerType : questionsPerType * 6;
      return total;
    }
    const pool = getPassagesByCount(genre, count);
    return pool.reduce((sum, passage) => sum + passage.questions.length, 0);
  }, [genre, count, pickMode, selectedTypes, questionsPerType]);
  const estimateScore = estimateQuestions * scorePerQuestion;

  function toggleType(type) {
    setSelectedTypes((current) => (
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type]
    ));
  }

  function handleGenerate() {
    let generated;
    if (pickMode === "type") {
      generated = getPaperByTypes({
        types: selectedTypes.filter((t) => t !== "随机"),
        questionsPerType,
        genre,
      });
      if (!generated.length) generated = getPassagesByCount(genre, 1);
    } else {
      generated = getPassagesByCount(genre, count);
    }
    setPassages(clonePassages(generated));
    setShowAnswers(false);
    setPaperAnswers({});
    setPaperResult(null);
    setTaskSubmitError("");
    startedAtRef.current = Date.now();
    window.requestAnimationFrame(() => {
      document.querySelector(".gm-practice-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleDownload(includeAnswers) {
    downloadWorksheet({ title, passages, dateText, stage, difficulty, scorePerQuestion, includeAnswers });
  }

  function handleSubmitPaper() {
    const flatQuestions = flattenPaperQuestions(passages);
    const missingCount = flatQuestions.filter((item) => !paperAnswers[item.key]).length;
    if (missingCount) {
      setTaskSubmitError(`还有 ${missingCount} 题未作答。`);
      return;
    }

    const answers = flatQuestions.map(({ passage, question, questionIndex, key }) => {
      const selected = paperAnswers[key];
      return {
        passageId: passage.id,
        questionIndex: question.index || questionIndex + 1,
        questionType: question.type,
        selected,
        answer: question.answer,
        correct: selected === question.answer,
      };
    });
    const correctCount = answers.filter((item) => item.correct).length;
    const totalCount = answers.length;
    const score = totalCount ? Math.round((correctCount / totalCount) * 100) : 0;
    const wrongItems = flatQuestions
      .filter(({ key, question }) => paperAnswers[key] !== question.answer)
      .map(({ passage, question, questionIndex, key }) => ({
        passageId: passage.id,
        source: passage.source,
        questionIndex: question.index || questionIndex + 1,
        questionType: question.type,
        stem: question.stem,
        selected: paperAnswers[key],
        answer: question.answer,
      }));

    setTaskSubmitError("");
    setPaperResult({ correct: correctCount, total: totalCount, score });
    if (!user?.id) return;

    readingAPI.recordPractice({
      mode: "paper",
      genre,
      passageIds: passages.map((passage) => passage.id).filter(Boolean),
      correctCount,
      totalCount,
      answers,
      wrongItems,
      durationMs: Date.now() - startedAtRef.current,
    }).then(() => {
      if (!moduleTask?.id) return null;
      return moduleAssignmentsAPI.submit(moduleTask.id).then(() => {
        clearModuleTaskContext();
        setModuleTask(null);
      });
    }).catch((error) => {
      setTaskSubmitError(error?.message || "题卷记录保存失败，请稍后重试。");
      setPaperResult(null);
    });
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

      <main className="gm-work-page gm-practice-builder-page rd-paper-page">
        <PageHero
          eyebrow="筑巢阅读 · 题库组卷"
          title="题库组卷，打印练习。"
          description="按文体从阅读题库抽取材料，生成可编辑、可下载、可打印的阅读理解练习单。"
        />

        <PaperSettings
          genre={genre}
          setGenre={setGenre}
          count={count}
          setCount={setCount}
          pickMode={pickMode}
          setPickMode={setPickMode}
          selectedTypes={selectedTypes}
          toggleType={toggleType}
          questionsPerType={questionsPerType}
          setQuestionsPerType={setQuestionsPerType}
          scorePerQuestion={scorePerQuestion}
          setScorePerQuestion={setScorePerQuestion}
          totalQuestions={estimateQuestions}
          totalScore={estimateScore}
          onGenerate={handleGenerate}
          onNavigate={onNavigate}
        />
        {taskSubmitError && (
          <div style={{ margin: "12px 0", color: "#8a2a1a", fontSize: 13, fontWeight: 700 }}>
            {taskSubmitError}
          </div>
        )}

        <PaperOutput
          passages={passages}
          setPassages={setPassages}
          title={title}
          setTitle={setTitle}
          fontSize={fontSize}
          setFontSize={setFontSize}
          scorePerQuestion={scorePerQuestion}
          stage={stage}
          difficulty={difficulty}
          dateText={dateText}
          showAnswers={showAnswers}
          setShowAnswers={setShowAnswers}
          paperAnswers={paperAnswers}
          setPaperAnswers={setPaperAnswers}
          paperResult={paperResult}
          onDownload={handleDownload}
          onSubmitPaper={handleSubmitPaper}
        />
      </main>
    </div>
  );
}
