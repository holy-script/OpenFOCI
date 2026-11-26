'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  Battery,
  Flame,
  HeartPulse,
  Radio,
  Sliders,
  Waves,
  Zap,
} from 'lucide-react';

import { MindOrb3D } from '../../components/MindOrb3D';
import { Oscilloscope } from '../../components/Oscilloscope';
import { MetricCard } from '../../components/MetricCard';

interface TelemetryState {
  deviceId: string;
  deviceName: string;
  isConnected: boolean;
  isWorn: boolean;
  batteryLevel: number;
  batteryMv: number;
  mentalState: string;
  respirationRate: number;
  fluidity: number;
  diaphragmaticDepth: number;
  streakType: string;
  streakDurationMinutes: number;
  samples: number[];
  breathPhase: number;
}

const DEFAULT_TELEMETRY: TelemetryState = {
  deviceId: 'a4:11:63:e0:7e:87',
  deviceName: 'FOCI 78',
  isConnected: true,
  isWorn: true,
  batteryLevel: 88,
  batteryMv: 3900,
  mentalState: 'flow',
  respirationRate: 14.0,
  fluidity: 85,
  diaphragmaticDepth: 72,
  streakType: 'Focus Streak',
  streakDurationMinutes: 28,
  samples: Array.from({ length: 60 }, (_, i) => Math.sin(i * 0.2) * 0.5),
  breathPhase: 0,
};

