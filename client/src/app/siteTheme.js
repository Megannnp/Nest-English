const PREFIX_THEMES = [
  ["grammar", "grammar"],
  ["reading", "reading"],
  ["phonetics", "phonetics"],
  ["vocab", "vocab"],
  ["listening", "listening"],
  ["speaking", "speaking"],
];

const WRITING_THEME_PAGES = new Set([
  "writing",
  "records",
  "workbench",
  "classes",
  "assignment-create",
  "teacher-writing-detail",
  "teacher-todo",
  "substitute-upload",
  "batch-grading",
]);

export function getSiteTheme(page) {
  if (!page) return "portal";
  const prefixTheme = PREFIX_THEMES.find(([prefix]) => page.startsWith(prefix));
  if (prefixTheme) return prefixTheme[1];
  if (page.startsWith("writing") || WRITING_THEME_PAGES.has(page)) {
    return "writing";
  }
  return "portal";
}
