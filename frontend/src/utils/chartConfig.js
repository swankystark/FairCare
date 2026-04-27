// Shared chart config for all Recharts components
export const GROUP_COLORS = {
  1: '#3B82F6', // blue
  2: '#06B6D4', // cyan
  3: '#10B981', // green
  4: '#EF4444', // red (Indigenous — excluded group)
  5: '#8B5CF6', // purple
  6: '#F59E0B', // amber
  7: '#EC4899', // pink
  8: '#14B8A6', // teal
  9: '#F97316', // orange
};

export const GROUP_LABELS = {
  1: 'White',
  2: 'Black/African American',
  3: 'American Indian',
  4: 'Alaska Native',
  5: 'Indigenous/Tribal',
  6: 'Asian',
  7: 'Pacific Islander',
  8: 'Other',
  9: 'Two or More Races',
};

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    background: '#111827',
    border: '1px solid #1E2D45',
    borderRadius: '8px',
    color: '#F8FAFC',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px',
    padding: '10px 14px',
  },
  labelStyle: {
    color: '#94A3B8',
    fontWeight: 600,
    marginBottom: '4px',
  },
  itemStyle: {
    color: '#F8FAFC',
  },
  cursor: { fill: 'rgba(59, 130, 246, 0.08)' },
};

export const CHART_AXIS_STYLE = {
  tick: {
    fill: '#475569',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
  },
  axisLine: { stroke: '#1E2D45' },
  tickLine: { stroke: '#1E2D45' },
};

export const CHART_GRID_STYLE = {
  stroke: '#1E2D45',
  strokeDasharray: '3 3',
  vertical: false,
};

export const CHART_ANIMATION = {
  animationDuration: 800,
  animationEasing: 'ease-out',
};
