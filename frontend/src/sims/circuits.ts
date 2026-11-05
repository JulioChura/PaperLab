/**
 * Simulaciones de CIRCUITOS: corriente animada (cargas que fluyen con velocidad ∝ I), bombillas que
 * brillan según la potencia, interruptor táctil, carga RC y compuertas lógicas con entradas conmutables.
 * Los valores eléctricos se recalculan con las leyes de Ohm y Kirchhoff a partir de V y R.
 */
import type { SolutionPlan, SolutionLine } from '../ar/mathEngine';
import { plainTextTokens } from '../ar/mathEngine';
import { pointAlong, type FigureCanvas } from './figureCanvas';
import { clamp, fmtNum as f, num, type FigureRuntime, type FigureSpec, type SimControl } from './types';

type Pt = [number, number];
const line = (title: string, text: string, answer = false): SolutionLine => ({ title, tokens: plainTextTokens(text), answer });
const CURRENT = '#38bdf8';
const BULB = '#fde047';

// ------------------------------------------------------------------ símbolos
function battery(fc: FigureCanvas, x: number, y: number, vertical: boolean, label: string) {
  const u = fc.u;
  const long = u * 1.6;
  const short = u * 0.9;
  const gap = u * 0.45;
  if (vertical) {
    fc.line(x - long / 2, y - gap / 2, x + long / 2, y - gap / 2, 'ink', 1.2);
    fc.line(x - short / 2, y + gap / 2, x + short / 2, y + gap / 2, 'ink', 1.6);
    fc.text('+', x + long / 2 + u * 0.2, y - gap, 0.7, 'ink');
    fc.text(label, x + long / 2 + u * 0.4, y + u * 0.9, 0.8, 'pencil');
  } else {
    fc.line(x - gap / 2, y - long / 2, x - gap / 2, y + long / 2, 'ink', 1.2);
    fc.line(x + gap / 2, y - short / 2, x + gap / 2, y + short / 2, 'ink', 1.6);
    fc.text(label, x, y - long / 2 - u * 0.4, 0.8, 'pencil', 'center');
  }
}

function resistor(fc: FigureCanvas, x1: number, y1: number, x2: number, y2: number, label: string) {
  fc.spring(x1, y1, x2, y2, 4, fc.u * 0.45);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const horizontal = Math.abs(x2 - x1) > Math.abs(y2 - y1);
  if (horizontal) fc.text(label, mx, my - fc.u * 0.9, 0.75, 'pencil', 'center');
  else if (mx > fc.w * 0.75) fc.text(label, mx - fc.u * 0.8, my + fc.u * 0.3, 0.75, 'pencil', 'right');
  else fc.text(label, mx + fc.u * 0.8, my + fc.u * 0.3, 0.75, 'pencil');
}

function bulb(fc: FigureCanvas, x: number, y: number, power: number, color = BULB) {
  const r = fc.u * 1.1;
  fc.circle(x, y, r * 2, 'ink');
  fc.line(x - r * 0.7, y - r * 0.7, x + r * 0.7, y + r * 0.7, 'ink', 0.8);
  fc.line(x - r * 0.7, y + r * 0.7, x + r * 0.7, y - r * 0.7, 'ink', 0.8);
  const glow = clamp(power, 0, 1);
  fc.glow(x, y, r * (2 + glow * 3), color, 0.25 + glow * 0.75);
}

/** Cargas animadas a lo largo de un recorrido cerrado; velocidad ∝ corriente. */
function chargeFlow(fc: FigureCanvas, path: Pt[], phase: number, intensity: number) {
  if (intensity <= 0.001) return;
  const { total } = pointAlong(path, 0);
  const gap = fc.u * 1.6;
  const n = Math.floor(total / gap);
  for (let i = 0; i < n; i++) {
    const { p } = pointAlong(path, i * gap + phase);
    fc.glow(p[0], p[1], fc.u * 0.6, CURRENT, 0.75 + intensity * 0.25);
  }
}

