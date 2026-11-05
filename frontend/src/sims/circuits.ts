/**
 * Simulaciones de CIRCUITOS.
 *  - Sentido de la corriente: chevrones animados (corriente convencional, de + a −) con velocidad ∝ I.
 *  - Polaridad por colores: + en ROJO, − en AZUL (baterías, resistencias, placas del condensador) y
 *    cables coloreados por potencial (rojo = alto, azul = bajo).
 *  - Valores recalculados con las leyes de Ohm y Kirchhoff a partir de V y R.
 */
import type { SolutionPlan, SolutionLine } from '../ar/mathEngine';
import { plainTextTokens } from '../ar/mathEngine';
import type { FigureCanvas } from './figureCanvas';
import { clamp, fmtNum as f, num, type FigureRuntime, type FigureSpec, type SimControl } from './types';

type Pt = [number, number];
const line = (title: string, text: string, answer = false): SolutionLine => ({ title, tokens: plainTextTokens(text), answer });
const POS = '#ef4444';
const NEG = '#3b82f6';
const FLOW = '#0ea5e9';
const BULB = '#fde047';
const ON = '#22c55e';

// ------------------------------------------------------------------ símbolos
/** Batería vertical: placa larga arriba (+, rojo), corta abajo (−, azul). */
function battery(fc: FigureCanvas, x: number, y: number, label: string) {
  const u = fc.u;
  const long = u * 1.7;
  const short = u * 0.95;
  const gap = u * 0.5;
  fc.line(x - long / 2, y - gap / 2, x + long / 2, y - gap / 2, 'ink', 1.3);
  fc.line(x - short / 2, y + gap / 2, x + short / 2, y + gap / 2, 'ink', 1.8);
  fc.lightText('+', x + long / 2 + u * 0.45, y - gap / 2 - u * 0.35, 0.9, POS);
  fc.lightText('−', x + short / 2 + u * 0.55, y + gap / 2 + u * 0.4, 0.9, NEG);
  fc.text(label, x + long / 2 + u * 1.1, y + u * 0.3, 0.8, 'pencil');
}

/** Resistencia en zigzag con polaridad de su caída de tensión (+ por donde entra la corriente). */
function resistor(fc: FigureCanvas, a: Pt, b: Pt, label: string, polarity = true, labelSide: 1 | -1 = 1) {
  fc.spring(a[0], a[1], b[0], b[1], 4, fc.u * 0.45);
  const u = fc.u;
  const horizontal = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  if (horizontal) fc.text(label, mx, my - u * 0.95, 0.72, 'pencil', 'center');
  else fc.text(label, mx + u * 0.8 * labelSide, my + u * 0.3, 0.72, 'pencil', labelSide > 0 ? 'left' : 'right');
  if (polarity) {
    const off = horizontal ? [0, u * 0.9] : [-u * 0.75 * labelSide, 0];
    fc.lightText('+', a[0] + (b[0] - a[0]) * 0.06 + off[0], a[1] + (b[1] - a[1]) * 0.06 + off[1], 0.7, POS);
    fc.lightText('−', b[0] - (b[0] - a[0]) * 0.06 + off[0], b[1] - (b[1] - a[1]) * 0.06 + off[1], 0.7, NEG);
  }
}

function bulb(fc: FigureCanvas, x: number, y: number, power: number, color = BULB) {
  const r = fc.u * 1.1;
  fc.circle(x, y, r * 2, 'ink');
  fc.line(x - r * 0.7, y - r * 0.7, x + r * 0.7, y + r * 0.7, 'ink', 0.8);
  fc.line(x - r * 0.7, y + r * 0.7, x + r * 0.7, y - r * 0.7, 'ink', 0.8);
  const glow = clamp(power, 0, 1);
  if (glow > 0.01) fc.glow(x, y, r * (2 + glow * 3), color, 0.3 + glow * 0.7);
}

/** Interruptor entre dos contactos (closedness 0 = abierto, 1 = cerrado). */
function switchAt(fc: FigureCanvas, a: Pt, b: Pt, closedness: number, label: string) {
  const u = fc.u;
  fc.circle(a[0], a[1], u * 0.4, 'ink', 1, 'solid');
  fc.circle(b[0], b[1], u * 0.4, 'ink', 1, 'solid');
  const base = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const ang = base - (1 - closedness) * 0.65;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  fc.line(a[0], a[1], a[0] + Math.cos(ang) * len, a[1] + Math.sin(ang) * len, 'ink', 1.3);
  const horizontal = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]);
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  fc.text(label, horizontal ? mx : mx + u * 1.2, horizontal ? my + u * 1.4 : my, 0.72, 'pencil', horizontal ? 'center' : 'left');
  fc.glow(mx, my, u * 1.5, closedness > 0.95 ? ON : POS, 0.35);
}

/** Medidor (amperímetro / voltímetro) con su lectura en vivo. */
function meter(fc: FigureCanvas, x: number, y: number, letter: string, reading: string) {
  const u = fc.u;
  fc.circle(x, y, u * 1.8, 'ink');
  fc.text(letter, x, y + u * 0.35, 0.85, 'ink', 'center');
  fc.lightText(reading, x, y - u * 1.55, 0.7, '#0f766e');
}

/** Corriente: cable coloreado por potencial + chevrones en el sentido de la corriente. */
function wireFlow(fc: FigureCanvas, path: Pt[], phase: number, current: number, c0 = POS, c1 = NEG) {
  fc.potentialPath(path, c0, c1, fc.stroke * 2.4, 0.32);
  if (Math.abs(current) > 1e-6) fc.flowChevrons(path, phase, FLOW, 0.95);
}

const flowSpeed = (I: number, u: number) => (Math.abs(I) > 1e-6 ? u * 2.2 * clamp(0.7 + Math.log10(1 + Math.abs(I) * 20), 0.4, 3) : 0);

