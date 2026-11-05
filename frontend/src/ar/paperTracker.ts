/**
 * Rastreador híbrido de la hoja.
 *
 *  1. Flujo óptico piramidal Lucas-Kanade (jsfeat) desde el MISMO instante de la captura:
 *     sigue esquinas de los trazos, del borde de la hoja y de la mesa, y estima con RANSAC la
 *     homografía  fotograma capturado → fotograma actual. Funciona con hojas casi en blanco,
 *     donde los detectores de marcadores no encuentran suficientes rasgos.
 *  2. MindAR (detección por rasgos naturales) como relocalizador: si el flujo óptico se pierde
 *     (movimiento brusco, mano encima), MindAR vuelve a encontrar la hoja y re-siembra el flujo.
 *
 * Toda la geometría está en "px de seguimiento": el fotograma capturado reducido (≈640 px),
 * que es también el objetivo compilado de MindAR (escala 1:1, requisito para su emparejamiento).
 */
import jsfeat from 'jsfeat';
import { loadMindAR, type MindARController } from './mindar';

export type TrackerState = 'tracking' | 'lost';
export type H3 = number[]; // homografía 3x3 por filas

const MAX_POINTS = 220;
const MIN_POINTS = 70;
const LK_WIN = 21;
const LK_ITERS = 30;

export const identityH = (): H3 => [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function applyH(h: H3, x: number, y: number): [number, number] {
  const w = h[6] * x + h[7] * y + h[8];
  return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
}

export function multiplyH(a: H3, b: H3): H3 {
  const r = new Array<number>(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
}

export function invertH(m: H3): H3 | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [
    A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
    B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
    C / det, -(a * h - b * g) / det, (a * e - b * d) / det,
  ];
}

/** Homografía exacta a partir de 4 correspondencias (DLT con eliminación gaussiana). */
export function homographyFrom4(src: [number, number][], dst: [number, number][]): H3 | null {
  const A: number[][] = [];
  for (let k = 0; k < 4; k++) {
    const [x, y] = src[k];
    const [u, v] = dst[k];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let col = 0; col < 8; col++) {
    let pivot = col;
    for (let r = col + 1; r < 8; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    if (Math.abs(A[pivot][col]) < 1e-12) return null;
    [A[col], A[pivot]] = [A[pivot], A[col]];
    for (let r = 0; r < 8; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      for (let c = col; c < 9; c++) A[r][c] -= f * A[col][c];
    }
  }
  const h = A.map((row, i) => row[8] / row[i]);
  return [...h, 1];
}

/** Rechaza homografías degeneradas (espejo, colapso o escala absurda). */
function plausible(h: H3, w: number, hgt: number): boolean {
  const pts = [applyH(h, 0, 0), applyH(h, w, 0), applyH(h, w, hgt), applyH(h, 0, hgt)];
  if (pts.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) return false;
  let area = 0;
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % 4];
    area += x1 * y2 - x2 * y1;
  }
  const ratio = area / 2 / (w * hgt);
  return ratio > 0.15 && ratio < 6;
}

interface Point {
  rx: number; // posición en el fotograma de referencia (captura)
  ry: number;
  x: number; // posición actual
  y: number;
}

export class HybridPaperTracker {
  readonly width: number;
  readonly height: number;
  state: TrackerState = 'tracking';
  /** Estado de MindAR (relocalizador). */
  mindarReady = false;
  onState?: (state: TrackerState) => void;

  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private prevPyr: jsfeat.pyramid_t;
  private curPyr: jsfeat.pyramid_t;
  private points: Point[] = [];
  private H: H3 = identityH();
  private smoothCorners: [number, number][] | null = null;
  private raf = 0;
  private frame = 0;
  private disposed = false;
  private controller: MindARController | null = null;
  private mindarH: { h: H3; at: number } | null = null;
  private cornerPool: jsfeat.keypoint_t[] | null = null;
  private refPyr: jsfeat.pyramid_t;
  private warpPyr: jsfeat.pyramid_t;
  private refPoints: [number, number][] = [];
  private rawH: H3 = identityH();

  constructor(video: HTMLVideoElement, reference: HTMLCanvasElement) {
    this.video = video;
    this.width = reference.width;
    this.height = reference.height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;

    const type = jsfeat.U8_t | jsfeat.C1_t;
    this.prevPyr = new jsfeat.pyramid_t(4);
    this.curPyr = new jsfeat.pyramid_t(4);
    this.prevPyr.allocate(this.width, this.height, type);
    this.curPyr.allocate(this.width, this.height, type);
    this.refPyr = new jsfeat.pyramid_t(4);
    this.refPyr.allocate(this.width, this.height, type);
    this.warpPyr = new jsfeat.pyramid_t(4);
    this.warpPyr.allocate(this.width, this.height, type);

    // El fotograma capturado es la referencia (H = identidad)
    this.ctx.drawImage(reference, 0, 0);
    this.loadGray(this.refPyr);
    this.loadGray(this.prevPyr);
    this.refPoints = this.detectCorners(this.refPyr.data[0], MAX_POINTS);
    this.points = this.refPoints.map(([x, y]) => ({ rx: x, ry: y, x, y }));

    this.raf = requestAnimationFrame(this.loop);
  }

