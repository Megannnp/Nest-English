/* ── 产品切换器共享数据 ────────────────────────────────────────── */
// Single source of truth for all product items and grouping.
// Each TopBar imports buildSwitchItems(), passes its own label to exclude self.

export const GROUP_SKILL     = "备考";
export const GROUP_KNOWLEDGE = "语言基础";

const ALL_PRODUCTS = [
  { group: GROUP_SKILL,     label: "筑巢听读", accentColor: "#7a6010", page: "listening-basics" },
  { group: GROUP_SKILL,     label: "筑巢阅读", accentColor: "#1a7a6e", page: "reading-analyzer" },
  { group: GROUP_SKILL,     label: "筑巢写作", accentColor: "#8a5a1f", page: "writing-refine-sentence" },
  { group: GROUP_SKILL,     label: "筑巢口语", accentColor: "#ff7a1a", page: "speaking" },
  { group: GROUP_KNOWLEDGE, label: "筑巢语音", accentColor: "#c87898", page: "phonetics-overview"  },
  { group: GROUP_KNOWLEDGE, label: "筑巢词汇", accentColor: "#4e90cc", page: "vocab-analyzer"   },
  { group: GROUP_KNOWLEDGE, label: "筑巢语法", accentColor: "#5c3d9e", page: "grammar-analyzer" },
];

/**
 * Returns a switchTo array for use in StudioTopBar, excluding the current module.
 * @param {string|null} currentLabel - e.g. "筑巢听读". Pass null to include all.
 * @param {Function} navigate - the module's onNavigate callback.
 */
export function buildSwitchItems(currentLabel, navigate) {
  return ALL_PRODUCTS
    .filter(p => p.label !== currentLabel)
    .map(p => ({
      group: p.group,
      label: p.label,
      accentColor: p.accentColor,
      badge: p.badge,
      preloadPage: p.page,
      onClick: () => navigate?.(p.page),
    }));
}
