#!/usr/bin/env python3
"""
OpenFOCI Quickstart Example.
Connects to a nearby FOCI clip and prints live diaphragmatic respiration data.
"""

import asyncio
from openfoci.client import FociDevice, FociBleDriver

async def main():
    device = FociDevice()

    def on_telemetry(snap):
        bpm = snap["breath"]["respirationRate"]
        state = snap["mentalState"].upper()
        fluidity = snap["breath"]["fluidity"]
        batt = snap["batteryLevel"]
        print(f"🫁 FOCI | State: {state:<7} | Resp: {bpm:4.1f} bpm | Coherence: {fluidity}% | Batt: {batt}%")

    driver = FociBleDriver(device, on_telemetry=on_telemetry)
    print(f"Connecting to FOCI clip ({device.mac})... Press Ctrl+C to stop.")
    await driver.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nDisconnected.")
