import { CheckCircle, XCircle } from "lucide-react";
import { useEffect, useState } from "react";


import { usersAPI, classesAPI, parentAPI } from "../api/index.js";
import { getUserRoleLabel } from "../app/roleLabels.js";
import useScrollReveal from "../hooks/useScrollReveal.js";
import { AccountPageShell } from "./account/AccountShared.jsx";
import { ACCOUNT_THEME as T, accountInputStyle as inp } from "./account/accountStyles.js";
import SubscriptionTab from "./account/SubscriptionTab.jsx";
import { PageHeader, SmallActionButton, StatusBanner } from "./shared/UI.jsx";

function StatusMessage({ msg }) {
  if (!msg) return null;
  const success = msg.startsWith("ok:");
  const text = msg.slice(3);
  return (
    <StatusBanner tone={success ? "success" : "error"}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {success ? <CheckCircle size={14} strokeWidth={2.5} /> : <XCircle size={14} strokeWidth={2.5} />}
        {text}
      </span>
    </StatusBanner>
  );
}

function SectionCard({ title, hint, children, isMobile = false }) {
  return (
    <div style={{ background: T.card, borderRadius: 14, border: `1px solid ${T.border}`, padding: isMobile ? 16 : 20, display: "flex", flexDirection: "column", gap: isMobile ? 12 : 14 }}>
      {title || hint ? (
        <div>
          {title ? <div style={{ fontSize: 15, fontWeight: 700, color: T.text, lineHeight: 1.4 }}>{title}</div> : null}
          {hint ? <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, lineHeight: 1.7 }}>{hint}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function ActionButton({ children, onClick, disabled, tone = "primary", full = false }) {
  const styles = {
    primary: {
      background: disabled ? "#d0d0d0" : "#1a1a1a",
      color: disabled ? "#888" : "#fff",
      border: "none",
    },
    subtle: {
      background: "#f5f5f5",
      color: "#333",
      border: `1px solid ${T.border}`,
    },
  };
  const style = styles[tone] || styles.primary;
  return (
    <button
      type="button"
      aria-label={typeof children === "string" ? children : undefined}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: full ? "100%" : "auto",
        padding: "11px 16px",
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function StudentClassSection({ user, onUpdate, isMobile, compact = false }) {
  const [classCode, setClassCode] = useState("");
  const [classPassword, setClassPassword] = useState("");
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);
  const [foundClass, setFoundClass] = useState(null);
  const [msg, setMsg] = useState("");

  const currentClassName = user.className || "";

  const searchClass = async () => {
    if (!classCode.trim()) {
      setMsg("err:请输入班级号");
      return;
    }
    setSearching(true);
    setMsg("");
    setFoundClass(null);
    try {
      const cls = await classesAPI.search(classCode.trim());
      setFoundClass(cls);
    } catch (error) {
      setMsg(`err:${error.message}`);
    } finally {
      setSearching(false);
    }
  };

  const joinClass = async () => {
    if (!foundClass) return;
    if (!classPassword.trim()) {
      setMsg("err:请输入班级密码");
      return;
    }
    setJoining(true);
    setMsg("");
    try {
      const result = await classesAPI.join(foundClass.id, classPassword.trim());
      if (result?.user) onUpdate(result.user);
      setClassPassword("");
      setFoundClass(null);
      setClassCode("");
      setMsg("ok:已加入班级");
    } catch (error) {
      setMsg(`err:${error.message}`);
    } finally {
      setJoining(false);
    }
  };

  const content = currentClassName ? (
    <div style={{ display: "grid", gap: compact ? 8 : 10 }}>
      <div style={{ fontSize: 14, color: T.text, fontWeight: 700 }}>班级</div>
      <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.8 }}>
        当前班级：<span style={{ color: T.text, fontWeight: 700 }}>{currentClassName}</span>
      </div>
      <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.8 }}>
        班级号：<span style={{ color: T.text, fontWeight: 700 }}>{user.classId || "—"}</span>
      </div>
    </div>
  ) : (
    <div style={{ display: "grid", gap: compact ? 10 : 12 }}>
      <div style={{ fontSize: 14, color: T.text, fontWeight: 700 }}>班级</div>
      <div>
        <label style={{ fontSize: 12, color: T.textSecondary, display: "block", marginBottom: 6 }}>班级号</label>
        <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
          <input
            aria-label="班级号"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            placeholder="输入班级号（如：2024A01）"
            style={{
              ...inp({
                flex: 1,
                minHeight: 48,
                borderRadius: 16,
                padding: "10px 16px",
                background: "#fafafa",
                border: `1px solid ${T.border}`,
              }),
            }}
          />
          <SmallActionButton
            onClick={searchClass}
            disabled={searching}
            style={{
              minWidth: isMobile ? "100%" : 92,
              minHeight: 48,
              borderRadius: 16,
              justifyContent: "center",
              padding: "10px 18px",
              background: "#f5f5f5",
              color: "#1a1a1a",
              border: "1px solid #d0d0d0",
              boxShadow: "none",
            }}
          >
            {searching ? "搜索中..." : "搜索"}
          </SmallActionButton>
        </div>
      </div>

      {foundClass ? (
        <div style={{ background: T.successLight, border: "1px solid #b7e4cf", borderRadius: 12, padding: "12px 14px", display: "grid", gap: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.success }}>✓ 找到班级：{foundClass.className}</div>
          <div style={{ fontSize: 12, color: "#5a8a6a", lineHeight: 1.7 }}>教师：{foundClass.teacherName}</div>
          <div style={{ fontSize: 12, color: "#6b8b74", lineHeight: 1.7 }}>班级号：{foundClass.classCode} · 当前 {foundClass.studentCount || 0} 人</div>
          <input aria-label="班级密码" type="password" value={classPassword} onChange={(e) => setClassPassword(e.target.value)} placeholder="输入班级密码" style={{ ...inp(), minHeight: 44 }} />
          <ActionButton onClick={joinClass} disabled={joining} full>
            {joining ? "加入中..." : "加入班级"}
          </ActionButton>
        </div>
      ) : null}

      <StatusMessage msg={msg} />
    </div>
  );

  if (compact) return content;

  return <SectionCard isMobile={isMobile}>{content}</SectionCard>;
}

