import { useEffect, useState } from "react";

import { authAPI, setToken } from "../../api/index.js";
import { readSelectedPrepExamId, writeSelectedPrepExamId } from "../../app/prepExamSelection.js";

export function useAuthFlowModel({ onLogin, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [loginType, setLoginType] = useState("password"); // "password" | "code"
  const [account, setAccount] = useState("");
  const [realName, setRealName] = useState("");
  const [pw, setPw] = useState("");
  const [phone, setPhone] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [role, setRole] = useState("student");
  const [prepExamId, setPrepExamIdState] = useState(() => readSelectedPrepExamId());

  // Phone-code login state
  const [smsPhone, setSmsPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [smsRealName, setSmsRealName] = useState("");
  const [smsIsNewUser, setSmsIsNewUser] = useState(false);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [smsCodeSent, setSmsCodeSent] = useState(false);
  const [smsDevCode, setSmsDevCode] = useState("");

  const [forgotType, setForgotType] = useState("email");
  const [forgotAccount, setForgotAccount] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [forgotConfirmPw, setForgotConfirmPw] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState("");

  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (smsCountdown <= 0) return;
    const timer = setTimeout(() => setSmsCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [smsCountdown]);

  useEffect(() => {
    setMode(initialMode);
    setErr("");
    setSuccessMsg("");
  }, [initialMode]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setErr("");
    setSuccessMsg("");
    if (nextMode !== "forgot") {
      setForgotType("email");
      setForgotAccount("");
      setCode("");
      setNewPw("");
      setForgotConfirmPw("");
      setCountdown(0);
      setCodeSent(false);
      setDevCode("");
    }
  };

  const switchLoginType = (type) => {
    setLoginType(type);
    setErr("");
    setSuccessMsg("");
    setSmsPhone("");
    setSmsCode("");
    setSmsRealName("");
    setSmsIsNewUser(false);
    setSmsCountdown(0);
    setSmsCodeSent(false);
    setSmsDevCode("");
  };

  const submit = async () => {
    setErr("");
    setLoading(true);
    try {
      if (mode === "register") {
        if (!account.trim()) throw new Error("请填写邮箱");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.trim())) throw new Error("邮箱格式不正确");
        if (!realName.trim()) throw new Error("请填写姓名");
        if (phone.trim() && !/^1[3-9]\d{9}$/.test(phone.trim())) throw new Error("手机号格式不正确");
        if (pw.length < 8) throw new Error("密码至少8位");
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pw)) throw new Error("密码需包含大小写字母和数字");
        if (pw !== confirmPw) throw new Error("两次输入的密码不一致");

        const data = await authAPI.register({
          realName: realName.trim(),
          email: account.trim(),
          phone: phone.trim(),
          password: pw,
          confirmPassword: confirmPw,
          role,
          preferences: role === "student" ? { prepExamId } : undefined,
        });
        setToken(data.token);
        await onLogin(data.user, true);
        return;
      }

      if (!account.trim() || !pw.trim()) throw new Error("请填写账号和密码");
      const data = await authAPI.login(account.trim(), pw);
      setToken(data.token);
      await onLogin(data.user, false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    if (!forgotAccount.trim()) {
      setErr(`请输入${forgotType === "email" ? "邮箱" : "手机号"}`);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await authAPI.forgotPassword(forgotAccount.trim(), forgotType);
      setCodeSent(true);
      setCountdown(60);
      setDevCode(import.meta.env.DEV ? res.devCode || "" : "");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const sendSmsCode = async () => {
    const emailVal = smsPhone.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setErr("请输入正确的邮箱地址");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await authAPI.sendEmailLoginCode(emailVal);
      setSmsIsNewUser(res.isNewUser);
      setSmsCodeSent(true);
      setSmsCountdown(60);
      setSmsDevCode(import.meta.env.DEV ? res.devCode || "" : "");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const submitWithCode = async () => {
    if (!smsCode.trim()) { setErr("请输入验证码"); return; }
    if (smsIsNewUser && smsRealName.trim().length < 2) { setErr("请填写姓名（至少2个字）"); return; }
    setLoading(true);
    setErr("");
    try {
      const data = await authAPI.emailCodeAuth(
        smsPhone.trim(),
        smsCode.trim(),
        smsIsNewUser ? smsRealName.trim() : undefined,
        role,
        smsIsNewUser && role === "student" ? { prepExamId } : undefined,
      );
      setToken(data.token);
      await onLogin(data.user, smsIsNewUser);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!code.trim() || !newPw.trim()) {
      setErr("请填写验证码和新密码");
      return;
    }
    if (newPw !== forgotConfirmPw) {
      setErr("两次密码输入不一致");
      return;
    }
    if (newPw.length < 8) {
      setErr("密码至少8位");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await authAPI.resetPassword(forgotAccount.trim(), forgotType, code.trim(), newPw);
      switchMode("login");
      setPw("");
      setSuccessMsg("密码已重置，请使用新密码登录");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return {
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
      setPrepExamId: (nextExamId) => setPrepExamIdState(writeSelectedPrepExamId(nextExamId)),
      setForgotType,
      setForgotAccount,
      setCode,
      setNewPw,
      setForgotConfirmPw,
      setErr,
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
      resetForgotType: (nextType) => {
        setForgotType(nextType);
        setCodeSent(false);
        setErr("");
        setDevCode("");
      },
    },
  };
}
