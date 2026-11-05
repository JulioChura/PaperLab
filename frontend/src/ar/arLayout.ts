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
export function layoutSolution(plan: SolutionPlan, profile: PaperInkProfile, blocked: NormRect[] = []): PlacedLayer[] {
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
  const tryLayout = (k: number, charH: number): LineSlot[] | null => {
    const margin = charH * 0.6;
    const lineGap = charH * 0.75;
    let y = Y(ink.y + ink.h) - charH * 0.9;
    const floor = region.minY + (region.maxY - region.minY) * reserveForGraph;
    const slots: LineSlot[] = [];
    for (const { line, layer } of rendered) {
      const w = layer.contentWidth * k;
      const h = layer.contentHeight * k;
      if (y - h < floor + margin) return null;
      const span = region.bandSpan(y - h, y, margin);
      if (!span || span[1] - span[0] < w) return null;
      // alineado al margen del alumno, pero corrido si la hoja (inclinada) no da espacio
      const x = clamp(startX, span[0], span[1] - w);
      if (uiBoxes.some((u) => boxesOverlap(u, { x, y, w, h }))) return null;
      slots.push({ x, y, w, h, pad: layer.pad * k, layer, title: line.title, duration: 0.45 + layer.strokeCount * 0.055 });
      y -= h + lineGap;
    }
    return slots;
  };

  // De la escala del alumno hacia abajo, hasta que todo quepa en la hoja
  const k0 = charH0 / digitPx;
  let slots: LineSlot[] | null = null;
  let charH = charH0;
  for (let f = 1; f >= 0.45 && !slots; f -= 0.05) {
    charH = charH0 * f;
    slots = tryLayout(k0 * f, charH);
  }
  if (!slots) {
    // Hoja muy pequeña o mal detectada: escala mínima sin restricción de contorno
    charH = charH0 * 0.45;
    const k = k0 * 0.45;
    let y = Y(ink.y + ink.h) - charH * 0.9;
    slots = rendered.map(({ line, layer }) => {
      const slot = { x: startX, y, w: layer.contentWidth * k, h: layer.contentHeight * k, pad: layer.pad * k, layer, title: line.title, duration: 0.45 + layer.strokeCount * 0.055 };
      y -= slot.h + charH * 0.75;
      return slot;
    });
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

  // ---- Gráfica: el cuadrado libre más grande dentro de la hoja ----
  if (plan.graph) {
    const pad = charH * 0.5;
    const occupied: Box[] = [inkBox, ...uiBoxes, ...slots.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }))].map((b) => ({
      x: b.x - pad,
      y: b.y + pad,
      w: b.w + pad * 2,
      h: b.h + pad * 2,
    }));
    const margin = charH * 0.6;
    const minSize = charH * 5.5;
    const maxSize = Math.min(charH * 15, region.maxX - region.minX, region.maxY - region.minY);
    const stepsRight = Math.max(...slots.map((s) => s.x + s.w), inkBox.x + inkBox.w);
    const anchorPt: Pt = [stepsRight, Y(ink.y + ink.h)];

    let best: { x: number; y: number; size: number } | null = null;
    for (let size = maxSize; size >= minSize && !best; size *= 0.92) {
      const stepX = Math.max(size / 6, (region.maxX - region.minX) / 40);
      const stepY = Math.max(size / 6, (region.maxY - region.minY) / 40);
      let bestDist = Infinity;
      for (let gx = region.minX; gx + size <= region.maxX; gx += stepX) {
        for (let gy = region.maxY; gy - size >= region.minY; gy -= stepY) {
          const box: Box = { x: gx, y: gy, w: size, h: size };
          const corners: Pt[] = [[gx, gy], [gx + size, gy], [gx + size, gy - size], [gx, gy - size]];
          if (!corners.every((c) => region.contains(c, margin))) continue;
          if (occupied.some((o) => boxesOverlap(o, box))) continue;
          // a igual tamaño, el más cercano a la solución (a la derecha / debajo de los pasos)
          const dist = Math.hypot(gx - anchorPt[0], gy - anchorPt[1]);
          if (dist < bestDist) {
            bestDist = dist;
            best = { x: gx, y: gy, size };
          }
        }
      }
    }

    if (best) {
      const sizePx = 720;
      const kg = best.size / sizePx;
      const labelPx = Math.min(charH * 0.85, best.size / 9) / kg / 0.62;
      const graphStyle = handStyleFor(FONT_PX, profile.strokeRatio, 23);
      // el grosor de ejes y curva debe coincidir con el de la letra en unidades reales
      graphStyle.strokePx = Math.max(1.5, (style.strokePx * k) / kg);
      graphStyle.extraStrokePx = (style.extraStrokePx * k) / kg;
      const layer = renderGraph(plan.graph, graphStyle, sizePx, labelPx);
      out.push({
        layer,
        place: { x: best.x, y: best.y, w: best.size, h: best.size },
        duration: 2.4,
        title: 'Gráfica',
        isGraph: true,
      });
    }
  }

  console.info(
    `[PaperLab AR] Espacio de la hoja: polígono de ${profile.paperHull.length} vértices · escala ${(charH / charH0).toFixed(2)}× · gráfica ${out.some((o) => o.isGraph) ? 'sí' : 'no (sin espacio)'}`,
  );
  return out;
}
