const COMMON_PAGES = new Set([
  'privacy',
  'agreement',
  'refund',
  'account',
  'mine',
  'points',
  'portal',
  'explore',
  'resume',
  'megan',
  'skill-training',
  'language-foundation',
  'writing-manual',
  'writing-bank',
  'writing-refine-sentence',
  'writing-refine-structure',
  'grammar-analyzer',
  'grammar-courses',
  'grammar-practice',
  'grammar-progress',
  'grammar-quiz',
  'speaking',
  'speaking-progress',
  'reading-analyzer',
  'reading-practice',
  'reading-paper',
  'reading-courses',
  'reading-progress',
  'phonetics-camp',
  'phonetics-overview',
  'phonetics-sound',
  'phonetics-syllable',
  'phonetics-sentence',
  'phonetics-discourse',
  'phonetics-progress',
  'vocab-analyzer',
  'vocab-courses',
  'vocab-progress',
  'vocab-quiz',
  'vocab-resources',
  'listening-basics',
  'listening-advanced',
  'listening-practice',
  'listening-progress',
  'camp',
  'camp-course-detail',
  'camp-my-course-detail',
  'camp-redeem',
]);
const ADMIN_PAGES = new Set([
  ...COMMON_PAGES,
  'admin',
  'camp-management',
  'question-bank',
  'vocab-content',
  'messages',
]);
const PUBLIC_PAGES = new Set([
  'home',
  'portal',
  'explore',
  'resume',
  'megan',
  'skill-training',
  'language-foundation',
  'grammar-analyzer',
  'grammar-courses',
  'grammar-practice',
  'grammar-progress',
  'auth',
  'privacy',
  'agreement',
  'refund',
  'writing',
  'writing-manual',
  'writing-bank',
  'writing-refine-sentence',
  'writing-refine-structure',
  'grammar-quiz',
  'reading-analyzer',
  'reading-practice',
  'reading-paper',
  'reading-courses',
  'reading-progress',
  'phonetics-camp',
  'phonetics-overview',
  'phonetics-sound',
  'phonetics-syllable',
  'phonetics-sentence',
  'phonetics-discourse',
  'phonetics-progress',
  'vocab-analyzer',
  'vocab-courses',
  'vocab-progress',
  'vocab-quiz',
  'vocab-resources',
  'listening-basics',
  'listening-advanced',
  'listening-practice',
  'listening-progress',
  'camp',
  'camp-course-detail',
  'speaking',
  'speaking-progress',
  'plan',
]);
const PROTECTED_ROUTE_PLACEHOLDERS = new Set([
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
  'classes',
  'assignment-create',
  'teacher-writing-detail',
  'teacher-todo',
  'substitute-upload',
  'batch-grading',
  'account',
  'mine',
  'points',
  'quota',
  'admin',
  'camp-redeem',
  'camp-my-course-detail',
]);
const ANONYMOUS_RESOLVABLE_PAGES = new Set([
  ...PUBLIC_PAGES,
  ...PROTECTED_ROUTE_PLACEHOLDERS,
]);
const STUDENT_PAGES = new Set([
  ...COMMON_PAGES,
  'tasks',
  'growth',
  'writing',
  'records',
  'writing-bank',
  'quota',
]);
const TEACHER_PAGES = new Set([
	  ...COMMON_PAGES,
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
]);
const PARENT_PAGES = new Set([
  ...COMMON_PAGES,
  'parent-home',
  'quota',
]);

const STUDENT_RECORD_PAGES = new Set([
  'records',
  'grammar-progress',
  'reading-progress',
  'listening-progress',
  'vocab-progress',
  'phonetics-progress',
  'speaking-progress',
]);

const STUDENT_GROWTH_PAGES = new Set([
  'growth',
]);

const TEACHER_WORKBENCH_PAGES = new Set([
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
]);

const TEACHER_PREP_PAGES = new Set([
  'teacher-prep',
  'writing',
  'writing-bank',
  'writing-refine-sentence',
  'writing-refine-structure',
  'grammar-analyzer',
  'grammar-courses',
  'grammar-practice',
  'grammar-progress',
  'grammar-quiz',
  'reading-analyzer',
  'reading-practice',
  'reading-paper',
  'reading-courses',
  'reading-progress',
  'phonetics-camp',
  'phonetics-overview',
  'phonetics-sound',
  'phonetics-syllable',
  'phonetics-sentence',
  'phonetics-discourse',
  'phonetics-progress',
  'vocab-analyzer',
    'vocab-courses',
    'vocab-progress',
    'vocab-quiz',
  'vocab-resources',
  'listening-basics',
  'listening-advanced',
  'listening-practice',
  'listening-progress',
  'speaking',
  'speaking-progress',
]);

