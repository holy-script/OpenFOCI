# OpenFOCI

Open-source Bluetooth Low Energy (BLE) driver, telemetry engine, and local-first biofeedback visualizer for FOCI and FOCI 2 respiration wearables.

---

## Overview

OpenFOCI provides a completely sovereign, offline, and local-first software interface for FOCI biometric clips. It allows users to connect directly to their hardware over BLE, decode real-time diaphragmatic breathing waveforms and posture metrics, and visualize biofeedback metrics without relying on any external cloud infrastructure.

### Key Capabilities

- **AirSync BLE Driver**: Fully implemented authentication and challenge-response handshake over Bluetooth Low Energy.
- **Waveform Streaming**: Ingests real-time 10 Hz abdominal movement telemetry.
- **Signal Analysis**: 60-second rolling window breath detector computing respiration rate (BPM), breath regularity/fluidity, and excursion depth.
- **Cognitive State Detection**: Evaluates physiological metrics into focus, calm, flow, and stress indicators.
- **Mind Orb Cockpit**: Built-in, zero-dependency local web dashboard featuring an interactive fluid visualizer and real-time waveform display.
- **Pluggable Storage**: Stream snapshots to SQLite, high-frequency CSV, atomic JSON files, or forward via Webhooks/MQTT.
- **Synthetic Simulation Mode**: Test and develop integrations without needing physical hardware connected.

---

## Architecture

```
                  +-----------------------------------+
                  |     FOCI BLE Wearable Device      |
                  +-----------------------------------+
                                    |
                           BLE (AirSync / GATT)
                                    v
+-------------------------------------------------------------------------+
|                              OpenFOCI Core                              |
|                                                                         |
|   +-----------------------+      +----------------------------------+   |
|   |  AirSync & Handshake  | ---> |   RollingBreathAnalyzer (10Hz)   |   |
|   +-----------------------+      +----------------------------------+   |
|                                                   |                     |
|                                                   v                     |
|                                     +---------------------------+       |
|                                     |  Telemetry State Engine   |       |
|                                     +---------------------------+       |
+---------------------------------------------------|---------------------+
                                                    |
             +--------------------+-----------------+--------------------+
             |                    |                 |                    |
             v                    v                 v                    v
      +--------------+     +--------------+   +-----------+      +---------------+
      | SQLite / CSV |     | JSON Ambient |   | Web Server|      | Home Assistant|
      | Persistence  |     |  Snapshots   |   |  Mind Orb |      |   MQTT / SSE  |
      +--------------+     +--------------+   +-----------+      +---------------+
```

---

## Installation

### Prerequisites

- Python 3.9 or higher
- Bluetooth 4.0+ adapter (macOS CoreBluetooth or Linux BlueZ supported via Bleak)

### From Source

```bash
git clone https://github.com/holy-script/OpenFOCI.git
cd OpenFOCI
pip install -e .
```

To install optional testing and development packages:

```bash
pip install -e ".[dev]"
```

---

## Quickstart (CLI)

OpenFOCI includes a unified command-line tool `openfoci`:

### 1. Scan for Nearby Devices

Find the MAC address or UUID of your clip:

```bash
openfoci scan
```

### 2. Stream Live Telemetry

Connect to your clip and view live respiration metrics in the terminal:

```bash
openfoci stream --device "a4:11:63:e0:7e:87"
```

To test without a physical device, supply `--synthetic`:

```bash
openfoci stream --synthetic
```

### 3. Launch the Mind Orb Web Cockpit

Start the local web visualizer and REST/SSE server:

```bash
openfoci serve --port 8080
```

Open `http://localhost:8080` in your browser to view the real-time Mind Orb and waveform oscilloscope.

### 4. Background Ingestion & Status Inspection

Run as a daemon writing to SQLite and JSON:

```bash
openfoci daemon --device "a4:11:63:e0:7e:87" --db openfoci.db --json-out foci_telemetry.json
```

Check the latest recorded state:

```bash
openfoci status --json-out foci_telemetry.json
```

Export SQLite sessions to CSV:

```bash
openfoci export --db openfoci.db --out session_export.csv
```

---

## Python API Usage

You can embed OpenFOCI directly inside your own Python services:

```python
import asyncio
from openfoci.client import FociDevice, FociBleDriver

async def main():
    device = FociDevice(mac="a4:11:63:e0:7e:87")

    def handle_telemetry(snapshot):
        bpm = snapshot["breath"]["respirationRate"]
        state = snapshot["mentalState"]
        battery = snapshot["batteryLevel"]
        print(f"State: {state} | Respiration: {bpm:.1f} BPM | Battery: {battery}%")

    driver = FociBleDriver(device, on_telemetry=handle_telemetry)
    await driver.run()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## Documentation

- [GATT Specification](docs/GATT_SPEC.md): Full breakdown of BLE services, characteristics, command codes, and packet structures.
- [Protocol Overview](docs/PROTOCOL_BREAKDOWN.md): Deep-dive into handshake framing, cryptographic key generation, and packet decoding.
- [Home Assistant Integration](docs/HOME_ASSISTANT.md): Guide for publishing real-time telemetry over MQTT with auto-discovery.

---

## License

This project is licensed under the [MIT License](LICENSE).
