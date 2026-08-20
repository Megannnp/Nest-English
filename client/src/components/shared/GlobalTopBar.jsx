/* eslint-disable complexity */
import { useState, useEffect, useRef } from "react";

import {
  MODULE_NAV_CONFIG,
  getActiveModuleConfig,
  getModuleTabs,
  isBaseModule,
  isPrepModule,
} from "../../app/moduleNavigation.js";
import { isNavActive } from "../../app/navigation.js";
import { ADMIN_TABS } from "../admin/adminTabs.js";

import "./GlobalTopBar.css";

const MODULES = MODULE_NAV_CONFIG;

function getActiveModule(activePage) {
  return getActiveModuleConfig(activePage);
}

const STUDENT_PREP_ITEM_ID = "skill-training";
const STUDENT_BASE_ITEM_ID = "language-foundation";

function isPrepPage(activePage) {
  return isPrepModule(getActiveModule(activePage)?.id)
    || isNavActive(STUDENT_PREP_ITEM_ID, activePage, "student");
}

function isBasePage(activePage) {
  return !isPrepPage(activePage)
    && (isBaseModule(getActiveModule(activePage)?.id)
      || isNavActive(STUDENT_BASE_ITEM_ID, activePage, "student"));
}

function getAvatarText(user) {
  return String(user?.realName || user?.name || user?.account || "我")
    .trim()
    .slice(0, 1)
    .toUpperCase();
}

