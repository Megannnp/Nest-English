export const SITE_URL = "https://nestenglish.com";
export const DEFAULT_TITLE = "筑巢英语";
export const DEFAULT_DESCRIPTION = "nest 是面向各阶段英语学习的 AI 平台，覆盖写作批改、语法分析、阅读训练、语音、词汇、听力、会员与学习记录追踪。";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-cover.png`;

// 站点根页。`portal` 与 `home` 是同一个 URL 的两个页面 ID，共享同一份配置，
// 避免两处描述各自漂移；两个键都有代码按名引用（运行时与静态导出的兜底结构化数据）。
const ROOT_PAGE_SEO = {
  title: "筑巢英语",
  description: DEFAULT_DESCRIPTION,
  path: "/",
  robots: "index,follow",
  structuredData: {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "筑巢英语",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/`,
    description: DEFAULT_DESCRIPTION,
    publisher: { "@type": "Organization", name: "nest" },
  },
};

export const PAGE_SEO = {
  portal: ROOT_PAGE_SEO,
  home: ROOT_PAGE_SEO,
  auth: {
    title: "筑巢英语",
    description: "登录或注册 nest，体验英语写作批改、语法分析、题目练习、学习记录追踪与教师教学协同能力。",
    path: "/auth",
    robots: "noindex,nofollow",
  },
  "skill-training": {
    title: "筑巢英语",
    description: "进入 nest 备考，按目标直达写作、阅读、听力、词汇与口语训练入口。",
    path: "/prep",
    robots: "index,follow",
  },
  "language-foundation": {
    title: "筑巢英语",
    description: "查看 Megan 的英语课程设计路径，从语音、语法、阅读到写作，把真实学习问题拆成可练习的课程。",
    path: "/foundation",
    robots: "index,follow",
  },
  plan: {
    title: "英语学习计划制定",
    description: "预约 Nest English 英语学习计划制定，先找到孩子英语学习真正的问题，再获得一份可以执行的 4 周学习方案。",
    path: "/plan",
    robots: "index,follow",
  },
  privacy: {
    title: "筑巢英语",
    description: "查看 nest 的隐私政策、账号信息、学习内容、AI 服务、会员数据与数据保护承诺。",
    path: "/privacy",
    robots: "index,follow",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "隐私政策",
      url: `${SITE_URL}/privacy`,
    },
  },
  agreement: {
    title: "筑巢英语",
    description: "查看 nest 的用户协议、AI 学习功能、会员权益、使用规则与服务边界说明。",
    path: "/agreement",
    robots: "index,follow",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "用户协议",
      url: `${SITE_URL}/agreement`,
    },
  },
  writing: {
    title: "筑巢写作",
    description: "上传或输入英语作文，获取多维评分、结构分析、语法纠错和针对性提分建议。",
    path: "/writing/grade",
    robots: "index,follow",
  },
  "grammar-analyzer": {
    title: "筑巢语法",
    description: "输入英文长难句，查看句子主干、从句关系、语法点和中文理解提示。",
    path: "/grammar/analyzer",
    robots: "index,follow",
  },
  "grammar-courses": {
    title: "筑巢语法",
    description: "浏览 nest Grammar Studio 的语法课程方向，覆盖从句、非谓语、句子结构与写作表达。",
    path: "/grammar/courses",
    robots: "index,follow",
  },
  "grammar-practice": {
    title: "筑巢语法",
    description: "进入 nest Grammar Studio 的 AI 智能练习入口，围绕语法点生成选择、填空和改错训练。",
    path: "/grammar/practice",
    robots: "index,follow",
  },
  "grammar-progress": {
    title: "筑巢语法",
    description: "查看语法课程、AI 练习与写作语法问题联动后的学习进度和薄弱点追踪。",
    path: "/grammar/progress",
    robots: "index,follow",
  },
  "grammar-quiz": {
    title: "筑巢语法",
    description: "完成 nest Grammar Studio 的语法专项练习，围绕语法点进行选择、填空和改错训练。",
    path: "/grammar/quiz",
    robots: "index,follow",
  },
  "writing-bank": {
    title: "筑巢写作",
    description: "从真题与题库中选题，进入英语写作练习，并体验 AI 反馈流程。",
    path: "/experience/practice",
    robots: "index,follow",
  },
  "writing-refine-sentence": {
    title: "筑巢写作",
    description: "通过句子扩写、表达打磨和即时反馈，提升英语写作中的句子表达质量。",
    path: "/writing/refine/sentence",
    robots: "index,follow",
  },
  "writing-refine-structure": {
    title: "筑巢写作",
    description: "按文体学习英语作文结构，拆解框架、段落功能与常用表达。",
    path: "/writing/refine/structure",
    robots: "index,follow",
  },
  growth: {
    title: "筑巢英语",
    description: "查看写作、语法、阅读、词汇、听读和语音模块的学习记录总览。",
    path: "/growth",
    robots: "index,follow",
  },
  records: {
    title: "筑巢写作",
    description: "查看历次作文的评分、AI 建议与语言变化，追踪自己的写作成长轨迹。",
    path: "/writing/records",
    robots: "index,follow",
  },
  // ── Reading ─────────────────────────────────────────────────
  "reading-analyzer": {
    title: "筑巢阅读",
    description: "粘贴阅读原文和题目，AI 先生成思维导图帮你把握文章脉络，再逐题解析、答案定位。",
    path: "/reading/analyzer",
    robots: "index,follow",
  },
  "reading-practice": {
    title: "筑巢阅读",
    description: "整篇练习模拟真实考场节奏，题型专练针对薄弱题型反复突破。",
    path: "/reading/practice",
    robots: "index,follow",
  },
  "reading-courses": {
    title: "筑巢阅读",
    description: "从题型策略到文体解析，系统提升英语阅读能力，覆盖题型精讲、文体解析与解题策略。",
    path: "/reading/courses",
    robots: "index,follow",
  },
  "reading-paper": {
    title: "筑巢阅读",
    description: "按文体从阅读题库抽取材料，生成可编辑、可下载、可打印的阅读理解练习单。",
    path: "/reading/paper",
    robots: "index,follow",
  },
  "reading-progress": {
    title: "筑巢阅读",
    description: "记录阅读练习、题型掌握和错因复盘，形成清晰的成长路径。",
    path: "/reading/progress",
    robots: "index,follow",
  },
  // ── Phonetics ───────────────────────────────────────────────
  "phonetics-overview": {
    title: "筑巢语音总览",
    description: "用粉色思维导图梳理音素、音节、句子和语篇，快速建立英语语音学习框架。",
    path: "/phonetics",
    robots: "index,follow",
  },
  "phonetics-sound": {
    title: "筑巢语音",
    description: "系统学习 48 个英语国际音标，涵盖单元音、双元音与辅音，点击卡片即可朗读示例词。",
    path: "/phonetics/sound",
    robots: "index,follow",
  },
  "phonetics-syllable": {
    title: "筑巢语音",
    description: "按总览与分类搭建音节学习框架，理解音节划分、计数、开闭音节和重读音节。",
    path: "/phonetics/syllable",
    robots: "index,follow",
  },
  "phonetics-sentence": {
    title: "筑巢语音",
    description: "按韵律与语流现象搭建句子语音框架，覆盖重读弱读、停顿、语调、连读、同化等内容。",
    path: "/phonetics/sentence",
    robots: "index,follow",
  },
  "phonetics-discourse": {
    title: "筑巢语音",
    description: "搭建语篇层面的语音学习框架，后续接入段落节奏、信息焦点、篇章连贯和表达态度。",
    path: "/phonetics/discourse",
    robots: "index,follow",
  },
  "phonetics-progress": {
    title: "筑巢语音",
    description: "展示音素、音节、句子和语篇训练的成长样例，真实记录将在学习数据接入后启用。",
    path: "/phonetics/progress",
    robots: "index,follow",
  },
  // ── Vocab ───────────────────────────────────────────────────
  // 键必须是 normalizePage 归一化后的页面 ID，否则 AppDocumentHead 查不到会退回 noindex。
  "vocab-analyzer": {
    title: "筑巢词汇",
    description: "输入任意英文单词或短语，AI 拆解词根词缀、常见搭配、例句和记忆技巧。",
    path: "/vocab/analyzer",
    robots: "index,follow",
  },
  "vocab-courses": {
    title: "筑巢词汇",
    description: "词汇精讲课程，系统讲解词根词缀、语境推断和高效记忆策略，配随堂小测巩固。",
    path: "/vocab/courses",
    robots: "index,follow",
  },
  "vocab-resources": {
    title: "筑巢词汇",
    description: "集中查看阅读词库、写作词库、阅读同义替换、写作同义替换和词汇精讲课程资源。",
    path: "/vocab/resources",
    robots: "index,follow",
  },
  "vocab-progress": {
    title: "筑巢词汇",
    description: "记录词汇检测和闪卡复习的表现，形成可复盘的词汇成长线。",
    path: "/vocab/progress",
    robots: "index,follow",
  },
  "vocab-quiz": {
    title: "筑巢词汇",
    description: "从词库随机抽词检测掌握程度，可选择选择题或闪卡两种模式（原词汇闪卡已并入此页）。",
    path: "/vocab/quiz",
    robots: "index,follow",
  },
  // ── Listening ───────────────────────────────────────────────
  "listening-basics": {
    title: "筑巢听读",
    description: "通过音素辨音、词汇听写和句子听写训练，强化英语听力基础辨音与拼写能力。",
    path: "/listening/basics",
    robots: "index,follow",
  },
  "listening-advanced": {
    title: "筑巢听读",
    description: "按句精听英文文章，先播放全文建立整体印象，再逐句播放并听写，完成后核对原文。",
    path: "/listening/advanced",
    robots: "index,follow",
  },
  "listening-practice": {
    title: "筑巢听读",
    description: "选择难度后点击生成练习，即可获得听力音频与题目，模拟真实听力考场节奏。",
    path: "/listening/practice",
    robots: "index,follow",
  },
  "listening-progress": {
    title: "筑巢听读",
    description: "记录基础听辨、篇章精听和模拟练习表现，追踪听读能力变化。",
    path: "/listening/progress",
    robots: "index,follow",
  },
  // ── Speaking ────────────────────────────────────────────────
  speaking: {
    title: "筑巢口语",
    description: "口语训练按阶段、主题、难度和任务类型展示训练路径，真实 AI 对话将在企业资质与语音服务接入后开放。",
    path: "/speaking",
    robots: "noindex,nofollow",
  },
  "speaking-progress": {
    title: "筑巢口语",
    description: "记录口语练习题型、回答时长和表达反馈，追踪开口练习的成长轨迹。",
    path: "/speaking/progress",
    robots: "noindex,nofollow",
  },
};
