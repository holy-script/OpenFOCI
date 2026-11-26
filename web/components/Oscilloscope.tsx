'use client';

import React, { useEffect, useRef } from 'react';

interface OscilloscopeProps {
  samples: number[];      // Array of raw / normalized 10 Hz samples
  mentalState: string;
  respirationRate: number;
  className?: string;
}

const STATE_LINE_COLORS: Record<string, string> = {
  flow: '#06b6d4',
  focus: '#8b5cf6',
  calm: '#10b981',
  stress: '#ef4444',
  distracted: '#f59e0b',
  not_worn: '#64748b',
};

export const Oscilloscope: React.FC<OscilloscopeProps> = ({
  samples,
  mentalState,
  respirationRate,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const activeColor = STATE_LINE_COLORS[mentalState.toLowerCase()] || '#06b6d4';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = window.devicePixelRatio || 1;
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw subtle background grid
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      const step = 24;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 2. Draw zero-crossing reference line
      const centerY = height / 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Draw Waveform Path
      if (samples && samples.length > 1) {
        ctx.save();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = activeColor;
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();

        const sliceWidth = width / (samples.length - 1);
        let x = 0;

        for (let i = 0; i < samples.length; i++) {
          // Normalize sample: centered around 0, scale amplitude
          const val = samples[i];
          const y = centerY - val * (height * 0.4);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            // Smooth bezier interpolation
            const prevVal = samples[i - 1];
            const prevY = centerY - prevVal * (height * 0.4);
            const prevX = x - sliceWidth;
            const cx = (prevX + x) / 2;
            ctx.quadraticCurveTo(prevX, prevY, cx, (prevY + y) / 2);
          }
          x += sliceWidth;
        }

        ctx.stroke();

        // Semi-transparent gradient fill under waveform
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, centerY - height * 0.4, 0, height);
        grad.addColorStop(0, `${activeColor}33`);
        grad.addColorStop(1, `${activeColor}00`);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [samples, activeColor]);

  return (
    <div className={`relative w-full h-28 glass-panel rounded-xl p-2 overflow-hidden ${className}`}>
      <div className="absolute top-2 left-3 flex items-center gap-2 z-10 font-mono text-[10px] text-zinc-400 uppercase tracking-widest pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: activeColor }} />
        10 Hz Diaphragmatic Oscilloscope
      </div>
      <div className="absolute top-2 right-3 z-10 font-mono text-[10px] text-zinc-500 pointer-events-none">
        {respirationRate.toFixed(1)} BPM Peak Sync
      </div>
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