abstract class CircuitSim implements FigureRuntime {
  animated = true;
  phase = 0;
  values: Record<string, number | boolean>;
  abstract controls: SimControl[];
  protected u = 20;
  constructor(values: Record<string, number | boolean>) {
    this.values = values;
  }
  onControl(id: string, value?: number | boolean) {
    if (value !== undefined) this.values[id] = value;
    else if (typeof this.values[id] === 'boolean') this.values[id] = !this.values[id];
  }
  protected n(id: string) {
    return this.values[id] as number;
  }
  abstract current(): number;
  update(dt: number) {
    this.phase += flowSpeed(this.current(), this.u) * dt;
  }
  abstract draw(fc: FigureCanvas): void;
  abstract readouts(): { label: string; value: string }[];
}

function frame(fc: FigureCanvas, inset = 2) {
  const p = fc.u * inset;
  return { x0: p, y0: p, x1: fc.w - p, y1: fc.h - p };
}

// =====================================================================================
// 1. Malla simple (con resistencia interna opcional, amperímetro y voltímetro)
// =====================================================================================
class SingleLoop extends CircuitSim {
  controls: SimControl[];
  constructor(V: number, R: number, r: number, private led: boolean, private ledColor: string) {
    super({ V, R, r });
    this.controls = [
      { id: 'V', kind: 'slider', label: 'FEM ε', min: 1, max: 24, step: 0.5, unit: 'V' },
      { id: 'R', kind: 'slider', label: 'Resistencia R', min: 1, max: 500, step: 1, unit: 'Ω' },
    ];
    if (r > 0) this.controls.push({ id: 'r', kind: 'slider', label: 'Resist. interna r', min: 0, max: 10, step: 0.1, unit: 'Ω' });
  }
  current() {
    return this.n('V') / (this.n('R') + this.n('r'));
  }
  draw(fc: FigureCanvas) {
    this.u = fc.u;
    const u = fc.u;
    const { x0, y0, x1, y1 } = frame(fc, 2.4);
    const xb = x0 + u * 1.5;
    const midY = (y0 + y1) / 2 - u * 0.8;
    const I = this.current();
    const hasR = this.n('r') > 0;
    const rx0 = x0 + (x1 - x0) * 0.42;
    const rx1 = x0 + (x1 - x0) * 0.72;
    const ax = x0 + (x1 - x0) * 0.22;
    // recorrido: + de la batería → arriba → R → foco → abajo → − de la batería
    wireFlow(fc, [[xb, midY - u * 0.3], [xb, y0], [x1, y0], [x1, y1], [xb, y1], [xb, midY + u * (hasR ? 3.2 : 0.3)]], this.phase, I);
    fc.line(xb, y0, ax - u * 0.9, y0);
    meter(fc, ax, y0, 'A', `${f(I, 3)} A`);
    fc.line(ax + u * 0.9, y0, rx0, y0);
    resistor(fc, [rx0, y0], [rx1, y0], `R = ${f(this.n('R'))} Ω`);
    fc.line(rx1, y0, x1, y0);
    const by = (y0 + y1) / 2;
    fc.line(x1, y0, x1, by - u * 1.1);
    fc.line(x1, by + u * 1.1, x1, y1);
    if (this.led) bulb(fc, x1, by, (I * I * this.n('R')) / 4, colorOf(this.ledColor));
    else resistor(fc, [x1, by - u * 1.1], [x1, by + u * 1.1], '', false);
    fc.line(x1, y1, xb, y1);
    fc.line(xb, y0, xb, midY - u * 0.25);
    battery(fc, xb, midY, `ε = ${f(this.n('V'))} V`);
    if (hasR) {
      // fuente real: FEM ε + resistencia interna r dentro de un recuadro punteado
      const ra: Pt = [xb, midY + u * 0.7];
      const rb: Pt = [xb, midY + u * 2.8];
      fc.line(xb, midY + u * 0.25, ra[0], ra[1]);
      resistor(fc, ra, rb, `r = ${f(this.n('r'))} Ω`, false, 1);
      fc.line(rb[0], rb[1], xb, y1);
      fc.rect(xb - u * 1.5, midY - u * 1.4, u * 3, u * 4.6, 'ink', 0.5);
      // voltímetro en bornes: V = ε − I·r
      const vx = xb + u * 5.2;
      const vy = midY + u * 3.6;
      fc.line(xb + u * 1.5, midY - u * 1.2, vx - u * 0.6, vy - u * 0.8, 'ink', 0.5, true);
      fc.line(xb + u * 1.5, midY + u * 3.1, vx - u * 0.9, vy, 'ink', 0.5, true);
      meter(fc, vx, vy, 'V', `${f(this.n('V') - I * this.n('r'))} V`);
    } else fc.line(xb, midY + u * 0.25, xb, y1);
  }
  readouts() {
    const I = this.current();
    return [
      { label: 'I', value: `${f(I, 3)} A` },
      { label: 'V bornes', value: `${f(this.n('V') - I * this.n('r'))} V` },
      { label: 'P en R', value: `${f(I * I * this.n('R'))} W` },
    ];
  }
}

function colorOf(name: string): string {
  const map: Record<string, string> = { red: '#f87171', rojo: '#f87171', green: '#4ade80', verde: '#4ade80', blue: '#60a5fa', azul: '#60a5fa', white: '#f8fafc', blanco: '#f8fafc' };
  return map[(name || '').toLowerCase()] ?? BULB;
}

