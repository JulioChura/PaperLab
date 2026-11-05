import { getExerciseById } from '../data/exercises';
import type { ExerciseDefinition } from '../data/exercises';
import type { TutorFeedback } from '../tutor/types';

/**
 * Cliente del backend de análisis (FastAPI).
 * La API key de Gemini vive SOLO en el backend; el navegador nunca la ve.
 *
 * En desarrollo, Vite redirige `/api/*` a http://localhost:8000 (ver vite.config.ts).
 * En producción, define VITE_API_URL con la URL pública del backend.
 */
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api';

export interface ClassificationResult {
  exercise_id: string;          // ID del ejercicio en el catálogo del frontend
  exercise_type: string;        // Tipo canónico devuelto por el backend
  exercise_name: string;
  skill: string;
  confidence: number;
  detected_elements: string[];
  parameters: Record<string, unknown>;
  explanation: string;
  /** Qué pide el enunciado (si la IA lo detectó). */
  question?: string;
  bounding_boxes: BoundingBox[];
  /** Tutor Socrático: retroalimentación, pregunta socrática y dato curioso. */
  tutor?: TutorFeedback;
  fullDefinition?: ExerciseDefinition;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string | null;
}

interface BackendAnalysisResponse {
  skill: string;
  exercise_type: string;
  confidence: number;
  detected_elements?: string[];
  bounding_boxes?: BoundingBox[];
  explanation: string;
  question?: string | null;
  simulation_data: Record<string, unknown>;
  tutor?: TutorFeedback | null;
}

/** Tipo de ejercicio del backend -> ID del ejercicio en el catálogo del frontend. */
const EXERCISE_TYPE_TO_FRONTEND_ID: Record<string, string> = {
  // Física
  inclined_plane: 'physics_inclined_plane',
  simple_pendulum: 'physics_pendulum',
  projectile_motion: 'physics_projectile',
  mass_spring: 'physics_spring_hooke',
  rectilinear_motion: 'physics_mru_mruv',
  atwood_machine: 'physics_atwood_pulley',
  // Circuitos
  single_loop: 'circuits_simple_loop',
  series_resistors: 'circuits_series',
  parallel_resistors: 'circuits_parallel',
  interactive_switch: 'circuits_switch',
  rc_circuit: 'circuits_rc',
  logic_gates: 'circuits_logic_gates',
  // Algoritmos
  sequential_flowchart: 'flowchart_logic_blocks',
  conditional_flowchart: 'flowchart_logic_blocks',
  loop_flowchart: 'flowchart_logic_blocks',
  recursive_flowchart: 'flowchart_logic_blocks',
  code_debugger: 'code_step_debugger',
  trace_table: 'code_step_debugger',
  // Matemáticas
  geometry_3d: 'math_solid_geometry_3d',
  analytic_geometry: 'math_analytic_geometry',
  function_graph: 'math_function_graph',
  equation_solver: 'math_equation_solver',
  geometric_angles: 'math_geometric_angles',
};

const extractErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = await response.json();
    const detail = body?.detail ?? body;
    if (typeof detail === 'string') return detail;
    if (detail?.message) return detail.message;
  } catch {
    // respuesta sin JSON
  }
  return `El servidor respondió con error ${response.status}.`;
};

/**
 * Envía la foto del cuaderno al backend y devuelve el ejercicio identificado
 * junto con los parámetros validados para la simulación.
 */
export async function analyzeDrawing(imageDataUrl: string, moduleId: string): Promise<ClassificationResult> {
  const imageBlob = await (await fetch(imageDataUrl)).blob();
  const form = new FormData();
  form.append('file', imageBlob, 'cuaderno.jpg');

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/analyze/${encodeURIComponent(moduleId)}`, {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new Error('No se pudo conectar con el backend. ¿Está corriendo en el puerto 8000?');
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  const data: BackendAnalysisResponse = await response.json();
  const exerciseId = EXERCISE_TYPE_TO_FRONTEND_ID[data.exercise_type] ?? data.exercise_type;
  const fullDefinition = getExerciseById(exerciseId);

  return {
    exercise_id: exerciseId,
    exercise_type: data.exercise_type,
    exercise_name: fullDefinition?.name ?? data.exercise_type,
    skill: data.skill,
    confidence: data.confidence,
    detected_elements: data.detected_elements ?? [],
    parameters: data.simulation_data ?? {},
    explanation: data.explanation,
    bounding_boxes: data.bounding_boxes ?? [],
    question: data.question ?? undefined,
    tutor: data.tutor ?? undefined,
    fullDefinition,
  };
}
