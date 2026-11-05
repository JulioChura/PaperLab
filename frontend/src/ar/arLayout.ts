/**
 * Distribución de la solución sobre la hoja real:
 *  - Los pasos se escriben debajo de lo que el alumno escribió, alineados a su margen izquierdo
 *    y con la misma altura de letra.
 *  - La gráfica ocupa el espacio libre a la derecha (o debajo) solo si cabe dentro de la hoja.
 */
import type { PaperInkProfile, NormRect } from './paperVision';
import type { SolutionPlan } from './mathEngine';
import { digitHeightPx, handStyleFor, renderGraph, renderMathLine, type RenderedLayer } from './handwriting';
import type { LayerPlacement } from './arScene';

export interface PlacedLayer {
  layer: RenderedLayer;
  place: LayerPlacement;
  duration: number;
  title: string;
  isGraph: boolean;
}

const FONT_PX = 120;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function layoutSolution(plan: SolutionPlan, profile: PaperInkProfile): PlacedLayer[] {
  const aspect = profile.frameHeight / profile.frameWidth;
  // Conversión de coordenadas normalizadas del frame → unidades del ancla
  const X = (u: number) => u - 0.5;
  const Y = (v: number) => (0.5 - v) * aspect;

  const paper: NormRect = profile.paperRect;
  const ink: NormRect = profile.inkRect ?? {
    x: paper.x + paper.w * 0.12,
    y: paper.y + paper.h * 0.08,
    w: paper.w * 0.5,
    h: profile.charHeight,
  };

  // Altura de carácter del alumno en unidades del ancla
  let charH = clamp(profile.charHeight * aspect, 0.018, 0.08);
  const style = handStyleFor(FONT_PX, profile.strokeRatio, 11);
  const digitPx = digitHeightPx(FONT_PX, style.weight);

  const paperLeft = X(paper.x);
  const paperRight = X(paper.x + paper.w);
  const paperBottom = Y(paper.y + paper.h);
  const margin = () => charH * 0.7;

  const rendered = plan.lines.map((line) => ({ line, layer: renderMathLine(line.tokens, style, line.answer) }));

  const measure = (k: number) => {
    const lineGap = charH * 0.75;
    let height = 0;
    let width = 0;
    for (const { layer } of rendered) {
      height += layer.contentHeight * k + lineGap;
      width = Math.max(width, layer.contentWidth * k);
    }
    return { height, width, lineGap };
  };

  const startX = clamp(X(ink.x), paperLeft + charH * 0.6, paperRight - charH * 4);
  const startY = Y(ink.y + ink.h) - charH * 0.9;
  const availH = startY - (paperBottom + margin());
  const availW = paperRight - margin() - startX;

  // escala: unidades del ancla por px de canvas, para que el dígito mida igual que el del alumno
  let k = charH / digitPx;
  let { height, width, lineGap } = measure(k);
  const reserveForGraph = plan.graphPrimary ? 0.45 : 0;
  const maxH = availH * (1 - reserveForGraph);
  if (height > maxH || width > availW) {
    const shrink = clamp(Math.min(maxH / height, availW / width), 0.5, 1);
    k *= shrink;
    charH *= shrink;
    ({ height, width, lineGap } = measure(k));
  }

  const out: PlacedLayer[] = [];
  let y = startY;
  for (const { line, layer } of rendered) {
    const pad = layer.pad * k;
    out.push({
      layer,
      place: {
        x: startX - pad,
        y: y + pad,
        w: layer.canvas.width * k,
        h: layer.canvas.height * k,
      },
      duration: 0.45 + layer.strokeCount * 0.055,
      title: line.title,
      isGraph: false,
    });
    y -= layer.contentHeight * k + lineGap;
  }
  const stepsBottom = y;

  // ---- Gráfica en el espacio libre ----
  if (plan.graph) {
    const minSize = charH * 5.5;
    const gTop = startY + charH * 0.4;
    const candidates: { x: number; y: number; size: number }[] = [];

    // a) a la derecha de los pasos
    const rx0 = startX + width + charH * 1.6;
    const rx1 = paperRight - margin();
    const rSize = Math.min(rx1 - rx0, gTop - (paperBottom + margin()), charH * 16);
    if (rSize >= minSize) candidates.push({ x: rx0 + (rx1 - rx0 - rSize) / 2, y: gTop, size: rSize });

    // b) debajo de los pasos
    const by0 = stepsBottom - charH * 0.4;
    const bSize = Math.min(paperRight - margin() - startX, by0 - (paperBottom + margin()), charH * 16);
    if (bSize >= minSize) candidates.push({ x: startX, y: by0, size: bSize });

    const best = candidates.sort((a, b) => b.size - a.size)[0];
    if (best) {
      const sizePx = 720;
      const kg = best.size / sizePx;
      const labelPx = Math.min(charH * 0.85, best.size / 9) / kg / 0.62;
      const graphStyle = handStyleFor(FONT_PX, profile.strokeRatio, 23);
      // el grosor de los ejes debe ser el mismo que el de la letra en unidades reales
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
  return out;
}
