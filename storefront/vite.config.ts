import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Restaurant-saas backend runs on port 3006 (see backend/.env PORT). The admin-panel
// uses Vite's default 5173, so we pick 5176 to avoid collisions when both are running.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5176,
    proxy: {
      '/api': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3006',
        changeOrigin: true,
      },
    },
  },
});
