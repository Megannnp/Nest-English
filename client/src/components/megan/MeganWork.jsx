import { ExternalLink } from "lucide-react";

import { PATH_ITEMS, PROJECTS, WORKS } from "./meganContent.js";

export default function MeganWork() {
  return (
    <>
      <section id="megan-projects" className="mg-section studio-reveal studio-reveal--delay-1">
        <div className="mg-inner">
          <h2 className="mg-section__title">我正在做什么</h2>
          <div className="mg-cards">
            {PROJECTS.map((project) => (
              <a key={project.title} href={project.href} className="mg-card">
                <div>
                  <div className="mg-card__type">{project.type}</div>
                  <h3 className="mg-card__title">{project.title}</h3>
                  <p className="mg-card__desc">{project.desc}</p>
                </div>
                <span className="mg-card__more">
                  查看项目 <ExternalLink size={16} aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mg-section studio-reveal studio-reveal--delay-1">
        <div className="mg-inner">
          <h2 className="mg-section__title">我的实践路径</h2>
          <ol className="mg-path">
            {PATH_ITEMS.map((item) => (
              <li key={item} className="mg-path__item">
                {item}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mg-section studio-reveal studio-reveal--delay-2">
        <div className="mg-inner">
          <h2 className="mg-section__title">我做过的东西</h2>
          <div className="mg-works">
            {WORKS.map((work) => (
              <article key={work.title} className="mg-work">
                <img src={work.image} alt={work.title} className="mg-work__img" loading="lazy" />
                <div className="mg-work__body">
                  <h3 className="mg-work__title">{work.title}</h3>
                  <p className="mg-work__text">{work.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
