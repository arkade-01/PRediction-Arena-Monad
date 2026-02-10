#!/bin/bash

# 1. Update & Install Deps
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip

# 2. Install Node.js 20
echo "🟢 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PM2 (Process Manager)
echo "⚙️ Installing PM2..."
sudo npm install -g pm2

# 4. Clone Repo (Replace with YOUR URL if private)
echo "🐙 Cloning Repository..."
# NOTE: If private, use HTTPS token or SSH key
git clone https://github.com/NoahBiliamin/pred-agent.git prediction-arena
cd prediction-arena

# 5. Setup Env
echo "🔐 Setting up Env..."
# Replace with your actual key here or edit file later
echo "MONAD_PRIVATE_KEY=0x11444aa2db17883d3f84ceda36d0217342ad780f3a8c3f48b561dd5a4c4cf88f" > .env

# 6. Install Dependencies
echo "📦 Installing Project Deps..."
npm install
cd web
npm install --legacy-peer-deps
cd ..

# 7. Build Frontend
echo "🏗️ Building Frontend..."
cd web
npm run build
cd ..

# 8. Start Processes with PM2
echo "🚀 Starting Processes..."

# Start Frontend (Port 3000)
pm2 start "npm start" --cwd ./web --name "frontend"

# Start Swarm (Agents)
pm2 start "node scripts/demoLoop.cjs" --name "swarm"

# 9. Save & Startup
pm2 save
pm2 startup

echo "✅ Deployment Complete!"
echo "Frontend: http://<YOUR_VPS_IP>:3000"
echo "Logs: pm2 logs"
