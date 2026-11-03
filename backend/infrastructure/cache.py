"""# TODO: future module - Adaptador de Cache (Redis / In-memory)."""

from typing import Any, Optional


class CacheClient:
    """Stub de infraestructura para almacenamiento temporal en memoria o Redis."""

    def __init__(self):
        self._store: dict[str, Any] = {}

    async def get(self, key: str) -> Optional[Any]:
        """Obtiene un valor cacheado."""
        return self._store.get(key)

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        """Guarda un valor en la caché."""
        self._store[key] = value

    async def delete(self, key: str) -> None:
        """Elimina una clave de la caché."""
        self._store.pop(key, None)

