# Fotos de prueba (23 tipos de ejercicio)

Cada carpeta tiene, por tipo de ejercicio:

- `<tipo>.jpg`: foto de una hoja con el ejercicio dibujado a lápiz.
- `<tipo>.json`: la respuesta del analizador para esa foto, con la misma forma que devuelve el backend.

## Cómo probar

- **Sin gastar el analizador de IA:** en la vista de cámara de cada módulo pulsa **Ejemplos** y elige el ejercicio. Se usan esta foto y este JSON.
- **Con el analizador real (Gemini):** pulsa el botón de subir foto, elige uno de estos `.jpg` y luego **Escanear y resolver**.

| Carpeta | Tipos |
|---|---|
| `1_fisica` | inclined_plane, simple_pendulum, projectile_motion, mass_spring, rectilinear_motion, atwood_machine |
| `2_circuitos` | single_loop, series_resistors, parallel_resistors, interactive_switch, rc_circuit, logic_gates |
| `3_algoritmos` | sequential_flowchart, conditional_flowchart, loop_flowchart, code_debugger, trace_table, recursive_flowchart |
| `4_matematicas` | equation_solver, function_graph, geometry_3d, analytic_geometry, geometric_angles |

Las fotos se generan con `frontend/src/demo/examples.ts`. Si cambias un ejemplo allí, vuelve a exportarlas.
