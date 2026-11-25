"""
OpenFOCI Synthetic Simulation Engine.

Emulates a physical FOCI clip by generating realistic 10 Hz diaphragmatic breathing
waveforms, biological micro-tremors, and physiological state transitions (Flow, Focus, Calm, Stress).
Enables zero-hardware CI testing, web UI development, and offline data analysis.
"""

import time
import math
import asyncio
from typing import Optional, Callable, Dict, Any
from openfoci.client import FociDevice

async def run_synthetic_stream(
    device: FociDevice,
    on_telemetry: Optional[Callable[[Dict[str, Any]], None]] = None,
    on_sample: Optional[Callable[[int], None]] = None,
    interval_seconds: float = 0.1,  # 10 Hz
    duration_seconds: Optional[float] = None,
):
    """
    Runs a continuous synthetic biometric stream feeding the FociDevice analyzer.
    """
    device.is_connected = True
    device.is_worn = True
    device.battery_level = 94
    device.battery_mv = 4120
    device.device_name = "FOCI Virtual Clip"

    states_cycle = ["flow", "focus", "calm", "focus", "flow", "calm", "stress"]
    state_idx = 0
    start_time = time.time()
    phase = 0.0

    try:
        while True:
            await asyncio.sleep(interval_seconds)
            now = time.time()
            elapsed = now - start_time

            if duration_seconds and elapsed >= duration_seconds:
                break

            # Transition state every 45 seconds
            state_idx = int(elapsed // 45) % len(states_cycle)
            device.current_mental_state = states_cycle[state_idx]

            # Adjust respiration frequency by state (Flow: 10 bpm, Focus: 13 bpm, Calm: 8 bpm, Stress: 22 bpm)
            target_bpm = 13.0
            if device.current_mental_state == "flow":
                target_bpm = 10.5
            elif device.current_mental_state == "calm":
                target_bpm = 8.5
            elif device.current_mental_state == "stress":
                target_bpm = 22.0

            freq_hz = target_bpm / 60.0
            phase += interval_seconds * 2.0 * math.pi * freq_hz

            # Base sine wave + biological harmonics + subtle sensor noise
            base_wave = 380.0 * math.sin(phase)
            harmonic = 45.0 * math.sin(phase * 2.2)
            noise = 12.0 * math.sin(now * 15.0)
            synthetic_signal = int(base_wave + harmonic + noise)

            device.analyzer.add_sample(synthetic_signal, now)
            device.streak_duration = int(elapsed) % 900
            device.streak_type = device.current_mental_state

            if on_sample:
                on_sample(synthetic_signal)

            if on_telemetry:
                on_telemetry(device.build_snapshot())

    except asyncio.CancelledError:
        pass
    finally:
        device.is_connected = False
        if on_telemetry:
            on_telemetry(device.build_snapshot())