  /** Homografía actual: px del fotograma capturado → px del fotograma en vivo (suavizada). */
  getHomography(): H3 {
    return this.H;
  }

  private loadGray(pyr: jsfeat.pyramid_t) {
    const img = this.ctx.getImageData(0, 0, this.width, this.height);
    jsfeat.imgproc.grayscale(img.data, this.width, this.height, pyr.data[0], jsfeat.COLOR_RGBA2GRAY);
    pyr.build(pyr.data[0], true);
  }

  /** Esquinas YAPE06 repartidas en una rejilla (mejor condicionamiento de la homografía). */
  private detectCorners(gray: jsfeat.matrix_t, max: number, avoid: Point[] = []): [number, number][] {
    if (!this.cornerPool) {
      this.cornerPool = [];
      // YAPE06 no comprueba límites: como máximo una esquina cada 2 px (salta el vecino)
      const size = Math.ceil((this.width * this.height) / 2);
      for (let i = 0; i < size; i++) this.cornerPool.push(new jsfeat.keypoint_t(0, 0, 0, 0, -1));
    }
    const corners = this.cornerPool;
    jsfeat.yape06.laplacian_threshold = 26;
    jsfeat.yape06.min_eigen_value_threshold = 22;
    const count = Math.min(corners.length, jsfeat.yape06.detect(gray, corners, 12));
    const found = corners.slice(0, count).sort((a, b) => b.score - a.score);

    const cols = 10;
    const rows = 6;
    const perCell = Math.max(2, Math.ceil(max / (cols * rows)));
    const cells = new Array<number>(cols * rows).fill(0);
    const out: [number, number][] = [];
    for (const c of found) {
      if (out.length >= max) break;
      const cell = Math.min(rows - 1, Math.floor((c.y / this.height) * rows)) * cols +
        Math.min(cols - 1, Math.floor((c.x / this.width) * cols));
      if (cells[cell] >= perCell) continue;
      if (avoid.some((p) => Math.abs(p.x - c.x) < 7 && Math.abs(p.y - c.y) < 7)) continue;
      cells[cell]++;
      out.push([c.x, c.y]);
    }
    return out;
  }

  private lostReason = '';

  private setState(state: TrackerState) {
    if (this.state === state) return;
    this.state = state;
    console.debug(`[PaperLab AR] tracker → ${state}${state === 'lost' ? ` (${this.lostReason})` : ''} @${this.frame}`);
    this.onState?.(state);
  }

  /** Re-siembra el flujo óptico a partir de una homografía conocida (p. ej. de MindAR). */
  private reseed(h: H3) {
    const inv = invertH(h);
    if (!inv) return;
    this.points = this.detectCorners(this.curPyr.data[0], MAX_POINTS).map(([x, y]) => {
      const [rx, ry] = applyH(inv, x, y);
      return { rx, ry, x, y };
    });
    this.H = h;
    this.smoothCorners = null;
    this.badFrames = 0;
    this.setState('tracking');
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (this.video.readyState < 2) return;
    this.frame++;
    this.ctx.drawImage(this.video, 0, 0, this.width, this.height);
    this.loadGray(this.curPyr);

    if (this.state === 'tracking') {
      this.trackStep();
      if (this.state === 'tracking' && this.frame % 5 === 0) this.realign();
    }
    else if (this.mindarH && performance.now() - this.mindarH.at < 250) this.reseed(this.mindarH.h);

    [this.prevPyr, this.curPyr] = [this.curPyr, this.prevPyr];
  };

