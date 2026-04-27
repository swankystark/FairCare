import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-border py-8 px-6 mt-12 no-print">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-text-muted">
          FairCare AI — Built for Google Solution Challenge 2026
        </p>

        {/* SDG Badges */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] px-2 py-1 rounded border border-accent-green/40 text-accent-green font-medium">
            SDG 3: Good Health
          </span>
          <span className="text-[10px] px-2 py-1 rounded border border-accent-amber/40 text-accent-amber font-medium">
            SDG 10: Reduced Inequalities
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span>Powered by</span>
          <span className="text-accent-purple font-semibold">Gemini AI</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="#8B5CF6" opacity="0.3" />
            <path d="M12 2L2 7l10 5 10-5L12 2z" fill="#8B5CF6" />
          </svg>
        </div>
      </div>
    </footer>
  );
}
