import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const personaConfig = pgTable(
  "persona_config",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    gender: text("gender").notNull(),
    relationship: text("relationship").notNull(),
    talkingStyle: text("talking_style").notNull(),
    location: text("location").notNull().default(""),
    profession: text("profession").notNull().default(""),
    warmth: integer("warmth").notNull(),
    humor: integer("humor").notNull(),
    directness: integer("directness").notNull(),
    sensitivity: integer("sensitivity").notNull(),
    pride: integer("pride").notNull(),
    interests: jsonb("interests").$type<string[]>().notNull().default([]),
    goals: jsonb("goals").$type<string[]>().notNull().default([]),
    tones: jsonb("tones").$type<string[]>().notNull().default([]),
    customFields: jsonb("custom_fields")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex("persona_config_user_idx").on(table.userId)]
);

export const personaState = pgTable(
  "persona_state",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mood: text("mood").notNull(),
    moodIntensity: integer("mood_intensity").notNull(),
    ego: jsonb("ego").notNull(),
    availability: text("availability").notNull(),
    activity: text("activity").notNull(),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
    messagesSentToday: integer("messages_sent_today").notNull().default(0),
    wasIgnored: boolean("was_ignored").notNull().default(false),
    isGenerating: boolean("is_generating").notNull().default(false),
    pendingMessages: jsonb("pending_messages")
      .$type<string[]>()
      .notNull()
      .default([]),
    schedule: jsonb("schedule").$type<unknown[]>().notNull().default([]),
    lastTickAt: timestamp("last_tick_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [uniqueIndex("persona_state_user_idx").on(table.userId)]
);

export const styleSamples = pgTable(
  "style_samples",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    content: text("content").notNull(),
    role: text("role").notNull().default("loved_one"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("style_samples_user_idx").on(table.userId)]
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    bubbleIndex: integer("bubble_index").notNull().default(0),
    groupId: text("group_id").notNull(),
    isProactive: boolean("is_proactive").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("messages_user_created_idx").on(table.userId, table.createdAt),
  ]
);

export const messageEmbeddings = pgTable(
  "message_embeddings",
  {
    id: serial("id").primaryKey(),
    messageId: integer("message_id")
      .notNull()
      .references(() => messages.id, { onDelete: "cascade" }),
    embedding: vector("embedding", { dimensions: 768 }),
  },
  (table) => [
    index("message_embeddings_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops")
    ),
  ]
);

export const conversationSummaries = pgTable(
  "conversation_summaries",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    summary: text("summary").notNull(),
    keyFacts: jsonb("key_facts").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("summaries_user_idx").on(table.userId)]
);

export const egoEvents = pgTable(
  "ego_events",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    delta: integer("delta").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("ego_events_user_idx").on(table.userId)]
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("push_subscriptions_endpoint_idx").on(table.endpoint),
    index("push_subscriptions_user_idx").on(table.userId),
  ]
);

export const initiativeLog = pgTable(
  "initiative_log",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    impulseScore: integer("impulse_score").notNull(),
    sent: boolean("sent").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("initiative_log_user_idx").on(table.userId)]
);
