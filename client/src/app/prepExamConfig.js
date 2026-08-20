export const DEFAULT_PREP_EXAM_ID = "gaokao";

export const PREP_EXAM_SYSTEM_IDS = {
  k12: "system-k12",
  zhongkao: "system-junior",
  gaokao: "system-senior",
  cet4: "system-cet4",
  cet6: "system-cet6",
  kaoyan: "system-postgraduate",
  ielts: "system-ielts",
  toefl: "system-toefl",
};

export const PREP_EXAMS = [
  {
    id: "k12",
    label: "K12",
    helper: "按年级与教材阶段切换内容。",
    modules: [
      { id: "vocab", title: "词汇", page: "vocab-resources", branches: ["课本词汇", "自然拼读", "单元词表", "错词复习"] },
      { id: "grammar", title: "语法", page: "grammar-quiz", branches: ["时态", "句型转换", "单项选择", "语法填空"] },
      { id: "reading", title: "阅读", page: "reading-practice", branches: ["阅读理解", "任务型阅读", "信息匹配"] },
      { id: "listening", title: "听力", page: "listening-basics", branches: ["听音辨词", "短对话", "课文跟读"] },
      { id: "writing", title: "写作", page: "writing-bank", branches: ["看图写话", "应用文", "短文写作"] },
    ],
  },
  {
    id: "zhongkao",
    label: "中考",
    helper: "围绕中考题型组织专项和真题练习。",
    modules: [
      { id: "vocab", title: "词汇", page: "vocab-resources", branches: ["中考高频词", "词形变化", "短语搭配"] },
      { id: "grammar", title: "语法", page: "grammar-quiz", branches: ["单项选择", "语法填空", "句型转换"] },
      { id: "reading", title: "阅读", page: "reading-practice", branches: ["完形填空", "阅读理解", "任务型阅读", "七选五"] },
      { id: "listening", title: "听力", page: "listening-practice", branches: ["短对话", "长对话", "听短文"] },
      { id: "writing", title: "写作", page: "writing-bank", branches: ["应用文", "材料作文", "图表作文"] },
    ],
  },
  {
    id: "gaokao",
    label: "高考",
    helper: "按高考英语模块组织真题、专项和记录。",
    modules: [
      { id: "vocab", title: "词汇", page: "vocab-resources", branches: ["高考高频词", "熟词生义", "阅读词汇", "写作替换"] },
      { id: "grammar", title: "语法", page: "grammar-quiz", branches: ["语法填空", "短文改错", "长难句", "非谓语"] },
      { id: "reading", title: "阅读", page: "reading-practice", branches: ["阅读理解", "七选五", "完形填空", "题型专练"] },
      { id: "listening", title: "听力", page: "listening-practice", branches: ["短对话", "长对话", "独白", "模拟套题"] },
      { id: "writing", title: "写作", page: "writing-bank", branches: ["应用文", "读后续写", "概要写作", "真题批改"] },
      { id: "speaking", title: "口语", page: "speaking", branches: ["朗读", "问答", "情景表达"] },
    ],
  },
  {
    id: "cet4",
    label: "四级",
    helper: "大学英语四级的听读写译专项。",
    modules: [
      { id: "vocab", title: "词汇", page: "vocab-resources", branches: ["四级核心词", "同义替换", "短语搭配"] },
      { id: "listening", title: "听力", page: "listening-practice", branches: ["新闻", "长对话", "篇章听力"] },
      { id: "reading", title: "阅读", page: "reading-practice", branches: ["选词填空", "段落匹配", "仔细阅读"] },
      { id: "writing", title: "写作", page: "writing-bank", branches: ["短文写作", "翻译表达", "真题批改"] },
      { id: "grammar", title: "语法", page: "grammar-quiz", branches: ["长难句", "从句", "非谓语"] },
    ],
  },
  {
    id: "cet6",
    label: "六级",
    helper: "大学英语六级的高阶听读写译专项。",
    modules: [
      { id: "vocab", title: "词汇", page: "vocab-resources", branches: ["六级核心词", "学术词汇", "同义替换"] },
      { id: "listening", title: "听力", page: "listening-practice", branches: ["讲座", "长对话", "篇章听力"] },
      { id: "reading", title: "阅读", page: "reading-practice", branches: ["选词填空", "段落匹配", "仔细阅读"] },
      { id: "writing", title: "写作", page: "writing-bank", branches: ["议论文", "图表作文", "翻译表达"] },
      { id: "grammar", title: "语法", page: "grammar-quiz", branches: ["长难句", "复杂从句", "非谓语"] },
    ],
  },
  {
    id: "kaoyan",
    label: "考研",
    helper: "考研英语阅读、写作和翻译优先。",
    modules: [
      { id: "vocab", title: "词汇", page: "vocab-resources", branches: ["考研核心词", "熟词僻义", "词根词缀"] },
      { id: "reading", title: "阅读", page: "reading-practice", branches: ["Text 1-4", "新题型", "长难句定位"] },
      { id: "writing", title: "写作", page: "writing-bank", branches: ["小作文", "大作文", "真题批改"] },
      { id: "grammar", title: "语法", page: "grammar-quiz", branches: ["长难句", "翻译语法", "从句嵌套"] },
    ],
  },
  {
    id: "ielts",
    label: "IELTS",
    helper: "按雅思四科和评分标准组织训练。",
    modules: [
      { id: "vocab", title: "词汇", page: "vocab-resources", branches: ["Topic Vocabulary", "Collocations", "Paraphrase"] },
      { id: "listening", title: "Listening", page: "listening-practice", branches: ["Section 1", "Section 2", "Section 3", "Section 4"] },
      { id: "reading", title: "Reading", page: "reading-practice", branches: ["TFNG", "Matching", "Heading", "MCQ"] },
      { id: "writing", title: "Writing", page: "writing-bank", branches: ["Task 1", "Task 2", "Band Descriptor"] },
      { id: "speaking", title: "Speaking", page: "speaking", branches: ["Part 1", "Part 2", "Part 3"] },
      { id: "grammar", title: "Grammar", page: "grammar-quiz", branches: ["Complex Sentences", "Accuracy", "Range"] },
    ],
  },
  {
    id: "toefl",
    label: "TOEFL",
    helper: "按托福听说读写任务组织训练。",
    modules: [
      { id: "vocab", title: "词汇", page: "vocab-resources", branches: ["Academic Words", "Synonyms", "Campus Vocabulary"] },
      { id: "reading", title: "Reading", page: "reading-practice", branches: ["Factual", "Inference", "Vocabulary", "Summary"] },
      { id: "listening", title: "Listening", page: "listening-practice", branches: ["Conversation", "Lecture", "Detail", "Purpose"] },
      { id: "speaking", title: "Speaking", page: "speaking", branches: ["Independent", "Integrated"] },
      { id: "writing", title: "Writing", page: "writing-bank", branches: ["Integrated", "Academic Discussion"] },
    ],
  },
];

export function getPrepExam(examId = DEFAULT_PREP_EXAM_ID) {
  return PREP_EXAMS.find((exam) => exam.id === examId) || PREP_EXAMS.find((exam) => exam.id === DEFAULT_PREP_EXAM_ID);
}

export function getPrepExamModule(examId, moduleId) {
  return getPrepExam(examId)?.modules.find((module) => module.id === moduleId) || null;
}

export function getPrepExamSystemId(examId) {
  return PREP_EXAM_SYSTEM_IDS[examId] || "";
}
