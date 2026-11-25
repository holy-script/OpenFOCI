"""
Lightweight Zero-Dependency Web Server & Real-Time SSE Streamer.
Serves the Mind Orb visualizer and provides REST + Server-Sent Events (SSE) endpoints.
"""

import os
import json
import time
import socket
from pathlib import Path
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from typing import Optional, Dict, Any
from openfoci.storage.base import BaseStorage

WEB_DIR = Path(__file__).resolve().parent.parent / "web"

class FociHttpHandler(BaseHTTPRequestHandler):
    storage: Optional[BaseStorage] = None
    latest_snapshot: Dict[str, Any] = {}

    def log_message(self, format, *args):
        # Suppress noisy access logging
        pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        url = self.path.split("?")[0]

        if url in ["/", "/index.html"]:
            self._serve_file(WEB_DIR / "index.html", "text/html; charset=utf-8")
        elif url == "/styles.css":
            self._serve_file(WEB_DIR / "styles.css", "text/css; charset=utf-8")
        elif url == "/app.js":
            self._serve_file(WEB_DIR / "app.js", "application/javascript; charset=utf-8")
        elif url == "/api/telemetry":
            self._serve_json(self._get_current_snapshot())
        elif url == "/api/history":
            history = self.storage.get_history(50) if self.storage else []
            self._serve_json({"success": True, "count": len(history), "history": history})
        elif url == "/api/stream":
            self._serve_sse_stream()
        else:
            self.send_error(404, "File Not Found")

    def _get_current_snapshot(self) -> Dict[str, Any]:
        if FociHttpHandler.latest_snapshot:
            return FociHttpHandler.latest_snapshot
        if self.storage:
            latest = self.storage.get_latest()
            if latest:
                return latest
        return {
            "deviceId": "openfoci-virtual",
            "deviceName": "FOCI Visualizer",
            "isConnected": True,
            "isWorn": True,
            "batteryLevel": 88,
            "mentalState": "focus",
            "mentalStateConfidence": 0.85,
            "breath": {
                "respirationRate": 13.8,
                "breathWaveAmplitude": 0.7,
                "fluidity": 88,
                "diaphragmaticDepth": 75,
                "breathWaveSamples": [0.1, 0.4, 0.8, 0.6, 0.2, -0.3, -0.6, -0.2],
            },
            "scores": {
                "calmScore": 80,
                "focusScore": 85,
                "vitalityScore": 1.2,
                "recoveryScore": 85,
            },
        }

    def _serve_file(self, path: Path, content_type: str):
        if not path.exists():
            self.send_error(404, "Asset Not Found")
            return
        data = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def _serve_json(self, data: Any):
        payload = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _serve_sse_stream(self):
        """Streams live telemetry packets via Server-Sent Events (SSE)."""
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        try:
            while True:
                snapshot = self._get_current_snapshot()
                event_data = f"data: {json.dumps(snapshot)}\n\n"
                self.wfile.write(event_data.encode("utf-8"))
                self.wfile.flush()
                time.sleep(0.5)
        except (BrokenPipeError, ConnectionResetError):
            pass

def run_web_server(storage: Optional[BaseStorage] = None, host: str = "0.0.0.0", port: int = 8080) -> ThreadingHTTPServer:
    """Launches the threaded OpenFOCI Web & SSE Server."""
    FociHttpHandler.storage = storage
    server = ThreadingHTTPServer((host, port), FociHttpHandler)
    return server
