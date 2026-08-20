import { useEffect, useRef, useState } from "react";

import NavDropdown from "./NavDropdown.jsx";
import { preloadPage } from "../../app/pagePreloaders.js";

function _buildAvatarText(user) {
  return String(user?.realName || user?.name || user?.account || "N")
    .trim().slice(0, 1).toUpperCase();
}

function normalizeSwitchItems(switchTo) {
  if (!switchTo) return [];
  return Array.isArray(switchTo) ? switchTo : [switchTo];
}

function warmRoute(item) {
  const targetPage = item?.preloadPage || item?.id;
  if (targetPage) {
    void preloadPage(targetPage);
  }
}

function groupSwitchItems(items) {
  const map = new Map();
  const order = [];
  for (const item of items) {
    const g = item.group ?? "";
    if (!map.has(g)) { map.set(g, []); order.push(g); }
    map.get(g).push(item);
  }
  return order.map(g => ({ label: g, items: map.get(g) }));
}

function SwitchMenuItem({ item, onClose }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="studio-nav__brand-menu-item"
      onPointerEnter={() => warmRoute(item)}
      onFocus={() => warmRoute(item)}
      onClick={() => { onClose(); item.onClick?.(); }}
    >
      {item.accentColor && (
        <span className="studio-nav__brand-dot" style={{ background: item.accentColor }} />
      )}
      {item.label}
      {item.badge && (
        <span className="studio-nav__brand-badge">{item.badge}</span>
      )}
    </button>
  );
}

function ProductSwitcher({ logoLabel, switchItems, brandOpen, onToggle, onClose }) {
  if (!logoLabel) return null;
  const isGrouped = switchItems.some(item => item.group);
  const groups = isGrouped ? groupSwitchItems(switchItems) : null;

  return (
    <div className="studio-nav__switch-wrap">
      <button
        type="button"
        className="studio-nav__site-zh"
        onClick={onToggle}
        aria-expanded={switchItems.length ? brandOpen : undefined}
        aria-haspopup={switchItems.length ? "menu" : undefined}
        aria-label="切换筑巢产品"
      >
        {logoLabel}
        {switchItems.length > 0 && (
          <span className={`studio-nav__brand-chevron${brandOpen ? " open" : ""}`}>▾</span>
        )}
      </button>
      {switchItems.length > 0 && brandOpen ? (
        <div className="studio-nav__brand-menu" role="menu" style={{ width: "min(88px, calc(100vw - 32px))" }}>
          {isGrouped ? (
            groups.map((group, gi) => (
              <div key={group.label || gi} className="studio-nav__brand-group">
                {group.label && (
                  <div className="studio-nav__brand-group-label">{group.label}</div>
                )}
                {group.items.map(item => (
                  <SwitchMenuItem key={item.label} item={item} onClose={onClose} />
                ))}
              </div>
            ))
          ) : (
            switchItems.map(item => (
              <SwitchMenuItem key={item.label} item={item} onClose={onClose} />
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function DesktopNav({ navItems }) {
  if (!navItems.length) return null;

  return (
    <div className="studio-nav__links" aria-label="nav">
      {navItems.map((item) =>
        item.dropdown ? (
          <NavDropdown key={item.label} label={item.label} active={item.active} items={item.dropdown} />
        ) : (
          <button
            type="button"
            key={item.label}
            onPointerEnter={() => warmRoute(item)}
            onFocus={() => warmRoute(item)}
            onClick={item.onClick}
            className={item.active ? "is-active" : ""}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}

function UserActions({ user, avatarText, onAccountClick, onLogin, onRegister }) {
  if (user) {
    return (
      <button type="button" className="studio-nav__avatar" aria-label="打开账户菜单" data-account-trigger="true" onClick={onAccountClick}>{avatarText}</button>
    );
  }

  return (
    <>
      <button type="button" className="studio-nav__login" onClick={onLogin}>登录</button>
      <button type="button" className="studio-nav__register" onClick={onRegister}>免费注册</button>
    </>
  );
}

function MobileMenu({ navItems, menuOpen, setMenuOpen, menuRef }) {
  if (!navItems.length) return null;

  return (
    <div className="studio-nav__hamburger-wrap" ref={menuRef}>
      <button
        type="button"
        className="studio-nav__hamburger"
        aria-label="打开菜单"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? "✕" : "☰"}
      </button>
      {menuOpen && (
        <div className="studio-nav__mobile-menu" style={{ width: "min(88px, calc(100vw - 32px))" }}>
          {navItems.map((item) =>
            item.dropdown ? (
              item.dropdown.map((sub) => (
                <MobileMenuButton key={sub.label} item={sub} setMenuOpen={setMenuOpen} />
              ))
            ) : (
              <MobileMenuButton key={item.label} item={item} setMenuOpen={setMenuOpen} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function MobileMenuButton({ item, setMenuOpen }) {
  return (
    <button
      type="button"
      className={item.active ? "is-active" : ""}
      onPointerEnter={() => warmRoute(item)}
      onFocus={() => warmRoute(item)}
      onClick={() => {
        item.onClick?.();
        setMenuOpen(false);
      }}
    >
      {item.label}
    </button>
  );
}

export default function StudioTopBar({
  logoSrc, logoAlt = "nest", logoLabel, user, onLogin, onRegister,
  onLogoClick, navItems = [], onAccountClick, switchTo, theme = "grammar",
}) {
  const [brandOpen, setBrandOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const brandRef = useRef(null);
  const menuRef = useRef(null);
  const avatarText = _buildAvatarText(user);

  const switchItems = normalizeSwitchItems(switchTo);

  useEffect(() => {
    if (!brandOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (brandRef.current?.contains(event.target)) return;
      setBrandOpen(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [brandOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [menuOpen]);

  const handleSwitchClick = () => {
    if (!switchItems.length) return;
    setBrandOpen((open) => !open);
  };

  return (
    <>
    <div className="grammar-nav-spacer" aria-hidden="true" />
    <nav className={`grammar-nav studio-nav studio-nav--${theme}`}>
      <div className="studio-nav__brand-wrap" ref={brandRef}>
        <button
          type="button"
          className="studio-nav__brand-home"
          onClick={onLogoClick}
          aria-label={`${logoAlt} 首页`}
        >
          <img src={logoSrc} alt={logoAlt} height="36" />
        </button>
        <ProductSwitcher
          logoLabel={logoLabel}
          switchItems={switchItems}
          brandOpen={brandOpen}
          onToggle={handleSwitchClick}
          onClose={() => setBrandOpen(false)}
        />
      </div>

      <DesktopNav navItems={navItems} />

      <div className="studio-nav__actions">
        <UserActions user={user} avatarText={avatarText} onAccountClick={onAccountClick} onLogin={onLogin} onRegister={onRegister} />
        <MobileMenu navItems={navItems} menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuRef={menuRef} />
      </div>
    </nav>
    </>
  );
}
