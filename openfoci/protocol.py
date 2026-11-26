"""
OpenFOCI Protocol Specification & Cryptographic Binary De-framing.

Reverse-engineered WeChat AirSync framing, Protobuf payloads, and proprietary
TinyLogics command sets for FOCI / FOCI 2 BLE biometric clips.
"""

import zlib
import hashlib
from typing import Dict, Tuple, Any, Optional

# ============================================================================
# GATT SERVICE & CHARACTERISTIC UUIDs
# ============================================================================

# Primary WeChat AirSync / Tencent Hardware Profile used by FOCI firmware
AIRSYNC_SERVICE_UUID = "0000fee7-0000-1000-8000-00805f9b34fb"
INDICATE_CHAR_UUID   = "0000fec8-0000-1000-8000-00805f9b34fb" # Ingress: Device -> Host indications
NOTIFY_CHAR_UUID     = "0000fed8-0000-1000-8000-00805f9b34fb" # Ingress: Realtime waveform notify
WRITE_CHAR_UUID      = "0000fec7-0000-1000-8000-00805f9b34fb" # Egress: Host -> Device (20-byte MTU)
READ_CHAR_UUID       = "0000fec9-0000-1000-8000-00805f9b34fb" # Ingress: Device info read ('P')

# Optional / Secondary Nordic UART Service (NUS) fallback
NORDIC_UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
NORDIC_UART_RX_CHAR_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
NORDIC_UART_TX_CHAR_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

# Standard Bluetooth SIG Battery Service
BLE_BATTERY_SERVICE_UUID    = "0000180f-0000-1000-8000-00805f9b34fb"
BLE_BATTERY_LEVEL_CHAR_UUID = "00002a19-0000-1000-8000-00805f9b34fb"

# ============================================================================
# PROTOCOL COMMAND IDENTIFIERS
# ============================================================================

# AirSync Outer Command IDs
CMD_AUTH_REQUEST       = 0x2711  # 10001 (Device -> Host: AuthReq)
CMD_AUTH_RESPONSE      = 0x4E21  # 20001 (Host -> Device: AuthResp)
CMD_SEND_DATA_REQUEST  = 0x2712  # 10002 (Device -> Host: Data payload)
CMD_SEND_DATA_RESPONSE = 0x4E22  # 20002 (Host -> Device: Data ACK)
CMD_INIT_REQUEST       = 0x2713  # 10003 (Device -> Host: Challenge InitReq)
CMD_INIT_RESPONSE      = 0x4E23  # 20003 (Host -> Device: CRC32 challenge answer)
CMD_SWITCH_VIEW_PUSH   = 0x7532  # 30002 (Host -> Device: Activate live screen view)

# TinyLogics Inner Protocol Command IDs (Wrapped inside AirSync body)
TINY_CMD_DEV_STATUS         = 27513  # UploadDevStatusEntry (Connection status / errors)
TINY_CMD_SEND_CHALLENGE     = 27514  # Send writeKey challenge (Unlock device)
TINY_CMD_BIND_RESET         = 27507  # Bind UID / Reset device pairing ownership
TINY_CMD_TRACKER_REAL_DATA  = 27524  # TrackerRealDataEntry (Scores, mental states, streaks)
TINY_CMD_REALTIME_DATA      = 27545  # FnRealTimeDataEntity (10Hz breath waveforms, battery mV)
TINY_CMD_HEARTBEAT          = 26509  # Client periodic heartbeat ping

# Hardware Pairing Secret Constant
BOX_WRITE_VALID = "3BF608C70828"

# ============================================================================
# STATE MAPPINGS
# ============================================================================

MIND_STATES: Dict[int, Tuple[str, str]] = {
    0: ("calm", "Breathing / Calm"),
    1: ("not_worn", "Not Worn"),
    2: ("noise", "Sensor Noise"),
    3: ("activity", "Active Motion"),
    4: ("neutral", "Neutral"),
    5: ("calm", "Deep Calm"),
    6: ("focus", "Deep Focus"),
    7: ("stress", "Tense / Stressed"),
}

