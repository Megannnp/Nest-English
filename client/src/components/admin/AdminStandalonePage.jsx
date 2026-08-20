import styles from './AdminPage.module.css';

/**
 * Shared shell wrapper for standalone admin pages (题库管理, 消息中心, etc.)
 * Provides the same breadcrumb + title + content layout as AdminPage.
 */
export default function AdminStandalonePage({ title, breadcrumb, children }) {
  return (
    <div className={styles.adminShell}>
      <div className={styles.adminMain}>
        <header className={styles.adminBreadcrumb}>
          <div>
            <span className={styles.breadcrumbPath}>{breadcrumb || `平台管理 / ${title}`}</span>
            <h1 className={styles.adminTitle}>{title}</h1>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
