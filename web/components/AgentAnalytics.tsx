'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { PREDICTION_ARENA_ABI, PREDICTION_ARENA_ADDRESS } from '@/config/contracts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, TrendingUp, Activity } from 'lucide-react';

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
     return null; // Return nothing if no data yet (or loading skeleton)
  }

  // Calculate Aggregates
  const totalVolume = agents.reduce((acc: number, curr: any) => acc + curr.wagered, 0);
  const totalProfit = agents.reduce((acc: number, curr: any) => acc + (curr.won - curr.wagered), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 mb-12">
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-purple-900/30 rounded-lg text-purple-400">
                <Activity size={24} />
            </div>
            <div>
                <div className="text-slate-400 text-xs uppercase font-bold">Top Agent Vol</div>
                <div className="text-xl font-mono text-white">{totalVolume.toFixed(2)} MON</div>
            </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-green-900/30 rounded-lg text-green-400">
                <TrendingUp size={24} />
            </div>
            <div>
                <div className="text-slate-400 text-xs uppercase font-bold">Net PnL (Top 5)</div>
                <div className={`text-xl font-mono ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalProfit > 0 ? '+' : ''}{totalProfit.toFixed(3)} MON
                </div>
            </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-orange-900/30 rounded-lg text-orange-400">
                <Trophy size={24} />
            </div>
            <div>
                <div className="text-slate-400 text-xs uppercase font-bold">Top Streak</div>
                <div className="text-xl font-mono text-white">
                    {Math.max(...agents.map((a: any) => a.streak))} 🔥
                </div>
            </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart Section */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                Performance: Wagered vs Won
            </h3>
            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agents}>
                        <XAxis dataKey="shortAddr" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} tickFormatter={(val) => `Ξ${val}`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                            cursor={{ fill: '#334155', opacity: 0.2 }}
                        />
                        <Bar dataKey="wagered" name="Wagered" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="won" name="Won" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Leaderboard List */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-4">Live Leaderboard</h3>
            <div className="space-y-3">
                {agents.map((agent: any, i: number) => (
                    <div key={agent.address} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-purple-500/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                i === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                                i === 1 ? 'bg-slate-400/20 text-slate-400' :
                                i === 2 ? 'bg-orange-700/20 text-orange-600' :
                                'text-slate-600'
                            }`}>
                                {i + 1}
                            </span>
                            <div>
                                <div className="font-mono text-sm text-purple-300">{agent.shortAddr}</div>
                                <div className="text-[10px] text-slate-500">
                                    {agent.wins}W / {agent.losses}L • {agent.played} Rounds
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-white">{agent.winRate}%</div>
                            <div className={`text-xs ${Number(agent.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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
