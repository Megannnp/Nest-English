import { useState, useRef, useEffect } from "react";

import { GRADES, COLORS, SURFACE_SPACING } from "../../constants/index.jsx";
import { THEME, heroGradient } from "../../styles/theme.js";

const UI_THEME = {
  fontFamily: THEME.typography.sans,
  text: THEME.color.text,
  textSecondary: THEME.color.textSecondary,
  textMuted: THEME.color.textMuted,
  line: "rgba(95, 71, 39, 0.12)",
  lineStrong: THEME.color.borderStrong,
  paper: THEME.color.bgElevated,
  panel: "rgba(255,255,255,0.9)",
  panelAlt: THEME.color.bgMuted,
  primary: THEME.color.primary,
  primaryDark: THEME.color.primaryStrong,
  primarySoft: THEME.color.primarySoft,
  primaryGradient: THEME.color.primaryGradient,
  primaryMuted: THEME.color.primaryMuted,
  primaryDeep: THEME.color.primaryDeep,
  shadow: THEME.shadow.medium,
  shadowStrong: THEME.shadow.strong,
  success: THEME.color.success,
  successSoft: THEME.color.successSoft,
  warning: THEME.color.warning,
  warningSoft: THEME.color.warningSoft,
  error: THEME.color.error,
  errorSoft: THEME.color.errorSoft,
};

export function GradeBadge({ grade, size = "sm" }) {
  const g = GRADES[grade] || GRADES["中"];
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: size === "lg" ? "6px 20px" : "2px 10px",
      borderRadius: 20,
      fontSize: size === "lg" ? 18 : 12,
      fontWeight: 700,
      color: g.color,
      background: g.bg,
      border: `1.5px solid ${g.border}`,
      letterSpacing: size === "lg" ? 2 : 1,
    }}>{grade}</span>
  );
}

export function BackHomeButton({ onClick, isMobile = false, label = "返回首页", style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: UI_THEME.fontFamily,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        height: isMobile ? 38 : 42,
        minWidth: isMobile ? 104 : 116,
        padding: isMobile ? "0 12px" : "0 16px",
        borderRadius: 999,
        border: `1px solid ${UI_THEME.lineStrong}`,
        background: "rgba(255,255,255,0.88)",
        color: UI_THEME.primaryDark,
        fontSize: isMobile ? 12 : 13,
        fontWeight: 700,
        cursor: "pointer",
        boxShadow: "0 10px 24px rgba(64, 46, 23, 0.06)",
        backdropFilter: "blur(10px)",
        ...style,
      }}
    >
      <span style={{ fontSize: isMobile ? 14 : 15, lineHeight: 1 }}>←</span>
      <span>{label}</span>
    </button>
  );
}

export function TagSelector({ label, labelZh, tags, setTags, selected, setSelected, single = false }) {
  const [val, setVal] = useState("");
  const [show, setShow] = useState(false);
  const toggle = (t) =>
    single ? setSelected(selected === t ? "" : t)
      : setSelected(selected.includes(t) ? selected.filter(x => x !== t) : [...selected, t]);

  const add = () => {
    const v = val.trim();
    if (v && !tags.includes(v)) {
      setTags([...tags, v]);
      if (single) setSelected(v);
      else setSelected([...selected, v]);
    }
    setVal("");
    setShow(false);
  };

  const sel = (t) => single ? selected === t : selected.includes(t);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: "#7c5c2e", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
        {labelZh && <span style={{ fontSize: 11, color: "#a09080" }}>{labelZh}</span>}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
        {tags.map(t => (
          <button key={t} type="button" onClick={() => toggle(t)} style={{
            padding: "4px 13px",
            borderRadius: 20,
            fontSize: 13,
            border: sel(t) ? `1.5px solid ${UI_THEME.primary}` : "1px solid #d8cfc4",
            background: sel(t) ? "#fdf0d8" : "#faf8f5",
            color: sel(t) ? UI_THEME.primaryDark : "#8a7d6e",
            cursor: "pointer"
          }}>{t}</button>
        ))}

        {show
          ? <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <input
              autoFocus
              aria-label="添加标签"
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") add();
                if (e.key === "Escape") setShow(false);
              }}
              placeholder="Enter后添加"
              style={{
                background: "#faf8f5",
                border: `1px solid ${UI_THEME.primary}`,
                borderRadius: 20,
                padding: "4px 11px",
                color: "#3a2a18",
                fontSize: 13,
                outline: "none",
                width: 110
              }}
            />
            <button type="button" onClick={add} style={{
              background: "#fdf0d8",
              border: `1px solid ${UI_THEME.primary}`,
              borderRadius: 20,
              color: UI_THEME.primaryDark,
              padding: "4px 9px",
              fontSize: 12,
              cursor: "pointer"
            }}>✓</button>
            <button type="button" onClick={() => setShow(false)} style={{
              background: "transparent",
              border: "none",
              color: "#a09080",
              fontSize: 14,
              cursor: "pointer"
            }}>✕</button>
          </div>
          : <button type="button" onClick={() => setShow(true)} style={{
            padding: "4px 11px",
            borderRadius: 20,
            fontSize: 12,
            border: "1px dashed #c8a87a",
            background: "transparent",
            color: "#a09080",
            cursor: "pointer"
          }}>+ 自定义</button>
        }
      </div>
    </div>
  );
}

