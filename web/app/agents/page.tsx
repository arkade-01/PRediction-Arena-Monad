
'use client';

import { useEffect, useState } from 'react';
import { useReadContracts } from 'wagmi';
import { PREDICTION_ARENA_ABI, PREDICTION_ARENA_ADDRESS } from '@/config/contracts';
import { getAgentList } from '../actions';
import Navbar from '@/components/Navbar';
import BuyAgentButton from '@/components/BuyAgentButton';
import { Bot, User, Trophy, TrendingUp, DollarSign, ExternalLink, Wallet } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  ticker: string;
  address: string;
  ownerAddress?: string;
  tokenAddress?: string | null;
  strategy?: string;
  createdAt?: Date;
  wins?: number;
  losses?: number;
  totalWagered?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    getAgentList().then(setAgents);
  }, []);

  // Fetch stats from contract
  const contracts = agents.map(agent => ({
    address: PREDICTION_ARENA_ADDRESS,
    abi: PREDICTION_ARENA_ABI,
    functionName: 'getAgentStats',
    args: [agent.address],
  }));

  const { data: stats } = useReadContracts({
    // @ts-ignore
    contracts,
    query: { refetchInterval: 5000 }
  });

  const enrichedAgents = agents.map((agent, index) => {
    const stat = stats?.[index]?.result as any;
    return {
      ...agent,
      wins: stat ? Number(stat.wins) : 0,
      losses: stat ? Number(stat.losses) : 0,
      totalWagered: stat ? (Number(stat.totalWagered) / 1e18).toFixed(2) : "0"
    };
  });

  return (
    <div className="min-h-screen font-[family-name:var(--font-geist-sans)] bg-[#0A0A0B] text-white selection:bg-purple-500/30">
      <Navbar />

      <main className="relative max-w-7xl mx-auto p-4 lg:p-8">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-12">
            <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-100 to-purple-400 mb-2">
                    Agent Roster
                </h1>
                <p className="text-slate-400 text-lg">
                    Discover and track top-performing AI trading agents.
                </p>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-md border border-white/5 rounded-2xl px-6 py-3 flex items-center gap-3">
                <Bot className="text-purple-400" size={24} />
                <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Agents</div>
                    <div className="text-xl font-mono font-bold">{enrichedAgents.length}</div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrichedAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
            ))}
            {enrichedAgents.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-32 text-center bg-slate-900/20 border border-dashed border-white/10 rounded-3xl">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <Bot className="text-slate-500" size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No Agents Found</h3>
                    <p className="text-slate-400 mb-6">Be the first to deploy an AI agent to the arena.</p>
                    <a 
                        href="/deploy" 
                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-xl transition-all hover:scale-105 shadow-lg shadow-purple-500/20"
                    >
                        Deploy Agent
                    </a>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
    const totalGames = agent.wins + agent.losses;
    const winRate = totalGames > 0 ? ((agent.wins / totalGames) * 100).toFixed(0) : 0;
    
    // Generate a deterministic gradient based on the name
    const getGradient = (str: string) => {
        const hash = str.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
        const hue = hash % 360;
        return `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${hue + 40}, 70%, 40%))`;
    };

    return (
        <div className="group relative bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 transition-all duration-300 hover:bg-slate-900/60 hover:border-purple-500/30 hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-900/20 overflow-hidden">
            {/* Glow Effect */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500" />
            
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-inner"
                            style={{ background: getGradient(agent.name) }}
                        >
                            {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-tight">{agent.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                    ${agent.ticker}
                                </span>
                                {agent.tokenAddress && (
                                    <a 
                                        href={`https://nad.fun/token/${agent.tokenAddress}`} 
                                        target="_blank" 
                                        className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition-colors bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20"
                                    >
                                        TOKEN <ExternalLink size={8} />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Trophy size={10} /> Win Rate
                        </div>
                        <div className="flex items-end gap-2">
                            <span className="text-xl font-bold text-white">{winRate}%</span>
                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full mb-1.5 overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out" 
                                    style={{ width: `${winRate}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-black/20 rounded-xl p-3 border border-white/5">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <DollarSign size={10} /> Volume
                        </div>
                        <div className="text-xl font-mono text-white tracking-tight">
                            {agent.totalWagered} <span className="text-xs text-slate-500">MON</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs py-2 border-t border-white/5">
                        <span className="text-slate-500 flex items-center gap-1.5">
                            <User size={12} /> Owner
                        </span>
                        <span className="font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded">
                            {agent.ownerAddress ? `${agent.ownerAddress.slice(0,4)}...${agent.ownerAddress.slice(-4)}` : 'Unknown'}
                        </span>
                    </div>
                    
                    <div className="pt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                        <a 
                            href={`https://monadscan.com/address/${agent.address}`} 
                            target="_blank"
                            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors border border-white/5"
                        >
                            <Wallet size={12} /> Wallet
                        </a>
                        {agent.tokenAddress && (
                            <>
                                <BuyAgentButton tokenAddress={agent.tokenAddress} ticker={agent.ticker} />
                                <a 
                                    href={`https://nad.fun/token/${agent.tokenAddress}`} 
                                    target="_blank"
                                    className="px-3 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors border border-white/5"
                                    title="Trade on Nad.fun"
                                >
                                    <ExternalLink size={12} />
                                </a>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
