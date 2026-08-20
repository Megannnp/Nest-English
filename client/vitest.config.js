import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    maxWorkers: 2,
    // e2e/ holds Playwright specs, which fail if vitest collects them.
    // Playwright runs them separately via playwright.config.js.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
