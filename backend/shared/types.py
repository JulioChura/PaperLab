"""Definición de tipos transversales, primitivas y modelos base."""

from enum import Enum
from typing import Literal, Optional
from pydantic import BaseModel, Field


class SkillId(str, Enum):
    """Identificadores canónicos de los 4 módulos de PaperLab."""
    PHYSICS = "physics"
    CIRCUIT = "circuit"
    FLOWCHART = "flowchart"
    MATH_GEO = "math_geo"


# Mapeo de alias para compatibilidad con frontend y peticiones de usuario
SKILL_ALIASES = {
    "physics": SkillId.PHYSICS,
    "fisica": SkillId.PHYSICS,
    "circuit": SkillId.CIRCUIT,
    "circuits": SkillId.CIRCUIT,
    "circuitos": SkillId.CIRCUIT,
    "flowchart": SkillId.FLOWCHART,
    "flowcharts": SkillId.FLOWCHART,
    "diagramas": SkillId.FLOWCHART,
    "diagrama": SkillId.FLOWCHART,
    "code": SkillId.FLOWCHART,
    "math": SkillId.MATH_GEO,
    "maths": SkillId.MATH_GEO,
    "math_geo": SkillId.MATH_GEO,
    "geometria": SkillId.MATH_GEO,
    "geometry": SkillId.MATH_GEO,
}


def normalize_skill_id(raw_id: str) -> SkillId:
    """Normaliza identificadores y alias al enum canónico SkillId."""
    cleaned = raw_id.strip().lower()
    if cleaned in SKILL_ALIASES:
        return SKILL_ALIASES[cleaned]
    raise ValueError(f"Identificador de skill desconocido: '{raw_id}'")


class BoundingBox(BaseModel):
    """Caja delimitadora normalizada (0.0 a 1.0) sobre la imagen capturada."""
    x: float = Field(..., ge=0.0, le=1.0, description="Posición X de la esquina superior izquierda (0.0 - 1.0)")
    y: float = Field(..., ge=0.0, le=1.0, description="Posición Y de la esquina superior izquierda (0.0 - 1.0)")
    width: float = Field(..., ge=0.0, le=1.0, description="Ancho normalizado (0.0 - 1.0)")
    height: float = Field(..., ge=0.0, le=1.0, description="Alto normalizado (0.0 - 1.0)")
    label: Optional[str] = Field(default=None, description="Etiqueta identificadora del elemento acotado")


TutorMood = Literal["happy", "thinking", "warning", "surprised", "celebrating", "curious"]

MISTAKE_CODES_DESCRIPTION = (
    "Código del error. Usa uno de: 'short_circuit' (camino directo entre bornes sin carga), "
    "'open_circuit' (malla interrumpida), 'led_overcurrent' (LED sin resistencia limitadora), "
    "'negative_angle' (ángulo negativo o fuera de rango), 'static_friction' (la fricción estática impide el movimiento), "
    "'inverted_force' (vector de fuerza o aceleración dibujado en sentido contrario), "
    "'impossible_value' (masa, longitud, k, R o C nula/negativa), 'infinite_loop' (la variable de control nunca cambia), "
    "'incomplete_flowchart' (falta Inicio/Fin o una rama de decisión), 'impossible_triangle' (los ángulos suman 180° o más), "
    "'no_real_roots' (discriminante negativo), 'wrong_answer' (el resultado escrito por el estudiante es incorrecto), "
    "'missing_data' (falta un dato imprescindible) u 'other'."
)


class StudentMistake(BaseModel):
    """Error conceptual o de dibujo cometido por el estudiante (no es un fallo del análisis)."""
    code: str = Field(..., description=MISTAKE_CODES_DESCRIPTION)
    severity: Literal["info", "warning", "critical"] = Field(
        default="warning",
        description="'critical' = la situación es físicamente imposible o peligrosa; 'warning' = error conceptual; 'info' = observación",
    )
    description: str = Field(..., description="Qué está mal, en una frase dirigida al estudiante")


class TutorFeedback(BaseModel):
    """Voz del Tutor Socrático (avatar 'Lumi'): acompaña SIEMPRE al resultado, haya error o no."""
    mood: TutorMood = Field(
        default="happy",
        description="Expresión del avatar: 'warning' si hay error, 'surprised' ante un caso límite, 'curious' para un dato curioso, 'happy' si todo está bien",
    )
    has_error: bool = Field(default=False, description="true si el estudiante cometió un error conceptual o de dibujo")
    error_type: Optional[str] = Field(default=None, description="Código del error principal (mismo vocabulario que mistakes[].code)")
    pedagogical_feedback: str = Field(
        default="",
        description=(
            "Retroalimentación pedagógica breve (1-2 frases, tuteando). Si hay error, empieza con '¡Cuidado!' y explica "
            "qué ocurre físicamente sin dar la solución. Si no hay error, felicita y destaca la idea clave del fenómeno."
        ),
    )
    socratic_challenge: str = Field(
        default="",
        description="UNA pregunta socrática que obligue a razonar (termina en '?'), ej: '¿Qué ángulo mínimo necesitas para que comience a deslizar?'",
    )
    hint: Optional[str] = Field(default=None, description="Pista opcional que acerca a la respuesta sin revelarla del todo")
    fun_fact: Optional[str] = Field(default=None, description="Dato curioso real y verificable relacionado con el fenómeno (1 frase)")
    mistakes: list[StudentMistake] = Field(default_factory=list, description="Lista de errores detectados (vacía si no hay)")


def tutor_field():
    """Campo `tutor` común a todos los contratos de análisis."""
    return Field(
        default_factory=TutorFeedback,
        description=(
            "Tutor Socrático. OBLIGATORIO: rellénalo siempre. Si el dibujo tiene un error (circuito en corto, malla abierta, "
            "ángulo negativo, fuerza invertida, bucle infinito...), NO lo corrijas en simulation_data: reporta los valores tal "
            "como están dibujados y explica el error aquí."
        ),
    )


class BaseAnalysisResult(BaseModel):
    """Contrato base para todas las respuestas de análisis del simulador."""
    skill: SkillId = Field(..., description="Módulo científico identificado")
    exercise_type: str = Field(..., description="Tipo de ejercicio según la rúbrica oficial")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Certeza de clasificación y extracción (0.0 - 1.0)")
    detected_elements: list[str] = Field(default_factory=list, description="Lista de trazos y elementos gráficos reconocidos")
    bounding_boxes: list[BoundingBox] = Field(default_factory=list, description="Cajas de coordenadas para anclaje WebAR")
    explanation: str = Field(..., description="Explicación concisa del ejercicio y parámetros detectados")
    raw_annotations: list[str] = Field(default_factory=list, description="Textos o valores manuscritos reconocidos por OCR")

