import { defineConfig } from 'vitest/config';
import { listsPlugin } from './tools/vite-plugin-lists';

export default defineConfig({
  base: '/the-typist/',
  plugins: [listsPlugin()],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