export function AnnotationCanvas({ image, text, onSave, initialDrawing }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [startPos, setStartPos] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const restoreDrawing = () => {
      if (initialDrawing) {
        const overlay = new Image();
        overlay.onload = () => ctx.drawImage(overlay, 0, 0);
        overlay.src = initialDrawing;
      }
    };
    if (image) {
      const img = new Image();
      img.onload = () => {
        const maxW = 400, scale = maxW / img.width;
        canvas.width = maxW; canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, maxW, canvas.height);
        restoreDrawing();
      };
      img.src = `data:${image.mediaType};base64,${image.base64}`;
    } else if (text) {
      canvas.width = 400; canvas.height = 300;
      ctx.fillStyle = "#faf8f5"; ctx.fillRect(0, 0, 400, 300);
      ctx.font = "14px Georgia"; ctx.fillStyle = "#2a1f14";
      text.split("\n").slice(0, 10).forEach((line, i) => ctx.fillText(line, 20, 30 + i * 20));
      restoreDrawing();
    }
  }, [image, text, initialDrawing]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX ?? e.touches?.[0]?.clientX) - rect.left,
      y: (e.clientY ?? e.touches?.[0]?.clientY) - rect.top
    };
  };

  const startDraw = (e) => {
    setIsDrawing(true);
    const pos = getPos(e);
    setStartPos(pos);
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (tool === "pen") {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    if (tool === "pen") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDraw = (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    if (tool === "line" && startPos) {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "wave" && startPos) {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      const steps = Math.hypot(pos.x - startPos.x, pos.y - startPos.y) / 5;
      for (let i = 0; i < steps; i++)
        ctx.lineTo(
          startPos.x + (pos.x - startPos.x) * (i / steps),
          startPos.y + (pos.y - startPos.y) * (i / steps) + Math.sin(i * .5) * 3
        );
      ctx.stroke();
    } else if (tool === "rect" && startPos) {
      ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
    }
    setIsDrawing(false);
    setStartPos(null);
    if (onSave) onSave(canvasRef.current.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (image) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = `data:${image.mediaType};base64,${image.base64}`;
    } else if (text) {
      ctx.fillStyle = "#faf8f5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = "14px Georgia";
      ctx.fillStyle = "#2a1f14";
      text.split("\n").slice(0, 10).forEach((line, i) => ctx.fillText(line, 20, 30 + i * 20));
    }
    if (onSave) onSave(null);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {[["pen", "画笔"], ["line", "直线"], ["wave", "波浪"], ["rect", "方框"]].map(([t, label]) => (
          <button key={t} type="button" onClick={() => setTool(t)} style={{
            padding: "4px 12px",
            borderRadius: 20,
            fontSize: 12,
            border: tool === t ? `2px solid ${UI_THEME.primary}` : "1px solid #d8cfc4",
            background: tool === t ? "#fdf0d8" : "#fff",
            cursor: "pointer"
          }}>{label}</button>
        ))}
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {COLORS.map(c => (
            <button key={c} type="button" aria-label={`选色 ${c}`} onClick={() => setColor(c)} style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: c,
              border: color === c ? "2px solid #2a1f14" : "1px solid #d8cfc4",
              cursor: "pointer"
            }} />
          ))}
        </div>
        <button type="button" onClick={clearCanvas} style={{
          padding: "4px 12px",
          background: "#fdf0ef",
          border: "1px solid #f0b0a8",
          borderRadius: 20,
          color: "#b02020",
          fontSize: 12,
          cursor: "pointer"
        }}>清空标注</button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
        style={{
          border: "1px solid #d8cfc4",
          borderRadius: 8,
          cursor: "crosshair",
          width: "100%",
          maxWidth: 400
        }}
      />
    </div>
  );
}

