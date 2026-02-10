'use server';

const API_BASE = "https://api.nadapp.net";

export async function uploadImage(formData: FormData) {
  const file = formData.get("file") as File;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const res = await fetch(`${API_BASE}/agent/token/image`, {
    method: "POST",
    headers: {
      "Content-Type": file.type,
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Image Upload Failed: ${text}`);
  }
  
  return res.json();
}

export async function uploadMetadata(data: any) {
  const res = await fetch(`${API_BASE}/agent/token/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Metadata Upload Failed: ${text}`);
  }

  return res.json();
}

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, publicActions } from 'viem';
import { monad } from 'viem/chains';
import fs from 'fs/promises';
import path from 'path';
import abi from '../config/abi.json';
import { PREDICTION_ARENA_ADDRESS } from '../config/contracts';

export async function createAndSaveAgentWallet(name: string, ticker: string, ownerAddress: string, tokenAddress: string = "", strategy: string = "Technical Analysis") {
  // 1. Generate Real Wallet
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const address = account.address;

  // 2. Prepare Data
  const agentData = {
    id: crypto.randomUUID(),
    name,
    ticker,
    ownerAddress, // The user who deployed this agent
    tokenAddress,
    address,
    privateKey,
    strategy, // Save the trading strategy
    createdAt: new Date().toISOString()
  };

  // 3. Save to agents.json
  const filePath = path.join(process.cwd(), 'agents.json');
  
  let agents = [];
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    agents = JSON.parse(fileContent);
  } catch (error) {
    // File doesn't exist yet, start empty
  }

  agents.push(agentData);
  await fs.writeFile(filePath, JSON.stringify(agents, null, 2));

  // 4. Return only public info to client
  return { address };
}

export async function registerAgentOnChain(agentAddress: string) {
  // 1. Find Agent Credentials
  const filePath = path.join(process.cwd(), 'agents.json');
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const agents = JSON.parse(fileContent);
  const agent = agents.find((a: any) => a.address === agentAddress);

  if (!agent) throw new Error("Agent not found");

  // 2. Setup Client
  const account = privateKeyToAccount(agent.privateKey);
  const client = createWalletClient({
    account,
    chain: monad,
    transport: http("https://rpc.monad.xyz")
  }).extend(publicActions);

  // 3. Call registerAgent
  const hash = await client.writeContract({
    address: PREDICTION_ARENA_ADDRESS as `0x${string}`,
    abi,
    functionName: 'registerAgent',
  });

  return hash;
}

export async function updateAgentToken(agentAddress: string, tokenAddress: string) {
  const filePath = path.join(process.cwd(), 'agents.json');
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const agents = JSON.parse(fileContent);
    const updatedAgents = agents.map((agent: any) => 
      agent.address === agentAddress ? { ...agent, tokenAddress } : agent
    );
    await fs.writeFile(filePath, JSON.stringify(updatedAgents, null, 2));
    return { success: true };
  } catch (error) {
    console.error("Failed to update agent token:", error);
    throw new Error("Failed to update agent token");
  }
}

export async function getAgentList() {
  const filePath = path.join(process.cwd(), 'agents.json');
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const agents = JSON.parse(fileContent);
    // Return only public data
    return agents.map(({ id, name, ticker, address, ownerAddress, tokenAddress, createdAt }: any) => ({
      id, name, ticker, address, ownerAddress, tokenAddress, createdAt
    }));
  } catch (error) {
    return [];
  }
}

export async function getSalt(data: any) {
  const res = await fetch(`${API_BASE}/agent/salt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Get Salt Failed: ${text}`);
  }

  return res.json();
}
