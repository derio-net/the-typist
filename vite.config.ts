import { defineConfig } from 'vitest/config';
import { listsPlugin } from './tools/vite-plugin-lists';

export default defineConfig({
  base: '/the-typist/',
  plugins: [listsPlugin()],
  // CLI tests spawn tsx, which can take several seconds under parallel load
  test: { environment: 'node', include: ['tests/**/*.test.ts'], testTimeout: 60_000 },
});
