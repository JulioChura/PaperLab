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
    if (!this.values.play) return;
    // subpasos de 1/120 s: el resultado es exacto aunque la velocidad de simulación sea 3×
    let rest = Math.min(dt, 0.25);
    while (rest > 1e-6) {
      const h = Math.min(rest, 1 / 120);
      this.step(h);
      rest -= h;
    }
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
// 4. Masa-resorte (Hooke, con amortiguamiento): gráfica x(t) tipo sismógrafo bajo el bloque
// =====================================================================================
class MassSpring extends PhysicsSim {
  controls: SimControl[] = [
    PLAY, RESET,
    { id: 'k', kind: 'slider', label: 'Rigidez k', min: 5, max: 400, step: 5, unit: 'N/m' },
    { id: 'm', kind: 'slider', label: 'Masa m', min: 0.1, max: 5, step: 0.1, unit: 'kg' },
    { id: 'b', kind: 'slider', label: 'Amortig. b', min: 0, max: 5, step: 0.1, unit: 'kg/s' },
  ];
  private hist: [number, number][] = [];
  constructor(k: number, m: number, private A: number, b: number) {
    super({ k, m, b });
  }
  reset() {
    super.reset();
    this.hist = [];
  }
  private gamma() {
    return this.n('b') / (2 * this.n('m'));
  }
  x(t = this.t) {
    const m = this.n('m');
    const w0 = Math.sqrt(this.n('k') / m);
    const g = this.gamma();
    const wd = Math.sqrt(Math.max(1e-6, w0 * w0 - g * g));
    return this.A * Math.exp(-g * t) * Math.cos(wd * t);
  }
  step(dt: number) {
    this.t += dt;
    this.hist.push([this.t, this.x()]);
    const window = this.window();
    while (this.hist.length && this.hist[0][0] < this.t - window) this.hist.shift();
  }
  private window() {
    const T = (2 * Math.PI) / Math.sqrt(this.n('k') / this.n('m'));
    return clamp(T * 6, 2, 8);
  }
  draw(fc: FigureCanvas) {
    const { w, h, u } = fc;
    const wallX = u * 1.6;
    const yc = u * 3.2;
    const eq = w * 0.52;
    const amp = Math.min(w * 0.3, u * 8);
    const A = Math.abs(this.A) || 1;
    const X = (x: number) => eq + (x / A) * amp;
    const bx = X(this.x());
    const s = u * 2.2;
    fc.hatch(wallX, yc - s, wallX, yc + s * 0.6, -1);
    fc.hatch(wallX, yc + s * 0.5, w - u, yc + s * 0.5, -1);
    fc.spring(wallX, yc, bx - s / 2, yc, 10, u * 0.5);
    fc.rect(bx - s / 2, yc - s / 2, s, s, 'ink', 1, 'ink');
    fc.text('m', bx, yc + u * 0.35, 0.8, 'ink', 'center');
    fc.text('x = 0', eq, yc - s * 0.85, 0.7, 'pencil', 'center');
    // gráfica x(t) DEBAJO del bloque: mismo eje x que el movimiento, el tiempo corre hacia abajo
    const gy0 = yc + s * 1.1;
    const gy1 = h - u * 1.2;
    const window = this.window();
    const Yt = (ti: number) => gy0 + ((this.t - ti) / window) * (gy1 - gy0);
    fc.line(eq, yc - s * 0.6, eq, gy1, 'pencil', 0.6, true);
    fc.line(X(-A), gy0, X(A), gy0, 'ink', 0.5);
    fc.text('−A', X(-A), gy0 - u * 0.3, 0.6, 'ink', 'center');
    fc.text('+A', X(A), gy0 - u * 0.3, 0.6, 'ink', 'center');
    fc.arrow(w - u * 1.2, gy0, w - u * 1.2, gy1, 'ink', 0.6);
    fc.text('t', w - u * 0.6, gy1 - u * 0.2, 0.7, 'ink');
    // envolvente ±A·e^(−γt): muestra cómo decae la amplitud
    if (this.gamma() > 1e-6) {
      const env: [number, number][] = [];
      const envN: [number, number][] = [];
      for (let i = 0; i <= 30; i++) {
        const ti = Math.max(0, this.t - (window * i) / 30);
        const e = Math.exp(-this.gamma() * ti);
        env.push([X(A * e), Yt(ti)]);
        envN.push([X(-A * e), Yt(ti)]);
      }
      fc.path(env, 'ink', 0.6, true, true);
      fc.path(envN, 'ink', 0.6, true, true);
      fc.text('A·e^(−bt/2m)', X(A * Math.exp(-this.gamma() * this.t)) + u * 0.4, gy0 + u * 1.2, 0.6, 'ink');
    }
    const pts = this.hist.map(([ti, xi]) => [X(xi), Yt(ti)] as [number, number]);
    fc.path(pts, 'pencil', 1.1, true);
    // "aguja" del sismógrafo: conecta el bloque con su trazo
    fc.line(bx, yc + s / 2, bx, gy0, 'pencil', 0.5, true);
    fc.circle(bx, gy0, u * 0.45, 'pencil', 1, 'solid');
    fc.glow(bx, gy0, u * 1.2, '#a855f7', 0.6);
    fc.glow(bx, yc, s, '#a855f7', 0.2);
  }
  readouts() {
    const omega = Math.sqrt(this.n('k') / this.n('m'));
    return [
      { label: 'x', value: `${f(this.x(), 3)} m` },
      { label: 'Amplitud', value: `${f(Math.abs(this.A) * Math.exp(-this.gamma() * this.t), 3)} m` },
      { label: 'ω', value: `${f(omega)} rad/s` },
      { label: 'T', value: `${f((2 * Math.PI) / omega)} s` },
    ];
  }
}

