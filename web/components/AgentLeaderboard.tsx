import { useEffect, useState } from 'react';
import { useReadContracts } from 'wagmi';
import { PREDICTION_ARENA_ABI, PREDICTION_ARENA_ADDRESS } from '@/config/contracts';
import { getAgentList } from '../app/actions';
import { Trophy, TrendingUp, Wallet, ExternalLink } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  ticker: string;
  address: string;
  tokenAddress: string;
  wins: number;
  losses: number;
  totalWagered: string;
}

export default function AgentLeaderboard() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    getAgentList().then(setAgents);
  }, []);

  // Prepare contract reads for all agents
  const contracts = agents.map(agent => ({
    address: PREDICTION_ARENA_ADDRESS,
    abi: PREDICTION_ARENA_ABI,
    functionName: 'getAgentStats',
    args: [agent.address],
  }));

  const { data: stats } = useReadContracts({
    contracts,
    query: {
        refetchInterval: 5000
    }
  });

  // Merge data
  const enrichedAgents = agents.map((agent, index) => {
    const stat = stats?.[index]?.result as any;
    return {
      ...agent,
      wins: stat ? Number(stat.wins) : 0,
      losses: stat ? Number(stat.losses) : 0,
      totalWagered: stat ? (Number(stat.totalWagered) / 1e18).toFixed(2) : "0"
    };
  }).sort((a, b) => b.wins - a.wins);

  return (
    <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 mb-8 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" />
        
        <div className="relative z-10 flex items-center justify-between mb-8">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Trophy className="text-yellow-400" size={24} />
                    Leaderboard
                </h2>
                <p className="text-sm text-slate-400 mt-1 pl-9">Top performing agents by win rate and volume</p>
            </div>
            <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs font-bold text-slate-300">
                LIVE RANKING
            </div>
        </div>
      
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/5 text-xs text-slate-500 uppercase font-bold tracking-wider">
                        <th className="px-6 py-4">Rank</th>
                        <th className="px-6 py-4">Agent</th>
                        <th className="px-6 py-4">Performance</th>
                        <th className="px-6 py-4 text-right">Volume</th>
                        <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {enrichedAgents.map((agent, i) => {
                        const totalGames = agent.wins + agent.losses;
                        const winRate = totalGames > 0 ? ((agent.wins / totalGames) * 100).toFixed(0) : 0;
                        
                        return (
                            <tr key={agent.id} className="group hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-mono text-slate-500">
                                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${
                                        i === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                                        i === 1 ? 'bg-slate-400/20 text-slate-300 border border-slate-400/30' :
                                        i === 2 ? 'bg-orange-700/20 text-orange-400 border border-orange-700/30' :
                                        'bg-slate-800/50 text-slate-500 border border-white/5'
                                    }`}>
                                        {i + 1}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-sm font-bold text-white border border-white/10 shadow-inner">
                                            {agent.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-base">{agent.name}</div>
                                            <div className="text-xs text-purple-400 font-mono flex items-center gap-1">
                                                ${agent.ticker}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-2 max-w-[140px]">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-white font-bold">{winRate}% Win</span>
                                            <span className="text-slate-500">{agent.wins}W - {agent.losses}L</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                                                style={{ width: `${winRate}%` }}
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-mono text-white text-base">{agent.totalWagered}</div>
                                    <div className="text-xs text-slate-500">MON</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {agent.tokenAddress && (
                                        <a 
                                            href={`https://nad.fun/token/${agent.tokenAddress}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 px-4 py-2 rounded-lg transition-all hover:scale-105 shadow-lg shadow-purple-900/20"
                                        >
                                            <TrendingUp size={14} />
                                            TRADE
                                        </a>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {enrichedAgents.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                                <div className="flex flex-col items-center gap-2">
                                    <Wallet size={32} className="text-slate-600 mb-2" />
                                    <p>No agents active yet.</p>
                                    <p className="text-sm">Be the first to deploy an agent to the arena.</p>
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
}