export default function CockpitPage() {
  const [telemetry, setTelemetry] = useState<TelemetryState>(DEFAULT_TELEMETRY);
  const [mode, setMode] = useState<'synthetic' | 'live'>('synthetic');
  const [liveUrl, setLiveUrl] = useState('http://localhost:8080');

  // Synthetic simulation generator
  useEffect(() => {
    if (mode !== 'synthetic') return;

    let t = 0;
    const interval = setInterval(() => {
      t += 0.1;
      const bpm = telemetry.respirationRate || 14.0;
      const freq = (bpm / 60.0) * Math.PI * 2.0;

      const primary = Math.sin(t * freq);
      const harmonic = Math.sin(t * freq * 2.1) * 0.15;
      const noise = (Math.random() - 0.5) * 0.04;
      const newSample = Math.max(-1.0, Math.min(1.0, primary + harmonic + noise));

      setTelemetry((prev) => {
        const nextSamples = [...prev.samples.slice(1), newSample];
        return {
          ...prev,
          breathPhase: t * freq,
          samples: nextSamples,
        };
      });
    }, 100);

    return () => clearInterval(interval);
  }, [mode, telemetry.respirationRate]);

  // Live SSE connection to local daemon
  useEffect(() => {
    if (mode !== 'live') return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${liveUrl}/api/stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setTelemetry((prev) => ({
            ...prev,
            deviceId: data.deviceId || prev.deviceId,
            deviceName: data.deviceName || prev.deviceName,
            isConnected: data.isConnected ?? true,
            isWorn: data.isWorn ?? true,
            batteryLevel: data.batteryLevel ?? prev.batteryLevel,
            batteryMv: data.batteryMv ?? prev.batteryMv,
            mentalState: data.mentalState || prev.mentalState,
            respirationRate: data.breath?.respirationRate ?? prev.respirationRate,
            fluidity: data.breath?.fluidity ?? prev.fluidity,
            diaphragmaticDepth: data.breath?.diaphragmaticDepth ?? prev.diaphragmaticDepth,
            streakType: data.streakType || prev.streakType,
            streakDurationMinutes: data.streakDurationMinutes || prev.streakDurationMinutes,
          }));
        } catch (e) {
          console.error('Failed to parse SSE telemetry:', e);
        }
      };

      eventSource.onerror = () => {
        console.warn('Local SSE link error, verifying connection...');
      };
    } catch (e) {
      console.warn('Could not connect to live SSE daemon at', liveUrl);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [mode, liveUrl]);

  const setPresetState = (state: string, bpm: number, fluidity: number) => {
    setTelemetry((prev) => ({
      ...prev,
      mentalState: state,
      respirationRate: bpm,
      fluidity,
      diaphragmaticDepth: state === 'flow' ? 88 : state === 'calm' ? 76 : 52,
    }));
  };

  const getBadgeColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'flow':
        return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
      case 'focus':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'calm':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'stress':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      case 'distracted':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      default:
        return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-4 md:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all border border-white/10 flex items-center gap-1.5 text-xs font-mono"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Project Home</span>
            </Link>
            <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">Mind Orb Cockpit</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Live
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-black/40 p-1 rounded-xl border border-white/10 flex items-center gap-1">
              <button
                onClick={() => setMode('synthetic')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
                  mode === 'synthetic'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Synthetic
              </button>
              <button
                onClick={() => setMode('live')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 ${
                  mode === 'live'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                Local Daemon
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Cockpit Display */}
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex-1 flex flex-col gap-8">
        {/* Device Status Banner */}
        <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  telemetry.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                }`}
              />
              <span className="text-xs font-mono font-semibold text-white">
                {telemetry.deviceName} ({telemetry.deviceId})
              </span>
            </div>
            <span className="text-zinc-600 font-mono hidden sm:inline">|</span>
            <span className="text-xs font-mono text-zinc-400 hidden sm:inline">
              Firmware 2.0.7.0 • Dialog DA14580 SoC
            </span>
          </div>

          <div className="text-xs font-mono text-zinc-400">
            {mode === 'synthetic' ? 'Biological Harmonic Simulation (10 Hz)' : `Streaming from ${liveUrl}`}
          </div>
        </div>

        {/* Central Orb Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Biometric Metrics */}
          <div className="lg:col-span-3 flex flex-col gap-4 order-2 lg:order-1">
            <MetricCard
              label="Respiration Rate"
              value={telemetry.respirationRate.toFixed(1)}
              unit="BPM"
              sublabel="Diaphragmatic zero-crossing"
              icon={<HeartPulse className="w-4 h-4 text-cyan-400" />}
              accentColor="#06b6d4"
            />
            <MetricCard
              label="Rhythm Coherence"
              value={telemetry.fluidity}
              unit="%"
              sublabel="Inter-breath interval variance"
              icon={<Waves className="w-4 h-4 text-purple-400" />}
              accentColor="#8b5cf6"
            />
            <MetricCard
              label="Excursion Depth"
              value={telemetry.diaphragmaticDepth}
              unit="%"
              sublabel="Abdominal displacement"
              icon={<Activity className="w-4 h-4 text-emerald-400" />}
              accentColor="#10b981"
            />
          </div>

          {/* Center Column: 3D Chromatic Mind Orb */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center order-1 lg:order-2 relative py-4">
            <div className="mb-2 z-20 flex flex-col items-center">
              <div
                className={`px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-widest uppercase border shadow-lg ${getBadgeColor(
                  telemetry.mentalState
                )}`}
              >
                {telemetry.mentalState} State
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <MindOrb3D
                mentalState={telemetry.mentalState}
                respirationRate={telemetry.respirationRate}
                fluidity={telemetry.fluidity}
                breathPhase={telemetry.breathPhase}
                isWorn={telemetry.isWorn}
                size={340}
              />

              <div
                className={`absolute inset-0 rounded-full blur-3xl opacity-30 pointer-events-none transition-all duration-700 ${
                  telemetry.mentalState === 'flow'
                    ? 'bg-cyan-500'
                    : telemetry.mentalState === 'focus'
                    ? 'bg-purple-600'
                    : telemetry.mentalState === 'calm'
                    ? 'bg-emerald-500'
                    : telemetry.mentalState === 'stress'
                    ? 'bg-red-500'
                    : 'bg-amber-500'
                }`}
              />
            </div>

            <div className="w-full max-w-lg mt-4 z-20">
              <Oscilloscope
                samples={telemetry.samples}
                mentalState={telemetry.mentalState}
                respirationRate={telemetry.respirationRate}
              />
            </div>
          </div>

          {/* Right Column: Physical State */}
          <div className="lg:col-span-3 flex flex-col gap-4 order-3">
            <MetricCard
              label="Battery"
              value={`${telemetry.batteryLevel}%`}
              unit={`${telemetry.batteryMv} mV`}
              sublabel="Lithium-Polymer cell status"
              icon={<Battery className="w-4 h-4 text-emerald-400" />}
              accentColor="#10b981"
            />
            <MetricCard
              label="Current Streak"
              value={`${telemetry.streakDurationMinutes}m`}
              sublabel={telemetry.streakType}
              icon={<Flame className="w-4 h-4 text-amber-400" />}
              accentColor="#f59e0b"
            />
            <MetricCard
              label="Placement"
              value={telemetry.isWorn ? 'Worn' : 'Resting'}
              sublabel={telemetry.isWorn ? 'Active on waistband' : 'Table / Charging dock'}
              icon={<Zap className="w-4 h-4 text-cyan-400" />}
              accentColor="#06b6d4"
            />
          </div>
        </div>

        {/* Simulation Controls (when in Synthetic Mode) */}
        {mode === 'synthetic' && (
          <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Simulate Physiological Shifts
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                Observe how the 3D surface waves, specular shimmers, and oscilloscope adapt
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <button
                onClick={() => setPresetState('flow', 10.0, 92)}
                className="px-3 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-all text-center"
              >
                <span className="block font-bold">Deep Flow</span>
                <span className="text-[10px] text-cyan-400/80">10 BPM • 92%</span>
              </button>

              <button
                onClick={() => setPresetState('focus', 13.5, 84)}
                className="px-3 py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono transition-all text-center"
              >
                <span className="block font-bold">Deep Focus</span>
                <span className="text-[10px] text-purple-400/80">13.5 BPM • 84%</span>
              </button>

              <button
                onClick={() => setPresetState('calm', 6.0, 95)}
                className="px-3 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono transition-all text-center"
              >
                <span className="block font-bold">Zen Calm</span>
                <span className="text-[10px] text-emerald-400/80">6 BPM • 95%</span>
              </button>

              <button
                onClick={() => setPresetState('stress', 22.0, 42)}
                className="px-3 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-mono transition-all text-center"
              >
                <span className="block font-bold">High Stress</span>
                <span className="text-[10px] text-red-400/80">22 BPM • 42%</span>
              </button>

              <button
                onClick={() => setPresetState('distracted', 16.0, 58)}
                className="px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono transition-all text-center"
              >
                <span className="block font-bold">Distracted</span>
                <span className="text-[10px] text-amber-400/80">16 BPM • 58%</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-white/10 px-4 md:px-8 py-5 text-center text-xs font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>OpenFOCI Mind Orb Cockpit — Sovereign Right-to-Repair Initiative</div>
          <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
            Return to Project Overview
          </Link>
        </div>
      </footer>
    </div>
  );
}
