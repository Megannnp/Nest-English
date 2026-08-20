import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock,
  Compass,
  FileText,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  Sparkles,
  Target,
  Timer,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { planLeadsAPI } from "../api/index.js";
import "./plan.css";

const GRADE_OPTIONS = ["小学5年级", "小学6年级", "初一", "初二", "其他"];
const TIME_OPTIONS = ["每天 10-15 分钟", "每天 20-30 分钟", "每天 40 分钟以上"];
const CONTACT_TIME_OPTIONS = ["工作日晚上", "周末上午", "周末下午", "都可以，微信沟通"];

const PAIN_POINTS = [
  [BookOpen, "背了很多单词", "成绩还是不动。"],
  [Timer, "阅读越做越慢", "不知道到底卡在哪。"],
  [Target, "语音/语法/阅读都想补", "但不知道先补哪个。"],
  [Wallet, "报课买资料不少", "结果越来越迷茫。"],
];

const DELIVERABLES = [
  [FileText, "英语学习分析报告", "看清孩子真实问题。"],
  [CalendarDays, "4 周学习规划", "每天学什么，按顺序排好。"],
  [MessagesSquare, "老师一对一解读", "不是统一模板。"],
  [RefreshCw, "一周后复盘", "看看方案是否适合孩子。"],
];

const SCENARIOS = [
  {
    grade: "六年级",
    before: "家长原本以为孩子单词不够。",
    found: "分析后发现，孩子真正困难的是句子一长就看不清关系。",
    next: "先补句子结构，再进入阅读训练。",
  },
  {
    grade: "初一",
    before: "家长一直让孩子背单词。",
    found: "分析后发现，孩子看到陌生词时不会读，只能靠记忆硬背。",
    next: "先做语音和拼读，再配合词汇复现。",
  },
];

const STEPS = ["预约学习分析", "填写孩子情况", "提交近期资料", "老师一对一讲解", "拿到 4 周方案"];

const FOLLOW_UP_OPTIONS = [
  ["自己执行", "能坚持，就不用多花钱。"],
  ["老师陪跑", "知道方向，但需要人盯。"],
  ["系统学习", "需要重建语音或语法体系。"],
];

const FAQS = [
  ["为什么收 9.9 元？", "这是首期体验价。我们希望家长先用很低的成本看清方向，再决定后面怎么学。"],
  ["分析后一定要买课吗？", "不用。学习方案属于你。如果孩子暂时不需要课程，我们会直接告诉你。"],
  ["需要准备什么资料？", "可以准备最近一次英语试卷、平时作业、作文，或其他能反映学习情况的内容。"],
  ["多久完成？", "一般 20-30 分钟。先了解情况，再结合资料和几个小任务判断下一步方向。"],
  ["基础差可以做吗？", "可以。学习分析的目的不是考试排名，而是看孩子下一步最该先补什么。"],
];

function formatLeadNote(form) {
  return [
    `当前水平：${form.childLevel || "未填写"}`,
    `报班/App经历：${form.learningHistory || "未填写"}`,
    `家长最担心：${form.parentConcern || "未填写"}`,
    `方便沟通时间：${form.contactTime || "未填写"}`,
    `补充说明：${form.note || "未填写"}`,
  ].join("\n");
}

