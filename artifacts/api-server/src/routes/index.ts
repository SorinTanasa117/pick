import { Router, type IRouter } from "express";
import healthRouter from "./health";
import interactionsRouter from "./interactions";
import { getDb } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.use(healthRouter);
router.use(interactionsRouter);

router.get("/diag", async (req, res) => {
  const diag: any = {
    now: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      HAS_DATABASE_URL: !!process.env.DATABASE_URL,
      DATABASE_URL_START: process.env.DATABASE_URL?.substring(0, 15) + "...",
    },
  };

  try {
    const db = await getDb();
    diag.db = "Connected (Lazy)";
    // Try a simple query
    try {
      // We don't know the table name for sure without importing schema, but we can try a raw query if it's PG
      if (process.env.DATABASE_URL?.startsWith("postgres") || process.env.DATABASE_URL?.startsWith("postgresql")) {
         // @ts-ignore
         const result = await db.execute(sql`SELECT 1 as test`);
         diag.dbQuery = "Success";
      } else {
         diag.dbQuery = "Skipped (SQLite diag not implemented here)";
      }
    } catch (queryErr: any) {
      diag.dbQueryError = queryErr.message;
    }
  } catch (err: any) {
    diag.dbError = err.message;
    diag.dbErrorStack = err.stack;
  }

  res.json(diag);
});

export default router;
