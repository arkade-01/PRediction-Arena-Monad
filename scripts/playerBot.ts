import { network } from "hardhat";
import { Wallet } from "ethers";

const CONTRACT_ADDRESS = "0x354291588084bA8fB682a6414366e0E8552369CE";
const PLAYER_PRIVATE_KEY = "0xae167ccfca811b0c1d418e3329f2e2340e3faf524d4b0ac22ea2c974969dbea7";

async function main() {
  const { ethers } = await network.connect({
    network: "monadTestnet",
    chainType: "l1",
  });

  // Use the player wallet
  const playerWallet = new Wallet(PLAYER_PRIVATE_KEY, ethers.provider);
  console.log("🎮 Player Bot running as:", playerWallet.address);

  const balance = await ethers.provider.getBalance(playerWallet.address);
  console.log("Balance:", ethers.formatEther(balance), "MON");

  const PredictionArena = await ethers.getContractFactory("PredictionArena");
  const arena = PredictionArena.attach(CONTRACT_ADDRESS).connect(playerWallet) as any;

  // 1. Check/Do Registration
  const stats = await arena.getAgentStats(playerWallet.address);
  if (!stats.isRegistered) {
    console.log("Registering player agent...");
    const tx = await arena.registerAgent();
    await tx.wait();
    console.log("✅ Player registered!");
  } else {
    console.log("✅ Already registered");
  }

  // 2. Find active rounds to bet on
  const roundCount = await arena.roundCount();
  console.log(`Checking ${roundCount} rounds for betting opportunities...`);

  const now = Math.floor(Date.now() / 1000);

  for (let i = 1; i <= Number(roundCount); i++) {
    const round = await arena.rounds(i);
    
    // Check if round is LIVE (not resolved, not cancelled, not ended)
    if (!round.resolved && !round.cancelled && Number(round.endTime) > now) {
      // Check if we already bet
      const prediction = await arena.predictions(i, playerWallet.address);
      if (prediction.timestamp > 0) {
        console.log(`Round #${i}: Already bet.`);
        continue;
      }

      console.log(`\n🎯 Found active Round #${i}: "${round.question}"`);
      console.log(`Entry Fee: ${ethers.formatEther(round.entryFee)} MON`);
      
      // Generate a random prediction (for price predictions, guess around current price)
      // For BTC ~76000-78000 * 1e8, ETH ~3000-3500 * 1e8, SOL ~150-200 * 1e8
      // We'll just pick a random value in a reasonable range
      const randomPrediction = BigInt(Math.floor(Math.random() * 10000000000000)); // Random int64
      
      try {
        console.log(`Submitting prediction: ${randomPrediction}`);
        const tx = await arena.submitPrediction(i, randomPrediction, { 
          value: round.entryFee 
        });
        console.log("Tx sent:", tx.hash);
        await tx.wait();
        console.log(`✅ Bet placed on Round #${i}!`);
      } catch (err: any) {
        console.error(`Failed to bet on Round #${i}:`, err.message || err);
      }
    }
  }

  console.log("\n🎮 Player Bot done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
