import { useEffect, useState } from "react";

import { ActionButton, SectionCard, StatusMessage } from "./AccountShared.jsx";
import { accountInputStyle, ACCOUNT_THEME } from "./accountStyles.js";
import { usersAPI } from "../../api/index.js";
import { getRequestStateFromError } from "../../utils/requestState.js";
import { SmallActionButton } from "../shared/UI.jsx";

function SecurityBackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        background: "transparent",
        color: ACCOUNT_THEME.primary,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        padding: 0,
        textAlign: "left",
      }}
    >
      ← 返回安全
    </button>
  );
}

function ContactSecurityForm({
  title,
  currentLabel,
  currentValue,
  inputValue,
  inputPlaceholder,
  onInputChange,
  currentPassword,
  onCurrentPasswordChange,
  messageState,
  saving,
  isMobile,
  saveLabel,
  onSave,
  onBack,
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <SecurityBackButton onClick={onBack} />
      <div style={{ fontSize: 14, fontWeight: 700, color: ACCOUNT_THEME.text }}>{title}</div>
      <div style={{ fontSize: 13, color: ACCOUNT_THEME.textSecondary, lineHeight: 1.8 }}>
        {currentLabel}：<span style={{ color: ACCOUNT_THEME.text, fontWeight: 700 }}>{currentValue || "未设置"}</span>
      </div>
      <input aria-label={title} value={inputValue} onChange={onInputChange} placeholder={inputPlaceholder} style={accountInputStyle()} />
      <input
        aria-label="当前密码"
        type="password"
        value={currentPassword}
        onChange={onCurrentPasswordChange}
        placeholder="输入当前密码确认修改"
        style={accountInputStyle()}
      />
      <StatusMessage state={messageState} />
      <div style={{ display: "flex", justifyContent: isMobile ? "stretch" : "flex-start" }}>
        <ActionButton onClick={onSave} disabled={saving} full={isMobile}>
          {saving ? "保存中..." : saveLabel}
        </ActionButton>
      </div>
    </div>
  );
}

function PasswordSecurityForm({
  oldPw,
  newPw,
  confirmPw,
  savingPassword,
  passwordMsg,
  isMobile,
  onBack,
  onOldPwChange,
  onNewPwChange,
  onConfirmPwChange,
  onSave,
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <SecurityBackButton onClick={onBack} />
      <div style={{ fontSize: 14, fontWeight: 700, color: ACCOUNT_THEME.text }}>修改密码</div>
      <input aria-label="当前密码" type="password" value={oldPw} onChange={onOldPwChange} placeholder="当前密码" style={accountInputStyle()} />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
        <input aria-label="新密码" type="password" value={newPw} onChange={onNewPwChange} placeholder="新密码" style={accountInputStyle()} />
        <input aria-label="确认新密码" type="password" value={confirmPw} onChange={onConfirmPwChange} placeholder="确认新密码" style={accountInputStyle()} />
      </div>
      <StatusMessage state={passwordMsg} />
      <div style={{ display: "flex", justifyContent: isMobile ? "stretch" : "flex-start" }}>
        <ActionButton onClick={onSave} disabled={savingPassword} full={isMobile}>
          {savingPassword ? "修改中..." : "更新密码"}
        </ActionButton>
      </div>
    </div>
  );
}

function SecurityMenuSection({
  itemWrapStyle,
  itemInfoStyle,
  itemTitleStyle,
  itemValueStyle,
  email,
  phone,
  entryButton,
}) {
  return (
    <div style={{ display: "grid" }}>
      <div style={itemWrapStyle}>
        <div style={itemInfoStyle}>
          <div style={itemTitleStyle}>邮箱</div>
          <div style={itemValueStyle}>{email || "未设置"}</div>
        </div>
        {entryButton("设置", "email")}
      </div>
      <div style={itemWrapStyle}>
        <div style={itemInfoStyle}>
          <div style={itemTitleStyle}>电话</div>
          <div style={itemValueStyle}>{phone || "未设置"}</div>
        </div>
        {entryButton("设置", "phone")}
      </div>
      <div style={{ ...itemWrapStyle, borderBottom: "none", paddingBottom: 0 }}>
        <div style={itemInfoStyle}>
          <div style={itemTitleStyle}>密码</div>
          <div style={itemValueStyle}>已隐藏，为了安全不会直接显示</div>
        </div>
        {entryButton("修改", "password")}
      </div>
    </div>
  );
}

