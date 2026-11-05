"""Esquemas de datos Pydantic para el módulo de Física (6 tipos de ejercicios)."""

from typing import Optional, Annotated, Literal, Union
from pydantic import BaseModel, Field
from shared.types import BaseAnalysisResult, BoundingBox, SkillId


class InclinedPlaneSimulation(BaseModel):
    """1.1. Plano Inclinado con Fricción."""
    exercise_type: Literal["inclined_plane"] = "inclined_plane"
    angle_degrees: float = Field(..., ge=1.0, le=89.0, description="Ángulo de inclinación del plano (grados)")
    mass_kg: float = Field(default=1.0, gt=0.0, description="Masa del bloque en kg")
    friction_coefficient: float = Field(default=0.1, ge=0.0, description="Coeficiente de fricción cinético mu")
    gravity_m_s2: float = Field(default=9.8, gt=0.0, description="Aceleración de gravedad")
    acceleration_m_s2: float = Field(..., description="Aceleración neta: g*(sin(theta) - mu*cos(theta))")
    weight_n: float = Field(..., description="Fuerza peso: m*g")
    normal_force_n: float = Field(..., description="Fuerza normal: m*g*cos(theta)")
    friction_force_n: float = Field(..., description="Fuerza de fricción: mu*N")


class SimplePendulumSimulation(BaseModel):
    """1.2. Péndulo Simple."""
    exercise_type: Literal["simple_pendulum"] = "simple_pendulum"
    length_m: float = Field(..., gt=0.0, description="Longitud de la cuerda del péndulo (metros)")
    initial_angle_degrees: float = Field(..., description="Ángulo inicial de oscilación theta_0 (grados)")
    mass_kg: float = Field(default=0.5, gt=0.0, description="Masa de la lenteja/esfera suspendida (kg)")
    gravity_m_s2: float = Field(default=9.8, gt=0.0, description="Gravedad")
    period_s: float = Field(..., description="Período de oscilación T = 2*pi*sqrt(L/g)")
    max_velocity_m_s: float = Field(..., description="Velocidad máxima en el punto más bajo")
    tension_at_lowest_point_n: float = Field(..., description="Tensión en el punto más bajo")


class ProjectileMotionSimulation(BaseModel):
    """1.3. Tiro Parabólico (Lanzamiento de Proyectiles)."""
    exercise_type: Literal["projectile_motion"] = "projectile_motion"
    initial_velocity_m_s: float = Field(..., gt=0.0, description="Velocidad inicial v0 (m/s)")
    launch_angle_degrees: float = Field(..., ge=0.0, le=90.0, description="Ángulo de elevación theta (grados)")
    initial_height_m: float = Field(default=0.0, ge=0.0, description="Altura inicial de lanzamiento (m)")
    gravity_m_s2: float = Field(default=9.8, gt=0.0, description="Gravedad")
    max_height_m: float = Field(..., description="Altura máxima Hmax")
    range_m: float = Field(..., description="Alcance horizontal total Xmax")
    flight_time_s: float = Field(..., description="Tiempo total de vuelo tv")


class MassSpringSimulation(BaseModel):
    """1.4. Sistema Masa-Resorte (Ley de Hooke)."""
    exercise_type: Literal["mass_spring"] = "mass_spring"
    spring_constant_k_n_m: float = Field(..., gt=0.0, description="Constante de rigidez elástica k (N/m)")
    mass_kg: float = Field(..., gt=0.0, description="Masa acoplada al resorte (kg)")
    initial_displacement_m: float = Field(..., description="Elongación o compresión inicial delta_x (m)")
    damping_coefficient: float = Field(default=0.0, ge=0.0, description="Coeficiente de amortiguamiento")
    angular_frequency_rad_s: float = Field(..., description="Frecuencia angular omega = sqrt(k/m)")
    period_s: float = Field(..., description="Período de oscilación T = 2*pi/omega")


