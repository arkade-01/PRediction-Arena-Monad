import { ethers, Wallet, JsonRpcProvider, Contract } from "ethers";
import axios from "axios";

// ----------------------------------------------------------------------------
// CONFIG
// ----------------------------------------------------------------------------
const CONTRACT_ADDRESS = "0x354291588084bA8fB682a6414366e0E8552369CE";
const PYTH_HERMES_URL = "https://hermes.pyth.network/v2/updates/price/latest";
// "Alpha" / Admin Key
const PRIVATE_KEY = "0x11444aa2db17883d3f84ceda36d0217342ad780f3a8c3f48b561dd5a4c4cf88f";
const RPC_URL = "https://testnet-rpc.monad.xyz/";

const TARGET_ACTIVE_ROUNDS = 5; // Keep the arena busy

// Assets to cycle through
const ASSETS = [
  { symbol: "BTC", id: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43" },
  { symbol: "ETH", id: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace" },
  { symbol: "SOL", id: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d" },
  { symbol: "PEPE", id: "0xd69733a2d0739f35368a18357d1979fb93d0c9f8099e0344d56f64264b3c43da" } // Just for fun if valid, else fallback to majors
];

// ----------------------------------------------------------------------------
// ABIs
// ----------------------------------------------------------------------------
const ARENA_ABI = [
  "function roundCount() external view returns (uint256)",
  "function rounds(uint256) external view returns (uint256 id, string question, bytes32 pythPriceId, uint256 entryFee, uint256 startTime, uint256 endTime, int64 outcome, bool resolved, bool cancelled, bool usePyth)",
  "function createPythRound(string memory _question, bytes32 _pythPriceId, uint256 _entryFee, uint256 _duration) external",
  "function resolveWithPyth(uint256 _roundId, bytes[] priceUpdateData) external payable",
  "function pyth() external view returns (address)"
];

const PYTH_ABI = [
  "function getUpdateFee(bytes[] calldata updateData) external view returns (uint256 feeAmount)"
];

// ----------------------------------------------------------------------------
// MAIN
// ----------------------------------------------------------------------------
async function main() {
  console.log("🎩 Starting Game Master Agent...");
  
  const provider = new JsonRpcProvider(RPC_URL);
  const wallet = new Wallet(PRIVATE_KEY, provider);
  console.log(`   Acting as: ${wallet.address}`);

  const arena = new Contract(CONTRACT_ADDRESS, ARENA_ABI, wallet);

  // 1. ANALYZE STATE
  // ----------------
  const roundCount = await arena.roundCount();
  console.log(`   Total Rounds: ${roundCount}`);
  
  const now = Math.floor(Date.now() / 1000);
  let activeRounds = 0;
  const expiredRounds = [];

  // Look back at last 20 rounds to save RPC calls, assuming older ones are settled
  // (In prod, we'd index this off-chain)
  const scanStart = Number(roundCount) > 20 ? Number(roundCount) - 19 : 1;

  for (let i = Number(roundCount); i >= scanStart; i--) {
    try {
        const r = await arena.rounds(i);
        // r: [id, question, pythPriceId, entryFee, startTime, endTime, outcome, resolved, cancelled, usePyth]
        const endTime = Number(r.endTime);
        const isResolved = r.resolved;
        const isCancelled = r.cancelled;
        
        if (isResolved || isCancelled) continue;

        if (endTime > now) {
            activeRounds++;
            // console.log(`      Active: #${i} (Ends in ${endTime - now}s)`);
        } else {
            // Expired but not resolved
            expiredRounds.push({ id: i, pythId: r.pythPriceId });
        }
    } catch (e) {
        console.log(`   ⚠️ Error reading round ${i}`);
    }
  }

  console.log(`   📊 Stats: ${activeRounds} Active | ${expiredRounds.length} Pending Resolution`);

  // 2. RESOLVE ROUNDS
  // -----------------
  if (expiredRounds.length > 0) {
    console.log(`\n   ⚖️  Resolving ${expiredRounds.length} rounds...`);
    
    // Fetch Pyth Address for fee calc
    const pythAddr = await arena.pyth();
    const pythContract = new Contract(pythAddr, PYTH_ABI, wallet);

    for (const round of expiredRounds) {
        try {
            console.log(`      Processing Round #${round.id}...`);
            
            // Fetch Hermes Data
            const response = await axios.get(PYTH_HERMES_URL, {
                params: { ids: [round.pythId], binary: true },
                timeout: 5000
            });
            const updateData = response.data.binary.data.map((d: string) => "0x" + d);
            
            // Calculate Fee
            const fee = await pythContract.getUpdateFee(updateData);
            
            // Execute
            const tx = await arena.resolveWithPyth(round.id, updateData, { value: fee });
            console.log(`      Tx: ${tx.hash}`);
            await tx.wait();
            console.log(`      ✅ Resolved!`);
        } catch (e) {
            console.log(`      ❌ Failed to resolve #${round.id}:`, (e as any).message);
        }
    }
  }

  // 3. CREATE ROUNDS
  // ----------------
  const roundsNeeded = TARGET_ACTIVE_ROUNDS - activeRounds;
  if (roundsNeeded > 0) {
    console.log(`\n   🌱 Creating ${roundsNeeded} new rounds...`);
    
    for (let i = 0; i < roundsNeeded; i++) {
        const asset = ASSETS[Math.floor(Math.random() * ASSETS.length)];
        
        // Random Duration: 5m, 15m, 30m, 1h
        const durations = [300, 900, 1800, 3600];
        const duration = durations[Math.floor(Math.random() * durations.length)];
        const durationLabel = duration === 300 ? "5m" : duration === 900 ? "15m" : duration === 1800 ? "30m" : "1h";

        // Varied Entry Fees: Micro-stakes for now
        const fees = ["0.001", "0.005"];
        const feeEth = fees[Math.floor(Math.random() * fees.length)];
        const entryFee = ethers.parseEther(feeEth);

        const question = `Will ${asset.symbol} go UP in the next ${durationLabel}?`;
        
        console.log(`      Creating: "${question}" (Fee: ${feeEth} MON)`);

        try {
            const tx = await arena.createPythRound(
                question,
                asset.id,
                entryFee,
                duration,
                { gasLimit: 500000 }
            );
            // Don't await wait() for speed, just broadcast
            // await tx.wait(); 
            console.log(`      🚀 Sent: ${tx.hash}`);
        } catch (e) {
            console.log(`      ❌ Failed to create:`, (e as any).message);
        }
        
        // Small delay to prevent nonce issues if we blast too fast
        await new Promise(r => setTimeout(r, 1000));
    }
  } else {
    console.log(`\n   ✨ Arena is healthy (${activeRounds} active). No new rounds needed.`);
  }

  console.log("\n🏁 Game Master finished cycle.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
