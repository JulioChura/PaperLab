/**
 * Guiones del Tutor Socrático para los ejemplos de Nivel 1 y Nivel 2 (sin errores del alumno).
 * Tienen la misma forma que el campo `tutor` que devuelve el backend.
 * [retroalimentación, pregunta socrática, dato curioso, pista?, expresión?]
 */
import type { TutorFeedback, TutorMood } from '../tutor/types';

type Script = [string, string, string, string?, TutorMood?];

const L1: Record<string, Script> = {
  inclined_plane: [
    '¡Bien! Como tan 30° ≈ 0.58 es mayor que μ = 0.2, la componente del peso a lo largo de la rampa vence a la fricción y el bloque acelera a 3.2 m/s².',
    'Si duplicas la masa del bloque, ¿cambia su aceleración? ¿Por qué?',
    'Galileo usó planos inclinados para "diluir" la gravedad y poder medir la caída de los cuerpos con relojes de agua.',
    'La masa aparece en el peso, en la normal y en la fricción… ¿se cancela al calcular a = F/m?',
  ],
  simple_pendulum: [
    '¡Muy bien! El período (2.46 s) solo depende de la longitud del hilo y de g: la masa no influye.',
    '¿Qué longitud debería tener el hilo para que el período fuera exactamente el doble?',
    'En 1851, Léon Foucault colgó un péndulo de 67 m en el Panteón de París y demostró que la Tierra gira.',
    'T es proporcional a √L: para duplicar T, ¿cuántas veces más largo debe ser L?',
  ],
  projectile_motion: [
    '¡Excelente! En el punto más alto la velocidad vertical es cero, pero la horizontal (16.07 m/s) se mantiene durante todo el vuelo.',
    '¿Con qué otro ángulo de lanzamiento obtendrías exactamente el mismo alcance?',
    'Sin aire, el máximo alcance se logra a 45°; con la resistencia del aire, como en una pelota de béisbol real, el mejor ángulo suele ser menor.',
    'sen(2θ) toma el mismo valor para θ y para 90° − θ.',
  ],
  mass_spring: [
    '¡Bien! La energía va y viene entre el resorte (potencial elástica) y la masa (cinética); el período no depende de cuánto lo estires.',
    'Si cuelgas una masa cuatro veces mayor, ¿qué le pasa al período?',
    'Los relojes mecánicos de pulsera marcan el tiempo con un pequeño resorte en espiral que oscila como tu sistema masa-resorte.',
    'T = 2π√(m/k).',
  ],
  rectilinear_motion: [
    '¡Correcto! En el MRUV la velocidad aumenta lo mismo cada segundo: 2 m/s más cada segundo, hasta llegar a 16 m/s.',
    '¿Recorre el auto la misma distancia en el primer segundo que en el sexto? ¿Por qué?',
    'Un auto de Fórmula 1 puede pasar de 0 a 100 km/h en unos 2.6 segundos: ¡más de 10 m/s²!',
    'Calcula x(1) − x(0) y x(6) − x(5).',
  ],
  atwood_machine: [
    '¡Muy bien! La masa de 5 kg baja y arrastra a la de 3 kg; la tensión (36.75 N) queda entre ambos pesos (29.4 N y 49 N).',
    '¿Qué pasaría con la aceleración si las dos masas fueran iguales?',
    'George Atwood inventó esta máquina en 1784 para estudiar la gravedad "a cámara lenta".',
    'Mira el numerador de la fórmula: (m2 − m1)·g.',
  ],
  single_loop: [
    '¡Circuito cerrado! Por la malla circulan 0.3 A y el foco disipa 2.7 W.',
    'Si cambias la resistencia por una de 60 Ω, ¿qué pasa con la corriente y con el brillo del foco?',
    'Georg Ohm publicó su ley V = I·R en 1827, y al principio muchos científicos no le creyeron.',
    'I = V/R y P = V·I.',
  ],
  series_resistors: [
    '¡Bien! En serie la corriente es la misma en todas las resistencias, y la mayor caída de tensión está en la de 330 Ω.',
    'Si quitas una resistencia de la serie y dejas el hueco, ¿qué ocurre con las demás?',
    'Las antiguas guirnaldas navideñas iban en serie: si se quemaba un foquito, se apagaba toda la guirnalda.',
    'En serie solo hay un camino para la corriente.',
  ],
  parallel_resistors: [
    '¡Correcto! En paralelo todas las ramas reciben 6 V, y por la de 20 Ω pasa más corriente (0.3 A) que por la de 30 Ω (0.2 A).',
    '¿Por qué la resistencia equivalente (12 Ω) es menor que la más pequeña de las ramas?',
    'Los enchufes de tu casa están en paralelo: por eso puedes apagar un aparato sin apagar los demás.',
    'Cada rama nueva abre otro camino para la corriente.',
  ],
  interactive_switch: [
    '¡Bien! Con el interruptor abierto no hay camino cerrado y la corriente es 0 A; al cerrarlo circulan 0.2 A.',
    '¿Importa en qué parte de la malla pongas el interruptor?',
    'El interruptor de tu cuarto no "guarda" electricidad: solo abre o cierra el camino de la corriente.',
    'En una malla simple solo hay un camino.',
  ],
  rc_circuit: [
    '¡Bien! El condensador se carga rápido al principio y cada vez más lento: tras un τ (0.94 s) ya alcanza el 63 % de los 5 V.',
    '¿Qué pasaría con el tiempo de carga si duplicas la resistencia?',
    'El flash de una cámara usa un condensador que se carga en unos segundos y se descarga en una fracción de milisegundo.',
    'τ = R·C.',
  ],
  logic_gates: [
    '¡Correcto! Una compuerta AND solo da 1 cuando TODAS sus entradas valen 1; con B = 0, la salida es 0.',
    '¿Qué combinaciones de A y B encienden la salida de una compuerta OR?',
    'Las compuertas lógicas de tu celular están hechas con miles de millones de transistores más pequeños que un virus.',
    'En una OR basta con que una sola entrada valga 1.',
  ],
  sequential_flowchart: [
    '¡Bien estructurado! Cada bloque se ejecuta una sola vez y en orden: leer, calcular y mostrar A = 15.',
    '¿Qué bloques agregarías para calcular también el perímetro del rectángulo?',
    'Ada Lovelace escribió en 1843 el primer algoritmo pensado para una máquina.',
  ],
  conditional_flowchart: [
    '¡Bien! El rombo divide el camino en dos: solo una de las ramas se ejecuta, según la nota.',
    '¿Qué imprimiría el diagrama si la nota fuera exactamente 11? ¿Y 10.5?',
    'Las decisiones SI/ENTONCES son la base de todos los programas: hasta un videojuego es una montaña de condiciones.',
    'Fíjate si la condición usa ≥ o >.',
  ],
  loop_flowchart: [
    '¡Bien! El bucle repite el cuerpo mientras i ≤ 3 y en cada vuelta acumula: s = 1 + 2 + 3 = 6.',
    '¿Qué pasaría si olvidaras escribir i = i + 1 dentro del bucle?',
    'De niño, Gauss sumó del 1 al 100 en segundos emparejando números: 1 + 100, 2 + 99… = 50 × 101 = 5050.',
    'Revisa si la condición podría volverse falsa alguna vez.',
  ],
  code_debugger: [
    '¡Bien! En cada comparación, el mayor de los dos "burbujea" hacia la derecha.',
    '¿Cuántas pasadas necesita la burbuja, como máximo, para ordenar un arreglo de n elementos?',
    'El primer "bug" documentado fue una polilla real atrapada en un relé del computador Harvard Mark II en 1947.',
    'Después de cada pasada, el mayor ya quedó en su lugar definitivo.',
  ],
  trace_table: [
    '¡Bien! La tabla de traza muestra cómo f se multiplica por i en cada vuelta: 1, 2, 6, 24.',
    '¿Qué valor tendría f si el bucle empezara en i = 0?',
    'Los programadores usan tablas de traza en papel para encontrar errores antes de ejecutar el código.',
    'Cualquier número multiplicado por 0…',
  ],
  recursive_flowchart: [
    '¡Muy bien! Cada llamada espera a la siguiente hasta llegar al caso base; luego los resultados vuelven multiplicándose: 3·2·1 = 6.',
    '¿Qué ocurriría si la función no tuviera caso base?',
    'La recursión aparece en la naturaleza: cada rama de un helecho repite la forma de la hoja completa.',
    'Piensa en la pila de llamadas: ¿se detendría alguna vez?',
  ],
  equation_solver: [
    '¡Bien! Δ = 16 es un cuadrado perfecto, por eso las raíces son enteras: x = −3 y x = 1.',
    '¿Cómo podrías comprobar tus soluciones sin volver a resolver la ecuación?',
    'La palabra "álgebra" viene del árabe al-ŷabr, del libro de al-Juarismi del siglo IX.',
    'Reemplaza cada raíz en la ecuación, o usa suma (−b/a) y producto (c/a) de raíces.',
  ],
  function_graph: [
    '¡Bien! El vértice (2, −1) está justo a mitad de camino entre las raíces 1 y 3: la parábola es simétrica.',
    '¿Qué cambia en la gráfica si el coeficiente de x² fuera negativo?',
    'Las antenas parabólicas tienen esta forma porque todas las señales que llegan rebotan hacia un mismo punto: el foco.',
  ],
  geometry_3d: [
    '¡Bien! El volumen es el área de la base (π·3²) por la altura: 45π ≈ 141.37 u³.',
    'Si duplicas el radio, ¿el volumen se duplica, se triplica o se cuadruplica?',
    'Arquímedes pidió que grabaran una esfera dentro de un cilindro en su tumba, orgulloso de haber relacionado sus volúmenes.',
    'El radio aparece al cuadrado en V = π·r²·h.',
  ],
  analytic_geometry: [
    '¡Correcto! La pendiente 2/3 es positiva: la recta sube de izquierda a derecha.',
    '¿Qué pendiente tendría una recta perpendicular a AB?',
    'René Descartes ideó el plano cartesiano en el siglo XVII y unió para siempre el álgebra con la geometría.',
    'El producto de las pendientes de dos rectas perpendiculares es −1.',
  ],
  geometric_angles: [
    '¡Bien! Como los ángulos internos suman 180°, x = 180° − 50° − 70° = 60°.',
    '¿Cuánto mediría el ángulo exterior junto a x?',
    'En la superficie de una esfera, los ángulos de un triángulo suman MÁS de 180°.',
    'Un ángulo exterior suma 180° con su ángulo interior adyacente.',
  ],
};

