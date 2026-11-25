"""
Atomic JSON File Storage Provider.
Persists telemetry snapshots to disk with atomic write and replace to prevent corruption.
"""

import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from openfoci.storage.base import BaseStorage

class JsonStorage(BaseStorage):
    def __init__(self, filepath: str = "foci_telemetry.json"):
        self.filepath = Path(filepath).resolve()
        self.filepath.parent.mkdir(parents=True, exist_ok=True)
        self.tmp_path = self.filepath.with_suffix(".json.tmp")

    def save(self, snapshot: Dict[str, Any]) -> None:
        try:
            with open(self.tmp_path, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, indent=2)
            self.tmp_path.replace(self.filepath)
        except Exception as e:
            pass

    def get_latest(self) -> Optional[Dict[str, Any]]:
        if not self.filepath.exists():
            return None
        try:
            with open(self.filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return None

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        latest = self.get_latest()
        return [latest] if latest else []
