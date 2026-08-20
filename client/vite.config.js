/* global process */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ── Manual chunk rules ────────────────────────────────────────────────────────
// Each entry is [chunkName, pathSubstring | pathSubstring[]].
// Entries are evaluated in order; first match wins.
//
// IMPORTANT: when you rename or move a file that appears here you MUST update
// the matching substring.  The validateChunks plugin (below) warns at build
// time if any rule matches zero modules — making broken entries visible
// immediately rather than silently merging everything into the main bundle.

const CHUNK_RULES = [
  // FeedbackView — granular splits so users only download the analysis type they need
  ['feedback-overview',              '/src/components/FeedbackView/FeedbackOverview'],
  ['feedback-analysis-core',         ['/src/components/FeedbackView/AnalysisTab', '/src/components/FeedbackView/analysis-types/general/']],
  ['feedback-analysis-practical',    [
    '/src/components/FeedbackView/analysis-types/summary/',
    '/src/components/FeedbackView/analysis-types/speech/',
    '/src/components/FeedbackView/analysis-types/letter/',
    '/src/components/FeedbackView/analysis-types/report/',
    '/src/components/FeedbackView/analysis-types/notice/',
    '/src/components/FeedbackView/analysis-types/proposal/',
    '/src/components/FeedbackView/analysis-types/chart_writing/',
  ]],
  ['feedback-analysis-composition',  [
    '/src/components/FeedbackView/analysis-types/argumentative/',
    '/src/components/FeedbackView/analysis-types/expository/',
    '/src/components/FeedbackView/analysis-types/narrative/',
    '/src/components/FeedbackView/analysis-types/picture_writing/',
    '/src/components/FeedbackView/analysis-types/review/',
    '/src/components/FeedbackView/analysis-types/diary/',
  ]],
  ['feedback-continuation-planning', '/src/components/FeedbackView/analysis-types/continuation/ContinuationPlanningPanel'],
  ['feedback-continuation-resources','/src/components/FeedbackView/analysis-types/continuation/ContinuationResourceBank'],
  ['feedback-continuation-story-emotion', '/src/components/FeedbackView/analysis-types/continuation/ContinuationStoryEmotionPanel'],
  ['feedback-analysis-continuation', '/src/components/FeedbackView/analysis-types/continuation/'],
  ['feedback-print',                 '/src/components/FeedbackView/feedbackPrint'],
  ['feedback-ai-evaluation',         '/src/components/FeedbackView/FeedbackAIEvaluation'],
  ['feedback-deep-review',           '/src/components/FeedbackView/FeedbackDeepReviewSection'],
  ['feedback-sample-essay',          '/src/components/FeedbackView/FeedbackSampleEssaySection'],
  ['feedback-navigation',            '/src/components/FeedbackView/FeedbackNavigationSection'],
  ['feedback-view-core',             '/src/components/FeedbackView/'],

  // Writing workspace
  ['writing-teacher',  '/src/writing/core/TeacherSubstitutePanel'],
  ['writing-source',   ['/src/writing/core/WritingSourceSection', '/src/writing/core/AssignmentPanel', '/src/components/questions/QuestionSourceBrowser']],
  ['writing-editor',   '/src/writing/core/WritingEditorPanel'],
  ['writing-feedback', '/src/writing/core/FeedbackResultSection'],
  ['writing-core',     '/src/writing/'],
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchesRule(id, patterns) {
  const list = Array.isArray(patterns) ? patterns : [patterns];
  return list.some((p) => id.includes(p));
}

function resolveChunk(id) {
  if (id.includes('node_modules')) return undefined;
  for (const [chunk, patterns] of CHUNK_RULES) {
    if (matchesRule(id, patterns)) return chunk;
  }
  return undefined;
}

// ── Build-time validation plugin ─────────────────────────────────────────────
// Tracks which chunk rules matched at least one module.  If a rule is stale
// (file was renamed/deleted) it warns so the dead entry can be cleaned up.

function validateChunksPlugin() {
  const matched = new Set();

  return {
    name: 'validate-manual-chunks',
    generateBundle() {
      const unused = CHUNK_RULES
        .map(([name]) => name)
        .filter((name) => !matched.has(name));

      if (unused.length) {
        this.warn(
          `manualChunks: the following rules matched no modules — they may be ` +
          `stale after a rename and should be updated in vite.config.js:\n` +
          unused.map((n) => `  • ${n}`).join('\n')
        );
      }
    },
    // Hook into Rollup's module resolution to record matches
    resolveId(/* source, importer */) { return null; },
    transform(/* code, id */) { return null; },
    moduleParsed({ id }) {
      for (const [name, patterns] of CHUNK_RULES) {
        if (matchesRule(id, patterns)) {
          matched.add(name);
          break;
        }
      }
    },
  };
}

// ── Config ────────────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react(), validateChunksPlugin()],
  server: {
    host: '127.0.0.1',
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: resolveChunk,
      },
    },
  },
});
