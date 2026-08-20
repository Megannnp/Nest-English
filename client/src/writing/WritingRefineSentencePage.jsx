import { useEffect, useMemo, useRef, useState } from "react";

import WritingTopBar from "./WritingTopBar.jsx";
import { csrfHeaderForOptions } from "../api/client.js";
import { writingProgressAPI } from "../api/index.js";
import GuestTopBar from "../app/guest/GuestTopBar.jsx";
import AppIcon from "../components/shared/AppIcon.jsx";
import ModuleAssignmentSection from "../components/shared/ModuleAssignmentSection.jsx";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./WritingRefinePage.css";
import "./writing.css";

const WRITING_REFINE_SENTENCE_TYPES = [{ value: 'writing-refine-sentence', label: '句子润色' }];

const SENTENCE_TYPES = [
  { id: "emotion", label: "描写心情", icon: "heart", desc: "表达情绪与内心感受",
    topics: ["获奖后的喜悦", "考试失利的沮丧", "久别重逢的激动", "独自在家的孤独", "收到礼物的惊喜", "演出前的紧张", "毕业典礼的感慨", "受委屈后的委屈", "被误解时的无奈", "完成挑战后的自豪"] },
  { id: "scenery", label: "描写景色", icon: "leaf", desc: "自然环境与氛围营造",
    topics: ["清晨的校园", "暴雨后的街道", "冬日雪后的公园", "夜晚的海边", "秋天的树林", "正午的沙漠", "黄昏的乡村田野", "雾中的山峰", "春天的花园", "城市夜景"] },
  { id: "action", label: "描写动作", icon: "zap", desc: "动作细节与连贯表达",
    topics: ["运动员冲刺", "厨师切菜", "画家作画", "小孩学走路", "老人打太极", "学生考试答题", "消防员救援", "舞蹈家旋转", "猫咪扑蝴蝶", "医生做手术"] },
  { id: "opinion", label: "表达观点", icon: "lightbulb", desc: "议论立场与逻辑推进",
    topics: ["手机对学习的影响", "体育锻炼的重要性", "团队合作的意义", "读书的价值", "诚实比聪明更重要", "失败是成功之母", "保护环境人人有责", "互联网改变生活", "友谊需要用心维护", "坚持的力量"] },
  { id: "character", label: "描写人物", icon: "account", desc: "外貌性格与人物刻画",
    topics: ["严格但关心学生的老师", "总是微笑的邻居老奶奶", "勤劳的父亲", "活泼好动的同桌", "沉默寡言的图书管理员", "充满热情的志愿者", "耐心的医生", "爱开玩笑的朋友", "刻苦训练的运动员", "优雅从容的演讲者"] },
  { id: "event", label: "叙述事件", icon: "book-open", desc: "起因经过与事件记录",
    topics: ["一次意外的停电", "找到丢失的钱包", "第一次独自旅行", "帮助陌生人迷路", "比赛最后一刻逆转", "忘带作业被老师批评", "组织一次班级活动", "雨中等公交的经历", "捡到一只流浪猫", "第一次登台演讲"] },
  { id: "dialogue", label: "描写对话", icon: "message", desc: "人物交流与语言表现",
    topics: ["同学之间争论谁对谁错", "向老师请教难题", "父母劝说孩子少玩手机", "朋友道歉与和好", "问路与指路", "买东西讨价还价", "医生询问病情", "面试中的自我介绍", "老师表扬与激励", "两个陌生人偶然相遇"] },
];

const DIFFICULTIES = ["简单", "中等", "困难"];

