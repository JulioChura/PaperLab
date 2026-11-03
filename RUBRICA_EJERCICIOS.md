# Rúbrica Oficial de Ejercicios y Simulaciones — PaperLab WebAR

Este documento define la taxonomía y el catálogo canónico de ejercicios que el motor de visión por computadora e IA de **PaperLab** clasificará a partir de los trazos a mano en cuadernos escolares y universitarios.

---

## ⚛️ Módulo 1: Simulaciones de Física

### 1.1. Plano Inclinado con Fricción
*   **Sintaxis gráfica en papel:** Triángulo rectángulo con pendiente $\theta$, línea de apoyo horizontal y un bloque cuadrado apoyado en la rampa. Anotación opcional de masa $m$ o coeficiente $\mu$.
*   **Superposición WebAR:** Deslizamiento dinámico del bloque con aceleración calculada; flechas vectoriales de Peso ($\vec{P} = m\vec{g}$), Normal ($\vec{N}$), Fricción ($\vec{f}_r$) y aceleración resultante ($\vec{a}$).
*   **Modelo Físico:** $a = g(\sin\theta - \mu\cos\theta)$

### 1.2. Péndulo Simple
*   **Sintaxis gráfica en papel:** Techo horizontal con sombreado de anclaje, punto de pivote, línea de cuerda de longitud $L$ y esfera suspendida con ángulo inicial $\theta_0$.
*   **Superposición WebAR:** Oscilación armónica respetando la longitud real dibujada a escala de la cuadrícula (5 mm), telemetría de período $T$, tensión de cuerda y velocidad máxima en el punto más bajo.
*   **Modelo Físico:** $T = 2\pi\sqrt{\frac{L}{g}}$

### 1.3. Tiro Parabólico (Lanzamiento de Proyectiles)
*   **Sintaxis gráfica en papel:** Línea de suelo, punto de disparo y vector flecha con rotulación de ángulo $\theta$ y velocidad inicial $v_0$ (ej: $v_0 = 20\text{ m/s}$, $\theta = 45^\circ$).
*   **Superposición WebAR:** Trazo parabólico iluminado en el aire, proyectil en vuelo continuo, marcas de Altura Máxima ($H_{\max}$), Tiempo de Vuelo ($t_v$) y Alcance Horizontal ($X_{\max}$).
*   **Modelo Físico:** $X_{\max} = \frac{v_0^2 \sin(2\theta)}{g} \quad|\quad H_{\max} = \frac{v_0^2 \sin^2\theta}{2g}$

### 1.4. Sistema Masa-Resorte (Ley de Hooke)
*   **Sintaxis gráfica en papel:** Pared vertical rígida, trazo helicoidal en zigzag (resorte) y bloque de masa $m$ apoyado en el plano.
*   **Superposición WebAR:** Compresión y elongación elástica oscilatoria (MAS) con gráfico en tiempo real de intercambio entre Energía Cinética y Energía Potencial Elástica.
*   **Modelo Físico:** $F = -k \cdot \Delta x \quad|\quad \omega = \sqrt{\frac{k}{m}}$

### 1.5. Cinemática Rectilínea (MRU y MRUV)
*   **Sintaxis gráfica en papel:** Línea recta de pista/suelo horizontal con una o dos esferas/móviles. Una flecha sobre el cuerpo rotulada con velocidad constante (ej: $v = 4\text{ m/s}$) o aceleración (ej: $a = 2\text{ m/s}^2$). Puntos de partida $x_0$ y llegada $x_f$.
*   **Superposición WebAR:** La esfera se desplaza por el trazo de lápiz con velocidad uniforme (MRU) o aumentando su velocidad proporcionalmente (MRUV); marcas de regla milimétrica holográfica indicando posición en cada segundo $t = 1\text{s}, 2\text{s}, 3\text{s}$.
*   **Modelo Físico:**
    *   **MRU:** $d = v \cdot t$
    *   **MRUV:** $d = v_0 t + \frac{1}{2}a t^2 \quad|\quad v_f^2 = v_0^2 + 2ad$

### 1.6. Máquina de Atwood (Poleas y Cuerdas)
*   **Sintaxis gráfica en papel:** Círculo suspendido (polea fija), cuerda en U invertida y dos masas colgantes ($m_1, m_2$).
*   **Superposición WebAR:** Rotación de polea y movimiento vertical de ambas masas según la masa neta dominante; vectores de Tensión ($T$) y Peso.
*   **Modelo Físico:** $a = g \cdot \frac{|m_1 - m_2|}{m_1 + m_2}$

---

## ⚡ Módulo 2: Circuitos Eléctricos

### 2.1. Circuito Simple de Malla Única
*   **Sintaxis gráfica en papel:** Rectángulo cerrado con batería ($+/-$), zigzag de resistor ($R$) y círculo con cruz o triángulo para bombilla/LED.
*   **Superposición WebAR:** Flujo animado de electrones luminosos; el LED se ilumina sobre el papel y un amperímetro digital muestra la corriente calculada.
*   **Modelo Físico:** $I = \frac{V}{R} \quad|\quad P = V \cdot I$

