import { buildStudioModuleNavItems } from "../app/moduleNavigation.js";
import { buildSwitchItems } from "../app/productSwitcher.js";
import StudioTopBar from "../components/shared/StudioTopBar.jsx";
import "./grammar.css";

export default function GrammarTopBar({
  onLogin,
  onRegister,
  user,
  onNavigate,
  activePage = "",
  onAccountClick,
}) {
  const isTeacher = user?.role === "teacher";
  const navItems = buildStudioModuleNavItems("grammar", { activePage, onNavigate, isTeacher });

  return (
    <StudioTopBar
      logoSrc="/logo-full-grammar.svg?v=grammar-close"
      logoAlt="nest grammar"
      logoLabel="筑巢语法"
      theme="grammar"
      user={user}
      onLogin={onLogin}
      onRegister={onRegister}
      onLogoClick={() => onNavigate?.("grammar-analyzer")}
      navItems={navItems}
      onAccountClick={onAccountClick}
      switchTo={buildSwitchItems("筑巢语法", onNavigate)}
    />
  );
}
