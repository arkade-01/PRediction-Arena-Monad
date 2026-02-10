import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// --- Configuration ---
const CHAINS = {
    testnet: {
        id: 10143,
        name: 'Monad Testnet',
        network: 'monad-testnet',
        nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
        rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } },
        contracts: {
            lens: "0xB056d79CA5257589692699a46623F901a3BB76f1",
            router: "0x865054F0F6A288adaAc30261731361EA7E908003"
        }
    },
    mainnet: {
        id: 143,
        name: 'Monad Mainnet',
        network: 'monad-mainnet',
        nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
        rpcUrls: { default: { http: ['https://rpc.monad.xyz'] } },
        contracts: {
            lens: "0x7e78A8DE94f21804F7a17F4E8BF9EC2c872187ea",
            router: "0x6F6B8F1a20703309951a5127c45B49b1CD981A22"
        }
    }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Look for .env in project root
dotenv.config({ path: path.join(__dirname, '../.env') });

// Default to MAINNET
const NETWORK = process.env.NETWORK || 'mainnet';
// @ts-ignore
const CONFIG = CHAINS[NETWORK];

// --- ABIs ---
const LENS_ABI = [
    {
        name: "getAmountOut",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "token", type: "address" },
            { name: "amountIn", type: "uint256" },
            { name: "isBuy", type: "bool" }
        ],
        outputs: [
            { name: "router", type: "address" },
            { name: "amountOut", type: "uint256" }
        ]
    }
];

const ROUTER_ABI = [
    {
        name: "buy",
        type: "function",
        stateMutability: "payable",
        inputs: [
            {
                type: "tuple",
                components: [
                    { name: "amountOutMin", type: "uint256" },
                    { name: "token", type: "address" },
                    { name: "to", type: "address" },
                    { name: "deadline", type: "uint256" }
                ]
            }
        ],
        outputs: [{ type: "uint256" }]
    }
];

// --- Main Script ---
async function main() {
    console.log(`\n🤖 Starting Agent Buyback Script`);
    console.log(`🌍 Network: ${CONFIG.name}`);

    // 1. Setup Wallet
    const privateKey = process.env.PRIVATE_KEY || process.env.MONAD_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("❌ PRIVATE_KEY not found in .env");
    }
    // @ts-ignore
    const account = privateKeyToAccount(privateKey);
    console.log(`👛 Wallet: ${account.address}`);

    const client = createPublicClient({
        // @ts-ignore
        chain: CONFIG,
        transport: http()
    });

    const wallet = createWalletClient({
        account,
        // @ts-ignore
        chain: CONFIG,
        transport: http()
    });

    // 2. Load Token Data
    // Look for agents.json in web/ folder
    const agentsPath = path.join(__dirname, '../web/agents.json');
    
    if (!fs.existsSync(agentsPath)) {
        throw new Error(`❌ Agent data not found at ${agentsPath}`);
    }

    const agents = JSON.parse(fs.readFileSync(agentsPath, 'utf8'));
    // Assuming we want to buy back the first agent or loop?
    // For now, let's grab the first one as a POC, or check if user specified one.
    // The previous code used 'nadfun_data.json' which was single-agent.
    // Let's assume the first agent in the array is the target for now.
    
    if (agents.length === 0) {
        throw new Error("❌ No agents found in agents.json");
    }

    // Find agent with an address
    const agentData = agents.find((a: any) => a.contractAddress);
    
    if (!agentData) {
        throw new Error("❌ No deployed agents found (missing contractAddress)");
    }
    
    const tokenAddress = agentData.contractAddress;
    console.log(`🪙 Token: ${agentData.name} (${tokenAddress})`);

    // 3. Determine Buy Amount
    // TODO: Implement dynamic profit calculation. For now, use a fixed small amount.
    const buyAmount = parseEther("0.0001"); // 0.0001 MON
    console.log(`💰 Buy Amount: 0.0001 MON`);

    // Check Balance
    const balance = await client.getBalance({ address: account.address });
    if (balance < buyAmount) {
        throw new Error(`❌ Insufficient balance. Have: ${balance}, Need: ${buyAmount}`);
    }

    // 4. Get Quote from Lens
    console.log("🔍 Fetching quote from Lens...");
    try {
        const [routerFromLens, amountOut] = await client.readContract({
            address: CONFIG.contracts.lens,
            abi: LENS_ABI,
            functionName: "getAmountOut",
            args: [tokenAddress, buyAmount, true]
        });

        // @ts-ignore
        console.log(`📉 Quote: ${amountOut} tokens (Router: ${routerFromLens})`);

        // 5. Execute Buy via Router
        // Calculate Slippage (1%)
        // @ts-ignore
        const amountOutMin = (amountOut * 99n) / 100n;
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 mins

        console.log("🚀 Executing buy transaction...");
        const hash = await wallet.writeContract({
            address: CONFIG.contracts.router,
            abi: ROUTER_ABI,
            functionName: "buy",
            args: [{
                amountOutMin,
                token: tokenAddress,
                to: account.address,
                deadline
            }],
            value: buyAmount
        });

        console.log(`✅ Transaction sent! Hash: ${hash}`);
        console.log("⏳ Waiting for confirmation...");
        
        const receipt = await client.waitForTransactionReceipt({ hash });
        console.log(`🎉 Buyback Complete! Block: ${receipt.blockNumber}`);
        
    } catch (error: any) {
        console.error("\n❌ Error during buyback execution:");
        if (error.shortMessage) console.error(error.shortMessage);
        else console.error(error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
