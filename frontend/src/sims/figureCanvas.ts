/**
 * Lienzo de una figura animada sobre la hoja.
 *
 *  - `ink`: máscaras (R = tinta del alumno, G = resaltador, B = lápiz de color) que el shader
 *    convierte en pigmento y multiplica sobre el papel → parece dibujado en la hoja.
 *  - `light`: color RGBA normal que se SUMA (mezcla "screen") → brillo de bombillas, corriente,
 *    el nodo activo del debugger… lo único que "emite luz" en la escena.
 *
 * Todas las medidas se expresan en `u` = altura de letra del alumno en px del lienzo, así el grosor
 * del trazo y el tamaño del texto coinciden con lo que está escrito en el papel.
 */
import rough from 'roughjs';

export type Channel = 'ink' | 'hi' | 'pencil';
const CH: Record<Channel, string> = { ink: '#ff0000', hi: '#00ff00', pencil: '#0000ff' };
const FONT = "Caveat, 'Segoe Print', 'Comic Sans MS', cursive";

type RoughCanvas = ReturnType<typeof rough.canvas>;
type Pt = [number, number];

export class FigureCanvas {
  readonly ink: HTMLCanvasElement;
  readonly light: HTMLCanvasElement;
  readonly w: number;
  readonly h: number;
  /** Altura de letra del alumno en px del lienzo. */
  readonly u: number;
  /** Grosor del trazo del alumno en px del lienzo. */
  readonly stroke: number;
  readonly weight: number;
  readonly ctx: CanvasRenderingContext2D;
  readonly lctx: CanvasRenderingContext2D;
  private rc: RoughCanvas;
  private seed = 1;

