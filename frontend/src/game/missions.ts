/**
 * MODO RETO / MISIONES: el sistema propone un reto que el alumno resuelve DIBUJANDO en su cuaderno.
 * La IA lee el dibujo y aquí se evalúa, de forma determinística (recalculando la física con los datos
 * de entrada), si la propuesta cumple la condición. Así nunca se aprueba un resultado mal calculado.
 */
import type { ClassificationResult } from '../services/analysisApi';

export type ModuleId = 'physics' | 'circuits' | 'flowcharts' | 'math';

export interface MissionResult {
  ok: boolean;
  /** Lo que dice el tutor (logro o lo que falta). */
  detail: string;
  /** Pregunta socrática para guiar el siguiente intento (si falló). */
  challenge?: string;
  /** Medida clave para mostrarla (ej: "Alcance: 11.8 m"). */
  measure?: string;
}

export interface Mission {
  id: string;
  module: ModuleId;
  title: string;
  /** Qué debe dibujar el alumno. */
  brief: string;
  /** Condición física que se comprueba. */
  goal: string;
  xp: number;
  difficulty: 1 | 2 | 3;
  exerciseTypes: string[];
  hint: string;
  /** Errores del tutor que en esta misión son justamente el objetivo (no se muestran como advertencia). */
  expectedMistakes?: string[];
  evaluate(r: ClassificationResult): MissionResult;
}

const n = (v: unknown, fb = NaN) => {
  const x = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(x) ? x : fb;
};
const f = (v: number, d = 2) => (Number.isFinite(v) ? String(parseFloat(v.toFixed(d))) : '—');
const DEG = Math.PI / 180;

function wrongType(m: Mission, r: ClassificationResult): MissionResult | null {
  if (m.exerciseTypes.includes(r.exercise_type)) return null;
  return {
    ok: false,
    detail: `Esta misión pide ${m.brief.charAt(0).toLowerCase()}${m.brief.slice(1)} Pero reconocí «${r.exercise_name}».`,
    challenge: '¿Qué elementos tiene que tener tu dibujo para que lo reconozca como el tipo de ejercicio que pide la misión?',
  };
}

const projectileRange = (d: Record<string, unknown>) => {
  const g = n(d.gravity_m_s2, 9.8);
  const v0 = n(d.initial_velocity_m_s, 0);
  const th = n(d.launch_angle_degrees, 45) * DEG;
  const h0 = Math.max(0, n(d.initial_height_m, 0));
  const vy = v0 * Math.sin(th);
  const tv = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * h0))) / g;
  return v0 * Math.cos(th) * tv;
};

