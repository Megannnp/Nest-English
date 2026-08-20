import { useState, useRef, useEffect } from "react";

import AppIcon from "./AppIcon.jsx";
import { preloadPage } from "../../app/pagePreloaders.js";

export default function NavDropdown({ label, active = false, items = [], className = "", ariaLabel, iconOnly = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", onOutside);  // mousedown 改成 click
    return () => document.removeEventListener("click", onOutside);
  }, []);

  const warmRoute = (item) => {
    const targetPage = item?.preloadPage || item?.id;
    if (targetPage) {
      void preloadPage(targetPage);
    }
  };

  return (
    <div className={`nav-dropdown${className ? ` ${className}` : ""}`} ref={ref}>
      <button
        type="button"
        className={"nav-dropdown__trigger" + (active ? " is-active" : "") + (iconOnly ? " nav-dropdown__trigger--icon" : "")}
        onClick={() => setOpen((v) => !v)}
        onPointerEnter={() => items.forEach(warmRoute)}
        onFocus={() => items.forEach(warmRoute)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={ariaLabel || label}
      >
        {label ? <span>{label}</span> : null}
        <span
          className={"nav-dropdown__arrow" + (open ? " open" : "")}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="nav-dropdown__menu" role="menu">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={"nav-dropdown__item" + (item.active ? " is-active" : "")}
              onPointerEnter={() => warmRoute(item)}
              onFocus={() => warmRoute(item)}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                if (typeof item.onClick === 'function') {
                  item.onClick();
                }
              }}
            >
              {item.icon && (
                <span className="nav-dropdown__item-icon" aria-hidden="true">
                  <AppIcon name={item.icon} size={15} />
                </span>
              )}
              <span className="nav-dropdown__item-text">
                <strong>{item.label}</strong>
                {item.desc && <small>{item.desc}</small>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
