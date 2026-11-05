"""Tutor Socrático: detección determinística de errores pedagógicos del estudiante.

A diferencia de `validators.py` (que detecta respuestas incoherentes del LLM y fuerza un reintento),
aquí se detectan errores que COMETIÓ EL ESTUDIANTE en su dibujo: un cortocircuito, una rampa con ángulo
negativo, un bucle que nunca termina... Esos casos NO devuelven un error HTTP: se convierten en
retroalimentación pedagógica y en una pregunta socrática que el avatar del tutor muestra sobre la hoja.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Any, Optional

from shared.types import StudentMistake, TutorFeedback


@dataclass
class PedagogicalFinding:
    """Hallazgo determinístico con su guion socrático."""

    code: str
    severity: str
    description: str
    feedback: str
    challenge: str
    hint: Optional[str] = None
    mood: str = "warning"

    @property
    def serious(self) -> bool:
        return self.severity in ("warning", "critical")

    def to_mistake(self) -> StudentMistake:
        return StudentMistake(code=self.code, severity=self.severity, description=self.description)  # type: ignore[arg-type]


def _g(data: Any, name: str, default: Any = None) -> Any:
    if isinstance(data, dict):
        return data.get(name, default)
    return getattr(data, name, default)


def _f(value: Any) -> str:
    """Formato numérico corto."""
    if value is None:
        return "—"
    try:
        v = float(value)
    except (TypeError, ValueError):
        return str(value)
    if abs(v - round(v)) < 1e-9:
        return str(int(round(v)))
    return f"{v:.2f}".rstrip("0").rstrip(".")


def _impossible(what: str, value: Any, unit: str) -> PedagogicalFinding:
    cap = what[0].upper() + what[1:]
    return PedagogicalFinding(
        "impossible_value", "critical", f"{cap} vale {_f(value)} {unit}.",
        f"¡Cuidado! {cap} vale {_f(value)} {unit}: una magnitud así no puede ser cero ni negativa en el mundo real.",
        f"¿Qué significado físico tendría que {what} fuera {_f(value)} {unit}?",
    )


# --------------------------------------------------------------------------------------------- física
def _physics(exercise_type: str, d: Any) -> list[PedagogicalFinding]:
    out: list[PedagogicalFinding] = []
    if exercise_type == "inclined_plane":
        th = _g(d, "angle_degrees")
        mu = _g(d, "friction_coefficient", 0.0) or 0.0
        mu_s = _g(d, "static_friction_coefficient")
        m = _g(d, "mass_kg", 1.0)
        if th is not None and th <= 0:
            out.append(PedagogicalFinding(
                "negative_angle", "critical",
                f"La rampa tiene un ángulo de {_f(th)}°.",
                f"¡Cuidado! Tu rampa tiene un ángulo de {_f(th)}°: con un ángulo nulo o negativo ya no es una pendiente "
                "y el bloque no tiene hacia dónde deslizar.",
                "Si el ángulo se mide desde el suelo horizontal, ¿qué valores puede tomar para que la superficie siga siendo una rampa?",
                "Piensa en el triángulo rectángulo: el ángulo agudo junto al suelo siempre está entre 0° y 90°.",
            ))
        elif th is not None and th >= 90:
            out.append(PedagogicalFinding(
                "negative_angle", "critical",
                f"La rampa tiene {_f(th)}°: ya no es un plano inclinado.",
                f"¡Cuidado! Con {_f(th)}° la superficie es vertical (o se dobla hacia atrás): el bloque caería libremente sin tocarla.",
                "¿Qué le pasa a la fuerza normal cuando la rampa se vuelve vertical?",
                "La normal vale m·g·cos θ.",
            ))
        elif th is not None:
            r = math.radians(th)
            mu_start = mu_s if mu_s is not None else mu
            if mu_start is not None and mu_start >= 0 and mu_start >= math.tan(r) - 1e-9:
                th_min = math.degrees(math.atan(mu_start))
                out.append(PedagogicalFinding(
                    "static_friction", "warning",
                    f"μ = {_f(mu_start)} ≥ tan {_f(th)}° = {_f(math.tan(r))}: el bloque queda en reposo.",
                    "¡Atención! Tu bloque no se mueve porque la fricción estática máxima (μ·m·g·cos θ) supera a la componente "
                    "del peso a lo largo de la rampa (m·g·sen θ).",
                    "¿Qué ángulo mínimo necesitas para que el bloque comience a deslizar?",
                    f"El bloque arranca cuando tan θ supera a μ… prueba con θ un poco mayor que {_f(th_min)}°.",
                    mood="surprised",
                ))
        if _g(d, "friction_arrow_direction") == "down_slope":
            out.append(PedagogicalFinding(
                "inverted_force", "warning",
                "La flecha de fricción apunta rampa abajo, igual que el movimiento.",
                "¡Cuidado! Dibujaste la fricción en el mismo sentido en que baja el bloque: así la fricción lo estaría empujando.",
                "Si la fricción se opone al deslizamiento, ¿hacia dónde debería apuntar su flecha?",
                "La fricción siempre apunta en contra del movimiento (o de la tendencia al movimiento).",
            ))
        if m is not None and m <= 0:
            out.append(_impossible("la masa del bloque", m, "kg"))
        if mu is not None and mu < 0:
            out.append(PedagogicalFinding(
                "impossible_value", "critical", f"Coeficiente de fricción negativo (μ = {_f(mu)}).",
                f"¡Cuidado! Un coeficiente de fricción negativo (μ = {_f(mu)}) significaría que la superficie empuja al bloque en vez de frenarlo.",
                "¿Puede una superficie áspera ayudar al movimiento en lugar de oponerse a él?",
            ))
    elif exercise_type == "simple_pendulum":
        L = _g(d, "length_m")
        th0 = _g(d, "initial_angle_degrees")
        if L is not None and L <= 0:
            out.append(_impossible("la longitud del hilo", L, "m"))
        if th0 is not None and abs(th0) > 90:
            out.append(PedagogicalFinding(
                "negative_angle", "warning", f"Ángulo inicial de {_f(th0)}°: el hilo dejaría de estar tenso.",
                f"¡Ojo! Con {_f(th0)}° la masa empieza por encima del pivote: el hilo se afloja y ya no es un péndulo simple.",
                "¿Qué necesita el hilo para seguir tenso durante toda la oscilación?",
            ))
    elif exercise_type == "projectile_motion":
        v0 = _g(d, "initial_velocity_m_s")
        ang = _g(d, "launch_angle_degrees")
        if v0 is not None and v0 <= 0:
            out.append(_impossible("la rapidez de lanzamiento", v0, "m/s"))
        if ang is not None and (ang < 0 or ang > 90):
            out.append(PedagogicalFinding(
                "negative_angle", "warning", f"Ángulo de lanzamiento de {_f(ang)}°.",
                f"¡Cuidado! Un ángulo de {_f(ang)}° lanza el proyectil {'hacia el suelo' if ang < 0 else 'hacia atrás'}.",
                "¿Entre qué valores debe estar el ángulo para que el proyectil suba y avance hacia adelante?",
                "Con 45° y sin altura inicial se logra el alcance máximo.",
            ))
    elif exercise_type == "mass_spring":
        k = _g(d, "spring_constant_k_n_m")
        m = _g(d, "mass_kg")
        if k is not None and k <= 0:
            out.append(_impossible("la constante del resorte k", k, "N/m"))
        if m is not None and m <= 0:
            out.append(_impossible("la masa", m, "kg"))
    elif exercise_type == "rectilinear_motion":
        t = _g(d, "total_time_s")
        if t is not None and t <= 0:
            out.append(_impossible("el tiempo", t, "s"))
    elif exercise_type == "atwood_machine":
        m1 = _g(d, "mass_1_kg")
        m2 = _g(d, "mass_2_kg")
        for label, val in (("la masa 1", m1), ("la masa 2", m2)):
            if val is not None and val <= 0:
                out.append(_impossible(label, val, "kg"))
        drawn = _g(d, "drawn_acceleration_toward")
        if m1 and m2 and m1 > 0 and m2 > 0 and drawn in ("mass_1", "mass_2") and abs(m1 - m2) > 1e-9:
            heavy = "mass_1" if m1 > m2 else "mass_2"
            if drawn != heavy:
                light = "m1" if drawn == "mass_1" else "m2"
                out.append(PedagogicalFinding(
                    "inverted_force", "warning",
                    f"La flecha de aceleración indica que baja {light}, la masa más liviana.",
                    f"¡Cuidado! Dibujaste la aceleración haciendo bajar a {light}, pero es la masa más liviana "
                    f"({_f(min(m1, m2))} kg frente a {_f(max(m1, m2))} kg).",
                    "Si ambas masas sienten la misma tensión, ¿cuál de las dos tiene más peso tirando hacia abajo?",
                    "Compara m1·g y m2·g: gana el lado con más peso.",
                ))
    return out


# --------------------------------------------------------------------------------------------- circuitos
def _short(V: Any) -> PedagogicalFinding:
    return PedagogicalFinding(
        "short_circuit", "critical",
        "Los bornes (+) y (−) quedan unidos por un camino sin carga.",
        "¡Cuidado! Tu circuito tiene un camino directo entre los bornes (+) y (−) sin carga: es un cortocircuito.",
        "¿Qué ocurriría con la batería si cerramos este circuito?",
        f"Según la ley de Ohm, I = V/R. ¿Qué pasa con I cuando R se acerca a 0 con {_f(V)} V?",
    )


def _circuit(exercise_type: str, d: Any) -> list[PedagogicalFinding]:
    out: list[PedagogicalFinding] = []
    V = _g(d, "voltage_v")
    closed = _g(d, "circuit_closed")
    if V is not None and V <= 0 and exercise_type != "logic_gates":
        out.append(PedagogicalFinding(
            "missing_data", "warning", f"La fuente marca {_f(V)} V.",
            f"¡Ojo! La fuente marca {_f(V)} V: sin diferencia de potencial no hay nada que empuje a los electrones.",
            "¿Qué tiene que aportar la batería para que circule corriente?",
        ))
    if closed is False:
        out.append(PedagogicalFinding(
            "open_circuit", "warning", "La malla está interrumpida: el circuito está abierto.",
            "¡Atención! Tu malla tiene un corte: los electrones no tienen un camino cerrado de vuelta a la batería, así que la corriente es 0 A.",
            "¿Qué necesita un circuito para que la corriente pueda circular de forma continua?",
            "Sigue el cable con el dedo desde (+) hasta (−): ¿llegas sin levantarlo?",
        ))
    if exercise_type == "single_loop":
        R = _g(d, "resistance_ohms")
        r_int = _g(d, "internal_resistance_ohms") or 0
        if R is not None and R <= 0 and closed is not False:
            out.append(_short(V))
        elif R is not None and V and V > 2 and _g(d, "is_diode_led") and closed is not False:
            current = V / max(R + r_int, 1e-6)
            if current > 0.05:
                # Un LED típico aguanta ~20 mA: R mínima ≈ (V − 2 V)/0.02 A
                out.append(PedagogicalFinding(
                    "led_overcurrent", "warning",
                    f"I = {_f(current)} A atraviesa el LED: se quemaría.",
                    f"¡Cuidado! Con solo {_f(R)} Ω pasarían {_f(current)} A por el LED; un LED típico soporta unos 0.02 A.",
                    "¿Qué resistencia mínima necesitas para que la corriente no supere 20 mA?",
                    f"Usa R = (V − 2 V)/0.02 A ≈ {_f((V - 2) / 0.02)} Ω.",
                ))
    elif exercise_type in ("series_resistors", "parallel_resistors"):
        rs = _g(d, "resistors_ohms") or []
        if any(r is not None and r <= 0 for r in rs):
            if exercise_type == "parallel_resistors":
                out.append(PedagogicalFinding(
                    "short_circuit", "critical", "Una rama en paralelo tiene 0 Ω.",
                    "¡Cuidado! Una de tus ramas en paralelo es un cable sin resistencia: toda la corriente se iría por ahí y la fuente quedaría en cortocircuito.",
                    "Si la corriente elige el camino más fácil, ¿cuánta corriente pasaría por las otras ramas?",
                ))
            else:
                out.append(PedagogicalFinding(
                    "impossible_value", "warning", "Una de las resistencias en serie vale 0 Ω o menos.",
                    "¡Ojo! Una resistencia de 0 Ω (o negativa) en serie no existe como componente: es solo un cable.",
                    "¿Cambia la resistencia equivalente si quitas un componente de 0 Ω?",
                ))
    elif exercise_type == "interactive_switch":
        R = _g(d, "load_resistance_ohms")
        if R is not None and R <= 0:
            out.append(_short(V))
    elif exercise_type == "rc_circuit":
        R = _g(d, "resistance_ohms")
        C = _g(d, "capacitance_uf")
        if C is not None and C <= 0:
            out.append(_impossible("la capacitancia", C, "μF"))
        if R is not None and R <= 0:
            out.append(PedagogicalFinding(
                "short_circuit", "warning", "El condensador se conecta sin resistencia (R = 0).",
                "¡Cuidado! Sin resistencia, τ = R·C = 0: el condensador intentaría cargarse instantáneamente con una corriente enorme.",
                "¿Qué papel cumple la resistencia en la velocidad con la que se carga el condensador?",
            ))
    elif exercise_type == "logic_gates":
        bad = [i for i in (_g(d, "inputs") or []) if i not in (0, 1)]
        if bad:
            out.append(PedagogicalFinding(
                "impossible_value", "warning", f"Entradas no binarias: {bad}.",
                f"¡Ojo! Las compuertas digitales solo entienden 0 y 1, pero escribiste {', '.join(str(b) for b in bad)}.",
                "¿Qué representan físicamente el 0 y el 1 en un circuito digital?",
            ))
    return out


# --------------------------------------------------------------------------------------------- algoritmos
def _assigns(label: str, var: str) -> bool:
    """¿La etiqueta del bloque modifica la variable? (i = i + 1, i += 1, i ← i + 1, i++)."""
    if not var:
        return False
    v = re.escape(var.strip())
    assign = rf"(?<![\w]){v}\s*(?:=(?!=)|\+=|-=|\*=|/=|←|<-|\+\+|--)"
    pre = rf"(?:\+\+|--)\s*{v}(?![\w])"
    return bool(re.search(assign, label)) or bool(re.search(pre, label))


def _flowchart(exercise_type: str, d: Any) -> list[PedagogicalFinding]:
    out: list[PedagogicalFinding] = []
    nodes = _g(d, "nodes") or []
    edges = _g(d, "edges") or []
    if not nodes:
        return out
    ids = {_g(n, "id"): n for n in nodes}
    roles = [_g(n, "role") for n in nodes]
    if exercise_type in ("sequential_flowchart", "conditional_flowchart", "loop_flowchart"):
        for role, name, why in (("start", "Inicio", "por dónde empezar"), ("end", "Fin", "cuándo ha terminado")):
            if role not in roles:
                out.append(PedagogicalFinding(
                    "incomplete_flowchart", "warning", f"Al diagrama le falta el bloque de {name}.",
                    f"¡Ojo! Tu diagrama no tiene bloque de {name}: un algoritmo necesita un punto de partida y un punto de llegada claros.",
                    f"¿Cómo sabría la computadora {why}?",
                ))
        for n in nodes:
            if _g(n, "role") == "decision":
                outs = [e for e in edges if _g(e, "from_node_id") == _g(n, "id")]
                if len(outs) < 2:
                    out.append(PedagogicalFinding(
                        "incomplete_flowchart", "warning", f"La decisión '{_g(n, 'label')}' solo tiene una salida.",
                        f"¡Ojo! El rombo '{_g(n, 'label')}' solo tiene una flecha de salida: falta decir qué pasa en el otro caso.",
                        "Si la condición resulta falsa, ¿hacia dónde debería ir el algoritmo?",
                    ))
    if exercise_type == "loop_flowchart":
        var = str(_g(d, "loop_variable") or "").strip()
        decision = next((n for n in nodes if _g(n, "role") == "decision"), None)
        if var and decision is not None:
            dec_id = _g(decision, "id")
            succ: dict[str, list[str]] = {}
            for e in edges:
                succ.setdefault(_g(e, "from_node_id"), []).append(_g(e, "to_node_id"))
            # Cuerpo del bucle: nodos alcanzables desde la decisión por un camino que vuelve a ella
            body: set[str] = set()
            for start in succ.get(dec_id, []):
                stack, seen, returns = [start], set(), False
                while stack:
                    cur = stack.pop()
                    if cur == dec_id:
                        returns = True
                        continue
                    if cur in seen or cur not in ids:
                        continue
                    seen.add(cur)
                    stack.extend(succ.get(cur, []))
                if returns:
                    body |= seen
            if body and not any(_assigns(str(_g(ids[n], "label") or ""), var) for n in body):
                cond = _g(d, "loop_condition") or "la condición"
                out.append(PedagogicalFinding(
                    "infinite_loop", "critical", f"La variable de control '{var}' nunca cambia dentro del bucle.",
                    f"¡Cuidado! Dentro del bucle nunca se modifica '{var}', así que '{cond}' será siempre igual: tu algoritmo se repetiría para siempre.",
                    f"¿Qué instrucción tendrías que agregar dentro del bucle para que '{cond}' algún día sea falsa?",
                    f"Busca dónde debería ir algo como '{var} = {var} + 1'.",
                ))
    return out


# --------------------------------------------------------------------------------------------- matemáticas
def _num(s: str) -> Optional[float]:
    m = re.search(r"-?\d+(?:[.,]\d+)?", s.replace("−", "-").replace("–", "-"))
    return float(m.group(0).replace(",", ".")) if m else None


def _math(exercise_type: str, d: Any) -> list[PedagogicalFinding]:
    out: list[PedagogicalFinding] = []
    if exercise_type == "equation_solver":
        delta = _g(d, "discriminant_delta")
        student = [str(s) for s in (_g(d, "student_solution") or [])]
        sol = [str(s) for s in (_g(d, "solution_set") or [])]
        if _g(d, "equation_type") == "quadratic" and delta is not None and delta < 0:
            if any(_num(s) is not None for s in student):
                out.append(PedagogicalFinding(
                    "no_real_roots", "warning", f"Δ = {_f(delta)} < 0, pero en la hoja aparece una solución real.",
                    f"¡Cuidado! El discriminante vale Δ = {_f(delta)}, que es negativo, y aun así escribiste {', '.join(student)}.",
                    "¿Qué le pasa a la raíz cuadrada de un número negativo dentro de los números reales?",
                    "Reemplaza tu valor en la ecuación original: ¿da 0?",
                ))
            else:
                out.append(PedagogicalFinding(
                    "no_real_roots", "info", f"Δ = {_f(delta)} < 0: no hay raíces reales.",
                    f"¡Interesante! Δ = {_f(delta)} es negativo: la parábola nunca toca el eje X.",
                    "Si la gráfica no corta el eje X, ¿dónde están sus soluciones?",
                    mood="surprised",
                ))
        elif student and sol:
            sv = sorted(v for v in (_num(s) for s in student) if v is not None)
            rv = sorted(v for v in (_num(s) for s in sol) if v is not None)
            if sv and rv and (len(sv) != len(rv) or any(abs(a - b) > 1e-6 for a, b in zip(sv, rv))):
                out.append(PedagogicalFinding(
                    "wrong_answer", "warning",
                    f"La respuesta escrita ({', '.join(student)}) no coincide con C.S. = {{{', '.join(sol)}}}.",
                    f"¡Casi! Escribiste {', '.join(student)}, pero al resolver la ecuación se obtiene otra cosa.",
                    "Si reemplazas tu respuesta en la ecuación original, ¿se cumple la igualdad?",
                ))
    elif exercise_type == "geometric_angles":
        known = _g(d, "known_angles_deg") or {}
        vals = [float(v) for v in known.values() if isinstance(v, (int, float))]
        if _g(d, "problem_type") in ("triangle_cevian", "triangle_congruence") and len(vals) >= 2 and sum(vals) >= 180:
            out.append(PedagogicalFinding(
                "impossible_triangle", "critical", f"Los ángulos conocidos ya suman {_f(sum(vals))}°.",
                f"¡Cuidado! Los ángulos que escribiste ya suman {_f(sum(vals))}°, y en un triángulo los tres ángulos internos suman exactamente 180°.",
                "Si dos ángulos ya ocupan 180° o más, ¿cuánto espacio le queda al tercero?",
            ))
        solved = _g(d, "solved_value_deg")
        student = _g(d, "student_answer_deg")
        if student is not None and solved is not None and abs(student - solved) > 0.5 and not out:
            out.append(PedagogicalFinding(
                "wrong_answer", "warning", f"Escribiste {_f(student)}°, pero la incógnita vale {_f(solved)}°.",
                f"¡Casi! Escribiste {_f(student)}° para la incógnita, pero la relación geométrica da otro valor.",
                "¿Qué propiedad relaciona los ángulos que ya conoces con la incógnita?",
            ))
    elif exercise_type == "geometry_3d":
        for name, label in (("radius_units", "el radio"), ("height_units", "la altura"), ("edge_units", "la arista")):
            v = _g(d, name)
            if v is not None and v <= 0:
                out.append(_impossible(label, v, "u"))
    return out


_DETECTORS = {"physics": _physics, "circuit": _circuit, "flowchart": _flowchart, "math_geo": _math}


def detect_student_mistakes(skill_id: str, exercise_type: str, data: Any) -> list[PedagogicalFinding]:
    """Detecta errores del estudiante a partir de los datos extraídos (sin llamar al LLM)."""
    detector = _DETECTORS.get(skill_id)
    if detector is None:
        return []
    try:
        return detector(exercise_type, data)
    except Exception:  # el tutor nunca debe romper el análisis
        return []


def serious_findings(skill_id: str, exercise_type: str, data: Any) -> list[PedagogicalFinding]:
    return [f for f in detect_student_mistakes(skill_id, exercise_type, data) if f.serious]


# --------------------------------------------------------------------------------------------- respaldo
_DEFAULT_TUTOR = {
    "physics": (
        "¡Buen dibujo! Ya puedes ver cómo las fuerzas deciden el movimiento.",
        "Si duplicaras la masa, ¿qué magnitudes de la simulación cambiarían y cuáles no?",
        "Galileo notó que el período de un péndulo casi no depende de su amplitud observando una lámpara en la catedral de Pisa.",
    ),
    "circuit": (
        "¡Circuito bien cerrado! La corriente recorre la malla y se reparte según la ley de Ohm.",
        "Si duplicaras el voltaje de la fuente, ¿qué pasaría con la corriente y con la potencia?",
        "Los electrones avanzan por un cable a fracciones de milímetro por segundo, pero la señal eléctrica viaja casi a la velocidad de la luz.",
    ),
    "flowchart": (
        "¡Algoritmo bien estructurado! Sigue el token paso a paso para ver cómo cambian las variables.",
        "¿Qué cambiaría en la salida si modificas el valor de entrada?",
        "El primer 'bug' documentado fue una polilla real atrapada en un relé del computador Harvard Mark II en 1947.",
    ),
    "math_geo": (
        "¡Bien planteado! Mira cómo cada paso se apoya en una propiedad que ya conoces.",
        "¿Podrías comprobar tu resultado por otro camino distinto?",
        "La palabra 'álgebra' viene del árabe al-ŷabr, del libro de al-Juarismi del siglo IX.",
    ),
}


def enrich_tutor(skill_id: str, exercise_type: str, data: Any, tutor: Optional[TutorFeedback]) -> TutorFeedback:
    """Fusiona la voz del LLM con los hallazgos determinísticos y garantiza que el tutor nunca quede vacío."""
    tutor = tutor.model_copy(deep=True) if tutor is not None else TutorFeedback()
    findings = detect_student_mistakes(skill_id, exercise_type, data)

    known = {m.code for m in tutor.mistakes}
    for f in findings:
        if f.code not in known:
            tutor.mistakes.append(f.to_mistake())
            known.add(f.code)

    serious = sorted((f for f in findings if f.serious), key=lambda f: 0 if f.severity == "critical" else 1)
    if serious:
        main = serious[0]
        llm_saw_it = tutor.has_error and tutor.error_type == main.code and tutor.pedagogical_feedback.strip()
        tutor.has_error = True
        if not llm_saw_it:
            # El guion determinístico usa los números exactos: tiene prioridad sobre el texto del LLM
            tutor.error_type = main.code
            tutor.pedagogical_feedback = main.feedback
            tutor.socratic_challenge = main.challenge
            tutor.hint = main.hint or tutor.hint
        tutor.mood = main.mood  # type: ignore[assignment]
    elif findings and not tutor.has_error:
        info = findings[0]
        tutor.pedagogical_feedback = tutor.pedagogical_feedback.strip() or info.feedback
        tutor.socratic_challenge = tutor.socratic_challenge.strip() or info.challenge
        tutor.hint = tutor.hint or info.hint
        if tutor.mood == "happy":
            tutor.mood = info.mood  # type: ignore[assignment]

    if tutor.has_error and not tutor.error_type and tutor.mistakes:
        tutor.error_type = tutor.mistakes[0].code
    if tutor.has_error and tutor.mood in ("happy", "celebrating"):
        tutor.mood = "warning"

    fallback = _DEFAULT_TUTOR.get(skill_id, _DEFAULT_TUTOR["physics"])
    if not tutor.pedagogical_feedback.strip():
        tutor.pedagogical_feedback = fallback[0]
    if not tutor.socratic_challenge.strip():
        tutor.socratic_challenge = fallback[1]
    if not (tutor.fun_fact or "").strip():
        tutor.fun_fact = fallback[2]
    return tutor
