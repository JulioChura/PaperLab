/**
 * HOJA DE RESOLUCIÓN: en lugar de buscar huecos libres dentro de la foto (frágil cuando el
 * dibujo ocupa toda la hoja), recortamos el ejercicio, lo "pegamos" en la esquina superior
 * izquierda de una hoja de cuaderno limpia y dejamos el resto de la hoja para la solución.
 *
 * - El recorte usa la(s) caja(s) que devuelve la IA; si no son confiables, la tinta detectada.
 * - El recorte se blanquea (división por el color del papel) para que parezca impreso en la hoja.
 * - El perfil de tinta se mide sobre la hoja compuesta, así la letra de la solución hereda el
 *   tamaño y el grosor del trazo del alumno ya escalado.
 */
import { analyzePaper, type NormRect, type PaperInkProfile } from './paperVision';

export interface SolutionSheet {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  /** Zona de la hoja (normalizada) que ocupa el ejercicio recortado. */
  exerciseRect: NormRect;
  /** Zona del fotograma original (normalizada) que se recortó. */
  sourceRect: NormRect;
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Fracción superior de la hoja que queda bajo los botones flotantes (volver, módulo, ejemplos). */
const SHEET_TOP = 0.13;

/** Unión de las cajas de la IA, con margen; null si no sirven (vacías, diminutas o toda la foto). */
function cropFromBoxes(boxes: Box[]): NormRect | null {
  const valid = boxes.filter((b) => b.width > 0.01 && b.height > 0.01);
  if (!valid.length) return null;
  const x0 = Math.min(...valid.map((b) => b.x));
  const y0 = Math.min(...valid.map((b) => b.y));
  const x1 = Math.max(...valid.map((b) => b.x + b.width));
  const y1 = Math.max(...valid.map((b) => b.y + b.height));
  const area = (x1 - x0) * (y1 - y0);
  if (area < 0.01) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function pad(r: NormRect, p: number): NormRect {
  const x = clamp(r.x - p, 0, 1);
  const y = clamp(r.y - p, 0, 1);
  return { x, y, w: clamp(r.x + r.w + p, 0, 1) - x, h: clamp(r.y + r.h + p, 0, 1) - y };
}

function union(a: NormRect | null, b: NormRect | null): NormRect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

function intersect(a: NormRect, b: NormRect): NormRect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.min(a.x + a.w, b.x + b.w) - x;
  const h = Math.min(a.y + a.h, b.y + b.h) - y;
  return w > 0.02 && h > 0.02 ? { x, y, w, h } : null;
}

/**
 * Caja ajustada de la tinta dentro de `region` (normalizada al frame):
 *  1) umbral local contra el papel (percentil alto de luminancia por bloques),
 *  2) descarta filas/columnas "de línea" (bordes de la hoja, renglones, margen rojo),
 *  3) recorta el 0.6 % de píxeles de tinta más extremos en cada eje (ruido, motas).
 */
interface LongLines { rows: number[]; cols: number[] }

function tightInkBox(frame: HTMLCanvasElement, region: NormRect, seed: NormRect | null = null, lines?: LongLines): NormRect | null {
  const S = 420;
  const rw = region.w * frame.width;
  const rh = region.h * frame.height;
  const k = S / Math.max(rw, rh);
  const w = Math.max(8, Math.round(rw * k));
  const h = Math.max(8, Math.round(rh * k));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(frame, region.x * frame.width, region.y * frame.height, rw, rh, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const lum = new Float32Array(w * h);
  // la tinta se distingue por oscuridad Y por saturación baja; el margen rojo/azul del cuaderno no es tinta
  const sat = new Float32Array(w * h);
  for (let i = 0, p = 0; p < w * h; i += 4, p++) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    lum[p] = 0.299 * r + 0.587 * g + 0.114 * b;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    sat[p] = mx ? (mx - mn) / mx : 0;
  }
  // papel local: máximo suavizado por bloques de 24 px
  const B = 24;
  const bw = Math.ceil(w / B), bh = Math.ceil(h / B);
  const paper = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by++)
    for (let bx = 0; bx < bw; bx++) {
      const vals: number[] = [];
      for (let y = by * B; y < Math.min(h, (by + 1) * B); y += 2)
        for (let x = bx * B; x < Math.min(w, (bx + 1) * B); x += 2) vals.push(lum[y * w + x]);
      vals.sort((a, b) => a - b);
      paper[by * bw + bx] = vals[Math.floor(vals.length * 0.85)] ?? 255;
    }
  const ink = new Uint8Array(w * h);
  // para detectar LÍNEAS largas vale cualquier marca oscura (el canto de la hoja suele ser café: saturado)
  const mark = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const pl = paper[Math.floor(y / B) * bw + Math.floor(x / B)];
      if (lum[p] < pl * 0.72 && sat[p] < 0.45) ink[p] = 1;
      if (lum[p] < pl * 0.8) mark[p] = 1;
    }
  // filas / columnas que son líneas largas (≥ 55 % del ancho o alto)
  const badRow = new Uint8Array(h);
  const badCol = new Uint8Array(w);
  for (let y = 0; y < h; y++) {
    let n = 0;
    for (let x = 0; x < w; x++) n += mark[y * w + x];
    if (n > w * 0.55) badRow[y] = 1;
  }
  for (let x = 0; x < w; x++) {
    let n = 0;
    for (let y = 0; y < h; y++) n += mark[y * w + x];
    if (n > h * 0.55) badCol[x] = 1;
  }
  if (lines) {
    for (let y = 0; y < h; y++) if (badRow[y]) lines.rows.push(region.y + ((y + 0.5) / h) * region.h);
    for (let x = 0; x < w; x++) if (badCol[x]) lines.cols.push(region.x + ((x + 0.5) / w) * region.w);
  }
  for (let y = 0; y < h; y++) if (badRow[y]) for (let x = 0; x < w; x++) ink[y * w + x] = 0;
  for (let x = 0; x < w; x++) if (badCol[x]) for (let y = 0; y < h; y++) ink[y * w + x] = 0;

  // Componentes conexas (8-vecindad) de la tinta
  interface Comp { size: number; x0: number; y0: number; x1: number; y1: number; cx: number; cy: number }
  const label = new Int32Array(w * h).fill(-1);
  const comps: Comp[] = [];
  const stack: number[] = [];
  for (let p0 = 0; p0 < w * h; p0++) {
    if (!ink[p0] || label[p0] >= 0) continue;
    const id = comps.length;
    const c: Comp = { size: 0, x0: w, y0: h, x1: 0, y1: 0, cx: 0, cy: 0 };
    label[p0] = id;
    stack.push(p0);
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w, y = (p / w) | 0;
      c.size++;
      c.cx += x;
      c.cy += y;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (ink[q] && label[q] < 0) {
            label[q] = id;
            stack.push(q);
          }
        }
    }
    c.cx /= c.size;
    c.cy /= c.size;
    comps.push(c);
  }
  // Fuera: motas, manchas que tocan el borde de la zona (sombras, canto de la hoja) y marcos gigantes
  const B2 = 2;
  let keep = comps.filter((c) => {
    if (c.size < 5) return false;
    const touches = c.x0 <= B2 || c.y0 <= B2 || c.x1 >= w - 1 - B2 || c.y1 >= h - 1 - B2;
    const huge = c.x1 - c.x0 > w * 0.85 || c.y1 - c.y0 > h * 0.85;
    return !touches && !huge;
  });
  if (!keep.length) return null;
  // Fuera también lo aislado: componentes chicas lejos del núcleo de tinta
  const total = keep.reduce((s, c) => s + c.size, 0);
  if (total < 40) return null;
  const mx = keep.reduce((s, c) => s + c.cx * c.size, 0) / total;
  const my = keep.reduce((s, c) => s + c.cy * c.size, 0) / total;
  const spread = Math.sqrt(keep.reduce((s, c) => s + c.size * ((c.cx - mx) ** 2 + (c.cy - my) ** 2), 0) / total);
  keep = keep.filter((c) => c.size >= total * 0.004 || Math.hypot(c.cx - mx, c.cy - my) <= spread * 2.2);

  // Crecimiento de región desde la caja de la IA: se suman los trazos vecinos hasta que no quede
  // ninguno cerca. Toma el ejercicio completo aunque la IA lo haya delimitado corto, sin colar otro
  // ejercicio de la misma página (separado por espacio en blanco).
  if (seed) {
    const sx0 = ((seed.x - region.x) / region.w) * w, sx1 = ((seed.x + seed.w - region.x) / region.w) * w;
    const sy0 = ((seed.y - region.y) / region.h) * h, sy1 = ((seed.y + seed.h - region.y) / region.h) * h;
    let sel = keep.filter((c) => c.x1 >= sx0 && c.x0 <= sx1 && c.y1 >= sy0 && c.y0 <= sy1);
    if (sel.length) {
      const gap = Math.max(w, h) * 0.07;
      let bx0 = Math.min(...sel.map((c) => c.x0)), by0 = Math.min(...sel.map((c) => c.y0));
      let bx1 = Math.max(...sel.map((c) => c.x1)), by1 = Math.max(...sel.map((c) => c.y1));
      for (let changed = true; changed; ) {
        changed = false;
        for (const c of keep) {
          if (sel.includes(c)) continue;
          if (c.x0 <= bx1 + gap && c.x1 >= bx0 - gap && c.y0 <= by1 + gap && c.y1 >= by0 - gap) {
            sel = [...sel, c];
            bx0 = Math.min(bx0, c.x0);
            by0 = Math.min(by0, c.y0);
            bx1 = Math.max(bx1, c.x1);
            by1 = Math.max(by1, c.y1);
            changed = true;
          }
        }
      }
      keep = sel;
    }
  }
  const x0 = Math.min(...keep.map((c) => c.x0));
  const y0 = Math.min(...keep.map((c) => c.y0));
  const x1 = Math.max(...keep.map((c) => c.x1));
  const y1 = Math.max(...keep.map((c) => c.y1));
  if (x1 - x0 < 6 || y1 - y0 < 6) return null;
  return {
    x: region.x + (x0 / w) * region.w,
    y: region.y + (y0 / h) * region.h,
    w: ((x1 - x0 + 1) / w) * region.w,
    h: ((y1 - y0 + 1) / h) * region.h,
  };
}

