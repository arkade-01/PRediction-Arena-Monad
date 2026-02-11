import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Render injects env vars directly, no need for dotenv
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!directUrl) {
  console.warn('⚠️  No DATABASE_URL found - using placeholder for build');
}

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: directUrl || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
