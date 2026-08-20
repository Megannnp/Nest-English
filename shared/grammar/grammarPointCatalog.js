export const GRAMMAR_POINT_CATALOG = [
  {
    id: 'sentence_structure',
    label: '句子结构',
    children: [
      { id: 'sentence_main_structure', label: '主干提取', aliases: ['主谓宾', '主系表', '主谓双宾', '主谓宾补'] },
      { id: 'sentence_elements', label: '句子成分', aliases: ['主语', '谓语', '宾语', '表语', '定语', '状语', '补语', '同位语'] },
      { id: 'sentence_types', label: '句子类型', aliases: ['简单句', '并列句', '复合句', '并列复合句'] },
      { id: 'there_be', label: 'There be 句型', aliases: ['存在句'] },
      { id: 'it_pattern', label: 'It 句型', aliases: ['形式主语', '形式宾语', '强调句'] },
    ],
  },
  {
    id: 'clauses',
    label: '从句系统',
    children: [
      { id: 'relative_clause', label: '定语从句', aliases: ['关系代词', '关系副词', '限制性定语从句', '非限制性定语从句'] },
      { id: 'subject_clause', label: '主语从句', aliases: ['what 引导主语从句', 'that 引导主语从句'] },
      { id: 'object_clause', label: '宾语从句', aliases: ['陈述语序', 'whether/if', '连接词'] },
      { id: 'predicative_clause', label: '表语从句', aliases: ['be that', 'the reason why'] },
      { id: 'appositive_clause', label: '同位语从句', aliases: ['抽象名词后 that 从句', 'fact that', 'idea that', 'news that'] },
      { id: 'adverbial_time_clause', label: '时间状语从句', aliases: ['when', 'while', 'as', 'before', 'after', 'until', 'since'] },
      { id: 'adverbial_condition_clause', label: '条件状语从句', aliases: ['if', 'unless', 'as long as', 'provided that'] },
      { id: 'adverbial_reason_clause', label: '原因状语从句', aliases: ['because', 'since', 'as', 'now that'] },
      { id: 'adverbial_concession_clause', label: '让步状语从句', aliases: ['although', 'though', 'even though', 'while'] },
      { id: 'adverbial_result_clause', label: '结果状语从句', aliases: ['so that', 'so...that', 'such...that'] },
      { id: 'adverbial_purpose_clause', label: '目的状语从句', aliases: ['so that', 'in order that'] },
      { id: 'adverbial_comparison_clause', label: '比较状语从句', aliases: ['than', 'as...as'] },
      { id: 'adverbial_manner_clause', label: '方式状语从句', aliases: ['as if', 'as though'] },
      { id: 'adverbial_place_clause', label: '地点状语从句', aliases: ['where', 'wherever'] },
    ],
  },
  {
    id: 'verb_system',
    label: '动词系统',
    children: [
      { id: 'tense_present', label: '现在时态', aliases: ['一般现在时', '现在进行时', '现在完成时', '现在完成进行时'] },
      { id: 'tense_past', label: '过去时态', aliases: ['一般过去时', '过去进行时', '过去完成时', '过去完成进行时'] },
      { id: 'tense_future', label: '将来表达', aliases: ['will', 'be going to', '将来进行时', '将来完成时'] },
      { id: 'passive_voice', label: '被动语态', aliases: ['be done', 'get done'] },
      { id: 'modal_verbs', label: '情态动词', aliases: ['can', 'could', 'may', 'might', 'must', 'should', 'would'] },
      { id: 'subjunctive_mood', label: '虚拟语气', aliases: ['if 虚拟条件句', 'wish', 'suggest that'] },
      { id: 'subject_verb_agreement', label: '主谓一致', aliases: ['单复数一致', '就近原则'] },
      { id: 'verb_phrases', label: '动词短语', aliases: ['动词搭配', '及物/不及物', '短语动词'] },
    ],
  },
  {
    id: 'non_finite',
    label: '非谓语系统',
    children: [
      { id: 'infinitive', label: '不定式', aliases: ['to do', '作主语', '作宾语', '作目的状语'] },
      { id: 'gerund', label: '动名词', aliases: ['doing 作名词', '介词后 doing'] },
      { id: 'present_participle', label: '现在分词', aliases: ['doing 作定语', 'doing 作状语', '主动关系'] },
      { id: 'past_participle', label: '过去分词', aliases: ['done 作定语', 'done 作状语', '被动关系'] },
      { id: 'absolute_construction', label: '独立主格', aliases: ['with 复合结构', '独立分词结构'] },
    ],
  },
  {
    id: 'nominal_system',
    label: '名词与限定',
    children: [
      { id: 'nouns', label: '名词', aliases: ['可数名词', '不可数名词', '名词所有格'] },
      { id: 'articles', label: '冠词', aliases: ['a', 'an', 'the', '零冠词'] },
      { id: 'pronouns', label: '代词', aliases: ['人称代词', '物主代词', '反身代词', '不定代词'] },
      { id: 'determiners', label: '限定词', aliases: ['this', 'that', 'some', 'any', 'each', 'every'] },
      { id: 'quantifiers', label: '数量表达', aliases: ['many', 'much', 'few', 'little', 'a number of'] },
    ],
  },
  {
    id: 'modifier_system',
    label: '修饰系统',
    children: [
      { id: 'adjectives', label: '形容词', aliases: ['形容词位置', '作表语', '作定语'] },
      { id: 'adverbs', label: '副词', aliases: ['频率副词', '程度副词', '连接副词'] },
      { id: 'comparison', label: '比较级与最高级', aliases: ['比较级', '最高级', '倍数表达'] },
      { id: 'prepositions', label: '介词', aliases: ['时间介词', '地点介词', '介词短语'] },
      { id: 'conjunctions', label: '连词', aliases: ['并列连词', '从属连词', '关联连词'] },
    ],
  },
  {
    id: 'special_structures',
    label: '特殊句式与表达',
    children: [
      { id: 'inversion', label: '倒装', aliases: ['完全倒装', '部分倒装', '否定词置首'] },
      { id: 'emphasis', label: '强调', aliases: ['强调句', 'do 强调'] },
      { id: 'ellipsis', label: '省略', aliases: ['状语从句省略', '并列省略'] },
      { id: 'parallelism', label: '平行结构', aliases: ['并列平衡', 'not only but also'] },
      { id: 'punctuation', label: '标点与连接', aliases: ['逗号拼接', '分号', '冒号', '破折号'] },
    ],
  },
];

export const GRAMMAR_POINTS = GRAMMAR_POINT_CATALOG.flatMap((group) =>
  group.children.map((point) => ({
    ...point,
    groupId: group.id,
    groupLabel: group.label,
  }))
);

export const GRAMMAR_POINT_BY_ID = Object.fromEntries(
  GRAMMAR_POINTS.map((point) => [point.id, point])
);

export function buildDetectedGrammarPoint(id, evidence = '', confidence = 0.72) {
  const point = GRAMMAR_POINT_BY_ID[id];
  if (!point) return null;
  return {
    id: point.id,
    label: point.label,
    groupId: point.groupId,
    groupLabel: point.groupLabel,
    evidence,
    confidence,
    actions: ['learn', 'practice'],
  };
}
