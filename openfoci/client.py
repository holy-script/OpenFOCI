"""
OpenFOCI BLE Device Client & Asynchronous Protocol Driver.

Manages connection lifecycle, AirSync cryptographic handshake, challenge-response,
packet re-assembly across BLE MTU slices, and continuous biometric telemetry streaming.
"""

import sys
import time
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Callable, List

from openfoci.protocol import (
    AIRSYNC_SERVICE_UUID,
    INDICATE_CHAR_UUID,
    NOTIFY_CHAR_UUID,
    WRITE_CHAR_UUID,
    READ_CHAR_UUID,
    CMD_AUTH_REQUEST,
    CMD_INIT_REQUEST,
    CMD_SEND_DATA_REQUEST,
    TINY_CMD_DEV_STATUS,
    TINY_CMD_TRACKER_REAL_DATA,
    TINY_CMD_REALTIME_DATA,
    compute_write_key,
    build_auth_response,
    build_init_response,
    build_data_ack,
    build_challenge_frame,
    build_bind_reset_frame,
    build_heartbeat_frame,
    parse_tracker_real_data,
    parse_realtime_data,
)
from openfoci.analyzer import RollingBreathAnalyzer

logger = logging.getLogger("openfoci")

# BLE library check
try:
    from bleak import BleakScanner, BleakClient
    HAS_BLEAK = True
except ImportError:
    HAS_BLEAK = False

DEFAULT_MAC = "a4:11:63:e0:7e:87"
DEFAULT_UID = 1001

class FociDevice:
    """
    Representation of a physical or simulated FOCI biometric clip state.
    """
    def __init__(self, mac: str = DEFAULT_MAC, uid: int = DEFAULT_UID):
        self.mac = mac.lower()
        self.uid = uid
        self.write_key = compute_write_key(uid, mac)
        self.analyzer = RollingBreathAnalyzer()

        # Live State
        self.is_connected = False
        self.is_worn = True
        self.battery_level = 88
        self.battery_mv = 3900
        self.device_name = "FOCI 78"
        self.firmware_version = "2.0.7.0"
        self.uptime_seconds = 0
        self.current_mental_state = "focus"
        self.mental_state_confidence = 0.85
        self.streak_type = "focus"
        self.streak_duration = 0
        self.streak_score = 75
        self.calm_score = 75
        self.focus_score = 80
        self.last_update_time = 0.0

    def build_snapshot(self) -> Dict[str, Any]:
        """Builds a standardized dictionary of the latest biometric telemetry."""
        breath_metrics = self.analyzer.get_summary()

        vitality_delta = 0.0
        if self.current_mental_state == "flow":
            vitality_delta = 2.5
        elif self.current_mental_state == "calm":
            vitality_delta = 1.8
        elif self.current_mental_state == "focus":
            vitality_delta = 1.0
        elif self.current_mental_state == "stress":
            vitality_delta = -2.2
        elif self.current_mental_state == "distraction":
            vitality_delta = -1.0

        vitality_scale = round(vitality_delta * (breath_metrics["fluidity"] / 100.0), 2)
        recovery_score = int(min(100, max(20, (self.battery_level * 0.3) + (breath_metrics["fluidity"] * 0.7))))

        return {
            "deviceId": self.mac,
            "deviceName": self.device_name,
            "isConnected": self.is_connected,
            "isWorn": self.is_worn,
            "batteryLevel": self.battery_level,
            "batteryMv": self.battery_mv,
            "firmwareVersion": self.firmware_version,
            "uptimeSeconds": self.uptime_seconds,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "mentalState": self.current_mental_state,
            "mentalStateConfidence": self.mental_state_confidence,
            "streak": {
                "type": self.streak_type,
                "durationSeconds": self.streak_duration,
                "score": self.streak_score,
            },
            "breath": breath_metrics,
            "scores": {
                "calmScore": self.calm_score,
                "focusScore": self.focus_score,
                "vitalityScore": vitality_scale,
                "recoveryScore": recovery_score,
            },
        }

