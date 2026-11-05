/**
 * Visión ligera sobre la foto capturada (sin dependencias, < 30 ms):
 *  1. Segmenta la hoja (componente brillante y poco saturado más grande y centrado).
 *  2. Detecta los trazos manuscritos con umbral adaptativo (robusto a viñeteo/sombras).
 *  3. Mide la tinta real: color, reflectancia relativa al papel, grosor y tamaño de letra.
 *
 * Con esto los trazos AR se escriben con la misma tinta, el mismo grosor y la misma escala
 * que la letra del estudiante.
 */

export interface NormRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type InkKind = 'graphite' | 'pen';

export interface PaperInkProfile {
  frameWidth: number;
  frameHeight: number;
  paperDetected: boolean;
  paperRect: NormRect;
  inkRect: NormRect | null;
  /** Altura típica de un carácter manuscrito, normalizada a la altura del frame. */
  charHeight: number;
  /** Grosor del trazo / altura de carácter. */
  strokeRatio: number;
  /** Reflectancia de la tinta relativa al papel (0 = negro absoluto, 1 = invisible). */
  inkReflectance: [number, number, number];
  inkKind: InkKind;
  inkCss: string;
  paperCss: string;
}

const WORK_WIDTH = 320;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function otsuThreshold(lum: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (let i = 0; i < lum.length; i++) hist[lum[i]]++;
  const total = lum.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      threshold = t;
    }
  }
  return threshold;
}

interface Component {
  size: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  sumX: number;
  sumY: number;
}

/** Etiquetado de componentes conexas (BFS) sobre una máscara binaria. */
function labelComponents(
  mask: Uint8Array,
  w: number,
  h: number,
  eightConnected: boolean,
): { labels: Int32Array; comps: Component[] } {
  const labels = new Int32Array(w * h).fill(-1);
  const comps: Component[] = [];
  const queue = new Int32Array(w * h);
  const offsets = eightConnected
    ? [-1, 1, -w, w, -w - 1, -w + 1, w - 1, w + 1]
    : [-1, 1, -w, w];

  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start] !== -1) continue;
    const id = comps.length;
    const comp: Component = { size: 0, minX: w, minY: h, maxX: 0, maxY: 0, sumX: 0, sumY: 0 };
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    labels[start] = id;
    while (head < tail) {
      const idx = queue[head++];
      const x = idx % w;
      const y = (idx - x) / w;
      comp.size++;
      comp.sumX += x;
      comp.sumY += y;
      if (x < comp.minX) comp.minX = x;
      if (x > comp.maxX) comp.maxX = x;
      if (y < comp.minY) comp.minY = y;
      if (y > comp.maxY) comp.maxY = y;
      for (const off of offsets) {
        const n = idx + off;
        if (n < 0 || n >= mask.length || !mask[n] || labels[n] !== -1) continue;
        const nx = n % w;
        if (Math.abs(nx - x) > 1) continue; // evita saltos de fila
        labels[n] = id;
        queue[tail++] = n;
      }
    }
    comps.push(comp);
  }
  return { labels, comps };
}

function defaultProfile(width: number, height: number, hint?: NormRect | null): PaperInkProfile {
  const inkRect = hint ?? { x: 0.3, y: 0.15, w: 0.4, h: 0.08 };
  return {
    frameWidth: width,
    frameHeight: height,
    paperDetected: false,
    paperRect: { x: 0.06, y: 0.06, w: 0.88, h: 0.88 },
    inkRect: hint ?? null,
    charHeight: clamp(inkRect.h * 0.8, 0.035, 0.12),
    strokeRatio: 0.1,
    inkReflectance: [0.42, 0.43, 0.47],
    inkKind: 'graphite',
    inkCss: 'rgb(70, 72, 80)',
    paperCss: 'rgb(235, 233, 226)',
  };
}

