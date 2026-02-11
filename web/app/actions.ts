'use server';

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, publicActions } from 'viem';
import { monad } from 'viem/chains';
import { prisma } from '@/lib/db';
import abi from '../config/abi.json';
import { PREDICTION_ARENA_ADDRESS } from '../config/contracts';

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

export async function createAndSaveAgentWallet(
  name: string, 
  ticker: string, 
  ownerAddress: string, 
  tokenAddress: string = "", 
  strategy: string = "Technical Analysis"
) {
  // 1. Generate Real Wallet
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const address = account.address;

  // 2. Save to Database
  await prisma.agent.create({
    data: {
      name,
      ticker,
      ownerAddress,
      tokenAddress: tokenAddress || null,
      address,
      privateKey,
      strategy,
    }
  });

  // 3. Return only public info to client
  return { address };
}

export async function registerAgentOnChain(agentAddress: string) {
  // 1. Find Agent Credentials
  const agent = await prisma.agent.findUnique({
    where: { address: agentAddress }
  });

  if (!agent) throw new Error("Agent not found");

  // 2. Setup Client
  const account = privateKeyToAccount(agent.privateKey as `0x${string}`);
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
  try {
    await prisma.agent.update({
      where: { address: agentAddress },
      data: { tokenAddress }
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to update agent token:", error);
    throw new Error("Failed to update agent token");
  }
}

export async function getAgentList() {
  try {
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        name: true,
        ticker: true,
        address: true,
        ownerAddress: true,
        tokenAddress: true,
        strategy: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return agents;
  } catch (error) {
    console.error("Failed to get agents:", error);
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