export const MISSIONS: Mission[] = [
  // ------------------------------------------------------------------ física
  {
    id: 'physics_flag_12m',
    module: 'physics',
    title: 'La bandera a 12 metros',
    brief: 'Dibuja un tiro parabólico que alcance exactamente la bandera a 12 m de distancia.',
    goal: 'Alcance horizontal R = 12 m (± 0.5 m)',
    xp: 100,
    difficulty: 2,
    exerciseTypes: ['projectile_motion'],
    hint: 'R = v0²·sen(2θ)/g. Con θ = 45° necesitas v0 = √(12·9.8) ≈ 10.8 m/s.',
    evaluate(r) {
      const bad = wrongType(this, r);
      if (bad) return bad;
      const R = projectileRange(r.parameters);
      const ok = Math.abs(R - 12) <= 0.5;
      return ok
        ? { ok, measure: `Alcance: ${f(R)} m`, detail: `¡Diana! Tu proyectil cae a ${f(R)} m: justo en la bandera.` }
        : {
            ok,
            measure: `Alcance: ${f(R)} m`,
            detail: `Tu proyectil cae a ${f(R)} m: ${R < 12 ? `te faltan ${f(12 - R)} m` : `te pasas por ${f(R - 12)} m`}.`,
            challenge: R < 12
              ? '¿Qué podrías cambiar, la rapidez o el ángulo, para que llegue más lejos? ¿Qué ángulo da el máximo alcance?'
              : '¿Qué ocurre con el alcance si reduces un poco la rapidez de lanzamiento?',
          };
    },
  },
  {
    id: 'physics_pendulum_2s',
    module: 'physics',
    title: 'El péndulo que marca segundos',
    brief: 'Dibuja un péndulo simple cuyo período sea de 2 segundos (un "tic" por segundo).',
    goal: 'Período T = 2.00 s (± 0.05 s)',
    xp: 100,
    difficulty: 2,
    exerciseTypes: ['simple_pendulum'],
    hint: 'T = 2π√(L/g): despeja L = g·T²/(4π²).',
    evaluate(r) {
      const bad = wrongType(this, r);
      if (bad) return bad;
      const L = n(r.parameters.length_m, 0);
      const T = 2 * Math.PI * Math.sqrt(Math.max(L, 0) / n(r.parameters.gravity_m_s2, 9.8));
      const ok = Math.abs(T - 2) <= 0.05;
      return ok
        ? { ok, measure: `T = ${f(T)} s`, detail: `¡Perfecto! Con L = ${f(L)} m tu péndulo marca ${f(T)} s por oscilación.` }
        : {
            ok,
            measure: `T = ${f(T)} s`,
            detail: `Tu péndulo tarda ${f(T)} s por oscilación.`,
            challenge: `Si el período depende de √L, ¿tu hilo debería ser más ${T < 2 ? 'largo' : 'corto'}? ¿Cuánto exactamente?`,
          };
    },
  },
  {
    id: 'physics_ramp_still',
    module: 'physics',
    title: 'El bloque que no se rinde',
    brief: 'Dibuja un plano inclinado de al menos 20° donde el bloque NO deslice.',
    goal: 'θ ≥ 20° y μ ≥ tan θ (equilibrio estático)',
    xp: 120,
    difficulty: 3,
    exerciseTypes: ['inclined_plane'],
    hint: 'El bloque se queda quieto si μ ≥ tan θ. Para 25°, tan 25° ≈ 0.47.',
    expectedMistakes: ['static_friction'],
    evaluate(r) {
      const bad = wrongType(this, r);
      if (bad) return bad;
      const th = n(r.parameters.angle_degrees, 0);
      const mu = n(r.parameters.static_friction_coefficient, n(r.parameters.friction_coefficient, 0));
      const tan = Math.tan(th * DEG);
      if (th < 20) return { ok: false, measure: `θ = ${f(th, 1)}°`, detail: `Tu rampa tiene ${f(th, 1)}°; la misión pide al menos 20°.`, challenge: '¿Se vuelve más fácil o más difícil frenar el bloque al aumentar la pendiente?' };
      const ok = mu >= tan - 1e-9;
      return ok
        ? { ok, measure: `μ = ${f(mu)} ≥ tan θ = ${f(tan)}`, detail: `¡Lo lograste! μ = ${f(mu)} supera a tan ${f(th, 0)}° = ${f(tan)}: la fricción sostiene al bloque.` }
        : { ok, measure: `μ = ${f(mu)} < tan θ = ${f(tan)}`, detail: `El bloque desliza: μ = ${f(mu)} no alcanza a tan ${f(th, 0)}° = ${f(tan)}.`, challenge: '¿Qué valor mínimo de μ necesitas para esa pendiente?' };
    },
  },
  // ------------------------------------------------------------------ circuitos
  {
    id: 'circuit_switch_one_led',
    module: 'circuits',
    title: 'Un interruptor, dos destinos',
    brief: 'Diseña un circuito donde un interruptor apague un LED pero deje el otro encendido.',
    goal: 'Dos focos en paralelo; el segundo con su propio interruptor S2',
    xp: 120,
    difficulty: 3,
    exerciseTypes: ['interactive_switch', 'parallel_resistors'],
    hint: 'Pon los dos focos en ramas paralelas y el interruptor S2 SOLO en la rama del segundo.',
    evaluate(r) {
      const bad = wrongType(this, r);
      if (bad) return bad;
      const d = r.parameters;
      if (r.exercise_type === 'interactive_switch' && n(d.second_load_ohms, 0) > 0 && d.second_switch_state) {
        return { ok: true, measure: 'S2 controla solo el foco 2', detail: '¡Exacto! Al abrir S2 se apaga el foco 2, pero el foco 1 sigue encendido porque su rama no se interrumpe.' };
      }
      return {
        ok: false,
        detail: r.exercise_type === 'parallel_resistors'
          ? 'Tienes las ramas en paralelo, pero falta el interruptor que controle solo una de ellas.'
          : 'Tu interruptor corta TODO el circuito: al abrirlo se apagan ambos focos.',
        challenge: 'Si el interruptor está en el tramo que comparten los dos focos, ¿qué pasa con el otro al abrirlo? ¿Dónde lo pondrías?',
      };
    },
  },
  {
    id: 'circuit_safe_led',
    module: 'circuits',
    title: 'LED a salvo',
    brief: 'Dibuja una malla simple con un LED y elige la resistencia para que circulen entre 10 y 25 mA.',
    goal: '10 mA ≤ I ≤ 25 mA',
    xp: 100,
    difficulty: 2,
    exerciseTypes: ['single_loop'],
    hint: 'I = V/R. Con 9 V, una resistencia de 390 Ω da unos 23 mA.',
    evaluate(r) {
      const bad = wrongType(this, r);
      if (bad) return bad;
      const V = n(r.parameters.voltage_v, 0);
      const R = n(r.parameters.resistance_ohms, 0) + Math.max(0, n(r.parameters.internal_resistance_ohms, 0));
      if (r.parameters.circuit_closed === false) return { ok: false, detail: 'Tu malla está abierta: no circula corriente.', challenge: '¿Qué le falta al circuito para que los electrones vuelvan a la batería?' };
      const I = R > 0 ? (V / R) * 1000 : Infinity;
      const ok = I >= 10 && I <= 25;
      return ok
        ? { ok, measure: `I = ${f(I, 1)} mA`, detail: `¡LED protegido! Circulan ${f(I, 1)} mA: brilla sin quemarse.` }
        : { ok, measure: Number.isFinite(I) ? `I = ${f(I, 1)} mA` : 'I → ∞', detail: I > 25 ? `Pasan ${Number.isFinite(I) ? f(I, 1) : 'muchísimos'} mA: el LED se quemaría.` : `Solo pasan ${f(I, 1)} mA: el LED apenas brillaría.`, challenge: `¿Necesitas una resistencia mayor o menor? ¿Qué valor da 20 mA con ${f(V)} V?` };
    },
  },
  // ------------------------------------------------------------------ algoritmos
  {
    id: 'flow_sum_1_10',
    module: 'flowcharts',
    title: 'La suma de Gauss',
    brief: 'Dibuja un diagrama de flujo con un bucle que sume los números del 1 al 10 e imprima el resultado.',
    goal: 'La salida del algoritmo debe ser 55',
    xp: 100,
    difficulty: 2,
    exerciseTypes: ['loop_flowchart'],
    hint: 'Usa un contador i que vaya de 1 a 10 y un acumulador s = s + i.',
    evaluate(r) {
      const bad = wrongType(this, r);
      if (bad) return bad;
      const steps = (Array.isArray(r.parameters.execution) ? r.parameters.execution : []) as { output?: string; variables?: Record<string, string> }[];
      const outputs = steps.map((s) => String(s.output ?? '').trim()).filter(Boolean);
      const last = outputs[outputs.length - 1];
      const ok = outputs.some((o) => /(^|\D)55(\D|$)/.test(o));
      return ok
        ? { ok, measure: 'Salida: 55', detail: '¡Como el joven Gauss! Tu bucle suma 1 + 2 + … + 10 = 55.' }
        : { ok, measure: last ? `Salida: ${last}` : 'Sin salida', detail: last ? `Tu algoritmo imprime ${last}, no 55.` : 'Tu algoritmo no imprime ningún resultado.', challenge: '¿Desde qué valor empieza tu contador y en cuál se detiene? ¿Entra el 10 en la suma?' };
    },
  },
  {
    id: 'flow_even_odd',
    module: 'flowcharts',
    title: '¿Par o impar?',
    brief: 'Dibuja un diagrama que lea un número y muestre si es par o impar.',
    goal: 'Una decisión que use el residuo de dividir entre 2',
    xp: 80,
    difficulty: 1,
    exerciseTypes: ['conditional_flowchart'],
    hint: 'Un número es par si n mod 2 = 0 (en código: n % 2 == 0).',
    evaluate(r) {
      const bad = wrongType(this, r);
      if (bad) return bad;
      const cond = String(r.parameters.decision_condition ?? '');
      const labels = (Array.isArray(r.parameters.nodes) ? r.parameters.nodes : []).map((x) => String((x as { label?: string }).label ?? '')).join(' ');
      const ok = /(%|mod|residuo|resto)\s*2/i.test(`${cond} ${labels}`);
      return ok
        ? { ok, measure: `Condición: ${cond}`, detail: '¡Bien! El residuo de dividir entre 2 decide si el número es par.' }
        : { ok, measure: cond ? `Condición: ${cond}` : undefined, detail: 'Tu decisión no comprueba la paridad del número.', challenge: '¿Qué tienen en común 4, 10 y 36 cuando los divides entre 2?' };
    },
  },
  // ------------------------------------------------------------------ matemáticas
  {
    id: 'math_vertex',
    module: 'math',
    title: 'Vértice en (2, −1)',
    brief: 'Escribe y grafica una parábola cuyo vértice esté exactamente en el punto (2, −1).',
    goal: 'Vértice V = (2, −1)',
    xp: 100,
    difficulty: 2,
    exerciseTypes: ['function_graph'],
    hint: 'Usa la forma canónica f(x) = a(x − h)² + k con h = 2 y k = −1.',
    evaluate(r) {
      const bad = wrongType(this, r);
      if (bad) return bad;
      const v = Array.isArray(r.parameters.vertex) ? r.parameters.vertex.map((x) => n(x)) : null;
      if (!v || r.parameters.function_type !== 'quadratic') return { ok: false, detail: 'Tu función no es una parábola con vértice.', challenge: '¿Qué grado debe tener el polinomio para que su gráfica tenga vértice?' };
      const ok = Math.abs(v[0] - 2) < 1e-6 && Math.abs(v[1] + 1) < 1e-6;
      return ok
        ? { ok, measure: 'V = (2, −1)', detail: '¡Precisión matemática! Tu parábola tiene el vértice justo en (2, −1).' }
        : { ok, measure: `V = (${f(v[0])}, ${f(v[1])})`, detail: `Tu vértice está en (${f(v[0])}, ${f(v[1])}).`, challenge: 'En f(x) = a(x − h)² + k, ¿qué papel cumplen h y k?' };
    },
  },
  {
    id: 'math_liter_can',
    module: 'math',
    title: 'La lata de un litro',
    brief: 'Dibuja un cilindro (medidas en cm) que tenga 1 litro de capacidad.',
    goal: 'V = π·r²·h = 1000 cm³ (± 3 %)',
    xp: 120,
    difficulty: 3,
    exerciseTypes: ['geometry_3d'],
    hint: '1 L = 1000 cm³. Con r = 5 cm necesitas h = 1000/(π·25) ≈ 12.7 cm.',
    evaluate(r) {
      const bad = wrongType(this, r);
      if (bad) return bad;
      if (r.parameters.solid_type !== 'cylinder') return { ok: false, detail: 'La misión pide un cilindro.', challenge: '¿Qué sólido tiene dos bases circulares paralelas?' };
      const rad = n(r.parameters.radius_units, 0);
      const h = n(r.parameters.height_units, 0);
      const V = Math.PI * rad * rad * h;
      const ok = Math.abs(V - 1000) <= 30;
      return ok
        ? { ok, measure: `V = ${f(V, 0)} cm³`, detail: `¡Lata lista! π·${f(rad)}²·${f(h)} = ${f(V, 0)} cm³ ≈ 1 litro.` }
        : { ok, measure: `V = ${f(V, 0)} cm³`, detail: `Tu cilindro guarda ${f(V, 0)} cm³, ${V < 1000 ? 'le falta' : 'le sobra'} ${f(Math.abs(1000 - V), 0)} cm³.`, challenge: '¿Qué crece más rápido el volumen: si duplicas el radio o si duplicas la altura?' };
    },
  },
];

export const missionById = (id: string | null | undefined) => MISSIONS.find((m) => m.id === id) ?? null;
export const missionsFor = (module: string) => MISSIONS.filter((m) => m.module === module);

/** Misión del día (rota según la fecha): da el doble de XP. */
export function dailyMissionId(date = new Date()): string {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return MISSIONS[day % MISSIONS.length].id;
}
