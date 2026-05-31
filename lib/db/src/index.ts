import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_GbVm1jeIpTC9@ep-wild-morning-alwajrti.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });

export * from "./schema";
