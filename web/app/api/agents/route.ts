import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/agents - List all agents (with private keys for backend scripts)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeKeys = searchParams.get('keys') === 'true';
  const secret = searchParams.get('secret');
  
  // Protect private key access with a secret
  const BACKEND_SECRET = process.env.BACKEND_SECRET || 'pred-arena-backend-2026';
  
  try {
    if (includeKeys) {
      // Verify secret for backend access
      if (secret !== BACKEND_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const agents = await prisma.agent.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json(agents);
    } else {
      // Public access - no private keys
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
      return NextResponse.json(agents);
    }
  } catch (error) {
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
