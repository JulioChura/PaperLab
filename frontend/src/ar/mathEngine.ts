/**
 * Motor matemático determinístico del solver AR.
 * La IA solo transcribe la ecuación; los pasos, raíces y la gráfica se calculan aquí,
 * así nunca se dibuja sobre la hoja un número inventado por el modelo.
 */

import type { FigureSpec } from '../sims/types';

export type Fn = (x: number) => number;

// ------------------------------------------------------------------
// Tokens de escritura (los dibuja handwriting.ts)
// ------------------------------------------------------------------
export type MathToken =
  | { k: 't'; s: string }
  | { k: 'sup'; s: string }
  | { k: 'sub'; s: string }
  | { k: 'frac'; num: MathToken[]; den: MathToken[] }
  | { k: 'sqrt'; body: MathToken[] }
  | { k: 'delta' }
  | { k: 'empty' }
  | { k: 'approx' }
  | { k: 'gap'; em: number };

export interface SolutionLine {
  title: string;
  tokens: MathToken[];
  answer?: boolean;
}

export interface GraphPoint {
  x: number;
  y: number;
  label: string;
  kind: 'root' | 'vertex' | 'intercept';
}

export interface GraphSpec {
  fn: Fn;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  points: GraphPoint[];
  label: MathToken[];
  /** Intervalos del eje x a sombrear (solución de una inecuación). */
  shade?: [number, number][];
  shadeClosed?: boolean;
}

export interface SolutionPlan {
  kind: 'quadratic' | 'linear' | 'function' | 'generic' | 'simulation';
  lines: SolutionLine[];
  graph: GraphSpec | null;
  /** Prioridad de la gráfica en el layout (en function_graph es el contenido principal). */
  graphPrimary: boolean;
  summary: string;
  /** Simulación animada/interactiva dibujada sobre la hoja (física, circuitos, debugger…). */
  figure?: FigureSpec;
}

const t = (s: string): MathToken => ({ k: 't', s });
const sup = (s: string): MathToken => ({ k: 'sup', s });
const sub = (s: string): MathToken => ({ k: 'sub', s });
const gap = (em = 1): MathToken => ({ k: 'gap', em });
const frac = (num: MathToken[], den: MathToken[]): MathToken => ({ k: 'frac', num, den });

// ------------------------------------------------------------------
// Formato numérico
// ------------------------------------------------------------------
const MINUS = '–';
const EPS = 1e-9;

const snap = (v: number) => (Math.abs(v - Math.round(v)) < 1e-7 ? Math.round(v) : v);
const isInt = (v: number) => Math.abs(v - Math.round(v)) < 1e-7;

export function fmt(v: number, decimals = 2): string {
  const s = snap(v);
  if (Object.is(s, -0) || Math.abs(s) < EPS) return '0';
  const str = isInt(s) ? String(Math.round(s)) : String(parseFloat(s.toFixed(decimals)));
  return str.replace('-', MINUS);
}

const paren = (v: number) => `(${fmt(v)})`;

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/** Número como tokens: entero, fracción exacta p/q (si los datos son enteros) o decimal. */
function numberTokens(p: number, q: number): MathToken[] {
  if (isInt(p) && isInt(q) && Math.abs(q) > EPS) {
    let P = Math.round(p);
    let Q = Math.round(q);
    if (Q < 0) {
      P = -P;
      Q = -Q;
    }
    const g = gcd(P, Q);
    P /= g;
    Q /= g;
    if (Q === 1) return [t(fmt(P))];
    const sign = P < 0 ? MINUS : '';
    return [t(sign), frac([t(String(Math.abs(P)))], [t(String(Q))])];
  }
  return [t(fmt(p / q))];
}

// ------------------------------------------------------------------
// Normalización (LaTeX / Unicode / texto del modelo → ASCII evaluable)
// ------------------------------------------------------------------
function replaceLatexFrac(src: string): string {
  let s = src;
  for (let guard = 0; guard < 20; guard++) {
    const idx = s.indexOf('\\frac');
    if (idx < 0) break;
    let i = idx + 5;
    const groups: string[] = [];
    while (groups.length < 2 && i < s.length) {
      while (s[i] === ' ') i++;
      if (s[i] !== '{') break;
      let depth = 0;
      const start = i;
      for (; i < s.length; i++) {
        if (s[i] === '{') depth++;
        else if (s[i] === '}') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
      }
      groups.push(s.slice(start + 1, i - 1));
    }
    if (groups.length < 2) break;
    s = `${s.slice(0, idx)}((${groups[0]})/(${groups[1]}))${s.slice(i)}`;
  }
  return s;
}