class FociBleDriver:
    """
    Asynchronous CoreBluetooth / Linux BlueZ BLE protocol driver.
    """
    def __init__(
        self,
        device: FociDevice,
        on_telemetry: Optional[Callable[[Dict[str, Any]], None]] = None,
        on_sample: Optional[Callable[[int], None]] = None,
    ):
        self.device = device
        self.on_telemetry = on_telemetry
        self.on_sample = on_sample
        self.client: Optional[Any] = None
        self.rx_buffer = bytearray()
        self.session_seq = 0
        self.running = True
        self.last_heartbeat = time.time()

    async def safe_write(self, char_uuid: str, packet: bytearray):
        """Writes a packet to GATT characteristic in 20-byte ATT MTU slices."""
        if not self.client or not self.client.is_connected:
            return
        chunk_size = 20
        for i in range(0, len(packet), chunk_size):
            chunk = packet[i : i + chunk_size]
            try:
                await self.client.write_gatt_char(char_uuid, chunk, response=True)
            except Exception:
                try:
                    await self.client.write_gatt_char(char_uuid, chunk, response=False)
                except Exception as e:
                    logger.debug(f"Write error chunk {i}: {e}")
            await asyncio.sleep(0.015)

    async def _process_full_frame(self, frame: bytes):
        if len(frame) < 8:
            return
        cmd_id = (frame[4] << 8) | frame[5]
        seq = (frame[6] << 8) | frame[7]
        body = frame[8:]

        if cmd_id == CMD_AUTH_REQUEST:
            logger.info("Received AirSync AuthRequest (0x2711). Sending AuthResponse...")
            auth_resp = build_auth_response(seq)
            await self.safe_write(WRITE_CHAR_UUID, auth_resp)

        elif cmd_id == CMD_INIT_REQUEST:
            logger.info("Received AirSync InitRequest (0x2713). Computing challenge CRC32...")
            challenge = body[4 : 4 + body[3]] if len(body) >= 6 and body[2] == 0x1A else b"\x00\x00\x00\x00"
            init_resp = build_init_response(seq, challenge)
            await self.safe_write(WRITE_CHAR_UUID, init_resp)
            await asyncio.sleep(0.3)
            # Send hardware challenge writeKey
            self.session_seq += 1
            challenge_pkt = build_challenge_frame(self.device.write_key, self.device.uid, self.session_seq)
            await self.safe_write(WRITE_CHAR_UUID, challenge_pkt)

        elif cmd_id == CMD_SEND_DATA_REQUEST:
            # Send immediate ACK
            ack = build_data_ack(seq)
            await self.safe_write(WRITE_CHAR_UUID, ack)

            # Unpack inner body: 0a 00 12 <varint_len> <inner>
            if len(body) > 4 and body[0] == 0x0A and body[1] == 0x00 and body[2] == 0x12:
                inner_start = 4 if body[3] < 0x80 else 5
                inner = body[inner_start:]
                if len(inner) >= 17:
                    inner_cmd = inner[3] | (inner[4] << 8)
                    inner_err = inner[5] | (inner[6] << 8)
                    inner_payload = inner[17:]

                    if inner_cmd == TINY_CMD_DEV_STATUS:
                        if inner_err in [3, 4]:
                            logger.warning("Device status unpermitted. Sending bind reset...")
                            await asyncio.sleep(0.3)
                            self.session_seq += 1
                            bind_pkt = build_bind_reset_frame(self.device.write_key, self.device.uid, self.session_seq)
                            await self.safe_write(WRITE_CHAR_UUID, bind_pkt)
                            await asyncio.sleep(0.5)
                            self.session_seq += 1
                            ch_pkt = build_challenge_frame(self.device.write_key, self.device.uid, self.session_seq)
                            await self.safe_write(WRITE_CHAR_UUID, ch_pkt)
                        elif inner_err in [0, 1]:
                            self.device.is_connected = True
                            logger.info("FOCI pairing handshake SUCCESS. Telemetry stream unlocked.")

                    elif inner_cmd == TINY_CMD_TRACKER_REAL_DATA:
                        data = parse_tracker_real_data(inner_payload)
                        if data:
                            self.device.analyzer.add_sample(data["signal"])
                            self.device.streak_type = data["streak_type"]
                            self.device.streak_duration = data["streak_duration"]
                            self.device.streak_score = max(0, min(100, data["base_score"]))
                            self.device.current_mental_state = data["mental_state"]
                            self.device.is_worn = data["is_worn"]
                            if data["calm_score"] > 0:
                                self.device.calm_score = data["calm_score"]
                            if data["focus_score"] > 0:
                                self.device.focus_score = data["focus_score"]

                    elif inner_cmd == TINY_CMD_REALTIME_DATA:
                        data = parse_realtime_data(inner_payload)
                        if data:
                            self.device.analyzer.add_sample(data["signal"])
                            self.device.current_mental_state = data["mental_state"]
                            self.device.is_worn = data["is_worn"]
                            if "battery_level" in data:
                                self.device.battery_level = data["battery_level"]
                            if "battery_mv" in data:
                                self.device.battery_mv = data["battery_mv"]
                            if "firmware_version" in data:
                                self.device.firmware_version = data["firmware_version"]
                            if "device_name" in data:
                                self.device.device_name = data["device_name"]
                            if "uptime_seconds" in data:
                                self.device.uptime_seconds = data["uptime_seconds"]

                            if self.on_sample:
                                self.on_sample(data["signal"])

                    # Notify telemetry snapshot
                    if self.on_telemetry:
                        self.on_telemetry(self.device.build_snapshot())

    def _on_raw_data(self, chunk: bytearray):
        self.rx_buffer.extend(chunk)
        while len(self.rx_buffer) >= 4 and self.rx_buffer[0] == 0xFE and self.rx_buffer[1] == 0x01:
            expected_len = (self.rx_buffer[2] << 8) | self.rx_buffer[3]
            if len(self.rx_buffer) >= expected_len:
                full_frame = bytes(self.rx_buffer[:expected_len])
                self.rx_buffer = self.rx_buffer[expected_len:]
                asyncio.create_task(self._process_full_frame(full_frame))
            else:
                break

    async def send_heartbeat(self):
        """Transmits periodic keepalive heartbeat."""
        self.session_seq += 1
        hb = build_heartbeat_frame(self.device.uid, self.session_seq)
        await self.safe_write(WRITE_CHAR_UUID, hb)

    async def run(self):
        """Main connection and streaming loop."""
        if not HAS_BLEAK:
            raise RuntimeError("The 'bleak' library is required for physical BLE. Run: pip install bleak")

        logger.info(f"Scanning for FOCI clip ({self.device.mac})...")
        while self.running:
            try:
                device = await BleakScanner.find_device_by_filter(
                    lambda d, adv: (
                        (d.name and "foci" in d.name.lower()) or
                        (adv.local_name and "foci" in adv.local_name.lower()) or
                        (d.address and d.address.lower() == self.device.mac)
                    ),
                    timeout=8.0
                )

                if not device:
                    logger.debug("FOCI clip not discovered. Retrying in 4s...")
                    await asyncio.sleep(4.0)
                    continue

                logger.info(f"Discovered {device.name} ({device.address}). Connecting...")
                async with BleakClient(device, timeout=15.0) as client:
                    self.client = client
                    self.device.is_connected = True
                    logger.info("Connected to FOCI clip. Subscribing to AirSync channels...")

                    try:
                        await client.read_gatt_char(READ_CHAR_UUID)
                    except Exception:
                        pass

                    await client.start_notify(INDICATE_CHAR_UUID, lambda s, d: self._on_raw_data(d))
                    await client.start_notify(NOTIFY_CHAR_UUID, lambda s, d: self._on_raw_data(d))

                    logger.info("AirSync indication & notification channels active.")

                    while self.running and client.is_connected:
                        await asyncio.sleep(1.0)
                        if time.time() - self.last_heartbeat > 20.0:
                            await self.send_heartbeat()
                            self.last_heartbeat = time.time()

            except Exception as e:
                logger.warning(f"BLE connection lost or error: {e}. Reconnecting in 3s...")
                self.device.is_connected = False
                if self.on_telemetry:
                    self.on_telemetry(self.device.build_snapshot())
                await asyncio.sleep(3.0)
