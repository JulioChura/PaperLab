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
  /** Qué pide el enunciado. */
  question?: string;
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
  /** Arco de ángulo (radianes, sentido de las agujas en pantalla). */
  arc(cx: number, cy: number, r: number, a0: number, a1: number) {
    this.rc.arc(cx, cy, r * 2, r * 2, Math.min(a0, a1), Math.max(a0, a1), false, this.o({ roughness: 0.6 }));
  }
  curve(pts: [number, number][], smooth = true) {
    if (smooth) this.rc.curve(pts, this.o({ roughness: 0.5 }));
    else this.path(pts);
  }
  dashed(x1: number, y1: number, x2: number, y2: number) {
    this.rc.line(x1, y1, x2, y2, this.o({ strokeLineDash: [10, 8], strokeWidth: 2.2 }));
  }
  arrow(x1: number, y1: number, x2: number, y2: number) {
    this.line(x1, y1, x2, y2);
    const a = Math.atan2(y2 - y1, x2 - x1);
    const k = 16;
    this.path([[x2 - k * Math.cos(a - 0.45), y2 - k * Math.sin(a - 0.45)], [x2, y2], [x2 - k * Math.cos(a + 0.45), y2 - k * Math.sin(a + 0.45)]]);
  }
  /** Superficie rayada (suelo, pared, techo). */
  hatch(x1: number, y1: number, x2: number, y2: number, side: 1 | -1 = 1) {
    this.line(x1, y1, x2, y2);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.floor(len / 22);
    const nx = (-(y2 - y1) / len) * side * 14;
    const ny = ((x2 - x1) / len) * side * 14;
    for (let i = 0; i <= n; i++) {
      const px = x1 + ((x2 - x1) * i) / n;
      const py = y1 + ((y2 - y1) * i) / n;
      this.rc.line(px, py, px + nx - 8, py + ny + 8 * side, this.o({ strokeWidth: 1.8 }));
    }
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
    question: ex.question ?? QUESTIONS[ex.exercise_type],
    // zona del dibujo (parte superior izquierda de la hoja) como pista para el análisis de la hoja
    bounding_boxes: [{ x: 0.16, y: 0.08, width: 0.45, height: 0.22, label: 'ejercicio' }],
  };
}

// ------------------------------------------------------------------ catálogo
const X0 = 180; // margen izquierdo del dibujo
const QUESTIONS: Record<string, string> = {
  single_loop: 'Hallar la corriente y la potencia del foco',
  series_resistors: 'Hallar la resistencia equivalente, la corriente y la caída en cada resistencia',
  parallel_resistors: 'Hallar la resistencia equivalente y la corriente en cada rama',
  interactive_switch: 'Hallar la corriente con el interruptor abierto y cerrado',
  rc_circuit: 'Hallar la constante de tiempo y la carga máxima del condensador',
  logic_gates: 'Hallar la salida S',
  sequential_flowchart: 'Ejecutar el diagrama y obtener la salida',
  conditional_flowchart: 'Determinar qué imprime el diagrama',
  loop_flowchart: 'Hallar el valor final de s',
  code_debugger: 'Ejecutar el código paso a paso y obtener la salida',
  trace_table: 'Completar la tabla de traza',
  recursive_flowchart: 'Hallar fact(3)',
  equation_solver: 'Resolver la ecuación',
  function_graph: 'Graficar la función y hallar vértice y raíces',
  geometry_3d: 'Hallar el volumen y el área total',
  analytic_geometry: 'Hallar la distancia, el punto medio y la pendiente',
  geometric_angles: 'Hallar el valor de x',
};

