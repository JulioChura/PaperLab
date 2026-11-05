"""Contrato frontend ↔ backend: cada ejemplo de `ejemplos/` debe ser una respuesta válida del backend."""

import json
import unittest
from pathlib import Path

from pydantic import TypeAdapter

from modules.analysis.domain.pedagogy import serious_findings
from modules.analysis.domain.skills.circuit.schema import CircuitSimulationData
from modules.analysis.domain.skills.flowchart.schema import FlowchartSimulationData
from modules.analysis.domain.skills.math_geo.schema import MathGeoSimulationData
from modules.analysis.domain.skills.physics.schema import PhysicsSimulationData
from shared.types import TutorFeedback

EXAMPLES = Path(__file__).resolve().parents[2] / "ejemplos"
ADAPTERS = {
    "physics": TypeAdapter(PhysicsSimulationData),
    "circuit": TypeAdapter(CircuitSimulationData),
    "flowchart": TypeAdapter(FlowchartSimulationData),
    "math_geo": TypeAdapter(MathGeoSimulationData),
}


class ExamplesContractTests(unittest.TestCase):
    def setUp(self):
        self.files = sorted(EXAMPLES.rglob("*.json"))

    def test_there_are_examples_for_every_level(self):
        rel = {p.relative_to(EXAMPLES).parts[0] for p in self.files}
        self.assertTrue({"1_fisica", "nivel_2", "errores", "misiones"} <= rel, rel)
        self.assertGreaterEqual(len(self.files), 65)

    def test_every_example_matches_the_backend_schema(self):
        for path in self.files:
            with self.subTest(example=str(path.relative_to(EXAMPLES))):
                body = json.loads(path.read_text(encoding="utf-8"))
                ADAPTERS[body["skill"]].validate_python(body["parameters"])
                tutor = TutorFeedback.model_validate(body["tutor"])
                self.assertTrue(tutor.pedagogical_feedback)
                self.assertTrue(tutor.socratic_challenge.strip().endswith("?"))
                self.assertTrue(tutor.fun_fact)

    def test_error_examples_are_detected_by_the_deterministic_tutor(self):
        """Los ejemplos de error que dependen de números deben coincidir con lo que detecta pedagogy.py."""
        deterministic = {"error_static_friction", "error_negative_ramp", "error_atwood_arrow", "error_short_circuit",
                         "error_open_circuit", "error_led_no_resistor", "error_infinite_loop", "error_impossible_triangle",
                         "error_no_real_roots"}
        found = set()
        for path in (EXAMPLES / "errores").rglob("*.json"):
            body = json.loads(path.read_text(encoding="utf-8"))
            data = ADAPTERS[body["skill"]].validate_python(body["parameters"])
            codes = {f.code for f in serious_findings(body["skill"], body["exercise_type"], data)}
            with self.subTest(example=path.stem):
                self.assertTrue(body["tutor"]["has_error"])
                self.assertIn(body["tutor"]["error_type"], codes)
            found.add(path.stem)
        self.assertEqual(found, deterministic)

    def test_correct_examples_have_no_false_alarms(self):
        for level in ("1_fisica", "2_circuitos", "3_algoritmos", "4_matematicas", "nivel_2"):
            for path in (EXAMPLES / level).rglob("*.json"):
                body = json.loads(path.read_text(encoding="utf-8"))
                data = ADAPTERS[body["skill"]].validate_python(body["parameters"])
                with self.subTest(example=str(path.relative_to(EXAMPLES))):
                    self.assertEqual([f.code for f in serious_findings(body["skill"], body["exercise_type"], data)], [])
                    self.assertFalse(body["tutor"]["has_error"])


if __name__ == "__main__":
    unittest.main()
