import { TEACHER_MODULES, TEACHER_PREP_TABS } from "./teacherModuleConfig.js";

function _PrepSubnav({ onNavigate }) {
  return (
    <nav
      aria-label="备课模块导航"
      style={{
        height: 42,
        display: "flex",
        alignItems: "center",
        gap: 14,
        overflowX: "auto",
        marginBottom: 22,
      }}
    >
      <div
        style={{
          flex: "0 0 auto",
          color: "#6f431c",
          fontSize: 13,
          fontWeight: 800,
          paddingRight: 14,
          borderRight: "1px solid rgba(111, 67, 28, 0.18)",
        }}
      >
        备课模块
      </div>
      {TEACHER_PREP_TABS.map((tab, index) => (
        <button
          key={tab.page}
          type="button"
          onClick={() => onNavigate?.(tab.page)}
          style={{
            flex: "0 0 auto",
            border: 0,
            background: index === 0 ? "#9a6330" : "transparent",
            color: index === 0 ? "#fff" : "#a47447",
            fontSize: 13,
            fontWeight: 700,
            padding: "5px 13px",
            borderRadius: 999,
            cursor: "pointer",
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

export default function TeacherPrepPage({ isMobile = false, onNavigate }) {
  return (
    <div style={{ background: "#fff", minHeight: "calc(100vh - 54px)" }}>
      <main
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: isMobile ? "24px 14px 92px" : "34px 20px 64px",
        }}
      >
        <section style={{ marginBottom: 26 }}>
          <div style={{ fontSize: isMobile ? 24 : 30, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.5px", marginBottom: 6 }}>
            备课
          </div>
          <div style={{ fontSize: 14, color: "#888" }}>
            这里保留学生端模块样式，老师点进去看到的就是学生同款练习入口。
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 24,
          }}
        >
          {TEACHER_MODULES.map((mod) => (
            <button
              key={mod.id}
              type="button"
              onClick={() => onNavigate?.(mod.prepPage)}
              style={{
                border: "1px solid #e8dfd4",
                borderRadius: 20,
                background: "#fff",
                padding: "30px 34px",
                minHeight: 180,
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span
                style={{
                  display: "block",
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  marginBottom: 22,
                  background: mod.soft,
                }}
              />
              <strong style={{ display: "block", color: "#1f1b16", fontSize: isMobile ? 16 : 18 }}>{mod.label}</strong>
              <span style={{ display: "block", marginTop: 10, color: "#a8a19a", fontSize: isMobile ? 13 : 14, lineHeight: 1.45 }}>
                {mod.desc}
              </span>
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
