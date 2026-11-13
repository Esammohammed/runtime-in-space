import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(here, 'src'),
      // Shared medical content lives one level up, next to the services.
      '@content': path.resolve(here, '../content'),
    },
  },
  server: { port: 5173, fs: { allow: ['..'] } },
});
