export const LEARNING_MODULE_ALIASES = {
  vocab: 'vocabulary',
};

export const LEARNING_MODULES = new Set([
  'writing',
  'grammar',
  'reading',
  'vocabulary',
  'listening',
  'phonetics',
  'speaking',
  'camp',
]);

export function normalizeLearningModule(mod) {
  const normalized = String(mod || '').trim().toLowerCase();
  return LEARNING_MODULE_ALIASES[normalized] || normalized;
}
