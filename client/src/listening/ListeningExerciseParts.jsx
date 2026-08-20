import { useRef, useState } from "react";

import { listeningAPI } from "../api/index.js";

export function PlayBtn({ id, text, audioUrl = "", rate = 0.8, playingKey, play, className = "", label = "" }) {
  const active = playingKey === id;
  const displayLabel = active ? "停止" : label;
  return (
    <button
      type="button"
      title={active ? "停止" : label || "播放"}
      aria-label={active ? "停止播放" : label || "播放音频"}
      className={`ls-play-btn${displayLabel ? " ls-play-btn--text" : ""}${active ? " is-playing" : ""}${className ? " " + className : ""}`}
      onClick={() => play(id, text, rate, audioUrl)}
    >
      <span aria-hidden="true">{active ? "⏹" : "▶"}</span>
      {displayLabel && <span>{displayLabel}</span>}
    </button>
  );
}

export function SpeechSupportNotice({ message = "语音服务暂时不可用，请稍后重试或检查网络连接。" }) {
  return (
    <div className="ls-speech-warning" role="status">
      {message}
    </div>
  );
}

export function recordListeningProgress(user, payload, metadataContext = null) {
  if (!user?.id) return;
  const nextPayload = metadataContext && typeof metadataContext === "object"
    ? { ...payload, metadata: { ...(payload.metadata || {}), ...metadataContext } }
    : payload;
  listeningAPI.recordProgress(nextPayload).catch(() => {
    window.dispatchEvent?.(new CustomEvent("nest:listening-record-failed", {
      detail: "练习记录保存失败，听读成长页可能暂未更新。",
    }));
  });
}

export function elapsedSince(startRef) {
  return Math.max(0, Date.now() - startRef.current);
}

export function sample(arr, n) {
  const items = [...arr];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, n);
}

