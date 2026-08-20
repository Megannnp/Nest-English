import { TEACHER_MODULES } from "./teacherModuleConfig.js";
import { PageHeader } from "../components/shared/UI.jsx";
import { THEME } from "../styles/theme.js";

function ModuleCard({ mod, isMobile, onNavigate }) {
  return (
    <button
      type="button"
      onClick={() => onNavigate?.(mod.workbenchPage)}
      style={{
        border: "1px solid #e8e8e8",
        borderRadius: 20,
        background: "#fafafa",
        padding: isMobile ? "24px" : "32px 36px",
        minHeight: isMobile ? 160 : 200,
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
      <strong style={{ display: "block", color: THEME.color.text, fontSize: isMobile ? 16 : 18 }}>
        {mod.label}
      </strong>
      <span style={{ display: "block", marginTop: 10, color: THEME.color.textMuted, fontSize: isMobile ? 13 : 14, lineHeight: 1.45 }}>
        {mod.desc}
      </span>
    </button>
  );
}


function AssignmentFlow() {
  return (
    <aside
      style={{
        background: "#fff",
        border: "1px solid #e8dfd4",
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "15px 18px",
          borderBottom: "1px solid #e8dfd4",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h2 style={{ margin: 0, color: THEME.color.text, fontSize: 16 }}>布置流程</h2>
        <span style={{ color: THEME.color.textMuted, fontSize: 12, fontWeight: 800 }}>模块内完成</span>
      </div>
      <div style={{ padding: "16px 18px 18px", display: "grid", gap: 10 }}>
        {[
          ["1. 选择任务内容", "题库、自由输入、上传材料或选择训练模板。"],
          ["2. 选择班级和学生", "支持整班、分层小组或单独学生。"],
          ["3. 核对学生任务卡片", "确认学生看到的标题、要求、截止时间和入口。"],
        ].map(([title, body]) => (
          <div key={title} style={{ border: "1px solid #e8dfd4", borderRadius: 9, padding: 12 }}>
            <strong style={{ color: THEME.color.text, fontSize: 14 }}>{title}</strong>
            <div style={{ color: THEME.color.textMuted, fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>{body}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default function TeacherWorkbenchPage({ isMobile = false, onNavigate }) {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "24px 16px 48px" : "40px 24px 64px" }}>
      <PageHeader
        titleZh="工作台"
        subtitle="选择模块进入后，再选择任务内容、班级、截止时间并发布。"
        isMobile={isMobile}
      />

      <section>
        <h2 style={{ margin: "0 0 6px", color: THEME.color.text, fontSize: 18 }}>
          选择模块开始布置
        </h2>
        <div style={{ fontSize: 13, color: THEME.color.textMuted, marginBottom: 16 }}>
          进入模块后选择任务内容、班级和截止时间，发布后学生可在任务页看到。
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 24,
          }}
        >
          {TEACHER_MODULES.map((mod) => (
            <ModuleCard key={mod.id} mod={mod} isMobile={isMobile} onNavigate={onNavigate} />
          ))}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <AssignmentFlow />
      </section>
    </div>
  );
}
