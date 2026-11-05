"""Configuración global de la aplicación mediante Pydantic Settings."""

from functools import lru_cache
from pathlib import Path
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Ajustes de entorno para PaperLab Backend."""

    gemini_api_key: str = Field(
        default="",
        alias="GEMINI_API_KEY",
        description="API Key directa de Google Gemini",
    )
    gemini_model: str = Field(
        default="gemini-3.8-flash",
        alias="GEMINI_MODEL",
        description="Modelo de Google Gemini para conexión directa",
    )
    gemini_fallback_models: str = Field(
        default="gemini-3.5-flash,gemini-3.5-flash-lite",
        alias="GEMINI_FALLBACK_MODELS",
        description="Modelos alternativos (separados por coma) si el principal está saturado o no disponible",
    )
    confidence_threshold: float = Field(
        default=0.8,
        alias="CONFIDENCE_THRESHOLD",
        description="Umbral mínimo de certeza en la detección",
    )
    max_image_size_mb: int = Field(
        default=10,
        alias="MAX_IMAGE_SIZE_MB",
        description="Tamaño máximo de archivo en MB",
    )
    llm_timeout_seconds: int = Field(
        default=30,
        alias="LLM_TIMEOUT_SECONDS",
        description="Límite de tiempo para la respuesta del modelo en segundos",
    )
    max_retries: int = Field(
        default=1,
        alias="MAX_RETRIES",
        description="Reintentos ante fallas de validación de contrato",
    )
    cors_origins: Union[str, List[str]] = Field(
        default=["http://localhost:5173", "http://127.0.0.1:5173"],
        alias="CORS_ORIGINS",
        description="Lista de dominios autorizados para solicitudes CORS",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Union[str, List[str]]) -> List[str]:
        if isinstance(value, str):
            if value.strip() == "*":
                return ["*"]
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Devuelve la instancia en caché de la configuración del sistema."""
    return Settings()

