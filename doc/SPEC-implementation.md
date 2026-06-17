# Cymek V1 — Implementation SPEC

## Product (from doc/PRODUCT.md)

Cymek is a **one-click AI pipeline builder** that replaces an AI agency.
Non-technical business owners describe their use case, upload their data, and get a deployed AI endpoint + embeddable widget. No engineering required.

---

## Current Status (2026-06-17)

### ✅ Complete

- **Monorepo scaffold**: pnpm workspaces, 3 apps (web/orchestrator/sidecar) + 3 packages (shared/db/embed)
- **DB schema + migration**: 7 tables (tenants, jobs, documents, chunks with 768-dim pgvector, system_prompts, eval_results, chat_logs) — both migrations applied to local Postgres
- **Pipeline engine** (orchestrator): 6-stage pipeline (ingest → chunk → embed → prompt_gen → evaluate → deploy) with SSE streaming, retry logic (eval score < 0.75 → retry up to 3× with different params), `pg-boss` queue
- **Evaluator**: Auto-generates 20 Q&A pairs from documents, scores faithfulness + relevance, stores in eval_results
- **System prompt generator**: Generates custom system prompt capturing business use case, tone, and domain
- **Chat endpoint**: RAG chat with session management, SSE streaming or JSON response
- **Extraction sidecar**: FastAPI, `/extract/file` (PDF/TXT/DOCX), `/extract/url`
- **Frontend pages**: Onboard (multi-step: API key → use case → target user → documents), Dashboard (stats + job list), Pipeline (SSE progress), Chat (message UI)
- **Design system**: Twilight (purple-blue, cream surfaces, PP Editorial Old + Inter)
- **Embed widget**: Vanilla JS chat bubble
- **CI**: GitHub Actions for typecheck + test
- **Tests**: 66 passing (47 orchestrator, 16 shared, 1 db, 1 web, 1 embed, 2 Python)
- **Typecheck**: Passes across all packages
- **Build**: Passes (`pnpm build`)

### ❌ Missing / Broken

- **Env vars not set**: No `.env` with `DATABASE_URL` / `OPENAI_API_KEY` / `OPENAI_BASE_URL`
- **Services never started**: Web (port 3000), sidecar (port 8000), orchestrator (port 3001) — none have been launched end-to-end
- **No end-to-end smoke test**: Never uploaded a real document and verified the full pipeline
- **`llama3.2` model not pulled** (if using Ollama fallback)
- **No auth**: Multi-tenant auth not implemented (just `tenant_id` in schema)

### Blocked (Board Action)

- CYM-2 (sidecar extraction) — in_review
- CYM-3 (design system) — in_review
- CYM-4 (orchestrator) — blocked (CYM-1 foundation complete, code on main)
- CYM-5 (frontend pages) — in_review
- CYM-7 (QA) — blocked (CYM-1 foundation complete)

---

## To Run Locally

```bash
# 1. Set env vars
export DATABASE_URL=postgres://salar:cymek@localhost:5432/cymek
export OPENAI_API_KEY=<openrouter-key>
export OPENAI_BASE_URL=https://openrouter.ai/api/v1

# 2. Start web (port 3000)
pnpm dev:web

# 3. Start sidecar (port 8001)
cd apps/sidecar && source .venv/bin/activate && uvicorn app.main:app --reload --port 8001

# 4. Start orchestrator (port 3001)
pnpm dev:orchestrator
```

## To Verify

- Go to `localhost:3000/onboard` → go through the 4-step form
- Upload a PDF → watch pipeline progress at `/pipeline`
- Ask questions at `/chat`
- Check `/dashboard` for job history