function ProfileTab({ user, isMobile }) {
  const infoRowStyle = {
    fontSize: 13,
    color: T.textSecondary,
    lineHeight: 1.8,
  };

  return (
    <SectionCard isMobile={isMobile}>
      <div style={{ display: "grid", gap: isMobile ? 10 : 12 }}>
        <div style={infoRowStyle}>
          ID：<span style={{ color: T.text, fontWeight: 700 }}>{user.accountCode || ""}</span>
        </div>
        <div style={infoRowStyle}>
          姓名：<span style={{ color: T.text, fontWeight: 700 }}>{user.realName || user.name || ""}</span>
        </div>
        <div style={infoRowStyle}>
          身份：<span style={{ color: T.text, fontWeight: 700 }}>{getUserRoleLabel(user)}</span>
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, paddingTop: 4, lineHeight: 1.7 }}>如确需更正，请联系管理员人员处理。</div>
      </div>
    </SectionCard>
  );
}

function ClassTab({ user, onUpdate, isMobile, onNavigate }) {
  if (user.role === "teacher") {
    return (
      <SectionCard isMobile={isMobile}>
        <TeacherClassSection user={user} onUpdate={onUpdate} isMobile={isMobile} onNavigate={onNavigate} />
      </SectionCard>
    );
  }
  if (user.role !== "student") {
    return (
      <SectionCard isMobile={isMobile}>
        <div style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.7 }}>当前身份暂无班级管理功能。</div>
      </SectionCard>
    );
  }
  return (
    <StudentClassSection user={user} onUpdate={onUpdate} isMobile={isMobile} compact={false} />
  );
}

