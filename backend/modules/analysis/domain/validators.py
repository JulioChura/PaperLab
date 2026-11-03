"""Validadores determinísticos para asegurar la consistencia física y matemática."""

from typing import Any, List


def validate_physics_data(exercise_type: str, data: Any) -> list[str]:
    """Comprueba restricciones físicas inviolables."""
    violations: list[str] = []
    
    if exercise_type == "inclined_plane":
        angle = getattr(data, "angle_degrees", None)
        if angle is not None and not (0.0 < angle < 90.0):
            violations.append(f"El ángulo del plano inclinado debe estar entre 0° y 90° (detectado: {angle}°).")
        mu = getattr(data, "friction_coefficient", None)
        if mu is not None and mu < 0.0:
            violations.append(f"El coeficiente de fricción no puede ser negativo (detectado: {mu}).")
        mass = getattr(data, "mass_kg", None)
        if mass is not None and mass <= 0.0:
            violations.append("La masa del bloque debe ser estrictamente positiva.")

    elif exercise_type == "simple_pendulum":
        length = getattr(data, "length_m", None)
        if length is not None and length <= 0.0:
            violations.append(f"La longitud de la cuerda del péndulo debe ser > 0 (detectado: {length} m).")
        theta0 = getattr(data, "initial_angle_degrees", None)
        if theta0 is not None and abs(theta0) > 90.0:
            violations.append(f"El ángulo inicial del péndulo excede los límites físicos razonables ({theta0}°).")

    elif exercise_type == "projectile_motion":
        v0 = getattr(data, "initial_velocity_m_s", None)
        if v0 is not None and v0 <= 0.0:
            violations.append(f"La velocidad de disparo inicial debe ser positiva (detectado: {v0} m/s).")
        angle = getattr(data, "launch_angle_degrees", None)
        if angle is not None and not (0.0 <= angle <= 90.0):
            violations.append(f"El ángulo de elevación de tiro debe estar entre 0° y 90° (detectado: {angle}°).")

    elif exercise_type == "mass_spring":
        k = getattr(data, "spring_constant_k_n_m", None)
        if k is not None and k <= 0.0:
            violations.append(f"La constante elástica del resorte k debe ser > 0 (detectado: {k} N/m).")
        m = getattr(data, "mass_kg", None)
        if m is not None and m <= 0.0:
            violations.append("La masa oscilante debe ser > 0.")

    elif exercise_type == "atwood_machine":
        m1 = getattr(data, "mass_1_kg", None)
        m2 = getattr(data, "mass_2_kg", None)
        if m1 is not None and m1 <= 0.0:
            violations.append("La masa 1 de la máquina de Atwood debe ser positiva.")
        if m2 is not None and m2 <= 0.0:
            violations.append("La masa 2 de la máquina de Atwood debe ser positiva.")

    return violations


def validate_circuit_data(exercise_type: str, data: Any) -> list[str]:
    """Comprueba restricciones de leyes de Ohm y Kirchhoff."""
    violations: list[str] = []

    if exercise_type in ("single_loop", "series_resistors", "parallel_resistors"):
        v = getattr(data, "voltage_v", None)
        if v is not None and v <= 0.0:
            violations.append(f"El voltaje de la fuente debe ser positivo (detectado: {v} V).")
        
        resistors = getattr(data, "resistors_ohms", None)
        if resistors:
            for i, r in enumerate(resistors):
                if r <= 0.0:
                    violations.append(f"El resistor #{i+1} debe tener resistencia mayor a 0 Ω (detectado: {r} Ω).")

    elif exercise_type == "rc_circuit":
        c = getattr(data, "capacitance_uf", None)
        if c is not None and c <= 0.0:
            violations.append(f"La capacitancia del condensador debe ser > 0 μF (detectado: {c} μF).")
        r = getattr(data, "resistance_ohms", None)
        if r is not None and r <= 0.0:
            violations.append(f"La resistencia en circuito RC debe ser > 0 Ω (detectado: {r} Ω).")

    elif exercise_type == "logic_gates":
        inputs = getattr(data, "inputs", None)
        if inputs:
            for inp in inputs:
                if inp not in (0, 1):
                    violations.append(f"Las entradas a compuertas lógicas deben ser 0 o 1 (detectado: {inp}).")

    return violations


def validate_flowchart_data(exercise_type: str, data: Any) -> list[str]:
    """Comprueba la coherencia topológica de diagramas y trazas."""
    violations: list[str] = []
    nodes = getattr(data, "nodes", None)
    if nodes is not None and len(nodes) == 0:
        violations.append("El diagrama de flujo debe contener al menos un nodo procesable.")
    return violations


def validate_math_geo_data(exercise_type: str, data: Any) -> list[str]:
    """Comprueba restricciones geométricas y trigonométricas."""
    violations: list[str] = []

    if exercise_type == "geometry_3d":
        radius = getattr(data, "radius_units", None)
        if radius is not None and radius <= 0.0:
            violations.append("El radio del sólido geométrico debe ser > 0.")
        height = getattr(data, "height_units", None)
        if height is not None and height <= 0.0:
            violations.append("La altura del sólido tridimensional debe ser > 0.")

    elif exercise_type == "geometric_angles":
        solved = getattr(data, "solved_value_deg", None)
        if solved is not None and not (0.0 <= solved <= 360.0):
            violations.append(f"El ángulo resuelto debe estar en el intervalo [0°, 360°] (detectado: {solved}°).")

    return violations
