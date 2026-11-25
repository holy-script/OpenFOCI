"""
Unit tests for OpenFOCI protocol parsing, cryptographic derivations, and framing.
"""

import zlib
import pytest
from openfoci.protocol import (
    compute_write_key,
    encode_varint,
    decode_varint,
    battery_mv_to_percentage,
    build_auth_response,
    build_init_response,
    build_data_ack,
    build_challenge_frame,
    build_bind_reset_frame,
    parse_tracker_real_data,
    parse_realtime_data,
    CMD_AUTH_RESPONSE,
    CMD_INIT_RESPONSE,
    CMD_SEND_DATA_RESPONSE,
)

def test_compute_write_key():
    # Test for physical MAC a4:11:63:e0:7e:87 and UID 1001
    mac = "a4:11:63:e0:7e:87"
    uid = 1001
    key = compute_write_key(uid, mac)
    assert isinstance(key, int)
    assert key > 0
    # Consistent output test
    assert compute_write_key(uid, mac) == key

def test_varint_roundtrip():
    values = [0, 1, 127, 128, 300, 16384, 0xFFFFFFFF]
    for v in values:
        encoded = encode_varint(v)
        decoded, offset = decode_varint(encoded)
        assert decoded == v
        assert offset == len(encoded)

def test_battery_voltage_curve():
    assert battery_mv_to_percentage(3400) == 0
    assert battery_mv_to_percentage(3500) == 0
    assert battery_mv_to_percentage(4200) == 100
    assert battery_mv_to_percentage(4300) == 100
    
    mid = battery_mv_to_percentage(3850)
    assert 45 <= mid <= 55

def test_build_auth_response():
    resp = build_auth_response(seq=42)
    assert resp[0] == 0xFE and resp[1] == 0x01
    cmd = (resp[4] << 8) | resp[5]
    seq = (resp[6] << 8) | resp[7]
    assert cmd == CMD_AUTH_RESPONSE
    assert seq == 42

def test_build_init_response():
    challenge = b"\x12\x34\x56\x78"
    resp = build_init_response(seq=10, challenge_bytes=challenge)
    assert resp[0] == 0xFE and resp[1] == 0x01
    cmd = (resp[4] << 8) | resp[5]
    assert cmd == CMD_INIT_RESPONSE
    assert len(resp) >= 14

def test_build_data_ack():
    ack = build_data_ack(seq=99)
    assert ack[0] == 0xFE and ack[1] == 0x01
    cmd = (ack[4] << 8) | ack[5]
    assert cmd == CMD_SEND_DATA_RESPONSE

def test_parse_tracker_real_data():
    # Construct mock TrackerRealDataEntry frame (len >= 23)
    payload = bytearray(28)
    # cur_time = 1000
    payload[0:4] = (1000).to_bytes(4, byteorder="little")
    # base_score = 80
    payload[4:6] = (80).to_bytes(2, byteorder="little")
    payload[9] = 10 # Flow streak
    # duration = 120s
    payload[10:12] = (120).to_bytes(2, byteorder="little")
    # signal = 350
    payload[12:14] = (350).to_bytes(2, byteorder="little")
    payload[14] = 6 # Deep focus
    payload[20] = 75 # focus_depth
    payload[21] = 85 # calm
    payload[22] = 90 # focus

    data = parse_tracker_real_data(bytes(payload))
    assert data["mental_state"] == "focus"
    assert data["streak_type"] == "flow"
    assert data["streak_duration"] == 120
    assert data["signal"] == 350
    assert data["is_worn"] is True

def test_parse_realtime_data():
    payload = bytearray(55)
    payload[0] = 1 # display_scale
    payload[1] = 32 | 5 # data_type=32 (with device status), state_idx=5 (calm)
    # signal = 400
    payload[4:6] = (400).to_bytes(2, byteorder="little", signed=True)
    # offset 18 is sub-packet
    # batt_mv at sub[4:6] -> payload[22:24]
    payload[22:24] = (3900).to_bytes(2, byteorder="little")
    # device name at sub[24:44] -> payload[42:62]
    name_bytes = b"FOCI 78\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00"
    payload[42:42 + len(name_bytes)] = name_bytes

    data = parse_realtime_data(bytes(payload))
    assert data["mental_state"] == "calm"
    assert data["signal"] == 400
    assert data["battery_mv"] == 3900
    assert data["battery_level"] > 0
    assert "FOCI" in data.get("device_name", "")
