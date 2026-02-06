import { Wallet, JsonRpcProvider, parseEther, formatEther } from "ethers";

const MM_KEY = "0x11444aa2db17883d3f84ceda36d0217342ad780f3a8c3f48b561dd5a4c4cf88f";
const RECIPIENTS_KEYS = [
  "0xae167ccfca811b0c1d418e3329f2e2340e3faf524d4b0ac22ea2c974969dbea7", // Bravo
  "0xb8f3d7fe3891e62e58f4a21d9c8a9b7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a"  // Charlie
];

async function main() {
  const provider = new JsonRpcProvider("https://testnet-rpc.monad.xyz/");
  const wallet = new Wallet(MM_KEY, provider);
  
  console.log(`🏦 Market Maker: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${formatEther(balance)} MON`);

  for (const key of RECIPIENTS_KEYS) {
    const recipientWallet = new Wallet(key);
    console.log(`\n💸 Funding ${recipientWallet.address}...`);
    
    try {
        const tx = await wallet.sendTransaction({
          to: recipientWallet.address,
          value: parseEther("1.0")
        });
        console.log(`   Tx: ${tx.hash}`);
        await tx.wait(); // Wait for confirmation
        console.log("   ✅ Sent 1.0 MON");
    } catch (e) {
        console.log(`   ❌ Failed: ${(e as any).message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
