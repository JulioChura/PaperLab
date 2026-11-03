"""Implementación del Skill de Matemáticas y Geometría para PaperLab."""

from pathlib import Path
from typing import Any
from modules.analysis.domain.skills.base import Skill
from modules.analysis.domain.skills.math_geo.schema import MathGeoAnalysisResult
from modules.analysis.domain.validators import validate_math_geo_data
from shared.types import SkillId


class MathGeoSkill(Skill[MathGeoAnalysisResult]):
    """Especialista en geometría euclidiana, analítica, estereometría y álgebra preuniversitaria."""

    skill_id = SkillId.MATH_GEO
    name = "Matemáticas & Geometría Preuniversitaria"
    description = (
        "Convierte figuras planas en sólidos 3D interactivos, calcula distancias/pendientes analíticas, "
        "traza funciones f(x), resuelve ecuaciones paso a paso y calcula incógnitas angulares."
    )
    confidence_threshold = 0.8

    @property
    def schema(self) -> type[MathGeoAnalysisResult]:
        return MathGeoAnalysisResult

    @property
    def prompt(self) -> str:
        prompt_path = Path(__file__).resolve().parent / "prompt.md"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8").strip()
        return "Especialista en Matemáticas y Geometría para PaperLab WebAR."

    @property
    def exercise_catalog(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "geometry_3d",
                "name": "Geometría del Espacio (Estereometría 3D sobre Papel)",
                "formula": "Cilindro: V = pi*r^2*h | Cono: V = 1/3*pi*r^2*h | Esfera: V = 4/3*pi*r^3",
                "webar_overlay": "El dibujo plano cobra volumen y se levanta del papel como holograma 3D interactivo",
            },
            {
                "id": "analytic_geometry",
                "name": "Geometría Analítica en el Plano Cartesiano",
                "formula": "d = sqrt((x2-x1)^2 + (y2-y1)^2) | m = (y2-y1)/(x2-x1)",
                "webar_overlay": "Vector distancia proyectado, punto medio y ecuación de la recta trazada",
            },
            {
                "id": "function_graph",
                "name": "Gráfica de Funciones f(x)",
                "formula": "y = ax^2 + bx + c  |  y = mx + b",
                "webar_overlay": "Calibración del origen (0,0) sobre la cuadrícula y trazo continuo de la curva con raíces",
            },
            {
                "id": "equation_solver",
                "name": "Solver de Ecuaciones Paso a Paso",
                "formula": "ax^2 + bx + c = 0  |  Delta = b^2 - 4ac",
                "webar_overlay": "Desglose deductivo flotante junto al trazo: factorización, aspa simple y C.S.",
            },
            {
                "id": "geometric_angles",
                "name": "Cálculo de Ángulos en Figuras Geométricas",
                "formula": "Teorema Boomerang, Paralelas L1//L2, Ángulo exterior",
                "webar_overlay": "Ecuación resuelta proyectada directamente sobre la figura con el valor exacto de x en grados",
            },
        ]

    def validate_deterministic(self, result: MathGeoAnalysisResult) -> list[str]:
        return validate_math_geo_data(result.exercise_type, result.simulation_data)