export default function AccountSecurityTab({ user, onUpdate, isMobile }) {
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [contactMsg, setContactMsg] = useState(null);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [securityView, setSecurityView] = useState("menu");

  useEffect(() => {
    setEmail(user.email || "");
    setPhone(user.phone || "");
  }, [user.email, user.phone]);

  const saveContact = async () => {
    if (!currentPassword) {
      setContactMsg({
        tone: "warning",
        title: "请先输入当前密码",
        description: "修改联系方式前，需要先验证当前密码。",
      });
      return;
    }

    setSavingContact(true);
    setContactMsg(null);
    try {
      const updated = await usersAPI.updateProfile({
        email: email.trim(),
        phone: phone.trim(),
        currentPassword,
      });
      onUpdate(updated);
      setCurrentPassword("");
      setContactMsg({
        tone: "success",
        title: "联系方式已更新",
        description: "新的邮箱或手机号已经保存成功。",
      });
    } catch (error) {
      setContactMsg({
        ...getRequestStateFromError(error, {
          genericTitle: "更新联系方式失败",
          genericDescription: "这次没能保存新的联系方式，请检查密码和输入内容后再试。",
        }),
        actionLabel: "继续修改",
        onAction: () => setContactMsg(null),
      });
    } finally {
      setSavingContact(false);
    }
  };

  const savePassword = async () => {
    if (!oldPw || !newPw || !confirmPw) {
      setPasswordMsg({
        tone: "warning",
        title: "请填写所有字段",
        description: "当前密码、新密码和确认密码都需要填写完整。",
      });
      return;
    }
    if (newPw !== confirmPw) {
      setPasswordMsg({
        tone: "warning",
        title: "两次新密码不一致",
        description: "请确认两次输入的新密码完全一致。",
      });
      return;
    }
    if (newPw.length < 8) {
      setPasswordMsg({
        tone: "warning",
        title: "新密码至少 8 位",
        description: "请换一个更长一点的新密码后再试。",
      });
      return;
    }

    setSavingPassword(true);
    setPasswordMsg(null);
    try {
      await usersAPI.updateProfile({ oldPassword: oldPw, newPassword: newPw });
      setPasswordMsg({
        tone: "success",
        title: "密码修改成功",
        description: "新密码已经生效，后续请使用新密码登录。",
      });
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (error) {
      setPasswordMsg({
        ...getRequestStateFromError(error, {
          genericTitle: "修改密码失败",
          genericDescription: "这次没能更新密码，请检查当前密码和新密码设置后再试。",
        }),
        actionLabel: "继续修改",
        onAction: () => setPasswordMsg(null),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const backToMenu = () => {
    setSecurityView("menu");
    setContactMsg(null);
    setPasswordMsg(null);
    setCurrentPassword("");
    // Restore displayed values to the last saved state (discard any unsaved input)
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setOldPw("");
    setNewPw("");
    setConfirmPw("");
  };

  const itemWrapStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: isMobile ? "10px 0" : "12px 0",
    borderBottom: `1px solid ${ACCOUNT_THEME.border}`,
  };

  const itemInfoStyle = {
    display: "grid",
    gap: 4,
    minWidth: 0,
    flex: 1,
  };

  const itemTitleStyle = {
    fontSize: 14,
    fontWeight: 700,
    color: ACCOUNT_THEME.text,
  };

  const itemValueStyle = {
    fontSize: 13,
    color: ACCOUNT_THEME.textSecondary,
    lineHeight: 1.7,
    wordBreak: "break-all",
  };

  const entryButton = (label, target) => (
    <SmallActionButton
      onClick={() => setSecurityView(target)}
      style={{
        minWidth: 72,
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {label}
    </SmallActionButton>
  );

  let content = null;

  if (securityView === "email") {
    content = (
      <ContactSecurityForm
        title="修改邮箱"
        currentLabel="当前邮箱"
        currentValue={email}
        inputValue={email}
        inputPlaceholder="输入新邮箱"
        onInputChange={(event) => setEmail(event.target.value)}
        currentPassword={currentPassword}
        onCurrentPasswordChange={(event) => setCurrentPassword(event.target.value)}
        messageState={contactMsg}
        saving={savingContact}
        isMobile={isMobile}
        saveLabel="保存邮箱"
        onSave={saveContact}
        onBack={backToMenu}
      />
    );
  } else if (securityView === "phone") {
    content = (
      <ContactSecurityForm
        title="修改电话"
        currentLabel="当前电话"
        currentValue={phone}
        inputValue={phone}
        inputPlaceholder="输入新手机号"
        onInputChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))}
        currentPassword={currentPassword}
        onCurrentPasswordChange={(event) => setCurrentPassword(event.target.value)}
        messageState={contactMsg}
        saving={savingContact}
        isMobile={isMobile}
        saveLabel="保存电话"
        onSave={saveContact}
        onBack={backToMenu}
      />
    );
  } else if (securityView === "password") {
    content = (
      <PasswordSecurityForm
        oldPw={oldPw}
        newPw={newPw}
        confirmPw={confirmPw}
        savingPassword={savingPassword}
        passwordMsg={passwordMsg}
        isMobile={isMobile}
        onBack={backToMenu}
        onOldPwChange={(event) => setOldPw(event.target.value)}
        onNewPwChange={(event) => setNewPw(event.target.value)}
        onConfirmPwChange={(event) => setConfirmPw(event.target.value)}
        onSave={savePassword}
      />
    );
  } else {
    content = (
      <SecurityMenuSection
        itemWrapStyle={itemWrapStyle}
        itemInfoStyle={itemInfoStyle}
        itemTitleStyle={itemTitleStyle}
        itemValueStyle={itemValueStyle}
        email={email}
        phone={phone}
        entryButton={entryButton}
      />
    );
  }

  return <SectionCard isMobile={isMobile}>{content}</SectionCard>;
}
