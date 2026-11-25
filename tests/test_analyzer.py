"""
Unit tests for the RollingBreathAnalyzer respiration & coherence calculations.
"""

import time
import math
import pytest
from openfoci.analyzer import RollingBreathAnalyzer

def test_analyzer_initial_state():
    analyzer = RollingBreathAnalyzer(window_seconds=60.0)
    summary = analyzer.get_summary()
    assert "respirationRate" in summary
    assert "fluidity" in summary
    assert "diaphragmaticDepth" in summary
    assert "breathWaveSamples" in summary
    assert summary["respirationRate"] == 14.0

def test_analyzer_rhythmic_breathing():
    analyzer = RollingBreathAnalyzer(window_seconds=60.0)
    
    # Simulate a steady 12 BPM breathing cycle (period = 5.0 seconds)
    # Sample at 10 Hz for 30 seconds
    dt = 0.1
    t = 0.0
    for _ in range(300):
        t += dt
        # Sine wave with amplitude 400
        val = int(400.0 * math.sin(2 * math.pi * (12.0 / 60.0) * t))
        analyzer.add_sample(val, timestamp=t)

    summary = analyzer.get_summary()
    # Respiration rate should converge close to 12 BPM
    assert 10.0 <= summary["respirationRate"] <= 14.5
    # High rhythm regularity should yield high fluidity
    assert summary["fluidity"] >= 60
    assert summary["diaphragmaticDepth"] > 0

def test_analyzer_reset():
    analyzer = RollingBreathAnalyzer()
    analyzer.add_sample(300)
    analyzer.add_sample(-300)
    analyzer.reset()
    assert len(analyzer.samples) == 0
    assert len(analyzer.recent_wave_samples) == 0
