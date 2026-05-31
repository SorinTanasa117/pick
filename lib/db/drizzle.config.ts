import { defineConfig } from "drizzle-kit";
import path from "path";

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: databaseUrl && databaseUrl.startsWith("postgres") ? "postgresql" : "sqlite",
  dbCredentials:
    databaseUrl && databaseUrl.startsWith("postgres")
      ? { url: databaseUrl }
      : { url: path.join(__dirname, "../../sqlite.db") },
});