  private trackStep() {
    const n = this.points.length;
    if (n < 8) {
      this.setState('lost');
      return;
    }
    const prevXY = new Float32Array(n * 2);
    const curXY = new Float32Array(n * 2);
    const status = new Uint8Array(n);
    this.points.forEach((p, i) => {
      prevXY[i * 2] = p.x;
      prevXY[i * 2 + 1] = p.y;
    });
    jsfeat.optical_flow_lk.track(this.prevPyr, this.curPyr, prevXY, curXY, n, LK_WIN, LK_ITERS, status, 0.01, 0.0008);

    const survivors: Point[] = [];
    for (let i = 0; i < n; i++) {
      const x = curXY[i * 2];
      const y = curXY[i * 2 + 1];
      if (status[i] === 1 && x >= 0 && y >= 0 && x < this.width && y < this.height) {
        survivors.push({ ...this.points[i], x, y });
      }
    }
    if (survivors.length < 10) {
      this.points = survivors;
      this.lostReason = `pocos puntos (${survivors.length}/${n})`;
      this.badFrame();
      return;
    }

    const from = survivors.map((p) => ({ x: p.rx, y: p.ry }));
    const to = survivors.map((p) => ({ x: p.x, y: p.y }));
    const model = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
    const mask = new jsfeat.matrix_t(survivors.length, 1, jsfeat.U8_t | jsfeat.C1_t);
    // Con puntos concentrados en una zona, la homografía extrapola perspectiva falsa: se usa afín
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of survivors) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    const wide = (maxX - minX) / this.width > 0.45 && (maxY - minY) / this.height > 0.45;
    const kernel = wide ? new jsfeat.motion_model.homography2d() : new jsfeat.motion_model.affine2d();
    const params = new jsfeat.ransac_params_t(wide ? 4 : 3, 3, 0.5, 0.995);
    const ok = jsfeat.motion_estimator.ransac(params, kernel, from, to, survivors.length, model, mask, 400);
    const inliers = survivors.filter((_, i) => mask.data[i] === 1);
    const raw = Array.from(model.data as Float32Array);
    if (!wide) [raw[6], raw[7], raw[8]] = [0, 0, 1];
    const h = raw.map((v) => v / (raw[8] || 1));

    const enough = inliers.length >= 12 && (inliers.length >= survivors.length * 0.25 || inliers.length >= 40);
    if (!ok || !enough || !plausible(h, this.width, this.height) || !this.continuous(h)) {
      // un fotograma malo no basta para perder la hoja: se conserva la última pose y los puntos
      this.points = enough ? inliers : survivors;
      this.lostReason = `RANSAC ok=${ok} inliers=${inliers.length}/${survivors.length}`;
      this.badFrame();
      return;
    }
    this.badFrames = 0;
    this.points = inliers;
    this.updateSmoothed(h);