function isStudentSkillTrainingPage(activePage) {
  return activePage === 'tasks'
    || activePage === 'skill-training'
    || STUDENT_RECORD_PAGES.has(activePage)
    || activePage === 'writing'
    || activePage === 'writing-bank'
    || activePage.startsWith('writing-refine')
    || activePage.startsWith('reading')
    || activePage.startsWith('listening')
    || activePage.startsWith('vocab')
    || activePage.startsWith('speaking');
}

function isStudentFoundationPage(activePage) {
  return (activePage === 'language-foundation'
    || activePage.startsWith('grammar')
    || activePage.startsWith('phonetics'))
    && !STUDENT_RECORD_PAGES.has(activePage);
}

export function isNavActive(itemId, activePage, role) {
  if (role === 'teacher') {
    if (itemId === 'workbench') return TEACHER_WORKBENCH_PAGES.has(activePage);
    if (itemId === 'teacher-prep') return TEACHER_PREP_PAGES.has(activePage);
    return activePage === itemId;
  }
  if (itemId === 'growth') return STUDENT_GROWTH_PAGES.has(activePage);
  if (itemId === 'tasks' || itemId === 'skill-training') return isStudentSkillTrainingPage(activePage);
  if (itemId === 'language-foundation') return isStudentFoundationPage(activePage);
  return activePage === itemId;
}

export function getDefaultPage(role) {
  if (role === 'admin') return 'admin';
  if (role === 'teacher') return 'workbench';
  if (role === 'parent') return 'parent-home';
  if (role === 'student') return 'skill-training';
  return 'portal';
}

export function isLoginRequiredPage(page) {
  return [
	    'tasks',
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
    'question-bank',
    'vocab-content',
    'messages',
    'classes',
    'assignment-create',
    'teacher-writing-detail',
    'teacher-todo',
    'substitute-upload',
    'batch-grading',
	    'account',
	    'mine',
	    'points',
	    'quota',
	    'admin',
    'camp-redeem',
    'camp-my-course-detail',
  ].includes(page);
}

export function isValidPage(page, role = null, options = {}) {
  if (!page) return false;
  if (options.isAdmin) return ADMIN_PAGES.has(page);
  if (role === 'teacher') return TEACHER_PAGES.has(page);
  if (role === 'parent') return PARENT_PAGES.has(page);
  if (role === 'student') return STUDENT_PAGES.has(page);
  return ANONYMOUS_RESOLVABLE_PAGES.has(page);
}

export function normalizePage(page, role = null, options = {}) {
  const effectiveRole = options.isAdmin ? 'admin' : role;
  const defaultPage = getDefaultPage(effectiveRole);
  if (!page) {
    return defaultPage;
  }
  if (page === 'portal' && effectiveRole) {
    return defaultPage;
  }

  const legacyMap = {
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
    manage: role === 'teacher' ? 'classes' : 'growth',
    batch: role === 'teacher' ? 'batch-grading' : 'writing',
    questions: role === 'teacher' ? 'workbench' : 'writing',
  };

  const resolvedPage = legacyMap[page] || page;
  const result = isValidPage(resolvedPage, role, options) ? resolvedPage : defaultPage;
  return result;
}

export function getNavItems(role) {
  if (role === 'admin') {
    return [
      { id: 'admin', icon: 'workbench', label: '平台' },
      { id: 'camp-management', icon: 'book-open', label: '课程' },
      { id: 'explore', icon: 'compass', label: '探索' },
    ];
  }
  if (role === 'parent') {
    return [
      { id: 'parent-home', icon: 'records', label: '家长端' },
      { id: 'explore', icon: 'compass', label: '探索' },
    ];
  }
	  if (role === 'teacher') {
	    return [
	      { id: 'workbench', icon: 'workbench', label: '工作台' },
	      { id: 'teacher-prep', icon: 'book-open', label: '备课' },
	      { id: 'teacher-data', icon: 'records', label: '数据' },
	      { id: 'explore', icon: 'compass', label: '探索' },
	    ];
  }

  return [
    { id: 'skill-training', icon: 'tasks', label: '备考' },
    { id: 'language-foundation', icon: 'book-open', label: '基础' },
    { id: 'growth', icon: 'records', label: '成长' },
    { id: 'explore', icon: 'compass', label: '探索' },
  ];
}

export function getMobileNavLabels(role) {
  if (role === 'admin') {
    return {
      admin: '平台',
      'camp-management': '课程',
      explore: '探索',
    };
  }
  if (role === 'parent') {
    return {
      'parent-home': '家长',
      explore: '探索',
    };
  }
	  if (role === 'teacher') {
	    return {
	      workbench: '工作台',
	      'teacher-prep': '备课',
	      'teacher-data': '数据',
	      explore: '探索',
	    };
  }

  return {
    'skill-training': '备考',
    'language-foundation': '基础',
    growth: '成长',
    explore: '探索',
  };
}