const L2: Record<string, Script> = {
  inclined_plane: [
    '¡Bien! Aunque μ = 0.3 es alta, tan 37° ≈ 0.75 la supera y el bloque acelera a 3.55 m/s².',
    '¿Cuál es el ángulo mínimo con el que este bloque empezaría a deslizar?',
    'Las rampas de acceso para sillas de ruedas suelen tener menos de 5° de inclinación para que sean seguras.',
    'Busca el ángulo θ para el que tan θ = μ.',
  ],
  simple_pendulum: [
    '¡Ojo con la amplitud! A 35° la fórmula T = 2π√(L/g) ya no es exacta: el período real es un poco mayor.',
    '¿Por qué crees que la tensión en el punto más bajo es mayor que el peso de la masa?',
    'El péndulo de Foucault de París mide 67 m y tarda unos 16 segundos en cada oscilación.',
    'En el punto más bajo la masa describe una curva: necesita una fuerza centrípeta.',
    'surprised',
  ],
  projectile_motion: [
    '¡Bien! Al lanzarse desde 20 m, el proyectil vuela más tiempo del que tardaría en volver a su altura inicial.',
    '¿Llegaría más lejos lanzándolo a 45° desde esa misma altura?',
    'Los lanzadores de bala profesionales lanzan con ángulos de unos 37°, no de 45°, porque sueltan la bala desde más de 2 m de altura.',
    'Desde una altura, el ángulo óptimo es menor que 45°.',
  ],
  mass_spring: [
    '¡Bien! El amortiguador quita energía en cada vuelta: la amplitud decae de forma exponencial.',
    '¿Qué pasaría si el amortiguamiento fuera tan grande que la masa ya no llegara a oscilar?',
    'Los amortiguadores de los autos son osciladores amortiguados diseñados para que la carrocería no rebote.',
  ],
  rectilinear_motion: [
    '¡Bien! Se encuentran cuando sus posiciones son iguales: por eso se plantea xA(t) = xB(t).',
    '¿Cambiaría el instante del encuentro si B saliera 2 segundos después?',
    'Los radares de tráfico miden la velocidad con el efecto Doppler: comparan la frecuencia de la onda enviada y la reflejada.',
    'Escribe la posición de B considerando que empieza a moverse en t = 2 s.',
  ],
  atwood_machine: [
    '¡Muy bien! La masa sobre la mesa añade inercia y fricción: el sistema acelera menos que una Atwood simple.',
    '¿Qué valor de μ haría que el sistema quedara en reposo?',
    'Los ascensores usan un contrapeso, como en una máquina de Atwood, para que el motor haga mucho menos esfuerzo.',
    'Compara (m2 − m1)·g con μ·m3·g.',
  ],
  single_loop: [
    '¡Bien! La resistencia interna "se queda" con parte de la FEM: en los bornes hay menos de 12 V.',
    '¿Qué pasa con la tensión en bornes si conectas un foco de menor resistencia?',
    'Por eso una pila gastada puede marcar casi su voltaje en vacío y aun así fallar: su resistencia interna creció.',
    'V = ε − I·r: ¿qué pasa con I si R baja?',
  ],
  series_resistors: [
    '¡Bien! La suma de las caídas de tensión es exactamente 24 V: es la ley de mallas de Kirchhoff.',
    '¿Qué resistencia disipa más potencia en una serie: la mayor o la menor?',
    'Gustav Kirchhoff formuló sus leyes de circuitos en 1845, cuando aún era estudiante.',
    'P = I²·R y la corriente es la misma en todas.',
  ],
  parallel_resistors: [
    '¡Correcto! Req = 10 Ω, menor que la menor de las ramas (20 Ω): cada rama abre un nuevo camino.',
    'Si agregas una cuarta rama, ¿la corriente total sube o baja?',
    'Por eso no debes conectar demasiados aparatos a una misma extensión: la corriente total crece con cada uno.',
  ],
  interactive_switch: [
    '¡Bien! S1 está en el tramo común y controla todo; S2 solo interrumpe la rama del foco 2.',
    '¿Qué ocurre con el foco 1 si abres S2? ¿Y si abres S1?',
    'Las instalaciones de casa combinan interruptores así para encender cada lámpara por separado.',
  ],
  rc_circuit: [
    '¡Bien! En la descarga, tras cada constante de tiempo queda solo el 37 % del voltaje anterior.',
    '¿Cuántas constantes de tiempo hacen falta para que quede menos del 1 %?',
    'Los desfibriladores almacenan energía en un condensador y la liberan en milisegundos para reiniciar el corazón.',
    'e^(−5) ≈ 0.7 %.',
  ],
  logic_gates: [
    '¡Bien! Para hallar S se evalúa la red de izquierda a derecha, compuerta por compuerta.',
    '¿Existe alguna combinación de A, B y C que haga S = 0?',
    'Con solo compuertas NAND se puede construir cualquier otra compuerta: por eso se la llama "universal".',
    'Revisa la tabla de verdad fila por fila.',
  ],
  sequential_flowchart: [
    '¡Bien! La suma da 45 y el promedio 15: cada bloque usa el resultado del anterior.',
    '¿Qué pasaría si calcularas el promedio antes de sumar las notas?',
    'La palabra "algoritmo" viene del nombre del matemático persa al-Juarismi.',
  ],
  conditional_flowchart: [
    '¡Bien! Las decisiones anidadas comparan por pares hasta encontrar el mayor: 12.',
    '¿Cuántas comparaciones necesitas, como mínimo, para hallar el mayor de 4 números?',
    'Los torneos de eliminación directa funcionan igual: cada partido es una comparación que descarta a un candidato.',
    'Cada comparación descarta a un candidato.',
  ],
  loop_flowchart: [
    '¡Bien! % 10 extrae el último dígito y // 10 lo elimina: 2 + 7 + 4 = 13.',
    '¿Cuándo se detiene el bucle y por qué?',
    'Los códigos de barras usan una suma de dígitos (dígito de control) para detectar errores de lectura.',
    '¿Qué valor tiene n después de dividirlo entre 10 tres veces?',
  ],
  code_debugger: [
    '¡Bien! Los dos índices se acercan desde los extremos e intercambian valores hasta cruzarse.',
    '¿Qué pasa con el elemento del centro si el arreglo tiene un número impar de elementos?',
    'La técnica de dos punteros permite resolver muchos problemas recorriendo el arreglo una sola vez.',
  ],
  trace_table: [
    '¡Bien! La cola hace que se visite nivel por nivel: primero la raíz, luego sus hijos y después los nietos.',
    '¿Qué orden obtendrías si usaras una pila en lugar de una cola?',
    'Las redes sociales usan búsquedas en anchura para sugerir "amigos de tus amigos".',
    'Una pila saca primero lo último que entró: eso es un recorrido en profundidad (DFS).',
  ],
  recursive_flowchart: [
    '¡Bien! Cada llamada se divide en dos: por eso fib(n) recursivo repite muchos cálculos.',
    '¿Cuántas veces se calcula fib(1) al evaluar fib(3)?',
    'La secuencia de Fibonacci aparece en las espirales de los girasoles y de las piñas.',
    'Dibuja el árbol de llamadas y cuenta las hojas.',
  ],
  equation_solver: [
    '¡Bien! La parábola abre hacia arriba, así que es ≥ 0 fuera de las raíces: x ≤ −1 o x ≥ 5/2.',
    '¿Cómo cambiaría el conjunto solución si el signo fuera ≤?',
    'Los ingenieros usan inecuaciones para definir márgenes de seguridad: por ejemplo, la carga máxima de un puente.',
  ],
  function_graph: [
    '¡Bien! El vértice (2, −3) es la esquina de la "V" y la gráfica es simétrica respecto de x = 2.',
    '¿Qué transformaciones convierten y = |x| en esta función?',
    'El valor absoluto mide distancias: |x − 2| es la distancia entre x y 2 en la recta numérica.',
    'Piensa en desplazamientos horizontales y verticales.',
  ],
  geometry_3d: [
    '¡Bien! La generatriz forma un triángulo rectángulo 3-4-5 con el radio y la altura: g = 5.',
    '¿Qué fracción del volumen de un cilindro de igual base y altura ocupa este cono?',
    'Arquímedes demostró que un cono, una semiesfera y un cilindro de igual base y altura guardan volúmenes en proporción 1 : 2 : 3.',
    'Compara (1/3)·π·r²·h con π·r²·h.',
  ],
  analytic_geometry: [
    '¡Bien! La pendiente −3/4 es negativa: la recta baja de izquierda a derecha.',
    '¿En qué punto corta esta recta al eje Y?',
    'Los GPS calculan distancias entre puntos con la misma fórmula, pero sobre una esfera.',
    'Reemplaza x = 0 en la ecuación de la recta.',
  ],
  geometric_angles: [
    '¡Bien! Por el criterio LAL los triángulos son congruentes, así que sus ángulos correspondientes son iguales.',
    '¿Qué otros criterios de congruencia conoces y qué datos necesita cada uno?',
    'Los puentes usan armaduras triangulares porque el triángulo es la única figura que no se deforma si sus lados son rígidos.',
  ],
};

const toTutor = ([fb, q, fact, hint, mood]: Script): TutorFeedback => ({
  mood: mood ?? 'happy',
  has_error: false,
  error_type: null,
  pedagogical_feedback: fb,
  socratic_challenge: q,
  hint: hint ?? null,
  fun_fact: fact,
  mistakes: [],
});

export function scriptedTutor(level: 1 | 2, exerciseType: string): TutorFeedback | undefined {
  const s = (level === 2 ? L2 : L1)[exerciseType];
  return s ? toTutor(s) : undefined;
}
