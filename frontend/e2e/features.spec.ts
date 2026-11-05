import { expect, test } from '@playwright/test';
import { openModule, pickExample, scan, spokenText, stubSpeech, trackErrors, xp } from './helpers';

test.describe('Tutor Socrático (Lumi)', () => {
  test('Lumi saluda la primera vez y da consejos en la cámara @mobile', async ({ page }) => {
    const errors = trackErrors(page);
    await openModule(page, 'physics');
    const bubble = page.getByTestId('tutor-bubble');
    await expect(bubble).toContainText('¡Hola! Soy Lumi');
    await page.getByRole('button', { name: 'Dato curioso' }).click();
    await expect(page.getByTestId('tutor-fact')).not.toBeEmpty();
    expect(errors).toEqual([]);
  });

  test('cortocircuito: holograma de advertencia + pregunta socrática (sin error 400) @mobile', async ({ page }) => {
    const errors = trackErrors(page);
    await openModule(page, 'circuits');
    await pickExample(page, 'error', 'error_short_circuit');
    await scan(page);
    await expect(page.getByTestId('warning-hologram')).toBeVisible();
    await expect(page.getByTestId('warning-hologram')).toContainText('Cortocircuito');
    await expect(page.getByTestId('tutor-bubble')).toHaveAttribute('data-tone', 'error');
    await expect(page.getByTestId('tutor-question')).toHaveText(/¿Qué ocurriría con la batería si cerramos este circuito\?/);
    await expect(page.getByTestId('ar-summary')).toContainText('Cortocircuito');
    // pista socrática
    await page.getByRole('button', { name: 'Pista' }).click();
    await expect(page.getByTestId('tutor-hint')).toContainText('I = V/R');
    // la simulación permite "corregir" la falla
    await page.getByRole('button', { name: 'Corregir' }).click();
    expect(errors).toEqual([]);
  });

  test('fricción estática: el bloque no desliza y Lumi pregunta el ángulo mínimo', async ({ page }) => {
    await openModule(page, 'physics');
    await pickExample(page, 'error', 'error_static_friction');
    await scan(page);
    await expect(page.getByTestId('warning-hologram')).toContainText('El bloque no desliza');
    await expect(page.getByTestId('tutor-question')).toContainText('¿Qué ángulo mínimo necesitas para que el bloque comience a deslizar?');
  });

  test('ejercicio correcto: sin holograma, con felicitación y reto socrático', async ({ page }) => {
    await openModule(page, 'physics');
    await pickExample(page, '1', 'simple_pendulum');
    await scan(page);
    await expect(page.getByTestId('warning-hologram')).toHaveCount(0);
    await expect(page.getByTestId('tutor-text')).toContainText('El período (2.46 s)');
    await expect(page.getByTestId('tutor-question')).toContainText('¿Qué longitud debería tener el hilo');
  });

  test('backend real: foto subida → el backend detecta el cortocircuito y escribe la pregunta', async ({ page }) => {
    const errors = trackErrors(page);
    await openModule(page, 'circuits');
    await page.locator('input[type="file"]').setInputFiles('../ejemplos/2_circuitos/single_loop.jpg');
    await expect(page.getByText(/Foto lista para resolver/)).toBeVisible();
    const resp = page.waitForResponse((r) => r.url().includes('/api/analyze/circuits'));
    await page.getByTestId('scan-button').click();
    const body = await (await resp).json();
    expect(body.tutor.has_error).toBe(true);
    expect(body.tutor.error_type).toBe('short_circuit');
    await expect(page.getByTestId('ar-panel')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('warning-hologram')).toBeVisible();
    await expect(page.getByTestId('tutor-question')).toHaveText(/¿Qué ocurriría con la batería si cerramos este circuito\?/);
    expect(errors).toEqual([]);
  });

  test('backend real: bucle infinito, triángulo imposible y rampa en reposo', async ({ page }) => {
    for (const [module, file, label] of [
      ['flowcharts', '../ejemplos/3_algoritmos/loop_flowchart.jpg', 'Bucle infinito'],
      ['math', '../ejemplos/4_matematicas/geometric_angles.jpg', 'Triángulo imposible'],
      ['physics', '../ejemplos/1_fisica/inclined_plane.jpg', 'El bloque no desliza'],
    ] as const) {
      await openModule(page, module);
      await page.locator('input[type="file"]').setInputFiles(file);
      await scan(page);
      await expect(page.getByTestId('warning-hologram')).toContainText(label);
      await expect(page.getByTestId('tutor-question')).toContainText('?');
    }
  });
});

