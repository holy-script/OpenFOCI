# OpenFOCI Protocol Architecture & Technical Dossier

This document provides a technical specification of the OpenFOCI protocol implementation, detailing how biometric telemetry is acquired directly over Bluetooth Low Energy.

---

## 1. Hardware Overview

### Physical Interface
- **Charging Interface**: 2 pogo contacts providing +5V DC power and ground.
- **Data Channel**: Strictly Bluetooth Low Energy (BLE). No physical serial or USB data pins exist on the clip.
- **Processor**: Dialog Semiconductor DA14580 (ARM Cortex-M0).
- **Sensors**: Low-power micro-motion accelerometer capturing abdominal wall motion at 10 Hz.
- **Power Source**: Rechargeable lithium-polymer cell (nominal operational range: 3.5V to 4.2V).

---

## 2. Authentication and Pairing Architecture

Communication uses the WeChat AirSync BLE profile (Service UUID `0000fee7-0000-1000-8000-00805f9b34fb`).

### Handshake Sequence

1. **Authentication Phase**:
   - The peripheral issues an authentication request frame (`0x2711`) containing its MAC address and requesting authentication method 2.
   - The central responds with an authentication acknowledgement frame (`0x4E21`) with status code 0.

2. **Initialization Challenge Phase**:
   - The peripheral transmits an initialization challenge request (`0x2713`) containing a 4-byte pseudorandom challenge token.
   - The central calculates an IEEE 802.3 CRC32 checksum over the challenge token and returns an initialization response frame (`0x4E23`) containing the varint-encoded CRC32 result.

3. **Device Authorization (Write Key Challenge)**:
   - The peripheral requires a 32-bit validation key derived from the user ID and hardware MAC:
     $$\text{key} = \text{MD5}\Big(\text{UID} + \text{"3BF608C70828"} + \text{ReversedHex}(\text{MAC})\Big)[0..3]$$
   - Transmitted as inner command `27514` (`SendChallenge`).
   - If the peripheral was previously bound to another ID, inner command `27507` (`BindUID`) resets the ownership record.

4. **Telemetry Ingestion**:
   - Once unlocked, the peripheral streams packets (`0x2712` `SendDataRequest`) containing 10 Hz accelerometer waveforms and biometric classifications.
   - The central confirms each packet with an acknowledgement frame (`0x4E22`).

---

## 3. Signal Processing & On-Device Classification

Telemetry processing operates on-device:
- **Respiration Waveform**: Real-time 10 Hz displacement amplitude values.
- **Classification Engine**: Onboard heuristic model categorizing intervals into cognitive and respiratory states:
  - Calm
  - Focus
  - Flow
  - Stress
  - Distraction
  - Motion / Non-worn
