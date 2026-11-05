/**
 * ALGORITMOS como un debugger real dibujado sobre la hoja:
 *  - Diagrama de flujo (layout con dagre) o listado de código, con el nodo/línea activa iluminada.
 *  - Panel de MEMORIA: variables y ARREGLOS con sus celdas e índices; lo que cambia en el paso se resalta.
 *  - CONSOLA con la salida acumulada y PILA DE LLAMADAS para recursión.
 *  - Controles: reiniciar, paso atrás, reproducir/pausar, paso adelante.
 */
import dagre from '@dagrejs/dagre';
import type { SolutionPlan, SolutionLine } from '../ar/mathEngine';
import { plainTextTokens } from '../ar/mathEngine';
import { pointAlong, type FigureCanvas } from './figureCanvas';
import { clamp, num, type FigureRuntime, type FigureSpec, type SimControl } from './types';

type Pt = [number, number];
const line = (title: string, text: string, answer = false): SolutionLine => ({ title, tokens: plainTextTokens(text), answer });
const ACTIVE = '#a855f7';
const TOKEN = '#38bdf8';

interface FlowNode {
  id: string;
  shape: string;
  role: string;
  label: string;
}
interface FlowEdge {
  from_node_id: string;
  to_node_id: string;
  condition_label?: string | null;
}
export interface DebugStep {
  nodeId?: string;
  line?: number;
  description: string;
  vars: Record<string, string>;
  output?: string;
  stack: string[];
}

// ------------------------------------------------------------------ traza
function stepsFromExecution(exec: unknown): DebugStep[] {
  if (!Array.isArray(exec)) return [];
  return exec.map((e: Record<string, unknown>) => ({
    nodeId: typeof e.node_id === 'string' ? e.node_id : undefined,
    line: typeof e.line_number === 'number' ? e.line_number : undefined,
    description: String(e.description ?? ''),
    vars: Object.fromEntries(Object.entries((e.variables as Record<string, unknown>) ?? {}).map(([k, v]) => [k, String(v)])),
    output: e.output ? String(e.output) : undefined,
    stack: Array.isArray(e.call_stack) ? e.call_stack.map(String) : [],
  }));
}

/** Sin traza de la IA: recorre el grafo desde el inicio (siempre por la primera salida). */
function walkGraph(nodes: FlowNode[], edges: FlowEdge[]): DebugStep[] {
  const start = nodes.find((n) => n.role === 'start') ?? nodes[0];
  const steps: DebugStep[] = [];
  const visits = new Map<string, number>();
  let cur: FlowNode | undefined = start;
  while (cur && steps.length < 24) {
    visits.set(cur.id, (visits.get(cur.id) ?? 0) + 1);
    steps.push({ nodeId: cur.id, description: cur.label, vars: {}, stack: [] });
    if (cur.role === 'end') break;
    const outs = edges.filter((e) => e.from_node_id === cur!.id);
    // en bucles: tras 3 vueltas toma la otra salida
    const pick = outs.find((e) => (visits.get(e.to_node_id) ?? 0) < 3) ?? outs[outs.length - 1];
    cur = pick ? nodes.find((n) => n.id === pick.to_node_id) : undefined;
  }
  return steps;
}

function parseArray(v: string): string[] | null {
  const s = v.trim();
  if (!s.startsWith('[') || !s.endsWith(']')) return null;
  try {
    const arr = JSON.parse(s.replace(/'/g, '"'));
    return Array.isArray(arr) ? arr.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))) : null;
  } catch {
    return s.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean);
  }
}

// ------------------------------------------------------------------ runtime
type Mode = 'flow' | 'code' | 'table' | 'recursion' | 'tree';

interface TableData {
  cols: string[];
  rows: string[][];
}

class Debugger implements FigureRuntime {
  animated = true;
  controls: SimControl[] = [
    { id: 'reset', kind: 'button', label: 'Reiniciar', icon: 'reset' },
    { id: 'prev', kind: 'button', label: 'Paso atrás', icon: 'prev' },
    { id: 'play', kind: 'toggle', label: 'Ejecutar', icon: 'play' },
    { id: 'next', kind: 'button', label: 'Paso', icon: 'next' },
  ];
  values: Record<string, number | boolean> = { play: true };
  i = 0;
  private timer = 0;
  private sinceStep = 0;
  private prevIndex = 0;
  private layoutCache: { nodes: Map<string, { x: number; y: number; w: number; h: number }>; edges: { from: string; to: string; pts: Pt[]; label?: string | null }[]; s: number } | null = null;