/** Lleva el papel del recorte a blanco: cada canal se divide por el color del papel (percentil alto). */
function whitenPaper(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) hist[(d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000 | 0]++;
  // percentil 80 de luminancia ≈ papel (la tinta rara vez supera el 20 % del recorte)
  const target = (w * h) * 0.8;
  let acc = 0;
  let paperL = 255;
  for (let l = 0; l < 256; l++) {
    acc += hist[l];
    if (acc >= target) {
      paperL = l;
      break;
    }
  }
  // color medio del papel (píxeles cercanos a esa luminancia)
  let pr = 0, pg = 0, pb = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * 299 + d[i + 1] * 587 + d[i + 2] * 114) / 1000;
    if (l >= paperL - 6) {
      pr += d[i];
      pg += d[i + 1];
      pb += d[i + 2];
      n++;
    }
  }
  if (!n) return;
  pr = Math.max(40, pr / n);
  pg = Math.max(40, pg / n);
  pb = Math.max(40, pb / n);
  for (let i = 0; i < d.length; i += 4) {
    // división + leve curva para que el gris del papel desaparezca y la tinta conserve su tono
    const r = Math.min(1, d[i] / pr);
    const g = Math.min(1, d[i + 1] / pg);
    const b = Math.min(1, d[i + 2] / pb);
    const curve = (v: number) => (v > 0.9 ? 1 : Math.pow(v / 0.9, 1.15));
    d[i] = curve(r) * 255;
    d[i + 1] = curve(g) * 255;
    d[i + 2] = curve(b) * 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** Borra filas/columnas que son líneas largas (borde de la hoja, renglones, margen): no son el ejercicio. */
function eraseLongLines(ctx: CanvasRenderingContext2D, w: number, h: number, sheetLines?: { rows: number[]; cols: number[]; band: number }) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  // "marca" = algo más oscuro que el papel o con color (el margen rojo / renglones azules del cuaderno)
  //  - líneas de COLOR (margen rojo, renglones azules) en cualquier parte: no son trazo de lápiz/lapicero negro
  //  - líneas OSCURAS solo pegadas al borde del recorte (canto de la hoja): un cable o una flecha larga del
  //    ejercicio también cruza el recorte y NO debe borrarse
  const colored = (p: number) => {
    const r = d[p], g = d[p + 1], b = d[p + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    // claras: el margen rojo y los renglones son tintas de imprenta suaves; el lapicero azul/negro es oscuro
    return mx > 0 && (mx - mn) / mx > 0.07 && mx - mn > 10 && r * 0.299 + g * 0.587 + b * 0.114 > 140;
  };
  const rows: number[] = [];
  const cols: number[] = [];
  for (let y = 0; y < h; y++) {
    let nc = 0;
    for (let x = 0; x < w; x++) if (colored((y * w + x) * 4)) nc++;
    if (nc > w * 0.45) rows.push(y);
  }
  for (let x = 0; x < w; x++) {
    let nc = 0;
    for (let y = 0; y < h; y++) if (colored((y * w + x) * 4)) nc++;
    if (nc > h * 0.45) cols.push(x);
  }
  // líneas largas a escala de HOJA (canto, renglones): ningún trazo del ejercicio mide más del 55 % del papel
  const sheetRows: number[] = [];
  const sheetCols: number[] = [];
  if (sheetLines) {
    const b = sheetLines.band + 2;
    for (const v of sheetLines.rows) for (let k = -b; k <= b; k++) sheetRows.push(Math.round(v) + k);
    for (const v of sheetLines.cols) for (let k = -b; k <= b; k++) sheetCols.push(Math.round(v) + k);
  }
  const uniq = (xs: number[], max: number) => [...new Set(xs.filter((v) => v >= 0 && v < max))];
  // incluir el antialiasing de las líneas de color (vecinos inmediatos)
  const grow = (xs: number[], max: number) => uniq(xs.flatMap((v) => [v - 1, v, v + 1]), max);
  const cRows = grow(rows, h);
  const cCols = grow(cols, w);
  const sRows = uniq(sheetRows, h);
  const sCols = uniq(sheetCols, w);
  if (!cRows.length && !cCols.length && !sRows.length && !sCols.length) return;
  const white = (p: number) => {
    d[p] = d[p + 1] = d[p + 2] = 255;
  };
  // líneas de color: solo los píxeles de color (la tinta que las cruza, p. ej. un "12 V", queda intacta)
  const tint = (p: number) => {
    const r = d[p], g = d[p + 1], bb = d[p + 2];
    return r * 0.299 + g * 0.587 + bb * 0.114 > 120;
  };
  for (const y of cRows) for (let x = 0; x < w; x++) if (tint((y * w + x) * 4)) white((y * w + x) * 4);
  for (const x of cCols) for (let y = 0; y < h; y++) if (tint((y * w + x) * 4)) white((y * w + x) * 4);
  // canto de la hoja / renglones largos: la franja completa
  for (const y of sRows) for (let x = 0; x < w; x++) white((y * w + x) * 4);
  for (const x of sCols) for (let y = 0; y < h; y++) white((y * w + x) * 4);
  ctx.putImageData(img, 0, 0);
}

/** Hoja de cuaderno: papel marfil y cuadrícula de 5 mm muy tenue (la tinta AR se multiplica encima). */
function drawPaper(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = '#fdfaf2';
  ctx.fillRect(0, 0, W, H);
  const step = Math.round(Math.min(W, H) / 32);
  ctx.lineWidth = Math.max(1, W / 1600);
  ctx.strokeStyle = 'rgba(47, 75, 240, 0.08)';
  ctx.beginPath();
  for (let x = step; x < W; x += step) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, H);
  }
  for (let y = step; y < H; y += step) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(W, y + 0.5);
  }
  ctx.stroke();
}

