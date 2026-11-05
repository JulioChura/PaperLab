/**
 * Simulaciones de FÍSICA dibujadas sobre la hoja.
 * Todo se recalcula a partir de los datos de entrada (ángulo, masas, v0…): los valores derivados que
 * devuelva la IA se ignoran, así nunca se anima un resultado mal calculado.
 */
import type { SolutionPlan, SolutionLine } from '../ar/mathEngine';
import { plainTextTokens } from '../ar/mathEngine';
import type { FigureCanvas } from './figureCanvas';
import { clamp, fmtNum as f, num, type FigureRuntime, type FigureSpec, type SimControl } from './types';

const DEG = Math.PI / 180;
const line = (title: string, text: string, answer = false): SolutionLine => ({ title, tokens: plainTextTokens(text), answer });

const PLAY: SimControl = { id: 'play', kind: 'toggle', label: 'Reproducir', icon: 'play' };
const RESET: SimControl = { id: 'reset', kind: 'button', label: 'Reiniciar', icon: 'reset' };

/** Base: reproducir/pausar, reiniciar y sliders que reinician la simulación. */
abstract class PhysicsSim implements FigureRuntime {
  animated = true;
  t = 0;
  values: Record<string, number | boolean>;
  abstract controls: SimControl[];
  constructor(values: Record<string, number | boolean>) {
    this.values = { play: true, ...values };
  }
  onControl(id: string, value?: number | boolean) {
    if (id === 'reset') this.reset();
    else if (id === 'play') this.values.play = !this.values.play;
    else if (value !== undefined) {
      this.values[id] = value;
      this.reset();
    }
  }
  reset() {
    this.t = 0;
  }
  update(dt: number) {
    if (this.values.play) this.step(Math.min(dt, 1 / 30));
  }
  protected n(id: string) {
    return this.values[id] as number;
  }
  abstract step(dt: number): void;
  abstract draw(fc: FigureCanvas): void;
  abstract readouts(): { label: string; value: string }[];
}

