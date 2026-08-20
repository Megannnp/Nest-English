import { Suspense, lazy } from "react";

import GuestShellFrame from "./GuestShellFrame.jsx";
import AppLoadingShell from "../../components/shared/AppLoadingShell.jsx";

const PrivacyPolicy = lazy(() => import("../../components/PrivacyPolicy.jsx"));
const UserAgreement = lazy(() => import("../../components/UserAgreement.jsx"));
const RefundPolicy = lazy(() => import("../../components/RefundPolicy.jsx"));
const AuthPage = lazy(() => import("../../components/AuthPage.jsx"));

export default function GuestSpecialScene({
  page,
  isMobile,
  serviceError,
  authMode,
  guestAuthState,
  onNavigate,
  onLogin,
}) {
  if (page === "auth") {
    return (
      <Suspense fallback={<AppLoadingShell />}>
        <AuthPage
          initialMode={guestAuthState?.mode || authMode}
          serviceError={serviceError}
          onLogin={onLogin}
          onBack={() => onNavigate("portal", { replace: true })}
          theme="portal"
        />
      </Suspense>
    );
  }

  if (page === "privacy") {
    return (
      <GuestShellFrame isMobile={isMobile} showBrand onBackHome={() => onNavigate("portal")}>
        <Suspense fallback={<AppLoadingShell />}>
          <PrivacyPolicy />
        </Suspense>
      </GuestShellFrame>
    );
  }

  if (page === "agreement") {
    return (
      <GuestShellFrame isMobile={isMobile} showBrand onBackHome={() => onNavigate("portal")}>
        <Suspense fallback={<AppLoadingShell />}>
          <UserAgreement />
        </Suspense>
      </GuestShellFrame>
    );
  }

  if (page === "refund") {
    return (
      <GuestShellFrame isMobile={isMobile} showBrand onBackHome={() => onNavigate("portal")}>
        <Suspense fallback={<AppLoadingShell />}>
          <RefundPolicy />
        </Suspense>
      </GuestShellFrame>
    );
  }

  return null;
}
