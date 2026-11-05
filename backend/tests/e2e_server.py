"""Backend REAL de PaperLab con un LLM simulado, para las pruebas end-to-end del frontend (Playwright).

Todo el flujo es el de producción (preprocesado de imagen, validación, Tutor Socrático, serialización);
solo se sustituye la llamada a Gemini por respuestas fijas por módulo que contienen errores del alumno
y NINGÚN texto de tutor: así se comprueba que el backend detecta el error y escribe la pregunta socrática.

Uso:  python -m tests.e2e_server  [puerto]   (desde la carpeta backend/)
"""

import sys

import uvicorn

from main import app
from modules.analysis.api import get_llm_client
from modules.analysis.domain.skills.circuit.schema import CircuitAnalysisResult, SingleLoopSimulation
from modules.analysis.domain.skills.flowchart.schema import FlowEdge, FlowNode, FlowchartAnalysisResult, LoopFlowchartSimulation
from modules.analysis.domain.skills.math_geo.schema import GeometricAnglesSimulation, MathGeoAnalysisResult
from modules.analysis.domain.skills.physics.schema import InclinedPlaneSimulation, PhysicsAnalysisResult
from modules.analysis.ports.llm import LLMClient
from shared.types import BoundingBox


def _results():
    box = [BoundingBox(x=0.14, y=0.1, width=0.36, height=0.3, label="ejercicio")]
    nodes = [
        FlowNode(id="n1", shape="oval", role="start", label="Inicio"),
        FlowNode(id="n2", shape="rectangle", role="process", label="i = 0"),
        FlowNode(id="n3", shape="diamond", role="decision", label="i < 5"),
        FlowNode(id="n4", shape="parallelogram", role="input_output", label="Imprimir i"),
        FlowNode(id="n9", shape="oval", role="end", label="Fin"),
    ]
    edges = [FlowEdge(from_node_id=a, to_node_id=b, condition_label=c) for a, b, c in
             [("n1", "n2", None), ("n2", "n3", None), ("n3", "n4", "SÍ"), ("n4", "n3", None), ("n3", "n9", "NO")]]
    return {
        "PhysicsAnalysisResult": PhysicsAnalysisResult(
            exercise_type="inclined_plane", confidence=0.94, explanation="Bloque de 3 kg en una rampa de 20° con μ = 0.5.",
            question="Hallar la aceleración", bounding_boxes=box,
            simulation_data=InclinedPlaneSimulation(angle_degrees=20, mass_kg=3, friction_coefficient=0.5,
                                                    acceleration_m_s2=0, weight_n=29.4, normal_force_n=27.63, friction_force_n=10.06),
        ),
        "CircuitAnalysisResult": CircuitAnalysisResult(
            exercise_type="single_loop", confidence=0.95, explanation="Pila de 9 V con un cable directo entre sus bornes.",
            question="Hallar la corriente", bounding_boxes=box,
            simulation_data=SingleLoopSimulation(voltage_v=9, resistance_ohms=0, current_a=0, power_w=0, has_led=False),
        ),
        "FlowchartAnalysisResult": FlowchartAnalysisResult(
            exercise_type="loop_flowchart", confidence=0.93, explanation="Mientras i < 5 imprime i.", bounding_boxes=box,
            simulation_data=LoopFlowchartSimulation(nodes=nodes, edges=edges, loop_condition="i < 5", loop_variable="i",
                                                    generated_code_py="i = 0\nwhile i < 5:\n    print(i)", generated_code_js=""),
        ),
        "MathGeoAnalysisResult": MathGeoAnalysisResult(
            exercise_type="geometric_angles", confidence=0.95, explanation="Triángulo con ángulos de 100° y 95°.", bounding_boxes=box,
            simulation_data=GeometricAnglesSimulation(problem_type="triangle_cevian", known_angles_deg={"A": 100, "B": 95},
                                                      unknown_variable="x", solved_value_deg=-15, theorem_applied="Suma de ángulos internos",
                                                      proof_steps=["100° + 95° + x = 180°"]),
        ),
    }


class FakeGemini(LLMClient):
    """Sustituye a Gemini: misma interfaz, respuesta fija según el esquema pedido."""

    async def analyze_image_with_schema(self, image_bytes, mime_type, system_prompt, user_prompt, schema):
        assert "Tutor Socrático" in system_prompt, "el prompt debe incluir las instrucciones del tutor"
        return _results()[schema.__name__].model_copy(deep=True)


app.dependency_overrides[get_llm_client] = lambda: FakeGemini()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
