#!/usr/bin/env python3
"""
OpenFOCI Event-Driven Callback Trigger.
Executes custom actions when the user transitions into or out of deep work states.
"""

import asyncio
from openfoci.client import FociDevice, FociBleDriver

class StateNotifier:
    def __init__(self):
        self.last_state = "neutral"

    def handle_telemetry(self, snap):
        current_state = snap["mentalState"]
        if current_state != self.last_state:
            print(f"\n⚡ STATE SHIFT: {self.last_state.upper()} ➔ {current_state.upper()}")
            
            if current_state == "flow":
                print("   🌊 Deep flow state entered! Silencing notifications.")
            elif current_state == "stress":
                print("   ⚠️ Diaphragmatic stress detected. Suggested action: 4s-4s box breathing.")
            elif current_state == "distraction":
                print("   ⚡ Distraction detected. Returning to focus.")
                
            self.last_state = current_state

async def main():
    device = FociDevice()
    notifier = StateNotifier()
    driver = FociBleDriver(device, on_telemetry=notifier.handle_telemetry)
    print("Listening for state transitions...")
    await driver.run()

if __name__ == "__main__":
    asyncio.run(main())
