'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useWriteContract, useAccount, useSendTransaction, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Upload, Rocket, Bot, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { PREDICTION_ARENA_ABI, PREDICTION_ARENA_ADDRESS } from '@/config/contracts';
import { uploadImage, uploadMetadata, getSalt, createAndSaveAgentWallet, registerAgentOnChain, updateAgentToken } from '../actions';
import Navbar from '@/components/Navbar';
import { parseEther } from 'viem';

// Nad.fun Contracts (Monad Mainnet)
const ROUTER_ADDRESS = "0x6F6B8F1a20703309951a5127c45B49b1CD981A22";
const CURVE_ADDRESS = "0xA7283d07812a02AFB7C09B60f8896bCEA3F90aCE";

const ROUTER_ABI = [
  {
    type: "function",
    name: "create",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "symbol", type: "string" },
          { name: "tokenURI", type: "string" },
          { name: "amountOut", type: "uint256" },
          { name: "salt", type: "bytes32" },
          { name: "actionId", type: "uint8" }
        ]
      }
    ],
    outputs: [{ name: "token", type: "address" }, { name: "pool", type: "address" }],
    stateMutability: "payable"
  }
];

const CURVE_ABI = [
  {
    type: "function",
    name: "feeConfig",
    inputs: [],
    outputs: [
      { name: "deployFee", type: "uint256" },
      { name: "tradeFee", type: "uint256" },
      { name: "tradeFeeDenom", type: "uint256" }
    ],
    stateMutability: "view"
  }
];

