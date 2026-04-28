import React from 'react';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { Play, FileText } from 'lucide-react';

function StatPill({ number, label, delay = 0 }) {
  const [ref, isVisible] = useIntersectionObserver();
  const count = useAnimatedCounter(isVisible ? number : 0, 1500, isVisible);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center px-6 py-3 border border-border rounded-lg bg-bg-card/50"
      style={{ animation: isVisible ? `fade-in 0.6s ease ${delay}ms forwards` : 'none', opacity: isVisible ? undefined : 0 }}
    >
      <span className="font-mono text-2xl font-bold text-text-primary">
        {typeof number === 'string' ? number : number >= 1000 ? `${Math.round(count).toLocaleString()}+` : Math.round(count)}
      </span>
      <span className="text-xs text-text-muted mt-1">{label}</span>
    </div>
  );
}

export default function HeroSection({ onRunAudit, loading }) {
  return (
    <section className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 py-20 text-center overflow-hidden">
      {/* Particles */}
      <div className="particles">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold text-text-primary leading-tight mb-4 animate-fade-in">
          Clinical AI Bias is Invisible
        </h1>
        <p className="text-2xl md:text-3xl text-accent-cyan italic mb-6 animate-fade-in" style={{ animationDelay: '200ms' }}>
          Until now.
        </p>
        <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '400ms' }}>
          FairCare audits your diagnostic models in real-time, identifies discriminatory
          patterns, and generates regulatory-grade compliance reports — before your
          model harms a patient.
        </p>

        <div className="flex items-center justify-center mb-16 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <button onClick={onRunAudit} disabled={loading} className="btn btn-primary text-base px-8 py-3">
            <Play size={18} />
            {loading ? 'Auditing...' : 'Run Audit Now'}
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 flex-wrap animate-fade-in" style={{ animationDelay: '800ms' }}>
          <StatPill number={200000} label="Patients Analyzed" />
          <StatPill number={847} label="Biases Detected" delay={100} />
          <StatPill number="3" label="Regulations Mapped" delay={200} />
        </div>
      </div>
    </section>
  );
}
