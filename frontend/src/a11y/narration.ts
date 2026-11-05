/**
 * Narrador STEM: convierte la simulación (datos validados, pasos de la solución y telemetría en vivo)
 * en un texto natural en español para leerlo en voz alta.
 * Pensado para estudiantes con baja visión, dislexia o dificultades de lectura.
 */
import type { MathToken, SolutionPlan } from '../ar/mathEngine';
import type { Readout } from '../sims/types';
import type { TutorFeedback } from '../tutor/types';

const n = (v: unknown, fb = NaN): number => {
  const x = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : NaN;
  return Number.isFinite(x) ? x : fb;
};

/** Número legible en voz: 2 decimales como máximo y coma decimal. */
export function sayNum(v: number, d = 2): string {
  if (!Number.isFinite(v)) return 'un valor indefinido';
  const r = Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(parseFloat(v.toFixed(d)));
  return r.replace('.', ',').replace(/^-/, 'menos ');
}

const plural = (v: number, one: string, many: string) => (Math.abs(v - 1) < 1e-9 ? one : many);

/** Longitud en la unidad más natural (25 centímetros en vez de 0,25 metros). */
function sayLength(m: number): string {
  if (Math.abs(m) < 1) return `${sayNum(m * 100, 1)} centímetros`;
  return `${sayNum(m)} ${plural(m, 'metro', 'metros')}`;
}

const DEG = Math.PI / 180;

