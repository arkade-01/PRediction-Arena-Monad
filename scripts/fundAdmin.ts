import { ethers, Wallet, JsonRpcProvider } from "ethers";

// Bravo (Funder)
const FROM_KEY = "0xae167ccfca811b0c1d418e3329f2e2340e3faf524d4b0ac22ea2c974969dbea7";
// Alpha (Owner/Admin)
const TO_ADDRESS = "0x818B7Aa387EaF6249Dc4361623c4A97d86aa76f5";

async function main() {
  const provider = new JsonRpcProvider('https://testnet-rpc.monad.xyz/');
  const wallet = new Wallet(FROM_KEY, provider);
  
  const balance = await provider.getBalance(wallet.address);
  console.log(`Funder Balance: ${ethers.formatEther(balance)} MON`);
  
  const amount = ethers.parseEther("0.01");
  
  if (balance < amount) {
    console.log("❌ Not enough funds to send 0.01 MON");
    return;
  }
  
  console.log(`Sending 0.01 MON to ${TO_ADDRESS}...`);
  
  const tx = await wallet.sendTransaction({
    to: TO_ADDRESS,
    value: amount
  });
  
  console.log(`Tx: ${tx.hash}`);
  await tx.wait();
  console.log("✅ Transfer complete!");
}

main();
