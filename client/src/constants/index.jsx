// src/constants/index.js —— Pure JavaScript Constants (No JSX)
// 注意：此文件禁止包含任何 JSX 语法（如 <div>），否则 Vite 会报错
import { THEME } from "../styles/theme.js";

export const DEFAULT_TYPES = ["应用文", "读后续写", "概要写作", "议论文", "说明文", "记叙文", "书信", "演讲稿"];
export const DEFAULT_THEMES = ["旅行", "亲情", "友情", "善良", "梦想", "环境", "科技", "教育", "健康", "文化", "勇气", "感恩"];
export const COLORS = ["#b02020", "#b06000", "#1a5fa0", "#1a7a4a", THEME.color.primaryStrong, THEME.color.primary];

export const GRADES = {
  优: { color: "#1a7a4a", bg: "#edfaf3", border: "#a8e8c8" },
  良: { color: "#1a5fa0", bg: "#eaf3fd", border: "#a0cef0" },
  中: { color: "#b06000", bg: "#fff8e6", border: "#f0cc80" },
  差: { color: "#b02020", bg: "#fdf0ef", border: "#f0b0a8" },
};

export const RUBRICS = {
  15: [
    { range: "13–15", grade: "优", label: "第五档" },
    { range: "10–12", grade: "良", label: "第四档" },
    { range: "7–9", grade: "中", label: "第三档" },
    { range: "4–6", grade: "差", label: "第二档" },
    { range: "1–3", grade: "差", label: "第一档" },
    { range: "0", grade: "差", label: "0分" }
  ],
  20: [
    { range: "17–20", grade: "优", label: "第五档" },
    { range: "13–16", grade: "良", label: "第四档" },
    { range: "9–12", grade: "中", label: "第三档" },
    { range: "5–8", grade: "差", label: "第二档" },
    { range: "1–4", grade: "差", label: "第一档" },
    { range: "0", grade: "差", label: "0分" }
  ],
  25: [
    { range: "22–25", grade: "优", label: "第七档" },
    { range: "18–21", grade: "优", label: "第六档" },
    { range: "15–17", grade: "良", label: "第五档" },
    { range: "11–14", grade: "良", label: "第四档" },
    { range: "6–10", grade: "中", label: "第三档" },
    { range: "1–5", grade: "差", label: "第二档" },
    { range: "0", grade: "差", label: "第一档" }
  ],
  100: [
    { range: "90–100", grade: "优", label: "优秀" },
    { range: "75–89", grade: "良", label: "良好" },
    { range: "60–74", grade: "中", label: "及格" },
    { range: "40–59", grade: "差", label: "较差" },
    { range: "0–39", grade: "差", label: "极差" }
  ],
};

