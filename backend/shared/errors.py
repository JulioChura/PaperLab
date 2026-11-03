"""Excepciones de dominio y del sistema para PaperLab WebAR."""

from typing import Any, Optional


class DomainError(Exception):
    """Excepción raíz para todas las fallas controladas de la lógica de negocio."""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class SkillNotFoundError(DomainError):
    """Lanzada cuando se solicita un skill no registrado o desconocido."""

    def __init__(self, skill_id: str):
        super().__init__(
            message=f"El skill '{skill_id}' no está registrado en el catálogo.",
            details={"requested_skill": skill_id},
        )


class ImageValidationError(DomainError):
    """Lanzada cuando la imagen no cumple con requisitos de tamaño o formato."""

    def __init__(self, reason: str, details: Optional[Any] = None):
        super().__init__(message=f"Validación de imagen fallida: {reason}", details=details)


class ImageProcessingError(DomainError):
    """Lanzada cuando falla el preprocesamiento o lectura con Pillow."""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=f"Error al procesar la imagen: {message}", details=details)


class LLMAnalysisError(DomainError):
    """Lanzada cuando el proveedor LLM falla, responde fuera de tiempo o rechaza la llamada."""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message=f"Falla en el proveedor de IA: {message}", details=details)


class ConfidenceThresholdError(DomainError):
    """Lanzada cuando el modelo devuelve una certeza menor al umbral requerido."""

    def __init__(self, confidence: float, threshold: float, exercise_type: str):
        super().__init__(
            message=(
                f"El nivel de confianza ({confidence:.2f}) para '{exercise_type}' es inferior "
                f"al umbral mínimo requerido ({threshold:.2f}). Se recomienda mejorar la iluminación o claridad del trazo."
            ),
            details={
                "detected_confidence": confidence,
                "required_threshold": threshold,
                "exercise_type": exercise_type,
            },
        )


class ContractValidationError(DomainError):
    """Lanzada cuando los datos devueltos violan las reglas físicas/matemáticas determinísticas."""

    def __init__(self, violations: list[str], raw_data: Optional[Any] = None):
        violations_str = "; ".join(violations)
        super().__init__(
            message=f"El esquema no satisface las restricciones determinísticas: {violations_str}",
            details={"violations": violations, "raw_data": raw_data},
        )

