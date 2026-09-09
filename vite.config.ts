import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  server: { port: 5173 },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        v1: fileURLToPath(new URL('./v1.html', import.meta.url)),
        v2: fileURLToPath(new URL('./v2.html', import.meta.url)),
      },
    },
  },
});
