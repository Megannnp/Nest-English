import { BookOpenText, ExternalLink } from "lucide-react";

import { ABOUT_POINTS, PUBLIC_ACCOUNT, PUBLIC_ACCOUNT_QR_IMAGE } from "./meganContent.js";

export default function MeganAbout() {
  return (
    <section className="mg-section studio-reveal studio-reveal--delay-1">
      <div className="mg-inner">
        <h2 className="mg-section__title">关于我</h2>

        <p className="mg-about__text">
          我是一名学科教学（英语）专业的教育硕士，也是一名英语教师和 AI 独立开发者。我的兴趣一直集中在一件事上：
          如何把英语教学中的真实问题，变成真正可以使用的产品、课程和学习体验。
        </p>

        <ul className="mg-about__points" aria-label="Megan 的背景和方向">
          {ABOUT_POINTS.map((point) => (
            <li className="mg-about__point" key={point.label}>
              <strong>{point.label}</strong>
              <span>{point.text}</span>
            </li>
          ))}
        </ul>

        <a className="mg-account" href={PUBLIC_ACCOUNT.href} target="_blank" rel="noreferrer">
          <span className="mg-account__icon">
            <BookOpenText size={26} aria-hidden="true" />
          </span>
          <span className="mg-account__body">
            <span className="mg-account__kicker">微信公众号</span>
            <span className="mg-account__title">{PUBLIC_ACCOUNT.name}</span>
            <span className="mg-account__text">
              记录英语学习、教学观察、AI 教育工具实践和 Nest English 的搭建过程。
            </span>
            <span className="mg-account__more">
              点击跳转 <ExternalLink size={16} aria-hidden="true" />
            </span>
          </span>
          <span className="mg-account__qr" aria-hidden="true">
            <img src={PUBLIC_ACCOUNT_QR_IMAGE} alt="" />
          </span>
        </a>
      </div>
    </section>
  );
}
