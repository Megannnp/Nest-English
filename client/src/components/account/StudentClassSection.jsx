import { useState } from "react";

import { ActionButton, SectionCard, StatusMessage } from "./AccountShared.jsx";
import { accountInputStyle, ACCOUNT_THEME } from "./accountStyles.js";
import { classesAPI } from "../../api/index.js";
import { getRequestStateFromError } from "../../utils/requestState.js";
import { SmallActionButton } from "../shared/UI.jsx";

export default function StudentClassSection({ user, onUpdate, isMobile, compact = false }) {
  const [classCode, setClassCode] = useState("");
  const [classPassword, setClassPassword] = useState("");
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);
  const [foundClass, setFoundClass] = useState(null);
  const [msg, setMsg] = useState(null);

  const currentClassName = user.className || "";

  const formatJoinClassMessage = (result) => {
    if (result?.rosterMatched) {
      return {
        tone: "success",
        title: "已加入班级",
        description: "系统已按学号自动认领老师名单。",
      };
    }
    return {
      tone: "warning",
      title: "已加入班级，但还没匹配到老师名单",
      description: "请联系老师确认学号是否正确，或请老师先导入名单。",
    };
  };

  const formatJoinClassError = (error) => {
    if (String(error?.message || "").includes("该学号已在当前班级绑定其他账号")) {
      return {
        tone: "warning",
        title: "学号已绑定到其他账号",
        description: "请联系老师核对名单，必要时由老师手动处理。",
      };
    }
    return getRequestStateFromError(error, {
      genericTitle: "加入班级失败",
      genericDescription: "这次没能加入班级。请检查班级号、密码和网络状态后再试。",
    });
  };

  const searchClass = async () => {
    if (!classCode.trim()) {
      setMsg({
        tone: "warning",
        title: "请输入班级号",
        description: "输入老师提供的班级号后，再继续搜索。",
        actionLabel: "重新搜索班级",
        onAction: () => setMsg(null),
      });
      return;
    }

    setSearching(true);
    setMsg(null);
    setFoundClass(null);
    try {
      const nextClass = await classesAPI.search(classCode.trim());
      setFoundClass(nextClass);
    } catch (error) {
      setMsg({
        ...getRequestStateFromError(error, {
          genericTitle: "搜索班级失败",
          genericDescription: "这次没能找到班级信息。请检查班级号后再试。",
        }),
        actionLabel: "重新搜索班级",
        onAction: () => {
          setMsg(null);
          void searchClass();
        },
      });
    } finally {
      setSearching(false);
    }
  };

  const joinClass = async () => {
    if (!foundClass) return;
    if (!classPassword.trim()) {
      setMsg({
        tone: "warning",
        title: "请输入班级密码",
        description: "输入老师提供的班级密码后，再继续加入班级。",
        actionLabel: "继续输入密码",
        onAction: () => setMsg(null),
      });
      return;
    }

    setJoining(true);
    setMsg(null);
    try {
      const result = await classesAPI.join(foundClass.id, classPassword.trim());
      if (result?.user) onUpdate(result.user);
      setClassPassword("");
      setFoundClass(null);
      setClassCode("");
      setMsg(formatJoinClassMessage(result));
    } catch (error) {
      const nextState = formatJoinClassError(error);
      setMsg({
        ...nextState,
        actionLabel: "重新搜索班级",
        onAction: () => {
          setMsg(null);
          void searchClass();
        },
      });
    } finally {
      setJoining(false);
    }
  };

  const content = currentClassName ? (
    <div style={{ display: "grid", gap: compact ? 8 : 10 }}>
      <div style={{ fontSize: 14, color: ACCOUNT_THEME.text, fontWeight: 700 }}>班级</div>
      <div style={{ fontSize: 13, color: ACCOUNT_THEME.textSecondary, lineHeight: 1.8 }}>
        当前班级：<span style={{ color: ACCOUNT_THEME.text, fontWeight: 700 }}>{currentClassName}</span>
      </div>
      <div style={{ fontSize: 13, color: ACCOUNT_THEME.textSecondary, lineHeight: 1.8 }}>
        班级号：<span style={{ color: ACCOUNT_THEME.text, fontWeight: 700 }}>{user.classId || "—"}</span>
      </div>
    </div>
  ) : (
    <div style={{ display: "grid", gap: compact ? 10 : 12 }}>
      <div style={{ fontSize: 14, color: ACCOUNT_THEME.text, fontWeight: 700 }}>班级</div>
      <div>
        <label style={{ fontSize: 12, color: ACCOUNT_THEME.textSecondary, display: "block", marginBottom: 6 }}>
          班级号
        </label>
        <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
          <input
            aria-label="班级号"
            value={classCode}
            onChange={(event) => setClassCode(event.target.value)}
            placeholder="输入班级号（如：2024A01）"
            style={{
              ...accountInputStyle({
                flex: 1,
                minHeight: 48,
                borderRadius: 16,
                padding: "10px 16px",
                background: "#faf8f5",
                border: `1px solid ${ACCOUNT_THEME.border}`,
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
              background: "#faf8f5",
            }}
          >
            {searching ? "搜索中..." : "搜索"}
          </SmallActionButton>
        </div>
      </div>

      {foundClass ? (
        <div
          style={{
            background: ACCOUNT_THEME.successLight,
            border: "1px solid #b7e4cf",
            borderRadius: 12,
            padding: "12px 14px",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: ACCOUNT_THEME.success }}>
            ✓ 找到班级：{foundClass.className}
          </div>
          <div style={{ fontSize: 12, color: "#5a8a6a", lineHeight: 1.7 }}>教师：{foundClass.teacherName}</div>
          <div style={{ fontSize: 12, color: "#6b8b74", lineHeight: 1.7 }}>
            班级号：{foundClass.classCode} · 当前 {foundClass.studentCount || 0} 人
          </div>
          <input
            aria-label="班级密码"
            type="password"
            value={classPassword}
            onChange={(event) => setClassPassword(event.target.value)}
            placeholder="输入班级密码"
            style={{ ...accountInputStyle(), minHeight: 44 }}
          />
          <ActionButton onClick={joinClass} disabled={joining} full>
            {joining ? "加入中..." : "加入班级"}
          </ActionButton>
        </div>
      ) : null}

      <StatusMessage state={msg} />
    </div>
  );

  if (compact) return content;
  return <SectionCard isMobile={isMobile}>{content}</SectionCard>;
}
