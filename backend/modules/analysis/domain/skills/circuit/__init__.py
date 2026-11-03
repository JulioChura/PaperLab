"""Implementación del Skill de Circuitos Eléctricos para PaperLab."""

from pathlib import Path
from typing import Any
from modules.analysis.domain.skills.base import Skill
from modules.analysis.domain.skills.circuit.schema import CircuitAnalysisResult
from modules.analysis.domain.validators import validate_circuit_data
from shared.types import SkillId


class CircuitSkill(Skill[CircuitAnalysisResult]):
    """Especialista en esquemas de circuitos eléctricos y compuertas lógicas."""

    skill_id = SkillId.CIRCUIT
    name = "Circuitos en Grafito y Electrónica"
    description = (
        "Reconoce circuitos de malla simple, resistencias en serie y paralelo, "
        "interruptores dinámicos, circuitos RC y compuertas lógicas."
    )
    confidence_threshold = 0.8

    @property
    def schema(self) -> type[CircuitAnalysisResult]:
        return CircuitAnalysisResult

    @property
    def prompt(self) -> str:
        prompt_path = Path(__file__).resolve().parent / "prompt.md"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8").strip()
        return "Especialista en Circuitos Eléctricos para PaperLab WebAR."

    @property
    def exercise_catalog(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "single_loop",
                "name": "Circuito Simple de Malla Única",
                "formula": "I = V / R  |  P = V * I",
                "webar_overlay": "Flujo animado de electrones neón y encendido virtual de LED",
            },
            {
                "id": "series_resistors",
                "name": "Resistencias en Serie",
                "formula": "Req = sum(Ri)  |  Vtotal = sum(Vi)",
                "webar_overlay": "Voltímetros holográficos flotantes sobre cada resistor midiendo caídas de tensión",
            },
            {
                "id": "parallel_resistors",
                "name": "Resistencias en Paralelo",
                "formula": "1/Req = sum(1/Ri)  |  Itotal = sum(Ii)",
                "webar_overlay": "Bifurcación luminosa de caudal de electrones por cada rama",
            },
            {
                "id": "interactive_switch",
                "name": "Circuito con Interruptor Interactivo (Switch)",
                "formula": "R_abierto -> inf  |  R_cerrado -> 0",
                "webar_overlay": "Botón interactivo en pantalla para abrir/cerrar el circuito con chispas táctiles",
            },
            {
                "id": "rc_circuit",
                "name": "Circuito RC (Carga y Descarga)",
                "formula": "tau = R * C  |  Vc(t) = V0*(1 - e^(-t/tau))",
                "webar_overlay": "Acumulación electrostática en placas y curva exponencial animada",
            },
            {
                "id": "logic_gates",
                "name": "Puertas Lógicas Básicas (AND, OR, NOT...)",
                "formula": "Álgebra de Boole (A*B, A+B, !A)",
                "webar_overlay": "Evaluación en tiempo real de tabla de verdad y pulso de salida verde/rojo",
            },
        ]

    def validate_deterministic(self, result: CircuitAnalysisResult) -> list[str]:
        return validate_circuit_data(result.exercise_type, result.simulation_data)