class RectilinearMotionSimulation(BaseModel):
    """1.5. Cinemática Rectilínea (MRU y MRUV)."""
    exercise_type: Literal["rectilinear_motion"] = "rectilinear_motion"
    motion_type: Literal["MRU", "MRUV"] = Field(..., description="Régimen de movimiento rectilíneo")
    initial_position_m: float = Field(default=0.0, description="Posición inicial x0 (m)")
    initial_velocity_m_s: float = Field(..., description="Velocidad inicial v0 (m/s)")
    acceleration_m_s2: float = Field(default=0.0, description="Aceleración 'a' (0 en MRU)")
    total_time_s: float = Field(default=5.0, gt=0.0, description="Ventana de tiempo simulada (s)")
    final_velocity_m_s: float = Field(..., description="Velocidad al final del tramo")
    distance_traveled_m: float = Field(..., description="Distancia total recorrida")
    second_initial_position_m: Optional[float] = Field(default=None, description="Si hay un SEGUNDO móvil (problema de encuentro): su posición inicial x0 (m)")
    second_initial_velocity_m_s: Optional[float] = Field(default=None, description="Velocidad inicial del segundo móvil (negativa si va en sentido contrario)")
    second_acceleration_m_s2: Optional[float] = Field(default=None, description="Aceleración del segundo móvil")


class AtwoodMachineSimulation(BaseModel):
    """1.6. Máquina de Atwood (Poleas y Cuerdas)."""
    exercise_type: Literal["atwood_machine"] = "atwood_machine"
    mass_1_kg: float = Field(..., gt=0.0, description="Masa 1 colgante (kg)")
    mass_2_kg: float = Field(..., gt=0.0, description="Masa 2 colgante (kg)")
    pulley_radius_m: float = Field(default=0.1, gt=0.0, description="Radio de la polea (m)")
    gravity_m_s2: float = Field(default=9.8, gt=0.0, description="Gravedad")
    acceleration_m_s2: float = Field(..., description="Aceleración neta: g*|m1-m2|/(m1+m2)")
    tension_n: float = Field(..., description="Tensión en la cuerda: 2*m1*m2*g/(m1+m2)")
    mass_3_kg: Optional[float] = Field(default=None, gt=0.0, description="Si hay DOS poleas: masa apoyada en la mesa entre ambas (kg)")
    table_friction_coefficient: Optional[float] = Field(default=None, ge=0.0, description="Fricción entre la masa 3 y la mesa")


PhysicsSimulationData = Annotated[
    Union[
        InclinedPlaneSimulation,
        SimplePendulumSimulation,
        ProjectileMotionSimulation,
        MassSpringSimulation,
        RectilinearMotionSimulation,
        AtwoodMachineSimulation,
    ],
    Field(discriminator="exercise_type"),
]


class PhysicsAnalysisResult(BaseModel):
    """Contrato final devuelto por el módulo de física."""
    skill: Literal[SkillId.PHYSICS] = SkillId.PHYSICS
    exercise_type: Literal[
        "inclined_plane",
        "simple_pendulum",
        "projectile_motion",
        "mass_spring",
        "rectilinear_motion",
        "atwood_machine",
    ] = Field(..., description="Subtipo de física clasificado")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Nivel de confianza de 0 a 1")
    question: Optional[str] = Field(
        default=None,
        description="Qué pide el enunciado, en español breve (ej: 'Hallar la aceleración del bloque'). Si no está escrito, infiérelo.",
    )
    detected_elements: list[str] = Field(default_factory=list, description="Lista de trazos reconocidos")
    bounding_boxes: list[BoundingBox] = Field(default_factory=list, description="Coordenadas para anclaje WebAR")
    explanation: str = Field(..., description="Resumen conciso del ejercicio físico identificado")
    raw_annotations: list[str] = Field(default_factory=list, description="Valores y notas textuales manuscritas")
    simulation_data: PhysicsSimulationData = Field(..., description="Parámetros físicos listos para el simulador")