abstract class CircuitSim implements FigureRuntime {
  animated = true;
  phase = 0;
  t = 0;
  values: Record<string, number | boolean>;
  abstract controls: SimControl[];
  constructor(values: Record<string, number | boolean>) {
    this.values = values;
  }
  onControl(id: string, value?: number | boolean) {
    if (value !== undefined) this.values[id] = value;
    else if (typeof this.values[id] === 'boolean') this.values[id] = !this.values[id];
    this.changed(id);
  }
  changed(_id: string) {
    void _id;
  }
  protected n(id: string) {
    return this.values[id] as number;
  }
  abstract current(): number;
  update(dt: number) {
    this.t += dt;
    // velocidad visual: logarítmica para que 1 mA y 2 A sean distinguibles
    const I = Math.abs(this.current());
    const speed = I > 0 ? this.uSpeed * clamp(0.6 + Math.log10(1 + I * 20), 0.3, 3) : 0;
    this.phase += speed * dt;
  }
  uSpeed = 60;
  abstract draw(fc: FigureCanvas): void;
  abstract readouts(): { label: string; value: string }[];
}

/** Marco rectangular del circuito dentro del lienzo. */
function frame(fc: FigureCanvas, inset = 1.8) {
  const p = fc.u * inset;
  return { x0: p, y0: p, x1: fc.w - p, y1: fc.h - p };
}

// =====================================================================================
// 1. Malla simple (fuente + resistencia + bombilla)
// =====================================================================================
class SingleLoop extends CircuitSim {
  controls: SimControl[] = [
    { id: 'V', kind: 'slider', label: 'Voltaje V', min: 1, max: 24, step: 0.5, unit: 'V' },
    { id: 'R', kind: 'slider', label: 'Resistencia R', min: 1, max: 1000, step: 1, unit: 'Ω' },
  ];
  constructor(V: number, R: number, private led: boolean, private ledColor: string) {
    super({ V, R });
  }
  current() {
    return this.n('V') / this.n('R');
  }
  draw(fc: FigureCanvas) {
    const { x0, y0, x1, y1 } = frame(fc);
    const midY = (y0 + y1) / 2;
    const path: Pt[] = [[x0, midY], [x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, midY]];
    const rx0 = x0 + (x1 - x0) * 0.3;
    const rx1 = x0 + (x1 - x0) * 0.7;
    fc.line(x0, y0, rx0, y0);
    resistor(fc, rx0, y0, rx1, y0, `R = ${f(this.n('R'))} Ω`);
    fc.line(rx1, y0, x1, y0);
    fc.line(x1, y0, x1, midY - fc.u * 1.1);
    fc.line(x1, midY + fc.u * 1.1, x1, y1);
    fc.line(x1, y1, x0, y1);
    fc.line(x0, y1, x0, midY + fc.u * 0.4);
    fc.line(x0, midY - fc.u * 0.4, x0, y0);
    battery(fc, x0, midY, true, `${f(this.n('V'))} V`);
    const P = this.n('V') * this.current();
    if (this.led) bulb(fc, x1, midY, P / 6, colorOf(this.ledColor));
    else resistor(fc, x1, midY - fc.u * 1.1, x1, midY + fc.u * 1.1, '');
    chargeFlow(fc, path, this.phase, this.current());
    fc.arrow(x0 + fc.u * 2, y0 - fc.u * 0.9, x0 + fc.u * 4, y0 - fc.u * 0.9, 'pencil', 0.7);
    fc.text('I', x0 + fc.u * 3, y0 - fc.u * 1.4, 0.75, 'pencil', 'center');
  }
  readouts() {
    const I = this.current();
    return [
      { label: 'I', value: `${f(I, 3)} A` },
      { label: 'P', value: `${f(this.n('V') * I)} W` },
    ];
  }
}

function colorOf(name: string): string {
  const map: Record<string, string> = { red: '#f87171', rojo: '#f87171', green: '#4ade80', verde: '#4ade80', blue: '#60a5fa', azul: '#60a5fa', white: '#f8fafc', blanco: '#f8fafc' };
  return map[(name || '').toLowerCase()] ?? BULB;
}

