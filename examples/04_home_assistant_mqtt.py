#!/usr/bin/env python3
"""
OpenFOCI Home Assistant MQTT Auto-Discovery Bridge.
Publishes telemetry to an MQTT broker for Home Assistant integration.
Requires: pip install paho-mqtt
"""

import sys
import json
import time
import asyncio
import argparse
from openfoci.client import FociDevice, FociBleDriver

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("paho-mqtt library is required. Run: pip install paho-mqtt")
    sys.exit(1)

def publish_ha_discovery(client: mqtt.Client, prefix: str = "homeassistant"):
    """Publishes Home Assistant MQTT discovery configs."""
    device_info = {
        "identifiers": ["openfoci_ble"],
        "name": "OpenFOCI Wearable",
        "model": "FOCI 78",
        "manufacturer": "TinyLogics (OpenFOCI Revive)",
    }

    # Respiration Rate Sensor
    client.publish(
        f"{prefix}/sensor/openfoci/respiration/config",
        json.dumps({
            "name": "FOCI Respiration Rate",
            "state_topic": "openfoci/telemetry",
            "value_template": "{{ value_json.breath.respirationRate }}",
            "unit_of_measurement": "bpm",
            "device": device_info,
            "unique_id": "openfoci_respiration_rate",
        }),
        retain=True,
    )

    # Mental State Sensor
    client.publish(
        f"{prefix}/sensor/openfoci/state/config",
        json.dumps({
            "name": "FOCI Mental State",
            "state_topic": "openfoci/telemetry",
            "value_template": "{{ value_json.mentalState | upper }}",
            "device": device_info,
            "unique_id": "openfoci_mental_state",
        }),
        retain=True,
    )

def main():
    parser = argparse.ArgumentParser(description="OpenFOCI MQTT Home Assistant Bridge")
    parser.add_argument("--broker", default="localhost", help="MQTT broker host")
    parser.add_argument("--port", type=int, default=1883, help="MQTT broker port")
    parser.add_argument("--user", default="", help="MQTT username")
    parser.add_argument("--password", default="", help="MQTT password")
    args = parser.parse_args()

    client = mqtt.Client()
    if args.user:
        client.username_pw_set(args.user, args.password)
    client.connect(args.broker, args.port, 60)
    client.loop_start()

    publish_ha_discovery(client)
    print(f"Connected to MQTT broker at {args.broker}:{args.port}")

    device = FociDevice()
    def on_telemetry(snap):
        client.publish("openfoci/telemetry", json.dumps(snap))
        print(f"MQTT -> {snap['mentalState']} | {snap['breath']['respirationRate']} bpm")

    driver = FociBleDriver(device, on_telemetry=on_telemetry)
    asyncio.run(driver.run())

if __name__ == "__main__":
    main()
