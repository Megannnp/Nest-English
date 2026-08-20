import { useMemo, useState } from "react";

import GrammarTopBar from "./GrammarTopBar.jsx";
import { GRAMMAR_POINT_CATALOG } from "../../../shared/grammar/grammarPointCatalog.js";
import { grammarAPI } from "../api/index.js";
import { getPrepExam, getPrepExamSystemId } from "../app/prepExamConfig.js";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./grammar.css";

const QUESTION_TYPES = [
  { id: "choice", label: "选择题" },
  { id: "blank", label: "填空题" },
  { id: "correction", label: "改错题" },
  { id: "translation", label: "翻译题" },
];

const STAGES = ["小学", "初中", "高中"];
const DIFFICULTIES = ["易", "中", "难"];
const DEFAULT_TYPE_CONFIGS = [
  { type: "blank", count: 4, points: 2 },
  { type: "choice", count: 4, points: 2 },
];

const SECTION_NUMERALS = ["一", "二", "三", "四", "五", "六"];

function flattenGrammarPoints() {
  return GRAMMAR_POINT_CATALOG.flatMap((group) =>
    group.children.map((point) => ({ ...point, groupLabel: group.label }))
  );
}

function loadPracticeSeed(points) {
  try {
    const seed = JSON.parse(sessionStorage.getItem("nestGrammarPracticeSeed") || "{}");
    if (seed?.grammarPointLabel) {
      sessionStorage.removeItem("nestGrammarPracticeSeed");
      return seed;
    }
  } catch {
    // Ignore malformed storage and use defaults.
  }
  const first = points.find((point) => point.id === "relative_clause") || points[0];
  return {
    grammarPointId: first?.id || "relative_clause",
    grammarPointLabel: first?.label || "定语从句",
    sentence: "The scientists who discovered the new element were awarded the Nobel Prize.",
  };
}

