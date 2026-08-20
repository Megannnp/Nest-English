import { PREP_EXAMS } from "../../app/prepExamConfig.js";

export function Notice({ children, tone = "warning" }) {
  const style = tone === "warning"
    ? { color: "#555", background: "#f5f5f5", border: "1px solid #e0e0e0" }
    : tone === "success"
    ? { color: "#1a7a4a", background: "#edfaf3", border: "1px solid #a8e8c8" }
    : { color: "#b02020", background: "#fdf0ef", border: "1px solid #f0b0a8" };
  return <div role={tone === "error" ? "alert" : undefined} style={{ fontSize: 12, borderRadius: 10, padding: "10px 14px", margin: "4px 0 12px", lineHeight: 1.65, ...style }}>{children}</div>;
}

export function Field({ id, label, required, children, labelStyle, accentColor }) {
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label} {required ? <span style={{ color: accentColor }}>*</span> : null}</label>
      {children}
    </div>
  );
}

function RoleToggle({ role, setRole, accentColor, roleLabelColor }) {
  const roles = [
    { key: "student", label: "我是学生" },
    { key: "teacher", label: "我是教师" },
    { key: "parent", label: "我是家长" },
  ];
  return (
    <div>
      <div id="auth-role-label" style={{ fontSize: 12, color: roleLabelColor, marginBottom: 6 }}>身份</div>
      <div role="group" aria-labelledby="auth-role-label" style={{ display: "flex", gap: 8 }}>
        {roles.map((r) => (
          <button
            key={r.key}
            type="button"
            aria-pressed={role === r.key}
            onClick={() => setRole(r.key)}
            style={{
              flex: 1,
              padding: "8px 0",
              borderRadius: 8,
              border: role === r.key ? `1.5px solid ${accentColor}` : "1.5px solid #e0dada",
              background: role === r.key ? accentColor : "transparent",
              color: role === r.key ? "#fff" : "#888",
              fontSize: 13,
              fontWeight: role === r.key ? 700 : 400,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PrepExamToggle({ accentColor, prepExamId, roleLabelColor, setPrepExamId }) {
  return (
    <div>
      <div id="auth-prep-exam-label" style={{ fontSize: 12, color: roleLabelColor, marginBottom: 6 }}>备考目标</div>
      <div role="group" aria-labelledby="auth-prep-exam-label" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {PREP_EXAMS.map((exam) => (
          <button
            key={exam.id}
            type="button"
            aria-pressed={prepExamId === exam.id}
            onClick={() => setPrepExamId(exam.id)}
            style={{
              border: prepExamId === exam.id ? `1.5px solid ${accentColor}` : "1.5px solid #e0dada",
              background: prepExamId === exam.id ? accentColor : "transparent",
              color: prepExamId === exam.id ? "#fff" : "#888",
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: prepExamId === exam.id ? 700 : 500,
              minHeight: 32,
              padding: "0 10px",
              transition: "all 0.15s",
            }}
          >
            {exam.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function RegisterFields({ accentColor, inputClassName, inputStyle, labelStyle, phone, prepExamId, realName, role, roleLabelColor, setPhone, setPrepExamId, setRealName, setRole }) {
  return (
    <>
      <RoleToggle role={role} setRole={setRole} accentColor={accentColor} roleLabelColor={roleLabelColor} />
      {role === "student" ? (
        <PrepExamToggle
          accentColor={accentColor}
          prepExamId={prepExamId}
          roleLabelColor={roleLabelColor}
          setPrepExamId={setPrepExamId}
        />
      ) : null}
      <Field id="auth-real-name" label="姓名" required labelStyle={labelStyle} accentColor={accentColor}>
        <input aria-label="姓名" className={inputClassName} id="auth-real-name" value={realName} onChange={(e) => setRealName(e.target.value)} placeholder={role === "teacher" ? "如：王老师" : role === "parent" ? "如：张家长" : "如：张小明"} style={inputStyle()} />
      </Field>
      <Field id="auth-phone" label="手机号（选填）" labelStyle={labelStyle} accentColor={accentColor}>
        <input aria-label="手机号（选填）" className={inputClassName} id="auth-phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="用于账号找回" style={inputStyle()} maxLength={11} />
      </Field>
    </>
  );
}

export function ConfirmPasswordField({ accentColor, inputClassName, inputStyle, labelStyle, setConfirmPw, confirmPw }) {
  return (
    <Field id="auth-confirm-password" label="确认密码" required labelStyle={labelStyle} accentColor={accentColor}>
      <input
        className={inputClassName}
        id="auth-confirm-password"
        aria-label="确认密码"
        type="password"
        value={confirmPw}
        onChange={(e) => setConfirmPw(e.target.value)}
        placeholder="再次输入密码"
        style={inputStyle()}
      />
    </Field>
  );
}
