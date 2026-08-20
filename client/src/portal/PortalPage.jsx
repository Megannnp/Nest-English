import { useEffect, useState } from "react";

import PlanPromoModal from "./PlanPromoModal.jsx";
import SignupCollage from "./SignupCollage.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./portal.css";

const PLAN_PROMO_SEEN_KEY = "nest_plan_promo_seen";

// ── Mock UI Cards (code-generated, no images needed) ──────────────────────

function WritingFeedbackCard({ size = "md" }) {
  return (
    <div className={`portal-mock-card portal-mock-card--writing portal-mock-card--${size}`}>
      <div className="pmw-header">
        <div className="pmw-title-row">
          <div className="pmw-dot pmw-dot--red" />
          <div className="pmw-dot pmw-dot--yellow" />
          <div className="pmw-dot pmw-dot--green" />
          <span className="pmw-label">AI 写作批改</span>
        </div>
      </div>
      <div className="pmw-body">
        <div className="pmw-score-row">
          <div className="pmw-score">
            <div className="pmw-score-num">14.5</div>
            <div className="pmw-score-sub">/ 20 分</div>
          </div>
          <div className="pmw-score-bars">
            <div className="pmw-bar-row"><span>内容</span><div className="pmw-bar"><div className="pmw-bar-fill" style={{ width: "78%", background: "rgba(0,0,0,0.65)" }} /></div></div>
            <div className="pmw-bar-row"><span>语言</span><div className="pmw-bar"><div className="pmw-bar-fill" style={{ width: "65%", background: "rgba(0,0,0,0.45)" }} /></div></div>
            <div className="pmw-bar-row"><span>结构</span><div className="pmw-bar"><div className="pmw-bar-fill" style={{ width: "82%", background: "rgba(0,0,0,0.65)" }} /></div></div>
          </div>
        </div>
        <div className="pmw-text-block">
          <div className="pmw-text-line pmw-text-line--full" />
          <div className="pmw-text-line pmw-text-line--full" />
          <div className="pmw-text-line pmw-text-line--partial" style={{ width: "70%" }} />
          <div className="pmw-inline-comment">
            <div className="pmw-comment-tag">语言</div>
            <div className="pmw-comment-text">建议使用更高级的词汇替换 "good"</div>
          </div>
          <div className="pmw-text-line pmw-text-line--full" />
          <div className="pmw-text-line pmw-text-line--partial" style={{ width: "55%" }} />
        </div>
      </div>
    </div>
  );
}

function GrammarAnalyzerCard({ size = "md" }) {
  return (
    <div className={`portal-mock-card portal-mock-card--grammar portal-mock-card--${size}`}>
      <div className="pmg-header">
        <span className="pmg-label">长难句分析</span>
        <div className="pmg-badge">AI</div>
      </div>
      <div className="pmg-sentence">
        <span className="pmg-word pmg-word--subject">The scientists</span>
        <span className="pmg-word"> </span>
        <span className="pmg-word pmg-word--verb">who discovered</span>
        <span className="pmg-word"> </span>
        <span className="pmg-word pmg-word--object">the new element</span>
        <span className="pmg-word"> </span>
        <span className="pmg-word pmg-word--verb2">were awarded</span>
        <span className="pmg-word"> </span>
        <span className="pmg-word pmg-word--complement">the Nobel Prize</span>
        <span className="pmg-word">.</span>
      </div>
      <div className="pmg-tree">
        <div className="pmg-tree-node pmg-tree-node--root">句子</div>
        <div className="pmg-tree-row">
          <div className="pmg-tree-branch">
            <div className="pmg-tree-node pmg-tree-node--sub">主语</div>
            <div className="pmg-tree-node pmg-tree-node--leaf">The scientists</div>
          </div>
          <div className="pmg-tree-branch">
            <div className="pmg-tree-node pmg-tree-node--sub">谓语</div>
            <div className="pmg-tree-node pmg-tree-node--leaf">were awarded</div>
          </div>
          <div className="pmg-tree-branch">
            <div className="pmg-tree-node pmg-tree-node--sub">宾语</div>
            <div className="pmg-tree-node pmg-tree-node--leaf">the Nobel Prize</div>
          </div>
        </div>
      </div>
      <div className="pmg-tags">
        <span className="pmg-tag">定语从句</span>
        <span className="pmg-tag">被动语态</span>
        <span className="pmg-tag">复合句</span>
      </div>
    </div>
  );
}

