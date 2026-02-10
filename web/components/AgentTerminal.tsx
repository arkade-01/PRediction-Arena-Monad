'use client';

import { useEffect, useState, useRef } from 'react';
import { Terminal, Cpu, Zap, Radio } from 'lucide-react';

interface Log {
  agentName: string;
  message: string;
  sentiment: string;
  timestamp: number;
}

export default function AgentTerminal() {
  const [logs, setLogs] = useState<Log[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/logs.json?t=' + Date.now()); // Prevent caching
        if (res.ok) {
          const data = await res.json();
          // Take last 50
          setLogs(data.reverse().slice(0, 50));
        }
      } catch (e) {
        // console.error(e);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative group overflow-hidden rounded-3xl border border-white/5 bg-black/40 backdrop-blur-xl shadow-2xl mb-8 min-h-[400px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white/5 border-b border-white/5 backdrop-blur-md">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 text-purple-400">
                    <Terminal size={18} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white tracking-wide uppercase">Neural Lobe Activity</h3>
                    <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        SYSTEM ONLINE
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                <div className="flex items-center gap-2">
                    <Cpu size={14} />
                    <span>CPU: 42%</span>
                </div>
                <div className="flex items-center gap-2">
                    <Radio size={14} />
                    <span>NET: 1.2GB/s</span>
                </div>
            </div>
        </div>

        {/* Terminal Window */}
        <div className="relative h-[350px] overflow-hidden bg-black/80 p-6 font-mono text-xs">
            {/* Scanline Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[2] pointer-events-none bg-[length:100%_2px,3px_100%] opacity-20" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent h-[10px] w-full animate-scan pointer-events-none z-[1]" />
            
            <div 
                ref={scrollRef}
                className="h-full overflow-y-auto space-y-3 scrollbar-hide pb-10"
            >
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
                        <Zap className="animate-pulse text-purple-500/50" size={48} />
                        <p>Initializing Neural Interface...</p>
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="flex gap-4 animate-in fade-in slide-in-from-left-4 duration-500 border-l-2 border-transparent hover:border-purple-500/50 pl-2 hover:bg-white/5 rounded-r transition-colors py-1 group/line">
                            <span className="text-slate-600 shrink-0 font-bold opacity-50 select-none group-hover/line:opacity-100 transition-opacity">
                                [{new Date(log.timestamp).toLocaleTimeString([], {hour12: false})}]
                            </span>
                            <div className="flex-1 break-words">
                                <span className={`font-bold mr-3 ${
                                    log.agentName.includes('Bravo') ? 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.3)]' :
                                    log.agentName.includes('Charlie') ? 'text-pink-400 drop-shadow-[0_0_8px_rgba(244,114,182,0.3)]' :
                                    'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]'
                                }`}>
                                    @{log.agentName}
                                </span>
                                <span className="text-slate-300 group-hover/line:text-white transition-colors">
                                    {log.message}
                                </span>
                            </div>
                        </div>
                    ))
                )}
                {/* Typing Cursor */}
                <div className="flex items-center gap-2 mt-4 animate-pulse">
                    <span className="text-purple-500">➜</span>
                    <span className="w-2 h-4 bg-purple-500"></span>
                </div>
            </div>
        </div>
    </div>
  );
}