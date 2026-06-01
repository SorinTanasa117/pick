import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import * as schema from "./schema";
import path from "path";
import { fileURLToPath } from "url";

const databaseUrl = process.env.DATABASE_URL;

let dbInstance: any;
let table: any;

async function initDb() {
  if (dbInstance) return { dbInstance, table };

  if (databaseUrl && databaseUrl.startsWith("postgres")) {
    const sql = neon(databaseUrl);
    dbInstance = drizzleNeon(sql, { schema });
    table = schema.interactionsTablePg;
  } else {
    const { drizzle: drizzleSqlite } = await import('drizzle-orm/better-sqlite3');
    const Database = (await import('better-sqlite3')).default;
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbPath = path.resolve(__dirname, "../../../sqlite.db");
    const sqlite = new Database(dbPath);
    dbInstance = drizzleSqlite(sqlite, { schema });
    table = schema.interactionsTableSqlite;
  }
  return { dbInstance, table };
}

// Initialize DB and export getters to avoid top-level await issues in some environments
let initialized = false;

export const getDb = async () => {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
  return dbInstance;
};

export const getInteractionsTable = async () => {
  if (!initialized) {
    await initDb();
    initialized = true;
  }
  return table;
};

// Deprecated: use async getters instead
export const db = dbInstance;
export const interactionsTable = table;
export * from "./schema";
