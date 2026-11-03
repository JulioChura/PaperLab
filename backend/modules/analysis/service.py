"""Servicio de orquestación del análisis (Estación 2: El Director)."""

import io
from typing import Any, Tuple
from PIL import Image, ImageOps

from config import Settings
from modules.analysis.domain.skills import get_skill
from modules.analysis.domain.skills.base import Skill
from modules.analysis.ports.llm import LLMClient
from shared.errors import (
    ConfidenceThresholdError,
    ContractValidationError,
    ImageProcessingError,
    ImageValidationError,
)
from shared.logging import logger
from shared.types import BaseAnalysisResult, SkillId


class AnalysisService:
    """Orquesta el flujo completo de análisis: preproceso -> LLM -> validación -> reintento."""

    def __init__(self, llm_client: LLMClient, settings: Settings):
        self.llm_client = llm_client
        self.settings = settings

    def preprocess_image(self, raw_bytes: bytes) -> Tuple[bytes, str]:
        """Aplica preprocesamiento mínimo: validación de tamaño, corrección EXIF y reescalado suave."""
        max_bytes = self.settings.max_image_size_mb * 1024 * 1024
        if len(raw_bytes) > max_bytes:
            raise ImageValidationError(
                f"La imagen pesa {len(raw_bytes) / (1024*1024):.1f} MB, superando el límite de {self.settings.max_image_size_mb} MB."
            )

        try:
            image = Image.open(io.BytesIO(raw_bytes))
            # Corregir orientación según metadata EXIF del móvil
            image = ImageOps.exif_transpose(image)

            # Convertir a RGB si viene en RGBA o escala de grises
            if image.mode not in ("RGB", "L"):
                image = image.convert("RGB")
            elif image.mode == "L":
                image = image.convert("RGB")

            # Redimensionar suavemente si excede 1600px de lado manteniendo aspecto
            max_dimension = 1600
            w, h = image.size
            if max(w, h) > max_dimension:
                image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
                logger.info(f"Imagen redimensionada de ({w}, {h}) a ({image.width}, {image.height}).")

            # Guardar en buffer optimizado como JPEG de alta fidelidad
            output_buffer = io.BytesIO()
            image.save(output_buffer, format="JPEG", quality=90, optimize=True)
            output_bytes = output_buffer.getvalue()
            return output_bytes, "image/jpeg"

        except ImageValidationError:
            raise
        except Exception as exc:
            logger.error(f"Falla al preprocesar la imagen: {exc}")
            raise ImageProcessingError(f"No se pudo decodificar o normalizar la imagen: {exc}")

    async def analyze_drawing(
        self,
        raw_skill_id: str | SkillId,
        image_bytes: bytes,
        extra_instructions: str = "",
    ) -> Any:
        """Flujo orquestado principal para procesar una foto de dibujo manuscrito."""
        # 1. Cargar el especialista (Skill)
        skill: Skill = get_skill(raw_skill_id)
        logger.info(f"Cargado especialista: '{skill.name}' (ID: {skill.skill_id.value}).")

        # 2. Preprocesar imagen
        processed_bytes, mime_type = self.preprocess_image(image_bytes)

        # 3. Preparar prompt
        system_prompt = skill.prompt
        user_prompt = (
            "Analiza detalladamente la foto del dibujo manuscrito sobre el papel escolar/universitario. "
            "Clasifica con exactitud el tipo de ejercicio entre los disponibles en tu catálogo, "
            "extrae todos los textos y anotaciones manuscritas con OCR, deduce los parámetros numéricos y físicos, "
            "y calcula las coordenadas de bounding boxes (0.0 a 1.0) para anclar el holograma WebAR."
        )
        if extra_instructions.strip():
            user_prompt += f"\n\nContexto o instrucción adicional del usuario: {extra_instructions.strip()}"

        # 4. Invocación al LLM con bucle de reintento ante fallos de validación determinística
        retries_left = self.settings.max_retries
        last_violations: list[str] = []

        while True:
            try:
                # Llamada al puerto LLM
                result = await self.llm_client.analyze_image_with_schema(
                    image_bytes=processed_bytes,
                    mime_type=mime_type,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    schema=skill.schema,
                )

                # 5. Validación de umbral de confianza
                confidence = getattr(result, "confidence", 1.0)
                threshold = skill.confidence_threshold or self.settings.confidence_threshold
                if confidence < threshold:
                    exercise_type = getattr(result, "exercise_type", "desconocido")
                    logger.warning(
                        f"Confianza baja detectada: {confidence:.2f} < {threshold:.2f} en '{exercise_type}'."
                    )
                    raise ConfidenceThresholdError(
                        confidence=confidence,
                        threshold=threshold,
                        exercise_type=exercise_type,
                    )

                # 6. Validación determinística de restricciones del dominio
                violations = skill.validate_deterministic(result)
                if not violations:
                    logger.info(
                        f"Análisis exitoso para '{skill.skill_id.value}' -> tipo '{getattr(result, 'exercise_type', '')}' "
                        f"(Confianza: {confidence:.2f})."
                    )
                    return result

                last_violations = violations
                logger.warning(f"Inconsistencias detectadas en la respuesta: {violations}")

                if retries_left > 0:
                    retries_left -= 1
                    logger.info(f"Reintentando análisis con feedback correctivo ({retries_left} reintentos restantes)...")
                    user_prompt += (
                        f"\n\n[ATENCIÓN - CORRECCIÓN OBLIGATORIA]: El análisis anterior generó inconsistencias: "
                        f"{'; '.join(violations)}. Por favor revisa con cuidado el dibujo y ajusta los valores numéricos."
                    )
                    continue

                # Si no quedan reintentos y siguen habiendo violaciones
                raise ContractValidationError(violations=last_violations, raw_data=result.model_dump())

            except (ConfidenceThresholdError, ContractValidationError):
                raise
            except Exception as exc:
                if retries_left > 0:
                    retries_left -= 1
                    logger.warning(f"Error recuperable durante análisis LLM ({exc}). Reintentando una vez...")
                    continue
                raise

