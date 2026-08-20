import { buildStudioModuleNavItems } from "../app/moduleNavigation.js";
import { buildSwitchItems } from "../app/productSwitcher.js";
import StudioTopBar from "../components/shared/StudioTopBar.jsx";

export default function WritingTopBar({ user, onNavigate, onAccountClick, onLogin, onRegister, activePage }) {
  const isTeacher = user?.role === "teacher";
  const navItems = buildStudioModuleNavItems("writing", { activePage, onNavigate, isTeacher });

  return (
    <StudioTopBar
      logoSrc="/logo-full-writing.svg?v=writing-close"
      logoAlt="nest writing"
      logoLabel="筑巢写作"
      theme="writing"
      user={user}
      onLogin={onLogin}
      onRegister={onRegister}
      onLogoClick={() => onNavigate?.("portal")}
      onAccountClick={onAccountClick}
      switchTo={buildSwitchItems("筑巢写作", onNavigate)}
      navItems={navItems}
    />
  );
}
