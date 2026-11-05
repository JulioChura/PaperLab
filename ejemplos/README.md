# Fotos de prueba (23 tipos de ejercicio × 2 niveles)

Hay dos baterías de ejemplos:

- **Nivel 1:** las carpetas `1_fisica/`, `2_circuitos/`, `3_algoritmos/` y `4_matematicas/` de esta misma carpeta.
- **Nivel 2:** `nivel_2/`, con la misma estructura. Son versiones más exigentes: decisiones anidadas, bucles largos, arreglos con dos punteros, recursión con ramificación, 3–4 resistencias, descarga RC, compuerta XOR, péndulo de gran amplitud, tiro desde una altura, oscilador amortiguado, frenado, pirámide y ángulos entre paralelas.

Cada carpeta tiene, por tipo de ejercicio:

- `<tipo>.jpg`: foto de una hoja con el ejercicio dibujado a lápiz.
- `<tipo>.json`: la respuesta del analizador para esa foto, con la misma forma que devuelve el backend.

## Cómo probar

- **Sin gastar el analizador de IA:** en la vista de cámara de cada módulo pulsa **Ejemplos**, elige la pestaña **Nivel 1** o **Nivel 2** y luego el ejercicio. Se usan esta foto y este JSON.
- **Con el analizador real (Gemini):** pulsa el botón de subir foto, elige uno de estos `.jpg` y luego **Escanear y resolver**.

| Carpeta | Tipos |
|---|---|
| `1_fisica` | inclined_plane, simple_pendulum, projectile_motion, mass_spring, rectilinear_motion, atwood_machine |
| `2_circuitos` | single_loop, series_resistors, parallel_resistors, interactive_switch, rc_circuit, logic_gates |
| `3_algoritmos` | sequential_flowchart, conditional_flowchart, loop_flowchart, code_debugger, trace_table, recursive_flowchart |
| `4_matematicas` | equation_solver, function_graph, geometry_3d, analytic_geometry, geometric_angles |

Las fotos se generan con `frontend/src/demo/examples.ts`. Si cambias un ejemplo allí, vuelve a exportarlas.
