"""
OpenFOCI — Open-Source BLE Driver & Neurometric Telemetry Engine for FOCI Wearables.

Reviving TinyLogics FOCI / FOCI 2 biometric wearables with sovereign, local-first
Bluetooth Low Energy (BLE) diaphragmatic respiration and cognitive state tracking.
"""

__version__ = "0.1.0"
__author__ = "OpenFOCI Contributors"
__license__ = "MIT"

from openfoci.protocol import (
    AIRSYNC_SERVICE_UUID,
    INDICATE_CHAR_UUID,
    NOTIFY_CHAR_UUID,
    WRITE_CHAR_UUID,
    READ_CHAR_UUID,
    MIND_STATES,
    KTYPE_STREAKS,
    compute_write_key,
    battery_mv_to_percentage,
)
from openfoci.analyzer import RollingBreathAnalyzer
from openfoci.client import FociDevice, FociBleDriver
from openfoci.synthetic import run_synthetic_stream, SyntheticFociGenerator

__all__ = [
    "__version__",
    "AIRSYNC_SERVICE_UUID",
    "INDICATE_CHAR_UUID",
    "NOTIFY_CHAR_UUID",
    "WRITE_CHAR_UUID",
    "READ_CHAR_UUID",
    "MIND_STATES",
    "KTYPE_STREAKS",
    "compute_write_key",
    "battery_mv_to_percentage",
    "RollingBreathAnalyzer",
    "FociDevice",
    "FociBleDriver",
    "run_synthetic_stream",
    "SyntheticFociGenerator",
]
