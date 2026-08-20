const LEGAL_PAGES = ['privacy', 'agreement', 'refund'];
const PUBLIC_ENTRY_PAGES = ['home', 'portal', 'explore', 'resume', 'megan', 'skill-training', 'language-foundation', 'plan', 'auth'];
const ACCOUNT_PAGES = ['account', 'mine', 'points'];
const WRITING_PAGES = ['writing', 'writing-manual', 'writing-bank', 'writing-refine-sentence', 'writing-refine-structure'];
const GRAMMAR_PAGES = ['grammar-analyzer', 'grammar-courses', 'grammar-practice', 'grammar-progress', 'grammar-quiz'];
const READING_PAGES = ['reading-analyzer', 'reading-practice', 'reading-paper', 'reading-courses', 'reading-progress'];
const PHONETICS_PAGES = ['phonetics-camp', 'phonetics-overview', 'phonetics-sound', 'phonetics-syllable', 'phonetics-sentence', 'phonetics-discourse', 'phonetics-progress'];
const VOCAB_PAGES = ['vocab-analyzer', 'vocab-courses', 'vocab-progress', 'vocab-quiz', 'vocab-resources'];
const LISTENING_PAGES = ['listening-basics', 'listening-advanced', 'listening-practice', 'listening-progress'];
const SPEAKING_PAGES = ['speaking', 'speaking-progress'];
const CAMP_PAGES = ['camp', 'camp-course-detail', 'camp-my-course-detail', 'camp-redeem'];

export const COMMON_PAGES = [
  ...LEGAL_PAGES,
  ...ACCOUNT_PAGES,
  ...PUBLIC_ENTRY_PAGES.filter((page) => page !== 'home' && page !== 'auth'),
  ...WRITING_PAGES.filter((page) => page !== 'writing'),
  ...GRAMMAR_PAGES,
  ...SPEAKING_PAGES,
  ...READING_PAGES,
  ...PHONETICS_PAGES,
  ...VOCAB_PAGES,
  ...LISTENING_PAGES,
  ...CAMP_PAGES,
];

export const ADMIN_EXTRA_PAGES = ['admin', 'camp-management', 'question-bank', 'vocab-content', 'messages'];

export const PUBLIC_PAGES = [
  ...PUBLIC_ENTRY_PAGES,
  ...LEGAL_PAGES,
  ...WRITING_PAGES,
  ...GRAMMAR_PAGES,
  ...READING_PAGES,
  ...PHONETICS_PAGES,
  ...VOCAB_PAGES,
  ...LISTENING_PAGES,
  'camp',
  'camp-course-detail',
  ...SPEAKING_PAGES,
];

export const PROTECTED_ROUTE_PLACEHOLDERS = [
  'tasks',
  'growth',
  'records',
  'workbench',
  'parent-home',
  'teacher-prep',
  'teacher-data',
  'grammar-workbench',
  'reading-workbench',
  'listening-workbench',
  'vocab-workbench',
  'phonetics-workbench',
  'speaking-workbench',
  'camp-management',
  'classes',
  'assignment-create',
  'teacher-writing-detail',
  'teacher-todo',
  'substitute-upload',
  'batch-grading',
  ...ACCOUNT_PAGES,
  'quota',
  'admin',
  'camp-redeem',
  'camp-my-course-detail',
];

export const STUDENT_EXTRA_PAGES = ['tasks', 'growth', 'writing', 'records', 'writing-bank', 'quota'];
export const TEACHER_EXTRA_PAGES = [
  'workbench',
  'teacher-prep',
  'teacher-data',
  'grammar-workbench',
  'reading-workbench',
  'listening-workbench',
  'vocab-workbench',
  'phonetics-workbench',
  'speaking-workbench',
  'classes',
  'assignment-create',
  'teacher-writing-detail',
  'teacher-todo',
  'writing',
  'writing-bank',
  'substitute-upload',
  'batch-grading',
];
export const PARENT_EXTRA_PAGES = ['parent-home', 'quota'];

export const STUDENT_GROWTH_PAGES = [
  'growth',
  'records',
  'grammar-progress',
  'reading-progress',
  'listening-progress',
  'vocab-progress',
  'phonetics-progress',
  'speaking-progress',
];

export const TEACHER_WORKBENCH_PAGES = [
  'workbench',
  'grammar-workbench',
  'reading-workbench',
  'listening-workbench',
  'vocab-workbench',
  'phonetics-workbench',
  'speaking-workbench',
  'assignment-create',
  'teacher-writing-detail',
  'teacher-todo',
  'substitute-upload',
  'batch-grading',
];

export const TEACHER_PREP_PAGES = [
  'teacher-prep',
  ...WRITING_PAGES.filter((page) => page !== 'writing-manual'),
  ...GRAMMAR_PAGES,
  ...READING_PAGES,
  ...PHONETICS_PAGES,
  ...VOCAB_PAGES,
  ...LISTENING_PAGES,
  ...SPEAKING_PAGES,
];

export const LEGACY_PAGE_MAP = {
  'writing-home': 'writing-refine-sentence',
  'writing-manual': 'writing',
  'writing-refine': 'writing-refine-sentence',
  grammar: 'grammar-analyzer',
  reading: 'reading-analyzer',
  phonetics: 'phonetics-overview',
  vocab: 'vocab-analyzer',
  'vocab-reading': 'vocab-resources',
  'vocab-writing': 'vocab-resources',
  'vocab-synonym': 'vocab-resources',
  'vocab-import': 'vocab-resources',
  'vocab-flashcard': 'vocab-quiz',
  listening: 'listening-basics',
};

export const NAV_ITEMS_BY_ROLE = {
  admin: [
    { id: 'admin', icon: 'workbench', label: '平台' },
    { id: 'camp-management', icon: 'book-open', label: '课程' },
    { id: 'explore', icon: 'compass', label: '探索' },
  ],
  parent: [
    { id: 'parent-home', icon: 'records', label: '家长端' },
    { id: 'explore', icon: 'compass', label: '探索' },
  ],
  teacher: [
    { id: 'workbench', icon: 'workbench', label: '工作台' },
    { id: 'teacher-prep', icon: 'book-open', label: '备课' },
    { id: 'teacher-data', icon: 'records', label: '数据' },
    { id: 'explore', icon: 'compass', label: '探索' },
  ],
  student: [
    { id: 'skill-training', icon: 'tasks', label: '备考' },
    { id: 'language-foundation', icon: 'book-open', label: '基础' },
    { id: 'growth', icon: 'records', label: '成长' },
    { id: 'explore', icon: 'compass', label: '探索' },
  ],
};

export const MOBILE_NAV_LABELS_BY_ROLE = {
  admin: { admin: '平台', 'camp-management': '课程', explore: '探索' },
  parent: { 'parent-home': '家长', explore: '探索' },
  teacher: { workbench: '工作台', 'teacher-prep': '备课', 'teacher-data': '数据', explore: '探索' },
  student: { 'skill-training': '备考', 'language-foundation': '基础', growth: '成长', explore: '探索' },
};
