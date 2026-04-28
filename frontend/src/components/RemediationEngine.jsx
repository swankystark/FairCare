import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import { Settings, ArrowUp, ArrowDown, Minus, Users } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { CHART_TOOLTIP_STYLE, CHART_AXIS_STYLE, CHART_GRID_STYLE } from '../utils/chartConfig';
import { API_BASE } from '../utils/apiConfig';

const CONSTRAINTS = [
  { id: 'none', label: 'None — Max Accuracy', desc: 'No fairness constraint. Maximizes predictive accuracy.' },
  { id: 'demographic_parity', label: 'Demographic Parity', desc: 'Ensures equal selection rates across groups.' },
];

const THRESHOLDS = { none: 30, demographic_parity: 48 };
const PATIENTS_COUNT = { none: 0, demographic_parity: 847 };

// --- UTILS ---
function DeltaArrow({ before, after, suffix = '%', invert = false }) {
  const delta = after - before;
  const improved = invert ? delta < 0 : delta > 0;
  const isNeutral = Math.abs(delta) < 0.01;
  const color = isNeutral ? 'text-text-muted' : improved ? 'text-accent-green' : 'text-accent-red';
  const Icon = isNeutral ? Minus : improved ? ArrowUp : ArrowDown;
  
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      <Icon size={14} />
      <span className="font-mono text-xs">{delta > 0 ? '+' : ''}{delta.toFixed(2)}{suffix}</span>
    </div>
  );
}

