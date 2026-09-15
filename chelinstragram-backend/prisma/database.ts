import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
    const envPath = path.join(__dirname, "../.env");
    dotenv.config({ path: envPath });
}

// 1. Lógica de selección de URL
// Si estamos en dev, prioriza DATABASE_URL_DEV. Si no existe o estamos en prod, usa DATABASE_URL.
const connectionString = isDev
    ? (process.env.DATABASE_URL_DEV || process.env.DATABASE_URL)
    : process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ Error: No se encontró DATABASE_URL ni DATABASE_URL_DEV en el entorno.");
    throw new Error("Connection string is missing");
}

const pool = new Pool({
    connectionString,
    ssl: isDev ? false : { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
    adapter,
    log: isDev ? ['query', 'error', 'warn'] : ['error']
});