function moveItem(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function groupExercises(exercises, typeConfigs) {
  return typeConfigs
    .map((config) => {
      const items = exercises.filter((item) => item.type === config.type);
      return {
        ...config,
        typeLabel: getTypeLabel(config.type),
        items,
        totalScore: items.length * config.points,
      };
    })
    .filter((group) => group.items.length);
}

function getTypeLabel(typeId) {
  return QUESTION_TYPES.find((item) => item.id === typeId)?.label || typeId;
}

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(target, value) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(target, value) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function createStoredZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const checksum = crc32(dataBytes);
    const local = [];
    writeUint32(local, 0x04034b50);
    writeUint16(local, 20);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint16(local, 0);
    writeUint32(local, checksum);
    writeUint32(local, dataBytes.length);
    writeUint32(local, dataBytes.length);
    writeUint16(local, nameBytes.length);
    writeUint16(local, 0);
    chunks.push(new Uint8Array(local), nameBytes, dataBytes);

    const central = [];
    writeUint32(central, 0x02014b50);
    writeUint16(central, 20);
    writeUint16(central, 20);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, checksum);
    writeUint32(central, dataBytes.length);
    writeUint32(central, dataBytes.length);
    writeUint16(central, nameBytes.length);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint16(central, 0);
    writeUint32(central, 0);
    writeUint32(central, offset);
    centralDirectory.push(new Uint8Array(central), nameBytes);
    offset += local.length + nameBytes.length + dataBytes.length;
  });

  const centralStart = offset;
  const centralSize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = [];
  writeUint32(end, 0x06054b50);
  writeUint16(end, 0);
  writeUint16(end, 0);
  writeUint16(end, files.length);
  writeUint16(end, files.length);
  writeUint32(end, centralSize);
  writeUint32(end, centralStart);
  writeUint16(end, 0);
  return new Blob([...chunks, ...centralDirectory, new Uint8Array(end)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

function wordParagraph(text, { bold = false, align = 'left', size = 24 } = {}) {
  const lines = String(text || '').split('\n');
  return lines.map((line) => `
    <w:p>
      <w:pPr>
        <w:jc w:val="${align}"/>
        <w:spacing w:before="0" w:after="0" w:line="360" w:lineRule="auto"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          ${bold ? '<w:b/>' : ''}
          <w:sz w:val="${size}"/>
          <w:szCs w:val="${size}"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(line)}</w:t>
      </w:r>
    </w:p>
  `).join('');
}

function downloadWordDocument({ title, grammarPointLabel, stage, difficulty, totalScore, dateText, exerciseGroups, fontSize, includeAnswers = false }) {
  const safeTitle = title?.trim() || '语法专项练习';
  const wordSize = Math.round(fontSize * 2);
  const titleSize = Math.round(Math.max(fontSize + 8, 20) * 2);
  const bodyXml = exerciseGroups.map((group, groupIndex) => {
    const groupTitle = `${SECTION_NUMERALS[groupIndex] || groupIndex + 1}、${group.typeLabel}（共${group.items.length}题，每小题${group.points}分，共${group.totalScore}分）`;
    return [
      wordParagraph(groupTitle, { bold: true, size: wordSize }),
      ...group.items.flatMap((item, itemIndex) => {
        const lines = String(item.prompt || '').split('\n').filter(Boolean);
        return [
          wordParagraph(`${itemIndex + 1}. 考点：${item.focus || grammarPointLabel}`, { bold: true, size: wordSize }),
          ...lines.map((line) => wordParagraph(line, { size: wordSize })),
          ...(includeAnswers
            ? [
                wordParagraph(`答案：${item.answer}`, { bold: true, size: wordSize }),
                wordParagraph(`解析：${item.explanation}`, { size: wordSize }),
              ]
            : []),
        ];
      }),
    ].join('');
  }).join('');
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
      <w:body>
        ${wordParagraph(safeTitle, { bold: true, align: 'center', size: titleSize })}
        ${wordParagraph(`班级：__________    姓名：__________    ${dateText}`, { align: 'right', size: wordSize })}
        ${wordParagraph(`语法点：${grammarPointLabel} · 学习阶段：${stage} · 难度：${difficulty} · 共 ${exerciseGroups.reduce((sum, group) => sum + group.items.length, 0)} 题 · 满分 ${totalScore} 分`, { size: wordSize })}
        ${bodyXml}
        <w:sectPr>
          <w:pgSz w:w="11906" w:h="16838"/>
          <w:pgMar w:top="1020" w:right="963" w:bottom="1020" w:left="963" w:header="708" w:footer="708" w:gutter="0"/>
        </w:sectPr>
      </w:body>
    </w:document>`;
  const blob = createStoredZip([
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
          <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
          <Default Extension="xml" ContentType="application/xml"/>
          <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
        </Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
        </Relationships>`,
    },
    { name: 'word/document.xml', content: documentXml },
  ]);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${safeTitle.replace(/[\\/:*?"<>|]/g, '_')}${includeAnswers ? '-答案解析' : '-题目'}.docx`;
  document.body.appendChild(link);
  link.click();
  URL.revokeObjectURL(link.href);
  link.remove();
}

function TypeConfigRow({ config, index, draggingIndex, onDragStart, onDragEnter, onDragEnd, onChange, onRemove }) {
  return (
    <div
      className={`gm-type-config-row${draggingIndex === index ? " is-dragging" : ""}`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnter={() => onDragEnter(index)}
      onDragOver={(event) => event.preventDefault()}
      onDragEnd={onDragEnd}
    >
      <span className="gm-type-config-row__handle" aria-hidden="true">⋮⋮</span>
      <strong>{getTypeLabel(config.type)}</strong>
      <label>
        <span>题数</span>
        <input
          type="number"
          min="1"
          max="30"
          value={config.count}
          onChange={(event) => onChange(index, { count: Number(event.target.value) || 1 })}
        />
      </label>
      <label>
        <span>每题分</span>
        <input
          type="number"
          min="1"
          max="20"
          value={config.points}
          onChange={(event) => onChange(index, { points: Number(event.target.value) || 1 })}
        />
      </label>
      <span className="gm-type-config-row__total">{config.count * config.points} 分</span>
      <button type="button" onClick={() => onRemove(config.type)}>删除</button>
    </div>
  );
}

function PracticeOutputSection({ practiceMode, exercises, exerciseGroups, grammarPointLabel, stage, difficulty, totalCount, totalScore, dateText, fontSize, title, setTitle, setFontSize, handleExportWord, deleteExercise, updateExercise }) {
  return (
    <section className="gm-practice-builder gm-practice-output studio-reveal studio-reveal--delay-2">
      <div className="gm-practice-builder__header">
        <div>
          <p className="gm-hero__kicker">{practiceMode === "online" ? "Online Practice" : "Worksheet"}</p>
          <h2>{practiceMode === "online" ? "即学即练，举一反三。" : "练习单编辑"}</h2>
        </div>
        {practiceMode === "worksheet" ? (
          <div className="gm-practice-output__tools">
            <label>
              标题
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              字号
              <input type="range" min="13" max="20" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} />
            </label>
            <div className="gm-practice-downloads" aria-label="下载 Word">
              <span>下载</span>
              <button type="button" className="gm-btn-secondary" onClick={() => handleExportWord(false)} disabled={!exercises.length}>
                下载题目
              </button>
              <button type="button" className="gm-btn-secondary" onClick={() => handleExportWord(true)} disabled={!exercises.length}>
                下载答案
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="gm-practice-paper" style={{ "--practice-font-size": `${fontSize}px` }}>
        <div className="gm-practice-paper__top">
          <h1>{title || "语法专项练习"}</h1>
          <div>
            <span>班级：__________</span>
            <span>姓名：__________</span>
            <span>{dateText}</span>
          </div>
        </div>
        <p className="gm-practice-paper__meta">
          语法点：{grammarPointLabel} · 学习阶段：{stage} · 难度：{difficulty} · 共 {exercises.length || totalCount} 题 · 满分 {totalScore} 分
        </p>

        {exercises.length ? (
          <div className="gm-practice-section-list">
            {exerciseGroups.map((group, groupIndex) => (
              <section className="gm-practice-question-section" key={group.type}>
                <h3>
                  {SECTION_NUMERALS[groupIndex] || groupIndex + 1}、{group.typeLabel}
                  <span>（共{group.items.length}题，每小题{group.points}分，共{group.totalScore}分）</span>
                </h3>
                <div className="gm-practice-exercise-list">
                  {group.items.map((item, itemIndex) => (
                    <article className="gm-practice-exercise" key={item.id}>
                      <div className="gm-practice-exercise__meta">
                        <span>{itemIndex + 1}. 考点：{item.focus || grammarPointLabel}</span>
                        <button type="button" onClick={() => deleteExercise(item.id)}>删除</button>
                      </div>
                      <textarea
                        rows={3}
                        value={item.prompt}
                        onChange={(event) => updateExercise(item.id, "prompt", event.target.value)}
                        aria-label={`${item.typeLabel}题干`}
                      />
                      <input
                        value={item.answer}
                        onChange={(event) => updateExercise(item.id, "answer", event.target.value)}
                        aria-label={`${item.typeLabel}答案`}
                      />
                      <textarea
                        rows={3}
                        value={item.explanation}
                        onChange={(event) => updateExercise(item.id, "explanation", event.target.value)}
                        aria-label={`${item.typeLabel}解析`}
                      />
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="gm-practice-empty">选择题量、题型、阶段和难度后，点击"生成相应语法题目"。</p>
        )}
      </div>
    </section>
  );
}

function resolveSelectedPracticePoint(points, seed) {
  return points.find((point) => point.id === seed.grammarPointId)
    || points.find((point) => point.label === seed.grammarPointLabel);
}

function resolveGrammarPointLabel(selectedPoint, seed) {
  return selectedPoint?.label || seed.grammarPointLabel || "定语从句";
}

export default function GrammarPracticePage({
  onNavigate, user, onLoginClick, onRegisterClick, activePage = "grammar-practice", onAccountClick,
  prepExamId = "",
  hideTopBar = false,
}) {
  const pageRef = useScrollReveal();
  const points = useMemo(() => flattenGrammarPoints(), []);
  const [seed, setSeed] = useState(() => loadPracticeSeed(points));
  const [typeConfigs, setTypeConfigs] = useState(DEFAULT_TYPE_CONFIGS);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [stage, setStage] = useState("初中");
  const [difficulty, setDifficulty] = useState("中");
  const practiceMode = "worksheet";
  const [fontSize, setFontSize] = useState(15);
  const [title, setTitle] = useState("语法专项练习");
  const [exercises, setExercises] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const prepExam = getPrepExam(prepExamId);
  const systemId = getPrepExamSystemId(prepExamId);

  const selectedPoint = resolveSelectedPracticePoint(points, seed);
  const grammarPointLabel = resolveGrammarPointLabel(selectedPoint, seed);
  const dateText = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  const totalCount = typeConfigs.reduce((sum, item) => sum + item.count, 0);
  const totalScore = typeConfigs.reduce((sum, item) => sum + item.count * item.points, 0);
  const exerciseGroups = useMemo(() => groupExercises(exercises, typeConfigs), [exercises, typeConfigs]);

  function toggleType(typeId) {
    setTypeConfigs((current) => {
      if (current.some((item) => item.type === typeId)) {
        return current.length > 1 ? current.filter((item) => item.type !== typeId) : current;
      }
      return [...current, { type: typeId, count: 3, points: 2 }];
    });
  }

  function updateTypeConfig(index, patch) {
    setTypeConfigs((current) => current.map((item, itemIndex) => (
      itemIndex === index
        ? {
            ...item,
            ...patch,
            count: Math.max(1, Math.min(30, Number(patch.count ?? item.count))),
            points: Math.max(1, Math.min(20, Number(patch.points ?? item.points))),
          }
        : item
    )));
  }

  function removeTypeConfig(typeId) {
    setTypeConfigs((current) => current.length > 1 ? current.filter((item) => item.type !== typeId) : current);
  }

  function handleDragEnter(targetIndex) {
    if (draggingIndex === null || draggingIndex === targetIndex) return;
    setTypeConfigs((current) => moveItem(current, draggingIndex, targetIndex));
    setDraggingIndex(targetIndex);
  }

  async function handleGenerate() {
    setGenerationError("");
    setGenerating(true);
    try {
      const result = await grammarAPI.generatePractice({
        grammarPoint: grammarPointLabel,
        typeConfigs,
        stage,
        difficulty,
        sourceSentence: seed.sentence,
        prepExamId,
        prepExamLabel: prepExam.label,
        systemId,
      });
      if (!Array.isArray(result)) throw new Error("数据格式错误");
      setExercises(result);
    } catch (error) {
      setExercises([]);
      if (!user && (error?.statusCode === 401 || error?.statusCode === 429 || error?.code === 429)) {
        setGenerationError("游客试用次数已用完，请登录后继续生成练习题。");
        onLoginClick?.();
        return;
      }
      setGenerationError(error?.message || "题目生成失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  }

  function updateExercise(id, field, value) {
    setExercises((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  function deleteExercise(id) {
    setExercises((current) => current.filter((item) => item.id !== id));
  }

  function handleExportWord(includeAnswers = false) {
    downloadWordDocument({
      title,
      grammarPointLabel,
      stage,
      difficulty,
      totalScore,
      dateText,
      exerciseGroups,
      fontSize,
      includeAnswers,
    });
  }

  return (
    <div className="gm-page" ref={pageRef}>
      {!hideTopBar && (

        <GrammarTopBar
        onLogin={onLoginClick || (() => onNavigate?.("auth"))}
        onRegister={onRegisterClick || (() => onNavigate?.("auth"))}
        user={user}
        onNavigate={onNavigate}
        activePage={activePage}
        onAccountClick={onAccountClick}
      />

      )}

      <main className="gm-work-page gm-practice-builder-page">
        <PageHero
          eyebrow="筑巢语法 · 练习"
          title="练出手感，考场不慌。"
          description={
            <>
              当前语法点：<strong>{grammarPointLabel}</strong>
              {seed.sentence ? ` · 来源句子：${seed.sentence}` : ""}
            </>
          }
        />

        <section className="gm-practice-builder studio-reveal studio-reveal--delay-1">
          <div className="gm-practice-builder__header">
            <div>
              <p className="gm-hero__kicker">Practice Setup</p>
              <h2>生成设置</h2>
              <p className="gm-practice-summary">合计 {totalCount} 题 · {totalScore} 分</p>
            </div>
          </div>

          <div className="gm-practice-controls">
            <label>
              <span>语法点</span>
              <select
                value={selectedPoint?.id || seed.grammarPointId || ""}
                onChange={(event) => {
                  const nextPoint = points.find((point) => point.id === event.target.value);
                  if (!nextPoint) return;
                  setSeed((current) => ({
                    ...current,
                    grammarPointId: nextPoint.id,
                    grammarPointLabel: nextPoint.label,
                  }));
                }}
              >
                {points.map((point) => (
                  <option key={point.id} value={point.id}>
                    {point.groupLabel} · {point.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>学习阶段</span>
              <div className="gm-segmented">
                {STAGES.map((item) => (
                  <button type="button" key={item} className={stage === item ? "is-active" : ""} onClick={() => setStage(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </label>

            <label>
              <span>难度</span>
              <div className="gm-segmented">
                {DIFFICULTIES.map((item) => (
                  <button type="button" key={item} className={difficulty === item ? "is-active" : ""} onClick={() => setDifficulty(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </label>
          </div>

          <div className="gm-practice-type-palette">
            <span>题型选择</span>
            <div className="gm-practice-type-options">
              {QUESTION_TYPES.map((type) => (
                <button
                  type="button"
                  key={type.id}
                  className={typeConfigs.some((item) => item.type === type.id) ? "is-active" : ""}
                  onClick={() => toggleType(type.id)}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="gm-practice-type-table">
            <div className="gm-practice-type-table__head">
              <span>拖动排序</span>
              <span>题型</span>
              <span>题数</span>
              <span>每题分</span>
              <span>总分</span>
              <span>操作</span>
            </div>
            {typeConfigs.map((config, index) => (
              <TypeConfigRow
                key={config.type}
                config={config}
                index={index}
                draggingIndex={draggingIndex}
                onDragStart={setDraggingIndex}
                onDragEnter={handleDragEnter}
                onDragEnd={() => setDraggingIndex(null)}
                onChange={updateTypeConfig}
                onRemove={removeTypeConfig}
              />
            ))}
          </div>

          <div className="gm-practice-actions">
              <button type="button" className="gm-btn-primary" aria-label={generating ? "AI 生成中" : "生成题卷内容"} onClick={handleGenerate} disabled={generating}>
              {generating ? "AI 生成中..." : "生成题卷内容"}
            </button>
            <button type="button" className="gm-btn-secondary" onClick={() => onNavigate?.("grammar-courses")}>
              查看语法讲解
            </button>
          </div>
          {generationError ? <div className="gm-analyzer-error" role="alert">{generationError}</div> : null}
        </section>

        <PracticeOutputSection
          practiceMode={practiceMode}
          exercises={exercises}
          exerciseGroups={exerciseGroups}
          grammarPointLabel={grammarPointLabel}
          stage={stage}
          difficulty={difficulty}
          totalCount={totalCount}
          totalScore={totalScore}
          dateText={dateText}
          fontSize={fontSize}
          title={title}
          setTitle={setTitle}
          setFontSize={setFontSize}
          handleExportWord={handleExportWord}
          deleteExercise={deleteExercise}
          updateExercise={updateExercise}
        />
      </main>
    </div>
  );
}