// =====================================================================================
// 2. Serie
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
    this.u = fc.u;
    const u = fc.u;
    const { x0, y0, x1, y1 } = frame(fc, 2.4);
    const midY = (y0 + y1) / 2;
    const I = this.current();
    wireFlow(fc, [[x0, midY - u * 0.3], [x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, midY + u * 0.3]], this.phase, I);
    const n = this.Rs.length;
    const top = Math.min(n, 3);
    const seg = (x1 - x0) / top;
    for (let i = 0; i < top; i++) {
      const a = x0 + seg * i + seg * 0.22;
      const b = x0 + seg * (i + 1) - seg * 0.22;
      fc.line(x0 + seg * i, y0, a, y0);
      resistor(fc, [a, y0], [b, y0], `R${i + 1} = ${f(this.Rs[i])} Ω`);
      fc.line(b, y0, x0 + seg * (i + 1), y0);
      fc.text(`V${i + 1} = ${f(I * this.Rs[i])} V`, (a + b) / 2, y0 + u * 2.1, 0.68, 'ink', 'center');
    }
    if (n > 3) {
      const rest = n - 3;
      const segv = (y1 - y0) / rest;
      for (let i = 0; i < rest; i++) {
        const a = y0 + segv * i + segv * 0.25;
        const b = y0 + segv * (i + 1) - segv * 0.25;
        fc.line(x1, y0 + segv * i, x1, a);
        resistor(fc, [x1, a], [x1, b], `R${i + 4} = ${f(this.Rs[i + 3])} Ω`, true, -1);
        fc.line(x1, b, x1, y0 + segv * (i + 1));
        fc.text(`V${i + 4} = ${f(I * this.Rs[i + 3])} V`, x1 - u * 0.8, (a + b) / 2 + u * 1.6, 0.68, 'ink', 'right');
      }
    } else fc.line(x1, y0, x1, y1);
    fc.line(x1, y1, x0, y1);
    fc.line(x0, y1, x0, midY + u * 0.25);
    fc.line(x0, midY - u * 0.25, x0, y0);
    battery(fc, x0, midY, `${f(this.n('V'))} V`);
    fc.text(`I = ${f(I, 3)} A (la misma en todo el circuito)`, (x0 + x1) / 2, y1 + u * 1.5, 0.7, 'pencil', 'center');
  }
  readouts() {
    return [
      { label: 'Req', value: `${f(this.Rs.reduce((a, b) => a + b, 0))} Ω` },
      { label: 'I', value: `${f(this.current(), 3)} A` },
    ];
  }
}

// =====================================================================================
// 3. Paralelo: riel superior a V (rojo), riel inferior a 0 V (azul), corriente por rama
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
    this.Rs.forEach((r, i) => (this.phases[i] += flowSpeed(this.n('V') / r, this.u) * dt));
  }
  draw(fc: FigureCanvas) {
    this.u = fc.u;
    const u = fc.u;
    const { x0, y0, x1, y1 } = frame(fc, 2.4);
    const midY = (y0 + y1) / 2;
    const n = this.Rs.length;
    const bx0 = x0 + (x1 - x0) * 0.32;
    const span = n > 1 ? (x1 - bx0) / (n - 1) : 0;
    const xs = this.Rs.map((_, i) => (n === 1 ? x1 : bx0 + span * i));
    const I = this.current();
    // rieles: todo el de arriba está a V, todo el de abajo a 0 V → misma tensión en cada rama
    fc.potentialPath([[x0, y0], [xs[n - 1], y0]], POS, POS, fc.stroke * 2.6, 0.35);
    fc.potentialPath([[x0, y1], [xs[n - 1], y1]], NEG, NEG, fc.stroke * 2.6, 0.35);
    fc.line(x0, y0, xs[n - 1], y0);
    fc.line(x0, y1, xs[n - 1], y1);
    fc.line(x0, y1, x0, midY + u * 0.25);
    fc.line(x0, midY - u * 0.25, x0, y0);
    battery(fc, x0, midY, `${f(this.n('V'))} V`);
    fc.flowChevrons([[x0, midY], [x0, y0], [bx0, y0]], this.phase, FLOW);
    fc.flowChevrons([[bx0, y1], [x0, y1], [x0, midY]], this.phase, FLOW);
    fc.text(`I = ${f(I, 3)} A`, (x0 + bx0) / 2, y0 - u * 0.7, 0.72, 'pencil', 'center');
    this.Rs.forEach((r, i) => {
      const x = xs[i];
      const a = y0 + (y1 - y0) * 0.3;
      const b = y0 + (y1 - y0) * 0.7;
      fc.potentialPath([[x, y0], [x, y1]], POS, NEG, fc.stroke * 2.4, 0.32);
      fc.line(x, y0, x, a);
      resistor(fc, [x, a], [x, b], `R${i + 1} = ${f(r)} Ω`, true, 1);
      fc.line(x, b, x, y1);
      fc.circle(x, y0, u * 0.42, 'ink', 1, 'solid');
      fc.circle(x, y1, u * 0.42, 'ink', 1, 'solid');
      fc.flowChevrons([[x, y0], [x, y1]], this.phases[i], FLOW, 0.95, u * 1.8);
      fc.lightText(`I${i + 1} = ${f(this.n('V') / r, 2)} A`, x, y1 + u * 1.1, 0.62, '#0369a1');
    });
    fc.text(`V = ${f(this.n('V'))} V en cada rama`, (bx0 + xs[n - 1]) / 2, y0 - u * 0.7, 0.7, 'pencil', 'center');
  }
  readouts() {
    return [
      { label: 'Req', value: `${f(1 / this.Rs.reduce((s, r) => s + 1 / r, 0))} Ω` },
      { label: 'I total', value: `${f(this.current(), 3)} A` },
    ];
  }
}

