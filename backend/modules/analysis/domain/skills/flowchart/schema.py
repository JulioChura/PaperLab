"""Esquemas de datos Pydantic para el módulo de Diagramas de Flujo y Análisis de Código (6 tipos)."""

from typing import Annotated, Literal, Optional, Union
from pydantic import BaseModel, Field
from shared.types import BaseAnalysisResult, BoundingBox, SkillId


class FlowNode(BaseModel):
    """Nodo gráfico dentro del diagrama de flujo."""
    id: str = Field(..., description="Identificador único del nodo (ej: 'node_1')")
    shape: Literal["oval", "rectangle", "diamond", "parallelogram"] = Field(
        ..., description="Forma geométrica del bloque dibujado"
    )
    role: Literal["start", "end", "process", "decision", "input_output"] = Field(
        ..., description="Rol sintáctico en el diagrama"
    )
    label: str = Field(..., description="Texto manuscrito contenido dentro del nodo")
    bounding_box: Optional[BoundingBox] = Field(default=None, description="Coordenadas del nodo en el papel")


class FlowEdge(BaseModel):
    """Flecha de conexión direccional entre dos nodos."""
    from_node_id: str = Field(..., description="ID del nodo de origen")
    to_node_id: str = Field(..., description="ID del nodo de destino")
    condition_label: Optional[str] = Field(default=None, description="Etiqueta de rama (ej: 'SÍ', 'NO', 'True', 'False')")


class ExecutionStep(BaseModel):
    """Un paso de la traza de ejecución que alimenta el debugger WebAR."""
    step: int = Field(..., ge=1, description="Número ordinal del paso")
    node_id: Optional[str] = Field(default=None, description="ID del nodo del diagrama activo en este paso")
    line_number: Optional[int] = Field(default=None, ge=1, description="Línea de código activa en este paso")
    description: str = Field(..., description="Qué ocurre en este paso, en español breve (ej: 'i < 3 es verdadero')")
    variables: dict[str, str] = Field(
        default_factory=dict,
        description=(
            "SNAPSHOT COMPLETO de TODAS las variables tras ejecutar el paso (no solo las que cambian). "
            "Los arreglos/listas van como JSON, ej: '[5, 2, 9]'; los textos entre comillas, ej: '\"hola\"'"
        ),
    )
    output: Optional[str] = Field(default=None, description="Texto impreso en consola en este paso, si lo hay")
    call_stack: list[str] = Field(default_factory=list, description="Marcos activos de la pila, ej: ['fact(3)', 'fact(2)']")


EXECUTION_DESCRIPTION = (
    "Traza completa de ejecución paso a paso (máx. 40 pasos) para el debugger: un paso por nodo/línea ejecutada, "
    "con el snapshot completo de variables en cada paso. Usa valores de entrada de ejemplo si el diagrama lee datos."
)


class SequentialFlowchartSimulation(BaseModel):
    """3.1. Diagrama de Flujo Secuencial."""
    exercise_type: Literal["sequential_flowchart"] = "sequential_flowchart"
    nodes: list[FlowNode] = Field(..., min_length=2, description="Nodos ordenados del flujo")
    edges: list[FlowEdge] = Field(..., description="Flechas direccionales de conexión")
    variables: list[str] = Field(default_factory=list, description="Variables declaradas o manipuladas")
    generated_code_py: str = Field(..., description="Código generado equivalente en Python")
    generated_code_js: str = Field(..., description="Código generado equivalente en JavaScript")
    execution: list[ExecutionStep] = Field(default_factory=list, max_length=60, description=EXECUTION_DESCRIPTION)


class ConditionalFlowchartSimulation(BaseModel):
    """3.2. Diagrama de Flujo Condicional (IF / ELSE)."""
    exercise_type: Literal["conditional_flowchart"] = "conditional_flowchart"
    nodes: list[FlowNode] = Field(..., min_length=3, description="Nodos del diagrama incluyendo rombo de decisión")
    edges: list[FlowEdge] = Field(..., description="Flechas que conectan las bifurcaciones")
    decision_condition: str = Field(..., description="Condición evaluada en el rombo (ej: 'x >= 0')")
    true_branch_node_id: str = Field(..., description="ID del nodo al que va la rama 'SÍ'")
    false_branch_node_id: str = Field(..., description="ID del nodo al que va la rama 'NO'")
    generated_code_py: str = Field(..., description="Código Python con if/else")
    generated_code_js: str = Field(..., description="Código JavaScript con if/else")
    execution: list[ExecutionStep] = Field(default_factory=list, max_length=60, description=EXECUTION_DESCRIPTION)


class LoopFlowchartSimulation(BaseModel):
    """3.3. Diagrama de Flujo con Bucle (While / For)."""
    exercise_type: Literal["loop_flowchart"] = "loop_flowchart"
    nodes: list[FlowNode] = Field(..., min_length=3, description="Nodos del diagrama de flujo")
    edges: list[FlowEdge] = Field(..., description="Flechas incluyendo la flecha de retorno al inicio del bucle")
    loop_condition: str = Field(..., description="Condición de permanencia del ciclo (ej: 'i < 10')")
    loop_variable: str = Field(..., description="Variable iteradora de control")
    generated_code_py: str = Field(..., description="Código Python representativo del bucle")
    generated_code_js: str = Field(..., description="Código JavaScript representativo del bucle")
    execution: list[ExecutionStep] = Field(default_factory=list, max_length=60, description=EXECUTION_DESCRIPTION)


