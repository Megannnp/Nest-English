import { createPortal } from "react-dom";

import AppIcon from "../components/shared/AppIcon.jsx";
import useBodyScrollLock from "../hooks/useBodyScrollLock.js";

export function MobileAccountMenu({ open, setPage, setShowAccountMenu, handleLogout, user }) {
  useBodyScrollLock(!!open);
  if (!open) return null;
  const isAdmin = user?.is_admin === 1;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 150 }}>
      <button
        type="button"
        aria-label="关闭账户菜单"
        onClick={() => setShowAccountMenu(false)}
        style={{ position: "fixed", inset: 0, border: 0, padding: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "calc(68px + env(safe-area-inset-bottom, 0px))",
          left: 0,
          right: 0,
          background: "#fff",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
          zIndex: 151,
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          maxHeight: "calc(72vh - env(safe-area-inset-top, 0px))",
          overflowY: "auto",
          animation: "slideUp 0.2s ease",
        }}
      >
        <div style={{ width: 36, height: 4, background: "#e8e0d5", borderRadius: 2, margin: "12px auto 4px" }} />
        <button
          type="button"
          onClick={() => {
            setPage("account", { routeOverrides: { accountTab: "profile" } });
            setShowAccountMenu(false);
          }}
          className="app-menu-button"
          style={{ width: "100%", padding: "14px 20px", border: "none", background: "transparent", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 14, color: "#2a1f14", textAlign: "left" }}
        >
          <AppIcon name="account" size={20} /><span>账号信息</span>
        </button>
        {isAdmin ? (
          <>
            <button
              type="button"
              onClick={() => {
                setPage("admin");
                setShowAccountMenu(false);
              }}
              className="app-menu-button"
              style={{ width: "100%", padding: "14px 20px", border: "none", borderTop: "1px solid #ece6de", background: "transparent", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 14, color: "#2a1f14", textAlign: "left" }}
            >
              <AppIcon name="workbench" size={20} /><span>平台管理</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPage("camp-management");
                setShowAccountMenu(false);
              }}
              className="app-menu-button"
              style={{ width: "100%", padding: "14px 20px", border: "none", borderTop: "1px solid #ece6de", background: "transparent", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 14, color: "#2a1f14", textAlign: "left" }}
            >
              <AppIcon name="book-open" size={20} /><span>学习营课程</span>
            </button>
          </>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          className="app-menu-button"
          style={{ width: "100%", padding: "14px 20px", border: "none", borderTop: "1px solid #ece6de", background: "transparent", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 14, color: "#b02020", textAlign: "left" }}
        >
          <AppIcon name="logout" size={20} /><span>退出登录</span>
        </button>
      </div>
    </div>
  );
}

export function DesktopAccountMenu({ open, setPage, setShowAccountMenu, handleLogout, user }) {
  if (!open) return null;
  const isAdmin = user?.is_admin === 1;

  return createPortal(
    <div
      data-account-menu="true"
      style={{
        position: "fixed",
        top: 72,
        right: 24,
        width: 220,
        background: "#fff",
        borderRadius: 14,
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        border: "1px solid #e8e0d5",
        zIndex: 99999,
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={() => {
          setPage("account", { routeOverrides: { accountTab: "profile" } });
          setShowAccountMenu(false);
        }}
        className="app-menu-button"
        style={{ width: "100%", padding: "14px 20px", border: "none", background: "transparent", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 14, color: "#2a1f14", textAlign: "left" }}
      >
        <AppIcon name="account" size={20} /><span>账号信息</span>
      </button>
      {isAdmin ? (
        <>
          <button
            type="button"
            onClick={() => {
              setPage("admin");
              setShowAccountMenu(false);
            }}
            className="app-menu-button"
            style={{ width: "100%", padding: "14px 20px", border: "none", borderTop: "1px solid #ece6de", background: "transparent", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 14, color: "#2a1f14", textAlign: "left" }}
          >
            <AppIcon name="workbench" size={20} /><span>平台管理</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPage("camp-management");
              setShowAccountMenu(false);
            }}
            className="app-menu-button"
            style={{ width: "100%", padding: "14px 20px", border: "none", borderTop: "1px solid #ece6de", background: "transparent", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 14, color: "#2a1f14", textAlign: "left" }}
          >
            <AppIcon name="book-open" size={20} /><span>学习营课程</span>
          </button>
        </>
      ) : null}
      <button
        type="button"
        onClick={handleLogout}
        className="app-menu-button"
        style={{ width: "100%", padding: "14px 20px", border: "none", borderTop: "1px solid #ece6de", background: "transparent", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 14, color: "#b02020", textAlign: "left" }}
      >
        <AppIcon name="logout" size={20} /><span>退出登录</span>
      </button>
    </div>,
    document.body
  );
}