// =====================================================================================
// 1. Plano inclinado
// =====================================================================================
class InclinedPlane extends PhysicsSim {
  controls: SimControl[] = [
    PLAY, RESET,
    { id: 'theta', kind: 'slider', label: 'Ángulo θ', min: 5, max: 75, step: 1, unit: '°' },
    { id: 'mu', kind: 'slider', label: 'Fricción μ', min: 0, max: 1, step: 0.01 },
  ];
  d = 0;
  v = 0;
  private hold = 0;
  constructor(theta: number, mu: number, private m: number, private g: number) {
    super({ theta, mu });
  }
  get a() {
    const th = this.n('theta') * DEG;
    return this.g * (Math.sin(th) - this.n('mu') * Math.cos(th));
  }
  reset() {
    super.reset();
    this.d = 0;
    this.v = 0;
    this.hold = 0;
  }
  step(dt: number) {
    const L = 4; // longitud del plano (m) para la animación
    if (this.d >= L) {
      this.hold += dt;
      if (this.hold > 1.4) this.reset();
      return;
    }
    this.t += dt;
    const a = Math.max(0, this.a);
    this.v += a * dt;
    this.d = Math.min(L, this.d + this.v * dt);
  }
  draw(fc: FigureCanvas) {
    const { w, h, u } = fc;
    const th = this.n('theta') * DEG;
    const pad = u * 1.6;
    // triángulo: punta alta a la izquierda, ángulo θ abajo a la derecha
    let base = w - pad * 2;
    let height = base * Math.tan(th);
    if (height > h - pad * 2.2) {
      height = h - pad * 2.2;
      base = height / Math.tan(th);
    }
    const C: [number, number] = [pad + base, h - pad];
    const B: [number, number] = [pad, h - pad];
    const A: [number, number] = [pad, h - pad - height];
    fc.hatch(pad * 0.4, h - pad, w - pad * 0.4, h - pad, -1);
    fc.polygon([A, B, C], 'ink');
    fc.arc(C[0], C[1], u * 1.6, Math.PI, Math.PI + th, 'pencil');
    fc.text('θ = ' + f(this.n('theta'), 0) + '°', C[0] - u * 2.3, C[1] - u * 0.5, 0.85, 'pencil', 'right');

    // bloque sobre la hipotenusa
    const L = 4;
    const hyp = Math.hypot(base, height);
    const s = Math.min(u * 2.2, hyp * 0.16);
    const pos = (this.d / L) * (hyp - s * 1.2) + s * 0.6;
    const dir: [number, number] = [(C[0] - A[0]) / hyp, (C[1] - A[1]) / hyp];
    const nrm: [number, number] = [dir[1], -dir[0]];
    const cx = A[0] + dir[0] * pos + nrm[0] * s * 0.5;
    const cy = A[1] + dir[1] * pos + nrm[1] * s * 0.5;
    const corner = (i: number, j: number): [number, number] => [
      cx + dir[0] * s * 0.5 * i + nrm[0] * s * 0.5 * j,
      cy + dir[1] * s * 0.5 * i + nrm[1] * s * 0.5 * j,
    ];
    fc.polygon([corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], 'ink', 1, 'ink');
    fc.text('m', cx, cy + u * 0.35, 0.8, 'ink', 'center');

    // vectores de fuerza (escala común)
    const sc = u * 2.6;
    const W = 1;
    fc.arrow(cx, cy, cx, cy + sc * W, 'pencil');
    fc.text('P', cx + u * 0.3, cy + sc * W + u * 0.2, 0.8, 'pencil');
    const nLen = sc * Math.cos(th);
    fc.arrow(cx, cy, cx + nrm[0] * nLen, cy + nrm[1] * nLen, 'pencil');
    fc.text('N', cx + nrm[0] * nLen + u * 0.2, cy + nrm[1] * nLen, 0.8, 'pencil');
    if (this.n('mu') > 0) {
      const frLen = sc * this.n('mu') * Math.cos(th);
      fc.arrow(cx, cy, cx - dir[0] * frLen, cy - dir[1] * frLen, 'pencil');
      fc.text('fr', cx - dir[0] * frLen - u * 0.6, cy - dir[1] * frLen - u * 0.2, 0.8, 'pencil', 'right');
    }
    if (this.a <= 0) {
      fc.text('μ ≥ tan θ → el bloque no se mueve', w / 2, u * 1.3, 0.8, 'pencil', 'center');
    }
    fc.glow(cx, cy, s * 0.9, '#a855f7', 0.25);
  }
  readouts() {
    return [
      { label: 'a', value: `${f(Math.max(0, this.a))} m/s²` },
      { label: 'v', value: `${f(this.v)} m/s` },
      { label: 't', value: `${f(this.t, 1)} s` },
      { label: 'N', value: `${f(this.m * this.g * Math.cos(this.n('theta') * DEG))} N` },
    ];
  }
}

