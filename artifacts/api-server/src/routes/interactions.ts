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
  try {
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
  } catch (error: any) {
    req.log.error({ err: error }, "Failed to fetch interactions");
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// POST /interactions — create
router.post("/interactions", async (req, res): Promise<void> => {
  try {
    const db = await getDb();
    const interactionsTable = await getInteractionsTable();
    const parsed = CreateInteractionBody.safeParse(req.body);
    if (!parsed.success) {
      req.log.warn({ errors: parsed.error.message }, "Invalid interaction input");
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const bodyCreatedAt = (req.body as any).createdAt;
    const isPostgres = databaseUrl && (databaseUrl.startsWith("postgres") || databaseUrl.startsWith("postgresql"));
    const data = {
      ...parsed.data,
      createdAt: bodyCreatedAt
        ? (isPostgres ? new Date(bodyCreatedAt) : bodyCreatedAt.replace('T', ' ') + ':00')
        : (isPostgres ? new Date() : new Date().toISOString().replace('T', ' ').slice(0, 19)),
    };

    const [row] = await db
      .insert(interactionsTable)
      .values(data)
      .returning();

    res.status(201).json({
      ...row,
      createdAt: parseDate(row.createdAt).toISOString(),
    });
  } catch (error: any) {
    req.log.error({ err: error }, "Failed to create interaction");
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// GET /interactions/stats
router.get("/interactions/stats", async (req, res): Promise<void> => {
  try {
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
  } catch (error: any) {
    req.log.error({ err: error }, "Failed to fetch stats");
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// GET /interactions/chart-data
router.get("/interactions/chart-data", async (req, res): Promise<void> => {
  try {
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
  } catch (error: any) {
    req.log.error({ err: error }, "Failed to fetch chart data");
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// DELETE /interactions/:id
router.delete("/interactions/:id", async (req, res): Promise<void> => {
  try {
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
  } catch (error: any) {
    req.log.error({ err: error }, "Failed to delete interaction");
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// GET /interactions/correlations
router.get("/interactions/correlations", async (req, res): Promise<void> => {
  try {
    const db = await getDb();
    const interactionsTable = await getInteractionsTable();
    const allRows = await db.select().from(interactionsTable).orderBy(interactionsTable.createdAt);

    // Only allow update of the statistics every 5 entries
    const limit = Math.floor(allRows.length / 5) * 5;
    if (limit < 5) {
      res.json([]);
      return;
    }
    const rows = allRows.slice(0, limit);

    const fieldsToAnalyze = [
      { key: "face", label: "Her face", type: "numeric" },
      { key: "age", label: "Her age", type: "numeric" },
      { key: "height", label: "Her height", type: "numeric" },
      { key: "figure", label: "Her figure", type: "ordinal" },
      { key: "company", label: "Her company", type: "ordinal" },
      { key: "attitude", label: "Her attitude", type: "ordinal" },
      { key: "myMood", label: "My mood", type: "ordinal" },
      { key: "myPerformance", label: "My performance", type: "ordinal" },
      { key: "space", label: "The space", type: "ordinal" },
    ];

    const MAPPINGS: Record<string, Record<string, number>> = {
      figure: { "Super thin": 0, "Slim": 1, "Normal": 2, "Slightly chubby": 3 },
      attitude: { "Suspicious": 0, "Open": 1, "Friendly": 2, "Flirt": 3 },
      myMood: { "Not feeling it": 0, "Neutral": 1, "Excited": 2 },
      myPerformance: { "Total wreck": 0, "Fumbling": 1, "OK": 2, "Good": 3, "Excellent": 4 },
      space: {
        Club: 0,
        Meetup: 1,
        "Metro station": 2,
        Václavská: 3, // Center
        Naplavka: 4,
        "In park": 5,
        "On street": 6,
      },
      company: {
        "Alone": 0,
        "Waiting for friend": 1,
        "With female friend": 2,
        "With female Friends": 3,
        "Waiting for boyfriend": 4,
      },
    };

    const results = fieldsToAnalyze.map((field) => {
      const y = rows.map((r: any) => (r.success ? 1 : 0));
      let x: number[] = [];
      const categoricalCounts: Record<string, { total: number; successes: number }> = {};
      const successValues: number[] = [];

      for (const row of rows) {
        const val = (row as any)[field.key];
        const stringVal = String(val);

        if (!categoricalCounts[stringVal]) {
          categoricalCounts[stringVal] = { total: 0, successes: 0 };
        }
        categoricalCounts[stringVal].total++;
        if (row.success) {
          categoricalCounts[stringVal].successes++;
          if (field.type === "numeric") {
            successValues.push(Number(val));
          }
        }

        if (field.type === "numeric") {
          x.push(Number(val));
        } else {
          x.push(MAPPINGS[field.key]?.[val] ?? 0);
        }
      }

      const r = calculateCorrelation(x, y);
      const ci = calculateConfidenceInterval(r, x.length);

      // Determine best sub-value and most common value
      let bestSubValue = "";
      let maxSuccesses = 0;
      let modeSuccessValue = "";

      let mostCommonValue = "";
      let maxTotal = 0;

      for (const [val, stats] of Object.entries(categoricalCounts)) {
        if (stats.successes > maxSuccesses) {
          maxSuccesses = stats.successes;
          modeSuccessValue = val;
        }
        if (stats.total > maxTotal) {
          maxTotal = stats.total;
          mostCommonValue = val;
        }
      }

      // If no value is more than 2 times present, leave it blank
      if (maxSuccesses > 2) {
        bestSubValue = modeSuccessValue;
      }

      // Generate description
      let description = field.label;
      if (field.type === "numeric") {
        // For numeric, "closest number" associated with success
        // Use the mode of successful records if it's strong enough, else mean
        if (maxSuccesses > 2) {
          bestSubValue = modeSuccessValue;
        } else {
          bestSubValue = "";
        }
      }

      // If most repeated values are in the negative range also don't show value.
      // Interpreting as: if correlation is negative, hide the value?
      // "We want to see what works, not what doesn't."
      if (r < 0) {
        bestSubValue = "";
      }

      return {
        field: field.label,
        correlation: r,
        confidenceInterval: ci,
        type: field.type === "numeric" ? "numeric" : "categorical",
        description,
        bestSubValue,
        mostCommonValue,
      };
    });

    // Sort by absolute correlation strength descending
    results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    res.json(results);
  } catch (error: any) {
    req.log.error({ err: error }, "Failed to calculate correlations");
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

function calculateCorrelation(x: number[], y: number[]) {
  const n = x.length;
  if (n < 2) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

function calculateConfidenceInterval(r: number, n: number) {
  if (n <= 3) return [r, r];
  // Cap r to avoid infinity in Fisher transformation
  const cappedR = Math.max(-0.999, Math.min(0.999, r));
  const z = 0.5 * Math.log((1 + cappedR) / (1 - cappedR));
  const se = 1 / Math.sqrt(n - 3);
  const zLow = z - 1.96 * se;
  const zHigh = z + 1.96 * se;

  const rLow = (Math.exp(2 * zLow) - 1) / (Math.exp(2 * zLow) + 1);
  const rHigh = (Math.exp(2 * zHigh) - 1) / (Math.exp(2 * zHigh) + 1);

  return [rLow, rHigh];
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default router;
