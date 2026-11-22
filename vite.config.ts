import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { watch: { ignored: ['**/.playwright-cli/**', '**/output/playwright/**'] } },
  build: {
    rollupOptions: {
      output: { manualChunks: { charts: ['echarts/core', 'echarts/charts', 'echarts/components', 'echarts/renderers'] } },
    },
    chunkSizeWarningLimit: 650,
  },
});