export default function PlanDiagnosisPage({ onNavigate }) {
  const [form, setForm] = useState({
    childGrade: "",
    childLevel: "",
    learningHistory: "",
    parentConcern: "",
    dailyTime: "",
    contactTime: "",
    contact: "",
    note: "",
  });
  const [status, setStatus] = useState("idle"); // idle | submitting | done
  const [error, setError] = useState("");

  const update = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.childGrade) {
      setError("请选择孩子的年级");
      return;
    }
    if (!form.parentConcern.trim()) {
      setError("请简单写一下你最担心孩子英语的什么");
      return;
    }
    if (!form.contact.trim()) {
      setError("请留下微信或手机号，方便老师联系你");
      return;
    }
    setStatus("submitting");
    try {
      await planLeadsAPI.submit({
        childGrade: form.childGrade,
        mainProblem: form.parentConcern,
        dailyTime: form.dailyTime,
        contact: form.contact,
        note: formatLeadNote(form),
        source: "plan_page",
      });
      setStatus("done");
    } catch (err) {
      setStatus("idle");
      setError(err?.message || "提交失败，请稍后再试");
    }
  };

  if (status === "done") {
    return (
      <div className="plan-page plan-page--done">
        <div className="plan-done">
          <div className="plan-done__check"><Check size={34} aria-hidden="true" /></div>
          <p className="plan-eyebrow">预约已收到</p>
          <h1>接下来，老师会联系你确认分析时间。</h1>
          <p>
            老师会先了解孩子情况，再安排一次简短学习分析，最后和你一对一讲清楚下一步怎么学。
          </p>
          <button type="button" className="plan-btn plan-btn--ghost" onClick={() => onNavigate?.("portal")}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="plan-page">
      <main>
        <section className="plan-hero">
          <p className="plan-eyebrow">筑巢英语 · 首期体验开放中</p>
          <p className="plan-hero__kicker"><Compass size={28} aria-hidden="true" /> 英语学习计划制定</p>
          <h1>别急着报课，先看清孩子到底卡在哪里。</h1>
          <p className="plan-hero__lead">
            英语学习最贵的，不是课程，而是<span>走错方向的时间</span>。9.9 元，先拿到一份孩子专属的 4 周学习方案。
          </p>
          <div className="plan-price-card" aria-label="首期体验价">
            <span>首期体验价</span>
            <strong>¥9.9</strong>
            <em>分析报告 + 4 周计划 + 老师解读</em>
          </div>
          <div className="plan-hero__actions">
            <a className="plan-btn" href="#plan-form">
              立即预约 9.9 元学习分析 <ArrowRight size={18} aria-hidden="true" />
            </a>
            <span>✨ 第一批名额开放中</span>
          </div>
          <div className="plan-trust">
            <span><Sparkles size={16} aria-hidden="true" /> 老师人工分析</span>
            <span><Clock size={16} aria-hidden="true" /> 20-30 分钟</span>
            <span><CalendarCheck size={16} aria-hidden="true" /> 不强制买课</span>
          </div>
        </section>

        <section className="plan-section">
          <div className="plan-section__head">
            <p className="plan-eyebrow">家长最怕的不是花钱</p>
            <h2>是花了钱，才发现孩子补错了方向。</h2>
            <p>同样 70 分，原因可能完全不同。真正该被看见的，不只是分数，而是分数背后的原因。</p>
          </div>
          <div className="plan-grid plan-grid--pain">
            {PAIN_POINTS.map(([Icon, title, text]) => (
              <article key={title} className="plan-card">
                <span className="plan-card__icon"><Icon size={22} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="plan-section plan-section--quiet">
          <div className="plan-section__head">
            <p className="plan-eyebrow">9.9 元，你将获得</p>
            <h2>不是测评排名，是一份家长看得懂、孩子能照着做的方案。</h2>
          </div>
          <div className="plan-deliverables">
            {DELIVERABLES.map(([Icon, title, text]) => (
              <article key={title}>
                <span><Icon size={19} aria-hidden="true" /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="plan-section">
          <div className="plan-section__head">
            <p className="plan-eyebrow">真实场景</p>
            <h2>很多孩子不是不努力，只是问题藏得很深。</h2>
          </div>
          <div className="plan-scenarios">
            {SCENARIOS.map((item) => (
              <article key={item.grade}>
                <strong>{item.grade}</strong>
                <p><b>家长原本以为：</b>{item.before}</p>
                <p><b>分析后发现：</b>{item.found}</p>
                <p><b>下一步方向：</b>{item.next}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="plan-section plan-process">
          <div className="plan-section__head">
            <p className="plan-eyebrow">预约流程</p>
            <h2>简单 5 步，先把方向定下来。</h2>
          </div>
          <ol>
            {STEPS.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <p>第 8 天，我们会再做一次复盘，看看这份计划是否适合孩子。</p>
        </section>

        <section className="plan-section plan-teacher">
          <div className="plan-section__head">
            <p className="plan-eyebrow">分析老师</p>
            <h2>由老师看真实资料，不靠一套模板下结论。</h2>
          </div>
          <div className="plan-teacher__body">
            <div>
              <h3>小鱼老师</h3>
              <p className="plan-teacher__credential">高考英语 144 分，英语专八，教育硕士</p>
              <p>
                重点看语音、词汇、句子理解和阅读之间的关系，帮家长判断：接下来一个月，先解决什么最划算。
              </p>
            </div>
            <aside>
              <p>公众号</p>
              <strong>小彭 Megan 的英语时间</strong>
              <span>更多关于老师和英语学习分析的信息，可以在公众号获取。</span>
            </aside>
          </div>
        </section>

        <section className="plan-section plan-section--quiet">
          <div className="plan-section__head">
            <p className="plan-eyebrow">下一步选择</p>
            <h2>分析后，不一定要报课。</h2>
          </div>
          <div className="plan-grid">
            {FOLLOW_UP_OPTIONS.map(([title, text]) => (
              <article key={title} className="plan-card">
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <p className="plan-section__note">真正适合孩子的，才是最好的。</p>
        </section>

        <section className="plan-section plan-form-section" id="plan-form">
          <div className="plan-form-copy">
            <p className="plan-eyebrow">现在预约</p>
            <h2>9.9 元，先把孩子的学习方向看清楚。</h2>
            <p>
              留下信息后，老师会联系你确认时间。课程什么时候都可以学，但方向最好一开始就走对。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="plan-form" noValidate>
            <label className="plan-field">
              <span>孩子年级 <em>*</em></span>
              <select value={form.childGrade} onChange={update("childGrade")}>
                <option value="">请选择</option>
                {GRADE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>

            <label className="plan-field">
              <span>当前英语情况</span>
              <input value={form.childLevel} onChange={update("childLevel")} placeholder="例如：初一，最近 70 分左右" maxLength={128} />
            </label>

            <label className="plan-field">
              <span>报过班 / 用过 App 吗</span>
              <input value={form.learningHistory} onChange={update("learningHistory")} placeholder="例如：上过自然拼读，用过背单词 App" maxLength={200} />
            </label>

            <label className="plan-field">
              <span>你最担心孩子英语的什么 <em>*</em></span>
              <textarea value={form.parentConcern} onChange={update("parentConcern")} rows={3} maxLength={600} placeholder="请尽量用自己的话写，比如：单词背了但阅读还是看不懂" />
            </label>

            <div className="plan-form__row">
              <label className="plan-field">
                <span>每天可学时间</span>
                <select value={form.dailyTime} onChange={update("dailyTime")}>
                  <option value="">请选择</option>
                  {TIME_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>

              <label className="plan-field">
                <span>方便沟通时间</span>
                <select value={form.contactTime} onChange={update("contactTime")}>
                  <option value="">请选择</option>
                  {CONTACT_TIME_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>

            <label className="plan-field">
              <span>微信 / 手机号 <em>*</em></span>
              <input type="text" value={form.contact} onChange={update("contact")} placeholder="方便老师联系你" maxLength={128} />
            </label>

            <label className="plan-field">
              <span>补充说明（可不填）</span>
              <textarea value={form.note} onChange={update("note")} rows={2} maxLength={1000} placeholder="例如：校内教材、最近考试、孩子抗拒点" />
            </label>

            {error && <p className="plan-form__error">{error}</p>}

            <button type="submit" className="plan-btn plan-form__submit" disabled={status === "submitting"} aria-label="预约 9.9 元学习分析">
              {status === "submitting" ? "提交中..." : "预约 9.9 元学习分析"} <MessageCircle size={18} aria-hidden="true" />
            </button>
            <p className="plan-form__privacy">提交后仅用于本次学习分析联系与安排。</p>
          </form>
        </section>

        <section className="plan-section plan-faq">
          <div className="plan-section__head">
            <p className="plan-eyebrow">常见问题</p>
            <h2>先放心，再预约。</h2>
          </div>
          <div>
            {FAQS.map(([question, answer]) => (
              <article key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
