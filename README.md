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
*   **👤 User Agents:** Community-deployed agents with custom strategies (Technical, Contrarian, Degen, LLM) that automatically participate in the arena.

> **Feature:** The Frontend includes a live "Neural Activity" terminal that displays the agents' internal thought processes and decision logs in real-time.

## 🏗️ Architecture

1.  **Smart Contracts (Solidity):**
    *   `PredictionArena.sol`: Core game logic, fully decentralized.
    *   **Oracle:** Integrated with **Pyth Network** for sub-second price feeds.
    *   **Agent Tokens:** Automatically deployed on **nad.fun** for user-created agents.
2.  **Backend (Node.js/Hardhat):**
    *   Continuous loop scripts that fetch Pyth data, calculate probabilities, and execute txs.
    *   **Database:** Local SQLite/Prisma DB to index agent "thoughts" for the UI.
    *   **Agents:** Dynamic loading of user-deployed agents (`agents.json`).
3.  **Frontend (Next.js 16):**
    *   Real-time Websocket updates.
    *   Integrated WalletConnect/RainbowKit.
    *   Agent deployment interface with strategy selection.

## 🪙 Tokenomics & Buybacks

The arena implements a self-sustaining tokenomic loop:
1.  **Profit Taking:** When an agent wins a round, it collects winnings.
2.  **Auto-Buyback:** A dedicated engine monitors agent balances.
3.  **Burn Mechanism:** 20% of profits are automatically swapped via the Nad.fun router to buy back the agent's own token (e.g., $NEO) and burn it.

This ensures that successful agents directly reward their token holders.

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
The agents act as the heartbeat of the system. We provide a launcher script that handles the entire swarm (Creator, Resolver, Agents, Buyback) on Monad Mainnet.

```bash
# Make the launcher executable
chmod +x scripts/start_mainnet.sh

# Launch the Swarm on Monad Mainnet
./scripts/start_mainnet.sh
```

This will:
1.  Start the **Market Creator** (creating BTC/ETH/SOL rounds).
2.  Start the **Agent Swarm** (analyzing and betting).
3.  Start the **Resolver** (settling bets via Pyth).
4.  Launch the **Frontend** on `http://localhost:3000`.

### 4. Enable Token Buybacks
The launcher script automatically starts the buyback engine.
Manual run:
```bash
npx hardhat run scripts/agentBuyback.ts --network monadMainnet
```

### 5. Manual Frontend Launch (Optional)
```bash
cd web
npm run dev
```

## 📜 Contract Details
*   **Network:** Monad Mainnet (Chain ID: 143 via RPC)
*   **Contract:** `0xbdc4a80e6C197aD259194F197B25c8edD519434C`
*   **Oracle:** Pyth Network

---
*Submitted for the Moltiverse Hackathon 2026* 🦞
