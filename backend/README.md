# PaperLab WebAR — Backend de Análisis Multimodal

Backend en **FastAPI** con arquitectura **Modular Monolith** para **PaperLab WebAR**. Recibe fotografías de trazos manuscritos en cuadernos escolares/universitarios y genera un **JSON de parámetros estructurados y validados** listo para que el simulador WebAR (Three.js / MindAR) lo ejecute sobre el papel.

---

## 🏛️ Arquitectura del Sistema (Modular Monolith)

El backend sigue las reglas de independencia y dirección de dependencias de un monolito modular:
```
backend/
├── main.py                          ← Monta routers, CORS, exception handlers y health
├── config.py                        ← Configuración con Pydantic Settings (.env)
├── .env.example                     ← Plantilla de variables de entorno
├── requirements.txt                 ← Dependencias oficiales
│
├── shared/                          ← Shared Kernel transversal
│   ├── errors.py                    ← Excepciones de dominio tipadas
│   ├── logging.py                   ← Logger unificado
│   └── types.py                     ← SkillId, BoundingBox, BaseAnalysisResult
│
├── modules/
│   ├── analysis/                    ← MÓDULO PRINCIPAL (Las 4 estaciones)
│   │   ├── api.py                   ← [Estación 1: La Puerta] POST /analyze/{skill}
│   │   ├── service.py               ← [Estación 2: El Director] Orquesta flujo y reintentos
│   │   ├── domain/
│   │   │   ├── skills/              ← [Estación 3: Especialistas]
│   │   │   │   ├── base.py          ← Interfaz abstracta Skill
│   │   │   │   ├── physics/         ← 6 tipos (plano, péndulo, proyectil, masa-resorte, cinemática, atwood)
│   │   │   │   ├── circuit/         ← 6 tipos (simple, serie, paralelo, interruptor, RC, puertas)
│   │   │   │   ├── flowchart/       ← 6 tipos (secuencial, if/else, bucle, debugger, traza, recursión)
│   │   │   │   └── math_geo/        ← 5 tipos (3D, analítica, funciones f(x), ecuaciones, ángulos)
│   │   │   └── validators.py        ← Validaciones determinísticas físicas y matemáticas
│   │   ├── ports/
│   │   │   └── llm.py               ← [Puerto] Interfaz abstracta LLMClient
│   │   └── adapters/
│   │       └── openrouter.py        ← [Estación 4: El Traductor] langchain-openrouter + Gemini
│   │
│   ├── sessions/                    ← Scaffold futuro (sesiones de laboratorio WebAR)
│   ├── catalog/                     ← Scaffold futuro (CRUD de ejercicios y guías)
│   ├── users/                       ← Scaffold futuro (autenticación y perfiles)
│   └── history/                     ← Scaffold futuro (telemetría e historial)
│
└── infrastructure/                  ← Adaptadores compartidos
    ├── db.py                        ← Stub de persistencia
    └── cache.py                     ← Stub de almacenamiento en memoria / Redis
```

---

## 🧠 Los 4 Módulos y los 23 Tipos de Ejercicios Soportados

| Módulo (`skill_id`) | Cantidad | Tipos incluidos en el Contrato (`exercise_type`) |
|---|:---:|---|
| **`physics`** (Física) | 6 | `inclined_plane`, `simple_pendulum`, `projectile_motion`, `mass_spring`, `rectilinear_motion`, `atwood_machine` |
| **`circuit`** (Circuitos) | 6 | `single_loop`, `series_resistors`, `parallel_resistors`, `interactive_switch`, `rc_circuit`, `logic_gates` |
| **`flowchart`** (Algoritmos) | 6 | `sequential_flowchart`, `conditional_flowchart`, `loop_flowchart`, `code_debugger`, `trace_table`, `recursive_flowchart` |
| **`math_geo`** (Matemáticas) | 5 | `geometry_3d`, `analytic_geometry`, `function_graph`, `equation_solver`, `geometric_angles` |

**Total:** **23 tipos de ejercicios** modelados mediante discriminated unions en Pydantic v2.

---

## 🚀 Puesta en Marcha Rápida

### 1. Requisitos
- Python 3.10+ (probado en Python 3.12)
- Clave de API de [OpenRouter](https://openrouter.ai/) con créditos para Gemini (`google/gemini-2.5-flash`).

### 2. Configuración de Entorno
Copia la plantilla `.env.example` a `.env` en la raíz de `backend/`:
```bash
cp .env.example .env
```
Edita `.env` con tu clave:
```env
OPENROUTER_API_KEY=sk-or-v1-tu-clave-aqui
OPENROUTER_MODEL=google/gemini-2.5-flash
CONFIDENCE_THRESHOLD=0.8
MAX_IMAGE_SIZE_MB=10
LLM_TIMEOUT_SECONDS=30
MAX_RETRIES=1
CORS_ORIGINS=*
```

### 3. Instalación de Dependencias
```bash
cd backend
pip install -r requirements.txt
```

### 4. Ejecución del Servidor
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
El servidor quedará disponible en: `http://localhost:8000`

---

## 📡 Endpoints de la API

### 1. Health Check
```bash
curl http://localhost:8000/health
```
**Respuesta:**
```json
{
  "status": "ok",
  "service": "PaperLab WebAR Analysis Backend",
  "version": "1.0.0",
  "llm_model": "google/gemini-2.5-flash",
  "api_key_configured": true,
  "confidence_threshold": 0.8
}
```

### 2. Catálogo de Skills y Ejercicios
```bash
curl http://localhost:8000/skills
```
Devuelve los 4 módulos con sus nombres, descripciones, fórmulas y tipos de ejercicio.

### 3. Análisis de Foto Manuscrita (`POST /analyze/{skill}`)
Soporta `physics`, `circuit`, `flowchart`, `math_geo` (y alias plurales como `circuits`, `math`, `diagramas`).

Ejemplo con cURL:
```bash
curl -X POST "http://localhost:8000/analyze/physics" \
  -F "file=@mi_foto_plano_inclinado.jpg" \
  -F "notes=El bloque tiene masa de 2kg y angulo de 30 grados"
```

### 4. Documentación Interactiva (Swagger UI)
Abre en el navegador:
👉 **`http://localhost:8000/docs`**

Puedes arrastrar una fotografía directamente desde la interfaz de Swagger y probar la extracción con un clic.

