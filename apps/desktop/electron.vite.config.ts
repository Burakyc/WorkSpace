import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {
    build: {
      rollupOptions: { input: { index: resolve(__dirname, 'electron/main.ts') } },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'electron/preload.ts') },
        output: { format: 'cjs' },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src'),
    build: {
      rollupOptions: { input: resolve(__dirname, 'src/index.html') },
    },
    plugins: [react()],
  },
});
