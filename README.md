# 🔬 PaperLab WebAR

> **Transforma dibujos a mano en papel físico en simulaciones científicas interactivas con Realidad Aumentada (WebAR).**

PaperLab es un sistema educativo que permite a estudiantes y docentes dibujar bocetos científicos (planos inclinados, circuitos eléctricos con grafito, algoritmos o figuras geométricas) en sus cuadernos físicos. A través de la cámara del celular, el sistema analiza los trazos con Inteligencia Artificial multimodal y superpone simulaciones holográficas interactivas en tiempo real.

---

## 🏛️ Arquitectura General

El repositorio está organizado en dos partes complementarias:

1. **Frontend (WebAR & UI):** Desarrollado en **React 19**, **Vite**, **TypeScript** y **Tailwind CSS v4**. Gestiona la interfaz del laboratorio, la selección de disciplinas y el visor WebAR de cámara con permisos y efectos de sonido/hologramas.
2. **Backend (Motor de Análisis IA):** Desarrollado en **FastAPI** con arquitectura de **Modular Monolith** (vertical slices). Preprocesa las fotografías, consulta a **Google Gemini** con salida estructurada estricta y valida contratos físicos determinísticos para alimentar a los simuladores.

---

## 📋 Requisitos Previos

- **Node.js** v18 o superior y **npm** (para el Frontend).
- **Python** 3.10 o superior (para el Backend).
- Clave de API de **Google Gemini** (gratuita en [Google AI Studio](https://aistudio.google.com/)) o de **OpenRouter**.

---

## 🎨 1. Instalación y Ejecución del Frontend

El frontend se encuentra en la raíz del proyecto.

### Paso 1: Instalar dependencias
Abre tu terminal en la raíz del proyecto (`PaperLab/`):
```bash
npm install
```

### Paso 2: Iniciar el servidor de desarrollo
```bash
npm run dev
```

El frontend quedará activo en:
👉 **`http://localhost:5173`**

### Scripts disponibles del Frontend:
- `npm run dev`: Inicia el servidor de desarrollo con Hot Module Replacement (HMR).
- `npm run build`: Compila la aplicación para producción con TypeScript.
- `npm run lint`: Ejecuta el linter ultrarrápido con Oxlint.
- `npm run preview`: Previsualiza la versión compilada de producción.

---

## ⚙️ 2. Instalación y Ejecución del Backend

El backend se encuentra dentro de la carpeta `backend/`.

### Paso 1: Crear y activar entorno virtual Python
Desde la raíz del proyecto (`PaperLab/`):

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

*(Instala `fastapi`, `uvicorn`, `google-genai`, `langchain-openrouter`, `pydantic`, `pillow`, etc.)*

### Paso 3: Configurar variables de entorno (`.env`)
En la carpeta `backend/`, copia la plantilla `.env.example` a `.env` (si aún no existe):
```bash
cp .env.example .env
```

Edita `backend/.env` colocando tu clave de API:
```env
# Proveedor principal: 'gemini' (directo, ultra-rápido ~2s) o 'openrouter'
LLM_PROVIDER=gemini

# Tu API Key de Google Gemini
GEMINI_API_KEY=tu_api_key_aqui
GEMINI_MODEL=gemini-2.5-flash

# Umbral de confianza mínimo aceptado (0.0 a 1.0)
CONFIDENCE_THRESHOLD=0.8

# Tamaño máximo de imagen permitido en MB
MAX_IMAGE_SIZE_MB=10

# Límite de tiempo en segundos
LLM_TIMEOUT_SECONDS=60

# Número máximo de reintentos automáticos ante inconsistencias
MAX_RETRIES=1

# Orígenes CORS permitidos
CORS_ORIGINS=*
```

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
├── public/                          ← Assets estáticos WebAR del frontend
├── src/                             ← Código fuente React (Componentes, Visor WebAR, Theme)
│   ├── components/                  ← ARCameraView, ModuleSelector, SplashScreen, etc.
│   ├── data/                        ← Paletas de colores y constantes
│   └── utils/                       ← Efectos de sonido y utilidades WebAR
├── package.json                     ← Configuración y dependencias del Frontend
├── vite.config.ts                   ← Configuración de Vite + Tailwind
│
├── backend/                         ← Monolito modular FastAPI
│   ├── main.py                      ← Entrada FastAPI, CORS y endpoints base
│   ├── config.py                    ← Ajustes tipados con Pydantic Settings
│   ├── .env.example                 ← Plantilla de variables de entorno
│   ├── requirements.txt             ← Dependencias oficiales de Python
│   ├── shared/                      ← Excepciones, tipos comunes y logging
│   ├── modules/
│   │   ├── analysis/                ← Módulo de análisis (API, Service, Skills, Adapters)
│   │   │   ├── domain/skills/       ← Especialistas: physics, circuit, flowchart, math_geo
│   │   │   ├── adapters/            ← Gemini Direct SDK y OpenRouter LangChain
│   │   │   └── ports/               ← Interfaz abstracta LLMClient
│   │   ├── sessions/                ← Scaffold futuro: sesiones de laboratorio en vivo
│   │   ├── catalog/                 ← Scaffold futuro: CRUD de ejercicios y guías
│   │   ├── users/                   ← Scaffold futuro: autenticación y perfiles
│   │   └── history/                 ← Scaffold futuro: historial de simulaciones
│   └── tests/                       ← Tests unitarios determinísticos
│
├── RUBRICA_EJERCICIOS.md            ← Catálogo canónico de ejercicios de PaperLab
└── README.md                        ← Este documento
```
