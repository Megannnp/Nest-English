import { buildStudioModuleNavItems } from "../app/moduleNavigation.js";
import { buildSwitchItems } from "../app/productSwitcher.js";
import StudioTopBar from "../components/shared/StudioTopBar.jsx";
import "./reading.css";

export default function ReadingTopBar({
  onLogin,
  onRegister,
  user,
  onNavigate,
  activePage = "",
  onAccountClick,
}) {
  const isTeacher = user?.role === "teacher";
  const navItems = buildStudioModuleNavItems("reading", { activePage, onNavigate, isTeacher });

  return (
    <StudioTopBar
      logoSrc="/logo-full-reading.svg"
      logoAlt="nest reading"
      logoLabel="筑巢阅读"
      theme="reading"
      user={user}
      onLogin={onLogin}
      onRegister={onRegister}
      onLogoClick={() => onNavigate?.("reading-analyzer")}
      navItems={navItems}
      onAccountClick={onAccountClick}
      switchTo={buildSwitchItems("筑巢阅读", onNavigate)}
    />
  );
}
