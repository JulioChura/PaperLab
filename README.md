# 🔬 PaperLab WebAR

> **Transforma dibujos a mano en papel físico en simulaciones científicas interactivas con Realidad Aumentada (WebAR).**

PaperLab es un sistema educativo que permite a estudiantes y docentes dibujar bocetos científicos (planos inclinados, circuitos eléctricos con grafito, algoritmos o figuras geométricas) en sus cuadernos físicos. A través de la cámara del celular, el sistema analiza los trazos con Inteligencia Artificial multimodal y superpone simulaciones holográficas interactivas en tiempo real.

---

## 🏛️ Arquitectura General

El proyecto cuenta con una separación limpia y desacoplada entre dos componentes principales:

```
PaperLab/
├── frontend/   ← Aplicación WebAR (React 19 + Vite + TypeScript + Tailwind CSS v4)
└── backend/    ← Backend de Análisis IA (FastAPI + Modular Monolith + Google Gemini)
```

1. **Frontend (`frontend/`):** Desarrollado en **React 19**, **Vite**, **TypeScript** y **Tailwind CSS v4**. Gestiona la interfaz del laboratorio, la selección de disciplinas y el visor WebAR con acceso a la cámara del dispositivo móvil, efectos holográficos y sonido.
2. **Backend (`backend/`):** Desarrollado en **FastAPI** con arquitectura de **Modular Monolith** (vertical slices). Preprocesa las fotografías, consulta a **Google Gemini** con salida estructurada estricta y valida contratos físicos determinísticos para alimentar a los simuladores.

---

## 📋 Requisitos Previos