// =====================================================================================
// 2. Péndulo simple (integración RK4 de θ'' = −(g/L)·sen θ)
// =====================================================================================
class Pendulum extends PhysicsSim {
  controls: SimControl[] = [
    PLAY, RESET,
    { id: 'L', kind: 'slider', label: 'Longitud L', min: 0.2, max: 3, step: 0.05, unit: 'm' },
    { id: 'theta0', kind: 'slider', label: 'Ángulo θ₀', min: 5, max: 80, step: 1, unit: '°' },
  ];
  th = 0;
  om = 0;
  trail: [number, number][] = [];
  constructor(L: number, theta0: number, private g: number) {
    super({ L, theta0 });
    this.reset();
  }
  reset() {
    super.reset();
    this.th = this.n('theta0') * DEG;
    this.om = 0;
    this.trail = [];
  }
  step(dt: number) {
    const k = this.g / this.n('L');
    const acc = (th: number) => -k * Math.sin(th);
    const sub = 4;
    const h = dt / sub;
    for (let i = 0; i < sub; i++) {
      const k1t = this.om, k1o = acc(this.th);
      const k2t = this.om + (h / 2) * k1o, k2o = acc(this.th + (h / 2) * k1t);
      const k3t = this.om + (h / 2) * k2o, k3o = acc(this.th + (h / 2) * k2t);
      const k4t = this.om + h * k3o, k4o = acc(this.th + h * k3t);
      this.th += (h / 6) * (k1t + 2 * k2t + 2 * k3t + k4t);
      this.om += (h / 6) * (k1o + 2 * k2o + 2 * k3o + k4o);
    }
    this.t += dt;
  }
  draw(fc: FigureCanvas) {
    const { w, h, u } = fc;
    const px = w / 2;
    const py = u * 1.2;
    const Lpx = (h - u * 3.2) * clamp(this.n('L') / 3, 0.35, 1);
    fc.hatch(px - u * 2.5, py, px + u * 2.5, py, 1);
    // amplitud y vertical de referencia
    fc.line(px, py, px, py + Lpx + u, 'ink', 0.5, true);
    const a0 = this.n('theta0') * DEG;
    fc.arc(px, py, Lpx, Math.PI / 2 - a0, Math.PI / 2 + a0, 'pencil', 0.6);
    const bx = px + Lpx * Math.sin(this.th);
    const by = py + Lpx * Math.cos(this.th);
    fc.line(px, py, bx, by, 'ink');
    const r = u * 1.1;
    fc.circle(bx, by, r * 2, 'ink', 1, 'ink');
    fc.arc(px, py, u * 2.2, Math.PI / 2, Math.PI / 2 - this.th, 'pencil');
    fc.text('θ', px + Math.sin(-this.th / 2) * -u * 2.9, py + u * 2.9, 0.8, 'pencil', 'center');
    fc.text('L = ' + f(this.n('L')) + ' m', px + u * 0.5, py + Lpx * 0.45, 0.8, 'ink');
    this.trail.push([bx, by]);
    if (this.trail.length > 40) this.trail.shift();
    fc.lightPath(this.trail, '#a855f7', fc.stroke * 1.4, 0.35);
    fc.glow(bx, by, r * 2.2, '#a855f7', 0.3);
  }
  readouts() {
    const T = 2 * Math.PI * Math.sqrt(this.n('L') / this.g);
    return [
      { label: 'θ', value: `${f(this.th / DEG, 1)}°` },
      { label: 'ω', value: `${f(this.om)} rad/s` },
      { label: 'T', value: `${f(T)} s` },
      { label: 't', value: `${f(this.t, 1)} s` },
    ];
  }
}

