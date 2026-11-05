/**
 * Lo que Lumi sabe decir cuando no hay un resultado de la IA: saludo, consejos de encuadre
 * y datos curiosos por módulo (todos verificables). También construye los mensajes del globo
 * a partir del `tutor` que devuelve el backend.
 */
import type { TutorFeedback, TutorMessage } from './types';
import { errorLabel } from './types';

export const FUN_FACTS: Record<string, string[]> = {
  physics: [
    'Galileo notó que el período de un péndulo casi no depende de su amplitud observando una lámpara que oscilaba en la catedral de Pisa.',
    'En la Luna, con g ≈ 1,62 m/s², un péndulo de 1 metro tarda unos 4,9 segundos en ir y volver: casi 2,5 veces más que en la Tierra.',
    'Sin aire, una pluma y un martillo caen igual de rápido: el astronauta David Scott lo demostró en la Luna en 1971 (Apolo 15).',
    'El ángulo de 45° da el máximo alcance solo si se lanza y se cae a la misma altura y sin rozamiento con el aire.',
    'Las balanzas de resorte de los mercados funcionan gracias a la ley de Hooke: el estiramiento es proporcional a la fuerza.',
    'George Atwood inventó su máquina en 1784 para medir la gravedad "a cámara lenta": al restar las masas, la aceleración es mucho menor que g.',
  ],
  circuits: [
    'Los electrones de un cable avanzan a fracciones de milímetro por segundo, pero la señal eléctrica viaja casi a la velocidad de la luz.',
    'El grafito del lápiz conduce la electricidad: por eso puedes dibujar circuitos que de verdad funcionan en papel.',
    'Georg Ohm publicó su famosa ley V = I·R en 1827, y al principio muchos científicos no le creyeron.',
    'Un LED común solo necesita unos 20 miliamperios: sin resistencia, una pila de 9 V lo quemaría en un instante.',
    'El "ohmio" se escribe con la letra griega omega (Ω) porque una O latina se confundiría con el número cero.',
    'Las compuertas lógicas de tu celular están hechas con miles de millones de transistores más pequeños que un virus.',
  ],
  flowcharts: [
    'El primer "bug" documentado fue una polilla real atrapada en un relé del computador Harvard Mark II en 1947.',
    'Ada Lovelace escribió en 1843 el primer algoritmo pensado para una máquina: calculaba números de Bernoulli.',
    'La palabra "algoritmo" viene del nombre del matemático persa al-Juarismi, del siglo IX.',
    'De niño, Carl Friedrich Gauss sumó del 1 al 100 en segundos emparejando números: 1 + 100, 2 + 99… da 50 × 101 = 5050.',
    'La recursión aparece en la naturaleza: las ramas de un helecho repiten la forma de la hoja completa.',
  ],
  math: [
    'La palabra "álgebra" viene del árabe al-ŷabr, del libro de al-Juarismi del siglo IX.',
    'Las antenas parabólicas tienen forma de parábola porque todas las señales que llegan rebotan hacia un mismo punto: el foco.',
    'Arquímedes estaba tan orgulloso de su fórmula del volumen de la esfera que pidió que grabaran una esfera y un cilindro en su tumba.',
    'La suma de los ángulos de un triángulo es 180° en un plano, pero en la superficie de una esfera es mayor que 180°.',
    'René Descartes ideó el plano cartesiano en el siglo XVII, uniendo para siempre el álgebra y la geometría.',
  ],
};

const TIPS: Record<string, string> = {
  physics: 'Dibuja tu ejercicio con trazos firmes y escribe los datos (m, θ, μ, v0…) junto al dibujo. Luego pulsa «Escanear y resolver».',
  circuits: 'Cierra bien la malla y rotula la pila (+/−) y cada resistencia en ohmios. Yo te aviso si hay un cortocircuito.',
  flowcharts: 'Usa óvalos para Inicio/Fin, rombos para decisiones y flechas claras. Seguiré tu algoritmo paso a paso.',
  math: 'Escribe la ecuación o la figura con letra clara y con buena luz. Te mostraré cada paso sobre tu hoja.',
};

const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(Math.floor(seed)) % arr.length];

export function randomFunFact(module: string, seed = Date.now()): string {
  return pick(FUN_FACTS[module] ?? FUN_FACTS.physics, seed / 997);
}

export function greetingMessage(module: string, firstTime: boolean): TutorMessage {
  return {
    key: `greet-${module}-${firstTime}`,
    mood: firstTime ? 'happy' : 'curious',
    tone: 'neutral',
    title: firstTime ? '¡Hola! Soy Lumi' : 'Consejo de Lumi',
    text: firstTime
      ? `Seré tu tutor en este laboratorio de papel. ${TIPS[module] ?? TIPS.physics} Si te equivocas, no te daré la respuesta: te haré una pregunta para que la descubras.`
      : TIPS[module] ?? TIPS.physics,
    funFact: randomFunFact(module),
  };
}

export function scanningMessage(): TutorMessage {
  return { key: `scan-${Date.now()}`, mood: 'thinking', tone: 'neutral', title: 'Leyendo tus trazos…', text: 'Estoy reconociendo el dibujo y los datos que escribiste.' };
}

export function failureMessage(message: string): TutorMessage {
  const offline = /conectar|backend|network|fetch/i.test(message);
  const blurry = /confianza|ilumina|claridad/i.test(message);
  return {
    key: `fail-${Date.now()}`,
    mood: 'sad',
    tone: 'error',
    title: offline ? 'No logro conectarme' : blurry ? 'No pude leerlo bien' : 'Algo salió mal',
    text: offline
      ? 'El servidor de análisis no responde. Mientras tanto, puedes probar con los «Ejemplos», que funcionan sin conexión.'
      : blurry
        ? 'Tu foto está algo borrosa u oscura. Acércate un poco, evita sombras y repasa los trazos más tenues.'
        : message,
    question: blurry ? '¿Qué parte del dibujo crees que me costó más leer?' : undefined,
  };
}

/** Mensaje del globo a partir del tutor del backend (o del ejemplo). */
export function resultMessage(t: TutorFeedback, exerciseName: string, suppressError = false): TutorMessage {
  const error = t.has_error && !suppressError;
  return {
    key: `result-${exerciseName}-${t.error_type ?? 'ok'}-${Date.now()}`,
    mood: error ? (t.mood === 'surprised' ? 'surprised' : 'warning') : t.mood === 'warning' ? 'happy' : t.mood,
    tone: error ? 'error' : 'neutral',
    title: error ? `¡Cuidado! · ${errorLabel(t.error_type)}` : exerciseName,
    text: t.pedagogical_feedback,
    question: t.socratic_challenge || undefined,
    hint: t.hint ?? undefined,
    funFact: t.fun_fact ?? undefined,
  };
}

/** Tutor de respaldo si el resultado llega sin él (backend antiguo). */
export function fallbackTutor(module: string): TutorFeedback {
  return {
    mood: 'happy',
    has_error: false,
    pedagogical_feedback: '¡Listo! Mira la simulación sobre tu hoja y juega con los controles.',
    socratic_challenge: '¿Qué crees que pasará si cambias uno de los datos de tu dibujo?',
    fun_fact: randomFunFact(module),
  };
}
