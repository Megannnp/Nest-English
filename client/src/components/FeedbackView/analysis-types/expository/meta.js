// expository/meta.js
/**
 * 说明文模块元数据配置
 * 包含：样式常量、文本提示、主题色、默认文案等
 */
export const EXPOSITORY_META = {
  // 1. 主题样式配置（颜色、间距、圆角）
  theme: {
    primaryColor: '#6b5a47',
    successColor: '#3a6a45',
    errorColor: '#9a3a2a',
    warningColor: '#8A6F5B',
    textColor: '#2a1f14',
    subTextColor: '#8a7d6e',
    bgColor: '#f5f0e8',
    cardBgColor: '#ffffff',
    borderColor: '#e8e0d5',
    borderRadius: '0',
    cardBorderRadius: '0',
    padding: '16px',
    cardPadding: '12px',
    margin: '8px 0',
    cardMargin: '12px 0'
  },

  // 2. 文本常量（统一管理文案，方便国际化/修改）
  text: {
    title: '说明文专业反馈',
    emptyFeedback: '暂无说明文反馈数据',
    grammarTitle: '📚 语法错误修正',
    noGrammarError: '未检测到明显语法错误，继续保持！',
    vocabTitle: '✨ 词汇升级建议',
    noVocabUpgrade: '词汇使用合理，可尝试更高级的表达！',
    structureTitle: '🏗️ 文章结构分析',
    contentTitle: '📖 内容与主题评价',
    introPart: '开头部分',
    bodyPart: '主体部分',
    conclusionPart: '结尾部分',
    suggestionPart: '结构优化建议',
    strengths: '优点',
    weaknesses: '不足',
    contentSuggestions: '内容优化建议',
    defaultIntro: '开头主题明确，直接点明说明对象。',
    defaultBody: '主体内容完整，逻辑清晰，覆盖说明对象的核心特征。',
    defaultConclusion: '结尾总结到位，升华说明主题。',
    defaultStructureSuggestion: '可适当增加过渡句，让段落衔接更自然。',
    defaultStrengths: '主题明确，紧扣说明文核心，内容真实具体。',
    defaultWeaknesses: '可补充更多细节，让说明更生动具体。',
    defaultContentSuggestion: '增加具体事例/数据，增强说明的说服力。'
  },

  // 3. 组件类名前缀（避免样式冲突）
  classNamePrefix: 'expository',

  // 4. 图标配置
  icons: {
    grammar: '📚',
    vocab: '✨',
    structure: '🏗️',
    content: '📖',
    main: '📝'
  }
};

// 辅助函数：生成带前缀的类名（避免样式冲突）
export const getClassName = (name) => {
  return `${EXPOSITORY_META.classNamePrefix}-${name}`;
};

// 辅助函数：生成内联样式（方便动态修改）
export const getInlineStyle = (type) => {
  const { theme } = EXPOSITORY_META;
  switch (type) {
    case 'container':
      return {
        padding: theme.padding,
        backgroundColor: theme.bgColor,
        borderRadius: theme.borderRadius,
        margin: theme.margin
      };
    case 'card':
      return {
        margin: theme.cardMargin,
        padding: theme.cardPadding,
        backgroundColor: theme.cardBgColor,
        borderRadius: theme.cardBorderRadius,
        borderLeft: `4px solid ${theme.primaryColor}`
      };
    case 'errorText':
      return { color: theme.errorColor };
    case 'correctText':
      return { color: theme.successColor };
    case 'subText':
      return { color: theme.subTextColor, fontSize: '14px' };
    default:
      return {};
  }
};