// =====================================================================================
// 4. Interruptores (uno o dos: S1 general, S2 controla el segundo foco)
// =====================================================================================
class SwitchCircuit extends CircuitSim {
  controls: SimControl[];
  private lever = [0, 0];
  private phases = [0, 0];
  constructor(private V: number, private R1: number, closed: boolean, private R2: number | null, closed2: boolean) {
    super({ closed, closed2 });
    this.lever = [closed ? 1 : 0, closed2 ? 1 : 0];
    this.controls = [{ id: 'closed', kind: 'toggle', label: R2 ? 'S1 (general)' : 'Interruptor', icon: 'switch' }];
    if (R2) this.controls.push({ id: 'closed2', kind: 'toggle', label: 'S2 (foco 2)', icon: 'switch' });
  }
  private i1() {
    return this.values.closed && this.lever[0] > 0.95 ? this.V / this.R1 : 0;
  }
  private i2() {
    return this.R2 && this.values.closed && this.values.closed2 && this.lever[0] > 0.95 && this.lever[1] > 0.95 ? this.V / this.R2 : 0;
  }
  current() {
    return this.i1() + this.i2();
  }
  update(dt: number) {
    this.lever[0] += ((this.values.closed ? 1 : 0) - this.lever[0]) * Math.min(1, dt * 10);
    this.lever[1] += ((this.values.closed2 ? 1 : 0) - this.lever[1]) * Math.min(1, dt * 10);
    super.update(dt);
    this.phases[0] += flowSpeed(this.i1(), this.u) * dt;
    this.phases[1] += flowSpeed(this.i2(), this.u) * dt;
  }
  draw(fc: FigureCanvas) {
    this.u = fc.u;
    const u = fc.u;
    const { x0, y0, x1, y1 } = frame(fc, 2.2);
    const midY = (y0 + y1) / 2;
    const I = this.current();
    const sA: Pt = [x0 + (x1 - x0) * 0.16, y0];
    const sB: Pt = [x0 + (x1 - x0) * 0.32, y0];
    const b1 = this.R2 ? x0 + (x1 - x0) * 0.6 : x1;
    const b2 = x1;
    if (I > 0) {
      fc.potentialPath([[x0, y0], [b2, y0]], POS, POS, fc.stroke * 2.4, 0.3);
      fc.potentialPath([[x0, y1], [b2, y1]], NEG, NEG, fc.stroke * 2.4, 0.3);
      fc.flowChevrons([[x0, midY], [x0, y0], [b1, y0]], this.phase, FLOW);
      fc.flowChevrons([[b1, y1], [x0, y1], [x0, midY]], this.phase, FLOW);
    }
    fc.line(x0, y0, sA[0], y0);
    switchAt(fc, sA, sB, this.lever[0], this.R2 ? 'S1' : this.values.closed ? 'cerrado' : 'abierto');
    fc.line(sB[0], y0, b2, y0);
    fc.line(x0, y1, b2, y1);
    fc.line(x0, y1, x0, midY + u * 0.25);
    fc.line(x0, midY - u * 0.25, x0, y0);
    battery(fc, x0, midY, `${f(this.V)} V`);
    // rama 1 (foco 1)
    fc.line(b1, y0, b1, midY - u * 1.1);
    fc.line(b1, midY + u * 1.1, b1, y1);
    bulb(fc, b1, midY, (this.V * this.i1()) / 6);
    fc.text(`${f(this.R1)} Ω`, b1 - u * 1.5, midY + u * 0.3, 0.68, 'ink', 'right');
    if (this.i1() > 0) fc.flowChevrons([[b1, y0], [b1, y1]], this.phases[0], FLOW, 0.95, u * 1.8);
    if (this.R2) {
      // rama 2: S2 + foco 2
      const s2a: Pt = [b2, y0 + (y1 - y0) * 0.12];
      const s2b: Pt = [b2, y0 + (y1 - y0) * 0.34];
      fc.line(b2, y0, s2a[0], s2a[1]);
      switchAt(fc, s2a, s2b, this.lever[1], 'S2');
      const cy = y0 + (y1 - y0) * 0.66;
      fc.line(b2, s2b[1], b2, cy - u * 1.1);
      fc.line(b2, cy + u * 1.1, b2, y1);
      bulb(fc, b2, cy, (this.V * this.i2()) / 6);
      fc.text(`${f(this.R2)} Ω`, b2 - u * 1.5, cy + u * 0.3, 0.68, 'ink', 'right');
      if (this.i2() > 0) fc.flowChevrons([[b2, s2b[1]], [b2, y1]], this.phases[1], FLOW, 0.95, u * 1.8);
      fc.circle(b1, y0, u * 0.42, 'ink', 1, 'solid');
      fc.circle(b1, y1, u * 0.42, 'ink', 1, 'solid');
    }
  }
  readouts() {
    const out = [
      { label: 'S1', value: this.values.closed ? 'Cerrado' : 'Abierto' },
      { label: 'I1', value: `${f(this.i1(), 3)} A` },
    ];
    if (this.R2) out.push({ label: 'S2', value: this.values.closed2 ? 'Cerrado' : 'Abierto' }, { label: 'I2', value: `${f(this.i2(), 3)} A` });
    out.push({ label: 'I total', value: `${f(this.current(), 3)} A` });
    return out;
  }
}

