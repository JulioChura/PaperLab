"""Adaptador nativo de Google Gemini mediante el SDK oficial google-genai."""

import asyncio
import json
from typing import Any, TypeVar
from pydantic import BaseModel, ValidationError

from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from modules.analysis.ports.llm import LLMClient
from shared.errors import LLMAnalysisError
from shared.logging import logger

T = TypeVar("T", bound=BaseModel)


class GeminiDirectLLMAdapter(LLMClient):
    """Implementación de LLMClient que conecta directamente con la API de Google Gemini."""

    def __init__(
        self,
        api_key: str,
        model_name: str = "gemini-3.8-flash",
        timeout_seconds: int = 60,
        fallback_models: list[str] | None = None,
    ):
        self.api_key = api_key.strip()
        if model_name.startswith("google/"):
            model_name = model_name.removeprefix("google/")
        self.model_name = model_name
        self.fallback_models = [m.removeprefix("google/") for m in (fallback_models or []) if m != model_name]
        self.timeout_seconds = timeout_seconds
        self._client: genai.Client | None = None

    def _get_client(self) -> genai.Client:
        if not self.api_key or "tu_api_key" in self.api_key:
            raise LLMAnalysisError("GEMINI_API_KEY no configurada o inválida.")

        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)
            logger.info(f"Cliente nativo de Google Gemini inicializado con modelo '{self.model_name}'.")

        return self._client

    async def analyze_image_with_schema(
        self,
        image_bytes: bytes,
        mime_type: str,
        system_prompt: str,
        user_prompt: str,
        schema: type[T],
    ) -> T:
        """Llamada asíncrona directa a Gemini con schema estructurado estricto."""
        client = self._get_client()

        logger.info(f"Invocando Google Gemini directo ({self.model_name}) para schema '{schema.__name__}'...")

        try:
            # Obtener el JSON schema canónico de Pydantic
            schema_json = json.dumps(schema.model_json_schema(), ensure_ascii=False, indent=2)

            full_prompt = (
                f"{system_prompt}\n\n"
                f"{user_prompt}\n\n"
                "INSTRUCCIÓN DE FORMATO OBLIGATORIA:\n"
                "Debes devolver ÚNICAMENTE un objeto JSON válido que cumpla estrictamente con la siguiente especificación JSON Schema de Pydantic:\n"
                f"```json\n{schema_json}\n```\n"
                "No agregues texto explicativo fuera del JSON."
            )

            image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            contents = [image_part, full_prompt]

            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            )

            response = await self._generate_with_fallback(client, contents, config)

            raw_text = response.text
            if not raw_text:
                raise LLMAnalysisError("Gemini devolvió una respuesta vacía.")

            # Limpiar etiquetas markdown si vinieran incluidas
            cleaned = raw_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned.removeprefix("```json").removesuffix("```").strip()
            elif cleaned.startswith("```"):
                cleaned = cleaned.removeprefix("```").removesuffix("```").strip()

            # Validar y convertir directamente con Pydantic v2
            return schema.model_validate_json(cleaned)

        except asyncio.TimeoutError:
            logger.error(f"Timeout ({self.timeout_seconds}s) alcanzado esperando respuesta directa de Gemini.")
            raise LLMAnalysisError(
                f"La llamada directa a Gemini excedió el límite de {self.timeout_seconds}s."
            )
        except ValidationError as val_err:
            logger.error(f"Error de validación Pydantic con la salida directa de Gemini: {val_err}")
            raise LLMAnalysisError(f"Estructura devuelta por Gemini incompatible: {val_err}")
        except LLMAnalysisError:
            raise
        except Exception as exc:
            logger.error(f"Excepción inesperada en llamada directa a Gemini: {exc}", exc_info=True)
            raise LLMAnalysisError(f"Error devuelto por Gemini API: {str(exc)}")

    async def _generate_with_fallback(self, client: genai.Client, contents: list[Any], config: Any) -> Any:
        """Llama al modelo principal y, si está saturado o no disponible, prueba los alternativos."""
        models = [self.model_name, *self.fallback_models]
        last_exc: Exception | None = None
        for index, model in enumerate(models):
            try:
                return await asyncio.wait_for(
                    client.aio.models.generate_content(model=model, contents=contents, config=config),
                    timeout=float(self.timeout_seconds),
                )
            except asyncio.TimeoutError as exc:
                last_exc = exc
                if index == len(models) - 1:
                    raise
                logger.warning(f"Modelo '{model}' excedió {self.timeout_seconds}s. Probando '{models[index + 1]}'...")
            except genai_errors.APIError as exc:
                last_exc = exc
                retriable = exc.code in (404, 429, 500, 503)
                if not retriable or index == len(models) - 1:
                    raise
                logger.warning(f"Modelo '{model}' no disponible ({exc.code}). Probando '{models[index + 1]}'...")
        raise last_exc  # pragma: no cover