// =====================================================================================
// 2. Resistencias en serie
// =====================================================================================
class Series extends CircuitSim {
  controls: SimControl[] = [{ id: 'V', kind: 'slider', label: 'Voltaje V', min: 1, max: 48, step: 0.5, unit: 'V' }];
  constructor(V: number, private Rs: number[]) {
    super({ V });
  }
  current() {
    return this.n('V') / this.Rs.reduce((a, b) => a + b, 0);
  }
  draw(fc: FigureCanvas) {
    const { x0, y0, x1, y1 } = frame(fc, 2.2);
    const midY = (y0 + y1) / 2;
    const path: Pt[] = [[x0, midY], [x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, midY]];
    // resistencias repartidas por el lado superior (y derecho si son muchas)
    const n = this.Rs.length;
    const top = Math.min(n, 3);
    const I = this.current();
    const seg = (x1 - x0) / top;
    for (let i = 0; i < top; i++) {
      const a = x0 + seg * i + seg * 0.2;
      const b = x0 + seg * (i + 1) - seg * 0.2;
      fc.line(x0 + seg * i, y0, a, y0);
      resistor(fc, a, y0, b, y0, `R${i + 1} = ${f(this.Rs[i])} Ω`);
      fc.line(b, y0, x0 + seg * (i + 1), y0);
      fc.text(`V${i + 1} = ${f(I * this.Rs[i])} V`, (a + b) / 2, y0 + fc.u * 1.4, 0.7, 'ink', 'center');
    }
    if (n > 3) {
      const rest = n - 3;
      const segv = (y1 - y0) / rest;
      for (let i = 0; i < rest; i++) {
        const a = y0 + segv * i + segv * 0.2;
        const b = y0 + segv * (i + 1) - segv * 0.2;
        fc.line(x1, y0 + segv * i, x1, a);
        resistor(fc, x1, a, x1, b, `R${i + 4}`);
        fc.line(x1, b, x1, y0 + segv * (i + 1));
      }
    } else fc.line(x1, y0, x1, y1);
    fc.line(x1, y1, x0, y1);
    fc.line(x0, y1, x0, midY + fc.u * 0.4);
    fc.line(x0, midY - fc.u * 0.4, x0, y0);
    battery(fc, x0, midY, true, `${f(this.n('V'))} V`);
    chargeFlow(fc, path, this.phase, I);
  }
  readouts() {
    const Req = this.Rs.reduce((a, b) => a + b, 0);
    return [
      { label: 'Req', value: `${f(Req)} Ω` },
      { label: 'I', value: `${f(this.current(), 3)} A` },
    ];
  }
}

// =====================================================================================
// 3. Resistencias en paralelo
// =====================================================================================
class Parallel extends CircuitSim {
  controls: SimControl[] = [{ id: 'V', kind: 'slider', label: 'Voltaje V', min: 1, max: 48, step: 0.5, unit: 'V' }];
  private phases: number[];
  constructor(V: number, private Rs: number[]) {
    super({ V });
    this.phases = Rs.map(() => 0);
  }
  current() {
    return this.Rs.reduce((s, r) => s + this.n('V') / r, 0);
  }
  update(dt: number) {
    super.update(dt);
    this.Rs.forEach((r, i) => {
      const I = this.n('V') / r;
      this.phases[i] += this.uSpeed * clamp(0.6 + Math.log10(1 + I * 20), 0.3, 3) * dt;
    });
  }
  draw(fc: FigureCanvas) {
    const { x0, y0, x1, y1 } = frame(fc, 2);
    const midY = (y0 + y1) / 2;
    const n = this.Rs.length;
    const bx0 = x0 + (x1 - x0) * 0.32;
    const span = (x1 - bx0) / Math.max(1, n - 1 || 1);
    fc.line(x0, y0, x1, y0);
    fc.line(x0, y1, x1, y1);
    fc.line(x0, y1, x0, midY + fc.u * 0.4);
    fc.line(x0, midY - fc.u * 0.4, x0, y0);
    battery(fc, x0, midY, true, `${f(this.n('V'))} V`);
    const I = this.current();
    this.Rs.forEach((r, i) => {
      const x = n === 1 ? x1 : bx0 + span * i;
      const a = y0 + (y1 - y0) * 0.3;
      const b = y0 + (y1 - y0) * 0.7;
      fc.line(x, y0, x, a);
      resistor(fc, x, a, x, b, `R${i + 1}=${f(r)}Ω`);
      fc.line(x, b, x, y1);
      fc.circle(x, y0, fc.u * 0.35, 'ink', 1, 'solid');
      fc.circle(x, y1, fc.u * 0.35, 'ink', 1, 'solid');
      const Ii = this.n('V') / r;
      const right = x > fc.w * 0.75;
      fc.text(`I${i + 1}=${f(Ii, 3)}A`, right ? x - fc.u * 0.8 : x + fc.u * 0.8, y1 - fc.u * 0.8, 0.65, 'ink', right ? 'right' : 'left');
      // rama: baja por la resistencia
      chargeFlow(fc, [[x, y0], [x, y1]], this.phases[i], Ii);
    });
    // tronco principal
    chargeFlow(fc, [[x0, y1], [x0, y0], [bx0, y0]], this.phase, I);
  }
  readouts() {
    const Req = 1 / this.Rs.reduce((s, r) => s + 1 / r, 0);
    return [
      { label: 'Req', value: `${f(Req)} Ω` },
      { label: 'I total', value: `${f(this.current(), 3)} A` },
    ];
  }
}

