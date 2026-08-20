export default function AppLoadingShell({ minHeight = "100vh", label = "正在加载" }) {
  return (
    <div className="app-loading-shell" style={{ minHeight }} role="status" aria-live="polite">
      <span className="app-loading-shell__spinner" aria-hidden="true" />
      <span className="app-loading-shell__label">{label}</span>
    </div>
  );
}
