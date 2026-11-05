/**
 * MODO EJEMPLOS: foto de prueba (hoja dibujada a lápiz, generada en el navegador) + JSON de prueba
 * con la misma forma que devuelve el backend. Sirve para desarrollar y para la demo sin gastar
 * llamadas al analizador de imágenes.
 */
import rough from 'roughjs';
import type { ClassificationResult } from '../services/analysisApi';

export interface Example {
  module: 'physics' | 'circuits' | 'flowcharts' | 'math';
  skill: 'physics' | 'circuit' | 'flowchart' | 'math_geo';
  exercise_type: string;
  title: string;
  explanation: string;
  data: Record<string, unknown>;
  /** Dibuja el ejercicio "a lápiz" en la parte superior de la hoja. */
  sketch: (s: Sketch) => void;
}

// ------------------------------------------------------------------ lápiz para las fotos
const PHOTO_W = 1280;
const PHOTO_H = 900;
const INK = '#4b4e58';

class Sketch {
  readonly ctx: CanvasRenderingContext2D;
  private rc: ReturnType<typeof rough.canvas>;
  private seed = 3;
  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D no disponible');
    this.ctx = ctx;
    this.rc = rough.canvas(canvas);
  }
  private o(extra: Record<string, unknown> = {}) {
    return { stroke: INK, strokeWidth: 3, roughness: 1, bowing: 1, seed: this.seed++, disableMultiStroke: true, ...extra };
  }
  text(x: number, y: number, s: string, size = 46, align: CanvasTextAlign = 'left') {
    this.ctx.font = `500 ${size}px Caveat, 'Segoe Print', cursive`;
    this.ctx.fillStyle = INK;
    this.ctx.textAlign = align;
    this.ctx.fillText(s, x, y);
  }
  line(x1: number, y1: number, x2: number, y2: number) {
    this.rc.line(x1, y1, x2, y2, this.o());
  }
  rect(x: number, y: number, w: number, h: number) {
    this.rc.rectangle(x, y, w, h, this.o());
  }
  circle(x: number, y: number, d: number) {
    this.rc.circle(x, y, d, this.o());
  }
  poly(pts: [number, number][]) {
    this.rc.polygon(pts, this.o());
  }
  path(pts: [number, number][]) {
    this.rc.linearPath(pts, this.o());
  }
  ellipse(x: number, y: number, w: number, h: number) {
    this.rc.ellipse(x, y, w, h, this.o());
  }
  zigzag(x1: number, y: number, x2: number, n = 5, amp = 12) {
    const pts: [number, number][] = [[x1, y]];
    for (let i = 0; i < n * 2; i++) pts.push([x1 + ((x2 - x1) * (i + 0.5)) / (n * 2), y + (i % 2 ? amp : -amp)]);
    pts.push([x2, y]);
    this.path(pts);
  }
}