// =====================================================================================
// 4. Interruptor
// =====================================================================================
class SwitchCircuit extends CircuitSim {
  controls: SimControl[] = [{ id: 'closed', kind: 'toggle', label: 'Interruptor', icon: 'switch' }];
  private lever = 0; // 0 abierto → 1 cerrado (animación)
  constructor(private V: number, private R: number, closed: boolean) {
    super({ closed });
    this.lever = closed ? 1 : 0;
  }
  current() {
    return this.values.closed && this.lever > 0.95 ? this.V / this.R : 0;
  }
  update(dt: number) {
    const target = this.values.closed ? 1 : 0;
    this.lever += (target - this.lever) * Math.min(1, dt * 10);
    super.update(dt);
  }
  draw(fc: FigureCanvas) {
    const { x0, y0, x1, y1 } = frame(fc);
    const midY = (y0 + y1) / 2;
    const sx0 = x0 + (x1 - x0) * 0.35;
    const sx1 = x0 + (x1 - x0) * 0.6;
    fc.line(x0, y0, sx0, y0);
    fc.circle(sx0, y0, fc.u * 0.4, 'ink', 1, 'solid');
    fc.circle(sx1, y0, fc.u * 0.4, 'ink', 1, 'solid');
    const ang = (1 - this.lever) * 0.6;
    const len = sx1 - sx0;
    fc.line(sx0, y0, sx0 + Math.cos(ang) * len, y0 - Math.sin(ang) * len, 'ink', 1.2);
    fc.text(this.values.closed ? 'cerrado' : 'abierto', (sx0 + sx1) / 2, y0 + fc.u * 1.4, 0.75, 'pencil', 'center');
    fc.line(sx1, y0, x1, y0);
    fc.line(x1, y0, x1, midY - fc.u * 1.1);
    fc.line(x1, midY + fc.u * 1.1, x1, y1);
    fc.line(x1, y1, x0, y1);
    fc.line(x0, y1, x0, midY + fc.u * 0.4);
    fc.line(x0, midY - fc.u * 0.4, x0, y0);
    battery(fc, x0, midY, true, `${f(this.V)} V`);
    const I = this.current();
    bulb(fc, x1, midY, I > 0 ? (this.V * I) / 6 : 0);
    if (I > 0) {
      chargeFlow(fc, [[x0, midY], [x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, midY]], this.phase, I);
    }
    fc.glow((sx0 + sx1) / 2, y0, fc.u * 2, this.values.closed ? '#4ade80' : '#f87171', 0.35);
  }
  readouts() {
    return [
      { label: 'Estado', value: this.values.closed ? 'Cerrado' : 'Abierto' },
      { label: 'I', value: `${f(this.current(), 3)} A` },
    ];
  }
}

