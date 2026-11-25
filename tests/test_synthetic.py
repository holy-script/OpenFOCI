"""
Unit tests for the OpenFOCI Synthetic Simulation Engine.
"""

import asyncio
from openfoci.client import FociDevice
from openfoci.synthetic import run_synthetic_stream

def test_synthetic_stream_emulation():
    device = FociDevice()
    received_snapshots = []

    def on_telemetry(snap):
        received_snapshots.append(snap)

    async def _runner():
        await run_synthetic_stream(
            device,
            on_telemetry=on_telemetry,
            interval_seconds=0.05,
            duration_seconds=0.3,
        )

    asyncio.run(_runner())

    assert len(received_snapshots) > 0
    snap = received_snapshots[-1]
    assert "deviceId" in snap
    assert "breath" in snap
    assert snap["breath"]["respirationRate"] > 0
    assert len(snap["breath"]["breathWaveSamples"]) > 0
