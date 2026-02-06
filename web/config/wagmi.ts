import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { type Chain } from 'viem';
import { cookieStorage, createStorage, http } from 'wagmi';

export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://testnet.monadscan.com' },
  },
  testnet: true,
} as const satisfies Chain;

export const monadMainnet = {
  id: 143, 
  name: 'Monad Mainnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://monadscan.com' },
  },
  testnet: false,
} as const satisfies Chain;

export const config = getDefaultConfig({
  appName: 'Prediction Arena',
  projectId: 'YOUR_PROJECT_ID', 
  chains: [monadMainnet, monadTestnet],
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
