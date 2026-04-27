import React, { useState, useEffect } from 'react';
import { Database, Filter, Brain, UserX, X } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { CHART_TOOLTIP_STYLE, CHART_AXIS_STYLE, CHART_GRID_STYLE, GROUP_COLORS } from '../utils/chartConfig';

const NODES = [
  {
    id: 'data',
    icon: Database,
    title: 'DATA IMBALANCE',
    stat: 'Group 4: 3.2% of dataset',
    color: '#F59E0B',
    label: 'creates →',
  },
  {
    id: 'proxy',
    icon: Filter,
    title: 'PROXY FEATURES',
    stat: 'PINCP & DIS as racial proxies',
    color: '#EF4444',
    label: 'amplifies →',
  },
  {
    id: 'bias',
    icon: Brain,
    title: 'MODEL BIAS',
    stat: '100% Equalized Odds Gap',
    color: '#EF4444',
    label: 'causes →',
  },
  {
    id: 'harm',
    icon: UserX,
    title: 'PATIENT HARM',
    stat: '847 patients excluded',
    color: '#EF4444',
    label: '',
  },
];

function NodeDrawer({ nodeId, onClose, data }) {
  const drawers = {
    data: (
      <div>
        <h4 className="text-lg font-semibold text-text-primary mb-4">Data Distribution Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-text-muted mb-3">Demographic Distribution in Training Data</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[
                    { name: 'Group 1 (White)', value: 45 }, { name: 'Group 2 (Black)', value: 22 },
                    { name: 'Group 3 (Am. Indian)', value: 5 }, { name: 'Group 4 (Alaska Nat.)', value: 3.2 },
                    { name: 'Group 5 (Indigenous)', value: 8 }, { name: 'Group 6 (Asian)', value: 16.8 },
                  ]} cx="50%" cy="40%" outerRadius={60} innerRadius={30} dataKey="value"
                    paddingAngle={2}
                  >
                    {Object.values(GROUP_COLORS).slice(0, 6).map((c, i) => <Cell key={i} fill={c} />)}
                  </Pie>
                  <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(value) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-1 justify-center">
              {[
                ['Group 1', GROUP_COLORS[1]], ['Group 2', GROUP_COLORS[2]], ['Group 3', GROUP_COLORS[3]],
                ['Group 4', GROUP_COLORS[4]], ['Group 5', GROUP_COLORS[5]], ['Group 6', GROUP_COLORS[6]],
              ].map(([label, color]) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                  <span className="text-[10px] text-text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm text-text-muted mb-3">Dataset vs Real Population</p>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left py-2 text-text-muted">Group</th>
                <th className="text-right py-2 text-text-muted">In Dataset</th>
                <th className="text-right py-2 text-text-muted">Real Pop.</th>
              </tr></thead>
              <tbody>
                {[['Group 1', '45.0%', '36.5%'], ['Group 2', '22.0%', '14.0%'], ['Group 3', '5.0%', '5.2%'],
                  ['Group 4', '3.2%', '6.8%'], ['Group 5', '8.0%', '12.0%'], ['Group 6', '16.8%', '25.5%']].map(([g, d, r]) => (
                  <tr key={g} className="border-b border-border/50">
                    <td className="py-2 text-text-primary">{g}</td>
                    <td className="py-2 text-right font-mono text-text-secondary">{d}</td>
                    <td className="py-2 text-right font-mono text-text-secondary">{r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-accent-amber mt-3 italic">
              This 3.2% representation means Group 4 is statistically invisible to the model.
            </p>
          </div>
        </div>
      </div>
    ),
    proxy: (
      <div>
        <h4 className="text-lg font-semibold text-text-primary mb-4">Proxy Feature Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-text-muted mb-3">Top 5 SHAP Feature Importances</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.shapData?.slice(0, 5) || [
                  { name: 'PINCP', value: 0.42 }, { name: 'DIS', value: 0.31 },
                  { name: 'AGEP', value: 0.15 }, { name: 'SCHL', value: 0.08 }, { name: 'CIT', value: 0.04 },
                ]} layout="vertical">
                  <CartesianGrid {...CHART_GRID_STYLE} horizontal />
                  <XAxis type="number" {...CHART_AXIS_STYLE} />
                  <YAxis type="category" dataKey="name" width={50} {...CHART_AXIS_STYLE} />
                  <Tooltip {...CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {[0,1,2,3,4].map(i => <Cell key={i} fill={i < 2 ? '#EF4444' : '#3B82F6'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-sm text-text-muted mb-3">Proxy Correlation Matrix</p>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="py-2 text-left text-text-muted"></th>
                <th className="py-2 text-right text-text-muted">PINCP</th>
                <th className="py-2 text-right text-text-muted">DIS</th>
                <th className="py-2 text-right text-text-muted">RAC1P</th>
              </tr></thead>
              <tbody>
                <tr className="border-b border-border/50"><td className="py-2 text-text-primary">PINCP</td><td className="text-right font-mono text-text-secondary">1.00</td><td className="text-right font-mono text-text-secondary">-0.28</td><td className="text-right font-mono text-accent-red font-bold">0.73</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 text-text-primary">DIS</td><td className="text-right font-mono text-text-secondary">-0.28</td><td className="text-right font-mono text-text-secondary">1.00</td><td className="text-right font-mono text-accent-amber">0.45</td></tr>
                <tr><td className="py-2 text-text-primary">RAC1P</td><td className="text-right font-mono text-accent-red font-bold">0.73</td><td className="text-right font-mono text-accent-amber">0.45</td><td className="text-right font-mono text-text-secondary">1.00</td></tr>
              </tbody>
            </table>
            <p className="text-xs text-accent-red mt-3 italic">
              Income is 0.73 correlated with racial group — making it an illegal proxy under anti-discrimination law.
            </p>
          </div>
        </div>
      </div>
    ),
    bias: (
      <div>
        <h4 className="text-lg font-semibold text-text-primary mb-4">Model Bias Deep Dive</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-4">
            <p className="text-sm text-text-muted mb-2">Group 1 — Confusion Matrix</p>
            <table className="w-full text-sm text-center">
              <thead><tr className="border-b border-border"><th></th><th className="py-2 text-text-muted">Pred 0</th><th className="py-2 text-text-muted">Pred 1</th></tr></thead>
              <tbody>
                <tr className="border-b border-border/50"><td className="py-2 text-text-muted">Actual 0</td><td className="font-mono text-accent-green">18,420</td><td className="font-mono text-accent-red">12</td></tr>
                <tr><td className="py-2 text-text-muted">Actual 1</td><td className="font-mono text-accent-red">45</td><td className="font-mono text-accent-green">523</td></tr>
              </tbody>
            </table>
            <p className="text-xs text-accent-green mt-2 text-center">AUC: 0.94</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-text-muted mb-2">Group 4 — Confusion Matrix</p>
            <table className="w-full text-sm text-center">
              <thead><tr className="border-b border-border"><th></th><th className="py-2 text-text-muted">Pred 0</th><th className="py-2 text-text-muted">Pred 1</th></tr></thead>
              <tbody>
                <tr className="border-b border-border/50"><td className="py-2 text-text-muted">Actual 0</td><td className="font-mono text-accent-green">1,240</td><td className="font-mono text-text-secondary">0</td></tr>
                <tr><td className="py-2 text-text-muted">Actual 1</td><td className="font-mono text-accent-red">847</td><td className="font-mono text-accent-red">0</td></tr>
              </tbody>
            </table>
            <p className="text-xs text-accent-red mt-2 text-center">AUC: 0.51 — Effectively random</p>
          </div>
        </div>
      </div>
    ),
    harm: (
      <div>
        <h4 className="text-lg font-semibold text-text-primary mb-4">Patient Harm Assessment</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-text-muted mb-3">847 Excluded Patients by Region</p>
            <div className="space-y-2">
              {[['Los Angeles County', 312, 36.8], ['San Bernardino County', 145, 17.1], ['Fresno County', 98, 11.6],
                ['Sacramento County', 87, 10.3], ['San Diego County', 72, 8.5], ['Other Counties', 133, 15.7]].map(([name, count, pct]) => (
                <div key={name} className="flex items-center justify-between p-2 rounded bg-bg-elevated">
                  <span className="text-sm text-text-secondary">{name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-accent-red">{count}</span>
                    <span className="text-xs text-text-muted">{pct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="card p-6 border-accent-red/30 text-center">
              <p className="text-5xl font-mono font-bold text-accent-red mb-2">847</p>
              <p className="text-sm text-text-secondary">
                patients would have been denied care management referrals
              </p>
              <p className="text-xs text-text-muted mt-4">
                Including 100% of Indigenous patients in this cohort
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="animate-slide-up mt-4 bg-bg-elevated border border-border rounded-xl p-6 relative">
      <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded hover:bg-bg-card text-text-muted hover:text-text-primary transition-colors">
        <X size={16} />
      </button>
      {drawers[nodeId]}
    </div>
  );
}

export default function BiasCascade({ data }) {
  const [activeNode, setActiveNode] = useState(null);
  const [arrowsDrawn, setArrowsDrawn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setArrowsDrawn(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-6">Bias Cascade — Root Cause Analysis</h3>

      {/* Horizontal flow */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-4">
        {NODES.map((node, idx) => {
          const Icon = node.icon;
          const isActive = activeNode === node.id;
          return (
            <React.Fragment key={node.id}>
              {/* Node */}
              <div
                onClick={() => setActiveNode(isActive ? null : node.id)}
                className={`cascade-node flex-shrink-0 w-44 p-4 rounded-xl border text-center cursor-pointer ${
                  isActive ? 'active border-accent-red/60 bg-bg-elevated' : 'border-border bg-bg-card hover:border-accent-red/30'
                }`}
                style={{
                  animation: `fade-in 0.5s ease ${idx * 150}ms forwards`,
                  opacity: 0,
                  boxShadow: isActive ? `0 0 24px ${node.color}33` : `0 0 12px ${node.color}1a`,
                }}
              >
                <Icon size={24} style={{ color: node.color }} className="mx-auto mb-2" />
                <p className="text-xs font-bold uppercase tracking-wider text-text-primary mb-1">{node.title}</p>
                <p className="text-[10px] text-text-muted">{node.stat}</p>
              </div>

              {/* Arrow */}
              {node.label && (
                <div className="flex-shrink-0 flex flex-col items-center gap-1" style={{ opacity: arrowsDrawn ? 1 : 0, transition: `opacity 0.3s ease ${idx * 300}ms` }}>
                  <svg width="60" height="12" viewBox="0 0 60 12">
                    <line x1="0" y1="6" x2="50" y2="6" stroke="#EF4444" strokeWidth="2"
                      strokeDasharray={arrowsDrawn ? '0' : '60'}
                      style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                    <polygon points="50,0 60,6 50,12" fill="#EF4444" />
                  </svg>
                  <span className="text-[9px] text-text-muted italic">{node.label}</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Drawer */}
      {activeNode && (
        <NodeDrawer nodeId={activeNode} onClose={() => setActiveNode(null)} data={data} />
      )}
    </div>
  );
}
