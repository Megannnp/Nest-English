export const MODULE_SECTION_PREP = "prep";
export const MODULE_SECTION_BASE = "base";

export const MODULE_NAV_CONFIG = [
  {
    id: "grammar",
    section: MODULE_SECTION_BASE,
    label: "语法",
    dot: "#5548a8",
    bg: "#edeaff",
    border: "#d8d2ff",
    accent: "#5548a8",
    muted: "#7a6ec0",
    homePage: "grammar-analyzer",
    studentTabs: [
      { label: "分析句子", page: "grammar-analyzer" },
      { label: "在线练习", page: "grammar-quiz" },
      { label: "题卷生成", page: "grammar-practice" },
      { label: "语法精讲", page: "grammar-courses" },
      { label: "练习记录", page: "grammar-progress" },
    ],
    teacherTabs: [
      { label: "分析句子", page: "grammar-analyzer" },
      { label: "在线练习", page: "grammar-quiz" },
      { label: "题卷生成", page: "grammar-practice" },
      { label: "语法精讲", page: "grammar-courses" },
    ],
    studioItems: [
      { label: "分析句子", page: "grammar-analyzer" },
      {
        label: "语法练习",
        pages: ["grammar-practice", "grammar-quiz"],
        dropdown: [
          { id: "grammar-quiz", icon: "zap", label: "在线练习", desc: "AI 即时出题，边学边练", page: "grammar-quiz" },
          { id: "grammar-practice", icon: "file-text", label: "题卷生成", desc: "生成完整题卷，可打印下载", page: "grammar-practice" },
        ],
      },
      { label: "语法精讲", page: "grammar-courses" },
    ],
    studentRecord: { label: "练习记录", page: "grammar-progress" },
    teacherWorkbench: { label: "语法工作台", page: "grammar-workbench" },
    pages: [
      "grammar-analyzer", "grammar-courses", "grammar-practice",
      "grammar-progress", "grammar-quiz", "grammar-workbench",
    ],
  },
  {
    id: "writing",
    section: MODULE_SECTION_PREP,
    label: "写作",
    dot: "#a0522d",
    bg: "#fdf0e4",
    border: "#f0d8c0",
    accent: "#a0522d",
    muted: "#b8743e",
    homePage: "writing",
    studentTabs: [
      { label: "写作批改", page: "writing" },
      { label: "句子精炼", page: "writing-refine-sentence" },
      { label: "写作建构", page: "writing-refine-structure" },
      { label: "真题练习", page: "writing-bank" },
      { label: "练习记录", page: "records" },
    ],
    teacherTabs: [
      { label: "写作批改", page: "writing" },
      { label: "句子精炼", page: "writing-refine-sentence" },
      { label: "写作建构", page: "writing-refine-structure" },
      { label: "真题练习", page: "writing-bank" },
    ],
    studioItems: [
      { label: "写作批改", page: "writing" },
      {
        label: "写作精炼",
        pages: ["writing-refine-sentence", "writing-refine-structure"],
        dropdown: [
          { id: "writing-refine-sentence", icon: "pencil", label: "句子练习", desc: "AI 引导扩充句子，提升表达", page: "writing-refine-sentence" },
          { id: "writing-refine-structure", icon: "layers", label: "写作建构", desc: "分文体讲解写作框架", page: "writing-refine-structure" },
        ],
      },
      { label: "真题练习", page: "writing-bank" },
    ],
    studentRecord: { label: "练习记录", page: "records" },
    teacherWorkbench: { label: "写作工作台", pages: ["workbench", "substitute-upload"], page: "workbench" },
    pages: [
      "writing", "writing-bank", "records", "writing-refine-sentence",
      "writing-refine-structure", "workbench", "substitute-upload",
    ],
  },
  {
    id: "reading",
    section: MODULE_SECTION_PREP,
    label: "阅读",
    dot: "#1f7a5c",
    bg: "#e4f5ef",
    border: "#c8e8dc",
    accent: "#1f7a5c",
    muted: "#2e9470",
    homePage: "reading-analyzer",
    studentTabs: [
      { label: "阅读思维", page: "reading-analyzer" },
      { label: "在线练习", page: "reading-practice" },
      { label: "真题组卷", page: "reading-paper" },
      { label: "阅读精讲", page: "reading-courses" },
      { label: "练习记录", page: "reading-progress" },
    ],
    teacherTabs: [
      { label: "阅读思维", page: "reading-analyzer" },
      { label: "在线练习", page: "reading-practice" },
      { label: "真题组卷", page: "reading-paper" },
      { label: "阅读精讲", page: "reading-courses" },
    ],
    studioItems: [
      { label: "阅读思维", page: "reading-analyzer" },
      {
        label: "阅读练习",
        pages: ["reading-practice", "reading-paper"],
        dropdown: [
          { id: "reading-practice", icon: "zap", label: "练习题", desc: "整篇练习 + 题型专练，即时评分", page: "reading-practice" },
          { id: "reading-paper", icon: "file-text", label: "真题组卷", desc: "从题库抽题，可打印练习", page: "reading-paper" },
        ],
      },
      { label: "阅读精讲", page: "reading-courses" },
    ],
    studentRecord: { label: "练习记录", page: "reading-progress" },
    teacherWorkbench: { label: "阅读工作台", page: "reading-workbench" },
    pages: [
      "reading-analyzer", "reading-practice", "reading-paper",
      "reading-courses", "reading-progress", "reading-workbench",
    ],
  },
  {
    id: "listening",
    section: MODULE_SECTION_PREP,
    label: "听力",
    dot: "#8a6800",
    bg: "#fef8e0",
    border: "#f0e4a0",
    accent: "#8a6800",
    muted: "#a07c00",
    homePage: "listening-basics",
    studentTabs: [
      { label: "基础听辨", page: "listening-basics" },
      { label: "精听听写", page: "listening-advanced" },
      { label: "真题练习", page: "listening-practice" },
      { label: "练习记录", page: "listening-progress" },
    ],
    teacherTabs: [
      { label: "基础听辨", page: "listening-basics" },
      { label: "精听听写", page: "listening-advanced" },
      { label: "真题练习", page: "listening-practice" },
    ],
    studioItems: [
      { label: "基础听辨", page: "listening-basics" },
      { label: "精听听写", page: "listening-advanced" },
      { label: "真题练习", page: "listening-practice" },
    ],
    studentRecord: { label: "练习记录", page: "listening-progress" },
    teacherWorkbench: { label: "听力工作台", page: "listening-workbench" },
    pages: [
      "listening-basics", "listening-advanced",
      "listening-practice", "listening-progress", "listening-workbench",
    ],
  },
  {
    id: "vocab",
    section: MODULE_SECTION_PREP,
    label: "词汇",
    dot: "#1a5fa8",
    bg: "#e6f0fb",
    border: "#c8dcf4",
    accent: "#1a5fa8",
    muted: "#2878c8",
    homePage: "vocab-analyzer",
    studentTabs: [
      { label: "单词分析", page: "vocab-analyzer" },
      { label: "词汇检测", page: "vocab-quiz" },
      { label: "考试词汇", page: "vocab-resources" },
      { label: "词汇精讲", page: "vocab-courses" },
      { label: "练习记录", page: "vocab-progress" },
    ],
    teacherTabs: [
      { label: "单词分析", page: "vocab-analyzer" },
      { label: "词汇检测", page: "vocab-quiz" },
      { label: "考试词汇", page: "vocab-resources" },
      { label: "词汇精讲", page: "vocab-courses" },
    ],
    studioItems: [
      {
        label: "词汇学习",
        pages: ["vocab-analyzer", "vocab-quiz", "vocab-courses", "vocab-resources"],
        dropdown: [
          { id: "vocab-analyzer", label: "单词分析", desc: "AI 拆解词根词缀、搭配和记忆技巧", page: "vocab-analyzer" },
          { id: "vocab-quiz", label: "词汇检测", desc: "选择题、闪卡等方式检测掌握程度", page: "vocab-quiz" },
          { id: "vocab-resources", label: "考试词汇", desc: "集中查看阅读、写作、替换和考试词库", page: "vocab-resources" },
          { id: "vocab-courses", label: "词汇精讲", desc: "词根词缀、语境推断、记忆策略", page: "vocab-courses" },
        ],
      },
    ],
    studentRecord: { label: "练习记录", page: "vocab-progress" },
    teacherWorkbench: { label: "词汇工作台", page: "vocab-workbench" },
    pages: [
      "vocab-workbench", "vocab-analyzer", "vocab-quiz", "vocab-courses", "vocab-resources",
      "vocab-progress",
    ],
  },
  {
    id: "phonetics",
    section: MODULE_SECTION_BASE,
    label: "语音",
    dot: "#a0307a",
    bg: "#fce8f2",
    border: "#f0c8e0",
    accent: "#a0307a",
    muted: "#b84090",
    homePage: "phonetics-overview",
    studentTabs: [
      { label: "训练营", page: "phonetics-camp" },
      { label: "总览", page: "phonetics-overview" },
      { label: "音素", page: "phonetics-sound" },
      { label: "音节", page: "phonetics-syllable" },
      { label: "句子", page: "phonetics-sentence" },
      { label: "语篇", page: "phonetics-discourse" },
      { label: "练习记录", page: "phonetics-progress" },
    ],
    teacherTabs: [
      { label: "训练营", page: "phonetics-camp" },
      { label: "总览", page: "phonetics-overview" },
      { label: "音素", page: "phonetics-sound" },
      { label: "音节", page: "phonetics-syllable" },
      { label: "句子", page: "phonetics-sentence" },
      { label: "语篇", page: "phonetics-discourse" },
    ],
    studioItems: [
      { id: "phonetics-camp", label: "训练营", page: "phonetics-camp" },
      { id: "phonetics-overview", label: "总览", page: "phonetics-overview" },
      { id: "phonetics-sound", label: "音素", page: "phonetics-sound" },
      { id: "phonetics-syllable", label: "音节", page: "phonetics-syllable" },
      { id: "phonetics-sentence", label: "句子", page: "phonetics-sentence" },
      { id: "phonetics-discourse", label: "语篇", page: "phonetics-discourse" },
    ],
    studentRecord: { id: "phonetics-progress", label: "练习记录", page: "phonetics-progress" },
    teacherWorkbench: { id: "phonetics-workbench", label: "语音工作台", page: "phonetics-workbench" },
    pages: [
      "phonetics-camp", "phonetics-overview",
      "phonetics-sound", "phonetics-syllable", "phonetics-sentence",
      "phonetics-discourse", "phonetics-progress", "phonetics-workbench",
    ],
  },
  {
    id: "speaking",
    section: MODULE_SECTION_PREP,
    label: "口语",
    dot: "#2f6f8f",
    bg: "#e6f1f5",
    border: "#c8dfe8",
    accent: "#2f6f8f",
    muted: "#3f8aac",
    homePage: "speaking",
    studentTabs: [
      { label: "口语练习", page: "speaking" },
      { label: "练习记录", page: "speaking-progress" },
    ],
    teacherTabs: [
      { label: "口语练习", page: "speaking" },
    ],
    studioItems: [
      { id: "speaking", label: "口语练习", page: "speaking" },
    ],
    studentRecord: { id: "speaking-progress", label: "练习记录", page: "speaking-progress" },
    teacherWorkbench: { id: "speaking-workbench", label: "口语工作台", page: "speaking-workbench" },
    pages: ["speaking", "speaking-progress", "speaking-workbench"],
  },
];

