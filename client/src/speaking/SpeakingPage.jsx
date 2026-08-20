/* eslint-disable complexity */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import SpeakingTopBar from "./SpeakingTopBar.jsx";
import { speakingAPI } from "../api/index.js";
import { getPrepExamSystemId } from "../app/prepExamConfig.js";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import { createRealtimeAsrSession } from "../writing/core/realtimeAsrClient.js";
import "./speaking.css";

const FALLBACK_QUESTIONS = [
  {
    id: "local-conversation-1",
    type: "conversation",
    prompt: "You meet a new classmate for the first time. Introduce yourself and ask two friendly questions.",
    sampleAnswer: "Hi, my name is Anna. I like reading and playing tennis. What is your name, and what do you usually do after school?",
    prepTime: 20,
    responseTime: 60,
  },
  {
    id: "local-opinion-1",
    type: "opinion",
    prompt: "Do you think students should do sports every day? Give your opinion and two reasons.",
    sampleAnswer: "I think students should do sports every day because exercise keeps us healthy and helps us relax after studying.",
    prepTime: 30,
    responseTime: 90,
  },
  {
    id: "local-story-1",
    type: "story",
    prompt: "Tell a short story about a time when someone helped you.",
    sampleAnswer: "Last week I forgot my umbrella. My friend shared hers with me, so we walked home together and I did not get wet.",
    prepTime: 30,
    responseTime: 90,
  },
];

const TYPE_LABELS = {
  conversation: "情景对话",
  opinion: "观点表达",
  story: "故事讲述",
  description: "描述表达",
  discussion: "讨论表达",
  reading_aloud: "朗读练习",
};

const MIN_TRANSCRIPT_WORDS = 5;

function supportsRealtimeAsr() {
  if (typeof window === "undefined") return false;
  return Boolean(navigator.mediaDevices?.getUserMedia && window.WebSocket && (window.AudioContext || window.webkitAudioContext));
}

function appendTranscript(baseText, transcript) {
  const cleanBase = String(baseText || "").trim();
  const cleanTranscript = String(transcript || "").trim();
  return [cleanBase, cleanTranscript].filter(Boolean).join(cleanBase ? "\n" : "");
}

