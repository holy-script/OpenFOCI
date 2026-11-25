/**
 * OpenFOCI Mind Orb & 10 Hz Diaphragmatic Waveform Renderer
 */

const STATE_COLORS = {
  flow: { hex: "#06b6d4", glow: "rgba(6, 182, 212, 0.5)" },
  focus: { hex: "#a855f7", glow: "rgba(168, 85, 247, 0.5)" },
  calm: { hex: "#10b981", glow: "rgba(16, 185, 129, 0.5)" },
  stress: { hex: "#ef4444", glow: "rgba(239, 68, 68, 0.5)" },
  distraction: { hex: "#64748b", glow: "rgba(100, 116, 139, 0.5)" },
  not_worn: { hex: "#475569", glow: "rgba(71, 85, 105, 0.3)" },
};

const orbCanvas = document.getElementById("orbCanvas");
const orbCtx = orbCanvas.getContext("2d");
const waveCanvas = document.getElementById("waveCanvas");
const waveCtx = waveCanvas.getContext("2d");

let phase = 0;
let currentColor = "#06b6d4";
let currentGlow = "rgba(6, 182, 212, 0.5)";
let waveSamples = [0.1, 0.4, 0.7, 0.5, 0.2, -0.2, -0.5, -0.2];

// ============================================================================
// CHROMATIC FLUID ORB RENDERING
// ============================================================================

function renderOrb() {
  const w = orbCanvas.width;
  const h = orbCanvas.height;
  orbCtx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const baseRadius = 115 + Math.sin(phase) * 14;

  // Radial fluid gradient
  const grad = orbCtx.createRadialGradient(cx, cy, 10, cx, cy, baseRadius + 25);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.35, currentColor);
  grad.addColorStop(0.8, currentColor + "70");
  grad.addColorStop(1, "transparent");

  orbCtx.fillStyle = grad;
  orbCtx.beginPath();

  // Multi-lobed harmonic deformation
  const lobes = 6;
  for (let angle = 0; angle < Math.PI * 2; angle += 0.04) {
    const deform = Math.sin(angle * lobes + phase * 2.2) * 8 + Math.cos(angle * 3 - phase) * 6;
    const r = baseRadius + deform;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (angle === 0) orbCtx.moveTo(x, y);
    else orbCtx.lineTo(x, y);
  }
  orbCtx.closePath();
  orbCtx.fill();

  // Outer diaphragmatic breath wave ripple
  orbCtx.strokeStyle = currentColor + "99";
  orbCtx.lineWidth = 2.5;
  orbCtx.beginPath();
  orbCtx.arc(cx, cy, baseRadius + 22 + Math.sin(phase * 1.6) * 6, 0, Math.PI * 2);
  orbCtx.stroke();

  phase += 0.035;
  requestAnimationFrame(renderOrb);
}

// ============================================================================
// 10 HZ RESPIRATION OSCILLOSCOPE
// ============================================================================

function renderWaveform() {
  const dpr = window.devicePixelRatio || 1;
  const w = (waveCanvas.width = waveCanvas.offsetWidth * dpr);
  const h = (waveCanvas.height = waveCanvas.offsetHeight * dpr);
  waveCtx.clearRect(0, 0, w, h);

  // Baseline center axis
  waveCtx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  waveCtx.lineWidth = 1 * dpr;
  waveCtx.beginPath();
  waveCtx.moveTo(0, h / 2);
  waveCtx.lineTo(w, h / 2);
  waveCtx.stroke();

  // Wave trace
  waveCtx.strokeStyle = currentColor;
  waveCtx.lineWidth = 3 * dpr;
  waveCtx.lineCap = "round";
  waveCtx.lineJoin = "round";
  waveCtx.beginPath();

  const step = w / Math.max(1, waveSamples.length - 1);
  for (let i = 0; i < waveSamples.length; i++) {
    const val = waveSamples[i];
    const x = i * step;
    const y = h / 2 - val * (h * 0.38);
    if (i === 0) waveCtx.moveTo(x, y);
    else waveCtx.lineTo(x, y);
  }
  waveCtx.stroke();
}

// ============================================================================
// TELEMETRY UPDATE HANDLER
// ============================================================================

