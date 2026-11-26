'use client';

import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sublabel?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  sublabel,
  icon,
  accentColor = '#06b6d4',
  className = '',
}) => {
  return (
    <div
      className={`glass-panel glass-panel-hover rounded-xl p-4 flex flex-col justify-between relative overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
          {label}
        </span>
        {icon && (
          <div
            className="p-1.5 rounded-lg text-zinc-300"
            style={{ backgroundColor: `${accentColor}18` }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl md:text-3xl font-extrabold font-mono text-white tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono text-zinc-400 uppercase">
            {unit}
          </span>
        )}
      </div>

      {sublabel && (
        <div className="mt-2 text-[11px] text-zinc-500 font-mono truncate">
          {sublabel}
        </div>
      )}

      {/* Subtle bottom edge accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-75"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />
    </div>
  );
};