// =====================================================================================
// 3. Tiro parabólico
// =====================================================================================
class Projectile extends PhysicsSim {
  controls: SimControl[] = [
    PLAY, RESET,
    { id: 'v0', kind: 'slider', label: 'Velocidad v₀', min: 3, max: 60, step: 1, unit: 'm/s' },
    { id: 'ang', kind: 'slider', label: 'Ángulo θ', min: 5, max: 85, step: 1, unit: '°' },
  ];
  private hold = 0;
  constructor(v0: number, ang: number, private h0: number, private g: number) {
    super({ v0, ang });
  }
  get flight() {
    const vy = this.n('v0') * Math.sin(this.n('ang') * DEG);
    return (vy + Math.sqrt(vy * vy + 2 * this.g * this.h0)) / this.g;
  }
  reset() {
    super.reset();
    this.hold = 0;
  }
  step(dt: number) {
    const tv = this.flight;
    const speed = Math.max(1, tv / 3.5); // que el vuelo dure ~3.5 s en pantalla
    if (this.t >= tv) {
      this.hold += dt;
      if (this.hold > 1.5) this.reset();
      return;
    }
    this.t = Math.min(tv, this.t + dt * speed);
  }
  draw(fc: FigureCanvas) {
    const { w, h, u } = fc;
    const v0 = this.n('v0');
    const th = this.n('ang') * DEG;
    const vx = v0 * Math.cos(th);
    const vy = v0 * Math.sin(th);
    const tv = this.flight;
    const R = vx * tv;
    const H = this.h0 + (vy * vy) / (2 * this.g);
    const pad = u * 1.6;
    const sx = (w - pad * 2.2) / Math.max(R, 1e-6);
    const sy = (h - pad * 2.6) / Math.max(H, 1e-6);
    const s = Math.min(sx, sy);
    const ox = pad;
    const oy = h - pad;
    const X = (x: number) => ox + x * s;
    const Y = (y: number) => oy - y * s;
    fc.hatch(pad * 0.3, oy, w - pad * 0.3, oy, -1);
    if (this.h0 > 0) fc.rect(ox - u, Y(this.h0), u, this.h0 * s, 'ink');
    // trayectoria completa punteada + recorrida
    const full: [number, number][] = [];
    const done: [number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const tt = (tv * i) / 40;
      const p: [number, number] = [X(vx * tt), Y(this.h0 + vy * tt - 0.5 * this.g * tt * tt)];
      full.push(p);
      if (tt <= this.t) done.push(p);
    }
    fc.path(full, 'ink', 0.6, true, true);
    done.push([X(vx * this.t), Y(this.h0 + vy * this.t - 0.5 * this.g * this.t * this.t)]);
    fc.path(done, 'pencil', 1.2, true);
    // altura máxima y alcance
    const tH = vy / this.g;
    fc.line(X(vx * tH), Y(H), X(vx * tH), oy, 'ink', 0.5, true);
    fc.text('Hmax = ' + f(H) + ' m', X(vx * tH) + u * 0.4, Y(H) - u * 0.4, 0.8, 'ink');
    fc.text('R = ' + f(R) + ' m', X(R), oy + u * 1.1, 0.8, 'ink', 'right');
    // pelota + vectores de velocidad
    const bx = X(vx * this.t);
    const by = Y(this.h0 + vy * this.t - 0.5 * this.g * this.t * this.t);
    const vyt = vy - this.g * this.t;
    const vs = u * 0.09;
    fc.arrow(bx, by, bx + vx * vs, by, 'pencil', 0.8);
    fc.arrow(bx, by, bx, by - vyt * vs, 'pencil', 0.8);
    fc.circle(bx, by, u * 1.1, 'ink', 1, 'solid');
    fc.arc(ox, oy - (this.h0 * s), u * 1.8, -th, 0, 'pencil');
    fc.glow(bx, by, u * 1.6, '#a855f7', 0.35);
  }
  readouts() {
    const v0 = this.n('v0');
    const th = this.n('ang') * DEG;
    const x = v0 * Math.cos(th) * this.t;
    const y = this.h0 + v0 * Math.sin(th) * this.t - 0.5 * this.g * this.t * this.t;
    return [
      { label: 't', value: `${f(this.t)} s` },
      { label: 'x', value: `${f(x)} m` },
      { label: 'y', value: `${f(Math.max(0, y))} m` },
      { label: 'tv', value: `${f(this.flight)} s` },
    ];
  }
}

