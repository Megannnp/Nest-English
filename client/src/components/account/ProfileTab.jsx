import { SectionCard } from "./AccountShared.jsx";
import { ACCOUNT_THEME } from "./accountStyles.js";
import StudentClassSection from "./StudentClassSection.jsx";
import { getUserRoleLabel } from "../../app/roleLabels.js";

export default function ProfileTab({ user, onUpdate, isMobile }) {
  const infoRowStyle = {
    fontSize: 13,
    color: ACCOUNT_THEME.textSecondary,
    lineHeight: 1.8,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionCard isMobile={isMobile}>
        <div style={{ display: "grid", gap: isMobile ? 10 : 12 }}>
          <div style={infoRowStyle}>
            ID：<span style={{ color: ACCOUNT_THEME.text, fontWeight: 700 }}>{user.accountCode || ""}</span>
          </div>
          <div style={infoRowStyle}>
            姓名：<span style={{ color: ACCOUNT_THEME.text, fontWeight: 700 }}>{user.realName || user.name || ""}</span>
          </div>
          <div style={infoRowStyle}>
            身份：
            <span style={{ color: ACCOUNT_THEME.text, fontWeight: 700 }}>
              {getUserRoleLabel(user)}
            </span>
          </div>

          {user.role === "student" ? (
            <>
              <div style={{ height: 1, background: ACCOUNT_THEME.border, margin: isMobile ? "2px 0" : "4px 0" }} />
              <StudentClassSection user={user} onUpdate={onUpdate} isMobile={isMobile} compact />
            </>
          ) : null}

          <div style={{ fontSize: 12, color: ACCOUNT_THEME.textMuted, paddingTop: 4, lineHeight: 1.7 }}>
            如确需更正，请联系管理员人员处理。
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