async function callAI(messages, maxTokens = 800, signal) {
  const res = await fetch("/api/grammar/practice", {
    method: "POST",
    signal,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...csrfHeaderForOptions({ method: "POST" }),
    },
    body: JSON.stringify({ purpose: "writing_refine_sentence", messages, max_tokens: maxTokens, temperature: 0.9 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "AI请求失败");
  return data.content || data.data?.content || "";
}

function StepProgress({ step }) {
  return (
    <div className="gm-quiz-step__progress">
      {[1, 2].map((_, i) => (
        <div key={i} className={`gm-quiz-step__dot ${i < step - 1 ? "active" : i === step - 1 ? "current" : ""}`} />
      ))}
    </div>
  );
}

function SentenceTypeStep({ selectedType, onSelectType, onNext }) {
  return (
    <div className="gm-quiz-step" style={{ maxWidth: 560, margin: "0 auto" }}>
      <StepProgress step={1} />
      <p className="gm-quiz-step__num">第 1 步 / 共 2 步</p>
      <h2 className="gm-quiz-step__title">想练习哪种句子？</h2>
      <div className="wr-sentence__types">
        {SENTENCE_TYPES.map(type => (
          <button
            key={type.id}
            type="button"
            className={`wr-sentence__type-btn ${selectedType === type.id ? "active" : ""}`}
            onClick={() => onSelectType(type.id)}
          >
            <span className="wr-sentence__type-icon"><AppIcon name={type.icon} size={22} /></span>
            <span className="wr-sentence__type-label">{type.label}</span>
            <span className="wr-sentence__type-desc">{type.desc}</span>
          </button>
        ))}
      </div>
      {selectedType && (
        <button type="button" className="gm-btn-primary gm-quiz-step__next" onClick={onNext}>
          下一步
        </button>
      )}
    </div>
  );
}

function DifficultyStep({ difficulty, error, loading, onBack, onGenerate, onSetDifficulty }) {
  return (
    <div className="gm-quiz-step" style={{ maxWidth: 560, margin: "0 auto" }}>
      <StepProgress step={2} />
      <p className="gm-quiz-step__num">第 2 步 / 共 2 步</p>
      <h2 className="gm-quiz-step__title">选择难度</h2>
      <div className="gm-quiz-step__chips">
        {DIFFICULTIES.map(d => (
          <button
            key={d}
            type="button"
            className={`gm-quiz-chip ${difficulty === d ? "active" : ""}`}
            onClick={() => onSetDifficulty(d)}
          >
            {d}
          </button>
        ))}
      </div>
      {difficulty && (
        <button
          type="button"
          aria-label={loading ? "AI 生成中" : "开始练习"}
          className="gm-btn-primary gm-quiz-step__next"
          onClick={onGenerate}
          disabled={loading}
        >
          {loading ? "AI 生成中…" : "开始练习"}
        </button>
      )}
      <button type="button" className="gm-quiz-step__back" onClick={onBack}>← 上一步</button>
      {error && <p style={{ color: "#c04030", fontSize: 14, marginTop: 12 }}>{error}</p>}
    </div>
  );
}

function ExplanationText({ text }) {
  // Remove markdown bold markers (**text**) and split into numbered paragraphs
  const clean = text.replace(/\*\*/g, "");
  // Split on numbered list items like "1. " "2. " "3. " at start or after newline
  const parts = clean.split(/(?=\d+\.\s)/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) {
    return <p style={{ margin: 0, lineHeight: 1.8, fontSize: 14 }}>{clean}</p>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {parts.map((part, i) => (
        <p key={i} style={{ margin: 0, lineHeight: 1.8, fontSize: 14 }}>{part}</p>
      ))}
    </div>
  );
}

function PolishedResult({ favoriteState, onFavorite, polished, userSentence, onContinue, onRestart }) {
  if (!polished) return null;

  return (
    <div className="wr-sentence__compare">
      <div className="wr-sentence__compare-col">
        <p className="wr-sentence__compare-label">你的句子</p>
        <p className="wr-sentence__compare-text">{userSentence}</p>
      </div>
      <div className="wr-sentence__compare-col wr-sentence__compare-col--polished">
        <p className="wr-sentence__compare-label">AI 润色版</p>
        <p className="wr-sentence__compare-text">{polished.sentence}</p>
      </div>
      {polished.explanation && (
        <div className="wr-sentence__explanation">
          <p className="wr-sentence__explanation-label">润色说明</p>
          <ExplanationText text={polished.explanation} />
        </div>
      )}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button type="button" className="gm-btn-primary" onClick={onRestart}>再练一句</button>
        <button type="button" className="gm-btn-secondary" onClick={onContinue}>继续修改</button>
        <button type="button" className="gm-btn-secondary" aria-label="收藏句子" onClick={onFavorite} disabled={favoriteState === "saving"}>
          {favoriteState === "saving" ? "收藏中…" : favoriteState === "saved" ? "已收藏" : favoriteState === "error" ? "收藏失败，重试" : "收藏句子"}
        </button>
      </div>
    </div>
  );
}

function SentenceDraftEditor({
  error,
  hintLoading,
  hints,
  loading,
  onGetHints,
  onPolish,
  onSetUserSentence,
  userSentence,
}) {
  return (
    <>
      <div className="wr-sentence__input-area">
        <textarea
          className="wr-sentence__textarea"
          aria-label="扩充后的句子"
          placeholder="在这里输入你扩充后的句子..."
          value={userSentence}
          onChange={e => onSetUserSentence(e.target.value)}
          rows={4}
        />
        <div className="wr-sentence__input-actions">
          <button type="button" className="gm-btn-secondary" aria-label={hintLoading ? "思考中" : "获取提示"} onClick={onGetHints} disabled={!userSentence.trim() || hintLoading}>
            {hintLoading ? "思考中…" : <><AppIcon name="lightbulb" size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />获取提示</>}
          </button>
          <button type="button" className="gm-btn-primary" aria-label={loading ? "润色中" : "AI 润色"} onClick={onPolish} disabled={!userSentence.trim() || loading}>
            {loading ? "润色中…" : <><AppIcon name="sparkles" size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />AI 润色</>}
          </button>
        </div>
      </div>
      {hints.length > 0 && (
        <div className="wr-sentence__hints">
          <p className="wr-sentence__hints-label">AI 建议</p>
          {hints.map((hint, i) => (
            <p key={i} className="wr-sentence__hint-item"><AppIcon name="message" size={13} style={{ verticalAlign: "middle", marginRight: 4, flexShrink: 0 }} />{hint}</p>
          ))}
        </div>
      )}
      {error && <p style={{ color: "#c04030", fontSize: 14, marginTop: 8 }}>{error}</p>}
    </>
  );
}

function PracticeStep({
  baseSentence,
  error,
  hintLoading,
  hints,
  loading,
  onContinueEditing,
  onFavorite,
  onGetHints,
  onPolish,
  onRestart,
  onSetUserSentence,
  polished,
  favoriteState,
  userSentence,
}) {
  return (
    <div className="wr-sentence__practice">
      <div className="wr-sentence__base-card">
        <p className="wr-sentence__base-label">AI 给出的基础句</p>
        <p className="wr-sentence__base-sentence">{baseSentence}</p>
        <p className="wr-sentence__base-hint">在下方输入框中扩充这个句子，添加定语、状语、从句等让句子更丰富。</p>
      </div>

      <PolishedResult
        favoriteState={favoriteState}
        onFavorite={onFavorite}
        polished={polished}
        userSentence={userSentence}
        onContinue={onContinueEditing}
        onRestart={onRestart}
      />
      {!polished && (
        <SentenceDraftEditor
          error={error}
          hintLoading={hintLoading}
          hints={hints}
          loading={loading}
          onGetHints={onGetHints}
          onPolish={onPolish}
          onSetUserSentence={onSetUserSentence}
          userSentence={userSentence}
        />
      )}
      <button type="button" className="gm-quiz-step__back" style={{ marginTop: 16 }} onClick={onRestart}>← 重新选择</button>
    </div>
  );
}

const PRACTICE_STORAGE_KEY = "nest:sentence-practice:state";

function loadSavedPracticeState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(PRACTICE_STORAGE_KEY) || "null");
    if (saved?.step) return saved;
  } catch {
    return null;
  }
  return null;
}

