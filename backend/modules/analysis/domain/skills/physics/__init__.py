"""Implementación del Skill de Física para PaperLab."""

from pathlib import Path
from typing import Any
from modules.analysis.domain.skills.base import Skill
from modules.analysis.domain.skills.physics.schema import PhysicsAnalysisResult
from modules.analysis.domain.validators import validate_physics_data
from shared.types import SkillId


class PhysicsSkill(Skill[PhysicsAnalysisResult]):
    """Especialista en clasificar y extraer parámetros de física clásica."""

    skill_id = SkillId.PHYSICS
    name = "Física Vectorial y Dinámica"
    description = (
        "Interpreta planos inclinados, péndulos, proyectiles, sistemas masa-resorte, "
        "cinemática MRU/MRUV y máquinas de Atwood."
    )
    confidence_threshold = 0.8

    @property
    def schema(self) -> type[PhysicsAnalysisResult]:
        return PhysicsAnalysisResult

    @property
    def prompt(self) -> str:
        prompt_path = Path(__file__).resolve().parent / "prompt.md"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8").strip()
        return "Especialista en Física para PaperLab WebAR."

    @property
    def exercise_catalog(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "inclined_plane",
                "name": "Plano Inclinado con Fricción",
                "formula": "a = g(sin(theta) - mu*cos(theta))",
                "webar_overlay": "Deslizamiento dinámico del bloque y vectores de fuerza (P, N, fr, a)",
            },
            {
                "id": "simple_pendulum",
                "name": "Péndulo Simple",
                "formula": "T = 2*pi*sqrt(L/g)",
                "webar_overlay": "Oscilación armónica, telemetría de período T y vector velocidad",
            },
            {
                "id": "projectile_motion",
                "name": "Tiro Parabólico",
                "formula": "Xmax = (v0^2 * sin(2*theta)) / g",
                "webar_overlay": "Trazo parabólico brillante, marcas de Hmax y tiempo de vuelo",
            },
            {
                "id": "mass_spring",
                "name": "Sistema Masa-Resorte (Ley de Hooke)",
                "formula": "omega = sqrt(k/m)",
                "webar_overlay": "Compresión y elongación elástica oscilatoria con gráfico de energías",
            },
            {
                "id": "rectilinear_motion",
                "name": "Cinemática Rectilínea (MRU y MRUV)",
                "formula": "d = v0*t + 0.5*a*t^2",
                "webar_overlay": "Móvil desplazándose sobre el trazo con marcas de tiempo e hitos de velocidad",
            },
            {
                "id": "atwood_machine",
                "name": "Máquina de Atwood (Poleas y Cuerdas)",
                "formula": "a = g * |m1 - m2| / (m1 + m2)",
                "webar_overlay": "Rotación de la polea y movimiento vertical de ambas masas",
            },
        ]

    def validate_deterministic(self, result: PhysicsAnalysisResult) -> list[str]:
        return validate_physics_data(result.exercise_type, result.simulation_data)

