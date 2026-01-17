import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client'; // Points to your custom location
import * as dotenv from 'dotenv';
import path from 'path';

// Find .env in the backend root
dotenv.config({ path: path.join(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Export the prisma instance to use everywhere
export const prisma = new PrismaClient({ adapter });