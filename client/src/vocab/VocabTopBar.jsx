import { buildStudioModuleNavItems } from "../app/moduleNavigation.js";
import { buildSwitchItems } from "../app/productSwitcher.js";
import StudioTopBar from "../components/shared/StudioTopBar.jsx";
import "./vocab.css";

export default function VocabTopBar({
  onLogin,
  onRegister,
  user,
  onNavigate,
  activePage = "",
  onAccountClick,
}) {
  const isTeacher = user?.role === "teacher";
  const navItems = buildStudioModuleNavItems("vocab", { activePage, onNavigate, isTeacher });

  return (
    <StudioTopBar
      logoSrc="/logo-full-vocab.svg"
      logoAlt="nest vocab"
      logoLabel="筑巢词汇"
      theme="vocab"
      user={user}
      onLogin={onLogin}
      onRegister={onRegister}
      onLogoClick={() => onNavigate?.("vocab-analyzer")}
      onAccountClick={onAccountClick}
      navItems={navItems}
      switchTo={buildSwitchItems("筑巢词汇", onNavigate)}
    />
  );
}
