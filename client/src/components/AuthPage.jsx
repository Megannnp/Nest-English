import AuthForgotForm from "./auth/AuthForgotForm.jsx";
import AuthMainForm from "./auth/AuthMainForm.jsx";
import { useAuthFlowModel } from "./auth/useAuthFlowModel.jsx";
import useIsMobile from "../hooks/useIsMobile.js";
import useScrollReveal from "../hooks/useScrollReveal.js";
import SignupCollage from "../portal/SignupCollage.jsx";

/* ── Pinterest-style left collage ─────────────────── */
const COLLAGE_CARDS = [
  { bg: "rgba(120,72,20,0.72)", content: (
    <div style={{ padding: "22px 18px 16px", color: "#fff" }}>
      <div style={{ fontSize: 10, opacity: 0.7, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>综合评分</div>
      <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1 }}>13</div>
      <div style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>/ 25 分</div>
      <div style={{ marginTop: 12, fontSize: 11, background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "4px 12px", display: "inline-block" }}>第三档 · 中</div>
    </div>
  )},
  { bg: "#f0ece4", content: (
    <div style={{ padding: "18px 16px 14px" }}>
      <div style={{ fontSize: 10, color: "#8a7a6a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>维度评分</div>
      {[{ n: "内容", v: 70, c: "#5a8a5a" }, { n: "语言", v: 40, c: "#c04030" }, { n: "结构", v: 60, c: "#a07030" }].map(d => (
        <div key={d.n} style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#2d2825", marginBottom: 4 }}><span>{d.n}</span><span style={{ color: d.c, fontWeight: 700 }}>{Math.round(d.v / 10)}</span></div>
          <div style={{ height: 4, borderRadius: 2, background: "#e0d8cc", overflow: "hidden" }}><div style={{ height: "100%", width: `${d.v}%`, background: d.c, borderRadius: 2 }} /></div>
        </div>
      ))}
    </div>
  )},
  { bg: "#e8e4dc", content: (
    <div style={{ padding: "18px 16px 14px" }}>
      <div style={{ fontSize: 10, color: "#8a7a6a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>提分建议</div>
      {["把语法错误集中修改，提升语言分。", "第二段补充心理活动与态度转变。", "结尾回扣主题，完成升华。"].map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 12, color: "#2d2825", lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", background: "#c8872d", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
          <span>{t}</span>
        </div>
      ))}
    </div>
  )},
  { bg: "#f5f1eb", content: (
    <div style={{ padding: "18px 16px 14px" }}>
      <div style={{ fontSize: 10, color: "#8a7a6a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>批改历史</div>
      {[{ d: "06-01", t: "读后续写", s: "13/25" }, { d: "05-17", t: "应用文", s: "21/25" }, { d: "05-03", t: "读后续写", s: "18/25" }].map((r, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#5a4a3a", marginBottom: 7, paddingBottom: 7, borderBottom: i < 2 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
          <span style={{ color: "#a09080" }}>{r.d}</span>
          <span>{r.t}</span>
          <span style={{ fontWeight: 700, color: "#c8872d" }}>{r.s}</span>
        </div>
      ))}
    </div>
  )},
  { bg: "#ede8df", content: (
    <div style={{ padding: "16px 16px 12px" }}>
      <div style={{ fontSize: 10, color: "#8a7a6a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>亮点标注</div>
      <div style={{ fontSize: 12, color: "#2d2825", lineHeight: 1.6, fontStyle: "italic", marginBottom: 8 }}>"autumn rain, soft and quiet — 与名字意义相呼应的表达。"</div>
      <div style={{ fontSize: 11, color: "#c8872d", fontWeight: 600 }}>词汇亮点 · AI 标注</div>
    </div>
  )},
  { bg: "#f0ece4", content: (
    <div style={{ padding: "18px 16px 14px" }}>
      <div style={{ fontSize: 10, color: "#8a7a6a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>语法纠错</div>
      <div style={{ fontSize: 12, color: "#8a2a1a", textDecoration: "line-through", marginBottom: 6, lineHeight: 1.5 }}>I very nervous and don't want speak</div>
      <div style={{ fontSize: 12, color: "#2a6040", fontWeight: 600, lineHeight: 1.5 }}>I was very nervous and didn't want to speak</div>
      <div style={{ fontSize: 11, color: "#a09080", marginTop: 8, fontStyle: "italic" }}>缺少谓语动词，时态不一致</div>
    </div>
  )},
];

function _PinCollage({ tagline }) {
  const col1 = [COLLAGE_CARDS[0], COLLAGE_CARDS[2], COLLAGE_CARDS[4]];
  const col2 = [COLLAGE_CARDS[1], COLLAGE_CARDS[3], COLLAGE_CARDS[5]];
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0, overflow: "hidden", background: "#e8e2d8" }}>
      {/* pin columns */}
      <div style={{ display: "flex", gap: 10, padding: "10px 10px 0", height: "100%", alignItems: "flex-start" }}>
        {[col1, col2].map((col, ci) => (
          <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, marginTop: ci === 1 ? 40 : 0 }}>
            {col.map((card, i) => (
              <div key={i} style={{ borderRadius: 16, overflow: "hidden", background: card.bg, boxShadow: "0 2px 10px rgba(0,0,0,0.08)", flexShrink: 0 }}>
                {card.content}
                <div style={{ padding: "10px 16px 14px", background: "#fff" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1614" }}>Writing Studio</div>
                  <div style={{ fontSize: 11, color: "#a09080", marginTop: 2 }}>AI 批改 · nest</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* gradient overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(232,226,216,0) 30%, rgba(232,226,216,0.4) 100%)" }} />
      {/* tagline */}
      <div style={{ position: "absolute", bottom: 40, left: 32, right: 32 }}>
        <div style={{ fontSize: "clamp(28px, 3.5vw, 42px)", fontWeight: 800, color: "#1a1614", lineHeight: 1.15, letterSpacing: "-1px" }}>{tagline}</div>
      </div>
    </div>
  );
}

const getShellStyle = (embedded = false, isMobile = false, theme = "writing") => ({
  minHeight: embedded ? "auto" : "100vh",
  background: embedded ? "transparent" : (theme === "portal" ? "#ffffff" : "#f5f1eb"),
  display: "flex",
  alignItems: embedded ? "flex-start" : "center",
  justifyContent: "center",
  padding: embedded ? 0 : (isMobile ? 12 : 14),
  width: "100%",
});

export default function AuthPage({ onLogin, onBack, serviceError = "", initialMode = "login", embedded = false, theme = "writing" }) {
  const pageRef = useScrollReveal();
  const isMobile = useIsMobile();
  const {
    state: {
      mode,
      loginType,
      account,
      realName,
      pw,
      phone,
      confirmPw,
      role,
      prepExamId,
      forgotType,
      forgotAccount,
      code,
      newPw,
      forgotConfirmPw,
      countdown,
      codeSent,
      devCode,
      smsPhone,
      smsCode,
      smsRealName,
      smsIsNewUser,
      smsCountdown,
      smsCodeSent,
      smsDevCode,
      err,
      successMsg,
      loading,
    },
    actions: {
      setAccount,
      setRealName,
      setPw,
      setPhone,
      setConfirmPw,
      setRole,
      setPrepExamId,
      setForgotAccount,
      setCode,
      setNewPw,
      setForgotConfirmPw,
      setSmsPhone,
      setSmsCode,
      setSmsRealName,
      switchMode,
      switchLoginType,
      submit,
      sendCode,
      sendSmsCode,
      submitWithCode,
      resetPassword,
      resetForgotType,
    },
  } = useAuthFlowModel({ onLogin, initialMode });
  const serviceUnavailable = Boolean(serviceError);

  const registerMode = mode === "register";
  const tagline = registerMode ? "注册后查看\n完整批改报告" : "欢迎回来，\n继续提升写作";

  if (!embedded && theme === "portal" && !isMobile) {
    const portalForm = mode === "forgot" ? (
      <AuthForgotForm
        embedded={false}
        forgotType={forgotType}
        setForgotType={resetForgotType}
        forgotAccount={forgotAccount}
        setForgotAccount={setForgotAccount}
        code={code} setCode={setCode}
        newPw={newPw} setNewPw={setNewPw}
        forgotConfirmPw={forgotConfirmPw} setForgotConfirmPw={setForgotConfirmPw}
        countdown={countdown} codeSent={codeSent} devCode={devCode}
        err={err} successMsg={successMsg} loading={loading}
        serviceUnavailable={serviceUnavailable} serviceError={serviceError}
        onSendCode={sendCode} onResetPassword={resetPassword}
        onBackToLogin={() => switchMode("login")}
        theme={theme}
      />
    ) : (
      <AuthMainForm
        embedded={false}
        serviceUnavailable={serviceUnavailable} serviceError={serviceError}
        registerMode={registerMode}
        loginType={loginType} onSwitchLoginType={switchLoginType}
        account={account} setAccount={setAccount}
        realName={realName} setRealName={setRealName}
        phone={phone} setPhone={setPhone}
        prepExamId={prepExamId} setPrepExamId={setPrepExamId}
        role={role} setRole={setRole}
        pw={pw} setPw={setPw}
        confirmPw={confirmPw} setConfirmPw={setConfirmPw}
        smsPhone={smsPhone} setSmsPhone={setSmsPhone}
        smsCode={smsCode} setSmsCode={setSmsCode}
        smsRealName={smsRealName} setSmsRealName={setSmsRealName}
        smsIsNewUser={smsIsNewUser}
        smsCountdown={smsCountdown} smsCodeSent={smsCodeSent} smsDevCode={smsDevCode}
        onSendSmsCode={sendSmsCode} onSubmitWithCode={submitWithCode}
        err={err} successMsg={successMsg} loading={loading}
        onSubmit={submit} onForgot={() => switchMode("forgot")}
        onSwitchMode={switchMode} onBack={onBack}
        theme={theme}
      />
    );

    return (
      <div style={{ display: "flex", minHeight: "100vh", overflow: "hidden", background: "#ffffff" }}>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <SignupCollage tagline={registerMode ? "“注册后，开始看见进步！”" : "“欢迎回来，继续提升英语！”"} style={{ height: "100vh" }} />
        </div>
        <div style={{
          width: 520,
          flexShrink: 0,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "44px 48px",
          overflowY: "auto",
          boxShadow: "-8px 0 34px rgba(0,0,0,0.05)",
        }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            {portalForm}
          </div>
        </div>
      </div>
    );
  }

  /* embedded or mobile: keep original centered layout */
  if (embedded || isMobile) {
    if (mode === "forgot") {
      return (
        <div style={getShellStyle(embedded, isMobile, theme)}>
          <AuthForgotForm
            embedded={embedded}
            forgotType={forgotType}
            setForgotType={resetForgotType}
            forgotAccount={forgotAccount}
            setForgotAccount={setForgotAccount}
            code={code} setCode={setCode}
            newPw={newPw} setNewPw={setNewPw}
            forgotConfirmPw={forgotConfirmPw} setForgotConfirmPw={setForgotConfirmPw}
            countdown={countdown} codeSent={codeSent} devCode={devCode}
            err={err} successMsg={successMsg} loading={loading}
            serviceUnavailable={serviceUnavailable} serviceError={serviceError}
            onSendCode={sendCode} onResetPassword={resetPassword}
            onBackToLogin={() => switchMode("login")}
            theme={theme}
          />
        </div>
      );
    }
    return (
      <div style={getShellStyle(embedded, isMobile, theme)}>
        <AuthMainForm
          embedded={embedded}
          serviceUnavailable={serviceUnavailable} serviceError={serviceError}
          registerMode={registerMode}
          loginType={loginType} onSwitchLoginType={switchLoginType}
          account={account} setAccount={setAccount}
          realName={realName} setRealName={setRealName}
          phone={phone} setPhone={setPhone}
          prepExamId={prepExamId} setPrepExamId={setPrepExamId}
          role={role} setRole={setRole}
          pw={pw} setPw={setPw}
          confirmPw={confirmPw} setConfirmPw={setConfirmPw}
          smsPhone={smsPhone} setSmsPhone={setSmsPhone}
          smsCode={smsCode} setSmsCode={setSmsCode}
          smsRealName={smsRealName} setSmsRealName={setSmsRealName}
          smsIsNewUser={smsIsNewUser}
          smsCountdown={smsCountdown} smsCodeSent={smsCodeSent} smsDevCode={smsDevCode}
          onSendSmsCode={sendSmsCode} onSubmitWithCode={submitWithCode}
          err={err} successMsg={successMsg} loading={loading}
          onSubmit={submit} onForgot={() => switchMode("forgot")}
          onSwitchMode={switchMode} onBack={onBack}
          theme={theme}
        />
      </div>
    );
  }

  /* desktop: Pinterest split layout */
  const formNode = mode === "forgot" ? (
    <AuthForgotForm
      embedded={false}
      forgotType={forgotType} setForgotType={resetForgotType}
      forgotAccount={forgotAccount} setForgotAccount={setForgotAccount}
      code={code} setCode={setCode}
      newPw={newPw} setNewPw={setNewPw}
      forgotConfirmPw={forgotConfirmPw} setForgotConfirmPw={setForgotConfirmPw}
      countdown={countdown} codeSent={codeSent} devCode={devCode}
      err={err} successMsg={successMsg} loading={loading}
      serviceUnavailable={serviceUnavailable} serviceError={serviceError}
      onSendCode={sendCode} onResetPassword={resetPassword}
      onBackToLogin={() => switchMode("login")}
      theme={theme}
    />
  ) : (
    <AuthMainForm
      embedded={false}
      serviceUnavailable={serviceUnavailable} serviceError={serviceError}
      registerMode={registerMode}
      account={account} setAccount={setAccount}
      realName={realName} setRealName={setRealName}
      phone={phone} setPhone={setPhone}
      prepExamId={prepExamId} setPrepExamId={setPrepExamId}
      role={role} setRole={setRole}
      pw={pw} setPw={setPw}
      confirmPw={confirmPw} setConfirmPw={setConfirmPw}
      err={err} successMsg={successMsg} loading={loading}
      onSubmit={submit} onForgot={() => switchMode("forgot")}
      onSwitchMode={switchMode} onBack={onBack}
      theme={theme}
    />
  );

  return (
    <div ref={pageRef} style={{ display: "flex", minHeight: "100vh", overflow: "hidden" }}>
      {/* Left: signup collage */}
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <SignupCollage tagline={tagline} style={{ flex: 1 }} />
      </div>
      {/* Right: form panel */}
      <div style={{
        width: 460,
        flexShrink: 0,
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 32px",
        overflowY: "auto",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.06)",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          {formNode}
        </div>
      </div>
    </div>
  );
}