  constructor(width: number, height: number, u: number, strokeRatio: number) {
    this.w = Math.round(width);
    this.h = Math.round(height);
    this.u = u;
    this.stroke = Math.max(1.4, strokeRatio * u);
    this.weight = Math.round(Math.min(700, Math.max(400, 400 + (strokeRatio - 0.06) * 2600)));
    this.ink = document.createElement('canvas');
    this.light = document.createElement('canvas');
    for (const c of [this.ink, this.light]) {
      c.width = this.w;
      c.height = this.h;
    }
    const ctx = this.ink.getContext('2d');
    const lctx = this.light.getContext('2d');
    if (!ctx || !lctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;
    this.lctx = lctx;
    this.rc = rough.canvas(this.ink);
    this.begin();
  }

  /** Limpia ambos lienzos para dibujar un nuevo fotograma. */
  begin() {
    this.seed = 1;
    const { ctx, lctx } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = 'lighter';
    lctx.clearRect(0, 0, this.w, this.h);
  }

  private opts(ch: Channel, width = 1, extra: Record<string, unknown> = {}) {
    return {
      stroke: CH[ch],
      strokeWidth: this.stroke * width,
      roughness: 0.7,
      bowing: 0.6,
      seed: this.seed++,
      disableMultiStroke: true,
      ...extra,
    };
  }

  // ------------------------------------------------------------------ trazos a mano
  line(x1: number, y1: number, x2: number, y2: number, ch: Channel = 'ink', width = 1, dashed = false) {
    this.rc.line(x1, y1, x2, y2, this.opts(ch, width, dashed ? { strokeLineDash: [this.u * 0.35, this.u * 0.3] } : {}));
  }

  path(points: Pt[], ch: Channel = 'ink', width = 1, smooth = false, dashed = false) {
    if (points.length < 2) return;
    const o = this.opts(ch, width, dashed ? { strokeLineDash: [this.u * 0.35, this.u * 0.3] } : {});
    if (smooth && points.length > 2) this.rc.curve(points, { ...o, roughness: 0.4 });
    else this.rc.linearPath(points, o);
  }

  polygon(points: Pt[], ch: Channel = 'ink', width = 1, fill?: Channel) {
    this.rc.polygon(points, {
      ...this.opts(ch, width),
      ...(fill ? { fill: CH[fill], fillStyle: 'hachure', hachureGap: this.u * 0.22, fillWeight: this.stroke * 0.7 } : {}),
    });
  }

  rect(x: number, y: number, w: number, h: number, ch: Channel = 'ink', width = 1, fill?: Channel) {
    this.rc.rectangle(x, y, w, h, {
      ...this.opts(ch, width),
      ...(fill ? { fill: CH[fill], fillStyle: 'hachure', hachureGap: this.u * 0.2, fillWeight: this.stroke * 0.8 } : {}),
    });
  }

  /** Rectángulo de resaltador (relleno a mano, sin contorno). */
  highlight(x: number, y: number, w: number, h: number) {
    this.rc.rectangle(x, y, w, h, {
      fill: CH.hi,
      fillStyle: 'hachure',
      hachureAngle: -14,
      hachureGap: this.u * 0.12,
      fillWeight: this.u * 0.16,
      stroke: 'none',
      roughness: 1.2,
      seed: this.seed++,
    });
  }

  circle(x: number, y: number, d: number, ch: Channel = 'ink', width = 1, fill?: Channel | 'solid') {
    const f =
      fill === 'solid'
        ? { fill: CH[ch], fillStyle: 'solid' }
        : fill
          ? { fill: CH[fill], fillStyle: 'hachure', hachureGap: this.u * 0.18, fillWeight: this.stroke * 0.7 }
          : {};
    this.rc.circle(x, y, d, { ...this.opts(ch, width), ...f });
  }

  arc(x: number, y: number, r: number, a0: number, a1: number, ch: Channel = 'ink', width = 1) {
    const pts: Pt[] = [];
    const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) / 0.15));
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
    }
    this.path(pts, ch, width, true);
  }

  /** Flecha (vector) con punta. */
  arrow(x1: number, y1: number, x2: number, y2: number, ch: Channel = 'pencil', width = 1) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 2) return;
    this.line(x1, y1, x2, y2, ch, width);
    const a = Math.atan2(y2 - y1, x2 - x1);
    const s = Math.min(this.u * 0.45, len * 0.4);
    this.path(
      [
        [x2 - s * Math.cos(a - 0.45), y2 - s * Math.sin(a - 0.45)],
        [x2, y2],
        [x2 - s * Math.cos(a + 0.45), y2 - s * Math.sin(a + 0.45)],
      ],
      ch,
      width,
    );
  }

  /** Resorte en zigzag entre dos puntos. */
  spring(x1: number, y1: number, x2: number, y2: number, coils = 9, amp = this.u * 0.45, ch: Channel = 'ink') {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const pts: Pt[] = [[x1, y1]];
    const lead = 0.08;
    pts.push([x1 + dx * lead, y1 + dy * lead]);
    for (let i = 0; i < coils * 2; i++) {
      const t = lead + ((1 - 2 * lead) * (i + 0.5)) / (coils * 2);
      const side = i % 2 === 0 ? 1 : -1;
      pts.push([x1 + dx * t + nx * amp * side, y1 + dy * t + ny * amp * side]);
    }
    pts.push([x1 + dx * (1 - lead), y1 + dy * (1 - lead)], [x2, y2]);
    this.rc.linearPath(pts, { ...this.opts(ch), roughness: 0.3 });
  }

  /** Superficie rayada (pared, suelo, techo). */
  hatch(x1: number, y1: number, x2: number, y2: number, side: 1 | -1 = 1) {
    this.line(x1, y1, x2, y2, 'ink');
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(3, Math.floor(len / (this.u * 0.7)));
    const nx = (-(y2 - y1) / len) * side;
    const ny = ((x2 - x1) / len) * side;
    for (let i = 0; i <= n; i++) {
      const px = x1 + ((x2 - x1) * i) / n;
      const py = y1 + ((y2 - y1) * i) / n;
      this.line(px, py, px + (nx + (x2 - x1) / len * -0.6) * this.u * 0.5, py + (ny + (y2 - y1) / len * -0.6) * this.u * 0.5, 'ink', 0.6);
    }
  }

  // ------------------------------------------------------------------ texto manuscrito
  text(s: string, x: number, y: number, size = 1, ch: Channel = 'ink', align: CanvasTextAlign = 'left', baseline: CanvasTextBaseline = 'alphabetic') {
    const px = this.u * size * 1.45; // u ≈ altura de dígito; la fuente mide ~0.62 em
    this.ctx.font = `${this.weight} ${px}px ${FONT}`;
    this.ctx.fillStyle = CH[ch];
    this.ctx.textAlign = align;
    this.ctx.textBaseline = baseline;
    this.ctx.fillText(s.replace(/-/g, '–'), x, y);
  }

  textWidth(s: string, size = 1): number {
    this.ctx.font = `${this.weight} ${this.u * size * 1.45}px ${FONT}`;
    return this.ctx.measureText(s).width;
  }

  /** Texto que se ajusta a un ancho máximo (reduce el tamaño). */
  fitText(s: string, x: number, y: number, maxW: number, size = 1, ch: Channel = 'ink', align: CanvasTextAlign = 'center') {
    const w = this.textWidth(s, size);
    this.text(s, x, y, w > maxW ? (size * maxW) / w : size, ch, align, 'middle');
  }

  // ------------------------------------------------------------------ luz (capa aditiva)
  glow(x: number, y: number, r: number, color: string, alpha = 1) {
    if (alpha <= 0.01) return;
    const g = this.lctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, withAlpha(color, alpha));
    g.addColorStop(0.35, withAlpha(color, alpha * 0.45));
    g.addColorStop(1, withAlpha(color, 0));
    this.lctx.fillStyle = g;
    this.lctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  lightPath(points: Pt[], color: string, width: number, alpha = 1) {
    if (points.length < 2) return;
    const l = this.lctx;
    l.save();
    l.strokeStyle = withAlpha(color, alpha);
    l.lineWidth = width;
    l.lineCap = 'round';
    l.lineJoin = 'round';
    l.shadowColor = withAlpha(color, alpha);
    l.shadowBlur = width * 3;
    l.beginPath();
    l.moveTo(points[0][0], points[0][1]);
    for (const p of points.slice(1)) l.lineTo(p[0], p[1]);
    l.stroke();
    l.restore();
  }

  lightRect(x: number, y: number, w: number, h: number, color: string, alpha = 0.6) {
    const l = this.lctx;
    l.save();
    l.strokeStyle = withAlpha(color, alpha);
    l.lineWidth = this.stroke * 1.6;
    l.shadowColor = withAlpha(color, alpha);
    l.shadowBlur = this.u * 0.8;
    l.strokeRect(x, y, w, h);
    l.restore();
  }
}

export function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, a))})`;
}

/** Punto a lo largo de una polilínea (parámetro s en px). Devuelve también la longitud total. */
export function pointAlong(points: Pt[], s: number): { p: Pt; total: number } {
  const lens: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const l = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    lens.push(l);
    total += l;
  }
  let d = ((s % total) + total) % total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i]) {
      const t = lens[i] ? d / lens[i] : 0;
      const a = points[i];
      const b = points[i + 1];
      return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], total };
    }
    d -= lens[i];
  }
  return { p: points[points.length - 1], total };
}
