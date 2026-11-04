---
name: paperlab-vision-classifier
description: Clasificador de visión multimodal de PaperLab para cuadernos físicos. Identifica exactamente uno de los 19 ejercicios canónicos a partir de trazos a lápiz o fotos de libretas escolares/universitarias y extrae los parámetros de simulación WebAR.
---

# PaperLab Vision & Exercise Classifier Skill

Este skill define la especificación canónica, taxonomía visual y prompt de clasificación multimodal utilizado por el motor de visión y Gemini API en **PaperLab**.

## Taxonomía de los 19 Ejercicios por Módulo

### Módulo: Física (`physics`)
1. `physics_inclined_plane` — **Plano Inclinado con Fricción**: Triángulo rectángulo con pendiente $\theta$, bloque cuadrado en la rampa, cotas de $\mu$ o $m$.
2. `physics_pendulum` — **Péndulo Simple**: Techo sombreado, cuerda tensada de longitud $L$, masa esférica oscilante con ángulo inicial $\theta_0$.
3. `physics_projectile` — **Tiro Parabólico**: Suelo horizontal, vector flecha con velocidad $v_0$ y ángulo $\theta$, trayectoria en arco parabólico.
4. `physics_spring_hooke` — **Sistema Masa-Resorte (Ley de Hooke)**: Pared vertical rígida, resorte en zigzag $k$, bloque de masa $m$.
5. `physics_mru_mruv` — **Cinemática Rectilínea (MRU y MRUV)**: Línea recta horizontal, esferas o móviles con flechas de velocidad constante ($v$) o aceleración ($a$).
6. `physics_atwood_pulley` — **Máquina de Atwood**: Polea circular fija en el techo, cuerda invertida en U, dos bloques de masa $m_1$ y $m_2$ suspendidos.

### Módulo: Circuitos (`circuits`)
7. `circuits_simple_loop` — **Circuito Simple de Malla Única**: Batería DC ($+ / -$), resistor en zigzag $R$, bombilla/LED circular con cruz.
8. `circuits_series` — **Resistencias en Serie**: Batería y 2 o 3 resistores en la misma rama continua sin bifurcaciones ($R_1, R_2, R_3$).
9. `circuits_parallel` — **Resistencias en Paralelo**: Nodos de unión explícitos donde se bifurcan 2 o más ramas independientes con resistores.
10. `circuits_switch` — **Circuito con Interruptor Interactivo (Switch)**: Borne de corte con palanca inclinada (abierto) o en contacto (cerrado).
11. `circuits_rc` — **Circuito RC (Carga/Descarga)**: Batería, resistencia en serie y placas paralelas de capacitor ($C$ en $\mu\text{F}$).
12. `circuits_logic_gates` — **Puertas Lógicas Básicas**: Símbolos esquemáticos digitales AND (forma D), OR (curva puntiaguda), NOT (triángulo con burbuja).

### Módulo: Algoritmos / Flowcharts (`flowcharts` o `algorithms`)
13. `flowchart_logic_blocks` — **Diagramas de Flujo**: Óvalos [Inicio/Fin], paralelogramos [Lectura/Salida], rectángulos [Proceso], rombos [Decisión] conectados por flechas.
14. `code_step_debugger` — **Análisis de Código / Debugger**: Pseudocódigo manuscrito por líneas tabuladas (bucles `para/mientras`, condicionales `si/entonces`, variables).

### Módulo: Matemáticas Pre-U (`math`)
15. `math_solid_geometry_3d` — **Geometría del Espacio**: Proyecciones en perspectiva de sólidos (cilindro, cono, prisma, esfera) con aristas punteadas y cotas de radio/altura.
16. `math_analytic_geometry` — **Geometría Analítica**: Ejes coordenados $XY$, pares ordenados $A(x_1, y_1)$ y $B(x_2, y_2)$, cálculo de distancia, punto medio o pendiente.
17. `math_function_graph` — **Gráfica de Funciones**: Plano cartesiano con función matemática manuscrita al lado (ej: $f(x) = x^2 - 4x + 3$).
18. `math_equation_solver` — **Solver de Ecuaciones**: Ecuación manuscrita (cuadrática, sistema lineal) lista para deducción por aspa simple o fórmula de Carnot.
19. `math_geometric_angles` — **Cálculo de Ángulos**: Geometría plana con rectas paralelas cortadas por secante, triángulos o polígonos con incógnita $x$ y ángulos $\alpha, \beta$.

---

## Formato JSON Estricto de Salida

Al clasificar una imagen manuscrita, el modelo debe retornar **exclusivamente un bloque JSON** con esta estructura:

```json
{
  "exercise_id": "physics_inclined_plane",
  "exercise_name": "Plano Inclinado con Fricción",
  "topic_id": "physics",
  "confidence": 0.98,
  "detected_elements": ["triangulo_rampa", "bloque_cuadrado", "angulo_30_grados"],
  "simulation_ready": true,
  "parameters": {
    "theta_deg": 30.0,
    "mass_kg": 2.0,
    "mu_k": 0.15,
    "initial_velocity": 0.0,
    "gravity": 9.81
  },
  "explanation": "Se detectó un plano inclinado con pendiente estimada de 30° y bloque en la rampa."
}
```

