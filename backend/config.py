"""Configuración global de la aplicación mediante Pydantic Settings."""

import os
from functools import lru_cache
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Ajustes de entorno para PaperLab Backend."""

    llm_provider: str = Field(
        default="auto",
        alias="LLM_PROVIDER",
        description="Proveedor LLM: 'gemini', 'openrouter' o 'auto'",
    )
    gemini_api_key: str = Field(
        default="",
        alias="GEMINI_API_KEY",
        description="API Key directa de Google Gemini",
    )
    gemini_model: str = Field(
        default="gemini-2.5-flash",
        alias="GEMINI_MODEL",
        description="Modelo de Google Gemini para conexión directa",
    )
    openrouter_api_key: str = Field(
        default="",
        alias="OPENROUTER_API_KEY",
        description="API Key para el servicio de OpenRouter",
    )
    openrouter_model: str = Field(
        default="google/gemini-2.5-flash",
        alias="OPENROUTER_MODEL",
        description="Modelo multivariante de visión para estructuración de datos",
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
        default=["*"],
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
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Devuelve la instancia en caché de la configuración del sistema."""
    return Settings()

