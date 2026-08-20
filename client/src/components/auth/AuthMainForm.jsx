import { ConfirmPasswordField, Field, Notice, RegisterFields } from "./AuthMainFormFields.jsx";
import AuthPrimaryButton from "./AuthPrimaryButton.jsx";
import AuthShell from "./AuthShell.jsx";
import { inp } from "../../constants/index.jsx";

const THEME_STYLES = {
  grammar: {
    label: "#5c3d9e",
    accent: "#6c48b8",
    switch: "#5c3d9e",
    inputBorder: "#ded7f2",
    inputColor: "#2e2840",
    inputBackground: "rgba(255, 255, 255, 0.50)",
    inactive: "#9080b8",
    tabBg: "rgba(108,72,184,0.07)",
    forgot: "#6b5aa0",
  },
  reading: {
    label: "#1a7a6e",
    accent: "#1a7a6e",
    switch: "#1a7a6e",
    inputBorder: "#c4e3de",
    inputColor: "#0f2e2a",
    inputBackground: "rgba(255,255,255,0.55)",
    inactive: "#5a9a90",
    tabBg: "rgba(26,122,110,0.07)",
    forgot: "#8a7d6e",
  },
  portal: {
    label: "#222222",
    accent: "#111111",
    switch: "#111111",
    inputBorder: "#dddddd",
    inputColor: "#111111",
    inputBackground: "#ffffff",
    inactive: "#666666",
    tabBg: "#f0f0f0",
    forgot: "#333333",
  },
  writing: {
    label: "#7c5c2e",
    accent: "#c8852a",
    switch: "#7c5c2e",
    inputBorder: "#e8ded0",
    inputColor: "#2a1f14",
    inputBackground: "rgba(250, 248, 245, 0.82)",
    inactive: "#a09080",
    tabBg: "rgba(200,133,42,0.07)",
    forgot: "#8a7d6e",
  },
};

const getThemeStyle = (theme) => THEME_STYLES[theme] || THEME_STYLES.writing;

