# 🔮 Prediction Arena (on Monad)

![Monad](https://img.shields.io/badge/Monad-Mainnet-purple?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Agents](https://img.shields.io/badge/AI-Autonomous-blue?style=flat-square)

**Prediction Arena** is a high-frequency, autonomous prediction market built exclusively for **Monad**. It features a swarm of AI agents that actively trade, provide liquidity, and demonstrate real-time reasoning capabilities.

## ⚡ Why Monad?

This project was architected specifically for Monad's high-performance environment:

*   **10,000 TPS Requirement:** Our agent swarm operates continuously, placing bets and resolving rounds every few seconds. Legacy EVM chains cannot handle this throughput without congestion.
*   **1-Second Block Times:** The "Neural Lobe" agents react to Pyth price updates instantly. Monad's sub-second finality allows agents to execute arbitrage and hedging strategies in real-time, creating a fluid, always-active market.
*   **Cheap Gas:** High-frequency trading requires negligible fees. Monad enables our agents to perform thousands of micro-transactions daily.

## 🧠 Autonomous Agent Swarm

Unlike static bots, our agents possess unique personalities and a **Reasoning Engine** that analyzes market conditions before acting.

*   **🤖 Alpha (The Market Maker):** Uses technical analysis (Bollinger Bands, MA) to set fair odds.
*   **🦊 Bravo (The Contrarian):** Analyzes the betting pool distribution to fade the crowd (Counter-trading).
*   **🎲 Charlie (The Degen):** High-risk, volatility-seeking behavior.

> **Feature:** The Frontend includes a live "Neural Activity" terminal that displays the agents' internal thought processes and decision logs in real-time.

## 🏗️ Architecture

1.  **Smart Contracts (Solidity):**
    *   `PredictionArena.sol`: Core game logic, fully decentralized.
    *   **Oracle:** Integrated with **Pyth Network** for sub-second price feeds.
2.  **Backend (Node.js/Hardhat):**
    *   Continuous loop scripts that fetch Pyth data, calculate probabilities, and execute txs.
    *   **Database:** Local SQLite/Prisma DB to index agent "thoughts" for the UI.
3.  **Frontend (Next.js 16):**
    *   Real-time Websocket updates.
    *   Integrated WalletConnect/RainbowKit.

## 🚀 Getting Started

### Prerequisites
*   Node.js v20+
*   Monad Wallet (MetaMask/Rabby)

### 1. Installation
```bash
git clone https://github.com/yourusername/prediction-arena.git
cd prediction-arena
npm install
```

### 2. Configure
Create a `.env` file with your Monad private key:
```bash
MONAD_PRIVATE_KEY="your_key_here"
```

### 3. Run the Agents (Backend)
The agents act as the heartbeat of the system.
```bash
# Start the Swarm (Betting & Reasoning)
npx hardhat run scripts/multiPlayer.ts --network monadMainnet

# Start the Resolver (Closes rounds)
npx hardhat run scripts/resolveAgent.ts --network monadMainnet
```

### 4. Run the Interface (Frontend)
```bash
cd web
npm run dev
```
Open `http://localhost:3000` to watch the arena live.

## 📜 Contract Details
*   **Network:** Monad Mainnet (Chain ID: 143 via RPC)
*   **Contract:** `0xbdc4a80e6C197aD259194F197B25c8edD519434C`
*   **Oracle:** Pyth Network

---
*Submitted for the Moltiverse Hackathon 2026* 🦞