// =====================================================================================
// 5. Circuito RC (carga / descarga)
// =====================================================================================
class RCCircuit extends CircuitSim {
  controls: SimControl[] = [
    { id: 'charging', kind: 'toggle', label: 'Cargar / Descargar', icon: 'charge' },
    { id: 'reset', kind: 'button', label: 'Reiniciar', icon: 'reset' },
  ];
  vc = 0;
  private hist: number[] = [];
  private speed: number;
  constructor(private V: number, private R: number, private C: number, charging: boolean) {
    super({ charging });
    this.vc = charging ? 0 : V;
    // que 5τ duren ~6 s en pantalla
    this.speed = (5 * this.tau) / 6;
  }
  get tau() {
    return this.R * this.C;
  }
  current() {
    return (this.values.charging ? this.V - this.vc : -this.vc) / this.R;
  }
  onControl(id: string, value?: number | boolean) {
    if (id === 'reset') {
      this.vc = this.values.charging ? 0 : this.V;
      this.hist = [];
      this.t = 0;
      return;
    }
    super.onControl(id, value);
    this.hist = [];
    this.t = 0;
  }
  update(dt: number) {
    const sdt = dt * this.speed;
    const target = this.values.charging ? this.V : 0;
    this.vc = target + (this.vc - target) * Math.exp(-sdt / this.tau);
    this.t += sdt;
    this.hist.push(this.vc);
    if (this.hist.length > 180) this.hist.shift();
    this.phase += 60 * clamp(Math.abs(this.current()) / (this.V / this.R), 0, 1) * dt * (this.current() >= 0 ? 1 : -1);
  }
  draw(fc: FigureCanvas) {
    const u = fc.u;
    const cw = fc.w * 0.55;
    const x0 = u * 1.8;
    const y0 = u * 1.8;
    const x1 = cw - u;
    const y1 = fc.h - u * 1.8;
    const midY = (y0 + y1) / 2;
    fc.line(x0, y0, x0 + (x1 - x0) * 0.2, y0);
    resistor(fc, x0 + (x1 - x0) * 0.2, y0, x0 + (x1 - x0) * 0.75, y0, `R = ${f(this.R)} Ω`);
    fc.line(x0 + (x1 - x0) * 0.75, y0, x1, y0);
    // condensador vertical a la derecha
    const gap = u * 0.5;
    fc.line(x1, y0, x1, midY - gap / 2);
    fc.line(x1 - u * 1.3, midY - gap / 2, x1 + u * 1.3, midY - gap / 2, 'ink', 1.4);
    fc.line(x1 - u * 1.3, midY + gap / 2, x1 + u * 1.3, midY + gap / 2, 'ink', 1.4);
    fc.line(x1, midY + gap / 2, x1, y1);
    fc.text(`C = ${f(this.C * 1e6)} μF`, x1 + u * 1.5, midY + u * 0.3, 0.7, 'pencil');
    const q = clamp(this.vc / this.V, 0, 1);
    const marks = Math.round(q * 5);
    for (let i = 0; i < marks; i++) {
      fc.text('+', x1 - u * 1 + i * u * 0.5, midY - gap / 2 - u * 0.3, 0.55, 'pencil');
      fc.text('–', x1 - u * 1 + i * u * 0.5, midY + gap / 2 + u * 0.9, 0.55, 'pencil');
    }
    fc.glow(x1, midY, u * (1.5 + q * 2), CURRENT, 0.15 + q * 0.4);
    fc.line(x1, y1, x0, y1);
    fc.line(x0, y1, x0, midY + u * 0.4);
    fc.line(x0, midY - u * 0.4, x0, y0);
    battery(fc, x0, midY, true, `${f(this.V)} V`);
    chargeFlow(fc, [[x0, midY], [x0, y0], [x1, y0], [x1, midY - gap]], this.phase, Math.abs(this.current()) / (this.V / this.R));
    chargeFlow(fc, [[x1, midY + gap], [x1, y1], [x0, y1], [x0, midY]], this.phase, Math.abs(this.current()) / (this.V / this.R));

    // gráfica Vc(t)
    const gx = cw + u;
    const gw = fc.w - gx - u * 0.6;
    const gy0 = y0;
    const gy1 = y1;
    fc.line(gx, gy1, gx + gw, gy1, 'ink', 0.7);
    fc.line(gx, gy1, gx, gy0, 'ink', 0.7);
    fc.text('Vc', gx + u * 0.3, gy0 + u * 0.6, 0.7, 'ink');
    fc.text('t', gx + gw, gy1 + u * 1, 0.7, 'ink', 'right');
    fc.line(gx, gy0 + u, gx + gw, gy0 + u, 'ink', 0.4, true);
    fc.text(`${f(this.V)} V`, gx + gw, gy0 + u * 0.7, 0.6, 'ink', 'right');
    const pts = this.hist.map((v, i) => [gx + (i / 180) * gw, gy1 - (v / this.V) * (gy1 - gy0 - u)] as Pt);
    fc.path(pts, 'pencil', 1.1, true);
  }
  readouts() {
    return [
      { label: 'τ', value: `${f(this.tau, 3)} s` },
      { label: 'Vc', value: `${f(this.vc)} V` },
      { label: 'I', value: `${f(this.current() * 1000, 2)} mA` },
      { label: 'Q', value: `${f(this.C * this.vc * 1e6)} μC` },
    ];
  }
}

