import { useEffect, useRef, useState } from "react";

import { GlobalModuleSubNav } from "../components/shared/GlobalTopBar.jsx";
import "../components/shared/GlobalTopBar.css";
import "./portal.css";

const NAV_LINKS = [
  { label: "备考", page: "skill-training", group: "prep" },
  { label: "基础", page: "language-foundation", group: "base" },
];

function isNavGroupActive(group, activePage) {
  if (!activePage) return false;
  if (group === "base") {
    return activePage === "language-foundation" || activePage.startsWith("grammar") || activePage.startsWith("phonetics");
  }
  if (group === "prep") {
    return ["skill-training", "writing", "reading", "listening", "vocab", "speaking"].some((prefix) => (
      activePage === prefix || activePage.startsWith(prefix + "-")
    ));
  }
  return false;
}

function DesktopLinks({ activePage, onNavigate }) {
  return (
    <div className="gtb__links-desktop">
      <div className="gtb__vdiv" />
      {NAV_LINKS.map((link) => (
        <button
          key={link.page}
          type="button"
          className={`gtb__link${isNavGroupActive(link.group, activePage) ? " gtb__link--active" : ""}`}
          onClick={() => onNavigate?.(link.page)}
        >
          {link.label}
        </button>
      ))}
      <div className="gtb__spacer" />
      {/* 成长模块仅在登录后展示；游客不发入口 */}
      <button
        type="button"
        className={`gtb__link${activePage === "explore" ? " gtb__link--active" : ""}`}
        onClick={() => onNavigate?.("explore")}
      >
        探索
      </button>
      <div className="gtb__vdiv" />
    </div>
  );
}

function MobileMenu({ activePage, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [menuOpen]);

  const go = (page) => {
    setMenuOpen(false);
    onNavigate?.(page);
  };

  return (
    <div className="portal-nav__hamburger-wrap" ref={menuRef}>
      <button
        type="button"
        className="portal-nav__hamburger"
        aria-label="打开菜单"
        aria-haspopup="true"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? "✕" : "☰"}
      </button>
      {menuOpen && (
        <div className="portal-nav__mobile-menu" style={{ width: "min(88px, calc(100vw - 32px))" }}>
          <div className="portal-nav__mobile-group">
            {NAV_LINKS.map((link) => (
              <button
                key={link.page}
                type="button"
                className={isNavGroupActive(link.group, activePage) ? "is-active" : ""}
                onClick={() => go(link.page)}
              >
                {link.label}
              </button>
            ))}
          </div>
          <div className="portal-nav__mobile-group">
            {/* 成长模块仅在登录后展示；游客不发入口 */}
            <button type="button" className={activePage === "explore" ? "is-active" : ""} onClick={() => go("explore")}>探索</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuestNavBar({ activePage, onNavigate, onLogin, onRegister }) {
  return (
    <header className="guest-nav-shell">
      <div className="gtb__row1">
        <button type="button" className="gtb__logo portal-guest-logo" aria-label="返回筑巢英语首页" onClick={() => onNavigate?.("portal")}>
          <img src="/logo-full.svg?v=english-close" alt="nest English" height="30" style={{ display: "block" }} />
          <span className="gtb__logo-zh">筑巢英语</span>
        </button>
        <DesktopLinks activePage={activePage} onNavigate={onNavigate} />
        <button type="button" className="portal-nav__login" onClick={onLogin}>登录</button>
        <button type="button" className="portal-nav__register" onClick={onRegister}>免费注册</button>
        <MobileMenu activePage={activePage} onNavigate={onNavigate} />
      </div>
      <GlobalModuleSubNav activePage={activePage} onNavigate={onNavigate} />
    </header>
  );
}
