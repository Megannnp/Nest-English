import AuthPrimaryButton from "./AuthPrimaryButton.jsx";
import AuthShell from "./AuthShell.jsx";
import { inp } from "../../constants/index.jsx";
import useIsMobile from "../../hooks/useIsMobile.js";

const getLabelStyle = (theme) => ({
  fontSize: 12,
  color: theme === "grammar" ? "#5c3d9e" : theme === "portal" ? "#222222" : "#7c5c2e",
  fontFamily: "sans-serif",
  display: "block",
  marginBottom: 4,
});
const getInputStyle = (theme, override = {}) => inp({
  border: `1.5px solid ${theme === "grammar" ? "#ded7f2" : theme === "portal" ? "#dddddd" : "#e8ded0"}`,
  color: theme === "grammar" ? "#2e2840" : theme === "portal" ? "#111111" : "#2a1f14",
  background: theme === "grammar" ? "rgba(255, 255, 255, 0.50)" : theme === "portal" ? "#ffffff" : "rgba(250, 248, 245, 0.82)",
  boxShadow: theme === "grammar" ? "inset 0 1px 0 rgba(255,255,255,0.72)" : undefined,
  backdropFilter: theme === "grammar" ? "blur(10px)" : undefined,
  WebkitBackdropFilter: theme === "grammar" ? "blur(10px)" : undefined,
  ...override,
});

const mutedHintStyle = {
  fontSize: 12,
  color: "#888",
  lineHeight: 1.7,
  background: "#f5f5f5",
  border: "1px solid #e8e8e8",
  borderRadius: 10,
  padding: "8px 10px",
};

const RECOVERY_OPTIONS = [
  { value: "email", label: "邮箱找回" },
  { value: "phone", label: "手机找回" },
];

