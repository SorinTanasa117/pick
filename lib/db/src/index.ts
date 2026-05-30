import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import path from "path";

// Use an environment variable for the database path if provided,
// otherwise default to sqlite.db in the workspace root.
const dbPath = process.env.DATABASE_URL || path.resolve(process.cwd(), "sqlite.db");
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

export * from "./schema";
