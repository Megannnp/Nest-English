/* eslint-disable complexity */
import { DesktopAccountMenu, MobileAccountMenu } from "./AccountMenus.jsx";
import AppPageContent from "./AppPageContent.jsx";
import DesktopSidebar from "./DesktopSidebar.jsx";
import MobileBottomNav from "./MobileBottomNav.jsx";
import { getMobileNavLabels, getNavItems, normalizePage } from "./navigation.js";
import NotificationTicker from "../components/NotificationTicker/NotificationTicker.jsx";
import DailyTasksFloat from "../components/shared/DailyTasksFloat.jsx";
import GlobalTopBar from "../components/shared/GlobalTopBar.jsx";
import PrepExamOnboardingModal from "../components/shared/PrepExamOnboardingModal.jsx";

const FULL_WIDTH_SITE_PAGES = new Set([
  // Admin pages (full-width, own layout)
  "admin",
  // Portal
  "portal",
  "explore",
  "resume",
  "tasks",
  "skill-training",
  "language-foundation",
  // Writing module
  "writing",
  "writing-bank",
  "growth",
  "records",
  "writing-refine-sentence",
  "writing-refine-structure",
  // Grammar module
  "grammar-analyzer",
  "grammar-courses",
  "grammar-practice",
  "grammar-progress",
  "grammar-quiz",
  // Reading module
  "reading-analyzer",
  "reading-practice",
  "reading-paper",
  "reading-courses",
  "reading-progress",
  "speaking-progress",
  "phonetics-camp",
  "phonetics-overview",
  "phonetics-sound",
  "phonetics-syllable",
  "phonetics-sentence",
  "phonetics-discourse",
  "phonetics-progress",
  "vocab-analyzer",
  "vocab-courses",
  "vocab-progress",
  "vocab-quiz",
  "vocab-resources",
  "listening-basics",
  "listening-advanced",
  "listening-practice",
  "listening-progress",
  "camp",
  "camp-course-detail",
  "camp-my-course-detail",
  "camp-redeem",
  "mine",
  "parent-home",
  // Teacher-specific pages (manage own layout internally)
  "teacher-prep",
  "teacher-data",
  "grammar-workbench",
  "reading-workbench",
  "listening-workbench",
  "vocab-workbench",
  "phonetics-workbench",
  "camp-management",
  "question-bank",
  "vocab-content",
  "messages",
  "classes",
  "assignment-create",
  "teacher-writing-detail",
  "teacher-todo",
  "substitute-upload",
  "batch-grading",
]);

const SITE_BACKGROUND_PREFIXES = [
  ["grammar", "#faf8ff"],
  ["reading", "#f2faf8"],
  ["listening", "#fffbed"],
  ["camp", "#fff8ee"],
  ["speaking", "#fff4e8"],
  ["phonetics", "#fdf7f9"],
  ["vocab", "#f4f9fe"],
  ["writing", "#fdf8f2"],
];

const PREP_BACKGROUND_PAGES = new Set(["teacher-prep"]);

function getSiteBackground(activePage) {
  const matchedPrefix = SITE_BACKGROUND_PREFIXES.find(([prefix]) => activePage.startsWith(prefix));
  if (matchedPrefix) return matchedPrefix[1];
  if (PREP_BACKGROUND_PAGES.has(activePage)) return "#fdf8f2";
  return "#fff";
}

function getShellContentStyle({ fullWidthPage, isMobile }) {
  if (fullWidthPage) {
    return { maxWidth: "100%", padding: 0 };
  }

  return {
    maxWidth: isMobile ? "100%" : "900px",
    padding: isMobile ? "24px 14px" : "34px 20px",
  };
}

export default function AuthenticatedAppShell({
  user,
  page,
  setPage,
  setUser,
  isMobile,
  sideHover,
  setSideHover,
  showAccountMenu,
  setShowAccountMenu,
  handleLogout,
  studentPage,
  teacherPage,
  needProfile = false,
}) {
  const navRole = user?.is_admin === 1 ? "admin" : user.role;
  const navItems = getNavItems(navRole);
  const mobileNavLabels = getMobileNavLabels(navRole);
  const userRoleIcon = navRole === "teacher" ? "teacher" : navRole === "admin" ? "workbench" : navRole === "parent" ? "records" : "graduation-cap";
  const activePage = normalizePage(page, user.role, { isAdmin: user?.is_admin === 1 });
  const sitePage = FULL_WIDTH_SITE_PAGES.has(activePage);
  const fullWidthPage = sitePage;
  const showDesktopSidebar = false;
  const siteBackground = getSiteBackground(activePage);
  const showStudentUtilities = user?.role === "student" && user?.is_admin !== 1;
  const shellBottomPadding = isMobile ? "70px" : showStudentUtilities ? "76px" : "0";
  
  return (
    <div className="app-shell" style={{ background: siteBackground }}>
      {showDesktopSidebar && (
        <DesktopSidebar
          sideHover={sideHover}
          setSideHover={setSideHover}
          navItems={navItems}
          activePage={activePage}
          setPage={setPage}
          setShowAccountMenu={setShowAccountMenu}
          showAccountMenu={showAccountMenu}
          studentPage={studentPage}
          user={user}
          userRoleIcon={userRoleIcon}
        />
      )}

      <GlobalTopBar
        user={user}
        activePage={activePage}
        onNavigate={setPage}
        onAccountClick={() => setPage("mine")}
        isMobile={isMobile}
      />

      <main
        className="app-shell-main"
        style={{ paddingBottom: shellBottomPadding, background: siteBackground }}
      >
        <div
          className="app-shell-content"
          style={getShellContentStyle({ fullWidthPage, isMobile })}
        >
          <AppPageContent
            page={activePage}
            user={user}
            isMobile={isMobile}
            sideHover={sideHover}
            setPage={setPage}
            setUser={setUser}
            studentPage={studentPage}
            teacherPage={teacherPage}
            setShowAccountMenu={setShowAccountMenu}
            handleLogout={handleLogout}
          />
        </div>
      </main>

      {isMobile && (
        <MobileBottomNav
          navItems={navItems}
          mobileNavLabels={mobileNavLabels}
          activePage={activePage}
          setPage={setPage}
          setShowAccountMenu={setShowAccountMenu}
          showAccountMenu={showAccountMenu}
          studentPage={studentPage}
          user={user}
          userRoleIcon={userRoleIcon}
        />
      )}

      <MobileAccountMenu
        open={isMobile && showAccountMenu}
        setPage={setPage}
        setShowAccountMenu={setShowAccountMenu}
        handleLogout={handleLogout}
        user={user}
      />

      <DesktopAccountMenu
        open={!isMobile && showAccountMenu}
        setPage={setPage}
        setShowAccountMenu={setShowAccountMenu}
        handleLogout={handleLogout}
        user={user}
      />

      {showStudentUtilities && (
        <>
          <NotificationTicker userId={user.id} isMobile={isMobile} currentPage={activePage} />
          <DailyTasksFloat user={user} onNavigate={setPage} />
        </>
      )}

      {/* 登录后首次进入：选择备考考试（仅在无需先完成资料引导时弹出） */}
      {!needProfile && (
        <PrepExamOnboardingModal
          user={user}
          onUserUpdate={setUser}
        />
      )}
    </div>
  );
}
