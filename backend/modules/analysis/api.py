"""Capa de entrada HTTP para el módulo de Análisis (Estación 1: La Puerta)."""

from typing import Annotated, Any, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Path, UploadFile, status

from config import Settings, get_settings
from modules.analysis.adapters.gemini_direct import GeminiDirectLLMAdapter
from modules.analysis.ports.llm import LLMClient
from modules.analysis.service import AnalysisService
from shared.errors import (
    ConfidenceThresholdError,
    ContractValidationError,
    DomainError,
    ImageProcessingError,
    ImageValidationError,
    LLMAnalysisError,
    SkillNotFoundError,
)
from shared.logging import logger

router = APIRouter(prefix="", tags=["Análisis de Trazos WebAR"])


def get_llm_client(settings: Annotated[Settings, Depends(get_settings)]) -> LLMClient:
    """Proveedor del adaptador LLM inyectado (Google Gemini directo)."""
    return GeminiDirectLLMAdapter(
        api_key=settings.gemini_api_key,
        model_name=settings.gemini_model,
        fallback_models=[m.strip() for m in settings.gemini_fallback_models.split(",") if m.strip()],
        timeout_seconds=settings.llm_timeout_seconds,
    )


def get_analysis_service(
    llm_client: Annotated[LLMClient, Depends(get_llm_client)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AnalysisService:
    """Proveedor del servicio orquestador de análisis."""
    return AnalysisService(llm_client=llm_client, settings=settings)


@router.post(
    "/analyze/{skill}",
    summary="Analiza un dibujo manuscrito según el módulo científico",
    response_description="JSON estructurado con los parámetros listos para el simulador WebAR",
)
async def analyze_drawing_endpoint(
    skill: Annotated[
        str,
        Path(
            description="Módulo científico a analizar ('physics', 'circuit', 'flowchart', 'math_geo' o alias)"
        ),
    ],
    file: Annotated[
        UploadFile,
        File(description="Fotografía o escaneo del trazo manuscrito en el cuaderno (JPEG, PNG, WebP)"),
    ],
    notes: Annotated[
        Optional[str],
        Form(description="Anotaciones u orientaciones adicionales opcionales"),
    ] = None,
    service: AnalysisService = Depends(get_analysis_service),
) -> Any:
    """Recibe la foto de un dibujo hecho a mano y devuelve el JSON con los parámetros del experimento.

    - **physics**: Plano inclinado, péndulo, proyectiles, masa-resorte, cinemática, poleas Atwood.
    - **circuit**: Malla única, resistencias serie/paralelo, interruptor, circuito RC, compuertas lógicas.
    - **flowchart**: Diagramas secuenciales, condicionales, bucles, debugger paso a paso, traza, recursión.
    - **math_geo**: Estereometría 3D, geometría analítica, gráficas f(x), solver de ecuaciones, ángulos.
    """
    logger.info(f"Petición POST /analyze/{skill} recibida con archivo '{file.filename}'.")

    # Validar tipo de contenido básico
    content_type = file.content_type or ""
    if not any(content_type.startswith(prefix) for prefix in ("image/", "application/octet-stream")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de archivo no soportado ({content_type}). Por favor envía una imagen (JPEG, PNG).",
        )

    try:
        raw_bytes = await file.read()
        if not raw_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El archivo subido está vacío.",
            )

        result = await service.analyze_drawing(
            raw_skill_id=skill,
            image_bytes=raw_bytes,
            extra_instructions=notes or "",
        )
        return result

    except HTTPException:
        raise
    except SkillNotFoundError as err:
        logger.warning(f"Skill desconocido solicitado: {err.message}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "SkillNotFound",
                "message": err.message,
                "details": err.details,
            },
        )
    except (ImageValidationError, ImageProcessingError) as err:
        logger.warning(f"Error de procesamiento de imagen: {err.message}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "ImageError",
                "message": err.message,
                "details": err.details,
            },
        )
    except ConfidenceThresholdError as err:
        logger.warning(f"Certeza insuficiente: {err.message}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "LowConfidence",
                "message": err.message,
                "details": err.details,
            },
        )
    except ContractValidationError as err:
        logger.warning(f"Contrato violado: {err.message}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": "ContractViolation",
                "message": err.message,
                "details": err.details,
            },
        )
    except LLMAnalysisError as err:
        logger.error(f"Falla del proveedor LLM: {err.message}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "LLMProviderError",
                "message": err.message,
                "details": err.details,
            },
        )
    except Exception as exc:
        logger.error(f"Error no controlado en endpoint: {exc}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "InternalServerError",
                "message": "Ocurrió un error inesperado al procesar la solicitud.",
            },
        )