export const EXAMPLES: Example[] = [
  // ============================== FÍSICA ==============================
  {
    module: 'physics', skill: 'physics', exercise_type: 'inclined_plane', title: 'Plano inclinado con fricción',
    explanation: 'Bloque de 2 kg que desliza por una rampa de 30° con coeficiente de fricción cinético μ = 0.2.',
    question: 'Hallar la aceleración del bloque, la normal y la fuerza de fricción',
    data: { angle_degrees: 30, mass_kg: 2, friction_coefficient: 0.2, gravity_m_s2: 9.8, acceleration_m_s2: 3.2, weight_n: 19.6, normal_force_n: 16.97, friction_force_n: 3.39 },
    sketch: (s) => {
      // rampa: punta alta a la izquierda, ángulo θ abajo a la derecha
      const A: [number, number] = [X0, 110], B: [number, number] = [X0, 290], C: [number, number] = [X0 + 312, 290];
      s.hatch(X0 - 30, 290, X0 + 360, 290);
      s.poly([A, B, C]);
      s.rect(X0, 272, 18, 18); // ángulo recto
      const th = Math.atan2(B[1] - A[1], C[0] - A[0]);
      // bloque apoyado sobre la hipotenusa
      const t = 0.42, bx = A[0] + (C[0] - A[0]) * t, by = A[1] + (C[1] - A[1]) * t, w = 64;
      const ux = Math.cos(th), uy = Math.sin(th), nx = uy, ny = -ux;
      s.poly([[bx, by], [bx + ux * w, by + uy * w], [bx + ux * w + nx * w * 0.8, by + uy * w + ny * w * 0.8], [bx + nx * w * 0.8, by + ny * w * 0.8]]);
      s.text(bx + ux * w * 0.5 + nx * w * 0.4, by + uy * w * 0.5 + ny * w * 0.4 + 12, 'm', 36, 'center');
      s.arc(C[0], C[1], 78, Math.PI, Math.PI + th);
      s.text(C[0] - 150, C[1] - 16, '30°', 36);
      s.text(X0 + 420, 120, 'Datos:', 44);
      s.text(X0 + 440, 170, 'm = 2 kg      μ = 0.2', 42);
      s.text(X0 + 440, 220, 'θ = 30°      g = 9.8 m/s²', 42);
      s.text(X0 + 420, 280, 'Hallar: a, N y fr', 44);
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'simple_pendulum', title: 'Péndulo simple',
    explanation: 'Péndulo de 1.5 m que se suelta desde 20° respecto a la vertical.',
    question: 'Hallar el periodo de oscilación y la velocidad máxima',
    data: { length_m: 1.5, initial_angle_degrees: 20, mass_kg: 0.5, gravity_m_s2: 9.8, period_s: 2.46, max_velocity_m_s: 1.33, tension_at_lowest_point_n: 5.5 },
    sketch: (s) => {
      const px = X0 + 120, py = 90, L = 190, th = (20 * Math.PI) / 180;
      s.hatch(px - 90, py, px + 90, py, -1);
      s.dashed(px, py, px, py + L + 30);
      const bx = px + Math.sin(th) * L, by = py + Math.cos(th) * L;
      s.line(px, py, bx, by);
      s.circle(bx, by, 40);
      s.arc(px, py, 70, Math.PI / 2 - th, Math.PI / 2);
      s.text(px + 14, py + 98, 'θ', 34);
      s.text(bx + 30, py + L * 0.5, 'L', 38);
      s.text(X0 + 360, 120, 'Datos:', 44);
      s.text(X0 + 380, 170, 'L = 1.5 m     θ0 = 20°', 42);
      s.text(X0 + 380, 220, 'g = 9.8 m/s²', 42);
      s.text(X0 + 360, 280, 'Hallar: T y vmax', 44);
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'projectile_motion', title: 'Tiro parabólico',
    explanation: 'Proyectil lanzado desde el suelo con 25 m/s y 50° de elevación.',
    question: 'Hallar la altura máxima, el tiempo de vuelo y el alcance horizontal',
    data: { initial_velocity_m_s: 25, launch_angle_degrees: 50, initial_height_m: 0, gravity_m_s2: 9.8, max_height_m: 18.71, range_m: 62.81, flight_time_s: 3.91 },
    sketch: (s) => {
      // ejes y una parábola real y = x·tanθ − g·x²/(2·v0²·cos²θ), escalada
      const ox = X0, oy = 300, sx = 6.2, sy = 8.5;
      const v0 = 25, th = (50 * Math.PI) / 180, g = 9.8;
      const R = (v0 * v0 * Math.sin(2 * th)) / g;
      const H = (v0 * v0 * Math.sin(th) ** 2) / (2 * g);
      s.arrow(ox - 10, oy, ox + R * sx + 60, oy);
      s.arrow(ox, oy + 10, ox, oy - H * sy - 50);
      s.text(ox + R * sx + 64, oy + 8, 'x', 34);
      s.text(ox - 30, oy - H * sy - 46, 'y', 34);
      const pts: [number, number][] = [];
      for (let i = 0; i <= 24; i++) {
        const x = (R * i) / 24;
        const y = x * Math.tan(th) - (g * x * x) / (2 * v0 * v0 * Math.cos(th) ** 2);
        pts.push([ox + x * sx, oy - y * sy]);
      }
      s.curve(pts, true);
      s.arrow(ox, oy, ox + Math.cos(th) * 90, oy - Math.sin(th) * 90);
      s.text(ox + Math.cos(th) * 90 + 8, oy - Math.sin(th) * 90 - 4, 'v0', 34);
      s.arc(ox, oy, 48, -th, 0);
      s.text(ox + 54, oy - 16, '50°', 32);
      s.dashed(ox + (R / 2) * sx, oy, ox + (R / 2) * sx, oy - H * sy);
      s.text(ox + (R / 2) * sx + 10, oy - H * sy * 0.55, 'Hmax', 32);
      s.text(ox + R * sx - 10, oy + 36, 'R', 34);
      s.text(X0 + 520, 120, 'Datos:', 44);
      s.text(X0 + 540, 170, 'v0 = 25 m/s    θ = 50°', 42);
      s.text(X0 + 540, 220, 'g = 9.8 m/s²', 42);
      s.text(X0 + 520, 280, 'Hallar: Hmax, tv y R', 44);
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'mass_spring', title: 'Masa-resorte',
    explanation: 'Masa de 1.2 kg unida a un resorte de k = 80 N/m, estirado 0.15 m y soltado.',
    question: 'Hallar la frecuencia angular, el periodo y la fuerza máxima',
    data: { spring_constant_k_n_m: 80, mass_kg: 1.2, initial_displacement_m: 0.15, damping_coefficient: 0.3, angular_frequency_rad_s: 8.16, period_s: 0.77 },
    sketch: (s) => {
      s.hatch(X0, 120, X0, 270, 1);
      s.hatch(X0, 270, X0 + 400, 270);
      s.zigzag(X0, 225, X0 + 230, 7, 16);
      s.rect(X0 + 230, 190, 72, 72);
      s.text(X0 + 266, 238, 'm', 36, 'center');
      s.dashed(X0 + 180, 150, X0 + 180, 270);
      s.text(X0 + 160, 140, 'x = 0', 30);
      s.arrow(X0 + 180, 165, X0 + 266, 165);
      s.text(X0 + 205, 158, 'x', 30);
      s.text(X0 + 420, 120, 'Datos:', 44);
      s.text(X0 + 440, 170, 'k = 80 N/m    m = 1.2 kg', 42);
      s.text(X0 + 440, 220, 'x0 = 0.15 m', 42);
      s.text(X0 + 420, 280, 'Hallar: ω, T y Fmax', 44);
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'rectilinear_motion', title: 'MRUV',
    explanation: 'Un auto parte con 4 m/s y acelera a razón de 2 m/s² durante 6 s.',
    question: 'Hallar la velocidad final y la distancia recorrida en 6 s',
    data: { motion_type: 'MRUV', initial_position_m: 0, initial_velocity_m_s: 4, acceleration_m_s2: 2, total_time_s: 6, final_velocity_m_s: 16, distance_traveled_m: 60 },
    sketch: (s) => {
      s.line(X0 - 20, 270, X0 + 400, 270);
      for (let i = 0; i <= 4; i++) s.line(X0 + i * 95, 270, X0 + i * 95, 282);
      s.rect(X0 + 10, 205, 110, 44);
      s.rect(X0 + 35, 182, 55, 25);
      s.circle(X0 + 35, 254, 30);
      s.circle(X0 + 95, 254, 30);
      s.arrow(X0 + 130, 190, X0 + 220, 190);
      s.text(X0 + 150, 180, 'v0', 32);
      s.arrow(X0 + 130, 225, X0 + 190, 225);
      s.text(X0 + 196, 234, 'a', 32);
      s.text(X0 + 470, 120, 'Datos:', 44);
      s.text(X0 + 490, 170, 'v0 = 4 m/s    a = 2 m/s²', 42);
      s.text(X0 + 490, 220, 't = 6 s', 42);
      s.text(X0 + 470, 280, 'Hallar: v y d', 44);
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'atwood_machine', title: 'Máquina de Atwood',
    explanation: 'Polea ideal sin fricción con masas de 3 kg y 5 kg colgando a cada lado.',
    question: 'Hallar la aceleración del sistema y la tensión de la cuerda',
    data: { mass_1_kg: 3, mass_2_kg: 5, pulley_radius_m: 0.1, gravity_m_s2: 9.8, acceleration_m_s2: 2.45, tension_n: 36.75 },
    sketch: (s) => {
      const cx = X0 + 110, cy = 140, r = 44;
      s.hatch(cx - 90, 80, cx + 90, 80, -1);
      s.line(cx, 80, cx, cy);
      s.circle(cx, cy, r * 2);
      s.circle(cx, cy, 10);
      s.line(cx - r, cy, cx - r, 230);
      s.line(cx + r, cy, cx + r, 260);
      s.rect(cx - r - 28, 230, 56, 50);
      s.rect(cx + r - 32, 260, 64, 58);
      s.text(cx - r, 264, 'm1', 30, 'center');
      s.text(cx + r, 298, 'm2', 30, 'center');
      s.arrow(cx + r + 50, 250, cx + r + 50, 300);
      s.arrow(cx - r - 50, 270, cx - r - 50, 220);
      s.text(cx + r + 60, 284, 'a', 32);
      s.text(X0 + 360, 120, 'Datos:', 44);
      s.text(X0 + 380, 170, 'm1 = 3 kg    m2 = 5 kg', 42);
      s.text(X0 + 380, 220, 'g = 9.8 m/s²', 42);
      s.text(X0 + 360, 280, 'Hallar: a y T', 44);
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
      s.arc(X0, 270, 46, -Math.atan2(190, 110), 0);
      s.arc(X0 + 280, 270, 46, Math.PI, Math.PI + Math.atan2(190, 170));
      s.arc(X0 + 110, 80, 40, Math.atan2(190, 170), Math.PI - Math.atan2(190, 110));
      s.text(X0 + 56, 258, '50°', 32);
      s.text(X0 + 196, 258, '70°', 32);
      s.text(X0 + 100, 140, 'x', 40);
      s.text(X0 + 330, 180, 'Hallar x');
    },
  },
];

export const examplesFor = (moduleId: string) => EXAMPLES.filter((e) => e.module === moduleId);