function navigateAdminTab(tab) {
  if (typeof window === "undefined") return;
  window.history.replaceState(null, "", `#tab=${tab}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/* ── Module switcher dropdown ──────────────────────────── */

function ModuleSwitcher({ activeModule, onNavigate, isTeacher }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
      <button
        type="button"
        className="gtb__mod-btn"
        style={{ color: activeModule.accent }}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {activeModule.label}
        <span className="gtb__mod-chevron">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="gtb__mod-dropdown" style={{ width: "min(88px, calc(100vw - 32px))" }}>
          {MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`gtb__mod-item${m.id === activeModule.id ? " gtb__mod-item--active" : ""}`}
              onClick={() => {
                setOpen(false);
                if (m.id !== activeModule.id) {
                  const tabs = getModuleTabs(m.id, { isTeacher });
                  onNavigate(tabs[0]?.page ?? m.homePage);
                }
              }}
            >
              <span className="gtb__mod-dot" style={{ background: m.dot }} />
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── GlobalTopBar ──────────────────────────────────────── */

function DesktopNavRow({ activePage, onNavigate, onAccountClick, isTeacher, isParent, isAdmin, avatarText, hash = "" }) {
  const role = isAdmin ? "admin" : isTeacher ? "teacher" : isParent ? "parent" : "student";
  return (
    <div className="gtb__row1">
      <button
        type="button"
        className="gtb__logo"
        aria-label="返回筑巢英语首页"
        onClick={() => onNavigate(isAdmin ? "admin" : isTeacher ? "workbench" : isParent ? "parent-home" : "skill-training")}
      >
        <img src="/logo-full.svg" alt="nest English" height="30" style={{ display: "block" }} />
        <span className="gtb__logo-zh">筑巢英语</span>
      </button>
      <div className="gtb__vdiv" />
      {isAdmin ? (
        <>
          <button type="button" className={`gtb__link${isNavActive("admin", activePage, role) ? " gtb__link--active" : ""}`} onClick={() => onNavigate("admin")}>平台管理</button>
          <button type="button" className={`gtb__link${isNavActive("camp-management", activePage, role) ? " gtb__link--active" : ""}`} onClick={() => onNavigate("camp-management")}>学习营课程</button>
          <button type="button" className={`gtb__link${activePage === "question-bank" ? " gtb__link--active" : ""}`} onClick={() => onNavigate("question-bank")}>题库管理</button>
          <button type="button" className={`gtb__link${activePage === "admin" && hash.includes("tab=audio") ? " gtb__link--active" : ""}`} onClick={() => { onNavigate("admin"); navigateAdminTab("audio"); }}>语音生成</button>
          <button type="button" className={`gtb__link${activePage === "vocab-content" ? " gtb__link--active" : ""}`} onClick={() => onNavigate("vocab-content")}>词汇内容</button>
          <button type="button" className={`gtb__link${activePage === "messages" ? " gtb__link--active" : ""}`} onClick={() => onNavigate("messages")}>消息中心</button>
        </>
      ) : isTeacher ? (
        <>
          <button type="button" className={`gtb__link${isNavActive("workbench", activePage, role) ? " gtb__link--active" : ""}`} onClick={() => onNavigate("workbench")}>工作台</button>
          <button type="button" className={`gtb__link${isNavActive("teacher-prep", activePage, role) ? " gtb__link--active" : ""}`} onClick={() => onNavigate("teacher-prep")}>备课</button>
          <button type="button" className={`gtb__link${isNavActive("teacher-data", activePage, role) ? " gtb__link--active" : ""}`} onClick={() => onNavigate("teacher-data")}>数据</button>
        </>
      ) : isParent ? (
        <button type="button" className={`gtb__link${isNavActive("parent-home", activePage, role) ? " gtb__link--active" : ""}`} onClick={() => onNavigate("parent-home")}>家长端</button>
      ) : (
        <>
          <button type="button" className={`gtb__link${isPrepPage(activePage) ? " gtb__link--active" : ""}`} onClick={() => onNavigate("skill-training")}>备考</button>
          <button type="button" className={`gtb__link${isBasePage(activePage) ? " gtb__link--active" : ""}`} onClick={() => onNavigate("language-foundation")}>基础</button>
        </>
      )}
      <div className="gtb__spacer" />
      {!isTeacher && !isParent && !isAdmin && (
        <button type="button" className={`gtb__link${isNavActive("growth", activePage, role) ? " gtb__link--active" : ""}`} onClick={() => onNavigate("growth")}>成长</button>
      )}
      <button type="button" className={`gtb__link${isNavActive("explore", activePage, role) ? " gtb__link--active" : ""}`} onClick={() => onNavigate("explore")}>探索</button>
      <button type="button" className="gtb__avatar" onClick={onAccountClick} aria-label="账号菜单">{avatarText}</button>
    </div>
  );
}

const HUB_PAGES = new Set(["tasks", "growth", "portal", "explore", "workbench", "teacher-prep", "teacher-data", "classes",
  "grammar-workbench", "reading-workbench", "listening-workbench",
  "vocab-workbench", "phonetics-workbench", "speaking-workbench", "assignment-create", "teacher-writing-detail", "teacher-todo",
  "substitute-upload", "batch-grading", "camp-management", "account",
  "skill-training", "language-foundation",
  "question-bank", "messages",
  "admin"]);

export function GlobalModuleSubNav({ activePage, onNavigate, isTeacher = false }) {
  const activeModule = getActiveModule(activePage);
  if (!activeModule || HUB_PAGES.has(activePage)) return null;
  const tabs = getModuleTabs(activeModule.id, { isTeacher });
  return (
    <div
      className="gtb__row2"
      style={{ background: activeModule.bg, borderBottomColor: activeModule.border }}
    >
      <ModuleSwitcher activeModule={activeModule} onNavigate={onNavigate} isTeacher={isTeacher} />
      <div className="gtb__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.page}
            type="button"
            className={`gtb__tab${activePage === tab.page ? " gtb__tab--active" : ""}`}
            style={activePage === tab.page ? { color: activeModule.accent } : { color: activeModule.muted }}
            onClick={() => onNavigate(tab.page)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GlobalTopBar({ user, activePage, onNavigate, onAccountClick, isMobile = false }) {
  const isTeacher = user?.role === "teacher";
  const isParent = user?.role === "parent";
  const isAdmin = user?.is_admin === 1;
  const activeModule = getActiveModule(activePage);
  const avatarText = getAvatarText(user);
  const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const tabs = activeModule
    ? getModuleTabs(activeModule.id, { isTeacher })
    : [];
  const isHubPage = HUB_PAGES.has(activePage);

  return (
    <header className="gtb">
      {/* Row 1: hidden on mobile (bottom nav handles global nav) */}
      {!isMobile && <DesktopNavRow activePage={activePage} onNavigate={onNavigate} onAccountClick={onAccountClick} isTeacher={isTeacher} isParent={isParent} isAdmin={isAdmin} avatarText={avatarText} hash={hash} />}

      {/* Row 2: module sub-nav (only in module pages) */}
      {activeModule && !isHubPage && (
        <div
          className="gtb__row2"
          style={{
            background: activeModule.bg,
            borderBottomColor: activeModule.border,
          }}
        >
          <ModuleSwitcher
            activeModule={activeModule}
            onNavigate={onNavigate}
            isTeacher={isTeacher}
          />

          <div className="gtb__tabs">
            {tabs.map((tab) => (
              <button
                key={tab.page}
                type="button"
                className={`gtb__tab${activePage === tab.page ? " gtb__tab--active" : ""}`}
                style={
                  activePage === tab.page
                    ? { color: activeModule.accent }
                    : { color: activeModule.muted }
                }
                onClick={() => onNavigate(tab.page)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Row 2: admin sub-nav (only when on admin page) */}
      {isAdmin && activePage === "admin" && (
        <div className="gtb__row2 gtb__row2--admin">
          <div className="gtb__tabs gtb__tabs--admin">
            {ADMIN_TABS.filter((t) => t.id).map((t) => {
              const isActive = hash.includes(`tab=${t.id}`) || (!hash && t.id === "dashboard");
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`gtb__tab${isActive ? " gtb__tab--active" : ""}`}
                  onClick={() => {
                    const h = `#tab=${t.id}`;
                    if (typeof window !== "undefined") {
                      window.history.replaceState(null, "", h);
                      window.dispatchEvent(new HashChangeEvent("hashchange"));
                    }
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