// =====================================================================================
// 5. RC con conmutador carga / descarga
// =====================================================================================
class RCCircuit extends CircuitSim {
  controls: SimControl[] = [
    { id: 'charging', kind: 'toggle', label: 'Cargar / Descargar', icon: 'charge' },
    { id: 'reset', kind: 'button', label: 'Reiniciar', icon: 'reset' },
  ];
  vc = 0;
  private hist: number[] = [];
  private speed: number;
  private lever = 1;
  constructor(private V: number, private R: number, private C: number, charging: boolean) {
    super({ charging });
    this.vc = charging ? 0 : V;
    this.lever = charging ? 1 : 0;
    this.speed = (5 * this.tau) / 6; // 5τ ≈ 6 s en pantalla
  }
  get tau() {
    return this.R * this.C;
  }
  current() {
    return ((this.values.charging ? this.V : 0) - this.vc) / this.R;
  }
  onControl(id: string, value?: number | boolean) {
    if (id === 'reset') {
      this.vc = this.values.charging ? 0 : this.V;
      this.hist = [];
      return;
    }
    super.onControl(id, value);
    this.hist = [];
  }
  update(dt: number) {
    const sdt = dt * this.speed;
    const target = this.values.charging ? this.V : 0;
    this.vc = target + (this.vc - target) * Math.exp(-sdt / this.tau);
    this.hist.push(this.vc);
    if (this.hist.length > 180) this.hist.shift();
    this.lever += ((this.values.charging ? 1 : 0) - this.lever) * Math.min(1, dt * 8);
    const rel = Math.abs(this.current()) / (this.V / this.R);
    this.phase += this.u * 2.4 * clamp(rel, 0, 1) * dt;
  }
  draw(fc: FigureCanvas) {
    this.u = fc.u;
    const u = fc.u;
    const cw = fc.w * 0.58;
    const x0 = u * 2;
    const y0 = u * 2.4;
    const x1 = cw - u * 1.2;
    const y1 = fc.h - u * 2;
    const midY = (y0 + y1) / 2;
    const pivot: Pt = [x0 + (x1 - x0) * 0.34, y0];
    const contactA: Pt = [x0 + (x1 - x0) * 0.14, y0]; // hacia la batería (carga)
    const contactB: Pt = [pivot[0] - u * 1.4, y0 + u * 2]; // puente (descarga)
    const plateY1 = midY - u * 0.3;
    const plateY2 = midY + u * 0.3;
    const charging = !!this.values.charging;
    const rel = Math.abs(this.current()) / (this.V / this.R);

    if (charging) {
      if (rel > 0.01) {
        fc.potentialPath([[x0, y0], [x1, y0], [x1, plateY1]], POS, POS, fc.stroke * 2.2, 0.28);
        fc.flowChevrons([[x0, midY], [x0, y0], [x1, y0], [x1, plateY1]], this.phase, FLOW);
        fc.flowChevrons([[x1, plateY2], [x1, y1], [x0, y1], [x0, midY]], this.phase, FLOW);
      }
    } else if (rel > 0.01) {
      // descarga: la corriente sale de la placa + y vuelve por el puente (sentido opuesto)
      fc.flowChevrons([[x1, plateY1], [x1, y0], [pivot[0], y0], contactB, [contactB[0], y1], [x1, y1], [x1, plateY2]], this.phase, FLOW);
    }
    fc.line(x0, y0, contactA[0], y0);
    fc.circle(contactA[0], contactA[1], u * 0.4, 'ink', 1, 'solid');
    fc.circle(contactB[0], contactB[1], u * 0.4, 'ink', 1, 'solid');
    fc.circle(pivot[0], pivot[1], u * 0.4, 'ink', 1, 'solid');
    const k = clamp(this.lever, 0, 1);
    const tip: Pt = [contactB[0] + (contactA[0] - contactB[0]) * k, contactB[1] + (contactA[1] - contactB[1]) * k];
    fc.line(pivot[0], pivot[1], tip[0], tip[1], 'ink', 1.3);
    fc.text('carga', contactA[0], y0 - u * 0.7, 0.6, 'ink', 'center');
    fc.text('descarga', contactB[0] - u * 0.5, contactB[1] + u * 0.2, 0.6, 'ink', 'right');
    fc.line(contactB[0], contactB[1], contactB[0], y1, 'ink', 0.9);
    const ra: Pt = [pivot[0] + u * 1.2, y0];
    const rb: Pt = [x1 - u * 1.2, y0];
    fc.line(pivot[0], y0, ra[0], y0);
    resistor(fc, ra, rb, `R = ${f(this.R)} Ω`, false);
    fc.line(rb[0], y0, x1, y0);
    // condensador: placa superior + (roja), inferior − (azul)
    fc.line(x1, y0, x1, plateY1);
    fc.line(x1 - u * 1.4, plateY1, x1 + u * 1.4, plateY1, 'ink', 1.5);
    fc.line(x1 - u * 1.4, plateY2, x1 + u * 1.4, plateY2, 'ink', 1.5);
    fc.line(x1, plateY2, x1, y1);
    const q = clamp(this.vc / this.V, 0, 1);
    fc.lightPath([[x1 - u * 1.4, plateY1], [x1 + u * 1.4, plateY1]], POS, fc.stroke * 2.2, 0.2 + q * 0.8);
    fc.lightPath([[x1 - u * 1.4, plateY2], [x1 + u * 1.4, plateY2]], NEG, fc.stroke * 2.2, 0.2 + q * 0.8);
    const marks = Math.round(q * 5);
    for (let i = 0; i < marks; i++) {
      fc.lightText('+', x1 - u * 1.1 + i * u * 0.55, plateY1 - u * 0.6, 0.6, POS);
      fc.lightText('−', x1 - u * 1.1 + i * u * 0.55, plateY2 + u * 0.6, 0.6, NEG);
    }
    fc.text(`C = ${f(this.C * 1e6)} μF`, x1 + u * 1.7, midY + u * 0.3, 0.68, 'pencil');
    fc.line(x1, y1, x0, y1);
    fc.line(x0, y1, x0, midY + u * 0.25);
    fc.line(x0, midY - u * 0.25, x0, y0);
    battery(fc, x0, midY, `${f(this.V)} V`);

    // gráfica Vc(t)
    const gx = cw + u * 0.6;
    const gw = fc.w - gx - u * 0.6;
    fc.line(gx, y1, gx + gw, y1, 'ink', 0.7);
    fc.line(gx, y1, gx, y0, 'ink', 0.7);
    fc.text('Vc', gx + u * 0.3, y0 + u * 0.6, 0.7, 'ink');
    fc.text('t', gx + gw, y1 + u * 1, 0.7, 'ink', 'right');
    fc.line(gx, y0 + u, gx + gw, y0 + u, 'ink', 0.4, true);
    fc.text(`${f(this.V)} V`, gx + gw, y0 + u * 0.7, 0.6, 'ink', 'right');
    const pts = this.hist.map((v, i) => [gx + (i / 180) * gw, y1 - (v / this.V) * (y1 - y0 - u)] as Pt);
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
// 6. Compuertas lógicas: una sola o una RED de varias compuertas
// =====================================================================================
type Gate = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';
const GATES: Gate[] = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR'];
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

interface NetGate {
  id: string;
  type: Gate;
  inputs: string[];
}

/** Dibuja el símbolo de una compuerta centrado en (cx, cy); devuelve sus pines. */
function drawGate(fc: FigureCanvas, type: Gate, cx: number, cy: number, s: number): { ins: Pt[]; out: Pt } {
  const u = fc.u;
  const gx = cx - s / 2;
  const pts: Pt[] = [];
  const one = type === 'NOT';
  if (type === 'AND' || type === 'NAND') {
    pts.push([gx, cy - s / 2], [gx + s * 0.5, cy - s / 2]);
    for (let i = 0; i <= 12; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 12;
      pts.push([gx + s * 0.5 + Math.cos(a) * s * 0.5, cy + Math.sin(a) * s * 0.5]);
    }
    pts.push([gx, cy + s / 2], [gx, cy - s / 2]);
  } else if (one) {
    pts.push([gx, cy - s * 0.4], [gx + s * 0.75, cy], [gx, cy + s * 0.4], [gx, cy - s * 0.4]);
  } else {
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push([gx + t * s, cy - s / 2 + t * t * s * 0.5]);
    }
    for (let i = 12; i >= 0; i--) {
      const t = i / 12;
      pts.push([gx + t * s, cy + s / 2 - t * t * s * 0.5]);
    }
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI / 2 - (Math.PI * i) / 8;
      pts.push([gx + Math.cos(a) * s * 0.18, cy + Math.sin(a) * s * 0.5]);
    }
    if (type === 'XOR') {
      const bow: Pt[] = [];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI / 2 - (Math.PI * i) / 8;
        bow.push([gx - s * 0.12 + Math.cos(a) * s * 0.18, cy + Math.sin(a) * s * 0.5]);
      }
      fc.path(bow, 'ink', 1, true);
    }
  }
  fc.path(pts, 'ink', 1.2);
  const bubble = type === 'NOT' || type === 'NAND' || type === 'NOR';
  const outX = gx + s * (one ? 0.75 : 1);
  if (bubble) fc.circle(outX + s * 0.08, cy, s * 0.16, 'ink');
  fc.fitText(type, cx - s * (one ? 0.18 : 0.05), cy, s * 0.6, Math.min(0.75, s / (u * 3.2)), 'pencil');
  const curved = type === 'OR' || type === 'NOR' || type === 'XOR';
  const inX = gx + (curved ? s * 0.12 : 0);
  return {
    ins: one ? [[gx, cy]] : [[inX, cy - s * 0.25], [inX, cy + s * 0.25]],
    out: [outX + (bubble ? s * 0.16 : 0), cy],
  };
}

