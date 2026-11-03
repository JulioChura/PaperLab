"""Configuración centralizada de logging para el backend."""

import logging
import sys


def setup_logging(level: str = "INFO") -> logging.Logger:
    """Configura el logger unificado para la aplicación."""
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    
    logger = logging.getLogger("paperlab")
    if not logger.handlers:
        logger.setLevel(numeric_level)
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            fmt="[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.propagate = False

    return logger


logger = setup_logging()

