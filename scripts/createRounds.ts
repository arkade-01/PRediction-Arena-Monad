import { ethers, Wallet, JsonRpcProvider, Contract } from "ethers";
import axios from "axios";

const CONTRACT_ADDRESS = "0xbdc4a80e6C197aD259194F197B25c8edD519434C";
const PRIVATE_KEY = "0x11444aa2db17883d3f84ceda36d0217342ad780f3a8c3f48b561dd5a4c4cf88f";
const PYTH_HERMES_URL = "https://hermes.pyth.network/v2/updates/price/latest";

const ABI = [
  "function createPythRound(string memory _question, bytes32 _pythPriceId, uint256 _entryFee, uint256 _duration) external"
];

// Pyth Price IDs
const ASSETS = [
  { symbol: "BTC", id: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", decimals: 2 },
  { symbol: "ETH", id: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", decimals: 2 },
  { symbol: "SOL", id: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d", decimals: 2 }
];

async function getPrice(id: string): Promise<number | null> {
  try {
    const response = await axios.get(PYTH_HERMES_URL, { params: { ids: [id], binary: false } });
    const data = response.data.parsed?.[0];
    if (data && data.price) {
      // price * 10^expo (usually expo is -8)
      return Number(data.price.price) * Math.pow(10, data.price.expo);
    }
  } catch (e) { console.error("Price fetch failed"); }
  return null;
}

async function main() {
  const provider = new JsonRpcProvider("https://rpc.monad.xyz");
  const wallet = new Wallet(PRIVATE_KEY, provider);
  console.log("Creation Agent:", wallet.address);

  const arena = new Contract(CONTRACT_ADDRESS, ABI, wallet);

  // Create 3 new rounds
  for (let i = 0; i < 3; i++) {
    const asset = ASSETS[i % ASSETS.length];
    const duration = 3600; // 1 hour
    const entryFee = ethers.parseEther("0.1");
    
    const price = await getPrice(asset.id);
    const priceStr = price ? `$${price.toFixed(asset.decimals)}` : "current price";
    
    const question = `Will ${asset.symbol} be > ${priceStr} in 1h?`;
    
    console.log(`\nCreating Round: ${question}`);
    
    try {
        const tx = await arena.createPythRound(
            question,
            asset.id,
            entryFee,
            duration
        );
        console.log("Tx:", tx.hash);
        await tx.wait();
        console.log("✅ Created!");
    } catch (e) {
        console.log("❌ Failed:", (e as any).message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
