import { expect, test } from '@playwright/test';

/**
 * Modo aula: el docente crea una sala, los alumnos simulados se unen y un alumno REAL
 * (otra pestaña del mismo navegador) entra con el código y aparece en el tablero.
 */
test('el docente crea una sala, inicia la misión y ve el tablero en vivo', async ({ context, page }) => {
  await page.goto('/?docente');
  await page.getByTestId('session-name').fill('3° A · Prueba');
  await page.getByTestId('class-size').fill('12');
  await page.getByTestId('create-session').click();

  const code = (await page.getByTestId('room-code').innerText({ timeout: 10_000 })).trim();
  expect(code).toMatch(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);

  // alumno real en otra pestaña
  const student = await context.newPage();
  await student.goto(`/?sala=${code}`);
  await student.getByTestId('join-name').fill('Alumna Real');
  await student.getByTestId('join-submit').click();
  await expect(student.getByTestId('class-banner')).toBeVisible();

  await expect(page.getByText('Alumna Real', { exact: true })).toBeVisible();
  await expect(page.getByTestId('start-session')).toBeEnabled();
  await page.getByTestId('start-session').click();

  await page.getByTestId('speed-20').click();
  await expect(page.getByTestId('student-grid')).toBeVisible();
  await expect(page.getByTestId('live-feed').locator('li').first()).toBeVisible();
  await expect(student.getByTestId('class-banner')).toContainText('Misión 1/');

  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('end-session').click();
  await expect(page.getByTestId('insights')).toBeVisible();
  await expect(page.getByTestId('report-table')).toBeVisible();
});

test('un código inexistente ofrece la sala de demostración', async ({ page }) => {
  await page.goto('/?sala=zzz-zzzz-zzz');
  await page.getByTestId('join-name').fill('Invitado');
  await page.getByTestId('join-submit').click();
  await expect(page.getByTestId('join-error')).toBeVisible();
  await page.getByTestId('join-demo').click();
  await expect(page.getByTestId('class-banner')).toContainText('DEMO');
});
