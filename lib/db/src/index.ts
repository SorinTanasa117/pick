import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

let dbInstance: any;
let table: any;

async function initDb() {
  if (dbInstance) return { dbInstance, table };

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not defined");
  }

  try {
    if (databaseUrl.startsWith("postgres") || databaseUrl.startsWith("postgresql")) {
      console.log("Initializing database with Postgres (Neon)");
      // Strip potentially problematic parameters for the serverless HTTP driver
      // such as sslmode=require and channel_binding=require if they are present
      let cleanUrl = databaseUrl;
      try {
        const url = new URL(databaseUrl);
        const paramsToRemove = ["sslmode", "channel_binding"];
        let removed = false;
        paramsToRemove.forEach(param => {
          if (url.searchParams.has(param)) {
            url.searchParams.delete(param);
            removed = true;
          }
        });
        if (removed) {
          cleanUrl = url.toString();
          console.log("Cleaned DATABASE_URL for Neon HTTP driver (removed problematic params)");
        }
      } catch (e) {
        console.error("Failed to parse DATABASE_URL as URL object", e);
      }

      console.log(`Neon URL length: ${cleanUrl.length}`);
      try {
        const sql = neon(cleanUrl);
        dbInstance = drizzleNeon(sql, { schema });
        table = schema.interactionsTablePg;
        console.log("Postgres (Neon) initialization successful");
      } catch (neonError: any) {
        console.error("Neon driver initialization failed:", neonError.message);
        throw neonError;
      }
    } else {
        throw new Error("Only PostgreSQL is supported. DATABASE_URL must start with postgres:// or postgresql://");
    }
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
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

export * from "./schema";
