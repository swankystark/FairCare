import React from 'react';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';

function ProgressRing({ value, max = 100, size = 80, strokeWidth = 6, color }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);

  const ringColor = color || (value < 70 ? '#EF4444' : value < 85 ? '#F59E0B' : '#10B981');

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background ring */}
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke="#1E2D45" strokeWidth={strokeWidth} />
      {/* Progress ring */}
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={ringColor} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className="progress-ring-circle" />
    </svg>
  );
}

export default function MetricCard({ title, value, unit = '', subtitle, type = 'number', ringMax, color, icon: Icon, animateFrom0 = true }) {
  const displayValue = useAnimatedCounter(
    animateFrom0 ? (typeof value === 'number' ? value : 0) : value,
    1200,
    animateFrom0
  );

  const getStatusColor = () => {
    if (color) return color;
    if (type === 'parity' && typeof value === 'number') {
      return value > 10 ? 'text-accent-red' : value > 5 ? 'text-accent-amber' : 'text-accent-green';
    }
    return 'text-text-primary';
  };

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">{title}</h3>
        {Icon && <Icon size={18} className="text-text-muted" />}
      </div>

      <div className="flex items-center gap-4">
        {type === 'ring' && (
          <ProgressRing value={typeof value === 'number' ? value : 0} max={ringMax || 100} color={color} />
        )}
        <div>
          <p className={`font-mono text-4xl font-bold ${getStatusColor()}`}>
            {typeof displayValue === 'number' ? (
              Number.isInteger(value) ? Math.round(displayValue) : displayValue.toFixed(value >= 100 ? 0 : 2)
            ) : value}
            <span className="text-xl ml-1">{unit}</span>
          </p>
        </div>
      </div>

      {subtitle && (
        <p className="text-xs text-text-muted mt-3">{subtitle}</p>
      )}
    </div>
  );
}