/** Descripción natural del fenómeno según el tipo de ejercicio (recalculada con los datos de entrada). */
export function describeExercise(type: string, d: Record<string, unknown>): string {
  const g = n(d.gravity_m_s2, 9.8);
  switch (type) {
    case 'simple_pendulum': {
      const L = Math.max(0.01, n(d.length_m, 1));
      const th = Math.abs(n(d.initial_angle_degrees, 15));
      const T = 2 * Math.PI * Math.sqrt(L / g);
      const vmax = Math.sqrt(2 * g * L * (1 - Math.cos(th * DEG)));
      return `El péndulo de ${sayLength(L)} oscila con un período de ${sayNum(T)} ${plural(T, 'segundo', 'segundos')}. Su velocidad máxima es de ${sayNum(vmax)} metros por segundo en el punto de equilibrio.`;
    }
    case 'inclined_plane': {
      const th = n(d.angle_degrees, 30);
      const mu = n(d.friction_coefficient, 0);
      const a = g * (Math.sin(th * DEG) - mu * Math.cos(th * DEG));
      return a > 0
        ? `Un bloque de ${sayNum(n(d.mass_kg, 1))} kilogramos desliza por una rampa de ${sayNum(th)} grados con coeficiente de fricción ${sayNum(mu)}. Acelera a ${sayNum(a)} metros por segundo al cuadrado.`
        : `Un bloque de ${sayNum(n(d.mass_kg, 1))} kilogramos reposa sobre una rampa de ${sayNum(th)} grados: la fricción de ${sayNum(mu)} es suficiente para que no deslice.`;
    }
    case 'projectile_motion': {
      const v0 = n(d.initial_velocity_m_s, 20);
      const ang = n(d.launch_angle_degrees, 45);
      const h0 = Math.max(0, n(d.initial_height_m, 0));
      const vy = v0 * Math.sin(ang * DEG);
      const vx = v0 * Math.cos(ang * DEG);
      const tv = (vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * h0))) / g;
      return `Se lanza un proyectil a ${sayNum(v0)} metros por segundo con ${sayNum(ang)} grados de elevación${h0 ? ` desde ${sayNum(h0)} metros de altura` : ''}. Sube hasta ${sayNum(h0 + (vy * vy) / (2 * g))} metros, vuela durante ${sayNum(tv)} segundos y cae a ${sayNum(vx * tv)} metros del punto de lanzamiento.`;
    }
    case 'mass_spring': {
      const k = Math.max(0.01, n(d.spring_constant_k_n_m, 50));
      const m = Math.max(0.01, n(d.mass_kg, 1));
      const w = Math.sqrt(k / m);
      return `Una masa de ${sayNum(m)} kilogramos unida a un resorte de ${sayNum(k)} newtons por metro oscila con una frecuencia angular de ${sayNum(w)} radianes por segundo y un período de ${sayNum((2 * Math.PI) / w)} segundos.`;
    }
    case 'rectilinear_motion': {
      const v0 = n(d.initial_velocity_m_s, 0);
      const a = d.motion_type === 'MRU' ? 0 : n(d.acceleration_m_s2, 0);
      const T = n(d.total_time_s, 5);
      return a === 0
        ? `Un móvil avanza con velocidad constante de ${sayNum(v0)} metros por segundo. En ${sayNum(T)} segundos recorre ${sayNum(Math.abs(v0 * T))} metros.`
        : `Un móvil parte con ${sayNum(v0)} metros por segundo y acelera a ${sayNum(a)} metros por segundo al cuadrado. A los ${sayNum(T)} segundos va a ${sayNum(v0 + a * T)} metros por segundo.`;
    }
    case 'atwood_machine': {
      const m1 = n(d.mass_1_kg, 2);
      const m2 = n(d.mass_2_kg, 3);
      const a = (Math.abs(m2 - m1) * g) / (m1 + m2);
      return `En la máquina de Atwood cuelgan masas de ${sayNum(m1)} y ${sayNum(m2)} kilogramos. ${a < 1e-9 ? 'Como son iguales, el sistema queda en equilibrio.' : `Baja la masa de ${sayNum(Math.max(m1, m2))} kilogramos con una aceleración de ${sayNum(a)} metros por segundo al cuadrado.`}`;
    }
    case 'single_loop': {
      const V = n(d.voltage_v, 9);
      const R = n(d.resistance_ohms, 100);
      if (d.circuit_closed === false) return `La malla está abierta: aunque la fuente tiene ${sayNum(V)} voltios, no circula corriente.`;
      if (R <= 0) return `La fuente de ${sayNum(V)} voltios está en cortocircuito: sus bornes se unen sin ninguna carga.`;
      return `Una fuente de ${sayNum(V)} voltios alimenta una resistencia de ${sayNum(R)} ohmios. Circula una corriente de ${sayNum(V / R, 3)} amperios y se disipan ${sayNum((V * V) / R)} vatios.`;
    }
    case 'series_resistors': {
      const Rs = (Array.isArray(d.resistors_ohms) ? d.resistors_ohms : []).map((x) => n(x, 0));
      const Req = Rs.reduce((s, r) => s + r, 0);
      const V = n(d.voltage_v, 12);
      return `${Rs.length} resistencias en serie suman ${sayNum(Req)} ohmios. Con ${sayNum(V)} voltios circula una sola corriente de ${sayNum(V / Req, 3)} amperios por todas ellas.`;
    }
    case 'parallel_resistors': {
      const Rs = (Array.isArray(d.resistors_ohms) ? d.resistors_ohms : []).map((x) => n(x, 1));
      const Req = 1 / Rs.reduce((s, r) => s + 1 / r, 0);
      const V = n(d.voltage_v, 6);
      return `${Rs.length} resistencias en paralelo equivalen a ${sayNum(Req)} ohmios. Todas reciben ${sayNum(V)} voltios y la fuente entrega ${sayNum(V / Req, 3)} amperios en total; por la rama de menor resistencia pasa más corriente.`;
    }
    case 'interactive_switch': {
      const V = n(d.voltage_v, 9);
      const R = n(d.load_resistance_ohms, 100);
      return `El interruptor controla el foco. Cerrado, circulan ${sayNum(V / R, 3)} amperios; abierto, la corriente cae a cero. Puedes tocar el interruptor para probarlo.`;
    }
    case 'rc_circuit': {
      const tau = n(d.resistance_ohms, 1000) * n(d.capacitance_uf, 100) * 1e-6;
      return `El condensador se ${d.mode === 'discharging' ? 'descarga' : 'carga'} a través de la resistencia con una constante de tiempo de ${sayNum(tau, 3)} segundos. Tras unas cinco constantes de tiempo, el proceso está prácticamente completo.`;
    }
    case 'logic_gates':
      return `Compuerta lógica ${String(d.gate_type ?? '')}${d.boolean_expression ? ` con expresión ${String(d.boolean_expression)}` : ''}. La salida actual es ${n(d.output, 0) ? 'uno, encendida' : 'cero, apagada'}.`;
    case 'equation_solver': {
      const sol = (Array.isArray(d.solution_set) ? d.solution_set : []).map(String);
      return `Se resuelve la ecuación ${String(d.equation_plain ?? d.equation_latex ?? '')}. ${sol.length ? `El conjunto solución es ${sol.join(' y ')}.` : ''}`;
    }
    case 'function_graph':
      return `Se grafica ${String(d.function_expression ?? 'la función')}.${Array.isArray(d.vertex) ? ` Su vértice está en ${sayNum(n(d.vertex[0]))} coma ${sayNum(n(d.vertex[1]))}.` : ''}${Array.isArray(d.roots) && d.roots.length ? ` Corta al eje x en ${d.roots.map((r) => sayNum(n(r))).join(' y ')}.` : ''}`;
    case 'geometry_3d':
      return `Sólido geométrico: ${({ cylinder: 'cilindro', cone: 'cono', sphere: 'esfera', prism: 'prisma', pyramid: 'pirámide' } as Record<string, string>)[String(d.solid_type)] ?? String(d.solid_type)}. Su volumen es ${sayNum(n(d.volume_units3))} unidades cúbicas.`;
    case 'analytic_geometry':
      return `Geometría analítica en el plano cartesiano${Array.isArray(d.point_a) && Array.isArray(d.point_b) ? ` entre los puntos A y B; la distancia es ${sayNum(n(d.distance))}` : ''}.`;
    case 'geometric_angles':
      return `Problema de ángulos: se busca ${String(d.unknown_variable ?? 'x')} aplicando ${String(d.theorem_applied ?? 'propiedades geométricas')}. El resultado es ${sayNum(n(d.solved_value_deg))} grados.`;
    default:
      return '';
  }
}

