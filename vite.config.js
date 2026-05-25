import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env + Vercel/CI process.env → import.meta.env.VITE_* (build zamanında gömülür)
  loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    envPrefix: 'VITE_',
  };
});
