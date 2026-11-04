"""Interfaz base abstracta para los skills de análisis científico."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Generic, TypeVar
from pydantic import BaseModel
from shared.types import SkillId

T = TypeVar("T", bound=BaseModel)


class Skill(ABC, Generic[T]):
    """Contrato base que todo especialista de módulo científico debe implementar."""

    skill_id: SkillId
    name: str
    description: str
    confidence_threshold: float = 0.8

    @property
    @abstractmethod
    def schema(self) -> type[T]:
        """Devuelve la clase Pydantic de salida estructurada."""
        pass

    @property
    @abstractmethod
    def prompt(self) -> str:
        """Devuelve el prompt del sistema optimizado para este skill."""
        pass

    @property
    @abstractmethod
    def exercise_catalog(self) -> list[dict[str, Any]]:
        """Devuelve la lista de tipos de ejercicios soportados en este módulo."""
        pass

    def validate_deterministic(self, result: T) -> list[str]:
        """Realiza comprobaciones determinísticas adicionales post-LLM.
        
        Devuelve una lista de cadenas con violaciones o inconsistencias encontradas.
        Si la lista está vacía, la validación fue exitosa.
        """
        return []

    @classmethod
    def load_prompt_from_file(cls, filename: str = "prompt.md") -> str:
        """Carga el contenido de un prompt markdown relativo a la carpeta del skill."""
        skill_dir = Path(__file__).resolve().parent
        # Busca recursivamente en la carpeta que coincida con el skill_id
        for path in skill_dir.glob(f"**/{filename}"):
            if cls.skill_id.value in str(path):
                return path.read_text(encoding="utf-8").strip()
        return ""