    // Reponer puntos perdidos con esquinas nuevas, proyectadas a la referencia
    if (this.points.length < MIN_POINTS && this.frame % 3 === 0) {
      const inv = invertH(h);
      if (inv) {
        const fresh = this.detectCorners(this.curPyr.data[0], MAX_POINTS - this.points.length, this.points);
        for (const [x, y] of fresh) {
          const [rx, ry] = applyH(inv, x, y);
          this.points.push({ rx, ry, x, y });
        }
      }
    }
  }

  private badFrames = 0;

  private badFrame() {
    this.badFrames++;
    if (this.badFrames >= 5) {
      this.badFrames = 0;
      this.setState('lost');
    }
  }

  /** Rechaza saltos imposibles entre fotogramas consecutivos (homografías extrapoladas). */
  private continuous(h: H3): boolean {
    if (!this.smoothCorners) return true;
    const src: [number, number][] = [[0, 0], [this.width, 0], [this.width, this.height], [0, this.height]];
    const limit = this.width * 0.25;
    return src.every(([x, y], i) => {
      const [cx, cy] = applyH(h, x, y);
      const [sx, sy] = this.smoothCorners![i];
      return Math.hypot(cx - sx, cy - sy) < limit;
    });
  }

  /** Suavizado ligero sobre las 4 esquinas (quita el temblor sin añadir retraso visible). */
  private updateSmoothed(h: H3) {
    const src: [number, number][] = [[0, 0], [this.width, 0], [this.width, this.height], [0, this.height]];
    const corners = src.map(([x, y]) => applyH(h, x, y));
    if (!this.smoothCorners) this.smoothCorners = corners;
    else {
      // más suavizado cuando el movimiento es pequeño (temblor), menos cuando es grande
      this.smoothCorners = this.smoothCorners.map(([sx, sy], i) => {
        const [cx, cy] = corners[i];
        const d = Math.hypot(cx - sx, cy - sy);
        const a = Math.min(1, 0.35 + d / 12);
        return [sx + (cx - sx) * a, sy + (cy - sy) * a];
      });
    }
    this.rawH = h;
    this.H = homographyFrom4(src, this.smoothCorners) ?? h;
    this.setState('tracking');
  }

  /**
   * Corrección de deriva: reproyecta el fotograma actual al espacio de la captura con la pose
   * estimada y mide el residuo contra los puntos ORIGINALES de la captura. El error no se acumula.
   */
  private realign() {
    const T = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
    (T.data as Float32Array).set(this.rawH);
    jsfeat.imgproc.warp_perspective(this.curPyr.data[0], this.warpPyr.data[0], T, 0);
    this.warpPyr.build(this.warpPyr.data[0], true);

    const n = this.refPoints.length;
    if (n < 12) return;
    const refXY = new Float32Array(n * 2);
    const outXY = new Float32Array(n * 2);
    const status = new Uint8Array(n);
    this.refPoints.forEach(([x, y], i) => {
      refXY[i * 2] = x;
      refXY[i * 2 + 1] = y;
    });
    jsfeat.optical_flow_lk.track(this.refPyr, this.warpPyr, refXY, outXY, n, LK_WIN, 20, status, 0.01, 0.0008);

    const from: { x: number; y: number }[] = [];
    const to: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      if (status[i] !== 1) continue;
      const dx = outXY[i * 2] - refXY[i * 2];
      const dy = outXY[i * 2 + 1] - refXY[i * 2 + 1];
      if (Math.hypot(dx, dy) > 12) continue; // el residuo debe ser pequeño
      from.push({ x: refXY[i * 2], y: refXY[i * 2 + 1] });
      to.push({ x: outXY[i * 2], y: outXY[i * 2 + 1] });
    }
    if (from.length < 15) return;
    const model = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
    const mask = new jsfeat.matrix_t(from.length, 1, jsfeat.U8_t | jsfeat.C1_t);
    const ok = jsfeat.motion_estimator.ransac(
      new jsfeat.ransac_params_t(3, 1.5, 0.5, 0.995), new jsfeat.motion_model.affine2d(), from, to, from.length, model, mask, 300,
    );
    if (!ok) return;
    let inl = 0;
    for (let i = 0; i < from.length; i++) inl += mask.data[i];
    if (inl < 15 || inl < from.length * 0.4) return;
    const r = Array.from(model.data as Float32Array);
    [r[6], r[7], r[8]] = [0, 0, 1];
    const corrected = multiplyH(this.rawH, r);
    if (!plausible(corrected, this.width, this.height)) return;

    // Puntos frescos y sin deriva: los originales de la captura en su posición corregida
    this.points = from
      .filter((_, i) => mask.data[i] === 1)
      .map((p) => {
        const [x, y] = applyH(corrected, p.x, p.y);
        return { rx: p.x, ry: p.y, x, y };
      });
    this.updateSmoothed(corrected);
  }

  // ------------------------------------------------------------------
  // MindAR como relocalizador
  // ------------------------------------------------------------------
  async attachMindAR(targetBuffer: ArrayBuffer): Promise<void> {
    try {
      const { Controller } = await loadMindAR();
      if (this.disposed) return;
      let postW = this.width;
      let postH = this.height;
      const controller = new Controller({
        inputWidth: this.width,
        inputHeight: this.height,
        maxTrack: 1,
        warmupTolerance: 1,
        missTolerance: 3,
        onUpdate: (data) => {
          if (this.disposed || data.type !== 'updateMatrix' || !data.worldMatrix) return;
          const h = this.homographyFromMindAR(data.worldMatrix, postW, postH);
          if (h && plausible(h, this.width, this.height)) this.mindarH = { h, at: performance.now() };
        },
      });
      const { dimensions } = controller.addImageTargetsFromBuffer(targetBuffer);
      if (dimensions?.[0]) [postW, postH] = dimensions[0];
      const input = this.canvas as unknown as HTMLVideoElement;
      await controller.dummyRun(input);
      if (this.disposed) {
        controller.dispose?.();
        return;
      }
      this.controller = controller;
      controller.processVideo(input);
      this.mindarReady = true;
      console.info('[PaperLab AR] MindAR listo como relocalizador.');
    } catch (err) {
      console.warn('[PaperLab AR] MindAR no disponible (se usa solo flujo óptico):', err);
    }
  }

  /** Proyecta las esquinas del objetivo con la pose de MindAR → homografía en px de seguimiento. */
  private homographyFromMindAR(world: number[], tw: number, th: number): H3 | null {
    const proj = this.controller?.getProjectionMatrix();
    if (!proj) return null;
    const mul = (m: number[], v: number[]) => [0, 1, 2, 3].map((r) => m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r] * v[3]);
    const src: [number, number][] = [[0, 0], [this.width, 0], [this.width, this.height], [0, this.height]];
    const sx = tw / this.width;
    const sy = th / this.height;
    const dst = src.map(([u, v]) => {
      // coordenadas de marcador de MindAR: origen abajo-izquierda, y hacia arriba, en px del objetivo
      const cam = mul(world, [u * sx, th - v * sy, 0, 1]);
      const clip = mul(proj, cam);
      const nx = clip[0] / clip[3];
      const ny = clip[1] / clip[3];
      return [((nx + 1) / 2) * this.width, ((1 - ny) / 2) * this.height] as [number, number];
    });
    return homographyFrom4(src, dst);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    try {
      this.controller?.stopProcessVideo();
      this.controller?.dispose?.();
    } catch {
      // ignorar
    }
  }
}
