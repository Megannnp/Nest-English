import { defineConfig, devices } from '@playwright/test';

// E2E 运行在一台专用的 vite 实例上（端口 5199，避开日常 5173）。
// touch-targets 与 smoke 用例只依赖前端，不需要后端；main-chain 用例把
// 后端接口用 route 拦截打桩，因此整套 E2E 不连真实数据库、不打付费 AI 接口，
// 可以在 CI 里无限制运行。
const PORT = 5199;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'on-first-retry',
  },
  // 单一 chromium 项目；触控用例在自己内部把视口切到 375×812，精确复现
  // 手动核验时用的窗口，避免多项目把每个 spec 都跑两遍。
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
