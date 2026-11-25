"""
Abstract Base Storage Class for OpenFOCI Telemetry.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List

class BaseStorage(ABC):
    @abstractmethod
    def save(self, snapshot: Dict[str, Any]) -> None:
        """Persists a biometric telemetry snapshot."""
        pass

    @abstractmethod
    def get_latest(self) -> Optional[Dict[str, Any]]:
        """Retrieves the latest available telemetry snapshot."""
        pass

    @abstractmethod
    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves a historical list of telemetry records."""
        pass

    def close(self) -> None:
        """Cleans up resources if necessary."""
        pass
