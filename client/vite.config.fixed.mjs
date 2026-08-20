import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Redirect locked AuthPage.jsx to AuthPageFixed.jsx (uses 900px breakpoint)
      {
        find: /\/src\/components\/AuthPage\.jsx/,
        replacement: path.resolve(__dirname, 'src/components/AuthPageFixed.jsx'),
      },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            if (id.includes('/src/components/FeedbackView/FeedbackOverview')) return 'feedback-overview';
            if (id.includes('/src/components/FeedbackView/AnalysisTab') || id.includes('/src/components/FeedbackView/analysis-types/general/')) return 'feedback-analysis-core';
            if (id.includes('/src/components/FeedbackView/analysis-types/summary/') || id.includes('/src/components/FeedbackView/analysis-types/speech/') || id.includes('/src/components/FeedbackView/analysis-types/letter/') || id.includes('/src/components/FeedbackView/analysis-types/report/') || id.includes('/src/components/FeedbackView/analysis-types/notice/') || id.includes('/src/components/FeedbackView/analysis-types/proposal/') || id.includes('/src/components/FeedbackView/analysis-types/chart_writing/')) return 'feedback-analysis-practical';
            if (id.includes('/src/components/FeedbackView/analysis-types/argumentative/') || id.includes('/src/components/FeedbackView/analysis-types/expository/') || id.includes('/src/components/FeedbackView/analysis-types/narrative/') || id.includes('/src/components/FeedbackView/analysis-types/picture_writing/') || id.includes('/src/components/FeedbackView/analysis-types/review/') || id.includes('/src/components/FeedbackView/analysis-types/diary/')) return 'feedback-analysis-composition';
            if (id.includes('/src/components/FeedbackView/analysis-types/continuation/ContinuationPlanningPanel')) return 'feedback-continuation-planning';
            if (id.includes('/src/components/FeedbackView/analysis-types/continuation/ContinuationResourceBank')) return 'feedback-continuation-resources';
            if (id.includes('/src/components/FeedbackView/analysis-types/continuation/ContinuationStoryEmotionPanel')) return 'feedback-continuation-story-emotion';
            if (id.includes('/src/components/FeedbackView/analysis-types/continuation/')) return 'feedback-analysis-continuation';
            if (id.includes('/src/components/FeedbackView/feedbackPrint')) return 'feedback-print';
            if (id.includes('/src/components/FeedbackView/FeedbackAIEvaluation')) return 'feedback-ai-evaluation';
            if (id.includes('/src/components/FeedbackView/FeedbackDeepReview')) return 'feedback-deep-review';
            if (id.includes('/src/components/FeedbackView/FeedbackSampleEssay')) return 'feedback-sample-essay';
            if (id.includes('/src/components/FeedbackView/FeedbackNavigationSection')) return 'feedback-navigation';
            if (id.includes('/src/components/FeedbackView/')) return 'feedback-view-core';
            if (id.includes('/src/components/writing/TeacherSubstitutePanel')) return 'writing-teacher';
            if (id.includes('/src/components/writing/WritingSourceSection') || id.includes('/src/components/writing/AssignmentPanel') || id.includes('/src/components/questions/QuestionSourceBrowser')) return 'writing-source';
            if (id.includes('/src/components/writing/WritingEditorPanel')) return 'writing-editor';
            if (id.includes('/src/components/writing/')) return 'writing-core';
            if (id.includes('/src/components/writing-manage/')) return 'writing-manage';
          }
          return undefined;
        },
      },
    },
  },
});
