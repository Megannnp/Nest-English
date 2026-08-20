import { buildStudioModuleNavItems } from "../app/moduleNavigation.js";
import { buildSwitchItems } from "../app/productSwitcher.js";
import StudioTopBar from "../components/shared/StudioTopBar.jsx";
import "./speaking.css";

export default function SpeakingTopBar({
  onLogin,
  onRegister,
  user,
  onNavigate,
  activePage = "",
  onAccountClick,
}) {
  const isTeacher = user?.role === "teacher";
  const navItems = buildStudioModuleNavItems("speaking", { activePage, onNavigate, isTeacher });

  return (
    <StudioTopBar
      logoSrc="/logo-full.svg"
      logoAlt="nest speaking"
      logoLabel="筑巢口语"
      theme="speaking"
      user={user}
      onLogin={onLogin}
      onRegister={onRegister}
      onLogoClick={() => onNavigate?.("speaking")}
      navItems={navItems}
      onAccountClick={onAccountClick}
      switchTo={buildSwitchItems("筑巢口语", onNavigate)}
    />
  );
}