### 2.2. Resistencias en Serie
*   **Sintaxis gráfica en papel:** Fuente de voltaje con dos o tres resistores en la misma rama continua ($R_1, R_2, R_3$).
*   **Superposición WebAR:** Proyección de voltímetros holográficos sobre cada resistor mostrando caídas de potencial parciales ($V_1, V_2, V_3$) y resistencia equivalente total.
*   **Modelo Físico:** $R_{\text{eq}} = \sum R_i \quad|\quad V_{\text{total}} = \sum V_i$

### 2.3. Resistencias en Paralelo
*   **Sintaxis gráfica en papel:** Nodos de bifurcación donde la pista de grafito se divide en dos o más ramas paralelas independientes con sus resistores.
*   **Superposición WebAR:** División visual del caudal de electrones por cada rama (mayor intensidad por la rama de menor resistencia) y cálculo de corriente de rama.
*   **Modelo Físico:** $\frac{1}{R_{\text{eq}}} = \sum \frac{1}{R_i} \quad|\quad I_{\text{total}} = \sum I_i$

### 2.4. Circuito con Interruptor Interactivo (Switch)
*   **Sintaxis gráfica en papel:** Pista con dos terminales circulares y una palanca levantada (abierta) o tocando el borne (cerrada).
*   **Superposición WebAR:** Control táctil en pantalla: tocar el interruptor dibujado en la libreta abre o cierra el circuito con chispas de contacto, interrumpiendo o reanudando el paso de corriente.
*   **Modelo Físico:** Estado de conducción ($R \approx 0$) vs. corte ($R \to \infty$).

### 2.5. Circuito RC (Carga y Descarga de Condensador)
*   **Sintaxis gráfica en papel:** Batería, interruptor, resistencia y dos placas paralelas de condensador con valor en $\mu\text{F}$.
*   **Superposición WebAR:** Animación de acumulación de cargas electrostáticas en las placas y gráfica flotante de la curva exponencial de tensión $V_c(t)$.
*   **Modelo Físico:** $\tau = R \cdot C \quad|\quad V_c(t) = V_0(1 - e^{-t/\tau})$

### 2.6. Puertas Lógicas Básicas (AND, OR, NOT)
*   **Sintaxis gráfica en papel:** Símbolos esquemáticos de compuertas lógicas digitales con dos entradas rotuladas (`0` o `1`) y una salida.
*   **Superposición WebAR:** Evaluación de la tabla de verdad en tiempo real; pulso verde (1) o rojo (0) en la salida con su ecuación booleana.
*   **Modelo Físico:** Álgebra de Boole ($A \cdot B$, $A + B$, $\overline{A}$).

---

## 🔀 Módulo 3: Diagramas de Flujo & Análisis de Código

### 3.1. Diagrama de Flujo: Algoritmo Secuencial
*   **Sintaxis gráfica en papel:** Bloques estándar unidos por flechas: Óvalo `[Inicio]`, Paralelogramo `[Entrada de datos]`, Rectángulo `[Operación/Cálculo]`, Rectángulo `[Salida]`, Óvalo `[Fin]`.
*   **Superposición WebAR:** Token de datos luminoso recorre el camino paso a paso actualizando los valores calculados sobre el papel.

### 3.2. Diagrama de Flujo: Bifurcación Condicional (IF / ELSE)
*   **Sintaxis gráfica en papel:** Rombo de decisión con condición lógica (ej: `¿x > 0?`) y dos ramas de salida rotuladas `SÍ` y `NO`.
*   **Superposición WebAR:** Evaluación de la condición con un valor de entrada del usuario; el flujo ilumina la rama tomada en verde y atenúa la rama descartada.

### 3.3. Diagrama de Flujo: Bucle Iterativo (WHILE / FOR)
*   **Sintaxis gráfica en papel:** Rombo de condición con una flecha de retorno hacia un nodo previo formando un ciclo cerrado de repetición.
*   **Superposición WebAR:** Animación cíclica del token por el bucle mientras un contador en pantalla incrementa en cada vuelta hasta cumplir la condición de salida.

### 3.4. Análisis de Código: Debugger Paso a Paso
*   **Sintaxis gráfica en papel:** Líneas de pseudocódigo o código manuscrito en el cuaderno (ej: asignación de variables, condicionales, bucles).
*   **Superposición WebAR:** Reconocimiento óptico de líneas de código; resalta la línea en ejecución actual como un depurador real (Step Over / Step Into), con un inspector de variables flotante que muestra el estado de la memoria en cada paso.

### 3.5. Tabla de Traza (Dry-Run / Prueba de Escritorio)
*   **Sintaxis gráfica en papel:** Cuadrícula de tabla dibujada a mano con columnas para cada variable (`i`, `suma`, `condición`, `salida`).
*   **Superposición WebAR:** La IA llena o valida la tabla paso a paso a medida que ejecuta mentalmente el algoritmo, marcando en verde aciertos y en rojo discrepancias de lógica.

