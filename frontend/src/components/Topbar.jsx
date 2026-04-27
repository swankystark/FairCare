import React from 'react';
import { FileText, ExternalLink, Download } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Topbar({ onExportReport }) {
  return (
    <>
      <nav className="w-full h-14 bg-bg-primary border-b border-border flex items-center justify-between px-6 sticky top-0 z-50 backdrop-blur-sm">
        {/* Left: Branding */}
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="FairCare AI logo"
            className="w-8 h-8 rounded-lg object-contain"
            style={{ background: 'transparent' }}
          />
          <span className="text-text-primary font-semibold text-lg tracking-tight">
            Fair<span className="text-text-primary">Care</span>
          </span>
          <span className="text-accent-cyan font-semibold text-lg">AI</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-elevated border border-border text-text-muted">
            v2.1
          </span>
        </div>

        {/* Center: Status Pill */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-bg-card">
          <span className="w-2 h-2 rounded-full bg-accent-green" style={{ animation: 'pulse-dot 2s ease infinite' }} />
          <span className="text-xs font-medium text-text-secondary tracking-wider uppercase">
            Live Audit Engine
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors" title="Documentation">
            <FileText size={18} />
          </button>
          <button className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors" title="GitHub">
            <ExternalLink size={18} />
          </button>
          <button
            onClick={onExportReport}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            title="Export Report"
          >
            <Download size={18} />
          </button>
        </div>
      </nav>
      {/* Gradient line */}
      <div className="gradient-line" />
    </>
  );
}
