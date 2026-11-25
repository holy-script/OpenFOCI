"""
OpenFOCI Universal Command-Line Interface.

Commands:
  openfoci scan             Scan for nearby FOCI BLE clips
  openfoci stream           Live terminal telemetry stream with ASCII biofeedback meter
  openfoci daemon           Run as background telemetry ingestion daemon
  openfoci serve            Launch the interactive Mind Orb web cockpit & SSE server
  openfoci status           Inspect the latest biometric snapshot and wear state
  openfoci export           Export recorded SQLite telemetry to CSV
"""

import sys
import os
import time
import json
import signal
import argparse
import asyncio
import threading
from pathlib import Path
from datetime import datetime

from openfoci import __version__
from openfoci.protocol import AIRSYNC_SERVICE_UUID
from openfoci.client import FociDevice, FociBleDriver, HAS_BLEAK
from openfoci.synthetic import run_synthetic_stream
from openfoci.storage.json_store import JsonStorage
from openfoci.storage.sqlite_store import SqliteStorage
from openfoci.storage.csv_store import CsvStorage
from openfoci.web_server import run_web_server, FociHttpHandler

# ANSI Terminal Colors
C_RESET   = "\033[0m"
C_BOLD    = "\033[1m"
C_CYAN    = "\033[36m"
C_GREEN   = "\033[32m"
C_YELLOW  = "\033[33m"
C_RED     = "\033[31m"
C_MAGENTA = "\033[35m"
C_BLUE    = "\033[34m"

DEFAULT_MAC = "a4:11:63:e0:7e:87"
DEFAULT_UID = 1001

async def cli_scan():
    if not HAS_BLEAK:
        print(f"{C_RED}Error: 'bleak' library is required for BLE scanning. Run: pip install bleak{C_RESET}")
        sys.exit(1)
    from bleak import BleakScanner

    print(f"{C_CYAN}🔍 Scanning for nearby BLE devices (8 seconds)...{C_RESET}")
    devices = await BleakScanner.discover(timeout=8.0, return_adv=True)

    print("\n" + "=" * 76)
    print(f"{'DEVICE NAME':<26} {'BLE ADDRESS / UUID':<36} {'RSSI':<8} {'MATCH'}")
    print("=" * 76)

    matches = 0
    for d, adv in devices.values():
        name = d.name or (adv.local_name if adv else None) or "Unknown"
        rssi = adv.rssi if adv else "N/A"
        is_foci = "foci" in name.lower() or (d.address and d.address.lower() == DEFAULT_MAC.lower())
        match_str = f"{C_GREEN}★ FOCI DETECTED{C_RESET}" if is_foci else ""
        if is_foci:
            matches += 1
        print(f"{name:<26} {d.address:<36} {rssi} dBm   {match_str}")

    print("=" * 76)
    print(f"Total discovered: {len(devices)} | FOCI targets: {matches}\n")

def render_ascii_meter(value: float, max_val: float = 30.0, width: int = 16) -> str:
    """Renders a smooth ASCII level meter."""
    filled = int(min(width, max(0, (value / max_val) * width)))
    return f"[{'█' * filled}{'░' * (width - filled)}]"

def format_state_pill(st: str) -> str:
    st_upper = st.upper()
    if st == "flow":
        return f"{C_CYAN}{C_BOLD}{st_upper}{C_RESET}"
    if st == "focus":
        return f"{C_MAGENTA}{C_BOLD}{st_upper}{C_RESET}"
    if st == "calm":
        return f"{C_GREEN}{C_BOLD}{st_upper}{C_RESET}"
    if st == "stress":
        return f"{C_RED}{C_BOLD}{st_upper}{C_RESET}"
    return f"{C_YELLOW}{st_upper}{C_RESET}"