function FamilyBindTab({ isMobile }) {
  const [bindCode, setBindCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadBindCode = async () => {
    setLoading(true);
    setError("");
    try {
      setBindCode(await parentAPI.getStudentBindCode());
    } catch (err) {
      setError(err?.message || "绑定码加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBindCode();
  }, []);

  const regenerate = async () => {
    setRefreshing(true);
    setError("");
    try {
      setBindCode(await parentAPI.regenerateStudentBindCode());
    } catch (err) {
      setError(err?.message || "绑定码刷新失败");
    } finally {
      setRefreshing(false);
    }
  };

  const expiresText = bindCode?.expiresAt
    ? new Date(Number(bindCode.expiresAt)).toLocaleString()
    : "";

  return (
    <SectionCard isMobile={isMobile}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.7 }}>分享给家长后，可用于绑定查看学习概览。</div>
        <SmallActionButton
          onClick={regenerate}
          disabled={refreshing}
          style={{ background: "#f5f5f5", color: "#1a1a1a", border: "1px solid #d0d0d0", boxShadow: "none", flexShrink: 0 }}
        >
          {refreshing ? "刷新中" : "刷新"}
        </SmallActionButton>
      </div>
      <div style={{ borderRadius: 10, background: "#f7f7f7", border: `1px solid ${T.border}`, padding: "14px 16px" }}>
        <div style={{ fontSize: 24, letterSpacing: 1, fontWeight: 800, color: T.text }}>
          {loading ? "加载中..." : bindCode?.code || "暂无绑定码"}
        </div>
        {expiresText ? <div style={{ marginTop: 6, fontSize: 12, color: T.textMuted }}>有效期至 {expiresText}</div> : null}
      </div>
      {error ? <StatusMessage msg={`err:${error}`} /> : null}
    </SectionCard>
  );
}

function SecurityMenuContent({ email, phone, entryButton }) {
  return (
    <div style={{ display: "grid" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "grid", gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>邮箱</div>
          <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7, wordBreak: "break-all" }}>{email || "未设置"}</div>
        </div>
        {entryButton("设置", "email")}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "grid", gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>电话</div>
          <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7, wordBreak: "break-all" }}>{phone || "未设置"}</div>
        </div>
        {entryButton("设置", "phone")}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0 0" }}>
        <div style={{ display: "grid", gap: 4, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>密码</div>
          <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7, wordBreak: "break-all" }}>已隐藏，为了安全不会直接显示</div>
        </div>
        {entryButton("修改", "password")}
      </div>
    </div>
  );
}