// =====================================================================================
// 4. Masa-resorte (Hooke, con amortiguamiento)
// =====================================================================================
class MassSpring extends PhysicsSim {
  controls: SimControl[] = [
    PLAY, RESET,
    { id: 'k', kind: 'slider', label: 'Rigidez k', min: 5, max: 400, step: 5, unit: 'N/m' },
    { id: 'm', kind: 'slider', label: 'Masa m', min: 0.1, max: 5, step: 0.1, unit: 'kg' },
  ];
  private hist: number[] = [];
  constructor(k: number, m: number, private A: number, private b: number) {
    super({ k, m });
  }
  reset() {
    super.reset();
    this.hist = [];
  }
  x(t = this.t) {
    const m = this.n('m');
    const w0 = Math.sqrt(this.n('k') / m);
    const gamma = this.b / (2 * m);
    const wd = Math.sqrt(Math.max(1e-6, w0 * w0 - gamma * gamma));
    return this.A * Math.exp(-gamma * t) * Math.cos(wd * t);
  }
  step(dt: number) {
    this.t += dt;
    this.hist.push(this.x());
    if (this.hist.length > 140) this.hist.shift();
  }
  draw(fc: FigureCanvas) {
    const { w, h, u } = fc;
    const wallX = u * 1.6;
    const yc = h * 0.36;
    const eq = w * 0.55; // posición de equilibrio
    const amp = Math.min(w * 0.28, u * 7);
    const A = Math.abs(this.A) || 1;
    const bx = eq + (this.x() / A) * amp;
    const s = u * 2.4;
    fc.hatch(wallX, yc - s * 1.2, wallX, yc + s * 1.2, -1);
    fc.hatch(wallX, yc + s * 0.6, w - u, yc + s * 0.6, -1);
    fc.spring(wallX, yc, bx - s / 2, yc, 10, u * 0.55);
    fc.rect(bx - s / 2, yc - s / 2, s, s, 'ink', 1, 'ink');
    fc.text('m', bx, yc + u * 0.35, 0.8, 'ink', 'center');
    fc.line(eq, yc - s, eq, yc + s * 0.6, 'pencil', 0.6, true);
    fc.text('x = 0', eq, yc - s * 1.1, 0.75, 'pencil', 'center');
    fc.arrow(eq, yc - s * 0.85, bx, yc - s * 0.85, 'pencil', 0.7);
    // traza x(t) en vivo debajo
    const gy = h * 0.8;
    const gh = h * 0.16;
    fc.line(u, gy, w - u, gy, 'ink', 0.5);
    fc.text('x(t)', u, gy - gh - u * 0.2, 0.75, 'ink');
    const pts = this.hist.map((v, i) => [w - u - (this.hist.length - 1 - i) * ((w - u * 2) / 140), gy - (v / A) * gh] as [number, number]);
    fc.path(pts, 'pencil', 1, true);
    fc.glow(bx, yc, s, '#a855f7', 0.25);
  }
  readouts() {
    const omega = Math.sqrt(this.n('k') / this.n('m'));
    return [
      { label: 'x', value: `${f(this.x(), 3)} m` },
      { label: 'ω', value: `${f(omega)} rad/s` },
      { label: 'T', value: `${f((2 * Math.PI) / omega)} s` },
      { label: 't', value: `${f(this.t, 1)} s` },
    ];
  }
}

// =====================================================================================
// 5. MRU / MRUV
// =====================================================================================
class Rectilinear extends PhysicsSim {
  controls: SimControl[] = [
    PLAY, RESET,
    { id: 'v0', kind: 'slider', label: 'Velocidad v₀', min: -10, max: 30, step: 0.5, unit: 'm/s' },
    { id: 'a', kind: 'slider', label: 'Aceleración a', min: -5, max: 5, step: 0.1, unit: 'm/s²' },
  ];
  private hold = 0;
  constructor(private x0: number, v0: number, a: number, private T: number) {
    super({ v0, a });
  }
  pos(t: number) {
    return this.x0 + this.n('v0') * t + 0.5 * this.n('a') * t * t;
  }
  reset() {
    super.reset();
    this.hold = 0;
  }
  step(dt: number) {
    if (this.t >= this.T) {
      this.hold += dt;
      if (this.hold > 1.5) this.reset();
      return;
    }
    this.t = Math.min(this.T, this.t + dt * Math.max(1, this.T / 5));
  }
  draw(fc: FigureCanvas) {
    const { w, h, u } = fc;
    const samples = Array.from({ length: 41 }, (_, i) => this.pos((this.T * i) / 40));
    const lo = Math.min(...samples, this.x0);
    const hi = Math.max(...samples, this.x0 + 1);
    const pad = u * 2;
    const X = (x: number) => pad + ((x - lo) / (hi - lo)) * (w - pad * 2);
    const road = h * 0.62;
    fc.line(u * 0.5, road, w - u * 0.5, road, 'ink');
    // regla con marcas
    const step = Math.pow(10, Math.floor(Math.log10((hi - lo) / 5)));
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      fc.line(X(v), road, X(v), road + u * 0.4, 'ink', 0.6);
      fc.text(f(v, 1), X(v), road + u * 1.4, 0.7, 'ink', 'center');
    }
    fc.text('x (m)', w - u * 0.5, road + u * 2.6, 0.7, 'ink', 'right');
    // huellas cada 0.5 s: equiespaciadas en MRU, crecientes en MRUV
    const dtMark = this.T / 10;
    for (let tt = 0; tt <= this.t + 1e-9; tt += dtMark) {
      fc.circle(X(this.pos(tt)), road - u * 0.25, u * 0.35, 'pencil', 1, 'solid');
    }
    // móvil
    const cx = X(this.pos(this.t));
    const cw = u * 3;
    const chh = u * 1.4;
    fc.rect(cx - cw / 2, road - chh - u * 0.6, cw, chh, 'ink', 1, 'ink');
    fc.circle(cx - cw * 0.3, road - u * 0.45, u * 0.8, 'ink');
    fc.circle(cx + cw * 0.3, road - u * 0.45, u * 0.8, 'ink');
    const v = this.n('v0') + this.n('a') * this.t;
    fc.arrow(cx, road - chh - u * 1.3, cx + clamp(v, -20, 20) * u * 0.25, road - chh - u * 1.3, 'pencil');
    fc.text('v = ' + f(v, 1) + ' m/s', cx, road - chh - u * 2, 0.8, 'pencil', 'center');
    fc.text(Math.abs(this.n('a')) < 1e-9 ? 'MRU' : 'MRUV', u, u * 1.2, 0.9, 'pencil');
    fc.glow(cx, road - chh / 2 - u * 0.6, cw * 0.7, '#a855f7', 0.22);
  }
  readouts() {
    return [
      { label: 't', value: `${f(this.t, 1)} s` },
      { label: 'x', value: `${f(this.pos(this.t))} m` },
      { label: 'v', value: `${f(this.n('v0') + this.n('a') * this.t)} m/s` },
    ];
  }
}

