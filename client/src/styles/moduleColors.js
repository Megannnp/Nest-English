import { THEME } from "./theme.js";

// Single source of truth for the subject-module brand colors.
// Reused by productSwitcher.js (switcher accent dots) and AuthPrimaryButton.jsx (CTA gradients).
export const MODULE_COLORS = {
  listening: { accent: "#7a6010" },
  speaking: { accent: "#ff7a1a" },
  reading: {
    accent: "#1a7a6e",
    gradient: "linear-gradient(135deg, #239a8a 0%, #1a7a6e 55%, #115a51 100%)",
    disabledBackground: "#a0ccc8",
    shadow: "0 16px 36px rgba(26, 122, 110, 0.22)",
  },
  writing: {
    accent: "#8a5a1f",
    gradient: THEME.color.primaryGradient,
    disabledBackground: "#c8a87a",
    shadow: "0 16px 36px rgba(138, 90, 31, 0.22)",
  },
  phonetics: { accent: "#c87898" },
  vocab: { accent: "#4e90cc" },
  grammar: {
    accent: "#5c3d9e",
    gradient: "linear-gradient(135deg, #7652c2 0%, #5c3d9e 55%, #4a2f85 100%)",
    disabledBackground: "#cfc4e8",
    shadow: "0 16px 36px rgba(92, 61, 158, 0.24)",
  },
};
