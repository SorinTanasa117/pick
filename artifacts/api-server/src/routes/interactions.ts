import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { getDb, getInteractionsTable } from "@workspace/db";
import {
  CreateInteractionBody,
  DeleteInteractionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const databaseUrl = process.env.DATABASE_URL;

// Helper to handle SQLite dates
const parseDate = (d: any): Date => {
  if (d instanceof Date) return d;
  if (!d) return new Date();
  return new Date(d);
};

// GET /interactions — list all
router.get("/interactions", async (req, res): Promise<void> => {
  const db = await getDb();
  const interactionsTable = await getInteractionsTable();
  const rows = await db
    .select()
    .from(interactionsTable)
    .orderBy(desc(interactionsTable.createdAt));

  res.json(
    rows.map((r: any) => ({
      ...r,
      createdAt: parseDate(r.createdAt).toISOString(),
    }))
  );
});

// POST /interactions — create
router.post("/interactions", async (req, res): Promise<void> => {
  const db = await getDb();
  const interactionsTable = await getInteractionsTable();
  const parsed = CreateInteractionBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid interaction input");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const bodyCreatedAt = (req.body as any).createdAt;
  const data = {
    ...parsed.data,
    createdAt: bodyCreatedAt ? (databaseUrl && databaseUrl.startsWith("postgres") ? new Date(bodyCreatedAt) : bodyCreatedAt.replace('T', ' ') + ':00') : new Date(),
  };

  const [row] = await db
    .insert(interactionsTable)
    .values(data)
    .returning();

  res.status(201).json({
    ...row,
    createdAt: parseDate(row.createdAt).toISOString(),
  });
});

// GET /interactions/stats
router.get("/interactions/stats", async (_req, res): Promise<void> => {
  const db = await getDb();
  const interactionsTable = await getInteractionsTable();
  const rows = await db
    .select()
    .from(interactionsTable)
    .orderBy(interactionsTable.createdAt);

  const total = rows.length;

  if (total === 0) {
    res.json({
      totalInteractions: 0,
      firstInteractionDate: null,
      lastInteractionDate: null,
      totalDaysPassed: 0,
      totalDaysActive: 0,
      successRate: 0,
    });
    return;
  }

  const firstDate = parseDate(rows[0].createdAt);
  const lastDate = parseDate(rows[rows.length - 1].createdAt);

  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDaysPassed = Math.floor((now.getTime() - firstDate.getTime()) / msPerDay) + 1;

  // Unique days with at least one interaction
  const activeDaysSet = new Set(
    rows.map((r: any) => parseDate(r.createdAt).toISOString().slice(0, 10))
  );
  const totalDaysActive = activeDaysSet.size;

  const successes = rows.filter((r: any) => r.success).length;
  const successRate = total > 0 ? Math.round((successes / total) * 100) / 100 : 0;

  res.json({
    totalInteractions: total,
    firstInteractionDate: firstDate.toISOString(),
    lastInteractionDate: lastDate.toISOString(),
    totalDaysPassed,
    totalDaysActive,
    successRate,
  });
});

// GET /interactions/chart-data
router.get("/interactions/chart-data", async (_req, res): Promise<void> => {
  const db = await getDb();
  const interactionsTable = await getInteractionsTable();
  const rows = await db
    .select()
    .from(interactionsTable)
    .orderBy(interactionsTable.createdAt);

  if (rows.length === 0) {
    res.json({ granularity: "day", points: [] });
    return;
  }

  const firstDate = parseDate(rows[0].createdAt);
  const lastDate = parseDate(rows[rows.length - 1].createdAt);
  const msPerDay = 1000 * 60 * 60 * 24;
  const spanDays = Math.floor((lastDate.getTime() - firstDate.getTime()) / msPerDay) + 1;

  // Determine granularity
  let granularity: "day" | "week" | "month";
  if (spanDays <= 30) {
    granularity = "day";
  } else if (spanDays <= 180) {
    granularity = "week";
  } else {
    granularity = "month";
  }

  // Build buckets
  const buckets = new Map<string, { label: string; interactions: number; successes: number }>();

  for (const row of rows) {
    const d = parseDate(row.createdAt);
    let key: string;
    let label: string;

    if (granularity === "day") {
      key = d.toISOString().slice(0, 10);
      label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    } else if (granularity === "week") {
      // ISO week start (Monday)
      const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0
      const weekStart = new Date(d.getTime() - dayOfWeek * msPerDay);
      key = weekStart.toISOString().slice(0, 10);
      label = `W${getISOWeek(weekStart)} '${weekStart.getFullYear().toString().slice(2)}`;
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
    }

    if (!buckets.has(key)) {
      buckets.set(key, { label, interactions: 0, successes: 0 });
    }
    const b = buckets.get(key)!;
    b.interactions += 1;
    if (row.success) b.successes += 1;
  }

  const points = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, b]) => ({
      label: b.label,
      interactions: b.interactions,
      successes: b.successes,
      successRate: b.interactions > 0
        ? Math.round((b.successes / b.interactions) * 100) / 100
        : 0,
    }));

  res.json({ granularity, points });
});

// DELETE /interactions/:id
router.delete("/interactions/:id", async (req, res): Promise<void> => {
  const db = await getDb();
  const interactionsTable = await getInteractionsTable();
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteInteractionParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { eq } = await import("drizzle-orm");
  const [deleted] = await db
    .delete(interactionsTable)
    .where(eq(interactionsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Interaction not found" });
    return;
  }

  res.sendStatus(204);
});

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default router;