export function normalizeExpression(src: string): string {
  let s = src.replace(/\$/g, '');
  s = s.replace(/\\left|\\right/g, '').replace(/\\[,;:! ]/g, ' ');
  s = replaceLatexFrac(s);
  s = s
    .replace(/\\(cdot|times)/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\pi/g, 'pi')
    .replace(/\\(sin|cos|tan|ln|log|sqrt|exp)/g, '$1');
  s = s.replace(/[{[]/g, '(').replace(/[}\]]/g, ')');
  s = s
    .replace(/[−–—]/g, '-')
    .replace(/[×·∙]/g, '*')
    .replace(/÷/g, '/')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/√/g, 'sqrt')
    .replace(/π/g, 'pi')
    .replace(/\*\*/g, '^');
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  return s.toLowerCase();
}

// ------------------------------------------------------------------
// Parser de expresiones en x (descenso recursivo, multiplicación implícita)
// ------------------------------------------------------------------
const FUNCS: Record<string, Fn> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  sen: Math.sin,
};
const CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };
const NAMES = ['sqrt', 'sin', 'sen', 'cos', 'tan', 'abs', 'exp', 'ln', 'log', 'pi', 'e', 'x'];

type Tok = { type: 'num'; v: number } | { type: 'x' } | { type: 'const'; v: number } | { type: 'fn'; f: Fn } | { type: 'op'; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let absDepth = 0;
  const endsOperand = () => {
    const last = out[out.length - 1];
    return !!last && (last.type === 'num' || last.type === 'x' || last.type === 'const' || (last.type === 'op' && last.v === ')'));
  };
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
    if (num) {
      out.push({ type: 'num', v: parseFloat(num[1]) });
      i += num[1].length;
      continue;
    }
    if (/[a-z]/.test(ch)) {
      const name = NAMES.find((nm) => src.startsWith(nm, i));
      if (!name) throw new Error(`Símbolo no soportado: "${src.slice(i, i + 4)}"`);
      if (name === 'x') out.push({ type: 'x' });
      else if (name in CONSTS) out.push({ type: 'const', v: CONSTS[name] });
      else out.push({ type: 'fn', f: FUNCS[name] });
      i += name.length;
      continue;
    }
    if (ch === '|') {
      if (absDepth > 0 && endsOperand()) {
        out.push({ type: 'op', v: ')' });
        absDepth--;
      } else {
        out.push({ type: 'fn', f: Math.abs }, { type: 'op', v: '(' });
        absDepth++;
      }
      i++;
      continue;
    }
    if ('+-*/^()'.includes(ch)) {
      out.push({ type: 'op', v: ch });
      i++;
      continue;
    }
    throw new Error(`Carácter no soportado: "${ch}"`);
  }
  // Multiplicación implícita: 2x, x(x+1), (x+1)(x-1), 3sin(x), 2pi
  const withMul: Tok[] = [];
  for (const tok of out) {
    const prev = withMul[withMul.length - 1];
    const prevOperand =
      prev && (prev.type === 'num' || prev.type === 'x' || prev.type === 'const' || (prev.type === 'op' && prev.v === ')'));
    const curStarts =
      tok.type === 'num' || tok.type === 'x' || tok.type === 'const' || tok.type === 'fn' || (tok.type === 'op' && tok.v === '(');
    if (prevOperand && curStarts) withMul.push({ type: 'op', v: '*' });
    withMul.push(tok);
  }
  return withMul;
}

export function compileExpression(src: string): Fn {
  const toks = tokenize(src);
  let pos = 0;
  const peek = () => toks[pos];
  const isOp = (v: string) => {
    const p = peek();
    return !!p && p.type === 'op' && p.v === v;
  };
  const expect = (v: string) => {
    if (!isOp(v)) throw new Error(`Se esperaba "${v}"`);
    pos++;
  };

  const parseExpr = (): Fn => {
    let left = parseTerm();
    while (isOp('+') || isOp('-')) {
      const op = (toks[pos++] as { v: string }).v;
      const l = left;
      const r = parseTerm();
      left = op === '+' ? (x) => l(x) + r(x) : (x) => l(x) - r(x);
    }
    return left;
  };
  const parseTerm = (): Fn => {
    let left = parseUnary();
    while (isOp('*') || isOp('/')) {
      const op = (toks[pos++] as { v: string }).v;
      const l = left;
      const r = parseUnary();
      left = op === '*' ? (x) => l(x) * r(x) : (x) => l(x) / r(x);
    }
    return left;
  };
  const parseUnary = (): Fn => {
    if (isOp('-')) {
      pos++;
      const inner = parseUnary();
      return (x) => -inner(x);
    }
    if (isOp('+')) {
      pos++;
      return parseUnary();
    }
    return parsePower();
  };
  const parsePower = (): Fn => {
    const base = parsePrimary();
    if (isOp('^')) {
      pos++;
      const exp = parseUnary();
      return (x) => Math.pow(base(x), exp(x));
    }
    return base;
  };
  const parsePrimary = (): Fn => {
    const tok = peek();
    if (!tok) throw new Error('Expresión incompleta');
    pos++;
    if (tok.type === 'num') {
      const v = tok.v;
      return () => v;
    }
    if (tok.type === 'const') {
      const v = tok.v;
      return () => v;
    }
    if (tok.type === 'x') return (x) => x;
    if (tok.type === 'fn') {
      const f = tok.f;
      if (isOp('(')) {
        pos++;
        const arg = parseExpr();
        expect(')');
        return (x) => f(arg(x));
      }
      const arg = parsePower();
      return (x) => f(arg(x));
    }
    if (tok.type === 'op' && tok.v === '(') {
      const inner = parseExpr();
      expect(')');
      return inner;
    }
    throw new Error('Expresión inválida');
  };

  const fn = parseExpr();
  if (pos !== toks.length) throw new Error('Sobran símbolos en la expresión');
  return fn;
}

