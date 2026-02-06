import { ethers, Wallet, JsonRpcProvider } from "ethers";

const keys = [
  '0x11444aa2db17883d3f84ceda36d0217342ad780f3a8c3f48b561dd5a4c4cf88f',
  '0xae167ccfca811b0c1d418e3329f2e2340e3faf524d4b0ac22ea2c974969dbea7',
  '0xb8f3d7fe3891e62e58f4a21d9c8a9b7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a'
];

async function main() {
  const provider = new JsonRpcProvider('https://testnet-rpc.monad.xyz/');
  for (const k of keys) {
    const w = new Wallet(k, provider);
    const b = await provider.getBalance(w.address);
    console.log(`${w.address}: ${ethers.formatEther(b)} MON`);
  }
}

main();
