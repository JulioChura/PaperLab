"""Tests automatizados del backend de PaperLab."""

import io
import unittest
from PIL import Image
from fastapi.testclient import TestClient

from main import app
from modules.analysis.api import get_llm_client
from modules.analysis.domain.skills import get_skill, list_available_skills
from modules.analysis.domain.skills.physics.schema import (
    InclinedPlaneSimulation,
    PhysicsAnalysisResult,
)
from modules.analysis.domain.skills.circuit.schema import (
    CircuitAnalysisResult,
    SingleLoopSimulation,
)
from modules.analysis.domain.skills.flowchart.schema import (
    FlowEdge,
    FlowNode,
    FlowchartAnalysisResult,
    SequentialFlowchartSimulation,
)
from modules.analysis.domain.skills.math_geo.schema import (
    Geometry3DSimulation,
    MathGeoAnalysisResult,
)
from modules.analysis.ports.llm import LLMClient
from shared.types import BoundingBox, SkillId, normalize_skill_id


class MockLLMClient(LLMClient):
    """Mock del puerto LLM para pruebas determinísticas sin consumir API key."""

    def __init__(self, mock_result):
        self.mock_result = mock_result

    async def analyze_image_with_schema(self, image_bytes, mime_type, system_prompt, user_prompt, schema):
        return self.mock_result


class PaperLabBackendTestCase(unittest.TestCase):
    """Suite de pruebas para el backend modular de PaperLab."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

        # Generar una imagen de prueba válida en memoria
        img_buffer = io.BytesIO()
        test_img = Image.new("RGB", (200, 200), color="white")
        test_img.save(img_buffer, format="JPEG")
        cls.valid_image_bytes = img_buffer.getvalue()

    def test_health_check(self):
        """Verifica que el endpoint /health responda status ok."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertEqual(data["service"], "PaperLab WebAR Analysis Backend")
        self.assertIn("version", data)

    def test_skills_catalog(self):
        """Verifica que /skills exponga los 4 skills y los 23 tipos de la rúbrica."""
        response = self.client.get("/skills")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["total_skills"], 4)
        self.assertEqual(data["total_exercise_types"], 23)

        skill_ids = [s["skill_id"] for s in data["skills"]]
        self.assertIn("physics", skill_ids)
        self.assertIn("circuit", skill_ids)
        self.assertIn("flowchart", skill_ids)
        self.assertIn("math_geo", skill_ids)

    def test_normalize_skill_aliases(self):
        """Verifica que los alias de frontend (ej: 'circuits', 'math') se normalicen."""
        self.assertEqual(normalize_skill_id("physics"), SkillId.PHYSICS)
        self.assertEqual(normalize_skill_id("circuits"), SkillId.CIRCUIT)
        self.assertEqual(normalize_skill_id("flowcharts"), SkillId.FLOWCHART)
        self.assertEqual(normalize_skill_id("math"), SkillId.MATH_GEO)
        self.assertEqual(normalize_skill_id("geometria"), SkillId.MATH_GEO)

    def test_invalid_skill_returns_404(self):
        """Verifica que solicitar un skill no existente devuelva 404."""
        response = self.client.post(
            "/analyze/no_existe",
            files={"file": ("test.jpg", self.valid_image_bytes, "image/jpeg")},
        )
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"]["error"], "SkillNotFound")

    def test_empty_file_returns_400(self):
        """Verifica que subir un archivo vacío devuelva 400."""
        response = self.client.post(
            "/analyze/physics",
            files={"file": ("test.jpg", b"", "image/jpeg")},
        )
        self.assertEqual(response.status_code, 400)

    def test_non_image_file_returns_400(self):
        """Verifica que subir un archivo no soportado devuelva 400."""
        response = self.client.post(
            "/analyze/physics",
            files={"file": ("documento.pdf", b"%PDF-1.4...", "application/pdf")},
        )
        self.assertEqual(response.status_code, 400)

    def test_successful_analysis_with_mock_llm(self):
        """Verifica el flujo completo de análisis inyectando un mock LLM."""
        mock_physics_result = PhysicsAnalysisResult(
            skill=SkillId.PHYSICS,
            exercise_type="inclined_plane",
            confidence=0.95,
            detected_elements=["rampa triangular", "bloque 2kg", "ángulo 30 grados"],
            bounding_boxes=[
                BoundingBox(x=0.1, y=0.2, width=0.7, height=0.5, label="plano_inclinado"),
                BoundingBox(x=0.4, y=0.35, width=0.15, height=0.15, label="bloque"),
            ],
            explanation="Plano inclinado a 30° con bloque deslizándose con fricción.",
            raw_annotations=["theta = 30°", "m = 2kg", "mu = 0.1"],
            simulation_data=InclinedPlaneSimulation(
                exercise_type="inclined_plane",
                angle_degrees=30.0,
                mass_kg=2.0,
                friction_coefficient=0.1,
                gravity_m_s2=9.8,
                acceleration_m_s2=4.05,
                weight_n=19.6,
                normal_force_n=16.97,
                friction_force_n=1.697,
            ),
        )

        app.dependency_overrides[get_llm_client] = lambda: MockLLMClient(mock_physics_result)
        try:
            response = self.client.post(
                "/analyze/physics",
                files={"file": ("plano.jpg", self.valid_image_bytes, "image/jpeg")},
                data={"notes": "Bloque de madera de 2 kg"},
            )
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["skill"], "physics")
            self.assertEqual(data["exercise_type"], "inclined_plane")
            self.assertEqual(data["confidence"], 0.95)
            self.assertEqual(data["simulation_data"]["angle_degrees"], 30.0)
            self.assertEqual(data["simulation_data"]["mass_kg"], 2.0)
            self.assertEqual(len(data["bounding_boxes"]), 2)
        finally:
            app.dependency_overrides.clear()

    def test_deterministic_validation_catches_invalid_angle(self):
        """Verifica que el validador determinístico rechace ángulos fuera de rango físico."""
        from modules.analysis.domain.validators import validate_physics_data
        from types import SimpleNamespace

        invalid_mock_data = SimpleNamespace(
            angle_degrees=95.0,
            friction_coefficient=-0.1,
            mass_kg=0.0,
        )
        violations = validate_physics_data("inclined_plane", invalid_mock_data)
        self.assertTrue(len(violations) >= 2)
        self.assertTrue(any("entre 0° y 90°" in v for v in violations))
        self.assertTrue(any("fricción" in v for v in violations))


if __name__ == "__main__":
    unittest.main()