/** Genera la "foto" del cuaderno para un ejemplo (data URL JPEG). */
export async function renderExamplePhoto(ex: Example): Promise<string> {
  try {
    await document.fonts.load('500 46px Caveat');
  } catch {
    // fuente alternativa
  }
  const canvas = document.createElement('canvas');
  canvas.width = PHOTO_W;
  canvas.height = PHOTO_H;
  const ctx = canvas.getContext('2d')!;
  // mesa
  ctx.fillStyle = '#6b3f28';
  ctx.fillRect(0, 0, PHOTO_W, PHOTO_H);
  for (let i = 0; i < 400; i++) {
    ctx.strokeStyle = `rgba(${40 + Math.random() * 40}, ${20 + Math.random() * 20}, 10, 0.35)`;
    ctx.lineWidth = 1 + Math.random() * 2;
    const y = Math.random() * PHOTO_H;
    ctx.beginPath();
    ctx.moveTo(Math.random() * PHOTO_W, y);
    ctx.lineTo(Math.random() * PHOTO_W, y + (Math.random() - 0.5) * 6);
    ctx.stroke();
  }
  // hoja con viñeteo suave
  const px = 70, py = 40, pw = PHOTO_W - 140, ph = PHOTO_H - 60;
  ctx.save();
  ctx.translate(PHOTO_W / 2, PHOTO_H / 2);
  ctx.rotate(-0.012);
  ctx.translate(-PHOTO_W / 2, -PHOTO_H / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#efede6';
  ctx.fillRect(px, py, pw, ph);
  ctx.shadowBlur = 0;
  const g = ctx.createRadialGradient(PHOTO_W * 0.45, PHOTO_H * 0.4, 100, PHOTO_W / 2, PHOTO_H / 2, PHOTO_W * 0.7);
  g.addColorStop(0, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(90,85,75,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = 'rgba(210,120,120,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 70, py);
  ctx.lineTo(px + 70, py + ph);
  ctx.stroke();
  ex.sketch(new Sketch(canvas));
  ctx.restore();
  return canvas.toDataURL('image/jpeg', 0.92);
}

export function exampleToResult(ex: Example): ClassificationResult {
  return {
    exercise_id: ex.exercise_type,
    exercise_type: ex.exercise_type,
    exercise_name: ex.title,
    skill: ex.skill,
    confidence: 0.99,
    detected_elements: [],
    parameters: { exercise_type: ex.exercise_type, ...ex.data },
    explanation: ex.explanation,
    // zona del dibujo (parte superior izquierda de la hoja) como pista para el análisis de la hoja
    bounding_boxes: [{ x: 0.16, y: 0.08, width: 0.45, height: 0.22, label: 'ejercicio' }],
  };
}

// ------------------------------------------------------------------ catálogo
const X0 = 180; // margen izquierdo del dibujo
export const EXAMPLES: Example[] = [
  // ============================== FÍSICA ==============================
  {
    module: 'physics', skill: 'physics', exercise_type: 'inclined_plane', title: 'Plano inclinado con fricción',
    explanation: 'Bloque de 2 kg sobre una rampa de 30° con μ = 0.2.',
    data: { angle_degrees: 30, mass_kg: 2, friction_coefficient: 0.2, gravity_m_s2: 9.8, acceleration_m_s2: 3.2, weight_n: 19.6, normal_force_n: 17, friction_force_n: 3.4 },
    sketch: (s) => {
      s.poly([[X0, 260], [X0, 120], [X0 + 260, 260]]);
      s.rect(X0 + 80, 150, 50, 40);
      s.text(X0 + 175, 250, '30°', 38);
      s.text(X0 + 320, 150, 'm = 2 kg');
      s.text(X0 + 320, 210, 'μ = 0.2');
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'simple_pendulum', title: 'Péndulo simple',
    explanation: 'Péndulo de 1.5 m soltado desde 20°.',
    data: { length_m: 1.5, initial_angle_degrees: 20, mass_kg: 0.5, gravity_m_s2: 9.8, period_s: 2.46, max_velocity_m_s: 1.33, tension_at_lowest_point_n: 5.5 },
    sketch: (s) => {
      s.line(X0, 90, X0 + 160, 90);
      s.line(X0 + 80, 90, X0 + 150, 250);
      s.circle(X0 + 150, 262, 34);
      s.text(X0 + 125, 170, 'L = 1.5 m', 38);
      s.text(X0 + 260, 150, 'θ = 20°');
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'projectile_motion', title: 'Tiro parabólico',
    explanation: 'Proyectil lanzado a 25 m/s con 50° de elevación.',
    data: { initial_velocity_m_s: 25, launch_angle_degrees: 50, initial_height_m: 0, gravity_m_s2: 9.8, max_height_m: 18.7, range_m: 62.8, flight_time_s: 3.9 },
    sketch: (s) => {
      s.line(X0, 270, X0 + 420, 270);
      s.path([[X0, 270], [X0 + 80, 170], [X0 + 200, 120], [X0 + 320, 170], [X0 + 400, 270]]);
      s.line(X0, 270, X0 + 60, 200);
      s.text(X0 + 70, 250, '50°', 36);
      s.text(X0 + 460, 160, 'v0 = 25 m/s');
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'mass_spring', title: 'Masa-resorte',
    explanation: 'Resorte de k = 80 N/m con masa de 1.2 kg estirado 0.15 m.',
    data: { spring_constant_k_n_m: 80, mass_kg: 1.2, initial_displacement_m: 0.15, damping_coefficient: 0.3, angular_frequency_rad_s: 8.16, period_s: 0.77 },
    sketch: (s) => {
      s.line(X0, 120, X0, 260);
      s.zigzag(X0, 190, X0 + 220, 6, 16);
      s.rect(X0 + 220, 160, 70, 60);
      s.text(X0 + 330, 160, 'k = 80 N/m');
      s.text(X0 + 330, 220, 'm = 1.2 kg   x = 0.15 m');
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'rectilinear_motion', title: 'MRUV',
    explanation: 'Móvil que parte con 4 m/s y acelera 2 m/s² durante 6 s.',
    data: { motion_type: 'MRUV', initial_position_m: 0, initial_velocity_m_s: 4, acceleration_m_s2: 2, total_time_s: 6, final_velocity_m_s: 16, distance_traveled_m: 60 },
    sketch: (s) => {
      s.line(X0, 250, X0 + 460, 250);
      s.rect(X0 + 20, 200, 90, 40);
      s.circle(X0 + 40, 245, 18);
      s.circle(X0 + 90, 245, 18);
      s.line(X0 + 130, 210, X0 + 220, 210);
      s.text(X0 + 240, 150, 'v0 = 4 m/s   a = 2 m/s²');
      s.text(X0 + 240, 205, 't = 6 s');
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'atwood_machine', title: 'Máquina de Atwood',
    explanation: 'Polea ideal con masas de 3 kg y 5 kg.',
    data: { mass_1_kg: 3, mass_2_kg: 5, pulley_radius_m: 0.1, gravity_m_s2: 9.8, acceleration_m_s2: 2.45, tension_n: 36.75 },
    sketch: (s) => {
      s.line(X0, 80, X0 + 200, 80);
      s.circle(X0 + 100, 130, 70);
      s.line(X0 + 65, 130, X0 + 65, 220);
      s.line(X0 + 135, 130, X0 + 135, 250);
      s.rect(X0 + 40, 220, 50, 45);
      s.rect(X0 + 110, 250, 50, 45);
      s.text(X0 + 260, 170, 'm1 = 3 kg   m2 = 5 kg');
    },
  },
  // ============================== CIRCUITOS ==============================
  {
    module: 'circuits', skill: 'circuit', exercise_type: 'single_loop', title: 'Malla simple con foco',
    explanation: 'Pila de 9 V con una resistencia de 30 Ω y un foco.',
    data: { voltage_v: 9, resistance_ohms: 30, current_a: 0.3, power_w: 2.7, has_led: true, led_color: 'yellow' },
    sketch: (s) => {
      s.rect(X0, 100, 300, 170);
      s.zigzag(X0 + 90, 100, X0 + 210, 4, 12);
      s.circle(X0 + 300, 185, 44);
      s.text(X0 - 10, 200, '9 V', 40, 'right');
      s.text(X0 + 150, 80, 'R = 30 Ω', 38, 'center');
    },
  },
  {
    module: 'circuits', skill: 'circuit', exercise_type: 'series_resistors', title: 'Resistencias en serie',
    explanation: 'Tres resistencias en serie alimentadas con 12 V.',
    data: { voltage_v: 12, resistors_ohms: [100, 220, 330], equivalent_resistance_ohms: 650, current_a: 0.018, voltage_drops_v: [1.8, 4.1, 6.1] },
    sketch: (s) => {
      s.rect(X0, 110, 420, 160);
      [0, 1, 2].forEach((i) => s.zigzag(X0 + 40 + i * 130, 110, X0 + 120 + i * 130, 3, 10));
      s.text(X0 - 10, 200, '12 V', 40, 'right');
      s.text(X0 + 30, 90, '100 Ω    220 Ω    330 Ω', 36);
    },
  },
  {
    module: 'circuits', skill: 'circuit', exercise_type: 'parallel_resistors', title: 'Resistencias en paralelo',
    explanation: 'Dos resistencias en paralelo con 6 V.',
    data: { voltage_v: 6, resistors_ohms: [20, 30], equivalent_resistance_ohms: 12, branch_currents_a: [0.3, 0.2], total_current_a: 0.5 },
    sketch: (s) => {
      s.rect(X0, 100, 320, 180);
      s.line(X0 + 170, 100, X0 + 170, 280);
      s.text(X0 - 10, 200, '6 V', 40, 'right');
      s.text(X0 + 180, 200, '20 Ω', 36);
      s.text(X0 + 330, 200, '30 Ω', 36);
    },
  },
  {
    module: 'circuits', skill: 'circuit', exercise_type: 'interactive_switch', title: 'Circuito con interruptor',
    explanation: 'Interruptor abierto que controla un foco con 9 V y 45 Ω.',
    data: { initial_state: 'open', voltage_v: 9, load_resistance_ohms: 45, current_open_a: 0, current_closed_a: 0.2 },
    sketch: (s) => {
      s.rect(X0, 100, 320, 170);
      s.line(X0 + 120, 100, X0 + 190, 70);
      s.circle(X0 + 320, 185, 44);
      s.text(X0 - 10, 200, '9 V', 40, 'right');
      s.text(X0 + 380, 190, 'R = 45 Ω');
    },
  },
  {
    module: 'circuits', skill: 'circuit', exercise_type: 'rc_circuit', title: 'Circuito RC',
    explanation: 'Carga de un condensador de 470 μF a través de 2 kΩ con 5 V.',
    data: { voltage_v: 5, resistance_ohms: 2000, capacitance_uf: 470, time_constant_tau_s: 0.94, max_charge_uc: 2350, mode: 'charging' },
    sketch: (s) => {
      s.rect(X0, 100, 320, 170);
      s.zigzag(X0 + 90, 100, X0 + 210, 4, 12);
      s.line(X0 + 290, 180, X0 + 350, 180);
      s.line(X0 + 290, 196, X0 + 350, 196);
      s.text(X0 - 10, 200, '5 V', 40, 'right');
      s.text(X0 + 380, 160, 'R = 2 kΩ   C = 470 μF');
    },
  },
  {
    module: 'circuits', skill: 'circuit', exercise_type: 'logic_gates', title: 'Compuerta AND',
    explanation: 'Compuerta AND con entradas A = 1 y B = 0.',
    data: {
      gate_type: 'AND', inputs: [1, 0], output: 0, boolean_expression: 'A · B',
      truth_table: [{ inputs: [0, 0], output: 0 }, { inputs: [0, 1], output: 0 }, { inputs: [1, 0], output: 0 }, { inputs: [1, 1], output: 1 }],
    },
    sketch: (s) => {
      s.path([[X0 + 100, 110], [X0 + 160, 110]]);
      s.ellipse(X0 + 160, 170, 120, 120);
      s.line(X0 + 100, 110, X0 + 100, 230);
      s.line(X0 + 100, 230, X0 + 160, 230);
      s.line(X0, 140, X0 + 100, 140);
      s.line(X0, 200, X0 + 100, 200);
      s.line(X0 + 220, 170, X0 + 300, 170);
      s.text(X0 - 40, 150, 'A=1', 36);
      s.text(X0 - 40, 210, 'B=0', 36);
      s.text(X0 + 320, 180, 'S = ?');
    },
  },
  // ============================== ALGORITMOS ==============================
  {
    module: 'flowcharts', skill: 'flowchart', exercise_type: 'sequential_flowchart', title: 'Área de un rectángulo',
    explanation: 'Lee base y altura, calcula el área e imprime.',
    data: {
      nodes: [
        { id: 'n1', shape: 'oval', role: 'start', label: 'Inicio' },
        { id: 'n2', shape: 'parallelogram', role: 'input_output', label: 'Leer b, h' },
        { id: 'n3', shape: 'rectangle', role: 'process', label: 'A = b * h' },
        { id: 'n4', shape: 'parallelogram', role: 'input_output', label: 'Imprimir A' },
        { id: 'n5', shape: 'oval', role: 'end', label: 'Fin' },
      ],
      edges: [{ from_node_id: 'n1', to_node_id: 'n2' }, { from_node_id: 'n2', to_node_id: 'n3' }, { from_node_id: 'n3', to_node_id: 'n4' }, { from_node_id: 'n4', to_node_id: 'n5' }],
      variables: ['b', 'h', 'A'], generated_code_py: 'b, h = 5, 3\nA = b * h\nprint(A)', generated_code_js: '',
      execution: [
        { step: 1, node_id: 'n1', description: 'Inicio del algoritmo', variables: {} },
        { step: 2, node_id: 'n2', description: 'Se leen b = 5 y h = 3 (valores de ejemplo)', variables: { b: '5', h: '3' } },
        { step: 3, node_id: 'n3', description: 'A = 5 * 3 = 15', variables: { b: '5', h: '3', A: '15' } },
        { step: 4, node_id: 'n4', description: 'Se imprime el área', variables: { b: '5', h: '3', A: '15' }, output: '15' },
        { step: 5, node_id: 'n5', description: 'Fin', variables: { b: '5', h: '3', A: '15' } },
      ],
    },
    sketch: (s) => {
      s.ellipse(X0 + 90, 80, 150, 50);
      s.text(X0 + 90, 92, 'Inicio', 34, 'center');
      s.poly([[X0 + 30, 125], [X0 + 190, 125], [X0 + 160, 175], [X0, 175]]);
      s.text(X0 + 95, 160, 'Leer b, h', 32, 'center');
      s.rect(X0 + 20, 200, 150, 50);
      s.text(X0 + 95, 235, 'A = b*h', 32, 'center');
      s.line(X0 + 90, 105, X0 + 90, 125);
      s.line(X0 + 90, 175, X0 + 90, 200);
    },
  },
  {
    module: 'flowcharts', skill: 'flowchart', exercise_type: 'conditional_flowchart', title: '¿Aprobado o desaprobado?',
    explanation: 'Lee una nota y decide si aprueba (nota ≥ 11).',
    data: {
      nodes: [
        { id: 'n1', shape: 'oval', role: 'start', label: 'Inicio' },
        { id: 'n2', shape: 'parallelogram', role: 'input_output', label: 'Leer nota' },
        { id: 'n3', shape: 'diamond', role: 'decision', label: 'nota >= 11' },
        { id: 'n4', shape: 'parallelogram', role: 'input_output', label: '"Aprobado"' },
        { id: 'n5', shape: 'parallelogram', role: 'input_output', label: '"Desaprobado"' },
        { id: 'n6', shape: 'oval', role: 'end', label: 'Fin' },
      ],
      edges: [
        { from_node_id: 'n1', to_node_id: 'n2' }, { from_node_id: 'n2', to_node_id: 'n3' },
        { from_node_id: 'n3', to_node_id: 'n4', condition_label: 'Sí' }, { from_node_id: 'n3', to_node_id: 'n5', condition_label: 'No' },
        { from_node_id: 'n4', to_node_id: 'n6' }, { from_node_id: 'n5', to_node_id: 'n6' },
      ],
      decision_condition: 'nota >= 11', true_branch_node_id: 'n4', false_branch_node_id: 'n5', generated_code_py: '', generated_code_js: '',
      execution: [
        { step: 1, node_id: 'n1', description: 'Inicio', variables: {} },
        { step: 2, node_id: 'n2', description: 'Se lee nota = 14 (ejemplo)', variables: { nota: '14' } },
        { step: 3, node_id: 'n3', description: '¿14 >= 11? → verdadero, rama Sí', variables: { nota: '14' } },
        { step: 4, node_id: 'n4', description: 'Imprime "Aprobado"', variables: { nota: '14' }, output: 'Aprobado' },
        { step: 5, node_id: 'n6', description: 'Fin', variables: { nota: '14' } },
      ],
    },
    sketch: (s) => {
      s.ellipse(X0 + 90, 75, 140, 46);
      s.text(X0 + 90, 87, 'Inicio', 32, 'center');
      s.poly([[X0 + 90, 120], [X0 + 190, 170], [X0 + 90, 220], [X0 - 10, 170]]);
      s.text(X0 + 90, 180, 'nota≥11', 30, 'center');
      s.text(X0 + 220, 160, 'Sí → Aprobado', 34);
      s.text(X0 + 60, 260, 'No → Desaprobado', 34);
    },
  },
  {
    module: 'flowcharts', skill: 'flowchart', exercise_type: 'loop_flowchart', title: 'Suma del 1 al 3',
    explanation: 'Bucle mientras i <= 3 que acumula la suma.',
    data: {
      nodes: [
        { id: 'n1', shape: 'oval', role: 'start', label: 'Inicio' },
        { id: 'n2', shape: 'rectangle', role: 'process', label: 'i = 1, s = 0' },
        { id: 'n3', shape: 'diamond', role: 'decision', label: 'i <= 3' },
        { id: 'n4', shape: 'rectangle', role: 'process', label: 's = s + i' },
        { id: 'n5', shape: 'rectangle', role: 'process', label: 'i = i + 1' },
        { id: 'n6', shape: 'parallelogram', role: 'input_output', label: 'Imprimir s' },
        { id: 'n7', shape: 'oval', role: 'end', label: 'Fin' },
      ],
      edges: [
        { from_node_id: 'n1', to_node_id: 'n2' }, { from_node_id: 'n2', to_node_id: 'n3' },
        { from_node_id: 'n3', to_node_id: 'n4', condition_label: 'Sí' }, { from_node_id: 'n4', to_node_id: 'n5' },
        { from_node_id: 'n5', to_node_id: 'n3' }, { from_node_id: 'n3', to_node_id: 'n6', condition_label: 'No' },
        { from_node_id: 'n6', to_node_id: 'n7' },
      ],
      loop_condition: 'i <= 3', loop_variable: 'i', generated_code_py: '', generated_code_js: '',
      execution: [
        { step: 1, node_id: 'n1', description: 'Inicio', variables: {} },
        { step: 2, node_id: 'n2', description: 'Inicializa i = 1, s = 0', variables: { i: '1', s: '0' } },
        { step: 3, node_id: 'n3', description: '¿1 <= 3? verdadero', variables: { i: '1', s: '0' } },
        { step: 4, node_id: 'n4', description: 's = 0 + 1', variables: { i: '1', s: '1' } },
        { step: 5, node_id: 'n5', description: 'i = 2', variables: { i: '2', s: '1' } },
        { step: 6, node_id: 'n3', description: '¿2 <= 3? verdadero', variables: { i: '2', s: '1' } },
        { step: 7, node_id: 'n4', description: 's = 1 + 2', variables: { i: '2', s: '3' } },
        { step: 8, node_id: 'n5', description: 'i = 3', variables: { i: '3', s: '3' } },
        { step: 9, node_id: 'n3', description: '¿3 <= 3? verdadero', variables: { i: '3', s: '3' } },
        { step: 10, node_id: 'n4', description: 's = 3 + 3', variables: { i: '3', s: '6' } },
        { step: 11, node_id: 'n5', description: 'i = 4', variables: { i: '4', s: '6' } },
        { step: 12, node_id: 'n3', description: '¿4 <= 3? falso: sale del bucle', variables: { i: '4', s: '6' } },
        { step: 13, node_id: 'n6', description: 'Imprime s', variables: { i: '4', s: '6' }, output: '6' },
        { step: 14, node_id: 'n7', description: 'Fin', variables: { i: '4', s: '6' } },
      ],
    },
    sketch: (s) => {
      s.rect(X0, 70, 160, 48);
      s.text(X0 + 80, 104, 'i=1, s=0', 32, 'center');
      s.poly([[X0 + 80, 140], [X0 + 170, 185], [X0 + 80, 230], [X0 - 10, 185]]);
      s.text(X0 + 80, 195, 'i ≤ 3', 32, 'center');
      s.rect(X0 + 230, 160, 150, 48);
      s.text(X0 + 305, 194, 's = s + i', 30, 'center');
      s.path([[X0 + 305, 160], [X0 + 305, 120], [X0 + 80, 120]]);
    },
  },
  {
    module: 'flowcharts', skill: 'flowchart', exercise_type: 'code_debugger', title: 'Burbuja: una pasada',
    explanation: 'Una pasada del ordenamiento burbuja sobre un arreglo de 3 elementos.',
    data: {
      source_code: 'a = [4, 1, 3]\nfor i in range(2):\n    if a[i] > a[i+1]:\n        a[i], a[i+1] = a[i+1], a[i]\nprint(a)',
      detected_language: 'python',
      steps: [{ step_number: 1, line_number: 1, line_code: 'a = [4, 1, 3]', variable_updates: { a: '[4, 1, 3]' } }],
      final_output: '[1, 3, 4]',
      execution: [
        { step: 1, line_number: 1, description: 'Se crea el arreglo a', variables: { a: '[4, 1, 3]' } },
        { step: 2, line_number: 2, description: 'i = 0', variables: { a: '[4, 1, 3]', i: '0' } },
        { step: 3, line_number: 3, description: '¿a[0] > a[1]? 4 > 1 verdadero', variables: { a: '[4, 1, 3]', i: '0' } },
        { step: 4, line_number: 4, description: 'Intercambia a[0] y a[1]', variables: { a: '[1, 4, 3]', i: '0' } },
        { step: 5, line_number: 2, description: 'i = 1', variables: { a: '[1, 4, 3]', i: '1' } },
        { step: 6, line_number: 3, description: '¿a[1] > a[2]? 4 > 3 verdadero', variables: { a: '[1, 4, 3]', i: '1' } },
        { step: 7, line_number: 4, description: 'Intercambia a[1] y a[2]', variables: { a: '[1, 3, 4]', i: '1' } },
        { step: 8, line_number: 5, description: 'Imprime el arreglo', variables: { a: '[1, 3, 4]', i: '1' }, output: '[1, 3, 4]' },
      ],
    },
    sketch: (s) => {
      ['a = [4, 1, 3]', 'for i in range(2):', '   if a[i] > a[i+1]:', '      swap(a[i], a[i+1])', 'print(a)'].forEach((l, i) => s.text(X0, 90 + i * 46, l, 40));
      s.rect(X0 + 480, 80, 60, 50);
      s.rect(X0 + 540, 80, 60, 50);
      s.rect(X0 + 600, 80, 60, 50);
      s.text(X0 + 510, 118, '4', 38, 'center');
      s.text(X0 + 570, 118, '1', 38, 'center');
      s.text(X0 + 630, 118, '3', 38, 'center');
    },
  },
  {
    module: 'flowcharts', skill: 'flowchart', exercise_type: 'trace_table', title: 'Traza del factorial',
    explanation: 'Traza de f = f * i para i = 1..4.',
    data: {
      watched_variables: ['i', 'f'],
      rows: [
        { iteration: 0, variables: { i: '1', f: '1' }, condition_evaluated: 'i<=4 V' },
        { iteration: 1, variables: { i: '2', f: '1' }, condition_evaluated: 'i<=4 V' },
        { iteration: 2, variables: { i: '3', f: '2' }, condition_evaluated: 'i<=4 V' },
        { iteration: 3, variables: { i: '4', f: '6' }, condition_evaluated: 'i<=4 V' },
        { iteration: 4, variables: { i: '5', f: '24' }, condition_evaluated: 'i<=4 F' },
      ],
      initial_memory: { i: '1', f: '1' }, final_memory: { i: '5', f: '24' },
    },
    sketch: (s) => {
      s.text(X0, 90, 'f = 1;  i = 1', 40);
      s.text(X0, 140, 'mientras i <= 4:', 40);
      s.text(X0 + 40, 185, 'f = f * i;  i = i + 1', 40);
      s.rect(X0 + 520, 70, 200, 150);
      s.line(X0 + 620, 70, X0 + 620, 220);
      s.text(X0 + 570, 105, 'i', 36, 'center');
      s.text(X0 + 670, 105, 'f', 36, 'center');
    },
  },
  {
    module: 'flowcharts', skill: 'flowchart', exercise_type: 'recursive_flowchart', title: 'Factorial recursivo',
    explanation: 'fact(n) = n * fact(n-1), caso base n <= 1.',
    data: {
      function_name: 'fact', base_case: 'n <= 1 → 1', recursive_call: 'n * fact(n - 1)',
      call_stack_trace: ['fact(3)', 'fact(2)', 'fact(1)'],
      generated_code_py: 'def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(3))',
      execution: [
        { step: 1, line_number: 6, description: 'Se llama fact(3)', variables: { n: '3' }, call_stack: ['main', 'fact(3)'] },
        { step: 2, line_number: 4, description: '3 > 1 → llama fact(2)', variables: { n: '2' }, call_stack: ['main', 'fact(3)', 'fact(2)'] },
        { step: 3, line_number: 4, description: '2 > 1 → llama fact(1)', variables: { n: '1' }, call_stack: ['main', 'fact(3)', 'fact(2)', 'fact(1)'] },
        { step: 4, line_number: 3, description: 'Caso base: fact(1) retorna 1', variables: { n: '1', retorno: '1' }, call_stack: ['main', 'fact(3)', 'fact(2)', 'fact(1)'] },
        { step: 5, line_number: 4, description: 'fact(2) = 2 * 1 = 2', variables: { n: '2', retorno: '2' }, call_stack: ['main', 'fact(3)', 'fact(2)'] },
        { step: 6, line_number: 4, description: 'fact(3) = 3 * 2 = 6', variables: { n: '3', retorno: '6' }, call_stack: ['main', 'fact(3)'] },
        { step: 7, line_number: 6, description: 'Imprime 6', variables: { retorno: '6' }, output: '6', call_stack: ['main'] },
      ],
    },
    sketch: (s) => {
      s.text(X0, 90, 'fact(n):', 42);
      s.text(X0 + 40, 140, 'si n <= 1 → 1', 40);
      s.text(X0 + 40, 190, 'sino → n * fact(n-1)', 40);
      s.text(X0, 245, 'fact(3) = ?', 42);
    },
  },
  // ============================== MATEMÁTICAS ==============================
  {
    module: 'math', skill: 'math_geo', exercise_type: 'equation_solver', title: 'Ecuación cuadrática',
    explanation: 'Resolver x² + 2x − 3 = 0.',
    data: { equation_latex: 'x^2 + 2x - 3 = 0', equation_plain: 'x^2 + 2x - 3 = 0', equation_type: 'quadratic', discriminant_delta: 16, steps: ['Δ = 16'], solution_set: ['-3', '1'] },
    sketch: (s) => s.text(X0, 140, 'x² + 2x − 3 = 0', 72),
  },
  {
    module: 'math', skill: 'math_geo', exercise_type: 'function_graph', title: 'Gráfica de una parábola',
    explanation: 'Graficar f(x) = x² − 4x + 3.',
    data: { function_expression: 'f(x) = x^2 - 4x + 3', function_type: 'quadratic', domain: 'R', range_y: '[-1, +inf)', roots: [1, 3], y_intercept: 3, vertex: [2, -1], critical_points_explanation: '' },
    sketch: (s) => {
      s.text(X0, 120, 'f(x) = x² − 4x + 3', 66);
      s.text(X0, 190, 'Graficar', 46);
    },
  },
  {
    module: 'math', skill: 'math_geo', exercise_type: 'geometry_3d', title: 'Cilindro',
    explanation: 'Cilindro de radio 3 y altura 5.',
    data: { solid_type: 'cylinder', radius_units: 3, height_units: 5, volume_units3: 141.37, total_area_units2: 150.8, formulas_applied: [] },
    sketch: (s) => {
      s.ellipse(X0 + 80, 80, 140, 40);
      s.ellipse(X0 + 80, 250, 140, 40);
      s.line(X0 + 10, 80, X0 + 10, 250);
      s.line(X0 + 150, 80, X0 + 150, 250);
      s.text(X0 + 200, 150, 'r = 3   h = 5');
      s.text(X0 + 200, 210, 'V = ?   A = ?');
    },
  },
  {
    module: 'math', skill: 'math_geo', exercise_type: 'analytic_geometry', title: 'Distancia y pendiente',
    explanation: 'Segmento entre A(−2; 1) y B(4; 5).',
    data: { entity_type: 'points_segment', point_a: [-2, 1], point_b: [4, 5], distance: 7.21, slope_m: 0.67, midpoint: [1, 3] },
    sketch: (s) => {
      s.line(X0, 230, X0 + 260, 230);
      s.line(X0 + 80, 280, X0 + 80, 70);
      s.line(X0 + 30, 210, X0 + 220, 100);
      s.text(X0 + 300, 140, 'A(−2; 1)   B(4; 5)');
      s.text(X0 + 300, 200, 'd = ?   m = ?');
    },
  },
  {
    module: 'math', skill: 'math_geo', exercise_type: 'geometric_angles', title: 'Ángulos en un triángulo',
    explanation: 'Triángulo con ángulos de 50° y 70°; hallar x.',
    data: {
      problem_type: 'triangle_cevian', known_angles_deg: { A: 50, B: 70 }, unknown_variable: 'x', solved_value_deg: 60,
      theorem_applied: 'Suma de ángulos internos del triángulo',
      proof_steps: ['La suma de ángulos internos es 180°', '50° + 70° + x = 180°', 'x = 180° − 120°'],
    },
    sketch: (s) => {
      s.poly([[X0, 270], [X0 + 280, 270], [X0 + 110, 80]]);
      s.text(X0 + 30, 255, '50°', 34);
      s.text(X0 + 220, 255, '70°', 34);
      s.text(X0 + 100, 140, 'x', 40);
      s.text(X0 + 330, 180, 'Hallar x');
    },
  },
];

export const examplesFor = (moduleId: string) => EXAMPLES.filter((e) => e.module === moduleId);