// =====================================================================================
// 6. Compuertas lógicas
// =====================================================================================
type Gate = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';
const evalGate = (g: Gate, a: number, b: number): number => {
  switch (g) {
    case 'AND': return a & b;
    case 'OR': return a | b;
    case 'NOT': return a ? 0 : 1;
    case 'NAND': return (a & b) ? 0 : 1;
    case 'NOR': return (a | b) ? 0 : 1;
    case 'XOR': return a ^ b;
  }
};

class LogicGates implements FigureRuntime {
  animated = true;
  t = 0;
  controls: SimControl[];
  values: Record<string, number | boolean>;
  constructor(private gate: Gate, inputs: number[]) {
    this.values = { A: !!inputs[0], B: !!inputs[1] };
    this.controls = [{ id: 'A', kind: 'toggle', label: 'Entrada A', icon: 'bolt' }];
    if (gate !== 'NOT') this.controls.push({ id: 'B', kind: 'toggle', label: 'Entrada B', icon: 'bolt' });
  }
  onControl(id: string) {
    this.values[id] = !this.values[id];
  }
  update(dt: number) {
    this.t += dt;
  }
  out() {
    return evalGate(this.gate, this.values.A ? 1 : 0, this.values.B ? 1 : 0);
  }
  draw(fc: FigureCanvas) {
    const u = fc.u;
    const gw = fc.w * 0.55;
    const cy = fc.h * 0.45;
    const gx = gw * 0.35;
    const gs = Math.min(gw * 0.4, fc.h * 0.55);
    const one = this.gate === 'NOT';
    const inY = one ? [cy] : [cy - gs * 0.25, cy + gs * 0.25];
    const outX = gx + gs * (this.gate === 'NOT' ? 0.9 : 1);
    // cuerpo
    const pts: Pt[] = [];
    if (this.gate === 'AND' || this.gate === 'NAND') {
      pts.push([gx, cy - gs / 2], [gx + gs * 0.5, cy - gs / 2]);
      for (let i = 0; i <= 12; i++) {
        const a = -Math.PI / 2 + (Math.PI * i) / 12;
        pts.push([gx + gs * 0.5 + Math.cos(a) * gs * 0.5, cy + Math.sin(a) * gs * 0.5]);
      }
      pts.push([gx, cy + gs / 2], [gx, cy - gs / 2]);
    } else if (this.gate === 'NOT') {
      pts.push([gx, cy - gs * 0.4], [gx + gs * 0.75, cy], [gx, cy + gs * 0.4], [gx, cy - gs * 0.4]);
    } else {
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        pts.push([gx + t * gs, cy - gs / 2 + t * t * gs * 0.5]);
      }
      for (let i = 12; i >= 0; i--) {
        const t = i / 12;
        pts.push([gx + t * gs, cy + gs / 2 - t * t * gs * 0.5]);
      }
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI / 2 - (Math.PI * i) / 8;
        pts.push([gx + Math.cos(a) * gs * 0.18, cy + Math.sin(a) * gs * 0.5]);
      }
      if (this.gate === 'XOR') {
        const bow: Pt[] = [];
        for (let i = 0; i <= 8; i++) {
          const a = Math.PI / 2 - (Math.PI * i) / 8;
          bow.push([gx - u * 0.6 + Math.cos(a) * gs * 0.18, cy + Math.sin(a) * gs * 0.5]);
        }
        fc.path(bow, 'ink', 1, true);
      }
    }
    fc.path(pts, 'ink', 1.2);
    const bubble = this.gate === 'NOT' || this.gate === 'NAND' || this.gate === 'NOR';
    if (bubble) fc.circle(outX + u * 0.35, cy, u * 0.7, 'ink');
    fc.text(this.gate, gx + gs * 0.38, cy + u * 0.35, 0.8, 'pencil', 'center');
    // entradas y salida
    const ins = [this.values.A, this.values.B];
    inY.forEach((y, i) => {
      const on = !!ins[i];
      fc.line(u * 1.2, y, gx + (this.gate === 'OR' || this.gate === 'NOR' || this.gate === 'XOR' ? gs * 0.12 : 0), y);
      fc.text(`${i === 0 ? 'A' : 'B'} = ${on ? 1 : 0}`, u * 1, y - u * 0.5, 0.75, 'ink');
      if (on) fc.lightPath([[u * 1.2, y], [gx, y]], CURRENT, fc.stroke * 1.4, 0.8);
    });
    const out = this.out();
    const ledX = gw - u * 0.6;
    fc.line(outX + (bubble ? u * 0.7 : 0), cy, ledX - u, cy);
    fc.circle(ledX, cy, u * 1.6, 'ink');
    fc.text(`S = ${out}`, ledX, cy + u * 2.1, 0.8, 'ink', 'center');
    if (out) {
      fc.lightPath([[outX, cy], [ledX - u, cy]], CURRENT, fc.stroke * 1.4, 0.8);
      fc.glow(ledX, cy, u * 3.5, '#4ade80', 0.9);
    }
    // tabla de verdad con la fila actual resaltada
    const tx = gw + u * 1.8;
    const cols = one ? ['A', 'S'] : ['A', 'B', 'S'];
    const rows = one ? [[0], [1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];
    const colW = (fc.w - tx - u * 0.6) / cols.length;
    const rowH = Math.min(u * 1.9, (fc.h - u * 2) / (rows.length + 1));
    const ty = u * 1.2;
    cols.forEach((c, i) => fc.text(c, tx + colW * (i + 0.5), ty + rowH * 0.7, 0.85, 'pencil', 'center'));
    fc.line(tx, ty + rowH, tx + colW * cols.length, ty + rowH, 'ink', 0.7);
    fc.line(tx + colW * (cols.length - 1), ty, tx + colW * (cols.length - 1), ty + rowH * (rows.length + 1), 'ink', 0.7);
    const a = this.values.A ? 1 : 0;
    const b = this.values.B ? 1 : 0;
    rows.forEach((r, i) => {
      const y = ty + rowH * (i + 1);
      const s = evalGate(this.gate, r[0], r[1] ?? 0);
      const current = r[0] === a && (one || r[1] === b);
      if (current) fc.highlight(tx, y + rowH * 0.1, colW * cols.length, rowH * 0.85);
      [...r, s].forEach((v, j) => fc.text(String(v), tx + colW * (j + 0.5), y + rowH * 0.72, 0.85, 'ink', 'center'));
    });
  }
  readouts() {
    return [
      { label: 'Compuerta', value: this.gate },
      { label: 'Salida S', value: String(this.out()) },
    ];
  }
}

