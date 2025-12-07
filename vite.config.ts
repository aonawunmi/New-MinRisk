import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 3000,
      // Enable SPA fallback for client-side routing
      // All 404s will serve index.html, letting React Router handle the route
      historyApiFallback: true,
    },
    preview: {
      port: 3000,
      // Same for production preview
      historyApiFallback: true,
    },
  };
})