export interface Polynomial {
  a: number;
  b: number;
  c: number;
}

/** Recupera a, b, c si g(x) es un polinomio de grado ≤ 2 (verificado en varios puntos). */
export function polynomialFromFn(g: Fn): Polynomial | null {
  const c = g(0);
  const p = g(1);
  const m = g(-1);
  if (![c, p, m].every(Number.isFinite)) return null;
  const a = (p + m) / 2 - c;
  const b = (p - m) / 2;
  for (const x of [2, -2.5, 3.7, -4.2, 0.3]) {
    const y = g(x);
    const yp = a * x * x + b * x + c;
    if (!Number.isFinite(y) || Math.abs(y - yp) > 1e-7 * Math.max(1, Math.abs(y))) return null;
  }
  return { a: snap(a), b: snap(b), c: snap(c) };
}

function splitEquation(src: string): { lhs: string; rhs: string } {
  const parts = src.split('=');
  if (parts.length === 2) return { lhs: parts[0], rhs: parts[1] };
  if (parts.length === 1) return { lhs: parts[0], rhs: '0' };
  // "f(x) = ... = 0" u otras cadenas: usamos los dos últimos miembros
  return { lhs: parts[parts.length - 2], rhs: parts[parts.length - 1] };
}

function polyTokens(p: Polynomial, variable = 'x'): MathToken[] {
  const terms: { coef: number; pow: number }[] = [
    { coef: p.a, pow: 2 },
    { coef: p.b, pow: 1 },
    { coef: p.c, pow: 0 },
  ].filter((term) => Math.abs(term.coef) > EPS);
  if (terms.length === 0) return [t('0')];
  const out: MathToken[] = [];
  terms.forEach((term, idx) => {
    const neg = term.coef < 0;
    const abs = Math.abs(term.coef);
    const sign = idx === 0 ? (neg ? MINUS : '') : neg ? ` ${MINUS} ` : ' + ';
    const coefStr = term.pow > 0 && Math.abs(abs - 1) < EPS ? '' : fmt(abs);
    if (term.pow === 2) out.push(t(`${sign}${coefStr}${variable}`), sup('2'));
    else if (term.pow === 1) out.push(t(`${sign}${coefStr}${variable}`));
    else out.push(t(`${sign}${coefStr}`));
  });
  return out;
}

// ------------------------------------------------------------------
// Rango de la gráfica
// ------------------------------------------------------------------
function graphWindow(fn: Fn, centerX: number, halfSpan: number, mustInclude: number[] = []) {
  const xMin = centerX - halfSpan;
  const xMax = centerX + halfSpan;
  const ys: number[] = [0, ...mustInclude];
  for (let i = 0; i <= 80; i++) {
    const y = fn(xMin + ((xMax - xMin) * i) / 80);
    if (Number.isFinite(y)) ys.push(y);
  }
  ys.sort((a, b) => a - b);
  // recorta valores extremos (asíntotas) usando percentiles
  let yMin = ys[Math.floor(ys.length * 0.04)];
  let yMax = ys[Math.ceil(ys.length * 0.96) - 1];
  for (const v of mustInclude) {
    yMin = Math.min(yMin, v);
    yMax = Math.max(yMax, v);
  }
  const span = Math.max(2, yMax - yMin);
  const limit = (xMax - xMin) * 2.2; // evita gráficas demasiado aplastadas
  if (span > limit) {
    const mid = (yMin + yMax) / 2;
    yMin = Math.min(mid - limit / 2, ...mustInclude);
    yMax = Math.max(mid + limit / 2, ...mustInclude);
  }
  const pad = Math.max(0.6, (yMax - yMin) * 0.12);
  return { xMin, xMax, yMin: yMin - pad, yMax: yMax + pad };
}

