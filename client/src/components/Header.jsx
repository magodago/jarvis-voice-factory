import { Sparkles, Github, Zap } from 'lucide-react';

/**
 * Header — top bar with branding and system info
 */
export default function Header() {
  return (
    <header className="relative z-10 border-b border-jarvis-border/30 bg-jarvis-panel/40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo + Brand */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-lg bg-jarvis-cyan/10 border border-jarvis-cyan/30 flex items-center justify-center">
              <Sparkles size={16} className="text-jarvis-cyan" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-jarvis-cyan animate-pulse" />
          </div>

          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-sm font-bold tracking-[0.15em] text-jarvis-white">
              J.A.R.V.I.S.
            </h1>
            <span className="text-[10px] font-display tracking-[0.2em] text-jarvis-cyan/50 uppercase">
              Voice AI Factory
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-jarvis-green/10 border border-jarvis-green/20">
            <Zap size={12} className="text-jarvis-green" />
            <span className="text-[10px] font-mono text-jarvis-green">ONLINE</span>
          </div>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-jarvis-border/20 text-jarvis-muted hover:text-jarvis-white transition-colors"
          >
            <Github size={16} />
          </a>
        </div>
      </div>
    </header>
  );
}
