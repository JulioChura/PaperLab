/**
 * Distribución de la solución DENTRO de la hoja real (su contorno convexo):
 *  - Los pasos se escriben debajo de lo que el alumno escribió, alineados a su margen izquierdo,
 *    con la misma altura de letra, y cada línea se ajusta al ancho de la hoja a esa altura
 *    (si la hoja está inclinada, el renglón se corre para no salirse del papel).
 *  - La gráfica ocupa el cuadrado libre más grande que cabe dentro de la hoja sin pisar
 *    lo escrito; si no hay espacio suficiente, no se dibuja.
 */
import type { PaperInkProfile, NormRect } from './paperVision';
import type { SolutionPlan } from './mathEngine';
import { digitHeightPx, handStyleFor, renderGraph, renderMathLine, type RenderedLayer } from './handwriting';
import type { LayerPlacement } from './arScene';
import { boxesOverlap, ConvexRegion, type Box, type Pt } from './geometry';

export interface PlacedLayer {
  layer: RenderedLayer;
  place: LayerPlacement;
  duration: number;
  title: string;
  isGraph: boolean;
}

const FONT_PX = 120;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * @param blocked zonas (normalizadas al frame) tapadas por la interfaz, p. ej. el panel de pasos:
 *                no se escribe debajo de ellas.
 */
export interface LayoutResult {
  layers: PlacedLayer[];
  /** Área de la simulación animada y altura de letra (unidades del ancla) para escalarla. */
  figure: { place: LayerPlacement; charH: number } | null;
}

