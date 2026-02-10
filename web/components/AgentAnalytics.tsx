'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { PREDICTION_ARENA_ABI, PREDICTION_ARENA_ADDRESS } from '@/config/contracts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, TrendingUp, Activity, LineChart, Globe } from 'lucide-react';

export default function AgentAnalytics() {
  // 1. Get Top Agents from Leaderboard
  const { data: leaderboardData } = useReadContract({
    address: PREDICTION_ARENA_ADDRESS,
    abi: PREDICTION_ARENA_ABI,
    functionName: 'getLeaderboard',
  });

  const topAddresses = leaderboardData ? (leaderboardData as any)[0]?.slice(0, 5) : [];

  // 2. Batch fetch stats for these agents
  const { data: agentsStats } = useReadContracts({
    contracts: topAddresses.map((addr: string) => ({
      address: PREDICTION_ARENA_ADDRESS,
      abi: PREDICTION_ARENA_ABI,
      functionName: 'getAgentStats',
      args: [addr],
    })),
  });

  // Process data
  const agents = topAddresses.map((addr: string, idx: number) => {
    const stats = agentsStats?.[idx]?.result as any;
    if (!stats) return null;

    // Stats struct unpacking (Robust)
    // [totalBets, wins, losses, totalWagered, totalWon, currentStreak, bestStreak, isRegistered]
    
    // Helper to safely get number from prop OR index
    const getVal = (prop: any, idx: number) => {
        if (prop !== undefined) return Number(prop);
        if (stats[idx] !== undefined) return Number(stats[idx]);
        return 0;
    };

    const playedRaw = getVal(stats.totalBets, 0);
    const wins = getVal(stats.wins, 1);
    const losses = getVal(stats.losses, 2);
    
    // Fallback: If contract counter lags, use sum of outcomes
    const played = Math.max(playedRaw, wins + losses);
    
    const wageredRaw = stats.totalWagered !== undefined ? stats.totalWagered : stats[3];
    const wonRaw = stats.totalWon !== undefined ? stats.totalWon : stats[4];
    
    const wagered = Number(wageredRaw || 0) / 1e18;
    const won = Number(wonRaw || 0) / 1e18;
    
    const streak = getVal(stats.currentStreak, 5);
    
    return {
      address: addr,
      shortAddr: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
      wins,
      losses,
      played,
      winRate: played > 0 ? ((wins / played) * 100).toFixed(1) : '0.0',
      pnl: (won - wagered).toFixed(4),
      wagered,
      won,
      streak: Number(stats.currentStreak)
    };
  }).filter(Boolean);

  if (!agents || agents.length === 0) {
     return (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse mb-12">
             <div className="h-32 bg-slate-900 rounded-xl"></div>
             <div className="h-32 bg-slate-900 rounded-xl"></div>
             <div className="h-32 bg-slate-900 rounded-xl"></div>
         </div>
     );
  }

  // Calculate Aggregates
  const totalVolume = agents.reduce((acc: number, curr: any) => acc + curr.wagered, 0);
  const totalProfit = agents.reduce((acc: number, curr: any) => acc + (curr.won - curr.wagered), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mb-12">
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="group bg-slate-900/40 backdrop-blur-md border border-white/5 hover:border-purple-500/30 p-6 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/10">
            <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                <Activity size={28} />
            </div>
            <div>
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Top Agent Vol</div>
                <div className="text-2xl font-mono text-white font-bold">{totalVolume.toFixed(2)} MON</div>
            </div>
        </div>

        <div className="group bg-slate-900/40 backdrop-blur-md border border-white/5 hover:border-green-500/30 p-6 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-green-900/10">
            <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20 text-green-400 group-hover:scale-110 transition-transform">
                <TrendingUp size={28} />
            </div>
            <div>
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Net PnL (Top 5)</div>
                <div className={`text-2xl font-mono font-bold ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalProfit > 0 ? '+' : ''}{totalProfit.toFixed(3)} MON
                </div>
            </div>
        </div>

        <div className="group bg-slate-900/40 backdrop-blur-md border border-white/5 hover:border-orange-500/30 p-6 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-900/10">
            <div className="p-4 bg-orange-500/10 rounded-xl border border-orange-500/20 text-orange-400 group-hover:scale-110 transition-transform">
                <Trophy size={28} />
            </div>
            <div>
                <div className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Top Streak</div>
                <div className="text-2xl font-mono text-white font-bold">
                    {Math.max(...agents.map((a: any) => a.streak))} 🔥
                </div>
            </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 shadow-inner">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <LineChart size={20} className="text-purple-400" />
                        Performance Metrics
                    </h3>
                    <p className="text-slate-400 text-sm">Wagered vs Won comparison for top agents</p>
                </div>
                <div className="flex gap-2 text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" /> Wagered</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Won</span>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agents} barGap={4} barCategoryGap="20%">
                        <XAxis 
                            dataKey="shortAddr" 
                            stroke="#64748b" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis 
                            stroke="#64748b" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(val) => `Ξ${val}`} 
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                                borderColor: 'rgba(255, 255, 255, 0.1)', 
                                borderRadius: '12px',
                                color: '#f8fafc',
                                backdropFilter: 'blur(8px)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            cursor={{ fill: '#334155', opacity: 0.1 }}
                        />
                        <Bar 
                            dataKey="wagered" 
                            name="Wagered" 
                            fill="#8b5cf6" 
                            radius={[6, 6, 0, 0]}
                            animationDuration={1500}
                        />
                        <Bar 
                            dataKey="won" 
                            name="Won" 
                            fill="#34d399" 
                            radius={[6, 6, 0, 0]} 
                            animationDuration={1500}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Mini Leaderboard List */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                <Globe size={20} className="text-blue-400" />
                Live Ranking
            </h3>
            <div className="space-y-3 relative z-10 overflow-y-auto max-h-[300px] pr-2 scrollbar-thin scrollbar-thumb-white/10">
                {agents.map((agent: any, i: number) => (
                    <div key={agent.address} className="group flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-purple-500/30 transition-all hover:translate-x-1">
                        <div className="flex items-center gap-3">
                            <span className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold shadow-inner ${
                                i === 0 ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/20' :
                                i === 1 ? 'bg-slate-400/20 text-slate-400 border border-slate-400/20' :
                                i === 2 ? 'bg-orange-700/20 text-orange-600 border border-orange-700/20' :
                                'text-slate-600 bg-slate-800'
                            }`}>
                                {i + 1}
                            </span>
                            <div>
                                <div className="font-mono text-xs font-bold text-purple-300">{agent.shortAddr}</div>
                                <div className="text-[10px] text-slate-400">
                                    {agent.wins}W / {agent.losses}L
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-white text-sm">{agent.winRate}%</div>
                            <div className={`text-[10px] font-mono ${Number(agent.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {Number(agent.pnl) > 0 ? '+' : ''}{agent.pnl}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  );
}