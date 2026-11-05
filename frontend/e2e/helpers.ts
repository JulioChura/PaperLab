import { expect, type Page } from '@playwright/test';

export const MODULE_TITLES: Record<string, string> = {
  physics: 'Física Vectorial',
  circuits: 'Circuitos Eléctricos',
  flowcharts: 'Algoritmos y Flujo',
  math: 'Matemáticas Pre-U',
};

/** Registra errores de consola/página para fallar la prueba si algo explota. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|Failed to load resource|MindAR|mind-ar|net::ERR/i.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

/** Sustituye speechSynthesis por un doble que registra lo que se "dice". */
export async function stubSpeech(page: Page) {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
    class FakeUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(t: string) {
        this.text = t;
      }
    }
    const synth = {
      speaking: false,
      speak(u: FakeUtterance) {
        spoken.push(u.text);
        setTimeout(() => u.onend?.(), 30);
      },
      cancel() {},
      getVoices: () => [{ lang: 'es-ES', name: 'Fake ES' }],
      addEventListener() {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true });
  });
}

export const spokenText = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.join(' '));

/** Splash → menú → módulo → cámara. */
export async function openModule(page: Page, module: string) {
  await page.goto('/');
  await page.getByRole('button', { name: /Abrir Laboratorio/ }).click();
  await page.getByText(MODULE_TITLES[module], { exact: true }).first().click();
  await page.getByRole('button', { name: /Activar Cámara o Subir Foto/ }).click();
  await expect(page.getByTestId('scan-button')).toBeVisible();
}

export async function pickExample(page: Page, tab: '1' | '2' | 'error' | 'mission', id: string) {
  await page.getByTestId('open-examples').click();
  await page.getByTestId(`examples-tab-${tab}`).click();
  await page.getByTestId(`example-${id}`).click();
  await expect(page.getByText(/Foto lista para resolver/)).toBeVisible();
}

export async function scan(page: Page) {
  await page.getByTestId('scan-button').click();
  await expect(page.getByTestId('ar-panel')).toBeVisible({ timeout: 20_000 });
}

export const xp = async (page: Page) => Number((await page.getByTestId('xp-chip').getAttribute('aria-label'))?.match(/(\d+) puntos/)?.[1] ?? NaN);
