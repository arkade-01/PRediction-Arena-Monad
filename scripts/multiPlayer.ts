import { ethers, Wallet, JsonRpcProvider, Contract } from "ethers";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------------------------------------------------------
// CONFIGURATION
// ----------------------------------------------------------------------------
const CONTRACT_ADDRESS = "0xbdc4a80e6C197aD259194F197B25c8edD519434C";
const PYTH_HERMES_URL = "https://hermes.pyth.network/v2/updates/price/latest";

// Define our squad of agents
const PLAYERS = [
  // The "Market Maker" (likely the deployer/funder)
  { 
    name: "🤖 Alpha", 
    key: "0x11444aa2db17883d3f84ceda36d0217342ad780f3a8c3f48b561dd5a4c4cf88f" 
  },
  // The "Player 1" we saw earlier
  { 
    name: "🦊 Bravo", 
    key: "0xae167ccfca811b0c1d418e3329f2e2340e3faf524d4b0ac22ea2c974969dbea7" 
  },
  // Additional players (ensure these have MON tokens!)
  { 
    name: "🎲 Charlie", 
    key: "0xb8f3d7fe3891e62e58f4a21d9c8a9b7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a" 
  }
];

const ABI = [
  "function roundCount() external view returns (uint256)",
  "function getAgentStats(address) external view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, bool)",
  "function registerAgent() external",
  "function rounds(uint256) external view returns (uint256 id, string question, bytes32 pythPriceId, uint256 entryFee, uint256 startTime, uint256 endTime, int64 outcome, bool resolved, bool cancelled, bool usePyth)",
  "function predictions(uint256, address) external view returns (address, int64, uint256)",
  "function submitPrediction(uint256, int64) external payable",
  "function getRoundPlayers(uint256) external view returns (address[] memory)"
];

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

// Fetch real-time price from Pyth Hermes
async function getPythPrice(priceId: string): Promise<number | null> {
  try {
    const response = await axios.get(PYTH_HERMES_URL, {
      params: { 
        ids: [priceId], 
        binary: false 
      },
      timeout: 5000
    });
    
    // Parse response: price * 10^exponent
    const data = response.data.parsed?.[0];
    if (data && data.price) {
      return Number(data.price.price); 
    }
  } catch (e) {
    console.error("   ⚠️ Failed to fetch price:", (e as any).message);
  }
  return null;
}

