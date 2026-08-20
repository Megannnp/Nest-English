import { StatusBanner, SurfaceCard } from "./UI.jsx";

export function AppLoadingShell({ label = "Loading...", minHeight = "100vh", fullHeight = true, style }) {
  return (
    <div
      className="app-loading-shell"
      style={{
        minHeight,
        height: fullHeight ? minHeight : "auto",
        ...style,
      }}
    >
      {label}
    </div>
  );
}

export function PageLoadingState({
  label = "Loading...",
  minHeight = 220,
  fullHeight = false,
  style,
}) {
  return (
    <AppLoadingShell
      label={label}
      minHeight={minHeight}
      fullHeight={fullHeight}
      style={style}
    />
  );
}

export function AppStateBanner({ tone = "warning", title, message, style }) {
  return (
    <SurfaceCard style={{ padding: "16px 18px", ...style }}>
      {title ? (
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.1,
            textTransform: "uppercase",
            color: tone === "error" ? "#b54747" : "#b97b20",
            marginBottom: 8,
          }}
        >
          {title}
        </div>
      ) : null}
      <StatusBanner tone={tone}>{message}</StatusBanner>
    </SurfaceCard>
  );
}

export function PageErrorState({
  title = "Service state",
  message,
  tone = "warning",
  style,
}) {
  if (!message) return null;
  return <AppStateBanner title={title} message={message} tone={tone} style={style} />;
}