function numericRoots(fn: Fn, xMin: number, xMax: number): number[] {
  const roots: number[] = [];
  const steps = 400;
  let prevX = xMin;
  let prevY = fn(prevX);
  for (let i = 1; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    const y = fn(x);
    if (Number.isFinite(prevY) && Number.isFinite(y)) {
      if (Math.abs(y) < 1e-12) roots.push(x);
      else if (prevY * y < 0 && Math.abs(y - prevY) < 1e3) {
        let lo = prevX;
        let hi = x;
        for (let k = 0; k < 60; k++) {
          const mid = (lo + hi) / 2;
          if (fn(lo) * fn(mid) <= 0) hi = mid;
          else lo = mid;
        }
        roots.push((lo + hi) / 2);
      }
    }
    prevX = x;
    prevY = y;
  }
  return roots.filter((r, i) => i === 0 || Math.abs(r - roots[i - 1]) > 1e-4).slice(0, 6);
}

// ------------------------------------------------------------------
// Planes de solución
// ------------------------------------------------------------------
function quadraticPlan(p: Polynomial): SolutionPlan {
  const { a, b, c } = p;
  const D = snap(b * b - 4 * a * c);
  const f: Fn = (x) => a * x * x + b * x + c;
  const lines: SolutionLine[] = [];

  lines.push({
    title: 'Coeficientes',
    tokens: [t(`a = ${fmt(a)}`), gap(1.3), t(`b = ${fmt(b)}`), gap(1.3), t(`c = ${fmt(c)}`)],
  });
  lines.push({
    title: 'Discriminante',
    tokens: [
      { k: 'delta' }, t(' = b'), sup('2'), t(` ${MINUS} 4ac = ${paren(b)}`), sup('2'),
      t(` ${MINUS} 4${paren(a)}${paren(c)} = ${fmt(D)}`),
    ],
  });

  const roots: number[] = [];
  const allInts = [a, b, c].every(isInt);
  if (D > EPS) {
    const sqrtD = Math.sqrt(D);
    const perfect = isInt(sqrtD);
    const sqrtTok: MathToken[] = perfect ? [t(fmt(sqrtD))] : [{ k: 'sqrt', body: [t(fmt(D))] }];
    lines.push({
      title: 'Fórmula general',
      tokens: [
        t('x = '),
        frac([t(`${MINUS}b ± `), { k: 'sqrt', body: [{ k: 'delta' }] }], [t('2a')]),
        t(' = '),
        frac([t(`${fmt(-b)} ± `), ...sqrtTok], [t(fmt(2 * a))]),
      ],
    });
    const x1 = (-b + sqrtD) / (2 * a);
    const x2 = (-b - sqrtD) / (2 * a);
    roots.push(x1, x2);
    const rootTok = (num: number, sign: 1 | -1, idx: string): MathToken[] => {
      const head: MathToken[] = [t('x'), sub(idx)];
      if (perfect && allInts) return [...head, t(' = '), ...numberTokens(-b + sign * sqrtD, 2 * a)];
      return [...head, { k: 'approx' }, t(fmt(num))];
    };
    lines.push({ title: 'Raíces', tokens: [...rootTok(x1, 1, '1'), gap(1.6), ...rootTok(x2, -1, '2')] });
    if (perfect && allInts && isInt(x1) && isInt(x2)) {
      const factor = (r: number) => (r > 0 ? `(x ${MINUS} ${fmt(r)})` : `(x + ${fmt(-r)})`);
      const lead = Math.abs(a - 1) < EPS ? '' : fmt(a);
      lines.push({ title: 'Comprobación (aspa simple)', tokens: [t(`${lead}${factor(x1)}${factor(x2)} = 0`)] });
    }
    const sorted = [...roots].sort((u, v) => u - v);
    const csTokens: MathToken[] = [t('C.S. = {')];
    sorted.forEach((r, i) => {
      const exact = perfect && allInts;
      if (i > 0) csTokens.push(t('; '));
      if (exact) {
        const sign = Math.abs(r - x1) < 1e-9 ? 1 : -1;
        csTokens.push(...numberTokens(-b + sign * sqrtD, 2 * a));
      } else csTokens.push(t(fmt(r)));
    });
    csTokens.push(t('}'));
    lines.push({ title: 'Conjunto solución', tokens: csTokens, answer: true });
  } else if (Math.abs(D) <= EPS) {
    const x0 = -b / (2 * a);
    roots.push(x0);
    lines.push({
      title: 'Raíz doble',
      tokens: [t('x = '), frac([t(`${MINUS}b`)], [t('2a')]), t(' = '), ...numberTokens(-b, 2 * a)],
    });
    lines.push({ title: 'Conjunto solución', tokens: [t('C.S. = {'), ...numberTokens(-b, 2 * a), t('}')], answer: true });
  } else {
    lines.push({ title: 'Sin raíces reales', tokens: [{ k: 'delta' }, t(' < 0  →  no corta al eje x')] });
    lines.push({ title: 'Conjunto solución', tokens: [t('C.S. = '), { k: 'empty' }], answer: true });
  }

  const h = -b / (2 * a);
  const k = f(h);
  const spread = roots.length === 2 ? Math.abs(roots[0] - roots[1]) : 0;
  const halfSpan = Math.max(3, spread * 0.85 + 1.5);
  const win = graphWindow(f, h, halfSpan, [k, c]);
  const points: GraphPoint[] = roots.map((r) => ({ x: r, y: 0, label: fmt(r), kind: 'root' as const }));
  points.push({ x: h, y: k, label: `V(${fmt(h)}; ${fmt(k)})`, kind: 'vertex' });

  return {
    kind: 'quadratic',
    lines,
    graph: { fn: f, ...win, points, label: [t('y = '), ...polyTokens(p)] },
    graphPrimary: false,
    summary: `Ecuación cuadrática · Δ = ${fmt(D)}`,
  };
}

