# Fotos de prueba (23 tipos de ejercicio × 2 niveles + errores + misiones)

Hay cuatro baterías de ejemplos:

- **Nivel 1:** las carpetas `1_fisica/`, `2_circuitos/`, `3_algoritmos/` y `4_matematicas/` de esta misma carpeta.
- **Nivel 2:** `nivel_2/`, con la misma estructura. Son versiones más exigentes: decisiones anidadas, bucles largos, arreglos con dos punteros, recursión con ramificación, 3–4 resistencias, descarga RC, compuerta XOR, péndulo de gran amplitud, tiro desde una altura, oscilador amortiguado, frenado, pirámide y ángulos entre paralelas.
- **Errores:** `errores/`. Dibujos con un error típico del alumno para probar el **Tutor Socrático**: el bloque que no desliza (μ ≥ tan θ), rampa con ángulo negativo, Atwood con la flecha al revés, cortocircuito, malla abierta, LED sin resistencia, bucle infinito, triángulo imposible y una raíz real con Δ < 0. En vez de fallar, la app muestra un holograma de advertencia y Lumi hace una pregunta socrática.
- **Misiones:** `misiones/`. Propuestas para cada reto del **Modo Misiones** (una de ellas, `mission_flag_12m_miss`, se queda corta a propósito).

Cada JSON incluye el campo `tutor` (retroalimentación, pregunta socrática, pista y dato curioso), igual que la respuesta del backend.

Cada carpeta tiene, por tipo de ejercicio:

- `<tipo>.jpg`: foto de una hoja con el ejercicio dibujado a lápiz.
- `<tipo>.json`: la respuesta del analizador para esa foto, con la misma forma que devuelve el backend.

## Cómo probar

- **Sin gastar el analizador de IA:** en la vista de cámara de cada módulo pulsa **Ejemplos**, elige la pestaña **Nivel 1**, **Nivel 2**, **Errores** o **Misiones** y luego el ejercicio. Se usan esta foto y este JSON. En el panel 🎯 **Misiones**, «Probar con ejemplo» acepta la misión y carga su foto.
- **Con el analizador real (Gemini):** pulsa el botón de subir foto, elige uno de estos `.jpg` y luego **Escanear y resolver**.

| Carpeta | Tipos |
|---|---|
| `1_fisica` | inclined_plane, simple_pendulum, projectile_motion, mass_spring, rectilinear_motion, atwood_machine |
| `2_circuitos` | single_loop, series_resistors, parallel_resistors, interactive_switch, rc_circuit, logic_gates |
| `3_algoritmos` | sequential_flowchart, conditional_flowchart, loop_flowchart, code_debugger, trace_table, recursive_flowchart |
| `4_matematicas` | equation_solver, function_graph, geometry_3d, analytic_geometry, geometric_angles |

Las fotos se generan con `frontend/src/demo/examples.ts` (los textos del tutor de nivel 1 y 2 están en `frontend/src/demo/tutorScripts.ts`). Si cambias un ejemplo, vuelve a exportarlos con `cd frontend && npm run export:examples` (añade `-- --photos` para redibujar también las fotos existentes). El test `backend/tests/test_examples_contract.py` comprueba que todos los JSON cumplan el contrato del backend.