export function SecLbl({ children, style }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      color: UI_THEME.primary,
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 6,
      ...style,
    }}>
      {children}
    </div>
  );
}

export function SurfaceCard({ children, style, className }) {
  return (
    <div
      className={className}
      style={{
        background: "linear-gradient(180deg, rgba(255,253,249,0.98) 0%, rgba(255,255,255,0.96) 100%)",
        border: `1px solid ${UI_THEME.line}`,
        borderRadius: 28,
        boxShadow: UI_THEME.shadow,
        backdropFilter: "blur(18px)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SurfaceHeader({ icon, title, badge, action, isMobile = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: isMobile ? "18px 16px 0" : "20px 22px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {icon ? <span style={{ fontSize: 16 }}>{icon}</span> : null}
        <span style={{ fontFamily: UI_THEME.fontFamily, fontSize: isMobile ? 16 : 19, fontWeight: 800, color: UI_THEME.text, minWidth: 0, letterSpacing: "-0.03em" }}>{title}</span>
        {badge ? (
          <span style={{ fontFamily: UI_THEME.fontFamily, fontSize: 11, padding: "4px 10px", borderRadius: 999, background: UI_THEME.primarySoft, color: UI_THEME.primaryDark, fontWeight: 700 }}>
            {badge}
          </span>
        ) : null}
      </div>
      {action || null}
    </div>
  );
}

export function StatusBanner({ tone = "neutral", children, style }) {
  const tones = {
    neutral: { color: UI_THEME.textSecondary, background: UI_THEME.panelAlt, border: "rgba(95, 71, 39, 0.08)" },
    success: { color: UI_THEME.success, background: UI_THEME.successSoft, border: "rgba(44, 157, 105, 0.18)" },
    warning: { color: UI_THEME.warning, background: UI_THEME.warningSoft, border: "rgba(183, 106, 16, 0.18)" },
    error: { color: UI_THEME.error, background: UI_THEME.errorSoft, border: "rgba(181, 71, 71, 0.18)" },
  };
  const toneStyle = tones[tone] || tones.neutral;
  return (
    <div
      style={{
        fontSize: 12,
        lineHeight: 1.75,
        fontFamily: UI_THEME.fontFamily,
        color: toneStyle.color,
        background: toneStyle.background,
        border: `1px solid ${toneStyle.border}`,
        borderRadius: 18,
        padding: "12px 15px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SmallActionButton({ children, tone = "subtle", disabled = false, style, "aria-label": ariaLabel, ...props }) {
  const tones = {
    subtle: {
      background: "rgba(255,255,255,0.92)",
      color: UI_THEME.primaryDark,
      border: `1px solid ${UI_THEME.line}`,
    },
    primary: {
      background: UI_THEME.primaryGradient,
      color: "#fff",
      border: "1px solid rgba(95,61,24,0.88)",
    },
    soft: {
      background: UI_THEME.primaryMuted,
      color: UI_THEME.primaryDeep,
      border: "1px solid rgba(138,90,31,0.22)",
    },
  };
  const toneStyle = tones[tone] || tones.subtle;
  return (
    <button
      type="button"
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
      disabled={disabled}
      style={{
        fontFamily: UI_THEME.fontFamily,
        padding: "9px 15px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.7 : 1,
        boxShadow: tone === "primary" ? "0 14px 28px rgba(198, 127, 35, 0.22)" : "0 8px 18px rgba(64, 46, 23, 0.04)",
        ...toneStyle,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function ActionPanel({ children, isMobile = false, style }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        flexWrap: "wrap",
        paddingTop: isMobile ? 8 : 10,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function PageHeader({ titleZh, subtitle, isMobile, children, actions, onBack, backLabel = "返回", style }) {
  return (
    <div style={{
      marginBottom: isMobile ? SURFACE_SPACING.headerToFirstSurfaceMobile : SURFACE_SPACING.headerToFirstSurface,
      minHeight: isMobile ? 54 : 64,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: isMobile ? 10 : 14,
      ...style,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: isMobile ? 54 : 64 }}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            style={{
              alignSelf: "flex-start",
              border: "none",
              background: "transparent",
              padding: 0,
              color: UI_THEME.textMuted,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 12,
              fontFamily: UI_THEME.fontFamily,
            }}
          >
            ← {backLabel}
          </button>
        ) : null}
        <h2 style={{
          fontSize: isMobile ? 24 : 30,
          fontWeight: 800,
          color: "#1a1a1a",
          margin: '0 0 6px',
          fontFamily: UI_THEME.fontFamily,
          letterSpacing: '-0.5px',
          lineHeight: 1.08,
        }}>
          {titleZh}
        </h2>
        {subtitle && (
          <p style={{ fontFamily: UI_THEME.fontFamily, fontSize: 14, color: "#888", margin: 0, lineHeight: 1.7, maxWidth: 760 }}>
            {subtitle}
          </p>
        )}
      </div>
      {(actions || children) ? (
        <div style={{ minHeight: isMobile ? 54 : 64, display: 'flex', alignItems: 'center' }}>
          {actions || children}
        </div>
      ) : null}
    </div>
  );
}

function _heroInnerStyles(sv, mobile) {
  return {
    borderRadius: sv ? (mobile ? 22 : 28) : 22,
    padding: sv ? (mobile ? "18px 16px" : "26px 22px") : (mobile ? "18px 16px" : "22px 20px"),
    minHeight: sv && !mobile ? 210 : "auto",
  };
}

function _heroTextStyles(sv, mobile) {
  return {
    eyebrowFontSize: sv ? (mobile ? 11 : 16) : 12,
    eyebrowLetterSpacing: sv ? 2.8 : 1.2,
    eyebrowMarginBottom: sv ? 16 : 8,
    titleFontSize: sv ? (mobile ? 40 : 58) : (mobile ? 24 : 32),
    titleLineHeight: sv ? 1.04 : 1.12,
    titleLetterSpacing: sv ? "-0.06em" : "-0.04em",
  };
}

function _heroGridStyles(sv, mobile) {
  return {
    gridTemplateColumns: mobile ? "1fr" : sv ? "minmax(0, 1.35fr) minmax(320px, 0.65fr)" : "minmax(0, 1.2fr) minmax(240px, 0.8fr)",
    gap: sv ? 22 : 16,
    sideAlignContent: sv && !mobile ? "start" : "stretch",
    sidePaddingTop: sv && !mobile ? 26 : 0,
  };
}

export function HeroPanel({ eyebrow, title, description, sideContent, isMobile, style, variant }) {
  const sv = variant === "secondary-page";
  const inner = _heroInnerStyles(sv, isMobile);
  const text = _heroTextStyles(sv, isMobile);
  const grid = _heroGridStyles(sv, isMobile);
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: isMobile ? 24 : 32,
        padding: isMobile ? "22px 18px" : "28px 28px 26px",
        background: heroGradient,
        border: "1px solid rgba(200, 133, 42, 0.12)",
        boxShadow: UI_THEME.shadowStrong,
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: isMobile ? 180 : 260,
          height: isMobile ? 180 : 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(232,168,64,0.22) 0%, rgba(232,168,64,0) 72%)",
          top: -60,
          right: -40,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: isMobile ? 140 : 220,
          height: isMobile ? 140 : 220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(91,166,120,0.16) 0%, rgba(91,166,120,0) 72%)",
          bottom: -70,
          left: -50,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: grid.gridTemplateColumns,
          gap: grid.gap,
          alignItems: "stretch",
          position: "relative",
        }}
      >
        <div
          style={{
            borderRadius: inner.borderRadius,
            padding: inner.padding,
            background: "rgba(255,255,255,0.68)",
            border: `1px solid ${UI_THEME.line}`,
            backdropFilter: "blur(10px)",
            minHeight: inner.minHeight,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {eyebrow ? (
            <div style={{ fontFamily: UI_THEME.fontFamily, fontSize: text.eyebrowFontSize, fontWeight: 800, letterSpacing: text.eyebrowLetterSpacing, color: "#9b6a1d", textTransform: "uppercase", marginBottom: text.eyebrowMarginBottom }}>
              {eyebrow}
            </div>
          ) : null}
          <div style={{ fontFamily: UI_THEME.fontFamily, fontSize: text.titleFontSize, fontWeight: 800, color: UI_THEME.text, lineHeight: text.titleLineHeight, maxWidth: 620, letterSpacing: text.titleLetterSpacing }}>
            {title}
          </div>
          {description ? (
            <div style={{ fontFamily: UI_THEME.fontFamily, marginTop: 10, fontSize: 14, color: UI_THEME.textSecondary, lineHeight: 1.9, maxWidth: 620 }}>
              {description}
            </div>
          ) : null}
        </div>
        {sideContent ? (
          <div
            style={{
              display: "grid",
              gap: 12,
              alignContent: grid.sideAlignContent,
              paddingTop: grid.sidePaddingTop,
            }}
          >
            {sideContent}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LargePageHeader({ eyebrow, title, action = null, isMobile = false, style }) {
  return (
    <SurfaceCard
      style={{
        borderRadius: isMobile ? 26 : 34,
        padding: isMobile ? "18px 16px" : "22px 26px",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          flexDirection: isMobile ? "column" : "row",
          gap: 16,
        }}
      >
        <div>
          {eyebrow ? (
            <div
              style={{
                fontFamily: UI_THEME.fontFamily,
                fontSize: isMobile ? 10 : 11,
                fontWeight: 800,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: UI_THEME.primaryDark,
                marginBottom: 8,
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: UI_THEME.fontFamily,
              fontSize: isMobile ? 28 : 40,
              fontWeight: 800,
              color: UI_THEME.text,
              lineHeight: 1.05,
              letterSpacing: "-0.06em",
            }}
          >
            {title}
          </div>
        </div>
        {action ? (
          <div style={{ width: isMobile ? "100%" : "auto" }}>
            {action}
          </div>
        ) : null}
      </div>
    </SurfaceCard>
  );
}

export function MetricCard({ label, value, helper, style }) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: "14px 16px",
        background: "rgba(255,255,255,0.78)",
        border: `1px solid ${UI_THEME.line}`,
        backdropFilter: "blur(10px)",
        boxShadow: "0 12px 28px rgba(74, 52, 24, 0.06)",
        ...style,
      }}
    >
      <div style={{ fontFamily: UI_THEME.fontFamily, fontSize: 12, color: UI_THEME.textMuted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: UI_THEME.fontFamily, fontSize: 30, fontWeight: 800, color: UI_THEME.text, lineHeight: 1, letterSpacing: "-0.05em" }}>{value}</div>
      {helper ? <div style={{ fontFamily: UI_THEME.fontFamily, marginTop: 8, fontSize: 12, color: UI_THEME.textMuted, lineHeight: 1.7 }}>{helper}</div> : null}
    </div>
  );
}

export function EmptyStateCard({ title, description, action = null, style }) {
  return (
    <div
      style={{
        padding: "22px 20px",
        borderRadius: 22,
        border: `1px dashed ${UI_THEME.lineStrong}`,
        background: "linear-gradient(180deg, #fffdfa 0%, #faf7f1 100%)",
        color: UI_THEME.textSecondary,
        ...style,
      }}
    >
      <div style={{ fontFamily: UI_THEME.fontFamily, fontSize: 18, fontWeight: 800, color: UI_THEME.text, lineHeight: 1.3, letterSpacing: "-0.03em" }}>{title}</div>
      {description ? <div style={{ fontFamily: UI_THEME.fontFamily, marginTop: 8, fontSize: 13, lineHeight: 1.8 }}>{description}</div> : null}
      {action ? <div style={{ marginTop: 14 }}>{action}</div> : null}
    </div>
  );
}
