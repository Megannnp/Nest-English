import { buildStudioModuleNavItems } from "../app/moduleNavigation.js";
import { buildSwitchItems } from "../app/productSwitcher.js";
import StudioTopBar from "../components/shared/StudioTopBar.jsx";
import "./listening.css";

export default function ListeningTopBar({
  onLogin,
  onRegister,
  user,
  onNavigate,
  activePage = "listening",
  onAccountClick,
}) {
  const isTeacher = user?.role === "teacher";
  const navItems = buildStudioModuleNavItems("listening", { activePage, onNavigate, isTeacher });

  return (
    <StudioTopBar
      logoSrc="/logo-full-listening.svg"
      logoAlt="nest listening"
      logoLabel="筑巢听读"
      theme="listening"
      user={user}
      onLogin={onLogin}
      onRegister={onRegister}
      onLogoClick={() => onNavigate?.("listening-basics")}
      navItems={navItems}
      onAccountClick={onAccountClick}
      switchTo={buildSwitchItems("筑巢听读", onNavigate)}
    />
  );
}
