import { useRef, useState } from "react";

import { AccountPageShell } from "./account/AccountShared.jsx";
import { usersAPI } from "../api/index.js";
import { PREP_EXAMS, getPrepExam } from "../app/prepExamConfig.js";
import { readSelectedPrepExamId, writeSelectedPrepExamId } from "../app/prepExamSelection.js";
import { getUserRoleLabel } from "../app/roleLabels.js";
import useScrollReveal from "../hooks/useScrollReveal.js";
import AppIcon from "./shared/AppIcon.jsx";

function getAvatarText(user) {
  const name = user?.realName || user?.name || "";
  return name.slice(0, 1).toUpperCase() || "U";
}

function getRoleLabel(user) {
  return getUserRoleLabel(user);
}

function MenuItem({ icon, label, value, onClick, danger = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "14px 16px",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "inherit",
      }}
    >
      <span style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
        background: danger ? "#fff5f5" : "#f3f2ef",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: danger ? "#d9534f" : "#555",
      }}>
        <AppIcon name={icon} size={18} />
      </span>
      <span style={{ flex: 1, fontSize: 14, color: danger ? "#d9534f" : "#1a1a1a", fontWeight: 500 }}>
        {label}
      </span>
      {value && (
        <span style={{ fontSize: 12, color: "#bbb", marginRight: 2 }}>{value}</span>
      )}
      {!danger && (
        <span style={{ color: "#ccc", fontSize: 14 }}>›</span>
      )}
    </button>
  );
}

function MenuGroup({ children }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid rgba(0,0,0,0.08)",
    }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 0.5, background: "rgba(0,0,0,0.07)", marginLeft: 60 }} />;
}

function UserCard({ user }) {
  const avatarText = getAvatarText(user);
  const roleLabel = getRoleLabel(user);
  const className = user?.className || null;
  return (
    <div style={{ background: "#1a1a1a", padding: "28px 20px 24px" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fff", color: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, flexShrink: 0, marginBottom: 12 }}>
        {avatarText}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
        {user?.realName || user?.name || "用户"}
      </div>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "2px 10px", fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>{roleLabel}</span>
        {className && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{className}</span>}
        {user?.accountCode && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>ID {user.accountCode}</span>}
      </div>
    </div>
  );
}

function PrepExamPicker({ user, onUserUpdate }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const savingRef = useRef(false);
  const currentExam = getPrepExam(readSelectedPrepExamId(user));

  async function chooseExam(examId) {
    if (savingRef.current || examId === currentExam.id) return;
    savingRef.current = true;
    setSaving(examId);
    setError("");
    try {
      const updated = await usersAPI.updateProfile({
        preferences: { prepExamId: examId },
      });
      writeSelectedPrepExamId(examId);
      onUserUpdate?.(updated);
      setOpen(false);
    } catch (err) {
      setError(err?.message || "备考目标保存失败，请稍后重试。");
    } finally {
      savingRef.current = false;
      setSaving("");
    }
  }

  return (
    <MenuGroup>
      <MenuItem
        icon="target"
        label="备考目标"
        value={currentExam.label}
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <div style={{ padding: "0 14px 14px 60px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PREP_EXAMS.map((exam) => (
              <button
                key={exam.id}
                type="button"
                disabled={Boolean(saving)}
                onClick={() => chooseExam(exam.id)}
                style={{
                  border: exam.id === currentExam.id ? "1px solid #1a1a1a" : "1px solid rgba(0,0,0,0.12)",
                  background: exam.id === currentExam.id ? "#1a1a1a" : "#fff",
                  color: exam.id === currentExam.id ? "#fff" : "#333",
                  borderRadius: 999,
                  padding: "7px 11px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {saving === exam.id ? "保存中" : exam.label}
              </button>
            ))}
          </div>
          {error && <div role="alert" style={{ marginTop: 10, fontSize: 12, color: "#a33" }}>{error}</div>}
        </div>
      )}
    </MenuGroup>
  );
}

export default function MinePage({ user, onUserUpdate, onNavigate, handleLogout }) {
  const pageRef = useScrollReveal();
  const isTeacher = user?.role === "teacher";
  const isStudent = user?.role === "student";

  return (
    <div ref={pageRef} style={{ minHeight: "100vh", background: "#f5f5f5", paddingBottom: 40 }}>
      <AccountPageShell>
        {/* 头部用户卡片 */}
        <UserCard user={user} />

        {/* 菜单列表 */}
        <div className="studio-reveal studio-reveal--delay-1" style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* 账号信息组 */}
          <MenuGroup>
            <MenuItem
              icon="account"
              label="基本资料"
              onClick={() => onNavigate("account", { routeOverrides: { accountTab: "profile" } })}
            />
            <Divider />
            <MenuItem
              icon="shield"
              label="账号安全"
              onClick={() => onNavigate("account", { routeOverrides: { accountTab: "security" } })}
            />
          </MenuGroup>

          {(isTeacher || isStudent) && (
            <MenuGroup>
              <MenuItem
                icon="graduation-cap"
                label={isTeacher ? "班级管理" : "我的班级"}
                value={isStudent && !user?.className ? "未加入" : undefined}
                onClick={() => onNavigate("account", { routeOverrides: { accountTab: "class" } })}
              />
              {isStudent && (
                <>
                  <Divider />
                  <MenuItem
                    icon="users"
                    label="家长绑定"
                    onClick={() => onNavigate("account", { routeOverrides: { accountTab: "family" } })}
                  />
                </>
              )}
            </MenuGroup>
          )}

          {isStudent && (
            <PrepExamPicker user={user} onUserUpdate={onUserUpdate} />
          )}

          {isStudent && (
            <MenuGroup>
              <MenuItem
                icon="zap"
                label="我的订阅"
                onClick={() => onNavigate("account", { routeOverrides: { accountTab: "subscription" } })}
              />
              <Divider />
              <MenuItem
                icon="gem"
                label="我的额度"
                onClick={() => onNavigate("quota")}
              />
              <Divider />
              <MenuItem
                icon="star"
                label="我的积分"
                onClick={() => onNavigate("points")}
              />
            </MenuGroup>
          )}

          {/* 退出登录 */}
          <MenuGroup>
            <MenuItem
              icon="logout"
              label="退出登录"
              danger
              onClick={handleLogout}
            />
          </MenuGroup>
        </div>
      </AccountPageShell>
    </div>
  );
}
