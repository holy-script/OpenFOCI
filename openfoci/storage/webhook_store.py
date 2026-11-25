"""
Asynchronous HTTP Webhook Forwarder.
Pushes telemetry snapshots to custom web endpoints, dashboards, or automation platforms.
"""

import json
import threading
import urllib.request
from typing import Dict, Any, Optional, List
from openfoci.storage.base import BaseStorage

class WebhookStorage(BaseStorage):
    def __init__(self, url: str, timeout: float = 3.0):
        self.url = url
        self.timeout = timeout
        self.last_snapshot: Optional[Dict[str, Any]] = None

    def save(self, snapshot: Dict[str, Any]) -> None:
        self.last_snapshot = snapshot
        payload = json.dumps(snapshot).encode("utf-8")

        def _post():
            try:
                req = urllib.request.Request(
                    self.url,
                    data=payload,
                    headers={"Content-Type": "application/json", "User-Agent": "OpenFOCI-Agent/0.1.0"},
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    pass
            except Exception:
                pass

        threading.Thread(target=_post, daemon=True).start()

    def get_latest(self) -> Optional[Dict[str, Any]]:
        return self.last_snapshot

    def get_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        return [self.last_snapshot] if self.last_snapshot else []