// =====================================================================================
// 5. MRU / MRUV (uno o dos móviles; con dos, punto de encuentro)
// =====================================================================================
class Rectilinear extends PhysicsSim {
  controls: SimControl[];
  private hold = 0;
  constructor(private x0: number, v0: number, a: number, private T: number, private second: { x0: number; v0: number; a: number } | null) {
    super({ v0, a, v2: second?.v0 ?? 0 });
    this.controls = [
      PLAY, RESET,
      { id: 'v0', kind: 'slider', label: second ? 'v₀ móvil A' : 'Velocidad v₀', min: -30, max: 30, step: 0.5, unit: 'm/s' },
      { id: 'a', kind: 'slider', label: second ? 'a móvil A' : 'Aceleración a', min: -5, max: 5, step: 0.1, unit: 'm/s²' },
    ];
    if (second) this.controls.push({ id: 'v2', kind: 'slider', label: 'v₀ móvil B', min: -30, max: 30, step: 0.5, unit: 'm/s' });
  }
  pos(t: number) {
    return this.x0 + this.n('v0') * t + 0.5 * this.n('a') * t * t;
  }
  pos2(t: number) {
    const s = this.second!;
    return s.x0 + this.n('v2') * t + 0.5 * s.a * t * t;
  }
  /** Primer instante t > 0 en que ambos móviles coinciden. */
  meeting(): number | null {
    if (!this.second) return null;
    const A = 0.5 * (this.n('a') - this.second.a);
    const B = this.n('v0') - this.n('v2');
    const C = this.x0 - this.second.x0;
    const roots = Math.abs(A) < 1e-9 ? (Math.abs(B) < 1e-9 ? [] : [-C / B]) : (() => {
      const D = B * B - 4 * A * C;
      if (D < 0) return [];
      return [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)];
    })();
    const ok = roots.filter((r) => r > 1e-6).sort((p, q) => p - q);
    return ok[0] ?? null;
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
  private car(fc: FigureCanvas, cx: number, road: number, facing: 1 | -1, label: string, v: number) {
    const u = fc.u;
    const cw = u * 3;
    const chh = u * 1.3;
    fc.rect(cx - cw / 2, road - chh - u * 0.6, cw, chh, 'ink', 1, 'ink');
    fc.rect(cx - cw * 0.2 + facing * cw * 0.05, road - chh - u * 1.3, cw * 0.4, u * 0.7, 'ink', 0.8);
    fc.circle(cx - cw * 0.3, road - u * 0.45, u * 0.8, 'ink');
    fc.circle(cx + cw * 0.3, road - u * 0.45, u * 0.8, 'ink');
    fc.text(label, cx, road - chh * 0.25 - u * 0.4, 0.7, 'ink', 'center');
    fc.arrow(cx, road - chh - u * 1.9, cx + clamp(v, -20, 20) * u * 0.22, road - chh - u * 1.9, 'pencil');
    fc.text(`${f(v, 1)} m/s`, cx, road - chh - u * 2.5, 0.7, 'pencil', 'center');
    fc.glow(cx, road - chh / 2 - u * 0.6, cw * 0.7, '#a855f7', 0.22);
  }
  draw(fc: FigureCanvas) {
    const { w, h, u } = fc;
    const ts = Array.from({ length: 41 }, (_, i) => (this.T * i) / 40);
    const samples = [...ts.map((t) => this.pos(t)), ...(this.second ? ts.map((t) => this.pos2(t)) : []), this.x0];
    const lo = Math.min(...samples);
    const hi = Math.max(...samples, lo + 1);
    const pad = u * 2.2;
    const X = (x: number) => pad + ((x - lo) / (hi - lo)) * (w - pad * 2);
    const lanes = this.second ? [h * 0.42, h * 0.74] : [h * 0.62];
    lanes.forEach((y) => fc.line(u * 0.5, y, w - u * 0.5, y, 'ink'));
    const ruler = lanes[lanes.length - 1];
    const step = Math.pow(10, Math.floor(Math.log10((hi - lo) / 5)));
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
      fc.line(X(v), ruler, X(v), ruler + u * 0.4, 'ink', 0.6);
      fc.text(f(v, 1), X(v), ruler + u * 1.4, 0.65, 'ink', 'center');
    }
    fc.text('x (m)', w - u * 0.5, ruler + u * 2.6, 0.7, 'ink', 'right');
    const dtMark = this.T / 10;
    for (let tt = 0; tt <= this.t + 1e-9; tt += dtMark) {
      fc.circle(X(this.pos(tt)), lanes[0] - u * 0.25, u * 0.33, 'pencil', 1, 'solid');
      if (this.second) fc.circle(X(this.pos2(tt)), lanes[1] - u * 0.25, u * 0.33, 'pencil', 1, 'solid');
    }
    const v1 = this.n('v0') + this.n('a') * this.t;
    this.car(fc, X(this.pos(this.t)), lanes[0], v1 >= 0 ? 1 : -1, this.second ? 'A' : '', v1);
    if (this.second) {
      const v2 = this.n('v2') + this.second.a * this.t;
      this.car(fc, X(this.pos2(this.t)), lanes[1], v2 >= 0 ? 1 : -1, 'B', v2);
      const tm = this.meeting();
      if (tm !== null && tm <= this.T) {
        const xm = this.pos(tm);
        fc.line(X(xm), u * 0.8, X(xm), ruler, 'pencil', 0.7, true);
        const reached = this.t >= tm;
        fc.text(`encuentro: t = ${f(tm)} s, x = ${f(xm)} m`, X(xm), u * 1.1, 0.68, reached ? 'pencil' : 'ink', X(xm) > w * 0.6 ? 'right' : 'left');
        if (reached) fc.glow(X(xm), (lanes[0] + lanes[1]) / 2, u * 3, '#a855f7', 0.5);
      }
    } else {
      fc.text(Math.abs(this.n('a')) < 1e-9 ? 'MRU' : 'MRUV', u, u * 1.2, 0.9, 'pencil');
    }
  }
  readouts() {
    const out = [
      { label: 't', value: `${f(this.t, 1)} s` },
      { label: this.second ? 'xA' : 'x', value: `${f(this.pos(this.t))} m` },
      { label: this.second ? 'vA' : 'v', value: `${f(this.n('v0') + this.n('a') * this.t)} m/s` },
    ];
    if (this.second) {
      out.push({ label: 'xB', value: `${f(this.pos2(this.t))} m` });
      const tm = this.meeting();
      out.push({ label: 'Encuentro', value: tm === null ? 'no se cruzan' : `${f(tm)} s` });
    }
    return out;
  }
}