function getSegmentTranscript(message) {
  return message.utteranceText || message.definiteText || "";
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreSpeaking({ prompt, transcript, durationMs }) {
  const words = tokenize(transcript);
  const promptTerms = new Set(tokenize(prompt).filter((word) => word.length > 3));
  const usedPromptTerms = words.filter((word) => promptTerms.has(word)).length;
  const lengthScore = Math.min(45, words.length * 2);
  const relevanceScore = promptTerms.size ? Math.min(30, Math.round((usedPromptTerms / Math.min(promptTerms.size, 8)) * 30)) : 15;
  const fluencyScore = durationMs > 0 ? Math.min(25, Math.round((words.length / Math.max(10, durationMs / 1000)) * 12)) : 10;
  const score = Math.max(0, Math.min(100, lengthScore + relevanceScore + fluencyScore));

  const feedback = [];
  if (words.length < 20) feedback.push("表达偏短，下一次至少说出 3 句完整英文。");
  else feedback.push("表达长度已经可以支撑一次有效练习。");
  if (relevanceScore < 15) feedback.push("内容和题目关键词连接还不够，先复述题目核心再展开理由。");
  else feedback.push("回答和题目主题有连接。");
  if (fluencyScore < 12) feedback.push("语速或停顿偏慢，可以先列 2 个关键词再开口。");
  else feedback.push("整体输出节奏可继续保持。");

  return {
    score,
    wordCount: words.length,
    feedback,
  };
}

function formatSeconds(value) {
  if (!value) return "不限时";
  return `${value} 秒`;
}

function formatPracticeDate(value) {
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}

export default function SpeakingPage({
  onNavigate, user, onLoginClick, onRegisterClick, activePage = "speaking", onAccountClick,
  prepExamId = "",
  hideTopBar = false,
}) {
  const pageRef = useScrollReveal();
  const sessionRef = useRef(null);
  const startedAtRef = useRef(0);
  const sessionIdRef = useRef(0);
  const progressRequestRef = useRef(0);
  const [questions, setQuestions] = useState(FALLBACK_QUESTIONS);
  const [activeId, setActiveId] = useState(FALLBACK_QUESTIONS[0].id);
  const [transcript, setTranscript] = useState("");
  const [recordingState, setRecordingState] = useState("idle");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [durationMs, setDurationMs] = useState(0);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [progress, setProgress] = useState(null);
  const systemId = getPrepExamSystemId(prepExamId);

  const activeQuestion = useMemo(
    () => questions.find((item) => item.id === activeId) || questions[0] || FALLBACK_QUESTIONS[0],
    [activeId, questions],
  );

  useEffect(() => {
    setVoiceSupported(supportsRealtimeAsr());
    speakingAPI.questions(20, { systemId })
      .then((items) => {
        if (Array.isArray(items) && items.length) {
          setQuestions(items);
          setActiveId(items[0].id);
        }
      })
      .catch(() => {});

    return () => {
      sessionIdRef.current += 1;
      progressRequestRef.current += 1;
      sessionRef.current?.abort?.();
      sessionRef.current = null;
    };
  }, [systemId]);

  const loadProgress = useCallback(() => {
    const requestId = progressRequestRef.current + 1;
    progressRequestRef.current = requestId;
    if (!user?.id) {
      setProgress(null);
      return Promise.resolve(null);
    }
    return speakingAPI.progress()
      .then((data) => {
        if (progressRequestRef.current !== requestId) return null;
        setProgress(data || null);
        return data;
      })
      .catch(() => null);
  }, [user?.id]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const stopRecording = ({ final = true } = {}) => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) {
      if (final) {
        sessionIdRef.current += 1;
        setRecordingState("idle");
        setStatus("录音已停止");
      }
      return;
    }
    if (final) session.stop();
    else session.abort();
  };

  const startRecording = async () => {
    if (!voiceSupported) {
      setStatus("当前浏览器不支持实时语音识别，请直接在文本框输入回答。");
      return;
    }
    if (sessionRef.current) return;

    setResult(null);
    setStatus("正在连接实时语音识别");
    setRecordingState("recording");
    startedAtRef.current = Date.now();
    const baseText = transcript;
    const sessionId = sessionIdRef.current + 1;
    sessionIdRef.current = sessionId;

    try {
      const session = await createRealtimeAsrSession({
        language: "en-US",
        onOpen: () => {
          if (sessionIdRef.current !== sessionId) return;
          setStatus("录音识别中");
        },
        onResult: (message) => {
          if (sessionIdRef.current !== sessionId) return;
          if (message.text) {
            setTranscript(appendTranscript(baseText, message.text));
            return;
          }
          const segment = getSegmentTranscript(message);
          if (segment) setTranscript((current) => appendTranscript(current, segment));
        },
        onError: (message) => {
          if (sessionIdRef.current !== sessionId) return;
          setStatus(message || "语音识别失败，请稍后重试。");
          setRecordingState("idle");
          stopRecording({ final: false });
        },
        onClose: () => {
          if (sessionIdRef.current !== sessionId) return;
          setDurationMs((current) => current + Math.max(0, Date.now() - startedAtRef.current));
          setRecordingState("idle");
          setStatus("录音已停止");
          sessionRef.current = null;
        },
      });
      if (sessionIdRef.current !== sessionId) {
        session?.abort?.();
        return;
      }
      sessionRef.current = session;
    } catch (error) {
      if (sessionIdRef.current !== sessionId) return;
      setRecordingState("idle");
      setStatus(error.message || "语音识别启动失败，请改用文本输入。");
    }
  };

  const finishPractice = () => {
    if (!transcript.trim()) {
      setResult(null);
      setStatus("请先录音或输入英文回答，再生成反馈。");
      return;
    }
    if (tokenize(transcript).length < MIN_TRANSCRIPT_WORDS) {
      setResult(null);
      setStatus("回答太短，请至少说出 5 个英文词。");
      return;
    }

    const elapsedMs = recordingState === "recording" ? Math.max(0, Date.now() - startedAtRef.current) : 0;
    const nextDurationMs = durationMs + elapsedMs;
    if (elapsedMs) startedAtRef.current = Date.now();
    stopRecording({ final: true });
    setDurationMs(nextDurationMs);
    const nextResult = scoreSpeaking({
      prompt: activeQuestion.prompt,
      transcript,
      durationMs: nextDurationMs,
    });
    setResult(nextResult);
    setStatus(user?.id ? "已生成反馈并保存练习记录" : "已生成反馈，登录后可保存练习记录");

    if (user?.id) {
      speakingAPI.recordProgress({
        activityType: activeQuestion.type || "opinion",
        questionId: String(activeQuestion.id || "").startsWith("local-") ? null : activeQuestion.id,
        transcript,
        score: nextResult.score,
        durationMs: nextDurationMs,
        feedback: nextResult.feedback.join(" "),
        metadata: {
          wordCount: nextResult.wordCount,
          prompt: activeQuestion.prompt,
          prepExamId,
          systemId,
        },
      }).then(() => loadProgress())
        .catch(() => setStatus("反馈已生成，但练习记录保存失败"));
    }
  };

  const resetPractice = (questionId = activeId) => {
    sessionIdRef.current += 1;
    stopRecording({ final: false });
    setActiveId(questionId);
    setTranscript("");
    setResult(null);
    setDurationMs(0);
    setRecordingState("idle");
    setStatus("");
  };

  function buildNextSpeakingAction() {
    if (!result) return "";
    if (result.score < 70) return "下一步：先重练这道题，把回答扩展到至少 5 个完整英文句子，并补一个具体例子。";
    if (activeQuestion.type === "reading_aloud") return "下一步：换一道朗读题，重点控制停顿、重音和语速。";
    if (activeQuestion.type === "conversation") return "下一步：继续情景对话，尝试补充追问或回应细节。";
    return "下一步：换一道观点表达题，按观点、理由、例子三步组织回答。";
  }

  return (
    <div className="sp-page" ref={pageRef}>
      {!hideTopBar && <SpeakingTopBar
        onLogin={onLoginClick || (() => onNavigate?.("auth"))}
        onRegister={onRegisterClick || (() => onNavigate?.("auth"))}
        user={user}
        onNavigate={onNavigate}
        activePage={activePage}
        onAccountClick={onAccountClick}
      />}
      <main className="sp-main">
        <PageHero
          eyebrow="筑巢口语 · 实时练习"
          title="开口回答，马上看到表达反馈。"
          description="选择题目后录音，系统会用实时 ASR 转写回答，并按表达长度、题目相关性和输出节奏给出练习反馈。"
        />

        <section className="sp-workbench studio-reveal studio-reveal--delay-1">
          <aside className="sp-question-list" aria-label="口语题目">
            {questions.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`sp-question-item${item.id === activeQuestion.id ? " is-active" : ""}`}
                onClick={() => resetPractice(item.id)}
              >
                <strong>{TYPE_LABELS[item.type] || "口语练习"}</strong>
                <span>{item.prompt}</span>
              </button>
            ))}
          </aside>

          <div className="sp-practice">
            <div className="sp-prompt-card">
              <div className="sp-prompt-meta">
                <span>{TYPE_LABELS[activeQuestion.type] || "口语练习"}</span>
                <span>准备 {formatSeconds(activeQuestion.prepTime)}</span>
                <span>回答 {formatSeconds(activeQuestion.responseTime)}</span>
              </div>
              <h2>{activeQuestion.prompt}</h2>
              {activeQuestion.sampleAnswer && (
                <details className="sp-sample">
                  <summary>查看参考表达</summary>
                  <p>{activeQuestion.sampleAnswer}</p>
                </details>
              )}
            </div>

            <div className="sp-recorder">
              <div className="sp-recorder-actions">
                <button
                  type="button"
                  className="sp-cta-btn"
                  onClick={recordingState === "recording" ? () => stopRecording({ final: true }) : startRecording}
                >
                  {recordingState === "recording" ? "停止录音" : "开始录音"}
                </button>
                <button type="button" className="sp-cta-btn sp-cta-btn--secondary" onClick={finishPractice}>
                  生成反馈
                </button>
                <button type="button" className="sp-cta-btn sp-cta-btn--ghost" onClick={() => resetPractice()}>
                  重练
                </button>
              </div>
              <p className={`sp-status${recordingState === "recording" ? " is-active" : ""}`}>
                {status || (voiceSupported ? "可以开始录音，也可以直接编辑转写文本。" : "当前环境未检测到实时 ASR，可直接输入回答。")}
              </p>
              <textarea
                className="sp-transcript"
                aria-label="口语回答转写文本"
                value={transcript}
                onChange={(event) => {
                  setTranscript(event.target.value);
                  setResult(null);
                }}
                placeholder="录音转写会显示在这里，也可以手动输入英文回答。"
                rows={8}
              />
            </div>

            {result && (
              <div className="sp-feedback" role="status">
                <div className="sp-score">
                  <strong>{result.score}</strong>
                  <span>练习分</span>
                </div>
                <div>
                  <h3>即时反馈</h3>
                  <ul>
                    {result.feedback.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  <p>识别词数：{result.wordCount}</p>
                  <p>{buildNextSpeakingAction()}</p>
                </div>
              </div>
            )}

            {user?.id && (
              <section className="sp-history" aria-label="口语进度">
                <div className="sp-history-summary">
                  <div>
                    <strong>{progress?.sessions || 0}</strong>
                    <span>累计练习</span>
                  </div>
                  <div>
                    <strong>{progress?.averageScore || 0}</strong>
                    <span>平均分</span>
                  </div>
                  <div>
                    <strong>{Math.round((progress?.durationMs || 0) / 60000)}</strong>
                    <span>分钟</span>
                  </div>
                </div>
                <div className="sp-history-list">
                  <h3>练习历史</h3>
                  {progress?.recent?.length ? (
                    progress.recent.slice(0, 5).map((item) => (
                      <div className="sp-history-item" key={item.id}>
                        <strong>{TYPE_LABELS[item.activityType] || "口语练习"}</strong>
                        <span>{item.score ?? "--"} 分 · {formatPracticeDate(item.createdAt)}</span>
                        <p>{item.transcript}</p>
                      </div>
                    ))
                  ) : (
                    <p className="sp-history-empty">完成一次练习后会显示记录。</p>
                  )}
                </div>
              </section>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
