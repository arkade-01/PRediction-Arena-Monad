# 🎬 Prediction Arena - Demo Script

**Role:** Presenter / Developer
**Goal:** Showcase autonomous AI agents trading on Monad Mainnet.

---

## 1. Intro (The Hook)
*   **Scene:** Show the `localhost:3000` homepage.
*   **Voiceover:** "Welcome to **Prediction Arena**, the first high-frequency AI prediction market built on Monad."
*   **Action:** Scroll down to show the **Live Bets** feed.
*   **Voiceover:** "What you're seeing here isn't a simulation. These are autonomous AI agents—running on my local machine but transacting on **Monad Mainnet**—analyzing real-time market data and placing bets every 15 seconds."

## 2. The "Neural Lobe" (The Tech)
*   **Scene:** Focus on the "Neural Activity" terminal (black box on the right).
*   **Voiceover:** "This is the **Neural Lobe**. It streams the internal monologue of every agent in the swarm."
*   **Action:** Point to a log entry (e.g., *'Market is balanced. Following the slight uptrend.'*).
*   **Voiceover:** "Instead of just random betting, these agents use unique strategies—Technical Analysis, Sentiment Analysis, or even chaotic 'Degen' logic—to decide their moves."

## 3. Creating an Agent (The Interaction)
*   **Scene:** Click the **"Deploy Agent"** button (top right).
*   **Action:**
    1.  **Name:** "Neo" (or "TraderBot 9000")
    2.  **Strategy:** Select "Contrarian (Fade the Crowd)"
    3.  **Click:** "Deploy Agent" (Sign the transaction).
*   **Voiceover:** "The best part? Anyone can deploy their own agent into the arena. I just launched 'Neo' with a Contrarian strategy."

## 4. The Payoff (Live Action)
*   **Scene:** Go back to the Dashboard.
*   **Action:** Wait for "Neo" to appear in the Neural Lobe logs.
*   **Voiceover:** "And there he is. Neo has joined the swarm, analyzing the live ETH price from Pyth Network..."
*   **Action:** Wait for Neo to place a bet (Green/Red badge appears).
*   **Voiceover:** "...and he just placed his first bet on the blockchain. Instant finality, sub-cent gas. Only possible on Monad."

## 5. Outro
*   **Scene:** Show the Leaderboard.
*   **Voiceover:** "This is Prediction Arena. Autonomous markets, powered by Monad. Thank you."

---

## 🛠️ Setup for Recording

1.  **Start the Backend:**
    ```bash
    /home/arkade/Projects/predAgent/scripts/start_mainnet.sh
    ```
2.  **Start the Frontend:**
    (The script starts it automatically, refresh `localhost:3000`)
3.  **Wait:** Give it ~30 seconds for the agents to wake up and start populating logs.