export function analyzePaper(frame: HTMLCanvasElement, hint?: NormRect | null): PaperInkProfile {
  const W = frame.width;
  const H = frame.height;
  try {
    const sw = WORK_WIDTH;
    const sh = Math.max(1, Math.round((H / W) * sw));
    const small = document.createElement('canvas');
    small.width = sw;
    small.height = sh;
    const sctx = small.getContext('2d', { willReadFrequently: true });
    if (!sctx) return defaultProfile(W, H, hint);
    sctx.drawImage(frame, 0, 0, sw, sh);
    const px = sctx.getImageData(0, 0, sw, sh).data;

    const n = sw * sh;
    const lum = new Uint8Array(n);
    const sat = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const r = px[i * 4];
      const g = px[i * 4 + 1];
      const b = px[i * 4 + 2];
      lum[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      sat[i] = max === 0 ? 0 : (max - min) / max;
    }

    // ---- 1. Segmentación de la hoja ----
    const otsu = otsuThreshold(lum);
    const paperMask = new Uint8Array(n);
    for (let i = 0; i < n; i++) paperMask[i] = lum[i] > otsu && sat[i] < 0.3 ? 1 : 0;
    const { labels: paperLabels, comps: paperComps } = labelComponents(paperMask, sw, sh, false);

    let bestId = -1;
    let bestScore = 0;
    paperComps.forEach((c, id) => {
      const cx = c.sumX / c.size / sw - 0.5;
      const cy = c.sumY / c.size / sh - 0.5;
      const centerWeight = 1 - Math.min(0.6, Math.hypot(cx, cy));
      const score = c.size * centerWeight;
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    });
    if (bestId < 0 || paperComps[bestId].size < n * 0.08) return defaultProfile(W, H, hint);
    const paper = paperComps[bestId];

    // Envolvente por filas y columnas (aproxima el interior de la hoja, con agujeros de tinta incluidos)
    const rowMin = new Int32Array(sh).fill(sw);
    const rowMax = new Int32Array(sh).fill(-1);
    const colMin = new Int32Array(sw).fill(sh);
    const colMax = new Int32Array(sw).fill(-1);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (paperLabels[y * sw + x] !== bestId) continue;
        if (x < rowMin[y]) rowMin[y] = x;
        if (x > rowMax[y]) rowMax[y] = x;
        if (y < colMin[x]) colMin[x] = y;
        if (y > colMax[x]) colMax[x] = y;
      }
    }

    // ---- 2. Detección de trazos (umbral adaptativo con imagen integral) ----
    const integral = new Float64Array((sw + 1) * (sh + 1));
    for (let y = 0; y < sh; y++) {
      let rowSum = 0;
      for (let x = 0; x < sw; x++) {
        rowSum += lum[y * sw + x];
        integral[(y + 1) * (sw + 1) + (x + 1)] = integral[y * (sw + 1) + (x + 1)] + rowSum;
      }
    }
    const radius = Math.max(4, Math.round(sw / 36));
    const margin = 4;
    const inkMask = new Uint8Array(n);
    for (let y = 0; y < sh; y++) {
      if (rowMax[y] < 0) continue;
      for (let x = rowMin[y] + margin; x <= rowMax[y] - margin; x++) {
        if (y < colMin[x] + margin || y > colMax[x] - margin) continue;
        const x0 = Math.max(0, x - radius);
        const y0 = Math.max(0, y - radius);
        const x1 = Math.min(sw - 1, x + radius);
        const y1 = Math.min(sh - 1, y + radius);
        const area = (x1 - x0 + 1) * (y1 - y0 + 1);
        const s =
          integral[(y1 + 1) * (sw + 1) + (x1 + 1)] -
          integral[y0 * (sw + 1) + (x1 + 1)] -
          integral[(y1 + 1) * (sw + 1) + x0] +
          integral[y0 * (sw + 1) + x0];
        const mean = s / area;
        if (lum[y * sw + x] < mean * 0.84) inkMask[y * sw + x] = 1;
      }
    }

    const paperW = paper.maxX - paper.minX + 1;
    const paperH = paper.maxY - paper.minY + 1;
    const { comps: inkComps } = labelComponents(inkMask, sw, sh, true);
    const strokes = inkComps.filter((c) => {
      const cw = c.maxX - c.minX + 1;
      const ch = c.maxY - c.minY + 1;
      if (c.size < 4) return false; // ruido
      if (ch > paperH * 0.45 || cw > paperW * 0.6) return false; // sombras / pliegues
      if (cw > paperW * 0.3 && cw / ch > 20) return false; // renglones / cuadrícula
      if (ch > paperH * 0.3 && ch / cw > 20) return false; // margen vertical del cuaderno
      return true;
    });

    const paperRect: NormRect = {
      x: paper.minX / sw,
      y: paper.minY / sh,
      w: paperW / sw,
      h: paperH / sh,
    };

    if (strokes.length === 0) {
      const base = defaultProfile(W, H, hint);
      return { ...base, paperDetected: true, paperRect };
    }

    // Si la IA dio una caja aproximada, prioriza los trazos que caen cerca de ella
    let selected = strokes;
    if (hint) {
      const hx0 = (hint.x - hint.w * 0.4) * sw;
      const hx1 = (hint.x + hint.w * 1.4) * sw;
      const hy0 = (hint.y - hint.h * 0.6) * sh;
      const hy1 = (hint.y + hint.h * 1.6) * sh;
      const near = strokes.filter((c) => {
        const cx = c.sumX / c.size;
        const cy = c.sumY / c.size;
        return cx >= hx0 && cx <= hx1 && cy >= hy0 && cy <= hy1;
      });
      if (near.length >= 2) selected = near;
    }

    let minX = sw;
    let minY = sh;
    let maxX = 0;
    let maxY = 0;
    for (const c of selected) {
      minX = Math.min(minX, c.minX);
      minY = Math.min(minY, c.minY);
      maxX = Math.max(maxX, c.maxX);
      maxY = Math.max(maxY, c.maxY);
    }
    const inkRect: NormRect = {
      x: minX / sw,
      y: minY / sh,
      w: (maxX - minX + 1) / sw,
      h: (maxY - minY + 1) / sh,
    };

    // Altura de carácter: mediana de las alturas de los trazos con tamaño de glifo
    const heights = selected
      .filter((c) => c.size >= 6)
      .map((c) => c.maxY - c.minY + 1)
      .sort((a, b) => a - b);
    const medianH = heights.length ? heights[Math.floor(heights.length * 0.6)] : inkRect.h * sh * 0.8;
    const charHeight = clamp(medianH / sh, 0.025, 0.14);

    // ---- 3. Medición de la tinta a resolución completa ----
    const cx0 = Math.max(0, Math.floor((inkRect.x - inkRect.w * 0.15) * W));
    const cy0 = Math.max(0, Math.floor((inkRect.y - inkRect.h * 0.3) * H));
    const cx1 = Math.min(W, Math.ceil((inkRect.x + inkRect.w * 1.15) * W));
    const cy1 = Math.min(H, Math.ceil((inkRect.y + inkRect.h * 1.3) * H));
    const cw = Math.max(1, cx1 - cx0);
    const chh = Math.max(1, cy1 - cy0);
    const fctx = frame.getContext('2d', { willReadFrequently: true });
    if (!fctx) return { ...defaultProfile(W, H, hint), paperDetected: true, paperRect, inkRect, charHeight };
    const crop = fctx.getImageData(cx0, cy0, cw, chh).data;
    const cn = cw * chh;
    const clum = new Uint8Array(cn);
    const hist = new Array<number>(256).fill(0);
    for (let i = 0; i < cn; i++) {
      const l = Math.round(0.299 * crop[i * 4] + 0.587 * crop[i * 4 + 1] + 0.114 * crop[i * 4 + 2]);
      clum[i] = l;
      hist[l]++;
    }
    const percentile = (p: number) => {
      const target = cn * p;
      let acc = 0;
      for (let i = 0; i < 256; i++) {
        acc += hist[i];
        if (acc >= target) return i;
      }
      return 255;
    };
    const paperL = percentile(0.75);
    const minL = percentile(0.004);
    const coreThr = minL + 0.4 * (paperL - minL);
    const bodyThr = minL + 0.55 * (paperL - minL);
    const paperThr = percentile(0.6);

    let ir = 0, ig = 0, ib = 0, inkCount = 0;
    let pr = 0, pg = 0, pb = 0, paperCount = 0;
    let area = 0;
    let perimeter = 0;
    for (let y = 0; y < chh; y++) {
      for (let x = 0; x < cw; x++) {
        const i = y * cw + x;
        const l = clum[i];
        if (l < coreThr) {
          ir += crop[i * 4];
          ig += crop[i * 4 + 1];
          ib += crop[i * 4 + 2];
          inkCount++;
        } else if (l >= paperThr) {
          pr += crop[i * 4];
          pg += crop[i * 4 + 1];
          pb += crop[i * 4 + 2];
          paperCount++;
        }
        if (l < bodyThr) {
          area++;
          const edge =
            x === 0 || y === 0 || x === cw - 1 || y === chh - 1 ||
            clum[i - 1] >= bodyThr || clum[i + 1] >= bodyThr ||
            clum[i - cw] >= bodyThr || clum[i + cw] >= bodyThr;
          if (edge) perimeter++;
        }
      }
    }
    if (inkCount === 0 || paperCount === 0) {
      return { ...defaultProfile(W, H, hint), paperDetected: true, paperRect, inkRect, charHeight };
    }
    ir /= inkCount; ig /= inkCount; ib /= inkCount;
    pr /= paperCount; pg /= paperCount; pb /= paperCount;

    const reflect: [number, number, number] = [
      clamp(ir / Math.max(1, pr), 0.04, 0.95),
      clamp(ig / Math.max(1, pg), 0.04, 0.95),
      clamp(ib / Math.max(1, pb), 0.04, 0.95),
    ];
    const maxC = Math.max(ir, ig, ib);
    const inkSat = maxC === 0 ? 0 : (maxC - Math.min(ir, ig, ib)) / maxC;
    const reflectLum = 0.299 * reflect[0] + 0.587 * reflect[1] + 0.114 * reflect[2];
    const inkKind: InkKind = inkSat > 0.22 || reflectLum < 0.28 ? 'pen' : 'graphite';

    const thicknessPx = perimeter > 0 ? (2 * area) / perimeter : 3;
    const strokeRatio = clamp(thicknessPx / Math.max(1, charHeight * H), 0.045, 0.22);

    return {
      frameWidth: W,
      frameHeight: H,
      paperDetected: true,
      paperRect,
      inkRect,
      charHeight,
      strokeRatio,
      inkReflectance: reflect,
      inkKind,
      inkCss: `rgb(${Math.round(ir)}, ${Math.round(ig)}, ${Math.round(ib)})`,
      paperCss: `rgb(${Math.round(pr)}, ${Math.round(pg)}, ${Math.round(pb)})`,
    };
  } catch (err) {
    console.warn('[PaperLab AR] Falló el análisis de la hoja, usando perfil por defecto:', err);
    return defaultProfile(W, H, hint);
  }
}
