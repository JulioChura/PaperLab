import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// `npm run dev:https` sirve por HTTPS (certificado local): los celulares solo permiten la cámara en contextos seguros.
const https = process.env.HTTPS === '1'
// Backend al que redirige /api (las pruebas e2e levantan uno propio en otro puerto)
const apiTarget = process.env.PAPERLAB_API ?? 'https://paperlab-backend.onrender.com'

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
      // /api/analyze/physics -> https://paperlab-backend.onrender.com/analyze/physics
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
