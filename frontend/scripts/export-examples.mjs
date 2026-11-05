/**
 * Exporta los ejemplos de `src/demo/examples.ts` a la carpeta `ejemplos/` (foto .jpg + respuesta .json
 * con la misma forma que devuelve el backend, incluido el campo `tutor`) y genera las imágenes del avatar
 * Lumi (SVG por expresión + lámina PNG) en `docs/lumi/`.
 *
 *   node scripts/export-examples.mjs            → JSON de todos + fotos que falten
 *   node scripts/export-examples.mjs --photos   → además vuelve a generar TODAS las fotos
 */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(root, '..', 'ejemplos');
const docs = resolve(root, '..', 'docs', 'lumi');
const allPhotos = process.argv.includes('--photos');

const MODULE_DIR = { physics: '1_fisica', circuits: '2_circuitos', flowcharts: '3_algoritmos', math: '4_matematicas' };
const LEVEL_DIR = { 1: '', 2: 'nivel_2', error: 'errores', mission: 'misiones' };
const exists = (p) => access(p).then(() => true, () => false);

const server = await createServer({ root, server: { port: 5188, strictPort: true }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chromium' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('http://localhost:5188/');

const items = await page.evaluate(async () => {
  const m = await import(/* @vite-ignore */ '/src/demo/examples.ts');
  await document.fonts.ready;
  return m.EXAMPLES.map((ex) => ({ ex: { module: ex.module, level: ex.level, id: ex.id, exercise_type: ex.exercise_type }, result: { title: ex.title, ...m.exampleToResult(ex) } }));
});

let photos = 0;
for (const { ex, result } of items) {
  const dir = resolve(out, LEVEL_DIR[ex.level], MODULE_DIR[ex.module]);
  const name = ex.id ?? ex.exercise_type;
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, `${name}.json`), JSON.stringify(result, null, 2) + '\n', 'utf8');
  const jpg = resolve(dir, `${name}.jpg`);
  if (allPhotos || !(await exists(jpg))) {
    const dataUrl = await page.evaluate(async ({ level, id, type, module }) => {
      const m = await import(/* @vite-ignore */ '/src/demo/examples.ts');
      const e = m.EXAMPLES.find((x) => x.level === level && (x.id ?? x.exercise_type) === (id ?? type) && x.module === module);
      return m.renderExamplePhoto(e);
    }, { level: ex.level, id: ex.id, type: ex.exercise_type, module: ex.module });
    await writeFile(jpg, Buffer.from(dataUrl.split(',')[1], 'base64'));
    photos++;
  }
}
console.log(`✔ ${items.length} JSON y ${photos} fotos en ${out}`);

// ---------------------------------------------------------------- avatar Lumi
await mkdir(docs, { recursive: true });
const { moods, svgs } = await page.evaluate(async () => {
  const m = await import(/* @vite-ignore */ '/src/tutor/avatarSheet.tsx');
  document.body.innerHTML = '<div id="host"></div>';
  m.renderSheet(document.getElementById('host'));
  await new Promise((r) => setTimeout(r, 300));
  const svgs = [...document.querySelectorAll('#sheet svg')].map((svg) => {
    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '240');
    clone.setAttribute('height', '240');
    return clone.outerHTML;
  });
  return { moods: m.MOODS.map((x) => x.mood), svgs };
});
for (let i = 0; i < moods.length; i++) await writeFile(resolve(docs, `lumi-${moods[i]}.svg`), svgs[i], 'utf8');
await page.addStyleTag({ content: '.lumi *{animation:none!important}' });
await page.locator('#sheet').screenshot({ path: resolve(docs, 'lumi-expresiones.png') });
console.log(`✔ Avatar Lumi: ${moods.length} SVG + lámina PNG en ${docs}`);

await browser.close();
await server.close();
