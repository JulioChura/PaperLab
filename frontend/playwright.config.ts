import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas end-to-end de PaperLab.
 * - Frontend: Vite en :5179.
 * - Backend: la app FastAPI REAL en :8765 con un LLM simulado (backend/tests/e2e_server.py).
 * - Cámara: dispositivo falso de Chromium (no hace falta webcam).
 */
const PY = process.env.PAPERLAB_PYTHON ?? (process.platform === 'win32' ? '.venv\\Scripts\\python.exe' : '.venv/bin/python');

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // Cada página carga Three.js, MindAR y una cámara falsa: en paralelo compiten por CPU y dan falsos timeouts
  workers: Number(process.env.PW_WORKERS ?? 1),
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5179',
    channel: process.env.PW_CHANNEL ?? 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    permissions: ['camera'],
    launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, grep: /@mobile/ },
  ],
  webServer: [
    {
      command: `${PY} -m tests.e2e_server 8765`,
      cwd: '../backend',
      url: 'http://127.0.0.1:8765/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npx vite --port 5179 --strictPort',
      url: 'http://localhost:5179',
      env: { PAPERLAB_API: 'http://127.0.0.1:8765' },
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
