import { Suspense, lazy } from "react";

import { guestAuthContextMessage } from "./guestAuthContext.js";
import useBodyScrollLock from "../../hooks/useBodyScrollLock.js";

const AuthPage = lazy(() => import("../../components/AuthPage.jsx"));

export default function GuestAuthModal({
  open,
  isMobile,
  authMode,
  guestAuthState,
  serviceError,
  onClose,
  onLogin,
}) {
  useBodyScrollLock(!!open);
  if (!open) return null;
  const theme = "portal";
  const modalStyle = { boxShadow: "0 28px 84px rgba(0, 0, 0, 0.18)" };
  const closeStyle = { background: "rgba(0,0,0,0.06)", color: "#111" };
  const overlayBackground = "rgba(0, 0, 0, 0.06)";
  const overlayPadding = isMobile ? "16px 12px" : "20px";
  const modalPadding = isMobile ? "44px 18px 24px" : "40px 32px 32px";
  const contextMessage = guestAuthContextMessage(guestAuthState?.target);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        overflowY: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: overlayPadding,
      }}
    >
      <button type="button" aria-label="关闭登录窗口" onClick={onClose} style={{ position: "fixed", inset: 0, border: 0, padding: 0, background: overlayBackground, backdropFilter: "blur(10px) saturate(1.08)", WebkitBackdropFilter: "blur(10px) saturate(1.08)" }} />
      <div style={{
        position: "relative",
        background: "#ffffff",
        border: "1px solid rgba(0, 0, 0, 0.06)",
        borderRadius: isMobile ? 18 : 24,
        width: "100%",
        maxWidth: 440,
        maxHeight: isMobile ? "calc(100vh - 40px)" : "calc(100vh - 32px)",
        overflowY: "auto",
        padding: modalPadding,
        flexShrink: 0,
        ...modalStyle,
      }}>
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 32,
            height: 32,
            borderRadius: "50%",
            border: "none",
            background: closeStyle.background,
            cursor: "pointer",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: closeStyle.color,
            zIndex: 10,
          }}
        >×</button>

        {contextMessage ? (
          <div
            role="note"
            style={{
              marginBottom: 14,
              border: "1px solid rgba(200, 135, 45, 0.22)",
              borderRadius: 12,
              background: "#fff8ee",
              color: "#6f4a15",
              fontSize: 13,
              fontWeight: 700,
              lineHeight: 1.55,
              padding: "10px 12px",
            }}
          >
            {contextMessage}
          </div>
        ) : null}

        <Suspense fallback={<div style={{ minHeight: 240 }} aria-hidden="true" />}>
          <AuthPage
            embedded
            initialMode={guestAuthState?.mode || authMode}
            onLogin={onLogin}
            onBack={null}
            serviceError={serviceError}
            theme={theme}
          />
        </Suspense>
      </div>
    </div>
  );
}
