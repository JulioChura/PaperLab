/** Geometría plana para el "espacio de trabajo" de la hoja (polígono convexo). */

export type Pt = [number, number];

const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

/** Envolvente convexa (cadena monótona de Andrew), O(n log n). */
export function convexHull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (pts.length < 3) return pts;
  const lower: Pt[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

export function polygonArea(poly: Pt[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** Región convexa con consultas de pertenencia (con margen) y ancho disponible por altura. */
export class ConvexRegion {
  readonly poly: Pt[];
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  private sign: number;

  constructor(poly: Pt[]) {
    this.poly = poly;
    this.sign = polygonArea(poly) >= 0 ? 1 : -1;
    this.minX = Math.min(...poly.map((p) => p[0]));
    this.maxX = Math.max(...poly.map((p) => p[0]));
    this.minY = Math.min(...poly.map((p) => p[1]));
    this.maxY = Math.max(...poly.map((p) => p[1]));
  }

  /** Distancia con signo al borde (positiva dentro). */
  depth(p: Pt): number {
    let d = Infinity;
    const n = this.poly.length;
    for (let i = 0; i < n; i++) {
      const a = this.poly[i];
      const b = this.poly[(i + 1) % n];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      d = Math.min(d, (this.sign * cross(a, b, p)) / len);
    }
    return d;
  }

  contains(p: Pt, margin = 0): boolean {
    return this.depth(p) >= margin;
  }

  /** Intervalo [xmin, xmax] del polígono a la altura y (null si y queda fuera). */
  spanAt(y: number): [number, number] | null {
    const xs: number[] = [];
    const n = this.poly.length;
    for (let i = 0; i < n; i++) {
      const [x1, y1] = this.poly[i];
      const [x2, y2] = this.poly[(i + 1) % n];
      if ((y1 <= y && y <= y2) || (y2 <= y && y <= y1)) {
        if (y1 === y2) xs.push(x1, x2);
        else xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
      }
    }
    return xs.length ? [Math.min(...xs), Math.max(...xs)] : null;
  }

  /**
   * Intervalo horizontal libre para una banda [y0, y1] con margen. En un polígono convexo,
   * la intersección de los intervalos en ambos extremos de la banda es exacta.
   */
  bandSpan(y0: number, y1: number, margin: number): [number, number] | null {
    const a = this.spanAt(y0);
    const b = this.spanAt(y1);
    if (!a || !b) return null;
    const lo = Math.max(a[0], b[0]) + margin;
    const hi = Math.min(a[1], b[1]) - margin;
    return hi > lo ? [lo, hi] : null;
  }
}

export interface Box {
  x: number;
  y: number; // borde superior (y hacia arriba en unidades del ancla)
  w: number;
  h: number;
}

export const boxesOverlap = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y - a.h < b.y && b.y - b.h < a.y;