// =====================================================================================
// Planes
// =====================================================================================
const spec = (title: string, aspect: number, create: () => FigureRuntime, minWidthChars = 16): FigureSpec => ({ title, aspect, minWidthChars, create });

export function circuitPlan(exerciseType: string, d: Record<string, unknown>): SolutionPlan | null {
  const base = { graph: null, graphPrimary: false, kind: 'simulation' as const };
  const V = Math.max(0.1, num(d.voltage_v, 9));
  const list = (v: unknown, fb: number[]) =>
    Array.isArray(v) && v.length ? v.map((x) => Math.max(0.01, num(x, 100))) : fb;
  switch (exerciseType) {
    case 'single_loop': {
      const R = Math.max(0.01, num(d.resistance_ohms, 100));
      const I = V / R;
      return {
        ...base,
        summary: 'Circuito de malla simple (Ley de Ohm)',
        lines: [
          line('Ley de Ohm', `I = V/R = ${f(V)}/${f(R)} = ${f(I, 3)} A`),
          line('Potencia', `P = V·I = ${f(V * I)} W`, true),
        ],
        figure: spec('Malla simple', 1.45, () => new SingleLoop(V, R, d.has_led !== false, String(d.led_color ?? 'yellow'))),
      };
    }
    case 'series_resistors': {
      const Rs = list(d.resistors_ohms, [100, 200]);
      const Req = Rs.reduce((a, b) => a + b, 0);
      const I = V / Req;
      return {
        ...base,
        summary: 'Resistencias en serie',
        lines: [
          line('Equivalente', `Req = ${Rs.map((r) => f(r)).join(' + ')} = ${f(Req)} Ω`),
          line('Corriente', `I = V/Req = ${f(I, 3)} A`),
          line('Caídas', Rs.map((r, i) => `V${i + 1} = ${f(I * r)} V`).join('   '), true),
        ],
        figure: spec('Serie', 1.6, () => new Series(V, Rs), 18),
      };
    }
    case 'parallel_resistors': {
      const Rs = list(d.resistors_ohms, [100, 200]);
      const Req = 1 / Rs.reduce((s, r) => s + 1 / r, 0);
      return {
        ...base,
        summary: 'Resistencias en paralelo',
        lines: [
          line('Equivalente', `1/Req = ${Rs.map((r) => `1/${f(r)}`).join(' + ')}  →  Req = ${f(Req)} Ω`),
          line('Ramas', Rs.map((r, i) => `I${i + 1} = ${f(V / r, 3)} A`).join('   ')),
          line('Corriente total', `I = ${f(V / Req, 3)} A`, true),
        ],
        figure: spec('Paralelo', 1.5, () => new Parallel(V, Rs), 18),
      };
    }
    case 'interactive_switch': {
      const R = Math.max(0.01, num(d.load_resistance_ohms, 100));
      return {
        ...base,
        summary: 'Circuito con interruptor',
        lines: [
          line('Cerrado', `I = V/R = ${f(V / R, 3)} A`),
          line('Abierto', 'I = 0 A (circuito abierto)', true),
        ],
        figure: spec('Interruptor', 1.45, () => new SwitchCircuit(V, R, d.initial_state === 'closed')),
      };
    }
    case 'rc_circuit': {
      const R = Math.max(0.01, num(d.resistance_ohms, 1000));
      const C = Math.max(1e-9, num(d.capacitance_uf, 100) * 1e-6);
      const tau = R * C;
      return {
        ...base,
        summary: 'Circuito RC',
        lines: [
          line('Constante de tiempo', `τ = R·C = ${f(tau, 3)} s`),
          line('Carga', `Vc(t) = V(1 - e^(-t/τ))   Qmax = C·V = ${f(C * V * 1e6)} μC`),
          line('Resultado', `Al 99 %: t ≈ 5τ = ${f(5 * tau, 3)} s`, true),
        ],
        figure: spec('RC', 1.9, () => new RCCircuit(V, R, C, d.mode !== 'discharging'), 20),
      };
    }
    case 'logic_gates': {
      const gate = (String(d.gate_type ?? 'AND').toUpperCase() as Gate);
      const valid: Gate[] = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'];
      const g = valid.includes(gate) ? gate : 'AND';
      const inputs = Array.isArray(d.inputs) ? d.inputs.map((x) => (num(x, 0) ? 1 : 0)) : [1, 0];
      const expr: Record<Gate, string> = { AND: 'S = A·B', OR: 'S = A + B', NOT: 'S = A\'', NAND: 'S = (A·B)\'', NOR: 'S = (A + B)\'', XOR: 'S = A ⊕ B' };
      return {
        ...base,
        summary: `Compuerta lógica ${g}`,
        lines: [
          line('Expresión', expr[g]),
          line('Resultado', `Con A = ${inputs[0] ?? 0}${g === 'NOT' ? '' : `, B = ${inputs[1] ?? 0}`}: S = ${evalGate(g, inputs[0] ?? 0, inputs[1] ?? 0)}`, true),
        ],
        figure: spec('Compuerta', 1.8, () => new LogicGates(g, inputs), 18),
      };
    }
  }
  return null;
}
