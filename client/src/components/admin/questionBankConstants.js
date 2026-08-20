export const RESOURCE_TABS = [
  { id: 'modules', label: '科目' },
  { id: 'learning-systems', label: '备考目标' },
  { id: 'categories', label: '知识分类' },
  { id: 'difficulties', label: '难度等级' },
  { id: 'tags', label: '题目标签' },
  { id: 'knowledge-points', label: '知识点' },
];

export const EMPTY_META = {
  modules: [],
  systems: [],
  categories: [],
  difficulties: [],
  tags: [],
  knowledge_points: [],
};

export const BASE_FORM = {
  code: '',
  name: '',
  icon: '',
  color: '',
  description: '',
  sort_order: 0,
  status: 'active',
};

export const MATERIAL_FORM = {
  title: '',
  module_id: '',
  material_type: 'article',
  content: '',
  audio_url: '',
  video_url: '',
  image_url: '',
  attachment_url: '',
  source: '',
  status: 'active',
};

export const QUESTION_FORM = {
  title: '',
  module_id: '',
  system_id: '',
  category_id: '',
  difficulty_id: '',
  question_type: '',
  content: '',
  material_id: '',
  answer: '',
  analysis: '',
  score: '',
  estimated_time: '',
  source_label: '',
  is_official: false,
  status: 'active',
  tag_ids: [],
  material_ids: [],
  knowledge_point_ids: [],
  ext: {},
};

export const BATCH_DEFAULTS = {
  module_id: '',
  system_id: '',
  category_id: '',
  difficulty_id: '',
  question_type: '',
  tag_ids: [],
  knowledge_point_ids: [],
};

export const MODULE_QUESTION_TYPES = {
  writing: [
    { value: 'practical', label: '应用文' },
    { value: 'narrative', label: '叙事文' },
    { value: 'argumentative', label: '议论文' },
    { value: 'integrated', label: '综合写作' },
  ],
  reading: [
    { value: 'single_choice', label: '单选题' },
    { value: 'multi_choice', label: '多选题' },
    { value: 'fill_blank', label: '填空题' },
    { value: 'short_answer', label: '简答题' },
    { value: 'matching', label: '匹配题' },
    { value: 'true_false', label: '判断题' },
  ],
  listening: [
    { value: 'single_choice', label: '单选题' },
    { value: 'multi_choice', label: '多选题' },
    { value: 'dictation', label: '听写' },
    { value: 'fill_blank', label: '填空/笔记' },
  ],
  translation: [
    { value: 'zh_to_en', label: '中译英' },
    { value: 'en_to_zh', label: '英译中' },
  ],
  speaking: [
    { value: 'description', label: '描述' },
    { value: 'discussion', label: '讨论' },
    { value: 'reading_aloud', label: '朗读' },
  ],
  grammar: [
    { value: 'single_choice', label: '单选题' },
    { value: 'multi_choice', label: '多选题' },
    { value: 'fill_blank', label: '填空题' },
    { value: 'error_correction', label: '改错题' },
  ],
  vocabulary: [
    { value: 'single_choice', label: '单选题' },
    { value: 'multi_choice', label: '多选题' },
    { value: 'fill_blank', label: '填空题' },
    { value: 'definition', label: '释义题' },
  ],
  phonetics: [
    { value: 'pronunciation', label: '发音练习' },
    { value: 'stress', label: '重音' },
    { value: 'intonation', label: '语调' },
  ],
};
