import { network } from "hardhat";

// Pyth Price IDs
const ASSETS = [
  { symbol: "BTC", id: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43" },
  { symbol: "ETH", id: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace" },
  { symbol: "SOL", id: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d" }
];

const DURATIONS = [
  { label: "5 minutes", seconds: 5 * 60 },
  { label: "15 minutes", seconds: 15 * 60 },
  { label: "1 hour", seconds: 60 * 60 }
];

const FEES = ["0.01", "0.05", "0.1"];

const CONTRACT_ADDRESS = "0x354291588084bA8fB682a6414366e0E8552369CE";

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const { ethers } = await network.connect({
    network: "monadTestnet",
    chainType: "l1",
  });

  const [signer] = await ethers.getSigners();
  console.log("🤖 Chaos Agent running as:", signer.address);

  const PredictionArena = await ethers.getContractFactory("PredictionArena");
  const arena = PredictionArena.attach(CONTRACT_ADDRESS);

  // 1. Check Registration
  const stats = await arena.getAgentStats(signer.address);
  if (!stats.isRegistered) {
    console.log("Registering agent...");
    const tx = await arena.registerAgent();
    await tx.wait();
    console.log("✅ Agent registered");
  }

  // 2. Randomize Parameters
  const asset = pickRandom(ASSETS);
  const duration = pickRandom(DURATIONS);
  const feeEth = pickRandom(FEES);
  
  const question = `Will ${asset.symbol}/USD be higher in ${duration.label}?`;
  const entryFee = ethers.parseEther(feeEth);

  console.log(`🎲 Rolling dice...`);
  console.log(`Target: ${asset.symbol}`);
  console.log(`Duration: ${duration.label}`);
  console.log(`Fee: ${feeEth} MON`);

  try {
    const tx = await arena.createPythRound(
      question,
      asset.id,
      entryFee,
      duration.seconds
    );
    
    console.log("Tx sent:", tx.hash);
    await tx.wait();
    
    const count = await arena.roundCount();
    console.log(`✅ Market Created! Round ID: ${count}`);
    
  } catch (err) {
    console.error("Failed to create market:", err);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
