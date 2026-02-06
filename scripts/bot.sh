#!/bin/bash

# Load Environment
export HOME="/home/arkade"
export PATH="/home/arkade/.nvm/versions/node/v22.20.0/bin:$PATH"

# Go to project
cd /home/arkade/Projects/predAgent

# Load .env variables manually if needed, or source it
if [ -f .env ]; then
  export $(cat .env | xargs)
fi

# Run the requested mode
MODE=$1
LOG_FILE="/home/arkade/Projects/predAgent/bot.log"

echo "[$(date)] Running bot: $MODE" >> $LOG_FILE

if [ "$MODE" == "create" ]; then
  npx hardhat run scripts/runAgent.ts --network monadTestnet >> $LOG_FILE 2>&1
elif [ "$MODE" == "resolve" ]; then
  npx hardhat run scripts/resolveAgent.ts --network monadTestnet >> $LOG_FILE 2>&1
elif [ "$MODE" == "play" ]; then
  npx hardhat run scripts/multiPlayer.ts --network monadTestnet >> $LOG_FILE 2>&1
else
  echo "Unknown mode: $MODE" >> $LOG_FILE
fi

if [ "$MODE" == "play" ]; then
  npx hardhat run scripts/multiPlayer.ts --network monadTestnet >> $LOG_FILE 2>&1
fi
