'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseAbi, parseEther, formatEther } from 'viem';
import { DollarSign, Loader2, X, ArrowDown, Wallet, ArrowUpDown } from 'lucide-react';
import { createPortal } from 'react-dom';

const BONDING_CURVE_ROUTER = "0x6F6B8F1a20703309951a5127c45B49b1CD981A22";
const LENS = "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea";

const ROUTER_ABI = parseAbi([
  "function buy((uint256 amountOutMin, address token, address to, uint256 deadline) params) external payable returns (uint256)",
  "function sell((uint256 amountIn, uint256 amountOutMin, address token, address to, uint256 deadline) params) external returns (uint256)",
]);

const LENS_ABI = parseAbi([
  "function getAmountOut(address token, uint256 amountIn, bool isBuy) view returns (address router, uint256 amountOut)"
]);

const ERC20_ABI = parseAbi([
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function balanceOf(address account) view returns (uint256)"
]);

interface BuyAgentButtonProps {
    tokenAddress: string;
    ticker: string;
}

export default function BuyAgentButton({ tokenAddress, ticker }: BuyAgentButtonProps) {
    const { address } = useAccount();
    const [isOpen, setIsOpen] = useState(false);
    const [isBuy, setIsBuy] = useState(true); // Toggle Buy vs Sell
    const [amount, setAmount] = useState('0.1');

    // Balance Hooks
    const { data: monBalance } = useBalance({ address });
    const { data: tokenBalance, refetch: refetchTokenBal } = useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
        query: { enabled: isOpen && !!address }
    });

    // Write Hooks
    const { writeContract, data: hash, isPending, reset: resetWrite } = useWriteContract();
    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

    // Allowance Hook (Only for Sell)
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address as `0x${string}`, BONDING_CURVE_ROUTER],
        query: { enabled: !isBuy && !!address }
    });

    // Quote Hook
    const { data: quoteData, isLoading: isQuoting } = useReadContract({
        address: LENS,
        abi: LENS_ABI,
        functionName: 'getAmountOut',
        args: [tokenAddress as `0x${string}`, parseEther(amount || '0'), isBuy], // isBuy toggle
        query: {
            enabled: isOpen && parseFloat(amount) > 0,
        }
    });

    const amountOut = quoteData ? quoteData[1] : 0n;
    const isApproving = !isBuy && allowance !== undefined && allowance < parseEther(amount || '0');

    // Toggle Direction
    const toggleDirection = () => {
        setIsBuy(!isBuy);
        setAmount(''); 
    };

    const handleAction = () => {
        if (!address) return;
        const parsedAmount = parseEther(amount);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);

        if (isBuy) {
            // BUY
            const amountOutMin = (amountOut * 99n) / 100n; // 1% Slippage
            writeContract({
                address: BONDING_CURVE_ROUTER,
                abi: ROUTER_ABI,
                functionName: 'buy',
                args: [{
                    amountOutMin,
                    token: tokenAddress as `0x${string}`,
                    to: address,
                    deadline
                }],
                value: parsedAmount,
            });
        } else {
            // SELL
            if (isApproving) {
                // APPROVE
                writeContract({
                    address: tokenAddress as `0x${string}`,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [BONDING_CURVE_ROUTER, parsedAmount],
                });
            } else {
                // SELL EXECUTE
                const amountOutMin = (amountOut * 99n) / 100n;
                writeContract({
                    address: BONDING_CURVE_ROUTER,
                    abi: ROUTER_ABI,
                    functionName: 'sell',
                    args: [{
                        amountIn: parsedAmount,
                        amountOutMin,
                        token: tokenAddress as `0x${string}`,
                        to: address,
                        deadline
                    }],
                });
            }
        }
    };

    // Helper: Get Max Balance
    const setMax = () => {
        if (isBuy && monBalance) {
            const max = parseFloat(monBalance.formatted) - 0.01;
            setAmount(max > 0 ? max.toFixed(4) : '0');
        } else if (!isBuy && tokenBalance !== undefined) {
             // @ts-ignore
            setAmount(formatEther(tokenBalance));
        }
    };

    // Helper: Display Balances
    const inputBalance = isBuy 
        ? monBalance ? parseFloat(monBalance.formatted).toFixed(4) : '--'
        // @ts-ignore
        : tokenBalance !== undefined ? parseFloat(formatEther(tokenBalance)).toFixed(4) : '--';

    const inputTicker = isBuy ? 'MON' : ticker;
    const outputTicker = isBuy ? ticker : 'MON';

    // Reset flow on close or success
    const handleClose = () => {
        setIsOpen(false);
        resetWrite();
    };

    // Refetch allowance after approval success
    if (isConfirmed && isApproving) {
        refetchAllowance();
        resetWrite(); // Reset to allow next tx
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold py-2.5 rounded-lg transition-colors shadow-lg shadow-green-900/20 border border-white/10"
            >
                <DollarSign size={12} /> Buy ${ticker}
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-[#13141b] border border-white/10 rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 mx-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Swap</h2>
                            <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Input (You Pay) */}
                        <div className="bg-[#0A0A0B] rounded-2xl p-4 mb-2 border border-white/5 focus-within:border-purple-500/50 transition-colors">
                            <div className="flex justify-between text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">
                                <span>You Pay</span>
                                <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-1"><Wallet size={10} /> Bal: {inputBalance}</span>
                                    <button onClick={setMax} className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded hover:bg-purple-500/30 transition-colors">MAX</button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <input 
                                    type="number" 
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-transparent text-3xl font-bold text-white focus:outline-none placeholder:text-slate-600"
                                    placeholder="0.0"
                                />
                                <div className="flex items-center gap-2 bg-slate-800 rounded-full px-3 py-1.5 shrink-0 ml-4 border border-white/5 min-w-[90px] justify-center">
                                    <span className="font-bold text-white text-sm">{inputTicker}</span>
                                </div>
                            </div>
                        </div>

                        {/* Arrow Switcher */}
                        <div className="flex justify-center -my-3 relative z-10">
                            <div className="bg-[#13141b] p-1.5 rounded-xl border border-white/10">
                                <button 
                                    onClick={toggleDirection}
                                    className="bg-slate-800 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                                >
                                    <ArrowUpDown size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Output (You Receive) */}
                        <div className="bg-[#0A0A0B] rounded-2xl p-4 mt-2 border border-white/5">
                            <div className="flex justify-between text-xs text-slate-500 mb-2 font-bold uppercase tracking-wide">
                                <span>You Receive</span>
                                <span>Quote</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className={`text-3xl font-bold ${isQuoting ? 'text-slate-500 animate-pulse' : 'text-white'}`}>
                                    {amountOut > 0n ? parseFloat(formatEther(amountOut)).toFixed(4) : '0.00'}
                                </div>
                                <div className="flex items-center gap-2 bg-slate-800 rounded-full px-3 py-1.5 shrink-0 ml-4 border border-white/5 min-w-[90px] justify-center">
                                    <span className="font-bold text-white text-sm">{outputTicker}</span>
                                </div>
                            </div>
                            <div className="text-xs text-slate-500 mt-2 flex justify-between">
                                <span></span>
                                {amountOut > 0n && (
                                    <span className="text-emerald-400">1 {inputTicker} = {(Number(amountOut) / Number(parseEther(amount || '1'))).toFixed(4)} {outputTicker}</span>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={handleAction}
                            disabled={isPending || isConfirming || !amountOut || parseFloat(amount) <= 0}
                            className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 text-white font-bold py-4 rounded-2xl text-lg transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {isPending || isConfirming 
                                ? <><Loader2 className="animate-spin" /> {isPending ? 'Check Wallet' : 'Confirming...'}</> 
                                : isApproving ? `Approve ${ticker}` 
                                : !amountOut ? 'Enter Amount' 
                                : 'Swap'}
                        </button>
                        
                        {isConfirmed && !isApproving && (
                             <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 rounded-3xl backdrop-blur-md animate-in fade-in">
                                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-green-500/50">
                                    <DollarSign size={32} className="text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2">Swap Successful!</h3>
                                <div className="flex gap-3 w-full px-8 mt-4">
                                    <a href={`https://monadscan.com/tx/${hash}`} target="_blank" className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-xl text-center">View Tx</a>
                                    <button onClick={handleClose} className="flex-1 bg-white text-black font-bold py-3 rounded-xl">Close</button>
                                </div>
                             </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