// Shared style helpers — plain objects only, no JSX
export const card = {
  background: "#fff",
  border: "1px solid #e8e0d5",
  borderRadius: 14,
  padding: 22,
  marginBottom: 18,
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

export const SURFACE_SPACING = {
  stack: 18,
  stackTight: 14,
  stackLoose: 24,
  headerToFirstSurface: 18,
  headerToFirstSurfaceMobile: 14,
};

export const inp = (override = {}) => ({
  width: "100%",
  padding: "12px 16px",
  border: "1.5px solid #e8ded0",
  borderRadius: "100px",
  fontSize: 15,
  color: "#2a1f14",
  background: "#faf8f5",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "border-color 0.2s",
  ...override,
});

// Writing Type Constants
export const WRITING_TYPES = {
  CONTINUATION: 'continuation',
  SUMMARY: 'summary',
  SPEECH: 'speech',
  ARGUMENTATIVE: 'argumentative',
  NARRATIVE: 'narrative',
  EXPOSITORY: 'expository',
  LETTER: 'letter',
  NOTICE: 'notice',
  DIARY: 'diary',
  CHART_WRITING: 'chart_writing',
  REPORT: 'report',
  PROPOSAL: 'proposal',
  REVIEW: 'review',
  PICTURE_WRITING: 'picture_writing',
  GENERAL: 'general',
};

// Type Label Mapping
export const TYPE_LABELS = {
  [WRITING_TYPES.CONTINUATION]: '读后续写',
  [WRITING_TYPES.SUMMARY]: '概要写作',
  [WRITING_TYPES.SPEECH]: '演讲稿',
  [WRITING_TYPES.ARGUMENTATIVE]: '议论文',
  [WRITING_TYPES.NARRATIVE]: '记叙文',
  [WRITING_TYPES.EXPOSITORY]: '说明文',
  [WRITING_TYPES.LETTER]: '书信',
  [WRITING_TYPES.NOTICE]: '通知',
  [WRITING_TYPES.GENERAL]: '综合写作',
  [WRITING_TYPES.DIARY]: '日记',
  [WRITING_TYPES.CHART_WRITING]: '图表作文',
  [WRITING_TYPES.REPORT]: '报告',
  [WRITING_TYPES.PROPOSAL]: '倡议书',
  [WRITING_TYPES.REVIEW]: '观后感/读后感',
  [WRITING_TYPES.PICTURE_WRITING]: '看图写话',
};

// Type Color Mapping (primary colors)
export const TYPE_COLORS = {
  [WRITING_TYPES.CONTINUATION]: '#f59e0b',  // 琥珀色
  [WRITING_TYPES.SUMMARY]: '#3b82f6',       // 蓝色
  [WRITING_TYPES.SPEECH]: '#ef4444',        // 红色
  [WRITING_TYPES.ARGUMENTATIVE]: '#10b981', // 绿色
  [WRITING_TYPES.NARRATIVE]: '#8b5cf6',     // 紫色
  [WRITING_TYPES.EXPOSITORY]: '#f97316',    // 橙色
  [WRITING_TYPES.LETTER]: '#06b6d4',        // 青色
  [WRITING_TYPES.NOTICE]: '#84cc16',        // 黄绿色
  [WRITING_TYPES.GENERAL]: '#6b7280',        // 灰色
  [WRITING_TYPES.DIARY]: '#f472b6',
  [WRITING_TYPES.CHART_WRITING]: '#6366f1',
  [WRITING_TYPES.REPORT]: '#64748b',
  [WRITING_TYPES.PROPOSAL]: '#dc2626',
  [WRITING_TYPES.REVIEW]: '#7c3aed',
  [WRITING_TYPES.PICTURE_WRITING]: '#10b981',
};

// Helper function to expand hex color to full color scheme
export const expandTypeColor = (type) => {
  const hex = TYPE_COLORS[type] || TYPE_COLORS[WRITING_TYPES.GENERAL];
  return {
    text: hex,
    bg: hex + '15',      // 10% opacity for background
    border: hex + '40',  // 25% opacity for border
    light: hex + '08',   // 5% opacity for light background
    medium: hex + '25'   // 15% opacity for medium background
  };
};

// Type-specific Prompts for AI (aligned with analysis-types components)
export const TYPE_PROMPTS = {
  [WRITING_TYPES.LETTER]: `【书信特殊要求】
1. 必须检查书信格式（称呼、正文、结束语、签名、日期）。
2. 检查语气是否符合收信人关系（正式/非正式）。
3. 返回字段必须包含：formatCheck: { salutation: boolean, body: boolean, closing: boolean, signature: boolean }。
4. 评价书信的开头和结尾是否恰当。`,

  [WRITING_TYPES.NOTICE]: `【通知特殊要求】
1. 必须检查通知格式（标题、时间、地点、事件、联系方式）。
2. 检查语言是否简洁明了、正式规范。
3. 返回字段必须包含：noticeElements: { title: boolean, time: boolean, place: boolean, event: boolean, contact: boolean }。
4. 检查通知的时效性和必要性说明。`,

  [WRITING_TYPES.SPEECH]: `【演讲稿特殊要求】
1. 检查开场白是否有吸引力（问候、引入话题）。
2. 检查结尾是否有号召力或总结升华。
3. 检查口语化表达和修辞手法使用（排比、反问等）。
4. 返回字段必须包含：speechStructure: { opening: string, body: string, ending: string }。
5. 评价语言的感染力和互动性。`,

  [WRITING_TYPES.CONTINUATION]: `【读后续写特殊要求】
1. 必须分析情节衔接（是否与原文逻辑连贯，合理延续）。
2. 返回字段必须包含：plot: { setup: string, conflict: string, climax: string, resolution: string } 描述黄金四步法。
3. 返回字段必须包含：coherence（情节衔接评价）和 emotionalClimax（情感升华评价）。
4. 必须使用"黄金四步法"分析：情节铺垫→冲突/转折→高潮→情感升华。
5. 检查与原文的连贯性（人物性格、时间线、场景一致性）。`,

  [WRITING_TYPES.ARGUMENTATIVE]: `【议论文特殊要求】
1. 必须检查论点是否明确、切题（thesisAnalysis: { position: string, clarity: number, suggestions: [] }）。
2. 必须检查论据充分性和相关性（evidenceEvaluation: { sufficiency: number, relevance: number, missingEvidence: [] }）。
3. 必须检查论证逻辑（logicStructure: { coherence: number, transitionQuality: number, flowIssues: [] }）。
4. 识别并评价使用的论证方法（举例、对比、因果等）。
5. 必须提供论证句型和连接词建议（vocabulary.argumentative）。`,

  [WRITING_TYPES.SUMMARY]: `【概要写作特殊要求】
1. 必须检查是否涵盖原文所有要点（无遗漏、无添加）。
2. 检查是否使用自己的语言概括（非直接复制原文句子）。
3. 检查字数是否符合要求（通常60-80词）。
4. 返回字段必须包含：summaryCheck: { mainPoints: boolean, paraphrase: boolean, wordCount: boolean, missingPoints: [] }。
5. 评价概括的客观性和全面性。`,

  [WRITING_TYPES.EXPOSITORY]: `【说明文特殊要求】
1. 检查说明顺序是否合理（时间顺序、空间顺序、逻辑顺序）。
2. 检查说明方法使用（定义、举例、比较、分类、数字等）。
3. 检查语言是否客观准确，无主观情感色彩。
4. 返回字段必须包含：expositoryMethods: []（使用的说明方法列表）。
5. 评价说明的清晰度和条理性。`,

  [WRITING_TYPES.GENERAL]: `【通用写作要求】
1. 全面评价内容、语言、结构三方面。
2. 提供具体的改进建议和模板。
3. 识别主要语言错误并给出改正建议。
4. 提供同主题高分词汇和句型替换建议。`,

[WRITING_TYPES.DIARY]: `【日记特殊要求】
1. 检查日记格式（日期、天气可选、第一人称）。
2. 检查情感表达是否真实自然，生活细节是否具体。
3. 返回字段必须包含：diaryCheck: { date: boolean, firstPerson: boolean, emotion: boolean, detail: boolean }。
4. 评价日记的个人风格和语言流畅性。`,

[WRITING_TYPES.REPORT]: `【报告特殊要求】
1. 检查报告格式（标题、小标题、结论）。
2. 检查数据引用是否客观准确，结论是否明确。
3. 返回字段必须包含：reportCheck: { title: boolean, structure: boolean, data: boolean, conclusion: boolean }。
4. 评价语言的正式性和客观性。`,
};

// Utility: Get type label with fallback
export const getTypeLabel = (type) => TYPE_LABELS[type] || '未知类型';

// Utility: Get type color with fallback  
export const getTypeColor = (type) => TYPE_COLORS[type] || TYPE_COLORS[WRITING_TYPES.GENERAL];

// Utility: Check if type is valid
export const isValidType = (type) => Object.values(WRITING_TYPES).includes(type);
