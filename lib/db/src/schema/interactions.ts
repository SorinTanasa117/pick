import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const interactionsTable = sqliteTable("interactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  height: integer("height").notNull(),
  figure: text("figure").notNull(),
  age: integer("age").notNull(),
  company: text("company").notNull(),
  attitude: text("attitude").notNull(),
  myMood: text("my_mood").notNull(),
  myPerformance: text("my_performance").notNull(),
  space: text("space").notNull(),
  notes: text("notes").notNull().default(""),
  lessonLearned: text("lesson_learned").notNull().default(""),
  success: integer("success", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const insertInteractionSchema = (createInsertSchema(interactionsTable) as any).omit({
  id: true,
  createdAt: true,
});
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Interaction = typeof interactionsTable.$inferSelect;