function getRandomTopic(type) {
  const topicList = type?.topics || [];
  return topicList[Math.floor(Math.random() * topicList.length)] || "";
}

function getHintLevelGuide(difficulty) {
  if (difficulty === "简单") {
    return "提示要简单易懂，建议学生加入时间/地点/感受等基础细节，不要涉及复杂语法";
  }
  if (difficulty === "中等") {
    return "提示可建议加入简单从句、形容词短语或副词修饰，难度适合高中生";
  }
  return "提示可建议使用分词短语、独立主格、高级词汇替换或修辞手法，适合高考拔高";
}

function getPolishLevelGuide(difficulty) {
  if (difficulty === "简单") {
    return `润色要求（简单级别 · 初中生适用）：
- 只做最小改动：替换 1-2 个常用词为稍好的表达（如 happy→pleased，went→walked）
- 保持原句主干结构不变，不引入复杂从句或倒装
- 总词数不超过学生原句的 1.5 倍
- 不使用高考以上难度词汇`;
  }
  if (difficulty === "中等") {
    return `润色要求（中等级别 · 高中生适用）：
- 可替换 2-3 个词为高中范围内的较好表达
- 可添加一个简单状语或定语从句，增加层次感
- 总词数不超过学生原句的 1.8 倍
- 词汇控制在高考大纲范围内，避免偏僻生词`;
  }
  return `润色要求（困难级别 · 高考/竞赛适用）：
- 可进行较大幅度改写，使用高级词汇和复杂句式
- 可引入独立主格、分词短语、插入语等高级结构
- 可使用排比、比喻等修辞手法
- 词汇可超出高考大纲，追求表达精准优美`;
}

