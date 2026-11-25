#!/usr/bin/env python3
"""
OpenFOCI SQLite Session Analysis Example.
Queries historical sessions from the local SQLite database and computes metrics.
"""

from openfoci.storage.sqlite_store import SqliteStorage

def main():
    store = SqliteStorage("openfoci.db")
    history = store.get_history(limit=100)

    if not history:
        print("No historical telemetry records found in openfoci.db.")
        print("Run 'openfoci stream' or 'openfoci serve' to collect data first.")
        return

    total_records = len(history)
    states = [h.get("mentalState", "unknown") for h in history]
    bpms = [h.get("breath", {}).get("respirationRate", 14.0) for h in history]
    fluidities = [h.get("breath", {}).get("fluidity", 80) for h in history]

    avg_bpm = sum(bpms) / len(bpms)
    avg_fluidity = sum(fluidities) / len(fluidities)
    flow_count = states.count("flow") + states.count("focus")

    print("\n" + "=" * 50)
    print("📊 OPENFOCI SESSION ANALYTICS")
    print("=" * 50)
    print(f"  Analyzed Records:     {total_records}")
    print(f"  Average Respiration:  {avg_bpm:.1f} breaths/min")
    print(f"  Average Coherence:    {avg_fluidity:.1f}%")
    print(f"  Flow & Focus Ratio:   {(flow_count / total_records) * 100:.1f}%")
    print("=" * 50 + "\n")

if __name__ == "__main__":
    main()