function applyTelemetry(data) {
  if (!data) return;

  const st = (data.mentalState || "flow").toLowerCase();
  const cfg = STATE_COLORS[st] || STATE_COLORS.flow;
  currentColor = cfg.hex;
  currentGlow = cfg.glow;

  // Update Orb glow
  const glowElem = document.getElementById("orbGlow");
  if (glowElem) glowElem.style.background = currentGlow;

  // Header
  const connBadge = document.getElementById("connBadge");
  if (connBadge) {
    connBadge.innerText = data.isConnected ? "LIVE BLE" : "OFFLINE";
    connBadge.className = data.isConnected
      ? "text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
      : "text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700";
  }

  const deviceMeta = document.getElementById("deviceMeta");
  if (deviceMeta) deviceMeta.innerText = `${data.deviceName || "FOCI 78"} • Firmware ${data.firmwareVersion || "2.0.7.0"}`;

  const batteryDisplay = document.getElementById("batteryDisplay");
  if (batteryDisplay) batteryDisplay.innerText = `${data.batteryLevel || 88}% (${data.batteryMv || 3900} mV)`;

  const wornDisplay = document.getElementById("wornDisplay");
  if (wornDisplay) {
    wornDisplay.innerText = data.isWorn ? "WAIST WORN" : "RESTING";
    wornDisplay.className = data.isWorn ? "font-bold text-cyan-400" : "font-bold text-amber-400";
  }

  // Central Orb values
  const bpm = data.breath?.respirationRate ? Number(data.breath.respirationRate).toFixed(1) : "14.0";
  const bpmDisplay = document.getElementById("bpmDisplay");
  if (bpmDisplay) bpmDisplay.innerText = bpm;

  const stateBadge = document.getElementById("stateBadge");
  if (stateBadge) {
    stateBadge.innerText = st.toUpperCase();
    stateBadge.style.color = currentColor;
    stateBadge.style.borderColor = currentColor + "50";
    stateBadge.style.background = "rgba(0,0,0,0.6)";
  }

  // Cards
  const fluidity = data.breath?.fluidity ?? 85;
  const fluidityDisplay = document.getElementById("fluidityDisplay");
  if (fluidityDisplay) fluidityDisplay.innerText = `${fluidity}%`;
  const fluidityBar = document.getElementById("fluidityBar");
  if (fluidityBar) fluidityBar.style.width = `${fluidity}%`;

  const depth = data.breath?.diaphragmaticDepth ?? 70;
  const depthDisplay = document.getElementById("depthDisplay");
  if (depthDisplay) depthDisplay.innerText = `${depth}%`;
  const depthBar = document.getElementById("depthBar");
  if (depthBar) depthBar.style.width = `${depth}%`;

  const streakDisplay = document.getElementById("streakDisplay");
  if (streakDisplay) streakDisplay.innerText = `${Math.round((data.streak?.durationSeconds || 0) / 60)}m`;
  const streakLabel = document.getElementById("streakLabel");
  if (streakLabel) streakLabel.innerText = `${data.streak?.type || "Focus"} Streak`;

  const vitality = data.scores?.vitalityScore ?? 1.2;
  const vitalityDisplay = document.getElementById("vitalityDisplay");
  if (vitalityDisplay) vitalityDisplay.innerText = `${vitality >= 0 ? "+" : ""}${Number(vitality).toFixed(2)}`;

  const coherenceBadge = document.getElementById("coherenceBadge");
  if (coherenceBadge) coherenceBadge.innerText = `COHERENCE: ${fluidity}%`;

  // Wave samples
  if (data.breath?.breathWaveSamples && Array.isArray(data.breath.breathWaveSamples)) {
    waveSamples = data.breath.breathWaveSamples;
    renderWaveform();
  }
}

// ============================================================================
// REAL-TIME SSE STREAM & FALLBACK POLLING
// ============================================================================

function initStream() {
  if (window.EventSource) {
    const sse = new EventSource("/api/stream");
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        applyTelemetry(data);
      } catch (err) {}
    };
    sse.onerror = () => {
      // Revert to polling if SSE drops
      sse.close();
      setInterval(pollTelemetry, 1500);
    };
  } else {
    setInterval(pollTelemetry, 1500);
  }
}

async function pollTelemetry() {
  try {
    const res = await fetch("/api/telemetry");
    if (res.ok) {
      const data = await res.json();
      applyTelemetry(data);
    }
  } catch (e) {}
}

// Start
renderOrb();
renderWaveform();
initStream();
pollTelemetry();
