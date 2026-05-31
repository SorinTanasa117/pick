import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use an environment variable for the database path if provided,
// otherwise default to sqlite.db in the workspace root.
const dbPath =
  process.env.DATABASE_URL || path.resolve(__dirname, "../../../sqlite.db");
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

export * from "./schema";
