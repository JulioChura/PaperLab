/**
 * Renderizado manuscrito a canvas (fuente Caveat + rough.js).
 *
 * Cada canal del canvas es una MÁSCARA, no un color final:
 *   R = tinta del estudiante (grafito / lapicero)
 *   G = resaltador (respuesta final)
 *   B = lápiz de color (curva de la gráfica)
 * El shader de arScene.ts convierte estas máscaras en pigmento real usando el color de la tinta
 * medido en la foto y las mezcla multiplicativamente sobre el papel de la cámara.
 */
import rough from 'roughjs';
import type { MathToken, GraphSpec } from './mathEngine';

const INK = '#ff0000';
const HIGHLIGHT = '#00ff00';
const PENCIL = '#0000ff';
const FONT_FAMILY = "Caveat, 'Segoe Print', 'Comic Sans MS', cursive";

type RoughCanvas = ReturnType<typeof rough.canvas>;

export interface HandStyle {
  /** Tamaño de fuente en px del canvas. */
  fontPx: number;
  /** Peso de la fuente (400–700) derivado del grosor real del trazo. */
  weight: number;
  /** Grosor de las líneas a mano alzada en px del canvas. */
  strokePx: number;
  /** Trazo extra para tintas muy gruesas (plumón). */
  extraStrokePx: number;
  seed: number;
}

export interface RenderedLayer {
  canvas: HTMLCanvasElement;
  /** Margen interno del canvas (px) alrededor del contenido. */
  pad: number;
  contentWidth: number;
  contentHeight: number;
  /** Número aproximado de trazos: controla la duración del "escrito a mano". */
  strokeCount: number;
}

export async function ensureHandwritingFont(): Promise<void> {
  try {
    await Promise.all([document.fonts.load(`500 64px Caveat`), document.fonts.load(`700 64px Caveat`)]);
  } catch {
    // si la fuente no carga, se usa la alternativa cursiva del sistema
  }
}

/** Traduce el grosor relativo medido en la foto a parámetros de estilo. */
export function handStyleFor(fontPx: number, strokeRatio: number, seed = 7): HandStyle {
  const charPx = fontPx * 0.62;
  const strokePx = Math.max(1.5, strokeRatio * charPx);
  const weight = Math.round(Math.min(700, Math.max(400, 400 + (strokeRatio - 0.06) * 2600)));
  const extraStrokePx = Math.max(0, (strokeRatio - 0.15) * charPx);
  return { fontPx, weight, strokePx, extraStrokePx, seed };
}

interface Box {
  w: number;
  asc: number;
  desc: number;
  strokes: number;
  draw: (ctx: CanvasRenderingContext2D, rc: RoughCanvas, x: number, base: number, color: string) => void;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const c = document.createElement('canvas');
    measureCtx = c.getContext('2d');
    if (!measureCtx) throw new Error('Canvas 2D no disponible');
  }
  return measureCtx;
}

const fontString = (size: number, weight: number) => `${weight} ${size}px ${FONT_FAMILY}`;

/** Altura real del dígito "2" en px para un tamaño de fuente dado (para igualar la letra del alumno). */
export function digitHeightPx(fontPx: number, weight: number): number {
  const ctx = getMeasureCtx();
  ctx.font = fontString(fontPx, weight);
  const m = ctx.measureText('2');
  return m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || fontPx * 0.62;
}

function layoutTokens(tokens: MathToken[], size: number, style: HandStyle): Box {
  const boxes = tokens.map((tok) => layoutToken(tok, size, style));
  const w = boxes.reduce((s, b) => s + b.w, 0);
  const asc = Math.max(size * 0.5, ...boxes.map((b) => b.asc));
  const desc = Math.max(size * 0.12, ...boxes.map((b) => b.desc));
  const strokes = boxes.reduce((s, b) => s + b.strokes, 0);
  return {
    w,
    asc,
    desc,
    strokes,
    draw: (ctx, rc, x, base, color) => {
      let cx = x;
      for (const b of boxes) {
        b.draw(ctx, rc, cx, base, color);
        cx += b.w;
      }
    },
  };
}

function roughOpts(style: HandStyle, color: string, scale = 1) {
  return {
    stroke: color,
    strokeWidth: style.strokePx * scale,
    roughness: 0.75,
    bowing: 0.8,
    seed: style.seed,
    disableMultiStroke: true,
  };
}