function RecoveryTabs({ forgotType, setForgotType, theme }) {
  const grammar = theme === "grammar";
  const portal = theme === "portal";
  return (
    <div style={{ display: "flex", gap: 4, background: grammar ? "#f4f0ff" : portal ? "#f4f4f4" : "#f5f1eb", borderRadius: 10, padding: 4, marginBottom: 14 }}>
      {RECOVERY_OPTIONS.map((item) => {
        const active = forgotType === item.value;
        return (
          <button
            key={item.value}
            onClick={() => { setForgotType(item.value); }}
            style={{
              flex: 1,
              padding: "9px",
              border: "none",
              borderRadius: 8,
              background: active ? "#fff" : "transparent",
              color: active ? (grammar ? "#2e2840" : "#111111") : (grammar ? "#7a6e90" : portal ? "#666666" : "#8a7d6e"),
              fontWeight: active ? 700 : 400,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "sans-serif",
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function Message({ message, successMsg, serviceError, serviceUnavailable }) {
  if (successMsg) {
    return <div style={{ fontSize: 12, color: "#1a7a4a", background: "#edfaf3", border: "1px solid #a8e8c8", borderRadius: 8, padding: "7px 10px" }}>{successMsg}</div>;
  }
  if (message) {
    return <div style={{ fontSize: 12, color: "#b02020", background: "#fdf0ef", border: "1px solid #f0b0a8", borderRadius: 8, padding: "7px 10px" }}>{message}</div>;
  }
  if (serviceUnavailable) {
    return <div style={{ fontSize: 12, color: "#555", background: "#f5f5f5", border: "1px solid #e0e0e0", borderRadius: 8, padding: "10px 14px", margin: "4px 0 12px" }}>{serviceError}</div>;
  }
  return null;
}

function AccountField({ codeSent, forgotAccount, forgotType, setForgotAccount, theme }) {
  const inputClassName = `auth-input auth-input--${theme}`;
  return (
    <div>
      <label style={getLabelStyle(theme)}>{forgotType === "email" ? "邮箱" : "手机号"}</label>
      <input
        className={inputClassName}
        aria-label={forgotType === "email" ? "邮箱" : "手机号"}
        type={forgotType === "email" ? "email" : "tel"}
        value={forgotAccount}
        onChange={(e) => setForgotAccount(e.target.value)}
        placeholder={forgotType === "email" ? "your@email.com" : "11 位阿拉伯数字"}
        disabled={codeSent}
        style={getInputStyle(theme, { opacity: codeSent ? 0.7 : 1 })}
      />
    </div>
  );
}

function CodeField({ code, countdown, devCode, isMobile, loading, onSendCode, serviceUnavailable, setCode, theme }) {
  const grammar = theme === "grammar";
  const portal = theme === "portal";
  const inputClassName = `auth-input auth-input--${theme}`;
  return (
    <div>
      <label style={getLabelStyle(theme)}>验证码</label>
      <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
        <input className={inputClassName} aria-label="验证码" type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6位数字" style={getInputStyle(theme, { flex: 1, textAlign: "center", letterSpacing: "6px" })} />
        <button
          onClick={onSendCode}
          disabled={countdown > 0 || loading || serviceUnavailable}
          style={{
            padding: isMobile ? "11px 14px" : "0 14px",
            borderRadius: 22,
            border: `1px solid ${grammar ? "#ded7f2" : portal ? "#dddddd" : "#d8cfc4"}`,
            background: "#fff",
            color: countdown > 0 ? "#a09080" : (grammar ? "#5c3d9e" : portal ? "#111111" : "#7c5c2e"),
            cursor: countdown > 0 ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {countdown > 0 ? `${countdown}s` : "重发"}
        </button>
      </div>
      {devCode ? <div style={{ marginTop: 8, ...mutedHintStyle }}>开发环境验证码：{devCode}</div> : null}
    </div>
  );
}

function ResetFields({ code, countdown, devCode, forgotConfirmPw, isMobile, loading, newPw, onResetPassword, onSendCode, serviceUnavailable, setCode, setForgotConfirmPw, setNewPw, theme }) {
  const inputClassName = `auth-input auth-input--${theme}`;
  return (
    <>
      <CodeField code={code} countdown={countdown} devCode={devCode} isMobile={isMobile} loading={loading} onSendCode={onSendCode} serviceUnavailable={serviceUnavailable} setCode={setCode} theme={theme} />
      <div>
        <label style={getLabelStyle(theme)}>新密码</label>
        <input className={inputClassName} aria-label="新密码" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="至少 8 位" style={getInputStyle(theme)} />
      </div>
      <div>
        <label style={getLabelStyle(theme)}>确认密码</label>
        <input className={inputClassName} aria-label="确认密码" type="password" value={forgotConfirmPw} onChange={(e) => setForgotConfirmPw(e.target.value)} placeholder="再次输入新密码" style={getInputStyle(theme)} />
      </div>
      <AuthPrimaryButton disabled={loading || serviceUnavailable} onClick={onResetPassword} theme={theme}>
        {loading ? "重置中…" : "确认重置 →"}
      </AuthPrimaryButton>
    </>
  );
}

export default function AuthForgotForm({
  embedded,
  forgotType,
  setForgotType,
  forgotAccount,
  setForgotAccount,
  code,
  setCode,
  newPw,
  setNewPw,
  forgotConfirmPw,
  setForgotConfirmPw,
  countdown,
  codeSent,
  devCode,
  err,
  successMsg,
  loading,
  serviceUnavailable,
  serviceError,
  onSendCode,
  onResetPassword,
  onBackToLogin,
  theme = "writing",
}) {
  const isMobile = useIsMobile();

  return (
    <AuthShell embedded={embedded} subtitle="Reset Access" theme={theme}>
        <RecoveryTabs forgotType={forgotType} setForgotType={setForgotType} theme={theme} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <AccountField codeSent={codeSent} forgotAccount={forgotAccount} forgotType={forgotType} setForgotAccount={setForgotAccount} theme={theme} />

          {!codeSent ? (
            <AuthPrimaryButton disabled={loading || serviceUnavailable || !forgotAccount.trim()} onClick={onSendCode} theme={theme}>
              {loading ? "发送中…" : "获取验证码"}
            </AuthPrimaryButton>
          ) : (
            <ResetFields code={code} countdown={countdown} devCode={devCode} forgotConfirmPw={forgotConfirmPw} isMobile={isMobile} loading={loading} newPw={newPw} onResetPassword={onResetPassword} onSendCode={onSendCode} serviceUnavailable={serviceUnavailable} setCode={setCode} setForgotConfirmPw={setForgotConfirmPw} setNewPw={setNewPw} theme={theme} />
          )}

          <Message message={err} successMsg={successMsg} serviceError={serviceError} serviceUnavailable={serviceUnavailable} />

          <button onClick={onBackToLogin} style={{ padding: "6px", border: "none", background: "transparent", color: "#888", cursor: "pointer", fontSize: 12 }}>
            ← 返回登录
          </button>
        </div>
    </AuthShell>
  );
}
