import { expect, test } from '@playwright/test';
import { openModule, pickExample, scan, trackErrors } from './helpers';

interface Item {
  module: string;
  level: string;
  id: string;
  hasError: boolean;
  missionId?: string;
}

/** Lee el catálogo de ejemplos directamente del código de la app (servido por Vite). */
async function catalog(page: import('@playwright/test').Page): Promise<Item[]> {
  await page.goto('/');
  return page.evaluate(async () => {
    const path = '/src/demo/examples.ts';
    const m = await import(/* @vite-ignore */ path);
    return (m.EXAMPLES as { module: string; level: string | number; id?: string; exercise_type: string; missionId?: string }[]).map((e) => ({
      module: e.module,
      level: String(e.level),
      id: e.id ?? e.exercise_type,
      hasError: !!m.exampleTutor(e)?.has_error,
      missionId: e.missionId,
    }));
  });
}

for (const module of ['physics', 'circuits', 'flowcharts', 'math']) {
  for (const level of ['1', '2', 'error', 'mission'] as const) {
    test(`${module} · ${level}: todos los ejemplos se simulan sobre la hoja con su tutor`, async ({ page }) => {
      test.setTimeout(240_000);
      const items = (await catalog(page)).filter((i) => i.module === module && i.level === level);
      expect(items.length, 'cada módulo tiene ejemplos en este nivel').toBeGreaterThan(0);
      const errors = trackErrors(page);
      await openModule(page, module);
      for (const it of items) {
        await test.step(it.id, async () => {
          await pickExample(page, level, it.id);
          await scan(page);
          await expect(page.getByTestId('ar-summary')).not.toBeEmpty();
          // La simulación termina de escribirse (sin errores)
          await expect(page.getByTestId('ar-panel')).not.toContainText('Preparando trazos', { timeout: 15_000 });
          const bubble = page.getByTestId('tutor-bubble');
          await expect(bubble).toBeVisible();
          await expect(bubble.getByTestId('tutor-text')).not.toBeEmpty();
          await expect(bubble.getByTestId('tutor-question')).toContainText('?');
          const missionOk = it.level === 'mission' && !it.id.endsWith('_miss');
          if (missionOk) {
            await expect(page.getByTestId('mission-stamp')).toBeVisible();
            await page.getByTestId('mission-stamp').click();
          }
          if (it.hasError && !missionOk) await expect(page.getByTestId('warning-hologram')).toBeVisible();
          else await expect(page.getByTestId('warning-hologram')).toHaveCount(0);
          await page.getByRole('button', { name: 'Escanear', exact: true }).click();
          expect(errors, `sin errores en ${it.id}`).toEqual([]);
        });
      }
    });
  }
}
