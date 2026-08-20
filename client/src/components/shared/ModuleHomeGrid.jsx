// 模块首页统一入口组件 —— 遵循 docs/Product/Interaction Rules.md 的模块首页规范：
//   - 模块标题 + 简介
//   - 功能入口卡片（2×2 格式或按提供的项数自适应）
//   - 「开始学习」主按钮（跳转到推荐功能）
// 不同模块通过 `module` prop 传入主题色令牌，保证视觉与模块配色一致。

const GRID_ITEM_STYLE = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  alignItems: "flex-start",
  textAlign: "left",
  borderRadius: 12,
  background: "#fff",
  padding: "12px 14px",
  cursor: "pointer",
  color: "#241a12",
  minHeight: 84,
};

const PRIMARY_BTN_STYLE = {
  width: "100%",
  border: "none",
  borderRadius: 999,
  color: "#fff",
  padding: "12px 16px",
  fontSize: 14,
  fontWeight: 900,
  cursor: "pointer",
  minHeight: 48,
};

function HomeHeader({ theme, border, title, intro }) {
  return (
    <div
      style={{
        padding: "18px 20px",
        background: `linear-gradient(135deg, ${border} 0%, rgba(255,255,255,0.55) 100%)`,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.08em", color: theme }}>
        {title}
      </div>
      {!!intro && (
        <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.7, color: "#5a4a3a" }}>
          {intro}
        </p>
      )}
    </div>
  );
}

function HomeEntryGrid({ border, entries, onNavigate }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 12,
        padding: "16px 20px 12px",
      }}
    >
      {entries.map((entry) => (
        <button
          key={entry.page || entry.label}
          type="button"
          aria-label={`进入${entry.label}`}
          onClick={() => onNavigate?.(entry.page)}
          style={{ ...GRID_ITEM_STYLE, border: `1px solid ${border}` }}
        >
          <span style={{ fontSize: 15, fontWeight: 900, color: "#241a12" }}>
            {entry.label}
          </span>
          {!!entry.desc && (
            <span style={{ fontSize: 12, lineHeight: 1.55, color: "#7a6b5b" }}>
              {entry.desc}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function HomePrimaryButton({ theme, primaryEntry, primaryLabel, onNavigate }) {
  if (!primaryEntry) return null;
  return (
    <div style={{ padding: "4px 20px 18px" }}>
      <button
        type="button"
        aria-label={primaryLabel}
        onClick={() => onNavigate?.(primaryEntry)}
        style={{ ...PRIMARY_BTN_STYLE, background: theme }}
      >
        {primaryLabel}
      </button>
    </div>
  );
}

function resolveModuleGlyph(module, fallback) {
  if (module?.dot) return module.dot;
  if (module?.accent) return module.accent;
  return fallback;
}

function resolveModuleTitle(title, module) {
  if (title) return title;
  if (module?.label) return `${module.label}模块`;
  return "";
}

export default function ModuleHomeGrid({
  module = {},
  onNavigate,
  title = "",
  intro = "",
  entries = [],
  primaryEntry = "",
  primaryLabel = "开始学习",
}) {
  if (!entries.length) return null;

  const theme = resolveModuleGlyph(module, "#1a7a6e");
  const border = module?.border || `${theme}33`;
  const resolvedTitle = resolveModuleTitle(title, module);

  return (
    <section className="module-home-grid studio-reveal" style={{ marginBottom: 22 }}>
      <div
        style={{
          border: `1px solid ${border}`,
          borderRadius: 16,
          background: "rgba(255, 255, 255, 0.8)",
          overflow: "hidden",
        }}
      >
        <HomeHeader theme={theme} border={border} title={resolvedTitle} intro={intro} />
        <HomeEntryGrid border={border} entries={entries} onNavigate={onNavigate} />
        <HomePrimaryButton
          theme={theme}
          primaryEntry={primaryEntry}
          primaryLabel={primaryLabel}
          onNavigate={onNavigate}
        />
      </div>
    </section>
  );
}