"""Esquemas de datos Pydantic para el módulo de Matemáticas & Geometría (5 tipos preuniversitarios)."""

from typing import Annotated, Literal, Optional, Union
from pydantic import BaseModel, Field
from shared.types import BaseAnalysisResult, BoundingBox, SkillId


class Geometry3DSimulation(BaseModel):
    """4.1. Geometría del Espacio (Estereometría 3D sobre Papel)."""
    exercise_type: Literal["geometry_3d"] = "geometry_3d"
    solid_type: Literal["cylinder", "cone", "sphere", "prism", "pyramid"] = Field(
        ..., description="Sólido geométrico tridimensional identificado"
    )
    radius_units: Optional[float] = Field(default=None, gt=0.0, description="Radio r de la base o de la esfera")
    height_units: Optional[float] = Field(default=None, gt=0.0, description="Altura h del sólido")
    edge_units: Optional[float] = Field(default=None, gt=0.0, description="Arista o generatriz del sólido")
    volume_units3: float = Field(..., description="Volumen calculado del sólido")
    lateral_area_units2: Optional[float] = Field(default=None, description="Área lateral")
    total_area_units2: float = Field(..., description="Área superficial total")
    formulas_applied: list[str] = Field(default_factory=list, description="Fórmulas aplicadas (ej: 'V = pi * r^2 * h')")


class AnalyticGeometrySimulation(BaseModel):
    """4.2. Geometría Analítica en el Plano Cartesiano."""
    exercise_type: Literal["analytic_geometry"] = "analytic_geometry"
    entity_type: Literal["points_segment", "straight_line", "circle", "parabola"] = Field(
        ..., description="Entidad geométrica sobre ejes XY"
    )
    point_a: Optional[list[float]] = Field(default=None, description="Coordenadas [x, y] del punto A")
    point_b: Optional[list[float]] = Field(default=None, description="Coordenadas [x, y] del punto B")
    distance: Optional[float] = Field(default=None, description="Distancia d entre puntos")
    slope_m: Optional[float] = Field(default=None, description="Pendiente de la recta m = (y2 - y1) / (x2 - x1)")
    midpoint: Optional[list[float]] = Field(default=None, description="Punto medio [(x1+x2)/2, (y1+y2)/2]")
    general_equation: Optional[str] = Field(default=None, description="Ecuación general (ej: '2x - 3y + 6 = 0')")
    canonical_equation: Optional[str] = Field(default=None, description="Ecuación canónica u ordinaria")


class FunctionGraphSimulation(BaseModel):
    """4.3. Gráfica de Funciones f(x)."""
    exercise_type: Literal["function_graph"] = "function_graph"
    function_expression: str = Field(..., description="Expresión de la función (ej: 'f(x) = x^2 - 4x + 3')")
    function_type: Literal["linear", "quadratic", "absolute_value", "trigonometric", "rational"] = Field(
        ..., description="Tipo de curva funcional"
    )
    domain: str = Field(default="R", description="Dominio de la función")
    range_y: str = Field(..., description="Rango de valores de la función")
    roots: list[float] = Field(default_factory=list, description="Raíces o intersecciones con el eje X")
    y_intercept: float = Field(..., description="Punto de corte con el eje Y f(0)")
    vertex: Optional[list[float]] = Field(default=None, description="Vértice [h, k] para parábolas")
    critical_points_explanation: str = Field(..., description="Descripción de asíntotas, concavidad y simetría")


class EquationSolverSimulation(BaseModel):
    """4.4. Solver de Ecuaciones Paso a Paso."""
    exercise_type: Literal["equation_solver"] = "equation_solver"
    equation_latex: str = Field(..., description="Ecuación manuscrita en formato LaTeX")
    equation_plain: Optional[str] = Field(
        default=None,
        description="La misma ecuación en texto plano ASCII, usando ^ para potencias y * opcional (ej: 'x^2 + 2x - 3 = 0')",
    )
    equation_type: Literal["linear", "quadratic", "system_2x2", "exponential"] = Field(
        ..., description="Clase de ecuación algebraica"
    )
    discriminant_delta: Optional[float] = Field(default=None, description="Discriminante b^2 - 4ac para cuadráticas")
    steps: list[str] = Field(..., min_length=1, description="Pasos deductivos detallados hacia la solución")
    solution_set: list[str] = Field(..., min_length=1, description="Conjunto solución C.S. = {x1, x2...}")
    method_used: Optional[str] = Field(default=None, description="Método (Fórmula general, Aspa simple, etc.)")


class GeometricAnglesSimulation(BaseModel):
    """4.5. Cálculo de Ángulos en Figuras Geométricas."""
    exercise_type: Literal["geometric_angles"] = "geometric_angles"
    problem_type: Literal["parallel_transversal", "triangle_cevian", "inscribed_quadrilateral", "general_polygon"] = Field(
        ..., description="Configuración angular de examen de admisión"
    )
    known_angles_deg: dict[str, float] = Field(default_factory=dict, description="Ángulos y etiquetas conocidas (ej: {'alpha': 40.0})")
    unknown_variable: str = Field(..., description="Variable incógnita buscada (ej: 'x')")
    solved_value_deg: float = Field(..., description="Valor numérico final del ángulo resuelto en grados sexagesimales")
    theorem_applied: str = Field(..., description="Teorema o propiedad geométrica fundamental (ej: 'Teorema del Boomerang')")
    proof_steps: list[str] = Field(..., min_length=1, description="Deducción geométrica paso a paso")


MathGeoSimulationData = Annotated[
    Union[
        Geometry3DSimulation,
        AnalyticGeometrySimulation,
        FunctionGraphSimulation,
        EquationSolverSimulation,
        GeometricAnglesSimulation,
    ],
    Field(discriminator="exercise_type"),
]


class MathGeoAnalysisResult(BaseModel):
    """Contrato devuelto por el módulo de matemáticas y geometría."""
    skill: Literal[SkillId.MATH_GEO] = SkillId.MATH_GEO
    exercise_type: Literal[
        "geometry_3d",
        "analytic_geometry",
        "function_graph",
        "equation_solver",
        "geometric_angles",
    ] = Field(..., description="Subtipo de ejercicio matemático clasificado")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Nivel de certeza de 0 a 1")
    question: Optional[str] = Field(
        default=None,
        description="Qué pide el enunciado, en español breve (ej: 'Hallar la aceleración del bloque'). Si no está escrito, infiérelo.",
    )
    detected_elements: list[str] = Field(default_factory=list, description="Trazos, figuras y ángulos identificados")
    bounding_boxes: list[BoundingBox] = Field(default_factory=list, description="Coordenadas para superposición holográfica WebAR")
    explanation: str = Field(..., description="Explicación pedagógica y deductiva del problema")
    raw_annotations: list[str] = Field(default_factory=list, description="Ecuaciones o medidas manuscritas leídas")
    simulation_data: MathGeoSimulationData = Field(..., description="Parámetros matemáticos y resolución para WebAR")

