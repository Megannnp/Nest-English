import { SurfaceCard } from "./uiPrimitives.jsx";
import { UI_THEME } from "./uiTheme.js";
import { heroGradient } from "../../styles/theme.js";

function getHeroBaseLayoutConfig() {
  return {
    outerRadius: 32,
    outerPadding: "28px 28px 26px",
    gridTemplateColumns: "minmax(0, 1.2fr) minmax(240px, 0.8fr)",
    gridGap: 16,
    cardRadius: 22,
    cardPadding: "22px 20px",
    cardMinHeight: "auto",
    eyebrowSize: 12,
    eyebrowSpacing: 1.2,
    eyebrowMarginBottom: 8,
    titleSize: 32,
    titleLineHeight: 1.12,
    titleLetterSpacing: "-0.04em",
    sideAlignContent: "stretch",
    sidePaddingTop: 0,
  };
}

function getMobileHeroLayoutOverrides() {
  return {
    outerRadius: 24,
    outerPadding: "22px 18px",
    gridTemplateColumns: "1fr",
    cardPadding: "18px 16px",
    titleSize: 24,
  };
}

function getSecondaryHeroLayoutOverrides(isMobile) {
  return {
    gridTemplateColumns: isMobile
      ? "1fr"
      : "minmax(0, 1.35fr) minmax(320px, 0.65fr)",
    gridGap: 22,
    cardRadius: isMobile ? 22 : 28,
    cardPadding: isMobile ? "18px 16px" : "26px 22px",
    cardMinHeight: isMobile ? "auto" : 210,
    eyebrowSize: isMobile ? 11 : 16,
    eyebrowSpacing: 2.8,
    eyebrowMarginBottom: 16,
    titleSize: isMobile ? 40 : 58,
    titleLineHeight: 1.04,
    titleLetterSpacing: "-0.06em",
    sideAlignContent: isMobile ? "stretch" : "start",
    sidePaddingTop: isMobile ? 0 : 26,
  };
}

function getHeroLayoutConfig({ isMobile, secondaryVariant }) {
  return {
    ...getHeroBaseLayoutConfig(),
    ...(isMobile ? getMobileHeroLayoutOverrides() : {}),
    ...(secondaryVariant ? getSecondaryHeroLayoutOverrides(isMobile) : {}),
  };
}

function HeroBackgroundDecor({ isMobile }) {
  return (
    <>
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
    </>
  );
}

function HeroMainCard({ eyebrow, title, description, config }) {
  return (
    <div
      style={{
        borderRadius: config.cardRadius,
        padding: config.cardPadding,
        background: "rgba(255,255,255,0.68)",
        border: `1px solid ${UI_THEME.line}`,
        backdropFilter: "blur(10px)",
        minHeight: config.cardMinHeight,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {eyebrow ? (
        <div
          style={{
            fontFamily: UI_THEME.fontFamily,
            fontSize: config.eyebrowSize,
            fontWeight: 800,
            letterSpacing: config.eyebrowSpacing,
            color: "#9b6a1d",
            textTransform: "uppercase",
            marginBottom: config.eyebrowMarginBottom,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: UI_THEME.fontFamily,
          fontSize: config.titleSize,
          fontWeight: 800,
          color: UI_THEME.text,
          lineHeight: config.titleLineHeight,
          maxWidth: 620,
          letterSpacing: config.titleLetterSpacing,
        }}
      >
        {title}
      </div>
      {description ? (
        <div
          style={{
            fontFamily: UI_THEME.fontFamily,
            marginTop: 10,
            fontSize: 14,
            color: UI_THEME.textSecondary,
            lineHeight: 1.9,
            maxWidth: 620,
          }}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}

function HeroSideContent({ sideContent, config }) {
  if (!sideContent) {
    return null;
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        alignContent: config.sideAlignContent,
        paddingTop: config.sidePaddingTop,
      }}
    >
      {sideContent}
    </div>
  );
}

export function HeroPanel({
  eyebrow,
  title,
  description,
  sideContent = null,
  isMobile = false,
  style,
  variant = "default",
}) {
  const secondaryVariant = variant === "secondary-page";
  const layout = getHeroLayoutConfig({ isMobile, secondaryVariant });

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: layout.outerRadius,
        padding: layout.outerPadding,
        background: heroGradient,
        border: "1px solid rgba(200, 133, 42, 0.12)",
        boxShadow: UI_THEME.shadowStrong,
        ...style,
      }}
    >
      <HeroBackgroundDecor isMobile={isMobile} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: layout.gridTemplateColumns,
          gap: layout.gridGap,
          alignItems: "stretch",
          position: "relative",
        }}
      >
        <HeroMainCard eyebrow={eyebrow} title={title} description={description} config={layout} />
        <HeroSideContent sideContent={sideContent} config={layout} />
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
        {action ? <div style={{ width: isMobile ? "100%" : "auto" }}>{action}</div> : null}
      </div>
    </SurfaceCard>
  );
}
