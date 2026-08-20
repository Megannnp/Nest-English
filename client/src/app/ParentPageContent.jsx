import { useEffect, useMemo, useState } from "react";

import { ParentDashboard } from "./ParentDashboardPanels.jsx";
import { PARENT_COLOR, ParentButton, ParentNotice, ParentSurface } from "./ParentPagePrimitives.jsx";
import { parentAPI } from "../api/index.js";
import AccountPage from "../components/AccountPage.jsx";
import MinePage from "../components/MinePage.jsx";
import PointsPage from "../components/PointsPage.jsx";
import QuotaPage from "../components/QuotaPage.jsx";

function ParentHeader({ user, isMobile, onNavigate }) {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ margin: 0, color: PARENT_COLOR.text, fontSize: isMobile ? 24 : 30, fontWeight: 800, lineHeight: 1.12 }}>家长端</h1>
        <p style={{ margin: "8px 0 0", color: PARENT_COLOR.textSecondary, fontSize: 14, lineHeight: 1.7 }}>
          {user?.realName ? `${user.realName}，` : ""}查看孩子的待办、成长和权益。
        </p>
      </div>
      <ParentButton onClick={() => onNavigate?.("mine")}>账号</ParentButton>
    </header>
  );
}

function ParentHomePage({ user, isMobile = false, onNavigate }) {
  const [overview, setOverview] = useState(null);
  const [studentBindCode, setStudentBindCode] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedChildId, setSelectedChildId] = useState("");
  const [loading, setLoading] = useState(true);
  const [binding, setBinding] = useState(false);
  const [error, setError] = useState("");

  const loadOverview = async () => {
    setLoading(true);
    setError("");
    try {
      setOverview(await parentAPI.overview());
    } catch (err) {
      setError(err?.message || "家长端数据加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const bindChild = async (event) => {
    event.preventDefault();
    const code = studentBindCode.trim();
    if (!code) {
      setError("请输入学生绑定码");
      return;
    }
    setBinding(true);
    setError("");
    try {
      const nextOverview = await parentAPI.bindChild(code);
      setOverview(nextOverview);
      const children = nextOverview?.children || [];
      if (children.length) setSelectedChildId(children[children.length - 1].id);
      setStudentBindCode("");
    } catch (err) {
      setError(err?.message || "绑定失败");
    } finally {
      setBinding(false);
    }
  };

  const children = useMemo(() => overview?.children || [], [overview?.children]);
  const summary = overview?.summary || {};
  const selectedChild = useMemo(() => children.find((child) => child.id === selectedChildId) || children[0] || null, [children, selectedChildId]);

  useEffect(() => {
    if (!selectedChildId && children[0]?.id) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  return (
    <div style={{ minHeight: "calc(100vh - 54px)", background: PARENT_COLOR.page }}>
      <main style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "24px 16px 48px" : "40px 24px 64px", display: "grid", gap: 18 }}>
        <ParentHeader user={user} isMobile={isMobile} onNavigate={onNavigate} />

        <ParentSurface style={{ padding: 16 }}>
          <form onSubmit={bindChild} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input
              aria-label="学生绑定码"
              value={studentBindCode}
              onChange={(event) => setStudentBindCode(event.target.value)}
              placeholder="输入学生绑定码"
              style={{ flex: "1 1 220px", minWidth: 0, border: `1px solid ${PARENT_COLOR.borderStrong}`, borderRadius: 8, padding: "10px 12px", font: "inherit", color: PARENT_COLOR.text, background: PARENT_COLOR.surface }}
            />
            <ParentButton
              type="submit"
              active
              disabled={binding}
            >
              {binding ? "绑定中" : "绑定孩子"}
            </ParentButton>
          </form>
        </ParentSurface>

        {error ? <ParentNotice>{error}</ParentNotice> : null}

        <ParentDashboard
          activeTab={activeTab}
          childrenOverview={children}
          isMobile={isMobile}
          loading={loading}
          selectedChild={selectedChild}
          selectedChildId={selectedChildId}
          setActiveTab={setActiveTab}
          setSelectedChildId={setSelectedChildId}
          summary={summary}
        />
      </main>
    </div>
  );
}

export default function ParentPageContent({ page, user, isMobile, setPage, setUser = () => {}, accountTab = "profile", handleLogout }) {

  if (page === "account") {
    return (
      <AccountPage
        user={user}
        onUpdate={(nextUser) => setUser(nextUser)}
        onBack={() => setPage("parent-home")}
        initialTab={accountTab || "profile"}
        isMobile={isMobile}
        onNavigate={setPage}
      />
    );
  }

  if (page === "mine") {
    return <MinePage user={user} onNavigate={setPage} handleLogout={handleLogout} />;
  }

  if (page === "points") {
    return <PointsPage user={user} onNavigate={setPage} />;
  }

  if (page === "quota") {
    return <QuotaPage user={user} onNavigate={setPage} />;
  }

  return <ParentHomePage user={user} isMobile={isMobile} onNavigate={setPage} />;
}
