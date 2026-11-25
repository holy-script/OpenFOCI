#!/usr/bin/env python3
"""
OpenFOCI CSV Data Logger.
Streams 60 seconds of raw biometric telemetry to a CSV file for pandas analysis.
"""

import asyncio
from openfoci.client import FociDevice, FociBleDriver
from openfoci.storage.csv_store import CsvStorage

CSV_FILE = "foci_session.csv"

async def main():
    device = FociDevice()
    store = CsvStorage(CSV_FILE)

    def on_telemetry(snap):
        store.save(snap)
        print(f"Logged -> {snap['timestamp']} | {snap['mentalState']} | {snap['breath']['respirationRate']} bpm")

    driver = FociBleDriver(device, on_telemetry=on_telemetry)
    print(f"Streaming telemetry to {CSV_FILE} for 60 seconds...")
    try:
        await asyncio.wait_for(driver.run(), timeout=60.0)
    except asyncio.TimeoutError:
        print(f"\n✓ Session complete. Saved data to {CSV_FILE}")

if __name__ == "__main__":
    asyncio.run(main())
