import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core"

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").unique(),
  email: text("email").unique().notNull(),
  name: text("name"),
  image: text("image"),
  tier: text("tier").notNull().default("free"), // "free" | "pro"
  userPreferences: jsonb("user_preferences"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Documents ───────────────────────────────────────────────────────────────

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  r2Key: text("r2_key").notNull(),
  mimeType: text("mime_type").notNull(),
  status: text("status").notNull().default("pending"),
  // "pending" | "processing" | "ready" | "failed"
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Summaries ───────────────────────────────────────────────────────────────

export const summaries = pgTable("summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  content: text("content").notNull(),
  quizTypeFlags: jsonb("quiz_type_flags"),  // QuizTypeFlags | null
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Quizzes ─────────────────────────────────────────────────────────────────

export const quizzes = pgTable("quizzes", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  questions: jsonb("questions").notNull(),
  questionTypes: text("question_types").array().notNull(), // types used in this quiz
  questionCount: integer("question_count").notNull(),
  autoMode: boolean("auto_mode").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Quiz Attempts ───────────────────────────────────────────────────────────

export const quizAttempts = pgTable("quiz_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  quizId: uuid("quiz_id")
    .notNull()
    .references(() => quizzes.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull(),
  score: numeric("score", { precision: 5, scale: 2 }).notNull(),
  topics: text("topics").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Topic Performance ───────────────────────────────────────────────────────

export const userTopicPerformance = pgTable("user_topic_performance", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  topic: text("topic").notNull(),
  attempts: integer("attempts").notNull().default(0),
  correct: integer("correct").notNull().default(0),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Usage / Quota ───────────────────────────────────────────────────────────

export const userUsage = pgTable("user_usage", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  summariesUsed: integer("summaries_used").notNull().default(0),
  quizzesUsed: integer("quizzes_used").notNull().default(0),
  practiceUsed: integer("practice_used").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
})

// ─── Practice Sessions ───────────────────────────────────────────────────────

export const practiceSessions = pgTable("practice_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  weakTopics: text("weak_topics").array().notNull(),
  drills: jsonb("drills").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  // "document_process" | "summary" | "quiz" | "practice"
  status: text("status").notNull().default("pending"),
  // "pending" | "running" | "complete" | "failed"
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

// ─── Type Exports ─────────────────────────────────────────────────────────────
// Use these for typing Drizzle query results

export type QuizTypeFlags = {
  mcq:            { applicable: true;  reason: string }
  true_false:     { applicable: boolean; reason: string }
  identification: { applicable: boolean; reason: string }
  multi_select:   { applicable: boolean; reason: string }
  ordering:       { applicable: boolean; reason: string }
}

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Document = typeof documents.$inferSelect
export type Summary = typeof summaries.$inferSelect
export type Quiz = typeof quizzes.$inferSelect
export type QuizAttempt = typeof quizAttempts.$inferSelect
export type Job = typeof jobs.$inferSelect
export type UserUsage = typeof userUsage.$inferSelect
export type UserTopicPerformance = typeof userTopicPerformance.$inferSelect
export type PracticeSession = typeof practiceSessions.$inferSelect