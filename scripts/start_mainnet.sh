#!/bin/bash

# Configuration
# Use current directory as project root (Works on Render/VPS/Local)
PROJECT_DIR=$(pwd)
LOG_DIR="$PROJECT_DIR/logs"

# Ensure log directory exists
mkdir -p $LOG_DIR

# Function to kill existing processes (Only useful for local restarts)
cleanup() {
    echo "🧹 Cleaning up old processes..."
    pkill -f "runAgent.ts"
    pkill -f "multiPlayer.ts"
    pkill -f "resolveAgent.ts"
    pkill -f "agentBuyback.ts"
}

# Cleanup first
cleanup

echo "🚀 Launching Prediction Arena Swarm on Monad Mainnet..."

# 1. Market Creator (Loop - Background)
echo "Starting Market Creator..."
nohup bash -c "while true; do npx hardhat run scripts/runAgent.ts --network monadMainnet >> $LOG_DIR/creator.log 2>&1; sleep 60; done" &
echo "✅ Creator started in background"

# 2. Player Swarm (Loop - Background)
echo "Starting Agent Swarm..."
nohup bash -c "while true; do npx hardhat run scripts/multiPlayer.ts --network monadMainnet >> $LOG_DIR/swarm.log 2>&1; sleep 15; done" &
echo "✅ Swarm started in background"

# 3. Resolver (Loop - Background)
echo "Starting Round Resolver..."
nohup bash -c "while true; do npx hardhat run scripts/resolveAgent.ts --network monadMainnet >> $LOG_DIR/resolver.log 2>&1; sleep 30; done" &
echo "✅ Resolver started in background"

# 4. Buyback Engine (Loop - Background)
echo "Starting Buyback Engine..."
nohup bash -c "while true; do npx hardhat run scripts/agentBuyback.ts --network monadMainnet >> $LOG_DIR/buyback.log 2>&1; sleep 300; done" &
echo "✅ Buyback started in background"

# 5. Frontend Interface (FOREGROUND - Keeps Render Alive)
echo "Starting Frontend (Production Mode)..."
cd "$PROJECT_DIR/web"
# Render sets PORT automatically. Next.js respects it.
# We DO NOT use nohup or & here. We want this to block.
exec npm run start
