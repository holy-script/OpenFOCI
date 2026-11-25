"""
Continuous CSV Telemetry Logger for Data Science & Signal Processing.
"""

import csv
from pathlib import Path
from typing import Dict, Any, Optional, List
from openfoci.storage.base import BaseStorage

class CsvStorage(BaseStorage):
    def __init__(self, filepath: str = "openfoci_stream.csv"):
        self.filepath = Path(filepath).resolve()
        self.filepath.parent.mkdir(parents=True, exist_ok=True)
        self._init_file()

    def _init_file(self) -> None:
        if not self.filepath.exists() or self.filepath.stat().st_size == 0:
            with open(self.filepath, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "timestamp", "device_id", "mental_state", "respiration_rate",
                    "fluidity", "diaphragmatic_depth", "battery_level", "vitality_score"
                ])

    def save(self, snapshot: Dict[str, Any]) -> None:
        ts = snapshot.get("timestamp", "")
        dev_id = snapshot.get("deviceId", "")
        st = snapshot.get("mentalState", "unknown")
        breath = snapshot.get("breath", {})
        bpm = breath.get("respirationRate", 14.0)
        fluidity = breath.get("fluidity", 85)
        depth = breath.get("diaphragmaticDepth", 70)
        batt = snapshot.get("batteryLevel", 88)
        vitality = snapshot.get("scores", {}).get("vitalityScore", 0.0)

        with open(self.filepath, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([ts, dev_id, st, bpm, fluidity, depth, batt, vitality])

    def get_latest(self) -> Optional[Dict[str, Any]]:
        return None

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        return []