test.describe('Audio-Explicación STEM', () => {
  test('el altavoz lee la simulación y la telemetría en español @mobile', async ({ page }) => {
    await stubSpeech(page);
    await openModule(page, 'physics');
    await pickExample(page, '1', 'simple_pendulum');
    await scan(page);
    await page.getByTestId('narrate-button').click();
    await expect.poll(() => spokenText(page)).toContain('Simulación en curso');
    const text = await spokenText(page);
    expect(text).toContain('El péndulo de 1,5 metros oscila con un período de 2,46 segundos');
    expect(text).toContain('metros por segundo en el punto de equilibrio');
    expect(text).toContain('Telemetría en este instante');
    expect(text).not.toMatch(/m\/s|θ|√/);
    // logro de accesibilidad
    await expect(page.getByTestId('toast-achievement').filter({ hasText: 'Oído científico' })).toBeVisible();
  });

  test('Lumi también lee su mensaje en voz alta', async ({ page }) => {
    await stubSpeech(page);
    await openModule(page, 'circuits');
    await page.getByTestId('tutor-bubble').getByRole('button', { name: /Leer el mensaje en voz alta/ }).click();
    await expect.poll(() => spokenText(page)).toContain('Soy Lumi');
  });
});

test.describe('Modo Reto / Misiones', () => {
  test('misión desde el menú → dibujo que cumple → sello holográfico, XP y logro @mobile', async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto('/');
    await page.getByRole('button', { name: /Abrir Laboratorio/ }).click();
    const before = await xp(page);
    await page.getByTestId('mission-start-physics_flag_12m').click();
    await expect(page.getByTestId('active-mission-chip')).toContainText('La bandera a 12 metros');
    await expect(page.getByTestId('tutor-bubble')).toContainText('Misión: La bandera a 12 metros');
    await pickExample(page, 'mission', 'mission_flag_12m');
    await scan(page);
    await expect(page.getByTestId('mission-stamp')).toBeVisible();
    await expect(page.getByTestId('mission-stamp')).toContainText('¡Misión');
    await expect(page.getByTestId('mission-stamp-xp')).toHaveText(/\+(100|200) XP/);
    // notificaciones (en móvil solo se muestran las 2 más recientes)
    await expect(page.locator('[data-testid="toast-mission"], [data-testid="toast-achievement"], [data-testid="toast-level"]').first()).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('paperlab-progress-v1') ?? '{}'));
    expect(stored.achievements.first_mission).toBeTruthy();
    expect(stored.completedMissions).toContain('physics_flag_12m');
    expect(await xp(page)).toBeGreaterThanOrEqual(before + 100);
    await expect(page.getByTestId('active-mission-chip')).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('misión fallida: Lumi dice cuánto falta y hace una pregunta', async ({ page }) => {
    await openModule(page, 'physics');
    await pickExample(page, 'mission', 'mission_flag_12m_miss');
    await scan(page);
    await expect(page.getByTestId('mission-stamp')).toHaveCount(0);
    await expect(page.getByTestId('tutor-bubble')).toContainText('te faltan 1.8 m');
    await expect(page.getByTestId('tutor-question')).toContainText('?');
    await expect(page.getByTestId('active-mission-chip')).toBeVisible();
  });

  test('misión que exige equilibrio: el "error" esperado no muestra advertencia', async ({ page }) => {
    await openModule(page, 'physics');
    await page.getByTestId('open-missions').click();
    await page.getByTestId('mission-physics_ramp_still').getByRole('button', { name: 'Probar con ejemplo' }).click();
    await expect(page.getByText(/Foto lista para resolver/)).toBeVisible();
    await scan(page);
    await expect(page.getByTestId('mission-stamp')).toBeVisible();
    await expect(page.getByTestId('warning-hologram')).toHaveCount(0);
  });

  test('todas las misiones se pueden cumplir con su ejemplo', async ({ page }) => {
    test.setTimeout(180_000);
    const ids: [string, string][] = [
      ['physics', 'physics_pendulum_2s'], ['circuits', 'circuit_switch_one_led'], ['circuits', 'circuit_safe_led'],
      ['flowcharts', 'flow_sum_1_10'], ['flowcharts', 'flow_even_odd'], ['math', 'math_vertex'], ['math', 'math_liter_can'],
    ];
    for (const [module, id] of ids) {
      await openModule(page, module);
      await page.getByTestId('open-missions').click();
      await page.getByTestId(`mission-${id}`).getByRole('button', { name: 'Probar con ejemplo' }).click();
      await scan(page);
      await expect(page.getByTestId('mission-stamp'), id).toBeVisible();
      await page.getByTestId('mission-stamp').click();
    }
  });

  test('perfil: logros, nivel y notificaciones del sistema', async ({ page, context }) => {
    await context.grantPermissions(['notifications']);
    await openModule(page, 'math');
    await pickExample(page, '2', 'geometry_3d');
    await scan(page);
    await expect(page.getByTestId('toast-achievement').first()).toBeVisible();
    await page.getByTestId('xp-chip').click();
    const panel = page.getByTestId('profile-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId('achievement-first_scan')).toHaveAttribute('data-unlocked', 'true');
    await expect(panel.getByTestId('achievement-level2')).toHaveAttribute('data-unlocked', 'true');
    await panel.getByRole('button', { name: /Notificaciones del sistema/ }).click();
    await expect(panel.getByText('Activadas')).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('paperlab-progress-v1') ?? '{}'));
    expect(stored.settings.nativeNotifications).toBe(true);
    expect(stored.stats.scans).toBe(1);
  });
});
