/**
 * Matemáticas con figura: sólidos 3D (alambre a lápiz que gira, aristas ocultas punteadas),
 * geometría analítica (puntos, segmento, recta, circunferencia) y cálculo de ángulos.
 * Volúmenes, áreas, distancias y pendientes se recalculan aquí.
 */
import type { SolutionPlan, SolutionLine } from '../ar/mathEngine';
import { compileExpression, normalizeExpression, plainTextTokens } from '../ar/mathEngine';
import type { FigureCanvas } from './figureCanvas';
import { clamp, fmtNum as f, num, type FigureRuntime, type FigureSpec, type SimControl } from './types';

type Pt = [number, number];
type V3 = [number, number, number];
const line = (title: string, text: string, answer = false): SolutionLine => ({ title, tokens: plainTextTokens(text), answer });
const ACCENT = '#a855f7';
const PI = Math.PI;

// =====================================================================================
// Sólidos 3D
// =====================================================================================
type Solid = 'cylinder' | 'cone' | 'sphere' | 'prism' | 'pyramid';

class SolidSim implements FigureRuntime {
  animated = true;
  controls: SimControl[] = [{ id: 'play', kind: 'toggle', label: 'Girar', icon: 'play' }];
  values: Record<string, number | boolean> = { play: true };
  phi = 0.5;
  constructor(private solid: Solid, private r: number, private h: number, private a: number) {}
  onControl(id: string) {
    if (id === 'play') this.values.play = !this.values.play;
  }
  update(dt: number) {
    if (this.values.play) this.phi += dt * 0.45;
  }
  readouts() {
    const m = measures(this.solid, this.r, this.h, this.a);
    return [
      { label: 'V', value: `${f(m.V)} u³` },
      { label: 'A total', value: `${f(m.A)} u²` },
    ];
  }
  draw(fc: FigureCanvas) {
    const { w, h, u } = fc;
    const elev = 0.38; // inclinación de la vista
    const size = this.solid === 'sphere' ? this.r * 2 : Math.max(this.solid === 'prism' || this.solid === 'pyramid' ? this.a : this.r * 2, this.h);
    const s = (Math.min(w, h) - u * 4) / Math.max(size, 1e-6) / 1.15;
    const cx = w / 2;
    const cy = h / 2 + (this.solid === 'sphere' ? 0 : (this.h * s) / 2) * 0.9;
    const P = ([x, y, z]: V3): Pt => {
      const xr = x * Math.cos(this.phi) - z * Math.sin(this.phi);
      const zr = x * Math.sin(this.phi) + z * Math.cos(this.phi);
      return [cx + xr * s, cy - (y * Math.cos(elev) - zr * Math.sin(elev)) * s];
    };
    const depth = ([x, , z]: V3) => x * Math.sin(this.phi) + z * Math.cos(this.phi); // >0 hacia el observador
    /** Elipse horizontal: tramos visibles continuos y tramos ocultos punteados. */
    const ell = (y: number, rad: number, solidBack = false) => {
      const N = 48;
      const samples = Array.from({ length: N }, (_, i) => {
        const t = (i / N) * PI * 2;
        const p3: V3 = [Math.cos(t) * rad, y, Math.sin(t) * rad];
        return { p: P(p3), front: depth(p3) >= 0 };
      });
      // arrancar en un cambio de visibilidad para que cada tramo sea contiguo
      let startIdx = samples.findIndex((sm, i) => sm.front !== samples[(i + N - 1) % N].front);
      if (startIdx < 0) startIdx = 0;
      let run: Pt[] = [];
      let runFront = samples[startIdx].front;
      for (let k = 0; k <= N; k++) {
        const sm = samples[(startIdx + k) % N];
        if (sm.front !== runFront) {
          run.push(sm.p);
          fc.path(run, 'ink', runFront ? 1 : 0.8, true, !runFront && !solidBack);
          run = [];
          runFront = sm.front;
        }
        run.push(sm.p);
      }
      fc.path(run, 'ink', runFront ? 1 : 0.8, true, !runFront && !solidBack);
    };

    if (this.solid === 'cylinder' || this.solid === 'cone') {
      ell(0, this.r);
      const top: V3 = [0, this.h, 0];
      if (this.solid === 'cylinder') {
        ell(this.h, this.r, true);
        for (const sx of [-1, 1]) fc.line(cx + sx * this.r * s, P([0, 0, 0])[1], cx + sx * this.r * s, P([0, this.h, 0])[1]);
      } else {
        const apex = P(top);
        for (const sx of [-1, 1]) fc.line(apex[0], apex[1], cx + sx * this.r * s, P([0, 0, 0])[1]);
        // generatriz g: hipotenusa del triángulo rectángulo (h, r, g)
        const rimR: Pt = [cx + this.r * s, P([0, 0, 0])[1]];
        fc.lightPath([apex, rimR], ACCENT, fc.stroke * 1.6, 0.7);
        const g = Math.hypot(this.r, this.h);
        fc.text('g = ' + f(g), (apex[0] + rimR[0]) / 2 + u * 0.5, (apex[1] + rimR[1]) / 2, 0.8, 'pencil');
      }
      // radio que gira (muestra la rotación) y altura
      const rim = P([Math.cos(-this.phi) * this.r, 0, Math.sin(-this.phi) * this.r]);
      const c0 = P([0, 0, 0]);
      fc.line(c0[0], c0[1], c0[0] + this.r * s, c0[1], 'pencil', 0.9);
      fc.text('r = ' + f(this.r), c0[0] + (this.r * s) / 2, c0[1] + u * 1.2, 0.8, 'pencil', 'center');
      fc.line(c0[0], c0[1], P(top)[0], P(top)[1], 'pencil', 0.8, true);
      fc.text('h = ' + f(this.h), P([0, this.h / 2, 0])[0] - u * 0.5, P([0, this.h / 2, 0])[1], 0.8, 'pencil', 'right');
      fc.glow(rim[0], rim[1], u, ACCENT, 0.5);
    } else if (this.solid === 'sphere') {
      fc.circle(cx, cy, this.r * s * 2, 'ink');
      ell(0, this.r);
      const mer: Pt[] = [];
      for (let i = 0; i <= 48; i++) {
        const t = (i / 48) * PI * 2;
        mer.push(P([Math.cos(t) * this.r * Math.cos(0.9), Math.sin(t) * this.r, Math.cos(t) * this.r * Math.sin(0.9)]));
      }
      fc.path(mer, 'pencil', 0.7, true, true);
      fc.line(cx, cy, cx + this.r * s, cy, 'pencil', 0.9);
      fc.text('r = ' + f(this.r), cx + (this.r * s) / 2, cy - u * 0.5, 0.8, 'pencil', 'center');
    } else {
      // poliedros de base cuadrada: visibilidad por caras
      const a = this.a / 2;
      const base: V3[] = [[-a, 0, -a], [a, 0, -a], [a, 0, a], [-a, 0, a]];
      const top: V3[] = this.solid === 'prism' ? base.map(([x, , z]) => [x, this.h, z] as V3) : [[0, this.h, 0]];
      const faces: { pts: V3[]; n: V3 }[] = [];
      for (let i = 0; i < 4; i++) {
        const b0 = base[i];
        const b1 = base[(i + 1) % 4];
        const mid: V3 = [(b0[0] + b1[0]) / 2, 0, (b0[2] + b1[2]) / 2];
        faces.push({ pts: this.solid === 'prism' ? [b0, b1, top[(i + 1) % 4], top[i]] : [b0, b1, top[0]], n: mid });
      }
      const visible = faces.map((fa) => depth(fa.n) > 0);
      const edges = new Map<string, { p: [V3, V3]; vis: boolean }>();
      const add = (p: V3, q: V3, vis: boolean) => {
        const k = [p, q].map((v) => v.join(',')).sort().join('|');
        const e = edges.get(k);
        edges.set(k, { p: [p, q], vis: vis || (e?.vis ?? false) });
      };
      faces.forEach((fa, i) => fa.pts.forEach((p, j) => add(p, fa.pts[(j + 1) % fa.pts.length], visible[i])));
      if (this.solid === 'prism') for (let i = 0; i < 4; i++) add(top[i], top[(i + 1) % 4], true);
      edges.forEach(({ p, vis }) => {
        const A = P(p[0]);
        const B = P(p[1]);
        fc.line(A[0], A[1], B[0], B[1], 'ink', vis ? 1 : 0.7, !vis);
      });
      const b0 = P(base[0]);
      const b1 = P(base[1]);
      fc.text('a = ' + f(this.a), (b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2 + u * 1.2, 0.8, 'pencil', 'center');
      const c0 = P([0, 0, 0]);
      const ct = P([0, this.h, 0]);
      fc.line(c0[0], c0[1], ct[0], ct[1], 'pencil', 0.8, true);
      fc.text('h = ' + f(this.h), ct[0] + u * 0.5, (c0[1] + ct[1]) / 2, 0.8, 'pencil');
    }
    fc.glow(cx, cy - (this.solid === 'sphere' ? 0 : (this.h * s) / 2), Math.min(w, h) * 0.35, ACCENT, 0.12);
  }
}

function measures(solid: Solid, r: number, h: number, a: number) {
  switch (solid) {
    case 'cylinder':
      return { V: PI * r * r * h, Al: 2 * PI * r * h, A: 2 * PI * r * (r + h), fV: 'V = π·r^2·h', fA: 'A = 2πr(r + h)' };
    case 'cone': {
      const g = Math.hypot(r, h);
      return { V: (PI * r * r * h) / 3, Al: PI * r * g, A: PI * r * (r + g), fV: 'V = π·r^2·h/3', fA: `A = πr(r + g), g = ${f(g)}` };
    }
    case 'sphere':
      return { V: (4 / 3) * PI * r ** 3, Al: 4 * PI * r * r, A: 4 * PI * r * r, fV: 'V = 4/3·π·r^3', fA: 'A = 4π·r^2' };
    case 'prism':
      return { V: a * a * h, Al: 4 * a * h, A: 2 * a * a + 4 * a * h, fV: 'V = a^2·h', fA: 'A = 2a^2 + 4ah' };
    case 'pyramid': {
      const ap = Math.hypot(h, a / 2);
      return { V: (a * a * h) / 3, Al: 2 * a * ap, A: a * a + 2 * a * ap, fV: 'V = a^2·h/3', fA: `A = a^2 + 2a·ap, ap = ${f(ap)}` };
    }
  }
}

// =====================================================================================
// Geometría analítica
// =====================================================================================
class AnalyticSim implements FigureRuntime {
  animated = true;
  controls: SimControl[] = [{ id: 'reset', kind: 'button', label: 'Redibujar', icon: 'reset' }];
  values: Record<string, number | boolean> = {};
  t = 0;
  constructor(private entity: string, private A: Pt, private B: Pt | null, private curve: ((x: number) => number) | null) {}
  onControl() {
    this.t = 0;
  }
  update(dt: number) {
    this.t += dt;
  }
  readouts() {
    if (!this.B) return [];
    const d = Math.hypot(this.B[0] - this.A[0], this.B[1] - this.A[1]);
    const dx = this.B[0] - this.A[0];
    return [
      { label: 'd', value: f(d) },
      { label: 'm', value: Math.abs(dx) < 1e-9 ? '∞' : f((this.B[1] - this.A[1]) / dx) },
    ];
  }
  draw(fc: FigureCanvas) {
    const { w, h, u } = fc;
    const label = (s: string, x: number, y: number, size: number, ch: 'ink' | 'pencil') => {
      const tw = fc.textWidth(s, size);
      const right = x + tw > w - u * 0.3;
      fc.text(s, right ? Math.min(x, w - u * 0.3) - (right ? u * 0.9 : 0) : x, Math.max(u * 1.1, Math.min(h - u * 0.3, y)), size, ch, right ? 'right' : 'left');
    };
    const pts = [this.A, ...(this.B ? [this.B] : [])];
    const r = this.entity === 'circle' && this.B ? Math.hypot(this.B[0] - this.A[0], this.B[1] - this.A[1]) : 0;
    const xs = pts.map((p) => p[0]).concat([0, this.A[0] - r, this.A[0] + r]);
    const ys = pts.map((p) => p[1]).concat([0, this.A[1] - r, this.A[1] + r]);
    const pad = 1.5;
    const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad;
    const y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    const m = u * 1.4;
    const s = Math.min((w - m * 2) / (x1 - x0), (h - m * 2) / (y1 - y0));
    const ox = m + ((w - m * 2) - (x1 - x0) * s) / 2;
    const oy = m + ((h - m * 2) - (y1 - y0) * s) / 2;
    const X = (x: number) => ox + (x - x0) * s;
    const Y = (y: number) => oy + (y1 - y) * s;
    // ejes y cuadrícula ligera
    fc.arrow(X(x0), Y(0), X(x1), Y(0), 'ink', 0.8);
    fc.arrow(X(0), Y(y0), X(0), Y(y1), 'ink', 0.8);
    fc.text('x', X(x1), Y(0) + u * 1.1, 0.75, 'ink', 'right');
    fc.text('y', X(0) + u * 0.4, Y(y1) + u * 0.6, 0.75, 'ink');
    for (let v = Math.ceil(x0); v <= x1; v++) if (v) fc.line(X(v), Y(0) - u * 0.15, X(v), Y(0) + u * 0.15, 'ink', 0.5);
    for (let v = Math.ceil(y0); v <= y1; v++) if (v) fc.line(X(0) - u * 0.15, Y(v), X(0) + u * 0.15, Y(v), 'ink', 0.5);
    const k = clamp(this.t / 1.6, 0, 1);
    const [ax, ay] = this.A;
    if (this.B && this.entity !== 'circle') {
      const [bx, by] = this.B;
      if (this.entity === 'straight_line' && Math.abs(bx - ax) > 1e-9) {
        const mm = (by - ay) / (bx - ax);
        fc.line(X(x0), Y(ay + mm * (x0 - ax)), X(x1), Y(ay + mm * (x1 - ax)), 'pencil', 0.8, true);
      }
      fc.line(X(ax), Y(ay), X(ax + (bx - ax) * k), Y(ay + (by - ay) * k), 'pencil', 1.3);
      // catetos Δx, Δy
      fc.line(X(ax), Y(ay), X(bx), Y(ay), 'ink', 0.6, true);
      fc.line(X(bx), Y(ay), X(bx), Y(by), 'ink', 0.6, true);
      fc.text('Δx = ' + f(bx - ax), X((ax + bx) / 2), Y(ay) + (by >= ay ? u * 1.2 : -u * 0.5), 0.7, 'ink', 'center');
      label('Δy = ' + f(by - ay), X(bx) + u * 0.4, Y((ay + by) / 2), 0.7, 'ink');
      if (k >= 1) {
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        fc.circle(X(mx), Y(my), u * 0.5, 'pencil', 1, 'solid');
        fc.text(`M(${f(mx)}; ${f(my)})`, X(mx) - u * 0.4, Y(my) - u * 0.6, 0.75, 'pencil', 'right');
      }
      fc.circle(X(bx), Y(by), u * 0.6, 'ink', 1, 'solid');
      label(`B(${f(bx)}; ${f(by)})`, X(bx) + u * 0.5, Y(by) - u * 0.5, 0.8, 'ink');
      fc.glow(X(ax + (bx - ax) * k), Y(ay + (by - ay) * k), u * 1.3, ACCENT, 0.6);
    }
    if (this.entity === 'circle' && r > 0) {
      const arc: Pt[] = [];
      for (let i = 0; i <= 60 * k; i++) {
        const a = (i / 60) * PI * 2;
        arc.push([X(ax + Math.cos(a) * r), Y(ay + Math.sin(a) * r)]);
      }
      fc.path(arc, 'pencil', 1.2, true);
      fc.line(X(ax), Y(ay), X(ax + r), Y(ay), 'ink', 0.7, true);
      fc.text('r = ' + f(r), X(ax + r / 2), Y(ay) - u * 0.4, 0.75, 'ink', 'center');
    }
    if (this.curve) {
      const pts2: Pt[] = [];
      for (let i = 0; i <= 80 * k; i++) {
        const x = x0 + ((x1 - x0) * i) / 80;
        const y = this.curve(x);
        if (Number.isFinite(y) && y > y0 - 2 && y < y1 + 2) pts2.push([X(x), Y(y)]);
      }
      fc.path(pts2, 'pencil', 1.2, true);
    }
    fc.circle(X(ax), Y(ay), u * 0.6, 'ink', 1, 'solid');
    label(`A(${f(ax)}; ${f(ay)})`, X(ax) + u * 0.5, Y(ay) + u * 1.2, 0.8, 'ink');
  }
}

// =====================================================================================
// Ángulos
// =====================================================================================
class AnglesSim implements FigureRuntime {
  animated = true;
  controls: SimControl[] = [{ id: 'reset', kind: 'button', label: 'Repetir', icon: 'reset' }];
  values: Record<string, number | boolean> = {};
  t = 0;
  constructor(private kind: string, private known: [string, number][], private unknown: string, private x: number) {}
  onControl() {
    this.t = 0;
  }
  update(dt: number) {
    this.t += dt;
  }
  readouts() {
    return [{ label: this.unknown, value: `${f(this.x)}°` }];
  }
  private angleMark(fc: FigureCanvas, c: Pt, a0: number, a1: number, label: string, highlight: boolean, k = 1, lf = 1.65) {
    const r = fc.u * (highlight ? 2.4 : 1.9);
    fc.arc(c[0], c[1], r, a0, a0 + (a1 - a0) * k, highlight ? 'pencil' : 'ink', highlight ? 1.3 : 0.8);
    const am = (a0 + a1) / 2;
    if (k >= 1 || !highlight) fc.text(label, c[0] + Math.cos(am) * r * lf, c[1] + Math.sin(am) * r * lf + fc.u * 0.35, 0.8, highlight ? 'pencil' : 'ink', 'left');
    if (highlight) fc.glow(c[0] + Math.cos(am) * r, c[1] + Math.sin(am) * r, fc.u * 1.4, ACCENT, 0.7);
  }
  draw(fc: FigureCanvas) {
    const { w, h, u } = fc;
    const k = clamp(this.t / 1.4, 0, 1);
    const xl = `${this.unknown} = ${k >= 1 ? f(this.x) : '?'}°`;
    const kn = this.known.map(([, v]) => `${v}°`);
    if (this.kind === 'triangle_congruence') {
      // ΔABC ≅ ΔDEF: lados iguales con marcas, ángulos correspondientes con el mismo arco
      const R = Math.min(w * 0.22, h * 0.42);
      const tri = (cx: number, mirror: number): Pt[] => [
        [cx - R * mirror, h * 0.82],
        [cx + R * mirror, h * 0.82],
        [cx + R * 0.25 * mirror, h * 0.82 - R * 1.45],
      ];
      const T1 = tri(w * 0.26, 1);
      const T2 = tri(w * 0.74, -1);
      fc.polygon(T1, 'ink');
      fc.polygon(T2, 'ink');
      const names1 = ['A', 'B', 'C'];
      const names2 = ['D', 'E', 'F'];
      const out = (P: Pt[], i: number): Pt => {
        const c: Pt = [(P[0][0] + P[1][0] + P[2][0]) / 3, (P[0][1] + P[1][1] + P[2][1]) / 3];
        const d = Math.hypot(P[i][0] - c[0], P[i][1] - c[1]) || 1;
        return [P[i][0] + ((P[i][0] - c[0]) / d) * u * 1.1, P[i][1] + ((P[i][1] - c[1]) / d) * u * 1.1 + u * 0.35];
      };
      [T1, T2].forEach((P, k) => P.forEach((_, i) => {
        const o = out(P, i);
        fc.text((k ? names2 : names1)[i], o[0], o[1], 0.85, 'ink', 'center');
      }));
      const ticks = (a: Pt, b: Pt, n: number) => {
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
        for (let j = 0; j < n; j++) {
          const off = (j - (n - 1) / 2) * u * 0.35;
          const px = mx + Math.cos(ang - Math.PI / 2) * off, py = my + Math.sin(ang - Math.PI / 2) * off;
          fc.line(px - Math.cos(ang) * u * 0.4, py - Math.sin(ang) * u * 0.4, px + Math.cos(ang) * u * 0.4, py + Math.sin(ang) * u * 0.4, 'pencil', 1);
        }
      };
      ticks(T1[0], T1[1], 1); ticks(T2[0], T2[1], 1); // AB = DE
      ticks(T1[0], T1[2], 2); ticks(T2[0], T2[2], 2); // AC = DF
      const inner = (P: Pt[], i: number): [number, number] => {
        const p = P[i], a = P[(i + 1) % 3], b = P[(i + 2) % 3];
        let a0 = Math.atan2(a[1] - p[1], a[0] - p[0]);
        let a1 = Math.atan2(b[1] - p[1], b[0] - p[0]);
        if (a1 < a0) [a0, a1] = [a1, a0];
        if (a1 - a0 > PI) [a0, a1] = [a1, a0 + 2 * PI];
        return [a0, a1];
      };
      // ángulo comprendido (A = D) y el ángulo conocido C; x está en E (corresponde a B)
      const [k0, k1] = inner(T1, 0);
      this.angleMark(fc, T1[0], k0, k1, kn[0] ?? '', false, 1, 1.5);
      const [d0, d1] = inner(T2, 0);
      this.angleMark(fc, T2[0], d0, d1, kn[0] ?? '', false, 1, 1.5);
      const [c0, c1] = inner(T1, 2);
      this.angleMark(fc, T1[2], c0, c1, kn[1] ?? '', false, 1, 1.5);
      const [b0, b1] = inner(T1, 1);
      this.angleMark(fc, T1[1], b0, b1, k >= 1 ? `${f(this.x)}°` : '?', false, 1, 1.5);
      const [e0, e1] = inner(T2, 1);
      this.angleMark(fc, T2[1], e0, e1, xl, true, k, 1.5);
      fc.text('ΔABC ≅ ΔDEF', w / 2, u * 1.3, 0.9, 'pencil', 'center');
      return;
    }
    if (this.kind === 'parallel_transversal') {
      const yA = h * 0.18, yB = h * 0.84;
      fc.line(u, yA, w - u, yA);
      fc.line(u, yB, w - u, yB);
      fc.text('L1', w - u, yA - u * 0.4, 0.75, 'ink', 'right');
      fc.text('L2', w - u, yB - u * 0.4, 0.75, 'ink', 'right');
      const t0: Pt = [w * 0.3, h - u], t1: Pt = [w * 0.7, u];
      fc.line(t0[0], t0[1], t1[0], t1[1]);
      const ang = Math.atan2(t1[1] - t0[1], t1[0] - t0[0]);
      const at = (y: number): Pt => [t0[0] + ((y - t0[1]) / (t1[1] - t0[1])) * (t1[0] - t0[0]), y];
      // conjugados internos: ambos entre L1 y L2, a la derecha de la secante
      this.angleMark(fc, at(yA), 0, ang + PI, kn[0] ?? '', false, 1, 1.15);
      this.angleMark(fc, at(yB), ang, 0, xl, true, k, 1.15);
    } else if (this.kind === 'inscribed_quadrilateral') {
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.38;
      fc.circle(cx, cy, R * 2, 'ink', 0.8);
      const angs = [-2.3, -0.6, 0.7, 2.3];
      const P = angs.map((a) => [cx + Math.cos(a) * R, cy + Math.sin(a) * R] as Pt);
      fc.polygon(P, 'ink');
      ['A', 'B', 'C', 'D'].forEach((l, i) => fc.text(l, P[i][0] + Math.cos(angs[i]) * u, P[i][1] + Math.sin(angs[i]) * u + u * 0.3, 0.8, 'ink', 'center'));
      const inner = (i: number): [number, number] => {
        const p = P[i], a = P[(i + 3) % 4], b = P[(i + 1) % 4];
        return [Math.atan2(a[1] - p[1], a[0] - p[0]), Math.atan2(b[1] - p[1], b[0] - p[0])];
      };
      const [a0, a1] = inner(0);
      this.angleMark(fc, P[0], a0, a1 < a0 ? a1 + 2 * PI : a1, kn[0] ?? '', false);
      const [c0, c1] = inner(2);
      this.angleMark(fc, P[2], c0, c1 < c0 ? c1 + 2 * PI : c1, xl, true, k);
    } else {
      // triángulo (con ceviana) o polígono general
      const n = this.kind === 'general_polygon' ? Math.max(3, Math.min(8, this.known.length + 1)) : 3;
      const cx = w / 2, cy = h * 0.55, R = Math.min(w * 0.42, h * 0.48);
      const P = Array.from({ length: n }, (_, i) => {
        const a = -PI / 2 + (i * 2 * PI) / n + (n === 3 ? 0 : PI / n);
        return [cx + Math.cos(a) * R * (n === 3 ? 1.15 : 1), cy + Math.sin(a) * R * 0.85] as Pt;
      });
      fc.polygon(P, 'ink');
      if (this.kind === 'triangle_cevian' && n === 3) {
        const mid: Pt = [(P[1][0] + P[2][0]) / 2, (P[1][1] + P[2][1]) / 2];
        fc.line(P[0][0], P[0][1], mid[0], mid[1], 'ink', 0.8);
      }
      P.forEach((p, i) => {
        const a = P[(i + n - 1) % n], b = P[(i + 1) % n];
        let a0 = Math.atan2(a[1] - p[1], a[0] - p[0]);
        let a1 = Math.atan2(b[1] - p[1], b[0] - p[0]);
        if (a1 < a0) [a0, a1] = [a1, a0];
        if (a1 - a0 > PI) [a0, a1] = [a1, a0 + 2 * PI];
        const isX = i === n - 1;
        this.angleMark(fc, p, a0, a1, isX ? xl : kn[i] ?? '', isX, isX ? k : 1);
      });
    }
  }
}

// =====================================================================================
// Planes
// =====================================================================================
const spec = (title: string, aspect: number, create: () => FigureRuntime, minWidthChars = 12): FigureSpec => ({ title, aspect, minWidthChars, create });
const pt = (v: unknown): Pt | null => (Array.isArray(v) && v.length >= 2 ? [num(v[0], 0), num(v[1], 0)] : null);

export function mathFigurePlan(exerciseType: string, d: Record<string, unknown>): SolutionPlan | null {
  const base = { graph: null, graphPrimary: false, kind: 'simulation' as const };
  if (exerciseType === 'geometry_3d') {
    const solid = (['cylinder', 'cone', 'sphere', 'prism', 'pyramid'].includes(String(d.solid_type)) ? d.solid_type : 'cylinder') as Solid;
    const r = Math.max(0.01, num(d.radius_units, 2));
    const h = Math.max(0.01, num(d.height_units, 4));
    const a = Math.max(0.01, num(d.edge_units, r * 2));
    const m = measures(solid, r, h, a);
    const names: Record<Solid, string> = { cylinder: 'Cilindro', cone: 'Cono', sphere: 'Esfera', prism: 'Prisma cuadrangular', pyramid: 'Pirámide cuadrangular' };
    return {
      ...base,
      summary: `${names[solid]} — estereometría`,
      lines: [
        line('Volumen', `${m.fV} = ${f(m.V)} u^3`),
        line('Área', `${m.fA} = ${f(m.A)} u^2`),
        line('Resultado', `V = ${f(m.V)} u^3   A = ${f(m.A)} u^2`, true),
      ],
      figure: spec(names[solid], 1, () => new SolidSim(solid, r, h, a), 10),
    };
  }
  if (exerciseType === 'analytic_geometry') {
    const A = pt(d.point_a) ?? [0, 0];
    const B = pt(d.point_b);
    const entity = String(d.entity_type ?? 'points_segment');
    const lines: SolutionLine[] = [];
    if (B) {
      const dx = B[0] - A[0], dy = B[1] - A[1];
      const dist = Math.hypot(dx, dy);
      lines.push(line('Distancia', `d = √((${f(dx)})^2 + (${f(dy)})^2) = ${f(dist)}`));
      lines.push(line('Punto medio', `M = (${f((A[0] + B[0]) / 2)}; ${f((A[1] + B[1]) / 2)})`));
      if (Math.abs(dx) > 1e-9) {
        const m = dy / dx;
        const b = A[1] - m * A[0];
        lines.push(line('Pendiente y recta', `m = ${f(m)}   y = ${f(m)}x ${b < 0 ? '-' : '+'} ${f(Math.abs(b))}`, true));
      } else lines.push(line('Recta', `x = ${f(A[0])} (recta vertical)`, true));
    }
    let curve: ((x: number) => number) | null = null;
    const eq = String(d.canonical_equation ?? '');
    if (entity === 'parabola' && /y\s*=/.test(eq)) {
      try {
        curve = compileExpression(normalizeExpression(eq.split('=').pop() ?? ''));
      } catch {
        curve = null;
      }
    }
    if (!lines.length && eq) lines.push(line('Ecuación', eq, true));
    return {
      ...base,
      summary: 'Geometría analítica',
      lines,
      figure: spec('Plano cartesiano', 1.2, () => new AnalyticSim(entity, A, B, curve), 17),
    };
  }
  if (exerciseType === 'geometric_angles') {
    const known = Object.entries((d.known_angles_deg as Record<string, unknown>) ?? {}).map(([k, v]) => [k, num(v, 0)] as [string, number]);
    const x = num(d.solved_value_deg, 0);
    const steps = (Array.isArray(d.proof_steps) ? d.proof_steps : []).slice(0, 3).map(String);
    return {
      ...base,
      summary: String(d.theorem_applied ?? 'Cálculo de ángulos'),
      lines: [
        ...steps.map((s, i) => line(`Paso ${i + 1}`, s)),
        line('Resultado', `${d.unknown_variable ?? 'x'} = ${f(x)}°`, true),
      ],
      figure: spec('Ángulos', 1.3, () => new AnglesSim(String(d.problem_type ?? 'triangle_cevian'), known, String(d.unknown_variable ?? 'x'), x), 12),
    };
  }
  return null;
}