- **Node.js** v18 o superior y **npm** (para el Frontend).
- **Python** 3.10 o superior (para el Backend).
- Clave de API de **Google Gemini** (gratuita en [Google AI Studio](https://aistudio.google.com/)).

---

## 🎨 1. Instalación y Ejecución del Frontend

El frontend se encuentra en la carpeta `frontend/`.

### Paso 1: Entrar a la carpeta e instalar dependencias
```bash
cd frontend
npm install
```

### Paso 2: Iniciar el servidor de desarrollo
```bash
npm run dev
```

El frontend quedará activo en:
👉 **`http://localhost:5173`** (y en `http://<IP-de-tu-PC>:5173` para probar desde el celular en la misma red)

> 🔌 **Conexión con el backend:** el frontend envía las fotos a `/api/analyze/{módulo}`. En desarrollo, Vite redirige `/api/*` a `http://localhost:8000` (ver `frontend/vite.config.ts`), así que **el backend debe estar corriendo**. En producción define `VITE_API_URL` con la URL pública del backend.

### Scripts disponibles del Frontend:
- `npm run dev`: Inicia el servidor de desarrollo con Hot Module Replacement (HMR).
- `npm run dev:https`: Igual, pero por HTTPS con certificado local. **Úsalo para probar desde el celular**: los navegadores móviles solo permiten la cámara en contextos seguros (acepta el aviso del certificado la primera vez).
- `npm run build`: Compila la aplicación para producción con TypeScript.
- `npm run lint`: Ejecuta el linter ultrarrápido con Oxlint.
- `npm run preview`: Previsualiza la versión compilada de producción.

---

## ⚙️ 2. Instalación y Ejecución del Backend

El backend se encuentra dentro de la carpeta `backend/`.

### Paso 1: Crear y activar entorno virtual Python
Desde la raíz del proyecto (`PaperLab/`) o dentro de `backend/`:

**En Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**En Linux / macOS:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Paso 2: Instalar dependencias de Python
Entra a la carpeta `backend` e instala los requerimientos:
```bash
cd backend
pip install -r requirements.txt
```

*(Instala `fastapi`, `uvicorn`, `google-genai`, `pydantic`, `pillow`, `truststore`, etc.)*

### Paso 3: Configurar variables de entorno (`.env`)
En la carpeta `backend/`, copia la plantilla `.env.example` a `.env` (si aún no existe):
```bash
cp .env.example .env
```

Edita `backend/.env` colocando tu clave de API:
```env
# Tu API Key de Google Gemini (solo vive en el backend, nunca en el frontend)
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-3.8-flash
# Modelos alternativos si el principal está saturado (503) o no disponible
GEMINI_FALLBACK_MODELS=gemini-3.5-flash,gemini-3.5-flash-lite

# Umbral de confianza mínimo aceptado (0.0 a 1.0)
CONFIDENCE_THRESHOLD=0.8

# Tamaño máximo de imagen permitido en MB
MAX_IMAGE_SIZE_MB=10

# Límite de tiempo en segundos
LLM_TIMEOUT_SECONDS=60

# Número máximo de reintentos automáticos ante inconsistencias
MAX_RETRIES=1

# Orígenes CORS permitidos (en desarrollo el frontend usa el proxy de Vite)
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

> ⚠️ `backend/.env` está en `.gitignore`. **Nunca** pongas keys reales en el README, en `.env.example` ni en variables `VITE_*` (estas se incrustan en el JavaScript que recibe el navegador).

### Paso 4: Iniciar el servidor Backend
Estando dentro de la carpeta `backend/`:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

El servidor quedará disponible en:
👉 **`http://localhost:8000`**

Documentación interactiva de la API (Swagger UI):
👉 **`http://localhost:8000/docs`**

---

## 🧠 Los 4 Módulos y los 23 Ejercicios Soportados

| Módulo (`skill_id`) | Total | Tipos incluidos en el Contrato (`exercise_type`) |
|---|:---:|---|
| **`physics`** (Física) | **6** | `inclined_plane` (Plano inclinado con fricción), `simple_pendulum` (Péndulo simple), `projectile_motion` (Tiro parabólico), `mass_spring` (Ley de Hooke), `rectilinear_motion` (Cinemática MRU/MRUV), `atwood_machine` (Poleas de Atwood) |
| **`circuit`** (Circuitos) | **6** | `single_loop` (Malla simple con bombilla/LED), `series_resistors` (Resistencias en serie), `parallel_resistors` (Resistencias en paralelo), `interactive_switch` (Interruptor táctil), `rc_circuit` (Carga/descarga de condensador), `logic_gates` (Compuertas AND, OR, NOT...) |
| **`flowchart`** (Algoritmos) | **6** | `sequential_flowchart` (Diagrama secuencial), `conditional_flowchart` (Bifurcaciones IF/ELSE), `loop_flowchart` (Bucles While/For), `code_debugger` (Depurador paso a paso), `trace_table` (Tabla de traza de variables), `recursive_flowchart` (Recursión y call stack) |
| **`math_geo`** (Matemáticas) | **5** | `geometry_3d` (Estereometría 3D sobre papel), `analytic_geometry` (Plano cartesiano y rectas), `function_graph` (Gráfica de funciones f(x)), `equation_solver` (Solver paso a paso con discriminante), `geometric_angles` (Cálculo de incógnitas angulares en figuras) |

---

## 🪄 Solver AR sobre el papel (Matemáticas)

Flujo: el alumno encuadra su hoja → **Escanear y resolver** congela la captura → la IA lee la ecuación → la solución se escribe a mano sobre la foto, paso a paso, con su gráfica si hay espacio. **Escanear** vuelve a la cámara en vivo.

> **Modo por defecto: foto congelada** (100 % estable, ideal para demos). El rastreo en vivo sobre la hoja (flujo óptico + MindAR) es **experimental** y se activa abriendo la app con `?ar=live` (ej. `http://localhost:5173/?ar=live`).

| Pieza | Archivo | Qué hace |
|---|---|---|
| Visión de la hoja | `frontend/src/ar/paperVision.ts` | Segmenta la hoja y los trazos; mide color de la tinta (reflectancia vs. papel), grosor del trazo, tipo (grafito / lapicero) y altura de letra. |
| Motor matemático | `frontend/src/ar/mathEngine.ts` | Interpreta la ecuación (texto plano o LaTeX) y calcula pasos, raíces y gráfica de forma determinística: la IA solo transcribe, nunca inventa números. |
| Escritura a mano | `frontend/src/ar/handwriting.ts` | Fuente Caveat + **rough.js** para fracciones, raíces, Δ, ejes y curva con aspecto de lápiz. |
| Layout | `frontend/src/ar/arLayout.ts` | Escribe debajo de lo que escribió el alumno, a su misma escala; ubica la gráfica en el espacio libre de la hoja. |
| Rastreo | `frontend/src/ar/paperTracker.ts` | Flujo óptico Lucas-Kanade (**jsfeat**) + RANSAC con realineación contra la captura (sin deriva); **MindAR** como relocalizador cuando la hoja se pierde. |
| Render | `frontend/src/ar/arScene.ts` | **Three.js** con homografía en pantalla y `mix-blend-mode: multiply`: la tinta virtual hereda la luz, sombras y textura del papel real. |

Tipos soportados hoy: `equation_solver` (lineales, cuadráticas, y numéricas como `2^x = 8`) y `function_graph`. Los demás módulos muestran los parámetros validados por el backend.

---

## 🧪 Pruebas del Backend

Para ejecutar la suite automatizada de pruebas unitarias y determinísticas:
```bash
cd backend
python -m unittest tests.test_api
```

---

## 📁 Estructura del Repositorio

```
PaperLab/
├── frontend/                        ← Aplicación WebAR en React 19 + Vite
│   ├── public/                      ← Assets estáticos y favicon
│   ├── src/                         ← Código fuente React (Componentes, Visor WebAR, Theme)
│   │   ├── components/              ← ARCameraView, ModuleSelector, SplashScreen, Header, etc.
│   │   ├── data/                    ← Paletas de colores y configuración
│   │   └── utils/                   ← Efectos de sonido y utilidades WebAR
│   ├── package.json                 ← Dependencias y scripts del frontend
│   └── vite.config.ts               ← Configuración de Vite y Tailwind v4
│
├── backend/                         ← Monolito modular FastAPI
│   ├── main.py                      ← Entrada FastAPI, CORS y endpoints base
│   ├── config.py                    ← Ajustes tipados con Pydantic Settings
│   ├── .env.example                 ← Plantilla de variables de entorno
│   ├── requirements.txt             ← Dependencias oficiales de Python
│   ├── shared/                      ← Excepciones, tipos comunes y logging
│   ├── modules/
│   │   └── analysis/                ← Módulo vertical de análisis (API, Service, Skills, Adapters)
│   │   │   ├── domain/skills/       ← Especialistas: physics, circuit, flowchart, math_geo
│   │   │   ├── adapters/            ← Adaptador Google Gemini (SDK google-genai)
│   │   │   └── ports/               ← Interfaz abstracta LLMClient
│   └── tests/                       ← Tests unitarios determinísticos
│
├── RUBRICA_EJERCICIOS.md            ← Catálogo canónico oficial de ejercicios de PaperLab
└── README.md                        ← Este documento
```
