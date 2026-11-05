"""Tests del Tutor Socrático: errores del estudiante -> retroalimentación pedagógica (no errores HTTP)."""

import io
import unittest
from types import SimpleNamespace

from fastapi.testclient import TestClient
from PIL import Image

from main import app
from modules.analysis.api import get_llm_client
from modules.analysis.domain.pedagogy import detect_student_mistakes, enrich_tutor
from modules.analysis.domain.skills.circuit.schema import CircuitAnalysisResult, SingleLoopSimulation
from modules.analysis.domain.skills.flowchart.schema import FlowEdge, FlowNode, FlowchartAnalysisResult, LoopFlowchartSimulation
from modules.analysis.domain.skills.math_geo.schema import GeometricAnglesSimulation, MathGeoAnalysisResult
from modules.analysis.domain.skills.physics.schema import InclinedPlaneSimulation, PhysicsAnalysisResult
from modules.analysis.ports.llm import LLMClient
from shared.types import SkillId, TutorFeedback


class SequenceLLM(LLMClient):
    """Devuelve las respuestas en orden y registra los prompts recibidos."""

    def __init__(self, *results):
        self.results = list(results)
        self.prompts: list[str] = []

    async def analyze_image_with_schema(self, image_bytes, mime_type, system_prompt, user_prompt, schema):
        self.prompts.append(user_prompt)
        self.system_prompt = system_prompt
        return self.results.pop(0) if len(self.results) > 1 else self.results[0]


def _image() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (120, 120), "white").save(buf, format="JPEG")
    return buf.getvalue()


def _short_circuit(tutor: TutorFeedback | None = None) -> CircuitAnalysisResult:
    return CircuitAnalysisResult(
        exercise_type="single_loop",
        confidence=0.93,
        explanation="Pila de 9 V con un cable directo entre sus bornes.",
        simulation_data=SingleLoopSimulation(voltage_v=9, resistance_ohms=0, current_a=0, power_w=0, has_led=False),
        tutor=tutor or TutorFeedback(),
    )


