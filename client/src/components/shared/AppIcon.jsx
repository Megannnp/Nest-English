import { CORE_ICON_RENDERERS } from "./appIconCoreRenderers.jsx";
import { EXTENDED_ICON_RENDERERS } from "./appIconExtendedRenderers.jsx";

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

const ICON_RENDERERS = {
  ...CORE_ICON_RENDERERS,
  ...EXTENDED_ICON_RENDERERS,
};

export default function AppIcon({ name, size = 18, strokeWidth, ...props }) {
  const p = {
    ...iconProps,
    width: size,
    height: size,
    strokeWidth: strokeWidth ?? iconProps.strokeWidth,
    ...props,
  };
  const renderIcon = ICON_RENDERERS[name];
  return renderIcon ? renderIcon(p) : null;
}
