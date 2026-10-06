import { defineConfig } from '@playwright/test';

const URL = 'http://localhost:4173/the-typist/';
const CI = !!process.env.CI;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  forbidOnly: CI,
  use: {
    baseURL: URL,
    trace: 'retain-on-failure',
    // headless Chromium must stay silent on the operator's machine
    launchOptions: { args: ['--mute-audio'] },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    // CI builds in an earlier step; locally the server builds first
    command: CI ? 'npx vite preview --port 4173 --strictPort' : 'npm run build && npx vite preview --port 4173 --strictPort',
    url: URL,
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
});