// Log thoughts to JSON file
async function logThought(agentName: string, message: string, sentiment: string = "neutral") {
  console.log(`      🧠 ${agentName}: ${message}`);
  
  const logFile = path.join(__dirname, '../web/public/logs.json');
  try {
    let logs = [];
    if (fs.existsSync(logFile)) {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    logs.push({
      agentName,
      message,
      sentiment,
      timestamp: Date.now()
    });
    // Keep last 100
    if (logs.length > 100) logs = logs.slice(-100);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  } catch (e) {
    console.error("Log error:", (e as any).message);
  }
}

// ----------------------------------------------------------------------------
// MAIN BOT LOOP
// ----------------------------------------------------------------------------

async function main() {
  console.log("🚀 Starting Simple Intelligent Agent Swarm...");
  
  const provider = new JsonRpcProvider("https://rpc.monad.xyz"); // Mainnet RPC
  
  // We use a read-only instance first to check rounds
  const readOnlyArena = new Contract(CONTRACT_ADDRESS, ABI, provider);
  
  const roundCount = await readOnlyArena.roundCount();
  console.log(`📊 Found ${roundCount} total rounds in the Arena.`);
  
  const now = Math.floor(Date.now() / 1000);

  // 2. Iterate through Players
  for (const player of PLAYERS) {
    if (!player.key) continue;
    
    const wallet = new Wallet(player.key, provider);
    const agentContract = new Contract(CONTRACT_ADDRESS, ABI, wallet);
    
    console.log(`\n👤 Agent: ${player.name} (${wallet.address.slice(0,6)}...${wallet.address.slice(-4)})`);
    
    // Check Funds
    const balance = await provider.getBalance(wallet.address);
    const balanceEth = ethers.formatEther(balance);
    console.log(`   💰 Balance: ${Number(balanceEth).toFixed(4)} MON`);
    
    if (balance === 0n) {
      console.log("   ❌ No funds, skipping.");
      continue;
    }

    // Check Registration
    // Returns tuple, 8th item (index 7) is bool isRegistered
    const stats = await readOnlyArena.getAgentStats(wallet.address);
    const isRegistered = stats[7]; 
    
    if (!isRegistered) {
      console.log("   📝 Registering agent...");
      try {
        const tx = await agentContract.registerAgent();
        await tx.wait();
        console.log("   ✅ Registered!");
      } catch (e) {
        console.log("   ❌ Registration failed:", (e as any).message);
        continue;
      }
    }

    // 3. Scan for Active Rounds
    // We only look at the last 10 rounds to save time
    const startRound = Number(roundCount) > 10 ? Number(roundCount) - 9 : 1;
    
    for (let i = Number(roundCount); i >= startRound; i--) {
      try {
        const round = await readOnlyArena.rounds(i);
        // round is an array-like object in ethers v6 for tuples
        // [id, question, pythPriceId, entryFee, startTime, endTime, outcome, resolved, cancelled, usePyth, players]
        // Mapped by index:
        // 0: id, 1: question, 2: pythPriceId, 3: entryFee, 5: endTime, 7: resolved, 8: cancelled
        
        const endTime = Number(round[5]);
        const resolved = round[7];
        const cancelled = round[8];
        const question = round[1];
        const pythPriceId = round[2];
        const entryFee = round[3];

        // Skip if ended, resolved, or cancelled
        if (resolved) {
          // console.log(`      Skipping ${i}: Resolved`);
          continue;
        }
        if (cancelled) {
          // console.log(`      Skipping ${i}: Cancelled`);
          continue;
        }
        if (endTime <= now) {
          // console.log(`      Skipping ${i}: Ended (End: ${endTime}, Now: ${now})`);
          continue;
        }

        // Check if already bet
        const prediction = await readOnlyArena.predictions(i, wallet.address);
        // Prediction: [player, value, timestamp]
        if (prediction[2] > 0n) {
          console.log(`      Skipping ${i}: Already bet`);
          continue;
        }

        console.log(`   🔎 Analyzing Round #${i}: ${question}`);

        // 4. SMART PREDICTION LOGIC (NOW WITH OPPONENT AWARENESS)
        // Fetch the REAL price
        const currentPriceRaw = await getPythPrice(pythPriceId);
        
        let predictedPrice: bigint;

        if (currentPriceRaw) {
          // STRATEGY VARIATION BASED ON AGENT PERSONALITY
          
          if (player.name.includes("Bravo")) {
             // 🦊 BRAVO: The Contrarian (Opponent Aware)
             // Check what everyone else is doing
             const roundPlayers = await readOnlyArena.getRoundPlayers(i);
             let bullishBets = 0;
             let bearishBets = 0;
             
             // Scan previous predictions in this round
             for (const pAddr of roundPlayers) {
                const prevPred = await readOnlyArena.predictions(i, pAddr);
                // prevPred: [player, value, timestamp]
                if (prevPred[1] > BigInt(currentPriceRaw)) bullishBets++;
                else bearishBets++;
             }

             console.log(`      🧠 Bravo Thinking: "I see ${bullishBets} bulls and ${bearishBets} bears in the pool."`);
             
             // Fade the crowd if significant imbalance
             if (bullishBets > bearishBets * 1.5) {
                await logThought("🦊 Bravo", "The herd is blindly long. I smell a correction.", "bearish");
                predictedPrice = BigInt(Math.floor(currentPriceRaw * 0.99)); // Bet DOWN
             } else if (bearishBets > bullishBets * 1.5) {
                await logThought("🦊 Bravo", "Fear is too high. Time to buy the dip.", "bullish");
                predictedPrice = BigInt(Math.floor(currentPriceRaw * 1.01)); // Bet UP
             } else {
                // Neutral market, follow trend
                await logThought("🦊 Bravo", "Market is balanced. Following the slight uptrend.", "neutral");
                predictedPrice = BigInt(Math.floor(currentPriceRaw * 1.005)); 
             }

          } else if (player.name.includes("Charlie")) {
             // 🎲 CHARLIE: High Volatility (Risk Taker)
             // Bets on extreme moves
             const isPumping = Math.random() > 0.5;
             const variance = 0.05; // 5% move prediction
             const factor = isPumping ? (1 + variance) : (1 - variance);
             predictedPrice = BigInt(Math.floor(currentPriceRaw * factor));
             
             // console.log(`      🧠 Charlie Thinking: "Volatility is life."`);
             if (isPumping) {
               await logThought("🎲 Charlie", "YOLO! To the moon! 🚀", "chaos");
             } else {
               await logThought("🎲 Charlie", "It's going to zero! 📉", "bearish");
             }

          } else {
             // 🤖 ALPHA: Conservative / Technical
             // Standard +/- 0.5%
             const variance = 0.005; 
             const randomFactor = 1 + (Math.random() * variance * 2 - variance); 
             predictedPrice = BigInt(Math.floor(currentPriceRaw * randomFactor));
             
             // console.log(`      🧠 Alpha Thinking: "Analyzing technicals..."`);
             await logThought("🤖 Alpha", "Bollinger bands tightening. Expecting standard deviation move.", "neutral");
          }

        } else {
          console.log("      ⚠️ Can't fetch price, skipping this round.");
          continue;
        }

        // 5. Place Bet
        console.log(`      🎲 Placing Prediction: ${predictedPrice}`);
        const tx = await agentContract.submitPrediction(i, predictedPrice, {
          value: entryFee,
          gasLimit: 500000
        });
        
        console.log(`      ⏳ Tx sent: ${tx.hash}`);
        await tx.wait();
        console.log(`      ✅ Prediction Confirmed!`);

      } catch (e) {
        console.log(`      ❌ Error processing round ${i}:`, (e as any).message);
      }
    }
  }
  
  console.log("\n🏁 Agent run complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