class LogicNetwork implements FigureRuntime {
  animated = true;
  controls: SimControl[];
  values: Record<string, number | boolean>;
  constructor(private inputs: string[], private gates: NetGate[], private outputId: string, initial: number[]) {
    this.values = Object.fromEntries(inputs.map((n, i) => [n, !!initial[i]]));
    this.controls = inputs.map((n) => ({ id: n, kind: 'toggle' as const, label: `Entrada ${n}`, icon: 'bolt' as const }));
  }
  onControl(id: string) {
    this.values[id] = !this.values[id];
  }
  update() {}
  /** Evalúa la red para una combinación de entradas. */
  evaluate(vals: Record<string, number>): Record<string, number> {
    const out: Record<string, number> = { ...vals };
    for (const g of this.gates) out[g.id] = evalGate(g.type, out[g.inputs[0]] ?? 0, out[g.inputs[1]] ?? 0);
    return out;
  }
  private current() {
    return this.evaluate(Object.fromEntries(this.inputs.map((n) => [n, this.values[n] ? 1 : 0])));
  }
  readouts() {
    const v = this.current();
    const gates = this.gates.length > 1 ? this.gates.map((g) => ({ label: g.id, value: String(v[g.id]) })) : [];
    return [...gates, { label: 'S', value: String(v[this.outputId]) }];
  }
  draw(fc: FigureCanvas) {
    const u = fc.u;
    const single = this.gates.length === 1;
    const netW = fc.w * (single ? 0.55 : 0.64);
    const vals = this.current();
    // columnas por profundidad
    const depth: Record<string, number> = Object.fromEntries(this.inputs.map((n) => [n, 0]));
    for (const g of this.gates) depth[g.id] = 1 + Math.max(...g.inputs.map((i) => depth[i] ?? 0));
    const maxD = Math.max(...this.gates.map((g) => depth[g.id]));
    const left = u * 4.6;
    const colW = (netW - left - u * 3.2) / maxD;
    const perCol = Math.max(...Array.from({ length: maxD }, (_, d) => this.gates.filter((g) => depth[g.id] === d + 1).length));
    const s = Math.min(colW * 0.48, (fc.h - u * 2) / (perCol * 1.8), u * 5);
    const pos: Record<string, Pt> = {};
    const outPin: Record<string, Pt> = {};
    this.inputs.forEach((n, i) => {
      const y = ((i + 1) * fc.h) / (this.inputs.length + 1);
      pos[n] = [u * 2.2, y];
      outPin[n] = [u * 2.2 + u * 0.7, y];
    });
    for (let d = 1; d <= maxD; d++) {
      const col = this.gates.filter((g) => depth[g.id] === d);
      col.forEach((g, i) => {
        const avg = g.inputs.reduce((sm, id) => sm + (pos[id]?.[1] ?? fc.h / 2), 0) / g.inputs.length;
        const slot = ((i + 1) * fc.h) / (col.length + 1);
        pos[g.id] = [left + colW * (d - 0.5), col.length === 1 ? avg : (avg * 0.4 + slot * 0.6)];
      });
    }
    // compuertas y cables (cable encendido = 1); cada entrada externa baja por su propio "bus"
    const busX: Record<string, number> = {};
    this.inputs.forEach((n, i) => (busX[n] = u * 3.4 + i * u * 0.45));
    for (const g of this.gates) {
      const [cx, cy] = pos[g.id];
      const pins = drawGate(fc, g.type, cx, cy, s);
      outPin[g.id] = pins.out;
      g.inputs.forEach((src, k) => {
        const from = outPin[src];
        const to = pins.ins[Math.min(k, pins.ins.length - 1)];
        const isInput = this.inputs.includes(src);
        const mx = isInput ? busX[src] : from[0] + (to[0] - from[0]) * 0.5;
        const wire: Pt[] = [from, [mx, from[1]], [mx, to[1]], to];
        fc.path(wire, 'ink', 0.9);
        if (vals[src]) fc.lightPath(wire, FLOW, fc.stroke * 1.4, 0.85);
        if (isInput) fc.circle(mx, from[1], u * 0.3, 'ink', 1, 'solid');
      });
      const v = vals[g.id];
      fc.lightText(String(v), pins.out[0] + u * 0.6, pins.out[1] - u * 0.75, 0.75, v ? ON : '#64748b');
      fc.text(g.id, cx, cy + s * 0.5 + u * 0.9, 0.6, 'ink', 'center');
    }
    this.inputs.forEach((n) => {
      const [x, y] = pos[n];
      const on = !!this.values[n];
      fc.text(n, x - u * 1.3, y + u * 0.3, 0.85, 'ink', 'center');
      fc.circle(x, y, u * 0.7, 'ink', 1, on ? 'solid' : undefined);
      fc.lightText(on ? '1' : '0', x - u * 1.3, y - u * 1.1, 0.7, on ? ON : '#64748b');
    });
    // LED de salida
    const o = outPin[this.outputId];
    const ledX = netW - u * 1.3;
    fc.line(o[0], o[1], ledX - u, o[1]);
    if (vals[this.outputId]) fc.lightPath([o, [ledX - u, o[1]]], FLOW, fc.stroke * 1.4, 0.85);
    fc.circle(ledX, o[1], u * 1.7, 'ink');
    fc.text(`S = ${vals[this.outputId]}`, ledX, o[1] + u * 2.3, 0.8, 'ink', 'center');
    if (vals[this.outputId]) fc.glow(ledX, o[1], u * 3.5, ON, 0.9);

    // tabla de verdad (todas las combinaciones) con la fila actual resaltada
    const tx = netW + u * 1.2;
    const cols = [...this.inputs, 'S'];
    const nRows = 1 << this.inputs.length;
    const colW2 = (fc.w - tx - u * 0.5) / cols.length;
    const rowH = Math.min(u * 1.8, (fc.h - u * 1.2) / (nRows + 1));
    const ty = u * 0.6;
    const size = clamp(rowH / (u * 1.8), 0.55, 1) * 0.82;
    cols.forEach((c, i) => fc.text(c, tx + colW2 * (i + 0.5), ty + rowH * 0.72, size, 'pencil', 'center'));
    fc.line(tx, ty + rowH, tx + colW2 * cols.length, ty + rowH, 'ink', 0.7);
    fc.line(tx + colW2 * (cols.length - 1), ty, tx + colW2 * (cols.length - 1), ty + rowH * (nRows + 1), 'ink', 0.7);
    for (let r = 0; r < nRows; r++) {
      const bits = this.inputs.map((_, i) => (r >> (this.inputs.length - 1 - i)) & 1);
      const res = this.evaluate(Object.fromEntries(this.inputs.map((n, i) => [n, bits[i]])))[this.outputId];
      const y = ty + rowH * (r + 1);
      const current = bits.every((b, i) => b === (this.values[this.inputs[i]] ? 1 : 0));
      if (current) fc.highlight(tx, y + rowH * 0.08, colW2 * cols.length, rowH * 0.86);
      [...bits, res].forEach((v, j) => fc.text(String(v), tx + colW2 * (j + 0.5), y + rowH * 0.72, size, 'ink', 'center'));
    }
  }
}