// =====================================================================================
// 6. Máquina de Atwood
// =====================================================================================
class Atwood extends PhysicsSim {
  controls: SimControl[] = [
    PLAY, RESET,
    { id: 'm1', kind: 'slider', label: 'Masa m₁', min: 0.2, max: 10, step: 0.1, unit: 'kg' },
    { id: 'm2', kind: 'slider', label: 'Masa m₂', min: 0.2, max: 10, step: 0.1, unit: 'kg' },
  ];
  y = 0; // desplazamiento de m2 hacia abajo (m)
  v = 0;
  private hold = 0;
  constructor(m1: number, m2: number, private g: number) {
    super({ m1, m2 });
  }
  get a() {
    const m1 = this.n('m1');
    const m2 = this.n('m2');
    return ((m2 - m1) * this.g) / (m1 + m2);
  }
  get T() {
    const m1 = this.n('m1');
    const m2 = this.n('m2');
    return (2 * m1 * m2 * this.g) / (m1 + m2);
  }
  reset() {
    super.reset();
    this.y = 0;
    this.v = 0;
    this.hold = 0;
  }
  step(dt: number) {
    const limit = 1; // recorrido máximo (m)
    if (Math.abs(this.y) >= limit || Math.abs(this.a) < 1e-9) {
      this.hold += dt;
      if (this.hold > 1.4) this.reset();
      return;
    }
    this.t += dt;
    this.v += this.a * dt;
    this.y = clamp(this.y + this.v * dt, -limit, limit);
  }
  draw(fc: FigureCanvas) {
    const { w, h, u } = fc;
    const cx = w / 2;
    const r = Math.min(w * 0.16, u * 2.6);
    const py = u * 1.2 + r + u;
    fc.hatch(cx - r * 2, u * 1.2, cx + r * 2, u * 1.2, 1);
    fc.line(cx, u * 1.2, cx, py, 'ink');
    fc.circle(cx, py, r * 2, 'ink');
    const rot = (this.y / r) * 60;
    for (let i = 0; i < 3; i++) {
      const a = rot + (i * Math.PI * 2) / 3;
      fc.line(cx, py, cx + Math.cos(a) * r * 0.85, py + Math.sin(a) * r * 0.85, 'ink', 0.6);
    }
    const travel = (h - py - u * 4) / 2.4;
    const base = py + (h - py) * 0.42;
    const y1 = base - this.y * travel;
    const y2 = base + this.y * travel;
    const box = (x: number, y: number, m: number, label: string) => {
      const s = clamp(u * 1.6 * Math.cbrt(m / 2), u * 1.4, u * 3.2);
      fc.line(x, py, x, y, 'ink');
      fc.rect(x - s / 2, y, s, s, 'ink', 1, 'ink');
      fc.text(label, x, y + s / 2 + u * 0.35, 0.75, 'ink', 'center');
      fc.text(f(m, 1) + ' kg', x + s / 2 + u * 0.3, y + s / 2, 0.7, 'pencil');
      fc.glow(x, y + s / 2, s, '#a855f7', 0.18);
    };
    box(cx - r, y1, this.n('m1'), 'm₁');
    box(cx + r, y2, this.n('m2'), 'm₂');
    const down = this.a >= 0 ? cx + r : cx - r;
    fc.arrow(down + r * 0.9, base, down + r * 0.9, base + u * 2.4, 'pencil');
    fc.text('a', down + r * 0.9 + u * 0.4, base + u * 1.4, 0.8, 'pencil');
    fc.hatch(u, h - u * 0.6, w - u, h - u * 0.6, -1);
  }
  readouts() {
    return [
      { label: 'a', value: `${f(Math.abs(this.a))} m/s²` },
      { label: 'T', value: `${f(this.T)} N` },
      { label: 'v', value: `${f(Math.abs(this.v))} m/s` },
      { label: 't', value: `${f(this.t, 1)} s` },
    ];
  }
}

