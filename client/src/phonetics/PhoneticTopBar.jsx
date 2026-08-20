import { buildStudioModuleNavItems } from "../app/moduleNavigation.js";
import { buildSwitchItems } from "../app/productSwitcher.js";
import StudioTopBar from "../components/shared/StudioTopBar.jsx";
import "./phonetics.css";

export default function PhoneticTopBar({
  onLogin,
  onRegister,
  user,
  onNavigate,
  activePage = "",
  onAccountClick,
}) {
  const isTeacher = user?.role === "teacher";
  const navItems = buildStudioModuleNavItems("phonetics", { activePage, onNavigate, isTeacher });

  return (
    <StudioTopBar
      logoSrc="/logo-full-phonetics.svg"
      logoAlt="nest phonetics"
      logoLabel="筑巢语音"
      theme="phonetics"
      user={user}
      onLogin={onLogin}
      onRegister={onRegister}
      onLogoClick={() => onNavigate?.("phonetics-overview")}
      navItems={navItems}
      onAccountClick={onAccountClick}
      switchTo={buildSwitchItems("筑巢语音", onNavigate)}
    />
  );
}