const getLabelStyle = (theme) => ({
  fontSize: 12,
  color: getThemeStyle(theme).label,
  fontFamily: "sans-serif",
  display: "block",
  marginBottom: 6,
});
const getAccentColor = (theme) => getThemeStyle(theme).accent;
const switchColor = (theme) => getThemeStyle(theme).switch;
const getInputStyle = (theme, override = {}) => inp({
  border: `1.5px solid ${getThemeStyle(theme).inputBorder}`,
  color: getThemeStyle(theme).inputColor,
  background: getThemeStyle(theme).inputBackground,
  boxShadow: (theme === "grammar" || theme === "reading") ? "inset 0 1px 0 rgba(255,255,255,0.72)" : undefined,
  backdropFilter: (theme === "grammar" || theme === "reading") ? "blur(10px)" : undefined,
  WebkitBackdropFilter: (theme === "grammar" || theme === "reading") ? "blur(10px)" : undefined,
  ...override,
});
function ForgotPasswordButton({ onForgot, theme }) {
  return (
    <div style={{ textAlign: "center" }}>
      <button
        type="button"
        onClick={onForgot}
        style={{
          background: "none",
          border: "none",
          color: getThemeStyle(theme).forgot,
          fontSize: 11,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        忘记密码？
      </button>
    </div>
  );
}

function LoginTypeTabs({ loginType, onSwitch, theme }) {
  const themeStyle = getThemeStyle(theme);
  const tabs = [
    { key: "password", label: "密码登录" },
    { key: "code", label: "验证码登录" },
  ];
  return (
    <div style={{ display: "flex", background: themeStyle.tabBg, borderRadius: 10, padding: 3, gap: 3, marginBottom: 16 }}>
      {tabs.map(t => (
        <button
          key={t.key}
          type="button"
          onClick={() => onSwitch(t.key)}
          style={{
            flex: 1,
            padding: "8px 0",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: loginType === t.key ? 700 : 500,
            background: loginType === t.key ? "#ffffff" : "transparent",
            color: loginType === t.key ? themeStyle.accent : themeStyle.inactive,
            boxShadow: loginType === t.key ? "0 1px 5px rgba(0,0,0,0.09)" : "none",
            transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function SmsRealNameField({ accentColor, inputClassName, inputStyle, labelStyle, setSmsRealName, smsRealName }) {
  return (
    <Field id="sms-real-name" label="姓名" required labelStyle={labelStyle} accentColor={accentColor}>
        <input
          id="sms-real-name"
          aria-label="姓名"
          type="text"
        value={smsRealName}
        onChange={e => setSmsRealName(e.target.value)}
        placeholder="请输入真实姓名"
        className={inputClassName}
        style={inputStyle()}
      />
    </Field>
  );
}

function SmsCodeField({
  accentColor,
  inputClassName,
  inputStyle,
  labelStyle,
  loading,
  onSendSmsCode,
  onSubmitWithCode,
  setSmsCode,
  smsCode,
  smsCountdown,
  smsDevCode,
}) {
  const canResend = smsCountdown <= 0 && !loading;

  return (
    <Field id="sms-code" label="验证码" required labelStyle={labelStyle} accentColor={accentColor}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          id="sms-code"
          aria-label="验证码"
          type="text"
          value={smsCode}
          onChange={e => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6位验证码"
          className={inputClassName}
          style={inputStyle({ flex: 1 })}
          maxLength={6}
          onKeyDown={e => { if (e.key === "Enter") onSubmitWithCode(); }}
        />
        <button
          type="button"
          onClick={onSendSmsCode}
          disabled={!canResend}
          style={{
            flexShrink: 0,
            padding: "0 14px",
            height: 40,
            borderRadius: 999,
            border: canResend ? `1.5px solid ${accentColor}` : "1.5px solid #e0e0e0",
            background: "transparent",
            color: canResend ? accentColor : "#bbb",
            fontSize: 12,
            fontWeight: 600,
            cursor: canResend ? "pointer" : "default",
            whiteSpace: "nowrap",
            transition: "border-color 0.15s, color 0.15s",
          }}
        >
          {smsCountdown > 0 ? `${smsCountdown}s` : "重新发送"}
        </button>
      </div>
      {import.meta.env.DEV && smsDevCode ? (
        <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>DEV 验证码：{smsDevCode}</div>
      ) : null}
    </Field>
  );
}

function SmsSubmitButton({ loading, onSendSmsCode, onSubmitWithCode, smsCodeSent, smsIsNewUser, theme }) {
  if (!smsCodeSent) {
    return (
      <AuthPrimaryButton onClick={onSendSmsCode} disabled={loading} theme={theme}>
        {loading ? "发送中…" : "发送验证码"}
      </AuthPrimaryButton>
    );
  }

  const loadingLabel = smsIsNewUser ? "注册中…" : "登录中…";
  const readyLabel = smsIsNewUser ? "注册并登录 →" : "登录 →";

  return (
    <AuthPrimaryButton onClick={onSubmitWithCode} disabled={loading} theme={theme}>
      {loading ? loadingLabel : readyLabel}
    </AuthPrimaryButton>
  );
}

function PhoneCodeForm({ accentColor, inputClassName, inputStyle, labelStyle, theme,
  smsPhone, setSmsPhone, smsCode, setSmsCode, smsRealName, setSmsRealName,
  smsIsNewUser, smsCountdown, smsCodeSent, smsDevCode,
  onSendSmsCode, onSubmitWithCode, err, successMsg, loading,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field id="sms-phone" label="邮箱" required labelStyle={labelStyle} accentColor={accentColor}>
        <input
          id="sms-phone"
          aria-label="邮箱"
          type="email"
          value={smsPhone}
          onChange={e => setSmsPhone(e.target.value)}
          placeholder="输入邮箱地址"
          className={inputClassName}
          style={inputStyle()}
          onKeyDown={e => { if (e.key === "Enter" && !smsCodeSent) onSendSmsCode(); }}
        />
      </Field>

      {smsIsNewUser && smsCodeSent ? <SmsRealNameField accentColor={accentColor} inputClassName={inputClassName} inputStyle={inputStyle} labelStyle={labelStyle} setSmsRealName={setSmsRealName} smsRealName={smsRealName} /> : null}

      {smsCodeSent ? (
        <SmsCodeField accentColor={accentColor} inputClassName={inputClassName} inputStyle={inputStyle} labelStyle={labelStyle} loading={loading} onSendSmsCode={onSendSmsCode} onSubmitWithCode={onSubmitWithCode} setSmsCode={setSmsCode} smsCode={smsCode} smsCountdown={smsCountdown} smsDevCode={smsDevCode} />
      ) : null}

      {successMsg ? <Notice tone="success">{successMsg}</Notice> : null}
      {err ? <Notice tone="error">{err}</Notice> : null}

      <SmsSubmitButton loading={loading} onSendSmsCode={onSendSmsCode} onSubmitWithCode={onSubmitWithCode} smsCodeSent={smsCodeSent} smsIsNewUser={smsIsNewUser} theme={theme} />
    </div>
  );
}

function ModeSwitch({ registerMode, onSwitchMode, theme }) {
  const text = registerMode ? "已有账号？" : "还没有账号？";
  const label = registerMode ? "去登录" : "去注册";
  const mode = registerMode ? "login" : "register";
  return (
    <div style={{ textAlign: "center", fontSize: 12, color: "#888" }}>
      {text}
      <button type="button" onClick={() => onSwitchMode(mode)} style={{ marginLeft: 6, border: "none", background: "transparent", color: switchColor(theme), cursor: "pointer", padding: 0, fontSize: 12, fontWeight: 700 }}>
        {label}
      </button>
    </div>
  );
}

function PasswordAuthForm({
  accentColor,
  account,
  confirmPw,
  err,
  inputClassName,
  inputStyle,
  labelStyle,
  loading,
  onForgot,
  onSubmit,
  onSwitchMode,
  phone,
  prepExamId,
  pw,
  realName,
  registerMode,
  role,
  serviceUnavailable,
  setAccount,
  setConfirmPw,
  setPhone,
  setPrepExamId,
  setPw,
  setRealName,
  setRole,
  successMsg,
  submitLabel,
  theme,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field id="auth-account" label={registerMode ? "邮箱" : "邮箱或手机号"} required labelStyle={labelStyle} accentColor={accentColor}>
        <input
          id="auth-account"
          aria-label={registerMode ? "邮箱" : "邮箱或手机号"}
          type="text"
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder={registerMode ? "your@email.com" : "支持邮箱或手机号登录"}
          className={inputClassName}
          style={inputStyle()}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        />
      </Field>

      {registerMode ? <RegisterFields accentColor={accentColor} inputClassName={inputClassName} inputStyle={inputStyle} labelStyle={labelStyle} phone={phone} prepExamId={prepExamId} realName={realName} role={role} roleLabelColor={getThemeStyle(theme).label} setRole={setRole} setPhone={setPhone} setPrepExamId={setPrepExamId} setRealName={setRealName} /> : null}

      <Field id="auth-password" label="密码" required labelStyle={labelStyle} accentColor={accentColor}>
        <input
          id="auth-password"
          aria-label="密码"
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder={registerMode ? "至少 8 位，包含大小写和数字" : "输入密码"}
          className={inputClassName}
          style={inputStyle()}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        />
      </Field>

      {registerMode ? <ConfirmPasswordField accentColor={accentColor} confirmPw={confirmPw} inputClassName={inputClassName} inputStyle={inputStyle} labelStyle={labelStyle} setConfirmPw={setConfirmPw} /> : null}

      {successMsg ? <Notice tone="success">{successMsg}</Notice> : null}
      {err ? <Notice tone="error">{err}</Notice> : null}

      <AuthPrimaryButton disabled={loading || serviceUnavailable} onClick={onSubmit} theme={theme}>
        {submitLabel}
      </AuthPrimaryButton>

      {!registerMode ? <ForgotPasswordButton onForgot={onForgot} theme={theme} /> : null}

      <ModeSwitch registerMode={registerMode} onSwitchMode={onSwitchMode} theme={theme} />
    </div>
  );
}

export default function AuthMainForm({
  embedded,
  serviceUnavailable,
  serviceError,
  registerMode,
  loginType,
  onSwitchLoginType,
  account,
  setAccount,
  realName,
  setRealName,
  phone,
  setPhone,
  prepExamId,
  setPrepExamId,
  role,
  setRole,
  pw,
  setPw,
  confirmPw,
  setConfirmPw,
  smsPhone, setSmsPhone,
  smsCode, setSmsCode,
  smsRealName, setSmsRealName,
  smsIsNewUser,
  smsCountdown, smsCodeSent, smsDevCode,
  onSendSmsCode, onSubmitWithCode,
  err,
  successMsg,
  loading,
  onSubmit,
  onForgot,
  onSwitchMode,
  onBack,
  theme = "writing",
}) {
  const titleLabelStyle = getLabelStyle(theme);
  const accentColor = getAccentColor(theme);
  const inputStyle = (override) => getInputStyle(theme, override);
  const inputClassName = `auth-input auth-input--${theme}`;
  const submitLabel = loading ? (registerMode ? "注册中…" : "登录中…") : registerMode ? "创建账号 →" : "登录";

  return (
    <AuthShell embedded={embedded} theme={theme} onBack={onBack}>
        {serviceUnavailable ? <Notice>{serviceError}</Notice> : null}

        {/* Login type tabs — only shown on the login screen */}
        {!registerMode ? (
          <LoginTypeTabs loginType={loginType} onSwitch={onSwitchLoginType} theme={theme} />
        ) : null}

        {!registerMode && loginType === "code" ? (
          <PhoneCodeForm
            accentColor={accentColor}
            inputClassName={inputClassName}
            inputStyle={inputStyle}
            labelStyle={titleLabelStyle}
            theme={theme}
            smsPhone={smsPhone} setSmsPhone={setSmsPhone}
            smsCode={smsCode} setSmsCode={setSmsCode}
            smsRealName={smsRealName} setSmsRealName={setSmsRealName}
            smsIsNewUser={smsIsNewUser}
            smsCountdown={smsCountdown} smsCodeSent={smsCodeSent} smsDevCode={smsDevCode}
            onSendSmsCode={onSendSmsCode} onSubmitWithCode={onSubmitWithCode}
            err={err} successMsg={successMsg} loading={loading}
          />
        ) : (
          <PasswordAuthForm
            accentColor={accentColor}
            account={account}
            confirmPw={confirmPw}
            err={err}
            inputClassName={inputClassName}
            inputStyle={inputStyle}
            labelStyle={titleLabelStyle}
            loading={loading}
            onForgot={onForgot}
            onSubmit={onSubmit}
            onSwitchMode={onSwitchMode}
            phone={phone}
            prepExamId={prepExamId}
            pw={pw}
            realName={realName}
            registerMode={registerMode}
            role={role}
            serviceUnavailable={serviceUnavailable}
            setAccount={setAccount}
            setConfirmPw={setConfirmPw}
            setPhone={setPhone}
            setPrepExamId={setPrepExamId}
            setPw={setPw}
            setRealName={setRealName}
            setRole={setRole}
            successMsg={successMsg}
            submitLabel={submitLabel}
            theme={theme}
          />
        )}

        {/* mode switch shown below code form too */}
        {!registerMode && loginType === "code" ? (
          <div style={{ marginTop: 12 }}>
            <ModeSwitch registerMode={registerMode} onSwitchMode={onSwitchMode} theme={theme} />
          </div>
        ) : null}
    </AuthShell>
  );
}
