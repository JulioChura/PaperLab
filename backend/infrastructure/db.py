"""# TODO: future module - Adaptador de Base de Datos compartida (PostgreSQL / SQLite / Supabase)."""

from typing import Any, Optional


class DatabaseClient:
    """Stub de infraestructura para persistencia de datos."""

    def __init__(self, connection_url: Optional[str] = None):
        self.connection_url = connection_url
        self._connected = False

    async def connect(self) -> None:
        """Conexión asíncrona a la base de datos (Stub)."""
        self._connected = True

    async def disconnect(self) -> None:
        """Cierre de conexiones (Stub)."""
        self._connected = False

    async def execute(self, query: str, *params: Any) -> Any:
        """Ejecuta una consulta SQL simulada."""
        return None

