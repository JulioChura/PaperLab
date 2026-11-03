# 🚀 PaperLab WebAR — Backend de Análisis Multimodal

Backend en **FastAPI** con arquitectura de **Modular Monolith** para **PaperLab WebAR**. Recibe fotografías de trazos manuscritos en cuadernos escolares/universitarios y genera un **JSON estructurado con parámetros físicos y matemáticos** listo para ser ejecutado por el simulador WebAR (Three.js / MindAR).

---

## 📋 Requisitos Previos

- **Python 3.10 o superior** (Probado y optimizado en Python 3.12).
- Clave de API de **Google Gemini** (recomendado para máxima velocidad y respuesta directa en 2-4 segundos) o **OpenRouter**.

---

## ⚙️ Configuración del Entorno (`.env`)

Dentro de la carpeta `backend/` existe el archivo de configuración `.env` (puedes tomar como base `.env.example`).

### 1. Opción A: Google Gemini Directo (Recomendada y más rápida)
En `backend/.env`:
```env
# Proveedor principal
LLM_PROVIDER=gemini

# Tu API Key oficial de Google Gemini
GEMINI_API_KEY=AQ.Ab8RN6JdkwF0yH7tLo9CeZ5WCs1PpcwfZ0il888d0qZhpURnOA
GEMINI_MODEL=gemini-2.5-flash

# Umbral de confianza mínimo aceptado (0.0 a 1.0)
CONFIDENCE_THRESHOLD=0.8

# Tamaño máximo de imagen permitido en MB
MAX_IMAGE_SIZE_MB=10

# Límite de tiempo para la respuesta en segundos
LLM_TIMEOUT_SECONDS=60

# Número máximo de reintentos con feedback correctivo
MAX_RETRIES=1

# Orígenes CORS permitidos
CORS_ORIGINS=*
```

### 2. Opción B: OpenRouter (Alternativa multi-modelo)
Si prefieres usar OpenRouter:
```env
LLM_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-tu-clave-aqui
OPENROUTER_MODEL=google/gemini-2.5-flash
LLM_TIMEOUT_SECONDS=75
```

---

## 📦 Instalación de Dependencias

1. Abre tu terminal (PowerShell o Bash) y dirígete a la raíz del proyecto:
   ```powershell
   cd c:\Users\USUARIO\Documents\PaperLab
   ```

2. Activa tu entorno virtual (si no lo tienes creado, créalo con `python -m venv .venv`):
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

3. Entra a la carpeta `backend` e instala las dependencias necesarias:
   ```powershell
   cd backend
   pip install -r requirements.txt
   ```

*(Las dependencias clave instaladas son: `fastapi`, `uvicorn`, `google-genai`, `langchain-openrouter`, `pydantic`, `pydantic-settings`, `pillow` y `python-multipart`).*

---

## 🏃 Cómo Correr el Backend

Desde la carpeta `backend/` ejecuta Uvicorn:

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Si ejecutas desde la raíz del proyecto usando el entorno virtual:
```powershell
cd backend
..\.venv\Scripts\uvicorn main:app --reload
```

El servidor iniciará automáticamente en:
👉 **`http://localhost:8000`**

---

## 🧪 Cómo Probarlo

### 1. Documentación Interactiva (Swagger UI) — La forma más fácil
Abre en tu navegador web:
👉 **`http://localhost:8000/docs`**

1. Despliega el endpoint **`POST /analyze/{skill}`**.
2. Presiona **"Try it out"**.
3. En el campo `skill`, ingresa el módulo (ej: `physics`, `circuit`, `flowchart` o `math_geo`).
4. En `file`, selecciona cualquier foto de un dibujo a mano (ej: tiro parabólico, plano inclinado, circuito con LED, diagrama con rombos).
5. Haz clic en **"Execute"**.
6. Recibirás de inmediato el JSON con el código HTTP **200 OK**, la confianza detectada, las cajas de anclaje para Realidad Aumentada y los parámetros de simulación.

### 2. Monitoreo de Salud (`GET /health`)
```bash
curl http://localhost:8000/health
```
**Respuesta esperada:**
```json
{
  "status": "ok",
  "service": "PaperLab WebAR Analysis Backend",
  "version": "1.0.0",
  "llm_model": "gemini-2.5-flash",
  "api_key_configured": true,
  "confidence_threshold": 0.8
}
```

### 3. Catálogo de Habilidades y los 23 Ejercicios (`GET /skills`)
```bash
curl http://localhost:8000/skills
```

### 4. Pruebas Automatizadas (Unit Tests)
Para verificar la integridad del sistema y las validaciones determinísticas:
```powershell
python -m unittest tests.test_api
```

---

## 🏛️ Estructura del Proyecto (Modular Monolith)

```
backend/
├── main.py                          ← App FastAPI, CORS wildcard, handlers y endpoints (/health, /skills)
├── config.py                        ← Ajustes tipados con Pydantic Settings (.env)
├── .env                             ← Configuración local con tus claves de API
├── requirements.txt                 ← Dependencias oficiales limpias
├── README.md                        ← Esta documentación
│
├── shared/                          ← Shared Kernel transversal
│   ├── errors.py                    ← Excepciones de dominio tipadas
│   ├── logging.py                   ← Logger centralizado
│   └── types.py                     ← Tipos base (SkillId, BoundingBox, etc.)
│
├── modules/
│   ├── analysis/                    ← ★ MÓDULO PRINCIPAL (Las 4 Estaciones)
│   │   ├── api.py                   ← [Estación 1: La Puerta] POST /analyze/{skill}
│   │   ├── service.py               ← [Estación 2: El Director] Orquestación y reintentos
│   │   ├── domain/
│   │   │   ├── skills/              ← [Estación 3: Especialistas]
│   │   │   │   ├── physics/         ← 6 tipos (plano, péndulo, tiro, resorte, MRU/MRUV, atwood)
│   │   │   │   ├── circuit/         ← 6 tipos (simple, serie, paralelo, switch, RC, compuertas)
│   │   │   │   ├── flowchart/       ← 6 tipos (secuencial, if/else, bucle, debugger, traza, recursión)
│   │   │   │   └── math_geo/        ← 5 tipos (3D, analítica, funciones, ecuaciones, ángulos)
│   │   │   └── validators.py        ← Validaciones determinísticas de leyes físicas
│   │   ├── ports/
│   │   │   └── llm.py               ← [Puerto] Interfaz abstracta LLMClient
│   │   └── adapters/
│   │       ├── gemini_direct.py     ← [Estación 4: El Traductor] SDK nativo Google Gemini
│   │       └── openrouter.py        ← [Estación 4: El Traductor] LangChain + OpenRouter
│   │
│   ├── sessions/                    ← Scaffold futuro (# TODO: future module)
│   ├── catalog/                     ← Scaffold futuro (# TODO: future module)
│   ├── users/                       ← Scaffold futuro (# TODO: future module)
│   └── history/                     ← Scaffold futuro (# TODO: future module)
│
└── tests/
    └── test_api.py                  ← Tests automatizados determinísticos
```
