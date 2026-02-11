import path from 'node:path';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

// Load env
dotenv.config();

const directUrl = process.env.DIRECT_URL!;

export default defineConfig({
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),

  datasource: {
    url: directUrl,
  },

  migrate: {
    url: directUrl,
  },
});