function linearPlan(p: Polynomial): SolutionPlan {
  const { b, c } = p;
  const f: Fn = (x) => b * x + c;
  const lines: SolutionLine[] = [];
  if (Math.abs(b) <= EPS) {
    const identity = Math.abs(c) <= EPS;
    lines.push({ title: identity ? 'Identidad' : 'Contradicción', tokens: [t(`0 = ${fmt(-c)}`)] });
    lines.push({
      title: 'Conjunto solución',
      tokens: identity ? [t('C.S. = R')] : [t('C.S. = '), { k: 'empty' }],
      answer: true,
    });
    return { kind: 'linear', lines, graph: null, graphPrimary: false, summary: 'Ecuación lineal' };
  }
  const coef = Math.abs(b - 1) < EPS ? '' : Math.abs(b + 1) < EPS ? MINUS : fmt(b);
  lines.push({ title: 'Transponemos términos', tokens: [t(`${coef}x = ${fmt(-c)}`)] });
  const exact = isInt(b) && isInt(c);
  const root = -c / b;
  if (Math.abs(b - 1) > EPS) {
    const tokens: MathToken[] = [t('x = '), frac([t(fmt(-c))], [t(fmt(b))])];
    if (!isInt(root)) tokens.push(exact ? gap(0.6) : t(''), { k: 'approx' }, t(fmt(root)));
    else tokens.push(t(` = ${fmt(root)}`));
    lines.push({ title: `Dividimos entre ${fmt(b)}`, tokens });
  }
  lines.push({
    title: 'Conjunto solución',
    tokens: [t('C.S. = {'), ...(exact ? numberTokens(-c, b) : [t(fmt(root))]), t('}')],
    answer: true,
  });
  const win = graphWindow(f, root, 4, [c]);
  return {
    kind: 'linear',
    lines,
    graph: {
      fn: f,
      ...win,
      points: [{ x: root, y: 0, label: fmt(root), kind: 'root' }],
      label: [t('y = '), ...polyTokens(p)],
    },
    graphPrimary: false,
    summary: 'Ecuación lineal',
  };
}

export function plainTextTokens(s: string): MathToken[] {
  // "x^2" → superíndice, "√(…)" → raíz dibujada, "Δ" → triángulo dibujado, "≈" → símbolo a mano
  const clean = s.replace(/\$/g, '').replace(/\\[a-z]+/gi, '').replace(/[{}]/g, '').replace(/-/g, MINUS);
  const parse = (str: string): MathToken[] => {
    const out: MathToken[] = [];
    let buf = '';
    const flush = () => {
      if (buf) out.push(t(buf));
      buf = '';
    };
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === '√' && str[i + 1] === '(') {
        let depth = 0;
        let j = i + 1;
        for (; j < str.length; j++) {
          if (str[j] === '(') depth++;
          else if (str[j] === ')' && --depth === 0) break;
        }
        flush();
        out.push({ k: 'sqrt', body: parse(str.slice(i + 2, j)) });
        i = j;
      } else if (ch === 'Δ') {
        flush();
        out.push({ k: 'delta' });
      } else if (ch === '≈') {
        flush();
        out.push({ k: 'approx' });
      } else if (ch === '^') {
        const m = /^\^(\(([^)]*)\)|[0-9a-z+–]+)/i.exec(str.slice(i));
        if (m) {
          flush();
          out.push(sup(m[2] ?? m[1]));
          i += m[0].length - 1;
        } else buf += ch;
      } else buf += ch;
    }
    flush();
    return out;
  };
  return parse(clean);
}

// ------------------------------------------------------------------
// Inecuaciones (lineales y cuadráticas)
// ------------------------------------------------------------------
type RelOp = '<' | '<=' | '>' | '>=';
const REL_SYMBOL: Record<RelOp, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥' };
const flipOp = (op: RelOp): RelOp => ({ '<': '>', '<=': '>=', '>': '<', '>=': '<=' } as const)[op];

