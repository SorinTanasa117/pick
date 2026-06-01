import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import * as schema from "./schema";
import path from "path";
import { fileURLToPath } from "url";

const databaseUrl = process.env.DATABASE_URL;

let dbInstance: any;
let table: any;

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

export const db = dbInstance;
export const interactionsTable = table;
export * from "./schema";
