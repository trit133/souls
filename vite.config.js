import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5181, strictPort: true }, // own port so it never collides with other local vite apps (threejs-devtools proxies this)
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 },
});
