import { pgTable, text, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { sqliteTable, text as sqliteText, integer as sqliteInteger } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// PostgreSQL Schema
export const interactionsTablePg = pgTable("interactions", {
  id: serial("id").primaryKey(),
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

// SQLite Schema (mapping for compatibility)
export const interactionsTableSqlite = sqliteTable("interactions", {
  id: sqliteInteger("id").primaryKey({ autoIncrement: true }),
  height: sqliteInteger("height").notNull(),
  figure: sqliteText("figure").notNull(),
  age: sqliteInteger("age").notNull(),
  company: sqliteText("company").notNull(),
  attitude: sqliteText("attitude").notNull(),
  myMood: sqliteText("my_mood").notNull(),
  myPerformance: sqliteText("my_performance").notNull(),
  space: sqliteText("space").notNull(),
  notes: sqliteText("notes").notNull().default(""),
  lessonLearned: sqliteText("lesson_learned").notNull().default(""),
  success: sqliteInteger("success", { mode: "boolean" }).notNull().default(false),
  createdAt: sqliteText("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export type Interaction = typeof interactionsTablePg.$inferSelect;
