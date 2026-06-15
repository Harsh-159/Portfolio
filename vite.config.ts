/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Build date injected at build time, so the only "telemetry" on the site is honest.
const LAST_UPDATED = new Date().toISOString().slice(0, 10);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __LAST_UPDATED__: JSON.stringify(LAST_UPDATED),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
