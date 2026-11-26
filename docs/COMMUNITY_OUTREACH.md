# OpenFOCI Community Outreach & Hardware Revival Guide

> **Mission**: Help the 7,000+ stranded Kickstarter and Indiegogo backers of the Tinylogics FOCI wearable bring their devices back to life after Tinylogics dissolved in September 2025.

---

## 📍 Where the FOCI Community Gathers

The original maker, **Tinylogics Ltd** (Cambridge, UK), raised over **\$900,000** across multiple campaigns before formally dissolving via compulsory strike-off on September 2, 2025. When their backend cloud servers went dark, backers were locked out of their accounts, rendering their hardware unusable.

Here are the highest-impact places to connect with affected users and share the OpenFOCI revival:

### 1. Reddit Subreddits
* **[r/focigadget](https://www.reddit.com/r/focigadget/)**: The official community subreddit dedicated specifically to FOCI users. Backers frequently post troubleshooting questions and complaints about app login errors.
* **[r/quantifiedself](https://www.reddit.com/r/quantifiedself/)**: Active biohackers, engineers, and self-trackers who love diaphragmatic respiration and HRV data.
* **[r/RightToRepair](https://www.reddit.com/r/RightToRepair/)**: Strong advocacy community fighting against cloud-bricked electronics and planned obsolescence.
* **[r/reverseengineering](https://www.reddit.com/r/reverseengineering/)**: Interested in the technical breakdown of the WeChat AirSync protocol, Dialog Semiconductor DA14580 SoC, and decompiled APK analysis.
* **[r/Biohackers](https://www.reddit.com/r/Biohackers/)** & **[r/productivity](https://www.reddit.com/r/productivity/)**: Wearable enthusiasts looking for ADHD focus tools, flow state monitors, and breathwork trackers.

### 2. Crowdfunding Comment Sections
* **Kickstarter Campaign**: [FOCI: Wearable That Boosts Your Focus](https://www.kickstarter.com/projects/661527809/foci-wearable-that-boosts-your-focus/comments) (2,341 backers, £189,451 raised)
* **Indiegogo Campaign (FOCI 1)**: [FOCI: Wearable That Boosts Your Focus](https://www.indiegogo.com/en/projects/tinylogicsteam/foci-wearable-that-boosts-your-focus#/comments)
* **Indiegogo Campaign (FOCI 2)**: [FOCI 2: Boosts Your Focus & Productivity with AI](https://www.indiegogo.com/projects/foci-2-boosts-your-focus-productivity-with-ai#/comments) (5,000+ backers, \$700,000+ raised)

### 3. Developer & Tech Channels
* **Hacker News (Show HN)**: Excellent venue for local-first, right-to-repair hardware liberation projects.
* **Home Assistant Community Forums**: Biofeedback and presence detection section.
* **X / Twitter**: Post tagging `#QuantifiedSelf`, `#RightToRepair`, `#Biohacking`, `#HardwareHacking`.

---

## 📢 Ready-to-Use Outreach Templates

### Template 1: Kickstarter & Indiegogo Comments
```text
Title: Don't throw away your FOCI clip! We open-sourced a local-first BLE driver & Mind Orb UI (OpenFOCI)

Hey fellow backers,

Like many of you, I found my FOCI clip completely bricked when Tinylogics dissolved and their authentication servers went dark. It was infuriating to see perfectly functional hardware turn into e-waste just because of cloud login lock-in.

Over the past few weeks, we reverse-engineered the entire BLE protocol (WeChat AirSync 0xFEE7 GATT), extracted the cryptographic hardware pairing key from the APK, and built OpenFOCI: a 100% open-source, local-first Python driver and Mind Orb web cockpit.

What it does:
- Directly connects to your physical FOCI / FOCI 2 clip over Bluetooth Low Energy
- Zero cloud servers or accounts required (runs 100% offline on your Mac/Linux/Windows PC)
- Real-time 10 Hz diaphragmatic respiration waveform & breath peak detection
- Mind Orb Web Cockpit in your browser (Flow, Focus, Calm, Stress)
- Exports to CSV, SQLite, and Webhooks for Home Assistant or Notion

Repository & Quickstart: https://github.com/holy-script/OpenFOCI

Your clip is not dead. Dust it off, charge it on its dock, and take sovereign ownership of your biometric data!
```

---

### Template 2: Reddit r/focigadget & r/quantifiedself Post
```text
Post Title: We reverse-engineered the dead FOCI wearable: OpenFOCI (open-source BLE driver, local Mind Orb, zero cloud required)

Hey everyone,

If you bought a FOCI or FOCI 2 clip on Kickstarter or Indiegogo, you probably noticed that the app stopped working when Tinylogics Ltd dissolved in late 2025 and their backend servers went offline. 

Instead of letting great diaphragmatic sensing hardware end up in a landfill, we reverse-engineered the BLE protocol and built OpenFOCI:
👉 https://github.com/holy-script/OpenFOCI

Key discoveries from decompiling the hardware & APK:
1. No ML ever ran in the cloud! All DSP, autoregressive motion filters (AR1/AR3), and mental state classifications actually run directly on the clip's Dialog Semiconductor DA14580 Cortex-M0 processor.
2. The BLE protocol is WeChat AirSync (GATT Service 0xFEE7) using a 4-byte CRC32 challenge and a secret MD5 key formula: MD5(uid + "3BF608C70828" + reversed_mac).
3. The magnetic cradle only has 2 pogo pins (5V VBUS + GND) — it has no USB data lines, which is why everything must be done over BLE.

What OpenFOCI gives you right now:
- `openfoci scan`: Instantly finds your physical clip
- `openfoci stream`: Real-time terminal HUD showing live BPM, fluid coherence %, and mental state
- `openfoci serve`: Launches a local zero-install Mind Orb web dashboard with 10Hz respiration oscilloscope
- Storage providers for SQLite, CSV, JSON, and Home Assistant / MQTT

Next on our roadmap is releasing a patched Android APK with the login screen bypassed so you can use it on mobile again.

Would love feedback, testers, and PRs from the community!
```

---

### Template 3: Hacker News (Show HN)
```text
Show HN: OpenFOCI – Reviving dead Kickstarter FOCI wearables with local-first BLE

When Cambridge startup Tinylogics dissolved in Sept 2025, their cloud servers died, leaving thousands of FOCI waist-worn diaphragmatic breathing trackers unable to log in and functionally bricked.

We decompiled the Android APK, mapped the Dialog DA14580 BLE protocol (AirSync GATT 0xFEE7), solved the proprietary MD5 writeKey handshake, and extracted the raw 10 Hz micro-motion strain gauge stream.

Result: OpenFOCI (https://github.com/holy-script/OpenFOCI) — a standalone Python library, CLI, and zero-install HTML5 Mind Orb cockpit. It runs 100% offline, stores telemetry to SQLite/CSV, and frees the hardware from cloud obsolescence.

Technical specs and GATT documentation: https://github.com/holy-script/OpenFOCI/blob/main/docs/GATT_SPEC.md
```
