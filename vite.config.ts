import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/the-typist/',
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