### 3.6. Seguimiento de Pilas y Recursión
*   **Sintaxis gráfica en papel:** Definición de una función que se llama a sí misma (ej: `factorial(n) = n * factorial(n-1)`) o bloques apilados.
*   **Superposición WebAR:** Proyección de la pila de llamadas (*call stack*) con marcos de función que se apilan y desapilan visualmente mostrando el caso base.

---

## 📐 Módulo 4: Matemáticas & Geometría (Enfoque Preuniversitario)

### 4.1. Geometría del Espacio (Estereometría 3D sobre Papel)
*   **Sintaxis gráfica en papel:** Proyecciones en perspectiva isométrica o caballera de sólidos geométricos dibujados en el plano: prismas, cilindros, pirámides, conos o esferas con líneas visibles continuas y aristas ocultas punteadas. Cotas de radio $r$, altura $h$ o arista $a$.
*   **Superposición WebAR:** El sólido 2D dibujado cobra volumen tridimensional y se levanta del papel como un holograma 3D que el alumno puede inspeccionar girando su teléfono; cálculo dinámico de Volumen ($V$), Área Lateral ($A_L$) y Área Total ($A_T$).
*   **Fórmulas Pre-U:**
    *   Cilindro: $V = \pi r^2 h \quad|\quad A_L = 2\pi r h$
    *   Cono: $V = \frac{1}{3}\pi r^2 h \quad|\quad g = \sqrt{r^2 + h^2}$
    *   Esfera: $V = \frac{4}{3}\pi r^3 \quad|\quad A = 4\pi r^2$

### 4.2. Geometría Analítica en el Plano Cartesiano
*   **Sintaxis gráfica en papel:** Ejes ortogonales $XY$ en papel cuadriculado con puntos rotulados con sus coordenadas $A(x_1, y_1)$ y $B(x_2, y_2)$, rectas trazadas o secciones cónicas (circunferencia, parábola con foco y directriz, elipse).
*   **Superposición WebAR:** Proyección del vector distancia entre puntos, punto medio $M$, cálculo de la pendiente de la recta ($m = \tan\theta$), ecuación general de la recta ($Ax + By + C = 0$) o ecuación ordinaria de la cónica.
*   **Fórmulas Pre-U:**
    *   Distancia: $d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$
    *   Pendiente: $m = \frac{y_2 - y_1}{x_2 - x_1}$
    *   Circunferencia canónica: $(x-h)^2 + (y-k)^2 = r^2$

### 4.3. Gráfica de Funciones ($f(x)$)
*   **Sintaxis gráfica en papel:** Ejes cartesianos con una función manuscrita al lado: polinomial ($y = ax^2 + bx + c$), valor absoluto ($y = |x - h| + k$), raíz cuadrada o trigonométrica ($y = A\sin(Bx)$).
*   **Superposición WebAR:** Calibración automática del origen $(0,0)$ sobre la cuadrícula del cuaderno; trazo continuo de la curva matemática exacta pasando por los puntos notables: vértices, asíntotas, raíces/interceptos con el eje $X$ y eje $Y$, y cálculo de Dominio y Rango.
*   **Conceptos Pre-U:** Puntos de corte, asíntotas verticales/horizontales, concavidad y transformaciones de funciones ($f(x \pm c)$, reflexiones).

### 4.4. Solver de Ecuaciones Paso a Paso
*   **Sintaxis gráfica en papel:** Una ecuación algebraica escrita a mano con lápiz (ej: ecuación cuadrática $ax^2 + bx + c = 0$, sistema lineal $2\times 2$, o ecuación exponencial/logarítmica).
*   **Superposición WebAR:** Reconocimiento OCR de los términos matemáticos; proyecta al lado del trazo en el papel el desglose deductivo paso a paso: factorización, discriminante ($\Delta = b^2 - 4ac$), método de sustitución/igualación y conjunto solución ($C.S.$) resaltado en un recuadro luminoso.
*   **Técnicas Pre-U:** Fórmula general de Carnot, método del aspa simple, determinantes (regla de Cramer).

### 4.5. Cálculo de Ángulos en Figuras Geométricas
*   **Sintaxis gráfica en papel:** Configuraciones clásicas de examen de admisión:
    1. Rectas paralelas cortadas por una secante ($L_1 \parallel L_2$).
    2. Triángulos con cevianas, bisectrices interiores/exteriores y mediatrices.
    3. Cuadriláteros inscritos o inscriptibles en una circunferencia.
    Anotación de incógnitas angulares (ej: $x$, $2x$, $\alpha$, $\theta$).
*   **Superposición WebAR:** La IA detecta la topología de la figura, reconoce las relaciones geométricas (ángulos alternos internos, teorema del boomerang, ángulo exterior, ángulo inscrito) y proyecta sobre la figura la ecuación geométrica resuelta mostrando el valor exacto de la incógnita $x$ en grados sexagesimales.
*   **Propiedades Pre-U:**
    *   Ángulo exterior de triángulo: $\theta_{\text{ext}} = \alpha + \beta$
    *   Teorema de la mariposa / corbata: $\alpha + \beta = \theta + \phi$
    *   Rectas paralelas: Ángulos correspondientes y conjugados.

