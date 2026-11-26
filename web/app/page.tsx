'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Battery,
  Bluetooth,
  CheckCircle2,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  Flame,
  Github,
  HeartPulse,
  Radio,
  RefreshCw,
  Sliders,
  Sparkles,
  Terminal,
  Waves,
  Zap,
} from 'lucide-react';

import { MindOrb3D } from '../components/MindOrb3D';
import { Oscilloscope } from '../components/Oscilloscope';
import { MetricCard } from '../components/MetricCard';

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

export default function HomePage() {
  const [telemetry, setTelemetry] = useState<TelemetryState>(DEFAULT_TELEMETRY);
  const [mode, setMode] = useState<'synthetic' | 'live'>('synthetic');
  const [liveUrl, setLiveUrl] = useState('http://localhost:8080');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'architecture' | 'quickstart'>('cockpit');

  // Synthetic simulation generator
  useEffect(() => {
    if (mode !== 'synthetic') return;

    let t = 0;
    const interval = setInterval(() => {
      t += 0.1;
      const bpm = telemetry.respirationRate || 14.0;
      const freq = (bpm / 60.0) * Math.PI * 2.0;

      // Primary breathing wave + secondary high-frequency harmonic
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

  // Live SSE connection to local daemon if in live mode
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

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10 px-4 md:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/30 to-purple-600/30 border border-white/15 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">OpenFOCI</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  v0.1.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono hidden sm:block">
                Sovereign BLE Neurometrics & Visualizer
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('cockpit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                activeTab === 'cockpit'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Cockpit
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                activeTab === 'architecture'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Architecture
            </button>
            <button
              onClick={() => setActiveTab('quickstart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                activeTab === 'quickstart'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Quickstart
            </button>

            <a
              href="https://github.com/holy-script/OpenFOCI"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all border border-white/10 flex items-center gap-1.5 text-xs font-mono"
            >
              <Github className="w-4 h-4" />
              <span className="hidden md:inline">GitHub</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-8 flex-1 flex flex-col gap-8">
        {activeTab === 'cockpit' && (
          <div className="flex flex-col gap-8">
            {/* Mode Switcher & Device Status Banner */}
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
                  Firmware 2.0.7.0 • DA14580 SoC
                </span>
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
                    Synthetic Mode
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
                    Local Bridge
                  </button>
                </div>
              </div>
            </div>

            {/* Central Mind Orb Stage */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left Column: Metrics & Biometrics */}
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
                {/* State Badge Overlay */}
                <div className="mb-2 z-20 flex flex-col items-center">
                  <div
                    className={`px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-widest uppercase border shadow-lg ${getBadgeColor(
                      telemetry.mentalState
                    )}`}
                  >
                    {telemetry.mentalState} State
                  </div>
                </div>

                {/* WebGL 3D Canvas Container */}
                <div className="relative flex items-center justify-center">
                  <MindOrb3D
                    mentalState={telemetry.mentalState}
                    respirationRate={telemetry.respirationRate}
                    fluidity={telemetry.fluidity}
                    breathPhase={telemetry.breathPhase}
                    isWorn={telemetry.isWorn}
                  />

                  {/* Dynamic Radial Ambient Backlight */}
                  <div
                    className={`absolute inset-0 rounded-full blur-3xl opacity-25 pointer-events-none transition-all duration-700 ${
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

                {/* 10 Hz Oscilloscope Component */}
                <div className="w-full max-w-lg mt-4 z-20">
                  <Oscilloscope
                    samples={telemetry.samples}
                    mentalState={telemetry.mentalState}
                    respirationRate={telemetry.respirationRate}
                  />
                </div>
              </div>

              {/* Right Column: Physical State & Controls */}
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

            {/* Simulation Controller Panel */}
            {mode === 'synthetic' && (
              <div className="glass-panel rounded-2xl p-5 border border-white/10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    Interactive Physiological Presets
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Click to test real-time fluid orb &amp; waveform response
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <button
                    onClick={() => setPresetState('flow', 10.0, 92)}
                    className="px-3 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono transition-all text-center"
                  >
                    <span className="block font-bold">Deep Flow</span>
                    <span className="text-[10px] text-cyan-400/80">10 BPM • 92%</span>
                  </button>

                  <button
                    onClick={() => setPresetState('focus', 13.5, 84)}
                    className="px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono transition-all text-center"
                  >
                    <span className="block font-bold">Deep Focus</span>
                    <span className="text-[10px] text-purple-400/80">13.5 BPM • 84%</span>
                  </button>

                  <button
                    onClick={() => setPresetState('calm', 6.0, 95)}
                    className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono transition-all text-center"
                  >
                    <span className="block font-bold">Zen Calm</span>
                    <span className="text-[10px] text-emerald-400/80">6 BPM • 95%</span>
                  </button>

                  <button
                    onClick={() => setPresetState('stress', 22.0, 42)}
                    className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-mono transition-all text-center"
                  >
                    <span className="block font-bold">High Stress</span>
                    <span className="text-[10px] text-red-400/80">22 BPM • 42%</span>
                  </button>

                  <button
                    onClick={() => setPresetState('distracted', 16.0, 58)}
                    className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono transition-all text-center"
                  >
                    <span className="block font-bold">Distracted</span>
                    <span className="text-[10px] text-amber-400/80">16 BPM • 58%</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'architecture' && (
          <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-white">System Architecture &amp; Hardware Protocol</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                OpenFOCI connects directly to the physical Dialog Semiconductor DA14580 SoC over Bluetooth Low Energy using
                the WeChat AirSync binary profile. It operates 100% locally with zero cloud dependencies.
              </p>
            </div>

            {/* Architecture Card Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Cpu className="w-5 h-5" />
                  <h3 className="text-sm font-bold font-mono uppercase tracking-wider">Embedded SoC &amp; DSP</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Digital signal processing and zero-crossing frequency analysis execute entirely on the wearable&apos;s
                  ARM Cortex-M0 micro-controller. Telemetry frames (Cmd 27545 &amp; 27524) carry calibrated 10 Hz
                  diaphragmatic samples.
                </p>
              </div>

              <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-purple-400">
                  <Bluetooth className="w-5 h-5" />
                  <h3 className="text-sm font-bold font-mono uppercase tracking-wider">AirSync Handshake</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Negotiates Service <code>0xFEE7</code>, answering AuthRequest (0x2711) and solving the dynamic 4-byte CRC32
                  challenge in InitRequest (0x2713) to unlock raw continuous notification streaming on characteristic <code>0xFED8</code>.
                </p>
              </div>

              <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Code2 className="w-5 h-5" />
                  <h3 className="text-sm font-bold font-mono uppercase tracking-wider">Cryptographic WriteKey</h3>
                </div>
                <p className="text-xs text-zinc-400 font-mono leading-relaxed break-all bg-black/40 p-3 rounded-xl border border-white/5">
                  writeKey = MD5(UID + &quot;3BF608C70828&quot; + rev_mac)[:4]
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Validates device pairing without needing remote verification servers.
                </p>
              </div>

              <div className="glass-panel rounded-2xl p-5 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-amber-400">
                  <Zap className="w-5 h-5" />
                  <h3 className="text-sm font-bold font-mono uppercase tracking-wider">Pluggable Storage</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Stream biometric snapshots into SQLite time-series databases, high-frequency CSV files, atomic local
                  JSON state files, or push directly to Home Assistant via MQTT.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quickstart' && (
          <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
            <div className="space-y-3">
              <h2 className="text-2xl font-bold tracking-tight text-white">Developer Quickstart</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Get up and running with the OpenFOCI Python library and CLI in under 60 seconds.
              </p>
            </div>

            {/* Terminal Installation Box */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
              <div className="bg-black/60 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="text-xs font-mono text-zinc-400 ml-2">bash — openfoci-cli</span>
                </div>
                <button
                  onClick={() => copyCommand('pip install -e . && openfoci stream')}
                  className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="p-6 font-mono text-xs sm:text-sm text-zinc-200 bg-black/40 space-y-4">
                <div>
                  <span className="text-zinc-500"># 1. Clone &amp; install package in editable mode</span>
                  <div className="text-cyan-300 mt-1">git clone https://github.com/holy-script/OpenFOCI.git</div>
                  <div className="text-cyan-300">cd OpenFOCI &amp;&amp; pip install -e .</div>
                </div>

                <div>
                  <span className="text-zinc-500"># 2. Scan for your nearby charged FOCI clip</span>
                  <div className="text-purple-300 mt-1">openfoci scan</div>
                </div>

                <div>
                  <span className="text-zinc-500"># 3. Stream live telemetry with ASCII biofeedback meter</span>
                  <div className="text-emerald-300 mt-1">openfoci stream</div>
                </div>

                <div>
                  <span className="text-zinc-500"># 4. Launch local web visualizer &amp; SSE server</span>
                  <div className="text-amber-300 mt-1">openfoci serve --port 8080</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-white/10 px-4 md:px-8 py-6 mt-12 text-center text-xs font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            OpenFOCI — Sovereign Right-to-Repair Initiative. Released under the{' '}
            <a href="https://opensource.org/licenses/MIT" className="text-zinc-300 hover:underline">
              MIT License
            </a>
            .
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/holy-script/OpenFOCI"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
