import { pgTable, text, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";

// PostgreSQL Schema
export const interactionsTablePg = pgTable("interactions", {
  id: serial("id").primaryKey(),
  looks: integer("looks").notNull().default(7),
  personality: integer("personality").notNull().default(7),
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
  success: boolean("success").notNull().default(false),
  createdAt: timestamp("created_at")
    .notNull()
    .defaultNow(),
});

export type Interaction = typeof interactionsTablePg.$inferSelect;
