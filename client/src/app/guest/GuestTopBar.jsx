import StudioTopBar from "../../components/shared/StudioTopBar.jsx";
import { buildSwitchItems } from "../productSwitcher.js";

export default function GuestTopBar({ onLogin, onRegister, onNavigate, activePage }) {
  const refineActive = activePage === "writing-refine-sentence" || activePage === "writing-refine-structure";
  return (
    <div className="guest-top-bar">
      <StudioTopBar
        logoSrc="/logo-full-writing.svg?v=writing-close"
        logoAlt="nest writing"
        logoLabel="筑巢写作"
        theme="writing"
        onLogin={onLogin}
        onRegister={onRegister}
        onLogoClick={() => onNavigate?.("portal")}
        switchTo={buildSwitchItems("筑巢写作", onNavigate)}
        navItems={[
          { label: "写作批改", active: activePage === "writing", onClick: () => onNavigate?.("writing") },
          {
            label: "写作精炼",
            active: refineActive,
            dropdown: [
              { id: "writing-refine-sentence", icon: "pencil", label: "句子练习", desc: "AI 引导扩充句子，提升表达", active: activePage === "writing-refine-sentence", onClick: () => onNavigate?.("writing-refine-sentence") },
              { id: "writing-refine-structure", icon: "layers", label: "写作建构", desc: "分文体讲解写作框架", active: activePage === "writing-refine-structure", onClick: () => onNavigate?.("writing-refine-structure") },
            ],
          },
          { label: "写作实战", active: activePage === "writing-bank", onClick: () => onNavigate?.("writing-bank") },
          { label: "写作成长", active: activePage === "records", onClick: () => onNavigate?.("records") },
        ]}
      />
    </div>
  );
}
