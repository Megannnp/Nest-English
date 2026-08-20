import { isNavActive } from "./navigation.js";
import AppIcon from "../components/shared/AppIcon.jsx";

export default function MobileBottomNav({
  navItems,
  mobileNavLabels,
  activePage,
  setPage,
  setShowAccountMenu,
  _showAccountMenu,
  studentPage,
  user,
}) {
  const shouldScroll = navItems.length > 5;
  const btnStyle = (active) => ({
    flex: shouldScroll ? "0 0 58px" : 1,
    minWidth: shouldScroll ? 58 : 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    color: active ? "#1a1a1a" : "#8a7d6e",
    borderTop: active ? "2px solid #1a1a1a" : "2px solid transparent",
  });

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "#fff",
        borderTop: "1px solid #e5e5e5",
        display: "flex",
        alignItems: "stretch",
        overflowX: shouldScroll ? "auto" : "visible",
        overflowY: "hidden",
        height: "calc(60px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
      }}
    >
      {navItems.map((item) => {
        const active = isNavActive(item.id, activePage, user?.role);
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            aria-label={mobileNavLabels[item.id] || item.label}
            onClick={() => {
              if (item.id === "writing") {
                studentPage.actions.resetWritingSession?.({ clearDraft: true });
              }
              setPage(item.id);
              setShowAccountMenu(false);
            }}
            style={btnStyle(active)}
          >
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <AppIcon name={item.icon} size={20} />
            </span>
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>
              {mobileNavLabels[item.id] || item.label}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        aria-label="我的"
        onClick={() => {
          setShowAccountMenu(false);
          setPage("mine");
        }}
        style={btnStyle(activePage === "mine")}
      >
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <AppIcon name="account" size={20} />
        </span>
        <span style={{ fontSize: 10, fontWeight: activePage === "mine" ? 700 : 400 }}>我的</span>
      </button>
    </nav>
  );
}