function layoutToken(tok: MathToken, size: number, style: HandStyle): Box {
  const ctx = getMeasureCtx();
  switch (tok.k) {
    case 't': {
      ctx.font = fontString(size, style.weight);
      const w = ctx.measureText(tok.s).width;
      return {
        w,
        asc: size * 0.72,
        desc: size * 0.24,
        strokes: tok.s.replace(/\s/g, '').length,
        draw: (c, _rc, x, base, color) => {
          c.font = fontString(size, style.weight);
          c.fillStyle = color;
          c.textBaseline = 'alphabetic';
          c.fillText(tok.s, x, base);
          if (style.extraStrokePx > 0) {
            c.lineWidth = style.extraStrokePx * (size / style.fontPx);
            c.lineJoin = 'round';
            c.strokeStyle = color;
            c.strokeText(tok.s, x, base);
          }
        },
      };
    }
    case 'sup':
    case 'sub': {
      const inner = layoutToken({ k: 't', s: tok.s }, size * 0.62, style);
      const shift = tok.k === 'sup' ? -size * 0.42 : size * 0.2;
      return {
        w: inner.w + size * 0.04,
        asc: Math.max(0, inner.asc - shift),
        desc: Math.max(0, inner.desc + shift),
        strokes: inner.strokes,
        draw: (c, rc, x, base, color) => inner.draw(c, rc, x + size * 0.02, base + shift, color),
      };
    }
    case 'frac': {
      const num = layoutTokens(tok.num, size * 0.86, style);
      const den = layoutTokens(tok.den, size * 0.86, style);
      const barW = Math.max(num.w, den.w) + size * 0.3;
      const axis = size * 0.3;
      const g = size * 0.12;
      const w = barW + size * 0.24;
      return {
        w,
        asc: axis + g + num.asc + num.desc,
        desc: Math.max(0, -axis + g + den.asc + den.desc),
        strokes: num.strokes + den.strokes + 1,
        draw: (c, rc, x, base, color) => {
          const bx = x + size * 0.12;
          num.draw(c, rc, bx + (barW - num.w) / 2, base - axis - g - num.desc, color);
          rc.line(bx, base - axis, bx + barW, base - axis, roughOpts(style, color));
          den.draw(c, rc, bx + (barW - den.w) / 2, base - axis + g + den.asc, color);
        },
      };
    }
    case 'sqrt': {
      const body = layoutTokens(tok.body, size, style);
      const top = body.asc + size * 0.1;
      const lead = size * 0.5;
      const w = lead + body.w + size * 0.12;
      return {
        w,
        asc: top + size * 0.08,
        desc: Math.max(body.desc, size * 0.12),
        strokes: body.strokes + 2,
        draw: (c, rc, x, base, color) => {
          rc.linearPath(
            [
              [x + size * 0.02, base - size * 0.28],
              [x + size * 0.13, base - size * 0.34],
              [x + size * 0.27, base + size * 0.08],
              [x + size * 0.44, base - top],
              [x + w, base - top],
            ],
            roughOpts(style, color),
          );
          body.draw(c, rc, x + lead, base, color);
        },
      };
    }
    case 'delta':
      return {
        w: size * 0.62,
        asc: size * 0.7,
        desc: 0,
        strokes: 3,
        draw: (_c, rc, x, base, color) => {
          rc.polygon(
            [
              [x + size * 0.05, base],
              [x + size * 0.31, base - size * 0.66],
              [x + size * 0.57, base],
            ],
            roughOpts(style, color),
          );
        },
      };
    case 'empty':
      return {
        w: size * 0.66,
        asc: size * 0.72,
        desc: size * 0.08,
        strokes: 2,
        draw: (_c, rc, x, base, color) => {
          rc.ellipse(x + size * 0.33, base - size * 0.32, size * 0.46, size * 0.52, roughOpts(style, color));
          rc.line(x + size * 0.06, base + size * 0.06, x + size * 0.6, base - size * 0.72, roughOpts(style, color));
        },
      };
    case 'approx': {
      const tilde = (cx: number, cy: number): [number, number][] => [
        [cx - size * 0.2, cy + size * 0.03],
        [cx - size * 0.08, cy - size * 0.05],
        [cx + size * 0.06, cy + size * 0.04],
        [cx + size * 0.2, cy - size * 0.04],
      ];
      return {
        w: size * 0.7,
        asc: size * 0.5,
        desc: 0,
        strokes: 2,
        draw: (_c, rc, x, base, color) => {
          rc.curve(tilde(x + size * 0.35, base - size * 0.4), roughOpts(style, color));
          rc.curve(tilde(x + size * 0.35, base - size * 0.22), roughOpts(style, color));
        },
      };
    }
    case 'gap':
      return { w: tok.em * size * 0.5, asc: 0, desc: 0, strokes: 0, draw: () => undefined };
  }
}

function createMaskCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.ceil(w));
  canvas.height = Math.max(2, Math.ceil(h));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'lighter';
  return { canvas, ctx, rc: rough.canvas(canvas) };
}

/** Dibuja una línea de la solución. `answer` añade el resaltador detrás. */
export function renderMathLine(tokens: MathToken[], style: HandStyle, answer = false): RenderedLayer {
  const size = style.fontPx;
  const box = layoutTokens(tokens, size, style);
  const pad = size * 0.45;
  const { canvas, ctx, rc } = createMaskCanvas(box.w + pad * 2, box.asc + box.desc + pad * 2);

  if (answer) {
    rc.rectangle(pad - size * 0.22, pad - size * 0.1, box.w + size * 0.44, box.asc + box.desc + size * 0.2, {
      fill: HIGHLIGHT,
      fillStyle: 'hachure',
      hachureAngle: -14,
      hachureGap: size * 0.1,
      fillWeight: size * 0.14,
      stroke: 'none',
      roughness: 1.4,
      seed: style.seed + 3,
    });
    rc.rectangle(pad - size * 0.26, pad - size * 0.14, box.w + size * 0.52, box.asc + box.desc + size * 0.28, {
      ...roughOpts(style, PENCIL, 0.9),
      roughness: 1.1,
      seed: style.seed + 5,
    });
  }
  box.draw(ctx, rc, pad, pad + box.asc, INK);

  return {
    canvas,
    pad,
    contentWidth: box.w,
    contentHeight: box.asc + box.desc,
    strokeCount: box.strokes,
  };
}

function niceStep(span: number): number {
  const raw = span / 7;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow;
}

