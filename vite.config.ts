import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: '/demo/slides-agent/',
    define: {
      __API_BASE_URL__: JSON.stringify(env.API_BASE_URL ?? ''),
      __GOOGLE_CLIENT_ID__: JSON.stringify(env.GOOGLE_CLIENT_ID ?? ''),
    },
    plugins: [react(), tailwindcss()],
  }
})