  constructor(
    private mode: Mode,
    private steps: DebugStep[],
    private nodes: FlowNode[] = [],
    private edges: FlowEdge[] = [],
    private code: string[] = [],
    private table: TableData | null = null,
    private header: string[] = [],
    private tree: { nodes: string[]; edges: [string, string][] } | null = null,
  ) {}

  onControl(id: string) {
    if (id === 'play') this.values.play = !this.values.play;
    if (id === 'reset') this.go(0);
    if (id === 'prev') this.go(this.i - 1);
    if (id === 'next') this.go(this.i + 1);
    if (id !== 'play') this.values.play = false;
  }
  private go(i: number) {
    const next = clamp(i, 0, Math.max(0, this.steps.length - 1));
    if (next !== this.i) {
      this.prevIndex = this.i;
      this.i = next;
      this.sinceStep = 0;
    }
  }
  update(dt: number) {
    this.sinceStep += dt;
    if (!this.values.play) return;
    this.timer += dt;
    if (this.timer > 1.25) {
      this.timer = 0;
      if (this.i >= this.steps.length - 1) {
        this.values.play = false;
      } else this.go(this.i + 1);
    }
  }
  caption() {
    const s = this.steps[this.i];
    return s ? s.description : '';
  }
  readouts() {
    return [{ label: 'Paso', value: `${this.steps.length ? this.i + 1 : 0}/${this.steps.length}` }];
  }

  // ---------------------------------------------------------------- dibujo
  draw(fc: FigureCanvas) {
    const u = fc.u;
    const memW = this.mode === 'table' ? 0 : fc.w * 0.36;
    const leftW = fc.w - memW;
    if (this.mode === 'flow') this.drawFlow(fc, 0, 0, leftW - u * 0.5, fc.h);
    else if (this.mode === 'code') this.drawCode(fc, 0, 0, leftW - u * 0.5, fc.h);
    else if (this.mode === 'recursion') this.drawCode(fc, 0, 0, leftW - u * 0.5, fc.h, true);
    else if (this.mode === 'tree') this.drawTree(fc, 0, 0, leftW - u * 0.5, fc.h);
    else this.drawTable(fc, 0, 0, fc.w, fc.h);
    if (memW > 0) {
      fc.line(leftW, u * 0.6, leftW, fc.h - u * 0.6, 'ink', 0.5, true);
      if (this.mode === 'recursion') this.drawStack(fc, leftW + u * 0.5, 0, memW - u, fc.h);
      else this.drawMemory(fc, leftW + u * 0.5, 0, memW - u, fc.h);
    }
  }