function splitInequality(src: string): { lhs: string; rhs: string; op: RelOp } | null {
  const s = src.replace(/≤|=</g, '<=').replace(/≥|=>/g, '>=');
  const m = /(<=|>=|<|>)/.exec(s);
  if (!m) return null;
  return { lhs: s.slice(0, m.index), rhs: s.slice(m.index + m[0].length), op: m[0] as RelOp };
}

const INF = '∞';
const interval = (a: number, b: number, closedA: boolean, closedB: boolean) =>
  `${Number.isFinite(a) && closedA ? '[' : '('}${Number.isFinite(a) ? fmt(a) : `${MINUS}${INF}`}; ${Number.isFinite(b) ? fmt(b) : `+${INF}`}${Number.isFinite(b) && closedB ? ']' : ')'}`;

function inequalityPlan(p: Polynomial, op: RelOp): SolutionPlan {
  const lines: SolutionLine[] = [];
  const closed = op === '<=' || op === '>=';
  const shade: [number, number][] = [];
  const g: Fn = (x) => p.a * x * x + p.b * x + p.c;
  lines.push({ title: 'Todo a un lado', tokens: [...polyTokens(p), t(` ${REL_SYMBOL[op]} 0`)] });
  const points: GraphPoint[] = [];
  let summary = 'Inecuación';

  if (Math.abs(p.a) > EPS) {
    summary = 'Inecuación cuadrática';
    const D = snap(p.b * p.b - 4 * p.a * p.c);
    const wantPositive = op === '>' || op === '>=';
    if (D > EPS) {
      const r1 = Math.min((-p.b - Math.sqrt(D)) / (2 * p.a), (-p.b + Math.sqrt(D)) / (2 * p.a));
      const r2 = Math.max((-p.b - Math.sqrt(D)) / (2 * p.a), (-p.b + Math.sqrt(D)) / (2 * p.a));
      lines.push({ title: 'Puntos críticos', tokens: [{ k: 'delta' }, t(` = ${fmt(D)}    x = ${fmt(r1)} ;  x = ${fmt(r2)}`)] });
      const outer = p.a > 0 ? '+' : MINUS;
      const inner = p.a > 0 ? MINUS : '+';
      lines.push({ title: 'Tabla de signos', tokens: [t(`(${MINUS}${INF}; ${fmt(r1)}): ${outer}    (${fmt(r1)}; ${fmt(r2)}): ${inner}    (${fmt(r2)}; +${INF}): ${outer}`)] });
      const insideWanted = (p.a > 0) !== wantPositive; // entre raíces es negativo si a > 0
      if (insideWanted) {
        shade.push([r1, r2]);
        lines.push({ title: 'Conjunto solución', tokens: [t(`C.S. = ${interval(r1, r2, closed, closed)}`)], answer: true });
      } else {
        shade.push([-Infinity, r1], [r2, Infinity]);
        lines.push({ title: 'Conjunto solución', tokens: [t(`C.S. = ${interval(-Infinity, r1, false, closed)} ∪ ${interval(r2, Infinity, closed, false)}`)], answer: true });
      }
      points.push({ x: r1, y: 0, label: fmt(r1), kind: 'root' }, { x: r2, y: 0, label: fmt(r2), kind: 'root' });
    } else {
      const sign = p.a > 0 ? '+' : MINUS;
      const r = -p.b / (2 * p.a);
      lines.push({ title: 'Discriminante', tokens: [{ k: 'delta' }, t(` = ${fmt(D)}  →  el polinomio siempre es ${sign === '+' ? 'positivo' : 'negativo'}${Math.abs(D) <= EPS ? ` (salvo en x = ${fmt(r)})` : ''}`)] });
      const always = (p.a > 0) === wantPositive;
      let cs: MathToken[];
      if (always) {
        cs = Math.abs(D) <= EPS && !closed ? [t(`C.S. = R ${MINUS} {${fmt(r)}}`)] : [t('C.S. = R')];
        shade.push([-Infinity, Infinity]);
      } else if (Math.abs(D) <= EPS && closed) {
        cs = [t(`C.S. = {${fmt(r)}}`)];
        shade.push([r, r]);
      } else cs = [t('C.S. = '), { k: 'empty' }];
      lines.push({ title: 'Conjunto solución', tokens: cs, answer: true });
    }
  } else if (Math.abs(p.b) > EPS) {
    summary = 'Inecuación lineal';
    const root = -p.c / p.b;
    const finalOp = p.b < 0 ? flipOp(op) : op;
    const coef = Math.abs(p.b - 1) < EPS ? '' : Math.abs(p.b + 1) < EPS ? MINUS : fmt(p.b);
    lines.push({ title: 'Transponemos', tokens: [t(`${coef}x ${REL_SYMBOL[op]} ${fmt(-p.c)}`)] });
    if (Math.abs(p.b - 1) > EPS) {
      lines.push({
        title: p.b < 0 ? 'Dividimos entre un negativo (se invierte el sentido)' : `Dividimos entre ${fmt(p.b)}`,
        tokens: [t(`x ${REL_SYMBOL[finalOp]} ${fmt(root)}`)],
      });
    }
    const right = finalOp === '>' || finalOp === '>=';
    const cl = finalOp === '<=' || finalOp === '>=';
    shade.push(right ? [root, Infinity] : [-Infinity, root]);
    lines.push({
      title: 'Conjunto solución',
      tokens: [t(`C.S. = ${right ? interval(root, Infinity, cl, false) : interval(-Infinity, root, false, cl)}`)],
      answer: true,
    });
    points.push({ x: root, y: 0, label: fmt(root), kind: 'root' });
  }

  const xs = points.map((q) => q.x);
  const center = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 : 0;
  const half = Math.max(3, xs.length === 2 ? Math.abs(xs[1] - xs[0]) * 0.9 + 1.5 : 4);
  const win = graphWindow(g, center, half, Math.abs(p.a) > EPS ? [g(-p.b / (2 * p.a)), p.c] : [p.c]);
  return {
    kind: 'generic',
    lines,
    graph: { fn: g, ...win, points, label: [t('y = '), ...polyTokens(p)], shade, shadeClosed: closed },
    graphPrimary: false,
    summary,
  };
}