/** Unidades, símbolos y fórmulas → palabras. */
export function humanize(text: string): string {
  return ` ${text} `
    .replace(/–|−/g, '-')
    .replace(/m\/s\^?2|m\/s²/g, ' metros por segundo al cuadrado')
    .replace(/rad\/s/g, ' radianes por segundo')
    .replace(/N\/m/g, ' newtons por metro')
    .replace(/m\/s/g, ' metros por segundo')
    .replace(/μF/g, ' microfaradios')
    .replace(/μC/g, ' microculombios')
    .replace(/(\d)\s*Ω/g, '$1 ohmios')
    .replace(/Ω/g, ' ohmios')
    .replace(/(\d)\s*kg\b/g, '$1 kilogramos')
    .replace(/(\d)\s*cm\b/g, '$1 centímetros')
    .replace(/(\d)\s*Hz\b/g, '$1 hercios')
    .replace(/(\d)\s*N\b/g, '$1 newtons')
    .replace(/(\d)\s*V\b/g, '$1 voltios')
    .replace(/(\d)\s*A\b/g, '$1 amperios')
    .replace(/(\d)\s*W\b/g, '$1 vatios')
    .replace(/(\d)\s*m\b/g, '$1 metros')
    .replace(/(\d)\s*s\b/g, '$1 segundos')
    .replace(/(\d)\s*%/g, '$1 por ciento')
    .replace(/°/g, ' grados')
    .replace(/\^2|²/g, ' al cuadrado')
    .replace(/\^3|³/g, ' al cubo')
    .replace(/\^/g, ' elevado a ')
    .replace(/√/g, ' raíz de ')
    .replace(/θ0|θ₀/g, 'theta cero')
    .replace(/θ/g, 'theta')
    .replace(/μ/g, 'mu')
    .replace(/ω/g, 'omega')
    .replace(/τ/g, 'tau')
    .replace(/Δ/g, 'delta')
    .replace(/π/g, 'pi')
    .replace(/≈/g, ' aproximadamente ')
    .replace(/≥/g, ' mayor o igual que ')
    .replace(/≤/g, ' menor o igual que ')
    .replace(/→/g, ', entonces ')
    .replace(/[·×]/g, ' por ')
    .replace(/(\d)\.(\d)/g, '$1,$2')
    .replace(/\s-\s/g, ' menos ')
    .replace(/\s=\s/g, ' igual a ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokensToText(tokens: MathToken[]): string {
  return tokens
    .map((t) => {
      switch (t.k) {
        case 't':
          return t.s;
        case 'sup':
          return t.s === '2' ? '²' : t.s === '3' ? '³' : `^${t.s}`;
        case 'sub':
          return t.s;
        case 'frac':
          return `${tokensToText(t.num)} entre ${tokensToText(t.den)}`;
        case 'sqrt':
          return `√(${tokensToText(t.body)})`;
        case 'delta':
          return 'Δ';
        case 'approx':
          return '≈';
        case 'empty':
          return 'conjunto vacío';
        case 'gap':
          return ' ';
      }
    })
    .join('');
}

export interface NarrationInput {
  exerciseType: string;
  data: Record<string, unknown>;
  plan: SolutionPlan;
  readouts: Readout[];
  question?: string;
  tutor?: TutorFeedback;
}

const LABELS: Record<string, string> = {
  a: 'aceleración', v: 'velocidad', t: 'tiempo', N: 'fuerza normal', x: 'posición', y: 'altura', d: 'distancia',
  I: 'corriente', 'I total': 'corriente total', Req: 'resistencia equivalente', ω: 'frecuencia angular', τ: 'tau',
  Vc: 'voltaje del condensador', Q: 'carga', θ: 'ángulo', tv: 'tiempo de vuelo', Paso: 'paso', S: 'salida',
  'V bornes': 'voltaje en bornes', 'P en R': 'potencia en la resistencia', xB: 'posición del móvil B', m: 'masa',
};

/** "T" es período si va en segundos y tensión si va en newtons. */
export function sayLabel(label: string, value: string): string {
  if (label === 'T' || label === 'T₂') return /\bN\b/.test(value) ? 'tensión' : 'período';
  return LABELS[label] ?? label;
}

/** Texto completo que se lee al pulsar el altavoz. */
export function buildNarration({ exerciseType, data, plan, readouts, question, tutor }: NarrationInput): string {
  const parts: string[] = [`Simulación en curso: ${plan.summary}.`];
  const natural = describeExercise(exerciseType, data);
  if (natural) parts.push(natural);
  if (question) parts.push(`Se pide: ${question}.`);
  const result = plan.lines.find((l) => l.answer);
  if (result) parts.push(`Resultado: ${humanize(tokensToText(result.tokens))}.`);
  if (readouts.length) {
    parts.push(`Telemetría en este instante: ${readouts.map((r) => `${sayLabel(r.label, r.value)}, ${humanize(r.value)}`).join('; ')}.`);
  }
  if (tutor?.pedagogical_feedback) parts.push(`Lumi dice: ${tutor.pedagogical_feedback}`);
  if (tutor?.socratic_challenge) parts.push(`Pregunta para pensar: ${tutor.socratic_challenge}`);
  return parts.map((p) => humanize(p)).join(' ');
}
