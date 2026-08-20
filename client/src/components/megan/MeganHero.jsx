import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";

import { PORTRAIT_IMAGE } from "./meganContent.js";

export default function MeganHero() {
  return (
    <section className="mg-hero">
      <div className="mg-hero__glow" aria-hidden="true" />
      <div className="mg-inner mg-hero__grid">
        <div className="mg-hero__copy">
          <p className="mg-hero__chip">
            <Sparkles size={18} aria-hidden="true" />
            英语教育 × AI × 独立开发
          </p>
          <p className="mg-hero__eyebrow">Megan Peng</p>
          <h1 className="mg-hero__name">彭静怡</h1>
          <p className="mg-hero__role">教育硕士 · 英语教师 · 筑巢英语创始人</p>
          <p className="mg-hero__quote">用 AI，把教育中的想法真正做出来。</p>
          <p className="mg-hero__lede">
            我关注英语学习中的真实问题，也关注一个教师如何借助 AI，把课程、产品和学习体验一点点落地。
          </p>
          <div className="mg-hero__actions">
            <a href="#megan-projects" className="mg-btn mg-btn--primary">
              了解我的项目 <ArrowRight size={18} aria-hidden="true" />
            </a>
            <a href="#megan-contact" className="mg-btn mg-btn--ghost">
              联系我 <MessageCircle size={18} aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="mg-portrait">
          <img src={PORTRAIT_IMAGE} alt="彭静怡 Megan 个人照片" className="mg-portrait__img" />
          <p className="mg-portrait__tag">Megan Peng · Nest English</p>
        </div>
      </div>
    </section>
  );
}
