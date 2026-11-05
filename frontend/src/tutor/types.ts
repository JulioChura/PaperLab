/** Contrato del Tutor Socrático (igual que `TutorFeedback` del backend). */
export type TutorMood = 'happy' | 'thinking' | 'warning' | 'surprised' | 'celebrating' | 'curious' | 'sad';

export interface StudentMistake {
  code: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
}

export interface TutorFeedback {
  mood: TutorMood;
  has_error: boolean;
  error_type?: string | null;
  pedagogical_feedback: string;
  socratic_challenge: string;
  hint?: string | null;
  fun_fact?: string | null;
  mistakes?: StudentMistake[];
}

/** Lo que muestra el globo de diálogo del avatar en un momento dado. */
export interface TutorMessage {
  /** Cambia cada vez que el mensaje es nuevo (reabre el globo y reinicia la animación). */
  key: string;
  mood: TutorMood;
  tone: 'neutral' | 'error' | 'success' | 'mission';
  title: string;
  text: string;
  question?: string;
  hint?: string;
  funFact?: string;
}

export const ERROR_LABELS: Record<string, string> = {
  short_circuit: 'Cortocircuito',
  open_circuit: 'Circuito abierto',
  led_overcurrent: 'LED sin protección',
  negative_angle: 'Ángulo imposible',
  static_friction: 'El bloque no desliza',
  inverted_force: 'Fuerza en sentido inverso',
  impossible_value: 'Valor imposible',
  infinite_loop: 'Bucle infinito',
  incomplete_flowchart: 'Diagrama incompleto',
  impossible_triangle: 'Triángulo imposible',
  no_real_roots: 'Sin raíces reales',
  wrong_answer: 'Respuesta por revisar',
  missing_data: 'Falta un dato',
  other: 'Revisa tu dibujo',
};

export const errorLabel = (code?: string | null) => (code ? ERROR_LABELS[code] ?? ERROR_LABELS.other : ERROR_LABELS.other);