function parsePolishedResponse(content) {
  const polishedMatch = content.match(/【润色句】\s*([\s\S]*?)(?=【说明】|$)/);
  const explanationMatch = content.match(/【说明】\s*([\s\S]*?)$/);
  return {
    sentence: polishedMatch?.[1]?.trim() || content,
    explanation: explanationMatch?.[1]?.trim() || "",
  };
}

async function requestBaseSentence({ difficulty, selectedType, signal }) {
  const type = SENTENCE_TYPES.find(t => t.id === selectedType);
  const randomTopic = getRandomTopic(type);
  const content = await callAI([
    {
      role: "system",
      content: `你是一位英语写作老师。根据要求生成一个极为简单的英语句子，作为学生扩充练习的基础句。
要求：
1. 句子必须非常简单，主谓结构，不超过8个词
2. 符合${difficulty}难度水平
3. 类型：${type?.label}
4. 场景主题：${randomTopic}（围绕此场景展开，但不要照字面翻译）
5. 只输出英文句子本身，不要任何解释`
    },
    { role: "user", content: `请生成一个【${type?.label}】类型、【${difficulty}】难度、场景为【${randomTopic}】的基础句。` }
  ], 100, signal);
  return content.trim();
}

async function requestHints({ baseSentence, difficulty, selectedType, userSentence, signal }) {
  const type = SENTENCE_TYPES.find(t => t.id === selectedType);
  const hintLevel = getHintLevelGuide(difficulty);
  const content = await callAI([
    {
      role: "system",
      content: `你是一位英语写作老师，给学生提供句子扩充的具体提示。
${hintLevel}
给出3条简短的中文提示，每条不超过20字，帮助学生进一步扩充句子。
只输出3条提示，每条一行，不要编号，不要其他内容。`
    },
    {
      role: "user",
      content: `基础句：${baseSentence}\n学生当前句子：${userSentence}\n类型：${type?.label}，难度：${difficulty}\n请给出3条扩充提示。`
    }
  ], 200, signal);
  return content.trim().split("\n").filter(l => l.trim()).slice(0, 3);
}

