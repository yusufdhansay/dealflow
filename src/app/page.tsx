import React from 'react';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-canvas-soft text-ink font-sans">
      {/* Vercel Navigation Bar */}
      <header className="sticky top-0 z-40 bg-canvas border-b border-hairline h-16 px-4 md:px-8 flex items-center justify-between print:hidden">
        {/* Logo block */}
        <div className="flex items-center gap-6">
          <a href="#" className="flex items-center gap-2">
            {/* Monochromatic triangle Vercel style logomark */}
            <svg 
              viewBox="0 0 75 65" 
              fill="currentColor" 
              className="h-4.5 w-auto text-ink"
            >
              <polygon points="37.5,0 75,65 0,65" />
            </svg>
            <span className="font-mono text-xs font-bold tracking-widest uppercase">
              DEALFLOW <span className="text-mute font-normal">AI</span>
            </span>
          </a>
          
          {/* Technical Links */}
          <nav className="hidden md:flex items-center gap-1">
            <span className="h-4 w-[1px] bg-hairline mx-2"></span>
            <span className="px-3 py-1 bg-canvas-soft-2 text-ink text-[11px] font-mono rounded-pill-sm border border-hairline">
              Active Workspace: M&A / LBO
            </span>
          </nav>
        </div>

        {/* CTA Actions */}
        <div className="flex items-center gap-3">
          <a 
            href="https://github.com/financialmodelingprep" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-mute hover:text-ink text-xs font-medium px-3 py-1.5 rounded-full hover:bg-canvas-soft transition-all"
          >
            FMP Docs
          </a>
          <span className="h-4 w-[1px] bg-hairline"></span>
          <span className="px-3 py-1 bg-canvas text-ink text-caption-mono border border-hairline rounded-sm">
            Node: US-EAST-1
          </span>
        </div>
      </header>

      {/* Main Dashboard Workspace */}
      <main className="flex-1 flex flex-col">
        <Dashboard />
      </main>

      {/* Vercel inspired Footer */}
      <footer className="border-t border-hairline bg-canvas py-12 px-4 md:px-8 mt-auto print:hidden">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-mute font-mono">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 75 65" fill="currentColor" className="h-3 w-auto text-mute">
              <polygon points="37.5,0 75,65 0,65" />
            </svg>
            <span>© 2026 Dealflow AI, Inc. All rights reserved.</span>
          </div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-ink">Terms</a>
            <a href="#" className="hover:text-ink">Privacy</a>
            <a href="#" className="hover:text-ink">Vercel Deploy</a>
            <a href="https://financialmodelingprep.com/" target="_blank" rel="noopener noreferrer" className="hover:text-ink text-link">FMP API</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