async def cli_stream(args):
    device = FociDevice(mac=args.device, uid=args.uid)
    json_store = JsonStorage(args.json_out) if args.json_out else None
    sqlite_store = SqliteStorage(args.db) if args.db else None
    csv_store = CsvStorage(args.csv_out) if args.csv_out else None

    def on_telemetry(snapshot):
        if json_store:
            json_store.save(snapshot)
        if sqlite_store:
            sqlite_store.save(snapshot)
        if csv_store:
            csv_store.save(snapshot)
        FociHttpHandler.latest_snapshot = snapshot

    print(f"\n{C_BOLD}🫁 OpenFOCI Telemetry Engine v{__version__}{C_RESET}")
    print(f"   Target Device: {device.mac} (UID {device.uid})")
    print(f"   Mode: {'Synthetic Simulation' if args.synthetic else 'Physical BLE Link'}")
    if args.db:
        print(f"   SQLite Storage: {args.db}")
    if args.json_out:
        print(f"   JSON Snapshot:  {args.json_out}")
    print("-" * 65)

    last_render = 0.0

    def on_sample(sig):
        nonlocal last_render
        now = time.time()
        if now - last_render >= 1.0:
            last_render = now
            snap = device.build_snapshot()
            bpm = snap["breath"]["respirationRate"]
            fluidity = snap["breath"]["fluidity"]
            depth = snap["breath"]["diaphragmaticDepth"]
            batt = snap["batteryLevel"]
            st = snap["mentalState"]
            meter = render_ascii_meter(bpm, 25.0, 12)
            ts = datetime.now().strftime("%H:%M:%S")
            worn_icon = "✓" if snap["isWorn"] else "✗"

            print(
                f"[{ts}] {format_state_pill(st):<18} | "
                f"Resp: {bpm:4.1f} bpm {meter} | "
                f"Fluidity: {fluidity:2d}% | "
                f"Depth: {depth:2d}% | "
                f"Batt: {batt:2d}% [{worn_icon}]"
            )

    if args.synthetic:
        await run_synthetic_stream(device, on_telemetry=on_telemetry, on_sample=on_sample)
    else:
        if not HAS_BLEAK:
            print(f"{C_YELLOW}Bleak not installed. Falling back to synthetic simulation mode...{C_RESET}")
            await run_synthetic_stream(device, on_telemetry=on_telemetry, on_sample=on_sample)
        else:
            driver = FociBleDriver(device, on_telemetry=on_telemetry, on_sample=on_sample)
            await driver.run()

def cli_serve(args):
    device = FociDevice(mac=args.device, uid=args.uid)
    sqlite_store = SqliteStorage(args.db) if args.db else None
    json_store = JsonStorage(args.json_out) if args.json_out else None

    def on_telemetry(snapshot):
        if sqlite_store:
            sqlite_store.save(snapshot)
        if json_store:
            json_store.save(snapshot)
        FociHttpHandler.latest_snapshot = snapshot

    # Start telemetry source in background thread
    def telemetry_worker():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        if args.synthetic or not HAS_BLEAK:
            loop.run_until_complete(run_synthetic_stream(device, on_telemetry=on_telemetry))
        else:
            driver = FociBleDriver(device, on_telemetry=on_telemetry)
            loop.run_until_complete(driver.run())

    t = threading.Thread(target=telemetry_worker, daemon=True)
    t.start()

    server = run_web_server(storage=sqlite_store, host="0.0.0.0", port=args.port)
    url = f"http://localhost:{args.port}"
    print(f"\n{C_GREEN}{C_BOLD}⚡ OpenFOCI Mind Orb Cockpit running at: {url}{C_RESET}")
    print(f"   REST API:   {url}/api/telemetry")
    print(f"   SSE Stream: {url}/api/stream")
    print(f"   History:    {url}/api/history")
    print(f"   Press Ctrl+C to terminate.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping web server...")
        server.shutdown()

def cli_status(args):
    json_path = Path(args.json_out)
    if json_path.exists():
        try:
            data = json.loads(json_path.read_text(encoding="utf-8"))
            print("\n" + "=" * 60)
            print("🫁 OPENFOCI TELEMETRY STATUS SNAPSHOT")
            print("=" * 60)
            print(f"  Device:       {data.get('deviceName')} ({data.get('deviceId')})")
            print(f"  Link:         {'🟢 CONNECTED' if data.get('isConnected') else '⚪ DISCONNECTED'}")
            print(f"  Placement:    {'✓ Worn on waist' if data.get('isWorn') else '✗ Not worn / resting'}")
            print(f"  Battery:      {data.get('batteryLevel')}% ({data.get('batteryMv', 3900)} mV)")
            print(f"  Mental State: {data.get('mentalState', '').upper()}")
            print(f"  Respiration:  {data.get('breath', {}).get('respirationRate', 0)} breaths/min")
            print(f"  Fluidity:     {data.get('breath', {}).get('fluidity', 0)}% rhythm coherence")
            print(f"  Depth:        {data.get('breath', {}).get('diaphragmaticDepth', 0)}% diaphragmatic excursion")
            print(f"  Vitality:     {data.get('scores', {}).get('vitalityScore', 0):+.2f} score impact")
            print(f"  Timestamp:    {data.get('timestamp')}")
            print("=" * 60 + "\n")
            return
        except Exception as e:
            print(f"{C_RED}Error reading snapshot: {e}{C_RESET}")
            return

    # Check SQLite
    db_path = Path(args.db)
    if db_path.exists():
        store = SqliteStorage(str(db_path))
        latest = store.get_latest()
        if latest:
            print(f"\nLatest SQLite record: {latest.get('mentalState')} | {latest.get('breath', {}).get('respirationRate')} bpm")
            return

    print(f"{C_YELLOW}No active OpenFOCI telemetry found at {json_path} or {db_path}.{C_RESET}")

