# OpenFOCI BLE GATT Table & Binary Specification

This specification documents the complete Bluetooth Low Energy (BLE) Generic Attribute Profile (GATT) architecture and binary framing used by the **FOCI** and **FOCI 2** biometric wearables manufactured by TinyLogics Ltd.

---

## 📡 1. GATT Services & Characteristics

The physical FOCI clip advertises under the standard **Tencent / WeChat AirSync** BLE hardware profile:

| UUID | Name | Properties | Purpose |
| :--- | :--- | :--- | :--- |
| `0000fee7-0000-1000-8000-00805f9b34fb` | **AirSync Service** | Primary Service | Main communication profile |
| `0000fec7-0000-1000-8000-00805f9b34fb` | **Egress Write Channel** | `Write`, `WriteWithoutResponse` | Host $\to$ Device command packets (20-byte MTU slices) |
| `0000fec8-0000-1000-8000-00805f9b34fb` | **Ingress Indicate Channel** | `Indicate` | Device $\to$ Host protocol handshake & status indications |
| `0000fed8-0000-1000-8000-00805f9b34fb` | **Ingress Notify Channel** | `Notify` | Real-time 10 Hz diaphragmatic waveform & telemetry notifications |
| `0000fec9-0000-1000-8000-00805f9b34fb` | **Device Info Read** | `Read` | Returns ASCII `'P'` (0x50) |

---

## 🔐 2. Outer Framing: WeChat AirSync Protocol

All packets exchanged over characteristic `0000fec7` and received on `0000fec8` / `0000fed8` adhere to the **WeChat AirSync** framing header:

```
+---------------+---------------+--------------------+--------------------+
| Byte 0: Magic | Byte 1: Ver   | Byte 2-3: Length   | Byte 4-5: Cmd ID   |
| 0xFE          | 0x01          | Total Length (BE)  | Command ID (BE)    |
+---------------+---------------+--------------------+--------------------+
| Byte 6-7: Sequence Counter    | Byte 8..N: Protobuf / Inner Payload     |
| uint16_be                     | Variable length                         |
+-------------------------------+-----------------------------------------+
```

### Outer AirSync Command Codes

| Command ID | Hex | Name | Direction | Description |
| :--- | :--- | :--- | :--- | :--- |
| `10001` | `0x2711` | `eCmdId_authReq` | Device $\to$ Host | Authentication request (contains device MAC and authMethod=2) |
| `20001` | `0x4E21` | `eCmdId_authResp` | Host $\to$ Device | Authentication response (accepts with errCode=0) |
| `10003` | `0x2713` | `eCmdId_initReq` | Device $\to$ Host | Issues 4-byte dynamic security challenge |
| `20003` | `0x4E23` | `eCmdId_initResp` | Host $\to$ Device | Answers security challenge with CRC32 varint |
| `10002` | `0x2712` | `eCmdId_sendDataReq` | Device $\to$ Host | Sensor telemetry stream carrying inner TinyLogics payload |
| `20002` | `0x4E22` | `eCmdId_sendDataResp` | Host $\to$ Device | Immediate ACK frame confirming packet reception |
| `30001` | `0x7531` | `eCmdId_sendDataPush` | Host $\to$ Device | Wraps inner TinyLogics commands (challenge, bind, heartbeat) |
| `30002` | `0x7532` | `eCmdId_switchViewPush` | Host $\to$ Device | Notifies device that live active screen is open |

---

## 🧮 3. Cryptographic Handshake & writeKey Derivation

To unlock the FOCI clip and transition it from unpermitted status (`Status = 3` or `4`) to permitted streaming status (`Status = 0`), the host must compute a 32-bit little-endian `writeKey`.

### Algorithm
Extracted from `com.tinylogics.sdk.memobox.bledevice.ProtocolV2Processor`:

```python
BOX_WRITE_VALID = "3BF608C70828"

def compute_write_key(uid: int, mac: str) -> int:
    # 1. Clean MAC and reverse byte order
    mac_bytes = bytearray.fromhex(mac.replace(":", "").lower())
    reversed_mac_hex = bytes(reversed(mac_bytes)).hex().lower()
    
    # 2. Hash concatenated string with MD5
    plain = f"{uid}{BOX_WRITE_VALID}{reversed_mac_hex}".encode("utf-8")
    md5_digest = hashlib.md5(plain).digest()
    
    # 3. Take first 4 bytes as uint32 little-endian
    return int.from_bytes(md5_digest[:4], byteorder="little")
```

---

## 📦 4. Inner TinyLogics Command Layouts

Inner commands are packed into the outer AirSync body at offset 4:
`0x0A 0x00 0x12 <varint_length> <inner_header> <payload>`

The `<inner_header>` consists of 17 bytes:
- Byte 0: `0x01` (Magic)
- Byte 1–2: Inner length (uint16_le)
- Byte 3–4: Command ID (uint16_le)
- Byte 5–6: Error Code / Status (uint16_le)
- Byte 7–14: User ID / Owner ID (uint64_le)
- Byte 15–16: Inner sequence counter (uint16_le)

### Inner Commands Summary

| Command ID | Name | Direction | Payload Structure |
| :--- | :--- | :--- | :--- |
| **`27514`** | `SendChallenge` | Host $\to$ Device | `write_key` (4 bytes little-endian) |
| **`27507`** | `BindUID` | Host $\to$ Device | `owner_id` (8b) + `write_key` (4b) + `is_reset` (`0x01`) |
| **`26509`** | `Heartbeat` | Host $\to$ Device | Unix epoch timestamp (4 bytes big-endian) |
| **`27513`** | `UploadDevStatusEntry` | Device $\to$ Host | Status code (`0` = OK, `3/4` = unpermitted) |
| **`27524`** | `TrackerRealDataEntry` | Device $\to$ Host | Mental state index, streak duration, raw signal |
| **`27545`** | `FnRealTimeDataEntity` | Device $\to$ Host | 10 Hz micro-motion respiration, AR(1) parameter, battery status |

---

## 📊 5. Mental State Mapping

The clip classifies cognitive and physiological states in the 5 least significant bits (`byte & 0x1F`):

| Code | Mental State | Biological Meaning |
| :---: | :--- | :--- |
| `0` | **Breathing / Calm** | Normal diaphragmatic breathing baseline |
| `1` | **Not Worn** | Clip resting off-body (accelerometer motionless) |
| `2` | **Noise** | High-frequency physical disturbance / artifact |
| `3` | **Active Motion** | Walking, running, or standing adjustment |
| `4` | **Neutral** | Undifferentiated baseline cognitive state |
| `5` | **Deep Calm** | High rhythm fluidity, parasympathetic dominance |
| `6` | **Deep Focus** | Low respiratory variability, cognitive engagement |
| `7` | **Stress / Tense** | Rapid, erratic, shallow thoracic breathing |
