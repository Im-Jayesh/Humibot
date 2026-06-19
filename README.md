# Humibot

A human-like companion chat powered by local Ollama and Neon Postgres.

## Prerequisites

- Node 20+ (`nvm use 20`)
- [Ollama](https://ollama.com) running locally
- Neon Postgres database with `DATABASE_URL`

## Setup

```bash
cp .env.example .env.local
# Fill DATABASE_URL and optional VAPID keys

ollama pull gemma4:e2b
ollama pull nomic-embed-text

npm install
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Push notifications (optional)

Generate VAPID keys and add to `.env.local`:

```bash
npx web-push generate-vapid-keys
```

The dev server must stay running for proactive texts and push delivery.

## Features

- Persona with mood, ego, schedule, and relationship modes
- Duplex-style multi-bubble chat with typing delays
- 24h memory with summaries and pgvector recall
- Proactive messages every ~3 minutes when impulse threshold is met
- PWA + Web Push when the tab is closed