KTYPE_STREAKS: Dict[int, str] = {
    4: "distraction",
    6: "focus",
    7: "stress",
    10: "flow",
}

# ============================================================================
# CRYPTOGRAPHIC & VARINT ENCODING UTILITIES
# ============================================================================

def compute_write_key(uid: int, mac: str) -> int:
    """
    Computes the 32-bit little-endian writeKey required to unlock the FOCI clip.
    Extracted from com.tinylogics.sdk.memobox.bledevice.ProtocolV2Processor.
    
    Formula:
        reversed_mac = bytes(reversed(mac_bytes)).hex().lower()
        hash = MD5(f"{uid}{BOX_WRITE_VALID}{reversed_mac}")
        write_key = int.from_bytes(hash[:4], byteorder="little")
    """
    mac_clean = mac.replace(":", "").replace("-", "").lower()
    mac_bytes = bytearray.fromhex(mac_clean)
    mac_reversed = bytes(reversed(mac_bytes))
    mac_rev_hex = mac_reversed.hex().lower()
    
    plain = f"{uid}{BOX_WRITE_VALID}{mac_rev_hex}".encode("utf-8")
    md5_hash = hashlib.md5(plain).digest()
    return int.from_bytes(md5_hash[:4], byteorder="little")

def encode_varint(val: int) -> bytearray:
    """Encodes an integer into standard Protocol Buffers varint bytearray."""
    buf = bytearray()
    while val > 0x7F:
        buf.append((val & 0x7F) | 0x80)
        val >>= 7
    buf.append(val & 0x7F)
    return buf

def decode_varint(buffer: bytes, offset: int = 0) -> Tuple[int, int]:
    """Decodes a Protocol Buffers varint from a buffer starting at offset. Returns (value, new_offset)."""
    val = 0
    shift = 0
    idx = offset
    while idx < len(buffer):
        byte = buffer[idx]
        val |= (byte & 0x7F) << shift
        idx += 1
        if not (byte & 0x80):
            break
        shift += 7
    return val, idx

def battery_mv_to_percentage(batt_mv: int) -> int:
    """
    Converts raw lithium-polymer battery voltage (mV) to state-of-charge percentage (0-100%).
    Standard LiPo operational curve: 3.50V (empty) to 4.20V (full).
    """
    if batt_mv <= 3500:
        return 0
    if batt_mv >= 4200:
        return 100
    # Piecewise approximation for LiPo discharge curve
    pct = int(((batt_mv - 3500) / 700.0) * 100.0)
    return max(0, min(100, pct))

# ============================================================================
# PROTOCOL FRAME BUILDERS
# ============================================================================

def build_auth_response(seq: int) -> bytearray:
    """Builds WeChat AirSync AuthResponse (0x4E21) frame accepting authMethod=2."""
    body = bytearray([0x0A, 0x02, 0x08, 0x00, 0x12, 0x00])
    total_len = 8 + len(body)
    packet = bytearray([
        0xFE, 0x01,
        (total_len >> 8) & 0xFF, total_len & 0xFF,
        (CMD_AUTH_RESPONSE >> 8) & 0xFF, CMD_AUTH_RESPONSE & 0xFF,
        (seq >> 8) & 0xFF, seq & 0xFF,
    ]) + body
    return packet

def build_init_response(seq: int, challenge_bytes: bytes) -> bytearray:
    """
    Builds WeChat AirSync InitResponse (0x4E23) answering the clip's random security challenge
    with standard IEEE 802.3 CRC32 varint encoding.
    """
    crc = zlib.crc32(challenge_bytes) & 0xFFFFFFFF
    crc_varint = encode_varint(crc)
    body = bytearray([0x0A, 0x02, 0x08, 0x00, 0x20]) + crc_varint
    total_len = 8 + len(body)
    packet = bytearray([
        0xFE, 0x01,
        (total_len >> 8) & 0xFF, total_len & 0xFF,
        (CMD_INIT_RESPONSE >> 8) & 0xFF, CMD_INIT_RESPONSE & 0xFF,
        (seq >> 8) & 0xFF, seq & 0xFF,
    ]) + body
    return packet

