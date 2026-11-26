# 🫁 OpenFOCI: Sovereign Biofeedback & Wearable Revival Engine

[![Python 3.9+](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Tests: 15 Passed](https://img.shields.io/badge/tests-15%20passed-brightgreen.svg)](tests/)
[![Zero Cloud](https://img.shields.io/badge/cloud-100%25%20offline-cyan.svg)](#right-to-repair--the-tinylogics-backstory)
[![Hardware: Dialog DA14580](https://img.shields.io/badge/SoC-Dialog%20DA14580%20ARM-indigo.svg)](docs/GATT_SPEC.md)

Open-source Bluetooth Low Energy (BLE) driver, real-time diaphragmatic respiration telemetry engine, and local-first **Mind Orb** biofeedback visualizer for **FOCI** and **FOCI 2** biometric wearables.

---

<p align="center">
  <img src="assets/mind_orb_preview.svg" alt="OpenFOCI Mind Orb &amp; 10 Hz Oscilloscope" width="100%" />
</p>

---

## 🏛️ Right to Repair & The Tinylogics Backstory

In 2018–2021, Cambridge-based startup **Tinylogics Ltd** raised over **\$900,000** across [Kickstarter](https://www.kickstarter.com/projects/661527809/foci-wearable-that-boosts-your-focus) and [Indiegogo](https://www.indiegogo.com/projects/foci-2-boosts-your-focus-productivity-with-ai#/) from more than 7,000 backers to create **FOCI**, a tiny waist-worn clip that tracks diaphragmatic breathing and cognitive states (*Flow, Focus, Calm, Distraction, Fatigue*).

On **September 2, 2025**, Tinylogics was formally dissolved via compulsory strike-off ([UK Companies House #08954266](https://find-and-update.company-information.service.gov.uk/company/08954266)). The official authentication servers were taken offline, and the mobile app (`com.tinylogics.foci`) was pulled from app stores, leaving thousands of perfectly working devices unable to pass the login screen and functionally bricked.

### Reverse-Engineering Revelations
Through hardware teardowns and Android APK deobfuscation, we uncovered three critical facts:
1. **No ML Ever Ran in the Cloud**: The digital signal processing (DSP), zero-crossing breath rate estimation, autoregressive motion parameters (AR1/AR3), and mental state classifications run directly on the clip's on-board **Dialog Semiconductor DA14580 Cortex-M0 SoC**. The cloud servers were solely a user account/licensing gate.
2. **Standard WeChat AirSync BLE Profile**: The clip advertises GATT Service `0xFEE7` and uses standard AirSync framing with a 4-byte CRC32 challenge.
3. **Cryptographic WriteKey Formula**: The device unlock key is derived via:
   $$\text{writeKey} = \text{MD5}\left(\text{UID} + \text{"3BF608C70828"} + \text{reversed\_mac\_hex}\right)[:4]$$
4. **Charging Cradle has No USB Data**: The physical magnetic dock contains only 2 pogo pins ($+5\text{V}$ and $\text{GND}$). Communication must happen over BLE.

**OpenFOCI emancipates the hardware from cloud obsolescence.** It connects directly over BLE, handles the AirSync authentication handshake, streams raw 10 Hz diaphragmatic micro-motion waveforms, and provides a standalone Mind Orb web interface with zero cloud dependencies.

---

## 🗺️ System Architecture

<p align="center">
  <img src="assets/openfoci_architecture.svg" alt="OpenFOCI Architecture" width="100%" />
</p>

---

## ⚡ Features

* 🫁 **Hardware-First BLE Driver**: Complete asynchronous implementation of the WeChat AirSync protocol (`0xFEE7` GATT) with 20-byte MTU slicing, challenge-response auth, and keepalive heartbeats.
* 🌊 **10 Hz Respiration Oscilloscope**: Real-time diaphragmatic excursion waveform capture isolating abdominal movement from gross accelerometer activity.
* 📈 **Rolling Signal Analyzer**: 60-second rolling window peak/trough detector computing instantaneous respiration rate (BPM), breath rhythm regularity / fluidity (coherence %), and diaphragmatic depth.
* 🔮 **Zero-Install Mind Orb Cockpit**: Built-in HTML5 Canvas & WebGL chromatic fluid visualizer served locally over HTTP/SSE. The orb pulses in rhythm with your breathing and shifts color based on autonomic tone (*Cyan = Flow, Purple = Focus, Emerald = Calm, Crimson = Stress*).
* 💾 **Pluggable Storage Targets**: Stream biometric snapshots directly to SQLite relational tables, high-frequency CSV files, atomic local JSON files, or forward via HTTP Webhooks and MQTT.
* 🏡 **Home Assistant & MQTT Ready**: Native MQTT auto-discovery configuration to trigger biofeedback automations (smart lights, HVAC, focus playlists) when entering deep flow or acute stress.
* 🧪 **Synthetic Simulation Mode**: Complete offline simulation engine generating realistic biological breathing harmonics and state cycles without requiring physical hardware.

---

## 🚀 Quickstart in 60 Seconds

### 1. Installation

Requires Python 3.9+ and Bluetooth 4.0+ hardware (macOS CoreBluetooth and Linux BlueZ supported natively).

```bash
# Clone the repository
git clone https://github.com/holy-script/OpenFOCI.git
cd OpenFOCI

# Install in editable mode
pip install -e .

# Or install with development dependencies (pytest)
pip install -e ".[dev]"
```

### 2. Discover Your Clip

Place your charged FOCI clip near your computer and scan:

```bash
openfoci scan
```

Output:
```text
🔍 Scanning for nearby BLE devices (8 seconds)...
============================================================================
DEVICE NAME                BLE ADDRESS / UUID                   RSSI     MATCH
============================================================================
FOCI                       5C7427EA-91E6-9039-5D37-6D185EB23FC5 -61 dBm   ★ FOCI DETECTED
============================================================================
Total discovered: 6 | FOCI targets: 1
```

### 3. Stream Live Biometrics in Terminal

```bash
openfoci stream
```

Terminal HUD:
```text
============================================================================
🫁 FOCI WEARABLE TELEMETRY HUD (OpenFOCI Core)
============================================================================
Device:        FOCI 78 (a4:11:63:e0:7e:87)
Connection:    🟢 CONNECTED
Wearing State: 🟢 Worn on waistband
Battery:       88% (3900 mV)
Mental State:  FLOW (Confidence: 85%)
Respiration:   14.0 breaths/min
Fluidity:      85% coherence
Excursion:     70% diaphragmatic depth
Streak:        Focus Streak (25 min)
============================================================================
```

### 4. Launch the Mind Orb Web Cockpit

Start the local web dashboard and Server-Sent Events (SSE) streaming server:

```bash
openfoci serve --port 8080
```

Open [http://localhost:8080](http://localhost:8080) in any browser to watch your chromatic Mind Orb and 10 Hz respiration waveform live.

---

## 🐍 Python SDK Example

Integrate OpenFOCI directly into your own data science scripts, AI agents, or robotic systems:

```python
import asyncio
from openfoci.client import FociDevice, FociBleDriver

async def main():
    # Instantiate device with clip MAC / UUID
    device = FociDevice(mac="a4:11:63:e0:7e:87")

    def on_telemetry(snapshot):
        bpm = snapshot["breath"]["respirationRate"]
        coherence = snapshot["breath"]["fluidity"]
        state = snapshot["mentalState"]
        battery = snapshot["batteryLevel"]
        print(f"[{state.upper()}] {bpm:.1f} bpm | Coherence: {coherence}% | Battery: {battery}%")

    driver = FociBleDriver(device, on_telemetry=on_telemetry)
    await driver.run()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 🗺️ Project Roadmap

- [x] **Phase 1: BLE Protocol Reverse-Engineering & Emancipation**
  - [x] AirSync GATT service (`0xFEE7`) identification & 20-byte MTU slicing
  - [x] AuthRequest (`0x2711`) & CRC32 InitRequest (`0x2713`) challenge solving
  - [x] Proprietary `3BF608C70828` secret key extraction & `writeKey` formula derivation
  - [x] Continuous `0x4E22` SendData ACK loop to keep streaming alive
- [x] **Phase 2: Local Core Driver & Web Visualizer**
  - [x] Asynchronous Python client (`openfoci.client.FociBleDriver`)
  - [x] 60-second rolling breath peak/trough detector & coherence scoring
  - [x] Standalone, zero-install HTML5/WebGL Mind Orb web cockpit with SSE
  - [x] High-frequency CLI streaming dashboard (`openfoci stream`)
- [x] **Phase 3: Pluggable Storage & Integrations**
  - [x] SQLite time-series database with indexed timestamps & streak logs
  - [x] High-frequency CSV sample exporter
  - [x] Atomic JSON snapshot writer for local system daemons
  - [x] Webhook / REST cloud forwarding adapter
  - [x] Home Assistant MQTT auto-discovery configuration
- [x] **Phase 4: Offline Android APK Repackaging & Mobile Patching**
  - [x] Smali bytecode patch on `TrackerSDK.smali` (`checkLoginStatus -> true`)
  - [x] Smali bytecode patch on `AccountManager.smali` (`hasAutoLoginToken -> true`, default UID `1001`)
  - [x] Smali bytecode patch on `SplashViewPagerActivity.smali` (`loginSuccessFinished()` in `onCreate`)
  - [x] Automated 1-click APK patcher script (`tools/patch_apk.sh`) with `apktool` & `uber-apk-signer`
  - [x] Pre-signed offline APK ready for ADB deployment (`tools/FOCI_Offline_Patched.apk`)
- [ ] **Phase 5: PyPI Release & Multi-OS CI/CD**
  - [ ] PyPI distribution package (`pip install openfoci`)
  - [ ] Automated GitHub Actions CI across macOS, Ubuntu Linux, and Windows
- [ ] **Phase 6: Advanced Deep Learning Respiratory Sinus Arrhythmia (RSA) Model**
  - [ ] 1D-CNN / Temporal Convolutional Network (TCN) trained on raw 10 Hz strain data
  - [ ] Autonomous nervous system arousal estimation (HRV proxy)
  - [ ] Personalized user calibration profiles

---

## 🤝 Community Outreach & Support

If you own a stranded FOCI clip, or are an engineer fighting planned obsolescence:

* Read our [Community Outreach & Revival Guide](docs/COMMUNITY_OUTREACH.md) for pre-written post templates and direct links to Kickstarter/Indiegogo backer forums.
* Share your findings on [r/focigadget](https://www.reddit.com/r/focigadget/) and [r/quantifiedself](https://www.reddit.com/r/quantifiedself/).
* Open an issue or submit a pull request on [GitHub](https://github.com/holy-script/OpenFOCI).

---

## 📚 Technical Specifications & References

* [GATT Specification (docs/GATT_SPEC.md)](docs/GATT_SPEC.md): Exhaustive breakdown of UUIDs, byte offsets, opcodes, and Little-Endian bitmasks.
* [Protocol Reverse-Engineering Dossier (docs/PROTOCOL_BREAKDOWN.md)](docs/PROTOCOL_BREAKDOWN.md): Step-by-step account of JADX decompilation, crypto discovery, and packet framing.
* [Home Assistant Guide (docs/HOME_ASSISTANT.md)](docs/HOME_ASSISTANT.md): Setup instructions for MQTT telemetry streaming and smart home biofeedback.
* [Community Outreach Guide (docs/COMMUNITY_OUTREACH.md)](docs/COMMUNITY_OUTREACH.md): Backer outreach channels and announcement templates.

---

## ⚖️ License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

*Disclaimer: OpenFOCI is an independent open-source hardware liberation and right-to-repair research initiative. It is not affiliated with, endorsed by, or sponsored by Tinylogics Ltd or its successors.*
