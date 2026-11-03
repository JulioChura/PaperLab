"""Esquemas de datos Pydantic para el módulo de Circuitos Eléctricos (6 tipos)."""

from typing import Annotated, Literal, Optional, Union
from pydantic import BaseModel, Field
from shared.types import BaseAnalysisResult, BoundingBox, SkillId


class SingleLoopSimulation(BaseModel):
    """2.1. Circuito Simple de Malla Única."""
    exercise_type: Literal["single_loop"] = "single_loop"
    voltage_v: float = Field(..., gt=0.0, description="Voltaje de la fuente V")
    resistance_ohms: float = Field(..., gt=0.0, description="Resistencia total R en Ohms")
    current_a: float = Field(..., description="Corriente I = V / R en Amperios")
    power_w: float = Field(..., description="Potencia disipada P = V * I en Watts")
    has_led: bool = Field(default=True, description="Indica si contiene una bombilla o LED")
    led_color: Optional[str] = Field(default="yellow", description="Color proyectado para el LED")


class SeriesResistorsSimulation(BaseModel):
    """2.2. Resistencias en Serie."""
    exercise_type: Literal["series_resistors"] = "series_resistors"
    voltage_v: float = Field(..., gt=0.0, description="Voltaje total de alimentación V")
    resistors_ohms: list[float] = Field(..., min_length=2, description="Valores individuales de cada resistencia en serie")
    equivalent_resistance_ohms: float = Field(..., description="Resistencia equivalente Req = sum(Ri)")
    current_a: float = Field(..., description="Corriente del circuito I = V / Req")
    voltage_drops_v: list[float] = Field(..., description="Caída de potencial en cada resistor Vi = I * Ri")


class ParallelResistorsSimulation(BaseModel):
    """2.3. Resistencias en Paralelo."""
    exercise_type: Literal["parallel_resistors"] = "parallel_resistors"
    voltage_v: float = Field(..., gt=0.0, description="Voltaje de los nodos en paralelo")
    resistors_ohms: list[float] = Field(..., min_length=2, description="Valores individuales de resistores en paralelo")
    equivalent_resistance_ohms: float = Field(..., description="Req tal que 1/Req = sum(1/Ri)")
    branch_currents_a: list[float] = Field(..., description="Corriente por cada rama Ii = V / Ri")
    total_current_a: float = Field(..., description="Corriente total suministrada sum(Ii)")


class InteractiveSwitchSimulation(BaseModel):
    """2.4. Circuito con Interruptor Interactivo (Switch)."""
    exercise_type: Literal["interactive_switch"] = "interactive_switch"
    initial_state: Literal["open", "closed"] = Field(..., description="Estado inicial del interruptor")
    voltage_v: float = Field(..., gt=0.0, description="Voltaje de la fuente")
    load_resistance_ohms: float = Field(..., gt=0.0, description="Resistencia de la carga")
    current_open_a: float = Field(default=0.0, description="Corriente en estado abierto (0 A)")
    current_closed_a: float = Field(..., description="Corriente en estado cerrado (V / R)")
    switch_location: Optional[BoundingBox] = Field(default=None, description="Ubicación para botón interactivo táctil")


class RCCircuitSimulation(BaseModel):
    """2.5. Circuito RC (Carga y Descarga)."""
    exercise_type: Literal["rc_circuit"] = "rc_circuit"
    voltage_v: float = Field(..., gt=0.0, description="Tensión de la fuente")
    resistance_ohms: float = Field(..., gt=0.0, description="Resistencia en serie")
    capacitance_uf: float = Field(..., gt=0.0, description="Capacitancia del condensador en microfaradios")
    time_constant_tau_s: float = Field(..., description="Constante de tiempo tau = R * C (segundos)")
    max_charge_uc: float = Field(..., description="Carga máxima almacenada Qmax = C * V (microcoulombs)")
    mode: Literal["charging", "discharging"] = Field(default="charging", description="Modo de simulación")


class LogicGateRow(BaseModel):
    """Fila de la tabla de verdad de una compuerta lógica."""
    inputs: list[int] = Field(..., description="Valores binarios de entrada [0|1]")
    output: int = Field(..., description="Valor binario resultante [0|1]")


class LogicGatesSimulation(BaseModel):
    """2.6. Puertas Lógicas Básicas (AND, OR, NOT, etc.)."""
    exercise_type: Literal["logic_gates"] = "logic_gates"
    gate_type: Literal["AND", "OR", "NOT", "NAND", "NOR", "XOR"] = Field(..., description="Tipo de compuerta lógica")
    inputs: list[int] = Field(..., description="Valores binarios presentes en las patillas de entrada")
    output: int = Field(..., description="Resultado binario en la salida")
    boolean_expression: str = Field(..., description="Expresión booleana (ej: 'A * B', 'A + B', '!A')")
    truth_table: list[LogicGateRow] = Field(default_factory=list, description="Tabla de verdad completa")


CircuitSimulationData = Annotated[
    Union[
        SingleLoopSimulation,
        SeriesResistorsSimulation,
        ParallelResistorsSimulation,
        InteractiveSwitchSimulation,
        RCCircuitSimulation,
        LogicGatesSimulation,
    ],
    Field(discriminator="exercise_type"),
]


class CircuitAnalysisResult(BaseModel):
    """Contrato devuelto por el módulo de circuitos."""
    skill: Literal[SkillId.CIRCUIT] = SkillId.CIRCUIT
    exercise_type: Literal[
        "single_loop",
        "series_resistors",
        "parallel_resistors",
        "interactive_switch",
        "rc_circuit",
        "logic_gates",
    ] = Field(..., description="Subtipo de circuito detectado")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Nivel de certeza de 0 a 1")
    detected_elements: list[str] = Field(default_factory=list, description="Componentes reconocidos (batería, R, switch, LED)")
    bounding_boxes: list[BoundingBox] = Field(default_factory=list, description="Coordenadas para anclaje de componentes en WebAR")
    explanation: str = Field(..., description="Explicación concisa del circuito y leyes aplicadas")
    raw_annotations: list[str] = Field(default_factory=list, description="Valores numéricos manuscritos (Ohms, Volts)")
    simulation_data: CircuitSimulationData = Field(..., description="Parámetros eléctricos para el simulador")