def build_data_ack(seq: int) -> bytearray:
    """Builds WeChat AirSync SendDataResponse (0x4E22) ACK."""
    resp_body = bytearray([0x0A, 0x02, 0x08, 0x00])
    resp_len = 8 + len(resp_body)
    return bytearray([
        0xFE, 0x01,
        (resp_len >> 8) & 0xFF, resp_len & 0xFF,
        (CMD_SEND_DATA_RESPONSE >> 8) & 0xFF, CMD_SEND_DATA_RESPONSE & 0xFF,
        (seq >> 8) & 0xFF, seq & 0xFF,
    ]) + resp_body

def build_tinylogics_frame(cmd_id: int, uid: int, seq: int, payload: bytes = b"") -> bytearray:
    """
    Wraps a TinyLogics inner command into the outer AirSync SwitchView / Command framing (0x7531).
    """
    total_inner_len = len(payload) + 17
    inner_header = bytearray([
        0x01,
        total_inner_len & 0xFF, (total_inner_len >> 8) & 0xFF,
        cmd_id & 0xFF, (cmd_id >> 8) & 0xFF,
        0x00, 0x00,
    ]) + uid.to_bytes(8, byteorder="little") + seq.to_bytes(2, byteorder="little")
    
    inner_body = inner_header + payload
    proto_body = bytearray([0x0A, 0x00, 0x12]) + encode_varint(len(inner_body)) + inner_body

    outer_total_len = len(proto_body) + 8
    outer_header = bytearray([
        0xFE, 0x01,
        (outer_total_len >> 8) & 0xFF, outer_total_len & 0xFF,
        0x75, 0x31, # 30001
        (seq >> 8) & 0xFF, seq & 0xFF,
    ])
    return outer_header + proto_body

def build_challenge_frame(write_key: int, uid: int, seq: int) -> bytearray:
    """Builds Cmd 27514 (SendChallenge) frame using the 32-bit writeKey."""
    payload = write_key.to_bytes(4, byteorder="little")
    return build_tinylogics_frame(TINY_CMD_SEND_CHALLENGE, uid, seq, payload)

def build_bind_reset_frame(write_key: int, uid: int, seq: int) -> bytearray:
    """Builds Cmd 27507 (BindUID / reset) frame to bind ownership to uid."""
    owner_id = uid.to_bytes(8, byteorder="little")
    key_bytes = write_key.to_bytes(4, byteorder="little")
    is_to_reset = bytes([0x01])
    payload = owner_id + key_bytes + is_to_reset
    return build_tinylogics_frame(TINY_CMD_BIND_RESET, uid, seq, payload)

def build_heartbeat_frame(uid: int, seq: int, timestamp: Optional[int] = None) -> bytearray:
    """Builds Cmd 26509 (Heartbeat) frame carrying current unix epoch."""
    import time
    ts = timestamp or int(time.time())
    payload = bytes([(ts >> 24) & 0xFF, (ts >> 16) & 0xFF, (ts >> 8) & 0xFF, ts & 0xFF])
    return build_tinylogics_frame(TINY_CMD_HEARTBEAT, uid, seq, payload)

# ============================================================================
# PACKET PARSERS & DE-FRAMERS
# ============================================================================

def parse_tracker_real_data(payload: bytes) -> Dict[str, Any]:
    """
    Parses Cmd 27524 (TrackerRealDataEntry).
    Layout:
      - 0..3:  cur_time (uint32_le)
      - 4..5:  base_score (int16_le)
      - 9:     ktype (uint8 streak identifier)
      - 10..11: duration (uint16_le seconds)
      - 12..13: raw signal (uint16_le)
      - 14:    current state byte (0x1F mask = mind state)
      - 20:    focus depth (uint8)
      - 21:    calm score (uint8)
      - 22:    focus score (uint8)
    """
    if len(payload) < 20:
        return {}
    
    cur_time = int.from_bytes(payload[0:4], byteorder="little")
    base_score = int.from_bytes(payload[4:6], byteorder="little", signed=True)
    ktype = payload[9] if len(payload) > 9 else 0
    duration = int.from_bytes(payload[10:12], byteorder="little") if len(payload) > 11 else 0
    signal = int.from_bytes(payload[12:14], byteorder="little") if len(payload) > 13 else 0
    cur_state = payload[14] if len(payload) > 14 else 0
    focus_depth = payload[20] if len(payload) > 20 else 0
    calm = payload[21] if len(payload) > 21 else 0
    focus = payload[22] if len(payload) > 22 else 0

    state_idx = cur_state & 0x1F
    mental_state, mental_desc = MIND_STATES.get(state_idx, ("unknown", "Unknown"))
    streak_type = KTYPE_STREAKS.get(ktype, "focus")

    return {
        "timestamp_epoch": cur_time,
        "base_score": base_score,
        "streak_type": streak_type,
        "streak_duration": duration,
        "signal": signal,
        "state_index": state_idx,
        "mental_state": mental_state,
        "mental_state_label": mental_desc,
        "is_worn": (state_idx != 1),
        "focus_depth": focus_depth,
        "calm_score": calm,
        "focus_score": focus,
    }

