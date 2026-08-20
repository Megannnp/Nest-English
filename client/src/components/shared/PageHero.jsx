export default function PageHero({ eyebrow, title, titleStyle, description, children }) {
  return (
    <section className="page-hero studio-reveal">
      {eyebrow && <p className="page-hero__kicker">{eyebrow}</p>}
      <h1 className="page-hero__title" style={titleStyle}>{title}</h1>
      {description && <p className="page-hero__sub">{description}</p>}
      {children}
    </section>
  );
}
