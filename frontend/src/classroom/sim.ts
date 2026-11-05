/**
 * Datos y distribuciones de la simulación de aula: nombres, dispositivos, latencias,
 * y los errores típicos de cada misión (con la concepción errónea que revelan).
 */
import type { Device } from './types';

// ------------------------------------------------------------------ aleatoriedad
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randInt = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const pick = <T,>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];

/** Normal estándar (Box-Muller). */
export function gauss(mu = 0, sigma = 1): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export const lognormal = (median: number, spread = 0.35) => median * Math.exp(gauss(0, spread));

export function weighted<T>(items: readonly { w: number; v: T }[]): T {
  const total = items.reduce((s, i) => s + i.w, 0);
  let r = Math.random() * total;
  for (const i of items) {
    r -= i.w;
    if (r <= 0) return i.v;
  }
  return items[items.length - 1].v;
}

// ------------------------------------------------------------------ alumnos
export const STUDENT_NAMES = [
  'Valeria Quispe', 'Mateo Huamán', 'Camila Rojas', 'Thiago Mamani', 'Luciana Flores', 'Santiago Condori',
  'Ximena Torres', 'Diego Ramos', 'Renata Chávez', 'Joaquín Vargas', 'Mía Castillo', 'Adrián Ccori',
  'Fernanda Gutiérrez', 'Gael Pari', 'Antonella Díaz', 'Sebastián Apaza', 'Isabella Ruiz', 'Leonardo Cruz',
  'Daniela Medina', 'Benjamín Salazar', 'Ariana Ticona', 'Nicolás Paredes', 'Zoe Huanca', 'Emiliano Soto',
  'Abril Mendoza', 'Rodrigo Yupanqui', 'Alessia Cáceres', 'Fabián Choque', 'Micaela Ortiz', 'Bruno Villca',
  'Kiara Espinoza', 'Dylan Ayala', 'Romina León', 'Iker Quispe', 'Luana Poma', 'Marcelo Arce',
  'Ivanna Gómez', 'Facundo Aguilar', 'Maite Huarachi', 'Josué Calla',
];

export const AVATAR_INKS = ['#2f4bf0', '#ff4f9e', '#ffc81f', '#12a96e', '#ff5435', '#8b5cf6', '#00a3c4', '#ff7a1a'];

export const DEVICES: { w: number; v: Device }[] = [
  { w: 55, v: 'Android' },
  { w: 15, v: 'iPhone' },
  { w: 12, v: 'Chromebook' },
  { w: 10, v: 'Laptop' },
  { w: 8, v: 'Tablet' },
];

/** Latencia base por dispositivo/red (ms). El wifi escolar es lo que manda. */
export function basePing(d: Device): number {
  const m = d === 'Laptop' ? 38 : d === 'Chromebook' ? 52 : d === 'iPhone' ? 60 : 75;
  return Math.round(clamp(lognormal(m, 0.45), 14, 420));
}

export const pingQuality = (ms: number): 'good' | 'fair' | 'poor' => (ms < 90 ? 'good' : ms < 200 ? 'fair' : 'poor');

export const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Código estilo Meet: abc-defg-hij (sin letras ambiguas). */
export function makeCode(): string {
  const L = 'abcdefghjkmnpqrstuvwxyz';
  const part = (n: number) => Array.from({ length: n }, () => L[Math.floor(Math.random() * L.length)]).join('');
  return `${part(3)}-${part(4)}-${part(3)}`;
}
export const CODE_RE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
export function normalizeCode(raw: string): string {
  const s = raw.toLowerCase().replace(/[^a-z]/g, '').slice(0, 10);
  return [s.slice(0, 3), s.slice(3, 7), s.slice(7, 10)].filter(Boolean).join('-');
}

// ------------------------------------------------------------------ errores por misión
export interface ErrorProfile {
  code: string;
  w: number;
  /** Lo que el docente lee: qué hizo el alumno. */
  what: string;
  /** La concepción errónea de fondo. */
  misconception: string;
  /** Sugerencia para la clase. */
  action: string;
}

