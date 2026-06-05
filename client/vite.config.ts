import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://vishvyash-agrotech-erp.onrender.com',
        changeOrigin: true,
      },
      '/pdfs': {
        target: 'https://vishvyash-agrotech-erp.onrender.com',
        changeOrigin: true,
      },
    },
  },
});