export interface EquationSolverData {
  equation_plain?: string | null;
  equation_latex?: string;
  steps?: string[];
  solution_set?: string[];
}

export interface FunctionGraphData {
  function_expression?: string;
}

/** Construye el plan para un `equation_solver` devuelto por el backend. */
export function planFromEquation(data: EquationSolverData): SolutionPlan | null {
  const candidates = [data.equation_plain, data.equation_latex].filter((s): s is string => !!s && s.trim().length > 0);
  for (const raw of candidates) {
    try {
      const ineq = splitInequality(normalizeExpression(raw.replace(/\\(leq|le)/g, '<=').replace(/\\(geq|ge)/g, '>=').replace(/\\lt/g, '<').replace(/\\gt/g, '>')));
      if (ineq) {
        const G: Fn = (() => {
          const L = compileExpression(ineq.lhs);
          const R = compileExpression(ineq.rhs);
          return (x: number) => L(x) - R(x);
        })();
        const poly = polynomialFromFn(G);
        if (poly) return inequalityPlan(poly, ineq.op);
        continue;
      }
      const { lhs, rhs } = splitEquation(normalizeExpression(raw));
      const L = compileExpression(lhs);
      const R = compileExpression(rhs);
      const g: Fn = (x) => L(x) - R(x);
      const poly = polynomialFromFn(g);
      if (poly && Math.abs(poly.a) > EPS) return quadraticPlan(poly);
      if (poly) return linearPlan(poly);

      // No polinómica: raíces numéricas + gráfica
      const roots = numericRoots(g, -10, 10);
      const win = graphWindow(g, roots.length ? (roots[0] + roots[roots.length - 1]) / 2 : 0, 5, []);
      return {
        kind: 'generic',
        lines: [
          ...(data.steps ?? []).slice(0, 4).map((s, i) => ({ title: `Paso ${i + 1}`, tokens: plainTextTokens(s) })),
          {
            title: 'Conjunto solución',
            tokens: [t('C.S. = {'), t(roots.map((r) => fmt(r)).join('; ')), t('}')],
            answer: true,
          },
        ],
        graph: { fn: g, ...win, points: roots.map((r) => ({ x: r, y: 0, label: fmt(r), kind: 'root' as const })), label: [] },
        graphPrimary: false,
        summary: 'Solución numérica',
      };
    } catch (err) {
      console.warn('[PaperLab AR] No se pudo interpretar la ecuación:', raw, err);
    }
  }
  // Último recurso: pasos del modelo (sin gráfica)
  if (data.steps?.length) {
    return {
      kind: 'generic',
      lines: [
        ...data.steps.slice(0, 5).map((s, i) => ({ title: `Paso ${i + 1}`, tokens: plainTextTokens(s) })),
        ...(data.solution_set?.length
          ? [{ title: 'Conjunto solución', tokens: [t(`C.S. = {${data.solution_set.join('; ')}}`)], answer: true }]
          : []),
      ],
      graph: null,
      graphPrimary: false,
      summary: 'Pasos del análisis',
    };
  }
  return null;
}