export const MISSION_ERRORS: Record<string, ErrorProfile[]> = {
  physics_flag_12m: [
    { code: 'wrong_answer', w: 50, what: 'El proyectil no llega a 12 m', misconception: 'Creen que el alcance crece proporcional a v₀, no a v₀².', action: 'Comparar en la pizarra v₀ = 5 y 10 m/s: el alcance se cuadruplica.' },
    { code: 'missing_data', w: 22, what: 'Dibujó el tiro sin rotular v₀ o θ', misconception: 'No distinguen los datos iniciales de los resultados.', action: 'Pedir que rotulen siempre v₀ y θ antes de lanzar.' },
    { code: 'negative_angle', w: 12, what: 'Ángulo medido desde la vertical', misconception: 'Confunden el ángulo con la horizontal y con la vertical.', action: 'Repasar la convención: θ se mide desde el suelo.' },
    { code: 'impossible_value', w: 8, what: 'Rapidez irreal (> 300 m/s)', misconception: 'Les falta intuición de órdenes de magnitud.', action: 'Anclar con ejemplos: una pelota de fútbol va a ~30 m/s.' },
  ],
  physics_pendulum_2s: [
    { code: 'wrong_answer', w: 48, what: 'El período no da 2 s', misconception: 'Piensan que T es proporcional a L, no a √L.', action: 'Mostrar que cuadruplicar L solo duplica T.' },
    { code: 'missing_data', w: 25, what: 'No escribió la longitud del hilo', misconception: 'Creen que la masa determina el período.', action: 'Demostrar con dos masas distintas y la misma cuerda.' },
    { code: 'impossible_value', w: 10, what: 'Hilo de más de 10 m', misconception: 'Despejan mal L = gT²/(4π²).', action: 'Practicar el despeje paso a paso.' },
  ],
  physics_ramp_still: [
    { code: 'wrong_answer', w: 45, what: 'El bloque desliza: μ demasiado bajo', misconception: 'Creen que el bloque se queda quieto si la rampa es "poco empinada", sin mirar μ.', action: 'Comparar tanθ con μ: esa es la condición.' },
    { code: 'inverted_force', w: 28, what: 'Fricción dibujada hacia abajo de la rampa', misconception: 'Piensan que la fricción siempre apunta "hacia abajo".', action: 'Recordar: la fricción se opone a la tendencia de movimiento.' },
    { code: 'missing_data', w: 15, what: 'Faltó el ángulo o el coeficiente μ', misconception: 'No identifican qué variables controlan el equilibrio.', action: 'Listar en grupo las variables del plano inclinado.' },
  ],
  circuit_switch_one_led: [
    { code: 'open_circuit', w: 38, what: 'La malla no cierra con el interruptor', misconception: 'No ven el circuito como un lazo cerrado.', action: 'Recorrer el circuito con el dedo desde + hasta −.' },
    { code: 'short_circuit', w: 30, what: 'El interruptor cortocircuita la pila', misconception: 'Ubican el interruptor en paralelo con la fuente.', action: 'Mostrar qué pasa con la corriente cuando hay un camino sin resistencia.' },
    { code: 'led_overcurrent', w: 16, what: 'LED sin resistencia limitadora', misconception: 'Creen que el LED "consume" lo que necesita solo.', action: 'Calcular I = V/R con R ≈ 0.' },
  ],
  circuit_safe_led: [
    { code: 'led_overcurrent', w: 55, what: 'Resistencia muy chica: el LED se quema', misconception: 'Eligen R "a ojo" sin calcular la corriente.', action: 'Despejar R = (V − 2 V) / 0.02 A juntos.' },
    { code: 'open_circuit', w: 20, what: 'Circuito abierto: el LED no enciende', misconception: 'Olvidan cerrar la malla de vuelta a la pila.', action: 'Recorrer el lazo completo antes de escanear.' },
    { code: 'short_circuit', w: 14, what: 'Cortocircuito en paralelo al LED', misconception: 'Confunden conexión en serie y en paralelo.', action: 'Dibujar ambas versiones y comparar.' },
  ],
  flow_sum_1_10: [
    { code: 'infinite_loop', w: 45, what: 'El bucle nunca termina', misconception: 'Olvidan actualizar el contador (i = i + 1).', action: 'Hacer una tabla de traza de 3 iteraciones en la pizarra.' },
    { code: 'wrong_answer', w: 30, what: 'La suma da 45 en vez de 55', misconception: 'Error de borde: usan i < 10 en lugar de i ≤ 10.', action: 'Discutir condiciones de borde con ejemplos pequeños.' },
    { code: 'incomplete_flowchart', w: 18, what: 'Falta el óvalo de Fin o una flecha', misconception: 'No ven el diagrama como un recorrido completo.', action: 'Revisar que todo camino llegue a Fin.' },
  ],
  flow_even_odd: [
    { code: 'incomplete_flowchart', w: 44, what: 'El rombo tiene una sola salida', misconception: 'No entienden que una decisión siempre tiene dos caminos.', action: 'Rotular siempre SÍ y NO en cada rombo.' },
    { code: 'wrong_answer', w: 36, what: 'Usa n / 2 en vez de n mod 2', misconception: 'Confunden división con residuo.', action: 'Practicar mod con ejemplos: 7 mod 2 = 1.' },
  ],
  math_vertex: [
    { code: 'wrong_answer', w: 55, what: 'Vértice en (−2, −1) o en (2, 1)', misconception: 'Invierten el signo en la forma y = (x − h)² + k.', action: 'Graficar (x − 2)² y (x + 2)² lado a lado.' },
    { code: 'missing_data', w: 20, what: 'Escribió la función sin ejes', misconception: 'No conectan la expresión algebraica con la gráfica.', action: 'Ubicar el vértice primero y luego trazar.' },
  ],
  math_liter_can: [
    { code: 'wrong_answer', w: 46, what: 'El volumen no da 1 L', misconception: 'Mezclan cm³ y litros (1 L = 1000 cm³).', action: 'Repasar conversión de unidades de volumen.' },
    { code: 'missing_data', w: 25, what: 'Faltó la altura o el radio', misconception: 'Confunden radio con diámetro.', action: 'Medir una lata real en clase.' },
    { code: 'impossible_value', w: 18, what: 'Lata de 2 m de alto', misconception: 'Despejan h sin revisar si el resultado es razonable.', action: 'Estimar antes de calcular.' },
  ],
};

const GENERIC: ErrorProfile[] = [
  { code: 'wrong_answer', w: 60, what: 'Resultado fuera de la condición', misconception: 'Aplican la fórmula sin revisar la condición pedida.', action: 'Pedir que verifiquen la condición antes de escanear.' },
  { code: 'missing_data', w: 40, what: 'Faltó un dato en el dibujo', misconception: 'No identifican las variables del problema.', action: 'Listar los datos antes de dibujar.' },
];

export const errorsFor = (missionId: string) => MISSION_ERRORS[missionId] ?? GENERIC;
export const errorProfile = (missionId: string, code: string) => errorsFor(missionId).find((e) => e.code === code);