async function requestPolishedSentence({ baseSentence, difficulty, selectedType, userSentence, signal }) {
  const type = SENTENCE_TYPES.find(t => t.id === selectedType);
  const levelGuide = getPolishLevelGuide(difficulty);
  const content = await callAI([
    {
      role: "system",
      content: `你是一位英语写作老师，负责对学生句子进行分级润色。

${levelGuide}

输出格式（严格按此格式，不要其他内容）：
【润色句】
（润色后的英文句子）
【说明】
（中文说明：1. 做了哪些改动及原因 2. 新增或替换的表达 3. 适合该级别学生的学习重点）`
    },
    {
      role: "user",
      content: `基础句：${baseSentence}\n学生写的句子：${userSentence}\n类型：${type?.label}，难度：${difficulty}\n请按照${difficulty}级别要求润色并说明。`
    }
  ], 600, signal);
  return parsePolishedResponse(content);
}

function SentencePracticeStep({
  baseSentence,
  difficulty,
  error,
  generateBaseSentence,
  getHints,
  favoriteState,
  hintLoading,
  hints,
  loading,
  polishSentence,
  polished,
  restart,
  saveFavorite,
  selectedType,
  setDifficulty,
  setPolished,
  setSelectedType,
  setStep,
  setUserSentence,
  step,
  userSentence,
}) {
  if (step === 1) {
    return <SentenceTypeStep selectedType={selectedType} onSelectType={setSelectedType} onNext={() => setStep(2)} />;
  }

  if (step === 2) {
    return <DifficultyStep difficulty={difficulty} error={error} loading={loading} onBack={() => setStep(1)} onGenerate={generateBaseSentence} onSetDifficulty={setDifficulty} />;
  }

  return (
    <PracticeStep
      baseSentence={baseSentence}
      error={error}
      hintLoading={hintLoading}
      hints={hints}
      loading={loading}
      onContinueEditing={() => setPolished(null)}
      onFavorite={saveFavorite}
      onGetHints={getHints}
      onPolish={polishSentence}
      onRestart={restart}
      onSetUserSentence={setUserSentence}
      polished={polished}
      favoriteState={favoriteState}
      userSentence={userSentence}
    />
  );
}

