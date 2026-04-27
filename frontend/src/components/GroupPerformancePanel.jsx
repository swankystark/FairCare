import React from 'react';
import { Check, AlertTriangle, X } from 'lucide-react';
import { GROUP_COLORS, GROUP_LABELS } from '../utils/chartConfig';

function getGroupStatus(rate) {
  if (rate === 0) return { icon: X, label: 'TOTAL EXCLUSION', color: 'text-accent-red', badge: 'bg-accent-red/20 text-accent-red border border-accent-red/40' };
  if (rate < 0.05) return { icon: AlertTriangle, label: 'At Risk', color: 'text-accent-amber', badge: 'bg-accent-amber/20 text-accent-amber border border-accent-amber/40' };
  return { icon: Check, label: 'Fair', color: 'text-accent-green', badge: 'bg-accent-green/20 text-accent-green border border-accent-green/40' };
}

export default function GroupPerformancePanel({ fairnessMetrics, selectedGroup, onGroupSelect }) {
  if (!fairnessMetrics || !fairnessMetrics.selection_rate) return null;

  const selectionRates = fairnessMetrics.selection_rate;
  const groups = Object.keys(selectionRates).sort((a, b) => Number(a) - Number(b));
  const maxRate = Math.max(...Object.values(selectionRates), 0.01);

  return (
    <div className="card p-6 h-full">
      <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4">
        Group Performance
      </h3>
      <div className="space-y-3">
        {groups.map((group, idx) => {
          const rate = selectionRates[group];
          const status = getGroupStatus(rate);
          const StatusIcon = status.icon;
          const barWidth = Math.max((rate / maxRate) * 100, 1);
          const groupColor = GROUP_COLORS[group] || '#6B7280';
          const isSelected = selectedGroup === group;

          return (
            <div
              key={group}
              onClick={() => onGroupSelect?.(isSelected ? null : group)}
              className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                isSelected ? 'bg-bg-elevated border border-accent-blue' : 'hover:bg-bg-elevated/50'
              }`}
              style={{ animation: `fade-in 0.4s ease ${idx * 100}ms forwards`, opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <StatusIcon size={14} className={status.color} />
                  <span className="text-sm text-text-primary font-medium">
                    Group {group}
                  </span>
                  <span className="text-xs text-text-muted hidden lg:inline">
                    {GROUP_LABELS[group] || ''}
                  </span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.badge}`}>
                  {status.label}
                </span>
              </div>

              {/* Bar */}
              <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: groupColor,
                    animationDelay: `${idx * 100}ms`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-text-muted">Selection Rate</span>
                <span className="text-[10px] font-mono text-text-secondary">
                  {(rate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