export const MODULE_NAV_CONFIG_BY_ID = Object.fromEntries(
  MODULE_NAV_CONFIG.map((module) => [module.id, module])
);

export function getModuleConfig(moduleId) {
  return MODULE_NAV_CONFIG_BY_ID[moduleId] || null;
}

export function getActiveModuleConfig(activePage) {
  return MODULE_NAV_CONFIG.find((module) => module.pages.includes(activePage)) || null;
}

export function getModuleTabs(moduleId, { isTeacher = false } = {}) {
  const config = getModuleConfig(moduleId);
  if (!config) return [];
  return isTeacher ? config.teacherTabs : config.studentTabs;
}

function isItemActive(item, activePage) {
  if (!item || !activePage) return false;
  if (item.pages?.includes(activePage)) return true;
  return item.page === activePage;
}

function wireNavItem(item, activePage, onNavigate) {
  if (item.dropdown) {
    return {
      label: item.label,
      active: isItemActive(item, activePage),
      dropdown: item.dropdown.map((sub) => ({
        ...sub,
        active: isItemActive(sub, activePage),
        onClick: () => onNavigate?.(sub.page),
      })),
    };
  }
  return {
    ...item,
    active: isItemActive(item, activePage),
    onClick: () => onNavigate?.(item.page),
  };
}

export function buildStudioModuleNavItems(moduleId, { activePage = "", onNavigate, isTeacher = false } = {}) {
  const config = getModuleConfig(moduleId);
  if (!config) return [];
  const navItems = config.studioItems.map((item) => wireNavItem(item, activePage, onNavigate));
  const tailItem = isTeacher ? config.teacherWorkbench : config.studentRecord;
  if (tailItem) navItems.push(wireNavItem(tailItem, activePage, onNavigate));
  return navItems;
}

export function isPrepModule(moduleId) {
  return getModuleConfig(moduleId)?.section === MODULE_SECTION_PREP;
}

export function isBaseModule(moduleId) {
  return getModuleConfig(moduleId)?.section === MODULE_SECTION_BASE;
}
