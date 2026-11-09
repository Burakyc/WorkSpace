import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'renderer',
          environment: 'jsdom',
          setupFiles: ['src/test/setup.ts'],
          // A file's first render is slow while every worker is busy; it must outlast the 5 s query wait in setup.ts.
          testTimeout: 20_000,
          // CSS is stubbed in tests; the contrast test reads the design tokens as raw text.
          css: { include: [/tokens\.css/] },
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        test: {
          name: 'electron',
          environment: 'node',
          include: ['electron/**/*.test.ts'],
        },
      },
    ],
  },
});
