"""
Unit tests for OpenFOCI storage providers (JSON, SQLite, CSV).
"""

import os
import json
import tempfile
import pytest
from openfoci.storage.json_store import JsonStorage
from openfoci.storage.sqlite_store import SqliteStorage
from openfoci.storage.csv_store import CsvStorage

MOCK_SNAPSHOT = {
    "deviceId": "a4:11:63:e0:7e:87",
    "deviceName": "FOCI 78",
    "isConnected": True,
    "isWorn": True,
    "batteryLevel": 90,
    "timestamp": "2026-11-25T12:00:00Z",
    "mentalState": "focus",
    "breath": {
        "respirationRate": 13.5,
        "fluidity": 88,
        "diaphragmaticDepth": 76,
        "breathWaveSamples": [0.1, 0.4, 0.2],
    },
    "scores": {
        "vitalityScore": 1.2,
        "recoveryScore": 86,
    },
}

def test_json_storage():
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tf:
        path = tf.name

    try:
        store = JsonStorage(path)
        store.save(MOCK_SNAPSHOT)

        loaded = store.get_latest()
        assert loaded is not None
        assert loaded["deviceId"] == "a4:11:63:e0:7e:87"
        assert loaded["mentalState"] == "focus"
        assert loaded["breath"]["respirationRate"] == 13.5
    finally:
        if os.path.exists(path):
            os.remove(path)

def test_sqlite_storage():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
        path = tf.name

    try:
        store = SqliteStorage(path)
        store.save(MOCK_SNAPSHOT)
        store.save({**MOCK_SNAPSHOT, "mentalState": "flow", "timestamp": "2026-11-25T12:01:00Z"})

        latest = store.get_latest()
        assert latest is not None
        assert latest["mentalState"] == "flow"

        history = store.get_history(limit=10)
        assert len(history) == 2

        # Export test
        csv_export = path + ".csv"
        count = store.export_to_csv(csv_export)
        assert count == 2
        assert os.path.exists(csv_export)
        if os.path.exists(csv_export):
            os.remove(csv_export)
    finally:
        if os.path.exists(path):
            os.remove(path)

def test_csv_storage():
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False) as tf:
        path = tf.name

    try:
        store = CsvStorage(path)
        store.save(MOCK_SNAPSHOT)
        assert os.path.exists(path)
        lines = open(path).readlines()
        assert len(lines) >= 2
        assert "respiration_rate" in lines[0]
        assert "13.5" in lines[1]
    finally:
        if os.path.exists(path):
            os.remove(path)
