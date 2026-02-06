import { ethers, Wallet, JsonRpcProvider, Contract } from "ethers";
import axios from "axios";

const CONTRACT_ADDRESS = "0xbdc4a80e6C197aD259194F197B25c8edD519434C";
const PYTH_HERMES_URL = "https://hermes.pyth.network/v2/updates/price/latest";
const PRIVATE_KEY = "0x11444aa2db17883d3f84ceda36d0217342ad780f3a8c3f48b561dd5a4c4cf88f"; // Alpha Key

async function main() {
  const provider = new JsonRpcProvider("https://rpc.monad.xyz"); // Mainnet
  const wallet = new Wallet(PRIVATE_KEY, provider);
  console.log("🕵️  Resolution Agent running as:", wallet.address);

  const ABI = [
    "function roundCount() external view returns (uint256)",
    "function rounds(uint256) external view returns (uint256 id, string question, bytes32 pythPriceId, uint256 entryFee, uint256 startTime, uint256 endTime, int64 outcome, bool resolved, bool cancelled, bool usePyth)",
    "function pyth() external view returns (address)",
    "function resolveWithPyth(uint256, bytes[] calldata) external payable"
  ];

  const arena = new Contract(CONTRACT_ADDRESS, ABI, wallet);

  // Get current round count
  const count = await arena.roundCount();
  console.log(`Checking ${count} rounds...`);

  const now = Math.floor(Date.now() / 1000);

  for (let i = 1; i <= Number(count); i++) {
    const round = await arena.rounds(i);
    
    // Check if eligible for resolution
    console.log(`Round #${i}: End=${Number(round.endTime)}, Now=${now}, Diff=${Number(round.endTime) - now}s`);
    if (!round.resolved && !round.cancelled && round.endTime < now) {
      console.log(`\nFound expired Round #${i}: "${round.question}"`);
      
      if (round.usePyth) {
        console.log("Fetching Pyth price update...");
        try {
          // Fetch price update data from Hermes
          // priceId needs to be in hex format without 0x for the URL params often, 
          // but let's try standard hex first.
          const ids = [round.pythPriceId];
          
          const response = await axios.get(PYTH_HERMES_URL, {
            params: {
              ids: ids,
              binary: true
            },
            timeout: 10000
          });

          const updateData = response.data.binary.data; // Array of hex strings
          const updateDataBytes = updateData.map((d: string) => "0x" + d);
          
          // Add a small fee for Pyth update (1 wei usually enough on testnets if fee is 1, but let's calc)
          // Actually we need to ask the Pyth contract for the fee
          const minimalPythAbi = [
            "function getUpdateFee(bytes[] calldata updateData) external view returns (uint256 feeAmount)"
          ];
          const pythAddress = await arena.pyth();
          const pyth = new ethers.Contract(pythAddress, minimalPythAbi, wallet);
          const fee = await pyth.getUpdateFee(updateDataBytes);
          
          console.log(`Resolving Round #${i} (Fee: ${fee.toString()})...`);
          
          const tx = await arena.resolveWithPyth(i, updateDataBytes, { value: fee });
          console.log("Tx sent:", tx.hash);
          await tx.wait();
          console.log(`✅ Round #${i} Resolved!`);
          
        } catch (err) {
          console.error(`Failed to resolve Round #${i}:`, err);
        }
      } else {
        console.log(`Round #${i} requires manual resolution (not Pyth). Skipping.`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