/**
 * @param frame       fotograma capturado (foto o cámara)
 * @param boxes       cajas normalizadas del ejercicio que devolvió la IA
 * @param viewAspect  alto/ancho de la zona de visualización (la hoja se ajusta a la pantalla)
 */
export function buildSolutionSheet(frame: HTMLCanvasElement, boxes: Box[], viewAspect: number): SolutionSheet {
  // 1) Qué recortar: la caja de la IA suele quedarse corta (solo la figura principal), así que la
  //    unimos con TODA la tinta detectada en la hoja y la limitamos al contorno del papel.
  const aiRaw = cropFromBoxes(boxes);
  const ai = aiRaw && aiRaw.w * aiRaw.h <= 0.92 ? aiRaw : null;
  const prof = analyzePaper(frame, null);
  const paperBox = prof.paperDetected ? prof.paperRect : { x: 0, y: 0, w: 1, h: 1 };
  // Mi detector busca en toda la hoja y crece desde la caja de la IA (si la hay)
  const longLines: LongLines = { rows: [], cols: [] };
  const tight = tightInkBox(frame, paperBox, ai, longLines);
  let src = tight ?? union(prof.inkRect, ai) ?? paperBox;
  src = intersect(pad(src, 0.02), paperBox) ?? src;

  // 2) La hoja, con la proporción de la pantalla
  const aspect = clamp(viewAspect, 0.55, 1.9);
  const W = 1600;
  const H = Math.round(W * aspect);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  drawPaper(ctx, W, H);

  // 3) El recorte en la esquina superior izquierda (más ancho si la hoja es vertical)
  const sw = src.w * frame.width;
  const sh = src.h * frame.height;
  const portrait = aspect > 1.15;
  const maxW = W * (portrait ? 0.62 : 0.42);
  const maxH = H * (portrait ? 0.3 : 0.4);
  const k = Math.min(maxW / sw, maxH / sh);
  const cw = Math.round(sw * k);
  const ch = Math.round(sh * k);
  const m = Math.round(W * 0.03);
  // franja superior reservada para los chips flotantes de la interfaz
  const top = Math.round(H * SHEET_TOP);

  const crop = document.createElement('canvas');
  crop.width = cw;
  crop.height = ch;
  const cctx = crop.getContext('2d', { willReadFrequently: true })!;
  cctx.imageSmoothingQuality = 'high';
  cctx.drawImage(frame, src.x * frame.width, src.y * frame.height, sw, sh, 0, 0, cw, ch);
  whitenPaper(cctx, cw, ch);
  eraseLongLines(cctx, cw, ch, {
    rows: longLines.rows.map((v) => ((v - src.y) / src.h) * ch).filter((v) => v >= -2 && v <= ch + 2),
    cols: longLines.cols.map((v) => ((v - src.x) / src.w) * cw).filter((v) => v >= -2 && v <= cw + 2),
    band: Math.max(2, Math.ceil((ch / (src.h * frame.height)) * (frame.height / 420) * 1.5)),
  });

  // marco punteado tipo "recorte pegado"
  ctx.drawImage(crop, m, top);
  ctx.save();
  ctx.setLineDash([W / 160, W / 220]);
  ctx.lineWidth = Math.max(2, W / 700);
  ctx.strokeStyle = 'rgba(33, 26, 51, 0.35)';
  ctx.strokeRect(m - W / 200, top - W / 200, cw + W / 100, ch + W / 100);
  ctx.restore();

  return {
    canvas,
    dataUrl: canvas.toDataURL('image/jpeg', 0.92),
    exerciseRect: { x: m / W, y: top / H, w: cw / W, h: ch / H },
    sourceRect: src,
  };
}

/**
 * Perfil de tinta para la hoja compuesta: la tinta y el tamaño de letra se miden en el recorte,
 * pero el espacio de trabajo es la hoja completa (sin bordes de foto que evitar).
 */
export function sheetProfile(sheet: SolutionSheet): PaperInkProfile {
  const base = analyzePaper(sheet.canvas, sheet.exerciseRect);
  const e = 0.015;
  const t = SHEET_TOP - 0.02;
  return {
    ...base,
    paperDetected: true,
    paperRect: { x: e, y: t, w: 1 - 2 * e, h: 1 - t - e },
    paperHull: [
      [e, t],
      [1 - e, t],
      [1 - e, 1 - e],
      [e, 1 - e],
    ],
    inkRect: sheet.exerciseRect,
    charHeight: clamp(base.charHeight, 0.018, 0.05),
  };
}
