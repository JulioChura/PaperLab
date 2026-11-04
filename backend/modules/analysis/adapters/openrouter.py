"""Adaptador de OpenRouter para análisis visual y salida estructurada mediante LangChain."""

import asyncio
import base64
import json
from typing import Any, Optional, TypeVar
from pydantic import BaseModel, ValidationError

from langchain_core.messages import HumanMessage, SystemMessage
from modules.analysis.ports.llm import LLMClient
from shared.errors import LLMAnalysisError
from shared.logging import logger

T = TypeVar("T", bound=BaseModel)


class OpenRouterLLMAdapter(LLMClient):
    """Implementación del puerto LLMClient utilizando langchain-openrouter."""

    def __init__(
        self,
        api_key: str,
        model_name: str = "google/gemini-2.5-flash",
        timeout_seconds: int = 30,
    ):
        self.api_key = api_key.strip()
        self.model_name = model_name.strip()
        self.timeout_seconds = timeout_seconds
        self._llm: Optional[Any] = None

    def _get_llm(self) -> Any:
        """Inicializa de manera perezosa el cliente de ChatOpenRouter."""
        if not self.api_key or "tu-key-aqui" in self.api_key:
            raise LLMAnalysisError(
                "OPENROUTER_API_KEY no configurada. Por favor establece una clave válida en el archivo backend/.env"
            )

        if self._llm is None:
            try:
                from langchain_openrouter import ChatOpenRouter
                self._llm = ChatOpenRouter(
                    model=self.model_name,
                    api_key=self.api_key,
                    timeout=self.timeout_seconds,
                    temperature=0.1,
                )
                logger.info(f"Cliente ChatOpenRouter inicializado con modelo '{self.model_name}'.")
            except Exception as exc:
                logger.error(f"Error al inicializar ChatOpenRouter: {exc}")
                raise LLMAnalysisError(f"No se pudo inicializar ChatOpenRouter: {exc}")

        return self._llm

    async def analyze_image_with_schema(
        self,
        image_bytes: bytes,
        mime_type: str,
        system_prompt: str,
        user_prompt: str,
        schema: type[T],
    ) -> T:
        """Envía imagen codificada en base64 con schema estructurado a OpenRouter."""
        llm = self._get_llm()
        b64_image = base64.b64encode(image_bytes).decode("utf-8")
        image_data_url = f"data:{mime_type};base64,{b64_image}"

        # Preparación de mensajes multimodales
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(
                content=[
                    {"type": "text", "text": user_prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_data_url},
                    },
                ]
            ),
        ]

        logger.info(f"Invocando LLM ({self.model_name}) para schema '{schema.__name__}'...")

        try:
            # Crear Runnable estructurado para el esquema Pydantic
            structured_chain = llm.with_structured_output(schema)

            # Invocación asíncrona protegida con timeout
            result = await asyncio.wait_for(
                structured_chain.ainvoke(messages),
                timeout=float(self.timeout_seconds),
            )

            # Si el resultado ya es una instancia del esquema
            if isinstance(result, schema):
                return result

            # Si devuelve dict, validarlo con Pydantic v2
            if isinstance(result, dict):
                return schema.model_validate(result)

            # Si devuelve string JSON
            if isinstance(result, str):
                return schema.model_validate_json(result)

            # Si tiene propiedad parsed (algunos adaptadores OpenAI)
            if hasattr(result, "parsed") and isinstance(result.parsed, schema):
                return result.parsed

            # Si el contenido está en result.content
            if hasattr(result, "content") and isinstance(result.content, str):
                cleaned_content = result.content.strip()
                if cleaned_content.startswith("```json"):
                    cleaned_content = cleaned_content.removeprefix("```json").removesuffix("```").strip()
                elif cleaned_content.startswith("```"):
                    cleaned_content = cleaned_content.removeprefix("```").removesuffix("```").strip()
                parsed_json = json.loads(cleaned_content)
                return schema.model_validate(parsed_json)

            raise LLMAnalysisError(
                f"El modelo no retornó una respuesta estructurada compatible con {schema.__name__}. Tipo recibido: {type(result)}"
            )

        except asyncio.TimeoutError:
            logger.error(f"Timeout ({self.timeout_seconds}s) alcanzado esperando respuesta del LLM.")
            raise LLMAnalysisError(
                f"La llamada al LLM excedió el límite de {self.timeout_seconds} segundos. Verifica tu conexión o reintenta."
            )
        except ValidationError as val_err:
            logger.error(f"Error de validación Pydantic con la salida del LLM: {val_err}")
            raise LLMAnalysisError(f"Estructura devuelta por el modelo incompatible: {val_err}")
        except LLMAnalysisError:
            raise
        except Exception as exc:
            logger.error(f"Excepción inesperada durante análisis LLM: {exc}", exc_info=True)
            raise LLMAnalysisError(f"Error devuelto por OpenRouter: {str(exc)}")