/** Construye el plan para un `function_graph`: la gráfica es el contenido principal. */
export function planFromFunction(data: FunctionGraphData): SolutionPlan | null {
  if (!data.function_expression) return null;
  try {
    let expr = normalizeExpression(data.function_expression);
    expr = expr.replace(/^\s*(f\s*\(\s*x\s*\)|y)\s*=/, '');
    if (expr.includes('=')) expr = expr.split('=').pop() ?? expr;
    const f = compileExpression(expr);
    const poly = polynomialFromFn(f);
    const lines: SolutionLine[] = [];
    const points: GraphPoint[] = [];
    let win;
    if (poly && Math.abs(poly.a) > EPS) {
      const h = -poly.b / (2 * poly.a);
      const k = f(h);
      const D = poly.b * poly.b - 4 * poly.a * poly.c;
      const roots = D >= 0 ? [(-poly.b + Math.sqrt(D)) / (2 * poly.a), (-poly.b - Math.sqrt(D)) / (2 * poly.a)] : [];
      const unique = roots.filter((r, i) => i === 0 || Math.abs(r - roots[0]) > 1e-9).sort((u, v) => u - v);
      lines.push({ title: 'Vértice', tokens: [t(`V(${fmt(h)}; ${fmt(k)})`)] });
      if (unique.length) lines.push({ title: 'Raíces', tokens: [t(`x = ${unique.map((r) => fmt(r)).join(' ; ')}`)] });
      lines.push({ title: 'Corte con el eje y', tokens: [t(`f(0) = ${fmt(poly.c)}`)] });
      unique.forEach((r) => points.push({ x: r, y: 0, label: fmt(r), kind: 'root' }));
      points.push({ x: h, y: k, label: `V(${fmt(h)}; ${fmt(k)})`, kind: 'vertex' });
      win = graphWindow(f, h, Math.max(3.5, unique.length === 2 ? Math.abs(unique[0] - unique[1]) * 0.85 + 1.5 : 3.5), [k, poly.c]);
    } else if (/abs\(|\|/.test(expr)) {
      // |…|: el vértice es el punto de quiebre (mínimo o máximo absoluto)
      let best = { x: 0, y: f(0) };
      let worst = { x: 0, y: f(0) };
      for (let x = -20; x <= 20; x += 0.005) {
        const y = f(x);
        if (!Number.isFinite(y)) continue;
        if (y < best.y) best = { x, y };
        if (y > worst.y) worst = { x, y };
      }
      const opensUp = f(best.x - 5) > best.y + 1e-6 && f(best.x + 5) > best.y + 1e-6;
      const v = opensUp ? best : worst;
      const vx = snap(Math.round(v.x * 100) / 100);
      const vy = snap(f(vx));
      const roots = numericRoots(f, -20, 20).map((r) => snap(Math.round(r * 1000) / 1000));
      const c0 = f(0);
      lines.push({ title: 'Vértice (punto de quiebre)', tokens: [t(`V(${fmt(vx)}; ${fmt(vy)})`)] });
      if (roots.length) lines.push({ title: 'Raíces', tokens: [t(`x = ${roots.map((r) => fmt(r)).join(' ; ')}`)] });
      lines.push({ title: 'Corte con el eje y', tokens: [t(`f(0) = ${fmt(c0)}`)] });
      lines.push({ title: 'Rango', tokens: [t(opensUp ? `Ran f = [${fmt(vy)}; +∞)` : `Ran f = (${MINUS}∞; ${fmt(vy)}]`)], answer: true });
      roots.forEach((r) => points.push({ x: r, y: 0, label: fmt(r), kind: 'root' }));
      points.push({ x: vx, y: vy, label: `V(${fmt(vx)}; ${fmt(vy)})`, kind: 'vertex' });
      const span = roots.length >= 2 ? Math.abs(roots[roots.length - 1] - roots[0]) * 0.75 + 2 : 5;
      win = graphWindow(f, vx, Math.max(4, span), [vy, c0]);
    } else {
      const roots = numericRoots(f, -10, 10);
      const c0 = f(0);
      if (roots.length) {
        lines.push({ title: 'Raíces', tokens: [t('x'), { k: 'approx' }, t(roots.map((r) => fmt(r)).join(' ; '))] });
      }
      if (Number.isFinite(c0)) {
        lines.push({ title: 'Corte con el eje y', tokens: [t(`f(0) = ${fmt(c0)}`)] });
        points.push({ x: 0, y: c0, label: fmt(c0), kind: 'intercept' });
      }
      roots.forEach((r) => points.push({ x: r, y: 0, label: fmt(r), kind: 'root' }));
      const center = roots.length ? (roots[0] + roots[roots.length - 1]) / 2 : 0;
      win = graphWindow(f, center, 5, Number.isFinite(c0) ? [c0] : []);
    }
    return {
      kind: 'function',
      lines,
      graph: { fn: f, ...win, points, label: [] },
      graphPrimary: true,
      summary: 'Gráfica de la función',
    };
  } catch (err) {
    console.warn('[PaperLab AR] No se pudo interpretar la función:', data.function_expression, err);
    return null;
  }
}
