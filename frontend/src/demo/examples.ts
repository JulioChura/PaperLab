/**
 * MODO EJEMPLOS: foto de prueba (hoja dibujada a lápiz, generada en el navegador) + JSON de prueba
 * con la misma forma que devuelve el backend. Sirve para desarrollar y para la demo sin gastar
 * llamadas al analizador de imágenes.
 */
import rough from 'roughjs';
import type { ClassificationResult } from '../services/analysisApi';

export interface Example {
  /** 1 = básico, 2 = más exigente. */
  level?: 1 | 2;
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

const EXAMPLES_L1: Example[] = [
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

// ===================================================================================
// NIVEL 2: ejercicios más exigentes (mismos 23 tipos)
// ===================================================================================
const fnode = (id: string, shape: string, role: string, label: string) => ({ id, shape, role, label });
const fedge = (from: string, to: string, condition_label?: string) => ({ from_node_id: from, to_node_id: to, ...(condition_label ? { condition_label } : {}) });
const datos = (s: Sketch, x: number, lines: string[], hallar: string) => {
  s.text(x, 120, 'Datos:', 44);
  lines.forEach((l, i) => s.text(x + 20, 170 + i * 50, l, 40));
  s.text(x, 170 + lines.length * 50 + 10, `Hallar: ${hallar}`, 42);
};

const EXAMPLES_L2: Example[] = [
  // ============================== FÍSICA ==============================
  {
    module: 'physics', skill: 'physics', exercise_type: 'inclined_plane', title: 'Rampa de 37° con fricción alta',
    explanation: 'Bloque de 5 kg sobre una rampa de 37° con μ = 0.3; parte del reposo y recorre 4 m.',
    question: 'Hallar la aceleración, la fricción y el tiempo en recorrer 4 m',
    data: { angle_degrees: 37, mass_kg: 5, friction_coefficient: 0.3, gravity_m_s2: 9.8, acceleration_m_s2: 3.55, weight_n: 49, normal_force_n: 39.13, friction_force_n: 11.74 },
    sketch: (s) => {
      const A: [number, number] = [X0, 90], B: [number, number] = [X0, 300], C: [number, number] = [X0 + 280, 300];
      s.hatch(X0 - 30, 300, X0 + 330, 300);
      s.poly([A, B, C]);
      s.rect(X0, 282, 18, 18);
      const th = Math.atan2(B[1] - A[1], C[0] - A[0]);
      const ux = Math.cos(th), uy = Math.sin(th), nx = uy, ny = -ux;
      const bx = A[0] + (C[0] - A[0]) * 0.3, by = A[1] + (C[1] - A[1]) * 0.3, w = 60;
      s.poly([[bx, by], [bx + ux * w, by + uy * w], [bx + ux * w + nx * w * 0.8, by + uy * w + ny * w * 0.8], [bx + nx * w * 0.8, by + ny * w * 0.8]]);
      s.text(bx + ux * w * 0.5 + nx * w * 0.4, by + uy * w * 0.5 + ny * w * 0.4 + 12, '5kg', 28, 'center');
      s.arrow(bx + ux * 90 + nx * 20, by + uy * 90 + ny * 20, bx + ux * 170 + nx * 20, by + uy * 170 + ny * 20);
      s.text(bx + ux * 170 + nx * 40, by + uy * 170 + ny * 40, 'd = 4 m', 30);
      s.arc(C[0], C[1], 70, Math.PI, Math.PI + th);
      s.text(C[0] - 140, C[1] - 14, '37°', 34);
      datos(s, X0 + 400, ['m = 5 kg     μ = 0.3', 'θ = 37°     v0 = 0'], 'a, fr y t');
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'simple_pendulum', title: 'Péndulo de gran amplitud',
    explanation: 'Péndulo de 2.4 m y 0.8 kg soltado desde 35° (la aproximación de ángulo pequeño ya no es exacta).',
    question: 'Hallar el periodo, la velocidad máxima y la tensión en el punto más bajo',
    data: { length_m: 2.4, initial_angle_degrees: 35, mass_kg: 0.8, gravity_m_s2: 9.8, period_s: 3.11, max_velocity_m_s: 2.91, tension_at_lowest_point_n: 10.66 },
    sketch: (s) => {
      const px = X0 + 150, py = 85, L = 200, th = (35 * Math.PI) / 180;
      s.hatch(px - 110, py, px + 110, py, -1);
      s.dashed(px, py, px, py + L + 20);
      const bx = px - Math.sin(th) * L, by = py + Math.cos(th) * L;
      s.line(px, py, bx, by);
      s.circle(bx, by, 44);
      s.arc(px, py, 80, Math.PI / 2, Math.PI / 2 + th);
      s.text(px - 44, py + 110, 'θ', 34);
      s.curve([[bx, by + 10], [px - 40, py + L + 18], [px + 60, py + L + 10], [px + Math.sin(th) * L, by + 10]]);
      s.text(bx - 70, by - 20, '0.8 kg', 30);
      datos(s, X0 + 400, ['L = 2.4 m     θ0 = 35°', 'm = 0.8 kg'], 'T, vmax y Tmin');
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'projectile_motion', title: 'Lanzamiento desde un edificio',
    explanation: 'Proyectil lanzado desde 20 m de altura con 18 m/s y 30° sobre la horizontal.',
    question: 'Hallar la altura máxima, el tiempo de vuelo y el alcance al llegar al suelo',
    data: { initial_velocity_m_s: 18, launch_angle_degrees: 30, initial_height_m: 20, gravity_m_s2: 9.8, max_height_m: 24.13, range_m: 50.05, flight_time_s: 3.21 },
    sketch: (s) => {
      const ox = X0 + 60, ground = 310, h0 = 120, sx = 7.2, sy = 6.6;
      const v0 = 18, th = (30 * Math.PI) / 180, g = 9.8;
      const vx = v0 * Math.cos(th), vy = v0 * Math.sin(th);
      const tv = (vy + Math.sqrt(vy * vy + 2 * g * 20)) / g;
      s.hatch(X0 - 20, ground, X0 + 480, ground);
      s.rect(X0, ground - h0, 60, h0);
      [0, 1, 2].forEach((r) => s.rect(X0 + 15, ground - h0 + 18 + r * 32, 30, 18));
      const pts: [number, number][] = [];
      for (let i = 0; i <= 24; i++) {
        const t = (tv * i) / 24;
        pts.push([ox + vx * t * sx, ground - h0 - (vy * t - 0.5 * g * t * t) * sy]);
      }
      s.curve(pts, true);
      s.arrow(ox, ground - h0, ox + Math.cos(th) * 80, ground - h0 - Math.sin(th) * 80);
      s.arc(ox, ground - h0, 44, -th, 0);
      s.text(ox + 48, ground - h0 - 8, '30°', 30);
      s.text(X0 - 70, ground - h0 / 2, '20 m', 32);
      s.text(ox + vx * tv * sx - 10, ground + 36, 'R', 34);
      datos(s, X0 + 540, ['v0 = 18 m/s   θ = 30°', 'h0 = 20 m'], 'Hmax, tv y R');
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'mass_spring', title: 'Oscilador amortiguado',
    explanation: 'Masa de 0.8 kg en un resorte de 150 N/m, estirada 0.25 m, con amortiguamiento b = 1.2 kg/s.',
    question: 'Hallar ω, el periodo y cómo decae la amplitud',
    data: { spring_constant_k_n_m: 150, mass_kg: 0.8, initial_displacement_m: 0.25, damping_coefficient: 1.2, angular_frequency_rad_s: 13.69, period_s: 0.46 },
    sketch: (s) => {
      s.hatch(X0, 110, X0, 270, 1);
      s.hatch(X0, 270, X0 + 420, 270);
      s.zigzag(X0, 215, X0 + 250, 9, 15);
      s.rect(X0 + 250, 180, 70, 70);
      s.text(X0 + 285, 225, 'm', 34, 'center');
      // amortiguador (pistón)
      s.line(X0, 150, X0 + 90, 150);
      s.rect(X0 + 90, 135, 70, 30);
      s.line(X0 + 125, 150, X0 + 250, 150);
      s.text(X0 + 125, 128, 'b', 30, 'center');
      s.curve([[X0 + 340, 120], [X0 + 360, 90], [X0 + 380, 150], [X0 + 400, 105], [X0 + 420, 135], [X0 + 440, 118]]);
      datos(s, X0 + 480, ['k = 150 N/m   m = 0.8 kg', 'x0 = 0.25 m   b = 1.2'], 'ω, T y decaimiento');
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'rectilinear_motion', title: 'Frenado (MRUV con a < 0)',
    explanation: 'Un auto a 20 m/s frena con 2.5 m/s² hasta detenerse.',
    question: 'Hallar el tiempo de frenado y la distancia recorrida',
    data: { motion_type: 'MRUV', initial_position_m: 0, initial_velocity_m_s: 20, acceleration_m_s2: -2.5, total_time_s: 8, final_velocity_m_s: 0, distance_traveled_m: 80 },
    sketch: (s) => {
      s.line(X0 - 20, 270, X0 + 420, 270);
      for (let i = 0; i <= 4; i++) s.line(X0 + i * 100, 270, X0 + i * 100, 282);
      s.rect(X0 + 10, 205, 110, 44);
      s.rect(X0 + 35, 182, 55, 25);
      s.circle(X0 + 35, 254, 30);
      s.circle(X0 + 95, 254, 30);
      s.arrow(X0 + 130, 190, X0 + 230, 190);
      s.text(X0 + 150, 180, 'v0 = 20', 30);
      s.arrow(X0 + 220, 228, X0 + 150, 228);
      s.text(X0 + 232, 238, 'a', 32);
      s.rect(X0 + 380, 220, 14, 50);
      s.text(X0 + 360, 205, 'v = 0', 30);
      datos(s, X0 + 470, ['v0 = 20 m/s', 'a = -2.5 m/s²   vf = 0'], 't y d');
    },
  },
  {
    module: 'physics', skill: 'physics', exercise_type: 'atwood_machine', title: 'Atwood con masas cercanas',
    explanation: 'Polea ideal con masas de 4.5 kg y 6.2 kg.',
    question: 'Hallar la aceleración, la tensión y la velocidad tras 1 m de recorrido',
    data: { mass_1_kg: 4.5, mass_2_kg: 6.2, pulley_radius_m: 0.15, gravity_m_s2: 9.8, acceleration_m_s2: 1.56, tension_n: 51.08 },
    sketch: (s) => {
      const cx = X0 + 120, cy = 140, r = 50;
      s.hatch(cx - 100, 78, cx + 100, 78, -1);
      s.line(cx, 78, cx, cy);
      s.circle(cx, cy, r * 2);
      s.circle(cx, cy, 10);
      s.line(cx - r, cy, cx - r, 240);
      s.line(cx + r, cy, cx + r, 250);
      s.rect(cx - r - 30, 240, 60, 54);
      s.rect(cx + r - 33, 250, 66, 62);
      s.text(cx - r, 276, '4.5', 28, 'center');
      s.text(cx + r, 290, '6.2', 28, 'center');
      s.dashed(cx + r + 50, 250, cx + r + 50, 320);
      s.text(cx + r + 60, 300, '1 m', 30);
      datos(s, X0 + 380, ['m1 = 4.5 kg   m2 = 6.2 kg', 'd = 1 m'], 'a, T y v');
    },
  },
  // ============================== CIRCUITOS ==============================
  {
    module: 'circuits', skill: 'circuit', exercise_type: 'single_loop', title: 'LED con resistencia limitadora',
    explanation: 'Fuente de 12 V, resistencia de 48 Ω y un LED rojo en serie.',
    question: 'Hallar la corriente del LED y la potencia disipada',
    data: { voltage_v: 12, resistance_ohms: 48, current_a: 0.25, power_w: 3, has_led: true, led_color: 'red' },
    sketch: (s) => {
      s.rect(X0, 100, 340, 180);
      s.zigzag(X0 + 90, 100, X0 + 230, 4, 12);
      s.poly([[X0 + 320, 170], [X0 + 360, 170], [X0 + 340, 205]]);
      s.line(X0 + 318, 205, X0 + 362, 205);
      s.arrow(X0 + 370, 175, X0 + 400, 155);
      s.text(X0 - 10, 200, '12 V', 40, 'right');
      s.text(X0 + 160, 80, 'R = 48 Ω', 36, 'center');
      s.text(X0 + 410, 200, 'LED rojo', 36);
    },
  },
  {
    module: 'circuits', skill: 'circuit', exercise_type: 'series_resistors', title: 'Cuatro resistencias en serie',
    explanation: 'Cuatro resistencias en serie alimentadas con 24 V.',
    question: 'Hallar Req, la corriente y la caída de tensión en cada resistencia',
    data: { voltage_v: 24, resistors_ohms: [47, 100, 220, 330], equivalent_resistance_ohms: 697, current_a: 0.0344, voltage_drops_v: [1.62, 3.44, 7.57, 11.36] },
    sketch: (s) => {
      s.rect(X0, 110, 440, 170);
      [0, 1, 2].forEach((i) => s.zigzag(X0 + 35 + i * 135, 110, X0 + 115 + i * 135, 3, 10));
      s.line(X0 + 440, 110, X0 + 440, 280);
      s.zigzag(X0 + 200, 280, X0 + 290, 3, 10);
      s.text(X0 - 10, 205, '24 V', 40, 'right');
      s.text(X0 + 20, 90, '47 Ω     100 Ω     220 Ω', 34);
      s.text(X0 + 245, 322, '330 Ω', 34, 'center');
    },
  },
  {
    module: 'circuits', skill: 'circuit', exercise_type: 'parallel_resistors', title: 'Tres ramas en paralelo',
    explanation: 'Tres resistencias de 60 Ω, 30 Ω y 20 Ω en paralelo con 12 V.',
    question: 'Hallar Req, la corriente de cada rama y la corriente total',
    data: { voltage_v: 12, resistors_ohms: [60, 30, 20], equivalent_resistance_ohms: 10, branch_currents_a: [0.2, 0.4, 0.6], total_current_a: 1.2 },
    sketch: (s) => {
      s.rect(X0, 100, 400, 190);
      [140, 270].forEach((x) => s.line(X0 + x, 100, X0 + x, 290));
      s.text(X0 - 10, 205, '12 V', 40, 'right');
      s.text(X0 + 150, 200, '60 Ω', 34);
      s.text(X0 + 280, 200, '30 Ω', 34);
      s.text(X0 + 410, 200, '20 Ω', 34);
    },
  },
  {
    module: 'circuits', skill: 'circuit', exercise_type: 'interactive_switch', title: 'Interruptor cerrado',
    explanation: 'Interruptor inicialmente cerrado que controla una carga de 24 Ω con 12 V.',
    question: 'Hallar la corriente cerrado y abierto, y la potencia de la carga',
    data: { initial_state: 'closed', voltage_v: 12, load_resistance_ohms: 24, current_open_a: 0, current_closed_a: 0.5 },
    sketch: (s) => {
      s.rect(X0, 100, 340, 180);
      s.circle(X0 + 120, 100, 12);
      s.circle(X0 + 200, 100, 12);
      s.line(X0 + 120, 100, X0 + 200, 96);
      s.zigzag(X0 + 340, 150, X0 + 340, 3, 10);
      s.text(X0 - 10, 200, '12 V', 40, 'right');
      s.text(X0 + 380, 200, 'R = 24 Ω', 36);
      s.text(X0 + 160, 80, 'S (cerrado)', 32, 'center');
    },
  },
  {
    module: 'circuits', skill: 'circuit', exercise_type: 'rc_circuit', title: 'Descarga de un condensador',
    explanation: 'Condensador de 220 μF cargado a 9 V que se descarga por 4.7 kΩ.',
    question: 'Hallar τ, la carga inicial y el voltaje tras un τ',
    data: { voltage_v: 9, resistance_ohms: 4700, capacitance_uf: 220, time_constant_tau_s: 1.034, max_charge_uc: 1980, mode: 'discharging' },
    sketch: (s) => {
      s.rect(X0, 100, 340, 180);
      s.zigzag(X0 + 90, 100, X0 + 230, 4, 12);
      s.line(X0 + 310, 185, X0 + 370, 185);
      s.line(X0 + 310, 201, X0 + 370, 201);
      s.text(X0 + 300, 175, '+', 30);
      s.text(X0 + 160, 80, 'R = 4.7 kΩ', 34, 'center');
      s.text(X0 + 390, 175, 'C = 220 μF', 34);
      s.text(X0 + 390, 220, 'Vc(0) = 9 V', 34);
    },
  },
  {
    module: 'circuits', skill: 'circuit', exercise_type: 'logic_gates', title: 'Compuerta XOR',
    explanation: 'Compuerta XOR con entradas A = 1 y B = 1.',
    question: 'Hallar la salida S y completar la tabla de verdad',
    data: {
      gate_type: 'XOR', inputs: [1, 1], output: 0, boolean_expression: 'A ⊕ B',
      truth_table: [{ inputs: [0, 0], output: 0 }, { inputs: [0, 1], output: 1 }, { inputs: [1, 0], output: 1 }, { inputs: [1, 1], output: 0 }],
    },
    sketch: (s) => {
      s.curve([[X0 + 80, 110], [X0 + 100, 170], [X0 + 80, 230]]);
      s.curve([[X0 + 95, 110], [X0 + 115, 170], [X0 + 95, 230]]);
      s.curve([[X0 + 95, 110], [X0 + 190, 120], [X0 + 240, 170]]);
      s.curve([[X0 + 95, 230], [X0 + 190, 220], [X0 + 240, 170]]);
      s.line(X0, 140, X0 + 100, 140);
      s.line(X0, 200, X0 + 100, 200);
      s.line(X0 + 240, 170, X0 + 320, 170);
      s.text(X0 - 40, 150, 'A=1', 34);
      s.text(X0 - 40, 210, 'B=1', 34);
      s.text(X0 + 340, 180, 'S = ?');
    },
  },
  // ============================== ALGORITMOS ==============================
  {
    module: 'flowcharts', skill: 'flowchart', exercise_type: 'sequential_flowchart', title: 'Promedio de tres notas',
    explanation: 'Lee tres notas, calcula la suma y el promedio, e imprime.',
    question: 'Ejecutar el diagrama con a = 12, b = 15, c = 18',
    data: {
      nodes: [
        fnode('n1', 'oval', 'start', 'Inicio'), fnode('n2', 'parallelogram', 'input_output', 'Leer a, b, c'),
        fnode('n3', 'rectangle', 'process', 's = a + b + c'), fnode('n4', 'rectangle', 'process', 'p = s / 3'),
        fnode('n5', 'parallelogram', 'input_output', 'Imprimir p'), fnode('n6', 'oval', 'end', 'Fin'),
      ],
      edges: [fedge('n1', 'n2'), fedge('n2', 'n3'), fedge('n3', 'n4'), fedge('n4', 'n5'), fedge('n5', 'n6')],
      variables: ['a', 'b', 'c', 's', 'p'], generated_code_py: '', generated_code_js: '',
      execution: [
        { step: 1, node_id: 'n1', description: 'Inicio', variables: {} },
        { step: 2, node_id: 'n2', description: 'Se leen a = 12, b = 15, c = 18', variables: { a: '12', b: '15', c: '18' } },
        { step: 3, node_id: 'n3', description: 's = 12 + 15 + 18 = 45', variables: { a: '12', b: '15', c: '18', s: '45' } },
        { step: 4, node_id: 'n4', description: 'p = 45 / 3 = 15', variables: { a: '12', b: '15', c: '18', s: '45', p: '15' } },
        { step: 5, node_id: 'n5', description: 'Imprime el promedio', variables: { a: '12', b: '15', c: '18', s: '45', p: '15' }, output: '15' },
        { step: 6, node_id: 'n6', description: 'Fin', variables: { a: '12', b: '15', c: '18', s: '45', p: '15' } },
      ],
    },
    sketch: (s) => {
      s.ellipse(X0 + 100, 80, 150, 46);
      s.text(X0 + 100, 92, 'Inicio', 32, 'center');
      s.poly([[X0 + 30, 120], [X0 + 210, 120], [X0 + 180, 165], [X0, 165]]);
      s.text(X0 + 105, 152, 'Leer a, b, c', 30, 'center');
      s.rect(X0 + 20, 190, 170, 44);
      s.text(X0 + 105, 222, 's = a+b+c', 30, 'center');
      s.rect(X0 + 20, 256, 170, 44);
      s.text(X0 + 105, 288, 'p = s / 3', 30, 'center');
      [[103, 120], [165, 190], [234, 256]].forEach(([y1, y2]) => s.line(X0 + 100, y1, X0 + 100, y2));
    },
  },
  {
    module: 'flowcharts', skill: 'flowchart', exercise_type: 'conditional_flowchart', title: 'Mayor de tres números',
    explanation: 'Decisiones anidadas para obtener el mayor entre a, b y c.',
    question: 'Determinar qué imprime con a = 7, b = 12, c = 9',
    data: {
      nodes: [
        fnode('n1', 'oval', 'start', 'Inicio'), fnode('n2', 'parallelogram', 'input_output', 'Leer a, b, c'),
        fnode('n3', 'diamond', 'decision', 'a > b'), fnode('n4', 'diamond', 'decision', 'a > c'), fnode('n5', 'diamond', 'decision', 'b > c'),
        fnode('n6', 'rectangle', 'process', 'm = a'), fnode('n7', 'rectangle', 'process', 'm = c'), fnode('n8', 'rectangle', 'process', 'm = b'),
        fnode('n9', 'parallelogram', 'input_output', 'Imprimir m'), fnode('n10', 'oval', 'end', 'Fin'),
      ],
      edges: [
        fedge('n1', 'n2'), fedge('n2', 'n3'), fedge('n3', 'n4', 'Sí'), fedge('n3', 'n5', 'No'),
        fedge('n4', 'n6', 'Sí'), fedge('n4', 'n7', 'No'), fedge('n5', 'n8', 'Sí'), fedge('n5', 'n7', 'No'),
        fedge('n6', 'n9'), fedge('n7', 'n9'), fedge('n8', 'n9'), fedge('n9', 'n10'),
      ],
      decision_condition: 'a > b', true_branch_node_id: 'n4', false_branch_node_id: 'n5', generated_code_py: '', generated_code_js: '',
      execution: [
        { step: 1, node_id: 'n1', description: 'Inicio', variables: {} },
        { step: 2, node_id: 'n2', description: 'Se leen a = 7, b = 12, c = 9', variables: { a: '7', b: '12', c: '9' } },
        { step: 3, node_id: 'n3', description: '¿7 > 12? falso → rama No', variables: { a: '7', b: '12', c: '9' } },
        { step: 4, node_id: 'n5', description: '¿12 > 9? verdadero → rama Sí', variables: { a: '7', b: '12', c: '9' } },
        { step: 5, node_id: 'n8', description: 'm = b = 12', variables: { a: '7', b: '12', c: '9', m: '12' } },
        { step: 6, node_id: 'n9', description: 'Imprime el mayor', variables: { a: '7', b: '12', c: '9', m: '12' }, output: '12' },
        { step: 7, node_id: 'n10', description: 'Fin', variables: { a: '7', b: '12', c: '9', m: '12' } },
      ],
    },
    sketch: (s) => {
      s.poly([[X0 + 150, 80], [X0 + 240, 125], [X0 + 150, 170], [X0 + 60, 125]]);
      s.text(X0 + 150, 135, 'a > b', 30, 'center');
      s.poly([[X0 + 40, 200], [X0 + 120, 240], [X0 + 40, 280], [X0 - 40, 240]]);
      s.text(X0 + 40, 250, 'a > c', 28, 'center');
      s.poly([[X0 + 280, 200], [X0 + 360, 240], [X0 + 280, 280], [X0 + 200, 240]]);
      s.text(X0 + 280, 250, 'b > c', 28, 'center');
      s.line(X0 + 60, 125, X0 + 40, 200);
      s.line(X0 + 240, 125, X0 + 280, 200);
      s.text(X0 + 20, 170, 'Sí', 28);
      s.text(X0 + 270, 170, 'No', 28);
      s.text(X0 + 420, 200, 'Imprimir el mayor', 36);
    },
  },
  {
    module: 'flowcharts', skill: 'flowchart', exercise_type: 'loop_flowchart', title: 'Suma de los dígitos de 472',
    explanation: 'Bucle que separa los dígitos con % y // y los acumula.',
    question: 'Hallar la suma de los dígitos de 472',
    data: {
      nodes: [
        fnode('n1', 'oval', 'start', 'Inicio'), fnode('n2', 'rectangle', 'process', 'n = 472, s = 0'),
        fnode('n3', 'diamond', 'decision', 'n > 0'), fnode('n4', 'rectangle', 'process', 'd = n % 10'),
        fnode('n5', 'rectangle', 'process', 's = s + d'), fnode('n6', 'rectangle', 'process', 'n = n // 10'),
        fnode('n7', 'parallelogram', 'input_output', 'Imprimir s'), fnode('n8', 'oval', 'end', 'Fin'),
      ],
      edges: [fedge('n1', 'n2'), fedge('n2', 'n3'), fedge('n3', 'n4', 'Sí'), fedge('n4', 'n5'), fedge('n5', 'n6'), fedge('n6', 'n3'), fedge('n3', 'n7', 'No'), fedge('n7', 'n8')],
      loop_condition: 'n > 0', loop_variable: 'n', generated_code_py: '', generated_code_js: '',
      execution: [
        { step: 1, node_id: 'n1', description: 'Inicio', variables: {} },
        { step: 2, node_id: 'n2', description: 'n = 472, s = 0', variables: { n: '472', s: '0' } },
        { step: 3, node_id: 'n3', description: '¿472 > 0? verdadero', variables: { n: '472', s: '0' } },
        { step: 4, node_id: 'n4', description: 'd = 472 % 10 = 2', variables: { n: '472', s: '0', d: '2' } },
        { step: 5, node_id: 'n5', description: 's = 0 + 2', variables: { n: '472', s: '2', d: '2' } },
        { step: 6, node_id: 'n6', description: 'n = 472 // 10 = 47', variables: { n: '47', s: '2', d: '2' } },
        { step: 7, node_id: 'n3', description: '¿47 > 0? verdadero', variables: { n: '47', s: '2', d: '2' } },
        { step: 8, node_id: 'n4', description: 'd = 47 % 10 = 7', variables: { n: '47', s: '2', d: '7' } },
        { step: 9, node_id: 'n5', description: 's = 2 + 7', variables: { n: '47', s: '9', d: '7' } },
        { step: 10, node_id: 'n6', description: 'n = 47 // 10 = 4', variables: { n: '4', s: '9', d: '7' } },
        { step: 11, node_id: 'n3', description: '¿4 > 0? verdadero', variables: { n: '4', s: '9', d: '7' } },
        { step: 12, node_id: 'n4', description: 'd = 4 % 10 = 4', variables: { n: '4', s: '9', d: '4' } },
        { step: 13, node_id: 'n5', description: 's = 9 + 4', variables: { n: '4', s: '13', d: '4' } },
        { step: 14, node_id: 'n6', description: 'n = 4 // 10 = 0', variables: { n: '0', s: '13', d: '4' } },
        { step: 15, node_id: 'n3', description: '¿0 > 0? falso: sale del bucle', variables: { n: '0', s: '13', d: '4' } },
        { step: 16, node_id: 'n7', description: 'Imprime s', variables: { n: '0', s: '13', d: '4' }, output: '13' },
        { step: 17, node_id: 'n8', description: 'Fin', variables: { n: '0', s: '13', d: '4' } },
      ],
    },
    sketch: (s) => {
      s.rect(X0, 70, 200, 44);
      s.text(X0 + 100, 102, 'n=472, s=0', 30, 'center');
      s.poly([[X0 + 100, 135], [X0 + 190, 180], [X0 + 100, 225], [X0 + 10, 180]]);
      s.text(X0 + 100, 190, 'n > 0', 30, 'center');
      s.rect(X0 + 250, 120, 170, 40);
      s.text(X0 + 335, 150, 'd = n % 10', 28, 'center');
      s.rect(X0 + 250, 175, 170, 40);
      s.text(X0 + 335, 205, 's = s + d', 28, 'center');
      s.rect(X0 + 250, 230, 170, 40);
      s.text(X0 + 335, 260, 'n = n // 10', 28, 'center');
      s.path([[X0 + 420, 250], [X0 + 460, 250], [X0 + 460, 100], [X0 + 200, 100]]);
    },
  },
  {
    module: 'flowcharts', skill: 'flowchart', exercise_type: 'code_debugger', title: 'Invertir un arreglo (dos punteros)',
    explanation: 'Intercambia extremos con dos índices que se acercan.',
    question: 'Ejecutar paso a paso y obtener el arreglo final',
    data: {
      source_code: 'a = [1, 2, 3, 4, 5]\ni, j = 0, 4\nwhile i < j:\n    a[i], a[j] = a[j], a[i]\n    i, j = i + 1, j - 1\nprint(a)',
      detected_language: 'python', steps: [], final_output: '[5, 4, 3, 2, 1]',
      execution: [
        { step: 1, line_number: 1, description: 'Se crea el arreglo', variables: { a: '[1, 2, 3, 4, 5]' } },
        { step: 2, line_number: 2, description: 'Punteros en los extremos', variables: { a: '[1, 2, 3, 4, 5]', i: '0', j: '4' } },
        { step: 3, line_number: 3, description: '¿0 < 4? verdadero', variables: { a: '[1, 2, 3, 4, 5]', i: '0', j: '4' } },
        { step: 4, line_number: 4, description: 'Intercambia a[0] y a[4]', variables: { a: '[5, 2, 3, 4, 1]', i: '0', j: '4' } },
        { step: 5, line_number: 5, description: 'i = 1, j = 3', variables: { a: '[5, 2, 3, 4, 1]', i: '1', j: '3' } },
        { step: 6, line_number: 3, description: '¿1 < 3? verdadero', variables: { a: '[5, 2, 3, 4, 1]', i: '1', j: '3' } },
        { step: 7, line_number: 4, description: 'Intercambia a[1] y a[3]', variables: { a: '[5, 4, 3, 2, 1]', i: '1', j: '3' } },
        { step: 8, line_number: 5, description: 'i = 2, j = 2', variables: { a: '[5, 4, 3, 2, 1]', i: '2', j: '2' } },
        { step: 9, line_number: 3, description: '¿2 < 2? falso: termina', variables: { a: '[5, 4, 3, 2, 1]', i: '2', j: '2' } },
        { step: 10, line_number: 6, description: 'Imprime el arreglo invertido', variables: { a: '[5, 4, 3, 2, 1]', i: '2', j: '2' }, output: '[5, 4, 3, 2, 1]' },
      ],
    },
    sketch: (s) => {
      ['a = [1, 2, 3, 4, 5]', 'i, j = 0, 4', 'while i < j:', '   a[i], a[j] = a[j], a[i]', '   i, j = i+1, j-1', 'print(a)'].forEach((l, i) => s.text(X0, 85 + i * 42, l, 38));
      [1, 2, 3, 4, 5].forEach((v, i) => {
        s.rect(X0 + 470 + i * 56, 80, 56, 48);
        s.text(X0 + 498 + i * 56, 116, String(v), 36, 'center');
      });
      s.arrow(X0 + 498, 175, X0 + 498, 135);
      s.arrow(X0 + 722, 175, X0 + 722, 135);
      s.text(X0 + 490, 205, 'i', 34);
      s.text(X0 + 714, 205, 'j', 34);
    },
  },
  {
    module: 'flowcharts', skill: 'flowchart', exercise_type: 'trace_table', title: 'Traza de Fibonacci',
    explanation: 'a, b = 0, 1 y se repite t = a + b; a = b; b = t cinco veces.',
    question: 'Completar la tabla de traza de a, b y t',
    data: {
      watched_variables: ['a', 'b', 't'],
      rows: [
        { iteration: 0, variables: { a: '0', b: '1', t: '-' }, condition_evaluated: 'k<5 V' },
        { iteration: 1, variables: { a: '1', b: '1', t: '1' }, condition_evaluated: 'k<5 V' },
        { iteration: 2, variables: { a: '1', b: '2', t: '2' }, condition_evaluated: 'k<5 V' },
        { iteration: 3, variables: { a: '2', b: '3', t: '3' }, condition_evaluated: 'k<5 V' },
        { iteration: 4, variables: { a: '3', b: '5', t: '5' }, condition_evaluated: 'k<5 V' },
        { iteration: 5, variables: { a: '5', b: '8', t: '8' }, condition_evaluated: 'k<5 F' },
      ],
      initial_memory: { a: '0', b: '1' }, final_memory: { a: '5', b: '8', t: '8' },
    },
    sketch: (s) => {
      s.text(X0, 90, 'a = 0;  b = 1', 40);
      s.text(X0, 138, 'repetir 5 veces:', 40);
      s.text(X0 + 40, 184, 't = a + b', 40);
      s.text(X0 + 40, 230, 'a = b;   b = t', 40);
      s.rect(X0 + 470, 70, 270, 170);
      s.line(X0 + 560, 70, X0 + 560, 240);
      s.line(X0 + 650, 70, X0 + 650, 240);
      s.line(X0 + 470, 112, X0 + 740, 112);
      ['a', 'b', 't'].forEach((c, i) => s.text(X0 + 515 + i * 90, 102, c, 34, 'center'));
    },
  },
  {
    module: 'flowcharts', skill: 'flowchart', exercise_type: 'recursive_flowchart', title: 'Fibonacci recursivo',
    explanation: 'fib(n) = fib(n−1) + fib(n−2): dos llamadas recursivas por nivel.',
    question: 'Hallar fib(3) y seguir la pila de llamadas',
    data: {
      function_name: 'fib', base_case: 'n <= 1 → n', recursive_call: 'fib(n - 1) + fib(n - 2)',
      call_stack_trace: ['fib(3)', 'fib(2)', 'fib(1)', 'fib(0)', 'fib(1)'],
      generated_code_py: 'def fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nprint(fib(3))',
      execution: [
        { step: 1, line_number: 6, description: 'Se llama fib(3)', variables: { n: '3' }, call_stack: ['main', 'fib(3)'] },
        { step: 2, line_number: 4, description: '3 > 1 → llama fib(2)', variables: { n: '2' }, call_stack: ['main', 'fib(3)', 'fib(2)'] },
        { step: 3, line_number: 4, description: '2 > 1 → llama fib(1)', variables: { n: '1' }, call_stack: ['main', 'fib(3)', 'fib(2)', 'fib(1)'] },
        { step: 4, line_number: 3, description: 'Caso base: fib(1) = 1', variables: { n: '1', retorno: '1' }, call_stack: ['main', 'fib(3)', 'fib(2)', 'fib(1)'] },
        { step: 5, line_number: 4, description: 'fib(2) ahora llama fib(0)', variables: { n: '0' }, call_stack: ['main', 'fib(3)', 'fib(2)', 'fib(0)'] },
        { step: 6, line_number: 3, description: 'Caso base: fib(0) = 0', variables: { n: '0', retorno: '0' }, call_stack: ['main', 'fib(3)', 'fib(2)', 'fib(0)'] },
        { step: 7, line_number: 4, description: 'fib(2) = 1 + 0 = 1', variables: { n: '2', retorno: '1' }, call_stack: ['main', 'fib(3)', 'fib(2)'] },
        { step: 8, line_number: 4, description: 'fib(3) ahora llama fib(1)', variables: { n: '1' }, call_stack: ['main', 'fib(3)', 'fib(1)'] },
        { step: 9, line_number: 3, description: 'Caso base: fib(1) = 1', variables: { n: '1', retorno: '1' }, call_stack: ['main', 'fib(3)', 'fib(1)'] },
        { step: 10, line_number: 4, description: 'fib(3) = 1 + 1 = 2', variables: { n: '3', retorno: '2' }, call_stack: ['main', 'fib(3)'] },
        { step: 11, line_number: 6, description: 'Imprime 2', variables: { retorno: '2' }, output: '2', call_stack: ['main'] },
      ],
    },
    sketch: (s) => {
      s.text(X0, 90, 'fib(n):', 42);
      s.text(X0 + 40, 138, 'si n <= 1 → n', 40);
      s.text(X0 + 40, 186, 'sino → fib(n-1) + fib(n-2)', 40);
      s.text(X0, 240, 'fib(3) = ?', 42);
      // árbol de llamadas esbozado
      s.text(X0 + 640, 95, 'fib(3)', 32, 'center');
      s.line(X0 + 620, 105, X0 + 570, 140);
      s.line(X0 + 660, 105, X0 + 710, 140);
      s.text(X0 + 560, 165, 'fib(2)', 30, 'center');
      s.text(X0 + 720, 165, 'fib(1)', 30, 'center');
      s.line(X0 + 545, 175, X0 + 515, 205);
      s.line(X0 + 575, 175, X0 + 605, 205);
      s.text(X0 + 505, 230, 'fib(1)', 28, 'center');
      s.text(X0 + 615, 230, 'fib(0)', 28, 'center');
    },
  },
  // ============================== MATEMÁTICAS ==============================
  {
    module: 'math', skill: 'math_geo', exercise_type: 'equation_solver', title: 'Cuadrática con raíz fraccionaria',
    explanation: 'Resolver 3x² − 5x − 2 = 0.',
    question: 'Resolver la ecuación y comprobar por aspa',
    data: { equation_latex: '3x^2 - 5x - 2 = 0', equation_plain: '3x^2 - 5x - 2 = 0', equation_type: 'quadratic', discriminant_delta: 49, steps: ['Δ = 49'], solution_set: ['-1/3', '2'] },
    sketch: (s) => s.text(X0, 150, '3x² − 5x − 2 = 0', 72),
  },
  {
    module: 'math', skill: 'math_geo', exercise_type: 'function_graph', title: 'Parábola cóncava hacia abajo',
    explanation: 'Graficar f(x) = −2x² + 4x + 6.',
    question: 'Graficar y hallar vértice, raíces y corte con el eje y',
    data: { function_expression: 'f(x) = -2x^2 + 4x + 6', function_type: 'quadratic', domain: 'R', range_y: '(-inf, 8]', roots: [-1, 3], y_intercept: 6, vertex: [1, 8], critical_points_explanation: '' },
    sketch: (s) => {
      s.text(X0, 120, 'f(x) = −2x² + 4x + 6', 64);
      s.text(X0, 195, 'Vértice, raíces y gráfica', 44);
    },
  },
  {
    module: 'math', skill: 'math_geo', exercise_type: 'geometry_3d', title: 'Pirámide cuadrangular',
    explanation: 'Pirámide regular de base cuadrada de lado 6 y altura 8.',
    question: 'Hallar el volumen, la apotema y el área total',
    data: { solid_type: 'pyramid', edge_units: 6, height_units: 8, volume_units3: 96, total_area_units2: 134.88, formulas_applied: [] },
    sketch: (s) => {
      const base: [number, number][] = [[X0, 270], [X0 + 200, 270], [X0 + 260, 220], [X0 + 60, 220]];
      const apex: [number, number] = [X0 + 130, 70];
      s.path([base[0], base[1], base[2]]);
      s.line(base[0][0], base[0][1], base[3][0], base[3][1]);
      s.dashed(base[3][0], base[3][1], base[2][0], base[2][1]);
      base.forEach((b, i) => (i === 3 ? s.dashed(b[0], b[1], apex[0], apex[1]) : s.line(b[0], b[1], apex[0], apex[1])));
      s.dashed(apex[0], apex[1], apex[0], 245);
      s.text(apex[0] + 8, 170, 'h = 8', 32);
      s.text(X0 + 90, 305, 'a = 6', 32);
      s.text(X0 + 330, 160, 'V = ?   A = ?', 44);
    },
  },
  {
    module: 'math', skill: 'math_geo', exercise_type: 'analytic_geometry', title: 'Recta que pasa por dos puntos',
    explanation: 'Recta por A(−3; 4) y B(5; −2).',
    question: 'Hallar la pendiente, la ecuación de la recta, la distancia AB y el punto medio',
    data: { entity_type: 'straight_line', point_a: [-3, 4], point_b: [5, -2], distance: 10, slope_m: -0.75, midpoint: [1, 1], general_equation: '3x + 4y - 7 = 0' },
    sketch: (s) => {
      s.arrow(X0 - 10, 200, X0 + 290, 200);
      s.arrow(X0 + 110, 300, X0 + 110, 70);
      s.line(X0 + 10, 110, X0 + 280, 270);
      s.circle(X0 + 40, 128, 12);
      s.circle(X0 + 250, 252, 12);
      s.text(X0 + 330, 140, 'A(−3; 4)   B(5; −2)', 42);
      s.text(X0 + 330, 200, 'Recta AB: m = ?   y = ?', 42);
    },
  },
  {
    module: 'math', skill: 'math_geo', exercise_type: 'geometric_angles', title: 'Paralelas cortadas por una secante',
    explanation: 'L1 ∥ L2 cortadas por una secante; un ángulo mide 65° y x es su conjugado interno.',
    question: 'Hallar el valor de x',
    data: {
      problem_type: 'parallel_transversal', known_angles_deg: { α: 65 }, unknown_variable: 'x', solved_value_deg: 115,
      theorem_applied: 'Ángulos conjugados internos suman 180°',
      proof_steps: ['L1 ∥ L2: los conjugados internos son suplementarios', '65° + x = 180°', 'x = 180° − 65°'],
    },
    sketch: (s) => {
      s.line(X0, 120, X0 + 380, 120);
      s.line(X0, 250, X0 + 380, 250);
      s.text(X0 + 390, 128, 'L1', 32);
      s.text(X0 + 390, 258, 'L2', 32);
      s.line(X0 + 110, 300, X0 + 270, 70);
      const at = (y: number) => X0 + 110 + ((300 - y) / 230) * 160;
      const a = Math.atan2(-230, 160);
      s.arc(at(120), 120, 40, 0, a + Math.PI);
      s.text(at(120) + 44, 112, '65°', 32);
      s.arc(at(250), 250, 40, a, 0);
      s.text(at(250) + 44, 242, 'x', 34);
      s.text(X0 + 470, 190, 'L1 ∥ L2.  Hallar x', 42);
    },
  },
];

export const EXAMPLES: Example[] = [
  ...EXAMPLES_L1.map((e) => ({ ...e, level: 1 as const })),
  ...EXAMPLES_L2.map((e) => ({ ...e, level: 2 as const })),
];

export const examplesFor = (moduleId: string, level: 1 | 2 = 1) =>
  EXAMPLES.filter((e) => e.module === moduleId && e.level === level);

