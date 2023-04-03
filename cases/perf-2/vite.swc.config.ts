import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    port: 5174,
  },
  cacheDir: 'node_modules/.vite-swc'
});