class TutorDetectionTests(unittest.TestCase):
    def test_short_circuit(self):
        f = detect_student_mistakes("circuit", "single_loop", SimpleNamespace(voltage_v=9, resistance_ohms=0, circuit_closed=True))
        self.assertEqual(f[0].code, "short_circuit")
        self.assertIn("batería", f[0].challenge)

    def test_open_circuit(self):
        f = detect_student_mistakes("circuit", "single_loop", SimpleNamespace(voltage_v=9, resistance_ohms=100, circuit_closed=False))
        self.assertEqual([x.code for x in f], ["open_circuit"])

    def test_led_without_resistor(self):
        f = detect_student_mistakes("circuit", "single_loop", SimpleNamespace(voltage_v=9, resistance_ohms=10, has_led=True, is_diode_led=True))
        self.assertEqual(f[0].code, "led_overcurrent")
        # un foco incandescente con la misma corriente es normal
        self.assertEqual(detect_student_mistakes("circuit", "single_loop", SimpleNamespace(voltage_v=9, resistance_ohms=30, has_led=True)), [])
        self.assertEqual(f[0].code, "led_overcurrent")

    def test_static_friction(self):
        f = detect_student_mistakes("physics", "inclined_plane", SimpleNamespace(angle_degrees=20, friction_coefficient=0.5, mass_kg=2))
        self.assertEqual(f[0].code, "static_friction")
        self.assertIn("ángulo mínimo", f[0].challenge)
        self.assertIn("26.57", f[0].hint)

    def test_sliding_block_has_no_mistake(self):
        self.assertEqual(detect_student_mistakes("physics", "inclined_plane", SimpleNamespace(angle_degrees=30, friction_coefficient=0.2, mass_kg=2)), [])

    def test_atwood_inverted_arrow(self):
        f = detect_student_mistakes("physics", "atwood_machine", SimpleNamespace(mass_1_kg=5, mass_2_kg=3, drawn_acceleration_toward="mass_2"))
        self.assertEqual(f[0].code, "inverted_force")

    def test_infinite_loop(self):
        nodes = [
            FlowNode(id="n1", shape="oval", role="start", label="Inicio"),
            FlowNode(id="n2", shape="rectangle", role="process", label="i = 0"),
            FlowNode(id="n3", shape="diamond", role="decision", label="i < 5"),
            FlowNode(id="n4", shape="parallelogram", role="input_output", label="Imprimir i"),
            FlowNode(id="n5", shape="oval", role="end", label="Fin"),
        ]
        edges = [FlowEdge(from_node_id=a, to_node_id=b, condition_label=c) for a, b, c in
                 [("n1", "n2", None), ("n2", "n3", None), ("n3", "n4", "SÍ"), ("n4", "n3", None), ("n3", "n5", "NO")]]
        data = LoopFlowchartSimulation(nodes=nodes, edges=edges, loop_condition="i < 5", loop_variable="i",
                                       generated_code_py="", generated_code_js="")
        self.assertEqual(detect_student_mistakes("flowchart", "loop_flowchart", data)[0].code, "infinite_loop")
        # con el incremento dentro del cuerpo ya no es infinito
        nodes[3] = FlowNode(id="n4", shape="rectangle", role="process", label="i = i + 1")
        data.nodes = nodes
        self.assertEqual(detect_student_mistakes("flowchart", "loop_flowchart", data), [])

    def test_impossible_triangle(self):
        data = GeometricAnglesSimulation(problem_type="triangle_cevian", known_angles_deg={"A": 100, "B": 95}, unknown_variable="x",
                                         solved_value_deg=0, theorem_applied="Suma de ángulos", proof_steps=["..."])
        self.assertEqual(detect_student_mistakes("math_geo", "geometric_angles", data)[0].code, "impossible_triangle")

    def test_wrong_quadratic_answer(self):
        data = SimpleNamespace(equation_type="quadratic", discriminant_delta=-16, student_solution=["x = 1"], solution_set=["-1 - 2i", "-1 + 2i"])
        f = detect_student_mistakes("math_geo", "equation_solver", data)
        self.assertEqual((f[0].code, f[0].severity), ("no_real_roots", "warning"))

    def test_enrich_fills_defaults_and_keeps_llm_voice(self):
        llm = TutorFeedback(pedagogical_feedback="¡Muy bien!", socratic_challenge="¿Y si duplicas la masa?", fun_fact="Dato real.")
        t = enrich_tutor("physics", "inclined_plane", SimpleNamespace(angle_degrees=30, friction_coefficient=0.2, mass_kg=1), llm)
        self.assertFalse(t.has_error)
        self.assertEqual(t.pedagogical_feedback, "¡Muy bien!")
        empty = enrich_tutor("circuit", "series_resistors", SimpleNamespace(voltage_v=12, resistors_ohms=[10, 20]), None)
        self.assertTrue(empty.pedagogical_feedback and empty.socratic_challenge.endswith("?") and empty.fun_fact)

    def test_enrich_overrides_when_llm_missed_the_error(self):
        t = enrich_tutor("circuit", "single_loop", SimpleNamespace(voltage_v=9, resistance_ohms=0, circuit_closed=True),
                         TutorFeedback(pedagogical_feedback="¡Excelente circuito!"))
        self.assertTrue(t.has_error)
        self.assertEqual((t.error_type, t.mood), ("short_circuit", "warning"))
        self.assertIn("cortocircuito", t.pedagogical_feedback)


class TutorEndpointTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.img = _image()

    def tearDown(self):
        app.dependency_overrides.clear()

    def _post(self, skill: str, llm: LLMClient):
        app.dependency_overrides[get_llm_client] = lambda: llm
        return self.client.post(f"/analyze/{skill}", files={"file": ("hoja.jpg", self.img, "image/jpeg")})

    def test_short_circuit_returns_200_with_socratic_question(self):
        llm = SequenceLLM(_short_circuit())
        r = self._post("circuits", llm)
        self.assertEqual(r.status_code, 200, r.text)
        tutor = r.json()["tutor"]
        self.assertTrue(tutor["has_error"])
        self.assertEqual(tutor["error_type"], "short_circuit")
        self.assertEqual(tutor["socratic_challenge"], "¿Qué ocurriría con la batería si cerramos este circuito?")
        # El LLM no lo comentó: se pidió UNA verificación de lectura y luego se aceptó como error pedagógico
        self.assertEqual(len(llm.prompts), 2)
        self.assertIn("VERIFICACIÓN DE LECTURA", llm.prompts[1])
        self.assertIn("Tutor Socrático", llm.system_prompt)

    def test_llm_flagged_error_is_accepted_without_retry(self):
        tutor = TutorFeedback(mood="warning", has_error=True, error_type="short_circuit",
                              pedagogical_feedback="¡Cuidado! Los bornes están unidos.", socratic_challenge="¿Qué le pasa a la pila?")
        llm = SequenceLLM(_short_circuit(tutor))
        r = self._post("circuit", llm)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(len(llm.prompts), 1)
        self.assertEqual(r.json()["tutor"]["pedagogical_feedback"], "¡Cuidado! Los bornes están unidos.")

    def test_misread_value_is_corrected_on_recheck(self):
        bad = PhysicsAnalysisResult(
            exercise_type="inclined_plane", confidence=0.9, explanation="Rampa",
            simulation_data=InclinedPlaneSimulation(angle_degrees=-30, mass_kg=2, friction_coefficient=0.2,
                                                    acceleration_m_s2=0, weight_n=19.6, normal_force_n=0, friction_force_n=0),
        )
        good = bad.model_copy(deep=True)
        good.simulation_data.angle_degrees = 30
        llm = SequenceLLM(bad, good)
        r = self._post("physics", llm)
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["simulation_data"]["angle_degrees"], 30)
        self.assertFalse(body["tutor"]["has_error"])

    def test_negative_ramp_is_not_a_400(self):
        bad = PhysicsAnalysisResult(
            exercise_type="inclined_plane", confidence=0.9, explanation="Rampa",
            simulation_data=InclinedPlaneSimulation(angle_degrees=-30, mass_kg=2, friction_coefficient=0.2,
                                                    acceleration_m_s2=0, weight_n=19.6, normal_force_n=0, friction_force_n=0),
        )
        r = self._post("physics", SequenceLLM(bad))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["tutor"]["error_type"], "negative_angle")

    def test_flowchart_and_math_results_carry_tutor(self):
        nodes = [FlowNode(id="a", shape="oval", role="start", label="Inicio"), FlowNode(id="b", shape="oval", role="end", label="Fin")]
        from modules.analysis.domain.skills.flowchart.schema import SequentialFlowchartSimulation
        flow = FlowchartAnalysisResult(
            exercise_type="sequential_flowchart", confidence=0.95, explanation="Mínimo",
            simulation_data=SequentialFlowchartSimulation(nodes=nodes, edges=[FlowEdge(from_node_id="a", to_node_id="b")],
                                                          generated_code_py="pass", generated_code_js=""),
        )
        r = self._post("flowchart", SequenceLLM(flow))
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()["tutor"]["fun_fact"])

        tri = MathGeoAnalysisResult(
            skill=SkillId.MATH_GEO, exercise_type="geometric_angles", confidence=0.95, explanation="Triángulo",
            simulation_data=GeometricAnglesSimulation(problem_type="triangle_cevian", known_angles_deg={"A": 100, "B": 95},
                                                      unknown_variable="x", solved_value_deg=-15, theorem_applied="Suma",
                                                      proof_steps=["100 + 95 + x = 180"]),
        )
        r = self._post("math", SequenceLLM(tri))
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["tutor"]["error_type"], "impossible_triangle")


if __name__ == "__main__":
    unittest.main()