def parse_realtime_data(payload: bytes) -> Dict[str, Any]:
    """
    Parses Cmd 27545 (FnRealTimeDataEntity).
    Layout:
      - 0: display_scale
      - 1: current_state_raw (upper bits: data_type, lower 5 bits: state_idx)
      - 2: focus_depth
      - 3: balancer_calm
      - 4..5: raw respiration signal (int16_le signed)
      - 6..7: AR(1) autoregressive motion parameter (int16_le signed)
      - Sub-packet at offset 18: Device status (battery mV, firmware, device name) when data_type == 32
    """
    if len(payload) < 8:
        return {}

    display_scale = payload[0]
    raw_state = payload[1]
    data_type = raw_state & (-32)
    state_idx = raw_state & 0x1F

    focus_depth = payload[2]
    balancer_calm = payload[3]
    signal = int.from_bytes(payload[4:6], byteorder="little", signed=True)
    ar1 = int.from_bytes(payload[6:8], byteorder="little", signed=True)

    mental_state, mental_desc = MIND_STATES.get(state_idx, ("unknown", "Unknown"))

    out: Dict[str, Any] = {
        "signal": abs(signal),
        "raw_signal": signal,
        "ar1_param": ar1,
        "display_scale": display_scale,
        "state_index": state_idx,
        "mental_state": mental_state,
        "mental_state_label": mental_desc,
        "is_worn": (state_idx != 1),
        "focus_depth": focus_depth,
        "balancer_calm": balancer_calm,
    }

    # Device Status sub-packet (battery, firmware, name, uptime)
    if data_type == 32 and len(payload) >= 50:
        sub = payload[18:]
        if len(sub) >= 44:
            batt_mv = int.from_bytes(sub[4:6], byteorder="little")
            if 3300 <= batt_mv <= 4300:
                out["battery_mv"] = batt_mv
                out["battery_level"] = battery_mv_to_percentage(batt_mv)

            # Firmware string (16 bytes)
            fw_bytes = sub[8:24]
            try:
                import re
                fw_raw = fw_bytes.decode("ascii", errors="ignore")
                fw_matches = re.findall(r'[0-9]+\.[0-9]+(?:\.[0-9]+)*', fw_raw)
                if fw_matches:
                    out["firmware_version"] = fw_matches[0]
                else:
                    cleaned = re.sub(r'[^a-zA-Z0-9._ -]', '', fw_raw).strip()
                    if cleaned:
                        out["firmware_version"] = cleaned
            except Exception:
                pass

            # Device name string (20 bytes)
            name_bytes = sub[24:44]
            try:
                import re
                name_raw = name_bytes.decode("ascii", errors="ignore")
                name_matches = re.findall(r'FOCI[ a-zA-Z0-9_-]*', name_raw)
                if name_matches:
                    out["device_name"] = name_matches[0].strip()
                else:
                    cleaned = re.sub(r'[^a-zA-Z0-9._ -]', '', name_raw).strip()
                    if cleaned:
                        out["device_name"] = cleaned
            except Exception:
                pass

            if len(sub) >= 48:
                out["uptime_seconds"] = int.from_bytes(sub[44:48], byteorder="little")

    return out
