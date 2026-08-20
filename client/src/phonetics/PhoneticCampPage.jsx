
import { useEffect, useMemo, useRef, useState } from "react";

import {
  PHONETIC_CAMP_APPENDIX,
  PHONETIC_CAMP_DAYS,
  PHONETIC_CAMP_DIRECTORY,
  PHONETIC_CAMP_SUPPLEMENT,
} from "./phoneticCampData.js";
import PhoneticTopBar from "./PhoneticTopBar.jsx";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import { createRealtimeAsrSession } from "../writing/core/realtimeAsrClient.js";
import "./phonetics.css";

function normalizeAnswer(value) {
  return String(value || "").trim().toLowerCase().replace(/[,.?!，。？！]/g, "").replace(/\s+/g, "");
}

function buildStoryText(story) {
  return (story?.paragraphs || []).join(" ");
}

function tokenizeEnglish(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function formatDuration(ms) {
  const seconds = Math.max(0, Math.round((ms || 0) / 1000));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest} 秒`;
}

function alignReadingWords(expectedWords, actualWords) {
  const rows = expectedWords.length + 1;
  const cols = actualWords.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let row = 1; row < rows; row += 1) dp[row][0] = row;
  for (let col = 1; col < cols; col += 1) dp[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const replaceCost = expectedWords[row - 1] === actualWords[col - 1] ? 0 : 1;
      dp[row][col] = Math.min(
        dp[row - 1][col] + 1,
        dp[row][col - 1] + 1,
        dp[row - 1][col - 1] + replaceCost,
      );
    }
  }

  let row = expectedWords.length;
  let col = actualWords.length;
  const operations = [];
  while (row > 0 || col > 0) {
    if (row > 0 && col > 0) {
      const replaceCost = expectedWords[row - 1] === actualWords[col - 1] ? 0 : 1;
      if (dp[row][col] === dp[row - 1][col - 1] + replaceCost) {
        operations.unshift({
          type: replaceCost ? "replace" : "match",
          expected: expectedWords[row - 1],
          actual: actualWords[col - 1],
        });
        row -= 1;
        col -= 1;
        continue;
      }
    }
    if (row > 0 && dp[row][col] === dp[row - 1][col] + 1) {
      operations.unshift({ type: "missing", expected: expectedWords[row - 1] });
      row -= 1;
      continue;
    }
    operations.unshift({ type: "extra", actual: actualWords[col - 1] });
    col -= 1;
  }

  const matchedCount = operations.filter((item) => item.type === "match").length;
  const missingWords = operations.filter((item) => item.type === "missing").map((item) => item.expected);
  const extraWords = operations.filter((item) => item.type === "extra").map((item) => item.actual);
  const substitutions = operations
    .filter((item) => item.type === "replace")
    .map((item) => ({ expected: item.expected, actual: item.actual }));
  return { matchedCount, missingWords, extraWords, substitutions };
}

function summarizeWords(words, limit = 6) {
  if (!words.length) return "";
  const visible = words.slice(0, limit).join("、");
  return words.length > limit ? `${visible} 等 ${words.length} 个` : visible;
}

function summarizeSubstitutions(items, limit = 4) {
  if (!items.length) return "";
  const visible = items.slice(0, limit).map((item) => `${item.expected}→${item.actual}`).join("、");
  return items.length > limit ? `${visible} 等 ${items.length} 处` : visible;
}

function supportsRealtimeAsr() {
  if (typeof window === "undefined") return false;
  return Boolean(navigator.mediaDevices?.getUserMedia && window.WebSocket && (window.AudioContext || window.webkitAudioContext));
}

function appendTranscript(baseText, transcript) {
  const cleanBase = String(baseText || "").trim();
  const cleanTranscript = String(transcript || "").trim();
  return [cleanBase, cleanTranscript].filter(Boolean).join(cleanBase ? "\n" : "");
}

function getAsrSegmentTranscript(message) {
  return message.utteranceText || message.definiteText || "";
}

function scoreReading({ referenceText, transcript, durationMs, focus = [] }) {
  const expectedWords = tokenizeEnglish(referenceText);
  const actualWords = tokenizeEnglish(transcript);
  const expectedCount = Math.max(expectedWords.length, 1);
  const { matchedCount, missingWords, extraWords, substitutions } = alignReadingWords(expectedWords, actualWords);
  const accuracy = matchedCount / expectedCount;
  const missingCount = missingWords.length + substitutions.length;
  const completion = Math.max(0, (expectedWords.length - missingCount) / expectedCount);
  const precision = actualWords.length ? matchedCount / actualWords.length : 0;
  const wordsPerSecond = durationMs > 0 ? actualWords.length / Math.max(durationMs / 1000, 1) : 0;
  const fluencyRatio = durationMs > 0 ? Math.max(0, 1 - Math.abs(wordsPerSecond - 2.15) / 2.15) : 0.55;
  const focusScore = focus.length ? 5 : 3;
  const score = Math.max(0, Math.min(100, Math.round((accuracy * 45) + (completion * 25) + (precision * 10) + (fluencyRatio * 15) + focusScore)));
  const reviewWords = [...missingWords, ...substitutions.map((item) => item.expected)];
  const feedback = [
    accuracy >= 0.86 ? "这遍读得比较完整，句子的顺序和主要词都稳住了。" : "这遍先放慢一点，按原文顺序一句一句跟住。",
    completion >= 0.9 ? "整句基本读完整了，下一遍可以把停顿和重音读得更清楚。" : `下一遍先把这些词补稳：${summarizeWords(reviewWords) || "原文里读漏的部分"}。`,
    substitutions.length ? `这几处请回到原文再跟读一遍：${summarizeSubstitutions(substitutions)}。` : "词没有明显读串，保持这个准确度。",
    extraWords.length ? `这遍多带出了这些词：${summarizeWords(extraWords)}；下一遍照着原句收紧。` : "没有明显多加内容，朗读比较干净。",
    wordsPerSecond
      ? `这遍语速约 ${wordsPerSecond.toFixed(1)} 词/秒；如果有点赶，就在意群之间轻轻停一下。`
      : "这遍时长还不稳定，先完整录完一句再评分。",
    focus.length ? `回听时重点照顾：${focus.join("；")}。` : "回听时重点照顾重读、停顿、连读和句末语调。",
  ];
  return {
    score,
    matchedCount,
    expectedCount,
    reviewCount: expectedWords.length - matchedCount,
    wordCount: actualWords.length,
    durationText: formatDuration(durationMs),
    feedback,
  };
}

function CampDrill({ drill }) {
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);
  const correctCount = drill.items.filter((item) => normalizeAnswer(answers[item.prompt]) === normalizeAnswer(item.answer)).length;

  function updateAnswer(prompt, value) {
    setChecked(false);
    setAnswers((current) => ({ ...current, [prompt]: value }));
  }

  return (
    <section className="ph-camp-drill" aria-label={drill.title}>
      <div className="ph-camp-drill__head">
        <div>
          <h3>{drill.title}</h3>
          {drill.helper ? <p>{drill.helper}</p> : null}
        </div>
        <button type="button" className="ph-camp-drill__check" onClick={() => setChecked(true)}>
          检查答案
        </button>
      </div>
      <div className="ph-camp-drill__items">
        {drill.items.map((item) => {
          const value = answers[item.prompt] || "";
          const isCorrect = normalizeAnswer(value) === normalizeAnswer(item.answer);
          return (
            <label className={`ph-camp-drill__item${checked ? (isCorrect ? " is-correct" : " is-wrong") : ""}`} key={item.prompt}>
              <span>{item.prompt}</span>
              {drill.type === "classify" ? (
                <select value={value} onChange={(event) => updateAnswer(item.prompt, event.target.value)}>
                  <option value="">选择分类</option>
                  {drill.options.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : (
                <input value={value} onChange={(event) => updateAnswer(item.prompt, event.target.value)} placeholder="输入答案" />
              )}
              {checked ? <em>{isCorrect ? "正确" : `答案：${item.answer}`}</em> : null}
            </label>
          );
        })}
      </div>
      {checked ? <div className="ph-camp-drill__score">{correctCount} / {drill.items.length} 正确</div> : null}
    </section>
  );
}

function buildExerciseReadingText(section) {
  if (section.type === "readingAssessment") {
    return section.prompt || "";
  }
  if (section.type === "readTable") {
    return (section.items || []).map((item) => item.word).join(". ");
  }
  if (!/跟读|朗读/.test(section.instruction || "")) return "";
  return (section.items || [])
    .map((item) => (typeof item === "string" ? item : item.prompt))
    .filter(Boolean)
    .join(" ");
}

function getSentenceText(item) {
  return typeof item === "string" ? item : item.prompt;
}

function splitSentenceTokens(sentence) {
  return String(sentence || "").match(/[A-Za-z']+|[0-9]+|[^\sA-Za-z0-9']/g) || [];
}

function splitSentenceParts(sentence) {
  return String(sentence || "").match(/[A-Za-z']+|[0-9]+|\s+|[^\sA-Za-z0-9']/g) || [];
}

function isMarkableToken(token) {
  return /[A-Za-z0-9]/.test(token);
}

function markSymbol(mark) {
  return String(mark || "").split(/\s+/)[0];
}

function isLinkingMark(mark) {
  return /连读/.test(mark || "");
}

function isPlosionMark(mark) {
  return /失爆/.test(mark || "");
}

function isPauseMark(mark) {
  return /停顿/.test(mark || "");
}

function buildMarkKeyLookup(sentence) {
  const parts = splitSentenceParts(sentence);
  const words = [];
  const gaps = [];
  const letters = [];
  let wordIndex = -1;

  function nearestWordIndex(fromIndex, direction) {
    for (let index = fromIndex + direction; index >= 0 && index < parts.length; index += direction) {
      if (/^\s+$/.test(parts[index])) continue;
      if (isMarkableToken(parts[index])) return words.findIndex((word) => word.partIndex === index);
    }
    return -1;
  }

  parts.forEach((part, partIndex) => {
    if (!isMarkableToken(part)) return;
    wordIndex += 1;
    words.push({
      text: part.toLowerCase(),
      key: wordIndex,
      partIndex,
    });
    letters.push({
      text: part.toLowerCase(),
      key: `letter:${partIndex}`,
      partIndex,
    });
  });

  parts.forEach((part, partIndex) => {
    if (!/^\s+$/.test(part)) return;
    const before = nearestWordIndex(partIndex, -1);
    const after = nearestWordIndex(partIndex, 1);
    if (before >= 0 && after >= 0) {
      gaps.push({
        before: words[before].text,
        after: words[after].text,
        key: `gap:${partIndex}`,
      });
    }
  });

  return { words, gaps, letters };
}

function takeOrderedWordKeys(lookup, rawWords) {
  const used = new Set();
  return rawWords
    .map((word) => {
      const normalized = word.toLowerCase();
      const match = lookup.words.find((candidate) => candidate.text === normalized && !used.has(candidate.key));
      if (!match) return null;
      used.add(match.key);
      return match.key;
    })
    .filter((key) => key !== null);
}

function extractMarkedWords(answer, symbol) {
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...String(answer || "").matchAll(new RegExp(`${escaped}\\s*([^；。]+)`, "g"))];
  return matches.flatMap((match) => tokenizeEnglish(match[1]));
}

function extractMarkedGaps(sentence, markedText, symbol) {
  const lookup = buildMarkKeyLookup(sentence);
  const tokens = String(markedText || "").match(/[A-Za-z']+|[‿/]/g) || [];
  const pairs = [];
  for (let index = 1; index < tokens.length - 1; index += 1) {
    if (tokens[index] !== symbol || !/[A-Za-z']/.test(tokens[index - 1]) || !/[A-Za-z']/.test(tokens[index + 1])) continue;
    pairs.push([tokens[index - 1].toLowerCase(), tokens[index + 1].toLowerCase()]);
  }
  const used = new Set();
  return pairs
    .map(([before, after]) => {
      const match = lookup.gaps.find((gap) => gap.before === before && gap.after === after && !used.has(gap.key));
      if (!match) return null;
      used.add(match.key);
      return match.key;
    })
    .filter(Boolean);
}

function extractMarkedLetters(sentence, answer) {
  const lookup = buildMarkKeyLookup(sentence);
  const markedWords = [...String(answer || "").matchAll(/([A-Za-z']+)̚/g)].map((match) => match[1].toLowerCase());
  const used = new Set();
  return markedWords
    .map((word) => {
      const match = lookup.letters.find((letter) => letter.text === word && !used.has(letter.key));
      if (!match) return null;
      used.add(match.key);
      return match.key;
    })
    .filter(Boolean);
}

function getExpectedSentenceMarks(section, item) {
  const sentence = getSentenceText(item);
  const answer = item?.answer || "";
  const firstClause = answer.split("；")[0] || answer;
  const expected = {};
  const lookup = buildMarkKeyLookup(sentence);

  section.markOptions?.forEach((option) => {
    const symbol = markSymbol(option);
    let keys = [];
    if (isLinkingMark(option)) keys = extractMarkedGaps(sentence, answer, symbol);
    else if (isPauseMark(option)) keys = extractMarkedGaps(sentence, firstClause, symbol);
    else if (isPlosionMark(option)) keys = extractMarkedLetters(sentence, answer);
    else keys = takeOrderedWordKeys(lookup, extractMarkedWords(answer, symbol));
    keys.forEach((key) => {
      expected[key] = option;
    });
  });

  return expected;
}

function describeSentenceMarkTarget(sentence, key) {
  const lookup = buildMarkKeyLookup(sentence);
  const normalizedKey = String(key);
  const gap = lookup.gaps.find((item) => item.key === normalizedKey);
  if (gap) return `点击 ${gap.before} 与 ${gap.after} 中间`;
  const letter = lookup.letters.find((item) => item.key === normalizedKey);
  if (letter) return `点击 ${letter.text} 的最后一个字母`;
  const word = lookup.words.find((item) => String(item.key) === normalizedKey);
  if (word) return `选择 ${word.text}`;
  return normalizedKey;
}

function buildSentenceMarkResult(section, answers) {
  const answerItems = [];

  (section.items || []).forEach((item) => {
    if (typeof item !== "object" || !item.answer) return;
    const sentence = getSentenceText(item);
    const expected = getExpectedSentenceMarks(section, item);
    const submitted = answers[`sentence:${sentence}`] || {};
    const expectedKeys = Object.keys(expected);
    const submittedKeys = Object.keys(submitted).filter((key) => submitted[key]);
    const allKeys = [...new Set([...expectedKeys, ...submittedKeys])];

    allKeys.forEach((key) => {
      const userAnswer = submitted[key] || "未标记";
      const answer = expected[key] || "不应标记";
      answerItems.push({
        prompt: `${sentence}｜${describeSentenceMarkTarget(sentence, key)}`,
        userAnswer: userAnswer === "未标记" ? userAnswer : markSymbol(userAnswer),
        answer: answer === "不应标记" ? answer : markSymbol(answer),
        isCorrect: userAnswer === answer,
      });
    });
  });

  return answerItems;
}

function getItemKey(item) {
  return item.id || item.prompt;
}

function getItemPrompt(item) {
  return item.group ? `${item.group}｜${item.prompt}` : item.prompt;
}

function getSubmittedAnswer(section, answers, item) {
  const value = answers[getItemKey(item)];
  if (section.type === "circleSelect") return value || "不圈";
  return value;
}

function buildExerciseResult(section, answers) {
  const sentenceAnswerItems = section.type === "sentenceMark" ? buildSentenceMarkResult(section, answers) : [];
  const gradableItems = (section.items || []).filter((item) => section.type !== "sentenceMark" && typeof item === "object" && item.answer);
  const wrongItems = [
    ...sentenceAnswerItems
      .filter((item) => !item.isCorrect)
      .map((item) => ({
        prompt: item.prompt,
        userAnswer: item.userAnswer,
        answer: item.answer,
      })),
    ...gradableItems
    .filter((item) => normalizeAnswer(getSubmittedAnswer(section, answers, item)) !== normalizeAnswer(item.answer))
    .map((item) => ({
      prompt: getItemPrompt(item),
      userAnswer: getSubmittedAnswer(section, answers, item) || "未作答",
      answer: item.answer,
    })),
  ];
  const correct = section.type === "sentenceMark"
    ? sentenceAnswerItems.filter((item) => item.isCorrect).length
    : gradableItems.length - wrongItems.length;
  const referenceItems = section.type === "sentenceMark"
    ? (section.items || []).filter((item) => typeof item === "object" && item.answer).map((item) => ({ prompt: item.prompt, answer: item.answer }))
    : [];
  const answerItems = section.type === "sentenceMark" ? sentenceAnswerItems : gradableItems.map((item) => {
    const userAnswer = getSubmittedAnswer(section, answers, item) || "未作答";
    const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(item.answer);
    return {
      prompt: getItemPrompt(item),
      userAnswer,
      answer: item.answer,
      isCorrect,
    };
  });
  const total = section.type === "sentenceMark" ? sentenceAnswerItems.length : gradableItems.length;
  return {
    id: section.id,
    title: section.title,
    total,
    correct,
    score: total ? Math.round((correct / total) * 100) : null,
    wrongItems,
    answerItems,
    referenceItems,
    answerNote: section.answerNote || "",
  };
}

function buildReadingAssessmentSection(item) {
  return {
    id: item.id,
    title: item.title,
    instruction: "请先听原音，再录自己的朗读并评估打分。",
    type: "readingAssessment",
    prompt: item.prompt,
    focus: item.focus || [],
  };
}

function getExerciseAudioForSection(day, section) {
  if (section.type === "readingAssessment") return [];
  return day.sectionAudio?.[section.id] || [];
}

function buildDayExerciseSections(day) {
  const exerciseSections = (day.exerciseSections || []).map((section) => ({
    ...section,
    audio: getExerciseAudioForSection(day, section),
  }));
  const readingSections = (day.readingAssessments || []).map(buildReadingAssessmentSection);
  return [...exerciseSections, ...readingSections];
}

function CampInlineAudioResources({ audio, label = "本关音频" }) {
  if (!audio?.length) return null;
  return (
    <div className="ph-camp-inline-audio" aria-label={label}>
      <strong>{label}</strong>
      {audio.map((item) => (
        <div className="ph-camp-inline-audio__item" key={item.src}>
          <span>{item.title}</span>
          <audio controls src={item.src} preload="none">
            <a href={item.src}>下载音频</a>
          </audio>
        </div>
      ))}
    </div>
  );
}

function CampExerciseSection({ section, answers = {}, onAnswersChange, revealAnswers = false }) {
  const [activeCircleCategory, setActiveCircleCategory] = useState(section.options?.[0] || "");
  const [activeSentenceMark, setActiveSentenceMark] = useState(section.markOptions?.[0] || "");
  const [activeMatchPrompt, setActiveMatchPrompt] = useState("");
  const [activeClassifyPrompt, setActiveClassifyPrompt] = useState("");
  const [draggedClassifyPrompt, setDraggedClassifyPrompt] = useState("");
  const readingText = buildExerciseReadingText(section);

  function updateAnswer(key, value) {
    onAnswersChange?.({ ...answers, [key]: value });
  }

  function updateSentenceMark(sentence, tokenIndex) {
    const key = `sentence:${sentence}`;
    const currentMarks = answers[key] || {};
    const currentMark = currentMarks[tokenIndex] || "";
    onAnswersChange?.({
      ...answers,
      [key]: {
        ...currentMarks,
        [tokenIndex]: currentMark === activeSentenceMark ? "" : activeSentenceMark,
      },
    });
  }

  function connectMatchOption(option) {
    if (!activeMatchPrompt) return;
    updateAnswer(activeMatchPrompt, option);
  }

  function assignClassifyItem(prompt, category) {
    updateAnswer(prompt, category);
    setActiveClassifyPrompt("");
    setDraggedClassifyPrompt("");
  }

  function startClassifyDrag(event, prompt) {
    setDraggedClassifyPrompt(prompt);
    setActiveClassifyPrompt(prompt);
    event.dataTransfer?.setData("text/plain", prompt);
  }

  function dropClassifyItem(event, category) {
    event.preventDefault();
    const prompt = event.dataTransfer?.getData("text/plain") || draggedClassifyPrompt || activeClassifyPrompt;
    if (prompt) assignClassifyItem(prompt, category);
  }

  function renderGapPart({ sentence, marks, index, key, updateMark }) {
    const markKey = `gap:${index}`;
    const mark = marks[markKey] || "";
    return (
      <button
        type="button"
        className={`ph-camp-sentence-gap${mark ? " is-marked" : ""}`}
        key={key}
        aria-label={`${isPauseMark(activeSentenceMark) ? "标记停顿位置" : "标记连读位置"} ${index}`}
        onClick={() => updateMark(sentence, markKey)}
      >
        {mark ? <em>{markSymbol(mark)}</em> : null}
      </button>
    );
  }

  function renderLetterPart({ sentence, marks, part, index, key, updateMark }) {
    const markKey = `letter:${index}`;
    const mark = marks[markKey] || "";
    const prefix = part.slice(0, -1);
    const lastLetter = part.slice(-1);
    return (
      <span className="ph-camp-sentence-word" key={key}>
        {prefix ? <span>{prefix}</span> : null}
        <button
          type="button"
          className={`ph-camp-sentence-letter${mark ? " is-marked" : ""}`}
          aria-label={`标记 ${part} 的最后一个字母 ${lastLetter}`}
          onClick={() => updateMark(sentence, markKey)}
        >
          {mark ? <em>{markSymbol(mark)}</em> : null}
          <span>{lastLetter}</span>
        </button>
      </span>
    );
  }

  function renderWordPart({ marks, part, key, markKey }) {
    const mark = marks[markKey] || "";
    return (
      <span className={`ph-camp-sentence-token${mark ? " is-marked" : ""}`} key={key}>
        {mark ? <em>{markSymbol(mark)}</em> : null}
        <span>{part}</span>
      </span>
    );
  }

  function renderTokenButton({ sentence, token, key, mark, updateMark, index }) {
    return (
      <button
        type="button"
        className={`ph-camp-sentence-token${mark ? " is-marked" : ""}`}
        key={key}
        onClick={() => updateMark(sentence, index)}
      >
        {mark ? <em>{markSymbol(mark)}</em> : null}
        <span>{token}</span>
      </button>
    );
  }

  function renderPunctuationToken(token, key) {
    return <span className="ph-camp-sentence-token is-punctuation" key={key}>{token}</span>;
  }

  function renderSentenceMarker(item, itemIndex) {
    const sentence = getSentenceText(item);
    const tokens = splitSentenceTokens(sentence);
    const parts = splitSentenceParts(sentence);
    const marks = answers[`sentence:${sentence}`] || {};
    const renderGapMode = (section.markOptions?.some(isLinkingMark) && isLinkingMark(activeSentenceMark))
      || (section.markOptions?.some(isPauseMark) && isPauseMark(activeSentenceMark));
    const renderPlosionMode = section.markOptions?.some(isPlosionMark) && isPlosionMark(activeSentenceMark);

    function hasWordBefore(partIndex) {
      for (let index = partIndex - 1; index >= 0; index -= 1) {
        if (/^\s+$/.test(parts[index])) continue;
        if (isMarkableToken(parts[index])) return true;
      }
      return false;
    }

    function hasWordAfter(partIndex) {
      for (let index = partIndex + 1; index < parts.length; index += 1) {
        if (/^\s+$/.test(parts[index])) continue;
        if (isMarkableToken(parts[index])) return true;
      }
      return false;
    }

    function renderSpecialSentenceParts() {
      let wordTokenIndex = -1;
      return parts.map((part, index) => {
        const key = `${sentence}-${part}-${index}`;
        if (/^\s+$/.test(part)) {
          if (renderGapMode && hasWordBefore(index) && hasWordAfter(index)) {
            return renderGapPart({ sentence, marks, part, index, key, updateMark: updateSentenceMark });
          }
          return <span className="ph-camp-sentence-space" key={key}> </span>;
        }
        if (!isMarkableToken(part)) return <span className="ph-camp-sentence-token is-punctuation" key={key}>{part}</span>;
        wordTokenIndex += 1;
        if (renderPlosionMode) {
          return renderLetterPart({ sentence, marks, part, index, key, updateMark: updateSentenceMark });
        }
        return renderWordPart({ sentence, marks, part, key, updateMark: updateSentenceMark, markKey: wordTokenIndex });
      });
    }

    const lineContent = renderGapMode || renderPlosionMode
      ? renderSpecialSentenceParts()
      : tokens.map((token, index) => {
          const mark = marks[index] || "";
          const key = `${sentence}-${token}-${index}`;
          if (!isMarkableToken(token)) return renderPunctuationToken(token, key);
          return renderTokenButton({ sentence, token, key, mark, updateMark: updateSentenceMark, index });
        });

    return (
      <div className="ph-camp-sentence-marker" key={`${section.id}-${sentence}`}>
        <div className="ph-camp-sentence-marker__line">
          {lineContent}
        </div>
        {revealAnswers && item?.answer ? <p className="ph-camp-sentence-marker__answer">参考：{item.answer}</p> : null}
        {/跟读|朗读/.test(section.instruction || "") ? (
          <CampReadingAssessment
            id={`${section.id}-sentence-${itemIndex}`}
            title="朗读评估"
            referenceText={sentence}
            focus={[section.instruction]}
            compact
          />
        ) : null}
      </div>
    );
  }

  function renderAnswer(item) {
    if (!revealAnswers || !item?.answer) return null;
    const isCorrect = normalizeAnswer(answers[item.prompt]) === normalizeAnswer(item.answer);
    return <em>{isCorrect ? `正确：${item.answer}` : `答案：${item.answer}`}</em>;
  }

  function renderMatchSelect() {
    return (
      <div className="ph-camp-match-board">
        <div className="ph-camp-match-column" role="group" aria-label="左侧音标">
          <h4>左侧</h4>
          {(section.items || []).map((item) => {
            const selectedAnswer = answers[item.prompt] || "";
            const isActive = activeMatchPrompt === item.prompt;
            const isCorrect = revealAnswers && normalizeAnswer(selectedAnswer) === normalizeAnswer(item.answer);
            const isWrong = revealAnswers && selectedAnswer && !isCorrect;
            return (
              <button
                type="button"
                key={`${section.id}-${item.prompt}`}
                className={`ph-camp-match-node${isActive ? " is-active" : ""}${selectedAnswer ? " is-connected" : ""}${isCorrect ? " is-correct" : ""}${isWrong ? " is-wrong" : ""}`}
                onClick={() => setActiveMatchPrompt(item.prompt)}
              >
                <strong>{item.prompt}</strong>
                <span>{selectedAnswer ? `已连：${selectedAnswer}` : "点击后选择右侧"}</span>
                {revealAnswers && !isCorrect ? <em>答案：{item.answer}</em> : null}
              </button>
            );
          })}
        </div>
        <div className="ph-camp-match-column" role="group" aria-label="右侧单词">
          <h4>右侧</h4>
          {(section.options || []).map((option) => {
            const isSelected = activeMatchPrompt && answers[activeMatchPrompt] === option;
            return (
              <button
                type="button"
                key={`${section.id}-${option}`}
                aria-label={`选择连线单词：${option}`}
                className={`ph-camp-match-option${isSelected ? " is-selected" : ""}`}
                onClick={() => connectMatchOption(option)}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderClassifyBoard() {
    const unassignedItems = (section.items || []).filter((item) => !answers[item.prompt]);

    function renderClassifyChip(item) {
      const selectedCategory = answers[item.prompt] || "";
      const isActive = activeClassifyPrompt === item.prompt;
      const isCorrect = revealAnswers && normalizeAnswer(selectedCategory) === normalizeAnswer(item.answer);
      const isWrong = revealAnswers && selectedCategory && !isCorrect;
      return (
        <button
          type="button"
          draggable
          key={`${section.id}-${item.prompt}`}
          className={`ph-camp-classify-chip${isActive ? " is-active" : ""}${selectedCategory ? " is-assigned" : ""}${isCorrect ? " is-correct" : ""}${isWrong ? " is-wrong" : ""}`}
          onClick={() => setActiveClassifyPrompt(item.prompt)}
          onDragStart={(event) => startClassifyDrag(event, item.prompt)}
          onDragEnd={() => setDraggedClassifyPrompt("")}
        >
          <span>{item.prompt}</span>
          {selectedCategory ? <em>{selectedCategory}</em> : null}
          {revealAnswers && !isCorrect ? <small>答案：{item.answer}</small> : null}
        </button>
      );
    }

    return (
      <div className="ph-camp-classify-board">
        <div className="ph-camp-classify-pool" role="group" aria-label="待分类">
          <h4>待分类</h4>
          <div className="ph-camp-classify-chips">
            {unassignedItems.length ? unassignedItems.map(renderClassifyChip) : <p>已全部拖入分类。</p>}
          </div>
        </div>
        <div className="ph-camp-classify-zones">
          {section.options.map((category) => {
            const assignedItems = (section.items || []).filter((item) => answers[item.prompt] === category);
            return (
              <section
                className="ph-camp-classify-zone"
                key={`${section.id}-${category}`}
                role="group"
                aria-label={category}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => dropClassifyItem(event, category)}
                onClick={() => {
                  if (activeClassifyPrompt) assignClassifyItem(activeClassifyPrompt, category);
                }}
              >
                <h4>{category}</h4>
                <div className="ph-camp-classify-chips">
                  {assignedItems.length ? assignedItems.map(renderClassifyChip) : <p>拖到这里</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    );
  }

  function renderOpenItem(item) {
    return (
      <div className="ph-camp-exercise__open" key={item}>
        <span>{item}</span>
      </div>
    );
  }

  function renderChoiceItem(item, itemIndex) {
    return (
      <div className="ph-camp-exercise__item-wrap" key={`${section.id}-${item.prompt}`}>
        <label className="ph-camp-exercise__item">
          <span>{item.prompt}</span>
          <select value={answers[item.prompt] || ""} onChange={(event) => updateAnswer(item.prompt, event.target.value)}>
            <option value="">选择答案</option>
            {(item.options || section.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          {renderAnswer(item)}
        </label>
        {/跟读|朗读/.test(section.instruction || "") && /[A-Za-z]/.test(item.prompt || "") ? (
          <CampReadingAssessment
            id={`${section.id}-choice-${itemIndex}`}
            title="朗读评估"
            referenceText={item.prompt}
            focus={[section.instruction]}
            compact
          />
        ) : null}
      </div>
    );
  }

  function renderCircleClassifyItem(item) {
    const selectedCategory = answers[item.prompt] || "";
    const isCorrect = revealAnswers && normalizeAnswer(selectedCategory) === normalizeAnswer(item.answer);
    const isWrong = revealAnswers && selectedCategory && !isCorrect;
    return (
      <button
        type="button"
        className={`ph-camp-circle-chip${selectedCategory ? " is-selected" : ""}${isCorrect ? " is-correct" : ""}${isWrong ? " is-wrong" : ""}`}
        key={`${section.id}-${item.prompt}`}
        onClick={() => updateAnswer(item.prompt, selectedCategory === activeCircleCategory ? "" : activeCircleCategory)}
      >
        <span>{item.prompt}</span>
        {selectedCategory ? <em>{selectedCategory}</em> : null}
        {revealAnswers && !isCorrect ? <small>答案：{item.answer}</small> : null}
      </button>
    );
  }

  function renderCircleSelectItem(item) {
    const key = getItemKey(item);
    const selected = answers[key] === "圈出";
    const isCorrect = revealAnswers && normalizeAnswer(selected ? "圈出" : "不圈") === normalizeAnswer(item.answer);
    const isWrong = revealAnswers && !isCorrect;
    return (
      <button
        type="button"
        className={`ph-camp-circle-chip${selected ? " is-selected" : ""}${isCorrect ? " is-correct" : ""}${isWrong ? " is-wrong" : ""}`}
        key={`${section.id}-${key}`}
        onClick={() => updateAnswer(key, selected ? "" : "圈出")}
      >
        <span>{item.prompt}</span>
        {selected ? <em>圈出</em> : null}
        {revealAnswers && isWrong ? <small>答案：{item.answer}</small> : null}
      </button>
    );
  }

  function renderTextInputItem(item, placeholder) {
    return (
      <label className="ph-camp-exercise__item ph-camp-exercise__item--wide" key={`${section.id}-${item.prompt}`}>
        <span>{item.prompt}</span>
        <input value={answers[item.prompt] || ""} onChange={(event) => updateAnswer(item.prompt, event.target.value)} placeholder={placeholder} />
        {renderAnswer(item)}
      </label>
    );
  }

  function renderPlainInputItem(item) {
    return renderTextInputItem(item, "输入答案或标注");
  }

  function renderItem(item, itemIndex) {
    if (section.type === "sentenceMark") return renderSentenceMarker(item, itemIndex);
    if (typeof item === "string") return renderOpenItem(item);
    if (section.type === "choice") return renderChoiceItem(item, itemIndex);
    if (section.type === "circleClassify") return renderCircleClassifyItem(item);
    if (section.type === "circleSelect") return renderCircleSelectItem(item);
    if (section.type === "textPairs") return renderTextInputItem(item, (section.fields || []).join(" / "));
    return renderPlainInputItem(item);
  }

  if (section.type === "readTable") {
    return (
      <section className="ph-camp-exercise" aria-label={section.title}>
        <div className="ph-camp-exercise__head">
          <div>
            <h3>{section.title}</h3>
            <p>{section.instruction}</p>
          </div>
        </div>
        <CampInlineAudioResources audio={section.audio} />
        <div className="ph-camp-read-table">
          {section.items.map((item) => (
            <div className="ph-camp-read-table__row" key={`${item.sound}-${item.word}`}>
              <div className="ph-camp-read-table__text">
                <strong>{item.sound}</strong>
                <span>{item.word}</span>
              </div>
              <CampReadingAssessment
                id={`${section.id}-${item.sound}-${item.word}`}
                title="跟读"
                referenceText={`${item.sound} ${item.word}`}
                focus={[`${item.sound} ${item.word}`]}
                compact
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "readingAssessment") {
    return (
      <section className="ph-camp-exercise" aria-label={section.title}>
        <div className="ph-camp-exercise__head">
          <div>
            <h3>{section.title}</h3>
            <p>{section.instruction}</p>
          </div>
        </div>
        <CampReadingAssessment
          id={section.id}
          title={section.title}
          referenceText={section.prompt}
          focus={section.focus}
        />
      </section>
    );
  }

  return (
    <section className="ph-camp-exercise" aria-label={section.title}>
      <div className="ph-camp-exercise__head">
        <div>
          <h3>{section.title}</h3>
          <p>{section.instruction}</p>
        </div>
      </div>
      <CampInlineAudioResources audio={section.audio} />
      <div className={`ph-camp-exercise__items ph-camp-exercise__items--${section.type}`}>
        {section.type === "sentenceMark" ? (
          <div className="ph-camp-sentence-toolbar">
            <span>当前标记</span>
            {section.markOptions.map((option) => (
              <button
                type="button"
                key={option}
                aria-label={`标记方式：${option}`}
                className={activeSentenceMark === option ? "is-active" : ""}
                onClick={() => setActiveSentenceMark(option)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
        {section.type === "circleClassify" ? (
          <div className="ph-camp-circle-toolbar">
            <span>当前圈选类别</span>
            {section.options.map((option) => (
              <button
                type="button"
                key={option}
                aria-label={`圈选类别：${option}`}
                className={activeCircleCategory === option ? "is-active" : ""}
                onClick={() => setActiveCircleCategory(option)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
        {section.type === "matchSelect" ? renderMatchSelect() : null}
        {section.type === "classify" ? renderClassifyBoard() : null}
        {section.type === "circleSelect" ? (
          <div className="ph-camp-circle-groups">
            {Object.entries((section.items || []).reduce((groups, item) => {
              const group = item.group || "圈选";
              return { ...groups, [group]: [...(groups[group] || []), item] };
            }, {})).map(([group, items]) => (
              <section className="ph-camp-circle-group" key={`${section.id}-${group}`}>
                <h4>{group}</h4>
                <div className="ph-camp-circle-group__chips">{items.map(renderItem)}</div>
              </section>
            ))}
          </div>
        ) : null}
        {!["matchSelect", "classify", "circleSelect"].includes(section.type) ? (section.items || []).map(renderItem) : null}
      </div>
      {readingText && section.type !== "sentenceMark" ? (
        <CampReadingAssessment
          id={`${section.id}-reading`}
          title={`${section.title} 跟读评估`}
          referenceText={readingText}
          focus={[section.instruction]}
          compact
        />
      ) : null}
    </section>
  );
}

function CampExerciseList({ sections }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answersBySection, setAnswersBySection] = useState({});
  const [results, setResults] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  if (!sections?.length) return null;
  const completedResults = showSummary ? results : [];
  const gradableResults = completedResults.filter((result) => result.total > 0);
  const totalCorrect = gradableResults.reduce((sum, result) => sum + result.correct, 0);
  const totalQuestions = gradableResults.reduce((sum, result) => sum + result.total, 0);
  const overallScore = totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const wrongItems = completedResults.flatMap((result) => result.wrongItems.map((item) => ({ ...item, sectionTitle: result.title })));

  const currentSection = sections[currentIndex];
  const isLast = currentIndex === sections.length - 1;

  function updateSectionAnswers(sectionId, answers) {
    setAnswersBySection((current) => ({ ...current, [sectionId]: answers }));
  }

  function goNext() {
    if (isLast) {
      setResults(sections.map((section) => buildExerciseResult(section, answersBySection[section.id] || {})));
      setShowSummary(true);
      return;
    }
    setCurrentIndex((index) => Math.min(index + 1, sections.length - 1));
  }

  function restart() {
    setAnswersBySection({});
    setResults([]);
    setShowSummary(false);
    setCurrentIndex(0);
  }

  return (
    <section className="ph-camp-exercise-list" aria-label="讲义完整练习">
      <h3>讲义完整练习</h3>
      <div className="ph-camp-exercise-progress">
        <strong>{showSummary ? `进度：${sections.length} / ${sections.length}` : `第 ${currentIndex + 1} 关 / 共 ${sections.length} 关`}</strong>
        {showSummary && totalQuestions ? <span>总分：{overallScore} 分</span> : null}
      </div>
      {showSummary ? (
        <section className="ph-camp-exercise-summary" aria-label="整体分数与错题总结">
          <h3>整体分数与答案总结</h3>
          <strong>{totalQuestions ? `${totalCorrect} / ${totalQuestions} 正确，${overallScore} 分` : "已完成全部大题"}</strong>
          {wrongItems.length ? (
            <ol>
              {wrongItems.map((item) => (
                <li key={`${item.sectionTitle}-${item.prompt}-${item.answer}`}>
                  {item.sectionTitle}｜{item.prompt}：你的答案 {item.userAnswer}；正确答案 {item.answer}
                </li>
              ))}
            </ol>
          ) : (
            <p>本日客观题没有错题；开放标注题请按各关参考答案继续核对。</p>
          )}
          <div className="ph-camp-exercise-answer-list">
            {completedResults.map((sectionResult) => (
              <section className="ph-camp-exercise-answer-section" key={sectionResult.id}>
                <h4>{sectionResult.title}</h4>
                {sectionResult.answerItems?.length ? (
                  <ol>
                    {sectionResult.answerItems.map((item) => (
                      <li key={`${sectionResult.id}-${item.prompt}`}>
                        {item.prompt}：你的答案 {item.userAnswer}；正确答案 {item.answer}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {sectionResult.referenceItems?.length ? (
                  <ol>
                    {sectionResult.referenceItems.map((item) => (
                      <li key={`${sectionResult.id}-${item.prompt}`}>{item.prompt}：{item.answer}</li>
                    ))}
                  </ol>
                ) : null}
                {sectionResult.answerNote ? <p>{sectionResult.answerNote}</p> : null}
              </section>
            ))}
          </div>
          <button type="button" className="ph-camp-exercise-restart" onClick={restart}>
            重新练习本组
          </button>
        </section>
      ) : (
        <>
          <div className="ph-camp-exercise-steps" role="list" aria-label="练习进度">
            {sections.map((section, index) => (
              <span
                key={section.id}
                role="listitem"
                className={`ph-camp-exercise-steps__dot${index < currentIndex ? " is-done" : ""}${index === currentIndex ? " is-current" : ""}`}
              />
            ))}
          </div>
          <p className="ph-camp-exercise-stepnum">第 {currentIndex + 1} 关 / 共 {sections.length} 关</p>
          <CampExerciseSection
            key={currentSection.id}
            section={currentSection}
            answers={answersBySection[currentSection.id] || {}}
            onAnswersChange={(answers) => updateSectionAnswers(currentSection.id, answers)}
          />
          <div className="ph-camp-exercise-nav">
            <button
              type="button"
              className="ph-camp-exercise-nav__next"
              aria-label={isLast ? "完成" : "下一关"}
              onClick={goNext}
            >
              {isLast ? "完成" : "下一关 →"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function CampReadingAssessment({ title, referenceText, focus, compact = false }) {
  const sessionRef = useRef(null);
  const sessionIdRef = useRef(0);
  const startedAtRef = useRef(0);
  const [status, setStatus] = useState("");
  const [recording, setRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState(null);
  const unsupportedMessage = "当前浏览器不支持实时 ASR 录音评估，请换用支持麦克风和实时语音连接的浏览器。";
  const supported = supportsRealtimeAsr();
  const canEvaluate = Boolean(transcript.trim());
  const targetWords = useMemo(() => tokenizeEnglish(referenceText).length, [referenceText]);
  const readingStatus = status || (!supported ? unsupportedMessage : (!compact ? "请先听原音，再完成朗读录音。" : ""));

  useEffect(() => () => {
    sessionIdRef.current += 1;
    sessionRef.current?.abort?.();
    sessionRef.current = null;
  }, []);

  function stopRecording() {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) {
      setRecording(false);
      setStatus("录音已停止，可以生成评分。");
      return;
    }
    setStatus("正在结束录音并整理识别结果。");
    session.stop();
  }

  async function startRecording() {
    if (!supported) {
      setStatus(unsupportedMessage);
      return;
    }
    setResult(null);
    setTranscript("");
    setStatus("正在连接实时 ASR");
    setRecording(true);
    startedAtRef.current = Date.now();
    const sessionId = sessionIdRef.current + 1;
    sessionIdRef.current = sessionId;
    try {
      const session = await createRealtimeAsrSession({
        language: "en-US",
        onOpen: () => {
          if (sessionIdRef.current !== sessionId) return;
          setStatus("实时 ASR 识别中；读完后点击停止录音。");
        },
        onResult: (message) => {
          if (sessionIdRef.current !== sessionId) return;
          if (message.text) {
            setTranscript(message.text.trim());
            return;
          }
          const segment = getAsrSegmentTranscript(message);
          if (segment) setTranscript((current) => appendTranscript(current, segment));
        },
        onError: (message) => {
          if (sessionIdRef.current !== sessionId) return;
          sessionIdRef.current += 1;
          setStatus(message || "实时 ASR 识别失败，请稍后重试。");
          setRecording(false);
          sessionRef.current?.abort?.();
          sessionRef.current = null;
        },
        onClose: () => {
          if (sessionIdRef.current !== sessionId) return;
          setDurationMs(Math.max(0, Date.now() - startedAtRef.current));
          setRecording(false);
          setStatus("录音已停止，可以生成评分。");
          sessionRef.current = null;
        },
      });
      if (sessionIdRef.current !== sessionId) {
        session?.abort?.();
        return;
      }
      sessionRef.current = session;
    } catch (error) {
      setRecording(false);
      setStatus(error?.message || "实时 ASR 启动失败，请检查麦克风权限或登录状态。");
    }
  }

  function evaluateReading() {
    if (!canEvaluate) {
      setStatus("请先完成录音，并等待系统生成识别文本后再评分。");
      setResult(null);
      return;
    }
    const nextResult = scoreReading({ referenceText, transcript, durationMs, focus });
    setResult(nextResult);
    setStatus("评分已生成。");
  }

  return (
    <section className={`ph-camp-reading${compact ? " ph-camp-reading--compact" : ""}`} aria-label={`${title} 朗读录入与评估`}>
      <div className="ph-camp-reading__head">
        <div>
          <h5>{title}</h5>
          {!compact ? <p>{targetWords} 个英文词 · 建议先听原音，再录自己的版本。</p> : null}
        </div>
        <div className="ph-camp-reading__actions">
          <button
            type="button"
            aria-label={recording ? "停止录音" : "开始录音"}
            onClick={recording ? stopRecording : startRecording}
            disabled={!supported && !recording}
          >
            {recording ? "停止录音" : "开始录音"}
          </button>
          <button type="button" onClick={evaluateReading} disabled={!canEvaluate}>评估打分</button>
        </div>
      </div>
      {readingStatus ? (
        <p className={`ph-camp-reading__status${recording ? " is-recording" : ""}`}>
          {readingStatus}
        </p>
      ) : null}
      {!compact ? <blockquote className="ph-camp-reading__reference">{referenceText}</blockquote> : null}
      {focus?.length && !compact ? (
        <ul className="ph-camp-reading__focus">
          {focus.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
      {transcript || !compact ? <div className="ph-camp-reading__transcript ph-camp-reading__transcript--readonly">
        <span>录音识别结果</span>
        {transcript ? <p>{transcript}</p> : null}
      </div> : null}
      {result ? (
        <div className="ph-camp-reading__result">
          <strong>{result.score} 分</strong>
          <span>读稳 {result.matchedCount} 个词 · 需回看 {result.reviewCount} 处 · 用时 {result.durationText}</span>
          <ul>
            {result.feedback.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function CampDayReadingAssessments({ assessments }) {
  if (!assessments?.length) return null;
  return (
    <section className="ph-camp-reading-list" aria-label="朗读录入与评估打分">
      <h3>朗读录入与评估打分</h3>
      {assessments.map((item) => (
        <CampReadingAssessment
          key={item.id}
          id={item.id}
          title={item.title}
          referenceText={item.prompt}
          focus={item.focus}
        />
      ))}
    </section>
  );
}

function buildGeneratedAnswerSections(day) {
  const drillAnswers = (day.drills || []).map((drill) => `${drill.title}：${drill.items.map((item) => `${item.prompt} = ${item.answer}`).join("；")}`);
  const quizAnswers = (day.quiz || []).map((item) => `${item.question} 答案：${item.answer}。${item.explanation || ""}`);
  return [
    drillAnswers.length ? { title: "交互练习答案", items: drillAnswers } : null,
    quizAnswers.length ? { title: "随堂练习答案", items: quizAnswers } : null,
  ].filter(Boolean);
}

function CampAudioResources({ audio }) {
  if (!audio?.length) return null;
  return (
    <section className="ph-camp-resources" aria-label="听力资源">
      <h3>听力资源</h3>
      <div className="ph-camp-audio-list">
        {audio.map((item) => (
          <div className="ph-camp-audio" key={item.src}>
            <span>{item.title}</span>
            <div className="ph-camp-audio__controls">
              <audio controls src={item.src} preload="none">
                <a href={item.src}>下载音频</a>
              </audio>
              <a className="ph-camp-audio__download" href={item.src} download>下载</a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CampAnswerKey({ day, visible = false }) {
  const sections = [
    ...buildGeneratedAnswerSections(day),
    ...(day.answerSections || []),
    day.answerKey?.length ? { title: "参考答案", items: day.answerKey } : null,
  ].filter(Boolean);
  if (!sections.length || !visible) return null;
  return (
    <section className="ph-camp-answer-key" aria-label="答案参考">
      <h3>答案参考</h3>
      {sections.map((section) => (
        <section className="ph-camp-answer-section" key={section.title}>
          <h3>{section.title}</h3>
          <ol>
            {section.items.map((answer) => <li key={answer}>{answer}</li>)}
          </ol>
        </section>
      ))}
    </section>
  );
}

function CampStoryNotes({ stories, audio = [], enableReadingAssessment = false }) {
  const [activeIndex, setActiveIndex] = useState(0);
  if (!stories?.length) return null;
  const activeStory = stories[Math.min(activeIndex, stories.length - 1)] || stories[0];
  const storyAudio = audio.filter((item) => item.title === activeStory.title);
  return (
    <section className="ph-camp-stories" aria-label="故事原文与笔记区">
      <h3>故事原文与笔记区</h3>
      {stories.length > 1 ? (
        <div className="ph-camp-story-tabs" role="tablist" aria-label="选择故事">
          {stories.map((story, index) => (
            <button
              type="button"
              key={story.title}
              role="tab"
              aria-selected={story.title === activeStory.title}
              className={story.title === activeStory.title ? "is-active" : ""}
              onClick={() => setActiveIndex(index)}
            >
              {story.title}
            </button>
          ))}
        </div>
      ) : null}
      <div className="ph-camp-story-list">
        <article className="ph-camp-story" key={activeStory.title}>
          <h4>{activeStory.title}</h4>
          <CampInlineAudioResources audio={storyAudio} label="本故事音频" />
          <div className="ph-camp-story__text" aria-label={`${activeStory.title} 原文`}>
            {activeStory.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <div className="ph-camp-notes">
            {activeStory.notes.map((section) => (
              <section className="ph-camp-note-section" key={`${activeStory.title}-${section.title}`}>
                <h5>{section.title}</h5>
                <ul>
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </section>
            ))}
          </div>
          {enableReadingAssessment ? (
            <CampReadingAssessment
              id={`camp-story-${activeStory.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
              title={`${activeStory.title} 朗读`}
              referenceText={buildStoryText(activeStory)}
              focus={activeStory.notes.find((section) => section.title === "朗读提示")?.items || []}
            />
          ) : null}
        </article>
      </div>
    </section>
  );
}