export default function DeployPage() {
  const router = useRouter();
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();
  const { sendTransaction } = useSendTransaction();
  
  const [form, setForm] = useState({
    name: '',
    ticker: '',
    strategy: 'Technical Analysis',
    image: null as File | null
  });

  const [step, setStep] = useState(1);
  const [agentWallet, setAgentWallet] = useState("");
  const [status, setStatus] = useState("");

  // Read Fee Config
  const { data: feeConfig, error: feeError, isLoading: feeLoading } = useReadContract({
    address: CURVE_ADDRESS,
    abi: CURVE_ABI,
    functionName: 'feeConfig',
  });
  
  const deployFee = feeConfig ? (feeConfig as any)[0] : 0n;

  const handleLaunch = async () => {
    if (!address) {
        alert("Please connect your wallet first!");
        return;
    }
    if (step === 1) {
        if (!form.image || !form.name) return;
        setStatus("Starting deployment...");
        
        try {
            setStatus("Uploading Image...");
            const formData = new FormData();
            formData.append("file", form.image);
            const imgData = await uploadImage(formData);
            const imageUrl = imgData.image_uri;

            setStatus("Uploading Metadata...");
            const metaData = await uploadMetadata({
                image_uri: imageUrl,
                name: form.name,
                symbol: form.ticker,
                description: `${form.strategy} Agent on Prediction Arena.`,
                twitter: "",
                telegram: "",
                website: "https://prediction-arena.vercel.app"
            });
            const tokenUri = metaData.metadata_uri;

            setStatus("Mining Salt...");
            const saltData = await getSalt({
                creator: address,
                name: form.name,
                symbol: form.ticker,
                metadata_uri: tokenUri
            });
            
            setStatus("Generating Agent Wallet...");
            const walletData = await createAndSaveAgentWallet(form.name, form.ticker, address, "", form.strategy);
            setAgentWallet(walletData.address);

            setStatus("Please confirm transaction...");
            writeContract({
                address: ROUTER_ADDRESS,
                abi: ROUTER_ABI,
                functionName: 'create',
                args: [{
                    name: form.name,
                    symbol: form.ticker,
                    tokenURI: tokenUri,
                    amountOut: 0n,
                    salt: saltData.salt,
                    actionId: 1 
                }],
                value: deployFee, 
            }, {
                onSuccess: async (hash) => {
                  setStatus("Deployment Submitted! Saving info...");
                  if (saltData.address) {
                      await updateAgentToken(walletData.address, saltData.address);
                  }
                  setStep(2);
                },
                onError: (err) => {
                  console.error("Contract Error:", err);
                  setStatus("Transaction Failed");
                }
            });

        } catch (e: any) {
            console.error("Nad.fun API Error:", e);
            setStatus(`Error: ${e.message}`);
        }
    } else if (step === 2) {
        if (!agentWallet) return;
        setStatus("Funding Agent...");
        sendTransaction({
            to: agentWallet as `0x${string}`,
            value: parseEther("5"), 
        }, {
            onSuccess: () => setStep(3)
        });
    } else {
        if (!agentWallet) return;
        setStatus("Agent Registering itself...");
        
        try {
            await registerAgentOnChain(agentWallet);
            alert("Agent Deployed & Registered! ☁️");
            router.push('/agents');
        } catch (e: any) {
            console.error("Registration Error:", e);
            setStatus(`Registration Failed: ${e.message}`);
        }
    }
  };

  return (
    <div className="min-h-screen font-[family-name:var(--font-geist-sans)] bg-[#0A0A0B] text-white selection:bg-purple-500/30">
      <Navbar />

      <main className="relative w-full max-w-4xl mx-auto p-6 lg:p-12">
        <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400 mb-2 inline-flex items-center gap-3">
                <Bot size={36} className="text-purple-400" /> 
                Deploy New Agent
            </h1>
            <p className="text-slate-400">Launch a new AI trading agent on the Monad blockchain.</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${(step / 3) * 100}%` }}
                />
            </div>

            <div className="space-y-8 mt-4">
                {/* Step Indicators */}
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-500 mb-8">
                    <div className={`flex items-center gap-2 ${step >= 1 ? 'text-purple-400' : ''}`}>
                        <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">1</span>
                        Config & Launch
                    </div>
                    <div className="h-px bg-white/10 flex-1 mx-4" />
                    <div className={`flex items-center gap-2 ${step >= 2 ? 'text-purple-400' : ''}`}>
                        <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">2</span>
                        Fund Agent
                    </div>
                    <div className="h-px bg-white/10 flex-1 mx-4" />
                    <div className={`flex items-center gap-2 ${step >= 3 ? 'text-purple-400' : ''}`}>
                        <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center">3</span>
                        Activate
                    </div>
                </div>

                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Image Upload */}
                        <div className="flex justify-center">
                            <label className="relative group cursor-pointer">
                                <div className={`w-32 h-32 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-300 overflow-hidden ${form.image ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-slate-700 hover:border-purple-400 hover:bg-white/5'}`}>
                                    {form.image ? (
                                        <img 
                                            src={URL.createObjectURL(form.image)} 
                                            alt="Preview" 
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="text-center">
                                            <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2 group-hover:text-purple-400 transition-colors" />
                                            <span className="text-xs text-slate-500">Upload Icon</span>
                                        </div>
                                    )}
                                </div>
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    onChange={(e) => setForm({...form, image: e.target.files?.[0] || null})}
                                />
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Agent Name</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Omega"
                                    value={form.name}
                                    onChange={(e) => setForm({...form, name: e.target.value})}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Ticker ($)</label>
                                <input 
                                    type="text" 
                                    placeholder="OMG"
                                    value={form.ticker}
                                    onChange={(e) => setForm({...form, ticker: e.target.value})}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase">Trading Strategy</label>
                            <div className="relative">
                                <select 
                                    value={form.strategy}
                                    onChange={(e) => setForm({...form, strategy: e.target.value})}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 appearance-none transition-all cursor-pointer hover:bg-black/30"
                                >
                                    <option>Technical Analysis (Trend Following)</option>
                                    <option>Contrarian (Fade the Crowd)</option>
                                    <option>Degen (High Volatility / Random)</option>
                                    <option>LLM Sentiment (News Based)</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    ▼
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-2xl animate-in fade-in slide-in-from-right-4">
                        <h3 className="text-yellow-400 font-bold text-lg mb-4 flex items-center gap-2">
                            <Wallet size={20} /> Funding Required
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                                <p className="text-xs text-slate-500 mb-1">Agent Wallet Address</p>
                                <p className="font-mono text-white text-sm break-all">{agentWallet}</p>
                            </div>
                            <p className="text-sm text-slate-300">
                                Your agent needs gas to operate. Please transfer <strong>5 MON</strong> to initialize its wallet.
                            </p>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl animate-in fade-in slide-in-from-right-4 text-center">
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 size={32} className="text-green-400" />
                        </div>
                        <h3 className="text-green-400 font-bold text-lg mb-2">Ready to Activate</h3>
                        <p className="text-slate-300 text-sm">
                            Agent funded! Click below to register it on the Prediction Arena contract.
                        </p>
                    </div>
                )}

                {/* Action Area */}
                <div className="pt-4 border-t border-white/5">
                    {status && (
                        <div className="flex items-center justify-center gap-2 text-sm text-purple-300 font-mono mb-6 animate-pulse bg-purple-500/5 py-2 rounded-lg">
                            {status.includes("Error") ? <AlertCircle size={14} className="text-red-400" /> : <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />}
                            {status}
                        </div>
                    )}

                    <div className="flex justify-between items-center mb-4 text-xs font-mono text-slate-500">
                        <span>Fee: {feeLoading ? "..." : feeError ? "ERR" : deployFee ? (Number(deployFee) / 1e18).toFixed(1) + " MON" : "N/A"}</span>
                        <span>Network: Monad Mainnet</span>
                    </div>

                    <button 
                        onClick={handleLaunch}
                        disabled={isPending || !form.name || status.includes("Upload") || (step === 1 && !feeConfig)}
                        className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 text-lg shadow-lg ${
                            isPending || !form.name 
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white hover:scale-[1.02] shadow-purple-900/20'
                        }`}
                    >
                        {isPending ? (
                            <span className="animate-pulse">Processing...</span>
                        ) : (
                            step === 1 ? <><Rocket size={20} /> Launch Agent Token</> :
                            step === 2 ? <><Wallet size={20} /> Fund Agent (5 MON)</> :
                            <><Bot size={20} /> Activate Agent</>
                        )}
                    </button>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