  private layout(fc: FigureCanvas, w: number, h: number) {
    if (this.layoutCache) return this.layoutCache;
    const u = fc.u;
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: u * 1.2, ranksep: u * 1.4, marginx: u * 0.5, marginy: u * 0.5 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const n of this.nodes) {
      const tw = fc.textWidth(n.label, 0.75);
      const diamond = n.shape === 'diamond';
      g.setNode(n.id, { width: Math.min(u * 12, tw + u * (diamond ? 3 : 1.6)), height: u * (diamond ? 2.8 : 1.9) });
    }
    for (const e of this.edges) if (g.hasNode(e.from_node_id) && g.hasNode(e.to_node_id)) g.setEdge(e.from_node_id, e.to_node_id, { label: e.condition_label ?? undefined });
    dagre.layout(g);
    const gw = g.graph().width ?? w;
    const gh = g.graph().height ?? h;
    const s = Math.min(1.2, w / gw, h / gh);
    const ox = (w - gw * s) / 2;
    const oy = (h - gh * s) / 2;
    const nodes = new Map<string, { x: number; y: number; w: number; h: number }>();
    for (const id of g.nodes()) {
      const n = g.node(id);
      nodes.set(id, { x: ox + n.x * s, y: oy + n.y * s, w: n.width * s, h: n.height * s });
    }
    const edges = g.edges().map((e) => {
      const ed = g.edge(e) as { points: { x: number; y: number }[]; label?: string | null };
      return { from: e.v, to: e.w, pts: ed.points.map((p) => [ox + p.x * s, oy + p.y * s] as Pt), label: ed.label ?? undefined };
    });
    this.layoutCache = { nodes, edges, s };
    return this.layoutCache;
  }

  private drawFlow(fc: FigureCanvas, x0: number, y0: number, w: number, h: number) {
    const L = this.layout(fc, w, h);
    const cur = this.steps[this.i]?.nodeId;
    const prev = this.steps[this.prevIndex]?.nodeId;
    const ts = clamp(L.s, 0.55, 1);
    for (const e of L.edges) {
      const pts = e.pts.map(([x, y]) => [x0 + x, y0 + y] as Pt);
      fc.path(pts, 'ink', 0.8, true);
      const a = pts[pts.length - 2];
      const b = pts[pts.length - 1];
      fc.arrow(a[0] + (b[0] - a[0]) * 0.5, a[1] + (b[1] - a[1]) * 0.5, b[0], b[1], 'ink', 0.8);
      if (e.label) {
        const m = pts[Math.floor(pts.length / 2)];
        fc.text(e.label, m[0] + fc.u * 0.3, m[1], 0.65 * ts, 'pencil');
      }
      // ficha de datos viajando por la flecha recién recorrida
      if (prev && cur && e.from === prev && e.to === cur && this.sinceStep < 0.6) {
        const { p, total } = pointAlong(pts, 0);
        void p;
        const at = pointAlong(pts, total * clamp(this.sinceStep / 0.6, 0, 1) * 0.999).p;
        fc.glow(at[0], at[1], fc.u * 1.2, TOKEN, 1);
      }
    }
    for (const n of this.nodes) {
      const b = L.nodes.get(n.id);
      if (!b) continue;
      const cx = x0 + b.x;
      const cy = y0 + b.y;
      const hw = b.w / 2;
      const hh = b.h / 2;
      const active = n.id === cur;
      const width = active ? 1.5 : 1;
      if (n.shape === 'oval') {
        const pts: Pt[] = [];
        for (let i = 0; i <= 24; i++) {
          const a = (i / 24) * Math.PI * 2;
          pts.push([cx + Math.cos(a) * hw, cy + Math.sin(a) * hh]);
        }
        fc.path(pts, 'ink', width, true);
      } else if (n.shape === 'diamond') {
        fc.polygon([[cx, cy - hh], [cx + hw, cy], [cx, cy + hh], [cx - hw, cy]], 'ink', width);
      } else if (n.shape === 'parallelogram') {
        const k = hh * 0.6;
        fc.polygon([[cx - hw + k, cy - hh], [cx + hw, cy - hh], [cx + hw - k, cy + hh], [cx - hw, cy + hh]], 'ink', width);
      } else fc.rect(cx - hw, cy - hh, b.w, b.h, 'ink', width);
      fc.fitText(n.label, cx, cy, b.w * (n.shape === 'diamond' ? 0.62 : 0.88), 0.75 * ts, active ? 'pencil' : 'ink');
      if (active) {
        fc.glow(cx, cy, Math.max(hw, hh) * 1.5, ACTIVE, 0.55);
        fc.lightRect(cx - hw - 3, cy - hh - 3, b.w + 6, b.h + 6, ACTIVE, 0.7);
      }
    }
  }

  private treeCache: { pos: Map<string, Pt>; r: number } | null = null;

  /** Árbol / grafo: nodo actual iluminado, visitados sombreados, aristas recorridas resaltadas. */
  private drawTree(fc: FigureCanvas, x0: number, y0: number, w: number, h: number) {
    const u = fc.u;
    const t = this.tree;
    if (!t) return;
    if (!this.treeCache) {
      const g = new dagre.graphlib.Graph();
      g.setGraph({ rankdir: 'TB', nodesep: u * 1.4, ranksep: u * 1.8, marginx: u, marginy: u });
      g.setDefaultEdgeLabel(() => ({}));
      const size = u * 2.4;
      t.nodes.forEach((n) => g.setNode(n, { width: size, height: size }));
      t.edges.forEach(([a, b]) => g.hasNode(a) && g.hasNode(b) && g.setEdge(a, b));
      dagre.layout(g);
      const gw = g.graph().width ?? w;
      const gh = g.graph().height ?? h;
      const sc = Math.min(1.3, w / gw, (h - u * 1.5) / gh);
      const ox = x0 + (w - gw * sc) / 2;
      const oy = y0 + u * 1.5 + (h - u * 1.5 - gh * sc) / 2;
      const pos = new Map<string, Pt>();
      g.nodes().forEach((n) => {
        const nd = g.node(n);
        pos.set(n, [ox + nd.x * sc, oy + nd.y * sc]);
      });
      this.treeCache = { pos, r: (size * sc) / 2 };
    }
    const { pos, r } = this.treeCache;
    const step = this.steps[this.i];
    const parseList = (v?: string) => (v ? (parseArray(v) ?? []).map((x) => x.replace(/^"|"$/g, '')) : []);
    const visited = new Set(parseList(step?.vars.visitados ?? step?.vars.visited));
    const current = (step?.vars.actual ?? step?.vars.current ?? '').replace(/^"|"$/g, '');
    const queue = new Set(parseList(step?.vars.cola ?? step?.vars.pila ?? step?.vars.queue));
    for (const [a, b] of t.edges) {
      const pa = pos.get(a);
      const pb = pos.get(b);
      if (!pa || !pb) continue;
      const d = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) || 1;
      const ux = (pb[0] - pa[0]) / d;
      const uy = (pb[1] - pa[1]) / d;
      const both = visited.has(a) && visited.has(b);
      fc.line(pa[0] + ux * r, pa[1] + uy * r, pb[0] - ux * r, pb[1] - uy * r, both ? 'pencil' : 'ink', both ? 1.2 : 0.8);
    }
    for (const n of t.nodes) {
      const p = pos.get(n);
      if (!p) continue;
      const isCur = n === current;
      fc.circle(p[0], p[1], r * 2, isCur ? 'pencil' : 'ink', isCur ? 1.5 : 1, visited.has(n) ? 'hi' : undefined);
      fc.fitText(n, p[0], p[1], r * 1.5, 0.85, isCur ? 'pencil' : 'ink');
      if (isCur) {
        fc.glow(p[0], p[1], r * 2.2, ACTIVE, 0.7);
        fc.lightRect(p[0] - r - 3, p[1] - r - 3, r * 2 + 6, r * 2 + 6, ACTIVE, 0.5);
      } else if (queue.has(n)) fc.glow(p[0], p[1], r * 1.6, TOKEN, 0.45);
    }
    fc.text('visitado', x0 + u * 0.6, y0 + u * 1.1, 0.6, 'ink');
    fc.highlight(x0 + u * 4, y0 + u * 0.35, u * 1.2, u * 0.9);
    fc.text('en cola', x0 + u * 6, y0 + u * 1.1, 0.6, 'ink');
    fc.glow(x0 + u * 9.2, y0 + u * 0.8, u * 0.8, TOKEN, 0.6);
  }

  private drawCode(fc: FigureCanvas, x0: number, y0: number, w: number, h: number, recursion = false) {
    const u = fc.u;
    let top = y0 + u * 0.6;
    for (const hl of this.header) {
      fc.text(hl, x0 + u * 0.4, top + u, 0.75, 'pencil');
      top += u * 1.5;
    }
    const lines = this.code.slice(0, 18);
    const lh = Math.min(u * 1.75, (h - (top - y0) - u * 0.6) / Math.max(1, lines.length));
    const size = clamp(lh / (u * 1.75), 0.5, 1) * 0.8;
    const cur = this.steps[this.i]?.line;
    lines.forEach((l, i) => {
      const y = top + lh * (i + 0.78);
      const active = cur === i + 1;
      if (active) {
        fc.highlight(x0 + u * 1.6, y - lh * 0.75, w - u * 1.8, lh * 0.95);
        fc.glow(x0 + u * 0.7, y - lh * 0.3, u * 1.1, ACTIVE, 0.9);
      }
      fc.text(String(i + 1), x0 + u * 1.2, y, size * 0.8, 'pencil', 'right');
      const indent = (l.match(/^\s*/)?.[0].length ?? 0) * u * 0.32 * size;
      const text = l.trim();
      const maxW = w - u * 2 - indent;
      const tw = fc.textWidth(text, size);
      fc.text(text, x0 + u * 1.7 + indent, y, tw > maxW ? (size * maxW) / tw : size, 'ink');
    });
    if (recursion && !cur) {
      // sin número de línea: resaltar la llamada recursiva
      const idx = lines.findIndex((l) => /return/.test(l) && /\(/.test(l));
      if (idx >= 0) fc.glow(x0 + u * 0.7, top + lh * (idx + 0.5), u, ACTIVE, 0.5);
    }
  }

  private drawMemory(fc: FigureCanvas, x0: number, y0: number, w: number, h: number) {
    const u = fc.u;
    const step = this.steps[this.i];
    const before = this.i > 0 ? this.steps[this.i - 1] : undefined;
    fc.text('Memoria', x0, y0 + u * 1.3, 0.9, 'pencil');
    let y = y0 + u * 2.4;
    const vars = Object.entries(step?.vars ?? {});
    if (!vars.length) {
      fc.text('(sin variables)', x0, y + u, 0.7, 'ink');
      y += u * 1.6;
    }
    for (const [name, value] of vars) {
      if (y > h - u * 5) break;
      const old = before?.vars[name];
      const arr = parseArray(value);
      if (arr) {
        const oldArr = old ? parseArray(old) : null;
        fc.text(name, x0, y + u * 1.05, 0.8, 'ink');
        const nameW = fc.textWidth(name, 0.8) + u * 0.5;
        const cells = arr.slice(0, 10);
        const cw = Math.min(u * 2.2, (w - nameW) / Math.max(1, cells.length));
        cells.forEach((v, i) => {
          const cx = x0 + nameW + cw * i;
          const changed = !!oldArr && oldArr[i] !== v;
          if (changed) {
            fc.highlight(cx + 1, y + 1, cw - 2, u * 1.5 - 2);
            fc.glow(cx + cw / 2, y + u * 0.75, cw, ACTIVE, 0.6);
          }
          fc.rect(cx, y, cw, u * 1.5, 'ink', 0.8);
          fc.fitText(v, cx + cw / 2, y + u * 0.78, cw * 0.85, 0.75, changed ? 'pencil' : 'ink');
          fc.text(String(i), cx + cw / 2, y + u * 2.3, 0.5, 'pencil', 'center');
        });
        y += u * 3;
      } else {
        const changed = old !== undefined ? old !== value : !!before;
        const label = `${name} = ${value}`;
        const tw = Math.min(w, fc.textWidth(label, 0.8));
        if (changed) {
          fc.highlight(x0 - u * 0.15, y + u * 0.1, tw + u * 0.3, u * 1.35);
          fc.glow(x0 + tw / 2, y + u * 0.8, tw * 0.7, ACTIVE, 0.45);
        }
        fc.fitText(label, x0, y + u * 0.8, w, 0.8, changed ? 'pencil' : 'ink', 'left');
        y += u * 1.75;
      }
    }
    // Consola
    const outputs = this.steps.slice(0, this.i + 1).map((s) => s.output).filter((o): o is string => !!o);
    const cy = Math.max(y + u * 0.6, h - u * 5.2);
    fc.text('Consola', x0, cy, 0.8, 'pencil');
    fc.rect(x0, cy + u * 0.4, w, h - cy - u * 0.9, 'ink', 0.7);
    outputs.slice(-3).forEach((o, i, arr) => {
      const isNew = i === arr.length - 1 && this.steps[this.i]?.output === o;
      fc.fitText('> ' + o, x0 + u * 0.4, cy + u * 1.5 + i * u * 1.25, w - u * 0.8, 0.7, isNew ? 'pencil' : 'ink', 'left');
      if (isNew) fc.glow(x0 + w * 0.3, cy + u * 1.5 + i * u * 1.25, w * 0.3, TOKEN, 0.35);
    });
  }

  private drawStack(fc: FigureCanvas, x0: number, y0: number, w: number, h: number) {
    const u = fc.u;
    const step = this.steps[this.i];
    fc.text('Pila de llamadas', x0, y0 + u * 1.3, 0.85, 'pencil');
    const frames = step?.stack ?? [];
    const fh = Math.min(u * 2.1, (h - u * 4) / Math.max(1, frames.length));
    frames.forEach((fr, i) => {
      const y = h - u * 1.2 - fh * (i + 1);
      const top = i === frames.length - 1;
      fc.rect(x0, y, w, fh * 0.86, 'ink', top ? 1.3 : 0.8);
      fc.fitText(fr, x0 + w / 2, y + fh * 0.43, w * 0.9, 0.75, top ? 'pencil' : 'ink');
      if (top) fc.glow(x0 + w / 2, y + fh * 0.43, w * 0.6, ACTIVE, 0.55);
    });
    const ret = Object.entries(step?.vars ?? {}).slice(0, 2);
    ret.forEach(([k, v], i) => fc.fitText(`${k} = ${v}`, x0, y0 + u * 2.6 + i * u * 1.4, w, 0.7, 'ink', 'left'));
  }

  private drawTable(fc: FigureCanvas, x0: number, y0: number, w: number, h: number) {
    const u = fc.u;
    const t = this.table;
    if (!t) return;
    const rows = t.rows.slice(0, 14);
    const colW = w / t.cols.length;
    const rowH = Math.min(u * 1.9, (h - u) / (rows.length + 1));
    t.cols.forEach((c, i) => fc.fitText(c, x0 + colW * (i + 0.5), y0 + rowH * 0.55, colW * 0.9, 0.85, 'pencil'));
    fc.line(x0, y0 + rowH, x0 + w, y0 + rowH, 'ink', 0.8);
    for (let i = 1; i < t.cols.length; i++) fc.line(x0 + colW * i, y0, x0 + colW * i, y0 + rowH * (rows.length + 1), 'ink', 0.5);
    rows.forEach((r, ri) => {
      if (ri > this.i) return; // las filas aparecen a medida que avanza la ejecución
      const y = y0 + rowH * (ri + 1);
      const current = ri === this.i;
      if (current) {
        fc.highlight(x0, y + rowH * 0.08, w, rowH * 0.86);
        fc.glow(x0 + w / 2, y + rowH / 2, w * 0.4, ACTIVE, 0.4);
      }
      r.forEach((v, ci) => fc.fitText(v, x0 + colW * (ci + 0.5), y + rowH * 0.55, colW * 0.88, 0.8, current ? 'pencil' : 'ink'));
    });
  }
}