/** Gráfica dibujada a mano: ejes con la tinta del alumno, curva con lápiz de color. */
export function renderGraph(
  spec: GraphSpec,
  style: HandStyle,
  sizePx: number,
  labelPx: number,
): RenderedLayer {
  const S = sizePx;
  const { canvas, ctx, rc } = createMaskCanvas(S, S);
  const m = labelPx * 1.25;
  const X = (x: number) => m + ((x - spec.xMin) / (spec.xMax - spec.xMin)) * (S - 2 * m);
  const Y = (y: number) => S - m - ((y - spec.yMin) / (spec.yMax - spec.yMin)) * (S - 2 * m);
  const labelStyle: HandStyle = { ...style, fontPx: labelPx };
  const axisOpts = roughOpts(style, INK, 0.85);

  const x0 = Math.min(Math.max(0, spec.xMin), spec.xMax);
  const y0 = Math.min(Math.max(0, spec.yMin), spec.yMax);
  const ax = X(x0);
  const ay = Y(y0);
  const arrow = labelPx * 0.32;

  // Ejes con flechas
  rc.line(m * 0.4, ay, S - m * 0.4, ay, axisOpts);
  rc.linearPath([[S - m * 0.4 - arrow, ay - arrow * 0.6], [S - m * 0.4, ay], [S - m * 0.4 - arrow, ay + arrow * 0.6]], axisOpts);
  rc.line(ax, S - m * 0.4, ax, m * 0.4, axisOpts);
  rc.linearPath([[ax - arrow * 0.6, m * 0.4 + arrow], [ax, m * 0.4], [ax + arrow * 0.6, m * 0.4 + arrow]], axisOpts);
  layoutToken({ k: 't', s: 'x' }, labelPx, labelStyle).draw(ctx, rc, S - m * 0.75, ay - labelPx * 0.3, INK);
  layoutToken({ k: 't', s: 'y' }, labelPx, labelStyle).draw(ctx, rc, ax + labelPx * 0.25, m * 0.75, INK);

  // Marcas de escala
  const tickOpts = roughOpts(style, INK, 0.6);
  const sx = niceStep(spec.xMax - spec.xMin);
  for (let v = Math.ceil(spec.xMin / sx) * sx; v <= spec.xMax; v += sx) {
    if (Math.abs(v - x0) < sx * 0.01) continue;
    rc.line(X(v), ay - labelPx * 0.14, X(v), ay + labelPx * 0.14, tickOpts);
  }
  const sy = niceStep(spec.yMax - spec.yMin);
  for (let v = Math.ceil(spec.yMin / sy) * sy; v <= spec.yMax; v += sy) {
    if (Math.abs(v - y0) < sy * 0.01) continue;
    rc.line(ax - labelPx * 0.14, Y(v), ax + labelPx * 0.14, Y(v), tickOpts);
  }

  // Curva (lápiz de color), recortada al área del gráfico
  ctx.save();
  ctx.beginPath();
  ctx.rect(m * 0.5, m * 0.5, S - m, S - m);
  ctx.clip();
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];
  const ySpan = spec.yMax - spec.yMin;
  let prevY: number | null = null;
  const N = 160;
  for (let i = 0; i <= N; i++) {
    const x = spec.xMin + ((spec.xMax - spec.xMin) * i) / N;
    const y = spec.fn(x);
    const ok = Number.isFinite(y) && y > spec.yMin - ySpan && y < spec.yMax + ySpan;
    const jump = prevY !== null && Number.isFinite(y) && Math.abs(y - prevY) > ySpan * 0.8;
    if (!ok || jump) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    if (ok) current.push([X(x), Y(y)]);
    prevY = Number.isFinite(y) ? y : null;
  }
  if (current.length > 1) segments.push(current);
  const curveOpts = { ...roughOpts(style, PENCIL, 1.35), roughness: 0.5, bowing: 0.3 };
  for (const seg of segments) rc.curve(seg, curveOpts);
  ctx.restore();

  // Puntos notables
  for (const p of spec.points) {
    if (p.x < spec.xMin || p.x > spec.xMax || p.y < spec.yMin || p.y > spec.yMax) continue;
    const px = X(p.x);
    const py = Y(p.y);
    if (p.kind === 'root') {
      rc.circle(px, py, labelPx * 0.55, roughOpts(style, INK, 0.9));
      const lbl = layoutToken({ k: 't', s: p.label.replace('-', '–') }, labelPx * 0.85, labelStyle);
      const below = py + labelPx * 1.05 < S - m * 0.2;
      lbl.draw(ctx, rc, px - lbl.w / 2, below ? py + labelPx * 1.0 : py - labelPx * 0.45, INK);
    } else {
      rc.circle(px, py, labelPx * 0.32, { ...roughOpts(style, PENCIL), fill: PENCIL, fillStyle: 'solid' });
      const lbl = layoutToken({ k: 't', s: p.label }, labelPx * 0.8, labelStyle);
      const lx = Math.min(Math.max(px - lbl.w / 2, m * 0.2), S - lbl.w - m * 0.2);
      // en un mínimo la curva sube a ambos lados: la etiqueta va debajo para no taparla
      const dx = (spec.xMax - spec.xMin) * 0.05;
      const isMin = spec.fn(p.x - dx) > p.y && spec.fn(p.x + dx) > p.y;
      const fitsBelow = py + labelPx * 1.1 < S - m * 0.2;
      const below = (isMin && fitsBelow) || py - labelPx * 0.6 <= m;
      lbl.draw(ctx, rc, lx, below ? py + labelPx * 1.05 : py - labelPx * 0.5, PENCIL);
    }
  }

  // Solución de una inecuación: franja de resaltador sobre el eje x y extremos abiertos/cerrados
  if (spec.shade?.length) {
    for (const [a, b] of spec.shade) {
      const xa = X(Math.max(spec.xMin, a));
      const xb = X(Math.min(spec.xMax, b));
      rc.rectangle(Math.min(xa, xb), ay - labelPx * 0.32, Math.max(2, Math.abs(xb - xa)), labelPx * 0.64, {
        fill: HIGHLIGHT, fillStyle: 'hachure', hachureAngle: -20, hachureGap: labelPx * 0.12, fillWeight: labelPx * 0.14, stroke: 'none', roughness: 1.2, seed: style.seed + 9,
      });
      for (const e of [a, b]) {
        if (!Number.isFinite(e) || e < spec.xMin || e > spec.xMax) continue;
        rc.circle(X(e), ay, labelPx * 0.45, { ...roughOpts(style, PENCIL, 1), ...(spec.shadeClosed ? { fill: PENCIL, fillStyle: 'solid' } : {}) });
      }
    }
  }

  // Etiqueta de la función
  if (spec.label.length) {
    const label = layoutTokens(spec.label, labelPx * 0.9, labelStyle);
    const lx = Math.min(S - label.w - m * 0.3, Math.max(m * 0.3, ax + labelPx * 0.6));
    label.draw(ctx, rc, lx, m * 0.6 + label.asc, PENCIL);
  }

  return { canvas, pad: 0, contentWidth: S, contentHeight: S, strokeCount: 40 };
}