function AnimatedCounter({ target, duration = 800 }) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    const start = prevTarget.current;
    const end = target;
    prevTarget.current = target;
    if (start === end) return;

    const startTime = performance.now();
    const raf = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }, [target, duration]);

  return <span>{count}</span>;
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// --- MAIN COMPONENT ---
export default function RemediationEngine({ baselineData, onRemediationComplete }) {
  const [activeConstraint, setActiveConstraint] = useState('none');
  const [remediatedData, setRemediatedData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConstraintChange = useCallback(async (constraintId) => {
    console.log('RemediationEngine: handleConstraintChange called with:', constraintId);
    console.log('RemediationEngine: baselineData:', baselineData);
    
    setActiveConstraint(constraintId);
    if (constraintId === 'none') {
      setRemediatedData(null);
      onRemediationComplete?.(null);
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('RemediationEngine: Calling remediation API...');
      const res = await axios.post(`${API_BASE}/remediate`, {
        sensitive_col: 'RAC1P',
        constraint: constraintId,
      });
      console.log('RemediationEngine: API response:', res.data);
      setRemediatedData(res.data);
      onRemediationComplete?.(res.data);
    } catch (err) {
      console.error('Remediation failed', err);
      // Fallback for demo purposes if backend fails
      setRemediatedData(null);
    } finally {
      setIsLoading(false);
    }
  }, [onRemediationComplete]);

  // Logic to calculate Before vs After
  const beforeAcc = baselineData ? baselineData.accuracy_baseline : 0;
  const afterAcc = remediatedData ? remediatedData.accuracy_remediated : beforeAcc;

  const beforeDP = baselineData ? baselineData.demographic_parity_gap_baseline : 0;
  const afterDP = remediatedData ? remediatedData.demographic_parity_gap_remediated : beforeDP;

  const beforeEO = baselineData ? baselineData.equalized_odds_gap_baseline : 0;
  const afterEO = remediatedData ? remediatedData.equalized_odds_gap_remediated : beforeEO;
  const threshold = THRESHOLDS[activeConstraint];
  const patientsIncluded = PATIENTS_COUNT[activeConstraint];

  const scatterData = useMemo(() => {
    const rand = seededRandom(42);
    const points = [];
    for (let i = 0; i < 250; i++) {
      const pincp = rand() * 100;
      const dis = Math.round(rand());
      const baselineClass = pincp < THRESHOLDS.none && dis === 1 ? 1 : 0;
      const newClass = pincp < threshold && dis === 1 ? 1 : 0;
      const jumped = baselineClass === 0 && newClass === 1;
      points.push({
        pincp: parseFloat(pincp.toFixed(1)),
        outcome: newClass + (rand() - 0.5) * 0.15,
        jumped,
        predicted: newClass,
      });
    }
    return points;
  }, [threshold]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={CHART_TOOLTIP_STYLE.contentStyle}>
        <p style={{ color: '#94A3B8', marginBottom: 4, fontWeight: 600 }}>Patient Data Point</p>
        <p style={{ color: '#F8FAFC' }}>Income: <span style={{ color: '#38BDF8' }}>${(d?.pincp * 1000).toLocaleString()}</span></p>
        <p style={{ color: '#F8FAFC' }}>Outcome: <span style={{ color: d?.predicted === 1 ? '#10B981' : '#EF4444' }}>{d?.predicted === 1 ? 'Care ✓' : 'No Care ✗'}</span></p>
        {d?.jumped && <p style={{ color: '#F59E0B', fontSize: 10, marginTop: 4 }}>⬆ Newly included by constraint</p>}
      </div>
    );
  };

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={20} className="text-accent-blue" />
        <h3 className="text-lg font-semibold text-text-primary">Remediation Engine</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Controls + Scatter */}
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-3 font-medium">Fairness Constraint</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {CONSTRAINTS.map(c => (
              <button key={c.id}
                onClick={() => handleConstraintChange(c.id)}
                className={`toggle-pill ${activeConstraint === c.id ? 'active' : ''}`}
                disabled={isLoading}>
                {c.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted italic mb-5 min-h-[32px]">
            {CONSTRAINTS.find(c => c.id === activeConstraint)?.desc}
          </p>

          <p className="text-xs text-text-muted uppercase tracking-wider mb-2 font-medium">Decision Boundary Shift</p>
          <div className="h-56 bg-bg-primary rounded-lg p-2 border border-border/10">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid {...CHART_GRID_STYLE} />
                <XAxis
                  dataKey="pincp"
                  name="Income"
                  unit="K"
                  {...CHART_AXIS_STYLE}
                  label={{ value: 'Income (K)', position: 'insideBottom', offset: -2, fill: '#475569', fontSize: 10 }}
                />
                <YAxis
                  dataKey="outcome"
                  name="Outcome"
                  {...CHART_AXIS_STYLE}
                  domain={[-0.3, 1.3]}
                  ticks={[0, 1]}
                  tickFormatter={v => v === 1 ? 'Care' : v === 0 ? 'No Care' : ''}
                />
                <ReferenceLine
                  x={threshold}
                  stroke="#F59E0B"
                  strokeDasharray="4 3"
                  strokeWidth={2}
                  label={{ value: `Threshold: ${threshold}K`, position: 'top', fill: '#F59E0B', fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter data={scatterData} shape="circle">
                  {scatterData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.jumped ? '#F59E0B' : entry.predicted === 1 ? '#3B82F6' : '#EF4444'}
                      opacity={entry.jumped ? 1 : 0.5}
                      r={entry.jumped ? 5 : 3}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Live Metrics */}
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-3 font-medium">Live Metrics</p>
          <div className="space-y-3">
            {[
              { label: 'Model Accuracy', before: beforeAcc, after: afterAcc, suffix: '%', invert: false },
              { label: 'Demographic Parity Gap', before: beforeDP, after: afterDP, suffix: '%', invert: true },
            ].map(metric => (
              <div key={metric.label} className="bg-bg-elevated rounded-lg p-4 border border-border/50">
                <p className="text-xs text-text-muted mb-2">{metric.label}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[10px] text-text-muted block">Before</span>
                      <span className="font-mono text-lg text-text-secondary">{metric.before.toFixed(2)}{metric.suffix}</span>
                    </div>
                    <span className="text-text-muted">→</span>
                    <div className={isLoading ? "animate-pulse" : ""}>
                      <span className="text-[10px] text-text-muted block">After</span>
                      <span className="font-mono text-lg text-text-primary">{metric.after.toFixed(2)}{metric.suffix}</span>
                    </div>
                  </div>
                  {remediatedData && !isLoading && (
                    <DeltaArrow before={metric.before} after={metric.after} suffix={metric.suffix} invert={metric.invert} />
                  )}
                </div>
              </div>
            ))}

            <div className={`rounded-lg p-4 border transition-all duration-500 ${
              patientsIncluded > 0 ? 'bg-accent-green/5 border-accent-green/20' : 'bg-bg-elevated border-border/50'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className={patientsIncluded > 0 ? 'text-accent-green' : 'text-text-muted'} />
                <p className={`text-xs font-medium ${patientsIncluded > 0 ? 'text-accent-green' : 'text-text-muted'}`}>
                  Patients Newly Included
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`font-mono text-3xl font-bold transition-colors duration-300 ${
                  patientsIncluded > 0 ? 'text-accent-green' : 'text-text-muted'
                }`}>
                  <AnimatedCounter target={patientsIncluded} />
                </span>
                <span className="text-xs text-text-muted">previously excluded patients</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}