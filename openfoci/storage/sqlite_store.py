"""
SQLite Relational Storage Provider for OpenFOCI.
Stores indexed telemetry snapshots and computes session aggregates.
"""

import json
import sqlite3
from pathlib import Path
from typing import Dict, Any, Optional, List
from openfoci.storage.base import BaseStorage

class SqliteStorage(BaseStorage):
    def __init__(self, db_path: str = "openfoci.db"):
        self.db_path = Path(db_path).resolve()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS telemetry (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    device_id TEXT NOT NULL,
                    device_name TEXT,
                    is_connected INTEGER,
                    is_worn INTEGER,
                    mental_state TEXT,
                    respiration_rate REAL,
                    fluidity INTEGER,
                    diaphragmatic_depth INTEGER,
                    battery_level INTEGER,
                    vitality_score REAL,
                    recovery_score INTEGER,
                    raw_json TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry(timestamp DESC)")
            conn.commit()

    def save(self, snapshot: Dict[str, Any]) -> None:
        ts = snapshot.get("timestamp", "")
        dev_id = snapshot.get("deviceId", "")
        dev_name = snapshot.get("deviceName", "")
        conn_int = 1 if snapshot.get("isConnected") else 0
        worn_int = 1 if snapshot.get("isWorn") else 0
        st = snapshot.get("mentalState", "unknown")
        
        breath = snapshot.get("breath", {})
        bpm = float(breath.get("respirationRate", 14.0))
        fluidity = int(breath.get("fluidity", 85))
        depth = int(breath.get("diaphragmaticDepth", 70))
        
        batt = int(snapshot.get("batteryLevel", 88))
        scores = snapshot.get("scores", {})
        vitality = float(scores.get("vitalityScore", 0.0))
        recovery = int(scores.get("recoveryScore", 85))

        raw = json.dumps(snapshot)

        with self._get_connection() as conn:
            conn.execute("""
                INSERT INTO telemetry (
                    timestamp, device_id, device_name, is_connected, is_worn,
                    mental_state, respiration_rate, fluidity, diaphragmatic_depth,
                    battery_level, vitality_score, recovery_score, raw_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (ts, dev_id, dev_name, conn_int, worn_int, st, bpm, fluidity, depth, batt, vitality, recovery, raw))
            conn.commit()

    def get_latest(self) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.execute("SELECT raw_json FROM telemetry ORDER BY id DESC LIMIT 1")
            row = cur.fetchone()
            if row and row["raw_json"]:
                return json.loads(row["raw_json"])
        return None

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        records = []
        with self._get_connection() as conn:
            cur = conn.execute("SELECT raw_json FROM telemetry ORDER BY id DESC LIMIT ?", (limit,))
            for row in cur.fetchall():
                if row["raw_json"]:
                    records.append(json.loads(row["raw_json"]))
        return records

    def export_to_csv(self, csv_path: str) -> int:
        """Dumps all recorded telemetry rows into a CSV file. Returns count of rows exported."""
        import csv
        with self._get_connection() as conn:
            cur = conn.execute("""
                SELECT timestamp, device_id, mental_state, respiration_rate,
                       fluidity, diaphragmatic_depth, battery_level, vitality_score, recovery_score
                FROM telemetry ORDER BY id ASC
            """)
            rows = cur.fetchall()
            if not rows:
                return 0
            with open(csv_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "timestamp", "device_id", "mental_state", "respiration_rate",
                    "fluidity", "diaphragmatic_depth", "battery_level", "vitality_score", "recovery_score"
                ])
                for r in rows:
                    writer.writerow(list(r))
            return len(rows)