export function layoutSolution(plan: SolutionPlan, profile: PaperInkProfile, blocked: NormRect[] = []): LayoutResult {
  const aspect = profile.frameHeight / profile.frameWidth;
  // Coordenadas normalizadas del frame → unidades del ancla (x a la derecha, y hacia arriba)
  const X = (u: number) => u - 0.5;
  const Y = (v: number) => (0.5 - v) * aspect;

  const region = new ConvexRegion(profile.paperHull.map(([u, v]) => [X(u), Y(v)] as Pt));
  const paper: NormRect = profile.paperRect;
  const ink: NormRect = profile.inkRect ?? {
    x: paper.x + paper.w * 0.12,
    y: paper.y + paper.h * 0.08,
    w: paper.w * 0.5,
    h: profile.charHeight,
  };

  const charH0 = clamp(profile.charHeight * aspect, 0.018, 0.08);
  const style = handStyleFor(FONT_PX, profile.strokeRatio, 11);
  const digitPx = digitHeightPx(FONT_PX, style.weight);
  const rendered = plan.lines.map((line) => ({ line, layer: renderMathLine(line.tokens, style, line.answer) }));

  const inkBox: Box = { x: X(ink.x), y: Y(ink.y), w: ink.w, h: ink.h * aspect };
  const uiBoxes: Box[] = blocked.map((b) => ({ x: X(b.x), y: Y(b.y), w: b.w, h: b.h * aspect }));
  const startX = X(ink.x);
  const reserveForGraph = plan.graphPrimary ? 0.4 : 0;

  interface LineSlot { x: number; y: number; w: number; h: number; pad: number; layer: RenderedLayer; title: string; duration: number }

  /** Intenta escribir todos los pasos con la escala k; devuelve null si algo se sale de la hoja. */
  const tryLayout = (k: number, charH: number, avoid: Box[] = []): LineSlot[] | null => {
    const margin = charH * 0.6;
    const lineGap = charH * 0.75;
    let y = Y(ink.y + ink.h) - charH * 0.9;
    const floor = region.minY + (region.maxY - region.minY) * reserveForGraph;
    const slots: LineSlot[] = [];
    const obstacles = [...uiBoxes, ...avoid];
    for (const { line, layer } of rendered) {
      const w = layer.contentWidth * k;
      const h = layer.contentHeight * k;
      let placed = false;
      for (let guard = 0; guard < 60 && !placed; guard++) {
        if (y - h < floor + margin) return null;
        const span = region.bandSpan(y - h, y, margin);
        if (!span) return null;
        // intervalos libres del renglón descontando los obstáculos que lo cruzan (figura, panel)
        let free: [number, number][] = [span];
        for (const o of obstacles) {
          if (!(o.y - o.h < y && y - h < o.y)) continue;
          free = free.flatMap(([lo, hi]) => {
            const parts: [number, number][] = [];
            if (o.x - margin > lo) parts.push([lo, Math.min(hi, o.x - margin)]);
            if (o.x + o.w + margin < hi) parts.push([Math.max(lo, o.x + o.w + margin), hi]);
            return parts;
          });
        }
        const fits = free.filter(([lo, hi]) => hi - lo >= w);
        // preferir el margen del alumno; si no, el primer hueco que alcance
        const pick = fits.find(([lo, hi]) => startX >= lo && startX + w <= hi) ?? fits[0];
        if (pick) {
          const x = clamp(startX, pick[0], pick[1] - w);
          slots.push({ x, y, w, h, pad: layer.pad * k, layer, title: line.title, duration: 0.45 + layer.strokeCount * 0.055 });
          y -= h + lineGap;
          placed = true;
        } else {
          y -= charH * 0.5; // bajar y reintentar (p. ej. por debajo de la figura)
        }
      }
      if (!placed) return null;
    }
    return slots;
  };

  /** Rectángulo libre más grande (con la proporción pedida) dentro de la hoja, cerca de la solución. */
  const findFreeRect = (ratio: number, minW: number, maxW: number, occupied: Box[], charH: number, near: Pt) => {
    const margin = charH * 0.6;
    const regionW = region.maxX - region.minX;
    const regionH = region.maxY - region.minY;
    const top = Math.min(maxW, regionW, regionH * ratio);
    for (let w = top; w >= minW; w *= 0.93) {
      const h = w / ratio;
      const stepX = Math.max(w / 7, regionW / 45);
      const stepY = Math.max(h / 7, regionH / 45);
      let best: Box | null = null;
      let bestDist = Infinity;
      for (let gx = region.minX; gx + w <= region.maxX; gx += stepX) {
        for (let gy = region.maxY; gy - h >= region.minY; gy -= stepY) {
          const box: Box = { x: gx, y: gy, w, h };
          const corners: Pt[] = [[gx, gy], [gx + w, gy], [gx + w, gy - h], [gx, gy - h]];
          if (!corners.every((c) => region.contains(c, margin))) continue;
          if (occupied.some((o) => boxesOverlap(o, box))) continue;
          const dist = Math.hypot(gx - near[0], gy - near[1]);
          if (dist < bestDist) {
            bestDist = dist;
            best = box;
          }
        }
      }
      if (best) return best;
    }
    return null;
  };
  const occupiedBy = (slots: LineSlot[], charH: number, extra: Box[] = []) => {
    const pad = charH * 0.5;
    return [inkBox, ...uiBoxes, ...extra, ...slots.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }))].map((b) => ({
      x: b.x - pad,
      y: b.y + pad,
      w: b.w + pad * 2,
      h: b.h + pad * 2,
    }));
  };
  const nearOf = (slots: LineSlot[]): Pt => [
    Math.max(...slots.map((s) => s.x + s.w), inkBox.x + inkBox.w),
    Y(ink.y + ink.h),
  ];

  // De la escala del alumno hacia abajo, hasta que todo (texto + simulación) quepa en la hoja
  const k0 = charH0 / digitPx;
  let slots: LineSlot[] | null = null;
  let charH = charH0;
  let figRect: Box | null = null;
  if (plan.figure) {
    // 1) La simulación es el contenido principal: el mayor rectángulo libre (≤ 58 % del ancho de la hoja)
    //    junto a lo que escribió el alumno; 2) el texto se acomoda alrededor de ella.
    const regionW = region.maxX - region.minX;
    const regionH = region.maxY - region.minY;
    // Prioridad: mantener la letra del alumno; a igual letra, la figura más grande que deje sitio al texto
    for (let f = 1; f >= 0.45 && !slots; f -= 0.05) {
      charH = charH0 * f;
      const minW = plan.figure.minWidthChars * charH;
      const maxW0 = Math.min(regionW * 0.58, regionH * 0.78 * plan.figure.aspect);
      for (const share of [1, 0.82, 0.68, 0.55, 0.45]) {
        const maxW = Math.max(minW, maxW0 * share);
        const fig = findFreeRect(plan.figure.aspect, minW, maxW, occupiedBy([], charH), charH, [inkBox.x + inkBox.w, inkBox.y - inkBox.h]);
        if (!fig) break;
        const pad = charH * 0.4;
        const attempt = tryLayout(k0 * f, charH, [{ x: fig.x - pad, y: fig.y + pad, w: fig.w + pad * 2, h: fig.h + pad * 2 }]);
        if (!attempt) continue;
        slots = attempt;
        figRect = fig;
        break;
      }
    }
  }
  for (let f = 1; f >= 0.45 && !slots; f -= 0.05) {
    charH = charH0 * f;
    const attempt = tryLayout(k0 * f, charH);
    if (!attempt) continue;
    if (plan.figure) {
      const minW = plan.figure.minWidthChars * charH;
      figRect = findFreeRect(plan.figure.aspect, minW, charH * 60, occupiedBy(attempt, charH), charH, nearOf(attempt));
      if (!figRect) continue;
    }
    slots = attempt;
  }
  if (!slots) {
    // Hoja muy pequeña o mal detectada: escala mínima sin restricción de contorno
    charH = charH0 * 0.45;
    const kmin = k0 * 0.45;
    let y = Y(ink.y + ink.h) - charH * 0.9;
    slots = rendered.map(({ line, layer }) => {
      const slot = { x: startX, y, w: layer.contentWidth * kmin, h: layer.contentHeight * kmin, pad: layer.pad * kmin, layer, title: line.title, duration: 0.45 + layer.strokeCount * 0.055 };
      y -= slot.h + charH * 0.75;
      return slot;
    });
    if (plan.figure) {
      figRect =
        findFreeRect(plan.figure.aspect, charH * 6, charH * 60, occupiedBy(slots, charH), charH, nearOf(slots)) ??
        findFreeRect(plan.figure.aspect, charH * 4, charH * 60, [...uiBoxes], charH, nearOf(slots));
    }
  }
  const k = charH / digitPx;

  const out: PlacedLayer[] = slots.map((s) => ({
    layer: s.layer,
    place: {
      x: s.x - s.pad,
      y: s.y + s.pad,
      w: s.layer.canvas.width * k,
      h: s.layer.canvas.height * k,
    },
    duration: s.duration,
    title: s.title,
    isGraph: false,
  }));

  // ---- Gráfica (matemáticas): el cuadrado libre más grande dentro de la hoja ----
  if (plan.graph) {
    const best = findFreeRect(1, charH * 5.5, charH * 15, occupiedBy(slots, charH, figRect ? [figRect] : []), charH, nearOf(slots));
    if (best) {
      const sizePx = 720;
      const kg = best.w / sizePx;
      const labelPx = Math.min(charH * 0.85, best.w / 9) / kg / 0.62;
      const graphStyle = handStyleFor(FONT_PX, profile.strokeRatio, 23);
      // el grosor de ejes y curva debe coincidir con el de la letra en unidades reales
      graphStyle.strokePx = Math.max(1.5, (style.strokePx * k) / kg);
      graphStyle.extraStrokePx = (style.extraStrokePx * k) / kg;
      const layer = renderGraph(plan.graph, graphStyle, sizePx, labelPx);
      out.push({
        layer,
        place: { x: best.x, y: best.y, w: best.w, h: best.w },
        duration: 2.4,
        title: 'Gráfica',
        isGraph: true,
      });
    }
  }

  console.info(
    `[PaperLab AR] Espacio de la hoja: polígono de ${profile.paperHull.length} vértices · escala ${(charH / charH0).toFixed(2)}×` +
      (plan.figure ? ` · simulación ${figRect ? 'colocada' : 'sin espacio'}` : '') +
      (plan.graph ? ` · gráfica ${out.some((o) => o.isGraph) ? 'sí' : 'no (sin espacio)'}` : ''),
  );
  return { layers: out, figure: figRect ? { place: figRect, charH } : null };
}
