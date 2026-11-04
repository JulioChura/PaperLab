"""Puerto (interfaz) para comunicación con modelos de lenguaje y visión."""

from abc import ABC, abstractmethod
from typing import TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMClient(ABC):
    """Contrato del puerto de integración con LLM para análisis multimodal estructurado."""

    @abstractmethod
    async def analyze_image_with_schema(
        self,
        image_bytes: bytes,
        mime_type: str,
        system_prompt: str,
        user_prompt: str,
        schema: type[T],
    ) -> T:
        """Envía una imagen codificada con prompts de sistema y usuario, retornando un modelo validado.
        
        Args:
            image_bytes: Contenido binario de la foto preprocesada.
            mime_type: Tipo MIME (ej: 'image/jpeg' o 'image/png').
            system_prompt: Instrucciones del especialista.
            user_prompt: Petición o feedback correctivo.
            schema: Clase de Pydantic con el contrato JSON esperado.

        Returns:
            Instancia del esquema T tipado y validado.
        """
        pass