// =====================================================================================
// Planes
// =====================================================================================
const spec = (title: string, aspect: number, create: () => FigureRuntime, minWidthChars = 14): FigureSpec => ({
  title,
  aspect,
  minWidthChars,
  create,
});

export function physicsPlan(exerciseType: string, d: Record<string, unknown>): SolutionPlan | null {
  const g = num(d.gravity_m_s2, 9.8);
  const base = { graph: null, graphPrimary: false, kind: 'simulation' as const };
  switch (exerciseType) {
    case 'inclined_plane': {
      const th = clamp(num(d.angle_degrees, 30), 1, 89);
      const mu = Math.max(0, num(d.friction_coefficient, 0.1));
      const m = Math.max(0.01, num(d.mass_kg, 1));
      const r = th * DEG;
      const a = g * (Math.sin(r) - mu * Math.cos(r));
      return {
        ...base,
        summary: 'Plano inclinado con fricción',
        lines: [
          line('Aceleración', `a = g(sen θ - μ cos θ) = ${f(Math.max(0, a))} m/s^2`),
          line('Normal y fricción', `N = mg cos θ = ${f(m * g * Math.cos(r))} N   fr = μN = ${f(mu * m * g * Math.cos(r))} N`),
          line('Resultado', a > 0 ? `El bloque desliza con a = ${f(a)} m/s^2` : 'μ ≥ tan θ: el bloque queda en reposo', true),
        ],
        figure: spec('Plano inclinado', 1.5, () => new InclinedPlane(th, mu, m, g)),
      };
    }
    case 'simple_pendulum': {
      const L = Math.max(0.05, num(d.length_m, 1));
      const th0 = clamp(Math.abs(num(d.initial_angle_degrees, 15)), 1, 85);
      const T = 2 * Math.PI * Math.sqrt(L / g);
      const vmax = Math.sqrt(2 * g * L * (1 - Math.cos(th0 * DEG)));
      return {
        ...base,
        summary: 'Péndulo simple',
        lines: [
          line('Período', `T = 2π√(L/g) = ${f(T)} s`),
          line('Velocidad máxima', `vmax = √(2gL(1 - cos θ0)) = ${f(vmax)} m/s`),
          line('Resultado', `T = ${f(T)} s   f = ${f(1 / T)} Hz`, true),
        ],
        figure: spec('Péndulo', 1, () => new Pendulum(L, th0, g), 10),
      };
    }
    case 'projectile_motion': {
      const v0 = Math.max(0.5, num(d.initial_velocity_m_s, 20));
      const ang = clamp(num(d.launch_angle_degrees, 45), 1, 89);
      const h0 = Math.max(0, num(d.initial_height_m, 0));
      const vy = v0 * Math.sin(ang * DEG);
      const vx = v0 * Math.cos(ang * DEG);
      const tv = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g;
      return {
        ...base,
        summary: 'Tiro parabólico',
        lines: [
          line('Componentes', `vx = ${f(vx)} m/s   vy = ${f(vy)} m/s`),
          line('Altura máxima', `Hmax = h0 + vy^2/(2g) = ${f(h0 + (vy * vy) / (2 * g))} m`),
          line('Alcance', `tv = ${f(tv)} s   R = vx·tv = ${f(vx * tv)} m`, true),
        ],
        figure: spec('Tiro parabólico', 1.7, () => new Projectile(v0, ang, h0, g), 16),
      };
    }
    case 'mass_spring': {
      const k = Math.max(0.1, num(d.spring_constant_k_n_m, 50));
      const m = Math.max(0.01, num(d.mass_kg, 1));
      const A = num(d.initial_displacement_m, 0.2) || 0.2;
      const b = Math.max(0, num(d.damping_coefficient, 0));
      const w = Math.sqrt(k / m);
      return {
        ...base,
        summary: 'Sistema masa-resorte (Ley de Hooke)',
        lines: [
          line('Frecuencia angular', `ω = √(k/m) = ${f(w)} rad/s`),
          line('Período', `T = 2π/ω = ${f((2 * Math.PI) / w)} s`),
          line('Fuerza máxima', `F = k·A = ${f(k * Math.abs(A))} N`, true),
        ],
        figure: spec('Masa-resorte', 1.9, () => new MassSpring(k, m, A, b), 16),
      };
    }
    case 'rectilinear_motion': {
      const x0 = num(d.initial_position_m, 0);
      const v0 = num(d.initial_velocity_m_s, 5);
      const a = d.motion_type === 'MRU' ? 0 : num(d.acceleration_m_s2, 0);
      const T = Math.max(0.5, num(d.total_time_s, 5));
      const vf = v0 + a * T;
      const x = x0 + v0 * T + 0.5 * a * T * T;
      return {
        ...base,
        summary: a === 0 ? 'Movimiento rectilíneo uniforme (MRU)' : 'Movimiento rectilíneo uniformemente variado (MRUV)',
        lines: [
          line('Ecuación', a === 0 ? 'x = x0 + v·t' : 'x = x0 + v0·t + ½·a·t^2'),
          line('Velocidad final', `v = v0 + a·t = ${f(vf)} m/s`),
          line('Resultado', `x(${f(T)} s) = ${f(x)} m   d = ${f(Math.abs(x - x0))} m`, true),
        ],
        figure: spec('MRU / MRUV', 2.2, () => new Rectilinear(x0, v0, a, T), 18),
      };
    }
    case 'atwood_machine': {
      const m1 = Math.max(0.01, num(d.mass_1_kg, 2));
      const m2 = Math.max(0.01, num(d.mass_2_kg, 3));
      const a = ((m2 - m1) * g) / (m1 + m2);
      return {
        ...base,
        summary: 'Máquina de Atwood',
        lines: [
          line('Aceleración', `a = (m2 - m1)g/(m1 + m2) = ${f(Math.abs(a))} m/s^2`),
          line('Tensión', `T = 2·m1·m2·g/(m1 + m2) = ${f((2 * m1 * m2 * g) / (m1 + m2))} N`),
          line('Resultado', Math.abs(a) < 1e-9 ? 'Masas iguales: equilibrio' : `Baja la masa ${a > 0 ? 'm2' : 'm1'}`, true),
        ],
        figure: spec('Máquina de Atwood', 0.95, () => new Atwood(m1, m2, g), 10),
      };
    }
  }
  return null;
}
