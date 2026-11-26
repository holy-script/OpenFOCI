'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Battery,
  Bluetooth,
  CheckCircle2,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  ExternalLink,
  Flame,
  Github,
  HeartPulse,
  Layers,
  Lock,
  Radio,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  Unlock,
  Waves,
  Zap,
} from 'lucide-react';

import { MindOrb3D } from '../components/MindOrb3D';
import { Oscilloscope } from '../components/Oscilloscope';

export default function RepositoryHomePage() {
  const [copied, setCopied] = useState(false);
  const [previewState, setPreviewState] = useState<'flow' | 'focus' | 'calm' | 'stress'>('flow');
  const [samples, setSamples] = useState<number[]>([]);
  const [breathPhase, setBreathPhase] = useState(0);

  // Smooth preview breathing oscillation
  useEffect(() => {
    let t = 0;
    const interval = setInterval(() => {
      t += 0.1;
      const bpm = previewState === 'flow' ? 10.0 : previewState === 'calm' ? 6.0 : previewState === 'stress' ? 22.0 : 13.5;
      const freq = (bpm / 60.0) * Math.PI * 2.0;
      const primary = Math.sin(t * freq);
      const harmonic = Math.sin(t * freq * 2.1) * 0.15;
      const sample = primary + harmonic;

      setBreathPhase(t * freq);
      setSamples((prev) => {
        const next = [...prev.slice(-40), sample];
        while (next.length < 40) next.unshift(0);
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [previewState]);

  const copyCommand = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                  Open Source
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono hidden sm:block">
                Sovereign Biofeedback &amp; Wearable Telemetry
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 sm:gap-2">
            <a
              href="#mission"
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/5 transition-all hidden md:inline-block"
            >
              The Story
            </a>
            <a
              href="#reversing"
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/5 transition-all hidden md:inline-block"
            >
              Reverse-Engineering
            </a>
            <a
              href="#quickstart"
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-white hover:bg-white/5 transition-all hidden md:inline-block"
            >
              Quickstart
            </a>

            <Link
              href="/cockpit"
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1.5 text-xs font-mono font-semibold"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Launch Cockpit</span>
            </Link>

            <a
              href="https://github.com/holy-script/OpenFOCI"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all border border-white/10 flex items-center gap-1.5 text-xs font-mono"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20 pb-16 px-4 md:px-8 border-b border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Text */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono w-fit">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Local-First &amp; Zero Cloud Intermediaries
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
              Rescuing Orphaned Wearables with{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
                Sovereign Biofeedback
              </span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl">
              When Cambridge startup Tinylogics dissolved and deactivated their cloud authentication servers, thousands of
              waist-worn <strong>FOCI</strong> respiration clips were bricked. <strong>OpenFOCI</strong> is the open-source
              protocol driver, signal processing engine, and WebGL Mind Orb visualizer that brings them back to life.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/cockpit"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-mono text-sm font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
              >
                <span>Launch Live Cockpit Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <a
                href="#quickstart"
                className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 font-mono text-sm transition-all"
              >
                Developer Quickstart
              </a>
            </div>

            {/* Quick Metrics Banner */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 max-w-lg font-mono">
              <div>
                <span className="text-2xl font-bold text-white block">10 Hz</span>
                <span className="text-xs text-zinc-500 uppercase">Waveform Stream</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-cyan-400 block">0%</span>
                <span className="text-xs text-zinc-500 uppercase">Cloud Dependency</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-purple-400 block">&lt; 10ms</span>
                <span className="text-xs text-zinc-500 uppercase">Local Latency</span>
              </div>
            </div>
          </div>

          {/* Right Hero Interactive Teaser */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="glass-panel rounded-3xl p-6 border border-white/10 w-full max-w-md relative overflow-hidden shadow-2xl shadow-cyan-500/5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Live Mind Orb Teaser
                </span>
                <Link
                  href="/cockpit"
                  className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  Full Screen <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {/* 3D Orb Canvas Preview */}
              <div className="relative flex items-center justify-center my-2">
                <MindOrb3D
                  mentalState={previewState}
                  respirationRate={previewState === 'flow' ? 10.0 : previewState === 'calm' ? 6.0 : 14.0}
                  fluidity={previewState === 'flow' ? 92 : 80}
                  breathPhase={breathPhase}
                  isWorn={true}
                  size={260}
                />
              </div>

              {/* Mini Oscilloscope */}
              <div className="mt-4">
                <Oscilloscope
                  samples={samples}
                  mentalState={previewState}
                  respirationRate={previewState === 'flow' ? 10.0 : previewState === 'calm' ? 6.0 : 14.0}
                  className="h-20"
                />
              </div>

              {/* State Trigger Buttons */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {(['flow', 'focus', 'calm', 'stress'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setPreviewState(st)}
                    className={`py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all border ${
                      previewState === st
                        ? 'bg-white/15 text-white border-white/30 font-bold'
                        : 'bg-white/5 text-zinc-400 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Backstory & The Crowdfunding Story */}
      <section id="mission" className="py-16 md:py-24 px-4 md:px-8 border-b border-white/5 max-w-7xl mx-auto w-full">
        <div className="max-w-3xl space-y-4 mb-12">
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <Unlock className="w-3.5 h-3.5" />
            The Hardware Liberation Story
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            When the Cloud Dies, Hardware Shouldn&apos;t Become E-Waste
          </h2>
          <p className="text-base text-zinc-400 leading-relaxed">
            Between 2018 and 2021, Cambridge-based <strong>Tinylogics Ltd</strong> captured the quantified self world,
            raising nearly $1,000,000 from thousands of backers. Their miniature clip claimed to monitor diaphragmatic breathing
            excursions to compute cognitive flow streaks.
          </p>
        </div>

        {/* Backstory Milestone Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="text-xs font-mono uppercase text-zinc-500">2018 — 2021</div>
            <h3 className="text-lg font-bold text-white">The Crowdfunding Success</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tinylogics raised £189,000 from 2,341 backers on Kickstarter and over $700,000 on Indiegogo for FOCI 1 and FOCI 2.
            </p>
            <div className="pt-2 flex flex-col gap-1.5 text-xs font-mono">
              <a
                href="https://www.kickstarter.com/projects/661527809/foci-wearable-that-boosts-your-focus"
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                Kickstarter Campaign <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://www.indiegogo.com/projects/foci-2-boosts-your-focus-productivity-with-ai#/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline flex items-center gap-1"
              >
                Indiegogo FOCI 2 Campaign <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="text-xs font-mono uppercase text-red-400">September 2, 2025</div>
            <h3 className="text-lg font-bold text-white">Compulsory Dissolution</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tinylogics Ltd was formally dissolved via compulsory strike-off. Cloud authentication APIs went offline,
              the app was pulled, and devices were permanently locked out.
            </p>
            <div className="pt-2 flex flex-col gap-1.5 text-xs font-mono">
              <a
                href="https://find-and-update.company-information.service.gov.uk/company/08954266"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:underline flex items-center gap-1"
              >
                UK Companies House #08954266 <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://www.reddit.com/r/focigadget/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:underline flex items-center gap-1"
              >
                r/focigadget Community <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="text-xs font-mono uppercase text-emerald-400">Today</div>
            <h3 className="text-lg font-bold text-white">OpenFOCI Sovereign Revival</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              We reverse-engineered the raw Bluetooth Low Energy packets and cracked the cryptographic handshake to create
              a 100% offline, local-first driver and visualizer.
            </p>
            <div className="pt-2 text-xs font-mono text-emerald-400 font-semibold">
              Hardware fully revived &bull; Zero subscriptions
            </div>
          </div>
        </div>
      </section>

      {/* Reverse-Engineering Discoveries */}
      <section id="reversing" className="py-16 md:py-24 px-4 md:px-8 border-b border-white/5 max-w-7xl mx-auto w-full">
        <div className="max-w-3xl space-y-4 mb-12">
          <div className="text-xs font-mono uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Reverse-Engineering Dossier
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            What Was Actually Happening Inside the Clip
          </h2>
          <p className="text-base text-zinc-400 leading-relaxed">
            Through hardware disassembly, CoreBluetooth packet sniffing, and Android DEX deobfuscation, we uncovered the
            true internal architecture of the device:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <Cpu className="w-5 h-5" />
              <h3 className="text-base font-bold font-mono">1. Inference Runs 100% On-Device</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Contrary to marketing claims suggesting massive cloud intelligence, the digital signal processing, zero-crossing
              frequency detection, and mental state classifications execute directly on the wearable&apos;s embedded{' '}
              <strong className="text-zinc-200">Dialog Semiconductor DA14580 ARM Cortex-M0 SoC</strong>. The cloud backend was
              solely an authentication gate.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-purple-400">
              <Bluetooth className="w-5 h-5" />
              <h3 className="text-base font-bold font-mono">2. WeChat AirSync BLE Framing</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The clip does not use standard Bluetooth SIG heart rate profiles. It advertises under the Tencent / WeChat
              AirSync GATT profile (<code className="text-purple-300">0xFEE7</code>), requiring 20-byte MTU slicing and
              answering an AuthRequest (<code className="text-purple-300">0x2711</code>) with a 4-byte CRC32 challenge response.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <Code2 className="w-5 h-5" />
              <h3 className="text-base font-bold font-mono">3. Cryptographic WriteKey Equation</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              To unlock telemetry streaming, the peripheral requires a 32-bit authorization key derived locally via:
            </p>
            <div className="bg-black/50 p-3 rounded-xl border border-white/5 font-mono text-xs text-emerald-300">
              writeKey = MD5(UID + &quot;3BF608C70828&quot; + reversed_mac)[:4]
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Zap className="w-5 h-5" />
              <h3 className="text-base font-bold font-mono">4. Hardware Cradle Has No USB Data</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              The magnetic charging cradle exposes only 2 physical pogo pins (+5V VBUS and GND). There are no D+/D- USB lines
              or serial bridges on the board. All communication and Over-The-Air updates must take place via Bluetooth Low Energy.
            </p>
          </div>
        </div>
      </section>

      {/* Developer Quickstart Section */}
      <section id="quickstart" className="py-16 md:py-24 px-4 md:px-8 border-b border-white/5 max-w-7xl mx-auto w-full">
        <div className="max-w-3xl space-y-4 mb-12">
          <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5" />
            Developer Quickstart
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Connect to Your Clip in 60 Seconds
          </h2>
          <p className="text-base text-zinc-400 leading-relaxed">
            The standalone Python library and CLI are designed to run cleanly on macOS (CoreBluetooth) and Linux (BlueZ).
          </p>
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 max-w-3xl">
          <div className="bg-black/60 px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
              <span className="text-xs font-mono text-zinc-400 ml-2">Terminal Execution</span>
            </div>
            <button
              onClick={() => copyCommand('git clone https://github.com/holy-script/OpenFOCI.git\ncd OpenFOCI\npip install -e .\nopenfoci stream')}
              className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied to clipboard!' : 'Copy'}
            </button>
          </div>

          <div className="p-6 font-mono text-xs sm:text-sm text-zinc-200 bg-black/40 space-y-4">
            <div>
              <span className="text-zinc-500"># 1. Clone repository and install in editable mode</span>
              <div className="text-cyan-300 mt-1">git clone https://github.com/holy-script/OpenFOCI.git</div>
              <div className="text-cyan-300">cd OpenFOCI &amp;&amp; pip install -e .</div>
            </div>

            <div>
              <span className="text-zinc-500"># 2. Discover your nearby charged FOCI clip</span>
              <div className="text-purple-300 mt-1">openfoci scan</div>
            </div>

            <div>
              <span className="text-zinc-500"># 3. Stream real-time telemetry directly in your terminal</span>
              <div className="text-emerald-300 mt-1">openfoci stream</div>
            </div>

            <div>
              <span className="text-zinc-500"># 4. Launch local web server &amp; SSE telemetry stream</span>
              <div className="text-amber-300 mt-1">openfoci serve --port 8080</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="glass-panel border-t border-white/10 px-4 md:px-8 py-8 text-xs font-mono text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            OpenFOCI — Sovereign Right-to-Repair Initiative. Released under the{' '}
            <a href="https://opensource.org/licenses/MIT" className="text-zinc-300 hover:underline">
              MIT License
            </a>
            .
          </div>
          <div className="flex items-center gap-6">
            <Link href="/cockpit" className="text-cyan-400 hover:underline">
              Live Cockpit
            </Link>
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
