"""Implementación del Skill de Diagramas de Flujo y Código para PaperLab."""

from pathlib import Path
from typing import Any
from modules.analysis.domain.skills.base import Skill
from modules.analysis.domain.skills.flowchart.schema import FlowchartAnalysisResult
from modules.analysis.domain.validators import validate_flowchart_data
from shared.types import SkillId


class FlowchartSkill(Skill[FlowchartAnalysisResult]):
    """Especialista en diagramas de flujo, algoritmos y depuración de código manuscrito."""

    skill_id = SkillId.FLOWCHART
    name = "Diagramas de Flujo & Algoritmos"
    description = (
        "Convierte diagramas de flujo dibujados en código ejecutable con tokens animados "
        "y proporciona depuración paso a paso con inspector de memoria."
    )
    confidence_threshold = 0.8

    @property
    def schema(self) -> type[FlowchartAnalysisResult]:
        return FlowchartAnalysisResult

    @property
    def prompt(self) -> str:
        prompt_path = Path(__file__).resolve().parent / "prompt.md"
        if prompt_path.exists():
            return prompt_path.read_text(encoding="utf-8").strip()
        return "Especialista en Diagramas de Flujo para PaperLab WebAR."

    @property
    def exercise_catalog(self) -> list[dict[str, Any]]:
        return [
            {
                "id": "sequential_flowchart",
                "name": "Diagrama de Flujo Secuencial",
                "formula": "Inicio -> Entrada -> Proceso -> Salida -> Fin",
                "webar_overlay": "Token luminoso viajando por las flechas de grafito y código Python/JS generado",
            },
            {
                "id": "conditional_flowchart",
                "name": "Bifurcaciones Condicionales (IF / ELSE)",
                "formula": "SI (condición) ENTONCES Rama_A SINO Rama_B",
                "webar_overlay": "Evaluación dinámica de la condición en el rombo y bifurcación animada",
            },
            {
                "id": "loop_flowchart",
                "name": "Bucles e Iteraciones (While / For)",
                "formula": "MIENTRAS (condición) HACER ...",
                "webar_overlay": "Recorrido cíclico con contador flotante y flecha de retorno iluminada",
            },
            {
                "id": "code_debugger",
                "name": "Análisis de Código y Debugger Paso a Paso",
                "formula": "Ejecución secuencial línea por línea",
                "webar_overlay": "Barra de luz holográfica sobre la línea actual con controles Step Over / Continuar",
            },
            {
                "id": "trace_table",
                "name": "Tabla de Traza e Inspector de Memoria",
                "formula": "Rastreo de variables: Memoria[t] = f(Instrucción)",
                "webar_overlay": "Panel lateral sobre el margen del cuaderno mostrando variables en tiempo real",
            },
            {
                "id": "recursive_flowchart",
                "name": "Recursión y Pilas de Llamada (Call Stack)",
                "formula": "f(n) = Caso_Base o g(f(n-1))",
                "webar_overlay": "Visualización 3D apilada de los marcos de la pila de llamadas (call stack)",
            },
        ]

    def validate_deterministic(self, result: FlowchartAnalysisResult) -> list[str]:
        return validate_flowchart_data(result.exercise_type, result.simulation_data)

