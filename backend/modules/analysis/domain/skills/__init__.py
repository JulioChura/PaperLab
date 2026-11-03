"""Catálogo y registro central de Especialistas (Skills) de PaperLab."""

from typing import Dict, List, Any
from modules.analysis.domain.skills.base import Skill
from modules.analysis.domain.skills.physics import PhysicsSkill
from modules.analysis.domain.skills.circuit import CircuitSkill
from modules.analysis.domain.skills.flowchart import FlowchartSkill
from modules.analysis.domain.skills.math_geo import MathGeoSkill
from shared.errors import SkillNotFoundError
from shared.types import SkillId, normalize_skill_id

# Registro de instancias de skills
_SKILLS_REGISTRY: Dict[SkillId, Skill] = {
    SkillId.PHYSICS: PhysicsSkill(),
    SkillId.CIRCUIT: CircuitSkill(),
    SkillId.FLOWCHART: FlowchartSkill(),
    SkillId.MATH_GEO: MathGeoSkill(),
}


def get_skill(raw_skill_id: str | SkillId) -> Skill:
    """Obtiene la instancia del especialista correspondiente a partir de un ID o alias."""
    try:
        if isinstance(raw_skill_id, SkillId):
            canonical_id = raw_skill_id
        else:
            canonical_id = normalize_skill_id(raw_skill_id)
    except ValueError:
        raise SkillNotFoundError(str(raw_skill_id))

    if canonical_id not in _SKILLS_REGISTRY:
        raise SkillNotFoundError(str(raw_skill_id))

    return _SKILLS_REGISTRY[canonical_id]


def list_available_skills() -> List[Dict[str, Any]]:
    """Devuelve la metadata completa de los 4 skills y los 23 tipos de ejercicios soportados."""
    summary: List[Dict[str, Any]] = []
    for skill_id, skill in _SKILLS_REGISTRY.items():
        summary.append({
            "skill_id": skill_id.value,
            "name": skill.name,
            "description": skill.description,
            "confidence_threshold": skill.confidence_threshold,
            "total_exercise_types": len(skill.exercise_catalog),
            "exercise_types": skill.exercise_catalog,
        })
    return summary


__all__ = [
    "Skill",
    "PhysicsSkill",
    "CircuitSkill",
    "FlowchartSkill",
    "MathGeoSkill",
    "get_skill",
    "list_available_skills",
]

