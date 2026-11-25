# Home Assistant Integration Guide for OpenFOCI

OpenFOCI integrates with **Home Assistant** via MQTT (recommended) or the REST Sensor platform, allowing your FOCI respiration and cognitive metrics to trigger smart home automations.

---

## 💡 Use Case Examples
- **Deep Work Automation**: Automatically set smart office lighting to deep royal purple when entering **Focus** and electric cyan when in **Flow**.
- **Biofeedback Stress Interventions**: Pulse ambient lights soft amber and start playing calming music when **Stress** is detected for longer than 3 minutes.
- **Posture & Breath Reminders**: Flash desk lamp when diaphragmatic depth drops below 30% for extended periods.

---

## 🚀 Option 1: Home Assistant via MQTT (Auto-Discovery)

Run the included MQTT integration script:
```bash
python3 examples/04_home_assistant_mqtt.py --broker 192.168.1.100 --user homeassistant --password secret
```

This registers the following Home Assistant entities under the device **OpenFOCI Biometric Tracker**:
- `sensor.openfoci_respiration_rate` (breaths/min)
- `sensor.openfoci_breath_fluidity` (% coherence)
- `sensor.openfoci_diaphragm_depth` (% excursion)
- `sensor.openfoci_mental_state` (Flow, Focus, Calm, Stress)
- `sensor.openfoci_battery` (% SoC)
- `binary_sensor.openfoci_worn_state` (Worn on waist / Resting)

---

## 🌐 Option 2: Home Assistant REST Sensor Platform

If you run `openfoci serve --port 8080`, Home Assistant can query the REST API directly. Add the following to your `configuration.yaml`:

```yaml
sensor:
  - platform: rest
    name: "OpenFOCI Telemetry"
    resource: "http://localhost:8080/api/telemetry"
    scan_interval: 5
    json_attributes_path: "$.breath"
    json_attributes:
      - "respirationRate"
      - "fluidity"
      - "diaphragmaticDepth"
    value_template: "{{ value_json.mentalState }}"

  - platform: template
    sensors:
      foci_respiration_rate:
        friendly_name: "FOCI Respiration Rate"
        unit_of_measurement: "bpm"
        value_template: "{{ state_attr('sensor.openfoci_telemetry', 'respirationRate') }}"

      foci_fluidity:
        friendly_name: "FOCI Rhythm Coherence"
        unit_of_measurement: "%"
        value_template: "{{ state_attr('sensor.openfoci_telemetry', 'fluidity') }}"

      foci_mental_state:
        friendly_name: "FOCI Mental State"
        value_template: "{{ states('sensor.openfoci_telemetry') | upper }}"
```

---

## ⚡ Automation Example: Adaptive Office Lighting

```yaml
automation:
  - alias: "Office Lights - Shift to Focus Mode"
    trigger:
      - platform: state
        entity_id: sensor.openfoci_mental_state
        to: "focus"
    action:
      - service: light.turn_on
        target:
          entity_id: light.desk_lamp
        data:
          rgb_color: [168, 85, 247] # Royal Purple
          brightness: 200

  - alias: "Office Lights - Stress De-escalation"
    trigger:
      - platform: state
        entity_id: sensor.openfoci_mental_state
        to: "stress"
        for:
          minutes: 3
    action:
      - service: light.turn_on
        target:
          entity_id: light.desk_lamp
        data:
          rgb_color: [16, 185, 129] # Calming Emerald Green
          brightness: 120
      - service: notify.notify
        data:
          title: "🫁 Respiration Alert"
          message: "Diaphragmatic tension detected. Take 4 deep, slow breaths."
```
