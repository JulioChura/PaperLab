"""Validadores determinísticos de COHERENCIA de la respuesta del LLM.

Detectan respuestas mal formadas (listas desalineadas, flechas hacia nodos inexistentes, números no finitos...)
y provocan un reintento con feedback correctivo. Los errores que comete el ESTUDIANTE en su dibujo
(cortocircuito, ángulo negativo, bucle infinito...) NO se tratan aquí: los convierte en retroalimentación
el Tutor Socrático (`pedagogy.py`).
"""

import math
from typing import Any


def _non_finite(data: Any) -> list[str]:
    """Campos numéricos con NaN o infinito."""
    bad: list[str] = []
    fields = data.model_dump() if hasattr(data, "model_dump") else (vars(data) if hasattr(data, "__dict__") else {})
    for name, value in fields.items():
        if isinstance(value, float) and not math.isfinite(value):
            bad.append(f"El campo '{name}' no es un número finito ({value}).")
    return bad


def validate_physics_data(exercise_type: str, data: Any) -> list[str]:
    violations = _non_finite(data)
    if exercise_type == "rectilinear_motion":
        motion = getattr(data, "motion_type", None)
        a = getattr(data, "acceleration_m_s2", 0.0) or 0.0
        if motion == "MRU" and abs(a) > 1e-9:
            violations.append(f"Se clasificó como MRU pero la aceleración es {a} m/s² (debería ser MRUV o a = 0).")
    return violations


def validate_circuit_data(exercise_type: str, data: Any) -> list[str]:
    violations = _non_finite(data)
    resistors = getattr(data, "resistors_ohms", None) or []
    if exercise_type == "series_resistors":
        drops = getattr(data, "voltage_drops_v", None) or []
        if drops and len(drops) != len(resistors):
            violations.append(
                f"Hay {len(resistors)} resistencias en serie pero {len(drops)} caídas de tensión: deben coincidir."
            )
    elif exercise_type == "parallel_resistors":
        branches = getattr(data, "branch_currents_a", None) or []
        if branches and len(branches) != len(resistors):
            violations.append(
                f"Hay {len(resistors)} ramas en paralelo pero {len(branches)} corrientes de rama: deben coincidir."
            )
    elif exercise_type == "logic_gates":
        network = getattr(data, "network", None) or []
        names = set(getattr(data, "input_names", None) or [])
        ids: set[str] = set()
        for gate in network:
            for src in gate.inputs:
                if src not in names and src not in ids:
                    violations.append(
                        f"La compuerta '{gate.id}' usa la entrada '{src}', que no es una entrada externa ni una compuerta anterior."
                    )
            ids.add(gate.id)
    return violations


def validate_flowchart_data(exercise_type: str, data: Any) -> list[str]:
    violations: list[str] = []
    nodes = getattr(data, "nodes", None)
    if exercise_type == "code_debugger" and not (getattr(data, "steps", None) or getattr(data, "execution", None)):
        violations.append("El depurador necesita la traza de ejecución (`execution`) con al menos un paso.")
    if nodes is not None and len(nodes) == 0:
        violations.append("El diagrama de flujo debe contener al menos un nodo procesable.")
    if nodes:
        ids = {n.id for n in nodes}
        for edge in getattr(data, "edges", None) or []:
            for end in (edge.from_node_id, edge.to_node_id):
                if end not in ids:
                    violations.append(f"La flecha {edge.from_node_id} → {edge.to_node_id} apunta a un nodo inexistente ('{end}').")
    return violations


def validate_math_geo_data(exercise_type: str, data: Any) -> list[str]:
    violations = _non_finite(data)
    if exercise_type == "geometric_angles":
        for label, value in (getattr(data, "known_angles_deg", None) or {}).items():
            if not math.isfinite(value):
                violations.append(f"El ángulo conocido '{label}' no es un número finito.")
    return violations
