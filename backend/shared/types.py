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


class BaseAnalysisResult(BaseModel):
    """Contrato base para todas las respuestas de análisis del simulador."""
    skill: SkillId = Field(..., description="Módulo científico identificado")
    exercise_type: str = Field(..., description="Tipo de ejercicio según la rúbrica oficial")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Certeza de clasificación y extracción (0.0 - 1.0)")
    detected_elements: list[str] = Field(default_factory=list, description="Lista de trazos y elementos gráficos reconocidos")
    bounding_boxes: list[BoundingBox] = Field(default_factory=list, description="Cajas de coordenadas para anclaje WebAR")
    explanation: str = Field(..., description="Explicación concisa del ejercicio y parámetros detectados")
    raw_annotations: list[str] = Field(default_factory=list, description="Textos o valores manuscritos reconocidos por OCR")