function WritingScoreCard({ size = "sm" }) {
  return (
    <div className={`portal-mock-card portal-mock-card--score portal-mock-card--${size}`}>
      <div className="pms-label">本周进步</div>
      <div className="pms-num">+2.5<span className="pms-unit">分</span></div>
      <div className="pms-sub">相比上周写作均分</div>
      <div className="pms-sparkline">
        {[40, 55, 48, 62, 58, 72, 78].map((h, i) => (
          <div key={i} className="pms-bar" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

function GrammarCourseCard({ size = "md" }) {
  return (
    <div className={`portal-mock-card portal-mock-card--course portal-mock-card--${size}`}>
      <div className="pmc-thumb">
        <div className="pmc-play-btn">▶</div>
        <div className="pmc-duration">12:34</div>
      </div>
      <div className="pmc-body">
        <div className="pmc-chapter">Chapter 3 · 非谓语动词</div>
        <div className="pmc-title">不定式的五大用法精讲</div>
        <div className="pmc-progress-row">
          <div className="pmc-progress-bar"><div className="pmc-progress-fill" style={{ width: "40%" }} /></div>
          <span className="pmc-progress-label">40%</span>
        </div>
      </div>
    </div>
  );
}

function GrammarFrameworkCard({ size = "md" }) {
  return (
    <div className={`portal-mock-card portal-mock-card--framework portal-mock-card--${size}`}>
      <div className="pmf-header">
        <span className="pmf-label">语法框架</span>
        <div className="pmf-badge">AI</div>
      </div>
      <div className="pmf-mindmap">
        <div className="pmf-center">语法<br />体系</div>
        <div className="pmf-branches">
          <div className="pmf-branch">
            <div className="pmf-branch-line" />
            <span>句子成分</span>
          </div>
          <div className="pmf-branch">
            <div className="pmf-branch-line" />
            <span>从句</span>
          </div>
          <div className="pmf-branch">
            <div className="pmf-branch-line" />
            <span>时态语态</span>
          </div>
        </div>
      </div>
      <div className="pmf-tags">
        <span className="pmf-tag">非谓语动词</span>
        <span className="pmf-tag">定语从句</span>
        <span className="pmf-tag">虚拟语气</span>
        <span className="pmf-tag">倒装句</span>
      </div>
    </div>
  );
}

function ReadingCard({ size = "md" }) {
  return (
    <div className={`portal-mock-card portal-mock-card--reading portal-mock-card--${size}`}>
      <div className="pmr-header">
        <span className="pmr-label">阅读思维导图</span>
        <div className="pmr-badge">AI</div>
      </div>
      <div className="pmr-passage">
        <span className="pmr-word">Scientists at </span>
        <span className="pmr-word pmr-word--hi">Cambridge University</span>
        <span className="pmr-word"> have developed a new method of </span>
        <span className="pmr-word pmr-word--hi">recycling plastic</span>
        <span className="pmr-word"> that could reduce ocean pollution…</span>
      </div>
      <div className="pmr-mindmap">
        <div className="pmr-center">主旨</div>
        <div className="pmr-branches">
          <div className="pmr-branch">
            <div className="pmr-branch-line" />
            <span>研究背景</span>
          </div>
          <div className="pmr-branch">
            <div className="pmr-branch-line" />
            <span>核心方法</span>
          </div>
          <div className="pmr-branch">
            <div className="pmr-branch-line" />
            <span>环保影响</span>
          </div>
        </div>
      </div>
      <div className="pmr-tags">
        <span className="pmr-tag">主旨题</span>
        <span className="pmr-tag">细节题</span>
        <span className="pmr-tag">推断题</span>
      </div>
    </div>
  );
}

// ── Collage Layouts ────────────────────────────────────────────────────────

function HeroCollage() {
  return (
    <div className="portal-hero-collage">
      <div className="portal-hero-collage__main">
        <WritingFeedbackCard size="lg" />
      </div>
      <div className="portal-hero-collage__side">
        <GrammarAnalyzerCard size="sm" />
        <WritingScoreCard size="sm" />
      </div>
      <div className="portal-hero-collage__float">
        <GrammarCourseCard size="sm" />
      </div>
    </div>
  );
}

function VocabCard({ size = "md" }) {
  return (
    <div className={`portal-mock-card portal-mock-card--vocab portal-mock-card--${size}`}>
      <div className="pmv-header">
        <span className="pmv-label">词汇闪卡</span>
        <div className="pmv-badge">AI</div>
      </div>
      <div className="pmv-body">
        <div className="pmv-card">
          <div className="pmv-word">exacerbate</div>
          <div className="pmv-phonetic">/ɪɡˈzæsəbeɪt/</div>
          <div className="pmv-zh">v. 加剧；使恶化</div>
          <div className="pmv-example">The drought will exacerbate the food shortage.</div>
        </div>
        <div className="pmv-actions">
          <div className="pmv-btn pmv-btn--miss">再看看 ↩</div>
          <div className="pmv-btn pmv-btn--got">认识了 ✓</div>
        </div>
      </div>
    </div>
  );
}

// ── Section Components ─────────────────────────────────────────────────────

function FeatureSection({ reverse, card, title, desc, btnLabel, btnStyle, onNavigate, target }) {
  return (
    <section className={`portal-feature ${reverse ? "portal-feature--reverse" : ""}`}>
      <div className="portal-feature__visual">{card}</div>
      <div className="portal-feature__copy">
        <h2 className="portal-feature__title">{title}</h2>
        <p className="portal-feature__desc">{desc}</p>
        <button
          type="button"
          className="portal-feature__btn"
          style={btnStyle}
          onClick={() => onNavigate(target)}
        >
          {btnLabel}
        </button>
      </div>
    </section>
  );
}

// ── Sign-up Form ───────────────────────────────────────────────────────────

function SignupForm({ onNavigate }) {
  return (
    <div className="portal-signup-form">
      <h3 className="portal-signup-form__title">欢迎来到 nest</h3>
      <p className="portal-signup-form__sub">开始你的 AI 英语学习之旅</p>
      <button
        type="button"
        className="portal-signup-form__primary"
        onClick={() => onNavigate("auth", "register")}
      >
        免费注册
      </button>
      <div className="portal-signup-form__divider"><span>或</span></div>
      <button
        type="button"
        className="portal-signup-form__secondary"
        onClick={() => onNavigate("auth", "login")}
      >
        已有账户？登录
      </button>
      <p className="portal-signup-form__legal">
        继续即表示你同意 nest 的
        <button type="button" onClick={() => onNavigate("agreement")}>服务条款</button>
        并已阅读
        <button type="button" onClick={() => onNavigate("privacy")}>隐私政策</button>。
      </p>
    </div>
  );
}

// ── Main Portal Page ───────────────────────────────────────────────────────

function dispatchPortalNavigation({ target, authMode, onNavigate, onLogin, onRegister }) {
  if (target !== "auth") {
    onNavigate?.(target);
    return;
  }
  if (authMode === "register") onRegister?.();
  else onLogin?.();
}


export default function PortalPage({ onNavigate, onLogin, onRegister, user = null, hideSignupFooter = false, onAccountClick: _onAccountClick, mode = "guest" }) {
  // mode="member": user is logged in — hide signup CTAs and registration prompts.
  // mode="guest":  unauthenticated landing page — show full acquisition flow.
  // hideSignupFooter kept for call-site compat; treated as mode="member" when true.
  const isMemberMode = mode === "member" || hideSignupFooter;
  const pageRef = useScrollReveal({
    targetSelector: ".portal-reveal",
    revealedClass: "portal-revealed",
  });

  const navigate = (target, authMode) => {
    dispatchPortalNavigation({ target, authMode, onNavigate, onLogin, onRegister });
  };

  // 首页进入后弹出学习计划推广（仅访客，单次会话只弹一次）。
  const [showPlanPromo, setShowPlanPromo] = useState(false);
  useEffect(() => {
    if (isMemberMode) return undefined;
    try {
      if (sessionStorage.getItem(PLAN_PROMO_SEEN_KEY)) return undefined;
    } catch {
      // sessionStorage 不可用时（隐私模式等）仍照常展示一次。
    }
    const timer = setTimeout(() => setShowPlanPromo(true), 600);
    return () => clearTimeout(timer);
  }, [isMemberMode]);

  const dismissPlanPromo = () => {
    setShowPlanPromo(false);
    try {
      sessionStorage.setItem(PLAN_PROMO_SEEN_KEY, "1");
    } catch {
      // 忽略写入失败，不影响关闭行为。
    }
  };

  const viewPlanDetails = () => {
    dismissPlanPromo();
    navigate("plan");
  };

  return (
    <div className="portal-page" ref={pageRef}>
      {showPlanPromo ? (
        <PlanPromoModal onClose={dismissPlanPromo} onViewDetails={viewPlanDetails} />
      ) : null}

      {/* ── Hero ── */}
      <section className="portal-hero">
        <div className="portal-hero__copy portal-reveal">
          <p className="portal-hero__kicker" aria-label="学生高效练，教师精准教，家长看成长">
            <span>学生高效练</span>
            <span>教师精准教</span>
            <span>家长看成长</span>
          </p>
          <h1 className="portal-hero__title">
            <span>学生做一次练习，</span>
            <span>老师和家长都看得见进步。</span>
          </h1>
          <p className="portal-hero__sub">注册后直接开始写作、阅读或听读练习；教师可创建班级、布置任务并导出学情材料，家长可绑定孩子查看学习记录。</p>
          <div className="portal-hero__actions">
            <button
              type="button"
              className="portal-hero__btn portal-hero__btn--primary"
              onClick={() => (user ? navigate("writing") : navigate("auth", "register"))}
            >
              {user ? "开始写作批改" : "免费注册"}
            </button>
            {!user ? (
              <button
                type="button"
                className="portal-hero__btn portal-hero__btn--secondary"
                onClick={() => navigate("auth", "login")}
              >
                已有账户
              </button>
            ) : null}
          </div>
        </div>
        <div className="portal-hero__visual portal-reveal portal-reveal--delay-1">
          <HeroCollage />
        </div>
      </section>

      {/* ── Transition ── */}
      <section className="portal-transition portal-reveal">
        <h2 className="portal-transition__title">每一次练习，<br />都留下看得见的痕迹</h2>
        <p className="portal-transition__sub">写作 · 阅读 · 听读 · 语音 · 词汇 · 语法</p>
      </section>

      {/* 学习营地模块暂时隐藏
      <FeatureSection
        reverse
        card={<GrammarCourseCard size="lg" />}
        title="学习营地 Nest Camp"
        desc="课程学习与交付中心，集中承载报名、直播、回放、资料、作业、AI 练习和学习记录。进入后先看今天学什么，再继续自己的课程。"
        btnLabel="进入学习营地 →"
        btnStyle={{ background: "#1a1614", color: "#faf8f5" }}
        onNavigate={navigate}
        target="camp"
      />
      */}

      {/* ── Feature 1: Writing ── */}
      <FeatureSection
        card={<WritingFeedbackCard size="lg" />}
        title="AI 写作批改"
        desc="输入题目与作文，立即获得结构、语言、内容三个维度的精准反馈，清楚知道每一分的来路和去处。"
        btnLabel="立即试用批改 →"
        btnStyle={{ background: "#1a1614", color: "#faf8f5" }}
        onNavigate={navigate}
        target="writing"
      />

      {/* ── Feature 2: Analyzer ── */}
      <FeatureSection
        reverse
        card={<GrammarAnalyzerCard size="lg" />}
        title="AI 长难句分析"
        desc="输入任意英语长难句，AI 自动生成句子成分树状图，主谓宾定状补一目了然，从此不再读不懂复杂句型。"
        btnLabel="试试句子分析 →"
        btnStyle={{ background: "#1a1614", color: "#faf8f5" }}
        onNavigate={navigate}
        target="grammar-analyzer"
      />

      {/* ── Feature 3: Courses ── */}
      <FeatureSection
        card={<GrammarFrameworkCard size="lg" />}
        title="语法框架可视化"
        desc="系统化的语法知识体系，以树状框架呈现知识点之间的脉络，展开即学，配套 AI 生成练习题，学得会也记得住。"
        btnLabel="浏览语法框架 →"
        btnStyle={{ background: "#1a1614", color: "#faf8f5" }}
        onNavigate={navigate}
        target="grammar-courses"
      />

      {/* ── Feature 4: Reading ── */}
      <FeatureSection
        reverse
        card={<ReadingCard size="lg" />}
        title="AI 阅读思维训练"
        desc="粘贴阅读原文，AI 自动生成思维导图帮你把握文章脉络，再逐题解析定位答案依据。高考真题题库在线练习，按文体和题型专项突破。"
        btnLabel="试试阅读思维 →"
        btnStyle={{ background: "#1a1614", color: "#faf8f5" }}
        onNavigate={navigate}
        target="reading"
      />

      {/* ── Feature 5: Vocab ── */}
      <FeatureSection
        card={<VocabCard size="lg" />}
        title="词汇精炼系统"
        desc="阅读词汇和写作词汇分场景学习，同义替换对应真实使用语境。闪卡循环未掌握词，用记忆曲线巩固每一个单词。"
        btnLabel="进入词汇学习 →"
        btnStyle={{ background: "#1a1614", color: "#faf8f5" }}
        onNavigate={navigate}
        target="vocab"
      />

      {!isMemberMode ? (
      <>
        <section className="portal-signup portal-reveal">
          <SignupCollage />
          <SignupForm onNavigate={navigate} />
        </section>

        <footer className="portal-footer">
        <div className="portal-footer__inner">
          <img src="/logo-full-white.svg" alt="nest" height="32" style={{ display: "block", marginBottom: 8 }} />
          <div className="portal-footer__cols">
            <div className="portal-footer__col">
              <div className="portal-footer__col-title">产品</div>
              <p className="portal-footer__intro">
                筑巢英语（Nest English）面向各阶段英语学习，围绕备考与语言基础，提供写作、阅读、语法、语音、词汇与听力的 AI 辅助练习。
              </p>
            </div>
            <div className="portal-footer__col">
              <div className="portal-footer__col-title">支持</div>
              <a href="mailto:contact@nestenglish.com">联系我们</a>
            </div>
            <div className="portal-footer__col">
              <div className="portal-footer__col-title">政策</div>
              <button type="button" onClick={() => navigate("agreement")}>服务条款</button>
              <button type="button" onClick={() => navigate("privacy")}>隐私政策</button>
            </div>
          </div>
        </div>
        <div className="portal-footer__copy">
          © {new Date().getFullYear()} 重庆巢外科技有限责任公司 · 筑巢英语（Nest English）
          <a
            className="portal-footer__beian"
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            渝ICP备2026005540号
          </a>
        </div>
        </footer>
      </>
      ) : null}

    </div>
  );
}
