/* eslint-disable complexity */
import AdminAudioGeneratorPanel from './AdminAudioGeneratorPanel.jsx';
import AdminBudgetPanel from './AdminBudgetPanel.jsx';
import AdminDashboardPanel from './AdminDashboardPanel.jsx';
import AdminIntegrationsPanel from './AdminIntegrationsPanel.jsx';
import AdminLogsPanel from './AdminLogsPanel.jsx';
import styles from './AdminPage.module.css';
import AdminPaymentOrdersPanel from './AdminPaymentOrdersPanel.jsx';
import AdminRankingsPanel from './AdminRankingsPanel.jsx';
import AdminSettingsPanel from './AdminSettingsPanel.jsx';
import { ADMIN_TABS } from './adminTabs.js';
import useAdminPageModel from './useAdminPageModel.js';
import UserManagementPanel from './UserManagementPanel.jsx';

const TAB_LABELS = Object.fromEntries(ADMIN_TABS.filter(t => t.id).map(t => [t.id, t.label]));

export default function AdminPage({ user: _user, onLogout: _onLogout, isMobile: _isMobile }) {
  const {
    state: {
      tab,
      dashboard,
      statsLoading,
      includeTestData,
      loading,
    },
    actions: {
      setIncludeTestData,
      loadDashboard,
    },
  } = useAdminPageModel();

  return (
    <div className={styles.adminShell}>
      <div className={styles.adminMain}>
        {/* ── Page header ── */}
        <header className={styles.adminBreadcrumb}>
          <div>
            <span className={styles.breadcrumbPath}>平台管理 / {TAB_LABELS[tab] || tab}</span>
            <h1 className={styles.adminTitle}>
              {tab === 'dashboard' && '数据总览'}
              {tab === 'users' && '用户管理'}
              {tab === 'payments' && '订单管理'}
              {tab === 'audio' && '语音生成'}
              {tab === 'rankings' && '活跃排行'}
              {tab === 'budget' && '预算管理'}
              {tab === 'integrations' && '账号与集成'}
              {tab === 'logs' && '操作日志'}
              {tab === 'settings' && '系统设置'}
            </h1>
          </div>
        </header>

        {/* ── Content ── */}
        {loading ? (
          <div className={styles.loading}>加载中…</div>
        ) : tab === 'users' ? (
          <UserManagementPanel includeTestData={includeTestData} />
        ) : tab === 'payments' ? (
          <AdminPaymentOrdersPanel />
        ) : tab === 'audio' ? (
          <AdminAudioGeneratorPanel />
        ) : tab === 'rankings' ? (
          <AdminRankingsPanel dashboard={dashboard} loading={statsLoading} />
        ) : tab === 'budget' ? (
          <AdminBudgetPanel />
        ) : tab === 'integrations' ? (
          <AdminIntegrationsPanel />
        ) : tab === 'logs' ? (
          <AdminLogsPanel />
        ) : tab === 'settings' ? (
          <AdminSettingsPanel />
        ) : (
          <AdminDashboardPanel
            dashboard={dashboard}
            loading={statsLoading}
            onRefresh={loadDashboard}
            includeTestData={includeTestData}
            onToggleTestData={setIncludeTestData}
          />
        )}
      </div>
    </div>
  );
}
