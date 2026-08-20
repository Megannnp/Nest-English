import { ArrowRight, BookOpenText, Feather, MessageCircle, PenTool, Route } from "lucide-react";

import useScrollReveal from "../../hooks/useScrollReveal.js";
import "./foundation.css";

const COURSE_PATH = [
  {
    title: "语音",
    subtitle: "7 天语音训练营",
    text: "先建立发音意识、音素辨认和朗读节奏，让学习者听得见、读得准、敢开口。",
    page: "phonetics-overview",
    cta: "进入语音模块",
  },
  {
    title: "语法",
    subtitle: "下一步课程",
    text: "把句子主干、从句关系和修饰结构讲清楚，为阅读长难句和写作表达打底。",
    page: "grammar-analyzer",
    cta: "进入语法模块",
  },
  {
    title: "阅读",
    subtitle: "从句子到篇章",
    text: "从单句理解进入段落结构、信息定位和篇章逻辑，训练真正可迁移的阅读能力。",
    page: "reading-analyzer",
    cta: "进入阅读模块",
  },
  {
    title: "写作",
    subtitle: "从输入到输出",
    text: "把语音、语法和阅读积累转化成句子、段落和整篇表达，形成反馈闭环。",
    page: "writing-refine-sentence",
    cta: "进入写作模块",
  },
];

export default function FoundationShowcasePage({ onNavigate }) {
  const pageRef = useScrollReveal({
    targetSelector: ".foundation-reveal",
    revealedClass: "foundation-revealed",
  });

  return (
    <div className="foundation-page" ref={pageRef}>
      <main>
        <section className="foundation-hero foundation-reveal">
          <div>
            <p className="foundation-kicker">Course Design</p>
            <h1>语言基础，不是模块堆叠，而是一条课程路径。</h1>
            <p className="foundation-hero__text">
              我把英语学习拆成语音、语法、阅读、写作四个递进阶段，让每一步都有清晰目标、练习方式和反馈依据。
            </p>
            <div className="foundation-actions">
              <button type="button" className="foundation-btn foundation-btn--primary" onClick={() => onNavigate?.("phonetics-overview")}>
                查看语音模块 <ArrowRight size={18} aria-hidden="true" />
              </button>
              <button type="button" className="foundation-btn foundation-btn--ghost" onClick={() => onNavigate?.("megan")}>
                联系 Megan <MessageCircle size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <aside className="foundation-hero__panel" aria-label="课程设计方法">
            <Route size={28} aria-hidden="true" />
            <h2>设计主线</h2>
            <p>语音 → 语法 → 阅读 → 写作</p>
          </aside>
        </section>

        <section className="foundation-section foundation-reveal foundation-reveal--delay-1">
          <div className="foundation-section__head">
            <p className="foundation-kicker">Learning Path</p>
            <h2>从发音入口，到完整表达</h2>
          </div>
          <div className="foundation-path">
            {COURSE_PATH.map((item, index) => (
              <article className="foundation-step" key={item.title}>
                <span className="foundation-step__number">{String(index + 1).padStart(2, "0")}</span>
                <p className="foundation-step__subtitle">{item.subtitle}</p>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <button type="button" onClick={() => onNavigate?.(item.page)}>
                  {item.cta} <ArrowRight size={16} aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="foundation-section foundation-case foundation-reveal foundation-reveal--delay-2">
          <div className="foundation-case__copy">
            <p className="foundation-kicker">Current Case</p>
            <h2>7 天语音训练营</h2>
            <p>
              这门课放在第一步，不是为了单独讲发音规则，而是先帮学习者建立声音意识：能听出差异、能读出结构、能把朗读变成后续语法和阅读训练的入口。
            </p>
          </div>
          <div className="foundation-case__grid" aria-label="7 天语音训练营设计重点">
            <div>
              <Feather size={22} aria-hidden="true" />
              <strong>声音意识</strong>
              <span>从音素和节奏开始，先让学习者知道自己听到、读出的是什么。</span>
            </div>
            <div>
              <BookOpenText size={22} aria-hidden="true" />
              <strong>朗读任务</strong>
              <span>用短句、段落和跟读任务，把规则转成可完成的训练。</span>
            </div>
            <div>
              <PenTool size={22} aria-hidden="true" />
              <strong>后续衔接</strong>
              <span>语音课结束后进入语法课，再进入阅读和写作输出。</span>
            </div>
          </div>
        </section>

        <section className="foundation-section foundation-plan foundation-reveal foundation-reveal--delay-2">
          <p className="foundation-kicker">Roadmap</p>
          <h2>课程规划</h2>
          <ol>
            <li>第一期：7 天语音训练营</li>
            <li>下一期：语法基础课</li>
            <li>后续：阅读训练课、写作训练课</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
