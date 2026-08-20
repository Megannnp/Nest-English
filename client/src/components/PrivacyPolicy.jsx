import { privacyContent } from "../content/legalContent.js";
import useIsMobile from "../hooks/useIsMobile.js";

const sectionTitle = {
  fontSize: 16,
  fontWeight: 700,
  margin: "22px 0 10px",
  color: "#111",
};

const textStyle = {
  margin: "0 0 10px",
  color: "#444",
  lineHeight: 1.9,
};

function LegalSection({ section }) {
  return (
    <section>
      <h2 style={sectionTitle}>{section.title}</h2>
      {section.lead ? <p style={textStyle}>{section.lead}</p> : null}
      {section.paragraphs?.map((paragraph) => (
        <p key={paragraph} style={textStyle}>{paragraph}</p>
      ))}
      {section.items ? (
        <ul style={{ ...textStyle, paddingLeft: 20 }}>
          {section.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : null}
    </section>
  );
}

export default function PrivacyPolicy() {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: isMobile ? "20px 6px 30px" : "28px 20px 44px",
        color: "#111",
        fontSize: isMobile ? 13 : 14,
        lineHeight: 1.8,
      }}
    >
      <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, marginBottom: 10 }}>隐私政策</h1>
      <p style={{ ...textStyle, color: "#888" }}>最近更新：{privacyContent.updatedAt}</p>
      <p style={{ ...textStyle, color: "#333", fontWeight: 600 }}>{privacyContent.summary}</p>
      <p style={textStyle}>{privacyContent.intro}</p>
      {privacyContent.sections.map((section) => <LegalSection key={section.id} section={section} />)}
    </div>
  );
}
