import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run dev:https` sirve por HTTPS (certificado local): los celulares solo permiten la cámara en contextos seguros.
const https = process.env.HTTPS === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    ...(https ? [basicSsl()] : []),
  ],
  server: {
    // Accesible desde el celular en la misma red (npm run dev -> http://<IP-PC>:5173)
    host: true,
    proxy: {
      // /api/analyze/physics -> http://localhost:8000/analyze/physics
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
