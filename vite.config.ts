import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/webhook': {
        target: 'https://n8n.apoioservidoria.top',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/webhook/, '/webhook'),
      },
      '/api/bling': {
        target: 'https://api.bling.com.br/Api/v3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bling/, ''),
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer a2d967bd60c1172d85388664d3c54a05d19b6e43'
        }
      }
    }
  }
})
