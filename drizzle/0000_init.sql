CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "persona_config" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "gender" text NOT NULL,
  "relationship" text NOT NULL,
  "talking_style" text NOT NULL,
  "warmth" integer NOT NULL,
  "humor" integer NOT NULL,
  "directness" integer NOT NULL,
  "sensitivity" integer NOT NULL,
  "pride" integer NOT NULL,
  "interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "persona_state" (
  "id" serial PRIMARY KEY NOT NULL,
  "mood" text NOT NULL,
  "mood_intensity" integer NOT NULL,
  "ego" jsonb NOT NULL,
  "availability" text NOT NULL,
  "activity" text NOT NULL,
  "last_interaction_at" timestamp with time zone,
  "messages_sent_today" integer DEFAULT 0 NOT NULL,
  "was_ignored" boolean DEFAULT false NOT NULL,
  "schedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "last_tick_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "bubble_index" integer DEFAULT 0 NOT NULL,
  "group_id" text NOT NULL,
  "is_proactive" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages" ("created_at");

CREATE TABLE IF NOT EXISTS "message_embeddings" (
  "id" serial PRIMARY KEY NOT NULL,
  "message_id" integer NOT NULL REFERENCES "messages"("id") ON DELETE cascade,
  "embedding" vector(768)
);

CREATE INDEX IF NOT EXISTS "message_embeddings_hnsw_idx" ON "message_embeddings" USING hnsw ("embedding" vector_cosine_ops);

CREATE TABLE IF NOT EXISTS "conversation_summaries" (
  "id" serial PRIMARY KEY NOT NULL,
  "period_start" timestamp with time zone NOT NULL,
  "period_end" timestamp with time zone NOT NULL,
  "summary" text NOT NULL,
  "key_facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ego_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "type" text NOT NULL,
  "delta" integer NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" serial PRIMARY KEY NOT NULL,
  "endpoint" text NOT NULL UNIQUE,
  "p256dh" text NOT NULL,
  "auth" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "initiative_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "impulse_score" integer NOT NULL,
  "sent" boolean NOT NULL,
  "reason" text,
  "created_at" timestamp with time zone DEFAULT now()
);