function CampRubric({ rubric }) {
  if (!rubric?.length) return null;
  return (
    <section className="ph-camp-rubric" aria-label="自评卡">
      <h3>自评卡</h3>
      <ol>
        {rubric.map((item) => <li key={item}>{item}</li>)}
      </ol>
    </section>
  );
}

function CampAppendix() {
  return (
    <article className="ph-camp-day">
      <div className="ph-camp-day__head">
        <span className="ph-camp-day__badge">{PHONETIC_CAMP_APPENDIX.day}</span>
        <div>
          <h2>{PHONETIC_CAMP_APPENDIX.title}</h2>
          <p>{PHONETIC_CAMP_APPENDIX.goal}</p>
        </div>
      </div>
      <div className="ph-camp-appendix">
        {PHONETIC_CAMP_APPENDIX.groups.map((group) => (
          <section className="ph-camp-appendix__group" key={group.title}>
            <h3>{group.title}</h3>
            <div className="ph-camp-appendix__rows">
              {group.rows.map(([letters, sound, examples]) => (
                <div className="ph-camp-appendix__row" key={`${group.title}-${letters}-${examples}`}>
                  <strong>{letters}</strong>
                  <span>{sound}</span>
                  <em>{examples}</em>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

function DayCard({ day }) {
  const [submitted, setSubmitted] = useState(false);
  const stepSections = buildDayExerciseSections(day);
  const usesStepExercises = Boolean(stepSections.length);
  const hasCompletionControls = Boolean(day.drills?.length || day.readingAssessments?.length || day.rubric?.length || day.id === "supplement");
  const enablesStoryReading = day.day === "Day 7" || day.id === "supplement";
  return (
    <article className="ph-camp-day">
      {!usesStepExercises && !day.stories?.length ? <CampAudioResources audio={day.audio} /> : null}
      <CampExerciseList sections={stepSections} />
      {!day.exerciseSections?.length && day.drills?.map((drill) => <CampDrill key={drill.id} drill={drill} />)}
      {!usesStepExercises ? <CampDayReadingAssessments assessments={day.readingAssessments} /> : null}
      <CampStoryNotes stories={day.stories} audio={day.audio} enableReadingAssessment={enablesStoryReading} />
      <CampRubric rubric={day.rubric} />
      {!usesStepExercises && hasCompletionControls ? (
        <>
          <button type="button" className="ph-camp-day__submit" onClick={() => setSubmitted(true)}>
            完成本日训练
          </button>
          <CampAnswerKey day={day} visible={submitted} />
        </>
      ) : null}
    </article>
  );
}

function CampDirectory({ activeId, onSelect }) {
  return (
    <section className="ph-camp-directory studio-reveal studio-reveal--delay-1" aria-label="语音训练营目录">
      {PHONETIC_CAMP_DIRECTORY.map((item) => (
        <button
          type="button"
          key={item.id}
          className={`ph-camp-directory__item${activeId === item.id ? " is-active" : ""}`}
          aria-label={`${item.label} ${item.title}`}
          onClick={() => onSelect(item.id)}
        >
          <strong>{item.label}</strong>
          <span>{item.title}</span>
        </button>
      ))}
    </section>
  );
}

function resolveCampEntry(activeId) {
  if (activeId === "supplement") return PHONETIC_CAMP_SUPPLEMENT;
  if (activeId === "appendix") return PHONETIC_CAMP_APPENDIX;
  const dayNumber = Number(String(activeId || "").replace("day-", ""));
  return PHONETIC_CAMP_DAYS[dayNumber - 1] || null;
}

export default function PhoneticCampPage({
  onNavigate,
  onLoginClick,
  onRegisterClick,
  user,
  onAccountClick,
  activePage = "phonetics-camp",
  hideTopBar = false,
}) {
  const pageRef = useScrollReveal();
  const [activeId, setActiveId] = useState("day-1");
  const activeEntry = resolveCampEntry(activeId);

  return (
    <div className="ph-page" ref={pageRef}>
      {!hideTopBar && (
        <PhoneticTopBar
          onNavigate={onNavigate}
          onLogin={onLoginClick}
          onRegister={onRegisterClick}
          user={user}
          onAccountClick={onAccountClick}
          activePage={activePage}
        />
      )}
      <main className="ph-camp-page">
        <PageHero
          eyebrow="筑巢语音 · 7 天训练营"
          title="按目录进入每天的语音训练。"
          description="每一天独立呈现讲义题目；完成全部关卡后统一显示答案和参考标注。"
        />
        <CampDirectory activeId={activeId} onSelect={setActiveId} />
        <section className="ph-camp-days studio-reveal studio-reveal--delay-1" aria-label="当前训练内容">
          {activeId === "appendix" ? <CampAppendix /> : <DayCard key={activeId} day={activeEntry} />}
        </section>
      </main>
    </div>
  );
}
