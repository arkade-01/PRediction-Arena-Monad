'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useReadContract, useWriteContract, useAccount, useWatchContractEvent } from 'wagmi';
import { PREDICTION_ARENA_ABI, PREDICTION_ARENA_ADDRESS } from '@/config/contracts';
import { useEffect, useState } from 'react';
import AgentAnalytics from '@/components/AgentAnalytics';
import AgentTerminal from '@/components/AgentTerminal';

// Simple activity feed interface
interface Activity {
  id: string;
  roundId: number;
  player: string;
  value: string;
  timestamp: number;
}

export default function Home() {
  const { address } = useAccount();
  const { data: roundCount } = useReadContract({
    address: PREDICTION_ARENA_ADDRESS,
    abi: PREDICTION_ARENA_ABI,
    functionName: 'roundCount',
    query: {
      refetchInterval: 3000, // Refresh count every 3s
    }
  });

  const [activities, setActivities] = useState<Activity[]>([]);
  
  // Use public client to fetch past logs
  useEffect(() => {
    const fetchLogs = async () => {
        // Mocking for now because getLogs requires PublicClient instance from wagmi/core
        // and setting that up inside component is messy.
        // Instead, we will rely on the WATCHER which should work if RPC supports it.
        // If RPC doesn't support WS, we need to POLL.
    };
  }, []);

  // Watch for new predictions (Polling Fallback)
  useWatchContractEvent({
    address: PREDICTION_ARENA_ADDRESS,
    abi: PREDICTION_ARENA_ABI,
    eventName: 'PredictionSubmitted',
    poll: true, // Force polling!
    pollingInterval: 2000,
    onLogs(logs) {
      const newActivities = logs.map((log: any) => ({
        id: log.transactionHash,
        roundId: Number(log.args.roundId),
        player: log.args.player,
        value: (Number(log.args.value) / 1e8).toFixed(2), 
        timestamp: Date.now()
      }));
      
      // Dedup by tx hash
      setActivities(prev => {
          const ids = new Set(prev.map(a => a.id));
          const uniqueNew = newActivities.filter(a => !ids.has(a.id));
          return [...uniqueNew, ...prev].slice(0, 10);
      });
    },
  });

  // Check if user is registered
  const { data: agentStats, refetch: refetchStats } = useReadContract({
    address: PREDICTION_ARENA_ADDRESS,
    abi: PREDICTION_ARENA_ABI,
    functionName: 'getAgentStats',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  });

  const { writeContract, isPending: isRegistering } = useWriteContract();

  const isRegistered = agentStats ? (agentStats as any).isRegistered : false;

  const handleRegister = () => {
    writeContract({
      address: PREDICTION_ARENA_ADDRESS,
      abi: PREDICTION_ARENA_ABI,
      functionName: 'registerAgent',
    }, {
      onSuccess: () => {
        setTimeout(refetchStats, 2000); // Refresh after delay
      }
    });
  };

  const [recentIds, setRecentIds] = useState<number[]>([]);

  useEffect(() => {
    if (roundCount) {
      const count = Number(roundCount);
      const ids = [];
      for (let i = count; i > Math.max(0, count - 5); i--) {
        ids.push(i);
      }
      setRecentIds(ids);
    }
  }, [roundCount]);

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)]">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          Prediction Arena 🔮
        </h1>
        <ConnectButton />
      </header>

      <main className="w-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT COLUMN: Activity Feed */}
        <div className="lg:col-span-1 space-y-4 lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)] flex flex-col">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 shrink-0">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Live Bets
            </h2>
            
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex-1 overflow-y-auto">
                {activities.length === 0 ? (
                    <div className="text-center text-slate-500 py-10 text-sm">
                        Waiting for new bets...
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activities.map((activity) => (
                            <div key={activity.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 text-sm animate-in fade-in slide-in-from-left-4 duration-500">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-mono text-purple-300 text-xs">
                                        {activity.player.slice(0, 6)}...{activity.player.slice(-4)}
                                    </span>
                                    <span className="text-slate-500 text-[10px]">
                                        Round #{activity.roundId}
                                    </span>
                                </div>
                                <div className="text-white">
                                    Predicted: <span className="font-bold text-green-400">${activity.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

        {/* RIGHT COLUMN: Main Content */}
        <div className="lg:col-span-3">
            {/* Registration Banner */}
            {address && !isRegistered && (
            <div className="bg-gradient-to-r from-indigo-900 to-purple-900 rounded-xl p-6 mb-8 border border-purple-500/30 flex justify-between items-center">
                <div>
                <h2 className="text-xl font-bold text-white mb-1">Join the Arena</h2>
                <p className="text-purple-200 text-sm">You must register as an agent to place predictions.</p>
                </div>
                <button 
                onClick={handleRegister}
                disabled={isRegistering}
                className="bg-white text-purple-900 font-bold px-6 py-3 rounded-lg hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                {isRegistering ? 'Registering...' : 'Register Now'}
                </button>
            </div>
            )}

            {/* Agent Analytics Dashboard */}
            <AgentAnalytics />

            {/* AI Reasoning Terminal */}
            <AgentTerminal />

            {/* Stats & Info */}
            <div className="bg-slate-900 rounded-xl p-6 mb-8 border border-slate-800">
            <h2 className="text-xl font-semibold mb-4">Market Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 p-4 rounded-lg">
                <div className="text-slate-400 text-sm">Total Rounds</div>
                <div className="text-2xl font-mono">{roundCount ? roundCount.toString() : '...'}</div>
                </div>
                {isRegistered && agentStats && (
                <>
                    <div className="bg-slate-800 p-4 rounded-lg">
                    <div className="text-slate-400 text-sm">Your Wins</div>
                    <div className="text-2xl font-mono text-green-400">{(agentStats as any).wins.toString()}</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                    <div className="text-slate-400 text-sm">Streak</div>
                    <div className="text-2xl font-mono text-orange-400">{(agentStats as any).currentStreak.toString()} 🔥</div>
                    </div>
                </>
                )}
                <div className="bg-slate-800 p-4 rounded-lg">
                <div className="text-slate-400 text-sm">Status</div>
                <div className="text-2xl text-purple-400">
                    {isRegistered ? 'Active Agent' : 'Spectator'}
                </div>
                </div>
            </div>
            </div>

            <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Recent Rounds</h2>
            <button 
                onClick={() => window.location.reload()}
                className="text-sm text-slate-400 hover:text-white transition-colors"
            >
                Refresh ⟳
            </button>
            </div>

            <div className="space-y-4">
            {recentIds.length > 0 ? (
                recentIds.map((id) => <RoundCard key={id} id={id} isRegistered={isRegistered} />)
            ) : (
                <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
                {roundCount ? 'No rounds found.' : 'Loading market data...'}
                </div>
            )}
            </div>
        </div>
      </main>
    </div>
  );
}

function RoundCard({ id, isRegistered }: { id: number, isRegistered: boolean }) {
  const { data: round } = useReadContract({
    address: PREDICTION_ARENA_ADDRESS,
    abi: PREDICTION_ARENA_ABI,
    functionName: 'rounds',
    args: [BigInt(id)],
    query: {
      refetchInterval: 3000, // Live update status every 3s
    }
  });

  const { writeContract, isPending } = useWriteContract();
  const [showModal, setShowModal] = useState(false);
  const [prediction, setPrediction] = useState("");

  if (!round) return <div className="animate-pulse bg-slate-900 h-32 rounded-xl border border-slate-800"></div>;

  // Round struct unpacking
  const question = (round as any)[1];
  const entryFee = (round as any)[3];
  const endTime = Number((round as any)[5]) * 1000;
  const isResolved = (round as any)[7];
  const outcome = (round as any)[6];
  const cancelled = (round as any)[8];
  
  const isEnded = Date.now() > endTime;
  const formattedOutcome = (Number(outcome) / 1e8).toFixed(2);
  const fee = (Number(entryFee) / 1e18).toFixed(4); 

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prediction) return;
    
    // Convert float to int64 scaled by 1e8 (e.g. 97000.50 -> 9700050000000)
    const scaledValue = BigInt(Math.round(parseFloat(prediction) * 1e8));
    
    writeContract({
      address: PREDICTION_ARENA_ADDRESS,
      abi: PREDICTION_ARENA_ABI,
      functionName: 'submitPrediction',
      args: [BigInt(id), scaledValue],
      value: (round as any)[3], // entry fee
    }, {
      onSuccess: () => {
        setShowModal(false);
        setPrediction("");
      }
    });
  };

  return (
    <>
      <div className={`bg-slate-900 border rounded-xl p-6 transition-all hover:shadow-lg ${
        isResolved ? 'border-green-900/30' : 
        cancelled ? 'border-red-900/30 opacity-75' :
        'border-slate-800 hover:border-purple-500/50'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">#{id}</span>
            <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
              cancelled ? 'bg-red-900/30 text-red-400' :
              isResolved ? 'bg-green-900/30 text-green-400' :
              isEnded ? 'bg-yellow-900/30 text-yellow-400' :
              'bg-blue-900/30 text-blue-400 animate-pulse'
            }`}>
              {cancelled ? 'CANCELLED' : isResolved ? 'RESOLVED' : isEnded ? 'AWAITING RESULT' : 'LIVE'}
            </span>
            <span className="text-xs text-slate-500 ml-2">Fee: {fee} MON</span>
          </div>
          
          {!isResolved && !cancelled && !isEnded && isRegistered && (
            <button 
              onClick={() => setShowModal(true)} 
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-purple-900/20"
            >
              PREDICT
            </button>
          )}
        </div>
        
        <h3 className="text-lg font-medium mb-3">{question}</h3>
        
        <div className="flex justify-between items-end text-sm text-slate-400 pt-3 border-t border-slate-800/50">
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-slate-600">Ends At</span>
            <span>{new Date(endTime).toLocaleTimeString()}</span>
          </div>
          
          {isResolved && (
            <div className="flex flex-col items-end">
               <span className="text-xs uppercase tracking-wider text-slate-600">Final Price</span>
               <span className="font-mono text-green-400 font-bold">${formattedOutcome}</span>
            </div>
          )}
        </div>
      </div>

      {/* PREDICTION MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-2">Place Your Prediction</h3>
            <p className="text-slate-400 text-sm mb-6">{question}</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">Your Target Price ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    required
                    placeholder="e.g. 97500.50"
                    value={prediction}
                    onChange={(e) => setPrediction(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-8 pr-4 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-4 text-xs text-slate-400 flex justify-between">
                <span>Entry Fee:</span>
                <span className="text-white font-mono">{fee} MON</span>
              </div>

              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)} 
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isPending || !prediction}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Confirming...' : 'Place Bet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