function AccountSecurityTab({ user, onUpdate, isMobile }) {
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [securityView, setSecurityView] = useState("menu");

  useEffect(() => {
    setEmail(user.email || "");
    setPhone(user.phone || "");
  }, [user.email, user.phone]);

  const saveContact = async () => {
    if (!currentPassword) {
      setContactMsg("err:修改联系方式时请先输入当前密码");
      return;
    }
    setSavingContact(true);
    setContactMsg("");
    try {
      const updated = await usersAPI.updateProfile({
        email: email.trim(),
        phone: phone.trim(),
        currentPassword,
      });
      onUpdate(updated);
      setCurrentPassword("");
      setContactMsg("ok:联系方式已更新");
    } catch (e) {
      setContactMsg(`err:${e.message}`);
    } finally {
      setSavingContact(false);
    }
  };

  const savePassword = async () => {
    if (!oldPw || !newPw || !confirmPw) {
      setPasswordMsg("err:请填写所有字段");
      return;
    }
    if (newPw !== confirmPw) {
      setPasswordMsg("err:两次新密码不一致");
      return;
    }
    if (newPw.length < 8) {
      setPasswordMsg("err:新密码至少8位");
      return;
    }
    setSavingPassword(true);
    setPasswordMsg("");
    try {
      await usersAPI.updateProfile({ oldPassword: oldPw, newPassword: newPw });
      setPasswordMsg("ok:密码修改成功");
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e) {
      setPasswordMsg(`err:${e.message}`);
    } finally {
      setSavingPassword(false);
    }
  };

  const backToMenu = () => {
    setSecurityView("menu");
    setContactMsg("");
    setPasswordMsg("");
    setCurrentPassword("");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setOldPw("");
    setNewPw("");
    setConfirmPw("");
  };

  const flexJustify = isMobile ? "stretch" : "flex-start";

  const entryButton = (label, target) => (
    <SmallActionButton
      onClick={() => setSecurityView(target)}
      style={{
        minWidth: 72,
        justifyContent: "center",
        flexShrink: 0,
        background: "#f5f5f5",
        color: "#1a1a1a",
        border: "1px solid #d0d0d0",
        boxShadow: "none",
      }}
    >
      {label}
    </SmallActionButton>
  );

  let content = null;

  if (securityView === "email") {
    content = (
      <div style={{ display: "grid", gap: 12 }}>
        <button type="button" onClick={backToMenu} style={{ border: "none", background: "transparent", color: "#555", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, textAlign: "left" }}>
          ← 返回安全
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>修改邮箱</div>
        <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.8 }}>
          当前邮箱：<span style={{ color: T.text, fontWeight: 700 }}>{email || "未设置"}</span>
        </div>
        <input aria-label="新邮箱" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="输入新邮箱" style={inp()} />
        <input aria-label="当前密码" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="输入当前密码确认修改" style={inp()} />
        <StatusMessage msg={contactMsg} />
        <div style={{ display: "flex", justifyContent: flexJustify }}>
          <ActionButton onClick={saveContact} disabled={savingContact} full={isMobile}>
            {savingContact ? "保存中..." : "保存邮箱"}
          </ActionButton>
        </div>
      </div>
    );
  } else if (securityView === "phone") {
    content = (
      <div style={{ display: "grid", gap: 12 }}>
        <button type="button" onClick={backToMenu} style={{ border: "none", background: "transparent", color: "#555", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, textAlign: "left" }}>
          ← 返回安全
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>修改电话</div>
        <div style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.8 }}>
          当前电话：<span style={{ color: T.text, fontWeight: 700 }}>{phone || "未设置"}</span>
        </div>
        <input aria-label="新手机号" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="输入新手机号" style={inp()} />
        <input aria-label="当前密码" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="输入当前密码确认修改" style={inp()} />
        <StatusMessage msg={contactMsg} />
        <div style={{ display: "flex", justifyContent: flexJustify }}>
          <ActionButton onClick={saveContact} disabled={savingContact} full={isMobile}>
            {savingContact ? "保存中..." : "保存电话"}
          </ActionButton>
        </div>
      </div>
    );
  } else if (securityView === "password") {
    content = (
      <div style={{ display: "grid", gap: 12 }}>
        <button type="button" onClick={backToMenu} style={{ border: "none", background: "transparent", color: "#555", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0, textAlign: "left" }}>
          ← 返回安全
        </button>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>修改密码</div>
        <input aria-label="当前密码" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} placeholder="当前密码" style={inp()} />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <input aria-label="新密码" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="新密码" style={inp()} />
          <input aria-label="确认新密码" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="确认新密码" style={inp()} />
        </div>
        <StatusMessage msg={passwordMsg} />
        <div style={{ display: "flex", justifyContent: flexJustify }}>
          <ActionButton onClick={savePassword} disabled={savingPassword} full={isMobile}>
            {savingPassword ? "修改中..." : "更新密码"}
          </ActionButton>
        </div>
      </div>
    );
  } else {
    content = <SecurityMenuContent email={email} phone={phone} entryButton={entryButton} />;
  }

  return (
    <SectionCard isMobile={isMobile}>
      {content}
    </SectionCard>
  );
}


