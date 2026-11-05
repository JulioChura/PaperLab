// Uso: node scan.tmp.mjs <outDir> <query> [ancho] [alto] [query param extra]
// query = "module:level:testid,module:level:testid" | "all" | "all:module"
import { chromium } from '@playwright/test';
const [out, query, wArg, hArg, extra = ''] = process.argv.slice(2);
const vp = { width: Number(wArg ?? 1440), height: Number(hArg ?? 900) };
const MOD_INDEX = { physics: '01', circuits: '02', flowcharts: '03', math: '04' };

const browser = await chromium.launch({ channel: 'msedge', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });

async function openModule(page, mod) {
  await page.addInitScript(() => {
    localStorage.setItem('paperlab-theme', 'light');
  });
  await page.goto(`http://localhost:5173/${extra}`);
  await page.getByText('Abrir el laboratorio').click();
  await page.waitForTimeout(500);
  await page.locator('button[aria-pressed]').filter({ hasText: MOD_INDEX[mod] }).click();
  await page.waitForTimeout(400);
  await page.getByText('Abrir cámara').click();
  await page.waitForTimeout(1200);
}

async function listCases(mod) {
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  await openModule(page, mod);
  const cases = [];
  await page.getByTestId('open-examples').click();
  for (const lv of ['1', '2', 'error', 'mission']) {
    await page.getByTestId(`examples-tab-${lv}`).click();
    await page.waitForTimeout(150);
    const ids = await page.locator('[data-testid^="example-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').slice(8)));
    for (const id of ids) cases.push(`${mod}:${lv}:${id}`);
  }
  await ctx.close();
  return cases;
}

let cases;
if (query.startsWith('all')) {
  const mods = query.includes(':') ? [query.split(':')[1]] : Object.keys(MOD_INDEX);
  cases = [];
  for (const m of mods) cases.push(...(await listCases(m)));
} else cases = query.split(',');

for (const c of cases) {
  const [mod, lv, id] = c.split(':');
  const ctx = await browser.newContext({ viewport: vp });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text().slice(0, 160));
    if (m.text().includes('Espacio de la hoja')) errs.push('layout: ' + m.text().slice(14, 160));
  });
  try {
    await openModule(page, mod);
    await page.getByTestId('open-examples').click();
    await page.getByTestId(`examples-tab-${lv}`).click();
    await page.getByTestId(`example-${id}`).click();
    await page.waitForTimeout(900);
    await page.getByTestId('scan-button').click();
    await page.waitForTimeout(Number(process.env.WAIT ?? 11000));
    await page.screenshot({ path: `${out}/${mod}-${lv}-${id}.png` });
    console.log(`${c}  ${errs.filter((e) => !e.includes('getUserMedia')).join(' | ') || 'ok'}`);
  } catch (e) {
    console.log(`${c}  FAIL ${String(e.message).slice(0, 120)}`);
  }
  await ctx.close();
}
await browser.close();
