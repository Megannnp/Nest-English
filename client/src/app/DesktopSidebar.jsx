import { isNavActive } from "./navigation.js";
import AppIcon from "../components/shared/AppIcon.jsx";

export default function DesktopSidebar({
  sideHover,
  setSideHover,
  navItems,
  activePage,
  setPage,
  setShowAccountMenu,
  showAccountMenu,
  studentPage,
  user,
}) {
  return (
    <aside
      className="sidebar"
      onMouseEnter={() => setSideHover(true)}
      onMouseLeave={(e) => {
        const related = e.relatedTarget;
        if (related && related.closest && related.closest('[data-account-menu]')) return;
        setSideHover(false);
      }}
      style={{
        width: sideHover ? 188 : 58,
        background: "#fff",
        borderRight: "1px solid #e8e0d5",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
        boxShadow: "2px 0 12px rgba(0,0,0,0.05)",
        transition: "width 0.3s ease",
        overflow: "visible",
        zIndex: 10,
      }}
    >
      <div style={{ padding: "18px 0 14px", borderBottom: "1px solid #ece6de", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 62, overflow: "hidden" }}>
        {sideHover ? (
          <div style={{ padding: "0 16px" }}>
            <img src="/logo-full-writing.svg" alt="nest writing" height="28" style={{ display: "block" }} />
          </div>
        ) : (
          <img src="/logo.svg" alt="nest" height="28" style={{ display: "block" }} />
        )}
      </div>

      <nav style={{ flex: 1, padding: "10px 6px", display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
        {navItems.map((item) => {
          const active = isNavActive(item.id, activePage, user?.role);
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              onClick={() => {
                if (item.id === "writing") {
                  studentPage.actions.resetWritingSession?.({ clearDraft: true });
                }
                setPage(item.id);
              }}
              className="app-shell-button app-sidebar-button"
              style={{
                width: "100%",
                padding: sideHover ? "10px 14px" : "10px 0",
                borderRadius: 10,
                border: "none",
                background: active ? "#fdf0d8" : "transparent",
                color: active ? "#8b5e1a" : "#6a5a48",
                display: "flex",
                alignItems: "center",
                justifyContent: sideHover ? "flex-start" : "center",
                gap: sideHover ? 10 : 0,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: active ? 700 : 400,
                borderLeft: active ? "3px solid #c8852a" : "3px solid transparent",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <AppIcon name={item.icon} />
              </span>
              {sideHover && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "10px 6px", borderTop: "1px solid #ece6de" }}>
        {sideHover ? (
          <button
            type="button"
            data-account-trigger="true"
            onClick={() => setShowAccountMenu((o) => !o)}
            style={{ width: "100%", border: 0, textAlign: "left", padding: 10, borderRadius: 10, background: showAccountMenu ? "#fdf0d8" : "#faf8f5", cursor: "pointer", transition: "background 0.15s" }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "#2a1f14" }}>{user.realName || user.name}</div>
            <div style={{ fontSize: 10, color: "#a09080", display: "flex", alignItems: "center", gap: 4 }}>
              <AppIcon name={user.role === "teacher" ? "teacher" : "graduation-cap"} size={12} />
              {user.role === "teacher" ? "Teacher" : "Student"}
              {user.className ? ` · ${user.className}` : ""}
            </div>
          </button>
        ) : (
          <button
            data-account-trigger="true"
            type="button"
            aria-label="打开账号菜单"
            onClick={() => setShowAccountMenu((o) => !o)}
            className="app-shell-button"
            style={{ width: "100%", padding: "10px 0", border: "none", background: "transparent", cursor: "pointer", fontSize: 17 }}
          >
            <AppIcon name="account" />
          </button>
        )}
      </div>
    </aside>
  );
}