function TeacherClassSection({ user, onUpdate, isMobile, onNavigate }) {
  const [newClassName, setNewClassName] = useState("");
  const [newClassPwd, setNewClassPwd] = useState("");
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");

  const createClass = async () => {
    if (!newClassName.trim()) { setMsg("err:请输入班级名称"); return; }
    if (!newClassPwd.trim()) { setMsg("err:请设置班级密码"); return; }
    setCreating(true);
    setMsg("");
    try {
      const newClass = await classesAPI.create(newClassName.trim(), newClassPwd.trim());
      const updatedUser = await classesAPI.bindTeacherClass(newClass.id);
      onUpdate(updatedUser);
      setNewClassName("");
      setNewClassPwd("");
      setMsg("ok:班级创建成功");
    } catch (e) {
      setMsg(`err:${e.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (user.className) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 13, color: T.textSecondary }}>
          当前班级：<span style={{ color: T.text, fontWeight: 700 }}>{user.className}</span>
        </div>
        <div style={{ fontSize: 13, color: T.textSecondary }}>
          班级号：<span style={{ color: T.text, fontWeight: 700 }}>{user.classId}</span>
          <span style={{ fontSize: 11, color: T.textMuted, marginLeft: 6 }}>（分享给学生用于加入）</span>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.("classes")}
          style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 8, border: "1px solid #d0d0d0", background: "#f5f5f5", color: "#333", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          管理班级 →
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.7 }}>还没有创建班级，创建后可以向学生分享班级号</div>
      <input aria-label="班级名称" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="班级名称（如：高三1班）" style={inp()} />
      <input aria-label="班级密码" value={newClassPwd} onChange={(e) => setNewClassPwd(e.target.value)} placeholder="设置班级密码" style={inp()} />
      {msg ? <StatusMessage msg={msg} /> : null}
      <ActionButton onClick={createClass} disabled={creating} full={isMobile}>
        {creating ? "创建中..." : "创建班级"}
      </ActionButton>
    </div>
  );
}

const VALID_TABS = new Set(["profile", "security", "class", "subscription", "family"]);

function getAccountPageCopy(tab, isTeacher) {
  const copies = {
    profile: ["基本资料", "查看账号身份、姓名与账号编号。"],
    security: ["账号安全", "管理邮箱、电话和登录密码。"],
    class: [isTeacher ? "班级管理" : "我的班级", isTeacher ? "管理你创建的班级与学生入口。" : "查看或加入老师创建的班级。"],
    subscription: ["我的订阅", "查看会员方案、权益和订单记录。"],
    family: ["家长绑定", "生成或刷新绑定码，分享给家长后即可查看学习概览。"],
  };
  return copies[tab] || copies.profile;
}

export default function AccountPage({ user, onUpdate, onBack, isMobile, initialTab = "profile", onNavigate }) {
  const pageRef = useScrollReveal();
  const isTeacher = user?.role === "teacher";
  const resolveTab = (t) => {
    const normalized = VALID_TABS.has(t) ? t : "profile";
    return isTeacher && (normalized === "subscription" || normalized === "family") ? "profile" : normalized;
  };
  const [tab, setTab] = useState(() => resolveTab(initialTab));

  useEffect(() => {
    const normalized = VALID_TABS.has(initialTab) ? initialTab : "profile";
    setTab(isTeacher && (normalized === "subscription" || normalized === "family") ? "profile" : normalized);
  }, [initialTab, isTeacher]);
  const [title, subtitle] = getAccountPageCopy(tab, isTeacher);

  return (
    <div ref={pageRef}>
    <AccountPageShell>
      <PageHeader
        titleZh={title}
        subtitle={subtitle}
        isMobile={isMobile}
        onBack={onBack}
        backLabel="返回我的"
      />

      {tab === "profile" && <ProfileTab user={user} isMobile={isMobile} />}
      {tab === "security" && <AccountSecurityTab user={user} onUpdate={onUpdate} isMobile={isMobile} />}
      {tab === "class" && <ClassTab user={user} onUpdate={onUpdate} isMobile={isMobile} onNavigate={onNavigate} />}
      {tab === "subscription" && !isTeacher && <SubscriptionTab isMobile={isMobile} user={user} />}
      {tab === "family" && !isTeacher && <FamilyBindTab isMobile={isMobile} />}
    </AccountPageShell>
    </div>
  );
}
