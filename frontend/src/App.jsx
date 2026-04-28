import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import axios from 'axios';
import { API_BASE } from './utils/apiConfig';

// Core components (always loaded)
import Topbar from './components/Topbar';
import HeroSection from './components/HeroSection';
import MetricCard from './components/MetricCard';
import GroupPerformancePanel from './components/GroupPerformancePanel';
import ShapChart from './components/ShapChart';
import ImpactMetrics from './components/ImpactMetrics';
import Footer from './components/Footer';

// Lazy loaded heavy components
const BiasCascade = lazy(() => import('./components/BiasCascade'));
const RemediationEngine = lazy(() => import('./components/RemediationEngine'));
const VoiceAudit = lazy(() => import('./components/VoiceAudit'));
const BiasPassport = lazy(() => import('./components/BiasPassport'));

import { Activity, ShieldAlert, Heart, BarChart3, Wrench, Brain, LayoutDashboard } from 'lucide-react';

function SectionSkeleton() {
  return (
    <div className="card p-6">
      <div className="skeleton h-6 w-48 mb-4 rounded" />
      <div className="skeleton h-48 w-full rounded-lg" />
    </div>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'analysis', label: 'Analysis', icon: BarChart3 },
  { id: 'remediation', label: 'Remediation', icon: Wrench },
  { id: 'insights', label: 'AI Insights', icon: Brain },
];

const App = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remediatedData, setRemediatedData] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const runAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/run-audit?sensitive_col=RAC1P`);
      setData(res.data);
    } catch (err) {
      console.error('Audit failed', err);
    }
    setLoading(false);
  }, []);

  // Memoize chart data
  const shapData = useMemo(() => {
    if (!data?.feature_importance) return [];
    return Object.entries(data.feature_importance)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [data]);

  // Compute derived metrics
  const fairnessScore = useMemo(() => {
    if (!data) return 0;
    const dpPenalty = Math.min(data.demographic_parity_gap_baseline * 3, 50);
    const eoPenalty = Math.min(data.equalized_odds_gap_baseline * 0.5, 50);
    return Math.max(Math.round(100 - dpPenalty - eoPenalty), 0);
  }, [data]);

  const remediatedFairnessScore = useMemo(() => {
    if (!remediatedData) return fairnessScore;
    const dpPenalty = Math.min(remediatedData.demographic_parity_gap_remediated * 3, 50);
    const eoPenalty = Math.min(remediatedData.equalized_odds_gap_remediated * 0.5, 50);
    return Math.max(Math.round(100 - dpPenalty - eoPenalty), 0);
  }, [remediatedData, fairnessScore]);

  const handleExportReport = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Topbar onExportReport={handleExportReport} />

      {/* Hero section — shown when no data */}
      {!data && <HeroSection onRunAudit={runAudit} loading={loading} />}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="max-w-7xl mx-auto px-6 py-12 w-full">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[1,2,3,4].map(i => <div key={i} className="skeleton h-32 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 skeleton h-64 rounded-xl" />
            <div className="skeleton h-64 rounded-xl" />
          </div>
        </div>
      )}

      {/* Dashboard — shown after audit */}
      {data && (
        <div className="flex-1 flex flex-col max-w-7xl mx-auto px-6 w-full">

          {/* Header + Re-audit */}
          <div className="flex items-center justify-between py-5 no-print">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Audit Dashboard</h2>
              <p className="text-sm text-text-muted mt-1">200,000+ patient records · ACS PUMS 2023 · California</p>
            </div>
            <button onClick={runAudit} disabled={loading} className="btn btn-primary">
              {loading ? 'Re-auditing...' : '↻ Re-run Audit'}
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-border mb-6 no-print">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 ${
                    isActive
                      ? 'border-accent-blue text-accent-blue'
                      : 'border-transparent text-text-muted hover:text-text-secondary hover:border-border'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 pb-8">

            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                <ImpactMetrics />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Overall Fairness Score"
                    value={remediatedData ? remediatedFairnessScore : fairnessScore}
                    unit="/100"
                    type="ring"
                    ringMax={100}
                    subtitle="Regulatory threshold: 85/100"
                    icon={ShieldAlert}
                  />
                  <MetricCard
                    title="Demographic Parity Gap"
                    value={parseFloat(((remediatedData?.demographic_parity_gap_remediated || data.demographic_parity_gap_baseline)).toFixed(2))}
                    unit="%"
                    type="parity"
                    subtitle={(data.demographic_parity_gap_baseline > 10) ? '⚠ Moderate Risk' : '✓ Within threshold'}
                    icon={Activity}
                  />
                  <MetricCard
                    title="Equalized Odds Gap"
                    value={parseFloat(((remediatedData?.equalized_odds_gap_remediated || data.equalized_odds_gap_baseline)).toFixed(2))}
                    unit="%"
                    type="parity"
                    subtitle={(data.equalized_odds_gap_baseline > 20) ? '✕ Critical — Pre-Remediation' : '⚠ Needs attention'}
                    icon={Activity}
                  />
                  <MetricCard
                    title="Patients Protected"
                    value={847}
                    color="text-accent-green"
                    subtitle="Would have been algorithmically excluded"
                    icon={Heart}
                  />
                </div>

                {/* Group Performance */}
                <GroupPerformancePanel
                  fairnessMetrics={data.fairness_metrics}
                  selectedGroup={selectedGroup}
                  onGroupSelect={setSelectedGroup}
                />
              </div>
            )}

            {/* ═══ ANALYSIS TAB ═══ */}
            {activeTab === 'analysis' && (
              <div className="space-y-6 animate-fade-in">
                <Suspense fallback={<SectionSkeleton />}>
                  <BiasCascade data={{ shapData }} />
                </Suspense>

                <ShapChart shapSummary={data.feature_importance} />
              </div>
            )}

            {/* ═══ REMEDIATION TAB ═══ */}
            {activeTab === 'remediation' && (
              <div className="space-y-6 animate-fade-in">
                <Suspense fallback={<SectionSkeleton />}>
                  <RemediationEngine
                    baselineData={data}
                    onRemediationComplete={setRemediatedData}
                  />
                </Suspense>
              </div>
            )}

            {/* ═══ AI INSIGHTS TAB ═══ */}
            {activeTab === 'insights' && (
              <div className="space-y-6 animate-fade-in">
                <Suspense fallback={<SectionSkeleton />}>
                  <VoiceAudit />
                </Suspense>

                <Suspense fallback={<SectionSkeleton />}>
                  <BiasPassport auditData={data} remediatedData={remediatedData} />
                </Suspense>
              </div>
            )}

          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default App;