// =====================================================================================
// 6. Máquina de Atwood (una polea, o dos poleas con una masa sobre la mesa)
// =====================================================================================
class Atwood extends PhysicsSim {
  controls: SimControl[];
  y = 0;
  v = 0;
  private hold = 0;
  constructor(m1: number, m2: number, private g: number, private m3: number | null, mu: number) {
    super({ m1, m2, mu });
    this.controls = [
      PLAY, RESET,
      { id: 'm1', kind: 'slider', label: 'Masa m₁', min: 0.2, max: 10, step: 0.1, unit: 'kg' },
      { id: 'm2', kind: 'slider', label: 'Masa m₂', min: 0.2, max: 10, step: 0.1, unit: 'kg' },
    ];
    if (m3) this.controls.push({ id: 'mu', kind: 'slider', label: 'Fricción mesa μ', min: 0, max: 0.8, step: 0.01 });
  }
  /** Aceleración (positiva: baja m2). Con mesa: fricción cinética sobre m3. */
  get a() {
    const m1 = this.n('m1');
    const m2 = this.n('m2');
    if (!this.m3) return ((m2 - m1) * this.g) / (m1 + m2);
    const drive = (m2 - m1) * this.g;
    const fr = this.n('mu') * this.m3 * this.g;
    if (Math.abs(drive) <= fr) return 0; // la fricción lo mantiene en reposo
    return (drive - Math.sign(drive) * fr) / (m1 + m2 + this.m3);
  }
  get T1() {
    return this.n('m1') * (this.g + this.a);
  }
  get T2() {
    return this.n('m2') * (this.g - this.a);
  }
  reset() {
    super.reset();
    this.y = 0;
    this.v = 0;
    this.hold = 0;
  }
  step(dt: number) {
    const limit = 1;
    if (Math.abs(this.y) >= limit || Math.abs(this.a) < 1e-9) {
      this.hold += dt;
      if (this.hold > 1.4) this.reset();
      return;
    }
    this.t += dt;
    this.v += this.a * dt;
    this.y = clamp(this.y + this.v * dt, -limit, limit);
  }
  private box(fc: FigureCanvas, x: number, y: number, m: number, label: string, ropeFrom: number) {
    const u = fc.u;
    const s = clamp(u * 1.6 * Math.cbrt(m / 2), u * 1.4, u * 3);
    fc.line(x, ropeFrom, x, y, 'ink');
    fc.rect(x - s / 2, y, s, s, 'ink', 1, 'ink');
    fc.text(label, x, y + s / 2 + u * 0.35, 0.72, 'ink', 'center');
    fc.text(f(m, 1) + ' kg', x + s / 2 + u * 0.3, y + s / 2, 0.66, 'pencil');
    fc.glow(x, y + s / 2, s, '#a855f7', 0.18);
  }
  private pulley(fc: FigureCanvas, cx: number, cy: number, r: number) {
    fc.circle(cx, cy, r * 2, 'ink');
    fc.circle(cx, cy, r * 0.3, 'ink', 1, 'solid');
    const rot = (this.y / 0.12) % (Math.PI * 2);
    for (let i = 0; i < 3; i++) {
      const a = rot + (i * Math.PI * 2) / 3;
      fc.line(cx, cy, cx + Math.cos(a) * r * 0.85, cy + Math.sin(a) * r * 0.85, 'ink', 0.6);
    }
  }
  draw(fc: FigureCanvas) {
    const { w, h, u } = fc;
    if (!this.m3) {
      const cx = w / 2;
      const r = Math.min(w * 0.16, u * 2.6);
      const py = u * 1.2 + r + u;
      fc.hatch(cx - r * 2, u * 1.2, cx + r * 2, u * 1.2, 1);
      fc.line(cx, u * 1.2, cx, py, 'ink');
      this.pulley(fc, cx, py, r);
      const travel = (h - py - u * 4) / 2.4;
      const base = py + (h - py) * 0.42;
      this.box(fc, cx - r, base - this.y * travel, this.n('m1'), 'm₁', py);
      this.box(fc, cx + r, base + this.y * travel, this.n('m2'), 'm₂', py);
      const down = this.a >= 0 ? cx + r : cx - r;
      fc.arrow(down + r * 0.9, base, down + r * 0.9, base + u * 2.4, 'pencil');
      fc.text('a', down + r * 0.9 + u * 0.4, base + u * 1.4, 0.8, 'pencil');
      fc.hatch(u, h - u * 0.6, w - u, h - u * 0.6, -1);
      return;
    }
    // dos poleas en los bordes de una mesa; m3 desliza sobre ella
    const r = u * 1.4;
    const tableY = h * 0.34;
    const tl = w * 0.22;
    const tr = w * 0.78;
    fc.rect(tl, tableY, tr - tl, u * 0.9, 'ink', 1);
    fc.line(tl + u, tableY + u * 0.9, tl + u, h - u * 0.6, 'ink', 0.8);
    fc.line(tr - u, tableY + u * 0.9, tr - u, h - u * 0.6, 'ink', 0.8);
    fc.hatch(u, h - u * 0.6, w - u, h - u * 0.6, -1);
    const p1: [number, number] = [tl - r * 0.2, tableY - r * 0.1];
    const p2: [number, number] = [tr + r * 0.2, tableY - r * 0.1];
    this.pulley(fc, p1[0], p1[1], r);
    this.pulley(fc, p2[0], p2[1], r);
    const travel = (tr - tl) * 0.18;
    const bs = u * 2.6;
    const bx = (tl + tr) / 2 + this.y * travel;
    fc.rect(bx - bs / 2, tableY - bs, bs, bs, 'ink', 1, 'ink');
    fc.text('m₃', bx, tableY - bs / 2 + u * 0.35, 0.72, 'ink', 'center');
    fc.text(`${f(this.m3, 1)} kg  μ = ${f(this.n('mu'))}`, bx, tableY - bs - u * 0.5, 0.62, 'pencil', 'center');
    // cuerdas horizontales hasta las poleas
    fc.line(p1[0], p1[1] - r, bx - bs / 2, tableY - bs / 2, 'ink', 0.9);
    fc.line(bx + bs / 2, tableY - bs / 2, p2[0], p2[1] - r, 'ink', 0.9);
    const base = tableY + (h - tableY) * 0.32;
    const vt = (h - base - u * 4) * 0.5;
    this.box(fc, p1[0] - r, base - this.y * vt, this.n('m1'), 'm₁', p1[1]);
    this.box(fc, p2[0] + r, base + this.y * vt, this.n('m2'), 'm₂', p2[1]);
    if (Math.abs(this.a) > 1e-9) {
      const dir = this.a > 0 ? 1 : -1;
      fc.arrow(bx - dir * u * 1.5, tableY - bs - u * 1.6, bx + dir * u * 1.5, tableY - bs - u * 1.6, 'pencil');
      fc.text('a', bx, tableY - bs - u * 2.1, 0.75, 'pencil', 'center');
    } else fc.text('en reposo (la fricción lo sostiene)', w / 2, u * 1.2, 0.7, 'pencil', 'center');
  }
  readouts() {
    const out = [
      { label: 'a', value: `${f(Math.abs(this.a))} m/s²` },
      { label: this.m3 ? 'T₁' : 'T', value: `${f(this.m3 ? this.T1 : (2 * this.n('m1') * this.n('m2') * this.g) / (this.n('m1') + this.n('m2')))} N` },
    ];
    if (this.m3) out.push({ label: 'T₂', value: `${f(this.T2)} N` });
    out.push({ label: 'v', value: `${f(Math.abs(this.v))} m/s` });
    return out;
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
      const gamma = b / (2 * m);
      const lines: SolutionLine[] = [
        line('Frecuencia angular', `ω = √(k/m) = ${f(w)} rad/s`),
        line('Período', `T = 2π/ω = ${f((2 * Math.PI) / w)} s   Fmax = k·A = ${f(k * Math.abs(A))} N`),
      ];
      if (b > 0) {
        lines.push(line('Decaimiento', `A(t) = A·e^(-bt/2m)   A(${f((2 * Math.PI) / w)} s) = ${f(Math.abs(A) * Math.exp((-gamma * 2 * Math.PI) / w), 3)} m`));
        lines.push(line('Resultado', `Cada período la amplitud se reduce al ${f(100 * Math.exp((-gamma * 2 * Math.PI) / w), 0)} %`, true));
      } else lines.push(line('Resultado', `x(t) = ${f(A)}·cos(${f(w)}t) m`, true));
      return {
        ...base,
        summary: b > 0 ? 'Oscilador amortiguado' : 'Sistema masa-resorte (Ley de Hooke)',
        lines,
        figure: spec('Masa-resorte', 1.25, () => new MassSpring(k, m, A, b), 16),
      };
    }
    case 'rectilinear_motion': {
      const x0 = num(d.initial_position_m, 0);
      const v0 = num(d.initial_velocity_m_s, 5);
      const a = d.motion_type === 'MRU' ? 0 : num(d.acceleration_m_s2, 0);
      const T = Math.max(0.5, num(d.total_time_s, 5));
      const two = d.second_initial_velocity_m_s !== undefined && d.second_initial_velocity_m_s !== null;
      if (two) {
        const second = { x0: num(d.second_initial_position_m, 100), v0: num(d.second_initial_velocity_m_s, -10), a: num(d.second_acceleration_m_s2, 0) };
        const sim = new Rectilinear(x0, v0, a, T, second);
        const tm = sim.meeting();
        return {
          ...base,
          summary: 'Encuentro de dos móviles',
          lines: [
            line('Ecuaciones', `xA = ${f(x0)} + ${f(v0)}t${a ? ` + ½(${f(a)})t^2` : ''}    xB = ${f(second.x0)} + (${f(second.v0)})t${second.a ? ` + ½(${f(second.a)})t^2` : ''}`),
            line('Condición', 'Se encuentran cuando xA = xB'),
            line('Resultado', tm === null ? 'No se encuentran' : `t = ${f(tm)} s   x = ${f(sim.pos(tm))} m`, true),
          ],
          figure: spec('Encuentro', 2, () => sim, 22),
        };
      }
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
        figure: spec('MRU / MRUV', 2.2, () => new Rectilinear(x0, v0, a, T, null), 18),
      };
    }
    case 'atwood_machine': {
      const m1 = Math.max(0.01, num(d.mass_1_kg, 2));
      const m2 = Math.max(0.01, num(d.mass_2_kg, 3));
      const m3 = d.mass_3_kg ? Math.max(0.01, num(d.mass_3_kg, 2)) : null;
      const mu = Math.max(0, num(d.table_friction_coefficient, 0));
      if (m3) {
        const drive = (m2 - m1) * g;
        const fr = mu * m3 * g;
        const a = Math.abs(drive) <= fr ? 0 : (drive - Math.sign(drive) * fr) / (m1 + m2 + m3);
        return {
          ...base,
          summary: 'Atwood con dos poleas y masa sobre la mesa',
          lines: [
            line('Fuerzas', `(m2 - m1)g = ${f(drive)} N   fr = μ·m3·g = ${f(fr)} N`),
            line('Aceleración', `a = [(m2 - m1)g - μ·m3·g]/(m1 + m2 + m3) = ${f(Math.abs(a))} m/s^2`),
            line('Tensiones', `T1 = m1(g + a) = ${f(m1 * (g + a))} N   T2 = m2(g - a) = ${f(m2 * (g - a))} N`, true),
          ],
          figure: spec('Atwood doble', 1.5, () => new Atwood(m1, m2, g, m3, mu), 18),
        };
      }
      const a = ((m2 - m1) * g) / (m1 + m2);
      return {
        ...base,
        summary: 'Máquina de Atwood',
        lines: [
          line('Aceleración', `a = (m2 - m1)g/(m1 + m2) = ${f(Math.abs(a))} m/s^2`),
          line('Tensión', `T = 2·m1·m2·g/(m1 + m2) = ${f((2 * m1 * m2 * g) / (m1 + m2))} N`),
          line('Resultado', Math.abs(a) < 1e-9 ? 'Masas iguales: equilibrio' : `Baja la masa ${a > 0 ? 'm2' : 'm1'}`, true),
        ],
        figure: spec('Máquina de Atwood', 0.95, () => new Atwood(m1, m2, g, null, 0), 10),
      };
    }
  }
  return null;
}
