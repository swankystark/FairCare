import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine, LabelList } from 'recharts';
import { CHART_TOOLTIP_STYLE, CHART_AXIS_STYLE, CHART_GRID_STYLE, CHART_ANIMATION } from '../utils/chartConfig';
import { AlertTriangle } from 'lucide-react';

const PROXY_FEATURES = ['PINCP', 'DIS'];

export default function ShapChart({ shapSummary }) {
  const chartData = useMemo(() => {
    if (!shapSummary) return [];
    return Object.entries(shapSummary)
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(4)),
        isProxy: PROXY_FEATURES.includes(name),
      }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [shapSummary]);

  if (!chartData.length) return null;

  const CustomLabel = ({ x, y, width, value, index }) => {
    const item = chartData[index];
    if (!item?.isProxy) return null;
    return (
      <g>
        <rect x={x + width + 8} y={y - 10} width={140} height={20} rx={4} fill="rgba(239,68,68,0.15)" stroke="#EF4444" strokeWidth={0.5} />
        <text x={x + width + 14} y={y + 4} fill="#EF4444" fontSize={10} fontWeight={600} fontFamily="'JetBrains Mono', monospace">
          ⚠ PROXY BIAS DETECTED
        </text>
      </g>
    );
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <AlertTriangle size={18} className="text-accent-amber" />
          Feature Influence (SHAP Analysis)
        </h3>
        <span className="text-xs text-text-muted">Sorted by absolute importance</span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 160 }}
            {...CHART_ANIMATION}>
            <CartesianGrid {...CHART_GRID_STYLE} horizontal={true} vertical={false} />
            <XAxis type="number" {...CHART_AXIS_STYLE} />
            <YAxis type="category" dataKey="name" width={70}
              {...CHART_AXIS_STYLE} />
            <Tooltip {...CHART_TOOLTIP_STYLE} />
            <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" label={{
              value: 'Decision Boundary', position: 'top',
              fill: '#475569', fontSize: 10, fontFamily: "'JetBrains Mono', monospace"
            }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.isProxy ? '#EF4444' : entry.value > 0 ? '#F59E0B' : '#10B981'} />
              ))}
              <LabelList content={<CustomLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