def cli_export(args):
    db_path = Path(args.db)
    if not db_path.exists():
        print(f"{C_RED}Error: SQLite database {db_path} does not exist.{C_RESET}")
        sys.exit(1)
    store = SqliteStorage(str(db_path))
    count = store.export_to_csv(args.out)
    print(f"{C_GREEN}✓ Exported {count} telemetry records to {args.out}{C_RESET}")

def main():
    parser = argparse.ArgumentParser(
        prog="openfoci",
        description="OpenFOCI — Open-source BLE telemetry engine and Mind Orb visualizer for FOCI wearables."
    )
    parser.add_argument("--version", action="version", version=f"OpenFOCI {__version__}")
    subparsers = parser.add_subparsers(dest="command", help="Sub-commands")

    # scan
    p_scan = subparsers.add_parser("scan", help="Scan for nearby FOCI BLE clips")

    # stream
    p_stream = subparsers.add_parser("stream", help="Stream live telemetry to terminal")
    p_stream.add_argument("--device", type=str, default=DEFAULT_MAC, help=f"BLE MAC / UUID (default: {DEFAULT_MAC})")
    p_stream.add_argument("--uid", type=int, default=DEFAULT_UID, help=f"Pairing user ID (default: {DEFAULT_UID})")
    p_stream.add_argument("--synthetic", action="store_true", help="Emulate FOCI clip with synthetic breathing wave")
    p_stream.add_argument("--db", type=str, default="openfoci.db", help="SQLite database output path")
    p_stream.add_argument("--json-out", type=str, default="foci_telemetry.json", help="JSON snapshot output path")
    p_stream.add_argument("--csv-out", type=str, default="", help="CSV high-frequency log output path")

    # daemon
    p_daemon = subparsers.add_parser("daemon", help="Run background telemetry collection daemon")
    p_daemon.add_argument("--device", type=str, default=DEFAULT_MAC, help="BLE MAC / UUID")
    p_daemon.add_argument("--uid", type=int, default=DEFAULT_UID, help="Pairing user ID")
    p_daemon.add_argument("--db", type=str, default="openfoci.db", help="SQLite database path")
    p_daemon.add_argument("--json-out", type=str, default="foci_telemetry.json", help="JSON snapshot path")

    # serve
    p_serve = subparsers.add_parser("serve", help="Launch interactive Mind Orb web cockpit")
    p_serve.add_argument("--port", type=int, default=8080, help="Web server port (default: 8080)")
    p_serve.add_argument("--device", type=str, default=DEFAULT_MAC, help="BLE MAC / UUID")
    p_serve.add_argument("--uid", type=int, default=DEFAULT_UID, help="Pairing user ID")
    p_serve.add_argument("--synthetic", action="store_true", help="Run with synthetic simulated biometrics")
    p_serve.add_argument("--db", type=str, default="openfoci.db", help="SQLite database path")
    p_serve.add_argument("--json-out", type=str, default="foci_telemetry.json", help="JSON snapshot path")

    # status
    p_status = subparsers.add_parser("status", help="Inspect latest recorded telemetry snapshot")
    p_status.add_argument("--json-out", type=str, default="foci_telemetry.json", help="JSON snapshot path")
    p_status.add_argument("--db", type=str, default="openfoci.db", help="SQLite database path")

    # export
    p_export = subparsers.add_parser("export", help="Export SQLite telemetry to CSV")
    p_export.add_argument("--out", type=str, required=True, help="Destination CSV file path")
    p_export.add_argument("--db", type=str, default="openfoci.db", help="Source SQLite database path")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    if args.command == "scan":
        asyncio.run(cli_scan())
    elif args.command == "stream":
        asyncio.run(cli_stream(args))
    elif args.command == "daemon":
        args.synthetic = False
        args.csv_out = ""
        asyncio.run(cli_stream(args))
    elif args.command == "serve":
        cli_serve(args)
    elif args.command == "status":
        cli_status(args)
    elif args.command == "export":
        cli_export(args)

if __name__ == "__main__":
    main()