class DebugStep(BaseModel):
    """Paso secuencial de depuración sobre una línea de código manuscrita."""
    step_number: int = Field(..., ge=1, description="Número ordinal del paso")
    line_number: int = Field(..., ge=1, description="Número de línea en ejecución")
    line_code: str = Field(..., description="Texto de la instrucción ejecutada")
    variable_updates: dict[str, str] = Field(default_factory=dict, description="Variables actualizadas en este paso")
    console_output: Optional[str] = Field(default=None, description="Salida enviada a consola si aplica")


class CodeDebuggerSimulation(BaseModel):
    """3.4. Análisis y Depurador de Código Manuscrito (Debugger Paso a Paso)."""
    exercise_type: Literal["code_debugger"] = "code_debugger"
    source_code: str = Field(..., description="Código o pseudocódigo manuscrito extraído completo")
    detected_language: str = Field(default="python", description="Lenguaje detectado (python, pseudocodigo, javascript)")
    steps: list[DebugStep] = Field(..., min_length=1, description="Secuencia de pasos para ejecución paso a paso")
    final_output: str = Field(default="", description="Resultado final tras la ejecución completa")
    execution: list[ExecutionStep] = Field(default_factory=list, max_length=60, description=EXECUTION_DESCRIPTION)


class TraceTableRow(BaseModel):
    """Fila de la tabla de traza de variables."""
    iteration: int = Field(..., description="Número de iteración o paso de control")
    variables: dict[str, str] = Field(..., description="Valores de las variables en este momento")
    condition_evaluated: Optional[str] = Field(default=None, description="Resultado de la condición booleana")


class TraceTableSimulation(BaseModel):
    """3.5. Tabla de Traza e Inspector de Memoria."""
    exercise_type: Literal["trace_table"] = "trace_table"
    watched_variables: list[str] = Field(..., description="Variables rastreadas en la tabla")
    rows: list[TraceTableRow] = Field(..., min_length=1, description="Filas cronológicas de la traza")
    initial_memory: dict[str, str] = Field(default_factory=dict, description="Estado de memoria inicial")
    final_memory: dict[str, str] = Field(default_factory=dict, description="Estado de memoria al concluir")
    graph_nodes: list[str] = Field(default_factory=list, description="Si la traza recorre un ÁRBOL o GRAFO: etiquetas de sus nodos")
    graph_edges: list[list[str]] = Field(default_factory=list, description="Aristas del árbol/grafo como pares [origen, destino]")
    traversal: Optional[str] = Field(default=None, description="Recorrido aplicado: 'BFS', 'DFS', 'preorden', etc. Cada fila debe incluir la variable 'actual'")
    execution: list[ExecutionStep] = Field(default_factory=list, max_length=60, description=EXECUTION_DESCRIPTION)


class RecursiveFlowchartSimulation(BaseModel):
    """3.6. Recursión y Pilas de Llamada (Call Stack)."""
    exercise_type: Literal["recursive_flowchart"] = "recursive_flowchart"
    function_name: str = Field(..., description="Nombre de la función recursiva (ej: 'factorial', 'fibonacci')")
    base_case: str = Field(..., description="Condición de caso base de parada (ej: 'n <= 1')")
    recursive_call: str = Field(..., description="Llamada recursiva recursiva (ej: 'n * fact(n - 1)')")
    call_stack_trace: list[str] = Field(..., description="Visualización de la pila de llamadas para un valor ejemplo")
    generated_code_py: str = Field(..., description="Implementación en Python")
    execution: list[ExecutionStep] = Field(default_factory=list, max_length=60, description=EXECUTION_DESCRIPTION)


FlowchartSimulationData = Annotated[
    Union[
        SequentialFlowchartSimulation,
        ConditionalFlowchartSimulation,
        LoopFlowchartSimulation,
        CodeDebuggerSimulation,
        TraceTableSimulation,
        RecursiveFlowchartSimulation,
    ],
    Field(discriminator="exercise_type"),
]


class FlowchartAnalysisResult(BaseModel):
    """Contrato final devuelto por el módulo de algoritmos y diagramas de flujo."""
    skill: Literal[SkillId.FLOWCHART] = SkillId.FLOWCHART
    exercise_type: Literal[
        "sequential_flowchart",
        "conditional_flowchart",
        "loop_flowchart",
        "code_debugger",
        "trace_table",
        "recursive_flowchart",
    ] = Field(..., description="Subtipo clasificado de flujo o código")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Certeza de clasificación de 0 a 1")
    question: Optional[str] = Field(
        default=None,
        description="Qué pide el enunciado, en español breve (ej: 'Hallar la aceleración del bloque'). Si no está escrito, infiérelo.",
    )
    detected_elements: list[str] = Field(default_factory=list, description="Bloques y flechas reconocidos")
    bounding_boxes: list[BoundingBox] = Field(default_factory=list, description="Cajas para el token de datos en WebAR")
    explanation: str = Field(..., description="Explicación lógica de la rutina o algoritmo")
    raw_annotations: list[str] = Field(default_factory=list, description="Textos manuscritos de los bloques")
    simulation_data: FlowchartSimulationData = Field(..., description="Topología y código listo para la animación WebAR")