export function normalize(s) {
  return s.toLowerCase().replace(/[.,!?'"]/g, "").trim();
}

function wordDiff(input, correct) {
  const iw = normalize(input).split(/\s+/).filter(Boolean);
  const cw = normalize(correct).split(/\s+/).filter(Boolean);
  const dp = Array.from({ length: iw.length + 1 }, () => Array(cw.length + 1).fill(0));
  for (let i = iw.length - 1; i >= 0; i -= 1) {
    for (let j = cw.length - 1; j >= 0; j -= 1) {
      dp[i][j] = iw[i] === cw[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const matches = [];
  let i = 0;
  let j = 0;
  while (i < iw.length && j < cw.length) {
    if (i < iw.length && j < cw.length && iw[i] === cw[j]) {
      matches.push([i, j]);
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] > dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }

  const result = [];
  let inputPos = 0;
  let correctPos = 0;
  for (const [nextInput, nextCorrect] of [...matches, [iw.length, cw.length]]) {
    const inputGap = iw.slice(inputPos, nextInput);
    const correctGap = cw.slice(correctPos, nextCorrect);
    const shared = Math.min(inputGap.length, correctGap.length);
    for (let k = 0; k < shared; k += 1) {
      result.push({ word: correctGap[k], type: "wrong", typed: inputGap[k] });
    }
    for (let k = shared; k < correctGap.length; k += 1) {
      result.push({ word: correctGap[k], type: "missing" });
    }
    for (let k = shared; k < inputGap.length; k += 1) {
      result.push({ word: inputGap[k], type: "extra" });
    }
    if (nextCorrect < cw.length) result.push({ word: cw[nextCorrect], type: "ok" });
    inputPos = nextInput + 1;
    correctPos = nextCorrect + 1;
  }
  return result;
}

export function DiffDisplay({ input, correct }) {
  if (!input.trim()) return null;
  const diff = wordDiff(input, correct);
  const perfect = diff.every(d => d.type === "ok");
  return (
    <div className={`ls-diff${perfect ? " ls-diff--perfect" : ""}`}>
      <span className="ls-diff-label">参考答案：</span>
      {diff.map((d, i) => (
        <span
          key={i}
          className={`ls-diff-word ls-diff-word--${d.type}`}
          title={d.typed ? `你写的: ${d.typed}` : undefined}
        >
          {d.word}{" "}
        </span>
      ))}
    </div>
  );
}

export function PairCard({ item, play, user, metadataContext = null }) {
  const [answer, setAnswer] = useState(null);
  const [choice, setChoice] = useState(null);
  const startedAtRef = useRef(Date.now());
  const countRef = useRef(0);
  const played = answer !== null;
  const done = choice !== null;
  const correct = choice === answer;

  function playRandom() {
    const idx = Math.random() < 0.5 ? 0 : 1;
    setAnswer(idx);
    setChoice(null);
    countRef.current += 1;
    startedAtRef.current = Date.now();
    play(`pair-${item.pair.join("-")}-${countRef.current}`, item.pair[idx]);
  }

  function choose(idx) {
    if (done) return;
    setChoice(idx);
    const correctAnswer = idx === answer;
    recordListeningProgress(user, {
      activityType: "basics-pair",
      score: correctAnswer ? 100 : 0,
      accuracy: correctAnswer ? 100 : 0,
      durationMs: elapsedSince(startedAtRef),
      metadata: {
        pair: item.pair,
        selected: item.pair[idx],
        answer: item.pair[answer],
      },
    }, metadataContext);
  }

  return (
    <div className="ls-pair-card">
      <div className="ls-pair-top">
        <span className="ls-pair-hint">{item.hint}</span>
        <span className="ls-pair-tip">{item.tip}</span>
      </div>
      <div className="ls-pair-words">
        {item.pair.map(w => <span key={w} className="ls-pair-word">{w}</span>)}
      </div>
      <button
        type="button"
        className="ls-play-btn ls-play-btn--text"
        onClick={playRandom}
        title={played && !done ? "重播" : "播放"}
        aria-label={played && !done ? "重播辨音音频" : "播放辨音音频"}
      >
        <span aria-hidden="true">▶</span>
        <span>{played && !done ? "重播" : "播放"}</span>
      </button>
      {played && (
        <div className="ls-pair-choices">
          {item.pair.map((w, i) => (
            <button
              key={w}
              type="button"
              aria-label={`选择 ${w}`}
              onClick={() => choose(i)}
              className={`ls-pair-choice${!done ? "" : i === answer ? " ls-pair-choice--correct" : choice === i ? " ls-pair-choice--wrong" : " ls-pair-choice--dim"}`}
            >
              {w}
            </button>
          ))}
        </div>
      )}
      {done && (
        <p className={`ls-feedback ${correct ? "ls-feedback--ok" : "ls-feedback--err"}`}>
          {correct ? "正确！" : `听到的是 "${item.pair[answer]}"`}
        </p>
      )}
      {done && (
        <button type="button" className="ls-retry-btn" onClick={() => { setAnswer(null); setChoice(null); startedAtRef.current = Date.now(); }}>
          再来一次
        </button>
      )}
    </div>
  );
}

export function WordCard({ item, playingKey, play, user, metadataContext = null }) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const startedAtRef = useRef(Date.now());
  const recordedRef = useRef(false);
  const ok = value.trim().toLowerCase() === item.word.toLowerCase();
  const pKey = `word-${item.word}`;

  function check() {
    if (!value.trim()) return;
    setChecked(true);
    if (!recordedRef.current) {
      recordedRef.current = true;
      recordListeningProgress(user, {
        activityType: "basics-word",
        score: ok ? 100 : 0,
        accuracy: ok ? 100 : 0,
        durationMs: elapsedSince(startedAtRef),
        metadata: {
          word: item.word,
          input: value.trim().slice(0, 80),
        },
      }, metadataContext);
    }
    if (!ok) setRevealed(false);
  }

  function reset() {
    setValue("");
    setChecked(false);
    setRevealed(false);
    recordedRef.current = false;
    startedAtRef.current = Date.now();
  }

  return (
    <div className="ls-word-card">
      <div className="ls-word-meta">
        <span className="ls-word-hint">{item.hint}</span>
      </div>
      <div className="ls-word-controls">
        <PlayBtn id={pKey} text={item.word} audioUrl={item.audioUrl} rate={0.8} label="播放" playingKey={playingKey} play={play} />
        <PlayBtn id={`${pKey}-slow`} text={item.word} audioUrl={item.audioUrl} rate={0.6} label="慢速" playingKey={playingKey} play={play} className="ls-play-btn--slow" />
      </div>
      <div className="ls-word-input-row">
        <input
          className="ls-word-input"
          aria-label={`${item.word} 听写输入`}
          type="text"
          value={value}
          onChange={e => {
            if (recordedRef.current) startedAtRef.current = Date.now();
            setValue(e.target.value);
            setChecked(false);
            recordedRef.current = false;
          }}
          onKeyDown={e => e.key === "Enter" && check()}
          placeholder="听后输入单词…"
          spellCheck={false}
        />
        <button type="button" className="ls-check-btn" onClick={check}>核对</button>
      </div>
      {checked && (
        <div className={`ls-word-result ${ok ? "ls-word-result--ok" : "ls-word-result--err"}`}>
          {ok
            ? <span>正确！<em className="ls-ipa">{item.ipa}</em></span>
            : <span>
                再听一次 &nbsp;
                <button type="button" aria-label={revealed ? "隐藏单词答案" : "查看单词答案"} className="ls-link-btn" onClick={() => setRevealed(r => !r)}>
                  {revealed ? "隐藏答案" : "查看答案"}
                </button>
                {revealed && <span className="ls-answer"> {item.word} <em className="ls-ipa">{item.ipa}</em></span>}
              </span>
          }
        </div>
      )}
      {checked && ok && (
        <button type="button" className="ls-retry-btn" onClick={reset}>下一个</button>
      )}
    </div>
  );
}

export function SentenceCard({ item, playingKey, play, user, metadataContext = null }) {
  const [value, setValue] = useState("");
  const [revealed, setRevealed] = useState(false);
  const startedAtRef = useRef(Date.now());
  const recordedRef = useRef(false);
  const pKey = `sent-${item.text.slice(0, 12)}`;
  const sentenceOk = normalize(value) === normalize(item.text);

  function toggleReveal() {
    setRevealed(r => !r);
    if (!revealed && value.trim() && !recordedRef.current) {
      recordedRef.current = true;
      recordListeningProgress(user, {
        activityType: "basics-sentence",
        score: sentenceOk ? 100 : 0,
        accuracy: sentenceOk ? 100 : 0,
        durationMs: elapsedSince(startedAtRef),
        metadata: {
          level: item.level,
          text: item.text.slice(0, 120),
          input: value.trim().slice(0, 120),
        },
      }, metadataContext);
    }
  }

  return (
    <div className="ls-sent-card">
      <span className="ls-sent-level">{item.level}</span>
      <div className="ls-sent-controls">
        <PlayBtn id={pKey} text={item.text} audioUrl={item.audioUrl} rate={0.8} label="朗读" playingKey={playingKey} play={play} />
        <PlayBtn id={`${pKey}-slow`} text={item.text} audioUrl={item.audioUrl} rate={0.65} label="慢速" playingKey={playingKey} play={play} className="ls-play-btn--slow" />
      </div>
      <textarea
        className="ls-sent-textarea"
        aria-label={`${item.text} 句子听写输入`}
        rows={2}
        value={value}
        onChange={e => {
          if (recordedRef.current) startedAtRef.current = Date.now();
          setValue(e.target.value);
          setRevealed(false);
          recordedRef.current = false;
        }}
        placeholder="听后输入句子…"
        spellCheck={false}
      />
      <div className="ls-sent-footer">
        <button type="button" aria-label={revealed ? "隐藏句子答案" : "核对句子答案"} className="ls-link-btn" onClick={toggleReveal}>
          {revealed ? "隐藏答案" : "核对答案"}
        </button>
      </div>
      {revealed && <DiffDisplay input={value} correct={item.text} />}
    </div>
  );
}

export function PassageView({ passage, playingKey, play, user, metadataContext = null }) {
  const [values, setValues] = useState(() => passage.sentences.map(() => ""));
  const [revealed, setRevealed] = useState(() => passage.sentences.map(() => false));
  const startedAtRef = useRef(Date.now());
  const recordedRef = useRef(passage.sentences.map(() => false));
  const pid = passage.id;

  function setVal(i, v) {
    if (recordedRef.current[i]) startedAtRef.current = Date.now();
    setValues(prev => prev.map((x, j) => j === i ? v : x));
    setRevealed(prev => prev.map((x, j) => j === i ? false : x));
    recordedRef.current = recordedRef.current.map((x, j) => j === i ? false : x);
  }
  function toggleReveal(i) {
    const norm = s => s.replace(/[.,!?]/g, "").trim().toLowerCase();
    const ok = norm(values[i]) === norm(passage.sentences[i]);
    if (!revealed[i] && values[i].trim() && !recordedRef.current[i]) {
      recordedRef.current = recordedRef.current.map((x, j) => j === i ? true : x);
      recordListeningProgress(user, {
        activityType: "advanced-sentence",
        score: ok ? 100 : 0,
        accuracy: ok ? 100 : 0,
        durationMs: elapsedSince(startedAtRef),
        metadata: {
          passageId: passage.id,
          title: passage.title,
          sentenceIndex: i,
          text: passage.sentences[i].slice(0, 200),
          input: values[i].trim().slice(0, 200),
        },
      }, metadataContext);
    }
    setRevealed(prev => prev.map((x, j) => j === i ? !x : x));
  }

  return (
    <div className="ls-passage">
      <div className="ls-passage-hd">
        <h3 className="ls-passage-title">{passage.title}</h3>
        <span className="ls-passage-level">{passage.level}</span>
        <PlayBtn id={`${pid}-full`} text={passage.sentences.join(" ")} audioUrl={passage.audioUrl} rate={0.8} label="全文朗读" playingKey={playingKey} play={play} />
      </div>
      <div className="ls-passage-sentences">
        {passage.sentences.map((sent, i) => {
          const norm = s => s.replace(/[.,!?]/g, "").trim().toLowerCase();
          const ok = norm(values[i]) === norm(sent);
          return (
            <div key={i} className="ls-passage-row">
              <div className="ls-passage-num">{i + 1}</div>
              <div className="ls-passage-body">
                <div className="ls-passage-controls">
                  <PlayBtn id={`${pid}-s${i}`}       text={sent} audioUrl={passage.sentenceAudioUrls?.[i]} rate={0.8} label="播放" playingKey={playingKey} play={play} className="ls-play-btn--sm" />
                  <PlayBtn id={`${pid}-s${i}-slow`}  text={sent} audioUrl={passage.sentenceAudioUrls?.[i]} rate={0.65} label="慢速" playingKey={playingKey} play={play} className="ls-play-btn--sm ls-play-btn--slow" />
                </div>
                <textarea
                  className={`ls-passage-textarea${ok && values[i] ? " is-ok" : ""}`}
                  aria-label={`第 ${i + 1} 句精听输入`}
                  rows={2}
                  value={values[i]}
                  onChange={e => setVal(i, e.target.value)}
                  placeholder={`第 ${i + 1} 句…`}
                  spellCheck={false}
                />
                <div className="ls-passage-row-footer">
                  <button type="button" aria-label={revealed[i] ? `隐藏第 ${i + 1} 句答案` : `核对第 ${i + 1} 句答案`} className="ls-link-btn" onClick={() => toggleReveal(i)}>
                    {revealed[i] ? "隐藏" : "核对"}
                  </button>
                  {ok && values[i] && <span className="ls-feedback ls-feedback--ok ls-feedback--sm">正确！</span>}
                </div>
                {revealed[i] && <DiffDisplay input={values[i]} correct={sent} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
