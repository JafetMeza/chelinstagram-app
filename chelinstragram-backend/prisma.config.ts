// prisma.config.ts
import { defineConfig } from "prisma/config";
import * as dotenv from 'dotenv';
import path from 'path';

// 1. Cargar el .env
dotenv.config({ path: path.join(__dirname, './.env') });

// 2. Detectar entorno
const isDev = process.env.NODE_ENV !== 'production';

// 3. Determinar la URL de migración
// En desarrollo, priorizamos la URL local para evitar tocar Supabase por accidente
const migrationUrl = isDev
  ? (process.env.DATABASE_URL_DEV || process.env.DATABASE_URL)
  : process.env.DIRECT_URL;

console.log(`[Prisma Config] 🏗️ Mode: ${isDev ? 'Development' : 'Production'}`);
console.log(`[Prisma Config] 🔌 Migrating via: ${migrationUrl?.includes('localhost') ? 'Local DB' : 'Remote DB'}`);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationUrl,
  },
});