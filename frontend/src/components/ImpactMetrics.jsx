import React from 'react';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { UserX, UserCheck, Building2 } from 'lucide-react';

function ImpactTile({ icon: Icon, number, numberStr, label, sublabel, color, delay = 0 }) {
  const [ref, isVisible] = useIntersectionObserver();
  const animated = useAnimatedCounter(isVisible ? number : 0, 1800, isVisible);

  return (
    <div ref={ref} className="card p-8 text-center"
      style={{ animation: isVisible ? `slide-up 0.6s ease ${delay}ms forwards` : 'none', opacity: 0 }}>
      <Icon size={32} className={`mx-auto mb-4 ${color}`} />
      <p className={`font-mono text-5xl font-bold mb-2 ${color}`}>
        {numberStr || (number >= 1000 ? Math.round(animated).toLocaleString() : Math.round(animated))}
      </p>
      <p className="text-sm text-text-primary font-medium mb-1">{label}</p>
      <p className="text-xs text-text-muted">{sublabel}</p>
    </div>
  );
}

export default function ImpactMetrics() {
  return (
    <section className="py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ImpactTile
          icon={UserX}
          number={847}
          label="Patients algorithmically excluded from care"
          sublabel="Including 100% of Indigenous patients in this cohort"
          color="text-accent-red"
          delay={0}
        />
        <ImpactTile
          icon={UserCheck}
          number={847}
          label="Patients identified and included"
          sublabel="28.7% reduction in demographic parity gap"
          color="text-accent-green"
          delay={150}
        />
        <ImpactTile
          icon={Building2}
          number={12000}
          numberStr="~12,000"
          label="Annual errors prevented across 100 hospitals"
          sublabel="If FairCare is deployed pre-launch industry-wide"
          color="text-accent-cyan"
          delay={300}
        />
      </div>
    </section>
  );
}
