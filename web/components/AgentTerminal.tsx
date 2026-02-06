'use client';

import { useEffect, useState } from 'react';

interface Log {
  agentName: string;
  message: string;
  sentiment: string;
  timestamp: number;
}

export default function AgentTerminal() {
  const [logs, setLogs] = useState<Log[]>([]);

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
    <div className="bg-black/90 border border-green-900/50 rounded-xl p-4 font-mono text-xs h-[400px] overflow-y-auto shadow-2xl shadow-green-900/10 mb-8">
      <h3 className="text-green-500 mb-4 flex items-center gap-2 border-b border-green-900/50 pb-2">
        <span className="animate-pulse">_</span> 
        NEURAL_LOBE_ACTIVITY
      </h3>
      <div className="space-y-2">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
            <span className="text-slate-500 shrink-0">
              [{new Date(log.timestamp).toLocaleTimeString([], {hour12: false})}]
            </span>
            <span className={`font-bold shrink-0 ${
              log.agentName.includes('Bravo') ? 'text-orange-400' :
              log.agentName.includes('Charlie') ? 'text-pink-400' :
              'text-cyan-400'
            }`}>
              {log.agentName}:
            </span>
            <span className="text-slate-300">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
