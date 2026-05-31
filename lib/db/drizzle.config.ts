import { defineConfig } from "drizzle-kit";
import path from "path";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_GbVm1jeIpTC9@ep-wild-morning-alwajrti.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require",
  },
});