// =====================================================================================
// Planes
// =====================================================================================
const spec = (title: string, aspect: number, create: () => FigureRuntime, minWidthChars = 16): FigureSpec => ({ title, aspect, minWidthChars, create });

export function circuitPlan(exerciseType: string, d: Record<string, unknown>): SolutionPlan | null {
  const base = { graph: null, graphPrimary: false, kind: 'simulation' as const };
  const V = Math.max(0.1, num(d.voltage_v, 9));
  const list = (v: unknown, fb: number[]) => (Array.isArray(v) && v.length ? v.map((x) => Math.max(0.01, num(x, 100))) : fb);
  switch (exerciseType) {
    case 'single_loop': {
      const R = Math.max(0.01, num(d.resistance_ohms, 100));
      const r = Math.max(0, num(d.internal_resistance_ohms, 0));
      const I = V / (R + r);
      const lines: SolutionLine[] = r > 0
        ? [
            line('Ley de Ohm (malla)', `I = ε/(R + r) = ${f(V)}/(${f(R)} + ${f(r)}) = ${f(I, 3)} A`),
            line('Tensión en bornes', `V = ε - I·r = ${f(V - I * r)} V`),
            line('Potencias', `P(R) = I^2·R = ${f(I * I * R)} W   P(r) = ${f(I * I * r)} W`, true),
          ]
        : [line('Ley de Ohm', `I = V/R = ${f(V)}/${f(R)} = ${f(I, 3)} A`), line('Potencia', `P = V·I = ${f(V * I)} W`, true)];
      return {
        ...base,
        summary: r > 0 ? 'Malla con fuente real (resistencia interna)' : 'Circuito de malla simple (Ley de Ohm)',
        lines,
        figure: spec('Malla simple', 1.5, () => new SingleLoop(V, R, r, d.has_led !== false, String(d.led_color ?? 'yellow')), r > 0 ? 20 : 16),
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
        figure: spec('Serie', Rs.length > 3 ? 1.5 : 1.7, () => new Series(V, Rs), 20),
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
          line('Ramas (misma V)', Rs.map((r, i) => `I${i + 1} = ${f(V / r, 3)} A`).join('   ')),
          line('Corriente total', `I = ${Rs.map((_, i) => `I${i + 1}`).join(' + ')} = ${f(V / Req, 3)} A`, true),
        ],
        figure: spec('Paralelo', Rs.length >= 3 ? 1.9 : 1.6, () => new Parallel(V, Rs), Rs.length >= 3 ? 22 : 18),
      };
    }
    case 'interactive_switch': {
      const R = Math.max(0.01, num(d.load_resistance_ohms, 100));
      const R2 = d.second_load_ohms ? Math.max(0.01, num(d.second_load_ohms, 100)) : null;
      return {
        ...base,
        summary: R2 ? 'Dos interruptores y dos focos en paralelo' : 'Circuito con interruptor',
        lines: R2
          ? [
              line('Foco 1 (S1 cerrado)', `I1 = V/R1 = ${f(V / R, 3)} A`),
              line('Foco 2 (S1 y S2 cerrados)', `I2 = V/R2 = ${f(V / R2, 3)} A`),
              line('Total', `I = I1 + I2 = ${f(V / R + V / R2, 3)} A   (S1 abierto: I = 0)`, true),
            ]
          : [line('Cerrado', `I = V/R = ${f(V / R, 3)} A`), line('Abierto', 'I = 0 A (circuito abierto)', true)],
        figure: spec('Interruptor', R2 ? 1.6 : 1.45, () => new SwitchCircuit(V, R, d.initial_state === 'closed', R2, d.second_switch_state === 'closed'), R2 ? 20 : 16),
      };
    }
    case 'rc_circuit': {
      const R = Math.max(0.01, num(d.resistance_ohms, 1000));
      const C = Math.max(1e-9, num(d.capacitance_uf, 100) * 1e-6);
      const tau = R * C;
      const discharging = d.mode === 'discharging';
      return {
        ...base,
        summary: discharging ? 'Descarga de un condensador (RC)' : 'Carga de un condensador (RC)',
        lines: [
          line('Constante de tiempo', `τ = R·C = ${f(tau, 3)} s`),
          line(discharging ? 'Descarga' : 'Carga', discharging ? `Vc(t) = V·e^(-t/τ)   Q0 = C·V = ${f(C * V * 1e6)} μC` : `Vc(t) = V(1 - e^(-t/τ))   Qmax = C·V = ${f(C * V * 1e6)} μC`),
          line('Resultado', discharging ? `Tras un τ: Vc = ${f(V * Math.exp(-1))} V (37 %)` : `Al 99 %: t ≈ 5τ = ${f(5 * tau, 3)} s`, true),
        ],
        figure: spec('RC', 1.9, () => new RCCircuit(V, R, C, !discharging), 22),
      };
    }
    case 'logic_gates': {
      const network = (Array.isArray(d.network) ? d.network : []) as { id?: string; gate_type?: string; inputs?: string[] }[];
      if (network.length >= 2) {
        const inputs = (Array.isArray(d.input_names) && d.input_names.length ? d.input_names : ['A', 'B', 'C']).map(String);
        const gates: NetGate[] = network.map((g, i) => ({
          id: String(g.id ?? `G${i + 1}`),
          type: (GATES.includes(String(g.gate_type).toUpperCase() as Gate) ? String(g.gate_type).toUpperCase() : 'AND') as Gate,
          inputs: (g.inputs ?? []).map(String).slice(0, 2),
        }));
        const outputId = String(d.output_id ?? gates[gates.length - 1].id);
        const initial = Array.isArray(d.inputs) ? d.inputs.map((x) => (num(x, 0) ? 1 : 0)) : inputs.map(() => 0);
        const sym: Record<Gate, (a: string, b?: string) => string> = {
          AND: (a, b) => `${a}·${b}`, OR: (a, b) => `${a} + ${b}`, NOT: (a) => `${a}'`,
          NAND: (a, b) => `(${a}·${b})'`, NOR: (a, b) => `(${a} + ${b})'`, XOR: (a, b) => `${a} ⊕ ${b}`,
        };
        const expr: Record<string, string> = Object.fromEntries(inputs.map((n) => [n, n]));
        gates.forEach((g, i) => {
          const a = expr[g.inputs[0]] ?? g.inputs[0];
          const b = expr[g.inputs[1]] ?? g.inputs[1];
          const e = sym[g.type](a, b);
          expr[g.id] = i === gates.length - 1 || g.type === 'NOT' ? e : `(${e})`;
        });
        const net = new LogicNetwork(inputs, gates, outputId, initial);
        const res = net.evaluate(Object.fromEntries(inputs.map((n, i) => [n, initial[i] ?? 0])));
        return {
          ...base,
          summary: `Red de ${gates.length} compuertas lógicas`,
          lines: [
            line('Expresión', `S = ${expr[outputId]}`),
            line('Resultado', `Con ${inputs.map((n, i) => `${n} = ${initial[i] ?? 0}`).join(', ')}: S = ${res[outputId]}`, true),
          ],
          figure: spec('Red de compuertas', 2.1, () => net, 26),
        };
      }
      const gate = String(d.gate_type ?? 'AND').toUpperCase() as Gate;
      const g = GATES.includes(gate) ? gate : 'AND';
      const inputs = Array.isArray(d.inputs) ? d.inputs.map((x) => (num(x, 0) ? 1 : 0)) : [1, 0];
      const names = g === 'NOT' ? ['A'] : ['A', 'B'];
      const expr: Record<Gate, string> = { AND: 'S = A·B', OR: 'S = A + B', NOT: "S = A'", NAND: "S = (A·B)'", NOR: "S = (A + B)'", XOR: 'S = A ⊕ B' };
      return {
        ...base,
        summary: `Compuerta lógica ${g}`,
        lines: [
          line('Expresión', expr[g]),
          line('Resultado', `Con A = ${inputs[0] ?? 0}${g === 'NOT' ? '' : `, B = ${inputs[1] ?? 0}`}: S = ${evalGate(g, inputs[0] ?? 0, inputs[1] ?? 0)}`, true),
        ],
        figure: spec('Compuerta', 1.8, () => new LogicNetwork(names, [{ id: 'G1', type: g, inputs: names }], 'G1', inputs), 18),
      };
    }
  }
  return null;
}