// =====================================================================================
// Planes
// =====================================================================================
const spec = (title: string, aspect: number, create: () => FigureRuntime, minWidthChars = 22): FigureSpec => ({ title, aspect, minWidthChars, create });

export function flowPlan(exerciseType: string, d: Record<string, unknown>): SolutionPlan | null {
  const base = { graph: null, graphPrimary: false, kind: 'simulation' as const };
  const nodes = (Array.isArray(d.nodes) ? d.nodes : []) as FlowNode[];
  const edges = (Array.isArray(d.edges) ? d.edges : []) as FlowEdge[];
  let steps = stepsFromExecution(d.execution);
  const code = (s: unknown) => String(s ?? '').replace(/\r/g, '').split('\n').filter((l, i, a) => l.trim() || (i > 0 && i < a.length - 1));

  switch (exerciseType) {
    case 'sequential_flowchart':
    case 'conditional_flowchart':
    case 'loop_flowchart': {
      if (!nodes.length) return null;
      if (!steps.length) steps = walkGraph(nodes, edges);
      const titles: Record<string, string> = {
        sequential_flowchart: 'Diagrama de flujo secuencial',
        conditional_flowchart: 'Diagrama de flujo condicional',
        loop_flowchart: 'Diagrama de flujo con bucle',
      };
      const extra =
        exerciseType === 'conditional_flowchart' ? `Condición: ${d.decision_condition ?? '—'}`
          : exerciseType === 'loop_flowchart' ? `Mientras ${d.loop_condition ?? '—'}  (control: ${d.loop_variable ?? '—'})`
            : `${nodes.length} bloques, ${edges.length} flechas`;
      const outs = steps.map((s) => s.output).filter(Boolean);
      return {
        ...base,
        summary: titles[exerciseType],
        lines: [line('Estructura', extra), line('Salida', outs.length ? outs.join(' · ') : 'Ejecuta el diagrama paso a paso', true)],
        figure: spec('Debugger', 1.55, () => new Debugger('flow', steps, nodes, edges)),
      };
    }
    case 'code_debugger': {
      const src = code(d.source_code);
      if (!steps.length && Array.isArray(d.steps)) {
        // traza antigua: solo actualizaciones → snapshot acumulado
        const acc: Record<string, string> = {};
        steps = (d.steps as Record<string, unknown>[]).map((s) => {
          Object.assign(acc, Object.fromEntries(Object.entries((s.variable_updates as Record<string, unknown>) ?? {}).map(([k, v]) => [k, String(v)])));
          return { line: num(s.line_number, 1), description: String(s.line_code ?? ''), vars: { ...acc }, output: s.console_output ? String(s.console_output) : undefined, stack: [] };
        });
      }
      if (!src.length) return null;
      return {
        ...base,
        summary: `Depurador paso a paso (${d.detected_language ?? 'código'})`,
        lines: [line('Resultado final', String(d.final_output || steps.map((s) => s.output).filter(Boolean).pop() || '—'), true)],
        figure: spec('Debugger', 1.5, () => new Debugger('code', steps, [], [], src)),
      };
    }
    case 'trace_table': {
      const watched = (Array.isArray(d.watched_variables) ? d.watched_variables : []).map(String);
      const rows = (Array.isArray(d.rows) ? d.rows : []) as Record<string, unknown>[];
      if (!rows.length) return null;
      const hasCond = rows.some((r) => r.condition_evaluated);
      const cols = ['iter', ...watched, ...(hasCond ? ['cond'] : [])];
      const table: TableData = {
        cols,
        rows: rows.map((r) => [
          String(r.iteration ?? ''),
          ...watched.map((w) => String((r.variables as Record<string, unknown>)?.[w] ?? '')),
          ...(hasCond ? [String(r.condition_evaluated ?? '')] : []),
        ]),
      };
      const tsteps: DebugStep[] = rows.map((r) => ({
        description: `Iteración ${r.iteration}${r.condition_evaluated ? ` · condición: ${r.condition_evaluated}` : ''}`,
        vars: Object.fromEntries(Object.entries((r.variables as Record<string, unknown>) ?? {}).map(([k, v]) => [k, String(v)])),
        stack: [],
      }));
      const fin = Object.entries((d.final_memory as Record<string, unknown>) ?? {}).map(([k, v]) => `${k} = ${v}`).join('   ');
      const gnodes = (Array.isArray(d.graph_nodes) ? d.graph_nodes : []).map(String);
      if (gnodes.length) {
        const gedges = (Array.isArray(d.graph_edges) ? d.graph_edges : [])
          .filter((e): e is unknown[] => Array.isArray(e) && e.length >= 2)
          .map((e) => [String(e[0]), String(e[1])] as [string, string]);
        const order = rows.map((r) => String((r.variables as Record<string, unknown>)?.actual ?? '')).filter(Boolean);
        return {
          ...base,
          summary: `Recorrido ${d.traversal ?? 'BFS'} de un árbol`,
          lines: [
            line('Estructura', `${d.traversal ?? 'BFS'}: se usa una ${/dfs/i.test(String(d.traversal)) ? 'pila' : 'cola'} de nodos pendientes`),
            line('Orden de visita', order.join(' → ') || fin, true),
          ],
          figure: spec('Recorrido', 1.6, () => new Debugger('tree', tsteps, [], [], [], null, [], { nodes: gnodes, edges: gedges })),
        };
      }
      return {
        ...base,
        summary: 'Tabla de traza',
        lines: [line('Memoria final', fin || '—', true)],
        figure: spec('Traza', 1.6, () => new Debugger('table', tsteps, [], [], [], table)),
      };
    }
    case 'recursive_flowchart': {
      const src = code(d.generated_code_py);
      if (!steps.length) {
        const trace = (Array.isArray(d.call_stack_trace) ? d.call_stack_trace : []).map(String);
        // apilar y luego desapilar
        steps = [
          ...trace.map((c, i) => ({ description: `Llamada ${c}`, vars: {}, stack: trace.slice(0, i + 1) })),
          ...trace.slice(0, -1).reverse().map((c, i) => ({ description: `Retorna a ${c}`, vars: {}, stack: trace.slice(0, trace.length - 1 - i) })),
        ];
      }
      return {
        ...base,
        summary: `Recursión: ${d.function_name ?? 'función'}`,
        lines: [
          line('Caso base', String(d.base_case ?? '—')),
          line('Llamada recursiva', String(d.recursive_call ?? '—'), true),
        ],
        figure: spec('Pila de llamadas', 1.5, () => new Debugger('recursion', steps, [], [], src.length ? src : [String(d.recursive_call ?? '')], null, [])),
      };
    }
  }
  return null;
}