function SentencePractice({ user, onLoginClick }) {
  const saved = useMemo(() => loadSavedPracticeState(), []);

  const [step, setStep] = useState(saved?.step ?? 1);
  const [selectedType, setSelectedType] = useState(saved?.selectedType ?? null);
  const [difficulty, setDifficulty] = useState(saved?.difficulty ?? "");
  const [baseSentence, setBaseSentence] = useState(saved?.baseSentence ?? "");
  const [userSentence, setUserSentence] = useState(saved?.userSentence ?? "");
  const [hints, setHints] = useState(saved?.hints ?? []);
  const [polished, setPolished] = useState(saved?.polished ?? null);
  const [loading, setLoading] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [error, setError] = useState("");
  const [favoriteState, setFavoriteState] = useState("");
  const abortRef = useRef(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  function getSignal() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }

  // 每次状态变化时自动保存到 sessionStorage
  useEffect(() => {
    if (step === 1 && !selectedType) {
      sessionStorage.removeItem(PRACTICE_STORAGE_KEY);
      return;
    }
    try {
      sessionStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify({
        step, selectedType, difficulty, baseSentence, userSentence, hints, polished,
      }));
    } catch {
      // Ignore storage failures; practice state is non-critical.
    }
  }, [step, selectedType, difficulty, baseSentence, userSentence, hints, polished]);

  async function generateBaseSentence() {
    const signal = getSignal();
    setLoading(true);
    setError("");
    setBaseSentence("");
    setUserSentence("");
    setHints([]);
    setPolished(null);
    try {
      const sentence = await requestBaseSentence({ difficulty, selectedType, signal });
      setBaseSentence(sentence);
      setStep(3);
    } catch (e) {
      if (e.name === "AbortError") return;
      setError(e.message || "生成失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function getHints() {
    if (!userSentence.trim()) return;
    const signal = getSignal();
    setHintLoading(true);
    setError("");
    try {
      setHints(await requestHints({ baseSentence, difficulty, selectedType, userSentence, signal }));
    } catch (e) {
      if (e.name === "AbortError") return;
      setError(e.message || "获取提示失败，请重试");
    } finally {
      setHintLoading(false);
    }
  }

  async function polishSentence() {
    if (!userSentence.trim()) return;
    const signal = getSignal();
    setLoading(true);
    setError("");
    try {
      setPolished(await requestPolishedSentence({ baseSentence, difficulty, selectedType, userSentence, signal }));
      setFavoriteState("");
    } catch (e) {
      if (e.name === "AbortError") return;
      setError(e.message || "润色失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    sessionStorage.removeItem(PRACTICE_STORAGE_KEY);
    setStep(1);
    setSelectedType(null);
    setDifficulty("");
    setBaseSentence("");
    setUserSentence("");
    setHints([]);
    setPolished(null);
    setError("");
    setFavoriteState("");
  }

  async function saveFavorite() {
    if (!user?.id) {
      onLoginClick?.();
      return;
    }
    if (!polished?.sentence) return;
    setFavoriteState("saving");
    try {
      await writingProgressAPI.saveFavorite({
        title: "AI 润色句",
        content: polished.sentence,
        metadata: { original: userSentence, explanation: polished.explanation, selectedType, difficulty },
      });
      setFavoriteState("saved");
    } catch {
      setFavoriteState("error");
    }
  }

  return (
    <div className="wr-sentence">
      <SentencePracticeStep
        baseSentence={baseSentence}
        difficulty={difficulty}
        error={error}
        generateBaseSentence={generateBaseSentence}
        getHints={getHints}
        favoriteState={favoriteState}
        hintLoading={hintLoading}
        hints={hints}
        loading={loading}
        polishSentence={polishSentence}
        polished={polished}
        restart={restart}
        saveFavorite={saveFavorite}
        selectedType={selectedType}
        setDifficulty={setDifficulty}
        setPolished={setPolished}
        setSelectedType={setSelectedType}
        setStep={setStep}
        setUserSentence={setUserSentence}
        step={step}
        userSentence={userSentence}
      />
    </div>
  );
}

export default function WritingRefineSentencePage({
  onNavigate, user, onLoginClick, onRegisterClick, onAccountClick, navigateGuestPage,
  hideTopBar = false}) {
  const pageRef = useScrollReveal();

  function handleLogin() {
    if (onLoginClick) { onLoginClick(); return; }
    onNavigate?.("auth");
  }
  function handleRegister() {
    if (onRegisterClick) { onRegisterClick(); return; }
    onNavigate?.("auth");
  }

  return (
    <div className={`writing-studio-shell${user ? "" : " writing-studio-shell--guest"}`} ref={pageRef}>
      {!hideTopBar && (user ? (
        <WritingTopBar
          user={user}
          onNavigate={onNavigate}
          activePage="writing-refine-sentence"
          onAccountClick={onAccountClick}
        />
      ) : (
        <GuestTopBar
          onLogin={handleLogin}
          onRegister={handleRegister}
          onNavigate={onNavigate || navigateGuestPage}
          activePage="writing-refine-sentence"
        />
      ))}
      <main className="wr-refine-page">
        <PageHero eyebrow="筑巢写作 · 句子练习" title="句句打磨，表达自如。" description="AI 引导逐句扩充，系统提升英文表达力" />
        <section className="wr-refine-content">
          <SentencePractice user={user} onLoginClick={handleLogin} />
        </section>
        {user?.role === 'teacher' && (
          <section style={{ padding: '0 24px 40px' }}>
            <ModuleAssignmentSection user={user} moduleTypes={WRITING_REFINE_SENTENCE_TYPES} accentColor="#a0522d" />
          </section>
        )}
      </main>
    </div>
  );
}
