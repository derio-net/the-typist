import { defineConfig } from '@playwright/test';

const URL = 'http://localhost:4173/the-typist/';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  use: { baseURL: URL },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: URL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
