import { test } from '@playwright/test';
import { openModule, pickExample, scan } from './helpers';

/** Capturas para revisión visual (no afirma nada): PW_SCREENS=1 npx playwright test e2e/screens.spec.ts */
test.skip(!process.env.PW_SCREENS, 'solo bajo demanda');

test('capturas @mobile', async ({ page }, info) => {
  const shot = (n: string) => page.screenshot({ path: `../docs/screens/${info.project.name}-${n}.png` });
  await openModule(page, 'circuits');
  await pickExample(page, 'error', 'error_short_circuit');
  await scan(page);
  await page.waitForTimeout(3500);
  await shot('error-cortocircuito');
  await openModule(page, 'physics');
  await pickExample(page, 'mission', 'mission_flag_12m');
  await scan(page);
  await page.waitForTimeout(900);
  await shot('mision-cumplida');
  await page.getByTestId('mission-stamp').click();
  await page.getByTestId('xp-chip').click();
  await page.waitForTimeout(400);
  await shot('perfil');
  await page.keyboard.press('Escape');
  await page.goto('/');
  await page.getByRole('button', { name: /Abrir Laboratorio/ }).click();
  await shot('menu');
});
