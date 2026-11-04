"""Punto de entrada principal para la aplicación FastAPI de PaperLab Backend."""

from contextlib import asynccontextmanager
from typing import Any, Dict, List
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from modules.analysis.api import router as analysis_router
from modules.analysis.domain.skills import list_available_skills
from shared.errors import DomainError
from shared.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestión del ciclo de vida de la aplicación."""
    settings = get_settings()
    logger.info("=======================================================")
    logger.info("   PaperLab WebAR — Backend de Análisis Multimodal    ")
    logger.info("   Arquitectura: Monolito Modular (Vertical Slices)   ")
    logger.info(f"   Modelo LLM por defecto: {settings.openrouter_model}")
    logger.info("=======================================================")
    yield
    logger.info("PaperLab Backend apagándose de forma ordenada.")


app = FastAPI(
    title="PaperLab WebAR — Analysis API",
    description=(
        "Backend de visión e IA estructurada para PaperLab. Recibe fotografías de trazos manuscritos "
        "en cuadernos y devuelve especificaciones JSON estructuradas para el simulador WebAR (Física, "
        "Circuitos, Diagramas de Flujo y Geometría/Matemáticas)."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configuración de CORS para permitir consumo desde navegador móvil / Vite WebAR
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Manejador global para excepciones de dominio no capturadas
@app.exception_handler(DomainError)
async def domain_exception_handler(request: Request, exc: DomainError):
    logger.warning(f"Excepción de dominio capturada en '{request.url.path}': {exc.message}")
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "error": exc.__class__.__name__,
            "message": exc.message,
            "details": exc.details,
        },
    )


# Montaje de routers de los módulos
app.include_router(analysis_router)


@app.get("/health", tags=["Salud & Monitoreo"])
async def health_check() -> Dict[str, Any]:
    """Comprueba el estado del backend y la configuración básica."""
    settings = get_settings()
    has_api_key = bool(settings.openrouter_api_key and "tu-key-aqui" not in settings.openrouter_api_key)
    return {
        "status": "ok",
        "service": "PaperLab WebAR Analysis Backend",
        "version": "1.0.0",
        "llm_model": settings.openrouter_model,
        "api_key_configured": has_api_key,
        "confidence_threshold": settings.confidence_threshold,
    }


@app.get("/skills", tags=["Catálogo de Habilidades"])
async def get_skills_catalog() -> Dict[str, Any]:
    """Retorna la lista de los 4 módulos disponibles y los 23 tipos de ejercicios del contrato."""
    skills_data = list_available_skills()
    total_types = sum(s["total_exercise_types"] for s in skills_data)
    return {
        "total_skills": len(skills_data),
        "total_exercise_types": total_types,
        "skills": skills_data,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

