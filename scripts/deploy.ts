import hre from "hardhat";

// Pyth Monad Mainnet Address
const PYTH_ADDRESS = "0x2880aB155794e7179c9eE2e38200202908C17B43";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying to network...");
  console.log("Deployer:", deployer.address);
  console.log("Pyth Oracle:", PYTH_ADDRESS);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "MON");

  const PredictionArena = await hre.ethers.getContractFactory("PredictionArena");
  const arena = await PredictionArena.deploy(PYTH_ADDRESS);

  await arena.waitForDeployment();
  const address = await arena.getAddress();

  console.log("\n✅ PredictionArena deployed!");
  console.log("Address:", address);
  console.log("\nVerify with:");
  console.log(`npx hardhat verify --network monadMainnet ${address} ${PYTH_ADDRESS}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
