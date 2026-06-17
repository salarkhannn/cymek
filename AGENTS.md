# Cymek

## Product Purpose (READ THIS FIRST)

Cymek is NOT a document Q&A tool. Cymek is a **one-click AI pipeline builder** that replaces an AI agency.

**The problem**: Non-technical business owners know they need AI but can't afford $10k–$50k for an agency.
**The solution**: User pastes their API key, describes their use case in plain English, uploads their data, and Cymek auto-builds + deploys a production-ready AI endpoint + embeddable widget.

**Key differentiator**: Full end-to-end automation of what an AI agency does manually — ingestion, chunking, embedding, system prompt generation, quality evaluation, retry tuning, deployment. Zero configuration, zero engineering, under 20 minutes.

## Repo Map

- `apps/web/` — Next.js 14 (App Router) frontend with onboarding, dashboard, pipeline, chat pages
- `apps/orchestrator/` — Node.js + Express pipeline engine with pg-boss queue
- `apps/sidecar/` — Python FastAPI document extraction service
- `packages/shared/` — Types, constants (models, dims), validators
- `packages/db/` — Drizzle schema + migrations (pgvector)
- `packages/embed/` — Vanilla JS embeddable chat widget

## Design

Twilight design system (purple-blue, cream surfaces, PP Editorial Old + Inter). See DESIGN.md.

## Commands

- `pnpm dev:web` — Start Next.js (port 3000)
- `pnpm dev:orchestrator` — Start orchestrator (port 3001)
- `pnpm dev:sidecar` — Start Python sidecar (port 8000)
- `pnpm db:migrate` — Run DB migrations
- `pnpm db:generate` — Generate new migration after schema changes
- `pnpm test:run` — Run tests
- `pnpm -r typecheck` — Typecheck all

## AI/LLM Provider

- Default: Ollama (local, for dev)
- Production: OpenRouter (or bring your own OpenAI-compatible key)
- Models: `nomic-embed-text` (768-dim), `llama3.2` for generation/eval
- Config via `OPENAI_BASE_URL` + `OPENAI_API_KEY` env vars

## DB

Postgres 17 + pgvector. Connection via `DATABASE_URL`.
Default for dev: `postgres://salar:cymek@localhost:5432/cymek`
